#!/usr/bin/env node
// Renders client/public/og-image.png, the 1200×630 share image, from the V9
// brand kit: the horizontal logo at 46% of the width, centred on the pale
// brand background. Pass --dark for the white logo on ink instead.
//
// Deterministic: a fixed viewport, device scale 1, no fonts (the wordmark is
// outlines) and a PNG the script reads from client/public/brand/v9. Run it
// again after the kit changes and commit the result.
//
//   node scripts/render-og-image.mjs [--dark] [--out path.png]
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const dark = process.argv.includes('--dark');
const outIndex = process.argv.indexOf('--out');
const out = outIndex > 0 ? process.argv[outIndex + 1] : 'client/public/og-image.png';

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_WIDTH = Math.round(WIDTH * 0.46);
const background = dark ? '#132019' : '#F3F6F1';
const logoFile = `client/public/brand/v9/recommended/devshark-logo-horizontal-${dark ? 'white' : 'green'}.png`;
const logo = `data:image/png;base64,${readFileSync(logoFile).toString('base64')}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; background: ${background}; }
body { display: grid; place-items: center; }
img { width: ${LOGO_WIDTH}px; height: auto; display: block; }
</style></head><body><img alt="" src="${logo}"></body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.locator('img').evaluate((img) => img.decode());
  await page.screenshot({ path: out, type: 'png', omitBackground: false });
  console.log(`wrote ${out} (${WIDTH}×${HEIGHT}, logo ${LOGO_WIDTH}px on ${background})`);
} finally {
  await browser.close();
}
