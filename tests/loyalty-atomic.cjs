/*
 * Prove the loyalty write tools are atomic.
 *
 * The failure is injected by handing createTools a wrapper whose transaction
 * scope makes the ledger INSERT fail. If the tool is correctly transactional,
 * the points UPDATE must be rolled back too and the card's balance must be
 * unchanged. If it is not, the phantom movement survives - exactly the bug
 * that used to be possible whenever the ledger insert failed after the
 * balance had already moved.
 *
 * ISOLATION (added 2026-11-06, incident CH0001)
 * ---------------------------------------------
 * This check runs against a throwaway SQLite file in the OS temp directory,
 * the same way loyalty-cards-integration.cjs does. It deliberately does NOT
 * load .env: a developer .env must never redirect a check at a real database.
 *
 * The earlier version loaded .env, connected to the production database and
 * borrowed the first card (id 1 = CH0001 DORA), then "restored" the balance it
 * had captured *after* adding its probe points. Every run therefore left three
 * permanent, unlogged points behind. It ran eleven times between 2026-10-17 and
 * 2026-11-04 and moved DORA from 1 to 31. See docs/loyalty-incident-2026-11-06.md.
 */
// @db-scope: isolated — forces DATABASE_URL="" and a throwaway SQLite file in %TEMP%, seeds its own card

"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);

// Force the SQLite branch for this process. Set BEFORE db.js is required:
// db.js reads process.env.DATABASE_URL at require time.
const DB_PATH = path.join(os.tmpdir(), `charme-loyalty-atomic-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = "";
process.env.SQLITE_PATH = DB_PATH;

const { createTools } = require(path.join(REPO, "services/adminAssistant/tools.js"));
const db = require(path.join(REPO, "db.js"));

let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, e) => { failures++; console.log("  FAIL  " + l + (e ? " -> " + e : "")); };

const pointsOf = async (cardId) => {
  const r = await db.all("SELECT points FROM loyalty_cards WHERE id = ?", [cardId]);
  return r.length ? Number(r[0].points) : null;
};
const ledgerCount = async (cardId) => {
  const r = await db.all("SELECT COUNT(*) AS n FROM loyalty_transactions WHERE card_id = ?", [cardId]);
  return Number(r[0].n);
};
const maxLedgerId = async (cardId) => {
  const r = await db.all("SELECT COALESCE(MAX(id), 0) AS n FROM loyalty_transactions WHERE card_id = ?", [cardId]);
  return Number(r[0].n);
};

/* A db whose transaction scope fails on the ledger insert. */
const sabotageLedger = {
  ...db,
  transaction(fn) {
    return db.transaction(async (t) => {
      const boobyTrapped = {
        ...t,
        raw(sql, params) {
          if (/INSERT INTO loyalty_transactions/i.test(String(sql))) {
            throw new Error("injected ledger failure");
          }
          return t.raw(sql, params);
        },
      };
      return fn(boobyTrapped);
    });
  },
};

const seedSchema = async () => {
  // resolveCard() joins users, so the probe needs that table to exist.
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      password_hash TEXT,
      is_admin INTEGER DEFAULT 0
    )`);
  await db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      holder_name TEXT,
      holder_email TEXT,
      holder_phone TEXT,
      card_number TEXT UNIQUE,
      points INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  await db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      user_id INTEGER,
      points_change INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
      description TEXT,
      purchase_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  await db.run(
    "INSERT INTO loyalty_cards (user_id, card_number, points, holder_name, holder_phone) VALUES (NULL, ?, ?, ?, '')",
    ["CHTEST0001", 0, "ATOMIC PROBE"],
  );
};

const finish = async (code) => {
  // Close the handle first: on Windows SQLite keeps the file locked until then.
  try {
    await new Promise((res) => db.close(() => res()));
  } catch (_) { /* already closed */ }
  for (const suffix of ["", "-shm", "-wal"]) {
    try { fs.unlinkSync(DB_PATH + suffix); } catch (_) { /* temp dir anyway */ }
  }
  process.exit(code);
};

(async () => {
  // Refuse to run anywhere but a throwaway SQLite file. This is the guard that
  // would have prevented the 2026-11 incident.
  if (db.dialect && db.dialect !== "sqlite") {
    console.log(`  FAIL  refusing to run against a ${db.dialect} database`);
    return finish(1);
  }

  await seedSchema();

  const tools = createTools({ db, adminId: 1, lang: "en", catalogue: async () => [] });
  const sabotaged = createTools({ db: sabotageLedger, adminId: 1, lang: "en", catalogue: async () => [] });

  const card = (await db.all("SELECT id, points FROM loyalty_cards ORDER BY id LIMIT 1"))[0];
  if (!card) { console.log("no loyalty card to test against"); return finish(0); }
  console.log(`\nusing throwaway card id=${card.id}, starting balance=${card.points}`);

  const addPoints = tools.byName.get("add_loyalty_points");
  const before = await pointsOf(card.id);
  const ledgerBefore = await ledgerCount(card.id);
  const maxIdBefore = await maxLedgerId(card.id);

  console.log("\n[control: the tool works normally]");
  const good = await addPoints.handler({ card_id: card.id, points: 3, description: "probe control" });
  const afterGood = await pointsOf(card.id);
  good.ok === true && afterGood === before + 3
    ? ok(`balance moved ${before} -> ${afterGood} and the ledger grew`)
    : bad("normal write did not apply", JSON.stringify(good).slice(0, 120));
  (await ledgerCount(card.id)) === ledgerBefore + 1
    ? ok("exactly one ledger row was added")
    : bad("ledger row count wrong", await ledgerCount(card.id));

  console.log("\n[injected failure: the ledger insert throws]");
  const baseline = await pointsOf(card.id);
  const ledgerBaseline = await ledgerCount(card.id);
  const booby = sabotaged.byName.get("add_loyalty_points");
  let threw = false;
  try {
    await booby.handler({ card_id: card.id, points: 7, description: "probe sabotage" });
  } catch (e) {
    threw = true;
    console.log(`         (handler threw: ${e.message})`);
  }
  threw ? ok("the failure surfaced instead of being swallowed") : bad("failure was swallowed");

  const after = await pointsOf(card.id);
  after === baseline
    ? ok(`balance unchanged (${after}) - the UPDATE was rolled back`)
    : bad("PHANTOM MOVEMENT: balance moved " + baseline + " -> " + after + " with no ledger row");

  (await ledgerCount(card.id)) === ledgerBaseline
    ? ok("no ledger row was left behind")
    : bad("a ledger row survived a rolled-back write");

  console.log("\n[cleanup]");
  // Restore to the balance captured BEFORE the probe, not after it, and delete
  // exactly the rows this run created rather than matching on a description.
  await db.run("UPDATE loyalty_cards SET points = ? WHERE id = ?", [before, card.id]);
  await db.run("DELETE FROM loyalty_transactions WHERE card_id = ? AND id > ?", [card.id, maxIdBefore]);
  const restored = await pointsOf(card.id);
  const leftover = await ledgerCount(card.id);
  restored === before
    ? ok(`card restored to its pre-probe balance (${restored})`)
    : bad(`cleanup left the balance at ${restored}, expected ${before}`);
  leftover === ledgerBefore
    ? ok(`ledger restored to ${leftover} row(s)`)
    : bad(`cleanup left ${leftover} ledger row(s), expected ${ledgerBefore}`);
  console.log(`         (card restored to ${restored})`);

  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
  return finish(failures ? 1 : 0);
})();
