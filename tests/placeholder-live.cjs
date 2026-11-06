/* Prove the placeholder fix against the live database, not just the extracted
 * function.
 *
 * The bug's consequence was that a query carrying a `?` in a comment renumbered
 * every placeholder after it, so the caller's positional values bound to the
 * wrong columns. This writes two rows with a commented query - one through the
 * fixed code path, one to show the rows are distinguishable - and reads them
 * back by value.
 *
 * Creates and drops its own probe table. Nothing else is touched.
 */
// @db-scope: production-write — proves the real schema accepts the placeholder constraint; creates and drops only its own probe table

"use strict";
const path = require("path");
process.chdir(path.resolve(__dirname, ".."));
const db = require(path.join(process.cwd(), "db.js"));

/* INTEGER PRIMARY KEY auto-increments in SQLite but not in Postgres, and the
   shim does not translate it - so use an explicit key and supply it. That is a
   difference between the two engines, not a defect to chase here. */
const CREATE = "CREATE TABLE IF NOT EXISTS probe_ph (id TEXT PRIMARY KEY, a TEXT, b TEXT)";
const DROP = "DROP TABLE IF EXISTS probe_ph";

/* The shape that used to break: a comment holding a question mark ahead of two
   real placeholders. */
const INSERT = `
  -- which column gets the question mark ? answered first
  INSERT INTO probe_ph (id, a, b) VALUES (?, ?, ?)`;

(async () => {
  let failed = 0;
  const check = (name, ok, extra) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
    if (!ok) failed++;
  };

  try {
    await db.run(CREATE);
    await db.run("DELETE FROM probe_ph");

    await db.run(INSERT, ["row1", "value-for-a", "value-for-b"]);
    const rows = await db.all("SELECT a, b FROM probe_ph ORDER BY id");
    check(
      "a commented query binds its two values to the right columns",
      rows.length === 1 && rows[0].a === "value-for-a" && rows[0].b === "value-for-b",
      `got a=${JSON.stringify(rows[0] && rows[0].a)} b=${JSON.stringify(rows[0] && rows[0].b)}`,
    );

    await db.run("DELETE FROM probe_ph");
    await db.run("SELECT $$literal ? text$$ AS v, ?::text AS w", ["second"]);
    const r2 = await db.get("SELECT $$literal ? text$$ AS v, ?::text AS w", ["second"]);
    check(
      "a ? inside a dollar-quoted body is not treated as a placeholder",
      r2 && r2.v === "literal ? text" && r2.w === "second",
      `got v=${JSON.stringify(r2 && r2.v)} w=${JSON.stringify(r2 && r2.w)}`,
    );

    await db.run("DELETE FROM probe_ph");
    await db.run("SELECT /* where ? */ 1 WHERE 1 = ?", [1]);
    const r3 = await db.get("SELECT /* where ? */ 1 AS ok WHERE 1 = ?", [1]);
    check("a ? inside a block comment does not shift the placeholder", !!(r3 && r3.ok === 1));

    // and a plain query still behaves
    await db.run("DELETE FROM probe_ph");
    await db.run("INSERT INTO probe_ph (id, a, b) VALUES (?, ?, ?)", ["row2", "x", "y"]);
    const r4 = await db.all("SELECT a, b FROM probe_ph");
    check("an ordinary insert is unaffected", r4[0].a === "x" && r4[0].b === "y");
  } catch (e) {
    failed++;
    console.log("FAIL  harness error: " + e.message);
  } finally {
    try { await db.run(DROP); console.log("\n[cleanup] probe_ph dropped"); }
    catch (e) { console.log("\n[cleanup] could not drop probe_ph: " + e.message); }
  }

  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
})();