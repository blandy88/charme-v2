/*
 * Catalog data layer — thin, because the work happens at build time.
 *
 * `virtual:catalogue` is emitted by frontend/vite.config.js, which resolves
 * every reference's image and joins the scent-profile layer from
 * home-sections.json before the bundle is written. Nothing is fetched at
 * runtime and nothing is guessed: the 752 references arrive already resolved,
 * with `imageKind` telling the UI whether a reference has an actual
 * photograph ("local"/"remote") or needs the typographic treatment.
 */

import CATALOG from "virtual:catalogue";

export const products = CATALOG;

export function facets(products) {
  const count = (arr) => {
    const m = new Map();
    for (const v of arr) if (v) m.set(v, (m.get(v) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  return {
    brands: count(products.map((p) => p.brand)),
    families: count(products.map((p) => p.family)),
    concentrations: count(products.map((p) => p.concentration)),
    perfumers: count(products.map((p) => p.perfumer)).filter(([, n]) => n >= 3),
  };
}

const FAMILY_WORDS = (family) => String(family || "").split(/\s+/).filter(Boolean);

/* Same family, then same brand, then anything by the same perfumer. */
export function related(products, product, limit = 4) {
  if (!product) return [];
  const fam = new Set(FAMILY_WORDS(product.family));
  const scored = products
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let s = 0;
      const pf = new Set(FAMILY_WORDS(p.family));
      for (const w of fam) if (pf.has(w)) s += 3;
      if (p.brand === product.brand) s += 2;
      if (p.perfumer && p.perfumer === product.perfumer) s += 4;
      if (p.concentration === product.concentration) s += 1;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.p);
}

/* Prices.
 *
 * Four different formatters were in use: this one, Cart's `money()`, and two
 * raw `${price} dt` interpolations in AdminLoyalty and the product size pills.
 * The raw two did not round, so a stored 259.999 rendered as "259.999 dt" in
 * the back office and "260 dt" in the shop. `formatPrice` is now the only one
 * that formats, and `money` is the only one that also adds the unit.
 *
 * The unit is Tunisian dinar and is written the same way everywhere in the
 * interface, so it stays here rather than being spelled at each call site. */
export const CURRENCY = "dt";

export function formatPrice(p) {
  if (p == null) return null;
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  const v = Math.round(n * 100) / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/* With the unit, for anywhere a price is shown to a person. "-" for a missing
   price, which is what the tables already expected. */
export function money(p) {
  const v = formatPrice(p);
  return v == null ? "-" : `${v} ${CURRENCY}`;
}

/* Initials for the typographic bottle: "Bleu de Chanel" -> "BC". */
export { initials } from "./text.js";

export function byId(id) {
  return products.find((p) => String(p.id) === String(id)) || null;
}
