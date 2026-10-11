# Atelier gap audit — legacy `public/index.html` vs. React `/app`

Read-only investigation of the legacy surface (3.8 MB `public/index.html`, 856 KB
`public/script.js`, `server.js` 48 endpoints) compared against the rebuilt Atelier surface.
Purpose: find everything the rebuild is still missing, so nothing is dropped again.

Sources: `_recon/legacy-inventory.md`, `_recon/scriptjs.md`, `_recon/product-blocks.md`,
`_recon/recon-out.md`, `_recon/extracted/**`, `_recon/extracted/admin/**`,
`_recon/i18n.md`, `admin-snapshot.md`, direct extraction from `public/index.html`.

## 0. Legacy file facts

| Item | Value |
| --- | --- |
| `public/index.html` | 3,798,060 B · 29,372 lines · 30,987 `<div>` · 3,162 ids |
| `public/script.js` | 856 KB · 22,934 lines · 67 `fetch()` |
| `server.js` | 166 KB · 4,915 lines · 48 unique `/api/*` routes |
| Per-product blocks | 185, each with its own review UI (rating, text, list, count, load-more) |
| Modals / overlays | 28 chrome + feature blocks |

## 1. Chrome / feature blocks (28) — status in Atelier

| # | Legacy block | Atelier | Gap |
| --- | --- | --- | --- |
| 1 | Brand loader | ✅ Overlays (CSS) | — |
| 2 | Navbar | ⚠️ partial | see §2 |
| 3 | Quick search (inline dropdown) | ✅ GlobalSearch | — |
| 4 | Full-screen search modal + suggestion tags | ✅ GlobalSearch panel | — |
| 5 | **Enhanced Ingredient Finder modal** | ✅ discovery overlay › Ingredient Finder | see §3c |
| 6 | **Scent Profiler (AI note-matcher, `ai-fragrance-finder.js`)** | ✅ discovery overlay › Scent Profiler | see §3c |
| 7 | Profile modal | ✅ /profile | — |
| 8 | **Photo editor modal (crop / zoom / rotate avatar)** | ⚠️ plain upload only | **crop/zoom missing** |
| 9 | Favorites modal | ✅ /favorites | — |
| 10 | Settings modal | ✅ /profile settings | — |
| 11 | Cart modal | ✅ /cart | — |
| 12 | Email verification modal | ✅ /auth | — |
| 13 | **Admin dashboard modal** | ✅ `/admin` (6 tabs) | — |
| 14 | **Guest notes modal (unread badge)** | ✅ `/admin` › Notes (+ unread count) | — |
| 15 | **News composer modal** | ✅ `/admin` › News | — |
| 16 | **Carte Fidélité modal** | ✅ admin side (`/admin` › Loyalty) | customer-facing card still open |
| 17 | **Ban user modal** | ✅ `/admin` › Users | — |
| 18 | **Loyalty card edit modal** | ✅ `/admin` › Loyalty | — |
| 19 | **Customer profile modal** | ✅ `/admin` › Loyalty › profile | — |
| 20 | **Record purchase modal** | ✅ `/admin` › Loyalty › profile | — |
| 21 | Auth modal | ✅ /auth | — |
| 22 | Hero (note form + map + concierge) | ✅ Home | — |
| 23 | Floating menu | ✅ Overlays | — |
| 24 | Social rail | ✅ Overlays | — |
| 25 | Footer | ✅ Shell | — |
| 26 | Back-to-top progress ring | ✅ Overlays | — |
| 27 | Perfume-mode toggle (details/grid) | ⛔ removed | it only drove the homepage run, which is gone |
| 28 | **News modal (announcements feed + badge)** | ✅ `/news` + navbar badge | — |

## 2. Navbar (legacy) vs. Atelier nav

Legacy nav controls: Fragrances button (grid view), Profiles button, News icon + notification
badge, Cart icon + badge, **Scent Profiler icon**, Search-by-Ingredients button, quick-search
input, language selector (EN/FR/AR), theme toggle, admin badge, user menu (Profile / Favorites /
Cart / Settings / **Guest Notes · badge** / **Admin dashboard** / News admin / Logout).

