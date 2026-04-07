# UI Screen Map

## Screen 1. Sign-in

Purpose:
- Google sign-in for allowlisted operators

Current baseline:
- Implemented as `pages/index.js`

Next version additions:
- Role badge
- Environment status summary
- Link to config validation

## Screen 2. Run list

Purpose:
- List all runs with status, wave, dry-run state, key counters, and last activity

Actions:
- Open detail
- Pause
- Resume
- Kill
- Export

## Screen 3. Run detail

Purpose:
- Canonical operator workspace for a selected run

Panels:
- Run metadata
- Lifecycle state
- Eligibility preview
- Send counters
- Policy blockers
- Recent event log

## Screen 4. Create run

Purpose:
- Create BBG Wave 2 run with locked defaults and explicit safety settings

Behavior:
- BBG Wave 2 defaults prefilled and partly locked
- Dry-run enabled by default
- Template and segment values constrained to current invariant path for BBG slice

## Screen 5. Segment list and editor

Purpose:
- View saved segments and edit `filter_json` safely

Behavior:
- Human-readable filter builder over raw JSON
- Preserve Apps Script ownership of persistence

## Screen 6. Wave 2 template inspection/editor

Purpose:
- Inspect current Wave 2 template artifacts and render variants

Behavior:
- Inspection mode first
- Edit mode only after template contract is confirmed
- Render-diff view for `P1-P4`
- Fixed 3-link block shown as locked

## Screen 7. Dry-run QA panel

Purpose:
- Central place to validate preview outputs before confirm

Checks:
- Eligibility count present
- Suppression freshness okay
- Template render passes
- No missing config

## Screen 8. EVENT_LOG viewer

Purpose:
- Audit recent events by run

Behavior:
- Read-only
- Redacted/minimized details

## Screen 9. Config validation

Purpose:
- Detect environment and deployment mismatches before operator action

Checks:
- Required env presence
- URL normalization
- Allowlist sanity
- Current safety mode expectations

## Screen 10. Admin go-live controls

Purpose:
- Restricted live-send arming surface

Behavior:
- Visible to admin only
- Blocked until all policy gates pass
- Never exposes kill-switch mutation if governance keeps that in Apps Script properties only
