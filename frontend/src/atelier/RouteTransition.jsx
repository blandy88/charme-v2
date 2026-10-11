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
  const location = useLocation();
  const [state, setState] = useState({ location, phase: "in" });
  const timer = useRef(0);
  const target = useRef(null);
  const shown = useRef(location);

  useEffect(() => {
    if (location === shown.current) return;
    if (target.current === location) return;
    target.current = location;

    const lenis = getLenis();
    const reduced = prefersReduced();
    const outMs = reduced ? 150 : OUT_MS;

    document.documentElement.dataset.navDir = navDirection(
      shown.current.pathname,
      location.pathname
    );

    // Glide to the top while the page leaves: a visible scroll-up, not a snap.
    if (lenis && window.scrollY > 4) {
      lenis.scrollTo(0, {
        duration: outMs / 1000,
        easing: (t) => 1 - (1 - t) * (1 - t),
      });
    } else {
      window.scrollTo(0, 0);
    }

    setState((s) => ({ ...s, phase: "out" }));

    timer.current = window.setTimeout(() => {
      shown.current = location;
      setState({ location, phase: "in" });
      target.current = null;
      delete document.documentElement.dataset.navDir;
    }, outMs);
  }, [location]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Timing exposed for the CSS to read, so both stay in sync.
  const duration = prefersReduced() ? IN_MS / 2 : IN_MS;

  return (
    <div
      className="stage"
      data-phase={state.phase}
      key={state.location.key}
      style={{
        "--stage-in": `${duration}ms`,
        "--stage-stagger": `${prefersReduced() ? STAGGER_MS / 3 : STAGGER_MS}ms`,
        "--stage-out": `${prefersReduced() ? 150 : OUT_MS}ms`,
      }}
    >
      <Routes location={state.location}>{children}</Routes>
    </div>
  );
}
