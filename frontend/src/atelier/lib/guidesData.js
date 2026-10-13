/* Journeys & interactive guides — the data behind Guides.jsx.
 *
 * Ported from the legacy public/js/guides.js (16 guides, 91 steps, EN/FR/AR).
 * The engine, the categories and the tab order are the same; what changed is
 * every `sel`, because the legacy targeted legacy DOM (`.nav-link`,
 * `#themeToggle`, `#aiFinderIcon`, `#quickSearchInput`…) that does not exist in
 * the Atelier. Steps now point at stable `data-guide` hooks on the Atelier's own
 * chrome, and the copy describes what those surfaces actually do.
 *
 * sel  = CSS selector on the Atelier page
 * guide = data-guide attribute value (same thing, kept separate for clarity)
 * place = tooltip side
 * opt   = skip silently if the element is not on screen
 */

const ICON = [
  "compass",
  "search",
  "grid",
  "bottle",
  "bag",
  "user",
  "card",
  "sparkle",
  "star",
  "shield",
  "clock",
  "receipt",
  "idcard",
  "bell",
  "lock",
  "note",
];

export const TABS = [
  { id: "all", en: "All", fr: "Tous", ar: "الكل" },
  { id: "discovery", en: "Discovery", fr: "Découverte", ar: "الاكتشاف" },
  { id: "shop", en: "Shop", fr: "Boutique", ar: "المتجر" },
  { id: "account", en: "Account", fr: "Compte", ar: "الحساب" },
  { id: "admin", en: "Back office", fr: "Back-office", ar: "الإدارة" },
];

export const CATEGORY = {
  navigation: "discovery",
  search: "discovery",
  collection: "discovery",
  finder: "discovery",
  product: "shop",
  cart: "shop",
  account: "account",
  loyalty: "account",
  reviews: "account",
  console: "admin",
  "client-profiles": "admin",
  "record-purchase": "admin",
  "store-hours": "admin",
  news: "admin",
  users: "admin",
  "guest-notes": "admin",
};

