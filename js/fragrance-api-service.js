/**
 * Fragrance API Service
 * Runtime database intentionally limited to the fragrances rendered in index.html.
 */

class FragranceAPIService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000;
    this.apiEndpoints = {
      fragrantica: "https://api.fragrantica.com/v1",
      basenotes: "https://api.basenotes.com/v1",
      parfumo: "https://api.parfumo.com/v1",
    };

    this.comprehensiveDatabase = this.initializeComprehensiveDatabase();
    this.ingredientDatabase = this.initializeIngredientDatabase();
  }

  initializeComprehensiveDatabase() {
    const fragrances = [
      this.make("Layton", "Parfums de Marly", "Oriental Spicy", "unisex", "layton.png", ["apple", "lavender", "bergamot", "vanilla", "sandalwood", "cardamom"], 2016, "Hamid Merati-Kashani", "A sophisticated blend of crisp fruit, aromatic lavender, creamy vanilla, and polished woods."),
      this.make("Haltane", "Parfums de Marly", "Oriental Gourmand", "men", "haltane.png", ["clary sage", "lavender", "bergamot", "saffron", "praline", "oud", "cedar"], 2021, "Mathieu Nardin", "A modern oud gourmand with aromatic herbs, saffron, praline, and refined woods."),
      this.make("Pegasus", "Parfums de Marly", "Aromatic Gourmand", "men", "pegasus.png", ["bergamot", "almond", "heliotrope", "lavender", "sandalwood", "vanilla"], 2011, "Quentin Bisch", "A polished almond and heliotrope signature over lavender, sandalwood, and vanilla."),
      this.make("Greenly", "Parfums de Marly", "Woody Aromatic", "unisex", "GREENLEY.png", ["green apple", "bergamot", "mandarin", "cedar", "musk", "oakmoss"], 2022, "Hamid Merati-Kashani", "A bright green fragrance with crisp apple, sparkling citrus, cedar, and clean musk."),
      this.make("Baccarat Rouge 540", "Maison Francis Kurkdjian", "Amber Floral", "unisex", "baccarat-rouge-540.png", ["saffron", "jasmine", "amberwood", "cedar", "fir resin", "ambergris"], 2015, "Francis Kurkdjian", "A luminous amber floral built around saffron, jasmine, amberwood, and cedar."),
      this.make("Black Orchid", "Tom Ford", "Oriental Floral", "unisex", "black-orchid.png", ["black orchid", "black truffle", "ylang ylang", "bergamot", "patchouli", "vanilla"], 2006, "Tom Ford", "A dark floral gourmand with black orchid, truffle, patchouli, and vanilla."),
      this.make("Aventus", "Creed", "Woody Fruity", "men", "aventus.png", ["pineapple", "bergamot", "black currant", "birch", "musk", "oakmoss"], 2010, "Olivier Creed", "A smoky fruity chypre with pineapple, bergamot, birch, musk, and oakmoss."),
      this.make("Sauvage", "Dior", "Aromatic Fougere", "men", "sauvage.png", ["bergamot", "pepper", "lavender", "ambroxan", "cedar", "patchouli"], 2015, "Francois Demachy", "A fresh spicy aromatic with bright bergamot, pepper, ambroxan, and woods."),
      this.make("Bleu de Chanel", "Chanel", "Woody Aromatic", "men", "bleudechanel.png", ["grapefruit", "lemon", "mint", "ginger", "incense", "sandalwood"], 2010, "Jacques Polge", "A refined blue woody aromatic with citrus, ginger, incense, and sandalwood."),
      this.make("Tobacco Vanille", "Tom Ford", "Oriental Spicy", "unisex", "tobaccovanille.png", ["tobacco", "vanilla", "cacao", "tonka bean", "dried fruits", "spices"], 2007, "Tom Ford", "A plush tobacco vanilla fragrance with cacao, tonka bean, dried fruits, and spice."),
      this.make("Oud Wood", "Tom Ford", "Oriental Woody", "unisex", "oudwood.png", ["oud", "rosewood", "cardamom", "sandalwood", "vetiver", "amber"], 2007, "Tom Ford", "A smooth woody amber centered on oud, rosewood, cardamom, and sandalwood."),
      this.make("La Nuit de L'Homme", "Yves Saint Laurent", "Woody Spicy", "men", "lanuit.png", ["cardamom", "bergamot", "lavender", "cedar", "vetiver", "coumarin"], 2009, "Anne Flipo, Pierre Wargnye & Dominique Ropion", "A seductive woody spicy scent with cardamom, lavender, cedar, and vetiver."),
      this.make("Lost Cherry", "Tom Ford", "Amber Floral", "unisex", "lostcherry.png", ["black cherry", "almond", "cherry liqueur", "rose", "tonka bean", "vanilla"], 2018, "Louise Turner", "A boozy cherry amber with almond, rose, tonka bean, and vanilla."),
      this.make("Y Eau de Parfum", "Yves Saint Laurent", "Woody Aromatic", "men", "ysl-y-edp.png", ["apple", "ginger", "bergamot", "sage", "juniper berries", "cedar"], 2018, "Dominique Ropion", "A crisp woody aromatic with apple, ginger, sage, juniper, and cedar."),
      this.make("Acqua di Gio Profumo", "Giorgio Armani", "Aquatic Aromatic", "men", "acqua-di-gio-profumo.png", ["sea notes", "bergamot", "sage", "rosemary", "incense", "patchouli"], 2015, "Alberto Morillas", "A deep aquatic aromatic with sea notes, herbs, incense, and patchouli."),
      this.make("The One EDP", "Dolce & Gabbana", "Oriental Spicy", "men", "dg-the-one-edp.png", ["grapefruit", "coriander", "basil", "cardamom", "tobacco", "amber"], 2015, "Dolce & Gabbana", "A warm tobacco amber with grapefruit, basil, cardamom, and coriander."),
      this.make("Eros", "Versace", "Oriental Fougere", "men", "versace-eros.png", ["mint", "green apple", "lemon", "tonka bean", "vanilla", "cedar"], 2012, "Aurelien Guichard", "A bold sweet aromatic with mint, green apple, tonka bean, vanilla, and cedar."),
      this.make("Ultra Male", "Jean Paul Gaultier", "Amber Fougere", "men", "jpg-ultra-male.png", ["pear", "lavender", "mint", "cinnamon", "vanilla", "amber"], 2015, "Francis Kurkdjian", "A sweet aromatic fougere with pear, lavender, mint, cinnamon, and vanilla."),
      this.make("Invictus", "Paco Rabanne", "Woody Aquatic", "men", "paco-rabanne-invictus.png", ["grapefruit", "sea notes", "bay leaf", "jasmine", "guaiac wood", "ambergris"], 2013, "Veronique Nyberg, Anne Flipo, Olivier Polge & Dominique Ropion", "A fresh aquatic masculine with grapefruit, sea notes, bay leaf, woods, and ambergris."),
      this.make("Uomo Born in Roma", "Valentino", "Woody Spicy", "men", "valentino-uomo.png", ["mineral", "violet leaf", "ginger", "sage", "vetiver", "woody notes"], 2019, "Antoine Maisondieu & Guillaume Flavigny", "A modern mineral woody scent with violet leaf, ginger, sage, and vetiver."),
      this.make("Spicebomb Extreme", "Viktor & Rolf", "Oriental Spicy", "men", "spicebomb-extreme.png", ["lavender", "caraway", "black pepper", "tobacco", "vanilla", "cumin"], 2015, "Carlos Benaim", "A dense spicy tobacco vanilla with lavender, pepper, caraway, and cumin."),
      this.make("Explorer", "Montblanc", "Woody Aromatic", "men", "montblanc-explorer.png", ["bergamot", "pink pepper", "clary sage", "vetiver", "leather", "patchouli"], 2019, "Jordi Fernandez, Antoine Maisondieu & Olivier Pescheux", "A bright woody aromatic with bergamot, clary sage, vetiver, leather, and patchouli."),
      this.make("Man in Black", "Bvlgari", "Oriental Spicy", "men", "bvlgari-man-in-black.png", ["rum", "spices", "leather", "tuberose", "tonka bean", "benzoin"], 2014, "Alberto Morillas", "A rich rum leather fragrance with spices, tuberose, tonka bean, and benzoin."),
      this.make("Homme Intense", "Dior", "Woody Floral Musk", "men", "dior-homme-intense.png", ["lavender", "iris", "ambrette", "pear", "cedar", "vetiver"], 2011, "Francois Demachy", "A refined iris woody musk with lavender, ambrette, pear, cedar, and vetiver."),
      this.make("Allure Homme Sport", "Chanel", "Woody Fresh Spicy", "men", "chanel-allure-sport.png", ["orange", "sea notes", "aldehydes", "pepper", "tonka bean", "white musk"], 2004, "Jacques Polge", "A fresh sporty woody scent with orange, sea notes, pepper, tonka bean, and musk."),
      this.make("Tuscan Leather", "Tom Ford", "Leather", "unisex", "tom-ford-tuscan-leather.png", ["raspberry", "saffron", "thyme", "jasmine", "leather", "amber"], 2007, "Tom Ford", "A smoky leather fragrance with raspberry, saffron, thyme, jasmine, and amber."),
      this.make("Armani Code Absolu", "Giorgio Armani", "Oriental Spicy", "men", "armani-code-absolu.png", ["green mandarin", "apple", "orange blossom", "nutmeg", "tonka bean", "vanilla"], 2019, "Antoine Maisondieu", "A warm oriental spicy scent with mandarin, apple, orange blossom, tonka, and vanilla."),
      this.make("L'Homme Ideal", "Guerlain", "Woody Aromatic", "men", "guerlain-lhomme-ideal.png", ["citrus", "rosemary", "almond", "tonka bean", "leather", "cedar"], 2014, "Thierry Wasser", "A polished almond woody aromatic with citrus, rosemary, leather, tonka, and cedar."),
      this.make("Terre d'Hermes", "Hermes", "Woody Spicy", "men", "terre-dhermes.png", ["orange", "grapefruit", "pepper", "pelargonium", "vetiver", "cedar"], 2006, "Jean-Claude Ellena", "An earthy woody citrus with orange, grapefruit, pepper, vetiver, and cedar."),
      this.make("Gentleman", "Givenchy", "Woody Aromatic", "men", "givenchy-gentleman.png", ["pear", "cardamom", "lavender", "iris", "leather", "patchouli"], 2017, "Olivier Cresp & Nathalie Lorson", "A modern gentlemanly aromatic with pear, cardamom, iris, leather, and patchouli."),
      this.make("Wanted by Night", "Azzaro", "Woody Spicy", "men", "azzaro-most-wanted.png", ["cinnamon", "mandarin", "lavender", "incense", "tobacco", "cedar"], 2018, "Michel Girard & Quentin Bisch", "A warm woody spicy fragrance with cinnamon, tobacco, incense, and cedar."),
      this.make("K by Dolce & Gabbana", "Dolce & Gabbana", "Woody Aromatic", "men", "k-by-dg.png", ["citrus", "blood orange", "juniper", "clary sage", "cedar", "vetiver"], 2019, "Daphne Bugey & Nathalie Lorson", "A crisp woody aromatic with citrus, juniper, clary sage, cedar, and vetiver."),
      this.make("L'Eau d'Issey Pour Homme", "Issey Miyake", "Aquatic Woody", "men", "issey-miyake-pour-homme.png", ["yuzu", "lemon", "bergamot", "nutmeg", "water lily", "tobacco"], 1994, "Jacques Cavallier", "A transparent aquatic woody fragrance with yuzu, citrus, nutmeg, water lily, and tobacco."),
      this.make("Bad Boy", "Carolina Herrera", "Oriental Spicy", "men", "carolina-herrera-bad-boy.png", ["white pepper", "bergamot", "sage", "cedar", "tonka bean", "cacao"], 2019, "Quentin Bisch & Louise Turner", "A bold oriental spicy fragrance with pepper, sage, cedar, tonka bean, and cacao."),
      this.make("Libre", "Yves Saint Laurent", "Amber Fougere", "women", "ysl-libre.png", ["lavender", "mandarin", "orange blossom", "jasmine", "vanilla", "musk"], 2019, "Anne Flipo & Carlos Benaim", "A feminine amber fougere with lavender, orange blossom, jasmine, vanilla, and musk."),
      this.make("By the Fireplace", "Maison Margiela", "Woody Oriental", "unisex", "margiela-fireplace.png", ["cloves", "pink pepper", "chestnut", "guaiac wood", "vanilla", "cashmeran"], 2015, "Marie Salamagne", "A smoky chestnut vanilla fragrance with clove, pepper, guaiac wood, and cashmeran."),
      this.make("Luna Rossa Carbon", "Prada", "Aromatic Fougere", "men", "prada-luna-rossa-carbon.png", ["bergamot", "pepper", "lavender", "metallic notes", "ambroxan", "patchouli"], 2017, "Daniela Andrier", "A mineral aromatic fougere with bergamot, pepper, lavender, ambroxan, and patchouli."),
      this.make("Hero", "Burberry", "Woody Spicy", "men", "burberry-hero.png", ["bergamot", "juniper", "black pepper", "cedar", "pine", "benzoin"], 2021, "Aurelien Guichard", "A modern woody spicy fragrance with bergamot, juniper, pepper, cedar, and pine."),
      this.make("Bleu Noir", "Narciso Rodriguez", "Woody Spicy", "men", "narciso-bleu-noir.png", ["cardamom", "nutmeg", "musk", "cedar", "vetiver", "amber"], 2015, "Sonia Constant", "A clean woody spicy musk with cardamom, nutmeg, cedar, vetiver, and amber."),
      this.make("Eternity for Men", "Calvin Klein", "Aromatic Fougere", "men", "ck-eternity.png", ["lavender", "mandarin", "bergamot", "basil", "jasmine", "sandalwood"], 1990, "Carlos Benaim", "A classic aromatic fougere with lavender, citrus, basil, jasmine, and sandalwood."),
      this.make("Guilty Pour Homme", "Gucci", "Woody Aromatic", "men", "gucci-guilty.png", ["lavender", "lemon", "orange blossom", "cedar", "patchouli", "vanilla"], 2011, "Jacques Huclier", "A smooth woody aromatic with lavender, lemon, orange blossom, cedar, and patchouli."),
      this.make("Donna Born in Roma", "Valentino", "Amber Floral", "women", "valentino-donna.png", ["black currant", "bergamot", "jasmine", "vanilla", "cashmeran", "guaiac wood"], 2019, "Amandine Clerc-Marie & Honorine Blanc", "A modern amber floral with black currant, jasmine, vanilla, and cashmeran."),
      this.make("Green Irish Tweed", "Creed", "Woody Floral Musk", "men", "creed-green-irish-tweed.png", ["lemon verbena", "iris", "violet leaf", "ambergris", "sandalwood", "musk"], 1985, "Olivier Creed", "A classic green woody floral musk with lemon verbena, iris, violet leaf, and sandalwood."),
      this.make("Egoiste", "Chanel", "Woody Spicy", "men", "chanel-egoiste.png", ["mandarin", "coriander", "rose", "cinnamon", "sandalwood", "vanilla"], 1990, "Jacques Polge", "A sophisticated woody spicy fragrance with mandarin, coriander, rose, sandalwood, and vanilla."),
      this.make("A*Men Pure Havane", "Mugler", "Oriental Tobacco", "men", "mugler-pure-havane.png", ["tobacco", "honey", "vanilla", "cacao", "patchouli", "amber"], 2011, "Jacques Huclier", "A honeyed tobacco gourmand with vanilla, cacao, patchouli, and amber."),
      this.make("Declaration", "Cartier", "Woody Floral Musk", "men", "cartier-declaration.png", ["birch", "bergamot", "coriander", "cardamom", "cedar", "oakmoss"], 1998, "Jean-Claude Ellena", "A refined woody aromatic with birch, bergamot, coriander, cardamom, and cedar."),
      this.make("La Yuqawam", "Rasasi", "Leather", "men", "rasasi-la-yuqawam.png", ["raspberry", "saffron", "thyme", "jasmine", "leather", "amber"], 2012, "Rasasi", "A rich leather fragrance with raspberry, saffron, thyme, jasmine, and amber."),
      this.make("Cedrat Boise", "Mancera", "Citrus Woody", "unisex", "mancera-cedrat-boise.png", ["sicilian citrus", "black currant", "jasmine", "patchouli", "leather", "cedar"], 2011, "Pierre Montale", "A bright citrus woody scent with black currant, jasmine, patchouli, leather, and cedar."),
      this.make("Reflection Man", "Amouage", "Woody Floral Musk", "men", "amouage-reflection-man.png", ["rosemary", "pink pepper", "neroli", "jasmine", "sandalwood", "vetiver"], 2007, "Lucas Sieuzac", "An elegant floral woody musk with rosemary, neroli, jasmine, sandalwood, and vetiver."),
      this.make("Sedley", "Parfums de Marly", "Woody Aromatic", "unisex", "pdm-sedley.png", ["bergamot", "spearmint", "water", "lavender", "geranium", "sandalwood"], 2019, "Olivier Cresp & Hamid Merati-Kashani", "A clean aromatic fresh scent with bergamot, spearmint, lavender, geranium, and sandalwood."),
      this.make("Side Effect", "Initio", "Amber", "unisex", "initio-side-effect.png", ["rum", "vanilla", "tobacco", "cinnamon", "saffron", "sandalwood"], 2016, "Initio", "A dense amber scent with rum, vanilla, tobacco, cinnamon, saffron, and sandalwood."),
      this.make("Naxos", "Xerjoff", "Citrus Gourmand", "unisex", "xerjoff-naxos.png", ["bergamot", "lemon", "lavender", "honey", "cinnamon", "tobacco"], 2015, "Xerjoff", "A honeyed citrus tobacco fragrance with lavender, cinnamon, and warm gourmand depth."),
      this.make("Grand Soir", "Maison Francis Kurkdjian", "Amber Floral", "unisex", "mfk-grand-soir.png", ["amber", "benzoin", "labdanum", "vanilla", "tonka bean", "incense"], 2016, "Francis Kurkdjian", "A glowing amber fragrance with benzoin, labdanum, vanilla, tonka bean, and incense."),
      this.make("Balayage", "Sospiro", "Oriental Floral", "women", "balayage.png", ["peach", "bergamot", "pink pepper", "tuberose", "jasmine", "rose", "sandalwood", "vanilla", "musk"], 2014, "Chris Maurice", "A warm golden oriental floral with peach, tuberose, jasmine, and sandalwood."),
      this.make("Valaya Exclusive", "Parfums de Marly", "Amber Floral", "women", "valaya-exclusive.png", ["orange blossom", "pear", "aldehydes", "white musk", "neroli", "cashmeran", "cedarwood", "vanilla"], 2023, "Quentin Bisch", "An ethereal amber floral with orange blossom, pear, cashmeran, and vanilla."),
      this.make("1 Million Night", "Paco Rabanne", "Oriental Spicy", "men", "1-million-night.png", ["cinnamon", "cardamom", "blood orange", "leather", "rose", "incense", "amber", "tonka bean", "oud"], 2023, "Christophe Raynaud", "A dark oriental spicy fragrance with cinnamon, leather, rose, and amber."),
      this.make("Freedom Musk Matcha", "Kayali", "Fresh Gourmand", "unisex", "freedom-musk-matcha.png", ["matcha", "bergamot", "green tea", "lily of the valley", "musk", "vanilla", "white woods", "ambroxan"], 2024, "Gabriela Sabatini", "A zen-inspired fresh gourmand with matcha, green tea, musk, and vanilla."),
      this.make("Torino21", "Xerjoff", "Citrus Aromatic", "unisex", "xerjoff-torrino-21.png", ["lemon", "mint", "basil", "lavender", "thyme", "rosemary", "musk", "cedar", "amber"], 2021, "Chris Maurice", "A bright citrus aromatic with lemon, mint, basil, herbs, and cedar."),
      this.make("Kayali Marshmallow", "Kayali", "Gourmand Floral", "women", "kayali-marshmallow.png", ["marshmallow", "strawberry", "aldehydes", "peony", "heliotrope", "vanilla", "musk", "tonka bean"], 2024, "Gabriela Sabatini", "A sweet gourmand floral with marshmallow, strawberry, peony, and vanilla."),
      this.make("Aqua Allegoria Florabloom Forte", "Guerlain", "Floral", "women", "aqua-allegoria-florabloom.png", ["rose", "peony", "violet", "jasmine", "iris", "musk", "cedar", "white amber"], 2023, "Thierry Wasser", "A radiant floral with rose, peony, violet, jasmine, and musk."),
      this.make("Angel Nova", "Mugler", "Amber Fruity", "women", "angel-nova.png", ["raspberry", "bergamot", "pink pepper", "jasmine", "rose", "benzoin", "vanilla", "akigalawood"], 2020, "Alienor Massenet & Quentin Bisch", "A vibrant amber fruity with raspberry, jasmine, benzoin, and akigalawood."),
      this.make("Acqua di Gio Elixir", "Giorgio Armani", "Woody Aquatic", "men", "aqua-di-gio-elixir.png", ["bergamot", "marine accord", "green mandarin", "lavender", "rosemary", "sage", "patchouli", "amber", "cedar"], 2024, "Alberto Morillas", "A deep woody aquatic with bergamot, marine accord, lavender, patchouli, and amber."),
    ];

    return Object.fromEntries(fragrances.map((fragrance) => [fragrance.name, fragrance]));
  }

  make(name, brand, family, audience, image, ingredients, year, perfumer, description) {
    return {
      name,
      brand,
      family,
      audience,
      description,
      ingredients,
      year,
      perfumer,
      image,
      concentration: "EDP",
      sizes: ["50ml", "100ml"],
      available: true,
    };
  }

  normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  async searchByIngredients(ingredients) {
    return this.searchLocalDatabase(ingredients);
  }

  searchLocalDatabase(ingredients) {
    const normalizedIngredients = (ingredients || []).map((ingredient) => this.normalize(ingredient)).filter(Boolean);
    const matches = [];

    Object.entries(this.comprehensiveDatabase).forEach(([fragranceName, profile]) => {
      const profileIngredients = (profile.ingredients || []).map((ingredient) => this.normalize(ingredient));
      const matchedIngredients = normalizedIngredients.filter((ingredient) =>
        profileIngredients.some((profileIngredient) => profileIngredient.includes(ingredient) || ingredient.includes(profileIngredient)),
      );
      if (!matchedIngredients.length) return;
      matches.push({
        fragrance: fragranceName,
        matchCount: matchedIngredients.length,
        matchedIngredients,
        percentage: Math.round((matchedIngredients.length / Math.max(1, normalizedIngredients.length)) * 100),
        profile,
      });
    });

    return matches.sort((a, b) => b.matchCount - a.matchCount || a.fragrance.localeCompare(b.fragrance));
  }

  getFragranceByName(name) {
    const exact = this.comprehensiveDatabase[name];
    if (exact) return exact;
    const normalized = this.normalize(name);
    const found = Object.entries(this.comprehensiveDatabase).find(([fragranceName, profile]) =>
      this.normalize(fragranceName) === normalized || this.normalize(`${profile.brand} ${fragranceName}`) === normalized,
    );
    return found ? found[1] : null;
  }

  getFragrancesByIngredient(ingredient) {
    const normalizedIngredient = this.normalize(ingredient);
    return this.ingredientDatabase[normalizedIngredient] || [];
  }

  getRandomFragrances(count = 10) {
    return Object.keys(this.comprehensiveDatabase)
      .sort(() => 0.5 - Math.random())
      .slice(0, count)
      .map((name) => ({ fragrance: name, profile: this.comprehensiveDatabase[name] }));
  }

  searchByBrand(brand) {
    const normalizedBrand = this.normalize(brand);
    return Object.entries(this.comprehensiveDatabase)
      .filter(([, profile]) => this.normalize(profile.brand).includes(normalizedBrand))
      .map(([name, profile]) => ({ fragrance: name, profile }));
  }

  searchByFamily(family) {
    const normalizedFamily = this.normalize(family);
    return Object.entries(this.comprehensiveDatabase)
      .filter(([, profile]) => this.normalize(profile.family).includes(normalizedFamily))
      .map(([name, profile]) => ({ fragrance: name, profile }));
  }

  initializeIngredientDatabase() {
    const db = {};
    Object.entries(this.comprehensiveDatabase).forEach(([fragrance, profile]) => {
      (profile.ingredients || []).forEach((ingredient) => {
        const normalizedIngredient = this.normalize(ingredient);
        if (!db[normalizedIngredient]) db[normalizedIngredient] = [];
        db[normalizedIngredient].push(fragrance);
      });
    });
    return db;
  }

  async fetchFromAPIs() {
    return null;
  }

  formatResults(apiResults) {
    return (apiResults || []).map((result) => ({
      fragrance: result.name || result.title,
      profile: {
        brand: result.brand || "Unknown",
        description: result.description || "",
        ingredients: result.notes || result.ingredients || [],
        year: result.year || result.launch_year,
        perfumer: result.perfumer || result.nose,
        image: result.image || "default.jpg",
      },
      matchCount: result.match_count || 0,
      matchedIngredients: result.matched_ingredients || [],
      percentage: result.match_percentage || 0,
    }));
  }

  getAllIngredients() {
    return Object.keys(this.ingredientDatabase).sort();
  }

  getPopularIngredients(limit = 50) {
    return Object.entries(this.ingredientDatabase)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, limit)
      .map(([ingredient]) => ingredient);
  }

  getIngredientSuggestions(query, limit = 10) {
    const normalizedQuery = this.normalize(query);
    if (normalizedQuery.length < 2) return [];
    const allIngredients = this.getAllIngredients();
    return [
      ...allIngredients.filter((ingredient) => ingredient.startsWith(normalizedQuery)),
      ...allIngredients.filter((ingredient) => !ingredient.startsWith(normalizedQuery) && ingredient.includes(normalizedQuery)),
    ].slice(0, limit);
  }

  getStatistics() {
    const fragrances = Object.values(this.comprehensiveDatabase);
    const brandCounts = {};
    const familyCounts = {};
    fragrances.forEach((profile) => {
      brandCounts[profile.brand] = (brandCounts[profile.brand] || 0) + 1;
      familyCounts[profile.family] = (familyCounts[profile.family] || 0) + 1;
    });
    return {
      totalFragrances: fragrances.length,
      totalIngredients: Object.keys(this.ingredientDatabase).length,
      brands: Object.keys(brandCounts).length,
      families: Object.keys(familyCounts).length,
      topBrands: Object.entries(brandCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([brand, count]) => ({ brand, count })),
      topFamilies: Object.entries(familyCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([family, count]) => ({ family, count })),
    };
  }

  searchByText(query) {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return [];
    return Object.entries(this.comprehensiveDatabase)
      .map(([name, profile]) => {
        const haystack = this.normalize(`${name} ${profile.brand} ${profile.family} ${profile.description} ${(profile.ingredients || []).join(" ")}`);
        return { fragrance: name, profile, score: haystack.includes(normalizedQuery) ? 1 : 0 };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => a.fragrance.localeCompare(b.fragrance));
  }

  getSimilarFragrances(fragranceName, limit = 5) {
    const reference = this.getFragranceByName(fragranceName);
    if (!reference) return [];
    const referenceNotes = new Set((reference.ingredients || []).map((ingredient) => this.normalize(ingredient)));
    return Object.entries(this.comprehensiveDatabase)
      .filter(([name]) => name !== fragranceName)
      .map(([name, profile]) => {
        const sharedNotes = (profile.ingredients || []).filter((ingredient) => referenceNotes.has(this.normalize(ingredient)));
        const sameFamily = profile.family === reference.family ? 1 : 0;
        return { fragrance: name, profile, similarity: sharedNotes.length + sameFamily, sharedIngredients: sharedNotes };
      })
      .filter((result) => result.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity || a.fragrance.localeCompare(b.fragrance))
      .slice(0, limit);
  }

  exportDatabase() {
    return {
      fragrances: this.comprehensiveDatabase,
      ingredients: this.ingredientDatabase,
      statistics: this.getStatistics(),
      exportDate: new Date().toISOString(),
    };
  }

  validateFragrance(fragrance) {
    const errors = [];
    const warnings = [];
    if (!fragrance.brand) errors.push("Missing brand");
    if (!fragrance.ingredients || fragrance.ingredients.length === 0) errors.push("Missing ingredients");
    if (!fragrance.description) warnings.push("Missing description");
    if (!fragrance.family) warnings.push("Missing fragrance family");
    if (!fragrance.year) warnings.push("Missing launch year");
    if (!fragrance.perfumer) warnings.push("Missing perfumer");
    return { valid: errors.length === 0, errors, warnings };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = FragranceAPIService;
} else if (typeof window !== "undefined") {
  window.FragranceAPIService = FragranceAPIService;
}
