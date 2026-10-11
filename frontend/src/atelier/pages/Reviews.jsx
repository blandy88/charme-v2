import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Star,
  Trash2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { initials } from "../lib/text.js";
import "./reviews.css";

/*
 * Product reviews.
 *
 * The legacy kept one review UI per fragrance section — 185 of them — and
 * keyed rows by the fragrance slug. Here there is a single section on the PDP,
 * keyed by `product.slug`, talking to the same endpoints:
 *
 *   GET    /api/reviews/:fragrance          public   list
 *   GET    /api/reviews/likes/:fragrance    auth     my votes
 *   GET    /api/reviews/:id/replies         public   thread
 *   POST   /api/reviews                     auth     create
 *   PUT    /api/reviews/update              auth     edit (owner or admin)
 *   DELETE /api/reviews/delete              auth     delete (owner or admin)
 *   POST   /api/reviews/like                auth     vote toggle
 *   POST   /api/reviews/:id/replies         auth     reply
 *   POST   /api/replies/:id/like            auth     vote toggle
 *   DELETE /api/replies/:id                 auth     reply delete
 *
 * Server validation is mirrored here so the copy stays in the visitor's
 * language when something is wrong; the server's English strings are only used
 * when a rule we did not mirror fails.
 */

const VISIBLE = 4;
const MIN_TEXT = 10;
const MAX_TEXT = 500;
const MIN_REPLY = 3;

function avatarOf(row) {
  for (const candidate of [row.avatar_url, row.user_avatar]) {
    if (typeof candidate === "string" && /^(https?:\/\/|\/)/.test(candidate)) return candidate;
  }
  return null;
}

function displayName(row) {
  const joined = `${row.first_name || ""} ${row.last_name || ""}`.trim();
  return row.user_name || joined || "—";
}

/* Timestamps arrive as "YYYY-MM-DD HH:MM:SS" in UTC (Postgres/SQLite). */
function formatDate(value, locale) {
  if (!value) return "";
  const s = String(value);
  const iso = s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function localeFor(lang) {
  return lang === "ar" ? "ar-TN" : lang === "fr" ? "fr-FR" : "en-GB";
}

function Stars({ value, size = 14, className = "" }) {
  const filled = Math.round(value);
  return (
    <span className={`rv-stars${className ? " " + className : ""}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} strokeWidth={1.5} className={n <= filled ? "on" : undefined} />
      ))}
    </span>
  );
}

/* Five buttons with a hover preview; keyboard focus previews too. */
function StarPicker({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div
      className="rv-picker"
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}/5`}
          className={`rv-pick pressable${n <= active ? " on" : ""}`}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => {
            onChange(n);
            setHover(0);
          }}
        >
          <Star size={24} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, mine, onVote, onEdit, onDelete, t, locale }) {
  const { user, isAdmin } = useAuth();
  const [openReplies, setOpenReplies] = useState(false);
  const avatar = avatarOf(review);
  const name = displayName(review);
  const owner = Boolean(user && Number(user.id) === Number(review.user_id));
  const mayEdit = owner;
  const mayDelete = owner || isAdmin;
  const edited = Number(review.is_edited) === 1 || Boolean(review.updated_at && review.updated_at !== review.created_at);

  return (
    <article className="rv-item">
      <header className="rv-item-head">
        <span className="rv-avatar" aria-hidden="true">
          {avatar ? (
            <img src={avatar} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          ) : (
            <span>{initials(name)}</span>
          )}
        </span>
        <span className="rv-who">
          <span className="rv-name">
            {name}
            {Number(review.is_admin) === 1 ? <em className="rv-badge">{t("rvStaff")}</em> : null}
          </span>
          <span className="rv-meta">
            <Stars value={Number(review.rating) || 0} size={13} />
            <time dateTime={review.created_at || undefined}>{formatDate(review.created_at, locale)}</time>
            {edited ? <em className="rv-edited">{t("rvEdited")}</em> : null}
          </span>
        </span>
        {mayEdit || mayDelete ? (
          <span className="rv-actions">
            {mayEdit ? (
              <button type="button" className="rv-icon pressable" onClick={() => onEdit(review)} aria-label={t("rvEdit")} title={t("rvEdit")}>
                <Pencil size={14} aria-hidden="true" />
              </button>
            ) : null}
            {mayDelete ? (
              <button type="button" className="rv-icon pressable danger" onClick={() => onDelete(review)} aria-label={t("rvDelete")} title={t("rvDelete")}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            ) : null}
          </span>
        ) : null}
      </header>

      <p className="rv-text">{review.review_text}</p>

      <footer className="rv-foot">
        <button
          type="button"
          className={`rv-vote pressable${mine === "like" ? " on" : ""}`}
          onClick={() => onVote(review, "like")}
          disabled={!user}
          aria-pressed={mine === "like"}
        >
          <ThumbsUp size={14} aria-hidden="true" />
          <span>{Number(review.likes) || 0}</span>
        </button>
        <button
          type="button"
          className={`rv-vote pressable${mine === "dislike" ? " on" : ""}`}
          onClick={() => onVote(review, "dislike")}
          disabled={!user}
          aria-pressed={mine === "dislike"}
        >
          <ThumbsDown size={14} aria-hidden="true" />
          <span>{Number(review.dislikes) || 0}</span>
        </button>
        <button
          type="button"
          className="rv-reply-toggle pressable"
          onClick={() => setOpenReplies((v) => !v)}
          aria-expanded={openReplies}
        >
          <MessageSquare size={14} aria-hidden="true" />
          {t("rvReplies")}
        </button>
      </footer>

      {openReplies ? <ReplyThread reviewId={review.id} t={t} locale={locale} /> : null}
    </article>
  );
}

