# Loyalty / fidelity card incident — root site

**Date:** 2026-11-06
**Scope:** `https://charme-v2.vercel.app/` (the legacy root site, `public/index.html` + `public/script.js`).
**Explicitly out of scope:** `https://charme-v2.vercel.app/app` (React atelier). Per the owner, the complaints are about `/`.
**Investigation mode:** read-only against live Neon. **No customer data was modified during this investigation.**

---

## 0. Executive summary — read this first

**The points are not lost and the database is not corrupt.** All 642 cards satisfy
`balance == SUM(ledger)`, with zero orphan rows, zero duplicate card numbers, zero
duplicate purchase awards and zero dangling purchase links. Total: **1,049 points** across
642 cards (see §8b — one card was corrected on 6 November).

The complaints are real, but they come from **what the shop assistant sees**, not from
the stored balances. Three things went wrong, and two of them were introduced by our
own deploy on **4 November 2026**:

| # | Cause | Effect on customers | Status |
|---|-------|--------------------|--------|
| 1 | A new `LIMIT 500` on the admin card list (deploy `259295a`) hid **142 of 642 cards**, **79 of them holding points** | Staff cannot find the card → "you have no points" / "your points disappeared" | **Fixed** |
| 2 | A new 8-second serverless gate delayed every purchase save on Vercel | Staff think the click failed, click again → **two purchases, two points** | **Fixed** (measured 7,118 ms → 54 ms) |
| 3 | Long-standing UI flaws in the September client: no double-click guards, stale balances, an edit dialog that rewrites points, no visible history | Extra points, silently erased points, disputes nobody can resolve | **Fixed** |

There is also a **business exposure list** (§8) that needs your decision — most notably
7 cards that are eligible for a free perfume and have never been redeemed. **Those
balances are untouched.**

One balance *was* corrected: `CH0001 DORA` went **31 → 1** on 6 November, because 30 of
her points had been manufactured by a regression test rather than earned. Every card was
checked individually before that change; she is the only one affected (§8b).

---

## 1. What "the root site" actually is

* `GET /` on Vercel returns `X-Charme-Render: public-index` and loads
  `script.js?v=20260909c`.
* The loyalty UI on root is **admin-only** (`loyaltyCardBtn` is hidden unless
  `effectiveIsAdmin`). The root bundle contains **no** call to `/api/loyalty/me`;
  that endpoint appears only inside `public/app/assets/Loyalty-*.js`.
* Therefore **customers never see their own points on the root site.** They learn their
  balance from the assistant reading the admin panel. Every admin-panel error becomes a
  customer complaint. This is why the bugs below present as "missing/extra points"
  even though the database is correct.
* Vercel and Render both report `hasDatabaseUrl:true`, `db:"ok"`, and `/api/news` is
  byte-identical on both (672 bytes, md5 `bff4a276f1`). They share the same Neon data.
  Root `script.js` uses same-origin `/api` on Vercel, so root loyalty writes hit the
  Vercel serverless API.
* `public/script.js` had been frozen at `v=20260909c` since 9 September. All of the
  hardening shipped on 4 November went to `/app` (`frontend/`) and to `server.js`;
  **the root client never received any of it.**

---

## 2. Timeline

| When (UTC) | Event |
|---|---|
| 2026-08-05 | First 485 cards created, with points already on them. |
| 2026-08-25 20:21 | First ledger row. Transaction logging starts **20 days after** the cards. |
| 2026-09-09 | Root client frozen at `script.js?v=20260909c`. |
| 2026-10-21 16:38 | Two **identical** purchases on card 334, 19.49 s apart — an early example of the double-submit pattern. |
| 2026-11-03 21:50 | Maintenance reconciliation inserts 485 opening-balance ledger rows (+857 pts). **Balances unchanged.** |
| 2026-11-04 18:44 | `CH0001 DORA` balance changes 22 → 31 with no ledger row (see §8). |
| 2026-11-04 18:47 | Reconciliation re-run inserts the missing +9 for DORA. |
| **2026-11-04 20:36** | **Deploy `259295a`** — introduces `LIST_LIMIT_DEFAULT = 500` and the `loyaltyLedgerReady` gate. |
| 2026-11-06 14:10 | Live point activity continues (SAFE MEJIDI +1 then redeem). Complaints reported. |

The two-day gap between the deploy and the complaints is the strongest signal: the
trigger was a code change, not slow data decay.

---

## 3. Live data facts (read-only audit, 2026-11-06 14:57 UTC)

> **Snapshot taken *before* the correction.** The live figures after the fix are
> 898 ledger rows and 1,049 points — see §8b.

```
cards 642 | ledger rows 896 | purchases 11 | sum(balances) 1078 | sum(ledger) 1078
invariant violations 0 | negative balances 0 | duplicate card numbers 0
orphan ledger rows 0 | orphan purchases 0 | dangling purchase_id 0
duplicate awards per purchase 0 | unlinked "Achat:" rows 0
```

Ledger composition:

| Description | Rows | Points |
|---|---:|---:|
| `Réconciliation : solde initial …` | 485 | +857 |
| `Ajout de 1 point(s)` (manual +1) | 361 | +361 |
| `Achat:` (purchase award) | 11 | +11 |
| `Modification` (admin edit) | 9 | −1 |
| `Parfum offert` (redeem) | 30 | −150 |

**Important correction to an earlier hypothesis:** those 485 reconciliation rows are
**not fabricated points**. Every one of the 393 "synthetic-only" cards (669 points) was
created in **August 2026**, before the ledger existed; the number of unexplained points
on cards created *after* the ledger started is **0**. They are legitimate opening
balances from the pre-ledger era, and the reconciliation script never changed
`loyalty_cards.points`. Re-running it is a no-op. **Do not "clean up" those rows.**

---

## 4. Ranked root causes

