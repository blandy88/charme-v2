# Charme — Legacy → React Migration Plan (parity-first)

**Goal:** migrate the hand-written legacy storefront into the existing Vite + React app with
**zero visual and behavioural change** — a 1:1 port, not a redesign.

**Correction (2026-10-06):** the older 183-section report was wrong because its lowercase-only
matcher missed the case-sensitive identifiers `kbyDG` and `grandSoir`. **185 section wrappers and
186 product-name elements are verified by real Chromium.** The corrected inventory below supersedes
those older recon counts; no new tests are claimed here.

**Status (2026-10-07):** Gates A, B and D are **done and evidenced**. React section roots now
author `public/index.html` — the pipeline rebuilds the live document byte-for-byte
(SHA-256 `c807eec2…207e8b`, 3,798,060 bytes, `git diff` empty), and a 10-case real-Chromium
comparison is identical on DOM attributes, visible text, computed styles, `/api/*` traffic,
section counts and zero page exceptions. The only residual is a 13-pixel / ±1-channel anti-alias
difference in one region that **also occurs between two captures of the legacy page itself**
(proven by a baseline-vs-baseline control). Full evidence, including what is *not* covered:
**`docs/legacy-react-parity-report.md`**.

All legacy JavaScript still owns runtime DOM behaviour; this is not a completed runtime migration.
Byte-identical static rendering does **not** guarantee safe hydration; no whole-document hydration
is permitted while legacy JavaScript mutates the DOM. No performance, security or layout changes
are authorized, and spacers must be preserved.

**How to read this:** §0 is the decision. §1 is the evidence. §2 is the contract that defines
"identical". §3–4 are the architecture. §5 is how we *prove* parity. §6 is the order of work.
§7 is the extraction spec. §8–10 are risks and open questions. The appendices are reference.

---

## 0. Verdict in one page

### 0.1 What is actually there

The "legacy site" is not a website with a big page in it. It is **one 3.7 MB HTML document dominated
by repeated product markup**, plus a 2.9 MB CSS estate, a 862 KB behaviour script, and 1.8 MB of
companion JS. Measured:

| Thing | Size / count |
| --- | --- |
| `public/index.html` | 3,798,060 bytes · 29,372 lines · 30,987 `<div>` · 3,162 ids · 8,098 class tokens |
| Of which: 185 product sections | **3,517,770 UTF-8 bytes** of raw blocks; **3,517,954 UTF-8 bytes** rendered with 184 separating newline bytes. Previous JS metric: **3,424.4 KB / 92.6% by character count**, not bytes |
| Of which: 114 empty spacers | `*-transition-section`, 200 px, zero content |
| Of which: 28 chrome blocks | navbar, hero, 22 modals, footer, 5 overlays |
| `public/styles.css` | 739 KB · 28,975 lines · 4,331 rules · **3,476 `!important`** · 1,627 `#id` selectors |
| `public/css/combined-profiles.css` | **2,137 KB** · 39,444 lines · 15,005 rules · **39,598 `!important`** · 4,261 `#id` selectors |
| Other CSS (5 files) | 69 KB |
| `public/script.js` | 862 KB · 22,934 lines · 357 functions · 531 `getElementById` · 84 `innerHTML =` |
| `public/js/` (14 files) | 1,755 KB (catalogue data 493 KB, i18n 165 KB, three.js 636 KB, …) |
| Backend | `server.js` 164 KB · **59 `/api/*` routes** (GET 21, POST 25, PUT 6, DELETE 7) |

### 0.2 The three findings that decide this plan

**Finding 1 — the homepage content is not in the catalogue, and the catalogue is not in the
homepage.** There are two parallel product representations:

- 185 hand-authored `<section>` blocks in `index.html`, each with its own radar chart, note
  pyramid, Reddit review card, mood indicators, quality tiers and price badge.
- A 752-item `FRAGRANCE_CATALOGUE_DATA` (`public/js/fragrance-catalog-data.js` → `public/data/fragrances.json`),
  rendered at runtime into `#perfumeGrid` and used by search / AI finder / grid mode.

They barely overlap: **18 of 185 section slugs** exist in the catalogue, and **81 of 186 product
names** match. `frontend/`'s current virtual `virtual:catalogue` module reads the 752-item file.
**Therefore: if the React homepage renders from `fragrances.json`, 167 of 185 product blocks change
or vanish.** Any plan that starts with "use the existing catalogue" fails the 100% requirement on
day one. The homepage's content must be *extracted from the HTML*, not from the JSON.

**Finding 2 — the repetition is real: 5 first40 fingerprint groups.** Of 185 sections,
**181 fall into the two standard first40 groups** (115 with per-product class prefixes, 66 sharing
the `elves-` prefix); 2 are bespoke (`Layton`, `Pegasus`), 1 is `onemillionnight`, and 1 is
`xerjoff40knots`. Themes: **117 distinct non-null themes; `elves` covers 67 sections.** Only
`Layton` and `Pegasus` have null themes; the older 118 count incorrectly included null as a theme.
`Haltane` is an embedded div inside `Layton`, not a standalone section; `Layton` contains two
product-name elements. The data-driven win is genuine, and the exception list is enumerable.

**Finding 3 — identity is enforced by CSS and ids, not by components.** 5,888 `#id` selectors and
43,074 `!important` declarations mean the visual result is pinned to **exact ids and exact class
names**. A React port that "renders the same thing semantically" with cleaner class names will look
different. The contract is: same ids, same classes, same stylesheets, same order.

### 0.3 The recommended route

**Verbatim Strangler with a Parity Gate.** Five gates, each independently revertible:

| Gate | Deliverable | Identity risk |
| --- | --- | --- |
| **A — Freeze & measure** | Parity harness + baseline captures of today's site | none (read-only) |
| **B — Extract** | 185 sections → one fixture file, proven equal to the DOM | none (new files only) |
| **C — Islands** | Historical future runtime proposal: React mounts into exclusively owned legacy nodes (nav, modals, reviews); not part of the current build-time stage | requires separate parity gates |
| **D — Prerender** | Build-time React section roots emit static HTML byte-identical to legacy markup; all legacy JS and spacers remain | gated; no runtime ownership transfer |
| **E — Retire** | Historical future runtime proposal: retire behaviour only after exclusive React ownership is proven; no deletions authorized now | not authorized by static-render parity |

**What we will not do:** rewrite the visual layer. The 2.9 MB of CSS is imported verbatim. The
i18n engine (a runtime DOM text-substitution walker) is kept verbatim, not ported. Tailwind is
**not** applied to legacy surfaces.

### 0.4 Why not "React owns the root" on day one

Because GitHub Pages is static-only, there is no request-time SSR on the primary host. A client-only
React root with an empty HTML shell would build **the entire 31,000-node document with JavaScript
after first paint**. Build-time static rendering does not require such a shell. Client-only rendering
would:

1. change first paint (blank screen where the preloader used to be),
2. break the preloader's progress logic — the inline script at `index.html:212-305` measures
   `performance.getEntriesByType("resource")` and lifts the curtain on `window.load`; with a
   client-rendered document those resources do not exist at `load`,
3. make the ~170 `.bottle-render` builds and the `bottleRendersReady` event fire into an empty page.

So the *document* must stay pre-rendered. The ongoing implementation uses build-time React section
roots and `renderToStaticMarkup` to retain byte-identical static output and all legacy JS. Runtime
DOM behaviour remains legacy-owned; static-render parity is not a hydration guarantee.

### 0.5 Sizing shape

Relative sizing only (S/M/L/XL), because the gate criteria matter more than dates:

| Phase | Size | Notes |
| --- | --- | --- |
| 0 — Harness | M | Once built, it guards every later phase |
| 1 — Extraction | L | Mechanical; scriptable; fully verifiable |
| 2 — Shell / islands | M | Low risk, high visible value |
| 3 — Product component | XL | The bulk of the work; 185 blocks, 5 shapes |
| 4 — Modals | L | 22 modals, 8 admin-only |
| 5 — Behaviours | XL | Cart, favourites, reviews, auth, admin — the real risk |
| 6 — Prerender + retire | L | Byte-diff gates static rendering only; runtime retirement is a separate future proposal |

---

## 1. Ground truth

### 1.1 Files

