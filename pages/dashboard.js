import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import ModelSwitcher from "../src/components/ModelSwitcher";

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

  if (status === "loading") {
    return (
      <div className="page-shell">
        <div className="container-main">Loading...</div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="page-shell">
        <div className="container-main">Not signed in.</div>
      </div>
    );
  }

  const pushLog = (label, data) => setLog((prev) => [...prev, { ts: new Date().toISOString(), label, data }]);

  return (
    <div className="page-shell">
      <div className="container-main stack">
        <div className="card">
          <div className="card-body stack">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="stack">
                <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-600">Create → Preview → Confirm (V1)</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {session.user?.email}
                </span>
                <button className="btn" onClick={() => signOut()}>Sign out</button>
              </div>
            </div>

            <ModelSwitcher />

            <p className="text-sm text-slate-600">Note: Apps Script enforces dry-run by default even if the UI forgets.</p>

            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              {Object.keys(form).map((k) => (
                <div key={k} className="md:contents">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:pt-2">{k}</label>
                  <input
                    className="input"
                    value={String(form[k])}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, [k]: k.includes("max_") || k.endsWith("threshold") || k.endsWith("seconds") ? Number(v) : (k === "dry_run" ? v === "true" : v) }));
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="btn btn-primary"
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
                className="btn"
                onClick={async () => {
                  const resp = await postJson("/api/runs/preview", { run_id: runId });
                  pushLog("preview", resp);
                }}
                disabled={!runId}
              >
                Preview
              </button>
              <button
                className="btn"
                onClick={async () => {
                  const resp = await postJson("/api/runs/confirm", { run_id: runId, confirmation_text: `CONFIRM ${form.run_code}` });
                  pushLog("confirm", resp);
                }}
                disabled={!runId}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="card">
            <div className="card-body stack">
              <h3 className="text-sm font-semibold text-slate-700">Current run_id</h3>
              <code className="block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{runId || "(none)"}</code>
            </div>
          </div>
          <div className="card">
            <div className="card-body stack">
              <h3 className="text-sm font-semibold text-slate-700">Event log</h3>
              <pre className="max-h-96 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
