import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, raw: text }; }
  return json;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    run_code: "RUN-001",
    wave_id: "wave2",
    segment_id: "segment_default",
    template_id: "wave2_update",
    template_version: "v1",
    max_recipients_total: 50,
    max_recipients_per_day: 25,
    send_window_start_local: "09:30",
    send_window_end_local: "16:30",
    min_delay_seconds: 45,
    max_delay_seconds: 120,
    bounce_stop_threshold: 0,
    dry_run: true
  });
  const [runId, setRunId] = useState("");
  const [log, setLog] = useState([]);

  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (!session) return <div style={{ padding: 24 }}>Not signed in.</div>;

  const pushLog = (label, data) => setLog((prev) => [...prev, { ts: new Date().toISOString(), label, data }]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Dashboard</h1>
        <div>
          <span style={{ marginRight: 12 }}>{session.user?.email}</span>
          <button onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      <h2>Create → Preview → Confirm (V1)</h2>
      <p>Note: Apps Script enforces dry-run by default even if the UI forgets.</p>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8, maxWidth: 700 }}>
        {Object.keys(form).map((k) => (
          <div key={k} style={{ display: "contents" }}>
            <label style={{ paddingTop: 6 }}>{k}</label>
            <input
              value={String(form[k])}
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, [k]: k.includes("max_") || k.endsWith("threshold") || k.endsWith("seconds") ? Number(v) : (k === "dry_run" ? v === "true" : v) }));
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button
          onClick={async () => {
            const resp = await postJson("/api/runs/create", form);
            pushLog("create", resp);
            if (resp?.ok) {
              const rid = resp?.run?.run_id || resp?.run_id || resp?.data?.run_id;
              if (rid) setRunId(rid);
            }
          }}
        >
          Create
        </button>
        <button
          onClick={async () => {
            const resp = await postJson("/api/runs/preview", { run_id: runId });
            pushLog("preview", resp);
          }}
          disabled={!runId}
        >
          Preview
        </button>
        <button
          onClick={async () => {
            const resp = await postJson("/api/runs/confirm", { run_id: runId, confirmation_text: `CONFIRM ${form.run_code}` });
            pushLog("confirm", resp);
          }}
          disabled={!runId}
        >
          Confirm
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Current run_id</h3>
        <code>{runId || "(none)"}</code>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Event log</h3>
        <pre style={{ background: "#111", color: "#eee", padding: 12, borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(log, null, 2)}
        </pre>
      </div>
    </div>
  );
}
