import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useCart } from "../contexts/CartContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

const linkCls = ({ isActive }) =>
  `text-xs tracking-[0.08em] transition-colors hover:text-brass ${
    isActive ? "text-brass" : "text-muted"
  }`;

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="font-display text-xl tracking-tight text-cream">
          Charme
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Primary">
          <NavLink to="/" className={linkCls}>{t("home")}</NavLink>
          <NavLink to="/collection" className={linkCls}>{t("collection")}</NavLink>
          <NavLink to="/guides" className={linkCls}>{t("guides")}</NavLink>
          <NavLink to="/contact" className={linkCls}>{t("contact")}</NavLink>
          {user ? <NavLink to="/loyalty" className={linkCls}>{t("loyalty")}</NavLink> : null}
          {isAdmin ? <NavLink to="/admin" className={linkCls}>{t("admin")}</NavLink> : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
            className="rounded-sm border border-hairline bg-surface px-1.5 py-1 text-xs text-muted"
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>

          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle light / night theme"
            className="rounded-sm border border-hairline px-2 py-1 text-xs text-muted transition-colors hover:border-brass hover:text-brass"
          >
            {theme === "light" ? "☾" : "☀"}
          </button>

          <Link
            to="/cart"
            aria-label={t("cart")}
            className="relative rounded-sm border border-hairline px-2 py-1 text-xs text-muted transition-colors hover:border-brass hover:text-brass"
          >
            🛒
            {count > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brass px-1 text-[0.625rem] font-semibold text-ink">
                {count}
              </span>
            ) : null}
          </Link>

          {user ? (
            <>
              <Link
                to="/profile"
                aria-label="Profile"
                className="rounded-sm border border-hairline px-2 py-1 text-xs text-muted transition-colors hover:border-brass hover:text-brass"
              >
                👤
              </Link>
              <button
              type="button"
              onClick={signOut}
              className="rounded-sm border border-hairline px-2.5 py-1 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
            >
              {t("signOut")}
            </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-sm bg-brass px-3 py-1.5 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-t border-hairline px-4 py-2 md:hidden" aria-label="Primary mobile">
        <NavLink to="/" className={linkCls}>{t("home")}</NavLink>
        <NavLink to="/collection" className={linkCls}>{t("collection")}</NavLink>
        <NavLink to="/guides" className={linkCls}>{t("guides")}</NavLink>
        <NavLink to="/contact" className={linkCls}>{t("contact")}</NavLink>
        {user ? <NavLink to="/loyalty" className={linkCls}>{t("loyalty")}</NavLink> : null}
        {isAdmin ? <NavLink to="/admin" className={linkCls}>{t("admin")}</NavLink> : null}
      </nav>
    </header>
  );
}
