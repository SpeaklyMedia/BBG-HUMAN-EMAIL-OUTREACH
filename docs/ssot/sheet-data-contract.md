# Sheet And Data Contract

Source of truth:
- `apps-script/google-apps-script/Code.js`
- `reference/DATA_CONTRACT.md`

The Apps Script source confirms the workbook contract and closes the earlier `TEMPLATES` schema gap.

## Workbook tabs

Apps Script creates and verifies:
1. `CONTACTS`
2. `SEGMENTS`
3. `RUNS`
4. `EVENT_LOG`
5. `SUPPRESSION`
6. `MAILCHIMP_SUBSCRIBERS`
7. `CUSTOMERS`
8. `TEMPLATES`
9. `NONCE_CACHE`

## `CONTACTS`

Required columns:
- `contact_id`
- `email`
- `email_norm`
- `first_name`
- `last_name`
- `company`
- `title`
- `segment_tags`
- `source`
- `source_import_id`
- `created_at`
- `updated_at`
- `wave1_status`
- `wave1_run_id`
- `wave1_last_attempt_at`
- `wave1_sent_at`
- `wave1_message_token`
- `wave2_status`
- `wave2_run_id`
- `wave2_last_attempt_at`
- `wave2_sent_at`
- `wave2_message_token`
- `has_replied`
- `opted_out`
- `bounced`
- `suppressed_reason`
- `suppressed_at`
- `last_idempotency_key`
- `last_idempotency_key_at`

Observed operational use:
- eligibility requires `contact_id`
- eligibility for a given wave requires `<wave>_status = ready`
- send path sets `queued -> sending -> sent`
- on send exception, status may remain `sending`

## `SEGMENTS`

Required columns:
- `segment_id`
- `name`
- `description`
- `filter_json`
- `created_at`
- `updated_at`
- `is_active`

Observed `filter_json` use:
- `include_tags`
- `exclude_tags`
- `exclude_if_customer`
- `exclude_if_mailchimp_subscriber`

Specified in the original spec but not actually honored as configurable flags in source:
- `exclude_if_opted_out`
- `exclude_if_replied`
- `exclude_if_bounced`

Current behavior:
- opted-out, replied, and bounced contacts are always excluded globally

## `RUNS`

Required columns:
- `run_id`
- `run_code`
- `wave_id`
- `segment_id`
- `template_id`
- `template_version`
- `status`
- `created_by`
- `created_at`
- `confirmed_at`
- `started_at`
- `ended_at`
- `max_recipients_total`
- `max_recipients_per_day`
- `send_window_start_local`
- `send_window_end_local`
- `min_delay_seconds`
- `max_delay_seconds`
- `bounce_stop_threshold`
- `dry_run`
- `eligible_count`
- `sent_count`
- `error_count`
- `skipped_count`
- `reply_count`
- `optout_count`
- `bounce_count`

Observed status values in source:
- `draft`
- `previewed`
- `confirmed`
- `running`
- `paused`
- `killed`
- `completed`
- `failed`

Observed implementation note:
- `failed` exists in the enum but is not currently written by any handler

## `EVENT_LOG`

Required columns:
- `event_id`
- `ts`
- `run_id`
- `contact_id`
- `wave_id`
- `event_type`
- `result`
- `message`
- `details_json`

Observed behavior:
- append-only via `appendEvent_()`
- logging never throws
- some events include operational details like token, subject, cap data, or sample contact IDs

## `SUPPRESSION`, `MAILCHIMP_SUBSCRIBERS`, `CUSTOMERS`

Required columns:
- `email_norm`
- `imported_at`

Observed implementation note:
- runtime exclusion logic reads only the first column into a normalized set
- `imported_at` exists for UI freshness checks, not for Apps Script eligibility logic

## `TEMPLATES`

Confirmed minimal schema from source:
- `template_id`
- `template_version`
- `subject`
- `body`
- `created_at`
- `updated_at`
- `is_active`

Observed behavior:
- active template lookup requires exact `template_id` and `template_version`
- inactive rows are skipped if `is_active` is `false`
- returned template payload is only:
  - `subject`
  - `body`

No current template metadata columns for:
- brand
- wave
- approval state
- render preview cache

## Wave 2 render contract

Confirmed from source:
- subject spin token: `{{WAVE2_SPIN_SUBJECT}}`
- body spin token: `{{WAVE2_SPIN_BODY}}`
- normal token replacement supports:
  - `{{first_name}}`
  - `{{last_name}}`
  - `{{company}}`

Wave 2 fixed behavior:
- deterministic subject rotation across 5 subject variants
- deterministic body assembly from `P1`, `P2`, `P3`, `P4`
- fixed 3-link `P5` block
- closing signoff `P6`
- deterministic selection keyed by contact row index
