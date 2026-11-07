const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const validator = require("validator");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const compression = require("compression");
const multer = require("multer");
// sharp is a native module. If its prebuilt binary is missing for the host
// platform (a classic serverless failure), a bare require() would throw during
// module load and kill every invocation. Load it defensively instead and let
// the image-optimisation paths degrade to serving the original file.
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn(
    "sharp unavailable, image optimisation disabled:",
    e.code || e.message,
  );
}
const {
  generateVerificationCode,
  sendVerificationEmail,
  sendWelcomeEmail,
} = require("./services/emailService");
const createDOMPurify = require("dompurify");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || "development";

/* Flipped by the loyalty-table migration once loyalty_transactions.purchase_id
   is confirmed to exist. The ledger writer omits that column until then, so a
   request that races the migration still records the point (only the optional
   purchase link is missing) instead of failing with "no such column".
   "Still records the point" was not good enough: an unlinked row can never be
   reversed when its purchase is deleted. So admin purchase writes now WAIT for
   the migration to settle. The timeout keeps a failed/skipped migration from
   hanging those requests forever - in that case the flag stays false and the
   legacy no-link behaviour takes over. */
let loyaltyLedgerHasPurchaseId = false;
let settleLoyaltyLedgerReady;
const loyaltyLedgerReady = new Promise((resolve) => {
  settleLoyaltyLedgerReady = resolve;
});
const loyaltyLedgerReadyTimeout = setTimeout(() => settleLoyaltyLedgerReady(), 8000);
if (typeof loyaltyLedgerReadyTimeout.unref === "function") loyaltyLedgerReadyTimeout.unref();

/* INCIDENT 2026-11-06: the boot-migration block below is gated on
   RUN_BOOT_MIGRATIONS (!process.env.VERCEL), so on Vercel NONE of its
   settleLoyaltyLedgerReady() calls ever run. The only escape hatch was this
   8-second timer, which meant every cold-start POST/DELETE purchase waited
   8s with no feedback. Staff assumed the "Enregistrer" click had failed and
   clicked again, creating a second purchase and a second point.
   On serverless, detect the optional column with one cheap query instead
   (cached for the life of the instance) and let writes proceed immediately. */
if (process.env.VERCEL) {
  clearTimeout(loyaltyLedgerReadyTimeout);
  db.all("PRAGMA table_info(loyalty_transactions)", (err, columns) => {
    if (!err && (columns || []).some((col) => col.name === "purchase_id")) {
      loyaltyLedgerHasPurchaseId = true;
    }
    settleLoyaltyLedgerReady();
  });
}

/* STANDING INTEGRITY ASSERTION — incident 2026-11-06.
 *
 * The defect that ran for three weeks was not wrong arithmetic: it was that
 * `balance == SUM(ledger)` was never checked anywhere, so a balance that no row
 * could explain was invisible until a customer noticed. Fixing the one bug does
 * not fix that; the next silent drift would be just as invisible.
 *
 * So the invariant is asserted once on every boot, in SQL, where application
 * code cannot influence the answer. Read-only, additive and non-blocking: a
 * failure is reported loudly and the server keeps serving. Nothing here can
 * make the site unavailable — but it can make a violation impossible to miss.
 */
function assertLoyaltyInvariant(context) {
  const sql = `
    SELECT c.id, c.card_number, c.points,
           COALESCE(SUM(t.points_change), 0) AS ledger
      FROM loyalty_cards c
      LEFT JOIN loyalty_transactions t ON t.card_id = c.id
     GROUP BY c.id, c.card_number, c.points
    HAVING c.points <> COALESCE(SUM(t.points_change), 0)`;

  try {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.warn(
          `⚠️  Loyalty integrity check could not run (${context}): ${err.message}`,
        );
        return;
      }
      if (!rows || rows.length === 0) {
        console.log(
          `✅ Loyalty integrity OK (${context}): every balance equals its ledger`,
        );
        return;
      }
      console.error(
        `\n🚨 LOYALTY INTEGRITY VIOLATION (${context}) — ` +
          `${rows.length} card(s) hold a balance their ledger cannot explain.`,
      );
      rows.slice(0, 25).forEach((r) => {
        const gap = Number(r.points) - Number(r.ledger);
        console.error(
          `   ${r.card_number}: balance ${r.points}, ledger ${r.ledger}, gap ${gap > 0 ? "+" : ""}${gap}`,
        );
      });
      if (rows.length > 25) console.error(`   … and ${rows.length - 25} more`);
      console.error(
        "   Investigate with: node scripts/check-loyalty-integrity.cjs\n",
      );
    });
  } catch (e) {
    console.warn(
      `⚠️  Loyalty integrity check could not run (${context}): ${e && e.message}`,
    );
  }
}

// Runs once the ledger migration has settled, which is also the point at which
// both loyalty tables are guaranteed to exist. The 8s fallback above means this
// always fires even if a migration silently failed.
loyaltyLedgerReady.then(() => assertLoyaltyInvariant("boot"));

// Both Vercel and Render terminate TLS at their own edge proxy and forward the
// request with an `X-Forwarded-For` header. express-rate-limit v7+ inspects
// that header and, when `trust proxy` is left at its default (false), throws
// `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on every request, and `req.ip` resolves
// to the edge proxy instead of the visitor, which would put all traffic in a
// single rate-limit bucket. Trust exactly one hop: `true` is rejected outright
// by the same validator (ERR_ERL_PERMISSIVE_TRUST_PROXY) because it lets
// anyone spoof their IP.
if (process.env.VERCEL || process.env.RENDER) {
  app.set("trust proxy", 1);
}
// Every browser-facing asset (html, css, js, images, uploads) now lives under
// public/. Vercel REQUIRES this: it serves public/** from its CDN and
// explicitly ignores express.static(). Keeping the same layout on Render means
// one codebase behaves identically on both hosts.
const PUBLIC_DIR = path.join(__dirname, "public");

/* Perfume administration. The catalogue itself is baked into the SPA at build
   time, so the admin's additions live in the database as an overlay that the
   SPA merges on boot. See services/perfumeAdmin.js for the storage rationale. */
const perfumeAdmin = require("./services/perfumeAdmin");
perfumeAdmin.init({
  db,
  sharp,
  staticCataloguePath: path.join(PUBLIC_DIR, "data", "fragrances.json"),
});

/*
 * SERVE_REACT=1 makes "/" serve the document emitted by the React build pipeline
 * (scripts/build-legacy-page.mjs) instead of public/index.html, and tags the response
 * with X-Charme-Render so you can tell which pipeline answered. The two are byte-identical
 * by construction — that parity is the whole point — so the header, not the pixels, is the
 * signal. Default is unchanged: public/index.html.
 */
const REACT_CANDIDATE = path.join(__dirname, "_recon", "legacy-react-candidate.html");
const SERVE_REACT = process.env.SERVE_REACT === "1";
const allowedOrigins = [
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  process.env.RENDER_EXTERNAL_URL,
  // Vercel injects VERCEL_URL (host without protocol) for preview + prod deploys.
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  // VERCEL_URL is the per-deployment host (charme-v2-<hash>.vercel.app), never
  // the stable project alias, so the Origin the browser actually sends is a
  // different string. Cover both explicit aliases plus every generated host.
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null,
  "https://charme-v2.vercel.app",
  "https://charmeperfume.me",
  "https://www.charmeperfume.me",
].filter(Boolean);

// Vercel mints a fresh host for every deployment and preview build, so an
// allow-list of literal strings can never keep up while running there.
const isVercelOrigin = (origin) =>
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.(app|dev)$/i.test(
    String(origin || ""),
  );
const INSECURE_JWT_SECRET_PREFIX =
  "your-super-secret-jwt-key-change-this-in-production";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_SECRET_FILE = path.join(__dirname, ".jwt-secret");
const _missingJwtSecret =
  !JWT_SECRET ||
  JWT_SECRET.length < 32 ||
  JWT_SECRET.startsWith(INSECURE_JWT_SECRET_PREFIX) ||
  JWT_SECRET === "CHANGE_ME_TO_RANDOM_SECRET";

const _persistedJwtSecret = (() => {
  if (!_missingJwtSecret) return null;
  try {
    const value = fs.readFileSync(JWT_SECRET_FILE, "utf8").trim();
    return value.length >= 32 ? value : null;
  } catch {
    return null;
  }
})();

const ACTIVE_JWT_SECRET =
  JWT_SECRET ||
  _persistedJwtSecret ||
  crypto.randomBytes(64).toString("hex");

if (_missingJwtSecret && !_persistedJwtSecret) {
  try {
    fs.writeFileSync(JWT_SECRET_FILE, ACTIVE_JWT_SECRET, {
      encoding: "utf8",
      mode: 0o600,
    });
    console.warn(
      "WARNING: JWT_SECRET is missing or is a placeholder. " +
        "A persistent secret was generated and saved to " +
        JWT_SECRET_FILE +
        " so sessions stay valid across restarts on this filesystem. " +
        "For the definitive fix, set a persistent JWT_SECRET in the environment variables " +
        "(locally: .env file; on Render: Dashboard > Environment).",
    );
  } catch (e) {
    console.warn(
      "WARNING: JWT_SECRET is missing or is a placeholder. " +
        "A temporary secret was generated, but it could not persist to " +
        JWT_SECRET_FILE +
        " (" +
        e.message +
        "), so sessions will NOT survive restarts. " +
        "Set a persistent JWT_SECRET in the environment variables to keep sessions valid.",
    );
  }
} else {
  console.log(
    "JWT secret source: " +
      (JWT_SECRET
        ? "environment variable"
        : _persistedJwtSecret
          ? "persisted file"
          : "newly generated"),
  );
}

if (ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must be set in production");
}

// Setup DOMPurify for server-side HTML sanitization.
//
// jsdom pulls in html-encoding-sniffer -> @exodus/bytes, which ships as
// ESM-only. Runtimes without require(ESM) support (Vercel's Node runtime)
// throw ERR_REQUIRE_ESM while loading this module, which kills every
// invocation with FUNCTION_INVOCATION_FAILED. Load it defensively and fall
// back to the strict allow-list sanitizer below.
const ALLOWED_TAGS = ["b", "i", "em", "strong", "u", "br", "p"];
let DOMPurify = null;
try {
  const { JSDOM } = require("jsdom");
  DOMPurify = createDOMPurify(new JSDOM("").window);
} catch (e) {
  console.warn(
    "jsdom unavailable, using built-in HTML sanitizer:",
    e.code || e.message,
  );
}

// Minimal, attribute-free sanitizer used when jsdom/DOMPurify cannot load.
// It keeps only the allow-listed tags and drops every attribute, so injected
// scripts, event handlers and urls are removed rather than escaped.
function escapeHtmlText(text) {
  return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fallbackSanitize(dirty) {
  let s = String(dirty == null ? "" : dirty);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");

  const allowed = new Set(ALLOWED_TAGS);
  const tagPattern = /<[^>]*>?/g;
  let out = "";
  let last = 0;
  let match;
  while ((match = tagPattern.exec(s)) !== null) {
    out += escapeHtmlText(s.slice(last, match.index));
    const raw = match[0];
    // A real tag has no whitespace straight after "<" or after the slash, so
    // plain prose like "a < b and c > d" stays text and is escaped, not parsed.
    const parsed = raw.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/);
    if (parsed) {
      const name = parsed[2].toLowerCase();
      if (allowed.has(name)) {
        out += parsed[1] ? `</${name}>` : name === "br" ? "<br />" : `<${name}>`;
      }
      // anything else is dropped entirely
    } else {
      out += escapeHtmlText(raw); // stray "<" or malformed tag
    }
    last = match.index + raw.length;
  }
  out += escapeHtmlText(s.slice(last));
  return out;
}

// HTML sanitization function
function sanitizeHtml(dirty) {
  if (DOMPurify) {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: [],
    });
  }
  return fallbackSanitize(dirty);
}

// Multer configuration for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Vercel (serverless) ships a READ-ONLY filesystem: the project dir cannot be
// written, and only /tmp is guaranteed writable (and then only for the life of
// one invocation). Render's free tier DOES allow writes. So target whichever
// the runtime allows, and NEVER let a boot-time mkdir crash the whole deploy.
// Vercel's project dir is read-only; /tmp is the only writable spot (and it is
// wiped between invocations). Everywhere else (Render, local) keep uploads
// inside the repo so a persistent disk can hold them.
const uploadedBase = process.env.VERCEL
  ? path.join("/tmp", "charme")
  : path.join(PUBLIC_DIR, "uploads");
const uploadsDir = path.join(uploadedBase, "uploads", "avatars");
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.warn(
    "uploads dir unavailable (read-only FS?):",
    uploadsDir,
    "-",
    e.code || e.message
  );
  // never throw at boot: multer routes will surface their own error later
}
process.env.CHARME_UPLOADS = uploadsDir; // let other modules honour the same dir

// Ensure database directory exists (fresh clones omit the git-ignored database/).
// Only needed for the SQLite fallback: with DATABASE_URL set we never touch disk.
// MUST stay try/catch — on Vercel the project dir is read-only and an unguarded
// mkdirSync here throws EROFS at module load, which 500s EVERY invocation.
if (!process.env.DATABASE_URL) {
  const dbDir = path.join(__dirname, "database");
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    console.warn(
      "database dir unavailable (read-only FS?):",
      dbDir,
      "-",
      e.code || e.message,
    );
  }
}

// 🔧 Avatar migration function
async function migrateAvatarsToFileSystem() {
  return new Promise((resolve) => {
    db.all(
      'SELECT id, avatar_url FROM users WHERE avatar_url LIKE "data:image%"',
      [],
      async (err, users) => {
        if (err) {
          console.error("❌ Error fetching users for avatar migration:", err);
          return resolve();
        }

        if (users.length === 0) {
          console.log("✅ No base64 avatars found to migrate");
          return resolve();
        }

        console.log(`🔄 Found ${users.length} base64 avatars to migrate`);

        for (const user of users) {
          try {
            // Extract base64 data
            const base64Data = user.avatar_url.split(",")[1];
            if (!base64Data) continue;

            const buffer = Buffer.from(base64Data, "base64");
            const fileName = `avatar_${user.id}_migrated_${Date.now()}_${user.id}.jpg`;
            const filePath = path.join(uploadsDir, fileName);

            // Process and save image
            await sharp(buffer)
              .resize(200, 200, {
                fit: "cover",
                position: "center",
              })
              .jpeg({ quality: 85 })
              .toFile(filePath);

            // Update database
            const newAvatarUrl = `/uploads/avatars/${fileName}`;
            await new Promise((updateResolve) => {
              db.run(
                "UPDATE users SET avatar_url = ? WHERE id = ?",
                [newAvatarUrl, user.id],
                (updateErr) => {
                  if (updateErr) {
                    console.error(
                      `❌ Error updating avatar for user ${user.id}:`,
                      updateErr,
                    );
                  } else {
                    console.log(`✅ Migrated avatar for user ${user.id}`);
                  }
                  updateResolve();
                },
              );
            });
          } catch (error) {
            console.error(
              `❌ Error migrating avatar for user ${user.id}:`,
              error,
            );
          }
        }

        console.log("✅ Avatar migration completed");
        resolve();
      },
    );
  });
}

// Database setup (PostgreSQL)
console.log(
  process.env.DATABASE_URL
    ? "Connected to PostgreSQL database"
    : "WARNING: DATABASE_URL is NOT set on this host - database queries will fail",
);

