/*
 * Perfume administration — persistence + validation.
 *
 * Why this lives in the database:
 *   /app's catalogue is a build-time `virtual:catalogue` array inlined into the
 *   committed public/app bundle. Nothing about it can change at runtime. The
 *   admin overlay is therefore a set of rows that the SPA merges over the
 *   static array on boot. PNG bytes are stored as base64 TEXT (not a file and
 *   not BYTEA) because Render's free tier is ephemeral, Vercel only has /tmp
 *   and GitHub Pages is entirely static: no host has a durable filesystem, but
 *   Neon Postgres is durable on all three. TEXT/BLOB-free keeps db.js's
 *   SQLite <-> Postgres translation identical in both branches.
 *
 * One table, two kinds of row:
 *   kind = "created"  -> a whole new perfume, all fields populated
 *   kind = "override" -> a partial patch over one of the 752 static rows;
 *                        NULL means "leave the static value alone"
 *
 * This module is deliberately free of Express so it can be unit-tested without
 * a server. server.js owns the HTTP surface.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_PNG_BYTES = 5 * 1024 * 1024;
const MIN_DIM = 64;
const MAX_DIM = 4096;
const MIN_ASPECT = 0.05;
const MAX_ASPECT = 20;
const MAX_BULK = 200;

let db = null;
let sharp = null;
let staticPath = null;
let staticCache = null;
let tablePromise = null;
let clockSeq = 0;

function init(options) {
  db = options.db;
  sharp = options.sharp || null;
  staticPath = options.staticCataloguePath;
  staticCache = null;
  tablePromise = null;
  return module.exports;
}

/* Always-increasing within a process, even for two writes in the same ms.
   SQLite's CURRENT_TIMESTAMP is second-resolution, which made the overlay
   revision identical for back-to-back edits. The columns are TEXT rather
   than DATETIME precisely because of the dotted sequence suffix: Postgres
   would reject it as a TIMESTAMPTZ, while a lexicographically sortable
   string works in both dialects. Every INSERT sets both columns explicitly. */
function stamp() {
  clockSeq = (clockSeq + 1) % 100000;
  return `${new Date().toISOString()}.${String(clockSeq).padStart(5, "0")}`;
}

