import { useEffect } from "react";

/* Shared admin primitives. Kept out of Admin.jsx so AdminLoyalty.jsx can use
   them without importing from the module that imports it. */

/* The server returns SQLite timestamps ("YYYY-MM-DD HH:MM:SS", UTC). */
export function fmtDate(value) {
  if (!value) return "—";
  const s = String(value);
  const iso = s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="admin-scrim" aria-label="Close" onClick={onClose} />
      <div className="admin-modal-card panel">
        <header className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" className="admin-x pressable" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer ? <footer className="admin-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Stat({ label, value }) {
  return (
    <div className="admin-stat card">
      <strong>{value == null ? "—" : value}</strong>
      <span>{label}</span>
    </div>
  );
}
