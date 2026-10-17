/*
 * Regression test for the query_database read-only bypass.
 *
 * Each case states what it must do. Attacks must be refused AND must leave no
 * trace in the database. Legitimate reads must still work - a validator that
 * rejects everything is not a fix.
 */
"use strict";

const path = require("path");
const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

const { createTools } = require(path.join(REPO, "services/adminAssistant/tools.js"));
const db = require(path.join(REPO, "db.js"));

const all = (sql, params) =>
  new Promise((res, rej) => db.all(sql, params || [], (e, r) => (e ? rej(e) : res(r || []))));

let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, e) => { failures++; console.log("  FAIL  " + l + (e ? " -> " + e : "")); };

const ATTACKS = [
  {
    name: "comment-hidden multi-statement (the confirmed exploit)",
    sql: "select 1) as a -- '\n; create temp table opencode_probe(y int)\n; insert into opencode_probe values (42)\n; -- '",
  },
  {
    name: "block-comment quote pairing",
    sql: "select 1) as a /* ' */ ; create temp table probe2(y int) -- '",
  },
  {
    name: "plain multi-statement",
    sql: "select 1; drop table reviews",
  },
  {
    name: "write keyword",
    sql: "update users set is_admin = 1",
  },
  {
    name: "INSERT ... RETURNING",
    sql: "insert into news(title) values ('x') returning id",
  },
  {
    name: "DDL",
    sql: "drop table if exists reviews",
  },
  {
    name: "pg_sleep bomb (must not pin the connection)",
    sql: "select pg_sleep(30)",
  },
  {
    name: "privilege escalation attempt",
    sql: "select set_config('default_transaction_read_only', 'off', false)",
  },
];

const LEGIT = [
  { name: "simple select", sql: "select id, email from users order by id limit 3" },
  { name: "aggregate", sql: "select count(*)::int as n from loyalty_cards" },
  {
    name: "semicolon + write word inside a string literal (must be allowed)",
    sql: "select * from news where title like '%sold out; update%' limit 3",
  },
  {
    name: "CTE",
    sql: "with recent as (select id from reviews order by id desc limit 3) select count(*)::int as n from recent",
  },
];

(async () => {
  const tools = createTools({ db, adminId: 1, lang: "en", catalogue: async () => [] });
  const def = tools.byName.get("query_database");

  console.log("\n[attacks must be refused, and must not write]");
  for (const a of ATTACKS) {
    const r = await def.handler({ sql: a.sql, purpose: "test" });
    const refused = r && r.ok === false;
    refused ? ok(a.name) : bad(a.name, "returned ok=" + JSON.stringify(r).slice(0, 90));
  }

  // Nothing above may have created anything.
  for (const t of ["opencode_probe", "probe2"]) {
    const rows = await all(
      "select count(*)::int as n from pg_class where relname = $1",
      [t],
    );
    rows[0].n === 0 ? ok(`no table "${t}" was created`) : bad(`table "${t}" exists`);
  }

  console.log("\n[legitimate reads must still work]");
  for (const l of LEGIT) {
    try {
      const r = await def.handler({ sql: l.sql, purpose: "test" });
      r && r.ok ? ok(`${l.name} (${r.rowCount} row(s))`) : bad(l.name, JSON.stringify(r).slice(0, 90));
    } catch (e) {
      bad(l.name, e.message);
    }
  }

  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
  process.exit(failures ? 1 : 0);
})();
