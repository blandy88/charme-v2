// Simplified: add data-audience to brand-location based on known perfume names
// from the HTML sections that are currently visible

// Map of perfume names (as they appear in HTML h3.product-name) to audience
// Keys are case-insensitive and handle common variations
const perfumeAudienceMap = {
  // From the validated codebase data
  "armani code parfum": "men",
  "hudson valley": "unisex",
  "black opium": "women",
  "mon paris": "women",
  "flower by kenzo": "women",
  "narciso": "unisex",
  "cristal noir": "women",
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

// Get all brand-location elements and try to match perfume names
document.addEventListener('DOMContentLoaded', () => {
  const brandLocations = document.querySelectorAll('.brand-location');
  
  brandLocations.forEach(el => {
    // Find the product name in the same product-header-row
    const productHeader = el.closest('.product-header-row');
    if (!productHeader) return;
    
    const productNameEl = productHeader.querySelector('.product-name');
    if (!productNameEl) return;
    
    const perfumeName = productNameEl.innerText.trim();
    if (!perfumeName) return;
    
    // Try to find a matching audience
    let audience = null;
    const normalizedName = perfumeName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const [name, aud] of Object.entries(perfumeAudienceMap)) {
      const normalizedMapKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedName.includes(normalizedMapKey) || normalizedMapKey.includes(normalizedName)) {
        audience = aud;
        break;
      }
    }
    
    // If no match found, try exact case-insensitive match
    if (!audience) {
      for (const [name, aud] of Object.entries(perfumeAudienceMap)) {
        if (perfumeName.toLowerCase() === name.toLowerCase()) {
          audience = aud;
          break;
        }
        if (perfumeName.toLowerCase().includes(name.toLowerCase())) {
          audience = aud;
          break;
        }
        if (name.toLowerCase().includes(perfumeName.toLowerCase())) {
          audience = aud;
          break;
        }
      }
    }
    
    // Set the audience on the brand-location element
    if (audience) {
      const label = { unisex: "Mixte", men: "Homme", women: "Femme" }[audience] || audience;
      el.dataset.audience = audience;
      // Replace "PARIS" with the audience label, keeping "• Premium" suffix
      if (el.innerText.trim() === "PARIS") {
        el.innerHTML = `${label} • Premium`;
      } else {
        // Prepend the label if there's already text
        el.innerHTML = `${label} • ${el.innerText.trim()}`;
      }
    }
  });
});