import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FavoriteButton } from "../../contexts/FavoritesContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { facets, initials, money } from "../lib/catalog.js";
import { useCatalogue } from "../lib/catalogStore.js";
import { getLenis } from "../SmoothScroll.jsx";
import "./collection.css";

/* References per page. The legacy grid rendered every fragrance at once; a
   numbered pager pinned to the foot of the page is the requested behaviour. */
const PAGE_SIZE = 24;

const SORTS = [
  ["featured", "collSortFeatured"],
  ["name", "collSortName"],
  ["price-asc", "collSortPriceAsc"],
  ["price-desc", "collSortPriceDesc"],
  ["year-desc", "collSortYear"],
];

const PRICE = (p) => (p.fromPrice == null ? Infinity : p.fromPrice);

const FILTER_KEYS = ["q", "brand", "family", "conc", "perfumer", "avail", "sort"];
const EMPTY_FILTERS = { q: "", brand: "", family: "", conc: "", perfumer: "", avail: "", sort: "featured" };

function readParams(params) {
  const out = { ...EMPTY_FILTERS };
  for (const k of FILTER_KEYS) out[k] = params.get(k) || out[k];
  return out;
}

const sameFilters = (a, b) => FILTER_KEYS.every((k) => (a[k] || "") === (b[k] || ""));

