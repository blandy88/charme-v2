#!/usr/bin/env node
/* Exhaustive browser audit of the Perfumes admin tab (2026-11-07).
 *
 * Unlike _recon/perfume-admin-verify.cjs (which stubs the API), this harness
 * spawns the REAL server.js with a throwaway SQLite file, seeds an admin user,
 * injects that user's JWT into localStorage and drives the committed /app
 * bundle. Every write therefore goes through Express, multer, sharp and the
 * real overlay projection; the storefront assertions read the same overlay the
 * customers do.
 *
 * Coverage:
 *   - real create / edit / stock / duplicate / delete / restore / purge / bulk
 *   - PNG bytes, alpha stats, ETag/304 and cache headers
 *   - collection card parity, product page, search, out-of-stock
 *   - duplicate name, missing image, invalid price, XSS text, long text
 *   - double submit, save-button busy state, focus trap / restore
 *   - accessible names, th scope, live regions
 *   - admin inventory load failure + stale banner + retry
 *   - overlay offline (static catalogue still works)
 *   - responsive matrix 320 -> 1920 + Arabic RTL + tap targets
 *   - server contract: auth, no-store overlay, bulk cap, 404 image
 *
 * Run: node _recon/perfume-admin-audit.cjs
 */
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PW = "C:/Users/cheri/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright";
const CHROME =
  "C:/Users/cheri/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";

const REPO = path.resolve(__dirname, "..");
const P = require(path.join(REPO, "tests", "perfume-png.cjs"));
const sharp = require(path.join(REPO, "node_modules", "sharp"));

const PORT = 36000 + (process.pid % 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = `${BASE}/app/admin?tab=perfumes`;
const COLLECTION = `${BASE}/app/collection`;
const SECRET = "charme-perfume-audit-secret-0123456789abcdef";
const DB_PATH = path.join(os.tmpdir(), `charme-perfume-audit-${process.pid}-${Date.now()}.db`);

process.env.DATABASE_URL = "";
process.env.SQLITE_PATH = DB_PATH;
process.env.JWT_SECRET = SECRET;

const db = require(path.join(REPO, "db.js"));
const jwt = require(path.join(REPO, "node_modules", "jsonwebtoken"));

const TOKEN = jwt.sign({ userId: 1, email: "audit-admin@example.test" }, SECRET, { expiresIn: "4h" });
const CUSTOMER = jwt.sign({ userId: 2, email: "audit-customer@example.test" }, SECRET, { expiresIn: "4h" });

const PNG = P.transparent();
const NOW_YEAR = new Date().getFullYear();

const log = (m) => fs.writeSync(1, m + "\n");
const failures = [];
const warnings = [];
let checks = 0;
function check(cond, msg, extra) {
  checks++;
  log(`   ${cond ? "ok  " : "FAIL"} ${msg}${!cond && extra ? `  -> ${extra}` : ""}`);
  if (!cond) failures.push(msg);
}
function warn(cond, msg, extra) {
  log(`   ${cond ? "ok  " : "WARN"} ${msg}${!cond && extra ? `  -> ${extra}` : ""}`);
  if (!cond) warnings.push(msg);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e;
    }
    await wait(120);
  }
  return false;
}

/* ------------------------------------------------------------------- server */

let child = null;
let serverLog = "";

async function boot() {
  await db.all("SELECT 1 AS ok");
  await db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.run(
    "INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (1, 'Audit', 'Admin', 'audit-admin@example.test', 'x', 1)",
  );
  await db.run(
    "INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (2, 'Audit', 'Customer', 'audit-customer@example.test', 'x', 0)",
  );

  /* The product page asks for reviews; without these the server 500s loudly
     (harmless to the audit, but it floods the log and hides real errors). */
  await db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      fragrance TEXT,
      rating INTEGER,
      review_text TEXT,
      likes INTEGER DEFAULT 0,
      dislikes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS review_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER,
      user_id INTEGER,
      like_type TEXT
  )`);

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
  child.stdout.on("data", (d) => (serverLog += d.toString()));
  child.stderr.on("data", (d) => (serverLog += d.toString()));

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited (${child.exitCode}):\n${serverLog.slice(-2500)}`);
    try {
      const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1500) });
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table'");
      if (health.ok && tables.some((t) => t.name === "perfume_admin")) return;
    } catch {
      /* port not open yet */
    }
    await wait(150);
  }
  throw new Error(`server not ready:\n${serverLog.slice(-3000)}`);
}

function stopServer() {
  if (!child) return;
  try {
    child.kill("SIGKILL");
  } catch {
    /* already gone */
  }
}

