import { memo, useState } from "react";
import { formatPrice, monogram, tileStyle } from "../lib/palette.js";

/**
 * One fragrance tile.
 *
 * Photos are served from the site root (`/layton.png`), which is why the src is
 * root-absolute rather than BASE_URL-relative: catalogue imagery is shared with
 * the legacy pages on every host.
 */
function FragranceCard({ fragrance, index, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const { backgroundImage, accent } = tileStyle(fragrance);
  const price = formatPrice(fragrance.fromPrice);
  const soldOut = fragrance.available === false;
  const showPhoto = Boolean(fragrance.image) && !failed;

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(fragrance);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${fragrance.name} by ${fragrance.brand}`}
      onClick={() => onOpen(fragrance)}
      onKeyDown={handleKeyDown}
      className="animate-rise group relative flex cursor-pointer flex-col rounded-sm transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-0.5"
      style={{ "--d": `${Math.min(index, 24) * 18}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-hairline bg-surface transition-colors duration-300 group-hover:border-[var(--color-hairline-strong)]">
        {/* Generated artwork — always painted, so there is never a blank box. */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
          style={{ backgroundImage }}
          aria-hidden="true"
        />

        {showPhoto ? (
          <img
            src={`/${String(fragrance.image).replace(/^\/+/, "")}`}
            alt={`${fragrance.name} bottle`}
            width="320"
            height="400"
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              className="font-display text-5xl leading-none tracking-tight opacity-[0.13] transition-opacity duration-500 group-hover:opacity-20"
              style={{ color: accent }}
            >
              {monogram(fragrance.brand)}
            </span>
          </div>
        )}

        {/* Hairline vignette keeps the tile from looking like a flat swatch. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-white/5"
          aria-hidden="true"
        />

        {fragrance.concentration ? (
          <span className="absolute left-2 top-2 rounded-sm bg-black/45 px-1.5 py-0.5 text-[0.625rem] font-medium tracking-[0.12em] text-cream/80 backdrop-blur-sm">
            {fragrance.concentration}
          </span>
        ) : null}

        {soldOut ? (
          <span className="absolute right-2 top-2 rounded-sm bg-black/55 px-1.5 py-0.5 text-[0.625rem] tracking-[0.12em] text-muted backdrop-blur-sm">
            Sold out
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-3">
        <p className="meta truncate">{fragrance.brand}</p>
        <h3 className="font-display text-[1.0625rem] leading-snug text-cream line-clamp-2">
          {fragrance.name}
        </h3>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-1.5">
          <span className="truncate text-xs text-faint">
            {fragrance.family || "Unclassified"}
          </span>
          {price ? (
            <span className="shrink-0 text-xs font-medium tabular-nums text-brass">
              {price}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default memo(FragranceCard);
