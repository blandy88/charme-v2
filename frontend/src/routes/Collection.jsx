import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FilterBar from "../components/FilterBar.jsx";
import FragranceCard from "../components/FragranceCard.jsx";
import { useCatalogue } from "../lib/catalogue.jsx";

const PAGE = 48;

function buildIndex(list) {
  return list.map((f) => ({
    ...f,
    _haystack: [f.name, f.brand, f.family, f.concentration, ...(f.notes || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));
}

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: `${value} (${count})` }));
}

const SORTERS = {
  "price-asc": (a, b) => (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity),
  "price-desc": (a, b) => (b.fromPrice ?? -Infinity) - (a.fromPrice ?? -Infinity),
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "year-desc": (a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity),
};

function Skeletons() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-sm border border-hairline bg-surface" />
          <div className="mt-3 h-2.5 w-1/3 animate-pulse rounded-sm bg-surface-2" />
          <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded-sm bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export default function Collection() {
  const { items: raw, loading } = useCatalogue();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const items = useMemo(() => (raw ? buildIndex(raw) : null), [raw]);
  const brands = useMemo(() => (items ? countBy(items, "brand") : []), [items]);
  const families = useMemo(() => (items ? countBy(items, "family") : []), [items]);

  // Deep links: /collection?q=oud&family=Woody%20Aromatic&sort=price-asc
  const urlQuery = params.get("q") || "";
  const urlBrand = params.get("brand") || "";
  const urlFamily = params.get("family") || "";
  const urlSort = params.get("sort") || "featured";

  const [query, setQuery] = useState(urlQuery);
  const [brand, setBrand] = useState(urlBrand);
  const [family, setFamily] = useState(urlFamily);
  const [sort, setSort] = useState(urlSort);
  const [inStock, setInStock] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setQuery(urlQuery);
    setBrand(urlBrand);
    setFamily(urlFamily);
    setSort(urlSort);
  }, [urlQuery, urlBrand, urlFamily, urlSort]);

  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    if (!items) return [];
    const q = deferredQuery.trim().toLowerCase();
    const filtered = items.filter((f) => {
      if (brand && f.brand !== brand) return false;
      if (family && f.family !== family) return false;
      if (inStock && f.available === false) return false;
      if (q && !f._haystack.includes(q)) return false;
      return true;
    });
    const sorter = SORTERS[sort];
    return sorter ? [...filtered].sort(sorter) : filtered;
  }, [items, deferredQuery, brand, family, inStock, sort]);

  useEffect(() => {
    setVisible(PAGE);
  }, [deferredQuery, brand, family, inStock, sort]);

  const sentinelRef = useRef(null);
  const hasMore = visible < results.length;

  const loadMore = useCallback(() => {
    setVisible((count) => Math.min(count + PAGE, results.length));
  }, [results.length]);

  useEffect(() => {
    if (!hasMore) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visible]);

  const clear = () => {
    setQuery("");
    setBrand("");
    setFamily("");
    setSort("featured");
    setInStock(false);
  };

  const active = Boolean(query || brand || family || inStock || sort !== "featured");
  const shown = results.slice(0, visible);

  return (
    <>
      <header className="border-b border-hairline">
        <div className="mx-auto max-w-[1400px] px-4 pb-6 pt-10 sm:px-6">
          <p className="meta">Parfumerie Charme</p>
          <h1 className="mt-2 font-display text-3xl leading-none text-cream sm:text-4xl">
            The Collection
          </h1>
        </div>
      </header>

      {items ? (
        <FilterBar
          query={query}
          onQuery={setQuery}
          brand={brand}
          onBrand={setBrand}
          family={family}
          onFamily={setFamily}
          sort={sort}
          onSort={setSort}
          inStock={inStock}
          onInStock={setInStock}
          brands={brands}
          families={families}
          resultCount={results.length}
          totalCount={items.length}
          active={active}
          onClear={clear}
        />
      ) : (
        <div className="h-[7.25rem] border-b border-hairline" aria-hidden="true" />
      )}

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {loading || !items ? (
          <Skeletons />
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="font-display text-xl text-cream">No matches</p>
            <p className="max-w-sm text-sm text-muted">
              Nothing in the collection fits that combination. Try widening the
              house or family filter.
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-1 rounded-sm border border-hairline px-3 py-1.5 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((fragrance, i) => (
              <FragranceCard
                key={fragrance.id}
                fragrance={fragrance}
                index={i % PAGE}
                onOpen={(f) => navigate(`/p/${f.slug}`)}
              />
            ))}
          </div>
        )}

        {hasMore ? (
          <div ref={sentinelRef} className="flex justify-center py-10">
            <button
              type="button"
              onClick={loadMore}
              className="rounded-sm border border-hairline px-4 py-2 text-xs text-muted transition-colors hover:border-brass hover:text-brass"
            >
              Load more
            </button>
          </div>
        ) : shown.length > 0 ? (
          <p className="py-10 text-center text-xs text-faint">End of collection</p>
        ) : null}
      </main>
    </>
  );
}
