const sharp = require('sharp');
const path = require('path');

const report = require('./image-import-report.json').results;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function checkerboard(width, height, size = 20) {
  const svg = [`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`];
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const fill = ((x / size + y / size) % 2 === 0) ? '#f0f0f0' : '#cfcfcf';
      svg.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}"/>`);
    }
  }
  svg.push('</svg>');
  return Buffer.from(svg.join(''));
}

(async () => {
  const thumbs = [];
  for (const [index, item] of report.entries()) {
    const label = Buffer.from(`
      <svg width="240" height="70" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <text x="4" y="16" font-family="Arial" font-size="12" fill="#111">${escapeXml(item.file)}</text>
        <text x="4" y="34" font-family="Arial" font-size="10" fill="#333">${escapeXml(item.name).slice(0, 42)}</text>
        <text x="4" y="52" font-family="Arial" font-size="9" fill="#666">${escapeXml(item.title).slice(0, 48)}</text>
      </svg>
    `);
    const tileBackground = await checkerboard(240, 190, 12);
    const cutout = await sharp(path.resolve(__dirname, '..', item.file))
      .resize({
        width: 160,
        height: 180,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

    const input = await sharp(tileBackground)
      .extend({
        top: 0,
        bottom: 80,
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .composite([
        { input: cutout, top: 10, left: 40 },
        { input: label, top: 190, left: 0 },
      ])
      .png()
      .toBuffer();

    thumbs.push({ input, top: Math.floor(index / 5) * 270, left: (index % 5) * 240 });
  }

  await sharp({
    create: {
      width: 1200,
      height: Math.ceil(report.length / 5) * 270,
      channels: 4,
      background: 'white',
    },
  })
    .composite(thumbs)
    .png()
    .toFile('C:/Users/cheri/AppData/Local/Temp/opencode/fragrance-contact-sheet.png');
})();
