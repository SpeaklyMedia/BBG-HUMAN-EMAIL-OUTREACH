import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="page-shell">
        <div className="container-main">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container-main stack">
        <div className="hero-panel">
          <div className="card-body stack">
            <div className="stack">
              <p className="eyebrow">Human Email Outreach Hybrid</p>
              <h1 className="hero-title">BBG safe-mode outreach control plane</h1>
              <p className="hero-copy">
                Tokenized operator shell for the confirmed Apps Script contract. The runtime stays fail-closed while the interface now follows the approved brand-agnostic visual language.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="app-chip">Create → Preview → Confirm</span>
                <span className="app-chip">KILL_SWITCH=1</span>
                <span className="app-chip">DEFAULT_DRY_RUN=1</span>
              </div>
            </div>
            {session ? (
              <div className="stack">
                <p className="text-sm">
                  Signed in as <strong className="text-slate-900">{session.user?.email}</strong>
                </p>
                <div className="flex flex-wrap gap-3">
                  <a className="btn btn-primary" href="/dashboard">Go to Dashboard</a>
                  <button className="btn" onClick={() => signOut()}>Sign out</button>
                </div>
              </div>
            ) : (
              <div className="stack">
                <p className="text-sm text-slate-600">You must sign in with an allowlisted account.</p>
                <button className="btn btn-primary" onClick={() => signIn("google")}>Sign in with Google</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
