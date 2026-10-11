/*
 * Favourites — the legacy favoritesModal, as a page.
 *
 * A favourite is stored by id, and homepage pieces are keyed by their section
 * slug while catalogue references are keyed by their catalogue id. The two
 * spaces barely overlap (18 of 185), so the page resolves every saved id
 * against the catalogue and splits the list: anything that resolves gets a
 * linked card, anything that does not gets the typographic treatment and no
 * link. That is why this route is code-split — it is the only reason it needs
 * the 550KB catalogue.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { FavoriteButton, useFavorites } from "../../contexts/FavoritesContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { byId, formatPrice, initials } from "../lib/catalog.js";
import "./account.css";

function Card({ item, product, t, savedLabel, saveLabel }) {
  const name = product?.name || item.name || item.id;
  const brand = product?.brand || item.brand || "";
  const price = product ? product.fromPrice : item.price;
  const image = product?.image || item.image;

  return (
    <article className="fav-card">
      <span className="fav-media">
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        ) : (
          <span
            aria-hidden="true"
            style={{ fontFamily: "var(--font-display)", fontSize: "var(--step-2)", color: "var(--text-3)" }}
          >
            {initials(name)}
          </span>
        )}
      </span>

      <div>
        <h3>
          {product ? <Link to={`/collection/${encodeURIComponent(product.id)}`}>{name}</Link> : name}
        </h3>
        {brand ? <p>{brand}</p> : null}
        {price != null ? (
          <p className="fav-price">
            {product ? formatPrice(price) : price} {t("currency")}
          </p>
        ) : null}

        <div className="fav-actions">
          <FavoriteButton
            product={product || item}
            label={saveLabel}
            savedLabel={savedLabel}
            size={15}
            className="fav-inline"
          />
          {product ? (
            <Link to={`/collection/${encodeURIComponent(product.id)}`} className="btn btn-ghost pressable">
              {t("favOpen")}
            </Link>
          ) : (
            <Link to="/collection" className="btn btn-ghost pressable">
              {t("cartBrowse")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Favorites() {
  const { t } = useI18n();
  const { items, ready, clear } = useFavorites();

  const { inCollection, elsewhere } = useMemo(() => {
    const a = [];
    const b = [];
    for (const it of items) {
      const p = byId(it.id);
      (p ? a : b).push({ item: it, product: p });
    }
    return { inCollection: a, elsewhere: b };
  }, [items]);

  if (!items.length) {
    return (
      <main className="wrap acct">
        <header className="acct-head">
          <p className="eyebrow">Parfumerie Charme</p>
          <h1>{t("favorites")}</h1>
        </header>
        <div className="empty" style={{ marginTop: "var(--space-l)" }}>
          <Heart size={40} strokeWidth={1.4} aria-hidden="true" />
          <h2>{t("favEmpty")}</h2>
          <p>{t("favEmptyBody")}</p>
          <Link to="/collection" className="btn btn-accent pressable">
            {t("cartBrowse")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap acct">
      <header className="acct-head">
        <p className="eyebrow">Parfumerie Charme</p>
        <h1>{t("favorites")}</h1>
        <p className="acct-sub">
          {ready ? `${items.length} ${items.length > 1 ? t("favItems") : t("favItem")}` : t("collLoading")}
        </p>
      </header>

      <div className="fav-head">
        <p className="fld-hint">{t("favHint")}</p>
        <button type="button" className="btn btn-ghost pressable" onClick={clear}>
          {t("favClear")}
        </button>
      </div>

      {inCollection.length ? (
        <section className="fav-group">
          <h2>{t("favInCollection")}</h2>
          <div className="fav-grid">
            {inCollection.map(({ item, product }) => (
              <Card
                key={item.id}
                item={item}
                product={product}
                t={t}
                saveLabel={t("save")}
                savedLabel={t("saved")}
              />
            ))}
          </div>
        </section>
      ) : null}

      {elsewhere.length ? (
        <section className="fav-group">
          <h2>{t("favFromBoutique")}</h2>
          <p className="fld-hint" style={{ marginTop: "0.4rem" }}>
            {t("favFromBoutiqueHint")}
          </p>
          <div className="fav-grid">
            {elsewhere.map(({ item }) => (
              <Card
                key={item.id}
                item={item}
                product={null}
                t={t}
                saveLabel={t("save")}
                savedLabel={t("saved")}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
