/**
 * Fragrance API Service
 * Runtime database with all fragrances rendered in index.html.
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
      this.make("Pacific Chill", "Louis Vuitton", "Citrus Aromatic", "unisex", "", ["citron", "mint", "black currant", "coriander", "basil", "carrot seed", "may rose", "fig", "dates"], 2023, "Jacques Cavallier Belletrud", "A sparkling Louis Vuitton citrus aromatic with cool mint, juicy black currant, aromatic herbs, and a sunlit fig-dates drydown."),
      this.make("Freedom Musk", "Kayali", "Floral Musk", "unisex", "kayali-freedom-musk.png", ["pear", "pink pepper", "freesia", "musk", "rose", "peony", "amber", "vanilla", "sandalwood"], "", "", ""),
      this.make("Light Blue", "Dolce & Gabbana", "Citrus Fresh", "unisex", "dg-light-blue.png", ["sicilian mandarin", "bluebell", "bergamot", "bamboo", "jasmine", "rose", "cedar", "musk", "amber"], "", "", ""),
      this.make("Fame in Love", "Paco Rabanne", "Floral Fruity", "women", "paco-rabanne-fame-in-love.png", ["raspberry", "pink pepper", "pear", "rose", "jasmine", "peony", "musk", "cedar", "vanilla"], "", "", ""),
      this.make("Uomo Extradose", "Valentino", "Woody Ambery Fougere", "men", "kerosene-umo-extradose.png", ["spices", "lavandin", "vetiver", "guaiac wood", "amber accord", "vanilla"], 2025, "", "A deeper Born in Roma twist powered by extra vetiver, aromatic lavandin, warm spice, and an addictive amber-vanilla trail."),
      this.make("Donna Extradose", "Valentino", "Floral Ambery", "women", "kerosene-donna-extradose.png", ["black currant", "rum accord", "jasmine", "vanilla"], 2025, "", "A richer Born in Roma Donna built around black currant, liquor-like rum facets, jasmine, and a plush vanilla overdose."),
      this.make("Cedar Chic", "Carolina Herrera", "Floral Woody Musk", "unisex", "narciso-cedar-chic.png", ["aldehydes", "bergamot", "orange blossom", "white musk", "cedarwood"], 2025, "Antoine Maisondieu", "A polished Carolina Herrera cedar scent inspired by a crisp white shirt, airy aldehydes, orange blossom, white musk, and cedarwood."),
      this.make("L'Imp\u00e9ratrice 3", "Dolce & Gabbana", "Floral Fruity", "women", "dg-limperatrice-3.png", ["kiwi", "watermelon", "pink cyclamen", "lychee", "heliotrope", "rose", "musk", "cedar", "sandalwood"], "", "", ""),
      this.make("Eau du Soir", "Sisley", "Chypre Floral", "women", "sisley-eau-du-soir.png", ["grapefruit", "mandarin", "rose", "jasmine", "lily", "may rose", "musk", "cedar", "amber"], "", "", ""),
      this.make("Guidance 46", "Amouage", "Oriental", "unisex", "amouage-guidance-46.png", ["saffron", "pink pepper", "frankincense", "rose", "oud", "iris", "amber", "musk", "sandalwood"], "", "", ""),
      this.make("Her Majesty", "Kilian", "Oriental Floral", "women", "kilian-her-majesty.png", ["champagne accord", "raspberry", "pink pepper", "rose", "iris", "peony", "musk", "amber", "vanilla"], "", "", ""),
      this.make("Si Passione Red Musk", "Armani", "Floral Musk", "women", "armani-si-passione-red-musk.png", ["raspberry", "pink pepper", "pear", "rose", "musk", "peony", "amber", "vanilla", "cedar"], "", "", ""),
      this.make("Narciso Bleu Noir", "Narciso Rodriguez", "Woody Aromatic", "men", "narciso-bleu-noir.png", ["bergamot", "lavender", "nutmeg", "musk", "cedar", "vetiver", "amber", "tonka bean", "sandalwood"], "", "", ""),
      this.make("Vanilla Powder", "Matiere Premiere", "Gourmand", "unisex", "matiere-premiere-vanilla-powder.png", ["pink pepper", "cardamom", "bergamot", "vanilla", "iris", "heliotrope", "musk", "cedar", "tonka bean"], "", "", ""),
      this.make("La Belle Paradise Garden", "Jean Paul Gaultier", "Floral Amber", "women", "lolita-lempicka-la-belle-paradise.png", ["blue water lily", "iris", "lotus", "vanilla"], 2024, "", "A tropical Jean Paul Gaultier floral amber where aquatic blue lily and iris melt into a soft sensual vanilla base."),
      this.make("Si Passione Intense", "Armani", "Floral Oriental", "women", "armani-si-passione-intense.png", ["cassis", "pear", "bergamot", "rose", "jasmine", "heliotrope", "vanilla", "cedar", "musk"], "", "", ""),
      this.make("Nautica Voyage", "Nautica", "Aquatic Fresh", "men", "nautica-voyage.png", ["green apple", "cucumber", "lotus", "mimosa", "jasmine", "rose", "cedar", "musk", "amber"], "", "", ""),
      this.make("eLVes", "Louis Vuitton", "Oriental Floral", "women", "spirit-of-dubai-elves.png", ["rose", "lily of the valley", "patchouli", "ambergris"], 2025, "Jacques Cavallier Belletrud", "A luminous Louis Vuitton floral with velvety rose and a smoother, richer profile that feels like Pacific Chill's more opulent counterpart."),
      this.make("Rose Amira", "Guerlain", "Oriental Floral", "unisex", "artisan-parfumeur-rose-amira.png", ["rose", "olibanum", "patchouli", "musk"], 2024, "Delphine Jelk", "A velvety Guerlain rose framed by incense, patchouli, and musk in a darker Absolus Allegoria style."),
      this.make("40 Knots", "Xerjoff", "Aquatic Woody", "unisex", "xerjoff-40-knots.png", ["sea salt", "bergamot", "pink pepper", "ambergris", "iris", "rose", "musk", "cedar", "amber"], "", "", ""),
      this.make("Power of You", "Giorgio Armani", "Fruity Floral Gourmand", "women", "ch-power-of-you.png", ["passion fruit", "frangipani", "vanilla"], 2026, "", "A ruby-toned Armani gourmand with tropical passion fruit, creamy frangipani, and warm vanilla."),
      this.make("Phantom in Red", "Rabanne", "Amber Woody", "men", "initio-phantom-in-red.png", ["saffron", "plum liquor", "bergamot", "lavender", "sage", "orange blossom", "amberwood", "benzoin", "oud", "tobacco"], 2025, "", "A bolder Rabanne Phantom with plum liquor, saffron, aromatic lavender, and a dark woody amber base touched by oud and tobacco."),
      this.make("Valentina Poudre", "Valentino", "Floral Powdery", "women", "valentino-valentina-poudre.png", ["iris", "pink pepper", "bergamot", "rose", "heliotrope", "violet", "musk", "vanilla", "sandalwood"], "", "", ""),
      this.make("Valentina Absolue", "Valentino", "Floral Oriental", "women", "valentino-valentina-absolue.png", ["jasmine", "pear", "bergamot", "rose", "tuberose", "iris", "vanilla", "musk", "amber"], "", "", ""),
      this.make("Fantasmagoria", "Lattafa", "Oriental", "unisex", "lattafa-fantasmagoria.png", ["bergamot", "saffron", "pink pepper", "oud", "rose", "incense", "amber", "musk", "sandalwood"], "", "", ""),
      this.make("Supr\u00eame Bouquet", "Yves Saint Laurent", "Amber Floral", "unisex", "yves-rocher-supreme-bouquet.png", ["pink pepper", "bergamot", "tuberose", "ylang-ylang", "amber", "musk", "patchouli"], 2013, "Dominique Ropion", "An opulent YSL white floral from Le Vestiaire des Parfums where tuberose and ylang-ylang bloom over amber, musk, and patchouli."),
      this.make("Rose Star", "Dior", "Floral Oud", "unisex", "dior-rose-star.png", ["rose", "raspberry", "pink pepper", "oud", "iris", "jasmine", "amber", "musk", "sandalwood"], "", "", ""),
      this.make("Oud Voyager", "Tom Ford", "Oriental Woody", "unisex", "tom-ford-oud-voyager.png", ["oud", "saffron", "cardamom", "rose", "leather", "incense", "amber", "musk", "cedar"], "", "", ""),
      this.make("Assad Elixir", "Lattafa", "Oriental Spicy", "unisex", "lattafa-assad-elixir.png", ["saffron", "pink pepper", "bergamot", "oud", "rose", "tobacco", "amber", "musk", "vanilla"], "", "", ""),
      this.make("Flowerbomb Extr\u00eame", "Viktor & Rolf", "Floral Oriental", "women", "viktor-rolf-flowerbomb-extreme.png", ["rose", "freesia", "cattleya orchid", "jasmine", "orange blossom", "patchouli", "musk", "vanilla", "amber"], "", "", ""),
      this.make("Santal Royal", "Guerlain", "Woody Oriental", "unisex", "guerlain-santal-royal.png", ["sandalwood", "rose", "jasmine", "oud", "leather", "incense", "amber", "musk", "cedar"], "", "", ""),
      this.make("Terroni", "Orto Parisi", "Leather", "unisex", "orto-parisi-terroni.png", ["earth", "petrichor", "moss", "leather", "tobacco", "vetiver", "amber", "musk", "cedar"], "", "", ""),
      this.make("Oud Royal", "Guerlain", "Oriental", "unisex", "guerlain-oud-royal.png", ["oud", "saffron", "rose", "leather", "incense", "cardamom", "amber", "musk", "sandalwood"], "", "", ""),
      this.make("Noir Extreme", "Tom Ford", "Oriental Gourmand", "men", "tom-ford-noir-extreme.png", ["cardamom", "nutmeg", "bergamot", "milk", "kulfi", "rose", "amber", "sandalwood", "vanilla"], "", "", ""),
      this.make("Guilty Elixir Femme", "Gucci", "Amber Floral Woody", "women", "paco-rabanne-guilty-elixir-femme.png", ["bergamot", "mandora", "violet", "wisteria", "rose", "osmanthus", "vanilla absolute", "tonka bean", "patchouli"], 2023, "Quentin Bisch & Nathalie Cetto", "A richer Gucci Guilty pour Femme with violet, wisteria, osmanthus, vanilla absolute, and tonka over earthy patchouli."),
      this.make("Rosendo Mateu N\u00ba5", "Rosendo Mateu", "Woody Floral", "unisex", "rosendo-mateu-no5.png", ["pink pepper", "bergamot", "lemon", "rose", "jasmine", "iris", "musk", "sandalwood", "amber"], "", "", ""),
      this.make("Les Sables Roses", "Louis Vuitton", "Floral Oud", "unisex", "maison-crivelli-les-sables-roses.png", ["rose", "oud", "ambergris", "black pepper", "saffron"], 2019, "Jacques Cavallier Belletrud", "A dramatic Louis Vuitton rose-oud composition that balances velvety petals with ambergris warmth and dark spice."),
      this.make("Wanted Elixir", "Azzaro", "Oriental Spicy", "men", "azzaro-wanted-elixir.png", ["lavender", "cardamom", "bergamot", "leather", "vanilla", "tonka bean", "amber", "musk", "cedar"], "", "", ""),
      this.make("Ambassador", "Gisada", "Woody Aromatic", "men", "gisada-ambassador.png", ["bergamot", "grapefruit", "pink pepper", "lavender", "geranium", "violet", "musk", "cedar", "amber"], "", "", ""),
      this.make("La Bomba", "Jean Paul Gaultier", "Floral Fruity", "women", "jpg-la-bomba.png", ["strawberry", "raspberry", "pink pepper", "rose", "jasmine", "tuberose", "vanilla", "musk", "cedar"], "", "", ""),
      this.make("Ambre Samar", "Maison Crivelli", "Oriental Amber", "unisex", "maison-crivelli-ambre-samar.png", ["amber", "saffron", "bergamot", "rose", "oud", "incense", "musk", "sandalwood", "vanilla"], "", "", ""),
      this.make("Myrrh & Tonka", "Jo Malone", "Oriental", "unisex", "jo-malone-myrrh-tonka.png", ["bergamot", "lavender", "mandarin", "myrrh", "tonka bean", "orris", "musk", "cedar", "amber"], "", "", ""),
      this.make("Chanel N\u00b05", "Chanel", "Aldehyde Floral", "women", "chanel-no5.png", ["ylang-ylang", "neroli", "aldehydes", "rose", "jasmine", "may rose", "musk", "sandalwood", "vanilla"], "", "", ""),
      this.make("Ganym\u00e8de", "Marc-Antoine Barrois", "Mineral Woody", "unisex", "marc-antoine-barrois-ganymede.png", ["mandarin", "saffron", "suede", "iris", "violet", "orris", "musk", "ambroxan", "mineral"], "", "", ""),
      this.make("Crush on Me", "Dolce & Gabbana", "Floral Fruity", "women", "dg-crush-on-me.png", ["strawberry", "raspberry", "pink pepper", "rose", "jasmine", "peony", "musk", "vanilla", "cedar"], "", "", ""),
      this.make("Armani Code Parfum", "Armani", "Oriental Woody", "men", "armani-code-parfum.png", ["bergamot", "lavender", "star anise", "olive flower", "tonka bean", "leather", "musk", "sandalwood", "amber"], "", "", ""),
      this.make("Hudson Valley", "Gissah", "Aromatic Green", "unisex", "gisada-hudson-valley.png", ["green apple", "bergamot", "mint", "vetiver", "cedar", "geranium", "musk", "amber", "sandalwood"], "", "", ""),
      this.make("Black Opium", "YSL", "Oriental Gourmand", "women", "ysl-black-opium.png", ["coffee", "pink pepper", "pear", "jasmine", "vanilla", "bitter almond", "cedar", "musk", "patchouli"], "", "", ""),
      this.make("Vanilla Candy Rock Sugar", "Kayali", "Gourmand", "unisex", "kayali-vanilla-candy-rock-sugar.png", ["cotton candy", "raspberry", "pink pepper", "vanilla", "rose", "jasmine", "musk", "cedar", "tonka bean"], "", "", ""),
      this.make("Mon Paris", "YSL", "Floral Fruity", "women", "ysl-mon-paris.png", ["strawberry", "raspberry", "pear", "datura", "jasmine", "peony", "musk", "patchouli", "cedar"], "", "", ""),
      this.make("Flower by Kenzo", "Kenzo", "Floral Powdery", "women", "kenzo-flower.png", ["rose", "violet", "hawthorn", "cassie", "poppy", "peony", "musk", "vanilla", "white cedar"], "", "", ""),
      this.make("Narciso", "Narciso Rodriguez", "Musk Floral", "unisex", "narciso-rodriguez-narciso.png", ["bergamot", "rose", "peony", "musk", "iris", "lily", "cedar", "amber", "sandalwood"], "", "", ""),
      this.make("Cristal Noir", "Versace", "Oriental Floral", "women", "raghba-cristal-noir.png", ["ginger", "cardamom", "pepper", "gardenia", "orange blossom", "coconut", "sandalwood", "amber", "musk"], 2004, "", "Versace's darkly glamorous oriental, spice-kissed ginger and cardamom over gardenia, coconut, and warm woods."),
      this.make("Tr\u00e9sor la Nuit", "Lanc\u00f4me", "Floral Oriental", "women", "lancome-tresor-la-nuit.png", ["rose", "pink pepper", "pear", "datura", "iris", "heliotrope", "musk", "vanilla", "sandalwood"], "", "", ""),
      this.make("Manifesto Elixir", "Narciso Rodriguez", "Floral Musk", "women", "narciso-manifesto-elixir.png", ["rose", "bergamot", "pink pepper", "musk", "jasmine", "vanilla", "cedar", "amber", "tonka bean"], "", "", ""),
      this.make("Alien", "Mugler", "Oriental Woody", "women", "mugler-alien.png", ["jasmine sambac", "bergamot", "mandarin", "cashmeran", "white amber", "woody", "musk", "sandalwood", "vanilla"], "", "", ""),
      this.make("Elie Saab In White", "Elie Saab", "White Floral", "women", "elie-saab-in-white.png", ["bergamot", "lemon", "orange blossom", "jasmine", "rose", "lily", "musk", "cedar", "amber"], "", "", ""),
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
      this.make("\u00c4ican", "Kajal", "Fruity Gourmand", "unisex", "", ["passion fruit", "pineapple", "mandarin", "ginger", "black pepper", "jasmine", "musk", "vanilla", "praline", "vetiver", "sandalwood", "patchouli"], 2024, "G\u00f6khan \u015eim\u015fek", "A tropical burst of passion fruit and pineapple laced with ginger and praline, \u00c4ican is Kajal's golden-hour gourmand that glows on warm skin."),
      this.make("Saharian Wind", "Mancera", "Spicy Oriental", "unisex", "", ["pink pepper", "saffron", "cinnamon", "spices", "leather", "amber", "woody notes", "musk"], 2020, "Pierre Montale", "A sweltering desert gust of pink pepper and warm spices blown over leather and woods, Pierre Montale's ode to the Sahara."),
      this.make("Sole Patchouli", "Vertus", "Woody Earthy", "unisex", "", ["patchouli", "green notes", "orris root", "mimosa", "marshmallow", "civet"], 2017, "", "Sun-drenched patchouli softened by orris root and a whisper of marshmallow, an earthy-green signature with a surprisingly plush drydown."),
      this.make("Scirocco", "Moresque", "Oriental Spicy", "unisex", "", ["cardamom", "saffron", "apple", "elemi", "orange", "damask rose", "nutmeg", "cinnamon", "jasmine", "amber", "vanilla", "tonka bean", "leather", "cedar", "patchouli", "vetiver", "musk"], 2023, "", "A saffron-rose oriental that melts in the heat, cardamom, cinnamon and Damask rose over a plush amber-vanilla base with a leathery spine."),
      this.make("Bois Imp\u00e9rial", "Essential Parfums", "Woody Spicy", "unisex", "", ["thai basil", "grapefruit", "nepalese pepper absolute", "akigalawood", "haitian vetiver"], 2020, "Quentin Bisch", "Quentin Bisch's cult woody minimalist, Thai basil and grapefruit zipping over Nepalese pepper and a creamy Akigalawood-vetiver core."),
      this.make("Stellar Times", "Louis Vuitton", "Amber Floral", "unisex", "armani-prive-stellaris.png", ["orange blossom", "white amber", "peru balsam", "vanilla"], 2021, "Jacques Cavallier Belletrud", "A warm, resinous extrait from the Les Extraits collection, orange blossom and white amber wrapped in Peru balsam and vanilla for a stellar golden glow."),
      this.make("Erba Gold", "Xerjoff", "Fruity Citrus", "unisex", "", ["orange", "bergamot", "lemon", "ginger", "melon", "pear", "green apple", "cinnamon", "cardamom", "cloves", "white musk", "vanilla", "amber", "woody notes"], 2016, "Unknown", "A sunlit citrus cocktail, Amalfi lemon, Brazilian orange and ginger sparkling over melon, pear and cinnamon, melting into white musk and Madagascan vanilla."),
      this.make("Purple Accento", "Xerjoff", "Oriental Floral", "unisex", "", ["pineapple", "mandarin", "bergamot", "hyacinth", "loganberry", "jasmine", "orris", "pink pepper", "musk", "oud", "vanilla", "amber", "sandalwood"], 2025, "Unknown", "The Accento universe goes plush, pineapple and loganberry over jasmine and orris, wrapped in oud, amber and vanilla for a regal violet glow."),
      this.make("Fleur de Mat\u00e9", "Versace", "Aromatic Woody", "unisex", "", ["patchouli", "cypriol", "mat\u00e9", "olibanum", "atlas cedar"], 2021, "Olivier Cresp", "Olivier Cresp's verde tapestry, patchouli and cypriol shadowing the bitter lift of mat\u00e9, olibanum and Atlas cedar for a tailored, smoky-herbal elegance."),
      this.make("Iris d'\u00c9lite", "Versace", "Floral Woody", "unisex", "", ["bergamot", "pink pepper", "iris", "orris", "heliotrope", "suede", "vetiver", "musk"], 2021, "", "A regal powdery iris dressed in soft suede and woody warmth, Versace's most refined, quiet-luxury side."),
      this.make("Jahwara Oriental", "Giorgio Armani", "Oriental Woody", "unisex", "", ["spices", "incense", "myrrh", "iris", "opoponax", "labdanum", "ambroxan", "bourbon vanilla", "amberwood", "guaiac wood", "cedar"], 2021, "", "A princely Armani Priv\u00e9 journey, incense, myrrh and spices over iris, opoponax and labdanum, drying into bourbon vanilla, guaiac wood and amberwood."),
      this.make("Dolce Blue Jasmine", "Dolce & Gabbana", "Floral Fruity", "women", "", ["blue fig", "jasmine sambac", "cedarwood", "musk"], 2024, "", "A Sicilian breeze in a bottle, juicy blue fig and jasmine sambac rising over clean cedarwood, luminous and effortlessly Mediterranean."),
      this.make("Light Blue Summer Vibes", "Dolce & Gabbana", "Citrus Fruity", "unisex", "", ["bergamot", "peach", "fruity notes", "cedar", "musk"], 2023, "Olivier Cresp", "Olivier Cresp's sun-soaked seasonal twist on Light Blue, sparkling bergamot and juicy peach over the iconic cedarwood drydown."),
      this.make("Patchouli Ardent", "Guerlain", "Woody Oriental", "unisex", "", ["patchouli", "incense", "spices", "cedar", "amber", "vanilla", "musk"], 2024, "Thierry Wasser", "Thierry Wasser's molten patchouli from the Absolus Allegoria line, dark, smoky and glowing, with resins and woods feeding the flames."),
      this.make("Mandarine Basilic", "Guerlain", "Citrus Aromatic", "unisex", "", ["mandarin", "basil", "neroli", "bitter orange", "petitgrain", "sandalwood", "musk"], 2007, "", "The Aqua Allegoria classic, a glass of chilled mandarin juice bruised with fresh basil, herbal and sunny in equal measure."),
      this.make("Bvlgari Man Rain Essence", "Bvlgari", "Aromatic Fresh", "men", "", ["green tea", "orange", "white lotus", "musk", "amber", "guaiac wood"], 2023, "Alberto Morillas", "Alberto Morillas captures the scent of rain on warm stone, green tea and orange petal chilled by a petrichor musk-amber base with guaiac wood."),
      this.make("Magic", "Al-Jazeera Perfumes", "Oriental Floral", "unisex", "", ["ozonic notes", "salt", "turkish rose", "praline", "vanilla", "amber extreme", "patchouli"], 2016, "Loc Dong", "Loc Dong's salty ozonic opening crashes into Turkish rose and praline, settling on a warm vanilla-amber-patchouli shore."),
      this.make("Sabah Al Waed", "Paris Corner", "Amber Floral", "unisex", "", ["jasmine", "orange blossom", "cocoa", "musk", "amber", "vanilla", "tonka bean", "patchouli", "sandalwood"], 2023, "Al Haramain Perfumes", "A creamy morning promise, jasmine and orange blossom over cocoa, amber and a vanilla-tonka base dusted with patchouli and sandalwood."),
      this.make("Smoking Hot", "Kilian", "Oriental Spicy", "unisex", "", ["apple", "smoke", "cinnamon", "tobacco", "vanilla", "moss", "bourbon vanilla", "licorice", "iso e super", "clary sage"], 2023, "Mathieu Nardin", "Smoke curling through caramelized apple and cinnamon, a tobacco-vanilla hearth cooled by licorice and clary sage."),
      this.make("Lamar Noir", "Kajal", "Oriental Amber", "unisex", "", ["tropical fruits", "green apple", "violet", "bergamot", "caramel", "balsamic notes", "vanilla", "rose", "geranium", "leather", "oud", "cashmere wood", "amber", "guaiac wood", "sandalwood", "moss", "musk"], 2024, "Patrick M\u00fcller", "An ambery-leather noir, tropical fruits and violet brightening caramel-vanilla before oud, leather and cashmere woods take hold."),
      this.make("Tobacco Mandarin", "Byredo", "Tobacco Woody", "unisex", "", ["cumin", "mandarin", "coriander", "tobacco", "leather", "labdanum", "frankincense", "oud", "sandalwood"], 2020, "J\u00e9r\u00f4me Epinette", "Juicy mandarin colliding with cumin and coriander over smoldering tobacco, leather and labdanum, drying into frankincense and oud."),
      this.make("Alexandria II", "Xerjoff", "Oriental Woody", "unisex", "", ["palisander rosewood", "lavender", "apple", "cinnamon", "rose", "cedar", "lily of the valley", "oud", "sandalwood", "amber", "vanilla", "musk"], 2012, "Chris Maurice", "A regal oriental masterpiece, palisander rosewood and lavender opening over rose and cedar, melting into oud, amber and vanilla."),
      this.make("Italica", "Xerjoff", "Gourmand Oriental", "unisex", "", ["almond", "milk", "saffron", "vanilla", "toffee", "sandalwood", "musk", "cedar"], 2016, "Unknown", "Tuscan almond milk steeped in saffron and vanilla toffee, a creamy gourmand wrapped in sandalwood, cedar and musk."),
      this.make("Mefisto", "Xerjoff", "Citrus Aromatic", "unisex", "", ["grapefruit", "bergamot", "lemon", "lavender", "rose", "iris", "musk", "sandalwood", "cedar", "amber"], 2009, "Unknown", "A sparkling Casamorati cologne, grapefruit, bergamot and Amalfi lemon brightening lavender, rose and iris over cedar, musk and amber."),
      this.make("1888", "Xerjoff", "Oriental Floral", "unisex", "", ["carnation", "coriander", "green pepper", "saffron", "rose", "neroli", "ylang-ylang", "sandalwood", "patchouli", "amber", "birch"], 2013, "Unknown", "A tribute to the founding of Casamorati, carnation and saffron over rose, neroli and ylang-ylang, grounded in Mysore sandalwood, amber and birch."),
      this.make("Bois d'Argent", "Dior", "Iris Woody", "unisex", "", ["iris", "cypress", "juniper berries", "myrrh", "patchouli", "woody notes", "honey", "vanilla", "amber", "musk", "leather"], 2004, "Annick Menardo", "Iris and myrrh suspended in honeyed amber over a dry woody base, the Maison Dior original of delicate, luminous restraint."),
      this.make("Tobacco Honey", "Guerlain", "Oriental Woody", "unisex", "", ["honey", "cloves", "anise", "tobacco", "vanilla", "tonka bean", "sesame", "oud", "sandalwood"], 2023, "Delphine Jelk", "Delphine Jelk's L'Art & La Mati\u00e8re masterpiece, beeswax honey and cloves over tobacco and tonka, drying into a smoky oud-sandalwood base."),
      this.make("Yes I Am", "Cacharel", "Floral Gourmand", "women", "", ["raspberry", "mandarin", "bergamot", "lemon", "gardenia", "ginger flower", "amber", "jasmine", "orange blossom", "rose", "milk", "caramel", "vanilla", "cardamom", "licorice", "benzoin", "sandalwood"], 2018, "Honorine Blanc & Christophe Raynaud", "The spicy-cremoso accord of warm milk and cardamom at its heart, raspberry and mandarin opening into gardenia, ginger flower and jasmine."),
      this.make("Jasmin Noir", "Bvlgari", "Floral Woody Musk", "women", "", ["jasmine sambac", "star anise", "gardenia", "tonka bean", "white musk", "woody notes", "amber"], 2008, "Sophie Labbe", "Bvlgari's femme fatale jasmine, luminous jasmine sambac wrapped in star anise and gardenia over tonka, woods and white musk."),
      this.make("L'Instant de Guerlain", "Guerlain", "Floral Woody Musk", "women", "", ["bergamot", "mandarin", "honeysuckle", "magnolia", "jasmine", "iris", "woody notes", "white musk"], 2004, "Maurice Roucel", "Maurice Roucel's golden classic, honeysuckle and magnolia over iris, woods and radiant white musk."),
      this.make("Alien Goddess", "Mugler", "Amber Floral", "women", "", ["bergamot", "coconut", "frangipani", "jasmine sambac", "cashmeran", "amber", "benzoin"], 2021, "Quentin Bisch", "A sun-drenched amber floral, bergamot and frangipani over jasmine sambac and cashmeran on a warm benzoin base."),
      this.make("Hypnotic Poison", "Dior", "Oriental Vanilla", "women", "", ["bitter almond", "caraway", "jasmine", "lily of the valley", "vanilla", "musk", "sandalwood"], 1998, "Annick Menardo", "Annick Menardo's dangerously addictive almond-vanilla, a retro-glamour oriental that opens bitter and dries seductively sweet."),
      this.make("Si Passione", "Giorgio Armani", "Floral Fruity", "women", "", ["pear", "black currant", "pink pepper", "rose", "jasmine", "vanilla", "cedar", "patchouli"], 2017, "Unknown", "A passionate rework of Si, juicy pear and black currant igniting rose, jasmine and patchouli."),
      this.make("Coco Mademoiselle", "Chanel", "Chypre Floral", "women", "", ["orange", "bergamot", "rose", "jasmine", "orange blossom", "patchouli", "vetiver", "vanilla", "white musk"], 2001, "Jacques Polge", "Jacques Polge's contemporary chypre, fresh orange and rose over a deep patchouli-vetiver base, a study in modern Chanel elegance."),
      this.make("Lady Million", "Paco Rabanne", "Floral Fruity", "women", "", ["raspberry", "neroli", "bitter orange", "jasmine", "honey", "amber", "patchouli"], 2010, "Unknown", "The dazzling gold counterpart to 1 Million, raspberry and neroli brightened by honey, amber and patchouli."),
      this.make("Crystal Noir", "Versace", "Oriental Floral", "women", "raghba-cristal-noir.png", ["ginger", "cardamom", "pepper", "gardenia", "orange blossom", "coconut", "sandalwood", "amber", "musk"], 2004, "Unknown", "Versace's darkly glamorous oriental, spice-kissed ginger and cardamom over gardenia, coconut and warm woods."),
      this.make("Scandal Absolu", "Jean Paul Gaultier", "Floral Gourmand", "women", "", ["gardenia", "orange blossom", "honey", "caramel", "tonka bean", "vanilla", "patchouli"], 2022, "Unknown", "A richer Scandal, honeyed caramel and tonka poured over gardenia and orange blossom with a patchouli backbone."),
      this.make("Flora Gorgeous Jasmine", "Gucci", "Floral", "women", "", ["jasmine grandiflorum", "pear", "brown sugar", "mandarin", "sandalwood"], 2022, "Unknown", "Gucci's radiant jasmine, grandiflorum jasmine entwined with pear and brown sugar over a creamy sandalwood drydown."),
      this.make("Gucci Guilty", "Gucci", "Floral Oriental", "women", "", ["mandarin", "pink pepper", "peach", "lilac", "rose", "amber", "patchouli"], 2010, "Unknown", "A magnetic amber-floral, mandarin and pink pepper opening into lilac, rose and peach on patchouli."),
      this.make("Amirat Al Arab", "Lattafa", "Floral Oud", "women", "", ["rose", "jasmine", "oud", "saffron", "amber", "vanilla", "musk"], 2016, "Unknown", "An opulent Arabian floral-oud, rose and jasmine laced with saffron over smoky oud, amber and vanilla."),
      this.make("Angelique Noire", "Guerlain", "Woody Aromatic", "unisex", "", ["angelica root", "bergamot", "lemon", "neroli", "white musk", "sandalwood", "vanilla"], 2005, "Unknown", "The first of L'Art et la Matiere, crisp angelica and citrus over a creamy sandalwood-vanilla base."),
      this.make("Chloe by Chloe", "Chloe", "Chypre Floral", "women", "", ["peony", "lychee", "freesia", "rose", "lily of the valley", "magnolia", "amber", "cedar", "musk"], 2008, "Unknown", "A classic rose-powder chypre, peony and freesia around a soft rose heart with warm cedar and musk."),
      this.make("Irresistible", "Givenchy", "Floral Powdery", "women", "", ["pear", "bergamot", "rose", "iris", "musk", "sandalwood", "patchouli", "vanilla"], 2020, "Fanny Bal", "Fanny Bal's luminous powdery floral, sparkling pear and rose with velvety iris over white musk."),
      this.make("Guidance", "Amouage", "Amber Floral", "women", "", ["pear", "saffron", "osmanthus", "rose", "hazelnut", "amber", "sandalwood", "tonka"], 2023, "Cecile Krakower", "Cecile Krakower's soaring amber-rose, saffron and pear lifted over hazelnut, tonka and creamy sandalwood."),
      this.make("Insolence", "Guerlain", "Floral Powdery", "women", "", ["violet", "iris", "orange blossom", "jasmine", "vanilla", "tonka bean", "musk"], 2006, "Maurice Roucel", "Maurice Roucel's extrovert violet-iris, a candy-sweet powder puff of playful Guerlain opulence."),
      this.make("Envy Me", "Gucci", "Floral Fruity", "women", "", ["pineapple", "pink pepper", "peony", "jasmine", "rose", "musk", "sandalwood"], 2004, "Unknown", "A fresh juicy floral, pineapple and pink pepper over peony, jasmine and rose with a musk-wood base."),
      this.make("Chloe Roses", "Chloe", "Floral", "women", "", ["rose", "peony", "magnolia", "amber", "cedar", "musk"], 2014, "Unknown", "A pure rose eau de toilette, fresh rose and peony over magnolia with a soft amber-musk trail."),
      this.make("Devotion", "Dolce & Gabbana", "Floral Gourmand", "women", "", ["orange", "candied orange", "marzipan", "butter", "jasmine", "vanilla"], 2023, "Unknown", "An edible Sicilian gourmand, candied orange and marzipan over jasmine, vanilla and warm butter."),
      this.make("Lady Million Gold", "Paco Rabanne", "Floral Fruity", "women", "", ["raspberry", "black currant", "neroli", "orange blossom", "honey", "vanilla", "patchouli"], 2017, "Unknown", "The gilded flanker of Lady Million, black currant and orange blossom over honey, vanilla and patchouli."),
      this.make("Musc Noble", "Atelier Cologne", "Musky Woody", "unisex", "", ["bergamot", "saffron", "white musk", "amber", "sandalwood", "cedar", "vanilla"], 2020, "Unknown", "A refined musk cologne, bergamot and saffron glowing over clean white musk, amber and sandalwood."),
      this.make("Libre Absolu Platine", "Yves Saint Laurent", "Amber Fougere", "women", "", ["lavender", "ginger", "orange blossom", "jasmine", "vanilla", "musk"], 2023, "Unknown", "A sharper, more metallic Libre, lavender and ginger frozen over orange blossom, jasmine and vanilla."),
      this.make("Scandal", "Jean Paul Gaultier", "Floral Gourmand", "women", "", ["gardenia", "orange blossom", "honey", "caramel", "vanilla", "patchouli"], 2017, "Unknown", "Scandal's scandalous heart, gardenia and orange blossom drenched in honey-caramel on patchouli."),
      this.make("La Vie Est Belle Elixir", "Lancome", "Gourmand Floral", "women", "", ["iris", "orange blossom", "jasmine", "pear", "praline", "vanilla", "benzoin"], 2023, "Unknown", "An intensified La Vie Est Belle, pear and praline deepened with iris, orange blossom and smoky benzoin."),
      this.make("Miss Dior Blooming Bouquet", "Dior", "Floral", "women", "", ["peony", "rose", "cherry blossom", "mandarin", "white musk", "sandalwood"], 2014, "Unknown", "A tender blush bouquet, peony and rose with cherry blossom on fresh mandarin and white musk."),
      this.make("Black XS L'Exces", "Paco Rabanne", "Floral Woody Musk", "women", "", ["blackberry", "rhubarb", "rose", "amyris", "vanilla", "patchouli", "benzoin"], 2008, "Unknown", "A darker, headier Black XS, blackberry and rhubarb cut with rose over amyris, vanilla and patchouli."),
      this.make("Carmine", "Creed", "Floral Amber", "women", "", ["ylang-ylang", "tuberose", "rose", "amber", "vanilla", "sandalwood"], 2022, "Olivier Creed", "Olivier Creed's femme fatale rose-amber, ylang-ylang and tuberose over warm amber, vanilla and sandalwood."),
      this.make("Yara", "Lattafa", "Floral Gourmand", "women", "", ["tangerine", "orchid", "jasmine", "iris", "musk", "vanilla", "sandalwood", "caramel"], 2020, "Unknown", "An addictive powdery floral-gourmand, tangerine and orchid melting into musk, vanilla and caramel."),
      this.make("L'Interdit", "Givenchy", "Floral Oriental", "women", "", ["pear", "black currant", "tuberose", "jasmine", "orange blossom", "vetiver", "patchouli", "vanilla"], 2018, "Dominique Ropion", "A voluptuous tuberose built by Dominique Ropion, pear and black currant over orange blossom, vetiver and patchouli."),
      this.make("Nomade", "Chloe", "Chypre Floral", "women", "", ["mirabelle plum", "freesia", "oakmoss", "sandalwood", "patchouli", "cedar"], 2018, "Unknown", "A chic bohemian chypre, mirabelle plum and freesia over oakmoss, patchouli and sandalwood."),
      this.make("Burberry Her", "Burberry", "Floral Fruity", "women", "", ["strawberry", "raspberry", "blackberry", "violet", "jasmine", "musk", "amber", "sandalwood"], 2018, "Francis Kurkdjian", "Francis Kurkdjian's modern fruity-floral, juicy berries and violet over musk, amber and sandalwood."),
      this.make("Pure XS", "Paco Rabanne", "Floral Vanilla", "women", "", ["ginger", "white truffle", "jasmine", "vanilla", "caramel", "woody notes"], 2017, "Unknown", "An intimate take on excess, ginger and white truffle with jasmine and caramelized vanilla."),
      this.make("Dylan Blue Pour Femme", "Versace", "Floral Fruity", "women", "", ["black currant", "green apple", "freesia", "rose", "jasmine", "patchouli", "white musk"], 2017, "Unknown", "A fresh juicy women's Dylan Blue, black currant and green apple over freesia, rose and patchouli."),
      this.make("Yara Moi", "Lattafa", "Floral", "women", "", ["pear", "bergamot", "jasmine", "gardenia", "vanilla", "musk", "sandalwood"], 2023, "Unknown", "A creamy sparkling flanker to Yara, pear and jasmine over gardenia, vanilla and white musk."),
      this.make("Gris Charnel", "BDK Parfums", "Woody Spicy", "unisex", "", ["bergamot", "cardamom", "fig", "black currant", "tea", "iris", "sandalwood", "tonka bean", "vetiver"], 2019, "Mathilde Bijaoui", "A cashmere-tea embrace, fig and black currant over sandalwood, iris and tonka — a silk scarf in autumn rain."),
      this.make("Valentino Donna", "Valentino", "Floral Chypre", "women", "", ["bergamot", "mandarin", "black currant", "iris", "rose", "tuberose", "jasmine", "vanilla", "leather", "patchouli"], 2015, "Unknown", "A Roman floral chypre, iris and tuberose lifted by citrus over vanilla, patchouli and soft leather."),
      this.make("Luminous Night", "Bvlgari", "Amber Woody", "unisex", "", ["olibanum", "saffron", "iris", "cacao", "sandalwood", "ambergris", "tonka bean"], 2014, "Unknown", "Bvlgari Le Gemme's amethyst nocturne, olibanum and saffron over iris, cacao, sandalwood and ambergris."),
      this.make("A*Men Fantasm", "Mugler", "Amber Gourmand", "men", "amenfantasm.png", ["bergamot", "citrus", "dark chocolate", "clary sage", "patchouli", "coffee", "vanilla", "musk"], 2024, "", "The revived A*Men, citrus and bergamot over dark chocolate and clary sage grounded in the signature patchouli of the line."),
      this.make("1 Million Royale", "Paco Rabanne", "Spicy Woody", "men", "onemillionroyale.png", ["bergamot", "black pepper", "saffron", "rose", "cinnamon", "amber", "cedar", "musk", "vanilla"], 2022, "Unknown", "The royal flanker of 1 Million, bergamot and black pepper cut with saffron and cinnamon over amber, cedar and musk."),
      this.make("Vanille Rouge", "Versace", "Oriental Vanilla", "unisex", "versacevanillerouge.svg", ["pink pepper", "saffron", "orange blossom", "jasmine", "vanilla", "amber", "sandalwood", "musk"], 2019, "Unknown", "Atelier Versace's haute couture vanilla, pink pepper and saffron over orange blossom and jasmine drenched in vanilla, amber and sandalwood."),
      this.make("Narcotic Delight", "Initio", "Oriental Vanilla", "unisex", "narcoticdelight.svg", ["cherry", "cognac", "saffron", "tobacco", "vanilla", "amber", "musk", "cashmeran"], 2024, "Guillaume Flavigny", "A venomous gourmand of cherry and cognac soaked in saffron and tobacco, dark vanilla and amber — Initio's sweetness with a bite."),
      this.make("Queen of Silk", "Creed", "Amber Floral", "women", "queenofsilk.svg", ["pink pepper", "peony", "rose", "jasmine", "amber", "musk", "sandalwood"], 2024, "Olivier Creed", "A rose of royal velvet, pink pepper and peony over Turkish rose and jasmine glided onto amber, musk and sandalwood."),
      this.make("Opera", "Sospiro", "Oriental Spicy", "unisex", "sospiroopera.svg", ["saffron", "rose", "nutmeg", "amber", "vanilla", "sandalwood", "musk"], 2015, "Chris Maurice", "A grand floriental overture, saffron and rose soaring over amber with vanilla, sandalwood and musk, the sister house at full crescendo."),
      this.make("Dahab", "Kajal", "Fruity Amber", "women", "kajaldahab.svg", ["mandarin", "saffron", "jasmine", "honey", "caramel", "vanilla", "oud", "sandalwood", "amber", "musk"], 2015, "", "Kajal's golden amber, mandarin and jasmine glazed with honey and caramel over vanilla, oud and sandalwood, Cairo gilded at dusk."),
      this.make("Delina Exclusif", "Parfums de Marly", "Amber Floral", "women", "", ["lychee", "raspberry", "bergamot", "turkish rose", "peony", "vanilla", "oud", "amber", "musk", "cedar"], 2018, "Quentin Bisch", "Lychee and raspberry over Turkish rose and peony deepened with vanilla, oud and amber — Delina draped in midnight velvet."),
      this.make("Gentleman Réserve Privée", "Givenchy", "Amber Woody", "men", "", ["pear", "cardamom", "chestnut", "rum", "patchouli", "amber", "vanilla", "cedar"], 2018, "Olivier Cresp", "A gentleman at the bar, pear and cardamom warmed by chestnut, rum and patchouli over amber and vanilla."),
      this.make("Le Beau Paradise Garden", "Jean Paul Gaultier", "Woody Aromatic", "men", "", ["bergamot", "coconut water", "lavender", "iris", "tonka bean", "musk", "vetiver", "cedar"], 2022, "Unknown", "The sun-drenched Le Beau, bergamot and coconut water drifting over lavender and iris into tonka, musk and vetiver, paradise bottled."),
      this.make("Stronger With You Oud", "Giorgio Armani", "Woody Oud", "men", "", ["bergamot", "nutmeg", "saffron", "oud", "cedar", "amber", "leather", "musk"], 2022, "Cecile Matton", "Bergamot and nutmeg igniting a dark core of oud, leather and amber — the strong one stripped back to raw, smoldering wood."),
      this.make("Yara Tous", "Lattafa", "Fruity Floral", "women", "", ["mango", "coconut", "passionfruit", "jasmine", "orange blossom", "heliotrope", "vanilla", "musk", "cashmeran"], 2023, "Unknown", "The tropical Yara, mango, coconut and passionfruit over jasmine, orange blossom and heliotrope with vanilla, musk and cashmeran."),
      this.make("Absolu Aventus", "Creed", "Fruity Chypre", "men", "", ["pineapple", "black currant", "grapefruit", "pink pepper", "bergamot", "lemon", "cardamom", "cinnamon", "ginger", "vetiver", "patchouli"], 2025, "Olivier Creed", "The intensified Aventus, pineapple and blackcurrant sharpened with cardamom, cinnamon and ginger over vetiver and patchouli, the king amplified."),
      this.make("1881 Pour Homme", "Carven", "Woody Aromatic", "men", "", ["lavender", "clary sage", "cinnamon", "geranium", "vetiver", "sandalwood", "musk", "amber"], 1985, "Unknown", "The classic Carven fougère, lavender and clary sage over cinnamon, geranium and vetiver with sandalwood, musk and amber."),
      this.make("Tobacco Dior", "Dior", "Tobacco Woody", "unisex", "", ["tobacco leaf", "tobacco flower", "honey", "hay", "tonka bean", "vanilla", "balsam"], 2007, "François Demachy", "Tobacco flower and honeyed leaf steeped in tonka, vanilla and balsam, a smoky homage from Dior's La Collection Privée."),
      this.make("Vert Malachite", "Giorgio Armani", "Green Floral", "women", "", ["tuberose", "gardenia", "lily", "jasmine", "violet leaf", "green notes", "amber", "sandalwood"], 2019, "Unknown", "Tuberose and lily in dew-soaked greens finished with amber-sandalwood warmth, the malachite jewel of the Armani Privé collection."),
      this.make("Invictus Victory Absolu", "Paco Rabanne", "Amber Woody", "men", "", ["black pepper", "mandarin", "juniper berry", "grey amber", "olibanum", "patchouli", "sandalwood"], 2023, "Unknown", "Black pepper and mandarin ignite smoked incense amber over patchouli and sandalwood, victory at maximum intensity."),
      this.make("Scandale by Night", "Jean Paul Gaultier", "Floral Amber", "women", "", ["tuberose", "iris", "jasmine", "orange blossom", "cashmeran", "sandalwood", "vanilla"], 2020, "Unknown", "Creamy tuberose and powdery iris veiled in cashmeran and vanilla, Scandal's leopard prowling into the small hours."),
      this.make("Musc Noir", "Narciso Rodriguez", "Floral Musk", "women", "", ["black currant", "plum", "orange blossom", "tuberose", "musk", "vanilla"], 2020, "Unknown", "Blackcurrant and plum over orange blossom and tuberose, melting into the house's signature musk with a vanilla glow."),
      this.make("Bombshell", "Victoria's Secret", "Floral Fruity", "women", "", ["passion fruit", "peony", "vanilla orchid", "pink pepper", "musk"], 2010, "Unknown", "The glittering VS signature, purple passion fruit and pink peony over vanilla orchid, Hollywood gloss bottled as a scent."),
      this.make("Velvet Orchid", "Tom Ford", "Amber Floral", "women", "", ["black orchid", "honey", "rum", "jasmine", "vanilla", "sandalwood", "amber", "myrrh", "incense"], 2014, "Unknown", "Black orchid steeped in honeyed rum and jasmine over plush vanilla and amber, Orchid's warm indulgent sister."),
      this.make("Oud Minerale", "Tom Ford", "Woody Aquatic", "unisex", "", ["sea salt", "sea spray", "mineral notes", "oud", "amber", "saffron", "cedar"], 2017, "Unknown", "Dark oud surfacing from a salt-blasted shoreline, brine and minerals over smoked driftwood."),
      this.make("Boss Bottled Unlimited", "Hugo Boss", "Aromatic Citrus", "men", "", ["lime", "ginger", "cardamom", "black pepper", "vetiver", "cedar"], 2021, "Unknown", "Boss Bottled with its limits removed, zesty lime and ginger over vetiver and cedar."),
      this.make("Idylle", "Guerlain", "Green Floral", "women", "", ["bergamot", "jasmine", "lily of the valley", "peony", "freesia", "rose", "patchouli", "white musk", "vetiver"], 2010, "Thierry Wasser", "Grasse jasmine and lily of the valley over dewy greens and a musky-vetiver base, a luminous sky-gazing floral."),
      this.make("Delina La Rosée", "Parfums de Marly", "Floral Fruity", "women", "", ["lychee", "bergamot", "pink pepper", "peony", "jasmine", "turkish rose", "white musk", "cashmeran", "cedar", "vanilla"], 2020, "Quentin Bisch", "Delina distilled into morning dew, lychee and peony over fresh jasmine and rose veiled in white musk."),
      this.make("Megamare", "Orto Parisi", "Aquatic Woody", "unisex", "", ["sea salt", "marine notes", "ambergris", "amber", "woody notes"], 2019, "Alessandro Gualtieri", "An oceanic bomb of salt and ambergris that smells like the open sea in a thunderstorm."),
      this.make("Eden Juicy Apple", "Kayali", "Fruity Floral", "women", "", ["red apple", "black currant", "bergamot", "jasmine", "peony", "rose", "vanilla", "amber", "musk"], 2023, "Unknown", "Crisp red apple and blackcurrant over jasmine and rose with a soft vanilla-amber bite, Eden's juiciest temptation."),
      this.make("Narciso Eau de Parfum Radiante", "Narciso Rodriguez", "Amber Floral", "women", "", ["white florals", "orange blossom", "musk", "amber", "woody notes"], 2025, "Unknown", "Sunlit white florals glowing over the house signature musk, amber and warm woods — the radiant 2025 evolution of the iconic narciso cube."),
      this.make("La Nuit Trésor Fleur de Nuit", "Lancome", "Oriental Floral", "women", "", ["damask rose", "tuberose", "jasmine", "mirabilis", "whipped cream", "macchiato", "patchouli"], 2023, "Unknown", "Damask rose dipped in midnight dew, blooming over tuberose, jasmine and mirabilis with a macchiato-whipped cream and patchouli base — Trésor reinvented as a moonlight garden."),
      this.make("La Nuit Trésor Vanille Noire", "Lancome", "Oriental Vanilla", "women", "", ["damask rose", "honey", "bourbon vanilla", "oud", "leather", "amber"], 2025, "Unknown", "Honeyed Damask rose absolute sheathed in leathery Bourbon vanilla and oud smoke, the darkest, most ambered chapter of the Trésor night."),
      this.make("La Vie Est Belle Vanille Nude", "Lancome", "Sweet Gourmand", "women", "", ["iris", "praline", "tahitian vanilla", "white musk", "amber", "patchouli"], 2019, "Unknown", "The iconic iris-praline gourmand stripped to bare vanilla skin, Tahitian vanilla and white musk over a gossamer amber glow."),
      this.make("Velvet Fantasy", "Montale", "Floral Oriental", "women", "", ["fruity notes", "citruses", "solar notes", "violet", "rose", "white musk", "incense", "amber"], 2020, "Unknown", "Sun-warmed fruits and citruses tumbling into violet and rose, dusted with white musk, incense and amber — Montale plush velveteen daydream."),
      this.make("Oud Wood Intense", "Tom Ford", "Woody Oud", "unisex", "", ["angelica", "ginger", "juniper", "oud", "cypress", "castoreum", "woody notes"], 2017, "Unknown", "The iconic oud intensified — angelica, ginger and juniper wrapped around dark oud and cypress, castoreum adding primal animalic heat."),
      this.make("Oud Nude", "Guerlain", "Woody Ambery", "unisex", "", ["raspberry", "almond", "cedar", "rose", "oud", "bourbon vanilla", "amber"], 2022, "Delphine Jelk", "Delphine Jelk sweet-woody L'Art & La Matière oud, raspberry and almond over cedar, rose and Bourbon vanilla — an oud worn unclothed."),
      this.make("Emporio Armani Diamonds", "Giorgio Armani", "Floral Fruity", "women", "", ["lychee", "raspberry", "freesia", "muguet", "rose", "vanilla", "patchouli", "cedar", "vetiver"], 2007, "Thierry Wasser", "Lychee and raspberry facet-cut over freesia, muguet and rose, sealed with vanilla, patchouli, cedar and vetiver — femininity cut like a gem."),
      this.make("Bleu Turquoise", "Giorgio Armani", "Amber Spicy", "unisex", "", ["ylang-ylang", "indian jasmine", "nagarmotha", "vanilla", "green moss", "sandalwood", "incense", "sea salt"], 2018, "Aurélien Guichard", "Aurélien Guichard's salt-swept Armani Privé, ylang-ylang and Indian jasmine over nagarmotha, drying into vanilla, green moss and sandy incense — a turquoise sea on warm rock."),
      this.make("Mudhila", "Swiss Arabian", "Amber Oriental", "unisex", "", ["cumin", "bergamot", "heliotrope", "jasmine", "bitter almond", "lavender", "amber", "vanilla", "sandalwood"], 2015, "Unknown", "Cumin and bergamot sharpened with heliotrope, unfolding into jasmine and bitter almond before settling on amber, vanilla and sandalwood — the house signature Gulf warmth."),
      this.make("Kalimat", "Swiss Arabian", "Amber Oriental", "unisex", "", ["saffron", "rose", "oud", "amber", "vanilla", "musk", "sandalwood"], 2016, "Unknown", "Words made of scent — saffron and rose folding into sweet oud, amber and musk, a fragrant language spoken in the golden tones of Gulf perfumery."),
      this.make("Chairman", "Yves de Sistelle", "Woody Spicy", "men", "", ["citrus", "green notes", "spices", "cedar", "vanilla", "wood", "musk"], 2010, "Unknown", "A sweet woody power play from the French house, green freshness melting into vanilla, cedar and warm spices — leadership bottled for the boardroom."),
      this.make("Magenta Tanzanite", "Giorgio Armani", "Floral Fruity", "women", "", ["bergamot", "red berries", "rose", "peony", "vanilla", "musk", "sandalwood"], 2022, "Unknown", "The Armani Privé gem-cut magenta floral, radiant rose and peony over warm woods and vanilla, faceted like the tanzanite it is named after."),
      this.make("Oud Cadenza", "Maison Crivelli", "Woody Oud", "unisex", "", ["violet", "iris", "oud", "cedar", "sandalwood", "amber"], 2024, "Unknown", "A perfumed flourish of violet and iris gliding over a cadence of oud, cedar and sandalwood — Crivelli's final chord struck in rare woods."),
      this.make("Madawi", "Arabian Oud", "Floral Oriental", "women", "", ["turkish rose", "jasmine", "vanilla", "musk", "amber", "sandalwood", "oud"], 2016, "Unknown", "Turkish rose and jasmine cascading over vanilla-oud warmth, a bridal shower of petals on warm Arabian stone."),
    ];

    const database = Object.fromEntries(fragrances.map((fragrance) => [fragrance.name, fragrance]));

    const catalog = (typeof window !== "undefined" && window.FRAGRANCE_CATALOG_DATA) || [];
    catalog.forEach((entry) => {
      if (!entry || !entry.name || database[entry.name]) return;
      database[entry.name] = {
        name: entry.name,
        brand: entry.brand || "",
        family: entry.family || "",
        audience: entry.audience || "",
        image: entry.image || "",
        description: entry.description || "",
        ingredients: entry.ingredients || [],
        year: entry.year || "",
        perfumer: entry.perfumer || "",
        concentration: entry.concentration || "",
        sizes: (entry.sizes || [])
          .map((size) => (typeof size === "string" ? size : size && size.size))
          .filter(Boolean),
        available: entry.available !== false,
      };
    });

    return database;
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
    const normalizedIngredients = (ingredients || [])
      .map((ingredient) => this.normalize(ingredient))
      .filter(Boolean);
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
      topBrands: Object.entries(brandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([brand, count]) => ({ brand, count })),
      topFamilies: Object.entries(familyCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([family, count]) => ({ family, count })),
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

// =================================================================
// SVG placeholder -> real Fragrantica CDN bottle image fix
// Injected here because this file is already loaded by index.html.
// Runs on DOMContentLoaded + two timed retries for dynamic renders.
// =================================================================
(function fixSvgPlaceholders() {
  var REAL_IMAGES = {
    'coolwater.svg':           'https://fimgs.net/mdimg/perfume/375x500.507.jpg',
    'milliongold.svg':         'https://fimgs.net/mdimg/perfume/375x500.95641.jpg',
    'fahrenheit.svg':          'https://fimgs.net/mdimg/perfume/375x500.228.jpg',
    'lacosteblue.svg':         'https://fimgs.net/mdimg/perfume/375x500.132382.jpg',
    'cerruti1881.svg':         'https://fimgs.net/mdimg/perfume/375x500.329.jpg',
    'velvetbdk.svg':           'https://fimgs.net/mdimg/perfume/375x500.68119.jpg',
    'amenfantasm.svg':         'https://fimgs.net/mdimg/perfume/375x500.93266.jpg',
    'tuxedo.svg':              'https://fimgs.net/mdimg/perfume/375x500.32269.jpg',
    'onemillionroyale.svg':    'https://fimgs.net/mdimg/perfume/375x500.79159.jpg',
    'yintensely.svg':          'https://fimgs.net/mdimg/perfume/375x500.79243.jpg',
    'ymenelixir.svg':          'https://fimgs.net/mdimg/perfume/375x500.90024.jpg',
    'bossintense.svg':         'https://fimgs.net/mdimg/perfume/375x500.29904.jpg',
    'onemillionelixir.svg':    'https://fimgs.net/mdimg/perfume/375x500.71708.jpg',
    'pineapple.svg':           'https://fimgs.net/mdimg/perfume/375x500.68226.jpg',
    'legendmontblanc.svg':     'https://fimgs.net/mdimg/perfume/375x500.11784.jpg',
    'azzarochrome.svg':        'https://fimgs.net/mdimg/perfume/375x500.788.jpg',
    'ombrenomade.svg':         'https://fimgs.net/mdimg/perfume/375x500.49755.jpg',
    'versacevanillerouge.svg': 'https://fimgs.net/mdimg/perfume/375x500.57701.jpg',
    'narcoticdelight.svg':     'https://fimgs.net/mdimg/perfume/375x500.89368.jpg',
    'dired.svg':               'https://fimgs.net/mdimg/perfume/375x500.5532.jpg',
    'themoon.svg':             'https://fimgs.net/mdimg/perfume/375x500.35973.jpg',
    'sospiroopera.svg':        'https://fimgs.net/mdimg/perfume/375x500.26282.jpg',
    'queenofsilk.svg':         'https://fimgs.net/mdimg/perfume/375x500.89643.jpg',
    'orza.svg':                'https://fimgs.net/mdimg/perfume/375x500.61873.jpg',
    'kajaldahab.svg':          'https://fimgs.net/mdimg/perfume/375x500.32266.jpg'
  };

  function applyFixes() {
    var imgs = document.querySelectorAll('img[src]');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var raw = img.getAttribute('src') || '';
      var file = raw.split('/').pop().split('?')[0];
      var real = REAL_IMAGES[file];
      if (real) img.src = real;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes);
  } else {
    applyFixes();
  }
  setTimeout(applyFixes, 800);
  setTimeout(applyFixes, 2500);
})();
