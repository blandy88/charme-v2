import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Routes } from "react-router-dom";
import { flushSync } from "react-dom";
import { getLenis } from "./SmoothScroll.jsx";

/*
 * Tab (route) transitions — native View Transitions API.
 *
 * Why hand-rolled instead of react-router's `viewTransition` prop: this
 * build of react-router-dom has no such prop, and three things need
 * coordinating that the router cannot see:
 *   1. Lenis must be frozen, or it fights the scroll reset mid-transition
 *   2. scroll must land on 0 *after* the new DOM is flushed but *before*
 *      the new snapshot is taken, or the new page opens mid-page
 *   3. direction (forward/back) for spatial continuity between tabs
 *
 * Choreography lives in tokens.css (`::view-transition-*`): the old page
 * leaves fast (300ms), the new one arrives slow (560ms) on a soft spring —
 * deliberately offset so the two never half-dissolve into a wash.
 * Degrades to a plain route swap where the API is absent.
 */

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

export default function RouteTransition({ children }) {
  const location = useLocation();
  const [display, setDisplay] = useState(location);
  const running = useRef(false);

  useEffect(() => {
    if (location === display) return;

    const lenis = getLenis();
    const dir = navDirection(display.pathname, location.pathname);
    const root = document.documentElement;
    const start =
      typeof document.startViewTransition === "function"
        ? document.startViewTransition.bind(document)
        : null;

    if (!start || running.current) {
      setDisplay(location);
      window.scrollTo(0, 0);
      return;
    }

    // Freeze the smoother: without this Lenis keeps easing toward its old
    // target while we reset the scroll position underneath it.
    lenis?.stop?.();
    root.dataset.navDir = dir;

    // Show the outgoing page where you actually were, not at its top.
    const stage = document.querySelector(".stage");
    const stageTop = stage ? stage.getBoundingClientRect().top + window.scrollY : 0;
    root.style.setProperty("--vt-offset", `${Math.max(0, window.scrollY - stageTop)}px`);

    running.current = true;

    const transition = start(() => {
      flushSync(() => setDisplay(location));
      // New DOM is live; pin scroll before the new snapshot is captured.
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    });

    const settle = () => {
      running.current = false;
      lenis?.start?.();
      delete root.dataset.navDir;
      root.style.removeProperty("--vt-offset");
    };

    if (transition && transition.finished) transition.finished.then(settle, settle);
    else settle();
  }, [location, display]);

  return (
    /* `location` pins Routes to the captured location, so React's DOM update
       and the browser's old/new snapshots describe the same two states. */
    <div className="stage">
      <Routes location={display}>{children}</Routes>
    </div>
  );
}
