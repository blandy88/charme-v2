import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Loader2, Sparkles, Trophy } from "lucide-react";
import { api } from "../../api/client.js";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { initials } from "../lib/text.js";
import "./loyalty.css";

/* Carte Fidélité — the customer's own card.
 *
 * Legacy kept this behind /admin: every /api/loyalty* route was
 * authenticateToken + requireAdmin, so the customer-facing modal the IA
 * describes never actually existed to render. This page is the missing half,
 * reading GET /api/loyalty/me, which is authenticated for the caller and
 * scoped to their own card. Rewards are still redeemed at the counter, so the
 * page frames a full card as an invitation to the shop rather than a button
 * that would need a second endpoint.
 */

export default function Loyalty() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api("/api/loyalty/me")
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <main className="wrap section">
        <div className="notice">{t("lyLoadError")}</div>
        <Link to="/collection" className="btn-ghost pressable ly-back">
          {t("collection")}
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="wrap section ly">
        <p className="ly-loading">
          <Loader2 size={16} className="ly-spin" aria-hidden="true" />
        </p>
      </main>
    );
  }

  if (!data.hasCard) {
    return (
      <main className="wrap section ly">
        <p className="eyebrow">{t("loyalty")}</p>
        <h1 className="ly-title">{t("lyNoCardTitle")}</h1>
        <div className="ly-empty panel">
          <p>{t("lyNoCardBody")}</p>
          <p className="ly-empty-note">{t("lyNoCardNote")}</p>
        </div>
        <Link to="/collection" className="btn-accent pressable ly-cta">
          {t("lyBrowseCollection")}
        </Link>
      </main>
    );
  }

  const card = data.card;
  const purchases = data.purchases || [];
  const preferences = data.preferences || [];
  const topBrands = data.topBrands || [];
  const suggestions = data.suggestions || [];
  const transactions = data.transactions || [];
  const threshold = data.rewardThreshold || 5;

  const money = (value) => {
    const amount = Math.round(Number(value || 0) * 100) / 100;
    return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)} DT`;
  };

  return (
    <main className="wrap section ly" data-guide="loyalty">
      <p className="eyebrow">{t("loyalty")}</p>
      <h1 className="ly-title">{t("lyTitle")}</h1>
      <p className="ly-lede">{t("lyLede")}</p>

      <section className="ly-card panel" aria-label={t("lyBalance")} data-guide="loyalty-card">
        <div className="ly-card-top">
          <p className="eyebrow">{t("lyCardNumber")}</p>
          <p className="ly-number">{card.cardNumber || "—"}</p>
          {card.name ? <p className="ly-holder">{card.name}</p> : null}
        </div>

        <div className="ly-points">
          <p className="ly-points-value">
            <strong>{card.points}</strong>
            <span>/{threshold}</span>
          </p>
          <p className="ly-points-label">{t("lyPoints")}</p>
        </div>

        <div className="ly-track" aria-hidden="true">
          <span style={{ inlineSize: `${card.progress}%` }} />
        </div>

        <p className={`ly-status ${card.eligible ? "ready" : ""}`}>
          <Trophy size={15} aria-hidden="true" />
          {card.eligible
            ? t("lyEligible").replace("{n}", String(threshold))
            : t("lyRemaining").replace("{n}", String(card.remaining))}
        </p>
      </section>

      {card.eligible ? (
        <p className="ly-reward-note panel">
          <Gift size={16} aria-hidden="true" />
          {t("lyRewardNote")}
        </p>
      ) : null}

      <div className="ly-grid">
        <section className="ly-block panel" data-guide="loyalty-history">
          <h2 className="ly-h2">{t("lyHistory")}</h2>
          {purchases.length ? (
            <ul className="ly-rows" data-guide="loyalty-purchase">
              {purchases.map((p) => (
                <li key={p.id} className="ly-row">
                  <span className="ly-mark" aria-hidden="true">{initials(p.perfume_name)}</span>
                  <span className="ly-row-meta">
                    <strong>{p.perfume_name}</strong>
                    <span>
                      {p.brand || t("lyUnknownBrand")}
                      {p.fragrance_family ? ` · ${p.fragrance_family}` : ""}
                    </span>
                  </span>
                  <span className="ly-row-side">
                    <span className="ly-price">{money(p.purchase_price)}</span>
                    <span className="ly-date">{p.purchase_date || ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ly-empty-text">{t("lyNoPurchases")}</p>
          )}

          {transactions.length ? (
            <>
              <h3 className="ly-h3">{t("lyMovements")}</h3>
              <ul className="ly-moves">
                {transactions.map((tx, i) => (
                  <li key={`${tx.created_at}-${i}`}>
                    <span className={`ly-move ${tx.type === "redeem" ? "out" : "in"}`}>
                      {tx.points_change > 0 ? `+${tx.points_change}` : tx.points_change}
                    </span>
                    <span className="ly-move-desc">{tx.description}</span>
                    <span className="ly-move-when">{tx.created_at?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="ly-block panel">
          <h2 className="ly-h2">{t("lyTastes")}</h2>
          {preferences.length ? (
            <ul className="ly-bars">
              {preferences.map((pref) => (
                <li key={pref.family}>
                  <span className="ly-bar-label">{pref.family}</span>
                  <span className="ly-bar-track">
                    <span style={{ inlineSize: `${pref.percentage}%` }} />
                  </span>
                  <span className="ly-bar-count">
                    {pref.count} · {pref.percentage}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ly-empty-text">{t("lyNoTastes")}</p>
          )}

          {topBrands.length ? (
            <>
              <h3 className="ly-h3">{t("lyFavoriteHouses")}</h3>
              <ul className="ly-chips">
                {topBrands.map((b) => (
                  <li key={b.brand} className="ly-chip">
                    {b.brand}
                    <em>{b.count}</em>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {suggestions.length ? (
            <>
              <h3 className="ly-h3">{t("lyForYou")}</h3>
              <ul className="ly-rows">
                {suggestions.map((s, i) => (
                  <li key={`${s.perfume_name}-${s.brand}-${i}`} className="ly-row">
                    <span className="ly-mark" aria-hidden="true">{initials(s.perfume_name)}</span>
                    <span className="ly-row-meta">
                      <strong>{s.perfume_name}</strong>
                      <span>
                        {s.brand || t("lyUnknownBrand")}
                        {s.fragrance_family ? ` · ${s.fragrance_family}` : ""}
                      </span>
                    </span>
                    <Link to="/collection" className="ly-other pressable">
                      {t("lySeeSimilar")}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="ly-empty-note">{t("lySuggestionNote")}</p>
            </>
          ) : null}
        </section>
      </div>

      <p className="ly-foot">
        <Sparkles size={14} aria-hidden="true" />
        {t("lyFoot")}
      </p>
      <p className="ly-foot-note">{t("lyFootNote")}</p>
    </main>
  );
}
