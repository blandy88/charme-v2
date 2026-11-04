import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, Clock, Compass, CreditCard, FileText, LayoutGrid, Lock, Play, Search, Shield, ShoppingBag, Sparkles, Star, User, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { useGuideTour } from "../../contexts/GuideTourContext.jsx";
import { CATEGORY, FILM, GUIDES, TABS } from "../lib/guidesData.js";
import { tablistKeys } from "../lib/tablist.js";
import { useDialogFocus } from "../lib/useDialogFocus.js";
import { GUIDE_VIDEOS } from "../lib/guideVideos.js";
import "./guides.css";

/* Journeys, tutorials & interactive guides — the legacy's guides.js, ported.
 *
 * The legacy kept this modal behind an admin-only launcher (`#guidesBtn`), so
 * the Atelier does the same: the route exists, the nav link appears for
 * administrators, and a signed-out or non-admin visitor gets a plain
 * explanation instead of the tour.
 *
 * Two kinds of card now share the grid:
 *
 *   - a FILMED one. `FILM[guide.id]` names the tutorial in GUIDE_VIDEOS, which
 *     publish.py generates from the rendered films. The card shows a poster and
 *     a running time, and opens the player. The back office is taught this way:
 *     a task with a form in it is easier to copy from a film than from a
 *     spotlight, and the chapters let someone re-watch one step.
 *   - an INTERACTIVE one. No film exists, so the card opens the spotlight tour
 *     below, exactly as it always did. The shop-floor journeys live here.
 *
 * The tour engine is unchanged: a spotlight over the target element with a
 * tooltip parked beside it, back/next/finish/skip, and steps whose selector is
 * not on screen skipped silently when `opt` is set.
 *
 * Steps point at `data-guide` hooks on the Atelier's own chrome; the legacy's
 * selectors (`.nav-link`, `#themeToggle`, `#aiFinderIcon`) do not exist here.
 */

/* Icons: the same set the legacy drew as custom line icons, taken from
   lucide-react so they share the chrome's stroke weight. */
const ICONS = {
  compass: Compass,
  search: Search,
  grid: LayoutGrid,
  bottle: Sparkles,
  bag: ShoppingBag,
  user: User,
  card: CreditCard,
  sparkle: Sparkles,
  star: Star,
  shield: Shield,
  clock: Clock,
  receipt: FileText,
  idcard: User,
  bell: Bell,
  lock: Lock,
  note: FileText,
};

function GuideIcon({ name, size = 18 }) {
  const Cmp = ICONS[name] || Compass;
  return <Cmp size={size} aria-hidden="true" />;
}

/* A running time, in the m:ss a video player would show. */
function clock(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* An overlay belongs to the document, not to the page it happens to be opened
 * from.
 *
 * Rendered inline, the player sat inside <main> and the sticky header painted
 * over it: header.nav is sticky with a backdrop-filter, and it came out on top
 * of .gp-overlay (z-index 95) even at 99. The close button's centre hit-tested
 * to a header button, so at desktop widths the film could not be closed by
 * clicking it, and Playwright refused the click outright. Re-parenting the
 * overlay onto <body> fixes it - verified by probe, not by reading.
 */
function Overlay({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

/* The page underneath must not scroll while an overlay is open, and Escape
   closes it. Shared by the player and the tour runner. */
function useOverlayKeys(onExit) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onExit]);
}

/* ---------- the filmed tutorial ---------- */

