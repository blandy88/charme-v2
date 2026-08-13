// Validate and update brand-location audience for each perfume
// Source: js/fragrance-api-service.js audience field
// Values: "unisex" (mixte), "men" (homme), "women" (femme)

// Normalize function for matching
function normalizeText(text) {
  return text.toString()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Audience labels mapping
const audienceLabels = {
  unisex: "Mixte",
  men: "Homme", 
  women: "Femme"
};

// Perfume name to audience mapping (validated from codebase)
// Keys are lowercase normalized for matching
const perfumeAudienceMap = {
  // Unisex (mixte) - 65
  "pacific chill": "unisex",
  "freedom musk": "unisex",
  "light blue": "unisex",
  "cedar chic": "unisex",
  "guidance 46": "unisex",
  "vanilla powder": "unisex",
  "rose amira": "unisex",
  "40 knots": "unisex",
  "fantasmagoria": "unisex",
  "supreme bouquet": "unisex",
  "rose star": "unisex",
  "oud voyager": "unisex",
  "assad elixir": "unisex",
  "santal royal": "unisex",
  "terroni": "unisex",
  "oud royal": "unisex",
  "narciso": "unisex",
  "by the fireplace": "unisex",
  "hudson valley": "unisex",
  "black orchid": "unisex",
  "aventus": "men",
  "sauvage": "men",
  "bleu de chanel": "men",
  "tobacco vanille": "unisex",
  "oud wood": "unisex",
  "lost cherry": "unisex",
  "y eau de parfum": "men",
  "acqua di gio profumo": "men",
  "the one edp": "men",
  "eros": "men",
  "ultra male": "men",
  "invictus": "men",
  "uomo born in roma": "men",
  "spicebomb extreme": "men",
  "explorer": "men",
  "man in black": "men",
  "homme intense": "men",
  "allure homme sport": "men",
  "armani code absolu": "men",
  "gentleman": "men",
  "wanted by night": "men",
  "k by dolce & gabbana": "men",
  "bad boy": "men",
  "libre": "women",
  "donna born in roma": "women",
  "green irish tweed": "men",
  "egoiste": "men",
  "a*men pure havane": "men",
  "declaration": "men",
  "la yuqawam": "men",
  "cedrat boise": "unisex",
  "reflection man": "men",
  "sedley": "unisex",
  "side effect": "unisex",
  "naxos": "unisex",
  "grand soire": "unisex",
  "balayage": "women",
  "valaya exclusive": "women",
  "1 million night": "men",
  "freedom musk matcha": "unisex",
  "torino21": "unisex",
  "kayali marshmallow": "women",
  "aqua allegoria florabloom forte": "women",
  "angel nova": "women",
  "acqua di gio elixir": "men",
  "ácican": "unisex",
  "saharian wind": "unisex",
  "sole patchouli": "unisex",
  "scirocco": "unisex",
  "bois impérial": "unisex",
  "stellar times": "unisex",
  "erba gold": "unisex",
  "purple accent": "unisex",
  "fleur de mandarin": "unisex",
  "jahwara oriental": "unisex",
  "doble blue jasmine": "women",
  "light blue summer vibes": "unisex",
  "patchouli ardent": "unisex",
  "mandarine basilic": "unisex",
  "bvlgari man rain essence": "men",
  "magic": "unisex",
  "sabah al waed": "unisex",
  "smoking hot": "unisex",
  "lamar noir": "unisex",
  "tobacco mandarin": "unisex",
  "alexandria ii": "unisex",
  "italica": "unisex",
  "mefisto": "unisex",
  "1888": "unisex",
  "tobacco honey": "unisex",
  "yes i am": "women",
  "jasmin noir": "women",
  "alien goddess": "women",
  "hypnotic poison": "women",
  "si passione": "women",
  "coco mademoiselle": "women",
  "lady million": "women",
  "crystal noir": "women",
  "scandal absolu": "women",
  "flora gorgeous jasmine": "women",
  "gucci guilty": "women",
  "amirat al arab": "women",
  "angelique noire": "unisex",
  "chloe by chloe": "women",
  "irresistible": "women",
  "guidance": "women",
  "insolence": "women",
  "envy me": "women",
  "chloe roses": "women",
  "devotion": "women",
  "lady million gold": "women",
  "musc noble": "unisex",
  "libre absolu platine": "women",
  "scandal": "women",
  "la vie est belle elixir": "women",
  "miss dior blooming bouquet": "women",
  "carmine": "women",
  "yara": "women",
  "nomade": "women",
  "burberry her": "women",
  "pure xs": "women",
  "dylan blue pour femme": "women",
  "yara moi": "women",
  
  // Additional perfumes from HTML sections
  "aventus absolu": "men",
  "hypnotic amber": "women",
  "golden oud": "unisex",
  "arabian oud": "unisex",
  "musk rose": "men",
  "tabac royal": "unisex",
  "mysterious oud": "unisex",
  "heavenly oud": "unisex",
  "luxury oud": "unisex",
  "charmed oud": "unisex",
  "emperor's oud": "unisex",
  "majestic oud": "unisex",
  "radiant oud": "unisex",
  "sensual oud": "unisex",
  "timeless oud": "unisex",
  "twilight oud": "unisex",
  "velvet oud": "unisex",
  "moonlight oud": "unisex",
  "midnight oud": "unisex",
  "sultan oud": "unisex",
  "regal oud": "unisex",
  "boss elixir": "men",
  "cool water": "men",
  "1 million gold": "men",
  "fahrenheit": "men",
  "cerruti 1881": "men",
  "ck one": "men",
  "a*men fantast": "unisex",
  "1 million": "men",
  "y intensely": "men",
  "y men elixir": "men",
  "boss intense": "men",
  "bleu electrique": "men",
  "pure xs": "women",
  "1 million elixir": "men",
  "club de nuit": "men",
  "stronger with you sandalwood": "men",
  "tuxedo": "men",
  "onemillion royale": "men",
  "y intensely": "men",
  "y menelixir": "men",
  "boss intense": "men",
  "bleu electrique": "men",
  "purexs": "women",
  "onemillionelixir": "men",
  "clubdenuit": "men",
  "strongerwithyousandalwood": "men",
  "pineapple": "unisex",
  "lightblueintense": "men",
  "sauvageeli": "men",
  "torrino21": "unisex",
  "lostcherry": "unisex",
  "edarchic": "unisex",
  "powerofyou": "unisex",
  "valentinapoudre": "women",
  "monparis": "unisex",
  "narciso": "unisex",
  "lhommeideal": "men"
};

// Function to update brand-location for a perfume section
function updatePerfumeAudience() {
  const brandLocations = document.querySelectorAll('.brand-location');
  
  brandLocations.forEach(el => {
    // Get the perfume name from the product header
    const productNameEl = el.closest('.product-header-row')?.querySelector('.product-name');
    if (!productNameEl) return;
    
    const productText = productNameEl.innerText.trim();
    if (!productText) return;
    
    const normalizedProduct = normalizeText(productText);
    
    // Try to match the perfume name to the audience map
    let audience = null;
    for (const [name, aud] of Object.entries(perfumeAudienceMap)) {
      const normalizedName = normalizeText(name);
      if (normalizedProduct.includes(normalizedName) || normalizedName.includes(normalizedProduct)) {
        audience = aud;
        break;
      }
    }
    
    // Also try exact match on the full product name
    if (!audience) {
      for (const [name, aud] of Object.entries(perfumeAudienceMap)) {
        if (productText.toLowerCase() === name.toLowerCase() || 
            productText.toLowerCase().includes(name.toLowerCase())) {
          audience = aud;
          break;
        }
      }
    }
    
    // Also try matching if the brand-location text is "PARIS" (default)
    if (!audience && el.innerText.trim() === "PARIS") {
      // Try matching by looking at nearby content or just set a default
      // For now, leave as PARIS if no match
    }
    
    if (audience) {
      const label = audienceLabels[audience] || audience;
      el.innerHTML = `${label} • Premium`;
      el.dataset.audience = audience;
    }
  });
}

// Run on page load
document.addEventListener('DOMContentLoaded', updatePerfumeAudience);
// Also run on hash change for SPA
window.addEventListener('hashchange', updatePerfumeAudience);

// Initial run (will be called by DOMContentLoaded)
updatePerfumeAudience();