export const GUIDES = [
  {
    id: "navigation",
    icon: "compass",
    title: { en: "Navigation & language", fr: "Navigation et langue", ar: "التنقل واللغة" },
    desc: {
      en: "Move around the Atelier, switch theme, change language.",
      fr: "Se déplacer dans l'Atelier, changer de thème et de langue.",
      ar: "التنقل في الأتيليه، تغيير المظهر واللغة."
    },
    steps: [
      {
        guide: "nav-links",
        place: "bottom",
        t: { en: "Main menu", fr: "Menu principal", ar: "القائمة الرئيسية" },
        d: {
          en: "Home, Collection, Contact — and Guides here, once you are signed in as an administrator. The active page is marked in gold.",
          fr: "Accueil, Collection, Contact — et Guides ici, une fois connecté comme administrateur. La page active est marquée en or.",
          ar: "الرئيسية، المجموعة، اتصل بنا — والأدلة هنا بمجرد تسجيل دخولك كمسؤول. الصفحة الحالية مضاءة بالذهبي."
        }
      },
      {
        guide: "lang",
        place: "bottom",
        t: { en: "Language", fr: "Langue", ar: "اللغة" },
        d: {
          en: "Switch the whole interface between English, French and Arabic. Arabic also flips the layout to right-to-left.",
          fr: "Basculez toute l'interface entre anglais, français et arabe. L'arabe passe aussi la mise en page de droite à gauche.",
          ar: "بدّل الواجهة بالكامل بين الإنجليزية والفرنسية والعربية. العربية تحوّل الصفحة أيضاً إلى اليمين."
        }
      },
      {
        guide: "theme",
        place: "bottom",
        t: { en: "Theme", fr: "Thème", ar: "المظهر" },
        d: {
          en: "Switch between the light boutique look and the night mode. Your choice is remembered on this device.",
          fr: "Basculez entre le rendu clair de la boutique et le mode nuit. Votre choix est mémorisé sur cet appareil.",
          ar: "بدّل بين المظهر النهاري ومظهر الليل. يُحفظ اختيارك على هذا الجهاز."
        }
      },
      {
        guide: "news",
        place: "bottom",
        t: { en: "News", fr: "Actualités", ar: "الأخبار" },
        d: {
          en: "The newspaper icon opens announcements published by the boutique, and shows a count of the ones you have not read.",
          fr: "L'icône journal ouvre les actualités publiées par la boutique, et affiche le nombre de celles que vous n'avez pas lues.",
          ar: "أيقونة الصحيفة تفتح الأخبار التي تنشرها البوتيك، وتُظهر عدد ما لم تقرأه منها."
        }
      }
    ]
  },

  {
    id: "search",
    icon: "search",
    title: { en: "Search & discovery", fr: "Recherche et découverte", ar: "البحث والاكتشاف" },
    desc: {
      en: "Find a fragrance fast, by name, brand or note.",
      fr: "Trouvez un parfum rapidement, par nom, marque ou note.",
      ar: "اعثر على عطر بسرعة بالاسم أو الماركة أو النوتة."
    },
    steps: [
      {
        guide: "search",
        place: "bottom",
        t: { en: "Quick search", fr: "Recherche rapide", ar: "البحث السريع" },
        d: {
          en: "Type a name, a house or a note. Every word has to match, and the panel answers as you type.",
          fr: "Tapez un nom, une maison ou une note. Chaque mot doit correspondre, et le panneau répond pendant la frappe.",
          ar: "اكتب اسمًا أو دارًا أو نوتة. كل كلمة يجب أن تطابق، واللوحة تستجيب أثناء الكتابة."
        }
      },
      {
        guide: "search",
        place: "bottom",
        t: { en: "Describe a wish", fr: "Décrivez un souhait", ar: "صِف رغبتك" },
        d: {
          en: "The second tab ranks whatever matches a sentence like \"a warm vanilla for evenings\" — the same ranking the finders use.",
          fr: "Le deuxième onglet classe ce qui correspond à une phrase comme « une vanille chaude pour le soir » — le même classement que les outils de recherche.",
          ar: "اللسان الثاني يرتّب ما يطابق جملة مثل «فانيليا دافئة للمساء» — نفس الترتيب الذي تستخدمه أدوات البحث."
        }
      },
      {
        guide: "discover",
        place: "bottom",
        t: { en: "The finders", fr: "Les outils", ar: "أدوات البحث" },
        d: {
          en: "The compass opens the discovery overlay: a guided Scent Profiler, or an Ingredient Finder built from the notes we actually stock.",
          fr: "La boussole ouvre la fenêtre de découverte : un Profiler olfactif guidé, ou un Chercheur de Notes bâti sur les notes réellement en stock.",
          ar: "البوصلة تفتح نافذة الاكتشاف: محلّل روائح موجّه، أو باحث نوتات مبني على النوتات المتوفرة فعلاً."
        }
      }
    ]
  },

  {
    id: "collection",
    icon: "grid",
    title: { en: "Browsing the collection", fr: "Parcourir la collection", ar: "تصفّح المجموعة" },
    desc: {
      en: "Filter by note, quality and season, then page through the catalogue.",
      fr: "Filtrer par note, qualité et saison, puis paginer le catalogue.",
      ar: "التصفية حسب النوتة والجودة والفصل، ثم التنقّل بين صفحات الكتالوج."
    },
    steps: [
      {
        guide: "filters",
        place: "bottom",
        t: { en: "Filters", fr: "Filtres", ar: "التصفية" },
        d: {
          en: "Narrow by note, quality or season, search inside the grid, and switch between grid and list. Any filter change returns you to page one.",
          fr: "Affinez par note, qualité ou saison, cherchez dans la grille, et basculez entre grille et liste. Tout changement de filtre vous ramène en page un.",
          ar: "ضيّق حسب النوتة أو الجودة أو الفصل، ابحث داخل الشبكة، وبدّل بين الشبكة والقائمة. أي تغيير في التصفية يعيدك إلى الصفحة الأولى."
        }
      },
      {
        guide: "card",
        place: "left",
        t: { en: "A card", fr: "Une carte", ar: "بطاقة" },
        d: {
          en: "The heart saves a fragrance to your favourites — no account needed; they stay on this device. The card itself opens the product.",
          fr: "Le cœur enregistre un parfum dans vos favoris — sans compte ; ils restent sur cet appareil. La carte ouvre le produit.",
          ar: "القلب يحفظ العطر في مفضّلاتك — بلا حساب؛ تبقى على هذا الجهاز. البطاقة تفتح صفحة المنتج."
        }
      },
      {
        guide: "pager",
        place: "top",
        t: { en: "Pagination", fr: "Pagination", ar: "التصفيح" },
        d: {
          en: "Twenty-four per page, numbered with gaps, and a line saying which slice you are looking at. The page lives in the URL, so it can be shared.",
          fr: "Vingt-quatre par page, numérotées avec des sauts, et une ligne indiquant la tranche affichée. La page est dans l'URL, donc partageable.",
          ar: "أربعة وعشرون في الصفحة، مرقّمة مع فراغات، وسطر يوضّح الشريحة المعروضة. الصفحة موجودة في الرابط فيمكن مشاركته."
        }
      }
    ]
  },

  {
    id: "finder",
    icon: "sparkle",
    title: { en: "Scent Profiler & Ingredient Finder", fr: "Profiler olfactif et Chercheur de notes", ar: "محلّل الروائح وباحث النوتات" },
    desc: {
      en: "Let the boutique answer a few questions, or start from the notes you love.",
      fr: "Laissez la boutique répondre à quelques questions, ou partez des notes que vous aimez.",
      ar: "دع البوتيك يجيب عن بضعة أسئلة، أو ابدأ من النوتات التي تحبّها."
    },
    steps: [
      {
        guide: "discover",
        place: "bottom",
        t: { en: "Open the overlay", fr: "Ouvrir la fenêtre", ar: "افتح النافذة" },
        d: {
          en: "The compass in the nav. Both finders run in your browser — nothing about your answers leaves the page.",
          fr: "La boussole dans la navigation. Les deux outils tournent dans votre navigateur — rien de vos réponses ne quitte la page.",
          ar: "البوصلة في شريط التنقّل. كلتا الأداتين تعملان في متصفحك — لا شيء من أجوبتك يغادر الصفحة."
        }
      },
      {
        guide: "profiler",
        place: "auto",
        t: { en: "Scent Profiler", fr: "Profiler olfactif", ar: "محلّل الروائح" },
        d: {
          en: "Seven questions about notes, family, season, intensity, occasion, budget and what to avoid. Every bottle is then ranked out of 100.",
          fr: "Sept questions sur les notes, la famille, la saison, l'intensité, l'occasion, le budget et ce qu'il faut éviter. Chaque flacon est ensuite classé sur 100.",
          ar: "سبعة أسئلة عن النوتات والعائلة والفصل والقوة والمناسبة والميزانية وما يجب تجنّبه. ثم يُرتّب كل قارورة على 100."
        }
      },
      {
        guide: "ingredients",
        place: "auto",
        t: { en: "Ingredient Finder", fr: "Chercheur de notes", ar: "باحث النوتات" },
        d: {
          en: "Pick up to six notes — every chip carries how many of our bottles hold it — and see the bottles that carry the most of them.",
          fr: "Choisissez jusqu'à six notes — chaque pastille indique combien de nos flacons la portent — et voyez les flacons qui en portent le plus.",
          ar: "اختر حتى ست نوتات — كل شريحة تُظهر كم قارورة تحملها — وشاهد القوارير التي تحمل أكثرها."
        }
      }
    ]
  },

  {
    id: "product",
    icon: "bottle",
    title: { en: "A fragrance, and its reviews", fr: "Un parfum et ses avis", ar: "عطر وآراؤه" },
    desc: {
      en: "Everything on one page: the note trail, the sizes, the favourites, the cart.",
      fr: "Tout sur une page : la pyramide des notes, les tailles, les favoris, le panier.",
      ar: "كل شيء في صفحة واحدة: هرم النوتات، الأحجام، المفضّلة، السلة."
    },
    steps: [
      {
        guide: "pdp-sections",
        place: "left",
        t: { en: "The details", fr: "Les détails", ar: "التفاصيل" },
        d: {
          en: "Sizes and price, the note trail from top to base, and the perfumer's notes. This is the same content the boutique knows by heart.",
          fr: "Tailles et prix, la pyramide des notes de tête à fond, et les notes du parfumeur. C'est le même contenu que la boutique connaît par cœur.",
          ar: "الأحجام والسعر، وهرم النوتات من الرأس إلى القاعدة، وملاحظات صانع العطر. نفس المحتوى الذي تعرفه البوتيك."
        }
      },
      {
        guide: "reviews",
        place: "top",
        t: { en: "Reviews", fr: "Avis", ar: "الآراء" },
        d: {
          en: "Rating average and distribution, then the reviews. Signed in, you can write one, edit yours, or reply — the store answers from the same account.",
          fr: "Moyenne et répartition des notes, puis les avis. Connecté, vous pouvez en écrire un, modifier le vôtre, ou répondre — la boutique répond depuis le même compte.",
          ar: "المتوسط وتوزيع التقييمات، ثم الآراء. بعد تسجيل الدخول يمكنك كتابة رأي أو تعديله أو الرد — والمتجر يجيب من الحساب نفسه."
        }
      }
    ]
  },

  {
    id: "cart",
    icon: "bag",
    title: { en: "Cart & checkout", fr: "Panier et commande", ar: "السلة والطلب" },
    desc: {
      en: "Your basket lives on this device until you are done.",
      fr: "Votre panier reste sur cet appareil jusqu'à ce que vous ayez terminé.",
      ar: "تبقى سلّتك على هذا الجهاز حتى تنتهي."
    },
    steps: [
      {
        guide: "cart",
        place: "bottom",
        t: { en: "The cart", fr: "Le panier", ar: "السلة" },
        d: {
          en: "The bag shows how many bottles you have picked. Quantities can be changed there, and the cart is kept locally until checkout.",
          fr: "Le sac indique combien de flacons vous avez choisis. On peut y changer les quantités, et le panier est conservé localement jusqu'au paiement.",
          ar: "الحقيبة تُظهر عدد القوارير التي اخترتها. يمكنك تغيير الكميات هناك، وتبقى السلة محفوظة محليًا حتى الدفع."
        }
      },
      {
        guide: "favorites",
        place: "bottom",
        t: { en: "Favourites", fr: "Favoris", ar: "المفضّلة" },
        d: {
          en: "The heart is your shortlist: everything you saved, on any page, in one list.",
          fr: "Le cœur est votre liste : tout ce que vous avez enregistré, sur n'importe quelle page.",
          ar: "القلب هو قائمتك: كل ما حفظته، من أي صفحة، في مكان واحد."
        }
      }
    ]
  },

  {
    id: "account",
    icon: "user",
    title: { en: "Account & profile photo", fr: "Compte et photo", ar: "الحساب والصورة" },
    desc: {
      en: "Your profile, your settings, and a photo you can crop yourself.",
      fr: "Votre profil, vos réglages, et une photo que vous pouvez recadrer vous-même.",
      ar: "ملفك وإعداداتك، وصورة يمكنك اقتصاصها بنفسك."
    },
    steps: [
      {
        guide: "account",
        place: "bottom",
        t: { en: "Your account", fr: "Votre compte", ar: "حسابك" },
        d: {
          en: "The user button opens your profile, favourites, cart, and — for administrators — the console and these guides.",
          fr: "Le bouton utilisateur ouvre votre profil, vos favoris, votre panier, et — pour les administrateurs — la console et ces guides.",
          ar: "زر المستخدم يفتح ملفك ومفضّلاتك وسلّتك، و— للمسؤولين— لوحة الإدارة وهذه الأدلة."
        }
      },
      {
        guide: "photo",
        place: "auto",
        t: { en: "Your photo", fr: "Votre photo", ar: "صورتك" },
        d: {
          en: "Picking a photo opens an editor: drag to reposition, zoom with the slider or the wheel, rotate. Nothing is uploaded until you confirm.",
          fr: "Choisir une photo ouvre un éditeur : glissez pour repositionner, zoomez avec le curseur ou la molette, faites pivoter. Rien n'est envoyé avant confirmation.",
          ar: "اختيار صورة يفتح محرّرًا: اسحب لتغيير الموضع، كبّر بالشريط أو العجلة، وأدر. لا يُرسل شيء قبل التأكيد."
        }
      },
      {
        guide: "settings",
        place: "auto",
        t: { en: "Settings", fr: "Réglages", ar: "الإعدادات" },
        d: {
          en: "Notifications, visibility and data choices — the same switches the store respects when it writes to you.",
          fr: "Notifications, visibilité et choix de données — les mêmes interrupteurs que la boutique respecte quand elle vous écrit.",
          ar: "الإشعارات والظهور وخيارات البيانات — نفس المفاتيح التي تحترمها البوتيك عندما تخاطبك."
        }
      }
    ]
  },

  {
    id: "loyalty",
    icon: "card",
    title: { en: "Loyalty card", fr: "Carte fidélité", ar: "بطاقة الولاء" },
    desc: {
      en: "Five purchases earned you a complimentary perfume.",
      fr: "Cinq achats vous rapportent un parfum offert.",
      ar: "خمسة مشتريات تمنحك عطرًا مجانيًا."
    },
    steps: [
      {
        guide: "loyalty",
        place: "auto",
        t: { en: "Your balance", fr: "Votre solde", ar: "رصيدك" },
        d: {
          en: "The card, your points against the five needed, and how the balance is doing against the goal.",
          fr: "La carte, vos points face aux cinq nécessaires, et l'état du solde vers l'objectif.",
          ar: "البطاقة، ونقاطك مقابل الخمس المطلوبة، وحالة الرصيد نحو الهدف."
        }
      },
      {
        guide: "loyalty-history",
        place: "auto",
        t: { en: "Your history", fr: "Votre historique", ar: "سجلّك" },
        d: {
          en: "Every purchase recorded at the register, and every point that came from it — including the ones you already redeemed.",
          fr: "Chaque achat enregistré en caisse, et chaque point qui en est issu — y compris ceux déjà échangés.",
          ar: "كل مشتراة سُجّلت عند الكاشير، وكل نقطة جاءت منها — بما استبدلته منها."
        }
      }
    ]
  },

  {
    id: "console",
    icon: "shield",
    title: { en: "Admin console", fr: "Console admin", ar: "لوحة الإدارة" },
    desc: {
      en: "The back office: customers, loyalty, news, hours.",
      fr: "Le back-office : clients, fidélité, actualités, horaires.",
      ar: "الإدارة: العملاء، الولاء، الأخبار، الأوقات."
    },
    steps: [
      {
        guide: "admin",
        place: "auto",
        t: { en: "The console", fr: "La console", ar: "لوحة الإدارة" },
        d: {
          en: "Overview counts, then the users, loyalty, news, store hours and guest notes tabs. Everything here is live on the store's data.",
          fr: "Les compteurs, puis les onglets utilisateurs, fidélité, actualités, horaires et notes. Tout ici est en direct sur les données de la boutique.",
          ar: "العدادات، ثم لسان المستخدمين والولاء والأخبار والأوقات والملاحظات. كل ما هنا مباشر على بيانات المتجر."
        }
      },
      {
        guide: "admin-users",
        place: "auto",
        t: { en: "Users", fr: "Utilisateurs", ar: "المستخدمون" },
        d: {
          en: "Every account, with search. A banned customer is signed out of their session and blocked at the next request.",
          fr: "Chaque compte, avec recherche. Un client banni est déconnecté et bloqué à la requête suivante.",
          ar: "كل حساب، مع البحث. العميل المحظور يُخرَج من جلسته ويُحجب عند الطلب التالي."
        }
      }
    ]
  },

  {
    id: "client-profiles",
    icon: "idcard",
    title: { en: "Consult a customer profile", fr: "Consulter un profil client", ar: "الاطّلاع على ملف عميل" },
    desc: {
      en: "Taste profile, history and what they might like next.",
      fr: "Profil de goût, historique et ce qu'ils pourraient aimer ensuite.",
      ar: "ملف الذائقة والسجلّ وما قد يحبّه بعد."
    },
    steps: [
      {
        guide: "admin",
        place: "auto",
        t: { en: "Open the console", fr: "Ouvrir la console", ar: "افتح اللوحة" },
        d: {
          en: "From the user menu, Administration & outils.",
          fr: "Depuis le menu utilisateur, Administration & outils.",
          ar: "من قائمة المستخدم، «الإدارة والأدوات»."
        }
      },
      {
        guide: "loyalty-tab",
        place: "auto",
        t: { en: "Loyalty tab", fr: "Onglet fidélité", ar: "لسان الولاء" },
        d: {
          en: "Every card, best points first. Open one to see that customer's purchases, favourite families and houses.",
          fr: "Chaque carte, les meilleurs points d'abord. Ouvrez-en une pour voir les achats, les familles et les maisons préférées de ce client.",
          ar: "كل بطاقة، الأعلى نقاطًا أولاً. افتح إحداها لترى مشتريات العميل وعائلاته ودوره المفضّلة."
        }
      },
      {
        guide: "loyalty-card",
        place: "auto",
        t: { en: "A card", fr: "Une carte", ar: "بطاقة" },
        d: {
          en: "Points can be added or a reward redeemed here. The purchase history below is what feeds the customer's own card page.",
          fr: "On peut ajouter des points ou échanger une récompense ici. L'historique ci-dessous alimente la page de carte du client.",
          ar: "يمكن إضافة نقاط أو استبدال مكافأة هنا. السجلّ أدناه هو ما يُغذّي صفحة بطاقة العميل."
        }
      }
    ]
  },

  {
    id: "record-purchase",
    icon: "receipt",
    title: { en: "Record a purchase", fr: "Enregistrer un achat", ar: "تسجيل مشتراة" },
    desc: {
      en: "A purchase adds a point to the customer's card.",
      fr: "Un achat ajoute un point à la carte du client.",
      ar: "المشتراة تضيف نقطة إلى بطاقة العميل."
    },
    steps: [
      {
        guide: "loyalty-tab",
        place: "auto",
        t: { en: "Loyalty tab", fr: "Onglet fidélité", ar: "لسان الولاء" },
        d: {
          en: "Open the customer's card from the list, or create a walk-in card for someone without one.",
          fr: "Ouvrez la carte du client depuis la liste, ou créez une carte de passage pour quelqu'un qui n'en a pas.",
          ar: "افتح بطاقة العميل من القائمة، أو أنشئ بطاقة عرَض لمن لا يملك واحدة."
        }
      },
      {
        guide: "loyalty-purchase",
        place: "auto",
        t: { en: "Add a purchase", fr: "Ajouter un achat", ar: "أضف مشتراة" },
        d: {
          en: "Name, house, family, audience and price. Saving it records the purchase and awards the point that fills the card.",
          fr: "Nom, maison, famille, public et prix. L'enregistrement note l'achat et attribue le point qui remplit la carte.",
          ar: "الاسم والدار والعائلة والجمهور والسعر. الحفظ يسجّل المشتراة ويمنح النقطة التي تملأ البطاقة."
        }
      }
    ]
  },

  {
    id: "store-hours",
    icon: "clock",
    title: { en: "Store hours", fr: "Horaires", ar: "أوقات العمل" },
    desc: {
      en: "What the contact page and the footer show.",
      fr: "Ce que la page contact et le pied de page affichent.",
      ar: "ما تعرضه صفحة الاتصال والتذييل."
    },
    steps: [
      {
        guide: "hours-tab",
        place: "auto",
        t: { en: "Store hours tab", fr: "Onglet horaires", ar: "لسان الأوقات" },
        d: {
          en: "Set each day's opening and closing, the timezone and the appointment note. The contact page reads this live.",
          fr: "Réglez l'ouverture et la fermeture de chaque jour, le fuseau et la note de rendez-vous. La page contact le lit en direct.",
          ar: "حدّد فتح وإغلاق كل يوم، والمنطقة الزمنية، وملاحظة المواعيد. صفحة الاتصل تقرأها مباشرة."
        }
      }
    ]
  },

  {
    id: "news",
    icon: "bell",
    title: { en: "Publish news", fr: "Publier une actualité", ar: "نشر خبر" },
    desc: {
      en: "Announcements reach the nav badge.",
      fr: "Les actualités parviennent au badge de navigation.",
      ar: "الأخبار تصل إلى شارة شريط التنقّل."
    },
    steps: [
      {
        guide: "news-tab",
        place: "auto",
        t: { en: "News tab", fr: "Onglet actualités", ar: "لسان الأخبار" },
        d: {
          en: "Compose an announcement with a badge, an icon and a colour. Publishing it lights the count on every visitor's nav.",
          fr: "Rédigez une annonce avec un badge, une icône et une couleur. La publication allume le compteur sur la navigation de chaque visiteur.",
          ar: "حرّر خبرًا مع شارة وأيقونة ولون. النشر يُضيء العدّاد في شريط كل زائر."
        }
      }
    ]
  },

  {
    id: "users",
    icon: "lock",
    title: { en: "Ban or unban a customer", fr: "Bannir ou rétablir", ar: "حظر عميل أو رفعه" },
    desc: {
      en: "Block an account without deleting its data.",
      fr: "Bloquez un compte sans supprimer ses données.",
      ar: "امنع حسابًا دون حذف بياناته."
    },
    steps: [
      {
        guide: "admin-users",
        place: "auto",
        t: { en: "Users tab", fr: "Onglet utilisateurs", ar: "لسان المستخدمين" },
        d: {
          en: "Find the account, then ban or release it. Everything else — their reviews, their card — stays where it is.",
          fr: "Trouvez le compte, puis bannissez-le ou rétablissez-le. Tout le reste — ses avis, sa carte — reste en place.",
          ar: "ابحث عن الحساب، ثم احظره أو ارفع عنه الحظر. كل ما عداه — آراؤه وبطاقته — يبقى كما هو."
        }
      }
    ]
  },

  {
    id: "guest-notes",
    icon: "note",
    title: { en: "Guest notes", fr: "Notes visiteurs", ar: "ملاحظات الزوار" },
    desc: {
      en: "The hero form and the contact page write here.",
      fr: "Le formulaire du hero et la page contact écrivent ici.",
      ar: "نموذج الواجهة وصفحة الاتصال يكتبان هنا."
    },
    steps: [
      {
        guide: "notes-tab",
        place: "auto",
        t: { en: "Notes tab", fr: "Onglet notes", ar: "لسان الملاحظات" },
        d: {
          en: "Every message left without an account, newest first. Mark one read when you have answered it.",
          fr: "Chaque message laissé sans compte, le plus récent d'abord. Marquez-en un comme lu après avoir répondu.",
          ar: "كل رسالة تُركت بلا حساب، الأحدث أولاً. علّمها كمقروءة بعد الردّ عليها."
        }
      }
    ]
  },
];

export default GUIDES;