// Ensure foreign keys are enforced and concurrent writes wait briefly.
// On Vercel (serverless) the schema already exists in Postgres: running ~40
// migration statements on every cold start burns the invocation budget and is
// a needless failure point, so they only run on long-lived hosts.
const RUN_BOOT_MIGRATIONS = !process.env.VERCEL;
if (RUN_BOOT_MIGRATIONS) {
console.log("🔄 Checking for required database migrations...");

// Long-lived hosts can provision the perfume-admin table at boot. Vercel skips
// this block entirely, so every route also awaits the memoised lazy CREATE.
perfumeAdmin.ensureTable().catch((err) =>
  console.warn("⚠️  perfume_admin table not ready at boot:", err.message || err),
);

    // Check existing table structure
    db.all("PRAGMA table_info(reviews)", (err, columns) => {
      if (err) {
        console.error("❌ Error checking reviews table structure:", err);
        return;
      }

      const hasUserEmail = columns.some((col) => col.name === "user_email");
      const hasIsAdmin = columns.some((col) => col.name === "is_admin");
      const hasEditedAt = columns.some((col) => col.name === "edited_at");
      const hasIsEdited = columns.some((col) => col.name === "is_edited");

      // Add missing columns to reviews table
      if (!hasUserEmail) {
        console.log("🔄 Adding user_email column to reviews table...");
        db.run("ALTER TABLE reviews ADD COLUMN user_email TEXT", (err) => {
          if (err) console.error("❌ Error adding user_email column:", err);
          else console.log("✅ Added user_email column to reviews table");
        });
      }

      if (!hasIsAdmin) {
        console.log("🔄 Adding is_admin column to reviews table...");
        db.run(
          "ALTER TABLE reviews ADD COLUMN is_admin INTEGER DEFAULT 0",
          (err) => {
            if (err) console.error("❌ Error adding is_admin column:", err);
            else console.log("✅ Added is_admin column to reviews table");
          },
        );
      }

      if (!hasEditedAt) {
        console.log("🔄 Adding edited_at column to reviews table...");
        db.run("ALTER TABLE reviews ADD COLUMN edited_at DATETIME", (err) => {
          if (err) console.error("❌ Error adding edited_at column:", err);
          else console.log("✅ Added edited_at column to reviews table");
        });
      }

      if (!hasIsEdited) {
        console.log("🔄 Adding is_edited column to reviews table...");
        db.run(
          "ALTER TABLE reviews ADD COLUMN is_edited INTEGER DEFAULT 0",
          (err) => {
            if (err) console.error("❌ Error adding is_edited column:", err);
            else console.log("✅ Added is_edited column to reviews table");
          },
        );
      }
    });

    // Create review_replies table for nested replies
    console.log("🔄 Creating review_replies table...");
    db.run(
      `
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
        `,
      (err) => {
        if (err) console.error("❌ Error creating review_replies table:", err);
        else console.log("✅ Created review_replies table");
      },
    );

    // Create reply_likes table for reply voting
    console.log("🔄 Creating reply_likes table...");
    db.run(
      `
            CREATE TABLE IF NOT EXISTS reply_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reply_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                like_type TEXT NOT NULL CHECK (like_type IN ('like', 'dislike')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(reply_id, user_id),
                FOREIGN KEY (reply_id) REFERENCES review_replies (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
      (err) => {
        if (err) console.error("❌ Error creating reply_likes table:", err);
        else console.log("✅ Created reply_likes table");
      },
    );

    // Create review_likes table used by review like/dislike routes.
    console.log("🔄 Creating review_likes table...");
    db.run(
      `
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
        `,
      (err) => {
        if (err) console.error("❌ Error creating review_likes table:", err);
        else console.log("✅ Created review_likes table");
      },
    );

    // 🎁 CARTE FIDÉLITÉ: loyalty cards + reward history
    console.log("🔄 Setting up loyalty cards tables...");

    // Table creation and index creation are asynchronous in the SQLite fallback.
    // Retry a missing-table index briefly so a fresh install does not permanently
    // lose an optimization just because the CREATE TABLE callback was slower.
    const createIndexWhenReady = (sql, label, retries = 20) => {
      db.run(sql, (err) => {
        if (!err) {
          console.log(`✅ Created ${label} index`);
          return;
        }
        if (/no such table/i.test(err.message || "") && retries > 0) {
          return setTimeout(
            () => createIndexWhenReady(sql, label, retries - 1),
            100,
          );
        }
        console.error(`❌ Error creating ${label} index:`, err);
      });
    };

    // Create the tables first (no-op when they already exist), then inspect the
    // actual schema from the CREATE TABLE callback. This avoids a fresh SQLite
    // startup race where PRAGMA returned an empty/incomplete schema and the
    // migration attempted to add columns that had just been created.
    const ensureLoyaltyCardColumns = () => {
      db.all("PRAGMA table_info(loyalty_cards)", (err, columns) => {
        if (err) {
          console.error("❌ Loyalty schema check failed:", err);
          return;
        }
        const existing = {};
        (columns || []).forEach((col) => {
          existing[col.name] = true;
        });
        const expected = [
          ["holder_name", "TEXT"],
          ["holder_email", "TEXT"],
          ["holder_phone", "TEXT"],
          ["card_number", "TEXT"],
        ];
        const missing = expected.filter(([name]) => !existing[name]);
        if (!missing.length) return;
        console.log(
          `🔄 Upgrading loyalty_cards schema (+${missing.map((m) => m[0]).join(", ")}) — data preserved`,
        );
        const addNext = (i) => {
          if (i >= missing.length) return;
          const [name, type] = missing[i];
          db.run(
            `ALTER TABLE loyalty_cards ADD COLUMN ${name} ${type}`,
            (addErr) => {
              if (addErr)
                console.error(`❌ Error adding loyalty column ${name}:`, addErr);
              else console.log(`✅ Added loyalty column ${name}`);
              addNext(i + 1);
            },
          );
        };
        addNext(0);
      });
    };

    /* Existing installations predate loyalty_transactions.purchase_id. The
       CREATE TABLE above only covers fresh databases, so inspect the real
       schema and add the column (and its index) when missing. PRAGMA is
       translated to information_schema by the Postgres driver, so this same
       check works on both engines. */
    const ensureLoyaltyTransactionColumns = () => {
      db.all("PRAGMA table_info(loyalty_transactions)", (err, columns) => {
        if (err) {
          console.error("❌ Loyalty ledger schema check failed:", err);
          settleLoyaltyLedgerReady();
          return;
        }
        const names = {};
        (columns || []).forEach((col) => {
          names[col.name] = true;
        });
        const indexLedgerPurchases = () => {
          db.run(
            "CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_purchase_id ON loyalty_transactions(purchase_id)",
            (idxErr) => {
              if (idxErr) console.error("❌ Error creating loyalty purchase index:", idxErr);
            },
          );
          loyaltyLedgerHasPurchaseId = true;
          settleLoyaltyLedgerReady();
        };
        if (names.purchase_id) return indexLedgerPurchases();
        db.run(
          "ALTER TABLE loyalty_transactions ADD COLUMN purchase_id INTEGER",
          (addErr) => {
            // A second instance starting at the same time may have won the race.
            if (addErr && !/duplicate column|already exists|column .* of relation/i.test(addErr.message || "")) {
              console.error("❌ Error adding loyalty_transactions.purchase_id:", addErr);
              settleLoyaltyLedgerReady();
              return;
            }
            if (!addErr) console.log("✅ Added loyalty_transactions.purchase_id");
            indexLedgerPurchases();
          },
        );
      });
    };

    const createLoyaltyTables = () => {
      db.run(
        `
            CREATE TABLE IF NOT EXISTS loyalty_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                holder_name TEXT,
                holder_email TEXT,
                holder_phone TEXT,
                card_number TEXT UNIQUE,
                points INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        (createErr) => {
          if (createErr) {
            console.error("❌ Error creating loyalty_cards table:", createErr);
            return;
          }
          console.log("✅ Created loyalty_cards table");
          ensureLoyaltyCardColumns();
        },
      );

      db.run(
        `
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                user_id INTEGER,
                points_change INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
                description TEXT,
                /* Links an "Achat" point to the purchase that earned it, so
                   deleting that purchase can reverse exactly this point. NULL
                   for manual additions, redemptions and legacy rows. */
                purchase_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (card_id) REFERENCES loyalty_cards (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `,
        (createErr) => {
          if (createErr) {
            console.error(
              "❌ Error creating loyalty_transactions table:",
              createErr,
            );
            // No CREATE TABLE callback means the migration below never runs;
            // release the writers rather than leaving them parked until the
            // 8s fallback expires.
            settleLoyaltyLedgerReady();
          } else {
            console.log("✅ Created loyalty_transactions table");
            ensureLoyaltyTransactionColumns();
          }
        },
      );

      // The table may still be completing its asynchronous CREATE TABLE callback
      // on a fresh SQLite database; the helper retries a missing-table error.
      createIndexWhenReady(
        "CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_card_id ON loyalty_transactions(card_id)",
        "loyalty_transactions",
      );
    };

    createLoyaltyTables();

    // 📰 NEWS & NOTIFICATIONS: published announcements (visible to all users)
    console.log("🔄 Setting up news table...");
    db.run(
      `
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_type TEXT NOT NULL DEFAULT 'general',
            badge TEXT,
            icon TEXT,
            color TEXT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            cta_label TEXT,
            cta_url TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
      (createErr) => {
        if (createErr) console.error("❌ Error creating news table:", createErr);
        else console.log("✅ Created news table");
      },
    );

    // 📝 GUEST NOTES: anonymous feedback left by visitors (no auth required)
    console.log("🔄 Setting up guest_notes table...");
    db.run(
      `
        CREATE TABLE IF NOT EXISTS guest_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            author_name TEXT DEFAULT 'Anonymous',
            ip_address TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
      (createErr) => {
        if (createErr) console.error("❌ Error creating guest_notes table:", createErr);
        else console.log("✅ Created guest_notes table");
      },
    );

    // 🛍️ CUSTOMER PURCHASES: tracks what each loyalty card holder bought
    console.log("🔄 Setting up customer_purchases table...");
    db.run(
      `
        CREATE TABLE IF NOT EXISTS customer_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            perfume_name TEXT NOT NULL,
            brand TEXT,
            fragrance_family TEXT,
            audience TEXT,
            purchase_price REAL,
            purchase_date TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES loyalty_cards(id) ON DELETE CASCADE
        )
      `,
      (createErr) => {
        if (createErr) console.error("❌ Error creating customer_purchases table:", createErr);
        else console.log("✅ Created customer_purchases table");
      },
    );

    // Indexes for customer_purchases. On a fresh SQLite database the table
    // callback can complete after this migration block, so retry safely.
    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_customer_purchases_card_id ON customer_purchases(card_id)",
      "customer_purchases",
    );

    // 🕒 STORE SETTINGS: key/value store for configurable store data (store hours, notes, etc.)
    console.log("🔄 Setting up store_settings table...");
    db.run(
      `
        CREATE TABLE IF NOT EXISTS store_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      (createErr) => {
        if (createErr) console.error("❌ Error creating store_settings table:", createErr);
        else {
          console.log("✅ Created store_settings table");
          // Migrate a legacy store_settings table that was created without an id column.
          db.all("PRAGMA table_info(store_settings)", (mErr, cols) => {
            if (mErr) return console.error("❌ Error inspecting store_settings:", mErr);
            const hasId = Array.isArray(cols) && cols.some((c) => c && c.name === "id");
            if (!hasId) {
              console.log("🔄 Migrating store_settings to add id column...");
              db.run('DROP TABLE IF EXISTS store_settings', (dErr) => {
                if (dErr) return console.error("❌ Error dropping store_settings:", dErr);
                db.run(
                  `CREATE TABLE store_settings (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      key TEXT UNIQUE NOT NULL,
                      value TEXT NOT NULL,
                      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                  )`,
                  (c2Err) => {
                    if (c2Err) console.error("❌ Error recreating store_settings:", c2Err);
                    else console.log("✅ Recreated store_settings with id column");
                  },
                );
              });
            }
          });
        }
      },
    );

    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_customer_purchases_family ON customer_purchases(fragrance_family)",
      "customer_purchases family",
    );

    // 🔧 ENHANCED: Create indexes for better performance
    console.log("🔄 Creating database indexes for better performance...");

    // These CREATE INDEX calls can race CREATE TABLE on a fresh SQLite fallback
    // database. Retry only the expected missing-table condition; other errors are
    // surfaced immediately instead of being silently swallowed.
    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id)",
      "review_replies",
    );
    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id)",
      "review_replies user_id",
    );
    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at)",
      "review_replies created_at",
    );
    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id)",
      "reply_likes",
    );
    createIndexWhenReady(
      "CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id)",
      "review_likes",
    );

    // 🔧 NEW: Add updated_at column to existing review_replies table if it doesn't exist
    console.log("🔄 Adding updated_at column to review_replies table...");
    db.run(
      "ALTER TABLE review_replies ADD COLUMN updated_at DATETIME",
      (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("❌ Error adding updated_at column:", err);
        } else if (!err) {
          console.log("✅ Added updated_at column to review_replies table");
          // Now update existing rows to have a default value
          db.run(
            "UPDATE review_replies SET updated_at = created_at WHERE updated_at IS NULL",
            (updateErr) => {
              if (updateErr) {
                console.error(
                  "❌ Error setting default updated_at values:",
                  updateErr,
                );
              } else {
                console.log(
                  "✅ Set default updated_at values for existing replies",
                );
              }
            },
          );
        } else {
          console.log(
            "✅ updated_at column already exists in review_replies table",
          );
        }
      },
    );

    // 🔧 NEW: Migrate base64 avatars to file system
    console.log("🔄 Migrating base64 avatars to file system...");
    migrateAvatarsToFileSystem();

    console.log("✅ Enhanced review system database migration completed");
} else {
  console.log("⏭️  Skipping boot-time migrations on Vercel (schema already provisioned)");
}

// Security hardening
app.disable("x-powered-by");
const helmetOptions =
  ENV === "production"
    ? {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            // Admin-uploaded perfume PNGs are served from the Render backend.
            // Static hosts (GH Pages / a custom domain) load them cross-origin,
            // so the same origin already allowed for connect-src is needed here.
            imgSrc: ["'self'", "data:", "blob:", "https://fimgs.net", "https://parfumerie-charme.onrender.com"],
            mediaSrc: ["'self'"],
            // 'self' covers same-origin /api calls on Render and Vercel. The
            // Render origin is listed so static hosts that legitimately call
            // the backend cross-origin (GitHub Pages / a custom domain) are not
            // silently blocked.
            connectSrc: [
              "'self'",
              "https://parfumerie-charme.onrender.com",
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameSrc: ["'self'", "https://www.openstreetmap.org", "https://openstreetmap.org"],
            frameAncestors: ["'none'"],
          },
        },
      }
    : { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));

// Gzip/Brotli compression for HTML, CSS, JS and JSON responses.
// Prefer Brotli: it gives smaller payloads than gzip at similar cost.
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) =>
      /^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/.test(
        (res.getHeader("Content-Type") || "") + "",
      ),
    brotli: { enabled: true, quality: 11 },
  }),
);

if (ENV === "production") {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === "null") return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // While running on Vercel, accept any host Vercel generated for this
        // project. Rejecting it used to call back with an Error, which Express
        // funneled into the generic error handler - so a blocked origin
        // returned 500 "Something went wrong!" and looked like a server crash
        // rather than a cross-origin policy problem.
        if (process.env.VERCEL && isVercelOrigin(origin)) {
          return callback(null, true);
        }
        console.warn("CORS: rejected origin", origin);
        // `callback(null, false)` omits CORS headers and lets the request
        // continue; the browser then reports a normal CORS error instead of the
        // server appearing to fail.
        return callback(null, false);
      },
      credentials: true,
    }),
  );
} else {
  app.use(cors());
}

// Add request logging for debugging
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const maskedBody =
      req.body && typeof req.body === "object" ? { ...req.body } : {};
    // Mask sensitive fields if present
    ["password", "verificationCode", "token", "avatarData"].forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(maskedBody, k))
        maskedBody[k] = "***";
    });
    const hasBody = maskedBody && Object.keys(maskedBody).length > 0;
    const bodyInfo = hasBody
      ? `with body: ${JSON.stringify(maskedBody)}`
      : "no body";
    const authInfo = req.headers.authorization ? "with auth" : "no auth";
    console.log(`${req.method} ${req.path} ${bodyInfo} ${authInfo}`);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Block access to sensitive paths/files before static serving
const denyList = [
  "/database",
  "/scripts",
  "/_pgbackup",
  "/_pginfo",
  "/test-api.js",
  "/test-profile-save.js",
  "/investigate-reply-system.js",
  "/reply-system-issues-analysis.md",
  "/script.backup.js",
];
app.use((req, res, next) => {
  const pathToCheck = req.path.toLowerCase();
  const isDeniedPrefix = denyList.some((p) => pathToCheck.startsWith(p));
  const isDbFile = pathToCheck.endsWith(".db");
  const isCheckScript = /^\/check-.*\.js$/.test(pathToCheck);
  if (isDeniedPrefix || isDbFile || isCheckScript) {
    return res.status(404).send("Not found");
  }
  next();
});

// =========================================================
// Image optimization: serve resized WebP (with caches)
// Original PNGs are 1-3.5MB @1920px; display sizes are 28-390px.
// We resize + convert to WebP once, cache on disk + in memory.
// =========================================================
const IMAGE_CACHE_DIR = path.join(__dirname, ".cache", "img");
const imageMemoryCache = new Map(); // key -> { buf, etag }
const IMAGE_SIZES = [
  { prefix: "/images/notes/", width: 96 },
  { prefix: "/uploads/avatars/", width: 128 },
  { prefix: "/uploads/fragrances/", width: 800 },
  { prefix: "/images/mood-pictures/", width: 1600 },
];
const IMAGE_EXT = /\.(png|jpe?g)$/i;

function resolveImageSource(reqPath) {
  // Full-resolution hero background — resize + convert to WebP (1920px, no
  // upscaling) instead of serving the ~2MB raw JPEG.
  const lowerPath = reqPath.toLowerCase();
  if (lowerPath === "/hero-bg.jpg") {
    return { filePath: path.join(PUBLIC_DIR, "hero-bg.jpg"), width: 1920 };
  }
  if (lowerPath === "/hero-bg-night.jpg") {
    return { filePath: path.join(PUBLIC_DIR, "hero-bg-night.jpg"), width: 1920 };
  }
  // Root-level perfume bottle images (e.g. /layton.png)
  if (reqPath.startsWith("/") && IMAGE_EXT.test(reqPath) && reqPath.indexOf("/", 1) === -1) {
    const file = reqPath.slice(1).toLowerCase();
    if (allowedStaticFiles.has(`/${file}`)) {
      const real = allowedStaticFiles.get(`/${file}`);
      return { filePath: path.join(PUBLIC_DIR, real), width: 800 };
    }
    return null;
  }
  for (const { prefix, width } of IMAGE_SIZES) {
    if (reqPath.startsWith(prefix)) {
      const rel = reqPath.slice(prefix.length).replace(/[/\\]/g, "");
      const filePath = path.join(PUBLIC_DIR, prefix, rel);
      if (fs.existsSync(filePath)) return { filePath, width };
      return null;
    }
  }
  return null;
}

async function serveOptimizedImage(req, res, src) {
  const acceptsWebp =
    /image\/webp/i.test(req.headers.accept || "") ||
    /image\/avif/i.test(req.headers.accept || "") ||
    (req.headers.accept || "").includes("*/*");
  if (!acceptsWebp) return null;

  let stat;
  try {
    stat = fs.statSync(src.filePath);
  } catch {
    return null;
  }
  const mtime = stat.mtimeMs;
  const key = `${src.filePath.toLowerCase()}|${mtime}|${src.width}`;

  let cached = imageMemoryCache.get(key);
  if (!cached) {
    const diskFile = path.join(IMAGE_CACHE_DIR, `${crypto.createHash("md5").update(key).digest("hex")}.webp`);
    try {
      if (fs.existsSync(diskFile)) {
        cached = { buf: fs.readFileSync(diskFile), etag: `"${key}"` };
      }
    } catch { /* fallthrough */ }
  }
  if (!cached) {
    try {
      const buf = await sharp(src.filePath, { animated: false })
        .rotate()
        .resize(src.width, null, { withoutEnlargement: true })
        .webp({ quality: 78, effort: 3 })
        .toBuffer();
      cached = { buf, etag: `"${key}"` };
      imageMemoryCache.set(key, cached);
      if (imageMemoryCache.size > 400) {
        const firstKey = imageMemoryCache.keys().next().value;
        imageMemoryCache.delete(firstKey);
      }
      try {
        fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
        fs.writeFileSync(diskFile, buf);
      } catch { /* cache write is best-effort */ }
    } catch {
      return null; // fall back to original on any sharp error
    }
  }

  res.setHeader("Content-Type", "image/webp");
  res.setHeader("ETag", cached.etag);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (req.headers["if-none-match"] === cached.etag) {
    res.statusCode = 304;
    return res.end();
  }
  return res.send(cached.buf);
}

app.use(async (req, res, next) => {
  if (req.method !== "GET") return next();
  if (!IMAGE_EXT.test(req.path)) return next();
  const src = resolveImageSource(req.path);
  if (!src) return next();
  try {
    const served = await serveOptimizedImage(req, res, src);
    if (served) return;
  } catch { /* fall through to original handler */ }
  next();
});

const _publicFiles = (() => {
  try {
    return fs.readdirSync(PUBLIC_DIR);
  } catch {
    return [];
  }
})();
const allowedStaticFiles = new Map(
  [
    "index.html",
    "styles.css",
    "script.js",
    "default.jpg",
    ..._publicFiles.filter((file) => /\.(png|jpe?g)$/i.test(file)),
    ..._publicFiles.filter((file) => file.toLowerCase().endsWith(".svg")),
  ].map((file) => [`/${file.toLowerCase()}`, file]),
);

/* The whitelist above is a snapshot taken at boot, so any root-level asset
   created after the process starts would silently 404 until the next restart.
   Fall back to a live lookup for plain filenames sitting directly in the site
   root. This mirrors the whitelist's intent: serve only image/favicon assets.
   Names are strictly validated - no separators, no traversal, root level only,
   and the extension must be a known public asset type. Anything else (package
   .json, .env, server.js, ...) falls through untouched. */
const ROOT_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ROOT_FILE_EXT = new Set([
  ".svg",
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
]);
function resolveRootFile(reqPath) {
  const name = String(reqPath || "").replace(/^\/+/, "");
  if (!ROOT_FILE_RE.test(name) || name.indexOf("..") !== -1) return null;
  if (!ROOT_FILE_EXT.has(path.extname(name).toLowerCase())) return null;
  const abs = path.join(PUBLIC_DIR, name);
  if (path.dirname(abs) !== PUBLIC_DIR) return null;
  let st;
  try {
    st = fs.statSync(abs);
  } catch (err) {
    return null;
  }
  if (!st.isFile()) return null;
  return name;
}

app.use((req, res, next) => {
  if (req.path === "/") {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    if (SERVE_REACT) {
      res.setHeader("X-Charme-Render", "react-build");
      return res.sendFile(REACT_CANDIDATE);
    }
    res.setHeader("X-Charme-Render", "public-index");
    return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  }

  const normalizedPath = req.path.toLowerCase();
  const staticFile = allowedStaticFiles.get(normalizedPath) || resolveRootFile(req.path);
  if (staticFile) {
    const ext = path.extname(staticFile).toLowerCase();
    const isHtml = ext === ".html";
    const isJS = ext === ".js";
    const isCSS = ext === ".css";
    // Cache-busting version query (script.js?v=20260901a, styles.css?v=...) is
    // the signal that this resource URL is content-addressed: any real change
    // bumps the query, so browsers can keep it forever. Without the query we
    // must revalidate.
    const hasVersionQuery = /(^|&)v=[0-9A-Za-z-]+(&|$)/.test(
      (req.url.split("?")[1] || "") + "&",
    );
    // HTML is always revalidated (it carries the version queries).
    // Images: long cache since they don't change.
    if (isHtml || ((isJS || isCSS) && !hasVersionQuery)) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    } else if (isJS || isCSS) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "public, max-age=604800");
    }
    return res.sendFile(path.join(PUBLIC_DIR, staticFile));
  }

  next();
});

// On Vercel these mounts never fire (the CDN serves public/** first), but they
// must stay correct for Render / local, where Express is the only server.
const staticMounts = [
  ["/css", path.join(PUBLIC_DIR, "css"), "7d"],
  ["/js", path.join(PUBLIC_DIR, "js"), "7d"],
  ["/assets", path.join(PUBLIC_DIR, "assets"), "7d"],
  /* The loyalty card template the React card art paints into a canvas. The
     legacy site never used /media, so this mount was missing and the card
     silently fell back to its text-only panel on Render and local Express —
     Vercel and GitHub Pages serve public/** directly, which hid the gap. */
  ["/media", path.join(PUBLIC_DIR, "media"), "7d"],
  ["/uploads/fragrances", path.join(PUBLIC_DIR, "uploads", "fragrances"), "7d"],
  ["/images/notes", path.join(PUBLIC_DIR, "images", "notes"), "30d"],
  [
    "/images/mood-pictures",
    path.join(PUBLIC_DIR, "images", "mood-pictures"),
    "30d",
  ],
];
for (const [route, dir, maxAge] of staticMounts) {
  app.use(route, express.static(dir, { index: false, maxAge }));
}

// React + Vite app at /app (source in frontend/, built output in public/app).
// On Vercel the CDN serves public/** before Express ever runs, and GitHub Pages
// copies public/ to the site root, so this mount only matters for Render and
// local dev, where Express is the only server. Content-hashed assets are
// immutable; index.html must always revalidate so a new build is picked up.
app.use(
  "/app/assets",
  express.static(path.join(PUBLIC_DIR, "app", "assets"), {
    index: false,
    maxAge: "365d",
    immutable: true,
  }),
);
app.use("/app", express.static(path.join(PUBLIC_DIR, "app"), { maxAge: 0 }));
// SPA fallback: React Router owns every /app/* path, so deep links and
// refreshes must serve the built index.html instead of 404ing.
app.get(/^\/app(\/.*)?$/, (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  res.sendFile(path.join(PUBLIC_DIR, "app", "index.html"));
});

// 2027 surface: a separate modern front end at /2027. It imports no legacy CSS and
// never touches the legacy DOM, so the homepage at "/" is unaffected by its existence.
app.use("/2027", express.static(path.join(PUBLIC_DIR, "2027"), { maxAge: 0 }));
// Catalogue JSON for that surface (same data the legacy site ships inside
// js/fragrance-catalog-data.js, so nothing new is exposed).
app.use(
  "/data",
  express.static(path.join(PUBLIC_DIR, "data"), { index: false, maxAge: "1h" }),
);

// Serve avatar files: committed ones under public/uploads/avatars, plus
// anything written at runtime (Vercel: /tmp, Render: repo disk).
const avatarDirs = [
  path.join(PUBLIC_DIR, "uploads", "avatars"),
  path.join(uploadedBase, "uploads", "avatars"),
];
for (const dir of new Set(avatarDirs)) {
  app.use("/uploads/avatars", express.static(dir, { index: false, maxAge: "7d" }));
}

// Rate limiting
//
// Behind a proxy `req.ip` is only as good as the `trust proxy` setting: if the
// edge appends its own address to X-Forwarded-For, `trust proxy: 1` resolves to
// the proxy address instead of the client, which would put every visitor in one
// bucket and lock the whole site out after 20 failed logins. `x-real-ip` (set
// by Vercel) and the leftmost X-Forwarded-For entry (the originating client)
// are reliable regardless of how many hops were added.
// `ipKeyGenerator` is required: express-rate-limit refuses any custom
// keyGenerator that touches req.ip without it (ERR_ERL_KEY_GEN_IPV6), and it
// also buckets IPv6 clients by /56 subnet so they cannot rotate addresses to
// slip past the limit.
const clientKey = (req) => {
  const raw =
    req.headers["x-real-ip"] ||
    String(req.headers["x-forwarded-for"] || "").split(",")[0] ||
    req.ip ||
    "";
  const ip = String(raw).trim();
  return ipKeyGenerator(ip || req.ip || "unknown");
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs (more generous)
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Keep successful logins from consuming the login budget
  skipFailedRequests: false, // Count failed requests
  keyGenerator: clientKey,
});

// Registration has a separate, stricter quota. The general auth limiter above intentionally
// skips successful requests for login UX, but that would otherwise allow unlimited account
// creation because a successful registration returns 201.
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: "Too many registration attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: clientKey,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    error: "Too many verification code requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: clientKey,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many upload requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
});

// Apply rate limiting to auth routes
app.use("/api/auth", authLimiter);

// Apply modest rate limits to content-posting APIs (skip safe methods, return JSON)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
  message: {
    error: "Too many requests. Please slow down and try again shortly.",
  },
  keyGenerator: clientKey,
});

app.use(["/api/reviews", "/api/replies"], writeLimiter);

function getUserById(userId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function safeAvatarValue(avatar) {
  if (!avatar || avatar === "default.jpg") return "default.jpg";
  if (typeof avatar !== "string") return "default.jpg";
  if (avatar.startsWith("/uploads/avatars/")) return avatar;
  return "default.jpg";
}

function userDisplayName(user) {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim();
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(
    token,
    ACTIVE_JWT_SECRET,
    { algorithms: ["HS256"] },
    async (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      try {
        const dbUser = await getUserById(user.userId);
        if (!dbUser) {
          return res.status(401).json({ error: "User no longer exists" });
        }
        if (dbUser.is_banned) {
          return res.status(403).json({ error: "Account is banned" });
        }
        req.user = { ...user, dbUser };
        next();
      } catch (error) {
        console.error("Token user lookup error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );
};

// Validation helpers
const validateEmail = (email) => {
  return validator.isEmail(email) && email.length <= 255;
};

const validatePassword = (password) => {
  return password && password.length >= 8 && password.length <= 128;
};

const validateName = (name) => {
  return (
    name &&
    name.trim().length >= 2 &&
    name.trim().length <= 100 &&
    /^[\p{L}\p{M}' .-]+$/u.test(name.trim())
  );
};

// 🆕 Level System Functions
// XP and level system functions removed

// Auth Routes
app.post("/api/auth/register", registrationLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!validateName(firstName) || !validateName(lastName)) {
      return res.status(400).json({
        error: "First name and last name must be 2-100 characters long",
      });
    }

    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address" });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: "Password must be 8-128 characters long" });
    }

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE email = ?",
        [email.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user (unverified)
    const userId = await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
                INSERT INTO users (first_name, last_name, email, password_hash, email_verified, verification_code, verification_expires, created_at)
                VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'))
            `);

      stmt.run(
        [
          firstName.trim(),
          lastName.trim(),
          email.toLowerCase(),
          hashedPassword,
          verificationCode,
          verificationExpires.toISOString(),
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        },
      );
      stmt.finalize();
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      firstName,
      verificationCode,
    );

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      // Continue with registration even if email fails
    }

    // Return response requiring verification
    res.status(201).json({
      success: true,
      message:
        "Account created successfully! Please check your email for verification code.",
      requiresVerification: true,
      userId: userId,
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify token endpoint
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE id = ?",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        birthday: user.birthday,
        isAdmin: user.is_admin === 1,
        avatar: user.avatar_url || "default.jpg",
      },
    });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Email verification endpoint
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;
    const normalizedCode = String(verificationCode || "").trim();

    if (!userId || !/^\d{6}$/.test(normalizedCode)) {
      return res
        .status(400)
        .json({ error: "A valid verification code is required" });
    }

    // Get user from database
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Check if verification code matches and hasn't expired
    if (user.verification_code !== normalizedCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const now = new Date();
    const expiresAt = new Date(user.verification_expires);
    if (now > expiresAt) {
      return res.status(400).json({ error: "Verification code has expired" });
    }

    // Update user as verified
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET email_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?",
        [userId],
        function (err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.first_name);

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, ACTIVE_JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Email verified successfully! Welcome to Parfumerie Charme.",
      token,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        isAdmin: user.is_admin === 1,
        avatar: user.avatar_url || "default.jpg",
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Resend verification code endpoint
app.post("/api/auth/resend-verification", resendVerificationLimiter, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get user from database
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with new code
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?",
        [verificationCode, verificationExpires.toISOString(), userId],
        function (err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    // Send new verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.first_name,
      verificationCode,
    );

    if (!emailResult.success) {
      return res
        .status(500)
        .json({ error: "Failed to send verification email" });
    }

    res.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Diagnostic endpoint: open /api/health on any deployment to see whether this
// host actually has DATABASE_URL and can reach the database. Never exposes the
// connection string itself.
app.get("/api/health", async (req, res) => {
  const info = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    onVercel: Boolean(process.env.VERCEL),
    node: process.version,
    sharp: Boolean(sharp),
    dompurify: Boolean(DOMPurify),
    // Only the source of the signing key is reported, never its value. If this
    // says "generated", every cold start mints a different key and sessions die
    // as soon as the instance is recycled - set JWT_SECRET in the host env.
    jwtSecretSource: JWT_SECRET
      ? "env"
      : _persistedJwtSecret
        ? "file"
        : "generated",
    jwtSecretLength: ACTIVE_JWT_SECRET.length,
    corsAllowedOrigins: allowedOrigins.length,
    trustProxy: app.get("trust proxy"),
  };
  try {
    const row = await new Promise((resolve, reject) => {
      db.get("SELECT 1 AS ok", [], (err, r) => (err ? reject(err) : resolve(r)));
    });
    info.db = "ok";
    info.dbValue = row ? row.ok : null;
    info.ok = true;
  } catch (e) {
    info.ok = false;
    info.db = "error";
    info.dbError = e && (e.code || e.message);
  }
  res.status(info.ok ? 200 : 503).json(info);
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE email = ?",
        [email.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({
        error: "Your account has been banned",
        reason: user.banned_reason || "No reason provided",
        bannedAt: user.banned_at,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if email is verified (skip for admin or when unverified login is enabled)
    if (
      !user.email_verified &&
      user.is_admin !== 1 &&
      process.env.ALLOW_UNVERIFIED_LOGIN !== "true"
    ) {
      return res.status(403).json({
        error: "Please verify your email address before logging in",
        requiresVerification: true,
        userId: user.id,
        email: user.email,
      });
    }

    // Update last login. Deliberately fire-and-forget - bookkeeping must not
    // fail an otherwise successful login - but a rejected promise left floating
    // on serverless takes the whole instance down (unhandledRejection), so it
    // is always consumed here.
    Promise.resolve(
      db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [
        user.id,
      ]),
    ).catch((e) =>
      console.error(
        "last_login update failed:",
        e && (e.code || e.message),
      ),
    );

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, ACTIVE_JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return user data (without password)
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        birthday: user.birthday,
        isAdmin: user.is_admin === 1,
        avatar: user.avatar_url || "default.jpg",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    // Surface a database misconfiguration as its own status instead of a bare
    // 500, so it is obvious from the browser what is actually wrong.
    if (error && error.code === "ENOCONFIG") {
      return res
        .status(503)
        .json({ error: "DATABASE_URL is not configured on this host" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// User profile routes
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE id = ?",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return comprehensive user data with proper formatting
    const profileData = {
      id: user.id,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      email: user.email,
      phone: user.phone || "",
      birthday: user.birthday || "",
      avatar: user.avatar_url || "default.jpg",
      avatar_url: user.avatar_url,
      email_verified: Boolean(user.email_verified),
      is_admin: Boolean(user.is_admin),
      is_banned: Boolean(user.is_banned),
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      // Level system data (simplified - XP system removed)
      level: 1,
      experience: 0,
      currentXP: 0,
      requiredXP: 100,
      levelProgress: 0,
    };

    console.log(`📋 Profile data for user ${req.user.userId}:`, {
      id: profileData.id,
      name: profileData.name,
      email: profileData.email,
      hasAvatar: !!profileData.avatar_url,
      avatarSize: profileData.avatar_url ? profileData.avatar_url.length : 0,
      level: profileData.level,
      experience: profileData.experience,
      levelProgress: profileData.levelProgress,
    });

    res.json({
      success: true,
      user: profileData,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// FIX ISS-002: Added authenticateToken; changed to POST to match frontend; fixed table/column names
app.post("/api/user/profile-details", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }
    
    console.log(`🔍 Fetching profile details for: userId=${userId}`);
    
    // Query user by ID or email — exclude sensitive fields
    const query = "SELECT id, first_name, last_name, avatar_url, is_admin, created_at FROM users WHERE id = ? AND is_banned = 0";
    const param = userId;
    
    const user = await new Promise((resolve, reject) => {
      db.get(query, [param], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's review count
    const reviewCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM reviews WHERE user_id = ?", [user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    // Get user's reply count (FIX: correct table name is review_replies, not replies)
    const replyCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM review_replies WHERE user_id = ?", [user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    // Get user's favorite fragrances from the canonical favorites table.
    let favorites = [];
    try {
      favorites = await new Promise((resolve, reject) => {
        db.all("SELECT product_name FROM user_favorites WHERE user_id = ? LIMIT 5", [user.id], (err, rows) => {
          if (err) resolve([]); // Table might not exist
          else resolve(rows || []);
        });
      });
    } catch (error) {
      console.log("Favorites table not found, using empty array");
    }

    // Calculate display name
    const displayName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.first_name || user.last_name || "Member";

    // Return profile data for modal
    const profileData = {
      id: user.id,
      displayName: displayName,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      avatar_url: user.avatar_url || "default.jpg",
      is_admin: Boolean(user.is_admin),
      created_at: user.created_at,
      member_since: user.created_at,
      
      // Stats
      reviewCount: reviewCount,
      replyCount: replyCount,
      followers: 0,
      following: 0,
      
      // Activity
      favorites: favorites.map(f => f.product_name),
      purchases: [],
      
      // Badge/Level info
      level: 1,
      badge: user.is_admin ? "Admin" : "Member",
      bio: `Member since ${new Date(user.created_at).getFullYear()}. ${reviewCount} reviews, ${replyCount} replies.`
    };

    res.json({
      success: true,
      profile: profileData
    });

  } catch (error) {
    console.error("Profile details fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const { name, first_name, last_name, phone, birthday, avatar } = req.body;

    console.log(`📝 Profile update request for user ${req.user.userId}:`, {
      name,
      first_name,
      last_name,
      phone,
      birthday,
      hasAvatar: !!avatar,
      avatarSize: avatar ? avatar.length : 0,
    });

    // Handle both old format (name) and new format (first_name, last_name)
    let firstName, lastName;

    if (first_name !== undefined && last_name !== undefined) {
      // New format: separate first_name and last_name
      firstName = first_name ? first_name.trim() : "";
      lastName = last_name ? last_name.trim() : "";
    } else if (name) {
      // Old format: parse name into first and last
      const nameParts = name.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    } else {
      // No name changes
      firstName = null;
      lastName = null;
    }

    // Validation
    if (firstName !== null && !validateName(firstName)) {
      return res.status(400).json({ error: "Invalid first name format" });
    }

    if (lastName !== null && !validateName(lastName)) {
      return res.status(400).json({ error: "Invalid last name format" });
    }

    if (
      phone &&
      !validator.isMobilePhone(phone, "any", { strictMode: false })
    ) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    if (birthday && !validator.isDate(birthday)) {
      return res.status(400).json({ error: "Invalid birthday format" });
    }

    // Validate avatar path if provided (ensure it points to uploads or default)
    let sanitizedAvatar = avatar || undefined;
    if (sanitizedAvatar) {
      const isValidPath =
        sanitizedAvatar === "default.jpg" ||
        sanitizedAvatar.startsWith("/uploads/avatars/");
      if (!isValidPath) {
        return res.status(400).json({ error: "Invalid avatar path" });
      }
    }

    // Update user in database
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
                UPDATE users
                SET first_name = COALESCE(?, first_name),
                    last_name = COALESCE(?, last_name),
                    phone = COALESCE(?, phone),
                    birthday = COALESCE(?, birthday),
                    avatar_url = COALESCE(?, avatar_url),
                    updated_at = datetime('now')
                WHERE id = ?
            `);

      const params = [
        firstName !== null ? firstName : undefined,
        lastName !== null ? lastName : undefined,
        phone || null,
        birthday || null,
        sanitizedAvatar,
        req.user.userId,
      ];

      console.log(`💾 Updating user ${req.user.userId} with params:`, {
        firstName: params[0],
        lastName: params[1],
        phone: params[2],
        birthday: params[3],
        hasAvatar: !!params[4],
        avatarSize: params[4] ? params[4].length : 0,
      });

      stmt.run(params, function (err) {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });

    // Get updated user data to return
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE id = ?",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    // Return comprehensive updated user data
    const responseData = {
      id: updatedUser.id,
      first_name: updatedUser.first_name || "",
      last_name: updatedUser.last_name || "",
      name: `${updatedUser.first_name || ""} ${updatedUser.last_name || ""}`.trim(),
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      birthday: updatedUser.birthday || "",
      avatar: updatedUser.avatar_url || "default.jpg",
      avatar_url: updatedUser.avatar_url,
      email_verified: Boolean(updatedUser.email_verified),
      is_admin: Boolean(updatedUser.is_admin),
      is_banned: Boolean(updatedUser.is_banned),
      updated_at: updatedUser.updated_at,
    };

    console.log(
      `✅ Profile updated successfully for user ${req.user.userId}:`,
      {
        name: responseData.name,
        hasAvatar: !!responseData.avatar_url,
      },
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: responseData,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Settings routes
app.get("/api/user/settings", authenticateToken, async (req, res) => {
  try {
    const settings = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM user_settings WHERE user_id = ?",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    res.json({
      success: true,
      settings: settings
        ? {
            emailNotifications: settings.email_notifications === 1,
            smsNotifications: settings.sms_notifications === 1,
            profileVisibility: settings.profile_visibility === 1,
            dataCollection: settings.data_collection === 1,
          }
        : {
            emailNotifications: true,
            smsNotifications: false,
            profileVisibility: true,
            dataCollection: true,
          },
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/user/settings", authenticateToken, async (req, res) => {
  try {
    const {
      emailNotifications,
      smsNotifications,
      profileVisibility,
      dataCollection,
    } = req.body;

    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
                INSERT OR REPLACE INTO user_settings
                (user_id, email_notifications, sms_notifications, profile_visibility, data_collection, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `);

      stmt.run(
        [
          req.user.userId,
          emailNotifications ? 1 : 0,
          smsNotifications ? 1 : 0,
          profileVisibility ? 1 : 0,
          dataCollection ? 1 : 0,
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        },
      );
      stmt.finalize();
    });

    res.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Favorites routes
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const favorites = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM user_favorites WHERE user_id = ?",
        [req.user.userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });

    res.json({
      success: true,
      favorites: favorites.map((fav) => ({
        id: fav.id,
        productId: fav.product_id,
        productName: fav.product_name,
        addedAt: fav.created_at,
      })),
    });
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add to favorites
app.post("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const { productId, productName } = req.body;

    if (!productId || !productName) {
      return res
        .status(400)
        .json({ error: "Product ID and name are required" });
    }

    // Check if already in favorites
    const existing = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?",
        [req.user.userId, productId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (existing) {
      return res.status(409).json({ error: "Product already in favorites" });
    }

    // Add to favorites
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
                INSERT INTO user_favorites (user_id, product_id, product_name, created_at)
                VALUES (?, ?, ?, datetime('now'))
            `);

      stmt.run([req.user.userId, productId, productName], function (err) {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });

    res.json({
      success: true,
      message: "Product added to favorites",
    });
  } catch (error) {
    console.error("Add to favorites error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove from favorites
app.delete(
  "/api/user/favorites/:productId",
  authenticateToken,
  async (req, res) => {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      // Remove from favorites
      const result = await new Promise((resolve, reject) => {
        const stmt = db.prepare(
          "DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?",
        );

        stmt.run([req.user.userId, productId], function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
        stmt.finalize();
      });

      if (result === 0) {
        return res
          .status(404)
          .json({ error: "Product not found in favorites" });
      }

      res.json({
        success: true,
        message: "Product removed from favorites",
      });
    } catch (error) {
      console.error("Remove from favorites error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Toggle favorite (add if not exists, remove if exists)
app.post("/api/user/favorites/toggle", authenticateToken, async (req, res) => {
  try {
    const { productId, productName } = req.body;
    console.log(
      `🔄 Toggle favorite request: userId=${req.user.userId}, productId=${productId}, productName=${productName}`,
    );

    if (!productId || !productName) {
      console.log("❌ Missing productId or productName");
      return res
        .status(400)
        .json({ error: "Product ID and name are required" });
    }

    // Check if already in favorites
    const existing = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?",
        [req.user.userId, productId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    console.log(
      `📊 Existing favorite check: ${existing ? "EXISTS" : "NOT EXISTS"} (id: ${existing?.id})`,
    );

    if (existing) {
      // Remove from favorites
      console.log(
        `🗑️ Removing from favorites: userId=${req.user.userId}, productId=${productId}`,
      );
      const result = await new Promise((resolve, reject) => {
        const stmt = db.prepare(
          "DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?",
        );

        stmt.run([req.user.userId, productId], function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
        stmt.finalize();
      });

      console.log(`✅ Removal result: ${result} rows affected`);

      res.json({
        success: true,
        action: "removed",
        isFavorite: false,
        message: `${productName} removed from favorites`,
      });
    } else {
      // Add to favorites
      console.log(
        `➕ Adding to favorites: userId=${req.user.userId}, productId=${productId}, productName=${productName}`,
      );
      await new Promise((resolve, reject) => {
        const stmt = db.prepare(`
                    INSERT INTO user_favorites (user_id, product_id, product_name, created_at)
                    VALUES (?, ?, ?, datetime('now'))
                `);

        stmt.run([req.user.userId, productId, productName], function (err) {
          if (err) reject(err);
          else resolve();
        });
        stmt.finalize();
      });

      console.log(`✅ Added to favorites successfully`);

      res.json({
        success: true,
        action: "added",
        isFavorite: true,
        message: `${productName} added to favorites`,
      });
    }
  } catch (error) {
    console.error("Toggle favorites error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware to check admin privileges
const requireAdmin = async (req, res, next) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT is_admin FROM users WHERE id = ?",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* Bounded page size for the admin list endpoints.
 *
 * These queries had no LIMIT at all, so every row in the table was read into
 * memory and serialised into one response on each page load. Measured on the
 * demo data: GET /api/admin/loyalty returned 624 rows / 180 KB, and it grows
 * with the shop's ledger and its customer list. It is the one endpoint where
 * the cost is unbounded rather than merely untidy.
 *
 * `?limit=` and `?offset=` let a caller page through; the ceiling stops a
 * caller asking for the whole table in a single request.
 *
 * INCIDENT 2026-11-06: the original default of 500 was introduced together
 * with this paging in 259295a on the assumption that live data was below 500
 * cards. It was not - the shop had 642. The legacy admin screen (which sent
 * no ?limit) silently lost 142 cards, 79 of them holding points, and the shop
 * started telling customers their points had disappeared. The default is now
 * the full page size, and the response carries totalCards / hasMore so a
 * client can prove it has loaded everything instead of guessing. */
const LIST_LIMIT_MAX = 1000;
const LIST_LIMIT_DEFAULT = 1000;

function listLimit(req) {
  const raw = Number.parseInt(req.query.limit, 10);
  if (!Number.isFinite(raw) || raw <= 0) return LIST_LIMIT_DEFAULT;
  return Math.min(raw, LIST_LIMIT_MAX);
}

function listOffset(req) {
  const raw = Number.parseInt(req.query.offset, 10);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

// FIX ISS-007: Added authenticateToken — user counts should not be public
app.get("/api/stats/users", authenticateToken, async (req, res) => {
  try {
    const stats = await new Promise((resolve, reject) => {
      db.get(
        `
                SELECT
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN email LIKE '%@gmail.com' THEN 1 END) as gmail_users,
                    COUNT(CASE WHEN is_admin = 1 THEN 1 END) as admin_users,
                    COUNT(CASE WHEN is_banned = 1 THEN 1 END) as banned_users
                FROM users
            `,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    res.json({
      success: true,
      stats: {
        totalUsers: stats.total_users,
        gmailUsers: stats.gmail_users,
        adminUsers: stats.admin_users,
        bannedUsers: stats.banned_users,
      },
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user statistics",
    });
  }
});

// Admin Routes
app.get(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await new Promise((resolve, reject) => {
        db.all(
          `
                SELECT
                    id, first_name, last_name, email, phone, birthday,
                    is_admin, is_banned, banned_reason, banned_at,
                    created_at, last_login
                FROM users
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            `,
          [listLimit(req), listOffset(req)],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });

      res.json({
        success: true,
        users: users.map((user) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone,
          birthday: user.birthday,
          isAdmin: user.is_admin === 1,
          isBanned: user.is_banned === 1,
          bannedReason: user.banned_reason,
          bannedAt: user.banned_at,
          createdAt: user.created_at,
          lastLogin: user.last_login,
        })),
      });
    } catch (error) {
      console.error("Admin users fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Search user profiles endpoint
// FIX ISS-003: Added authenticateToken to prevent unauthenticated user enumeration
// 🔍 SEARCH USERS — admin console only.
// Same reason as /api/search/loyalty-profiles below: it walks the user table
// and returns names, emails and phone numbers, so it is an administrator
// lookup and not something a customer can page through.
app.get("/api/search/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2 || query.length > 100) {
      return res.json([]);
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const users = await new Promise((resolve, reject) => {
      db.all(
        `
                SELECT
                    id,
                    first_name,
                    last_name,
                    avatar_url,
                    created_at,
                    is_admin
                FROM users
                WHERE
                    (LOWER(first_name) LIKE ? OR
                     LOWER(last_name) LIKE ?)
                    AND is_banned = 0
                ORDER BY
                    CASE
                        WHEN LOWER(first_name) = LOWER(?) THEN 1
                        WHEN LOWER(last_name) = LOWER(?) THEN 2
                        WHEN LOWER(first_name) LIKE ? THEN 3
                        WHEN LOWER(last_name) LIKE ? THEN 4
                        ELSE 5
                    END
                LIMIT 10
            `,
        [
          searchTerm,
          searchTerm,
          query,
          query,
          `${query.toLowerCase()}%`,
          `${query.toLowerCase()}%`,
        ],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });

    // Format the response to include display name and hide sensitive info
    const formattedUsers = users.map((user) => ({
      id: user.id,
      display_name: `${user.first_name} ${user.last_name}`.trim(),
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      member_since: user.created_at,
      is_admin: user.is_admin === 1,
      badge: user.is_admin === 1 ? "Admin" : "Member",
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// FIX ISS-001: Changed from duplicate GET /api/admin/users to POST /api/admin/ban-user
app.post(
  "/api/admin/ban-user",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (userId === req.user.userId) {
        return res.status(400).json({ error: "Cannot ban yourself" });
      }

      // Check if user exists
      const targetUser = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id, is_admin FROM users WHERE id = ?",
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.is_admin) {
        return res.status(400).json({ error: "Cannot ban admin users" });
      }

      // Ban the user
      await new Promise((resolve, reject) => {
        const stmt = db.prepare(`
                UPDATE users
                SET is_banned = 1, banned_reason = ?, banned_at = datetime('now'), banned_by = ?
                WHERE id = ?
            `);

        stmt.run(
          [reason || "No reason provided", req.user.userId, userId],
          function (err) {
            if (err) reject(err);
            else resolve();
          },
        );
        stmt.finalize();
      });

      res.json({
        success: true,
        message: "User banned successfully",
      });
    } catch (error) {
      console.error("Ban user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.post(
  "/api/admin/unban-user",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Unban the user
      await new Promise((resolve, reject) => {
        const stmt = db.prepare(`
                UPDATE users
                SET is_banned = 0, banned_reason = NULL, banned_at = NULL, banned_by = NULL
                WHERE id = ?
            `);

        stmt.run([userId], function (err) {
          if (err) reject(err);
          else resolve();
        });
        stmt.finalize();
      });

      res.json({
        success: true,
        message: "User unbanned successfully",
      });
    } catch (error) {
      console.error("Unban user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// 🎁 CARTE FIDÉLITÉ: Loyalty cards admin routes
const LOYALTY_REWARD_THRESHOLD = 5;

/* Business-rule failure raised from inside a transaction. The transaction
   rolls back, and the outer handler maps it to the right HTTP status instead
   of reporting every thrown error as a 500. */
class LoyaltyHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "LoyaltyHttpError";
    this.status = status;
  }
}

function getLoyaltyCardByUserId(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM loyalty_cards WHERE user_id = ?",
      [userId],
      (err, row) => (err ? reject(err) : resolve(row)),
    );
  });
}

function getLoyaltyCardById(cardId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM loyalty_cards WHERE id = ?",
      [cardId],
      (err, row) => (err ? reject(err) : resolve(row)),
    );
  });
}

/* A tiny read adapter: the same helper works against the shared connection
   (callback API) and against a transaction scope (promise API). */
function scopedGet(handle) {
  if (handle && typeof handle.get === "function") {
    return (sql, params) => handle.get(sql, params);
  }
  return (sql, params) =>
    new Promise((resolve, reject) => {
      db.get(sql, params || [], (err, row) => (err ? reject(err) : resolve(row)));
    });
}

/* High-water mark for issued CH numbers.
 *
 * COUNT(*) was the original bug: deleting any card dropped the count below
 * the highest issued number. MAX(id) fixed most of that but still recycles the
 * number when the NEWEST card is deleted (live data: MAX(id)=667 while the
 * sequence is already at 668). Both engines keep a monotonic counter that
 * survives DELETE, so read that instead.
 *
 * The Postgres query goes through pg_sequences rather than selecting from the
 * sequence relation directly: a missing/differently-named sequence would raise
 * inside the caller's transaction and abort it ("current transaction is
 * aborted"), turning a cosmetic fallback into a failed purchase. pg_sequences
 * simply returns no row. SQLite tolerates a failed SELECT inside a
 * transaction, and the try/catch covers the "table not created yet" case.
 */
async function highestIssuedCardSequence(handle) {
  const get = scopedGet(handle);
  try {
    let row = null;
    if (db.dialect === "postgres") {
      row = await get(
        "SELECT last_value AS n FROM pg_sequences WHERE schemaname = current_schema() AND sequencename = 'loyalty_cards_id_seq'",
      );
    } else if (db.dialect === "sqlite") {
      row = await get("SELECT seq AS n FROM sqlite_sequence WHERE name = 'loyalty_cards'");
    }
    const n = Number(row && row.n);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* Fresh database, or a legacy install whose sequence is named differently. */
  }
  const fallback = await get("SELECT COALESCE(MAX(id), 0) AS n FROM loyalty_cards");
  return Number(fallback && fallback.n) || 0;
}

async function generateCardNumber(handle) {
  const get = scopedGet(handle);
  let sequence = await highestIssuedCardSequence(handle);
  for (;;) {
    sequence += 1;
    const number = "CH" + String(sequence).padStart(4, "0");
    const taken = await get(
      "SELECT 1 AS found FROM loyalty_cards WHERE card_number = ?",
      [number],
    );
    if (!taken) return number;
  }
}

function insertLoyaltyCard({ userId, cardNumber, holderName, holderEmail, holderPhone }, handle) {
  const sql =
    "INSERT INTO loyalty_cards (user_id, holder_name, holder_email, holder_phone, card_number) VALUES (?, ?, ?, ?, ?)";
  const params = [userId, holderName, holderEmail, holderPhone, cardNumber];
  if (handle && typeof handle.run === "function") {
    return (async () => {
      const r = await handle.run(sql, params);
      return handle.get("SELECT * FROM loyalty_cards WHERE id = ?", [r.lastID]);
    })();
  }
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(sql);
    stmt.run(params, function (err) {
      if (err) return reject(err);
      getLoyaltyCardById(this.lastID).then(resolve, reject);
    });
    stmt.finalize();
  });
}

/* DISTINCT error classes matter: a UNIQUE collision on the generated card
   number is safe to retry, but any other database failure must surface. */
function isCardNumberCollision(err) {
  return /card_number|loyalty_cards_card_number_key/i.test(String(err && err.message));
}
function isUserCardCollision(err) {
  return /loyalty_cards\.user_id|loyalty_cards_user_id_key|UNIQUE constraint failed: loyalty_cards\.user_id/i.test(
    String(err && err.message),
  );
}

/* The same walk-in customer was repeatedly re-created as a brand new card
   whenever an assistant typed their name instead of picking the existing
   card. Match on phone (the shop's identifier), falling back to an exact
   name match only for cards that have no phone, so two different people who
   share a name are not merged or blocked. */
async function findDuplicateWalkIn({ name, phone }, handle) {
  const get = scopedGet(handle);
  const p = String(phone || "").trim();
  const n = String(name || "").trim();
  if (p) {
    const byPhone = await get(
      `SELECT id, card_number, holder_name, holder_phone FROM loyalty_cards
       WHERE holder_phone = ? AND user_id IS NULL ORDER BY id LIMIT 1`,
      [p],
    );
    if (byPhone) return byPhone;
  }
  if (n) {
    const byName = await get(
      `SELECT id, card_number, holder_name, holder_phone FROM loyalty_cards
       WHERE LOWER(TRIM(holder_name)) = LOWER(?)
         AND COALESCE(TRIM(holder_phone), '') = ''
         AND user_id IS NULL ORDER BY id LIMIT 1`,
      [n],
    );
    if (byName) return byName;
  }
  return null;
}

function walkInDuplicateError(dup) {
  return {
    error: `Un client avec ces coordonnées possède déjà la carte ${dup.card_number || dup.id} (${(dup.holder_name || "").trim() || "sans nom"}). Sélectionnez cette carte pour enregistrer l'achat.`,
    existingCardId: dup.id,
    existingCardNumber: dup.card_number || null,
  };
}

async function ensureLoyaltyCard(userId) {
  const existing = await getLoyaltyCardByUserId(userId);
  if (existing) return existing;
  /* A second request can create the same account's card (or claim the same
     generated CH number) while we are between the read and the insert. Retry
     those two specific collisions instead of failing the whole request. */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const cardNumber = await generateCardNumber();
      return await insertLoyaltyCard({
        userId,
        cardNumber,
        holderName: null,
        holderEmail: null,
        holderPhone: null,
      });
    } catch (err) {
      const raced = await getLoyaltyCardByUserId(userId);
      if (raced) return raced;
      if (!isCardNumberCollision(err) && !isUserCardCollision(err)) throw err;
      if (attempt === 4) throw err;
    }
  }
}

/*
 * Record a movement in the loyalty ledger.
 *
 * `handle` exists so the insert can join an in-flight transaction (see
 * db.transaction). A ledger row and the points balance it explains have to
 * land together: if the balance moves and the insert then fails, the customer
 * can redeem points the history says they never earned.
 */
function logLoyaltyTransaction(cardId, userId, pointsChange, type, description, handle, purchaseId) {
  /* purchase_id is optional: it is only set for the point earned by a recorded
     purchase, which is what lets DELETE /purchases/:id reverse exactly that
     point. Older databases that have not yet run the migration simply omit it
     rather than failing the whole write. */
  const withLink = Boolean(purchaseId) && loyaltyLedgerHasPurchaseId;
  const sql = withLink
    ? "INSERT INTO loyalty_transactions (card_id, user_id, points_change, type, description, purchase_id) VALUES (?, ?, ?, ?, ?, ?)"
    : "INSERT INTO loyalty_transactions (card_id, user_id, points_change, type, description) VALUES (?, ?, ?, ?, ?)";
  const params = [cardId, userId, pointsChange, type, description];
  if (withLink) params.push(purchaseId);
  if (handle && typeof handle.raw === "function") {
    return handle.raw(sql, params);
  }
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(sql);
    stmt.run(params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
    stmt.finalize();
  });
}

app.get("/api/admin/loyalty", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = listLimit(req);
    const offset = listOffset(req);
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `
            SELECT
              c.id AS card_id, c.user_id, c.card_number, c.points,
              c.holder_name, c.holder_email, c.holder_phone,
              c.created_at AS card_created_at, c.updated_at AS card_updated_at,
              u.first_name, u.last_name, u.email AS user_email, u.is_banned,
              (SELECT COUNT(*) FROM loyalty_transactions lt WHERE lt.card_id = c.id AND lt.type = 'redeem') AS rewards,
              (SELECT COUNT(*) FROM customer_purchases cp WHERE cp.card_id = c.id) AS purchases
            FROM loyalty_cards c
            LEFT JOIN users u ON u.id = c.user_id
            ORDER BY c.points DESC, c.id ASC
            LIMIT $1 OFFSET $2
          `,
        [limit, offset],
        (err, rows) => (err ? reject(err) : resolve(rows)),
      );
    });

    /* The admin UI must never again report "500 cards" when the table holds
       642. This count is independent of the page the caller asked for. */
    const cardCount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) AS total FROM loyalty_cards",
        (err, row) => (err ? reject(err) : resolve(row ? Number(row.total) : 0)),
      );
    });

    const usersWithoutCards = await new Promise((resolve, reject) => {
      db.all(
        `
            SELECT u.id, u.first_name, u.last_name, u.email
            FROM users u
            WHERE u.id NOT IN (SELECT user_id FROM loyalty_cards WHERE user_id IS NOT NULL)
            ORDER BY u.first_name ASC
            LIMIT $1 OFFSET $2
          `,
        [limit, offset],
        (err, rows) => (err ? reject(err) : resolve(rows)),
      );
    });

    const totalRewards = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) AS total FROM loyalty_transactions WHERE type = 'redeem'",
        (err, row) => (err ? reject(err) : resolve(row ? row.total : 0)),
      );
    });

    res.json({
      success: true,
      rewardThreshold: LOYALTY_REWARD_THRESHOLD,
      totalRewards,
      totalCards: cardCount,
      returnedCards: rows.length,
      hasMore: offset + rows.length < cardCount,
      nextOffset: offset + rows.length,
      usersWithoutCards: usersWithoutCards.map((u) => ({
        userId: u.id,
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
      })),
      cards: rows.map((row) => {
        const linkedName = `${row.first_name} ${row.last_name}`.trim();
        return {
          userId: row.user_id,
          cardId: row.card_id,
          name: (row.holder_name || "").trim() || linkedName,
          email: (row.holder_email || "").trim() || row.user_email || null,
          phone: (row.holder_phone || "").trim() || null,
          isManual: !row.user_id,
          isBanned: row.is_banned === 1,
          cardNumber: row.card_number || null,
          points: row.points || 0,
          eligible: (row.points || 0) >= LOYALTY_REWARD_THRESHOLD,
          progress: Math.min(100, Math.round(((row.points || 0) / LOYALTY_REWARD_THRESHOLD) * 100)),
          rewards: row.rewards || 0,
          purchaseCount: row.purchases || 0,
          cardCreatedAt: row.card_created_at,
          cardUpdatedAt: row.card_updated_at,
        };
      }),
    });
  } catch (error) {
    console.error("Admin loyalty fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------------------------------------------------------- Points history
   INCIDENT 2026-11-06: a disputed balance used to be a number on a badge with
   no way to explain it. The admin can now list every movement across every
   card with its date, instead of opening 642 profiles one at a time.

   Read-only. Paginated on the same contract as the card list, and the totals
   are computed independently of the page so the UI can never report "898
   movements" while showing 200 — the silent-truncation bug in another guise.

   NOTE ON PLACEHOLDERS: db.js rewrites `$n` to `?` for SQLite by replacing
   EVERY occurrence in textual order, and SQLite then binds positionally. So
   the numbers must follow the order the placeholders appear in the SQL — and
   the WHERE clause comes BEFORE the LIMIT. Numbering the LIKEs $1..$4 and
   pushing LIMIT/OFFSET to $5/$6 keeps both engines in agreement. Reusing a
   number would also bind twice. */
app.get("/api/admin/loyalty/history", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = listLimit(req);
    const offset = listOffset(req);
    const needle = String(req.query.q || "").trim().toLowerCase();
    const like = needle ? `%${needle}%` : null;

    const listWhere = needle
      ? `WHERE lower(COALESCE(c.holder_name, '')) LIKE $1
            OR lower(COALESCE(c.card_number, '')) LIKE $2
            OR lower(COALESCE(c.holder_phone, '')) LIKE $3
            OR lower(COALESCE(t.description, '')) LIKE $4`
      : "";
    const countWhere = listWhere;
    const listLimitClause = needle ? "LIMIT $5 OFFSET $6" : "LIMIT $1 OFFSET $2";

    const listParams = needle ? [like, like, like, like, limit, offset] : [limit, offset];
    const countParams = needle ? [like, like, like, like] : [];

    const rows = await new Promise((resolve, reject) => {
      db.all(
        `
            SELECT t.id, t.card_id, t.points_change, t.type, t.description,
                   t.purchase_id, t.created_at,
                   c.card_number, c.holder_name, c.holder_phone
              FROM loyalty_transactions t
              JOIN loyalty_cards c ON c.id = t.card_id
              ${listWhere}
             ORDER BY t.created_at DESC, t.id DESC
             ${listLimitClause}
          `,
        listParams,
        (err, r) => (err ? reject(err) : resolve(r || [])),
      );
    });

    const totals = await new Promise((resolve, reject) => {
      db.get(
        `
            SELECT COUNT(*) AS movements,
                   COALESCE(SUM(t.points_change), 0) AS points
              FROM loyalty_transactions t
              JOIN loyalty_cards c ON c.id = t.card_id
              ${countWhere}
          `,
        countParams,
        (err, row) => (err ? reject(err) : resolve(row || {})),
      );
    });

    const totalMovements = Number(totals.movements) || 0;

    res.json({
      success: true,
      totalMovements,
      totalPoints: Number(totals.points) || 0,
      returned: rows.length,
      hasMore: offset + rows.length < totalMovements,
      nextOffset: offset + rows.length,
      movements: rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardNumber: r.card_number || null,
        name: (r.holder_name || "").trim() || null,
        phone: (r.holder_phone || "").trim() || null,
        pointsChange: Number(r.points_change) || 0,
        type: r.type,
        description: r.description || null,
        purchaseId: r.purchase_id || null,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Admin loyalty history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/loyalty/add-points", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cardId, points } = req.body;
    if (!cardId) return res.status(400).json({ error: "Card ID is required" });

    const pts = Math.floor(Number(points));
    if (!Number.isInteger(pts) || pts < 1 || pts > 1000) {
      return res.status(400).json({ error: "Points must be a positive integer between 1 and 1000" });
    }

    const card = await getLoyaltyCardById(cardId);
    if (!card) return res.status(404).json({ error: "Carte introuvable" });

    // Balance + ledger must move together. If the ledger insert failed after the
    // balance had moved, the customer could redeem points they never earned.
    // Read the balance back INSIDE the transaction: a value computed from the
    // pre-transaction read could be stale when two admins act at once.
    const newPoints = await db.transaction(async (t) => {
      const upd = await t.run(
        "UPDATE loyalty_cards SET points = points + ?, updated_at = datetime('now') WHERE id = ?",
        [pts, card.id],
      );
      if (upd.changes === 0) throw new LoyaltyHttpError(404, "Carte introuvable");
      await logLoyaltyTransaction(card.id, card.user_id, pts, "earn", `Ajout de ${pts} point(s)`, t);
      const fresh = await t.get("SELECT points FROM loyalty_cards WHERE id = ?", [card.id]);
      return Number(fresh && fresh.points) || 0;
    });

    res.json({
      success: true,
      message: `${pts} point(s) added`,
      card: {
        cardId: card.id,
        userId: card.user_id,
        points: newPoints,
        eligible: newPoints >= LOYALTY_REWARD_THRESHOLD,
      },
    });
  } catch (error) {
    if (error instanceof LoyaltyHttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Add loyalty points error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/loyalty/redeem", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cardId } = req.body;
    if (!cardId) return res.status(400).json({ error: "Card ID is required" });

    const card = await getLoyaltyCardById(cardId);
    if (!card) return res.status(404).json({ error: "Carte introuvable" });

    if ((card.points || 0) < LOYALTY_REWARD_THRESHOLD) {
      return res.status(400).json({
        error: `Pas assez de points (${card.points || 0}/${LOYALTY_REWARD_THRESHOLD} requis)`,
      });
    }

    /* The pre-check above gives a friendly 400, but it is not a guard: two
       rapid clicks (or two admins) both read the same balance and could each
       hand out a free perfume for the same 5 points. The conditional UPDATE
       below re-checks the balance at commit time, so only one can succeed. */
    const newPoints = await db.transaction(async (t) => {
      const upd = await t.run(
        `UPDATE loyalty_cards SET points = points - ?, updated_at = datetime('now')
         WHERE id = ? AND points >= ?`,
        [LOYALTY_REWARD_THRESHOLD, card.id, LOYALTY_REWARD_THRESHOLD],
      );
      if (upd.changes === 0) {
        throw new LoyaltyHttpError(409, "Solde insuffisant : la récompense a déjà été accordée ou les points ont changé.");
      }
      await logLoyaltyTransaction(
        card.id,
        card.user_id,
        -LOYALTY_REWARD_THRESHOLD,
        "redeem",
        `Parfum offert (${LOYALTY_REWARD_THRESHOLD} points)`,
        t,
      );
      const fresh = await t.get("SELECT points FROM loyalty_cards WHERE id = ?", [card.id]);
      return Number(fresh && fresh.points) || 0;
    });

    res.json({
      success: true,
      message: `Parfum offert : récompense accordée (${LOYALTY_REWARD_THRESHOLD} points déduits)`,
      card: {
        cardId: card.id,
        userId: card.user_id,
        points: newPoints,
        eligible: newPoints >= LOYALTY_REWARD_THRESHOLD,
      },
    });
  } catch (error) {
    if (error instanceof LoyaltyHttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Redeem loyalty reward error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/loyalty/create", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, name, email, phone, allowDuplicate } = req.body;

    const holderName = String(name || "").trim();
    const holderEmail = String(email || "").trim();
    const holderPhone = String(phone || "").trim();
    if (holderName.length > 120 || holderEmail.length > 200 || holderPhone.length > 40) {
      return res.status(400).json({ error: "Les coordonnées du client sont trop longues" });
    }

    let linkedUserId = null;
    if (userId) {
      const target = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE id = ?", [Number(userId)], (err, row) =>
          err ? reject(err) : resolve(row),
        );
      });
      if (!target) return res.status(404).json({ error: "User not found" });

      const existing = await getLoyaltyCardByUserId(Number(userId));
      if (existing) {
        return res.status(400).json({
          error: `Ce client possède déjà la carte ${existing.card_number || existing.id}`,
        });
      }
      linkedUserId = Number(userId);
    } else {
      if (!holderName) return res.status(400).json({ error: "Le nom est requis" });
      /* Creating a second card for the same walk-in used to be trivial:
         retyping their phone produced a brand-new CH number. Point the admin
         at the existing card instead. */
      const dup = await findDuplicateWalkIn({ name: holderName, phone: holderPhone });
      if (dup && !allowDuplicate) return res.status(409).json(walkInDuplicateError(dup));
    }

    let card;
    let retries = 0;
    for (;;) {
      try {
        card = await db.transaction(async (t) => {
          const cardNumber = await generateCardNumber(t);
          return insertLoyaltyCard(
            linkedUserId !== null
              ? { userId: linkedUserId, cardNumber, holderName: null, holderEmail: null, holderPhone: null }
              : { userId: null, cardNumber, holderName, holderEmail, holderPhone },
            t,
          );
        });
        break;
      } catch (err) {
        if (isCardNumberCollision(err) && retries++ < 4) continue;
        if (isUserCardCollision(err)) {
          return res.status(400).json({ error: "Ce client possède déjà une carte" });
        }
        throw err;
      }
    }

    res.json({
      success: true,
      message: "Carte fidélité créée",
      card: {
        cardId: card.id,
        userId: linkedUserId,
        cardNumber: card.card_number,
        points: card.points || 0,
        eligible: false,
      },
    });
  } catch (error) {
    console.error("Create loyalty card error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/admin/loyalty/update", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cardId, points, name, cardNumber, phone } = req.body;
    if (!cardId) return res.status(400).json({ error: "Card ID is required" });

    const card = await getLoyaltyCardById(cardId);
    if (!card) return res.status(404).json({ error: "Carte introuvable" });

    const updates = [];
    const params = [];
    let targetPoints = null;

    // Update points if provided. The actual write is a *relative* delta
    // computed inside the transaction (below), never an absolute "points = ?":
    // an absolute write combined with the delta being read from a possibly
    // stale row (SQLite has no FOR UPDATE lock) lets two concurrent edits
    // interleave and break balance == SUM(ledger).
    if (points !== undefined) {
      const pts = Math.floor(Number(points));
      if (!Number.isInteger(pts) || pts < 0 || pts > 10000) {
        return res.status(400).json({ error: "Points must be an integer between 0 and 10000" });
      }
      targetPoints = pts;
    }

    // Update holder_name if provided
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Le nom ne peut pas être vide" });
      }
      if (trimmed.length > 80) {
        return res.status(400).json({ error: "Le nom ne peut pas dépasser 80 caractères" });
      }
      updates.push("holder_name = ?");
      params.push(trimmed);
    }

    // Update card_number if provided
    if (cardNumber !== undefined) {
      const trimmed = String(cardNumber).trim();
      if (trimmed.length > 40) {
        return res.status(400).json({ error: "Le numéro de carte ne peut pas dépasser 40 caractères" });
      }
      if (trimmed && trimmed !== card.card_number) {
        // Check uniqueness
        const exists = await new Promise((resolve, reject) => {
          db.get(
            "SELECT 1 AS found FROM loyalty_cards WHERE card_number = ? AND id != ?",
            [trimmed, card.id],
            (err, row) => (err ? reject(err) : resolve(row)),
          );
        });
        if (exists) {
          return res.status(400).json({ error: "Ce numéro de carte est déjà utilisé" });
        }
      }
      /* A card must always have a number. An empty value used to overwrite
         card_number with NULL (breaking the printed card); treat it as "no
         change" instead so editing other fields cannot erase it. */
      if (trimmed) {
        updates.push("card_number = ?");
        params.push(trimmed);
      }
    }

    // Update holder_phone if provided
    if (phone !== undefined) {
      const trimmed = String(phone).trim();
      if (trimmed.length > 30) {
        return res.status(400).json({ error: "Le téléphone ne peut pas dépasser 30 caractères" });
      }
      updates.push("holder_phone = ?");
      params.push(trimmed || null);
    }

    if (updates.length === 0 && targetPoints === null) {
      return res.status(400).json({ error: "Aucun champ à modifier" });
    }

    /* The balance change and the ledger row explaining it commit together or
       not at all. FOR UPDATE (Postgres only) serialises concurrent edits of
       the same card; SQLite serialises writers on its own. */
    try {
      await db.transaction(async (t) => {
        let pointsDiff = 0;
        const extraUpdates = [];
        const extraParams = [];
        if (targetPoints !== null) {
          const lock = db.dialect === "postgres" ? " FOR UPDATE" : "";
          const fresh = await t.get(`SELECT points FROM loyalty_cards WHERE id = ?${lock}`, [card.id]);
          if (!fresh) throw new LoyaltyHttpError(404, "Carte introuvable");
          pointsDiff = targetPoints - (Number(fresh.points) || 0);
          if (pointsDiff !== 0) {
            // Relative write: SQL evaluates points + delta against the value
            // committed at execution time, so a concurrent edit cannot clobber
            // the balance while the ledger still records a stale delta.
            extraUpdates.push("points = points + ?");
            extraParams.push(pointsDiff);
          }
        }
        const allUpdates = [...updates, ...extraUpdates, "updated_at = datetime('now')"];
        const allParams = [...params, ...extraParams, card.id];
        await t.run(`UPDATE loyalty_cards SET ${allUpdates.join(", ")} WHERE id = ?`, allParams);
        if (pointsDiff !== 0) {
          await logLoyaltyTransaction(
            card.id,
            card.user_id,
            pointsDiff,
            "earn",
            pointsDiff > 0
              ? `Modification : +${pointsDiff} point(s)`
              : `Modification : ${pointsDiff} point(s)`,
            t,
          );
        }
      });
    } catch (err) {
      if (err instanceof LoyaltyHttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      /* The uniqueness check above is a read outside the transaction. Two
         admins can still race for the same CH number; the database settles it
         with a UNIQUE violation, which should be a 400 and not a 500. */
      if (isCardNumberCollision(err)) {
        return res.status(400).json({ error: "Ce numéro de carte est déjà utilisé" });
      }
      throw err;
    }

    // Re-fetch the updated card
    const updatedCard = await getLoyaltyCardById(cardId);
    if (!updatedCard) return res.status(404).json({ error: "Carte introuvable" });

    res.json({
      success: true,
      message: "Carte mise à jour",
      card: {
        cardId: updatedCard.id,
        userId: updatedCard.user_id,
        name: updatedCard.holder_name || "",
        cardNumber: updatedCard.card_number || null,
        points: updatedCard.points || 0,
        eligible: (updatedCard.points || 0) >= LOYALTY_REWARD_THRESHOLD,
      },
    });
  } catch (error) {
    console.error("Update loyalty card error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/admin/loyalty/delete", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cardId = Number(req.query.cardId);
    if (!cardId) return res.status(400).json({ error: "Card ID is required" });

    const card = await getLoyaltyCardById(cardId);
    if (!card) return res.status(404).json({ error: "Carte introuvable" });

    await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM loyalty_cards WHERE id = ?",
        [card.id],
        function (err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.json({ success: true, message: "Carte supprimée" });
  } catch (error) {
    console.error("Delete loyalty card error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🛍️ CUSTOMER PURCHASES — record a purchase for a loyalty card.
// A first purchase can also issue the card. Every check runs BEFORE a single
// row is written (an invalid family/date used to leave an orphan card behind),
// and card + purchase + point + ledger commit together or not at all.
app.post("/api/admin/loyalty/purchases", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      cardId,
      userId,
      holderName,
      holderEmail,
      holderPhone,
      perfumeName,
      brand,
      fragranceFamily,
      audience,
      purchasePrice,
      purchaseDate,
      notes,
      awardPoints,
      allowDuplicate,
    } = req.body;

    /* ---------- 1. validate everything before touching the database ---- */
    const trimmedName = perfumeName ? String(perfumeName).trim() : "";
    if (!trimmedName) return res.status(400).json({ error: "Le nom du parfum est requis" });
    if (trimmedName.length > 150) return res.status(400).json({ error: "Le nom ne peut pas dépasser 150 caractères" });

    const validFamilies = ["Woody", "Floral", "Oriental", "Fresh", "Citrus", "Gourmand", "Aromatic", "Chypre", "Aldehyde", "Fougère", "Other"];
    const family = fragranceFamily ? String(fragranceFamily).trim() : null;
    if (family && !validFamilies.includes(family)) {
      return res.status(400).json({ error: `Famille invalide. Valeurs: ${validFamilies.join(", ")}` });
    }

    const validAudiences = ["men", "women", "unisex"];
    const aud = audience ? String(audience).trim() : null;
    if (aud && !validAudiences.includes(aud)) {
      return res.status(400).json({ error: `Audience invalide. Valeurs: ${validAudiences.join(", ")}` });
    }

    const price = purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== ""
      ? Number(purchasePrice)
      : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return res.status(400).json({ error: "Le prix doit être un nombre positif" });
    }

    const date = purchaseDate ? String(purchaseDate).trim() : new Date().toISOString().slice(0, 10);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ error: "La date d'achat doit être une date valide au format AAAA-MM-JJ" });
    }

    const trimmedBrand = brand ? String(brand).trim().slice(0, 100) : null;
    const trimmedNotes = notes ? String(notes).trim().slice(0, 500) : null;
    const walkName = String(holderName || "").trim();
    const walkEmail = String(holderEmail || "").trim();
    const walkPhone = String(holderPhone || "").trim();
    if (walkName.length > 120 || walkEmail.length > 200 || walkPhone.length > 40) {
      return res.status(400).json({ error: "Les coordonnées du client sont trop longues" });
    }

    /* Accept the boolean the admin UI sends, plus the string/number forms a
       hand-written client might send. Default is to award the point. */
    const award = awardPoints === undefined || awardPoints === null
      ? true
      : !(awardPoints === false || awardPoints === "false" || awardPoints === 0 || awardPoints === "0");

    /* ---------- 2. resolve the target card (reads only) ---------------- */
    let card = cardId ? await getLoyaltyCardById(cardId) : null;
    if (cardId && !card) return res.status(404).json({ error: "Carte introuvable" });

    let issueMode = null; // "account" | "walkin" when a new card is needed
    if (!card) {
      if (userId) {
        const target = await new Promise((resolve, reject) => {
          db.get("SELECT id FROM users WHERE id = ?", [Number(userId)], (err, row) =>
            err ? reject(err) : resolve(row),
          );
        });
        if (!target) return res.status(404).json({ error: "User not found" });
        const existing = await getLoyaltyCardByUserId(Number(userId));
        if (existing) {
          return res.status(400).json({
            error: `Ce client possède déjà la carte ${existing.card_number || existing.id}. Sélectionnez cette carte pour enregistrer l'achat.`,
          });
        }
        issueMode = "account";
      } else {
        if (!walkName) return res.status(400).json({ error: "Le nom du client est requis" });
        const dup = await findDuplicateWalkIn({ name: walkName, phone: walkPhone });
        if (dup && !allowDuplicate) return res.status(409).json(walkInDuplicateError(dup));
        issueMode = "walkin";
      }
    }

    /* ---------- 3. one atomic commit ----------------------------------- */
    // The purchase_id column is added by an async boot migration. Waiting here
    // means the +1 ledger row always carries the link that DELETE needs to
    // reverse it; without this, a purchase made during boot could never be
    // undone correctly.
    await loyaltyLedgerReady;
    let resolvedCard = card;
    let issued = false;
    let purchaseId;
    let duplicateOf = null;
    let retries = 0;
    for (;;) {
      try {
        await db.transaction(async (t) => {
          let active = resolvedCard;
          let didIssue = false;
          if (!active) {
            const cardNumber = await generateCardNumber(t);
            active = await insertLoyaltyCard(
              issueMode === "account"
                ? { userId: Number(userId), cardNumber, holderName: null, holderEmail: null, holderPhone: null }
                : { userId: null, cardNumber, holderName: walkName, holderEmail: walkEmail, holderPhone: walkPhone },
              t,
            );
            didIssue = true;
          }

          /* INCIDENT 2026-11-06: with a slow save, staff clicked
             "Enregistrer" twice and the second click inserted a SECOND
             purchase and a SECOND point. Treat an identical resubmission
             within 5s as the same purchase. allowDuplicate=true is the
             deliberate escape hatch for two truly identical items. */
          if (active && !didIssue && !allowDuplicate) {
            const prev = await t.get(
              `SELECT id, perfume_name, brand, purchase_price, purchase_date, created_at
               FROM customer_purchases WHERE card_id = ? ORDER BY id DESC LIMIT 1`,
              [active.id],
            );
            if (prev) {
              const sameItem =
                String(prev.perfume_name || "").trim() === trimmedName &&
                String(prev.brand || "") === String(trimmedBrand || "") &&
                String(prev.purchase_date || "") === date &&
                (prev.purchase_price == null
                  ? price === null
                  : Number(prev.purchase_price) === price);
              const stamp =
                prev.created_at instanceof Date
                  ? prev.created_at
                  : new Date(String(prev.created_at || "").replace(" ", "T") + "Z");
              const age = Date.now() - stamp.getTime();
              if (sameItem && Number.isFinite(age) && age >= 0 && age < 5000) {
                duplicateOf = prev.id;
                resolvedCard = active;
                return;
              }
            }
          }

          const r = await t.run(
            `INSERT INTO customer_purchases (card_id, perfume_name, brand, fragrance_family, audience, purchase_price, purchase_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [active.id, trimmedName, trimmedBrand, family, aud, price, date, trimmedNotes],
          );

          // Card rule: "5 points = 1 parfum offert" — one point per purchase.
          if (award) {
            await t.run(
              "UPDATE loyalty_cards SET points = points + 1, updated_at = datetime('now') WHERE id = ?",
              [active.id],
            );
            // purchase_id lets DELETE /purchases/:id reverse exactly this point.
            await logLoyaltyTransaction(active.id, active.user_id, 1, "earn", `Achat: ${trimmedName}`, t, r.lastID);
          }

          resolvedCard = active;
          issued = didIssue;
          purchaseId = r.lastID;
        });
        break;
      } catch (err) {
        /* Two admins can race for the same generated CH number, or for the
           same account's card. Re-read and retry rather than returning 500. */
        if (isCardNumberCollision(err) && retries++ < 4) {
          resolvedCard = null;
          continue;
        }
        if (isUserCardCollision(err) && retries++ < 4) {
          const existing = await getLoyaltyCardByUserId(Number(userId));
          if (existing) {
            resolvedCard = existing;
            continue;
          }
        }
        throw err;
      }
    }

    if (duplicateOf) {
      return res.json({
        success: true,
        duplicate: true,
        purchaseId: duplicateOf,
        issued: false,
        card: {
          cardId: resolvedCard.id,
          cardNumber: resolvedCard.card_number,
          holderName: resolvedCard.holder_name || null,
        },
        message: "Achat déjà enregistré (double validation ignorée)",
      });
    }

    res.json({
      success: true,
      purchaseId,
      issued,
      card: {
        cardId: resolvedCard.id,
        cardNumber: resolvedCard.card_number,
        holderName: resolvedCard.holder_name || null,
      },
      message: issued
        ? `Carte ${resolvedCard.card_number} ouverte — premier achat enregistré`
        : "Achat enregistré",
    });
  } catch (error) {
    console.error("Create purchase error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🛍️ CUSTOMER PURCHASES — delete a purchase AND reverse the point it earned.
// Deleting used to leave the +1 point and its ledger row behind: the customer
// kept a point for a purchase that no longer existed. Both now move together.
app.delete("/api/admin/loyalty/purchases/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ error: "ID invalide" });
    }

    // Same gate as the create side: never query purchase_id before the boot
    // migration has had a chance to add it.
    await loyaltyLedgerReady;
    let reversed = 0;
    try {
      await db.transaction(async (t) => {
        const purchase = await t.get("SELECT * FROM customer_purchases WHERE id = ?", [purchaseId]);
        if (!purchase) throw new LoyaltyHttpError(404, "Achat introuvable");

        /* Legacy rows (created before purchase_id existed) have no link, and
           purchases recorded with awardPoints:false never earned a point. In
           both cases there is nothing to reverse, so no debit is invented. */
        const linked = loyaltyLedgerHasPurchaseId
          ? await t.all(
              "SELECT id, points_change FROM loyalty_transactions WHERE purchase_id = ? AND card_id = ?",
              [purchaseId, purchase.card_id],
            )
          : [];
        reversed = linked.reduce((sum, row) => sum + (Number(row.points_change) || 0), 0);

        if (reversed > 0) {
          const card = await t.get("SELECT points FROM loyalty_cards WHERE id = ?", [purchase.card_id]);
          const balance = Number(card && card.points) || 0;
          if (balance < reversed) {
            /* The point has already been spent on a reward. Reversing it now
               would drive the balance negative, so refuse with a clear reason
               instead of silently breaking balance = SUM(ledger). */
            throw new LoyaltyHttpError(
              409,
              `Cet achat a rapporté ${reversed} point(s) déjà utilisé(s) (solde actuel ${balance}). Ajustez le solde avant de supprimer cet achat.`,
            );
          }
          await t.run(
            "UPDATE loyalty_cards SET points = points - ?, updated_at = datetime('now') WHERE id = ?",
            [reversed, purchase.card_id],
          );
          await t.run(
            "DELETE FROM loyalty_transactions WHERE purchase_id = ? AND card_id = ?",
            [purchaseId, purchase.card_id],
          );
        }

        await t.run("DELETE FROM customer_purchases WHERE id = ?", [purchaseId]);
      });
    } catch (err) {
      if (err instanceof LoyaltyHttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }

    res.json({
      success: true,
      message: reversed > 0
        ? `Achat supprimé — ${reversed} point(s) retiré(s)`
        : "Achat supprimé",
      pointsReversed: reversed,
    });
  } catch (error) {
    console.error("Delete purchase error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 👤 CUSTOMER PROFILE — full profile with purchase history + preferences + suggestions
app.get("/api/admin/loyalty/profiles/:cardId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cardId = Number(req.params.cardId);
    if (!cardId) return res.status(400).json({ error: "ID invalide" });

    const card = await getLoyaltyCardById(cardId);
    if (!card) return res.status(404).json({ error: "Carte introuvable" });

    // Fetch all purchases for this card
    const purchases = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM customer_purchases WHERE card_id = ? ORDER BY purchase_date DESC, id DESC",
        [card.id],
        (err, rows) => (err ? reject(err) : resolve(rows || [])),
      );
    });

    // Compute fragrance family breakdown
    const familyCount = {};
    purchases.forEach((p) => {
      const f = p.fragrance_family || "Non spécifié";
      familyCount[f] = (familyCount[f] || 0) + 1;
    });
    const totalPurchases = purchases.length;
    const preferences = Object.entries(familyCount)
      .map(([family, count]) => ({ family, count, percentage: totalPurchases > 0 ? Math.round((count / totalPurchases) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // Audience breakdown
    const audienceCount = {};
    purchases.forEach((p) => {
      const a = p.audience || "Non spécifié";
      audienceCount[a] = (audienceCount[a] || 0) + 1;
    });

    // Brands bought
    const brandCount = {};
    purchases.forEach((p) => {
      const b = p.brand || "Inconnu";
      brandCount[b] = (brandCount[b] || 0) + 1;
    });
    const topBrands = Object.entries(brandCount)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Suggestions: other perfumes from preferred families this customer hasn't bought
    const purchasedNames = purchases.map((p) => p.perfume_name.toLowerCase());
    const topFamilies = preferences.slice(0, 3).map((p) => p.family).filter((f) => f !== "Non spécifié");
    let suggestions = [];
    if (topFamilies.length > 0) {
      const familyPlaceholders = topFamilies.map(() => "?").join(",");
      const namePlaceholders = purchasedNames.length > 0 ? purchasedNames.map(() => "?").join(",") : "''";
      const otherPurchases = await new Promise((resolve, reject) => {
        db.all(
          `SELECT perfume_name, brand, fragrance_family, audience, COUNT(*) AS freq
           FROM customer_purchases
           WHERE fragrance_family IN (${familyPlaceholders})
             AND LOWER(perfume_name) NOT IN (${namePlaceholders})
           GROUP BY perfume_name, brand, fragrance_family, audience
           ORDER BY freq DESC
           LIMIT 6`,
          [...topFamilies, ...purchasedNames],
          (err, rows) => (err ? reject(err) : resolve(rows || [])),
        );
      });
      suggestions = otherPurchases.map((r) => ({
        name: r.perfume_name,
        brand: r.brand,
        fragrance_family: r.fragrance_family,
        audience: r.audience,
        freq: r.freq,
      }));
    }

    // Total spent
    const totalSpent = purchases.reduce((sum, p) => sum + (p.purchase_price || 0), 0);

    // Count redeemed rewards
    const rewardsCount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) AS total FROM loyalty_transactions WHERE card_id = ? AND type = 'redeem'",
        [card.id],
        (err, row) => (err ? reject(err) : resolve(row ? row.total : 0)),
      );
    });

    /* INCIDENT 2026-11-06: the admin profile showed a bare number with no way
       to explain it. When a customer disputes their balance the assistant
       needs the movements, not just the total. Read-only, newest first. */
    const transactions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, points_change, type, description, created_at
         FROM loyalty_transactions WHERE card_id = ?
         ORDER BY created_at DESC, id DESC LIMIT 200`,
        [card.id],
        (err, list) => (err ? reject(err) : resolve(list || [])),
      );
    });

    res.json({
      card: {
        cardId: card.id,
        userId: card.user_id,
        name: card.holder_name || "",
        email: card.holder_email || null,
        phone: card.holder_phone || null,
        cardNumber: card.card_number || null,
        points: card.points || 0,
        rewards: rewardsCount,
        createdAt: card.created_at,
      },
      purchases,
      transactions,
      preferences,
      audienceBreakdown: audienceCount,
      topBrands,
      suggestions,
      stats: {
        totalPurchases,
        totalSpent: Math.round(totalSpent * 100) / 100,
        topFamily: preferences[0]?.family || null,
        favoriteBrand: topBrands[0]?.brand || null,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 💳 CARTE FIDÉLITÉ — the customer's own card (drives /app/loyalty).
// The admin route above shows every card; this one shows only the caller's,
// and only the fields that belong to them: their balance, their own history
// and the same preference maths the shop assistant sees — nothing about any
// other customer. No points can move from here.
app.get("/api/loyalty/me", authenticateToken, async (req, res) => {
  try {
    const card = await getLoyaltyCardByUserId(req.user.userId);

    const purchases = card
      ? await new Promise((resolve, reject) => {
          db.all(
            "SELECT * FROM customer_purchases WHERE card_id = ? ORDER BY purchase_date DESC, id DESC",
            [card.id],
            (err, rows) => (err ? reject(err) : resolve(rows || [])),
          );
        })
      : [];

    const transactions = card
      ? await new Promise((resolve, reject) => {
          db.all(
            "SELECT points_change, type, description, created_at FROM loyalty_transactions WHERE card_id = ? ORDER BY created_at DESC, id DESC",
            [card.id],
            (err, rows) => (err ? reject(err) : resolve(rows || [])),
          );
        })
      : [];

    /* A brand-new stock card (no purchase, no points, no history) is not a
       loyalty card yet, so the page shows the "make a first purchase" gate.
       But points can legitimately be added by the shop without a recorded
       purchase. Gating on purchases alone used to hide those balances
       entirely — the customer saw "no card" despite holding points. */
    if (!card || (purchases.length === 0 && (card.points || 0) === 0 && transactions.length === 0)) {
      return res.json({
        success: true,
        hasCard: false,
        rewardThreshold: LOYALTY_REWARD_THRESHOLD,
      });
    }

    // Same preference maths as the admin profile: families, then brands, then
    // the suggestions the customer does not own yet.
    const familyCount = {};
    purchases.forEach((p) => {
      const f = p.fragrance_family || "Non spécifié";
      familyCount[f] = (familyCount[f] || 0) + 1;
    });
    const totalPurchases = purchases.length;
    const preferences = Object.entries(familyCount)
      .map(([family, count]) => ({
        family,
        count,
        percentage: totalPurchases > 0 ? Math.round((count / totalPurchases) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const brandCount = {};
    purchases.forEach((p) => {
      const b = p.brand || "Inconnu";
      brandCount[b] = (brandCount[b] || 0) + 1;
    });
    const topBrands = Object.entries(brandCount)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const purchasedNames = purchases.map((p) => p.perfume_name.toLowerCase());
    const topFamilies = preferences.slice(0, 3).map((p) => p.family).filter((f) => f !== "Non spécifié");
    let suggestions = [];
    if (topFamilies.length > 0) {
      const familyPlaceholders = topFamilies.map(() => "?").join(",");
      const namePlaceholders = purchasedNames.length > 0 ? purchasedNames.map(() => "?").join(",") : "''";
      suggestions = await new Promise((resolve, reject) => {
        db.all(
          `SELECT perfume_name, brand, fragrance_family, audience, COUNT(*) AS freq
           FROM customer_purchases
           WHERE fragrance_family IN (${familyPlaceholders})
             AND LOWER(perfume_name) NOT IN (${namePlaceholders})
           GROUP BY perfume_name, brand, fragrance_family, audience
           ORDER BY freq DESC
           LIMIT 6`,
          [...topFamilies, ...purchasedNames],
          (err, rows) => (err ? reject(err) : resolve(rows || [])),
        );
      });
    }

    const totalSpent = purchases.reduce((sum, p) => sum + (p.purchase_price || 0), 0);
    const rewardsCount = transactions.filter((t) => t.type === "redeem").length;

    // The card rule: LOYALTY_REWARD_THRESHOLD redeemed points = one perfume.
    const remaining = Math.max(0, LOYALTY_REWARD_THRESHOLD - (card.points || 0));

    res.json({
      success: true,
      hasCard: true,
      rewardThreshold: LOYALTY_REWARD_THRESHOLD,
      card: {
        cardId: card.id,
        /* A card linked to an account carries no holder_name (the admin form
           only sets one for walk-in cards), so fall back to the account's own
           name — otherwise the painted card renders "Nom:" empty. */
        name:
          (card.holder_name || "").trim() ||
          [req.user.dbUser?.first_name, req.user.dbUser?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          null,
        cardNumber: card.card_number || null,
        points: card.points || 0,
        eligible: (card.points || 0) >= LOYALTY_REWARD_THRESHOLD,
        progress: Math.min(100, Math.round(((card.points || 0) / LOYALTY_REWARD_THRESHOLD) * 100)),
        remaining,
        rewards: rewardsCount,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      },
      purchases,
      preferences,
      topBrands,
      suggestions,
      transactions: transactions.slice(0, 40),
      stats: {
        totalPurchases,
        totalSpent: Math.round(totalSpent * 100) / 100,
        topFamily: preferences[0]?.family || null,
        favoriteBrand: topBrands[0]?.brand || null,
      },
    });
  } catch (error) {
    console.error("Loyalty me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔍 SEARCH LOYALTY PROFILES — admin console only.
// requireAdmin, not just authenticateToken: this searches EVERY loyalty card
// and returns holder name, phone, email, card number, points and purchase
// count. With only authenticateToken any signed-in customer could page the
// whole customer base ten rows at a time with a two-character query. The
// storefront has no customer directory and does not call this; the admin
// console reads the same records from /api/admin/loyalty, so scoping it to
// administrators costs nothing. Flagged as P0 in
// docs/INVESTIGATION-2026-08-30.html and docs/migration-plan-legacy-to-react.md.
app.get("/api/search/loyalty-profiles", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2 || query.length > 100) return res.json([]);

    const searchTerm = `%${query.toLowerCase()}%`;
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT c.id AS card_id, c.holder_name, c.holder_phone, c.holder_email, c.card_number,
                c.points, c.created_at,
                (SELECT COUNT(*) FROM customer_purchases cp WHERE cp.card_id = c.id) AS purchase_count,
                (SELECT COUNT(*) FROM loyalty_transactions lt WHERE lt.card_id = c.id AND lt.type = 'redeem') AS rewards
         FROM loyalty_cards c
         WHERE LOWER(c.holder_name) LIKE ?
            OR LOWER(c.holder_phone) LIKE ?
            OR LOWER(c.card_number) LIKE ?
            OR LOWER(c.holder_email) LIKE ?
         ORDER BY
           CASE
             WHEN LOWER(c.holder_name) = LOWER(?) THEN 1
             WHEN LOWER(c.holder_name) LIKE ? THEN 2
             ELSE 3
           END
         LIMIT 10`,
        [searchTerm, searchTerm, searchTerm, searchTerm, query, `${query.toLowerCase()}%`],
        (err, rows) => (err ? reject(err) : resolve(rows || [])),
      );
    });

    res.json(rows.map((r) => ({
      cardId: r.card_id,
      name: (r.holder_name || "").trim(),
      phone: (r.holder_phone || "").trim() || null,
      email: (r.holder_email || "").trim() || null,
      cardNumber: r.card_number || null,
      points: r.points || 0,
      purchaseCount: r.purchase_count || 0,
      rewards: r.rewards || 0,
      memberSince: r.created_at,
    })));
  } catch (error) {
    console.error("Search loyalty profiles error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📰 NEWS & NOTIFICATIONS — public (visible to all users)
app.get("/api/news", async (req, res) => {
  try {
    const news = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM news WHERE is_active = 1 ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2",
        [listLimit(req), listOffset(req)],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    res.json({ success: true, news });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ success: false, error: "Failed to fetch news" });
  }
});

// 📰 NEWS & NOTIFICATIONS — admin: list all (including inactive)
app.get(
  "/api/admin/news",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const news = await new Promise((resolve, reject) => {
        db.all(
          "SELECT * FROM news ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2",
          [listLimit(req), listOffset(req)],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });
      res.json({ success: true, news });
    } catch (error) {
      console.error("Error fetching admin news:", error);
      res.status(500).json({ success: false, error: "Failed to fetch news" });
    }
  },
);

// 📰 NEWS & NOTIFICATIONS — admin: create
app.post(
  "/api/admin/news",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        template_type = "general",
        badge = "",
        icon = "",
        color = "",
        title = "",
        content = "",
        cta_label = "",
        cta_url = "",
      } = req.body || {};

      const cleanTitle = String(title).trim();
      const cleanContent = String(content).trim();

      if (!cleanTitle || !cleanContent) {
        return res
          .status(400)
          .json({ error: "Titre et message sont requis" });
      }

      const allowedTypes = ["promotion", "new_perfume", "event", "general"];
      const cleanType = allowedTypes.includes(template_type)
        ? template_type
        : "general";

      const cleanBadge = String(badge).trim().slice(0, 40);
      const cleanIcon = String(icon).trim().slice(0, 8);
      const cleanColor = String(color).trim().slice(0, 32);
      const cleanCtaLabel = String(cta_label).trim().slice(0, 60);
      const cleanCtaUrl = String(cta_url).trim().slice(0, 500);

      const result = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO news (template_type, badge, icon, color, title, content, cta_label, cta_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cleanType,
            cleanBadge,
            cleanIcon,
            cleanColor,
            cleanTitle,
            cleanContent,
            cleanCtaLabel,
            cleanCtaUrl,
          ],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          },
        );
      });

      res.json({
        success: true,
        id: result,
        message: "Actualité publiée pour tous les utilisateurs",
      });
    } catch (error) {
      console.error("Error creating news:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// 📰 NEWS & NOTIFICATIONS — admin: delete
app.delete(
  "/api/admin/news/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const newsId = Number(req.params.id);
      if (!newsId)
        return res.status(400).json({ error: "News ID is required" });

      const result = await new Promise((resolve, reject) => {
        db.run("DELETE FROM news WHERE id = ?", [newsId], function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });

      if (!result)
        return res.status(404).json({ error: "Actualité introuvable" });

      res.json({ success: true, message: "Actualité supprimée" });
    } catch (error) {
      console.error("Error deleting news:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── GUEST NOTES: public submit + admin read/delete ───────────────────
const notesLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many notes, please try again later." },
  keyGenerator: clientKey,
});

app.post("/api/notes", notesLimiter, (req, res) => {
  const { message, authorName } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }
  const cleanMsg = sanitizeHtml(message.trim().slice(0, 1000));
  const cleanName = sanitizeHtml((authorName || "Anonymous").trim().slice(0, 100));
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  db.run(
    "INSERT INTO guest_notes (message, author_name, ip_address) VALUES (?, ?, ?)",
    [cleanMsg, cleanName, ip],
    function (err) {
      if (err) {
        console.error("Error saving note:", err);
        return res.status(500).json({ error: "Failed to save note." });
      }
      res.json({ success: true, id: this.lastID });
    },
  );
});

// ================= STORE HOURS CONFIG =================
const DEFAULT_STORE_HOURS = {
  schedule: [
    { day: "Sunday", open: null, close: null },
    { day: "Monday", open: 9, close: 19 },
    { day: "Tuesday", open: 9, close: 19 },
    { day: "Wednesday", open: 9, close: 19 },
    { day: "Thursday", open: 9, close: 19 },
    { day: "Friday", open: 9, close: 19 },
    { day: "Saturday", open: 10, close: 18 },
  ],
  timezone: "GMT+1 · Tunis Local Time",
  appointmentNote: "Appointments on request",
};

const readStoreHours = () => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT value FROM store_settings WHERE key = 'store_hours'",
      (err, row) => {
        if (err) return reject(err);
        try {
          const parsed = row && row.value ? JSON.parse(row.value) : null;
          resolve(parsed || DEFAULT_STORE_HOURS);
        } catch (e) {
          console.error("Error parsing store_hours:", e);
          resolve(DEFAULT_STORE_HOURS);
        }
      },
    );
  });
};

const sanitizeHours = (body) => {
  const raw = body && body.schedule;
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Accept hour values as numbers (9, 9.5, 18.75) or "HH:MM" strings ("09:30").
  const toHour = (v) => {
    if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v.trim())) {
      const [h, m] = v.trim().split(":").map((n) => parseInt(n, 10));
      return h + (Number.isFinite(m) ? m / 60 : 0);
    }
    const n = typeof v === "number" ? v : globalThis.parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  const schedule = days.map((day, i) => {
    const item = raw[i] || {};
    // Round to 4 decimals to avoid float artifacts (e.g. 10.300000000000001).
    const norm = (n) => (n === null ? null : Math.round(n * 10000) / 10000);
    let open = norm(toHour(item.open));
    let close = norm(toHour(item.close));
    if (open === null || close === null || open < 0 || open > 24 || close < 0 || close > 24) {
      open = null;
      close = null;
    } else if (close <= open) {
      open = null;
      close = null;
    }
    return { day, open, close };
  });
  return {
    schedule,
    timezone: sanitizeHtml(String(body.timezone || DEFAULT_STORE_HOURS.timezone).trim().slice(0, 120)),
    appointmentNote: sanitizeHtml(String(body.appointmentNote || DEFAULT_STORE_HOURS.appointmentNote).trim().slice(0, 120)),
  };
};

app.get("/api/store-hours", async (req, res) => {
  try {
    const config = await readStoreHours();
    res.json({ success: true, config });
  } catch (error) {
    console.error("Error fetching store hours:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(
  "/api/admin/store-hours",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const config = await readStoreHours();
      res.json({ success: true, config });
    } catch (error) {
      console.error("Error fetching admin store hours:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.put(
  "/api/admin/store-hours",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const config = sanitizeHours(req.body);
      if (!config) {
        return res.status(400).json({ error: "Invalid schedule. Expected 7 days." });
      }
      await new Promise((resolve, reject) => {
        db.run(
          "INSERT OR REPLACE INTO store_settings (key, value, updated_at) VALUES ('store_hours', ?, CURRENT_TIMESTAMP)",
          [JSON.stringify(config)],
          function (err) {
            if (err) reject(err);
            else resolve();
          },
        );
      });
      res.json({ success: true, config });
    } catch (error) {
      console.error("Error saving store hours:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.get(
  "/api/admin/notes",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const notes = await new Promise((resolve, reject) => {
        db.all(
          "SELECT * FROM guest_notes ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2",
          [listLimit(req), listOffset(req)],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });
      res.json({ success: true, notes });
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.put(
  "/api/admin/notes/:id/read",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE guest_notes SET is_read = 1 WHERE id = ?",
          [req.params.id],
          function (err) {
            if (err) reject(err);
            else resolve(this);
          },
        );
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking note as read:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.delete(
  "/api/admin/notes/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM guest_notes WHERE id = ?",
          [req.params.id],
          function (err) {
            if (err) reject(err);
            else resolve(this);
          },
        );
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/*
 * Development-only debug routes.
 *
 * Gated on an EXPLICIT opt-in rather than `NODE_ENV === "development"`.
 * That check looked safe but was the app's own default (server.js sets
 * NODE_ENV to "development" when it is unset), so on any host that had not
 * exported NODE_ENV=production these were live. They take no token:
 * /api/dev/debug-user/:userId returned a name, email and avatar for ANY user
 * id, /api/dev/debug-favorites/:userId returned that user's favourites, and
 * POST /api/dev/reset-rate-limit cleared the auth limiter - so anyone who
 * reached the host could read personal data and then brute-force login.
 *
 * `ENABLE_DEV_ROUTES=true` has to be set deliberately, and an admin token is
 * still required: these inspect the database, they are not a health check.
 */
if (process.env.ENABLE_DEV_ROUTES === "true") {
  const devGuard = [authenticateToken, requireAdmin];

  app.post("/api/dev/reset-rate-limit", devGuard, (req, res) => {
    authLimiter.resetKey(req.ip);
    res.json({ success: true, message: "Rate limit reset for your IP" });
  });

  // Debug route to check favorites in database
  app.get("/api/dev/debug-favorites/:userId", devGuard, async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await new Promise((resolve, reject) => {
        db.all(
          "SELECT * FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC",
          [userId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });

      res.json({
        success: true,
        userId: userId,
        favorites: favorites,
        count: favorites.length,
      });
    } catch (error) {
      console.error("Debug favorites error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Debug route to check user avatar in database
  app.get("/api/dev/debug-user/:userId", devGuard, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id, first_name, last_name, email, avatar_url FROM users WHERE id = ?",
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const computedAvatar = user.avatar_url || "default.jpg";

      res.json({
        success: true,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          avatar_url_in_db: user.avatar_url,
          computed_avatar: computedAvatar,
        },
      });
    } catch (error) {
      console.error("Debug user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Force refresh user data endpoint
  app.post(
    "/api/dev/refresh-user-data",
    authenticateToken,
    async (req, res) => {
      try {
        const user = await new Promise((resolve, reject) => {
          db.get(
            "SELECT * FROM users WHERE id = ?",
            [req.user.userId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            },
          );
        });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({
          success: true,
          message: "User data refreshed from database",
          user: {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday,
            isAdmin: user.is_admin === 1,
            avatar: user.avatar_url || "default.jpg",
          },
        });
      } catch (error) {
        console.error("Refresh user data error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );
}

// Avatar upload endpoint
app.post("/api/user/upload-avatar", authenticateToken, (req, res) => {
  res.status(410).json({
    error: "Base64 avatar uploads are no longer supported. Use /api/upload-avatar.",
  });
});

// Reviews API endpoints
// Get reviews for a specific fragrance
app.get("/api/reviews/:fragrance", (req, res) => {
  const { fragrance } = req.params;

  db.all(
    `SELECT r.id, r.user_id, r.user_name, r.user_avatar,
            u.is_admin AS is_admin, r.fragrance, r.rating, r.review_text,
            r.likes, r.dislikes, r.created_at, r.updated_at,
            u.first_name, u.last_name, u.avatar_url
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.fragrance = ?
         ORDER BY r.created_at DESC
         LIMIT 200`,
    [fragrance],
    (err, rows) => {
      if (err) {
        console.error("Error fetching reviews:", err);
        return res.status(500).json({ error: "Failed to fetch reviews" });
      }

      // Add level progress calculation for each review. The explicit SELECT above is
      // intentional: this public endpoint must never return reviewer email addresses
      // (PII) or other private columns.
      const reviewsWithLevelData = rows.map((review) => ({ ...review }));

      console.log(
        `✅ Fetched ${reviewsWithLevelData.length} reviews for ${fragrance}`,
      );
      res.json({ success: true, reviews: reviewsWithLevelData });
    },
  );
});

// Post a new review
app.post("/api/reviews", authenticateToken, (req, res) => {
  const { fragrance, rating, review_text } = req.body;
  const userId = req.user.userId;

  // Validation
  if (!fragrance || !rating || !review_text) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  // 🔒 SECURITY: Sanitize review text to prevent XSS
  const sanitizedReviewText = sanitizeHtml(review_text);

  if (review_text.length < 10) {
    return res
      .status(400)
      .json({ error: "Review must be at least 10 characters long" });
  }

  // FIX ISS-011: Add max length check (consistent with PUT endpoint's 500 char limit)
  if (review_text.length > 500) {
    return res
      .status(400)
      .json({ error: "Review must be at most 500 characters long" });
  }

  // Get user info including admin status
  db.get(
    "SELECT first_name, last_name, avatar_url, is_admin, email FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ error: "Failed to fetch user info" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Properly construct user name (avoid trailing spaces)
      const userName = `${user.first_name} ${user.last_name || ""}`.trim();
      const userAvatar = user.avatar_url || "default.jpg";
      const isAdmin = user.is_admin ? 1 : 0;

      console.log(`📝 Creating review for user: "${userName}" (ID: ${userId})`);
      console.log(
        `🖼️ Using avatar: ${userAvatar ? (userAvatar.startsWith("data:") ? "custom base64" : userAvatar) : "default"}`,
      );
      console.log(`👑 User admin status: ${isAdmin}`);

      // Validate user name is not empty
      if (!userName || userName.trim() === "") {
        return res.status(400).json({ error: "User name cannot be empty" });
      }

      // Insert review with admin status (using sanitized text)
      db.run(
        "INSERT INTO reviews (user_id, user_name, user_avatar, user_email, is_admin, fragrance, rating, review_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          userName,
          userAvatar,
          user.email,
          isAdmin ? 1 : 0,
          fragrance,
          rating,
          sanitizedReviewText,
        ],
        function (err) {
          if (err) {
            console.error("Error inserting review:", err);
            return res.status(500).json({ error: "Failed to save review" });
          }

          // Get the inserted review without returning the private email column.
          db.get(
            `SELECT id, user_id, user_name, user_avatar, is_admin, fragrance,
                    rating, review_text, likes, dislikes, created_at, updated_at
             FROM reviews WHERE id = ?`,
            [this.lastID],
            async (err, review) => {
              if (err) {
                console.error("Error fetching inserted review:", err);
                return res
                  .status(500)
                  .json({ error: "Review saved but failed to fetch" });
              }

              // 🆕 Award experience for creating a review and return updated XP/level
              let xpPayload = null;
              // XP system removed

              console.log(
                `✅ New review saved for ${fragrance} by ${userName}`,
              );
              res.json({ success: true, review, xp: xpPayload });
            },
          );
        },
      );
    },
  );
});

// Update review likes/dislikes
// Legacy like endpoint removed to prevent unauthenticated spamming of counts
app.post("/api/reviews/:reviewId/like", (req, res) => {
  return res.status(410).json({
    error: "This endpoint is deprecated. Use POST /api/reviews/like instead.",
  });
});

// 🔧 NEW: Avatar upload endpoint with file system storage
app.post(
  "/api/upload-avatar",
  uploadLimiter,
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user.userId;
      const previousAvatar = safeAvatarValue(req.user.dbUser?.avatar_url);
      const fileName = `avatar_${userId}_${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, fileName);

      if (!sharp) {
        return res
          .status(500)
          .json({ error: "Image processing is unavailable on this host" });
      }

      // Process and resize image using Sharp
      await sharp(req.file.buffer)
        .resize(200, 200, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 85 })
        .toFile(filePath);

      // Update user's avatar_url in database
      const avatarUrl = `/uploads/avatars/${fileName}`;

      db.run(
        "UPDATE users SET avatar_url = ? WHERE id = ?",
        [avatarUrl, userId],
        function (err) {
          if (err) {
            console.error("Error updating avatar in database:", err);
            // Clean up uploaded file
            fs.unlink(filePath, () => {});
            return res.status(500).json({ error: "Failed to update avatar" });
          }

          console.log(`✅ Avatar updated for user ${userId}: ${avatarUrl}`);
          if (previousAvatar.startsWith("/uploads/avatars/")) {
            const previousPath = path.join(
              uploadsDir,
              path.basename(previousAvatar),
            );
            if (previousPath !== filePath) fs.unlink(previousPath, () => {});
          }
          res.json({
            success: true,
            avatarUrl: avatarUrl,
            message: "Avatar uploaded successfully",
          });
        },
      );
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  },
);

// Update user profile in all existing reviews and replies
app.post("/api/reviews/update-user-profile", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const name = userDisplayName(req.user.dbUser);
  const avatar = safeAvatarValue(req.user.dbUser?.avatar_url);

  console.log(
    `📝 Updating profile for user ${userId}: name="${name}", avatar="${avatar}"`,
  );

  if (!validateName(name)) {
    console.error("❌ Stored user name is invalid");
    return res.status(400).json({ error: "Valid user name is required" });
  }

  // Start transaction to update both reviews and replies
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let reviewsUpdated = 0;
    let repliesUpdated = 0;
    let errors = [];

    // Update all reviews for this user
    db.run(
      "UPDATE reviews SET user_name = ?, user_avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      [name, avatar, userId],
      function (err) {
        if (err) {
          console.error("Error updating user profile in reviews:", err);
          errors.push("Failed to update reviews");
        } else {
          reviewsUpdated = this.changes;
          console.log(
            `✅ Updated profile in ${reviewsUpdated} reviews for user ${userId}`,
          );
        }

        // Update all replies for this user
        db.run(
          "UPDATE review_replies SET user_name = ?, user_avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
          [name, avatar, userId],
          function (err) {
            if (err) {
              console.error("Error updating user profile in replies:", err);
              errors.push("Failed to update replies");
            } else {
              repliesUpdated = this.changes;
              console.log(
                `✅ Updated profile in ${repliesUpdated} replies for user ${userId}`,
              );
            }

            // Commit or rollback transaction
            if (errors.length > 0) {
              db.run("ROLLBACK");
              return res.status(500).json({
                error: "Failed to update profile",
                details: errors,
              });
            } else {
              db.run("COMMIT");
              res.json({
                success: true,
                updatedReviews: reviewsUpdated,
                updatedReplies: repliesUpdated,
                message: `Updated ${reviewsUpdated} reviews and ${repliesUpdated} replies with new profile information`,
              });
            }
          },
        );
      },
    );
  });
});

// Update review endpoint
app.put("/api/reviews/update", authenticateToken, (req, res) => {
  const { reviewId, fragrance, text, rating } = req.body;
  const userId = req.user.userId;

  // Validation
  if (!reviewId || !fragrance || !text || !rating) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  if (text.length > 500) {
    return res
      .status(400)
      .json({ error: "Review text must be 500 characters or less" });
  }

  // Check if user owns this review or is admin
  db.get(
    "SELECT user_id FROM reviews WHERE id = ?",
    [reviewId],
    (err, review) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      // Check if user owns the review
      if (review.user_id !== userId) {
        // Check if user is admin
        db.get(
          "SELECT is_admin FROM users WHERE id = ?",
          [userId],
          (err, user) => {
            if (err || !user || !user.is_admin) {
              return res
                .status(403)
                .json({ error: "You can only edit your own reviews" });
            }

            // Admin can edit any review
            updateReview();
          },
        );
      } else {
        // User owns the review
        updateReview();
      }

      function updateReview() {
        // Sanitize review text to avoid XSS
        const sanitizedText = sanitizeHtml(text);
        db.run(
          "UPDATE reviews SET review_text = ?, rating = ?, updated_at = datetime('now') WHERE id = ?",
          [sanitizedText, rating, reviewId],
          function (err) {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({ error: "Failed to update review" });
            }

            res.json({
              success: true,
              message: "Review updated successfully",
            });
          },
        );
      }
    },
  );
});

// Delete review endpoint
app.delete("/api/reviews/delete", authenticateToken, (req, res) => {
  const { reviewId, fragrance } = req.body;
  const userId = req.user.userId;

  // Validation
  if (!reviewId || !fragrance) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check if user owns this review or is admin
  db.get(
    "SELECT user_id FROM reviews WHERE id = ?",
    [reviewId],
    (err, review) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      // Check if user owns the review
      if (review.user_id !== userId) {
        // Check if user is admin
        db.get(
          "SELECT is_admin FROM users WHERE id = ?",
          [userId],
          (err, user) => {
            if (err || !user || !user.is_admin) {
              return res
                .status(403)
                .json({ error: "You can only delete your own reviews" });
            }

            // Admin can delete any review
            deleteReview();
          },
        );
      } else {
        // User owns the review
        deleteReview();
      }

      function deleteReview() {
        db.run("DELETE FROM reviews WHERE id = ?", [reviewId], function (err) {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Failed to delete review" });
          }

          res.json({
            success: true,
            message: "Review deleted successfully",
          });
        });
      }
    },
  );
});

// Like/Dislike review endpoint
app.post("/api/reviews/like", authenticateToken, (req, res) => {
  const { reviewId, likeType } = req.body; // likeType: 'like' or 'dislike'
  const userId = req.user.userId;

  // Validation
  if (!reviewId || !likeType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["like", "dislike"].includes(likeType)) {
    return res
      .status(400)
      .json({ error: 'Invalid like type. Must be "like" or "dislike"' });
  }

  console.log(`👍 User ${userId} ${likeType}s review ${reviewId}`);

  // Check if user already liked/disliked this review
  db.get(
    "SELECT like_type FROM review_likes WHERE review_id = ? AND user_id = ?",
    [reviewId, userId],
    (err, existingLike) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (existingLike) {
        if (existingLike.like_type === likeType) {
          // User is removing their like/dislike
          db.run(
            "DELETE FROM review_likes WHERE review_id = ? AND user_id = ?",
            [reviewId, userId],
            function (err) {
              if (err) {
                console.error("Database error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to remove like/dislike" });
              }

              updateReviewCounts(reviewId, res, `${likeType} removed`);
            },
          );
        } else {
          // User is changing their like/dislike
          db.run(
            "UPDATE review_likes SET like_type = ?, created_at = datetime('now') WHERE review_id = ? AND user_id = ?",
            [likeType, reviewId, userId],
            function (err) {
              if (err) {
                console.error("Database error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to update like/dislike" });
              }

              updateReviewCounts(reviewId, res, `changed to ${likeType}`);
            },
          );
        }
      } else {
        // User is adding a new like/dislike
        db.run(
          "INSERT INTO review_likes (review_id, user_id, like_type) VALUES (?, ?, ?)",
          [reviewId, userId, likeType],
          function (err) {
            if (err) {
              console.error("Database error:", err);
              return res
                .status(500)
                .json({ error: "Failed to add like/dislike" });
            }

            updateReviewCounts(reviewId, res, `${likeType} added`);
          },
        );
      }
    },
  );

  // Helper function to update review counts and respond
  function updateReviewCounts(reviewId, res, action) {
    // Get updated counts
    db.all(
      `SELECT
                SUM(CASE WHEN like_type = 'like' THEN 1 ELSE 0 END) as likes,
                SUM(CASE WHEN like_type = 'dislike' THEN 1 ELSE 0 END) as dislikes
             FROM review_likes WHERE review_id = ?`,
      [reviewId],
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ error: "Failed to get updated counts" });
        }

        const counts = result[0] || { likes: 0, dislikes: 0 };
        const likes = counts.likes || 0;
        const dislikes = counts.dislikes || 0;

        // Update the reviews table with new counts
        db.run(
          "UPDATE reviews SET likes = ?, dislikes = ?, updated_at = datetime('now') WHERE id = ?",
          [likes, dislikes, reviewId],
          function (err) {
            if (err) {
              console.error("Database error:", err);
              return res
                .status(500)
                .json({ error: "Failed to update review counts" });
            }

            console.log(
              `✅ Review ${reviewId}: ${action} - Likes: ${likes}, Dislikes: ${dislikes}`,
            );

            res.json({
              success: true,
              message: `Review ${action} successfully`,
              likes: likes,
              dislikes: dislikes,
            });
          },
        );
      },
    );
  }
});

