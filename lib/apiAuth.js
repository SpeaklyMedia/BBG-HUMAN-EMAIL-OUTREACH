import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { isAdmin, isViewer } from "./rbac";

export async function requireSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return null;
  }
  return session;
}

export async function requireAdmin(req, res) {
  const session = await requireSession(req, res);
  if (!session) return null;
  if (!isAdmin(session.user.email)) {
    res.status(403).json({ ok: false, error: "forbidden" });
    return null;
  }
  return session;
}

export async function requireViewerOrAdmin(req, res) {
  const session = await requireSession(req, res);
  if (!session) return null;
  const email = session.user.email;
  if (!(isAdmin(email) || isViewer(email))) {
    res.status(403).json({ ok: false, error: "forbidden" });
    return null;
  }
  return session;
}
