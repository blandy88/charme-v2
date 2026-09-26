import { useEffect, useRef } from "react";
import { formatPrice } from "../lib/palette.js";
import { useStore } from "../state/StoreContext.jsx";

export default function CartDrawer() {
  const { cartOpen, setCartOpen, cart, updateQty, removeLine, cartTotal, setAuthOpen, isAuthed } =
    useStore();
  const closeRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!cartOpen) return undefined;
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setCartOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={() => setCartOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="animate-rise relative flex h-full w-full flex-col border-l border-hairline bg-ink sm:max-w-[24rem]"
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <h2 id="cart-title" className="meta">
            Your selection
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close"
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-cream"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-display text-lg text-cream">Nothing selected yet</p>
            <p className="text-xs text-faint">
              Add a size from any fragrance to start a selection.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-[var(--color-hairline)] overflow-y-auto px-5">
              {cart.map((line) => (
                <li key={line.key} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="meta truncate">{line.brand}</p>
                    <p className="truncate text-sm text-cream">{line.name}</p>
                    <p className="mt-0.5 text-xs text-faint">{line.size}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, -1)}
                        aria-label={`Decrease ${line.name}`}
                        className="h-6 w-6 rounded-sm border border-hairline text-xs text-muted transition-colors hover:text-cream"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-xs tabular-nums text-cream">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, 1)}
                        aria-label={`Increase ${line.name}`}
                        className="h-6 w-6 rounded-sm border border-hairline text-xs text-muted transition-colors hover:text-cream"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="ml-2 text-[0.6875rem] text-faint underline underline-offset-4 transition-colors hover:text-brass"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-brass">
                    {formatPrice(line.price * line.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-hairline px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="meta">Total</span>
                <span className="font-display text-xl tabular-nums text-cream">
                  {formatPrice(cartTotal)}
                </span>
              </div>
              {/* Checkout genuinely does not exist server-side yet — the legacy
                  site said "coming soon" too. No fake button. */}
              <p className="mt-3 text-xs leading-relaxed text-faint">
                Checkout is not available online yet. Reserve your selection and
                our team will confirm it in store.
              </p>
              {!isAuthed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setAuthOpen(true);
                  }}
                  className="mt-3 w-full rounded-sm border border-hairline px-3 py-2 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
                >
                  Sign in to reserve
                </button>
              ) : null}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
