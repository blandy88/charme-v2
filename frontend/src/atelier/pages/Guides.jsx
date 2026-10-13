import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, Clock, Compass, CreditCard, FileText, Gift, LayoutGrid, Lock, Play, Search, Shield, ShoppingBag, Sparkles, Star, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { CATEGORY, GUIDES, TABS } from "../lib/guidesData.js";
import "./guides.css";

/* Journeys & interactive guides — the legacy's guides.js, ported.
 *
 * The legacy kept this modal behind an admin-only launcher (`#guidesBtn`), so
 * the Atelier does the same: the route exists, the nav link appears for
 * administrators, and a signed-out or non-admin visitor gets a plain
 * explanation instead of the tour.
 *
 * The engine is a Reimplementation of the three moving parts:
 *   1. the index — a filterable grid of guides, tabbed by category
 *   2. the runner — a spotlight over the target element with a tooltip parked
 *      beside it, back/next/finish/skip, and a completion state
 *   3. the stepping — steps whose selector is not on screen are skipped, and
 *      `opt: true` steps are skipped silently rather than announced
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

/* ---------- the tour runner ---------- */

function Tour({ guide, onExit }) {
  const { t, lang } = useI18n();
  const [cursor, setCursor] = useState(0);
  const [rect, setRect] = useState(null);
  const [missing, setMissing] = useState(false);

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
    [resolve, cursor, guide],
  );

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

  /* While a tour runs the page underneath must not scroll. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight") setCursor((c) => Math.min(stepCount - 1, c + 1));
      else if (e.key === "ArrowLeft") setCursor((c) => Math.max(0, c - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onExit, stepCount]);

  const place = rect ? rect.place : "bottom";

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
    <div className="gp" role="dialog" aria-modal="true" aria-label={guide.title[lang] || guide.title.en}>
      <div className="gp-scrim" onClick={onExit} aria-hidden="true" />

      {rect ? (
        <div className="gp-spot" style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }} aria-hidden="true" />
      ) : null}

      <div className="gp-tip panel" style={tooltipStyle}>
        <div className="gp-tip-head">
          <p className="eyebrow">{guide.title[lang] || guide.title.en}</p>
          <span className="gp-count">{cursor + 1}/{stepCount}</span>
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
          <button type="button" className="gp-skip pressable" onClick={onExit}>
            {t("guideSkip")}
          </button>
          <div className="gp-nav">
            <button
              type="button"
              className="btn-ghost pressable"
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
              disabled={cursor === 0}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {t("guideBack")}
            </button>
            <button
              type="button"
              className="btn-accent pressable"
              onClick={() => (cursor === stepCount - 1 ? onExit() : setCursor((c) => c + 1))}
            >
              {cursor === stepCount - 1 ? t("guideFinish") : t("guideNext")}
              {cursor === stepCount - 1 ? null : <ArrowRight size={14} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- the page ---------- */

export default function Guides() {
  const { t, lang } = useI18n();
  const { user, isAdmin, ready } = useAuth();
  const [tab, setTab] = useState("all");
  const [running, setRunning] = useState(null);
  const [done, setDone] = useState(null);

  const shown = useMemo(
    () => (tab === "all" ? GUIDES : GUIDES.filter((g) => CATEGORY[g.id] === tab)),
    [tab],
  );

  const totalSteps = useMemo(() => GUIDES.reduce((n, g) => n + g.steps.length, 0), []);

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
      <p className="gp-lede">{t("guideLede").replace("{g}", String(GUIDES.length)).replace("{s}", String(totalSteps))}</p>

      <div className="gp-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`gp-tab pressable${tab === item.id ? " on" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item[lang] || item.en}
          </button>
        ))}
      </div>

      <ul className="gp-grid">
        {shown.map((guide, i) => {
          const steps = guide.steps.length;
          const finished = done === guide.id;
          return (
            <li key={guide.id}>
              <article className={`gp-card panel${finished ? " done" : ""}`} style={{ "--i": i }}>
                <span className="gp-card-icon">
                  <GuideIcon name={guide.icon} />
                </span>
                <h2 className="gp-card-title">{guide.title[lang] || guide.title.en}</h2>
                <p className="gp-card-desc">{guide.desc[lang] || guide.desc.en}</p>
                <div className="gp-card-foot">
                  <span className="gp-card-steps">
                    {steps} {t("guideSteps")}
                  </span>
                  <button type="button" className="btn-accent pressable" onClick={() => setRunning(guide.id)}>
                    <Play size={14} aria-hidden="true" />
                    {finished ? t("guideReplay") : t("guideStart")}
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {running ? (
        <Tour
          guide={GUIDES.find((g) => g.id === running)}
          onExit={() => {
            setDone(running);
            setRunning(null);
          }}
        />
      ) : null}
    </main>
  );
}