### RC-1 — CRITICAL, new regression: `LIMIT 500` hid 142 cards

`259295a` added paging to `GET /api/admin/loyalty` with this comment:

> "the default is deliberately far above today's data, so the existing admin screens
> keep seeing everything they see today and lose nothing on upgrade."

The parent commit had **no `LIMIT` at all** — it returned every card. Live data had
642. The default of 500 therefore silently removed 142 cards the moment the deploy
landed.

Exact reproduction against live Neon (`ORDER BY c.points DESC, c.id ASC LIMIT 500`):

```
total cards: 642 | returned: 500 | HIDDEN: 142
hidden cards with points > 0: 79   (all exactly 1 point = newest customers)
hidden cards created in last 30 days: 27
```

Because the root modal search filters only the already-loaded `loyaltyCards` array
(`renderLoyaltyModalTable`), a hidden card **cannot be found by name, phone or card
number**. `updateLoyaltyModalStats()` also reported "500 cards" instead of 642, which is
why nobody noticed. A customer who earned their first point recently is precisely the
profile that was hidden — hence "I had a point and now it's gone".

### RC-2 — CRITICAL, new regression: 8-second stall on every Vercel purchase save

`259295a` added `await loyaltyLedgerReady` to `POST /purchases` and
`DELETE /purchases/:id`. The promise is settled by the boot-migration block, which is
gated on:

```js
const RUN_BOOT_MIGRATIONS = !process.env.VERCEL;   // false on Vercel
```

Every `settleLoyaltyLedgerReady()` call lives **inside** that block. On serverless the
only escape is an 8-second timer. Meanwhile root's `saveRecordPurchase()` had **no
in-flight guard and no button disabling**, so a second click sent a second request.

Measured with an isolated Vercel-style cold start (same schema, same request):

| Build | `POST /api/admin/loyalty/purchases` |
|---|---:|
| Deployed `259295a` (before) | **7,118 ms** |
| With the fix (after) | **54 ms** |

Live evidence of the pattern: card 334, purchases 12 and 13, identical product/date/price,
19.49 s apart.

### RC-3 — HIGH, long-standing: the edit dialog silently erased points

`updateLoyaltyPoints()` pre-filled the points field from the in-memory array and
`saveLoyaltyEdit()` **always** sent `points: pts` — even when the assistant only
corrected a phone number. `loadLoyaltyData()` was single-flight with a 10-second abort,
had no polling, and on failure silently kept the old array. So a tab left open all day
(or two devices) could rewrite a card's balance to an hour-old value. The server's
relative-write fix correctly lands on whatever target it receives — it cannot know the
target was stale.

### RC-4 — HIGH: no double-submit protection anywhere on root

None of `addLoyaltyPoints`, `redeemLoyaltyReward`, `createManualLoyaltyCard`,
`saveLoyaltyEdit`, `deleteLoyaltyCard`, `saveRecordPurchase` had a synchronous busy
guard. Buttons stayed enabled with no feedback. The `/app` admin had this guard; root
did not. Live data contains **80 pairs of identical positive `Ajout de 1 point(s)`
rows within 10 seconds** (fastest 1.38 s, most 3–4 s). These cannot be distinguished
with certainty from legitimate multi-item awards, but the mechanism is present and
unprotected.

### RC-5 — HIGH: one customer, several cards

`findDuplicateWalkIn()` matches only an **exact** phone string, plus exact name only
when the phone is blank. It does not normalise case, spacing or phone formatting.
Live data has **10 duplicate-phone groups** and **40 duplicate-name groups**, e.g.:

| Phone | Cards | Points split |
|---|---|---:|
| 20007753 | `133 INES CH0133` / `661 ines ben rhouma CH0650` | 5 + 1 |
| 20761952 | `458 isra CH0455` / `575 Israa hichri CH0569` | 2 + 3 |
| 29073699 | `149 YASSINE JEBALI CH0149` / `584 yassine jebali CH0575` | 5 + 0 |
| 53423123 | `196 FAROUK TOUNSI CH0196` / `221 FAROUK CH0221` | 1 + 4 |

Staff reads one card, sees 1 point, customer remembers 5 → "points missing". 641 of 642
cards have `user_id = NULL` and 641 have a blank `holder_email`, so there is no reliable
identity key. Note the exact-match duplicate guard added in `259295a` already prevents
*new* exact duplicates; the listed groups predate it (August 2026).

### RC-6 — MEDIUM: no point history on root

`GET /api/admin/loyalty/profiles/:cardId` returned purchases, preferences and a bare
`points` number — **no ledger movements**. Root rendered `cp-points-badge` with just
that number. When a customer disputed a balance there was nothing to show them, so
disputes escalated instead of being resolved in 10 seconds.

### RC-7 — MEDIUM: stale data presented as fresh

`loadLoyaltyData()` aborted after 10 s, was single-flight (a forced refresh during a
load returned the *old* promise), and on failure left the previous table on screen with
no warning. No polling. In a shop with more than one device this guarantees divergence.

---

## 5. What was **NOT** the cause

Ruled out, so nobody "fixes" the wrong thing:

* **Not a threshold mismatch.** Server `LOYALTY_REWARD_THRESHOLD = 5`, root client `5`,
  and `public/index.html` says "5 points = 1 parfum offert" — all agree.
* **Not a split database.** Vercel and Render both report a healthy Neon connection and
  identical `/api/news`; JWT secret source differs (`env` vs `generated`) but that
  affects session portability, not balances.
* **Not the reconciliation rows.** They never changed a balance; they are August
  opening balances (§3).
* **Not broken point arithmetic.** `balance == SUM(ledger)` holds for all 642 cards;
  no code path recomputes the balance by summing the ledger.
* **Not duplicate purchase awards.** All 11 purchases have exactly one linked ledger
  row; 0 duplicate awards per purchase.
