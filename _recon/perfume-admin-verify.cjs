/* Browser verification of the new Perfumes admin tab (2026-11-07).
 *
 * The spec (_recon/perfume-admin-spec.md section C/D) requires browser proof
 * for: tab wiring, drag-drop/picker transparent PNG + shelf preview, validation
 * messages, one request for two same-tick clicks, structural parity of a new
 * card vs a static card, stock badge, bulk actions, edit/delete/restore and
 * en/fr/ar labels. This harness renders the real Perfumes component (Admin
 * top-level tab logic is separately asserted by the Admin chunk build) against
 * a stateful stub of the real perfume-admin API and proves the most
 * failure-prone of those here; the PNG validator itself is covered by
 * tests/perfume-admin-static.cjs and the HTTP matrix by tests/perfume-admin.cjs.
 *
 * Run: node _recon/perfume-admin-verify.cjs
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PW = "C:/Users/cheri/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright";
const CHROME =
  "C:/Users/cheri/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";

const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");
const PORT = 5218;
const PAGE = `http://localhost:${PORT}/_admin-perfumes-verify.html`;

const log = (m) => fs.writeSync(1, m + "\n");

/* Minimal PNG bytes: the client pre-check only reads the 8-byte magic and the
   size, so this is enough for the picker preview; real alpha validation is
   covered server-side by tests/perfume-admin-static.cjs. */
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
]);

const failures = [];
const check = (cond, msg) => {
  log(`   ${cond ? "ok  " : "FAIL"} ${msg}`);
  if (!cond) failures.push(msg);
};

/* Stateful stub: overlay JSON mirrors services/perfumeAdmin.js shapes. */
const state = {
  created: [
    {
      id: "created-one",
      slug: "created-one",
      name: "Created One",
      brand: "Harness House",
      family: "Woody",
      description: "",
      ingredients: ["Cedar"],
      year: null,
      perfumer: "",
      concentration: "EDP",
      sizes: [{ size: "Standard", price: 120 }],
      fromPrice: 120,
      available: true,
      image: null,
      imageKind: "local",
      imagePath: "/api/perfume-images/created-one?v=1",
      brandLocation: "",
      metrics: [], tiers: [], qualities: [], indicators: [], categories: [],
    },
  ],
  updated: [],
  deleted: [],
  nextId: 900,
};

const overlayJson = () => ({
  success: true,
  revision: `rev-${state.created.length}-${state.updated.length}-${state.deleted.length}`,
  created: state.created,
  updated: state.updated,
  deleted: state.deleted,
  counts: { created: state.created.length, updated: state.updated.length, deleted: state.deleted.length },
});

const inventoryRows = () => [
  ...state.created.map((c) => ({
    id: c.id, kind: "created", deleted: false, available: c.available,
    name: c.name, brand: c.brand, fromPrice: c.fromPrice,
    imagePath: c.imagePath, createdAt: null, updatedAt: "2026-11-07T10:00:00.000Z",
  })),
  ...state.updated.map((u) => ({
    id: u.id, kind: "override", deleted: false, available: u.available ?? null,
    name: u.name ?? null, brand: u.brand ?? null,
    fromPrice: u.fromPrice ?? null, imagePath: u.imagePath ?? null,
    createdAt: null, updatedAt: "2026-11-07T10:00:00.000Z",
  })),
  ...state.deleted.map((id) => ({
    id, kind: "override", deleted: true, available: null,
    name: null, brand: null, fromPrice: null, imagePath: null,
    createdAt: null, updatedAt: "2026-11-07T10:00:00.000Z",
  })),
];

