# Legacy → React parity report (Gate A–D evidence)

**Date:** 2026-10-07
**Scope:** build-time React static rendering of the legacy homepage. Runtime behaviour is still
owned entirely by the legacy JavaScript. Nothing is hydrated.

---

## 1. What was built

| Artefact | Role |
| --- | --- |
| `scripts/extract-legacy-sections.cjs` | Extracts all **185** product `<section>` wrappers (**186** products) losslessly from `public/index.html`, preserving original case, class/ID exceptions and the nested Haltane block. `--check` re-verifies the fixture byte-for-byte. |
| `frontend/src/legacy/legacy-sections.json` | Deterministic fixture: metadata + `rawHtml` per section. 2,884 unique captured IDs. |
| `frontend/src/legacy/document-shell.json` | The **186 untouched chunks** around the sections — head, inline boot scripts, modals, 114 spacers, footer. |
| `frontend/src/legacy/LegacyProductSections.jsx` | The real React component. Emits the original `<section class=… id=…>` roots with captured inner HTML and **no added wrapper**. |
| `scripts/build-legacy-page.mjs` | Interleaves React-rendered sections with the shell chunks to rebuild the whole document. `--check` asserts byte equality; `--write` promotes it to `public/index.html` (only when equality passed). |
| `scripts/verify-legacy-fixture.mjs` | Renders the **actual exported component** through Vite SSR and asserts exact bytes. |

Commands: `npm run extract:legacy`, `npm run check:legacy`, `npm run build:legacy`.

## 2. Static result — exact, not approximate

```
Built 185 sections / 186 products using the actual React component.
Document: 3798060 bytes; SHA-256 c807eec22374eb14363aeb4d0e03c3317a103bf9e1121cb613ead9a5af207e8b
Full-document equality: PASS (byte-for-byte)
```

`public/index.html` is now produced by this pipeline. After `--write`:

```
sha BEFORE c807eec2…207e8b
sha AFTER  c807eec2…207e8b
git status --short public/index.html   → (empty)
git diff --stat -- public/index.html   → (empty)
```

So the pipeline is authoritative and the live file is unchanged. Rollback is
`git checkout -- public/index.html`.

## 3. Browser result — 10 paired cases, real Chromium

Matrix: widths 390 / 1440 × locales fr / en / ar × themes night / light × modes details / grid.

| Check | Result |
| --- | --- |
| DOM attribute signature (every element, ordered) | **10/10 identical** |
| Visible text signature | **10/10 identical** |
| Sampled computed styles | **10/10 identical** |
| `/api/*` request list | **10/10 identical** |
| Page exceptions | **10/10 zero** |
| Section / product counts (185 / 186) | **10/10 correct** |
| Screenshot pixels | 7/10 exactly zero; 3/10 differ by **13 px, max channel delta 1** |

## 4. The 13-pixel difference is the legacy page's own jitter — proven, not asserted

A first strict run (fixed 2.2 s timeout) reported 6 failures. Two things were wrong with
concluding "the React build is different" from that:

1. it sampled an asynchronous pipeline at an arbitrary moment, and
2. it had no noise floor.

Both are now measured.

**The pipeline being sampled** — `public/js/note-image-resolver.js:1022-1043` re-runs
`applyHomepageFragranceCorrections()` at boot, on `load`, at +400 ms and at +1400 ms.
`applySectionCorrection` (`:838-857`) picks `root.querySelector('.' + imageClass) ||
root.querySelector("img")` — which resolves to the **bottle template** once `script.js` bottle
enhancement strips the real image's class. Grid mode clones `.bottle-render` markup
(`script.js:22420-22452`, rebuilt on `bottleRendersReady`), so whether a clone captures corrected
or uncorrected attributes is a race.

**The noise floor** — `_recon/control-stability.cjs` captures the *same URL* 3× per matrix cell:

```
390  fr night grid    dom=UNSTABLE  bottles=UNSTABLE
1440 fr night grid    dom=UNSTABLE  bottles=UNSTABLE
1440 en night details pixels=UNSTABLE (2 px)
390  fr night details pixels=UNSTABLE (3 px)
CONTROL RESULT: legacy page is NOT self-stable across 3 identical captures per case
```