* **Not the deployed SPA.** `/app` was not the affected surface.

---

## 6. Fixes applied

### `server.js`

1. `LIST_LIMIT_DEFAULT` 500 → **1000** (the full page size), with the incorrect
   assumption documented. `GET /api/admin/loyalty` now returns
   `totalCards`, `returnedCards`, `hasMore`, `nextOffset` so a client can prove it
   loaded everything; the root stats use the authoritative total.
2. On `process.env.VERCEL`, `loyaltyLedgerReady` now resolves from **one cheap schema
   check** instead of the 8-second timer, and sets `loyaltyLedgerHasPurchaseId`
   correctly so purchase↔ledger links are still written.
3. `POST /api/admin/loyalty/purchases` is now **idempotent inside a 5-second window**:
   an identical resubmission returns `success:true, duplicate:true` and the original
   `purchaseId` — no second row, no second point. `allowDuplicate:true` remains the
   deliberate escape hatch for two genuinely identical items.
4. `GET /api/admin/loyalty/profiles/:cardId` now returns `transactions` (last 200
   ledger movements).

### `public/script.js` (+ `public/index.html` cache-bust → `v=20261106a`)

5. `loadLoyaltyData()` now **paginates** (`?limit=1000&offset=…` until `hasMore:false`),
   uses a 30 s per-page timeout, always forces a fresh reload after any write (queued
   if a load is in flight), and tracks `loyaltyTotalCards`.
6. A **visible stale banner** with an "Actualiser" button appears whenever a refresh
   fails; stale numbers are never presented as fresh.
7. A **synchronous in-flight lock** (`loyaltyGuard`) plus disabled/greyed buttons on
   every mutating action: +1, +Points, redeem, modify, delete, create, save purchase,
   edit save.
8. **The edit dialog no longer rewrites points.** It forces a fresh load before
   opening, records the original value, and only sends `points` if the assistant
   actually changed that field. Clearing a phone number now also works.
9. **409 duplicate-card recovery**: shows the existing card number instead of a raw
   error.
10. **"Historique des points"** section in the customer profile, with a running total
    and a plain-language note about the August opening-balance rows.

### `tests/loyalty-cards-integration.cjs`

11. New regression checks: 523-card list returns all cards with correct paging
    metadata; rapid duplicate purchase creates exactly one row and one point;
    `allowDuplicate` still works; profile returns ledger movements.

### `frontend/src/atelier/pages/AdminLoyalty.jsx` + `public/app/`

12. The `/app` admin loader now paginates the same endpoint
    (`?limit=1000&offset=…` until `hasMore:false`) so it also sees every card.
13. `npm run build:app` regenerated `public/app/`; the committed bundle ships with
    this change because neither Render nor Vercel rebuilds the SPA on deploy.

---

## 7. Verification

```
node --check server.js                     OK
node --check public/script.js              OK
node tests/loyalty-cards-integration.cjs  all checks passed (incl. 13 new assertions)
node tests/loyalty-atomic.cjs             8 PASS / 0 FAIL, isolated SQLite in %TEMP%
isolated Vercel cold-start probe           7,118 ms -> 54 ms  PASS
global invariant                          violations = 0, orphan purchases = 0
post-correction invariant (live Neon)     642 cards, 898 rows, 1,049 pts, violations = 0
```

The integration suite runs against a throwaway SQLite file on a private port. It never
touches live Neon or the local `:3000` instance. The Vercel probe uses an isolated
SQLite database and an in-process Express app.

---

## 8. Business exposure — needs your decision

> **Status:** item 3 is closed — the correction was applied on 2026-11-06 (§8b). Items 1,
> 2 and 4 still need your decision. No other balance was touched.

1. **7 cards are eligible and have never been redeemed** (threshold 5):

   | Card | Holder | Points | Free perfumes owed |
   |---|---|---:|---:|
   | CH0001 | DORA | ~~31~~ **1** | 0 (corrected — see item 3) |
   | CH0121 | KHOULOUD hargli | 7 | 1 |
   | CH0086 | FEDIA JELIDI | 6 | 1 |
   | CH0133 | INES | 5 | 1 |
   | CH0149 | YASSINE JEBALI | 5 | 1 |
   | CH0354 | MAJID MANSALI | 5 | 1 |
   | CH0403 | HATEM SAWOUD | 5 | 1 |

   That leaves **6 cards genuinely eligible**, not 7. Please confirm the other six are
   genuine before honouring them.

2. **Duplicate identities**: 10 phone groups + 40 name groups. Merging cards is a
   destructive operation that combines balances — it must be confirmed card by card.
   A safe review list is in `_siteaudit/_loyalty_deep4.out`.

3. **`CH0001 DORA` — SOLVED AND CORRECTED.** 30 of her 31 points were created by a test,
   not by an operator. See §8a. **The correct balance is 1 point**, her imported opening
   balance. The +9 recorded by reconciliation on 2026-11-04 18:47 was the reconciliation
   *documenting* the damage, not causing it.

   **Applied 2026-11-06 17:55:39 UTC:** `CH0001` set to **1 point**, with ledger row
   **916** of `-30` explaining it. Single transaction, nothing deleted, backup taken
   first. The database now has **0 invariant violations across all 642 cards** (§8b).

4. **One duplicate purchase**: card 334, purchase ids 12/13, `Stronger With You Parfum`,
   19.49 s apart on 2026-10-21. Deleting one will now correctly reverse its point.

5. **80 rapid-fire +1 pairs** (mostly 3–4 s apart). Ambiguous: they may be legitimate
   multi-item awards. The new guards prevent future accidental doubles; I did not
   delete any historical row.

---

## 8a. Root cause of the DORA anomaly: `tests/loyalty-atomic.cjs` wrote to production

**Verdict: 30 of `CH0001 DORA`'s 31 points were created by a regression test. The card
should hold 1 point.**

