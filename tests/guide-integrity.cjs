/*
 * Every step in every guide must point at a data-guide hook that exists.
 *
 * A step whose target is absent is skipped silently at runtime (opt), so a
 * typo reads as "that screen just does not have that element yet" rather than
 * as a bug. This checks the guide data against the hooks actually declared in
 * the source, per page, so a wrong selector is caught at build time instead.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const ATELIER = path.join(REPO, "frontend/src/atelier");

/* every data-guide value declared anywhere in the app */
const declared = new Map(); // hook -> [files]
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(jsx|js)$/.test(e.name)) continue;
    const src = fs.readFileSync(p, "utf8");
    // Two forms exist: data-guide="x" and data-guide={cond ? "x" : undefined}.
    // A scanner that only handles the first reports the second as missing.
    for (const m of src.matchAll(/data-guide=(?:"([^"]+)"|\{[^}]*?"([^"]+)"[^}]*\})/g)) {
      const list = declared.get(m[1] || m[2]) || [];
      list.push(path.basename(p));
      declared.set(m[1] || m[2], list);
    }
  }
};
walk(ATELIER);

/* load guidesData.js */
const src = fs.readFileSync(path.join(ATELIER, "lib/guidesData.js"), "utf8");
const names = new Set();
for (const m of src.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)/gm)) names.add(m[1]);
const body = src
  .replace(/^export\s+default\s+[^;]+;\s*$/gm, "")
  .replace(/^export\s+/gm, "");
const mod = { exports: {} };
// eslint-disable-next-line no-new-func
new Function("module", "exports", body + `\n;Object.assign(module.exports,{${[...names].join(",")}});`)(
  mod, mod.exports,
);
const { GUIDES, CATEGORY, FILM, ROUTE } = mod.exports;

let problems = 0;
console.log(`\nguides: ${GUIDES.length}   declared data-guide hooks: ${declared.size}\n`);

console.log("[step targets must exist]");
for (const g of GUIDES) {
  const missing = (g.steps || []).filter((s) => !declared.has(s.guide));
  if (missing.length) {
    problems += 1;
    console.log(`  BAD  ${g.id}: ${missing.map((m) => m.guide).join(", ")}`);
  }
}

console.log("\n[a guide id must have a category and show in a tab]");
for (const g of GUIDES) {
  if (!CATEGORY[g.id]) { problems += 1; console.log(`  BAD  ${g.id}: no CATEGORY`); }
}

console.log("\n[step count / empty-step guides]");
const empty = GUIDES.filter((g) => !(g.steps || []).length);
console.log(`  guides with steps: ${GUIDES.length - empty.length}/${GUIDES.length}`);
console.log(`  step-only (film covers it): ${empty.map((g) => g.id).join(", ")}`);

console.log("\n[i18n: every step needs all three languages]");
const LANGS = ["en", "fr", "ar"];
for (const g of GUIDES) {
  for (const s of g.steps || []) {
    for (const k of ["t", "d"]) {
      for (const L of LANGS) {
        if (!s[k] || !s[k][L]) {
          problems += 1;
          console.log(`  BAD  ${g.id}/${s.guide}: ${k}.${L} missing`);
        }
      }
    }
  }
  for (const L of LANGS) {
    if (!g.title || !g.title[L]) { problems += 1; console.log(`  BAD  ${g.id}: title.${L} missing`); }
    if (!g.desc || !g.desc[L]) { problems += 1; console.log(`  BAD  ${g.id}: desc.${L} missing`); }
  }
}

console.log("\n[FILM map still resolves]");
for (const [guide, film] of Object.entries(FILM)) {
  if (!GUIDES.some((g) => g.id === guide)) { problems += 1; console.log(`  BAD  FILM key for unknown guide ${guide}`); }
}

console.log("\n[a guide must have at least one step that is NOT optional]");
/* Every step optional means the tour can resolve to nothing at all and the
   reader only ever sees "this element is not visible". One unconditional step
   guarantees the tour has something to say. */
for (const g of GUIDES) {
  const steps = g.steps || [];
  if (!steps.length) continue;
  const solid = steps.filter((s) => !s.opt);
  if (!solid.length) {
    problems += 1;
    console.log(`  BAD  ${g.id}: all ${steps.length} steps are opt, tour can show nothing`);
  }
}

console.log("\n[ROUTE map: every key must be a real guide, every value a real route]");
const ROUTES = ["/collection", "/auth", "/cart", "/profile", "/favorites", "/contact", "/loyalty", "/admin", "/news"];
for (const [guide, r] of Object.entries(ROUTE)) {
  if (!GUIDES.some((g) => g.id === guide)) { problems += 1; console.log(`  BAD  ROUTE key for unknown guide ${guide}`); }
  const path = typeof r === "string" ? r : r.path;
  if (path && !ROUTES.includes(path)) { problems += 1; console.log(`  BAD  ROUTE for ${guide} -> ${path} is not a known route`); }
  const open = typeof r === "string" ? null : r.open;
  /* Whatever a route opens has to be a selector that can match a hook. */
  if (open && !declared.has((open.match(/data-guide="([^"]+)"/) || [])[1])) {
    problems += 1;
    console.log(`  BAD  ROUTE for ${guide} opens ${open}, which is not a declared hook`);
  }
}
const uncovered = GUIDES.filter((g) => !(g.steps || []).length).map((g) => g.id);
console.log(`  guides routed: ${Object.keys(ROUTE).length} (unrouted, chrome-only: ${GUIDES.length - Object.keys(ROUTE).length - uncovered.length})`);

console.log(`\n${problems ? problems + " PROBLEM(S)" : "no problems found"}`);
process.exit(problems ? 1 : 0);
