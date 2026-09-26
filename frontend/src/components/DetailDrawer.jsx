import { useEffect, useRef, useState } from "react";
import { formatPrice, monogram, tileStyle } from "../lib/palette.js";

/**
 * Right-hand detail panel (bottom sheet under 640px).
 * Deliberately informational: no placeholder CTAs that do nothing.
 */
export default function DetailDrawer({ fragrance, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const restoreRef = useRef(null);
  const { backgroundImage, accent } = tileStyle(fragrance);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [onClose]);

  const facts = [
    fragrance.concentration && ["Concentration", fragrance.concentration],
    fragrance.year && ["Released", String(fragrance.year)],
    fragrance.perfumer && ["Perfumer", fragrance.perfumer],
    fragrance.family && ["Family", fragrance.family],
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="animate-rise relative flex h-full w-full flex-col overflow-y-auto border-l border-hairline bg-ink sm:max-w-[26rem]"
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <p className="meta">Details</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-cream"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          className="relative flex aspect-[4/5] items-center justify-center border-b border-hairline sm:aspect-[3/2]"
          style={{ backgroundImage }}
        >
          <span
            className="font-display text-7xl leading-none opacity-[0.16]"
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
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div>
            <p className="meta">{fragrance.brand}</p>
            <h2
              id="drawer-title"
              className="mt-1 font-display text-2xl leading-tight text-cream"
            >
              {fragrance.name}
            </h2>
          </div>

          {fragrance.teaser ? (
            <p className="text-sm leading-relaxed text-muted">{fragrance.teaser}</p>
          ) : null}

          {facts.length ? (
            <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 border-t border-hairline pt-4 text-xs">
              {facts.map(([term, value]) => (
                <div key={term} className="contents">
                  <dt className="meta !text-faint">{term}</dt>
                  <dd className="text-cream/90">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {fragrance.notes?.length ? (
            <div className="border-t border-hairline pt-4">
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
            <div className="border-t border-hairline pt-4">
              <p className="meta mb-2">Sizes</p>
              <ul className="flex flex-col divide-y divide-[var(--color-hairline)]">
                {fragrance.sizes.map((entry) => (
                  <li
                    key={entry.size}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="text-muted">{entry.size}</span>
                    <span className="tabular-nums text-cream">
                      {formatPrice(entry.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {fragrance.available === false ? (
            <p className="rounded-sm border border-hairline bg-surface px-3 py-2 text-xs text-muted">
              Currently unavailable
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
