import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronUp, ShoppingBag } from "lucide-react";
import { useCart } from "../contexts/CartContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import { getLenis } from "./SmoothScroll.jsx";

/*
 * The utility overlays the legacy document keeps after the product run
 * (blocks 22-27 of the recon inventory): social rail, floating cart,
 * back-to-top ring, vignette.
 *
 * They are chrome, not content, so they live outside <Routes> and survive every
 * tab change. The legacy puts them at the very end of the body; here they are
 * fixed-position siblings of the nav and footer.
 */

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61550961672675",
    d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/charmebeautysenteurs/",
    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
];

function SocialRail() {
  const { t } = useI18n();
  return (
    <div className="social-rail" aria-label={t("followUs")}>
      {SOCIALS.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="pressable">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={s.d} />
          </svg>
        </a>
      ))}
    </div>
  );
}

/* Scroll-progress ring, exactly the legacy geometry (r=26 in a 60-box). */
function BackToTop() {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      setShown(window.scrollY > 700);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const r = 26;
  const circumference = 2 * Math.PI * r;

  return (
    <button
      type="button"
      className={`back-to-top${shown ? " show" : ""}`}
      aria-label={t("backToTop")}
      tabIndex={shown ? 0 : -1}
      onClick={() => {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0 });
      }}
    >
      <svg viewBox="0 0 60 60" width="54" height="54" aria-hidden="true">
        <circle className="ring-track" cx="30" cy="30" r={r} />
        <circle
          className="ring-progress"
          cx="30"
          cy="30"
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <ChevronUp size={17} aria-hidden="true" />
    </button>
  );
}

/* The legacy floating action button is the cart, with a live badge. */
function FloatingCart() {
  const { t } = useI18n();
  const { count } = useCart();
  return (
    <Link to="/cart" className="floating-cart pressable" aria-label={t("cart")}>
      <ShoppingBag size={20} aria-hidden="true" />
      {count > 0 ? <span className="floating-badge">{count}</span> : null}
    </Link>
  );
}

/* Details / Grid — removed with the homepage product run: the mode only ever
   changed the density of that run, so with the run gone the control would have
   been a switch wired to nothing. */

export default function Overlays() {
  return (
    <>
      <div className="top-vignette" aria-hidden="true" />
      <SocialRail />
      <FloatingCart />
      <BackToTop />
    </>
  );
}
