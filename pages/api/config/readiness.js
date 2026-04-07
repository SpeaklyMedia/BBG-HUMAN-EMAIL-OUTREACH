import { requireViewerOrAdmin } from "../../../lib/apiAuth";
import { getReadinessReport } from "../../../lib/config/readiness";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const session = await requireViewerOrAdmin(req, res);
  if (!session) return;

  try {
    const report = await getReadinessReport(session.user.email);
    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
}
