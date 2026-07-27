const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const audit = require('./note-image-semantic-audit.json');
const rows = audit.rows;
const columns = 5;
const tileWidth = 260;
const tileHeight = 150;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function checkerboard(width, height, size = 12) {
  const svg = [`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`];
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      svg.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${((x / size + y / size) % 2 === 0) ? '#eeeeee' : '#cccccc'}"/>`);
    }
  }
  svg.push('</svg>');
  return Buffer.from(svg.join(''));
}

(async () => {
  const composites = [];
  for (const [index, row] of rows.entries()) {
    const imagePath = path.join(__dirname, '..', row.image);
    const icon = await sharp(imagePath)
      .resize({ width: 70, height: 70, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg width="${tileWidth}" height="70" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <text x="8" y="18" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(row.name).slice(0, 32)}</text>
        <text x="8" y="38" font-family="Arial" font-size="10" fill="#444">${escapeXml(row.file).slice(0, 36)}</text>
        <text x="8" y="56" font-family="Arial" font-size="9" fill="#777">count ${row.count} · ${escapeXml(row.sections.slice(0, 2).join(', ')).slice(0, 34)}</text>
      </svg>
    `);
    const tile = await sharp(checkerboard(tileWidth, 80))
      .extend({ top: 0, bottom: 70, left: 0, right: 0, background: 'white' })
      .composite([
        { input: icon, top: 6, left: 95 },
        { input: label, top: 80, left: 0 },
      ])
      .png()
      .toBuffer();
    composites.push({ input: tile, left: (index % columns) * tileWidth, top: Math.floor(index / columns) * tileHeight });
  }

  const output = 'C:/Users/cheri/AppData/Local/Temp/opencode/note-mapping-contact-sheet.png';
  await sharp({
    create: {
      width: columns * tileWidth,
      height: Math.ceil(rows.length / columns) * tileHeight,
      channels: 4,
      background: 'white',
    },
  }).composite(composites).png().toFile(output);
  console.log(output);
})();
