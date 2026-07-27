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
