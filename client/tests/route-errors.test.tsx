import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from './mocks/server';
import {
  RELOAD_COOLDOWN_MS,
  checkServedBuild,
  installChunkErrorTracking,
  isChunkLoadError,
  reloadPage,
} from '../src/lib/routeRecovery';

// The pieces a page whose code did not load is recovered with: telling a
// chunk failure from a bug, reloading without a loop, and asking the server
// which build it serves.

const STAMP = 'devshark:route-reload';
let online = true;

beforeEach(() => {
  online = true;
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  delete (window.navigator as { onLine?: boolean }).onLine;
  window.sessionStorage.clear();
});

/** What Chromium throws when a page chunk does not load. */
const chunkError = (name: string) => new TypeError(`Failed to fetch dynamically imported module: http://localhost:3000/assets/${name}.js`);

describe('which errors are chunk failures', () => {
  it('remembers what Vite announced, without cancelling it, and reads the browsers’ own words', () => {
    const uninstall = installChunkErrorTracking();
    const announced = new Error('an unfamiliar message');
    const event = Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: announced });
    window.dispatchEvent(event);
    // Cancelling it would make Vite resolve the import to undefined.
    expect(event.defaultPrevented).toBe(false);
    expect(isChunkLoadError(announced)).toBe(true);
    uninstall();
    const later = new Error('another unfamiliar message');
    window.dispatchEvent(Object.assign(new Event('vite:preloadError'), { payload: later }));
    expect(isChunkLoadError(later)).toBe(false);

    expect(isChunkLoadError(chunkError('Chromium'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: https://devshark.app/assets/A.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/A.css'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloading', () => {
  it('reloads by itself at most once a minute, and always when the learner asks', () => {
    const reload = vi.fn();
    const start = 1_000_000;
    expect(reloadPage(true, reload, start)).toBe(true);
    expect(reloadPage(true, reload, start + 1_000)).toBe(false);
    expect(reloadPage(false, reload, start + 2_000)).toBe(true);
    // The learner's reload stamps too, so an automatic one does not follow it.
    expect(reloadPage(true, reload, start + 2_000 + RELOAD_COOLDOWN_MS - 1)).toBe(false);
    expect(reloadPage(true, reload, start + 2_000 + RELOAD_COOLDOWN_MS)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(3);
    // A stamp from the future means the clock moved: treated as recent.
    window.sessionStorage.setItem(STAMP, String(start + 10 * RELOAD_COOLDOWN_MS));
    expect(reloadPage(true, reload, start + 5 * RELOAD_COOLDOWN_MS)).toBe(false);
  });

  it('never reloads offline, and never by itself without storage to count with', () => {
    const reload = vi.fn();
    online = false;
    expect(reloadPage(true, reload)).toBe(false);
    expect(reloadPage(false, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    online = true;
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(reloadPage(true, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(reloadPage(false, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    read.mockRestore();
  });
});

describe('the served build', () => {
  const page = (entry: string) => `<!doctype html><html><head><script type="module" crossorigin src="${entry}"></script></head><body></body></html>`;
  let script: HTMLScriptElement;
  beforeEach(() => {
    script = document.createElement('script');
    script.type = 'module';
    script.setAttribute('src', '/assets/main-AAAA.js');
    document.head.append(script);
  });
  afterEach(() => script.remove());

  it('compares the entry script of a fresh index.html with this page’s', async () => {
    let requests = 0;
    let body = page('/assets/main-AAAA.js');
    server.use(http.get('http://localhost:3000/', ({ request }) => {
      requests += 1;
      expect(request.cache).toBe('no-store');
      return new HttpResponse(body, { headers: { 'content-type': 'text/html' } });
    }));
    await expect(checkServedBuild()).resolves.toBe('same');
    body = page('/assets/main-BBBB.js');
    await expect(checkServedBuild()).resolves.toBe('newer');
    expect(requests).toBe(2);
  });

  it('calls a failed, refused or slow answer unreachable', async () => {
    server.use(http.get('http://localhost:3000/', () => HttpResponse.error()));
    await expect(checkServedBuild()).resolves.toBe('unreachable');
    server.use(http.get('http://localhost:3000/', () => new HttpResponse('down', { status: 503 })));
    await expect(checkServedBuild()).resolves.toBe('unreachable');
    server.use(http.get('http://localhost:3000/', async () => {
      await delay(500);
      return new HttpResponse(page('/assets/main-BBBB.js'), { headers: { 'content-type': 'text/html' } });
    }));
    await expect(checkServedBuild(50)).resolves.toBe('unreachable');
  });
});
