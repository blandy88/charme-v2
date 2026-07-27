const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const { document, Node, MutationObserver } = dom.window;

global.window = dom.window;
global.document = document;
global.Node = Node;
global.MutationObserver = MutationObserver;

dom.window.eval(fs.readFileSync('js/note-image-resolver.js', 'utf8'));
dom.window.NoteImageResolver.hydrateStaticNotes(document);

const nameSelectors = [
  '.note-name',
  '[class$="-note-name"]',
  '.crystal-name',
  '[class$="-crystal-name"]',
  '.ingredient-name',
  '[class$="-noir-name"]',
  '[class$="-tag-name"]',
  '[class$="-chip-name"]',
  '[class$="-pill-name"]',
  '[class$="-card-name"]',
  '[class$="-leaf-name"]',
  '[class$="-star-name"]',
  '[class$="-petal-name"]',
  '.chip',
].join(',');

const cardSelector = [
  '.note-item',
  '[class$="-note-item"]',
  '.crystal-card',
  '[class$="-crystal-card"]',
  '[class*="-noir-card"]',
  '[class*="-heritage-tag"]',
  '.chip',
  '[class$="-chip"]',
  '[class*="-note-pill"]',
  '[class*="-note-card"]',
  '[class*="-ingredient-card"]',
  '[class$="-leaf"]',
  '[class$="-star-note"]',
  '[class$="-petal"]',
  '[class$="-petal-inner"]',
  '.enhanced-ingredient-tag',
  '.ingredient-pill',
  '.selected-ingredient-pill',
  '.suggestion-item',
].join(',');

const suspiciousGeneric = new Set([
  'jasmine.png',
  'cedarwood.png',
  'Musc.png',
  'amber.png',
  'Romarin.png',
  'Benjoin.png',
  'spices.png',
  'sea.png',
  'silex.webp',
  'tonka.png',
]);

const rowsByName = new Map();

for (const node of document.querySelectorAll(nameSelectors)) {
  const name = node.textContent.trim().replace(/\s+/g, ' ');
  if (!name) continue;
  const card = node.closest(cardSelector) || node.parentElement;
  const img = card?.querySelector('img.note-real-image');
  if (!img) continue;
  const src = img.getAttribute('src') || '';
  const file = decodeURIComponent(path.basename(src));
  const section = node.closest('section[id]')?.id || 'global';
  const key = name.toLowerCase();
  if (!rowsByName.has(key)) {
    rowsByName.set(key, { name, image: src, file, sections: new Set(), count: 0 });
  }
  const row = rowsByName.get(key);
  row.sections.add(section);
  row.count += 1;
}

const rows = [...rowsByName.values()].map((row) => ({
  ...row,
  sections: [...row.sections].sort(),
  suspicious: suspiciousGeneric.has(row.file),
})).sort((a, b) => a.name.localeCompare(b.name));

const suspicious = rows.filter((row) => row.suspicious);
const missingAssets = rows.filter((row) => !fs.existsSync(path.join('images', 'notes', row.file)));

fs.writeFileSync('scripts/note-image-semantic-audit.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalUniqueNotes: rows.length,
  suspiciousCount: suspicious.length,
  missingAssets,
  suspicious,
  rows,
}, null, 2));

console.log(`uniqueNotes ${rows.length}`);
console.log(`missingAssets ${missingAssets.length}`);
console.log(`suspiciousGenericMappings ${suspicious.length}`);
for (const row of suspicious) {
  console.log(`${row.name}\t${row.file}\tcount=${row.count}\tsections=${row.sections.slice(0, 5).join(',')}`);
}
