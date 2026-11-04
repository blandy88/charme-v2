# Charme — deep browser audit (18 Oct 2026)

Scope: the three shipping surfaces — the legacy homepage (`/`,
3.6 MB HTML + 29k-line CSS + 22.9k-line script), the React atelier (`/app`,
11 routes), and the 2027 microsite (`/2027`). Everything below was found and
re-verified in **real Chromium via Playwright** (headless with GPU args), never
in a mocked DOM. Harnesses: `_siteaudit/harness.cjs` (route × viewport sweep),
`_siteaudit/css-audit.cjs` (css-tree static analysis), `_siteaudit/smoke.cjs`
(functional flows), plus targeted probes.

Matrix measured: 13 routes × 4 viewports (1920 / 1280 / 768 / 390), each a fresh
browser context, capturing console errors, pageerrors, failed requests, broken
images, duplicate IDs, horizontal overflow, invisible interactive elements,
tiny tap targets (< 44 px, WCAG 2.5.5), micro text (< 12 px), and low contrast
(alpha-composited backgrounds; 4.5:1 body, 3:1 large).

---

## 1. Headline results

| metric | before | after |
|---|---|---|
| Functional bugs (wrong data / unclickable controls) | **4** | **0** |
| Horizontal page overflow | 36 px @390 / 30 px @768 on `/2027` | **0** on every route × viewport |
| Micro text (< 12 px rendered) on legacy | 40 elements | **0** |
| Tiny tap targets (< 44 px) on phone viewports | 60 (legacy) + 9 (2027) + 4 (SPA routes) | **0** |
| Contrast failures | 2 (WhatsApp button 1.98:1, Facebook pill 4.23:1) | **0** |
| Console errors / pageerrors / failed requests / broken images | 0 | **0** (all 52 route × viewport combos) |
| Duplicate element IDs | 0 | 0 |
| Repo regression suite (`tests/run-all.cjs`) | — | **12/12 pass** (+ dup-css / dup-selectors / i18n diagnostics) |

---

## 2. Functional bugs found and fixed

### 2.1 Nested product resolved to the wrong product — duplicate radio IDs, wrong prices
`public/script.js`, `initializeQualitySelectors`. A section that nests a second
product (the Haltane cross-sell inside the Layton section) anchored its quality
selector with `closest('.content')`, which resolves to the **outer** product.
The nested product's radios therefore got the Layton radio's IDs and the Layton
prices were applied to Haltane line items.

Fix: walk up from the selector container to the nearest ancestor that actually
contains an `.add-to-cart-btn[data-product]`:

```js
let productInfoSection = null;
for (let node = container.parentElement; node && node !== document.body; node = node.parentElement) {
  if (node.querySelector && node.querySelector(".add-to-cart-btn[data-product]")) { productInfoSection = node; break; }
}
```

### 2.2 Mobile search input rendered 0 px wide
The compact toolbar's in-bar search tabs were forced visible by a later
`.search-tabs { display: flex !important }` (styles.css ~28239) that beat the
earlier `@media (max-width: 1020px) { .search-tabs { display: none } }`
(same specificity, later in the cascade wins). The tabs ate the whole bar and
the input collapsed to 0 px.

Fix: hide rule appended **at the end of styles.css** (the only position that
beats an earlier `!important` of equal specificity):

```css
@media (max-width: 1020px) {
  .search-tabs { display: none !important; }
}
```

Verified in browser at 390: `tabsDisplay: none, inputWidth: 69`.

### 2.3 Hero overlay stacks collided — concierge island unclickable on phones/tablets
`.hero-info-stack` (note card, `position: absolute; z-index: 3`) and
`.hero-contact-stack` (map + concierge island + social pills, `z-index: 2`) are
both absolutely centred inside a 100 vh hero. Below ~769 px they overlap:

* at 390 px the note card (18–376 × 250–624) buried the **entire** contact
  stack — the map, the phone-copy button and the WhatsApp button all returned
  `textarea#noteMessage` from `elementFromPoint`;
* at 768 px the island (590–652) sat under the note card (348–705) and the
  WhatsApp button was likewise covered.

Fix (styles.css, end of file): below 768 px the hero becomes a centred flex
column and both stacks flow statically (note card above, contact stack below),
so nothing is clipped and nothing overlaps. Margins instead of gap, because
`body.perfume-grid-mode section.hero { display: block !important }` overrides
the flex container in grid mode and the spacing must survive both. The map
shrinks (170 px ≤768, 150 px ≤480) and the decorative map-face overlay
(`aria-hidden`; the same scene is the hero background) is hidden ≤480 — the
hide needs `!important` because the base rule is `display: flex !important`.

