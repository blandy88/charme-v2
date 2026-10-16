/*
 * Parfumerie Charme - back-office assistant: the assistant's own wording.
 *
 * The admin chrome is translated in frontend/src/atelier/pages/adminI18n.js.
 * This is the other half of the interface: the name of each tool shown in the
 * transcript and the one-line sentence on the approval card. Both are produced
 * server-side because they are built from the model's arguments, and they have
 * to read well in the language the administrator is actually using - the shop's
 * staff work in French and Arabic as much as in English.
 *
 * The panel sends its current language with every message; `previews` mirrors
 * tools.js one-for-one, so a tool's sentence lives here and nowhere else.
 *
 * Anything missing falls back to the tool's own English `preview` in tools.js,
 * which is why a new tool still reads sensibly before it is translated.
 */

const DEFAULT_LANG = "fr";
const SUPPORTED = ["fr", "en", "ar"];

/* "fr-FR", "FR", " ar " -> "fr" | "en" | "ar"; anything else -> the default. */
function pickLang(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return SUPPORTED.includes(value) ? value : DEFAULT_LANG;
}

/* "3 point(s)" reads badly in every language, so the three dictionaries deal
   with their own plural rules. */
function frPoints(n) {
  const count = Number(n);
  return `${count} ${count === 1 ? "point" : "points"}`;
}

function arPoints(n) {
  const count = Number(n);
  if (count === 1) return "نقطة واحدة";
  if (count === 2) return "نقطتان";
  if (Number.isInteger(count) && count >= 3 && count <= 10) return `${count} نقاط`;
  return `${count} نقطة`;
}

/* "mardi", "MAR", "الاثنين" and "Tuesday" all have to land on the same day,
   because the model echoes back whatever the administrator typed. */
