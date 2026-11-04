# The smoothest websites of 2026–2027 — deep research, and what is missing in our React app (`/app`)

**Date:** 2026-10-13 · **Method:** 6 parallel web-research agents (52 searches, ~40 primary-source fetches)

- a live instrumented audit of `localhost:3000/app` (Playwright + Chromium, 4 route/viewport runs,  
  536 bundle/DOM/API probes). All numbers below are measured, not estimated.  
  **Evidence:** `_recon/deep-research-smooth-2027/results/*.md` (6 research dossiers),  
  `_recon/deep-research-smooth-2027/audit-out/audit.json` + 5 screenshots, `audit-app.cjs`, `catalog-stats.cjs`.

---

## 0. Verdict up front

`/app` is **already good where it counts most**: it loads fast (LCP 648 ms home / 912 ms collection),  
ships a lean 14 KB HTML + 34 KB CSS document, throws **zero console errors and zero failed requests** on  
every route tested, and its design system is genuinely 2026-grade — `oklch()` tokens, `linear()` spring  
easings, scroll-driven `view()` reveals, `sibling-index()` stagger, `@starting-style`, `content-visibility`.

**But the motion system is 95 % dormant.** The primitives exist in `tokens.css` and are then almost  
never used: the reveal class appears on exactly **one** element in the whole app, `reveal-group` and  
`virtual-block` are used **zero** times, and `document.startViewTransition` is **never called** — so the  
`view-transition-name: page` CSS and `::view-transition-group(*)` rules are dead code. The 752-card  
collection grid — the surface that most needs choreography — has no scroll animation at all. On top of  
that sit a content gap (657/752 cards are typographic monograms; 554/752 marked "sold out"; 689/752  
without a note pyramid) and the absence of every immersive presentation technique the award circuit  
runs on (WebGL 42 %, 3D 32 %, scroll-scrubbed scenes, custom cursors, magnetic physics).

So the honest answer to "what is missing": **not CSS features — choreography, imagery, and content  
depth.** The features are in the repo; the craft budget was never spent wiring them in.

---

# Part 1 — What the research found

## 1.1 Award-winning mechanics (results/award-winning-mechanics.md)

- **2025 cycle winners:** Awwwards SOTY = *Lando Norris* (OFF+BRAND — scroll-driven + WebGL helmet);  
  Developer SOTY = *Messenger* (Three.js planet game, WebGL-native UI, WASM text); E-commerce SOTY =  
  *Scout Motors* (Locomotive). CSSDA WOTY = *Dropbox Brand* (Daybreak Studio, 9.03).
- **Mechanic frequency across recent SOTDs:** GSAP ~52 %, WebGL ~42 % (Three.js only ~23 % — much is  
  hand-written WebGL), 3D ~32 %, scroll-linked ~29 %, page transitions ~26 %. Consensus stack:  
  Next.js + GSAP/ScrollTrigger + Three.js + Lenis.
