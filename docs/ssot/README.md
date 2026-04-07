# Human Email Outreach Hybrid SSOT

This folder is the authoritative Phase 0 document set for the next version of the Human Email Outreach system.

Scope:
- Preserve the current hybrid architecture.
- Keep Google Apps Script authoritative for send-engine logic.
- Deliver a Vercel-hosted control plane that wraps the existing Apps Script safely.
- Prioritize BBG Wave 2 delivery before brand-agnostic expansion.

Current authoritative runtime path:
- Vercel dashboard/control plane
- HMAC-signed server-to-server request
- Google Apps Script Web App
- Google Sheet workbook + append-only `EVENT_LOG`

Document index:
1. `architecture-map.md`
2. `route-contract.md`
3. `sheet-data-contract.md`
4. `env-config-matrix.md`
5. `run-lifecycle.md`
6. `risk-register.md`
7. `roadmap-bbg-wave2.md`
8. `roadmap-brand-agnostic-wizard.md`
9. `apps-script-client-contract.md`
10. `typescript-service-layer-plan.md`
11. `ui-screen-map.md`
12. `policy-guardrail-spec.md`
13. `implementation-phases.md`
14. `qa-checklist.md`
15. `go-live-checklist.md`
16. `recommended-first-build-slice.md`
17. `verification-matrix.md`
18. `apps-script-source-audit.md`
19. `apps-script-security-review.md`
20. `sidecar-interface-crosswalk.md`

Source basis:
- `reference/SYSTEM_SPEC.md`
- `reference/DATA_CONTRACT.md`
- `reference/SECURITY_QA_SCAN.md`
- `docs/CONFIG.md`
- `docs/DEPLOY_VERCEL.md`
- `apps-script/google-apps-script/Code.js`
- `apps-script/google-apps-script/appsscript.json`
- `vercel-dashboard/lib/appsScriptClient.js`
- `vercel-dashboard/lib/apiAuth.js`
- `vercel-dashboard/lib/rbac.js`
- `vercel-dashboard/pages/api/**/*`
- `vercel-dashboard/pages/dashboard.js`

Evidence levels:
- `Implemented`: verified directly in shipped code.
- `Specified`: documented in the bundle spec but not directly implemented in this repo snapshot.
- `Inferred`: derived from naming, UI usage, or bundle intent and must be confirmed against the Apps Script codebase before Phase 1 write-path expansion.
