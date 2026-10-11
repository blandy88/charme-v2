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

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/*
 * A basket line is the product *at a size and concentration*: the legacy cart
 * keys on (productId, quality, size), so a 50ml and a 100ml of the same
 * fragrance sit side by side instead of merging. The key is derived, never
 * stored, so old entries (which have no key) still resolve.
 */
export function lineKey(item) {
  return [item?.id ?? item?.productId ?? "", item?.quality || "", item?.size || ""].join("::");
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable — the basket lives in memory for this session */
    }
  }, [lines]);

  const add = useCallback((item) => {
    setLines((prev) => {
      const key = lineKey(item);
      const found = prev.find((l) => lineKey(l) === key);
      if (found) {
        return prev.map((l) =>
          lineKey(l) === key ? { ...l, qty: (num(l.qty) || 1) + (num(item.qty) || 1) } : l,
        );
      }
      return [...prev, { ...item, qty: num(item.qty) || 1 }];
    });
  }, []);

  const remove = useCallback((key) => setLines((prev) => prev.filter((l) => lineKey(l) !== key)), []);

  /* qty <= 0 removes the line, which is what the "−" button at 1 should do. */
  const setQty = useCallback((key, qty) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => lineKey(l) !== key)
        : prev.map((l) => (lineKey(l) === key ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + (num(l.qty) || 1), 0);
    const subtotal = lines.reduce((n, l) => n + num(l.price) * (num(l.qty) || 1), 0);
    return { lines, loaded: true, count, subtotal, add, remove, setQty, clear };
  }, [lines, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
