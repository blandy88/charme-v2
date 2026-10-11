import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

/*
 * The slow sliding smooth scroll: Lenis with a long glide.
 * - duration 1.8s + soft easing = the famous heavy, buttery feel
 * - compositor-friendly: Lenis drives native scroll, so scroll-driven
 *   CSS animations (reveal timelines) stay in sync for free
 * - skipped entirely under prefers-reduced-motion
 * - anchor links glide instead of jumping; route changes reset to top
 */

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
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
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
