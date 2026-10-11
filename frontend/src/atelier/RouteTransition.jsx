import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Routes } from "react-router-dom";
import { getLenis } from "./SmoothScroll.jsx";

/*
 * Tab (route) transitions.
 *
 * Deliberately NOT the View Transitions API. Tried it; it produced real
 * artifacts (Chrome animated the transition group between two very
 * different page heights, scaling the entire outgoing document into the
 * viewport) and, worse, its pause is trivially defeated by a media query
 * -- which silently made the whole thing a no-op on machines reporting
 * prefers-reduced-motion.
 *
 * So the motion is owned here, in JS + CSS, and is therefore always
 * perceptible. Sequence on a tab change:
 *   1. the outgoing page glides up while it fades and slides away
 *      (a real scroll-up driven by Lenis, not a snap to 0)
 *   2. the incoming page rises into place, section by section
 *
 * prefers-reduced-motion shortens the timings here; it never disables
 * them, because "no animation at all" is what a broken site feels like.
 */

const OUT_MS = 320;
const OUT_MS_REDUCED = 150;
const IN_MS = 680;
const STAGGER_MS = 90;

/* Primary navigation order, so "back" reads as back. */
const ORDER = [
  "/",
  "/collection",
  "/guides",
  "/contact",
  "/news",
  "/faithful",
  "/auth",
  "/cart",
  "/profile",
  "/favorites",
  "/loyalty",
  "/admin",
];

function navDirection(fromPath, toPath) {
  const a = ORDER.indexOf(fromPath);
  const b = ORDER.indexOf(toPath);
  if (a === -1 || b === -1) return "forward";
  return b >= a ? "forward" : "back";
}

function prefersReduced() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function RouteTransition({ children }) {
  const live = useLocation();
  const [phase, setPhase] = useState("in");
  const [leaving, setLeaving] = useState(live);
  const last = useRef(live);
  const timer = useRef(0);

  useEffect(() => {
    /* Search-param and hash changes are NOT page changes. They must reach the
       routed component untouched -- the collection page drives its whole
       filter UI through useSearchParams, and it does so on every keystroke.
       Only a pathname change earns a transition. */
    if (live.pathname === last.current.pathname) {
      last.current = live;
      return;
    }

    const from = last.current;
    last.current = live;

    const lenis = getLenis();
    const outMs = prefersReduced() ? OUT_MS_REDUCED : OUT_MS;

    document.documentElement.dataset.navDir = navDirection(from.pathname, live.pathname);

    // Glide to the top while the page leaves: a visible scroll-up, not a snap.
    if (lenis && window.scrollY > 4) {
      lenis.scrollTo(0, {
        duration: outMs / 1000,
        easing: (t) => 1 - (1 - t) * (1 - t),
      });
    } else {
      window.scrollTo(0, 0);
    }

    setLeaving(from);
    setPhase("out");

    // Rapid hops: a later navigation supersedes the one still leaving.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setPhase("in");
      delete document.documentElement.dataset.navDir;
    }, outMs);
  }, [live]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Timing exposed for the CSS to read, so both stay in sync.
  const duration = prefersReduced() ? IN_MS / 2 : IN_MS;
  const reduced = prefersReduced();

  /* While leaving we render the outgoing location (that is what animates out);
     once in, we hand the LIVE location to Routes so hooks inside the page see
     the current URL. Keying on pathname -- not location.key, which the router
     regenerates for search changes too -- is what stops a keystroke from
     remounting the page under the user's cursor. */
  const routed = phase === "out" ? leaving : live;

  return (
    <div
      className="stage"
      data-phase={phase}
      key={routed.pathname}
      style={{
        "--stage-in": `${duration}ms`,
        "--stage-stagger": `${reduced ? STAGGER_MS / 3 : STAGGER_MS}ms`,
        "--stage-out": `${reduced ? OUT_MS_REDUCED : OUT_MS}ms`,
      }}
    >
      <Routes location={routed}>{children}</Routes>
    </div>
  );
}
