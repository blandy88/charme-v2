import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

/*
 * Admin console: loyalty management wired to the real endpoints
 * (GET /api/admin/loyalty, POST add-points/redeem/create).
 * Same actions the legacy panel had; errors shown inline, never as
 * unreadable toasts or silent zeros.
 */
export default function Admin() {
  const { user, isAdmin, ready } = useAuth();
  const [cards, setCards] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const res = await api("/api/admin/loyalty");
      setCards(res.cards || []);
      setState("ready");
    } catch (err) {
      setError(err.code === "SESSION_EXPIRED" ? "Session expired — please sign in again." : "Could not load cards.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (ready && isAdmin) load();
    else if (ready) setState("ready");
  }, [ready, isAdmin, load]);

  async function mutate(path, body, cardId) {
    setBusyId(cardId);
    setError("");
    try {
      await api(path, { method: "POST", body });
      await load();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) return <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6"><p className="text-sm text-muted">Loading…</p></main>;

  if (!user || !isAdmin) {
    return (
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-cream">Admin</h1>
        <p className="mt-3 text-sm text-muted">
          Restricted area. <Link to="/auth" className="text-brass underline underline-offset-4">Sign in</Link> with an admin account.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
      <p className="meta">Administration</p>
      <h1 className="mt-2 font-display text-3xl text-cream">Dashboard</h1>
      {error ? (
        <p role="alert" className="mt-4 rounded-sm border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}
      {state === "loading" ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No cards yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {cards.map((c) => (
            <li key={c.cardId} className="flex flex-wrap items-center gap-3 rounded-sm border border-hairline bg-surface px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-cream">
                {c.name || c.cardNumber || c.cardId}
                <span className="ml-2 tabular-nums text-brass">{c.points ?? 0} pts</span>
              </span>
              <button
                type="button"
                disabled={busyId === c.cardId}
                onClick={() => mutate("/api/admin/loyalty/add-points", { cardId: c.cardId, points: 1 }, c.cardId)}
                className="rounded-sm border border-hairline px-2.5 py-1 text-xs text-cream transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
              >
                +1 pt
              </button>
              <button
                type="button"
                disabled={busyId === c.cardId || !(c.eligible)}
                title={c.eligible ? "Redeem reward" : "Not eligible yet"}
                onClick={() => mutate("/api/admin/loyalty/redeem", { cardId: c.cardId }, c.cardId)}
                className="rounded-sm border border-hairline px-2.5 py-1 text-xs text-cream transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
              >
                Redeem
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
