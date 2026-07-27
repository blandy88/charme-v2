const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(__dirname, 'image-import-report.json');

const ITEMS = [
  { file: 'ysl-y-edp.png', name: 'Yves Saint Laurent Y Eau de Parfum', groups: [['yves saint laurent', 'ysl'], [' y ', 'y eau de parfum', 'y edp']], forbidden: ['intense', 'le parfum', 'eau de toilette', 'edt'] },
  { file: 'acqua-di-gio-profumo.png', name: 'Giorgio Armani Acqua di Gio Profumo', groups: [['armani', 'giorgio armani'], ['acqua di gio'], ['profumo']] },
  { file: 'dg-the-one-edp.png', name: 'Dolce and Gabbana The One Eau de Parfum', groups: [['dolce', 'gabbana', 'd&g'], ['the one'], ['eau de parfum', 'edp']], forbidden: ['intense', 'royal night', 'grey'] },
  { file: 'versace-eros.png', name: 'Versace Eros', groups: [['versace'], ['eros']] },
  { file: 'jpg-ultra-male.png', name: 'Jean Paul Gaultier Ultra Male', groups: [['jean paul gaultier', 'gaultier', 'jpg'], ['ultra male']] },
  { file: 'paco-rabanne-invictus.png', name: 'Paco Rabanne Invictus', groups: [['paco rabanne', 'rabanne'], ['invictus']] },
  { file: 'valentino-uomo.png', name: 'Valentino Uomo Born in Roma', groups: [['valentino'], ['uomo'], ['born in roma']], forbidden: ['intense', 'coral fantasy', 'yellow dream'] },
  { file: 'spicebomb-extreme.png', name: 'Viktor Rolf Spicebomb Extreme', groups: [['viktor', 'rolf'], ['spicebomb'], ['extreme']] },
  { file: 'montblanc-explorer.png', name: 'Montblanc Explorer', groups: [['montblanc', 'mont blanc'], ['explorer']], forbidden: ['platinum', 'ultra blue'] },
  { file: 'bvlgari-man-in-black.png', name: 'Bvlgari Man in Black', groups: [['bvlgari', 'bulgari'], ['man in black']] },
  { file: 'dior-homme-intense.png', name: 'Dior Homme Intense', groups: [['dior'], ['homme'], ['intense']] },
  { file: 'chanel-allure-sport.png', name: 'Chanel Allure Homme Sport Eau de Toilette', groups: [['chanel'], ['allure homme sport'], ['eau de toilette', 'edt']], forbidden: ['cologne', 'eau extreme', 'eau extrême', 'blanche'] },
  { file: 'tom-ford-tuscan-leather.png', name: 'Tom Ford Tuscan Leather', groups: [['tom ford'], ['tuscan leather']] },
  { file: 'armani-code-absolu.png', name: 'Giorgio Armani Code Absolu', groups: [['armani', 'giorgio armani'], ['code'], ['absolu']] },
  { file: 'guerlain-lhomme-ideal.png', name: "Guerlain L'Homme Ideal Eau de Parfum", groups: [['guerlain'], ['homme ideal', "l'homme ideal", 'lhomme ideal'], ['eau de parfum', 'edp']], forbidden: [' le parfum ', 'parfum spr', 'extreme', 'extrême', 'cologne forte', 'duo ', 'gift set'] },
  { file: 'terre-dhermes.png', name: "Hermes Terre d'Hermes Eau de Toilette", groups: [['hermes', 'hermès'], ['terre'], ['eau de toilette', 'edt']], forbidden: ['eau givree', 'eau givrée', 'intense vetiver', 'eau intense', 'parfum'] },
  { file: 'givenchy-gentleman.png', name: 'Givenchy Gentleman Eau de Parfum', groups: [['givenchy'], ['gentleman'], ['eau de parfum', 'edp']], forbidden: ['reserve', 'réserve', 'boisee', 'boisée', 'society', 'intense', 'privee', 'privée'] },
  { file: 'azzaro-most-wanted.png', name: 'Azzaro The Most Wanted', groups: [['azzaro'], ['most wanted']], forbidden: ['wanted by night', 'chrome', 'sport'] },
  { file: 'k-by-dg.png', name: 'Dolce and Gabbana K by Dolce Gabbana', groups: [['dolce', 'gabbana', 'd&g'], [' k ', 'k by']], forbidden: ['intense'] },
  { file: 'issey-miyake-pour-homme.png', name: "Issey Miyake L'Eau d'Issey Pour Homme", groups: [['issey miyake'], ['pour homme']] },
  { file: 'carolina-herrera-bad-boy.png', name: 'Carolina Herrera Bad Boy', groups: [['carolina herrera'], ['bad boy']], forbidden: ['cobalt', 'elixir', 'le parfum', 'extreme'] },
  { file: 'ysl-libre.png', name: 'Yves Saint Laurent Libre', groups: [['yves saint laurent', 'ysl'], ['libre']] },
  { file: 'margiela-fireplace.png', name: "Maison Margiela By the Fireplace", groups: [['margiela'], ['fireplace']] },
  { file: 'prada-luna-rossa-carbon.png', name: 'Prada Luna Rossa Carbon', groups: [['prada'], ['luna rossa'], ['carbon']] },
  { file: 'burberry-hero.png', name: 'Burberry Hero Eau de Parfum', groups: [['burberry'], ['hero'], ['eau de parfum', 'edp']], forbidden: ['parfum intense', 'edt', 'eau de toilette', 'gift set'] },
  { file: 'narciso-bleu-noir.png', name: 'Narciso Rodriguez For Him Bleu Noir', groups: [['narciso'], ['for him'], ['bleu noir']], forbidden: ['parfum', 'extreme', 'extrême'] },
  { file: 'ck-eternity.png', name: 'Calvin Klein Eternity', groups: [['calvin klein', 'ck'], ['eternity']] },
  { file: 'gucci-guilty.png', name: 'Gucci Guilty Pour Homme', groups: [['gucci'], ['guilty'], ['pour homme']], forbidden: ['intense', 'elixir', 'absolute', 'black', 'love edition', 'femme'] },
  { file: 'valentino-donna.png', name: 'Valentino Donna Born in Roma', groups: [['valentino'], ['donna'], ['born in roma']], forbidden: ['intense', 'coral fantasy', 'yellow dream', 'gold'] },
  { file: 'creed-green-irish-tweed.png', name: 'Creed Green Irish Tweed', groups: [['creed'], ['green irish tweed']] },
  { file: 'chanel-egoiste.png', name: 'Chanel Egoiste', groups: [['chanel'], ['egoiste', 'égoïste']] },
  { file: 'mugler-pure-havane.png', name: 'Mugler A Men Pure Havane', groups: [['mugler', 'thierry mugler'], ['pure havane'], ['a men', 'a*men']] },
  { file: 'cartier-declaration.png', name: "Cartier Declaration d'un Soir", groups: [['cartier'], ['declaration', 'déclaration'], ["d'un soir", 'dun soir']], forbidden: ['haute fraicheur', 'parfum'] },
  { file: 'rasasi-la-yuqawam.png', name: 'Rasasi La Yuqawam', groups: [['rasasi'], ['la yuqawam']] },
  { file: 'mancera-cedrat-boise.png', name: 'Mancera Cedrat Boise', groups: [['mancera'], ['cedrat boise', 'cédrat boisé']] },
  { file: 'amouage-reflection-man.png', name: 'Amouage Reflection Man', groups: [['amouage'], ['reflection'], ['man']] },
  { file: 'pdm-sedley.png', name: 'Parfums de Marly Sedley', groups: [['parfums de marly', 'pdm'], ['sedley']] },
  { file: 'initio-side-effect.png', name: 'Initio Side Effect', groups: [['initio'], ['side effect']] },
  { file: 'xerjoff-naxos.png', name: 'Xerjoff Naxos', groups: [['xerjoff'], ['naxos']] },
  { file: 'mfk-grand-soir.png', name: 'Maison Francis Kurkdjian Grand Soir', groups: [['maison francis kurkdjian', 'mfk'], ['grand soir']] },
];

