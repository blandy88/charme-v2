/**
 * Turns the generated catalogue JS into a plain JSON file the React app can
 * fetch. Also resolves each fragrance to a real image when one exists on disk,
 * so cards never point at a 404.
 *
 * Usage: node scripts/build-fragrance-json.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public/js/fragrance-catalog-data.js");
const OUT = path.join(ROOT, "public/data/fragrances.json");

const src = fs.readFileSync(SRC, "utf8");
const start = src.indexOf("FRAGRANCE_CATALOG_DATA = [");
const end = src.indexOf("\n];", start);
const raw = JSON.parse(src.slice(src.indexOf("[", start), end + 2));

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// index the images that actually exist at the site root
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"];
const byStem = new Map();
for (const f of fs.readdirSync(path.join(ROOT, "public"))) {
  const ext = path.extname(f).toLowerCase();
  if (!IMAGE_EXT.includes(ext)) continue;
  byStem.set(path.basename(f, ext).toLowerCase(), f);
}

let withImage = 0;
const items = raw.map((f, i) => {
  const slug = slugify(f.name);
  // try the plain slug, then brand+slug (some files are prefixed)
  let img = byStem.get(slug) || byStem.get(slugify(`${f.brand} ${f.name}`)) || null;
  if (img) withImage++;
  const prices = (f.sizes || []).map((s) => s.price).filter((p) => typeof p === "number");
  return {
    id: `${slug}-${i}`,
    slug,
    name: f.name,
    brand: f.brand || "",
    family: f.family || "",
    description: f.description || "",
    ingredients: f.ingredients || [],
    year: f.year ?? null,
    perfumer: f.perfumer || "",
    concentration: f.concentration || "",
    sizes: f.sizes || [],
    fromPrice: prices.length ? Math.min(...prices) : null,
    available: f.available !== false,
    image: img ? `/${img}` : null,
  };
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(items));

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`wrote ${items.length} fragrances -> public/data/fragrances.json (${kb} KB)`);
console.log(`images resolved: ${withImage}/${items.length}`);
console.log(`brands: ${new Set(items.map((i) => i.brand)).size}`);
console.log(`families: ${new Set(items.map((i) => i.family)).size}`);
