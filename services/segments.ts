import { callAppsScript } from "../lib/apps-script/client";
import type {
  ListSegmentsResponse,
  UpsertSegmentPayload,
  UpsertSegmentResponse
} from "../lib/apps-script/types";

export async function listSegments(operatorEmail: string) {
  return callAppsScript<Record<string, never>, ListSegmentsResponse>({
    path: "/segments/list",
    operator_email: operatorEmail,
    payload: {}
  });
}

export async function upsertSegment(operatorEmail: string, payload: UpsertSegmentPayload) {
  return callAppsScript<UpsertSegmentPayload, UpsertSegmentResponse>({
    path: "/segments/upsert",
    operator_email: operatorEmail,
    payload
  });
}
