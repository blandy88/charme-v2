import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCatalogue, indexBySlug } from "../lib/catalogue.jsx";
import { api } from "../lib/api.js";
import { formatPrice, monogram, tileStyle } from "../lib/palette.js";
import { useStore } from "../state/StoreContext.jsx";

export default function Product() {
  const { slug } = useParams();
  const { items, loading } = useCatalogue();
  const { addToCart, favourites, toggleFavourite, isAuthed, setAuthOpen } = useStore();
  const [reviews, setReviews] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const fragrance = useMemo(() => {
    if (!items) return undefined;
    return indexBySlug(items).get(slug);
  }, [items, slug]);

  useEffect(() => {
    if (!slug) return undefined;
    let alive = true;
    setReviews(null);
    api
      .reviews(slug)
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : data?.reviews || [];
        setReviews(list);
      })
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="aspect-[4/5] max-w-sm animate-pulse rounded-sm border border-hairline bg-surface" />
      </main>
    );
  }

  if (!fragrance) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-2xl text-cream">Fragrance not found</h1>
        <p className="mt-2 text-sm text-muted">
          We couldn&apos;t find “{slug}” in the collection.
        </p>
        <Link
          to="/collection"
          className="mt-6 inline-block rounded-sm border border-hairline px-4 py-2 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
        >
          Back to the collection
        </Link>
      </main>
    );
  }

  const { backgroundImage, accent } = tileStyle(fragrance);
  const isFavourite = favourites.includes(fragrance.id);
  const facts = [
    fragrance.concentration && ["Concentration", fragrance.concentration],
    fragrance.year && ["Released", String(fragrance.year)],
    fragrance.perfumer && ["Perfumer", fragrance.perfumer],
    fragrance.family && ["Family", fragrance.family],
  ].filter(Boolean);

  async function submitReview(event) {
    event.preventDefault();
    setReviewBusy(true);
    setReviewError("");
    try {
      await api.addReview({
        fragrance: fragrance.slug,
        rating: Number(rating),
        comment: reviewText,
      });
      setReviewText("");
      const refreshed = await api.reviews(fragrance.slug);
      setReviews(Array.isArray(refreshed) ? refreshed : refreshed?.reviews || []);
    } catch (err) {
      setReviewError(err.message || "Could not post your review");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <nav className="mb-6 text-xs text-faint">
        <Link to="/" className="transition-colors hover:text-brass">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link to="/collection" className="transition-colors hover:text-brass">
          Collection
        </Link>
        <span className="px-2">/</span>
        <span className="text-muted">{fragrance.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-sm border border-hairline"
          style={{ backgroundImage }}
        >
          <span
            className="font-display text-8xl leading-none opacity-[0.16]"
            style={{ color: accent }}
            aria-hidden="true"
          >
            {monogram(fragrance.brand)}
          </span>
          {fragrance.image ? (
            <img
              src={`/${String(fragrance.image).replace(/^\/+/, "")}`}
              alt={`${fragrance.name} bottle`}
              className="absolute inset-0 m-auto max-h-[85%] max-w-[70%] object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
            />
          ) : null}
        </div>

        <div>
          <p className="meta">{fragrance.brand}</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-cream sm:text-4xl">
            {fragrance.name}
          </h1>

          {fragrance.teaser ? (
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
              {fragrance.teaser}
            </p>
          ) : null}

          <dl className="mt-6 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 border-t border-hairline pt-4 text-xs">
            {facts.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="meta !text-faint">{term}</dt>
                <dd className="text-cream/90">{value}</dd>
              </div>
            ))}
          </dl>

          {fragrance.notes?.length ? (
            <div className="mt-6 border-t border-hairline pt-4">
              <p className="meta mb-2">Notes</p>
              <ul className="flex flex-wrap gap-1.5">
                {fragrance.notes.map((note) => (
                  <li
                    key={note}
                    className="rounded-sm border border-hairline bg-surface px-2 py-1 text-xs text-cream/85"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {fragrance.sizes?.length ? (
            <div className="mt-6 border-t border-hairline pt-4">
              <p className="meta mb-2">Sizes</p>
              <ul className="flex flex-col divide-y divide-[var(--color-hairline)]">
                {fragrance.sizes.map((entry) => (
                  <li
                    key={entry.size}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="text-sm text-muted">{entry.size}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-cream">
                        {formatPrice(entry.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(fragrance, entry)}
                        disabled={fragrance.available === false}
                        className="rounded-sm border border-hairline px-3 py-1.5 text-xs text-cream transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {fragrance.available === false ? "Unavailable" : "Add"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => toggleFavourite(fragrance.id)}
              aria-pressed={isFavourite}
              className={`h-10 rounded-sm border px-4 text-xs transition-colors ${
                isFavourite
                  ? "border-brass/60 bg-brass/10 text-brass"
                  : "border-hairline text-cream hover:border-brass hover:text-brass"
              }`}
            >
              {isFavourite ? "Saved to favourites" : "Save to favourites"}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 border-t border-hairline pt-8">
        <h2 className="font-display text-xl text-cream">Reviews</h2>

        {reviews === null ? (
          <p className="mt-4 text-xs text-faint">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No reviews yet for this fragrance.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col divide-y divide-[var(--color-hairline)]">
            {reviews.map((review) => (
              <li key={review.id ?? review.created_at} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm text-cream">
                    {review.user_name || review.username || "Anonymous"}
                  </p>
                  <span className="text-xs tabular-nums text-brass">
                    {review.rating ? `${review.rating}/5` : ""}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 max-w-xl">
          {isAuthed ? (
            <form onSubmit={submitReview} className="flex flex-col gap-3">
              <label className="meta" htmlFor="review-text">
                Write a review
              </label>
              <textarea
                id="review-text"
                rows="3"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What does it smell like to you?"
                className="rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream placeholder:text-faint focus-visible:border-brass focus-visible:outline-none"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted">
                  Rating
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="h-8 rounded-sm border border-hairline bg-surface px-2 text-xs text-cream"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={reviewBusy || !reviewText.trim()}
                  className="ml-auto rounded-sm bg-brass px-4 py-2 text-xs font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {reviewBusy ? "Posting…" : "Post review"}
                </button>
              </div>
              {reviewError ? (
                <p className="text-xs text-brass">{reviewError}</p>
              ) : null}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="rounded-sm border border-hairline px-4 py-2 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
            >
              Sign in to write a review
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
