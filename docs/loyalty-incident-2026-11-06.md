# Loyalty / fidelity card incident — root site

**Date:** 2026-11-06
**Scope:** `https://charme-v2.vercel.app/` (the legacy root site, `public/index.html` + `public/script.js`).
**Explicitly out of scope:** `https://charme-v2.vercel.app/app` (React atelier). Per the owner, the complaints are about `/`.
**Investigation mode:** read-only against live Neon. **No customer data was modified during this investigation.**

---

## 0. Executive summary — read this first

**The points are not lost and the database is not corrupt.** All 642 cards satisfy
`balance == SUM(ledger)`, with zero orphan rows, zero duplicate card numbers, zero
duplicate purchase awards and zero dangling purchase links. Total: 1,078 points across
642 cards.

The complaints are real, but they come from **what the shop assistant sees**, not from
the stored balances. Three things went wrong, and two of them were introduced by our
own deploy on **4 November 2026**:

| # | Cause | Effect on customers | Status |
|---|-------|--------------------|--------|
| 1 | A new `LIMIT 500` on the admin card list (deploy `259295a`) hid **142 of 642 cards**, **79 of them holding points** | Staff cannot find the card → "you have no points" / "your points disappeared" | **Fixed** |
| 2 | A new 8-second serverless gate delayed every purchase save on Vercel | Staff think the click failed, click again → **two purchases, two points** | **Fixed** (measured 7,118 ms → 54 ms) |
| 3 | Long-standing UI flaws in the September client: no double-click guards, stale balances, an edit dialog that rewrites points, no visible history | Extra points, silently erased points, disputes nobody can resolve | **Fixed** |

There is also a **business exposure list** (§8) that needs your decision — most notably
7 cards that are eligible for a free perfume and have never been redeemed, including
`CH0001 DORA` at 31 points. **I did not touch those balances.**

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
isolated Vercel cold-start probe           7,118 ms -> 54 ms  PASS
global invariant                          violations = 0, orphan purchases = 0
```

The integration suite runs against a throwaway SQLite file on a private port. It never
touches live Neon or the local `:3000` instance. The Vercel probe uses an isolated
SQLite database and an in-process Express app.

---

## 8. Business exposure — needs your decision (no data was changed)

1. **7 cards are eligible and have never been redeemed** (threshold 5):

   | Card | Holder | Points | Free perfumes owed |
   |---|---|---:|---:|
   | CH0001 | DORA | 31 | 6 (+1 pt left) |
   | CH0121 | KHOULOUD hargli | 7 | 1 |
   | CH0086 | FEDIA JELIDI | 6 | 1 |
   | CH0133 | INES | 5 | 1 |
   | CH0149 | YASSINE JEBALI | 5 | 1 |
   | CH0354 | MAJID MANSALI | 5 | 1 |
   | CH0403 | HATEM SAWOUD | 5 | 1 |

   Please confirm these are genuine before honouring them. DORA's 31 points deserve a
   specific check (see item 3).

2. **Duplicate identities**: 10 phone groups + 40 name groups. Merging cards is a
   destructive operation that combines balances — it must be confirmed card by card.
   A safe review list is in `_siteaudit/_loyalty_deep4.out`.

3. **One unexplained movement**: `CH0001 DORA` changed from 22 to 31 points at
   **2026-11-04 18:44 UTC** with no `Achat`, `Ajout`, or `Modification` ledger row;
   the reconciliation script added a +9 row 3 minutes later to keep the ledger
   consistent. This is the only such case. It may be from earlier maintenance on this
   database, but I cannot prove that from the data. **Please confirm whether 31 is the
   correct balance for DORA.**

4. **One duplicate purchase**: card 334, purchase ids 12/13, `Stronger With You Parfum`,
   19.49 s apart on 2026-10-21. Deleting one will now correctly reverse its point.

5. **80 rapid-fire +1 pairs** (mostly 3–4 s apart). Ambiguous: they may be legitimate
   multi-item awards. The new guards prevent future accidental doubles; I did not
   delete any historical row.

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
4. Before touching any balance, resolve §8 items 1–4 with the owner.
5. The `/app` admin was paginated too because it calls the same endpoint; its
   rebuilt bundle is included in item 1.

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