/* ------------------------------------------------------------------ table */

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS perfume_admin (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'override',
      name TEXT,
      brand TEXT,
      family TEXT,
      concentration TEXT,
      description TEXT,
      ingredients TEXT,
      perfumer TEXT,
      year INTEGER,
      sizes TEXT,
      from_price REAL,
      available INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0,
      image_data TEXT,
      image_url TEXT,
      image_mime TEXT,
      image_rev TEXT,
      image_width INTEGER,
      image_height INTEGER,
      created_at TEXT,
      updated_at TEXT
  )`;

/* Vercel sets VERCEL=1 and server.js skips its whole boot-migration block, so
   a table created only at boot would not exist there. Memoise a lazy CREATE
   that every route awaits; it costs one query per process. */
function ensureTable() {
  if (!tablePromise) {
    tablePromise = Promise.resolve()
      .then(() => db.run(CREATE_SQL))
      .catch((err) => {
        tablePromise = null; // let the next request retry
        throw err;
      });
  }
  return tablePromise;
}

/* ------------------------------------------------------------- static data */

function loadStatic() {
  if (staticCache) return staticCache;
  try {
    const raw = JSON.parse(fs.readFileSync(staticPath, "utf8"));
    staticCache = Array.isArray(raw) ? raw : [];
  } catch {
    /* Vercel excludes scripts/ but public/data is deployed. If it is missing
       anyway, name de-duplication degrades to DB rows only — never a 500. */
    staticCache = [];
  }
  return staticCache;
}

function staticById(id) {
  return loadStatic().find((p) => String(p.id) === String(id)) || null;
}

function normName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------ PNG parsing */

function parsePngChunks(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33) return null;
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  const out = { width: 0, height: 0, colorType: -1, bitDepth: 0, hasTrns: false, animated: false, hasIdat: false };
  let off = 8;
  let seenIhdr = false;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const start = off + 8;
    if (len > buf.length || start + len + 4 > buf.length) return null; // truncated / lying length
    if (type === "IHDR" && len >= 13) {
      out.width = buf.readUInt32BE(start);
      out.height = buf.readUInt32BE(start + 4);
      out.bitDepth = buf[start + 8];
      out.colorType = buf[start + 9];
      seenIhdr = true;
    } else if (type === "tRNS") out.hasTrns = true;
    else if (type === "acTL") out.animated = true;
    else if (type === "IDAT") out.hasIdat = true;
    off = start + len + 4;
    if (type === "IEND") break;
  }
  if (!seenIhdr || !out.hasIdat) return null;
  return out;
}

/* Returns { ok, error, meta }. Pure Node checks first so a malformed file is
   rejected even when sharp is unavailable; sharp then proves there really are
   transparent AND visible pixels (an opaque PNG with an alpha channel is not a
   "transparent PNG"). */
async function validatePng(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return { ok: false, error: "A PNG image is required." };
  if (buf.length < 67) return { ok: false, error: "The PNG file is truncated." };
  if (buf.length > MAX_PNG_BYTES) return { ok: false, error: "The PNG must be 5 MB or smaller." };

  const meta = parsePngChunks(buf);
  if (!meta) return { ok: false, error: "The file is not a valid PNG image." };
  if (meta.animated) return { ok: false, error: "Animated PNG files are not supported." };
  const alphaCapable = meta.colorType === 4 || meta.colorType === 6 || meta.hasTrns;
  if (!alphaCapable) return { ok: false, error: "The PNG has no alpha channel — a transparent background is required." };
  if (!meta.width || !meta.height) return { ok: false, error: "The PNG has invalid dimensions." };
  if (meta.width < MIN_DIM || meta.height < MIN_DIM)
    return { ok: false, error: `The PNG must be at least ${MIN_DIM}×${MIN_DIM} pixels.` };
  if (meta.width > MAX_DIM || meta.height > MAX_DIM)
    return { ok: false, error: `The PNG must be at most ${MAX_DIM}×${MAX_DIM} pixels.` };
  const aspect = meta.width / meta.height;
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT)
    return { ok: false, error: "The PNG proportions are not usable for a product card." };

  if (sharp) {
    try {
      const stats = await sharp(buf, { failOn: "error" }).ensureAlpha().stats();
      const alpha = stats.channels && stats.channels[3];
      if (!alpha) return { ok: false, error: "The PNG has no alpha channel — a transparent background is required." };
      if (alpha.min > 0) return { ok: false, error: "The PNG is fully opaque — a transparent background is required." };
      if (alpha.max === 0) return { ok: false, error: "The PNG is completely transparent — there is nothing to show." };
    } catch (err) {
      return { ok: false, error: `The PNG could not be decoded: ${err.message || "invalid image"}` };
    }
  }
  return { ok: true, meta };
}

/* Downscale for weight, but never flatten alpha and never convert to JPEG.
   When sharp is missing (serverless cold start) the already-validated bytes
   are stored unchanged rather than failing the request. */
async function normalizePng(buf, meta) {
  const digest = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 24);
  if (!sharp) {
    return { data: buf, rev: digest, width: meta.width, height: meta.height };
  }
  try {
    const out = await sharp(buf, { failOn: "error" })
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();
    const box = await sharp(out).metadata();
    return {
      data: out,
      rev: crypto.createHash("sha256").update(out).digest("hex").slice(0, 24),
      width: box.width || meta.width,
      height: box.height || meta.height,
    };
  } catch {
    return { data: buf, rev: digest, width: meta.width, height: meta.height };
  }
}

async function prepareImage(file) {
  const mime = file && file.mimetype;
  if (!file || !file.buffer) return { error: "A PNG image is required." };
  if (mime && mime !== "image/png" && mime !== "image/x-png")
    return { error: "Only transparent PNG images are accepted." };
  const checked = await validatePng(file.buffer);
  if (!checked.ok) return { error: checked.error };
  const norm = await normalizePng(file.buffer, checked.meta);
  return {
    image_data: norm.data.toString("base64"),
    image_mime: "image/png",
    image_rev: norm.rev,
    image_width: norm.width,
    image_height: norm.height,
    image_url: null,
  };
}

/* ------------------------------------------------------- field validation */

function cleanText(value, max) {
  if (value == null) return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

function parseJsonish(value, fallback) {
  if (value == null || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined; // caller reports "must be a valid list"
  }
}

const LIMITS = {
  name: 120,
  brand: 120,
  family: 120,
  concentration: 60,
  perfumer: 120,
  description: 2000,
};

/* Whitelist: unknown keys are silently dropped, so __proto__ / constructor
   style payloads can never reach a query or an Object.assign. */
function validateFields(body, { partial = false } = {}) {
  const b = body && typeof body === "object" ? body : {};
  const value = {};

  for (const key of Object.keys(LIMITS)) {
    if (partial && !(key in b)) continue;
    const text = cleanText(b[key], LIMITS[key]);
    if (!partial || key in b) value[key] = text;
  }
  if ((!partial || "name" in b) && (!value.name || !value.name.trim()))
    return { error: "The perfume name is required." };
  if ((!partial || "brand" in b) && (!value.brand || !value.brand.trim()))
    return { error: "The brand is required." };

  if (!partial || "year" in b) {
    if (b.year == null || b.year === "") value.year = null;
    else {
      const year = Number(b.year);
      const nextYear = new Date().getFullYear() + 1;
      if (!Number.isInteger(year) || year < 1800 || year > nextYear)
        return { error: `The year must be a whole number between 1800 and ${nextYear}.` };
      value.year = year;
    }
  }

  if (!partial || "ingredients" in b) {
    const parsed = parseJsonish(b.ingredients, []);
    if (!Array.isArray(parsed)) return { error: "Ingredients must be a list." };
    if (parsed.length > 40) return { error: "At most 40 ingredients are allowed." };
    value.ingredients = JSON.stringify(
      parsed.map((v) => cleanText(v, 80)).filter(Boolean).slice(0, 40),
    );
  }

  if (!partial || "sizes" in b || "price" in b || "fromPrice" in b) {
    /* `price` (and its read-side alias `fromPrice`) is the admin UI's shorthand
       for one "Standard" size. A partial edit that changes only the price sends
       no `sizes` key at all — that must not be read as an invalid list. */
    const shorthand = b.price != null && b.price !== "" ? b.price : b.fromPrice;
    const hasSizesKey = "sizes" in b;
    let sizes = parseJsonish(b.sizes, partial ? undefined : []);
    if (hasSizesKey && sizes === undefined)
      return { error: "Sizes must be a list of { size, price }." };
    if (sizes === undefined) {
      if (shorthand == null || shorthand === "")
        return { error: "Sizes must be a list of { size, price }." };
      sizes = [];
    }
    if (sizes !== null && !Array.isArray(sizes))
      return { error: "Sizes must be a list of { size, price }." };
    if (shorthand != null && shorthand !== "" && (!sizes || !sizes.length)) {
      sizes = [{ size: "Standard", price: shorthand }];
    }
    if (!Array.isArray(sizes)) sizes = [];
    if (sizes.length > 12) return { error: "At most 12 sizes are allowed." };
    const clean = [];
    for (const row of sizes) {
      if (!row || typeof row !== "object") return { error: "Each size needs a label and a price." };
      const size = cleanText(row.size, 40);
      const price = Number(row.price);
      if (!size || !Number.isFinite(price) || price <= 0 || price > 1e6)
        return { error: "Each size needs a label and a price between 0.01 and 1000000." };
      clean.push({ size, price: Math.round(price * 100) / 100 });
    }
    value.sizes = JSON.stringify(clean);
    value.from_price = clean.length ? Math.min(...clean.map((s) => s.price)) : null;
  }

  if (!partial || "available" in b) {
    if (b.available == null || b.available === "") value.available = 1;
    else {
      const v = b.available;
      if (![0, 1, "0", "1", true, false, "true", "false"].includes(v))
        return { error: "Stock must be in stock or hors stock." };
      value.available = v === false || v === 0 || v === "0" || v === "false" ? 0 : 1;
    }
  }

  if (partial && "deleted" in b) {
    const v = b.deleted;
    if (![0, 1, "0", "1", true, false, "true", "false"].includes(v))
      return { error: "The deleted flag must be 0 or 1." };
    value.deleted = v === false || v === 0 || v === "0" || v === "false" ? 0 : 1;
  }

  return { value };
}

function slugify(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "parfum";
}

/* -------------------------------------------------------------- db helpers */

const get = (sql, params) => db.get(sql, params);
const all = (sql, params) => db.all(sql, params);
const run = (sql, params) => db.run(sql, params);

async function rowById(id) {
  return get("SELECT * FROM perfume_admin WHERE id = ?", [id]);
}

async function exists(id) {
  if (staticById(id)) return true;
  return !!(await rowById(id));
}

async function uniqueId(name) {
  const base = slugify(name);
  for (let i = 0; i < 12; i++) {
    const id = `${base}-${crypto.randomBytes(4).toString("hex")}`;
    if (!(await exists(id))) return id;
  }
  return `${base}-${crypto.randomBytes(10).toString("hex")}`;
}

async function findDuplicateName(name, excludeId) {
  const key = normName(name);
  if (!key) return null;
  for (const p of loadStatic()) {
    if (p.id !== excludeId && normName(p.name) === key) return { id: p.id, name: p.name };
  }
  const rows = await all(
    "SELECT id, name, deleted FROM perfume_admin WHERE name IS NOT NULL AND name <> ''",
    [],
  );
  for (const r of rows) {
    if (r.id === excludeId || r.deleted) continue;
    if (normName(r.name) === key) return { id: r.id, name: r.name };
  }
  return null;
}

/* INSERT OR IGNORE is translated to ON CONFLICT DO NOTHING by db.js on PG.
   Two statements keep the partial-update semantics identical in both dialects
   (a single ON CONFLICT DO UPDATE would need dialect-specific SQL). */
async function upsertOverride(id, sets) {
  const now = stamp();
  await ensureTable();
  await run("INSERT OR IGNORE INTO perfume_admin (id, kind, created_at, updated_at) VALUES (?, ?, ?, ?)", [
    id,
    "override",
    now,
    now,
  ]);
  const keys = Object.keys(sets);
  const params = [...keys.map((k) => sets[k]), now, id];
  await run(
    `UPDATE perfume_admin SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
    params,
  );
  return rowById(id);
}

