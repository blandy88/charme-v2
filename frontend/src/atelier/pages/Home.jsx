import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";
import "./home.css";

const OSM_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=11.0859%2C36.8355%2C11.1060%2C36.8515&layer=mapnik&marker=36.843530%2C11.095981";

/*
 * The 185 sections come from home-sections.json, which is the homepage HTML
 * extracted (brand, name, image, price, qualities, tiers, metrics, indicators).
 * It is NOT fragrances.json: only 18 of these 185 slugs exist in the 752-item
 * catalogue, so rendering the homepage from the catalogue would drop 167 of
 * them. See docs/migration-plan-legacy-to-react.md, Finding 1.
 */
function useSections() {
  const [sections, setSections] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/data/home-sections.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setSections(d.sections || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return sections;
}

/* "Leave a note" — the hero's visitor form. Public, rate-limited, posts to the
   real /api/notes route. */
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
    <form className="note-card card" onSubmit={submit}>
      <p className="eyebrow">{t("noteEyebrow")}</p>
      <h2 className="note-title">{t("noteTitle")}</h2>
      <label className="note-field">
        <span>{t("noteName")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
      </label>
      <label className="note-field">
        <span>{t("noteMessage")}</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required rows={3} />
      </label>
      <button type="submit" className="btn-accent pressable" disabled={state === "sending"}>
        {state === "sending" ? t("noteSending") : t("noteSend")}
      </button>
      {state === "sent" ? <p className="note-status ok">{t("noteSent")}</p> : null}
      {state === "error" ? <p className="note-status err">{t("noteFail")}</p> : null}
    </form>
  );
}

/* Concierge card: phone / WhatsApp / address / hours, plus the store map. */
function Concierge() {
  const { t } = useI18n();
  return (
    <div className="concierge card">
      <p className="eyebrow">{t("footerVisit")}</p>
      <ul className="concierge-list">
        <li>
          <span>{t("phoneLabel")}</span>
          <a href="tel:+21654786930">54 786 930</a>
        </li>
        <li>
          <span>WhatsApp</span>
          <a href="https://wa.me/21654786930" target="_blank" rel="noopener noreferrer">54 786 930</a>
        </li>
        <li>
          <span>{t("addressLabel")}</span>
          <span>Kélibia, Tunisia</span>
        </li>
        <li>
          <span>{t("hoursLabel")}</span>
          <span>{t("hoursValue")}</span>
        </li>
      </ul>
      <div className="concierge-map">
        <iframe
          title={t("mapTitle")}
          src={OSM_EMBED}
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

export default function Home() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const sections = useSections();
  const houses = sections ? new Set(sections.map((s) => s.brand).filter(Boolean)).size : null;

  return (
    <main>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <img
            src={theme === "light" ? "/hero-bg.jpg" : "/hero-bg-night.jpg"}
            alt=""
            fetchPriority="high"
          />
        </div>
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <h1 className="hero-title">
              {t("heroTitleA")}
              <br />
              <span className="accent">{t("heroTitleB")}</span>
            </h1>
            <p className="hero-sub">{t("heroSub")}</p>
            <div className="hero-ctas">
              <Link to="/collection" className="btn-accent pressable">{t("heroCta")}</Link>
              <Link to="/contact" className="btn-ghost pressable">{t("heroSecondary")}</Link>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{sections ? sections.length : "185"}</strong>
                <span>{t("statPieces")}</span>
              </div>
              <div>
                <strong>{houses ?? "–"}</strong>
                <span>{t("statHouses")}</span>
              </div>
              <div>
                <strong>1521</strong>
                <span>{t("statNotes")}</span>
              </div>
            </div>
          </div>
          <figure className="hero-visual">
            <img
              src={theme === "light" ? "/hero-bg.jpg" : "/hero-bg-night.jpg"}
              alt="Parfumerie Charme"
              loading="eager"
              decoding="async"
            />
            <figcaption>{t("heroCaption")}</figcaption>
          </figure>
        </div>

        <div className="wrap hero-contact">
          <NoteForm />
          <Concierge />
        </div>
      </section>

      <section className="wrap section visit">
        <div className="card visit-card reveal">
          <div>
            <p className="eyebrow">Kélibia</p>
            <h2>{t("visitTitle")}</h2>
            <p className="visit-body">{t("visitBody")}</p>
            <div className="hero-ctas">
              <Link to="/contact" className="btn-accent pressable">{t("contact")}</Link>
              <a
                className="btn-ghost pressable"
                href="https://www.google.com/maps?q=36.843530,11.095981&z=15"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("openMap")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
