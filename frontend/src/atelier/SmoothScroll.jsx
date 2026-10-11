import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

/*
 * The slow sliding smooth scroll: Lenis tuned HEAVY.
 * - lerp 0.06 = the page trails far behind the wheel with long inertia
 *   (the luxury award-site feel). Lower = heavier. 0.1 is default-subtle.
 * - Lenis drives native scroll, so scroll-driven CSS animations
 *   (reveal timelines) stay in sync for free.
 * - Skipped entirely under prefers-reduced-motion.
 * - Anchor links glide instead of jumping; route changes reset to top.
 *
 * Tuning: lower lerp = heavier glide. 0.04 is extreme, 0.08 is medium.
 */

const LERP = 0.05;

let lenis = null;

export function getLenis() {
  return lenis;
}

export default function SmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (lenis) return;

    lenis = new Lenis({
      lerp: LERP,
      wheelMultiplier: 1,
      touchMultiplier: 1.8,
      smoothWheel: true,
    });

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
    };
  }, []);

  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
