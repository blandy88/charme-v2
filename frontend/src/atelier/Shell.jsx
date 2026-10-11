import { Suspense, useState } from "react";
import { BrowserRouter, Link, NavLink, Route } from "react-router-dom";
import { Compass, Heart, Moon, Newspaper, ShoppingBag, Sun, User } from "lucide-react";
import { AuthProvider, useAuth } from "../contexts/AuthContext.jsx";
import { CartProvider, useCart } from "../contexts/CartContext.jsx";
import { FavoritesProvider, useFavorites } from "../contexts/FavoritesContext.jsx";
import { NewsProvider, useNews } from "../contexts/NewsContext.jsx";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import FaithfulSite from "../faithful/FaithfulSite.jsx";
import Home from "./pages/Home.jsx";
import GlobalSearch from "./GlobalSearch.jsx";
import Discover from "./Discover.jsx";
import Overlays from "./Overlays.jsx";
import SmoothScroll from "./SmoothScroll.jsx";
import RouteTransition from "./RouteTransition.jsx";
import "./tokens.css";
import "./shell.css";
import "./chrome.css";

/* The catalogue is ~550KB of editorial data. Loading it here would put it on
   the critical path for the homepage, so the catalogue routes are split out and
   fetched on intent -- pointer, keyboard focus, or the start of a tab change
   (see RouteTransition's `preload`). The account pages ride along: they share
   one stylesheet and none of them is ever the landing page. */
const loadCollection = () => import("./pages/Collection.jsx");
const loadProduct = () => import("./pages/Product.jsx");
/* Favourites is split for the same reason: it resolves every saved id against
   the catalogue to decide which half of the page a card belongs to. */
const loadFavorites = () => import("./pages/Favorites.jsx");
const loadAuth = () => import("./pages/Auth.jsx");
const loadCart = () => import("./pages/Cart.jsx");
const loadProfile = () => import("./pages/Profile.jsx");
const loadNews = () => import("./pages/News.jsx");
const loadAdmin = () => import("./pages/Admin.jsx");

/* Everything reachable by a plain path that is worth fetching ahead of time. */
const SPLIT_ROUTES = {
  "/collection": loadCollection,
  "/favorites": loadFavorites,
  "/auth": loadAuth,
  "/cart": loadCart,
  "/profile": loadProfile,
  "/news": loadNews,
  "/admin": loadAdmin,
};

const chunks = new Map();

/* Fetch (once) the chunk a loader names, and remember the module when it lands.
   `import()` already caches, but we need the resolved module itself for below. */
function loadChunk(loader) {
  let entry = chunks.get(loader);
  if (!entry) {
    entry = { mod: null };
    entry.promise = loader().then((mod) => {
      entry.mod = mod;
      return mod;
    });
    chunks.set(loader, entry);
  }
  return entry.promise;
}

/* A split route, but NOT React.lazy.

   lazy() suspends on the first render that touches it -- always. Its payload
   only flips to "resolved" inside that very render, so even a module sitting in
   memory still costs one Suspense round-trip. On a tab change that means the
   incoming beat animates against the placeholder, and the real page pops in a
   beat later: the tab "refreshes". Here the transition awaits loadChunk()
   first, so by the time this renders the module is in hand and the real
   component goes straight up, no suspense. A direct visit (no transition to
   wait on) still suspends, which is what the placeholder is for. */
function routed(loader) {
  return function Routed(props) {
    const entry = chunks.get(loader);
    if (entry && entry.mod) {
      const Page = entry.mod.default;
      return <Page {...props} />;
    }
    throw loadChunk(loader);
  };
}

const Collection = routed(loadCollection);
const Product = routed(loadProduct);
const Favorites = routed(loadFavorites);
const Auth = routed(loadAuth);
const Cart = routed(loadCart);
const Profile = routed(loadProfile);
const News = routed(loadNews);
const Admin = routed(loadAdmin);

/* Which split chunk a pathname needs, if any. The catalogue data is shared by
   both catalogue routes and by Favourites, so warming one warms the heavy half
   of the others. */
function preloadRoute(pathname) {
  if (pathname.startsWith("/collection/")) return loadChunk(loadProduct);
  const loader = SPLIT_ROUTES[pathname];
  return loader ? loadChunk(loader) : null;
}

/* Called on pointer/focus intent: the chunk is usually in hand by the time the
   click lands, so the transition never has to wait. */
const warm = (loader) => () => {
  loadChunk(loader);
};

const warmCatalogue = warm(loadCollection);
const warmFavorites = warm(loadFavorites);
const warmCart = warm(loadCart);
const warmProfile = warm(loadProfile);
const warmNews = warm(loadNews);
const warmAdmin = warm(loadAdmin);
const warmAuth = warm(loadAuth);

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

