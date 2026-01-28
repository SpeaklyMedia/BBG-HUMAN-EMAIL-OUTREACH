import crypto from "crypto";

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function hmacHex(secret, message) {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function canonicalString({ path, timestamp, nonce, operator_email, request_id, body_hash }) {
  return [path, String(timestamp), nonce, operator_email, request_id, body_hash].join("\n");
}

function makeSignedEnvelope({ path, operator_email, payload }) {
  if (!process.env.WEBHOOK_SECRET) throw new Error("Missing WEBHOOK_SECRET");
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const request_id = crypto.randomBytes(16).toString("hex");
  const payloadJson = JSON.stringify(payload || {});
  const body_hash = sha256Hex(payloadJson);
  const canon = canonicalString({ path, timestamp, nonce, operator_email, request_id, body_hash });
  const signature = hmacHex(process.env.WEBHOOK_SECRET, canon);
  return { path, timestamp, nonce, operator_email, request_id, body_hash, payload, signature };
}

export async function callAppsScript({ path, operator_email, payload }) {
  if (!process.env.APPS_SCRIPT_WEBAPP_URL) throw new Error("Missing APPS_SCRIPT_WEBAPP_URL");
  const envelope = makeSignedEnvelope({ path, operator_email, payload });
  const res = await fetch(process.env.APPS_SCRIPT_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: "Non-JSON response from Apps Script", raw: text }; }
  if (!res.ok) return { ok: false, status: res.status, data };
  return data;
}
