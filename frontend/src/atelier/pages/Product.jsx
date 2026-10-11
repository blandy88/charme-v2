import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ShoppingBag } from "lucide-react";
import { FavoriteButton } from "../../contexts/FavoritesContext.jsx";
import { useCart } from "../../contexts/CartContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { byId, formatPrice, initials, products as ALL, related } from "../lib/catalog.js";
import Reviews from "./Reviews.jsx";
import "./collection.css";

/* The typographic bottle, used for the 659 references with no artwork on disk.
   It is a deliberate treatment, not an error state — see collection.css. */
function Bottle({ name, brand, large }) {
  return (
    <span className={`bottle${large ? " bottle-lg" : ""}`} aria-hidden="true">
      <span className="bottle-neck" />
      <span className="bottle-body">
        <span className="bottle-mark">{initials(name)}</span>
        <span className="bottle-line" />
        <span className="bottle-line short" />
        {large && brand ? <span className="bottle-caption">{brand}</span> : null}
      </span>
    </span>
  );
}

const TIER_KEY = [
  [/top/i, "pdTop"],
  [/middle|heart|coeur|cœur/i, "pdMiddle"],
  [/base|fond/i, "pdBase"],
];

function tierLabel(label, t) {
  for (const [re, key] of TIER_KEY) if (re.test(label || "")) return t(key);
  return label;
}