| Path | Bytes | Lines | Role |
| --- | --- | --- | --- |
| `public/index.html` | 3,798,060 | 29,372 | The entire storefront |
| `public/styles.css` | 757,170 | 28,975 | Main stylesheet (render-blocking) |
| `public/css/combined-profiles.css` | ~2,187,800 | 39,444 | Per-product profiles (non-blocking) |
| `public/css/charme-signin.css` | 17,900 | 659 | Sign-in UI |
| `public/css/auth-modal.css` | 16,900 | 542 | Auth modal |
| `public/css/guides.css` | 16,400 | 674 | Guides; **the only real RTL rules** (≈637-645) |
| `public/css/fragrance-layout-normalize.css` | 13,400 | 409 | Normalize (render-blocking) |
| `public/css/loader.css` | 5,900 | 221 | Preloader |
| `public/script.js` | 862,208 | 22,934 | All behaviour |
| `public/js/fragrance-catalog-data.js` | 505,400 | — | 752-item catalogue (client-side) |
| `public/js/i18n.js` | 172,000 | 2,496 | Text-substitution engine |
| `public/js/i18n-dict.js` | 99,000 | 1,706 | FR/AR dictionaries |
| `public/js/guides.js` | 128,400 | — | Guides feature (has a **parallel i18n**) |
| `public/js/three.min.js` | 651,600 | — | three.js (bottle renders) |
| `public/js/fragrance-api-service.js` | 79,600 | — | API wrapper |
| `public/js/note-image-resolver.js` | 40,600 | — | Note image hydration |
| `public/js/ingredient-finder.js` | 34,700 | — | Ingredient search |
| `public/js/ai-fragrance-finder.js` | 24,400 | — | AI finder (pure client-side) |
| `public/js/cp-trait-icons.js` | 18,100 | — | Trait icons |
| `public/js/fragrantica-urls.js` | 14,700 | — | Fragrantica link map |
| `public/js/bmi-calculator.js` | 21,900 | — | Unreferenced from index.html |
| `public/js/fragrance-api-service-clean.js` | 6,200 | — | Duplicate of the above? verify |
| `public/js/smooth-scroll.js` | 300 | — | Anchor smoothing |
| `server.js` | 164,000 | 4,915 | Express + Postgres + 59 API routes |

### 1.2 What the document loads

**Scripts — 12 external, all `defer`, 0 render-blocking.** Execution order == document order:

1. `js/fragrance-api-service.js` · 2. `js/ai-fragrance-finder.js` · 3. `js/note-image-resolver.js` ·
4. `js/ingredient-finder.js` · 5. `js/smooth-scroll.js` · 6. `js/fragrance-catalog-data.js` ·
7. `js/i18n-dict.js` · 8. `js/i18n.js` · 9. `js/guides.js` · 10. `js/fragrantica-urls.js` ·
11. `js/cp-trait-icons.js` · 12. `script.js` ← last, depends on 1–11.

**Inline scripts — 5, always parser-blocking, 11.8 KB total:**

| Line | What it does | Why it matters |
| --- | --- | --- |
| 179-189 | Reads `localStorage["charme-theme"]`, defaults `night`, sets `<html data-theme>` | **must run before first paint** or the page flashes the wrong theme |
| 212-305 | `#brandLoader` curtain: 180 ms `setInterval` measuring `performance.getEntriesByType("resource")`, `finish()` on `window.load`, failsafes at 20 s / 21.6 s | breaks under client-side rendering |
| 438-497 | `#themeToggle`: flips `data-theme` light/night, persists, calls `updateScrollBackgroundAndTheme()`, listens to `storage` for cross-tab | |
| 4051-4076 | Password show/hide for `#loginPassword` / `#signupPassword` | |
| 29053-29122 | **Quality selector**: reads `input[name="quality"]`, animates `.price-badge` / `.price-currency`, `animatePrice()` rAF counter 800–1200 ms writing `priceNumber.textContent` | the price animation users see on every product |

**Stylesheets — 8 in the parsed tree, 6 render-blocking:**

| # | Path | Trick | Blocking |
| --- | --- | --- | --- |
| 1 | Google Fonts (6 families) | `media="print" onload` | no |
| 2 | `styles.css?v=20260909e` | — | **yes** |
| 3 | `css/fragrance-layout-normalize.css` | — | **yes** |
| 4 | `css/guides.css` | — | **yes** |
| 5 | `css/combined-profiles.css` | `media="print" onload` | no |
| 6 | `css/auth-modal.css` | — | **yes** |
| 7 | `css/charme-signin.css` | — | **yes** |
| 8 | `css/loader.css` | — | **yes** |

Plus 1 `<noscript>` fallback, 2 icons, 3 `preconnect`, 1 inline `<style>` (4.7 KB at line 29208).

### 1.3 The document, block by block

327 top-level blocks:

| Bucket | Count | Notes |
| --- | --- | --- |
| Product sections | **185** | `<section class="content <classSlug>-section" id="<slug>">`; classSlug differs from ID in two wrappers |
| Empty spacers | **114** | `*-transition-section`, 200 px, no content (+2 `white-transition-section`) |
| Chrome / features | **28** | navbar, hero, 22 modals, footer, 5 overlays |
| Preloader | 1 | `#brandLoader` |

Document order:

1. `193-4048` — preloader, navbar, then 22 modal/overlay `<div>`s (search, ingredient finder,
   profile, photo editor, favourites, settings, cart, verification, admin dashboard, guest notes,
   news composer, loyalty, ban user, loyalty edit, customer profile, record purchase, auth).
2. `4078-13263` — `div.container`: hero (4079) + 82 product sections + trailing spacer.
3. `13264-28885` — 216 top-level sections: alternating spacers and product sections.
4. `28886-29128` — floating menu, social rail, footer, back-to-top, perfume-mode toggle, vignette,
   news modal.

### 1.4 Product sections — 185 wrappers, 186 product-name elements

Anatomy of one block (`aventusabsolu`, line 4277, 12.9 KB):

```
<section class="content aventusabsolu-section" id="aventusabsolu">
  <div class="elves-main-container elves-theme">      ← theme prefix, NOT the slug
    <div class="perfume-top-row">
      <div class="elves-product-section">
        <img class="elves-image" src="https://fimgs.net/...">
        <div class="product-info-section">
          <div class="product-header-row">
            <div class="product-info">
              <h3 class="brand-name">Creed</h3>
              <h2 class="brand-location">PARIS</h2>
              <h3 class="product-name">Aventus Absolu</h3>
          <div class="product-price-container"><div class="price-badge">…ornaments…</div>
          <div class="product-actions-buttons">
            <button class="favorite-btn" data-product="aventusabsolu" id="aventusabsoluFavoriteBtn">
            <div class="quality-selector-container">…quality options…</div>
      <div class="elves-profiles-container">
        <div class="elves-profile-card">… Scent Profile + radar …</div>
        <div class="elves-profile-card">… Ingredients / note pyramid …</div>
      <div class="elves-fragrance-description">… Performance metrics …</div>
      <div class="elves-reddit-review-container">… Reddit card …</div>
      <div class="elves-perfume-rating">… mood indicators …</div>
      <div class="reviews-section" id="aventusabsolu-reviews">… reviews …</div>
```

**Key structural facts**

- The `-main-container` / `-theme` prefix is the **theme name**, not necessarily the section slug.
  67 sections share the whole `elves-*` class vocabulary. Preserve identifier case exactly.
- **117 distinct non-null themes** across 185 sections; `elves` = 67. Only `Layton` and `Pegasus`
  have null themes (bespoke, with `--layton-*` / `--pegasus-*` custom properties). Null is not a theme.
- `Haltane` is an **embedded div inside `Layton`** (`haltane-section-container`, 1 occurrence),
  not another section wrapper. `Layton` contains two product-name elements.
- **5 first40 fingerprint groups**: 115 + 66 (standard shape, different prefix) + 2 bespoke +
  1 `onemillionnight` + 1 `xerjoff40knots` = **185**.
- Two classSlug → section-ID mismatches: `onemillionnight` → `1millionnight` and
  `xerjoff40knots` → `40knots`. IDs inside those blocks use **classSlug**, not the section ID.
  Preserve extracted IDs rather than deriving every ID from the section slug.
- Counts below refer to section-root products; embedded `Haltane` is additional. Own-slug review
  counts exclude the two classSlug/ID mismatches:

