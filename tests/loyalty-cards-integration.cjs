#!/usr/bin/env node
/*
 * HTTP-level integration test for the loyalty cards / purchases subsystem.
 *
 * Spawns the REAL server.js on a private port against a throwaway SQLite file,
 * with a known JWT secret. Nothing here touches the live Neon database or the
 * developer's :3000 instance.
 *
 * Run:  node tests/loyalty-cards-integration.cjs
 */
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const PORT = 32000 + (process.pid % 2000);
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = "charme-integration-test-secret-0123456789abcdef";
// Unique per run: db.js opens the file the moment it is required, so the file
// cannot be deleted from inside boot() on Windows (EBUSY).
const DB_PATH = path.join(os.tmpdir(), `charme-loyalty-it-${process.pid}-${Date.now()}.db`);

// Force the SQLite branch for BOTH this process and the spawned server.
// dotenv does not overwrite variables that already exist in process.env.
process.env.DATABASE_URL = "";
process.env.SQLITE_PATH = DB_PATH;
process.env.JWT_SECRET = SECRET;

const db = require(path.join(REPO, "db.js"));
const jwt = require(path.join(REPO, "node_modules", "jsonwebtoken"));

let failures = 0;
const ok = (label, extra) => console.log(`  PASS  ${label}${extra ? "  " + extra : ""}`);
const bad = (label, extra) => {
  failures += 1;
  console.log(`  FAIL  ${label}${extra ? "  -> " + extra : ""}`);
};
const check = (label, cond, extra) => (cond ? ok(label, extra) : bad(label, extra));

const qAll = (sql, p = []) => db.all(sql, p);
const qGet = (sql, p = []) => db.get(sql, p);
const qRun = (sql, p = []) => db.run(sql, p);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, url, body, token) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function balance(cardId) {
  const row = await qGet("SELECT points FROM loyalty_cards WHERE id = ?", [cardId]);
  return row ? Number(row.points) : null;
}
async function ledgerSum(cardId) {
  const row = await qGet(
    "SELECT COALESCE(SUM(points_change), 0) AS s FROM loyalty_transactions WHERE card_id = ?",
    [cardId],
  );
  return Number(row.s);
}
async function ledgerRows(cardId) {
  return qAll(
    "SELECT id, points_change, type, description, purchase_id FROM loyalty_transactions WHERE card_id = ? ORDER BY id",
    [cardId],
  );
}
async function invariant(cardId, label) {
  const b = await balance(cardId);
  const s = await ledgerSum(cardId);
  check(label, b === s, `balance=${b} ledger=${s}`);
}
async function cardCount() {
  const r = await qGet("SELECT COUNT(*) AS n FROM loyalty_cards");
  return Number(r.n);
}

let child = null;
let childLog = "";

async function boot() {
  // server.js does not create `users` (scripts/init-database.js does), so make
  // the minimum table the auth middleware needs before the server boots.
  await qAll("SELECT 1 AS ok");
  await qRun(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await qRun(
    "INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (1, 'IT', 'Admin', 'it-admin@example.test', 'x', 1)",
  );
  await qRun(
    "INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (2, 'IT', 'Customer', 'it-customer@example.test', 'x', 0)",
  );

  child = spawn(process.execPath, ["server.js"], {
    cwd: REPO,
    env: {
      ...process.env,
      DATABASE_URL: "",
      SQLITE_PATH: DB_PATH,
      JWT_SECRET: SECRET,
      PORT: String(PORT),
      NODE_ENV: "test",
      VERCEL: "",
      RENDER: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => (childLog += d.toString()));
  child.stderr.on("data", (d) => (childLog += d.toString()));

  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) throw new Error(`server exited early:\n${childLog.slice(-2000)}`);
    try {
      await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) });
      return;
    } catch {
      await wait(150);
    }
  }
  throw new Error(`server never became ready:\n${childLog.slice(-2000)}`);
}

const adminToken = () => jwt.sign({ userId: 1, email: "it-admin@example.test" }, SECRET, { expiresIn: "1h" });
const customerToken = () => jwt.sign({ userId: 2, email: "it-customer@example.test" }, SECRET, { expiresIn: "1h" });

