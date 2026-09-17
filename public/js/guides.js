/* ==========================================================================
   Guides - interactive onboarding tour
   A gold cursor travels to each feature, spotlights it and explains it.
   Self-contained: no dependencies, own EN/FR/AR copy.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ lang */
  function currentLang() {
    var l = "";
    try {
      l = localStorage.getItem("site-lang") || "";
    } catch (e) {}
    if (!l) l = document.documentElement.getAttribute("lang") || "";
    l = String(l).toLowerCase().slice(0, 2);
    return l === "fr" || l === "ar" ? l : "en";
  }

  function pick(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[currentLang()] || v.en || "";
  }

  /* Guides are admin-only: only reveal/run for administrator accounts */
  /* Resolve the signed-in user from every source the app exposes, and accept
     the first one that actually yields a user with admin rights.

     IMPORTANT: the previous version used an if / else-if chain, so when
     authStateManager.getCurrentUser() existed but returned null (auth not yet
     hydrated) the code never fell through to window.getCurrentUser() or to
     localStorage — and isAdminUser() wrongly returned false for real admins.
     Now every source is tried, in priority order. */
  function isAdminUser() {
    var candidates = [];
    try {
      if (window.authStateManager && typeof window.authStateManager.getCurrentUser === "function") {
        candidates.push(window.authStateManager.getCurrentUser());
      }
    } catch (e) {}
    try {
      if (typeof window.getCurrentUser === "function") candidates.push(window.getCurrentUser());
    } catch (e) {}
    try {
      if (window.localStorage) {
        candidates.push(JSON.parse(window.localStorage.getItem("user") || "null"));
      }
    } catch (e) {}
    try { if (window.currentUser) candidates.push(window.currentUser); } catch (e) {}
    try { if (window.user) candidates.push(window.user); } catch (e) {}

    for (var i = 0; i < candidates.length; i++) {
      var u = candidates[i];
      if (u && (u.is_admin || u.isAdmin)) return true;
    }
    return false;
  }

  /* -------------------------------------------------------------- UI copy */
  var UI = {
    eyebrow: { en: "Parfumerie Charme · Conciergerie", fr: "Parfumerie Charme · Conciergerie", ar: "بارفومري شارم · الضيافة" },
    title: { en: "Journeys & Interactive Guides", fr: "Parcours & Guides Interactifs", ar: "رحلة ودليل تفاعلي" },
    sub: {
      en: "Choose a theme and an interactive cursor will lead you through the olfactory workshop, step by step.",
      fr: "Sélectionnez une thématique. Un curseur interactif vous guidera pas à pas à travers l'atelier olfactif.",
      ar: "اختر موضوعاً وسيقودك مؤشر تفاعلي خطوة بخطوة عبر ورشة العطور."
    },
    tabs: {
      all: { en: "All", fr: "Tous", ar: "الكل" },
      discovery: { en: "Discovery & AI", fr: "Découverte & IA", ar: "اكتشاف وذكاء" },
      shop: { en: "Shop & Orders", fr: "Boutique & Commandes", ar: "متجر وطلبات" },
      account: { en: "Account & Perks", fr: "Compte & Privilèges", ar: "حساب ومزايا" },
      admin: { en: "Back office", fr: "Back-office", ar: "الإدارة" }
    },
    launch: { en: "Start", fr: "Lancer", ar: "ابدأ" },
    featured: { en: "AI Signature", fr: "Signature IA", ar: "بصمة ذكاء" },
    stepOf: {
      en: function (a, b) { return "Step " + a + " of " + b; },
      fr: function (a, b) { return "Étape " + a + " sur " + b; },
      ar: function (a, b) { return "الخطوة " + a + " من " + b; }
    },
    steps: { en: "steps", fr: "étapes", ar: "خطوات" },
    back: { en: "Back", fr: "Retour", ar: "السابق" },
    next: { en: "Next", fr: "Suivant", ar: "التالي" },
    finish: { en: "Finish", fr: "Terminer", ar: "إنهاء" },
    skip: { en: "Skip guide", fr: "Passer", ar: "تخطي" },
    doneTitle: { en: "You're all set", fr: "Tout est prêt", ar: "كل شيء جاهز" },
    doneText: {
      en: "That's the whole walkthrough. You can replay any guide whenever you like.",
      fr: "C'est la fin de la visite. Vous pouvez rejouer un guide à tout moment.",
      ar: "هذه نهاية الجولة. يمكنك إعادة تشغيل أي دليل في أي وقت."
    },
    again: { en: "Replay", fr: "Rejouer", ar: "إعادة" },
    allGuides: { en: "All guides", fr: "Tous les guides", ar: "كل الأدلة" },
    close: { en: "Close", fr: "Fermer", ar: "إغلاق" },
    missing: {
      en: "This element isn't on screen right now — open its panel and it will be waiting for you.",
      fr: "Cet élément n'est pas visible pour le moment — ouvrez son panneau et il vous attendra.",
      ar: "هذا العنصر غير ظاهر الآن — افتح لوحته وسيكون في انتظارك."
    }
  };

  /* ------------------------------------------------------------- guides */
  /* sel = CSS selector, place = tooltip side, opt = skip silently if absent */

  /* Custom gold line-icons (no emoji — keeps the luxury identity) */
  var ICON = {
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.4"/><rect x="13" y="4" width="7" height="7" rx="1.4"/><rect x="4" y="13" width="7" height="7" rx="1.4"/><rect x="13" y="13" width="7" height="7" rx="1.4"/></svg>',
    bottle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3h4"/><path d="M11 3v3l-1.2 2.2V20a1.5 1.5 0 0 0 1.5 1.5h1.4A1.5 1.5 0 0 0 14.2 20V8.2L13 6V3"/><path d="M9.6 12h4.8"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><circle cx="7.5" cy="14.5" r="1.1"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8L12 4Z"/><path d="M18 16.5l.8 2.2L21 19.5l-2.2.8L18 22.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3Z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
    receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9.5 9h5M12 6.5v5"/></svg>',
    idcard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.6 2-2.4 3-2.4s2.4.8 3 2.4"/><path d="M14.5 10h5M14.5 13.5h4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2.5"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14a1 1 0 0 1 1 1v11l-4 4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 9h8M8 13h5"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>'
  };

  /* Concierge categories for the launcher filter tabs */
  var CATEGORY = {
    navigation: "discovery",
    search: "discovery",
    browsing: "discovery",
    profiler: "discovery",
    product: "shop",
    cart: "shop",
    account: "account",
    loyalty: "account",
    reviews: "account",
    admin: "admin",
    "client-profiles": "admin",
    "add-achat": "admin",
    "store-hours": "admin",
    news: "admin",
    ban: "admin",
    "guest-notes": "admin"
  };

  var TAB_ORDER = ["all", "discovery", "shop", "account", "admin"];

  var GUIDES = [
    {
      id: "navigation",
      icon: ICON.compass,
      title: { en: "Navigation & language", fr: "Navigation et langue", ar: "التنقل واللغة" },
      desc: {
        en: "Move around the site, switch theme, change language.",
        fr: "Se déplacer sur le site, changer de thème et de langue.",
        ar: "التنقل في الموقع، تغيير المظهر واللغة."
      },
      steps: [
        {
          sel: ".nav-link",
          place: "bottom",
          t: { en: "Main menu", fr: "Menu principal", ar: "القائمة الرئيسية" },
          d: {
            en: "These links jump to Home, About, Services and Contact.",
            fr: "Ces liens mènent à l'Accueil, À propos, Services et Contact.",
            ar: "هذه الروابط تنقلك إلى الرئيسية، من نحن، الخدمات واتصل بنا."
          }
        },
        {
          sel: "#themeToggle",
          place: "bottom",
          t: { en: "Theme", fr: "Thème", ar: "المظهر" },
          d: {
            en: "Switch between the light boutique look and the night mode.",
            fr: "Basculez entre le rendu clair de la boutique et le mode nuit.",
            ar: "بدّل بين المظهر النهاري ومظهر الليل."
          }
        },
        {
          sel: "#current-lang",
          place: "bottom",
          t: { en: "Language", fr: "Langue", ar: "اللغة" },
          d: {
            en: "Open this to switch the whole site between English, French and Arabic. Arabic also flips the layout to right-to-left.",
            fr: "Ouvrez ceci pour basculer tout le site entre anglais, français et arabe. L'arabe passe aussi la mise en page en lecture de droite à gauche.",
            ar: "افتح هذا للتبديل بين الإنجليزية والفرنسية والعربية. العربية تحوّل الصفحة أيضاً إلى الاتجاه من اليمين إلى اليسار."
          }
        },
        {
          sel: "#navbarNewsIcon",
          place: "bottom",
          opt: true,
          t: { en: "News", fr: "Actualités", ar: "الأخبار" },
          d: {
            en: "The bell opens announcements published by the boutique.",
            fr: "La cloche ouvre les actualités publiées par la boutique.",
            ar: "الجرس يفتح الأخبار التي تنشرها البوتيك."
          }
        },
        {
          sel: "#aiFinderIcon",
          place: "left",
          t: { en: "Scent Profiler", fr: "Profiler olfactif", ar: "محلل الروائح" },
          d: {
            en: "Answer a few questions and let the assistant suggest fragrances that match your taste.",
            fr: "Répondez à quelques questions et laissez l'assistant vous suggérer des parfums adaptés à votre goût.",
            ar: "أجب عن بعض الأسئلة ودع المساعد يقترح عليك عطوراً تناسب ذوقك."
          }
        }
      ]
    },

    {
      id: "search",
      icon: ICON.search,
      title: { en: "Search & discovery", fr: "Recherche et découverte", ar: "البحث والاكتشاف" },
      desc: {
        en: "Find a fragrance fast, by name, gender or note.",
        fr: "Trouvez un parfum rapidement, par nom, genre ou note.",
        ar: "اعثر على عطر بسرعة بالاسم أو النوع أو النوتة."
      },
      steps: [
        {
          sel: "#quickSearchInput",
          place: "bottom",
          t: { en: "Quick search", fr: "Recherche rapide", ar: "البحث السريع" },
          d: {
            en: "Start typing a fragrance name — results appear instantly, before you finish typing.",
            fr: "Commencez à taper un nom de parfum — les résultats apparaissent instantanément.",
            ar: "ابدأ بكتابة اسم العطر — تظهر النتائج فوراً."
          },
          hint: {
            en: "You can also search for a client profile by switching the tab above the results.",
            fr: "Vous pouvez aussi chercher un profil client en changeant l'onglet au-dessus des résultats.",
            ar: "يمكنك أيضاً البحث عن ملف عميل بتبديل التبويب فوق النتائج."
          }
        },
        {
          sel: ".search-tab[data-search-type]",
          place: "bottom",
          opt: true,
          t: { en: "Search what?", fr: "Rechercher quoi ?", ar: "ماذا تبحث؟" },
          d: {
            en: "Switch the search between fragrances and customer profiles.",
            fr: "Basculez la recherche entre les parfums et les profils clients.",
            ar: "بدّل البحث بين العطور وملفات العملاء."
          }
        },
        {
          sel: ".gender-badge[data-audience]",
          place: "bottom",
          opt: true,
          t: { en: "Filter by gender", fr: "Filtrer par genre", ar: "التصفية حسب النوع" },
          d: {
            en: "Narrow results to unisex, men's or women's fragrances.",
            fr: "Limitez les résultats aux parfums mixtes, pour hommes ou pour femmes.",
            ar: "حدّد النتائج على العطور المشتركة أو الرجالية أو النسائية."
          }
        },
        {
          sel: "#floatingSearch",
          place: "left",
          onShow: function () { showFloatingSearch(); },
          t: { en: "Full search", fr: "Recherche complète", ar: "البحث الكامل" },
          d: {
            en: "This round button opens the full search panel with a wider results grid.",
            fr: "Ce bouton rond ouvre le panneau de recherche complet avec une grille de résultats plus large.",
            ar: "هذا الزر الدائري يفتح لوحة البحث الكاملة بشبكة نتائج أوسع."
          }
        },
        {
          sel: "#showAllFragrancesBtn",
          place: "top",
          opt: true,
          onShow: function () { openIngredientSearch(); },
          t: { en: "Browse everything", fr: "Tout parcourir", ar: "تصفح الكل" },
          d: {
            en: "No query needed — open the entire catalogue at once.",
            fr: "Aucune recherche nécessaire — ouvrez tout le catalogue d'un coup.",
            ar: "لا حاجة للبحث — افتح الكتالوج كاملاً مرة واحدة."
          }
        }
      ]
    },

    {
      id: "browsing",
      icon: ICON.grid,
      title: { en: "Browsing the collection", fr: "Parcourir la collection", ar: "تصفح المجموعة" },
      desc: {
        en: "Switch view modes and use the filter sidebar.",
        fr: "Changez de mode d'affichage et utilisez la barre de filtres.",
        ar: "بدّل طرق العرض واستخدم شريط التصفية."
      },
      steps: [
        {
          sel: ".perfume-mode-btn",
          place: "bottom",
          opt: true,
          t: { en: "Two ways to browse", fr: "Deux façons de parcourir", ar: "طريقتان للتصفح" },
          d: {
            en: "Details mode shows each fragrance as a full editorial page. Grid mode shows compact cards you can scan quickly.",
            fr: "Le mode Détails affiche chaque parfum comme une page éditoriale complète. Le mode Grille affiche des cartes compactes à parcourir rapidement.",
            ar: "وضع التفاصيل يعرض كل عطر كصفحة كاملة. وضع الشبكة يعرض بطاقات مختصرة لسهولة التصفح."
          }
        },
        {
          sel: ".perfume-grid-card",
          place: "right",
          opt: true,
          t: { en: "Open a fragrance", fr: "Ouvrir un parfum", ar: "فتح عطر" },
          d: {
            en: "Click any card to jump straight to that fragrance's full section.",
            fr: "Cliquez sur une carte pour aller directement à la section complète de ce parfum.",
            ar: "انقر أي بطاقة للانتقال إلى قسم العطر الكامل."
          }
        },
        {
          sel: "#perfumeGridSidebar",
          place: "right",
          opt: true,
          t: { en: "Filter sidebar", fr: "Barre de filtres", ar: "شريط التصفية" },
          d: {
            en: "Refine the collection by season, quality and fragrance notes. Combine several filters to narrow it down.",
            fr: "Affinez la collection par saison, qualité et notes. Combinez plusieurs filtres pour préciser.",
            ar: "رتّب المجموعة حسب الموسم والجودة والنوتات. اجمع عدة مرشحات للتضييق."
          }
        },
        {
          sel: "#gridFilterNoteSearch",
          place: "right",
          opt: true,
          t: { en: "Find a note", fr: "Trouver une note", ar: "البحث عن نوتة" },
          d: {
            en: "Type inside the notes list to find a specific ingredient without scrolling.",
            fr: "Tapez dans la liste des notes pour trouver un ingrédient précis sans défiler.",
            ar: "اكتب داخل قائمة النوتات للعثور على مكوّن محدد دون التمرير."
          }
        },
        {
          sel: "#gridFilterClear",
          place: "top",
          opt: true,
          t: { en: "Reset filters", fr: "Réinitialiser", ar: "إعادة الضبط" },
          d: {
            en: "Went too narrow? This clears every active filter in one click.",
            fr: "Trop filtré ? Ceci efface tous les filtres actifs en un clic.",
            ar: "ضيّقت كثيراً؟ هذا يمسح كل المرشحات النشطة بنقرة واحدة."
          }
        }
      ]
    },

    {
      id: "product",
      icon: ICON.bottle,
      title: { en: "Product actions", fr: "Actions produit", ar: "إجراءات المنتج" },
      desc: {
        en: "Save favourites, choose a size, add to cart.",
        fr: "Enregistrer ses favoris, choisir un format, ajouter au panier.",
        ar: "حفظ المفضلة، اختيار الحجم، الإضافة إلى السلة."
      },
      steps: [
        {
          sel: ".favorite-btn",
          place: "top",
          onShow: function () { ensureMode("details"); },
          t: { en: "Favourite", fr: "Favori", ar: "المفضلة" },
          d: {
            en: "Tap the heart to save a fragrance. Your list stays available from the account menu.",
            fr: "Touchez le cœur pour enregistrer un parfum. Votre liste reste accessible depuis le menu compte.",
            ar: "انقر القلب لحفظ العطر. تبقى قائمتك متاحة من قائمة الحساب."
          },
          hint: {
            en: "Favourites are stored on your account, so they follow you across devices.",
            fr: "Les favoris sont liés à votre compte et vous suivent sur tous vos appareils.",
            ar: "المفضلة مرتبطة بحسابك فتتابعك على جميع أجهزتك."
          }
        },
        {
          sel: ".quality-option",
          place: "top",
          opt: true,
          onShow: function () { ensureMode("details"); },
          t: { en: "Choose a format", fr: "Choisir un format", ar: "اختر الحجم" },
          d: {
            en: "Pick the concentration or bottle size. The price updates to match your choice.",
            fr: "Choisissez la concentration ou le format. Le prix s'ajuste automatiquement.",
            ar: "اختر التركيز أو حجم الزجاجة. يتحدث السعر تلقائياً."
          }
        },
        {
          sel: ".add-to-cart-btn",
          place: "top",
          onShow: function () { ensureMode("details"); },
          t: { en: "Add to cart", fr: "Ajouter au panier", ar: "أضف إلى السلة" },
          d: {
            en: "Adds the selected format to your cart. The counter in the navbar updates right away.",
            fr: "Ajoute le format choisi à votre panier. Le compteur de la barre de navigation se met à jour immédiatement.",
            ar: "يضيف الحجم المختار إلى سلتك. يتحدث العدّاد في الشريط العلوي فوراً."
          }
        },
        {
          sel: ".perfume-grid-fragrantica",
          place: "top",
          opt: true,
          onShow: function () { ensureMode("details"); },
          t: { en: "Full data sheet", fr: "Fiche complète", ar: "البيانات الكاملة" },
          d: {
            en: "Opens the fragrance on Fragrantica for the complete community data sheet.",
            fr: "Ouvre le parfum sur Fragrantica pour la fiche communautaire complète.",
            ar: "يفتح العطر على Fragrantica لعرض البيانات الكاملة."
          }
        }
      ]
    },

    {
      id: "cart",
      icon: ICON.bag,
      title: { en: "Cart & checkout", fr: "Panier et commande", ar: "السلة والطلب" },
      desc: {
        en: "Review quantities and complete your order.",
        fr: "Vérifiez les quantités et finalisez votre commande.",
        ar: "راجع الكميات وأكمل طلبك."
      },
      steps: [
        {
          sel: "#navbarCartIcon",
          place: "bottom",
          t: { en: "Your cart", fr: "Votre panier", ar: "سلتك" },
          d: {
            en: "Open the cart at any time from here. The badge shows how many items are inside.",
            fr: "Ouvrez le panier à tout moment depuis ici. Le badge indique le nombre d'articles.",
            ar: "افتح السلة في أي وقت من هنا. الشارة توضح عدد المنتجات."
          }
        },
        {
          sel: ".cart-item-quantity",
          place: "top",
          opt: true,
          onShow: function () { openCart(); },
          t: { en: "Adjust quantity", fr: "Ajuster la quantité", ar: "تعديل الكمية" },
          d: {
            en: "Use the minus and plus controls to change how many bottles you want. The totals recalculate instantly.",
            fr: "Utilisez les boutons moins et plus pour changer le nombre de flacons. Les totaux se recalculent instantanément.",
            ar: "استخدم زرّي الناقص والزائد لتغيير عدد الزجاجات. تتحسب المجاميع فوراً."
          }
        },
        {
          sel: "#checkoutBtn",
          place: "top",
          opt: true,
          onShow: function () { openCart(); },
          t: { en: "Checkout", fr: "Commander", ar: "إتمام الطلب" },
          d: {
            en: "Happy with your selection? Continue here to confirm the order with the boutique.",
            fr: "Votre sélection vous convient ? Continuez ici pour confirmer la commande auprès de la boutique.",
            ar: "راضٍ عن اختيارك؟ تابع من هنا لتأكيد الطلب لدى البوتيك."
          }
        },
        {
          sel: "#clearCartBtn",
          place: "top",
          opt: true,
          onShow: function () { openCart(); },
          t: { en: "Empty the cart", fr: "Vider le panier", ar: "إفراغ السلة" },
          d: {
            en: "Removes everything from the cart in one go.",
            fr: "Retire tout le contenu du panier en une fois.",
            ar: "يزيل كل محتوى السلة مرة واحدة."
          }
        }
      ]
    },

    {
      id: "account",
      icon: ICON.user,
      title: { en: "Account", fr: "Compte", ar: "الحساب" },
      desc: {
        en: "Sign in, register, edit your profile.",
        fr: "Connectez-vous, inscrivez-vous, modifiez votre profil.",
        ar: "سجّل الدخول، أنشئ حساباً، عدّل ملفك."
      },
      steps: [
        {
          sel: "#loginBtn",
          place: "bottom",
          opt: true,
          t: { en: "Sign in", fr: "Se connecter", ar: "تسجيل الدخول" },
          d: {
            en: "Not signed in yet? This opens the sign-in panel.",
            fr: "Pas encore connecté ? Ceci ouvre le panneau de connexion.",
            ar: "لم تسجّل الدخول بعد؟ هذا يفتح لوحة الدخول."
          },
          onShow: function () { showDropdown('#userDropdown'); }
        },
        {
          sel: "#showSignup",
          place: "top",
          opt: true,
          t: { en: "Create an account", fr: "Créer un compte", ar: "إنشاء حساب" },
          d: {
            en: "Switch to the registration form. You'll receive a 6-digit code by email to verify your address.",
            fr: "Basculez vers le formulaire d'inscription. Vous recevrez un code à 6 chiffres par e-mail pour vérifier votre adresse.",
            ar: "انتقل إلى نموذج التسجيل. ستستلم رمزاً من 6 أرقام عبر البريد لتأكيد عنوانك."
          }
        },
        {
          sel: "#userAvatar",
          place: "bottom",
          t: { en: "Account menu", fr: "Menu compte", ar: "قائمة الحساب" },
          d: {
            en: "Once signed in, click your avatar to open this menu — profile, favourites, cart, settings and more.",
            fr: "Une fois connecté, cliquez sur votre avatar pour ouvrir ce menu — profil, favoris, panier, paramètres, etc.",
            ar: "بعد تسجيل الدخول، انقر صورتك لفتح هذه القائمة — الملف، المفضلة، السلة، الإعدادات وغيرها."
          }
        },
        {
          sel: "#userProfileLink",
          place: "left",
          opt: true,
          onShow: function () { showDropdown('#userDropdown'); },
          t: { en: "Your profile", fr: "Votre profil", ar: "ملفك الشخصي" },
          d: {
            en: "Edit your name, phone, birthday and avatar photo. There's even a built-in cropper for your picture.",
            fr: "Modifiez votre nom, téléphone, date de naissance et photo. Un recadrage est intégré pour votre image.",
            ar: "عدّل اسمك وهاتفك وتاريخ ميلادك وصورتك. يوجد أداة قص مدمجة للصورة."
          }
        },
        {
          sel: "#userFavorites",
          place: "left",
          opt: true,
          onShow: function () { showDropdown('#userDropdown'); },
          t: { en: "Favourites", fr: "Favoris", ar: "المفضلة" },
          d: {
            en: "Everything you hearted, gathered in one list.",
            fr: "Tout ce que vous avez mis en favori, réuni dans une seule liste.",
            ar: "كل ما أضفته إلى المفضلة في قائمة واحدة."
          }
        },
        {
          sel: "#logoutBtn",
          place: "left",
          opt: true,
          onShow: function () { showDropdown('#userDropdown'); },
          t: { en: "Sign out", fr: "Se déconnecter", ar: "تسجيل الخروج" },
          d: {
            en: "Signs you out of this device.",
            fr: "Vous déconnecte de cet appareil.",
            ar: "يخرجك من هذا الجهاز."
          }
        }
      ]
    },

    {
      id: "loyalty",
      icon: ICON.card,
      title: { en: "Loyalty card", fr: "Carte fidélité", ar: "بطاقة الولاء" },
      desc: {
        en: "Earn points and redeem a free fragrance.",
        fr: "Cumulez des points et obtenez un parfum offert.",
        ar: "اجمع النقاط واحصل على عطر مجاني."
      },
      steps: [
        {
          sel: "#loyaltyCardBtn",
          place: "left",
          opt: true,
          t: { en: "Open the loyalty desk", fr: "Ouvrir l'espace fidélité", ar: "فتح قسم الولاء" },
          d: {
            en: "Shown to staff (admin) accounts in the account menu: click your avatar, then « Carte Fidélité ». From here you can issue cards, add points, redeem rewards and open client profiles.",
            fr: "Visible pour les comptes du personnel (admin) dans le menu compte : cliquez votre avatar, puis « Carte Fidélité ». D'ici, créez des cartes, ajoutez des points, échangez des récompenses et ouvrez les profils clients.",
            ar: "يظهر لحسابات الطاقم (المشرفين) في قائمة الحساب: انقر صورتك ثم «بطاقة الولاء». من هنا تُصدر بطاقات، وتضيف نقاطاً، وتستبدل مكافآت وتفتح ملفات العملاء."
          },
          hint: {
            en: "Reward rule: 5 points = 1 free perfume.",
            fr: "Règle de récompense : 5 points = 1 parfum offert.",
            ar: "قاعدة المكافأة: 5 نقاط = عطر مجاني."
          },
          onShow: function () { showDropdown('#userDropdown'); }
        },
        {
          sel: "#loyaltySearchInput",
          place: "top",
          opt: true,
          t: { en: "Find a client", fr: "Trouver un client", ar: "البحث عن عميل" },
          d: {
            en: "Search the loyalty list by name, email or phone number.",
            fr: "Recherchez dans la liste par nom, e-mail ou numéro de téléphone.",
            ar: "ابحث في القائمة بالاسم أو البريد أو رقم الهاتف."
          },
          onShow: function () { openLoyalty(); }
        },
        {
          sel: "#loyaltyCreateManualBtn",
          place: "top",
          opt: true,
          t: { en: "Issue a card", fr: "Créer une carte", ar: "إصدار بطاقة" },
          d: {
            en: "Create a card manually for a client who doesn't have one yet.",
            fr: "Créez une carte manuellement pour un client qui n'en a pas encore.",
            ar: "أنشئ بطاقة يدوياً لعميل ليس لديه بطاقة بعد."
          },
          onShow: function () { openLoyalty(); }
        }
      ]
    },

    {
      id: "profiler",
      icon: ICON.sparkle,
      title: { en: "AI Scent Profiler", fr: "Profiler olfactif IA", ar: "محلل الروائح الذكي" },
      desc: {
        en: "Answer a few questions, get matched fragrances.",
        fr: "Quelques questions, puis des parfums assortis.",
        ar: "أجب عن أسئلة قليلة واحصل على عطور مطابقة."
      },
      steps: [
        {
          sel: "#aiFinderIcon",
          place: "left",
          t: { en: "Start here", fr: "Commencez ici", ar: "ابدأ من هنا" },
          d: {
            en: "Click the sparkle icon in the navbar to launch the Scent Profiler.",
            fr: "Cliquez sur l'icône étincelle dans la barre de navigation pour lancer le Profiler.",
            ar: "انقر أيقونة الوميض في الشريط العلوي لتشغيل المحلل."
          },
          onShow: function () { openPanel("#scent-profiler-modal"); }
        },
        {
          sel: "#spWelcome",
          place: "top",
          opt: true,
          onShow: function () { profilerOpen(); },
          t: { en: "Welcome screen", fr: "Écran d'accueil", ar: "شاشة الترحيب" },
          d: {
            en: "The profiler opens here. Press “Start Profiling” to begin the 8 questions.",
            fr: "Le profiler s'ouvre ici. Appuyez sur « Start Profiling » pour commencer les 8 questions.",
            ar: "يُفتح المحلل هنا. اضغط «ابدأ» لبدء الأسئلة الثمانية."
          }
        },
        {
          sel: "#spQuestion",
          place: "top",
          opt: true,
          onShow: function () { profilerToQuestion(); },
          t: { en: "Answer the questions", fr: "Répondez aux questions", ar: "أجب عن الأسئلة" },
          d: {
            en: "Pick the option that feels closest to you. Use Back to revisit a previous answer.",
            fr: "Choisissez l'option qui vous correspond. Utilisez Retour pour revoir une réponse précédente.",
            ar: "اختر الخيار الأقرب إليك. استخدم رجوع لمراجعة إجابة سابقة."
          }
        },
        {
          sel: "#spProgressFill",
          place: "bottom",
          opt: true,
          onShow: function () { profilerToQuestion(); },
          t: { en: "Progress bar", fr: "Barre de progression", ar: "شريط التقدّم" },
          d: {
            en: "This bar fills as you answer each question, showing how far along you are.",
            fr: "Cette barre se remplit à chaque réponse, indiquant votre progression.",
            ar: "يمتلئ هذا الشريط مع كل إجابة لبيان مدى تقدّمك."
          }
        },
        {
          sel: "#spResults",
          place: "top",
          opt: true,
          onShow: function () { profilerToResults(); },
          t: { en: "Your matches", fr: "Vos résultats", ar: "نتائجك" },
          d: {
            en: "At the end you get a shortlist matched to your answers — restart any time to try a different profile.",
            fr: "À la fin, une sélection adaptée à vos réponses — recommencez pour essayer un autre profil.",
            ar: "في النهاية ستحصل على قائمة مطابقة لإجاباتك — أعد المحاولة لتجربة ملف آخر."
          }
        }
      ]
    },

    {
      id: "reviews",
      icon: ICON.star,
      title: { en: "Reviews", fr: "Avis", ar: "التقييمات" },
      desc: {
        en: "Rate a fragrance and share your experience.",
        fr: "Notez un parfum et partagez votre expérience.",
        ar: "قيّم عطراً وشارك تجربتك."
      },
      steps: [
        {
          sel: ".add-review-container",
          place: "top",
          opt: true,
          t: { en: "Write a review", fr: "Écrire un avis", ar: "كتابة تقييم" },
          d: {
            en: "Every fragrance has its own review box. This is where you write yours — the box appears under each perfume.",
            fr: "Chaque parfum possède sa propre zone d'avis. C'est ici que vous écrivez le vôtre — la zone apparaît sous chaque parfum.",
            ar: "لكل عطر صندوق تقييم خاص. هنا تكتب تقييمك — يظهر الصندوق تحت كل عطر."
          },
          onShow: function () {
            /* The container is hidden twice over: its .reviews-section parent is
               display:none, and in grid mode the whole product section is too.
               openReviewForm() switches to details mode and reveals both. */
            openReviewForm();
          }
        },
        {
          sel: ".star-rating, .star-rating-input",
          place: "top",
          opt: true,
          onShow: function () { openReviewForm(); },
          t: { en: "Star rating", fr: "Note en étoiles", ar: "التقييم بالنجوم" },
          d: {
            en: "Choose from one to five stars to rate the fragrance.",
            fr: "Choisissez de une à cinq étoiles pour noter le parfum.",
            ar: "اختر من نجمة إلى خمس نجوم لتقييم العطر."
          }
        },
        {
          sel: ".review-textarea",
          place: "top",
          opt: true,
          onShow: function () { openReviewForm(); },
          t: { en: "Your words", fr: "Votre texte", ar: "نصّك" },
          d: {
            en: "Describe longevity, projection and when you like to wear it. A character counter keeps you in bounds.",
            fr: "Décrivez la tenue, la projection et quand vous aimez le porter. Un compteur vous limite.",
            ar: "صف الثبات والفوحان ومتى تفضل ارتداءه. عدّاد الأحرف يحدد لك الحد."
          }
        },
        {
          sel: ".submit-review-btn, .submit-btn",
          place: "top",
          opt: true,
          onShow: function () { openReviewForm(); },
          t: { en: "Publish", fr: "Publier", ar: "نشر" },
          d: {
            en: "Post your review. You need to be signed in for it to appear.",
            fr: "Publiez votre avis. Vous devez être connecté pour qu'il apparaisse.",
            ar: "انشر تقييمك. يجب تسجيل الدخول ليظهر."
          }
        }
      ]
    },

    {
      id: "admin",
      icon: ICON.shield,
      title: { en: "Admin dashboard", fr: "Tableau de bord admin", ar: "لوحة الإدارة" },
      desc: {
        en: "Manage users, news, loyalty and store hours.",
        fr: "Gérez les utilisateurs, actualités, fidélité et horaires.",
        ar: "أدر المستخدمين والأخبار والولاء وأوقات العمل."
      },
      steps: [
        {
          sel: "#adminModal",
          place: "left",
          opt: true,
          t: { en: "Step 1 · Open the dashboard", fr: "Étape 1 · Ouvrir le tableau de bord", ar: "الخطوة 1 · افتح لوحة التحكم" },
          d: {
            en: "Visible only to administrator accounts. In your account menu, click « Admin Dashboard » to open the management console.",
            fr: "Visible uniquement pour les comptes administrateurs. Dans votre menu compte, cliquez « Admin Dashboard » pour ouvrir la console de gestion.",
            ar: "تظهر لحسابات الإدارة فقط. في قائمة حسابك، انقر «لوحة الإدارة» لفتح وحدة الإدارة."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#usersTableBody",
          place: "top",
          opt: true,
          t: { en: "Users", fr: "Utilisateurs", ar: "المستخدمون" },
          d: {
            en: "Every account created on the site, with name, e-mail, status and the date they joined. Use the Ban / Unban action to manage access. Note: this is the account list — client profiles (with purchases & loyalty) live in the Carte Fidélité section just below.",
            fr: "Tous les comptes créés sur le site, avec nom, e-mail, statut et date d'inscription. Utilisez Ban / Unban pour gérer les accès. Note : c'est la liste des comptes — les profils clients (achats et fidélité) vivent dans la section Carte Fidélité juste en dessous.",
            ar: "كل الحسابات المنشأة على الموقع، مع الاسم والبريد والحالة وتاريخ التسجيل. استخدم حظر/إلغاء حظر لإدارة الوصول. ملاحظة: هذه قائمة الحسابات — ملفات العملاء (مشتريات وولاء) في قسم بطاقة الولاء أدنى مباشرة."
          },
          hint: {
            en: "Statuses: Active = normal, Admin = staff, Banned = blocked.",
            fr: "Statuts : Active = normal, Admin = personnel, Banned = bloqué.",
            ar: "الحالات: Active = عادي، Admin = طاقم، Banned = محظور."
          }
        },
        {
          sel: "#loyaltyTableBody",
          place: "top",
          opt: true,
          onShow: function () { enterAdmin(); },
          t: { en: "Carte Fidélité", fr: "Carte Fidélité", ar: "بطاقة الولاء" },
          d: {
            en: "The loyalty table lists every client with a card: name, contact, points and progress toward the reward. The +1 / + Points buttons add points, « Offrir parfum » redeems the reward (5 points), and the « Consult a client profile » guide shows the full profile there.",
            fr: "Le tableau fidélité liste chaque client possédant une carte : nom, contact, points et progression. Les boutons +1 / + Points ajoutent des points, « Offrir parfum » échange la récompense (5 points), et le guide « Consulter un profil client » montre le profil complet.",
            ar: "جدول الولاء يعرض كل عميل لديه بطاقة: الاسم، وسيلة الاتصال، النقاط والتقدم نحو المكافأة. زرّا +1 / + نقاط يضيفان نقاطاً، «أهدِ عطراً» يستبدل المكافأة (5 نقاط)، ودليل «استشارة ملف عميل» يعرض الملف الكامل."
          }
        },
        {
          sel: "#hoursAdminGrid",
          place: "top",
          opt: true,
          t: { en: "Store hours", fr: "Horaires", ar: "أوقات العمل" },
          d: {
            en: "Set opening and closing times for each day. Tick 'Closed' for days the boutique is shut, then press Save for the homepage to update.",
            fr: "Définissez les heures d'ouverture et de fermeture pour chaque jour. Cochez « Fermé » pour les jours de repos, puis Enregistrer pour que l'accueil se mette à jour.",
            ar: "حدد أوقات الفتح والإغلاق لكل يوم. علّم «مغلق» لأيام العطلة ثم اضغط حفظ لتتحدث الصفحة الرئيسية."
          }
        },
        {
          sel: "#hoursSaveBtn",
          place: "top",
          opt: true,
          t: { en: "Save", fr: "Enregistrer", ar: "حفظ" },
          d: {
            en: "Always press Save after changing the hours — the homepage card updates immediately.",
            fr: "Appuyez toujours sur Enregistrer après avoir modifié les horaires — la carte d'accueil se met à jour immédiatement.",
            ar: "اضغط حفظ دائماً بعد تغيير الأوقات — تتحدث بطاقة الصفحة الرئيسية فوراً."
          },
          hint: {
            en: "Nothing is stored until you press this button.",
            fr: "Rien n'est enregistré avant d'appuyer sur ce bouton.",
            ar: "لا يُحفظ شيء قبل الضغط على هذا الزر."
          }
        },
        {
          sel: "#adminNewsList",
          place: "top",
          opt: true,
          t: { en: "News & notifications", fr: "Actualités", ar: "الأخبار" },
          d: {
            en: "Publish an announcement (see the « Publish news » guide) and it reaches every visitor through the navbar bell.",
            fr: "Publiez une annonce (voir le guide « Publier une actualité ») et elle atteindra chaque visiteur via la cloche de navigation.",
            ar: "انشر إعلاناً (انظر دليل «نشر خبر») وسيصل إلى كل زائر عبر جرس الشريط العلوي."
          }
        }
      ]
    },

    /* ---- Consult a client profile ---- */
    {
      id: "client-profiles",
      icon: ICON.idcard,
      title: { en: "Consult a client profile", fr: "Consulter un profil client", ar: "استشارة ملف عميل" },
      desc: {
        en: "Open any customer's profile from the loyalty desk to read their taste, history and tailored suggestions.",
        fr: "Ouvrez le profil de n'importe quel client depuis l'espace fidélité pour lire son goût, son historique et ses suggestions.",
        ar: "افتح ملف أي عميل من قسم الولاء لقراءة ذوقه وتاريخه واقتراحاته المخصّصة."
      },
      steps: [
        {
          sel: "#loyaltyCardBtn",
          place: "left",
          opt: true,
          onShow: function () { showDropdown('#userDropdown'); },
          t: { en: "Step 1 · Open the loyalty desk", fr: "Étape 1 · Ouvrir l'espace fidélité", ar: "الخطوة 1 · افتح قسم الولاء" },
          d: {
            en: "Click your avatar in the top-right corner to open the account menu, then click « Carte Fidélité ». This is the staff screen where every loyalty client is registered — client profiles are opened from here.",
            fr: "Cliquez sur votre avatar en haut à droite pour ouvrir le menu compte, puis cliquez « Carte Fidélité ». C'est l'écran du personnel où chaque client fidélité est enregistré — les profils clients s'ouvrent d'ici.",
            ar: "انقر صورتك في الأعلى يميناً لفتح قائمة حسابك، ثم انقر «بطاقة الولاء». هذه شاشة الطاقم حيث يُسجل كل عميل ولاء — ومن هنا تُفتح ملفات العملاء."
          },
          hint: {
            en: "This entry only appears for staff (admin) accounts.",
            fr: "Cette entrée n'apparaît que pour les comptes du personnel (admin).",
            ar: "يظهر هذا الخيار لحسابات الطاقم (المشرفين) فقط."
          }
        },
        {
          sel: "#loyaltyModal",
          place: "top",
          opt: true,
          onShow: function () { openLoyalty(); },
          t: { en: "Step 2 · The loyalty window", fr: "Étape 2 · La fenêtre fidélité", ar: "الخطوة 2 · نافذة الولاء" },
          d: {
            en: "A full-screen window opens. At the top: three totals (cards issued, clients eligible for a reward, free perfumes given). On the left: the form to create a new card. On the right: the client list — this is where you find a profile.",
            fr: "Une fenêtre plein écran s'ouvre. En haut : trois totaux (cartes émises, clients éligibles à une récompense, parfums offerts). À gauche : le formulaire de création. À droite : la liste des clients — c'est ici qu'on trouve un profil.",
            ar: "تفتح نافذة بملء الشاشة. في الأعلى: ثلاثة مجاميع (البطاقات المُصدرة، العملاء المؤهلون لمكافأة، العطور المهداة). يساراً: نموذج إنشاء بطاقة. يميناً: قائمة العملاء — وهنا تجد الملف."
          }
        },
        {
          sel: "#loyaltyModalTableBody",
          place: "top",
          opt: true,
          onShow: function () { openLoyalty(); },
          t: { en: "Step 3 · Find the client", fr: "Étape 3 · Retrouver le client", ar: "الخطوة 3 · اعثر على العميل" },
          d: {
            en: "Each row of the table is one client: name, contact (e-mail or phone), card number and loyalty points. Use the search box just above the table to type a name or phone number and narrow the list instantly.",
            fr: "Chaque ligne du tableau est un client : nom, contact (e-mail ou téléphone), n° de carte et points. Utilisez la barre de recherche juste au-dessus pour taper un nom ou un numéro et affiner la liste instantanément.",
            ar: "كل صف في الجدول يمثل عميلاً: الاسم، وسيلة الاتصال (بريد أو هاتف)، رقم البطاقة والنقاط. استخدم مربع البحث فوق الجدول لكتابة اسم أو رقم وتضييق القائمة فوراً."
          },
          hint: {
            en: "Each row also shows a progress bar toward the reward (5 points = 1 free perfume).",
            fr: "Chaque ligne montre aussi une barre de progression vers la récompense (5 points = 1 parfum offert).",
            ar: "يعرض كل صف أيضاً شريط تقدم نحو المكافأة (5 نقاط = عطر مجاني)."
          }
        },
        {
          sel: "#customerProfileModal, .btn-loyalty-profile",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Step 4 · The « Profil » button", fr: "Étape 4 · Le bouton « Profil »", ar: "الخطوة 4 · زر «الملف»" },
          d: {
            en: "At the end of each row, under « Actions », is a gold « Profil » button. Click it to open that client's complete profile. (In this tour an eligible client — one who already has purchases — is opened automatically.)",
            fr: "À la fin de chaque ligne, sous « Actions », se trouve un bouton doré « Profil ». Cliquez-le pour ouvrir le profil complet du client. (Dans ce parcours, un client éligible — qui a déjà des achats enregistrés — est ouvert automatiquement.)",
            ar: "في نهاية كل صف، تحت «إجراءات»، يوجد زر ذهبي «الملف». انقر عليه لفتح ملف العميل الكامل. (في هذا الدليل يُفتح عميل مؤهل — لديه مشتريات مسجلة — تلقائياً.)"
          },
          hint: {
            en: "If the list is empty, it means no loyalty card has been issued yet.",
            fr: "Si la liste est vide, c'est qu'aucune carte fidélité n'a encore été émise.",
            ar: "إذا كانت القائمة فارغة فلم تُصدر أي بطاقة ولاء بعد."
          }
        },
        {
          sel: "#customerProfileModal",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Step 5 · The profile opens", fr: "Étape 5 · Le profil s'ouvre", ar: "الخطوة 5 · يُفتح الملف" },
          d: {
            en: "The profile window opens in front of you. A spinner appears first (« Chargement du profil… »), then the content loads: identity, statistics, preferences, brands, suggestions and the purchase history.",
            fr: "La fenêtre de profil s'ouvre devant vous. Un indicateur apparaît d'abord (« Chargement du profil… »), puis le contenu se charge : identité, statistiques, préférences, marques, suggestions et historique.",
            ar: "تنفتح نافذة الملف أمامك. يظهر مؤشر أولاً («جارٍ تحميل الملف…»)، ثم يُحمَّل المحتوى: الهوية، الإحصاءات، التفضيلات، الماركات، الاقتراحات وسجل المشتريات."
          }
        },
        {
          sel: "#cpHeader",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Identity card", fr: "Carte d'identité", ar: "بطاقة الهوية" },
          d: {
            en: "Top of the profile: the client's avatar (first letter of their name), full name, card number, phone and e-mail. The badge on the right shows their current loyalty points — 5 points = 1 free perfume.",
            fr: "En haut du profil : l'avatar du client (première lettre du nom), son nom complet, le n° de carte, le téléphone et l'e-mail. Le badge à droite indique ses points — 5 points = 1 parfum offert.",
            ar: "أعلى الملف: صورة العميل (الحرف الأول من الاسم)، الاسم الكامل، رقم البطاقة، الهاتف والبريد. الشارة يميناً توضح نقاطه — 5 نقاط = عطر مجاني."
          }
        },
        {
          sel: "#cpStats",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Quick statistics", fr: "Statistiques rapides", ar: "إحصاءات سريعة" },
          d: {
            en: "Four numbers summarise the client at a glance: recorded purchases, total amount spent, favourite fragrance family and favourite brand.",
            fr: "Quatre chiffres résument le client en un coup d'œil : achats enregistrés, montant total dépensé, famille olfactive et marque préférées.",
            ar: "أربعة أرقام تلخّص العميل في لمحة: المشتريات المسجلة، المبلغ المنفَق، العائلة العطرية والماركة المفضلة."
          }
        },
        {
          sel: "#cpPersonalityBody",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Personality & description", fr: "Personnalité & description", ar: "الشخصية والوصف" },
          d: {
            en: "A short text portrait generated from this client's purchases: the styles, occasions and keywords that fit their taste. Perfect for giving personal advice quickly.",
            fr: "Un portrait texte généré à partir des achats du client : styles, occasions et mots-clés qui correspondent à son goût. Parfait pour conseiller rapidement.",
            ar: "وصف نصي قصير يُولَّد من مشتريات العميل: الأنماط والمناسبات والكلمات المفتاحية المناسبة لذوقه. مثالي للنصح الشخصي بسرعة."
          }
        },
        {
          sel: "#cpFamilyBars",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Preferences", fr: "Préférences", ar: "التفضيلات" },
          d: {
            en: "One bar per fragrance family: the longer the bar, the more this client buys that family. It shows exactly what they love most.",
            fr: "Une barre par famille olfactive : plus la barre est longue, plus ce client achète cette famille. On voit d'un coup ce qu'il préfère.",
            ar: "شريط لكل عائلة عطرية: كلما طال الشريط زاد شراء العميل لهذه العائلة. يظهر بوضوح ما يحبه أكثر."
          }
        },
        {
          sel: "#cpBrandTags",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Favourite brands", fr: "Marques favorites", ar: "الماركات المفضلة" },
          d: {
            en: "The brands this client buys most often, each followed by how many times it appears in their history (e.g. ×3).",
            fr: "Les marques que ce client achète le plus, chacune suivie du nombre d'apparitions dans son historique (ex. ×3).",
            ar: "الماركات التي يشتريها العميل أكثر، تليها عدد مرات ظهورها في سجله (مثل ×3)."
          }
        },
        {
          sel: "#cpSuggestionGrid, #cpSimilarGrid",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Recommended fragrances", fr: "Parfums recommandés", ar: "عطور موصى بها" },
          d: {
            en: "Fragrances suggested for this client: bottles similar to the ones they already own, or alternatives when the catalogue has no close match. Handy for your next recommendation.",
            fr: "Parfums suggérés pour ce client : flacons similaires à ceux qu'il possède, ou alternatives quand le catalogue n'a pas de correspondance proche. Pratique pour votre prochaine recommandation.",
            ar: "عطور مقترحة لهذا العميل: زجاجات مشابهة لما يملكه، أو بدائل عندما لا يجد الكتالوج تطابقاً قريباً. مفيد لتوصيتك القادمة."
          }
        },
        {
          sel: "#cpPurchaseList",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Purchase history", fr: "Historique d'achats", ar: "سجل المشتريات" },
          d: {
            en: "Every recorded achat, newest first. Each entry shows the perfume, brand, price, date and notes. This history feeds all the statistics and suggestions above.",
            fr: "Chaque achat enregistré, du plus récent au plus ancien. Chaque entrée indique le parfum, la marque, le prix, la date et les notes. Cet historique alimente toutes les statistiques et suggestions ci-dessus.",
            ar: "كل عملية شراء مسجلة، الأحدث أولاً. يعرض كل سطر العطر والماركة والسعر والتاريخ والملاحظات. هذا السجل يغذي كل الإحصاءات والاقتراحات أعلاه."
          }
        },
        {
          sel: "#cpAddPurchaseBtn",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Add a purchase", fr: "Ajouter un achat", ar: "أضف شراءً" },
          d: {
            en: "When a client buys something, click the gold « + Ajouter un achat » button to record it. The next guide explains that recording flow step by step.",
            fr: "Quand un client achète, cliquez sur le bouton doré « + Ajouter un achat » pour l'enregistrer. Le guide suivant vous explique ce parcours étape par étape.",
            ar: "عندما يشتري العميل شيئاً، انقر الزر الذهبي «+ أضف شراءً» لتسجيله. الدليل التالي يشرح هذه العملية خطوة بخطوة."
          },
          hint: {
            en: "Nothing in a profile is edited directly — purchases are the base data that updates everything else.",
            fr: "Rien dans un profil ne se modifie directement — les achats sont les données de base qui mettent tout à jour.",
            ar: "لا شيء في الملف يُعدَّل مباشرة — المشتريات هي البيانات الأساسية التي تحدّث كل شيء آخر."
          }
        }
      ]
    },

    /* ---- Record a purchase (achat) ---- */
    {
      id: "add-achat",
      icon: ICON.receipt,
      title: { en: "Record a purchase (achat)", fr: "Enregistrer un achat", ar: "تسجيل عملية شراء" },
      desc: {
        en: "Add a past or in-store purchase to a client's profile — step by step — so their points, history and suggestions stay accurate.",
        fr: "Ajoutez un achat passé ou en boutique au profil d'un client — pas à pas — pour garder ses points, son historique et ses suggestions à jour.",
        ar: "أضف عملية شراء سابقة أو في المتجر إلى ملف العميل — خطوة بخطوة — لتبقى نقاطه وسجلاته واقتراحاته دقيقة."
      },
      steps: [
        {
          sel: "#loyaltyCardBtn",
          place: "left",
          opt: true,
          onShow: function () { showDropdown('#userDropdown'); },
          t: { en: "Step 1 · Open the loyalty desk", fr: "Étape 1 · Ouvrir l'espace fidélité", ar: "الخطوة 1 · افتح قسم الولاء" },
          d: {
            en: "Click your avatar, then « Carte Fidélité ». A purchase is always recorded from a client's profile, and profiles are reached from this loyalty window.",
            fr: "Cliquez sur votre avatar, puis « Carte Fidélité ». Un achat s'enregistre toujours depuis le profil d'un client, et les profils se rejoignent depuis cette fenêtre.",
            ar: "انقر صورتك ثم «بطاقة الولاء». يُسجل الشراء دائماً من ملف عميل، وتصل إلى الملفات من نافذة الولاء هذه."
          }
        },
        {
          sel: "#loyaltyModalTableBody",
          place: "top",
          opt: true,
          onShow: function () { openLoyalty(); },
          t: { en: "Step 2 · Pick the client", fr: "Étape 2 · Choisir le client", ar: "الخطوة 2 · اختر العميل" },
          d: {
            en: "Find the client who made the purchase: browse the list or type their name / phone in the search box above the table.",
            fr: "Retrouvez le client qui a acheté : parcourez la liste ou tapez son nom / téléphone dans la barre de recherche au-dessus du tableau.",
            ar: "اعثر على العميل الذي اشترى: تصفح القائمة أو اكتب اسمه / هاتفه في مربع البحث فوق الجدول."
          }
        },
        {
          sel: "#customerProfileModal, .btn-loyalty-profile",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Step 3 · Open the client's profile", fr: "Étape 3 · Ouvrir le profil", ar: "الخطوة 3 · افتح ملف العميل" },
          d: {
            en: "Click the gold « Profil » button at the end of the row. (In this tour an eligible client — one who already has purchases — opens automatically.) Wait until the profile loads — the purchase-history section appears at the bottom of the window.",
            fr: "Cliquez sur le bouton doré « Profil » à la fin de la ligne. (Dans ce parcours, un client éligible — qui a déjà des achats enregistrés — s'ouvre automatiquement.) Attendez que le profil se charge — la section historique apparaît en bas.",
            ar: "انقر الزر الذهبي «الملف» في نهاية الصف. (في هذا الدليل يُفتح عميل مؤهل — لديه مشتريات مسجلة — تلقائياً.) انتظر تحميل الملف — يظهر قسم سجل المشتريات أسفل النافذة."
          },
        },
        {
          sel: "#cpAddPurchaseBtn",
          place: "top",
          opt: true,
          onShow: function () { openFirstClientProfile(); },
          t: { en: "Step 4 · « + Ajouter un achat »", fr: "Étape 4 · « + Ajouter un achat »", ar: "الخطوة 4 · «+ أضف شراءً»" },
          d: {
            en: "In the « Historique des achats » section, at the right of the title, is the gold « + Ajouter un achat » button. Click it to open the recording form.",
            fr: "Dans la section « Historique des achats », à droite du titre, se trouve le bouton doré « + Ajouter un achat ». Cliquez-le pour ouvrir le formulaire.",
            ar: "في قسم «سجل المشتريات»، يمين العنوان، يوجد الزر الذهبي «+ أضف شراءً». انقر عليه لفتح نموذج التسجيل."
          },
          hint: {
            en: "This button only appears inside a client's profile window.",
            fr: "Ce bouton n'apparaît que dans la fenêtre de profil d'un client.",
            ar: "يظهر هذا الزر فقط داخل نافذة ملف عميل."
          }
        },
        {
          sel: "#recordPurchaseModal",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Step 5 · The record form", fr: "Étape 5 · Le formulaire", ar: "الخطوة 5 · نموذج التسجيل" },
          d: {
            en: "A form opens with the client's name at the top. It has 7 fields and a Save button, each explained in the following steps. Nothing is saved until you press « Enregistrer » at the bottom.",
            fr: "Un formulaire s'ouvre avec le nom du client en haut. Il compte 7 champs et un bouton Enregistrer, détaillés aux étapes suivantes. Rien n'est enregistré avant d'appuyer sur « Enregistrer » en bas.",
            ar: "يفتح نموذج باسم العميل في الأعلى. يحتوي 7 حقول وزر حفظ، وتفصّلها الخطوات القادمة. لا يُحفظ شيء قبل الضغط على «حفظ» بالأسفل."
          }
        },
        {
          sel: "#rpPerfumeName",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 1 · The perfume (required)", fr: "Champ 1 · Le parfum (obligatoire)", ar: "الحقل 1 · العطر (إلزامي)" },
          d: {
            en: "Click this box and start typing the perfume bought (for example « La Vie Est Belle »). Matching fragrances from the catalogue drop down below — click the correct one and the brand, family and audience fill in automatically.",
            fr: "Cliquez ici et tapez le nom du parfum acheté (par ex. « La Vie Est Belle »). Des correspondances du catalogue apparaissent en dessous — cliquez la bonne et la marque, la famille et le public se remplissent tout seuls.",
            ar: "انقر هنا وابدأ كتابة اسم العطر الذي اشتُري (مثلاً «La Vie Est Belle»). تظهر مطابقات من الكتالوج بالأسفل — انقر الصحيح فيمتلئ الماركة والعائلة والجمهور تلقائياً."
          },
          hint: {
            en: "A star (*) next to the label means the field is required — the form can't be saved without it.",
            fr: "Une étoile (*) près du label signifie champ obligatoire — impossible d'enregistrer sans lui.",
            ar: "النجمة (*) بجانب العنوان تعني حقل إلزامي — لا يمكن الحفظ بدونه."
          }
        },
        {
          sel: "#rpBrand",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 2 · Brand (auto-filled)", fr: "Champ 2 · Marque (auto)", ar: "الحقل 2 · الماركة (تلقائي)" },
          d: {
            en: "The brand fills in automatically when you pick a suggestion from the catalogue. You can also correct it manually if needed.",
            fr: "La marque se remplit automatiquement quand vous choisissez une suggestion du catalogue. Vous pouvez aussi la corriger à la main.",
            ar: "تمتلئ الماركة تلقائياً عند اختيار اقتراح من الكتالوج. يمكنك أيضاً تصحيحها يدوياً."
          }
        },
        {
          sel: "#rpFamily",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 3 · Scent family", fr: "Champ 3 · Famille olfactive", ar: "الحقل 3 · العائلة العطرية" },
          d: {
            en: "Opens a dropdown of fragrance families (Woody, Floral, Oriental…). Normally auto-selected from the catalogue — choose manually only if the perfume isn't in the catalogue.",
            fr: "Ouvre la liste des familles olfactives (Boisée, Florale, Orientale…). D'ordinaire auto-sélectionnée depuis le catalogue — choisissez à la main seulement si le parfum n'y figure pas.",
            ar: "يفتح قائمة العائلات العطرية (خشبية، زهرية، شرقية…). عادة تُختار تلقائياً من الكتالوج — اختر يدوياً فقط إذا لم يكن العطر موجوداً فيه."
          }
        },
        {
          sel: "#rpAudience",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 4 · Audience", fr: "Champ 4 · Public cible", ar: "الحقل 4 · الجمهور" },
          d: {
            en: "Choose Men (Homme), Women (Femme) or Unisex (Mixte). This helps the boutique suggest the right products to this client.",
            fr: "Choisissez Homme, Femme ou Mixte. Cela aide la boutique à suggérer les bons produits à ce client.",
            ar: "اختر رجل (Homme) أو امرأة (Femme) أو مشترك (Mixte). هذا يساعد البوتيك على اقتراح المنتجات الصحيحة للعميل."
          }
        },
        {
          sel: "#rpPrice",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 5 · Price (€)", fr: "Champ 5 · Prix (€)", ar: "الحقل 5 · السعر (€)" },
          d: {
            en: "Enter the amount paid, e.g. 85.50. It is added to the « total spent » shown on the client's profile.",
            fr: "Saisissez le montant payé, ex. 85.50. Il s'ajoute au « total dépensé » du profil client.",
            ar: "أدخل المبلغ المدفوع، مثل 85.50. يُضاف إلى «إجمالي المنصرف» في ملف العميل."
          }
        },
        {
          sel: "#rpDate",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 6 · Date", fr: "Champ 6 · Date", ar: "الحقل 6 · التاريخ" },
          d: {
            en: "Today's date is pre-filled. Pick another date to record a past purchase — the history stays accurate this way.",
            fr: "La date du jour est pré-remplie. Choisissez une autre date pour enregistrer un achat passé.",
            ar: "تاريخ اليوم مُعدّ مسبقاً. اختر تاريخاً آخر لتسجيل عملية شراء سابقة."
          }
        },
        {
          sel: "#rpNotes",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Field 7 · Notes (optional)", fr: "Champ 7 · Notes (optionnel)", ar: "الحقل 7 · ملاحظات (اختياري)" },
          d: {
            en: "Add a private reminder if useful — for example « offered as a gift » or « prefers this flanker ». Max 500 characters.",
            fr: "Ajoutez une note privée si utile — par ex. « offert en cadeau » ou « préfère cette déclinaison ». 500 caractères max.",
            ar: "أضف ملاحظة خاصة إذا كانت مفيدة — مثل «أُهدي كهدية» أو «يفضل هذه النسخة». الحد الأقصى 500 حرف."
          }
        },
        {
          sel: "#rpSaveBtn",
          place: "top",
          opt: true,
          onShow: function () { openRecordForm(); },
          t: { en: "Save the purchase", fr: "Enregistrer l'achat", ar: "حفظ الشراء" },
          d: {
            en: "Click « Enregistrer ». A success notification appears, the form closes, and the client's history, points and statistics refresh automatically.",
            fr: "Cliquez « Enregistrer ». Une notification de succès apparaît, le formulaire se ferme et l'historique, les points et les statistiques du client se rafraîchissent.",
            ar: "انقر «حفظ». تظهر رسالة نجاح ويُغلق النموذج وتُحدَّث تلقائياً سجلات العميل ونقاطه وإحصاءاته."
          },
          hint: {
            en: "Use « Annuler » to close the form without saving.",
            fr: "Utilisez « Annuler » pour fermer sans enregistrer.",
            ar: "استخدم «إلغاء» لإغلاق النموذج دون حفظ."
          }
        }
      ]
    },

    /* ---- Edit store hours ---- */
    {
      id: "store-hours",
      icon: ICON.clock,
      title: { en: "Edit store hours", fr: "Modifier les horaires", ar: "تعديل أوقات العمل" },
      desc: {
        en: "Set the opening and closing times shown on the homepage, plus the timezone and appointment note.",
        fr: "Définissez les horaires affichés sur la page d'accueil, ainsi que le fuseau et la note de rendez-vous.",
        ar: "حدد الأوقات المعروضة في الصفحة الرئيسية بالإضافة إلى المنطقة الزمنية وملاحظة المواعيد."
      },
      steps: [
        {
          sel: "#adminModal",
          place: "left",
          opt: true,
          t: { en: "Step 1 · Open the management console", fr: "Étape 1 · Ouvrir la console de gestion", ar: "الخطوة 1 · افتح وحدة الإدارة" },
          d: {
            en: "In your account menu, click « Admin Dashboard ». The store-hours section is the last one in the console.",
            fr: "Dans votre menu compte, cliquez « Admin Dashboard ». La section horaires est la dernière de la console.",
            ar: "في قائمة حسابك، انقر «لوحة الإدارة». قسم الأوقات هو الأخير في وحدة الإدارة."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#hoursAdminGrid",
          place: "top",
          opt: true,
          t: { en: "Step 2 · The 7-day grid", fr: "Étape 2 · Grille des 7 jours", ar: "الخطوة 2 · شبكة الأيام السبعة" },
          d: {
            en: "Tick « Fermé » for a day off, or set the opening and closing times for each weekday with the day's two time fields.",
            fr: "Cochez « Fermé » pour un jour de repos, ou réglez les heures d'ouverture et de fermeture de chaque jour dans les deux champs du jour.",
            ar: "علّم «مغلق» لليوم المغلق، أو اضبط أوقات الفتح والإغلاق لكل يوم في حقلَي اليوم."
          }
        },
        {
          sel: "#hoursResetBtn",
          place: "top",
          opt: true,
          t: { en: "Reset", fr: "Réinitialiser", ar: "إعادة الضبط" },
          d: {
            en: "Made a mess? « Reset » restores the default week in one click — you can start over.",
            fr: "Tout embrouillé ? « Reset » rétablit la semaine par défaut d'un clic — reprenez de zéro.",
            ar: "ارتكبت خطأ؟ «إعادة الضبط» يعيد الأسبوع الافتراضي بنقرة واحدة — ابدأ من جديد."
          }
        },
        {
          sel: "#hoursTzInput",
          place: "top",
          opt: true,
          t: { en: "Timezone note", fr: "Note de fuseau", ar: "ملاحظة المنطقة" },
          d: {
            en: "This line appears under the hours on the homepage footer. It's a plain text note — write whatever is useful for clients.",
            fr: "Cette ligne apparaît sous les horaires dans le pied de page. C'est un texte libre — écrivez ce qui est utile aux clients.",
            ar: "يظهر هذا السطر تحت الأوقات في تذييل الصفحة. نص حر — اكتب ما هو مفيد للعملاء."
          }
        },
        {
          sel: "#hoursApptInput",
          place: "top",
          opt: true,
          t: { en: "Appointment note", fr: "Note de rendez-vous", ar: "ملاحظة المواعيد" },
          d: {
            en: "e.g. « Appointments on request ». Also shown on the homepage footer.",
            fr: "ex. « Rendez-vous sur demande ». Affiché aussi dans le pied de page.",
            ar: "مثلاً «المواعيد عند الطلب». يُعرض أيضاً في تذييل الصفحة."
          }
        },
        {
          sel: "#hoursSaveBtn",
          place: "top",
          opt: true,
          t: { en: "Save", fr: "Enregistrer", ar: "حفظ" },
          d: {
            en: "Always press Save — the homepage card updates immediately so visitors see the new opening hours.",
            fr: "Appuyez toujours sur Enregistrer — la carte d'accueil se met à jour pour que les visiteurs voient les nouveaux horaires.",
            ar: "اضغط حفظ دائماً — تتحدث بطاقة الصفحة الرئيسية ليرى الزوار الأوقات الجديدة."
          },
          hint: {
            en: "Nothing is stored until you press this button.",
            fr: "Rien n'est enregistré avant d'appuyer ici.",
            ar: "لا يُحفظ شيء قبل الضغط على هذا الزر."
          }
        }
      ]
    },

    /* ---- Publish news ---- */
    {
      id: "news",
      icon: ICON.bell,
      title: { en: "Publish news", fr: "Publier une actualité", ar: "نشر خبر" },
      desc: {
        en: "Send an announcement to every visitor through the navbar bell.",
        fr: "Envoyez une annonce à chaque visiteur via la cloche de navigation.",
        ar: "أرسل إعلاناً إلى كل زائر عبر جرس الشريط العلوي."
      },
      steps: [
        {
          sel: "#adminModal",
          place: "left",
          opt: true,
          t: { en: "Step 1 · Open the management console", fr: "Étape 1 · Ouvrir la console de gestion", ar: "الخطوة 1 · افتح وحدة الإدارة" },
          d: {
            en: "In your account menu, click « Admin Dashboard ». This opens the management console — the news section is near the bottom.",
            fr: "Dans votre menu compte, cliquez « Admin Dashboard ». Cela ouvre la console de gestion — la section actualités se trouve vers le bas.",
            ar: "في قائمة حسابك، انقر «لوحة الإدارة». تفتح وحدة الإدارة — قسم الأخبار في الأسفل."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#newsAdminNewBtn",
          place: "top",
          opt: true,
          t: { en: "Step 2 · « + Nouvelle actualité »", fr: "Étape 2 · « + Nouvelle actualité »", ar: "الخطوة 2 · «+ خبر جديد»" },
          d: {
            en: "Scroll to the « News & Notifications » section and click the gold « + Nouvelle actualité » button. This opens the composer window.",
            fr: "Faites défiler jusqu'à la section « News & Notifications » et cliquez le bouton doré « + Nouvelle actualité ». La fenêtre de rédaction s'ouvre.",
            ar: "مرر إلى قسم «الأخبار والإشعارات» وانقر الزر الذهبي «+ خبر جديد». تُفتح نافذة الكتابة."
          }
        },
        {
          sel: "#newsComposerModal",
          place: "top",
          opt: true,
          onShow: function () { openNewsComposerGuide(); },
          t: { en: "Step 3 · The composer", fr: "Étape 3 · Le rédacteur", ar: "الخطوة 3 · المحرر" },
          d: {
            en: "The composer opens with 4 templates at the top (Promotion, New perfume, Event, Announcement). Clicking a template pre-fills the badge, icon and title for you.",
            fr: "Le rédacteur s'ouvre avec 4 modèles en haut (Promotion, Nouveau parfum, Événement, Annonce). Cliquer un modèle pré-remplit badge, icône et titre.",
            ar: "يفتح المحرر مع 4 قوالب في الأعلى (ترويج، عطر جديد، حدث، إعلان). النقر على قالب يملأ الوسم والأيقونة والعنوان تلقائياً."
          }
        },
        {
          sel: "#newsComposerTitle",
          place: "top",
          opt: true,
          onShow: function () { openNewsComposerGuide(); },
          t: { en: "Title (required)", fr: "Titre (obligatoire)", ar: "العنوان (إلزامي)" },
          d: {
            en: "The short headline visitors will read in the bell notification, e.g. « -30% sur toute la boutique ». Keep it under 120 characters.",
            fr: "Le titre court que les visiteurs liront dans la cloche, ex. « -30% sur toute la boutique ». Restez sous 120 caractères.",
            ar: "العنوان القصير الذي يقرؤه الزوار في جرس التنبيهات، مثل «-30% على كل المتجر». أقل من 120 حرفاً."
          }
        },
        {
          sel: "#newsComposerContent",
          place: "top",
          opt: true,
          onShow: function () { openNewsComposerGuide(); },
          t: { en: "Message body", fr: "Corps du message", ar: "نص الرسالة" },
          d: {
            en: "Describe the news in a few lines (max 1000 characters). A live preview updates beside you as you type.",
            fr: "Décrivez l'actualité en quelques lignes (1000 caractères max). Un aperçu se met à jour à côté pendant la saisie.",
            ar: "صف الخبر في سطور قليلة (1000 حرف كحد أقصى). يتحدَّث معاين حي بجانبك أثناء الكتابة."
          }
        },
        {
          sel: "#newsComposerPublish",
          place: "top",
          opt: true,
          onShow: function () { openNewsComposerGuide(); },
          t: { en: "Publish", fr: "Publier", ar: "نشر" },
          d: {
            en: "Click « Publier » to send the announcement. It then appears in the list, and every visitor sees it in the navbar bell.",
            fr: "Cliquez « Publier » pour envoyer l'annonce. Elle apparaît ensuite dans la liste et chaque visiteur la verra dans la cloche.",
            ar: "انقر «نشر» لإرسال الإعلان. يظهر بعدها في القائمة ويراه كل زائر في جرس الشريط العلوي."
          }
        },
        {
          sel: "#adminNewsList",
          place: "top",
          opt: true,
          onShow: function () { enterAdmin(); },
          t: { en: "Published news", fr: "Actualités publiées", ar: "الأخبار المنشورة" },
          d: {
            en: "Your post appears here once published. Use the same area later to review or delete announcements.",
            fr: "Votre post apparaît ici une fois publié. Utilisez cette zone plus tard pour relire ou supprimer des annonces.",
            ar: "يظهر منشورك هنا بعد النشر. استخدم نفس المنطقة لاحقاً لمراجعة الإعلانات أو حذفها."
          }
        }
      ]
    },

    /* ---- Ban / unban ---- */
    {
      id: "ban",
      icon: ICON.lock,
      title: { en: "Ban or unban a user", fr: "Bannir ou rétablir", ar: "حظر أو إلغاء حظر" },
      desc: {
        en: "Suspend a misbehaving account from the users table, or restore it later.",
        fr: "Suspendez un compte problématique depuis le tableau des utilisateurs, ou rétablissez-le plus tard.",
        ar: "علّق حساباً مخالفاً من جدول المستخدمين أو أعد تفعيله لاحقاً."
      },
      steps: [
        {
          sel: "#adminModal",
          place: "left",
          opt: true,
          t: { en: "Step 1 · Open the management console", fr: "Étape 1 · Ouvrir la console de gestion", ar: "الخطوة 1 · افتح وحدة الإدارة" },
          d: {
            en: "In your account menu, click « Admin Dashboard ». This guide is for handling problem accounts in the Users table.",
            fr: "Dans votre menu compte, cliquez « Admin Dashboard ». Ce guide sert à gérer les comptes problématiques dans le tableau des utilisateurs.",
            ar: "في قائمة حسابك، انقر «لوحة الإدارة». هذا الدليل للتعامل مع الحسابات المخالفة في جدول المستخدمين."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#usersTableBody",
          place: "top",
          opt: true,
          t: { en: "Step 2 · Find the account", fr: "Étape 2 · Retrouver le compte", ar: "الخطوة 2 · اعثر على الحساب" },
          d: {
            en: "Locate the account in the user management list. The Status column tells you if it's Active, Admin or Banned.",
            fr: "Localisez le compte dans la liste des utilisateurs. La colonne Statut indique s'il est Actif, Admin ou Banni.",
            ar: "حدد مكان الحساب في قائمة المستخدمين. عمود الحالة يوضح إن كان نشطاً أو إدارة أو محظوراً."
          }
        },
        {
          sel: "#usersTableBody .btn-ban",
          place: "top",
          opt: true,
          t: { en: "Step 3 · Ban / Unban", fr: "Étape 3 · Bannir / Rétablir", ar: "الخطوة 3 · حظر / إلغاء الحظر" },
          d: {
            en: "Each row's Actions column has a Ban button (or Unban for a banned account). Click it, confirm, and the status updates — the account is blocked from the site.",
            fr: "La colonne Actions de chaque ligne a un bouton Bannir (ou Rétablir pour un compte banni). Cliquez, confirmez et le statut se met à jour — le compte est bloqué du site.",
            ar: "عمود الإجراءات في كل صف يحتوي زر حظر (أو إلغاء حظر لحساب محظور). انقر وأكّد وتُحدَّث الحالة — يُحجب الحساب من الموقع."
          },
          hint: {
            en: "To restore access later, find the account again and click Unban.",
            fr: "Pour rétablir l'accès plus tard, retrouvez le compte et cliquez Rétablir.",
            ar: "لاستعادة الوصول لاحقاً، اعثر على الحساب مجدداً وانقر إلغاء الحظر."
          }
        }
      ]
    },

    /* ---- Guest notes & feedback ---- */
    {
      id: "guest-notes",
      icon: ICON.note,
      title: { en: "Guest notes & feedback", fr: "Notes et retours", ar: "ملاحظات وآراء" },
      desc: {
        en: "Read the private notes and feedback left by visitors or staff.",
        fr: "Lisez les notes privées et retours laissés par les visiteurs ou l'équipe.",
        ar: "اقرأ الملاحظات والآراء التي تركها الزوار أو الفريق."
      },
      steps: [
        {
          sel: "#guestNotesModal",
          place: "top",
          opt: true,
          onShow: function () {
            var b = document.getElementById("guestNotesBtn");
            if (b) { showEl(b); try { b.click(); } catch (e) {} }
          },
          t: { en: "Guest notes", fr: "Notes invités", ar: "ملاحظات الضيوف" },
          d: {
            en: "Open the guest notes panel: in your account menu (staff account), click « Guest Notes » — the « Leave a Note » messages visitors sent are stored here.",
            fr: "Ouvrez le panneau des notes invités : dans votre menu compte (compte personnel), cliquez « Guest Notes » — les messages « Leave a Note » envoyés par les visiteurs y sont stockés.",
            ar: "افتح لوحة ملاحظات الضيوف: في قائمة حسابك (حساب الطاقم)، انقر «ملاحظات الضيوف» — رسائل «اترك ملاحظة» التي أرسلها الزوار مخزنة هنا."
          }
        },
        {
          sel: "#guestNotesList",
          place: "top",
          opt: true,
          onShow: function () {
            var b = document.getElementById("guestNotesBtn");
            if (b) { try { b.click(); } catch (e) {} }
          },
          t: { en: "Notes window", fr: "Fenêtre notes", ar: "نافذة الملاحظات" },
          d: {
            en: "All feedback and notes are gathered here for the team.",
            fr: "Tous les retours et notes sont réunis ici.",
            ar: "تُجمع كل الآراء والملاحظات هنا."
          }
        }
      ]
    }
  ];

  /* ------------------------------------------------------------- elements */
  var els = null;
  var state = { guide: null, index: 0, active: false, lastRect: null, category: "all" };

  function buildDom() {
    if (els) return els;

    var launcher = document.createElement("div");
    launcher.className = "guides-modal";
    launcher.setAttribute("translate", "no");
    launcher.innerHTML =
      '<div class="guides-backdrop" data-guides-close></div>' +
      '<div class="guides-shell" role="dialog" aria-modal="true" aria-label="Guides">' +
      '  <div class="guides-head">' +
      '    <div class="guides-head__top">' +
      '      <div>' +
      '        <span class="guides-eyebrow" data-g="eyebrow"></span>' +
      '        <h2 class="guides-title" data-g="title"></h2>' +
      '        <p class="guides-sub" data-g="sub"></p>' +
      '      </div>' +
      '      <button class="guides-close" type="button" data-guides-close aria-label="Close">' +
      '        <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
      "      </button>" +
      '    </div>' +
      '    <nav class="guides-tabs" data-g="tabs" aria-label="Filter guides"></nav>' +
      "  </div>" +
      '  <div class="guides-body"><div class="guides-grid" data-g="grid"></div></div>' +
      "</div>";

    var spotlight = document.createElement("div");
    spotlight.className = "guide-spotlight is-hidden";

    var cursor = document.createElement("div");
    cursor.className = "guide-cursor";
    cursor.innerHTML =
      '<svg class="guide-cursor__arrow" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M5 2.5 L5 19.5 L10.2 14.6 L13.1 21.6 L15.9 20.4 L13 13.7 L20 13.2 Z" ' +
      'fill="#c9a24b" stroke="#7a5f1f" stroke-width="1" stroke-linejoin="round"/></svg>' +
      '<span class="guide-cursor__ring"></span>';

    var tip = document.createElement("div");
    tip.className = "guide-tip";
    tip.setAttribute("translate", "no");
    tip.innerHTML =
      '<span class="guide-tip__progress"></span>' +
      '<div class="guide-tip__step" data-g="step"></div>' +
      '<h3 class="guide-tip__title" data-g="steptitle"></h3>' +
      '<p class="guide-tip__text" data-g="steptext"></p>' +
      '<p class="guide-tip__hint" data-g="stephint" style="display:none"></p>' +
      '<div class="guide-tip__actions">' +
      '  <button type="button" class="guide-tip__skip" data-g="skip"></button>' +
      '  <div class="guide-tip__nav">' +
      '    <button type="button" class="guide-btn" data-g="back"></button>' +
      '    <button type="button" class="guide-btn guide-btn--primary" data-g="next"></button>' +
      "  </div>" +
      "</div>";

    var done = document.createElement("div");
    done.className = "guide-done";
    done.setAttribute("translate", "no");
    done.innerHTML =
      '<div class="guide-done__card">' +
      '  <div class="guide-done__mark">&#10003;</div>' +
      '  <h3 class="guide-done__title" data-g="donetitle"></h3>' +
      '  <p class="guide-done__text" data-g="donetext"></p>' +
      '  <div class="guide-done__actions">' +
      '    <button type="button" class="guide-btn" data-g="doneall"></button>' +
      '    <button type="button" class="guide-btn guide-btn--primary" data-g="donereplay"></button>' +
      "  </div>" +
      "</div>";

    document.body.appendChild(launcher);
    document.body.appendChild(spotlight);
    document.body.appendChild(cursor);
    document.body.appendChild(tip);
    document.body.appendChild(done);

    els = {
      launcher: launcher,
      spotlight: spotlight,
      cursor: cursor,
      tip: tip,
      done: done,
      grid: launcher.querySelector('[data-g="grid"]'),
      tabs: launcher.querySelector('[data-g="tabs"]'),
      step: tip.querySelector('[data-g="step"]'),
      stepTitle: tip.querySelector('[data-g="steptitle"]'),
      stepText: tip.querySelector('[data-g="steptext"]'),
      stepHint: tip.querySelector('[data-g="stephint"]'),
      progress: tip.querySelector(".guide-tip__progress"),
      btnBack: tip.querySelector('[data-g="back"]'),
      btnNext: tip.querySelector('[data-g="next"]'),
      btnSkip: tip.querySelector('[data-g="skip"]'),
      btnDoneAll: done.querySelector('[data-g="doneall"]'),
      btnDoneReplay: done.querySelector('[data-g="donereplay"]')
    };

    els.launcher.addEventListener("click", function (e) {
      if (e.target.closest("[data-guides-close]")) closeLauncher();
    });
    els.btnBack.addEventListener("click", function () { go(state.index - 1); });
    els.btnNext.addEventListener("click", function () { go(state.index + 1); });
    els.btnSkip.addEventListener("click", endTour);
    els.btnDoneAll.addEventListener("click", function () {
      els.done.classList.remove("is-open");
      openLauncher();
    });
    els.btnDoneReplay.addEventListener("click", function () {
      els.done.classList.remove("is-open");
      var id = state.guide && state.guide.id;
      if (id) startTour(id);
    });

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("keydown", onKey);

    return els;
  }

  function onKey(e) {
    if (!state.active) return;
    if (e.key === "Escape") { endTour(); return; }
    if (e.key === "ArrowRight" || e.key === "Enter") { go(state.index + 1); }
    if (e.key === "ArrowLeft") { go(state.index - 1); }
  }

  /* ------------------------------------------------------------- launcher */
  function renderLauncher() {
    buildDom();
    els.launcher.querySelector('[data-g="eyebrow"]').textContent = pick(UI.eyebrow);
    els.launcher.querySelector('[data-g="title"]').textContent = pick(UI.title);
    els.launcher.querySelector('[data-g="sub"]').textContent = pick(UI.sub);

    var counts = {};
    GUIDES.forEach(function (g) {
      var cat = CATEGORY[g.id] || "discovery";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    els.tabs.innerHTML = "";
    TAB_ORDER.forEach(function (key) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab-btn" + (key === state.category ? " active" : "");
      tab.textContent =
        pick(UI.tabs[key]) +
        " (" + (key === "all" ? GUIDES.length : counts[key] || 0) + ")";
      tab.addEventListener("click", function () {
        state.category = key;
        renderLauncher();
      });
      els.tabs.appendChild(tab);
    });

    els.grid.innerHTML = "";
    GUIDES.forEach(function (g) {
      var cat = CATEGORY[g.id] || "discovery";
      var card = document.createElement("button");
      card.type = "button";
      card.className = "guide-card";
      card.dataset.category = cat;
      if (cat === "discovery" && g.id === "profiler") card.classList.add("featured-ai");

      var pips = "";
      for (var i = 0; i < g.steps.length; i++) pips += '<span class="step-pip"></span>';

      card.innerHTML =
        '<span class="guide-card__head">' +
        '  <span class="guide-card__icon" aria-hidden="true">' + g.icon + "</span>" +
        (g.id === "profiler"
          ? '  <span class="ai-badge"></span>'
          : '  <span class="steps-tracker" aria-hidden="true">' + pips + "</span>") +
        "</span>" +
        '<span class="guide-card__title"></span>' +
        '<span class="guide-card__desc"></span>' +
        '<span class="guide-card__foot">' +
        '  <span class="guide-card__tag"></span>' +
        '  <span class="guide-card__go"></span>' +
        "</span>";
      card.querySelector(".guide-card__title").textContent = pick(g.title);
      card.querySelector(".guide-card__desc").textContent = pick(g.desc);
      card.querySelector(".guide-card__tag").textContent =
        g.steps.length + " " + pick(UI.steps);
      var go = card.querySelector(".guide-card__go");
      go.textContent = pick(UI.launch);
      go.insertAdjacentHTML(
        "beforeend",
        '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>'
      );
      if (g.id === "profiler") {
        card.querySelector(".ai-badge").textContent = pick(UI.featured);
      }
      card.style.display = state.category === "all" || cat === state.category ? "flex" : "none";
      card.addEventListener("click", function () {
        closeLauncher();
        startTour(g.id);
      });
      els.grid.appendChild(card);
    });
  }

  function openLauncher() {
    if (!isAdminUser()) return;
    renderLauncher();
    els.launcher.classList.add("is-open");
  }

  function closeLauncher() {
    if (els) els.launcher.classList.remove("is-open");
  }

  /* ----------------------------------------------------------------- tour */
  function startTour(id) {
    if (!isAdminUser()) return;
    var g = null;
    for (var i = 0; i < GUIDES.length; i++) if (GUIDES[i].id === id) g = GUIDES[i];
    if (!g) return;
    buildDom();
    state.guide = g;
    state.index = 0;
    state.active = true;
    document.documentElement.classList.add("guide-active");
    go(0);
  }

  /* Re-hide any panels the guide opened (marked guide-was-hidden).
     Restores the exact previous visibility: if the panel was hidden by an
     inline display:none we put it back; otherwise we re-add the .hidden class. */
  function cleanupOpenedPanels() {
    try {
      var opened = document.querySelectorAll(".guide-was-hidden");
      for (var i = 0; i < opened.length; i++) {
        var el = opened[i];
        if (el.dataset.guideVisSaved === "1") {
          /* we snapshotted the full visibility state - put it back exactly */
          if (el.dataset.guidePrevHidden === "1") el.classList.add("hidden");
          else el.classList.remove("hidden");
          el.style.display = el.dataset.guidePrevDisplay || "";
          el.style.visibility = el.dataset.guidePrevVisibility || "";
          el.style.opacity = el.dataset.guidePrevOpacity || "";
          try {
            delete el.dataset.guideVisSaved;
            delete el.dataset.guidePrevHidden;
            delete el.dataset.guidePrevDisplay;
            delete el.dataset.guidePrevVisibility;
          } catch (e) {
            el.dataset.guideVisSaved = "";
            el.dataset.guidePrevHidden = "";
            el.dataset.guidePrevDisplay = "";
            el.dataset.guidePrevVisibility = "";
          }
        } else if (el.dataset.guidePrevDisplay !== undefined) {
          /* older-style bookkeeping: only the inline display was saved */
          el.style.display = el.dataset.guidePrevDisplay;
          try { delete el.dataset.guidePrevDisplay; } catch (e) { el.dataset.guidePrevDisplay = ""; }
        } else {
          el.classList.add("hidden");
        }
        el.classList.remove("guide-was-hidden");
      }
      /* Put the catalogue back into the mode the user had before the tour. */
      if (modeBefore !== null) {
        try {
          var mb = document.querySelector('.perfume-mode-btn[data-mode="' + modeBefore + '"]');
          if (mb) mb.click();
        } catch (e) {}
        modeBefore = null;
      }

      /* The app's openers lock background scroll; release it when the tour ends. */
      document.body.style.overflow = "";
    } catch (e) {}
  }

  function endTour() {
    if (!els) return;
    state.active = false;
    document.documentElement.classList.remove("guide-active");
    els.spotlight.classList.add("is-hidden");
    els.tip.classList.remove("is-visible");
    els.cursor.classList.remove("is-visible");
    cleanupOpenedPanels();
  }

  function resolve(step) {
    if (!step.sel) return null;
    /* If the selector matches multiple elements, pick the first visible one. */
    var el = null;
    try {
      var list = document.querySelectorAll(step.sel);
      if (list.length === 0) return null;
      for (var i = 0; i < list.length; i++) {
        var r0 = list[i].getBoundingClientRect();
        var cs0 = getComputedStyle(list[i]);
        if (r0.width >= 2 && r0.height >= 2 && cs0.display !== "none" && cs0.visibility !== "hidden") {
          el = list[i];
          break;
        }
      }
      /* fall back to first match even if hidden (so non-opt steps still get reported) */
      if (!el) el = list[0];
    } catch (e) { return null; }
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    if (!r || (r.width < 2 && r.height < 2)) return null;
    if (cs && (cs.visibility === "hidden" || cs.display === "none")) return null;
    return el;
  }

  /* Open a modal/panel identified by a CSS selector. Used by onShow hooks.
     Handles BOTH ways the app hides things:
       - the .hidden class (display:none !important)
       - an inline style.display = "none" (admin dashboard, add-review containers)
     We remember the previous inline value so cleanupOpenedPanels() can restore it. */
  function openPanel(sel) {
    try {
      var el = document.querySelector(sel);
      if (!el) return;
      var changed = false;
      if (el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        changed = true;
      }
      if (el.style.display === "none") {
        el.dataset.guidePrevDisplay = el.style.display;
        el.style.display = "";
        changed = true;
      }
      if (changed) el.classList.add("guide-was-hidden");
    } catch (e) {}
  }

  /* Find the first visible element matching a selector (rect > 2px, not display:none). */
  function firstVisible(sel) {
    try {
      var list = document.querySelectorAll(sel);
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        var cs = getComputedStyle(list[i]);
        if (r.width >= 2 && r.height >= 2 && cs.display !== "none" && cs.visibility !== "hidden") {
          return list[i];
        }
      }
    } catch (e) {}
    return null;
  }

  /* Force-reveal a hover-controlled dropdown (e.g. #userDropdown is shown only on
     .user-profile:hover). The dropdown is hidden by VISIBILITY:hidden + opacity:0,
     NOT display:none — so setting display:block does nothing. We snapshot its state
     via rememberVis() then force visibility:visible and opacity:1 (with !important to
     beat the app's rules). cleanupOpenedPanels() restores the exact previous state, so
     the menu closes again once the tour ends. */
  function showDropdown(sel) {
    try {
      var el = document.querySelector(sel);
      if (!el) return;
      rememberVis(el);
      el.style.setProperty("visibility", "visible", "important");
      el.style.setProperty("opacity", "1", "important");
      if (!el.style.display || el.style.display === "none") el.style.display = "block";
    } catch (e) {}
  }

  /* Open the loyalty modal through the app's own opener, marking it so cleanup re-hides it. */
  function openLoyalty() {
    try {
      var m = document.getElementById("loyaltyModal");
      if (m) {
        m.dataset.guidePrevDisplay = m.style.display || "";
        m.classList.add("guide-was-hidden");
      }
      if (typeof window.openLoyaltyModal === "function") window.openLoyaltyModal();
    } catch (e) {}
  }

  /* The profile window is data-driven: several sections (personality, family
     bars, brand tags, suggestion grids) are only rendered when the client has
     at least one recorded purchase. If we open a client with no purchase these
     steps would never resolve, so we remember a "good" client (one that HAS
     purchase rows) and reopen that same client for every step of the tour. */
  var __goodCard = null;

  /* currentProfileCardId is a `let` top-level global (classic script), so it is
     reachable by bare identifier but NOT via window.currentProfileCardId. */
  function cpCardId() {
    try {
      if (typeof currentProfileCardId !== "undefined" && currentProfileCardId !== null) return currentProfileCardId;
    } catch (e) {}
    try { return window.currentProfileCardId || null; } catch (e) {}
    return null;
  }

  /* Open a client whose profile actually has data. If we already found one
     this session, reopen it directly. Otherwise open the loyalty desk, then
     probe candidate rows one by one until a client with purchases loads. */
  function openFirstClientProfile() {
    try {
      /* Already showing a loaded profile? Don't trigger another fetch/reload. */
      var ct0 = document.getElementById("customerProfileContent");
      if (cpCardId() && ct0 && getComputedStyle(ct0).display !== "none") return;
      if (__goodCard && typeof window.openCustomerProfile === "function") {
        window.openCustomerProfile(__goodCard.id, __goodCard.name);
        return;
      }
      openLoyalty();
      /* Prefer the app's in-memory loyalty list: when the server exposes a
         per-card purchaseCount we can pick the first client that HAS purchase
         rows in one step, without probing dozens of empty profiles. */
      var pickEligible = function () {
        try {
          if (typeof loyaltyCards !== "undefined" && window.Array && loyaltyCards.length) {
            for (var i = 0; i < loyaltyCards.length; i++) {
              if (loyaltyCards[i].cardId && loyaltyCards[i].purchaseCount > 0) {
                var c = loyaltyCards[i];
                __goodCard = { id: c.cardId, name: c.name || "" };
                window.openCustomerProfile(c.cardId, c.name || "");
                return true;
              }
            }
          }
        } catch (e) {}
        return false;
      };
      if (pickEligible()) return;
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        var btns = document.querySelectorAll("#loyaltyModal .btn-loyalty-profile, .btn-loyalty-profile");
        if (btns.length) {
          clearInterval(iv);
          if (!pickEligible()) tryDataClients([].slice.call(btns), 0);
        } else if (tries > 80) clearInterval(iv);
      }, 100);
    } catch (e) {}
  }

  /* True when the currently open profile shows at least one recorded purchase
     (the section that feeds every data-driven block of the profile window). */
  function hasProfileData() {
    try {
      return document.querySelectorAll("#cpPurchaseList .cp-purchase-table tbody tr").length > 0;
    } catch (e) { return false; }
  }

  /* Try each loyalty row as the profile client until one with purchases opens.
     On an empty client we close the profile and move to the next row. The first
     good client found is cached so later steps reopen it instantly. */
  function tryDataClients(btns, i) {
    try {
      if (i >= Math.min(40, btns.length)) {
        /* no client with purchases found - fall back to the first row */
        try { btns[0].click(); } catch (e) {}
        return;
      }
      var name = "";
      try {
        var row = btns[i].closest("tr");
        if (row && row.cells && row.cells[0]) {
          name = row.cells[0].textContent.replace(/Manuel|Banned/gi, "").replace(/\s+/g, " ").trim();
        }
      } catch (e) {}
      try { btns[i].click(); } catch (e) { tryDataClients(btns, i + 1); return; }
      var seenLoaded = false;
      var t2 = 0;
      var iv2 = setInterval(function () {
        t2++;
        var content = document.getElementById("customerProfileContent");
        var modal = document.getElementById("customerProfileModal");
        var loaded = content && getComputedStyle(content).display !== "none";
        var open = modal && !modal.classList.contains("hidden") &&
                   getComputedStyle(modal).display !== "none";
        if (!open) { if (t2 > 60) { clearInterval(iv2); setTimeout(function () { tryDataClients(btns, i + 1); }, 150); } return; }
        if (!loaded) { if (t2 > 80) { clearInterval(iv2); } return; }
        if (!seenLoaded) { seenLoaded = true; t2 = 0; }
        if (hasProfileData()) {
          __goodCard = { id: cpCardId(), name: name };
          clearInterval(iv2);
          return;
        }
        if (t2 > 8) {
          /* loaded but empty: close it and try the next client */
          clearInterval(iv2);
          try { closeCustomerProfile(); } catch (e) {}
          setTimeout(function () { tryDataClients(btns, i + 1); }, 150);
        }
      }, 100);
    } catch (e) {}
  }

  /* Open the record-purchase form inside a client's profile. Opens a data-rich
     profile first, then clicks the app's own « + Ajouter un achat » button once
     the profile (and its cardId) is ready. */
  function openRecordForm() {
    try {
      var rp = document.getElementById("recordPurchaseModal");
      if (rp && !rp.classList.contains("hidden")) return;
      openFirstClientProfile();
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        var b = document.getElementById("cpAddPurchaseBtn");
        if (b && cpCardId()) { try { b.click(); } catch (e) {} clearInterval(iv); }
        else if (tries > 100) clearInterval(iv);
      }, 150);
    } catch (e) {}
  }

  /* Open the admin console through the app's own opener. This reveals #adminModal and
     loads the users/loyalty/news/store-hours data, so every inner step becomes visible. */
  function enterAdmin() {
    try {
      var m = document.getElementById("adminModal");
      if (m) {
        m.dataset.guidePrevDisplay = m.style.display || "";
        m.classList.add("guide-was-hidden");
      }
      if (typeof window.openAdminDashboard === "function") window.openAdminDashboard();
      else {
        var b = document.getElementById("adminDashboard");
        if (b) b.click();
      }
    } catch (e) {}
  }

  /* Open the news composer through the app's own opener, remembering its
     visibility so the tour can re-hide it at the end (otherwise the composer
     would stay open once the guide finishes). */
  function openNewsComposerGuide() {
    try {
      var m = document.getElementById("newsComposerModal");
      if (m) rememberVis(m);
      var b = document.getElementById("newsAdminNewBtn");
      if (b) { try { b.click(); } catch (e) {} }
    } catch (e) {}
  }

  /* -------------------------------------------------- visibility bookkeeping
     The app hides things three different ways: the .hidden class, an inline
     display:none, AND (for several panels) visibility:hidden. openPanel() only
     handled the first two, so steps pointing at visibility:hidden panels could
     never resolve. These helpers snapshot an element's visibility before we
     touch it so cleanupOpenedPanels() can restore it exactly. */
  function rememberVis(el) {
    if (!el) return;
    if (el.dataset.guideVisSaved === "1") return; /* snapshot only once */
    el.dataset.guideVisSaved = "1";
    el.dataset.guidePrevHidden = el.classList.contains("hidden") ? "1" : "0";
    el.dataset.guidePrevDisplay = el.style.display || "";
    el.dataset.guidePrevOpacity = el.style.opacity || "";
    el.dataset.guidePrevVisibility = el.style.visibility || "";
    el.classList.add("guide-was-hidden");
  }

  /* Make an element visible, remembering how to undo every change.
     Removing .hidden / clearing an inline style is NOT always enough: several
     panels (e.g. .reviews-section) are hidden by a plain CSS display:none rule,
     and others (.floating-search, #ingredientModal) are hidden by an ANCESTOR
     with visibility:hidden (visibility inherits, so the child stays hidden even
     after we clear it on the child). We therefore also walk up the tree and
     clear visibility:hidden on any ancestor. */
  function showEl(el) {
    if (!el) return;
    rememberVis(el);
    el.classList.remove("hidden");
    if (el.style.display === "none") el.style.display = "";
    if (el.style.visibility === "hidden") el.style.visibility = "";
    /* clear visibility:hidden AND display:none on ancestors so the child can
       actually paint. Several target trees hide an ancestor instead of the
       element itself (e.g. a product section.content is display:none in grid
       mode, so its .reviews-section / .add-review-container child would stay
       0-sized even after we force those visible). We use !important so we beat
       the app's own class-based display:none rules. */
    try {
      var p = el.parentElement;
      while (p && p.nodeType === 1 && p !== document.body) {
        var pcs = getComputedStyle(p);
        if (pcs.visibility === "hidden") {
          rememberVis(p);
          p.style.setProperty("visibility", "visible", "important");
        }
        if (pcs.display === "none") {
          rememberVis(p);
          p.style.setProperty("display", "block", "important");
        }
        p = p.parentElement;
      }
    } catch (e) {}
    var cs = null;
    try { cs = getComputedStyle(el); } catch (e) {}
    if (cs) {
      if (cs.visibility === "hidden") el.style.setProperty("visibility", "visible", "important");
      if (cs.display === "none") el.style.setProperty("display", "block", "important");
    }
  }

  /* Hide an element, remembering how to undo it. */
  function hideEl(el) {
    if (!el) return;
    rememberVis(el);
    el.classList.add("hidden");
  }

  /* Reveal the first element matching a selector. */
  function reveal(sel) {
    try { showEl(document.querySelector(sel)); } catch (e) {}
  }

  /* The catalogue mode we switched away from, so the tour can put the site back
     the way the user had it instead of stranding them in details mode. */
  var modeBefore = null;

  /* Switch the catalogue between "grid" and "details" mode.
     In grid mode every section.content product page is display:none, so any step
     pointing inside a product (favourite, format, add-to-cart, reviews) can never
     resolve. Those steps must run in details mode; grid-only steps the reverse. */
  function ensureMode(mode) {
    try {
      var isGrid = document.body.classList.contains("perfume-grid-mode");
      if (isGrid === (mode === "grid")) return;
      if (modeBefore === null) modeBefore = isGrid ? "grid" : "details";
      var btn = document.querySelector('.perfume-mode-btn[data-mode="' + mode + '"]');
      if (btn) btn.click();
    } catch (e) {}
  }

  /* Open the cart so its summary (checkout / clear buttons, quantity controls)
     is actually on screen. */
  function openCart() {
    try {
      if (typeof window.openCart === "function") window.openCart();
      else {
        var icon = document.getElementById("navbarCartIcon");
        if (icon) icon.click();
      }
      reveal("#cartModal");
      reveal("#cartSummary");
    } catch (e) {}
  }

  /* The floating search button is hidden via the .floating-search rule
     (visibility:hidden; opacity:0) and only revealed by the app adding the
     .visible class once the user scrolls. We add that class directly. */
  function showFloatingSearch() {
    var el = document.getElementById("floatingSearch");
    if (el) {
      el.classList.add("visible");
      el.style.visibility = "visible";
      el.style.opacity = "1";
      reveal("#floatingSearch");
    }
  }

  /* "Browse everything" lives inside the ingredient search modal, which the app
     keeps visibility:hidden until it is opened. */
  function openIngredientSearch() {
    reveal("#ingredientModal");
  }

  /* Reviews: switch to details mode (product sections are display:none in grid
     mode), open the first perfume's detail, then force its .reviews-section and
     .add-review-container visible so the guide can highlight the review form. */
  function openReviewForm() {
    try {
      ensureMode("details");
      var card = document.querySelector(".perfume-grid-card");
      if (card && card.getAttribute("data-target")) {
        try { location.hash = "#" + card.getAttribute("data-target"); } catch (e) {}
      }
      /* .reviews-section is display:none by default (behind a tab); force it on. */
      var sec = document.querySelector(".reviews-section");
      showEl(sec);
      var add = document.querySelector(".add-review-container");
      showEl(add);
      /* also reveal any parent of the form that might still be collapsed */
      if (add && add.parentElement) showEl(add.parentElement);
      /* activate a reviews tab if the product UI uses one */
      var tab = document.querySelector('[data-tab="reviews"], .tab-reviews, .reviews-tab');
      if (tab) { try { tab.click(); } catch (e) {} }
    } catch (e) {}
  }

  /* Scent Profiler: the modal has three internal states (welcome -> question ->
     results). Open it and advance to the state a step wants to highlight. */
  function profilerOpen() {
    try { openPanel("#scent-profiler-modal"); reveal("#scent-profiler-modal"); } catch (e) {}
  }
  function profilerToQuestion() {
    try {
      profilerOpen();
      var q = document.getElementById("spQuestion");
      if (q && q.classList.contains("hidden")) {
        var start = document.getElementById("spStartBtn");
        if (start) start.click();
      }
    } catch (e) {}
  }
  function profilerToResults() {
    try {
      profilerOpen();
      var res = document.getElementById("spResults");
      if (!res) return;
      showEl(res);
      hideEl(document.getElementById("spWelcome"));
      hideEl(document.getElementById("spQuestion"));
    } catch (e) {}
  }

  /* Poll resolve() for a short while — async panels (customer profile, record
     purchase form, review form) only populate their inner elements after a
     fetch, so a step that is unresolvable synchronously may become resolvable
     a moment later. */
  function pollResolve(step, cb, timeout) {
    timeout = timeout || 5000;
    var startT = Date.now();
    (function tick() {
      var el = null;
      try { el = resolve(step); } catch (e) {}
      if (el) { cb(el); return; }
      if (Date.now() - startT > timeout) { cb(null); return; }
      setTimeout(tick, 120);
    })();
  }

  function showStep(i, step, el) {
    var g = state.guide;
    if (!g) return;
    state.index = i;
    renderTip(step, i, g, !!el);
    if (el) {
      try {
        if (typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      } catch (e) {}
      state.lastRect = el;
      /* let the smooth scroll settle before measuring */
      setTimeout(function () { highlight(el); }, 260);
    } else {
      state.lastRect = null;
      els.spotlight.classList.add("is-hidden");
      els.cursor.classList.remove("is-visible");
      centerTip();
    }
  }

  /* Skip ahead to the first later step that resolves (running each candidate's
     onShow first so it can open its panel). Async panels are poll-awaited. */
  function skipToNext(i) {
    var g = state.guide;
    if (!g) { finish(); return; }
    var next = i + 1;
    (function advance() {
      if (next >= g.steps.length) { finish(); return; }
      var cand = g.steps[next];
      if (typeof cand.onShow === "function") {
        try { cand.onShow(); } catch (e) {}
      }
      var el = resolve(cand);
      if (el) { go(next); return; }
      pollResolve(cand, function (found) {
        if (found) { go(next); return; }
        next++;
        advance();
      });
    })();
  }

  function go(i) {
    var g = state.guide;
    if (!g) return;

    if (i >= g.steps.length) { finish(); return; }
    if (i < 0) return;

    var step = g.steps[i];

    /* Track the current step index from the very start, even when the step is
       not resolvable yet: otherwise the Next button keeps retrying step `i`
       while state.index points to the previous resolved step, freezing the
       tour until the target eventually appears. */
    state.index = i;

    /* Run an onShow hook BEFORE resolving — lets the guide open a panel/modal
       so that its internal elements become visible for highlighting. */
    if (typeof step.onShow === "function") {
      try { step.onShow(); } catch (e) {}
    }

    var el = resolve(step);
    if (el) { showStep(i, step, el); return; }

    /* Not resolvable yet. Show the tip immediately (centered) so the user sees
       progress, then poll briefly — the target may appear once an async panel
       (customer profile, record-purchase form, review form) finishes loading. */
    renderTip(step, i, g, false);
    centerTip();
    pollResolve(step, function (found) {
      if (found) { showStep(i, step, found); return; }
      if (step.opt) { skipToNext(i); return; }
      /* non-optional and still missing: leave the tip centered (missing target). */
      renderTip(step, i, g, false);
      centerTip();
    });
  }

  function highlight(el) {
    var r = el.getBoundingClientRect();
    var pad = 8;
    els.spotlight.style.top = r.top - pad + "px";
    els.spotlight.style.left = r.left - pad + "px";
    els.spotlight.style.width = r.width + pad * 2 + "px";
    els.spotlight.style.height = r.height + pad * 2 + "px";
    els.spotlight.classList.remove("is-hidden");

    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    els.cursor.style.transform = "translate(" + cx + "px," + cy + "px)";
    els.cursor.classList.add("is-visible");

    placeTip(r);
  }

  function placeTip(r) {
    var t = els.tip;
    var tw = t.offsetWidth || 360;
    var th = t.offsetHeight || 200;
    var gap = 16;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var left = r.left + r.width / 2 - tw / 2;
    var top = r.bottom + gap;

    if (top + th > vh - 12) {
      top = r.top - th - gap;
      if (top < 12) {
        top = Math.max(12, Math.min(r.top, vh - th - 12));
        left = r.right + gap;
        if (left + tw > vw - 12) left = Math.max(12, r.left - tw - gap);
      }
    }
    left = Math.max(12, Math.min(left, vw - tw - 12));
    top = Math.max(12, Math.min(top, vh - th - 12));

    t.style.left = left + "px";
    t.style.top = top + "px";
    t.classList.add("is-visible");
  }

  function centerTip() {
    var t = els.tip;
    var tw = t.offsetWidth || 360;
    var th = t.offsetHeight || 200;
    t.style.left = Math.max(12, (window.innerWidth - tw) / 2) + "px";
    t.style.top = Math.max(12, (window.innerHeight - th) / 2) + "px";
    t.classList.add("is-visible");
  }

  function renderTip(step, i, g, found) {
    els.step.textContent = pick(UI.stepOf)(i + 1, g.steps.length);
    els.stepTitle.textContent = pick(step.t);
    els.stepText.textContent = found ? pick(step.d) : pick(UI.missing);
    if (step.hint) {
      els.stepHint.textContent = pick(step.hint);
      els.stepHint.style.display = "";
    } else {
      els.stepHint.style.display = "none";
    }
    els.progress.style.width = ((i + 1) / g.steps.length) * 100 + "%";

    els.btnBack.textContent = pick(UI.back);
    els.btnNext.textContent = i === g.steps.length - 1 ? pick(UI.finish) : pick(UI.next);
    els.btnSkip.textContent = pick(UI.skip);
    els.btnBack.disabled = i === 0;
  }

  function finish() {
    els.spotlight.classList.add("is-hidden");
    els.tip.classList.remove("is-visible");
    els.cursor.classList.remove("is-visible");
    document.documentElement.classList.remove("guide-active");
    state.active = false;
    cleanupOpenedPanels();
    els.done.querySelector('[data-g="donetitle"]').textContent = pick(UI.doneTitle);
    els.done.querySelector('[data-g="donetext"]').textContent = pick(UI.doneText);
    els.btnDoneAll.textContent = pick(UI.allGuides);
    els.btnDoneReplay.textContent = pick(UI.again);
    els.done.classList.add("is-open");
  }

  function reposition() {
    if (!state.active || !state.lastRect) return;
    if (!document.body.contains(state.lastRect)) return;
    highlight(state.lastRect);
  }

  /* ------------------------------------------------------------ public API */
  window.Guides = {
    open: openLauncher,
    close: closeLauncher,
    start: startTour,
    stop: endTour,
    isActive: function () { return state.active; },
    isAdmin: function () { return isAdminUser(); },
    currentStep: function () {
      if (!state.guide) return null;
      var s = state.guide.steps[state.index];
      if (!s) return null;
      return { sel: s.sel, opt: !!s.opt, title: (s.t && (s.t.en || s.t.fr || s.t.ar)) || null };
    },
    /* Diagnostic: for guide `id`, run each step's onShow (if any) then report
       whether resolve() finds a visible element and its box. Does NOT start a
       tour; restores panels/mode after each step. */
    probe: function (id) {
      var g = null;
      for (var i = 0; i < GUIDES.length; i++) if (GUIDES[i].id === id) g = GUIDES[i];
      if (!g) return [];
      var out = [];
      for (var i = 0; i < g.steps.length; i++) {
        var step = g.steps[i];
        if (typeof step.onShow === "function") { try { step.onShow(); } catch (e) {} }
        var el = resolve(step);
        var rect = null;
        if (el) { var r = el.getBoundingClientRect(); rect = { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; }
        out.push({ i: i, sel: step.sel, opt: !!step.opt, resolved: !!el, rect: rect });
        cleanupOpenedPanels();
      }
      return out;
    }
  };

  /* wire anything carrying data-guide-open / #guidesBtn */
  function wire() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-guide-open], #guidesBtn") : null;
      if (!t) return;
      e.preventDefault();
      var id = t.getAttribute("data-guide-open");
      if (id) startTour(id);
      else openLauncher();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
