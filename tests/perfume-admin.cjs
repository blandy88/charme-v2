#!/usr/bin/env node
// @db-scope: isolated — forces DATABASE_URL="" and a throwaway SQLite file in %TEMP%
/*
 * End-to-end HTTP tests for the /app perfume administration surface.
 *
 * Spawns the REAL server.js on a private port with a throwaway SQLite file and
 * a known JWT secret. Nothing here touches the live Neon database or the
 * developer's :3000 instance.
 *
 * Run: node tests/perfume-admin.cjs
 */
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const P = require("./perfume-png.cjs");
const PORT = 34000 + (process.pid % 1500);
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = "charme-perfume-it-secret-0123456789abcdef";
const DB_PATH = path.join(os.tmpdir(), `charme-perfume-it-${process.pid}-${Date.now()}.db`);

process.env.DATABASE_URL = "";
process.env.SQLITE_PATH = DB_PATH;
process.env.JWT_SECRET = SECRET;

const db = require(path.join(REPO, "db.js"));
const jwt = require(path.join(REPO, "node_modules", "jsonwebtoken"));

let failures = 0;
const check = (label, cond, extra) => {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.log(`  FAIL  ${label}${extra ? `  -> ${extra}` : ""}`);
  }
};

const qAll = (sql, p = []) => db.all(sql, p);
const qRun = (sql, p = []) => db.run(sql, p);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const adminToken = () => jwt.sign({ userId: 1, email: "it-admin@example.test" }, SECRET, { expiresIn: "2h" });
const customerToken = () => jwt.sign({ userId: 2, email: "it-customer@example.test" }, SECRET, { expiresIn: "2h" });

let child = null;
let childLog = "";

async function request(method, url, { token, json, fields, file, mime } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (fields || file) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields || {})) fd.append(k, String(v));
    if (file) fd.append("image", new Blob([file], { type: mime || "image/png" }), "bottle.png");
    body = fd;
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  const res = await fetch(BASE + url, { method, headers, body });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

async function rawImage(url) {
  const res = await fetch(BASE + url);
  return { status: res.status, type: res.headers.get("content-type"), etag: res.headers.get("etag"), bytes: Buffer.from(await res.arrayBuffer()) };
}

async function rowCount() {
  const r = await db.get("SELECT COUNT(*) AS n FROM perfume_admin");
  return Number(r.n);
}