- **Juror criteria (Hon Tran's 40/30/20/10 rubric):** art direction → directed motion → performance →  
  details. "Beauty at 60 fps is the whole discipline." "Watch the transitions, not the pages."  
  Test method: screenshot the hero with motion killed (is the static frame still strong?), throttle  
  CPU 4× + Fast 3G, audit the reduced-motion path.

## 1.2 Modern CSS actually shipping (results/modern-css-production.md)

- **Baseline 2026 (safe):** scroll-driven animations (Chrome 115 / FF 132 / Safari 18.4), same-document  
  View Transitions + `:active-view-transition`, `@layer`, `@scope`, anchor positioning (Firefox 147  
  completed it Sept 2026), `field-sizing`, `:open`, `shape()`, `sibling-index()`, `contrast-color()`,  
  `@starting-style`, relative color/oklch, `command`/`commandfor`.
- **Correction to an earlier internal note:** cross-document view transitions are **not** Baseline —  
  Chrome/Edge 126+, Safari 18.2 only; Firefox has not shipped them. Many 2026 writeups overstate this.
- **Chrome-first:** `if()` (137+), `@function` (139+), `interestfor` + `popover="hint"` (142),  
  `appearance: base-select` (135; Safari 27), `scroll-state()` (133+), `::scroll-button()/::scroll-marker`  
  (135+), grid-lanes masonry (Safari 26.4 only), gap decorations (149). `@mixin/@apply`: no engine yet.
- **Pitfalls documented:** `overflow: hidden` kills scroll timelines; the `@supports` gating trap;  
  `!important` layer-order reversal; snapshot distortion; `pageswap`/`pagereveal` firing per navigation.
- **JS patterns now obsolete:** IntersectionObserver reveals → `animation-timeline: view()`; JS modals →  
  `<dialog>` + `commandfor`; tooltips → `popover="hint"` + `interestfor`; auto-grow textareas →  
  `field-sizing: content`; carousel dots → `::scroll-marker`.

## 1.3 Motion engineering (results/motion-engineering.md)

- **Easing:** CSS `linear()` sampled springs are the 2026 default for one-shot motion; JS springs remain  
  necessary for interruptible/gesture motion. Verified library state (Oct 2026): **GSAP 3.15.0** (no GSAP  
  4/5 exists — free since Apr 2025), **Motion 14.2.0** (~4.6 KB via LazyMotion), **Lenis 1.3.25**  
  (~3.3 KB, wraps native scroll so sticky/a11y survive), React Spring 10.0.4 (alive, low-velocity).
- **Choreography:** FLIP via GSAP Flip / Motion `layout`; native View Transitions + React  
  `<ViewTransition>` for shared elements; route beats via `AnimatePresence mode="wait"`; CSS scroll-driven  
  for simple parallax. `gsap.quickTo` for high-frequency pointer updates.
- **Frame budget:** compositor-only properties; pseudo-element box-shadow crossfade; scoped `will-change`  
  with cleanup; `content-visibility`; passive listeners; verify with DevTools frame stats on mid-range  
  Android. LoAF (long-animation-frames) is the standard jank tool.
- **Reduced motion:** the consensus is **soften, don't kill** — per-property (kill transform/rotate, keep  
  opacity), the `0.01ms` trick to keep `transitionend` alive, and a shared `data-motion` attribute that  
  both CSS and JS read.

## 1.4 Performance signatures (results/performance-signatures.md)

- 2026 thresholds unchanged: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (p75). LCP remains the hardest (~68 %  
  of origins good per HTTP Archive May 2026).
- Community budgets: HTML 30–50 KB · CSS ~50 KB · JS 150–200 KB · images 600–700 KB · fonts ≤ 100 KB,  
  third-party ≤ 100 KB tracked separately. Fonts: preload + `font-display: optional`.
- `content-visibility: auto` + `contain-intrinsic-size` for long pages; AVIF+WebP default;  
  `fetchpriority="high"` only on the LCP hero; lazy strictly below the fold.
- React 19.2 `<Activity>` is stable (pre-rendering for instant tab switches); Vite 8 ships **Rolldown**.

## 1.5 Art direction & typography (results/art-direction-typography.md)

- Serif revival confirmed (Typewolf 2026: Ogg, GT Super, Tiempos; new GT Canon, Edgar, Die Grotesk),  
  `clamp()` fluid scales standard, `text-wrap: balance/pretty` standard; kinetic type called  
  "overpromised" in a May 2026 reality check.
- oklch is the default colour space; dark-theme craft = stepped lightness, never pure black; two luxury  
  directions: dark cinematic + muted gold, or quiet-luxury warm neutrals.
- Layout: bento held up, anti-grid brutalism is the late-2026 counter-movement; SVG `feTurbulence` grain  
  overlays; sticky storytelling; horizontal scrollers.
- Fragrance PDP conventions extracted: note pyramids, sensory microcopy, quizzes, 360/AR, sticky ATC,  
  gifting checkout, scent filters. Cursors: mix-blend-mode difference, GSAP lerp rings.

## 1.6 Accessibility & reduced motion (results/a11y-reduced-motion.md)

- WebAIM Million 2026: 95.9 % of home pages fail; ARIA-heavy pages average **more** errors than  
  native-first ones → prefer `<dialog>`, popover, invoker over hand-rolled widgets.
- Notable: scroll-driven animations **do not** automatically respect `prefers-reduced-motion` — explicit  
  gating is required. The Lando Norris SOTY's authors admit reduced-motion was never shipped.
- Focus practice: save/restore `document.activeElement`, deterministic focus moves, persistent polite  
  live regions for cart announcements, `inert` on background.

---

# Part 2 — Measured reality of `/app` (live audit, 2026-10-13)

## 2.1 The four surfaces

| Route                                                                                                                                      | What it is                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                                                        | The **original legacy site** (3.8 MB HTML, 185 hand-authored product sections, 862 KB `script.js`). Still the default home on all hosts. |
| `/app`                                                                                                                                     | The React 19 "atelier" app — this audit's subject.                                                                                       |
| `/app/faithful`                                                                                                                            | A byte-exact React re-assembly of the legacy document (legacy scripts replayed in order).                                                |
| `/app/collection`, `/app/collection/:id`, `/auth`, `/cart`, `/profile`, `/favorites`, `/guides`, `/contact`, `/news`, `/loyalty`, `/admin` | The atelier's 11 lazy-loaded routes (custom `routed()` chunk loader with pointer/focus preloading — not `React.lazy`).                   |

