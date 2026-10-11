/*
 * Discovery overlay copy (Scent Profiler + Ingredient Finder) in EN / FR / AR.
 *
 * Same convention as adminI18n.js: the surface keeps its own dictionary so the
 * storefront I18nContext stays a storefront dictionary. `discoverDict(lang)`
 * falls back to English per key, so a missing translation degrades to English
 * rather than to a raw key.
 */

export const DISCOVER = {
  en: {
    title: "Find your scent",
    lede: "Two ways in — answer a few questions, or start from the notes you love.",
    close: "Close",
    tabProfiler: "Scent Profiler",
    tabIngredients: "Ingredient Finder",
    profilerLede: "Seven questions. Every bottle in the boutique is ranked against your answers.",
    ingredientsLede: "Pick the notes you want to smell and we surface the bottles that carry them.",

    start: "Begin",
    restart: "Start over",
    back: "Back",
    next: "Next",
    seeResults: "See my matches",
    results: "Your matches",
    resultsLede: "Ranked by how closely each bottle answers what you chose.",
    match: "match",
    of: "of",
    step: "Question",
    noResults: "Nothing in the boutique answers all of that. Relax one answer and try again.",
    carries: "Carries",
    view: "View",
    browse: "Browse the whole collection",

    pickUpToFour: "Pick up to four.",
    pickUpToFive: "Pick up to five.",

    q: {
      notes: { title: "Which notes do you love?" },
      family: { title: "What scent family draws you in?" },
      season: { title: "When will you wear it?" },
      intensity: { title: "How loud should it be?" },
      occasion: { title: "What is the occasion?" },
      budget: { title: "What is your budget?" },
      dislikes: { title: "Anything you would rather avoid?" },
    },

    notes: [
      ["bergamot", "Bergamot"],
      ["lemon", "Lemon"],
      ["rose", "Rose"],
      ["jasmine", "Jasmine"],
      ["iris", "Iris"],
      ["lavender", "Lavender"],
      ["cardamom", "Cardamom"],
      ["cinnamon", "Cinnamon"],
      ["amber", "Amber"],
      ["vanilla", "Vanilla"],
      ["tonka", "Tonka bean"],
      ["sandalwood", "Sandalwood"],
      ["cedar", "Cedar"],
      ["patchouli", "Patchouli"],
      ["vetiver", "Vetiver"],
      ["oud", "Oud"],
      ["leather", "Leather"],
      ["tobacco", "Tobacco"],
      ["musk", "Musk"],
    ],

    families: [
      ["fresh", "Fresh & aquatic"],
      ["floral", "Floral"],
      ["woody", "Woody"],
      ["oriental", "Oriental & amber"],
      ["sweet", "Sweet & gourmand"],
      ["any", "No preference"],
    ],

    seasons: [
      ["spring", "Spring"],
      ["summer", "Summer"],
      ["autumn", "Autumn"],
      ["winter", "Winter"],
      ["any", "All year"],
    ],

    intensities: [
      ["light", "Light & airy"],
      ["moderate", "Moderate"],
      ["bold", "Bold & powerful"],
      ["any", "No preference"],
    ],

    occasions: [
      ["daily", "Everyday"],
      ["office", "The office"],
      ["date", "An evening out"],
      ["special", "A special event"],
      ["any", "No preference"],
    ],

    budgets: [
      ["budget", "Under 70 dt"],
      ["mid", "70 – 150 dt"],
      ["premium", "Above 150 dt"],
      ["any", "No limit"],
    ],

    dislikes: [
      ["none", "Nothing in particular"],
      ["sweet", "Sweet & candy"],
      ["smoke", "Heavy smoke"],
      ["powdery", "Powdery"],
      ["musk", "Animalic musk"],
      ["green", "Green & herbal"],
      ["aqua", "Aquatic"],
      ["gourmand", "Coffee & nuts"],
    ],

    searchNotes: "Search the notes",
    selectedNotes: "Your notes",
    clearNotes: "Clear",
    pickNotes: "Pick up to six notes; we rank the bottles that carry the most of them.",
    noteResults: "Bottles carrying your notes",
    noNoteResults: "Nothing in the boutique carries any of those notes yet.",
    noNoteIndex: "Notes are still loading…",
    noteCount: "notes",
  },

  fr: {
    title: "Trouvez votre parfum",
    lede: "Deux entrées — répondez à quelques questions, ou partez des notes que vous aimez.",
    close: "Fermer",
    tabProfiler: "Profil Olfactif",
    tabIngredients: "Chercheur de Notes",
    profilerLede: "Sept questions. Toute la boutique est classée selon vos réponses.",
    ingredientsLede: "Choisissez les notes que vous aimez et nous faisons ressortir les flacons qui les portent.",
    start: "Commencer",
    restart: "Recommencer",
    back: "Retour",
    next: "Suivant",
    seeResults: "Voir mes correspondances",
    results: "Vos correspondances",
    resultsLede: "Classés selon la justesse de chaque flacon face à vos réponses.",
    match: "de correspondance",
    of: "sur",
    step: "Question",
    noResults: "Rien dans la boutique ne répond à tout cela. Assouplissez une réponse et réessayez.",
    carries: "Contient",
    view: "Voir",
    browse: "Parcourir toute la collection",
    pickUpToFour: "Choisissez-en jusqu'à quatre.",
    pickUpToFive: "Choisissez-en jusqu'à cinq.",

    q: {
      notes: { title: "Quelles notes aimez-vous ?" },
      family: { title: "Quelle famille vous attire ?" },
      season: { title: "Quand le porterez-vous ?" },
      intensity: { title: "Quelle intensité souhaitez-vous ?" },
      occasion: { title: "Pour quelle occasion ?" },
      budget: { title: "Quel est votre budget ?" },
      dislikes: { title: "Quelque chose à éviter ?" },
    },

    notes: [
      ["bergamot", "Bergamote"],
      ["lemon", "Citron"],
      ["rose", "Rose"],
      ["jasmine", "Jasmin"],
      ["iris", "Iris"],
      ["lavender", "Lavande"],
      ["cardamom", "Cardamome"],
      ["cinnamon", "Cannelle"],
      ["amber", "Ambre"],
      ["vanilla", "Vanille"],
      ["tonka", "Fève tonka"],
      ["sandalwood", "Santal"],
      ["cedar", "Cèdre"],
      ["patchouli", "Patchouli"],
      ["vetiver", "Vétiver"],
      ["oud", "Oud"],
      ["leather", "Cuir"],
      ["tobacco", "Tabac"],
      ["musk", "Musc"],
    ],

    families: [
      ["fresh", "Frais & aquatique"],
      ["floral", "Floral"],
      ["woody", "Boisé"],
      ["oriental", "Oriental & ambré"],
      ["sweet", "Sucré & gourmand"],
      ["any", "Peu importe"],
    ],

    seasons: [
      ["spring", "Printemps"],
      ["summer", "Été"],
      ["autumn", "Automne"],
      ["winter", "Hiver"],
      ["any", "Toute l'année"],
    ],

    intensities: [
      ["light", "Léger & aérien"],
      ["moderate", "Modéré"],
      ["bold", "Puissant"],
      ["any", "Peu importe"],
    ],

    occasions: [
      ["daily", "Tous les jours"],
      ["office", "Au bureau"],
      ["date", "Une soirée"],
      ["special", "Un grand moment"],
      ["any", "Peu importe"],
    ],

    budgets: [
      ["budget", "Moins de 70 dt"],
      ["mid", "70 – 150 dt"],
      ["premium", "Plus de 150 dt"],
      ["any", "Sans limite"],
    ],

    dislikes: [
      ["none", "Rien en particulier"],
      ["sweet", "Sucré & bonbon"],
      ["smoke", "Fumé intense"],
      ["powdery", "Poudré"],
      ["musk", "Musc animal"],
      ["green", "Vert & herbal"],
      ["aqua", "Aquatique"],
      ["gourmand", "Café & fruits secs"],
    ],

    searchNotes: "Rechercher une note",
    selectedNotes: "Vos notes",
    clearNotes: "Effacer",
    pickNotes: "Choisissez jusqu'à six notes ; nous classons les flacons qui en portent le plus.",
    noteResults: "Flacons portant vos notes",
    noNoteResults: "Rien dans la boutique ne porte ces notes pour l'instant.",
    noNoteIndex: "Les notes se chargent…",
    noteCount: "notes",
  },

  ar: {
    title: "اعثر على عطرك",
    lede: "طريقتان: أجب عن بضعة أسئلة، أو ابدأ من النوتات التي تحبّها.",
    close: "إغلاق",
    tabProfiler: "مُحلّل الرائحة",
    tabIngredients: "باحث النوتات",
    profilerLede: "سبعة أسئلة. نرتّب كل عطور المتجر وفق أجوبتك.",
    ingredientsLede: "اختر النوتات التي تحبّها لنُظهر القوارير التي تحملها.",
    start: "ابدأ",
    restart: "من جديد",
    back: "رجوع",
    next: "التالي",
    seeResults: "اعرض نتائجي",
    results: "نتائجك",
    resultsLede: "مرتّبة بحسب مدى تطابق كل قارورة مع أجوبتك.",
    match: "تطابق",
    of: "من",
    step: "سؤال",
    noResults: "لا شيء في المتجر يلبّي كل ذلك. خفّف أحد الأجوبة وأعد المحاولة.",
    carries: "يحمل",
    view: "عرض",
    browse: "تصفّح المجموعة كاملة",
    pickUpToFour: "اختر حتى أربع نوتات.",
    pickUpToFive: "اختر حتى خمس نوتات.",

    q: {
      notes: { title: "ما النوتات التي تحبّها؟" },
      family: { title: "أي عائلة عطرية تجذبك؟" },
      season: { title: "متى سترتديه؟" },
      intensity: { title: "ما قوّة الأثر التي تريدها؟" },
      occasion: { title: "ما المناسبة؟" },
      budget: { title: "ما ميزانيتك؟" },
      dislikes: { title: "هل هناك ما تفضّل تجنّبه؟" },
    },

    notes: [
      ["bergamot", "برغموت"],
      ["lemon", "ليمون"],
      ["rose", "ورد"],
      ["jasmine", "ياسمين"],
      ["iris", "سوسن"],
      ["lavender", "خزامى"],
      ["cardamom", "هال"],
      ["cinnamon", "قرفة"],
      ["amber", "عنبر"],
      ["vanilla", "فانيليا"],
      ["tonka", "حبة التونكا"],
      ["sandalwood", "خشب الصندل"],
      ["cedar", "أرز"],
      ["patchouli", "باتشولي"],
      ["vetiver", "نَجِيل"],
      ["oud", "عود"],
      ["leather", "جلد"],
      ["tobacco", "تبغ"],
      ["musk", "مسك"],
    ],

    families: [
      ["fresh", "منعش ومائي"],
      ["floral", "زهري"],
      ["woody", "خشبي"],
      ["oriental", "شرقي وعنبري"],
      ["sweet", "حلو وشهي"],
      ["any", "لا تفضيل"],
    ],

    seasons: [
      ["spring", "الربيع"],
      ["summer", "الصيف"],
      ["autumn", "الخريف"],
      ["winter", "الشتاء"],
      ["any", "طوال السنة"],
    ],

    intensities: [
      ["light", "خفيف وشفّاف"],
      ["moderate", "متوسّط"],
      ["bold", "قوي وجرئ"],
      ["any", "لا تفضيل"],
    ],

    occasions: [
      ["daily", "كل يوم"],
      ["office", "في العمل"],
      ["date", "سهرة"],
      ["special", "مناسبة خاصة"],
      ["any", "لا تفضيل"],
    ],

    budgets: [
      ["budget", "أقل من 70 د.ت"],
      ["mid", "70 – 150 د.ت"],
      ["premium", "أكثر من 150 د.ت"],
      ["any", "بلا حدود"],
    ],

    dislikes: [
      ["none", "لا شيء تحديدًا"],
      ["sweet", "حلو وسكّري"],
      ["smoke", "دخان كثيف"],
      ["powdery", "بودرة"],
      ["musk", "مسك حيواني"],
      ["green", "أخضر وعشبي"],
      ["aqua", "مائي"],
      ["gourmand", "قهوة ومكسّرات"],
    ],

    searchNotes: "ابحث عن نوتة",
    selectedNotes: "نوتاتك",
    clearNotes: "مسح",
    pickNotes: "اختر حتى ست نوتات؛ نرتّب القوارير التي تحمل أكثرها.",
    noteResults: "قوارير تحمل نوتاتك",
    noNoteResults: "لا شيء في المتجر يحمل أيًّا من هذه النوتات بعد.",
    noNoteIndex: "النوتات قيد التحميل…",
    noteCount: "نوتات",
  },
};

export function discoverDict(lang) {
  if (lang === "en") return DISCOVER.en;
  return { ...DISCOVER.en, ...(DISCOVER[lang] || {}) };
}
