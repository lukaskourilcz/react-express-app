import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { CLEARANCE } from './responsive-clearance.mjs';

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const measure = async (content) => {
    await page.setContent(`<style>
      body { margin: 0; }
      #ocean { position: fixed; bottom: 0; width: 100%; height: 40px; pointer-events: none; }
      .port { position: absolute; top: 0; width: 300px; height: 100px; overflow: auto; }
      .below { position: relative; top: 570px; margin: 0; height: 20px; }
    </style><div id="ocean"></div>${content}`);
    return page.evaluate(CLEARANCE);
  };
  const visible = await measure('<p class="below">Visible under the ocean</p>');
  assert.equal(visible.overlays, 1);
  assert(visible.covered.some((row) => row.text === 'Visible under the ocean'));

  const clipped = await measure('<div class="port"><p class="below">Outside the scrollport</p></div>');
  assert.equal(clipped.overlays, 1);
  assert.deepEqual(clipped.covered, []);

  const reachable = await measure('<div class="port" style="top:500px;height:100px"><p style="position:relative;top:70px;margin:0;height:20px">Visible inside the scrollport</p></div>');
  assert(reachable.covered.some((row) => row.text === 'Visible inside the scrollport'));

  const partial = await measure('<div class="port" style="top:500px;height:65px"><p style="position:relative;top:55px;margin:0;height:40px">Only five pixels overlap</p></div>');
  assert.equal(partial.covered.find((row) => row.text === 'Only five pixels overlap')?.overlap, 5);

  const hidden = await measure('<div class="port" style="overflow:hidden"><p class="below">Clipped without scrolling</p></div>');
  assert.deepEqual(hidden.covered, []);

  const horizontal = await measure('<div style="position:absolute;top:570px;left:0;width:100px;height:25px;overflow:hidden"><p style="position:relative;left:150px;width:100px;margin:0">Outside the horizontal clip</p></div>');
  assert.deepEqual(horizontal.covered, []);
  console.log('PASS ocean clearance: visible overlap, scroll clipping, reachable content, partial overlap, hidden and horizontal clipping');
} finally {
  await browser.close();
}
