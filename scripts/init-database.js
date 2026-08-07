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
                verification_expires TIMESTAMP,
                is_admin INTEGER DEFAULT 0,
                is_banned INTEGER DEFAULT 0,
                banned_reason TEXT,
                banned_at TIMESTAMP,
                banned_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
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
                created_at TIMESTAMP DEFAULT NOW(),
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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        `
            CREATE TABLE IF NOT EXISTS review_likes (
                id SERIAL PRIMARY KEY,
                review_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                like_type TEXT NOT NULL CHECK (like_type IN ('like', 'dislike')),
                created_at TIMESTAMP DEFAULT NOW(),
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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                edited_at TIMESTAMP,
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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
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
                created_at TIMESTAMP DEFAULT NOW(),
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
                created_at TIMESTAMP DEFAULT NOW()
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

// Create admin account
async function createAdminAccount() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.log('ℹ️ Skipping admin account creation: set ADMIN_EMAIL and ADMIN_PASSWORD to seed an admin.');
        return;
    }

    const bcrypt = require('bcryptjs');

    const existingAdmin = await db.get('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingAdmin) {
        console.log('✓ Admin account already exists');
        return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);
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