const DAY_NAMES = {
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

function normaliseDay(raw) {
  return String(raw == null ? "" : raw)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // Arabic diacritics
    .replace(/[أإآ]/g, "ا") // alef variants
    .replace(/\u0640/g, ""); // tatweel
}

/* Latin day names are also matched on their first three letters ("mar"); the
   Arabic ones are not, because those prefixes collide. */
const DAY_INDEX = (() => {
  const add = (names, prefixes) =>
    names.forEach((name, i) => {
      const key = normaliseDay(name);
      if (!index.has(key)) index.set(key, i);
      if (prefixes && !index.has(key.slice(0, 3))) index.set(key.slice(0, 3), i);
    });
  const index = new Map();
  add(DAY_NAMES.en, true);
  add(DAY_NAMES.fr, true);
  add(DAY_NAMES.ar, false);
  return index;
})();

function localiseDay(lang, raw) {
  const key = normaliseDay(raw);
  const hit = DAY_INDEX.has(key) ? DAY_INDEX.get(key) : DAY_INDEX.get(key.slice(0, 3));
  if (hit === undefined) return key ? String(raw) : "?";
  return DAY_NAMES[lang][hit];
}

function joinHours(updates, lang, closedWord, separator) {
  return (Array.isArray(updates) ? updates : [])
    .map((u) => {
      const day = localiseDay(lang, u && u.day);
      const open = u ? u.open : null;
      const value = open === null || open === undefined ? closedWord : `${open}-${u.close}`;
      return `${day} ${value}`;
    })
    .join(separator);
}

const STRINGS = {
  fr: {
    tools: {
      query_database: "Requête base de données",
      site_overview: "Aperçu de la boutique",
      search_catalogue: "Recherche dans le catalogue",
      find_user: "Recherche d'un client",
      list_loyalty_cards: "Cartes fidélité",
      list_news: "Actualités",
      list_guest_notes: "Messages des visiteurs",
      list_reviews: "Avis clients",
      ban_user: "Bannir un client",
      unban_user: "Réactiver un client",
      set_admin_role: "Rôle d'administrateur",
      add_loyalty_points: "Ajouter des points",
      set_loyalty_points: "Définir les points",
      redeem_loyalty_reward: "Utiliser une récompense",
      create_loyalty_card: "Créer une carte fidélité",
      create_news: "Publier une actualité",
      update_news: "Modifier une actualité",
      delete_news: "Supprimer une actualité",
      set_store_hours: "Modifier les horaires",
      mark_guest_note_read: "Marquer un message comme lu",
      delete_guest_note: "Supprimer un message",
      delete_review: "Supprimer un avis",
      update_review: "Modifier un avis",
      delete_review_reply: "Supprimer une réponse",
    },
    previews: {
      query_database: (a) => `Lecture : ${String(a.sql || "").replace(/\s+/g, " ").slice(0, 160)}`,
      site_overview: () => "Lire l'aperçu de la boutique",
      search_catalogue: (a) => `Rechercher « ${a.query} » dans le catalogue`,
      find_user: (a) => `Consulter le client ${a.user_id || a.email || a.name}`,
      list_loyalty_cards: (a) =>
        `Lister les cartes fidélité${a.query ? ` correspondant à « ${a.query} »` : ""}${
          a.only_eligible ? " (éligibles uniquement)" : ""
        }`,
      list_news: () => "Lister les actualités",
      list_guest_notes: (a) => `Lister les messages${a.unread_only ? " (non lus uniquement)" : ""}`,
      list_reviews: (a) => `Lister les avis${a.fragrance ? ` pour « ${a.fragrance} »` : ""}`,
      ban_user: (a) =>
        `Bannir le client n° ${a.user_id}${a.reason ? ` — motif : ${a.reason}` : ""}`,
      unban_user: (a) => `Réactiver le client n° ${a.user_id}`,
      set_admin_role: (a) =>
        a.is_admin
          ? `Donner les droits d'administrateur au client n° ${a.user_id}`
          : `Retirer les droits d'administrateur au client n° ${a.user_id}`,
      add_loyalty_points: (a) => `Ajouter ${frPoints(a.points)} de fidélité`,
      set_loyalty_points: (a) => `Définir les points de fidélité à ${a.points}`,
      redeem_loyalty_reward: (a, ctx) =>
        `Utiliser une récompense fidélité (${ctx.threshold} points)`,
      create_loyalty_card: (a) =>
        `Créer une carte fidélité ${
          a.user_id ? `pour le client n° ${a.user_id}` : `pour un client de passage « ${a.name} »`
        }`,
      create_news: (a) => `Publier l'actualité « ${a.title} »`,
      update_news: (a) =>
        `Modifier l'actualité n° ${a.id}${a.title ? ` → « ${a.title} »` : ""}`,
      delete_news: (a) => `Supprimer l'actualité n° ${a.id}`,
      set_store_hours: (a) => `Modifier les horaires : ${joinHours(a.updates, "fr", "fermé", ", ")}`,
      mark_guest_note_read: (a) => `Marquer le message n° ${a.id} comme lu`,
      delete_guest_note: (a) => `Supprimer le message n° ${a.id}`,
      delete_review: (a) => `Supprimer l'avis n° ${a.review_id}`,
      update_review: (a) =>
        `Modifier l'avis n° ${a.review_id}${a.rating ? ` → ${a.rating}★` : ""}`,
      delete_review_reply: (a) => `Supprimer la réponse n° ${a.reply_id}`,
    },
    /* Wording the tools write into the loyalty ledger. The shop's own screen
       writes the same French sentences, so French stays the source of truth and
       the other two languages are translations of it. */
    ledger: {
      pointsAdded: (n) => `Ajout de ${frPoints(n)}`,
      reward: () => "Récompense fidélité",
      pointsAdjust: (d) =>
        `Modification : ${d > 0 ? "+" : ""}${d} point(s)`,
    },
  },

  en: {
    tools: {
      query_database: "Database query",
      site_overview: "Shop overview",
      search_catalogue: "Catalogue search",
      find_user: "Customer lookup",
      list_loyalty_cards: "Loyalty cards",
      list_news: "News",
      list_guest_notes: "Guest notes",
      list_reviews: "Reviews",
      ban_user: "Ban a customer",
      unban_user: "Unban a customer",
      set_admin_role: "Administrator role",
      add_loyalty_points: "Add loyalty points",
      set_loyalty_points: "Set loyalty points",
      redeem_loyalty_reward: "Redeem a reward",
      create_loyalty_card: "Create a loyalty card",
      create_news: "Publish news",
      update_news: "Update news",
      delete_news: "Delete news",
      set_store_hours: "Change store hours",
      mark_guest_note_read: "Mark a note as read",
      delete_guest_note: "Delete a note",
      delete_review: "Delete a review",
      update_review: "Edit a review",
      delete_review_reply: "Delete a reply",
    },
    previews: {
      query_database: (a) => `Read: ${String(a.sql || "").replace(/\s+/g, " ").slice(0, 160)}`,
      site_overview: () => "Read the shop overview",
      search_catalogue: (a) => `Search the catalogue for "${a.query}"`,
      find_user: (a) => `Look up customer ${a.user_id || a.email || a.name}`,
      list_loyalty_cards: (a) =>
        `List loyalty cards${a.query ? ` matching "${a.query}"` : ""}${
          a.only_eligible ? " (eligible only)" : ""
        }`,
      list_news: () => "List news",
      list_guest_notes: (a) => `List guest notes${a.unread_only ? " (unread only)" : ""}`,
      list_reviews: (a) => `List reviews${a.fragrance ? ` for "${a.fragrance}"` : ""}`,
      ban_user: (a) => `Ban customer #${a.user_id}${a.reason ? ` - reason: ${a.reason}` : ""}`,
      unban_user: (a) => `Unban customer #${a.user_id}`,
      set_admin_role: (a) =>
        a.is_admin
          ? `Make customer #${a.user_id} an administrator`
          : `Remove admin rights from customer #${a.user_id}`,
      add_loyalty_points: (a) =>
        `Add ${a.points} loyalty ${Number(a.points) === 1 ? "point" : "points"}`,
      set_loyalty_points: (a) => `Set loyalty points to ${a.points}`,
      redeem_loyalty_reward: (a, ctx) => `Redeem a loyalty reward (${ctx.threshold} points)`,
      create_loyalty_card: (a) =>
        `Create a loyalty card ${
          a.user_id ? `for customer #${a.user_id}` : `for walk-in "${a.name}"`
        }`,
      create_news: (a) => `Publish news "${a.title}"`,
      update_news: (a) => `Update news #${a.id}${a.title ? ` -> "${a.title}"` : ""}`,
      delete_news: (a) => `Delete news #${a.id}`,
      set_store_hours: (a) => `Set store hours: ${joinHours(a.updates, "en", "closed", ", ")}`,
      mark_guest_note_read: (a) => `Mark guest note #${a.id} as read`,
      delete_guest_note: (a) => `Delete guest note #${a.id}`,
      delete_review: (a) => `Delete review #${a.review_id}`,
      update_review: (a) => `Edit review #${a.review_id}${a.rating ? ` -> ${a.rating}★` : ""}`,
      delete_review_reply: (a) => `Delete review reply #${a.reply_id}`,
    },
    ledger: {
      pointsAdded: (n) =>
        `Added ${n} loyalty ${Number(n) === 1 ? "point" : "points"}`,
      reward: () => "Loyalty reward",
      pointsAdjust: (d) => `Adjustment: ${d > 0 ? "+" : ""}${d} point(s)`,
    },
  },

  ar: {
    tools: {
      query_database: "استعلام قاعدة البيانات",
      site_overview: "نظرة عامة على المتجر",
      search_catalogue: "البحث في الكتالوج",
      find_user: "البحث عن عميل",
      list_loyalty_cards: "بطاقات الولاء",
      list_news: "الأخبار",
      list_guest_notes: "رسائل الزوار",
      list_reviews: "تقييمات العملاء",
      ban_user: "حظر عميل",
      unban_user: "رفع الحظر عن عميل",
      set_admin_role: "صلاحية الإدارة",
      add_loyalty_points: "إضافة نقاط ولاء",
      set_loyalty_points: "ضبط نقاط الولاء",
      redeem_loyalty_reward: "استبدال مكافأة",
      create_loyalty_card: "إنشاء بطاقة ولاء",
      create_news: "نشر خبر",
      update_news: "تعديل خبر",
      delete_news: "حذف خبر",
      set_store_hours: "تعديل ساعات العمل",
      mark_guest_note_read: "تعليم رسالة كمقروءة",
      delete_guest_note: "حذف رسالة",
      delete_review: "حذف تقييم",
      update_review: "تعديل تقييم",
      delete_review_reply: "حذف رد",
    },
    previews: {
      query_database: (a) => `قراءة: ${String(a.sql || "").replace(/\s+/g, " ").slice(0, 160)}`,
      site_overview: () => "قراءة نظرة عامة على المتجر",
      search_catalogue: (a) => `البحث عن «${a.query}» في الكتالوج`,
      find_user: (a) => `الاطلاع على العميل ${a.user_id || a.email || a.name}`,
      list_loyalty_cards: (a) =>
        `عرض بطاقات الولاء${a.query ? ` المطابقة لـ «${a.query}»` : ""}${
          a.only_eligible ? " (المؤهلة فقط)" : ""
        }`,
      list_news: () => "عرض الأخبار",
      list_guest_notes: (a) => `عرض الرسائل${a.unread_only ? " (غير المقروءة فقط)" : ""}`,
      list_reviews: (a) => `عرض التقييمات${a.fragrance ? ` الخاصة بـ «${a.fragrance}»` : ""}`,
      ban_user: (a) => `حظر العميل رقم ${a.user_id}${a.reason ? ` — السبب: ${a.reason}` : ""}`,
      unban_user: (a) => `رفع الحظر عن العميل رقم ${a.user_id}`,
      set_admin_role: (a) =>
        a.is_admin
          ? `منح صلاحية الإدارة للعميل رقم ${a.user_id}`
          : `سحب صلاحية الإدارة من العميل رقم ${a.user_id}`,
      add_loyalty_points: (a) => `إضافة ${arPoints(a.points)}`,
      set_loyalty_points: (a) => `ضبط نقاط الولاء على ${a.points}`,
      redeem_loyalty_reward: (a, ctx) => `استبدال مكافأة ولاء (${ctx.threshold} نقاط)`,
      create_loyalty_card: (a) =>
        `إنشاء بطاقة ولاء ${
          a.user_id ? `للعميل رقم ${a.user_id}` : `لعميل عابر « ${a.name} »`
        }`,
      create_news: (a) => `نشر خبر « ${a.title} »`,
      update_news: (a) => `تعديل الخبر رقم ${a.id}${a.title ? ` ← « ${a.title} »` : ""}`,
      delete_news: (a) => `حذف الخبر رقم ${a.id}`,
      set_store_hours: (a) => `تعديل ساعات العمل: ${joinHours(a.updates, "ar", "مغلق", "، ")}`,
      mark_guest_note_read: (a) => `تعليم الرسالة رقم ${a.id} كمقروءة`,
      delete_guest_note: (a) => `حذف الرسالة رقم ${a.id}`,
      delete_review: (a) => `حذف التقييم رقم ${a.review_id}`,
      update_review: (a) => `تعديل التقييم رقم ${a.review_id}${a.rating ? ` ← ${a.rating}★` : ""}`,
      delete_review_reply: (a) => `حذف الرد رقم ${a.reply_id}`,
    },
    ledger: {
      pointsAdded: (n) => `إضافة ${arPoints(n)}`,
      reward: () => "مكافأة ولاء",
      pointsAdjust: (d) => `تعديل: ${d > 0 ? "+" : ""}${d} نقطة`,
    },
  },
};

function stringsFor(lang) {
  return STRINGS[pickLang(lang)];
}

module.exports = { stringsFor, pickLang, SUPPORTED, DEFAULT_LANG };
