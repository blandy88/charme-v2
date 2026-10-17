/*
 * Prove the loyalty write tools are atomic.
 *
 * The failure is injected by handing createTools a wrapper whose transaction
 * scope makes the ledger INSERT fail. If the tool is correctly transactional,
 * the points UPDATE must be rolled back too and the card's balance must be
 * unchanged. If it is not, the phantom movement survives - exactly the bug
 * that used to be possible whenever the ledger insert failed after the
 * balance had already moved.
 */
"use strict";

const path = require("path");
const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

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
  const r = await db.all("SELECT COUNT(*)::int AS n FROM loyalty_transactions WHERE card_id = ?", [cardId]);
  return r[0].n;
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

(async () => {
  const tools = createTools({ db, adminId: 1, lang: "en", catalogue: async () => [] });
  const sabotaged = createTools({ db: sabotageLedger, adminId: 1, lang: "en", catalogue: async () => [] });

  const card = (await db.all("SELECT id, points FROM loyalty_cards ORDER BY id LIMIT 1"))[0];
  if (!card) { console.log("no loyalty card to test against"); process.exit(0); }
  console.log(`\nusing card id=${card.id}, starting balance=${card.points}`);

  const addPoints = tools.byName.get("add_loyalty_points");
  const before = await pointsOf(card.id);
  const ledgerBefore = await ledgerCount(card.id);

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
  await db.run(
    "UPDATE loyalty_cards SET points = ? WHERE id = ?",
    [baseline, card.id],
  );
  await db.run(
    "DELETE FROM loyalty_transactions WHERE card_id = ? AND description = ?",
    [card.id, "probe control"],
  );
  console.log(`         (card restored to ${await pointsOf(card.id)})`);

  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
  process.exit(failures ? 1 : 0);
})();