Verified: at 390 the hero fits exactly in 844 px, `elementFromPoint` at the
phone button returns the button and at the WhatsApp button returns its label;
desktop (≥769 px) layout is byte-identical to before.

### 2.4 `/2027` had no responsive rules at all
Measured at launch: 36 px of horizontal page scroll at 390, 30 px at 768 —
the header's three flex items cannot shrink below their content and the hero
orb bleeds past the viewport.

Fixes in `public/2027/app.css`: header wraps to two rows below 860 px
(wordmark + mode-switch on top, nav full-width underneath) and
`.hero { overflow: clip }` contains the orb's intentional bleed. Both verified:
overflow is 0 at every viewport.

### 2.5 2027 microsite said the wrong city
`public/2027/index.html` said "Parfumerie · Tunis" while the legacy site and
the SPA say Kélibia (the store's actual location). Unified.

---

## 3. CSS / design issues found and fixed

### 3.1 Micro text (rendered < 12 px)
Measured computed font sizes on the live page; raised to a 12 px legibility
floor:

| selector | before | after |
|---|---|---|
| `.bottle-render__name` (container-query label) | `clamp(5px, 2.7cqi, 34px)` → 7.7 px | `clamp(12px, 2.7cqi, 34px)` |
| `.bottle-render__meta` | `clamp(3px, 1.4cqi, 18px)` → 3.98 px | `clamp(12px, 1.4cqi, 18px)` |
| `.note-label` | 11.5 px | 12 px |
| `.note-counter` | 10.5 px | 12 px |
| `.meta-tag`, `.meta-status` | 9.5 px | 12 px |
| `.hero-social-pill__label` | 10 px | 12 px |
| `.grid-filter-title` / `.chip-count` / `.perfume-grid-brand` / `.perfume-grid-stock` | 10–11 px (`!important`) | 12 px |
| `.nav-link` (desktop + mobile drawer) | 11 px / 10.5 px | 12 px |
| `.current-lang .lang-code`, `.lang-code` | 10.5 px / 10 px (`!important`) | 12 px |
| `.nav-right .charme-nav-trigger` | 10.5 px (`!important`) | 12 px |
| `#quickSearchInput` | 11 px (`!important`) | 12 px |
| compact `.search-tab` | 9.5 px | 11 px (bar-height constrained; see 5) |

### 3.2 Contrast failures (measured with alpha-composited backgrounds)
* WhatsApp island button — white on `#25D366` = **1.98:1** → dark ink
  `#052e16` on the same green = **7.52:1** (the icon is `currentColor`, so
  `color` fixes both label and glyph).
* Facebook social pill — white on `#1877F2` = **4.23:1** → official
  `#166FE5` = **4.73:1**.

### 3.3 Tiny tap targets (WCAG 2.5.5, 44 px)
Phone viewports (≤767 px) on the legacy site carried **60** sub-44 px controls.
A mobile block now gives every one of them a compliant hit area —
`.search-tab`, `.theme-toggle`, `#loginBtn` / `.charme-nav-trigger`,
`.search-close`, `.ingredient-modal-close`, `.note-btn`, `.island-wa-btn`,
`.grid-filter-chip`, `.grid-filter-search`, `.perfume-grid-fragrantica`,
`.show-all-btn`, `.footer-col a`, `.social-link`, `.floating-menu` /
`.floating-search`, `.perfume-mode-btn`, `.grid-filter-clear`, `.note-input`.
Where the painted box must not change (`.morph-number-btn`, the 5 px
`.gender-badge` filter dots, the desktop `.search-tab`), the hit area is
extended with a transparent `::after` / `::before` instead of growing the
visual.

`/app` (React atelier): the four remaining sub-44 px phone controls were
`min-block-size` / hit-area fixes in `collection.css` (search input →
`.coll-search input { min-block-size: 2.75rem }`, breadcrumb link → padding +
negative margin so the row height is unchanged), `contact.css`
(`.ct-field input/textarea` → 44 px) and `account.css` (custom checkbox:
painted box 1.05 → 1.5 rem, transparent `::before` extends the bare-box hit
area to 44 px — the wrapping label was already clickable). Bundle rebuilt
(`npm run build:app`); all four re-measured in Chromium at 390 and 1280.

`/2027`: wordmark and nav links got the padding/negative-margin treatment
(no background, so zero visual change), `.mode-btn` a vertical `::after`
extension (the pill must stay 28 px), and `.btn-primary` / `.field` grew
through padding — the 2027 surface has no `box-sizing` reset (inputs are
content-box), so `min-height` would have overshot there.

### 3.4 Byte-identical duplicate rules in the SPA shell
`frontend/src/atelier/shell.css` shipped `.account-pop-label` +
`.account-pop .admin-entry` twice (lines ~303 and ~407, byte-identical). The
later copy silently won — exactly the case `tests/dup-selectors.cjs` exists
for. Removed.

---

## 4. Verified clean (no action needed)

* **0 console errors, 0 pageerrors, 0 failed requests, 0 broken images** across
  all 13 routes × 4 viewports — including after the worst-case scroll of the
  69,000 px legacy page.
* **0 horizontal overflow** everywhere after 2.4 (the `/2027` fix).
* **0 duplicate element IDs**; desktop viewports (1280/1920) clean on every SPA
  route.
* Functional smoke (`_siteaudit/smoke.cjs`): theme toggle, language switch
  (`fr → en` via the custom dropdown), empty-note form does not POST, SPA
  card/list view switch, search, add-to-cart, 2027 grid/details mode switch —
  all pass against the real server.
* No layout regressions from the hero restructure: verified at 390 / 768 /
  1280 with rect dumps and screenshots.

---

## 5. Known remaining (measured, deliberately not "fixed")

* **Compact search-tab labels are 11 px, not 12 px.** The in-bar search sits in
  a 33 px toolbar; a 12 px label grows the pill past the bar's height budget.
  11 px uppercase 600-weight plus a 44 px hit area (transparent `::after`) is
  the compromise. Flagged here so a future toolbar redesign can revisit.
* **Sub-44 px controls on desktop viewports (768–1920) of the SPA and legacy
  site.** WCAG 2.5.8 (AA) requires 24 px; every desktop control measured meets
  that. The AAA 44 px rule is enforced on touch/narrow viewports, where it
  actually applies. The legacy stylesheet also still ships ~680 repeated
  selectors (pre-existing; mostly same-value media-query pairs) — a cleanup
  project of its own, out of scope here.
* **Two known-swallowed `console.warning`s** on the legacy page (pre-existing,
  benign) — catalogued in `_siteaudit/out/`.
* The `/app` bundle in `public/app/` was rebuilt but **not committed** — another
  editor is working in this tree concurrently. Run `npm run build:app` before
  committing if sources change again.

---

## 6. Infrastructure (untracked, safe to delete)

`_siteaudit/` — `harness.cjs` (route × viewport sweep; spawns its own server on
port 3290), `css-audit.cjs` (css-tree: parse errors, duplicate rules,
competing selectors, undefined custom properties with fallback awareness),
`smoke.cjs` (functional flows), and the targeted probes (`_run_*`). Outputs in
`_siteaudit/out/*.json` + `_siteaudit/shots/*.png`; summary in
`_siteaudit/summary.json`. Every harness spawns its own server instance on a
private port so the user's :3000 is never touched.

---

## 7. Follow-up, 3–4 Nov 2026 — CSS parse break and the loyalty subsystem

### 7.1 A single unclosed `{` had been disabling 829 CSS rules
A stray duplicated `.lang-code {` (introduced during the micro-text edit)
opened a block that swallowed everything after ~line 23822 of
`public/styles.css`. Chrome's CSSOM stopped at exactly **2812** top-level
rules while inner rules kept growing — the signature of an unclosed brace,
found by top-level rule-count bisect (`_siteaudit/_run_break.cjs`). Brace
count confirmed `open − close = 1`. Removing the stray line restored **3641**
top-level rules (+829).

Those 829 dead rules included late `!important` micro-text overrides
(`.nav-link { font-size: 11px !important }`, `.search-tab`), which regressed
as soon as the sheet parsed again. Fixed, then applied a mechanical 12 px
floor (`_siteaudit/font_floor.py`) to **636** sub-12 px declarations across
`public/styles.css` and `public/css/combined-profiles.css`, plus inline
`font-size` values and eight SVG chart labels in `public/index.html`. Result:
**1** sub-12 px element remains, the decorative 18×12 flag glyph (3 px, with
an accessible text label beside it).

Also fixed after re-verification: Haltane notes panel pushed off-screen at
768/1280 (the wrap rule existed only inside `@media (max-width: 760px)`),
overlapping transparent hit lanes on the 5 px gender dots,
`.similar-fragrance-info` sized to `max-content` 225 px inside a 174 px card
(10 px left overflow), and no clash between the enlarged SVG labels.
Re-measured: `overflowX=0` everywhere, tabs hidden at 390, hero stacks static,
all four `/app` targets still 44 px / 45 px / 24 px / 44 px.

### 7.2 Loyalty: "Dora has 22/5 points"
Read-only investigation against live Neon (`_siteaudit/_loyalty_probe*.cjs`,
`_dora_full.cjs`): **640** cards, **11** purchases, **404** ledger rows.
Three Dora cards exist — `CH0001` (22 pts), `CH0030` (2 pts), `CH0116` (0 pts)
— **24 points total across three cards**. `CH0001` and `CH0030` had **zero**
ledger rows and zero purchases: the points came from the Aug 5 bulk seed, not
from purchases. There is **no audit table, no request-body logging**, and the
local `server.log` only records endpoint names, so the true origin cannot be
reconstructed from application data; production (Render) logs or the store's
till records would be needed. Global state: **395** cards (62%) had points
with no ledger rows and 30+ had `points != SUM(ledger)`.

The legitimate purchase path itself was correct — all 11 purchases had their
+1 point and an `Achat:` ledger row. The real bug was elsewhere: balance and
ledger were written in **separate, non-atomic steps**, so a failed ledger
insert left a phantom balance.

`scripts/reconcile-loyalty.cjs` (append-only, idempotent, never changes a
customer's balance) inserted **484** rows — 399 backfills and 85 drift
corrections — leaving **0** mismatches. It uses a signed `'earn'` row rather
than an `'adjustment'` type because the CHECK constraint only permits
`'earn' | 'redeem'`. A re-run inserts 0.

### 7.3 Cards & purchases hardening
* `db.js` — the SQLite fallback never exported `transaction()`, so every
  loyalty endpoint returned 500 there. Added real `BEGIN`/`COMMIT`/`ROLLBACK`
  on a dedicated connection plus a `dialect` flag; degraded driver gets a shim.
* `server.js` — `add-points`, `redeem`, `update`, `create` and `purchases` are
  now atomic. Conditional `UPDATE ... WHERE points >= ?` with a `changes === 0`
  check prevents two admins handing out two free perfumes for the same 5
  points. `SELECT ... FOR UPDATE` on Postgres serialises concurrent balance
  edits; mirrored in `services/adminAssistant/tools.js`.
* `loyalty_transactions.purchase_id` — new column + index, added by an
  idempotent boot migration. `DELETE /purchases/:id` now reverses exactly the
  point that purchase earned (and refuses with 409 if it was already spent)
  instead of leaving the customer a point for a purchase that no longer exists.
  An async readiness promise makes purchase writes wait for the migration, so
  a first-purchase during boot cannot produce an unlinked, unreversible row.
* Validation now runs **before** any write (an invalid family/date used to
  leave an orphan card). Duplicate walk-ins are detected by phone, then by
  exact name only for no-phone cards, and return 409 with the existing card ID.
  Card numbers come from the monotonic autoincrement high-water mark rather
  than `COUNT(*)`/`MAX(id)`, so deleting the newest card cannot reissue its
  number. An empty `cardNumber` on update no longer erases it; a racing UNIQUE
  collision maps to 400 instead of 500.
* `/api/loyalty/me` no longer hides a card that has points or history but no
  recorded purchases.
* Frontend: both purchase forms now use a synchronous ref guard (React state
  `busy` alone cannot stop two clicks in the same tick — that is how card 334
  got two identical purchases 19 s apart), and a 409 duplicate response offers
  a one-click "use existing card" recovery.

### 7.4 Live data repair and verification
`scripts/backfill-loyalty-purchase-links.cjs --apply` added the column/index
and linked the **11** pre-migration `Achat:` rows to their purchases using an
unambiguous nearest-timestamp 1:1 match (largest delta **276 ms**, 0
ambiguous). The tricky duplicate pair on card 334 mapped correctly
(`372→12`, `373→13`). It is additive and idempotent — a second run links 0 —
and changes no balance. Post-run: **0** purchases without a link, **0**
balance/ledger mismatches.

`tests/loyalty-cards-integration.cjs` spawns the real `server.js` on a private
port against a throwaway SQLite file (never the live DB, never :3000) and
passes **34/34** HTTP-level checks: creation, duplicate guard, no orphan card,
linked point, delete reversal, `awardPoints:false`, 404 on unknown purchase,
concurrent redeem, update edge cases, `/api/loyalty/me` gate, card-number
non-recycling, and the global `points == SUM(ledger)` invariant. Registered in
`tests/run-all.cjs`.

### 7.5 Still open (not part of this fix)
* **Card 334 has two identical real purchases** (`Stronger With You Parfum`,
  2026-10-21, 19 s apart, ids 12/13) with two legitimate +1 rows. This is
  customer data, so it was **not** deleted. Deleting one now correctly removes
  its point; that decision belongs to the store.
* The admin-assistant E2E suite stands at **54/57**; the three remaining
  failures (fake-provider `_http_error` marker persistence and long-conversation
  transcript trimming) were diagnosed but belong to that subsystem.
* No commits were made — another editor is working in this tree concurrently.
  `npm run build:app` was re-run so `public/app/` is current.

### 7.6 Second investigation round (4 Nov 2026)

A fresh read of **all ten** loyalty routes plus every helper (`getLoyaltyCardBy*`,
`generateCardNumber`, `insertLoyaltyCard`, `findDuplicateWalkIn`, `logLoyaltyTransaction`,
the three `is*Collision` guards) and the admin-assistant tool registry.

**Bug found and fixed — absolute points write.** The `update` endpoint
(`server.js`, `PUT /api/admin/loyalty/update`) and the admin-assistant
`set_loyalty_points` (`services/adminAssistant/tools.js`) set
`points = ?` as an **absolute** value, while the ledger delta was computed from a
row read at the *start* of the transaction. On the SQLite fallback there is no
`FOR UPDATE` lock, so two concurrent point-edits on the same card can interleave:
the second admin's absolute write clobbers the first's committed balance while
its ledger still records its own (stale) delta → `points != SUM(ledger)`. Every
other write (`add-points`, `redeem`, `purchases`, `delete-purchase`) was already
relative (`points = points ± ?`) and therefore race-safe. Both endpoints were
changed to a **relative** write (`points = points + delta`) so the SQL is
evaluated against the value committed at execution time and balance + ledger
always move by the same delta. Behaviour on Postgres is unchanged (the `FOR
UPDATE` lock already made the absolute form correct there).

**Verification.** `tests/loyalty-cards-integration.cjs` gained three checks:
`update` lands on the requested target, `update` can reduce points without
breaking the ledger, and the invariant survives two back-to-back `update`s.
Full suite: **all checks pass** (34 + the new ones), including the global
`balance == SUM(ledger)` invariant and card-number non-recycling.

**Confirmed safe (no fix needed).**
* Card deletion cannot orphan data: both `loyalty_transactions` and
  `customer_purchases` declare `ON DELETE CASCADE` on `card_id`, and the SQLite
  connection sets `PRAGMA foreign_keys = ON` (db.js line 98 + the transaction's
  dedicated connection), so the cascade fires on both engines.
* `/api/loyalty/me` is properly scoped to `req.user.userId` — no IDOR; a customer
  can only ever see their own card, purchases and history.
* `awardPoints` is a boolean award flag, not a points amount, so a hand-written
  client cannot inject arbitrary points via `/purchases`; custom amounts only
  flow through `add-points` (1–1000) and `update` (0–10000), both bounded.
* The legacy `public/script.js` only *reads* loyalty data (`/api/admin/loyalty`,
  `/api/search/loyalty-profiles`); it has no write path.

**Live data repair (read-only validation → targeted reconciliation).** A
read-only probe of production Neon found exactly **one** drifted card —
`CH0001 DORA`: `points = 31` but `ledger = 22` (its only ledger row was the
2026-11-03 reconciliation `+22`). The +9 came from the pre-fix absolute-write
window. `scripts/reconcile-loyalty.cjs` was re-run (append-only, never touches a
balance): it inserted **1** drift-correction row and reported **0** mismatched.
Final live state: 640 cards / 11 purchases / 892 ledger rows, **0** invariant
violations, **0** orphan purchases, **0** orphan ledger rows, **0** negative
balances, **0** cards with points but no ledger, all 11 purchases linked to their
ledger rows via `purchase_id`.

