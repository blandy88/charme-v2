import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const CATALOGUE = path.resolve(repoRoot, "public/data/fragrances.json");

const VIRTUAL_ID = "virtual:catalogue";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/**
 * The catalogue is generated from the live site by
 * `scripts/build-fragrance-json.cjs` into `public/data/fragrances.json`.
 * We inline it as a virtual module so this app has ONE source of truth and
 * ships self-contained: no runtime fetch, so it works on Vercel (CDN), GitHub
 * Pages (static) and Render (Express) without touching server.js's static
 * allow-list. Long prose is trimmed here to keep the bundle lean.
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
