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
    eyebrow: { en: "Parfumerie Charme", fr: "Parfumerie Charme", ar: "بارفومري شارم" },
    title: { en: "Guides", fr: "Guides", ar: "الأدلة" },
    sub: {
      en: "Pick a guide and a cursor will walk you through it, step by step.",
      fr: "Choisissez un guide et un curseur vous accompagnera, étape par étape.",
      ar: "اختر دليلاً وسيقوم المؤشر بمرافقتك خطوة بخطوة."
    },
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
            en: "This entry appears once your account is linked to a loyalty card.",
            fr: "Cette entrée apparaît une fois votre compte lié à une carte fidélité.",
            ar: "يظهر هذا الخيار بعد ربط حسابك ببطاقة ولاء."
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
          t: { en: "Open the dashboard", fr: "Ouvrir le tableau de bord", ar: "فتح لوحة التحكم" },
          d: {
            en: "Visible only to administrator accounts. It opens the management console.",
            fr: "Visible uniquement pour les comptes administrateurs. Elle ouvre la console de gestion.",
            ar: "تظهر لحسابات الإدارة فقط. تفتح لوحة التحكم."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#usersTableBody",
          place: "top",
          opt: true,
          t: { en: "Users", fr: "Utilisateurs", ar: "المستخدمون" },
          d: {
            en: "Search, review and ban accounts from here.",
            fr: "Recherchez, consultez et bloquez des comptes depuis ici.",
            ar: "ابحث عن الحسابات وراجعها واحظرها من هنا."
          }
        },
        {
          sel: "#hoursAdminGrid",
          place: "top",
          opt: true,
          t: { en: "Store hours", fr: "Horaires", ar: "أوقات العمل" },
          d: {
            en: "Set opening and closing times for each day. Tick 'Closed' for days the boutique is shut.",
            fr: "Définissez les heures d'ouverture et de fermeture pour chaque jour. Cochez « Fermé » pour les jours de repos.",
            ar: "حدد أوقات الفتح والإغلاق لكل يوم. علّم «مغلق» لأيام العطلة."
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
            en: "Publish an announcement and it reaches every visitor through the navbar bell.",
            fr: "Publiez une annonce et elle atteindra chaque visiteur via la cloche de navigation.",
            ar: "انشر إعلاناً وسيصل إلى كل زائر عبر جرس الشريط العلوي."
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
        en: "Open any customer's profile from the admin dashboard to read their taste, history and tailored suggestions.",
        fr: "Ouvrez le profil de n'importe quel client depuis le tableau de bord pour lire son goût, son historique et ses suggestions.",
        ar: "افتح ملف أي عميل من لوحة التحكم لقراءة ذوقه وتاريخه واقتراحاته المخصّصة."
      },
      steps: [
        {
          sel: "#adminModal",
          place: "left",
          opt: true,
          t: { en: "Admin dashboard", fr: "Tableau de bord", ar: "لوحة التحكم" },
          d: {
            en: "Open the management console from the admin entry in your account menu.",
            fr: "Ouvrez la console de gestion depuis l'entrée admin de votre menu compte.",
            ar: "افتح وحدة الإدارة من خانة المشرف في قائمة حسابك."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#usersTableBody",
          place: "top",
          opt: true,
          t: { en: "Users table", fr: "Table des utilisateurs", ar: "جدول المستخدمين" },
          d: {
            en: "Click any row to open that client's full profile.",
            fr: "Cliquez sur une ligne pour ouvrir le profil complet de ce client.",
            ar: "انقر أي صف لفتح ملف العميل الكامل."
          }
        },
        {
          sel: "#customerProfileModal",
          place: "top",
          opt: true,
          t: { en: "Profile window", fr: "Fenêtre profil", ar: "نافذة الملف" },
          d: {
            en: "The profile opens here with the client's identity and avatar.",
            fr: "Le profil s'ouvre ici avec l'identité et l'avatar du client.",
            ar: "يُفتح الملف هنا بهوية العميل وصورته."
          },
          onShow: function () { openFirstClientProfile(); }
        },
        {
          sel: "#cpHeader",
          place: "top",
          opt: true,
          t: { en: "Identity", fr: "Identité", ar: "الهوية" },
          d: {
            en: "Name, avatar and quick facts about the client.",
            fr: "Nom, avatar et informations rapides sur le client.",
            ar: "الاسم والصورة وملخص سريع عن العميل."
          }
        },
        {
          sel: "#cpStats",
          place: "top",
          opt: true,
          t: { en: "Stats", fr: "Statistiques", ar: "الإحصاءات" },
          d: {
            en: "Purchases, points and engagement at a glance.",
            fr: "Achats, points et engagement en un coup d'œil.",
            ar: "المشتريات والنقاط والتفاعل في لمحة."
          }
        },
        {
          sel: "#cpSuggestionGrid",
          place: "top",
          opt: true,
          t: { en: "Tailored suggestions", fr: "Suggestions adaptées", ar: "اقتراحات مخصّصة" },
          d: {
            en: "Fragrances recommended from this client's taste profile.",
            fr: "Parfums recommandés à partir du profil de goût du client.",
            ar: "عطور موصى بها بناءً على ملف ذوق العميل."
          }
        },
        {
          sel: "#cpPurchaseList",
          place: "top",
          opt: true,
          t: { en: "Purchase history", fr: "Historique d'achats", ar: "سجل المشتريات" },
          d: {
            en: "Every recorded achat for this client, newest first.",
            fr: "Chaque achat enregistré pour ce client, du plus récent au plus ancien.",
            ar: "كل عملية شراء مسجّلة لهذا العميل، الأحدث أولاً."
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
        en: "Add a past or in-store purchase to a client's profile so their history and suggestions stay accurate.",
        fr: "Ajoutez un achat passé ou en boutique au profil d'un client pour garder son historique et ses suggestions à jour.",
        ar: "أضف عملية شراء سابقة أو في المتجر إلى ملف العميل لتبقى سجلاته واقتراحاته دقيقة."
      },
      steps: [
        {
          sel: "#adminModal",
          place: "left",
          opt: true,
          t: { en: "Admin dashboard", fr: "Tableau de bord", ar: "لوحة التحكم" },
          d: {
            en: "Open the management console.",
            fr: "Ouvrez la console de gestion.",
            ar: "افتح وحدة الإدارة."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#usersTableBody",
          place: "top",
          opt: true,
          t: { en: "Open a client", fr: "Ouvrir un client", ar: "افتح ملف عميل" },
          d: {
            en: "Click a user row to open their profile.",
            fr: "Cliquez une ligne utilisateur pour ouvrir son profil.",
            ar: "انقر صف مستخدم لفتح ملفه."
          }
        },
        {
          sel: "#customerProfileModal",
          place: "top",
          opt: true,
          t: { en: "Client profile", fr: "Profil client", ar: "ملف العميل" },
          d: {
            en: "You land on the client's profile.",
            fr: "Vous arrivez sur le profil du client.",
            ar: "تصل إلى ملف العميل."
          },
          onShow: function () { openFirstClientProfile(); }
        },
        {
          sel: "#cpAddPurchaseBtn",
          place: "top",
          opt: true,
          onShow: function () {
            var b = document.getElementById("cpAddPurchaseBtn");
            if (b) { try { b.click(); } catch (e) {} }
          },
          t: { en: "Add a purchase", fr: "Ajouter un achat", ar: "أضف شراءً" },
          d: {
            en: "Tap “+ Ajouter un achat” in the purchase section.",
            fr: "Appuyez sur « + Ajouter un achat » dans la section achats.",
            ar: "اضغط «+ إضافة شراء» في قسم المشتريات."
          }
        },
        {
          sel: "#recordPurchaseModal",
          place: "top",
          opt: true,
          t: { en: "Record form", fr: "Formulaire", ar: "نموذج التسجيل" },
          d: {
            en: "A form opens to capture the purchase.",
            fr: "Un formulaire s'ouvre pour saisir l'achat.",
            ar: "يُفتح نموذج لتسجيل الشراء."
          },
          onShow: function () { openPanel("#recordPurchaseModal"); }
        },
        {
          sel: "#rpPerfumeName",
          place: "top",
          opt: true,
          t: { en: "Fragrance name", fr: "Nom du parfum", ar: "اسم العطر" },
          d: {
            en: "Start typing — the catalogue suggests matches as you go.",
            fr: "Tapez — le catalogue propose des correspondances.",
            ar: "ابدأ الكتابة — يقترح الكتالوج مطابقات."
          }
        },
        {
          sel: "#rpPrice",
          place: "top",
          opt: true,
          t: { en: "Price", fr: "Prix", ar: "السعر" },
          d: {
            en: "Enter the amount paid.",
            fr: "Saisissez le montant payé.",
            ar: "أدخل المبلغ المدفوع."
          }
        },
        {
          sel: "#rpSaveBtn",
          place: "top",
          opt: true,
          t: { en: "Save", fr: "Enregistrer", ar: "حفظ" },
          d: {
            en: "Save and the achat appears in the client's purchase history.",
            fr: "Enregistrez et l'achat apparaît dans l'historique.",
            ar: "احفظ فيظهر الشراء في سجل المشتريات."
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
          t: { en: "Admin dashboard", fr: "Tableau de bord", ar: "لوحة التحكم" },
          d: {
            en: "Open the management console.",
            fr: "Ouvrez la console de gestion.",
            ar: "افتح وحدة الإدارة."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#hoursAdminGrid",
          place: "top",
          opt: true,
          t: { en: "The 7-day grid", fr: "Grille des 7 jours", ar: "شبكة الأيام السبعة" },
          d: {
            en: "Tick “Closed” for a day off, or set opening and closing times for each weekday.",
            fr: "Cochez « Fermé » pour un jour de repos, ou réglez les heures pour chaque jour.",
            ar: "علّم «مغلق» لليوم المغلق، أو اضبط الأوقات لكل يوم."
          }
        },
        {
          sel: "#hoursTzInput",
          place: "top",
          opt: true,
          t: { en: "Timezone note", fr: "Note de fuseau", ar: "ملاحظة المنطقة" },
          d: {
            en: "This line appears under the hours on the homepage footer.",
            fr: "Cette ligne apparaît sous les horaires dans le pied de page.",
            ar: "يظهر هذا السطر تحت الأوقات في تذييل الصفحة."
          }
        },
        {
          sel: "#hoursApptInput",
          place: "top",
          opt: true,
          t: { en: "Appointment note", fr: "Note de rendez-vous", ar: "ملاحظة المواعيد" },
          d: {
            en: "e.g. “Appointments on request”.",
            fr: "ex. « Rendez-vous sur demande ».",
            ar: "مثلاً «المواعيد عند الطلب»."
          }
        },
        {
          sel: "#hoursSaveBtn",
          place: "top",
          opt: true,
          t: { en: "Save", fr: "Enregistrer", ar: "حفظ" },
          d: {
            en: "Always press Save — the homepage card updates immediately.",
            fr: "Appuyez toujours sur Enregistrer — la carte d'accueil se met à jour.",
            ar: "اضغط حفظ دائماً — تتحدث بطاقة الصفحة الرئيسية."
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
          t: { en: "Admin dashboard", fr: "Tableau de bord", ar: "لوحة التحكم" },
          d: {
            en: "Open the management console.",
            fr: "Ouvrez la console de gestion.",
            ar: "افتح وحدة الإدارة."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#newsAdminNewBtn",
          place: "top",
          opt: true,
          t: { en: "New announcement", fr: "Nouvelle actualité", ar: "إعلان جديد" },
          d: {
            en: "Click “+ Nouvelle actualité” to compose a post.",
            fr: "Cliquez « + Nouvelle actualité » pour composer.",
            ar: "انقر «+ فعل جديد» لكتابة منشور."
          }
        },
        {
          sel: "#adminNewsList",
          place: "top",
          opt: true,
          t: { en: "Published news", fr: "Actualités publiées", ar: "الأخبار المنشورة" },
          d: {
            en: "Your post appears here and in the navbar bell for all visitors.",
            fr: "Votre post apparaît ici et dans la cloche pour tous.",
            ar: "يظهر منشورك هنا وفي الجرس لكل الزوار."
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
          t: { en: "Admin dashboard", fr: "Tableau de bord", ar: "لوحة التحكم" },
          d: {
            en: "Open the management console.",
            fr: "Ouvrez la console de gestion.",
            ar: "افتح وحدة الإدارة."
          },
          onShow: function () { enterAdmin(); }
        },
        {
          sel: "#usersTableBody",
          place: "top",
          opt: true,
          t: { en: "Users table", fr: "Table des utilisateurs", ar: "جدول المستخدمين" },
          d: {
            en: "Find the account in the user management list.",
            fr: "Trouvez le compte dans la liste des utilisateurs.",
            ar: "ابحث عن الحساب في قائمة المستخدمين."
          }
        },
        {
          sel: "#usersTableBody .btn-ban",
          place: "top",
          opt: true,
          t: { en: "Ban / Unban", fr: "Bannir / Rétablir", ar: "حظر / إلغاء حظر" },
          d: {
            en: "Each row's Actions has a Ban (or Unban) button. Confirm and the status updates.",
            fr: "Chaque ligne a un bouton Bannir (ou Rétablir). Confirmez pour mettre à jour.",
            ar: "كل صف له زر حظر (أو إلغاء حظر). أكّد للتحديث."
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
            en: "Open the guest notes panel from your account menu.",
            fr: "Ouvrez le panneau depuis votre menu compte.",
            ar: "افتح اللوحة من قائمة حسابك."
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
          },
          onShow: function () { openPanel("#guestNotesModal"); }
        }
      ]
    }
  ];

  /* ------------------------------------------------------------- elements */
  var els = null;
  var state = { guide: null, index: 0, active: false, lastRect: null };

  function buildDom() {
    if (els) return els;

    var launcher = document.createElement("div");
    launcher.className = "guides-modal";
    launcher.setAttribute("translate", "no");
    launcher.innerHTML =
      '<div class="guides-backdrop" data-guides-close></div>' +
      '<div class="guides-shell" role="dialog" aria-modal="true" aria-label="Guides">' +
      '  <div class="guides-head">' +
      '    <div>' +
      '      <span class="guides-eyebrow" data-g="eyebrow"></span>' +
      '      <h2 class="guides-title" data-g="title"></h2>' +
      '      <p class="guides-sub" data-g="sub"></p>' +
      '    </div>' +
      '    <button class="guides-close" type="button" data-guides-close aria-label="Close">&times;</button>' +
      '  </div>' +
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

    els.grid.innerHTML = "";
    GUIDES.forEach(function (g) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "guide-card";
      card.innerHTML =
        '<span class="guide-card__icon" aria-hidden="true">' + g.icon + "</span>" +
        '<span class="guide-card__title"></span>' +
        '<span class="guide-card__desc"></span>' +
        '<span class="guide-card__meta"></span>';
      card.querySelector(".guide-card__title").textContent = pick(g.title);
      card.querySelector(".guide-card__desc").textContent = pick(g.desc);
      card.querySelector(".guide-card__meta").textContent =
        g.steps.length + " " + pick(UI.steps);
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

  /* Open the first loyalty client's profile (the customer-profile modal). The
     loyalty modal renders client cards with a .btn-loyalty-profile button that
     calls openCustomerProfile(cardId); we click the first one once it exists. */
  function openFirstClientProfile() {
    try {
      openLoyalty();
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        var btn = document.querySelector("#loyaltyModal .btn-loyalty-profile") ||
                  document.querySelector(".btn-loyalty-profile");
        if (btn) { try { btn.click(); } catch (e) {} clearInterval(iv); }
        else if (tries > 40) clearInterval(iv);
      }, 100);
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
    timeout = timeout || 2200;
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