| Id shape | Count |
| --- | --- |
| `<slug>` (the section) | 185 |
| `<classSlug>FavoriteBtn` | 185 |
| `<classSlug>CartBtn` | 185 |
| `<slug>-reviews` (own section-ID slug) | 183; 185 root reviews including classSlug matches |
| `<slug>-reviews-list` / `-reviews-count` / `-add-review` / `-review-avatar` / `-review-username` / `-star-rating` / `-review-text` / `-submit-review` / `-load-more-btn` (own section-ID slug) | 183 each; preserve classSlug IDs in the two mismatched blocks |
| `<classSlug>-edp-quality` | 177 |
| `<classSlug>-edt-quality` | 166 |
| `<slug>-char-count` / `-cancel-review` / `-signin-prompt` / `-load-more` | 22 each |
| `<slug>-parfum-quality` | 11 |
| `<slug>-top-quality` / `<slug>-identical-quality` | 6 each |
| `<slug>-details` | 2 |

  **All 186 products have reviews**, including `Layton`, `Pegasus` and embedded `Haltane`.
  The two wrappers without own-section-ID-slug reviews are `1millionnight` and `40knots`; their
  reviews exist under the theme/classSlug IDs `onemillionnight-reviews` and `xerjoff40knots-reviews`.
  Root-product tiers are **edp 177, edt 166, parfum 11, top 6, identical 6**; embedded `Haltane`
  is additional. Tiers are not uniform, so the fixture must preserve each product's actual tiers.

**Media inside blocks**

- 206 inline `data:image/…` URIs, but only ~0.01 MB of base64 total → tiny placeholders, low risk.
- 187 remote product shots from `fimgs.net` (no local copies, no fallback).
- 1 `<iframe>` — the OpenStreetMap store map in the hero.

### 1.5 CSS estate

| File | KB | Rules | `@media` | `@keyframes` | `!important` | `#id` | `.class` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `styles.css` | 739 | 4,331 | 84 | 94 | 3,476 | 1,627 | 5,815 |
| `combined-profiles.css` | 2,137 | 15,005 | 242 | 216 | 39,598 | 4,261 | 22,949 |
| `charme-signin.css` | 17.5 | 94 | 1 | 0 | 352 | 86 | 105 |
| `auth-modal.css` | 16.5 | 71 | 1 | 3 | 300 | 48 | 124 |
| `guides.css` | 16.0 | 103 | 3 | 3 | 2 | 46 | 104 |
| `fragrance-layout-normalize.css` | 13.1 | 45 | 3 | 0 | 195 | 0 | 175 |
| `loader.css` | 5.8 | 31 | 1 | 5 | 47 | 5 | 27 |
| **Total** | **≈2,945** | **19,680** | **335** | **321** | **43,974** | **6,073** | **29,399** |

- The older JS character-count estimate puts `combined-profiles.css` at **29.4% per-product
  `*-theme` rules** (627 KB by character count, not UTF-8 bytes); the rest is the profile-card /
  radar / note-pyramid / reddit-card / rating vocabulary shared by all sections.
- `combined-profiles.css` defines **117 actual themes**, including `kbyDG` and `grandSoir`, matching
  the **117 distinct non-null section themes**. Themes also present in `styles.css` are not additive
  distinct themes. Every actual section theme has a definition; null for `Layton` and `Pegasus` is
  not a theme and does not require authoring.
- Breakpoints in use: `400, 480, 620, 640, 641, 720, 760, 768, 900, 960, 992, 1020, 1024, 1180,
  1280, 1320, 1400` px.
- 92 custom properties in 3 `:root` blocks: a full design system (`--color-gold`, `--space-*`,
  `--z-*`, `--shadow-*`, `--transition-*`) plus per-product sets (`--layton-*`, `--haltane-*`,
  `--pegasus-*`, `--quality-*`, `--nav-*`).
- Class-driven theming hooks: `body.top-shell-scrolled`, `body.top-shell-hidden`,
  `body.top-shell-interacting`, `body.fragrance-detail-open`, `body.perfume-grid-mode`,
  `.perfume-mode` (24), `[data-theme]` (676), `.theme-*` (34).
- **Fonts (5 families in use):** `Playfair Display` (336× + 23×), `DM Sans` (60 + 31 + 28 + 17),
  `Cormorant Garamond` (27 + 22 + 7 + 6 + 5), `Inter` (11 + 6), `Plus Jakarta Sans` (11 + 8).
- **0 `[dir="rtl"]` selectors in `styles.css`.** RTL lives only in `guides.css:637-645` plus
  `dir` / `lang-rtl` / `lang-ltr` classes applied by `i18n.js`.

### 1.6 i18n

Not key-based. It is a **runtime DOM text-substitution engine**:

- `i18n.js` TreeWalks every text node under `document.body`, uses the **whitespace-collapsed
  English text as the key**, mutates `node.nodeValue`, and caches the pristine English in a
  `WeakMap` so languages can be flipped back and forth (`i18n.js:2250`, `:2369`).
- Dictionaries: **FR 1,929 entries, AR 1,191 entries**; English is the source text in the HTML.
  99 AR keys lack FR; 837 FR keys lack AR; 388 protected terms never translate.
- ~29 regex "sentence generators" build phrases (counts, time-ago, ratings, "was launched in …",
  "Top notes are …", bullet lists, `X & Y`, `Word:`).
- Runtime switch: `script.js:2908` → `I18N.applyLanguage()` → **in-place mutation, no re-render**.
  A `MutationObserver` (`i18n.js:2444`, `childList+subtree` on `body`, 150 ms debounce) re-runs the
  walk when script.js rebuilds DOM — this is what catches the 84 `innerHTML` renders.
- Persistence: `localStorage["site-lang"]` = bare `"en" | "fr" | "ar"`. **Default is `fr`**, and
  `<html lang="fr">` is hardcoded.
- RTL: sets `dir` + `lang-rtl`/`lang-ltr` classes only. No stylesheet swap.
- **Public API exists for future runtime islands:** `window.I18N = { t, applyLanguage, … }`
  (`i18n.js:2483`). A future runtime React port could call `I18N.t(text)` at render time.
  The current build-time stage retains source text and the unchanged legacy runtime translation
  walker; it does not call the browser's `window.I18N` at build time.
- `guides.js` contains a **second, parallel i18n implementation** — verify it does not fight the
  main one.

### 1.7 JavaScript runtime

| Metric | Value |
| --- | --- |
| Lines / size | 22,934 / 862 KB |
| `function` declarations | 357 |
| `addEventListener` | 255 (click 159, keydown 21, DOMContentLoaded 16, input 16, change 7, mouseleave 6, scroll 5, submit 4, resize 3, custom `bottleRendersReady` 2) |
| `getElementById` | 531 |
| `querySelector(All)` | 254 |
| `fetch(` | 67 (46 distinct `/api/*`) |
| `localStorage` refs | 191 |
| `innerHTML =` | 84 |
| `document.createElement` | 127 |
| `IntersectionObserver` | 2 (1 live: lazy reviews) |
| `MutationObserver` | 4 |
| `requestAnimationFrame` | 30 |
| `setTimeout` / `setInterval` | 114 / 4 |
| `window.x =` globals | 126 |
| `document.write` | **0** |
| `location.hash` reads | **0** — all navigation is `scrollIntoView` |

**There is no `boot()`.** Startup is: 2 parse-time side effects + 9 constructors that run at
script-evaluation time + 16 `DOMContentLoaded` listeners (in registration order) + 5 inline HTML
scripts.

Parse-time side effects that must be preserved:

- `script.js:7-20` computes `window.CHARME_API_ORIGIN` (localhost / `*.onrender.com` /
  `*.vercel.app` → same origin; otherwise hard-codes `https://parfumerie-charme.onrender.com`).
- `script.js:21-33` **monkey-patches `window.fetch`** so relative `/api/…` and `/uploads/…` are
  rewritten to that origin. Any React data layer must honour this or every call breaks when the
  front end is served off-origin.

