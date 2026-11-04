/*
 * Turns the 185 lossless legacy sections into structured data for the modern renderer.
 *
 * Source: frontend/src/legacy/legacy-sections.json (extracted from public/index.html).
 * Why: the modern surface must carry the REAL homepage content. None of it exists in
 * public/data/fragrances.json — only 18/185 slugs and 81/186 names overlap (the
 * two-catalogue trap).
 *
 * Two block shapes exist, because the homepage is hand-authored:
 *   A) the bespoke Layton block  — unprefixed: category-item / note-item / rating-item
 *   B) the other 184             — per-slug prefixed: <slug>-chip, <slug>-rating-category,
 *                                  <slug>-rating-item, plus an inline "Scent DNA" dial
 *
 * Output: public/data/home-sections.json
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "frontend/src/legacy/legacy-sections.json");
const OUT = path.join(ROOT, "public/data/home-sections.json");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

const strip = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const first = (chunk, re) => {
  const m = chunk.match(re);
  return m ? strip(m[1]) : null;
};
const widthOf = (chunk) => {
  const m = chunk.match(/width:\s*([\d.]+)%/i);
  return m ? Number(m[1]) : null;
};

/*
 * Every class attribute whose token list contains a class ENDING with `suffix`.
 * Class names are prefixed per product, so exact-string markers match only one section.
 */
function blocksForSuffix(html, suffix, { window = 1000, excludePrefixes = [] } = {}) {
  const re = /class="([^"]*)"/g;
  const hits = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    const hit = match[1].split(/\s+/).find((c) => c.endsWith(suffix));
    if (!hit) continue;
    const prefix = hit.slice(0, hit.length - suffix.length).replace(/-$/, "");
    if (prefix && excludePrefixes.includes(prefix)) continue;
    hits.push({ index: match.index, prefix });
  }
  /*
   * Cut each block at the NEXT occurrence of the same token, otherwise a wide window
   * swallows the following sibling block (note tiers are only ~600 chars apart, so a
   * 2200-char window merged TOP/MIDDLE/BASE into one).
   */
  return hits.map((hit, i) => {
    const next = hits[i + 1] ? hits[i + 1].index : hit.index + window;
    const end = Math.min(next, hit.index + window);
    return { chunk: html.slice(hit.index, end), prefix: hit.prefix };
  });
}