function decodeHtml(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeText(value) {
  return ` ${String(value || '')} `
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9&' ]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function metadataMatches(item, candidate) {
  const text = normalizeText([
    candidate.title,
    candidate.murl,
    candidate.purl,
    candidate.desc,
  ].join(' '));

  if ((item.forbidden || []).some((term) => text.includes(normalizeText(term).trim()))) {
    return false;
  }

  return item.groups.every((group) =>
    group.some((term) => text.includes(normalizeText(term).trim())),
  );
}

function bingSearchUrl(query) {
  const params = new URLSearchParams({
    q: query,
    qft: '+filterui:photo-transparent',
    form: 'IRFLTR',
  });
  return `https://www.bing.com/images/search?${params.toString()}`;
}

function extractDuckDuckGoToken(html) {
  const marker = 'vqd="';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const tokenStart = start + marker.length;
  const tokenEnd = html.indexOf('"', tokenStart);
  if (tokenEnd === -1) return null;
  return html.slice(tokenStart, tokenEnd);
}

async function duckDuckGoCandidates(item) {
  const queries = [
    `${item.name} transparent png perfume bottle`,
    `${item.name} png transparent`,
    `${item.name} perfume bottle isolated`,
  ];
  const candidates = [];
  const seen = new Set();

  for (const query of queries) {
    const page = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'accept-language': 'en-US,en;q=0.9',
        },
      },
    ).then((response) => response.text());

    const token = extractDuckDuckGoToken(page);
    if (!token) continue;

    const apiUrl =
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}` +
      `&vqd=${encodeURIComponent(token)}&f=type:transparent`;
    const response = await fetch(apiUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        referer: 'https://duckduckgo.com/',
      },
    });
    if (!response.ok) continue;
    const data = await response.json();
    for (const result of data.results || []) {
      const murl = result.image;
      if (!murl || seen.has(murl)) continue;
      seen.add(murl);
      candidates.push({
        murl,
        purl: result.url || '',
        title: result.title || '',
        desc: `${result.title || ''} ${result.url || ''}`,
        query,
      });
    }
  }

  return candidates.filter((candidate) => metadataMatches(item, candidate));
}

async function searchCandidates(item) {
  const queries = [
    `"${item.name}" transparent png perfume bottle`,
    `"${item.name}" png transparent`,
    `"${item.name}" bottle isolated png`,
  ];
  const seen = new Set();
  const candidates = await duckDuckGoCandidates(item);

  function addCandidate(candidate) {
    const murl = candidate.murl || candidate.imgurl;
    if (!murl || seen.has(murl)) return;
    seen.add(murl);
    candidates.push({
      murl,
      purl: candidate.purl || candidate.purl2 || '',
      title: candidate.t || candidate.pt || candidate.title || '',
      desc: candidate.desc || '',
      query: candidate.query,
    });
  }

  for (const query of queries) {
    const response = await fetch(bingSearchUrl(query), {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const html = await response.text();
    const regexes = [
      /m="([^"]+)"/g,
      /m='([^']+)'/g,
      /class="iusc"[^>]*m="([^"]+)"/g,
      /class='iusc'[^>]*m='([^']+)'/g,
    ];
    for (const regex of regexes) {
      for (const match of html.matchAll(regex)) {
        try {
          const parsed = JSON.parse(decodeHtml(match[1]));
          addCandidate({ ...parsed, query });
        } catch (_) {
          // Ignore non-JSON metadata blocks.
        }
      }
    }

    const inlineRegexes = [
      /"murl"\s*:\s*"([^"]+)"/g,
      /&quot;murl&quot;\s*:\s*&quot;([^&]+)&quot;/g,
    ];
    for (const regex of inlineRegexes) {
      for (const match of html.matchAll(regex)) {
        const murl = decodeHtml(match[1]).replace(/\\\//g, '/');
        const windowStart = Math.max(0, match.index - 700);
        const windowEnd = Math.min(html.length, match.index + 1800);
        const nearby = decodeHtml(html.slice(windowStart, windowEnd));
        addCandidate({ murl, title: nearby, desc: nearby, query });
      }
    }
  }

  return candidates.filter((candidate) => metadataMatches(item, candidate));
}

async function downloadCandidate(candidate) {
  const response = await fetch(candidate.murl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/png,image/*,*/*;q=0.8',
      referer: candidate.purl || 'https://www.bing.com/',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`not image content-type ${contentType}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function verifyTransparentImage(buffer) {
  const image = sharp(buffer, { limitInputPixels: 80_000_000 }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width < 160 || metadata.height < 160) {
    throw new Error(`image too small: ${metadata.width}x${metadata.height}`);
  }

  const { data, info } = await image
    .ensureAlpha()
    .resize({ width: Math.min(metadata.width, 900), withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const totalPixels = info.width * info.height;
  let transparentPixels = 0;
  let clearPixels = 0;
  for (let i = channels - 1; i < data.length; i += channels) {
    const alpha = data[i];
    if (alpha < 250) transparentPixels += 1;
    if (alpha < 16) clearPixels += 1;
  }

  const alphaAt = (x, y) => data[(y * info.width + x) * channels + channels - 1];
  const corners = [
    alphaAt(0, 0),
    alphaAt(info.width - 1, 0),
    alphaAt(0, info.height - 1),
    alphaAt(info.width - 1, info.height - 1),
  ];
  const transparentCorners = corners.filter((alpha) => alpha < 16).length;
  const transparentRatio = transparentPixels / totalPixels;
  const clearRatio = clearPixels / totalPixels;

  if (transparentCorners < 3 && clearRatio < 0.05) {
    throw new Error(
      `not transparent enough: clearRatio=${clearRatio.toFixed(4)}, transparentCorners=${transparentCorners}`,
    );
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    transparentRatio,
    clearRatio,
    transparentCorners,
  };
}

async function processItem(item) {
  const target = path.join(ROOT, item.file);
  if (fs.existsSync(target) && !process.argv.includes('--force')) {
    return { file: item.file, status: 'exists' };
  }

  const candidates = await searchCandidates(item);
  const failures = [];

  for (const candidate of candidates.slice(0, 30)) {
    try {
      const buffer = await downloadCandidate(candidate);
      const verification = await verifyTransparentImage(buffer);
      await sharp(buffer, { limitInputPixels: 80_000_000 })
        .rotate()
        .png()
        .toFile(target);
      return {
        file: item.file,
        status: 'downloaded',
        name: item.name,
        source: candidate.murl,
        page: candidate.purl,
        title: candidate.title,
        query: candidate.query,
        verification,
      };
    } catch (error) {
      failures.push({ source: candidate.murl, title: candidate.title, error: error.message });
    }
  }

  return {
    file: item.file,
    status: 'failed',
    name: item.name,
    candidates: candidates.length,
    failures: failures.slice(0, 10),
  };
}

async function main() {
  const results = [];
  for (const item of ITEMS) {
    process.stdout.write(`Searching ${item.file} ... `);
    const result = await processItem(item);
    results.push(result);
    console.log(result.status);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const failed = results.filter((result) => result.status === 'failed');
  console.log(`Downloaded ${results.filter((result) => result.status === 'downloaded').length} images.`);
  if (failed.length) {
    console.error(`Failed ${failed.length} images: ${failed.map((result) => result.file).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
