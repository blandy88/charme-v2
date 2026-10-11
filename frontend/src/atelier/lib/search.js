/*
 * Catalogue search. Pure functions over an already-loaded product array, so
 * both the nav panel and any finder can share them without owning data.
 *
 * Two modes, because the legacy had two entry points that behaved differently:
 *   - "search"   (quickSearchBar / searchModal): every word must match
 *                something. Typing three words narrows.
 *   - "describe" (aiFragranceFinder / ingredientModal): words are a wish, not
 *                a filter. "warm sweet for winter evenings" ranks anything it
 *                can, best match first.
 *
 * Matching is accent-insensitive and reads name, house, family, perfumer,
 * concentration, the ingredient list, the note pyramid and the indicator tags
 * ("winter", "evening"…), because that is exactly the vocabulary a visitor
 * types.
 */

export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const HIERARCHY = new Set([
  "les", "des", "du", "la", "le", "de", "the", "and", "for", "eau", "parfum",
]);

function haystack(p) {
  const notes = (p.tiers || []).flatMap((t) => t.notes || []);
  return norm(
    [
      p.name,
      p.brand,
      p.family,
      p.perfumer,
      p.concentration,
      p.description,
      ...(p.ingredients || []),
      ...notes,
      ...(p.indicators || []).map((i) => i.label),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function searchCatalogue(products, query, mode = "search", limit = 10) {
  const q = norm(query).trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];

  const scored = [];
  for (const p of products) {
    const name = norm(p.name);
    const brand = norm(p.brand);
    const hay = haystack(p);
    let score = 0;
    let matched = 0;

    for (const w of words) {
      let s = 0;
      if (name === w) s += 10;
      else if (name.startsWith(w)) s += 7;
      else if (name.includes(w)) s += 5;
      if (brand.includes(w)) s += 4;
      if (hay.includes(w)) s += 2;
      if (s > 0) matched++;
      score += s;
    }

    if (mode === "search") {
      /* AND: a word that matches nothing drops the row. */
      if (matched < words.length) continue;
    } else {
      /* OR: rank by how much of the wish we satisfied. */
      if (matched === 0) continue;
      score += matched * 1.5;
    }
    scored.push({ p, score });
  }

  scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

/* House counts for the suggestion chips, top N. */
export function topBrands(products, n = 6) {
  const m = new Map();
  for (const p of products) if (p.brand) m.set(p.brand, (m.get(p.brand) || 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([b]) => b);
}

export function filterWords(query) {
  return String(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 1 && !HIERARCHY.has(w));
}
