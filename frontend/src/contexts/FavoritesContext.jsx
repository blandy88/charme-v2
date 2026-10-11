import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, getToken } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

/*
 * Favourites — the one thing the legacy navbar, the favourites modal, the
 * account menu and every product block all share, and the one piece the
 * Atelier build had no store for (the /favorites route was a placeholder).
 *
 * Two sources of truth, mirrored:
 *   - localStorage   -> works signed-out, survives reloads, instant.
 *   - /api/user/favorites -> the legacy table, used when a token is present.
 *
 * The local list is the render source (so a heart never flickers), and the API
 * is reconciled in the background: on sign-in we merge the server rows in, and
 * an optimistic toggle is rolled back if the request fails.
 *
 * A favourite is keyed by the catalogue id (unique; 10 of 752 slugs collide).
 * We keep the name/brand too because the API only ever stores id + name, and
 * the favourites page has to render something for server-only rows.
 */
const FavoritesContext = createContext(null);
const STORAGE_KEY = "charme-favorites";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.id) : [];
  } catch {
    return [];
  }
}

const keyOf = (p) => String(p?.id ?? p?.productId ?? p?.slug ?? "");

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(load);
  const [ready, setReady] = useState(false);
  /* id -> last-known record, so a toggle that only carries an id still has a
     name to send to the API (and to show if the server echoes it back). */
  const known = useRef(new Map());

  for (const it of items) known.current.set(it.id, it);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable — favourites stay in memory for this session */
    }
  }, [items]);

  useEffect(() => {
    if (!user) {
      setReady(true);
      return undefined;
    }
    let alive = true;
    api("/api/user/favorites")
      .then((d) => {
        if (!alive) return;
        const server = (d?.favorites || []).map((f) => ({
          id: String(f.productId),
          name: f.productName || "",
        }));
        setItems((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          for (const s of server) byId.set(s.id, { ...(byId.get(s.id) || {}), ...s });
          return [...byId.values()];
        });
      })
      .catch(() => {
        /* offline / not signed in on the server side — local list still works */
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const has = useCallback((id) => items.some((i) => i.id === String(id)), [items]);

  const toggle = useCallback((product) => {
    const id = keyOf(product);
    if (!id) return;
    const prev = known.current.get(id);
    const record = {
      id,
      name: product?.name || product?.productName || prev?.name || "",
      brand: product?.brand || prev?.brand || "",
      slug: product?.slug || prev?.slug || "",
      /* Whatever the surface knew, so the favourites page can render a card
         without refetching the catalogue (the API only stores id + name). */
      price: product?.price ?? product?.fromPrice ?? prev?.price ?? null,
      unit: product?.unit || prev?.unit || "",
      image: product?.image || prev?.image || "",
      kind: product?.kind || prev?.kind || "",
    };
    const wasSaved = items.some((i) => i.id === id);

    setItems((list) => (wasSaved ? list.filter((i) => i.id !== id) : [record, ...list]));
    known.current.set(id, record);

    if (getToken()) {
      api("/api/user/favorites/toggle", {
        method: "POST",
        body: { productId: id, productName: record.name || id },
      }).catch(() => {
        /* put it back exactly where it was */
        setItems((list) => (wasSaved ? [record, ...list] : list.filter((i) => i.id !== id)));
      });
    }
  }, [items]);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.length, ready, has, toggle, clear }),
    [items, ready, has, toggle, clear],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
}

/* A shared heart button. Uses the store, and stays a real <button> so the
   surrounding card can be a link without nesting interactive elements. */
export function FavoriteButton({ product, className = "", label, savedLabel, size = 16 }) {
  const { has, toggle } = useFavorites();
  const id = keyOf(product);
  const on = has(id);
  return (
    <button
      type="button"
      className={`fav-btn pressable ${on ? "on" : ""} ${className}`.trim()}
      aria-pressed={on}
      aria-label={on ? savedLabel : label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
