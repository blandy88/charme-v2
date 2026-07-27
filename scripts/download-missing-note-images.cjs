const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'images', 'notes');

const items = [
  ['peach.png', 'peach fruit transparent png'],
  ['almond.png', 'almond transparent png'],
  ['ash.png', 'wood ash transparent png'],
  ['bamboo.png', 'bamboo leaves transparent png'],
  ['banana.png', 'banana fruit transparent png'],
  ['basil.png', 'basil leaves transparent png'],
  ['bay-leaf.png', 'bay leaf transparent png'],
  ['birch.png', 'birch bark transparent png'],
  ['birch-tar.png', 'birch tar resin transparent png'],
  ['black-cherry.png', 'black cherry transparent png'],
  ['black-orchid-note.png', 'black orchid flower transparent png'],
  ['black-truffle.png', 'black truffle transparent png'],
  ['caraway.png', 'caraway seeds transparent png'],
  ['cherry-liqueur.png', 'cherry liqueur glass transparent png'],
  ['clary-sage.png', 'clary sage transparent png'],
  ['cloves.png', 'cloves spice transparent png'],
  ['cumin.png', 'cumin seeds transparent png'],
  ['cypress.png', 'cypress branch transparent png'],
  ['dried-fruits.png', 'dried fruits transparent png'],
  ['dry-wood.png', 'dry wood transparent png'],
  ['fir-resin.png', 'fir resin transparent png'],
  ['freesia.png', 'freesia flower transparent png'],
  ['gardenia.png', 'gardenia flower transparent png'],
  ['heliotrope.png', 'heliotrope flower transparent png'],
  ['honeysuckle.png', 'honeysuckle flower transparent png'],
  ['jasmine-sambac.png', 'jasmine sambac flower transparent png'],
  ['labdanum.png', 'labdanum resin transparent png'],
  ['magnolia.png', 'magnolia flower transparent png'],
  ['mahogany.png', 'mahogany wood transparent png'],
  ['marine-accord.png', 'sea water splash transparent png'],
  ['mimosa.png', 'mimosa flower transparent png'],
  ['narcissus.png', 'narcissus flower transparent png'],
  ['oak.png', 'oak leaf acorn transparent png'],
  ['orchid.png', 'orchid flower transparent png'],
  ['oregano.png', 'oregano leaves transparent png'],
  ['sichuan-pepper.png', 'sichuan peppercorn transparent png'],
  ['spice-blend.png', 'mixed spices transparent png'],
  ['tobacco-leaf.png', 'tobacco leaf transparent png'],
  ['smoke.png', 'smoke cloud transparent png'],
  ['cacao.png', 'cacao beans transparent png'],
  ['hazelnut.png', 'hazelnut transparent png'],
  ['coffee.png', 'coffee beans transparent png'],
  ['wet-earth.png', 'soil earth transparent png'],
  ['honey.png', 'honey dipper transparent png'],
  ['juniper.png', 'juniper berries transparent png'],
  ['lavender.png', 'lavender flower transparent png'],
  ['lime.png', 'lime fruit transparent png'],
  ['water-lily.png', 'water lily flower transparent png'],
  ['oakmoss.png', 'oak moss transparent png'],
  ['patchouli.png', 'patchouli leaf transparent png'],
  ['pear.png', 'pear fruit transparent png'],
  ['pine.png', 'pine branch transparent png'],
  ['pine-wood.png', 'pine wood transparent png'],
  ['Raspberry.png', 'raspberry fruit transparent png'],
  ['rum.png', 'rum glass transparent png'],
  ['sage.png', 'sage leaves transparent png'],
  ['star-anise.png', 'star anise transparent png'],
  ['strawberry.png', 'strawberry transparent png'],
  ['thyme.png', 'thyme herb transparent png'],
  ['tuberose.png', 'tuberose flower transparent png'],
  ['violet.png', 'violet flower transparent png'],
  ['virginia-cedar.png', 'cedar wood transparent png'],
  ['walnut.png', 'walnut transparent png'],
];

function token(html) {
  const marker = 'vqd="';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const tokenStart = start + marker.length;
  const tokenEnd = html.indexOf('"', tokenStart);
  return tokenEnd === -1 ? null : html.slice(tokenStart, tokenEnd);
}

async function candidates(query) {
  const page = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US,en;q=0.9' },
  }).then((response) => response.text());
  const vqd = token(page);
  if (!vqd) return [];
  const data = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=type:transparent`, {
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://duckduckgo.com/' },
  }).then((response) => (response.ok ? response.json() : { results: [] }));
  return data.results || [];
}

async function verify(buffer) {
  const img = sharp(buffer, { limitInputPixels: 80_000_000 }).rotate().ensureAlpha();
  const meta = await img.metadata();
  if (!meta.width || !meta.height || meta.width < 120 || meta.height < 120) {
    throw new Error('too small');
  }
  const { data, info } = await img.resize({ width: Math.min(meta.width, 600), withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const alphaAt = (x, y) => data[(y * info.width + x) * channels + channels - 1];
  const corners = [alphaAt(0, 0), alphaAt(info.width - 1, 0), alphaAt(0, info.height - 1), alphaAt(info.width - 1, info.height - 1)];
  const transparentCorners = corners.filter((alpha) => alpha < 16).length;
  if (transparentCorners < 3) throw new Error('not transparent corners');
  return meta;
}

async function download(file, query) {
  const target = path.join(OUT_DIR, file);
  if (fs.existsSync(target)) return { file, status: 'exists' };
  for (const candidate of await candidates(query)) {
    try {
      const response = await fetch(candidate.image, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/png,image/*,*/*' } });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const meta = await verify(buffer);
      await sharp(buffer, { limitInputPixels: 80_000_000 }).rotate().png().toFile(target);
      return { file, status: 'downloaded', source: candidate.image, page: candidate.url, title: candidate.title, width: meta.width, height: meta.height };
    } catch (_) {
      // Try the next candidate.
    }
  }
  return { file, status: 'failed', query };
}

(async () => {
  const results = [];
  for (const [file, query] of items) {
    process.stdout.write(`${file} ... `);
    const result = await download(file, query);
    results.push(result);
    console.log(result.status);
  }
  fs.writeFileSync('scripts/note-image-download-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((result) => result.status === 'failed');
  if (failed.length) process.exitCode = 1;
})();