## 2.2 Performance (measured, desktop 1440×900 + mobile 390×844)

| Metric                           | Home                     | Collection                                   | PDP | Faithful (legacy replica) |
| -------------------------------- | ------------------------ | -------------------------------------------- | --- | ------------------------- |
| Document HTML                    | **14 KB**                | 57 KB                                        | —   | **4,805 KB**              |
| DOM nodes                        | **190**                  | 935                                          | —   | **71,738**                |
| CSS applied                      | 34 KB / 279 rules        | 52 KB / 421 rules                            | —   | 2,750 KB / 20,045 rules   |
| `!important` in CSS              | **7**                    | 7                                            | —   | **44,173**                |
| LCP                              | **648 ms**               | 912 ms                                       | —   | 2,096 ms                  |
| Console errors / failed requests | **0 / 0**                | 0 / 0                                        | —   | 0 / 0                     |
| First-load JS                    | 103 KB br (`index-*.js`) | + 89 KB br (`catalog-*.js`, on route intent) |     |                           |

Initial payload ≈ **140 KB compressed** (index 331 KB raw + client 50 KB raw + CSS 44 KB raw) —  
inside the community budget of §1.4. Route transitions are JS-owned (Lenis glide + CSS beat) and  
work; reduced motion shortens but never disables them (a deliberate documented decision).

## 2.3 Data reality of the 752-reference catalogue (measured from the built chunk)

| Property                                  | Count   | Share      |
| ----------------------------------------- | ------- | ---------- |
| Local artwork (`imageKind: "local"`)      | **72**  | 9.6 %      |
| Remote artwork (legacy home-section URLs) | 23      | 3.1 %      |
| **Typographic monogram tiles**            | **657** | **87.4 %** |
| Marked **available**                      | 198     | 26 %       |
| Marked **sold out**                       | **554** | 74 %       |
| With note pyramid (`tiers`)               | 63      | 8.4 %      |
| With note-strength `metrics`              | 65      | 8.6 %      |

The vitest-free pipeline documents this as deliberate ("a deliberate typographic treatment"), and the  
monogram tiles are visually consistent — but against the award corpus, the grid reads as 87 % empty.

## 2.4 Modern-CSS usage: defined vs. actually used

The audit grepped the live, post-build CSS. Defined in `tokens.css` (excellent) vs. used in the app:


| Feature                                                                                        | In `tokens.css` | Used on a real element                                        |
| ---------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------- |
| `animation-timeline: view()` reveals (`.reveal`)                                               | ✅               | **1 element** (Home visit-card)                               |
| Staggered group (`.reveal-group`, `sibling-index()`)                                           | ✅               | **0**                                                         |
| `content-visibility: auto` (`.virtual-block`)                                                  | ✅               | **0**                                                         |
| View transitions (`view-transition-name: page`, `::view-transition-group(*)`)                  | ✅               | **never triggered** — `startViewTransition` is called nowhere |
| `@starting-style` (panel entry)                                                                | ✅               | yes — panels (account pop, etc.)                              |
| `linear()` spring easings                                                                      | ✅               | yes — buttons/panels                                          |
| `oklch()` token system + light theme                                                           | ✅               | yes — every surface                                           |
| `text-wrap: balance/pretty`                                                                    | ✅               | yes — headings/body                                           |
| `<dialog>` / popover / `commandfor` / `inert`                                                  | ❌               | overlays are hand-rolled React                                |
| anchor positioning, `if()`, `@function`, `@mixin`, `interestfor`, `scroll-state()`, grid-lanes | ❌               | —                                                             |

Browser support in the audit Chromium confirms all of these are usable today except cross-document view  
transitions and `@mixin`.

## 2.5 Accessibility snapshot (measured)

Good: `h1` exactly one per page, **0 unnamed buttons**, **0 unlabelled inputs** on `/app` routes, 17–51  
`aria-label`s, `aria-pressed` on toggles, `role="region"`/`aria-current` on the pager, `lang="fr"`,  
`dir` switches to `rtl` for Arabic.  
Gaps (from code review): no focus trap in `Discover`, `Guides` tour, `AvatarEditor`, `adminKit` `Modal`  
(only `DetailDrawer` — itself dead code — does it right); tablists not arrow-navigable; GlobalSearch  
results lack `aria-activedescendant`/arrow keys; destructive actions use `window.confirm`; some status  
changes are silent (no `role="status"`); `/faithful` inherits the legacy page's 14 unnamed buttons and  
201 unlabelled inputs.