function parseSection(section) {
  const html = section.rawHtml;
  // Haltane is embedded INSIDE the Layton section; its nodes are not Layton's.
  const foreign = section.slug === "layton" ? ["haltane"] : [];

  /*
   * Note pyramid — present in 175 of 185 sections: <prefix>-note-tier blocks, each with a
   * tier label ("TOP NOTES", icon, time) and a grid of <prefix>-crystal-name notes.
   */
  const tiers = blocksForSuffix(html, "-note-tier", { window: 2200, excludePrefixes: foreign })
    .map(({ chunk }) => {
      const inner = (chunk.match(/tier-label">([\s\S]*?)<\/div>/i) || [])[1] || "";
      const label = strip(inner.replace(/<span[^>]*>[\s\S]*?<\/span>/gi, ""));
      return {
        icon: first(chunk, /tier-icon">([^<]*)</i),
        label,
        time: first(chunk, /tier-time">([^<]*)</i),
        notes: [...chunk.matchAll(/crystal-name">([^<]*)</gi)].map((m) => strip(m[1])),
      };
    })
    .filter((t) => t.notes.length);

  /* Shape B: sauvage-style note chips */
  const chips = blocksForSuffix(html, "-chip", { excludePrefixes: foreign })
    .map(({ chunk }) => ({
      icon: first(chunk, /chip-emoji">([^<]*)</i),
      name: first(chunk, /chip-name">([^<]*)</i),
      intensity: first(chunk, /chip-fill"[^>]*data-intensity="([^"]*)"/i),
    }))
    .filter((c) => c.name);

  /* Shape A: Layton's note-item list */
  const legacyNotes = blocksForSuffix(html, "note-item", { excludePrefixes: foreign })
    .map(({ chunk }) => ({ icon: first(chunk, /note-icon">([^<]*)</i), name: first(chunk, /note-name">([^<]*)</i) }))
    .filter((n) => n.name);

  /* Shape B: rating categories, each holding several rating bars */
  const categories = blocksForSuffix(html, "-rating-category", { window: 2600, excludePrefixes: foreign })
    .map(({ chunk }) => ({
      icon: first(chunk, /category-icon">([^<]*)</i),
      title: first(chunk, /category-title">([^<]*)</i),
      items: blocksForSuffix(chunk, "-rating-item", { window: 500, excludePrefixes: foreign })
        .map(({ chunk: item }) => ({
          label: first(item, /rating-label">([^<]*)</i),
          value: widthOf(item),
          count: first(item, /rating-count">([^<]*)</i),
        }))
        .filter((i) => i.label),
    }))
    .filter((c) => c.title || c.items.length);

  /* Shape A: Layton's flat ratings */
  const flat = blocksForSuffix(html, "rating-item", { excludePrefixes: foreign })
    .map(({ chunk }) => ({
      label: first(chunk, /rating-label">([^<]*)</i),
      value: widthOf(chunk),
      count: first(chunk, /rating-count">([^<]*)</i),
    }))
    .filter((r) => r.label);

  const accords = blocksForSuffix(html, "category-item", { excludePrefixes: foreign })
    .map(({ chunk }) => ({ name: first(chunk, /category-label">([^<]*)</i), value: widthOf(chunk) }))
    .filter((a) => a.name);

  /* Accord / metric bars: -metric-item (label + width + value), with radar labels as fallback */
  const metrics = blocksForSuffix(html, "-metric-item", { window: 500, excludePrefixes: foreign })
    .map(({ chunk }) => ({
      label: first(chunk, /metric-label">([^<]*)</i),
      value: widthOf(chunk),
      text: first(chunk, /metric-value">([^<]*)</i),
    }))
    .filter((m) => m.label);

  const radar = metrics.length
    ? []
    : blocksForSuffix(html, "-radar-label", { window: 300, excludePrefixes: foreign })
        .map(({ chunk }) => ({
          label: first(chunk, /label-name">([^<]*)</i),
          value: null,
          text: first(chunk, /label-value">([^<]*)</i),
        }))
        .filter((m) => m.label);

  const indicators = blocksForSuffix(html, "indicator-item", { excludePrefixes: foreign })
    .map(({ chunk }) => ({
      icon: first(chunk, /indicator-icon">([^<]*)</i),
      label: first(chunk, /indicator-label">([^<]*)</i),
      value: widthOf(chunk),
      active: /\bindicator-item[^"]*\bactive\b/i.test(chunk.slice(0, 120)),
    }))
    .filter((i) => i.label);

  const qualities = blocksForSuffix(html, "quality-label", { window: 1600 })
    .map(({ chunk }) => ({
      name: first(chunk, /quality-name">([^<]*)</i),
      description: first(chunk, /quality-description">([^<]*)</i),
    }))
    .filter((q) => q.name);

  const review = blocksForSuffix(html, "reddit-review-card", { window: 2600 })
    .map(({ chunk }) => strip(chunk).slice(0, 600))
    .filter(Boolean)[0] || null;

  return {
    slug: section.slug,
    classSlug: section.classSlug,
    theme: section.theme,
    brand: section.brand,
    brandLocation: section.brandLocation || null,
    name: section.name,
    productNames: section.productNames,
    embedded: section.embeddedProductSlugs || [],
    image: section.image,
    price: first(html, /price-currency">([^<]*)</i),
    unit: first(html, /price-unit">([^<]*)</i) || "dt",
    accords,
    metrics: metrics.length ? metrics : radar,
    tiers,
    notes: chips.length ? chips : legacyNotes,
    categories,
    ratings: flat,
    indicators,
    qualities,
    review,
  };
}

const sections = fixture.sections.map(parseSection);

const count = (fn) => sections.filter(fn).length;
const sum = (fn) => sections.reduce((n, s) => n + fn(s), 0);
const stats = {
  sections: sections.length,
  withPrice: count((s) => s.price),
  withImage: count((s) => s.image),
  withQualities: count((s) => s.qualities.length),
  withIndicators: count((s) => s.indicators.length),
  withTiers: count((s) => s.tiers.length),
  tierNotes: sum((s) => s.tiers.reduce((n, t) => n + t.notes.length, 0)),
  withMetrics: count((s) => s.metrics.length),
  metricBars: sum((s) => s.metrics.length),
  withCategories: count((s) => s.categories.length),
  ratingBars: sum((s) => s.categories.reduce((m, c) => m + c.items.length, 0) + s.ratings.length),
  withFlatNotes: count((s) => s.notes.length),
  withReview: count((s) => s.review),
};

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      schemaVersion: 2,
      source: "frontend/src/legacy/legacy-sections.json",
      sourceSha256: fixture.sourceSha256,
      sectionCount: sections.length,
      stats,
      sections,
    },
    null,
    1,
  ),
);

console.log(`Wrote ${OUT}`);
console.log(JSON.stringify(stats, null, 1));
