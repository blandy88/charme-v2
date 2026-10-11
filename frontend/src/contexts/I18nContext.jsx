import { createContext, useContext, useEffect, useMemo, useState } from "react";

const I18nContext = createContext(null);

const STRINGS = {
  en: {
    home: "Home",
    collection: "Collection",
    guides: "Guides",
    contact: "Contact",
    signIn: "Sign In",
    signOut: "Sign Out",
    cart: "Cart",
    loyalty: "Loyalty",
    admin: "Admin",
    heroEyebrow: "Parfumerie · Kélibia",
    heroTitleA: "Rare scents,",
    heroTitleB: "chosen slowly.",
    heroSub:
      "A curated boutique of niche and designer fragrances. Browse the collection, save favorites, and collect loyalty points with every visit.",
    heroCta: "Browse the collection",
    heroSecondary: "Our story",
    searchPlaceholder: "Search fragrances…",
    backToSite: "Back to site",
    noMatches: "No matches",
    news: "News",
    profile: "Profile",
    favorites: "Favorites",
    viewAll: "View all",
    featuredTitle: "Featured this week",
    featuredSub: "Eight compositions, chosen by hand.",
    visitTitle: "Visit the boutique",
    visitBody: "Kélibia, Tunisia — walk in for a guided tasting, or message us and we will match the scent remotely.",
    openMap: "Open in Google Maps",
    footerTag: "A curated boutique of niche and designer fragrances.",
    footerExplore: "Explore",
    footerVisit: "Visit",
    statPieces: "compositions",
    statNotes: "listed notes",
    statHouses: "houses",
    heroCaption: "Extrait de parfum — Maison Charme",
    heroSecondary: "Visit us",
  },
  fr: {
    home: "Accueil",
    collection: "Collection",
    guides: "Guides",
    contact: "Contact",
    signIn: "Se connecter",
    signOut: "Se déconnecter",
    cart: "Panier",
    loyalty: "Fidélité",
    admin: "Admin",
    heroEyebrow: "Parfumerie · Kélibia",
    heroTitleA: "Des parfums rares,",
    heroTitleB: "choisis avec soin.",
    heroSub:
      "Une boutique curatrice de parfums de niche et de créateurs. Parcourez la collection, gardez vos favoris et cumulez des points fidélité.",
    heroCta: "Voir la collection",
    heroSecondary: "Notre histoire",
    searchPlaceholder: "Rechercher un parfum…",
    backToSite: "Retour au site",
    noMatches: "Aucun résultat",
    news: "Actualités",
    profile: "Profil",
    favorites: "Favoris",
    viewAll: "Tout voir",
    featuredTitle: "À l'honneur cette semaine",
    featuredSub: "Huit compositions, choisies à la main.",
    visitTitle: "Venez en boutique",
    visitBody: "Kélibia, Tunisie — passez pour une dégustation guidée, ou écrivez-nous et nous trouverons votre sillage à distance.",
    openMap: "Ouvrir dans Google Maps",
    footerTag: "Une boutique curatrice de parfums de niche et de créateurs.",
    footerExplore: "Explorer",
    footerVisit: "Nous trouver",
    statPieces: "compositions",
    statNotes: "notes répertoriées",
    statHouses: "maisons",
    heroCaption: "Extrait de parfum — Maison Charme",
    heroSecondary: "Nous rendre visite",
  },
  ar: {
    home: "الرئيسية",
    collection: "المجموعة",
    guides: "الأدلة",
    contact: "اتصل بنا",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    cart: "السلة",
    loyalty: "الولاء",
    admin: "الإدارة",
    heroEyebrow: "عطورات · قليبية",
    heroTitleA: "عطور نادرة،",
    heroTitleB: "مختارة بعناية.",
    heroSub: "بوتيك مختار من عطور النيش والمصممين. تصفح المجموعة واحفظ مفضلاتك واجمع نقاط الولاء.",
    heroCta: "تصفح المجموعة",
    heroSecondary: "قصتنا",
    searchPlaceholder: "ابحث عن عطر…",
    backToSite: "عودة إلى الموقع",
    noMatches: "لا نتائج",
    news: "الأخبار",
    profile: "الملف",
    favorites: "المفضلة",
    viewAll: "عرض الكل",
    featuredTitle: "مختارات الأسبوع",
    featuredSub: "ثمانية عطور مختارة بعناية.",
    visitTitle: "زوروا البوتيك",
    visitBody: "قليبية، تونس — تفضلوا لتذوق موجه، أو راسلونا وسنجد عطركم عن بعد.",
    openMap: "فتح في خرائط جوجل",
    footerTag: "بوتيك مختار من عطور النيش والمصممين.",
    footerExplore: "استكشف",
    footerVisit: "موقعنا",
    statPieces: "عطر",
    statNotes: "نوتة",
    statHouses: "دار",
    heroCaption: "مستخلص عطر — دار شرم",
    heroSecondary: "زورونا",
  },
};

function initialLang() {
  try {
    const l = localStorage.getItem("charme-lang");
    if (l && STRINGS[l]) return l;
  } catch {
    /* ignore */
  }
  return "fr";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("charme-lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo(() => {
    const t = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