Eval-time singletons (state lives here, not in the DOM):
`authStateManager` (`:10190`), `favoritesManager` (`:14372`), `userStatsManager` (`:15043`),
`newsManager` (`:15065`), `reviewsManager` (`:15070`), `themeManager` (`:16604`), `cartManager`
(created in DCL #7, `:15004`), `ingredientFinder` (DCL #11, `:17739`).

Ordering constraints that must survive (from `_recon/scriptjs.md` §1.5):

1. `charme-theme` applied to `<html>` **before paint**.
2. `window.fetch` patched before the first `fetch()`.
3. `favoritesManager` must exist before `updateUIForLoggedInUser` runs.
4. `cartManager` is created **after** `checkAuthState`; the login path calls
   `switchUserCart(email)` behind a truthiness guard, so on a cold load the switch is **silently
   skipped** and the key is resolved at construction. Reproduce this or carts get double-switched
   and the guest cart is lost on refresh.
5. The perfume-mode IIFE reads storage at `public/script.js:22427-22429`; **absent storage defaults
   to grid, not details**. It defers `updateScrollBackgroundAndTheme` by `setTimeout(…, 0)`.
6. `bottleRendersReady` (`:22866`) is consumed by the grid builder — grid cards must be rebuilt
   after bottle renders land.

**Dead code — do not port:** heavy parallax is disabled (`:5334` empties the array, `:5350` says so)
and the scroll-driven per-section background is disabled (`getStaticBackgroundColor`, `:2559`).
`updateColors()` still runs once and sets text colours — that part is live.

**Live visual effects that must be reproduced:** theme cycling (`cycleTheme`, `forceBodyTheme`) —
essential; navbar hide/reveal — essential; back-to-top progress ring — essential; floating menu /
search / social rail — essential; `perfumeModeToggle` grid mode — essential, it changes the whole
layout; preloader — essential; vignette — cosmetic but visible. Reveal-on-scroll **does not exist**.
Smooth scroll is pure JS-free CSS/anchor behaviour.

**The single biggest port hazard:** 84 `innerHTML` templates with **inline `onclick`** pointing at
`window.cartManager.*` / `window.reviewsManager.*` / `window.*` globals. React will not bind these.
Full list of templates in `_recon/scriptjs.md` §9.1.

**Second hazard:** ids built at runtime that React must generate identically —
`#<productId>CartBtn`, `#<slug>-<tier>-quality` + `name="<slug>-quality"`, the 9 `#<slug>-review*`
ids, `#reply-form-<reviewId>`. Also `ensureSearchTargetId()` (`:615`) **mutates `element.id`** if a
section has none, so the search index depends on ids it invents.

**Third hazard:** `initializeFavoriteButtons` (`:13612`) **clones every `.favorite-btn`** to strip
listeners. Under React this destroys the React node. The port must own this behaviour instead.

**Fourth hazard:** `window._globalScrollTop` is written once per frame and read by ~10 consumers.
Multiple React `useEffect`s reading `window.scrollY` independently will see inconsistent values
within a frame.

### 1.8 Storage contract

Literal keys, all of which must keep their exact names and JSON shapes:

| Key | Written by | Shape |
| --- | --- | --- |
| `authToken` | login / verify | JWT string |
| `charme-theme` | inline `#themeToggle`, `script.js` | `"light"` \| `"night"` |
| `charme-perfume-mode` | mode IIFE | `"grid"` \| `"details"`; absent = **grid** (`public/script.js:22427-22429`) |
| `site-lang` | `i18n.js` | `"en"` \| `"fr"` \| `"ar"` |
| `parfumerie_cart_<email>` | `CartManager` | cart JSON |
| `perfumeFavorites_guest` | `FavoritesManager` | guest favourites |
| `userFavorites` | `FavoritesManager` | logged-in cache |
| `userProfile_<email>` | profile | profile JSON |
| `user_<email>` / `user` / `userData` / `userEmail` | auth | user record |
| `userSettings` | settings modal | settings JSON |
| `fragranceReviews` | `ReviewsManager` | reviews cache |
| `lastNewsCheck` | `NewsManager` | timestamp |
| `parfumerie_registered_gmail_users` | register | list |
| `uploadProtection` | photo editor | throttle state |

**Behavioural facts to preserve exactly:**

- **Cart does not merge on login.** `switchUserCart` (`:14450`) saves and swaps keys; the guest
  cart is abandoned.
- **Favourites *do* merge** (`:14282`).
- Currency is `dt` (Tunisian dinar). Prices come from hard tables at `script.js:36-39` plus a
  deterministic FNV hash for the "identical" tier.
- `apiFetchJson` (`:184-225`) is **single-flight**, keyed by `"METHOD path"` with optional
  `cacheMs`. Boot-time duplicate calls (news ×3, profile ×2, stats ×2) collapse to one request each.
  Dropping it triples boot request count and may trip rate limits.
- Console logging is enormous and deliberate; several `console.log`s sit in `finally` blocks that
  also clear state — do not delete surrounding lines blindly.

### 1.9 Backend

59 `/api/*` routes; no `router.*` objects, everything mounted on `app`. Auth middleware
`authenticateToken` (`server.js:1271`), `requireAdmin` (`server.js:2350`). Groups: auth (5),
profile/settings (5), favourites (4), reviews/likes/replies (12), notes (4), news (4), store hours
(3), loyalty (10), admin users/moderation (5), uploads (2), dev/debug (4), health (1).

**Pre-existing security defects — record them, do not fix them mid-migration:**

| Issue | Location |
| --- | --- |
| `POST /api/reviews/:reviewId/like` has **no** `authenticateToken`, while the near-identical `POST /api/reviews/like` does → likes can be forged | `server.js:3987` |
| `GET /api/search/users`, `GET /api/search/loyalty-profiles`, `GET /api/stats/users` missing `requireAdmin` | `:2461`, `:3309`, `:2375` |
| Three `/api/dev/*` routes are **public** and dump user records: `reset-rate-limit`, `debug-favorites/:userId`, `debug-user/:userId` | `:3723`, `:3729`, `:3756` |

These are behaviour changes if fixed. Identity says leave them; security says fix them. See §9.

---

## 2. The identity contract

This is the definition of "100% identical". Every item has a mechanical verification.

| # | Invariant | Verified by |
| --- | --- | --- |
| I1 | Same HTML document structure: same tag sequence, same nesting | Layer-2 DOM diff (§5.2) |
| I2 | Same `id` values on the same elements — all 3,162, globally unique | DOM diff + uniqueness assert |
| I3 | Same `class` values, including the theme prefix on the container | DOM diff |
| I4 | Same `data-*` attributes (`data-product`, `data-quality`, `data-rating`, `data-price`, `data-category`, `data-ingredient`, `data-audience`, …) | DOM diff |
| I5 | Same stylesheet set, in the same order, with the same blocking semantics | `<head>` diff + waterfall capture |
| I6 | Zero Tailwind preflight effect on legacy surfaces | Computed-style diff on `img`, `button`, `input`, `h1`-`h6`, `ul`, `p` |
| I7 | Same fonts, same stacks, same Google Fonts request | Computed `font-family` diff |
| I8 | Same theme boot: correct `data-theme` on `<html>` at first paint, no flash | Screenshot at 0 ms after `domcontentloaded` |
| I9 | Same preloader timing and exit animation | Frame captures 0–2,000 ms |
| I10 | Same default language (`fr`) and same translation of every visible string in EN/FR/AR | Per-locale text-node diff |
| I11 | Same RTL result in AR (dir + classes + guides.css rules) | Per-locale DOM diff + screenshot |
| I12 | Same price animation on quality change (tier → colour → count-up) | Recorded interaction diff |
| I13 | Same cart behaviour including the no-merge-on-login rule and `parfumerie_cart_<email>` keys | Storage diff + smoke test |
| I14 | Same favourites merge behaviour and animation classes | Smoke test |
| I15 | Same reviews rendering, likes, replies, admin crown badges | Smoke test |
| I16 | Same scroll behaviour: navbar hide/reveal, back-to-top ring, grid mode | Recorded scroll diff |
| I17 | Same API call sequence and count on boot (single-flight preserved) | Network log diff |
| I18 | Same responsive layout at every breakpoint in use | Screenshot diff at 17 widths |
| I19 | No new console errors/warnings | Console log diff |

**Non-goals (explicitly not part of "identical"):** page weight, load time, SEO metadata, code
quality, accessibility improvements, security fixes. Those are separate tracks (§10) — bundling
them into this migration makes parity unprovable.

---

## 3. Architecture decision

### 3.1 Options considered

| Option | What it means | Verdict |
| --- | --- | --- |
| **A — Big-bang JSX rewrite** | Convert all 3.8 MB of HTML into idiomatic React components; reimplement `script.js` as hooks/context | **Rejected.** Rewriting 22,934 lines of behaviour and 19,680 CSS rules simultaneously cannot be proven identical. This is what the reverted commit `3e38602` effectively did — and it produced a *redesign*, not a port |
| **B — Verbatim mount + strangler** | React renders exact markup from extracted fixtures; legacy CSS remains unchanged; eventual runtime ownership transfers are separately gated | Historical runtime proposal, not the current implementation |
| **C — Islands only** | Mount independent React roots only where legacy JS no longer mutates their DOM | Future runtime proposal; static byte identity alone is insufficient |
| **D — Static prerender, no document hydration** | Build-time React section roots emit byte-identical static HTML via `renderToStaticMarkup`; all legacy JS remains | **Current implementation scope**; no whole-document hydration while legacy JS mutates DOM |

### 3.2 Decision

**Current scope: build-time React section roots, still-legacy runtime DOM behaviour.**

1. React generates section-root markup **at build time** — same tags, IDs, classes and raw content.
   It does not own the browser document or the legacy-mutated DOM at runtime.
2. The legacy stylesheets are **imported, never rewritten**. Tailwind is not used on legacy surfaces.
3. The i18n engine is **kept**, not ported; runtime translation remains legacy DOM mutation.
4. All legacy JavaScript and spacers are retained. Behaviour transfers described in §4.8 remain
   future proposals, not work completed or authorized by this static-render stage.
5. Byte-identical static output is compatible with keeping all legacy JS. It is **not** a guarantee
   of hydration safety: no whole-document hydration while legacy JS mutates DOM. Any future island
   requires exclusive DOM ownership and its own parity gate.

### 3.3 Target architecture

The diagram below is the historical future **runtime-island target**, not the current build-time
implementation. All 186 product reviews include the embedded `Haltane` reviews inside `Layton`.

```
                      public/index.html  (pre-rendered, static — served by all 3 hosts)
                                │
                ┌───────────────┴────────────────┐
                │                                │
   legacy <link> stylesheets            React mount points
   (verbatim, same order,                (islands; each an independent root)
    same blocking flags)                          │
                │                                 ├── #charme-nav        → SiteNav
                │                                 ├── #cartModal         → CartDrawer
                │                                 ├── #authModal         → AuthModal
                │                                 ├── #favoritesModal    → Favourites
                │                                 ├── #newsModal         → NewsFeed
                │                                 ├── .reviews-section   → ReviewsBlock ×186
                │                                 └── [data-island="…"]  → progressively more
                │
        window.I18N (kept verbatim, MutationObserver as safety net)
        window.CHARME_API_ORIGIN + fetch patch (kept verbatim)
        apiFetchJson single-flight (kept verbatim, exported)
```

Rules of the house:

- **One island = one `createRoot`.** Islands never re-render each other's DOM.
- **Nothing outside an island is touched by React at runtime.** The 185 product sections remain
  static markup in the browser even when Gate D generates their section roots at build time.
- **Every ported behaviour keeps its global entry point.** `window.cartManager.addToCart(...)` must
  still exist, because inline `onclick` in un-ported markup calls it. React can implement the global
  and own the UI behind it.
- **Deletion is the last step, never the first.** `script.js` is peeled, not replaced.

### 3.4 What React owns vs what stays vanilla, per phase

Historical future runtime phases below are not implementation status. **Currently React renders
section roots only at build time; all runtime DOM behaviour, reviews and legacy JS remain legacy.**

| Concern | Gate C | Gate D | Gate E |
| --- | --- | --- | --- |
| Navbar user menu, cart, favourites, auth modal | React | React | React |
| Product sections (185) | static markup | React (prerendered) | React |
| Reviews blocks | React (islands) | React | React |
| i18n engine | vanilla | vanilla | vanilla (kept forever) |
| Catalogue data + search + AI finder | vanilla | vanilla | vanilla (kept) |
| Cart logic | vanilla `cartManager` behind a React UI | React, global shim retained | React |
| Favourites logic | vanilla | React | React |
| Admin modals (8) | vanilla | vanilla | React |
| Preloader, theme boot, perfume mode | vanilla | vanilla | vanilla |
| `script.js` | full file, minus ported modules | ~40% | 0 |

---

## 4. Subsystem plans

### 4.1 CSS — import verbatim, isolate Tailwind

**The rule: the 8 stylesheets load exactly as they do today.** Same files, same order, same query
strings, same `media="print" onload` trick, same render-blocking set. They stay in `public/` and are
referenced from the React app's `index.html` with **root-absolute hrefs** (`/styles.css`,
`/css/combined-profiles.css`, …), because all three hosts serve `public/` at `/`.

