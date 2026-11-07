import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Loader2, Sparkles, Stamp, Trophy } from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { initials } from "../lib/text.js";
import { money as moneyFmt } from "../lib/catalog.js";
import { fmtDateTime, useLiveRefresh } from "./adminKit.jsx";
import LoyaltyCardArt from "../LoyaltyCardArt.jsx";
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
  const { user, ready } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const alive = useRef(true);
  /* StrictMode re-arms: dev mounts -> cleans up -> mounts again, so a
     cleanup-only effect leaves `alive` permanently false and every load()
     then short-circuits, pinning the page on the spinner. Re-assert true on
     every mount. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /* Clear the error at the start of every attempt. It used to be set and never
     cleared, and the `if (error)` branch renders above `if (!data)`, so a
     single 500 left the customer stuck on "we could not load your card" for
     the rest of the session with no retry - even after data arrived. */
  const load = useCallback(() => {
    setError("");
    return api("/api/loyalty/me")
      .then((d) => {
        if (!alive.current) return;
        setData(d);
        setStale(false);
        setLastSync(new Date());
      })
      .catch((e) => {
        if (!alive.current) return;
        setError(e.message);
        /* Keep the last good card on screen but say out loud that it may be
           out of date. A silent stale balance is the exact failure the legacy
           root's stale banner was added for. */
        setStale(true);
      });
  }, []);

  /* Wait for the session to settle, and never call for a visitor with no
     account: /api/loyalty/me answers 401 for them, and the api client turns that
     into a full-page "session expired" bounce - wrong for someone who was never
     signed in. They get the same inline gate as /profile instead. */
  useEffect(() => {
    if (!ready || !user) return;
    load();
  }, [ready, user, load]);

  /* PARITY 2026-11-07 — "synchronous". The card used to load exactly once per
     mount, so a point added at the register stayed invisible until a full
     reload. Poll, re-read when the tab becomes visible and on window focus;
     the shared hook guards against overlapping loads. */
  useLiveRefresh(load, { active: ready && !!user, intervalMs: 30000 });

  if (!ready) {
    return (
      <main className="wrap section ly">
        <p className="ly-loading">
          <Loader2 size={16} className="ly-spin" aria-hidden="true" />
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="wrap section ly">
        <p className="eyebrow">{t("loyalty")}</p>
        <h1 className="ly-title">{t("loyaltyGateTitle")}</h1>
        <div className="ly-empty panel">
          <p>{t("loyaltyGateBody")}</p>
        </div>
        <Link to="/auth?next=/loyalty" className="btn-accent pressable ly-cta">
          {t("signIn")}
        </Link>
      </main>
    );
  }

  /* A failed *refresh* must not blank a card that is already on screen. Only
     the very first load, with no data at all, gets the full error page. */
  if (error && !data) {
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

  /* Was a local helper emitting an upper-case "DT" while every other page in
     the shop wrote "dt" (the value of t("currency")). A loyalty card and the
     page it is read from showed the same number in two different units. It now
     shares the one formatter; the `|| 0` is kept because a ledger row with a
     null amount reads as zero here, not as a dash. */

  /* t() is a plain lookup, so the placeholders are filled by hand — the same
     one-line pattern the rest of the app uses. */
  const fill = (key, vars) =>
    Object.keys(vars).reduce((str, k) => str.split(`{${k}}`).join(vars[k]), t(key));

  /* The printed card carries no DOM text — the name, number and punches are
     rasterised into the bitmap — so it needs an explicit description for
     assistive technology, and it doubles as the fallback if the artwork
     cannot load. */
  const artLabel = fill("lyArtAlt", {
    name: card.name || t("lyArtNoName"),
    number: card.cardNumber || "—",
    n: String(card.points),
    t: String(threshold),
  });

  return (
    <main className="wrap section ly" data-guide="loyalty">
      <p className="eyebrow">{t("loyalty")}</p>
      <h1 className="ly-title">{t("lyTitle")}</h1>
      <p className="ly-lede">{t("lyLede")}</p>

      <div className="ly-sync" data-guide="loyalty-sync">
        <button
          type="button"
          className="ly-refresh pressable"
          data-guide="loyalty-refresh"
          onClick={load}
        >
          {t("lyRefresh")}
        </button>
        {lastSync ? (
          <span>
            {t("lySyncedAt").replace(
              "{time}",
              lastSync.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
            )}
          </span>
        ) : null}
      </div>
      {stale ? (
        <div className="ly-stale" role="status" data-guide="loyalty-stale">
          <span>{t("lyStale")}</span>
          <button type="button" className="ly-refresh pressable" onClick={load}>
            {t("lyRetry")}
          </button>
        </div>
      ) : null}

      <div className="ly-card-row">
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

        {/* The card itself, painted: name and number written into the template,
            and one punch per purchase. It sits beside the balance panel rather
            than replacing it — the panel is the live number, this is the copy
            the customer keeps. */}
        <LoyaltyCardArt
          name={card.name}
          cardNumber={card.cardNumber}
          points={card.points}
          threshold={threshold}
          label={artLabel}
          downloadLabel={t("lyArtDownload")}
        />
      </div>

      <p className="ly-rule">
        <Stamp size={14} aria-hidden="true" />
        {t("lyRule")}
      </p>

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
                    <span className="ly-price">{moneyFmt(p.purchase_price || 0)}</span>
                    <span className="ly-date">
                      {p.purchase_date || (p.created_at ? fmtDateTime(p.created_at) : "")}
                    </span>
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
                    <span className="ly-move-when">{fmtDateTime(tx.created_at)}</span>
                  </li>
                ))}
              </ul>
              <p className="ly-empty-note">{t("lyMovesNote")}</p>
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
