import { createContext, useContext, useEffect, useState } from "react";

/**
 * The catalogue is its own chunk (dynamic import) so the app shell paints
 * before 78 KB of data arrives. Loaded once and cached at module scope, so
 * navigating between routes never refetches.
 */
let cache = null;
let inflight = null;

export function loadCatalogue() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = import("virtual:catalogue").then((mod) => {
      cache = mod.default;
      return cache;
    });
  }
  return inflight;
}

const CatalogueContext = createContext({ items: null, loading: true });

export function CatalogueProvider({ children }) {
  const [state, setState] = useState({ items: null, loading: true });

  useEffect(() => {
    let alive = true;
    loadCatalogue().then(
      (items) => alive && setState({ items, loading: false }),
      (error) => {
        console.error("Catalogue failed to load:", error);
        if (alive) setState({ items: [], loading: false });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <CatalogueContext.Provider value={state}>{children}</CatalogueContext.Provider>
  );
}

export function useCatalogue() {
  return useContext(CatalogueContext);
}

/** slug -> fragrance. Slugs repeat in the source data; first occurrence wins. */
export function indexBySlug(items) {
  const map = new Map();
  for (const item of items || []) {
    if (!map.has(item.slug)) map.set(item.slug, item);
  }
  return map;
}
