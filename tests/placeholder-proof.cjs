/* Does replacePlaceholders corrupt SQL?
 *
 * db.js rewrites SQLite `?` into Postgres $1, $2, ... for the better-sqlite3
 * compatibility shim. It tracks single-quoted strings only. A `?` that is NOT
 * a placeholder - inside a -- comment, a /* *\/ block, a $$ quoted body, or a
 * "quoted identifier" - is still rewritten. That does two things at once:
 * it emits a bogus $n into what is meant to be inert text, and it increments
 * paramIndex, so every real placeholder AFTER it is numbered one too high.
 *
 * The second effect is the dangerous one: the values the caller supplies are
 * positional, so a query that comments on a question mark binds its arguments
 * to the wrong columns and writes the wrong data.
 *
 * The function is lifted out of db.js and run on its own - no database, no
 * connection, no side effects.
 */
// @db-scope: no-database — reads db.js as text and runs the lifted function in memory; opens no connection

"use strict";
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join("C:\\Users\\cheri\\OneDrive\\Documents\\GitHub\\charme", "db.js"),
  "utf8",
);

/* Pull the real function body out of the source so this tests what ships.
 * db.js has THREE named replacePlaceholders: a no-op in the SQLite adapter
 * (line 66), the reverse Postgres->SQLite direction (line 101), and the one
 * under test, the forward SQLite->Postgres rewrite (line 339). Picking the
 * first match silently tests the wrong one, so pick the definition that
 * actually numbers placeholders. */
const needle = "  function replacePlaceholders(sql) {";
let start = -1;
for (let at = SRC.indexOf(needle); at >= 0; at = SRC.indexOf(needle, at + 1)) {
  if (SRC.slice(at, at + 400).includes("paramIndex")) { start = at; break; }
}
if (start < 0) throw new Error("the forward replacePlaceholders (with paramIndex) not found in db.js");
let depth = 0, i = SRC.indexOf("{", start), end = -1;
for (let j = i; j < SRC.length; j++) {
  if (SRC[j] === "{") depth++;
  else if (SRC[j] === "}") { depth--; if (depth === 0) { end = j + 1; break; } }
}
const fnSrc = SRC.slice(start, end);
const replacePlaceholders = new Function(`${fnSrc}; return replacePlaceholders;`)();

const CASES = [
  {
    name: "baseline (no comment) - correct",
    sql: "SELECT * FROM t WHERE a = ? AND b = ?",
    expect: "SELECT * FROM t WHERE a = $1 AND b = $2",
  },
  {
    name: "line comment holding a question mark",
    sql: "SELECT * FROM t -- is this ok ?\nWHERE a = ? AND b = ?",
    expect: "SELECT * FROM t -- is this ok ?\nWHERE a = $1 AND b = $2",
  },
  {
    name: "block comment holding a question mark",
    sql: "SELECT * FROM t /* what ? really */ WHERE a = ? AND b = ?",
    expect: "SELECT * FROM t /* what ? really */ WHERE a = $1 AND b = $2",
  },
  {
    name: "nested block comments (Postgres allows them)",
    sql: "SELECT /* a /* b ? */ c ? */ 1 WHERE x = ?",
    expect: "SELECT /* a /* b ? */ c ? */ 1 WHERE x = $1",
  },
  {
    // Out of contract (input only ever holds `?`), but the guard matters: if
    // $1 were read as a dollar-quote opener it would swallow the rest of the
    // statement and the `?` would silently vanish instead of being renumbered.
    name: "a $1 must not be read as a dollar-quote opener",
    sql: "SELECT $1, ?::int",
    expect: "SELECT $1, $1::int",
  },
  {
    name: "dollar-quoted body holding a question mark",
    sql: "SELECT $$a ? b$$ AS v, ?::int AS n",
    expect: "SELECT $$a ? b$$ AS v, $1::int AS n",
  },
  {
    name: "tagged dollar-quoted body",
    sql: "SELECT $tag$keep ? me$tag$ AS v, ?::int AS n",
    expect: "SELECT $tag$keep ? me$tag$ AS v, $1::int AS n",
  },
  {
    name: "double-quoted identifier holding a question mark",
    sql: 'SELECT "col?" FROM t WHERE a = ?',
    expect: 'SELECT "col?" FROM t WHERE a = $1',
  },
  {
    name: "single-quoted literal (already handled)",
    sql: "SELECT * FROM t WHERE a = 'why?' AND b = ?",
    expect: "SELECT * FROM t WHERE a = 'why?' AND b = $1",
  },
];

let bad = 0;
console.log("");
for (const c of CASES) {
  let got;
  try { got = replacePlaceholders(c.sql); } catch (e) { got = "THREW: " + e.message; }
  const ok = got === c.expect;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  console.log(`      in:   ${JSON.stringify(c.sql)}`);
  console.log(`      got:  ${JSON.stringify(got)}`);
  if (!ok) console.log(`      want: ${JSON.stringify(c.expect)}`);
  console.log("");
}
console.log(`${CASES.length - bad}/${CASES.length} correct, ${bad} corrupted`);
process.exit(bad ? 1 : 0);