async function raw(method, p, { token, body, headers } = {}) {
  const h = { ...(headers || {}) };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body !== undefined && !(body instanceof FormData) && typeof body !== "string") {
    h["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + p, { method, headers: h, body: payload, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

const api = (p, opts = {}) => raw("GET", p, { token: TOKEN, ...opts });
const catalogue = async () => (await api("/api/catalog/overlay")).data;
const adminRows = async () => (await api("/api/admin/perfumes")).data.rows;

async function createdByName(name) {
  const ov = await catalogue();
  return (ov.created || []).find((r) => r.name === name) || null;
}
async function adminRowByName(name) {
  return (await adminRows()).find((r) => r.name === name) || null;
}

/* ------------------------------------------------------------------ browser */

(async () => {
  await boot();
  log(`server: ${BASE}\nscratch db: ${DB_PATH}\n`);

  const { chromium } = require(PW);
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(({ token }) => {
    try {
      localStorage.setItem("charme-token", token);
      if (!localStorage.getItem("charme-lang")) localStorage.setItem("charme-lang", "en");
    } catch {
      /* ignore */
    }
  }, { token: TOKEN });

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource|net::ERR_|ERR_FAILED/i.test(t)) return; // deliberate abort tests
    pageErrors.push(`console: ${t}`);
  });
  const dialogs = [];
  page.on("dialog", async (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    await d.accept();
  });

  const requests = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/api/")) {
      requests.push({ method: r.method(), path: u.pathname, search: u.search, postData: r.postData() });
    }
  });
  const reqCount = (method, p) => requests.filter((r) => r.method === method && r.path === p).length;
  const resetRequests = () => (requests.length = 0);

  async function gotoAdmin() {
    await page.goto(ADMIN, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
    await page.waitForTimeout(120);
  }
  async function gotoCollection(q) {
    const url = q ? `${COLLECTION}?q=${encodeURIComponent(q)}` : COLLECTION;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(400);
  }
  async function cardNames() {
    await page.waitForSelector(".shelf", { timeout: 15000 }).catch(() => {});
    return (await page.locator(".shelf-body h3").allInnerTexts()).map((s) => s.trim());
  }
  async function openAdd() {
    await page.locator('[data-guide="perfumes-add"]').click();
    await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
    await page.waitForTimeout(120);
  }
  async function closeDialog() {
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-guide="perfume-form"]', { state: "detached", timeout: 10000 });
  }
  async function fillBasics({ name, brand, family, price = "120", price2, size = "50 ml", size2 = "100 ml" }) {
    await page.locator('[data-guide="perfume-name"]').fill(name);
    await page.locator('[data-guide="perfume-brand"]').fill(brand);
    if (family) await page.locator('[data-guide="perfume-family"]').fill(family);
    await page.locator('[data-guide="perfume-size-label"]').first().fill(size);
    await page.locator('[data-guide="perfume-size-price"]').first().fill(String(price));
    if (price2 != null) {
      await page.locator('[data-guide="perfume-size-add"]').click();
      await page.locator('[data-guide="perfume-size-label"]').nth(1).fill(size2);
      await page.locator('[data-guide="perfume-size-price"]').nth(1).fill(String(price2));
    }
  }
  async function pickPng(buffer = PNG) {
    await page.locator('[data-guide="perfume-image"]').setInputFiles({
      name: "bottle.png",
      mimeType: "image/png",
      buffer,
    });
    await page.waitForFunction(
      () => {
        const img = document.querySelector(".perf-preview .shelf-media img");
        return img && img.src.startsWith("blob:");
      },
      { timeout: 10000 },
    );
  }
  async function saveDialog(expectedText, timeout = 12000) {
    await page.locator('[data-guide="perfume-save"]').click();
    await page.waitForFunction(
      (needle) => document.body.innerText.includes(needle),
      expectedText,
      { timeout },
    );
  }
  async function searchAdmin(q) {
    await page.locator('[data-guide="perfumes-search"]').fill(q);
    await page.waitForTimeout(200);
  }
  async function adminRow(name) {
    return page.locator('[data-guide="perfumes-row"]').filter({ hasText: name }).first();
  }

  try {
    /* ================================================================== 1 */
    log("1: the admin tab loads against the real server with a real JWT");
    resetRequests();
    await gotoAdmin();
    check((await page.locator('[data-guide="perfumes-table"] tbody tr').count()) === 10, "first page has ten rows");
    check(await page.locator('[data-guide="perfumes-add"]').isVisible(), "Add a perfume is visible");
    check((await page.locator(".admin-error").count()) === 0, "no error banner on a clean load");
    check(reqCount("GET", "/api/admin/perfumes") === 1, "inventory fetched exactly once (single effect)", `count=${reqCount("GET", "/api/admin/perfumes")}`);
    check(reqCount("GET", "/api/catalog/overlay") >= 1, "public overlay fetched on boot");
    const overlayRes = await fetch(`${BASE}/api/catalog/overlay`);
    check(/no-store/.test(overlayRes.headers.get("cache-control") || ""), "overlay is Cache-Control: no-store");
    const noAuth = await raw("GET", "/api/admin/perfumes");
    check(noAuth.status === 401, "admin inventory rejects anonymous callers", String(noAuth.status));
    const customer = await raw("GET", "/api/admin/perfumes", { token: CUSTOMER });
    check(customer.status === 403, "admin inventory rejects customers", String(customer.status));

    /* ================================================================== 2 */
    log("2: create a perfume through the UI with a genuinely transparent PNG");
    const NAME = `Zzz Audit Alpha ${Date.now().toString(36)}`;
    const BRAND = "Audit Maison";
    resetRequests();
    await openAdd();
    await fillBasics({ name: NAME, brand: BRAND, family: "Woody", price: "120", price2: "180" });
    await page.locator('[data-guide="perfume-concentration"]').fill("EDP");
    await page.locator('[data-guide="perfume-perfumer"]').fill("Audit Nose");
    await page.locator('[data-guide="perfume-year"]').fill(String(NOW_YEAR - 1));
    await page.locator('[data-guide="perfume-description"]').fill("A perfume created by the audit harness.");
    await page.locator('[data-guide="perfume-ingredients"]').fill("Cedar\nBergamot, Amber");
    await pickPng();
    check((await page.locator(".perf-preview .shelf-body h3").innerText()) === NAME, "preview mirrors the typed name");
    check((await page.locator(".perf-preview .shelf-price").innerText()).includes("120"), "preview starts from the cheapest size");
    await saveDialog("Perfume added to the collection.");
    check(reqCount("POST", "/api/admin/perfumes") === 1, "one create POST for one save", `count=${reqCount("POST", "/api/admin/perfumes")}`);

    const created = await waitFor(() => createdByName(NAME));
    check(Boolean(created), "server overlay contains the created perfume");
    if (created) {
      check(created.brand === BRAND, "brand persisted");
      check(created.fromPrice === 120, "fromPrice is the cheapest size", String(created.fromPrice));
      check((created.sizes || []).length === 2, "both sizes persisted", JSON.stringify(created.sizes));
      check(created.available === true, "created in stock by default");
      check(created.year === NOW_YEAR - 1, "year persisted", String(created.year));
      check(Array.isArray(created.ingredients) && created.ingredients.length === 3, "ingredients split into three", JSON.stringify(created.ingredients));
      check(/^\/api\/perfume-images\//.test(created.imagePath || ""), "imagePath points at the image route", created.imagePath);
      const row = await adminRowByName(NAME);
      check(Boolean(row) && row.kind === "created", "admin inventory marks it as created");
      check(Boolean(row) && /^\d{4}-\d{2}-\d{2}T.*Z\.\d{5}$/.test(String(row.updatedAt)), "updated_at carries the monotonic suffix", row && row.updatedAt);
    }

    if (created) {
      const imgRes = await fetch(BASE + created.imagePath);
      const bytes = Buffer.from(await imgRes.arrayBuffer());
      check(imgRes.status === 200, "image route answers 200", String(imgRes.status));
      check(imgRes.headers.get("content-type") === "image/png", "image is served as image/png", imgRes.headers.get("content-type"));
      check(/immutable/.test(imgRes.headers.get("cache-control") || ""), "image is immutable-cacheable");
      check(bytes.subarray(0, 8).equals(P.SIG), "served bytes keep the PNG signature");
      const etag = imgRes.headers.get("etag");
      check(Boolean(etag), "image carries an ETag");
      const stats = await sharp(bytes, { failOn: "error" }).ensureAlpha().stats();
      const alpha = stats.channels[3];
      check(alpha && alpha.min === 0, "served PNG still has transparent pixels", `min=${alpha && alpha.min}`);
      check(alpha && alpha.max === 255, "served PNG still has visible pixels", `max=${alpha && alpha.max}`);
      if (etag) {
        const notModified = await fetch(BASE + created.imagePath, { headers: { "If-None-Match": etag } });
        check(notModified.status === 304, "If-None-Match returns 304", String(notModified.status));
      }
      const missing = await fetch(`${BASE}/api/perfume-images/does-not-exist`);
      check(missing.status === 404, "unknown image id is 404", String(missing.status));
    }

    /* ================================================================== 3 */
    log("3: the new perfume reaches collection, search, product page and stock state");
    await gotoCollection(NAME);
    const card = page.locator(".shelf").filter({ hasText: NAME }).first();
    await card.waitFor({ timeout: 15000 });
    check((await page.locator(".shelf").count()) >= 1, "collection search finds the new card");
    check((await card.locator(".shelf-brand").textContent()).trim().toLowerCase() === BRAND.toLowerCase(), "card shows the brand");
    check((await card.locator(".shelf-body h3").innerText()).trim() === NAME, "card shows the name");
    check((await card.locator(".shelf-meta").innerText()).includes("Woody"), "card shows family/concentration");
    check((await card.locator(".shelf-price").innerText()).includes("120"), "card shows the from price");
    check((await card.locator(".shelf-out").count()) === 0, "in-stock card has no out-of-stock badge");
    const natural = await card.locator(".shelf-media img").evaluate((el) => ({ complete: el.complete, w: el.naturalWidth }));
    check(natural.complete && natural.w > 0, "card image actually decoded", JSON.stringify(natural));
    const href = await card.getAttribute("href");
    check(Boolean(href && href.includes("/collection/")), "card links to the product page", String(href));

    await card.click();
    await page.waitForSelector('[data-guide="pdp-sections"]', { timeout: 15000 });
    check((await page.locator(".pdp-top h1").innerText()).trim() === NAME, "product page shows the name");
    check((await page.locator(".pdp-buy").innerText()).includes("120"), "product page shows the price");
    check((await page.locator(".pdp-stock").innerText()).toLowerCase().includes("available"), "product page shows in stock");
    check(page.url().includes("/app/collection/"), "product route lives under /app", page.url());

    // Stock toggle from the admin panel, then prove the storefront changed.
    await gotoAdmin();
    await searchAdmin(NAME);
    let row = await adminRow(NAME);
    await row.waitFor({ timeout: 15000 });
    const patchBefore = reqCount("PATCH", `/api/admin/perfumes/${created ? created.id : "x"}`);
    await row.locator('[data-guide="perfumes-stock"]').click();
    await page.waitForFunction(
      (name) => {
        const r = [...document.querySelectorAll('[data-guide="perfumes-row"]')].find((x) => x.innerText.includes(name));
        return r && /Out of stock/.test(r.innerText);
      },
      NAME,
      { timeout: 15000 },
    );
    check(reqCount("PATCH", `/api/admin/perfumes/${created ? created.id : "x"}`) - patchBefore === 1, "stock toggle issues one PATCH");
    const afterToggle = await waitFor(async () => {
      const rec = await createdByName(NAME);
      return rec && rec.available === false ? rec : null;
    });
    check(Boolean(afterToggle), "overlay marks the perfume out of stock");

    await gotoCollection(NAME);
    const outCard = page.locator(".shelf").filter({ hasText: NAME }).first();
    await outCard.waitFor({ timeout: 15000 });
    check((await outCard.locator(".shelf-out").count()) === 1, "collection card now shows the out-of-stock badge");
    await outCard.click();
    await page.waitForSelector('[data-guide="pdp-sections"]', { timeout: 15000 });
    check((await page.locator(".pdp-stock").innerText()).toLowerCase().includes("sold out"), "product page now shows out of stock");

    // Back in stock for the remaining tests.
    await gotoAdmin();
    await searchAdmin(NAME);
    row = await adminRow(NAME);
    await row.locator('[data-guide="perfumes-stock"]').click();
    await waitFor(async () => {
      const rec = await createdByName(NAME);
      return rec && rec.available === true;
    });

    /* ================================================================== 4 */
    log("4: edit updates the overlay, the storefront price and the updated-at column");
    await searchAdmin(NAME);
    row = await adminRow(NAME);
    await row.locator('[data-guide="perfumes-edit"]').click();
    await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
    check((await page.locator('[data-guide="perfume-name"]').inputValue()) === NAME, "edit dialog is prefilled with the name");
    check((await page.locator('[data-guide="perfume-size-price"]').count()) === 2, "edit dialog restores both size rows");
    await page.locator('[data-guide="perfume-size-price"]').first().fill("175");
    resetRequests();
    await saveDialog("Saved.");
    check(reqCount("PUT", `/api/admin/perfumes/${created ? created.id : "x"}`) === 1, "edit issues one PUT", JSON.stringify(requests.filter((r) => r.method === "PUT")));
    const edited = await waitFor(async () => {
      const rec = await createdByName(NAME);
      return rec && rec.fromPrice === 175 ? rec : null;
    });
    check(Boolean(edited), "overlay fromPrice is 175 after the edit", edited && String(edited.fromPrice));
    check(edited && edited.sizes.some((s) => s.price === 175), "the edited size row is persisted");

    const updatedCell = (await (await adminRow(NAME)).locator("td").nth(6).innerText()).trim();
    check(!/\.\d{5}$|T\d{2}:\d{2}/.test(updatedCell), "Last change is human-formatted, not a raw stamp", updatedCell);
    check(/\d{4}/.test(updatedCell), "Last change still shows a year", updatedCell);

    // Sort by "Recently changed": every name starts with Zzz, so name order
    // would put it last; the just-edited row must be first.
    await page.locator('[data-guide="perfumes-search"]').fill("");
    await page.locator('[data-guide="perfumes-sort"]').selectOption("updated");
    await page.waitForTimeout(300);
    const firstUpdated = (await page.locator('[data-guide="perfumes-row"]').first().innerText()).replace(/\s+/g, " ");
    check(firstUpdated.includes(NAME), "Recently changed sort puts the just-edited row first", firstUpdated.slice(0, 90));
    await page.locator('[data-guide="perfumes-sort"]').selectOption("name");

    await gotoCollection(NAME);
    check((await page.locator(".shelf").filter({ hasText: NAME }).first().locator(".shelf-price").innerText()).includes("175"), "collection reflects the edited price");

    /* ================================================================== 5 */
    log("5: duplicate copies the row (including its PNG)");
    await gotoAdmin();
    await searchAdmin(NAME);
    row = await adminRow(NAME);
    await row.locator('[data-guide="perfumes-duplicate"]').click();
    await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
    const dupName = await page.locator('[data-guide="perfume-name"]').inputValue();
    check(dupName.includes("(copy)"), "duplicate dialog suggests a '(copy)' name", dupName);
    resetRequests();
    await saveDialog("Perfume duplicated.");
    check(reqCount("POST", "/api/admin/perfumes") === 0, "duplicate uses its own endpoint", `create POSTs=${reqCount("POST", "/api/admin/perfumes")}`);
    const dup = await waitFor(async () => {
      const ov = await catalogue();
      return (ov.created || []).find((r) => r.name === dupName) || null;
    });
    check(Boolean(dup), "duplicated perfume appears in the overlay");
    check(Boolean(dup && dup.imagePath && dup.imagePath.startsWith("/api/perfume-images/")), "duplicate keeps the uploaded PNG", dup && dup.imagePath);

    /* ================================================================== 6 */
    log("6: delete is soft, the storefront hides it, restore brings it back, purge is final");
    await searchAdmin(NAME);
    row = await adminRow(NAME);
    resetRequests();
    await row.locator('[data-guide="perfumes-delete"]').click();
    await page.waitForSelector('[data-guide="perfumes-deleted"]', { timeout: 15000 });
    check(reqCount("DELETE", `/api/admin/perfumes/${created ? created.id : "x"}`) === 1, "delete issues one DELETE");
    check(dialogs.some((d) => d.includes("Remove this perfume")), "delete asks for confirmation", JSON.stringify(dialogs.slice(-2)));
    const afterDelete = await waitFor(async () => {
      const ov = await catalogue();
      return (ov.deleted || []).includes(created ? created.id : "?");
    });
    check(Boolean(afterDelete), "overlay lists the id as deleted");
    await gotoCollection(NAME);
    const namesAfterDelete = await cardNames();
    check(!namesAfterDelete.includes(NAME), "deleted perfume disappears from collection", namesAfterDelete.slice(0, 3).join(" | "));

    await gotoAdmin();
    await page.waitForSelector('[data-guide="perfumes-deleted"]', { timeout: 15000 });
    resetRequests();
    await page.locator('[data-guide="perfumes-restore"]').first().click();
    await page.waitForSelector('[data-guide="perfumes-deleted"]', { state: "detached", timeout: 15000 });
    check(reqCount("POST", `/api/admin/perfumes/${created ? created.id : "x"}/restore`) === 1, "restore issues one POST");
    const restored = await waitFor(async () => {
      const ov = await catalogue();
      return !(ov.deleted || []).includes(created ? created.id : "?");
    });
    check(Boolean(restored), "overlay no longer lists it as deleted");
    await gotoCollection(NAME);
    const namesAfterRestore = await cardNames();
    check(namesAfterRestore.includes(NAME), "restored perfume returns to collection", namesAfterRestore.slice(0, 3).join(" | "));

    // Purge the duplicate, proving the permanent path removes both row and bytes.
    await gotoAdmin();
    await searchAdmin(dupName);
    row = await adminRow(dupName);
    await row.locator('[data-guide="perfumes-delete"]').click();
    await page.waitForSelector('[data-guide="perfumes-deleted"]', { timeout: 15000 });
    resetRequests();
    await page.locator('[data-guide="perfumes-purge"]').first().click();
    await page.waitForSelector('[data-guide="perfumes-deleted"]', { state: "detached", timeout: 15000 });
    check(
      requests.some((r) => r.method === "DELETE" && r.path === `/api/admin/perfumes/${dup ? dup.id : "x"}` && r.search.includes("purge=1")),
      "purge is a DELETE with ?purge=1",
      JSON.stringify(requests.filter((r) => r.method === "DELETE")),
    );
    const purged = await waitFor(async () => {
      const ov = await catalogue();
      return !(ov.created || []).some((r) => r.name === dupName) && !(ov.deleted || []).includes(dup ? dup.id : "?");
    });
    check(Boolean(purged), "purged duplicate is gone from both created and deleted views");

    /* ================================================================== 7 */
    log("7: bulk actions, selection scope and the pager");
    await gotoAdmin();
    await page.locator('[data-guide="perfumes-search"]').fill("");
    await page.locator('[data-guide="perfumes-status"]').selectOption("all");
    const firstCheckbox = page.locator('[data-guide="perfumes-select"]').first();
    await firstCheckbox.check();
    await page.waitForSelector('[data-guide="perfumes-bulk"]', { timeout: 5000 });
    check(true, "bulk bar appears with a selection");
    await page.locator('[data-guide="perfumes-status"]').selectOption("out");
    await page.waitForTimeout(300);
    const hiddenSelection = await page.locator('[data-guide="perfumes-bulk"]').count();
    check(hiddenSelection === 0, "changing a filter clears the now-hidden selection", `bulk bar still shows ${hiddenSelection}`);
    await page.locator('[data-guide="perfumes-status"]').selectOption("all");
    await page.waitForTimeout(300);

    await page.locator('[data-guide="perfumes-select-all"]').check();
    await page.waitForSelector('[data-guide="perfumes-bulk"]', { timeout: 5000 });
    check((await page.locator('[data-guide="perfumes-bulk"]').innerText()).includes("10 selected"), "select-all selects the ten visible rows");
    resetRequests();
    await page.locator('[data-guide="perfumes-bulk-out"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-guide="perfumes-bulk"]'), { timeout: 15000 });
    const bulkCalls = requests.filter((r) => r.method === "POST" && r.path === "/api/admin/perfumes/bulk");
    check(bulkCalls.length === 1, "ten rows -> one bulk POST", String(bulkCalls.length));
    check(Boolean(bulkCalls[0] && bulkCalls[0].postData && JSON.parse(bulkCalls[0].postData).ids.length === 10), "bulk body carries ten ids");
    check((await page.locator('[data-guide="perfumes-bulk"]').count()) === 0, "bulk bar retires after the change");
    const bulkState = await waitFor(async () => {
      const ov = await catalogue();
      const outs = (ov.updated || []).filter((u) => u.available === false).length;
      return outs >= 10 ? outs : null;
    });
    check(Boolean(bulkState), "overlay has at least ten out-of-stock overrides", String(bulkState));

    check((await page.locator('[data-guide="perfumes-pager"]').count()) === 1, "pager is shown for the full catalogue");
    const pageLabel = await page.locator('[data-guide="perfumes-pager"]').innerText();
    check(/Page 1 of \d+/.test(pageLabel.replace(/\s+/g, " ")), "pager shows the current page", pageLabel.replace(/\s+/g, " ").slice(0, 80));
    await page.locator('[data-guide="perfumes-pager"] button').last().click();
    await page.waitForTimeout(250);
    const page2 = await page.locator('[data-guide="perfumes-pager"]').innerText();
    check(/Page 2 of/.test(page2.replace(/\s+/g, " ")), "next page advances the pager", page2.replace(/\s+/g, " ").slice(0, 80));
    await page.locator('[data-guide="perfumes-pager"] button').first().click();
    await page.waitForTimeout(200);

    /* ================================================================== 8 */
    log("8: duplicate name is refused visibly (server 409 inside the dialog)");
    const staticRows = require(path.join(REPO, "public", "data", "fragrances.json"));
    const existingName = staticRows[0].name;
    await gotoAdmin();
    await openAdd();
    await fillBasics({ name: existingName, brand: "Audit Duplicate", price: "90" });
    await pickPng();
    resetRequests();
    await page.locator('[data-guide="perfume-save"]').click();
    const dupErr = page.locator('[data-guide="perfume-form"] .admin-error, .admin-modal .admin-error').first();
    await dupErr.waitFor({ timeout: 15000 });
    const dupErrText = (await dupErr.innerText()).trim();
    check(/already exists/i.test(dupErrText), "duplicate-name 409 is shown inside the dialog", dupErrText);
    check(reqCount("POST", "/api/admin/perfumes") === 1, "the server was asked exactly once");
    check(await page.locator('[data-guide="perfume-form"]').isVisible(), "the dialog stays open so the name can be fixed");
    const liveRole = await dupErr.evaluate((el) => ({ role: el.getAttribute("role"), live: el.getAttribute("aria-live") }));
    check(liveRole.role === "alert" || Boolean(liveRole.live), "dialog error is announced as a live region", JSON.stringify(liveRole));
    await closeDialog();

    /* ================================================================== 9 */
    log("9: create without a PNG is refused client-side with a visible message");
    await openAdd();
    await fillBasics({ name: `Zzz No Image ${Date.now().toString(36)}`, brand: "Audit No Image", price: "80" });
    resetRequests();
    await page.locator('[data-guide="perfume-save"]').click();
    const noImgErr = page.locator('[data-guide="perfume-form"] .admin-error, .admin-modal .admin-error').first();
    let noImgVisible = false;
    try {
      await noImgErr.waitFor({ timeout: 2500 });
      noImgVisible = /png/i.test(await noImgErr.innerText());
    } catch {
      noImgVisible = false;
    }
    check(noImgVisible, "a create without a picture explains that a PNG is required");
    check(reqCount("POST", "/api/admin/perfumes") === 0, "no pointless 400 round-trip for a missing image", `POSTs=${reqCount("POST", "/api/admin/perfumes")}`);
    await closeDialog();

    /* ================================================================= 10 */
    log("10: invalid price/year surface inside the dialog, not behind it");
    await openAdd();
    await fillBasics({ name: `Zzz Bad Price ${Date.now().toString(36)}`, brand: "Audit Bad Price", price: "0" });
    await pickPng();
    await page.locator('[data-guide="perfume-save"]').click();
    const priceErr = page.locator('[data-guide="perfume-form"] .admin-error, .admin-modal .admin-error').first();
    await priceErr.waitFor({ timeout: 15000 });
    check(/between 0\.01 and/i.test(await priceErr.innerText()), "zero price shows the server rule inside the dialog", (await priceErr.innerText()).trim());
    await page.locator('[data-guide="perfume-size-price"]').first().fill("70");
    await page.locator('[data-guide="perfume-year"]').fill("1700");
    await page.locator('[data-guide="perfume-save"]').click();
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-guide="perfume-form"] .admin-error, .admin-modal .admin-error');
        return el && /year must be/i.test(el.textContent || "");
      },
      { timeout: 15000 },
    );
    check(true, "out-of-range year shows the server rule inside the dialog");
    await closeDialog();

    /* ================================================================= 11 */
    log("11: HTML in a name stays inert text (XSS) and long text does not break layout");
    const XSS_NAME = '<img src=x onerror="window.__xss=1"> Audit';
    await openAdd();
    await fillBasics({ name: XSS_NAME, brand: "XSS House", price: "10" });
    await pickPng();
    await saveDialog("Perfume added to the collection.");
    const xssRec = await waitFor(() => createdByName(XSS_NAME));
    check(Boolean(xssRec), "HTML-looking name is stored as a normal record");
    await gotoCollection(XSS_NAME);
    const xssCard = page.locator(".shelf").filter({ hasText: XSS_NAME }).first();
    await xssCard.waitFor({ timeout: 15000 });
    const xssState = await page.evaluate(() => ({
      executed: typeof window.__xss !== "undefined",
      h3Children: document.querySelectorAll(".shelf-body h3 img, .shelf-body h3 b, .shelf-body h3 script").length,
      h3Html: (document.querySelector(".shelf-body h3") || {}).innerHTML || "",
    }));
    check(!xssState.executed, "onerror payload never executes");
    check(xssState.h3Children === 0, "no element is injected into the card heading", xssState.h3Html.slice(0, 90));
    check(xssState.h3Html.includes("&lt;img"), "the payload is rendered as escaped text", xssState.h3Html.slice(0, 90));

    const LONG_NAME = `Long ${"x".repeat(110)}`;
    const LONG_BRAND = `Brand ${"y".repeat(108)}`;
    await gotoAdmin();
    await openAdd();
    await fillBasics({ name: LONG_NAME, brand: LONG_BRAND, price: "42" });
    await pickPng();
    await saveDialog("Perfume added to the collection.");
    check(Boolean(await waitFor(() => createdByName(LONG_NAME))), "120-character name/brand is accepted and capped");
    await searchAdmin("Long xxx");
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(300);
    const longAdmin = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      view: window.innerWidth,
      wrap: document.querySelector('[data-guide="perfumes-table"]')?.getBoundingClientRect().right || 0,
    }));
    check(longAdmin.doc <= longAdmin.view + 1, "long name does not widen the 320px admin page", JSON.stringify(longAdmin));
    check(longAdmin.wrap <= longAdmin.view + 1, "the table wrapper stays inside the 320px viewport", JSON.stringify(longAdmin));
    await gotoCollection(LONG_NAME);
    const longCardLayout = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      view: window.innerWidth,
      card: document.querySelector(".shelf")?.getBoundingClientRect().right || 0,
      brand: document.querySelector(".shelf-brand")?.scrollWidth || 0,
      brandBox: document.querySelector(".shelf-brand")?.clientWidth || 0,
    }));
    check(longCardLayout.doc <= longCardLayout.view + 1, "long brand does not widen the 320px collection page", JSON.stringify(longCardLayout));
    check(longCardLayout.card <= longCardLayout.view + 1, "the card stays inside the viewport", JSON.stringify(longCardLayout));
    check(longCardLayout.brand <= longCardLayout.brandBox + 1, "long brand text is contained inside its card box", JSON.stringify(longCardLayout));
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Purge both audit rows so the responsive matrix starts from a clean page.
    for (const name of [XSS_NAME, LONG_NAME]) {
      await gotoAdmin();
      await searchAdmin(name);
      const r = await adminRow(name);
      await r.locator('[data-guide="perfumes-delete"]').click();
      await page.waitForSelector('[data-guide="perfumes-deleted"]', { timeout: 15000 });
      await page.locator('[data-guide="perfumes-purge"]').first().click();
      await page.waitForSelector('[data-guide="perfumes-deleted"]', { state: "detached", timeout: 15000 });
    }

    /* ================================================================= 12 */
    log("12: double submit is collapsed and the Save button is actually disabled while in flight");
    const BUSY_NAME = `Zzz Busy ${Date.now().toString(36)}`;
    await gotoAdmin();
    await page.route(
      (url) => url.pathname === "/api/admin/perfumes",
      async (route) => {
        if (route.request().method() === "POST") await wait(700);
        await route.continue();
      },
    );
    await openAdd();
    await fillBasics({ name: BUSY_NAME, brand: "Audit Busy", price: "55" });
    await pickPng();
    resetRequests();
    await page.evaluate(() => {
      /* Native click() runs the button's activation behaviour (form submit);
         dispatchEvent(new MouseEvent(...)) does not, so it never exercised the
         real double-submit path. */
      const btn = document.querySelector('[data-guide="perfume-save"]');
      btn.click();
      btn.click();
    });
    await page.waitForTimeout(250);
    const inFlightUi = await page.evaluate(() => ({
      disabled: document.querySelector('[data-guide="perfume-save"]')?.disabled,
      ariaBusy: document.querySelector('[data-guide="perfume-form"]')?.getAttribute("aria-busy"),
    }));
    check(inFlightUi.disabled === true, "Save is disabled while the upload is in flight", JSON.stringify(inFlightUi));
    check(inFlightUi.ariaBusy === "true", "the form announces aria-busy while saving", JSON.stringify(inFlightUi));
    /* The double click already submitted; clicking again here would (correctly)
       block on the disabled button. Wait for the post-save notice instead. */
    await page.waitForFunction(
      (needle) => document.body.innerText.includes(needle),
      "Perfume added to the collection.",
      { timeout: 20000 },
    );
    check(reqCount("POST", "/api/admin/perfumes") === 1, "two same-tick clicks produce one create", `POSTs=${reqCount("POST", "/api/admin/perfumes")}`);
    await page.unrouteAll({ behavior: "wait" });
    const busyRec = await waitFor(() => createdByName(BUSY_NAME));
    if (busyRec) {
      await gotoAdmin();
      await searchAdmin(BUSY_NAME);
      await (await adminRow(BUSY_NAME)).locator('[data-guide="perfumes-delete"]').click();
      await page.waitForSelector('[data-guide="perfumes-deleted"]', { timeout: 15000 });
      await page.locator('[data-guide="perfumes-purge"]').first().click();
      await page.waitForSelector('[data-guide="perfumes-deleted"]', { state: "detached", timeout: 15000 });
    }

    /* ================================================================= 13 */
    log("13: accessibility — names, th scope, dialog focus, Escape restore");
    await gotoAdmin();
    const unnamed = await page.evaluate(() => {
      const controls = [...document.querySelectorAll(".perfumes input, .perfumes select, .perfumes textarea")];
      return controls
        .filter((el) => el.type !== "hidden")
        .filter((el) => {
          const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          const labelled = el.labels && el.labels.length > 0;
          return !aria && !labelled;
        })
        .map((el) => `${el.tagName.toLowerCase()}[type=${el.type || ""}][data-guide=${el.getAttribute("data-guide") || ""}]`);
    });
    check(unnamed.length === 0, "every admin control has an accessible name", unnamed.join(", "));
    const missingScope = await page.evaluate(
      () => [...document.querySelectorAll(".perfumes th")].filter((th) => th.getAttribute("scope") !== "col").length,
    );
    check(missingScope === 0, "every perfumes table header declares scope=col", `${missingScope} missing`);

    await page.locator('[data-guide="perfumes-add"]').click();
    await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
    await page.waitForTimeout(200);
    const dialogUnnamed = await page.evaluate(() => {
      const controls = [...document.querySelectorAll(".admin-modal input, .admin-modal select, .admin-modal textarea")];
      return controls
        .filter((el) => el.type !== "hidden")
        .filter((el) => {
          const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          const labelled = el.labels && el.labels.length > 0;
          return !aria && !labelled;
        })
        .map((el) => `${el.tagName.toLowerCase()}[type=${el.type || ""}]`);
    });
    check(dialogUnnamed.length === 0, "every dialog control has an accessible name", dialogUnnamed.join(", "));
    const initialFocus = await page.evaluate(() => document.activeElement && document.activeElement.className);
    check(String(initialFocus).includes("admin-x"), "dialog puts focus on the close button", String(initialFocus));
    let trapped = true;
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.querySelector(".admin-modal-card")?.contains(document.activeElement));
      if (!inside) {
        trapped = false;
        break;
      }
    }
    check(trapped, "Tab keeps focus inside the dialog");
    let trappedBack = true;
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press("Shift+Tab");
      const inside = await page.evaluate(() => !!document.querySelector(".admin-modal-card")?.contains(document.activeElement));
      if (!inside) {
        trappedBack = false;
        break;
      }
    }
    check(trappedBack, "Shift+Tab keeps focus inside the dialog");
    await closeDialog();
    await page.waitForTimeout(150);
    const restoredFocus = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-guide"));
    check(restoredFocus === "perfumes-add", "Escape returns focus to the Add button", String(restoredFocus));

    /* ================================================================= 14 */
    log("14: admin inventory outage keeps the tab usable (stale banner + retry)");
    await page.route("**/api/admin/perfumes", (route) => route.abort());
    await page.goto(ADMIN, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-stale"]', { timeout: 15000 });
    check(true, "failed inventory load shows the stale banner");
    check(await page.locator('[data-guide="perfumes-refresh"]').isVisible(), "stale banner offers a retry button");
    /* The catalogue is local, so the table keeps rendering the static rows —
       that is the point of the banner. What must NOT appear is overlay state
       (an "Added by you" row) the server never returned. */
    const offlineSources = await page.evaluate(() =>
      [...document.querySelectorAll('[data-guide="perfumes-row"]')].map((tr) => tr.querySelector(".admin-pill")?.textContent || ""),
    );
    check(offlineSources.length > 0, "the static catalogue still renders during the outage", String(offlineSources.length));
    check(offlineSources.every((s) => !/added by you|modifi/i.test(s)), "no invented overlay rows during the outage", offlineSources.slice(0, 3).join(" | "));
    await page.unroute("**/api/admin/perfumes");
    await page.locator('[data-guide="perfumes-refresh"]').click();
    await page.waitForSelector('[data-guide="perfumes-stale"]', { state: "detached", timeout: 15000 });
    check((await page.locator('[data-guide="perfumes-stale"]').count()) === 0, "retry clears the stale banner");
    check((await page.locator(".admin-error").count()) === 0, "retry clears the error banner");

    /* ================================================================= 15 */
    log("15: an offline overlay never breaks the static storefront");
    const beforeOfflineErrors = pageErrors.length;
    await page.route("**/api/catalog/overlay", (route) => route.abort());
    await page.goto(COLLECTION, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".shelf", { timeout: 20000 });
    const offlineCards = await page.locator(".shelf").count();
    check(offlineCards > 0, "collection still renders the static catalogue with the overlay offline", String(offlineCards));
    check(pageErrors.length === beforeOfflineErrors, "overlay failure adds no uncaught page error", pageErrors.slice(beforeOfflineErrors).join(" | "));
    await page.unroute("**/api/catalog/overlay");

    /* ================================================================= 16 */
    log("16: responsive matrix (no page overflow, contained table, fitting dialog)");
    const viewports = [
      [320, 568], [360, 640], [390, 844], [414, 896], [480, 800], [600, 800],
      [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1280, 800], [1440, 900], [1920, 1080],
    ];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await gotoAdmin();
      const m = await page.evaluate((vw) => {
        const doc = document.documentElement;
        const toolbar = document.querySelector(".perf-toolbar");
        const children = toolbar ? [...toolbar.children] : [];
        const out = children
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0)
          .map((r) => ({ left: r.left, right: r.right }));
        const wrap = document.querySelector('[data-guide="perfumes-table"]');
        const thead = wrap ? wrap.querySelector("thead") : null;
        const firstRow = document.querySelector('[data-guide="perfumes-table"] tbody tr');
        return {
          vw,
          docW: doc.scrollWidth,
          bodyW: document.body.scrollWidth,
          overflow: doc.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1,
          toolbarOutside: out.filter((r) => r.left < -1 || r.right > vw + 1).length,
          wrapRight: wrap ? wrap.getBoundingClientRect().right : 0,
          wrapLeft: wrap ? wrap.getBoundingClientRect().left : 0,
          wrapOverflowX: wrap ? getComputedStyle(wrap).overflowX : "",
          stacked: firstRow ? ["block", "flex", "grid"].includes(getComputedStyle(firstRow).display) && (!thead || getComputedStyle(thead).display === "none") : false,
          stackedWidth: firstRow ? Math.round(firstRow.getBoundingClientRect().width) : 0,
        };
      }, width);
      check(!m.overflow, `${width}px: page has no horizontal overflow`, JSON.stringify(m));
      check(m.toolbarOutside === 0, `${width}px: toolbar controls stay inside the viewport`, JSON.stringify(m));
      check(m.wrapRight <= width + 1 && m.wrapLeft >= -1, `${width}px: table wrapper fits the viewport`, JSON.stringify(m));
      if (width <= 1100) {
        // Stacked rows instead of a sideways-scrolling 1000px table.
        check(m.stacked, `${width}px: table renders as stacked cards`, String(m.stacked));
        check(m.stackedWidth <= width, `${width}px: stacked row fits the viewport`, String(m.stackedWidth));
      } else {
        check(m.wrapOverflowX === "auto" || m.wrapOverflowX === "scroll", `${width}px: the wide table owns its own scroll`, m.wrapOverflowX);
      }

      // Bulk bar + tap targets on the narrow viewports.
      if (width <= 480) {
        await page.locator('[data-guide="perfumes-select"]').first().check();
        await page.waitForSelector('[data-guide="perfumes-bulk"]', { timeout: 5000 });
        const bulk = await page.evaluate((vw) => {
          const el = document.querySelector('[data-guide="perfumes-bulk"]');
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, vw };
        }, width);
        check(bulk.left >= -1 && bulk.right <= width + 1, `${width}px: bulk bar fits the viewport`, JSON.stringify(bulk));
        await page.locator('[data-guide="perfumes-select"]').first().uncheck();

        const targets = await page.evaluate(() => {
          const els = [
            ...document.querySelectorAll(".perfumes .admin-mini, .perfumes .btn-accent, .perfumes select"),
          ].filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
          return els.map((el) => {
            const r = el.getBoundingClientRect();
            return { tag: el.tagName, cls: el.className, w: r.width, h: r.height };
          });
        });
        const small = targets.filter((t) => Math.min(t.w, t.h) < 24);
        check(small.length === 0, `${width}px: interactive targets are at least 24px`, JSON.stringify(small.slice(0, 4)));
      }

      // Dialog fit, single-column form and size-row containment.
      if ([320, 390, 480, 600, 768, 1024, 1440].includes(width)) {
        await page.locator('[data-guide="perfumes-add"]').click();
        await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
        await page.waitForTimeout(150);
        const d = await page.evaluate((vw) => {
          const card = document.querySelector(".admin-modal-card").getBoundingClientRect();
          const grid = document.querySelector(".perf-form-grid");
          const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
          const rows = [...document.querySelectorAll(".perf-size-row")].map((el) => ({
            scroll: el.scrollWidth,
            client: el.clientWidth,
          }));
          return {
            vw,
            left: card.left,
            right: card.right,
            top: card.top,
            bottom: card.bottom,
            cols,
            rows,
          };
        }, width);
        check(d.left >= -1 && d.right <= width + 1 && d.top >= -1 && d.bottom <= height + 1, `${width}px: dialog card fits the viewport`, JSON.stringify(d));
        check(d.cols === (width <= 720 ? 1 : 2), `${width}px: form uses ${width <= 720 ? "one" : "two"} column(s)`, `cols=${d.cols}`);
        check(d.rows.every((r) => r.scroll <= r.client + 1), `${width}px: size rows do not overflow horizontally`, JSON.stringify(d.rows));
        await closeDialog();
      }
      if (width === 320 || width === 1440) {
        await page.screenshot({ path: path.join(__dirname, `perfume-admin-audit-${width}.png`), fullPage: false });
      }
    }

    /* ================================================================= 17 */
    log("17: Arabic RTL keeps the same geometry");
    await page.setViewportSize({ width: 360, height: 640 });
    await page.evaluate(() => localStorage.setItem("charme-lang", "ar"));
    await page.goto(ADMIN, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
    await page.waitForTimeout(250);
    check((await page.evaluate(() => document.documentElement.dir)) === "rtl", "Arabic switches the document to RTL");
    check((await page.locator('[data-guide="perfumes-add"]').innerText()).includes("أضِف"), "Arabic tab copy renders");
    const rtl = await page.evaluate(() => {
      const doc = document.documentElement;
      const kids = [...document.querySelectorAll(".perf-toolbar > *")].map((el) => el.getBoundingClientRect());
      return {
        docW: doc.scrollWidth,
        vw: innerWidth,
        outside: kids.filter((r) => r.left < -1 || r.right > innerWidth + 1).length,
      };
    });
    check(rtl.docW <= rtl.vw + 1, "RTL page has no horizontal overflow", JSON.stringify(rtl));
    check(rtl.outside === 0, "RTL toolbar stays inside the viewport", JSON.stringify(rtl));
    await page.screenshot({ path: path.join(__dirname, "perfume-admin-audit-rtl.png") });
    await page.evaluate(() => localStorage.setItem("charme-lang", "en"));

    /* ================================================================= 18 */
    log("18: server contract odds and ends");
    const cap = Array.from({ length: 201 }, (_, i) => `cap-${i}`);
    const tooMany = await raw("POST", "/api/admin/perfumes/bulk", { token: TOKEN, body: { ids: cap, available: 0 } });
    check(tooMany.status === 400 && /200/.test(tooMany.data.error || ""), "bulk is capped at 200 ids", JSON.stringify(tooMany.data));
    const badId = await raw("PATCH", "/api/admin/perfumes/..%2Fetc%2Fpasswd", { token: TOKEN, body: { available: 0 } });
    check(badId.status === 400 || badId.status === 404, "path-traversal id is rejected", String(badId.status));
    const overlayCounts = (await catalogue()).counts || {};
    check(typeof overlayCounts.created === "number" && typeof overlayCounts.updated === "number" && typeof overlayCounts.deleted === "number", "overlay publishes created/updated/deleted counts", JSON.stringify(overlayCounts));

    /* ================================================================= 19 */
    log("19: no uncaught page errors across the whole audit");
    check(pageErrors.length === 0, "browser reported no page/console errors", pageErrors.slice(0, 6).join(" | "));

    await browser.close();
    stopServer();

    log(`\n${checks} checks, ${failures.length} failure(s), ${warnings.length} warning(s)`);
    if (warnings.length) {
      log("WARNINGS:");
      warnings.forEach((w) => log(`  - ${w}`));
    }
    if (failures.length) {
      log("FAILURES:");
      failures.forEach((f) => log(`  - ${f}`));
      process.exitCode = 1;
    } else {
      log("ALL AUDIT CHECKS PASSED");
    }
  } catch (err) {
    log(`\nAUDIT CRASHED: ${err && err.stack ? err.stack : err}`);
    try {
      await page.screenshot({ path: path.join(__dirname, "perfume-admin-audit-crash.png"), fullPage: false });
    } catch {
      /* page may be gone */
    }
    log("\n--- last server output ---\n" + serverLog.slice(-3000));
    await browser.close().catch(() => {});
    stopServer();
    process.exit(1);
  }
})().catch((err) => {
  log(`FAILED TO START: ${err && err.stack ? err.stack : err}`);
  log(serverLog.slice(-3000));
  stopServer();
  process.exit(1);
});
