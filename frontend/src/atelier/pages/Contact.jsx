import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, MessageSquare, Phone } from "lucide-react";
import { api } from "../../api/client.js";
import { useI18n } from "../../contexts/I18nContext.jsx";
import "./contact.css";

/* Contact, /app/contact.
 *
 * Legacy had no contact page at all: the nav's "Contact" was href="#" and the
 * real contact surfaces were the footer and the hero note form. Rather than
 * invent a channel the shop does not have, this page is those two things in
 * one place — the visitor's note (the same public /api/notes route the hero
 * form posts to) beside the details that were in the footer, with the week's
 * hours read live from /api/store-hours so the page shows whatever the shop
 * has set in the console rather than a hard-coded schedule.
 */

const DAY_KEYS = ["daySunday", "dayMonday", "dayTuesday", "dayWednesday", "dayThursday", "dayFriday", "daySaturday"];
const DEFAULT_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* Hours arrive as numbers (9, 9.5, 18.75) or "HH:MM" strings — the admin
   console accepts both, so the formatter has to as well. The minute rounding
   wraps too: rounding the total first means 18.999 becomes 19:00 rather than
   the impossible "19:60" the customer would otherwise be shown. */
function clock(value) {
  if (value === null || value === undefined || value === "") return null;
  const total =
    typeof value === "number"
      ? Math.round(value * 60)
      : Math.round(Number(String(value).split(":")[0]) * 60) +
        (Number(String(value).split(":")[1]) || 0);
  if (!Number.isFinite(total)) return null;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function NoteForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("idle");

  async function submit(e) {
    e.preventDefault();
    if (!message.trim() || state === "sending") return;
    setState("sending");
    try {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, message }),
      });
      if (!r.ok) throw new Error("failed");
      setState("sent");
      setName("");
      setMessage("");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="ct-note card" onSubmit={submit}>
      <p className="eyebrow">
        <MessageSquare size={13} aria-hidden="true" /> {t("noteEyebrow")}
      </p>
      <h2>{t("noteTitle")}</h2>
      <label className="ct-field">
        <span>{t("noteName")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
      </label>
      <label className="ct-field">
        <span>{t("noteMessage")}</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required rows={4} />
      </label>
      <div className="ct-field-foot">
        <span className={`ct-count ${message.length > 900 ? "warn" : ""}`}>{1000 - message.length}</span>
        <button type="submit" className="btn-accent pressable" disabled={state === "sending"}>
          {state === "sending" ? t("noteSending") : t("noteSend")}
        </button>
      </div>
      {state === "sent" ? <p className="ct-status ok">{t("noteSent")}</p> : null}
      {state === "error" ? <p className="ct-status err">{t("noteFail")}</p> : null}
    </form>
  );
}

function Hours() {
  const { t } = useI18n();
  const [config, setConfig] = useState(null);
  const today = new Date().getDay();

  useEffect(() => {
    let alive = true;
    api("/api/store-hours", { auth: false })
      .then((d) => {
        if (alive) setConfig(d && d.config ? d.config : null);
      })
      .catch(() => {
        if (alive) setConfig(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = (config && Array.isArray(config.schedule) ? config.schedule : []).slice(0, 7);

  return (
    <div className="ct-hours card">
      <p className="eyebrow">
        <Clock size={13} aria-hidden="true" /> {t("hoursLabel")}
      </p>
      {rows.length ? (
        <ul className="ct-week">
          {rows.map((row, i) => {
            const open = clock(row.open);
            const close = clock(row.close);
            return (
              <li key={row.day || DEFAULT_DAYS[i]} className={`${i === today ? "now" : ""} ${open ? "" : "shut"}`}>
                <span className="ct-day">{t(DAY_KEYS[i]) || DEFAULT_DAYS[i]}</span>
                <span className="ct-time">{open && close ? `${open} – ${close}` : t("closedToday")}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ct-hours-fallback">{t("hoursValue")}</p>
      )}
      {config?.timezone ? <p className="ct-tz">{config.timezone}</p> : null}
      {config?.appointmentNote ? <p className="ct-appt">{config.appointmentNote}</p> : null}
    </div>
  );
}

function Details() {
  const { t } = useI18n();
  return (
    <div className="ct-details card">
      <p className="eyebrow">{t("contact")}</p>
      <ul className="ct-list">
        <li>
          <Phone size={14} aria-hidden="true" />
          <span>{t("phoneLabel")}</span>
          <a href="tel:+21654786930">54 786 930</a>
        </li>
        <li>
          <MessageSquare size={14} aria-hidden="true" />
          <span>WhatsApp</span>
          <a href="https://wa.me/21654786930" target="_blank" rel="noopener noreferrer">
            54 786 930
          </a>
        </li>
        <li>
          <MapPin size={14} aria-hidden="true" />
          <span>{t("addressLabel")}</span>
          <span>Kélibia, Tunisia</span>
        </li>
      </ul>
      <div className="ct-map">
        <iframe
          title={t("mapTitle")}
          src="https://www.openstreetmap.org/export/embed.html?bbox=11.0859%2C36.8355%2C11.1060%2C36.8515&layer=mapnik&marker=36.843530%2C11.095981"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <a
        className="btn-ghost pressable"
        href="https://www.google.com/maps?q=36.843530,11.095981&z=15"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("openMap")}
      </a>
    </div>
  );
}

export default function Contact() {
  const { t } = useI18n();
  return (
    <main className="wrap section ct">
      <p className="eyebrow">{t("contact")}</p>
      <h1 className="ct-title">{t("contactTitle")}</h1>
      <p className="ct-lede">{t("contactLede")}</p>

      <div className="ct-grid">
        <NoteForm />
        <div className="ct-side">
          <Hours />
          <Details />
        </div>
      </div>

      <p className="ct-foot">
        {t("contactFoot")}
        <Link to="/collection" className="ct-foot-link">
          {t("collection")}
        </Link>
      </p>
    </main>
  );
}
