/*
 * Standing integrity check for the loyalty ledger.
 *
 * The 2026 incident ran for three weeks undetected: 30 points sat on CH0001 that
 * no ledger row explained, and nothing in the application ever looked. This is
 * the thing that looks.
 *
 *   node scripts/check-loyalty-integrity.cjs           # human-readable
 *   node scripts/check-loyalty-integrity.cjs --json    # machine-readable
 *
 * Exit 0 = every card's balance is fully explained by its ledger.
 * Exit 1 = something moved without a record. Investigate before touching anything.
 *
 * Safe to run at any time: read-only, no writes, no migrations.
 */
"use strict";

const path = require("path");
const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

const db = require(path.join(REPO, "db.js"));

const JSON_OUT = process.argv.includes("--json");

(async () => {
  const totals = (
    await db.all(`
      SELECT (SELECT COUNT(*) FROM loyalty_cards)::int AS cards,
             (SELECT COUNT(*) FROM loyalty_transactions)::int AS rows,
             (SELECT COALESCE(SUM(points),0) FROM loyalty_cards)::int AS points,
             (SELECT COALESCE(SUM(points_change),0) FROM loyalty_transactions)::int AS ledger
    `)
  )[0];

  /* The whole invariant, evaluated inside the database so no application code can
   * influence the answer. */
  const violations = await db.all(`
    SELECT c.id, c.card_number, c.holder_name, c.points,
           COALESCE(SUM(t.points_change), 0)::int AS ledger,
           (c.points - COALESCE(SUM(t.points_change), 0))::int AS gap
      FROM loyalty_cards c
      LEFT JOIN loyalty_transactions t ON t.card_id = c.id
     GROUP BY c.id, c.card_number, c.holder_name, c.points
    HAVING c.points <> COALESCE(SUM(t.points_change), 0)
     ORDER BY ABS(c.points - COALESCE(SUM(t.points_change), 0)) DESC
  `);

  const orphans = await db.all(`
    SELECT t.id FROM loyalty_transactions t
     LEFT JOIN loyalty_cards c ON c.id = t.card_id
     WHERE c.id IS NULL
  `);

  const negatives = await db.all(`SELECT id, card_number, points FROM loyalty_cards WHERE points < 0`);

  const duplicateAwards = await db.all(`
    SELECT purchase_id, COUNT(*)::int AS n
      FROM loyalty_transactions
     WHERE purchase_id IS NOT NULL
     GROUP BY purchase_id HAVING COUNT(*) > 1
  `);

  const pass =
    violations.length === 0 &&
    orphans.length === 0 &&
    negatives.length === 0 &&
    duplicateAwards.length === 0 &&
    totals.points === totals.ledger;

  const report = {
    checked_at: new Date().toISOString(),
    cards: totals.cards,
    ledger_rows: totals.rows,
    points_total: totals.points,
    ledger_total: totals.ledger,
    balance_mismatches: violations,
    orphan_ledger_rows: orphans.length,
    negative_balances: negatives,
    purchases_awarded_more_than_once: duplicateAwards,
    pass,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("Loyalty integrity check — " + report.checked_at);
    console.log("  cards            " + totals.cards);
    console.log("  ledger rows      " + totals.rows);
    console.log("  points total     " + totals.points);
    console.log("  ledger total     " + totals.ledger);
    console.log("");
    console.log("  balance != SUM(ledger)          " + violations.length);
    console.log("  orphan ledger rows              " + orphans.length);
    console.log("  negative balances               " + negatives.length);
    console.log("  purchases awarded more than once " + duplicateAwards.length);
    if (violations.length) {
      console.log("\n  MISMATCHES:");
      for (const v of violations.slice(0, 40)) {
        console.log(`    ${v.card_number} (id ${v.id}) ${v.holder_name || ""}: balance ${v.points}, ledger ${v.ledger}, gap ${v.gap}`);
      }
    }
    console.log("\n" + (pass ? "PASS — every balance is fully explained by its ledger" : "FAIL — something moved without a record"));
  }

  await new Promise((r) => db.close(() => r()));
  process.exit(pass ? 0 : 1);
})().catch((e) => {
  console.error("integrity check could not run: " + e.message);
  process.exit(2);
});