function ReplyThread({ reviewId, t, locale }) {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState(null);
  const [text, setText] = useState("");
  const [parent, setParent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    api(`/api/reviews/${reviewId}/replies`, { auth: false })
      .then((d) => {
        if (alive) setRows(d && d.replies ? d.replies : []);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [reviewId]);

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (body.length < MIN_REPLY) {
      setNotice(t("rvReplyShort"));
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const res = await api(`/api/reviews/${reviewId}/replies`, {
        method: "POST",
        body: { reply_text: body, parent_reply_id: parent ? parent.id : null },
      });
      if (res && res.reply) setRows((list) => [...(list || []), res.reply]);
      setText("");
      setParent(null);
    } catch (err) {
      setNotice(err && err.status === 429 ? t("rvSlow") : t("rvFail"));
    } finally {
      setBusy(false);
    }
  };

  const vote = async (reply, likeType) => {
    if (!user) return;
    try {
      const res = await api(`/api/replies/${reply.id}/like`, { method: "POST", body: { likeType } });
      setRows((list) =>
        (list || []).map((r) => (r.id === reply.id ? { ...r, likes: res.likes, dislikes: res.dislikes } : r)),
      );
    } catch {
      /* the global handler already reacted if the session lapsed */
    }
  };

  const remove = async (reply) => {
    if (!window.confirm(t("rvConfirmDelete"))) return;
    try {
      await api(`/api/replies/${reply.id}`, { method: "DELETE" });
      setRows((list) => (list || []).filter((r) => r.id !== reply.id));
    } catch {
      /* ignore */
    }
  };

  const nameOf = (reply) => displayName(reply);

  return (
    <div className="rv-thread">
      {rows === null ? (
        <p className="rv-thread-loading">
          <Loader2 size={14} className="rv-spin" aria-hidden="true" />
          {t("rvLoading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="rv-thread-empty">{t("rvNoReplies")}</p>
      ) : (
        <ul className="rv-replies">
          {rows.map((reply) => {
            const owner = Boolean(user && Number(user.id) === Number(reply.user_id));
            const avatar = avatarOf(reply);
            return (
              <li key={reply.id} className={`rv-reply${reply.parent_reply_id ? " nested" : ""}`}>
                <span className="rv-avatar small" aria-hidden="true">
                  {avatar ? (
                    <img src={avatar} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{initials(nameOf(reply))}</span>
                  )}
                </span>
                <div className="rv-reply-body">
                  <p className="rv-reply-head">
                    <span className="rv-name">
                      {nameOf(reply)}
                      {Number(reply.is_admin) === 1 ? <em className="rv-badge">{t("rvStaff")}</em> : null}
                    </span>
                    <time dateTime={reply.created_at || undefined}>{formatDate(reply.created_at, locale)}</time>
                  </p>
                  <p className="rv-reply-text">{reply.reply_text}</p>
                  <p className="rv-reply-foot">
                    <button
                      type="button"
                      className="rv-vote tiny pressable"
                      onClick={() => vote(reply, "like")}
                      disabled={!user}
                    >
                      <ThumbsUp size={12} aria-hidden="true" />
                      <span>{Number(reply.likes) || 0}</span>
                    </button>
                    <button
                      type="button"
                      className="rv-vote tiny pressable"
                      onClick={() => vote(reply, "dislike")}
                      disabled={!user}
                    >
                      <ThumbsDown size={12} aria-hidden="true" />
                      <span>{Number(reply.dislikes) || 0}</span>
                    </button>
                    {user ? (
                      <button
                        type="button"
                        className="rv-link pressable"
                        onClick={() => setParent({ id: reply.id, name: nameOf(reply) })}
                      >
                        {t("rvReply")}
                      </button>
                    ) : null}
                    {owner || isAdmin ? (
                      <button type="button" className="rv-link pressable danger" onClick={() => remove(reply)}>
                        {t("rvDelete")}
                      </button>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {user ? (
        <form className="rv-reply-form" onSubmit={send}>
          {parent ? (
            <p className="rv-reply-to">
              {t("rvReplyingTo")} <strong>{parent.name}</strong>
              <button type="button" className="rv-link pressable" onClick={() => setParent(null)}>
                {t("rvCancel")}
              </button>
            </p>
          ) : null}
          <div className="rv-reply-row">
            <input
              className="field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("rvReplyPlaceholder")}
              maxLength={1000}
              aria-label={t("rvReplyPlaceholder")}
            />
            <button type="submit" className="btn-accent pressable rv-reply-send" disabled={busy}>
              {busy ? <Loader2 size={15} className="rv-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              {t("rvSend")}
            </button>
          </div>
          {notice ? <p className="rv-notice warn" role="status">{notice}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

export default function Reviews({ product }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const key = product.slug || product.id;
  const locale = localeFor(lang);

  const [rows, setRows] = useState(null);
  const [votes, setVotes] = useState({});
  const [shown, setShown] = useState(VISIBLE);
  const [composing, setComposing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = () => {
    api(`/api/reviews/${encodeURIComponent(key)}`, { auth: false })
      .then((d) => setRows(d && Array.isArray(d.reviews) ? d.reviews : []))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    setRows(null);
    setShown(VISIBLE);
    setComposing(false);
    setEditId(null);
    setNotice(null);
    setRating(0);
    setText("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!user) {
      setVotes({});
      return undefined;
    }
    let alive = true;
    api(`/api/reviews/likes/${encodeURIComponent(key)}`)
      .then((d) => {
        if (alive) setVotes(d && d.likes ? d.likes : {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key, user]);

  const stats = useMemo(() => {
    const list = rows || [];
    if (!list.length) return null;
    const counts = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of list) {
      const v = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      counts[v - 1] += 1;
      sum += v;
    }
    return { total: list.length, avg: sum / list.length, counts };
  }, [rows]);

  const closeComposer = () => {
    setComposing(false);
    setEditId(null);
    setRating(0);
    setText("");
  };

  const openNew = () => {
    setEditId(null);
    setRating(0);
    setText("");
    setNotice(null);
    setComposing(true);
  };

  const openEdit = (review) => {
    setEditId(review.id);
    setRating(Number(review.rating) || 0);
    setText(review.review_text || "");
    setNotice(null);
    setComposing(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!rating) {
      setNotice({ kind: "warn", msg: t("rvNeedStars") });
      return;
    }
    if (body.length < MIN_TEXT || body.length > MAX_TEXT) {
      setNotice({ kind: "warn", msg: t("rvNeedText") });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (editId) {
        await api("/api/reviews/update", {
          method: "PUT",
          body: { reviewId: editId, fragrance: key, text: body, rating },
        });
        setRows((list) =>
          (list || []).map((r) =>
            r.id === editId ? { ...r, rating, review_text: body, is_edited: 1, updated_at: new Date().toISOString() } : r,
          ),
        );
        setNotice({ kind: "ok", msg: t("rvUpdated") });
      } else {
        const res = await api("/api/reviews", {
          method: "POST",
          body: { fragrance: key, rating, review_text: body },
        });
        if (res && res.review) setRows((list) => [res.review, ...(list || [])]);
        else load();
        setNotice({ kind: "ok", msg: t("rvPosted") });
      }
      closeComposer();
    } catch {
      setNotice({ kind: "warn", msg: t("rvFail") });
    } finally {
      setBusy(false);
    }
  };

  const vote = async (review, likeType) => {
    if (!user) return;
    try {
      const res = await api("/api/reviews/like", { method: "POST", body: { reviewId: review.id, likeType } });
      setRows((list) =>
        (list || []).map((r) => (r.id === review.id ? { ...r, likes: res.likes, dislikes: res.dislikes } : r)),
      );
      setVotes((v) => {
        const next = { ...v };
        if (next[review.id] === likeType) delete next[review.id];
        else next[review.id] = likeType;
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const remove = async (review) => {
    if (!window.confirm(t("rvConfirmDelete"))) return;
    try {
      await api("/api/reviews/delete", { method: "DELETE", body: { reviewId: review.id, fragrance: key } });
      setRows((list) => (list || []).filter((r) => r.id !== review.id));
      setNotice({ kind: "ok", msg: t("rvDeleted") });
    } catch {
      setNotice({ kind: "warn", msg: t("rvFail") });
    }
  };

  const remaining = rows ? rows.length - shown : 0;

  return (
    <section className="pdp-block rv" id="reviews">
      <div className="rv-head">
        <h2 className="pdp-h2">{t("rvTitle")}</h2>
        {stats ? (
          <div className="rv-summary">
            <p className="rv-avg">
              <strong>{stats.avg.toFixed(1)}</strong>
              <Stars value={stats.avg} size={16} />
            </p>
            <p className="rv-avg-note">
              {t("rvBasedOn")} <strong>{stats.total}</strong> {stats.total === 1 ? t("rvReview") : t("rvReviews")}
            </p>
            <ul className="rv-dist">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = stats.counts[n - 1];
                const pct = Math.round((c / stats.total) * 100);
                return (
                  <li key={n}>
                    <span className="rv-dist-n">{n}</span>
                    <Star size={11} aria-hidden="true" />
                    <span className="rv-dist-track">
                      <span className="rv-dist-fill" style={{ inlineSize: `${pct}%` }} />
                    </span>
                    <span className="rv-dist-c">{c}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {notice && !composing ? (
        <p className={`rv-notice ${notice.kind}`} role="status">
          {notice.msg}
        </p>
      ) : null}

      {!user ? (
        <p className="rv-gate">
          <Link to="/auth" className="rv-gate-link pressable">
            {t("rvSignIn")}
          </Link>{" "}
          {t("rvToReview")}
        </p>
      ) : composing ? (
        <form className="rv-form panel" onSubmit={submit}>
          <p className="rv-form-title">{editId ? t("rvEditTitle") : t("rvWriteTitle")}</p>
          <StarPicker value={rating} onChange={setRating} label={t("rvYourRating")} />
          <textarea
            className="field rv-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("rvPlaceholder")}
            maxLength={MAX_TEXT}
            rows={4}
            aria-label={t("rvPlaceholder")}
          />
          <div className="rv-form-foot">
            <span className={`rv-count${text.trim().length > 0 && text.trim().length < MIN_TEXT ? " short" : ""}`}>
              {text.length}/{MAX_TEXT}
            </span>
            <span className="rv-form-buttons">
              <button type="button" className="btn-ghost pressable" onClick={closeComposer} disabled={busy}>
                {t("rvCancel")}
              </button>
              <button type="submit" className="btn-accent pressable" disabled={busy}>
                {busy ? <Loader2 size={15} className="rv-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                {editId ? t("rvSave") : t("rvPost")}
              </button>
            </span>
          </div>
          {notice ? (
            <p className={`rv-notice ${notice.kind}`} role="status">
              {notice.msg}
            </p>
          ) : null}
        </form>
      ) : (
        <button type="button" className="btn-ghost pressable rv-new" onClick={openNew}>
          <Pencil size={15} aria-hidden="true" />
          {t("rvWrite")}
        </button>
      )}

      {rows === null ? (
        <p className="rv-loading">
          <Loader2 size={16} className="rv-spin" aria-hidden="true" />
          {t("rvLoading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="rv-empty">{t("rvEmpty")}</p>
      ) : (
        <>
          <ul className="rv-list">
            {rows.slice(0, shown).map((review) => (
              <li key={review.id}>
                <ReviewCard
                  review={review}
                  mine={votes[review.id]}
                  onVote={vote}
                  onEdit={openEdit}
                  onDelete={remove}
                  t={t}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
          {remaining > 0 ? (
            <button type="button" className="btn-ghost pressable rv-more" onClick={() => setShown((n) => n + VISIBLE)}>
              <ChevronDown size={15} aria-hidden="true" />
              {t("rvMore")}
              <span className="rv-more-count">{remaining}</span>
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
