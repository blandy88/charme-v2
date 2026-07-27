const sharp = require('sharp');

const replacements = [
  ['baccarat-rouge-540.png', 'https://www.franciskurkdjian.com/dw/image/v2/BJSB_PRD/on/demandware.static/-/Sites-mfk-master-catalog/default/dwd212d972/Packshots%202022/Rouge%20540/PACKSHOT_ROUGE_540_70ML_EDP_VUE1-FACE_FOND-TRANSPARENT_460x460.png?sw=640&sh=640&strip=false'],
  ['black-orchid.png', 'https://www.tomfordbeauty.it/wp-content/uploads/2022/11/888066000062_BLACK_ORCHID_50ML_TRANSPARENT_BUILD_v6-min-1568x1763.png'],
  ['aventus.png', 'https://website-transformer.baltzar.com/uploads/2019/11/Creed-Aventus-Eau-de-Parfum-100ml.png'],
  ['sauvage.png', 'https://media.alina-cosmetics.com/prod/media/c9/26/32/1665514620/3348901368254_1.png'],
  ['bleudechanel.png', 'https://www.nicepng.com/png/full/131-1313145_bleu-de-chanel-eau-de-parfum-perfume-bleu.png'],
  ['tobaccovanille.png', 'https://cdn2.easycosmetic.de/images/Produkte/D2/tom-ford-tobacco-vanille-edp-vapo-50ml.png'],
  ['oudwood.png', 'https://sdcdn.io/tf/tf_sku_T1XG01_2000x2000_0.png'],
  ['lanuit.png', 'https://media.ulta.com/i/ulta/2211462?w=720&fmt=png'],
  ['lostcherry.png', 'https://www.tomfordbeauty.com/cdn/shop/files/tf_sku_T8MK01_2000x2000_0.png?v=1774621239&width=2000'],
];

async function replace(file, source) {
  const response = await fetch(source, {
    headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/png,image/*,*/*' },
  });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer, { limitInputPixels: 80_000_000 }).rotate().png().toFile(file);
  console.log(`replaced ${file}`);
}

(async () => {
  for (const [file, source] of replacements) {
    await replace(file, source);
  }
})();
