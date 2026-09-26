# Legacy Homepage Inventory - `public/index.html`

Read-only reconnaissance for the React homepage rebuild. Generated 2026-09-26 by Node scripts
(`fs.readFileSync` + regex + line slicing); `public/index.html` was never loaded whole into context.

## 0. File facts

| Item | Value |
| --- | --- |
| `public/index.html` | 3,798,060 bytes (3.8 MB), 29,372 lines |
| `<div>` elements | 30,987 |
| `<section>` occurrences | 301 (216 at document top level, 84 nested in `div.container`, 1 deeper) |
| `id` attributes | 3,162 (0 duplicates) |
| `public/script.js` | 856 KB, 22,934 lines, 67 `fetch(` calls |
| `server.js` | 164 KB, 4,915 lines, 59 `/api/*` routes |

## 1. Homepage sections, in document order

Method: every container tag (`section|div|nav|footer|header|main|aside|article`) was scanned in
source order and its nesting depth computed with a tag stack. "Top level" = depth 0, plus the
84 `section` elements at depth 1 inside the single `div.container` wrapper. For each block the
script sliced the blocks own line range (capped at 80 lines) to read its heading, `brand-name`,
`product-name` and theme class in order to infer its purpose.

### 1.0 Inventory summary

| Bucket | Count | Notes |
| --- | --- | --- |
| Total blocks inventoried | 327 | 243 at depth 0 + 84 sections inside `div.container` |
| -- depth-0 `<section>` | 216 | |
| -- depth-0 `<div>` | 25 | 22 modals + loader, floating menu, social rail, back-to-top, vignette, news modal |
| -- depth-0 `<nav>` | 1 | navbar |
| -- depth-0 `<footer>` | 1 | site footer |
| Product feature blocks | 185 | near-duplicates of one template (see 1.4) |
| Empty transition spacers | 114 | `*-transition-section`, 200 px, no content |
| Chrome / feature blocks | 28 | nav, hero, modals, footer, utility overlays |

Document order, top to bottom:

1. lines 193-4048 - pre-loader, navbar, then 22 modal/overlay `div`s (search, ingredient finder,
   profile, photo editor, favourites, settings, cart, verification, admin dashboard, guest notes,
   news composer, loyalty, ban user, loyalty edit, customer profile, record purchase, auth).
2. lines 4078-13263 - `div.container`: hero (4079) + 82 product sections + trailing spacer (13254).
3. lines 13264-28885 - 216 top-level sections: alternating empty transition spacers and product
   sections for the long tail of the catalogue.
4. lines 28886-29128 - floating menu, social rail, footer, back-to-top, perfume-mode toggle,
   top vignette, news modal.

### 1.1 Chrome / feature blocks (28, document order)

