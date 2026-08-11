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

  // === 14 items needing better sources (downloaded from pngwing, no transparency) ===
  { file: 'ysl-black-opium.png', name: 'Yves Saint Laurent Black Opium', groups: [['yves saint laurent', 'ysl'], ['black opium']], forbidden: ['intense', 'le parfum', 'eau de toilette', 'edt', 'body', 'shower', 'shampoo', 'lotion'] },
  { file: 'kenzo-flower.png', name: 'Kenzo Flower Eau de Parfum', groups: [['kenzo'], ['flower', 'fleur']], forbidden: ['poppy', 'body', 'shower', 'lotion', 'shampoo', 'soap'] },
  { file: 'dg-limperatrice-3.png', name: "Dolce and Gabbana L'Imperatrice 3", groups: [['dolce', 'gabbana', 'd&g'], ['limperatrice', 'imperatrice']], forbidden: ['the one', 'light blue', 'intense', 'k by'] },
  { file: 'chanel-no5.png', name: 'Chanel No 5 Eau de Parfum', groups: [['chanel'], ['no 5', 'no5', 'n5', 'n°5', 'number 5']], forbidden: ['lotion', 'body', 'shower', 'shampoo', 'eau premiere', 'eau de toilette', 'edt'] },
  { file: 'lolita-lempicka-la-belle-paradise.png', name: 'Jean Paul Gaultier La Belle Paradise Garden', groups: [['jean paul gaultier', 'gaultier', 'jpg'], ['la belle'], ['paradise garden', 'paradise']], forbidden: ['lolita lempicka'] },
  { file: 'aqua-di-gio-elixir.png', name: 'Giorgio Armani Acqua di Gio Elixir', groups: [['armani', 'giorgio armani'], ['acqua di gio'], ['elixir']] },
  { file: 'xerjoff-torrino-21.png', name: 'Xerjoff Torino 21', groups: [['xerjoff'], ['torino', 'torino21', 'torrino21']] },
  { file: 'armani-prive-stellaris.png', name: 'Louis Vuitton Stellar Times', groups: [['louis vuitton', 'lv'], ['stellar times']], forbidden: ['stellaris', 'armani', 'prive', 'privé'] },
  { file: 'ch-power-of-you.png', name: 'Giorgio Armani Power of You', groups: [['giorgio armani', 'armani'], ['power of you']], forbidden: ['carolina herrera', 'bad boy', 'good girl', 'ch men'] },
  { file: 'guerlain-santal-royal.png', name: 'Guerlain Santal Royal', groups: [['guerlain'], ['santal royal']] },
  { file: 'lancome-tresor-la-nuit.png', name: 'Lancome Tresor La Nuit', groups: [['lancome', 'lancôme'], ['tresor', 'trésor'], ['la nuit']], forbidden: ['edt', 'eau de toilette'] },
  { file: 'jo-malone-myrrh-tonka.png', name: 'Jo Malone Myrrh and Tonka', groups: [['jo malone'], ['myrrh'], ['tonka']], forbidden: ['cologne', 'soap', 'body', 'shower', 'candle'] },
  { file: 'tom-ford-noir-extreme.png', name: 'Tom Ford Noir Extreme', groups: [['tom ford'], ['noir extreme', 'noir extrême']], forbidden: ['parfum', 'beau de jour', 'ombre leather', 'tuscan leather', 'oud wood', 'lost cherry'] },
  { file: 'viktor-rolf-flowerbomb-extreme.png', name: 'Viktor and Rolf Flowerbomb Extreme', groups: [['viktor', 'rolf'], ['flowerbomb'], ['extreme']], forbidden: ['spicebomb', 'midnight', 'edt', 'eau de toilette'] },

  // === Newly discovered white-background placeholders ===
  { file: '1-million-night.png', name: 'Paco Rabanne 1 Million Night', groups: [['paco rabanne', 'rabanne'], ['1 million', 'one million'], ['night']] },
  { file: '1-million-temp.png', name: 'Paco Rabanne 1 Million Temper or Temptation', groups: [['paco rabanne', 'rabanne'], ['1 million', 'one million'], ['temp', 'temptation', 'temper']] },
  { file: 'armani-code-parfum.png', name: 'Giorgio Armani Code Parfum', groups: [['armani', 'giorgio armani'], ['code'], ['parfum']], forbidden: ['absolu', 'colonia', 'edt'] },
  { file: 'armani-si-passione-intense.png', name: 'Giorgio Armani Si Passione Intense', groups: [['armani', 'giorgio armani'], ['si passione', 'passione'], ['intense']], forbidden: ['edp', 'eau de parfum', 'absolu'] },
  { file: 'dg-light-blue.png', name: 'Dolce and Gabbana Light Blue', groups: [['dolce', 'gabbana', 'd&g'], ['light blue']], forbidden: ['intense', 'sun', 'edt', 'eau de toilette', 'the one', 'pour homme'] },
  { file: 'mugler-alien.png', name: 'Mugler Alien', groups: [['mugler', 'thierry mugler'], ['alien']] },
  { file: 'suspect-ch-power-of-you.png', name: 'Giorgio Armani Power of You suspect', groups: [['giorgio armani', 'armani'], ['power of you']], forbidden: ['carolina herrera'] },
  { file: 'ysl-mon-paris.png', name: 'Yves Saint Laurent Mon Paris', groups: [['yves saint laurent', 'ysl'], ['mon paris']], forbidden: ['intense', 'edt', 'edp', 'eau de parfum', 'body', 'lotion'] },

  // === 35 niche/designer perfumes (200x280 no-transparency thumbnails) ===
  { file: 'armani-pacific-chill.png', name: 'Louis Vuitton Pacific Chill', groups: [['louis vuitton', 'lv'], ['pacific chill']], forbidden: ['armani', 'prive', 'privé'] },
  { file: 'artisan-parfumeur-rose-amira.png', name: 'Guerlain Rose Amira', groups: [['guerlain'], ['rose amira']], forbidden: ['artisan parfumeur', "l'artisan parfumeur"] },
  { file: 'azzaro-wanted-elixir.png', name: 'Azzaro Wanted Elixir', groups: [['azzaro'], ['wanted'], ['elixir']], forbidden: ['most wanted', 'by night', 'chrome'] },
  { file: 'elie-saab-in-white.png', name: 'Elie Saab in White', groups: [['elie saab'], ['in white']], forbidden: ['absolu', 'shower', 'body', 'edp', 'eau de parfum'] },
  { file: 'gisada-ambassador.png', name: 'Gisada Ambassador', groups: [['gisada'], ['ambassador']] },
  { file: 'gisada-hudson-valley.png', name: 'Gissah Hudson Valley', groups: [['gissah'], ['hudson valley']], forbidden: ['gisada'] },
  { file: 'guerlain-oud-royal.png', name: 'Guerlain Oud Royal', groups: [['guerlain'], ['oud royal']] },
  { file: 'initio-phantom-in-red.png', name: 'Rabanne Phantom in Red', groups: [['rabanne', 'paco rabanne'], ['phantom in red', 'phantom red']], forbidden: ['initio'] },
  { file: 'kayali-freedom-musk.png', name: 'Kayali Freedom Musk', groups: [['kayali'], ['freedom musk']] },
  { file: 'kayali-vanilla-candy-rock-sugar.png', name: 'Kayali Vanilla Candy Rock Sugar', groups: [['kayali'], ['vanilla candy rock sugar', 'candy rock sugar']] },
  { file: 'kerosene-donna-extradose.png', name: 'Valentino Donna Born in Roma Extradose', groups: [['valentino'], ['donna'], ['born in roma'], ['extradose']], forbidden: ['kerosene'] },
  { file: 'kerosene-umo-extradose.png', name: 'Valentino Uomo Born in Roma Extradose', groups: [['valentino'], ['uomo', 'umo'], ['born in roma'], ['extradose']], forbidden: ['kerosene'] },
  { file: 'kilian-her-majesty.png', name: 'Kilian Her Majesty', groups: [['by kilian', 'kilian'], ['her majesty']] },
  { file: 'lattafa-assad-elixir.png', name: 'Lattafa Assad Elixir', groups: [['lattafa'], ['assad'], ['elixir']] },
  { file: 'lattafa-fantasmagoria.png', name: 'Lattafa Fantasmagoria', groups: [['lattafa'], ['fantasmagoria']] },
  { file: 'maison-crivelli-ambre-samar.png', name: 'Maison Crivelli Ambre Samar', groups: [['maison crivelli', 'crivelli'], ['ambre samar']] },
  { file: 'maison-crivelli-les-sables-roses.png', name: 'Louis Vuitton Les Sables Roses', groups: [['louis vuitton', 'lv'], ['les sables roses', 'sables roses']], forbidden: ['maison crivelli', 'crivelli'] },
  { file: 'marc-antoine-barrois-ganymede.png', name: 'Marc Antoine Barrois Ganymede', groups: [['marc antoine barrois'], ['ganymede']] },
  { file: 'matiere-premiere-vanilla-powder.png', name: 'Matiere Premiere Vanilla Powder', groups: [['matiere premiere'], ['vanilla powder']] },
  { file: 'narciso-cedar-chic.png', name: 'Carolina Herrera Cedar Chic', groups: [['carolina herrera'], ['cedar chic']], forbidden: ['narciso'] },
  { file: 'narciso-manifesto-elixir.png', name: 'Narciso Rodriguez Manifesto Elixir', groups: [['narciso'], ['manifesto'], ['elixir']] },
  { file: 'narciso-rodriguez-narciso.png', name: 'Narciso Rodriguez Narciso', groups: [['narciso rodriguez', 'narciso'], ['narciso'], ['rodriguez']], forbidden: ['bleu noir', 'for him', 'cedar chic', 'poudree', 'ambree'] },
  { file: 'nautica-voyage.png', name: 'Nautica Voyage', groups: [['nautica'], ['voyage']] },
  { file: 'orto-parisi-terroni.png', name: 'Orto Parisi Terroni', groups: [['orto parisi'], ['terroni']] },
  { file: 'paco-rabanne-fame-in-love.png', name: 'Paco Rabanne Fame in Love', groups: [['paco rabanne', 'rabanne'], ['fame'], ['in love']], forbidden: ['victory', 'phantom', 'invictus', 'pour homme', '1 million', 'one million'] },
  { file: 'paco-rabanne-guilty-elixir-femme.png', name: 'Gucci Guilty Elixir de Parfum Pour Femme', groups: [['gucci'], ['guilty'], ['elixir'], ['pour femme', 'femme']], forbidden: ['paco rabanne', 'rabanne'] },
  { file: 'raghba-cristal-noir.png', name: 'Versace Crystal Noir', groups: [['versace'], ['crystal noir', 'cristal noir']], forbidden: ['raghba', 'rasasi'] },
  { file: 'rosendo-mateu-no5.png', name: 'Rosendo Mateu No 5', groups: [['rosendo mateu'], ['no 5', 'no5', 'n5', 'number 5']] },
  { file: 'sisley-eau-du-soir.png', name: 'Sisley Eau du Soir', groups: [['sisley'], ['eau du soir']] },
  { file: 'spirit-of-dubai-elves.png', name: 'Louis Vuitton eLVes', groups: [['louis vuitton', 'lv'], ['elves', 'elves louis vuitton']], forbidden: ['spirit of dubai'] },
  { file: 'tom-ford-oud-voyager.png', name: 'Tom Ford Oud Wood Voyager', groups: [['tom ford'], ['oud wood', 'oudwood', 'oud'], ['voyager']] },
  { file: 'valentino-valentina-absolue.png', name: 'Valentino Valentina Absolue', groups: [['valentino'], ['valentina'], ['absolue']] },
  { file: 'valentino-valentina-poudre.png', name: 'Valentino Valentina Poudre', groups: [['valentino'], ['valentina'], ['poudre']] },
  { file: 'xerjoff-40-knots.png', name: 'Xerjoff 40 Knots', groups: [['xerjoff'], ['40 knots', 'forty knots']] },
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
  return `{{https://www.bing.com/images/search?${params.toString(}})}`;
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
      `{{https://duckduckgo.com/?q=${encodeURIComponent(query}})}&iax=images&ia=images`,
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
      `{{https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query}})}` +
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

