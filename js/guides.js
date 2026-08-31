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
  var GUIDES = [
    {
      id: "navigation",
      icon: "🧭",
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
      icon: "🔎",
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
      icon: "🗂️",
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
      icon: "🖤",
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
      icon: "🛍️",
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
      icon: "👤",
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
          }
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
      icon: "🎴",
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
          }
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
          }
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
          }
        }
      ]
    },

    {
      id: "profiler",
      icon: "✨",
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
          }
        },
        {
          sel: "#spOptions",
          place: "top",
          opt: true,
          t: { en: "Answer the questions", fr: "Répondez aux questions", ar: "أجب عن الأسئلة" },
          d: {
            en: "Pick the option that feels closest to you. You can always step back with the Back button.",
            fr: "Choisissez l'option qui vous correspond le mieux. Vous pouvez revenir en arrière à tout moment.",
            ar: "اختر الخيار الأقرب إليك. يمكنك الرجوع في أي وقت بزر الرجوع."
          }
        },
        {
          sel: "#spProgressFill",
          place: "bottom",
          opt: true,
          t: { en: "Progress", fr: "Progression", ar: "التقدّم" },
          d: {
            en: "This bar shows how many questions are left.",
            fr: "Cette barre indique le nombre de questions restantes.",
            ar: "هذا الشريط يوضح عدد الأسئلة المتبقية."
          }
        },
        {
          sel: "#spResults",
          place: "top",
          opt: true,
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
      icon: "⭐",
      title: { en: "Reviews", fr: "Avis", ar: "التقييمات" },
      desc: {
        en: "Rate a fragrance and share your experience.",
        fr: "Notez un parfum et partagez votre expérience.",
        ar: "قيّم عطراً وشارك تجربتك."
      },
      steps: [
        {
          sel: "#aventus-add-review",
          place: "top",
          opt: true,
          t: { en: "Write a review", fr: "Écrire un avis", ar: "كتابة تقييم" },
          d: {
            en: "Every fragrance has its own review box. Click here to open yours.",
            fr: "Chaque parfum possède sa propre zone d'avis. Cliquez ici pour ouvrir la vôtre.",
            ar: "لكل عطر صندوق تقييم خاص. انقر هنا لفتح صندوقك."
          }
        },
        {
          sel: "#aventus-star-rating",
          place: "top",
          opt: true,
          t: { en: "Star rating", fr: "Note en étoiles", ar: "التقييم بالنجوم" },
          d: {
            en: "Choose from one to five stars.",
            fr: "Choisissez de une à cinq étoiles.",
            ar: "اختر من نجمة إلى خمس نجوم."
          }
        },
        {
          sel: "#aventus-review-text",
          place: "top",
          opt: true,
          t: { en: "Your words", fr: "Votre texte", ar: "نصّك" },
          d: {
            en: "Describe longevity, projection and when you like to wear it. A character counter keeps you in bounds.",
            fr: "Décrivez la tenue, la projection et quand vous aimez le porter. Un compteur vous limite.",
            ar: "صف الثبات والفوحان ومتى تفضل ارتداءه. عدّاد الأحرف يحدد لك الحد."
          }
        },
        {
          sel: "#aventus-submit-review",
          place: "top",
          opt: true,
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
      icon: "⚙️",
      title: { en: "Admin dashboard", fr: "Tableau de bord admin", ar: "لوحة الإدارة" },
      desc: {
        en: "Manage users, news, loyalty and store hours.",
        fr: "Gérez les utilisateurs, actualités, fidélité et horaires.",
        ar: "أدر المستخدمين والأخبار والولاء وأوقات العمل."
      },
      steps: [
        {
          sel: "#adminDashboard",
          place: "left",
          opt: true,
          t: { en: "Open the dashboard", fr: "Ouvrir le tableau de bord", ar: "فتح لوحة التحكم" },
          d: {
            en: "Visible only to administrator accounts. It opens the management console.",
            fr: "Visible uniquement pour les comptes administrateurs. Elle ouvre la console de gestion.",
            ar: "تظهر لحسابات الإدارة فقط. تفتح لوحة التحكم."
          }
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
    renderLauncher();
    els.launcher.classList.add("is-open");
  }

  function closeLauncher() {
    if (els) els.launcher.classList.remove("is-open");
  }

  /* ----------------------------------------------------------------- tour */
  function startTour(id) {
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

  function endTour() {
    if (!els) return;
    state.active = false;
    document.documentElement.classList.remove("guide-active");
    els.spotlight.classList.add("is-hidden");
    els.tip.classList.remove("is-visible");
    els.cursor.classList.remove("is-visible");
  }

  function resolve(step) {
    if (!step.sel) return null;
    var el = null;
    try { el = document.querySelector(step.sel); } catch (e) { return null; }
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    if (!r || (r.width < 2 && r.height < 2)) return null;
    if (cs && (cs.visibility === "hidden" || cs.display === "none")) return null;
    return el;
  }

  function go(i) {
    var g = state.guide;
    if (!g) return;

    if (i >= g.steps.length) { finish(); return; }
    if (i < 0) return;

    var step = g.steps[i];
    var el = resolve(step);

    /* skip steps whose target is not on screen right now */
    if (!el && step.opt) {
      var next = i + 1;
      while (next < g.steps.length) {
        if (resolve(g.steps[next]) || !g.steps[next].opt) break;
        next++;
      }
      if (next < g.steps.length) { state.index = next; go(next); return; }
      finish();
      return;
    }

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
    isActive: function () { return state.active; }
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
