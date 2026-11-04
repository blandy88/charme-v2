#!/usr/bin/env node
/*
 * Link legacy loyalty ledger rows to the purchase that earned them.
 *
 * Before loyalty_transactions.purchase_id existed, POST /purchases wrote an
 * "Achat: <perfume>" earn row with no way to tell which purchase produced it.
 * DELETE /purchases/:id reverses a point by looking up that link, so those
 * older purchases could be deleted while keeping their point forever.
 *
 * This script is ADDITIVE and IDEMPOTENT:
 *   - adds purchase_id + its index if they are missing (the server's own boot
 *     migration does the same thing, so running both is harmless)
 *   - never changes loyalty_cards.points
 *   - never inserts or deletes ledger rows
 *   - only fills a NULL purchase_id, and only when the match is unambiguous
 *
 * Matching rule: same card, description exactly "Achat: <perfume_name>",
 * points_change = 1, and created_at within WINDOW_MS of the purchase. Rows are
 * assigned greedily by nearest timestamp, one-to-one. A purchase with two
 * candidates inside the window is skipped rather than guessed at.
 *
 * Usage:
 *   node scripts/backfill-loyalty-purchase-links.cjs           # dry run
 *   node scripts/backfill-loyalty-purchase-links.cjs --apply   # write
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const APPLY = process.argv.includes("--apply");
const WINDOW_MS = 5000;
const REPO = path.resolve(__dirname, "..");
const envText = fs.readFileSync(path.join(REPO, ".env"), "utf-8");
const match = envText.match(/DATABASE_URL=([^\r\n]+)/);
if (!match) throw new Error("DATABASE_URL not found in .env");
const url = match[1].trim();

(async () => {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = async (sql, params = []) => (await client.query(sql, params)).rows;

  let hasColumn = (
    await q(`SELECT 1 AS ok FROM information_schema.columns
             WHERE table_name = 'loyalty_transactions' AND column_name = 'purchase_id'`)
  ).length > 0;

  if (APPLY && !hasColumn) {
    await client.query("ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS purchase_id INTEGER");
    console.log("+ added loyalty_transactions.purchase_id");
    hasColumn = true;
  }
  if (APPLY) {
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_purchase_id ON loyalty_transactions(purchase_id)",
    );
  }
  console.log(`purchase_id column present: ${hasColumn}`);
  console.log(`mode: ${APPLY ? "APPLY (writes enabled)" : "DRY RUN (no writes)"}`);

  const purchases = await q(
    `SELECT id, card_id, perfume_name, created_at FROM customer_purchases ORDER BY id`,
  );
  const ledger = await q(
    `SELECT id, card_id, points_change, description, created_at
       ${hasColumn ? ", purchase_id" : ""}
     FROM loyalty_transactions
     WHERE type = 'earn' AND (description LIKE 'Achat:%' ${hasColumn ? "OR purchase_id IS NOT NULL" : ""})
     ORDER BY id`,
  );

  const claimed = new Set();
  const alreadyLinked = new Set();
  for (const row of ledger) {
    if (row.purchase_id != null) {
      alreadyLinked.add(Number(row.purchase_id));
      claimed.add(row.id);
    }
  }

  const pairs = [];
  const ambiguous = [];
  const unmatched = [];
  for (const p of purchases) {
    if (alreadyLinked.has(p.id)) continue;
    const wanted = `Achat: ${p.perfume_name}`;
    const pTime = new Date(p.created_at).getTime();
    const candidates = ledger
      .filter(
        (t) =>
          !claimed.has(t.id) &&
          Number(t.card_id) === Number(p.card_id) &&
          Number(t.points_change) === 1 &&
          t.description === wanted &&
          Math.abs(new Date(t.created_at).getTime() - pTime) <= WINDOW_MS,
      )
      .map((t) => ({ t, delta: Math.abs(new Date(t.created_at).getTime() - pTime) }))
      .sort((a, b) => a.delta - b.delta);

    if (candidates.length === 0) {
      unmatched.push(p.id);
      continue;
    }
    if (candidates.length > 1 && candidates[0].delta === candidates[1].delta) {
      ambiguous.push(p.id);
      continue;
    }
    const chosen = candidates[0].t;
    claimed.add(chosen.id);
    pairs.push({ purchaseId: p.id, ledgerId: chosen.id, deltaMs: candidates[0].delta });
  }

  console.log(`\npurchases                     : ${purchases.length}`);
  console.log(`already linked                : ${alreadyLinked.size}`);
  console.log(`new unambiguous matches       : ${pairs.length}`);
  console.log(`unmatched (no point recorded) : ${unmatched.length}${unmatched.length ? " -> " + unmatched.join(", ") : ""}`);
  console.log(`ambiguous (skipped)           : ${ambiguous.length}${ambiguous.length ? " -> " + ambiguous.join(", ") : ""}`);
  if (pairs.length) {
    console.log(`largest timestamp delta       : ${Math.max(...pairs.map((x) => x.deltaMs))} ms`);
    console.log("sample:", JSON.stringify(pairs.slice(0, 3)));
  }

  if (APPLY && hasColumn && pairs.length) {
    await client.query("BEGIN");
    try {
      for (const pair of pairs) {
        await client.query(
          "UPDATE loyalty_transactions SET purchase_id = $1 WHERE id = $2 AND purchase_id IS NULL",
          [pair.purchaseId, pair.ledgerId],
        );
      }
      await client.query("COMMIT");
      console.log(`\n✅ linked ${pairs.length} legacy ledger row(s)`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } else if (!APPLY) {
    console.log("\n(dry run — re-run with --apply to write)");
  }

  // The backfill must never move a balance.
  if (hasColumn) {
    const stillMissing = await q(
      `SELECT COUNT(*) AS n FROM customer_purchases p
       WHERE NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.purchase_id = p.id)`,
    );
    const bad = await q(
      `SELECT COUNT(*) AS n FROM (
         SELECT c.id, COALESCE(c.points,0) AS balance,
                COALESCE((SELECT SUM(points_change) FROM loyalty_transactions t WHERE t.card_id=c.id),0) AS ledger_sum
         FROM loyalty_cards c) x WHERE balance <> ledger_sum`,
    );
    console.log(`\npurchases still without a link: ${stillMissing[0].n}`);
    console.log(`balance/ledger mismatches     : ${bad[0].n}`);
  }

  await client.end();
})().catch((e) => {
  console.error("BACKFILL ERROR:", e);
  process.exit(1);
});
