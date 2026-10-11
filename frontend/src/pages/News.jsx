import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function News() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api("/api/news", { auth: false });
        if (!alive) return;
        setItems(res.news || []);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <p className="meta">Updates</p>
      <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">News</h1>
      {state === "loading" ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : state === "error" ? (
        <p className="mt-6 text-sm text-muted">Could not load news right now.</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing new yet — check back soon.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {items.map((n) => (
            <article key={n.id} className="rounded-sm border border-hairline bg-surface p-5">
              {n.badge ? <p className="meta">{n.badge}</p> : null}
              <h2 className="mt-1 font-display text-xl text-cream">{n.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{n.content}</p>
              {n.cta_label && n.cta_url ? (
                <a href={n.cta_url} className="mt-3 inline-block text-sm text-brass underline underline-offset-4">
                  {n.cta_label}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
