const sharp = require('sharp');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/clean-white-background-images.cjs <file...>');
  process.exit(1);
}

async function clean(file) {
  const { data, info } = await sharp(file, { limitInputPixels: 80_000_000 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const isNearlyWhite = a > 245 && min > 238 && max - min < 18;
    if (isNearlyWhite) {
      const whiteness = (min - 238) / 17;
      data[i + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - whiteness))));
    }
  }

  await sharp(data, { raw: info }).png().toFile(file);
  console.log(`cleaned ${file}`);
}

(async () => {
  for (const file of files) {
    await clean(file);
  }
})();
