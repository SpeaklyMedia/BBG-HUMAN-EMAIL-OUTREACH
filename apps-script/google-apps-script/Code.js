 /**
 * BBG Human Outreach — Apps Script Sending Engine (V1)
 * - FAIL-SAFE DEFAULTS: KILL_SWITCH=1, DEFAULT_DRY_RUN=1
 * - Public web app endpoint secured via HMAC + timestamp + nonce
 * - Google Sheets is V1 Source of Truth (DATA_CONTRACT.md)
 *
 * LOCKED HUMAN MODE (engine-enforced):
 * - Dark hours: no sending 23:30 → 04:45 (local tz via TIMEZONE)
 * - Daily cap: random int in [DAILY_CAP_MIN, DAILY_CAP_MAX] per day, resets at SEND_WINDOW_START
 * - Human pacing: jitter + burst/break micro-pauses
 * - Wave2 spin rendering: deterministic paragraph spins (P1–P4) + fixed 3-link block
 *
 * IMPORTANT: Do NOT commit secrets. Use Script Properties.
 */

// ---------------------------
// Constants: Tabs + Headers
// ---------------------------

var TABS = {
  CONTACTS: 'CONTACTS',
  SEGMENTS: 'SEGMENTS',
  RUNS: 'RUNS',
  EVENT_LOG: 'EVENT_LOG',
  SUPPRESSION: 'SUPPRESSION',
  MAILCHIMP_SUBSCRIBERS: 'MAILCHIMP_SUBSCRIBERS',
  CUSTOMERS: 'CUSTOMERS',
  TEMPLATES: 'TEMPLATES',
  NONCE_CACHE: 'NONCE_CACHE'
};

// DATA_CONTRACT.md — CONTACTS required columns + wave status columns + flags
var HEADERS_CONTACTS = [
  'contact_id','email','email_norm','first_name','last_name','company','title','segment_tags','source','source_import_id','created_at','updated_at',
  'wave1_status','wave1_run_id','wave1_last_attempt_at','wave1_sent_at','wave1_message_token',
  'wave2_status','wave2_run_id','wave2_last_attempt_at','wave2_sent_at','wave2_message_token',
  'has_replied','opted_out','bounced','suppressed_reason','suppressed_at',
  'last_idempotency_key','last_idempotency_key_at'
];

var HEADERS_SEGMENTS = [
  'segment_id','name','description','filter_json','created_at','updated_at','is_active'
];

var HEADERS_RUNS = [
  'run_id','run_code','wave_id','segment_id','template_id','template_version','status','created_by','created_at','confirmed_at','started_at','ended_at',
  'max_recipients_total','max_recipients_per_day','send_window_start_local','send_window_end_local','min_delay_seconds','max_delay_seconds','bounce_stop_threshold','dry_run',
  'eligible_count','sent_count','error_count','skipped_count','reply_count','optout_count','bounce_count'
];

var HEADERS_EVENT_LOG = [
  'event_id','ts','run_id','contact_id','wave_id','event_type','result','message','details_json'
];

// DATA_CONTRACT.md (directional): store email_norm + imported_at so UI can detect staleness.
var HEADERS_EMAIL_NORM_LIST = ['email_norm','imported_at'];

// NOTE: DATA_CONTRACT.md lists TEMPLATES but does not define columns.
var HEADERS_TEMPLATES_MIN = ['template_id','template_version','subject','body','created_at','updated_at','is_active'];

// Enums (contract)
var WAVE_ENUM = { wave1: true, wave2: true };
var CONTACT_STATUS_ENUM = {
  ready:true, queued:true, sending:true, sent:true, error:true, skipped:true,
  replied:true, opted_out:true, bounced:true
};
var RUN_STATUS_ENUM = {
  draft:true, previewed:true, confirmed:true, running:true, paused:true,
  killed:true, completed:true, failed:true
};

// ---------------------------
// Web App Router
// ---------------------------

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    var req = JSON.parse(raw || '{}');

    // Envelope minimal fields
    var path = (req.path || '').toString();
    var timestamp = req.timestamp;
    var nonce = (req.nonce || '').toString();
    var operatorEmail = (req.operator_email || '').toString();
    var requestId = (req.request_id || '').toString();
    var bodyHash = (req.body_hash || '').toString();
    var payload = req.payload || {};
    var signature = (req.signature || '').toString();

    // Fail-fast: HMAC verification happens BEFORE any sheet reads/writes.
    verifyRequestOrThrow_(path, timestamp, nonce, operatorEmail, requestId, bodyHash, payload, signature);

    var route = normalizePath_(path);

    if (route === 'health') {
      verifyBodyHashOrThrow_(payload, bodyHash);
      var cap = getDailyCapState_();
      var win = getGlobalSendWindow_();
      return json_({
        ok: true,
        now: nowIso_(),
        kill_switch: isKillSwitchOn_(),
        default_dry_run: isDefaultDryRunOn_(),
        window: win,
        cap: cap
      });
    }

    // Dispatch
    if (route === 'setup') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      setupWorkbook_();
      appendEvent_({
        run_id: payload.run_id || '', contact_id: '', wave_id: payload.wave_id || '',
        event_type: 'setup_workbook', result: 'ok', message: 'Workbook setup verified', details: {}
      });
      return json_({ ok: true });
    }

    if (route === 'segments/list') {
      assertViewerOrAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_({ ok: true, segments: listSegments_() });
    }

    if (route === 'contacts/upsert') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(upsertContact_(operatorEmail, payload));
    }

    if (route === 'segments/upsert') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(upsertSegment_(operatorEmail, payload));
    }

    if (route === 'templates/upsert') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(upsertTemplate_(operatorEmail, payload));
    }

    if (route === 'runs/list') {
      assertViewerOrAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_({ ok: true, runs: listRuns_() });
    }

    if (route === 'runs/create' || route === 'createRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(createRun_(operatorEmail, payload));
    }

    if (route === 'runs/preview' || route === 'previewRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(previewRun_(operatorEmail, payload));
    }

    if (route === 'runs/confirm' || route === 'confirmRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(confirmRun_(operatorEmail, payload));
    }

    if (route === 'runs/pause' || route === 'pauseRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(pauseRun_(operatorEmail, payload));
    }

    if (route === 'runs/resume' || route === 'resumeRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(resumeRun_(operatorEmail, payload));
    }

    if (route === 'runs/kill' || route === 'killRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(killRun_(operatorEmail, payload));
    }

    if (route === 'runs/export' || route === 'exportRun') {
      assertAdmin_(operatorEmail);
      verifyBodyHashOrThrow_(payload, bodyHash);
      return json_(exportRun_(operatorEmail, payload));
    }

    assertAdmin_(operatorEmail);
    verifyBodyHashOrThrow_(payload, bodyHash);
    return json_({ ok: false, error: 'unknown_route', route: route });

  } catch (err) {
    // Do not leak secrets or PII.
    return json_({ ok: false, error: 'exception', message: safeErr_(err) });
  }
}

// ---------------------------
// Request Verification (HMAC)
// ---------------------------

function verifyRequestOrThrow_(path, timestamp, nonce, operatorEmail, requestId, bodyHash, payload, signature) {
  // Basic required envelope fields
  if (!path || !nonce || !operatorEmail || !requestId || !bodyHash || !signature) {
    throw new Error('bad_request:missing_fields');
  }

  // 1) Signature valid (constant-time compare)
  var expected = computeSignatureHex_(path, timestamp, nonce, operatorEmail, requestId, bodyHash);
  if (!constantTimeEqual_(expected, signature)) {
    throw new Error('unauthorized:bad_signature');
  }

  // 2) Timestamp freshness (<= 5 min)
  var tsMs = parseTimestampMs_(timestamp);
  var nowMs = Date.now();
  if (Math.abs(nowMs - tsMs) > (5 * 60 * 1000)) {
    throw new Error('unauthorized:stale_timestamp');
  }

  // 3) Nonce single-use (CacheService TTL ~ 6 min)
  var cache = CacheService.getScriptCache();
  var nk = 'nonce:' + nonce;
  var already = cache.get(nk);
  if (already) {
    throw new Error('unauthorized:replay_nonce');
  }
  cache.put(nk, '1', 360); // 6 minutes
}