Atelier has: wordmark, Home / Collection / Guides / Contact / Loyalty (signed in), search
(+ AI finder tab), **discovery button** (compass — Scent Profiler + Ingredient Finder), lang
select, theme, news link + unread badge, favourites, cart, account menu.
The **Admin** entry now lives in the account menu (`Administration & outils`), which is where the
legacy kept it and which keeps an extra admin-only link out of the 1180px primary row (that link
used to push the nav 63px past the viewport for signed-in admins between 1180–1245px).

Still missing: guest-notes badge in the user menu, Fragrances/Profiles jump buttons. (The two
finder icons the legacy had as separate nav buttons now share one compass button — see §3c.)

## 3. Secondary pages

| Route | Legacy reality | Atelier |
| --- | --- | --- |
| `/` | Homepage = chrome + 185 product sections + grid view | ✅ (fragrance list to be removed) |
| `/guides` | **Admin-only** onboarding tour (`public/js/guides.js`, `GUIDES`, 3 languages) | ❌ Placeholder |
| `/contact` | No page — "Contact" nav was `href="#"`; contact lived in footer + hero note form | ⚠️ Placeholder |
| `/loyalty` | Modal, admin-driven "5 points = 1 parfum offert" (customer view of own card) | ⚠️ Placeholder — admin side done |
| `/news` | Modal feed, admin-published | ✅ `/news` |
| `/admin` | Modal dashboard (users, loyalty, news, store hours) | ✅ `/admin` |

## 3b. Collection

Legacy renders **all** fragrances in one grid/list (no pagination) plus client filters
(note, quality, season) and a grid/list toggle. Atelier keeps the filters + grid/list and adds
the requested **numbered pagination** (24 per page, `?page=n`, gaps + prev/next + "showing a–b of n"
at the foot); any filter change drops `page` and returns to page 1.

## 3c. Discovery overlay — Scent Profiler + Ingredient Finder

Frontend/src/atelier/Discover.jsx (+ discover.css), a modal overlay reached from the nav compass
button. Both finders read the catalogue through the shared lazy loader (`lib/lazyCatalog.js`),
so neither costs anything on the critical path, and both run entirely in the browser — the
legacy's "AI" was a local weighted score and so is this one. Copy lives in
`lib/discoverI18n.js` (EN/FR/AR, English fallback per key), same convention as `adminI18n.js`.

**Scent Profiler** — 7 questions (loved notes · scent family · season · intensity · occasion ·
budget · notes to avoid) scored out of 100: notes 32 (2–4 chosen notes, each hit worth its share
plus up to 5 for how early the note sits in the ingredient list, so notes with more presence
dominate) · family 18 · season 18 · intensity 12 · occasion 10 · budget 10, minus 8 for each
ignored note group found in the bottle. Every single-choice question has a "no preference", so no
answer can be forced. Sorted best first, top 8.

Legacy scoring was the same shape — notes 35 (30 + prominence) · family 15 · season 15 · gender 15 ·
dislike penalty 10 · occasion 5 — but across 9 questions, and with three inputs ours does not need
or cannot answer: the `budget` question now uses the catalogue's real `fromPrice` (18–650 dt), the
bottle image comes from the build-time join rather than `getPerfumeImage()`, and `gender` had no
equivalent data in the Atelier catalogue.

*Adaptation*: the legacy keyed `gender` off `fragrance-catalog-data.js`, which the Atelier does
not carry — our 752 products have no `gender`/`audience` field, and the 15 `home-sections.json`
profiles that do report a GENDER are far too sparse to score 752 bottles against. Rather than
invent an answer, the `gender` question was dropped and its 15 points moved into `season` (18),
which is now answered from real data: 177 of the 185 references carry active season indicators,
which the legacy's family heuristic only guessed at. Season therefore matches where the note
pyramid agrees, and the ingredient sets carry the remaining weight.

**Ingredient Finder** — chips derived from the **catalogue itself** (all 543 distinct notes, each
with a count of stock), searchable, up to 6 at a time. Bottles are ranked by how many of the
chosen notes they carry, each row showing which of the six matched. The legacy shipped a
hard-coded icon list of ~300 notes in 11 categories; ours needs no such list, because it counts
what is actually in stock, and every chip is therefore guaranteed to resolve to a real listing.

