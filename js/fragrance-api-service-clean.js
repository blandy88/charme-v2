/**
 * Fragrance API Service
 * Comprehensive fragrance database service with multiple data sources
 */

class FragranceAPIService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.apiEndpoints = {
      // Mock API endpoints - replace with actual services
      fragrantica: "https://api.fragrantica.com/v1",
      basenotes: "https://api.basenotes.com/v1",
      parfumo: "https://api.parfumo.com/v1",
    };

    // Comprehensive fragrance database with 500+ popular fragrances
    this.comprehensiveDatabase = this.initializeComprehensiveDatabase();
    this.ingredientDatabase = this.initializeIngredientDatabase();
  }

  /**
   * Search fragrances by ingredients
   * @param {Array} ingredients - Array of ingredient names
   * @returns {Promise<Array>} Array of matching fragrances
   */
  async searchByIngredients(ingredients) {
    try {
      // Try API first
      const apiResults = await this.fetchFromAPIs("ingredients", ingredients);
      if (apiResults && apiResults.length > 0) {
        return this.formatResults(apiResults);
      }
    } catch (error) {
      console.warn("API search failed, falling back to local database:", error);
    }

    // Fallback to comprehensive local database
    return this.searchLocalDatabase(ingredients);
  }

  /**
   * Search local comprehensive database
   * @param {Array} ingredients - Array of ingredient names
   * @returns {Array} Array of matching fragrances
   */
  searchLocalDatabase(ingredients) {
    const matches = {};

    ingredients.forEach((ingredient) => {
      const normalizedIngredient = ingredient.toLowerCase().trim();
      const fragrances = this.ingredientDatabase[normalizedIngredient] || [];

      fragrances.forEach((fragranceName) => {
        if (!matches[fragranceName]) {
          matches[fragranceName] = {
            count: 0,
            ingredients: [],
            profile: this.comprehensiveDatabase[fragranceName],
          };
        }
        matches[fragranceName].count++;
        matches[fragranceName].ingredients.push(ingredient);
      });
    });

    // Sort by match count and calculate percentages
    const sortedMatches = Object.entries(matches)
      .filter(([name, data]) => data.profile) // Only include fragrances with profiles
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([fragrance, data]) => ({
        fragrance,
        matchCount: data.count,
        matchedIngredients: data.ingredients,
        percentage: Math.round((data.count / ingredients.length) * 100),
        profile: data.profile,
      }));

    return sortedMatches;
  }

  /**
   * Get fragrance by name
   * @param {string} name - Fragrance name
   * @returns {Object|null} Fragrance profile
   */
  getFragranceByName(name) {
    return this.comprehensiveDatabase[name] || null;
  }

  /**
   * Get all fragrances containing a specific ingredient
   * @param {string} ingredient - Ingredient name
   * @returns {Array} Array of fragrance names
   */
  getFragrancesByIngredient(ingredient) {
    const normalizedIngredient = ingredient.toLowerCase().trim();
    return this.ingredientDatabase[normalizedIngredient] || [];
  }

  /**
   * Get random fragrances
   * @param {number} count - Number of fragrances to return
   * @returns {Array} Array of random fragrances
   */
  getRandomFragrances(count = 10) {
    const allFragrances = Object.keys(this.comprehensiveDatabase);
    const shuffled = allFragrances.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map((name) => ({
      fragrance: name,
      profile: this.comprehensiveDatabase[name],
    }));
  }

  /**
   * Search fragrances by brand
   * @param {string} brand - Brand name
   * @returns {Array} Array of fragrances from the brand
   */
  searchByBrand(brand) {
    return Object.entries(this.comprehensiveDatabase)
      .filter(([name, profile]) =>
        profile.brand.toLowerCase().includes(brand.toLowerCase()),
      )
      .map(([name, profile]) => ({
        fragrance: name,
        profile: profile,
      }));
  }

  /**
   * Search fragrances by family/category
   * @param {string} family - Fragrance family
   * @returns {Array} Array of fragrances from the family
   */
  searchByFamily(family) {
    return Object.entries(this.comprehensiveDatabase)
      .filter(
        ([name, profile]) =>
          profile.family &&
          profile.family.toLowerCase().includes(family.toLowerCase()),
      )
      .map(([name, profile]) => ({
        fragrance: name,
        profile: profile,
      }));
  }

  /**
   * Initialize comprehensive fragrance database
   * @returns {Object} Complete fragrance database
   */
  initializeComprehensiveDatabase() {
    return {
      // Parfums de Marly
      Layton: {
        brand: "Parfums de Marly",
        family: "Oriental Spicy",
        description:
          "A sophisticated blend of vanilla, sandalwood, and subtle spices.",
        ingredients: [
          "bergamot",
          "lavender",
          "geranium",
          "vanilla",
          "sandalwood",
          "amber",
        ],
        year: 2016,
        perfumer: "Hamid Merati-Kashani",
        image: "layton.png",
      },
      Haltane: {
        brand: "Parfums de Marly",
        family: "Oriental Gourmand",
        description: "Rich and creamy with notes of praline, vanilla, and oud.",
        ingredients: ["praline", "vanilla", "oud", "amber", "saffron"],
        year: 2021,
        perfumer: "Mathieu Nardin",
        image: "https://fimgs.net/mdimg/perfume/375x500.70776.jpg",
      },
      Pegasus: {
        brand: "Parfums de Marly",
        family: "Aromatic Gourmand",
        description:
          "A fresh and elegant fragrance with almond, heliotrope, and sandalwood.",
        ingredients: [
          "bergamot",
          "orange",
          "mandarin",
          "almond",
          "heliotrope",
          "lavender",
          "sandalwood",
          "musk",
        ],
        year: 2011,
        perfumer: "Quentin Bisch",
        image: "pegasus.png",
      },