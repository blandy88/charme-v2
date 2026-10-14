import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const CATALOGUE = path.resolve(repoRoot, "public/data/fragrances.json");
const PROFILES = path.resolve(repoRoot, "public/data/home-sections.json");

const VIRTUAL_ID = "virtual:catalogue";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/**
 * The catalogue is generated from the live site by
 * `scripts/build-fragrance-json.cjs` into `public/data/fragrances.json`.
 * We inline it as a virtual module so this app has ONE source of truth and
 * ships self-contained: no runtime fetch, so it works on Vercel (CDN), GitHub
 * Pages (static) and Render (Express) without touching server.js's static
 * allow-list.
 *
 * This is also where the catalogue is *enriched*, which is why it lives here
 * rather than at runtime:
 *
 *   1. image resolution. Only ~12% of the 752 references have artwork anywhere
 *      on disk (69 local files + 21 remote home-section URLs). Resolving at
 *      build time makes that a fact rather than a guess, and leaves the other
 *      662 as a deliberate typographic treatment rather than a broken image.
 *   2. the scent-profile join. home-sections.json carries the note pyramid,
 *      note-strength bars, reaction/season indicators and concentration notes
 *      for the 70 references that overlap fragrances.json. Joining here means
 *      the client never downloads 483KB to learn about 70 rows.
 */
