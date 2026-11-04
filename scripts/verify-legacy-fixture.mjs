#!/usr/bin/env node
/*
 * Verifies the extracted fixture and the actual React component without changing the live site.
 * Usage: node scripts/verify-legacy-fixture.mjs [--write-html]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import React from "../frontend/node_modules/react/index.js";
import { renderToStaticMarkup } from "../frontend/node_modules/react-dom/server.node.js";
import { createServer } from "../frontend/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "frontend", "src", "legacy", "legacy-sections.json");
const SOURCE = path.join(ROOT, "public", "index.html");
const OUTPUT = path.join(ROOT, "_recon", "react-fixture-render.html");
const writeHtml = process.argv.includes("--write-html");
const fail = (message) => { console.error(`FAIL: ${message}`); process.exit(1); };
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const source = fs.readFileSync(SOURCE, "utf8");
const expectedSourceHash = sha256(source);
if (fixture.sourceSha256 !== expectedSourceHash) fail("fixture source hash differs from public/index.html; re-extract");
if (fixture.sectionCount !== 185 || fixture.sections.length !== 185) fail(`expected 185 fixture sections, found ${fixture.sections.length}`);
if (fixture.productCount !== 186) fail(`expected 186 products, found ${fixture.productCount}`);

const vite = await createServer({
  root: path.join(ROOT, "frontend"),
  configFile: path.join(ROOT, "frontend", "vite.config.js"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
let rendered;
try {
  const componentModule = await vite.ssrLoadModule("/src/legacy/LegacyProductSections.jsx");
  rendered = renderToStaticMarkup(React.createElement(componentModule.LegacyProductSections, { sections: fixture.sections }));
} finally {
  await vite.close();
}
const expectedRendered = fixture.sections.map((item) => item.rawHtml).join("\n");
if (rendered !== expectedRendered) {
  let offset = 0;
  while (offset < Math.min(rendered.length, expectedRendered.length) && rendered[offset] === expectedRendered[offset]) offset++;
  fail(`React output differs from extracted source at character ${offset}; expected length ${expectedRendered.length}, got ${rendered.length}; expected ${JSON.stringify(expectedRendered.slice(offset, offset + 160))}; got ${JSON.stringify(rendered.slice(offset, offset + 160))}`);
}

// Independently extract source sections in document order and verify the captured raw HTML ranges.
const sourceSections = [...source.matchAll(/<section\b[^>]*class="content [a-z0-9_-]+-section"[^>]*id="[^"]+"[^>]*>/gi)];
if (sourceSections.length !== fixture.sections.length) fail(`source now has ${sourceSections.length} matched sections; fixture has ${fixture.sections.length}`);
for (let i = 0; i < sourceSections.length; i++) {
  const section = fixture.sections[i];
  const sectionStart = sourceSections[i].index;
  const rawIndex = source.indexOf(section.rawHtml, sectionStart);
  if (rawIndex !== sectionStart) fail(`fixture section ${section.slug} differs from source at index ${i}`);
}

const elementIds = fixture.sections.flatMap((item) => item.ids);
const duplicateIds = elementIds.filter((id, i) => elementIds.indexOf(id) !== i);
if (duplicateIds.length) fail(`duplicate ids among product sections: ${[...new Set(duplicateIds)].join(", ")}`);

if (writeHtml) {
  fs.writeFileSync(OUTPUT, rendered, "utf8");
  console.log(`WROTE ${path.relative(ROOT, OUTPUT)} (${Buffer.byteLength(rendered)} bytes)`);
}
console.log(`PASS actual React component server-rendered the fixture exactly (${Buffer.byteLength(rendered)} bytes)`);
console.log(`PASS ${fixture.sections.length} source sections / ${fixture.productCount} product-name elements in source order`);
console.log(`PASS ${new Set(elementIds).size} unique section descendant IDs; no added wrapper node`);
console.log(`PASS source SHA-256 ${expectedSourceHash}`);
console.log(`INFO review containers absent only in: ${fixture.sections.filter((item) => !item.hasReviews).map((item) => item.slug).join(", ") || "none"}`);
