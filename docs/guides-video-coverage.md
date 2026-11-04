# Tutorial coverage audit — what is filmed, what is missing, what does not exist

Audited 2026-10-14 against the live `/app` surface, `guidesData.js` (20 guides),
the 12 routes in `Shell.jsx`, and every `/api/admin/*` route in `server.js`.

The question that prompted this: *"what about the rest of the videos, and videos
that are missing for tutorials, and forgotten videos"*.

---

## 1. What is already filmed — 13 films, 15 min 7 s

### The back office: every tab, every topic, 100 %

| Tab | Topics taught | Film |
|---|---|---|
| Vue d'ensemble | console tour, the six tabs, the stat counters | `admin-console` |
| Fidélité | card list & columns · search · **create a card** · **add a point** · **give the reward** · customer profile (preferences, personality, brands, suggestions, history) · **record a purchase** · edit a card · delete | 7 films |
| Utilisateurs | list, search, view a profile, ban with a reason, unban | `admin-users` |
| Actualités | write, badge, CTA, live preview, publish, delete | `admin-news` |
| Horaires | weekly grid, opening/closing, timezone, save | `admin-hours` |
| Messages | visitor notes, unread, mark read, reply, delete | `admin-notes` |

Every admin tab is covered and every `data-guide` hook in `Admin.jsx`,
`AdminLoyalty.jsx` and `adminKit.jsx` is exercised by a film. **There is no
unfilmed admin action.**

### The shop floor: 1 of 8

| Guide | Status |
|---|---|
| Carte fidélité (côté client) | ✅ film |
| Menu principal · Recherche · Collection · Profiler olfactif · Fiche produit · Panier · Compte | interactive tour only |

### Customer-side films that exist

`loyalty` — the customer loyalty page, shot from the top nav (« Fidélité »),
showing the card, the point counter, the card image and its download, and the
purchase history.

---

## 2. The gap that matters most — nobody learns to sign in

**Every one of the 13 films begins with "Une fois connecté, cliquez en haut à
droite sur l'icône de votre compte"** — *once signed in*.

Nothing on the site teaches how you get to that state. `Auth.jsx` is a 368-line,
four-mode page — `signin`, `signup`, `verify` (email code), and a manual
forgot-password note — and it carries **zero `data-guide` hooks** and **no
guide, tour or film of any kind**.

This is not a nitpick. `server.js` gates login:

```js
// server.js ~1722
if (!user.email_verified && user.is_admin !== 1 &&
    process.env.ALLOW_UNVERIFIED_LOGIN !== "true") {
  return res.status(403).json({ error: "Please verify your email address before logging in",
                                requiresVerification: true, ... });
}
```

So a new shop assistant who registers hits a **403 wall** unless they verify
their email — and no tutorial explains the verification code screen. Admins
bypass it, which is exactly why the gap was invisible: our own account was
always `is_admin = 1`.

**Recommended: `auth` tutorial — "Créer un compte et se connecter"**,
~50 s, three beats: register → the verification email → sign in. Requires adding
hooks to `Auth.jsx` (the three mode tabs, email/password fields, the CTA, the
code input, the resend link).

---

## 3. Features with no tutorial at all

These exist in the app, are reachable by a real user, and have **no guide, no
tour and no film**:

| # | Feature | Where | Why it matters |
|---|---|---|---|
| 1 | **Sign in / register / verify / forgot** | `/auth` | see §2 — the entry door to everything else |
| 2 | **Sending your basket to the boutique** | `/cart` → `POST /api/notes` | The cart "checkout" is a **real, working hand-off**: it itemises the basket into a note, which lands in the admin's **Messages** tab. `admin-notes` teaches reading those messages; nothing teaches *sending* one. This is the missing half of a complete loop, and the most commercially useful film on the list. |
| 3 | **Writing a review** | `Reviews.jsx` (659 lines) on the product page | Rating, text, replies, likes, edit, delete. The `product` tour mentions « Avis » in one step but never operates the form. |
| 4 | **The favourites page** | `/favorites` | The `account` tour points at the heart icon; the page itself is never opened. |
| 5 | **Reading the news as a customer** | `/news` | `admin-news` teaches *publishing*; nothing teaches what a reader sees. |
| 6 | **Contact form** | `/contact` | A direct, simple form with no tutorial. |

