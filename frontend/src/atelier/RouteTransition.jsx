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

/* Never let a slow chunk hold a tab change hostage. */
const CHUNK_WAIT_MS = 1200;

/* Primary navigation order, so "back" reads as back. */
const ORDER = [
  "/",
  "/collection",
  "/guides",
  "/contact",
  "/news",
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

export default function RouteTransition({ children, preload }) {
  const live = useLocation();
  const [phase, setPhase] = useState("in");
  /* The location the stage is actually showing. This is NOT the same thing as
     `live`, and the difference is the whole point.

     After a navigation, `live` is already the new location, but the outgoing
     beat has not started yet -- it begins in the effect below, one commit
     later. If this component rendered `live` straight away, the new page would
     mount for a frame, then be thrown away and replaced by the old page so the
     old page could animate out, and then mount a second time for the incoming
     beat. Three mounts, one of them a single frame of the wrong page: that
     flicker is what makes a tab change feel like a page refresh. So the stage
     renders the last SHOWN location until the beat lands, and `live` only takes
     over once `shown` has caught up. */
  const [shown, setShown] = useState(live);
  const timer = useRef(0);

  useEffect(() => {
    /* Search-param and hash changes are NOT page changes. They must reach the
       routed component untouched -- the collection page drives its whole
       filter UI through useSearchParams, and it does so on every keystroke.
       Only a pathname change earns a transition. */
    if (live.pathname === shown.pathname) return;

    const from = shown;
    let cancelled = false;
    let started = false;
    let chunk = null;
    let gaveUp = 0;

    const begin = () => {
      if (cancelled || started) return;
      started = true;

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

      setPhase("out");

      // Rapid hops: a later navigation supersedes the one still leaving.
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        setShown(live);
        setPhase("in");
        delete document.documentElement.dataset.navDir;
      }, outMs);
    };

    /* A catalogue route is a split chunk. If the incoming beat started before
       that chunk arrived, it would play against the Suspense placeholder and
       the real page would pop in afterwards -- precisely the jolt this is meant
       to avoid. So the outgoing page stays put until the chunk is in hand; on
       an intent-driven preload (pointer, focus) it is already cached and there
       is nothing to wait for. The timer is a floor, not the expected path. */
    chunk = preload ? preload(live.pathname) : null;
    if (chunk && typeof chunk.then === "function") {
      gaveUp = window.setTimeout(begin, CHUNK_WAIT_MS);
      chunk.then(begin, begin);
    } else {
      begin();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(gaveUp);
    };
  }, [live, shown, preload]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Timing exposed for the CSS to read, so both stay in sync.
  const duration = prefersReduced() ? IN_MS / 2 : IN_MS;
  const reduced = prefersReduced();

  /* Once the beat has landed, hand the LIVE location to Routes so hooks inside
     the page see the current URL (`shown` and `live` agree on the pathname by
     then, so this is the only place search params can change). Until then,
     render what is on screen. Keying on pathname -- not location.key, which the
     router regenerates for search changes too -- is what stops a keystroke from
     remounting the page under the user's cursor. */
  const routed = live.pathname === shown.pathname ? live : shown;

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
