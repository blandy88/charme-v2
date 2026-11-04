/* Translation coverage: missing keys, unused keys, duplicate keys, untranslated.
 *
 * Four classes of defect live in a dictionary this size and none of them throws,
 * so none is caught by a build:
 *
 *   missing    a key is asked for but not defined - it renders as the raw key
 *   fallback   a key defined in `en` but absent from `fr`/`ar`, so the French
 *              page silently shows English
 *   unused     a key defined and never asked for
 *   duplicate  the same key written twice in one object: the first is dead and
 *              the second silently wins. `heroSecondary` is written twice in
 *              all three languages ("Our story" then "Visit us").
 *
 * An "unused" verdict is a hint, not a fact: a key reached through a variable
 * cannot be seen from the source text, and those call sites are listed too.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "frontend/src");
const DICT_FILE = path.join(SRC, "contexts/I18nContext.jsx");

const src = fs.readFileSync(DICT_FILE, "utf8");

/* Pull the STRINGS object literal out of the provider. It is plain data - keys
   and strings, no JSX - so it can be evaluated directly. */
const declStart = src.indexOf("const STRINGS = {");
if (declStart < 0) throw new Error("STRINGS not found in I18nContext.jsx");
let i = src.indexOf("{", declStart), depth = 0, end = -1;
for (; i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
const STRINGS = new Function(`return (${src.slice(src.indexOf("{", declStart), end)});`)();
const LANGS = Object.keys(STRINGS);
const EN = STRINGS.en;

function walkFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else if (/\.(jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

/* A duplicate key is unreachable once the object is parsed, so count it in the
   source text - that is the only place the first copy still exists. */
function duplicateKeys(lang) {
  const at = src.indexOf(`\n  ${lang}: {`);
  if (at < 0) return [];
  const scope = src.slice(at + 1).split(/\n  \},/)[0];
  const seen = new Set();
  const dups = [];
  for (const m of scope.matchAll(/^\s{4}([A-Za-z_$][\w$]*)\s*:/gm)) {
    const k = m[1];
    if (seen.has(k)) dups.push(k);
    else seen.add(k);
  }
  return [...new Set(dups)];
}

const used = new Set();
const dynamic = [];
for (const f of walkFiles(SRC)) {
  const s = fs
    .readFileSync(f, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const m of s.matchAll(/\bt\(\s*["'`]([A-Za-z_$][\w$]*)["'`]/g)) used.add(m[1]);
  for (const m of s.matchAll(/\bfill\(\s*["'`]([A-Za-z_$][\w$]*)["'`]/g)) used.add(m[1]);
  if (/\bt\(\s*(?!["'`])[A-Za-z_$]/.test(s)) dynamic.push(path.basename(f));
}

let findings = 0;
console.log(`\n${LANGS.join(", ")} - ${Object.keys(EN).length} keys in en, ${used.size} keys referenced\n`);

const missing = [...used].filter((k) => !(k in EN));
if (missing.length) findings++;
console.log(`missing from en (asked for, not defined): ${missing.length ? missing.join(", ") : "none"}`);

for (const lang of LANGS) {
  if (lang === "en") continue;
  const gaps = Object.keys(EN).filter((k) => !(k in STRINGS[lang]));
  if (gaps.length) { findings++; console.log(`${lang} falls back to English for ${gaps.length}: ${gaps.join(", ")}`); }
}

const unused = Object.keys(EN).filter((k) => !used.has(k));
if (unused.length) findings++;
console.log(`\nunused (defined, never asked for): ${unused.length}`);
for (const k of unused) console.log(`  ${k.padEnd(22)} = ${JSON.stringify(EN[k]).slice(0, 56)}`);

for (const lang of LANGS) {
  const d = duplicateKeys(lang);
  if (d.length) { findings++; console.log(`\nduplicate keys in ${lang} (first is dead, second wins): ${d.join(", ")}`); }
}

const SAME_OK = new Set([
  "currency", "collGrid", "collList", "admin", "collection", "guides", "contact",
  "collSortName", "news", "profile", "loyalty", "contact",
]);
for (const lang of LANGS) {
  if (lang === "en") continue;
  const same = Object.keys(EN).filter((k) => STRINGS[lang][k] === EN[k] && !SAME_OK.has(k));
  if (same.length) console.log(`\n${lang} identical to English (${same.length}): ${same.join(", ")}`);
}

if (dynamic.length) console.log(`\nnote: t(<variable>) in ${[...new Set(dynamic)].join(", ")} - those keys cannot be seen statically`);

console.log(findings ? `\n${findings} categor(ies) with findings` : "\nno findings");
process.exit(0);