/* ------------------------------------------------------------- public shape */

const EMPTY_ARRAYS = {
  metrics: [],
  tiers: [],
  qualities: [],
  indicators: [],
  categories: [],
};

function jsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function imagePathFor(row) {
  if (row.image_data) return `/api/perfume-images/${encodeURIComponent(row.id)}?v=${row.image_rev || "0"}`;
  return row.image_url || null;
}

/* Exactly the runtime `virtual:catalogue` shape (vite.config.js:184-215), so
   the existing card, product page, search, facets and cart all work unchanged.
   `image` is filled in by the SPA store (it has to know the API origin). */
function publicRecord(row) {
  return {
    id: row.id,
    slug: slugify(row.name || row.id),
    name: row.name || "",
    brand: row.brand || "",
    family: row.family || "",
    description: row.description || "",
    ingredients: jsonArray(row.ingredients),
    year: row.year == null ? null : Number(row.year),
    perfumer: row.perfumer || "",
    concentration: row.concentration || "",
    sizes: jsonArray(row.sizes),
    fromPrice: row.from_price == null ? null : Number(row.from_price),
    available: row.available == null ? true : Boolean(row.available),
    image: null,
    imageKind: "local",
    imagePath: imagePathFor(row),
    brandLocation: "",
    ...EMPTY_ARRAYS,
    source: "admin",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

const PATCH_MAP = {
  name: "name",
  brand: "brand",
  family: "family",
  concentration: "concentration",
  description: "description",
  perfumer: "perfumer",
};

function publicPatch(row) {
  const patch = { id: row.id };
  for (const [out, col] of Object.entries(PATCH_MAP)) {
    if (row[col] != null) patch[out] = row[col];
  }
  if (row.year != null) patch.year = Number(row.year);
  if (row.ingredients != null) patch.ingredients = jsonArray(row.ingredients);
  if (row.sizes != null) patch.sizes = jsonArray(row.sizes);
  if (row.from_price != null) patch.fromPrice = Number(row.from_price);
  if (row.available != null) patch.available = Boolean(row.available);
  if (row.image_url != null) patch.image = row.image_url;
  if (row.image_data) {
    patch.image = null;
    patch.imagePath = imagePathFor(row);
  }
  return patch;
}

/* ---------------------------------------------------------------- overlay */

async function overlay() {
  await ensureTable();
  const rows = await all("SELECT * FROM perfume_admin ORDER BY id ASC", []);
  const created = [];
  const updated = [];
  const deleted = [];
  for (const row of rows) {
    if (row.deleted) {
      deleted.push(row.id);
    } else if (row.kind === "created") {
      created.push(publicRecord(row));
    } else {
      const patch = publicPatch(row);
      if (Object.keys(patch).length > 1) updated.push(patch);
    }
  }
  /* Hash the raw rows, not the projected patches: two edits to the same static
     row inside one millisecond used to produce byte-identical patches and
     therefore the same revision, so a polling client never noticed the second
     one. The raw rows carry stamp()'s monotonic suffix and every column that
     can change. */
  const fingerprint = JSON.stringify(
    rows.map((r) => [
      r.id, r.kind, r.deleted, r.updated_at, r.image_rev, r.available,
      r.name, r.brand, r.family, r.concentration, r.description, r.ingredients,
      r.perfumer, r.year, r.sizes, r.from_price, r.image_url,
    ]),
  );
  return {
    success: true,
    revision: crypto.createHash("sha1").update(fingerprint).digest("hex").slice(0, 16),
    created,
    updated,
    deleted,
    counts: { created: created.length, updated: updated.length, deleted: deleted.length },
  };
}

/* Admin-only inventory of overlay rows. The public overlay hides deleted
   records entirely, but the back office needs to list them so a mistaken
   delete can be restored. No image bytes are returned. */
async function list() {
  await ensureTable();
  const rows = await all("SELECT * FROM perfume_admin ORDER BY updated_at DESC, id ASC", []);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    deleted: Boolean(r.deleted),
    available: r.available == null ? null : Boolean(r.available),
    name: r.name || null,
    brand: r.brand || null,
    fromPrice: r.from_price == null ? null : Number(r.from_price),
    imagePath: imagePathFor(r),
    createdAt: r.created_at || null,
    updatedAt: r.updated_at || null,
  }));
}

