import { callAppsScript } from "../lib/apps-script/client";
import type {
  ConfirmRunPayload,
  ConfirmRunResponse,
  CreateRunPayload,
  CreateRunResponse,
  ExportRunResponse,
  ListRunsResponse,
  PauseResumeKillRunResponse,
  PreviewRunResponse,
  RunLookupPayload
} from "../lib/apps-script/types";

export async function listRuns(operatorEmail: string) {
  return callAppsScript<Record<string, never>, ListRunsResponse>({
    path: "/runs/list",
    operator_email: operatorEmail,
    payload: {}
  });
}

export async function createRun(operatorEmail: string, payload: CreateRunPayload) {
  return callAppsScript<CreateRunPayload, CreateRunResponse>({
    path: "/runs/create",
    operator_email: operatorEmail,
    payload
  });
}

export async function previewRun(operatorEmail: string, payload: RunLookupPayload) {
  return callAppsScript<RunLookupPayload, PreviewRunResponse>({
    path: "/runs/preview",
    operator_email: operatorEmail,
    payload
  });
}

export async function confirmRun(operatorEmail: string, payload: ConfirmRunPayload) {
  return callAppsScript<ConfirmRunPayload, ConfirmRunResponse>({
    path: "/runs/confirm",
    operator_email: operatorEmail,
    payload
  });
}

export async function pauseRun(operatorEmail: string, payload: RunLookupPayload) {
  return callAppsScript<RunLookupPayload, PauseResumeKillRunResponse>({
    path: "/runs/pause",
    operator_email: operatorEmail,
    payload
  });
}

export async function resumeRun(operatorEmail: string, payload: RunLookupPayload) {
  return callAppsScript<RunLookupPayload, PauseResumeKillRunResponse>({
    path: "/runs/resume",
    operator_email: operatorEmail,
    payload
  });
}

export async function killRun(operatorEmail: string, payload: RunLookupPayload) {
  return callAppsScript<RunLookupPayload, PauseResumeKillRunResponse>({
    path: "/runs/kill",
    operator_email: operatorEmail,
    payload
  });
}

export async function exportRun(operatorEmail: string, payload: RunLookupPayload) {
  return callAppsScript<RunLookupPayload, ExportRunResponse>({
    path: "/runs/export",
    operator_email: operatorEmail,
    payload
  });
}
