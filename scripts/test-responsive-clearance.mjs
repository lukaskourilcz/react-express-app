import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { closeBrowserProcess } from './responsive-browser-process.mjs';
import { chromium } from '@playwright/test';
import { CLEARANCE } from './responsive-clearance.mjs';

// A surviving helper holds the inherited stderr open after its parent dies.
// Closing our browser must release both pipes without killing that helper.
const fixture = spawn(process.execPath, ['-e', `
  const {spawn} = require('node:child_process');
  const helper = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 15000)'],
    {stdio:['ignore','ignore','inherit']});
  console.log(helper.pid);
  setTimeout(() => {}, 15000);
`], {stdio:['ignore','pipe','pipe']});
let helperPid;
let deadline;
try {
  const [output] = await once(fixture.stdout, 'data');
  helperPid = Number(String(output).trim());
  assert(Number.isSafeInteger(helperPid) && helperPid > 0);
  const stopped = Promise.all([once(fixture.stdout, 'close'), once(fixture.stderr, 'close')]);
  closeBrowserProcess(fixture);
  await Promise.race([stopped, new Promise((_, reject) => {
    deadline = setTimeout(() => reject(new Error('Inherited Chrome pipes did not close')), 1000);
  })]);
  process.kill(helperPid, 0);
  console.log('PASS browser cleanup: inherited output pipes close while the helper survives');
} finally {
  clearTimeout(deadline);
  closeBrowserProcess(fixture);
  if (helperPid) { try { process.kill(helperPid, 'SIGKILL'); } catch { /* stopped */ } }
}

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