function verifyBodyHashOrThrow_(payload, bodyHash) {
  var actualBodyHash = sha256Hex_(JSON.stringify(payload || {}));
  if (actualBodyHash !== bodyHash) {
    throw new Error('unauthorized:bad_body_hash');
  }
}

function computeSignatureHex_(path, timestamp, nonce, operatorEmail, requestId, bodyHash) {
  var secret = getPropOrThrow_('WEBHOOK_SECRET');
  var canonical = canonicalString_(path, timestamp, nonce, operatorEmail, requestId, bodyHash);
  var sigBytes = Utilities.computeHmacSha256Signature(canonical, secret);
  return bytesToHex_(sigBytes);
}

function canonicalString_(path, timestamp, nonce, operatorEmail, requestId, bodyHash) {
  // Canonical string (V1): newline-delimited fields.
  return [
    normalizePathForSig_(path),
    String(parseTimestampMs_(timestamp)),
    String(nonce),
    String(operatorEmail).toLowerCase().trim(),
    String(requestId),
    String(bodyHash)
  ].join('\n');
}

function normalizePathForSig_(p) {
  var s = (p || '').toString().trim();
  if (!s) return '';
  if (s[0] !== '/') s = '/' + s;
  // No trailing slash (except root)
  if (s.length > 1 && s[s.length - 1] === '/') s = s.slice(0, -1);
  return s;
}

function normalizePath_(p) {
  var s = (p || '').toString().trim();
  if (!s) return '';
  if (s[0] === '/') s = s.slice(1);
  if (s[s.length - 1] === '/') s = s.slice(0, -1);
  return s;
}

function parseTimestampMs_(ts) {
  var n = Number(ts);
  if (!isFinite(n)) throw new Error('bad_request:timestamp');
  // seconds → ms
  if (n < 1e12) n = n * 1000;
  return Math.floor(n);
}

function constantTimeEqual_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var out = 0;
  for (var i = 0; i < a.length; i++) {
    out |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return out === 0;
}

// ---------------------------
// AuthZ
// ---------------------------

function assertAdmin_(email) {
  var admins = parseEmails_(getPropOrThrow_('ADMIN_EMAILS'));
  var e = (email || '').toLowerCase().trim();
  if (admins.indexOf(e) === -1) throw new Error('forbidden:not_admin');
}

function assertViewerOrAdmin_(email) {
  var e = (email || '').toLowerCase().trim();
  var admins = parseEmails_(getPropOrThrow_('ADMIN_EMAILS'));
  if (admins.indexOf(e) !== -1) return;
  var viewersRaw = getProp_('VIEWER_EMAILS', '');
  var viewers = parseEmails_(viewersRaw);
  if (viewers.indexOf(e) === -1) throw new Error('forbidden:not_allowed');
}

function parseEmails_(s) {
  if (!s) return [];
  return s
    .split(/[\s,;]+/)
    .map(function(x){ return x.toLowerCase().trim(); })
    .filter(function(x){ return !!x; });
}

// ---------------------------
// Workbook Setup
// ---------------------------

function setupWorkbook_() {
  var ss = getSpreadsheet_();
  if (!ss) {
    throw new Error("Spreadsheet is null. Set Script Property SPREADSHEET_ID to the Google Sheet ID (not the URL) and ensure access.");
  }
  ensureSheetWithHeaders_(ss, TABS.CONTACTS, HEADERS_CONTACTS);
  ensureSheetWithHeaders_(ss, TABS.SEGMENTS, HEADERS_SEGMENTS);
  ensureSheetWithHeaders_(ss, TABS.RUNS, HEADERS_RUNS);
  ensureSheetWithHeaders_(ss, TABS.EVENT_LOG, HEADERS_EVENT_LOG);

  ensureSheetWithHeaders_(ss, TABS.SUPPRESSION, HEADERS_EMAIL_NORM_LIST);
  ensureSheetWithHeaders_(ss, TABS.MAILCHIMP_SUBSCRIBERS, HEADERS_EMAIL_NORM_LIST);
  ensureSheetWithHeaders_(ss, TABS.CUSTOMERS, HEADERS_EMAIL_NORM_LIST);

  // TEMPLATES: minimal schema for operational use.
  ensureSheetWithHeaders_(ss, TABS.TEMPLATES, HEADERS_TEMPLATES_MIN);

  // NONCE_CACHE optional
  if (!ss.getSheetByName(TABS.NONCE_CACHE)) {
    ss.insertSheet(TABS.NONCE_CACHE);
  }

  ensureWave2Defaults_(ss);
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  var existing = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasAny = existing.some(function(v){ return String(v || '').trim() !== ''; });

  if (!hasAny) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return;
  }

  // Verify header match for deterministic behavior.
  for (var i = 0; i < headers.length; i++) {
    if (String(existing[i] || '').trim() !== headers[i]) {
      throw new Error('schema_mismatch:' + name + ':' + headers[i] + '!=' + existing[i]);
    }
  }
}

function ensureWave2Defaults_(ss) {
  ensureDefaultSegment_(ss);
  ensureDefaultTemplate_(ss);
}

function ensureDefaultSegment_(ss) {
  var sh = ss.getSheetByName(TABS.SEGMENTS);
  var rows = sheetToObjects_(sh, HEADERS_SEGMENTS);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].segment_id === 'segment_default') return;
  }

  var now = nowIso_();
  appendObjectRow_(sh, HEADERS_SEGMENTS, {
    segment_id: 'segment_default',
    name: 'Default',
    description: 'Default BBG safe-mode segment',
    filter_json: '{}',
    created_at: now,
    updated_at: now,
    is_active: 'TRUE'
  });
}

function ensureDefaultTemplate_(ss) {
  var sh = ss.getSheetByName(TABS.TEMPLATES);
  var rows = sheetToObjects_(sh, HEADERS_TEMPLATES_MIN);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].template_id === 'wave2_update' && rows[i].template_version === 'v1') return;
  }

  var now = nowIso_();
  appendObjectRow_(sh, HEADERS_TEMPLATES_MIN, {
    template_id: 'wave2_update',
    template_version: 'v1',
    subject: 'Quick update for {{first_name}}',
    body: '{{WAVE2_SPIN_BODY}}',
    created_at: now,
    updated_at: now,
    is_active: 'TRUE'
  });
}

// ---------------------------
// Segments
// ---------------------------

function listSegments_() {
  setupWorkbook_();
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.SEGMENTS);
  var rows = sheetToObjects_(sh, HEADERS_SEGMENTS);
  return rows.filter(function(r){ return String(r.is_active).toLowerCase() !== 'false'; });
}

