import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";
import "./home.css";

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

export default function Home() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const sections = useSections();
  const featured = (sections || []).slice(0, 8);
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
        <div className="wrap hero-channels">
          <a href="tel:+21654786930">54 786 930</a>
          <a href="https://wa.me/21654786930" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href="https://www.google.com/maps?q=36.843530,11.095981&z=15" target="_blank" rel="noopener noreferrer">{t("openMap")}</a>
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("featuredSub")}</p>
            <h2>{t("featuredTitle")}</h2>
          </div>
          <Link to="/collection">{t("viewAll")}</Link>
        </div>
        <div className="featured-grid reveal-group">
          {featured.map((s) => (
            <Link key={s.slug} to="/collection" className="feat-card virtual-block pressable">
              <div className="feat-media">
                {s.image ? (
                  <img src={s.image} alt={`${s.name} bottle`} loading="lazy" decoding="async" />
                ) : null}
              </div>
              <p className="eyebrow">{s.brand}</p>
              <h3>{s.name}</h3>
              <p className="feat-price">{s.price} {s.unit || "dt"}</p>
            </Link>
          ))}
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
