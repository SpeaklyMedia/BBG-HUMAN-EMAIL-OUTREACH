# Apps Script Security Review

Scope:
- `apps-script/google-apps-script/Code.js`
- `apps-script/google-apps-script/appsscript.json`

## Deployment posture

Confirmed:
- web app access is `ANYONE_ANONYMOUS`
- execution is `USER_DEPLOYING`
- only `doPost` is implemented

Implication:
- network exposure is public
- security relies on request verification and route authorization, not endpoint privacy

## Verification controls

### HMAC enforcement

Confirmed:
- `verifyRequestOrThrow_()` runs before route dispatch
- signature is required on every `doPost` request
- canonical string matches the Vercel client
- constant-time string comparison is used

Result:
- no route in `doPost` is reachable without a valid signature

### Timestamp and replay protection

Confirmed:
- timestamp must be within 5 minutes
- nonce is cached for 6 minutes
- replayed nonce throws `unauthorized:replay_nonce`

Residual risk:
- replay protection depends on `CacheService` availability and normal behavior

### Body-hash verification

Confirmed:
- every dispatched route recomputes `sha256(JSON.stringify(payload || {}))`
- body hash mismatch throws `unauthorized:bad_body_hash`

## Authorization boundaries

Admin-only routes:
- `setup`
- `segments/upsert`
- `runs/create`
- `runs/preview`
- `runs/confirm`
- `runs/pause`
- `runs/resume`
- `runs/kill`
- `runs/export`

Viewer-or-admin routes:
- `segments/list`
- `runs/list`

Signed-only route:
- `health`

Security note:
- `health` does not check `ADMIN_EMAILS` or `VIEWER_EMAILS`
- if `WEBHOOK_SECRET` is leaked, any caller can query health regardless of operator allowlist

## Reachability review

Can any route be reached without verification?
- No for `doPost` routes in current source

Can any route be reached without allowlist authz?
- Yes, `health`, but only with a valid signature and body hash

Is there a `doGet` bypass?
- No `doGet` exists in source

## Error-return review

Current pattern:
- catches exceptions and returns `{ ok: false, error: "exception", message: safeErr_(err) }`
- `safeErr_()` truncates to 300 characters

Good:
- does not dump stack traces
- does not log secrets directly in the response

Remaining concerns:
- internal error strings can still expose property names, route names, or schema mismatch details
- this is operationally useful but still reveals internals to any caller with a valid signature

## Data leakage review

Observed audit details that may carry sensitive operational data:
- preview sample contact IDs
- message tokens
- dry-run subject lines
- cap and pacing state

Observed protections:
- no raw email is written to `EVENT_LOG`
- no full email body is logged
- export omits email address

Remaining concerns:
- dry-run subject lines can include personalized data if template tokens are used
- `EVENT_LOG` should still be treated as sensitive

## Exact risks that remain

1. Secret compromise remains the highest-impact risk because the endpoint is public.
2. `health` is signed but not allowlist-gated.
3. Send exceptions can leave contact rows in `sending`.
4. Confirm is not a full policy gate; it does not validate template presence or suppression freshness.
5. Error messages still expose bounded internal detail to signed callers.

## Conclusion

The anonymous deployment is acceptable only because:
- HMAC is enforced before route handling
- timestamp and nonce replay checks are in place
- body hash is checked per route
- admin/viewer boundaries are enforced on all privileged routes

Milestone 1 can proceed safely if the control plane:
- keeps all Apps Script calls server-side
- treats `WEBHOOK_SECRET` as high-value
- surfaces the remaining policy gaps instead of assuming Apps Script already closes them
