# Route Contract

Source of truth:
- `apps-script/google-apps-script/Code.js`
- `lib/appsScriptClient.js`
- `pages/api/**/*`

This contract is now grounded in the actual Apps Script source, not only the bundle spec.

## Transport envelope

Every Apps Script request is a signed JSON envelope:

```json
{
  "path": "/runs/create",
  "timestamp": 1760000000000,
  "nonce": "hex",
  "operator_email": "operator@example.com",
  "request_id": "hex",
  "body_hash": "sha256hex",
  "payload": {},
  "signature": "hmacsha256hex"
}
```

Canonical string:

```text
normalizePathForSig(path) + "\n" + parseTimestampMs(timestamp) + "\n" + nonce + "\n" + operator_email.toLowerCase().trim() + "\n" + request_id + "\n" + body_hash
```

## Verification order in Apps Script

Applied before route dispatch:
1. required envelope fields present
2. HMAC signature valid
3. timestamp within 5 minutes
4. nonce has not been used

Then per route:
1. route-level authz check
2. `body_hash` recomputed from `JSON.stringify(payload || {})`
3. route handler execution

## Route inventory

### `health`

Accepted paths:
- `/health`
- `health`

Auth:
- Signed request required
- No admin/viewer allowlist check

Payload:
- any JSON object, typically `{}`

Response:

```json
{
  "ok": true,
  "now": "ISO timestamp",
  "kill_switch": true,
  "default_dry_run": true,
  "window": { "start": "HH:MM", "end": "HH:MM" },
  "cap": { "date_key": "YYYY-MM-DD", "cap_today": 150, "sent_today": 0 }
}
```

### `setup`

Auth:
- admin only

Payload:
- optional `run_id`
- optional `wave_id`

Behavior:
- runs `setupWorkbook_()`
- appends `setup_workbook` event

Response:

```json
{ "ok": true }
```

### `segments/list`

Auth:
- viewer or admin

Payload:
- `{}` expected

Behavior:
- returns only active segments

Response:

```json
{ "ok": true, "segments": Segment[] }
```

### `segments/upsert`

Auth:
- admin only

Payload:

```json
{
  "segment_id": "optional",
  "name": "required",
  "description": "optional",
  "filter_json": "string or object",
  "is_active": true
}
```

Behavior:
- generates `segment_id` if absent
- validates `filter_json` via `JSON.parse`
- upserts row
- logs `segment_created` or `segment_updated`

Response:

```json
{ "ok": true, "segment": Segment }
```

### `runs/list`

Auth:
- viewer or admin

Payload:
- `{}`

Response:

```json
{ "ok": true, "runs": Run[] }
```

### `runs/create`

Accepted aliases:
- `/runs/create`
- `createRun`

Auth:
- admin only

Payload:

```json
{
  "run_code": "optional",
  "wave_id": "wave1 | wave2",
  "segment_id": "required",
  "template_id": "required",
  "template_version": "required",
  "max_recipients_total": 0,
  "max_recipients_per_day": 0,
  "send_window_start_local": "HH:MM",
  "send_window_end_local": "HH:MM",
  "min_delay_seconds": 0,
  "max_delay_seconds": 0,
  "bounce_stop_threshold": 0,
  "dry_run": true
}
```

Behavior:
- validates `wave_id`
- does not validate that segment or template currently exists
- forces `dry_run = TRUE` if `DEFAULT_DRY_RUN` is on
- persists a `draft` run

Response:

```json
{ "ok": true, "run": Run }
```

### `runs/preview`

Accepted aliases:
- `/runs/preview`
- `previewRun`

Auth:
- admin only

Payload:

```json
{ "run_id": "optional", "run_code": "optional" }
```

Behavior:
- run must be `draft` or `previewed`
- computes eligibility from workbook state
- stores `eligible_count`
- updates status to `previewed`
- returns up to 5 sample contact IDs
- does not render template previews

Response:

```json
{
  "ok": true,
  "run": Run,
  "eligible_count": 12,
  "sample_contact_ids": ["c1", "c2"]
}
```

### `runs/confirm`

Accepted aliases:
- `/runs/confirm`
- `confirmRun`

Auth:
- admin only

Payload:

```json
{
  "run_id": "optional",
  "run_code": "optional",
  "confirmation_text": "CONFIRM <run_code>"
}
```

Behavior:
- run must already be `previewed`
- exact confirmation string required
- sets status to `confirmed`
- stamps `confirmed_at`
- forces `dry_run = TRUE` if `DEFAULT_DRY_RUN` is on
- ensures the tick trigger exists

Response:

```json
{ "ok": true, "run": Run }
```

### `runs/pause`

Accepted aliases:
- `/runs/pause`
- `pauseRun`

Auth:
- admin only

Payload:

```json
{ "run_id": "optional", "run_code": "optional" }
```

Behavior:
- valid from `running` or `confirmed`
- delegates to `updateRunStatus_()`

Response:

```json
{ "ok": true, "run": Run }
```

### `runs/resume`

Accepted aliases:
- `/runs/resume`
- `resumeRun`

Auth:
- admin only

Payload:

```json
{ "run_id": "optional", "run_code": "optional" }
```

Behavior:
- valid only from `paused`
- ensures tick trigger
- delegates to `updateRunStatus_()`

Response:

```json
{ "ok": true, "run": Run }
```

### `runs/kill`

Accepted aliases:
- `/runs/kill`
- `killRun`

Auth:
- admin only

Payload:

```json
{ "run_id": "optional", "run_code": "optional" }
```

Behavior:
- idempotent if already `killed` or `completed`
- otherwise delegates to `updateRunStatus_()`

Response:

```json
{ "ok": true, "run": Run }
```

### `runs/export`

Accepted aliases:
- `/runs/export`
- `exportRun`

Auth:
- admin only

Payload:

```json
{ "run_id": "optional", "run_code": "optional" }
```

Response:

```json
{ "ok": true, "csv": "contact_id,wave_status,..." }
```

CSV columns:
- `contact_id`
- `wave_status`
- `last_attempt_at`
- `sent_at`
- `has_replied`
- `opted_out`
- `bounced`

## Error shape

All route exceptions are returned as:

```json
{ "ok": false, "error": "exception", "message": "truncated error string" }
```

Unknown route:

```json
{ "ok": false, "error": "unknown_route", "route": "..." }
```

Implication:
- typed clients should not expect stable machine-readable `code` fields yet
- meaningful failure classification must currently parse `message`

## Current dashboard mapping gap

Current Next.js API routes proxy only:
- `runs/*`
- `segments/list`
- `segments/upsert`
- `runs/export`

Not yet exposed by the dashboard:
- `health`
- `setup`

There is still no Apps Script route for:
- `EVENT_LOG` read
- `TEMPLATES` read
- run detail by ID

Those must be added explicitly or handled via a later read-only reconciliation layer.
