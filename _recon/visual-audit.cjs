#!/usr/bin/env node
"use strict";
/* Visual capture pass: real server, real admin JWT, real browser.
   Writes full-page PNGs for the admin tab, its dialog, and the storefront
   surfaces the admin writes into. */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const PW = "C:/Users/cheri/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright";
const CHROME = "C:/Users/cheri/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";
const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "_recon", "visual");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 42100 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = "charme-visual-secret-0123456789abcdef";
const DB_PATH = path.join(os.tmpdir(), `charme-visual-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = "";
process.env.SQLITE_PATH = DB_PATH;
process.env.JWT_SECRET = SECRET;
const db = require(path.join(REPO, "db.js"));
const jwt = require(path.join(REPO, "node_modules", "jsonwebtoken"));
const TOKEN = jwt.sign({ userId: 1, email: "visual@example.test" }, SECRET, { expiresIn: "2h" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1440, 1920];

(async () => {
  await db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, is_admin INTEGER DEFAULT 0, is_banned INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.run("INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (1, 'Visual', 'Admin', 'visual@example.test', 'x', 1)");
  const child = spawn(process.execPath, ["server.js"], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: "", SQLITE_PATH: DB_PATH, JWT_SECRET: SECRET, PORT: String(PORT), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 200; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {}
    await wait(150);
  }
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const shoot = async (page, name, fullPage = true) => {
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage });
    console.log("shot", path.relative(REPO, file));
  };
  const newPage = async (width, height = 900, lang = "en") => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript(({ t, l }) => {
      localStorage.setItem("charme-token", t);
      localStorage.setItem("charme-lang", l);
    }, { t: TOKEN, l: lang });
    const page = await context.newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR", width, e.message));
    return { context, page };
  };

  /* ---------------- admin: list at every width ---------------- */
  for (const w of WIDTHS) {
    const { context, page } = await newPage(w, 900);
    await page.goto(`${BASE}/app/admin?tab=perfumes`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await shoot(page, `admin-list-${w}`);
    await context.close();
  }

  /* ---------------- admin: dialog at key widths ---------------- */
  for (const w of [320, 375, 768, 1440]) {
    const { context, page } = await newPage(w, 900);
    await page.goto(`${BASE}/app/admin?tab=perfumes`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
    await page.locator('[data-guide="perfumes-add"]').click();
    await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 15000 });
    await page.waitForTimeout(600);
    await shoot(page, `admin-dialog-${w}`);
    await context.close();
  }

  /* ---------------- admin: RTL Arabic ---------------- */
  for (const w of [320, 1440]) {
    const { context, page } = await newPage(w, 900, "ar");
    await page.goto(`${BASE}/app/admin?tab=perfumes`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await shoot(page, `admin-rtl-${w}`);
    await context.close();
  }

  /* ---------------- storefront surfaces ---------------- */
  const seed = await fetch(`${BASE}/api/health`).catch(() => null);
  for (const w of [320, 768, 1440]) {
    const { context, page } = await newPage(w, 900);
    await page.goto(`${BASE}/app/collection`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".shelf", { timeout: 30000 });
    await page.waitForTimeout(1000);
    await shoot(page, `collection-${w}`);
    const href = await page.locator(".shelf").first().getAttribute("href");
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1000);
      await shoot(page, `product-${w}`);
    }
    await context.close();
  }

  /* ---------------- admin shell: other tabs at 320/1440 ---------------- */
  for (const tab of ["overview", "users", "loyalty", "news", "hours", "notes"]) {
    for (const w of [320, 1440]) {
      const { context, page } = await newPage(w, 900);
      await page.goto(`${BASE}/app/admin?tab=${tab}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1200);
      await shoot(page, `admin-${tab}-${w}`);
      await context.close();
    }
  }

  console.log("SERVER TAIL", log.slice(-400));
  await browser.close();
  child.kill("SIGKILL");
})().catch((e) => { console.error(e); process.exit(1); });
