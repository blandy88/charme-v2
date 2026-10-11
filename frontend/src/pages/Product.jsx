import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useCart } from "../contexts/CartContext.jsx";

export default function Product() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = await import("virtual:catalogue");
        if (!alive) return;
        const found = (mod.default || []).find((f) => f.slug === slug);
        if (!found) setMissing(true);
        else setItem(found);
      } catch {
        if (alive) setMissing(true);
      }
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (alive) setReviews(data.reviews || []);
      } catch {
        /* reviews are optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  async function submitReview(e) {
    e.preventDefault();
    setNotice("");
    try {
      await api("/api/reviews", { method: "POST", body: { fragrance: slug, rating, review_text: text } });
      setText("");
      const res = await fetch(`/api/reviews/${encodeURIComponent(slug)}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setNotice("Review posted — thank you.");
    } catch (err) {
      setNotice(err.message || "Could not post the review.");
    }
  }

  async function toggleFavorite() {
    if (!user || !item) return;
    setNotice("");
    try {
      await api("/api/user/favorites/toggle", { method: "POST", body: { productId: item.slug, productName: item.name } });
      setNotice("Favorites updated.");
    } catch (err) {
      setNotice(err.message || "Could not update favorites.");
    }
  }

  if (missing) {
    return (
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <p className="mt-3 text-sm text-muted">Unknown fragrance. <Link to="/collection" className="text-brass underline underline-offset-4">Back to collection</Link></p>
      </main>
    );
  }
  if (!item) return <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6"><p className="text-sm text-muted">Loading…</p></main>;

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
      <p className="meta">{item.brand}</p>
      <h1 className="mt-2 font-display text-4xl text-cream">{item.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {[item.family, item.concentration, item.year].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-sm border border-hairline bg-surface">
          {item.image ? (
            <img src={`/${String(item.image).replace(/^\/+/, "")}`} alt={`${item.name} bottle`}
              className="aspect-[4/5] w-full object-contain" loading="lazy" decoding="async" />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center font-display text-6xl text-faint">{item.name[0]}</div>
          )}
        </div>
        <div>
          {item.fromPrice != null ? (
            <p className="font-display text-3xl tabular-nums text-brass">{item.fromPrice} dt</p>
          ) : null}
          {item.teaser ? <p className="mt-3 text-sm leading-relaxed text-muted">{item.teaser}</p> : null}
          {(item.notes || []).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.notes.map((n) => (
                <span key={n} className="rounded-sm border border-hairline px-2 py-1 text-xs text-muted">{n}</span>
              ))}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { add({ id: item.slug, product: item.slug, name: item.name, brand: item.brand, price: item.fromPrice }); setNotice("Added to cart."); }}
              className="rounded-sm bg-brass px-5 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Add to cart
            </button>
            {user ? (
              <button
                type="button"
                onClick={toggleFavorite}
                className="rounded-sm border border-hairline px-5 py-2 text-sm text-cream transition-colors hover:border-brass hover:text-brass"
              >
                ♥ Favorite
              </button>
            ) : null}
          </div>
          {notice ? <p role="status" className="mt-3 text-sm text-brass">{notice}</p> : null}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-cream">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No reviews yet — be the first.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-sm border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">{r.user_name || "Anonymous"} · {"★".repeat(Math.min(5, r.rating || 0))}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-cream">{r.review_text}</p>
              </li>
            ))}
          </ul>
        )}
        {user ? (
          <form onSubmit={submitReview} className="mt-6 rounded-sm border border-hairline bg-surface p-4">
            <label className="block text-xs text-muted">
              Your rating
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}
                className="ml-2 rounded-sm border border-hairline bg-ink px-2 py-1 text-sm text-cream">
                {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v} ★</option>)}
              </select>
            </label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3}
              placeholder="Share your experience…"
              className="mt-3 w-full rounded-sm border border-hairline bg-ink px-3 py-2 text-sm text-cream placeholder:text-faint" />
            <button type="submit" className="mt-3 rounded-sm bg-brass px-5 py-2 text-sm font-semibold text-ink">Post review</button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted"><Link to="/auth" className="text-brass underline underline-offset-4">Sign in</Link> to write a review.</p>
        )}
      </section>
    </main>
  );
}
