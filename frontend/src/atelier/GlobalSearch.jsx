import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles, X } from "lucide-react";
import { useI18n } from "../contexts/I18nContext.jsx";
import { initials } from "./lib/text.js";
import { loadCatalogue } from "./lib/lazyCatalog.js";
import { useCatalogue } from "./lib/catalogStore.js";
import { searchCatalogue, topBrands } from "./lib/search.js";

/*
 * The nav search — one surface for the two legacy entry points that both did
 * the same job (quickSearchBar's dropdown and searchModal), kept as two modes:
 *
 *   Search   — every word must match (the quick bar / search modal behaviour).
 *   Describe — rank whatever matches the wish.
 *
 * The deeper finders (Scent Profiler, Ingredient Finder) live in the
 * discovery overlay (Discover.jsx), reached from the nav's compass button.
 *
 * The catalogue is ~550KB and lives in the Collection chunk, so it is imported
 * on first open, never on the critical path. Until it lands the panel shows the
 * suggestion chips only.
 */

export default function GlobalSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("search");
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  /* The 550 KB chunk stays lazy (loaded on first open), but the value comes
     from the live store so an admin's new perfume is searchable immediately. */
  const snapshot = useCatalogue();
  const catalogue = ready ? snapshot : null;
  const deferred = useDeferredValue(query);

  const ensure = useCallback(() => {
    if (ready) return;
    loadCatalogue().then(() => setReady(true), () => setReady(true));
  }, [ready]);

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
    <div className={`global-search${open ? " open" : ""}`} ref={boxRef}>
      {/* Narrow screens: the field is replaced by this icon, which opens the
          sheet below. The AI entry point is still the panel's "Describe" tab,
          so its own button is redundant there and hides too. */}
      <button
        type="button"
        className="tool-btn pressable gs-compact"
        aria-label={t("searchPlaceholder")}
        title={t("searchPlaceholder")}
        onClick={() => openWith(mode)}
      >
        <Search size={15} aria-hidden="true" />
      </button>

      <form className="gs-field" data-guide="search" role="search" onSubmit={go}>
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
        className="gs-close"
        aria-label={t("close")}
        onClick={() => { setOpen(false); inputRef.current?.blur(); }}
      >
        <X size={16} aria-hidden="true" />
      </button>

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