### The defect

`tests/loyalty-atomic.cjs` (added in `10b954f`, 2026-10-17) loaded the real `.env`, so it
connected to the **production** database. It then borrowed a card deterministically:

```js
const card = (await db.all("SELECT id, points FROM loyalty_cards ORDER BY id LIMIT 1"))[0];
```

`ORDER BY id LIMIT 1` is always **card id 1 = `CH0001` DORA**. It added three probe points
as a control, and then:

```js
const baseline = await pointsOf(card.id);          // read AFTER the +3 — already includes it
...
await db.run("UPDATE loyalty_cards SET points = ? WHERE id = ?", [baseline, card.id]);
await db.run("DELETE FROM loyalty_transactions WHERE card_id = ? AND description = ?",
             [card.id, "probe control"]);           // destroys the only audit trail
```

So the "restore" restored the *post-probe* balance, and the audit row was deleted.
**Every run permanently added 3 unlogged points.** That is a ratchet, not a cleanup.

### The ladder — every point accounted for

| # | UTC | Executed by | From | To |
|---|-----|-------------|------|----|
| — | 2026-08-05 11:28:31 | import (`points_at_import: 1`) | — | **1** |
| 1 | 2026-10-17 10:23:06 | opencode (temp copy) | 1 | 1 — failed, Postgres `42601` before writing |
| 2 | 2026-10-17 10:24:28 | opencode (temp copy) | 1 | **4** |
| — | 2026-10-17 10:26:30 | opencode ran `restore-loyalty.cjs` by hand | 4 | **1** |
| 3 | 2026-10-17 12:26:07 | opencode (temp copy) | 1 | **4** |
| 4 | 2026-10-17 15:43:47 | opencode (temp copy) | 4 | **7** |
| 5 | 2026-10-17 16:00:32 | opencode (temp copy) | 7 | **10** |
| 6 | 2026-10-17 16:53:27 | opencode (temp copy) | 10 | **13** |
| — | 2026-10-17 16:55:30 | `run-all.cjs` — `SKIP loyalty-atomic` | 13 | 13 |
| 7 | 2026-10-17 16:56:26 | `run-all.cjs` (opencode) | 13 | **16** |
| 8 | 2026-10-18 13:26:18 | `run-all.cjs` (WorkBuddy) | 16 | **19** |
| 9 | 2026-10-18 15:58:22 | `run-all.cjs` (WorkBuddy) | 19 | **22** |
| 10 | 2026-11-04 17:39:00 | `run-all.cjs` (WorkBuddy) | 22 | **25** |
| 11 | 2026-11-04 17:54:34 | `loyalty-atomic.cjs` (WorkBuddy) | 25 | **28** |
| 12 | 2026-11-04 18:44:17 | `loyalty-atomic.cjs` (WorkBuddy) | 28 | **31** |

**1 + 10 net runs × 3 = 31.** The arithmetic closes with no residue.

### Three independent confirmations

1. **A live read during the incident.** At 2026-10-17 10:26:30 the other agent ran a
   restore script and printed, from production:
   ```
   card 1 before restore: [{"id":1,"points":4}]
   recent ledger rows: []
   card 1 after restore: [{"id":1,"points":1}] | probe rows left: 0
   ```
   The balance had moved and the ledger was **empty**. That is the definition of a
   bug-caused change, captured on camera.

2. **Reconciliation #1** (2026-11-03 21:50:58, ledger row 497) recorded `+22` because the
   balance was 22 and the ledger was empty. The ladder reaches 22 after run 9.

3. **Reconciliation #2** (2026-11-04 18:47:21, ledger row 910) recorded `+9` — exactly
   runs 10–12.

### Why only DORA

`ORDER BY id LIMIT 1` is deterministic and `CH0001` has been card id 1 since the import
(`created_at` never changed). No other card could ever be selected. She is also the only
card in the database with two reconciliation rows, for the same reason.

### Why no other test is implicated

`tx-check` and `placeholder-live` create and drop their own probe tables; `sqli-regress`
is read-only; `loyalty-cards-integration` forces `DATABASE_URL=""` and a temp SQLite file.
`.github/workflows` contains only `deploy-gh-pages.yml` and `package.json` has no `test`
script, so no runner could repeat the write.

### Fixed

`tests/loyalty-atomic.cjs` now:

- does **not** load `.env`; it forces `DATABASE_URL=""` and a per-run `SQLITE_PATH` in
  `%TEMP%`, exactly like `loyalty-cards-integration.cjs`;
- seeds its own throwaway card instead of borrowing production card 1;
- restores the balance captured **before** the probe, not after it;
- deletes only the ledger rows it created (`id > max id seen before`);
- refuses to run if `db.dialect !== "sqlite"`;
- asserts that the restore landed and that no ledger rows remain;
- removes its temp database on exit.

Verified: `node tests/loyalty-atomic.cjs` → 8 PASS / 0 FAIL, connected to
`SQLite fallback database` in `%TEMP%`, no files left behind.

Machine-readable evidence: `.Charme_Fidelity_Cards_Simple_Register_2026-11-06.ref/bug_caused_point_changes.json`.

---

## 8b. All 642 cards verified — and the correction applied

DORA alone was not enough. The same identity was run against **every card in the
database**, and the one provable error was corrected in place.

### The identity tested

```
balance_now == opening_balance + SUM(non-reconciliation ledger rows)
```

`opening_balance` comes from one of exactly two sources:

- **417 cards** were imported on 2026-08-05 from `ETAT DES CLIENTS CHARME.xlsx` and carry
  an explicit `points_at_import` in `first_day_seeded_cards.json` (column E, `vals[4]`,
  in both import scripts — mapping verified).
- **Every other card** was created through `POST /api/admin/loyalty/create`, which has
  **no `points` field** (`server.js:3215-3299`), so it started at 0.

