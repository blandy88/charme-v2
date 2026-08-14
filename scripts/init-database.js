require('dotenv').config();
const db = require('../db');

// Create tables (idempotent)
async function createTables() {
    const statements = [
        `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT,
                birthday DATE,
                avatar_url TEXT,
                email_verified INTEGER DEFAULT 0,
                verification_code TEXT,
                verification_expires TIMESTAMPTZ,
                is_admin INTEGER DEFAULT 0,
                is_banned INTEGER DEFAULT 0,
                banned_reason TEXT,
                banned_at TIMESTAMPTZ,
                banned_by INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                last_login TIMESTAMPTZ,
                FOREIGN KEY (banned_by) REFERENCES users (id)
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                email_notifications INTEGER DEFAULT 1,
                sms_notifications INTEGER DEFAULT 0,
                profile_visibility INTEGER DEFAULT 1,
                data_collection INTEGER DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id)
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS user_favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, product_id)
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2),
                image_url TEXT,
                category TEXT,
                mood_indicators TEXT,
                seasonal_indicators TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                user_avatar TEXT,
                fragrance TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS review_likes (
                id SERIAL PRIMARY KEY,
                review_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                like_type TEXT NOT NULL CHECK (like_type IN ('like', 'dislike')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(review_id, user_id),
                FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS review_replies (
                id SERIAL PRIMARY KEY,
                review_id INTEGER NOT NULL,
                parent_reply_id INTEGER,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                user_email TEXT,
                user_avatar TEXT,
                is_admin INTEGER DEFAULT 0,
                reply_text TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                is_edited INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                edited_at TIMESTAMPTZ,
                FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
                FOREIGN KEY (parent_reply_id) REFERENCES review_replies (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS loyalty_cards (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE,
                holder_name TEXT,
                holder_email TEXT,
                holder_phone TEXT,
                card_number TEXT UNIQUE,
                points INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id SERIAL PRIMARY KEY,
                card_id INTEGER NOT NULL,
                user_id INTEGER,
                points_change INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (card_id) REFERENCES loyalty_cards (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS news (
                id SERIAL PRIMARY KEY,
                template_type TEXT NOT NULL DEFAULT 'general',
                badge TEXT,
                icon TEXT,
                color TEXT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                cta_label TEXT,
                cta_url TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `,
    ];

    for (const sql of statements) {
        await db.run(sql);
        console.log('✓ Table ready');
    }
}

// Create indexes for better performance
async function createIndexes() {
    const statements = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_fragrance ON reviews(fragrance)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id)',
        'CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id)',
        'CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_card_id ON loyalty_transactions(card_id)',
    ];
    for (const sql of statements) {
        await db.run(sql);
    }
    console.log('✓ Indexes ready');
}

