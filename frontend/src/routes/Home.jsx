import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import FragranceCard from "../components/FragranceCard.jsx";
import { useCatalogue } from "../lib/catalogue.jsx";
import { tileStyle } from "../lib/palette.js";

function SectionHeading({ eyebrow, title, to, linkLabel }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-hairline pb-3">
      <div>
        <p className="meta">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl leading-none text-cream">{title}</h2>
      </div>
      {to ? (
        <Link
          to={to}
          className="shrink-0 text-xs text-muted underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brass"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function Home() {
  const { items, loading } = useCatalogue();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!items) return null;
    const houses = new Set(items.map((f) => f.brand).filter(Boolean));
    const families = new Set(items.map((f) => f.family).filter(Boolean));
    return { count: items.length, houses: houses.size, families: families.size };
  }, [items]);

  const newest = useMemo(
    () =>
      items
        ? [...items]
            .filter((f) => f.year)
            .sort((a, b) => b.year - a.year)
            .slice(0, 10)
        : [],
    [items],
  );

  const topHouses = useMemo(() => {
    if (!items) return [];
    const counts = new Map();
    for (const f of items) {
      if (f.brand) counts.set(f.brand, (counts.get(f.brand) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [items]);

  const topFamilies = useMemo(() => {
    if (!items) return [];
    const counts = new Map();
    for (const f of items) {
      if (f.family) counts.set(f.family, (counts.get(f.family) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [items]);

  // Deterministic hero artwork — no hero image exists in the repo.
  const hero = tileStyle({ slug: "charme-hero", family: "Amber Woody" });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div
          className="absolute inset-0 opacity-70"
          style={{ backgroundImage: hero.backgroundImage }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-28">
          <p className="meta">Parfumerie Charme</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] text-cream sm:text-6xl">
            A collection of{" "}
            <span className="text-brass">{stats ? stats.count : "…"}</span>{" "}
            fragrances, chosen by hand.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
            {stats
              ? `${stats.houses} houses and ${stats.families} olfactory families — from niche orientals to the classics of Grasse.`
              : "Loading the collection…"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/collection"
              className="h-10 rounded-sm bg-brass px-5 text-sm font-medium leading-10 text-ink transition-opacity hover:opacity-90"
            >
              Explore the collection
            </Link>
            <Link
              to="/collection?sort=year-desc"
              className="h-10 rounded-sm border border-hairline-strong px-5 text-sm leading-10 text-cream transition-colors hover:border-brass hover:text-brass"
            >
              New arrivals
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Newest */}
        {newest.length ? (
          <section className="py-14">
            <SectionHeading
              eyebrow="Just in"
              title="Recent releases"
              to="/collection?sort=year-desc"
              linkLabel="See all"
            />
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">
              {newest.map((fragrance, i) => (
                <FragranceCard
                  key={fragrance.id}
                  fragrance={fragrance}
                  index={i}
                  onOpen={(f) => navigate(`/p/${f.slug}`)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Houses */}
        {topHouses.length ? (
          <section className="py-14">
            <SectionHeading eyebrow="The houses" title="Who we carry" />
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {topHouses.map(([house, count]) => (
                <li key={house}>
                  <Link
                    to={`/collection?brand=${encodeURIComponent(house)}`}
                    className="group flex items-baseline justify-between gap-3 border-b border-hairline py-2 transition-colors hover:border-brass"
                  >
                    <span className="truncate text-sm text-cream transition-colors group-hover:text-brass">
                      {house}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-faint">
                      {count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Families */}
        {topFamilies.length ? (
          <section className="py-14">
            <SectionHeading eyebrow="By scent" title="Olfactory families" />
            <ul className="mt-6 flex flex-wrap gap-2">
              {topFamilies.map(([family, count]) => (
                <li key={family}>
                  <Link
                    to={`/collection?family=${encodeURIComponent(family)}`}
                    className="inline-flex items-baseline gap-1.5 rounded-sm border border-hairline bg-surface px-3 py-1.5 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
                  >
                    {family}
                    <span className="tabular-nums text-faint">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {loading ? (
          <p className="py-20 text-center text-xs text-faint">Loading the collection…</p>
        ) : null}
      </div>
    </>
  );
}
