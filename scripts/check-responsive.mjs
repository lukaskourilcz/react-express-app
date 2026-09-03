// Sweeps every major route at the product's representative viewport widths
// using Chrome DevTools Protocol
// device emulation. Reports horizontal overflow + the elements that cause it,
// plus checks for child boxes that punch outside their parent (visual cut-off
// or overlap). Captures a screenshot per (route × width) only when something
// goes wrong, so the artifact pile stays small.
//
// Run:   npm run check:responsive
// Focus: npm run check:responsive -- --routes /,/quiz --widths 390,1280
// Env:   RESPONSIVE_ROUTES=/learn,/challenge RESPONSIVE_WIDTHS=360,768

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function resolveChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (found) return found;
  throw new Error(
    'No Chrome/Chromium binary found. Set CHROME_BIN to a headless-capable browser.',
  );
}

const CHROME = resolveChrome();
const IS_LINUX = platform() === 'linux';
const DEFAULT_BASE = 'http://localhost:4173';
const DEFAULT_ROUTES = [
  '/',
  '/subjects',
  '/quiz',
  '/learn',
  '/challenge',
  '/play',
  '/play/EXPIRED',
  '/leaderboard',
  '/cards',
  '/shop',
  '/roadmap',
  '/coding',
  '/coding/javascript',
  '/coding/javascript/js-double-numbers',
  '/coding/system-design',
  '/coding/review',
  '/settings/github',
  '/profile',
  '/support',
  '/privacy',
  '/terms',
  '/classroom',
  '/topics/capitals-of-europe',
  '/dev',
  '/not-found-responsive-check',
];
const DEFAULT_VIEWPORTS = [
  { label: '360x800', width: 360, height: 800, mobile: true },
  { label: '390x844', width: 390, height: 844, mobile: true },
  { label: '430x932', width: 430, height: 932, mobile: true },
  { label: '768x1024', width: 768, height: 1024, mobile: false },
  { label: '1024x768', width: 1024, height: 768, mobile: false },
  { label: '1280x800', width: 1280, height: 800, mobile: false },
  { label: '1440x900', width: 1440, height: 900, mobile: false },
];

// Offline/sandboxed runs: block the webfont hosts (see the CDP setup below).
const BLOCK_EXTERNAL = process.argv.includes('--block-external') ||
  process.env.RESPONSIVE_BLOCK_EXTERNAL === '1';

