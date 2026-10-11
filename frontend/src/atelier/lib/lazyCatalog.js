/*
 * The catalogue is ~550KB and lives in the Collection chunk. Everything that
 * needs it off the critical path — the nav search, the discovery overlay —
 * shares this one lazy loader so the module is fetched at most once.
 */

let CATALOGUE = null;
let INFLIGHT = null;

export function loadCatalogue() {
  if (CATALOGUE) return Promise.resolve(CATALOGUE);
  if (!INFLIGHT) {
    INFLIGHT = import("./catalog.js").then((m) => {
      CATALOGUE = m.products;
      return CATALOGUE;
    });
  }
  return INFLIGHT;
}
