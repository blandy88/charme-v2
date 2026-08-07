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
