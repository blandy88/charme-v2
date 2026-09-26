import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../state/StoreContext.jsx";

export default function SiteNav() {
  const { cartCount, favourites, isAuthed, user, logout, setCartOpen, setAuthOpen } =
    useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function submit(event) {
    event.preventDefault();
    navigate(query.trim() ? `/collection?q=${encodeURIComponent(query.trim())}` : "/collection");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="font-display text-lg leading-none tracking-[0.2em] text-cream transition-colors hover:text-brass"
        >
          CHARME
        </Link>

        <nav className="hidden items-center gap-5 pl-2 text-xs sm:flex">
          <NavLink
            to="/collection"
            className={({ isActive }) =>
              `transition-colors ${isActive ? "text-brass" : "text-muted hover:text-cream"}`
            }
          >
            Collection
          </NavLink>
          <NavLink
            to="/collection?sort=year-desc"
            className="text-muted transition-colors hover:text-cream"
          >
            New
          </NavLink>
        </nav>

        <form onSubmit={submit} className="ml-auto hidden max-w-xs flex-1 sm:block">
          <label className="sr-only" htmlFor="nav-search">
            Search fragrances
          </label>
          <input
            id="nav-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a fragrance"
            className="h-9 w-full rounded-sm border border-hairline bg-surface px-3 text-xs text-cream placeholder:text-faint transition-colors focus-visible:border-brass focus-visible:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Link
            to="/favourites"
            aria-label={`Favourites (${favourites.length})`}
            className="relative flex h-9 w-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-cream"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M10 16.5S3.5 12.7 3.5 7.9A3.4 3.4 0 0 1 10 6.2a3.4 3.4 0 0 1 6.5 1.7c0 4.8-6.5 8.6-6.5 8.6Z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
            {favourites.length ? (
              <span className="absolute right-1 top-1 text-[0.5625rem] tabular-nums text-brass">
                {favourites.length}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Cart (${cartCount})`}
            className="relative flex h-9 w-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-cream"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M4 6h12l-1 9H5L4 6Zm3 0V4.5a3 3 0 0 1 6 0V6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            {cartCount ? (
              <span className="absolute right-1 top-1 text-[0.5625rem] tabular-nums text-brass">
                {cartCount}
              </span>
            ) : null}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => (isAuthed ? setMenuOpen((v) => !v) : setAuthOpen(true))}
              aria-label={isAuthed ? "Account menu" : "Sign in"}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-cream"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M4.5 16.5c.9-2.9 3-4.3 5.5-4.3s4.6 1.4 5.5 4.3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {menuOpen && isAuthed ? (
              <div className="animate-rise absolute right-0 top-11 w-52 rounded-sm border border-hairline bg-surface p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                <p className="truncate px-2 py-1.5 text-xs text-faint">{user?.email}</p>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-cream transition-colors hover:bg-surface-2"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
