# BBG Wave 2 Delivery Roadmap

## Goal

Deliver BBG Wave 2 safely on top of the current Apps Script sender engine without breaking canonical structure.

## Locked invariants

- `wave_id = wave2`
- `template_id = wave2_update`
- `template_version = v1`
- `segment_id = segment_default`
- `Create -> Preview -> Confirm`
- `P1-P4` spin only
- Fixed 3-link block unchanged

## Deterministic sequence

### Step 1. Complete contract confirmation
- Confirm exact Apps Script route payloads and responses
- Confirm `TEMPLATES` workbook columns
- Confirm current Wave 2 spin/render source of truth

### Step 2. Build operator-safe control plane skeleton
- Replace stub dashboard with routed shell
- Preserve existing auth and proxy boundaries
- Add typed Apps Script client and service layer

### Step 3. Ship BBG Wave 2 operational screens
- Run list
- Run detail
- Segment list/edit
- Wave 2 template inspection
- Dry-run QA panel
- `EVENT_LOG` viewer
- Config validation

### Step 4. Add policy blockers
- Readiness checks
- Suppression freshness
- Admin-only live-send controls
- Approval gates

### Step 5. Run BBG Wave 2 QA
- Dry-run only first
- Render QA across `P1-P4`
- Export and event-log verification
- No live send until blockers pass

### Step 6. Controlled go-live
- Explicit admin go-live
- Kill switch governance remains outside dashboard
- Post-run audit review

## Exit criteria

BBG Wave 2 is complete when:
- Operators can create, preview, confirm, pause, resume, kill, inspect, and audit runs from Vercel
- Apps Script remains the only authority for send logic and audit writes
- Dry-run QA passes for Wave 2 templates
- Live send controls are gated, explicit, and admin-only
