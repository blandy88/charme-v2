# /app atom-level design audit — 13 Oct 2026

**Scope**: every route × {390, 768, 1440} × {night, light}, plus an Arabic/RTL pass —
**95 captures, 25,991 elements measured**. Method, raw data and re-runnable scripts:
`_recon/design-audit-2026-10-13/` (`atom-matrix.cjs`, `analyze.cjs`, `digest.cjs`,
`focus-probe.cjs`, `a11y-probe.cjs`, `crop.cjs`, `findings.json`, `shots/`).

**How the noise was removed** (the first run of this audit was wrong; these three fixes made it trustworthy):

1. Chrome returns computed colours as `oklch()` / `color(srgb …)` for anything authored in a
   wide gamut, so an `rgb()` regex silently failed and the background walk fell through to
   `document.body` (producing a bogus `ratio 1.12` on gold accent buttons). Every colour is
   now resolved through a 1×1 canvas pixel readback and **alpha is composited over the
   nearest opaque ancestor** before comparison. `offColor` fell 503 → 6, `lowContrast` 101 → 3.
2. `.filter(Boolean)` on the token name/value arrays **shifted every later pair**, corrupting
   the palette and all three scales. Removed. Scales are now resolved through a probe element,
   so `rem` / `clamp()` tokens become real px.
3. Scanner false positives were resolved by measurement, not belief: `clipped` (19) are
   `.sr-only` 1px spans; `deadControls: outline:none` (1,243) are wrong because computed style
   cannot see `:focus-visible` — a real Tab-key probe shows **19 of 20 focusable elements get
   a proper 2px accent ring**; `deadControls: no accessible name` (65) are wrong because the
   check only looked at `aria-label`/text — all 9 probed routes have **zero unnamed controls**
   (labels wrap them). `offSpacing` sub-3px values (button optical resets, `1px`/`-1px`/`1.6px`)
   are separated from real values below.

**Already verified good** — do not spend time here: no horizontal overflow on any of the 95
captures; no console/page errors; night↔light defect parity is identical on all 15 routes
(only one light-specific bug, D2); RTL mirroring is correct (wordmark → nav → search → tools
reads right-to-left properly); focus rings and accessible names are solid; no page-level
view-transition regressions.

---

## P0 — visible to every visitor, on the primary money page

### D1. The collection's first page is a wall of "Actuellement épuisé"
`pages/Collection.jsx:293` renders `{p.available ? null : <span className="shelf-out">…}`.
**554 of 752 catalogue items (73.7%) carry `available: false`** in
`public/data/fragrances.json`, and the default order puts 19 of the first 24 in that state —
so screens `d1440-night-collection`, `m390-night-collection` and both RTL captures show a grid
where four cards in five carry a sold-out badge. It reads as a shop that is permanently closed.
*Fix options, in order of preference:* (a) sort available items first, (b) hide the badge for
items that are out of stock and instead render the card at reduced opacity with the price, or
(c) correct the data — `available` should mean "orderable", and 74% is almost certainly wrong
rather than intentional. Also fix `span.shelf-out` (`pages/collection.css:248`) — it is one of
the two 12px labels in D5.

### D2. The hero caption is invisible in light theme
`shell.css:306-312` — `.hero-visual figcaption` hard-codes
`color: oklch(96% 0.008 var(--brand-hue))` instead of a token. Measured contrast **1.06**
(needs 4.5) on `d1440-light-home`, `t768-light-home`, `m390-light-home` — white text on a
light photograph with a gradient that only darkens the bottom 25%. Same root cause as the
map caption on `/contact`. *Fix:* `color: var(--text-1)` and darken the scrim
(`linear-gradient(transparent, oklch(0% 0 0 / 0.75))`), or make the scrim a token that
switches per theme.

---

## P1 — correct-looking but measurably wrong

### D3. News dates are raw strings, and the navbar unread badge is permanently dead
`pages/News.jsx:6-11` (`fmtDate`) and `contexts/NewsContext.jsx:19-25` (`stamp`) both build
`"2026-08-06T18:05:49+00Z"` from the Postgres value `2026-08-06 18:05:49+00` — a **+offset and
a Z**, which is invalid, so `new Date()` returns `NaN`. Consequences, both verified:
- the page prints the raw `2026-08-06 18:05:49+00` instead of a formatted date, and
  `toLocaleDateString()` also ignores the site language (an Arabic visitor gets the browser
  locale);
