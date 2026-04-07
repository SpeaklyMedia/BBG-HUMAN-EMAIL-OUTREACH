import { getAppsScriptWebAppUrl } from "./env";
import { makeSignedEnvelope } from "./signing";
import type { AppsScriptPath, AppsScriptResponse, AppsScriptSuccessResponse } from "./types";

export async function callAppsScript<TPayload, TSuccess extends AppsScriptSuccessResponse>(input: {
  path: AppsScriptPath;
  operator_email: string;
  payload: TPayload;
}): Promise<AppsScriptResponse<TSuccess>> {
  const envelope = makeSignedEnvelope(input);
  const response = await fetch(getAppsScriptWebAppUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(envelope)
  });

  const text = await response.text();

  try {
    return JSON.parse(text) as AppsScriptResponse<TSuccess>;
  } catch {
    return {
      ok: false,
      error: "non_json_response",
      raw: text,
      status: response.status
    };
  }
}
