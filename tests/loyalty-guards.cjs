/*
 * Structural guards for the loyalty code.
 *
 * These do not test behaviour - they test the SHAPE of the codebase, because the
 * 2026 loyalty incident was not a logic error. It was a test that quietly
 * connected to the production database and borrowed card id 1. The arithmetic
 * was always right; the blast radius was wrong.
 *
 * Every rule here exists to make a repeat impossible to merge without noticing.
 *
 *   node tests/loyalty-guards.cjs
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const TESTS = __dirname;

let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, detail) => {
  failures++;
  console.log("  FAIL  " + l);
  if (detail) String(detail).split("\n").slice(0, 12).forEach((d) => console.log("          " + d));
};

/* ------------------------------------------------------------------ *
 * G1. Every test that can reach a database must declare its scope.
 *
 *     The incident happened because one test had no declared scope and the
 *     default was "whatever .env says", which is production. Silence is now
 *     an error, so a new test cannot inherit production by accident.
 * ------------------------------------------------------------------ */
console.log("\n[G1. every database-touching test declares its scope]");

const SCOPE_RE = /@db-scope:\s*(isolated|production-readonly|production-write|no-database)/;
const WRITE_RE = /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE|TRUNCATE|ALTER\s+TABLE)\b/i;

/* The only files allowed to write to a real database, each for a stated reason.
 * Adding to this list is a deliberate act, which is the point. */
const PRODUCTION_WRITERS = {
  "tx-check.cjs":
    "must prove PostgreSQL transaction semantics, which SQLite cannot; creates and drops only its own probe table",
  "placeholder-live.cjs":
    "must prove the real schema accepts the placeholder constraint; creates and drops only its own probe table",
};

const testFiles = fs
  .readdirSync(TESTS)
  .filter((f) => f.endsWith(".cjs") && f !== "loyalty-guards.cjs" && f !== "run-all.cjs");

const undeclared = [];
const badIsolation = [];
const readOnlyButWrites = [];
const unlistedWriter = [];

