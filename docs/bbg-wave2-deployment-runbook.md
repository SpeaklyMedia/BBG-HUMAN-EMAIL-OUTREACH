# BBG Wave 2 Deployment Runbook

Live targets:
- Vercel host: `https://bbg-human-email-outreach-wiea.vercel.app`
- Apps Script deployment: `AKfycbyXstlqwoKlZ-p5SrkPBp0vBnOsx6P-JWIXheWHJk8gFYockXRiQaSVhrndFoJIoc7u5A`

## Verification order

1. Verify dashboard sign-in at the Vercel host with an allowlisted operator account.
2. Open the `Config` screen and confirm server-side readiness is not `blocked`.
3. Open the `Health` screen and confirm the signed Apps Script `health` call returns current state.
4. Open the `Runs` screen and confirm real runs load.
5. Open the `Segments` screen and confirm active segments load.
6. Confirm locked BBG Wave 2 defaults are visible in the dashboard shell.
7. Execute the dry-run operator sequence:
   - Create
   - Preview
   - Confirm
   - Pause
   - Resume
   - Kill for test cleanup if appropriate

## Expected BBG Wave 2 pilot defaults

- `wave_id = wave2`
- `segment_id = segment_default`
- `template_id = wave2_update`
- `template_version = v1`
- `max_recipients_total = 50`
- `max_recipients_per_day = 25`
- `send_window_start_local = 04:45`
- `send_window_end_local = 23:30`
- `min_delay_seconds = 180`
- `max_delay_seconds = 360`
- `dry_run = true`

## Safe dry-run sequence

Dashboard path:
1. Sign in.
2. Go to `Runs`.
3. Create a BBG Wave 2 run with the locked defaults and `dry_run = true`.
4. Select the created run.
5. Click `Preview`.
6. Review:
   - `eligible_count`
   - `sample_contact_ids`
   - updated run `status`
7. Enter exact confirmation text:
   - `CONFIRM <run_code>`
8. Click `Confirm`.
9. Optionally test `Pause` and `Resume`.
10. Use `Kill` for cleanup if the test run should not remain active.

Signed route layer path:
- `npm run smoke:apps-script -- health`
- `npm run smoke:apps-script -- runs:list`
- `npm run smoke:apps-script -- segments:list`
- `npm run smoke:apps-script -- dry-run-sequence`

Required local env for the smoke harness:
- `WEBHOOK_SECRET`
- `SMOKE_OPERATOR_EMAIL` or `ADMIN_EMAILS`

Optional local env:
- `APPS_SCRIPT_WEBAPP_URL`
- `APPS_SCRIPT_WEB_APP_URL`

## What is verified in UI vs signed route layer

Verified in UI:
- NextAuth sign-in and session gating
- config/readiness presentation
- health presentation
- run list and run detail rendering
- BBG Wave 2 create, preview, confirm, pause, resume, kill controls

Verified in signed route layer:
- canonical envelope signing
- route reachability for:
  - `/health`
  - `/runs/list`
  - `/segments/list`
  - `/runs/create`
  - `/runs/preview`
  - `/runs/confirm`
  - `/runs/pause`
  - `/runs/resume`
  - `/runs/kill`

## Expected safe outcomes

- `health` returns JSON and current operational state
- `runs/list` returns JSON with real runs
- `segments/list` returns JSON with active segments
- `create` returns `{ ok: true, run }`
- `preview` returns `{ ok: true, run, eligible_count, sample_contact_ids }`
- `confirm` returns `{ ok: true, run }`
- `pause`, `resume`, and `kill` each return `{ ok: true, run }`
- all testing remains `dry_run = true`

## Deferred items

- no `EVENT_LOG` read route
- no `TEMPLATES` read route
- `confirmRun_()` is not a full policy gate
- workbook/property inspection remains a separate operational verification step