**Do not let Tailwind touch the legacy surface.** Verified: Tailwind 4.3.3 emits its output inside
`@layer` blocks (`@layer properties{…}` is the first thing in the built
`public/app/assets/index-B6qIyu1s.css`). Since the legacy CSS is **unlayered**, unlayered rules beat
layered ones in the cascade regardless of specificity — so Tailwind *utilities* cannot accidentally
win. **But preflight is a different problem:** where legacy CSS does not declare a property,
preflight's reset takes effect. That affects `img` (394), `button` (1,231), `input` (416), `h1`-`h6`,
`ul`/`ol`, `p`, and `table` — i.e. thousands of nodes.

Fix: split the import in `frontend/src/index.css`.

```css
/* Was: @import "tailwindcss";  ← pulls preflight in globally */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
/* preflight.css deliberately NOT imported on the legacy route */
```

`node_modules/tailwindcss/` ships `preflight.css`, `theme.css`, `utilities.css` separately
(verified). If a new, non-legacy surface genuinely needs preflight, import it **inside that
component's own scoped stylesheet**, never globally.

**Do not** hash or rewrite the legacy CSS through the Vite pipeline. The `?v=` query strings are
part of the cache contract, and PostCSS/minification passes are an unnecessary way to change output.

**Do not** convert the **117 actual `*-theme` classes** to a lookup table. Their `!important`-heavy
rules with `#id` descendants are imported as-is. The older 627 KB estimate was a JS character-count
metric, not a UTF-8 byte measurement. Converting them to custom properties is a separate,
unauthorized optimisation.

### 4.2 i18n and RTL — keep the engine

Ported i18n is the classic silent-failure trap: a reimplementation that translates 95% of strings
looks fine in review and wrong on screen. Keep the engine.

- Keep `js/i18n-dict.js` and `js/i18n.js` as deferred scripts, loaded in the same order.
- Build-time React section roots preserve source text; the legacy engine translates it at runtime.
  `window.I18N.t(sourceEnglishString)` is a future runtime-island hook, not a build-time call or
  evidence that runtime translation has moved into React.
- Reproduce the 12 `data-i18n-aria` / `-placeholder` / `-title` / `-alt` attributes verbatim — those
  are the only attribute-level translations.
- Leave the `MutationObserver` in place. It costs nothing and it is the safety net for any DOM React
  does not control.
- **Do not** re-render an island on a timer faster than the 150 ms observer debounce, or translations
  will thrash.
- Preserve `localStorage["site-lang"]`, the `fr` default, and `<html lang="fr">`.
- RTL: keep `dir` + `lang-rtl`/`lang-ltr`; keep `guides.css:637-645`; note that `styles.css` has no
  RTL rules, so nothing else needs to change.
- Check whether `guides.js`'s parallel i18n double-translates guides content; if it does today,
  keep it doing that.

### 4.3 State and storage

- **Keep every localStorage key byte-identical** (§1.8). Users' carts, favourites and sessions
  survive the migration — that is a hard requirement, not a nicety.
- Keep the **no-merge-on-login** cart rule and the **merge** favourites rule, even though the
  asymmetry looks like a bug. Changing it changes behaviour.
- Keep `apiFetchJson`'s single-flight semantics. Export it and use it from React rather than
  replacing it with a fresh fetch wrapper.
- React state is a *mirror*, never a second source of truth. Where a value is already in
  localStorage, read it there.

### 4.4 API layer

- Preserve `window.CHARME_API_ORIGIN` and the `window.fetch` monkey-patch verbatim. Every React
  call must go through it or the site breaks off-origin (Vercel/GH Pages → Render).
- Keep absolute `/api/…` paths.
- Keep `/uploads/avatars` handling.
- Do not "tidy" the dev routes out of the client while porting; they are wired into debug helpers.

### 4.5 Routing and anchors

- `location.hash` is never read. All navigation is `scrollIntoView({behavior:"smooth", block:"start"})`.
  Keep it that way — introducing hash routing would change browser history behaviour and break
  back/forward expectations (currently back/forward does **not** restore scroll).
- Keep `ensureSearchTargetId()`'s id-mutation behaviour, or the search index loses entries.
- The React app's existing routes (`/app` grid, and whatever `/collection` etc. become) must not
  collide with the legacy in-page anchors.

### 4.6 Product sections — the core work

The ongoing build-time stage renders all **185 section roots** from extracted HTML fixtures while
preserving all legacy runtime DOM behaviour. No live behaviour fixes are authorized.

