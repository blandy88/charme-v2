const fs = require('fs');
const sharp = require('sharp');

const report = require('./image-import-report.json').results;

async function audit(file) {
  const image = sharp(file, { limitInputPixels: 80_000_000 }).ensureAlpha();
  const { data, info } = await image
    .resize({ width: 500, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const width = info.width;
  const height = info.height;
  const total = width * height;
  let transparent = 0;
  let opaqueWhite = 0;
  let opaqueNearWhite = 0;

  const isBorder = (x, y) =>
    x < width * 0.08 || x > width * 0.92 || y < height * 0.08 || y > height * 0.92;
  let borderOpaqueWhite = 0;
  let borderPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 16) transparent++;
      if (a > 245 && r > 248 && g > 248 && b > 248) opaqueWhite++;
      if (a > 245 && r > 235 && g > 235 && b > 235) opaqueNearWhite++;
      if (isBorder(x, y)) {
        borderPixels++;
        if (a > 245 && r > 235 && g > 235 && b > 235) borderOpaqueWhite++;
      }
    }
  }

  const transparentRatio = transparent / total;
  const opaqueWhiteRatio = opaqueWhite / total;
  const opaqueNearWhiteRatio = opaqueNearWhite / total;
  const borderWhiteRatio = borderOpaqueWhite / borderPixels;

  // Fail if a cutout has very large opaque-white regions, or if its border is mostly white.
  const fails = opaqueNearWhiteRatio > 0.18 || borderWhiteRatio > 0.35;
  return {
    file,
    transparentRatio,
    opaqueWhiteRatio,
    opaqueNearWhiteRatio,
    borderWhiteRatio,
    fails,
  };
}

(async () => {
  const results = [];
  for (const item of report) {
    if (!fs.existsSync(item.file)) continue;
    results.push(await audit(item.file));
  }

  const failing = results.filter((item) => item.fails);
  fs.writeFileSync(
    'scripts/background-audit-report.json',
    JSON.stringify({ generatedAt: new Date().toISOString(), results, failing }, null, 2),
  );

  console.log(`audited ${results.length}, failing ${failing.length}`);
  for (const item of failing) {
    console.log(
      `${item.file}\tnearWhite=${item.opaqueNearWhiteRatio.toFixed(3)}\tborderWhite=${item.borderWhiteRatio.toFixed(3)}\ttransparent=${item.transparentRatio.toFixed(3)}`,
    );
  }
})();