// Insert sample products
async function insertSampleProducts() {
    const products = [
        {
            id: 'pegasus',
            name: 'Pegasus',
            brand: 'Parfums de Marly',
            description: 'A sophisticated blend of bergamot, heliotrope, and sandalwood',
            price: 180.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['confident', 'sophisticated', 'elegant']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'layton',
            name: 'Layton',
            brand: 'Parfums de Marly',
            description: 'An opulent fragrance with apple, lavender, and vanilla',
            price: 195.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['luxurious', 'warm', 'inviting']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'haltane',
            name: 'Haltane',
            brand: 'Parfums de Marly',
            description: 'A modern interpretation with bergamot, saffron, and oud',
            price: 210.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'bold', 'exotic']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'kajal-aican',
            name: 'Äican',
            brand: 'Kajal',
            description: 'A tropical burst of passion fruit and pineapple laced with ginger and praline, Äican is Kajal\'s golden-hour gourmand that glows on warm skin.',
            price: 180.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['playful', 'joyful', 'radiant']),
            seasonal_indicators: JSON.stringify(['summer', 'spring'])
        },
        {
            id: 'mancera-saharian-wind',
            name: 'Saharian Wind',
            brand: 'Mancera',
            description: 'A sweltering desert gust of pink pepper and warm spices blown over leather and woods, Pierre Montale\'s ode to the Sahara.',
            price: 169.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'mysterious', 'dramatic']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'vertus-sole-patchouli',
            name: 'Sole Patchouli',
            brand: 'Vertus',
            description: 'Sun-drenched patchouli softened by orris root and a whisper of marshmallow, an earthy-green signature with a surprisingly plush drydown.',
            price: 180.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['earthy', 'elegant', 'relaxed']),
            seasonal_indicators: JSON.stringify(['fall', 'spring'])
        },
        {
            id: 'moresque-scirocco',
            name: 'Scirocco',
            brand: 'Moresque',
            description: 'A saffron-rose oriental that melts in the heat, cardamom, cinnamon and Damask rose over a plush amber-vanilla base with a leathery spine.',
            price: 150.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'sensual', 'opulent']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'essential-parfums-bois-imperial',
            name: 'Bois Impérial',
            brand: 'Essential Parfums',
            description: 'Quentin Bisch\'s cult woody minimalist, Thai basil and grapefruit zipping over Nepalese pepper and a creamy Akigalawood-vetiver core.',
            price: 79.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['modern', 'minimalist', 'confident']),
            seasonal_indicators: JSON.stringify(['spring', 'summer', 'fall'])
        },
        {
            id: 'louis-vuitton-stellar-times',
            name: 'Stellar Times',
            brand: 'Louis Vuitton',
            description: 'A warm, resinous extrait from the Les Extraits collection, orange blossom and white amber wrapped in Peru balsam and vanilla for a stellar golden glow.',
            price: 290.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['radiant', 'sophisticated', 'golden']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'xerjoff-erba-gold',
            name: 'Erba Gold',
            brand: 'Xerjoff',
            description: 'A sunlit citrus cocktail, Amalfi lemon, Brazilian orange and ginger sparkling over melon, pear and cinnamon, melting into white musk and Madagascan vanilla.',
            price: 310.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['joyful', 'sunny', 'elegant']),
            seasonal_indicators: JSON.stringify(['summer', 'spring'])
        },
        {
            id: 'xerjoff-purple-accento',
            name: 'Purple Accento',
            brand: 'Xerjoff',
            description: 'The Accento universe goes plush, pineapple and loganberry over jasmine and orris, wrapped in oud, amber and vanilla for a regal violet glow.',
            price: 280.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['regal', 'bold', 'mysterious']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'versace-fleur-de-mate',
            name: 'Fleur de Maté',
            brand: 'Versace',
            description: 'Olivier Cresp\'s verde tapestry, patchouli and cypriol shadowing the bitter lift of maté, olibanum and Atlas cedar for a tailored, smoky-herbal elegance.',
            price: 145.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['refined', 'green', 'elegant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'versace-iris-delite',
            name: 'Iris d\'Élite',
            brand: 'Versace',
            description: 'A regal powdery iris dressed in soft suede and woody warmth, Versace\'s most refined, quiet-luxury side.',
            price: 145.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['powdery', 'refined', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'armani-prive-jahwara-oriental',
            name: 'Jahwara Oriental',
            brand: 'Giorgio Armani',
            description: 'A princely Armani Privé journey, incense, myrrh and spices over iris, opoponax and labdanum, drying into bourbon vanilla, guaiac wood and amberwood.',
            price: 275.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'royal', 'mysterious']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'dg-dolce-blue-jasmine',
            name: 'Dolce Blue Jasmine',
            brand: 'Dolce & Gabbana',
            description: 'A Sicilian breeze in a bottle, juicy blue fig and jasmine sambac rising over clean cedarwood, luminous and effortlessly Mediterranean.',
            price: 125.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'feminine', 'sunny']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'dg-light-blue-summer-vibes',
            name: 'Light Blue Summer Vibes',
            brand: 'Dolce & Gabbana',
            description: 'Olivier Cresp\'s sun-soaked seasonal twist on Light Blue, sparkling bergamot and juicy peach over the iconic cedarwood drydown.',
            price: 125.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['vibrant', 'joyful', 'fresh']),
            seasonal_indicators: JSON.stringify(['summer'])
        },
        {
            id: 'guerlain-patchouli-ardent',
            name: 'Patchouli Ardent',
            brand: 'Guerlain',
            description: 'Thierry Wasser\'s molten patchouli from the Absolus Allegoria line, dark, smoky and glowing, with resins and woods feeding the flames.',
            price: 170.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['dark', 'smoky', 'bold']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'guerlain-mandarine-basilic',
            name: 'Mandarine Basilic',
            brand: 'Guerlain',
            description: 'The Aqua Allegoria classic, a glass of chilled mandarin juice bruised with fresh basil, herbal and sunny in equal measure.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'sunny', 'zesty']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'bvlgari-man-rain-essence',
            name: 'Bvlgari Man Rain Essence',
            brand: 'Bvlgari',
            description: 'Alberto Morillas captures the scent of rain on warm stone, green tea and orange petal chilled by a petrichor musk-amber base with guaiac wood.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'calm', 'masculine']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'al-jazeera-magic',
            name: 'Magic',
            brand: 'Al-Jazeera Perfumes',
            description: 'Loc Dong\'s salty ozonic opening crashes into Turkish rose and praline, settling on a warm vanilla-amber-patchouli shore.',
            price: 65.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'warm', 'sensual']),
            seasonal_indicators: JSON.stringify(['fall', 'evening'])
        },
        {
            id: 'paris-corner-sabah-al-waed',
            name: 'Sabah Al Waed',
            brand: 'Paris Corner',
            description: 'A creamy morning promise, jasmine and orange blossom over cocoa, amber and a vanilla-tonka base dusted with patchouli and sandalwood.',
            price: 30.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['creamy', 'cozy', 'sweet']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'kilian-smoking-hot',
            name: 'Smoking Hot',
            brand: 'Kilian',
            description: 'Smoke curling through caramelized apple and cinnamon, a tobacco-vanilla hearth cooled by licorice and clary sage.',
            price: 265.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['smoky', 'warm', 'cozy']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'kajal-lamar-noir',
            name: 'Lamar Noir',
            brand: 'Kajal',
            description: 'An ambery-leather noir, tropical fruits and violet brightening caramel-vanilla before oud, leather and cashmere woods take hold.',
            price: 240.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'bold', 'sensual']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'byredo-tobacco-mandarin',
            name: 'Tobacco Mandarin',
            brand: 'Byredo',
            description: 'Juicy mandarin colliding with cumin and coriander over smoldering tobacco, leather and labdanum, drying into frankincense and oud.',
            price: 240.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'sophisticated', 'smoky']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'xerjoff-alexandria-ii',
            name: 'Alexandria II',
            brand: 'Xerjoff',
            description: 'A regal oriental masterpiece, palisander rosewood and lavender opening over rose and cedar, melting into oud, amber and vanilla.',
            price: 330.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['regal', 'opulent', 'elegant']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'xerjoff-italica',
            name: 'Italica',
            brand: 'Xerjoff',
            description: 'Tuscan almond milk steeped in saffron and vanilla toffee, a creamy gourmand wrapped in sandalwood, cedar and musk.',
            price: 285.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['cozy', 'creamy', 'sweet']),
            seasonal_indicators: JSON.stringify(['winter', 'fall'])
        },
        {
            id: 'xerjoff-mefisto',
            name: 'Mefisto',
            brand: 'Xerjoff',
            description: 'A sparkling Casamorati cologne, grapefruit, bergamot and Amalfi lemon brightening lavender, rose and iris over cedar, musk and amber.',
            price: 250.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'elegant', 'bright']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'xerjoff-1888',
            name: '1888',
            brand: 'Xerjoff',
            description: 'A tribute to the founding of Casamorati, carnation and saffron over rose, neroli and ylang-ylang, grounded in Mysore sandalwood, amber and birch.',
            price: 315.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['vintage', 'elegant', 'opulent']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'dior-bois-dargent',
            name: 'Bois d\'Argent',
            brand: 'Dior',
            description: 'Iris and myrrh suspended in honeyed amber over a dry woody base, the Maison Dior original of delicate, luminous restraint.',
            price: 275.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['powdery', 'refined', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'guerlain-tobacco-honey',
            name: 'Tobacco Honey',
            brand: 'Guerlain',
            description: 'Beeswax honey and cloves over tobacco and tonka, drying into a smoky oud and sandalwood base.',
            price: 340.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'smoky', 'opulent']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'cacharel-yes-i-am',
            name: 'Yes I Am',
            brand: 'Cacharel',
            description: 'The spicy-cremoso accord of warm milk and cardamom at its heart, raspberry and mandarin opening into gardenia, ginger flower and jasmine.',
            price: 92.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['feminine', 'creamy', 'playful']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'bvlgari-jasmin-noir',
            name: 'Jasmin Noir',
            brand: 'Bvlgari',
            description: 'Bvlgari\'s femme fatale jasmine, luminous jasmine sambac wrapped in star anise and gardenia over tonka, woods and white musk.',
            price: 145.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'feminine', 'mysterious']),
            seasonal_indicators: JSON.stringify(['fall', 'evening'])
        },
        {
            id: 'guerlain-l-instant',
            name: 'L\'Instant de Guerlain',
            brand: 'Guerlain',
            description: 'Maurice Roucel\'s golden classic, honeysuckle and magnolia over iris, woods and radiant white musk.',
            price: 138.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'sophisticated', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'mugler-alien',
            name: 'Alien',
            brand: 'Mugler',
            description: 'Jasmine sambac radiating through white amber and cashmeran like a celestial body in its own orbit.',
            price: 155.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'elegant', 'intense']),
            seasonal_indicators: JSON.stringify(['fall', 'evening'])
        },
        {
            id: 'dior-hypnotic-poison',
            name: 'Hypnotic Poison',
            brand: 'Dior',
            description: 'Annick Menardo\'s dangerously addictive almond-vanilla, a retro-glamour oriental that opens bitter and dries seductively sweet.',
            price: 158.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['seductive', 'mysterious', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'armani-si-passione-intense',
            name: 'Si Passione Intense',
            brand: 'Giorgio Armani',
            description: 'A deeper, more radiant Si Passione, sparkling pear and black currant igniting rose, jasmine and vanilla over an amber-patchouli base.',
            price: 148.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['passionate', 'bold', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'chanel-coco-mademoiselle',
            name: 'Coco Mademoiselle',
            brand: 'Chanel',
            description: 'Jacques Polge\'s contemporary chypre, fresh orange and rose over a deep patchouli-vetiver base, a study in modern Chanel elegance.',
            price: 210.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sophisticated', 'elegant', 'chic']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'paco-rabanne-lady-million',
            name: 'Lady Million',
            brand: 'Paco Rabanne',
            description: 'The dazzling gold counterpart to 1 Million, raspberry and neroli brightened by honey, amber and patchouli.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['glamorous', 'bold', 'playful']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'paco-rabanne-1-million-gold',
            name: '1 Million Gold',
            brand: 'Paco Rabanne',
            description: 'The gilded flanker of 1 Million, black currant and orange blossom over honeyed amber, leather and patchouli.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['glamorous', 'warm', 'opulent']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'paco-rabanne-black-xs-lexces',
            name: 'Black XS L\'Exces',
            brand: 'Paco Rabanne',
            description: 'A darker, headier Black XS, blackberry and rhubarb cut with rose over amyris, vanilla and patchouli.',
            price: 112.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'sensual', 'mysterious']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'versace-crystal-noir',
            name: 'Crystal Noir',
            brand: 'Versace',
            description: 'Versace\'s darkly glamorous oriental, spice-kissed ginger and cardamom over gardenia, coconut and warm woods.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['glamorous', 'mysterious', 'sensual']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'versace-dylan-blue-pour-femme',
            name: 'Dylan Blue Pour Femme',
            brand: 'Versace',
            description: 'A fresh juicy women\'s Dylan Blue, black currant and green apple over freesia, rose and patchouli.',
            price: 138.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'feminine', 'vibrant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'jgp-scandal',
            name: 'Scandal',
            brand: 'Jean Paul Gaultier',
            description: 'Scandal\'s scandalous heart, gardenia and orange blossom drenched in honey-caramel on patchouli.',
            price: 124.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'glamorous', 'sweet']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'jgp-scandal-absolu',
            name: 'Scandal Absolu',
            brand: 'Jean Paul Gaultier',
            description: 'A richer Scandal, honeyed caramel and tonka poured over gardenia and orange blossom with a patchouli backbone.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'seductive', 'sweet']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'gucci-gucci-guilty-pour-homme',
            name: 'Gucci Guilty Pour Homme',
            brand: 'Gucci',
            description: 'A magnetic woody-aromatic, lemon and lavender sharpened with pink pepper over lilac, cedar, patchouli and amber.',
            price: 148.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'confident', 'masculine']),
            seasonal_indicators: JSON.stringify(['fall', 'evening'])
        },
        {
            id: 'gucci-flora-gorgeous-jasmine',
            name: 'Flora Gorgeous Jasmine',
            brand: 'Gucci',
            description: 'Gucci\'s radiant jasmine, grandiflorum jasmine entwined with pear and brown sugar over a creamy sandalwood drydown.',
            price: 158.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['radiant', 'feminine', 'elegant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'gucci-envy-me',
            name: 'Envy Me',
            brand: 'Gucci',
            description: 'A fresh juicy floral, pineapple and pink pepper over peony, jasmine and rose with a musk-wood base.',
            price: 112.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'playful', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'guerlain-angelique-noire',
            name: 'Angelique Noire',
            brand: 'Guerlain',
            description: 'The first of L\'Art et la Matiere, crisp angelica and citrus over a creamy sandalwood-vanilla base.',
            price: 195.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['refined', 'powdery', 'elegant']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'guerlain-insolence',
            name: 'Insolence',
            brand: 'Guerlain',
            description: 'Maurice Roucel\'s extrovert violet-iris, a candy-sweet powder puff of playful Guerlain opulence.',
            price: 148.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['playful', 'feminine', 'sweet']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'chloe-chloe-by-chloe',
            name: 'Chloe by Chloe',
            brand: 'Chloe',
            description: 'A classic rose-powder chypre, peony and freesia around a soft rose heart with warm cedar and musk.',
            price: 132.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'feminine', 'elegant']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'chloe-chloe-roses',
            name: 'Chloe Roses',
            brand: 'Chloe',
            description: 'A pure rose eau de toilette, fresh rose and peony over magnolia with a soft amber-musk trail.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'fresh', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'chloe-nomade',
            name: 'Nomade',
            brand: 'Chloe',
            description: 'A chic bohemian chypre, mirabelle plum and freesia over oakmoss, patchouli and sandalwood.',
            price: 142.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bohemian', 'free-spirited', 'elegant']),
            seasonal_indicators: JSON.stringify(['fall', 'spring'])
        },
        {
            id: 'givenchy-irresistible',
            name: 'Irresistible',
            brand: 'Givenchy',
            description: 'Fanny Bal\'s luminous powdery floral, sparkling pear and rose with velvety iris over white musk.',
            price: 144.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['joyful', 'feminine', 'fresh']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'givenchy-linterdit',
            name: 'L\'Interdit',
            brand: 'Givenchy',
            description: 'A voluptuous tuberose built by Dominique Ropion, pear and black currant over orange blossom, vetiver and patchouli.',
            price: 140.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'seductive', 'glamorous']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'ysl-libre-absolu-platine',
            name: 'Libre Absolu Platine',
            brand: 'Yves Saint Laurent',
            description: 'A sharper, more metallic Libre, lavender and ginger frozen over orange blossom, jasmine and vanilla.',
            price: 158.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'confident', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'lancome-la-vie-est-belle-elixir',
            name: 'La Vie Est Belle Elixir',
            brand: 'Lancome',
            description: 'An intensified La Vie Est Belle, pear and praline deepened with iris, orange blossom and smoky benzoin.',
            price: 152.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['joyful', 'sweet', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'dior-miss-dior-blooming-bouquet',
            name: 'Miss Dior Blooming Bouquet',
            brand: 'Dior',
            description: 'A tender blush bouquet, peony and rose with cherry blossom on fresh mandarin and white musk.',
            price: 148.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'fresh', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'dg-devotion',
            name: 'Devotion',
            brand: 'Dolce & Gabbana',
            description: 'An edible Sicilian gourmand, candied orange and marzipan over jasmine, vanilla and warm butter.',
            price: 156.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'sweet', 'cozy']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'burberry-her',
            name: 'Burberry Her',
            brand: 'Burberry',
            description: 'Francis Kurkdjian\'s modern fruity-floral, juicy berries and violet over musk, amber and sandalwood.',
            price: 154.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['playful', 'feminine', 'modern']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'amouage-guidance',
            name: 'Guidance',
            brand: 'Amouage',
            description: 'Cecile Krakower\'s soaring amber-rose, saffron and pear lifted over hazelnut, tonka and creamy sandalwood.',
            price: 345.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'elegant', 'mysterious']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'creed-carmine',
            name: 'Carmine',
            brand: 'Creed',
            description: 'Olivier Creed\'s femme fatale rose-amber, ylang-ylang and tuberose over warm amber, vanilla and sandalwood.',
            price: 360.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['glamorous', 'opulent', 'seductive']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'atelier-cologne-musc-noble',
            name: 'Musc Noble',
            brand: 'Atelier Cologne',
            description: 'A refined musk cologne, bergamot and saffron glowing over clean white musk, amber and sandalwood.',
            price: 168.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['clean', 'elegant', 'refined']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'lattafa-amirat-al-arab',
            name: 'Amirat Al Arab',
            brand: 'Lattafa',
            description: 'An opulent Arabian floral-oud, rose and jasmine laced with saffron over smoky oud, amber and vanilla.',
            price: 32.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['opulent', 'exotic', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'lattafa-yara-moi',
            name: 'Yara Moi',
            brand: 'Lattafa',
            description: 'A creamy sparkling flanker to Yara, pear and jasmine over gardenia, vanilla and white musk.',
            price: 32.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['fresh', 'creamy', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'lattafa-yara',
            name: 'Yara',
            brand: 'Lattafa',
            description: 'An addictive powdery floral-gourmand, tangerine and orchid melting into musk, vanilla and caramel.',
            price: 30.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['sweet', 'cozy', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'paco-rabanne-pure-xs',
            name: 'Pure XS',
            brand: 'Paco Rabanne',
            description: 'An intimate take on excess, ginger and white truffle with jasmine and caramelized vanilla.',
            price: 115.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sensual', 'bold', 'seductive']),
            seasonal_indicators: JSON.stringify(['fall', 'winter', 'evening'])
        },
        {
            id: 'chance-eau-splendide',
            name: 'Chance Eau Splendide',
            brand: 'Chanel',
            description: 'A sparkling 2025 flanker of Chance, juicy red berries and raspberry with rose, violet and peach over iris, rose geranium, white musk and cedar.',
            price: 185.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'elegant', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'ysl-libre-vanille-couture',
            name: 'Libre Vanille Couture',
            brand: 'Yves Saint Laurent',
            description: 'A couture twist on Libre, lavender and orange blossom wrapped in creamy vanilla, warm amber and white musk.',
            price: 168.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['glamorous', 'warm', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'versace-eros-najim',
            name: 'Eros Najim',
            brand: 'Versace',
            description: 'A caramel-drenched Eros, mandarin and warm spices over oud, incense, vanilla and amber.',
            price: 135.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'warm', 'seductive']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'dior-miss-dior-absolutely-blooming',
            name: 'Miss Dior Absolutely Blooming',
            brand: 'Dior',
            description: 'A radiant bouquet of Damask and Grasse roses, peony and cherry blossom over raspberry, black currant and peach.',
            price: 158.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'feminine', 'glamorous']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'armani-rouge-malachite',
            name: 'Rouge Malachite',
            brand: 'Giorgio Armani',
            description: 'The creamy tuberose star of Armani Privé, lush tuberose and tiare flower over milky sandalwood, vanilla and white amber.',
            price: 240.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'creamy', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'evening'])
        },
        {
            id: 'armani-blanc-kogane',
            name: 'Blanc Kogane',
            brand: 'Giorgio Armani',
            description: 'A luminous white floral, neroli and ylang-ylang over jasmine and white musk on clean woods.',
            price: 240.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'luminous', 'refined']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'givenchy-irresistible-nude-velvet',
            name: 'Irresistible Nude Velvet',
            brand: 'Givenchy',
            description: 'A satin-soft Irresistible, juicy pear and ambrette over neroli, iris, rose and rice powder on cedar and white musk.',
            price: 152.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['soft', 'feminine', 'elegant']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'lancome-idole-power',
            name: 'Idole Power',
            brand: 'Lancome',
            description: 'A powerful upgrade of Idôle, juicy pear and bergamot over rose, iris and jasmine with a radiant musk-cedar base.',
            price: 155.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['empowering', 'feminine', 'radiant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'estee-lauder-modern-muse',
            name: 'Modern Muse',
            brand: 'Estee Lauder',
            description: 'A sophisticated muse, mandarin and honeysuckle over jasmine, tuberose and vanilla with a sheer musk-woody trail.',
            price: 145.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sophisticated', 'elegant', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'burberry-my-burberry',
            name: 'My Burberry',
            brand: 'Burberry',
            description: 'A London garden in the rain, sweet pea and lemon flower over freesia, damask rose, geranium leaf and patchouli.',
            price: 148.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'feminine', 'elegant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'hermes-barenia',
            name: 'Barenia',
            brand: 'Hermès',
            description: 'Hermès saddle leather wrapped in hawthorn, myrtle and warm woods, the smell of a perfectly worn bridle.',
            price: 145.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['refined', 'sophisticated', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'jpg-le-male-elixir-absolu',
            name: 'Le Male Elixir Absolu',
            brand: 'Jean Paul Gaultier',
            description: 'A heady Le Male, plum and cinnamon over lavender, davana and artemisia with a tonka, benzoin and patchouli drydown.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'masculine', 'seductive']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'azzaro-forever-wanted-elixir',
            name: 'Forever Wanted Elixir',
            brand: 'Azzaro',
            description: 'A richer Forever Wanted, red fruits and mandarin over lavender, cinnamon and iris, drying into amber, tonka and suede leather.',
            price: 88.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'warm', 'modern']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'amouage-epic',
            name: 'Epic',
            brand: 'Amouage',
            description: 'An opulent caravanserai, pink pepper and saffron over rose, geranium and jasmine with a resinous amber, frankincense and musk base.',
            price: 305.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['regal', 'opulent', 'mysterious']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'amouage-purpose-50',
            name: 'Purpose 50',
            brand: 'Amouage',
            description: 'Amouage\'s 50% extrait, frankincense and pimento over sandalwood, papyrus and rose with a suede, saffron and vanilla base.',
            price: 380.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'earthy', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'mab-ganymede',
            name: 'Ganymede',
            brand: 'Marc-Antoine Barrois',
            description: 'Quentin Bisch\'s futuristic skin-scent, saffron and mandarin over violet leaves, suede and a metallic woods-musk drydown.',
            price: 265.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['modern', 'sophisticated', 'intriguing']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'maison-crivelli-oud-maracuja',
            name: 'Oud Maracujá',
            brand: 'Maison Crivelli',
            description: 'A passionfruit-greedy oud, juicy maracuja and bergamot over smoky oud, leather, vanilla and sandalwood.',
            price: 260.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'exotic', 'sensual']),
            seasonal_indicators: JSON.stringify(['fall', 'evening'])
        },
        {
            id: 'elisire-ambre-nomade',
            name: 'Ambre Nomade',
            brand: 'Elisire',
            description: 'A nomad\'s amber caravan, saffron and davana over rose and vanilla, smoldering into benzoin, patchouli and labdanum.',
            price: 220.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'spicy', 'bohemian']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'al-majed-oud-cuir',
            name: 'Cuir',
            brand: 'Al Majed Oud',
            description: 'A supple leather-saffron, Damascus rose and spices over smooth leather, oud and warm amber woods.',
            price: 175.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'leathery', 'warm']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'giardini-bianco-latte',
            name: 'Bianco Latte',
            brand: 'Giardini di Toscana',
            description: 'A drinkable white gourmand, honey and caramelized vanilla over sandalwood, musk and balsamic resins.',
            price: 160.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['cozy', 'sweet', 'creamy']),
            seasonal_indicators: JSON.stringify(['winter', 'fall'])
        },
        {
            id: 'sospiro-accento',
            name: 'Accento',
            brand: 'Sospiro',
            description: 'A radiant crowd-pleaser, pineapple and bergamot with pink pepper and iris over a warm amber-musk-vanilla base.',
            price: 230.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['radiant', 'elegant', 'fresh']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'gisada-ambassador',
            name: 'Ambassador',
            brand: 'Gisada',
            description: 'A confident opening of apple and bergamot with cardamom and violet over a dry cedar, vetiver and amber base.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['confident', 'fresh', 'masculine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'guerlain-rose-amira',
            name: 'Rose Amira',
            brand: 'Guerlain',
            description: 'A velvety rose from Absolus Allegoria, Damask rose over frankincense, patchouli and clean musk.',
            price: 185.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'elegant', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'jacadi-tout-petit',
            name: 'Tout Petit',
            brand: 'Jacadi',
            description: 'Jacadi\'s signature baby eau de toilette, a soft citrus-floral veil of lemon, bergamot and orange blossom over warm musk and cedar.',
            price: 45.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['fresh', 'delicate', 'playful']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'amouage-opus-v',
            name: 'Opus V',
            brand: 'Amouage',
            description: 'Alberto Morillas\' violet-root symphony, iris and rose over a soft leather, ambergris and orris base, the fifth chapter of Amouage\'s opus.',
            price: 330.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'elegant', 'woody']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'amouage-existence',
            name: 'Existence',
            brand: 'Amouage',
            description: 'A 2025 feminine addition to the house, silky iris and jasmine over cacao, vanilla and sandalwood with a soft amber-musk glow.',
            price: 345.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'creamy', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'gissah-imperial-valley',
            name: 'Imperial Valley',
            brand: 'Gissah',
            description: 'A sunny citrus-gourmand, green apple and mandarin over sage, violet leaf and ginger with a cedar, amber and musk base.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'sunny', 'vibrant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'tada-rose-thorns',
            name: 'Rose & Thorns',
            brand: 'Tada',
            description: 'An haute-couture rose, thorned with pink pepper and castoreum over jasmine, orris and a sandalwood-musk base.',
            price: 560.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'bold', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'evening'])
        },
        {
            id: 'bvlgari-tygar',
            name: 'Tygar',
            brand: 'Bvlgari',
            description: 'Jacques Cavallier\'s translucent grapefruit-ambroxan signature, sparkling Calabrian bergamot over vetiver and olibanum.',
            price: 185.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'elegant', 'vibrant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'lv-pacific-chill',
            name: 'Pacific Chill',
            brand: 'Louis Vuitton',
            description: 'Jacques Cavallier\'s cold-pressed California dream, citrus and apricot lifted by basil, mint and blackcurrant over musky woods.',
            price: 400.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'sunny', 'joyful']),
            seasonal_indicators: JSON.stringify(['summer'])
        },
        {
            id: 'burberry-goddess',
            name: 'Goddess',
            brand: 'Burberry',
            description: 'A triple vanilla tribute to the goddess within, lavender and ginger over three expressions of vanilla with cacao and musk.',
            price: 135.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['cozy', 'warm', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'narciso-all-of-me',
            name: 'All of Me',
            brand: 'Narciso Rodriguez',
            description: 'A radiant tribute to love, orange blossom and jasmine over white amber, sandalwood and the house\'s signature musk.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'soft', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'evening'])
        },
        {
            id: 'narciso-poudree',
            name: 'Poudrée',
            brand: 'Narciso Rodriguez',
            description: 'A powdery musk classic, orange blossom and jasmine dusted with heliotrope and orris over the signature narciso musk.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['soft', 'powdery', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'winter'])
        },
        {
            id: 'ch-la-bomba',
            name: 'La Bomba',
            brand: 'Carolina Herrera',
            description: 'The 2024 feminine explosion, pink pepper and raspberry over jasmine, peony and vanilla with a cacao-sandalwood base.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'confident', 'feminine']),
            seasonal_indicators: JSON.stringify(['evening', 'summer'])
        },
        {
            id: 'pdm-oriana',
            name: 'Oriana',
            brand: 'Parfums de Marly',
            description: 'A princess of pink fluff, raspberry and bergamot over orange blossom, jasmine and iris with marshmallow, vanilla and musk.',
            price: 309.99,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sweet', 'feminine', 'playful']),
            seasonal_indicators: JSON.stringify(['winter', 'evening'])
        },
        {
            id: 'paco-olympea',
            name: 'Olympea',
            brand: 'Paco Rabanne',
            description: 'A goddess of salt and vanilla, green mandarin and water jasmine over salted caramel, cashmeran and ambergris.',
            price: 99.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sensual', 'feminine', 'warm']),
            seasonal_indicators: JSON.stringify(['summer', 'evening'])
        },
        {
            id: 'lattafa-eclaire',
            name: 'Eclaire',
            brand: 'Lattafa',
            description: 'A creamy vanilla bomb of milk, hazelnut and caramel over vanilla, tonka and sandalwood, a favorite cozy winter gourmand.',
            price: 35.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['cozy', 'sweet', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'jpg-la-belle',
            name: 'La Belle',
            brand: 'Jean Paul Gaultier',
            description: 'A pear-bitten seduction, bergamot and juicy pear over vanilla, tonka and vetiver, the softer, sweeter soul of Scandal.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sweet', 'seductive', 'feminine']),
            seasonal_indicators: JSON.stringify(['evening', 'fall'])
        },
        {
            id: 'ysl-black-opium-over-red',
            name: 'Black Opium Over Red',
            brand: 'Yves Saint Laurent',
            description: 'A scarlet Black Opium, blood orange and sour cherry drenched in black vanilla, coffee and tonka with a flash of pink pepper.',
            price: 128.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'sweet', 'mysterious']),
            seasonal_indicators: JSON.stringify(['evening', 'fall'])
        },
        {
            id: 'dg-light-blue',
            name: 'Light Blue',
            brand: 'Dolce & Gabbana',
            description: 'The Mediterranean in a bottle, Sicilian lemon and Granny Smith apple over jasmine, white rose, cedar and amber musk.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'sunny', 'joyful']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'tf-ombre-leather',
            name: 'Ombré Leather',
            brand: 'Tom Ford',
            description: 'A molten black-leather jacket, cardamom and jasmine over a supple leather accord, patchouli, vetiver and amber.',
            price: 215.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'edgy', 'masculine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'tf-jasmin-rouge',
            name: 'Jasmin Rouge',
            brand: 'Tom Ford',
            description: 'A heady, solar jasmine — sambac and sambac absolute with ginger, cardamom, bitter orange and ylang over warm amber and vanilla.',
            price: 215.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sensual', 'floral', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'evening'])
        },
        {
            id: 'kayali-vanilla-candy-42',
            name: 'Vanilla Candy Rock Sugar 42',
            brand: 'Kayali',
            description: 'The viral "orange creamsicle" favorite, pink pepper and raspberry over vanilla, coconut, cotton candy and caramel.',
            price: 145.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sweet', 'playful', 'cozy']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'ck-euphoria',
            name: 'Euphoria',
            brand: 'Calvin Klein',
            description: 'A shimmering, sensual eau, pomegranate and persimmon over black orchid and amber with mahogany and creamy musk.',
            price: 72.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sensual', 'mysterious', 'elegant']),
            seasonal_indicators: JSON.stringify(['evening', 'fall'])
        },
        {
            id: 'joop-red-king',
            name: 'Homme Red King',
            brand: 'Joop!',
            description: 'A juicy red-fruit joop, red apple and cinnamon over geranium, sandalwood and tonka with a sparkling ginger opening.',
            price: 48.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['bold', 'fruity', 'fresh']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'shiseido-grinza-datura',
            name: 'Grinza Datura',
            brand: 'Shiseido',
            description: 'A cult green-floral from the Ginza line, galbanum and green leaves over narcotic white datura flowers with warm musk and woods.',
            price: 165.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'floral', 'green']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'chanel-no1',
            name: 'N°1',
            brand: 'Chanel',
            description: 'Olivier Polge\'s ode to the red camellia, jasmine and rose over iris, sandalwood and white musk with a soft vanilla glow.',
            price: 195.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'floral', 'feminine']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'chanel-chance',
            name: 'Chance',
            brand: 'Chanel',
            description: 'Pineapple and iris whirling through white musk and vetiver, a luminous call to serendipity from Chanel.',
            price: 105.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['fresh', 'floral', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'ysl-y-edp-intense',
            name: 'Y Eau de Parfum Intense',
            brand: 'Yves Saint Laurent',
            description: 'Ginger and sage sharpened over amberwood and tonka, the Y signature on overdrive.',
            price: 89.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['confident', 'masculine', 'energetic']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'arm-swy-tobacco',
            name: 'Stronger With You Tobacco',
            brand: 'Giorgio Armani',
            description: 'Pink pepper and cardamom igniting tobacco leaf over vanilla and tonka, the strong one in smoke and amber.',
            price: 85.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['warm', 'masculine', 'cozy']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'arm-swy-absolutely',
            name: 'Stronger With You Absolutely',
            brand: 'Giorgio Armani',
            description: 'Rum and elemi cut through lavender with Madagascan vanilla and chestnut, an absolutely decadent amber.',
            price: 85.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['warm', 'sensual', 'opulent']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'arm-swy-parfum',
            name: 'Stronger With You Parfum',
            brand: 'Giorgio Armani',
            description: 'Pink pepper and mandarin warming into lavender, sage, chestnut and vanilla, the strong one at its richest.',
            price: 110.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['intimate', 'warm', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'dior-bois-talisman',
            name: 'Bois Talisman',
            brand: 'Dior',
            description: 'Pink pepper and juniper over amber woods and vanilla from the Dior collection privee.',
            price: 110.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'elegant', 'mysterious']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'arm-bleu-lazuli',
            name: 'Bleu Lazuli',
            brand: 'Giorgio Armani',
            description: 'Vanilla, amber and tonka threaded with praline and chestnut, a softly radiant Armani Prive.',
            price: 175.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'elegant', 'soft']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'ysl-libre-berry-crush',
            name: 'Libre Berry Crush',
            brand: 'Yves Saint Laurent',
            description: 'Raspberry crushed into lavender and orange blossom with vanilla and amber, the Libre icon in berry tones.',
            price: 128.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['floral', 'feminine', 'playful']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'givenchy-gentleman-society',
            name: 'Gentleman Society',
            brand: 'Givenchy',
            description: 'Bergamot and cardamom meeting iris and lavender over amberwood and vanilla, the gentleman in power tailoring.',
            price: 79.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['elegant', 'masculine', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'guerlain-santal-royal',
            name: 'Santal Royal',
            brand: 'Guerlain',
            description: 'Peach and rose folding into creamy sandalwood with patchouli and white musk.',
            price: 145.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'woody', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'tf-costa-azzurra',
            name: 'Costa Azzurra',
            brand: 'Tom Ford',
            description: 'Driftwood and sea notes carried on cypress, myrtle and oakmoss, the Tuscan coast bottled.',
            price: 145.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'aquatic', 'relaxed']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'tf-noir',
            name: 'Noir',
            brand: 'Tom Ford',
            description: 'Mandarin and black pepper over violet, vanilla, amber and cedar, a film noir romance in dark formalwear.',
            price: 145.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'elegant', 'spicy']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'tf-vanilla-sex',
            name: 'Vanilla Sex',
            brand: 'Tom Ford',
            description: 'Madagascan vanilla absolute over sandalwood and neroli, vanilla stripped naked and unapologetic.',
            price: 155.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'sensual', 'bold']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'tf-beau-de-jour',
            name: 'Beau de Jour',
            brand: 'Tom Ford',
            description: 'Lavender and rosemary over mint, basil, geranium and oakmoss, a barbershop fougere polished to a shine.',
            price: 145.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'masculine', 'refined']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'paco-phantom-elixir',
            name: 'Phantom Elixir',
            brand: 'Paco Rabanne',
            description: 'Smoked lavender and lemon plunging into vanilla, amber, patchouli and leather, the robot idol reborn dark.',
            price: 75.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['bold', 'mysterious', 'modern']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'dg-the-one-mysterious-night',
            name: 'The One Mysterious Night',
            brand: 'Dolce & Gabbana',
            description: 'Tobacco, oud and leather rising over cardamom with amber and vanilla, The One after midnight.',
            price: 72.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['mysterious', 'warm', 'daring']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'dg-the-only-one',
            name: 'The Only One',
            brand: 'Dolce & Gabbana',
            description: 'Violet and iris suspended over coffee, tonka and vanilla, an indulgent ode to the one that got away.',
            price: 72.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['romantic', 'elegant', 'feminine']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'ck-beauty',
            name: 'Beauty',
            brand: 'Calvin Klein',
            description: 'Peony and rose over sandalwood, vanilla, amber and white musk, beauty turned inside out.',
            price: 55.0,
            category: 'designer',
            mood_indicators: JSON.stringify(['feminine', 'floral', 'refined']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'pdm-delina',
            name: 'Delina',
            brand: 'Parfums de Marly',
            description: 'Lychee and rhubarb sparkling through Turkish rose and peony with vanilla, musk and cashmeran.',
            price: 259.99,
            category: 'luxury',
            mood_indicators: JSON.stringify(['feminine', 'bold', 'floral']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'initio-oud-for-happiness',
            name: 'Oud for Happiness',
            brand: 'Initio Parfums Prives',
            description: 'Saffron and rose sweetened with cinnamon over oud, vanilla and amber, the oud of joy.',
            price: 349.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'joyful', 'woody']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'roja-magenta-tanzanite',
            name: 'Magenta Tanzanite',
            brand: 'Roja Parfums',
            description: 'Bergamot opening onto rose and jasmine with amber, vetiver, patchouli and musk, regally colorful.',
            price: 345.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'elegant', 'colorful']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'montale-black-oud',
            name: 'Black Oud',
            brand: 'Montale',
            description: 'Oud and sandalwood darkened with amber, musk and patchouli, a midnight oud with a smoldering heart.',
            price: 120.0,
            category: 'niche',
            mood_indicators: JSON.stringify(['mysterious', 'woody', 'smoky']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'mancera-precious-oud',
            name: 'Precious Oud',
            brand: 'Mancera',
            description: 'Whiskey and leather laced with bergamot, tiramisu and rose over vanilla, amber and sandalwood.',
            price: 99.0,
            category: 'niche',
            mood_indicators: JSON.stringify(['rich', 'woody', 'gourmand']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'crivelli-oud-cadenza',
            name: 'Oud Cadenza',
            brand: 'Maison Crivelli',
            description: 'Saffron, cinnamon and cardamom over dates, caramel and agarwood with vanilla, tonka, cacao and leather.',
            price: 190.0,
            category: 'niche',
            mood_indicators: JSON.stringify(['warm', 'spicy', 'luxurious']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'lp-summer-hammer',
            name: 'Summer Hammer',
            brand: 'Lorenzo Pazzaglia',
            description: 'Bergamot, lemon and pear dashed with sea salt and marine notes over musk and amber, a hammered Mediterranean summer.',
            price: 175.0,
            category: 'niche',
            mood_indicators: JSON.stringify(['fresh', 'aquatic', 'energetic']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'rosendo-mateu-no5-elixir',
            name: 'Nº 5 Elixir',
            brand: 'Rosendo Mateu',
            description: 'Saffron and spice warming into lily-of-the-valley with vanilla, amber, tonka and strawberry, a golden elixir.',
            price: 240.0,
            category: 'niche',
            mood_indicators: JSON.stringify(['elegant', 'warm', 'spicy']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'lv-elves',
            name: 'eLVes',
            brand: 'Louis Vuitton',
            description: 'Peach and black currant with ginger and cinnamon melting into rose, coconut milk and violet.',
            price: 285.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['opulent', 'floral', 'exotic']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'lancome-midnight-rose',
            name: 'Midnight Rose',
            brand: 'Lancome',
            description: 'Raspberry and pink pepper igniting rose and peony over woods and amber, Tresor after dark.',
            price: 72.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['romantic', 'floral', 'fruity']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'narciso-fleur-musc',
            name: 'Fleur Musc',
            brand: 'Narciso Rodriguez',
            description: 'Rose and jasmine floating in a veil of amber musk, the house signature in white florals.',
            price: 72.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['soft', 'floral', 'musky']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'ch-good-girl-blush',
            name: 'Good Girl Blush',
            brand: 'Carolina Herrera',
            description: 'Pink pepper and bergamot over orange blossom, peony and jasmine with tonka and amber, the stiletto in blush.',
            price: 89.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['floral', 'feminine', 'playful']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'ch-good-girl-elixir',
            name: 'Good Girl Elixir',
            brand: 'Carolina Herrera',
            description: 'Cherry and almond folded into orange blossom, vanilla and tonka, Good Girl at its sweetest.',
            price: 89.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sweet', 'feminine', 'cozy']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'elie-saab-le-parfum',
            name: 'Le Parfum',
            brand: 'Elie Saab',
            description: 'Orange blossom lifted with bergamot over jasmine, rose, cedar and honey, couture in one radiant note.',
            price: 89.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'floral', 'radiant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'sisley-eau-du-soir',
            name: 'Eau du Soir',
            brand: 'Sisley',
            description: 'Citrus and aldehydes with jasmine, rose and iris sinking into vetiver, oakmoss, amber and musk, a Parisian evening.',
            price: 150.0,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sophisticated', 'chypre', 'evening']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'valentino-extradose',
            name: 'Born in Roma Uomo Extradose',
            brand: 'Valentino',
            description: 'Bergamot and mandarin sharpened with lavandin over vetiver and guaiac wood, the Roman statement on overdrive.',
            price: 79.0,
            category: 'affordable',
            mood_indicators: JSON.stringify(['bold', 'masculine', 'energetic']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'valentino-valentina-assoluto',
            name: 'Valentina Assoluto',
            brand: 'Valentino',
            description: 'Truffle and peach with vanilla, tuberose and jasmine over patchouli, oakmoss and cedar.',
            price: 79.0,
            category: 'affordable',
            mood_indicators: JSON.stringify(['feminine', 'elegant', 'sensual']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'jpg-sph-absolu',
            name: 'Scandal Pour Homme Absolu',
            brand: 'Jean Paul Gaultier',
            description: 'Cardamom and bergamot warmed by honey and cinnamon over tonka, amberwood and patchouli, the scandal in absolute form.',
            price: 89.0,
            category: 'affordable',
            mood_indicators: JSON.stringify(['bold', 'sweet', 'daring']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'jacadi-mademoiselle',
            name: 'Mademoiselle',
            brand: 'Jacadi',
            description: 'Orange blossom and lily-of-the-valley over rose and white musk, a powder-soft floral for a little demoiselle.',
            price: 28.0,
            category: 'affordable',
            mood_indicators: JSON.stringify(['gentle', 'floral', 'fresh']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'el-nabil-musc-sultan',
            name: 'Musc Sultan',
            brand: 'El Nabil',
            description: 'Nutmeg and pink pepper with mint and citrus melting into jasmine and cedar with olibanum, musk and patchouli.',
            price: 30.0,
            category: 'affordable',
            mood_indicators: JSON.stringify(['warm', 'mysterious', 'oriental']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'lacoste-l1212-bleu',
            name: 'L.12.12 Bleu',
            brand: 'Lacoste',
            description: 'Grapefruit and mint over sage and orange blossom with fern, patchouli and Virginia cedar, the polo in crisp blue.',
            price: 55.0,
            category: 'affordable',
            mood_indicators: JSON.stringify(['fresh', 'masculine', 'casual']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'creation-lamis-diable-bleu',
            name: 'Diable Bleu',
            brand: 'Creation Lamis',
            description: 'A fresh modern masculine, mandarin and lavender over geranium and nutmeg with a patchouli, tonka and amber base.',
            price: 45.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['fresh', 'masculine', 'vibrant']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'parfums-de-marly-althair',
            name: 'Althair',
            brand: 'Parfums de Marly',
            description: 'A warm amber gourmand of Italian bergamot, lavender and lily of the valley over vanilla, guaiac wood and tonka bean.',
            price: 260.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['warm', 'elegant', 'addictive']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'chanel-allure-homme-sport',
            name: 'Allure Homme Sport',
            brand: 'Chanel',
            description: 'A fresh sporty woody scent with orange, sea notes, aldehydes, pepper, tonka bean and white musk.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'energetic', 'sporty']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'chanel-bleu-de-chanel',
            name: 'Bleu de Chanel',
            brand: 'Chanel',
            description: 'A refined blue woody aromatic with grapefruit, lemon, mint, ginger, incense and sandalwood.',
            price: 140.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sophisticated', 'fresh', 'versatile']),
            seasonal_indicators: JSON.stringify(['spring', 'summer', 'fall'])
        },
        {
            id: 'louis-vuitton-imagination',
            name: 'Imagination',
            brand: 'Louis Vuitton',
            description: 'A sparkling citrus aromatic with bergamot, citron, ginger, black tea, ambroxan and warm woods.',
            price: 280.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'refined', 'clean']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'ralph-lauren-polo-blue',
            name: 'Polo Blue',
            brand: 'Ralph Lauren',
            description: 'A crisp aquatic aromatic with melon, cucumber, sage, geranium, suede, musk and wood notes.',
            price: 95.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'clean', 'casual']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'armani-acqua-di-gio-profondo',
            name: 'Acqua di Giò Profondo',
            brand: 'Giorgio Armani',
            description: 'A deep aquatic aromatic with marine notes, bergamot, mandarin, rosemary, cypress and patchouli.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['fresh', 'intense', 'aquatic']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        },
        {
            id: 'dior-sauvage-elixir',
            name: 'Sauvage Elixir',
            brand: 'Dior',
            description: 'An intense aromatic fougere with grapefruit, cinnamon, nutmeg, lavender, sandalwood, licorice and tonka bean.',
            price: 160.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bold', 'intense', 'powerful']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'hugo-boss-bottled',
            name: 'Boss Bottled',
            brand: 'Hugo Boss',
            description: 'A warm oriental woody with apple, plum, cinnamon, mahogany, vanilla and sandalwood.',
            price: 85.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['masculine', 'classic', 'elegant']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'bvlgari-luminous-night',
            name: 'Luminous Night',
            brand: 'Bvlgari',
            description: 'A sparkling citrus woody with neroli, white tobacco, warm spices, amber and vetiver.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['bright', 'elegant', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'valentino-donna',
            name: 'Valentino Donna',
            brand: 'Valentino',
            description: 'An elegant floral amber with rose, iris, bergamot, orange blossom, vanilla, patchouli and leather.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['feminine', 'elegant', 'sensual']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'paco-rabanne-olympea',
            name: 'Olympéa',
            brand: 'Paco Rabanne',
            description: 'A sensual salty vanilla floral with mandarin, jasmine, salt flower, vanilla and cashmeran.',
            price: 100.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sensual', 'glamorous', 'warm']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'viktor-rolf-flowerbomb',
            name: 'Flowerbomb',
            brand: 'Viktor & Rolf',
            description: 'An explosive floral bouquet of jasmine, rose, freesia, orchid and patchouli over warm amber.',
            price: 130.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['feminine', 'romantic', 'bold']),
            seasonal_indicators: JSON.stringify(['spring', 'fall'])
        },
        {
            id: 'kilian-love-dont-be-shy',
            name: 'Love Don\'t Be Shy',
            brand: 'Kilian',
            description: 'A sugary oriental of orange blossom, neroli, rose, marshmallow, caramel and vanilla musk.',
            price: 250.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['sweet', 'romantic', 'addictive']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'bdk-gris-charnel',
            name: 'Gris Charnel',
            brand: 'BDK Parfums',
            description: 'A creamy spicy woody with cardamom, fig, sandalwood, iris, tonka bean and vanilla.',
            price: 180.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['elegant', 'creamy', 'sophisticated']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'lattafa-kingdom',
            name: 'Kingdom',
            brand: 'Lattafa',
            description: 'A bold oriental with saffron, lavender, tobacco, amber and vanilla for an addictive warm drydown.',
            price: 40.00,
            category: 'affordable',
            mood_indicators: JSON.stringify(['bold', 'warm', 'oriental']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'bvlgari-man-in-black',
            name: 'Man in Black',
            brand: 'Bvlgari',
            description: 'A rich rum leather fragrance with spices, tuberose, tonka bean and benzoin.',
            price: 120.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['mysterious', 'sensual', 'elegant']),
            seasonal_indicators: JSON.stringify(['fall', 'winter'])
        },
        {
            id: 'mugler-alien-goddess',
            name: 'Alien Goddess',
            brand: 'Mugler',
            description: 'A sun-drenched amber floral with bergamot, coconut water, frangipani, jasmine sambac and warm benzoin.',
            price: 110.00,
            category: 'luxury',
            mood_indicators: JSON.stringify(['radiant', 'feminine', 'warm']),
            seasonal_indicators: JSON.stringify(['spring', 'summer'])
        }
    ];

    for (const p of products) {
        await db.run(
            `INSERT INTO products
                (id, name, brand, description, price, category, mood_indicators, seasonal_indicators)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                brand = EXCLUDED.brand,
                description = EXCLUDED.description,
                price = EXCLUDED.price,
                category = EXCLUDED.category,
                mood_indicators = EXCLUDED.mood_indicators,
                seasonal_indicators = EXCLUDED.seasonal_indicators`,
            [
                p.id,
                p.name,
                p.brand,
                p.description,
                p.price,
                p.category,
                p.mood_indicators,
                p.seasonal_indicators
            ]
        );
    }
    console.log('✓ Sample products inserted');
}

// Create admin account (self-healing: falls back to site admin credentials when
// ADMIN_EMAIL/ADMIN_PASSWORD are unset, and promotes an existing matching user)
async function createAdminAccount() {
    const bcrypt = require('bcryptjs');

    const adminEmail = (process.env.ADMIN_EMAIL || 'cherifmed1200@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'medmedmed88';

    if (!adminEmail || !adminPassword) {
        console.log('ℹ️ Skipping admin account creation: admin email/password not configured.');
        return;
    }

    const existing = await db.get('SELECT id, is_admin FROM users WHERE email = $1', [adminEmail]);

    if (existing && existing.is_admin === 1) {
        console.log('✓ Admin account already exists');
        return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (existing) {
        await db.run(
            'UPDATE users SET is_admin = 1, email_verified = 1, password_hash = $1 WHERE id = $2',
            [hashedPassword, existing.id]
        );
        console.log('✓ Existing user promoted to admin');
        return;
    }

    await db.run(
        `INSERT INTO users (first_name, last_name, email, password_hash, email_verified, is_admin, created_at)
         VALUES ($1, $2, $3, $4, 1, 1, NOW())`,
        ['Cherif', 'Med', adminEmail, hashedPassword]
    );
    console.log('✓ Admin account created successfully');
}

// Initialize database
async function initializeDatabase() {
    try {
        console.log('Initializing database...');

        await createTables();
        await createIndexes();
        await insertSampleProducts();
        await createAdminAccount();

        console.log('\n🎉 Database initialized successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

// Run initialization
initializeDatabase();
