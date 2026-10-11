import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, resetSessionFlag } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback((message) => {
    setToken("");
    setUser(null);
    resetSessionFlag();
    if (message) {
      try {
        sessionStorage.setItem("charme-notice", message);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return null;
    }
    try {
      const res = await api("/api/user/profile");
      /* The endpoint answers {success, user}; only `user` is the profile. The
         login endpoint answers a flat {id, name, isAdmin…} under its own
         `user` key, so both paths land on the same shape here. */
      const me = (res && res.user) || res || null;
      setUser(me);
      return me;
    } catch (err) {
      if (err.code !== "SESSION_EXPIRED") {
        setToken("");
        setUser(null);
      }
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onExpired = () => {
      setUser(null);
    };
    window.addEventListener("charme:session-expired", onExpired);
    return () => window.removeEventListener("charme:session-expired", onExpired);
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isAdmin: Boolean(
        user &&
          (user.is_admin === 1 ||
            user.is_admin === true ||
            user.isAdmin === true ||
            user.role === "admin"),
      ),
      ready,
      refresh,
      signOut,
      async signIn(email, password, remember = true) {
        const res = await api("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
        if (res.token) setToken(res.token, remember);
        resetSessionFlag();
        setUser(res.user || null);
        /* The login payload has name/avatar but not first_name/last_name, so
           re-read the canonical profile. Falls back to the login payload if
           that call fails — better a thin user than none. */
        const me = await refresh();
        if (!me) setUser(res.user || null);
        return res;
      },
      async register(payload) {
        return api("/api/auth/register", { method: "POST", body: payload, auth: false });
      },
    }),
    [user, ready, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
