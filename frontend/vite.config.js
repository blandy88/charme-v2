import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const PUBLIC_DIR = path.resolve(repoRoot, "public");
const CATALOGUE = path.resolve(PUBLIC_DIR, "data/fragrances.json");

// Distinct from public/assets (legacy icons) so the build can never clobber it.
const ASSETS_DIR = "r-assets";

const VIRTUAL_ID = "virtual:catalogue";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/**
 * The catalogue is generated from the live site by
 * `scripts/build-fragrance-json.cjs` into `public/data/fragrances.json`.
 * We inline it as a virtual module so this app has ONE source of truth and
 * ships self-contained: no runtime fetch, so it works on Vercel (CDN), GitHub
 * Pages (static) and Render (Express) without touching server.js's static
 * allow-list (which has no entry for /data).
 */
function catalogue() {
  return {
    name: "charme-catalogue",
    resolveId(source) {
      return source === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      if (!fs.existsSync(CATALOGUE)) {
        throw new Error(
          `Missing ${CATALOGUE} — run: node scripts/build-fragrance-json.cjs`,
        );
      }
      const raw = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
      const slim = raw.map((f, i) => {
        const desc = String(f.description || "").replace(/\s+/g, " ").trim();
        return {
          id: f.id || `${f.slug}-${i}`,
          slug: f.slug,
          name: f.name,
          brand: f.brand,
          family: f.family,
          year: f.year || null,
          concentration: f.concentration || null,
          perfumer: f.perfumer || null,
          notes: (f.ingredients || []).slice(0, 6),
          fromPrice: f.fromPrice ?? null,
          sizes: (f.sizes || []).filter((s) => s && s.price != null),
          available: f.available !== false,
          image: f.image || null,
          teaser: desc.length > 220 ? `${desc.slice(0, 217)}…` : desc,
        };
      });
      return `export default ${JSON.stringify(slim)};`;
    },
  };
}

/**
 * Root takeover housekeeping.
 *
 * outDir is `public/` — the directory Express, Vercel's CDN and GitHub Pages
 * all serve. It is FULL of legacy files, so `emptyOutDir` must stay false;
 * we only ever delete our own asset dir.
 *
 * GitHub Pages has no rewrite rules, so it serves `404.html` for any path it
 * can't find. Emitting a copy of index.html as 404.html is what makes deep
 * links like /p/layton work there (at the cost of a 404 status).
 */
function rootTakeover() {
  const assetsAbs = path.join(PUBLIC_DIR, ASSETS_DIR);
  return {
    name: "charme-root-takeover",
    buildStart() {
      fs.rmSync(assetsAbs, { recursive: true, force: true });
    },
    closeBundle() {
      const indexHtml = path.join(PUBLIC_DIR, "index.html");
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, path.join(PUBLIC_DIR, "404.html"));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), catalogue(), rootTakeover()],
  // The app owns the site root now.
  base: "/",
  build: {
    outDir: PUBLIC_DIR,
    // NEVER true: public/ holds legacy.html, 170 catalogue images, css/, js/.
    emptyOutDir: false,
    assetsDir: ASSETS_DIR,
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
