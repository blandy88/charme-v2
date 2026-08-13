// Add gender badge to search result items
// This script runs after search results are rendered

document.addEventListener('DOMContentLoaded', () => {
  // Map fragrance names to audience (validated from codebase)
  const audienceMap = {
    // Unisex (mixte) - gold
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
    "yara moi": "women"
  };

  const audienceLabels = {
    unisex: "Mixte",
    men: "Homme",
    women: "Femme"
  };

  // Color classes for each gender
  const genderClasses = {
    unisex: "mixte",
    men: "homme",
    women: "femme"
  };

  // Find all fragrance titles in search results
  const fragranceTitles = document.querySelectorAll('.fragrance-title');
  
  fragranceTitles.forEach(title => {
    const fragranceName = title.innerText.trim();
    if (!fragranceName) return;
    
    // Normalize the name for matching
    const normalized = fragranceName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try to find matching audience
    let audience = null;
    for (const [name, aud] of Object.entries(audienceMap)) {
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.includes(normalizedName) || normalizedName.includes(normalizedName)) {
        audience = aud;
        break;
      }
    }
    
    // If no match, try exact case-insensitive match
    if (!audience) {
      for (const [name, aud] of Object.entries(audienceMap)) {
        if (fragranceName.toLowerCase() === name.toLowerCase()) {
          audience = aud;
          break;
        }
        if (fragranceName.toLowerCase().includes(name.toLowerCase())) {
          audience = aud;
          break;
        }
      }
    }
    
    // Add gender badge if found
    if (audience) {
      const label = audienceLabels[audience];
      const badge = document.createElement('span');
      badge.className = `gender-badge ${genderClasses[audience]}`;
      badge.title = audience;
      badge.innerText = label;
      // Insert after the fragrance title
      title.parentNode.insertBefore(badge, title.nextSibling);
    }
  });
});