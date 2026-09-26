import { Link, useNavigate } from "react-router-dom";
import FragranceCard from "../components/FragranceCard.jsx";
import { useCatalogue } from "../lib/catalogue.jsx";
import { useStore } from "../state/StoreContext.jsx";

export default function Favourites() {
  const { items, loading } = useCatalogue();
  const { favourites, isAuthed, setAuthOpen } = useStore();
  const navigate = useNavigate();

  const saved = (items || []).filter((f) => favourites.includes(f.id));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="border-b border-hairline pb-6">
        <p className="meta">Parfumerie Charme</p>
        <h1 className="mt-2 font-display text-3xl leading-none text-cream sm:text-4xl">
          Favourites
        </h1>
        {!isAuthed ? (
          <p className="mt-3 text-xs text-faint">
            You&apos;re browsing as a guest — favourites are saved on this device
            only.{" "}
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brass"
            >
              Sign in
            </button>{" "}
            to keep them on your account.
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className="py-20 text-center text-xs text-faint">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="font-display text-xl text-cream">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-muted">
            Tap “Save to favourites” on any fragrance and it will appear here.
          </p>
          <Link
            to="/collection"
            className="mt-1 rounded-sm border border-hairline px-4 py-2 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
          >
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {saved.map((fragrance, i) => (
            <FragranceCard
              key={fragrance.id}
              fragrance={fragrance}
              index={i}
              onOpen={(f) => navigate(`/p/${f.slug}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