async function imageFor(id) {
  if (!ID_RE.test(String(id))) return null;
  await ensureTable();
  const row = await rowById(id);
  if (!row || !row.image_data) return null;
  try {
    return { buffer: Buffer.from(row.image_data, "base64"), rev: row.image_rev || "0" };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- operations */

async function create(body, file) {
  await ensureTable();
  const checked = validateFields(body, { partial: false });
  if (checked.error) return { status: 400, error: checked.error };
  const image = await prepareImage(file);
  if (image.error) return { status: 400, error: image.error };

  const duplicate = await findDuplicateName(checked.value.name, null);
  if (duplicate) return { status: 409, error: `A perfume named “${duplicate.name}” already exists.` };

  const id = await uniqueId(checked.value.name);
  const v = checked.value;
  const now = stamp();
  await run(
    `INSERT INTO perfume_admin
       (id, kind, name, brand, family, concentration, description, ingredients,
        perfumer, year, sizes, from_price, available, deleted,
        image_data, image_url, image_mime, image_rev, image_width, image_height,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, "created", v.name, v.brand, v.family, v.concentration, v.description,
      v.ingredients, v.perfumer, v.year, v.sizes, v.from_price, v.available,
      image.image_data, image.image_url, image.image_mime, image.image_rev,
      image.image_width, image.image_height, now, now,
    ],
  );
  return { status: 201, product: publicRecord(await rowById(id)) };
}

async function patch(id, body, file) {
  if (!ID_RE.test(String(id))) return { status: 400, error: "Invalid perfume id." };
  await ensureTable();
  const row = await rowById(id);
  if (!row && !staticById(id)) return { status: 404, error: "Perfume not found." };

  const hasFields = body && Object.keys(body).some((k) =>
    ["name", "brand", "family", "concentration", "description", "perfumer", "year",
      "ingredients", "sizes", "price", "fromPrice", "available", "deleted"].includes(k));
  const checked = hasFields ? validateFields(body, { partial: true }) : { value: {} };
  if (checked.error) return { status: 400, error: checked.error };
  const v = checked.value;

  if (v.name) {
    const duplicate = await findDuplicateName(v.name, id);
    if (duplicate) return { status: 409, error: `A perfume named “${duplicate.name}” already exists.` };
  }

  const image = file ? await prepareImage(file) : null;
  if (image && image.error) return { status: 400, error: image.error };

  const sets = {};
  for (const key of ["name", "brand", "family", "concentration", "description", "ingredients",
    "perfumer", "year", "sizes", "from_price", "available", "deleted"]) {
    if (key in v) sets[key] = v[key];
  }
  if (image) Object.assign(sets, image);

  if (row && row.kind === "created") {
    if (Object.keys(sets).length) {
      const keys = Object.keys(sets);
      await run(
        `UPDATE perfume_admin SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
        [...keys.map((k) => sets[k]), stamp(), id],
      );
    }
  } else if (Object.keys(sets).length) {
    await upsertOverride(id, sets);
  }
  return { status: 200, product: await publicRecordFrom(id) };
}