The fixture is **extracted from the HTML**, not from `fragrances.json` (§7). Static output preserves:

- `<section class="content <classSlug>-section" id="<slug>">` — preserve both identifiers and case
- `<div class="<theme>-main-container <theme>-theme">` where present; null theme for `Layton`/`Pegasus`
- the whole profile-card / radar / note-pyramid / reddit-card / rating / reviews vocabulary with the
  `<theme>-` prefix where the theme is `elves`, and the per-product prefix otherwise
- every actual ID from §1.4, including classSlug-based IDs in the two mismatched blocks
- `data-product`, `data-quality`, `data-rating`, `data-price` attributes verbatim

The original component grouping must account for these section-root counts:

| Component / group | Covers | Notes |
| --- | --- | --- |
| `ProductSection` | 181 of 185 | first40 fingerprints: 115 per-product + 66 `elves` |
| `LaytonSection` | 1 | bespoke; null theme; contains embedded `Haltane` div and two product names |
| `PegasusSection` | 1 | bespoke; null theme |
| `onemillionnight` variant | 1 | section ID `1millionnight`; internal IDs use `onemillionnight` |
| `xerjoff40knots` variant | 1 | section ID `40knots`; internal IDs use `xerjoff40knots` |

`Haltane` is not another section root. Preserve its embedded `haltane-section-container` and reviews
inside `Layton`; do not split it into a standalone section.

### 4.7 Modals

22 modals. Group them:

| Group | Count | Modals |
| --- | --- | --- |
| Customer-facing | 9 | search, ingredient finder, profile, photo editor, favourites, settings, cart, verification, auth |
| Admin | 8 | admin dashboard, guest notes, news composer, loyalty, ban user, loyalty edit, customer profile, record purchase |
| Overlays | 5 | floating menu, social rail, back-to-top, perfume-mode toggle, top vignette |
| Other | 2 | news modal, loader |

`hideModalsImmediately()` (`script.js:157`, re-run at `:153` after 100 ms and again at `:5697`) force-hides
8 modals with `display:none !important` on load. Any React modal system must reproduce that
"everything starts hidden" state, including the 100 ms re-application.

Prefer: port the **customer-facing 9** (they are the visible surface), leave the **admin 8** vanilla
until Gate E. Admin modals are behind a login and are lower-risk to defer.

### 4.8 Behaviours, in dependency order

This is the original **future runtime-port order**, not the ongoing build-time implementation.
All legacy JS remains now; each eventual runtime transfer needs separate authorization and parity.

| # | Behaviour | Source | Depends on | Risk |
| --- | --- | --- | --- | --- |
| 1 | Theme boot + `#themeToggle` | inline `:179`, `:438` | — | low |
| 2 | Preloader | inline `:212` | resource timing | **do not port until Gate D** |
| 3 | Navbar user menu / auth state | `:6924`, `:7131` | auth API | medium |
| 4 | Auth modal + verification | `:261` block, `:5538` | #3 | medium |
| 5 | Favourites (merge + animation) | `:13068`, `:13612` | #3 | medium |
| 6 | Cart (incl. no-merge rule) | `:15004`, `:14450` | #3 | **high** |
| 7 | Quality selector + price animation | inline `:29053` | product markup | medium |
| 8 | Reviews / likes / replies | `:18065`–`:19934` | #3, #5 | **high** |
| 9 | Search modal + quick search | `:410`–… | ids | medium |
| 10 | Ingredient finder | `js/ingredient-finder.js` | catalogue | low |
| 11 | AI fragrance finder | `js/ai-fragrance-finder.js` | catalogue | low |
| 12 | Grid mode (`perfumeModeToggle`) | `:22426`, `:21978` | bottle renders | medium |
| 13 | Bottle renders (three.js) | `:22851` | `three.min.js` | medium |
| 14 | Notes / contact form | `:3508` API | — | low |
| 15 | News modal | `:15065` | — | low |
| 16 | Profile + photo editor | `:6392`, `:6842` | #3 | medium |
| 17 | Loyalty | `:2724` API | #3 | low (admin) |
| 18 | Admin dashboard / users / ban | `:2413` API | #3 | low (admin) |
| 19 | Back-to-top ring, floating menu, social rail, vignette | `:29016`+ | scroll | low |
| 20 | Scroll colour sync | `:16620`–`:16635` | order | low |

Never port #2 before Gate D. Never port #6 without the storage-diff test.

### 4.9 Preloader and theme boot

These two are the reason Gate D exists.

- Theme boot must run **before first paint**. In React this means a tiny blocking inline script in
  `<head>` — not a `useEffect`. Keep the existing inline script; do not move it into the bundle.
- The preloader measures `performance.getEntriesByType("resource")` and lifts on `window.load`.
  Under client-side rendering those entries are near-empty and `load` fires before the content
  exists, so the curtain lifts onto a blank page. **Prerendering (Gate D) is the fix.** Until then,
  the legacy preloader must keep running against the legacy document.

---

## 5. The parity harness — how we prove "identical"

This is the most important artefact in the plan. Without it, "100% identical" is a claim; with it,
it is a test result.

### 5.1 Capture matrix

Capture the **baseline** from the current site (local Express or Render) before any change, then
re-capture after every phase.

| Axis | Values | Count |
| --- | --- | --- |
| Width | 375, 400, 480, 620, 640, 720, 768, 900, 960, 1024, 1180, 1280, 1400, 1600 | 14 |
| Locale | `en`, `fr`, `ar` (RTL) | 3 |
| Theme | `night`, `light` | 2 |
| Mode | details, grid | 2 |
| Auth | logged out, logged in, admin | 3 |
| State | cold load, cart with 2 items, favourites with 3 | 3 |

Full cross-product is 1,512 captures — too many. Use a **tiered** set:

- **Tier 1 (every PR):** 4 widths × 3 locales × night × details × logged out = **12 captures**, plus
  1 light-theme and 1 grid-mode = **14**.
- **Tier 2 (each gate):** all 14 widths × 3 locales × 2 themes × 2 modes = **168**, logged out.
- **Tier 3 (before Gate D and Gate E):** the full state matrix, sampled at 5 widths = **270**.

### 5.2 Three diff layers

Pixel diffs alone are too blunt (a 1 px shift in a 30,000 px document produces noise) and too
blind (they miss behaviour). Use three layers.

**Layer 1 — pixel.** Screenshot per viewport, full-page, device pixel ratio 1. Compare with a
per-pixel threshold. Report: max delta, % pixels over threshold, and a bounding box of the largest
differing region. **Pass: 0 pixels over threshold**, or an explicitly signed-off exception list.

**Layer 2 — DOM structure.** Serialise the rendered DOM as an ordered list of
`tag#id.class[data-*]` tokens and diff. This catches the failure pixel diffs hide: a changed id that
happens to look the same but breaks `getElementById`. **Pass: zero diff on tag/id/class/data-*
sequence.** This layer is the primary gate — it is cheap, deterministic and catches the CSS
contract violations directly.

**Layer 3 — computed style.** For every element, capture a hash of the computed style for a fixed
property set (`display, position, width, height, margin, padding, color, background-color,
background-image, font-family, font-size, font-weight, letter-spacing, border-radius, box-shadow,
z-index, transform, opacity, flex-*, grid-*`). Diff by element path. **Pass: zero diff**, or a
reviewed list. This is the layer that catches the Tailwind preflight problem before a user does.

### 5.3 Behavioural smoke suite

Scripted, deterministic, run at every gate:

1. Language switch `fr → en → ar → fr`; assert every text node and `dir`/`lang` attribute.
2. Theme toggle `night → light → night`; assert `<html data-theme>` and no flash on reload.
3. Quality selector: click each tier; assert price text, colour class, and the count-up duration.
4. Add to cart ×2, change quantity, remove; assert cart markup, total, currency `dt`, and
   `parfumerie_cart_<email>` contents.
5. Guest → login; assert cart does **not** merge and favourites **do**.
6. Favourite toggle logged out (guest key) and logged in (API + merge).
7. Review: submit, like, reply, edit, delete; assert `#<slug>-reviews-list` markup and counts.
8. Preloader: capture frames 0–2,000 ms; assert curtain lift timing and that content is present
   underneath.
9. Scroll: navbar hide/reveal, back-to-top ring progress, grid-mode switch.
10. Network: log all requests during a cold load; assert the **same set and count** (single-flight
    preserved).
