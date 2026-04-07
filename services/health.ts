import { callAppsScript } from "../lib/apps-script/client";
import type { HealthResponse } from "../lib/apps-script/types";

export async function getHealth(operatorEmail: string) {
  return callAppsScript<Record<string, never>, HealthResponse>({
    path: "/health",
    operator_email: operatorEmail,
    payload: {}
  });
}