- `stamp()` returns `0` for every item, so `unread = items.filter(i => stamp(i.created_at) > seen)`
  is **always empty** — the navbar news badge can never appear.
*Fix:* parse `"YYYY-MM-DD HH:MM:SS+00"` by replacing the space with `T`, stripping a trailing
`+00`/offset and appending `Z`; pass `charme-lang` to `toLocaleDateString`.

### D4. `?view=list` is a dead deep link
`pages/Collection.jsx:53` — `const [view, setView] = useState("grid")` never reads the query
string, and the toggle never writes it. Proof: `d1440-night-collection.png` and
`d1440-night-collection-list.png` are **byte-identical** (md5 `6e39d4fd…`, also at 390 and 768),
and the grid/list buttons report `aria-pressed="false"` for both states on a `?view=list` load.
*Fix:* initialise from `useSearchParams` and sync on toggle, or drop the URLs from the sitemap.

### D5. A hard-coded 12px sits below the type scale
697 elements across the matrix render at `font-size: 0.75rem` (12px), under the `--step--1`
floor of 12.48–13.44px, and one control renders at 13.3px. Locations:
`pages/collection.css:213` (`.shelf-brand`), `:249` (`.shelf-out`), `:465` and `:865`
(`.also-brand` and a spec term), plus `dt` terms on the PDP. *Fix:* use `var(--step--1)`.
Separately, **the "Envoyer" submit button renders in Arial 13.333px** — the UA default — on
`/` and `/contact` (measured: 1 Arial element per page, 4 off-scale 13.3px buttons). Root cause:
`tokens.css:409 .btn-accent` sets no `font-family`/`font-size`, `.pressable` sets none, and
there is no global `button { font: inherit }` reset (`chrome.css:40` and `tokens.css:442` are
scoped to `.gs-field input` / `.field`). *Fix:* add `font-family: var(--font-body); font-size:
var(--step--1);` to `.btn-accent` and a bare `button { font: inherit }` to the base layer.

### D6. Product names are truncated in the grid
`pages/collection.css:219-226` — `.shelf-body h3` uses `white-space: nowrap` +
`text-overflow: ellipsis` inside a 6-column 1440px grid, so 3 of 24 names on `d1440-night-collection`
are ellipsised (`Green Irish Tweed` sw:147/cw:140, `Silver Mountain Water` 180/140,
`Millesime Imperial` 150/140). Same at `collection-list` and in RTL. The rule also carries an
off-scale `margin-top: 0.1rem` (1.6px). *Fix:* clamp to two lines
(`-webkit-line-clamp: 2; display: -webkit-box`) and let the grid breathe.

### D7. The page gutter is off the spacing scale at ≥768px
`shell.css:6` — `.wrap { padding-inline: clamp(1rem, 4vw, 2rem) }` resolves to **30.7px at
768 and 32px at 1440**, while the scale is 4/8/12/16/24/36/56/88. ~65 instances across the
matrix (`div.wrap`, `div.wrap.footer-grid`, `main.wrap.collection`, `main.wrap.pdp`,
`main.wrap.acct`). *Fix:* snap the clamp's top to `var(--space-l)` (2.25rem = 36px) or use a
stepped media query.

### D8. Other off-scale spacing
`paddingTop: 48px` (`.wrap.hero-grid` @390) and `61.4px` (@768) — off scale;
`ul.news-feed { margin-top: 32px }`; `li.news-card { padding-top: 20.8px }`;
`span.bottle-body { padding-top: 28.6px }` (and 52.5px on the monogram PDP);
`div.empty { padding-top: 46.1px }`; `span.bottle-body { border-radius: 6px }` — 13 per
collection page, off the radius scale 8/16/28/999. All in `pages/collection.css`,
`pages/news.css` and `pages/contact.css`. *Fix:* replace each with the nearest scale token.

---

## P2 — content depth and data quality

### D9. Three nav destinations are bare login walls
`guides`, `loyalty` and `admin` render as a centred card with a full-width accent button and
**85% of the page empty** (all three captures are exactly one viewport tall, 900/1024px, i.e.
under-filled). `/favorites` is 987px. A visitor who clicks "Guides" or "Fidélité" sees nothing
but a login wall — no preview, no teaser, no value proposition. *Fix:* show the gated content
blurred/teased behind the wall (the data already exists in `atelier/lib/guidesData.js`), or
remove the links from the nav until the content ships. Also: the full-width solid accent
button is visually heavy next to the refined serif headings elsewhere — a compact
`.btn-ghost`-style button matches the rest of the site better.

