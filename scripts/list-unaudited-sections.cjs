const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const sections = [];
const regex = /<section[^>]+id="([^"]+)"/g;
let match;
while ((match = regex.exec(html))) sections.push(match[1]);

const audited = new Set(require('./note-hydration-section-audit.json').sections.map((section) => section.section));
const notAudited = sections.filter((section) => !audited.has(section));

console.log(`sections ${sections.length}`);
console.log(`notAudited ${notAudited.length}`);
console.log(notAudited.join('\n'));