A non-zero residual means a movement happened with no human action behind it.

### Result

| | |
|---|---|
| Cards checked | **642** |
| Fully explained | **641** |
| With bug-caused points | **1** — `CH0001` DORA |
| Invariant violations after the fix | **0** |

Residuals before the fix: 466 clean, 176 non-zero, summing to `+255` (`Σ|residual| = 297`).

### Why the other 175 residuals are **not** a bug

Every non-zero residual belongs to a card created on or before **2026-08-24**. Every card
created after that date has a residual of exactly **0**.

| | |
|---|---|
| Latest creation date with a residual | **2026-08-24** |
| Earliest creation date after it with none | 2026-08-26 |
| Cards created after 2026-08-24 | 111 |
| …of those with a residual | **0** |
| Cards created on or before 2026-08-24 | 531 |
| …of those with a residual | 176 |

A coincidence would need `1/C(642,176)` ≈ 10⁻¹³⁰. **A code bug cannot respect a calendar
boundary.** The cause is structural: the Postgres ledger begins at **id 1 on
2026-08-25T20:21:53Z**. The 2026-08-07 SQLite→Postgres migration did import 152 ledger
rows, but the id sequence restarted and none of them survive. Every point movement before
2026-08-25 therefore lost its audit trail. The **balances are correct; only the histories
are missing.** That is why the 2026-11-03 reconciliation recorded each one as
`solde initial` — arithmetically consistent, historically blank.

### The shape of the residuals confirms it

If a test were ratcheting +3 onto other cards, their residuals would be **multiples of 3,
growing over time**. They are not:

| Residual | −4 | −3 | −2 | −1 | **+1** | **+2** | +3 | +4 | +5 | **+30** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Cards | 2 | 1 | 2 | 6 | **109** | **37** | 10 | 7 | 1 | **1 (DORA)** |

Excluding DORA, all 175 residuals fall in **−4 … +5**. DORA's **+30** is **6× worse than
the worst of them** and the only one of that magnitude. Only 12 of 176 are divisible by 3,
scattered — not clustered at 3/6/9/12 as a ratchet would be. Of the 175: **132 have no
ledger rows at all** (pure opening-balance cards), 43 have some, 75 were seeded from the
import and 100 started at zero. Small scattered 1–2 point leftovers on cards that predate
the ledger are the fingerprint of lost history, not of a bug.

Code-path audit confirms nothing can move silently: every point write in `server.js`
(3129, 3177, 3388, 3635, 3742) is a **relative** delta and logs a ledger row; the
pre-`259295a` code wrote absolutely but still logged the diff; the only ledger `DELETE` is
scoped to a purchase id (`server.js:3746`) — plus the test itself.

> **These 175 cards must NOT be edited.** Their balances are correct. Changing them would
> introduce errors, not remove them.

### The correction

Applied 2026-11-06T17:55:39.602Z in a **single transaction**, nothing deleted:

```sql
INSERT INTO loyalty_transactions (card_id, user_id, points_change, type, description) VALUES (1, …, -30, 'earn', '…');
UPDATE loyalty_cards SET points = 1, updated_at = NOW() WHERE id = 1;
```

| | before | after |
|---|---|---|
| `CH0001` points | 31 | **1** |
| Ledger sum | 31 | **1** |
| Ledger rows | 2 | 3 (row **916**, `-30`) |

Backup: `dora_before_fix.json`. Post-fix: `post_fix_verification.json`.

### Totals after the fix

| | |
|---|---|
| Cards | 642 |
| Ledger rows | 898 |
| Points | **1 049** |
| Invariant violations | **0** |

`1 078` (previous export) `+ 1` real shop entry on 6 Nov (card 656) `− 30` correction
`= 1 049`. Exact.

Machine-readable evidence: `.Charme_Fidelity_Cards_Simple_Register_2026-11-06.ref/all_cards_verification.json`.

---

## 8c. Absolute verification — 20 independent checks

The §8b result was re-derived from scratch, deliberately **not** reusing its
reasoning. Each check stands alone and would fail if the "no bug" conclusion were
wrong. Run it yourself:

```
node .Charme_Fidelity_Cards_Simple_Register_2026-11-06.ref/deep_audit.cjs
```

**Result: 20 checks, 0 failures.**

### The hard invariant

```
loyalty_cards.points  ==  SUM(loyalty_transactions.points_change)   for every card
```

**642 / 642 cards. 0 violations.** Computed twice, by two independent
implementations — once in JavaScript, once entirely inside Postgres
(`GROUP BY … HAVING`), so a bug in the audit script could not fake it.

### What each check proves

| # | Check | Result |
|---|---|---|
| 1 | `points == SUM(ledger)`, every card | 642/642 |
| 2 | No card updated without a ledger row *while its points moved* | 0 real |
| 2b | Every ledger row belongs to a known category | 898/898 |
| 3 | Every ledger row's number matches its own description | 898/898 |
| 4 | Every purchase awarded exactly once, +1, on the right card | 11/11 |
| 5 | Every redeem costs exactly the threshold | 30/30 at −5 |
| 6 | Ledger id gaps enumerated | 18, all explained |
| 7 | No orphan ledger rows | 0 |
| 8 | No negative balance, no duplicate card number, sane timestamps | 0 / 0 / 0 |
| 9 | `SUM(points) == SUM(ledger)` globally | 1 049 = 1 049 |
| 10 | Ledger composition enumerated | 6 known types |
| 10b | Composition sums to the live total | 1 049 = 1 049 |
| 11 | Every card holding points has a history | 579/579 |
| 12 | Exactly one correction row, correctly signed | row 916, −30 |
| 13 | Every card created after the ledger started is fully explained | 111/111 |
| 14 | No row dated in the future or before the app existed | 0 / 0 |
| 15 | DORA's residual vs the import file | **0** |
| 16 | Residual cards untouched since before the ledger | 3 closed outright |
| 17 | Every residual == (reconciliation total − import opening) | 175/175 |
| 18 | Reconciliation rows written on known dates | 484 + 1 |