// Get user's like status for reviews
app.get("/api/reviews/likes/:fragrance", authenticateToken, (req, res) => {
  const fragrance = req.params.fragrance;
  const userId = req.user.userId;

  console.log(
    `📊 Getting like status for user ${userId} on ${fragrance} reviews`,
  );

  db.all(
    `SELECT rl.review_id, rl.like_type
         FROM review_likes rl
         JOIN reviews r ON rl.review_id = r.id
         WHERE r.fragrance = ? AND rl.user_id = ?`,
    [fragrance, userId],
    (err, likes) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Convert to object for easy lookup
      const likeStatus = {};
      likes.forEach((like) => {
        likeStatus[like.review_id] = like.like_type;
      });

      res.json({
        success: true,
        likes: likeStatus,
      });
    },
  );
});

/* =========================================================================
 * Perfume administration
 *
 * The /app catalogue is baked into the committed SPA bundle at build time, so
 * admin changes are stored as an overlay in the database (services/perfumeAdmin.js)
 * and merged client-side on boot. Uploaded transparent PNGs live in the same
 * table as base64 TEXT: no host in this deployment has a durable writable
 * filesystem, but Neon Postgres is durable on all of them.
 *
 * These routes are registered before app.get("/") and before any SPA fallback.
 * ========================================================================= */

const perfumeWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // An admin adding a whole collection needs far more than the avatar's 10.
  max: 240,
  message: { error: "Too many catalogue changes. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
});

/* multer throws MulterError on an oversize/invalid part; without this wrapper
   Express' generic error handler turns a user mistake into a 500. */
function perfumeImageUpload(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "The PNG must be 5 MB or smaller."
        : err.message || "Invalid image upload.";
    return res.status(400).json({ error: message });
  });
}

function perfumeReply(res, result, payload) {
  if (result.status >= 400) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, ...(payload || {}) });
}

function perfumeFail(res, label, err) {
  console.error(label, err);
  return res.status(500).json({ error: "Internal server error" });
}

/* Public: the overlay is safe to cache-bust but must never be cached, or a
   stock change would take an hour to reach customers. */
app.get("/api/catalog/overlay", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, max-age=0");
    return res.json(await perfumeAdmin.overlay());
  } catch (err) {
    return perfumeFail(res, "catalog overlay error:", err);
  }
});

/* Public: one uploaded transparent PNG. Immutable because image_rev is the
   content hash and changes whenever the admin replaces the picture. */
app.get("/api/perfume-images/:id", async (req, res) => {
  try {
    const image = await perfumeAdmin.imageFor(req.params.id);
    if (!image) return res.status(404).json({ error: "Image not found" });
    const etag = `"${image.rev}"`;
    res.set({
      "Content-Type": "image/png",
      "Content-Length": String(image.buffer.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    });
    if (req.headers["if-none-match"] === etag) return res.status(304).end();
    return res.send(image.buffer);
  } catch (err) {
    return perfumeFail(res, "perfume image error:", err);
  }
});

const perfumeAdminGuard = [authenticateToken, requireAdmin];

/* Admin-only inventory, including soft-deleted rows so they can be restored.
   No image bytes are returned here. */
app.get("/api/admin/perfumes", ...perfumeAdminGuard, async (req, res) => {
  try {
    return res.json({ success: true, rows: await perfumeAdmin.list() });
  } catch (err) {
    return perfumeFail(res, "perfume list error:", err);
  }
});

/* /bulk must be declared before any /:id route. */
app.post(
  "/api/admin/perfumes/bulk",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  async (req, res) => {
    try {
      const result = await perfumeAdmin.bulk(req.body || {});
      return perfumeReply(res, result, { changed: result.changed });
    } catch (err) {
      return perfumeFail(res, "perfume bulk error:", err);
    }
  },
);

app.post(
  "/api/admin/perfumes",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  perfumeImageUpload,
  async (req, res) => {
    try {
      const result = await perfumeAdmin.create(req.body || {}, req.file);
      return perfumeReply(res, result, { product: result.product });
    } catch (err) {
      return perfumeFail(res, "perfume create error:", err);
    }
  },
);

app.put(
  "/api/admin/perfumes/:id",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  perfumeImageUpload,
  async (req, res) => {
    try {
      const result = await perfumeAdmin.patch(req.params.id, req.body || {}, req.file);
      return perfumeReply(res, result, { product: result.product });
    } catch (err) {
      return perfumeFail(res, "perfume update error:", err);
    }
  },
);

app.patch(
  "/api/admin/perfumes/:id",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  async (req, res) => {
    try {
      const result = await perfumeAdmin.patch(req.params.id, req.body || {}, null);
      return perfumeReply(res, result, { product: result.product });
    } catch (err) {
      return perfumeFail(res, "perfume patch error:", err);
    }
  },
);

app.delete(
  "/api/admin/perfumes/:id",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  async (req, res) => {
    try {
      const purge = req.query.purge === "1" || req.query.purge === "true";
      const result = await perfumeAdmin.remove(req.params.id, { purge });
      return perfumeReply(res, result, {
        removed: result.removed,
        permanent: result.permanent,
      });
    } catch (err) {
      return perfumeFail(res, "perfume delete error:", err);
    }
  },
);

app.post(
  "/api/admin/perfumes/:id/restore",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  async (req, res) => {
    try {
      const result = await perfumeAdmin.restore(req.params.id);
      return perfumeReply(res, result, { restored: result.restored });
    } catch (err) {
      return perfumeFail(res, "perfume restore error:", err);
    }
  },
);

app.post(
  "/api/admin/perfumes/:id/duplicate",
  ...perfumeAdminGuard,
  perfumeWriteLimiter,
  perfumeImageUpload,
  async (req, res) => {
    try {
      const result = await perfumeAdmin.duplicate(req.params.id, req.body || {}, req.file);
      return perfumeReply(res, result, { product: result.product });
    } catch (err) {
      return perfumeFail(res, "perfume duplicate error:", err);
    }
  },
);

/*
 * Main page. Default behaviour is unchanged.
 *
 * SERVE_REACT=1 serves the document produced by the React build pipeline
 * (scripts/build-legacy-page.mjs) instead, and marks which pipeline answered with an
 * X-Charme-Render header. The bytes are identical by construction — that is the parity
 * guarantee — so the header, not the pixels, is how you tell them apart.
 * /legacy then serves the checked-in document for side-by-side comparison.
 */
app.get("/", (req, res) => {
  if (SERVE_REACT) {
    res.set("X-Charme-Render", "react-build");
    return res.sendFile(REACT_CANDIDATE);
  }
  res.set("X-Charme-Render", "public-index");
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

if (SERVE_REACT) {
  app.get("/legacy", (req, res) => {
    res.set("X-Charme-Render", "public-index");
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
}

// 🚀 ENHANCED REVIEW SYSTEM: Reply Management Endpoints

// Get replies for a specific review
app.get("/api/reviews/:reviewId/replies", (req, res) => {
  const { reviewId } = req.params;

  // 🔧 ENHANCED: Validate reviewId parameter
  if (!reviewId || isNaN(parseInt(reviewId))) {
    return res.status(400).json({ error: "Invalid review ID" });
  }

  console.log(`📥 Fetching replies for review ${reviewId}`);

  // 🔧 ENHANCED: Check if review exists first
  db.get("SELECT id FROM reviews WHERE id = ?", [reviewId], (err, review) => {
    if (err) {
      console.error("Error checking review existence:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Fetch replies with user data
    db.all(
      `
            SELECT r.id, r.review_id, r.parent_reply_id, r.user_id,
                   r.user_name, r.user_avatar, r.reply_text,
                   r.created_at, r.updated_at,
                   u.is_admin AS is_admin, u.first_name, u.last_name, u.avatar_url,
                   COALESCE(
                       (SELECT COUNT(*) FROM reply_likes WHERE reply_id = r.id AND like_type = 'like'), 0
                   ) as likes,
                   COALESCE(
                       (SELECT COUNT(*) FROM reply_likes WHERE reply_id = r.id AND like_type = 'dislike'), 0
                   ) as dislikes
            FROM review_replies r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.review_id = ?
            ORDER BY r.created_at ASC
            LIMIT 100
        `,
      [reviewId],
      (err, replies) => {
        if (err) {
          console.error("Error fetching replies:", err);
          return res.status(500).json({ error: "Failed to fetch replies" });
        }

        // The explicit SELECT above intentionally excludes replier email addresses
        // (PII) from this public endpoint.
        const safeReplies = Array.isArray(replies) ? replies : [];
        
        console.log(
          `✅ Found ${safeReplies.length} replies for review ${reviewId}`,
        );
        res.json({ success: true, replies: safeReplies });
      },
    );
  });
});

// Rate limiting for reply submissions
const replyRateLimit = new Map();

// Add a reply to a review
app.post("/api/reviews/:reviewId/replies", authenticateToken, (req, res) => {
  const { reviewId } = req.params;
  const { reply_text, parent_reply_id } = req.body;
  const userId = req.user.userId;

  // 🔧 ENHANCED: Rate limiting to prevent spam
  const now = Date.now();
  const userKey = `reply_${userId}`;
  const lastReply = replyRateLimit.get(userKey) || 0;
  const rateLimitWindow = 30000; // 30 seconds between replies

  if (now - lastReply < rateLimitWindow) {
    const remainingTime = Math.ceil(
      (rateLimitWindow - (now - lastReply)) / 1000,
    );
    return res.status(429).json({
      error: `Please wait ${remainingTime} seconds before submitting another reply`,
    });
  }
  replyRateLimit.set(userKey, now);

  // Clean up old rate limit entries (older than 1 hour)
  for (const [key, timestamp] of replyRateLimit.entries()) {
    if (now - timestamp > 3600000) {
      // 1 hour
      replyRateLimit.delete(key);
    }
  }

  // 🔧 ENHANCED: Comprehensive server-side reply validation
  if (!reply_text || reply_text.trim().length === 0) {
    return res.status(400).json({ error: "Reply text is required" });
  }

  const trimmedText = reply_text.trim();

  // 🔒 SECURITY: Sanitize reply text to prevent XSS
  const sanitizedReplyText = sanitizeHtml(trimmedText);

  if (trimmedText.length < 3) {
    return res
      .status(400)
      .json({ error: "Reply must be at least 3 characters long" });
  }

  if (trimmedText.length > 1000) {
    return res
      .status(400)
      .json({ error: "Reply text too long (max 1000 characters)" });
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/g, // 10+ repeated characters
    /^(.{1,3})\1{5,}$/g, // Short repeated patterns
    /(buy now|click here|free money|make money|earn \$|viagra|casino)/gi,
    /^[^a-zA-Z]*$/g, // Only symbols/numbers
  ];

  const isSpam = spamPatterns.some((pattern) =>
    pattern.test(trimmedText.toLowerCase()),
  );
  if (isSpam) {
    return res.status(400).json({
      error: "Reply appears to be spam. Please write a meaningful comment.",
    });
  }

  // Check for excessive HTML/script content
  if (
    /<script|<iframe|<object|<embed|javascript:|vbscript:/gi.test(trimmedText)
  ) {
    return res.status(400).json({ error: "Reply contains invalid content" });
  }

  console.log(`💬 Adding reply to review ${reviewId} by user ${userId}`);

  // Get user info including admin status
  db.get(
    "SELECT first_name, last_name, avatar_url, is_admin, email FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ error: "Failed to fetch user info" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const userName = `${user.first_name} ${user.last_name || ""}`.trim();
      const userAvatar = user.avatar_url || "default.jpg";
      const isAdmin = user.is_admin ? 1 : 0;

      // Insert reply with sanitized content
      db.run(
        `
            INSERT INTO review_replies
            (review_id, parent_reply_id, user_id, user_name, user_email, user_avatar, is_admin, reply_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          reviewId,
          parent_reply_id || null,
          userId,
          userName,
          user.email,
          userAvatar,
          isAdmin ? 1 : 0,
          sanitizedReplyText,
        ],
        function (err) {
          if (err) {
            console.error("Error inserting reply:", err);
            return res.status(500).json({ error: "Failed to save reply" });
          }

          // Get the inserted reply without returning the private email column.
          db.get(
            `SELECT id, review_id, parent_reply_id, user_id, user_name,
                    user_avatar, is_admin, reply_text, likes, dislikes,
                    created_at, updated_at
             FROM review_replies WHERE id = ?`,
            [this.lastID],
            async (err, reply) => {
              if (err) {
                console.error("Error fetching inserted reply:", err);
                return res
                  .status(500)
                  .json({ error: "Reply saved but failed to fetch" });
              }

              // 🆕 Award experience for creating a reply and return updated XP/level
              let xpPayload = null;
              // XP system removed

              console.log(
                `✅ New reply saved for review ${reviewId} by ${userName}`,
              );
              res.json({ success: true, reply, xp: xpPayload });
            },
          );
        },
      );
    },
  );
});

// Like/Dislike a reply
app.post("/api/replies/:replyId/like", authenticateToken, (req, res) => {
  const { replyId } = req.params;
  const { likeType } = req.body; // 'like' or 'dislike'
  const userId = req.user.userId;

  if (!["like", "dislike"].includes(likeType)) {
    return res
      .status(400)
      .json({ error: 'Invalid like type. Must be "like" or "dislike"' });
  }

  console.log(`👍 User ${userId} ${likeType}s reply ${replyId}`);

  // Check if user already liked/disliked this reply
  db.get(
    "SELECT like_type FROM reply_likes WHERE reply_id = ? AND user_id = ?",
    [replyId, userId],
    (err, existingLike) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (existingLike) {
        if (existingLike.like_type === likeType) {
          // User is removing their like/dislike
          db.run(
            "DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?",
            [replyId, userId],
            function (err) {
              if (err) {
                console.error("Database error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to remove like/dislike" });
              }
              updateReplyCounts(replyId, res, `${likeType} removed`);
            },
          );
        } else {
          // User is changing their like/dislike
          db.run(
            "UPDATE reply_likes SET like_type = ? WHERE reply_id = ? AND user_id = ?",
            [likeType, replyId, userId],
            function (err) {
              if (err) {
                console.error("Database error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to update like/dislike" });
              }
              updateReplyCounts(replyId, res, `changed to ${likeType}`);
            },
          );
        }
      } else {
        // User is adding a new like/dislike
        db.run(
          "INSERT INTO reply_likes (reply_id, user_id, like_type) VALUES (?, ?, ?)",
          [replyId, userId, likeType],
          function (err) {
            if (err) {
              console.error("Database error:", err);
              return res
                .status(500)
                .json({ error: "Failed to add like/dislike" });
            }
            updateReplyCounts(replyId, res, `${likeType} added`);
          },
        );
      }
    },
  );

  function updateReplyCounts(replyId, res, action) {
    db.all(
      `
            SELECT
                COALESCE(SUM(CASE WHEN like_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
                COALESCE(SUM(CASE WHEN like_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes
            FROM reply_likes
            WHERE reply_id = ?
        `,
      [replyId],
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ error: "Failed to get updated counts" });
        }

        const counts = result[0] || { likes: 0, dislikes: 0 };
        const likes = counts.likes || 0;
        const dislikes = counts.dislikes || 0;

        console.log(
          `✅ Reply ${replyId}: ${action} - Likes: ${likes}, Dislikes: ${dislikes}`,
        );

        res.json({
          success: true,
          message: `Reply ${action} successfully`,
          likes: likes,
          dislikes: dislikes,
        });
      },
    );
  }
});

// 🗑️ DELETE REPLY: Allow users to delete their own replies
app.delete("/api/replies/:replyId", authenticateToken, (req, res) => {
  const { replyId } = req.params;
  const userId = req.user.userId;

  console.log(`🗑️ User ${userId} attempting to delete reply ${replyId}`);

  // First, check if the reply exists and belongs to the user
  db.get(
    "SELECT * FROM review_replies WHERE id = ?",
    [replyId],
    (err, reply) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      // Check ownership or admin from DB (synchronously via callback chain)
      const isOwner = reply.user_id === userId;
      if (isOwner) {
        return deleteReply();
      }

      db.get(
        "SELECT is_admin FROM users WHERE id = ?",
        [userId],
        (err, user) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          const isAdmin = !!(user && user.is_admin);
          if (!isAdmin) {
            console.log(
              `❌ User ${userId} not authorized to delete reply ${replyId} (owner: ${reply.user_id})`,
            );
            return res
              .status(403)
              .json({ error: "Not authorized to delete this reply" });
          }

          return deleteReply();
        },
      );

      function deleteReply() {
        console.log(`✅ User ${userId} authorized to delete reply ${replyId}`);
        db.run(
          "DELETE FROM review_replies WHERE id = ?",
          [replyId],
          function (err) {
            if (err) {
              console.error("Error deleting reply:", err);
              return res.status(500).json({ error: "Failed to delete reply" });
            }

            if (this.changes === 0) {
              return res
                .status(404)
                .json({ error: "Reply not found or already deleted" });
            }

            console.log(
              `✅ Reply ${replyId} deleted successfully by user ${userId}`,
            );
            res.json({ success: true, message: "Reply deleted successfully" });
          },
        );
      }
    },
  );
});

// ─── AI BACK-OFFICE ASSISTANT (admin only) ──────────────────────────────────
// Mounted from its own module so the agent loop and its tools stay out of this
// file. It is a real LLM agent: it reads the live database with read-only tools
// and proposes every write for the signed-in administrator to approve.
// Configure with AI_BASE_URL / AI_API_KEY / AI_MODEL (see .env.example).
try {
  require("./services/adminAssistant")(app, {
    db,
    authenticateToken,
    requireAdmin,
    root: __dirname,
  });
} catch (assistantError) {
  // A missing optional dependency must never take the storefront down at boot.
  console.error("Admin assistant unavailable:", assistantError.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Export the app so serverless hosts can mount it.
module.exports = app;
// Exposed for tests only; harmless to the Express app.
module.exports.__sanitizeHtml = sanitizeHtml;

// On serverless, an unhandled rejection or exception kills the instance and
// surfaces as an opaque FUNCTION_INVOCATION_FAILED. Log it first so the real
// cause shows up in the host's logs.
if (process.env.VERCEL) {
  process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("uncaughtException:", err && err.stack ? err.stack : err);
  });
}

// Start server (long-running hosts only — never on Vercel/serverless).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Keep-alive: self-ping every 10 min so Render free tier doesn't sleep
    const SELF_URL =
      process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    if (SELF_URL.startsWith("http")) {
      setInterval(() => {
        fetch(SELF_URL)
          .then(() => console.log("🔁 Keep-alive ping sent"))
          .catch(() => {});
      }, 10 * 60 * 1000); // every 10 minutes
    }
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});
