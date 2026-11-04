#!/usr/bin/env node
/*
 * Loyalty reconciliation.
 *
 * The loyalty_cards.points balance and the loyalty_transactions ledger had been
 * updated in separate, non-atomic steps (now fixed in server.js), and a bulk
 * import seeded points without any ledger rows. Result: many cards had points
 * with no audit trail and some had balance != SUM(ledger).
 *
 * This script makes the invariant  points == SUM(points_change)  hold again.
 * It is APPEND-ONLY and NON-DESTRUCTIVE:
 *   - never modifies loyalty_cards.points
 *   - never deletes ledger rows
 *   - for every card where SUM(ledger) != points it inserts one "adjustment"
 *     row equal to the difference, so the ledger explains the balance.
 *   - re-running is a no-op (the difference becomes 0).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envText = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf-8");
const url = envText.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

(async () => {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = async (s, p = []) => (await client.query(s, p)).rows;

  const cards = await q(`SELECT id, points FROM loyalty_cards`);
  const sums = await q(`
    SELECT card_id, COALESCE(SUM(points_change), 0) AS s
    FROM loyalty_transactions GROUP BY card_id
  `);
  const sumMap = new Map(sums.map((r) => [r.card_id, Number(r.s)]));

  let skipped = 0, backfilled = 0, corrected = 0, inserted = 0;

  for (const c of cards) {
    const balance = Number(c.points) || 0;
    const ledger = sumMap.has(c.id) ? sumMap.get(c.id) : 0;
    const diff = balance - ledger;
    if (diff === 0) { skipped++; continue; }

    const desc =
      diff > 0
        ? `Réconciliation : solde initial +${diff} pt(s)`
        : `Réconciliation : correction ${diff} pt(s)`;

    // The table only permits type 'earn' | 'redeem', and the existing admin
    // `update` endpoint already logs manual adjustments (incl. negative) as
    // 'earn', so we follow that convention instead of migrating the constraint.
    await client.query(
      `INSERT INTO loyalty_transactions (card_id, user_id, points_change, type, description)
       VALUES ($1, (SELECT user_id FROM loyalty_cards WHERE id = $1), $2, 'earn', $3)`,
      [c.id, diff, desc],
    );
    inserted++;
    if (ledger === 0) backfilled++;
    else corrected++;
  }

  console.log("Reconciliation complete:");
  console.log(`  cards scanned              : ${cards.length}`);
  console.log(`  already consistent (skip)  : ${skipped}`);
  console.log(`  ledger rows inserted       : ${inserted}`);
  console.log(`    - backfill (no ledger)   : ${backfilled}`);
  console.log(`    - drift correction       : ${corrected}`);

  const bad = await q(`
    SELECT COUNT(*) AS n FROM (
      SELECT c.id FROM loyalty_cards c
      LEFT JOIN (SELECT card_id, SUM(points_change) s FROM loyalty_transactions GROUP BY card_id) t
        ON t.card_id = c.id
      WHERE c.points <> COALESCE(t.s, 0)
    ) x
  `);
  console.log(`  cards still mismatched     : ${bad[0].n}`);

  await client.end();
})().catch((e) => {
  console.error("RECONCILE ERROR:", e.message);
  process.exit(1);
});
