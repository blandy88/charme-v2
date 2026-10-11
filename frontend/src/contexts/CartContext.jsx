import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "charme-cart";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/*
 * Cart is client-side only (the legacy site keeps it in localStorage too —
 * there is no /api/cart on the server). Same shape, same persistence key
 * family, so switching surfaces never loses the basket.
 */
export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const add = useCallback((item) => {
    setLines((prev) => {
      const key = item.id || item.product || item.slug;
      const found = prev.find((l) => (l.id || l.product || l.slug) === key);
      if (found) {
        return prev.map((l) =>
          (l.id || l.product || l.slug) === key
            ? { ...l, qty: (l.qty || 1) + (item.qty || 1) }
            : l,
        );
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
  }, []);

  const remove = useCallback((id) => {
    setLines((prev) => prev.filter((l) => (l.id || l.product || l.slug) !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, loaded: true, count: lines.reduce((n, l) => n + (l.qty || 1), 0), add, remove, clear }),
    [lines, add, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