function Player({ guide, film, onExit }) {
  const shell = useRef(null);
  useDialogFocus(shell, { initialFocus: ".gp-close" });
  const { t, lang } = useI18n();
  const video = useRef(null);
  const [at, setAt] = useState(0);

  useOverlayKeys(onExit);

  const seek = (time) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = time;
    /* play() rejects if the browser refuses to autoplay; seeking still worked,
       so the rejection is not worth surfacing. */
    const started = el.play();
    if (started && started.catch) started.catch(() => {});
  };

  /* Which chapter is playing, so the list can mark it. The small tolerance
     keeps the mark on the outgoing chapter until the incoming one is really
     under way. */
  const active = useMemo(() => {
    let found = -1;
    film.chapters.forEach((c, i) => {
      if (at >= c.t - 0.05) found = i;
    });
    return found;
  }, [at, film]);

  const title = guide.title[lang] || guide.title.en;

  return (
    <Overlay>
    <div className="gp gp-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="gp-scrim" onClick={onExit} aria-hidden="true" />

      <div className="gp-player panel" ref={shell}>
        <div className="gp-player-head">
          <div>
            <p className="eyebrow">{t("guideFilm")}</p>
            <h2 className="gp-player-title">{title}</h2>
          </div>
          <button type="button" className="gp-close pressable" onClick={onExit} aria-label={t("guideClose")}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <video
          ref={video}
          className="gp-video"
          src={film.src}
          poster={film.poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
        />

        <p className="gp-player-desc">{guide.desc[lang] || guide.desc.en}</p>

        <div className="gp-chapters-wrap">
          <p className="gp-chapters-head">{t("guideChapters")}</p>
          <ol className="gp-chapters">
            {film.chapters.map((c, i) => (
              <li key={`${c.t}-${i}`}>
                <button
                  type="button"
                  className={`gp-chapter pressable${i === active ? " on" : ""}`}
                  onClick={() => seek(c.t)}
                >
                  <span className="gp-chapter-t">{clock(c.t)}</span>
                  <span className="gp-chapter-l">{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
    </Overlay>
  );
}

/* ---------- the tour runner ---------- */

export function Tour({ guide, onExit }) {
  const tip = useRef(null);
  useDialogFocus(tip);
  const { t, lang } = useI18n();
  const [cursor, setCursor] = useState(0);
  const [rect, setRect] = useState(null);
  const [missing, setMissing] = useState(false);
  /* Bumped when a step's target is not on screen yet, to re-run `resolve`.
     A tour that opens on a route it just navigated to is racing the lazy page
     mount; without this the first step resolved to nothing and the tooltip
     said "this element is not visible" while it was still being fetched. */
  const [tick, setTick] = useState(0);

  const stepCount = guide.steps.length;

  /* Advance from `index` past steps whose target is not on screen. `opt` steps
     vanish silently; a mandatory one is shown with a note instead of a
     spotlight — the legacy's "isn't on screen right now" branch. */
  const resolve = useCallback(
    (index) => {
      for (let i = index; i < stepCount; i += 1) {
        const step = guide.steps[i];
        const el = step.guide ? document.querySelector(`[data-guide="${step.guide}"]`) : null;
        if (el) return { step, el, index: i };
        if (!step.opt) return { step, el: null, index: i };
      }
      return null;
    },
    [guide, stepCount],
  );

  const current = useMemo(
    () => resolve(cursor) || { step: guide.steps[cursor] || guide.steps[0], el: null, index: cursor },
    [resolve, cursor, guide, tick],
  );

  /* The next index in `dir` that will actually show something. A step whose
     target is absent and is marked `opt` is invisible to the reader, so Next
     must not stop on it - otherwise the button looks dead on screens where
     several optional targets are missing. -1 means there is no such step. */
  const jump = useCallback(
    (from, dir) => {
      for (let i = from; i >= 0 && i < stepCount; i += dir) {
        const step = guide.steps[i];
        if (!step) continue;
        const el = step.guide ? document.querySelector(`[data-guide="${step.guide}"]`) : null;
        if (el || !step.opt) return i;
      }
      return -1;
    },
    [guide, stepCount],
  );

  const goNext = useCallback(() => {
    const n = jump(cursor + 1, 1);
    if (n === -1) onExit(true);
    else setCursor(n);
  }, [cursor, jump, onExit]);

  const goPrev = useCallback(() => {
    const p = jump(cursor - 1, -1);
    setCursor(p === -1 ? 0 : p);
  }, [cursor, jump]);

  /* The last step the reader can actually reach from here. */
  const atEnd = jump(cursor + 1, 1) === -1;

  const measure = useCallback(() => {
    if (!current.el) {
      setRect(null);
      setMissing(true);
      return;
    }
    setMissing(false);
    const r = current.el.getBoundingClientRect();
    const pad = 6;
    setRect({
      x: r.left - pad,
      y: r.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
      place: current.step.place || "bottom",
    });
    /* Scroll it into view if the page has a scrollbar: nav steps often sit
       outside the viewport on a phone, and the dialog pins the page. */
    if (r.top < 8 || r.bottom > window.innerHeight - 8) {
      current.el.scrollIntoView({ block: "center" });
    }
  }, [current]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  /* Keep looking for a step target that is not in the DOM yet. A tour can open
     behind a click that changes route - the product guide opens a card in the
     collection, then has to spotlight the product page it lands on - so one
     miss is not a real miss. After ~4s of misses, believe it. */
  const [misses, setMisses] = useState(0);
  useEffect(() => {
    if (current.el) {
      setMisses(0);
      return undefined;
    }
    if (misses >= 32) return undefined;
    const id = setTimeout(() => {
      setMisses((n) => n + 1);
      setTick((k) => k + 1);
    }, 125);
    return () => clearTimeout(id);
  }, [current, misses]);

  useOverlayKeys(onExit);

  /* Arrow keys step through the tour; the player below does not use them. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setCursor((c) => Math.min(stepCount - 1, c + 1));
      else if (e.key === "ArrowLeft") setCursor((c) => Math.max(0, c - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stepCount]);

  const place = rect ? rect.place : "bottom";

  /* In Arabic the reading direction reverses, so "next" points left and "back"
     points right. The icons are physical glyphs and were drawn for LTR, so in
     RTL they pointed the wrong way round the whole time. The key bindings stay
     logical - ArrowRight is always forward - so the arrow tells you which way
     the reader travels, and the keyboard keeps its meaning in both. */
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const PrevIcon = rtl ? ArrowRight : ArrowLeft;
  const NextIcon = rtl ? ArrowLeft : ArrowRight;

  /* Where the tooltip sits, relative to the viewport. The 20rem ceiling is the
     width callers want; the gap and the viewport bound it on a phone. */
  const TIP_WIDTH = 320;
  const tooltipStyle = useMemo(() => {
    if (!rect) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;
    const width = Math.min(TIP_WIDTH, vw - 2 * gap);
    const centred = Math.min(Math.max(gap, rect.x + rect.w / 2 - width / 2), Math.max(gap, vw - width - gap));
    if (place === "bottom") {
      return { left: centred, top: Math.min(rect.y + rect.h + gap, Math.max(gap, vh - 12)), inlineSize: `${width}px`, transform: "none" };
    }
    if (place === "top") {
      return { left: centred, bottom: Math.max(gap, vh - rect.y + gap), inlineSize: `${width}px`, transform: "none" };
    }
    if (place === "left") {
      return {
        left: Math.max(gap, rect.x - width - gap),
        top: Math.min(Math.max(gap, rect.y), Math.max(gap, vh - 180)),
        inlineSize: `${width}px`,
        transform: "none",
      };
    }
    if (place === "right") {
      return {
        left: Math.min(rect.x + rect.w + gap, Math.max(gap, vw - width - gap)),
        top: Math.min(Math.max(gap, rect.y), Math.max(gap, vh - 180)),
        inlineSize: `${width}px`,
        transform: "none",
      };
    }
    return { left: centred, top: "50%", inlineSize: `${width}px`, transform: "translateY(-50%)" };
  }, [rect, place]);

  return (
    <Overlay>
    <div className="gp" role="dialog" aria-modal="true" aria-label={guide.title[lang] || guide.title.en}>
      <div className="gp-scrim" onClick={() => onExit(false)} aria-hidden="true" />

      {rect ? (
        <div className="gp-spot" style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }} aria-hidden="true" />
      ) : null}

      <div className="gp-tip panel" style={tooltipStyle} ref={tip}>
        <div className="gp-tip-head">
          <p className="eyebrow">{guide.title[lang] || guide.title.en}</p>
          <span className="gp-count">{current.index + 1}/{stepCount}</span>
        </div>

        {missing ? (
          <p className="gp-missing">{t("guideMissing")}</p>
        ) : (
          <>
            <h3 className="gp-step-title">{current.step.t[lang] || current.step.t.en}</h3>
            <p className="gp-step-desc">{current.step.d[lang] || current.step.d.en}</p>
          </>
        )}

        <div className="gp-tip-foot">
          <button type="button" className="gp-skip pressable" onClick={() => onExit(false)}>
            {t("guideSkip")}
          </button>
          <div className="gp-nav">
            <button
              type="button"
              className="btn-ghost pressable"
              onClick={goPrev}
              disabled={cursor === 0}
            >
              <PrevIcon size={14} aria-hidden="true" />
              {t("guideBack")}
            </button>
            <button type="button" className="btn-accent pressable" onClick={goNext}>
              {atEnd ? t("guideFinish") : t("guideNext")}
              {atEnd ? null : <NextIcon size={14} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Overlay>
  );
}

/* ---------- the page ---------- */

export default function Guides() {
  const { t, lang } = useI18n();
  const { user, isAdmin, ready } = useAuth();
  const [tab, setTab] = useState("all");
  /* The tour runner now lives in GuideTourProvider, above the router, so it
     can open on the page a guide's steps are written against. */
  const { active: running, start: startTour, done, markDone } = useGuideTour();
  const [watching, setWatching] = useState(null);

  const shown = useMemo(
    () => (tab === "all" ? GUIDES : GUIDES.filter((g) => CATEGORY[g.id] === tab)),
    [tab],
  );

  const filmed = useMemo(() => GUIDES.filter((g) => GUIDE_VIDEOS[FILM[g.id]]).length, []);

  if (!ready) return <main className="gp-wrap" />;

  if (!user) {
    return (
      <main className="wrap section gp-wrap">
        <p className="eyebrow">Charme</p>
        <h1 className="gp-title">{t("guides")}</h1>
        <div className="gp-empty panel">
          <h2>{t("guideSignIn")}</h2>
          <p>{t("guideSignInBody")}</p>
          <div className="gp-empty-actions">
            <Link to="/auth?next=/guides" className="btn-accent pressable">
              {t("signIn")}
            </Link>
            <Link to="/" className="btn-ghost pressable">
              {t("home")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="wrap section gp-wrap">
        <p className="eyebrow">Charme</p>
        <h1 className="gp-title">{t("guides")}</h1>
        <div className="gp-empty panel">
          <h2>{t("guideGateTitle")}</h2>
          <p>{t("guideGateBody")}</p>
          <div className="gp-empty-actions">
            <Link to="/collection" className="btn-accent pressable">
              {t("collection")}
            </Link>
            <Link to="/contact" className="btn-ghost pressable">
              {t("contact")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap section gp-wrap">
      <p className="eyebrow">Parfumerie Charme · Conciergerie</p>
      <h1 className="gp-title">{t("guideTitle")}</h1>
      <p className="gp-lede">{t("guideLede").replace("{g}", String(GUIDES.length))}</p>

      <div className="gp-tabs" role="tablist" aria-label={t("guideTitle")}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`gp-tab-${item.id}`}
            aria-controls="gp-tabpanel"
            aria-selected={tab === item.id}
            /* Roving tabindex: a tablist is one tab stop, and the arrow keys
               move between tabs. Without this, reaching the last category means
               tabbing through every earlier one on the way. */
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={tablistKeys(tab, setTab, TABS.map((x) => x.id), "gp-tab-")}
            className={`gp-tab pressable${tab === item.id ? " on" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item[lang] || item.en}
          </button>
        ))}
      </div>

      <ul className="gp-grid" role="tabpanel" id="gp-tabpanel" aria-labelledby={`gp-tab-${tab}`}>
        {shown.map((guide, i) => {
          const film = GUIDE_VIDEOS[FILM[guide.id]];
          const finished = done.has(guide.id);
          const title = guide.title[lang] || guide.title.en;
          const desc = guide.desc[lang] || guide.desc.en;
          return (
            <li key={guide.id}>
              <article
                className={`gp-card panel${film ? " has-film" : ""}${finished ? " done" : ""}`}
                style={{ "--i": i }}
                data-guide={guide.id}
              >
                {film ? (
                  <button type="button" className="gp-thumb pressable" onClick={() => setWatching(guide.id)} aria-label={`${t("guideWatch")} — ${title}`}>
                    <img src={film.poster} alt="" loading="lazy" />
                    <span className="gp-badge">{t("guideFilm")}</span>
                    <span className="gp-time">{clock(film.duration)}</span>
                    <span className="gp-play" aria-hidden="true">
                      <Play size={20} />
                    </span>
                  </button>
                ) : (
                  <span className="gp-card-icon">
                    <GuideIcon name={guide.icon} />
                  </span>
                )}

                <h2 className="gp-card-title">{title}</h2>
                <p className="gp-card-desc">{desc}</p>

                <div className="gp-card-foot">
                  <span className="gp-card-steps">
                    {film
                      ? `${film.chapters.length} ${t("guideChapters").toLowerCase()}`
                      : `${guide.steps.length} ${t("guideSteps")}`}
                  </span>
                  <button
                    type="button"
                    className="btn-accent pressable"
                    onClick={() => (film ? setWatching(guide.id) : startTour(guide.id))}
                  >
                    <Play size={14} aria-hidden="true" />
                    {finished ? t("guideReplay") : film ? t("guideWatch") : t("guideStart")}
                  </button>

                  {/* Every guide now has a film, and the film takes the card's
                      main action. Without this the spotlight tour became
                      unreachable - a film is better for a form-heavy task, but
                      the tour is the only thing that can walk the interface
                      itself, and it is what a reader can pause on. */}
                  {film && guide.steps.length ? (
                    <button
                      type="button"
                      className="btn-ghost pressable gp-tour"
                      onClick={() => startTour(guide.id)}
                    >
                      <Compass size={14} aria-hidden="true" />
                      {t("guideTour")}
                    </button>
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <p className="gp-foot">{filmed} / {GUIDES.length} {t("guideFilmed")}</p>

      {watching ? (
        <Player
          key={watching}
          guide={GUIDES.find((g) => g.id === watching)}
          film={GUIDE_VIDEOS[FILM[watching]]}
          onExit={() => {
            markDone(watching);
            setWatching(null);
          }}
        />
      ) : null}
    </main>
  );
}
