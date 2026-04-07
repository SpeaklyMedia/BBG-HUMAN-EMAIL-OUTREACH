import crypto from "crypto";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL || process.env.APPS_SCRIPT_WEB_APP_URL;

const ALLOWED_ROUTES = new Set([
  "/health",
  "/runs/list",
  "/segments/list",
  "/runs/create",
  "/runs/preview",
  "/runs/confirm",
  "/runs/pause",
  "/runs/resume",
  "/runs/kill"
]);

const BBG_WAVE2_DEFAULTS = {
  wave_id: "wave2",
  segment_id: "segment_default",
  template_id: "wave2_update",
  template_version: "v1",
  max_recipients_total: 50,
  max_recipients_per_day: 25,
  send_window_start_local: "04:45",
  send_window_end_local: "23:30",
  min_delay_seconds: 180,
  max_delay_seconds: 360,
  bounce_stop_threshold: 0,
  dry_run: true
};

function getOperatorEmail() {
  if (process.env.SMOKE_OPERATOR_EMAIL) {
    return process.env.SMOKE_OPERATOR_EMAIL.toLowerCase().trim();
  }

  const fromAdmins = (process.env.ADMIN_EMAILS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)[0];

  if (!fromAdmins) {
    throw new Error("Missing SMOKE_OPERATOR_EMAIL or ADMIN_EMAILS");
  }

  return fromAdmins;
}

function getWebhookSecret() {
  if (!process.env.WEBHOOK_SECRET) {
    throw new Error("Missing WEBHOOK_SECRET");
  }

  return process.env.WEBHOOK_SECRET;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmacHex(secret, value) {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function buildEnvelope(path, operatorEmail, payload) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const request_id = crypto.randomBytes(16).toString("hex");
  const payloadJson = JSON.stringify(payload || {});
  const body_hash = sha256Hex(payloadJson);
  const canonical = [
    path,
    String(timestamp),
    nonce,
    operatorEmail,
    request_id,
    body_hash
  ].join("\n");

  return {
    path,
    timestamp,
    nonce,
    operator_email: operatorEmail,
    request_id,
    body_hash,
    payload,
    signature: hmacHex(getWebhookSecret(), canonical)
  };
}

async function callRoute(path, payload = {}) {
  if (!ALLOWED_ROUTES.has(path)) {
    throw new Error(`Unsupported route: ${path}`);
  }
  if (!APPS_SCRIPT_URL) {
    throw new Error("Missing APPS_SCRIPT_WEBAPP_URL or APPS_SCRIPT_WEB_APP_URL");
  }

  const operatorEmail = getOperatorEmail();
  const envelope = buildEnvelope(path, operatorEmail, payload);
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(envelope),
    redirect: "follow"
  });

  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = {
      ok: false,
      error: "non_json_response",
      raw: text
    };
  }

  return {
    http_status: response.status,
    route: path,
    ok: body?.ok === true,
    body
  };
}

async function runDryRunSequence() {
  const runCode = `SMOKE-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const created = await callRoute("/runs/create", {
    ...BBG_WAVE2_DEFAULTS,
    run_code: runCode
  });

  if (!created.ok) return { step: "create", created };

  const runId = created.body?.run?.run_id;

  const previewed = await callRoute("/runs/preview", { run_id: runId });
  if (!previewed.ok) return { step: "preview", created, previewed };

  const confirmed = await callRoute("/runs/confirm", {
    run_id: runId,
    confirmation_text: `CONFIRM ${created.body.run.run_code}`
  });
  if (!confirmed.ok) return { step: "confirm", created, previewed, confirmed };

  const paused = await callRoute("/runs/pause", { run_id: runId });
  const resumed = await callRoute("/runs/resume", { run_id: runId });
  const killed = await callRoute("/runs/kill", { run_id: runId });

  return {
    step: "complete",
    created,
    previewed,
    confirmed,
    paused,
    resumed,
    killed
  };
}

function printUsage() {
  console.log(`BBG Wave 2 Apps Script smoke harness

Resolved Apps Script URL: ${APPS_SCRIPT_URL || "(missing)"}

Usage:
  npm run smoke:apps-script -- health
  npm run smoke:apps-script -- runs:list
  npm run smoke:apps-script -- segments:list
  npm run smoke:apps-script -- dry-run-sequence

Required env:
  WEBHOOK_SECRET
  SMOKE_OPERATOR_EMAIL or ADMIN_EMAILS
  APPS_SCRIPT_WEBAPP_URL or APPS_SCRIPT_WEB_APP_URL

Optional env:
  none
`);
}

async function main() {
  const command = process.argv[2];

  if (!command || command === "--help" || command === "help") {
    printUsage();
    process.exit(0);
  }

  let result;

  if (command === "health") {
    result = await callRoute("/health", {});
  } else if (command === "runs:list") {
    result = await callRoute("/runs/list", {});
  } else if (command === "segments:list") {
    result = await callRoute("/segments/list", {});
  } else if (command === "dry-run-sequence") {
    result = await runDryRunSequence();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
