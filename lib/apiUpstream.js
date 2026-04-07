function getUpstreamStatus(data) {
  if (data?.ok) return 200;
  if (typeof data?.status === "number" && data.status >= 400) return data.status;

  const summary = `${data?.error || ""} ${data?.message || ""}`.toLowerCase();

  if (summary.includes("forbidden")) return 403;
  if (summary.includes("unauthorized")) return 401;
  if (summary.includes("not_found")) return 404;
  if (summary.includes("method_not_allowed")) return 405;
  if (summary.includes("timeout")) return 504;
  return 502;
}

export function sendAppsScriptResult(res, data, context = {}) {
  if (data?.ok) {
    return res.status(200).json(data);
  }

  const status = getUpstreamStatus(data);
  console.error("apps_script_upstream_error", {
    ...context,
    status,
    error: data?.error || "upstream_unknown",
    message: data?.message || "",
    request_id: data?.request_id || "",
    route: data?.route || "",
    upstream_status: data?.status || null
  });

  return res.status(status).json(data || { ok: false, error: "upstream_unknown" });
}
