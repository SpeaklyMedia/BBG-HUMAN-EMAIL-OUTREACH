# Apps Script Client Contract

Source of truth:
- `apps-script/google-apps-script/Code.js`
- `lib/appsScriptClient.js`

## Principles

- Preserve the existing signed envelope exactly
- Type only confirmed contracts
- Keep Apps Script authoritative for workbook, eligibility, run persistence, rendering, and event logging
- Do not add Node-side business rules in the transport layer

## Confirmed route path set

Canonical paths for the Vercel client:

```ts
type AppsScriptPath =
  | "/health"
  | "/setup"
  | "/segments/list"
  | "/segments/upsert"
  | "/runs/list"
  | "/runs/create"
  | "/runs/preview"
  | "/runs/confirm"
  | "/runs/pause"
  | "/runs/resume"
  | "/runs/kill"
  | "/runs/export";
```

Legacy aliases exist in Apps Script for several run routes, but the Vercel client should continue using canonical slash-prefixed paths only.

## Transport types

```ts
type SignedEnvelope<TPayload> = {
  path: AppsScriptPath;
  timestamp: number;
  nonce: string;
  operator_email: string;
  request_id: string;
  body_hash: string;
  payload: TPayload;
  signature: string;
};

type AppsScriptErrorResponse = {
  ok: false;
  error: "exception" | "unknown_route";
  message?: string;
  route?: string;
};
```

## Confirmed payload types

```ts
type EmptyPayload = Record<string, never>;

type HealthPayload = Record<string, never>;

type SetupPayload = {
  run_id?: string;
  wave_id?: "wave1" | "wave2";
};

type RunLookupPayload = {
  run_id?: string;
  run_code?: string;
};

type CreateRunPayload = {
  run_code?: string;
  wave_id: "wave1" | "wave2";
  segment_id: string;
  template_id: string;
  template_version: string;
  max_recipients_total?: number;
  max_recipients_per_day?: number;
  send_window_start_local?: string;
  send_window_end_local?: string;
  min_delay_seconds?: number;
  max_delay_seconds?: number;
  bounce_stop_threshold?: number;
  dry_run?: boolean;
};

type ConfirmRunPayload = RunLookupPayload & {
  confirmation_text: string;
};

type UpsertSegmentPayload = {
  segment_id?: string;
  name: string;
  description?: string;
  filter_json: string | Record<string, unknown>;
  is_active?: boolean | "TRUE" | "FALSE";
};
```

## Confirmed response types

```ts
type RunRecord = {
  run_id: string;
  run_code: string;
  wave_id: "wave1" | "wave2";
  segment_id: string;
  template_id: string;
  template_version: string;
  status: string;
  created_by: string;
  created_at: string;
  confirmed_at: string;
  started_at: string;
  ended_at: string;
  max_recipients_total: string | number;
  max_recipients_per_day: string | number;
  send_window_start_local: string;
  send_window_end_local: string;
  min_delay_seconds: string | number;
  max_delay_seconds: string | number;
  bounce_stop_threshold: string | number;
  dry_run: "TRUE" | "FALSE" | boolean;
  eligible_count: string | number;
  sent_count: string | number;
  error_count: string | number;
  skipped_count: string | number;
  reply_count: string | number;
  optout_count: string | number;
  bounce_count: string | number;
};

type SegmentRecord = {
  segment_id: string;
  name: string;
  description: string;
  filter_json: string;
  created_at: string;
  updated_at: string;
  is_active: "TRUE" | "FALSE" | boolean;
};

type HealthResponse = {
  ok: true;
  now: string;
  kill_switch: boolean;
  default_dry_run: boolean;
  window: { start: string; end: string };
  cap: { date_key: string; cap_today: number; sent_today: number };
};

type ListSegmentsResponse = {
  ok: true;
  segments: SegmentRecord[];
};

type UpsertSegmentResponse = {
  ok: true;
  segment: SegmentRecord;
};

type ListRunsResponse = {
  ok: true;
  runs: RunRecord[];
};

type CreateRunResponse = {
  ok: true;
  run: RunRecord;
};

type PreviewRunResponse = {
  ok: true;
  run: RunRecord;
  eligible_count: number;
  sample_contact_ids: string[];
};

type ConfirmRunResponse = {
  ok: true;
  run: RunRecord;
};

type ExportRunResponse = {
  ok: true;
  csv: string;
};
```

## Current limitations that the client must respect

- there is no machine-readable error code field beyond `error` and freeform `message`
- there is no Apps Script route yet for `EVENT_LOG` reads
- there is no Apps Script route yet for `TEMPLATES` reads
- preview returns counts and sample contact IDs only, not rendered previews
- health is signed but not allowlist-gated

## First-slice recommendation

The first milestone 1 build slice can safely type:
- `health`
- `runs/list`
- `segments/list`
- existing write routes already in the dashboard proxy

It should not assume:
- template read APIs
- event log read APIs
- richer error taxonomies
