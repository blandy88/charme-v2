/*
 * One original homepage product section.
 *
 * The legacy document is 185 of these, carrying 92.6% of its bytes: image,
 * house + location, name, price badge, concentration/quality options, note
 * strength bars, the three-stage note pyramid and the mood/season indicators.
 * This renders that same anatomy in the Atelier design language, from
 * home-sections.json -- which is the extracted HTML, not the 752-item
 * catalogue (only 18 slugs overlap, so the catalogue cannot stand in).
 *
 * These are rendered inline and deliberately NOT linked to /collection/:id:
 * 167 of the 185 slugs do not exist in the catalogue. Linking them would 404.
 */
import { useState } from "react";
import { FavoriteButton } from "../../contexts/FavoritesContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { initials } from "../lib/text.js";

const TIER_KEY = [
  [/top/i, "pdTop"],
  [/middle|heart|coeur|cœur/i, "pdMiddle"],
  [/base|fond/i, "pdBase"],
];

function tierLabel(label, t) {
  for (const [re, key] of TIER_KEY) if (re.test(label || "")) return t(key);
  return label;
}

export default function Piece({ section }) {
  const { t } = useI18n();
  const [broken, setBroken] = useState(false);
  const s = section;
  const metrics = s.metrics || [];
  const tiers = s.tiers || [];
  const qualities = s.qualities || [];
  /* The original block carries the full indicator row: mood (love…hate),
     season (winter…fall) and the vibe tags that some sections add
     (Evening, Refined, Bold…). 55 sections also carry day/night. Render the
     whole vocabulary rather than guessing at a subset. */
  const indicators = s.indicators || [];
  const max = Math.max(...metrics.map((m) => Number(m.value) || 0), 1);

  return (
    <article className="piece" id={`piece-${s.slug}`}>
      <header className="piece-head">
        <p className="piece-house">
          <span>{s.brand}</span>
          {s.brandLocation ? <span className="piece-loc">{s.brandLocation}</span> : null}
        </p>
        <h3 className="piece-name">{s.name}</h3>
      </header>

      <div className="piece-grid">
        <figure className="piece-media">
          {s.image && !broken ? (
            <img
              src={s.image}
              alt={`${s.brand} ${s.name}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="piece-bottle" aria-hidden="true">
              <span className="piece-mark">{initials(s.name)}</span>
            </span>
          )}
          <FavoriteButton
            product={{ id: s.slug, name: s.name, brand: s.brand, slug: s.slug }}
            className="piece-fav"
            label={t("save")}
            savedLabel={t("saved")}
          />
          <figcaption className="piece-price">
            {s.price} <span>{s.unit}</span>
          </figcaption>
        </figure>

        <div className="piece-body">
          {qualities.length ? (
            <ul className="piece-chips">
              {qualities.map((q) => (
                <li key={q.name}>
                  <strong>{q.name}</strong>
                  {q.description ? <span>{q.description}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          {metrics.length ? (
            <ul className="piece-bars">
              {metrics.map((m) => (
                <li key={m.label}>
                  <span className="piece-bar-label">{m.label}</span>
                  <span className="piece-bar-track">
                    <span
                      className="piece-bar-fill"
                      style={{ inlineSize: `${Math.round(((Number(m.value) || 0) / max) * 100)}%` }}
                    />
                  </span>
                  <span className="piece-bar-val">{m.text || `${m.value}%`}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {tiers.length ? (
            <ol className="piece-trail">
              {tiers.map((tier, i) => (
                <li key={tier.label || i} className="piece-stage">
                  <p className="piece-stage-head">
                    <span className="piece-idx">{String(i + 1).padStart(2, "0")}</span>
                    <span className="piece-stage-label">{tierLabel(tier.label, t)}</span>
                    {tier.time ? <span className="piece-stage-time">{tier.time}</span> : null}
                  </p>
                  <ul className="piece-notes">
                    {(tier.notes || []).map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : null}

          {indicators.length ? (
            <ul className="piece-indicators" aria-label={t("pdReactions")}>
              {indicators.map((ind, i) => (
                <li key={`${ind.label}-${i}`} className={ind.active ? "on" : undefined}>
                  <span aria-hidden="true">{ind.icon}</span>
                  {ind.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
