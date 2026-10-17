# Deep audit — 2026-10-17

Every finding below was reproduced in a browser or against the live database
before being fixed, and re-measured after. Where a first measurement turned out
to be a fault in the measuring tool rather than in the app, that is said.

Harness: a route x viewport sweep (11 routes x 1440 / 768 / 390) collecting
horizontal overflow, zero-size controls, stolen hit-tests, broken images,
duplicate ids, tab/panel pairing and tap-target size; plus live SQL probes.

---

## 1. P0 — SQL placeholder rewriting corrupted queries

`db.js` rewrites SQLite `?` into Postgres `$1, $2, ...` for the
better-sqlite3-compatibility shim. It tracked single-quoted strings and nothing
else, so a `?` in a line comment, a block comment, a dollar-quoted body or a
double-quoted identifier was renumbered as if it were a parameter.

The damage is not the stray `$n`. It is that renumbering **consumes an index**,
so every real placeholder after it shifts:

```sql
SELECT * FROM t -- is this ok ?
WHERE a = ? AND b = ?
```

became

```sql
SELECT * FROM t -- is this ok $1
WHERE a = $2 AND b = $3
```

Callers pass values positionally, so a caller supplying two values bound them to
the wrong columns and wrote the wrong data. No error, no warning — only on the
queries somebody left a comment in.

7 cases were checked; 5 were corrupted. Now 9 pass, including nested block
comments (which Postgres allows) and the guard that stops an already-rewritten
`$1` being read as a dollar-quote opener. Verified live: an insert through a
commented query binds `value-for-a` to column `a` and `value-for-b` to `b`.

`db.js` has three functions by that name — a no-op in the SQLite adapter, the
reverse `$n`→`?` direction, and the one under test. The first extraction tested
the wrong one and reported 7/7 failures, which is why the tests print their
input and output.

## 2. Admin list endpoints read the whole table on every page load

`GET /api/admin/loyalty`, `/users`, `/news` and `/notes` had no `LIMIT`. The
ledger is the one endpoint where this is unbounded rather than untidy: measured
**624 rows / 180 KB** in a single response on the demo data, and it grows with
the shop's customers and their transactions.

`?limit=` and `?offset=` now page it, capped at 1000. The default of 500 is
deliberately far above today's data so no existing admin screen loses rows on
upgrade. Verified: default returns 500, `?limit=5` returns 5,
`?limit=5&offset=5` returns the next 5, `?limit=99999` clamps. Response keys
and every card field are unchanged, so the tables render exactly as before.

## 3. The floating cart covered a tappable control on phones

`.floating-cart` is `position: fixed` and takes no part in layout, so it lands
on whatever is in the bottom-inline-end corner. At 390px on `/collection` it sat
on top of the last card's **heart button** — the one control you cannot scroll
clear of, because it is already at the bottom of the grid. 1 of 24 cards was
unfavouritable by touch. Now **0 of 24**.

## 4. Touch targets below the minimum

Measured at 390px: the hamburger was 35x30, every `.tool-btn` 36x30, the search
close 30x27, the Guides category tabs 63x22. All under the 44px WCAG 2.5.5
target. Hit areas grew to 44x44; the icons are unchanged, so the header keeps
its visual rhythm.

## 5. `100vh` on a phone

`body { min-height: 100vh }` is taller than the visible viewport once browser
chrome collapses, pushing the last row of a grid under both the address bar and
the floating cart. Now `100dvh`.

## 6. Three tablists that told assistive tech they controlled nothing

Profile, Guides and Admin marked their controls `role="tab"` with no
`aria-controls`, no `role="tabpanel"` behind them, and no keyboard support — so
each category button was its own tab stop and announced a relationship that did
not exist.

All three now have a labelled panel, `aria-controls`/`aria-labelledby` that
actually resolve, roving `tabindex` (one tab stop per strip) and arrow-key/Home/
End navigation, through one shared helper (`lib/tablist.js`). Profile's inactive
tab omits `aria-controls` rather than pointing at a panel that is not mounted.

## 7. Three RTL bugs

`dir` is set on `documentElement`, so `[dir="rtl"]` is the switch.

- `.gs-row:hover` nudged results `translateX(4px)` — the wrong way in Arabic.
- The assistant's intro chevron leaned in by `translateX(-2px)` — also wrong.
- The tour's Back/Next arrows were hard-coded left/right, so "next" pointed the
  wrong way in Arabic.

`account.css`'s switch already had an override and was left alone. Key bindings
deliberately stay logical — ArrowRight is always forward — so the arrow shows
where the reader travels and the keyboard keeps one meaning in both directions.

Verified by finding all three rules minified into the shipped bundles.

---

## What the sweep did *not* find

Desktop at 1440px came back clean: no horizontal overflow, no dead controls, no
stolen hit-tests, no broken images, no duplicate ids, no console errors on any
of the 11 routes.

Two things the first version of the sweep flagged that were **false positives**,
worth recording so they are not "fixed" later:

- `data-guide="admin-entry"` appeared unclickable on every route. It has
  `visibility: hidden` and `pointer-events: none` because it lives inside the
  *closed* account popover. The detector did not skip inert elements.
- `A 0x0` nav links on mobile are the collapsed drawer, hidden by design.

## Still open

Every file these fixes touch was already dirty from another agent — `db.js`,
`server.js`, `chrome.css`, `tokens.css`, `guides.css`, `Admin.jsx`,
`AdminLoyalty.jsx`, `Guides.jsx`, `Shell.jsx`, `guidesData.js`,
`Favorites.jsx`, `public/media/guides/`, `_recon/`. The P0 in particular is
fixed on disk but **not in git**.

Known and untouched: the ~290 lines of verbatim-duplicated CSS in `chrome.css`
(487-776 repeats 7-485), News rendering its CTA as `<a href>` so it full-reloads
instead of routing, four different currency formatters, `role="tab"` pairing in
`Discover`, and the assistant's admin-tool query bounds.