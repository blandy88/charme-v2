/**
 * Hybrid database adapter.
 *
 * - Uses PostgreSQL when DATABASE_URL is present.
 * - Falls back to a local SQLite database when DATABASE_URL is missing.
 *
 * Both paths expose the same callback/statement surface used by the rest of the
 * codebase (db.get / db.all / db.run / db.exec / db.serialize /
 * db.prepare / db.close).
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

function normalizeParams(params) {
  return (params || []).map((p) => {
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p === undefined) return null;
    if (typeof p === "bigint") return Number(p);
    return p;
  });
}

if (!connectionString) {
  const sqlite3 = require("sqlite3").verbose();

  const dbDir = path.join(__dirname, "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlitePath = path.join(dbDir, "parfumerie.db");
  const sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
    if (err) {
      console.error("Error opening SQLite database:", err.message);
    } else {
      console.log(`Connected to SQLite fallback database at ${sqlitePath}`);
    }
  });

  sqliteDb.serialize(() => {
    sqliteDb.run("PRAGMA foreign_keys = ON");
    sqliteDb.run("PRAGMA journal_mode = WAL");
    sqliteDb.run("PRAGMA busy_timeout = 5000");
  });

  function replacePlaceholders(sql) {
    return String(sql || "").replace(/\$\d+/g, "?");
  }

  function translate(sql) {
    let s = replacePlaceholders(sql);
    s = s.replace(/\bTIMESTAMPTZ\b/gi, "DATETIME");
    s = s.replace(/\bDATETIME\s+DEFAULT\s+NOW\(\)/gi, "DATETIME DEFAULT CURRENT_TIMESTAMP");
    s = s.replace(/\bDATE\s+DEFAULT\s+NOW\(\)/gi, "DATE DEFAULT CURRENT_TIMESTAMP");
    s = s.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
    s = s.replace(/SERIAL\s+PRIMARY\s+KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT");
    s = s.replace(/\bBOOLEAN\b/gi, "INTEGER");
    return { skip: false, text: s };
  }

  function run(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const translated = translate(sql).text;
    const normalized = normalizeParams(params);

    if (typeof cb === "function") {
      sqliteDb.run(translated, normalized, function (err) {
        cb.call(this, err || null);
      });
      return;
    }

    return new Promise((resolve, reject) => {
      sqliteDb.run(translated, normalized, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes, rows: [] });
      });
    });
  }

  function get(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const translated = translate(sql).text;
    const normalized = normalizeParams(params);

    if (typeof cb === "function") {
      sqliteDb.get(translated, normalized, (err, row) => cb(err || null, row));
      return;
    }

    return new Promise((resolve, reject) => {
      sqliteDb.get(translated, normalized, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  function all(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const translated = translate(sql).text;
    const normalized = normalizeParams(params);

    if (typeof cb === "function") {
      sqliteDb.all(translated, normalized, (err, rows) => cb(err || null, rows));
      return;
    }

    return new Promise((resolve, reject) => {
      sqliteDb.all(translated, normalized, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  function exec(sql, cb) {
    const translated = translate(sql).text;

    if (typeof cb === "function") {
      sqliteDb.exec(translated, (err) => cb(err || null));
      return;
    }

    return new Promise((resolve, reject) => {
      sqliteDb.exec(translated, (err) => {
        if (err) return reject(err);
        resolve({ lastID: undefined, changes: 0, rows: [] });
      });
    });
  }

  function prepare(sql) {
    return sqliteDb.prepare(translate(sql).text);
  }

  function serialize(fn) {
    if (typeof fn === "function") return sqliteDb.serialize(fn);
    return sqliteDb.serialize();
  }

  function close(cb) {
    if (typeof cb === "function") {
      sqliteDb.close((err) => cb(err || null));
      return;
    }
    return new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  module.exports = {
    get,
    all,
    run,
    exec,
    serialize,
    prepare,
    close,
    translate,
    replacePlaceholders,
  };
} else {
  /**
   * SQLite-compatible wrapper over PostgreSQL (pg).
   *
   * Presents the same callback API used by the rest of the codebase
   * (db.get / db.all / db.run / db.exec / db.serialize / db.prepare / db.close)
   * while executing against a Postgres pool. SQLite-specific SQL is translated
   * to Postgres on the fly.
   */
  const pg = require("pg");

  // Normalize Postgres result types to match what the app expects from SQLite:
  //   int8 / bigint (COUNT, SUM)  -> number
  //   numeric / decimal (prices)  -> number
  //   timestamp / timestamptz     -> raw string (like SQLite "YYYY-MM-DD HH:MM:SS")
  //   date                        -> raw string
  pg.types.setTypeParser(20, (v) => parseInt(v, 10));
  pg.types.setTypeParser(1700, (v) => parseFloat(v));
  pg.types.setTypeParser(1114, (v) => v);
  pg.types.setTypeParser(1184, (v) => v);
  pg.types.setTypeParser(1082, (v) => v);

  const useSsl = !/sslmode=disable/i.test(connectionString);

  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    options: "-c timezone=UTC",
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  pool.on("error", (err) => {
    console.error("PostgreSQL pool error:", err);
  });

  // Replace SQLite `?` placeholders with Postgres $1, $2, ... (never inside
  // single-quoted string literals).
  function replacePlaceholders(sql) {
    let out = "";
    let i = 0;
    let paramIndex = 0;
    let inString = false;
    while (i < sql.length) {
      const ch = sql[i];
      if (ch === "'") {
        out += ch;
        if (sql[i + 1] === "'") {
          out += "'";
          i += 2;
          continue;
        }
        inString = !inString;
        i++;
        continue;
      }
      if (!inString && ch === "?") {
        paramIndex++;
        out += `$${paramIndex}`;
        i++;
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }

  // Translate a single SQLite statement into Postgres.
  function translate(sql) {
    const trimmed = sql.trim();

    // PRAGMA table_info(X) -> information_schema lookup (rows expose .name)
    const tableInfo = trimmed.match(/^PRAGMA\s+table_info\(\s*(\w+)\s*\)$/i);
    if (tableInfo) {
      return {
        skip: false,
        text:
          "SELECT column_name AS name, data_type AS type, " +
          "CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull, " +
          "0 AS pk, NULL AS dflt_value, NULL AS default_value " +
          "FROM information_schema.columns " +
          `WHERE table_name = '${tableInfo[1]}' ORDER BY ordinal_position`,
      };
    }

    // Other PRAGMAs (foreign_keys, journal_mode, busy_timeout) have no
    // Postgres equivalent and are safe to ignore.
    if (/^PRAGMA\b/i.test(trimmed)) {
      return { skip: true, text: null };
    }

    let s = replacePlaceholders(sql);

    // SQLite helpers / literals
    s = s.replace(/datetime\(['"]now['"]?\)/gi, "now()");
    s = s.replace(/LIKE\s+"data:image%"/g, "LIKE 'data:image%'");

    // Type rewrites
    s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
    s = s.replace(/\bAUTOINCREMENT\b/gi, "");
    s = s.replace(/\bDATETIME\b/gi, "TIMESTAMPTZ");
    s = s.replace(/\bBOOLEAN\b/gi, "INTEGER");
    s = s.replace(/\bADD\s+COLUMN\s+/gi, "ADD COLUMN IF NOT EXISTS ");

    // INSERT OR REPLACE -> INSERT ... ON CONFLICT (...) DO UPDATE SET ...
    const orReplace = /^INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([\s\S]+?)\)\s+VALUES\s*\([\s\S]+?\)/i;
    const orReplaceMatch = s.match(orReplace);
    if (orReplaceMatch) {
      const cols = orReplaceMatch[2]
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const target = cols.includes("id") ? "id" : cols[0];
      const sets = cols
        .filter((c) => c !== target)
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(", ");
      s =
        s.replace(/^INSERT\s+OR\s+REPLACE\s+INTO/i, "INSERT INTO")
          .replace(/;?\s*$/, "") +
        ` ON CONFLICT (${target}) DO UPDATE SET ${sets} RETURNING id`;
      return { skip: false, text: s };
    }

    // INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
    if (/^INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) {
      s =
        s.replace(/^INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT INTO")
          .replace(/;?\s*$/, "") +
        " ON CONFLICT DO NOTHING RETURNING id";
      return { skip: false, text: s };
    }

    // Plain INSERT -> append RETURNING id so this.lastID works.
    if (/^INSERT\s+INTO\b/i.test(s) && !/RETURNING/i.test(s)) {
      s = s.replace(/;?\s*$/, "") + " RETURNING id";
    }

    return { skip: false, text: s };
  }

  function execute(sql, params) {
    const t = translate(sql);
    if (t.skip) {
      return Promise.resolve({ lastID: undefined, changes: 0, rows: [] });
    }
    return pool.query(t.text, normalizeParams(params)).then((res) => ({
      lastID: res.rows && res.rows.length ? res.rows[0].id : undefined,
      changes: res.rowCount ?? 0,
      rows: res.rows,
    }));
  }

  function run(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const p = execute(sql, params);
    if (typeof cb === "function") {
      p.then((r) => cb.call(r, null)).catch((e) =>
        cb.call({ lastID: undefined, changes: 0 }, e),
      );
      return;
    }
    return p;
  }

  function get(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const t = translate(sql);
    const p = t.skip
      ? Promise.resolve(undefined)
      : pool.query(t.text, normalizeParams(params)).then((r) => r.rows[0]);
    if (typeof cb === "function") {
      p.then((row) => cb(null, row)).catch((e) => cb(e));
      return;
    }
    return p;
  }

  function all(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const t = translate(sql);
    const p = t.skip
      ? Promise.resolve([])
      : pool.query(t.text, normalizeParams(params)).then((r) => r.rows);
    if (typeof cb === "function") {
      p.then((rows) => cb(null, rows)).catch((e) => cb(e));
      return;
    }
    return p;
  }

  function exec(sql, cb) {
    const p = execute(sql, []);
    if (typeof cb === "function") {
      p.then(() => cb(null)).catch((e) => cb(e));
      return;
    }
    return p;
  }

  function prepare(sql) {
    const stmt = {
      run(params, cb) {
        if (typeof params === "function") {
          cb = params;
          params = [];
        }
        const p = execute(sql, params);
        if (typeof cb === "function") {
          p.then((r) => cb.call(r, null)).catch((e) =>
            cb.call({ lastID: undefined, changes: 0 }, e),
          );
          return stmt;
        }
        return p;
      },
      finalize(cb) {
        if (typeof cb === "function") process.nextTick(() => cb(null));
        return stmt;
      },
    };
    return stmt;
  }

  function serialize(fn) {
    if (typeof fn === "function") fn();
  }

  function close(cb) {
    const p = pool.end();
    if (typeof cb === "function") {
      p.then(() => cb(null)).catch((e) => cb(e));
      return;
    }
    return p;
  }

  module.exports = {
    get,
    all,
    run,
    exec,
    serialize,
    prepare,
    close,
    translate,
    replacePlaceholders,
  };
}
