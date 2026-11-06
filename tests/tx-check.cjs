/*
 * Prove db.transaction() is atomic in both directions.
 *
 * A temp table would be a poor probe: it is session-scoped, so a rollback test
 * could pass for the wrong reason. This uses a real table created INSIDE the
 * transaction, which PostgreSQL treats transactionally - so if the COMMIT
 * path is broken the table will not survive, and if the ROLLBACK path is
 * broken the row will.
 */
// @db-scope: production-write — PostgreSQL transaction semantics cannot be proven on SQLite; creates and drops only its own probe table

"use strict";

const path = require("path");
const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

const db = require(path.join(REPO, "db.js"));

const TABLE = "opencode_tx_probe";
let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, e) => { failures++; console.log("  FAIL  " + l + (e ? " -> " + e : "")); };

const exists = async () => {
  const r = await db.all(
    "select count(*)::int as n from pg_class where relname = $1",
    [TABLE],
  );
  return r[0].n > 0;
};

(async () => {
  // clean slate
  await db.run(`drop table if exists ${TABLE}`);

  console.log("\n[COMMIT path: the work must survive]");
  await db.transaction(async (t) => {
    // `raw` skips translate(), which appends RETURNING id - a column this
    // probe table deliberately does not have.
    await t.raw(`create table ${TABLE}(y int)`);
    await t.raw(`insert into ${TABLE} values (7)`);
  });
  (await exists())
    ? ok("table created inside the transaction survived COMMIT")
    : bad("COMMIT lost the work - it is not really a transaction");
  let n = await db.all(`select count(*)::int as n from ${TABLE}`);
  n[0].n === 1 ? ok("the inserted row survived") : bad("row missing after COMMIT", n[0].n);

  console.log("\n[ROLLBACK path: the work must vanish]");
  try {
    await db.transaction(async (t) => {
      await t.raw(`insert into ${TABLE} values (99)`);
      const before = await t.all(`select count(*)::int as n from ${TABLE}`);
      console.log(`         (row count inside the tx: ${before[0].n})`);
      throw new Error("simulated failure after the write");
    });
    bad("the transaction committed even though fn threw");
  } catch (e) {
    ok(`fn threw and the transaction rolled back ("${e.message}")`);
  }
  n = await db.all(`select count(*)::int as n from ${TABLE}`);
  n[0].n === 1
    ? ok("the rolled-back row is gone - the write really was undone")
    : bad("phantom row survived a rollback", `count=${n[0].n}`);

  console.log("\n[cleanup and connection health]");
  await db.run(`drop table if exists ${TABLE}`);
  (await exists()) ? bad("cleanup failed") : ok("probe table dropped");
  const after = await db.all("select 1 as ok");
  after.length ? ok("the pool still serves queries after ROLLBACK") : bad("pool broken");

  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
  process.exit(failures ? 1 : 0);
})();
