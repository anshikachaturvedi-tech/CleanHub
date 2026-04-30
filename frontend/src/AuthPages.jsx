import { useState } from "react";
import { DEMO_ADMIN, login } from "./demoAuth.js";

function DemoCredentials() {
  return (
    <div className="demo-creds" role="region" aria-label="Demo login credentials">
      <div className="demo-creds-title">Public demo — use these to open the admin desk</div>
      <div className="demo-creds-grid">
        <div>
          <span className="demo-creds-label">Username</span>
          <code className="demo-creds-value">{DEMO_ADMIN.username}</code>
        </div>
        <div>
          <span className="demo-creds-label">Password</span>
          <code className="demo-creds-value">{DEMO_ADMIN.password}</code>
        </div>
      </div>
    </div>
  );
}

export function AuthPages({ onAuthed }) {
  const [username, setUsername] = useState(DEMO_ADMIN.username);
  const [password, setPassword] = useState(DEMO_ADMIN.password);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const onLoginSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await login(username, password);
    setBusy(false);
    if (r.ok) onAuthed();
    else setErr(r.error);
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel card">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden>
            🧺
          </div>
          <div>
            <div className="brand-name" style={{ fontSize: "1.5rem" }}>
              CleanHub
            </div>
            <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
              Laundry order desk
            </p>
          </div>
        </div>

        <form onSubmit={onLoginSubmit} className="auth-form">
          <div>
            <label className="field-label" htmlFor="auth-user">
              Username
            </label>
            <input id="auth-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="field-label" htmlFor="auth-pass">
              Password
            </label>
            <input
              id="auth-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {err && <div className="error-banner" style={{ marginTop: 0 }}>{err}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "…" : "Enter admin desk"}
          </button>
        </form>

        <DemoCredentials />
      </div>
    </div>
  );
}