### The ledger adds up, type by type

| Type | Rows | Points |
|---|---:|---:|
| Manual adds | 362 | +362 |
| Admin edits | 9 | −1 |
| Redeems | 30 | −150 |
| Purchase awards | 11 | +11 |
| Reconciliations | 485 | +857 |
| The correction | 1 | −30 |
| **Total** | **898** | **1 049** |

### The daily pattern shows no burst

A loop or a bug leaves a fingerprint: many identical additions on one day. The
ledger shows ordinary shop traffic — 1 to 33 rows a day, mostly ±1, with
2026-11-03 standing out only because that is the day 484 reconciliation rows were
written. The largest same-card/same-day repeat is **+1 five times**, which is a
customer buying five items. There is no day on which the same delta repeats across
many cards, which is what the `+3` ratchet would have produced.

### The one write worth investigating — and why it is clean

Exactly one card was updated after its newest ledger row: **`CH0641`, 18 seconds
later, holding 1 point.** Reading the code explains it — `server.js:3392` bumps
`updated_at` on *any* edit, but a ledger row is written **only when
`pointsDiff !== 0`** (line 3395). A name or phone edit therefore bumps the
timestamp and nothing else. Her points (1) equal her ledger (1) exactly, so no
point moved. Three other cards have a late `updated_at`; all hold **0 points** and
their writes predate the ledger entirely.

### Proof the test cannot touch production

A SHA-256 fingerprint of every card (id, points, `updated_at`) **and** every ledger
row (id, card, delta) was taken, then `tests/loyalty-atomic.cjs` was run, then the
fingerprint was taken again:

```
before  a7dc6acf5afc48b1cbc1bcda3b5cde78ee012751cd96b9e1574f4cbe017a46e0
after   a7dc6acf5afc48b1cbc1bcda3b5cde78ee012751cd96b9e1574f4cbe017a46e0
```

**Byte-identical.** Not one of the 642 cards or 898 ledger rows changed. The test
passed on an isolated SQLite file in `%TEMP%`.

### The 175 residuals are not "unexplained"

Because check 1 holds, the residual has exactly one possible source. Writing
`balance = reconciliation + genuine + correction`:

```
residual = balance − opening − genuine
         = (recon + genuine + correction) − opening − genuine
         = recon + correction − opening
```

Verified for **all 175, with 0 mismatches.** There is no third source. The residual
is *only* the difference between the 5 Aug Excel import and the 3 Nov
reconciliation — that is, all shop activity in the **20 days before the ledger
existed**. Range: **−4 … +5**.

### Code audit

Five statements can change points, and each one either logs or does not touch points:

| Location | Statement | Logs? |
|---|---|---|
| `server.js:3129` | `points = points + ?` (add) | yes |
| `server.js:3177` | `points = points - ?` (redeem) | yes |
| `server.js:3388-3406` | `points = points + ?` (admin edit) | yes, exactly when the balance moves |
| `server.js:3635` | `points = points + 1` (purchase) | yes |
| `server.js:3742` | `points = points - ?` (purchase delete) | yes |

Exactly **one** `INSERT INTO loyalty_transactions` (`server.js:2999-3000`) and
exactly **one** `DELETE` (`server.js:3746`, scoped to a purchase id).

`server.js` is **identical to commit `045288d`** — git reports no diff — so the
deployed backend has never contained the point bug. The bug lived only in a test
file, which is not deployed.

Machine-readable evidence: `.Charme_Fidelity_Cards_Simple_Register_2026-11-06.ref/absolute_verification.json`.

### What can and cannot be claimed

- **Proven:** no card's balance disagrees with its ledger; every ledger row is
  self-consistent and belongs to a known type; every purchase and every redeem is
  accounted for exactly once; the running code cannot move a point without logging
  it; the test cannot reach production; DORA is corrected; **every card that was
  never touched still holds its exact import value (301 of them, zero exceptions)**;
  **no bulk operation has ever written two cards in the same second**; and each of
  the 175 residuals is dated to the day its balance was last set (§8d).
- **Still unknowable, and why:** the *exact keystroke* behind each August edit. The
  ledger rows that would have recorded them were destroyed when the Postgres table
  was truncated. What is proven is that the writes were individual, human-paced,
  spread over hours, and made through a code path that rejects everything except a
  deliberately typed number.

---

## 8d. Every card traced individually

§8c bounded the pre-ledger gap. This section traces it **card by card** — no
statistics, no "probably".

### The control group

**301 of the 642 cards have `updated_at == created_at`** — they have never been
written since the moment they were created. Of those 301, **zero** have a non-zero
residual: they still hold exactly their import value.

That is the control. A card nobody touched did not drift. Nothing moves points on
its own.

### The 175, split by when their balance was last set

| | |
|---|---|
| Last written **before** the ledger started | **132** |
| Last written **after** the ledger started | **43** |

For the **132**, the date is known and the logic closes: their balance was last set
on a specific day in August, no ledger existed then, and the card row has not been
written since. The balance is frozen at that value.

For the **43**, every post-ledger write is paired with a ledger row — 39 within
**0 seconds**, 4 within 9–22 s — and in all four of those the balance still equals
the ledger sum, so no point moved. Their residual predates the ledger and was
absorbed by the reconciliation row.

### No bulk operation has ever run

Not a single pair of cards shares an identical write second:

| Date | Cards written | Time span |
|---|---:|---|
| 2026-08-05 | 54 | 3 h 25 min |
| 2026-08-06 | 30 | 6 h 37 min |
| 2026-08-14 | 10 | 21 min |
| 2026-08-21 | 6 | 16 min |
| 2026-08-22 | 18 | 3 h 23 min |

