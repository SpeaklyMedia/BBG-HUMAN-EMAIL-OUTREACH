# BBG Wave 2 Operator Handoff

## What is complete

Milestone 1 BBG Wave 2 control plane currently includes:
- signed Apps Script transport layer
- config/readiness screen
- health screen
- runs screen
- segments screen
- BBG Wave 2 create flow with locked defaults
- preview flow using confirmed Apps Script response fields
- confirm flow using exact confirmation text
- admin-only pause, resume, and kill controls

Apps Script remains authoritative for:
- eligibility
- preview computation
- confirm behavior
- render behavior
- send behavior
- run persistence
- `EVENT_LOG` writes

## What remains deferred

- no `EVENT_LOG` viewer
- no `TEMPLATES` viewer or editor
- no milestone 2 brand-agnostic work
- no additional read APIs beyond confirmed routes

## Exact dry-run steps

1. Go to `https://bbg-human-email-outreach-wiea.vercel.app`.
2. Sign in with an allowlisted operator account.
3. Open `Config` and verify readiness is not `blocked`.
4. Open `Health` and verify the signed health call returns state.
5. Open `Runs`.
6. Confirm the locked BBG Wave 2 values:
   - `wave2`
   - `segment_default`
   - `wave2_update`
   - `v1`
7. Create a run using the current recommended BBG Wave 2 pilot defaults.
8. Select the run detail.
9. Click `Preview`.
10. Review returned values:
   - `eligible_count`
   - `sample_contact_ids`
   - run `status`
11. Enter exact confirmation text:
   - `CONFIRM <run_code>`
12. Click `Confirm`.
13. Optionally test `Pause` and `Resume`.
14. Use `Kill` if the test run should be cleaned up.

## Exact review steps

After each action, review:
- response success in the UI
- run status in the runs table
- run status and timestamps in run detail
- counters in run detail:
  - `sent_count`
  - `error_count`
  - `skipped_count`
  - `reply_count`
  - `optout_count`
  - `bounce_count`

## Go / No-Go criteria

Go for controlled dry-run if:
- sign-in works
- readiness is not `blocked`
- health returns current state
- runs list and segments list return real data
- create, preview, confirm all succeed in `dry_run`
- pause, resume, and kill succeed when exercised

No-Go if:
- auth/session fails
- health fails
- routes return non-JSON or repeated authorization errors
- create, preview, or confirm fail in dry-run
- run state transitions do not match Apps Script behavior

## Important operating limits

- keep all testing in `dry_run = true`
- do not treat confirm as a full policy gate
- do not assume template or event-log inspection exists in the dashboard yet
- do not begin milestone 2 work yet
