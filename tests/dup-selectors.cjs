/* Selectors that appear more than once in one stylesheet.
 *
 * Exact-duplicate detection misses the case that actually bites: a second
 * block written for the same element with different declarations. The later
 * one silently wins, so editing the earlier one does nothing and nothing points
 * at the cause. chrome.css carries a second, "smoother, friendlier" search
 * panel block that is not byte-identical to the first and so was invisible to
 * an exact-match check.
 */
"use strict";
const fs = require("fs");
const path = require("path");

function split(src) {
  const out = [];
  let i = 0, depth = 0, start = 0, line = 1, startLine = 1;
  let inStr = null, inComment = false;
  const bump = (n) => { for (let k = 0; k < n; k++) if (src[k] === "\n") line++; };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (inComment) { if (c === "*" && d === "/") { inComment = false; i += 2; bump(2); continue; } if (c === "\n") line++; i++; continue; }
    if (inStr) { if (c === "\\") { i += 2; continue; } if (c === inStr) inStr = null; if (c === "\n") line++; i++; continue; }
    if (c === "/" && d === "*") { inComment = true; i += 2; bump(2); continue; }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === "{") { depth++; i++; continue; }
    if (c === "}") {
      depth--;
      out.push({ sel: src.slice(start, i), body: src.slice(i), line: startLine });
      i++;
      while (i < src.length && /\s/.test(src[i])) { if (src[i] === "\n") line++; i++; }
      start = i; startLine = line;
      continue;
    }
    i++;
  }
  return out;
}

const clean = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();

for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8");
  const rules = split(src).map((r) => ({ ...r, sel: clean(r.sel) })).filter((r) => r.sel && !r.sel.startsWith("@"));
  const by = new Map();
  for (const r of rules) {
    for (const one of r.sel.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!by.has(one)) by.set(one, []);
      by.get(one).push(r);
    }
  }
  const reps = [...by.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n=== ${path.basename(f)} ===`);
  console.log(`  ${rules.length} rules, ${by.size} distinct selectors`);
  console.log(`  repeated: ${reps.length}`);
  for (const [sel, v] of reps.sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
    // A selector declared twice at the same brace depth means two competing
    // rules for one element: the later silently wins.
    const sameScope = new Set(v.map((r) => r.depth)).size === 1;
    console.log(
      `    x${v.length}  lines ${v.map((r) => r.line).join(", ")}  ` +
      `${sameScope ? "COMPETING" : "scoped  "}  ${sel.slice(0, 60)}`,
    );
  }
}