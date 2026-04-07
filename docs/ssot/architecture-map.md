# Architecture Map

## Target shape to preserve

`Operator -> NextAuth-protected Vercel dashboard -> Next.js API routes -> HMAC-signed Apps Script Web App -> Google Sheet workbook -> append-only EVENT_LOG`

## Authoritative ownership

Apps Script remains authoritative for:
- Workbook setup
- Schema enforcement
- Segment persistence
- Run persistence
- Preview eligibility
- Confirm logic
- Run status updates
- `EVENT_LOG` writes
- Current Wave 2 spin rendering
- Current tick sender

Vercel control plane owns:
- Operator authentication and session handling
- RBAC gating
- Safe operator UX around create, preview, confirm, pause, resume, kill, and export
- Read-only observability views
- Validation, readiness checks, and policy gates before privileged actions

Google Sheet workbook owns:
- Canonical operational data for contacts, segments, runs, templates, suppression, and audit rows

## Current implemented dashboard surface

Implemented in `vercel-dashboard`:
- NextAuth Google sign-in
- Allowlist RBAC (`ADMIN_EMAILS`, `VIEWER_EMAILS`)
- Server-only Apps Script proxy routes
- HMAC envelope signing
- Stub dashboard with `Create -> Preview -> Confirm`

Not yet implemented in the dashboard snapshot:
- Typed service layer
- Run detail UI
- Segment editor UI
- Template inspection/editor UI
- `EVENT_LOG` viewer
- Config validation screen
- Policy blockers and readiness checks

## Runtime boundaries

Boundary 1: Browser to Vercel
- Browser never receives `WEBHOOK_SECRET`
- Browser calls same-origin Next.js API routes only

Boundary 2: Vercel to Apps Script
- Signed POST body envelope
- Public or semi-public Apps Script endpoint assumed
- Security depends on HMAC, timestamp, nonce, allowlists, and route validation

Boundary 3: Apps Script to Sheets
- Apps Script is the only write authority for run state and audit writes
- Future Node-side read/reporting can be added before any write expansion

## Current route inventory in dashboard

Implemented proxy routes:
- `/api/runs/create`
- `/api/runs/preview`
- `/api/runs/confirm`
- `/api/runs/list`
- `/api/runs/pause`
- `/api/runs/resume`
- `/api/runs/kill`
- `/api/segments/list`
- `/api/segments/upsert`
- `/api/exports/run`

Mapped Apps Script paths:
- `/runs/create`
- `/runs/preview`
- `/runs/confirm`
- `/runs/list`
- `/runs/pause`
- `/runs/resume`
- `/runs/kill`
- `/segments/list`
- `/segments/upsert`
- `/runs/export`

## Current Wave 2 invariants already present in UI

Implemented in `pages/dashboard.js`:
- `wave_id = wave2`
- `segment_id = segment_default`
- `template_id = wave2_update`
- `template_version = v1`
- Canonical operator flow is `Create -> Preview -> Confirm`

Specified but not directly enforced in dashboard code yet:
- `P1-P4` spin only
- Fixed 3-link block unchanged

## Phase 0 hostname and naming inconsistencies

Observed inconsistencies that should be normalized before Phase 1:
- Top-level workspace folder uses `BBH`, while bundle/product naming uses `BBG`
- `docs/CONFIG.md` uses `APPS_SCRIPT_WEBAPP_URL`
- `docs/BUILD_PROOFS.md` uses `APPS_SCRIPT_WEB_APP_URL`
- Product naming alternates between `BBG Human Outreach`, `Human Email Outreach`, and `V1 Dashboard (Stub UI)`

Decision:
- Keep product milestone names explicit: `BBG Wave 2` and later `Brand-Agnostic Wizard`
- Normalize env var spelling to `APPS_SCRIPT_WEBAPP_URL`
- Use `Human Email Outreach Hybrid` as the system name in SSOT docs, with `BBG` called out as the current brand instance
