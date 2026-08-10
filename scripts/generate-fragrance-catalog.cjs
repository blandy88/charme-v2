#!/usr/bin/env node
/* Generates js/fragrance-catalog-data.js from the Dart Fragrance data files.
 * Parses Fragrance(...) named-argument blocks across all 7 data files,
 * dedupes by normalized `brand::name`, and emits a browser global.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'charme_app', 'lib', 'data');
const OUT_FILE = path.join(__dirname, '..', 'js', 'fragrance-catalog-data.js');

const DATA_FILES = [
  'fragrances_pdm.dart',
  'fragrances_niche.dart',
  'fragrances_designer_a.dart',
  'fragrances_designer_b.dart',
  'fragrances_affordable.dart',
  'fragrances_extra.dart',
  'fragrances_expansion.dart',
];

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    // comments
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let start = i;
      i++;
      let raw = '';
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) {
          const esc = src[i + 1];
          if (esc === 'n') raw += '\n';
          else if (esc === 't') raw += '\t';
          else if (esc === 'r') raw += '\r';
          else if (esc === quote || esc === '\\' || esc === "'" || esc === '"') raw += esc;
          else raw += esc;
          i += 2;
          continue;
        }
        if (src[i] === quote) break;
        raw += src[i];
        i++;
      }
      i++; // closing quote
      tokens.push({ type: 'string', value: raw, start });
      continue;
    }
    if (/\d/.test(ch)) {
      let j = i;
      while (j < n && /[\d.eE+-]/.test(src[j])) j++;
      if (src.slice(i, j) === '-' || src.slice(i, j) === '+') { i++; continue; }
      tokens.push({ type: 'number', value: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === 'true') tokens.push({ type: 'boolean', value: true });
      else if (word === 'false') tokens.push({ type: 'boolean', value: false });
      else if (word === 'null') tokens.push({ type: 'null', value: null });
      else tokens.push({ type: 'identifier', value: word });
      i = j;
      continue;
    }
    if (ch === '(' || ch === ')' || ch === '[' || ch === ']' || ch === '{' || ch === '}' || ch === ',' || ch === ':') {
      tokens.push({ type: ch });
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

function parseValue(tokens, pos) {
  const t = tokens[pos];
  if (!t) return { value: undefined, pos };
  if (t.type === 'string' || t.type === 'number' || t.type === 'boolean' || t.type === 'null') {
    return { value: t.value, pos: pos + 1 };
  }
  if (t.type === 'identifier') {
    // bare identifier (e.g. an unquoted symbol) -> treat as string
    return { value: t.value, pos: pos + 1 };
  }
  if (t.type === '[') {
    const arr = [];
    let p = pos + 1;
    while (p < tokens.length && tokens[p].type !== ']') {
      const r = parseValue(tokens, p);
      arr.push(r.value);
      p = r.pos;
      if (tokens[p] && tokens[p].type === ',') p++;
    }
    return { value: arr, pos: p + 1 };
  }
  if (t.type === '{') {
    const map = {};
    let p = pos + 1;
    while (p < tokens.length && tokens[p].type !== '}') {
      const kt = tokens[p];
      let key;
      if (kt.type === 'string') key = kt.value;
      else if (kt.type === 'identifier' || kt.type === 'number') key = String(kt.value);
      p++;
      if (tokens[p] && tokens[p].type === ':') p++;
      const r = parseValue(tokens, p);
      map[key] = r.value;
      p = r.pos;
      if (tokens[p] && tokens[p].type === ',') p++;
    }
    return { value: map, pos: p + 1 };
  }
  return { value: undefined, pos: pos + 1 };
}

function normalizeName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

function extractFragranceBlocks(tokens) {
  const blocks = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.type === 'identifier' && t.value === 'Fragrance' && tokens[i + 1].type === '(') {
      let depth = 0;
      let p = i + 1;
      const start = p;
      while (p < tokens.length) {
        if (tokens[p].type === '(') depth++;
        else if (tokens[p].type === ')') {
          depth--;
          if (depth === 0) break;
        }
        p++;
      }
      const blockTokens = tokens.slice(start, p + 1);
      const args = {};
      let j = 1; // skip '('
      while (j < blockTokens.length - 1) {
        const kt = blockTokens[j];
        if ((kt.type === 'identifier' || kt.type === 'string') && blockTokens[j + 1] && blockTokens[j + 1].type === ':') {
          const key = kt.type === 'string' ? kt.value : kt.value;
          const r = parseValue(blockTokens, j + 2);
          args[key] = r.value;
          j = r.pos;
          if (blockTokens[j] && blockTokens[j].type === ',') j++;
        } else {
          j++;
        }
      }
      blocks.push(args);
      i = p;
    }
  }
  return blocks;
}

const all = [];
for (const file of DATA_FILES) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, 'utf8');
  const tokens = tokenize(src);
  const blocks = extractFragranceBlocks(tokens);
  for (const b of blocks) {
    b._file = file;
    all.push(b);
  }
}

// Dedupe by normalized brand::name (mirrors Fragrance.id logic)
const seen = new Map();
const deduped = [];
for (const b of all) {
  const id = normalizeName(b.brand) + '::' + normalizeName(b.name);
  if (!seen.has(id)) {
    seen.set(id, b);
    deduped.push(b);
  }
}

function clean(s) {
  return typeof s === 'string' ? s.trim() : '';
}

const out = [];
for (const b of deduped) {
  const sizes = b.sizes && typeof b.sizes === 'object'
    ? Object.entries(b.sizes).map(([k, v]) => ({ size: k, price: typeof v === 'number' ? v : parseFloat(v) || null }))
    : [];
  out.push({
    name: clean(b.name),
    brand: clean(b.brand),
    family: clean(b.family),
    description: clean(b.description),
    ingredients: Array.isArray(b.ingredients) ? b.ingredients.map(clean).filter(Boolean) : [],
    year: typeof b.year === 'number' ? b.year : null,
    perfumer: clean(b.perfumer),
    concentration: clean(b.concentration),
    sizes,
    available: b.available === true,
  });
}

const output = `/* AUTO-GENERATED by scripts/generate-fragrance-catalog.cjs — do not edit by hand. */
(function (global) {
  global.FRAGRANCE_CATALOG_DATA = ${JSON.stringify(out, null, 2)};
})(typeof window !== 'undefined' ? window : this);
`;

fs.writeFileSync(OUT_FILE, output, 'utf8');

console.log(`Raw blocks: ${all.length}`);
console.log(`Deduped entries: ${deduped.length}`);
console.log(`Wrote ${OUT_FILE}`);
