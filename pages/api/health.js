import { requireViewerOrAdmin } from "../../lib/apiAuth";
import { sendAppsScriptResult } from "../../lib/apiUpstream";
import { getHealth } from "../../services/health";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const session = await requireViewerOrAdmin(req, res);
  if (!session) return;

  try {
    const data = await getHealth(session.user.email);
    return sendAppsScriptResult(res, data, { path: "/api/health" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
}
