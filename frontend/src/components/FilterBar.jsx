const selectClass =
  "h-9 w-full min-w-0 cursor-pointer appearance-none rounded-sm border border-hairline bg-surface pl-2.5 pr-7 text-xs text-cream transition-colors hover:border-[var(--color-hairline-strong)] focus-visible:border-brass";

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label className="relative block min-w-0 flex-1 sm:flex-none">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-faint"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2.5 4.5 6 8l3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </label>
  );
}

export default function FilterBar({
  query,
  onQuery,
  brand,
  onBrand,
  family,
  onFamily,
  sort,
  onSort,
  inStock,
  onInStock,
  brands,
  families,
  resultCount,
  totalCount,
  active,
  onClear,
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-hairline bg-ink/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="sr-only">Search fragrances</span>
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search by name, house or note"
              aria-label="Search fragrances"
              className="h-9 w-full rounded-sm border border-hairline bg-surface pl-8 pr-3 text-xs text-cream placeholder:text-faint transition-colors hover:border-[var(--color-hairline-strong)] focus-visible:border-brass focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              label="House"
              value={brand}
              onChange={onBrand}
              options={brands}
              placeholder="All houses"
            />
            <Select
              label="Olfactory family"
              value={family}
              onChange={onFamily}
              options={families}
              placeholder="All families"
            />
            <Select
              label="Sort by"
              value={sort}
              onChange={onSort}
              placeholder="Sort"
              options={[
                { value: "featured", label: "Featured" },
                { value: "price-asc", label: "Price: low to high" },
                { value: "price-desc", label: "Price: high to low" },
                { value: "name-asc", label: "Name: A–Z" },
                { value: "year-desc", label: "Newest" },
              ]}
            />

            <button
              type="button"
              onClick={() => onInStock((value) => !value)}
              aria-pressed={inStock}
              className={`h-9 shrink-0 rounded-sm border px-2.5 text-xs transition-colors ${
                inStock
                  ? "border-brass/60 bg-brass/10 text-brass"
                  : "border-hairline bg-surface text-muted hover:border-[var(--color-hairline-strong)]"
              }`}
            >
              In stock
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-faint">
          <p aria-live="polite">
            <span className="tabular-nums text-cream">{resultCount}</span> of{" "}
            <span className="tabular-nums">{totalCount}</span> fragrances
          </p>
          {active ? (
            <button
              type="button"
              onClick={onClear}
              className="text-muted underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brass"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
