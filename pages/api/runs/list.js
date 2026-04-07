import { requireViewerOrAdmin } from "../../../lib/apiAuth";
import { listRuns } from "../../../services/runs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const session = await requireViewerOrAdmin(req, res);
  if (!session) return;

  try {
    const data = await listRuns(session.user.email);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