| # | Line | End | Tag | id | class | What it is |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 193 | 211 | `div` | `brandLoader` | `brand-loader` | Brand/loader splash overlay shown on first paint (pre-loader animation). |
| 2 | 307 | 1057 | `nav` | `-` | `navbar` | Primary site navbar: logo, quick search bar (#quickSearchBar), AI fragrance-finder icon (#aiFinderIcon), language selector, logged-out / logged-in user menus, cart & favourites buttons. |
| 3 | 1060 | 1102 | `div` | `searchModal` | `search-modal` | Search modal - full-screen fragrance search with suggestion tags and results grid (#resultsGrid). |
| 4 | 1105 | 2886 | `div` | `ingredientModal` | `ingredient-modal` | Ingredient Finder modal - search fragrances by scent notes; selected-ingredients bar + results grid. |
| 5 | 2889 | 3016 | `div` | `profileModal` | `profile-modal` | User Profile modal - avatar (#profile-avatar-section) and profile info (#profile-info). |
| 6 | 3019 | 3128 | `div` | `photoEditorModal` | `photo-editor-modal` | Profile Photo Editor modal - crop / zoom / upload avatar. |
| 7 | 3141 | 3178 | `div` | `favoritesModal` | `favorites-modal` | My Favourites modal - list of saved fragrances (#empty-favorites placeholder when empty). |
| 8 | 3181 | 3284 | `div` | `settingsModal` | `settings-modal` | User Settings modal - 6 setting rows (notifications, theme, language, etc.). |
| 9 | 3287 | 3357 | `div` | `cartModal` | `modal` | Shopping Cart modal/drawer - cart lines, total (#cart-total), checkout button. Client-side only. |
| 10 | 3360 | 3453 | `div` | `verificationModal` | `modal hidden` | Email verification modal - 6-digit code entry, resend, error box. |
| 11 | 3456 | 3565 | `div` | `adminModal` | `admin-modal hidden` | Admin Dashboard modal - stat cards, users tables, news admin, store-hours admin grid. |
| 12 | 3568 | 3589 | `div` | `guestNotesModal` | `admin-modal guest-notes-modal hidden` | Admin: Guest Notes modal - list of visitor notes (#guestNotesList). |
| 13 | 3592 | 3682 | `div` | `newsComposerModal` | `admin-modal news-composer-modal hidden` | Admin: News Composer modal - create a store news item (template grid + form + preview). |
| 14 | 3685 | 3795 | `div` | `loyaltyModal` | `admin-modal loyalty-modal hidden` | Admin: Loyalty ("Carte Fidelite") panel - stat cards, create-card aside, card list. |
| 15 | 3801 | 3832 | `div` | `banModal` | `modal hidden` | Admin: Ban User modal. |
| 16 | 3835 | 3868 | `div` | `loyaltyEditModal` | `modal hidden` | Admin: Edit loyalty card modal. |
| 17 | 3871 | 3928 | `div` | `customerProfileModal` | `modal hidden` | Admin: Customer profile modal. |
| 18 | 3931 | 4004 | `div` | `recordPurchaseModal` | `modal hidden` | Admin: Record purchase modal (adds loyalty points). |
| 19 | 4007 | 4048 | `div` | `authModal` | `auth-modal charme-auth-overlay hidden` | Auth modal - sign in / register overlay ("Welcome back"). |
| 20 | 4078 | 13263 | `div` | `-` | `container` | Main content wrapper (.container). Holds the hero plus 82 product sections (lines 4079-13263). |
| 21 | 4079 | 4223 | `section` | `-` | `hero` | Hero - full-bleed background image; contains the "Leave a note" contact form, an OpenStreetMap store map iframe + Google Maps link, and the concierge contact card (phone / WhatsApp / hours). |
| 22 | 28886 | 28905 | `div` | `-` | `floating-menu-icon-container` | Floating menu icon container (persistent floating action button). |
| 23 | 28930 | 28967 | `div` | `socialLinks` | `social-links` | Social links rail (#socialLinks). |
| 24 | 28970 | 29001 | `footer` | `-` | `site-footer` | Site footer (.site-footer) - collection links, store info, legal. |
| 25 | 29016 | 29037 | `div` | `-` | `back-to-top-progress` | Back-to-top progress button (scroll progress ring). |
| 26 | 29041 | 29044 | `div` | `perfumeModeToggle` | `perfume-mode-toggle` | Perfume mode toggle (#perfumeModeToggle). |
| 27 | 29125 | 29125 | `div` | `topVignette` | `top-vignette` | Top vignette gradient overlay (#topVignette). |
| 28 | 29128 | 29207 | `div` | `newsModal` | `news-modal` | News / actualites modal (#newsModal) - store announcements feed. |

### 1.2 Product feature blocks (185, document order)

All 185 use the same shape: hero image + `brand-name` / `brand-location` / `product-name`,
price badge, favourite button, quality selector, "Scent Profile" + "Ingredients" + "Performance"
cards, a Reddit-style review card and a `#<slug>-reviews` user-reviews block. `theme` is the
per-product CSS theme hook (`<slug>-main-container <slug>-theme`).

| # | Line | id | class | Brand | Product | theme | in `.container` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4277 | `aventusabsolu` | `aventusabsolu-section` | Creed | Aventus Absolu | `elves` | yes |
| 2 | 4304 | `preciousoud` | `preciousoud-section` | Creed | Oud Precieux | `elves` | yes |
| 3 | 4331 | `versaceeros` | `versaceeros-section` | VERSACE | Eros | `versaceeros` | yes |
| 4 | 4741 | `hypnoticamber` | `hypnoticamber-section` | Viktor & Rolf | Hypnotic Amber | `elves` | yes |
| 5 | 4768 | `bleudechanel` | `bleudechanel-section` | CHANEL | Bleu de Chanel | `bleudechanel` | yes |
| 6 | 5228 | `amberoud` | `amberoud-section` | Tom Ford | Amber Oud | `elves` | yes |
| 7 | 5255 | `goldenoud` | `goldenoud-section` | Maison Francis Kurkdjian | Golden Oud | `elves` | yes |
| 8 | 5282 | `smokeroyaloud` | `smokeroyaloud-section` | Creed | Smoke & Royal Oud | `elves` | yes |
| 9 | 5309 | `arabianoud` | `arabianoud-section` | Amouage | Arabian Oud | `elves` | yes |
| 10 | 5336 | `muskrose` | `muskrose-section` | Byredo | Musk Rose | `elves` | yes |
| 11 | 5363 | `tabacoroyal` | `tabacoroyal-section` | Santa Maria Novella | Tabac Royal | `elves` | yes |
| 12 | 5390 | `mysteriousoud` | `mysteriousoud-section` | Amouage | Mysterious Oud | `elves` | yes |
| 13 | 5417 | `heavenlyoud` | `heavenlyoud-section` | Roja Parfums | Heavenly Oud | `elves` | yes |
| 14 | 5444 | `assadelixir` | `assadelixir-section` | Lattafa | Assad Elixir | `assadelixir` | yes |
| 15 | 5471 | `luxuryoud` | `luxuryoud-section` | Dior | Luxury Oud | `elves` | yes |
| 16 | 5498 | `phantominred` | `phantominred-section` | Initio | Phantom in Red | `phantominred` | yes |
| 17 | 5525 | `charmedoud` | `charmedoud-section` | Parfumerie Charme | Charmed Oud | `elves` | yes |
| 18 | 5552 | `chbadboy` | `chbadboy-section` | CAROLINA HERRERA | Bad Boy | `chbadboy` | yes |
| 19 | 5823 | `emperorsoud` | `emperorsoud-section` | Parfums de Marly | Emperor's Oud | `elves` | yes |
| 20 | 5850 | `majesticoud` | `majesticoud-section` | Tom Ford | Majestic Oud | `elves` | yes |
| 21 | 5877 | `gentleman` | `gentleman-section` | GIVENCHY | Gentleman EDP | `gentleman` | yes |
| 22 | 6148 | `radiantoud` | `radiantoud-section` | Creed | Radiant Oud | `elves` | yes |
| 23 | 6175 | `sensualoud` | `sensualoud-section` | Guerlain | Sensual Oud | `elves` | yes |
| 24 | 6202 | `timelessoud` | `timelessoud-section` | Chanel | Timeless Oud | `elves` | yes |
| 25 | 6229 | `gucciguilty` | `gucciguilty-section` | GUCCI | Guilty Pour Homme | `gucciguilty` | yes |
| 26 | 6499 | `twilightoud` | `twilightoud-section` | Byredo | Twilight Oud | `elves` | yes |
| 27 | 6526 | `velvetoud` | `velvetoud-section` | Tom Ford | Velvet Oud | `elves` | yes |
| 28 | 6553 | `moonlightoud` | `moonlightoud-section` | Amouage | Moonlight Oud | `elves` | yes |
| 29 | 6580 | `midnightoud` | `midnightoud-section` | Initio | Midnight Oud | `elves` | yes |
| 30 | 6607 | `invictus` | `invictus-section` | PACO RABANNE | Invictus | `invictus` | yes |
| 31 | 7017 | `sultanoud` | `sultanoud-section` | Amouage | Sultan Oud | `elves` | yes |
| 32 | 7044 | `regaloud` | `regaloud-section` | Roja Parfums | Regal Oud | `elves` | yes |
| 33 | 7071 | `diorhomme` | `diorhomme-section` | DIOR | Homme Intense | `diorhomme` | yes |
| 34 | 7342 | `lightblue` | `lightblue-section` | Dolce & Gabbana | Light Blue | `lightblue` | yes |
| 35 | 7369 | `yvsl` | `yvsl-section` | YVES SAINT LAURENT | Y Eau de Parfum | `yvsl` | yes |
| 36 | 7779 | `declarationcartier` | `declarationcartier-section` | CARTIER | Déclaration d'un Soir | `declarationcartier` | yes |
| 37 | 8050 | `kbyDG` | `kbyDG-section` | DOLCE & GABBANA | K by Dolce & Gabbana | `kbyDG` | yes |
| 38 | 8321 | `dy` | `dy-section` | DOLCE & GABBANA | The One EDP | `dy` | yes |
| 39 | 8729 | `layton` | `layton-section` | PARFUMS de MARLY | Layton | `-` | yes |
| 40 | 10965 | `bosselixir` | `bosselixir-section` | Hugo Boss | Boss Elixir | `elves` | yes |
| 41 | 10990 | `coolwater` | `coolwater-section` | Davidoff | Cool Water | `elves` | yes |
| 42 | 11015 | `milliongold` | `milliongold-section` | Paco Rabanne | 1 Million Gold | `elves` | yes |
| 43 | 11040 | `fahrenheit` | `fahrenheit-section` | Dior | Fahrenheit | `elves` | yes |
| 44 | 11065 | `lacosteblue` | `lacosteblue-section` | Lacoste | Lacoste Bleu | `elves` | yes |
| 45 | 11090 | `cerruti1881` | `cerruti1881-section` | Cerruti | Cerruti 1881 | `elves` | yes |
| 46 | 11115 | `ckone` | `ckone-section` | Calvin Klein | CK One | `elves` | yes |
| 47 | 11140 | `kirke` | `kirke-section` | Tiziana Terenzi | Kirkè | `elves` | yes |
| 48 | 11165 | `velvetbdk` | `velvetbdk-section` | BDK Parfums | Velvet | `elves` | yes |
| 49 | 11190 | `amenfantasm` | `amenfantasm-section` | Mugler | A*Men Fantasm | `elves` | yes |
| 50 | 11215 | `tuxedo` | `tuxedo-section` | Yves Saint Laurent | Tuxedo | `elves` | yes |
| 51 | 11240 | `onemillionroyale` | `onemillionroyale-section` | Paco Rabanne | 1 Million Royal | `elves` | yes |
| 52 | 11265 | `yintensely` | `yintensely-section` | Yves Saint Laurent | Y Intensely | `elves` | yes |
| 53 | 11290 | `ymenelixir` | `ymenelixir-section` | Yves Saint Laurent | Y Elixir | `elves` | yes |
| 54 | 11315 | `bossintense` | `bossintense-section` | Hugo Boss | Boss Intense | `elves` | yes |
| 55 | 11340 | `kouros` | `kouros-section` | Yves Saint Laurent | Kouros | `elves` | yes |
| 56 | 11365 | `bleuelectrique` | `bleuelectrique-section` | Azzaro | Bleu Electrique | `elves` | yes |
| 57 | 11390 | `purexs` | `purexs-section` | Paco Rabanne | Pure XS | `elves` | yes |
| 58 | 11415 | `onemillionelixir` | `onemillionelixir-section` | Paco Rabanne | 1 Million Elixir | `elves` | yes |
| 59 | 11440 | `clubdenuit` | `clubdenuit-section` | Armaf | Club de Nuit | `elves` | yes |
| 60 | 11465 | `strongerwithyousandalwood` | `strongerwithyousandalwood-section` | Giorgio Armani | Stronger With You Sandalwood | `elves` | yes |
| 61 | 11490 | `pineapple` | `pineapple-section` | Dolce & Gabbana | Pineapple | `elves` | yes |
| 62 | 11517 | `dylanbleuintense` | `dylanbleuintense-section` | Versace | Dylan Bleu Intense | `elves` | yes |
| 63 | 11541 | `nowade` | `nowade-section` | Louis Vuitton | Nowade | `elves` | yes |
| 64 | 11565 | `legendmontblanc` | `legendmontblanc-section` | Montblanc | Legend | `elves` | yes |
| 65 | 11589 | `azzarochrome` | `azzarochrome-section` | Azzaro | Chrome | `elves` | yes |
| 66 | 11613 | `ombrenomade` | `ombrenomade-section` | Louis Vuitton | Ombre Nomade | `elves` | yes |
| 67 | 11637 | `silvermountain` | `silvermountain-section` | Creed | Silver Mountain Water | `elves` | yes |
| 68 | 11661 | `jagwar` | `jagwar-section` | Jaguar | Jagwar | `elves` | yes |
| 69 | 11685 | `strongerwithyououd` | `strongerwithyououd-section` | Giorgio Armani | Stronger With You Oud | `elves` | yes |
| 70 | 11713 | `delinaexclusif` | `delinaexclusif-section` | Parfums de Marly | Delina Exclusif | `elves` | yes |
| 71 | 11737 | `versacevanillerouge` | `versacevanillerouge-section` | Versace | Vanille Rouge | `elves` | yes |
| 72 | 11761 | `narcoticdelight` | `narcoticdelight-section` | Initio | Narcotic Delight | `elves` | yes |
| 73 | 11785 | `lamar` | `lamar-section` | Kajal | Lamar | `elves` | yes |
| 74 | 11809 | `dired` | `dired-section` | Diesel | Diesel | `elves` | yes |
| 75 | 11833 | `themoon` | `themoon-section` | Memo Paris | The Moon | `elves` | yes |
| 76 | 11857 | `sospiroopera` | `sospiroopera-section` | Sospiro | Opera | `elves` | yes |
| 77 | 11881 | `queenofsilk` | `queenofsilk-section` | Creed | Queen of Silk | `elves` | yes |
| 78 | 11905 | `orza` | `orza-section` | Tiziana Terenzi | Orza | `elves` | yes |
| 79 | 11929 | `noirkogane` | `noirkogane-section` | Giorgio Armani | Noir Kogane | `elves` | yes |
| 80 | 11953 | `grisdior` | `grisdior-section` | Dior | Gris Dior | `elves` | yes |
| 81 | 11977 | `kajaldahab` | `kajaldahab-section` | Kajal | Dahab | `elves` | yes |
| 82 | 12002 | `pegasus` | `pegasus-section` | PARFUMS de MARLY | Pegasus | `-` | yes |
| 83 | 13264 | `greenly` | `greenly-section` | PARFUMS de MARLY | Greenly | `greenly` | no |
| 84 | 14579 | `baccaratrouge` | `baccaratrouge-section` | MAISON FRANCIS KURKDJIAN | Baccarat Rouge 540 | `baccaratrouge` | no |
| 85 | 14989 | `blackorchid` | `blackorchid-section` | TOM FORD | Black Orchid | `blackorchid` | no |
| 86 | 15406 | `aventus` | `aventus-section` | CREED | Aventus | `aventus` | no |
| 87 | 15840 | `sauvage` | `sauvage-section` | DIOR | Sauvage | `sauvage` | no |
| 88 | 16292 | `tobaccovanille` | `tobaccovanille-section` | TOM FORD | Tobacco Vanille | `tobaccovanille` | no |
| 89 | 16735 | `oudwood` | `oudwood-section` | TOM FORD | Oud Wood | `oudwood` | no |
| 90 | 17171 | `lanuit` | `lanuit-section` | YVES SAINT LAURENT | La Nuit de L'Homme | `lanuit` | no |
| 91 | 17616 | `lostcherry` | `lostcherry-section` | TOM FORD | Lost Cherry | `lostcherry` | no |
| 92 | 18066 | `aquadigio` | `aquadigio-section` | GIORGIO ARMANI | Acqua di Giò Profumo | `aquadigio` | no |
| 93 | 18483 | `jpgultramale` | `jpgultramale-section` | JEAN PAUL GAULTIER | Ultra Male | `jpgultramale` | no |
| 94 | 18897 | `valentinouomo` | `valentinouomo-section` | VALENTINO | Uomo Born in Roma | `valentinouomo` | no |
| 95 | 19308 | `spicebomb` | `spicebomb-section` | VIKTOR & ROLF | Spicebomb Extreme | `spicebomb` | no |
| 96 | 19719 | `explorer` | `explorer-section` | MONTBLANC | Explorer | `explorer` | no |
| 97 | 20130 | `blv` | `blv-section` | BVLGARI | Man in Black | `blv` | no |
| 98 | 20544 | `allure` | `allure-section` | CHANEL | Allure Homme Sport | `allure` | no |
| 99 | 20816 | `tuscanleather` | `tuscanleather-section` | TOM FORD | Tuscan Leather | `tuscanleather` | no |
| 100 | 21088 | `armanicode` | `armanicode-section` | GIORGIO ARMANI | Armani Code Absolu | `armanicode` | no |
| 101 | 21359 | `lhommeideal` | `lhommeideal-section` | GUERLAIN | L'Homme Idéal EDP | `lhommeideal` | no |
| 102 | 21631 | `terredhermes` | `terredhermes-section` | HERMÈS | Terre d'Hermès | `terredhermes` | no |
| 103 | 21906 | `wantedbynight` | `wantedbynight-section` | AZZARO | The Most Wanted | `wantedbynight` | no |
| 104 | 22181 | `leaudissey` | `leaudissey-section` | ISSEY MIYAKE | L'Eau d'Issey Pour Homme | `leaudissey` | no |
| 105 | 22456 | `ysllibre` | `ysllibre-section` | YVES SAINT LAURENT | Libre EDP | `ysllibre` | no |
| 106 | 22728 | `fireplace` | `fireplace-section` | MAISON MARGIELA | By the Fireplace | `fireplace` | no |
| 107 | 23000 | `pradacarbon` | `pradacarbon-section` | PRADA | Luna Rossa Carbon | `pradacarbon` | no |
| 108 | 23270 | `burberryhero` | `burberryhero-section` | BURBERRY | Hero EDP | `burberryhero` | no |
| 109 | 23542 | `narcisoforhim` | `narcisoforhim-section` | NARCISO RODRIGUEZ | For Him Bleu Noir | `narcisoforhim` | no |
| 110 | 23814 | `cketernity` | `cketernity-section` | CALVIN KLEIN | Eternity for Men | `cketernity` | no |
| 111 | 24089 | `valentinodonna` | `valentinodonna-section` | VALENTINO | Born in Roma Donna | `valentinodonna` | no |
| 112 | 24360 | `greenirish` | `greenirish-section` | CREED | Green Irish Tweed | `greenirish` | no |
| 113 | 24632 | `egoiste` | `egoiste-section` | CHANEL | Égoïste Platinum | `egoiste` | no |
| 114 | 24904 | `amenpure` | `amenpure-section` | MUGLER | A*Men Pure Havane | `amenpure` | no |
| 115 | 25179 | `laween` | `laween-section` | RASASI | La Yuqawam | `laween` | no |
| 116 | 25451 | `cedarsmancera` | `cedarsmancera-section` | MANCERA | Cedrat Boisé | `cedarsmancera` | no |
| 117 | 25722 | `reflectionman` | `reflectionman-section` | AMOUAGE | Reflection Man | `reflectionman` | no |
| 118 | 25994 | `sedley` | `sedley-section` | PARFUMS DE MARLY | Sedley | `sedley` | no |
| 119 | 26266 | `sideeffect` | `sideeffect-section` | INITIO | Side Effect | `sideeffect` | no |
| 120 | 26538 | `naxos` | `naxos-section` | XERJOFF | Naxos | `naxos` | no |
| 121 | 26810 | `grandSoir` | `grandSoir-section` | MAISON FRANCIS KURKDJIAN | Grand Soir | `grandSoir` | no |
| 122 | 27080 | `balayage` | `balayage-section` | SOSPIRO | Balayage | `balayage` | no |
| 123 | 27218 | `valayaexclusive` | `valayaexclusive-section` | PARFUMS DE MARLY | Valaya Exclusive | `valayaexclusive` | no |
| 124 | 27267 | `1millionnight` | `onemillionnight-section` | PACO RABANNE | 1 Million Night | `onemillionnight` | no |
| 125 | 27293 | `freedommuskmatcha` | `freedommuskmatcha-section` | KAYALI | Freedom Musk Matcha | `freedommuskmatcha` | no |
| 126 | 27319 | `torrino21` | `torrino21-section` | XERJOFF | Torino21 | `torrino21` | no |
| 127 | 27345 | `kayalimarshmallow` | `kayalimarshmallow-section` | KAYALI | Marshmallow | `kayalimarshmallow` | no |
| 128 | 27371 | `aquaallegoriaflorabloom` | `aquaallegoriaflorabloom-section` | GUERLAIN | Aqua Allegoria Florabloom Forte | `aquaallegoriaflorabloom` | no |
| 129 | 27397 | `angelnova` | `angelnova-section` | MUGLER | Angel Nova | `angelnova` | no |
| 130 | 27423 | `aquadigioelixir` | `aquadigioelixir-section` | GIORGIO ARMANI | Acqua di Gio Elixir | `aquadigioelixir` | no |
| 131 | 27449 | `pacificchill` | `pacificchill-section` | Armani Privé | Pacific Chill | `pacificchill` | no |
| 132 | 27475 | `freedommusk` | `freedommusk-section` | Kayali | Freedom Musk | `freedommusk` | no |
| 133 | 27502 | `fameinlove` | `fameinlove-section` | Paco Rabanne | Fame in Love | `fameinlove` | no |
| 134 | 27528 | `umoextradose` | `umoextradose-section` | Kerosene | Umo Extradose | `umoextradose` | no |
| 135 | 27554 | `donnaextradose` | `donnaextradose-section` | Kerosene | Donna Extradose | `donnaextradose` | no |
| 136 | 27580 | `edarchic` | `edarchic-section` | Narciso Rodriguez | Cedar Chic | `edarchic` | no |
| 137 | 27606 | `limperatrice3` | `limperatrice3-section` | Dolce & Gabbana | L'Impératrice 3 | `limperatrice3` | no |
| 138 | 27632 | `eaudusoir` | `eaudusoir-section` | Sisley | Eau du Soir | `eaudusoir` | no |
| 139 | 27658 | `guidance46` | `guidance46-section` | Amouage | Guidance 46 | `guidance46` | no |
| 140 | 27684 | `hermajesty` | `hermajesty-section` | Kilian | Her Majesty | `hermajesty` | no |
| 141 | 27710 | `sipassioneredmusc` | `sipassioneredmusc-section` | Armani | Si Passione Red Musk | `sipassioneredmusc` | no |
| 142 | 27736 | `narcisobleunoir` | `narcisobleunoir-section` | Narciso Rodriguez | Narciso Bleu Noir | `narcisobleunoir` | no |
| 143 | 27762 | `vanillapowder` | `vanillapowder-section` | Matiere Premiere | Vanilla Powder | `vanillapowder` | no |
| 144 | 27788 | `labelleparadise` | `labelleparadise-section` | Lolita Lempicka | La Belle Paradise | `labelleparadise` | no |
| 145 | 27814 | `sipassionneintense` | `sipassionneintense-section` | Armani | Si Passione Intense | `sipassionneintense` | no |
| 146 | 27840 | `stellaritimes` | `stellaritimes-section` | Armani Privé | Stellaris Times | `stellaritimes` | no |
| 147 | 27866 | `nauticavoyage` | `nauticavoyage-section` | Nautica | Nautica Voyage | `nauticavoyage` | no |
| 148 | 27892 | `elves` | `elves-section` | Spirit of Dubai | Elves | `elves` | no |
| 149 | 27918 | `roseamira` | `roseamira-section` | L'Artisan Parfumeur | Rose Amira | `roseamira` | no |
| 150 | 27944 | `40knots` | `xerjoff40knots-section` | Xerjoff | 40 Knots | `xerjoff40knots` | no |
| 151 | 27970 | `powerofyou` | `powerofyou-section` | Carolina Herrera | Power of You | `powerofyou` | no |
| 152 | 27997 | `valentinapoudre` | `valentinapoudre-section` | Valentino | Valentina Poudre | `valentinapoudre` | no |
| 153 | 28023 | `valentinaabsolue` | `valentinaabsolue-section` | Valentino | Valentina Absolue | `valentinaabsolue` | no |
| 154 | 28049 | `fantasmagoria` | `fantasmagoria-section` | Lattafa | Fantasmagoria | `fantasmagoria` | no |
| 155 | 28075 | `supremebouquet` | `supremebouquet-section` | Yves Rocher | Suprême Bouquet | `supremebouquet` | no |
| 156 | 28101 | `rosestar` | `rosestar-section` | Dior | Rose Star | `rosestar` | no |
| 157 | 28127 | `oudvoyager` | `oudvoyager-section` | Tom Ford | Oud Voyager | `oudvoyager` | no |
| 158 | 28154 | `flowerbombextreme` | `flowerbombextreme-section` | Viktor & Rolf | Flowerbomb Extrême | `flowerbombextreme` | no |
| 159 | 28180 | `santalroyal` | `santalroyal-section` | Guerlain | Santal Royal | `santalroyal` | no |
| 160 | 28206 | `terroni` | `terroni-section` | Orto Parisi | Terroni | `terroni` | no |
| 161 | 28232 | `oudroyal` | `oudroyal-section` | Guerlain | Oud Royal | `oudroyal` | no |
| 162 | 28258 | `noirextreme` | `noirextreme-section` | Tom Ford | Noir Extreme | `noirextreme` | no |
| 163 | 28284 | `guiltyelixirfemme` | `guiltyelixirfemme-section` | Paco Rabanne | Guilty Elixir Femme | `guiltyelixirfemme` | no |
| 164 | 28310 | `rosendomateu5` | `rosendomateu5-section` | Rosendo Mateu | Rosendo Mateu Nº5 | `rosendomateu5` | no |
| 165 | 28336 | `lessablesroses` | `lessablesroses-section` | Maison Crivelli | Les Sables Roses | `lessablesroses` | no |
| 166 | 28362 | `wantedelixir` | `wantedelixir-section` | Azzaro | Wanted Elixir | `wantedelixir` | no |
| 167 | 28388 | `ambassador` | `ambassador-section` | Gisada | Ambassador | `ambassador` | no |
| 168 | 28414 | `labomba` | `labomba-section` | Jean Paul Gaultier | La Bomba | `labomba` | no |
| 169 | 28440 | `ambresamar` | `ambresamar-section` | Maison Crivelli | Ambre Samar | `ambresamar` | no |
| 170 | 28466 | `myrrhetonka` | `myrrhetonka-section` | Jo Malone | Myrrh & Tonka | `myrrhetonka` | no |
| 171 | 28492 | `chanel5` | `chanel5-section` | Chanel | Chanel N°5 | `chanel5` | no |
| 172 | 28518 | `ganymede` | `ganymede-section` | Marc-Antoine Barrois | Ganymède | `ganymede` | no |
| 173 | 28544 | `crushonme` | `crushonme-section` | Dolce & Gabbana | Crush on Me | `crushonme` | no |
| 174 | 28570 | `armanicodeparfum` | `armanicodeparfum-section` | Armani | Armani Code Parfum | `armanicodeparfum` | no |
| 175 | 28596 | `hudsonvalley` | `hudsonvalley-section` | Gisada | Hudson Valley | `hudsonvalley` | no |
| 176 | 28622 | `blackopium` | `blackopium-section` | YSL | Black Opium | `blackopium` | no |
| 177 | 28648 | `vanillacandyrocksugar` | `vanillacandyrocksugar-section` | Kayali | Vanilla Candy Rock Sugar | `vanillacandyrocksugar` | no |
| 178 | 28674 | `monparis` | `monparis-section` | YSL | Mon Paris | `monparis` | no |
| 179 | 28700 | `flowerbykenzo` | `flowerbykenzo-section` | Kenzo | Flower by Kenzo | `flowerbykenzo` | no |
| 180 | 28726 | `narciso` | `narciso-section` | Narciso Rodriguez | Narciso | `narciso` | no |
| 181 | 28752 | `cristalnoir` | `cristalnoir-section` | Raghba | Cristal Noir | `cristalnoir` | no |
| 182 | 28778 | `tresorlanuit` | `tresorlanuit-section` | Lancôme | Trésor la Nuit | `tresorlanuit` | no |
| 183 | 28804 | `manifestoelixir` | `manifestoelixir-section` | Narciso Rodriguez | Manifesto Elixir | `manifestoelixir` | no |
| 184 | 28830 | `alien` | `alien-section` | Mugler | Alien | `alien` | no |
| 185 | 28856 | `eliesaabinwhite` | `eliesaabinwhite-section` | Elie Saab | Elie Saab In White | `eliesaabinwhite` | no |

### 1.3 Empty transition spacers (114)

Every one is `<section class="content <slug>-transition-section" style="min-height:200px;
height:200px">` containing nothing but an optional HTML comment. They exist purely to create
vertical gap / scroll separation between product blocks. Delete them all and use CSS margin.

| # | Line | class |
| --- | --- | --- |
| 1 | 13254 | `white-transition-section` |
| 2 | 14576 | `baccaratrouge-transition-section` |
| 3 | 14986 | `blackorchid-transition-section` |
| 4 | 15403 | `aventus-transition-section` |
| 5 | 15837 | `sauvage-transition-section` |
| 6 | 16285 | `bleudechanel-transition-section` |
| 7 | 16289 | `tobaccovanille-transition-section` |
| 8 | 16732 | `oudwood-transition-section` |
| 9 | 17168 | `lanuit-transition-section` |
| 10 | 17613 | `lostcherry-transition-section` |
| 11 | 18060 | `yvsl-transition-section` |
| 12 | 18063 | `aquadigio-transition-section` |
| 13 | 18474 | `dy-transition-section` |
| 14 | 18477 | `versaceeros-transition-section` |
| 15 | 18480 | `jpgultramale-transition-section` |
| 16 | 18891 | `invictus-transition-section` |
| 17 | 18894 | `valentinouomo-transition-section` |
| 18 | 19305 | `spicebomb-transition-section` |
| 19 | 19716 | `explorer-transition-section` |
| 20 | 20127 | `blv-transition-section` |
| 21 | 20538 | `diorhomme-transition-section` |
| 22 | 20541 | `allure-transition-section` |
| 23 | 20813 | `tuscanleather-transition-section` |
| 24 | 21085 | `armanicode-transition-section` |
| 25 | 21356 | `lhommeideal-transition-section` |
| 26 | 21628 | `terredhermes-transition-section` |
| 27 | 21900 | `gentleman-transition-section` |
| 28 | 21903 | `wantedbynight-transition-section` |
| 29 | 22175 | `kbyDG-transition-section` |
| 30 | 22178 | `leaudissey-transition-section` |
| 31 | 22450 | `chbadboy-transition-section` |
| 32 | 22453 | `ysllibre-transition-section` |
| 33 | 22725 | `fireplace-transition-section` |
| 34 | 22997 | `pradacarbon-transition-section` |
| 35 | 23267 | `burberryhero-transition-section` |
| 36 | 23539 | `narcisoforhim-transition-section` |
| 37 | 23811 | `cketernity-transition-section` |
| 38 | 24083 | `gucciguilty-transition-section` |
| 39 | 24086 | `valentinodonna-transition-section` |
| 40 | 24357 | `greenirish-transition-section` |
| 41 | 24629 | `egoiste-transition-section` |
| 42 | 24901 | `amenpure-transition-section` |
| 43 | 25173 | `declarationcartier-transition-section` |
| 44 | 25176 | `laween-transition-section` |
| 45 | 25448 | `cedarsmancera-transition-section` |
| 46 | 25719 | `reflectionman-transition-section` |
| 47 | 25991 | `sedley-transition-section` |
| 48 | 26263 | `sideeffect-transition-section` |
| 49 | 26535 | `naxos-transition-section` |
| 50 | 26807 | `grandSoir-transition-section` |
| 51 | 27079 | `balayage-transition-section` |
| 52 | 27217 | `valayaexclusive-transition-section` |
| 53 | 27266 | `onemillionnight-transition-section` |
| 54 | 27292 | `freedommuskmatcha-transition-section` |
| 55 | 27318 | `torrino21-transition-section` |
| 56 | 27344 | `kayalimarshmallow-transition-section` |
| 57 | 27370 | `aquaallegoriaflorabloom-transition-section` |
| 58 | 27396 | `angelnova-transition-section` |
| 59 | 27422 | `aquadigioelixir-transition-section` |
| 60 | 27448 | `pacificchill-transition-section` |
| 61 | 27474 | `freedommusk-transition-section` |
| 62 | 27501 | `fameinlove-transition-section` |
| 63 | 27527 | `umoextradose-transition-section` |
| 64 | 27553 | `donnaextradose-transition-section` |
| 65 | 27579 | `edarchic-transition-section` |
| 66 | 27605 | `limperatrice3-transition-section` |
| 67 | 27631 | `eaudusoir-transition-section` |
| 68 | 27657 | `guidance46-transition-section` |
| 69 | 27683 | `hermajesty-transition-section` |
| 70 | 27709 | `sipassioneredmusc-transition-section` |
| 71 | 27735 | `narcisobleunoir-transition-section` |
| 72 | 27761 | `vanillapowder-transition-section` |
| 73 | 27787 | `labelleparadise-transition-section` |
| 74 | 27813 | `sipassionneintense-transition-section` |
| 75 | 27839 | `stellaritimes-transition-section` |
| 76 | 27865 | `nauticavoyage-transition-section` |
| 77 | 27891 | `elves-transition-section` |
| 78 | 27917 | `roseamira-transition-section` |
| 79 | 27943 | `xerjoff40knots-transition-section` |
| 80 | 27969 | `powerofyou-transition-section` |
| 81 | 27996 | `valentinapoudre-transition-section` |
| 82 | 28022 | `valentinaabsolue-transition-section` |
| 83 | 28048 | `fantasmagoria-transition-section` |
| 84 | 28074 | `supremebouquet-transition-section` |
| 85 | 28100 | `rosestar-transition-section` |
| 86 | 28126 | `oudvoyager-transition-section` |
| 87 | 28153 | `flowerbombextreme-transition-section` |
| 88 | 28179 | `santalroyal-transition-section` |
| 89 | 28205 | `terroni-transition-section` |
| 90 | 28231 | `oudroyal-transition-section` |
| 91 | 28257 | `noirextreme-transition-section` |
| 92 | 28283 | `guiltyelixirfemme-transition-section` |
| 93 | 28309 | `rosendomateu5-transition-section` |
| 94 | 28335 | `lessablesroses-transition-section` |
| 95 | 28361 | `wantedelixir-transition-section` |
| 96 | 28387 | `ambassador-transition-section` |
| 97 | 28413 | `labomba-transition-section` |
| 98 | 28439 | `ambresamar-transition-section` |
| 99 | 28465 | `myrrhetonka-transition-section` |
| 100 | 28491 | `chanel5-transition-section` |
| 101 | 28517 | `ganymede-transition-section` |
| 102 | 28543 | `crushonme-transition-section` |
| 103 | 28569 | `armanicodeparfum-transition-section` |
| 104 | 28595 | `hudsonvalley-transition-section` |
| 105 | 28621 | `blackopium-transition-section` |
| 106 | 28647 | `vanillacandyrocksugar-transition-section` |
| 107 | 28673 | `monparis-transition-section` |
| 108 | 28699 | `flowerbykenzo-transition-section` |
| 109 | 28725 | `narciso-transition-section` |
| 110 | 28751 | `cristalnoir-transition-section` |
| 111 | 28777 | `tresorlanuit-transition-section` |
| 112 | 28803 | `manifestoelixir-transition-section` |
| 113 | 28829 | `alien-transition-section` |
| 114 | 28855 | `eliesaabinwhite-transition-section` |

### 1.4 Distinct content vs. near-duplicate blocks

**Genuinely distinct (28 blocks, section 1.1).** Only these carry unique structure and
behaviour: the navbar, the hero (note form + map + concierge card), the 22 modals, the footer and
the five utility overlays. Each needs its own React component and, in most cases, its own state.

**Near-duplicate (185 blocks, section 1.2).** One parameterised component driven by data
can replace all of them. Supporting numbers:

* 186 `product-name` values, **186 distinct** - so this is data, not duplicated markup.
* 103 distinct brands across those 186 products.
* 117 distinct `*-theme` classes, but **67 of the 183 themed blocks share the `elves` theme** -
  the theme classes are cosmetic one-offs bolted onto the same template.
* Each product block emits a `#<slug>-reviews` container, a `#<slug>Favorite...` button and a
  quality selector, all derived from the slug - so they collapse into props cleanly.
* 82 of them live inside `div.container`, the rest are siblings of it; there is no
  structural difference between the two groups.

**Pure noise (114 blocks, section 1.3).** Transition spacers with zero content.

Net: a React homepage needs roughly **28 distinct components** + **1 parameterised product
component** + a data file - not 327 hand-written blocks.

## 2. Interactive features that need a backend

Evidence: `public/script.js` contains 67 `fetch(` calls covering 46 distinct `/api/*` strings;
`public/index.html` itself has **0** `fetch(` and **0** `/api/` references (all behaviour lives in
the deferred scripts). `server.js` defines 59 `/api/*` routes.

| Feature | Where it lives in the DOM | Server-backed? | Backing endpoint(s) |
| --- | --- | --- | --- |
| Authentication (register / login / email verify / resend code) | `#authModal` (4007), `#verificationModal` (3360), navbar `#userLoggedOut` / `#userLoggedIn` | **Yes** - JWT in `localStorage.authToken` | `/api/auth/register`, `/api/auth/login`, `/api/auth/verify`, `/api/auth/verify-email`, `/api/auth/resend-verification` |
| User profile (read / update / extra details) | `#profileModal` (2889) | **Yes** | `GET`/`PUT` `/api/user/profile`, `POST /api/user/profile-details` |
| User settings | `#settingsModal` (3181) | **Yes** (with `localStorage.userSettings` cache) | `GET`/`PUT` `/api/user/settings` |
| Favourites / wishlist | `#favoritesModal` (3141), per-product `.favorite-btn` (357 matches) | **Yes**, with guest fallback | `GET`/`POST` `/api/user/favorites`, `DELETE /api/user/favorites/:productId`, `POST /api/user/favorites/toggle`; guest copy in `localStorage.perfumeFavorites_guest` |
| Reviews (create / edit / delete) | `#<slug>-reviews` blocks inside all 185 product sections (1,315 `review` hits) | **Yes** | `GET /api/reviews/:fragrance`, `POST /api/reviews`, `PUT /api/reviews/update`, `DELETE /api/reviews/delete` |
| Review likes | same blocks | **Yes** | `POST /api/reviews/like`, `POST /api/reviews/:reviewId/like`, `GET /api/reviews/likes/:fragrance` |
| Review replies + reply likes + reply delete | same blocks | **Yes** | `GET`/`POST /api/reviews/:reviewId/replies`, `POST /api/replies/:replyId/like`, `DELETE /api/replies/:replyId` |
| Reviewer profile sync | on review submit | **Yes** | `POST /api/reviews/update-user-profile` |
| Personal notes / contact form | hero `#noteForm` (4083) - "Leave a note" | **Yes** (public, rate-limited) | `POST /api/notes` |
| Admin inbox for those notes | `#guestNotesModal` (3568) | **Yes** (admin) | `GET /api/admin/notes`, `PUT /api/admin/notes/:id/read`, `DELETE /api/admin/notes/:id` |
| Store news / actualites | `#newsModal` (29128) + admin `#newsComposerModal` (3592) | **Yes** | `GET /api/news`; admin `GET`/`POST` `/api/admin/news`, `DELETE /api/admin/news/:id` |
| Store hours | hero contact card, admin dashboard | **Yes** | `GET /api/store-hours`; admin `GET`/`PUT` `/api/admin/store-hours` |
| Loyalty points / cards | `#loyaltyModal` (3685), `#recordPurchaseModal` (3931), `#loyaltyEditModal` (3835) | **Yes** (admin-driven, 10 routes) | `/api/admin/loyalty*` (list, create, update, delete, add-points, redeem, purchases), `/api/search/loyalty-profiles` |
| Avatar / photo upload | `#photoEditorModal` (3019), profile avatar | **Yes** (multipart) | `POST /api/upload-avatar`, `POST /api/user/upload-avatar`; served from `/uploads/avatars` |
| Admin user management (list, stats, search, ban, unban) | `#adminModal` (3456), `#banModal` (3801) | **Yes** | `GET /api/admin/users`, `GET /api/stats/users`, `GET /api/search/users`, `POST /api/admin/ban-user`, `POST /api/admin/unban-user` |
| **Cart** | `#cartModal` (3287) | **No** - 100% client-side | No `/api/cart` route exists. Cart persisted in `localStorage` under a per-user key (script.js:14430-14444) |
| **Checkout / orders** | `#checkoutBtn` (3350) | **No** - stubbed | `proceedToCheckout()` shows "Checkout functionality coming soon!" (script.js:14941-14948). No `/api/orders`, no payment route |
| **Order history** | - | **No** - does not exist | 0 `order` matches in `server.js` |
| **Newsletter** | - | **No** - does not exist | 0 `newsletter` matches in index.html, script.js and server.js |
| **AI fragrance finder** | navbar `#aiFinderIcon` (555), `js/ai-fragrance-finder.js` (24 KB) | **No** - client-side only | 0 `fetch(` in `ai-fragrance-finder.js`; pure in-browser scoring |
| Quick search + ingredient search | `#quickSearchBar` (321), `#ingredientModal` (1105), `js/fragrance-catalog-data.js` (493 KB) | **No** - client-side | No catalog API; data is a baked-in JS file plus hardcoded HTML |
| Favourites guest mode | `#favoritesModal` | **No** (falls back to localStorage) | `perfumeFavorites_guest`, `userFavorites` |
| i18n / language switcher | navbar `.language-selector` (847), `js/i18n.js` | **No** - client-side dictionary | - |

**Implication for the rebuild:** storefront data (catalogue, search, AI finder, cart) is entirely
client-side today - the React app can own it. Only identity, UGC (reviews / replies / likes),
notes, news, store hours, loyalty, uploads and admin require the existing Express API. Cart
persistence, checkout and order history are greenfield: nothing exists server-side to migrate.

## 3. API surface (`server.js`)

59 `/api/*` routes (GET 21, POST 25, PUT 6, DELETE 7) plus one page route `GET /`.
No `router.*` objects are used - everything is mounted directly on `app`.
Static mounts (`app.use` for `/`, `/app`, `/app/assets`, `/uploads/avatars`), the helmet/cors/json
middleware stack, the four rate-limiter `app.use` calls and the two error handlers are excluded.

Auth middleware: `authenticateToken` (server.js:1271) and `requireAdmin` (server.js:2350).

### 3.1 Auth

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | rate limit only | Create account; sends verification email | 1327 |
| POST | `/api/auth/login` | public | Login, issues JWT | 1641 |
| GET | `/api/auth/verify` | authenticateToken | Validate session, return current user | 1428 |
| POST | `/api/auth/verify-email` | public | Submit email verification code | 1464 |
| POST | `/api/auth/resend-verification` | rate limit only | Resend verification code | 1541 |

### 3.2 User profile & settings

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/user/profile` | authenticateToken | Read own profile | 1750 |
| PUT | `/api/user/profile` | authenticateToken | Update own profile | 1911 |
| POST | `/api/user/profile-details` | authenticateToken | Save extended profile details | 1814 |
| GET | `/api/user/settings` | authenticateToken | Read user settings | 2061 |
| PUT | `/api/user/settings` | authenticateToken | Update user settings | 2096 |

### 3.3 Favourites

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/user/favorites` | authenticateToken | List favourite product ids | 2139 |
| POST | `/api/user/favorites` | authenticateToken | Add a favourite | 2168 |
| DELETE | `/api/user/favorites/:productId` | authenticateToken | Remove a favourite | 2219 |
| POST | `/api/user/favorites/toggle` | authenticateToken | Toggle favourite state | 2261 |

### 3.4 Reviews, likes, replies

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/reviews/:fragrance` | public | Reviews for one fragrance | 3843 |
| POST | `/api/reviews` | authenticateToken | Create a review | 3877 |
| PUT | `/api/reviews/update` | authenticateToken | Edit own review | 4138 |
| DELETE | `/api/reviews/delete` | authenticateToken | Delete own review | 4217 |
| POST | `/api/reviews/like` | authenticateToken | Like/unlike a review | 4280 |
| POST | `/api/reviews/:reviewId/like` | **public** (no middleware) | Like/unlike a review by id - unauthenticated entry point | 3987 |
| GET | `/api/reviews/likes/:fragrance` | authenticateToken | Which reviews the current user liked | 4412 |
| POST | `/api/reviews/update-user-profile` | authenticateToken | Sync denormalised reviewer name/avatar onto reviews | 4062 |
| GET | `/api/reviews/:reviewId/replies` | public | List replies to a review | 4454 |
| POST | `/api/reviews/:reviewId/replies` | authenticateToken | Reply to a review | 4518 |
| POST | `/api/replies/:replyId/like` | authenticateToken | Like/unlike a reply | 4668 |
| DELETE | `/api/replies/:replyId` | authenticateToken | Delete a reply | 4780 |

### 3.5 Notes (visitor contact form)

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| POST | `/api/notes` | rate limit only (public) | Submit a visitor note / contact message | 3508 |
| GET | `/api/admin/notes` | authenticateToken + requireAdmin | List visitor notes | 3650 |
| PUT | `/api/admin/notes/:id/read` | authenticateToken + requireAdmin | Mark a note read | 3673 |
| DELETE | `/api/admin/notes/:id` | authenticateToken + requireAdmin | Delete a note | 3697 |

### 3.6 News (store announcements)

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/news` | public | Published news items for the news modal | 3356 |
| GET | `/api/admin/news` | authenticateToken + requireAdmin | List all news incl. drafts | 3375 |
| POST | `/api/admin/news` | authenticateToken + requireAdmin | Create a news item | 3399 |
| DELETE | `/api/admin/news/:id` | authenticateToken + requireAdmin | Delete a news item | 3470 |

### 3.7 Store hours

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/store-hours` | public | Opening hours shown in the hero contact card | 3597 |
| GET | `/api/admin/store-hours` | authenticateToken + requireAdmin | Read hours for editing | 3607 |
| PUT | `/api/admin/store-hours` | authenticateToken + requireAdmin | Update opening hours | 3622 |

### 3.8 Loyalty

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/loyalty` | authenticateToken + requireAdmin | List loyalty cards | 2724 |
| POST | `/api/admin/loyalty/create` | authenticateToken + requireAdmin | Create a loyalty card | 2888 |
| PUT | `/api/admin/loyalty/update` | authenticateToken + requireAdmin | Edit a loyalty card | 2956 |
| DELETE | `/api/admin/loyalty/delete` | authenticateToken + requireAdmin | Delete a loyalty card | 3070 |
| POST | `/api/admin/loyalty/add-points` | authenticateToken + requireAdmin | Add points to a card | 2799 |
| POST | `/api/admin/loyalty/redeem` | authenticateToken + requireAdmin | Redeem points | 2843 |
| POST | `/api/admin/loyalty/purchases` | authenticateToken + requireAdmin | Record a purchase | 3097 |
| DELETE | `/api/admin/loyalty/purchases/:id` | authenticateToken + requireAdmin | Delete a purchase record | 3164 |
| GET | `/api/admin/loyalty/profiles/:cardId` | authenticateToken + requireAdmin | Single card detail | 3191 |
| GET | `/api/search/loyalty-profiles` | authenticateToken | Search loyalty cards (admin UI, requireAdmin missing) | 3309 |

### 3.9 Admin: users & moderation

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/users` | authenticateToken + requireAdmin | List users | 2413 |
| GET | `/api/stats/users` | authenticateToken | User statistics for dashboard stat cards | 2375 |
| GET | `/api/search/users` | authenticateToken | Search users (admin UI, requireAdmin missing) | 2461 |
| POST | `/api/admin/ban-user` | authenticateToken + requireAdmin | Ban a user | 2529 |
| POST | `/api/admin/unban-user` | authenticateToken + requireAdmin | Unban a user | 2594 |

### 3.10 Uploads

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| POST | `/api/upload-avatar` | rate limit + authenticateToken | Multer avatar upload (used by photo editor) | 3994 |
| POST | `/api/user/upload-avatar` | authenticateToken | Avatar upload (second entry point) | 3835 |

### 3.11 Dev / debug / ops

| METHOD | PATH | Auth | Purpose | Line |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | public | Health check | 1607 |
| POST | `/api/dev/reset-rate-limit` | **public** | Clears rate-limit state - must not ship to production | 3723 |
| POST | `/api/dev/refresh-user-data` | authenticateToken | Refresh cached user data | 3793 |
| GET | `/api/dev/debug-favorites/:userId` | **public** | Dumps a user favourites row - leaks data, remove before launch | 3729 |
| GET | `/api/dev/debug-user/:userId` | **public** | Dumps a user record - leaks data, remove before launch | 3756 |
| GET | `/` | public | Serves `public/index.html` (page route, not an API) | 4447 |

**Security flags for the rebuild:** `POST /api/reviews/:reviewId/like` (3987) has no
`authenticateToken` even though the near-identical `POST /api/reviews/like` (4280) does, so likes
can be forged. `GET /api/search/users`, `GET /api/search/loyalty-profiles` and
`GET /api/stats/users` are missing `requireAdmin`. Three `/api/dev/*` routes are unauthenticated
and expose user records.

## 4. What the homepage loads

### 4.1 Scripts

12 external `<script src>` + 5 inline `<script>` blocks. **All 12 external scripts carry `defer`,
so 0 external scripts are render-blocking.** 0 use `async`. The 5 inline scripts are parser-
blocking by definition (they execute where they appear); they total ~11.8 KB.

| # | Line | Path | async/defer | Blocking? |
| --- | --- | --- | --- | --- |
| 1 | 93 | `js/fragrance-api-service.js?v=20260818` | `defer` | non-blocking |
| 2 | 94 | `js/ai-fragrance-finder.js?v=20260826c` | `defer` | non-blocking |
| 3 | 95 | `js/note-image-resolver.js?v=20260906a` | `defer` | non-blocking |
| 4 | 96 | `js/ingredient-finder.js?v=20260817` | `defer` | non-blocking |
| 5 | 97 | `js/smooth-scroll.js?v=20260814` | `defer` | non-blocking |
| 6 | 98 | `js/fragrance-catalog-data.js?v=20260810` | `defer` | non-blocking |
| 7 | 29046 | `js/i18n-dict.js?v=20260901a` | `defer` | non-blocking |
| 8 | 29047 | `js/i18n.js?v=20260901e` | `defer` | non-blocking |
| 9 | 29048 | `js/guides.js?v=20260909b` | `defer` | non-blocking |
| 10 | 29049 | `js/fragrantica-urls.js?v=20260820e` | `defer` | non-blocking |
| 11 | 29050 | `js/cp-trait-icons.js?v=20260829a` | `defer` | non-blocking |
| 12 | 29051 | `script.js?v=20260909c` | `defer` | non-blocking |

| Inline script | Line | Size |
| --- | --- | --- |
| inline #1 (head, loader/brand) | 179 | 427 B |
| inline #2 (head, config/theme) | 212 | 4,151 B |
| inline #3 (head) | 438 | 3,141 B |
| inline #4 (auth modal bootstrap) | 4051 | 1,021 B |
| inline #5 (end of body, boot/reveal) | 29053 | 3,040 B |
| **Total inline** | | **11,780 B** |

Payload note: `js/fragrance-catalog-data.js` alone is 493 KB and `js/i18n.js` 165 KB. They are
`defer`-ed, but they are still downloaded, parsed and executed before first interaction.

### 4.2 Stylesheets and other `<link>`

13 `<link>` tags: 8 `rel="stylesheet"` in the parsed tree + 1 inside `<noscript>`, 2 icons,
3 `preconnect`. **6 stylesheets are render-blocking**; 2 are deferred with the
`media="print" onload="this.media='all'"` trick; 1 is a `<noscript>` fallback.
There is also 1 inline `<style>` block at line 29208 (4,653 B).

| # | Line | Path / target | rel | media trick | Blocking? |
| --- | --- | --- | --- | --- | --- |
| 1 | 15 | `https://fonts.googleapis.com/css2?family=Inter...` (6 families) | stylesheet | `media="print" onload` | non-blocking |
| 2 | 19 | `styles.css?v=20260909e` | stylesheet | - | **render-blocking** |
| 3 | 80 | `css/fragrance-layout-normalize.css?v=20260850` | stylesheet | - | **render-blocking** |
| 4 | 81 | `css/guides.css?v=20260909b` | stylesheet | - | **render-blocking** |
| 5 | 82 | `css/combined-profiles.css?v=20260814` | stylesheet | `media="print" onload` | non-blocking |
| 6 | 83 | `css/auth-modal.css?v=20260907` | stylesheet | - | **render-blocking** |
| 7 | 84 | `css/charme-signin.css?v=20260909` | stylesheet | - | **render-blocking** |
| 8 | 90 | `css/loader.css?v=20260908c` | stylesheet | - | **render-blocking** |
| 9 | 16 | same Google Fonts URL, inside `<noscript>` | stylesheet | - | no-JS fallback only |
| 10 | 4 | `favicon.svg` | icon | - | n/a |
| 11 | 5 | `favicon.svg` | apple-touch-icon | - | n/a |
| 12 | 13 / 14 | `fonts.googleapis.com`, `fonts.gstatic.com` | preconnect | - | n/a |
| 13 | 85 | `fonts.gstatic.com` (duplicate) | preconnect | - | n/a |

### 4.3 Totals

| Metric | Count |
| --- | --- |
| External scripts | 12 |
| -- render-blocking | **0** |
| -- non-blocking (`defer`) | 12 |
| -- `async` | 0 |
| Inline scripts (always blocking) | 5 (11.8 KB) |
| Stylesheets in the parsed tree | 8 |
| -- render-blocking | **6** |
| -- non-blocking (`media="print"`) | 2 |
| `<noscript>` stylesheet fallbacks | 1 |
| Inline `<style>` blocks | 1 (4.7 KB) |
| `preconnect` hints | 3 (one duplicated) |
| Icon links | 2 |

## 5. Legacy asset dependencies (can it move to `/legacy`?)

**Answer: yes - the page is already subdirectory-safe.** Every local asset is referenced with a
**relative** path (no leading `/`). There are **zero** root-absolute (`/...`) local asset
references in `public/index.html`.

Pattern in use:

* CSS: `styles.css?v=...`, `css/<name>.css?v=...`
* JS: `js/<name>.js?v=...` and `script.js?v=...`
* Images/misc: `favicon.svg`, `assets/map-face-characteristics.png?v=20260829a`,
  `whatsapp-icon.jpg`
* No absolute `/js/...`, `/css/...` or `/assets/...` anywhere.

| Reference kind | Count | Absolute (`/...`) | Relative |
| --- | --- | --- | --- |
| Local assets via `src=` / `href=` | 23 | **0** | **23** |
| Local assets via CSS `url()` | 0 | 0 | 0 |
| External / inline refs (`https://`, `data:`, `#`, `mailto:`, `tel:`) | 419 | n/a | n/a |
| **Total attribute references** | **442** | | |

Breakdown of the 23 relative references:

| Prefix | Count |
| --- | --- |
| `js/*.js` | 11 |
| `css/*.css` | 6 |
| `script.js` | 1 |
| `styles.css` | 1 |
| `favicon.svg` | 2 |
| `assets/map-face-characteristics.png` | 1 |
| `whatsapp-icon.jpg` | 1 |

Of the 419 non-local references: 206 are inline `data:image/...` URIs (product art inlined
directly into the HTML - a major contributor to the 3.8 MB size) and 187 are `https://fimgs.net`
CDN product shots. Neither is affected by moving the page.

**Caveats for a `/legacy` move:**

1. **API calls are root-absolute.** `public/script.js` calls `/api/...` (46 distinct strings) and
   `/uploads/avatars` is mounted at root in `server.js`. Those are unaffected by where the HTML
   lives, but a React app parked elsewhere must keep using absolute `/api` paths.
2. **Server static mount.** `server.js` serves `public/` at `/`. To park the legacy page at
   `/legacy`, simply move `index.html` to `public/legacy/index.html` - the relative asset paths
   keep working with no edits. An explicit `app.use("/legacy", ...)` mount is not required.
3. **Hash links / JS routing.** In-page `#anchor` navigation and the `js/smooth-scroll.js` logic
   operate on element ids, which are path-independent.
4. **`<base>` tag:** none is present, so relative URLs resolve against the document URL - exactly
   the behaviour we want under `/legacy`.

## 6. Rebuild checklist derived from this inventory

1. Replace the 185 near-duplicate product sections with one data-driven product component;
   export the 186 products (103 brands) into a real catalog resource.
2. Delete all 114 transition spacers; use CSS spacing.
3. Rebuild the 28 distinct chrome blocks as real components; the 22 modals want a single
   modal shell + portal rather than 22 hidden `div`s.
4. Keep `/api/*` (auth, profile, settings, favourites, reviews/likes/replies, notes, news, store
   hours, loyalty, uploads, admin) as-is - it is the only real backend.
5. Cart, checkout and order history do not exist server-side - design them fresh.
6. Get the 206 `data:image` payloads out of the HTML (biggest single win against 3.8 MB).
7. Consolidate the 6 render-blocking stylesheets; keep the `media="print"` trick for fonts.
8. Fix or remove the unauthenticated routes flagged in section 3 before the new front end ships.