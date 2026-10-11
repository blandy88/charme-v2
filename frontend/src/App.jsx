import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Collection from "./pages/Collection.jsx";
import Contact from "./pages/Contact.jsx";
import Auth from "./pages/Auth.jsx";
import Cart from "./pages/Cart.jsx";
import Loyalty from "./pages/Loyalty.jsx";
import Guides from "./pages/Guides.jsx";
import News from "./pages/News.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/loyalty" element={<Loyalty />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/news" element={<News />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
