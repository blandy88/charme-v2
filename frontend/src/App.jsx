import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import SiteNav from "./components/SiteNav.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import AuthModal from "./components/AuthModal.jsx";
import Home from "./routes/Home.jsx";
import Collection from "./routes/Collection.jsx";
import Product from "./routes/Product.jsx";
import Favourites from "./routes/Favourites.jsx";

/** Client-side navigation keeps the old scroll position without this. */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search]);
  return null;
}

function NotFound() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-24 text-center sm:px-6">
      <p className="meta">404</p>
      <h1 className="mt-2 font-display text-3xl text-cream">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        That page isn&apos;t part of the collection.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-sm border border-hairline px-4 py-2 text-xs text-cream transition-colors hover:border-brass hover:text-brass"
      >
        Back to home
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <ScrollToTop />
      <SiteNav />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/p/:slug" element={<Product />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <SiteFooter />
      <CartDrawer />
      <AuthModal />
    </div>
  );
}
