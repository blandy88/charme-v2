import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useStore } from "../state/StoreContext.jsx";

export default function AuthModal() {
  const { authOpen, setAuthOpen, login } = useStore();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const emailRef = useRef(null);

  useEffect(() => {
    if (!authOpen) return undefined;
    emailRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setAuthOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [authOpen, setAuthOpen]);

  if (!authOpen) return null;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password, remember);
        setAuthOpen(false);
      } else {
        const data = await api.register({
          email,
          password,
          firstName,
          lastName,
        });
        setNotice(
          data?.message ||
            "Account created. Check your email for the verification code.",
        );
        setMode("login");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "h-10 w-full rounded-sm border border-hairline bg-surface px-3 text-sm text-cream placeholder:text-faint transition-colors focus-visible:border-brass focus-visible:outline-none";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close sign in"
        onClick={() => setAuthOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="animate-rise relative w-full max-w-sm rounded-sm border border-hairline bg-ink p-6"
      >
        <h2 id="auth-title" className="font-display text-xl text-cream">
          {mode === "login" ? "Welcome back" : "Create an account"}
        </h2>
        <p className="mt-1 text-xs text-faint">
          {mode === "login"
            ? "Sign in to save favourites and reserve selections."
            : "Join Charme to follow the houses you love."}
        </p>

        {error ? (
          <p className="mt-4 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 text-xs text-brass">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-sm border border-hairline bg-surface px-3 py-2 text-xs text-muted">
            {notice}
          </p>
        ) : null}

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {mode === "register" ? (
            <div className="grid grid-cols-2 gap-3">
              <input
                className={field}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <input
                className={field}
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          ) : null}

          <input
            ref={emailRef}
            className={field}
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className={field}
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {mode === "login" ? (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-brass)]"
              />
              Keep me signed in
            </label>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-10 rounded-sm bg-brass text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setNotice("");
          }}
          className="mt-4 text-xs text-muted underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brass"
        >
          {mode === "login"
            ? "No account yet? Create one"
            : "Already registered? Sign in"}
        </button>
      </div>
    </div>
  );
}