function upsertContact_(operatorEmail, payload) {
  setupWorkbook_();

  var contactId = (payload.contact_id || '').toString().trim();
  var email = (payload.email || '').toString().trim();
  var firstName = (payload.first_name || '').toString().trim();
  var lastName = (payload.last_name || '').toString().trim();
  var company = (payload.company || '').toString().trim();
  var title = (payload.title || '').toString().trim();
  var segmentTags = (payload.segment_tags || '').toString().trim();
  var source = (payload.source || 'manual_seed').toString().trim();
  var sourceImportId = (payload.source_import_id || 'seed_manual').toString().trim();
  var wave2Status = (payload.wave2_status || 'ready').toString().trim();
  var now = nowIso_();

  if (!contactId) throw new Error('bad_request:contact_id');
  if (!email) throw new Error('bad_request:email');
  if (!firstName) throw new Error('bad_request:first_name');
  if (!CONTACT_STATUS_ENUM[wave2Status]) throw new Error('bad_request:wave2_status');

  var emailNorm = email.toLowerCase().trim();
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.CONTACTS);
  var rows = sheetToObjects_(sh, HEADERS_CONTACTS);
  var idx = -1;

  for (var i = 0; i < rows.length; i++) {
    if (rows[i].contact_id === contactId) {
      idx = i;
      break;
    }
  }

  var prev = idx >= 0 ? rows[idx] : {};
  var obj = {
    contact_id: contactId,
    email: email,
    email_norm: emailNorm,
    first_name: firstName,
    last_name: lastName,
    company: company,
    title: title,
    segment_tags: segmentTags,
    source: source,
    source_import_id: sourceImportId,
    created_at: prev.created_at || now,
    updated_at: now,
    wave1_status: prev.wave1_status || '',
    wave1_run_id: prev.wave1_run_id || '',
    wave1_last_attempt_at: prev.wave1_last_attempt_at || '',
    wave1_sent_at: prev.wave1_sent_at || '',
    wave1_message_token: prev.wave1_message_token || '',
    wave2_status: wave2Status,
    wave2_run_id: prev.wave2_run_id || '',
    wave2_last_attempt_at: prev.wave2_last_attempt_at || '',
    wave2_sent_at: prev.wave2_sent_at || '',
    wave2_message_token: prev.wave2_message_token || '',
    has_replied: prev.has_replied || '',
    opted_out: prev.opted_out || '',
    bounced: prev.bounced || '',
    suppressed_reason: prev.suppressed_reason || '',
    suppressed_at: prev.suppressed_at || '',
    last_idempotency_key: prev.last_idempotency_key || '',
    last_idempotency_key_at: prev.last_idempotency_key_at || ''
  };

  if (idx >= 0) {
    writeObjectToRow_(sh, HEADERS_CONTACTS, idx + 2, obj);
    appendEvent_({ run_id: '', contact_id: contactId, wave_id: 'wave2', event_type: 'contact_updated', result: 'ok', message: contactId, details: { source: source } });
  } else {
    appendObjectRow_(sh, HEADERS_CONTACTS, obj);
    appendEvent_({ run_id: '', contact_id: contactId, wave_id: 'wave2', event_type: 'contact_created', result: 'ok', message: contactId, details: { source: source } });
  }

  return { ok: true, contact: obj };
}

function upsertSegment_(operatorEmail, payload) {
  setupWorkbook_();

  var segmentId = (payload.segment_id || '').toString();
  var name = (payload.name || '').toString();
  var desc = (payload.description || '').toString();
  var filterJson = payload.filter_json;

  if (!segmentId) segmentId = 'seg_' + randomToken_(12);
  if (!name) throw new Error('bad_request:segment_name');

  var filterStr = (typeof filterJson === 'string') ? filterJson : JSON.stringify(filterJson || {});
  // Validate JSON parse
  JSON.parse(filterStr);

  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.SEGMENTS);
  var rows = sheetToObjects_(sh, HEADERS_SEGMENTS);

  var now = nowIso_();
  var idx = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].segment_id === segmentId) { idx = i; break; }
  }

  var obj = {
    segment_id: segmentId,
    name: name,
    description: desc,
    filter_json: filterStr,
    created_at: (idx >= 0 && rows[idx].created_at) ? rows[idx].created_at : now,
    updated_at: now,
    is_active: (payload.is_active === false || payload.is_active === 'FALSE') ? 'FALSE' : 'TRUE'
  };

  if (idx >= 0) {
    writeObjectToRow_(sh, HEADERS_SEGMENTS, idx + 2, obj);
    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'segment_updated', result: 'ok', message: segmentId, details: {} });
  } else {
    appendObjectRow_(sh, HEADERS_SEGMENTS, obj);
    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'segment_created', result: 'ok', message: segmentId, details: {} });
  }

  return { ok: true, segment: obj };
}

function upsertTemplate_(operatorEmail, payload) {
  setupWorkbook_();

  var templateId = (payload.template_id || '').toString();
  var templateVersion = (payload.template_version || '').toString();
  var subject = (payload.subject || '').toString();
  var body = (payload.body || '').toString();

  if (!templateId) throw new Error('bad_request:template_id');
  if (!templateVersion) throw new Error('bad_request:template_version');
  if (!subject) throw new Error('bad_request:template_subject');
  if (!body) throw new Error('bad_request:template_body');

  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.TEMPLATES);
  var rows = sheetToObjects_(sh, HEADERS_TEMPLATES_MIN);
  var now = nowIso_();
  var idx = -1;

  for (var i = 0; i < rows.length; i++) {
    if (rows[i].template_id === templateId && rows[i].template_version === templateVersion) {
      idx = i;
      break;
    }
  }

  var obj = {
    template_id: templateId,
    template_version: templateVersion,
    subject: subject,
    body: body,
    created_at: (idx >= 0 && rows[idx].created_at) ? rows[idx].created_at : now,
    updated_at: now,
    is_active: (payload.is_active === false || payload.is_active === 'FALSE') ? 'FALSE' : 'TRUE'
  };

  if (idx >= 0) {
    writeObjectToRow_(sh, HEADERS_TEMPLATES_MIN, idx + 2, obj);
    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'template_updated', result: 'ok', message: templateId + ':' + templateVersion, details: {} });
  } else {
    appendObjectRow_(sh, HEADERS_TEMPLATES_MIN, obj);
    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'template_created', result: 'ok', message: templateId + ':' + templateVersion, details: {} });
  }

  return { ok: true, template: obj };
}

// ---------------------------
// Runs
// ---------------------------

function listRuns_() {
  setupWorkbook_();
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  return sheetToObjects_(sh, HEADERS_RUNS);
}

function createRun_(operatorEmail, payload) {
  setupWorkbook_();

  var runId = 'run_' + randomToken_(16);
  var runCode = (payload.run_code || '').toString().trim();
  if (!runCode) runCode = 'R' + Utilities.formatDate(new Date(), getTimezone_(), 'yyyyMMdd') + '-' + randomToken_(6);

  var waveId = (payload.wave_id || '').toString();
  if (!WAVE_ENUM[waveId]) throw new Error('bad_request:wave_id');

  var segmentId = (payload.segment_id || '').toString();
  var templateId = (payload.template_id || '').toString();
  var templateVersion = (payload.template_version || '').toString();
  if (!segmentId || !templateId || !templateVersion) throw new Error('bad_request:run_fields');

  var now = nowIso_();

  // Defaults from Script Properties (fail-safe). Align defaults to locked human mode.
  var win = getGlobalSendWindow_();
  var maxTotal = intOrDefault_(payload.max_recipients_total, intOrDefault_(getProp_('DEFAULT_MAX_TOTAL', '0'), 0));
  var maxPerDay = intOrDefault_(payload.max_recipients_per_day, intOrDefault_(getProp_('DEFAULT_MAX_PER_DAY', '0'), 0));
  var winStart = (payload.send_window_start_local || getProp_('DEFAULT_SEND_WINDOW_START', win.start)).toString();
  var winEnd = (payload.send_window_end_local || getProp_('DEFAULT_SEND_WINDOW_END', win.end)).toString();
  var minDelay = intOrDefault_(payload.min_delay_seconds, intOrDefault_(getProp_('DEFAULT_MIN_DELAY_SEC', getProp_('MIN_DELAY_SECONDS', '180')), 180));
  var maxDelay = intOrDefault_(payload.max_delay_seconds, intOrDefault_(getProp_('DEFAULT_MAX_DELAY_SEC', getProp_('MAX_DELAY_SECONDS', '360')), 360));
  var bounceStop = intOrDefault_(payload.bounce_stop_threshold, 0);

  // dry-run enforced by default
  var dryRun = truthy_(payload.dry_run);
  if (isDefaultDryRunOn_()) dryRun = true;

  var obj = {
    run_id: runId,
    run_code: runCode,
    wave_id: waveId,
    segment_id: segmentId,
    template_id: templateId,
    template_version: templateVersion,
    status: 'draft',
    created_by: operatorEmail,
    created_at: now,
    confirmed_at: '',
    started_at: '',
    ended_at: '',

    max_recipients_total: maxTotal,
    max_recipients_per_day: maxPerDay,
    send_window_start_local: winStart,
    send_window_end_local: winEnd,
    min_delay_seconds: minDelay,
    max_delay_seconds: maxDelay,
    bounce_stop_threshold: bounceStop,
    dry_run: dryRun ? 'TRUE' : 'FALSE',

    eligible_count: '',
    sent_count: '0',
    error_count: '0',
    skipped_count: '0',
    reply_count: '0',
    optout_count: '0',
    bounce_count: '0'
  };

  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  appendObjectRow_(sh, HEADERS_RUNS, obj);

  appendEvent_({ run_id: runId, contact_id: '', wave_id: waveId, event_type: 'run_created', result: 'ok', message: runCode, details: {} });

  return { ok: true, run: obj };
}

