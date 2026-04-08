import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const CODE_PATH = path.join(ROOT, "apps-script/google-apps-script/Code.js");

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const row = [];
      for (let c = 0; c < this.numCols; c += 1) {
        row.push(this.sheet.getCell(this.row + r, this.col + c));
      }
      out.push(row);
    }
    return out;
  }

  setValues(values) {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numCols; c += 1) {
        this.sheet.setCell(this.row + r, this.col + c, values[r][c]);
      }
    }
  }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
    this.frozenRows = 0;
  }

  getName() {
    return this.name;
  }

  setFrozenRows(count) {
    this.frozenRows = count;
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, col, numRows, numCols) {
    return new FakeRange(this, row, col, numRows, numCols);
  }

  appendRow(row) {
    this.rows.push([...row]);
  }

  getCell(row, col) {
    const rowIndex = row - 1;
    const colIndex = col - 1;
    return this.rows[rowIndex]?.[colIndex] ?? "";
  }

  setCell(row, col, value) {
    const rowIndex = row - 1;
    const colIndex = col - 1;
    while (this.rows.length <= rowIndex) this.rows.push([]);
    while (this.rows[rowIndex].length <= colIndex) this.rows[rowIndex].push("");
    this.rows[rowIndex][colIndex] = value;
  }
}

class FakeSpreadsheet {
  constructor() {
    this.sheets = new Map();
  }

  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }

  insertSheet(name) {
    const sheet = new FakeSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }

  getName() {
    return "Fake Spreadsheet";
  }
}

function createHarness(options = {}) {
  const properties = new Map(
    Object.entries({
      WEBHOOK_SECRET: "ship-secret",
      ADMIN_EMAILS: "admin@example.com",
      VIEWER_EMAILS: "viewer@example.com",
      TIMEZONE: "America/New_York",
      KILL_SWITCH: "1",
      DEFAULT_DRY_RUN: "1",
      SEND_WINDOW_START: "04:45",
      SEND_WINDOW_END: "23:30",
      DAILY_CAP_MIN: "150",
      DAILY_CAP_MAX: "235",
      MIN_DELAY_SECONDS: "180",
      MAX_DELAY_SECONDS: "360",
      BREAK_EVERY_MIN: "3",
      BREAK_EVERY_MAX: "8",
      BREAK_MIN_SECONDS: "360",
      BREAK_MAX_SECONDS: "1080",
      SPREADSHEET_ID: "fake-sheet",
      ...options.properties
    })
  );

  const spreadsheet = new FakeSpreadsheet();
  const scriptCache = new Map();
  const triggers = [];
  const sentEmails = [];
  const fixedNow = options.now || new Date("2026-04-01T15:00:00.000Z");
  const RealDate = Date;

  function FakeDate(...args) {
    if (!(this instanceof FakeDate)) {
      return new RealDate(...args);
    }
    if (!args.length) {
      return new RealDate(fixedNow);
    }
    return new RealDate(...args);
  }
  FakeDate.now = () => fixedNow.getTime();
  FakeDate.UTC = RealDate.UTC;
  FakeDate.parse = RealDate.parse;
  FakeDate.prototype = RealDate.prototype;

  const context = {
    console,
    JSON,
    Math,
    Date: FakeDate,
    Logger: { log() {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest(algo, value) {
        const hash = crypto.createHash("sha256").update(String(value), "utf8").digest();
        return [...hash].map((byte) => (byte > 127 ? byte - 256 : byte));
      },
      computeHmacSha256Signature(value, secret) {
        const digest = crypto.createHmac("sha256", secret).update(String(value), "utf8").digest();
        return [...digest].map((byte) => (byte > 127 ? byte - 256 : byte));
      },
      formatDate(date, _tz, pattern) {
        const d = new RealDate(date);
        const yyyy = String(d.getUTCFullYear());
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const HH = String(d.getUTCHours()).padStart(2, "0");
        const MM = String(d.getUTCMinutes()).padStart(2, "0");
        if (pattern === "yyyy-MM-dd") return `${yyyy}-${mm}-${dd}`;
        if (pattern === "HH") return HH;
        if (pattern === "mm") return MM;
        if (pattern === "HH:mm") return `${HH}:${MM}`;
        return `${yyyy}-${mm}-${dd}`;
      },
      sleep() {}
    },
    CacheService: {
      getScriptCache() {
        return {
          get(key) {
            return scriptCache.has(key) ? scriptCache.get(key) : null;
          },
          put(key, value) {
            scriptCache.set(key, String(value));
          }
        };
      }
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) {
            return properties.has(key) ? properties.get(key) : null;
          },
          setProperty(key, value) {
            properties.set(key, String(value));
          }
        };
      }
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(text) {
        return {
          text,
          setMimeType() {
            return this;
          }
        };
      }
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock() {
            return true;
          },
          releaseLock() {}
        };
      }
    },
    ScriptApp: {
      getProjectTriggers() {
        return triggers;
      },
      newTrigger(name) {
        return {
          timeBased() {
            return {
              everyMinutes() {
                return {
                  create() {
                    triggers.push({
                      getHandlerFunction() {
                        return name;
                      }
                    });
                  }
                };
              }
            };
          }
        };
      }
    },
    MailApp: {
      getRemainingDailyQuota() {
        return 100;
      },
      sendEmail(payload) {
        sentEmails.push(payload);
      }
    },
    SpreadsheetApp: {
      openById() {
        return spreadsheet;
      },
      getActiveSpreadsheet() {
        return spreadsheet;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(CODE_PATH, "utf8"), context);

  return { context, spreadsheet, sentEmails, properties };
}

