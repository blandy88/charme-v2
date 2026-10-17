/*
 * Regression checks for the fixes made to the back-office assistant.
 *
 * Covers the four things that were actually broken:
 *   1. duplicate tool names reaching the provider (mark_guest_note_read x2)
 *   2. every tool having a label + approval sentence in fr/en/ar
 *   3. the new client strings existing in all three languages
 *   4. narratedWriteCall() spotting a write the model described in prose
 *
 * Run from the repo root:  node <this file>
 */
"use strict";

const path = require("path");
const fs = require("fs");

const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

const { createTools } = require(path.join(REPO, "services/adminAssistant/tools.js"));
const i18n = require(path.join(REPO, "services/adminAssistant/i18n.js"));

let failures = 0;
const ok = (label) => console.log("  PASS  " + label);
const bad = (label, extra) => {
  failures += 1;
  console.log("  FAIL  " + label + (extra ? " -> " + extra : ""));
};

// ---------------------------------------------------------------- 1. duplicates
console.log("\n[1] tool names are unique");
const registry = createTools({ db: null, adminId: 1, lang: "fr", catalogue: async () => [] });
const names = registry.list.map((t) => t.name);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);
dupes.length ? bad("no duplicate tool names", dupes.join(", ")) : ok(`${names.length} unique tools`);
names.includes("mark_guest_note_read")
  ? ok("mark_guest_note_read present exactly once")
  : bad("mark_guest_note_read missing");

// ------------------------------------------------------- 2. per-language wording
console.log("\n[2] every tool is labelled and previewed in fr/en/ar");
for (const lang of ["fr", "en", "ar"]) {
  const t = i18n.stringsFor(lang);
  if (!t) {
    bad(`i18n stringsFor(${lang})`);
    continue;
  }
  const missingLabel = names.filter((n) => !t.tools[n]);
  const missingPreview = names.filter((n) => typeof t.previews[n] !== "function");
  missingLabel.length
    ? bad(`${lang}: labels`, missingLabel.join(", "))
    : ok(`${lang}: all ${names.length} labels`);
  missingPreview.length
    ? bad(`${lang}: approval sentences`, missingPreview.join(", "))
    : ok(`${lang}: all ${names.length} approval sentences`);
}

// ------------------------------------------------------- 3. new client strings
console.log("\n[3] new UI strings present in all three languages");
const src = fs.readFileSync(
  path.join(REPO, "frontend/src/atelier/pages/adminI18n.js"),
  "utf8",
);
for (const key of ["assistantApprovalAlways", "assistantNotExecuted"]) {
  const hits = (src.match(new RegExp(`^\\s+${key}:`, "gm")) || []).length;
  hits === 3 ? ok(`${key} x3`) : bad(`${key}`, `found ${hits}, want 3`);
}

// ------------------------------------------------- 4. narrated-write detection
console.log("\n[4] narratedWriteCall spots prose-described writes");
const indexSrc = fs.readFileSync(
  path.join(REPO, "services/adminAssistant/index.js"),
  "utf8",
);
// Pull the real function body out of the module so the test exercises the
// shipped code rather than a copy of it.
const start = indexSrc.indexOf("function narratedWriteCall");
if (start === -1) {
  bad("narratedWriteCall not found in index.js");
} else {
  let depth = 0;
  let i = indexSrc.indexOf("{", start);
  const from = i;
  for (; i < indexSrc.length; i += 1) {
    if (indexSrc[i] === "{") depth += 1;
    else if (indexSrc[i] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const narratedWriteCall = eval(
    "(" + indexSrc.slice(start, i + 1) + ")",
  );

  const says = (text) => narratedWriteCall(text, registry);
  const readOnly = says("You can run query_database(SELECT * FROM users) to check.");
  readOnly === null
    ? ok("ignores a read tool written as prose (no false alarm)")
    : bad("read tool flagged as a write", String(readOnly));

  const write1 = says('Here you go:\n```\nadd_loyalty_points(\n  card_number: "CH0001",\n  points: 5\n)\n```');
  write1 === "add_loyalty_points" ? ok("catches add_loyalty_points in a fence") : bad("missed write", String(write1));

  const write2 = says("I will now call delete_news({ id: 3 }) for you.");
  write2 === "delete_news" ? ok("catches delete_news inline") : bad("missed inline write", String(write2));

  const write3 = says("```\ncreate_news\n```");
  write3 === "create_news" ? ok("catches a bare fenced tool name") : bad("missed bare name", String(write3));

  const plain = says("Total clients : 9");
  plain === null ? ok("ordinary prose is not flagged") : bad("false positive", String(plain));
}

console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
process.exit(failures ? 1 : 0);
