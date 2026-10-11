import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles, X } from "lucide-react";
import { useI18n } from "../contexts/I18nContext.jsx";
import { initials } from "./lib/text.js";
import { searchCatalogue, topBrands } from "./lib/search.js";

/*
 * The nav search — one surface for the three legacy entry points that all did
 * the same job (quickSearchBar's dropdown, searchModal, and aiFragranceFinder /
 * ingredientModal), kept as two modes:
 *
 *   Search   — every word must match (the quick bar / search modal behaviour).
 *   Describe — rank whatever matches the wish (the AI / ingredient finder).
 *
 * The catalogue is ~550KB and lives in the Collection chunk, so it is imported
 * on first open, never on the critical path. Until it lands the panel shows the
 * suggestion chips only.
 */

let CATALOGUE = null;
let INFLIGHT = null;
function loadCatalogue() {
  if (CATALOGUE) return Promise.resolve(CATALOGUE);
  if (!INFLIGHT) {
    INFLIGHT = import("./lib/catalog.js").then((m) => {
      CATALOGUE = m.products;
      return CATALOGUE;
    });
  }
  return INFLIGHT;
}

export default function GlobalSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("search");
  const [query, setQuery] = useState("");
  const [catalogue, setCatalogue] = useState(CATALOGUE);
  const deferred = useDeferredValue(query);

  const ensure = useCallback(() => {
    if (!CATALOGUE) {
      loadCatalogue().then((c) => setCatalogue(c)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const brands = useMemo(() => (catalogue ? topBrands(catalogue, 6) : []), [catalogue]);

  const results = useMemo(
    () => (catalogue ? searchCatalogue(catalogue, deferred, mode, 8) : []),
    [catalogue, deferred, mode],
  );

  const trimmed = query.trim();

  function openWith(nextMode) {
    ensure();
    setMode(nextMode);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function go(e) {
    e.preventDefault();
    if (!trimmed) return;
    setOpen(false);
    navigate(`/collection?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="global-search" ref={boxRef}>
      <form className="gs-field" role="search" onSubmit={go}>
        <Search size={15} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => openWith(mode)}
          placeholder={mode === "describe" ? t("aiPlaceholder") : t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          autoComplete="off"
        />
        {query ? (
          <button type="button" className="gs-clear" aria-label={t("clear")} onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </form>

      <button
        type="button"
        className="tool-btn pressable gs-ai"
        aria-label={t("aiFinder")}
        title={t("aiFinder")}
        onClick={() => openWith("describe")}
      >
        <Sparkles size={15} aria-hidden="true" />
      </button>

      {open ? (
        <div className="gs-panel panel">
          <div className="gs-tabs" role="tablist">
            {[
              ["search", t("gsSearch")],
              ["describe", t("gsDescribe")],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`pressable${mode === m ? " on" : ""}`}
                onClick={() => { setMode(m); inputRef.current?.focus(); }}
              >
                {label}
              </button>
            ))}
          </div>

          {!trimmed ? (
            <div className="gs-suggest">
              <p className="eyebrow">{t("gsSuggestions")}</p>
              <div className="gs-chips">
                {(brands.length ? brands : (catalogue || []).slice(0, 6).map((p) => p.name)).map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="gs-chip pressable"
                    onClick={() => {
                      setMode("search");
                      setQuery(label);
                      inputRef.current?.focus();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length ? (
            <>
              <ul className="gs-results">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link to={`/collection/${p.id}`} className="gs-row" onClick={() => setOpen(false)}>
                      <span className="gs-thumb" aria-hidden="true">
                        {p.image ? (
                          <img src={p.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="gs-mark">{initials(p.name)}</span>
                        )}
                      </span>
                      <span className="gs-meta">
                        <strong>{p.name}</strong>
                        <span>
                          {p.brand}
                          {p.concentration ? ` · ${p.concentration}` : ""}
                        </span>
                      </span>
                      {p.fromPrice ? <span className="gs-price">{p.fromPrice} dt</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" className="gs-all pressable" onClick={go}>
                {t("gsSeeAll")} “{trimmed}”
              </button>
            </>
          ) : (
            <div className="gs-empty">{t("noMatches")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
