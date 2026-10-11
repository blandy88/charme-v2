import { useEffect } from "react";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { useNews } from "../../contexts/NewsContext.jsx";
import "./news.css";

/* SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC. */
function fmtDate(value) {
  if (!value) return "";
  const s = String(value);
  const iso = s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

/* CTA links are authored in the admin composer and may be site-relative. */
function resolveHref(url) {
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("/app") && !url.startsWith("//")) return `/app${url}`;
  return url;
}

export default function News() {
  const { t } = useI18n();
  const { items, markAllRead } = useNews();

  /* Opening the feed is what clears the navbar badge. */
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <main className="wrap section news-page">
      <header className="news-head">
        <p className="eyebrow">Charme</p>
        <h1>{t("newsTitle")}</h1>
        <p className="news-sub">{t("newsSub")}</p>
      </header>

      {items.length === 0 ? (
        <div className="news-empty card">
          <h2>{t("newsEmpty")}</h2>
          <p>{t("newsEmptyBody")}</p>
        </div>
      ) : (
        <ul className="news-feed">
          {items.map((n) => (
            <li key={n.id} className="news-card card">
              <div className="news-card-head">
                {n.icon ? (
                  <span className="news-icon" aria-hidden="true">
                    {n.icon}
                  </span>
                ) : null}
                {n.badge ? <span className="news-badge">{n.badge}</span> : null}
                <time className="news-date" dateTime={n.created_at}>
                  {fmtDate(n.created_at)}
                </time>
              </div>
              <h2>{n.title}</h2>
              <p className="news-body">{n.content}</p>
              {n.cta_label && n.cta_url ? (
                <a className="news-cta btn-accent pressable" href={resolveHref(n.cta_url)}>
                  {n.cta_label}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
