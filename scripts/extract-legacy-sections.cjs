#!/usr/bin/env node
/*
 * Extracts all 185 hand-authored homepage section wrappers (186 products) into a lossless fixture.
 * The rawHtml field is the source of truth; metadata is for the later React port.
 *
 * Usage:
 *   node scripts/extract-legacy-sections.cjs
 *   node scripts/extract-legacy-sections.cjs --check
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "public", "index.html");
const OUTPUT = path.join(ROOT, "frontend", "src", "legacy", "legacy-sections.json");
const CHECK = process.argv.includes("--check");

function fail(message) {
  console.error(`legacy section extraction failed: ${message}`);
  process.exit(1);
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function decodeHtmlText(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function attribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? match[2] : "";
}

function findClosingSection(source, openingTagEnd) {
  const sectionTag = /<\/?section\b[^>]*>/gi;
  sectionTag.lastIndex = openingTagEnd;
  let depth = 1;
  let match;
  while ((match = sectionTag.exec(source))) {
    if (/^<section\b/i.test(match[0])) depth++;
    else if (--depth === 0) return sectionTag.lastIndex;
  }
  return -1;
}

if (!fs.existsSync(SOURCE)) fail(`missing source: ${SOURCE}`);
const source = fs.readFileSync(SOURCE, "utf8");
const sourceHash = sha256(source);
const opening = /<section\b[^>]*\bclass\s*=\s*(["'])content\s+([a-z0-9_-]+)-section\1[^>]*\bid\s*=\s*(["'])(.*?)\3[^>]*>/gi;
const sections = [];
const globalIds = new Set();
let match;

while ((match = opening.exec(source))) {
  const openingTag = match[0];
  const classSlug = match[2];
  const id = match[4];
  // Two legacy blocks intentionally have different class slugs and ids:
  // `onemillionnight-section` / `1millionnight`, `xerjoff40knots-section` / `40knots`.
  const slugExceptions = new Map([
    ["onemillionnight", "1millionnight"],
    ["xerjoff40knots", "40knots"],
  ]);
  if (classSlug !== id && slugExceptions.get(classSlug) !== id) {
    fail(`unexpected section class/id mismatch near byte ${match.index}: ${classSlug} != ${id}`);
  }
  const end = findClosingSection(source, opening.lastIndex);
  if (end < 0) fail(`unterminated section: ${id}`);
  const rawHtml = source.slice(match.index, end);
  const inner = rawHtml.slice(openingTag.length, rawHtml.lastIndexOf("</section>"));
  const innerTheme = inner.match(/\bclass\s*=\s*(["'])([a-z0-9_-]+)-main-container\s+\2-theme\1/i);
  const theme = innerTheme ? innerTheme[2] : null;
  // Haltane is embedded inside the Layton wrapper, not a standalone section.
  const embeddedProductSlugs = /\bclass\s*=\s*(["'])haltane-section-container\1/i.test(inner) ? ["haltane"] : [];
  const productNameRaw = (inner.match(/<[^>]*\bclass\s*=\s*(["'])[^"']*\bproduct-name\b[^"']*\1[^>]*>([\s\S]*?)<\//i) || [])[2] || "";
  const brandRaw = (inner.match(/<[^>]*\bclass\s*=\s*(["'])[^"']*\bbrand-name\b[^"']*\1[^>]*>([\s\S]*?)<\//i) || [])[2] || "";
  const locationRaw = (inner.match(/<[^>]*\bclass\s*=\s*(["'])[^"']*\bbrand-location\b[^"']*\1[^>]*>([\s\S]*?)<\//i) || [])[2] || "";
  const imageTag = (inner.match(/<img\b[^>]*>/i) || [])[0] || "";
  const image = attribute(imageTag, "src");
  const imageAlt = attribute(imageTag, "alt");
  const tiers = [...new Set([...rawHtml.matchAll(new RegExp(`\\bid=["']${id}-([a-z]+)-quality["']`, "gi"))].map((m) => m[1].toLowerCase()))];
  const ids = [...rawHtml.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map((m) => m[2]);
  for (const foundId of ids) {
    if (globalIds.has(foundId)) fail(`duplicate fixture id: ${foundId}`);
    globalIds.add(foundId);
  }
  const sectionClass = attribute(openingTag, "class").split(/\s+/).filter(Boolean);
  const productNames = [...inner.matchAll(/<[^>]*\bclass\s*=\s*(["'])[^"']*\bproduct-name\b[^"']*\1[^>]*>([\s\S]*?)<\//gi)]
    .map((m) => decodeHtmlText(m[2].replace(/<[^>]*>/g, "").trim()));
  const expectedOpeningTag = `<section class="${attribute(openingTag, "class")}" id="${id}">`;
  if (openingTag !== expectedOpeningTag) fail(`unexpected root section attributes for ${id}: ${openingTag}`);
  sections.push({
    slug: id,
    classSlug,
    theme,
    embeddedProductSlugs,
    line: source.slice(0, match.index).split("\n").length,
    openingTag,
    sectionClass,
    brand: decodeHtmlText(brandRaw.replace(/<[^>]*>/g, "").trim()),
    brandLocation: decodeHtmlText(locationRaw.replace(/<[^>]*>/g, "").trim()),
    name: decodeHtmlText(productNameRaw.replace(/<[^>]*>/g, "").trim()),
    productNames,
    image,
    imageAlt: decodeHtmlText(imageAlt),
    qualityTiers: tiers,
    ids,
    hasReviews: ids.includes(`${id}-reviews`),
    rawHtml,
  });
  opening.lastIndex = end;
}

if (sections.length !== 185) fail(`expected 185 product sections; found ${sections.length}: ${sections.map((section) => section.slug).join(", ")}`);
if (new Set(sections.map((section) => section.slug)).size !== sections.length) fail("duplicate section slug");
if (sections.some((section) => !section.name || !section.brand)) fail("one or more sections lack product/brand names");
if (sections.filter((section) => section.theme === "elves").length !== 67) fail("expected 67 elves-theme sections");
if (new Set(sections.map((section) => section.theme).filter(Boolean)).size !== 117) fail("expected 117 distinct section themes");
const productCount = sections.reduce((total, section) => total + section.productNames.length, 0);
if (productCount !== 186) fail(`expected 186 product-name elements; found ${productCount}`);
const reviewCount = sections.filter((section) => section.hasReviews).length;
if (reviewCount !== 183) fail(`expected reviews on 183 sections; found ${reviewCount}; no-review slugs: ${sections.filter((section) => !section.hasReviews).map((section) => section.slug).join(", ")}`);
const noReviewSlugs = sections.filter((section) => !section.hasReviews).map((section) => section.slug).sort();
if (noReviewSlugs.join(",") !== "1millionnight,40knots") fail(`unexpected sections without review containers: ${noReviewSlugs.join(", ")}`);
if (!sections.some((section) => section.slug === "layton" && section.embeddedProductSlugs.includes("haltane"))) fail("expected Haltane to remain nested inside the Layton section");

const output = {
  schemaVersion: 1,
  source: "public/index.html",
  sourceSha256: sourceHash,
  sectionCount: sections.length,
  productCount,
  sections,
};
const json = `${JSON.stringify(output)}\n`;

if (CHECK) {
  if (!fs.existsSync(OUTPUT)) fail(`fixture missing: ${OUTPUT}`);
  const existing = fs.readFileSync(OUTPUT, "utf8");
  if (existing !== json) fail("fixture is stale or not deterministic; rerun without --check");
  console.log(`PASS: ${sections.length} sections; ${globalIds.size} unique ids; source SHA-256 ${sourceHash}`);
  console.log(`PASS: fixture byte-identical to deterministic extraction (${Buffer.byteLength(json)} bytes)`);
} else {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, json, "utf8");
  console.log(`wrote ${sections.length} sections -> frontend/src/legacy/legacy-sections.json`);
  console.log(`unique ids: ${globalIds.size}; source SHA-256: ${sourceHash}`);
  console.log(`fixture size: ${Buffer.byteLength(json)} bytes`);
}