function catalogue() {
  const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"];

  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Corporate noise stripped before matching, so "Parfums de Marly" yields
  // "marly" and "Creed — Aventus" can still find "aventus.png".
  const BRAND_STOP = new Set([
    "parfums", "parfum", "maison", "house", "the", "and", "for", "les",
    "des", "du", "la", "le", "paris", "freres", "copyright", "group",
    "ltd", "inc", "sons",
  ]);

  const brandTokens = (b) =>
    String(b || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !BRAND_STOP.has(w));

  const variants = (f) => {
    const nm = String(f.name || "");
    const bt = brandTokens(f.brand);
    const out = [
      norm(f.brand + nm),
      norm(nm),
      norm(String(f.brand || "").replace(/[^a-z0-9]/g, "") + nm),
      norm(nm + f.brand),
      norm(f.slug),
      norm(String(f.slug || "").replace(/-/g, "")),
    ];
    for (const b of bt) {
      out.push(norm(b + nm), norm(nm + b));
    }
    const base = nm
      .replace(/\(.*?\)/g, " ")
      .replace(
        /\b(extrait|parfum|eau|de|toilette|edp|edt|edc|intense|absolu|elixir|cologne)\b/gi,
        " "
      )
      .trim();
    if (base && base !== nm) {
      out.push(norm(base), norm(base + (bt[0] || "")), norm((bt[0] || "") + base));
    }
    return [...new Set(out.filter(Boolean))];
  };

  return {
    name: "charme-catalogue",
    resolveId(source) {
      return source === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;

      if (!fs.existsSync(CATALOGUE)) {
        throw new Error(
          `Missing ${CATALOGUE} - run: node scripts/build-fragrance-json.cjs`
        );
      }

      // --- curated artwork overrides -----------------------------------
      // A hand-verified map id -> local file for references whose artwork had
      // to be pinned by hand: re-sourced photographs, or files that the fuzzy
      // stem matcher below would otherwise pair with the wrong bottle. Entries
      // pointing at a file that no longer exists are ignored, so the map stays
      // safe to keep around.
      const overrides = (() => {
        const file = path.resolve(repoRoot, "public/data/product-images.json");
        const out = new Map();
        if (!fs.existsSync(file)) return out;
        for (const [id, rel] of Object.entries(JSON.parse(fs.readFileSync(file, "utf8")))) {
          const clean = String(rel).replace(/^\//, "");
          if (fs.existsSync(path.join(repoRoot, "public", clean))) out.set(id, `/${clean}`);
        }
        return out;
      })();

      // --- local artwork, indexed once ---------------------------------
      const byStem = new Map();
      if (fs.existsSync(repoRoot)) {
        for (const file of fs.readdirSync(path.join(repoRoot, "public"))) {
          const ext = path.extname(file).toLowerCase();
          if (IMAGE_EXT.includes(ext)) byStem.set(norm(path.basename(file, ext)), file);
        }
      }

      // --- the scent-profile layer -------------------------------------
      // Two keys: the plain one, plus a word-order-insensitive one, because
      // the two sources disagree on name order ("Absolu Aventus" vs "Aventus
      // Absolu", "Donna Born in Roma" vs "Born in Roma Donna"). Worth it: it
      // is the difference between 70 and 73 of the 752 references getting a
      // note trail, and it is exact-match on the token set, not fuzzy.
      const tokens = (s) =>
        String(s || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter(Boolean)
          .sort()
          .join("");
      const profiles = new Map();
      if (fs.existsSync(PROFILES)) {
        for (const s of JSON.parse(fs.readFileSync(PROFILES, "utf8")).sections || []) {
          const k = norm(s.brand) + norm(s.name);
          if (!profiles.has(k)) profiles.set(k, s);
          const loose = norm(s.brand) + tokens(s.name);
          if (!profiles.has(loose)) profiles.set(loose, s);
        }
      }
      const findProfile = (f) =>
        profiles.get(norm(f.brand) + norm(f.name)) ||
        profiles.get(norm(f.brand) + tokens(f.name)) ||
        null;

      const raw = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
      let local = 0;
      let remote = 0;
      let profiled = 0;

      const slim = raw.map((f) => {
        const home = findProfile(f);
        if (home) profiled++;

        let image = null;
        let imageKind = null;
        // A pinned override wins outright: it is the curated, re-sourced file
        // for this exact reference, so skip the fuzzy filename search.
        const pinned = overrides.get(f.id || f.slug);
        if (pinned) {
          image = pinned;
          imageKind = "local";
        } else {
          for (const v of variants(f)) {
            if (byStem.has(v)) {
              image = `/${byStem.get(v)}`;
              imageKind = "local";
              break;
            }
          }
          if (!image && home && home.image && /^https?:/.test(home.image)) {
            image = home.image;
            imageKind = "remote";
          }
        }
        if (imageKind === "local") local++;
        else if (imageKind === "remote") remote++;

        return {
          id: f.id || f.slug,
          slug: f.slug,
          name: f.name,
          brand: f.brand,
          family: f.family,
          description: f.description || "",
          ingredients: Array.isArray(f.ingredients) ? f.ingredients : [],
          year: f.year ?? null,
          perfumer: f.perfumer || null,
          concentration: f.concentration || null,
          sizes: Array.isArray(f.sizes) ? f.sizes : [],
          fromPrice: typeof f.fromPrice === "number" ? f.fromPrice : null,
          available: f.available !== false,
          image,
          imageKind,
          // Scent profile. Only three of these carry a section in this pass:
          // tiers (the note trail), metrics (note-strength bars) and qualities
          // (concentrations) — they are present on 174/176/185 profiles.
          // `indicators`, `categories` and `ratings` are far sparser (21) and
          // use an overlapping, uncontrolled vocabulary, so they are left for
          // pass 2 rather than rendered as raw English into a FR/AR surface.
          // `review` is deliberately NOT emitted: it is scraped legacy HTML
          // (a fragment of the old stylesheet's markup), and porting legacy
          // design is explicitly out of scope.
          brandLocation: home?.brandLocation ?? null,
          metrics: home?.metrics || [],
          tiers: home?.tiers || [],
          qualities: home?.qualities || [],
          indicators: home?.indicators || [],
          categories: home?.categories || [],
        };
      });

      const out = `export default ${JSON.stringify(slim)};`;
      const typographic = slim.length - local - remote;
      console.log(
        `  catalogue: ${slim.length} references · ${local} local + ${remote} remote ` +
          `images · ${typographic} typographic · ${profiled} with a scent profile · ` +
          `${(out.length / 1024).toFixed(0)}KB`
      );
      return out;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), catalogue()],
  // Built to public/app/** so all three hosts serve it from one committed dir.
  // base must match that path: /app/ on Express, Vercel and GitHub Pages.
  base: "/app/",
  build: {
    outDir: path.resolve(repoRoot, "public/app"),
    emptyOutDir: true,
    // Content-hashed assets under /app/assets/** are immutable.
    assetsDir: "assets",
    sourcemap: false,
  },
  server: {
    port: 5173,
    // The catalogue lives outside frontend/, so dev needs read access up one dir.
    fs: { allow: [repoRoot] },
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
    },
  },
});
