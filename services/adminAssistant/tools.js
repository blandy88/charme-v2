/*
 * Parfumerie Charme - back-office assistant: tools.
 *
 * These are the agent's hands. Two kinds:
 *
 *   read  - execute immediately. `query_database` is deliberately generic: the
 *           model gets the live schema in its system prompt and writes its own
 *           SELECTs, so it can answer questions nobody pre-wired (this is the
 *           "understands, don't script" half of the feature).
 *   write - real mutations. Every one pauses the agent and asks the signed-in
 *           administrator to approve it (see index.js), which is why they are
 *           typed tools with validated arguments rather than raw SQL: an
 *           approval prompt is only meaningful if the action is legible.
 *
 * Handlers mirror the behaviour of the corresponding /api/admin/* routes -
 * same guards, same side rows (e.g. the loyalty ledger entry) - so an action
 * taken from the chat is indistinguishable from one taken in the UI.
 */
"use strict";

const LOYALTY_REWARD_THRESHOLD = 5;
const MAX_QUERY_ROWS = 200;
const MAX_RESULT_CHARS = 20000;

/* The tool labels and approval sentences, in fr/en/ar. */
const { stringsFor } = require("./i18n");

/* Columns that must never leave the database, even for an admin. */
const SECRET_COLUMN = /(password_hash|verification_code|token_hash)/i;

const READ_ONLY = /^\s*(select|with)\b/i;
const STATEMENT_BREAK = /;\s*\S/; // a ";" with anything after it
const WRITE_KEYWORD =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|analyze|attach|detach|pragma|call|execute|merge|reindex|cluster|refresh|notify|listen|unlisten|prepare|deallocate|begin|commit|rollback|savepoint|replace|into)\b/i;

/*
 * Functions that read fine but change the *session* rather than the data.
 *
 * `default_transaction_read_only` is a GUC, and SQL can set it for the whole
 * connection: `select set_config('default_transaction_read_only','off',false)`
 * was observed succeeding on the assistant's read-only connection. db.readOnly()
 * re-asserts the flag before every query, so the damage does not persist - but
 * a query that can reconfigure the guard has no place in a shop report, so the
 * whole family is refused rather than relying on the reset. `lo_import` reads
 * a server-side file and `pg_terminate_backend` kills other people's queries;
 * neither is something the assistant has any business doing.
 */
const SESSION_MUTATOR =
  /\b(set_config|pg_reload_conf|pg_terminate_backend|pg_cancel_backend|lo_import|lo_export|dblink|pg_read_file|pg_ls_dir|copy_to|pg_backup_start)\s*\(/i;

/*
 * Mask single-quoted string literals before the statement guards look at the
 * SQL. Without this, a perfectly good read is refused because a product is
 * called "Into the Night" or a promotion reads "Promo; buy one get one", and
 * - worse - a would-be attacker could hide a keyword inside a literal. The
 * mask keeps the quotes so a statement-break detector still sees real ones.
 *
 * Comments are removed FIRST, and that ordering is the security property, not
 * a formatting preference. Masking quotes on the raw text let an attacker pair
 * two apostrophes that were never in the same literal: one parked in a `--`
 * comment and one later in the statement. The regex then treated everything
 * between them as one big string literal and blanked it, so the guards read a
 * copy with no semicolon, no write keyword and a leading SELECT - while the
 * string actually handed to the database still carried the payload. Verified
 * working exploit:
 *
 *   select 1) as a -- '
 *   ; create temp table p(y int)
 *   ; insert into p values (42)
 *   ; -- '
 *
 * Once comments are gone there is nowhere left to hide a quote, so the masked
 * copy and the executed string agree on where the literals are. `run()` also
 * executes through db.readOnly(), which pins
 * `default_transaction_read_only=on` on the connection - the filter is a
 * usability guard, the database is the boundary.
 */
function stripSqlComments(sql) {
  let out = "";
  let i = 0;
  const s = String(sql);
  while (i < s.length) {
    if (s[i] === "-" && s[i + 1] === "-") {
      while (i < s.length && s[i] !== "\n") i += 1;
      continue;
    }
    if (s[i] === "/" && s[i + 1] === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i += 1;
      i += 2;
      /* A comment separates tokens, so leave a space behind: otherwise an
         identifier either side of it would be glued into a different one. */
      out += " ";
      continue;
    }
    out += s[i];
    i += 1;
  }
  return out;
}

function maskLiterals(sql) {
  return String(sql).replace(/'(?:[^']|'')*'/g, (m) => `'${" ".repeat(m.length - 2)}'`);
}

/* Columns whose values must never reach the model, whatever way the query
   selects them - `SELECT *` included. */
const SECRET_VALUE_COLUMNS = new Set(["password_hash", "verification_code", "token_hash"]);

function redactSecrets(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const copy = { ...row };
    for (const key of Object.keys(copy)) {
      if (SECRET_VALUE_COLUMNS.has(key)) copy[key] = "[hidden]";
    }
    return copy;
  });
}

