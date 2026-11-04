import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { ADMIN_STR } from "./adminI18n.js";
import { fmtDate, Modal, Stat } from "./adminKit.jsx";
import { Loyalty } from "./AdminLoyalty.jsx";
import AdminAssistant from "./AdminAssistant.jsx";
import { tablistKeys } from "../lib/tablist.js";
import "./admin.css";

/* ------------------------------------------------------------------ Overview */
function Overview({ at }) {
  const [stats, setStats] = useState(null);
  const [cards, setCards] = useState(null);
  const [news, setNews] = useState(null);
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      api("/api/stats/users"),
      api("/api/admin/loyalty"),
      api("/api/admin/news"),
      api("/api/admin/notes"),
    ]).then(([s, l, n, g]) => {
      if (!alive) return;
      if (s.status === "fulfilled") setStats(s.value.stats || {});
      if (l.status === "fulfilled") setCards(l.value.cards || []);
      if (n.status === "fulfilled") setNews(n.value.news || []);
      if (g.status === "fulfilled") setNotes(g.value.notes || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const eligible = cards ? cards.filter((c) => c.eligible).length : null;
  const rewards = cards ? cards.reduce((sum, c) => sum + (c.rewards || 0), 0) : null;
  const unread = notes ? notes.filter((n) => !n.is_read).length : null;

  return (
    <div className="admin-stats" data-guide="admin-stats">
      <Stat guide="stat-users" label={at("statTotalUsers")} value={stats?.totalUsers} />
      <Stat guide="stat-cards" label={at("statCards")} value={cards ? cards.length : null} />
      <Stat guide="stat-eligible" label={at("statEligible")} value={eligible} />
      <Stat guide="stat-rewards" label={at("statRewardsGiven")} value={rewards} />
      <Stat guide="stat-news" label={at("statNews")} value={news ? news.length : null} />
      <Stat guide="stat-notes" label={at("statUnreadNotes")} value={unread} />
      <Stat guide="stat-admins" label={at("statAdmins")} value={stats?.adminUsers} />
      <Stat guide="stat-banned" label={at("statBanned")} value={stats?.bannedUsers} />
      <Stat guide="stat-gmail" label={at("statGmail")} value={stats?.gmailUsers} />
    </div>
  );
}

/* --------------------------------------------------------------------- Users */
function Users({ at }) {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [banFor, setBanFor] = useState(null);
  const [reason, setReason] = useState("");

  const reload = useCallback(
    () =>
      api("/api/admin/users")
        .then((d) => setUsers(d.users || []))
        .catch((e) => {
          setUsers([]);
          setError(e.message);
        }),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const shown = useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      `${u.name} ${u.email} ${u.phone || ""}`.toLowerCase().includes(needle),
    );
  }, [users, q]);

  async function doBan(userId) {
    setError("");
    try {
      await api("/api/admin/ban-user", { method: "POST", body: { userId, reason } });
      setBanFor(null);
      setReason("");
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function doUnban(userId) {
    setError("");
    try {
      await api("/api/admin/unban-user", { method: "POST", body: { userId } });
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-block">
      <div className="admin-toolbar">
        <input
          type="search"
          className="field admin-search"
          data-guide="users-search"
          placeholder={at("search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {!users ? (
        <p className="admin-muted">{at("loading")}</p>
      ) : users.length === 0 ? (
        <p className="admin-muted">{at("empty")}</p>
      ) : (
        <div className="admin-table-wrap" data-guide="users-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{at("colName")}</th>
                <th>{at("colEmail")}</th>
                <th>{at("colPhone")}</th>
                <th>{at("colSince")}</th>
                <th>{at("colLogin")}</th>
                <th>{at("colStatus")}</th>
                <th className="num">{at("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} data-guide="users-row" className={u.isBanned ? "is-banned" : undefined}>
                  <td>
                    {u.name || "—"}
                    {u.isAdmin ? <span className="admin-tag">{at("statAdmins")}</span> : null}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{fmtDate(u.lastLogin)}</td>
                  <td>
                    <span className={`admin-pill${u.isBanned ? " off" : " on"}`}>
                      {u.isBanned ? at("banned") : at("active")}
                    </span>
                  </td>
                  <td className="num">
                    {u.isBanned ? (
                      <button
                        type="button"
                        className="admin-mini pressable"
                        data-guide="users-unban"
                        onClick={() => doUnban(u.id)}
                      >
                        {at("unban")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-mini pressable danger"
                        data-guide="users-ban"
                        onClick={() => {
                          setBanFor(u);
                          setReason("");
                        }}
                      >
                        {at("ban")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {banFor ? (
        <Modal
          title={at("banTitle")}
          onClose={() => setBanFor(null)}
          footer={
            <>
              <button type="button" className="btn-ghost pressable" onClick={() => setBanFor(null)}>
                {at("cancel")}
              </button>
              <button
                type="button"
                className="btn-accent pressable"
                data-guide="users-ban-confirm"
                onClick={() => doBan(banFor.id)}
              >
                {at("confirm")}
              </button>
            </>
          }
        >
          <p className="admin-muted">{banFor.name}</p>
          <label className="admin-field">
            <span>{at("banReason")}</span>
            <input
              className="field"
              data-guide="users-ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </Modal>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- News */
const ICONS = ["", "🏷️", "🌸", "📅", "📣", "✨", "🎁"];

function NewsAdmin({ at }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState({ badge: "", icon: "", title: "", content: "", cta_label: "", cta_url: "" });

  const load = useCallback(
    () =>
      api("/api/admin/news")
        .then((d) => setItems(d.news || []))
        .catch((e) => {
          setItems([]);
          setError(e.message);
        }),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function publish(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/news", { method: "POST", body: form });
      setForm({ badge: "", icon: "", title: "", content: "", cta_label: "", cta_url: "" });
      setPreview(false);
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(at("newsDeleteConfirm"))) return;
    try {
      await api(`/api/admin/news/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-block admin-news">
      <form className="card admin-form" data-guide="news-form" onSubmit={publish}>
        <h2>{at("newsCompose")}</h2>
        <div className="admin-form-row">
          <label className="admin-field">
            <span>{at("newsBadge")}</span>
            <input
              className="field"
              data-guide="news-badge"
              value={form.badge}
              onChange={(e) => set("badge", e.target.value)}
              maxLength={40}
            />
          </label>
          <label className="admin-field">
            <span>{at("newsIcon")}</span>
            <select
              className="field"
              data-guide="news-icon"
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
            >
              {ICONS.map((i) => (
                <option key={i || "none"} value={i}>
                  {i || "—"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="admin-field">
          <span>{at("newsTitleField")}</span>
          <input
            className="field"
            data-guide="news-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={120}
          />
        </label>
        <label className="admin-field">
          <span>{at("newsContent")}</span>
          <textarea
            className="field"
            data-guide="news-content"
            rows={4}
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            maxLength={1000}
          />
        </label>
        <div className="admin-form-row">
          <label className="admin-field">
            <span>{at("newsCtaLabel")}</span>
            <input
              className="field"
              data-guide="news-cta-label"
              value={form.cta_label}
              onChange={(e) => set("cta_label", e.target.value)}
              maxLength={60}
            />
          </label>
          <label className="admin-field">
            <span>{at("newsCtaUrl")}</span>
            <input
              className="field"
              data-guide="news-cta-url"
              value={form.cta_url}
              onChange={(e) => set("cta_url", e.target.value)}
              maxLength={500}
            />
          </label>
        </div>

        {preview ? (
          <div className="admin-preview card" data-guide="news-preview">
            {form.icon ? <span className="admin-preview-icon">{form.icon}</span> : null}
            {form.badge ? <span className="admin-preview-badge">{form.badge}</span> : null}
            <strong>{form.title || at("newsTitleField")}</strong>
            <p>{form.content || at("newsContent")}</p>
          </div>
        ) : null}
        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-form-actions">
          <button
            type="button"
            className="btn-ghost pressable"
            data-guide="news-preview-btn"
            onClick={() => setPreview((p) => !p)}
          >
            {at("newsPreview")}
          </button>
          <button type="submit" className="btn-accent pressable" data-guide="news-publish" disabled={busy}>
            {busy ? at("loading") : at("newsPublish")}
          </button>
        </div>
      </form>

      <div className="admin-list" data-guide="news-list">
        <h2 className="admin-subhead">{at("newsList")}</h2>
        {!items ? (
          <p className="admin-muted">{at("loading")}</p>
        ) : items.length === 0 ? (
          <p className="admin-muted">{at("empty")}</p>
        ) : (
          <ul className="admin-cards">
            {items.map((n) => (
              <li key={n.id} className="card admin-news-item" data-guide="news-item">
                <div className="admin-news-head">
                  {n.icon ? <span className="admin-preview-icon">{n.icon}</span> : null}
                  <strong>{n.title}</strong>
                  {n.badge ? <span className="admin-tag">{n.badge}</span> : null}
                  {!n.is_active ? <span className="admin-pill off">{at("hidden")}</span> : null}
                </div>
                <p className="admin-muted">{n.content}</p>
                <div className="admin-news-foot">
                  <span className="admin-muted">{fmtDate(n.created_at)}</span>
                  <button
                    type="button"
                    className="admin-mini pressable danger"
                    data-guide="news-delete"
                    onClick={() => remove(n.id)}
                  >
                    {at("delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="admin-error">{error}</p> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- Hours */
/* Hours are stored as fractional numbers (9.5 = 09:30). The minute rounding
   has to wrap: a stored 18.999 rounds to 60, and "18:60" is not a time - a
   time input silently discards it and the row then saves as closed. */
function toTime(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    const total = Math.round(v * 60);
    if (!Number.isFinite(total)) return "";
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return String(v);
}

function Hours({ at }) {
  const [rows, setRows] = useState(null);
  const [tz, setTz] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/admin/store-hours")
      .then((d) => {
        const c = d.config || {};
        setRows(
          (c.schedule || []).map((r) => ({
            day: r.day,
            open: toTime(r.open),
            close: toTime(r.close),
            closed: r.open == null || r.close == null,
          })),
        );
        setTz(c.timezone || "");
        setNote(c.appointmentNote || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  const patch = (i, key, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  async function save(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      await api("/api/admin/store-hours", {
        method: "PUT",
        body: {
          schedule: rows.map((r) => ({
            day: r.day,
            open: r.closed || !r.open ? null : r.open,
            close: r.closed || !r.close ? null : r.close,
          })),
          timezone: tz,
          appointmentNote: note,
        },
      });
      setStatus(at("hoursSaved"));
    } catch (e2) {
      setError(e2.message);
    }
  }

  if (!rows) {
    return <p className="admin-muted">{error || at("loading")}</p>;
  }

  return (
    <form className="admin-block admin-hours card" data-guide="hours-form" onSubmit={save}>
      <p className="admin-muted">{at("hoursIntro")}</p>
      <div className="admin-hours-grid" data-guide="hours-grid">
        {rows.map((r, i) => (
          <div key={r.day} className={`admin-hours-row${r.closed ? " closed" : ""}`} data-guide="hours-row">
            <span className="admin-hours-day">{at(`day${i}`)}</span>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={r.closed}
                onChange={(e) => patch(i, "closed", e.target.checked)}
              />
              <span>{at("hoursClosed")}</span>
            </label>
            <label className="admin-time">
              <span>{at("hoursOpen")}</span>
              <input
                type="time"
                className="field"
                value={r.open}
                disabled={r.closed}
                onChange={(e) => patch(i, "open", e.target.value)}
              />
            </label>
            <label className="admin-time">
              <span>{at("hoursClose")}</span>
              <input
                type="time"
                className="field"
                value={r.close}
                disabled={r.closed}
                onChange={(e) => patch(i, "close", e.target.value)}
              />
            </label>
          </div>
        ))}
      </div>
      <div className="admin-form-row">
        <label className="admin-field">
          <span>{at("hoursTz")}</span>
          <input className="field" data-guide="hours-tz" value={tz} onChange={(e) => setTz(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>{at("hoursNote")}</span>
          <input className="field" data-guide="hours-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {status ? <p className="admin-ok">{status}</p> : null}
      <div className="admin-form-actions">
        <button type="submit" className="btn-accent pressable" data-guide="hours-save">
          {at("hoursSave")}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------- Notes */
function Notes({ at }) {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api("/api/admin/notes")
        .then((d) => setNotes(d.notes || []))
        .catch((e) => {
          setNotes([]);
          setError(e.message);
        }),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id) {
    try {
      await api(`/api/admin/notes/${id}/read`, { method: "PUT" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!window.confirm(at("notesDeleteConfirm"))) return;
    try {
      await api(`/api/admin/notes/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-block">
      <p className="admin-muted">{at("notesIntro")}</p>
      {error ? <p className="admin-error">{error}</p> : null}
      {!notes ? (
        <p className="admin-muted">{at("loading")}</p>
      ) : notes.length === 0 ? (
        <p className="admin-muted">{at("empty")}</p>
      ) : (
        <ul className="admin-notes" data-guide="notes-list">
          {notes.map((n) => (
            <li key={n.id} className={`card admin-note${n.is_read ? "" : " unread"}`} data-guide="notes-item">
              <div className="admin-note-head">
                <strong>{n.author_name || at("notesAnonymous")}</strong>
                <span className={`admin-pill${n.is_read ? " on" : " off"}`}>
                  {n.is_read ? at("notesRead") : at("notesUnread")}
                </span>
                <span className="admin-muted">{fmtDate(n.created_at)}</span>
              </div>
              <p className="admin-note-msg">{n.message}</p>
              <div className="admin-note-foot">
                {!n.is_read ? (
                  <button
                    type="button"
                    className="admin-mini pressable"
                    data-guide="notes-mark-read"
                    onClick={() => markRead(n.id)}
                  >
                    {at("notesMarkRead")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="admin-mini pressable danger"
                  data-guide="notes-delete"
                  onClick={() => remove(n.id)}
                >
                  {at("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- Shell */

/* Tab ids in display order. The active tab lives in the URL (?tab=notes) so the
   user menu's "Guest notes" entry — and any bookmark — can deep-link to it. */
const TAB_IDS = ["overview", "users", "loyalty", "news", "hours", "notes"];

export default function Admin() {
  const { isAdmin, ready } = useAuth();
  const { lang } = useI18n();
  const at = useCallback(
    (k) => (ADMIN_STR[lang] && ADMIN_STR[lang][k]) || ADMIN_STR.en[k] || k,
    [lang],
  );
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TAB_IDS.includes(requested) ? requested : "overview";
  const setTab = (id) => {
    const next = new URLSearchParams(params);
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };
  const [unread, setUnread] = useState(0);
  /* Bumped when the assistant changes something, which re-mounts the active
     panel so the admin sees the same result they would get from a reload. */
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    api("/api/admin/notes")
      .then((d) => setUnread((d.notes || []).filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [isAdmin]);

  if (!ready) {
    return (
      <main className="wrap section admin-page">
        <p className="admin-muted">{at("loading")}</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="wrap section admin-page admin-gate">
        <p className="eyebrow">Charme</p>
        <h1>{at("gateTitle")}</h1>
        <p className="admin-muted">{at("gateBody")}</p>
        <Link to="/auth" className="btn-accent pressable">
          {at("gateCta")}
        </Link>
      </main>
    );
  }

  const tabs = [
    ["overview", at("tabOverview")],
    ["users", at("tabUsers")],
    ["loyalty", at("tabLoyalty")],
    ["news", at("tabNews")],
    ["hours", at("tabHours")],
    ["notes", at("tabNotes")],
  ];

  /* data-guide hooks for the onboarding tours (see pages/guidesData.js).
     The back-office root itself carries `data-guide="admin"`. */
  const TAB_GUIDE = {
    users: "admin-users",
    loyalty: "loyalty-tab",
    news: "news-tab",
    hours: "hours-tab",
    notes: "notes-tab",
  };

  return (
    <main className="wrap section admin-page" data-guide="admin">
      <header className="admin-head">
        <p className="eyebrow">Charme</p>
        <h1>{at("title")}</h1>
      </header>

      <nav className="admin-tabs" data-guide="admin-tabs" role="tablist" aria-label={at("title")}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-guide={TAB_GUIDE[id]}
            role="tab"
            id={`admin-tab-${id}`}
            aria-controls="admin-tabpanel"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={tablistKeys(tab, setTab, tabs.map(([tid]) => tid), "admin-tab-")}
            className={`admin-tab pressable${tab === id ? " on" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "notes" && unread > 0 ? <span className="admin-badge">{unread}</span> : null}
          </button>
        ))}
      </nav>

      {/* Re-keyed on each assistant mutation so the open tab refetches. */}
      <div
        className="admin-body"
        key={revision}
        role="tabpanel"
        id="admin-tabpanel"
        aria-labelledby={`admin-tab-${tab}`}
      >
        {tab === "overview" ? <Overview at={at} /> : null}
        {tab === "users" ? <Users at={at} /> : null}
        {tab === "loyalty" ? <Loyalty at={at} /> : null}
        {tab === "news" ? <NewsAdmin at={at} /> : null}
        {tab === "hours" ? <Hours at={at} /> : null}
        {tab === "notes" ? <Notes at={at} /> : null}
      </div>

      {/* Charme Copilot — admin-only assistant. It lives on every admin tab
          (floating dock) and is gated by isAdmin above, so it never renders on
          the storefront. */}
      <AdminAssistant at={at} lang={lang} onMutated={() => setRevision((n) => n + 1)} />
    </main>
  );
}
