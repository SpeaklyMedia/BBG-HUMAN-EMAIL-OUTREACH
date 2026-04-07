export type AppsScriptPath =
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

export type SignedEnvelope<TPayload> = {
  path: AppsScriptPath;
  timestamp: number;
  nonce: string;
  operator_email: string;
  request_id: string;
  body_hash: string;
  payload: TPayload;
  signature: string;
};

export type AppsScriptErrorResponse = {
  ok: false;
  error: string;
  message?: string;
  route?: string;
  status?: number;
  raw?: string;
  request_id?: string;
};

export type AppsScriptNonJsonError = {
  ok: false;
  error: "non_json_response";
  raw: string;
  status?: number;
};

export type HealthResponse = {
  ok: true;
  now: string;
  kill_switch: boolean;
  default_dry_run: boolean;
  window: {
    start: string;
    end: string;
  };
  cap: {
    date_key: string;
    cap_today: number;
    sent_today: number;
  };
};

export type RunRecord = {
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

export type SegmentRecord = {
  segment_id: string;
  name: string;
  description: string;
  filter_json: string;
  created_at: string;
  updated_at: string;
  is_active: "TRUE" | "FALSE" | boolean;
};

export type ListRunsResponse = {
  ok: true;
  runs: RunRecord[];
};

export type ListSegmentsResponse = {
  ok: true;
  segments: SegmentRecord[];
};

export type CreateRunPayload = {
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

export type RunLookupPayload = {
  run_id?: string;
  run_code?: string;
};

export type ConfirmRunPayload = RunLookupPayload & {
  confirmation_text: string;
};

export type UpsertSegmentPayload = {
  segment_id?: string;
  name: string;
  description?: string;
  filter_json: string | Record<string, unknown>;
  is_active?: boolean | "TRUE" | "FALSE";
};

export type CreateRunResponse = {
  ok: true;
  run: RunRecord;
};

export type PreviewRunResponse = {
  ok: true;
  run: RunRecord;
  eligible_count: number;
  sample_contact_ids: string[];
};

export type ConfirmRunResponse = {
  ok: true;
  run: RunRecord;
};

export type PauseResumeKillRunResponse = {
  ok: true;
  run: RunRecord;
};

export type UpsertSegmentResponse = {
  ok: true;
  segment: SegmentRecord;
};

export type ExportRunResponse = {
  ok: true;
  csv: string;
};

export type AppsScriptSuccessResponse =
  | HealthResponse
  | ListRunsResponse
  | ListSegmentsResponse
  | CreateRunResponse
  | PreviewRunResponse
  | ConfirmRunResponse
  | PauseResumeKillRunResponse
  | UpsertSegmentResponse
  | ExportRunResponse
  | { ok: true };

export type AppsScriptResponse<TSuccess extends AppsScriptSuccessResponse> =
  | TSuccess
  | AppsScriptErrorResponse
  | AppsScriptNonJsonError;
