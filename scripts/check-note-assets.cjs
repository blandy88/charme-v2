const fs = require('fs');
const path = require('path');

const resolver = fs.readFileSync('js/note-image-resolver.js', 'utf8');
const matches = [...resolver.matchAll(/:\s*"([^"]+\.(?:png|webp))"/g)].map((match) => match[1]);
const files = [...new Set(matches)];
const missing = files.filter((file) => !fs.existsSync(path.join('images', 'notes', file)));

console.log(`mapped files ${files.length}`);
if (missing.length) {
  console.log('missing');
  console.log(missing.join('\n'));
  process.exitCode = 1;
} else {
  console.log('missing 0');
}
