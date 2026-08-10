# Handoff Package — Navbar + Scroll-Down Animation

Extracted verbatim from the live repo so you can send these to another AI for a redesign.

## Files

| File | What it is | Source |
|------|-----------|--------|
| `01-navbar-html.txt` | The complete `<nav class="navbar">` HTML (links, search bar, news/notification/cart icons, auth) | `index.html` lines 197–1212 |
| `02-navbar-css.txt` | All core navbar CSS (layout, brand, nav-links, quick-search, cart icon, responsive) | `styles.css` |
| `03-scroll-anim-js.txt` | The JS that hides the navbar on scroll-down / reveals on scroll-up (velocity-based, rAF-throttled) | `script.js` lines 155–282 |
| `04-scroll-anim-css.txt` | The CSS classes (`top-shell-scrolled`, `top-shell-hidden`) that actually animate the hide/reveal + reduced-motion | `styles.css` lines 22461–22505 |

## What the other AI needs to know

1. The navbar is `position: fixed` inside a dark hero over a background video. It sits below a `.top-marquee` announcement bar (`--marquee-height: 32px`) when the marquee is open.
2. Two separate things are at play on scroll:
   - **Hide/reveal** — driven by `body.top-shell-hidden` (velocity-based). CSS does the actual motion (translate3d + opacity + blur).
   - **Background transition** — `script.js` changes the page background color + vignette as you scroll between sections (`getScrollBackgroundColor()`, ~lines 1886–2220, `onScroll()` ~2471). Mentioned in `04` if they also want to redesign that.
3. All colors use CSS variables (`--color-gold`, `--color-gold-bright`, etc.) plus rgba() literals. The accent gold is roughly `#c9a94e`.
4. Changes MUST keep the same body-class contract (`top-shell-scrolled`, `top-shell-hidden`, `has-marquee`) unless `script.js` is updated too — the JS toggles those classes.
5. Any new CSS must override styles.css — that file already has `!important` on the top-shell rules.

## Where the code lives in the real repo

- `index.html` — navbar HTML at line 197
- `styles.css` — navbar CSS ~line 576, scroll CSS ~line 22461
- `script.js` — scroll logic at line 155 (top chrome) and ~1886 (background transitions)

## IMPORTANT for the other AI

Do NOT rewrite these files from scratch — they are huge (index.html ~27k lines, styles.css ~23.5k lines). Make **surgical edits** to the existing blocks and keep every surrounding class/ID intact (quickSearchDropdown, navbarNotificationContainer, navbarCartIcon, ai-finder, auth modal triggers, etc.), because the JS wires them by ID.
