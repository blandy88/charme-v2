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