function sheetRows(spreadsheet, name) {
  return spreadsheet.getSheetByName(name)?.rows || [];
}

test("setupWorkbook creates required sheets and headers", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();
  assert.deepEqual(sheetRows(spreadsheet, "CONTACTS")[0].slice(0, 5), [
    "contact_id",
    "email",
    "email_norm",
    "first_name",
    "last_name"
  ]);
  assert.equal(sheetRows(spreadsheet, "SUPPRESSION")[0][1], "imported_at");
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[0][0], "template_id");
});

test("setupWorkbook seeds default wave2 segment and template", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();

  assert.equal(sheetRows(spreadsheet, "SEGMENTS")[1][0], "segment_default");
  assert.equal(sheetRows(spreadsheet, "SEGMENTS")[1][1], "Default");
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[1][0], "wave2_update");
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[1][1], "v1");
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[1][3], "{{WAVE2_SPIN_BODY}}");
});

test("canonical signing matches Node HMAC expectation", () => {
  const { context } = createHarness();
  const sig = context.computeSignatureHex_("/health", 1711987200000, "nonce", "ADMIN@example.com", "req1", "body");
  const expected = crypto
    .createHmac("sha256", "ship-secret")
    .update("/health\n1711987200000\nnonce\nadmin@example.com\nreq1\nbody", "utf8")
    .digest("hex");
  assert.equal(sig, expected);
});

test("preview requires segment existence", () => {
  const { context, spreadsheet } = createHarness({
    properties: { KILL_SWITCH: "0" }
  });
  context.setupWorkbook_();
  const runs = spreadsheet.getSheetByName("RUNS");
  runs.appendRow([
    "run_1","R1","wave2","missing_segment","wave2_update","v1","draft","admin@example.com","2026-04-01T15:00:00.000Z","","","",
    0,0,"04:45","23:30",180,360,0,"TRUE","","0","0","0","0","0","0"
  ]);
  assert.throws(() => context.previewRun_("admin@example.com", { run_id: "run_1" }), /not_found:segment/);
});

