/* Find verbatim-duplicated CSS rules.
 *
 * A stylesheet that repeats itself is not only wasted bytes: the later copy
 * silently wins, so editing the earlier one appears to do nothing and nothing
 * points at the cause. chrome.css was reported as carrying a large block that
 * repeats an earlier one - this measures the claim rather than trusting the
 * line numbers in an old report.
 */
"use strict";
const fs = require("fs");
const path = require("path");

/* Split into top-level rules, tracking the line each starts on. Braces inside
   strings and comments do not count. */
function rules(src) {
  const out = [];
  let i = 0, depth = 0, start = 0, line = 1, startLine = 1;
  let inStr = null, inComment = false;
  const bump = (n) => { for (let k = 0; k < n; k++) if (src[k] === "\n") line++; };

  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (inComment) {
      if (c === "*" && d === "/") { inComment = false; i += 2; bump(2); continue; }
      if (c === "\n") line++;
      i++; continue;
    }
    if (inStr) {
      if (c === "\\") { i += 2; continue; }
      if (c === inStr) inStr = null;
      if (c === "\n") line++;
      i++; continue;
    }
    if (c === "/" && d === "*") { inComment = true; i += 2; bump(2); continue; }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === "{") { depth++; i++; continue; }
    if (c === "}") {
      depth--;
      out.push({ text: src.slice(start, i + 1), line: startLine });
      i++;
      while (i < src.length && /\s/.test(src[i])) { if (src[i] === "\n") line++; i++; }
      start = i; startLine = line;
      continue;
    }
    i++;
  }
  return out;
}

const norm = (r) => r.replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").trim();

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node dup-css.cjs <file.css>..."); process.exit(2); }

let grandRules = 0, grandDupeRules = 0, grandWasted = 0;

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const rs = rules(src);
  const seen = new Map();
  const groups = new Map();

  for (const r of rs) {
    const k = norm(r.text);
    if (!k || k.length < 12) continue;
    if (seen.has(k)) {
      if (!groups.has(k)) groups.set(k, { hits: [seen.get(k)] });
      groups.get(k).hits.push(r);
    } else {
      seen.set(k, r);
    }
  }

  const dupExtra = [...groups.values()].reduce((n, g) => n + g.hits.length, 0);
  const wastedBytes = [...groups.entries()].reduce((n, [k, g]) => n + k.length * g.hits.length, 0);

  console.log(`\n=== ${path.basename(f)} ===`);
  console.log(`  ${rs.length} rules, ${groups.size} selectors duplicated, ${dupExtra} redundant copies`);

  for (const [k, g] of [...groups.entries()].sort((a, b) => b[1].hits.length - a[1].hits.length).slice(0, 10)) {
    const sel = k.slice(0, k.indexOf("{")).trim();
    console.log(`    x${g.hits.length + 1}  lines ${g.hits.map((h) => h.line).join(", ")}   ${sel.slice(0, 70)}`);
  }

  grandRules += rs.length; grandDupeRules += dupExtra; grandWasted += wastedBytes;
}

console.log(`\ntotals: ${grandRules} rules, ${grandDupeRules} redundant copies, ~${Math.round(grandWasted / 1024)} KB duplicated`);