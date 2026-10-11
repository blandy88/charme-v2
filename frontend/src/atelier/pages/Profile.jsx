/*
 * Profile + Settings — the legacy profileModal and settingsModal, as one page
 * with two panes (they shared a purpose and always opened from the same menu).
 *
 * The avatar is the one upload the API accepts: multipart POST /api/upload-avatar
 * (the old base64 endpoint answers 410). Everything else is JSON.
 *
 * Two legacy buttons are deliberately honest here rather than decorative:
 *  - "Change password" was a toast reading "will be implemented with backend
 *    integration" — there is still no endpoint, so it explains what to do
 *    instead of pretending.
 *  - "Delete account" only ever cleared this device's storage and signed out
 *    (no server route deletes a user). It is labelled as exactly that.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useFavorites } from "../../contexts/FavoritesContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { api, apiUpload, setToken } from "../../api/client.js";
import AvatarEditor from "./AvatarEditor.jsx";
import { initials } from "../lib/text.js";
import "./account.css";
import "./avatarEditor.css";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  smsNotifications: false,
  profileVisibility: true,
  dataCollection: true,
};

export default function Profile() {
  const { t } = useI18n();
  const { user, isAdmin, ready, refresh, signOut } = useAuth();
  const { items } = useFavorites();
  const fileRef = useRef(null);

  const [pane, setPane] = useState("profile");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", birthday: "" });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [status, setStatus] = useState({ pane: "", kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* Seed from whatever the session already knows, then confirm with the API. */
  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name || (user.name || "").split(" ")[0] || "",
      last_name: user.last_name || (user.name || "").split(" ").slice(1).join(" ") || "",
      phone: user.phone || "",
      birthday: (user.birthday || "").slice(0, 10),
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    api("/api/user/settings")
      .then((res) => {
        if (live && res && res.settings) setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
      })
      .catch(() => {
        /* the defaults are the server's own defaults — nothing to report */
      });
    return () => {
      live = false;
    };
  }, [user]);

  if (!ready) return <main className="wrap acct" />;

  if (!user) {
    return (
      <main className="wrap acct">
        <div className="empty" style={{ marginTop: "var(--space-xl)" }}>
          <h2>{t("profileGateTitle")}</h2>
          <p>{t("profileGateBody")}</p>
          <Link to="/auth?next=/profile" className="btn btn-accent pressable">
            {t("signIn")}
          </Link>
        </div>
      </main>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const unknownAvatar = !user.avatar || user.avatar === "default.jpg";

  const saveProfile = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus({ pane: "", kind: "", text: "" });
    try {
      await api("/api/user/profile", {
        method: "PUT",
        body: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || "",
          birthday: form.birthday || "",
        },
      });
      await refresh();
      setStatus({ pane: "profile", kind: "ok", text: t("profileSaved") });
    } catch (err) {
      setStatus({ pane: "profile", kind: "error", text: (err.data && err.data.error) || err.message });
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus({ pane: "", kind: "", text: "" });
    try {
      await api("/api/user/settings", { method: "PUT", body: settings });
      setStatus({ pane: "settings", kind: "ok", text: t("setSaved") });
    } catch (err) {
      setStatus({ pane: "settings", kind: "error", text: (err.data && err.data.error) || err.message });
    } finally {
      setBusy(false);
    }
  };

  /* The picked file goes to the editor first: it crops, zooms and rotates, then
     uploads an already-square JPEG. The server's 200×200 cover-crop would
     otherwise decide the framing for us. */
  const uploadAvatar = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setStatus({ pane: "profile", kind: "error", text: t("avatarBadType") });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setStatus({ pane: "profile", kind: "error", text: t("avatarTooBig") });
      return;
    }
    setEditing(file);
  };

  const finishAvatar = async () => {
    setEditing(null);
    await refresh();
    setStatus({ pane: "profile", kind: "ok", text: t("profilePhotoSaved") });
  };

  /* Exactly what the legacy handler did: clear this device, then sign out. */
  const deleteLocal = () => {
    try {
      ["charme-favorites", "charme-cart", "charme-perfume-mode"].forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    setToken("");
    signOut();
  };

  const toggle = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.checked }));

  const since = user.created_at ? new Date(user.created_at).getFullYear() : null;

  return (
    <main className="wrap acct">
      <header className="acct-head">
        <p className="eyebrow">Parfumerie Charme</p>
        <h1>{t("profileTitle")}</h1>
        <p className="acct-sub">{t("profileSub")}</p>
      </header>

      <div className="profile-grid">
        <aside className="avatar-well">
          <span className="avatar-ring">
            {unknownAvatar ? (
              <span
                aria-hidden="true"
                style={{
                  inlineSize: "100%",
                  blockSize: "100%",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--surface-0)",
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--step-2)",
                  color: "var(--text-2)",
                }}
              >
                {initials(form.first_name || form.last_name || "?")}
              </span>
            ) : (
              <img src={user.avatar} alt="" />
            )}
          </span>

          <button
            type="button"
            className="btn btn-ghost pressable"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={busy}
          >
            {t("profilePhoto")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={uploadAvatar}
          />

          {editing ? (
            <AvatarEditor
              file={editing}
              onDone={finishAvatar}
              onCancel={() => setEditing(null)}
            />
          ) : null}

          {isAdmin ? (
            <span className="badge-admin">
              <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" />
              {t("profileAdmin")}
            </span>
          ) : null}

          <div className="stats-row" style={{ justifyContent: "center", gap: "var(--space-m)" }}>
            <div>
              <strong>{items.length}</strong>
              <span>{t("favorites")}</span>
            </div>
            {since ? (
              <div>
                <strong>{since}</strong>
                <span>{t("profileSince")}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="acct-panel" style={{ marginTop: 0 }}>
          <div className="seg" role="tablist" aria-label={t("profileTitle")}>
            <button type="button" role="tab" aria-selected={pane === "profile"} onClick={() => setPane("profile")}>
              {t("profileTabProfile")}
            </button>
            <button type="button" role="tab" aria-selected={pane === "settings"} onClick={() => setPane("settings")}>
              {t("settings")}
            </button>
          </div>

          {pane === "profile" ? (
            <form className="auth-form" style={{ marginTop: "var(--space-m)" }} onSubmit={saveProfile}>
              {status.pane === "profile" && status.text ? (
                <p className={`msg${status.kind === "error" ? " error" : " ok"}`} role="status">
                  {status.text}
                </p>
              ) : null}

              <div className="fld-row two">
                <div className="fld">
                  <label htmlFor="pf-first">{t("authFirstName")}</label>
                  <input id="pf-first" className="field" value={form.first_name} onChange={set("first_name")} />
                </div>
                <div className="fld">
                  <label htmlFor="pf-last">{t("authLastName")}</label>
                  <input id="pf-last" className="field" value={form.last_name} onChange={set("last_name")} />
                </div>
              </div>

              <div className="fld">
                <label htmlFor="pf-email">{t("authEmail")}</label>
                <input id="pf-email" className="field" value={user.email || ""} readOnly aria-readonly="true" />
                <span className="fld-hint">{t("profileEmailHint")}</span>
              </div>

              <div className="fld-row two">
                <div className="fld">
                  <label htmlFor="pf-phone">{t("profilePhone")}</label>
                  <input
                    id="pf-phone"
                    className="field"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={set("phone")}
                  />
                </div>
                <div className="fld">
                  <label htmlFor="pf-birthday">{t("profileBirthday")}</label>
                  <input
                    id="pf-birthday"
                    className="field"
                    type="date"
                    value={form.birthday}
                    onChange={set("birthday")}
                  />
                </div>
              </div>

              <div className="acct-actions">
                <button type="submit" className="btn btn-accent pressable" disabled={busy}>
                  {busy ? t("authWorking") : t("profileSave")}
                </button>
              </div>
            </form>
          ) : (
            <form style={{ marginTop: "var(--space-m)" }} onSubmit={saveSettings}>
              {status.pane === "settings" && status.text ? (
                <p className={`msg${status.kind === "error" ? " error" : " ok"}`} role="status">
                  {status.text}
                </p>
              ) : null}

              <div className="set-block">
                <h2>{t("setNotifications")}</h2>
                <div className="set-item">
                  <label className="switch">
                    <input type="checkbox" checked={settings.emailNotifications} onChange={toggle("emailNotifications")} />
                    <span className="switch-text">
                      <strong>{t("setEmail")}</strong>
                      <span>{t("setEmailDesc")}</span>
                    </span>
                  </label>
                </div>
                <div className="set-item">
                  <label className="switch">
                    <input type="checkbox" checked={settings.smsNotifications} onChange={toggle("smsNotifications")} />
                    <span className="switch-text">
                      <strong>{t("setSms")}</strong>
                      <span>{t("setSmsDesc")}</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="set-block">
                <h2>{t("setPrivacy")}</h2>
                <div className="set-item">
                  <label className="switch">
                    <input type="checkbox" checked={settings.profileVisibility} onChange={toggle("profileVisibility")} />
                    <span className="switch-text">
                      <strong>{t("setPublic")}</strong>
                      <span>{t("setPublicDesc")}</span>
                    </span>
                  </label>
                </div>
                <div className="set-item">
                  <label className="switch">
                    <input type="checkbox" checked={settings.dataCollection} onChange={toggle("dataCollection")} />
                    <span className="switch-text">
                      <strong>{t("setAnalytics")}</strong>
                      <span>{t("setAnalyticsDesc")}</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="set-block">
                <h2>{t("setAccount")}</h2>
                <div className="set-item">
                  <strong style={{ fontSize: "var(--step-0)" }}>{t("setPassword")}</strong>
                  <p className="fld-hint" style={{ marginTop: "0.3rem" }}>{t("setPasswordNote")}</p>
                </div>
                <div className="set-item">
                  <strong style={{ fontSize: "var(--step-0)" }}>{t("setDelete")}</strong>
                  <p className="fld-hint" style={{ marginTop: "0.3rem" }}>{t("setDeleteDesc")}</p>
                  {confirmDelete ? (
                    <div className="acct-actions" style={{ marginTop: "var(--space-xs)" }}>
                      <button type="button" className="btn danger pressable" onClick={deleteLocal}>
                        {t("setDeleteConfirm")}
                      </button>
                      <button type="button" className="linkish" onClick={() => setConfirmDelete(false)}>
                        {t("cancel")}
                      </button>
                    </div>
                  ) : (
                    <div className="acct-actions" style={{ marginTop: "var(--space-xs)" }}>
                      <button type="button" className="btn danger pressable" onClick={() => setConfirmDelete(true)}>
                        {t("setDelete")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="acct-actions">
                <button type="submit" className="btn btn-accent pressable" disabled={busy}>
                  {busy ? t("authWorking") : t("setSave")}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
