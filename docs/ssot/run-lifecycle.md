# Run Lifecycle

Source of truth:
- `apps-script/google-apps-script/Code.js`

## Implemented run status lifecycle

```text
draft
  -> previewed
  -> confirmed
  -> running
  -> paused
  -> running
  -> completed
```

Other implemented paths:
- `confirmed -> paused`
- `draft|previewed|confirmed|running|paused -> killed`
- `running -> paused` on quota-low handling

Defined but not currently written by source:
- `failed`

## Operator flow

```text
Create -> Preview -> Confirm -> Triggered tick -> Running -> Pause/Resume/Kill or Complete
```

## Route-driven transitions

### `createRun_()`
- creates `draft`
- sets counters
- applies fail-safe default `dry_run = TRUE` when `DEFAULT_DRY_RUN` is on

### `previewRun_()`
- allowed from `draft` or `previewed`
- computes eligibility
- updates `eligible_count`
- sets status to `previewed`

### `confirmRun_()`
- allowed only from `previewed`
- requires exact `CONFIRM <run_code>`
- sets status to `confirmed`
- stamps `confirmed_at`
- ensures the time trigger exists

### `tickAllRuns()`
- if run is `confirmed`, first tick upgrades it to `running`
- stamps `started_at` if empty
- appends `run_started`

### `pauseRun_()`
- allowed from `running` or `confirmed`
- sets status to `paused`

### `resumeRun_()`
- allowed only from `paused`
- ensures trigger
- sets status to `running`

### `killRun_()`
- idempotent if already `killed` or `completed`
- otherwise sets status to `killed`
- stamps `ended_at`

## Completion behavior

Implemented completion reasons:
- `max_total_reached`
- `no_eligible`

Quota behavior:
- low Gmail quota pauses the run with reason `quota_low`
- current implementation uses `finalizeRunIfDone_('paused', 'quota_low')`, which also stamps `ended_at`

## Contact-level lifecycle

Per eligible contact, the implemented path is:

```text
ready -> queued -> sending -> sent
```

Other contact outcomes:
- `idempotent_skip`
- `error` when template lookup fails
- global exclusion prevents entry if replied, opted out, bounced, suppressed, Mailchimp-subscribed, or customer

Known implementation gap:
- on send exception, the row is not transitioned to `error` automatically

## Eligibility behavior

Preview and send both use the same eligibility logic:
- `contact_id` required
- global suppression flags block eligibility
- suppression/customer/Mailchimp lists block eligibility
- selected wave status must exist and equal `ready`
- include/exclude tags are honored

## Event log lifecycle markers

Run-level markers:
- `run_created`
- `run_previewed`
- `run_confirmed`
- `run_started`
- `run_paused`
- `run_resumed`
- `run_killed`
- `run_completed`

Contact/send markers:
- `queued`
- `dry_run_sent`
- `sent`
- `send_error`
- `send_exception`
- `idempotent_skip`
