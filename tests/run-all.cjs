/* Run every regression check from the 2026-10-17 audit.
 *
 * Usage:  node tests/run-all.cjs
 *
 * Each check is a separate process so one throwing cannot hide the rest, and
 * each must exit 0. placeholder-live needs the database up; it creates and
 * drops its own probe table and touches nothing else.
 */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const HERE = __dirname;
const CHECKS = [
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
  "guide-integrity",
  "video-audit",
];

// Checks that live outside this folder (written earlier, against the same
// database) are skipped rather than failed when absent.
const OPTIONAL = new Set(["sqli-regress", "authz-check", "tx-check", "key-encryption", "ssrf-check", "verify-fixes", "loyalty-atomic", "guide-integrity", "video-audit"]);

let failed = 0;
let skipped = 0;

for (const name of CHECKS) {
  const file = path.join(HERE, `${name}.cjs`);
  const present = require("fs").existsSync(file);
  if (!present) {
    if (OPTIONAL.has(name)) { skipped++; console.log(`SKIP  ${name} (script lives outside tests/)`); continue; }
    failed++; console.log(`FAIL  ${name} (missing)`); continue;
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
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(18)} ${String(ms).padStart(6)}ms  ${(tail || "").slice(0, 60)}`);
  if (!ok && r.stdout) {
    console.log(String(r.stdout).split("\n").filter((l) => /FAIL|Error|error/.test(l)).slice(0, 6).map((l) => "        " + l.trim()).join("\n"));
  }
}

console.log(`\n${CHECKS.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);