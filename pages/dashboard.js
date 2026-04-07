import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

const BBG_WAVE2_DEFAULTS = {
  wave_id: "wave2",
  segment_id: "segment_default",
  template_id: "wave2_update",
  template_version: "v1",
  workflow: "Create -> Preview -> Confirm"
};

const TABS = [
  { id: "health", label: "Health" },
  { id: "runs", label: "Runs" },
  { id: "segments", label: "Segments" },
  { id: "config", label: "Config" }
];

const INITIAL_CREATE_FORM = {
  run_code: "",
  max_recipients_total: 50,
  max_recipients_per_day: 25,
  send_window_start_local: "04:45",
  send_window_end_local: "23:30",
  min_delay_seconds: 180,
  max_delay_seconds: 360,
  bounce_stop_threshold: 0,
  dry_run: true
};

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "non_json_response", raw: text };
  }
}

function StatusBadge({ tone = "muted", children }) {
  const cls =
    tone === "ok" ? "badge badge-ok" : tone === "warn" ? "badge badge-warn" : "badge badge-muted";
  return <span className={cls}>{children}</span>;
}

function DataState({ loading, error, children }) {
  if (loading) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  return children;
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("health");
  const [healthState, setHealthState] = useState({ loading: true, error: "", data: null });
  const [runsState, setRunsState] = useState({ loading: true, error: "", data: [] });
  const [segmentsState, setSegmentsState] = useState({ loading: true, error: "", data: [] });
  const [configState, setConfigState] = useState({ loading: true, error: "", data: null });
  const [selectedRunId, setSelectedRunId] = useState("");
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [createState, setCreateState] = useState({ loading: false, error: "" });
  const [previewState, setPreviewState] = useState({ loading: false, error: "", data: null });
  const [confirmState, setConfirmState] = useState({ loading: false, error: "", data: null });
  const [controlState, setControlState] = useState({ loading: false, error: "", action: "" });
  const [confirmationText, setConfirmationText] = useState("");

  const isAdmin = session?.user?.role === "admin";
  const createFormDiffs = Object.entries(INITIAL_CREATE_FORM).filter(
    ([key, value]) => createForm[key] !== value
  );

  async function loadHealth() {
    const health = await fetchJson("/api/health");
    setHealthState({
      loading: false,
      error: health?.ok ? "" : health?.error || health?.message || "Health request failed.",
      data: health?.ok ? health : null
    });
  }

  async function loadRuns() {
    const runs = await fetchJson("/api/runs/list");
    setRunsState({
      loading: false,
      error: runs?.ok ? "" : runs?.error || runs?.message || "Runs request failed.",
      data: runs?.ok ? runs.runs || [] : []
    });
    return runs;
  }

  async function loadSegments() {
    const segments = await fetchJson("/api/segments/list");
    setSegmentsState({
      loading: false,
      error: segments?.ok ? "" : segments?.error || segments?.message || "Segments request failed.",
      data: segments?.ok ? segments.segments || [] : []
    });
  }

  async function loadConfig() {
    const readiness = await fetchJson("/api/config/readiness");
    setConfigState({
      loading: false,
      error: readiness?.ok ? "" : readiness?.error || readiness?.message || "Readiness request failed.",
      data: readiness?.ok ? readiness.report : null
    });
  }

  useEffect(() => {
    if (!session?.user?.email) return;

    let cancelled = false;

    async function loadAll() {
      setHealthState({ loading: true, error: "", data: null });
      setRunsState({ loading: true, error: "", data: [] });
      setSegmentsState({ loading: true, error: "", data: [] });
      setConfigState({ loading: true, error: "", data: null });

      const [runs] = await Promise.all([loadRuns(), loadHealth(), loadSegments(), loadConfig()]);
      if (cancelled) return;

      if (!selectedRunId && runs?.ok && runs.runs?.length) {
        setSelectedRunId(runs.runs[0].run_id);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.email]);

  const selectedRun = useMemo(
    () => runsState.data.find((run) => run.run_id === selectedRunId) || null,
    [runsState.data, selectedRunId]
  );

  useEffect(() => {
    if (selectedRun) {
      setConfirmationText(`CONFIRM ${selectedRun.run_code}`);
    }
  }, [selectedRun?.run_code]);

  if (status === "loading") {
    return (
      <div className="page-shell">
        <div className="container-dashboard">
          <div className="hero-panel">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-shell">
        <div className="container-dashboard">
          <div className="hero-panel">Not signed in.</div>
        </div>
      </div>
    );
  }

  const readinessTone =
    configState.data?.readiness === "ready"
      ? "ok"
      : configState.data?.readiness === "degraded"
        ? "warn"
        : "muted";

  async function handleCreateRun() {
    setCreateState({ loading: true, error: "" });
    setPreviewState({ loading: false, error: "", data: null });
    setConfirmState({ loading: false, error: "", data: null });

    const payload = {
      ...BBG_WAVE2_DEFAULTS,
      ...createForm
    };

    const response = await fetchJson("/api/runs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response?.ok) {
      setCreateState({
        loading: false,
        error: response?.error || response?.message || "Create failed."
      });
      return;
    }

    setCreateState({ loading: false, error: "" });
    setSelectedRunId(response.run.run_id);
    setConfirmationText(`CONFIRM ${response.run.run_code}`);

    const runs = await loadRuns();
    if (runs?.ok && !runs.runs.find((run) => run.run_id === response.run.run_id)) {
      setRunsState((prev) => ({ ...prev, data: [response.run, ...prev.data] }));
    }
  }

  async function handlePreviewRun() {
    if (!selectedRun) return;
    setPreviewState({ loading: true, error: "", data: null });
    setConfirmState({ loading: false, error: "", data: null });

    const response = await fetchJson("/api/runs/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: selectedRun.run_id })
    });

    if (!response?.ok) {
      setPreviewState({
        loading: false,
        error: response?.error || response?.message || "Preview failed.",
        data: null
      });
      return;
    }

    setPreviewState({ loading: false, error: "", data: response });
    await loadRuns();
  }

  async function handleConfirmRun() {
    if (!selectedRun) return;
    setConfirmState({ loading: true, error: "", data: null });

    const response = await fetchJson("/api/runs/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: selectedRun.run_id,
        confirmation_text: confirmationText
      })
    });

    if (!response?.ok) {
      setConfirmState({
        loading: false,
        error: response?.error || response?.message || "Confirm failed.",
        data: null
      });
      return;
    }

    setConfirmState({ loading: false, error: "", data: response });
    await loadRuns();
  }

  async function handleRunControl(action) {
    if (!selectedRun) return;
    setControlState({ loading: true, error: "", action });

    const response = await fetchJson(`/api/runs/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: selectedRun.run_id })
    });

    if (!response?.ok) {
      setControlState({
        loading: false,
        error: response?.error || response?.message || `${action} failed.`,
        action
      });
      return;
    }

    setControlState({ loading: false, error: "", action: "" });
    await loadRuns();
  }

  return (
    <div className="page-shell">
      <div className="container-dashboard space-y-6">
        <section className="card">
          <div className="card-body space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="eyebrow">Human Email Outreach Hybrid</p>
                <h1 className="hero-title">BBG Wave 2 control plane</h1>
                <p className="hero-copy">
                  The approved tokenized operator shell is now active on top of the existing runtime contract. Apps Script remains authoritative for eligibility, preview, confirm, render, and send.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="app-chip">Create → Preview → Confirm</span>
                  <span className="app-chip">Apps Script authoritative</span>
                  <span className="app-chip">Dry-run default locked</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="app-chip">
                  {session.user?.email} ({session.user?.role || "unknown"})
                </span>
                <button className="btn" onClick={() => signOut()}>
                  Sign out
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="surface-subtle">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge tone="ok">Locked BBG Wave 2</StatusBadge>
                  <StatusBadge tone={readinessTone}>
                    Readiness: {configState.data?.readiness || "loading"}
                  </StatusBadge>
                  <StatusBadge tone="muted">Apps Script authoritative</StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {Object.entries(BBG_WAVE2_DEFAULTS).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {key}
                      </p>
                      <p className="mt-2 break-all text-sm font-medium text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-subtle">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Confirmed Boundaries
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>No sender rewrite</li>
                  <li>No scheduler rewrite</li>
                  <li>No EVENT_LOG read path yet</li>
                  <li>No template read path yet</li>
                  <li>No brand-agnostic generalization</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={tab.id === activeTab ? "btn btn-primary" : "btn"}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {activeTab === "health" ? (
          <section className="card">
            <div className="card-body space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Health</h2>
                <p className="text-sm text-slate-600">
                  Signed server-side health check against the confirmed Apps Script `health` route.
                </p>
              </div>
              <DataState loading={healthState.loading} error={healthState.error}>
                {healthState.data ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <DetailRow label="Kill Switch" value={String(healthState.data.kill_switch)} />
                    <DetailRow
                      label="Default Dry Run"
                      value={String(healthState.data.default_dry_run)}
                    />
                    <DetailRow
                      label="Global Window"
                      value={`${healthState.data.window.start} - ${healthState.data.window.end}`}
                    />
                    <DetailRow
                      label="Daily Cap"
                      value={`${healthState.data.cap.sent_today} / ${healthState.data.cap.cap_today}`}
                    />
                  </div>
                ) : null}
              </DataState>
            </div>
          </section>
        ) : null}

        {activeTab === "runs" ? (
          <section className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Runs</h2>
                    <p className="text-sm text-slate-600">
                      Read-only run list plus confirmed BBG Wave 2 operator actions.
                    </p>
                  </div>
                  <DataState loading={runsState.loading} error={runsState.error}>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="px-3 py-2 font-semibold">Run</th>
                            <th className="px-3 py-2 font-semibold">Status</th>
                            <th className="px-3 py-2 font-semibold">Eligible</th>
                            <th className="px-3 py-2 font-semibold">Sent</th>
                            <th className="px-3 py-2 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {runsState.data.map((run) => (
                            <tr key={run.run_id}>
                              <td className="px-3 py-3">
                                <div className="font-medium text-slate-900">{run.run_code}</div>
                                <div className="text-xs text-slate-500">{run.run_id}</div>
                              </td>
                              <td className="px-3 py-3 text-slate-700">{run.status}</td>
                              <td className="px-3 py-3 text-slate-700">{String(run.eligible_count || "-")}</td>
                              <td className="px-3 py-3 text-slate-700">{String(run.sent_count || "0")}</td>
                              <td className="px-3 py-3">
                                <button className="btn" onClick={() => setSelectedRunId(run.run_id)}>
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                          {!runsState.data.length ? (
                            <tr>
                              <td className="px-3 py-6 text-slate-500" colSpan={5}>
                                No runs returned by Apps Script.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </DataState>
                </div>
              </div>

              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Run Detail</h2>
                    <p className="text-sm text-slate-600">
                      Built only from confirmed run fields returned by Apps Script.
                    </p>
                  </div>
                  {selectedRun ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailRow label="run_id" value={selectedRun.run_id} />
                      <DetailRow label="run_code" value={selectedRun.run_code} />
                      <DetailRow label="status" value={selectedRun.status} />
                      <DetailRow label="wave_id" value={selectedRun.wave_id} />
                      <DetailRow label="segment_id" value={selectedRun.segment_id} />
                      <DetailRow
                        label="template"
                        value={`${selectedRun.template_id}:${selectedRun.template_version}`}
                      />
                      <DetailRow label="dry_run" value={String(selectedRun.dry_run)} />
                      <DetailRow label="eligible_count" value={String(selectedRun.eligible_count)} />
                      <DetailRow label="confirmed_at" value={selectedRun.confirmed_at} />
                      <DetailRow label="started_at" value={selectedRun.started_at} />
                      <DetailRow label="ended_at" value={selectedRun.ended_at} />
                      <DetailRow label="sent_count" value={String(selectedRun.sent_count)} />
                      <DetailRow label="error_count" value={String(selectedRun.error_count)} />
                      <DetailRow label="skipped_count" value={String(selectedRun.skipped_count)} />
                      <DetailRow label="reply_count" value={String(selectedRun.reply_count)} />
                      <DetailRow label="optout_count" value={String(selectedRun.optout_count)} />
                      <DetailRow label="bounce_count" value={String(selectedRun.bounce_count)} />
                      <DetailRow
                        label="send_window"
                        value={`${selectedRun.send_window_start_local} - ${selectedRun.send_window_end_local}`}
                      />
                      <DetailRow
                        label="delay_seconds"
                        value={`${selectedRun.min_delay_seconds} - ${selectedRun.max_delay_seconds}`}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Select a run to inspect.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Create Run</h2>
                    <p className="text-sm text-slate-600">
                      Locked BBG Wave 2 create form. Only confirmed Apps Script operational controls are editable.
                    </p>
                  </div>

                  {isAdmin ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {Object.entries(BBG_WAVE2_DEFAULTS).slice(0, 4).map(([key, value]) => (
                          <DetailRow key={key} label={key} value={value} />
                        ))}
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        These are the current recommended BBG Wave 2 pilot defaults.
                      </div>

                      {createFormDiffs.length ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-900">
                            Diverges from recommended BBG Wave 2 pilot defaults:
                          </p>
                          <p className="mt-2">
                            {createFormDiffs.map(([key]) => key).join(", ")}
                          </p>
                        </div>
                      ) : null}

                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(createForm).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {key}
                            </label>
                            {typeof value === "boolean" ? (
                              <select
                                className="input"
                                value={String(value)}
                                onChange={(event) =>
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    [key]: event.target.value === "true"
                                  }))
                                }
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : (
                              <input
                                className="input"
                                value={String(value)}
                                onChange={(event) =>
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    [key]:
                                      key.includes("max_") ||
                                      key.endsWith("threshold") ||
                                      key.endsWith("seconds")
                                        ? Number(event.target.value)
                                        : event.target.value
                                  }))
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {createState.error ? (
                        <p className="text-sm text-rose-700">{createState.error}</p>
                      ) : null}

                      <button className="btn btn-primary" onClick={handleCreateRun} disabled={createState.loading}>
                        {createState.loading ? "Creating..." : "Create BBG Wave 2 Run"}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Create is admin-only. Viewer access remains read-only in this slice.
                    </p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Preview and Confirm</h2>
                    <p className="text-sm text-slate-600">
                      Uses only confirmed Apps Script responses. No rendered template preview is invented here.
                    </p>
                  </div>

                  {selectedRun ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        <DetailRow label="Selected Run" value={selectedRun.run_code} />
                        <DetailRow label="Status" value={selectedRun.status} />
                        <DetailRow label="Dry Run" value={String(selectedRun.dry_run)} />
                      </div>

                      {isAdmin ? (
                        <div className="space-y-4">
                          {previewState.error ? (
                            <p className="text-sm text-rose-700">{previewState.error}</p>
                          ) : null}

                          {controlState.error ? (
                            <p className="text-sm text-rose-700">{controlState.error}</p>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            <button className="btn" onClick={handlePreviewRun} disabled={previewState.loading}>
                              {previewState.loading ? "Previewing..." : "Preview"}
                            </button>
                            <button
                              className="btn"
                              onClick={() => handleRunControl("pause")}
                              disabled={controlState.loading}
                            >
                              {controlState.loading && controlState.action === "pause" ? "Pausing..." : "Pause"}
                            </button>
                            <button
                              className="btn"
                              onClick={() => handleRunControl("resume")}
                              disabled={controlState.loading}
                            >
                              {controlState.loading && controlState.action === "resume" ? "Resuming..." : "Resume"}
                            </button>
                            <button
                              className="btn"
                              onClick={() => handleRunControl("kill")}
                              disabled={controlState.loading}
                            >
                              {controlState.loading && controlState.action === "kill" ? "Killing..." : "Kill"}
                            </button>
                          </div>

                          {previewState.data ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <h3 className="font-semibold text-slate-900">Confirmed Preview Contract</h3>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <DetailRow
                                  label="eligible_count"
                                  value={String(previewState.data.eligible_count)}
                                />
                                <DetailRow
                                  label="updated_status"
                                  value={previewState.data.run.status}
                                />
                              </div>
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  sample_contact_ids
                                </p>
                                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                                  {JSON.stringify(previewState.data.sample_contact_ids, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Exact confirmation text
                            </label>
                            <input
                              className="input"
                              value={confirmationText}
                              onChange={(event) => setConfirmationText(event.target.value)}
                            />
                          </div>

                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <p className="font-medium text-amber-950">Pre-confirm readiness warnings</p>
                            <ul className="mt-2 space-y-2">
                              <li>Template existence is checked before confirm.</li>
                              <li>Segment existence is checked before preview and confirm.</li>
                              <li>confirmRun_ does not verify suppression freshness.</li>
                              <li>Apps Script health is signed but not allowlist-gated.</li>
                            </ul>
                          </div>

                          {confirmState.error ? (
                            <p className="text-sm text-rose-700">{confirmState.error}</p>
                          ) : null}

                          <button className="btn btn-primary" onClick={handleConfirmRun} disabled={confirmState.loading}>
                            {confirmState.loading ? "Confirming..." : "Confirm"}
                          </button>

                          {confirmState.data ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <h3 className="font-semibold text-slate-900">Confirmed Run Response</h3>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <DetailRow label="status" value={confirmState.data.run.status} />
                                <DetailRow label="confirmed_at" value={confirmState.data.run.confirmed_at} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          Preview and confirm are admin-only. Viewer access remains read-only in this slice.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Create or select a run first.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "segments" ? (
          <section className="card">
            <div className="card-body space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Segments</h2>
                <p className="text-sm text-slate-600">
                  Read-only view over active segments. No speculative edit surface added in this slice.
                </p>
              </div>
              <DataState loading={segmentsState.loading} error={segmentsState.error}>
                <div className="grid gap-4 md:grid-cols-2">
                  {segmentsState.data.map((segment) => (
                    <div key={segment.segment_id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{segment.name}</h3>
                          <p className="text-xs text-slate-500">{segment.segment_id}</p>
                        </div>
                        <StatusBadge tone="ok">{String(segment.is_active)}</StatusBadge>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {segment.description || "No description provided."}
                      </p>
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                        {segment.filter_json}
                      </pre>
                    </div>
                  ))}
                  {!segmentsState.data.length ? (
                    <p className="text-sm text-slate-500">No active segments returned by Apps Script.</p>
                  ) : null}
                </div>
              </DataState>
            </div>
          </section>
        ) : null}

        {activeTab === "config" ? (
          <section className="card">
            <div className="card-body space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Config and Readiness</h2>
                <p className="text-sm text-slate-600">
                  Server-side env validation plus signed Apps Script health state. No secrets are exposed.
                </p>
              </div>
              <DataState loading={configState.loading} error={configState.error}>
                {configState.data ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={readinessTone}>
                        {configState.data.readiness.toUpperCase()}
                      </StatusBadge>
                      <span className="text-sm text-slate-600">
                        Health checked: {String(configState.data.health.checked)}
                      </span>
                      <span className="text-sm text-slate-600">
                        Alias in use: {String(configState.data.env.alias_in_use)}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="px-3 py-2 font-semibold">Env</th>
                            <th className="px-3 py-2 font-semibold">Present</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                            <th className="px-3 py-2 font-semibold">Deprecated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {configState.data.env.checks.map((check) => (
                            <tr key={check.name}>
                              <td className="px-3 py-3 text-slate-900">{check.name}</td>
                              <td className="px-3 py-3 text-slate-700">{String(check.present)}</td>
                              <td className="px-3 py-3 text-slate-700">{check.source || "-"}</td>
                              <td className="px-3 py-3 text-slate-700">{String(Boolean(check.deprecated))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900">Warnings</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {configState.data.warnings.length ? (
                            configState.data.warnings.map((warning) => <li key={warning}>{warning}</li>)
                          ) : (
                            <li>No readiness warnings.</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900">Health State</h3>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p>Health OK: {String(configState.data.health.ok)}</p>
                          <p>Health Checked: {String(configState.data.health.checked)}</p>
                          {configState.data.health.state ? (
                            <>
                              <p>Kill Switch: {String(configState.data.health.state.kill_switch)}</p>
                              <p>Default Dry Run: {String(configState.data.health.state.default_dry_run)}</p>
                              <p>
                                Window: {configState.data.health.state.window.start} -{" "}
                                {configState.data.health.state.window.end}
                              </p>
                            </>
                          ) : null}
                          {configState.data.health.error ? (
                            <p className="text-rose-700">{configState.data.health.error}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900">Deferred Surfaces</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          <li>EVENT_LOG: contract pending, no confirmed read path</li>
                          <li>TEMPLATES: contract pending, no confirmed read path</li>
                          <li>Health remains signed but not allowlist-gated inside Apps Script</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DataState>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="card-body space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
              <p className="text-sm text-slate-600">
                Contract pending. No confirmed read route exists yet, so template inspection is deferred in this slice.
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-body space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">EVENT_LOG</h2>
              <p className="text-sm text-slate-600">
                Contract pending. No confirmed read route exists yet, so the EVENT_LOG viewer is deferred in this slice.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
