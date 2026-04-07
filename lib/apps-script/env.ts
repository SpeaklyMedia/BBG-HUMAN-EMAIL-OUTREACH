export type AppsScriptUrlSource = "canonical" | "alias";

export function getAppsScriptWebAppUrl() {
  const canonical = process.env.APPS_SCRIPT_WEBAPP_URL;
  const alias = process.env.APPS_SCRIPT_WEB_APP_URL;
  const value = canonical || alias;

  if (!value) {
    throw new Error(
      "Missing APPS_SCRIPT_WEBAPP_URL (temporary alias supported: APPS_SCRIPT_WEB_APP_URL)"
    );
  }

  return value;
}

export function getAppsScriptWebAppUrlSource(): AppsScriptUrlSource {
  if (process.env.APPS_SCRIPT_WEBAPP_URL) return "canonical";
  if (process.env.APPS_SCRIPT_WEB_APP_URL) return "alias";
  throw new Error(
    "Missing APPS_SCRIPT_WEBAPP_URL (temporary alias supported: APPS_SCRIPT_WEB_APP_URL)"
  );
}
