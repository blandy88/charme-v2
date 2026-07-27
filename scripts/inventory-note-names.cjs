const fs = require('fs');

const names = new Set();
const html = fs.readFileSync('index.html', 'utf8');

for (const regex of [
  /class="[^"]*(?:note-name|crystal-name|ingredient-name)[^"]*"[^>]*>\s*([^<]+)/gi,
  /data-ingredient="([^"]+)"/gi,
]) {
  for (const match of html.matchAll(regex)) {
    const name = match[1].replace(/\s+/g, ' ').trim();
    if (name) names.add(name);
  }
}

const js = fs.readFileSync('js/ingredient-finder.js', 'utf8');
const objectMatch = js.match(/this\.ingredientIcons\s*=\s*\{([\s\S]*?)\n\s*\};/);
if (objectMatch) {
  const keyRegex = /["']([^"']+)["']\s*:/g;
  for (const match of objectMatch[1].matchAll(keyRegex)) {
    names.add(match[1]);
  }
}

const list = [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
fs.writeFileSync('scripts/note-name-inventory.json', JSON.stringify(list, null, 2));
console.log(`count ${list.length}`);
console.log(list.join('\n'));
