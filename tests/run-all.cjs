/* Run every regression check.
 *
 * Usage:  node tests/run-all.cjs
 *         node tests/run-all.cjs --allow-production-writes
 *
 * Each check is a separate process so one throwing cannot hide the rest, and
 * each must exit 0.
 *
 * SAFETY: every test declares its database scope with `@db-scope:`. Tests that
 * write to a real database are SKIPPED by default. In 2026 a regression test
 * connected to production, borrowed card id 1 and added three points to a real
 * customer on every run; nothing in this file noticed for three weeks. Now the
 * default run cannot touch live data at all, and the opt-in is a deliberate,
 * visible act.
 */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const ALLOW_PRODUCTION_WRITES = process.argv.includes("--allow-production-writes");

const CHECKS = [
  "loyalty-guards", // structural guards first - they gate everything else
  "placeholder-proof",
  "placeholder-live",
  "price-check",
  "sqli-regress",
  "authz-check",
  "tx-check",
  "key-encryption",
  "ssrf-check",
  "verify-fixes",
  "loyalty-atomic",
  "loyalty-cards-integration",
  "perfume-admin-static", // pure PNG + field validation, no server
  "perfume-admin", // isolated HTTP integration suite
  "guide-integrity",
  "video-audit",
];

// Checks that live outside this folder (written earlier, against the same
// database) are skipped rather than failed when absent.
const OPTIONAL = new Set(["sqli-regress", "authz-check", "tx-check", "key-encryption", "ssrf-check", "verify-fixes", "loyalty-atomic", "guide-integrity", "video-audit"]);

const scopeOf = (file) => {
  try {
    const m = fs.readFileSync(file, "utf8").match(/@db-scope:\s*(isolated|production-readonly|production-write|no-database)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

let failed = 0;
let skipped = 0;

for (const name of CHECKS) {
  const file = path.join(HERE, `${name}.cjs`);
  if (!fs.existsSync(file)) {
    if (OPTIONAL.has(name)) { skipped++; console.log(`SKIP  ${name} (script lives outside tests/)`); continue; }
    failed++; console.log(`FAIL  ${name} (missing)`); continue;
  }

  const scope = scopeOf(file);
  if (scope === "production-write" && !ALLOW_PRODUCTION_WRITES) {
    skipped++;
    console.log(`SKIP  ${name.padEnd(26)} writes to a real database — pass --allow-production-writes to include it`);
    continue;
  }

  const t = Date.now();
  const r = spawnSync(process.execPath, [file], { encoding: "utf8", timeout: 300000 });
  const ms = Date.now() - t;
  const ok = r.status === 0;
  if (!ok) failed++;
  const tail = String(r.stdout || r.stderr || "")
    .trim()
    .split("\n")
    .filter(Boolean)
    .pop();
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(26)} ${String(ms).padStart(6)}ms  ${(tail || "").slice(0, 60)}`);
  if (!ok && r.stdout) {
    console.log(String(r.stdout).split("\n").filter((l) => /FAIL|Error|error/.test(l)).slice(0, 6).map((l) => "        " + l.trim()).join("\n"));
  }
}

console.log(`\n${CHECKS.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped`);
if (skipped && !ALLOW_PRODUCTION_WRITES) {
  console.log("Production-writing tests were skipped. That is the safe default.");
}
process.exit(failed ? 1 : 0);
