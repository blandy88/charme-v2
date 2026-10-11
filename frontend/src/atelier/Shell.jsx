import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Link, NavLink, Route } from "react-router-dom";
import { Moon, Newspaper, ShoppingBag, Sun, User } from "lucide-react";
import { AuthProvider, useAuth } from "../contexts/AuthContext.jsx";
import { CartProvider, useCart } from "../contexts/CartContext.jsx";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import FaithfulSite from "../faithful/FaithfulSite.jsx";
import Home from "./pages/Home.jsx";
import SmoothScroll from "./SmoothScroll.jsx";
import RouteTransition from "./RouteTransition.jsx";
import "./tokens.css";
import "./shell.css";

/* The catalogue is ~550KB of editorial data. Loading it here would put it on
   the critical path for the homepage, so both catalogue routes are split out
   and fetched on intent -- pointer or keyboard focus on the way in. */
const loadCollection = () => import("./pages/Collection.jsx");
const loadProduct = () => import("./pages/Product.jsx");
const Collection = lazy(loadCollection);
const Product = lazy(loadProduct);

/* Product also needs the shared catalogue chunk, so either one warms both. */
const warmCatalogue = () => {
  loadCollection();
  loadProduct();
};

function RouteFallback() {
  return (
    <main className="wrap collection">
      <div className="coll-empty">Chargement…</div>
    </main>
  );
}

/* RouteTransition renders <Routes>, so Suspense has to sit inside each route's
   element rather than around the switch. */
const deferred = (node) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>;

function Nav() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [menu, setMenu] = useState(false);

  const link = ({ isActive }) => (isActive ? "active" : undefined);

  return (
    <header className="nav">
      <div className="wrap nav-row">
        <Link to="/" className="wordmark">Charme</Link>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end className={link}>{t("home")}</NavLink>
          <NavLink to="/collection" className={link} onMouseEnter={warmCatalogue} onFocus={warmCatalogue}>{t("collection")}</NavLink>
          <NavLink to="/guides" className={link}>{t("guides")}</NavLink>
          <NavLink to="/contact" className={link}>{t("contact")}</NavLink>
          {user ? <NavLink to="/loyalty" className={link}>{t("loyalty")}</NavLink> : null}
          {isAdmin ? <NavLink to="/admin" className={link}>{t("admin")}</NavLink> : null}
        </nav>
        <div className="nav-tools">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
            className="lang-select"
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <button type="button" onClick={toggle} aria-label="Toggle theme" className="tool-btn pressable">
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <Link to="/news" aria-label={t("news")} className="tool-btn pressable"><Newspaper size={15} /></Link>
          <Link to="/cart" aria-label={t("cart")} className="tool-btn pressable">
            <ShoppingBag size={15} />{count > 0 ? <span className="count">{count}</span> : null}
          </Link>
          {user ? (
            <div className="account-menu">
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-label={t("profile")}
                className="tool-btn pressable"
              >
                <User size={15} />
              </button>
              {menu ? (
                <div className="account-pop panel">
                  <Link to="/profile" onClick={() => setMenu(false)}>{t("profile")}</Link>
                  <Link to="/favorites" onClick={() => setMenu(false)}>{t("favorites")}</Link>
                  <Link to="/cart" onClick={() => setMenu(false)}>{t("cart")}</Link>
                  <button type="button" onClick={() => { setMenu(false); signOut(); }}>{t("signOut")}</button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link to="/auth" className="signin-btn pressable">{t("signIn")}</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-brand">Charme</p>
          <p className="eyebrow" style={{ marginTop: "0.5rem" }}>Parfumerie · Kélibia</p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-2)", fontSize: "var(--step-0)" }}>{t("footerTag")}</p>
        </div>
        <nav aria-label="Footer">
          <p className="eyebrow">{t("footerExplore")}</p>
          <ul>
            <li><Link to="/collection">{t("collection")}</Link></li>
            <li><Link to="/guides">{t("guides")}</Link></li>
            <li><Link to="/news">{t("news")}</Link></li>
            <li><Link to="/loyalty">{t("loyalty")}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="eyebrow">{t("footerVisit")}</p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-2)", lineHeight: 1.7 }}>
            Kélibia, Tunisia<br />
            <a href="tel:+21654786930" style={{ color: "var(--accent)" }}>54 786 930</a>
          </p>
        </div>
      </div>
      <div className="footer-base">
        <div className="wrap">© {new Date().getFullYear()} Parfumerie Charme</div>
      </div>
    </footer>
  );
}

function Placeholder({ title }) {
  return (
    <main className="wrap section">
      <p className="eyebrow">Charme</p>
      <h1 style={{ fontSize: "var(--step-4)", marginTop: "0.5rem" }}>{title}</h1>
      <div className="notice" style={{ marginTop: "1.5rem" }}>Coming soon in the new design.</div>
    </main>
  );
}

export default function Shell() {
  const { t } = useI18n();
  return (
    <BrowserRouter basename="/app">
      <SmoothScroll />
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <Nav />
            <RouteTransition>
              <Route path="/" element={<Home />} />
              <Route path="/faithful" element={<FaithfulSite />} />
              <Route path="/collection" element={deferred(<Collection />)} />
              <Route path="/collection/:id" element={deferred(<Product />)} />
              <Route path="/guides" element={<Placeholder title={t("guides")} />} />
              <Route path="/contact" element={<Placeholder title={t("contact")} />} />
              <Route path="/news" element={<Placeholder title={t("news")} />} />
              <Route path="/auth" element={<Placeholder title={t("signIn")} />} />
              <Route path="/cart" element={<Placeholder title={t("cart")} />} />
              <Route path="/profile" element={<Placeholder title={t("profile")} />} />
              <Route path="/favorites" element={<Placeholder title={t("favorites")} />} />
              <Route path="/loyalty" element={<Placeholder title={t("loyalty")} />} />
              <Route path="/admin" element={<Placeholder title={t("admin")} />} />
              <Route path="*" element={<Home />} />
            </RouteTransition>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