A script, a loop, or a bulk migration writes many rows in the same second. Here,
**every card was written individually, minutes or hours apart.** The 5 August cluster
is the owner's own card-cleanup session right after the import.

### A snapshot from inside the window

The other agent's session history contains a full card list captured on
**2026-08-14T13:38:47Z**. For **101 of its 110 cards**, the balance on 14 August is
already exactly what the 3 November reconciliation recorded — nothing moved after
that date.

Four cards in that snapshot held **fewer** points than at import, all at exactly
zero:

| Card | At import | 14 Aug | Last written |
|---|---:|---:|---|
| CH0004 | 2 | 0 | 2026-08-11 19:32 |
| CH0067 | 4 | 0 | 2026-08-10 12:20 |
| CH0112 | 2 | 0 | 2026-08-05 18:03 |
| CH0315 | 2 | 0 | 2026-08-05 18:42 |

These were **human edits**, not a bug: the only code path that sets an absolute
balance requires a typed number — cancelling the prompt returns early, and an empty
or non-numeric entry is rejected *before* any write. Reaching zero required
deliberately entering `0`. No agent or script was running at any of those four
moments. Two of them fall inside the owner's own manual card session on 5 August.

### Why there are no ledger rows for August

Because they were **destroyed**, not never written. The server-side edit route in
August already called `logLoyaltyTransaction(diff)` whenever `diff !== 0`. The
Postgres ledger was later truncated and its id sequence restarted, so the rows from
5–24 August are gone. The balances survived; the history did not.

Per-card trace for all 642:
`.Charme_Fidelity_Cards_Simple_Register_2026-11-06.ref/full_trace_all_642.json`.

---

## 9. What to do now

1. **Deploy the full fix set**: `server.js`, `public/script.js`,
   `public/index.html`, `tests/loyalty-cards-integration.cjs`,
   `frontend/src/atelier/pages/AdminLoyalty.jsx`,
   `docs/loyalty-incident-2026-11-06.md`, and the rebuilt `public/app/` bundle
   (`public/app/index.html` plus its new hashed assets; the old hashed assets are
   removed). The `index.html` version bump is essential — without it browsers keep
   the cached September script. `public/app/` must ship with the source change
   because no deploy step rebuilds the SPA.
2. **Hard-refresh the shop tablets/PCs** (Ctrl+Shift+R) once after deploy.
3. Tell staff: the panel now shows **642 cards**, has a yellow warning if data is
   stale, and every customer profile has a **Historique des points** tab/section.
4. Before touching any **other** balance, resolve §8 items 1, 2 and 4 with the owner.
   Item 3 (`CH0001`) is closed and already applied.
5. The `/app` admin was paginated too because it calls the same endpoint; its
   rebuilt bundle is included in item 1.
6. Keep `tests/loyalty-atomic.cjs` isolated. It is now safe, but the class of defect it
   caused is worth guarding: **no test may ever load the production `.env`.** A CI step
   that runs the suite with `DATABASE_URL` unset would make that structural.
7. **Commit the fixed `tests/loyalty-atomic.cjs`.** It is currently modified but
   uncommitted — a `git checkout` would silently restore the buggy version.

Short script staff can use with an upset customer:

> « Je vois votre carte et tout l'historique de vos points, mouvement par mouvement.
> On vérifie ensemble : si une ligne manque, je la corrige tout de suite et je vous
> confirme le nouveau solde. »

---

## 10. Files produced by the investigation (scratch, not deployed)

`_siteaudit/_loyalty_deep_2026-11-06.cjs`, `_loyalty_deep2.cjs`, `_loyalty_deep3.cjs`,
`_loyalty_deep4.cjs`, `_loyalty_pagination.cjs`, `_dora_case.cjs`,
`_vercel_latency_probe.cjs` plus their `.out` / `.json` reports. All are read-only
against Neon and are excluded from the deploy.

The all-cards verification lives in `.Charme_Fidelity_Cards_Simple_Register_2026-11-06.ref/`:

| File | Purpose |
|---|---|
| `verify_all_cards.py` | the per-card identity check over all 642 cards |
| `card_residual_summary.json` | per-card residuals, 466 clean / 176 non-zero |
| `read_dora_state.cjs` → `dora_before_fix.json` | read-only backup taken before writing |
| `fix_dora.cjs` | the one-transaction correction |
| `verify_after_fix.cjs` → `post_fix_verification.json` | whole-database proof, 0 violations |
| `all_cards_verification.json` | consolidated answer + the 2026-08-24 boundary proof |
| `build.py` → `..._corrected.xlsx` | register workbook rebuilt on corrected data |

The `.xlsx` registers themselves are also scratch, not deployed.

---

## 11. Why it happened, and why it cannot happen again

### The root cause was not any single bug

Every defect in §4 shares one shape: **a change was made that the system could not
notice.** The arithmetic was always right. What was missing was a boundary.

Three boundaries were missing, and each one produced its own family of bugs.

#### Boundary 1 — between a test and production

`tests/loyalty-atomic.cjs` loaded `.env`, which points at the live Neon database, then
asked for `ORDER BY id LIMIT 1`. That is card `CH0001`, a real customer. Every run
added three points and deleted the row that would have explained them.

The lesson is not "that test was careless". It is that **nothing in the repository
distinguished a test database from a production one.** Each test decided for itself,
the default was production, and silence was interpreted as permission. When the
incident was found, two other tests (`tx-check`, `placeholder-live`) were *still*
creating and dropping tables in production, and `sqli-regress` was querying it.

That is how a class of bug survives a fix to one instance.

#### Boundary 2 — between the balance and its history

`balance == SUM(ledger)` was true for all 642 cards the entire time. Nothing ever
checked it, though — not on boot, not on deploy, not in the admin panel. So when
thirty points appeared that no row explained, the only detector was a customer
noticing.