---

# Part 3 — Gap analysis: what the smoothest sites have that `/app` doesn't

Ranked by (impact on perceived quality × fit for a perfume storefront) ÷ effort. Evidence references  
point to Part 1/2.

### G1 — The motion system is defined but not wired in (the #1 gap)

`tokens.css` ships `.reveal`, `.reveal-group`, `.virtual-block` and view-transition rules; the app uses  
one reveal, zero groups, zero virtual blocks, and never triggers a view transition (§2.4). Award sites  
are ~29 % scroll-linked and put the craft budget into *transitions between states* (§1.1). **The grid  
and the PDP had no item-level choreography, and no transition existed between a card and the product it  
becomes.** This is not a library problem; it is one afternoon of class names plus a `startViewTransition`  
call.

> **Status: implemented and verified 2026-10-13.** Route changes were already choreographed  
> (`RouteTransition.jsx`: Lenis exit glide, section-staggered rise) — that part was never missing, and  
> the author's own note records why a *page-level* view transition was rejected. What shipped since:  
> `.reveal-group` on the collection grid, the PDP "same spirit" list and both favourites grids  
> (scroll-driven `view()` timeline, `sibling-index()` stagger, no CLS), plus a shared-element morph from  
> the clicked card's media to the PDP hero through the View Transitions API — scoped to one named pair  
> of 3/4 boxes, with the stage's own `view-transition-name` dropped for the duration so nothing but the  
> viewport-sized root cross-fades. Measured: 772 ms end to end, group `cubic-bezier(0.16,1,0.3,1)`,  
> pure translation with a constant 0.75 aspect (no stretch), pair opacity summing to 1.00 at every  
> frame, zero console errors on all paths (normal, reduced-motion fallback, browser back, scrolled  
> click, two morphs in a row while the previous hero still held the name).

### G2 — No immersive product presentation

WebGL on 42 % of SOTDs, 3D on 32 % (§1.1); fragrance PDP conventions include 360°/AR and scroll-scrubbed  
product inspection (§1.5). `/app` has: flat tiles, 657/752 monograms, a single product JPEG on the PDP  
with no zoom. **The single largest craft gap for a *perfume* site specifically** — bottles are the product.

### G3 — Content depth under the motion

63/752 note pyramids, 554/752 sold out (§2.3). The smoothest sites are motion *plus* editorial substance.  
Right now a PDP mostly answers "Composition: —". No amount of `animation-timeline` compensates.

### G4 — Hand-rolled overlays where the platform now does it for free

`<dialog>` + `commandfor` + `popover="hint"` + `interestfor` + `inert` are all shipping (§1.2), remove JS,  
and fix the focus-trap class of a11y bugs at the same time (WebAIM: native-first pages have fewer errors,  
§1.6). Current overlays (Discover, tour, modals) re-implement Escape/overflow-lock and still lack traps.

### G5 — No craft chrome layer

Custom cursors (mix-blend difference / lerp rings), magnetic buttons, pointer-reactive fields, grain  
overlays (`feTurbulence`) are the signature textures of 2026 luxury sites (§1.5). Zero of them are  
present. All are optional — but this is the layer that reads as "expensive".

### G6 — Typography is CDN-borrowed

Fraunces + Inter load from Google Fonts with the `media=print` swap (§2.2 audit: exactly one preload, the  
CSS). 2026 practice: self-hosted variable subsets, `font-display: optional`, `text-box: trim-both cap
alphabetic` and optical sizing — none present (§1.5).

### G7 — The homepage doesn't show the shop

The React home renders 190 nodes: hero + note form + concierge + one visit card (§2.2). It **fetches the  
185-section content file just to count items** (`useSections` → a number). The site's actual identity —  
the 185-section product run — exists only in the legacy page at `/` and its replica at `/app/faithful`.  
A visitor to `/app` sees a beautiful shop window with no shelves.

### G8 — Reduced motion uses the "kill" model

`index.css` collapses **all** animation durations to 0.001 ms under `prefers-reduced-motion`, which also  
kills the scroll-driven reveals. 2026 consensus is per-property *softening* plus a shared `data-motion`  
flag, and remembering that scroll-driven animations don't auto-respect the query (§1.3, §1.6).

### G9 — No performance/parity guardrails in the repo

