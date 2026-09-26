import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

export default function SiteFooter() {
  const [hours, setHours] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .storeHours()
      .then((data) => {
        if (alive && data) setHours(data);
      })
      .catch(() => {
        /* store hours are optional decoration */
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = hours && Array.isArray(hours) ? hours : null;

  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-base tracking-[0.2em] text-cream">CHARME</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-faint">
            Parfumerie Charme — a curated collection of niche and house
            fragrances, selected by hand.
          </p>
        </div>

        <div>
          <p className="meta">Explore</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-xs">
            <li>
              <Link to="/collection" className="text-muted transition-colors hover:text-brass">
                The collection
              </Link>
            </li>
            <li>
              <Link
                to="/collection?sort=year-desc"
                className="text-muted transition-colors hover:text-brass"
              >
                New arrivals
              </Link>
            </li>
            <li>
              <Link to="/favourites" className="text-muted transition-colors hover:text-brass">
                Favourites
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="meta">Store hours</p>
          {rows ? (
            <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
              {rows.slice(0, 7).map((row) => (
                <li key={row.day || row.id} className="flex justify-between gap-4">
                  <span>{row.day}</span>
                  <span className="tabular-nums text-faint">
                    {row.closed ? "Closed" : `${row.open || ""}–${row.close || ""}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-faint">Opening hours on request.</p>
          )}
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 text-[0.6875rem] text-faint sm:px-6">
          <p>© {new Date().getFullYear()} Parfumerie Charme</p>
          <a
            href="/legacy.html"
            className="underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brass"
          >
            Classic site
          </a>
        </div>
      </div>
    </footer>
  );
}
