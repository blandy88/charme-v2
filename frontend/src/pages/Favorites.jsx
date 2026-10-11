import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Favorites() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    if (!user) {
      setState("ready");
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api("/api/user/favorites");
        if (!alive) return;
        setItems(res.favorites || []);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) {
    return (
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-cream">Favorites</h1>
        <p className="mt-3 text-sm text-muted">
          <Link to="/auth" className="text-brass underline underline-offset-4">Sign in</Link> to see your favorites.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <p className="meta">Saved</p>
      <h1 className="mt-2 font-display text-3xl text-cream">Favorites</h1>
      {state === "loading" ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : state === "error" ? (
        <p className="mt-6 text-sm text-muted">Could not load favorites right now.</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing saved yet — tap the heart on any fragrance.</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((f) => (
            <li key={f.id} className="rounded-sm border border-hairline bg-surface px-4 py-3 text-sm text-cream">
              {f.productName}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
