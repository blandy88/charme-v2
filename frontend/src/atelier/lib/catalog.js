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

export function formatPrice(p) {
  if (p == null) return null;
  const v = Math.round(p * 100) / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/* Initials for the typographic bottle: "Bleu de Chanel" -> "BC". */
export function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function byId(id) {
  return products.find((p) => String(p.id) === String(id)) || null;
}
