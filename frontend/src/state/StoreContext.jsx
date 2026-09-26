import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from "../lib/api.js";

const GUEST_FAVS = "perfumeFavorites_guest";

/** Matches the legacy site's per-user cart key so existing carts carry over. */
function cartKey() {
  const user = getStoredUser();
  return user && user.email ? `parfumerie_cart_${user.email}` : "parfumerie_cart_guest";
}

function readCart() {
  try {
    const raw = localStorage.getItem(cartKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readGuestFavs() {
  try {
    const raw = localStorage.getItem(GUEST_FAVS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setTokenState] = useState(getToken());
  const [cart, setCart] = useState(readCart);
  const [favourites, setFavourites] = useState(readGuestFavs);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Persist the cart under the active user's key.
  useEffect(() => {
    try {
      localStorage.setItem(cartKey(), JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  // Signed-in users keep favourites on the server; guests keep them locally.
  useEffect(() => {
    if (!token) {
      setFavourites(readGuestFavs());
      return undefined;
    }
    let alive = true;
    api
      .favourites()
      .then((data) => {
        if (!alive || !data) return;
        const list = Array.isArray(data) ? data : data.favorites || [];
        setFavourites(list.map((f) => f.productId ?? f.product_id ?? f.id));
      })
      .catch(() => {
        /* offline or expired token: keep whatever we have */
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const persistGuestFavs = (list) => {
    try {
      localStorage.setItem(GUEST_FAVS, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const addToCart = useCallback((fragrance, size) => {
    const entry = size || (fragrance.sizes && fragrance.sizes[0]);
    if (!entry) return;
    const key = `${fragrance.slug}|${entry.size}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          slug: fragrance.slug,
          name: fragrance.name,
          brand: fragrance.brand,
          size: entry.size,
          price: entry.price,
          image: fragrance.image,
          qty: 1,
        },
      ];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((key, delta) => {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, qty: Math.max(0, line.qty + delta) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }, []);

  const removeLine = useCallback((key) => {
    setCart((current) => current.filter((line) => line.key !== key));
  }, []);

  const toggleFavourite = useCallback(
    async (id) => {
      const active = favourites.includes(id);
      const next = active
        ? favourites.filter((f) => f !== id)
        : [...favourites, id];
      setFavourites(next);
      if (!token) {
        persistGuestFavs(next);
        return;
      }
      try {
        await api.toggleFavourite(id);
      } catch {
        setFavourites(favourites); // roll back on failure
      }
    },
    [favourites, token],
  );

  const login = useCallback(async (email, password, remember = true) => {
    const data = await api.login(email, password);
    const jwt = data?.token || data?.accessToken;
    if (!jwt) throw new Error("No token returned");
    setToken(jwt, remember);
    setTokenState(jwt);
    const profile = data?.user || { email };
    setStoredUser(profile);
    setUser(profile);
    setCart(readCart()); // switch to this user's cart
    return profile;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState("");
    setStoredUser(null);
    setUser(null);
    setCart(readCart());
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthed: Boolean(token),
      cart,
      cartCount: cart.reduce((sum, line) => sum + line.qty, 0),
      cartTotal: cart.reduce((sum, line) => sum + line.price * line.qty, 0),
      addToCart,
      updateQty,
      removeLine,
      favourites,
      toggleFavourite,
      login,
      logout,
      cartOpen,
      setCartOpen,
      authOpen,
      setAuthOpen,
    }),
    [
      user,
      token,
      cart,
      addToCart,
      updateQty,
      removeLine,
      favourites,
      toggleFavourite,
      login,
      logout,
      cartOpen,
      authOpen,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
