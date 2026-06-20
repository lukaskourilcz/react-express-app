// Sweeps every major route at 4 viewport widths using Chrome DevTools Protocol
// device emulation. Reports horizontal overflow + the elements that cause it,
// plus checks for child boxes that punch outside their parent (visual cut-off
// or overlap). Captures a screenshot per (route × width) only when something
// goes wrong, so the artifact pile stays small.
//
// Run:   node scripts/check-responsive.mjs

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4173';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(SCRIPT_DIR, 'responsive-shots');

const ROUTES = ['/', '/learn', '/profile', '/leaderboard', '/cards', '/shop', '/play'];
const VIEWPORTS = [
  { label: '320x568', width: 320, height: 568, mobile: true }, // iPhone SE 1st gen
  { label: '390x844', width: 390, height: 844, mobile: true }, // iPhone 13/14
  { label: '768x1024', width: 768, height: 1024, mobile: false }, // iPad portrait
  { label: '1280x800', width: 1280, height: 800, mobile: false }, // laptop
];

async function waitFor(predicate, { timeout = 15000, interval = 200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await predicate()) return true;
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms`);
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function rpc(ws) {
  let id = 1;
  const pending = new Map();
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const reqId = id++;
      pending.set(reqId, { resolve, reject });
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
}

async function evaluate(call, expression) {
  const { result, exceptionDetails } = await call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

const PROBE = `(() => {
  const winW = window.innerWidth;
  const docW = document.documentElement.scrollWidth;
  const overflow = Math.max(0, docW - winW);

  // 1) Elements whose right edge punches past the viewport.
  const horizOffenders = [];
  if (overflow > 0) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > winW + 0.5) {
        horizOffenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 80),
          id: el.id || '',
          right: Math.round(r.right),
          width: Math.round(r.width),
          overshoot: Math.round(r.right - winW),
        });
        if (horizOffenders.length >= 12) break;
      }
    }
  }

  // 2) Children punching outside their parent's box (clipping / overlap risk).
  //    Skip overflow:visible parents (they intentionally let kids escape) and
  //    body itself (we already covered the viewport).
  const parentOffenders = [];
  const PARENT_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE']);
  const ROOT = document.body;
  function check(el) {
    if (!PARENT_TAGS.has(el.tagName)) return;
    const pr = el.getBoundingClientRect();
    if (pr.width === 0 || pr.height === 0) return;
    const style = getComputedStyle(el);
    if (style.overflow === 'visible' && style.overflowX === 'visible') return;
    for (const child of el.children) {
      const cr = child.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) continue;
      const overshoot = Math.max(0, cr.right - pr.right);
      if (overshoot > 1) {
        parentOffenders.push({
          parent: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).slice(0, 40) : ''),
          child: child.tagName.toLowerCase() + (child.className ? '.' + String(child.className).slice(0, 40) : ''),
          overshoot: Math.round(overshoot),
        });
        if (parentOffenders.length >= 8) return;
      }
    }
  }
  function walk(el) {
    check(el);
    for (const c of el.children) walk(c);
  }
  walk(ROOT);

  return { winW, docW, overflow, horizOffenders, parentOffenders };
})()`;

async function probeRoute(call, route, vp) {
  await call('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.mobile ? 2 : 1,
    mobile: vp.mobile,
  });
  await call('Page.navigate', { url: BASE + route });
  await waitFor(async () => (await evaluate(call, 'document.readyState')) === 'complete');
  // Give Suspense + lazy chunks a beat to settle.
  await new Promise((r) => setTimeout(r, 1500));
  const data = await evaluate(call, PROBE);
  return { route, viewport: vp.label, ...data };
}

async function screenshot(call, name) {
  const { data } = await call('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT_DIR, name);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const userData = mkdtempSync(path.join(tmpdir(), 'devquiz-resp-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userData}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try { chrome.kill('SIGTERM'); } catch { /* ignore */ }
    try { rmSync(userData, { recursive: true, force: true }); } catch { /* ignore */ }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  try {
    await waitFor(async () => {
      const tabs = await getJSON('http://127.0.0.1:9222/json');
      return Array.isArray(tabs) && tabs.some((t) => t.type === 'page');
    });
    const tabs = await getJSON('http://127.0.0.1:9222/json');
    const tab = tabs.find((t) => t.type === 'page');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r) => ws.once('open', r));
    const call = rpc(ws);
    await call('Page.enable');
    await call('Runtime.enable');

    const results = [];
    for (const vp of VIEWPORTS) {
      for (const route of ROUTES) {
        const r = await probeRoute(call, route, vp);
        results.push(r);
        const broken = r.overflow > 0 || r.parentOffenders.length > 0;
        const tag = broken ? 'FAIL' : 'OK';
        process.stdout.write(`  ${tag.padEnd(5)} ${vp.label.padEnd(10)} ${route}\n`);
        if (broken) {
          const safeRoute = route === '/' ? '_home' : route.replace(/\//g, '_');
          await screenshot(call, `${vp.label}_${safeRoute}.png`);
        }
      }
    }
    ws.close();

    const fails = results.filter((r) => r.overflow > 0 || r.parentOffenders.length > 0);
    console.log(`\n${results.length} probes · ${fails.length} with issues`);
    if (fails.length) {
      console.log('\nDetails:');
      for (const f of fails) {
        console.log(`\n  ${f.viewport}  ${f.route}`);
        console.log(`    winW=${f.winW} docW=${f.docW} overflow=${f.overflow}`);
        if (f.horizOffenders.length) {
          console.log('    horizontal offenders (top elements past viewport):');
          for (const o of f.horizOffenders.slice(0, 5)) {
            console.log(`      <${o.tag}${o.cls ? ' class="' + o.cls + '"' : ''}> right=${o.right} +${o.overshoot}px`);
          }
        }
        if (f.parentOffenders.length) {
          console.log('    children overflowing their parent:');
          for (const o of f.parentOffenders.slice(0, 5)) {
            console.log(`      ${o.child} overshoots ${o.parent} by +${o.overshoot}px`);
          }
        }
      }
      process.exitCode = 1;
    } else {
      console.log('\nAll clear — no horizontal overflow, no child escaping its parent.');
    }
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
