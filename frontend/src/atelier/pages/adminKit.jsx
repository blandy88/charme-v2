import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "../lib/useDialogFocus.js";

/* Shared primitives for the admin console and the loyalty surfaces. Kept out
   of Admin.jsx so AdminLoyalty.jsx can use them without a circular import. */

/* The server returns SQLite timestamps ("YYYY-MM-DD HH:MM:SS", UTC). */
export function fmtDate(value) {
  if (!value) return "—";
  const s = String(value);
  const iso = s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

/* Parse every timestamp the two databases can return.
 *   SQLite  "2026-11-06 17:55:39"
 *   Postgres "2026-11-06 17:55:39.602046+00"
 *   overlay  "2026-11-07T12:34:56.789Z.00001"  <- services/perfumeAdmin.js
 *            appends a monotonic sequence after the Z so two writes in the
 *            same millisecond still sort. Date.parse() rejects that suffix, so
 *            the admin table used to print the raw stamp and the "Recently
 *            changed" sort compared NaN === NaN. Strip it first. */
export function parseDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  let iso = raw.replace(/([zZ])\.\d+$/, "$1").replace(" ", "T");
  iso = iso.replace(/([+-]\d{2})$/, "$1:00");
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso)) iso += "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* Date AND time. A date alone hides two movements on the same afternoon —
   which is exactly how an accidental double-click shows up. Postgres returns
   "2026-11-06 17:55:39.602046+00" and SQLite "2026-11-06 17:55:39", so the
   short offset is normalised before parsing. ONE formatter for the admin
   table, the customer card and the profile history: the same ledger row must
   not read three different ways in three places. */
export function fmtDateTime(value) {
  if (!value) return "—";
  const d = parseDateTime(value);
  if (!d) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* PARITY 2026-11-07 — "synchronous". A long-lived tab used to fetch its
   loyalty data once on mount and never again, so a point stamped at the
   register stayed invisible until a full reload. Every loyalty surface now
   refreshes on the same schedule: poll, tab becoming visible, window focus.
   The ref is synchronous, so two triggers landing in the same tick cannot
   start overlapping loads; hidden tabs are skipped entirely. */
export function useLiveRefresh(load, { intervalMs = 30000, active = true } = {}) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return Promise.resolve();
    inFlight.current = true;
    return Promise.resolve()
      .then(() => loadRef.current())
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") refresh();
    }, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [active, intervalMs, refresh]);

  return refresh;
}

export function Modal({ title, onClose, children, footer }) {
  const card = useRef(null);
  useDialogFocus(card, { initialFocus: ".admin-x" });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Portalled to <body> on purpose. `position: fixed` is only viewport-relative
     while no ancestor establishes a containing block. The admin page sits
     inside `.stage > main > *`, which carries the `page-rise` animation with
     `animation-fill-mode: both`; that leaves an identity transform on the
     wrapper, so a fixed dialog was positioned inside the 1160px-tall page and
     its footer landed below the fold on every phone. A portal is the only fix
     that does not depend on the transition's current phase. */
  return createPortal(
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="admin-scrim" aria-label="Close" onClick={onClose} />
      <div className="admin-modal-card panel" ref={card}>
        <header className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" className="admin-x pressable" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer ? <footer className="admin-modal-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Stat({ label, value, guide }) {
  return (
    <div className="admin-stat card" data-guide={guide}>
      <strong>{value == null ? "—" : value}</strong>
      <span>{label}</span>
    </div>
  );
}