**Stabilized comparison** — `_recon/compare-stabilized.cjs` boots in details mode, registers
`bottleRendersReady` before navigation, enters grid through the real
`.perfume-mode-btn[data-mode="grid"]` control, then waits for **DOM quiescence** (poll the full
attribute signature until it is unchanged for 5 consecutive polls) instead of a fixed timeout.
Quiescence removed **every** DOM difference: 10/10 clean.

**The residual, located** — the 3 remaining cases differ in a single 6×16 box at x 220-225,
y 384-401, on a green gradient, **every delta ±1 on one channel** (max channel delta = 1, i.e.
13 of 1,296,000 pixels). The Arabic case is the exact mirror of the French case (59→60 vs 60→59):
the raster simply lands on the other side of an anti-alias rounding.

**The decisive step** — the same quiescence harness run with `CONTROL=1` (baseline vs *baseline*)
fails on the same two configs with the **same 13 coordinates and the same RGBA values**:

```
CONTROL (baseline vs baseline)
1440 ar details  changedPixels=13  bbox x:220-225 y:386-401  maxDelta=1
1440 fr grid     changedPixels=13  bbox x:220-225 y:384-399  maxDelta=1
```

Two captures of the same page produce it. It is therefore pre-existing rasterisation jitter in the
legacy page, not a property of the React output. No tolerance, masking or CSS override was used
anywhere; the failed evidence from the first run is preserved at
`outputs/migration-parity/cold-load-comparison.json`.

## 5. Behavioural smoke — 6 groups, both sides

`_recon/legacy-smoke.cjs`, real Chromium, real controls:

- Language transitions EN → AR/RTL → FR
- Actual `#themeToggle` toggles light/night
- Actual product cart button writes the guest cart under the original key
  `parfumerie_cart_guest` with `productId` preserved
- Cart quantity update, `dt` total, modal open/close, removal
- Actual view toggle switches details → grid → details
- Zero page exceptions during all interactions

## 6. What is explicitly NOT done

Do not read this report as "the site is migrated".

- **No runtime ownership transfer.** `script.js` and every file in `public/js/` still own all
  behaviour. React only produces the static document at build time.
- **No hydration.** Byte-identical HTML does not make hydration safe; legacy code clones buttons,
  wraps images, inserts nodes and rewrites translations at runtime. Whole-document hydration stays
  forbidden until that ownership is exclusive.
- **No i18n port.** The DOM-substitution engine (`public/js/i18n.js`, FR 1,929 / AR 1,191 entries,
  388 protected terms) is untouched and still the source of truth.
- **No CSS change.** The 2.9 MB stylesheet estate is served verbatim; Tailwind still does not touch
  legacy surfaces.
- **Not covered by these captures:** authenticated and admin flows, reviews/replies/likes write
  paths, guest→login cart/favourites switching, preloader frame-by-frame timing, full-page (not
  viewport) screenshots, and the Vercel / Render / GitHub Pages hosts themselves.
- **The homepage still must not be rendered from `public/data/fragrances.json`** — only 18 of 185
  section slugs and 81 of 186 names overlap that 752-item catalogue.

## 7. How to re-verify

```bash
npm run check:legacy                    # fixture + component byte equality
npm run build:legacy                    # full-document byte equality

# Browser (needs the Express server; start it in the SAME shell as the harness)
NODE_PATH="C:/Users/cheri/.workbuddy-ai/binaries/node/workspace/node_modules" \
  node _recon/compare-stabilized.cjs                 # baseline vs React candidate
CONTROL=1 node _recon/compare-stabilized.cjs         # baseline vs baseline noise floor
node _recon/control-stability.cjs                    # 3x repeat instability per cell
node _recon/legacy-smoke.cjs                         # behavioural smoke
node _recon/diff-signatures.cjs                      # file-only DOM diff, no browser
node _recon/locate-pixel-diffs.cjs <dir> <a.png> <b.png>
```

Always read a failure against the control before calling it a regression.
