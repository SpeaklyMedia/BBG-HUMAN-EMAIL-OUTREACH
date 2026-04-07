# Go-Live Checklist

## Before live send

- Phase 0 SSOT approved
- Phase 1 control plane deployed
- Phase 2 guardrails enabled
- Apps Script route contract confirmed against real environment
- Wave 2 render QA passed
- Suppression freshness checks passed
- Export and event-log checks passed

## Config and auth

- Vercel env vars present and validated
- Apps Script script properties present and validated
- Admin allowlist correct
- Viewer allowlist correct
- `WEBHOOK_SECRET` rotated if provenance is uncertain

## Operational safety

- `KILL_SWITCH` state reviewed
- `DEFAULT_DRY_RUN` behavior confirmed
- Live-send control limited to admins
- Rollback and kill procedure documented

## Final verification

- Create test run
- Preview test run
- Confirm dry-run
- Inspect counters and `EVENT_LOG`
- Run export
- Only then arm live send if policy permits
