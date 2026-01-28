import { requireViewerOrAdmin } from "../../../lib/apiAuth";
import { callAppsScript } from "../../../lib/appsScriptClient";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const session = await requireViewerOrAdmin(req, res);
  if (!session) return;

  try {
    const data = await callAppsScript({
      path: "/segments/list",
      operator_email: session.user.email,
      payload: {}
    });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
