import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

/*
 * The slow sliding smooth scroll: Lenis tuned HEAVY.
 *
 * lerp is a damping rate, not a fraction-per-frame: Lenis delta-normalises it
 * (1 - exp(-lerp*60*dt)), so the feel is identical at 60Hz and 165Hz.
 *   lerp 0.10 -> time constant 0.17s  (subtle)
 *   lerp 0.022 -> time constant 0.76s (heavy: ~2.3s to 95%) <- default
 *
 * IMPORTANT (this bit us twice):
 * Lenis's own default `respectReducedMotion: true` forces `lerp = 1` — i.e.
 * completely disables smoothing — on every machine that reports
 * prefers-reduced-motion. That silently made the whole effect a no-op.
 * We disable Lenis's handling and manage reduced motion ourselves with a
 * softened lerp, so the glide always exists but stays gentle.
 *
 * Live tuning without a rebuild: open /app/?glide=0.015 (range ~0.01 heavy,
 * ~0.08 light). The value is remembered in localStorage.
 */

const LERP = 0.022;
const LERP_REDUCED = 0.09;

function resolveLerp() {
  try {
    const q = new URLSearchParams(window.location.search).get("glide");
    if (q !== null) {
      const v = Number(q);
      if (Number.isFinite(v) && v > 0 && v < 0.5) {
        localStorage.setItem("charme-glide", String(v));
        return v;
      }
    }
    const saved = Number(localStorage.getItem("charme-glide"));
    if (Number.isFinite(saved) && saved > 0 && saved < 0.5) return saved;
  } catch {
    /* private mode etc. */
  }
  return LERP;
}

let lenis = null;
let currentLerp = null;

export function getLenis() {
  return lenis;
}

export default function SmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (lenis) return;

    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* ignore */
    }

    currentLerp = reduced ? LERP_REDUCED : resolveLerp();

    try {
      lenis = new Lenis({
        lerp: currentLerp,
        wheelMultiplier: 1,
        touchMultiplier: 1.8,
        smoothWheel: true,
        // Lenis would otherwise force lerp = 1 (no smoothing at all).
        respectReducedMotion: false,
      });
    } catch {
      lenis = null;
      return;
    }

    document.documentElement.dataset.scrollWeight = reduced ? "soft" : "heavy";

    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -72 });
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
      lenis = null;
      currentLerp = null;
      delete document.documentElement.dataset.scrollWeight;
    };
  }, []);

  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
