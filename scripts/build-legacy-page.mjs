#!/usr/bin/env node
/**
 * Static React migration build. Does not hydrate DOM owned by the legacy scripts.
 *
 * --extract-shell: capture all non-product document bytes as a shell fixture.
 * Default output: _recon/legacy-react-candidate.html (never overwrites the live root).
 * --check: require the rendered full document to equal public/index.html byte for byte.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import React from "../frontend/node_modules/react/index.js";
import { renderToStaticMarkup } from "../frontend/node_modules/react-dom/server.node.js";
import { createServer } from "../frontend/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "public/index.html");
const FIXTURE = path.join(ROOT, "frontend/src/legacy/legacy-sections.json");
const SHELL = path.join(ROOT, "frontend/src/legacy/document-shell.json");
const OUT = path.join(ROOT, "_recon/legacy-react-candidate.html");
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const source = fs.readFileSync(SOURCE, "utf8");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
if (sha(source) !== fixture.sourceSha256) throw new Error("Stale product fixture; re-extract before building.");

if (process.argv.includes("--extract-shell")) {
  const chunks = [];
  let offset = 0;
  for (const section of fixture.sections) {
    const start = source.indexOf(section.rawHtml, offset);
    if (start < 0) throw new Error(`Cannot locate ${section.slug} in source order`);
    chunks.push(source.slice(offset, start));
    offset = start + section.rawHtml.length;
  }
  chunks.push(source.slice(offset));
  const shell = {
    schemaVersion: 1,
    sourceSha256: fixture.sourceSha256,
    sectionOrder: fixture.sections.map((section) => section.slug),
    chunks,
  };
  fs.writeFileSync(SHELL, JSON.stringify(shell) + "\n");
  console.log(`Extracted ${chunks.length} shell chunks: head, inline boot scripts, modals, spacers, footer preserved.`);
}

const shell = JSON.parse(fs.readFileSync(SHELL, "utf8"));
if (shell.sourceSha256 !== fixture.sourceSha256) throw new Error("Shell and section fixtures have different source hashes");
if (shell.chunks.length !== fixture.sections.length + 1) throw new Error("Invalid shell chunk count");
if (shell.sectionOrder.join("\n") !== fixture.sections.map((s) => s.slug).join("\n")) throw new Error("Shell section ordering differs");

const vite = await createServer({
  root: path.join(ROOT, "frontend"),
  configFile: path.join(ROOT, "frontend/vite.config.js"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
let result = shell.chunks[0];
try {
  const { LegacyProductSections } = await vite.ssrLoadModule("/src/legacy/LegacyProductSections.jsx");
  for (let i = 0; i < fixture.sections.length; i++) {
    const section = fixture.sections[i];
    const rendered = renderToStaticMarkup(React.createElement(LegacyProductSections, { sections: [section] }));
    if (rendered !== section.rawHtml) throw new Error(`React modified ${section.slug}`);
    result += rendered + shell.chunks[i + 1];
  }
} finally {
  await vite.close();
}
if (process.argv.includes("--check") && result !== source) throw new Error("Full React-generated page differs from live source");
fs.writeFileSync(OUT, result);
console.log(`Built ${fixture.sectionCount} sections / ${fixture.productCount} products using the actual React component.`);
console.log(`Document: ${Buffer.byteLength(result)} bytes; SHA-256 ${sha(result)}`);
console.log(`Full-document equality: ${result === source ? "PASS (byte-for-byte)" : "DIFFERENT"}`);
console.log(`Candidate: ${OUT}`);

/*
 * --write promotes the pipeline to authoritative: it writes the live root document.
 * Only ever safe when equality passed above, in which case the bytes are unchanged.
 * The live file is git-tracked, so `git checkout -- public/index.html` restores it.
 */
if (process.argv.includes("--write")) {
  if (result !== source) throw new Error("Refusing to write: rendered document differs from live source");
  fs.writeFileSync(SOURCE, result);
  const after = fs.readFileSync(SOURCE, "utf8");
  if (sha(after) !== sha(result)) throw new Error("Write verification failed");
  console.log(`Wrote live root: ${SOURCE} (${Buffer.byteLength(after)} bytes, hash verified)`);
}