function all(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params || [], (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function one(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function run(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function (err) {
      if (err) return reject(err);
      return resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

/* ------------------------------------------------------------------ helpers */

function clamp(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function person(row) {
  if (!row) return null;
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return { id: row.id, name: name || "(no name)", email: row.email };
}

/*
 * Accepts an id, an email, or a loose name and returns { match, candidates }.
 * Ambiguity is reported rather than guessed: the model is expected to show the
 * candidates to the administrator and ask which one.
 */
async function resolveUser(db, args) {
  if (args.user_id) {
    const row = await one(
      db,
      "SELECT id, first_name, last_name, email FROM users WHERE id = ?",
      [args.user_id],
    );
    return { match: row, candidates: [] };
  }
  if (args.email) {
    const rows = await all(
      db,
      "SELECT id, first_name, last_name, email FROM users WHERE lower(email) = lower(?)",
      [args.email],
    );
    return { match: rows.length === 1 ? rows[0] : null, candidates: rows };
  }
  if (args.name) {
    const like = `%${String(args.name).toLowerCase()}%`;
    const rows = await all(
      db,
      `SELECT id, first_name, last_name, email FROM users
        WHERE lower(first_name || ' ' || last_name) LIKE ?
           OR lower(coalesce(first_name,'')) LIKE ?
           OR lower(coalesce(last_name,'')) LIKE ?
           OR lower(email) LIKE ?
        ORDER BY id ASC LIMIT 25`,
      [like, like, like, like],
    );
    return { match: rows.length === 1 ? rows[0] : null, candidates: rows };
  }
  return { match: null, candidates: [] };
}

async function resolveCard(db, args) {
  if (args.card_id) {
    const row = await one(
      db,
      `SELECT c.*, u.first_name, u.last_name, u.email AS user_email
         FROM loyalty_cards c LEFT JOIN users u ON u.id = c.user_id
        WHERE c.id = ?`,
      [args.card_id],
    );
    return { match: row, candidates: [] };
  }
  if (args.card_number) {
    const rows = await all(
      db,
      `SELECT c.*, u.first_name, u.last_name, u.email AS user_email
         FROM loyalty_cards c LEFT JOIN users u ON u.id = c.user_id
        WHERE upper(c.card_number) = upper(?)`,
      [args.card_number],
    );
    return { match: rows.length === 1 ? rows[0] : null, candidates: rows };
  }
  if (args.user_id) {
    const rows = await all(
      db,
      `SELECT c.*, u.first_name, u.last_name, u.email AS user_email
         FROM loyalty_cards c LEFT JOIN users u ON u.id = c.user_id
        WHERE c.user_id = ?`,
      [args.user_id],
    );
    return { match: rows.length === 1 ? rows[0] : null, candidates: rows };
  }
  return { match: null, candidates: [] };
}

function cardLabel(card) {
  const name = [card.holder_name, [card.first_name, card.last_name].filter(Boolean).join(" ")]
    .filter((x) => x && String(x).trim())
    .join(" / ");
  return `${card.card_number || "card #" + card.id}${name ? ` (${name.trim()})` : ""}`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* French/English/Arabic-ish day names -> the canonical English names the
   storefront schedule uses. The shop is in Tunisia, so the administrator will
   often type "mardi" or "الثلاثاء". */
function normaliseDay(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;
  for (const day of DAYS) {
    if (raw === day.toLowerCase() || raw.startsWith(day.toLowerCase().slice(0, 3))) return day;
  }
  const aliases = {
    dimanche: "Sunday", lun: "Monday", lundi: "Monday", mar: "Tuesday",
    mardi: "Tuesday", mer: "Wednesday", mercredi: "Wednesday", jeu: "Thursday",
    jeudi: "Thursday", ven: "Friday", vendredi: "Friday", sam: "Saturday",
    samedi: "Saturday", "الاثنين": "Monday", "الإثنين": "Monday",
    "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday", "الاربعاء": "Wednesday",
    "الخميس": "Thursday", "الجمعة": "Friday", "السبت": "Saturday",
    "الأحد": "Sunday", "الاحد": "Sunday",
  };
  if (aliases[raw]) return aliases[raw];
  for (const [key, day] of Object.entries(aliases)) {
    if (raw.startsWith(key)) return day;
  }
  return null;
}

/* "09:30" | 9.5 | "closed" | null -> 9.5 | null */
function toHour(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^(closed|fermé|ferme|مغلق|off)$/i.test(text)) return null;
  const hhmm = text.match(/^(\d{1,2})\s*[:h]\s*(\d{2})?$/i);
  if (hhmm) return Number(hhmm[1]) + (hhmm[2] ? Number(hhmm[2]) / 60 : 0);
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function round4(n) {
  return n === null ? null : Math.round(n * 10000) / 10000;
}

async function currentSchedule(db) {
  const row = await one(
    db,
    "SELECT value FROM store_settings WHERE key = 'store_hours'",
    [],
  );
  let config = null;
  try {
    config = row && row.value ? JSON.parse(row.value) : null;
  } catch (e) {
    config = null;
  }
  const schedule = (config && config.schedule) || [];
  return {
    timezone: (config && config.timezone) || "GMT+1 · Tunis Local Time",
    appointmentNote: (config && config.appointmentNote) || "Appointments on request",
    schedule: DAYS.map((day) => {
      const found = schedule.find((s) => normaliseDay(s.day) === day) || {};
      return { day, open: toHour(found.open), close: toHour(found.close) };
    }),
  };
}

async function logLoyalty(db, card, pointsChange, type, description) {
  await run(
    db,
    "INSERT INTO loyalty_transactions (card_id, user_id, points_change, type, description) VALUES (?, ?, ?, ?, ?)",
    [card.id, card.user_id, pointsChange, type, description],
  );
}

async function generateCardNumber(db) {
  const row = await one(db, "SELECT COUNT(*) AS total FROM loyalty_cards", []);
  let sequence = Number(row && row.total) || 0;
  for (;;) {
    sequence += 1;
    const candidate = "CH" + String(sequence).padStart(4, "0");
    const taken = await one(db, "SELECT 1 AS found FROM loyalty_cards WHERE card_number = ?", [
      candidate,
    ]);
    if (!taken) return candidate;
  }
}

/* ------------------------------------------------------------------- schema */

const REDACTED = new Set(["password_hash", "verification_code", "token_hash"]);

async function introspect(db) {
  let rows = [];
  try {
    rows = await all(
      db,
      `SELECT table_name, column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position`,
      [],
    );
  } catch (e) {
    rows = [];
  }
  if (!rows.length) {
    // SQLite fallback
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      [],
    );
    for (const t of tables) {
      const cols = await all(db, `PRAGMA table_info(${JSON.stringify(t.name)})`, []);
      for (const c of cols) {
        rows.push({ table_name: t.name, column_name: c.name, data_type: c.type });
      }
    }
  }
  const byTable = new Map();
  for (const row of rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, []);
    const type = String(row.data_type || "").replace(/\s+with time zone|\s+without time zone/i, "");
    byTable.set(row.table_name, [
      ...byTable.get(row.table_name),
      REDACTED.has(row.column_name) ? `${row.column_name} (hidden)` : `${row.column_name}:${type}`,
    ]);
  }
  return [...byTable.entries()]
    .map(([table, cols]) => `${table}(${cols.join(", ")})`)
    .join("\n");
}

/* -------------------------------------------------------------------- tools */

/* Real tool names are identifiers; anything after one is gateway noise. Models
   behind some OpenAI-compatible shims announce a call as
   "query_database<|channel|>commentary" or "query_database commentary", which
   would otherwise be rejected as an unknown tool and burn an agent step. */
function cleanToolName(raw) {
  const value = String(raw || "").trim();
  const match = value.match(/^[A-Za-z0-9_.-]+/);
  return match ? match[0] : value;
}

/* Arguments should be a JSON object, but gateways sometimes wrap them in
   commentary; take the outermost balanced braces so the JSON we hand the
   handler is the object the model meant to send. Braces inside string values
   are respected, so {"note": "a { b } c"} extracts correctly. */
function cleanArguments(raw) {
  const text = String(raw == null ? "" : raw);
  const start = text.indexOf("{");
  if (start === -1) return "{}";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "{}";
}

function tool(def) {
  return def;
}

function createTools({ db, catalogue, adminId, lang }) {
  const ctx = { db, adminId, catalogue };
  /* Built up front: the handlers below use the same dictionary for the wording
     they write into the ledger and the system shows on the approval card. */
  const t = stringsFor(lang);

  const tools = [
    tool({
      name: "query_database",
      risk: "read",
      description:
        "Run a read-only SELECT against the shop database and get rows back. Use this for any question about users, loyalty, reviews, news, notes, purchases or settings that the dedicated tools do not already answer (counts, aggregates, joins, date ranges). Write SQLite-flavoured SQL: '?' placeholders are fine, datetime('now'), current_timestamp and '||' concatenation all work. Only a single SELECT/WITH statement is allowed, at most 200 rows are returned.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "A single SELECT or WITH statement." },
          params: {
            type: "array",
            description: "Values for the '?' placeholders, in order.",
            items: { type: ["string", "number", "boolean", "null"] },
          },
          purpose: { type: "string", description: "One short line on why you are running it." },
        },
        required: ["sql"],
        additionalProperties: false,
      },
      async handler(args) {
        /* Comments are dropped before anything else looks at the text: see
           stripSqlComments() for why the ordering is load-bearing. */
        const sql = stripSqlComments(String(args.sql || "").trim()).trim().replace(/;\s*$/, "");
        /* The guards read the literal-masked copy, so a keyword or a semicolon
           inside a product name is just text - and the masked copy is also what
           an attacker would have to beat to sneak a write past the checks. */
        const guarded = maskLiterals(sql);
        if (!READ_ONLY.test(guarded)) {
          return { ok: false, error: "Only a single SELECT or WITH statement is allowed here." };
        }
        if (STATEMENT_BREAK.test(guarded)) {
          return { ok: false, error: "Multiple statements are not allowed." };
        }
        if (WRITE_KEYWORD.test(guarded)) {
          return {
            ok: false,
            error: "That statement contains a write keyword. Use the action tools for changes.",
          };
        }
        if (SESSION_MUTATOR.test(guarded)) {
          return {
            ok: false,
            error: "That query reconfigures the connection rather than reading data, which this tool cannot do.",
          };
        }
        /* Same masked copy: a news headline that merely mentions the column
           name is not a credential leak - a real reference to it still is. */
        if (SECRET_COLUMN.test(guarded)) {
          return { ok: false, error: "Columns holding credentials are not readable." };
        }
        /* Wrapping - rather than appending LIMIT - means a LIMIT buried in a
           subquery cannot defeat the row cap. The read goes through
           db.readOnly(), whose connection refuses writes outright, so a guard
           we failed to anticipate cannot become a write. */
        const params = args.params || [];
        let rows;
        try {
          rows = typeof db.readOnly === "function"
            ? await db.readOnly(`SELECT * FROM (${sql}) AS assistant_query LIMIT ${MAX_QUERY_ROWS}`, params)
            : await all(db, `SELECT * FROM (${sql}) AS assistant_query LIMIT ${MAX_QUERY_ROWS}`, params);
        } catch (e) {
          /* A database error is an answer, not a crash. Left unhandled a
             statement timeout (57014) or a read-only violation (25006)
             rejects out of the handler and takes the process with it. */
          const code = e && e.code;
          if (code === "57014") {
            return { ok: false, error: "That query ran too long and was cancelled (10s limit)." };
          }
          if (code === "25006") {
            return { ok: false, error: "That statement tried to modify data, which this tool cannot do." };
          }
          return { ok: false, error: `The database rejected that query: ${(e && e.message) || "unknown error"}` };
        }
        const capped = redactSecrets(rows.slice(0, MAX_QUERY_ROWS));
        let payload = JSON.stringify({ ok: true, rowCount: capped.length, rows: capped });
        if (payload.length > MAX_RESULT_CHARS) {
          payload = JSON.stringify({
            ok: true,
            rowCount: capped.length,
            truncated: true,
            note: "Result truncated - narrow the query or select fewer columns.",
            rows: capped.slice(0, 50),
          });
        }
        return JSON.parse(payload);
      },
    }),

    tool({
      name: "site_overview",
      risk: "read",
      description:
        "A snapshot of the boutique: customer/admin/banned counts, loyalty cards and rewards, published news, unread guest notes, review counts, the store-hours schedule, and how many catalogue references have artwork. Call this first when the administrator asks something open-ended about the state of the shop.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      async handler() {
        const users = await one(
          db,
          `SELECT COUNT(*) AS total,
                  COUNT(CASE WHEN is_admin = 1 THEN 1 END) AS admins,
                  COUNT(CASE WHEN is_banned = 1 THEN 1 END) AS banned
             FROM users`,
          [],
        ).catch(() => null);
        // "How many signed up this week" is worth having, but the arithmetic
        // differs per engine, so filter in JS when the Postgres form fails.
        let new7d = null;
        try {
          const r = await one(
            db,
            "SELECT COUNT(*) AS n FROM users WHERE created_at >= current_timestamp - interval '7 days'",
            [],
          );
          new7d = r && r.n;
        } catch (e) {
          const rows = await all(db, "SELECT created_at FROM users", []).catch(() => []);
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
          new7d = rows.filter((r) => {
            const raw = r.created_at;
            const time =
              raw instanceof Date
                ? raw.getTime()
                : new Date(String(raw || "").replace(" ", "T") + "Z").getTime();
            return Number.isFinite(time) && time >= cutoff;
          }).length;
        }
        const cards = await one(
          db,
          `SELECT COUNT(*) AS total,
                  COUNT(CASE WHEN points >= ${LOYALTY_REWARD_THRESHOLD} THEN 1 END) AS eligible,
                  COALESCE(SUM(points), 0) AS points
             FROM loyalty_cards`,
          [],
        ).catch(() => null);
        const rewards = await one(
          db,
          "SELECT COUNT(*) AS total FROM loyalty_transactions WHERE type = 'redeem'",
          [],
        ).catch(() => null);
        const notes = await one(
          db,
          "SELECT COUNT(*) AS total, COUNT(CASE WHEN is_read = 0 THEN 1 END) AS unread FROM guest_notes",
          [],
        ).catch(() => null);
        const news = await one(
          db,
          "SELECT COUNT(*) AS total FROM news WHERE is_active = 1",
          [],
        ).catch(() => null);
        const reviews = await one(
          db,
          "SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS avg_rating FROM reviews",
          [],
        ).catch(async () => {
          // SQLite has no ::numeric cast; fall back to plain AVG.
          return one(db, "SELECT COUNT(*) AS total, COALESCE(AVG(rating), 0) AS avg_rating FROM reviews", []).catch(
            () => null,
          );
        });
        const hours = await currentSchedule(db).catch(() => null);
        const cat = await catalogue();
        return {
          ok: true,
          customers: users ? { ...users, newLast7Days: new7d } : null,
          loyalty: { cards: cards, rewardsRedeemed: rewards && rewards.total, rewardThreshold: LOYALTY_REWARD_THRESHOLD },
          guestNotes: notes,
          publishedNews: news && news.total,
          reviews: reviews,
          storeHours: hours,
          catalogue: {
            references: cat.total,
            withArtwork: cat.withImage,
            withoutArtwork: cat.missing,
          },
        };
      },
    }),

    tool({
      name: "search_catalogue",
      risk: "read",
      description:
        "Search the storefront catalogue (752 references) by name, brand, family, perfumer, note or description. Returns price, concentration, availability and image path. Use it to locate what the shop actually sells.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words to look for." },
          brand: { type: "string", description: "Optional exact-ish brand filter." },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        required: ["query"],
        additionalProperties: false,
      },
      async handler(args) {
        const cat = await catalogue();
        const words = String(args.query || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const brand = args.brand ? String(args.brand).toLowerCase() : null;
        const hits = cat.items.filter((item) => {
          if (brand && !String(item.brand).toLowerCase().includes(brand)) return false;
          const hay = [
            item.name,
            item.brand,
            item.family,
            item.perfumer,
            item.concentration,
            item.description,
            (item.ingredients || []).join(" "),
          ]
            .join(" ")
            .toLowerCase();
          return words.every((w) => hay.includes(w));
        });
        return {
          ok: true,
          matches: hits.length,
          results: hits.slice(0, clamp(args.limit || 10, 1, 50)).map((item) => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            family: item.family,
            concentration: item.concentration,
            fromPrice: item.fromPrice,
            available: item.available,
            image: item.image,
          })),
        };
      },
    }),

    tool({
      name: "find_user",
      risk: "read",
      description:
        "Look up one customer by id, email or name. Always call this before acting on a person so you act on the right account. If the name is ambiguous it returns every candidate - show them to the administrator and ask which one, never guess.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          email: { type: "string" },
          name: { type: "string", description: "Full or partial name." },
        },
        additionalProperties: false,
      },
      async handler(args) {
        const { match, candidates } = await resolveUser(db, args);
        if (match) {
          const detail = await one(
            db,
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.birthday,
                    u.is_admin, u.is_banned, u.banned_reason, u.banned_at,
                    u.created_at, u.last_login,
                    c.card_number, c.points,
                    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.id) AS reviews,
                    (SELECT COUNT(*) FROM user_favorites f WHERE f.user_id = u.id) AS favorites
               FROM users u LEFT JOIN loyalty_cards c ON c.user_id = u.id
              WHERE u.id = ?`,
            [match.id],
          );
          return { ok: true, user: detail };
        }
        if (candidates.length) {
          return {
            ok: true,
            ambiguous: true,
            candidates: candidates.map((c) => ({ ...person(c), is_banned: c.is_banned, is_admin: c.is_admin })),
            note: "More than one match - ask the administrator which one before acting.",
          };
        }
        return { ok: true, user: null, note: "No user matched." };
      },
    }),

    tool({
      name: "list_loyalty_cards",
      risk: "read",
      description:
        "List loyalty cards with their holder, points, reward eligibility and purchase count. Filter by a name/email/card-number fragment, by minimum points, or ask only for cards that have reached the reward threshold.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name, email or card number fragment." },
          min_points: { type: "integer" },
          only_eligible: { type: "boolean", description: "Only cards with enough points for a reward." },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
      async handler(args) {
        const where = [];
        const params = [];
        if (args.query) {
          const like = `%${String(args.query).toLowerCase()}%`;
          where.push(
            "(lower(coalesce(c.card_number,'')) LIKE ? OR lower(coalesce(c.holder_name,'')) LIKE ? OR lower(coalesce(c.holder_email,'')) LIKE ? OR lower(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) LIKE ? OR lower(coalesce(u.email,'')) LIKE ?)",
          );
          params.push(like, like, like, like, like);
        }
        if (Number.isFinite(Number(args.min_points))) {
          where.push("coalesce(c.points,0) >= ?");
          params.push(Number(args.min_points));
        }
        if (args.only_eligible) {
          where.push(`coalesce(c.points,0) >= ${LOYALTY_REWARD_THRESHOLD}`);
        }
        const rows = await all(
          db,
          `SELECT c.id AS card_id, c.card_number, c.points, c.user_id,
                  c.holder_name, c.holder_email, c.holder_phone, c.created_at,
                  u.first_name, u.last_name, u.email AS user_email, u.is_banned,
                  (SELECT COUNT(*) FROM customer_purchases cp WHERE cp.card_id = c.id) AS purchases,
                  (SELECT COUNT(*) FROM loyalty_transactions lt WHERE lt.card_id = c.id AND lt.type = 'redeem') AS rewards
             FROM loyalty_cards c LEFT JOIN users u ON u.id = c.user_id
             ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
            ORDER BY c.points DESC, c.id ASC
            LIMIT ${clamp(args.limit || 25, 1, 100)}`,
          params,
        );
        return {
          ok: true,
          rewardThreshold: LOYALTY_REWARD_THRESHOLD,
          count: rows.length,
          cards: rows.map((r) => ({
            card_id: r.card_id,
            card_number: r.card_number,
            holder: [r.holder_name, [r.first_name, r.last_name].filter(Boolean).join(" ")]
              .filter((x) => x && String(x).trim())
              .join(" / ") || null,
            email: r.user_email || r.holder_email || null,
            user_id: r.user_id,
            points: r.points || 0,
            eligible: (r.points || 0) >= LOYALTY_REWARD_THRESHOLD,
            purchases: r.purchases,
            rewards: r.rewards,
            banned: r.is_banned === 1,
          })),
        };
      },
    }),

    tool({
      name: "list_news",
      risk: "read",
      description: "List every news/announcement item, including unpublished drafts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      async handler() {
        const rows = await all(db, "SELECT * FROM news ORDER BY created_at DESC, id DESC", []);
        return { ok: true, count: rows.length, news: rows };
      },
    }),

    tool({
      name: "list_guest_notes",
      risk: "read",
      description: "List messages left by visitors in the contact/guest-notes form.",
      parameters: {
        type: "object",
        properties: {
          unread_only: { type: "boolean" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
      async handler(args) {
        const rows = await all(
          db,
          `SELECT * FROM guest_notes ${args.unread_only ? "WHERE is_read = 0" : ""}
            ORDER BY created_at DESC, id DESC LIMIT ${clamp(args.limit || 25, 1, 100)}`,
          [],
        );
        const counts = await one(
          db,
          "SELECT COUNT(*) AS total, COUNT(CASE WHEN is_read = 0 THEN 1 END) AS unread FROM guest_notes",
          [],
        );
        return { ok: true, total: counts && counts.total, unread: counts && counts.unread, notes: rows };
      },
    }),

    tool({
      name: "list_reviews",
      risk: "read",
      description: "List customer reviews, optionally for one fragrance or one user.",
      parameters: {
        type: "object",
        properties: {
          fragrance: { type: "string" },
          user_id: { type: "integer" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
      async handler(args) {
        const where = [];
        const params = [];
        if (args.fragrance) {
          where.push("lower(fragrance) LIKE ?");
          params.push(`%${String(args.fragrance).toLowerCase()}%`);
        }
        if (args.user_id) {
          where.push("user_id = ?");
          params.push(args.user_id);
        }
        const rows = await all(
          db,
          `SELECT id, user_id, user_name, fragrance, rating, review_text, likes, dislikes, created_at
             FROM reviews ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
            ORDER BY created_at DESC LIMIT ${clamp(args.limit || 25, 1, 100)}`,
          params,
        );
        return { ok: true, count: rows.length, reviews: rows };
      },
    }),

    /* ------------------------------------------------------------- writes */

    tool({
      name: "ban_user",
      risk: "write",
      description:
        "Ban a customer account. They can no longer sign in. The administrator must approve this. Call find_user first to be sure of the account.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          reason: { type: "string", description: "Why the account is being banned." },
        },
        required: ["user_id"],
        additionalProperties: false,
      },
      async handler(args) {
        const target = await one(db, "SELECT id, is_admin, email FROM users WHERE id = ?", [args.user_id]);
        if (!target) return { ok: false, error: "User not found." };
        if (Number(target.id) === Number(adminId)) {
          return { ok: false, error: "You cannot ban your own account." };
        }
        if (target.is_admin) {
          return { ok: false, error: "Admin accounts cannot be banned." };
        }
        await run(
          db,
          "UPDATE users SET is_banned = 1, banned_reason = ?, banned_at = datetime('now'), banned_by = ? WHERE id = ?",
          [String(args.reason || "No reason provided").slice(0, 500), adminId, args.user_id],
        );
        const after = await one(
          db,
          "SELECT id, first_name, last_name, email FROM users WHERE id = ?",
          [args.user_id],
        );
        return {
          ok: true,
          banned: true,
          user: person(after),
          reason: args.reason || "No reason provided",
        };
      },
    }),

    tool({
      name: "unban_user",
      risk: "write",
      description: "Lift a ban and clear its reason.",
      parameters: {
        type: "object",
        properties: { user_id: { type: "integer" } },
        required: ["user_id"],
        additionalProperties: false,
      },
      async handler(args) {
        const row = await one(
          db,
          "SELECT id, first_name, last_name, email, is_banned FROM users WHERE id = ?",
          [args.user_id],
        );
        if (!row) return { ok: false, error: "User not found." };
        if (!row.is_banned) return { ok: true, changed: false, note: "That account is not banned." };
        await run(
          db,
          "UPDATE users SET is_banned = 0, banned_reason = NULL, banned_at = NULL, banned_by = NULL WHERE id = ?",
          [args.user_id],
        );
        return { ok: true, user: person(row) };
      },
    }),

    tool({
      name: "set_admin_role",
      risk: "write",
      description: "Grant or revoke administrator rights for a user.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          is_admin: { type: "boolean" },
        },
        required: ["user_id", "is_admin"],
        additionalProperties: false,
      },
      async handler(args) {
        const row = await one(
          db,
          "SELECT id, first_name, last_name, email, is_admin FROM users WHERE id = ?",
          [args.user_id],
        );
        if (!row) return { ok: false, error: "User not found." };
        if (Number(args.user_id) === Number(adminId)) {
          return { ok: false, error: "You cannot change your own administrator role." };
        }
        /* Removing the last administrator would lock everyone out of the back
           office - and there is no other route that can put the role back. */
        if (!args.is_admin && row.is_admin) {
          const admins = await one(db, "SELECT COUNT(*) AS total FROM users WHERE is_admin = 1", []);
          if (!admins || Number(admins.total) <= 1) {
            return { ok: false, error: "That is the last administrator - promote someone else first." };
          }
        }
        await run(db, "UPDATE users SET is_admin = ? WHERE id = ?", [
          args.is_admin ? 1 : 0,
          args.user_id,
        ]);
        return { ok: true, user: person(row), is_admin: Boolean(args.is_admin) };
      },
    }),

    tool({
      name: "add_loyalty_points",
      risk: "write",
      description:
        "Credit loyalty points to a card (1-1000). Writes the matching entry in the loyalty ledger, exactly like the admin screen.",
      parameters: {
        type: "object",
        properties: {
          card_id: { type: "integer" },
          card_number: { type: "string" },
          points: { type: "integer", minimum: 1, maximum: 1000 },
          description: { type: "string" },
        },
        required: ["points"],
        additionalProperties: false,
      },
      async handler(args) {
        const { match, candidates } = await resolveCard(db, args);
        if (!match) {
          return candidates.length
            ? { ok: false, error: "Several cards match - identify the card precisely.", candidates: candidates.map(cardLabel) }
            : { ok: false, error: "No loyalty card found for those details." };
        }
        const points = Math.floor(Number(args.points));
        if (!Number.isFinite(points) || points < 1 || points > 1000) {
          return { ok: false, error: "Points must be an integer between 1 and 1000." };
        }
        await run(
          db,
          "UPDATE loyalty_cards SET points = points + ?, updated_at = datetime('now') WHERE id = ?",
          [points, match.id],
        );
        await logLoyalty(
          db,
          match,
          points,
          "earn",
          String(args.description || t.ledger.pointsAdded(points)).slice(0, 300),
        );
        const fresh = await one(db, "SELECT points FROM loyalty_cards WHERE id = ?", [match.id]);
        return {
          ok: true,
          card: cardLabel(match),
          added: points,
          points: fresh ? fresh.points : null,
          eligible: Boolean(fresh && fresh.points >= LOYALTY_REWARD_THRESHOLD),
        };
      },
    }),

    tool({
      name: "set_loyalty_points",
      risk: "write",
      description: "Set a card's points to an exact value (use for corrections). Logs an adjustment entry.",
      parameters: {
        type: "object",
        properties: {
          card_id: { type: "integer" },
          card_number: { type: "string" },
          points: { type: "integer", minimum: 0, maximum: 100000 },
          description: { type: "string" },
        },
        required: ["points"],
        additionalProperties: false,
      },
      async handler(args) {
        const { match, candidates } = await resolveCard(db, args);
        if (!match) {
          return candidates.length
            ? { ok: false, error: "Several cards match - identify the card precisely.", candidates: candidates.map(cardLabel) }
            : { ok: false, error: "No loyalty card found for those details." };
        }
        const target = Math.floor(Number(args.points));
        /* The shop's own loyalty screen clamps to 0..10000; mirror it instead of
           accepting a number the ledger could not honestly represent. */
        if (!Number.isFinite(target) || target < 0 || target > 10000) {
          return { ok: false, error: "Points must be an integer between 0 and 10000." };
        }
        const delta = target - (match.points || 0);
        await run(
          db,
          "UPDATE loyalty_cards SET points = ?, updated_at = datetime('now') WHERE id = ?",
          [target, match.id],
        );
        /* loyalty_transactions.type is constrained to ('earn', 'redeem') on both
           engines, so a correction is logged as a signed 'earn' entry - exactly
           what the admin screen writes for the same change. Logging a made-up
           'adjust' type would fail the CHECK *after* the points had already
           moved, leaving the card updated and the ledger silent. */
        if (delta !== 0) {
          await logLoyalty(
            db,
            match,
            delta,
            "earn",
            String(args.description || t.ledger.pointsAdjust(delta)).slice(0, 300),
          );
        }
        return { ok: true, card: cardLabel(match), from: match.points || 0, points: target, eligible: target >= LOYALTY_REWARD_THRESHOLD };
      },
    }),

    tool({
      name: "redeem_loyalty_reward",
      risk: "write",
      description: `Spend one reward: deducts ${LOYALTY_REWARD_THRESHOLD} points from a card that has at least that many, and records the redemption.`,
      parameters: {
        type: "object",
        properties: {
          card_id: { type: "integer" },
          card_number: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(args) {
        const { match, candidates } = await resolveCard(db, args);
        if (!match) {
          return candidates.length
            ? { ok: false, error: "Several cards match - identify the card precisely.", candidates: candidates.map(cardLabel) }
            : { ok: false, error: "No loyalty card found for those details." };
        }
        if ((match.points || 0) < LOYALTY_REWARD_THRESHOLD) {
          return {
            ok: false,
            error: `Not enough points (${match.points || 0}/${LOYALTY_REWARD_THRESHOLD} required).`,
          };
        }
        await run(
          db,
          "UPDATE loyalty_cards SET points = points - ?, updated_at = datetime('now') WHERE id = ?",
          [LOYALTY_REWARD_THRESHOLD, match.id],
        );
        await logLoyalty(db, match, -LOYALTY_REWARD_THRESHOLD, "redeem", t.ledger.reward());
        const fresh = await one(db, "SELECT points FROM loyalty_cards WHERE id = ?", [match.id]);
        return { ok: true, card: cardLabel(match), points: fresh ? fresh.points : null };
      },
    }),

    tool({
      name: "create_loyalty_card",
      risk: "write",
      description:
        "Create a loyalty card, either for an existing customer (user_id) or for a walk-in customer (name, and optionally email/phone). A card number is generated automatically.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          name: { type: "string", description: "Holder name for a walk-in card." },
          email: { type: "string" },
          phone: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(args) {
        if (args.user_id) {
          const user = await one(db, "SELECT id, first_name, last_name, email FROM users WHERE id = ?", [
            args.user_id,
          ]);
          if (!user) return { ok: false, error: "User not found." };
          const existing = await one(db, "SELECT id, card_number FROM loyalty_cards WHERE user_id = ?", [
            args.user_id,
          ]);
          if (existing) {
            return { ok: false, error: `That customer already has card ${existing.card_number}.` };
          }
          const cardNumber = await generateCardNumber(db);
          const { lastID } = await run(
            db,
            "INSERT INTO loyalty_cards (user_id, card_number, points, holder_name, holder_email, holder_phone) VALUES (?, ?, 0, NULL, NULL, NULL)",
            [args.user_id, cardNumber],
          );
          return { ok: true, card: { card_id: lastID, card_number: cardNumber, holder: person(user), points: 0 } };
        }
        const name = String(args.name || "").trim();
        if (!name) return { ok: false, error: "A holder name is required for a walk-in card." };
        const cardNumber = await generateCardNumber(db);
        const { lastID } = await run(
          db,
          "INSERT INTO loyalty_cards (user_id, card_number, points, holder_name, holder_email, holder_phone) VALUES (NULL, ?, 0, ?, ?, ?)",
          [
            cardNumber,
            name.slice(0, 120),
            String(args.email || "").trim().slice(0, 200),
            String(args.phone || "").trim().slice(0, 40),
          ],
        );
        return { ok: true, card: { card_id: lastID, card_number: cardNumber, holder: name, points: 0 } };
      },
    }),

    tool({
      name: "create_news",
      risk: "write",
      description:
        "Publish an announcement on the storefront. Title and content are required and are shown to every visitor.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "The message body (plain text)." },
          template_type: {
            type: "string",
            enum: ["general", "promotion", "new_perfume", "event"],
          },
          badge: { type: "string", description: "Short label, e.g. 'Nouveau'." },
          icon: { type: "string", description: "An emoji, e.g. '🎁'." },
          color: { type: "string", description: "A hex colour, e.g. '#c9a227'." },
          cta_label: { type: "string", description: "Call-to-action button label." },
          cta_url: { type: "string" },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
      async handler(args) {
        const title = String(args.title || "").trim();
        const content = String(args.content || "").trim();
        if (!title || !content) return { ok: false, error: "Both a title and a message are required." };
        const allowed = ["general", "promotion", "new_perfume", "event"];
        const type = allowed.includes(args.template_type) ? args.template_type : "general";
        const { lastID } = await run(
          db,
          `INSERT INTO news (template_type, badge, icon, color, title, content, cta_label, cta_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            type,
            String(args.badge || "").trim().slice(0, 40),
            String(args.icon || "").trim().slice(0, 8),
            String(args.color || "").trim().slice(0, 32),
            title.slice(0, 300),
            content.slice(0, 4000),
            String(args.cta_label || "").trim().slice(0, 60),
            String(args.cta_url || "").trim().slice(0, 500),
          ],
        );
        return { ok: true, id: lastID, title, published: true };
      },
    }),

    tool({
      name: "update_news",
      risk: "write",
      description: "Edit an existing announcement, or hide/show it with is_active.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          content: { type: "string" },
          is_active: { type: "boolean" },
          badge: { type: "string" },
          cta_label: { type: "string" },
          cta_url: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(db, "SELECT * FROM news WHERE id = ?", [args.id]);
        if (!existing) return { ok: false, error: "No such news item." };
        const sets = [];
        const params = [];
        const text = (v, max) => String(v).slice(0, max);
        if (args.title !== undefined) {
          sets.push("title = ?");
          params.push(text(args.title, 300));
        }
        if (args.content !== undefined) {
          sets.push("content = ?");
          params.push(text(args.content, 4000));
        }
        if (args.badge !== undefined) {
          sets.push("badge = ?");
          params.push(text(args.badge, 40));
        }
        if (args.cta_label !== undefined) {
          sets.push("cta_label = ?");
          params.push(text(args.cta_label, 60));
        }
        if (args.cta_url !== undefined) {
          sets.push("cta_url = ?");
          params.push(text(args.cta_url, 500));
        }
        if (args.is_active !== undefined) {
          sets.push("is_active = ?");
          params.push(args.is_active ? 1 : 0);
        }
        if (!sets.length) return { ok: false, error: "Nothing to change." };
        params.push(args.id);
        await run(db, `UPDATE news SET ${sets.join(", ")} WHERE id = ?`, params);
        const fresh = await one(db, "SELECT * FROM news WHERE id = ?", [args.id]);
        return { ok: true, news: fresh };
      },
    }),

    tool({
      name: "delete_news",
      risk: "write",
      description: "Permanently delete an announcement.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(db, "SELECT id, title FROM news WHERE id = ?", [args.id]);
        if (!existing) return { ok: false, error: "No such news item." };
        await run(db, "DELETE FROM news WHERE id = ?", [args.id]);
        return { ok: true, deleted: { id: existing.id, title: existing.title } };
      },
    }),

    tool({
      name: "set_store_hours",
      risk: "write",
      description:
        "Change opening hours. Pass only the days you are changing, e.g. updates=[{day:'Tuesday', open:'09:00', close:'19:00'}] or [{day:'Sunday', open:null, close:null}] to mark a day closed. Day names in French or English are accepted; hours may be 'HH:MM' or decimal hours. Days not mentioned keep their current value.",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                open: { type: ["string", "number", "null"], description: "'HH:MM', decimal hours, or null for closed." },
                close: { type: ["string", "number", "null"] },
              },
              required: ["day"],
              additionalProperties: false,
            },
          },
          timezone: { type: "string" },
          appointment_note: { type: "string" },
        },
        required: ["updates"],
        additionalProperties: false,
      },
      async handler(args) {
        const current = await currentSchedule(db);
        const updates = Array.isArray(args.updates) ? args.updates : [];
        if (!updates.length) return { ok: false, error: "No day was provided." };
        /* A day needs both ends of its range or neither. Silently treating
           "open 09:00" (no close) as "closed" would close the shop on a typo. */
        const incomplete = [];
        for (const update of updates) {
          const hasOpen = update.open !== undefined && update.open !== null && String(update.open).trim() !== "";
          const hasClose = update.close !== undefined && update.close !== null && String(update.close).trim() !== "";
          if (hasOpen !== hasClose) incomplete.push(update.day);
        }
        if (incomplete.length) {
          return {
            ok: false,
            error: `Give both an opening and a closing time (or neither) for: ${incomplete.join(", ")}.`,
          };
        }
        const unknown = [];
        for (const update of updates) {
          const day = normaliseDay(update.day);
          if (!day) {
            unknown.push(update.day);
            continue;
          }
          const slot = current.schedule.find((s) => s.day === day);
          const open = toHour(update.open);
          const close = toHour(update.close);
          const closed =
            open === null || close === null || open < 0 || open > 24 || close < 0 || close > 24 || close <= open;
          slot.open = closed ? null : round4(open);
          slot.close = closed ? null : round4(close);
        }
        if (unknown.length) {
          return { ok: false, error: `Unrecognised day(s): ${unknown.join(", ")}. Use Monday..Sunday.` };
        }
        const config = {
          schedule: current.schedule.map((s) => ({ day: s.day, open: s.open, close: s.close })),
          timezone: String(args.timezone || current.timezone).slice(0, 80),
          appointmentNote: String(args.appointment_note || current.appointmentNote).slice(0, 200),
        };
        await run(
          db,
          "INSERT OR REPLACE INTO store_settings (key, value, updated_at) VALUES ('store_hours', ?, CURRENT_TIMESTAMP)",
          [JSON.stringify(config)],
        );
        return { ok: true, config };
      },
    }),

    tool({
      name: "mark_guest_note_read",
      risk: "write",
      description: "Mark a guest note as read.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(db, "SELECT id FROM guest_notes WHERE id = ?", [args.id]);
        if (!existing) return { ok: false, error: "No such note." };
        await run(db, "UPDATE guest_notes SET is_read = 1 WHERE id = ?", [args.id]);
        return { ok: true, id: args.id, is_read: true };
      },
    }),

    tool({
      name: "delete_guest_note",
      risk: "write",
      description: "Permanently delete a guest note.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(db, "SELECT id, author_name FROM guest_notes WHERE id = ?", [args.id]);
        if (!existing) return { ok: false, error: "No such note." };
        await run(db, "DELETE FROM guest_notes WHERE id = ?", [args.id]);
        return { ok: true, deleted: existing };
      },
    }),

    tool({
      name: "delete_review",
      risk: "write",
      description: "Delete a customer review (and, on Postgres, cascade rows are left to the app's own cleanup rules).",
      parameters: {
        type: "object",
        properties: { review_id: { type: "integer" } },
        required: ["review_id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(
          db,
          "SELECT id, user_name, fragrance, rating FROM reviews WHERE id = ?",
          [args.review_id],
        );
        if (!existing) return { ok: false, error: "No such review." };
        await run(db, "DELETE FROM reviews WHERE id = ?", [args.review_id]);
        return { ok: true, deleted: existing };
      },
    }),

    tool({
      name: "update_review",
      risk: "write",
      description: "Correct a review's text or rating.",
      parameters: {
        type: "object",
        properties: {
          review_id: { type: "integer" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          review_text: { type: "string" },
        },
        required: ["review_id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(db, "SELECT id FROM reviews WHERE id = ?", [args.review_id]);
        if (!existing) return { ok: false, error: "No such review." };
        const sets = [];
        const params = [];
        let changed = false;
        if (args.rating !== undefined) {
          sets.push("rating = ?");
          params.push(clamp(args.rating, 1, 5));
          changed = true;
        }
        if (args.review_text !== undefined) {
          sets.push("review_text = ?");
          params.push(String(args.review_text).slice(0, 4000));
          changed = true;
        }
        if (!changed) return { ok: false, error: "Nothing to change." };
        /* Any correction is an edit, not just a text correction: the storefront
           shows the "edited" marker from this flag, so a rating-only fix has to
           set it too or the change is invisible. */
        sets.push("is_edited = 1", "edited_at = datetime('now')", "updated_at = datetime('now')");
        params.push(args.review_id);
        await run(db, `UPDATE reviews SET ${sets.join(", ")} WHERE id = ?`, params);
        const fresh = await one(db, "SELECT * FROM reviews WHERE id = ?", [args.review_id]);
        return { ok: true, review: fresh };
      },
    }),

    tool({
      name: "delete_review_reply",
      risk: "write",
      description: "Delete one reply under a review.",
      parameters: {
        type: "object",
        properties: { reply_id: { type: "integer" } },
        required: ["reply_id"],
        additionalProperties: false,
      },
      async handler(args) {
        const existing = await one(db, "SELECT id, user_name FROM review_replies WHERE id = ?", [
          args.reply_id,
        ]);
        if (!existing) return { ok: false, error: "No such reply." };
        await run(db, "DELETE FROM review_replies WHERE id = ?", [args.reply_id]);
        return { ok: true, deleted: existing };
      },
    }),
  ];

  /* tools.js owns the behaviour, i18n.js owns the wording: every tool is given
     the label shown in the transcript and the one-line sentence on the approval
     card, in the language the administrator is using. A tool that has no
     translation yet still reads sensibly, because it falls back to its own
     machine name. */
  for (const def of tools) {
    const render = t.previews[def.name];
    def.label = t.tools[def.name] || def.name;
    def.preview = (args) =>
      typeof render === "function"
        ? render(args || {}, { threshold: LOYALTY_REWARD_THRESHOLD })
        : def.name;
  }

  /* A duplicate name is invisible in review (two blocks read fine) but the
     provider receives two functions with the same name in one `tools` array,
     where selection becomes ambiguous and the model often falls back to
     narrating the action instead of calling it. Fail loudly at build time. */
  {
    const seen = new Set();
    const dupes = new Set();
    for (const def of tools) {
      if (seen.has(def.name)) dupes.add(def.name);
      seen.add(def.name);
    }
    if (dupes.size) {
      throw new Error(
        `adminAssistant: duplicate tool name(s): ${[...dupes].join(", ")}`,
      );
    }
  }

  return {
    ctx,
    list: tools,
    byName: new Map(tools.map((t) => [t.name, t])),
    /* Look a tool up the way the model named it: a gateway that appended
       channel markers to the name still has to land on the tool it meant. */
    toolFor(name) {
      /* Gateway noise is stripped by cleanToolName; after that the name must
         match exactly. No prefix fallback: with tools like delete_review and
         delete_review_reply, prefix matching would route the wrong call. */
      const key = cleanToolName(name);
      return this.byName.get(key) || null;
    },
    /* The JSON-schema form the model is given. Note `preview` and `risk` are
       ours, not the model's - they are stripped here. */
    spec() {
      return tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    },
  };
}

module.exports = { createTools, introspect, cleanToolName, cleanArguments, currentSchedule };
