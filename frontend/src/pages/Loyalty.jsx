import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

/*
 * Loyalty: the server exposes cards only through the admin endpoint
 * (GET /api/admin/loyalty) — there is no self-service "my card" route.
 * Admins get the live cards table here; everyone else gets pointed at
 * sign-in and the boutique. Same data the legacy panel showed, no zeros
 * from a dead fallback: empty/error states say so explicitly.
 */
export default function Loyalty() {
  const { user, isAdmin } = useAuth();
  const [cards, setCards] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    if (!isAdmin) {
      setState("ready");
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api("/api/admin/loyalty");
        if (!alive) return;
        setCards(res.cards || []);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (!user) {
    return (
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <p className="meta">Rewards</p>
        <h1 className="mt-2 font-display text-3xl text-cream">Carte Fidélité</h1>
        <p className="mt-3 text-sm text-muted">
          <Link to="/auth" className="text-brass underline underline-offset-4">Sign in</Link> to see loyalty information.
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <p className="meta">Rewards</p>
        <h1 className="mt-2 font-display text-3xl text-cream">Carte Fidélité</h1>
        <div className="mt-6 rounded-sm border border-hairline bg-surface p-6">
          <p className="text-sm leading-relaxed text-muted">
            Your loyalty card is managed by the boutique — ask in store or on WhatsApp
            and your points will appear here on your next visit.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
      <p className="meta">Rewards · Admin</p>
      <h1 className="mt-2 font-display text-3xl text-cream">Carte Fidélité</h1>
      {state === "loading" ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : state === "error" ? (
        <p className="mt-6 text-sm text-muted">Could not load cards right now. Try again in a moment.</p>
      ) : cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No cards yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {cards.map((c) => (
            <li key={c.cardId || c.id} className="flex items-center justify-between gap-3 rounded-sm border border-hairline bg-surface px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-cream">{c.name || c.cardNumber || c.cardId}</span>
              <span className="shrink-0 tabular-nums text-brass">{c.points ?? 0} pts</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