function previewRun_(operatorEmail, payload) {
  setupWorkbook_();

  var run = getRunByIdOrCode_(payload.run_id, payload.run_code);
  if (!run) throw new Error('not_found:run');
  if (run.status !== 'draft' && run.status !== 'previewed') throw new Error('invalid_state:preview');
  requireSegmentExistsForRun_(run);
  requireTemplateExistsForRun_(run);

  var eligible = computeEligibleContacts_(run);

  // Update run
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  var rowIndex = findRowIndexByValue_(sh, 'run_id', run.run_id, HEADERS_RUNS);

  run.eligible_count = String(eligible.count);
  run.status = 'previewed';

  writeObjectToRow_(sh, HEADERS_RUNS, rowIndex, run);

  appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'run_previewed', result: 'ok', message: 'eligible=' + eligible.count, details: { sample_contact_ids: eligible.sample_contact_ids } });

  return { ok: true, run: run, eligible_count: eligible.count, sample_contact_ids: eligible.sample_contact_ids };
}

function confirmRun_(operatorEmail, payload) {
  setupWorkbook_();

  var run = getRunByIdOrCode_(payload.run_id, payload.run_code);
  if (!run) throw new Error('not_found:run');
  if (run.status !== 'previewed') throw new Error('invalid_state:confirm');
  requireSegmentExistsForRun_(run);
  requireTemplateExistsForRun_(run);

  var confirmationText = (payload.confirmation_text || '').toString().trim();
  var expected = 'CONFIRM ' + run.run_code;
  if (confirmationText !== expected) throw new Error('bad_request:confirmation_text');

  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  var rowIndex = findRowIndexByValue_(sh, 'run_id', run.run_id, HEADERS_RUNS);

  run.status = 'confirmed';
  run.confirmed_at = nowIso_();

  // dry-run enforced by default
  if (isDefaultDryRunOn_()) run.dry_run = 'TRUE';

  writeObjectToRow_(sh, HEADERS_RUNS, rowIndex, run);

  ensureTickTriggerIfEnabled_();

  appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'run_confirmed', result: 'ok', message: expected, details: { dry_run: run.dry_run } });

  return { ok: true, run: run };
}

function pauseRun_(operatorEmail, payload) {
  setupWorkbook_();
  var run = getRunByIdOrCode_(payload.run_id, payload.run_code);
  if (!run) throw new Error('not_found:run');
  if (run.status !== 'running' && run.status !== 'confirmed') throw new Error('invalid_state:pause');
  return updateRunStatus_(run, 'paused', 'run_paused');
}

function resumeRun_(operatorEmail, payload) {
  setupWorkbook_();
  var run = getRunByIdOrCode_(payload.run_id, payload.run_code);
  if (!run) throw new Error('not_found:run');
  if (run.status !== 'paused') throw new Error('invalid_state:resume');
  ensureTickTriggerIfEnabled_();
  return updateRunStatus_(run, 'running', 'run_resumed');
}

function killRun_(operatorEmail, payload) {
  setupWorkbook_();
  var run = getRunByIdOrCode_(payload.run_id, payload.run_code);
  if (!run) throw new Error('not_found:run');
  if (run.status === 'killed' || run.status === 'completed') return { ok: true, run: run };
  return updateRunStatus_(run, 'killed', 'run_killed');
}

function updateRunStatus_(run, newStatus, eventType) {
  if (!RUN_STATUS_ENUM[newStatus]) throw new Error('bad_request:status');
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  var rowIndex = findRowIndexByValue_(sh, 'run_id', run.run_id, HEADERS_RUNS);

  run.status = newStatus;
  if (newStatus === 'killed' || newStatus === 'completed' || newStatus === 'failed') {
    run.ended_at = nowIso_();
  }
  if (newStatus === 'running' && !run.started_at) {
    run.started_at = nowIso_();
  }

  writeObjectToRow_(sh, HEADERS_RUNS, rowIndex, run);
  appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: eventType, result: 'ok', message: newStatus, details: {} });
  return { ok: true, run: run };
}

function exportRun_(operatorEmail, payload) {
  setupWorkbook_();
  var run = getRunByIdOrCode_(payload.run_id, payload.run_code);
  if (!run) throw new Error('not_found:run');

  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.CONTACTS);
  var rows = sheetToObjects_(sh, HEADERS_CONTACTS);

  var wavePrefix = (run.wave_id === 'wave1') ? 'wave1' : 'wave2';
  var runIdCol = wavePrefix + '_run_id';
  var statusCol = wavePrefix + '_status';
  var lastAttemptCol = wavePrefix + '_last_attempt_at';
  var sentAtCol = wavePrefix + '_sent_at';

  var out = [];
  out.push(['contact_id','wave_status','last_attempt_at','sent_at','has_replied','opted_out','bounced'].join(','));
  rows.forEach(function(r){
    if (String(r[runIdCol] || '') === run.run_id) {
      out.push([
        csvEsc_(r.contact_id),
        csvEsc_(r[statusCol] || ''),
        csvEsc_(r[lastAttemptCol] || ''),
        csvEsc_(r[sentAtCol] || ''),
        csvEsc_(r.has_replied || ''),
        csvEsc_(r.opted_out || ''),
        csvEsc_(r.bounced || '')
      ].join(','));
    }
  });

  appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'run_exported', result: 'ok', message: 'rows=' + (out.length - 1), details: {} });

  return { ok: true, csv: out.join('\n') };
}

function csvEsc_(v) {
  var s = (v === null || v === undefined) ? '' : String(v);
  if (/[\",\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function getRunByIdOrCode_(runId, runCode) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  var runs = sheetToObjects_(sh, HEADERS_RUNS);
  var rid = (runId || '').toString();
  var rc = (runCode || '').toString();
  for (var i = 0; i < runs.length; i++) {
    if (rid && runs[i].run_id === rid) return runs[i];
    if (rc && runs[i].run_code === rc) return runs[i];
  }
  return null;
}

// ---------------------------
// Tick Sender (Human mode)
// ---------------------------

function tickAllRuns() {
  // Time-driven trigger entrypoint.
  try {
    setupWorkbook_();

    // Kill switch blocks all actions.
    if (isKillSwitchOn_()) {
      appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'tick_blocked_kill_switch', result: 'ok', message: 'KILL_SWITCH=1', details: {} });
      return;
    }

    // Dark hours (global)
    if (!isWithinGlobalSendWindow_()) {
      logWindowClosedOnce_();
      return;
    }

    // Daily cap (global)
    var cap = getDailyCapState_();
    if (cap.sent_today >= cap.cap_today) {
      logDailyCapReachedOnce_(cap);
      return;
    }

    // Human pacing gate (global)
    if (!humanPaceAllowsSendNow_()) {
      return;
    }

    var ss = getSpreadsheet_();
    var runSh = ss.getSheetByName(TABS.RUNS);
    var runs = sheetToObjects_(runSh, HEADERS_RUNS);

    // Process first eligible run per tick.
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      if (r.status === 'confirmed' || r.status === 'running') {
        // Ensure running
        if (r.status === 'confirmed') {
          var ri = findRowIndexByValue_(runSh, 'run_id', r.run_id, HEADERS_RUNS);
          r.status = 'running';
          if (!r.started_at) r.started_at = nowIso_();
          writeObjectToRow_(runSh, HEADERS_RUNS, ri, r);
          appendEvent_({ run_id: r.run_id, contact_id: '', wave_id: r.wave_id, event_type: 'run_started', result: 'ok', message: '', details: {} });
        }
        // One contact per tick
        var did = tickRunOnce_(r);
        if (did) return;
      }
    }

  } catch (err) {
    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'tick_exception', result: 'error', message: safeErr_(err), details: {} });
  }
}

