# Policy And Guardrail Spec

This document now distinguishes between guards already enforced by Apps Script and guards that still belong in milestone 1 UI/policy work.

## Guards already enforced in Apps Script

Transport and auth:
- signed envelope required on every `doPost` route
- HMAC verification before route dispatch
- 5-minute timestamp freshness check
- nonce replay protection via `CacheService`
- `body_hash` recomputation per route
- admin/viewer checks on all non-health routes

Operational safety:
- `KILL_SWITCH` blocks tick sending
- `DEFAULT_DRY_RUN` forces dry run when enabled
- global send window enforced
- global daily cap enforced
- human pacing enforced
- one contact per tick
- idempotency key enforced per contact/wave/template/version/send

Eligibility:
- replied, opted-out, and bounced contacts are always blocked
- suppression, Mailchimp, and customer lists are enforced
- tag include/exclude logic is enforced

## Guards not actually enforced by Apps Script today

- confirm does not verify suppression freshness
- confirm does not verify preview hash consistency against unchanged inputs
- there is no second approval gate
- there is no complaint-rate calculation

## Implications for milestone 1

The milestone 1 control plane should add read-only or preflight policy checks for:
- config readiness
- template presence
- segment presence
- suppression freshness
- environment alias/deprecation warnings
- operational warnings for quota-low or stuck `sending` rows

It should not:
- duplicate Apps Script eligibility logic
- replace Apps Script state transitions
- expose live mutation of `KILL_SWITCH`

## BBG Wave 2 locks

Milestone 1 first slice must preserve:
- `wave_id = wave2`
- `segment_id = segment_default`
- `template_id = wave2_update`
- `template_version = v1`
- `Create -> Preview -> Confirm`
- `P1-P4` deterministic spin behavior
- fixed 3-link block

## Health-route note

`health` is currently:
- signed
- body-hash checked
- not allowlist-gated

Recommendation:
- expose it only through server-side dashboard code
- do not call it directly from the browser
