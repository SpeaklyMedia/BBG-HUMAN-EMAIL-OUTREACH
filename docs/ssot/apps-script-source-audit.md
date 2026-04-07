# Apps Script Source Audit

Source audited:
- `apps-script/google-apps-script/Code.js`
- `apps-script/google-apps-script/appsscript.json`

## Route inventory

Confirmed routes:
- `health`
- `setup`
- `segments/list`
- `segments/upsert`
- `runs/list`
- `runs/create`
- `runs/preview`
- `runs/confirm`
- `runs/pause`
- `runs/resume`
- `runs/kill`
- `runs/export`

Confirmed aliases:
- `createRun`
- `previewRun`
- `confirmRun`
- `pauseRun`
- `resumeRun`
- `killRun`
- `exportRun`

Entry surface:
- `doPost` only
- no `doGet` route is implemented

## Request payload audit

Envelope fields:
- `path`
- `timestamp`
- `nonce`
- `operator_email`
- `request_id`
- `body_hash`
- `payload`
- `signature`

Handler payloads:
- `health`: empty object
- `setup`: optional `run_id`, `wave_id`
- `segments/upsert`: `segment_id`, `name`, `description`, `filter_json`, `is_active`
- `runs/create`: run config payload with limits, delays, and dry-run hint
- `runs/preview|confirm|pause|resume|kill|export`: `run_id` or `run_code`
- `runs/confirm`: plus exact `confirmation_text`

## Response shape audit

Common success patterns:
- `{ ok: true }`
- `{ ok: true, run: ... }`
- `{ ok: true, runs: [...] }`
- `{ ok: true, segments: [...] }`
- `{ ok: true, csv: "..." }`

Common error pattern:
- `{ ok: false, error: "exception", message: "<truncated>" }`

Unknown route pattern:
- `{ ok: false, error: "unknown_route", route: "<normalized>" }`

## Workbook and schema audit

Tabs created and schema-checked:
- `CONTACTS`
- `SEGMENTS`
- `RUNS`
- `EVENT_LOG`
- `SUPPRESSION`
- `MAILCHIMP_SUBSCRIBERS`
- `CUSTOMERS`
- `TEMPLATES`
- `NONCE_CACHE`

Header enforcement:
- Apps Script throws `schema_mismatch:<tab>:<expected>!=<existing>` when headers drift

## TEMPLATES schema audit

Confirmed columns:
- `template_id`
- `template_version`
- `subject`
- `body`
- `created_at`
- `updated_at`
- `is_active`

Lookup behavior:
- exact `template_id` + `template_version`
- inactive rows skipped
- returns only subject and body to caller

## Wave 2 render audit

Subject:
- `{{WAVE2_SPIN_SUBJECT}}` replaced by deterministic subject variant
- 5 variants total

Body:
- `{{WAVE2_SPIN_BODY}}` replaced by deterministic body text
- assembled from `P1`, `P2`, `P3`, `P4`, fixed `P5`, and signoff `P6`
- `P5` is the fixed 3-link block
- deterministic variant selection is keyed by contact row index

Standard tokens:
- `{{first_name}}`
- `{{last_name}}`
- `{{company}}`

## Run lifecycle audit

Run states confirmed in code:
- `draft`
- `previewed`
- `confirmed`
- `running`
- `paused`
- `killed`
- `completed`
- `failed` enum only

Actual transition points:
- `createRun_()` writes `draft`
- `previewRun_()` writes `previewed`
- `confirmRun_()` writes `confirmed`
- `tickAllRuns()` upgrades `confirmed` to `running`
- `pauseRun_()` and `resumeRun_()` mutate state explicitly
- `killRun_()` mutates to `killed`
- `finalizeRunIfDone_()` writes `completed` and also `paused` for quota-low

## EVENT_LOG audit

Append-only logger:
- `appendEvent_()` always appends a new row
- logging exceptions are swallowed

Observed event types:
- `setup_workbook`
- `segment_created`
- `segment_updated`
- `run_created`
- `run_previewed`
- `run_confirmed`
- `run_started`
- `run_paused`
- `run_resumed`
- `run_killed`
- `run_completed`
- `run_exported`
- `tick_blocked_kill_switch`
- `tick_exception`
- `quota_low`
- `lock_timeout`
- `idempotent_skip`
- `queued`
- `send_error`
- `dry_run_sent`
- `sent`
- `send_exception`
- `daily_cap_set`
- `daily_cap_reached`
- `window_closed`
- `human_break`
- `cap_per_day_reached`

## Contract deltas vs earlier provisional SSOT

Confirmed now:
- `health` and `setup` routes exist
- `TEMPLATES` has a concrete minimal schema
- preview returns sample contact IDs, not render previews
- Wave 2 `P1-P4` and fixed 3-link behavior are implemented in source

Still absent:
- `EVENT_LOG` read route
- template read route
- richer error response taxonomy
