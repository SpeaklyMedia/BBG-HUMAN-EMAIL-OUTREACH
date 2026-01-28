import { requireAdmin } from "../../../lib/apiAuth";
import { callAppsScript } from "../../../lib/appsScriptClient";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const run_id = req.query.run_id;
    const data = await callAppsScript({
      path: "/runs/export",
      operator_email: session.user.email,
      payload: { run_id }
    });
    if (!data?.ok) return res.status(200).json(data);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.status(200).send(data.csv || "");
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
