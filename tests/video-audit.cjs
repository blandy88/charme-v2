/*
 * Audit the tutorial films against what is actually on disk.
 *
 * Loads the real data modules (by rewriting the ESM `export` so they can be
 * required) rather than regex-scraping them, so guide ids are guide ids and a
 * film's chapters are that film's own chapters.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const PUB = path.join(REPO, "public");

const load = (rel) => {
  const src = fs.readFileSync(path.join(REPO, rel), "utf8");
  // Drop `export default X;` entirely, unwrap `export const`, then publish
  // every top-level const onto module.exports. Handling the default export by
  // assigning to module.exports would clobber the named exports, because these
  // files carry both.
  const names = new Set();
  for (const m of src.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)/gm)) names.add(m[1]);
  const body = src
    .replace(/^export\s+default\s+[^;]+;\s*$/gm, "")
    .replace(/^export\s+/gm, "");
  const publish = `\n;Object.assign(module.exports, { ${[...names].join(", ")} });`;
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", body + publish)(mod, mod.exports);
  return mod.exports;
};

const videos = load("frontend/src/atelier/lib/guideVideos.js").GUIDE_VIDEOS;
const guidesMod = load("frontend/src/atelier/lib/guidesData.js");
const GUIDES = guidesMod.GUIDES || [];
/* The app resolves a guide to a film through the FILM alias map, not by
   matching ids - the console tour is guide `console` but film `admin-console`.
   Matching ids directly (as a first pass did) reports 7 false "missing". */
const FILM = guidesMod.FILM || {};

console.log(`\nfilms in guideVideos.js : ${Object.keys(videos).length}`);
console.log(`guides in guidesData.js : ${GUIDES.length}`);

let problems = 0;

console.log("\n[file + integrity checks]");
for (const [id, v] of Object.entries(videos)) {
  const mp4 = path.join(PUB, String(v.src).replace(/^\//, ""));
  const jpg = path.join(PUB, String(v.poster).replace(/^\//, ""));
  const mp4Ok = fs.existsSync(mp4) && fs.statSync(mp4).size > 1024;
  const jpgOk = fs.existsSync(jpg) && fs.statSync(jpg).size > 1024;
  const chs = v.chapters || [];
  const over = chs.filter((c) => Number(c.t) > Number(v.duration) + 0.01);
  const unsorted = chs.some((c, i) => i > 0 && Number(c.t) <= Number(chs[i - 1].t));
  const bad = [];
  if (!mp4Ok) bad.push("mp4 missing/empty");
  if (!jpgOk) bad.push("poster missing/empty");
  if (over.length) bad.push(`chapter past end: ${over.map((c) => c.t).join(",")} > ${v.duration}`);
  if (unsorted) bad.push("chapters not in ascending order");
  if (chs.length === 0) bad.push("no chapters");
  if (bad.length) problems += 1;
  console.log(
    `  ${bad.length ? "BAD " : "ok  "} ${id.padEnd(24)} ${chs.length} chapters  ${bad.join("; ")}`,
  );
}

console.log("\n[films on disk not referenced by any guide]");
const onDisk = fs
  .readdirSync(path.join(PUB, "media", "guides"))
  .filter((f) => f.endsWith(".mp4"))
  .map((f) => f.replace(/\.mp4$/, ""));
for (const f of onDisk) {
  if (!videos[f]) {
    problems += 1;
    console.log(`  ORPHAN  ${f}.mp4`);
  }
}

console.log("\n[guides: film present?]");
const noFilm = [];
for (const g of GUIDES) {
  const has = Boolean(videos[FILM[g.id]]);
  const steps = (g.steps || []).length;
  console.log(`  ${has ? "film " : "NOFILM"}  ${String(g.id).padEnd(22)} ${String(steps).padStart(2)} steps  ${(g.title && (g.title.en || g.title.fr) || "").slice(0, 38)}`);
  if (!has) noFilm.push(g.id);
}

/* Every FILM target must exist, or the card renders an empty player. */
console.log("\n[FILM map targets that do not exist as a film]");
let dangling = 0;
for (const [guide, film] of Object.entries(FILM)) {
  if (!videos[film]) { dangling += 1; problems += 1; console.log(`  DANGLING ${guide} -> ${film}`); }
  if (!GUIDES.some((g) => g.id === guide)) { dangling += 1; problems += 1; console.log(`  ORPHAN map entry for unknown guide "${guide}"`); }
}
if (!dangling) console.log("  none");

console.log(`\nsummary: ${problems} integrity problem(s); ${noFilm.length}/${GUIDES.length} guides have no film`);
console.log("guides without a film: " + (noFilm.join(", ") || "none"));