async function boot() {
  await qAll("SELECT 1 AS ok");
  await qRun(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await qRun("INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (1, 'IT', 'Admin', 'it-admin@example.test', 'x', 1)");
  await qRun("INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (2, 'IT', 'Customer', 'it-customer@example.test', 'x', 0)");

  child = spawn(process.execPath, ["server.js"], {
    cwd: REPO,
    env: {
      ...process.env,
      DATABASE_URL: "",
      SQLITE_PATH: DB_PATH,
      JWT_SECRET: SECRET,
      PORT: String(PORT),
      NODE_ENV: "test",
      VERCEL: "",
      RENDER: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => (childLog += d.toString()));
  child.stderr.on("data", (d) => (childLog += d.toString()));

  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited (${child.exitCode}):\n${childLog.slice(-2000)}`);
    try {
      const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1000) });
      const tables = await qAll("SELECT name FROM sqlite_master WHERE type = 'table'");
      if (health.ok && tables.some((t) => t.name === "perfume_admin")) return;
    } catch {
      /* port not open yet */
    }
    await wait(150);
  }
  throw new Error(`server not ready:\n${childLog.slice(-2500)}`);
}

const RUNTIME_KEYS = [
  "id", "slug", "name", "brand", "family", "description", "ingredients",
  "year", "perfumer", "concentration", "sizes", "fromPrice", "available",
  "image", "imageKind", "brandLocation", "metrics", "tiers", "qualities",
  "indicators", "categories",
];

(async () => {
  await boot();
  const A = adminToken();
  const C = customerToken();
  console.log(`\nserver: ${BASE}\nscratch db: ${DB_PATH}\n`);

  const adminGet = (url, tok = A) => request("GET", url, { token: tok });
  const adminJson = (method, url, json, tok = A) => request(method, url, { token: tok, json });
  const create = (fields, file = P.transparent(), mime) =>
    request("POST", "/api/admin/perfumes", { token: A, fields, file, mime });

  /* ------------------------------------------------------------- auth gate */
  console.log("[authorisation]");
  check("no token -> 401", (await adminGet("/api/admin/perfumes", null)).status === 401);
  check("customer token -> 403", (await adminGet("/api/admin/perfumes", C)).status === 403);
  check("garbage token -> 403", (await adminGet("/api/admin/perfumes", "not.a.jwt")).status === 403);
  check("admin token -> 200", (await adminGet("/api/admin/perfumes")).status === 200);
  check("customer cannot bulk-edit", (await adminJson("POST", "/api/admin/perfumes/bulk", { ids: ["layton-0"], available: 0 }, C)).status === 403);
  check("customer cannot create", (await request("POST", "/api/admin/perfumes", { token: C, fields: { name: "X", brand: "Y" }, file: P.transparent() })).status === 403);

  /* --------------------------------------------------------- public reads */
  console.log("\n[public overlay + image endpoint]");
  const empty = await adminGet("/api/catalog/overlay", null);
  check("overlay is public", empty.status === 200 && empty.data.success === true, JSON.stringify(empty.data).slice(0, 160));
  check("overlay has a revision + three collections",
    typeof empty.data.revision === "string" && Array.isArray(empty.data.created) &&
    Array.isArray(empty.data.updated) && Array.isArray(empty.data.deleted));
  check("overlay is not cached", /no-store/.test(empty.headers.get("cache-control") || ""));
  check("initial overlay is empty", empty.data.created.length === 0 && empty.data.updated.length === 0 && empty.data.deleted.length === 0);
  check("unknown image -> 404", (await rawImage("/api/perfume-images/nope")).status === 404);
  check("path-traversal image id -> 404", (await rawImage("/api/perfume-images/..%2F..%2Fetc%2Fpasswd")).status === 404);

  /* ----------------------------------------------------------- validations */
  console.log("\n[create validation — every rejection must write nothing]");
  const good = { name: "IT Parfum Unique", brand: "Charme", price: "149.9" };
  const before = await rowCount();
  const badCases = [
    ["missing name", { ...good, name: "" }, P.transparent()],
    ["missing brand", { ...good, brand: "" }, P.transparent()],
    ["missing image", good, null],
    ["JPEG payload", good, Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(120)]), "image/jpeg"],
    ["fake PNG magic", good, Buffer.concat([P.SIG, Buffer.alloc(90)])],
    ["truncated PNG", good, P.transparent().subarray(0, 60)],
    ["opaque PNG", good, P.opaque()],
    ["fully transparent PNG", good, P.blank()],
    ["RGB PNG without alpha", good, P.rgbNoAlpha()],
    ["animated PNG", good, P.animated()],
    ["over 5 MB", good, Buffer.concat([P.SIG, Buffer.alloc(5 * 1024 * 1024)])],
    ["under 64px", good, P.transparent({ width: 32, height: 128 })],
    ["over 4096px", good, P.transparent({ width: 5000, height: 80 })],
    ["impossible aspect", good, P.transparent({ width: 4096, height: 64 })],
    ["negative price", { ...good, price: "-5" }, P.transparent()],
    ["NaN price", { ...good, price: "abc" }, P.transparent()],
    ["bad year", { ...good, year: "1300" }, P.transparent()],
    ["bad sizes JSON", { ...good, sizes: "{oops" }, P.transparent()],
    ["invalid stock flag", { ...good, available: "maybe" }, P.transparent()],
  ];
  for (const [label, fields, file, mime] of badCases) {
    const r = await create(fields, file, mime);
    check(`rejects ${label}`, r.status === 400, `status=${r.status} body=${JSON.stringify(r.data).slice(0, 120)}`);
  }
  check("failed validations wrote no rows", (await rowCount()) === before, `rows=${await rowCount()}`);

  /* ------------------------------------------------------------- happy path */
  console.log("\n[create + exact runtime shape]");
  const created = await create({ ...good, family: "Oriental", concentration: "EDP", perfumer: "IT Nose", year: "2024", ingredients: JSON.stringify(["Amber", "Rose"]) });
  check("create returns 201", created.status === 201, `status=${created.status} body=${JSON.stringify(created.data).slice(0, 200)}`);
  const product = created.data && created.data.product;
  check("create returns a product", !!product && typeof product.id === "string");
  check("new record has the EXACT virtual:catalogue shape",
    !!product && RUNTIME_KEYS.every((k) => Object.prototype.hasOwnProperty.call(product, k)),
    product ? RUNTIME_KEYS.filter((k) => !(k in product)).join(",") : "no product");
  check("arrays are real arrays on new record",
    !!product && ["ingredients", "sizes", "metrics", "tiers", "qualities", "indicators", "categories"].every((k) => Array.isArray(product[k])));
  check("price + stock on new record", !!product && product.fromPrice === 149.9 && product.available === true);
  check("image is an API path, not inline bytes",
    !!product && product.image === null && /^\/api\/perfume-images\/.+\?v=/.test(product.imagePath || ""),
    product && product.imagePath);
  check("ingredients survive round-trip", !!product && product.ingredients.join(",") === "Amber,Rose");

  const afterCreate = await adminGet("/api/catalog/overlay", null);
  check("overlay now contains the new perfume", afterCreate.data.created.some((p) => p.id === product.id));
  check("revision changed after create", afterCreate.data.revision !== empty.data.revision);
  check("overlay never leaks base64 image bytes", !/image_data|base64/i.test(JSON.stringify(afterCreate.data)));

  const img = await rawImage(product.imagePath);
  check("image endpoint returns PNG bytes", img.status === 200 && img.type === "image/png" && img.bytes.subarray(0, 8).equals(P.SIG), `status=${img.status} type=${img.type}`);
  check("image endpoint sets an ETag", typeof img.etag === "string" && img.etag.length > 2);
  const cached = await fetch(BASE + product.imagePath, { headers: { "If-None-Match": img.etag } });
  check("image endpoint answers 304 for a matching ETag", cached.status === 304);

  /* -------------------------------------------------- duplicate name rules */
  console.log("\n[duplicate names, case + diacritics]");
  const accented = await create({ name: "Éclat de Nuit", brand: "Charme", price: "99" });
  check("accented name created", accented.status === 201, `status=${accented.status}`);
  const dup1 = await create({ name: "eclat de nuit", brand: "Charme" });
  check("case/diacritic-insensitive duplicate -> 409", dup1.status === 409, `status=${dup1.status}`);
  const dupLegacy = await create({ name: "  LAYTON  ", brand: "Charme" });
  check("duplicate of a static catalogue name -> 409", dupLegacy.status === 409, `status=${dupLegacy.status}`);

  /* ------------------------------------------------------- extra/inert input */
  console.log("\n[hostile input is inert]");
  const xss = await create({ name: "<script>alert(1)</script>", brand: "Charme", extraKey: "ignored", price: "50" });
  check("script payload accepted as text", xss.status === 201, `status=${xss.status}`);
  check("script payload stored verbatim (React escapes it)", xss.data.product.name === "<script>alert(1)</script>");
  check("unknown form keys ignored", !("extraKey" in xss.data.product));
  const sqli = await adminJson("PATCH", "/api/admin/perfumes/x%27%3B%20DROP%20TABLE%20perfume_admin%3B--", { available: 0 });
  check("SQL-injection-shaped id -> 400", sqli.status === 400, `status=${sqli.status}`);
  check("injection attempt did not drop the table", (await rowCount()) > 0);
  check("PATCH unknown id -> 404", (await adminJson("PATCH", "/api/admin/perfumes/this-id-does-not-exist-xyz", { available: 0 })).status === 404);

  /* ------------------------------------------------------------ stock flips */
  console.log("\n[in-stock / hors-stock]");
  const off = await adminJson("PATCH", "/api/admin/perfumes/layton-0", { available: 0 });
  check("single static product -> hors stock", off.status === 200, `status=${off.status}`);
  let ov = await adminGet("/api/catalog/overlay", null);
  check("overlay carries the stock override", ov.data.updated.some((u) => u.id === "layton-0" && u.available === false), JSON.stringify(ov.data.updated).slice(0, 200));
  const on = await adminJson("PATCH", "/api/admin/perfumes/layton-0", { available: 1 });
  check("single static product -> in stock", on.status === 200);
  ov = await adminGet("/api/catalog/overlay", null);
  check("overlay reflects the flip back", ov.data.updated.some((u) => u.id === "layton-0" && u.available === true));

  const bulk = await adminJson("POST", "/api/admin/perfumes/bulk", {
    ids: ["layton-0", "haltane-1", "pegasus-2"], available: 0,
  });
  check("bulk stock change on 3 static ids", bulk.status === 200 && bulk.data.changed === 3, JSON.stringify(bulk.data));
  ov = await adminGet("/api/catalog/overlay", null);
  check("all 3 bulk overrides present", ["layton-0", "haltane-1", "pegasus-2"].every((id) => ov.data.updated.some((u) => u.id === id && u.available === false)));
  check("bulk over 200 ids -> 400", (await adminJson("POST", "/api/admin/perfumes/bulk", { ids: Array.from({ length: 201 }, (_, i) => `id-${i}`), available: 1 })).status === 400);
  check("bulk with no ids -> 400", (await adminJson("POST", "/api/admin/perfumes/bulk", { ids: [], available: 1 })).status === 400);
  check("bulk with no change -> 400", (await adminJson("POST", "/api/admin/perfumes/bulk", { ids: ["layton-0"] })).status === 400);
  const mixed = await adminJson("POST", "/api/admin/perfumes/bulk", { ids: ["layton-0", "no-such-perfume-xyz"], available: 1 });
  check("bulk ignores unknown ids instead of fabricating rows", mixed.status === 200 && mixed.data.changed === 1, JSON.stringify(mixed.data));

  /* ---------------------------------------------------------- edits + image */
  console.log("\n[edit, replace image, revision monotonicity]");
  const revBefore = (await adminGet("/api/catalog/overlay", null)).data.revision;
  const edited = await adminJson("PATCH", `/api/admin/perfumes/${product.id}`, { name: "IT Parfum Unique V2", price: "189", available: 0 });
  check("edit name + price + stock", edited.status === 200, `status=${edited.status} ${JSON.stringify(edited.data).slice(0, 160)}`);
  ov = await adminGet("/api/catalog/overlay", null);
  const editedRecord = ov.data.created.find((p) => p.id === product.id);
  check("overlay shows the edited name/price/stock",
    !!editedRecord && editedRecord.name === "IT Parfum Unique V2" && editedRecord.fromPrice === 189 && editedRecord.available === false,
    JSON.stringify(editedRecord).slice(0, 220));
  check("revision changed after edit", ov.data.revision !== revBefore);

  const oldImagePath = editedRecord.imagePath;
  const replaced = await request("PUT", `/api/admin/perfumes/${product.id}`, {
    token: A, fields: { family: "Woody" }, file: P.transparent({ width: 160, height: 160, alpha: (x, y) => ((x * 3 + y) % 2 ? 0 : 255) }),
  });
  check("PUT multipart replaces the image", replaced.status === 200, `status=${replaced.status} ${JSON.stringify(replaced.data).slice(0, 160)}`);
  ov = await adminGet("/api/catalog/overlay", null);
  const replacedRecord = ov.data.created.find((p) => p.id === product.id);
  check("image revision changed", !!replacedRecord && replacedRecord.imagePath !== oldImagePath, `${oldImagePath} -> ${replacedRecord && replacedRecord.imagePath}`);
  check("same-row edits produce a new overlay revision", ov.data.revision !== revBefore);
  const newImg = await rawImage(replacedRecord.imagePath);
  check("replacement image is still a transparent PNG", newImg.status === 200 && newImg.bytes.subarray(0, 8).equals(P.SIG));
  check("PUT kept the untouched fields", replacedRecord.family === "Woody" && replacedRecord.name === "IT Parfum Unique V2");

  const badReplace = await request("PUT", `/api/admin/perfumes/${product.id}`, { token: A, fields: {}, file: P.opaque() });
  check("rejects an opaque replacement image", badReplace.status === 400, `status=${badReplace.status}`);

  /* ------------------------------------------------------ palette tRNS PNG */
  console.log("\n[palette transparency + duplicate]");
  const palette = await create({ name: "IT Palette Bottle", brand: "Charme", price: "75" }, P.paletteTransparency());
  check("palette PNG with tRNS is accepted", palette.status === 201, `status=${palette.status} ${JSON.stringify(palette.data).slice(0, 160)}`);
  if (palette.status === 201) {
    const pimg = await rawImage(palette.data.product.imagePath);
    check("palette PNG is served back as PNG", pimg.status === 200 && pimg.bytes.subarray(0, 8).equals(P.SIG));
  }

  const dupCreated = await adminJson("POST", `/api/admin/perfumes/${product.id}/duplicate`, { name: "IT Clone One" });
  check("duplicate an admin-created perfume", dupCreated.status === 201, `status=${dupCreated.status} ${JSON.stringify(dupCreated.data).slice(0, 160)}`);
  if (dupCreated.status === 201) {
    check("clone has a distinct id", dupCreated.data.product.id !== product.id);
    const cloneImg = await rawImage(dupCreated.data.product.imagePath);
    check("clone copied the uploaded image", cloneImg.status === 200 && cloneImg.bytes.subarray(0, 8).equals(P.SIG));
  }
  const dupStatic = await adminJson("POST", "/api/admin/perfumes/layton-0/duplicate", {});
  check("duplicate a static perfume", dupStatic.status === 201, `status=${dupStatic.status} ${JSON.stringify(dupStatic.data).slice(0, 160)}`);
  if (dupStatic.status === 201) {
    check("static clone reuses the shipped image path", typeof dupStatic.data.product.imagePath === "string" && dupStatic.data.product.imagePath.length > 0);
  }
  check("duplicate name collision -> 409", (await adminJson("POST", `/api/admin/perfumes/${product.id}/duplicate`, { name: "IT Clone One" })).status === 409);

  /* ------------------------------------------------------ delete + restore */
  console.log("\n[soft delete, restore, purge]");
  const delCreated = await adminJson("DELETE", `/api/admin/perfumes/${product.id}`);
  check("delete admin-created perfume", delCreated.status === 200 && delCreated.data.permanent === false, JSON.stringify(delCreated.data));
  ov = await adminGet("/api/catalog/overlay", null);
  check("deleted perfume leaves the visible catalogue", !ov.data.created.some((p) => p.id === product.id) && ov.data.deleted.includes(product.id));
  let inventory = await adminGet("/api/admin/perfumes");
  check("admin inventory still lists the deleted row", inventory.data.rows.some((r) => r.id === product.id && r.deleted === true));
  check("admin inventory never returns image bytes", !/image_data/i.test(JSON.stringify(inventory.data)));
  const restored = await adminJson("POST", `/api/admin/perfumes/${product.id}/restore`, {});
  check("restore admin-created perfume", restored.status === 200, `status=${restored.status}`);
  ov = await adminGet("/api/catalog/overlay", null);
  check("restored perfume is visible again", ov.data.created.some((p) => p.id === product.id) && !ov.data.deleted.includes(product.id));

  const delStatic = await adminJson("DELETE", "/api/admin/perfumes/haltane-1");
  check("delete static perfume", delStatic.status === 200);
  ov = await adminGet("/api/catalog/overlay", null);
  check("static id appears in deleted list", ov.data.deleted.includes("haltane-1"));
  await adminJson("POST", "/api/admin/perfumes/haltane-1/restore", {});
  ov = await adminGet("/api/catalog/overlay", null);
  check("restore static perfume clears the tombstone", !ov.data.deleted.includes("haltane-1"));

  const purgeTarget = palette.data && palette.data.product && palette.data.product.id;
  const purged = await adminJson("DELETE", `/api/admin/perfumes/${purgeTarget}?purge=1`);
  check("purge permanently removes an admin perfume", purged.status === 200 && purged.data.permanent === true, JSON.stringify(purged.data));
  ov = await adminGet("/api/catalog/overlay", null);
  check("purged perfume is gone from created AND deleted", !ov.data.created.some((p) => p.id === purgeTarget) && !ov.data.deleted.includes(purgeTarget));
  check("purge of an unknown id -> 404", (await adminJson("DELETE", "/api/admin/perfumes/no-such-perfume-xyz?purge=1")).status === 404);

  /* ---------------------------------------------------------- concurrency */
  console.log("\n[concurrent writes]");
  const [t1, t2] = await Promise.all([
    adminJson("PATCH", "/api/admin/perfumes/pegasus-2", { available: 0 }),
    adminJson("PATCH", "/api/admin/perfumes/pegasus-2", { available: 1 }),
  ]);
  check("two same-tick toggles both succeed", t1.status === 200 && t2.status === 200, `${t1.status}/${t2.status}`);
  ov = await adminGet("/api/catalog/overlay", null);
  check("final state is one coherent override", ov.data.updated.filter((u) => u.id === "pegasus-2").length === 1);
  const finalRev = ov.data.revision;
  await wait(5);
  await adminJson("PATCH", "/api/admin/perfumes/pegasus-2", { available: 0 });
  await wait(5);
  await adminJson("PATCH", "/api/admin/perfumes/pegasus-2", { available: 0 });
  const revAfter = (await adminGet("/api/catalog/overlay", null)).data.revision;
  check("back-to-back writes keep the revision monotonic", revAfter !== finalRev);

  console.log(`\n${failures ? failures + " FAILURE(S)" : "ALL PERFUME ADMIN CHECKS PASSED"}`);
  if (failures && childLog) console.log("\n--- server log (tail) ---\n" + childLog.slice(-4000));
})()
  .catch((e) => {
    failures += 1;
    console.error("\nHARNESS ERROR:", e && e.stack ? e.stack : e);
    if (childLog) console.error("\n--- server log (tail) ---\n" + childLog.slice(-3000));
  })
  .finally(async () => {
    if (child && child.exitCode === null) child.kill();
    try { await db.close(); } catch {}
    try { fs.rmSync(DB_PATH, { force: true }); } catch {}
    process.exit(failures ? 1 : 0);
  });
