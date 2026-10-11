import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { facets, formatPrice, initials, products as ALL } from "../lib/catalog.js";
import "./collection.css";

const SORTS = [
  ["featured", "collSortFeatured"],
  ["name", "collSortName"],
  ["price-asc", "collSortPriceAsc"],
  ["price-desc", "collSortPriceDesc"],
  ["year-desc", "collSortYear"],
];

const PRICE = (p) => (p.fromPrice == null ? Infinity : p.fromPrice);

export default function Collection() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState("grid");

  const urlQ = params.get("q") || "";
  const brand = params.get("brand") || "";
  const family = params.get("family") || "";
  const conc = params.get("conc") || "";
  const perfumer = params.get("perfumer") || "";
  const avail = params.get("avail") || "";
  const sort = params.get("sort") || "featured";

  /*
   * The search field is deliberately NOT bound straight to the URL.
   * A controlled input whose value round-trips through the router drops
   * characters when you type quickly: the URL update lands a tick late and
   * React re-renders the input with the previous value, clobbering the
   * keystroke. So the field owns its own state, the URL is written from a
   * deferred copy (shareable links, no per-keystroke re-render of 752 cards),
   * and the URL only writes BACK into the field when it changes from outside
   * -- i.e. back/forward, or "clear all".
   */
  const [draft, setDraft] = useState(urlQ);
  const deferredQ = useDeferredValue(draft);

  /* Values this component pushed into the URL itself. Anything else arriving
     in the URL (back/forward, a shared link, "clear all") is external and
     should flow back into the field. */
  const pushed = useRef(urlQ);
  const latestParams = useRef(params);
  latestParams.current = params;

  useEffect(() => {
    if (urlQ === pushed.current) return;
    pushed.current = urlQ;
    setDraft(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const current = latestParams.current.get("q") || "";
    pushed.current = deferredQ;
    if (current === deferredQ) return;
    const next = new URLSearchParams(latestParams.current);
    if (deferredQ) next.set("q", deferredQ);
    else next.delete("q");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  const f = useMemo(() => facets(ALL), []);

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
  }, [deferredQ, brand, family, conc, perfumer, avail, sort]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const active = [brand, family, conc, perfumer, avail, urlQ].filter(Boolean).length;
  const clear = () => setParams(new URLSearchParams(), { replace: true });

  const title = urlQ ? `« ${urlQ} »` : brand || family || t("collTitle");


  return (
    <main className="wrap collection">
      <header className="coll-head">
        <p className="eyebrow">{t("collection")}</p>
        <h1>{title}</h1>
        <p className="coll-sub">
          <strong>{shown.length}</strong> {t("collOf")} {ALL.length} {t("collReferences")}
          {active > 0 && !urlQ ? ` · ${active} ${active > 1 ? t("collFilters") : t("collFilter")} ${t("collActive")}` : null}
        </p>
      </header>

      <div className="coll-tools">
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
        <ul className="coll-grid">
          {shown.map((p) => (
            <li key={p.id}>
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
                    {p.fromPrice != null ? <span className="shelf-price">{formatPrice(p.fromPrice)} dt</span> : null}
                    {p.available ? null : <span className="shelf-out">{t("pdOutOfStock")}</span>}
                  </p>
                </div>
              </Link>
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
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/collection/${encodeURIComponent(p.id)}`}>{p.name}</Link>
                    {p.concentration ? <span className="tag">{p.concentration}</span> : null}
                  </td>
                  <td>{p.brand}</td>
                  <td>{p.family}</td>
                  <td>{p.perfumer || "—"}</td>
                  <td className="num">{p.year || "—"}</td>
                  <td className="num">{p.fromPrice != null ? `${formatPrice(p.fromPrice)} dt` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