function optionValue(name) {
  const exact = process.argv.indexOf(name);
  if (exact >= 0) return process.argv[exact + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline?.slice(name.length + 1);
}

function commaList(value) {
  return value?.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeRoute(route) {
  return route.startsWith('/') ? route : `/${route}`;
}

function selectedMatrix() {
  const routeFilter = commaList(optionValue('--routes') ?? process.env.RESPONSIVE_ROUTES);
  const widthFilter = commaList(optionValue('--widths') ?? process.env.RESPONSIVE_WIDTHS)
    ?.map((width) => Number.parseInt(width, 10));
  const routes = routeFilter?.map(normalizeRoute) ?? DEFAULT_ROUTES;
  const viewports = widthFilter
    ? DEFAULT_VIEWPORTS.filter((viewport) => widthFilter.includes(viewport.width))
    : DEFAULT_VIEWPORTS;

  if (routes.length === 0) throw new Error('Responsive route filter selected no routes.');
  if (viewports.length === 0) {
    throw new Error(`Responsive width filter must use one of: ${DEFAULT_VIEWPORTS.map(({ width }) => width).join(', ')}.`);
  }
  const unsupported = widthFilter?.filter((width) => !DEFAULT_VIEWPORTS.some((viewport) => viewport.width === width));
  if (unsupported?.length) {
    throw new Error(`Unsupported responsive width(s): ${unsupported.join(', ')}. Use one of: ${DEFAULT_VIEWPORTS.map(({ width }) => width).join(', ')}.`);
  }
  return { routes, viewports };
}

function printHelp() {
  console.log(`Responsive layout sweep

Usage:
  npm run check:responsive
  npm run check:responsive -- --routes /,/quiz --widths 390,1280

Options:
  --routes <csv>      Route paths to probe (default: complete route inventory)
  --widths <csv>      Viewport widths (${DEFAULT_VIEWPORTS.map(({ width }) => width).join(', ')})
  --base-url <url>    Running preview URL (default: ${DEFAULT_BASE})
  --output-dir <path> Keep failure screenshots at an explicit path
  --help              Show this help

The same settings are available through RESPONSIVE_ROUTES,
RESPONSIVE_WIDTHS, RESPONSIVE_BASE_URL, RESPONSIVE_OUTPUT_DIR, and
RESPONSIVE_BLOCK_EXTERNAL=1 (or --block-external) to block the webfont
hosts on a runner without outbound network.
Failure screenshots use a temporary directory by default.`);
}

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
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
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
  const PARENT_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE', 'UL', 'OL']);
  const ROOT = document.body;
  const describe = (el) => {
    const cls = (el.className && el.className.toString ? el.className.toString() : '').trim();
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.split(/\\s+/).join('.').slice(0, 60) : '');
  };
  function check(el) {
    if (!PARENT_TAGS.has(el.tagName)) return;
    const pr = el.getBoundingClientRect();
    if (pr.width === 0 || pr.height === 0) return;
    const style = getComputedStyle(el);
    if (style.overflow === 'visible' && style.overflowX === 'visible') return;
    // A horizontal scroller is SUPPOSED to hold content wider than its box —
    // that is what the scrollbar is for. Only a parent that clips without
    // scrolling actually loses content.
    const scrollableX = /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
    if (scrollableX) return;
    for (const child of el.children) {
      const cr = child.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) continue;
      // A watermark placed out of flow and hidden from assistive tech is meant
      // to bleed off the panel edge; clipping it loses no content.
      const cs = getComputedStyle(child);
      const decorative = (cs.position === 'absolute' || cs.position === 'fixed') &&
        child.getAttribute('aria-hidden') === 'true';
      if (decorative) continue;
      const overshoot = Math.max(0, cr.right - pr.right);
      if (overshoot > 1) {
        parentOffenders.push({
          parent: describe(el),
          child: describe(child),
          overflowX: style.overflowX,
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

async function probeRoute(call, baseUrl, route, vp) {
  await call('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.mobile ? 2 : 1,
    mobile: vp.mobile,
  });
  // Blank between routes: a route that redirects itself (signed-out /profile)
  // can still have a client-side navigation in flight, which races the next
  // Page.navigate and leaves the document loading forever.
  await call('Page.navigate', { url: 'about:blank' });
  await waitFor(async () => (await evaluate(call, 'document.readyState')) === 'complete', { timeout: 5000 })
    .catch(() => undefined);
  await call('Page.navigate', { url: baseUrl + route });
  // A stray pending subresource must not abort the sweep: measure at
  // `interactive` and say so, rather than losing every later route.
  let ready = true;
  try {
    await waitFor(async () => (await evaluate(call, 'document.readyState')) === 'complete', { timeout: 8000 });
  } catch {
    ready = false;
    // Fall back to a parsed document; layout is measurable at `interactive`.
    await waitFor(async () => (await evaluate(call, 'document.readyState')) !== 'loading', { timeout: 4000 })
      .catch(() => undefined);
  }
  // Give Suspense + lazy chunks a beat to settle.
  await new Promise((r) => setTimeout(r, 1500));
  const data = await evaluate(call, PROBE);
  return { route, viewport: vp.label, ready, ...data };
}

async function screenshot(call, outDir, name) {
  const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(outDir, name);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }
  if (typeof globalThis.WebSocket !== 'function') {
    throw new Error('Responsive checks require Node.js 22 or newer (the version declared in package.json).');
  }
  const { routes, viewports } = selectedMatrix();
  const baseUrl = (optionValue('--base-url') ?? process.env.RESPONSIVE_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
  const configuredOutput = optionValue('--output-dir') ?? process.env.RESPONSIVE_OUTPUT_DIR;
  const outDir = configuredOutput
    ? path.resolve(configuredOutput)
    : mkdtempSync(path.join(tmpdir(), 'shark-responsive-shots-'));
  mkdirSync(outDir, { recursive: true });
  const userData = mkdtempSync(path.join(tmpdir(), 'shark-responsive-profile-'));
  const debugPort = Number.parseInt(process.env.RESPONSIVE_DEBUG_PORT ?? '', 10) || 9300 + (process.pid % 500);
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userData}`,
    'about:blank',
  ];
  if (IS_LINUX) chromeArgs.unshift('--no-sandbox', '--disable-dev-shm-usage');
  const chrome = spawn(CHROME, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

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
      const tabs = await getJSON(`http://127.0.0.1:${debugPort}/json`);
      return Array.isArray(tabs) && tabs.some((t) => t.type === 'page');
    });
    const tabs = await getJSON(`http://127.0.0.1:${debugPort}/json`);
    const tab = tabs.find((t) => t.type === 'page');
    const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('Unable to connect to Chrome DevTools.')), { once: true });
    });
    const call = rpc(ws);
    await call('Page.enable');
    await call('Runtime.enable');
    // Sandboxed runners cannot reach the Google Fonts hosts, so every document
    // waits out its font requests and never fires `load`. Blocking them makes
    // an offline run fast and deterministic; the page then measures with the
    // fallback stack, so leave this off wherever the fonts are reachable.
    if (BLOCK_EXTERNAL) {
      await call('Network.enable');
      await call('Network.setBlockedURLs', {
        urls: ['*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*', '*://www.google.com/*'],
      });
    }

    const results = [];
    for (const vp of viewports) {
      for (const route of routes) {
        const r = await probeRoute(call, baseUrl, route, vp);
        results.push(r);
        const broken = r.overflow > 0 || r.parentOffenders.length > 0;
        const tag = broken ? 'FAIL' : 'OK';
        const slow = r.ready ? '' : '  (measured before load finished)';
        process.stdout.write(`  ${tag.padEnd(5)} ${vp.label.padEnd(10)} ${route}${slow}\n`);
        if (broken) {
          const safeRoute = route === '/' ? '_home' : route.replace(/\//g, '_');
          await screenshot(call, outDir, `${vp.label}_${safeRoute}.png`);
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
            console.log(`      ${o.child} overshoots ${o.parent} by +${o.overshoot}px (parent overflow-x: ${o.overflowX})`);
          }
        }
      }
      console.log(`\nFailure screenshots: ${outDir}`);
      process.exitCode = 1;
    } else {
      console.log('\nAll clear — no horizontal overflow, no child escaping its parent.');
      if (!configuredOutput) rmSync(outDir, { recursive: true, force: true });
    }
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
