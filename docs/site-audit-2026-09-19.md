# Charme — front-end audit (19 Sep 2026)

Scope: everything that ships in `public/` — 128 CSS files (5.03 MB), one HTML
page (3.6 MB), plus a real Chromium pass on the live site at 375 / 768 / 1440 px.

---

## 1. Headline numbers

| metric | value | healthy |
|---|---|---|
| CSS shipped | **5.03 MB** across 128 files | < 200 KB |
| HTML page | **3.68 MB**, 30,987 `<div>` | < 100 KB |
| Bytes per page load | **5.2 MB** mobile / **9.0 MB** tablet / **6.0 MB** desktop | < 2 MB |
| DOM elements at runtime | **72,000–73,000** | < 1,500 |
| `<img>` at runtime | **3,231–3,453** | — |
| `!important` declarations | **83,805** | 0–20 |
| Distinct colours in CSS | **2,852** | < 40 |
| Media-query breakpoints | **17** (400, 480, 620, 640, 641, 720, 760, 768, 900, 960, 992, 1020, 1024, 1180, 1280, 1320, 1400) | 3–4 |
| `<h1>` elements | **187** | 1 |
| Live text under 11 px | **2,810–5,815** elements | 0 |

---

## 2. Fixed in this pass

All four changes were verified in real Chromium at 375 / 768 / 1440 px:
**no horizontal overflow, 0 console errors, 10 stylesheets loading.**

**1. Removed 2 redundant render-blocking font requests** (`public/index.html`).
Lines 87–88 re-requested Inter (400–600) and Plus Jakarta Sans (400–700), both
already inside the async bundle at line 15. Being render-blocking, they
cancelled out the `media="print" onload="this.media='all'"` optimisation.

**2. Remapped 3 font families that were never loaded** (`combined-profiles.css`).
23 declarations: `'Space Grotesk', sans-serif` → `'Plus Jakarta Sans'`,
`'Libre Baskerville', serif` → `'Playfair Display'`,
`'Montserrat', sans-serif` → `'DM Sans'`. Each keeps its intended role (sans vs
serif) and now resolves to a family that actually ships.

**3. Rebuilt the heading hierarchy** — **187 `<h1>` → 1**.
All 186 `<h1 class="brand-name">` fragrance-card titles became `<h3>`, and
`<h2 class="perfume-grid-title">All Fragrances</h2>` became the single page
`<h1>`; the AI-finder's `<h1 class="sp-title">` became `<h2>`.
Visually identical — every `h1` rule in `styles.css` also lists h2–h6, and both
components are styled by class. Confirmed: brand name still computes to
13px Playfair Display, grid title still 30px → 46px across breakpoints.

**4. Raised unreadable text.** Every `font-size` below 9px is gone from the CSS
(was 6px, 6.5px, 7px, 8px, 8.5px — 16 declarations across `styles.css` and
`combined-profiles.css`); they now sit at 9–10px. Sub-11px text remains (2,810
at tablet) but that is a deliberate micro-label style and needs a design pass,
not a mechanical bump.

**Also removed 2.08 MB of dead files** — the 117 `*-profile.css` sources
(verified: all 117 are contained in `combined-profiles.css`), plus
`favorites_theme.css`, `fragrance-results.css`, `fragrance-results-extra.css`,
`fragrance-results.js` and `pegasus-profile.js` (0 bytes). None were referenced
by any HTML, JS or the server.

---

## 3. Confirmed bugs

### 3.1 Three font families are declared but never loaded
`Space Grotesk` (22 declarations), `Libre Baskerville` (16) and `Montserrat` (8)
are referenced in `combined-profiles.css`, but the Google Fonts request only
loads Inter, DM Sans, Playfair Display, Cormorant Garamond, Cinzel and Plus
Jakarta Sans. Those rules silently fall back to a system font — the fragrance
profile widgets do not render in the typeface the CSS asked for.

Fix is a decision, not a mechanical edit: either add the three families to the
font request (more weight) or remap those rules onto the existing stack.

### 3.2 Two families are loaded but barely used
`Cinzel` is requested in the bundle and used **once**. `Plus Jakarta Sans` is
requested twice (see §2).

### 3.3 Text far too small to read
Live DOM has **2,810–5,815 elements below 11 px**; the smallest declarations in
`styles.css` are `6px`, `6.5px`, `7px`, `8px`, `8.5px` (lines 1473, 2340, 3826,
3888, 4230, 5757, 13416, 17208). On a 375 px phone this is unreadable.

Not changed blindly: most of this text sits inside fixed-size badges where
enlarging it can break the box. Needs a design pass.

### 3.4 187 `<h1>` elements
Confirmed live, not just in source. Screen readers and search engines see a page
with no structure. Should be one `<h1>`, with the fragrance titles as `<h2>`/`<h3>`.

### 3.5 Dead CSS with malformed values
`public/css/favorites_theme.css` contains `rgba(var(--selector-accent-rgb), )` —
the alpha argument is empty, so the declaration is invalid. The file is never
loaded, so nothing is visibly broken today, but it is a trap for whoever next
wires it up.