function tickRunOnce_(run) {
  var ss = getSpreadsheet_();

  // Respect pause/kill
  if (run.status === 'paused' || run.status === 'killed' || run.status === 'completed' || run.status === 'failed') {
    return false;
  }

  // Run window (optional): if narrower than global, enforce
  if (run.send_window_start_local && run.send_window_end_local) {
    if (!isWithinWindowHHMM_(run.send_window_start_local, run.send_window_end_local)) {
      return false;
    }
  }

  // Enforce global cap
  var cap = getDailyCapState_();
  if (cap.sent_today >= cap.cap_today) {
    logDailyCapReachedOnce_(cap);
    return false;
  }

  // Enforce run total cap
  var sentCount = intOrDefault_(run.sent_count, 0);
  var maxTotal = intOrDefault_(run.max_recipients_total, 0);
  if (maxTotal > 0 && sentCount >= maxTotal) {
    finalizeRunIfDone_(run, 'completed', 'max_total_reached');
    return false;
  }

  // Quota check
  var remaining = MailApp.getRemainingDailyQuota();
  if (remaining <= 5) {
    appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'quota_low', result: 'error', message: 'remaining=' + remaining, details: {} });
    finalizeRunIfDone_(run, 'paused', 'quota_low');
    return false;
  }

  // Load exclusions
  var suppression = loadEmailNormSet_(TABS.SUPPRESSION);
  var mailchimp = loadEmailNormSet_(TABS.MAILCHIMP_SUBSCRIBERS);
  var customers = loadEmailNormSet_(TABS.CUSTOMERS);

  // Load segment filter
  var seg = getSegmentById_(run.segment_id);
  var filter = seg ? safeJsonParse_(seg.filter_json, {}) : {};

  // Find one eligible contact
  var contactSh = ss.getSheetByName(TABS.CONTACTS);
  var contacts = sheetToObjects_(contactSh, HEADERS_CONTACTS);

  var wavePrefix = (run.wave_id === 'wave1') ? 'wave1' : 'wave2';
  var statusCol = wavePrefix + '_status';
  var runIdCol = wavePrefix + '_run_id';
  var lastAttemptCol = wavePrefix + '_last_attempt_at';
  var sentAtCol = wavePrefix + '_sent_at';
  var tokenCol = wavePrefix + '_message_token';

  // Optional per-run per-day cap
  var maxPerDayRun = intOrDefault_(run.max_recipients_per_day, 0);
  if (maxPerDayRun > 0) {
    var sentTodayRun = countSentTodayForRun_(contacts, run, runIdCol, sentAtCol);
    if (sentTodayRun >= maxPerDayRun) {
      logCapPerDayOnce_(run, sentTodayRun, maxPerDayRun);
      return false;
    }
  }

  for (var i = 0; i < contacts.length; i++) {
    var c = contacts[i];
    if (!isContactEligibleForRun_(c, run, filter, suppression, mailchimp, customers)) continue;

    // Attempt send under lock (idempotent)
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) {
      appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'lock_timeout', result: 'error', message: 'script_lock', details: {} });
      return false;
    }

    try {
      // Re-read this row fresh
      var rowIndex = i + 2; // header at row 1
      var rowObj = rowToObject_(contactSh.getRange(rowIndex, 1, 1, HEADERS_CONTACTS.length).getValues()[0], HEADERS_CONTACTS);
      if (!isContactEligibleForRun_(rowObj, run, filter, suppression, mailchimp, customers)) {
        continue;
      }

      // Idempotency
      var idemKey = sha256Hex_(rowObj.contact_id + '|' + run.wave_id + '|' + run.template_id + '|' + run.template_version + '|send');
      if (rowObj.last_idempotency_key === idemKey && (rowObj[statusCol] === 'queued' || rowObj[statusCol] === 'sending' || rowObj[statusCol] === 'sent')) {
        appendEvent_({ run_id: run.run_id, contact_id: rowObj.contact_id, wave_id: run.wave_id, event_type: 'idempotent_skip', result: 'ok', message: idemKey, details: {} });
        return true;
      }

      // Transition to queued
      rowObj[statusCol] = 'queued';
      rowObj[runIdCol] = run.run_id;
      rowObj.last_idempotency_key = idemKey;
      rowObj.last_idempotency_key_at = nowIso_();
      rowObj[tokenCol] = randomToken_(18);
      writeObjectToRow_(contactSh, HEADERS_CONTACTS, rowIndex, rowObj);
      appendEvent_({ run_id: run.run_id, contact_id: rowObj.contact_id, wave_id: run.wave_id, event_type: 'queued', result: 'ok', message: '', details: { token: rowObj[tokenCol] } });

      // Transition to sending
      rowObj[statusCol] = 'sending';
      rowObj[lastAttemptCol] = nowIso_();
      writeObjectToRow_(contactSh, HEADERS_CONTACTS, rowIndex, rowObj);

      // Enforce dry-run defaults
      var dry = truthy_(run.dry_run);
      if (isDefaultDryRunOn_()) dry = true;

      // Template required
      var tpl = getTemplate_(run.template_id, run.template_version);
      if (!tpl) {
        rowObj[statusCol] = 'error';
        writeObjectToRow_(contactSh, HEADERS_CONTACTS, rowIndex, rowObj);
        incrementRunCounter_(run.run_id, 'error_count', 1);
        appendEvent_({ run_id: run.run_id, contact_id: rowObj.contact_id, wave_id: run.wave_id, event_type: 'send_error', result: 'error', message: 'template_not_found', details: {} });
        return true;
      }

      // Render final subject/body (Wave2 spin-aware)
      var subject = renderSubject_(tpl.subject, rowObj, rowIndex, run);
      var body = renderBody_(tpl.body, rowObj, rowIndex, run);

      if (dry) {
        // No outbound.
        rowObj[statusCol] = 'sent';
        rowObj[sentAtCol] = nowIso_();
        writeObjectToRow_(contactSh, HEADERS_CONTACTS, rowIndex, rowObj);

        incrementRunCounter_(run.run_id, 'sent_count', 1);
        incrementDailySent_(1);

        appendEvent_({ run_id: run.run_id, contact_id: rowObj.contact_id, wave_id: run.wave_id, event_type: 'dry_run_sent', result: 'ok', message: '', details: { token: rowObj[tokenCol], subject: subject } });

        updateHumanPaceAfterSend_();
        return true;
      }

      // Real send: delay jitter
      sleepJitter_(run);

      MailApp.sendEmail({
        to: rowObj.email,
        subject: subject,
        body: body
      });

      rowObj[statusCol] = 'sent';
      rowObj[sentAtCol] = nowIso_();
      writeObjectToRow_(contactSh, HEADERS_CONTACTS, rowIndex, rowObj);

      incrementRunCounter_(run.run_id, 'sent_count', 1);
      incrementDailySent_(1);

      appendEvent_({ run_id: run.run_id, contact_id: rowObj.contact_id, wave_id: run.wave_id, event_type: 'sent', result: 'ok', message: '', details: { token: rowObj[tokenCol] } });

      updateHumanPaceAfterSend_();
      return true;

    } catch (err) {
      appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'send_exception', result: 'error', message: safeErr_(err), details: {} });
      return true;

    } finally {
      lock.releaseLock();
    }
  }

  // No eligible contacts left
  finalizeRunIfDone_(run, 'completed', 'no_eligible');
  return false;
}