test("confirm requires template existence", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();
  spreadsheet.getSheetByName("SEGMENTS").appendRow([
    "segment_default","Default","","{}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("RUNS").appendRow([
    "run_1","R1","wave2","segment_default","missing_template","v1","previewed","admin@example.com","2026-04-01T15:00:00.000Z","","","",
    0,0,"04:45","23:30",180,360,0,"TRUE","0","0","0","0","0","0","0"
  ]);
  assert.throws(
    () => context.confirmRun_("admin@example.com", { run_id: "run_1", confirmation_text: "CONFIRM R1" }),
    /not_found:template/
  );
});

test("templates upsert creates canonical wave2 template", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();
  const templates = spreadsheet.getSheetByName("TEMPLATES");
  templates.rows = [templates.rows[0]];

  const result = context.upsertTemplate_("admin@example.com", {
    template_id: "wave2_update",
    template_version: "v1",
    subject: "Quick update for {{first_name}}",
    body: "{{WAVE2_SPIN_BODY}}",
    is_active: true
  });

  assert.equal(result.ok, true);
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[1][0], "wave2_update");
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[1][1], "v1");
  assert.equal(sheetRows(spreadsheet, "TEMPLATES")[1][3], "{{WAVE2_SPIN_BODY}}");
});

test("contacts upsert creates an eligible wave2-ready contact row", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();
  const contacts = spreadsheet.getSheetByName("CONTACTS");
  contacts.rows = [contacts.rows[0]];

  const result = context.upsertContact_("admin@example.com", {
    contact_id: "contact_test_001",
    email: "you+bbgtest1@example.com",
    first_name: "Alex",
    source: "manual_seed",
    source_import_id: "seed_20260407",
    wave2_status: "ready"
  });

  assert.equal(result.ok, true);
  assert.equal(sheetRows(spreadsheet, "CONTACTS")[1][0], "contact_test_001");
  assert.equal(sheetRows(spreadsheet, "CONTACTS")[1][1], "you+bbgtest1@example.com");
  assert.equal(sheetRows(spreadsheet, "CONTACTS")[1][2], "you+bbgtest1@example.com");
  assert.equal(sheetRows(spreadsheet, "CONTACTS")[1][17], "ready");
});

test("preview requires template existence", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();
  spreadsheet.getSheetByName("SEGMENTS").appendRow([
    "segment_default","Default","","{}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("RUNS").appendRow([
    "run_1","R1","wave2","segment_default","missing_template","v1","draft","admin@example.com","2026-04-01T15:00:00.000Z","","","",
    0,0,"04:45","23:30",180,360,0,"TRUE","0","0","0","0","0","0","0"
  ]);
  assert.throws(() => context.previewRun_("admin@example.com", { run_id: "run_1" }), /not_found:template/);
});

test("confirm in safe mode does not require ScriptApp trigger permissions", () => {
  const { context, spreadsheet } = createHarness({
    properties: { KILL_SWITCH: "1", DEFAULT_DRY_RUN: "1" }
  });
  context.setupWorkbook_();
  context.ScriptApp.getProjectTriggers = () => {
    throw new Error("forbidden:scriptapp");
  };
  spreadsheet.getSheetByName("SEGMENTS").appendRow([
    "segment_default","Default","","{}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("TEMPLATES").appendRow([
    "wave2_update","v1","Subject","Body","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("RUNS").appendRow([
    "run_1","R1","wave2","segment_default","wave2_update","v1","previewed","admin@example.com","2026-04-01T15:00:00.000Z","","","",
    0,0,"04:45","23:30",180,360,0,"TRUE","0","0","0","0","0","0","0"
  ]);

  const response = context.confirmRun_("admin@example.com", {
    run_id: "run_1",
    confirmation_text: "CONFIRM R1"
  });

  assert.equal(response.ok, true);
  assert.equal(response.run.status, "confirmed");
  assert.equal(response.run.dry_run, "TRUE");
});

