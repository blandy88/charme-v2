// Validate and update brand-location audience for each perfume
// Source: js/fragrance-api-service.js audience field
// Values: "unisex" (mixte), "men" (homme), "women" (femme)

const audienceLabels = {
  unisex: "Mixte",
  men: "Homme", 
  women: "Femme"
};

// Perfume name to audience mapping (validated from codebase)
// This covers the most common/featured perfumes in the HTML
const perfumeAudienceMap = {
  // Unisex (mixte)
  "Pacific Chill": "unisex",
  "Freedom Musk": "unisex", 
  "Light Blue": "unisex",
  "Cedar Chic": "unisex",
  "Guidance 46": "unisex",
  "Vanilla Powder": "unisex",
  "Rose Amira": "unisex",
  "40 Knots": "unisex",
  "Fantasmagoria": "unisex",
  "Supreme Bouquet": "unisex",
  "Rose Star": "unisex",
  "Oud Voyager": "unisex",
  "Assad Elixir": "unisex",
  "Santal Royal": "unisex",
  "Terroni": "unisex",
  "Oud Royal": "unisex",
  "Narciso": "unisex",
  "By the Fireplace": "unisex",
  "Hudson Valley": "unisex",
  "Black Orchid": "unisex",
  "Aventus": "men",
  "Sauvage": "men",
  "Bleu de Chanel": "men",
  "Tobacco Vanille": "unisex",
  "Oud Wood": "unisex",
  "Lost Cherry": "unisex",
  "Y Eau de Parfum": "men",
  "Acqua di Gio Profumo": "men",
  "The One EDP": "men",
  "Eros": "men",
  "Ultra Male": "men",
  "Invictus": "men",
  "Uomo Born in Roma": "men",
  "Spicebomb Extreme": "men",
  "Explorer": "men",
  "Man in Black": "men",
  "Homme Intense": "men",
  "Allure Homme Sport": "men",
  "Armani Code Absolu": "men",
  "Gentleman": "men",
  "Wanted by Night": "men",
  "K by Dolce & Gabbana": "men",
  "Bad Boy": "men",
  "Libre": "women",
  "Donna Born in Roma": "women",
  "Green Irish Tweed": "men",
  "Egoiste": "men",
  "A*Men Pure Havane": "men",
  "Declaration": "men",
  "La Yuqawam": "men",
  "Cedrat Boise": "unisex",
  "Reflection Man": "men",
  "Sedley": "unisex",
  "Side Effect": "unisex",
  "Naxos": "unisex",
  "Grand Soir": "unisex",
  "Balayage": "women",
  "Valaya Exclusive": "women",
  "1 Million Night": "men",
  "Freedom Musk Matcha": "unisex",
  "Torino21": "unisex",
  "Kayali Marshmallow": "women",
  "Aqua Allegoria Florabloom Forte": "women",
  "Angel Nova": "women",
  "Acqua di Gio Elixir": "men",
  "Dolce Blue Jasmine": "women",
  "Dylan Blue Pour Femme": "women",
  "Yara Moi": "women",
  
  // Additional perfumes found in HTML sections
  "Aventus Absolu": "men",
  "Hypnotic Amber": "women", 
  "Golden Oud": "unisex",
  "Arabian Oud": "unisex",
  "Musk Rose": "men",
  "Tabac Royal": "unisex",
  "Mysterious Oud": "unisex",
  "Heavenly Oud": "unisex",
  "Luxury Oud": "unisex",
  "Charmed Oud": "unisex",
  "Emperor's Oud": "unisex",
  "Majestic Oud": "unisex",
  "Radiant Oud": "unisex",
  "Sensual Oud": "unisex",
  "Timeless Oud": "unisex",
  "Twilight Oud": "unisex",
  "Velvet Oud": "unisex",
  "Moonlight Oud": "unisex",
  "Midnight Oud": "unisex",
  "Sultan Oud": "unisex",
  "Regal Oud": "unisex",
  "Boss Elixir": "men",
  "Cool Water": "men",
  "1 Million Gold": "men",
  "Fahrenheit": "men",
  "Cerruti 1881": "men",
  "CK One": "men",
  "A*Men Fantasm": "unisex",
  "1 Million": "men",
  "Y Intensely": "men",
  "Y Men Elixir": "men",
  "Boss Intense": "men",
  "Bleu Electrique": "men",
  "Pure XS": "women",
  "1 Million Elixir": "men",
  "Club de Nuit": "men",
  "Stronger With You Sandalwood": "men",
  "Tuxedo": "men",
  "Cerruti 1881": "men",
  "A*Men Fantasm": "unisex",
  "1 Million": "men",
  "Y Intensely": "men",
  "Y Men Elixir": "men",
  "Boss Intense": "men",
  "Bleu Electrique": "men",
  "Pure XS": "women",
  "1 Million Elixir": "men",
  "Club de Nuit": "men",
  "Stronger With You Sandalwood": "men",
  "Tuxedo": "men",
  "Onemillion Royale": "men",
  "Y Intensely": "men",
  "Y Menelixir": "men",
  "Boss Intense": "men",
  "Bleuelectrique": "men",
  "Purexs": "women",
  "Onemillionelixir": "men",
  "Clubdenuit": "men",
  "Strongerwithyousandalwood": "men",
  "Pineapple": "unisex",
  "Lightblueintense": "men",
  "Sauvageeli": "men",
  "Torrino21": "unisex",
  "Lostcherry": "unisex",
  "Edarchic": "unisex",
  "Powerofyou": "unisex",
  "Valentinapoudre": "women",
  "Monparis": "unisex",
  "Narciso": "unisex",
  "Lhommeideal": "men"
};

// Function to update brand-location for a perfume section
function updatePerfumeAudience(perfumeName, audience) {
  const label = audienceLabels[audience] || audience;
  
  // Find all brand-location elements
  const brandLocations = document.querySelectorAll('.brand-location');
  
  brandLocations.forEach(el => {
    // Check if this is the right perfume section
    const productNameEl = el.closest('.product-header-row')?.querySelector('.product-name');
    if (productNameEl) {
      const productText = productNameEl.innerText.trim() || productNameEl.textContent.trim();
      
      // Match by perfume name (exact or contains)
      if (productText.includes(perfumeName) || 
          productText.toLowerCase().includes(perfumeName.toLowerCase())) {
        el.innerHTML = `${label} • Premium`;
        el.dataset.audience = audience;
      }
    }
  });
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  // Update all perfumes in the map
  Object.entries(perfumeAudienceMap).forEach(([name, audience]) => {
    updatePerfumeAudience(name, audience);
  });
  
  // Also try to match by partial name for perfumes not in the exact map
  const brandLocations = document.querySelectorAll('.brand-location');
  brandLocations.forEach(el => {
    const productNameEl = el.closest('.product-header-row')?.querySelector('.product-name');
    if (productNameEl) {
      const productText = productNameEl.innerText.trim();
      // Try to match any known perfume name
      for (const [name, audience] of Object.entries(perfumeAudienceMap)) {
        if (productText.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(productText.toLowerCase())) {
          el.innerHTML = `${audienceLabels[audience]} • Premium`;
          el.dataset.audience = audience;
          break;
        }
      }
    }
  });
});