function sleepJitter_(run) {
  var minD = intOrDefault_(run.min_delay_seconds, intOrDefault_(getProp_('MIN_DELAY_SECONDS', '180'), 180));
  var maxD = intOrDefault_(run.max_delay_seconds, intOrDefault_(getProp_('MAX_DELAY_SECONDS', '360'), 360));
  if (maxD < minD) { var t = minD; minD = maxD; maxD = t; }
  if (maxD <= 0) return;
  var d = minD + Math.floor(Math.random() * (maxD - minD + 1));
  if (d > 0) Utilities.sleep(d * 1000);
}

// ---------------------------
// Human mode: window + daily cap + pacing
// ---------------------------

function getTimezone_() {
  return getProp_('TIMEZONE', 'America/New_York');
}

function getGlobalSendWindow_() {
  return {
    start: getProp_('SEND_WINDOW_START', '04:45'),
    end: getProp_('SEND_WINDOW_END', '23:30')
  };
}

function isWithinGlobalSendWindow_() {
  var win = getGlobalSendWindow_();
  return isWithinWindowHHMM_(win.start, win.end);
}

function isWithinWindowHHMM_(startHHMM, endHHMM) {
  var tz = getTimezone_();
  var now = new Date();
  var hh = Number(Utilities.formatDate(now, tz, 'HH'));
  var mm = Number(Utilities.formatDate(now, tz, 'mm'));
  var cur = hh * 60 + mm;
  var s = parseHHMMToMinutes_(startHHMM);
  var e = parseHHMMToMinutes_(endHHMM);

  // Handle windows crossing midnight (safe)
  if (s <= e) {
    return (cur >= s && cur <= e);
  }
  return (cur >= s || cur <= e);
}

function parseHHMMToMinutes_(hhmm) {
  var parts = String(hhmm || '').split(':');
  if (parts.length !== 2) return 0;
  var h = Number(parts[0]);
  var m = Number(parts[1]);
  if (!isFinite(h) || !isFinite(m)) return 0;
  return h * 60 + m;
}

// Cap day resets at SEND_WINDOW_START (not midnight)
function capDateKey_() {
  var tz = getTimezone_();
  var win = getGlobalSendWindow_();
  var now = new Date();
  var todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var curMin = parseHHMMToMinutes_(Utilities.formatDate(now, tz, 'HH:mm'));
  var startMin = parseHHMMToMinutes_(win.start);

  if (curMin < startMin) {
    var y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return Utilities.formatDate(y, tz, 'yyyy-MM-dd');
  }
  return todayStr;
}

function getDailyCapState_() {
  var props = getProps_();
  var dateKey = capDateKey_();

  var minCap = intOrDefault_(getProp_('DAILY_CAP_MIN', '150'), 150);
  var maxCap = intOrDefault_(getProp_('DAILY_CAP_MAX', '235'), 235);
  if (maxCap < minCap) { var tmp = minCap; minCap = maxCap; maxCap = tmp; }

  var capDate = String(props.getProperty('DAILY_CAP_DATE') || '');
  var capToday = Number(props.getProperty('DAILY_CAP_TODAY') || '0');

  if (capDate !== dateKey || !capToday || capToday < minCap || capToday > maxCap) {
    capToday = minCap + Math.floor(Math.random() * (maxCap - minCap + 1));
    props.setProperty('DAILY_CAP_DATE', dateKey);
    props.setProperty('DAILY_CAP_TODAY', String(capToday));

    // reset sent counter
    props.setProperty('DAILY_SENT_DATE', dateKey);
    props.setProperty('DAILY_SENT_TODAY', '0');

    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'daily_cap_set', result: 'ok', message: 'cap=' + capToday + ' date=' + dateKey, details: { cap_today: capToday, date_key: dateKey } });
  }

  var sentDate = String(props.getProperty('DAILY_SENT_DATE') || '');
  var sentToday = Number(props.getProperty('DAILY_SENT_TODAY') || '0');
  if (sentDate !== dateKey) {
    props.setProperty('DAILY_SENT_DATE', dateKey);
    props.setProperty('DAILY_SENT_TODAY', '0');
    sentToday = 0;
  }

  return { date_key: dateKey, cap_today: capToday, sent_today: sentToday };
}

function incrementDailySent_(delta) {
  var props = getProps_();
  var state = getDailyCapState_();
  var v = Number(props.getProperty('DAILY_SENT_TODAY') || '0');
  if (!isFinite(v)) v = 0;
  v = v + delta;
  props.setProperty('DAILY_SENT_DATE', state.date_key);
  props.setProperty('DAILY_SENT_TODAY', String(v));
}

function logDailyCapReachedOnce_(cap) {
  var cache = CacheService.getScriptCache();
  var key = 'daily_cap_reached:' + cap.date_key;
  if (cache.get(key)) return;
  cache.put(key, '1', 6 * 60 * 60);
  appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'daily_cap_reached', result: 'ok', message: 'sent=' + cap.sent_today + ' cap=' + cap.cap_today, details: cap });
}

function logWindowClosedOnce_() {
  var cache = CacheService.getScriptCache();
  var tz = getTimezone_();
  var key = 'window_closed:' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  if (cache.get(key)) return;
  cache.put(key, '1', 6 * 60 * 60);
  var win = getGlobalSendWindow_();
  appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'window_closed', result: 'ok', message: win.start + '-' + win.end, details: win });
}

// Human pacing gate (global)
function humanPaceAllowsSendNow_() {
  var cache = CacheService.getScriptCache();
  var nowMs = Date.now();
  var next = Number(cache.get('human_next_allowed_ms') || '0');
  if (!isFinite(next)) next = 0;
  return nowMs >= next;
}

function updateHumanPaceAfterSend_() {
  var cache = CacheService.getScriptCache();

  var minDelay = intOrDefault_(getProp_('MIN_DELAY_SECONDS', '180'), 180);
  var maxDelay = intOrDefault_(getProp_('MAX_DELAY_SECONDS', '360'), 360);
  if (maxDelay < minDelay) { var t = minDelay; minDelay = maxDelay; maxDelay = t; }

  var breakEveryMin = intOrDefault_(getProp_('BREAK_EVERY_MIN', '3'), 3);
  var breakEveryMax = intOrDefault_(getProp_('BREAK_EVERY_MAX', '8'), 8);
  if (breakEveryMax < breakEveryMin) { var tt = breakEveryMin; breakEveryMin = breakEveryMax; breakEveryMax = tt; }

  var breakMin = intOrDefault_(getProp_('BREAK_MIN_SECONDS', '360'), 360);
  var breakMax = intOrDefault_(getProp_('BREAK_MAX_SECONDS', '1080'), 1080);
  if (breakMax < breakMin) { var ttt = breakMin; breakMin = breakMax; breakMax = ttt; }

  var burstCount = Number(cache.get('human_burst_count') || '0');
  var burstTarget = Number(cache.get('human_burst_target') || '0');
  if (!isFinite(burstCount)) burstCount = 0;
  if (!isFinite(burstTarget) || burstTarget <= 0) {
    burstTarget = breakEveryMin + Math.floor(Math.random() * (breakEveryMax - breakEveryMin + 1));
  }

  burstCount += 1;

  var delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
  var nextAllowed = Date.now() + delay * 1000;

  if (burstCount >= burstTarget) {
    var breakSec = breakMin + Math.floor(Math.random() * (breakMax - breakMin + 1));
    nextAllowed = Math.max(nextAllowed, Date.now() + breakSec * 1000);
    burstCount = 0;
    burstTarget = breakEveryMin + Math.floor(Math.random() * (breakEveryMax - breakEveryMin + 1));
    appendEvent_({ run_id: '', contact_id: '', wave_id: '', event_type: 'human_break', result: 'ok', message: 'break_sec=' + breakSec, details: { break_sec: breakSec } });
  }

  cache.put('human_next_allowed_ms', String(nextAllowed), 6 * 60 * 60);
  cache.put('human_burst_count', String(burstCount), 6 * 60 * 60);
  cache.put('human_burst_target', String(burstTarget), 6 * 60 * 60);
}

// ---------------------------
// Wave2 spins (deterministic) + fixed links
// ---------------------------