11. Console: assert zero new errors/warnings.

### 5.4 Gate criteria

A gate passes only when **all** of the following hold:

- Layer 2 (DOM) diff is **zero**.
- Layer 1 (pixel) diff is **zero**, or every exception is signed off with a reason and a ticket.
- Layer 3 (computed style) diff is **zero** or reviewed.
- All 11 behavioural smoke tests pass.
- Network call set unchanged.
- No new console errors.

Anything less is a fail. "Looks the same to me" is not a criterion.

### 5.5 Tooling and gotchas

- No Playwright in the repo. Use the MCP copy:
  `require("C:/Users/cheri/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright")`.
- Its expected browser build is usually missing — pass an explicit `executablePath` from
  `C:/Users/cheri/AppData/Local/ms-playwright/chromium-<v>/chrome-win64/chrome.exe` (newest version
  present).
- Bash: curl args starting with `/` get mangled by MSYS path conversion — use
  `export MSYS_NO_PATHCONV=1`.
- Freeze animations before capture (`animation-play-state: paused`, `transition: none`) except in the
  preloader and price-animation tests, which need real time.
- Pin the clock and seed `Math.random` where any code depends on them.
- Capture the baseline **twice, days apart**, to prove the baseline is stable before trusting a diff.

---

## 6. Phased execution

The original future runtime phases are retained for reference; they are not completed-runtime claims
or authorization to change behaviour. The ongoing stage is **build-time static section rendering**
with all legacy JavaScript and spacers preserved.

### Gate A — Freeze and measure (read-only)

**Do:** build the parity harness (§5). Capture Tier 2 + Tier 3 baselines against the current site.
Freeze the legacy files: add a header comment and a CI check that fails if
`public/index.html`, `public/styles.css`, `public/script.js` or `public/css/*` change without a
`legacy-freeze` label. Record the baseline commit SHA.

**Exit:** baselines stored, harness reproducible, baseline stable across two runs.

**Rollback:** nothing to roll back.

### Gate B — Extraction (new files only)

**Do:** write `scripts/extract-legacy-content.cjs` (§7). Emit
`frontend/src/legacy/content.json` (185 sections) plus `themes.json`. Prove equality by
re-rendering the fixture to HTML and diffing against the original markup at Layer 2.

**Exit criterion, not a claimed test result:** `renderToStaticMarkup(fixture) === original` for all
185 sections, byte-identical **including whitespace**. Nothing in the live site changes; legacy
runtime DOM behaviour remains unchanged.

**Rollback:** delete the new files.

### Gate C — Islands

**Do:** mount React roots into the customer-facing chrome — navbar user menu, cart, auth modal,
favourites, reviews blocks — while the legacy document and `script.js` stay in place. Port
behaviours #1, #3, #4, #5 in §4.8.

**Exit:** Tier 1 + Tier 2 parity green; all 11 smoke tests green; `script.js` line count reduced but
still present.

**Rollback:** one revert; islands are additive.

### Gate D — Prerender

**Do:** use build-time React section roots and `renderToStaticMarkup` to generate static HTML for
all 185 sections. Keep all legacy JavaScript, the same `<link>` set, inline bootstrap scripts and
all spacers. This transfers section rendering at build time, **not runtime DOM behaviour**.
Do not hydrate the whole document while legacy JS mutates DOM; any future island hydration requires
exclusive DOM ownership, not merely raw HTML identity.

**Exit criterion, not a claimed test result:** static output is **byte-identical** to the frozen
legacy markup, including whitespace and spacers. Complete section output with 184 separating
newlines is **3,517,954 UTF-8 bytes**. The original Tier 3 and preloader checks remain future parity
gates, not evidence of a completed runtime migration.

**Rollback:** restore the frozen `index.html` from git; the build step is additive.

### Gate E — Retire

**Historical future proposal, not current authorization:** retire ported modules only after their
runtime behaviour has an exclusive React owner and separate parity proof. Static-render parity
does not authorize removal of legacy JS, CSS or the `#perfumeGrid` runtime path. **Preserve all 114
spacers**; replacing them with CSS spacing is an unauthorized layout change.

**Exit:** `script.js` removed or reduced to the i18n engine and catalogue data; full parity green;
site weight materially down.

**Rollback:** tag before the phase; the deletion commit is isolated.

---

## 7. Data extraction spec (Gate B detail)

### 7.1 Method

`scripts/extract-legacy-content.cjs` reads `public/index.html` and writes a fixture. It must:

1. Find each `<section class="content <classSlug>-section" id="<slug>">` with a matcher that accepts
   uppercase identifiers and preserves case; balance `<section>` nesting to find its end. Keep
   classSlug and section ID separately for the two mismatches.
2. Parse the inner `<div class="<theme>-main-container <theme>-theme">` where present. Only `Layton`
   and `Pegasus` have null themes; exclude null from the 117-theme set.
3. Extract fields (below), retaining embedded `Haltane` inside `Layton` and both product names.
4. Emit the fixture keyed by section slug, plus the theme → prefix mapping. Preserve all raw blocks.

**Never** source product data from `public/data/fragrances.json` or
`public/js/fragrance-catalog-data.js` — that catalogue covers only 18 of 185 slugs (§0.2).

### 7.2 Fields per section

| Field | Source | Notes |
| --- | --- | --- |
| `slug` | section `id` | preserve case; does not drive every internal ID |
| `classSlug` | section class | differs from `slug` for `onemillionnight` → `1millionnight` and `xerjoff40knots` → `40knots`; internal IDs use classSlug |
| `theme` | container class | 117 distinct non-null themes; `elves` for 67; null only for `Layton`/`Pegasus` |
| `brandName` | `.brand-name` | |
| `brandLocation` | `.brand-location` | e.g. `PARIS` |
| `productName` | `.product-name` | 186 elements in 185 sections; `Layton` contains `Layton` and embedded `Haltane` |
| `image` | first `img[src]` | `fimgs.net` URL or inline `data:` |
| `imageAlt` | `img[alt]` | |
| `priceBadge` | `.price-badge` subtree | including the 4 `.price-ornament` divs |
| `qualityTiers` | actual quality inputs and IDs, retaining classSlug | root-product ID counts: **edp 177, edt 166, parfum 11, top 6, identical 6**; embedded `Haltane` additional |
| `scentProfile` | radar section | labels + values |
| `ingredients` / note pyramid | crystal-notes | tiers, icons, names |
| `performanceMetrics` | `.elves-metric-item` | label + bar value |
| `redditReview` | reddit card | votes, text, author |
| `moodIndicators` | `.elves-indicator-item` | icon + label + bar |
| `hasReviews` | actual `.reviews-section` and extracted IDs, including classSlug | 183 wrappers have own-slug reviews; both mismatched wrappers have classSlug reviews; all 186 products have reviews |
| `rawHtml` | the whole block | retained for every section in the build-time stage |

Keep `rawHtml` for every block in v1: **3,517,770 UTF-8 bytes** across the raw sections, or
**3,517,954 UTF-8 bytes** rendered with 184 separating newline bytes. The previous
**3,424.4 KB / 92.6%** metric is JS **character count**, not bytes. Byte-identical static rendering
can keep all legacy JavaScript; raw HTML identity does **not** guarantee hydration safety or
transfer runtime DOM ownership. No whole-document hydration while legacy JS mutates DOM.

### 7.3 The variants to handle

| Variant | Count | Handling |
| --- | --- | --- |
| Standard, per-product prefix | 115 | `ProductSection`; first40 fingerprint group |
| Standard, `elves` prefix | 66 | `ProductSection` (theme = `elves`); first40 fingerprint group |
| `Layton` | 1 | bespoke, null theme; contains embedded `Haltane` div and two product names |
| `Pegasus` | 1 | bespoke, null theme |
| `onemillionnight` | 1 | section ID `1millionnight`; internal IDs/reviews use classSlug `onemillionnight` |
| `xerjoff40knots` | 1 | section ID `40knots`; internal IDs/reviews use classSlug `xerjoff40knots` |

These first40 groups total **115 + 66 + 2 + 1 + 1 = 185 section wrappers**. Embedded `Haltane`
is preserved inside `Layton`, not counted as a standalone section.

### 7.4 Verification (the Gate B exit test)

For each of the 185 sections:

These are verification criteria, not newly claimed test results:

1. Render the fixture through the build-time React section root with `renderToStaticMarkup`.
2. Preserve original whitespace; do not normalise it for byte-identity verification.
3. Assert the output equals the original block **byte for byte in UTF-8**.
4. Assert every id, class and `data-*` token appears in the same order (Layer 2 diff).

