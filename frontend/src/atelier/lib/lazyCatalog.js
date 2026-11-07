/*
 * The catalogue is ~550KB and lives in the Collection chunk. Everything that
 * needs it off the critical path — the nav search, the discovery overlay —
 * shares this one lazy loader so the module is fetched at most once.
 *
 * The VALUE is no longer cached: the admin can add or restock a perfume while
 * the page is open, so every call resolves the current merged snapshot.
 * Components get re-renders from useCatalogue() in catalogStore.js.
 */
import { getCatalogue } from "./catalogStore.js";

let INFLIGHT = null;

export function loadCatalogue() {
  if (!INFLIGHT) {
    const attempt = import("./catalog.js").then(() => undefined);
    /* A failed chunk must stay a failure: Discover renders an error from the
       rejection, and releasing INFLIGHT lets a later retry actually retry.
       Swallowing it here would show an empty catalogue instead. */
    attempt.catch(() => {
      if (INFLIGHT === attempt) INFLIGHT = null;
    });
    INFLIGHT = attempt;
  }
  return INFLIGHT.then(() => getCatalogue());
}
