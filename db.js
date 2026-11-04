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

// SQLite is only ever a local fallback. On serverless hosts the filesystem is
// read-only and native addons may be absent, so load it defensively: a bare
// require() here throws during module load and turns every request into
// FUNCTION_INVOCATION_FAILED before any route can run.
let sqlite3 = null;
if (!connectionString) {
  try {
    sqlite3 = require("sqlite3").verbose();
  } catch (e) {
    console.error(
      "WARNING: DATABASE_URL is not set and sqlite3 could not be loaded (" +
        (e.code || e.message) +
        "). Queries will report the misconfiguration instead of crashing boot.",
    );
  }
}

if (!connectionString && !sqlite3) {
  // Degraded driver: keeps the process alive so the host can serve static
  // pages and return a clear per-query error instead of a blanket 500.
  const unavailable = () => (sql, params, cb) => {
    const err = new Error("DATABASE_URL is not configured on this host");
    err.code = "ENOCONFIG";
    if (typeof params === "function") cb = params;
    if (typeof cb === "function") return cb(err);
    return Promise.reject(err);
  };
  module.exports = {
    get: unavailable(),
    all: unavailable(),
    run: unavailable(),
    exec: (sql, cb) =>
      typeof cb === "function" ? cb(null) : Promise.resolve(),
    serialize: (fn) => (typeof fn === "function" ? fn() : undefined),
    prepare: () => ({
      run: (params, cb) => (typeof params === "function" ? params : cb)(null),
      finalize: (cb) => (typeof cb === "function" ? cb(null) : undefined),
    }),
    close: (cb) => (typeof cb === "function" ? cb(null) : Promise.resolve()),
    transaction: (fn) => fn({ get: unavailable(), all: unavailable(), run: unavailable(), raw: unavailable() }),
    dialect: "unavailable",
    translate: (sql) => ({ skip: false, text: sql }),
    replacePlaceholders: (sql) => sql,
  };
} else if (!connectionString) {
  const dbDir = path.join(__dirname, "database");
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    // Read-only filesystem (Vercel): opening the DB below will fail in the
    // callback rather than killing the module here.
    console.warn(
      "database dir unavailable (read-only FS?):",
      dbDir,
      "-",
      e.code || e.message,
    );
  }

  // SQLITE_PATH lets a second instance (a demo shoot, a scratch run) point at
  // its own file instead of the shared dev database. Unset - i.e. every real
  // deployment - this is exactly the path it always was.
  const sqlitePath = process.env.SQLITE_PATH || path.join(dbDir, "parfumerie.db");
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

  /*
   * Real transaction support for the SQLite fallback.
   *
   * The loyalty endpoints (and the admin assistant) call db.transaction() to
   * keep a points balance and its ledger row together. This branch used to not
   * export it at all, so on a SQLite install every one of those endpoints
   * threw "db.transaction is not a function" and returned 500.
   *
   * A dedicated connection is used rather than the shared handle: the shared
   * handle is asynchronous, so statements from other requests could otherwise
   * slip between our BEGIN and COMMIT. SQLite serialises writers anyway, and
   * busy_timeout makes a concurrent transaction wait instead of failing with
   * SQLITE_BUSY.
   */
  async function transaction(fn) {
    const conn = new sqlite3.Database(sqlitePath);
    const exec = (sql, params) =>
      new Promise((resolve, reject) => {
        conn.run(translate(sql).text, normalizeParams(params || []), function (err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes, rows: [] });
        });
      });
    const queryAll = (sql, params) =>
      new Promise((resolve, reject) => {
        conn.all(translate(sql).text, normalizeParams(params || []), (err, rows) =>
          err ? reject(err) : resolve(rows || []),
        );
      });

    try {
      await exec("PRAGMA foreign_keys = ON");
      await exec("PRAGMA busy_timeout = 5000");
      await exec("BEGIN");
      const scoped = {
        run: exec,
        all: queryAll,
        get: async (sql, params) => (await queryAll(sql, params))[0] || null,
        /* Bypasses translate() on the Postgres branch. Here it is the same
           as run(); kept so transaction call sites are engine-agnostic. */
        raw: async (sql, params) => {
          await exec(sql, params);
          return [];
        },
      };
      const result = await fn(scoped);
      await exec("COMMIT");
      return result;
    } catch (err) {
      try {
        await exec("ROLLBACK");
      } catch {
        /* connection already unusable; close() discards it */
      }
      throw err;
    } finally {
      conn.close();
    }
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
    /* The assistant's reporting queries. On this legacy native-SQLite path
       there is no per-connection read-only mode to borrow, so this is `all`
       and the SQL validator in tools.js is the only guard. The PostgreSQL
       branch below is the one the app actually runs, and there `readOnly`
       additionally pins `default_transaction_read_only=on` at the driver. */
    readOnly: all,
    run,
    exec,
    serialize,
    prepare,
    close,
    transaction,
    dialect: "sqlite",
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

  /*
   * A second, deliberately hobbled pool for read-only reporting queries.
   *
   * The back-office assistant lets a language model compose SQL, so the
   * application-level filter that inspects the string is a convenience, not a
   * boundary: it is a parser written by regex, and a regex cannot be the only
   * thing standing between a prompt injection and a write. These two
   * connection options make PostgreSQL itself the boundary:
   *
   *   default_transaction_read_only  every implicit and explicit transaction
   *                                  on this connection rejects INSERT /
   *                                  UPDATE / DELETE / DDL with 25006, even if
   *                                  the string check is wrong.
   *   statement_timeout              caps `pg_sleep(...)` and friends so one
   *                                  model step cannot pin a connection.
   *
   * Kept separate from the main pool so a long reporting query can never
   * occupy a connection the storefront needs for a write.
   */
  const readOnlyPool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    options:
      "-c timezone=UTC -c default_transaction_read_only=on -c statement_timeout=10000",
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  readOnlyPool.on("error", (err) => {
    console.error("PostgreSQL read-only pool error:", err);
  });

  /*
   * Run one read-only query on the hobbled pool.
   *
   * Three deliberate differences from `all()`:
   *   - `translate()` is bypassed. It rewrites INSERTs (appending RETURNING
   *     id) and would be wrong here; anything that is not already a query is
   *     the caller's problem, and the connection rejects it regardless.
   *   - the placeholder rewrite still runs, because a `?` inside a comment or
   *     a dollar-quoted string would otherwise shift every $n after it.
   *   - the connection is checked out and the read-only flag RE-ASSERTED on
   *     every call. `default_transaction_read_only` is a GUC that SQL can set
   *     for the whole session: a caller able to run
   *     `select set_config('default_transaction_read_only','off',false)`
   *     would otherwise leave that pooled connection writable for every later
   *     borrower, silently disarming this guarantee. Re-asserting per call
   *     makes the flag a property of the query, not of the connection's mood.
   */
  async function readOnly(sql, params) {
    const client = await readOnlyPool.connect();
    try {
      await client.query("SET default_transaction_read_only = on");
      const res = await client.query(
        replacePlaceholders(String(sql)),
        normalizeParams(params || []),
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  // Replace SQLite `?` placeholders with Postgres $1, $2, ...
  //
  // Only a `?` that is really a placeholder may be renumbered. A `?` inside a
  // comment, a dollar-quoted body or a quoted identifier is just text - and
  // rewriting it does damage beyond the text itself, because it also consumes
  // a number. Callers pass their values positionally, so this:
  //
  //   SELECT * FROM t -- is this ok ?
  //   WHERE a = ? AND b = ?
  //
  // used to become `... $1 \n WHERE a = $2 AND b = $3`, and a caller supplying
  // two values then bound them to the wrong columns. Silent, and only
  // reproducible on the queries somebody left a comment in.
  function replacePlaceholders(sql) {
    const s = String(sql == null ? "" : sql);
    const n = s.length;
    const out = [];
    let i = 0;
    let paramIndex = 0;

    // `$$` or `$tag$` at `at`, or null. A tag may not begin with a digit, which
    // is what keeps an already-rewritten `$1` from being read as a quote.
    const dollarTag = (at) => {
      if (s[at] !== "$") return null;
      let j = at + 1;
      if (j < n && s[j] >= "0" && s[j] <= "9") return null;
      while (j < n && /[A-Za-z0-9_]/.test(s[j])) j += 1;
      return s[j] === "$" ? s.slice(at, j + 1) : null;
    };

    while (i < n) {
      const ch = s[i];

      // -- line comment, to the end of the line
      if (ch === "-" && s[i + 1] === "-") {
        const nl = s.indexOf("\n", i);
        const end = nl === -1 ? n : nl;
        out.push(s.slice(i, end));
        i = end;
        continue;
      }

      /* block comment - Postgres nests these, so count depth */
      if (ch === "/" && s[i + 1] === "*") {
        let depth = 1;
        let j = i + 2;
        while (j < n && depth > 0) {
          if (s[j] === "/" && s[j + 1] === "*") { depth += 1; j += 2; continue; }
          if (s[j] === "*" && s[j + 1] === "/") { depth -= 1; j += 2; continue; }
          j += 1;
        }
        out.push(s.slice(i, j));
        i = j;
        continue;
      }

      // $$ body $$ or $tag$ body $tag$ - verbatim, placeholders are text
      if (ch === "$") {
        const tag = dollarTag(i);
        if (tag) {
          const close = s.indexOf(tag, i + tag.length);
          const end = close === -1 ? n : close + tag.length;
          out.push(s.slice(i, end));
          i = end;
          continue;
        }
      }

      // 'literal' with '' as an escaped quote
      if (ch === "'") {
        out.push(ch);
        i += 1;
        while (i < n) {
          if (s[i] === "'") {
            if (s[i + 1] === "'") { out.push("''"); i += 2; continue; }
            out.push("'");
            i += 1;
            break;
          }
          out.push(s[i]);
          i += 1;
        }
        continue;
      }

      // "identifier" with "" as an escaped quote
      if (ch === '"') {
        out.push(ch);
        i += 1;
        while (i < n) {
          if (s[i] === '"') {
            if (s[i + 1] === '"') { out.push('""'); i += 2; continue; }
            out.push('"');
            i += 1;
            break;
          }
          out.push(s[i]);
          i += 1;
        }
        continue;
      }

      if (ch === "?") {
        paramIndex += 1;
        out.push(`$${paramIndex}`);
        i += 1;
        continue;
      }

      out.push(ch);
      i += 1;
    }
    return out.join("");
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

  /*
   * Run `fn` inside a real transaction on one dedicated client.
   *
   * `serialize()` cannot do this on PostgreSQL. It has no client to pin, so
   * BEGIN / the statements / COMMIT became four independent `pool.query`
   * calls on four independently checked-out connections: no atomicity, and if
   * a BEGIN did land, its connection went back to the pool still inside an
   * open transaction holding row locks. `fn` receives a query object with the
   * same { get, all, run } shape as the module, so call sites can be rewritten
   * by swapping the receiver.
   *
   * Rolls back on any throw or rejected promise, and always releases.
   */
  async function transaction(fn) {
    const client = await pool.connect();
    const scoped = {
      get(sql, params) {
        return client
          .query(replacePlaceholders(String(sql)), normalizeParams(params || []))
          .then((r) => (r.rows && r.rows.length ? r.rows[0] : null));
      },
      all(sql, params) {
        return client
          .query(replacePlaceholders(String(sql)), normalizeParams(params || []))
          .then((r) => r.rows || []);
      },
      run(sql, params) {
        const t = translate(sql);
        if (t.skip) return Promise.resolve({ lastID: undefined, changes: 0, rows: [] });
        return client.query(t.text, normalizeParams(params || [])).then((res) => ({
          lastID: res.rows && res.rows.length ? res.rows[0].id : undefined,
          changes: res.rowCount ?? 0,
          rows: res.rows,
        }));
      },
      /*
       * Bypasses translate() (no INSERT rewriting) but still rewrites `?` to
       * $n: callers use the sqlite placeholder style everywhere, and Postgres
       * does not understand `?`.
       */
      raw(sql, params) {
        return client
          .query(replacePlaceholders(String(sql)), normalizeParams(params || []))
          .then((r) => r.rows);
      },
    };
    try {
      await client.query("BEGIN");
      const result = await fn(scoped);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* the connection is already unusable; release() discards it */
      }
      throw err;
    } finally {
      client.release();
    }
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
    readOnly,
    transaction,
    dialect: "postgres",
    run,
    exec,
    serialize,
    prepare,
    close,
    translate,
    replacePlaceholders,
  };
}