function Trail({ tiers, t }) {
  if (!tiers.length) return null;
  return (
    <section className="pdp-block">
      <h2 className="pdp-h2">{t("pdSillage")}</h2>
      <ol className="trail">
        {tiers.map((tier, i) => (
          <li key={tier.label || i} className="trail-stage">
            <p className="trail-head">
              <span className="trail-idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="trail-label">{tierLabel(tier.label, t)}</span>
              {tier.time ? <span className="trail-time">{tier.time}</span> : null}
            </p>
            <ul className="trail-notes">
              {(tier.notes || []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Strengths({ metrics, t }) {
  if (!metrics.length) return null;
  const max = Math.max(...metrics.map((m) => Number(m.value) || 0), 1);
  return (
    <section className="pdp-block">
      <h2 className="pdp-h2">{t("pdPresence")}</h2>
      <ul className="strengths">
        {metrics.map((m) => (
          <li key={m.label}>
            <span className="strength-label">{m.label}</span>
            <span className="strength-track">
              <span
                className="strength-fill"
                style={{ inlineSize: `${Math.round(((Number(m.value) || 0) / max) * 100)}%` }}
              />
            </span>
            <span className="strength-val">{m.text || `${m.value}%`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Product() {
  const { id } = useParams();
  const { t } = useI18n();

  const product = useMemo(() => byId(id), [id]);
  const also = useMemo(() => (product ? related(ALL, product, 4) : []), [product]);

  /* Declared before the not-found return so the hook order is stable: a
     reference page is mounted for a missing id too. */
  const { add } = useCart();
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(false), 2600);
    return () => clearTimeout(timer);
  }, [added]);

  const sizes = product?.sizes || [];
  const activeSize = size != null ? size : (sizes[0]?.size ?? null);
  const chosen = sizes.find((s) => s.size === activeSize) || null;
  const unitPrice =
    chosen && typeof chosen.price === "number" ? chosen.price : (product?.fromPrice ?? null);
  const canBuy = Boolean(product?.available) && unitPrice != null;

  const addToCart = () => {
    if (!canBuy) return;
    add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image || "",
      price: unitPrice,
      quality: product.concentration || "",
      size: activeSize || "",
    });
    setAdded(true);
  };

  if (!product) {
    return (
      <main className="wrap collection">
        <div className="coll-empty">
          <p>{t("collNotFound")}</p>
          <Link to="/collection" className="btn-ghost pressable">{t("collBack")}</Link>
        </div>
      </main>
    );
  }

  const facts = [
    [t("factHouse"), product.brand],
    [t("factPerfumer"), product.perfumer],
    [t("factFamily"), product.family],
    [t("factConcentration"), product.concentration],
    [t("factYear"), product.year],
    [t("factOrigin"), product.brandLocation],
  ].filter(([, v]) => v);

  const hasProfile = product.tiers.length || product.metrics.length || product.qualities.length;

  return (
    <main className="wrap pdp">
      <nav className="pdp-crumb" aria-label={t("collection")}>
        <Link to="/collection">{t("collection")}</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="pdp-top">
        <div className="pdp-media">
          {product.image ? (
            <img
              src={product.image}
              alt={`${product.brand} ${product.name}`}
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Bottle name={product.name} brand={product.brand} large />
          )}
        </div>

        <div className="pdp-main">
          <div className="pdp-brandrow">
            <p className="pdp-brand">{product.brand}</p>
            <FavoriteButton product={product} className="pdp-save" label={t("save")} savedLabel={t("saved")} size={17} />
          </div>
          <h1>{product.name}</h1>

          {product.description ? <p className="pdp-desc">{product.description}</p> : null}

          <dl className="pdp-facts">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {product.ingredients.length ? (
            <section className="pdp-block pdp-block-flush">
              <h2 className="pdp-h2">{t("pdComposition")}</h2>
              <ul className="ingredients">
                {product.ingredients.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="pdp-buy">
            {sizes.length ? (
              <ul className="sizes">
                {sizes.map((s) => {
                  const on = s.size === activeSize;
                  return (
                    <li key={s.size}>
                      <button
                        type="button"
                        className={`size-pill pressable${on ? " on" : ""}`}
                        aria-pressed={on}
                        onClick={() => setSize(s.size)}
                      >
                        <span className="size-label">{s.size}</span>
                        <span className="size-price">
                          {typeof s.price === "number" ? `${s.price} dt` : "—"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : product.fromPrice != null ? (
              <p className="pdp-price">{formatPrice(product.fromPrice)} dt</p>
            ) : null}

            <div className="buy-row">
              <button
                type="button"
                className={`btn-accent pressable buy-btn${added ? " done" : ""}`}
                onClick={addToCart}
                disabled={!canBuy}
              >
                {added ? (
                  <>
                    <Check size={16} strokeWidth={2.2} aria-hidden="true" />
                    {t("pdpAdded")}
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} strokeWidth={1.9} aria-hidden="true" />
                    {t("pdpAdd")}
                  </>
                )}
              </button>
              {added ? (
                <Link to="/cart" className="btn-ghost pressable buy-link">
                  {t("pdpGoCart")}
                </Link>
              ) : null}
            </div>

            <p className={`pdp-stock ${product.available ? "in" : "out"}`}>
              {product.available ? t("pdAvailable") : t("pdOutOfStock")}
            </p>
          </section>
        </div>
      </div>

      {hasProfile ? (
        <>
          <Trail tiers={product.tiers} t={t} />
          <Strengths metrics={product.metrics} t={t} />
          {product.qualities.length ? (
            <section className="pdp-block">
              <h2 className="pdp-h2">{t("pdConcentrations")}</h2>
              <ul className="qualities">
                {product.qualities.map((q) => (
                  <li key={q.name}>
                    <strong>{q.name}</strong>
                    {q.description ? <span>{q.description}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <Reviews product={product} />

      {also.length ? (
        <section className="pdp-block">
          <h2 className="pdp-h2">{t("pdSameSpirit")}</h2>
          <ul className="also">
            {also.map((p) => (
              <li key={p.id}>
                <Link to={`/collection/${encodeURIComponent(p.id)}`} className="pressable">
                  <span className="also-media">
                    {p.image ? (
                      <img src={p.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                    ) : (
                      <Bottle name={p.name} brand={p.brand} />
                    )}
                  </span>
                  <span className="also-brand">{p.brand}</span>
                  <span className="also-name">{p.name}</span>
                  <span className="also-meta">{p.family}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
