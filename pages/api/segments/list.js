import { requireViewerOrAdmin } from "../../../lib/apiAuth";
import { sendAppsScriptResult } from "../../../lib/apiUpstream";
import { listSegments } from "../../../services/segments";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const session = await requireViewerOrAdmin(req, res);
  if (!session) return;

  try {
    const data = await listSegments(session.user.email);
    return sendAppsScriptResult(res, data, { path: "/api/segments/list" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
