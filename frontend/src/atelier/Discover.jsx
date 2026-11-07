import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Loader2, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { useI18n } from "../contexts/I18nContext.jsx";
import { initials } from "./lib/text.js";
import { loadCatalogue } from "./lib/lazyCatalog.js";
import { useCatalogue } from "./lib/catalogStore.js";
import { discoverDict } from "./lib/discoverI18n.js";
import "./discover.css";

/*
 * The discovery overlay — the two finders the legacy kept as separate modals
 * (ai-fragrance-finder.js and ingredient-finder.js), under one roof and one nav
 * entry:
 *
 *   Scent Profiler    a guided questionnaire that ranks the whole boutique.
 *   Ingredient Finder notes picked from the real catalogue, not a hand-written
 *                     list, so every chip links to bottles we actually stock.
 *
 * Both read the catalogue through the shared lazy loader, so this file costs
 * nothing on the critical path and the 550KB catalogue is still fetched once.
 * Nothing here touches the network: the legacy "AI" was a local weighted score
 * and so is this one.
 */

const norm = (s) => String(s || "").toLowerCase().trim();

/* A note matches when either string contains the other — "cedar" finds
   "Cedarwood", "Woody Notes" is found by "woody". */
const noteHit = (ingredient, key) => {
  const x = norm(ingredient);
  return x === key || x.includes(key) || key.includes(x);
};

/* Families from the catalogue are compound ("Oriental Spicy", "Woody
   Aromatic"), so a preference matches on substring and gets a second chance
   against neighbouring families. */
const FAMILY_FRIENDS = {
  fresh: ["citrus", "aquatic", "aromatic", "green", "fruity"],
  floral: ["fruity", "powder", "rose"],
  woody: ["aromatic", "spicy", "leather", "vetiver", "cedar"],
  oriental: ["amber", "spicy", "gourmand", "sweet", "oud", "vanilla"],
  sweet: ["gourmand", "vanilla", "amber", "tonka", "caramel"],
};

const WARM = ["woody", "oriental", "amber", "spicy", "sweet", "gourmand", "leather", "oud", "tobacco", "vanilla", "musk"];
const COOL = ["fresh", "citrus", "aquatic", "aromatic", "green", "floral", "fruity", "marine"];

const OCCASION_WORDS = {
  daily: ["fresh", "citrus", "floral", "aromatic", "fruity", "aquatic", "woody aromatic"],
  office: ["fresh", "aromatic", "citrus", "green", "woody aromatic", "aquatic"],
  date: ["oriental", "amber", "vanilla", "floral", "gourmand", "musk", "spicy"],
  special: ["oud", "amber", "oriental", "leather", "gourmand", "spicy"],
};

const DISLIKE_WORDS = {
  sweet: ["vanilla", "caramel", "praline", "sugar", "candy", "chocolate", "honey"],
  smoke: ["smoke", "tobacco", "birch", "tar", "incense", "leather", "guaiac"],
  powdery: ["powder", "iris", "heliotrope", "violet", "almond"],
  musk: ["musk", "ambergris", "civet", "castoreum", "animal"],
  green: ["green", "grass", "galbanum", "leaf", "leaves", "basil", "mint", "sage", "rosemary", "herbal"],
  aqua: ["marine", "aquatic", "sea", "water", "ozonic", "calone"],
  gourmand: ["coffee", "hazelnut", "almond", "pistachio", "nut", "praline", "cocoa"],
};

/* How loud a bottle reads, from its concentration. 1 light — 3 bold. */
function intensityOf(product) {
  const c = norm(product.concentration);
  if (!c) return 2;
  if (c.includes("extrait") || c === "parfum" || c.includes("elixir") || c.includes("intense")) return 3;
  if (c.includes("eau de parfum") || c === "edp") return 2.4;
  if (c.includes("eau de toilette") || c === "edt") return 1.7;
  if (c.includes("cologne") || c === "edc") return 1;
  return 2;
}

/* The catalogue carries the reviewer's season votes as indicators; ~177 of the
   185 profiled references have at least one active season. */
