/*
 * Shared-element morph: the card you clicked grows into the product hero.
 *
 * RouteTransition.jsx deliberately does NOT use the View Transitions API for
 * page changes -- a full-page transition between two very different page
 * heights makes Chrome scale one document into the other. What the API is
 * genuinely good for is ONE named pair whose geometry matches: `.shelf-media`,
 * `.also-media` and `.pdp-media` are all 3/4 boxes, so the group interpolates
 * position and size and has nothing to distort.
 *
 * Two invariants this module exists to protect:
 *
 *   1. At most ONE element in the document may carry the name. Two would
 *      abort the transition with a console error and no animation at all.
 *      Every write goes through here, and arming releases the previous holder
 *      -- including the PDP hero, which keeps its name until it unmounts.
 *   2. `.stage` carries `view-transition-name: page` (shell.css) so the nav
 *      and footer stay out of the transition. Its SIZE, however, differs
 *      wildly between the grid and the PDP, and a group that changes size
 *      stretches its snapshot -- the original artifact. So for the duration
 *      of a morph the stage's name is removed: everything then falls into the
 *      root group, which is viewport-sized in both states and therefore only
 *      ever cross-fades.
 */

const MORPH_NAME = "bottle-morph";

/* An arm nobody used must not outlive the gesture that made it -- a stray
   name on a live element would poison the next transition. The chunk wait in
   RouteTransition is 1200ms, so this only has to cover a click that turned
   out not to be a navigation. */
const ARM_TTL_MS = 1500;

/** Every element currently carrying the name. Usual length: 0 or 1. */
const named = new Set();

/** The element playing the OLD side of the morph. */
let armed = null;

let ttl = 0;
let inFlight = false;

function clearTtl() {
  if (ttl) {
    window.clearTimeout(ttl);
    ttl = 0;
  }
}

function apply(el) {
  el.style.viewTransitionName = MORPH_NAME;
  named.add(el);
}

function release(el) {
  if (named.delete(el)) el.style.viewTransitionName = "";
}

function releaseArmed() {
  if (armed) release(armed);
  armed = null;
  clearTtl();
}

/** Drops the name from every holder except `keep`. */
function releaseOthers(keep) {
  for (const el of [...named]) if (el !== keep) release(el);
}

/**
 * Records the media box of a card that was just pressed. Called from a
 * capture-phase pointerdown listener, i.e. before React's click handler has
 * navigated anywhere.
 */
export function armMorph(el) {
  if (!(el instanceof Element) || armed === el) return;
  releaseOthers(el);
  apply(el);
  armed = el;
  clearTtl();
  ttl = window.setTimeout(() => {
    if (armed === el) releaseArmed();
  }, ARM_TTL_MS);
}

/**
 * Names the hero of a page that a morph is navigating TO. Only called while
 * a transition is in flight, so the cost of the extra layer is paid for a
 * single frame and not for the whole visit.
 */
export function nameMorphTarget(el) {
  if (!(el instanceof Element) || named.has(el)) return;
  releaseOthers(el);
  apply(el);
}

export function unnameMorphTarget(el) {
  if (el instanceof Element) release(el);
}

export function disarmMorph() {
  releaseArmed();
}

function morphArmed() {
  return armed !== null;
}

export function morphInFlight() {
  return inFlight;
}

function canMorph() {
  return typeof document.startViewTransition === "function";
}

function prefersReduced() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

let stage = null;

/* The stage is re-named as soon as the transition settles. Doing it any
   earlier would put the name back in the middle of a capture. */
function unnameStage() {
  stage = document.querySelector(".stage");
  if (stage) stage.style.viewTransitionName = "none";
}

function renameStage() {
  if (stage) stage.style.viewTransitionName = "";
  stage = null;
}

/**
 * Starts the morph.
 *
 * `update` must swap the routed location synchronously (flushSync); the new
 * state is captured the moment the callback returns, which is why the caller
 * also resets the scroll inside it. `cleanup`, when given, runs once the
 * transition has finished -- successfully, skipped or failed -- so transient
 * DOM state set up inside `update` is never left behind.
 *
 * Returns false only when no transition could be started at all -- browser
 * without the API, reduced motion, nothing armed, or startViewTransition
 * itself throwing -- and in every one of those cases the caller falls back
 * to its own choreography with no state left behind.
 */
export function runMorph(update, cleanup) {
  if (!canMorph() || prefersReduced() || !morphArmed()) return false;

  const commit = () => {
    try {
      update();
    } catch (err) {
      /* Chrome's own rule for a throwing update callback is to skip the
         transition, so there is nothing to undo here -- and the route still
         has to land. Swallowing it silently would make this undebuggable. */
      console.error("[morph] route commit threw inside the view transition:", err);
    }
  };

  unnameStage();
  let transition;
  inFlight = true;
  try {
    transition = document.startViewTransition(commit);
  } catch {
    inFlight = false;
    renameStage();
    releaseArmed();
    return false;
  }

  clearTtl();
  const settle = () => {
    inFlight = false;
    renameStage();
    releaseArmed();
    if (cleanup) cleanup();
  };
  /* `finished` rejects when the browser skips the transition (duplicate
     name, hidden document, user preference). Either way the arm is done
     and the stage has to be re-named, so both paths settle the same way. */
  transition.finished.then(settle, settle);
  return true;
}
