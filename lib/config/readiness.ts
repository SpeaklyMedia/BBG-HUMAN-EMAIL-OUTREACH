import { callAppsScript } from "../apps-script/client";
import { getAppsScriptWebAppUrlSource } from "../apps-script/env";
import type { HealthResponse } from "../apps-script/types";

type EnvCheck = {
  name: string;
  present: boolean;
  required?: boolean;
  source?: "canonical" | "alias";
  deprecated?: boolean;
};

export type ReadinessReport = {
  readiness: "ready" | "degraded" | "blocked";
  env: {
    checks: EnvCheck[];
    missing: string[];
    alias_in_use: boolean;
  };
  health: {
    checked: boolean;
    ok: boolean;
    state?: HealthResponse;
    error?: string;
  };
  warnings: string[];
};

function checkEnv(name: string, required = true): EnvCheck {
  return {
    name,
    present: Boolean(process.env[name]),
    required
  };
}

function getEnvChecks(): EnvCheck[] {
  const checks: EnvCheck[] = [
    checkEnv("GOOGLE_CLIENT_ID"),
    checkEnv("GOOGLE_CLIENT_SECRET"),
    checkEnv("NEXTAUTH_SECRET"),
    checkEnv("ADMIN_EMAILS"),
    checkEnv("VIEWER_EMAILS", false),
    checkEnv("WEBHOOK_SECRET")
  ];

  const hasCanonical = Boolean(process.env.APPS_SCRIPT_WEBAPP_URL);
  const hasAlias = Boolean(process.env.APPS_SCRIPT_WEB_APP_URL);

  checks.push({
    name: "APPS_SCRIPT_WEBAPP_URL",
    present: hasCanonical || hasAlias,
    source: hasCanonical ? "canonical" : hasAlias ? "alias" : undefined,
    deprecated: !hasCanonical && hasAlias
  });

  return checks;
}

export async function getReadinessReport(operatorEmail: string): Promise<ReadinessReport> {
  const checks = getEnvChecks();
  const missing = checks
    .filter((check) => check.required !== false && !check.present)
    .map((check) => check.name);
  const warnings: string[] = [];
  const aliasInUse =
    !process.env.APPS_SCRIPT_WEBAPP_URL && Boolean(process.env.APPS_SCRIPT_WEB_APP_URL);

  if (aliasInUse) {
    warnings.push("Deprecated alias APPS_SCRIPT_WEB_APP_URL is in use.");
  }

  if (!process.env.VIEWER_EMAILS) {
    warnings.push("VIEWER_EMAILS is unset. Admin-only access is active.");
  }

  let health: ReadinessReport["health"] = {
    checked: false,
    ok: false
  };

  const canCheckHealth =
    missing.length === 0 &&
    Boolean(process.env.ADMIN_EMAILS) &&
    Boolean(process.env.WEBHOOK_SECRET);

  if (canCheckHealth) {
    try {
      const result = await callAppsScript<Record<string, never>, HealthResponse>({
        path: "/health",
        operator_email: operatorEmail,
        payload: {}
      });

      if (result.ok) {
        health = {
          checked: true,
          ok: true,
          state: result
        };
      } else {
        const errorText =
          "message" in result
            ? result.message || result.error
            : "error" in result
              ? result.error
              : "Unknown health error";
        health = {
          checked: true,
          ok: false,
          error: errorText
        };
        warnings.push("Signed health check failed.");
      }
    } catch (error) {
      health = {
        checked: true,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
      warnings.push("Signed health check threw an exception.");
    }
  } else {
    warnings.push("Signed health check skipped because required server env is incomplete.");
  }

  let readiness: ReadinessReport["readiness"] = "ready";
  if (missing.length > 0) {
    readiness = "blocked";
  } else if (aliasInUse || !health.ok) {
    readiness = "degraded";
  }

  if (!health.checked && readiness === "ready") {
    readiness = "degraded";
  }

  try {
    const source = getAppsScriptWebAppUrlSource();
    if (source === "alias" && !warnings.includes("Deprecated alias APPS_SCRIPT_WEB_APP_URL is in use.")) {
      warnings.push("Deprecated alias APPS_SCRIPT_WEB_APP_URL is in use.");
    }
  } catch {
    // Already captured by missing env checks.
  }

  return {
    readiness,
    env: {
      checks,
      missing,
      alias_in_use: aliasInUse
    },
    health,
    warnings
  };
}