function activeSeasons(product) {
  const out = new Set();
  for (const i of product.indicators || []) {
    if (!i || !i.active) continue;
    const l = norm(i.label);
    if (l === "winter" || l === "spring" || l === "summer") out.add(l);
    else if (l === "fall" || l === "autumn") out.add("autumn");
  }
  return out;
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* Weighted score, 100 points: notes 32, family 18, season 18, intensity 12,
   occasion 10, budget 10, minus up to 8 per avoided note group. */
function profileScore(product, a) {
  const family = norm(product.family);
  const ings = (product.ingredients || []).map(norm);
  const n = ings.length || 1;
  let score = 0;

  // notes — preference ratio, plus a bonus for notes near the top of the list
  if (a.notes.length) {
    let hits = 0;
    let prominence = 0;
    for (const key of a.notes) {
      const idx = ings.findIndex((x) => noteHit(x, key));
      if (idx >= 0) {
        hits += 1;
        prominence += Math.max(0, 1 - idx / n);
      }
    }
    score += (hits / a.notes.length) * 27 + (prominence / a.notes.length) * 5;
  } else {
    score += 16;
  }

  // family
  if (a.family === "any") score += 11;
  else if (family.includes(a.family)) score += 18;
  else if ((FAMILY_FRIENDS[a.family] || []).some((f) => family.includes(f))) score += 9;
  else score += 2;

  // season — real data first, family fallback second
  if (a.season === "any") {
    score += 11;
  } else {
    const seasons = activeSeasons(product);
    if (seasons.size) {
      score += seasons.has(a.season) ? 18 : 4;
    } else {
      const warm = WARM.some((w) => family.includes(w));
      const cool = COOL.some((c) => family.includes(c));
      if ((a.season === "winter" && warm) || (a.season === "summer" && cool)) score += 16;
      else if (a.season === "autumn" && warm) score += 14;
      else if (a.season === "spring" && (cool || family.includes("floral"))) score += 13;
      else score += 4;
    }
  }

  // intensity
  if (a.intensity === "any") {
    score += 7;
  } else {
    const want = a.intensity === "light" ? 1 : a.intensity === "moderate" ? 2 : 3;
    const gap = Math.abs(intensityOf(product) - want);
    score += gap < 0.5 ? 12 : gap < 1.2 ? 7 : 2;
  }

  // occasion
  if (a.occasion === "any") score += 6;
  else if ((OCCASION_WORDS[a.occasion] || []).some((w) => family.includes(w))) score += 10;
  else score += 3;

  // budget
  const price = typeof product.fromPrice === "number" ? product.fromPrice : null;
  if (a.budget === "any" || price === null) {
    score += 6;
  } else {
    const band = price < 70 ? "budget" : price <= 150 ? "mid" : "premium";
    score += a.budget === band ? 10 : 3;
  }

  // avoided notes
  for (const dislike of a.dislikes) {
    if (dislike === "none") continue;
    const words = DISLIKE_WORDS[dislike] || [];
    if (ings.some((x) => words.some((w) => x.includes(w)))) score -= 8;
  }

  return clamp(Math.round(score), 18, 98);
}

function ProductRow({ product, badge, note, onGo }) {
  return (
    <li>
      <Link to={`/collection/${product.id}`} className="dp-row pressable" onClick={onGo}>
        <span className="dp-thumb" aria-hidden="true">
          {product.image ? (
            <img src={product.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          ) : (
            <span className="dp-mark">{initials(product.name)}</span>
          )}
        </span>
        <span className="dp-row-meta">
          <strong>{product.name}</strong>
          <span className="dp-row-sub">
            {product.brand}
            {product.concentration ? ` · ${product.concentration}` : ""}
          </span>
          {note ? <span className="dp-row-note">{note}</span> : null}
        </span>
        {badge ? <span className="dp-row-badge">{badge}</span> : null}
      </Link>
    </li>
  );
}

export default function Discover({ initialTab = "profiler", onClose }) {
  const { lang } = useI18n();
  const d = useMemo(() => discoverDict(lang), [lang]);

  const panelRef = useRef(null);
  const [tab, setTab] = useState(initialTab);
  const [ready, setReady] = useState(false);
  const snapshot = useCatalogue();
  const catalogue = ready ? snapshot : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCatalogue()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /* --- profiler ---------------------------------------------------- */
  const questions = useMemo(
    () => [
      { id: "notes", multi: true, max: 4, options: d.notes },
      { id: "family", options: d.families },
      { id: "season", options: d.seasons },
      { id: "intensity", options: d.intensities },
      { id: "occasion", options: d.occasions },
      { id: "budget", options: d.budgets },
      { id: "dislikes", multi: true, max: 5, options: d.dislikes },
    ],
    [d],
  );
  const blank = { notes: [], family: null, season: null, intensity: null, occasion: null, budget: null, dislikes: [] };
  const [answers, setAnswers] = useState(blank);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const reset = () => {
    setAnswers(blank);
    setStep(0);
    setDone(false);
  };

  const q = questions[step];

  function choose(question, value) {
    if (question.multi) {
      setAnswers((prev) => {
        const list = prev[question.id] || [];
        if (question.multi && value === "none") return { ...prev, [question.id]: ["none"] };
        const without = list.filter((v) => v !== "none");
        const next = without.includes(value)
          ? without.filter((v) => v !== value)
          : without.length >= question.max
            ? without
            : [...without, value];
        return { ...prev, [question.id]: next };
      });
      return;
    }
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (step === questions.length - 1) setDone(true);
    else setStep((s) => s + 1);
  }

  const results = useMemo(() => {
    if (!done || !catalogue) return [];
    const a = {
      notes: answers.notes,
      family: answers.family || "any",
      season: answers.season || "any",
      intensity: answers.intensity || "any",
      occasion: answers.occasion || "any",
      budget: answers.budget || "any",
      dislikes: answers.dislikes.length ? answers.dislikes : ["none"],
    };
    return catalogue
      .map((p) => ({ p, pct: profileScore(p, a) }))
      .sort((x, y) => y.pct - x.pct || x.p.name.localeCompare(y.p.name))
      .slice(0, 8);
  }, [done, catalogue, answers]);

  /* --- ingredient finder ------------------------------------------- */
  const noteIndex = useMemo(() => {
    if (!catalogue) return [];
    const map = new Map();
    for (const p of catalogue) {
      for (const raw of p.ingredients || []) {
        const label = String(raw).trim();
        if (!label) continue;
        let entry = map.get(norm(label));
        if (!entry) {
          entry = { key: norm(label), label, count: 0, products: [] };
          map.set(entry.key, entry);
        }
        entry.count += 1;
        entry.products.push(p);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [catalogue]);

  const [noteQuery, setNoteQuery] = useState("");
  const [selected, setSelected] = useState([]);

  const shownNotes = useMemo(() => {
    const term = norm(noteQuery);
    const list = term ? noteIndex.filter((e) => e.key.includes(term)) : noteIndex;
    return list.slice(0, 48);
  }, [noteIndex, noteQuery]);

  const labelOf = useCallback(
    (key) => {
      const known = (d.notes || []).find(([k]) => k === key);
      if (known) return known[1];
      const index = noteIndex.findIndex((e) => e.key === key);
      return index >= 0 ? noteIndex[index].label : key;
    },
    [d, noteIndex],
  );

  const noteResults = useMemo(() => {
    if (!catalogue || !selected.length) return [];
    const keys = selected;
    const scored = [];
    for (const p of catalogue) {
      const ings = (p.ingredients || []).map(norm);
      const hit = keys.filter((k) => ings.some((x) => noteHit(x, k)));
      if (hit.length) scored.push({ p, hit });
    }
    /* Most of the chosen notes first, so a bottle carrying all of them leads. */
    scored.sort(
      (a, b) =>
        b.hit.length - a.hit.length ||
        a.p.brand.localeCompare(b.p.brand) ||
        a.p.name.localeCompare(b.p.name),
    );
    return scored.slice(0, 24);
  }, [catalogue, selected]);

  const toggleNote = (key) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 6) return prev;
      return [...prev, key];
    });
  };

  const optionHint = (id) => (id === "notes" ? d.pickUpToFour : id === "dislikes" ? d.pickUpToFive : null);

  return (
    <div className="dp" role="dialog" aria-modal="true" aria-label={d.title}>
      <button type="button" className="dp-scrim" aria-label={d.close} onClick={onClose} tabIndex={-1} />

      <div className="dp-panel" ref={panelRef} tabIndex={-1}>
        <header className="dp-head">
          <div>
            <p className="eyebrow">Charme</p>
            <h2 className="dp-title">{d.title}</h2>
          </div>
          <button type="button" className="dp-close pressable" onClick={onClose} aria-label={d.close} title={d.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="dp-tabs" role="tablist" aria-label={d.title}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "profiler"}
            data-guide="profiler"
            className={`dp-tab pressable${tab === "profiler" ? " on" : ""}`}
            onClick={() => setTab("profiler")}
          >
            <Sparkles size={15} aria-hidden="true" />
            {d.tabProfiler}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ingredients"}
            data-guide="ingredients"
            className={`dp-tab pressable${tab === "ingredients" ? " on" : ""}`}
            onClick={() => setTab("ingredients")}
          >
            <Search size={15} aria-hidden="true" />
            {d.tabIngredients}
          </button>
        </div>

        <div className="dp-body">
          {failed ? (
            <p className="dp-empty">{d.noNoteIndex}</p>
          ) : catalogue === null ? (
            <p className="dp-loading">
              <Loader2 size={16} className="dp-spin" aria-hidden="true" />
              {d.noNoteIndex}
            </p>
          ) : tab === "profiler" ? (
            done ? (
              <div className="dp-results">
                <div className="dp-results-head">
                  <h3 className="dp-h3">{d.results}</h3>
                  <p className="dp-lede">{d.resultsLede}</p>
                </div>
                {results.length ? (
                  <ul className="dp-rows">
                    {results.map(({ p, pct }) => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        badge={
                          <>
                            <strong>{pct}%</strong>
                            <em>{d.match}</em>
                          </>
                        }
                        onGo={onClose}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="dp-empty">{d.noResults}</p>
                )}
                <div className="dp-actions">
                  <button type="button" className="btn-ghost pressable" onClick={reset}>
                    <RotateCcw size={15} aria-hidden="true" />
                    {d.restart}
                  </button>
                  <Link to="/collection" className="btn-accent pressable" onClick={onClose}>
                    {d.browse}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="dp-q">
                <div className="dp-progress" aria-hidden="true">
                  <span style={{ inlineSize: `${((step + 1) / questions.length) * 100}%` }} />
                </div>
                <p className="dp-step">
                  {d.step} {step + 1} {d.of} {questions.length}
                </p>
                <h3 className="dp-h3">{d.q[q.id].title}</h3>
                {optionHint(q.id) ? <p className="dp-hint">{optionHint(q.id)}</p> : null}
                <ul className="dp-options">
                  {q.options.map(([value, label]) => {
                    const on = q.multi ? (answers[q.id] || []).includes(value) : answers[q.id] === value;
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          className={`dp-option pressable${on ? " on" : ""}`}
                          aria-pressed={on}
                          onClick={() => choose(q, value)}
                        >
                          <span>{label}</span>
                          {on && q.multi ? <Check size={14} aria-hidden="true" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="dp-nav">
                  {step > 0 ? (
                    <button
                      type="button"
                      className="btn-ghost pressable"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      <ArrowLeft size={15} aria-hidden="true" />
                      {d.back}
                    </button>
                  ) : null}
                  {q.multi ? (
                    <button
                      type="button"
                      className="btn-accent pressable"
                      onClick={() => (step === questions.length - 1 ? setDone(true) : setStep((s) => s + 1))}
                    >
                      {step === questions.length - 1 ? d.seeResults : d.next}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          ) : (
            <div className="dp-ing">
              <p className="dp-lede">{d.ingredientsLede}</p>
              {selected.length ? (
                <div className="dp-chosen">
                  <p className="eyebrow">{d.selectedNotes}</p>
                  <div className="dp-chips">
                    {selected.map((key) => (
                      <button key={key} type="button" className="dp-chip on pressable" onClick={() => toggleNote(key)}>
                        {labelOf(key)}
                        <X size={12} aria-hidden="true" />
                      </button>
                    ))}
                    <button type="button" className="dp-chip clear pressable" onClick={() => setSelected([])}>
                      {d.clearNotes}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="dp-hint">{d.pickNotes}</p>
              )}

              <label className="dp-search">
                <Search size={15} aria-hidden="true" />
                <input
                  value={noteQuery}
                  onChange={(e) => setNoteQuery(e.target.value)}
                  placeholder={d.searchNotes}
                  aria-label={d.searchNotes}
                  autoComplete="off"
                />
              </label>

              <ul className="dp-chips dp-chip-grid">
                {shownNotes.map((entry) => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      className={`dp-chip pressable${selected.includes(entry.key) ? " on" : ""}`}
                      aria-pressed={selected.includes(entry.key)}
                      onClick={() => toggleNote(entry.key)}
                    >
                      {entry.label}
                      <em>{entry.count}</em>
                    </button>
                  </li>
                ))}
              </ul>

              {selected.length ? (
                <>
                  <h3 className="dp-h3 dp-results-gap">
                    {d.noteResults} <span className="dp-count">{noteResults.length}</span>
                  </h3>
                  {noteResults.length ? (
                    <ul className="dp-rows">
                      {noteResults.map(({ p, hit }) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          note={`${d.carries} ${hit.map(labelOf).join(" · ")}`}
                          badge={`${hit.length}/${selected.length}`}
                          onGo={onClose}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="dp-empty">{d.noNoteResults}</p>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
