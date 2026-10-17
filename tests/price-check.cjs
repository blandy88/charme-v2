/* Does every price in the shop now render the same way?
 *
 * Five formatters were in use; two of them did not round, and one wrote the
 * unit in capitals. A stored 259.999 read "259.999 dt" in the back office and
 * "260 dt" in the shop. This checks the single formatter that replaced them,
 * and greps the source for the shapes that used to bypass it.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");

/* lift money/formatPrice/CURRENCY out of catalog.js without importing the app */
const src = fs.readFileSync(path.join(REPO, "frontend/src/atelier/lib/catalog.js"), "utf8");
const grab = (name) => {
  const m = src.match(new RegExp(`export (?:function|const) ${name}[\\s\\S]*?\\n}`));
  if (!m) throw new Error(name + " not found");
  return m[0].replace(/^export /, "");
};
const { formatPrice, money, CURRENCY } = new Function(
  `const CURRENCY = "dt";
   ${grab("formatPrice")}
   ${grab("money")}
   return { formatPrice, money, CURRENCY };`,
)();

let bad = 0;
const cases = [
  [null, "-", "a missing price is a dash, not 'null dt'"],
  [undefined, "-", "undefined is a dash"],
  [0, "0 dt", "zero is a real price"],
  [259.999, "260 dt", "three decimals round to two"],
  [259.99, "259.99 dt", "two decimals survive"],
  [260, "260 dt", "a whole number gets no decimals"],
  ["259.999", "260 dt", "a string price from the API rounds too"],
  [NaN, "-", "NaN is a dash, not 'NaN dt'"],
  [Infinity, "-", "Infinity is a dash"],
  [1.005, "1 dt", "banker-ish rounding is at least stable"],
];

console.log("");
for (const [input, want, why] of cases) {
  const got = money(input);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  money(${JSON.stringify(input)}) = ${JSON.stringify(got)}  want ${JSON.stringify(want)}   (${why})`);
}

console.log(`\nCURRENCY = ${JSON.stringify(CURRENCY)}`);

/* now grep for the shapes that used to bypass the formatter */
const walk = (d) => {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { out.push(...walk(p)); continue; }
    if (/\.(jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
};
const BAD = [
  ["raw template price", /\$\{[^}]*price[^}]*\}\s*dt/gi],
  ["capital DT", /\bDT\b/g],
  // toFixed is legitimate for a rating average or a percentage, so only flag it
  // where the thing being formatted is money.
  ["toFixed on a price", /\.toFixed\([^)]*\)[^;]{0,40}(price|amount|total|dt)/gi],
  ["local money helper", /const money = \(/g],
];
console.log("");
for (const [label, re] of BAD) {
  const hits = [];
  for (const f of walk(path.join(REPO, "frontend/src"))) {
    const s = fs.readFileSync(f, "utf8");
    // skip comments so a note about the old bug is not counted as one
    const code = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const m = code.match(re);
    if (m) hits.push(`${path.basename(f)} x${m.length}`);
  }
  // catalog.js is the formatter itself; it is expected to mention toFixed
  const filtered = hits.filter((h) => !h.startsWith("catalog.js"));
  const ok = filtered.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  no ${label} left  ${filtered.join(", ")}`);
}

console.log(bad ? `\n${bad} problem(s)` : "\nall checks passed");
process.exit(bad ? 1 : 0);