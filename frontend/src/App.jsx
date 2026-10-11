import FaithfulSite from "./faithful/FaithfulSite.jsx";

/*
 * The React app IS the legacy site now: same document, same styles, same
 * scripts — React owns the root. Typed replacements for individual
 * subtrees land one at a time, each gated on visual parity.
 */
export default function App() {
  return <FaithfulSite />;
}
