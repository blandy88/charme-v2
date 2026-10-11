import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Auth() {
  const { signIn, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState(params.get("expired") ? "Your session expired. Please sign in again." : "");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        navigate("/");
      } else {
        await register(form);
        setMode("login");
        setError("");
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <p className="meta">Parfumerie Charme</p>
      <h1 className="mt-2 font-display text-3xl text-cream">
        {mode === "login" ? "Welcome back" : "Create an account"}
      </h1>
      {error ? (
        <p role="alert" className="mt-4 rounded-sm border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === "register" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted">
              First name
              <input value={form.firstName} onChange={set("firstName")} required minLength={2}
                className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
            </label>
            <label className="block text-xs text-muted">
              Last name
              <input value={form.lastName} onChange={set("lastName")} required minLength={2}
                className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
            </label>
          </div>
        ) : null}
        <label className="block text-xs text-muted">
          Email address
          <input type="email" value={form.email} onChange={set("email")} required autoComplete="email"
            className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
        </label>
        <label className="block text-xs text-muted">
          Password
          <input type="password" value={form.password} onChange={set("password")} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-brass px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {mode === "login" ? (
          <>No account? <button type="button" onClick={() => setMode("register")} className="text-brass underline underline-offset-4">Create one</button></>
        ) : (
          <>Have an account? <button type="button" onClick={() => setMode("login")} className="text-brass underline underline-offset-4">Sign in</button></>
        )}
      </p>
      <p className="mt-6 text-xs text-faint"><Link to="/" className="underline underline-offset-4">Back to site</Link></p>
    </main>
  );
}
