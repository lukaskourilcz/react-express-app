#!/usr/bin/env node
// Generate PLACEHOLDER raster assets (app icons, splash, OG image) as valid
// solid-colour PNGs, with no external dependencies (pure Node zlib).
//
// Why this exists: the PWA/OG pipeline needs real PNG files at specific paths
// and sizes, but the actual artwork (the StudyShark mascot) comes from
// Recraft/Ideogram — see NEEDED.md. These placeholders make every path resolve
// so the web app builds and links don't 404.
// Replace each file in place with the real artwork; keep the filenames.
//
// Run:  node scripts/gen-placeholder-assets.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BRAND = [45, 122, 45]; // #2d7a2d, the app theme-color

// CRC32 (PNG polynomial) — small table-based implementation.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Build a w×h solid-RGBA PNG. */
function solidPng(w, h, [r, g, b]) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10,11,12 = compression, filter, interlace = 0
  const row = Buffer.alloc(1 + w * 4);
  for (let x = 0; x < w; x++) {
    const o = 1 + x * 4;
    row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = 255;
  }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  // PWA / web (client/public)
  ['client/public/apple-touch-icon.png', 180, 180],
  ['client/public/icon-192.png', 192, 192],
  ['client/public/icon-512.png', 512, 512],
  ['client/public/og-image.png', 1200, 630],
];

for (const [path, w, h] of targets) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, solidPng(w, h, BRAND));
  console.log(`wrote ${path} (${w}×${h})`);
}
console.log('\nPlaceholders generated. Replace each with real artwork (keep filenames).');