Also un-filmed but trivial: the floating cart button and the social rail in
`Overlays.jsx`, and the theme/language switches (already inside the
`navigation` tour).

---

## 4. Cannot be filmed — the feature does not exist

Listed because they would be expected tutorials and are impossible to make.

| # | Expected tutorial | Reality |
|---|---|---|
| 1 | **"Ajouter un collègue comme administrateur"** | **There is no endpoint and no UI.** `grep` over `server.js` finds no route that sets `is_admin`. The only code in the repo that promotes anyone is `scripts/init-database.js:1962` (`UPDATE users SET is_admin = 1 … WHERE id = ?`), run at DB init. Onboarding a new staff member therefore requires **direct database access** — the owner must either re-run that script with a new id or edit the row by hand. **This is a product gap, not a video gap.** Until an `/api/admin/users/:id/role` route exists, no honest tutorial can be shot for it. |
| 2 | **"Payer une commande"** | `Cart.jsx`'s own header: *"Proceed to Checkout was a stub that fired a 'coming soon' toast. There is still no checkout endpoint."* The basket is handed to the shop as a note (§3 row 2) instead. |
| 3 | **"Réinitialiser mon mot de passe"** | No `/api/auth/*` reset route. `Auth.jsx` renders `authForgotNote` — *"There is no automatic reset — tell us in the boutique or leave a note and we will set a new password with you."* The UI is honest about it; the follow-up (an admin actually changing the password) has no screen anywhere. |

---

## 5. In flight — do not film yet

`AdminAssistant.jsx` (a copilot panel) is wired into `Admin.jsx:740` and is
**uncommitted, another author's work**. It will change the console's look, so
any film covering the console tour should be re-shot after it lands — do not
build a tutorial around the current console chrome.

---

## 6. What it would take to close the gap

Each new customer-side film needs hooks first, exactly as the admin series did.
Current hook counts in the customer pages:

```
Home.jsx        0      Product.jsx      1 (pdp-sections)
Collection.jsx  3      Cart.jsx         1
Profile.jsx     2      Auth.jsx         0
Loyalty.jsx     4      Favorites.jsx    0
Contact.jsx     0
```

| Priority | Tutorial | Est. beats | Needs hooks in | Est. render |
|---|---|---|---|---|
| **1** | Créer un compte & se connecter | 5–7 | `Auth.jsx` | ~1 h |
| **2** | Passer une commande (panier → boutique) | 6–8 | `Cart.jsx` | ~1 h |
| **3** | Laisser un avis | 5–6 | `Reviews.jsx` (via `Product.jsx`) | ~1.5 h |
| **4** | Favoris | 3–4 | `Favorites.jsx` | ~40 min |
| **5** | Actualités (côté client) | 3–4 | `News.jsx` | ~40 min |
| **6** | Nous contacter | 3–4 | `Contact.jsx` | ~40 min |

Filming the 7 existing tours as videos is the other half of the same job, but
it is lower value — those tours still work, and the shop floor is learned by
using it. The six above are things a person cannot discover by poking around.

---

## 7. Summary

- **Back office: complete.** 6 tabs, 12 films, every admin action taught.
- **Shop floor: 1 of 8 filmed**, and 6 more features with no tutorial at all.
- **The real omission is the front door.** Nothing teaches signing in, and
  nothing teaches how a basket reaches the shop — the two things a new employee
  needs before any admin skill is useful.
- **One feature is impossible to teach** because it does not exist: promoting a
  colleague to admin. That needs a server route, not a video.