(async () => {
  await boot();
  const A = adminToken();
  const C = customerToken();
  const post = (url, body) => req("POST", url, body, A);
  const put = (url, body) => req("PUT", url, body, A);
  const del = (url) => req("DELETE", url, undefined, A);
  const get = (url, tok = A) => req("GET", url, undefined, tok);

  console.log(`\nserver: ${BASE}\nscratch db: ${DB_PATH}\n`);

  /* ---------------------------------------------------------------- create */
  console.log("[card creation + duplicate guard]");
  const c1 = await post("/api/admin/loyalty/create", { name: "IT Alpha", phone: "10000001" });
  check("walk-in card created", c1.status === 200, `status=${c1.status} ${JSON.stringify(c1.data)}`);
  const card1 = c1.data && c1.data.card && c1.data.card.cardId;
  const num1 = c1.data && c1.data.card && c1.data.card.cardNumber;
  check("card number has CH format", /^CH\d{4,}$/.test(String(num1)), String(num1));
  await invariant(card1, "new card balance == ledger");

  const dup = await post("/api/admin/loyalty/create", { name: "IT Alpha Again", phone: "10000001" });
  check(
    "duplicate walk-in refused with 409",
    dup.status === 409 && dup.data.existingCardId === card1,
    `status=${dup.status} ${JSON.stringify(dup.data)}`,
  );
  check("duplicate attempt created no card", (await cardCount()) === 1, `count=${await cardCount()}`);

  const forced = await post("/api/admin/loyalty/create", {
    name: "IT Alpha Again",
    phone: "10000001",
    allowDuplicate: true,
  });
  const card2 = forced.data && forced.data.card && forced.data.card.cardId;
  const num2 = forced.data && forced.data.card && forced.data.card.cardNumber;
  check(
    "explicit allowDuplicate opens a distinct card",
    forced.status === 200 && card2 !== card1 && num2 !== num1,
    `status=${forced.status} ${num1} -> ${num2}`,
  );

  /* ------------------------------------------------- validation before write */
  console.log("\n[no orphan card on validation failure]");
  const beforeOrphan = await cardCount();
  const invalid = await post("/api/admin/loyalty/purchases", {
    holderName: "IT Orphan",
    holderPhone: "19999999",
    perfumeName: "IT Juice",
    fragranceFamily: "NotARealFamily",
  });
  check("invalid family rejected with 400", invalid.status === 400, `status=${invalid.status}`);
  check("no orphan card left behind", (await cardCount()) === beforeOrphan, `count=${await cardCount()}`);

  /* ------------------------------------------------------ purchase + reversal */
  console.log("\n[purchase awards a linked point; deletion reverses it]");
  const p1 = await post("/api/admin/loyalty/purchases", {
    cardId: card1,
    perfumeName: "IT Juice",
    purchaseDate: "2026-11-04",
    awardPoints: true,
  });
  check("purchase recorded", p1.status === 200, `status=${p1.status} ${JSON.stringify(p1.data)}`);
  const purchase1 = p1.data && p1.data.purchaseId;
  check("balance became 1", (await balance(card1)) === 1);
  const rows1 = await ledgerRows(card1);
  check("exactly one ledger row", rows1.length === 1 && Number(rows1[0].points_change) === 1, JSON.stringify(rows1));
  check(
    "ledger row links to the purchase (migration + readiness gate)",
    Number(rows1[0].purchase_id) === Number(purchase1),
    `purchase_id=${rows1[0].purchase_id} expected=${purchase1}`,
  );
  await invariant(card1, "invariant after purchase");

  const d1 = await del(`/api/admin/loyalty/purchases/${purchase1}`);
  check("delete reverses the point", d1.status === 200 && d1.data.pointsReversed === 1, JSON.stringify(d1.data));
  check("balance back to 0", (await balance(card1)) === 0);
  check("ledger row removed", (await ledgerRows(card1)).length === 0);
  check("purchase row removed", (await qGet("SELECT id FROM customer_purchases WHERE id = ?", [purchase1])) == null);
  await invariant(card1, "invariant after deletion");

  const p2 = await post("/api/admin/loyalty/purchases", {
    cardId: card1,
    perfumeName: "IT No Points",
    purchaseDate: "2026-11-04",
    awardPoints: false,
  });
  const purchase2 = p2.data && p2.data.purchaseId;
  check("awardPoints:false adds no point", (await balance(card1)) === 0 && (await ledgerRows(card1)).length === 0);
  const d2 = await del(`/api/admin/loyalty/purchases/${purchase2}`);
  check(
    "deleting a non-awarding purchase invents no debit",
    d2.status === 200 && d2.data.pointsReversed === 0 && (await balance(card1)) === 0,
    JSON.stringify(d2.data),
  );

  const missing = await del("/api/admin/loyalty/purchases/999999");
  check("deleting an unknown purchase is 404 not 500", missing.status === 404, `status=${missing.status}`);

  /* ----------------------------------------------------------- concurrency */
  console.log("\n[concurrent redeem cannot spend the same points twice]");
  const add = await post("/api/admin/loyalty/add-points", { cardId: card1, points: 5 });
  check("add-points 5 succeeded", add.status === 200 && (await balance(card1)) === 5, `status=${add.status}`);
  const [r1, r2] = await Promise.all([
    post("/api/admin/loyalty/redeem", { cardId: card1 }),
    post("/api/admin/loyalty/redeem", { cardId: card1 }),
  ]);
  const successes = [r1, r2].filter((r) => r.status === 200).length;
  check("exactly one redeem succeeded", successes === 1, `statuses=${r1.status}/${r2.status}`);
  check("balance is 0, not negative", (await balance(card1)) === 0, `balance=${await balance(card1)}`);
  const redeems = (await ledgerRows(card1)).filter((r) => r.type === "redeem");
  check("exactly one redeem ledger row", redeems.length === 1, `count=${redeems.length}`);
  await invariant(card1, "invariant after concurrent redeem");

  /* --------------------------------------------------------------- updates */
  console.log("\n[update endpoint edge cases]");
  const upd1 = await put("/api/admin/loyalty/update", { cardId: card1, cardNumber: "", name: "IT Alpha Renamed" });
  const afterUpd = await qGet("SELECT card_number, holder_name FROM loyalty_cards WHERE id = ?", [card1]);
  check(
    "empty cardNumber does not erase the number",
    upd1.status === 200 && afterUpd.card_number === num1,
    `status=${upd1.status} number=${afterUpd.card_number}`,
  );
  const collision = await put("/api/admin/loyalty/update", { cardId: card1, cardNumber: num2 });
  check(
    "duplicate card number is 400 not 500",
    collision.status === 400,
    `status=${collision.status} ${JSON.stringify(collision.data)}`,
  );
  const tooLong = await put("/api/admin/loyalty/update", { cardId: card1, cardNumber: "X".repeat(500) });
  check("oversized card number rejected", tooLong.status === 400, `status=${tooLong.status}`);
  await invariant(card1, "invariant after updates");

  /* Relative points update: the balance moves to the requested *target*, and
     the ledger records only the delta from the current value. The write is
     relative (points = points + delta), never an absolute "points = target",
     so a concurrent edit cannot clobber the balance while the ledger records a
     stale delta. */
  const beforePts = (await qGet("SELECT points FROM loyalty_cards WHERE id = ?", [card1])).points;
  const setTo = beforePts + 7;
  const updPts = await put("/api/admin/loyalty/update", { cardId: card1, points: setTo });
  const afterPts = (await qGet("SELECT points FROM loyalty_cards WHERE id = ?", [card1])).points;
  check(
    "update lands on the requested target",
    updPts.status === 200 && afterPts === setTo,
    `status=${updPts.status} before=${beforePts} after=${afterPts} target=${setTo}`,
  );
  await invariant(card1, "invariant after absolute-point update");
  /* Reducing points is a signed 'earn' delta, not a phantom write. */
  const reduceTo = Math.max(0, afterPts - 3);
  const updDown = await put("/api/admin/loyalty/update", { cardId: card1, points: reduceTo });
  const afterDown = (await qGet("SELECT points FROM loyalty_cards WHERE id = ?", [card1])).points;
  check(
    "update can reduce points without breaking the ledger",
    updDown.status === 200 && afterDown === reduceTo,
    `status=${updDown.status} after=${afterDown} target=${reduceTo}`,
  );
  await invariant(card1, "invariant after point reduction");
  /* Two updates fired back-to-back: even if they interleave on SQLite (no row
     lock), the balance and the ledger must move together. */
  await Promise.all([
    put("/api/admin/loyalty/update", { cardId: card1, points: 50 }),
    put("/api/admin/loyalty/update", { cardId: card1, points: 60 }),
  ]);
  await invariant(card1, "invariant after concurrent absolute-point updates");
  const finalPts = (await qGet("SELECT points FROM loyalty_cards WHERE id = ?", [card1])).points;
  check("balance is a sane integer after racing updates", Number.isInteger(finalPts) && finalPts >= 0, `final=${finalPts}`);

  /* ------------------------------------------------ /api/loyalty/me gating */
  console.log("\n[/api/loyalty/me gate]");
  const linked = await post("/api/admin/loyalty/create", { userId: 2 });
  check("account-linked card created", linked.status === 200, `status=${linked.status} ${JSON.stringify(linked.data)}`);
  const card3 = linked.data && linked.data.card && linked.data.card.cardId;
  const gated0 = await get("/api/loyalty/me", C);
  check(
    "brand-new stock card is hidden",
    gated0.status === 200 && gated0.data.hasCard === false,
    JSON.stringify(gated0.data),
  );
  await post("/api/admin/loyalty/add-points", { cardId: card3, points: 2 });
  const gated1 = await get("/api/loyalty/me", C);
  check(
    "points without purchases are visible",
    gated1.status === 200 && gated1.data.hasCard === true && gated1.data.card.points === 2,
    `status=${gated1.status} hasCard=${gated1.data && gated1.data.hasCard}`,
  );
  await invariant(card3, "invariant on account-linked card");

  /* --------------------------------------------- card number non-recycling */
  console.log("\n[card numbers are never recycled after deletion]");
  const top = await qGet("SELECT id, card_number FROM loyalty_cards ORDER BY id DESC LIMIT 1");
  const delCard = await del(`/api/admin/loyalty/delete?cardId=${top.id}`);
  check("newest card deleted", delCard.status === 200, `status=${delCard.status}`);
  const fresh = await post("/api/admin/loyalty/create", { name: "IT Fresh", phone: "10000009" });
  const freshNum = fresh.data && fresh.data.card && fresh.data.card.cardNumber;
  check(
    "next card does not reuse the deleted CH number",
    fresh.status === 200 && freshNum !== top.card_number,
    `deleted=${top.card_number} new=${freshNum} (${JSON.stringify(fresh.data)})`,
  );

  /* ------------------------------------- INCIDENT 2026-11-06 regressions */
  console.log("\n[admin list must never hide cards again]");
  /* The 2026-11-04 default of 500 hid 142 real cards (79 with points).
     Seed past that boundary and prove a caller with no ?limit sees all of
     them, plus authoritative totals for the UI stats. */
  const seedCount = await cardCount();
  for (let i = 0; i < 520; i += 1) {
    await qRun(
      "INSERT INTO loyalty_cards (user_id, card_number, points, holder_name, holder_phone, created_at) VALUES (NULL, ?, 0, ?, '', datetime('now'))",
      [`IT9${String(i).padStart(4, "0")}`, `Bulk ${i}`],
    );
  }
  const seededTotal = await cardCount();
  check("seeded past the old 500-card cap", seededTotal > 500, `count=${seededTotal}`);

  const fullList = await get("/api/admin/loyalty");
  check(
    "default list returns every card",
    fullList.status === 200 && fullList.data.cards.length === seededTotal,
    `returned=${fullList.data && fullList.data.cards && fullList.data.cards.length} expected=${seededTotal}`,
  );
  check(
    "response carries authoritative totalCards",
    fullList.data.totalCards === seededTotal && fullList.data.hasMore === false,
    JSON.stringify({ totalCards: fullList.data.totalCards, hasMore: fullList.data.hasMore }),
  );
  const onePage = await get("/api/admin/loyalty?limit=5&offset=0");
  check(
    "paged response reports hasMore / nextOffset",
    onePage.data.returnedCards === 5 &&
      onePage.data.totalCards === seededTotal &&
      onePage.data.hasMore === true &&
      onePage.data.nextOffset === 5,
    JSON.stringify(onePage.data && {
      returnedCards: onePage.data.returnedCards,
      totalCards: onePage.data.totalCards,
      hasMore: onePage.data.hasMore,
      nextOffset: onePage.data.nextOffset,
    }),
  );

  console.log("\n[double-click must not create a second purchase or point]");
  const idCard = await post("/api/admin/loyalty/create", { name: "IT Idempotent", phone: "10000123" });
  const idId = idCard.data && idCard.data.card && idCard.data.card.cardId;
  const sameBody = { cardId: idId, perfumeName: "IT Repeat", purchasePrice: 10 };
  const firstSave = await post("/api/admin/loyalty/purchases", sameBody);
  const secondSave = await post("/api/admin/loyalty/purchases", sameBody);
  check("first purchase recorded", firstSave.status === 200, `status=${firstSave.status}`);
  check(
    "identical rapid resubmission is idempotent",
    secondSave.status === 200 &&
      secondSave.data.duplicate === true &&
      secondSave.data.purchaseId === firstSave.data.purchaseId,
    JSON.stringify(secondSave.data),
  );
  const idPurchases = await qAll("SELECT id FROM customer_purchases WHERE card_id = ?", [idId]);
  check("only one purchase row exists", idPurchases.length === 1, `rows=${idPurchases.length}`);
  check("balance is 1, not 2", (await balance(idId)) === 1, `balance=${await balance(idId)}`);
  await invariant(idId, "invariant after idempotent resubmission");

  const deliberate = await post("/api/admin/loyalty/purchases", { ...sameBody, allowDuplicate: true });
  check(
    "allowDuplicate still records a genuine repeat",
    deliberate.status === 200 && (await balance(idId)) === 2,
    `status=${deliberate.status} balance=${await balance(idId)}`,
  );

  console.log("\n[admin profile exposes point history]");
  const profile = await get(`/api/admin/loyalty/profiles/${idId}`);
  check(
    "profile returns ledger movements",
    profile.status === 200 &&
      Array.isArray(profile.data.transactions) &&
      profile.data.transactions.length === 2,
    `rows=${profile.data && profile.data.transactions && profile.data.transactions.length}`,
  );

  /* ------------------------------------------------------------ global check */
  console.log("\n[global invariant]");
  const violations = await qAll(`
    SELECT c.id, COALESCE(c.points,0) AS balance,
           COALESCE((SELECT SUM(points_change) FROM loyalty_transactions t WHERE t.card_id=c.id),0) AS ledger_sum
    FROM loyalty_cards c
    WHERE COALESCE(c.points,0) <> COALESCE((SELECT SUM(points_change) FROM loyalty_transactions t WHERE t.card_id=c.id),0)
  `);
  check("no card violates balance == SUM(ledger)", violations.length === 0, `violations=${violations.length}`);

  const orphans = await qAll(`
    SELECT id FROM customer_purchases p
    WHERE NOT EXISTS (SELECT 1 FROM loyalty_cards c WHERE c.id = p.card_id)
  `);
  check("no orphan purchases", orphans.length === 0, `orphans=${orphans.length}`);

  console.log(`\n${failures ? failures + " FAILURE(S)" : "all checks passed"}`);
})()
  .catch((e) => {
    failures += 1;
    console.error("\nHARNESS ERROR:", e && e.stack ? e.stack : e);
    if (childLog) console.error("\n--- server log (tail) ---\n" + childLog.slice(-3000));
  })
  .finally(async () => {
    if (child && child.exitCode === null) child.kill();
    try {
      await db.close();
    } catch {}
    try {
      fs.rmSync(DB_PATH, { force: true });
    } catch {}
    process.exit(failures ? 1 : 0);
  });