test("tickAllRuns honors kill switch and does not send", () => {
  const { context, spreadsheet, sentEmails } = createHarness({
    properties: { KILL_SWITCH: "1", DEFAULT_DRY_RUN: "1" }
  });
  context.setupWorkbook_();
  spreadsheet.getSheetByName("SEGMENTS").appendRow([
    "segment_default","Default","","{}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("TEMPLATES").appendRow([
    "wave2_update","v1","Subject","Body","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("CONTACTS").appendRow([
    "c1","person@example.com","person@example.com","Test","","","","tag1","import","src1","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z",
    "ready","","","","","ready","","","","",false,false,false,"","","",""
  ]);
  spreadsheet.getSheetByName("RUNS").appendRow([
    "run_1","R1","wave2","segment_default","wave2_update","v1","confirmed","admin@example.com","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","","",
    0,0,"04:45","23:30",180,360,0,"FALSE","0","0","0","0","0","0","0"
  ]);
  context.tickAllRuns();
  assert.equal(sentEmails.length, 0);
  const eventMessages = sheetRows(spreadsheet, "EVENT_LOG").map((row) => row[5]);
  assert.ok(eventMessages.includes("tick_blocked_kill_switch"));
});

test("dry run sends update state without outbound email", () => {
  const { context, spreadsheet, sentEmails, properties } = createHarness({
    properties: { KILL_SWITCH: "0", DEFAULT_DRY_RUN: "1" }
  });
  context.setupWorkbook_();
  spreadsheet.getSheetByName("SEGMENTS").appendRow([
    "segment_default","Default","","{}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("TEMPLATES").appendRow([
    "wave2_update","v1","Subject {{first_name}}","{{WAVE2_SPIN_BODY}}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("CONTACTS").appendRow([
    "c1","person@example.com","person@example.com","Test","","","","","import","src1","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z",
    "ready","","","","","ready","","","","",false,false,false,"","","",""
  ]);
  spreadsheet.getSheetByName("RUNS").appendRow([
    "run_1","R1","wave2","segment_default","wave2_update","v1","confirmed","admin@example.com","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","","",
    0,0,"04:45","23:30",180,360,0,"FALSE","0","0","0","0","0","0","0"
  ]);
  context.tickAllRuns();
  assert.equal(sentEmails.length, 0);
  const contacts = sheetRows(spreadsheet, "CONTACTS");
  assert.equal(contacts[1][17], "sent");
  assert.equal(properties.get("DAILY_SENT_TODAY"), "1");
});

test("suppression list excludes eligible contacts", () => {
  const { context, spreadsheet } = createHarness();
  context.setupWorkbook_();
  spreadsheet.getSheetByName("SEGMENTS").appendRow([
    "segment_default","Default","","{}","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z","TRUE"
  ]);
  spreadsheet.getSheetByName("SUPPRESSION").appendRow(["person@example.com", "2026-04-01T15:00:00.000Z"]);
  spreadsheet.getSheetByName("CONTACTS").appendRow([
    "c1","person@example.com","person@example.com","Test","","","","","import","src1","2026-04-01T15:00:00.000Z","2026-04-01T15:00:00.000Z",
    "ready","","","","","ready","","","","",false,false,false,"","","",""
  ]);
  const eligible = context.computeEligibleContacts_({
    run_id: "run_1",
    wave_id: "wave2",
    segment_id: "segment_default"
  });
  assert.equal(eligible.count, 0);
});

test("wave2 rendering is deterministic and fixed links remain present", () => {
  const { context } = createHarness();
  const body1 = context.wave2SpinBody_({ first_name: "Casey" }, 7);
  const body2 = context.wave2SpinBody_({ first_name: "Casey" }, 7);
  assert.equal(body1, body2);
  assert.match(body1, /https:\/\/bevaluator\.com\/contact/);
  assert.match(body1, /https:\/\/bevaluator\.com/);
  assert.match(body1, /https:\/\/beaudettebeverage\.com\/stay-updated-with-beaudette-beverage-group\//);
});
