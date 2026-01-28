import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>BBG Human Outreach — V1 Dashboard (Stub UI)</h1>
      <p>Fail-safe defaults: kill-switch ON + dry-run ON.</p>
      {session ? (
        <>
          <p>Signed in as <strong>{session.user?.email}</strong></p>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="/dashboard">Go to Dashboard</a>
            <button onClick={() => signOut()}>Sign out</button>
          </div>
        </>
      ) : (
        <>
          <p>You must sign in with an allowlisted account.</p>
          <button onClick={() => signIn("google")}>Sign in with Google</button>
        </>
      )}
    </div>
  );
}