### 3.6 Thirteen CSS custom properties are used but never defined
`--selector-accent-rgb`, `--foreground`, `--muted-foreground`, `--border`,
`--card`, `--font-heading`, `--font-mono`, `--destructive`, `--delay`,
`--category-color`, `--vignette-intensity`, `--fill-width`,
`--profile-progress-angle`.

Twelve have fallbacks, so they degrade rather than break — but the fallbacks are
generic shadcn greys (`#1f2937`, `#3f3f46`, `#e5e7eb`) that clash with the navy
and gold palette. `--selector-accent-rgb` has no fallback at all (52 uses), but
only inside the three dead files, so there is no live impact.

---

## 4. Structural problems (the "AI slop" list)

- **117 near-duplicate profile stylesheets** (`*-profile.css`, 2.08 MB) all
  concatenated into `combined-profiles.css` (2.19 MB), which is downloaded on
  every page. Each is ~18 KB and ~119 selectors for what is one component
  repeated per fragrance. Should be **one** component stylesheet plus a
  per-fragrance accent custom property — roughly 2.19 MB → ~20 KB.
- **83,805 `!important`.** 39,598 of them in `combined-profiles.css`. Specificity
  has been abandoned; nothing can be overridden without another `!important`.
- **2,852 distinct colours.** The brand gold is `#c9a24b`, but the CSS also uses
  `#d4b868` (236×), `#d4a574` (124×), `#d4a843`, `#b8860b`, `#8b6914`, `#cd950c`
  and more. No single source of truth.
- **17 breakpoints**, including both `760` and `768`, and both `640` and `641`.
- **z-index escalation to `100009`** (also 100003, 10000, 9999). Someone kept
  adding digits to win a stacking war.
- **`Comic Sans MS` in `.doodle-wrapper`** (`styles.css:27654`). It sits next to
  hand-drawn `--sketch-radius-*` variables, so it is deliberate — but Comic Sans
  on a luxury perfume site is a taste call worth revisiting.
- **1,684 inline `style=""` attributes** and 75 distinct hex colours inside them.
- **2.08 MB of provably dead files** still in the repo and in every deploy:
  the 117 `*-profile.css` sources, `favorites_theme.css`,
  `fragrance-results.css`, `fragrance-results-extra.css`,
  `fragrance-results.js`, `pegasus-profile.js` (0 bytes).

---

## 5. What I checked and found **healthy** — no false alarms

- **No horizontal overflow** at 375, 768 or 1440 px. `scrollWidth` equals
  viewport width in all three. Despite 250 fixed-px width declarations in the
  CSS, nothing currently breaks out.
- **Zero console errors** on the live site at all three widths.
- **Zero failed requests, zero broken images** (`naturalWidth === 0` count: 0).
- **No duplicate `id` attributes** (3,162 ids checked).
- **No missing `alt` attributes** on 394 static images.
- The two identical Google Fonts `<link>` tags in `<head>` are **not** a
  duplicate bug — they are the standard async-load pattern plus its
  `<noscript>` fallback.
- The inline `onload=` / `onclick=` handlers are **not** CSP violations:
  `server.js` sets `scriptSrcAttr: ["'self'", "'unsafe-inline'"]`.
- `<html lang="fr">`, viewport meta and theme-color are all present. `<div>`
  open/close tags balance exactly (30,987 / 30,987).

---

## 6. Recommended order of work

| # | change | risk | payoff |
|---|---|---|---|
| 1 | Collapse 117 profile sheets → 1 component + accent variable | medium | −2.1 MB, kills 39k `!important` |
| 2 | Render fragrance profiles from JSON instead of inlining | high | −3 MB HTML, −70k DOM nodes |
| 3 | Colour tokens (one gold, one navy, one ink ramp) | medium | consistency |
| ~~4~~ | ~~Fix heading hierarchy (187 `<h1>` → 1)~~ | — | **done** |
| ~~6~~ | ~~Delete the 2.08 MB of dead files~~ | — | **done** |
| ~~9~~ | ~~Remap the 3 missing font families~~ | — | **done** |
| 5 | Finish raising sub-11 px text (2,810 elements at tablet) | low-med | readability |
| 7 | Consolidate 17 breakpoints → 4 | medium | predictable responsive |
| 8 | Rebuild z-index scale | low | no more stacking wars |

Items 1, 2 and 3 (collapse the profile CSS, render cards from JSON, unify the
colour tokens) are taste-level craft — worth doing on a premium model with a
tight spec, not as a mechanical sweep. Item 5 needs a design pass because that
text sits inside fixed-size badges. Items 7 and 8 are mechanical.

---

## 7. How this was measured

Scripts used (since deleted): `_audit_css.cjs`, `_audit_html.cjs`,
`_audit_browser.cjs`, `_audit_local.cjs`. The CSS/HTML passes are static and
deterministic; the layout and error figures come from real Chromium via
Playwright against the live URL, then re-checked against a local static server
after the edit.