Verified by `probe-discover.cjs` (60 checks): dialog/modal semantics, tab defaults, note
selection with `aria-pressed`, answers retained when stepping back, translated flow, restart
clearing state, close + Escape, every row linking into the catalogue, results sorted best first,
note chips with their counts, search filtering, chosen-note removal, clear, EN/FR/AR copy with
RTL, and 11 viewport widths from 320 to 1920 — including the 1180–1245px span that once overflowed
the signed-in admin nav — with no horizontal overflow.

## 4. Backend API surface (48) — usage in Atelier

Covered: auth (login, register, verify-email, resend-verification), profile GET/PUT, settings
GET/PUT, favourites GET/toggle, upload-avatar, notes POST, news GET, the whole admin surface —
`/api/stats/users`, `/api/admin/users`, ban/unban, `/api/admin/loyalty` (+ add-points, redeem,
create, update, delete, purchases, purchases/:id, profiles/:cardId), `/api/admin/news`
(GET/POST/DELETE), `/api/admin/store-hours` (GET/PUT), `/api/admin/notes` (GET/read/DELETE) — and
the reviews + replies set (9): `GET /api/reviews/:fragrance`, `POST /api/reviews`,
`PUT /api/reviews/update`, `DELETE /api/reviews/delete`, `POST /api/reviews/like`,
`GET /api/reviews/likes/:fragrance`, `GET/POST /api/reviews/:reviewId/replies`,
`POST /api/replies/:replyId/like`, `DELETE /api/replies/:replyId`.

Reviews are keyed by the Atelier product **slug** (`product.slug || product.id`), matching the
legacy's per-fragrance slug key; the `reviews` / `review_replies` tables were empty, so nothing
needed migrating.

**Still not covered:**

* `GET /api/search/loyalty-profiles` — the admin card form links a user from the
  `usersWithoutCards` list returned by `/api/admin/loyalty` instead.

## 5. Work plan

Done in the admin/pagination increment:

1. **Homepage** — the 185-piece fragrance run removed (user request); `Piece.jsx` and the dead
   `.piece*` / perfume-mode CSS deleted, and the now-inert Details/Grid overlay control removed
   with it.
2. **Collection** — numbered pagination at the foot (user request).
3. **Admin layer** — `/app/admin`: overview stats, users + ban/unban, loyalty cards (add points,
   redeem, edit, delete, new card), customer profile (preferences, brands, suggestions, purchase
   history, record/delete purchase), news composer, store hours, guest notes. Route-split and
   intent-warmed; reached from the account menu (`Administration & outils`), matching legacy.
4. **News** — `/app/news` feed + navbar unread badge.
5. **i18n** — EN/FR/AR copy for all of the above.
6. **Nav fix** — the extra admin-only primary link was moved into the account menu, which removes
   a 63px horizontal overflow that only appeared for signed-in admins between 1180–1245px.

Done in the reviews increment:

7. **Product reviews** — `frontend/src/atelier/pages/Reviews.jsx` (+ `reviews.css`), one section on
   the PDP replacing the legacy's 185 per-fragrance blocks. Rating summary with a 5–1 distribution,
   a write/edit composer with a star picker and a live counter, load-more, like/dislike toggles,
   one-level reply threads (with reply likes, reply-to-reply and deletes), owner edit/delete plus
   admin delete, and a sign-in gate for guests. Copy in EN/FR/AR. Verified by `probe-reviews.cjs`
   (36 checks incl. 320–768px overflow).

Done in the discovery increment:

8. **Discovery overlay** — `Discover.jsx` (+ `discover.css`), reached from a new nav compass button
   and shared by both finders (see §3c):
   - **Scent Profiler**: 7 questions, weighted 100-point score, top 8 with match percentages.
     `gender` dropped for want of data; its 15 points moved into a season channel now answered
     from the catalogue's real season indicators.
   - **Ingredient Finder**: all 543 catalogue notes as searchable chips with stock counts,
     ranked results over 752 bottles, no hard-coded note list.
   - `lib/lazyCatalog.js` extracted from `GlobalSearch.jsx` so the catalogue is loaded once for
     both surfaces; `lib/discoverI18n.js` holds EN/FR/AR copy with an English fallback.
   - Verified by `probe-discover.cjs` (60 checks incl. 320–1920px overflow).

Still open (recorded, not dropped): avatar crop/zoom editor, the customer-facing Carte Fidélité
card (`/loyalty`), the admin-only Guides tour (`/guides`), and a contact page. Each maps 1:1 to a
legacy block above and can reuse the endpoints listed in §4.
