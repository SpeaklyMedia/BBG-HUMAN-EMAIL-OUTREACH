import crypto from "crypto";
import type { AppsScriptPath, SignedEnvelope } from "./types";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function hmacHex(secret: string, message: string) {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function canonicalString(parts: {
  path: AppsScriptPath;
  timestamp: number;
  nonce: string;
  operator_email: string;
  request_id: string;
  body_hash: string;
}) {
  return [
    parts.path,
    String(parts.timestamp),
    parts.nonce,
    parts.operator_email,
    parts.request_id,
    parts.body_hash
  ].join("\n");
}

export function makeSignedEnvelope<TPayload>(input: {
  path: AppsScriptPath;
  operator_email: string;
  payload: TPayload;
}): SignedEnvelope<TPayload> {
  if (!process.env.WEBHOOK_SECRET) {
    throw new Error("Missing WEBHOOK_SECRET");
  }

  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const request_id = crypto.randomBytes(16).toString("hex");
  const payloadJson = JSON.stringify(input.payload || {});
  const body_hash = sha256Hex(payloadJson);
  const operator_email = (input.operator_email || "").toLowerCase().trim();
  const signature = hmacHex(
    process.env.WEBHOOK_SECRET,
    canonicalString({
      path: input.path,
      timestamp,
      nonce,
      operator_email,
      request_id,
      body_hash
    })
  );

  return {
    path: input.path,
    timestamp,
    nonce,
    operator_email,
    request_id,
    body_hash,
    payload: input.payload,
    signature
  };
}
