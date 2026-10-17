# Tutorial films — the full set, and what was wrong with getting there

2026-10-17. Supersedes the "what cannot be done here" section of the first
draft of this file, which claimed the missing films could not be produced. That
was wrong, and the proof is in the repository: `_recon/guide-video/` is a
complete render pipeline, not a folder of hand-recorded footage.

---

## 1. The films are rendered, not filmed

`_recon/guide-video/` contains the machine that makes them:

| Stage | Tool | Output |
|---|---|---|
| `validate.cjs` | — | fails a shoot whose selectors don't resolve |
| `demo/seed.cjs` | — | reseeds an invented database, so no real customer is ever on camera |
| `narrate.py` | edge-tts 7.2.8 | one MP3 per beat, French neural voice |
| `render.cjs` | Playwright | per-frame captures with a camera pan and spotlight |
| `build.py` | ffmpeg | title cards, `subs.ass` subtitles, muxed master |
| `audit.py` | ffprobe/ffmpeg | frame-jump, brightness-spike and narration-sync checks |
| `publish.py` | ffmpeg | CRF 24 web copy, poster frame, `guideVideos.js` |

`script.json` is the only authoring surface. One command shoots the lot:

```
python make.py auth contact favorites      # named guides
python make.py --from admin-redeem         # that guide onward
```

`make.py` shoots against the demo instance on port 3100, never the dev server,
because the live database holds real customers.

## 2. Every guide now has a film — 24/24

The eleven added, all with the same voice, title cards and chapter list as the
back-office series:

| Film | Beats | Film | Beats |
|---|---|---|---|
| `navigation` | 6 | `cart` | 6 |
| `search` | 6 | `cart-handoff` | 11 |
| `collection` | 6 | `account` | 6 |
| `finder` | 5 | `favorites` | 6 |
| `product` | 7 | `contact` | 5 |
| `auth` | 10 | | |

Total web copies: 116.7 MB across 24 MP4s and 24 posters.

Verified in the browser, not inferred: `video-audit.cjs` reports 0 integrity
problems and 0 guides without a film; the auth film loads at `readyState 4`,
plays, advances, reports 1922×1080 and 57.5 s, and clicking its 0:19 chapter
moves `currentTime` from 30.6 to 19.2.

## 3. Six real bugs the first shoots exposed

Every one of these produced a *late* failure — the shoot died at a later beat,
so the message pointed at an innocent selector.

**Clicks were landing on empty page.** `render.cjs:385` uses `beat.cursor` in
preference to the position derived from the measured spotlight, and clicks
there (`render.cjs:583`). Those coordinates were hand-written against a
~1440-wide layout; the renderer shoots at **1920×1080** and the auth form is
centred, so a click aimed at x=520 hit nothing. This presented as five
unrelated "missing selector" failures. Dropping `cursor` from beats that click
let the renderer derive the position, which cannot be wrong. The existing films
mostly already did this — 36 of their 54 clicking beats carry no `cursor`.

**`measure()` does not wait.** It throws the instant a beat's target is
missing, unlike the `do` actions which use `waitForSelector`. 54 beats that
follow a click had no `settle`, so a slow mount looked like a missing element.

**An ambiguous hook.** `data-guide="cart"` is on both the Shell nav link and
Cart.jsx's own `<main>`. `document.querySelector` silently took the nav link, so
the film rendered; the post-fade recovery click uses `page.locator`, which is
strict mode, and threw `resolved to 2 elements`. Scoped to
`a[data-guide="cart"]`.

**The hand-off form is behind a button.** Cart.jsx renders the name/phone/note
form only when `checkout` is true, set by the button at the foot of the
summary. The script went straight to the form.

**A required field was left blank.** Both name and phone are `required`. The
script filled only the name, so the browser silently refused the submit — the
film ended on a form that refused to go anywhere, with no error on screen.

**A hook pointed at an element that cannot exist.** Sending the basket calls
`clear()`, so the confirmation renders in the *empty-cart* branch. The
`cart-handoff-done` hook was on the paragraph inside the summary column, which
is never rendered once the order is sent.

## 4. Three fixes to the pipeline itself

- **`render.cjs` can now shoot signed out** (`authState: "signed-out"`). It
  always injected a valid token, so `/app/auth` bounced straight off and the
  sign-in guide was literally unfilmable — the one journey that must be shown
  from a signed-out state, and the only one the app refuses to render to a
  signed-in viewer.
- **`validate.cjs` reads conditional hooks.** `data-guide={i === 0 ? "card" :
  undefined}` compiles to `` "data-guide":n===0?`card`:void 0 ``. The old
  pattern only read the plain string form and reported `card` as unknown,
  blocking four shoots that would have worked.
- **`Cart.jsx` gained two hooks** (`cart-checkout`, and `cart-handoff-done` on
  the empty state), so the journey is addressable.

## 5. The interactive tours are still reachable

Once every guide has a film the film takes the card's main action, which would
have made the eleven spotlight tours unreachable. Filmed cards now carry a
secondary **Interactif** button (19 of 24 cards have one; the five without steps
are film-only by design). The `guideTour` string already existed in all three
languages.

## 6. Still open

`guideVideos.js`, `public/media/guides/` and `_recon/` were already dirty from
another agent, so publishing overwrote files in a directory this work was told
not to commit. The films, the regenerated data file, and the FILM/`Interactif`
wiring are therefore on disk and working, but not in a commit.