# Verification Matrix

Status legend:
- `Implemented`: verified directly in shipped source
- `Specified`: documented in bundle docs but not fully exercised in source here
- `Inferred`: still provisional after source review

## Matrix

| Area | Item | Status | Evidence source | Current confidence | Blocker / dependency |
| --- | --- | --- | --- | --- | --- |
| Apps Script routes | `health` and `setup` routes exist in Apps Script | Implemented | `apps-script/google-apps-script/Code.js` | High | Dashboard proxy not yet exposing them |
| Apps Script routes | `runs/*`, `segments/list`, `segments/upsert`, `runs/export` exist in Apps Script | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Apps Script routes | Legacy aliases like `createRun` and `previewRun` are accepted | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Request contract confidence | Signed envelope fields and canonical string are identical between Vercel and Apps Script | Implemented | `lib/appsScriptClient.js`, `apps-script/google-apps-script/Code.js` | High | None |
| Response contract confidence | `preview` returns `run`, `eligible_count`, and `sample_contact_ids` | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Response contract confidence | Error responses use `{ ok: false, error, message? }` rather than a typed code taxonomy | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Sheet/tab contracts | Workbook tab set including `NONCE_CACHE` is created and schema-checked by Apps Script | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Sheet/tab contracts | `CONTACTS`, `SEGMENTS`, `RUNS`, `EVENT_LOG` header sets are enforced by Apps Script | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Sheet/tab contracts | `TEMPLATES` minimal schema is `template_id`, `template_version`, `subject`, `body`, `created_at`, `updated_at`, `is_active` | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Template/version assumptions | Wave 2 subject/body spin rendering is implemented in Apps Script | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Template/version assumptions | `P1-P4` deterministic composition and fixed 3-link block are implemented | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Env vars / properties | `SPREADSHEET_ID`, `WEBHOOK_SECRET`, `ADMIN_EMAILS`, `VIEWER_EMAILS`, `TIMEZONE`, `KILL_SWITCH`, `DEFAULT_DRY_RUN` are real Apps Script properties in use | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Env vars / properties | daily cap, pacing, and window properties are real Apps Script properties in use | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Env vars | `APPS_SCRIPT_WEBAPP_URL` is canonical in Vercel and `APPS_SCRIPT_WEB_APP_URL` is temporary alias | Implemented | `lib/env.js`, `lib/appsScriptClient.js` | High | Remove alias after migration |
| Auth/session behavior | Dashboard sign-in is allowlist-gated by NextAuth | Implemented | `pages/api/auth/[...nextauth].js`, `lib/rbac.js` | High | None |
| Auth/session behavior | Apps Script admin/viewer boundaries are enforced on all non-health routes | Implemented | `apps-script/google-apps-script/Code.js` | High | Health remains signed-only |
| Dashboard UI assumptions | Current dashboard is still a stub control harness | Implemented | `pages/index.js`, `pages/dashboard.js` | High | Phase 1 UI work |
| Dashboard UI assumptions | There is still no dashboard or Apps Script read route for `EVENT_LOG` viewing | Implemented | `pages/**/*`, `apps-script/google-apps-script/Code.js` | High | Requires new route or separate read layer |
| Dashboard UI assumptions | There is still no dashboard or Apps Script read route for template inspection | Implemented | `pages/**/*`, `apps-script/google-apps-script/Code.js` | High | Requires new route or separate read layer |
| Wave 2 invariants | UI defaults are `wave2`, `segment_default`, `wave2_update`, `v1` | Implemented | `pages/dashboard.js` | High | None |
| Wave 2 invariants | Apps Script renders Wave 2 spins when template body/subject includes spin tokens | Implemented | `apps-script/google-apps-script/Code.js` | High | Template row still must contain those tokens |
| Run lifecycle | `draft -> previewed -> confirmed -> running -> paused/resumed -> completed/killed` is implemented | Implemented | `apps-script/google-apps-script/Code.js` | High | `failed` is defined but not currently written |
| EVENT_LOG writes | Run, segment, tick, quota, pacing, and send events append to `EVENT_LOG` | Implemented | `apps-script/google-apps-script/Code.js` | High | No read API yet |
| Policy assumptions | Preview enforces suppression/customer/Mailchimp eligibility | Implemented | `apps-script/google-apps-script/Code.js` | High | None |
| Policy assumptions | Confirm enforces template existence or suppression freshness | Inferred | source shows it does not | High | Must be added in future policy layer if required |
| Policy assumptions | `exclude_if_opted_out`, `exclude_if_replied`, `exclude_if_bounced` are configurable segment flags | Specified | `reference/DATA_CONTRACT.md` | High | Source currently hardcodes these exclusions globally |

## Remaining unknowns

- real workbook contents in the target sheet
- deployed Script Properties values in production
- whether additional unpublished Apps Script files exist outside this clone
- whether operators rely on manual sheet conventions beyond this source

## Safe conclusion

Milestone 1 first slice can begin against confirmed transport, run, segment, health, and workbook contracts.

The first slice should still avoid:
- template editing
- event-log read APIs unless newly added
- assuming richer error types than current source provides
