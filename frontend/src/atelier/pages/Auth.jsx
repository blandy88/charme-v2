/*
 * Auth — the legacy authModal + verificationModal, as a page.
 *
 * The legacy flow was: email/password sign-in, a Google button, and an
 * out-of-band registration that ended in a six-digit email code. Only the
 * password half is backed by the API (there is no /api/auth/google and no
 * password-reset endpoint), so only that half is rendered — a button that
 * cannot work is worse than no button.
 *
 * "Remember me" is real here: on it the JWT goes to localStorage, off it goes
 * to sessionStorage. The legacy checkbox persisted either way.
 *
 * Verification keeps the chosen password in memory so a successful code
 * signs the new account straight in instead of bouncing back to the form.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { api } from "../../api/client.js";
import "./account.css";

/* Only ever redirect within this origin. `next` arrives from a URL, so a
   protocol-relative "//evil.example" has to be rejected explicitly. */
function safeNext(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Auth() {
  const { t } = useI18n();
  const { user, signIn, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const expired = params.get("expired") === "1";

  const [mode, setMode] = useState("signin"); // signin | signup | verify
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(null); // { userId, email }
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* Already signed in? There is nothing to do here. */
  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const submitSignIn = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signIn(form.email, form.password, remember);
      navigate(next, { replace: true });
    } catch (err) {
      const data = err.data || {};
      if (err.status === 403 && data.userId) {
        setPending({ userId: data.userId, email: data.email || form.email });
        setMode("verify");
        setNotice("");
      }
      setError(data.error || err.message || t("authFailed"));
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      setPending({ userId: res.userId, email: form.email });
      setMode("verify");
    } catch (err) {
      setError((err.data && err.data.error) || err.message || t("authFailed"));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/verify-email", {
        method: "POST",
        body: { userId: pending.userId, verificationCode: code.trim() },
        auth: false,
      });
      try {
        await signIn(pending.email, form.password, remember);
        navigate(next, { replace: true });
      } catch {
        setMode("signin");
        setNotice(t("authVerified"));
      }
    } catch (err) {
      setError((err.data && err.data.error) || err.message || t("authFailed"));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      await api("/api/auth/resend-verification", {
        method: "POST",
        body: { userId: pending.userId },
        auth: false,
      });
      setNotice(t("authResent"));
    } catch (err) {
      setError((err.data && err.data.error) || err.message || t("authFailed"));
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setNotice("");
  };

  return (
    <main className="wrap acct">
      <div className="auth-split">
        <aside className="auth-aside">
          <p className="eyebrow">Parfumerie Charme</p>
          <h2>{t("authAsideTitle")}</h2>
          <p>{t("authAsideBody")}</p>
          <ul className="auth-perks">
            {["authPerk1", "authPerk2", "authPerk3"].map((k) => (
              <li key={k}>
                <Check size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="acct-panel">
          {mode !== "verify" ? (
            <div className="seg" role="tablist" aria-label={t("authTabLabel")} data-guide="auth-tabs">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => switchMode("signin")}
                data-guide="auth-tab-signin"
              >
                {t("authTabSignIn")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => switchMode("signup")}
                data-guide="auth-tab-signup"
              >
                {t("authTabSignUp")}
              </button>
            </div>
          ) : null}

          {mode === "signin" ? (
            <form className="auth-form" style={{ marginTop: "var(--space-m)" }} onSubmit={submitSignIn} noValidate>
              <h2>{t("authSignInTitle")}</h2>

              {expired ? <p className="msg">{t("authExpiredMsg")}</p> : null}
              {notice ? <p className="msg ok">{notice}</p> : null}
              {error ? <p className="msg error" role="alert">{error}</p> : null}

              <div className="fld">
                <label htmlFor="au-email">{t("authEmail")}</label>
                <input
                  id="au-email"
                  className="field"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  data-guide="auth-email"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>

              <div className="fld">
                <label htmlFor="au-password">{t("authPassword")}</label>
                <span className="affix">
                  <input
                    id="au-password"
                    className="field"
                    type={showPw ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    data-guide="auth-password"
                    value={form.password}
                    onChange={set("password")}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? t("authHide") : t("authShow")}
                  </button>
                </span>
              </div>

              <div className="acct-actions" style={{ marginTop: 0, justifyContent: "space-between" }}>
                <label className="check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>{t("authRemember")}</span>
                </label>
                <button
                  type="button"
                  className="forgot"
                  data-guide="auth-forgot"
                  onClick={() => setForgot((v) => !v)}
                >
                  {t("authForgot")}
                </button>
              </div>

              {forgot ? <p className="msg" data-guide="auth-forgot-note">{t("authForgotNote")}</p> : null}

              <div className="acct-actions">
                <button
                  type="submit"
                  className="btn btn-accent pressable"
                  disabled={busy}
                  data-guide="auth-submit"
                >
                  {busy ? t("authWorking") : t("authSignInCta")}
                </button>
                <span className="spacer" />
                <button type="button" className="linkish" onClick={() => switchMode("signup")}>
                  {t("authNoAccount")}
                </button>
              </div>
            </form>
          ) : null}

          {mode === "signup" ? (
            <form className="auth-form" style={{ marginTop: "var(--space-m)" }} onSubmit={submitSignUp} noValidate>
              <h2>{t("authSignUpTitle")}</h2>

              {error ? <p className="msg error" role="alert">{error}</p> : null}

              <div className="fld-row two">
                <div className="fld">
                  <label htmlFor="au-first">{t("authFirstName")}</label>
                  <input
                    id="au-first"
                    className="field"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    value={form.firstName}
                    onChange={set("firstName")}
                  />
                </div>
                <div className="fld">
                  <label htmlFor="au-last">{t("authLastName")}</label>
                  <input
                    id="au-last"
                    className="field"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    value={form.lastName}
                    onChange={set("lastName")}
                  />
                </div>
              </div>

              <div className="fld">
                <label htmlFor="au-email2">{t("authEmail")}</label>
                <input
                  id="au-email2"
                  className="field"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  data-guide="auth-signup-email"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>

              <div className="fld">
                <label htmlFor="au-password2">{t("authPassword")}</label>
                <span className="affix">
                  <input
                    id="au-password2"
                    className="field"
                    type={showPw ? "text" : "password"}
                    name="new-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    data-guide="auth-signup-password"
                    value={form.password}
                    onChange={set("password")}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? t("authHide") : t("authShow")}
                  </button>
                </span>
                <span className="fld-hint">{t("authPasswordHint")}</span>
              </div>

              <div className="acct-actions">
                <button
                  type="submit"
                  className="btn btn-accent pressable"
                  disabled={busy}
                  data-guide="auth-signup-submit"
                >
                  {busy ? t("authWorking") : t("authSignUpCta")}
                </button>
                <span className="spacer" />
                <button type="button" className="linkish" onClick={() => switchMode("signin")}>
                  {t("authHaveAccount")}
                </button>
              </div>
            </form>
          ) : null}

          {mode === "verify" ? (
            <form className="auth-form" style={{ marginTop: "var(--space-m)" }} onSubmit={submitCode} noValidate>
              <h2>{t("authVerifyTitle")}</h2>
              <p className="fld-hint">{t("authVerifyBody").replace("{email}", pending?.email || "")}</p>

              {notice ? <p className="msg ok">{notice}</p> : null}
              {error ? <p className="msg error" role="alert">{error}</p> : null}

              <div className="fld" data-guide="auth-code">
                <label htmlFor="au-code">{t("authCode")}</label>
                <input
                  id="au-code"
                  className="field verify-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  data-guide="auth-code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="acct-actions">
                <button
                  type="submit"
                  className="btn btn-accent pressable"
                  disabled={busy || code.length < 6}
                  data-guide="auth-verify-submit"
                >
                  {busy ? t("authWorking") : t("authVerifyCta")}
                </button>
                <button type="button" className="linkish" onClick={resend} data-guide="auth-resend">
                  {t("authResend")}
                </button>
              </div>
            </form>
          ) : null}

          <p className="fld-hint" style={{ marginTop: "var(--space-m)" }}>
            <Link to="/">{t("authBack")}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
