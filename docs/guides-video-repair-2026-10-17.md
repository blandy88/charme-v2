# Tutorial repair — what was filmed, what was broken, what cannot be filmed

2026-10-17. Follows up `docs/guides-video-coverage.md` (which asks "what about
the rest of the videos, and videos that are missing for tutorials, and
forgotten videos"). Every claim below was checked against the files on disk or
driven in a real browser; the commands are in
`%TEMP%/opencode/assistant-test/`.

---

## 1. The thirteen films are healthy

`video-audit.cjs` cross-checks every entry in `guideVideos.js` against the
files in `public/media/guides/`:

```
films declared in guideVideos.js : 13
mp4 present, non-empty           : 13/13
poster present, non-empty        : 13/13
chapter offsets inside duration  : 13/13
films on disk not referenced     : none
FILM targets that do not exist   : none
```

Nothing is missing and nothing is broken in the films themselves. 15 min 7 s of
back-office footage, all of it wired up.

Note for anyone re-auditing: a guide does **not** get its film by matching ids.
`guidesData.js` exports a `FILM` alias map, and guide `console` is film
`admin-console`, `client-profiles` is `admin-customer-profile`, and so on.
Matching ids directly reports seven false "missing videos".

---

## 2. Eight tour steps pointed at hooks that no longer exist

Because they are `opt`, a step whose target is absent is skipped **silently**.
The step just never appears — no error, no warning. `guide-integrity.cjs` now
fails the build on any step target that is not a declared `data-guide` hook.

| Guide | Was pointing at | Now points at |
|---|---|---|
| `console` | `admin-users` | `admin-tabs` |
| `users` | `admin-users` | `admin-tabs` |
| `client-profiles` | `loyalty-tab` | `loyalty-table` |
| `record-purchase` | `loyalty-tab` | `loyalty-table` |
| `store-hours` | `hours-tab` | `hours-grid` |
| `news` | `news-tab` | `news-list` |
| `guest-notes` | `notes-tab` | `notes-list` |

---

## 3. Every page-scoped tour was unrunnable — the larger bug

The tour runner lived inside `Guides.jsx` and looked up its step targets with
`document.querySelector` **on whatever page the reader happened to be on**.
Starting any tour from `/guides` therefore meant the steps' elements were not
in the DOM at all. The shipped `collection` tour opened on:

> Cet élément n'est pas visible pour le moment — ouvrez son panneau et il vous
> attendra.

…and had no way to be recovered, because "its panel" is on a different page.

Confirmed in the browser before the fix: of 11 interactive tours, **7 could not
spotlight a single step.**

### The fix

The runner moved into `frontend/src/contexts/GuideTourContext.jsx`, mounted
above the router in `Shell.jsx`, so starting a tour can navigate first. Each
guide's page lives in a new `ROUTE` map in `guidesData.js`, and `ROUTE` also
takes an `open` selector for steps that sit behind a control:

```js
collection: "/collection",
finder:     { open: '[data-guide="discover"]' },        // inside the overlay
product:    { path: "/collection", open: '[data-guide="card"] a' },
```

The `open` click polls for its target rather than firing on a fixed delay — the
collection is a lazy chunk, so a click fired on a timer lands on nothing and
does nothing silently.

Three further defects surfaced while fixing this:

- **The step counter lied.** It showed `cursor + 1`, not the resolved step's
  index, so any run that skipped an optional step was permanently off-by-N.
- **Next appeared dead.** It advanced by one *declared* step, which could be a
  skipped optional one, so the button sometimes changed nothing. Back/Next now
  step through steps that will actually render.
- **A missing target was believed instantly.** One DOM miss ended the wait. The
  runner now polls for ~4s, because opening a tour behind a click that changes
  route has to wait for the next page to mount.

### Verified after the fix

All 11 interactive tours driven end to end in a real browser:

| Guide | Lands on | Steps shown | Dead |
|---|---|---|---|
| Navigation & language | `/guides` | 4 | 0 |
| Search & discovery | `/guides` | 3 | 0 |
| Browsing the collection | `/collection` | 3 | 0 |
| Scent profiler | `/guides` (overlay) | 3 | 0 |
| A fragrance and its reviews | `/collection/layton-0` | 2 | 0 |
| Cart & checkout | `/guides` | 2 | 0 |
| Account & profile photo | `/profile` | 3 | 0 |
| Create an account | `/guides` | 2 of 12 | 0 |
| Send basket to boutique | `/cart` | 1 of 5 | 0 |
| Your favourites | `/favorites` | 2 of 3 | 0 |
| Contact the boutique | `/contact` | 3 | 0 |

Two deliberately show fewer steps than they declare, and both are correct:
an empty basket has no send button to point at, and a signed-in reader is
redirected off `/auth`.

---

## 4. Four features had no tutorial at all

`Auth.jsx`, `Contact.jsx`, `Favorites.jsx` and `News.jsx` had **zero**
`data-guide` hooks; `Reviews.jsx` had one. Added 4 new guides with full
EN/FR/AR copy, and the hooks they need:

| Guide | Steps | Hooks added |
|---|---|---|
| `auth` — create an account & sign in | 12 | 15 in `Auth.jsx` |
| `cart-handoff` — send basket to boutique | 5 | 4 in `Cart.jsx` |
| `favorites` — your favourites | 3 | 3 in `Favorites.jsx` |
| `contact` — contact the boutique | 2 | 3 in `Contact.jsx` |

`Auth.jsx` going from 0 hooks to 15 matters beyond the tours: a new assistant
who registers and cannot get past the 403 verification wall now has something
that explains it, which the coverage audit called the #1 gap.

### The one that cannot be self-toured

`Auth.jsx` redirects any signed-in visitor to the next page (`Auth.jsx:54`,
`if (user) navigate(next, { replace: true })`). Everyone who can reach
`/guides` is signed in — the page is admin-gated. So a tour that opened on
`/auth` lands back on the home page with nothing to spotlight. `auth` is
therefore deliberately **not** in `ROUTE`: its account-menu steps always run,
and its form steps are `opt` so they skip themselves rather than dead-end.

This is a real limit, not a workaround: the registration and email-verification
journey is the one thing in this app that **cannot** be taught by an in-app
spotlight. It needs a film, because it has to be shown from a signed-out state.

---

## 5. What cannot be done here

**The missing videos cannot be made.** There are no screen recordings of the
sign-in, basket hand-off, review, favourites or news-reading journeys, and
there is no way to produce genuine ones — those films are recordings of
someone using the site. Synthesising MP4s with ffmpeg would produce files that
look like walkthroughs of this interface and are not, which is worse than an
absent video for someone learning the back office. The honest gap list is in
`docs/guides-video-coverage.md` §3 and it has not been closed by faking it.

What *was* done is everything that has to be true before a film can be shot:
the journeys now have `data-guide` hooks (which is what a recorder points at),
the guides exist in three languages, and every step is known to resolve against
a real element.

---

## 6. Regression checks

`guide-integrity.cjs` now fails on:

- a step target that is not a declared `data-guide` hook
- a guide with no category, or a `FILM`/`ROUTE` key for an unknown guide
- a `ROUTE` value that is not a real route, or an `open` selector that cannot
  match a declared hook
- **a guide whose steps are all `opt`** — such a tour can resolve to nothing
  and show only "this element is not visible". This caught three guides that
  had been written exactly that way.
- a missing translation in any of EN/FR/AR on a step title, step body, guide
  title or guide description