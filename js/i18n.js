/* js/i18n.js — light dependency-free internationalization for the static UI.
 * Translates the whole document by replacing exact English text nodes with
 * French equivalents (dictionary below), plus pattern matchers for counts,
 * relative times and ratings. Attributes (placeholder/aria/title) are handled
 * via data-i18n-* attributes. Selection persists in localStorage.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var SUPPORTED = ["en", "fr", "ar"];

  /* English -> French dictionary. Keys are the EXACT English strings found as
   * text nodes in the page. Brand names and proper nouns are intentionally left
   * untranslated (they are simply absent from the dictionary). */
  var FR = {
    /* ---- Nav / chrome ---- */
    "Home": "Accueil",
    "About": "À propos",
    "Services": "Services",
    "Contact": "Contact",
    "Fragrances": "Parfums",
    "Favorites": "Favoris",
    "Cart": "Panier",
    "Notifications": "Notifications",
    "News & Notifications": "Actualités & Notifications",
    "English": "Anglais",
    "Search": "Rechercher",
    "Search fragrances...": "Rechercher des parfums...",
    "Search for perfumes, brands, notes...": "Rechercher parfums, marques, notes...",
    "Search for any ingredient or note...": "Rechercher un ingrédient ou une note...",
    "My Favorites": "Mes favoris",
    "No favorites yet": "Aucun favori pour le moment",
    "No Favorites Yet": "Aucun favori pour le moment",
    "Choose Your Bottle": "Choisissez votre flacon",
    "Select Size": "Sélectionnez la taille",
    "Start Over": "Recommencer",
    "Your Perfect Matches": "Vos correspondances parfaites",
    "Answer 8 quick questions and discover fragrances that match your taste.": "Répondez à 8 questions rapides et découvrez les parfums qui correspondent à vos goûts.",
    "Start adding your favorite perfumes to see them here!": "Commencez à ajouter vos parfums préférés pour les voir ici !",
    "Based on your preferences, we recommend these fragrances:": "En fonction de vos préférences, nous vous recommandons ces parfums :",
    "Open Test": "Ouvrir le test",
    "A Fresh Green Escape": "Une évasion verte et fraîche",
    "A Modern Oud Masterpiece": "Un chef-d'œuvre d'oud moderne",
    "An Oriental Floral Masterpiece": "Un chef-d'œuvre oriental floral",
    "An Oriental Gourmand Adventure": "Une aventure orientale gourmande",
    "No notifications": "Aucune notification",
    "Retry": "Réessayer",
    "Settings": "Paramètres",
    "Sign In": "Se connecter",
    "Logout": "Se déconnecter",
    "Profile": "Profil",
    "Account": "Compte",
    "Admin Dashboard": "Panneau d'administration",
    "Client": "Client",
    "Clients": "Clients",
    "Last Login": "Dernière connexion",
    "Joined": "Inscrit",

    /* ---- Hero / sections ---- */
    "Charme": "Charme",
    "Curate your signature scent": "Composez votre parfum signature",
    "Find Your Signature": "Trouvez votre signature",
    "Explore Collection": "Explorer la collection",
    "Premium Collection": "Collection Premium",
    "Collection": "Collection",
    "Luxury fragrances, curated with care.": "Parfums de luxe, sélectionnés avec soin.",
    "Curated luxury scents - Parfums de Marly, crafted for the discerning.": "Parfums de luxe sélectionnés - Parfums de Marly, créés pour les connaisseurs.",
    "Join our community of fragrance enthusiasts": "Rejoignez notre communauté d'amateurs de parfums",
    "Curating your personal selection...": "Composition de votre sélection personnelle...",
    "Matching Fragrances": "Parfums correspondants",
    "Find Matches": "Trouver des correspondances",
    "New Search": "Nouvelle recherche",
    "Fragrances featuring your selected notes": "Parfums contenant les notes sélectionnées",
    "Find your perfect fragrance by exploring specific": "Trouvez votre parfum parfait en explorant des",
    "ingredients and notes": "ingrédients et notes",
    "fragrance?": "parfum ?",
    "Latest News & Updates": "Dernières actualités",
    "Loading latest news...": "Chargement des actualités...",
    "Loading notifications...": "Chargement des notifications...",
    "Clear All": "Tout effacer",
    "Clear Cart": "Vider le panier",

    /* ---- Marquee ---- */
    "Complimentary shipping on orders over $150 • Now stocking Parfums de Marly • Authenticity guaranteed": "Livraison offerte dès 150 $ • Parfums de Marly en stock • Authenticité garantie",
    "Complimentary shipping on orders over $150 · Now stocking Parfums de Marly · Authenticity guaranteed": "Livraison offerte dès 150 $ · Parfums de Marly en stock · Authenticité garantie",

    /* ---- Product cards ---- */
    "Add to Favorites": "Ajouter aux favoris",
    "Add to Cart": "Ajouter au panier",
    "Choose Your Preference": "Choisissez votre préférence",
    "Select Quality": "Choisir la qualité",
    "Select Concentration": "Choisir la concentration",
    "Scent Profile": "Profil olfactif",
    "Scent DNA": "ADN olfactif",
    "Premium": "Premium",
    "dt": "DT",
    "Free": "Offert",
    "out": "épuisé",

    /* ---- Quality / concentration ---- */
    "Eau de Parfum": "Eau de Parfum",
    "Eau de Toilette": "Eau de Toilette",
    "Parfum": "Parfum",
    "PARFUM": "PARFUM",
    "EDP": "EDP",
    "EDT": "EDT",
    "Standard Quality": "Qualité standard",
    "Top Quality": "Qualité supérieure",
    "Extra Quality": "Qualité extra",
    "Premium concentration": "Concentration premium",
    "Premium oil formulation": "Formulation premium",
    "Identical Quality": "Qualité identique",
    "High-quality alternative": "Alternative haute qualité",
    "Light & fresh": "Légère et fraîche",
    "Classic fresh formulation": "Formulation fraîche classique",
    "Classic warm blend": "Mélange chaleureux classique",
    "Intensified formula": "Formule intensifiée",
    "Maximum intensity": "Intensité maximale",
    "Deeper concentration": "Concentration plus profonde",
    "Deeper expression": "Expression plus profonde",
    "Deep & balanced": "Profond et équilibré",
    "Deeper & warmer": "Plus profond et plus chaud",
    "Fresh sporty blend": "Mélange frais et sportif",
    "Fresh aromatic blend": "Mélange frais et aromatique",
    "Fresh & bright": "Fraîche et lumineuse",
    "Ocean-inspired blend": "Mélange inspiré de l'océan",
    "Italian elegance blend": "Mélange d'élégance italienne",
    "Dark oriental blend": "Mélange oriental sombre",
    "Bold spicy formula": "Formule épicée audacieuse",
    "Intense & lasting": "Intense et durable",
    "Lasting trail": "Sillage persistant",

    /* ---- Fragrance profile ---- */
    "Note Pyramid": "Pyramide olfactive",
    "Notes Pyramid": "Pyramide olfactive",
    "Fragrance DNA": "ADN du parfum",
    "Fragrance DNA Analysis": "Analyse ADN du parfum",
    "Ingredients": "Ingrédients",
    "Ingredients & Accords": "Ingrédients & accords",
    "TOP NOTES": "NOTES DE TÊTE",
    "MIDDLE NOTES": "NOTES DE CŒUR",
    "BASE NOTES": "NOTES DE FOND",
    "Top Notes": "Notes de tête",
    "Heart Notes": "Notes de cœur",
    "Base Notes": "Notes de fond",
    "HEART": "CŒUR",
    "OPENING": "OUVERTURE",
    "DRY DOWN": "FOND",
    "DAWN BASE": "FOND AUBE",
    "FIRST BITE": "PREMIÈRE IMPRESSION",
    "GOLDEN HEART": "CŒUR DORÉ",
    "MIDNIGHT HEART": "CŒUR DE MINUIT",
    "OPENING SPARK": "ÉCLAT D'OUVERTURE",
    "OPENING WOOD": "BOIS D'OUVERTURE",
    "LASTING WARMTH": "CHALEUR PERSISTANTE",
    "COMPOSITION BREAKDOWN": "COMPOSITION EN DÉTAIL",
    "OLFACTORY PROFILE": "PROFIL OLFACTIF",
    "FRAGRANCE NARRATIVE": "RÉCIT OLFACTIF",
    "INSPIRED BY": "INSPIRÉ PAR",
    "The Story": "L'histoire",
    "Crafted by": "Créé par",
    "GENDER": "GENRE",
    "LONGEVITY": "TENUE",
    "SILLAGE": "SILLAGE",
    "PROJECTION": "PROJECTION",
    "PRICE VALUE": "RAPPORT QUALITÉ/PRIX",
    "VALUE": "VALEUR",
    "PERFORMANCE": "PERFORMANCE",
    "OCCASION": "OCCASION",
    "Mood": "Ambiance",
    "Best Seasons": "Meilleures saisons",
    "Foundation & Longevity": "Base & tenue",
    "Overall Intensity": "Intensité globale",
    "Projection": "Projection",
    "Longevity": "Tenue",
    "Versatility": "Polyvalence",
    "Sillage": "Sillage",
    "Value": "Rapport qualité/prix",
    "Performance": "Performance",
    "First impression": "Première impression",
    "Fresh & Initial Impressions": "Fraîcheur & premières impressions",
    "Olfactory Characteristics": "Caractéristiques olfactives",

    /* ---- Reviews ---- */
    "User Reviews & Comments": "Avis & commentaires",
    "0 reviews": "0 avis",
    "Your Name": "Votre nom",
    "Your Rating:": "Votre note :",
    "Load More Reviews": "Charger plus d'avis",
    "Submit Review": "Publier l'avis",
    "Post Review": "Publier l'avis",
    "Share Your Experience": "Partagez votre expérience",
    "Sign In to Review": "Connectez-vous pour laisser un avis",
    "Share your experience with": "Partagez votre expérience avec",
    "Sign in to write a review and share your": "Connectez-vous pour écrire un avis et partager votre",
    "Write your review...": "Écrivez votre avis...",
    "Your Avatar": "Votre avatar",
    "Share": "Partager",
    "Save": "Enregistrer",
    "Cancel": "Annuler",
    "by": "par",
    "Posted by u/scent_enthusiast": "Publié par u/scent_enthusiast",
    "u/scent_enthusiast": "u/scent_enthusiast",
    "r/fragrance": "r/fragrance",
    "no vote": "sans vote",
    "votes": "votes",
    "Perfume rating": "Note du parfum",
    "overall from": "note globale de",
    "love": "j'adore",
    "like": "j'aime",
    "dislike": "je n'aime pas",
    "hate": "je déteste",
    "ok": "ok",
    "Submit": "Envoyer",
    "Reply": "Répondre",

    /* ---- Auth / forms ---- */
    "Login": "Connexion",
    "Register": "S'inscrire",
    "Create Account": "Créer un compte",
    "Create your account": "Créez votre compte",
    "Create one": "Créer un compte",
    "Don't have an account?": "Vous n'avez pas de compte ?",
    "or continue with email": "ou continuer avec l'e-mail",
    "or create account with email": "ou créer un compte avec l'e-mail",
    "Email": "E-mail",
    "Email Address": "Adresse e-mail",
    "Password": "Mot de passe",
    "First Name": "Prénom",
    "Last Name": "Nom",
    "Name": "Nom",
    "Confirm Password": "Confirmer le mot de passe",
    "Password must be at least 8 characters": "Le mot de passe doit contenir au moins 8 caractères",
    "Forgot password?": "Mot de passe oublié ?",
    "Google Sign-In temporarily unavailable": "Connexion Google temporairement indisponible",
    "I agree to the": "J'accepte les",
    "Change Password": "Changer le mot de passe",
    "Change Photo": "Changer la photo",
    "Delete Account": "Supprimer le compte",
    "Enter 6-digit code": "Saisissez le code à 6 chiffres",
    "Didn't receive the code? Check your spam": "Vous n'avez pas reçu le code ? Vérifiez vos spams",
    "folder or click \"Resend Code\"": "dossier ou cliquez sur « Renvoyer le code »",
    "Next": "Suivant",
    "Back": "Retour",
    "Message": "Message",
    "Send": "Envoyer",
    "Connect": "Se connecter",
    "Email notifications": "Notifications par e-mail",
    "Get text messages for order updates": "Recevoir des SMS pour le suivi des commandes",
    "Help us improve by sharing usage data": "Aidez-nous à améliorer en partageant vos données d'utilisation",
    "Cookies": "Cookies",
    "Privacy": "Confidentialité",
    "Terms": "Conditions",
    "Newsletter": "Newsletter",
    "Subscribe": "S'abonner",

    /* ---- Seasons / gender / occasion ---- */
    "winter": "hiver",
    "spring": "printemps",
    "summer": "été",
    "fall": "automne",
    "Winter": "Hiver",
    "Spring": "Printemps",
    "Summer": "Été",
    "Fall": "Automne",
    "day": "jour",
    "night": "soir",
    "Evening": "Soirée",
    "Evening/Special": "Soirée/Spécial",
    "Casual": "Décontracté",
    "male": "homme",
    "female": "femme",
    "unisex": "unisexe",
    "more male": "plutôt masculin",
    "more female": "plutôt féminin",

    /* ---- Performance scales ---- */
    "very weak": "très faible",
    "weak": "faible",
    "moderate": "modérée",
    "long lasting": "tenue longue",
    "eternal": "éternelle",
    "intimate": "intime",
    "strong": "forte",
    "enormous": "énorme",
    "Moderate": "Modérée",
    "Moderate-High": "Modérée à élevée",
    "Moderate-Strong": "Modérée à forte",
    "Strong": "Forte",
    "High": "Élevée",
    "Very High": "Très élevée",
    "Medium": "Moyenne",
    "Low": "Faible",
    "Long": "Longue",
    "way overpriced": "beaucoup trop cher",
    "overpriced": "trop cher",
    "good value": "bon rapport qualité/prix",
    "great value": "excellent rapport qualité/prix",

    /* ---- Accords & descriptors ---- */
    "Amber": "Ambre",
    "amber": "ambre",
    "Woody": "Boisé",
    "woody": "boisé",
    "Wood": "Bois",
    "Floral": "Floral",
    "Fresh": "Frais",
    "fresh": "frais",
    "Sweet": "Doux",
    "sweet": "doux",
    "Warm": "Chaleureux",
    "warm": "chaleureux",
    "Spicy": "Épicé",
    "spicy": "épicé",
    "Aromatic": "Aromatique",
    "aromatic": "aromatique",
    "Powder": "Poudre",
    "Powdery": "Poudré",
    "Musk": "Musc",
    "musk": "musc",
    "Oud": "Oud",
    "oud": "oud",
    "Leather": "Cuir",
    "leather": "cuir",
    "Leathery": "Cuiré",
    "Oriental": "Oriental",
    "Citrus": "Agrumes",
    "citrus": "agrumes",
    "Fruity": "Fruité",
    "Green": "Vert",
    "green": "vert",
    "Gourmand": "Gourmand",
    "Aquatic": "Aquatique",
    "Smoky": "Fumé",
    "Dark": "Sombre",
    "dark": "sombre",
    "Earthy": "Terreux",
    "Herbal": "Herbacé",
    "Marine": "Marin",
    "Minty": "Mentholé",
    "Musky": "Musqué",
    "Ozonic": "Ozonique",
    "Resinous": "Résineux",
    "Chypre": "Chypre",
    "Boozy": "Alcoolisé",
    "Creamy": "Crémeux",
    "Crisp": "Croquant",
    "Bright": "Éclatant",
    "Clean": "Propre",
    "Complex": "Complexe",
    "Deep": "Profond",
    "Delicate": "Délicat",
    "Elegant": "Élégant",
    "Energetic": "Énergique",
    "Exotic": "Exotique",
    "Fiery": "Ardent",
    "Hot": "Chaud",
    "Juicy": "Juteux",
    "Luminous": "Lumineux",
    "Lush": "Généreux",
    "Luxurious": "Luxueux",
    "Magnetic": "Magnétique",
    "Meditative": "Méditatif",
    "Mysterious": "Mystérieux",
    "Noble": "Noble",
    "Opulent": "Opulent",
    "Rich": "Riche",
    "Refined": "Raffiné",
    "Smooth": "Doux",
    "Intense": "Intense",
    "Bold": "Audacieux",
    "Confident": "Assuré",
    "Cool": "Frais",
    "Crystal": "Cristal",
    "Modern": "Moderne",
    "Powerful": "Puissant",
    "Radiant": "Radieux",
    "Seductive": "Séducteur",
    "Sensual": "Sensuel",
    "Sophisticated": "Raffiné",
    "Sporty": "Sportif",
    "Tropical": "Tropical",
    "Addictive": "Addictif",
    "Futuristic": "Futuriste",
    "Daring": "Audacieux",
    "Golden": "Doré",
    "Creamy": "Crémeux",
    "Regal": "Royal",
    "Precious": "Précieux",
    "Majestic": "Majestueux",
    "Heavenly": "Céleste",
    "Smoky": "Fumé",
    "Dry": "Sec",
    "Extreme": "Extrême",
    "Electric": "Électrique",
    "Mythical": "Mythique",
    "Passionate": "Passionné",
    "Explosive": "Explosif",
    "Honeyed": "Mielleux",
    "Iconic": "Iconique",
    "Classic": "Classique",
    "Natural": "Naturel",
    "Pure": "Pur",
    "Authentic": "Authentique",
    "Opulent": "Opulent",
    "Refined": "Raffiné",
    "Balanced": "Équilibré",
    "Warm": "Chaleureux",

    /* ---- Notes & ingredients ---- */
    "bergamot": "bergamote",
    "Bergamot": "Bergamote",
    "vanilla": "vanille",
    "Vanilla": "Vanille",
    "cedar": "cèdre",
    "Cedar": "Cèdre",
    "cedarwood": "bois de cèdre",
    "Cedarwood": "Bois de cèdre",
    "jasmine": "jasmin",
    "Jasmine": "Jasmin",
    "sandalwood": "bois de santal",
    "Sandalwood": "Bois de santal",
    "rose": "rose",
    "Rose": "Rose",
    "lavender": "lavande",
    "Lavender": "Lavande",
    "pink pepper": "poivre rose",
    "Pink Pepper": "Poivre rose",
    "black pepper": "poivre noir",
    "Black Pepper": "Poivre noir",
    "patchouli": "patchouli",
    "Patchouli": "Patchouli",
    "cinnamon": "cannelle",
    "Cinnamon": "Cannelle",
    "cardamom": "cardamome",
    "Cardamom": "Cardamome",
    "saffron": "safran",
    "Saffron": "Safran",
    "geranium": "géranium",
    "Geranium": "Géranium",
    "iris": "iris",
    "Iris": "Iris",
    "vetiver": "vétiver",
    "Vetiver": "Vétiver",
    "tonka bean": "fève tonka",
    "Tonka Bean": "Fève tonka",
    "benzoin": "benjoin",
    "Benzoin": "Benjoin",
    "oakmoss": "mousse de chêne",
    "Oakmoss": "Mousse de chêne",
    "incense": "encens",
    "Incense": "Encens",
    "lemon": "citron",
    "Lemon": "Citron",
    "mandarin": "mandarine",
    "Mandarin": "Mandarine",
    "Mandarin Orange": "Mandarine",
    "orange blossom": "fleur d'oranger",
    "Orange Blossom": "Fleur d'oranger",
    "pear": "poire",
    "raspberry": "framboise",
    "peony": "pivoine",
    "Peony": "Pivoine",
    "violet": "violette",
    "Violet": "Violette",
    "apple": "pomme",
    "Apple": "Pomme",
    "pineapple": "ananas",
    "Pineapple": "Ananas",
    "grapefruit": "pamplemousse",
    "Grapefruit": "Pamplemousse",
    "mint": "menthe",
    "Mint": "Menthe",
    "rosemary": "romarin",
    "Rosemary": "Romarin",
    "sage": "sauge",
    "Sage": "Sauge",
    "clary sage": "sauge sclarée",
    "Clary Sage": "Sauge sclarée",
    "ginger": "gingembre",
    "Ginger": "Gingembre",
    "nutmeg": "muscade",
    "Nutmeg": "Muscade",
    "heliotrope": "héliotrope",
    "Heliotrope": "Héliotrope",
    "tobacco": "tabac",
    "Tobacco": "Tabac",
    "honey": "miel",
    "Honey": "Miel",
    "neroli": "néroli",
    "Neroli": "Néroli",
    "freesia": "freesia",
    "pepper": "poivre",
    "Pepper": "Poivre",
    "coriander": "coriandre",
    "ambergris": "ambre gris",
    "Ambergris": "Ambre gris",
    "ambroxan": "ambroxan",
    "Ambroxan": "Ambroxan",
    "cashmeran": "cashmeran",
    "lychee": "litchi",
    "fig": "figue",
    "tuberose": "tubéreuse",
    "Ylang Ylang": "Ylang-ylang",
    "mimosa": "mimosa",
    "cocoa": "cacao",
    "Cocoa": "Cacao",
    "coffee": "café",
    "Coffee": "Café",
    "chocolate": "chocolat",
    "Chocolate": "Chocolat",
    "caramel": "caramel",
    "Caramel": "Caramel",
    "almond": "amande",
    "Almond": "Amande",
    "cherry": "cerise",
    "Cherry": "Cerise",
    "coconut": "noix de coco",
    "Coconut": "Noix de coco",
    "milk": "lait",
    "matcha": "matcha",
    "Matcha": "Matcha",
    "white musk": "musc blanc",
    "White Musk": "Musc blanc",
    "green tea": "thé vert",
    "suede": "suède",
    "orris": "iris",
    "Orris": "Iris",
    "guaiac wood": "bois de gaïac",
    "Guaiac Wood": "Bois de gaïac",
    "ebony": "ébène",
    "Ebony": "Ébène",
    "blackcurrant": "cassis",
    "Blackcurrant": "Cassis",
    "cassis": "cassis",
    "violet leaf": "feuille de violette",
    "Bulgarian Rose": "Rose de Bulgarie",
    "Turkish Rose": "Rose de Turquie",
    "Madagascar Vanilla": "Vanille de Madagascar",
    "Bourbon Vanilla": "Vanille Bourbon",
    "golden amber": "ambre doré",
    "oak": "chêne",
    "moss": "mousse",
    "Moss": "Mousse",
    "cypress": "cyprès",
    "juniper": "genévrier",
    "juniper berries": "baies de genièvre",
    "birch": "bouleau",
    "Birch": "Bouleau",
    "labdanum": "labdanum",
    "Labdanum": "Labdanum",
    "olibanum": "oliban",
    "Frankincense": "Encens",
    "myrrh": "myrrhe",
    "galbanum": "galbanum",
    "elemi": "élémi",
    "flint": "silex",
    "Mineral": "Minéral",
    "mineral": "minéral",
    "Metallic Notes": "Notes métalliques",
    "hazelnut": "noisette",
    "chestnut": "châtaigne",
    "kulfi": "kulfi",
    "custard": "crème anglaise",
    "marshmallow": "guimauve",
    "cotton candy": "barbe à papa",
    "Dried Fruits": "Fruits secs",
    "Blood Orange": "Orange sanguine",
    "Bitter Orange": "Orange amère",
    "Bitter Almond": "Amande amère",
    "Citron": "Cédrat",
    "kiwi": "kiwi",
    "melon": "melon",
    "papaya": "papaye",
    "peach": "pêche",
    "strawberry": "fraise",
    "Grape": "Raisin",
    "caraway": "carvi",
    "cumin": "cumin",
    "Oregano": "Origan",
    "thyme": "thym",
    "basil": "basilic",
    "Mushroom": "Champignon",
    "datura": "datura",
    "bluebell": "campanule",
    "hawthorn": "aubépine",
    "honeysuckle": "chèvrefeuille",
    "lotus": "lotus",
    "lily": "lys",
    "Lily": "Lys",
    "Lily of the Valley": "Muguet",
    "Magnolia": "Magnolia",
    "Narcissus": "Narcisse",
    "Orchid": "Orchidée",
    "Gardenia": "Gardénia",
    "Pelargonium": "Pélargonium",
    "Jasmine Grandiflorum": "Jasmin grandiflorum",
    "jasmine sambac": "jasmin sambac",
    "Night Blooming Jasmine": "Jasmin de nuit",
    "Cherry Blossom": "Fleur de cerisier",
    "Green Leaves": "Feuilles vertes",
    "Green Apple": "Pomme verte",
    "golden apple": "pomme dorée",
    "Black Cherry": "Cerise noire",
    "cherry liqueur": "liqueur de cerise",
    "Black Currant": "Cassis",
    "black currant": "cassis",
    "Black Spices": "Épices noires",
    "black truffle": "truffe noire",
    "olive flower": "fleur d'olivier",
    "carnation": "œillet",
    "clove": "girofle",
    "Cloves": "Girofle",
    "cucumber": "concombre",
    "lime": "citron vert",
    "Lemon Verbena": "Verveine citronnée",
    "Peppermint": "Menthe poivrée",
    "Spearmint": "Menthe verte",
    "Eucalyptus": "Eucalyptus",
    "mate": "maté",
    "champagne accord": "accord de champagne",
    "marine accord": "accord marin",
    "Carrot Seeds": "Graines de carotte",
    "Fir Resin": "Résine de sapin",
    "Rosewood": "Bois de rose",
    "Cashmere Wood": "Bois de cachemire",
    "Dry Wood": "Bois sec",
    "Ebony Wood": "Bois d'ébène",
    "Oud Wood": "Bois d'oud",
    "amberwood": "bois ambré",
    "Musk Rose": "Rose musquée",
    "French Orris": "Iris français",
    "Mysore Sandalwood": "Bois de santal de Mysore",
    "Green Mandarin": "Mandarine verte",
    "Green Accord": "Accord vert",
    "Golden Oud": "Oud doré",
    "Golden Amber": "Ambre doré",

    /* ---- Common narrative fragments ---- */
    "fragrance for women and men.": "parfum pour femme et pour homme.",
    "Floral fragrance for women and men.": "Parfum floral pour femme et pour homme.",
    "continues to captivate fragrance enthusiasts worldwide.": "continue de captiver les amateurs de parfums du monde entier.",
    "fragrance for the man who lets his actions speak louder than words.": "parfum pour l'homme qui laisse ses actes parler plus fort que les mots.",
    "is liquid indulgence. Imagine a luxurious gentleman's": "est une indulgence liquide. Imaginez le parfum d'un gentleman raffiné",
    "is pure temptation in a bottle. An intoxicating burst": "est une pure tentation en flacon. Une bouffée enivrante",
    "is the epitome of understated elegance. A harmonious": "est l'incarnation de l'élégance discrète. Une harmonie",
    "is the ultimate seduction fragrance. The interplay": "est le parfum de la séduction ultime. Le jeu",
    "the opening": "l'ouverture",
    "masculine.": "masculin.",
    "fragrance. If you love fresh, green scents,": "parfum. Si vous aimez les senteurs fraîches et vertes,",
    "first 4-5 hours. It's definitely more of a": "les 4-5 premières heures. C'est définitivement un parfum plus",
    "hours on my skin with good projection for": "heures sur ma peau avec un bon sillage pendant",
    "hug. Performance is solid - easily 8-10": "sur ma peau. La tenue est solide - facilement 8-10",
    "hot days. Performance is solid too - easily": "chaudes. La tenue est également solide - facilement",
    "day at work. This is definitely going on my": "au travail. Il va définitivement rejoindre ma",
    "day. It's definitely more suited for cooler": "de la journée. Il convient mieux aux températures plus fraîches",
    "full bottle wishlist. The longevity is": "liste de flacons à acheter. La tenue est",
    "fragrance I've ever smelled! The opening": "parfum que j'ai jamais senti ! L'ouverture",
    "divine - it's like walking through a fresh": "divin - c'est comme marcher dans un",
    "garden after rain. The mint gives it this": "jardin après la pluie. La menthe lui donne cet",
    "can still smell it on my clothes the next": "je le sens encore sur mes vêtements le lendemain",
    "insane - still smelling it 8 hours later!\"": "incroyable - je le sens encore 8 heures plus tard !\"",
    "is my signature scent now.\"": "est maintenant mon parfum signature.\"",
    "edge that makes it incredibly addictive. The": "filière qui le rend incroyablement addictif. Le",
    "interesting. The longevity is impressive - I": "intéressant. La tenue est impressionnante - je",
    "notes are Vetiver, Sage and Basil; base notes are": "notes sont le vétiver, la sauge et le basilic ; les notes de fond sont",
    "Jasmine and Bitter Almond; base notes are Vanilla,": "jasmin et amande amère ; les notes de fond sont la vanille,",
    "Jasmine; base notes are Vanilla, Cardamom,": "jasmin ; les notes de fond sont la vanille, la cardamome,",
    "Orange; middle notes are Geranium, Violet and": "orange ; les notes de cœur sont le géranium, la violette et",
    "foundation of": "fondation de",
    "intertwined with powdery": "entrelacé avec des notes poudrées",
    "note intertwined with earthy": "note entrelacée avec des notes terreuses",
    "blend of citrus and mint opens into a sophisticated heart of ginger and nutmeg,": "mélange d'agrumes et de menthe s'ouvre sur un cœur sophistiqué de gingembre et de muscade,",
    "club where aged tobacco leaves mingle with sweet vanilla, dark chocolate, and aromatic": "club où les feuilles de tabac vieillies se mêlent à une vanille douce, un chocolat noir et des",
    "captivating and unique opening that sets it apart": "ouverture captivante et unique qui le distingue",
    "contemporary twist on traditional Middle": "touche contemporaine sur la tradition du Moyen",
    "Eastern perfumery.": "Orient en parfumerie.",
    "from conventional fragrances. This distinctive start": "des parfums conventionnels. Ce départ distinctif",
    "freshness of": "la fraîcheur de",
    "gorgeous vanilla and oud combination. The": "magnifique combinaison de vanille et d'oud. Le",
    "hints at the gourmand journey ahead.": "laisse présager le voyage gourmand qui s'annonce.",
    "iconic scent that's become synonymous with modern masculinity. The Sichuan pepper adds": "parfum iconique devenu synonyme de masculinité moderne. Le poivre du Sichuan apporte",
    "in 2007, this oriental spicy masterpiece": "en 2007, ce chef-d'œuvre oriental épicé",
    "in 2007, this woody oriental masterpiece": "en 2007, ce chef-d'œuvre oriental boisé",
    "in 2009, this oriental spicy masterpiece": "en 2009, ce chef-d'œuvre oriental épicé",
    "in 2010, this woody aromatic masterpiece": "en 2010, ce chef-d'œuvre aromatique boisé",
    "in 2015, this aromatic fougère masterpiece": "en 2015, ce chef-d'œuvre aromatique fougère",
    "in 2018, this oriental gourmand masterpiece": "en 2018, ce chef-d'œuvre oriental gourmand",
    "introduction perfectly captures the essence of a": "introduction capture parfaitement l'essence d'un",
    "lush, green landscape.": "paysage verdoyant et luxuriant.",
    "of fresh cardamom and deep cedar creates an irresistible magnetic pull. Lavender adds": "de cardamome fraîche et de cèdre profond crée un aimant irrésistible. La lavande apporte",
    "of ripe cherry and cherry liqueur opens with irresistible sweetness, while Turkish rose": "de cerise mûre et de liqueur de cerise s'ouvre sur une douceur irrésistible, tandis que la rose de Turquie",
    "of smoke gives it an edge. This is opulence bottled.": "de fumée lui donne un caractère. C'est l'opulence en flacon.",
    "opening creates an immediate sense of sophistication": "ouverture crée un sentiment immédiat de sophistication",
    "opening is this beautiful blend of bergamot": "ouverture est ce magnifique mélange de bergamote",
    "opening with heliotrope and cumin is so": "ouverture avec l'héliotrope et le cumin est si",
    "between freshness and warmth.": "entre fraîcheur et chaleur.",
    "between masculine and feminine elements. The base": "entre éléments masculins et féminins. Le fond",
    "energizing first impression. This bright": "première impression énergisante. Cette lumière",
    "features warm": "présente des notes chaudes",
    "is a Amber Aromatic fragrance. It was launched in 2015.": "est un parfum ambré aromatique. Lancé en 2015.",
    "is a Amber Floral fragrance.": "est un parfum ambré floral.",
    "is a Amber Spicy fragrance.": "est un parfum ambré épicé.",
    "is a Aquatic Aromatic fragrance.": "est un parfum aquatique aromatique.",
    "is a Aquatic Woody fragrance.": "est un parfum aquatique boisé.",
    "is a Aromatic Fougère fragrance. It was launched in 1989.": "est un parfum aromatique fougère. Lancé en 1989.",
    "is a Aromatic Green fragrance. It was launched in 1985.": "est un parfum aromatique vert. Lancé en 1985.",
    "is a Citrus Aromatic fragrance. It was launched in 2012.": "est un parfum d'agrumes aromatique. Lancé en 2012.",
    "is a Citrus Aromatic fragrance. It was launched in 2019.": "est un parfum d'agrumes aromatique. Lancé en 2019.",
    "is a Citrus Aromatic fragrance. Launched in 2021. A bright lemon-mint composition.": "est un parfum d'agrumes aromatique. Lancé en 2021. Une composition lumineuse de citron et de menthe.",
    "is a Floral Amber fragrance. It was launched in 2019.": "est un parfum floral ambré. Lancé en 2019.",
    "is a Floral fragrance. Launched in 2023.": "est un parfum floral. Lancé en 2023.",
    "is a Fougère Floral fragrance launched in 2019. The nose behind is Anne Flipo and Carlos Benaim.": "est un parfum floral fougère lancé en 2019. Le nez est Anne Flipo et Carlos Benaim.",
    "is a Fresh Gourmand fragrance. Launched in 2024.": "est un parfum frais gourmand. Lancé en 2024.",
    "is a Fresh Green": "est un parfum frais vert",
    "is a Gourmand Floral fragrance. Launched in 2024.": "est un parfum gourmand floral. Lancé en 2024.",
    "is a Leather Chypre fragrance. It was launched in 2007.": "est un parfum cuir chypre. Lancé en 2007.",
    "is a Leather Oriental fragrance.": "est un parfum cuir oriental.",
    "is a Leather Oriental fragrance. It was launched in 2014.": "est un parfum cuir oriental. Lancé en 2014.",
    "is a Oriental": "est un parfum oriental",
    "is a Oriental Floral fragrance.": "est un parfum oriental floral.",
    "is a Oriental Gourmand": "est un parfum oriental gourmand",
    "is a Oriental Gourmand fragrance. It was launched in 2011.": "est un parfum oriental gourmand. Lancé en 2011.",
    "is a Oriental Woody fragrance. It was launched in 2012.": "est un parfum oriental boisé. Lancé en 2012.",
    "is a Spicy Oriental fragrance.": "est un parfum oriental épicé.",
    "is a Sweet Oriental fragrance.": "est un parfum oriental doux.",
    "is a Sweet Smoky fragrance.": "est un parfum doux fumé.",
    "is a Woody Aquatic fragrance. Launched in 2024.": "est un parfum aquatique boisé. Lancé en 2024.",
    "is a Woody Aromatic fragrance.": "est un parfum boisé aromatique.",
    "is a Woody Aromatic fragrance. It was launched in 2019.": "est un parfum boisé aromatique. Lancé en 2019.",
    "is a Woody Floral fragrance. It was launched in 2007.": "est un parfum floral boisé. Lancé en 2007.",
    "is a Woody Floral Musk fragrance. It was launched in 1993.": "est un parfum floral musqué boisé. Lancé en 1993.",
    "is a Woody Fruity fragrance.": "est un parfum boisé fruité.",
    "is a Woody Spicy fragrance. It was launched in 2006. The nose behind this fragrance is Jean-Claude Ellena.": "est un parfum boisé épicé. Lancé en 2006. Le nez derrière ce parfum est Jean-Claude Ellena.",
    "is a Woody Spicy fragrance. It was launched in 2022.": "est un parfum boisé épicé. Lancé en 2022.",
    "is an Amber Floral fragrance. It was launched in 2016.": "est un parfum ambré floral. Lancé en 2016.",
    "is an Amber Floral fragrance. Launched in 2023.": "est un parfum ambré floral. Lancé en 2023.",
    "is an Amber Fruity fragrance. Launched in 2020.": "est un parfum ambré fruité. Lancé en 2020.",
    "is an Amber Spicy fragrance. It was launched in 2021.": "est un parfum ambré épicé. Lancé en 2021.",
    "is an Amber Vanilla fragrance. It was launched in 2018.": "est un parfum ambré vanillé. Lancé en 2018.",
    "is an Aromatic Aquatic fragrance. It was launched in 1994.": "est un parfum aromatique aquatique. Lancé en 1994.",
    "is an Aromatic Fougere fragrance.": "est un parfum aromatique fougère.",
    "is an Aromatic Fougère fragrance. It was launched in 2011.": "est un parfum aromatique fougère. Lancé en 2011.",
    "is an Aromatic Fougère fragrance. It was launched in 2017.": "est un parfum aromatique fougère. Lancé en 2017.",
    "is an Aromatic Spicy fragrance. It was launched in 2015.": "est un parfum aromatique épicé. Lancé en 2015.",
    "is an Aromatic Woody fragrance. It was launched in 2004.": "est un parfum aromatique boisé. Lancé en 2004.",
    "is an Aromatic Woody fragrance. It was launched in 2018.": "est un parfum aromatique boisé. Lancé en 2018.",
    "is an Iris Amber fragrance. It was launched in 2011. The nose behind this fragrance is François Demachy.": "est un parfum iris ambré. Lancé en 2011. Le nez derrière ce parfum est François Demachy.",
    "is an Oriental Floral fragrance. A warm golden blend of tuberose, jasmine, and sandalwood.": "est un parfum oriental floral. Un mélange doré et chaleureux de tubéreuse, jasmin et bois de santal.",
    "is an Oriental Floral fragrance. It was launched in 2018.": "est un parfum oriental floral. Lancé en 2018.",
    "is an Oriental Leather fragrance. It was launched in 2016.": "est un parfum cuir oriental. Lancé en 2016.",
    "is an Oriental Spicy fragrance. A dark, seductive blend of cinnamon, leather, and amber.": "est un parfum oriental épicé. Un mélange sombre et séduisant de cannelle, cuir et ambre.",
    "is an Oriental Spicy fragrance. It was launched in 2019.": "est un parfum oriental épicé. Lancé en 2019.",
    "nose behind this fragrance is Hamid Merati-Kashani.": "le nez derrière ce parfum est Hamid Merati-Kashani.",
    "oud reimagined for the modern gentleman -": "oud réimaginé pour le gentleman moderne -",
    "channels the raw beauty of desert landscapes at twilight.": "capture la beauté brute des paysages désertiques au crépuscule.",

    /* ---- Places ---- */
    "PARIS": "PARIS",
    "NEW YORK": "NEW YORK",
    "ITALY": "ITALIE",
    "FRANCE": "FRANCE",
    "DUBAI": "DUBAI",
    "LONDON": "LONDRES",
    "MILANO": "MILAN",
    "MILAN": "MILAN",
    "FIRENZE": "FLORENCE",
    "FLORENCE": "FLORENCE",
    "NAPOLI": "NAPLES",
    "ROMA": "ROME",
    "HAMBURG": "HAMBURG",
    "MUSCAT": "MUSCAT",
    "GERMANY": "ALLEMAGNE",
    "UNITED ARAB EMIRATES": "ÉMIRATS ARABES UNIS",

    /* ---- Generic UI / profile / account / forms ---- */
    "Profiles": "Profils",
    "You're all caught up!": "Vous êtes à jour !",
    "Unable to load": "Impossible de charger",
    "Please try again": "Veuillez réessayer",
    "Scent Profiler": "Analyseur de parfums",
    "Answer a few questions and we'll suggest fragrances you'll love.": "Répondez à quelques questions et nous vous suggérerons des parfums que vous adorerez.",
    "Start Profiling": "Commencer le test",
    "Question 1 of 8": "Question 1 sur 8",
    "Your Perfect Match": "Votre match parfait",
    "Sophisticated & Elegant": "Sophistiqué & Élégant",
    "View Fragrance": "Voir le parfum",
    "Retake Quiz": "Refaire le test",
    "Analyzing Your Preferences": "Analyse de vos préférences",
    "Sign Out": "Se déconnecter",
    "ENG": "ENG",
    "Français": "Français",
    "Search Fragrances": "Rechercher des parfums",
    "Popular Searches": "Recherches populaires",
    "Find your perfect fragrance by exploring specific ingredients and notes": "Trouvez votre parfum parfait en explorant des ingrédients et notes spécifiques",
    "The Soul & Character": "L'âme & le caractère",
    "Show All Fragrances": "Voir tous les parfums",
    "Selected Ingredients": "Ingrédients sélectionnés",
    "User Profile": "Profil utilisateur",
    "Administrator": "Administrateur",
    "Phone Number": "Numéro de téléphone",
    "Birthday": "Date d'anniversaire",
    "Save Changes": "Enregistrer les modifications",
    "✂️ Edit Profile Photo": "✂️ Modifier la photo de profil",
    "Size": "Taille",
    "Rotate": "Rotation",
    "Position": "Position",
    "Preview": "Aperçu",
    "This is how your profile photo will appear": "Voici à quoi ressemblera votre photo de profil",
    "Save Photo": "Enregistrer la photo",
    "Receive updates about new fragrances and offers": "Recevez des actualités sur les nouveaux parfums et les offres",
    "SMS notifications": "Notifications SMS",
    "Public profile": "Profil public",
    "Allow others to see your fragrance reviews": "Autoriser les autres à voir vos avis sur les parfums",
    "Analytics data collection": "Collecte de données analytiques",
    "Update your account password": "Mettre à jour le mot de passe de votre compte",
    "Permanently delete your account and data": "Supprimer définitivement votre compte et vos données",
    "Save Settings": "Enregistrer les paramètres",
    "Shopping Cart": "Panier d'achat",
    "Your cart is empty": "Votre panier est vide",
    "Start shopping and add your favorite fragrances to cart!": "Commencez vos achats et ajoutez vos parfums favoris au panier !",
    "Subtotal:": "Sous-total :",
    "Shipping:": "Livraison :",
    "Total:": "Total :",
    "Proceed to Checkout": "Passer à la caisse",
    "📧 Verify Your Email": "📧 Vérifiez votre e-mail",
    "Verify Email": "Vérifier l'e-mail",
    "Verifying...": "Vérification...",
    "Resend Code": "Renvoyer le code",
    "Sending...": "Envoi...",
    "Total Users": "Utilisateurs totaux",
    "Banned Users": "Utilisateurs bannis",
    "Admin Users": "Utilisateurs admin",
    "User Management": "Gestion des utilisateurs",
    "Status": "Statut",
    "Progression": "Progression",
    "Are you sure you want to ban": "Êtes-vous sûr de vouloir bannir",
    "Reason (optional):": "Raison (facultative) :",
    "Welcome to Parfumerie Charme": "Bienvenue chez Parfumerie Charme",
    "Sign in to your account": "Connectez-vous à votre compte",
    "Access your fragrance collection and personalized recommendations": "Accédez à votre collection de parfums et à vos recommandations personnalisées",
    "Remember me": "Se souvenir de moi",
    "Password must be at least 8 characters long": "Le mot de passe doit comporter au moins 8 caractères",
    "Terms of Service": "Conditions d'utilisation",
    "Privacy Policy": "Politique de confidentialité",
    "Already have an account?": "Vous avez déjà un compte ?",
    "Sign in": "Se connecter",
    "The Art of": "L'art du",
    "Fragrance": "Parfum",
    "Actions": "Actions",
    "and": "et",
    "Development": "Développement",
    "Professional": "Professionnel",
    "Company": "Entreprise",
    "Shipping": "Livraison",
    "Facebook": "Facebook",
    "Instagram": "Instagram",
    "© 2025 Parfumerie Charme. All rights reserved.": "© 2025 Parfumerie Charme. Tous droits réservés.",
    "Unable to load news": "Impossible de charger les actualités",
    "Please check your connection and try again.": "Veuillez vérifier votre connexion et réessayer.",
    "Points": "Points",
    "Ban User": "Bannir l'utilisateur",
    "Eau de Parfum by": "Eau de Parfum par",
    "EDP by": "EDP par",
    "out of 5 with": "sur 5 avec",
    "out of 5": "sur 5",
    "Share your experience": "Partagez votre expérience",
    "Richer concentration": "Concentration supérieure",
    "Superior concentration": "Concentration supérieure",
    "Richest concentration": "Concentration la plus riche",
    "Purest expression": "Expression la plus pure",
    "Premium blend": "Mélange premium",
    "Adventurous blend": "Mélange aventureux",
    "Amplified intensity": "Intensité amplifiée",
    "Sweet aromatic blend": "Mélange aromatique doux",
    "Smooth & intense": "Doux & intense",
    "Warm & rich": "Chaud & riche",
    "Richer & longer": "Plus riche & plus tenace",
    "Richer & darker": "Plus riche & plus sombre",
    "Sweet & boozy": "Sucré & alcoolisé",
    "Smooth & woody": "Doux & boisé",
    "Spicy & smooth": "Épicé & doux",
    "Beast Mode": "Mode Bête",
    "Scent Composition": "Composition du parfum",
    "POWERFUL": "PUISSANT",
    "Top • Heart • Base": "Tête • Cœur • Fond",
    "Top": "Tête",
    "Opening": "Ouverture",
    "Heart": "Cœur",
    "Middle": "Cœur",
    "Base": "Fond",
    "Drydown": "Fond",
    "Signature Accords": "Accords signature",
    "0-30 min": "0-30 min",
    "30min-2h": "30 min - 2 h",
    "2h+": "2 h et plus",
    "30min-4hrs": "30 min - 4 h",
    "4-12+ hrs": "4-12 h et plus",
    "0-15 min": "0-15 min",
    "15min-4hrs": "15 min - 4 h",
    "4-8+ hrs": "4-8 h et plus",
    "8-10 hours": "8-10 heures",
    "6-8 hours": "6-8 heures",
    "8-10+ hours": "8-10 h et plus",
    "8-12 hours": "8-12 heures",
    "10-12+ hours": "10-12 h et plus",
    "4-10+ hrs": "4-10 h et plus",
    "30min-2hr": "30 min - 2 h",
    "2hr+": "2 h et plus",
    "0 dt": "0 DT",
    "2.4k": "2,4 k",
    "2.8k": "2,8 k",
    "1.8k": "1,8 k",
    "3.1k": "3,1 k",
    "1.9k": "1,9 k",
    "2.2k": "2,2 k",
    "2.7k": "2,7 k",
    "3.2k": "3,2 k",
    "2.5k": "2,5 k",
    "2.1k": "2,1 k",
    "3.4k": "3,4 k",
    "1.6k": "1,6 k",
    "1.7k": "1,7 k",
    "🔄 Share": "🔄 Partager",
    "⭐ Save": "⭐ Enregistrer",
    "WARMTH INDEX": "INDICE DE CHALEUR",
    "LONGEVITY": "LONGEVITÉ",
    "SILLAGE": "SILLAGE",
    "GENDER": "GENRE",
    "PRICE VALUE": "RAPPORT QUALITÉ/PRIX",
    "VERSATILITY": "VERSATILITÉ",
    "SPICY": "ÉPICÉ",
    "SWEET": "SUCRÉ",
    "WOODY": "BOISÉ",
    "FRESH": "FRAIS",
    "AROMATIC": "AROMATIQUE",
    "SMOKY BASE": "FOND FUMÉ",
    "SWEET HEART": "CŒUR SUCRÉ",
    "TWILIGHT OPENING": "OUVERTURE CRÉPUSCULAIRE",
    "RESINOUS BASE": "FOND RÉSINEUX",
    "SACRED HEART": "CŒUR SACRÉ",
    "OUD": "OUD",
    "PROFILE": "PROFIL",
    "Fresh:": "Fraîcheur :",
    "Woody:": "Boisé :",
    "Spicy:": "Épicé :",
    "Sweet:": "Sucré :",
    "Aromatic:": "Aromatique :",
    "TOP": "TÊTE",
    "BASE": "FOND",
    "HEART NOTES": "NOTES DE CŒUR",
    "TOP NOTES": "NOTES DE TÊTE",
    "BASE NOTES": "NOTES DE FOND",
    "Middle Notes": "Notes de cœur",
    "Spicy Notes": "Notes épicées",
    "Woody Notes": "Notes boisées",
    "Marine Accord": "Accord marin",
    "Amber Wood": "Bois ambré",
    "Amberwood": "Bois ambré",
    "White Amber": "Ambre blanc",
    "Sea Notes": "Notes marines",
    "Sage Leaf": "Feuille de sauge",
    "Sichuan Pepper": "Poivre de Sichuan",
    "Virginia Cedar": "Cèdre de Virginie",
    "Black Truffle": "Truffe noire",
    "Cherry Liqueur": "Liqueur de cerise",
    "Jasmine Sambac": "Jasmin Sambac",
    "Tobacco Leaf": "Feuille de tabac",
    "Peru Balsam": "Baume du Pérou",

    /* ---- Notes & ingredients ---- */
    "Basil": "Basilic",
    "Aldehydes": "Aldéhydes",
    "Aldehyde": "Aldéhyde",
    "Pear": "Poire",
    "Juniper": "Genévrier",
    "Suede": "Suède",
    "Smoke": "Fumée",
    "Cashmeran": "Cashmeran",
    "Spice": "Épice",
    "Thyme": "Thym",
    "Cacao": "Cacao",
    "Cumin": "Cumin",
    "Marshmallow": "Guimauve",
    "Yuzu": "Yuzu",
    "Green Tea": "Thé vert",
    "Peach": "Pêche",
    "Strawberry": "Fraise",
    "Tuberose": "Tubéreuse",
    "Cypress": "Cyprès",
    "White Woods": "Bois blancs",
    "Styrax": "Styrax",
    "Praline": "Praline",
    "Hedione": "Hédione",
    "frankincense": "encens",
    "star anise": "anis étoilé",
    "rum": "rhum",
    "tonka": "tonka",
    "may rose": "rose de mai",
    "lily of the valley": "muguet",
    "tobacco leaf": "feuille de tabac",
    "tobacco blossom": "fleur de tabac",
    "Bay Leaf": "Feuille de laurier",
    "pine": "pin",
    "sea water": "eau de mer",
    "Lime": "Citron vert",
    "Tangerine": "Mandarine",
    "Sweet Orange": "Orange douce",
    "Petitgrain": "Petit-grain",
    "Pomelo": "Pamplemousse",
    "Violet Leaves": "Feuilles de violette",
    "Sea Breeze": "Brise marine",
    "Water": "Eau",
    "Rain": "Pluie",
    "Apricot": "Abricot",
    "Melon": "Melon",
    "Coriander": "Coriandre",
    "Freesia": "Freesia",
    "Mimosa": "Mimosa",
    "Carnation": "Œillet",
    "Honeysuckle": "Chèvrefeuille",
    "Lotus": "Lotus",
    "Star Anise": "Anis étoilé",
    "Bay Leaves": "Feuilles de laurier",
    "Fig": "Figue",
    "Coconut Milk": "Lait de coco",
    "Banana": "Banane",
    "Mahogany": "Acajou",
    "Oak": "Chêne",
    "Pine Wood": "Bois de pin",
    "Bamboo": "Bambou",
    "Myrrh": "Myrrhe",
    "Red Musk": "Musc rouge",
    "Black Musk": "Musc noir",
    "Ambrette": "Ambrette",
    "Tree Moss": "Mousse d'arbre",
    "Earth": "Terre",
    "Hazelnut": "Noisette",
    "Walnut": "Noix",
    "Coconut Cream": "Crème de coco",
    "Custard": "Crème anglaise",
    "Pipe Tobacco": "Tabac à pipe",
    "Ash": "Cendres",
    "Iso E Super": "Iso E Super",
    "Stone": "Pierre",
    "Salt": "Sel",
    "Raspberry": "Framboise",
    "Olibanum": "Oliban",
    "Storax": "Storax",
    "Agarwood": "Bois d'agar",
    "Agarwood (Oud)": "Bois d'agar (Oud)",
    "Cypriol": "Cypriol",
    "Sicilian Lemon": "Citron de Sicile",
    "Pimento": "Piment",
    "Tobacco": "Tabac",
    "Geranium": "Géranium",
    "Incense": "Encens",
    "Caraway": "Carvi",
    "Heliotrope": "Héliotrope",
    "Mint": "Menthe",
    "Pepper": "Poivre",
    "Green Apple": "Pomme verte",
    "Cedarwood": "Bois de cèdre",
    "Guaiac Wood": "Bois de gaïac",
    "Bitter Almond": "Amande amère",
    "Mandarin Orange": "Mandarine",
    "watermelon": "pastèque",
    "pink cyclamen": "cyclamen rose",
    "licorice": "réglisse",
    "orris butter": "beurre d'iris",
    "sea salt": "sel marin",
    "cattleya orchid": "orchidée cattleya",
    "poppy": "pavot",
    "white cedar": "cèdre blanc",
    "ylang ylang": "ylang-ylang",
    "ylang-ylang": "ylang-ylang",
    "aldehydes": "aldéhydes",
    "blood orange": "orange sanguine",
    "fir resin": "résine de sapin",
    "black orchid": "orchidée noire",
    "black vanilla": "vanille noire",
    "amber wood": "bois ambré",
    "bourbon vanilla": "vanille bourbon",
    "black spices": "épices noires",
    "orange blossom": "fleur d'oranger",
    "turkish rose": "rose turque",
    "sicilian mandarin": "mandarine de Sicile",
    "elemi": "élémi",
    "cacao": "cacao",
    "petrichor": "pétrichor",
    "earth": "terre",
    "osmanthus": "osmanthus",
    "Sea Water": "Eau de mer",

    /* ---- Descriptor / tag words ---- */
    "Mythical": "Mythique",
    "Sporty": "Sportif",
    "Energetic": "Énergique",
    "Bold": "Audacieux",
    "Modern": "Moderne",
    "Hypnotic": "Hypnotique",
    "Roman": "Romain",
    "Explosive": "Explosif",
    "Addictive": "Addictif",
    "Adventurous": "Aventureux",
    "Dark": "Sombre",
    "Leather": "Cuir",
    "Leathery": "Cuiré",
    "Seductive": "Séducteur",
    "Mysterious": "Mystérieux",
    "Intimate": "Intime",
    "Opulent": "Opulent",
    "Exotic": "Exotique",
    "Sensual": "Sensuel",
    "Powerful": "Puissant",
    "Honeyed": "Mielleux",
    "Regal": "Royal",
    "Electric": "Électrique",
    "Magnetic": "Magnétique",
    "Gourmand": "Gourmand",
    "Creamy": "Crémeux",
    "Cosy": "Chaleureux",
    "Juicy": "Juteux",
    "Tropical": "Tropical",
    "Radiant": "Radieux",
    "Alpine": "Alpin",
    "Mineral": "Minéral",
    "Urban": "Urbain",
    "Wild": "Sauvage",
    "Untamed": "Sauvage",
    "Tempting": "Tentant",
    "Irresistible": "Irrésistible",
    "Precious": "Précieux",
    "Rare": "Rare",
    "Luminous": "Lumineux",
    "Crystal": "Cristallin",
    "Noble": "Noble",
    "Refined": "Raffiné",
    "Iconic": "Iconique",
    "Meditative": "Méditatif",
    "Smoky": "Fumé",
    "Fruity": "Fruité",
    "Aquatic": "Aquatique",
    "Crisp": "Vif",
    "Elegant": "Élégant",
    "Chic": "Chic",
    "Nightly": "Nocturne",
    "Sovereign": "Souverain",
    "Daring": "Audacieux",
    "Golden": "Doré",
    "Timeless": "Intemporel",
    "Unisex": "Unisexe",
    "Effortless": "Sans effort",
    "Passionate": "Passionné",
    "Plush": "Moelleux",
    "Rich": "Riche",
    "Classic": "Classique",
    "Sophisticated": "Sophistiqué",
    "Natural": "Naturel",
    "Pure": "Pur",
    "Authentic": "Authentique",
    "Smooth": "Doux",
    "Spicy": "Épicé",
    "Woody": "Boisé",
    "Floral": "Floral",
    "Oriental": "Oriental",
    "Intense": "Intense",
    "Soft": "Doux",
    "Sharp": "Vif",
    "Light": "Léger",
    "Zesty": "Vif",
    "Romantic": "Romantique",
    "Metallic": "Métallique",
    "Tart": "Acidulé",
    "Mossy": "Moussu",
    "Red": "Rouge",
    "White": "Blanc",
    "Green": "Vert",
    "Orange": "Orange",
    "purple": "violet",
    "smoke": "fumée",
    "musk": "musc",
    "Musk": "Musc",
    "Wood": "Bois",
    "winter": "hiver",
    "spring": "printemps",
    "summer": "été",
    "fall": "automne",
    "day": "jour",
    "night": "nuit",
    "and aromatic": "et aromatique",
    "and sweet": "et sucré",
    "and fiery": "et enflammé",
    "and zesty": "et vif",
    "and delicate": "et délicat",
    "and sensual": "et sensuel",
    "and rich": "et riche",
    "and warm": "et chaud",
    "and dark": "et sombre",
    "and earthy": "et terreux",
    "and sparkling": "et pétillant",
    ", and warm": ", et chaud",
    ", smooth": ", doux",
    ", crisp": ", vif",
    "Warm Spicy": "Épicé chaud",
    "fresh spicy": "épicé frais",
    "warm spicy": "épicé chaud",
    "soft spicy": "épicé doux",
    "powdery": "poudré",
    "fruity": "fruité",
    "Rum": "Rhum",
    "Intellectual": "Intellectuel",
    "green apple": "pomme verte",
    "bitter almond": "amande amère",
    "bay leaf": "feuille de laurier",
    "bamboo": "bambou",
    "plum": "prune",
    "popcorn": "pop-corn",
    "aquatic": "aquatique",
    "metallic": "métallique",
    "woody notes": "notes boisées",
    "Toffee": "Caramel au beurre",
    "Flint": "Silex",
    "Water Lily": "Nénuphar",
    "Chestnut": "Châtaigne",
    "Elemi": "Élémi",
    "Horse Chestnut": "Marronnier",
    "Violet Leaf": "Feuille de violette",
    "Sicilian Citrus": "Agrumes de Sicile",
    "Spice Blend": "Mélange d'épices",
    "Patchouli Leaf": "Feuille de patchouli",
    "white amber": "ambre blanc",
    "tobacco flower": "fleur de tabac",
    "agarwood (oud)": "bois d'agar (oud)",
    "sea notes": "notes marines",
    "Virginia cedar": "cèdre de Virginie",
    "mandarin orange": "mandarine",

    /* ---- UI strings (verification, quiz, hero, cart) ---- */
    "What time of day do you usually wear fragrance?": "À quel moment de la journée portez-vous habituellement un parfum ?",
    "Start exploring our fragrances and add your favorites here!": "Commencez à explorer nos parfums et ajoutez vos favoris ici !",
    "We've sent a 6-digit verification code to your email address. Please enter it below to complete your registration.": "Nous avons envoyé un code de vérification à 6 chiffres à votre adresse e-mail. Saisissez-le ci-dessous pour terminer votre inscription.",
    "Didn't receive the code? Check your spam folder or click \"Resend Code\"": "Vous n'avez pas reçu le code ? Vérifiez votre dossier spam ou cliquez sur « Renvoyer le code »",
    "The verification code expires in 15 minutes": "Le code de vérification expire dans 15 minutes",
    "Curated luxury scents — Parfums de Marly, crafted for the discerning.": "Des senteurs de luxe sélectionnées — Parfums de Marly, créées pour les connaisseurs.",
    "sandalo": "santal",
    "fougère": "fougère",

    /* ---- Product narrative fragments ---- */
    "Versace Eros opens with an electrifying blast of cool": "Versace Eros s'ouvre avec un souffle électrisant de fraîche",
    ", creating an immediately energizing and youthful impression. The freshness is bold and unapologetic.": ", créant une impression immédiatement énergisante et juvénile. La fraîcheur est audacieuse et sans compromis.",
    ", while the base settles into clean": ", tandis que le fond s'installe sur un",
    ". Named after the Greek god of love, this fragrance is designed to conquer.": ". Nommé d'après le dieu grec de l'amour, ce parfum est conçu pour conquérir.",
    "is the epitome of understated elegance. A harmonious blend of citrus and mint opens into a sophisticated heart of ginger and nutmeg, while sandalwood and cedar provide a lasting, refined dry down. This is the fragrance for the man who lets his actions speak louder than words.": "est l'incarnation de l'élégance discrète. Un mélange harmonieux d'agrumes et de menthe s'ouvre sur un cœur sophistiqué de gingembre et de noix de muscade, tandis que le santal et le cèdre offrent un fond durable et raffiné. C'est le parfum de l'homme qui laisse ses actions parler plus fort que ses mots.",
    "Invictus opens with a tidal wave of": "Invictus s'ouvre avec une vague déferlante de",
    ", delivering an instant shot of energy and freshness. The sporty dynamism is evident from the very first spray.": ", offrant une dose instantanée d'énergie et de fraîcheur. Le dynamisme sportif se ressent dès la toute première vaporisation.",
    ", while the base grounds with warm": ", tandis que le fond s'ancre sur de chaleureux",
    ". The trophy-shaped bottle reflects its purpose — a scent designed for victory.": ". Son flacon en forme de trophée reflète sa mission — un parfum conçu pour la victoire.",
    "Y Eau de Parfum opens with a bold burst of crisp": "Y Eau de Parfum s'ouvre avec un éclat audacieux de croquante",
    ", creating a fresh and invigorating first impression. The sharpness is perfectly balanced, modern and confident.": ", créant une première impression fraîche et revigorante. La vivacité est parfaitement équilibrée, moderne et assurée.",
    ", while the base settles into warm": ", tandis que le fond s'installe sur de chaleureux",
    ". A versatile signature scent that works from boardroom to evening.": ". Une signature polyvalente qui s'adapte du bureau à la soirée.",
    "The One EDP opens with an invigorating burst of": "The One EDP s'ouvre avec une bouffée revigorante de",
    ", creating a warm and immediately appealing first impression. The citrus-spice balance is perfectly calibrated.": ", créant une première impression chaleureuse et immédiatement séduisante. L'équilibre agrumes-épices est parfaitement calibré.",
    "The heart unfolds with exotic": "Le cœur se déploie avec d'exotiques",
    ", while the base reveals rich": ", tandis que le fond révèle de riches",
    ". A refined gentleman's fragrance that embodies Italian sophistication.": ". Un parfum masculin raffiné qui incarne la sophistication italienne.",
    "Layton opens with a vibrant burst of crisp": "Layton s'ouvre avec un éclat vibrant de croquante",
    ", enhanced by the sparkling freshness of": ", rehaussé par la fraîcheur pétillante de",
    ". This invigorating opening creates an immediate sense of sophistication and modern elegance.": ". Cette ouverture revigorante crée un sentiment immédiat de sophistication et d'élégance moderne.",
    "The heart reveals a beautiful floral bouquet of": "Le cœur révèle un magnifique bouquet floral de",
    ", creating a perfect balance between masculine and feminine elements. The base settles into a warm, sensual foundation of creamy": ", créant un équilibre parfait entre éléments masculins et féminins. Le fond repose sur une base chaude et sensuelle de crémeux",
    "- making this a truly unisex masterpiece.": "- faisant de ce parfum un véritable chef-d'œuvre unisexe.",
    "Haltane opens with a sophisticated blend of": "Haltane s'ouvre avec un mélange sophistiqué de",
    ", creating an aromatic freshness enhanced by bright": ", créant une fraîcheur aromatique rehaussée par de lumineux",
    ". The heart reveals an ultra-modern interpretation with luxurious": ". Le cœur révèle une interprétation ultra-moderne avec de luxueux",
    ", offering a contemporary twist on traditional Middle Eastern perfumery.": ", offrant une touche contemporaine à la parfumerie traditionnelle du Moyen-Orient.",
    "The base settles into a refined woody foundation of": "Le fond repose sur une base boisée et raffinée de",
    ", delivering the signature Parfums de Marly elegance. This is oud reimagined for the modern gentleman - approachable yet sophisticated, sweet yet masculine.": ", livrant l'élégance signature de Parfums de Marly. C'est un oud réinventé pour le gentleman moderne — accessible mais sophistiqué, doux mais masculin.",
    "Pegasus begins with an enchanting blend of powdery": "Pegasus s'ouvre sur un mélange enchanteur de poudrés",
    ", creating an immediately captivating and unique opening that sets it apart from conventional fragrances. This distinctive start hints at the gourmand journey ahead.": ", créant une ouverture immédiatement captivante et unique qui le distingue des parfums conventionnels. Ce départ si particulier annonce le voyage gourmand à venir.",
    "The heart unfolds with elegant": "Le cœur se déploie avec d'élégants",
    ", adding depth and sophistication to the composition. The base reveals a luxurious foundation of creamy": ", ajoutant profondeur et sophistication à la composition. Le fond révèle une base luxueuse de crémeux",
    "- creating a truly addictive and comforting gourmand experience.": "- créant une expérience gourmande véritablement addictive et réconfortante.",
    "Greenly opens with a vibrant burst of": "Greenly s'ouvre avec un éclat vibrant de",
    ", creating an invigorating and energizing first impression. This bright introduction perfectly captures the essence of a lush, green landscape.": ", créant une première impression revigorante et énergisante. Cette introduction lumineuse capture parfaitement l'essence d'un paysage luxuriant et verdoyant.",
    "The heart reveals an aromatic blend of": "Le cœur révèle un mélange aromatique de",
    ", adding depth and sophistication to the composition. The dry down features warm": ", ajoutant profondeur et sophistication à la composition. Le fond révèle de chaleureux",
    ", and a touch of": ", et une touche de",
    ", creating a perfect balance between freshness and warmth.": ", créant un équilibre parfait entre fraîcheur et chaleur.",
    "Baccarat Rouge 540 opens with a radiant burst of": "Baccarat Rouge 540 s'ouvre avec un éclat radieux de",
    ", creating an immediately captivating and luminous first impression. The crystal-clear opening possesses an almost supernatural quality that cuts through any room.": ", créant une première impression immédiatement captivante et lumineuse. Cette ouverture cristalline possède une qualité presque surnaturelle qui traverse n'importe quelle pièce.",
    "The heart unfolds with precious": "Le cœur se déploie avec de précieux",
    ", while the base reveals a magnetic blend of": ", tandis que le fond révèle un mélange magnétique de",
    ". The result is a scent that seems to glow from within — crystalline, warm, and utterly unforgettable.": ". Le résultat est un parfum qui semble rayonner de l'intérieur — cristallin, chaleureux et totalement inoubliable.",
    "Black Orchid opens with an intoxicating wave of dark": "Black Orchid s'ouvre avec une vague enivrante de sombres",
    ", creating one of the most daring and sensual openings in modern perfumery. It's a fragrance that demands attention from the very first spray.": ", créant l'une des ouvertures les plus audacieuses et sensuelles de la parfumerie moderne. C'est un parfum qui exige l'attention dès la première vaporisation.",
    "The heart blooms with the mysterious": "Le cœur s'épanouit avec le mystérieux",
    ", while the base deepens into an addictive blend of": ", tandis que le fond s'enrichit d'un mélange addictif de",
    ". A masterpiece of shadow and seduction.": ". Un chef-d'œuvre d'ombre et de séduction.",
    "Aventus opens with a bold and invigorating explosion of caramelized": "Aventus s'ouvre avec une explosion audacieuse et revigorante de caramélisés",
    ". This iconic opening has become one of the most recognized and celebrated in the fragrance world.": ". Cette ouverture iconique est devenue l'une des plus reconnues et célébrées du monde de la parfumerie.",
    ", adding depth and character, while the base settles into an addictive blend of rich": ", ajoutant profondeur et caractère, tandis que le fond s'installe dans un mélange addictif de riches",
    ". A fragrance synonymous with confidence, success, and sophistication.": ". Un parfum synonyme de confiance, de réussite et de sophistication.",
    "channels the raw beauty of desert landscapes at twilight. A blazing trail of Calabrian bergamot meets the magnetic pull of Ambroxan, creating an iconic scent that's become synonymous with modern masculinity. The Sichuan pepper adds an electrifying freshness, while cedar and labdanum ground the composition in warmth.": "canalise la beauté brute des paysages désertiques au crépuscule. Une traînée ardente de bergamote de Calabre rencontre l'attraction magnétique de l'Ambroxan, créant un parfum iconique devenu synonyme de masculinité moderne. Le poivre de Sichuan ajoute une fraîcheur électrisante, tandis que le cèdre et le labdanum ancrent la composition dans la chaleur.",
    "is liquid indulgence. Imagine a luxurious gentleman's club where aged tobacco leaves mingle with sweet vanilla, dark chocolate, and aromatic spices. The tonka bean and dried fruits add layers of gourmand complexity, while a hint of smoke gives it an edge. This is opulence bottled.": "est une indulgence liquide. Imaginez un club de gentlemen luxueux où des feuilles de tabac vieilli se mêlent à la vanille douce, au chocolat noir et aux épices aromatiques. La fève tonka et les fruits secs ajoutent des couches de complexité gourmande, tandis qu'une pointe de fumée lui donne du caractère. C'est l'opulence en bouteille.",
    "redefined oud for Western perfumery. Instead of the traditional Middle Eastern animalic oud, this is smooth, creamy, and remarkably approachable. Rosewood and cardamom open with sophistication, while the oud and sandalwood create a meditative, almost spiritual warmth. A masterpiece of restraint.": "a redéfini l'oud pour la parfumerie occidentale. Plutôt que l'oud animalier traditionnel du Moyen-Orient, celui-ci est doux, crémeux et remarquablement accessible. Le bois de rose et la cardamome s'ouvrent avec sophistication, tandis que l'oud et le santal créent une chaleur méditative, presque spirituelle. Un chef-d'œuvre de retenue.",
    "is the ultimate seduction fragrance. The interplay of fresh cardamom and deep cedar creates an irresistible magnetic pull. Lavender adds an unexpected softness, while vetiver and caraway give it an edge. This fragrance doesn't shout — it whispers, and that's what makes it devastating.": "est le parfum de séduction ultime. Le jeu de la cardamome fraîche et du cèdre profond crée une attraction magnétique irrésistible. La lavande apporte une douceur inattendue, tandis que le vétiver et le carvi lui donnent du caractère. Ce parfum ne crie pas — il murmure, et c'est ce qui le rend dévastateur.",
    "is pure temptation in a bottle. An intoxicating burst of ripe cherry and cherry liqueur opens with irresistible sweetness, while Turkish rose and jasmine sambac add seductive floral depth. The Base of sandalwood, Peru balsam, and tonka bean creates a lingering, addictive warmth that's impossible to resist.": "est une pure tentation en bouteille. Une bouffée enivrante de cerise mûre et de liqueur de cerise s'ouvre avec une douceur irrésistible, tandis que la rose de Turquie et le jasmin sambac ajoutent une profondeur florale séductrice. La base de santal, de baume du Pérou et de fève tonka crée une chaleur persistante et addictive, impossible à résister.",
    "Acqua di Giò Profumo opens with a refreshing wave of": "Acqua di Giò Profumo s'ouvre avec une vague rafraîchissante de",
    ", instantly evoking the warmth of the Mediterranean coast. The opening is both familiar and elevated.": ", évoquant instantanément la chaleur de la côte méditerranéenne. L'ouverture est à la fois familière et raffinée.",
    ", while the base anchors with earthy": ", tandis que le fond s'ancre avec de terreux",
    ". A modern aquatic masterpiece that transcends the original.": ". Un chef-d'œuvre aquatique moderne qui transcende l'original.",
    "Ultra Male opens with a seductive burst of juicy": "Ultra Male s'ouvre avec une bouffée séductrice de juteuse",
    ", instantly creating a bold, attention-grabbing aura. The sweetness is amplified beyond the original Le Male formula.": ", créant instantanément une aura audacieuse qui capte l'attention. La douceur est amplifiée au-delà de la formule originale de Le Male.",
    "The heart darkens with rich": "Le cœur s'assombrit avec de riches",
    ", while the base envelops with": ", tandis que le fond enveloppe de",
    ". This is a fragrance designed to be noticed — a sweet bomb with character.": ". C'est un parfum conçu pour être remarqué — une bombe sucrée avec du caractère.",
    "Uomo Born in Roma opens with a vibrant fusion of spicy": "Uomo Born in Roma s'ouvre avec une fusion vibrante d'épicés",
    ", capturing the energy and charm of the Eternal City. The opening is both refreshing and warm.": ", capturant l'énergie et le charme de la Ville éternelle. L'ouverture est à la fois rafraîchissante et chaleureuse.",
    ", while the base settles with earthy": ", tandis que le fond s'installe avec de terreux",
    ". A fragrance that embodies the contrast of ancient Rome and modern style.": ". Un parfum qui incarne le contraste entre la Rome antique et le style moderne.",
    "Spicebomb Extreme opens with an explosive burst of": "Spicebomb Extreme s'ouvre avec une explosion de",
    ", delivering a sensory detonation. True to its grenade-shaped bottle, this fragrance is designed to make an impact.": ", délivrant une détonation sensorielle. Fidèle à son flacon en forme de grenade, ce parfum est conçu pour marquer les esprits.",
    "The heart intensifies with warm": "Le cœur s'intensifie avec de chaleureux",
    ", while the base melts into sweet": ", tandis que le fond fond en douceurs",
    ". This is the extreme version for a reason — it's louder, sweeter, and more addictive than the original.": ". C'est la version extrême pour une bonne raison — elle est plus puissante, plus douce et plus addictive que l'originale.",
    "Explorer opens with a bright and energizing blend of": "Explorer s'ouvre avec un mélange lumineux et énergisant de",
    ", instantly creating a sense of movement and adventure. The freshness suggests open spaces and untrodden paths.": ", créant instantanément un sentiment de mouvement et d'aventure. La fraîcheur évoque les grands espaces et les chemins inexplorés.",
    "The heart develops a supple": "Le cœur développe un souple",
    ", while the base reveals deep": ", tandis que le fond révèle de profonds",
    ". Often compared to Aventus at a fraction of the price, Explorer is the smart enthusiast's choice.": ". Souvent comparé à Aventus pour une fraction du prix, Explorer est le choix malin des passionnés.",
    "Man in Black opens with an assertive blend of": "Man in Black s'ouvre avec un mélange affirmé de",
    ", establishing an immediate sense of dark sophistication. The opening is bold yet refined.": ", instaurant un sentiment immédiat de sophistication sombre. L'ouverture est audacieuse mais raffinée.",
    ", while the base deepens with sweet": ", tandis que le fond s'approfondit avec de douces",
    ". A nighttime powerhouse that channels old-world Italian glamour with a modern edge.": ". Une puissance nocturne qui canalise le glamour italien d'antan avec une touche moderne.",
    "and crisp": "et croquants",
    "The heart reveals sweet": "Le cœur révèle de doux",
    "and calming": "et apaisants",
    "and intoxicating": "et enivrants",
    "and smooth": "et doux",
    "and juicy": "et juteuse",
    ", delicate": ", délicats",
    ", and intoxicating": ", et enivrants",
    ", exotic": ", exotiques",
    ", and earthy": ", et terreux",
    ", warm": ", chaleureux",
    ", and bright": ", et de lumineux",
    "and ethereal": "et éthérés",
    "and mysterious": "et de mystérieuses",
    "accord and lush": "accord et de luxuriants",
    ", dark": ", sombres",
    ", and smoky": ", et fumés",
    ", and tart": ", et acidulés",
    "The heart reveals smoky": "Le cœur révèle un côté fumé de",
    ", creamy": ", crémeux",
    "and sweetened": "et sucrés",
    "The heart blends aromatic": "Le cœur marie des notes aromatiques de",
    "with soft": "à un doux",
    "and mystical": "et mystiques",
    "The heart reveals aromatic": "Le cœur révèle des notes aromatiques de",
    "and smoldering": "et de brûlants",
    "and luscious": "et de voluptueux",
    "and herbaceous": "et herbacé",
    "The heart reveals luxurious": "Le cœur révèle un luxueux",
    "and refreshing": "et rafraîchissants",
    ", and": ", et",
    "The heart brings aromatic": "Le cœur apporte des notes aromatiques de",
    "The heart reveals elegant": "Le cœur révèle d'élégants",
    ", and refreshing": ", et rafraîchissants",
    ", earthy": ", terreux",
    "oriental": "oriental",
    "gourmand": "gourmand",
    "\"Aventus Absolu turns the original up to eleven — smokier, richer and impossibly magnetic.\"": "\"Aventus Absolu pousse l'original à l'extrême : plus fumé, plus riche et incroyablement magnétique.\"",
    "\"Pure oud royalty. The saffron opening melts into a creamy, expensive-smelling dry down.\"": "\"Du pur oud royal. L'ouverture safranée fond dans un fond crémeux qui sent cher.\"",
    "\"Versace Eros is a BEAST. I'm not exaggerating — every time I wear this in public, someone asks what I'm wearing. The mint-tonka combo is pure magic. This is the fragrance that turned me into a fraghead. Perfect for clubs, dates, or anytime you want to make an impression.\"": "\"Versace Eros est une BÊTE. Je n'exagère pas : à chaque fois que je le porte en public, quelqu'un me demande ce que je porte. Le duo menthe-tonka est de la pure magie. C'est le parfum qui a fait de moi un passionné. Parfait pour les clubs, les rendez-vous, ou n'importe quel moment où vous voulez faire sensation.\"",
    "\"A warm amber hug in a bottle. Wears close and gets compliments all day long.\"": "\"Une étreinte d'ambre chaud en bouteille. Se porte près de la peau et attire des compliments toute la journée.\"",
    "\"Bleu de Chanel EDP is the ultimate office fragrance. It's sophisticated without being loud, distinctive without being divisive. The sandalwood dry down is absolutely gorgeous.\"": "\"Bleu de Chanel EDP est le parfum de bureau ultime. Il est sophistiqué sans être bruyant, distinctif sans être clivant. Le fond de santal est absolument superbe.\"",
    "\"Smoky, golden and refined. This is what a luxury oud should smell like.\"": "\"Fumé, doré et raffiné. C'est ainsi qu'un oud de luxe devrait sentir.\"",
    "\"Wears like liquid gold. The saffron-oud heart is bold yet perfectly balanced.\"": "\"Se porte comme de l'or liquide. Le cœur safran-oud est audacieux mais parfaitement équilibré.\"",
    "\"Campfire smoke over the finest oud — dark, royal and unforgettable.\"": "\"Fumée de feu de camp sur le plus bel oud : sombre, royal et inoubliable.\"",
    "\"A thousand nights in one spray. Frankincense and oud in perfect harmony.\"": "\"Mille et une nuits en un seul spray. Encens et oud en parfaite harmonie.\"",
    "\"Delicate rose wrapped in clean white musk. Soft, romantic and endlessly wearable.\"": "\"Rose délicate enveloppée d'un musc blanc propre. Doux, romantique et infiniment portable.\"",
    "\"The barbershop of dreams. Tobacco and honey with a dignified, warm finish.\"": "\"Le barbier de rêve. Tabac et miel avec une finale digne et chaleureuse.\"",
    "\"Enigmatic and brooding. Each hour reveals a new layer of this dark beauty.\"": "\"Énigmatique et ténébreux. Chaque heure révèle une nouvelle facette de cette beauté sombre.\"",
    "\"Ethereal — fresh citrus floating over a regal oud base. A modern masterpiece.\"": "\"Éthéré : des agrumes frais flottant sur une base d'oud royale. Un chef-d'œuvre moderne.\"",
    "\"Assad Elixir is an incredible value. The saffron-oud combo punches way above its price point.\"": "\"Assad Elixir est un excellent rapport qualité-prix. Le duo safran-oud surpasse largement son prix.\"",
    "\"Dior at its most opulent. Velvet-smooth oud with a shimmering golden dry down.\"": "\"Dior dans son plus bel apparat. Un oud velouté avec un fond doré scintillant.\"",
    "\"Phantom in Red is a dark seductive beast. The saffron-leather combo is intoxicating and the incense adds a mystical quality.\"": "\"Phantom in Red est une bête sombre et séductrice. Le duo safran-cuir est enivrant et l'encens apporte une touche mystique.\"",
    "\"Our house signature — a sweet, smoky oud that charms everyone who smells it.\"": "\"Notre signature maison : un oud sucré et fumé qui séduit tous ceux qui le sentent.\"",
    "\"Bad Boy smells expensive and modern. The black pepper-tonka combo is addictive. Great club fragrance that lasts all night.\"": "\"Bad Boy sent cher et moderne. Le duo poivre noir-tonka est addictif. Excellent parfum de club qui tient toute la nuit.\"",
    "\"Fit for an emperor — powerful oud tempered with regal sweetness.\"": "\"Digne d'un empereur : un oud puissant adouci d'une douceur royale.\"",
    "\"Green, stately and composed. Oud with impeccable manners.\"": "\"Vert, majestueux et posé. Un oud aux manières impeccables.\"",
    "\"Givenchy Gentleman EDP is refined without being boring. The iris-patchouli combo gives it depth, while the lavender keeps it fresh. Perfect for the office or dinner.\"": "\"Givenchy Gentleman EDP est raffiné sans être ennuyeux. Le duo iris-patchouli lui donne de la profondeur, tandis que la lavande le garde frais. Parfait pour le bureau ou un dîner.\"",
    "\"Bright and golden — oud that radiates warmth instead of lurking in shadow.\"": "\"Clair et doré : un oud qui rayonne de chaleur au lieu de se cacher dans l'ombre.\"",
    "\"A velvet glove over a smoky fist. Fruity florals melt into tender oud.\"": "\"Un gant de velours sur un poing fumé. Des fleurs fruitées fondent dans un oud tendre.\"",
    "\"Classic, precise, everlasting. The suiting-and-tie of ouds.\"": "\"Classique, précis, éternel. Le costume-cravate des ouds.\"",
    "\"Gucci Guilty is smooth and refined. The lavender-patchouli combo is done perfectly. Great for date nights and leaves a lasting impression.\"": "\"Gucci Guilty est doux et raffiné. Le duo lavande-patchouli est parfaitement exécuté. Idéal pour les rendez-vous et laisse une impression durable.\"",
    "\"Dusk in a bottle — cool, blue-toned woods with a whisper of oud.\"": "\"Le crépuscule en bouteille : des bois froids aux nuances bleues avec un soupçon d'oud.\"",
    "\"Smooth as crushed velvet — plummy, leathery oud at its most decadent.\"": "\"Aussi doux que du velours écrasé : un oud prune et cuir dans toute sa décadence.\"",
    "\"Silver-blue and dreamlike — oud bathed in cool moonlight.\"": "\"Argenté et onirique : un oud baigné de clair de lune froid.\"",
    "\"The darkest hour, bottled. Brooding spice and oud with no mercy.\"": "\"L'heure la plus sombre, en bouteille. Épices ténébreuses et oud sans pitié.\"",
    "\"Invictus is the go-to gym/sport fragrance. Fresh, energetic, and people around you will definitely notice. The marine-amber combo is super addictive. Great value for money too. My gym bag essential. Works amazingly in warm weather.\"": "\"Invictus est le parfum de sport par excellence. Frais, énergique, et les gens autour de vous le remarqueront à coup sûr. Le duo marin-ambre est super addictif. Excellent rapport qualité-prix. L'indispensable de mon sac de sport. Fonctionne à merveille par temps chaud.\"",
    "\"A sultan's treasury of resins and oud. Utterly commanding.\"": "\"Le trésor d'un sultan en résines et oud. Absolument imposant.\"",
    "\"Royal by name, royal by nature — a flawless, ceremonial oud.\"": "\"Royal par le nom, royal par nature : un oud cérémonial sans faille.\"",
    "\"Dior Homme Intense is liquid elegance. The iris note is absolutely divine — sophisticated, powdery, and incredibly refined. This is what a well-dressed man smells like.\"": "\"Dior Homme Intense est de l'élégance liquide. La note d'iris est absolument divine : sophistiquée, poudrée et incroyablement raffinée. C'est ainsi que sent un homme bien habillé.\"",
    "\"Light Blue is a timeless classic. The apple-cedar combo is fresh yet has substance. Perfect for hot summer days.\"": "\"Light Blue est un classique intemporel. Le duo pomme-cèdre est frais mais a du caractère. Parfait pour les chaudes journées d'été.\"",
    "\"Y EDP is the ultimate daily driver. Fresh enough for the office, powerful enough for a night out. The apple-sage opening is addictive, and the dry down is chef's kiss. Easily gets 8+ hours on my skin. If you want one fragrance to cover all occasions, this is it.\"": "\"Y EDP est le parfum de tous les jours par excellence. Assez frais pour le bureau, assez puissant pour une soirée. L'ouverture pomme-sauge est addictive et le fond est une pure merveille. Facilement 8 heures et plus sur ma peau. Si vous voulez un parfum pour toutes les occasions, c'est celui-ci.\"",
    "\"Déclaration d'un Soir is criminally underrated. Spicy, warm, mysterious — it smells way more expensive than it is. A hidden gem for evening wear.\"": "\"Déclaration d'un Soir est criminellement sous-estimé. Épicé, chaleureux, mystérieux : il sent beaucoup plus cher qu'il ne coûte. Un joyau caché pour les soirées.\"",
    "\"K by D&G is a great everyday scent. Fresh citrus opening that dries into a nice woody base. Very versatile and gets a surprising amount of compliments.\"": "\"K by D&G est un excellent parfum du quotidien. Une ouverture d'agrumes frais qui sèche sur une belle base boisée. Très polyvalent et attire un nombre surprenant de compliments.\"",
    "\"D&G The One is THE quintessential date night fragrance. Warm, inviting, and incredibly sexy without being overpowering. Every time I wear this, I get compliments. The amber-tobacco drydown is comfort in a bottle. A modern classic.\"": "\"D&G The One est LE parfum de rendez-vous par excellence. Chaleureux, accueillant et incroyablement sexy sans être envahissant. À chaque fois que je le porte, je reçois des compliments. Le fond ambre-tabac, c'est le confort en bouteille. Un classique moderne.\"",
    "\"Just tried Layton for the first time and WOW! The apple and vanilla combo is absolutely incredible. Got compliments all day at work. This is definitely going on my full bottle wishlist. The longevity is insane - still smelling it 8 hours later!\"": "\"Je viens d'essayer Layton pour la première fois et WOW ! Le duo pomme et vanille est absolument incroyable. J'ai reçu des compliments toute la journée au travail. Il rejoint définitivement ma liste d'envies en flacon entier. La tenue est folle : je le sens encore 8 heures plus tard !\"",
    "\"Haltane is absolutely phenomenal. The opening is this beautiful blend of bergamot and lavender that immediately grabs your attention, then it dries down to this gorgeous vanilla and oud combination. The performance is beast mode - easily 10+ hours on skin and projects like crazy for the first 4-5 hours. It's definitely more of a fall/winter fragrance but I've worn it in spring evenings too. Worth every penny, this is my signature scent now.\"": "\"Haltane est absolument phénoménal. L'ouverture est ce magnifique mélange de bergamote et de lavande qui accroche immédiatement l'attention, puis il fond dans une superbe combinaison de vanille et d'oud. La performance est monstrueuse : facilement 10 heures et plus sur la peau et un sillage impressionnant pendant les 4 à 5 premières heures. C'est davantage un parfum d'automne/hiver mais je l'ai aussi porté en soirées de printemps. Il vaut chaque centime, c'est désormais mon parfum signature.\"",
    "\"Rich, spicy and dangerously smooth. One spray fills a room.\"": "\"Riche, épicé et dangereusement doux. Une seule vaporisation remplit une pièce.\"",
    "\"A timeless aquatic classic. Clean, effortless and endlessly fresh.\"": "\"Un classique aquatique intemporel. Propre, sans effort et infiniment frais.\"",
    "\"Sweet, golden and head-turning. Longevity is unreal.\"": "\"Sucré, doré et à se retourner. Une tenue irréelle.\"",
    "\"The original petrol-and-leather icon. Mature, complex, unforgettable.\"": "\"L'icône originale essence et cuir. Mûre, complexe, inoubliable.\"",
    "\"Easygoing sporty freshness with a touch of class. Great for summer.\"": "\"Une fraîcheur sportive décontractée avec une touche de classe. Parfait pour l'été.\"",
    "\"An elegant 80s classic. Clean, masculine and quietly sophisticated.\"": "\"Un élégant classique des années 80. Propre, masculin et subtilement sophistiqué.\"",
    "\"The ultimate shared scent. Light, clean and endlessly wearable.\"": "\"Le parfum partagé ultime. Léger, propre et infiniment portable.\"",
    "\"Boozy pineapple and rum that turns heads. A true niche showstopper.\"": "\"Ananas alcoolisé et rhum qui font tourner les têtes. Un vrai numéro de choix de la niche.\"",
    "\"Soft powder and warm woods. Wears close and smells expensive.\"": "\"Poudre douce et bois chaleureux. Se porte près de la peau et sent cher.\"",
    "\"A dense coffee-and-patchouli dream. Beast mode performance.\"": "\"Un rêve dense de café et de patchouli. Une performance monstrueuse.\"",
    "\"Sleek and sophisticated — the scent of a perfectly tailored evening.\"": "\"Élégant et sophistiqué : le parfum d'une soirée parfaitement sur mesure.\"",
    "\"Smooth leather and warm amber. Regal, sweet and commanding.\"": "\"Cuir doux et ambre chaud. Royal, sucré et imposant.\"",
    "\"Everything Y does best, turned up. Fresh yet deep and long-lasting.\"": "\"Tout ce que Y fait de mieux, amplifié. Frais mais profond et longue tenue.\"",
    "\"A richer, warmer take on Y. Beautiful sillage and cozy depth.\"": "\"Une version plus riche et plus chaude de Y. Un beau sillage et une profondeur réconfortante.\"",
    "\"Sharp, confident and office-friendly. A warm spicy signature.\"": "\"Cinglant, sûr de lui et adapté au bureau. Une signature épicée et chaleureuse.\"",
    "\"An 80s powerhouse. Honeyed florals over leather — pure nostalgia.\"": "\"Une puissance des années 80. Des fleurs miellées sur du cuir : de la pure nostalgie.\"",
    "\"A sparkling lavender-electric hit with a warm dry down.\"": "\"Un coup d'éclat lavande-électrique avec un fond chaleureux.\"",
    "\"Sweet popcorn and vanilla with a spicy kick. Youthful and addictive.\"": "\"Popcorn sucré et vanille avec une pointe d'épices. Jeune et addictif.\"",
    "\"The most luxurious 1 Million. Honeyed leather with huge projection.\"": "\"Le plus luxueux des 1 Million. Un cuir miellé avec un sillage énorme.\"",
    "\"Smoky pineapple beast with incredible value. The crowd-pleaser king.\"": "\"Une bête d'ananas fumé au rapport qualité-prix incroyable. Le roi qui plaît à tous.\"",
    "\"Creamy sandalwood and vanilla. A warm hug with great longevity.\"": "\"Santal crémeux et vanille. Une étreinte chaleureuse avec une excellente tenue.\"",
    "\"Sunny, juicy pineapple with a warm creamy base. Summer in a bottle.\"": "\"Un ananas ensoleillé et juteux sur une base chaude et crémeuse. L'été en bouteille.\"",
    "\"Cool water rush with a dark, magnetic drydown.\"": "\"Un déferlement d'eau fraîche avec un fond sombre et magnétique.\"",
    "\"Smooth suede over creamy woods. Quiet luxury.\"": "\"Un suède doux sur des bois crémeux. Le luxe discret.\"",
    "\"Crisp, fresh and endlessly easy to wear.\"": "\"Net, frais et infiniment facile à porter.\"",
    "\"The classic office freshie. Clean linen vibes.\"": "\"Le frais de bureau classique. L'ambiance lin propre.\"",
    "\"Dark, resinous oud that commands the room.\"": "\"Un oud sombre et résineux qui domine la pièce.\"",
    "\"Mountain air in a bottle. Sharp and clean.\"": "\"L'air de la montagne en bouteille. Vif et net.\"",
    "\"Vintage green barbershop soul.\"": "\"L'âme vintage du barbier vert.\"",
    "\"A cozy hug of oud and vanilla.\"": "\"Une étreinte réconfortante d'oud et de vanille.\"",
    "\"A cloud of rose and vanilla. Instant compliments.\"": "\"Un nuage de rose et de vanille. Des compliments immédiats.\"",
    "\"Warm vanilla that lasts all night.\"": "\"Une vanille chaleureuse qui tient toute la nuit.\"",
    "\"Sweet tobacco rose with a creamy vanilla base.\"": "\"Une rose tabac sucrée sur une base de vanille crémeuse.\"",
    "\"Sparkling citrus over a golden amber bed.\"": "\"Des agrumes pétillants sur un lit d'ambre doré.\"",
    "\"Edgy urban wood. Night out energy.\"": "\"Un bois urbain affirmé. L'énergie des soirées.\"",
    "\"Spiced leather and rose over deep oud.\"": "\"Cuir épicé et rose sur un oud profond.\"",
    "\"A grand, golden oud-rose masterpiece.\"": "\"Un grand chef-d'œuvre doré d'oud et de rose.\"",
    "\"Silky florals with a soft fruity shimmer.\"": "\"Des fleurs soyeuses avec un doux éclat fruité.\"",
    "\"A golden amber glow with a spiced citrus pop.\"": "\"Un halo d'ambre doré avec un éclat d'agrumes épicés.\"",
    "\"A precious dark oud wrapped in spice.\"": "\"Un précieux oud sombre enveloppé d'épices.\"",
    "\"Grey, refined and quietly powerful rose-wood.\"": "\"Un bois de rose gris, raffiné et discrètement puissant.\"",
    "\"Liquid gold amber — warm and regal.\"": "\"Un ambre d'or liquide : chaleureux et royal.\"",
    "\"Pegasus is pure gourmand heaven! The opening with heliotrope and cumin is so unique - it's sweet but has this warm spicy edge that makes it incredibly addictive. The almond and vanilla combo in the drydown is absolutely gorgeous, like wearing a warm hug. Performance is solid - easily 8-10 hours on my skin with good projection for the first 3-4 hours. Perfect for fall and winter evenings. This is my comfort scent!\"": "\"Pegasus est un pur paradis gourmand ! L'ouverture avec l'héliotrope et le cumin est tellement unique : c'est sucré mais avec cette chaleur épicée qui le rend incroyablement addictif. Le duo amande et vanille dans le fond est absolument superbe, comme porter une étreinte chaleureuse. La performance est solide : facilement 8 à 10 heures sur ma peau avec un bon sillage les 3 à 4 premières heures. Parfait pour les soirées d'automne et d'hiver. C'est mon parfum réconfort !\"",
    "\"After trying dozens of gourmand fragrances, Pegasus still stands out as one of the best. The heliotrope gives it this powdery sweetness that's not cloying, and the cumin adds just enough spice to keep it interesting. The longevity is impressive - I can still smell it on my clothes the next day. It's definitely more suited for cooler weather, but I've gotten so many compliments wearing this. A true masterpiece from PDM!\"": "\"Après avoir essayé des dizaines de parfums gourmands, Pegasus se distingue toujours comme l'un des meilleurs. L'héliotrope lui donne cette douceur poudrée qui n'est pas écœurante, et le cumin ajoute juste assez d'épice pour rester intéressant. La tenue est impressionnante : je le sens encore sur mes vêtements le lendemain. Il est vraiment plus adapté aux temps plus frais, mais j'ai reçu tellement de compliments en le portant. Un vrai chef-d'œuvre de PDM !\"",
    "\"Greenly is hands down the best fresh fragrance I've ever smelled! The opening with lemon and green apple is absolutely divine - it's like walking through a fresh garden after rain. The mint gives it this amazing cooling effect that's perfect for hot days. Performance is solid too - easily 6-8 hours and people definitely notice it. This is my go-to summer and spring fragrance. If you love fresh, green scents, this is a must-try!\"": "\"Greenly est sans conteste le meilleur parfum frais que j'ai jamais senti ! L'ouverture avec le citron et la pomme verte est absolument divine : c'est comme marcher dans un jardin frais après la pluie. La menthe lui donne ce merveilleux effet rafraîchissant, parfait pour les journées chaudes. La performance est solide aussi : facilement 6 à 8 heures et les gens le remarquent à coup sûr. C'est mon parfum d'été et de printemps de prédilection. Si vous aimez les senteurs fraîches et vertes, il faut l'essayer !\"",
    "\"Baccarat Rouge 540 is not just a fragrance — it's an experience. The moment you spray it, there's this ethereal cloud that surrounds you. It's sweet but not cloying, warm but airy. I've never had so many compliments from a single fragrance. The longevity is INSANE — I can smell it on my clothes days later. Worth every penny of the hefty price tag. This is the one fragrance I'd keep if I had to choose just one.\"": "\"Baccarat Rouge 540 n'est pas qu'un parfum : c'est une expérience. Dès que vous le vaporisez, un nuage éthéré vous entoure. Il est sucré sans être écœurant, chaleureux mais aérien. Je n'ai jamais reçu autant de compliments d'un seul parfum. La tenue est de la FOLIE : je le sens encore sur mes vêtements des jours plus tard. Il vaut chaque centime de son prix élevé. C'est le parfum que je garderais si je devais n'en choisir qu'un.\"",
    "\"Black Orchid was the fragrance that made me fall in love with niche perfumery. It's everything a luxury fragrance should be — daring, complex, and absolutely mesmerizing. The chocolate-truffle opening is unlike anything else, and the way it dries down into this dark, velvety orchid is pure art. It's not for everyone, and that's exactly why I love it. Every time I wear it, I feel like the most interesting person in the room.\"": "\"Black Orchid est le parfum qui m'a fait tomber amoureux de la parfumerie de niche. C'est tout ce qu'un parfum de luxe devrait être : audacieux, complexe et absolument envoûtant. L'ouverture truffe au chocolat est sans équivalent, et la façon dont il fond dans cette orchidée sombre et veloutée est un pur art. Il n'est pas fait pour tout le monde, et c'est exactement pour ça que je l'aime. À chaque fois que je le porte, je me sens comme la personne la plus intéressante de la pièce.\"",
    "\"Aventus is the GOAT of men's fragrances. Period. I've been wearing it for 5 years and I STILL get compliments every single time. The pineapple opening is addictive, the birch gives it that masculine edge, and the dry down is pure class. Yes, batches vary slightly, but every single one is a winner. If you can only own one fragrance for the rest of your life, make it Aventus. It's the ultimate confidence booster.\"": "\"Aventus est le GOAT des parfums masculins. Point final. Je le porte depuis 5 ans et je reçois ENCORE des compliments à chaque fois. L'ouverture d'ananas est addictive, le bouleau lui donne ce tranchant masculin, et le fond est d'un pur raffinement. Oui, les lots varient légèrement, mais chacun est une réussite. Si vous ne deviez posséder qu'un seul parfum pour le reste de votre vie, choisissez Aventus. C'est le booster de confiance ultime.\"",
    "\"Sauvage is the definition of a crowd-pleaser. I've never received more compliments from any other fragrance. It projects like a beast and lasts all day. The reformulations are slightly weaker but still incredible.\"": "\"Sauvage est la définition même du parfum qui plaît à tous. Je n'ai jamais reçu plus de compliments d'aucun autre parfum. Son sillage est monstrueux et il tient toute la journée. Les reformulations sont légèrement plus faibles mais restent incroyables.\"",
    "\"This is the king of fall/winter fragrances. Two sprays will last 12+ hours and get you compliments all night. It's expensive but nothing else smells quite like it. Pure class in a bottle.\"": "\"C'est le roi des parfums d'automne/hiver. Deux vaporisations tiennent 12 heures et plus et vous valent des compliments toute la nuit. C'est cher mais rien d'autre ne sent pareil. Du pur raffinement en bouteille.\"",
    "\"Oud Wood is oud for beginners but in the best way. It made oud accessible and beautiful. The rosewood-cardamom opening is perfect, and it dries down to pure smooth luxury. A modern classic.\"": "\"Oud Wood est l'oud pour débutants, mais dans le meilleur sens du terme. Il a rendu l'oud accessible et magnifique. L'ouverture bois de rose-cardamome est parfaite, et il fond dans un luxe d'une douceur absolue. Un classique moderne.\"",
    "\"La Nuit is the ultimate date night fragrance. The cardamom opening is intoxicating. Yes, longevity isn't the best, but the compliments you get in those 4-5 hours are worth it. Nothing else smells like this.\"": "\"La Nuit est le parfum de rendez-vous ultime. L'ouverture de cardamome est enivrante. Oui, la tenue n'est pas la meilleure, mais les compliments reçus en ces 4 à 5 heures valent le coup. Rien d'autre ne sent comme ça.\"",
    "\"Lost Cherry is polarizing but if you love it, you LOVE it. The cherry note is realistic and boozy, not synthetic. It gets attention everywhere I go. Expensive? Yes. Worth it? Absolutely.\"": "\"Lost Cherry divise, mais si vous l'aimez, vous l'AIMEZ. La note de cerise est réaliste et alcoolisée, pas synthétique. Il attire l'attention partout où je vais. Cher ? Oui. Ça vaut le coup ? Absolument.\"",
    "\"Acqua di Giò Profumo is what happens when you take a legendary scent and make it grow up. The original AdG was my teen fragrance, but Profumo? That's a MAN's fragrance. Refined, deeper, longer lasting. The incense in the drydown is magnificent. 10/10 would recommend.\"": "\"Acqua di Giò Profumo, c'est ce qui arrive quand on prend une senteur légendaire et qu'on la fait grandir. L'AdG original était mon parfum d'adolescent, mais Profumo ? C'est un parfum d'HOMME. Raffiné, plus profond, plus durable. L'encens dans le fond est magnifique. 10/10, je le recommande.\"",
    "\"Ultra Male is basically a cheat code for getting compliments. I sprayed it once before going to a party and literally couldn't stop people from asking about it. The pear-vanilla-lavender combo is INSANE. Yes, it's sweet. Yes, it's loud. And yes, it WORKS. Club king fragrance.\"": "\"Ultra Male est en quelque sorte un code de triche pour recevoir des compliments. Je l'ai vaporisé une fois avant une fête et je n'ai littéralement pas pu empêcher les gens de m'en parler. Le trio poire-vanille-lavande est FOU. Oui, c'est sucré. Oui, c'est tonitruant. Et oui, ça MARCHE. Le roi des parfums de club.\"",
    "\"Born in Roma is becoming my new signature. The sage-vanilla combo is absolutely intoxicating. It's sweet without being juvenile, smoky without being too heavy. The performance is stellar — easily lasts all day. Perfect for cold weather dates. Valentino knocked it out of the park.\"": "\"Born in Roma devient ma nouvelle signature. Le duo sauge-vanille est absolument enivrant. C'est sucré sans être juvénile, fumé sans être trop lourd. La performance est étoilée : il tient facilement toute la journée. Parfait pour les rendez-vous par temps froid. Valentino a fait un coup de maître.\"",
    "\"Spicebomb Extreme is absolutely NUCLEAR. The vanilla-tobacco drydown is addictive beyond belief. I wore this to a winter gala and my wife couldn't stop hugging me. The performance is monstrous — I can still pick it up on my scarf 3 days later. This is a cold-weather KING.\"": "\"Spicebomb Extreme est absolument NUCLEAIRE. Le fond vanille-tabac est addictif au-delà de l'imaginable. Je l'ai porté à un gala d'hiver et ma femme n'arrêtait pas de me faire des câlins. La performance est monstrueuse : je le sens encore sur mon écharpe 3 jours plus tard. C'est un ROI du froid.\"",
    "\"If you can't afford Aventus, Explorer is your answer. I own both and honestly, Explorer holds its own beautifully. The bergamot-patchouli combo is clean and versatile. I wear it to work, dates, gym — everywhere. Best bang for your buck in the fragrance game. Period.\"": "\"Si vous ne pouvez pas vous offrir Aventus, Explorer est votre réponse. Je possède les deux et honnêtement, Explorer se défend magnifiquement. Le duo bergamote-patchouli est propre et polyvalent. Je le porte au travail, en rendez-vous, à la salle de sport : partout. Le meilleur rapport qualité-prix de la parfumerie. Point final.\"",
    "\"Man in Black is criminally underrated. The rum-leather-benzoin combo creates something truly unique. This is the fragrance equivalent of a perfectly tailored black suit. The projection is ideal — people close to you will be mesmerized but you won't suffocate a room. Pure class.\"": "\"Man in Black est criminellement sous-estimé. Le trio rhum-cuir-benjoin crée quelque chose de vraiment unique. C'est l'équivalent parfumé d'un costume noir parfaitement ajusté. Le sillage est idéal : les gens proches de vous seront fascinés mais vous n'étoufferez pas une pièce. Du pur raffinement.\"",
    "\"Allure Homme Sport is the definition of clean, sporty masculinity. Perfect for the gym, the office, or a casual date. Versatility king.\"": "\"Allure Homme Sport est la définition même de la masculinité sportive et propre. Parfait pour la salle, le bureau ou un rendez-vous décontracté. Le roi de la polyvalence.\"",
    "\"Tuscan Leather is a leather bomb in the best possible way. It opens with this gorgeous raspberry-saffron combo that dries down into the most luxurious leather scent. Beast mode performance.\"": "\"Tuscan Leather est une bombe de cuir dans le meilleur sens du terme. Il s'ouvre sur ce superbe duo framboise-safran qui fond dans la senteur de cuir la plus luxueuse. Une performance monstrueuse.\"",
    "\"Armani Code Absolu is the ultimate date night fragrance. Sweet, warm, inviting — it gets compliments like nothing else. The suede and tonka dry down is addictive.\"": "\"Armani Code Absolu est le parfum de rendez-vous ultime. Sucré, chaleureux, accueillant : il attire des compliments comme rien d'autre. Le fond suède et tonka est addictif.\"",
    "\"L'Homme Idéal EDP is cherry almond pie in perfume form with a gorgeous leather backbone. Warm, gourmand, and incredibly seductive. A masterpiece from Guerlain.\"": "\"L'Homme Idéal EDP est une tarte cerise-amande sous forme de parfum avec une magnifique base de cuir. Chaleureux, gourmand et incroyablement séduisant. Un chef-d'œuvre de Guerlain.\"",
    "\"Terre d'Hermès is the definition of sophisticated elegance. Earthy, mineral, woody — it smells like the earth after rain mixed with expensive wood. A modern classic.\"": "\"Terre d'Hermès est la définition même de l'élégance sophistiquée. Terreux, minéral, boisé : il sent comme la terre après la pluie mêlée à du bois précieux. Un classique moderne.\"",
    "\"The Most Wanted is Azzaro's masterpiece. Cardamom and toffee create an irresistible sweetness that is not cloying. Incredible projection beast.\"": "\"The Most Wanted est le chef-d'œuvre d'Azzaro. La cardamome et le caramel créent une douceur irrésistible qui n'est pas écœurante. Une bête au sillage incroyable.\"",
    "\"L'Eau d'Issey is a timeless classic. Aquatic freshness done perfectly — clean, sophisticated, and still relevant after 30 years. A must-have in any collection.\"": "\"L'Eau d'Issey est un classique intemporel. Une fraîcheur aquatique parfaitement exécutée : propre, sophistiquée, et toujours pertinente après 30 ans. Un indispensable de toute collection.\"",
    "\"Libre is the perfect fusion of masculine and feminine. The lavender-orange blossom-vanilla combo is stunning. Wear it with confidence — compliment magnet.\"": "\"Libre est la fusion parfaite du masculin et du féminin. Le trio lavande-fleur d'oranger-vanille est superbe. Portez-le avec assurance : un aimant à compliments.\"",
    "\"By the Fireplace literally smells like sitting by a crackling fire with a glass of bourbon. The smoky chestnut-vanilla combo is pure comfort in a bottle.\"": "\"By the Fireplace sent littéralement comme s'asseoir près d'un feu crépitant avec un verre de bourbon. Le duo châtaigne-vanille fumé est du pur confort en bouteille.\"",
    "\"Luna Rossa Carbon is essentially Sauvage's cooler brother. Metallic lavender with ambroxan gives it amazing projection. The ultimate safe blind buy.\"": "\"Luna Rossa Carbon est en quelque sorte le grand frère plus cool de Sauvage. La lavande métallique avec l'ambroxan lui donne un sillage étonnant. L'achat à l'aveugle le plus sûr.\"",
    "\"Hero EDP takes the original Hero and adds warmth and depth. The horse-chestnut cedar combo is truly unique. Elevated everyday fragrance.\"": "\"Hero EDP reprend le Hero original et y ajoute chaleur et profondeur. Le duo marronnier-cèdre est vraiment unique. Un parfum du quotidien sublimé.\"",
    "\"Bleu Noir is the king of musks. Clean, sophisticated, and magnetic. People will lean in closer when you wear this. Office-safe with nighttime appeal.\"": "\"Bleu Noir est le roi des muscs. Propre, sophistiqué et magnétique. Les gens se rapprocheront quand vous le porterez. Adapté au bureau avec un charme nocturne.\"",
    "\"Eternity is the definition of a timeless classic. Clean, fresh, elegant. It smelled amazing in 1989 and it smells amazing now. The ultimate gentleman fragrance.\"": "\"Eternity est la définition même d'un classique intemporel. Propre, frais, élégant. Il sentait divinement en 1989 et il sent encore divinement aujourd'hui. Le parfum de gentleman ultime.\"",
    "\"Born in Roma Donna is pure luxury. The jasmine-vanilla combination is intoxicating but never overwhelming. This is what elegance smells like.\"": "\"Born in Roma Donna est un pur luxe. La combinaison jasmin-vanille est enivrante sans jamais être écrasante. C'est ainsi que sent l'élégance.\"",
    "\"Green Irish Tweed is the quintessential gentleman's fragrance. Lush green meadows on a crisp morning. If sophistication had a smell, this would be it.\"": "\"Green Irish Tweed est le parfum de gentleman par excellence. De verdoyantes prairies par un matin vif. Si la sophistication avait une odeur, ce serait celle-ci.\"",
    "\"Égoïste Platinum is the ultimate clean-man scent. Understated, classy, and effortlessly masculine. The definition of less is more in perfumery.\"": "\"Égoïste Platinum est la senteur d'homme propre ultime. Discret, classe et masculin sans effort. La définition du moins c'est plus en parfumerie.\"",
    "\"Pure Havane is like smoking a cigar dipped in honey next to a vanilla factory. In the best way possible. This is comfort in a bottle, pure indulgence.\"": "\"Pure Havane, c'est comme fumer un cigare trempé dans du miel à côté d'une fabrique de vanille. Dans le meilleur sens du terme. C'est le confort en bouteille, une pure indulgence.\"",
    "\"La Yuqawam is the Tuscan Leather killer at a fraction of the price. Rich, deep leather with oud — if you love Tom Ford but not the price tag, this is it.\"": "\"La Yuqawam est le tueur de Tuscan Leather à une fraction du prix. Un cuir riche et profond avec de l'oud : si vous aimez Tom Ford mais pas le prix, c'est lui.\"",
    "\"Cedrat Boisé is citrus perfection. Sicilian lemon with leather and patchouli — it is incredibly versatile and lasts forever. Best value in niche perfumery.\"": "\"Cedrat Boisé est la perfection des agrumes. Citron de Sicile avec cuir et patchouli : il est incroyablement polyvalent et tient éternellement. Le meilleur rapport qualité-prix de la parfumerie de niche.\"",
    "\"Reflection Man smells like walking through a pristine garden in a perfectly tailored white linen suit. Pure class, pure refinement. Nothing comes close.\"": "\"Reflection Man sent comme marcher dans un jardin immaculé en costume de lin blanc parfaitement ajusté. Du pur raffinement, du pur prestige. Rien ne s'en approche.\"",
    "\"Sedley is like a mojito in a bottle but classier. The spearmint-bergamot combo is incredibly refreshing. Perfect summer gem from the Marly house.\"": "\"Sedley est comme un mojito en bouteille mais en plus chic. Le duo menthe verte-bergamote est incroyablement rafraîchissant. Un joyau d'été parfait de la maison Marly.\"",
    "\"Side Effect is like being hugged by a warm blanket soaked in rum and vanilla next to a fire. Absolutely intoxicating. One spray and you are hooked for life.\"": "\"Side Effect, c'est comme être enveloppé d'une couverture chaude imbibée de rhum et de vanille près d'un feu. Absolument enivrant. Une seule vaporisation et vous êtes accroché à vie.\"",
    "\"Naxos is honey-tobacco perfection. Like a decadent Italian pastry shop meets a fine cigar lounge. Once you smell this, every other tobacco fragrance feels incomplete.\"": "\"Naxos est la perfection miel-tabac. Comme une pâtisserie italienne décadente qui rencontre un salon de cigares de luxe. Une fois que vous l'avez senti, tous les autres parfums de tabac semblent incomplets.\"",
    "\"Grand Soir is the most luxurious amber fragrance ever created. Liquid gold that wraps around you like cashmere. The definition of refined opulence.\"": "\"Grand Soir est le parfum d'ambre le plus luxueux jamais créé. De l'or liquide qui vous enveloppe comme un cachemire. La définition de l'opulence raffinée.\"",
    "\"Balayage is warm golden elegance in a bottle. The tuberose-jasmine heart wrapped in sandalwood is absolutely intoxicating. Pure luxury.\"": "\"Balayage est une élégance dorée et chaleureuse en bouteille. Le cœur tubéreuse-jasmin enveloppé de santal est absolument enivrant. Un pur luxe.\"",
    "\"Valaya Exclusive is ethereal elegance. The orange blossom and cashmeran combo is divine. An absolute masterpiece from Marly.\"": "\"Valaya Exclusive est une élégance éthérée. Le duo fleur d'oranger et cashmeran est divin. Un chef-d'œuvre absolu de Marly.\"",
    "\"1 Million Night is dark, spicy, and intoxicating. The cinnamon-leather combo is seductive and bold. A true night-time beast.\"": "\"1 Million Night est sombre, épicé et enivrant. Le duo cannelle-cuir est séduisant et audacieux. Une vraie bête nocturne.\"",
    "\"Freedom Musk Matcha is like a zen garden in perfume form. The matcha-green tea opening is fresh and calming, the musk-vanilla drydown is comforting.\"": "\"Freedom Musk Matcha est comme un jardin zen sous forme de parfum. L'ouverture matcha-thé vert est fraîche et apaisante, le fond musc-vanille est réconfortant.\"",
    "\"Torino21 is summer in a bottle. The lemon-mint-basil opening is electric, the herbal heart is elegant. The best citrus fragrance money can buy.\"": "\"Torino21 est l'été en bouteille. L'ouverture citron-menthe-basilic est électrique, le cœur herbacé est élégant. Le meilleur parfum d'agrumes qui soit.\"",
    "\"Kayali Marshmallow is like being wrapped in the softest cloud of sweetness. The strawberry-marshmallow opening melts into the most gorgeous vanilla-peony heart.\"": "\"Kayali Marshmallow, c'est comme être enveloppé dans le plus doux nuage de douceur. L'ouverture fraise-guimauve fond dans le plus superbe cœur vanille-pivoine.\"",
    "\"Florabloom Forte is Guerlain at its most radiant. A bouquet of rose, peony, and violet wrapped in the most elegant musk and cedar.\"": "\"Florabloom Forte est Guerlain dans toute sa splendeur. Un bouquet de rose, de pivoine et de violette enveloppé du musc et du cèdre les plus élégants.\"",
    "\"Angel Nova is raspberry bliss. The fruity-floral opening is vibrant and modern, the benzoin-vanilla base is addictive. Mugler magic.\"": "\"Angel Nova est un bonheur framboisé. L'ouverture fleurie-fruitée est vibrante et moderne, la base benjoin-vanille est addictive. La magie de Mugler.\"",
    "\"Acqua di Gio Elixir takes the DNA to new depths. The marine opening is crystalline, the patchouli-amber base is rich and complex. The best ADG ever made.\"": "\"Acqua di Gio Elixir pousse l'ADN à de nouvelles profondeurs. L'ouverture marine est cristalline, la base patchouli-ambre est riche et complexe. Le meilleur ADG jamais créé.\"",
    "\"Pacific Chill is the essence of coastal luxury. The mint-bergamot opening is incredibly refreshing, and the musky base gives it surprising longevity.\"": "\"Pacific Chill est l'essence du luxe côtier. L'ouverture menthe-bergamote est incroyablement rafraîchissante, et la base musquée lui donne une tenue surprenante.\"",
    "\"Freedom Musk is the perfect everyday scent. The pear opening is delicate, and the musky-amber dry down is gorgeous and intimate.\"": "\"Freedom Musk est le parfum du quotidien parfait. L'ouverture de poire est délicate, et le fond musqué-ambré est superbe et intime.\"",
    "\"Fame in Love is a beautiful romantic scent. The raspberry-rose heart is captivating and the vanilla base is soft and inviting.\"": "\"Fame in Love est une belle senteur romantique. Le cœur framboise-rose est captivant et la base de vanille est douce et accueillante.\"",
    "\"Umo Extradose is an absolute beast. The coffee-oud combo hits hard and lasts forever. Not for the faint of heart.\"": "\"Umo Extradose est une bête absolue. Le duo café-oud frappe fort et tient éternellement. Pas pour les âmes sensibles.\"",
    "\"Donna Extradose is a powerhouse floral. The tuberose-jasmine combo is intoxicating and the vanilla anchor keeps it grounded.\"": "\"Donna Extradose est un floral puissant. Le duo tubéreuse-jasmin est enivrant et l'ancrage de vanille le garde équilibré.\"",
    "\"Cedar Chic is an elegant woody musk. The cedar-rose heart is sophisticated and the musky base is incredibly smooth.\"": "\"Cedar Chic est un musc boisé élégant. Le cœur cèdre-rose est sophistiqué et la base musquée est incroyablement douce.\"",
    "\"L'Impératrice 3 is a juicy burst of fruit. The kiwi-watermelon opening is incredibly refreshing and unique.\"": "\"L'Impératrice 3 est une explosion de fruits juteux. L'ouverture kiwi-pastèque est incroyablement rafraîchissante et unique.\"",
    "\"Eau du Soir is a masterpiece of floral elegance. The grapefruit-rose opening is timeless and the musky base is pure sophistication.\"": "\"Eau du Soir est un chef-d'œuvre d'élégance florale. L'ouverture pamplemousse-rose est intemporelle et la base musquée est un pur raffinement.\"",
    "\"Guidance 46 is Amouage at its finest. The saffron-rose opening is majestic and the oud-amber base is incredibly rich.\"": "\"Guidance 46 est Amouage dans son expression la plus fine. L'ouverture safran-rose est majestueuse et la base oud-ambre est incroyablement riche.\"",
    "\"Her Majesty is pure liquid royalty. The champagne-raspberry opening is celebratory and the rose-vanilla dry down is decadent.\"": "\"Her Majesty est une pure royauté liquide. L'ouverture champagne-framboise est festive et le fond rose-vanille est décadent.\"",
    "\"Si Passione Red Musk is bold and seductive. The raspberry-rose combo is passionate and the musky base is addictive.\"": "\"Si Passione Red Musk est audacieux et séduisant. Le duo framboise-rose est passionné et la base musquée est addictive.\"",
    "\"Bleu Noir is the ultimate blue scent. The lavender-cedar combination is clean yet masculine with amazing performance.\"": "\"Bleu Noir est la senteur bleue ultime. La combinaison lavande-cèdre est propre tout en étant masculine, avec une performance étonnante.\"",
    "\"Vanilla Powder is the most realistic vanilla scent. The iris-vanilla heart is creamy and powdery perfection.\"": "\"Vanilla Powder est la senteur de vanille la plus réaliste. Le cœur iris-vanille est une perfection crémeuse et poudrée.\"",
    "\"La Belle Paradise is a enchanting green floral. The apple-jasmine combo is fresh and the licorice adds a unique twist.\"": "\"La Belle Paradise est un floral vert enchanteur. Le duo pomme-jasmin est frais et la réglisse apporte une touche unique.\"",
    "\"Si Passione Intense is deeper and richer than the original. The cassis-rose heart is gorgeous and the vanilla base is warm.\"": "\"Si Passione Intense est plus profond et plus riche que l'original. Le cœur cassis-rose est superbe et la base de vanille est chaleureuse.\"",
    "\"Stellaris Times is a celestial masterpiece. The iris-violet opening is ethereal and the orris-amber dry down is sublime.\"": "\"Stellaris Times est un chef-d'œuvre céleste. L'ouverture iris-violette est éthérée et le fond iris-ambre est sublime.\"",
    "\"Nautica Voyage is the budget king. The cucumber-lotus opening is incredibly fresh and it performs surprisingly well.\"": "\"Nautica Voyage est le roi du budget. L'ouverture concombre-lotus est incroyablement fraîche et sa tenue est étonnamment bonne.\"",
    "\"Elves is a magical green fragrance. The green tea-mint opening is energizing and the floral heart is delicate.\"": "\"Elves est un parfum vert magique. L'ouverture thé vert-menthe est énergisante et le cœur floral est délicat.\"",
    "\"Rose Amira is a stunning rose-oud combination. The raspberry-rose opening is bright and the oud-saffron heart is exotic.\"": "\"Rose Amira est une superbe combinaison de rose et d'oud. L'ouverture framboise-rose est lumineuse et le cœur oud-safran est exotique.\"",
    "\"40 Knots is Xerjoff's nautical masterpiece. The sea salt-bergamot opening is photorealistic and the ambergris base is luxurious.\"": "\"40 Knots est le chef-d'œuvre nautique de Xerjoff. L'ouverture sel marin-bergamote est photoréaliste et la base d'ambre gris est luxueuse.\"",
    "\"Power of You is as bold as its name. The tuberose-rose combo is commanding and the amber base is empowering.\"": "\"Power of You est aussi audacieux que son nom. Le duo tubéreuse-rose est imposant et la base d'ambre est valorisante.\"",
    "\"Valentina Poudre is an elegant powdery floral. The iris-rose opening is sophisticated and the vanilla-sandalwood dry down is soft.\"": "\"Valentina Poudre est un floral poudré élégant. L'ouverture iris-rose est sophistiquée et le fond vanille-santal est doux.\"",
    "\"Valentina Absolue is opulent and lush. The jasmine-tuberose heart is intoxicating and the vanilla base is heavenly.\"": "\"Valentina Absolue est opulent et luxuriant. Le cœur jasmin-tubéreuse est enivrant et la base de vanille est divine.\"",
    "\"Fantasmagoria is a hidden gem. The saffron-oud combo is rich and the incense adds a mysterious spiritual depth.\"": "\"Fantasmagoria est un joyau caché. Le duo safran-oud est riche et l'encens ajoute une mystérieuse profondeur spirituelle.\"",
    "\"Suprême Bouquet is a beautiful floral explosion. The pear-rose opening is delicate and the peony heart is exquisite.\"": "\"Suprême Bouquet est une magnifique explosion florale. L'ouverture poire-rose est délicate et le cœur de pivoine est exquis.\"",
    "\"Rose Star is Dior's rose opus. The raspberry-rose opening is radiant and the oud-iris heart gives it depth.\"": "\"Rose Star est l'opus rose de Dior. L'ouverture framboise-rose est radieuse et le cœur oud-iris lui donne de la profondeur.\"",
    "\"Oud Voyager is Tom Ford's darkest creation. The oud-saffron opening is bold and the leather-incense heart is primal.\"": "\"Oud Voyager est la création la plus sombre de Tom Ford. L'ouverture oud-safran est audacieuse et le cœur cuir-encens est primal.\"",
    "\"Flowerbomb Extrême is an explosion of flowers. The jasmine-orange blossom heart is intoxicating and the patchouli adds depth.\"": "\"Flowerbomb Extrême est une explosion de fleurs. Le cœur jasmin-fleur d'oranger est enivrant et le patchouli ajoute de la profondeur.\"",
    "\"Santal Royal is Guerlain's regal sandalwood. The rose-sandalwood opening is luxurious and the leather-oud heart is bold.\"": "\"Santal Royal est le santal royal de Guerlain. L'ouverture rose-santal est luxueuse et le cœur cuir-oud est audacieux.\"",
    "\"Terroni is the most realistic earth scent. The petrichor-moss opening is like雨后 soil and the leather-tobacco heart is primal.\"": "\"Terroni est la senteur de terre la plus réaliste. L'ouverture pétrichor-mousse est comme un sol après la pluie et le cœur cuir-tabac est primal.\"",
    "\"Oud Royal is Guerlain's take on royal oud. The saffron-rose opening is majestic and the incense adds spiritual depth.\"": "\"Oud Royal est la vision de l'oud royal de Guerlain. L'ouverture safran-rose est majestueuse et l'encens ajoute une profondeur spirituelle.\"",
    "\"Noir Extreme is the king of gourmand. The cardamom-kulfi combo is deliciously addictive and the amber base is warm.\"": "\"Noir Extreme est le roi du gourmand. Le duo cardamome-kulfi est délicieusement addictif et la base d'ambre est chaleureuse.\"",
    "\"Guilty Elixir Femme is a bold floral. The lavender-rose opening is unexpected and the vanilla-cedar base is elegant.\"": "\"Guilty Elixir Femme est un floral audacieux. L'ouverture lavande-rose est inattendue et la base vanille-cèdre est élégante.\"",
    "\"Rosendo Mateu Nº5 is a floral masterpiece. The rose-jasmine heart is perfectly balanced with woody base notes.\"": "\"Rosendo Mateu Nº5 est un chef-d'œuvre floral. Le cœur rose-jasmin est parfaitement équilibré avec des notes de fond boisées.\"",
    "\"Les Sables Roses is a desert rose masterpiece. The raspberry-rose opening is stunning and the oud-saffron heart is exotic.\"": "\"Les Sables Roses est un chef-d'œuvre de rose du désert. L'ouverture framboise-rose est éblouissante et le cœur oud-safran est exotique.\"",
    "\"Wanted Elixir is the best of the line. The cardamom-leather combo is bold and the tonka bean base is addictive.\"": "\"Wanted Elixir est le meilleur de la gamme. Le duo cardamome-cuir est audacieux et la base de fève tonka est addictive.\"",
    "\"Ambassador is a sophisticated fresh scent. The grapefruit-bergamot opening is crisp and the lavender-cedar heart is elegant.\"": "\"Ambassador est une senteur fraîche et sophistiquée. L'ouverture pamplemousse-bergamote est nette et le cœur lavande-cèdre est élégant.\"",
    "\"La Bomba is an explosion of fruit and flowers. The strawberry-tuberose combo is playful yet sophisticated.\"": "\"La Bomba est une explosion de fruits et de fleurs. Le duo fraise-tubéreuse est espiègle tout en étant sophistiqué.\"",
    "\"Ambre Samar is the most beautiful amber. The saffron-amber opening is golden and the oud-incense heart is mystical.\"": "\"Ambre Samar est le plus bel ambre. L'ouverture safran-ambre est dorée et le cœur oud-encens est mystique.\"",
    "\"Myrrh & Tonka is Jo Malone at their best. The myrrh-tonka combo is warm and comforting with great depth.\"": "\"Myrrh & Tonka est Jo Malone à son meilleur. Le duo myrrhe-tonka est chaleureux et réconfortant, avec une grande profondeur.\"",
    "\"Chanel N°5 is the undisputed queen. The aldehyde-floral opening is revolutionary and the jasmine-rose heart is timeless.\"": "\"Chanel N°5 est la reine incontestée. L'ouverture florale aldéhydée est révolutionnaire et le cœur jasmin-rose est intemporel.\"",
    "\"Ganymède is the future of perfumery. The saffron-suede opening is unique and the ambroxan-mineral base is ethereal.\"": "\"Ganymède est l'avenir de la parfumerie. L'ouverture safran-suède est unique et la base ambroxan-minérale est éthérée.\"",
    "\"Crush on Me is pure romantic bliss. The strawberry-rose combo is adorable and the vanilla-musk base is kissable.\"": "\"Crush on Me est un pur bonheur romantique. Le duo fraise-rose est adorable et la base vanille-musc est irrésistible.\"",
    "\"Armani Code Parfum is the best of the line. The lavender-anise opening is intriguing and the leather-tonka heart is seductive.\"": "\"Armani Code Parfum est le meilleur de la gamme. L'ouverture lavande-anis est intrigante et le cœur cuir-tonka est séduisant.\"",
    "\"Hudson Valley is a breath of fresh air. The apple-mint opening is crisp and the vetiver-cedar base is grounded.\"": "\"Hudson Valley est une bouffée d'air frais. L'ouverture pomme-menthe est nette et la base vétiver-cèdre est ancrée.\"",
    "\"Black Opium is the queen of night. The coffee-vanilla combo is addictive and the jasmine adds a beautiful floral contrast.\"": "\"Black Opium est la reine de la nuit. Le duo café-vanille est addictif et le jasmin ajoute un magnifique contraste floral.\"",
    "\"Vanilla Candy Rock Sugar is pure happiness. The cotton candy-vanilla combo is playful and the tonka bean base is warm.\"": "\"Vanilla Candy Rock Sugar est un pur bonheur. Le duo barbe à papa-vanille est espiègle et la base de fève tonka est chaleureuse.\"",
    "\"Mon Paris is a love letter in a bottle. The strawberry-datura combo is intoxicatingly romantic and the patchouli adds depth.\"": "\"Mon Paris est une lettre d'amour en bouteille. Le duo fraise-datura est délicieusement romantique et le patchouli ajoute de la profondeur.\"",
    "\"Flower by Kenzo is a delicate floral beauty. The rose-violet opening is soft and the vanilla-musk base is comforting.\"": "\"Flower by Kenzo est une beauté florale délicate. L'ouverture rose-violette est douce et la base vanille-musc est réconfortante.\"",
    "\"Narciso is the quintessential musk. The rose-peony opening is elegant and the iris-lily heart is pure sophistication.\"": "\"Narciso est le musc par excellence. L'ouverture rose-pivoine est élégante et le cœur iris-lis est un pur raffinement.\"",
    "\"Cristal Noir is a hidden gem from Raghba. The black currant-rose combo is intriguing and the amber-cedar base is solid.\"": "\"Cristal Noir est un joyau caché de Raghba. Le duo cassis-rose est intrigant et la base ambre-cèdre est solide.\"",
    "\"Trésor la Nuit is a beautiful night floral. The rose-datura opening is seductive and the vanilla-iris heart is creamy.\"": "\"Trésor la Nuit est un magnifique floral de nuit. L'ouverture rose-datura est séduisante et le cœur vanille-iris est crémeux.\"",
    "\"Manifesto Elixir is a bold statement. The rose-musk combo is empowering and the vanilla-amber base is unforgettable.\"": "\"Manifesto Elixir est une déclaration audacieuse. Le duo rose-musc est valorisant et la base vanille-ambre est inoubliable.\"",
    "\"Alien is otherworldly perfection. The jasmine-cashmeran combo is addictive and the white amber base is ethereal.\"": "\"Alien est une perfection d'un autre monde. Le duo jasmin-cashmeran est addictif et la base d'ambre blanc est éthérée.\"",
    "\"Elie Saab In White is the ultimate white floral. The orange blossom-jasmine combo is radiant and the lily adds purity.\"": "\"Elie Saab In White est le floral blanc ultime. Le duo fleur d'oranger-jasmin est radieux et le lys ajoute de la pureté.\"",

    /* ---- Missing UI / attribute translations ---- */
    "Toggle light / night theme": "Basculer thème clair/nuit",
    "Search by Ingredients": "Rechercher par ingrédients",
    "Mark all as read": "Tout marquer comme lu",
    "Guest Notes": "Notes invité",
    "You're all caught up!": "Vous êtes à jour !",
    "Latest News & Updates": "Dernières actualités et mises à jour",

    /* ---- Attribute translations ---- */
    "Announcement": "Annonce",
    "Close announcement": "Fermer l'annonce",
    "Search fragrances": "Rechercher des parfums",
    "Chat with the store on WhatsApp": "Discuter avec la boutique sur WhatsApp",
    "Follow us on Facebook": "Suivez-nous sur Facebook",
    "Follow us on Instagram": "Suivez-nous sur Instagram",
    "Back to top": "Retour en haut",
    "Perfume display mode": "Mode d'affichage des parfums",
    "User Avatar": "Avatar utilisateur",
    "Profile Avatar": "Avatar du profil",
    "Mixte/unisex": "Mixte/unisexe",
    "Homme/men": "Homme/hommes",
    "Femme/women": "Femme/femmes",
    "Browse all fragrances in our collection": "Parcourir tous les parfums de notre collection",
    "Find us on OpenStreetMap": "Nous trouver sur OpenStreetMap",

    /* ---- Dynamic UI strings (script.js) ---- */
    "Unknown Brand": "Marque inconnue",
    "Charme Collection": "Collection Charme",
    "Database": "Base de données",
    "Catalog Collection": "Collection catalogue",
    "Catalog Favorite": "Favori catalogue",
    "Request Scent": "Demander le parfum",
    "Performance estimate": "Estimation de performance",
    "Scent Profile": "Profil olfactif",
    "Fragrance Story": "Histoire du parfum",
    "Catalog fragrance": "Parfum catalogue",
    "Reviews available by request": "Avis disponibles sur demande",
    "This catalog fragrance can be promoted to a shop product page when needed.": "Ce parfum catalogue peut être promu en page produit boutique si nécessaire.",
    "Perfumer": "Parfumeur",
    "Unknown": "Inconnu",
    "Men": "Homme",
    "Women": "Femme",
    "A catalog fragrance profile with curated notes and style details.": "Un profil de parfum catalogue avec des notes et des détails de style sélectionnés.",
    "All database perfumes are already displayed.": "Tous les parfums de la base de données sont déjà affichés.",
    "No fragrances found": "Aucun parfum trouvé",
    "No fragrances found in this category.": "Aucun parfum trouvé dans cette catégorie.",
    "No users found": "Aucun utilisateur trouvé",
    "Member since ${year}": "Membre depuis ${year}",
    "Search Results": "Résultats de recherche",
    "✓ Available": "✓ Disponible",
    "✗ Not Available": "✗ Indisponible",
    "No results found": "Aucun résultat trouvé",
    "Try searching for different keywords or browse our popular searches above.": "Essayez de rechercher avec d'autres mots-clés ou parcourez nos recherches populaires ci-dessus.",
    "Also reminds of": "Rappelle aussi",
    "Perfumes with a similar scent profile": "Parfums au profil olfactif similaire",
    "Save Changes": "Enregistrer les modifications",
    "Saving...": "Enregistrement...",
    "Delete": "Supprimer",
    "Remove": "Retirer",
    "Edit": "Modifier",
    "Cancel": "Annuler",
    "Admin": "Administrateur",
    "Banned": "Banni",
    "Active": "Actif",
    "Never": "Jamais",
    "Unban": "Débannir",
    "Ban": "Bannir",
    "Member": "Membre",
    "Favourited": "Ajouté aux favoris",
    "Add to Favourites": "Ajouter aux favoris",
    "Remove from favorites": "Retirer des favoris",
    "Add to favorites": "Ajouter aux favoris",
    "All favorites cleared!": "Tous les favoris ont été supprimés !",
    "Cart cleared!": "Panier vidé !",
    "Your cart is empty!": "Votre panier est vide !",
    "Checkout functionality coming soon!": "Fonctionnalité de paiement bientôt disponible !",
    "Remove item": "Retirer l'article",
    "Posting...": "Publication...",
    "Review posted successfully!": "Avis publié avec succès !",
    "Failed to post review. Please try again.": "Échec de la publication. Veuillez réessayer.",
    "No reviews yet": "Aucun avis pour le moment",
    "1 review": "1 avis",
    "No reviews yet.": "Aucun avis pour le moment.",
    "Edit Review": "Modifier l'avis",
    "Rating:": "Note :",
    "Review:": "Avis :",
    "Review text cannot be empty": "Le texte de l'avis ne peut pas être vide",
    "Please select a rating": "Veuillez sélectionner une note",
    "Review updated successfully": "Avis mis à jour avec succès",
    "Failed to update review": "Échec de la mise à jour de l'avis",
    "Review not found": "Avis introuvable",
    "You can only edit your own reviews": "Vous ne pouvez modifier que vos propres avis",
    "Are you sure you want to delete this review? This action cannot be undone.": "Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible.",
    "Review deleted successfully": "Avis supprimé avec succès",
    "Failed to delete review": "Échec de la suppression de l'avis",
    "Network error. Please try again.": "Erreur réseau. Veuillez réessayer.",
    "Please sign in to submit a review.": "Veuillez vous connecter pour publier un avis.",
    "Please select a rating.": "Veuillez sélectionner une note.",
    "Please write at least 10 characters in your review.": "Veuillez écrire au moins 10 caractères dans votre avis.",
    "Reply to ${name}": "Répondre à ${name}",
    "Share your thoughts...": "Partagez vos pensées...",
    "Cancel reply": "Annuler la réponse",
    "Submit reply": "Envoyer la réponse",
    "Please wait before submitting another reply": "Veuillez patienter avant d'envoyer une autre réponse",
    "Reply form not found": "Formulaire de réponse introuvable",
    "Please enter a reply": "Veuillez saisir une réponse",
    "Reply must be at least 3 characters long": "La réponse doit contenir au moins 3 caractères",
    "Reply is too long (max 1000 characters)": "La réponse est trop longue (max 1000 caractères)",
    "HTML tags are not allowed in replies": "Les balises HTML ne sont pas autorisées dans les réponses",
    "Reply appears to be spam. Please write a meaningful comment.": "La réponse semble être du spam. Veuillez écrire un commentaire utile.",
    "Please avoid excessive repeated characters": "Veuillez éviter les caractères répétés excessivement",
    "Authentication required. Please sign in again.": "Authentification requise. Veuillez vous reconnecter.",
    "Submitting...": "Envoi en cours...",
    "Reply added successfully!": "Réponse ajoutée avec succès !",
    "Failed to submit reply": "Échec de l'envoi de la réponse",
    "Failed to submit reply. Please try again.": "Échec de l'envoi de la réponse. Veuillez réessayer.",
    "Please sign in to submit a reply.": "Veuillez vous connecter pour envoyer une réponse.",
    "Network error. Please check your connection and try again.": "Erreur réseau. Vérifiez votre connexion et réessayez.",
    "Request timed out. Please try again.": "La requête a expiré. Veuillez réessayer.",
    "This review is no longer available": "Cet avis n'est plus disponible",
    "Failed to load replies": "Échec du chargement des réponses",
    "Reply deleted successfully!": "Réponse supprimée avec succès !",
    "Failed to delete reply. Please try again.": "Échec de la suppression de la réponse. Veuillez réessayer.",
    "Please sign in to delete replies.": "Veuillez vous connecter pour supprimer des réponses.",
    "You can only delete your own replies.": "Vous ne pouvez supprimer que vos propres réponses.",
    "Like this reply": "Aimer cette réponse",
    "Dislike this reply": "Ne pas aimer cette réponse",
    "Please wait before voting again": "Veuillez patienter avant de voter à nouveau",
    "Please sign in to interact with reviews": "Veuillez vous connecter pour interagir avec les avis",
    "Are you sure you want to delete this reply?": "Êtes-vous sûr de vouloir supprimer cette réponse ?",
    "This action cannot be undone.": "Cette action est irréversible.",
    "Failed to like review": "Échec de l'ajout du like",
    "Failed to dislike review": "Échec de l'ajout du dislike",
    "Please sign in to like reviews.": "Veuillez vous connecter pour aimer les avis.",
    "Please sign in to dislike reviews.": "Veuillez vous connecter pour ne pas aimer les avis.",
    "Loading profile...": "Chargement du profil...",
    "Please sign in to view profiles": "Veuillez vous connecter pour voir les profils",
    "Favorite Fragrances": "Parfums favoris",
    "Purchased Fragrances": "Parfums achetés",
    "Joined ${date}": "Inscrit le ${date}",
    "Reviews": "Avis",
    "Replies": "Réponses",
    "Followers": "Abonnés",
    "Following": "Abonnements",
    "Follow": "Suivre",
    "No fragrances yet": "Aucun parfum pour le moment",
    "Please log in to update your profile photo": "Veuillez vous connecter pour mettre à jour votre photo de profil",
    "Profile updated successfully": "Profil mis à jour avec succès",
    "Failed to update profile. Please try again.": "Échec de la mise à jour du profil. Veuillez réessayer.",
    "First name is required": "Le prénom est requis",
    "Please enter a valid phone number": "Veuillez saisir un numéro de téléphone valide",
    "Birthday cannot be in the future": "L'anniversaire ne peut pas être dans le futur",
    "Please enter a valid birthday": "Veuillez saisir une date de naissance valide",
    "Please sign in to save settings": "Veuillez vous connecter pour enregistrer les paramètres",
    "Account deleted successfully": "Compte supprimé avec succès",
    "You have been signed out successfully.": "Vous avez été déconnecté avec succès.",
    "Email verified successfully! Welcome to Parfumerie Charme.": "E-mail vérifié avec succès ! Bienvenue chez Parfumerie Charme.",
    "Account created successfully! Welcome to Parfumerie Charme.": "Compte créé avec succès ! Bienvenue chez Parfumerie Charme.",
    "User data not found. Please log in again.": "Données utilisateur introuvables. Veuillez vous reconnecter.",
    "Please log in again": "Veuillez vous reconnecter",
    "Sign In Required": "Connexion requise",
    "Failed to load users data": "Échec du chargement des données utilisateurs",
    "Error loading users data": "Erreur lors du chargement des données utilisateurs",
    "User banned successfully": "Utilisateur banni avec succès",
    "Error banning user": "Erreur lors du bannissement de l'utilisateur",
    "User unbanned successfully": "Utilisateur débanni avec succès",
    "Error unbanning user": "Erreur lors du débannissement de l'utilisateur",
    "Failed to load loyalty cards": "Échec du chargement des cartes de fidélité",
    "Error loading loyalty cards": "Erreur lors du chargement des cartes de fidélité",
    "No loyalty cards yet.": "Aucune carte de fidélité pour le moment.",
    "Error adding loyalty points": "Erreur lors de l'ajout de points de fidélité",
    "Error redeeming loyalty reward": "Erreur lors de l'échange de la récompense",
    "Error creating loyalty card": "Erreur lors de la création de la carte de fidélité",
    "Error updating loyalty points": "Erreur lors de la mise à jour des points",
    "Error deleting loyalty card": "Erreur lors de la suppression de la carte de fidélité",
    "Sent!": "Envoyé !",
    "Send ✦": "Envoyer ✦",
    "Error": "Erreur",
    "Please log in to view notes.": "Veuillez vous connecter pour voir les notes.",
    "Failed to load notes.": "Échec du chargement des notes.",
    "No notes yet.": "Aucune note pour le moment.",
    "Anonymous": "Anonyme",
    "Mark read": "Marquer comme lu",
    "Delete this note?": "Supprimer cette note ?",
    "Top Notes": "Notes de tête",
    "Heart Notes": "Notes de cœur",
    "Base Notes": "Notes de fond",
    "Fresh & Initial Impressions": "Fraîcheur & premières impressions",
    "Unsubscribe": "Se désabonner",
    "Subscribed": "Abonné",
    "Thanks for subscribing!": "Merci de votre abonnement !",
    "You have been unsubscribed.": "Vous avez été désabonné.",
    "Failed to subscribe. Please try again.": "Échec de l'abonnement. Veuillez réessayer.",
    "Failed to unsubscribe. Please try again.": "Échec du désabonnement. Veuillez réessayer.",
    "Please enter a valid email address": "Veuillez saisir une adresse e-mail valide",
    "Subtotal": "Sous-total",
    "Shipping": "Livraison",
    "Tax": "TVA",
    "Total": "Total",
    "Qty": "Qté",
    "Share fragrance": "Partager le parfum",
    "Close notification": "Fermer la notification",
    "Similar fragrances": "Parfums similaires",

    /* ---- Store hours card (live) ---- */
    "Store Hours": "Heures d'ouverture",
    "Closed now": "Fermé pour le moment",
    "Closed": "Fermé",
    "Today": "Aujourd'hui",
    "Appointments on request": "Sur rendez-vous",
    "GMT+1 · Tunis Local Time": "GMT+1 · Heure de Tunis",
    "Sunday": "Dimanche",
    "Monday": "Lundi",
    "Tuesday": "Mardi",
    "Wednesday": "Mercredi",
    "Thursday": "Jeudi",
    "Friday": "Vendredi",
    "Saturday": "Samedi",
    "Checking...": "Vérification...",

    /* ---- Admin store-hours editor ---- */
    "Cannot load (auth required)": "Chargement impossible (authentification requise)",
    "Resetting...": "Réinitialisation...",
    "Reset to defaults": "Réinitialisation effectuée",
    "Reset failed": "Échec de la réinitialisation",
    "Reset error": "Erreur de réinitialisation",
    "Load error": "Erreur de chargement",
    "Reset": "Réinitialiser",
    "Footer timezone note": "Note de fuseau horaire (pied de carte)",
    "Footer action note": "Note d'action (pied de carte)",
    "Saved": "Enregistré",
    "Saving...": "Enregistrement...",
    "Save failed": "Échec de l'enregistrement",
    "Save error": "Erreur d'enregistrement",

    /* ---- Note card ---- */
    "Leave a note": "Laissez un message",
    "Direct message to our team.": "Un message direct à notre équipe.",
    "Send message": "Envoyer le message",

    /* ---- Concierge / grid ---- */
    "Store Direct": "Contact direct",
    "All Fragrances": "Tous les parfums"
  };

  var frReverse = {};
  (function buildReverse() {
    for (var en in FR) {
      if (Object.prototype.hasOwnProperty.call(FR, en)) {
        var fr = FR[en];
        if (!(fr in frReverse)) frReverse[fr] = en;
      }
    }
  })();

  var current = null;
  var originalText = new WeakMap();
  var originalTitle = null;

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setStored(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function t(str) {
    if (!str || typeof str !== "string") return str;
    if (current === "en") return str;
    if (PROTECTED[str]) return str;
    var d = dictFor(current);
    if (d && Object.prototype.hasOwnProperty.call(d, str)) return d[str];
    return str;
  }

  var COUNT_RE = /^(\d[\d.,]*)\s+(comments?|reviews?|votes?|likes?|followers?)$/;
  var TIME_RE = /^(\d+)\s+(day|week|month|year)s?\s+ago$/;
  var RATING_RE = /^(\d[\d.,]*)\s+out of 5$/;
  var POSTED_RE = /^Posted by (u\/[\w]+)$/;
  var PCT_RE = /^(\d+)\s*%$/;
  var POSTED_AGO_RE = /^Posted by\s+(u\/[\w]+)\s+(\d+)\s+(day|week|month|year)s?\s+ago$/;
  var SHARE_RE = /^Share your experience with (.+)$/;
  var SHARE_FIRST_RE = /^Be the first to share your experience with (.+)!$/;
  var REVIEW_FOR_RE = /^Sign in to write a review for (.+)\.$/;
  var REVIEW_SHARE_RE = /^Sign in to write a review and share your thoughts about (.+) with the community\.$/;
  var LAUNCHED_RE = /^was\s+launched\s+in\s+(\d{4})\.\s+The\s+nose\s+behind\s+this\s+fragrance\s+is\s+(.+?)\.?\s*$/;
  var LAUNCHED_NOTES_RE = /^was\s+launched\s+in\s+(\d{4})\.\s+The\s+nose\s+behind\s+this\s+fragrance\s+is\s+(.+?)\.\s+(Top notes are .+)$/;
  /* prices are quoted in Tunisian dinar: "135 dt", "1 250 dt" */
  var CURRENCY_RE = /^(\d[\d.,\u00a0\s]*)\s*dt$/i;
  /* vote/like counts abbreviated on Reddit-style cards: "1.8k", "3,1k" */
  var KNUM_RE = /^(\d+(?:[.,]\d+)?)\s*k$/i;
  /* wear-time ranges: "10-12+ hours", "8-12 hours", "0-15 min", "4-8+ hrs" */
  var DURATION_RE = /^(\d+\s*-\s*\d+\+?)\s*(hours?|hrs?|min)$/i;
  /* sentence fragments split across spans: "and sweet", ", smooth", ", and warm" */
  var FRAG_RE = /^(,\s*)?(?:and\s+)?([A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f'’-]*)$/;
  /* option labels written as "Bleu de Chanel —" : name must survive, dash kept */
  var NAME_DASH_RE = /^(.+?)\s*—\s*$/;
  /* wear-time written compactly: "15min-4hrs", "30min-2hr", "2hr+" */
  var MINHR_RE = /^(\d+)\s*min\s*-\s*(\d+)\s*hrs?$/i;
  var HRPLUS_RE = /^(\d+)\s*hrs?\s*\+$/i;
  /* paired comparative descriptors: "Deeper & warmer", "Fresh & bright" */
  var AMP_PAIR_RE = /^([A-Za-z\u00c0-\u024f]+)\s*&\s*([A-Za-z\u00c0-\u024f]+)$/;
  /* meter labels: "Fresh:", "Woody:" */
  var COLON_RE = /^([A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f\s'-]*):$/;
  /* Matches:  "is a Woody Fruity fragrance."                            (an|a)
               "... fragrance for women and men."   / for women / for men
               "... fragrance. It was launched in 2019."
               "... fragrance. Launched in 2023."
               "... fragrance. It was launched in 2015. The nose behind this fragrance is X." */
  var GENRE_RE = /^is an?\s+(.+?)\s+fragrance(?:\s+for\s+(women and men|women|men))?\.(?:\s*(?:It\s+was\s+|It\s+)?[Ll]aunched in (\d{4})\.(?:\s*The\s+nose\s+behind\s+this\s+fragrance\s+is\s+(.+?)\.?)?)?\s*$/;
  var NOTE_LIST_RE = /^Top notes are (.+)$/;
  var EMAIL_CMT_RE = /^\ud83d\udcac\s*(\d+)\s+comments?$/;
  var BULLET_RE = /\s*\u2022\s*/;
  var DASH_YEAR_RE = /^(.+?)\s*\u2014\s*(\d{4})$/;
  var IN_YEAR_RE = /^in\s+(\d{4}),\s+this\s+(.+?)\s+masterpiece continues to captivate fragrance enthusiasts worldwide\.$/;

  var GENRES = {
    "Oriental Floral": "floral oriental",
    "Oriental Gourmand": "gourmand oriental",
    "Fresh Green": "frais et vert",
    "Woody": "boisé",
    "Floral": "floral",
    "Fresh": "frais",
    "Sweet": "sucré",
    "Fruity": "fruité",
    "Aquatic": "aquatique",
    "Aromatic": "aromatique"
  };

  /* Per-language template vocabulary used by the pattern matchers below. */
  var GENRES_AR = {
    "Oriental Floral": "زهري شرقي",
    "Oriental Gourmand": "غورماند شرقي",
    "Fresh Green": "أخضر منعش",
    "Woody": "خشبي",
    "Floral": "زهري",
    "Fresh": "منعش",
    "Sweet": "حلو",
    "Fruity": "فاكهي",
    "Aquatic": "مائي",
    "Aromatic": "أروماتي"
  };

  function arNum(n) { return Number(String(n).replace(/[.,]/g, "")); }
  function arPlural(n, forms) {
    var v = arNum(n);
    if (v === 1) return forms[0];
    if (v === 2) return forms[1];
    /* zero takes the plural in Arabic: "0 تعليقات" */
    if (v === 0) return v + " " + forms[2];
    if (v >= 3 && v <= 10) return v + " " + forms[2];
    return v + " " + forms[3];
  }

  var LX = {
    fr: {
      count: function (n, unit) {
        var L = { "comment": ["commentaire", "commentaires"], "review": ["avis", "avis"],
                  "vote": ["vote", "votes"], "like": ["j'aime", "j'aime"],
                  "follower": ["abonné", "abonnés"] }[unit];
        if (!L) return n + " " + unit;
        return n + " " + (arNum(n) > 1 ? L[1] : L[0]);
      },
      timeAgo: function (n, u) {
        var L = { "day": ["jour", "jours"], "week": ["semaine", "semaines"],
                  "month": ["mois", "mois"], "year": ["an", "ans"] }[u];
        return "il y a " + n + " " + (arNum(n) > 1 ? L[1] : L[0]);
      },
      rating: function (n) { return n + " sur 5"; },
      postedBy: function (u) { return "Publié par " + u; },
      postedAgo: function (u, s) { return "Publié par " + u + " " + s; },
      emailCmt: function (n) { return "\ud83d\udcac " + this.count(n, "comment"); },
      shareExp: function (x) { return "Partagez votre expérience avec " + x; },
      shareFirst: function (x) { return "Soyez le premier à partager votre expérience avec " + x + " !"; },
      reviewFor: function (x) { return "Connectez-vous pour écrire un avis sur " + x + "."; },
      reviewShare: function (x) { return "Connectez-vous pour écrire un avis et partager vos impressions sur " + x + " avec la communauté."; },
      launched: function (y, n) { return "Lancé en " + y + ". Le nez derrière ce parfum est " + this.cleanNose(n) + "."; },
      cleanNose: function (n) {
        n = n.replace(/\.+$/, "").trim();
        return n.replace(/\s+and\s+/i, " et ");
      },
      genre: function (g) { return "est un parfum " + g + " pour femmes et hommes."; },
      genres: GENRES,
      noteHeads: { top: "notes de tête : ", middle: "notes de cœur : ", base: "notes de fond : " },
      andWord: " et ", listSep: ", ", sectSep: " ; ", bullet: " \u2022 ",
      inYear: function (y, g) { return "en " + y + ", ce chef-d'œuvre " + g + " continue de captiver les passionnés de parfum dans le monde entier."; },
      openUntil: function (t) { return "Ouvert jusqu'à " + t; },
      opensAt: function (t) { return "Ouvre à " + t; },
      clockLocal: function (t) { return t + " Heure locale"; },
      /* "Aventus is a Woody Fruity fragrance." -> generative, not enumerated */
      isFragrance: function (fam, audience) {
        var s = "est un parfum " + fam;
        return s + (audience ? " " + audience : "") + ".";
      },
      launchedIn: function (y) { return " Lancé en " + y + "."; },
      noseBehind: function (n) { return " Le nez derrière ce parfum est " + n + "."; },
      wasLaunched: function (y) { return "Lancé en " + y + "."; },
      audienceUnisex: "pour femmes et hommes",
      audienceWomen: "pour femmes",
      audienceMen: "pour hommes",
      currency: "DT",
      kNum: function (n) { return n.replace(".", ",") + " k"; },
      duration: function (r, unit, plus) {
        return unit === "min" ? r + " min" : r + (plus ? " h et plus" : " heures");
      },
      fragSep: ", ", fragSepAnd: ", et ", fragAnd: "et ",
      minHour: function (a, b) { return a + " min - " + b + " h"; },
      hrPlus: function (n) { return n + " h et plus"; },
      colon: function (w) { return w + " :"; }
    },
    ar: {
      count: function (n, unit) {
        var F = { "comment": ["تعليق واحد", "تعليقان", "تعليقات", "تعليقًا"],
                  "review": ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"],
                  "vote": ["صوت واحد", "صوتان", "أصوات", "صوتًا"],
                  "like": ["إعجاب واحد", "إعجابان", "إعجابات", "إعجابًا"],
                  "follower": ["متابع واحد", "متابعان", "متابعين", "متابعًا"] }[unit];
        if (!F) return n + " " + unit;
        return arPlural(n, F);
      },
      timeAgo: function (n, u) {
        var F = { "day": ["يوم واحد", "يومين", "أيام", "يومًا"],
                  "week": ["أسبوع واحد", "أسبوعين", "أسابيع", "أسبوعًا"],
                  "month": ["شهر واحد", "شهرين", "أشهر", "شهرًا"],
                  "year": ["سنة واحدة", "سنتين", "سنوات", "سنة"] }[u];
        var v = arNum(n);
        if (v === 1) return "قبل " + F[0];
        if (v === 2) return "قبل " + F[1];
        if (v >= 3 && v <= 10) return "قبل " + v + " " + F[2];
        return "قبل " + v + " " + F[3];
      },
      rating: function (n) { return n + " من 5"; },
      postedBy: function (u) { return "نشر بواسطة " + u; },
      postedAgo: function (u, s) { return "نشر بواسطة " + u + " " + s; },
      emailCmt: function (n) { return "\ud83d\udcac " + this.count(n, "comment"); },
      shareExp: function (x) { return "شارك تجربتك مع " + x; },
      shareFirst: function (x) { return "كن أول من يشارك تجربته مع " + x + "!"; },
      reviewFor: function (x) { return "سجّل الدخول لكتابة تقييم عن " + x + "."; },
      reviewShare: function (x) { return "سجّل الدخول لكتابة تقييم ومشاركة انطباعاتك عن " + x + " مع المجتمع."; },
      launched: function (y, n) { return "تم إطلاقه في " + y + ". صانع هذا العطر هو " + this.cleanNose(n) + "."; },
      cleanNose: function (n) {
        n = n.replace(/\.+$/, "").trim();
        return n.replace(/\s+and\s+/i, " و ");
      },
      genre: function (g) { return "عطر " + g + " للنساء والرجال."; },
      genres: GENRES_AR,
      noteHeads: { top: "المقدمة: ", middle: "القلب: ", base: "القاعدة: " },
      andWord: " و", listSep: "، ", sectSep: "؛ ", bullet: " \u2022 ",
      inYear: function (y, g) { return "في " + y + "، لا تزال هذه التحفة " + g + " تأسر عشاق العطور حول العالم."; },
      openUntil: function (t) { return "مفتوح حتى " + t; },
      opensAt: function (t) { return "يفتح الساعة " + t; },
      clockLocal: function (t) { return t + " بالتوقيت المحلي"; },
      /* "Aventus is a Woody Fruity fragrance." -> generative, not enumerated */
      isFragrance: function (fam, audience) {
        return "عطر " + fam + (audience ? " " + audience : "") + ".";
      },
      launchedIn: function (y) { return " تم إطلاقه في " + y + "."; },
      noseBehind: function (n) { return " صانع هذا العطر هو " + n + "."; },
      wasLaunched: function (y) { return "تم إطلاقه في " + y + "."; },
      audienceUnisex: "للنساء والرجال",
      audienceWomen: "للنساء",
      audienceMen: "للرجال",
      currency: "د.ت",
      kNum: function (n) { return n + " ألف"; },
      duration: function (r, unit, plus) {
        return unit === "min" ? r + " دقيقة" : r + (plus ? " ساعة وأكثر" : " ساعة");
      },
      fragSep: "، ", fragSepAnd: "، و", fragAnd: "و",
      minHour: function (a, b) { return a + " دقيقة - " + b + " ساعة"; },
      hrPlus: function (n) { return n + " ساعة وأكثر"; },
      colon: function (w) { return w + ":"; }
    }
  };

  /* ---- generative rules for perfume-description sentences ----------------
     These sentences appear on all ~186 product sections. Enumerating every
     family combination would be thousands of keys, so they are composed. */
  var FAM_WORDS = {
    fr: {
      "aromatic": "aromatique", "fougere": "fougère", "fougère": "fougère",
      "oriental": "oriental", "spicy": "épicé", "floral": "floral",
      "citrus": "d'agrumes", "woody": "boisé", "aquatic": "aquatique",
      "iris": "iris", "amber": "ambré", "green": "vert", "leather": "cuir",
      "chypre": "chypre", "gourmand": "gourmand", "fresh": "frais",
      "fruity": "fruité", "musk": "musqué", "musky": "musqué",
      "powdery": "poudré", "vanilla": "vanillé", "oud": "oud",
      "rose": "de rose", "tobacco": "de tabac", "sweet": "sucré"
    },
    ar: {
      "aromatic": "أروماتي", "fougere": "فوجير", "fougère": "فوجير",
      "oriental": "شرقي", "spicy": "حار", "floral": "زهري",
      "citrus": "حمضيات", "woody": "خشبي", "aquatic": "مائي",
      "iris": "زنبقي", "amber": "عنبري", "green": "أخضر", "leather": "جلدي",
      "chypre": "شيبري", "gourmand": "جورماند", "fresh": "منعش",
      "fruity": "فاكهي", "musk": "مسكي", "musky": "مسكي",
      "powdery": "بودري", "vanilla": "فانيليا", "oud": "عودي",
      "rose": "وردي", "tobacco": "تبغي", "sweet": "حلو"
    }
  };

  var AUDIENCE_RE = /\s+for\s+(women and men|women|men)\b/i;

  function translateFamilyWords(raw, L) {
    if (!L) return null;
    var table = FAM_WORDS[current];
    var parts = raw.trim().split(/\s+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i].toLowerCase();
      var mapped = table ? table[w] : null;
      if (!mapped) return null;             /* unknown word -> let dictionary handle it */
      out.push(mapped);
    }
    return out.join(" ");
  }

  function translateTimeAgo(num, unit) {
    var labels = { "day": "jour", "week": "semaine", "month": "mois", "year": "an" };
    var label = labels[unit];
    if (unit === "month" && Number(num) > 1) return "il y a " + num + " mois";
    return "il y a " + num + " " + label + (Number(num) > 1 ? "s" : "");
  }

  function translateNoteList(listStr, L) {
    var sections = listStr.split(/;\s*/);
    var out = [];
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var head, body;
      if (/^middle notes are /.test(sec)) { head = L.noteHeads.middle; body = sec.replace(/^middle notes are /, ""); }
      else if (/^base notes are /.test(sec)) { head = L.noteHeads.base; body = sec.replace(/^base notes are /, ""); }
      else { head = L.noteHeads.top; body = sec.replace(/^Top notes are /, ""); }
      var items = body.split(/\s*,\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
      var tr = [];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var parts = item.split(/\s+and\s+/i);
        tr.push(parts.map(function (w) { return t(w); }).join(L.andWord));
      }
      var joined = tr.join(L.listSep);
      var lastSep = joined.lastIndexOf(L.listSep);
      if (lastSep !== -1) joined = joined.slice(0, lastSep) + L.andWord + joined.slice(lastSep + L.listSep.length);
      out.push(head + joined);
    }
    return out.join(L.sectSep);
  }

  function translateWordsPhrase(phrase, L) {
    var words = phrase.split(/\s+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < words.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(FR, words[i])) return null;
      out.push(t(words[i]));
    }
    return out.join(" ");
  }

  function translateString(str) {
    if (!str) return str;
    var direct = t(str);
    if (direct !== str) return direct;

    var m;
    var L = LX[current];
    if (L) {
      m = str.match(COUNT_RE);
      if (m) return L.count(m[1], m[2].replace(/s$/, ""));
      m = str.match(TIME_RE);
      if (m) return L.timeAgo(m[1], m[2]);
      m = str.match(RATING_RE);
      if (m) return L.rating(m[1]);
      m = str.match(POSTED_RE);
      if (m) return L.postedBy(m[1]);
      m = str.match(POSTED_AGO_RE);
      if (m) return L.postedAgo(m[1], L.timeAgo(m[2], m[3]));
      m = str.match(EMAIL_CMT_RE);
      if (m) return L.emailCmt(m[1]);
      m = str.match(SHARE_RE);
      if (m) return L.shareExp(m[1]);
      m = str.match(SHARE_FIRST_RE);
      if (m) return L.shareFirst(m[1]);
      m = str.match(REVIEW_FOR_RE);
      if (m) return L.reviewFor(m[1]);
      m = str.match(REVIEW_SHARE_RE);
      if (m) return L.reviewShare(m[1]);
      m = str.match(LAUNCHED_NOTES_RE);
      if (m) return L.launched(m[1], m[2]) + " " + translateNoteList(m[3], L);
      m = str.match(LAUNCHED_RE);
      if (m) return L.launched(m[1], m[2]);
      m = str.match(CURRENCY_RE);
      if (m) return m[1].trim() + " " + L.currency;
      m = str.match(KNUM_RE);
      if (m) return L.kNum(m[1]);
      m = str.match(DURATION_RE);
      if (m) {
        var plus = m[1].indexOf("+") !== -1;
        return L.duration(m[1], m[2].toLowerCase().charAt(0) === "m" ? "min" : "hour", plus);
      }
      /* only treat as a fragment when there is a leading comma or "and" */
      m = str.match(FRAG_RE);
      if (m && (m[1] || /^and\s/i.test(str))) {
        var tailWord = m[2];
        var tw = t(tailWord);
        if (tw === tailWord) tw = translateFamilyWords(tailWord, L);
        if (tw && tw !== tailWord) {
          if (m[1]) return (/^,\s*and\s/i.test(str) ? L.fragSepAnd : L.fragSep) + tw;
          return L.fragAnd + tw;
        }
      }
      m = str.match(MINHR_RE);
      if (m) return L.minHour(m[1], m[2]);
      m = str.match(HRPLUS_RE);
      if (m) return L.hrPlus(m[1]);
      m = str.match(AMP_PAIR_RE);
      if (m) {
        var w1 = t(m[1]); if (w1 === m[1]) w1 = translateFamilyWords(m[1], L);
        var w2 = t(m[2]); if (w2 === m[2]) w2 = translateFamilyWords(m[2], L);
        if (w1 && w2 && (w1 !== m[1] || w2 !== m[2])) return w1 + " & " + w2;
      }
      m = str.match(COLON_RE);
      if (m) {
        var lbl = t(m[1]);
        if (lbl === m[1]) lbl = translateFamilyWords(m[1], L);
        if (lbl && lbl !== m[1]) return L.colon(lbl);
      }
      m = str.match(NAME_DASH_RE);
      if (m) return t(m[1]) + " —";
      m = str.match(GENRE_RE);
      if (m) {
        var genreKey = m[1].replace(/\s+/g, " ");
        var lg = L.genres && L.genres[genreKey];
        /* fall back to word-by-word composition so unseen families still work */
        var fam = lg || translateFamilyWords(genreKey, L) || genreKey;
        var aud = "";
        if (m[2]) {
          var audKey = m[2].toLowerCase();
          aud = audKey === "women and men" ? L.audienceUnisex
              : (audKey === "women" ? L.audienceWomen : L.audienceMen);
        }
        var sentence = L.isFragrance(fam, aud);
        if (m[3]) sentence += L.launchedIn(m[3]);
        if (m[4]) sentence += L.noseBehind(m[4]);
        return sentence;
      }
      m = str.match(NOTE_LIST_RE);
      if (m) return translateNoteList(str, L);
      m = str.match(DASH_YEAR_RE);
      if (m) {
        var wp = translateWordsPhrase(m[1], L);
        if (wp !== null) return wp + " — " + m[2];
      }
      m = str.match(IN_YEAR_RE);
      if (m) {
        var genre2 = translateWordsPhrase(m[2], L);
        if (genre2 !== null) return L.inYear(m[1], genre2.toLowerCase());
      }
      var OPEN_UNTIL_RE = /^Open until (\d{2}:\d{2})$/;
      m = str.match(OPEN_UNTIL_RE);
      if (m) return L.openUntil(m[1]);
      var OPENS_AT_RE = /^Opens at (\d{2}:\d{2})$/;
      m = str.match(OPENS_AT_RE);
      if (m) return L.opensAt(m[1]);
      var CLOCK_LOCAL_RE = /^(\d{2}:\d{2}) Local$/;
      m = str.match(CLOCK_LOCAL_RE);
      if (m) return L.clockLocal(m[1]);
      if (str.indexOf("\u2022") !== -1) {
        var segs = str.split(BULLET_RE);
        var translated = true;
        var trs = [];
        for (var s = 0; s < segs.length; s++) {
          var seg = segs[s].trim();
          if (!seg) { trs.push(""); continue; }
          var tSeg = t(seg);
          if (tSeg === seg) tSeg = translateWordsPhrase(seg, L);
          if (tSeg === null) { translated = false; break; }
          trs.push(tSeg);
        }
        if (translated && trs.length) return trs.join(L.bullet);
      }
    }
    return str;
  }

  function norm(s) {
    return s.replace(/\s+/g, " ").trim();
  }

  function applyToTextNode(node) {
    var raw = node.nodeValue;
    var cached = originalText.get(node);
    /* Always work from the pristine English source so switching fr -> ar
     * (or ar -> fr) never translates an already-translated string. */
    if (cached && cached !== raw) { raw = cached; node.nodeValue = cached; }
    var trimmed = raw.trim();
    if (!trimmed) return;
    if (current === "en") return;
    var key = norm(trimmed);
    var out = translateString(key);
    if (out !== key) {
      if (!cached) originalText.set(node, raw);
      node.nodeValue = raw.replace(trimmed, out);
    }
  }

  /* =====================================================================
   * MULTI-LANGUAGE EXTENSION
   * Extra dictionaries and the "never translate" list live in
   * js/i18n-dict.js so they can be regenerated without touching this file:
   *   window.I18N_EXTRA   = { fr: {..}, ar: {..} }
   *   window.I18N_PROTECT = ["Creed", "Aventus", ...]
   * ===================================================================== */
  var EXTRA = (typeof window !== "undefined" && window.I18N_EXTRA) || {};
  var AR = EXTRA.ar || {};
  (function () {
    var fx = EXTRA.fr || {}, k;
    var frValues = Object.create(null);
    for (k in FR) {
      if (!Object.prototype.hasOwnProperty.call(FR, k)) continue;
      if (typeof FR[k] === "string") frValues[FR[k]] = 1;
    }
    /* i18n-dict's triple tables pair each UI string with its French + Arabic
     * twins, but the KEYS may be either English or French source text. Adding a
     * French key to FR would silently turn already-French text back into
     * English in FR mode ("Carte Fidélité" -> "Loyalty Card"). Only merge keys
     * whose source is English; French keys are mirrored instead so that English
     * source (if ever injected) still translates to French. */
    function looksFrench(s) {
      if (!s) return false;
      if (/[àâçéèêëîïôûùüœæ]/i.test(s)) return true;
      if (/[dljcnq]’(?=[aàâeéèêiîïoôuùy])/i.test(s)) return true;
      if (/[dljcnq]'(?=[aàâeéèêiîïoôuùy])/i.test(s)) return true;
      var bare = s.replace(/^[^\p{L}\p{N}]+/u, "");
      if (/^(le|la|les|des|un|une|du|au|aux|de|à|ce|cette|nos|vos)\s/i.test(bare)) return true;
      if (/\b(pour|avec|vous|nous|sont|êtes|avez|mais|qui|que|dans|sur|tous|toutes|votre|notre|leur|leurs|du|de la)\b/i.test(bare)) return true;
      if (/^N°\s/.test(bare)) return true;
      if (frValues[s]) return true;
      if (FRENCH_WORD_RE.test(bare)) return true;
      return FRENCH_WORD_ANY_RE.test(bare);
    }
    var FRENCH_WORD_RE = /^(Annonce|Titre|Message|Envoyer|Enregistrer|Annuler|Haut|Gourmande|Gourmand|Aromatique|Choisir|Publi[ezé]|Parfums?|Nouveau|Nouvelle|Modifier|Client|Clients|Profil|Marques|Historique|Ajouter|Famille|Florale|Orientale|Agrume|Public|Cible|Suivre|Suivez|Bouton|Taille|Couleur|Ville|Adresse|Rechercher|Fermer|Continuer|Retour|Marque|Chargement|Laisser|Besoin|Demande|Livraison|Gratuit|Connecter|Optionnel|optionnel)\b/;
    var FRENCH_WORD_ANY_RE = /\b(parfums?|cartes?|clients?|annonces?|actualit[ée]s?|horaires?|offerts?|offertes?|achet[ée]s?|[ée]mises?|publi[ée]s?|nouvelles?|nouveaux?|recommand[ée]s?|fidélit[ée]s?|livraisons?|gratuites?|disponibles?|premiers?|premi[èe]res?|personnalit[ée]|préf[ée]rences|olfactives?|florales?|orientales?|agrumes?|aldéhyd[ée]s?|bois[ée]es?|fraîches?|membres?|clients?|points?|pts|achats?|achat|familles?|histoires?|effacer|supprimer|tout|n°)\b/i;
    for (k in fx) {
      if (!Object.prototype.hasOwnProperty.call(fx, k)) continue;
      if (Object.prototype.hasOwnProperty.call(FR, k)) continue;
      var fr = fx[k];
      if (typeof fr !== "string") { FR[k] = fr; continue; }
      if (looksFrench(k)) {
        if (!Object.prototype.hasOwnProperty.call(FR, fr)) FR[fr] = k;
        continue;
      }
      FR[k] = fr;
    }
  })();

  var PROTECTED = Object.create(null);
  (function () {
    var pl = (typeof window !== "undefined" && window.I18N_PROTECT) || [], i;
    for (i = 0; i < pl.length; i++) PROTECTED[pl[i]] = 1;
  })();

  /* Text nodes reach the engine with whitespace collapsed, so dictionary keys
     must be collapsed too - otherwise entries written across several source
     lines (indented HTML) can never match. */
  function normKey(k) { return String(k).replace(/\s+/gu, " ").trim(); }
  function normalizeDict(d) {
    var out = {}, k, nk;
    for (k in d) {
      if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
      nk = normKey(k);
      if (!Object.prototype.hasOwnProperty.call(out, nk)) out[nk] = d[k];
    }
    return out;
  }
  function normalizeInPlace(d) {
    var k, nk, add = {};
    for (k in d) {
      if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
      nk = normKey(k);
      if (nk !== k) { add[nk] = d[k]; delete d[k]; }
    }
    for (k in add) if (Object.prototype.hasOwnProperty.call(add, k)) d[k] = add[k];
    return d;
  }
  FR = normalizeDict(FR);
  AR = normalizeDict(AR);
  /* GENRES / GENRES_AR are captured by reference inside LX, so mutate in place */
  normalizeInPlace(GENRES);
  normalizeInPlace(GENRES_AR);
  PROTECTED = (function (src) {
    var out = Object.create(null), k;
    for (k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      out[normKey(k)] = 1;
    }
    return out;
  })(PROTECTED);

  var RTL_LANGS = { ar: 1, he: 1, fa: 1, ur: 1 };

  function dictFor(lang) {
    if (lang === "fr") return FR;
    if (lang === "ar") return AR;
    return null;
  }
  var IGNORE_TAGS = { "SCRIPT": 1, "STYLE": 1, "NOSCRIPT": 1, "TEXTAREA": 1, "SVG": 1 };

  function walk(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) {
      var n = walker.currentNode;
      var p = n.parentNode;
      if (p && IGNORE_TAGS[p.nodeName]) continue;
      nodes.push(n);
    }
    for (var i = 0; i < nodes.length; i++) applyToTextNode(nodes[i]);

    var attrs = root.querySelectorAll ? root.querySelectorAll("[data-i18n-placeholder], [data-i18n-title], [data-i18n-aria], [data-i18n-alt]") : [];
    for (var j = 0; j < attrs.length; j++) {
      var el = attrs[j];
      var key;
      if (el.hasAttribute("data-i18n-placeholder")) {
        key = el.getAttribute("data-i18n-placeholder");
        el.placeholder = t(key);
      }
      if (el.hasAttribute("data-i18n-title")) {
        key = el.getAttribute("data-i18n-title");
        el.title = t(key);
      }
      if (el.hasAttribute("data-i18n-aria")) {
        key = el.getAttribute("data-i18n-aria");
        el.setAttribute("aria-label", t(key));
      }
      if (el.hasAttribute("data-i18n-alt")) {
        key = el.getAttribute("data-i18n-alt");
        el.setAttribute("alt", t(key));
      }
    }
  }

  function updateSwitcher() {
    var currentLangEl = document.getElementById("current-lang");
    if (!currentLangEl) return;
    var option = document.querySelector('.lang-option[data-lang="' + current + '"]');
    if (option) {
      var svg = option.querySelector(".flag svg");
      if (svg) {
        var clone = svg.cloneNode(true);
        clone.setAttribute("width", "20");
        clone.setAttribute("height", "14");
        var holder = currentLangEl.querySelector(".flag");
        if (holder) {
          holder.innerHTML = "";
          holder.appendChild(clone);
        }
      }
      var code = option.getAttribute("data-code");
      var codeEl = currentLangEl.querySelector(".lang-code");
      if (codeEl && code) codeEl.textContent = code;
    }
    document.documentElement.setAttribute("lang", current);
  }

  function applyLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = "en";
    var previous = current;
    current = lang;
    if (originalTitle === null) originalTitle = document.title;
    document.title = (lang === "en") ? originalTitle : translateString(originalTitle);
    var htmlEl = document.documentElement;
    htmlEl.classList.remove("lang-rtl", "lang-ltr");
    if (RTL_LANGS[lang]) { htmlEl.setAttribute("dir", "rtl"); htmlEl.classList.add("lang-rtl"); }
    else { htmlEl.setAttribute("dir", "ltr"); htmlEl.classList.add("lang-ltr"); }
    walk(document.body);
    updateSwitcher();
    setStored(lang);
    document.dispatchEvent(new CustomEvent("charme:langchange", { detail: { lang: lang, previous: previous } }));
  }

  var observerTimer = 0;
  var pendingRoots = [];
  function startObserver() {
    if (typeof MutationObserver === "undefined") return;
    var observer = new MutationObserver(function (records) {
      if (current === "en") return;
      /* Collect only the nodes that were actually inserted. Re-walking the
       * whole 22k-node document on every mutation was extremely expensive. */
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var nd = added[j];
          if (nd.nodeType === 1 || nd.nodeType === 3) pendingRoots.push(nd);
        }
      }
      clearTimeout(observerTimer);
      observerTimer = setTimeout(function () {
        var roots = pendingRoots;
        pendingRoots = [];
        for (var k = 0; k < roots.length; k++) {
          var r = roots[k];
          if (!r || !r.parentNode) continue;
          if (r.nodeType === 3) applyToTextNode(r); else walk(r);
        }
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var initial = getStored() || document.documentElement.getAttribute("lang") || "fr";
    if (SUPPORTED.indexOf(initial) === -1) initial = "fr";
    current = initial;
    if (current !== "en") {
      applyLanguage(current);
    } else {
      document.documentElement.setAttribute("lang", "en");
    }
    startObserver();
  });

  window.I18N = {
    t: t,
    applyLanguage: applyLanguage,
    getLang: function () { return current; },
    /* QA helper: true when the term exists in the dictionary even if the
       translation is identical to the English (e.g. "Eau de Parfum" in French) */
    hasKey: function (s, lang) {
      var d = dictFor(lang || current);
      return !!(d && Object.prototype.hasOwnProperty.call(d, s));
    },
    isProtected: function (s) { return !!PROTECTED[s]; }
  };
})();
