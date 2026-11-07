#!/usr/bin/env node
// Shared PNG fixture builder for the perfume-admin tests.
//
// These are *real* PNGs built from scratch (CRC32 + zlib scanlines), not
// copied files, so every validation branch can be exercised deterministically
// without shipping binary fixtures in the repo.
"use strict";

const zlib = require("zlib");

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let TABLE = null;
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function ihdr(width, height, colorType, bitDepth = 8) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(width, 0);
  b.writeUInt32BE(height, 4);
  b[8] = bitDepth;
  b[9] = colorType;
  b[10] = 0; // compression
  b[11] = 0; // filter
  b[12] = 0; // interlace
  return b;
}

/**
 * RGBA PNG. `alpha(x, y)` returns the alpha byte for each pixel, which lets
 * one builder produce a genuinely transparent bottle, a fully opaque image
 * and an entirely blank one.
 */
function rgba({ width = 128, height = 128, alpha = (x, y) => ((x + y) % 2 ? 0 : 255) } = {}) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      raw[o++] = 200;
      raw[o++] = 30;
      raw[o++] = 60;
      raw[o++] = alpha(x, y);
    }
  }
  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr(width, height, 6)),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Indexed-colour PNG with a tRNS chunk — transparent without an alpha channel. */
function paletteTransparency({ width = 128, height = 128 } = {}) {
  const plte = Buffer.from([200, 30, 60, 0, 0, 0]);
  const trns = Buffer.from([0, 255]);
  const raw = Buffer.alloc(height * (1 + width));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) raw[o++] = (x + y) % 2;
  }
  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr(width, height, 3)),
    chunk("PLTE", plte),
    chunk("tRNS", trns),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** APNG: valid PNG plus an acTL chunk, which the admin explicitly rejects. */
function animated() {
  const base = rgba();
  const acTL = Buffer.alloc(8);
  acTL.writeUInt32BE(2, 0); // num_frames
  acTL.writeUInt32BE(0, 4); // num_plays
  // Insert before the IDAT so the chunk scanner reaches it.
  const idat = base.indexOf("IDAT") - 4;
  return Buffer.concat([base.subarray(0, idat), chunk("acTL", acTL), base.subarray(idat)]);
}

module.exports = {
  SIG,
  chunk,
  crc32,
  rgba,
  paletteTransparency,
  animated,
  transparent: (opts) => rgba(opts),
  opaque: (opts) => rgba({ ...(opts || {}), alpha: () => 255 }),
  blank: (opts) => rgba({ ...(opts || {}), alpha: () => 0 }),
  rgbNoAlpha: ({ width = 128, height = 128 } = {}) => {
    const raw = Buffer.alloc(height * (1 + width * 3));
    let o = 0;
    for (let y = 0; y < height; y++) {
      raw[o++] = 0;
      for (let x = 0; x < width; x++) {
        raw[o++] = 200;
        raw[o++] = 30;
        raw[o++] = 60;
      }
    }
    return Buffer.concat([
      SIG,
      chunk("IHDR", ihdr(width, height, 2)),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  },
};
