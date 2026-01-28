export function parseAllowlist(envValue) {
  if (!envValue) return new Set();
  return new Set(
    envValue
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdmin(email) {
  const admins = parseAllowlist(process.env.ADMIN_EMAILS);
  return admins.has((email || "").toLowerCase());
}

export function isViewer(email) {
  const viewers = parseAllowlist(process.env.VIEWER_EMAILS);
  return viewers.has((email || "").toLowerCase());
}

export function isAllowed(email) {
  return isAdmin(email) || isViewer(email);
}
