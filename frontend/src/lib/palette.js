/**
 * Deterministic artwork for the ~95% of the catalogue with no photo.
 *
 * A hash of the slug picks the hue, so a given fragrance always renders the
 * same tile across reloads and devices — no randomness, no hydration mismatch.
 * The olfactory family biases the hue so the wall of cards reads as a
 * curated gradient rather than confetti.
 */

const FAMILY_RULES = [
  [/oud|leather|tobacco|smoke|incense|labdanum/i, 26],
  [/amber|vanilla|gourmand|tonka|caramel|praline|honey/i, 40],
  [/woody|sandal|cedar|vetiver|patchouli|oak|guaiac/i, 24],
  [/spic|pepper|cardamom|cinnamon|saffron|clove|ginger/i, 12],
  [/citrus|bergamot|lemon|grapefruit|mandarin|neroli|petitgrain/i, 52],
  [/aquatic|marine|ozonic|sea|water/i, 190],
  [/fresh|green|mint|grass|leaf|fig|tea/i, 150],
  [/fruity|peach|apple|berry|plum|cherry|pear|mango/i, 4],
  [/musk|powdery|iris|orris|skin|cashmeran/i, 268],
  [/aromatic|lavender|herbal|fougere|sage|rosemary|basil/i, 110],
  [/floral|rose|jasmine|peony|tuberose|lily|magnolia|orange blossom/i, 334],
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function baseHue(family, slug) {
  for (const [re, hue] of FAMILY_RULES) {
    if (re.test(family || "")) return hue;
  }
  return 30; // unclassified: warm amber default
}

/**
 * Returns a CSS background + a readable accent for one fragrance.
 * Kept deliberately low-contrast: the tile is a backdrop for type, not a swatch.
 */
export function tileStyle(fragrance) {
  const h = hash(fragrance.slug || fragrance.name || "");
  const hue = (baseHue(fragrance.family, fragrance.slug) + (h % 14) - 7 + 360) % 360;
  const drift = (h >> 8) % 12; // secondary hue offset
  const hue2 = (hue + drift + 360) % 360;

  return {
    backgroundImage: [
      `radial-gradient(115% 90% at 18% 4%, hsl(${hue} 62% 26% / 0.95) 0%, transparent 58%)`,
      `radial-gradient(90% 80% at 92% 96%, hsl(${hue2} 48% 20% / 0.9) 0%, transparent 62%)`,
      `linear-gradient(168deg, hsl(${hue} 30% 13%) 0%, hsl(${hue2} 26% 8%) 100%)`,
    ].join(", "),
    accent: `hsl(${hue} 58% 68%)`,
  };
}

/** Two-letter monogram for the tile, e.g. "Parfums de Marly" -> "PM". */
export function monogram(name) {
  const words = String(name || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
