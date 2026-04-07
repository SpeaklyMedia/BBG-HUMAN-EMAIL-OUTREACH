# Risk Register

## R1. Anonymous web app remains public at the network edge

Impact:
- endpoint discovery and abuse attempts remain possible

What is closed:
- every `doPost` route requires a signed envelope before dispatch

What remains:
- if `WEBHOOK_SECRET` leaks, an attacker can hit all routes the same way the dashboard can
- `health` is signed but not allowlist-gated

## R2. Apps Script contract opacity is mostly resolved, but not completely

Impact:
- lower than before, but some deployment/runtime assumptions remain unverified

What is closed:
- route inventory
- workbook headers
- minimal template schema
- Wave 2 rendering behavior

What remains:
- actual production Script Properties
- actual workbook data contents
- any unpublished script files not in the clone

## R3. Send exception can strand contacts in `sending`

Impact:
- contact lifecycle can become inconsistent after a mail send exception

Evidence:
- `tickRunOnce_()` logs `send_exception` but does not set contact status to `error`

Mitigation:
- add explicit error-state transition in Apps Script later
- reflect this as an operational warning in milestone 1 UI

## R4. `paused` can be written with `ended_at`

Impact:
- lifecycle semantics are muddy for quota-driven pauses

Evidence:
- `finalizeRunIfDone_(run, 'paused', 'quota_low')` stamps `ended_at`

Mitigation:
- treat `ended_at` as not strictly terminal until lifecycle cleanup is implemented

## R5. Confirm path is lighter than expected

Impact:
- confirm still does not verify suppression freshness or preview hash consistency

Evidence:
- `confirmRun_()` now verifies run existence, state, confirmation text, segment existence, and template existence
- source still does not bind confirm to a suppression freshness check or preview-hash replay check

Mitigation:
- milestone 1 UI must add pre-confirm readiness checks
- do not assume Apps Script confirm is a full policy gate today

## R6. Data leakage through audit details is limited but not zero

Impact:
- `EVENT_LOG` can contain sample contact IDs, message tokens, cap data, and dry-run subject lines

Evidence:
- `run_previewed`, `queued`, `dry_run_sent`, and cap events include details in `details_json`

Mitigation:
- treat `EVENT_LOG` as sensitive operational data
- redact in UI where appropriate

## R7. Segment filter spec and source do not fully match

Impact:
- UI could imply configurable behavior that Apps Script does not honor

Evidence:
- source always excludes opted-out, replied, and bounced contacts regardless of segment flags

Mitigation:
- UI and docs must reflect actual enforced behavior

## R8. No read API exists for templates or event log

Impact:
- milestone 1 read-only views cannot rely on Apps Script routes yet

Mitigation:
- either add explicit Apps Script read routes later or use a separate read-only reconciliation layer in a later phase

## R9. Naming/config inconsistencies still exist across bundle layers

Impact:
- deployment mistakes and misread docs

What is closed:
- canonical Vercel env name is now `APPS_SCRIPT_WEBAPP_URL`
- deprecated alias is supported temporarily

What remains:
- `BBH` vs `BBG` naming drift at the workspace/container level
