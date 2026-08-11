(function () {
  const basePath = "images/notes/";

  const aliases = {
    agarwood: "oud.png",
    "agarwood oud": "oud.png",
    aldehydes: "ambroxan.png",
    almond: "almond.png",
    "bitter almond": "almond.png",
    amber: "amber.png",
    ambergris: "amber.png",
    amberwood: "amberwood.png",
    "amber wood": "amberwood.png",
    ambrette: "Ambrette.png",
    ambroxan: "ambroxan.png",
    apple: "red-apple.png",
    "green apple": "greenapple.png",
    apricot: "peach.png",
    aquatic: "sea.png",
    ash: "ash.png",
    bamboo: "bamboo.png",
    banana: "banana.png",
    basil: "basil.png",
    bay: "bay-leaf.png",
    "bay leaf": "bay-leaf.png",
    "bay leaves": "bay-leaf.png",
    benzoin: "Benjoin.png",
    bergamot: "bergamot.png",
    birch: "birch.png",
    "birch tar": "birch-tar.png",
    "bitter orange": "Fleur d'oranger.png",
    "black currant": "cassis.png",
    "black cherry": "black-cherry.png",
    blackcurrant: "cassis.png",
    "black musk": "Musc.png",
    "black orchid": "black-orchid-note.png",
    "black pepper": "poivre.png",
    "black spices": "spices.png",
    "black tea": "Thé noir chinois.png",
    "black truffle": "black-truffle.png",
    "black vanilla": "vanilla.png",
    "blonde woods": "cedarwood.png",
    "blood orange": "Fleur d'oranger.png",
    "blue ebony": "guaiac-wood.png",
    "bourbon vanilla": "vanilla.png",
    "brown sugar": "caramel.png",
    "bulgarian rose": "rose.png",
    "burnt wood": "smoke.png",
    cacao: "cacao.png",
    caramel: "caramel.png",
    caraway: "caraway.png",
    cardamom: "cardamom.png",
    carnation: "jasmine.png",
    "carrot seeds": "Graines de Carotte.webp",
    cashmeran: "Musc.png",
    "cashmere wood": "cedarwood.png",
    cedar: "cedarwood.png",
    cedarwood: "cedarwood.png",
    cherry: "cherries.png",
    "cherry liqueur": "cherry-liqueur.png",
    "cherry blossom": "cherries.png",
    chestnut: "hazelnut.png",
    chocolate: "cacao.png",
    cinnamon: "cinnamon.png",
    citron: "lemon.png",
    "clary sage": "clary-sage.png",
    cloves: "cloves.png",
    cocoa: "cacao.png",
    coconut: "coconut.png",
    "coconut cream": "coconut.png",
    "coconut milk": "coconut.png",
    coffee: "coffee.png",
    cookies: "caramel.png",
    coriander: "Coriandre.png",
    "creme brulee": "caramel.png",
    "crème brûlée": "caramel.png",
    cumin: "cumin.png",
    custard: "vanilla.png",
    cypress: "cypress.png",
    cypriol: "vétiver.png",
    "dried fruits": "dried-fruits.png",
    "dry wood": "dry-wood.png",
    earth: "wet-earth.png",
    ebony: "guaiac-wood.png",
    "ebony wood": "guaiac-wood.png",
    elemi: "Résine oliban.png",
    eucalyptus: "mint.png",
    fig: "Figue.png",
    "fir resin": "fir-resin.png",
    flint: "silex.webp",
    "forest floor": "wet-earth.png",
    frankincense: "incense.png",
    freesia: "freesia.png",
    "french orris": "iris.png",
    gardenia: "gardenia.png",
    geranium: "géranium.webp",
    ginger: "ginger.png",
    grape: "plum.png",
    grapefruit: "grapefruit.png",
    "green accord": "greenapple.png",
    "green leaves": "greenapple.png",
    "green tea": "Thé noir chinois.png",
    "guaiac wood": "guaiac-wood.png",
    hazelnut: "hazelnut.png",
    hedione: "jasmine.png",
    heliotrope: "heliotrope.png",
    honey: "honey.png",
    honeysuckle: "honeysuckle.png",
    "horse chestnut": "hazelnut.png",
    "iced tea": "Thé noir chinois.png",
    incense: "incense.png",
    iris: "iris.png",
    "iso e super": "cedarwood.png",
    jasmine: "jasmine.png",
    "jasmine grandiflorum": "jasmine.png",
    "jasmine sambac": "jasmine-sambac.png",
    juniper: "juniper.png",
    "juniper berries": "juniper.png",
    labdanum: "labdanum.png",
    lavender: "lavender.png",
    leather: "leather.png",
    lemon: "lemon.png",
    "lemon verbena": "lemon.png",
    lily: "muguet.png",
    "lily of the valley": "muguet.png",
    lime: "lime.png",
    "linden blossom": "jasmine.png",
    lotus: "water-lily.png",
    "madagascar vanilla": "vanilla.png",
    magnolia: "magnolia.png",
    mahogany: "mahogany.png",
    mandarin: "mandarin.png",
    "mandarin orange": "mandarin.png",
    "maple wood": "cedarwood.png",
    marine: "sea.png",
    "marine accord": "marine-accord.png",
    melon: "melon.png",
    metallic: "silex.webp",
    "metallic notes": "silex.webp",
    mimosa: "mimosa.png",
    mineral: "silex.webp",
    mint: "mint.png",
    mushroom: "truffe.png",
    musk: "Musc.png",
    myrrh: "Résine oliban.png",
    "mysore sandalwood": "bois-de-santal.png",
    narcissus: "narcissus.png",
    neroli: "Fleur d'oranger.png",
    "night blooming jasmine": "jasmine.png",
    nutmeg: "Noix de muscade.png",
    oak: "oak.png",
    oakmoss: "oakmoss.png",
    olibanum: "Résine oliban.png",
    orange: "Fleur d'oranger.png",
    "orange blossom": "Fleur d'oranger.png",
    orchid: "orchid.png",
    oregano: "oregano.png",
    orris: "iris.png",
    oud: "oud.png",
    ozonic: "sea.png",
    patchouli: "patchouli.png",
    "patchouli leaf": "patchouli.png",
    peach: "peach.png",
    pear: "pear.png",
    pelargonium: "Pélargonium.png",
    peony: "rose.png",
    pepper: "poivre.png",
    peppermint: "mint.png",
    "peru balsam": "Benjoin.png",
    petitgrain: "petit-grain.png",
    "petit grain": "petit-grain.png",
    pimento: "poivre.png",
    pine: "pine.png",
    "pine wood": "pine-wood.png",
    pineapple: "pineapple.png",
    "pink pepper": "poivre-rose.png",
    "pipe tobacco": "tobacco.png",
    plum: "plum.png",
    pomelo: "grapefruit.png",
    praline: "caramel.png",
    rain: "sea.png",
    raspberry: "Raspberry.png",
    "red musk": "Musc.png",
    rose: "rose.png",
    rosemary: "Romarin.png",
    rosewood: "guaiac-wood.png",
    rum: "rum.png",
    saffron: "safran.png",
    sage: "sage.png",
    "sage leaf": "sage.png",
    salt: "salt.png",
    sandalwood: "bois-de-santal.png",
    "sea breeze": "sea.png",
    "sea notes": "sea.png",
    "sicilian citrus": "lemon.png",
    "sicilian lemon": "lemon.png",
    smoke: "smoke.png",
    "smoked wood": "smoke.png",
    spearmint: "mint.png",
    "sichuan pepper": "sichuan-pepper.png",
    "spice blend": "spice-blend.png",
    "spicy notes": "spice-blend.png",
    "star anise": "star-anise.png",
    stone: "silex.webp",
    storax: "Benjoin.png",
    strawberry: "strawberry.png",
    styrax: "Benjoin.png",
    suede: "leather.png",
    "sweet orange": "Fleur d'oranger.png",
    "synthetic musk": "Musc.png",
    tangerine: "tangerine.png",
    "tea leaves": "Thé noir chinois.png",
    thyme: "thyme.png",
    tobacco: "tobacco.png",
    "tobacco leaf": "tobacco-leaf.png",
    toffee: "caramel.png",
    "tolu balsam": "Benjoin.png",
    "tonka bean": "tonka.png",
    "tree moss": "oakmoss.png",
    tuberose: "tuberose.png",
    "turkish rose": "rose.png",
    vanilla: "vanilla.png",
    vetiver: "vétiver.png",
    violet: "violet.png",
    "violet leaf": "violet.png",
    "violet leaves": "violet.png",
    "virginia cedar": "virginia-cedar.png",
    walnut: "walnut.png",
    water: "sea.png",
    "water lily": "water-lily.png",
    "wet earth": "wet-earth.png",
    "white musk": "Musc.png",
    "white pepper": "poivre.png",
    "white tea": "Thé noir chinois.png",
    "white woods": "cedarwood.png",
    "woody notes": "cedarwood.png",
    "ylang ylang": "Ylang-Ylang.png",
    "ylang-ylang": "Ylang-Ylang.png",
    yuzu: "lemon.png",
  };

  Object.assign(aliases, {
    aldehyde: "ambroxan.png",
    "red apple": "red-apple.png",
    "granny smith apple": "greenapple.png",
    "orange flower": "Fleur d'oranger.png",
    "orange leaves": "Fleur d'oranger.png",
    clove: "cloves.png",
    tea: "Thé noir chinois.png",
    liqueur: "rum.png",
    "white lily": "muguet.png",
    lilac: "lavender.png",
    rhubarb: "red-apple.png",
    lychee: "Raspberry.png",
    blackberry: "Raspberry.png",
    "red berries": "Raspberry.png",
    pomegranate: "Raspberry.png",
    persimmon: "peach.png",
    "pine needles": "pine.png",
    "sea salt": "salt.png",
    tar: "smoke.png",
    "red spices": "spices.png",
    spices: "spices.png",
    "spice notes": "spice-blend.png",
    sugar: "caramel.png",
    "sugar cane": "caramel.png",
    marshmallow: "caramel.png",
    woods: "cedarwood.png",
    wood: "cedarwood.png",
    "woodsy notes": "cedarwood.png",
    "dark wood": "dry-wood.png",
    "red cedar": "virginia-cedar.png",
    moss: "oakmoss.png",
    opoponax: "Opoponax.webp",
    "white amber": "amber.png",
    cognac: "rum.png",
    gin: "rum.png",
    cannabis: "greenapple.png",
    "fig leaves": "Figue.png",
    "fig fruit": "Figue.png",
    "fig tree sap": "Figue.png",
    papyrus: "dry-wood.png",
    osmanthus: "jasmine.png",
    frangipani: "tuberose.png",
    hibiscus: "tuberose.png",
    daffodil: "narcissus.png",
    grass: "greenapple.png",
    clover: "greenapple.png",
    cucumber: "melon.png",
    verbena: "lemon.png",
    "ambrette seeds": "Ambrette.png",
    "exotic maninka": "plum.png",
    "blood mandarin": "mandarin.png",
    "water jasmine": "jasmine.png",
    "ginger lily": "ginger.png",
    "crisp amber": "amber.png",
    "natural tuberose": "tuberose.png",
    "rangoon creeper": "honeysuckle.png",
    mandora: "mandarin.png",
    "balsam fir": "fir-resin.png",
    chestnuts: "hazelnut.png",
    gianduja: "hazelnut.png",
    mirabelle: "plum.png",
    stephanotis: "jasmine.png",
    driftwood: "dry-wood.png",
    "white rose": "rose.png",
    "apricot blossom": "peach.png",
    "lemon wood": "lemon.png",
    "pink grapefruit": "grapefruit.png",
  });

  function normalizeNoteName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function imageFor(noteName) {
    const normalized = normalizeNoteName(noteName);
    const file = aliases[normalized];
    return file ? `${basePath}${file}` : `${basePath}amber.png`;
  }

  function makeImage(noteName, className = "note-real-image") {
    const img = document.createElement("img");
    img.className = className;
    img.src = imageFor(noteName);
    img.alt = noteName;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = `${basePath}amber.png`;
      }
    };
    return img;
  }

  function replaceIcon(iconElement, noteName) {
    if (!iconElement || iconElement.dataset.noteImageApplied === "1") return;
    iconElement.textContent = "";
    iconElement.appendChild(makeImage(noteName));
    iconElement.dataset.noteImageApplied = "1";
    iconElement.classList.add("note-image-icon");
  }

  function clearLegacyEmojiChildren(item) {
    item
      .querySelectorAll(
        [
          ".ingredient-icon",
          ".note-icon",
          "[class$='-note-icon']",
          "[class$='-crystal-emoji']",
          "[class$='-noir-emoji']",
          "[class$='-tag-emoji']",
          "[class$='-chip-emoji']",
          "[class$='-pill-emoji']",
          "[class$='-card-emoji']",
          "[class$='-leaf-emoji']",
          "[class$='-star-emoji']",
          "[class$='-petal-emoji']",
        ].join(","),
      )
      .forEach((node) => {
        if (node.querySelector("img.note-real-image")) return;
        node.textContent = "";
        node.classList.add("legacy-note-emoji-hidden");
        node.setAttribute("aria-hidden", "true");
      });
  }

  const noteCardSelectors = [
    ".note-item",
    "[class$='-note-item']",
    ".crystal-card",
    "[class$='-crystal-card']",
    "[class*='-noir-card']",
    "[class*='-heritage-tag']",
    ".chip",
    "[class$='-chip']",
    "[class*='-note-pill']",
    "[class*='-note-card']",
    "[class*='-ingredient-card']",
    "[class$='-leaf']",
    "[class$='-star-note']",
    "[class$='-petal']",
    "[class$='-petal-inner']",
    ".enhanced-ingredient-tag",
    ".ingredient-pill",
    ".selected-ingredient-pill",
    ".suggestion-item",
  ];
  const noteCardSelector = noteCardSelectors.join(",");

  function hydrateStaticNotes(root = document) {

    root.querySelectorAll(noteCardSelector).forEach((item) => {
      if (item.closest("#ingredientModal") && !item.closest("#ingredientModal.show")) return;
      const nameElement =
        item.querySelector(".note-name") ||
        item.querySelector("[class$='-note-name']") ||
        item.querySelector(".crystal-name") ||
        item.querySelector("[class$='-crystal-name']") ||
        item.querySelector("[class$='-noir-name']") ||
        item.querySelector("[class$='-tag-name']") ||
        item.querySelector("[class$='-chip-name']") ||
        item.querySelector("[class$='-pill-name']") ||
        item.querySelector("[class$='-card-name']") ||
        item.querySelector("[class$='-leaf-name']") ||
        item.querySelector("[class$='-star-name']") ||
        item.querySelector("[class$='-petal-name']") ||
        item.querySelector(".ingredient-name");
      const iconElement =
        item.querySelector(".note-icon") ||
        item.querySelector("[class$='-note-icon']") ||
        item.querySelector("[class$='-noir-emoji']") ||
        item.querySelector("[class$='-tag-emoji']") ||
        item.querySelector("[class$='-chip-emoji']") ||
        item.querySelector("[class$='-pill-emoji']") ||
        item.querySelector("[class$='-card-emoji']") ||
        item.querySelector("[class$='-leaf-emoji']") ||
        item.querySelector("[class$='-star-emoji']") ||
        item.querySelector("[class$='-petal-emoji']") ||
        item.querySelector(".ingredient-icon");
      const directText = [...item.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent.trim())
        .filter(Boolean)
        .join(" ");
      const name = item.dataset.ingredient || nameElement?.textContent?.trim() || directText;
      if (!name) return;
      if (iconElement) {
        replaceIcon(iconElement, name);
        clearLegacyEmojiChildren(item);
        return;
      }
      if (nameElement && !item.querySelector(".note-image-icon")) {
        const wrapper = document.createElement("span");
        wrapper.className = "ingredient-icon note-image-icon generated-note-image";
        wrapper.appendChild(makeImage(name));
        nameElement.insertAdjacentElement("beforebegin", wrapper);
        clearLegacyEmojiChildren(item);
        return;
      }
      if (!item.querySelector(".note-image-icon")) {
        const wrapper = document.createElement("span");
        wrapper.className = "ingredient-icon note-image-icon generated-note-image";
        wrapper.appendChild(makeImage(name));
        item.insertAdjacentElement("afterbegin", wrapper);
        clearLegacyEmojiChildren(item);
      }
    });
  }

  window.NoteImageResolver = {
    imageFor,
    makeImage,
    hydrateStaticNotes,
    replaceIcon,
    normalizeNoteName,
    scheduleHydration,
  };

  function scheduleHydration(root = document) {
    const run = () => hydrateStaticNotes(root);
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 1200 });
    } else {
      setTimeout(run, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scheduleHydration());
  } else {
    scheduleHydration();
  }

  let pendingRoots = new Set();
  let hydrationScheduled = false;
  function queueHydration(root) {
    pendingRoots.add(root);
    if (hydrationScheduled) return;
    hydrationScheduled = true;
    requestAnimationFrame(() => {
      hydrationScheduled = false;
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      roots.forEach((root) => hydrateStaticNotes(root));
    });
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(noteCardSelector) || node.querySelector?.(noteCardSelector)) {
          queueHydration(node);
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

(function () {
  const sectionCorrections = [
    { id: "pacificchill", imageClass: "pacificchill-image", brand: "Louis Vuitton", product: "Pacific Chill", accent: "#8fd3ff" },
    { id: "umoextradose", imageClass: "umoextradose-image", brand: "Valentino", product: "Uomo Extradose", image: "valentino-uomo.png", accent: "#c9a17a" },
    { id: "donnaextradose", imageClass: "donnaextradose-image", brand: "Valentino", product: "Donna Extradose", image: "valentino-donna.png", accent: "#d8a4b8" },
    { id: "edarchic", imageClass: "edarchic-image", brand: "Carolina Herrera", product: "Cedar Chic", accent: "#d6c59c" },
    { id: "labelleparadise", imageClass: "labelleparadise-image", brand: "Jean Paul Gaultier", product: "La Belle Paradise Garden", accent: "#8ccf9a" },
    { id: "phantominred", imageClass: "phantominred-image", brand: "Rabanne", product: "Phantom in Red", accent: "#d35a4b" },
    { id: "stellaritimes", imageClass: "stellaritimes-image", brand: "Louis Vuitton", product: "Stellar Times", accent: "#f1cf73" },
    { id: "elves", imageClass: "elves-image", brand: "Louis Vuitton", product: "eLVes", accent: "#b9a7ff" },
    { id: "roseamira", imageClass: "roseamira-image", brand: "Guerlain", product: "Rose Amira", accent: "#d48ca4" },
    { id: "powerofyou", imageClass: "powerofyou-image", brand: "Giorgio Armani", product: "Power of You", accent: "#a93d56" },
    { id: "supremebouquet", imageClass: "supremebouquet-image", brand: "Yves Saint Laurent", product: "Suprême Bouquet", accent: "#d7c07a" },
    { id: "guiltyelixirfemme", imageClass: "guiltyelixirfemme-image", brand: "Gucci", product: "Guilty Elixir Femme", image: "gucci-guilty.png", accent: "#8b68c9" },
    { id: "lessablesroses", imageClass: "lessablesroses-image", brand: "Louis Vuitton", product: "Les Sables Roses", accent: "#cf7b95" },
    { id: "hudsonvalley", imageClass: "hudsonvalley-image", brand: "Gissah", product: "Hudson Valley", accent: "#8ab47a" },
    { id: "cristalnoir", imageClass: "cristalnoir-image", brand: "Versace", product: "Crystal Noir", accent: "#9b8ec7" },
  ];

  let themeSyncScheduled = false;

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createFallbackBottleImage(brand, product, accent = "#c9a94e") {
    const safeBrand = escapeXml(brand || "Charme");
    const safeProduct = escapeXml(product || "Fragrance");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#080808" />
            <stop offset="1" stop-color="#1e1712" />
          </linearGradient>
          <linearGradient id="bottle" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="${accent}" stop-opacity="0.98" />
            <stop offset="1" stop-color="#fff6dd" stop-opacity="0.62" />
          </linearGradient>
        </defs>
        <rect width="420" height="560" rx="34" fill="url(#bg)" />
        <circle cx="210" cy="170" r="136" fill="${accent}" opacity="0.16" />
        <rect x="164" y="92" width="92" height="38" rx="12" fill="${accent}" opacity="0.88" />
        <rect x="126" y="130" width="168" height="268" rx="34" fill="#101010" stroke="${accent}" stroke-width="4" />
        <rect x="146" y="154" width="128" height="198" rx="22" fill="url(#bottle)" opacity="0.9" />
        <text x="210" y="430" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#f5efdf">${safeBrand}</text>
        <text x="210" y="466" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#cfb36b">${safeProduct}</text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
  }

  function findSectionRoot(id) {
    return document.getElementById(id) || document.querySelector(`.${id}-section`);
  }

  function setText(root, selector, value) {
    if (!root || !value) return;
    root.querySelectorAll(selector).forEach((node) => {
      if (node.textContent !== value) node.textContent = value;
    });
  }

  function sectionImageSource(config) {
    return config.image || createFallbackBottleImage(config.brand, config.product, config.accent);
  }

  function applySectionCorrection(config) {
    const root = findSectionRoot(config.id);
    if (!root) return false;

    setText(root, ".brand-name", config.brand);
    setText(root, ".product-name", config.product);
    root.setAttribute("data-fragrance", config.product);

    const image = root.querySelector(`.${config.imageClass}`) || root.querySelector("img");
    if (image) {
      const nextSrc = sectionImageSource(config);
      if (image.getAttribute("src") !== nextSrc) image.setAttribute("src", nextSrc);
      image.setAttribute("alt", `${config.product} bottle`);
      image.removeAttribute("srcset");
      image.loading = image.loading || "lazy";
      image.decoding = "async";
    }

    return true;
  }

  function applyHomepageFragranceCorrections() {
    sectionCorrections.forEach(applySectionCorrection);
  }

  function parseRgb(color) {
    const match = String(color || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return null;
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  }

  function themeFromColor(color) {
    const rgb = parseRgb(color);
    if (!rgb) return null;
    const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    if (luminance < 115) return "dark";
    if (rgb.r >= rgb.g && rgb.g >= rgb.b && rgb.r - rgb.b >= 8) return "cream";
    return "light";
  }

  function applyBodyTheme(theme) {
    if (!theme || !document.body) return;
    document.body.classList.remove("theme-dark", "theme-cream", "theme-light");
    document.body.classList.add(`theme-${theme}`);
    if (window.themeManager?.applyTheme) {
      window.themeManager.currentTheme = theme;
      window.themeManager.lastAppliedTheme = null;
      window.themeManager.applyTheme(theme);
    }
  }

  function computedSectionColor(root, config) {
    const candidates = [
      root.querySelector(`.${config.id}-main-container`),
      root.querySelector(`.${config.id}-theme`),
      root.querySelector(".perfume-top-row"),
      root,
      root.parentElement,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const color = window.getComputedStyle(candidate).backgroundColor;
      if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
        return color;
      }
    }
    return null;
  }

  function activeLateSection() {
    const viewportAnchor = window.innerHeight * 0.34;
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    sectionCorrections.forEach((config) => {
      const root = findSectionRoot(config.id);
      if (!root) return;
      const rect = root.getBoundingClientRect();
      if (rect.bottom < window.innerHeight * 0.18) return;
      if (rect.top > window.innerHeight * 0.82) return;
      const distance = Math.abs(rect.top - viewportAnchor);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { root, config };
      }
    });

    return best;
  }

  function syncLateSectionThemeNow() {
    themeSyncScheduled = false;
    const active = activeLateSection();
    if (!active) return;
    const color = computedSectionColor(active.root, active.config);
    if (!color) return;
    document.body.style.backgroundColor = color;
    applyBodyTheme(themeFromColor(color));
  }

  function scheduleLateSectionThemeSync() {
    if (themeSyncScheduled) return;
    themeSyncScheduled = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(syncLateSectionThemeNow);
    });
  }

  function bootCorrections() {
    applyHomepageFragranceCorrections();
    scheduleLateSectionThemeSync();
    setTimeout(applyHomepageFragranceCorrections, 400);
    setTimeout(applyHomepageFragranceCorrections, 1400);
    setTimeout(scheduleLateSectionThemeSync, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCorrections);
  } else {
    bootCorrections();
  }

  window.addEventListener("load", bootCorrections, { passive: true });
  window.addEventListener("scroll", scheduleLateSectionThemeSync, { passive: true });
  window.addEventListener("resize", scheduleLateSectionThemeSync, { passive: true });

  const homepageObserver = new MutationObserver(() => {
    applyHomepageFragranceCorrections();
    scheduleLateSectionThemeSync();
  });

  if (document.documentElement) {
    homepageObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
