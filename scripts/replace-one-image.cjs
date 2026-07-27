const sharp = require('sharp');

const [file, source] = process.argv.slice(2);
if (!file || !source) {
  console.error('Usage: node scripts/replace-one-image.cjs <file> <source-url>');
  process.exit(1);
}

(async () => {
  const response = await fetch(source, {
    headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/png,image/*,*/*' },
  });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer, { limitInputPixels: 80_000_000 }).rotate().png().toFile(file);
  console.log(`replaced ${file}`);
})();