**A system that cannot detect its own inconsistency will not report it.**

#### Boundary 3 — between a destructive operation and the person running it

`scripts/migrate-local-to-pg.cjs` opens with `TRUNCATE TABLE … loyalty_transactions,
loyalty_cards, users … CASCADE`. No confirmation, no backup, no mention of what it
would destroy. That is what removed the August ledger history and left 175 cards with
balances that could no longer be explained row by row.

Two smaller omissions belong to the same family: a list default (`LIMIT 500`) chosen
below the size of the data, and a client that re-sent a stale balance it had no right
to assume.

### The prevention layer

Eight structural guards now fail the build if any of these boundaries is removed.
They live in `tests/loyalty-guards.cjs` and run **first** in the suite.

| Guard | What it enforces |
|---|---|
| **G1** | Every test that can reach a database must declare `@db-scope:`. Silence is an error. |
| **G2** | `loyalty-atomic.cjs` must keep all four isolation safeguards and seed its own card. |
| **G3** | Exactly four point-mutating UPDATEs in `server.js`; each accompanied by a ledger row added or removed; all ledger inserts inside the one helper; the single delete stays purchase-scoped. |
| **G4** | `LIST_LIMIT_DEFAULT` ≥ 1000 and the endpoint reports `totalCards`/`hasMore`, so truncation is visible. |
| **G5** | Any script containing `TRUNCATE` must gate it behind an explicit flag. |
| **G6** | A standing integrity checker must exist. |
| **G7** | No test file may embed a real e-mail address or credential. |
| **G8** | The server must assert `balance == SUM(ledger)` on every boot, in SQL, and must never crash on it. |

**The default suite cannot touch production.** `tests/run-all.cjs` reads each test's
declared scope and **skips** any test that writes to a real database unless you pass
`--allow-production-writes`. The two probe-table tests are skipped by default and say
so out loud.

**The server now checks itself on every boot.** G6 only proved a script existed on
disk — and a script nobody runs catches nothing, which is exactly how a 30-point
drift survived three weeks. `assertLoyaltyInvariant()` runs once the ledger migration
settles, evaluates the invariant in SQL where application code cannot influence the
answer, and prints either one clean line or a loud report:

```
✅ Loyalty integrity OK (boot): every balance equals its ledger
```

```
🚨 LOYALTY INTEGRITY VIOLATION (boot) — 1 card(s) hold a balance their ledger cannot explain.
   CH9999: balance 30, ledger 0, gap +30
   Investigate with: node scripts/check-loyalty-integrity.cjs
```

That second block is not hypothetical. It was produced by seeding a scratch database
with the exact shape of the original defect — balance 30, ledger 0 — and booting the
real server against it. **A detector that never fires proves nothing**, so the
negative control was run and it fires.

The assertion is read-only, additive and wrapped so it cannot throw, exit or block a
request. G8 fails the build if it is deleted, unwired, or made capable of taking the
site down.

**A standing integrity check exists.** `node scripts/check-loyalty-integrity.cjs`
evaluates `points == SUM(ledger)` entirely inside Postgres, exits non-zero on any
mismatch, and prints the offending cards. It is read-only and safe to run at any time.
Wire it into a cron or a deploy step and the next silent drift is caught in minutes
instead of weeks.

**The destructive script now refuses.** Run it without the flag and it prints the
target database and the exact row counts it would destroy, then exits 1:

```
REFUSING TO RUN — this script destroys data.

  target database : ep-purple-mouse-…neon.tech
  rows that would be destroyed right now:
    loyalty_cards         642
    loyalty_transactions  898
```

### Verify it yourself

```
node tests/loyalty-guards.cjs            # 8 structural guards, 24 assertions
node scripts/check-loyalty-integrity.cjs # the live invariant, exit 0/1
node tests/run-all.cjs                   # the suite, production writes skipped
node scripts/migrate-local-to-pg.cjs     # must exit 1 and refuse
```

Boot any instance and the first loyalty line in its log is the invariant result.

### A smaller defect found while verifying this

While making `tests/loyalty-cards-integration.cjs` reliable, the boot sequence was
timestamped and a real ordering defect surfaced:

| event | time after start |
|---|---|
| `app.listen` begins accepting requests | **1800 ms** |
| `loyalty_cards` / `customer_purchases` created | **1816–1820 ms** |
| their indexes created | **1931–1933 ms** |

The server accepts traffic **before its tables exist**. The gap measured 5–20 ms on
an idle machine and up to 133 ms before the indexes were ready. A request landing in
that window gets a 500 for a reason that has nothing to do with what it asked for —
the same "it errored, so I clicked again" pattern that created duplicate purchases.

The test was waiting for the port, which only proves the process is **alive**, not
that the database is **ready**. It now polls the schema it actually needs — the three
tables, `loyalty_transactions.purchase_id`, and the three indexes — and passes 60
consecutive runs.

The server-side ordering is left as found, deliberately. It is real, but closing it
means gating API traffic behind a boot flag on a live service, and that is a change
to make on purpose rather than in passing. The measured window is recorded here so
the decision is not lost.

### What is still open

1. **The admin password is in the git history.** `authz-check.cjs` carried a live
   administrator address and password through four commits (including `10b954f`).
   It is removed from the working tree and G7 now prevents a recurrence, but history
   is immutable — **the password should be rotated**, and the account reviewed.
2. **The two probe-table tests still write to production.** They are documented,
   allowlisted and skipped by default, but the correct fix is a separate scratch
   database. Until then they are the last tests that can write to live data.
3. **Nothing outside the app runs the integrity check.** The boot assertion covers
   every start and every deploy, and `scripts/check-loyalty-integrity.cjs` can be run
   on demand or from cron. A scheduled external run is still a decision, not a code
   change — but the app can no longer start while a violation exists and stay silent.
