import { requireAdmin } from "../../../lib/apiAuth";
import { sendAppsScriptResult } from "../../../lib/apiUpstream";
import { pauseRun } from "../../../services/runs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const data = await pauseRun(session.user.email, req.body || {});
    return sendAppsScriptResult(res, data, { path: "/api/runs/pause" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