Numbers above are good, but nothing enforces them: no Lighthouse CI / `size-limit` / budget file, no  
RUM, no CI check that the committed `public/app` build matches `frontend/src` (the working tree is  
currently **dirty** — 9 modified sources and a set of stale committed asset hashes). Three hosts deploy  
from one committed build with no verification step (§1.4 tooling).

### G10 — Small stuff

No `fetchpriority` on catalog imagery; no AVIF/WebP pipeline for the `/app` surface (73 KB hero JPG);  
`src/components/*` (FragranceCard, FilterBar, DetailDrawer) + `src/lib/palette.js` + `src/App.jsx` are  
dead code (nothing imports them); `src/components` is the one area without i18n (hardcoded English).

---

# Part 4 — Design & CSS assessment

**What is right (measured, not vibes):** a real token system — `oklch()` palette with relative-colour  
derivation, fluid `clamp()` type scale, spacing/radius scales, `linear()` spring easings sampled from a  
damped-spring equation, staggered motion tokens, dark/light via `[data-theme]`. CSS is tiny and clean  
(34 KB, 279 rules, **7** `!important` — versus the legacy estate's 44k). Typography is on-trend  
(Fraunces serif display + Inter body, `text-wrap: balance`). The dark palette (elevated surfaces, brass  
accent) matches the "dark cinematic + muted gold" luxury direction (§1.5). The route-transition  
engineering (outgoing glide, `shown`/`live` dual-location to avoid triple-mount flicker, chunk preloading  
on pointer/focus, 1200 ms give-up timer) is genuinely better than most production SPAs.

**What the design lacks against the 2026 corpus:** texture (no grain), any asymmetric/bento moment,  
any use of the oversized-type editorial move beyond the hero, a light theme that has clearly been  
art-directed (the `[data-theme="light"]` block exists but the hero imagery/stat blocks aren't retuned),  
and — per the screenshots — a grid whose 87 % monogram tiles lack hierarchy treatment (all tiles look  
equally "empty", so nothing reads as featured).

---

# Part 5 — If only five things were done

1. **Wire the motion system in** (G1): `.reveal-group` on the grid/PDP, `.virtual-block` on cards,  
   one `document.startViewTransition` around the route beat. Turns 30 KB of dormant tokens into the  
   site's felt quality.
2. **Fix the content layer** (G3, G7): put the 185 real sections (already extracted at  
   `public/data/home-sections.json`) on the home; fill note pyramids from the same file; stop showing  
   "sold out" on 74 % of the grid unless the data says so per-store.
3. **Bottle-first PDP** (G2): a large, zoomable, scroll-scrubbed hero image (the local PNGs average  
   300–900 KB and exist for ~90 items), 360° spin where artwork exists.
4. **Platform-native overlays** (G4, G5): dialog/popover/invoker + focus traps + `data-motion`  
   softening; a subtle grain overlay and blend-mode cursor as the chrome layer.
5. **Guardrails** (G9): `size-limit`/Lighthouse-CI budget file and a CI check that `public/app` is  
   rebuilt from `frontend/src` before deploy.

---

## Artifacts in this investigation

| File                                                                   | Contents                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `_recon/deep-research-smooth-2027/outline.yaml`, `fields.yaml`         | research plan (7 items, 6 fields)                                |
| `_recon/deep-research-smooth-2027/results/award-winning-mechanics.md`  | winners, mechanics, juror criteria, stacks                       |
| `_recon/deep-research-smooth-2027/results/modern-css-production.md`    | shipping CSS feature table + pitfalls                            |
| `_recon/deep-research-smooth-2027/results/motion-engineering.md`       | easing, library state, choreography, frame budget                |
| `_recon/deep-research-smooth-2027/results/performance-signatures.md`   | CWV thresholds, budgets, React norms                             |
| `_recon/deep-research-smooth-2027/results/art-direction-typography.md` | type/colour/layout trends, fragrance PDP conventions             |
| `_recon/deep-research-smooth-2027/results/a11y-reduced-motion.md`      | reduced-motion patterns, focus practice                          |
| `_recon/deep-research-smooth-2027/audit-out/audit.json`                | full live-audit JSON (4 runs)                                    |
| `_recon/deep-research-smooth-2027/audit-out/*.png`                     | screenshots: home 1440, collection 1440, PDP, home 390, faithful |
| `_recon/deep-research-smooth-2027/audit-app.cjs`, `catalog-stats.cjs`  | re-runnable audit scripts                                        |

Confidence: high for all measured `/app` numbers and library versions (audited directly / corroborated);  
medium for mechanic percentages (secondary sweep); web.dev was unreachable during research, so CWV  
thresholds are corroborated via aligned secondary sources.
