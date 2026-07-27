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

const noteNameSelector = [
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

const sectionRows = [];
const misses = [];

for (const section of document.querySelectorAll('section[id]')) {
  const id = section.id;
  const names = [...section.querySelectorAll(noteNameSelector)].filter((node) => {
    const text = node.textContent.trim();
    if (!text) return false;
    const cls = node.className || '';
    if (/review|quality|indicator|profile|user/i.test(cls)) return false;
    return true;
  });

  if (!names.length) continue;

  let hydrated = 0;
  let missing = 0;
  for (const name of names) {
    const card = name.closest('.note-item, [class$="-note-item"], .crystal-card, [class$="-crystal-card"], [class*="-noir-card"], [class*="-heritage-tag"], .chip, [class$="-chip"], [class*="-note-pill"], [class*="-note-card"], [class*="-ingredient-card"], [class$="-leaf"], [class$="-star-note"], [class$="-petal"], [class$="-petal-inner"], .enhanced-ingredient-tag, .ingredient-pill, .selected-ingredient-pill, .suggestion-item') || name.parentElement;
    const image = card?.querySelector('img.note-real-image');
    if (image) {
      hydrated++;
    } else {
      missing++;
      misses.push({
        section: id,
        text: name.textContent.trim(),
        className: name.className,
        parentClass: name.parentElement?.className || '',
        cardClass: card?.className || '',
      });
    }
  }

  sectionRows.push({ section: id, total: names.length, hydrated, missing });
}

const summary = {
  generatedAt: new Date().toISOString(),
  sections: sectionRows,
  misses,
};

fs.writeFileSync('scripts/note-hydration-section-audit.json', JSON.stringify(summary, null, 2));
console.log(`sections ${sectionRows.length}`);
console.log(`totalNotes ${sectionRows.reduce((sum, row) => sum + row.total, 0)}`);
console.log(`missing ${misses.length}`);
for (const row of sectionRows.filter((row) => row.missing > 0)) {
  console.log(`${row.section}\ttotal=${row.total}\thydrated=${row.hydrated}\tmissing=${row.missing}`);
}
if (misses.length) process.exitCode = 1;
