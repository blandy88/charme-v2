import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext.jsx";

export default function Cart() {
  const { lines, loaded, remove } = useCart();

  if (!loaded) return <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6"><p className="text-sm text-muted">Loading…</p></main>;

  return (
    <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <p className="meta">Your selection</p>
      <h1 className="mt-2 font-display text-3xl text-cream">Cart</h1>
      {lines.length === 0 ? (
        <div className="mt-8 rounded-sm border border-hairline bg-surface p-8 text-center">
          <p className="font-display text-xl text-cream">Empty</p>
          <p className="mt-2 text-sm text-muted">Nothing here yet — the collection is waiting.</p>
          <Link to="/collection" className="mt-4 inline-block rounded-sm bg-brass px-5 py-2 text-sm font-semibold text-ink">
            Browse the collection
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.id || line.product} className="flex items-center gap-4 rounded-sm border border-hairline bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cream">{line.name || line.product}</p>
                <p className="mt-0.5 text-xs text-muted">{line.brand || ""}{line.price ? ` · ${line.price} dt` : ""}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(line.id || line.product)}
                className="rounded-sm border border-hairline px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
