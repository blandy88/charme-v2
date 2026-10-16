/**
 * Turns the generated catalogue JS into a plain JSON file the React app can
 * fetch. Also resolves each fragrance to a real image when one exists on disk,
 * so cards never point at a 404.
 *
 * Image resolution order:
 *   1. public/data/product-images.json — the curated pin for this reference id.
 *      A few artworks are named after the brand rather than the perfume
 *      ("bleudechanel.png", "tobaccovanille.png"), so a name-stem guess misses
 *      them; the pin file is the authority.
 *   2. A stem guess over public/ (slug of the name, then brand+name), which
 *      covers references the pin file has no entry for.
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

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"];
const byStem = new Map();

/* Recursively walk public/ so images stored in subdirectories (public/images/,
   public/media/, public/media/guides/ …) are discovered by stem, not just the
   site root. */
function walkImages(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXT.includes(ext)) continue;
      byStem.set(path.basename(entry.name, ext).toLowerCase(), path.relative(ROOT, full));
    }
  }
}
walkImages(path.join(ROOT, "public"));

// curated ids -> "/file.ext" (authoritative, see the header comment)
let PINS = {};
const PINS_FILE = path.join(ROOT, "public/data/product-images.json");
try {
  PINS = JSON.parse(fs.readFileSync(PINS_FILE, "utf8"));
} catch (e) {
  console.warn(
    `product-images.json not readable (${e.code || e.message}) - falling back to name matching`,
  );
}

let withImage = 0;
let withPin = 0;
const items = raw.map((f, i) => {
  const slug = slugify(f.name);
  const id = `${slug}-${i}`;
  // curated pin first, then the plain slug, then brand+slug (some files are prefixed)
  const pinned = PINS[id];
  let img = (pinned && fs.existsSync(path.join(ROOT, "public", String(pinned).replace(/^\//, ""))))
    ? String(pinned).replace(/^\//, "")
    : null;
  if (img) withPin++;
  if (!img) img = byStem.get(slug) || byStem.get(slugify(`${f.brand} ${f.name}`)) || null;
  if (img) withImage++;
  const prices = (f.sizes || []).map((s) => s.price).filter((p) => typeof p === "number");
  return {
    id,
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
console.log(`images resolved: ${withImage}/${items.length} (${withPin} from product-images.json pins)`);
console.log(`brands: ${new Set(items.map((i) => i.brand)).size}`);
console.log(`families: ${new Set(items.map((i) => i.family)).size}`);
