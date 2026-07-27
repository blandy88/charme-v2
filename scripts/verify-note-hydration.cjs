const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });

global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.MutationObserver = dom.window.MutationObserver;

dom.window.eval(fs.readFileSync('js/note-image-resolver.js', 'utf8'));
dom.window.NoteImageResolver.hydrateStaticNotes(dom.window.document);

const images = dom.window.document.querySelectorAll(
  '.ingredient-icon img.note-real-image, .note-icon img.note-real-image, [class$="-note-icon"] img.note-real-image',
);

console.log(`hydratedImages ${images.length}`);
console.log([...images].slice(0, 12).map((img) => img.getAttribute('src')).join('\n'));

if (images.length < 100) {
  process.exitCode = 1;
}