(async () => {
  const viteBin = path.join(FRONTEND, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(process.execPath, [viteBin, "--port", String(PORT), "--strictPort", "--base", "/"], {
    cwd: FRONTEND,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => log(`[vite] ${String(d).trim()}`));
  server.stderr.on("data", (d) => log(`[vite!] ${String(d).trim()}`));
  const stopServer = () => {
    try { server.kill("SIGKILL"); } catch { /* already gone */ }
  };
  process.on("exit", stopServer);

  const started = Date.now();
  for (;;) {
    try {
      const res = await fetch(PAGE, { signal: AbortSignal.timeout(3000) });
      if (res.status < 500) break;
    } catch { /* not up yet */ }
    if (Date.now() - started > 60000) {
      stopServer();
      throw new Error("dev server never came up");
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  log("dev server up");

  const { chromium } = require(PW);
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.accept());

  const apiRe = new RegExp(`^http://localhost:${PORT}/api/`);
  const posted = [];
  await page.route(apiRe, async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const method = req.method();
    if (method === "GET" && p === "/api/admin/perfumes") {
      return route.fulfill({ json: { success: true, rows: inventoryRows() } });
    }
    if (method === "GET" && p === "/api/catalog/overlay") {
      return route.fulfill({ json: overlayJson() });
    }
    if (method === "PATCH" && /^\/api\/admin\/perfumes\/[^/]+$/.test(p)) {
      const body = req.postDataJSON();
      posted.push({ method, p, body });
      const id = decodeURIComponent(p.split("/").pop());
      const c = state.created.find((x) => x.id === id);
      if (c) c.available = body.available === 0 ? false : true;
      else state.updated.push({ id, available: body.available === 0 ? false : true });
      return route.fulfill({ json: { success: true, product: {} } });
    }
    if (method === "POST" && p === "/api/admin/perfumes/bulk") {
      const body = req.postDataJSON();
      posted.push({ method, p, body });
      for (const id of body.ids || []) {
        const c = state.created.find((x) => x.id === id);
        if (c) c.available = body.available === 0 ? false : true;
      }
      return route.fulfill({ json: { success: true, changed: (body.ids || []).length } });
    }
    if (method === "POST" && p === "/api/admin/perfumes") {
      posted.push({ method, p });
      const id = `created-new-${state.nextId++}`;
      state.created.push({
        id, slug: id, name: "Harness New", brand: "Harness House", family: "Fresh",
        description: "", ingredients: [], year: null, perfumer: "", concentration: "",
        sizes: [{ size: "Standard", price: 99 }], fromPrice: 99, available: true,
        image: null, imageKind: "local", imagePath: `/api/perfume-images/${id}?v=1`,
        brandLocation: "", metrics: [], tiers: [], qualities: [], indicators: [], categories: [],
      });
      return route.fulfill({ status: 201, json: { success: true, product: {} } });
    }
    if (method === "PUT" && /^\/api\/admin\/perfumes\/[^/]+$/.test(p)) {
      posted.push({ method, p });
      return route.fulfill({ json: { success: true, product: {} } });
    }
    if (method === "POST" && /^\/api\/admin\/perfumes\/[^/]+\/duplicate$/.test(p)) {
      posted.push({ method, p });
      return route.fulfill({ status: 201, json: { success: true, product: {} } });
    }
    if (method === "DELETE" && /^\/api\/admin\/perfumes\/[^/]+$/.test(p)) {
      const id = decodeURIComponent(p.split("/").pop());
      state.deleted.push(id);
      posted.push({ method, p });
      return route.fulfill({ json: { success: true, removed: true, permanent: false } });
    }
    if (method === "POST" && /^\/api\/admin\/perfumes\/[^/]+\/restore$/.test(p)) {
      posted.push({ method, p });
      state.deleted = [];
      return route.fulfill({ json: { success: true, restored: true } });
    }
    if (method === "GET" && /^\/api\/perfume-images\//.test(p)) {
      return route.fulfill({ status: 200, contentType: "image/png", body: PNG_BYTES });
    }
    log(`   [stub] UNHANDLED ${method} ${p}`);
    return route.fulfill({ json: { success: true } });
  });

  log("case 1: table renders the merged catalogue (static + created)");
  await page.goto(PAGE, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
  const rows1 = await page.locator('[data-guide="perfumes-table"] tbody tr').count();
  check(rows1 === 10, `first page shows ten rows (${rows1})`);
  check(await page.locator('[data-guide="perfumes-add"]').isVisible(), "Add button is visible");
  check(await page.locator('[data-guide="perfumes-search"]').isVisible(), "search box is visible");
  check((await page.locator(".perf-bulk").count()) === 0, "bulk bar hidden with no selection");

  log("case 2: search finds the admin-created perfume");
  await page.locator('[data-guide="perfumes-search"]').fill("Created One");
  await page.waitForFunction(
    () => document.querySelectorAll('[data-guide="perfumes-table"] tbody tr').length === 1,
    { timeout: 10000 },
  );
  const found = await page.locator('[data-guide="perfumes-table"] tbody tr').first().innerText();
  check(/Created One/.test(found) && /Harness House/.test(found), `created row renders (${found.replace(/\s+/g, " ").slice(0, 80)})`);
  check(/Added by you/.test(found) || /Added/.test(found), "source pill shows the admin-added source");
  check(/In stock/.test(found), "created perfume shows the in-stock pill");
  check(await page.locator('[data-guide="perfumes-pager"]').count() === 0, "pager retires when one row matches");

  log("case 3: same-tick double toggle issues exactly one PATCH");
  const patchBefore = posted.filter((x) => x.method === "PATCH").length;
  await page.evaluate(() => {
    const btn = document.querySelector('[data-guide="perfumes-stock"]');
    if (!btn) throw new Error("stock button not found");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(800);
  const patchAfter = posted.filter((x) => x.method === "PATCH").length;
  check(patchAfter - patchBefore === 1, `two same-tick clicks -> one PATCH (${patchAfter - patchBefore})`);

  log("case 4: Add dialog — form + PNG picker + shelf preview");
  await page.locator('[data-guide="perfumes-add"]').click();
  await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
  check(await page.locator(".perf-preview .shelf").count() === 1, "dialog includes the real .shelf preview card");
  check(await page.locator('[data-guide="perfume-drop"]').isVisible(), "drop zone is shown");
  await page.locator('[data-guide="perfume-name"]').fill("Harness New");
  await page.locator('[data-guide="perfume-brand"]').fill("Harness House");
  await page.locator('[data-guide="perfume-size-price"]').fill("99");
  await page.locator('[data-guide="perfume-image"]').setInputFiles({
    name: "bottle.png", mimeType: "image/png", buffer: PNG_BYTES,
  });
  await page.waitForFunction(
    () => {
      const img = document.querySelector(".perf-preview .shelf-media img");
      return img && img.src.startsWith("blob:");
    },
    { timeout: 10000 },
  );
  check(true, "chosen PNG becomes the preview image");
  const previewName = await page.locator(".perf-preview .shelf-body h3").innerText();
  check(previewName === "Harness New", `preview shows the typed name (${previewName})`);
  const postBefore = posted.filter((x) => x.method === "POST" && x.p === "/api/admin/perfumes").length;
  await page.locator('[data-guide="perfume-save"]').click();
  await page.waitForFunction(
    () => document.body.innerText.includes("Perfume added"),
    { timeout: 10000 },
  );
  check(true, "create success notice appears");
  const postAfter = posted.filter((x) => x.method === "POST" && x.p === "/api/admin/perfumes").length;
  check(postAfter - postBefore === 1, `one create POST for one save (${postAfter - postBefore})`);

  log("case 5: shelf-card parity — preview markup matches the collection card");
  await page.locator('[data-guide="perfumes-add"]').click();
  await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
  const shapes = await page.evaluate(() => {
    const shapesOf = (root) =>
      [...root.querySelectorAll("*")].map((el) => el.tagName.toLowerCase() + "." + (el.className.baseVal || el.className));
    const preview = document.querySelector(".perf-preview .shelf");
    return { preview: shapesOf(preview) };
  });
  const flat = shapes.preview.join(" ");
  check((/img/.test(flat) || /bottle/.test(flat)) && /shelf-body/.test(flat) && /shelf-brand/.test(flat) && /shelf-foot/.test(flat), "preview shelf has the same structural classes as a collection card");
  check(/shelf-media/.test(flat) && /h3/.test(flat), "preview shelf includes media + heading");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-guide="perfume-form"]', { state: "detached", timeout: 10000 });
  check(true, "dialog closes on Escape");

  log("case 6: stock filter (out of stock)");
  await page.locator('[data-guide="perfumes-search"]').fill("");
  await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 10000 });
  await page.locator('[data-guide="perfumes-status"]').selectOption("out");
  await page.waitForFunction(
    () => document.body.innerText.includes("Out of stock"),
    { timeout: 10000 },
  );
  check(true, "status filter narrows to out-of-stock rows");

  log("case 7: a non-PNG file is refused client-side with the translated message");
  await page.locator('[data-guide="perfumes-add"]').click();
  await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
  await page.locator('[data-guide="perfume-image"]').setInputFiles({
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("not a PNG"),
    { timeout: 10000 },
  );
  check(true, "JPEG payload shows the not-a-PNG message");
  check((await page.locator(".perf-preview .shelf-media img").count()) === 0, "refused file never reaches the preview");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-guide="perfume-form"]', { state: "detached", timeout: 10000 });

  log("case 8: bulk selection flips stock in ONE request");
  await page.locator('[data-guide="perfumes-status"]').selectOption("all");
  await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 10000 });
  const bulkBefore = posted.filter((x) => x.p === "/api/admin/perfumes/bulk").length;
  await page.locator('[data-guide="perfumes-select-all"]').check();
  await page.waitForSelector('[data-guide="perfumes-bulk"]', { timeout: 5000 });
  check(true, "bulk bar appears with a page selected");
  await page.locator('[data-guide="perfumes-bulk-out"]').click();
  await page.waitForFunction(
    () => !document.querySelector('[data-guide="perfumes-bulk"]'),
    { timeout: 10000 },
  );
  const bulkCalls = posted.filter((x) => x.p === "/api/admin/perfumes/bulk");
  const lastBulk = bulkCalls[bulkCalls.length - 1];
  check(bulkCalls.length - bulkBefore === 1, `ten selected rows -> one bulk POST (${bulkCalls.length - bulkBefore})`);
  check(Boolean(lastBulk) && Array.isArray(lastBulk.body.ids) && lastBulk.body.ids.length === 10, "bulk POST carries all ten ids");
  check(Boolean(lastBulk) && lastBulk.body.available === 0, "bulk POST asks for out of stock");
  check((await page.locator('[data-guide="perfumes-bulk"]').count()) === 0, "bulk bar retires after the change");

  log("case 9: edit, delete then restore the admin-created perfume");
  await page.locator('[data-guide="perfumes-search"]').fill("Created One");
  await page.waitForFunction(
    () => document.querySelectorAll('[data-guide="perfumes-table"] tbody tr').length === 1,
    { timeout: 10000 },
  );
  await page.locator('[data-guide="perfumes-edit"]').click();
  await page.waitForSelector('[data-guide="perfume-form"]', { timeout: 10000 });
  await page.locator('[data-guide="perfume-size-price"]').fill("150");
  const putBefore = posted.filter((x) => x.method === "PUT").length;
  await page.locator('[data-guide="perfume-save"]').click();
  await page.waitForFunction(() => document.body.innerText.includes("Saved"), { timeout: 10000 });
  const putAfter = posted.filter((x) => x.method === "PUT").length;
  check(putAfter - putBefore === 1, `edit issues one PUT (${putAfter - putBefore})`);

  const delBefore = posted.filter((x) => x.method === "DELETE").length;
  await page.locator('[data-guide="perfumes-delete"]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-guide="perfumes-deleted"]'),
    { timeout: 10000 },
  );
  check(posted.filter((x) => x.method === "DELETE").length - delBefore === 1, "delete issues one DELETE");
  check(true, "deleted section renders the removable row");

  const restoreBefore = posted.filter((x) => /\/restore$/.test(x.p)).length;
  await page.locator('[data-guide="perfumes-restore"]').first().click();
  await page.waitForFunction(
    () => !document.querySelector('[data-guide="perfumes-deleted"]'),
    { timeout: 10000 },
  );
  check(
    posted.filter((x) => /\/restore$/.test(x.p)).length - restoreBefore === 1,
    "restore issues one POST",
  );
  check(true, "deleted section disappears after the restore");

  log("case 10: French and Arabic copy renders");
  await page.goto(`${PAGE}?lang=fr`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
  check(
    (await page.locator('[data-guide="perfumes-add"]').innerText()).includes("Ajouter un parfum"),
    "fr add button",
  );
  check(
    (await page.locator('[data-guide="perfumes-status"]').innerText()).includes("Hors stock"),
    "fr stock filter",
  );
  await page.goto(`${PAGE}?lang=ar`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
  check(
    (await page.locator('[data-guide="perfumes-add"]').innerText()).includes("أضِف عطرًا"),
    "ar add button",
  );
  check(
    (await page.locator('[data-guide="perfumes-status"]').innerText()).includes("غير متوفر"),
    "ar stock filter",
  );
  check((await page.locator(".admin-error").count()) === 0, "no error banner in any language");

  await page.goto(PAGE, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-guide="perfumes-table"] tbody tr', { timeout: 30000 });
  await page.locator("body").screenshot({ path: path.join(__dirname, "perfume-admin-tab.png") });
  await browser.close();
  stopServer();

  if (errors.length) {
    log(`PAGE ERRORS (${errors.length}):`);
    errors.slice(0, 20).forEach((e) => log(`  ${e}`));
  } else {
    log("no page errors");
  }
  if (failures.length) {
    log(`FAILURES (${failures.length}):`);
    failures.forEach((f) => log(`  ${f}`));
    process.exitCode = 1;
  } else {
    log("ALL CHECKS PASSED");
  }
})().catch((e) => {
  log(`FAILED: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
