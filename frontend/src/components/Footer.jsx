import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg text-cream">Charme</p>
          <p className="meta mt-2">Parfumerie · Kélibia</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            A curated boutique of niche and designer fragrances.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="meta">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/collection" className="transition-colors hover:text-brass">Collection</Link></li>
            <li><Link to="/guides" className="transition-colors hover:text-brass">Guides</Link></li>
            <li><Link to="/contact" className="transition-colors hover:text-brass">Contact</Link></li>
            <li><Link to="/loyalty" className="transition-colors hover:text-brass">Loyalty</Link></li>
          </ul>
        </nav>
        <div>
          <p className="meta">Visit</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Kélibia, Tunisia<br />
            <a href="tel:+21654786930" className="transition-colors hover:text-brass">54 786 930</a>
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href="https://wa.me/21654786930"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-hairline px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-brass hover:text-brass"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-hairline">
        <p className="mx-auto max-w-[1400px] px-4 py-4 text-xs text-faint sm:px-6">
          © {new Date().getFullYear()} Parfumerie Charme
        </p>
      </div>
    </footer>
  );
}
