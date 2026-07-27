const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const replacements = [
  {
    file: 'ysl-y-edp.png',
    name: 'Yves Saint Laurent Y Eau de Parfum',
    source: 'https://www.clickandcare.ch/media/1a/8c/f3/1743639140/yves-saint-laurent-y-eau-de-parfum-60ml.png?ts=1750153987',
    page: 'https://www.clickandcare.ch/de/marken/yves-saint-laurent/yves-saint-laurent-y-eau-de-parfum-60ml',
    title: 'Yves Saint Laurent Y Eau de Parfum - 60ml - clickandcare.ch',
  },
  {
    file: 'burberry-hero.png',
    name: 'Burberry Hero Eau de Parfum',
    source: 'https://res.cloudinary.com/beleza-na-web/image/upload/w_1500,f_auto,fl_progressive,q_auto:eco,w_800/v1/imagens/product/20052417/e84fb456-484f-449a-8201-84d7e7827f6f-hero-burberry-eau-de-parfum-perfume-masculino-100ml.png',
    page: 'https://www.lojasrede.com.br/burberry-hero-eau-de-parfum-perfume-masculino-1vt7429179x22634/p',
    title: 'Burberry Hero Eau de Parfum - Perfume Masculino - Lojas Rede',
  },
  {
    file: 'valentino-donna.png',
    name: 'Valentino Donna Born in Roma',
    source: 'https://media.ulta.com/i/ulta/2568846?w=720&fmt=png',
    page: 'https://www.ulta.com/p/donna-born-in-roma-eau-de-parfum-pimprod2016295',
    title: 'Donna Born In Roma Eau de Parfum - Valentino | Ulta Beauty',
  },
  {
    file: 'gucci-guilty.png',
    name: 'Gucci Guilty Pour Homme Eau de Toilette',
    source: 'https://parfembox.rs/wp-content/uploads/2025/03/gucci-guilty-pour-homme-90ml-edt.png',
    page: 'https://parfembox.rs/proizvod/gucci-guilty-pour-homme-90ml-edt/',
    title: 'Gucci Guilty Pour Homme 90ml EDT | Parfem Box',
  },
  {
    file: 'mugler-pure-havane.png',
    name: 'Mugler A*Men Pure Havane',
    source: 'https://images.weserv.nl/?url=inter.mugler.com/dw/image/v2/BDCR_PRD/on/demandware.static/-/Sites-mugler-master-catalog/default/dwe883b7e6/images/pdp/M020101013/3439600025828_main.png',
    page: 'https://inter.mugler.com/default/fragrance/selections/best-sellers/a-men-pure-havane/M020101013.html',
    title: 'A*MEN PURE HAVANE - MUGLER Fragrances',
  },
];

async function verify(buffer) {
  const image = sharp(buffer, { limitInputPixels: 80_000_000 }).rotate();
  const metadata = await image.metadata();
  const { data, info } = await image.ensureAlpha().resize({ width: Math.min(metadata.width || 0, 900), withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let clearPixels = 0;
  for (let i = channels - 1; i < data.length; i += channels) {
    if (data[i] < 16) clearPixels += 1;
  }
  const alphaAt = (x, y) => data[(y * info.width + x) * channels + channels - 1];
  const corners = [alphaAt(0, 0), alphaAt(info.width - 1, 0), alphaAt(0, info.height - 1), alphaAt(info.width - 1, info.height - 1)];
  const transparentCorners = corners.filter((alpha) => alpha < 16).length;
  const clearRatio = clearPixels / (info.width * info.height);
  if (transparentCorners < 3 && clearRatio < 0.05) {
    throw new Error(`not transparent enough: clearRatio=${clearRatio}, corners=${transparentCorners}`);
  }
  return { width: metadata.width, height: metadata.height, format: metadata.format, clearRatio, transparentCorners };
}

(async () => {
  const reportPath = path.join(__dirname, 'image-import-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  for (const replacement of replacements) {
    const response = await fetch(replacement.source, {
      headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/png,image/*,*/*' },
    });
    if (!response.ok) throw new Error(`${replacement.file}: HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const verification = await verify(buffer);
    await sharp(buffer, { limitInputPixels: 80_000_000 }).rotate().png().toFile(path.join(__dirname, '..', replacement.file));
    const entry = report.results.find((item) => item.file === replacement.file);
    Object.assign(entry, {
      status: 'downloaded',
      name: replacement.name,
      source: replacement.source,
      page: replacement.page,
      title: replacement.title,
      query: 'targeted exact replacement',
      verification,
    });
    console.log(`replaced ${replacement.file}`);
  }

  fs.writeFileSync(reportPath, JSON.stringify({ ...report, generatedAt: new Date().toISOString() }, null, 2));
})();
