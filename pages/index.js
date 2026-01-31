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
        <div className="card">
          <div className="card-body stack">
            <div className="stack">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Web App</p>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">BBG Human Outreach — V1 Dashboard (Stub UI)</h1>
              <p className="text-sm text-slate-600">Fail-safe defaults: kill-switch ON + dry-run ON.</p>
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