function renderSubject_(subjectTpl, contact, contactRowIndex, run) {
  var s = String(subjectTpl || '');
  if (run.wave_id === 'wave2' && s.indexOf('{{WAVE2_SPIN_SUBJECT}}') !== -1) {
    s = s.replace(/\{\{\s*WAVE2_SPIN_SUBJECT\s*\}\}/g, wave2SpinSubject_(contactRowIndex));
  }
  return renderTemplate_(s, contact);
}

function renderBody_(bodyTpl, contact, contactRowIndex, run) {
  var s = String(bodyTpl || '');
  if (run.wave_id === 'wave2' && s.indexOf('{{WAVE2_SPIN_BODY}}') !== -1) {
    s = s.replace(/\{\{\s*WAVE2_SPIN_BODY\s*\}\}/g, wave2SpinBody_(contact, contactRowIndex));
  }
  return renderTemplate_(s, contact);
}

function wave2SpinSubject_(contactRowIndex) {
  var subjects = [
    'Quick follow-up',
    'Circling back',
    'A couple updates',
    'BEValuator (quick look?)',
    'Staying in touch'
  ];
  return subjects[stableIndex_(contactRowIndex, subjects.length)];
}

function wave2SpinBody_(contact, contactRowIndex) {
  var firstName = (contact.first_name || '').toString().trim();
  var hello = firstName ? ('Hi ' + firstName + ' —') : 'Hi —';

  var p1a = [
    'Just circling back from my last note.',
    'Quick touch-in from my earlier message.',
    'Wanted to follow up since you already had my intro.'
  ];
  var p1b = [
    'Thought this might be relevant given what you’re building in the beverage space.',
    'Sharing this in case it’s useful on your end.',
    'Figured it was worth passing along while it’s top of mind.'
  ];

  var p2a = [
    'We’ve been sharing short insights on what actually drives brand value over time in spirits.',
    'We’ve been publishing practical notes on valuation drivers founders and investors focus on.',
    'We’ve been documenting the real-world inputs that tend to move valuation, beyond theory.'
  ];
  var p2b = [
    'It’s coming from hands-on work across different market cycles.',
    'The goal is to keep it simple and grounded in how deals get evaluated.',
    'Mostly bite-size takeaways—what to watch, what to measure, what tends to matter.'
  ];

  var p3a = [
    'Alongside that, I’ve been doing short walkthroughs of BEValuator, our valuation platform built for spirits brands.',
    'I’ve been walking teams through BEValuator to help pressure-test assumptions early.',
    'I’ve been showing founders BEValuator so they can get a clearer view of valuation drivers.'
  ];
  var p3b = [
    'It helps teams see a valuation range and understand which levers move it before capital or partnership conversations.',
    'The point is clarity—so you’re not guessing when it comes to valuation assumptions.',
    'It’s a quick way to sanity-check valuation and spot what’s helping (or hurting) perceived value.'
  ];

  var p4a = [
    'If you want, I can send you access.',
    'If you’re curious, I’m happy to share a quick walkthrough.',
    'Want me to send a short demo and access?'
  ];
  var p4b = [
    'Totally optional.',
    'No pressure either way.',
    'Happy to keep it quick.'
  ];

  var P1 = pick_(p1a, contactRowIndex) + ' ' + pick_(p1b, contactRowIndex);
  var P2 = pick_(p2a, contactRowIndex) + ' ' + pick_(p2b, contactRowIndex);
  var P3 = pick_(p3a, contactRowIndex) + ' ' + pick_(p3b, contactRowIndex);
  var P4 = pick_(p4a, contactRowIndex) + ' ' + pick_(p4b, contactRowIndex);

  var P5 = [
    'If any of this is useful, here are the three ways to go deeper:',
    '- Demo / questions: https://bevaluator.com/contact',
    '- Get access: https://bevaluator.com',
    '- Insights + updates: https://beaudettebeverage.com/stay-updated-with-beaudette-beverage-group/',
    'No rush either way.'
  ].join('\n');

  var signoffs = [
    'Best,\nJohn',
    'Thanks either way,\nJohn',
    'Talk soon,\nJohn'
  ];

  var P6 = pick_(signoffs, contactRowIndex);

  return [hello, '', P1, '', P2, '', P3, '', P4, '', P5, '', P6].join('\n');
}

function stableIndex_(seed, n) {
  if (n <= 0) return 0;
  var s = Number(seed);
  if (!isFinite(s)) s = 0;
  var idx = s % n;
  if (idx < 0) idx += n;
  return idx;
}

function pick_(arr, seed) {
  return arr[stableIndex_(seed, arr.length)];
}

// ---------------------------
// Misc helpers
// ---------------------------

function countSentTodayForRun_(contacts, run, runIdCol, sentAtCol) {
  var today = Utilities.formatDate(new Date(), getTimezone_(), 'yyyy-MM-dd');
  var wavePrefix = (run.wave_id === 'wave1') ? 'wave1' : 'wave2';
  var statusCol = wavePrefix + '_status';
  var count = 0;
  for (var i = 0; i < contacts.length; i++) {
    var c = contacts[i];
    if (!c) continue;
    if (c[runIdCol] !== run.run_id) continue;
    if (c[statusCol] !== 'sent') continue;
    var ts = (c[sentAtCol] || '').toString();
    if (!ts) continue;
    if (ts.indexOf(today) === 0) count++;
  }
  return count;
}

function logCapPerDayOnce_(run, sentToday, maxPerDay) {
  var today = Utilities.formatDate(new Date(), getTimezone_(), 'yyyy-MM-dd');
  var cache = CacheService.getScriptCache();
  var key = 'cap_per_day:' + run.run_id + ':' + today;
  if (cache.get(key)) return;
  cache.put(key, '1', 3600);
  appendEvent_({ run_id: run.run_id, contact_id: '', wave_id: run.wave_id, event_type: 'cap_per_day_reached', result: 'ok', message: 'sent_today=' + sentToday + ' max_per_day=' + maxPerDay, details: { sent_today: sentToday, max_per_day: maxPerDay } });
}

function isContactEligibleForRun_(c, run, filter, suppression, mailchimp, customers) {
  // Required fields
  if (!c || !c.contact_id) return false;

  // Global suppressions
  if (truthy_(c.opted_out) || truthy_(c.has_replied) || truthy_(c.bounced)) return false;

  var emailNorm = (c.email_norm || '').toLowerCase().trim();
  if (emailNorm) {
    if (suppression[emailNorm]) return false;
    if (filter.exclude_if_mailchimp_subscriber !== false && mailchimp[emailNorm]) return false;
    if (filter.exclude_if_customer !== false && customers[emailNorm]) return false;
  }

  var wavePrefix = (run.wave_id === 'wave1') ? 'wave1' : 'wave2';
  var statusCol = wavePrefix + '_status';

  if (!CONTACT_STATUS_ENUM[c[statusCol]]) {
    return false;
  }

  if (c[statusCol] !== 'ready') return false;

  // Tags filtering
  var tags = parseTags_(c.segment_tags);
  var include = (filter.include_tags || []);
  var exclude = (filter.exclude_tags || []);

  if (include.length) {
    var ok = false;
    for (var i = 0; i < include.length; i++) {
      if (tags[include[i]]) { ok = true; break; }
    }
    if (!ok) return false;
  }

  if (exclude.length) {
    for (var j = 0; j < exclude.length; j++) {
      if (tags[exclude[j]]) return false;
    }
  }

  return true;
}

function parseTags_(s) {
  var out = {};
  if (!s) return out;
  String(s).split(',').map(function(x){ return x.trim(); }).filter(Boolean).forEach(function(t){ out[t] = true; });
  return out;
}

function finalizeRunIfDone_(run, status, reason) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  var rowIndex = findRowIndexByValue_(sh, 'run_id', run.run_id, HEADERS_RUNS);
  if (rowIndex < 2) return;

  var r = getRunByIdOrCode_(run.run_id, '');
  if (!r) return;
  if (r.status === 'completed' || r.status === 'failed' || r.status === 'killed') return;

  r.status = status;
  r.ended_at = nowIso_();
  writeObjectToRow_(sh, HEADERS_RUNS, rowIndex, r);
  appendEvent_({ run_id: r.run_id, contact_id: '', wave_id: r.wave_id, event_type: 'run_' + status, result: 'ok', message: reason, details: {} });
}

