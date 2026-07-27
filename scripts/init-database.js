const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database
const db = new sqlite3.Database('./database/parfumerie.db', (err) => {
    if (err) {
        console.error('Error creating database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create tables
const createTables = () => {
    return new Promise((resolve, reject) => {
        let tablesCreated = 0;
        const totalTables = 8;

        const checkComplete = () => {
            tablesCreated++;
            if (tablesCreated === totalTables) {
                resolve();
            }
        };

        // Users table (create first)
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT,
                birthday DATE,
                avatar_url TEXT,
                email_verified BOOLEAN DEFAULT 0,
                verification_code TEXT,
                verification_expires DATETIME,
                is_admin BOOLEAN DEFAULT 0,
                is_banned BOOLEAN DEFAULT 0,
                banned_reason TEXT,
                banned_at DATETIME,
                banned_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                FOREIGN KEY (banned_by) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
                reject(err);
            } else {
                console.log('✓ Users table created');
                checkComplete();
            }
        });

        // User settings table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email_notifications BOOLEAN DEFAULT 1,
                sms_notifications BOOLEAN DEFAULT 0,
                profile_visibility BOOLEAN DEFAULT 1,
                data_collection BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating user_settings table:', err.message);
                reject(err);
            } else {
                console.log('✓ User settings table created');
                checkComplete();
            }
        });

        // User favorites table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, product_id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating user_favorites table:', err.message);
                reject(err);
            } else {
                console.log('✓ User favorites table created');
                checkComplete();
            }
        });

        // Products table (for future use)
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2),
                image_url TEXT,
                category TEXT,
                mood_indicators TEXT, -- JSON string
                seasonal_indicators TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating products table:', err.message);
                reject(err);
            } else {
                console.log('✓ Products table created');
                checkComplete();
            }
        });

        // User sessions table (for session management)
        db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error('Error creating user_sessions table:', err.message);
                reject(err);
            } else {
                console.log('✓ User sessions table created');
                checkComplete();
            }
        });

        // Reviews table (for fragrance reviews)
        db.run(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                user_avatar TEXT,
                fragrance TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error('Error creating reviews table:', err.message);
                reject(err);
            } else {
                console.log('✓ Reviews table created');
                checkComplete();
            }
        });

        // Review likes table for review like/dislike functionality
        db.run(`
            CREATE TABLE IF NOT EXISTS review_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                like_type TEXT NOT NULL CHECK (like_type IN ('like', 'dislike')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(review_id, user_id),
                FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error('Error creating review_likes table:', err.message);
                reject(err);
            } else {
                console.log('✓ Review likes table created');
                checkComplete();
            }
        });

        // Review replies table for nested replies
        db.run(`
            CREATE TABLE IF NOT EXISTS review_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                edited_at DATETIME,
                FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
                FOREIGN KEY (parent_reply_id) REFERENCES review_replies (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error('Error creating review_replies table:', err.message);
                reject(err);
            } else {
                console.log('✓ Review replies table created');
                checkComplete();
            }
        });
    });
};

// Create indexes for better performance
const createIndexes = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', (err) => {
                if (err) console.error('Error creating email index:', err.message);
                else console.log('✓ Email index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)', (err) => {
                if (err) console.error('Error creating user_settings index:', err.message);
                else console.log('✓ User settings index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)', (err) => {
                if (err) console.error('Error creating user_favorites index:', err.message);
                else console.log('✓ User favorites index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)', (err) => {
                if (err) console.error('Error creating user_sessions index:', err.message);
                else console.log('✓ User sessions index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_reviews_fragrance ON reviews(fragrance)', (err) => {
                if (err) console.error('Error creating reviews fragrance index:', err.message);
                else console.log('✓ Reviews fragrance index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)', (err) => {
                if (err) console.error('Error creating reviews user_id index:', err.message);
                else console.log('✓ Reviews user_id index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id)', (err) => {
                if (err) console.error('Error creating review_likes index:', err.message);
                else console.log('✓ Review likes index created');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id)', (err) => {
                if (err) console.error('Error creating review_replies index:', err.message);
                else console.log('✓ Review replies index created');
                resolve();
            });
        });
    });
};

// Insert sample products
const insertSampleProducts = () => {
    return new Promise((resolve, reject) => {
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

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO products 
            (id, name, brand, description, price, category, mood_indicators, seasonal_indicators)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        products.forEach(product => {
            stmt.run([
                product.id,
                product.name,
                product.brand,
                product.description,
                product.price,
                product.category,
                product.mood_indicators,
                product.seasonal_indicators
            ]);
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('Error inserting sample products:', err.message);
                reject(err);
            } else {
                console.log('✓ Sample products inserted');
                resolve();
            }
        });
    });
};

// Create admin account
const createAdminAccount = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminPassword = process.env.ADMIN_PASSWORD;

            if (!adminEmail || !adminPassword) {
                console.log('ℹ️ Skipping admin account creation: set ADMIN_EMAIL and ADMIN_PASSWORD to seed an admin.');
                return resolve();
            }

            const bcrypt = require('bcryptjs');

            // Check if admin already exists
            const existingAdmin = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (existingAdmin) {
                console.log('✓ Admin account already exists');
                resolve();
                return;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            // Create admin user
            const stmt = db.prepare(`
                INSERT INTO users (first_name, last_name, email, password_hash, email_verified, is_admin, created_at)
                VALUES (?, ?, ?, ?, 1, 1, datetime('now'))
            `);

            stmt.run(['Cherif', 'Med', adminEmail, hashedPassword], function(err) {
                if (err) {
                    console.error('Error creating admin account:', err.message);
                    reject(err);
                } else {
                    console.log('✓ Admin account created successfully');
                    resolve();
                }
            });
            stmt.finalize();

        } catch (error) {
            reject(error);
        }
    });
};

// Initialize database
async function initializeDatabase() {
    try {
        console.log('Initializing database...');

        await createTables();
        await createIndexes();
        await insertSampleProducts();
        await createAdminAccount();

        console.log('\n🎉 Database initialized successfully!');
        console.log('You can now start the server with: npm start');

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
            process.exit(0);
        });
    }
}

// Run initialization
initializeDatabase();