/* Resolves the merged view of one id: a created row, or a static row with its
   override applied. Used to return a useful body after an edit. */
async function publicRecordFrom(id) {
  const row = await rowById(id);
  if (row && row.kind === "created") return publicRecord(row);
  const base = staticById(id);
  if (!base) return row ? publicPatch(row) : null;
  const merged = { ...base };
  if (row) Object.assign(merged, publicPatch(row));
  return merged;
}

/* Soft delete for BOTH kinds. Hard-deleting an admin-created row would make
   restore impossible and would destroy the only copy of the uploaded PNG;
   `purge` is the explicit, separate destructive action. */
async function remove(id, { purge = false } = {}) {
  if (!ID_RE.test(String(id))) return { status: 400, error: "Invalid perfume id." };
  await ensureTable();
  const row = await rowById(id);
  if (purge && row && row.kind === "created") {
    await run("DELETE FROM perfume_admin WHERE id = ?", [id]);
    return { status: 200, removed: true, permanent: true };
  }
  if (!row && !staticById(id)) return { status: 404, error: "Perfume not found." };
  if (purge && row) {
    /* A static row can never be purged; clear its overrides instead so the
       original catalogue entry comes back exactly as shipped. */
    await run("DELETE FROM perfume_admin WHERE id = ?", [id]);
    return { status: 200, removed: true, permanent: true };
  }
  if (row && row.kind === "created") {
    await run("UPDATE perfume_admin SET deleted = 1, updated_at = ? WHERE id = ?", [stamp(), id]);
  } else {
    await upsertOverride(id, { deleted: 1 });
  }
  return { status: 200, removed: true, permanent: false };
}