function incrementRunCounter_(runId, field, delta) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.RUNS);
  var rowIndex = findRowIndexByValue_(sh, 'run_id', runId, HEADERS_RUNS);
  if (rowIndex < 2) return;
  var row = sh.getRange(rowIndex, 1, 1, HEADERS_RUNS.length).getValues()[0];
  var obj = rowToObject_(row, HEADERS_RUNS);
  var v = intOrDefault_(obj[field], 0);
  obj[field] = String(v + delta);
  writeObjectToRow_(sh, HEADERS_RUNS, rowIndex, obj);
}

function computeEligibleContacts_(run) {
  var ss = getSpreadsheet_();

  var suppression = loadEmailNormSet_(TABS.SUPPRESSION);
  var mailchimp = loadEmailNormSet_(TABS.MAILCHIMP_SUBSCRIBERS);
  var customers = loadEmailNormSet_(TABS.CUSTOMERS);

  var seg = getSegmentById_(run.segment_id);
  var filter = seg ? safeJsonParse_(seg.filter_json, {}) : {};

  var contactSh = ss.getSheetByName(TABS.CONTACTS);
  var contacts = sheetToObjects_(contactSh, HEADERS_CONTACTS);

  var count = 0;
  var sample = [];
  for (var i = 0; i < contacts.length; i++) {
    if (isContactEligibleForRun_(contacts[i], run, filter, suppression, mailchimp, customers)) {
      count++;
      if (sample.length < 5) sample.push(contacts[i].contact_id);
    }
  }

  return { count: count, sample_contact_ids: sample };
}

function getSegmentById_(segmentId) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.SEGMENTS);
  var rows = sheetToObjects_(sh, HEADERS_SEGMENTS);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].segment_id === segmentId) return rows[i];
  }
  return null;
}

function requireSegmentExistsForRun_(run) {
  if (!getSegmentById_(run.segment_id)) {
    throw new Error('not_found:segment');
  }
}

function getTemplate_(templateId, templateVersion) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(TABS.TEMPLATES);
  var rows = sheetToObjects_(sh, HEADERS_TEMPLATES_MIN);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].template_id === templateId && rows[i].template_version === templateVersion && String(rows[i].is_active).toLowerCase() !== 'false') {
      return { subject: rows[i].subject || '', body: rows[i].body || '' };
    }
  }
  return null;
}

function requireTemplateExistsForRun_(run) {
  if (!getTemplate_(run.template_id, run.template_version)) {
    throw new Error('not_found:template');
  }
}

function renderTemplate_(s, contact) {
  var out = String(s || '');
  // Minimal token replacement.
  out = out.replace(/\{\{\s*first_name\s*\}\}/g, contact.first_name || '');
  out = out.replace(/\{\{\s*last_name\s*\}\}/g, contact.last_name || '');
  out = out.replace(/\{\{\s*company\s*\}\}/g, contact.company || '');
  return out;
}

function ensureTickTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction && triggers[i].getHandlerFunction() === 'tickAllRuns') {
      return;
    }
  }
  // V1: one-minute interval
  ScriptApp.newTrigger('tickAllRuns').timeBased().everyMinutes(1).create();
}

function ensureTickTriggerIfEnabled_() {
  if (isKillSwitchOn_()) return;
  ensureTickTrigger_();
}

// ---------------------------
// EVENT_LOG (append-only)
// ---------------------------

function appendEvent_(evt) {
  try {
    setupWorkbook_();
    var ss = getSpreadsheet_();
    var sh = ss.getSheetByName(TABS.EVENT_LOG);
    var row = {
      event_id: 'evt_' + randomToken_(18),
      ts: nowIso_(),
      run_id: evt.run_id || '',
      contact_id: evt.contact_id || '',
      wave_id: evt.wave_id || '',
      event_type: evt.event_type || '',
      result: evt.result || 'ok',
      message: evt.message || '',
      details_json: evt.details ? JSON.stringify(evt.details) : ''
    };
    appendObjectRow_(sh, HEADERS_EVENT_LOG, row);
  } catch (e) {
    // Never throw from logging.
  }
}

// ---------------------------
// Sheets Helpers
// ---------------------------

function getSpreadsheet_() {
  var id = getProp_('SPREADSHEET_ID', '');
  if (id) return SpreadsheetApp.openById(id);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheetToObjects_(sh, headers) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var vals = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return vals.map(function(r){ return rowToObject_(r, headers); });
}

function rowToObject_(row, headers) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = (row[i] === undefined) ? '' : row[i];
  }
  return obj;
}

function appendObjectRow_(sh, headers, obj) {
  var row = headers.map(function(h){ return obj[h] === undefined ? '' : obj[h]; });
  sh.appendRow(row);
}

function writeObjectToRow_(sh, headers, rowIndex, obj) {
  var row = headers.map(function(h){ return obj[h] === undefined ? '' : obj[h]; });
  sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}

function findRowIndexByValue_(sh, colName, value, headers) {
  var idx = headers.indexOf(colName);
  if (idx === -1) throw new Error('bad_column:' + colName);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var vals = sh.getRange(2, idx + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '') === String(value)) return i + 2;
  }
  return -1;
}

function loadEmailNormSet_(tabName) {
  var out = {};
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(tabName);
  if (!sh) return out;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return out;
  var vals = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var v = (vals[i][0] || '').toString().toLowerCase().trim();
    if (v) out[v] = true;
  }
  return out;
}

// ---------------------------
// Utils
// ---------------------------

function nowIso_() {
  return new Date().toISOString();
}

function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytesToHex_(bytes);
}

function bytesToHex_(bytes) {
  var hex = [];
  for (var i = 0; i < bytes.length; i++) {
    var v = (bytes[i] < 0) ? bytes[i] + 256 : bytes[i];
    var h = v.toString(16);
    if (h.length === 1) h = '0' + h;
    hex.push(h);
  }
  return hex.join('');
}

function randomToken_(n) {
  var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var out = '';
  for (var i = 0; i < n; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function intOrDefault_(v, d) {
  var n = Number(v);
  return isFinite(n) ? Math.floor(n) : d;
}

function truthy_(v) {
  if (v === true) return true;
  if (v === false) return false;
  var s = String(v || '').toLowerCase().trim();
  return (s === 'true' || s === '1' || s === 'yes');
}

function safeJsonParse_(s, fallback) {
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function safeErr_(err) {
  try {
    var s = (err && err.message) ? err.message : String(err);
    return s.substring(0, 300);
  } catch (e) {
    return 'error';
  }
}

function getProps_() {
  return PropertiesService.getScriptProperties();
}

function getProp_(k, defVal) {
  var v = getProps_().getProperty(k);
  if (v === null || v === undefined || v === '') return defVal;
  return v;
}

function getPropOrThrow_(k) {
  var v = getProps_().getProperty(k);
  if (!v) throw new Error('missing_property:' + k);
  return v;
}

function isKillSwitchOn_() {
  return getProp_('KILL_SWITCH', '1') !== '0';
}

function isDefaultDryRunOn_() {
  return getProp_('DEFAULT_DRY_RUN', '1') !== '0';
}

// Optional manual runner for operators
function manualSetupWorkbook() {
  setupWorkbook_();
}

function debugSpreadsheetAccess() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SPREADSHEET_ID");

  Logger.log("DEBUG: SPREADSHEET_ID present? " + Boolean(id));
  Logger.log("DEBUG: SPREADSHEET_ID length: " + (id ? id.length : 0));

  if (!id) throw new Error("SPREADSHEET_ID is missing in Script Properties for THIS project.");

  var ss = SpreadsheetApp.openById(id);
  Logger.log("DEBUG: openById OK. Spreadsheet name: " + ss.getName());
}
