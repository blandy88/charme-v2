// One-time migration: copy all data from local SQLite (database/parfumerie.db)
// into the PostgreSQL database referenced by DATABASE_URL.
// Preserves original ids and resets sequences so new rows don't collide.
const { DatabaseSync } = require("node:sqlite");
const { Client } = require("pg");
require("dotenv").config();

const IMPORT_ORDER = [
  "users",
  "products",
  "news",
  "user_settings",
  "user_favorites",
  "user_sessions",
  "reviews",
  "review_likes",
  "review_replies",
  "reply_likes",
  "loyalty_cards",
  "loyalty_transactions",
];

async function main() {
  const sqlite = new DatabaseSync("database/parfumerie.db", { readOnly: true });

  const pg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  /* ------------------------------------------------------------------ *
   * HARD STOP.
   *
   * Everything below TRUNCATEs the target database before importing. Run
   * against the wrong DATABASE_URL it destroys the audit trail with no way
   * back - which is exactly how the August 2026 loyalty history was lost.
   *
   * So it refuses to run unless the operator names the flag, and it shows
   * what is about to be destroyed first. A backup is not optional.
   * ------------------------------------------------------------------ */
  if (!process.argv.includes("--i-understand-this-wipes-the-database")) {
    let host = "(could not parse DATABASE_URL)";
    try {
      host = new URL(process.env.DATABASE_URL).host;
    } catch {
      /* leave the placeholder */
    }
    let current = [];
    try {
      const r = await pg.query(`
        SELECT 'loyalty_cards' AS t, COUNT(*)::int AS n FROM loyalty_cards
        UNION ALL SELECT 'loyalty_transactions', COUNT(*)::int FROM loyalty_transactions
        UNION ALL SELECT 'users', COUNT(*)::int FROM users
        UNION ALL SELECT 'customer_purchases', COUNT(*)::int FROM customer_purchases`);
      current = r.rows;
    } catch {
      /* the tables may not exist yet; the warning still stands */
    }
    console.error("");
    console.error("REFUSING TO RUN — this script destroys data.");
    console.error("");
    console.error("  target database : " + host);
    console.error("  it will TRUNCATE: loyalty_transactions, loyalty_cards, users,");
    console.error("                     customer_purchases, news, products, reviews, …");
    if (current.length) {
      console.error("");
      console.error("  rows that would be destroyed right now:");
      for (const row of current) console.error("    " + String(row.t).padEnd(22) + row.n);
    }
    console.error("");
    console.error("  The August 2026 loyalty ledger was lost exactly this way.");
    console.error("  Take a backup first, then re-run with:");
    console.error("");
    console.error("    node scripts/migrate-local-to-pg.cjs --i-understand-this-wipes-the-database");
    console.error("");
    await pg.end();
    process.exit(1);
  }

  console.log("Truncating existing Postgres tables...");
  await pg.query("TRUNCATE TABLE reply_likes, review_replies, review_likes, reviews, user_sessions, user_favorites, user_settings, loyalty_transactions, loyalty_cards, news, products, users CASCADE");

  for (const table of IMPORT_ORDER) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();

    // Postgres columns available on this table
    const pgColsRes = await pg.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table],
    );
    const pgCols = pgColsRes.rows.map((r) => r.column_name);

    const usedCols = pgCols.filter((c) => rows.length === 0 || Object.prototype.hasOwnProperty.call(rows[0], c));

    if (rows.length === 0 || usedCols.length === 0) {
      console.log(`${table.padEnd(22)} 0 rows (skipped)`);
      continue;
    }

    const colsSql = usedCols.map((c) => `"${c}"`).join(", ");
    const placeholders = usedCols.map((_, i) => `$${i + 1}`).join(", ");
    const insertSql = `INSERT INTO "${table}" (${colsSql}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = usedCols.map((c) => {
        const v = row[c];
        return v === undefined ? null : v;
      });
      await pg.query(insertSql, values);
    }

    // Reset the id sequence so future inserts don't collide with imported ids
    if (usedCols.includes("id")) {
      const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      if (maxId > 0) {
        await pg.query(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), $1, true)`,
          [maxId],
        );
      }
    }

    console.log(`${table.padEnd(22)} ${rows.length} rows`);
  }

  await pg.end();
  console.log("\nMigration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