function Nav({ onDiscover }) {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const { theme, toggle } = useTheme();
  const { unread: newsUnread } = useNews();
  const { lang, setLang, t } = useI18n();
  const [menu, setMenu] = useState(false);

  const link = ({ isActive }) => (isActive ? "active" : undefined);

  return (
    <header className="nav">
      <div className="wrap nav-row">
        <Link to="/" className="wordmark">Charme</Link>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end className={link}>{t("home")}</NavLink>
          <NavLink to="/collection" className={link} onMouseEnter={warmCatalogue} onPointerDown={warmCatalogue} onFocus={warmCatalogue}>{t("collection")}</NavLink>
          <NavLink to="/guides" className={link}>{t("guides")}</NavLink>
          <NavLink to="/contact" className={link}>{t("contact")}</NavLink>
          {user ? <NavLink to="/loyalty" className={link}>{t("loyalty")}</NavLink> : null}
        </nav>
        <div className="nav-tools">
          <GlobalSearch />
          <button
            type="button"
            onClick={() => onDiscover("profiler")}
            aria-label={t("discover")}
            title={t("discover")}
            className="tool-btn pressable"
          >
            <Compass size={15} />
          </button>
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
          <Link
            to="/news"
            aria-label={t("news")}
            className="tool-btn pressable"
            onMouseEnter={warmNews}
            onPointerDown={warmNews}
            onFocus={warmNews}
          >
            <Newspaper size={15} />{newsUnread > 0 ? <span className="count">{newsUnread}</span> : null}
          </Link>
          <Link
            to="/favorites"
            aria-label={t("favorites")}
            className="tool-btn pressable"
            onMouseEnter={warmFavorites}
            onPointerDown={warmFavorites}
            onFocus={warmFavorites}
          >
            <Heart size={15} />{favCount > 0 ? <span className="count">{favCount}</span> : null}
          </Link>
          <Link
            to="/cart"
            aria-label={t("cart")}
            className="tool-btn pressable"
            onMouseEnter={warmCart}
            onPointerDown={warmCart}
            onFocus={warmCart}
          >
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
                onMouseEnter={warmProfile}
                onFocus={warmProfile}
              >
                <User size={15} />
              </button>
              {menu ? (
                <div className="account-pop panel">
                  <Link to="/profile" onClick={() => setMenu(false)}>{t("profile")}</Link>
                  <Link to="/favorites" onClick={() => setMenu(false)}>{t("favorites")}</Link>
                  <Link to="/cart" onClick={() => setMenu(false)}>{t("cart")}</Link>
                  {isAdmin ? (
                    <>
                      <p className="account-pop-label">{t("adminTools")}</p>
                      <Link
                        to="/admin"
                        className="admin-entry"
                        onClick={() => setMenu(false)}
                        onMouseEnter={warmAdmin}
                        onPointerDown={warmAdmin}
                        onFocus={warmAdmin}
                      >
                        {t("admin")}
                      </Link>
                    </>
                  ) : null}
                  <button type="button" onClick={() => { setMenu(false); signOut(); }}>{t("signOut")}</button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              to="/auth"
              className="signin-btn pressable"
              onMouseEnter={warmAuth}
              onPointerDown={warmAuth}
              onFocus={warmAuth}
            >
              {t("signIn")}
            </Link>
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
  const [discover, setDiscover] = useState(null);
  return (
    <BrowserRouter basename="/app">
      <SmoothScroll />
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <NewsProvider>
              <Nav onDiscover={setDiscover} />
              <RouteTransition preload={preloadRoute}>
                <Route path="/" element={<Home />} />
                <Route path="/faithful" element={<FaithfulSite />} />
                <Route path="/collection" element={deferred(<Collection />)} />
                <Route path="/collection/:id" element={deferred(<Product />)} />
                <Route path="/auth" element={deferred(<Auth />)} />
                <Route path="/cart" element={deferred(<Cart />)} />
                <Route path="/profile" element={deferred(<Profile />)} />
                <Route path="/favorites" element={deferred(<Favorites />)} />
                <Route path="/guides" element={<Placeholder title={t("guides")} />} />
                <Route path="/contact" element={<Placeholder title={t("contact")} />} />
                <Route path="/news" element={deferred(<News />)} />
                <Route path="/loyalty" element={<Placeholder title={t("loyalty")} />} />
                <Route path="/admin" element={deferred(<Admin />)} />
                <Route path="*" element={<Home />} />
              </RouteTransition>
              <Footer />
              <Overlays />
              {discover ? <Discover initialTab={discover} onClose={() => setDiscover(null)} /> : null}
              </NewsProvider>
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
