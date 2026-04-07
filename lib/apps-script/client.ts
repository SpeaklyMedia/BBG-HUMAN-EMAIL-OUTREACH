import { getAppsScriptWebAppUrl } from "./env";
import { makeSignedEnvelope } from "./signing";
import type { AppsScriptPath, AppsScriptResponse, AppsScriptSuccessResponse } from "./types";

const APPS_SCRIPT_TIMEOUT_MS = 15000;

export async function callAppsScript<TPayload, TSuccess extends AppsScriptSuccessResponse>(input: {
  path: AppsScriptPath;
  operator_email: string;
  payload: TPayload;
}): Promise<AppsScriptResponse<TSuccess>> {
  const envelope = makeSignedEnvelope(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(getAppsScriptWebAppUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "upstream_timeout",
        message: `Apps Script request timed out after ${APPS_SCRIPT_TIMEOUT_MS}ms`,
        status: 504,
        request_id: envelope.request_id
      };
    }

    return {
      ok: false,
      error: "upstream_fetch_failed",
      message: error instanceof Error ? error.message : String(error),
      status: 502,
      request_id: envelope.request_id
    };
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as AppsScriptResponse<TSuccess>;
    if (response.ok) {
      return parsed;
    }

    return {
      ...parsed,
      ok: false,
      status: response.status,
      raw: text,
      request_id: envelope.request_id
    };
  } catch {
    return {
      ok: false,
      error: "non_json_response",
      raw: text,
      status: response.status,
      request_id: envelope.request_id
    };
  }
}