### D10. The map block is a white slab on a dark page
`/contact` embeds the OpenStreetMap iframe directly — a ~450px bright-white rectangle on the
dark theme (measurement: it dominates the right column) and a ~100px stripped strip on mobile
with nothing but "Ouvrir dans Google Maps" under it. *Fix:* `filter: invert(1) hue-rotate(180deg)`
(or a `prefers-color-scheme`-aware static map image) so the embed matches the theme.

### D11. Near-duplicate catalogue entries
The first page of `/collection` contains both **"Greenly"** (Woody Aromatic) and **"Greenley"**
(Woody Fresh) — same house, same price, same 75ml/125ml tiers, different spelling and image;
and four "Delina" variants. Prices repeat verbatim across unrelated houses (259.99/309.99 dt on
Layton, Haltane, Greenly, Sedley…), which reads as placeholder data. *Fix:* de-duplicate slugs
and vary prices, or mark the catalogue as demo data before it goes live.

### D12. The "concentrations" ladder is filler
On the PDP (`d1440-night-pdp-image-s2`) the section lists `Top Quality` / "High-quality
alternative", then `Identical Quality` twice — the second with **no description at all**.
*Fix:* drop the section, or source real concentration/EDT-EDP-Parfum data per product.

### D13. Thin pages overall
`/news` carries 2 items and a large empty gap; `/cart` and `/favorites` empty states are
single enormous cards (~500px) with a button; `/guides`, `/loyalty`, `/admin`, `/profile`
carry almost no content. This is the "content depth" item already in
`docs/smooth-web-gap-analysis-2026-10-13.md` Part 5 — the audit confirms it is the main reason
the site feels unfinished.

---

## P3 — hygiene

| # | Defect | Where | Fix |
|---|--------|-------|-----|
| D14 | 190 `<img>` with no `width`/`height` attributes → CLS risk (`/layton.png`, `/haltane.png`, `/pegasus.png`, `/GREENLEY.png`, `/hero-bg-night.jpg`, 4 `fimgs.net` URLs) | every list/PDP/hero | add intrinsic dims (or `aspect-ratio` in CSS + `width`/`height` attrs) |
| D15 | Auth page `input` hard-codes `rgb(255,255,255)` (night) / `rgb(0,0,0)` (light) — off palette, 1 per viewport | `pages/auth.css` | `color: var(--text-1)` |
| D16 | Unvalidated `?family=` leaks into the H1: `/collection?family=__none__` renders **"COLLECTION / __none__"** | `pages/Collection.jsx` | fall back to the label of the matching `<option>`, else the generic title |
| D17 | Textarea character counter shows a bare `1000` with no label | `pages/contact.css` | "1000 caractères max" |
| D18 | 741 tap targets under 24px, mostly 19-23px-high `<a>`/`<input>` in the tools row and grid | `chrome.css`, `collection.css` | raise `min-height` to 24px (WCAG 2.2 AA) |
| D19 | Mobile header carries 9 controls across two rows at 390px | `chrome.css` | collapse the tools row into an overflow menu on small viewports |

---

## Suggested order

1. **D1 + D2** (both P0, both are a handful of lines each, both are what a visitor sees first).
2. **D3** (dates + the dead unread badge — one parser, two symptoms).
3. **D5 + D6 + D7 + D8** — one "make the tokens real" pass: every literal `0.75rem` → `--step--1`,
   the `button { font: inherit }` reset, `.wrap` gutter snapped to the scale, `h3` clamped to two
   lines. After this the audit's measurable defect count drops from 148/page on `/collection`
   to single digits.
4. **D4** (query-string wiring) and **D9–D13** (content), which are product decisions more than
   CSS fixes.
5. **D14–D19** as a hygiene sweep.

Re-run after each step: `node _recon/design-audit-2026-10-13/atom-matrix.cjs` and
`node _recon/design-audit-2026-10-13/digest.cjs`. Note the two invariants that still hold from
the motion work: Playwright screenshots need `animations: "allow"` to catch a transition, and
`/app` has no `vercel.json`, so deep links 404 on Vercel — keep Express's SPA fallback in place.