async function fixWhiteFringe(buffer) {
  const image = sharp(buffer, { limitInputPixels: 80_000_000 }).rotate();
  const metadata = await image.metadata();
  const { data, info } = await image
    .ensureAlpha()
    .resize({ width: Math.min(metadata.width, 900), withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Smart decontamination: only fix pixels that are near-white (R,G,B > 200)
  // with semi-transparency (alpha < 245). These are white background remnants
  // from poor cutouts. Darken them to 30% to eliminate visible halos on dark backgrounds.
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i + info.channels - 1];
    if (a > 0 && a < 245 && r > 200 && g > 200 && b > 200) {
      data[i]     = Math.round(r * 0.3);
      data[i+1]   = Math.round(g * 0.3);
      data[i+2]   = Math.round(b * 0.3);
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
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
      const fixed = await fixWhiteFringe(buffer);
      await sharp(fixed, { limitInputPixels: 80_000_000 })
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

  let items = ITEMS;
  const targetsArg = process.argv.find((a) => a.startsWith('--targets='));
  if (targetsArg) {
    const targetNames = new Set(targetsArg.split('=')[1].split(',').map((s) => s.trim()));
    items = ITEMS.filter((item) => targetNames.has(item.file));
    if (items.length === 0) {
      console.error('No items matched --targets. Available files:', ITEMS.map((i) => i.file).join(', '));
      process.exit(1);
    }
    console.log(`Filtered to ${items.length} target items.`);
  }

  for (const item of items) {
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