for (const file of testFiles) {
  const src = fs.readFileSync(path.join(TESTS, file), "utf8");
  /* A test can reach the database through db.js, through pg, or through the
   * admin-assistant tools (which run SQL). Loading .env alone is harmless - it is
   * often just an encryption key - so it does not by itself require a scope. */
  const touchesDb =
    /db\.js/.test(src) ||
    /require\([^)]*["']pg["']\)/.test(src) ||
    /adminAssistant\/tools\.js/.test(src);
  if (!touchesDb) continue;

  const m = src.match(SCOPE_RE);
  if (!m) {
    undeclared.push(file);
    continue;
  }
  const scope = m[1];

  if (scope === "isolated") {
    const forcesEmpty = /process\.env\.DATABASE_URL\s*=\s*["']{2}/.test(src);
    const setsPath = /process\.env\.SQLITE_PATH\s*=/.test(src);
    if (!forcesEmpty || !setsPath) {
      badIsolation.push(`${file}: declares @db-scope: isolated but does not force DATABASE_URL="" + SQLITE_PATH`);
    }
  } else if (scope === "production-readonly") {
    /* Write SQL in the source is fine here - sqli-regress is full of attack
     * payloads like "drop table reviews" that must be REJECTED. What matters is
     * that the test never executes a write, so it may only use the read helpers. */
    if (/\bdb\.(run|exec)\s*\(/.test(src)) {
      readOnlyButWrites.push(`${file}: declares @db-scope: production-readonly but calls db.run/db.exec`);
    }
  } else if (scope === "production-write") {
    if (!PRODUCTION_WRITERS[file]) unlistedWriter.push(file);
  } else if (scope === "no-database") {
    /* Declares that it imports shared modules but never opens a connection. */
    if (/require\([^)]*db\.js/.test(src)) {
      badIsolation.push(`${file}: declares @db-scope: no-database but requires db.js`);
    }
  }
}

if (undeclared.length) {
  bad(`${undeclared.length} test(s) reach a database without @db-scope`, undeclared.join("\n"));
} else {
  ok(`all ${testFiles.length} test files declare their database scope`);
}
if (badIsolation.length) bad("isolated tests that are not actually isolated", badIsolation.join("\n"));
else ok("every @db-scope: isolated test forces its own throwaway database");
if (readOnlyButWrites.length) bad("tests declared read-only that contain write SQL", readOnlyButWrites.join("\n"));
else ok("no test declared read-only contains write SQL");
if (unlistedWriter.length) bad("unlisted production writers", unlistedWriter.join("\n"));
else ok("the only production writers are the two documented probe-table tests");

/* ------------------------------------------------------------------ *
 * G2. The regression test that caused the incident must stay isolated.
 * ------------------------------------------------------------------ */
console.log("\n[G2. tests/loyalty-atomic.cjs can never touch production again]");

const atomic = fs.readFileSync(path.join(TESTS, "loyalty-atomic.cjs"), "utf8");
const atomicChecks = [
  [/process\.env\.DATABASE_URL\s*=\s*["']{2}/, "forces DATABASE_URL to empty"],
  [/process\.env\.SQLITE_PATH\s*=/, "points db.js at a throwaway file"],
  [/db\.dialect\s*!==\s*["']sqlite["']/, "refuses to run on any non-sqlite dialect"],
  [/os\.tmpdir\(\)/, "creates the throwaway file in the OS temp directory"],
];
const atomicMissing = atomicChecks.filter(([re]) => !re.test(atomic)).map(([, why]) => why);
if (atomicMissing.length) bad("loyalty-atomic.cjs is missing a safeguard", atomicMissing.join("\n"));
else ok("loyalty-atomic.cjs has all four isolation safeguards");

/* It must build its own card rather than borrow one. Selecting "ORDER BY id
 * LIMIT 1" is fine now that the database is a throwaway file, but only if the
 * test seeds that card itself. */
if (!/INSERT INTO loyalty_cards/.test(atomic)) {
  bad("loyalty-atomic.cjs does not create its own card - it is still borrowing one");
} else {
  ok("loyalty-atomic.cjs seeds its own throwaway card");
}

/* It must capture the balance BEFORE the probe, not after - that inversion is
 * what turned every run into a permanent +3. */
if (/baseline[\s\S]{0,120}pointsOf/.test(atomic) || /before\s*=\s*await pointsOf/.test(atomic)) {
  ok("loyalty-atomic.cjs captures the baseline before the probe");
} else {
  bad("loyalty-atomic.cjs no longer proves it captures the pre-probe balance");
}

/* ------------------------------------------------------------------ *
 * G3. server.js: the number of places that can move a point must not grow
 *     silently. Each one must sit next to a ledger write.
 * ------------------------------------------------------------------ */
console.log("\n[G3. every point mutation in server.js is paired with a ledger row]");

const server = fs.readFileSync(path.join(REPO, "server.js"), "utf8");
const lines = server.split("\n");

const pointWrites = [];
lines.forEach((line, i) => {
  if (/UPDATE loyalty_cards SET/.test(line) && /points\s*=\s*points/.test(line)) {
    pointWrites.push({ line: i + 1, text: line.trim() });
  }
});
/* The admin edit builds its SET clause dynamically; it is the one exception and
 * is checked separately below. */
const dynamicEdit = /extraUpdates\.push\("points = points \+ \?"\)/.test(server);

const EXPECTED_POINT_WRITES = 4; // add, redeem, purchase award, purchase reversal
if (pointWrites.length !== EXPECTED_POINT_WRITES) {
  bad(`expected ${EXPECTED_POINT_WRITES} point-mutating UPDATEs in server.js, found ${pointWrites.length}`,
    pointWrites.map((p) => `line ${p.line}: ${p.text}`).join("\n"));
} else {
  ok(`${pointWrites.length} point-mutating UPDATE statements, as expected`);
}

if (!dynamicEdit) bad("the admin-edit path no longer uses a relative write - re-audit it");
else ok("the admin-edit path still uses a relative write (points = points + delta)");

/* Each point write must be accompanied by a ledger movement within 30 lines:
 * either a new row (logLoyaltyTransaction) or the removal of the row it reverses
 * (the purchase-delete path deletes the award it is taking back). */
const unlogged = [];
for (const p of pointWrites) {
  const window = lines.slice(Math.max(0, p.line - 1), p.line + 30).join("\n");
  if (!/logLoyaltyTransaction|DELETE FROM loyalty_transactions/.test(window)) {
    unlogged.push(`line ${p.line}: ${p.text}`);
  }
}
if (unlogged.length) bad("point writes with no ledger movement nearby", unlogged.join("\n"));
else ok("every point-mutating UPDATE is accompanied by a ledger row being added or removed");

/* The admin edit logs conditionally - prove the condition is "the balance moved". */
if (!/if \(pointsDiff !== 0\)[\s\S]{0,200}logLoyaltyTransaction/.test(server)) {
  bad("the admin edit no longer logs when the balance changes");
} else {
  ok("the admin edit logs exactly when pointsDiff !== 0");
}

/* The ledger is written in exactly one function. It carries two SQL variants -
 * with and without purchase_id, for databases that have not run that migration -
 * so two occurrences are correct, but they must both live inside
 * logLoyaltyTransaction. */
const insertSites = (server.match(/INSERT INTO loyalty_transactions/g) || []).length;
const logFnStart = server.indexOf("function logLoyaltyTransaction");
const logFnEnd = logFnStart === -1 ? -1 : server.indexOf("\n}", logFnStart);
const logFn = logFnStart === -1 ? "" : server.slice(logFnStart, logFnEnd);
const insertsInLogFn = (logFn.match(/INSERT INTO loyalty_transactions/g) || []).length;
if (logFnStart === -1) {
  bad("logLoyaltyTransaction not found in server.js");
} else if (insertSites !== insertsInLogFn) {
  bad(`${insertSites - insertsInLogFn} ledger INSERT(s) exist outside logLoyaltyTransaction`,
    "all ledger writes must go through the one helper so the balance and its explanation land together");
} else {
  ok(`all ${insertSites} ledger INSERT variants live inside logLoyaltyTransaction`);
}
const deleteSites = (server.match(/DELETE FROM loyalty_transactions/g) || []).length;
if (deleteSites !== 1) bad(`expected exactly 1 DELETE FROM loyalty_transactions, found ${deleteSites}`);
else ok("exactly one place deletes a ledger row (purchase-scoped)");

/* The delete must stay scoped to a purchase, never to a card. */
const delLine = lines.find((l) => /DELETE FROM loyalty_transactions/.test(l)) || "";
if (/purchase_id/.test(delLine)) ok("the ledger delete is scoped to a purchase_id");
else bad("the ledger delete is no longer scoped to a purchase_id: " + delLine.trim());

/* ------------------------------------------------------------------ *
 * G4. The list default must stay above the data it serves.
 *     LIMIT 500 hid 142 cards and nobody noticed for two days.
 * ------------------------------------------------------------------ */
console.log("\n[G4. the admin list default cannot silently truncate the table]");

const limitMatch = server.match(/const LIST_LIMIT_DEFAULT\s*=\s*(\d+)/);
if (!limitMatch) {
  bad("LIST_LIMIT_DEFAULT not found in server.js");
} else {
  const limit = Number(limitMatch[1]);
  const hardCap = (server.match(/const LIST_LIMIT_MAX\s*=\s*(\d+)/) || [])[1];
  if (limit < 1000) bad(`LIST_LIMIT_DEFAULT is ${limit} - the 2026 incident was a default of 500`);
  else ok(`LIST_LIMIT_DEFAULT is ${limit}`);
  if (hardCap && Number(hardCap) < limit) bad(`LIST_LIMIT_MAX (${hardCap}) is below the default (${limit})`);
  else if (hardCap) ok(`LIST_LIMIT_MAX is ${hardCap}`);
}

/* The endpoint must report how many rows exist versus how many it returned, so a
 * client can prove it is not looking at a truncated list. */
const hasPagingMeta = /hasMore/.test(server) && /totalCards/.test(server);
if (!hasPagingMeta) bad("the loyalty list endpoint no longer reports totalCards/hasMore");
else ok("the list endpoint reports totalCards and hasMore, so truncation is visible");

/* ------------------------------------------------------------------ *
 * G5. Destructive scripts must ask first.
 *     The August ledger history was destroyed by an unguarded TRUNCATE.
 * ------------------------------------------------------------------ */
console.log("\n[G5. destructive scripts refuse to run without explicit consent]");

const migratePath = path.join(REPO, "scripts", "migrate-local-to-pg.cjs");
if (!fs.existsSync(migratePath)) {
  console.log("  SKIP  migrate-local-to-pg.cjs not present");
} else {
  const mig = fs.readFileSync(migratePath, "utf8");
  if (!/TRUNCATE/.test(mig)) {
    ok("the migration script no longer truncates");
  } else {
    const guarded =
      /--i-understand-this-wipes-the-database/.test(mig) &&
      /process\.argv/.test(mig);
    if (guarded) ok("TRUNCATE is gated behind an explicit confirmation flag");
    else bad("migrate-local-to-pg.cjs TRUNCATEs with no confirmation flag");
  }
}

/* ------------------------------------------------------------------ *
 * G6. The integrity check must exist and be runnable.
 * ------------------------------------------------------------------ */
console.log("\n[G6. a standing integrity check exists]");
const checker = path.join(REPO, "scripts", "check-loyalty-integrity.cjs");
if (fs.existsSync(checker)) ok("scripts/check-loyalty-integrity.cjs is present");
else bad("scripts/check-loyalty-integrity.cjs is missing - nothing would catch a silent drift");

/* ------------------------------------------------------------------ *
 * G7. No real credentials in a test file.
 *     authz-check.cjs used to carry a live administrator address and password.
 *     That put a working login into the repository. Tests may create throwaway
 *     accounts; they may not embed a person's real account.
 * ------------------------------------------------------------------ */
console.log("\n[G7. no real credentials committed in tests]");

const REAL_EMAIL = /["'`][A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|live|proton)\.[A-Za-z.]{2,}["'`]/i;
const offenders = [];
for (const file of testFiles) {
  const src = fs.readFileSync(path.join(TESTS, file), "utf8");
  if (REAL_EMAIL.test(src)) offenders.push(file);
}
if (offenders.length) {
  bad("test files embed a real e-mail address", offenders.join("\n"));
} else {
  ok("no test file embeds a real e-mail address");
}

/* ------------------------------------------------------------------ *
 * G8. The invariant must be asserted automatically, in the running app.
 *
 *     G6 only proves a script exists on disk. A script nobody runs catches
 *     nothing -- that is precisely how a 30-point drift survived three weeks.
 *     The server must therefore check balance == SUM(ledger) on every boot and
 *     report a violation loudly. Deleting that assertion has to fail the build.
 * ------------------------------------------------------------------ */
console.log("\n[G8. the server asserts the invariant on boot]");

const bootAssert = /function assertLoyaltyInvariant\s*\(/.test(server);
if (bootAssert) ok("server.js defines assertLoyaltyInvariant()");
else bad("server.js no longer defines the boot-time invariant assertion");

const bootWired = /loyaltyLedgerReady\.then\(\s*\(\)\s*=>\s*assertLoyaltyInvariant\(/.test(server);
if (bootWired) ok("the assertion is wired to run after the ledger migration settles");
else bad("the boot-time assertion exists but is never called");

const bootQuery = /HAVING\s+c\.points\s*<>\s*COALESCE\(SUM\(t\.points_change\),\s*0\)/i.test(server);
if (bootQuery) ok("the assertion compares the balance against the ledger sum in SQL");
else bad("the assertion no longer compares balance against SUM(points_change)");

// The check must never be able to take the site down: it is diagnostic only.
const bootGuard =
  /assertLoyaltyInvariant[\s\S]{0,3000}?catch\s*\(/.test(server) &&
  !/assertLoyaltyInvariant[\s\S]{0,3000}?process\.exit/.test(server);
if (bootGuard) ok("the assertion cannot crash or exit the server");
else bad("the assertion may throw or exit - a diagnostic must never take the site down");

console.log("\n" + (failures ? `${failures} GUARD FAILURE(S)` : "all guards passed"));
process.exit(failures ? 1 : 0);
