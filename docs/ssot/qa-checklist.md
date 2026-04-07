# QA Checklist

## Contract QA

- Confirm every Apps Script route exists and returns documented JSON or CSV shapes
- Confirm exact `TEMPLATES` columns and Wave 2 source data
- Confirm confirmation-token behavior
- Confirm error code taxonomy

## Auth and security QA

- Google sign-in works for allowlisted users only
- Viewer cannot access admin routes
- Browser never receives `WEBHOOK_SECRET`
- Signature, nonce, and timestamp handling are verified end-to-end

## BBG Wave 2 QA

- `wave_id` locked to `wave2`
- `template_id` locked to `wave2_update`
- `template_version` locked to `v1`
- `segment_id` locked to `segment_default`
- `Create -> Preview -> Confirm` remains canonical
- Render QA passes for `P1-P4`
- Fixed 3-link block unchanged

## Dry-run QA

- New runs default to dry-run
- Preview results appear before confirm
- Live confirm is blocked when readiness checks fail
- Pause, resume, and kill update run state correctly

## Observability QA

- Run list counters match Apps Script/Sheet state
- Event log viewer matches `EVENT_LOG`
- Export returns expected CSV and remains admin-only

## Config QA

- Required env vars detected correctly
- `APPS_SCRIPT_WEBAPP_URL` normalized correctly
- Allowlist parsing behaves as expected
- Missing env vars surface actionable errors