async function restore(id) {
  if (!ID_RE.test(String(id))) return { status: 400, error: "Invalid perfume id." };
  await ensureTable();
  const row = await rowById(id);
  if (!row) {
    if (staticById(id)) return { status: 200, restored: true }; // nothing was deleted
    return { status: 404, error: "Perfume not found." };
  }
  await run("UPDATE perfume_admin SET deleted = 0, updated_at = ? WHERE id = ?", [stamp(), id]);
  return { status: 200, restored: true };
}

async function duplicate(id, body, file) {
  if (!ID_RE.test(String(id))) return { status: 400, error: "Invalid perfume id." };
  await ensureTable();
  const source = await publicRecordFrom(id);
  if (!source) return { status: 404, error: "Perfume not found." };

  const requestedName = cleanText(body && body.name, 120);
  const name = requestedName || `${source.name || "Parfum"} — copie`;
  const checked = validateFields(
    {
      name,
      brand: source.brand || "Charme",
      family: source.family || "",
      concentration: source.concentration || "",
      description: source.description || "",
      perfumer: source.perfumer || "",
      year: source.year,
      ingredients: source.ingredients || [],
      sizes: source.sizes || [],
      price: source.fromPrice,
      available: source.available === false ? 0 : 1,
    },
    { partial: false },
  );
  if (checked.error) return { status: 400, error: checked.error };

  const dup = await findDuplicateName(name, null);
  if (dup) return { status: 409, error: `A perfume named “${dup.name}” already exists.` };

  const srcRow = await rowById(id);
  let image;
  if (file) {
    image = await prepareImage(file);
    if (image.error) return { status: 400, error: image.error };
  } else if (srcRow && srcRow.image_data) {
    image = {
      image_data: srcRow.image_data,
      image_url: null,
      image_mime: srcRow.image_mime,
      image_rev: srcRow.image_rev,
      image_width: srcRow.image_width,
      image_height: srcRow.image_height,
    };
  } else {
    image = {
      image_data: null,
      image_url: typeof source.image === "string" ? source.image : source.imagePath || null,
      image_mime: "image/png",
      image_rev: "static",
      image_width: 0,
      image_height: 0,
    };
  }
  if (!image.image_data && !image.image_url)
    return { status: 400, error: "The source perfume has no image to duplicate. Drop a transparent PNG." };

  const newId = await uniqueId(name);
  const v = checked.value;
  const now = stamp();
  await run(
    `INSERT INTO perfume_admin
       (id, kind, name, brand, family, concentration, description, ingredients,
        perfumer, year, sizes, from_price, available, deleted,
        image_data, image_url, image_mime, image_rev, image_width, image_height,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId, "created", v.name, v.brand, v.family, v.concentration, v.description,
      v.ingredients, v.perfumer, v.year, v.sizes, v.from_price, v.available,
      image.image_data, image.image_url, image.image_mime, image.image_rev,
      image.image_width, image.image_height, now, now,
    ],
  );
  return { status: 201, product: publicRecord(await rowById(newId)) };
}

async function bulk(body) {
  const ids = body && body.ids;
  if (!Array.isArray(ids) || !ids.length) return { status: 400, error: "Select at least one perfume." };
  if (ids.length > MAX_BULK) return { status: 400, error: `At most ${MAX_BULK} perfumes can be changed at once.` };
  for (const id of ids) {
    if (!ID_RE.test(String(id))) return { status: 400, error: "One of the perfume ids is invalid." };
  }
  const sets = {};
  if ("available" in (body || {})) {
    const v = body.available;
    if (![0, 1, "0", "1", true, false, "true", "false"].includes(v))
      return { status: 400, error: "Stock must be in stock or hors stock." };
    sets.available = v === false || v === 0 || v === "0" || v === "false" ? 0 : 1;
  }
  if ("deleted" in (body || {})) {
    const v = body.deleted;
    if (![0, 1, "0", "1", true, false, "true", "false"].includes(v))
      return { status: 400, error: "The deleted flag must be 0 or 1." };
    sets.deleted = v === false || v === 0 || v === "0" || v === "false" ? 0 : 1;
  }
  if (!Object.keys(sets).length) return { status: 400, error: "Nothing to change." };
  await ensureTable();
  let changed = 0;
  for (const id of ids) {
    const row = await rowById(id);
    if (row && row.kind === "created") {
      const keys = Object.keys(sets);
      await run(
        `UPDATE perfume_admin SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
        [...keys.map((k) => sets[k]), stamp(), id],
      );
    } else if (staticById(id) || row) {
      await upsertOverride(id, sets);
    } else {
      continue; // unknown id: ignore rather than fabricate a catalogue row
    }
    changed++;
  }
  return { status: 200, changed };
}

module.exports = {
  init,
  ensureTable,
  validatePng,
  normalizePng,
  validateFields,
  slugify,
  overlay,
  list,
  imageFor,
  create,
  patch,
  remove,
  restore,
  duplicate,
  bulk,
  publicRecord,
  loadStatic,
  staticById,
  ID_RE,
  MAX_BULK,
  MAX_PNG_BYTES,
};
