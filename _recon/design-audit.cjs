#!/usr/bin/env node
"use strict";
/* Numeric design audit. No eyeballs required: contrast, type scale, target
   sizes, clipping, overlap, geometry, rhythm. */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const PW = "C:/Users/cheri/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright";
const CHROME = "C:/Users/cheri/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";
const REPO = path.resolve(__dirname, "..");
const PORT = 42300 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = "charme-design-secret-0123456789abcdef";
const DB_PATH = path.join(os.tmpdir(), `charme-design-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = "";
process.env.SQLITE_PATH = DB_PATH;
process.env.JWT_SECRET = SECRET;
const db = require(path.join(REPO, "db.js"));
const jwt = require(path.join(REPO, "node_modules", "jsonwebtoken"));
const TOKEN = jwt.sign({ userId: 1, email: "design@example.test" }, SECRET, { expiresIn: "2h" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1440, 1920];

const AUDIT = () => {
  const parseColor = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const contrast = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const bgOf = (el) => {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement) {
      const c = parseColor(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) {
        acc = acc == null ? c : blend(acc, c);
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    const base = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    return acc ? blend(acc, base.a >= 1 ? base : { r: 255, g: 255, b: 255, a: 1 }) : base;
  };
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const name = (el) => {
    const cls = typeof el.className === "string" ? el.className : "";
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  };
  const res = {
    vw: innerWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    contrast: [],
    tinyText: [],
    smallTargets: [],
    clipped: [],
    overlaps: [],
    tinyTap: [],
    docHeight: document.documentElement.scrollHeight,
  };
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("script,style,svg")) continue;
    if (!isVisible(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();

    /* text nodes only: an element is a text carrier if it has a direct text child */
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (hasText) {
      const fg = parseColor(cs.color);
      if (fg) {
        const eff = fg.a < 1 ? blend(fg, bgOf(el)) : fg;
        const ratio = contrast(eff, bgOf(el));
        const size = parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const min = large ? 3 : 4.5;
        if (ratio < min - 0.01) {
          const key = name(el) + "|" + Math.round(ratio * 10);
          if (!seen.has(key)) {
            seen.add(key);
            res.contrast.push({ el: name(el), ratio: Math.round(ratio * 100) / 100, min, size, color: cs.color, bg: `rgb(${Math.round(bgOf(el).r)},${Math.round(bgOf(el).g)},${Math.round(bgOf(el).b)})`, text: el.textContent.trim().slice(0, 40) });
          }
        }
      }
      const size = parseFloat(cs.fontSize);
      if (size < 11.5) {
        const key = "t" + name(el) + "|" + size;
        if (!seen.has(key)) {
          seen.add(key);
          res.tinyText.push({ el: name(el), size: Math.round(size * 100) / 100, text: el.textContent.trim().slice(0, 40) });
        }
      }
    }

    if (el.matches("a, button, input, select, textarea, [role=button], [tabindex]")) {
      if (el.type === "hidden") continue;
      const target = el.matches("a, button, [role=button]") || el.type === "checkbox" || el.type === "radio" || el.type === "file";
      if (target) {
        const minT = 24;
        if (r.height < minT - 0.5 || r.width < minT - 0.5) {
          const key = "s" + name(el) + "|" + Math.round(r.width) + "x" + Math.round(r.height);
          if (!seen.has(key)) {
            seen.add(key);
            res.smallTargets.push({ el: name(el), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || el.value || "").trim().slice(0, 30), minBlock: cs.minBlockSize, display: cs.display, html: el.outerHTML.slice(0, 160), parent: el.parentElement ? el.parentElement.className : "", parentTag: el.parentElement ? el.parentElement.tagName.toLowerCase() : "", ancestors: (() => { let n = el.parentElement, out = []; while (n && out.length < 4) { out.push(n.tagName.toLowerCase() + (typeof n.className === "string" && n.className ? "." + n.className.trim().split(/\s+/).slice(0, 3).join(".") : "")); n = n.parentElement; } return out.join(" > "); })() });
          }
        }
      }
    }

    if (hasText && r.width > 0 && el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== "ellipsis") {
      const key = "c" + name(el);
      if (!seen.has(key)) {
        seen.add(key);
        res.clipped.push({ el: name(el), client: el.clientWidth, scroll: el.scrollWidth, text: el.textContent.trim().slice(0, 40) });
      }
    }
    if (r.right > innerWidth + 1 || r.left < -1) {
      const key = "o" + name(el) + Math.round(r.left) + Math.round(r.right);
      if (!seen.has(key)) {
        seen.add(key);
        res.clipped.push({ el: name(el), kind: "offscreen", left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent || "").trim().slice(0, 30) });
      }
    }
  }

  /* overlap of interactive siblings in the same container */
  const targets = [...document.querySelectorAll("a, button, [role=button]")].filter(isVisible);
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i], b = targets[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (a.parentElement !== b.parentElement) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      if (ix > 4 && iy > 4) res.overlaps.push({ a: name(a), b: name(b), area: Math.round(ix * iy) });
    }
  }

  /* rhythm: horizontal paddings/margins that are not 2px-aligned */
  const off = new Set();
  for (const el of document.querySelectorAll(".admin-page *, .collection *, .pdp-main *")) {
    const cs = getComputedStyle(el);
    for (const prop of ["paddingTop", "paddingLeft", "marginTop", "marginLeft", "gap"]) {
      const v = parseFloat(cs[prop]);
      if (Number.isFinite(v) && v > 0 && Math.abs(v - Math.round(v / 2) * 2) > 0.6) off.add(`${prop}:${v}`);
    }
  }
  res.offGrid = [...off].slice(0, 20);

  /* dialog specifics */
  const modal = document.querySelector(".admin-modal-card");
  if (modal) {
    const mr = modal.getBoundingClientRect();
    res.dialog = {
      w: Math.round(mr.width), h: Math.round(mr.height),
      top: Math.round(mr.top), bottom: Math.round(mr.bottom),
      fitsV: mr.top >= -1 && mr.bottom <= innerHeight + 1,
      scrolls: modal.scrollHeight > modal.clientHeight + 1,
      footer: (() => { const f = modal.querySelector(".admin-modal-foot"); if (!f) return null; const r = f.getBoundingClientRect(); return { visible: r.top >= 0 && r.bottom <= innerHeight + 1, top: Math.round(r.top), bottom: Math.round(r.bottom) }; })(),
    };
  }

  /* table specifics */
  const table = document.querySelector(".perf-table, .admin-table");
  const wrap = document.querySelector(".admin-table-wrap");
  if (table && wrap) {
    const ths = [...table.querySelectorAll("thead th")].map((th) => ({ w: Math.round(th.getBoundingClientRect().width), text: th.textContent.trim() }));
    res.table = { tableW: Math.round(table.getBoundingClientRect().width), wrapW: Math.round(wrap.getBoundingClientRect().width), scrolls: table.scrollWidth > wrap.clientWidth + 1, ths, rows: table.querySelectorAll("tbody tr").length };
  }
  const rows = [...document.querySelectorAll(".perf-table tbody tr")].slice(0, 3).map((tr) => Math.round(tr.getBoundingClientRect().height));
  res.rowHeights = rows;
  return res;
};

(async () => {
  await db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, is_admin INTEGER DEFAULT 0, is_banned INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.run("INSERT INTO users (id, first_name, last_name, email, password_hash, is_admin) VALUES (1, 'Design', 'Admin', 'design@example.test', 'x', 1)");
  const child = spawn(process.execPath, ["server.js"], { cwd: REPO, env: { ...process.env, DATABASE_URL: "", SQLITE_PATH: DB_PATH, JWT_SECRET: SECRET, PORT: String(PORT), NODE_ENV: "test" }, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; child.stdout.on("data", (d) => (log += d)); child.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 200; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await wait(150); }
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const out = {};
  const newPage = async (width, height = 900, lang = "en", theme = "light") => {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(({ t, l, th }) => { localStorage.setItem("charme-token", t); localStorage.setItem("charme-lang", l); localStorage.setItem("charme-theme", th); }, { t: TOKEN, l: lang, th: theme });
    const page = await context.newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR", width, e.message));
    return { context, page };
  };

  const routes = [
    ["admin", "/app/admin?tab=perfumes", '[data-guide="perfumes-table"] tbody tr'],
    ["collection", "/app/collection", ".shelf"],
  ];
  for (const [label, url, ready] of routes) {
    for (const w of WIDTHS) {
      const { context, page } = await newPage(w);
      await page.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForSelector(ready, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(900);
      out[`${label}-${w}`] = await page.evaluate(AUDIT);
      if (label === "admin") {
        await page.locator('[data-guide="perfumes-add"]').click();
        await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);
        out[`admin-dialog-${w}`] = await page.evaluate(AUDIT);
      }
      await context.close();
    }
  }
  /* product page at 3 widths */
  for (const w of [320, 768, 1440]) {
    const { context, page } = await newPage(w);
    await page.goto(`${BASE}/app/collection`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".shelf", { timeout: 30000 });
    const href = await page.locator(".shelf").first().getAttribute("href");
    await page.goto(`${BASE}${href}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(900);
    out[`product-${w}`] = await page.evaluate(AUDIT);
    await context.close();
  }
  /* other admin tabs at 320 + 1440 */
  for (const tab of ["overview", "users", "loyalty", "news", "hours", "notes"]) {
    for (const w of [320, 1440]) {
      const { context, page } = await newPage(w);
      await page.goto(`${BASE}/app/admin?tab=${tab}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1100);
      out[`admin-${tab}-${w}`] = await page.evaluate(AUDIT);
      await context.close();
    }
  }
  /* night theme: core surfaces at phone / tablet / desktop */
  for (const w of [320, 768, 1440]) {
    const { context, page } = await newPage(w, 900, "en", "night");
    await page.goto(`${BASE}/app/admin?tab=perfumes`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);
    out[`night-admin-${w}`] = await page.evaluate(AUDIT);
    await page.locator('[data-guide="perfumes-add"]').click();
    await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    out[`night-admin-dialog-${w}`] = await page.evaluate(AUDIT);
    await context.close();
  }
  for (const w of [320, 1440]) {
    const { context, page } = await newPage(w, 900, "en", "night");
    await page.goto(`${BASE}/app/collection`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".shelf", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);
    out[`night-collection-${w}`] = await page.evaluate(AUDIT);
    await context.close();
  }
  /* remaining storefront routes, light + night at phone / desktop */
  const EXTRA_ROUTES = [
    ["home", "/"], ["guides", "/guides"], ["contact", "/contact"], ["news", "/news"],
    ["loyalty-page", "/loyalty"], ["auth", "/auth"], ["cart", "/cart"],
    ["favorites", "/favorites"], ["profile", "/profile"],
  ];
  for (const [label, url] of EXTRA_ROUTES) {
    for (const w of [320, 1440]) {
      for (const theme of ["light", "night"]) {
        const { context, page } = await newPage(w, 900, "en", theme);
        await page.goto(`${BASE}/app${url}`, { waitUntil: "load", timeout: 60000 });
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(900);
        out[`${label}-${theme}-${w}`] = await page.evaluate(AUDIT);
        await context.close();
      }
    }
  }
  fs.writeFileSync(path.join(REPO, "_recon", "design-audit.json"), JSON.stringify(out, null, 1));
  console.log("WROTE _recon/design-audit.json", Object.keys(out).length, "views");
  console.log("SERVER TAIL", log.slice(-300));
  await browser.close();
  child.kill("SIGKILL");
})().catch((e) => { console.error(e); process.exit(1); });