Static-render equality does not verify runtime migration or hydration safety; legacy JS retains
runtime DOM ownership.

If any section fails, the component is wrong, not the fixture. Do not proceed to Gate C with a
failing section.

---

## 8. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Detection |
| --- | --- | --- | --- | --- | --- |
| R1 | React renders from `fragrances.json` and 167 product blocks change or vanish | **high** if unguarded | **critical** | Fixture must be extracted from the HTML; CI assert that section count == 185 | Layer 2 DOM diff |
| R2 | Tailwind preflight resets legacy elements (`img`, `button`, `input`, headings) | **high** | high | Import `theme.css` + `utilities.css` only; never `preflight.css` globally | Layer 3 computed-style diff on a fixture page |
| R3 | 84 `innerHTML` templates with inline `onclick` stop working | high | high | Keep global entry points (`window.cartManager`, `window.reviewsManager`) alive until their markup is ported | Behavioural smoke #4, #7 |
| R4 | `initializeFavoriteButtons` clone trick destroys React nodes | high | medium | Own favourites in React; drop the clone path when its markup is ported | Smoke #6 |
| R5 | Id drift — a renamed id silently breaks `getElementById` (531 call sites) | medium | high | Layer 2 diff as the primary gate; never rename | Layer 2 |
| R6 | Cart double-switch / lost guest cart on refresh | medium | high | Reproduce the exact ordering from `_recon/scriptjs.md` §1.5 #4 | Storage diff + smoke #5 |
| R7 | Preloader lifts onto a blank page under client rendering | **certain** if Gate D is done wrong | high | Do not port the preloader until prerender exists | Frame capture 0–2,000 ms |
| R8 | Theme flash on first paint | medium | medium | Keep the blocking inline `data-theme` script in `<head>` | Screenshot immediately after DCL |
| R9 | i18n reimplementation translates ~95% of strings | high | high | Keep the engine; call `I18N.t()` at render time | Per-locale text-node diff |
| R10 | `fetch` monkey-patch lost → all API calls break off-origin | medium | **critical** | Preserve `CHARME_API_ORIGIN` + patch verbatim | Smoke #10 on Vercel + GH Pages, not just localhost |
| R11 | `apiFetchJson` single-flight dropped → 3× boot requests → rate limits | medium | medium | Export and reuse it | Smoke #10 |
| R12 | Scroll state divergence (`window._globalScrollTop`) | medium | low | One scroll source of truth, published per frame | Recorded scroll diff |
| R13 | Element-order-dependent code breaks (`getScrollBackgroundColor`, `resolveProductDetailsFromDom`, `buildGrid`) | medium | medium | Keep section order identical; do not reorder | Layer 2 + smoke #9 |
| R14 | Removing the 114 spacers changes vertical rhythm | medium | medium | Preserve spacers; removal is an unauthorized layout change, not part of static-render migration | Screenshot diff, full-page |
| R15 | Security defects fixed mid-migration, changing behaviour | low | medium | Explicitly out of scope (§10) | Scope review |
| R16 | Baseline itself is unstable (flaky animations, CDN images) | medium | medium | Capture baseline twice; freeze animations; pin image sources | Two baseline runs diff clean |
| R17 | `guides.js` parallel i18n double-translates | low | low | Verify current behaviour, reproduce it | Per-locale diff on a guide page |

---

## 9. Decisions needed from you

Current scope is settled: **build-time React section roots; legacy runtime DOM behaviour; all
spacers preserved; no performance, security or layout changes**. The remaining historical questions
are future proposals, not authorization for this implementation.

1. **Runtime ownership after static rendering.** Build-time React roots do not make React the
   browser-document owner. Any future islands require separate authorization and exclusive DOM
   ownership; byte identity does not permit whole-document hydration while legacy JS mutates DOM.
2. **The 114 empty spacers.** Preserve them. Removing them is a visible, unauthorized layout change.
3. **The three security defects** (§1.9). Fix now (behaviour change, violates identity), fix in a
   follow-up release (recommended), or leave?
4. **Performance work.** The page ships ~3.8 MB HTML + 2.9 MB CSS + 1.8 MB JS + 187 remote images.
   Performance changes require a separate authorized track; none are authorized here, and all
   spacers, legacy CSS and runtime behaviour must remain unchanged.
5. **`/app` grid.** It currently builds to `public/app` with `base: "/app/"`. Does the migrated
   homepage replace it, coexist with it, or absorb it?
6. **Admin modals.** Port them (adds risk, they are behind auth) or leave them vanilla permanently?

---

## 10. Out of scope / separate tracks

Explicitly **not** part of this migration, because bundling them makes parity unprovable:

- **Performance:** HTML weight, CSS weight, image optimisation, lazy loading, code splitting.
- **Security:** the forged-like endpoint, the missing `requireAdmin` guards, the public `/api/dev/*`
  routes.
- **SEO:** meta tags, structured data, sitemap, the 404-on-deep-link issue on GitHub Pages.
- **Accessibility:** focus management, ARIA, keyboard traps in 22 modals.
- **Checkout / orders / newsletter:** do not exist server-side today; greenfield, not a migration.
- **Design:** any visual change at all.

Each deserves its own plan, its own baseline, and its own rollback. Doing them here would make a
parity failure ambiguous — was it the migration, or the performance change?

---

## Appendix A — File ownership map

Historical future phase ownership below is not current implementation status. In the ongoing
build-time stage, React renders section roots to static output and **all legacy JS, CSS, spacers and
runtime DOM behaviour remain intact**; runtime reductions/deletions below are not authorized.

| Path | Gate A–C | Gate D | Gate E |
| --- | --- | --- | --- |
| `public/index.html` | frozen | generated by build | generated |
| `public/styles.css` | frozen, linked | frozen, linked | frozen, linked |
| `public/css/*.css` | frozen, linked | frozen, linked | dead files deleted |
| `public/script.js` | reduced per behaviour | further reduced | deleted |
| `public/js/i18n*.js` | kept | kept | **kept forever** |
| `public/js/fragrance-catalog-data.js` | kept | kept | kept |
| `public/js/{ai-fragrance-finder,ingredient-finder,note-image-resolver,fragrantica-urls,cp-trait-icons,guides,three.min,smooth-scroll}.js` | kept | kept | kept |
| `frontend/src/legacy/content.json` | created (Gate B) | source of truth | source of truth |
| `frontend/src/legacy/**` components | islands | full render | full render |
| `frontend/src/index.css` | Tailwind split | Tailwind split | Tailwind split |
| `frontend/vite.config.js` | unchanged | prerender step added | unchanged |
| `server.js` | unchanged | unchanged | SPA fallback if the root becomes React |

## Appendix B — Command reference

```bash
# recon (already run; re-runnable)
node _recon/recon.cjs              # asset dirs, script.js, styles.css, html attribute inventory
node _recon/css-recon.cjs          # per-file CSS shape, theme classes, fonts, catalogue parity
node _recon/product-recon.cjs      # 185 sections, fingerprints, id shapes, parity vs catalogue

# site
npm start                          # Express on :3000
npm run dev:app                    # Vite dev server, proxies /api and /uploads to :3000
npm run build:app                  # catalogue -> public/data, then Vite build -> public/app

# deploy (both hosts from one push)
git push origin main               # GitHub Pages (charmeperfume.me) + Render (autoDeploy)
```

## Appendix C — Where the evidence lives

| File | Contents |
| --- | --- |
| `_recon/legacy-inventory.md` | 727-line block inventory, API surface, script/style load order |
| `_recon/recon-out.md` | Raw counts: asset dirs, script.js, styles.css, HTML attributes, i18n, catalogue |
| `_recon/css-catalogue.md` | Older per-file CSS report; corrected actual theme count is 117 including `kbyDG`/`grandSoir`; 92 custom properties, fonts, parity |
| `_recon/product-blocks.md` | Older lowercase-matcher report was 183; corrected real-Chromium count is 185 sections, 186 product names, 5 first40 fingerprint groups; corrections above supersede stale figures |
| `_recon/scriptjs.md` | Full behaviour map: boot, globals, storage, cart, auth, effects, 20 port hazards |
| `_recon/i18n.md` | i18n mechanism, entry counts, MutationObserver, RTL, gotchas |
| `_recon/sample-product.html` | One product block, slug-anonymised |
| `_recon/*.cjs` | The recon scripts (re-runnable) |
