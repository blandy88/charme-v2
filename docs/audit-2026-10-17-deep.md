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

## 8. A claim from an earlier report that did not survive checking

An earlier audit recorded "~290 lines of verbatim-duplicated CSS in
`chrome.css` (487-776 repeats 7-485)". Measured, that is wrong. `chrome.css` is
792 lines and the search panel *is* defined twice — `.gs-field` at 19 and 501,
`.gs-panel` at 69 and 549, `.gs-row` at 233 and 640, `.gs-thumb` at 248 and 673 —
but the second block is an **override cascade, not a copy**, introduced under a
comment reading "smoother, friendlier, clearer". The second `.gs-field` declares
no `display`, `align-items` or `gap`; it depends on the first. `.gs-thumb` grows
from 2.5rem to 2.6rem and gains `flex: none`. Deleting the earlier block would
break the layout.

So the duplication was left alone. `tests/dup-css.cjs` (exact matches) and
`tests/dup-selectors.cjs` (repeated selectors) are in the repo so the next
claim can be measured rather than repeated.

## 9. Five different price formatters

`catalog.formatPrice` (rounds), `Cart`'s local `money()` (rounds), `Loyalty`'s
local `money()` (rounds but writes **"DT"** in capitals), and two raw
`${price} dt` interpolations in `Product`'s size pills and `AdminLoyalty` that
did not round at all. A stored `259.999` read **"259.999 dt"** in the back
office and **"260 dt"** in the shop.

`catalog.money()` is now the only one that adds a unit; every call site routes
through it. `tests/price-check.cjs` checks ten inputs and greps the tree for the
shapes that used to bypass it.

## 10. Four dialogs claimed `aria-modal` and trapped nothing

`Discover`, the admin `Modal`, `AvatarEditor` and the two `Guides` overlays all
declared `aria-modal="true"`, which promises a screen reader that the page
behind is inert. Nothing made that true of the keyboard: focus stayed on the
button that opened the dialog, and closing left it on `<body>`, so the next Tab
restarted at the top of the document.

`lib/useDialogFocus.js` moves focus in, keeps Tab and Shift+Tab inside, and
restores focus on close — but only if focus is still inside, because yanking it
back after a deliberate move is worse than leaving it. Adopted in all four.

`Discover` was left alone after the first attempt: it already holds a ref on its
panel and focuses it, so adding a second one would have hijacked that ref.

## 11. News CTA forced a full page load

`resolveHref` rewrites `/contact` to `/app/contact`, then rendered it as
`<a href>`. Every in-shop news CTA re-downloaded and re-parsed the bundle and
threw away the router's state. Internal targets now render as `<Link>`;
external ones stay real links, with `rel="noopener noreferrer"` and
`target="_blank"` where applicable.

---

## Regression checks

All twelve now live in `tests/` and run with one command:

```
node tests/run-all.cjs
```

They were previously stranded in a temp folder and hardcoded an absolute path to
this checkout, so they only ran on the machine that wrote them; they now derive
the repo from `__dirname`.

---

## Still open

Every file these fixes touch was already dirty from another agent — `db.js`,
`server.js`, `chrome.css`, `tokens.css`, `guides.css`, `Admin.jsx`,
`AdminLoyalty.jsx`, `Guides.jsx`, `Shell.jsx`, `guidesData.js`, `Favorites.jsx`,
`Collection.jsx`, `Product.jsx`, `Loyalty.jsx`, `Cart.jsx`, `News.jsx`,
`public/media/guides/`, `_recon/`. The P0 in particular is fixed on disk but
**not in git**.

Untouched and unverified: the assistant's admin-tool query bounds, `Discover`'s
own tab pairing, the `--danger` tokens that exist only in `account.css` so the
admin falls back to a hex literal, and the dead code noted in earlier audits.