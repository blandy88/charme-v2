const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const { document, Node, MutationObserver } = dom.window;

global.window = dom.window;
global.document = document;
global.Node = Node;
global.MutationObserver = MutationObserver;

dom.window.eval(fs.readFileSync('js/note-image-resolver.js', 'utf8'));
dom.window.NoteImageResolver.hydrateStaticNotes(document);

const emojiRegex = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
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

const duplicates = [];

for (const card of document.querySelectorAll(cardSelector)) {
  if (!card.querySelector('img.note-real-image')) continue;
  const text = [...card.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)
    .map((node) => node.textContent || '')
    .join(' ');
  if (!emojiRegex.test(text)) continue;
  duplicates.push({
    section: card.closest('section[id]')?.id || '',
    className: card.className || '',
    text: text.replace(/\s+/g, ' ').trim().slice(0, 160),
    html: card.outerHTML.slice(0, 300),
  });
}

fs.writeFileSync('scripts/duplicate-note-icons-audit.json', JSON.stringify({ generatedAt: new Date().toISOString(), duplicates }, null, 2));
console.log(`duplicates ${duplicates.length}`);
for (const duplicate of duplicates.slice(0, 40)) {
  console.log(`${duplicate.section}\t${duplicate.className}\t${duplicate.text}`);
}
if (duplicates.length) process.exitCode = 1;