/* Windowed list of page numbers: first, last, current ± 1, with "…" fillers. */
function pageList(current, pages) {
  const seen = new Set([1, pages]);
  for (let p = current - 1; p <= current + 1; p++) if (p > 1 && p < pages) seen.add(p);
  const ordered = [...seen].sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of ordered) {
    if (prev && p - prev > 1) out.push("\u2026");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Collection() {
  const { t } = useI18n();
  /* Live merged catalogue: an admin adding a perfume or flipping its stock
     re-renders this grid without a reload or a rebuild. */
  const ALL = useCatalogue();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState("grid");

  /*
   * Filter state is the single source of truth; the URL is a pure reflection of
   * it. Writing the URL from React Router's `prev` snapshot is not safe here:
   * `setSearchParams(fn)` is handed the search params of the *rendered*
   * location, not the live URL. Clearing the field and immediately choosing a
   * family therefore produced `?q=pineapple+cardamom&family=Oriental+Woody`
   * (the cleared query resurrected), and the next write then wiped the family.
   * With one owner and one writer, overlapping updates cannot clobber.
   *
   * The field keeps its own draft so typing never round-trips through the
   * router (that used to drop characters); the deferred draft is what actually
   * lands in state, so 752 cards do not re-render per keystroke.
   */
  const [filters, setFilters] = useState(() => readParams(params));
  const [draft, setDraft] = useState(() => readParams(params).q);
  const deferredQ = useDeferredValue(draft);

  /* The last filter set we wrote or accepted. A URL that differs from it was
     changed externally (back/forward, a shared link) and flows back in. */
  const lastWritten = useRef(readParams(params));

  useEffect(() => {
    const incoming = readParams(params);
    if (sameFilters(incoming, lastWritten.current)) return;
    lastWritten.current = incoming;
    setFilters(incoming);
    setDraft(incoming.q);
  }, [params]);

  useEffect(() => {
    setFilters((f) => (f.q === deferredQ ? f : { ...f, q: deferredQ }));
  }, [deferredQ]);

  useEffect(() => {
    if (sameFilters(filters, lastWritten.current)) return;
    lastWritten.current = filters;
    const next = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = filters[k];
      if (v && !(k === "sort" && v === "featured")) next.set(k, v);
    }
    setParams(next, { replace: true });
  }, [filters, setParams]);

  const { brand, family, conc, perfumer, avail, sort } = filters;
  const urlQ = filters.q;

  const f = useMemo(() => facets(ALL), [ALL]);

  const shown = useMemo(() => {
    const words = deferredQ.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const out = ALL.filter((p) => {
      if (brand && p.brand !== brand) return false;
      if (family && p.family !== family) return false;
      if (conc && p.concentration !== conc) return false;
      if (perfumer && p.perfumer !== perfumer) return false;
      if (avail === "in" && !p.available) return false;
      if (avail === "out" && p.available) return false;
      if (!words.length) return true;
      const hay = [p.name, p.brand, p.family, p.perfumer, p.description]
        .concat(p.ingredients || [])
        .join(" ")
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });

    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "price-asc") out.sort((a, b) => PRICE(a) - PRICE(b));
    else if (sort === "price-desc") out.sort((a, b) => PRICE(b) - PRICE(a));
    else if (sort === "year-desc") out.sort((a, b) => (b.year || 0) - (a.year || 0));
    return out;
  }, [ALL, deferredQ, brand, family, conc, perfumer, avail, sort]);

  /* Pagination is read straight from the URL so a shared link lands on the
     same page. Filter changes rewrite the query without `page`, which is how a
     new filter set snaps back to page one. */
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const rawPage = Math.trunc(Number(params.get("page")) || 1);
  const current = Math.min(Math.max(1, rawPage), pages);
  const start = (current - 1) * PAGE_SIZE;
  const paged = shown.slice(start, start + PAGE_SIZE);

  const goPage = (n) => {
    const target = Math.min(Math.max(1, n), pages);
    if (target === current) return;
    const next = new URLSearchParams(params);
    if (target === 1) next.delete("page");
    else next.set("page", String(target));
    setParams(next);
    /* Land on the first row of the new page rather than mid-scroll. */
    const lenis = getLenis();
    const anchor = document.querySelector(".coll-head");
    const top = anchor ? anchor.getBoundingClientRect().top + window.scrollY - 88 : 0;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  };

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value || "" }));

  const active = [brand, family, conc, perfumer, avail, urlQ].filter(Boolean).length;
  const clear = () => {
    setFilters({ ...EMPTY_FILTERS });
    setDraft("");
  };

  const title = urlQ ? `« ${urlQ} »` : brand || family || t("collTitle");


  return (
    <main className="wrap collection">
      <header className="coll-head">
        <p className="eyebrow">{t("collection")}</p>
        <h1>{title}</h1>
        <p className="coll-sub">
          <strong>{shown.length}</strong> {t("collOf")} {ALL.length} {t("collReferences")}
        </p>
      </header>

      <div className="coll-tools" data-guide="filters">
        <label className="coll-search">
          <span className="sr-only">{t("collSearch")}</span>
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("collSearch")}
            autoComplete="off"
          />
        </label>

        <div className="coll-selects">
          <select value={brand} onChange={(e) => set("brand", e.target.value)} aria-label={t("colBrand")}>
            <option value="">{t("collAllBrands")}</option>
            {(f.brands || []).map(([v, n]) => (
              <option key={v} value={v}>{v} ({n})</option>
            ))}
          </select>
          <select value={family} onChange={(e) => set("family", e.target.value)} aria-label={t("colFamily")}>
            <option value="">{t("collAllFamilies")}</option>
            {(f.families || []).map(([v, n]) => (
              <option key={v} value={v}>{v} ({n})</option>
            ))}
          </select>
          <select value={conc} onChange={(e) => set("conc", e.target.value)} aria-label={t("factConcentration")}>
            <option value="">{t("collAllConcentrations")}</option>
            {(f.concentrations || []).map(([v, n]) => (
              <option key={v} value={v}>{v} ({n})</option>
            ))}
          </select>
          <select value={perfumer} onChange={(e) => set("perfumer", e.target.value)} aria-label={t("colPerfumer")}>
            <option value="">{t("collAllPerfumers")}</option>
            {(f.perfumers || []).map(([v, n]) => (
              <option key={v} value={v}>{v} ({n})</option>
            ))}
          </select>
          <select value={avail} onChange={(e) => set("avail", e.target.value)} aria-label={t("pdAvailable")}>
            <option value="">—</option>
            <option value="in">{t("pdAvailable")}</option>
            <option value="out">{t("pdOutOfStock")}</option>
          </select>
          <select value={sort} onChange={(e) => set("sort", e.target.value)} aria-label={t("collSort")}>
            {SORTS.map(([v, key]) => (
              <option key={v} value={v}>{t(key)}</option>
            ))}
          </select>
        </div>

        <div className="coll-view" role="group" aria-label={t("collGrid")}>
          <button
            type="button"
            className={view === "grid" ? "on" : ""}
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
          >
            {t("collGrid")}
          </button>
          <button
            type="button"
            className={view === "list" ? "on" : ""}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            {t("collList")}
          </button>
        </div>
      </div>

      {active > 0 ? (
        <div className="coll-active">
          <span>
            {active} {active > 1 ? t("collFilters") : t("collFilter")} {t("collActive")}
          </span>
          <button type="button" onClick={clear}>{t("collClear")}</button>
        </div>
      ) : null}

      {ALL.length === 0 ? (
        <div className="coll-empty">{t("collUnavailable")}</div>
      ) : shown.length === 0 ? (
        <div className="coll-empty">
          <p>{t("collEmpty")}</p>
          <button type="button" onClick={clear}>{t("collClear")}</button>
        </div>
      ) : view === "grid" ? (
        <ul className="coll-grid reveal-group">
          {paged.map((p, i) => (
            <li key={p.id} className="shelf-wrap" data-guide={i === 0 ? "card" : undefined}>
              <Link to={`/collection/${encodeURIComponent(p.id)}`} className="shelf pressable">
                <div className="shelf-media">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={`${p.brand} ${p.name}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="bottle" aria-hidden="true">
                      <span className="bottle-neck" />
                      <span className="bottle-body">
                        <span className="bottle-mark">{initials(p.name)}</span>
                        <span className="bottle-line" />
                        <span className="bottle-line short" />
                      </span>
                    </span>
                  )}
                </div>
                <div className="shelf-body">
                  <p className="shelf-brand">{p.brand}</p>
                  <h3>{p.name}</h3>
                  <p className="shelf-meta">
                    {p.family}
                    {p.concentration ? ` · ${p.concentration}` : ""}
                  </p>
                  <p className="shelf-foot">
                    {p.fromPrice != null ? <span className="shelf-price">{money(p.fromPrice)}</span> : null}
                    {p.available ? null : <span className="shelf-out">{t("pdOutOfStock")}</span>}
                  </p>
                </div>
              </Link>
              <FavoriteButton product={p} className="shelf-fav" label={t("save")} savedLabel={t("saved")} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="coll-table-wrap"
          role="region"
          aria-label={t("collList")}
          tabIndex={0}
        >
          <table className="coll-table">
            <thead>
              <tr>
                <th>{t("colReference")}</th>
                <th>{t("colBrand")}</th>
                <th>{t("colFamily")}</th>
                <th>{t("colPerfumer")}</th>
                <th className="num">{t("colYear")}</th>
                <th className="num">{t("colPrice")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/collection/${encodeURIComponent(p.id)}`}>{p.name}</Link>
                    {p.concentration ? <span className="tag">{p.concentration}</span> : null}
                  </td>
                  <td>{p.brand}</td>
                  <td>{p.family}</td>
                  <td>{p.perfumer || "—"}</td>
                  <td className="num">{p.year || "—"}</td>
                  <td className="num">{money(p.fromPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shown.length > 0 && pages > 1 ? (
        <nav className="coll-pager" data-guide="pager" aria-label={t("collPagination")}>
          <button
            type="button"
            className="pager-step pressable"
            onClick={() => goPage(current - 1)}
            disabled={current === 1}
            aria-label={t("collPrev")}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>

          <ul className="pager-pages">
            {pageList(current, pages).map((p, i) =>
              p === "\u2026" ? (
                <li key={`gap-${i}`} className="pager-gap" aria-hidden="true">…</li>
              ) : (
                <li key={p}>
                  <button
                    type="button"
                    className={`pager-num pressable${p === current ? " on" : ""}`}
                    aria-current={p === current ? "page" : undefined}
                    onClick={() => goPage(p)}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}
          </ul>

          <button
            type="button"
            className="pager-step pressable"
            onClick={() => goPage(current + 1)}
            disabled={current === pages}
            aria-label={t("collNext")}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>

          <p className="pager-meta">
            {t("collShowing")}{" "}
            <strong>
              {start + 1}–{Math.min(start + PAGE_SIZE, shown.length)}
            </strong>{" "}
            {t("collOf")} <strong>{shown.length}</strong>
          </p>
        </nav>
      ) : null}
    </main>
  );
}
