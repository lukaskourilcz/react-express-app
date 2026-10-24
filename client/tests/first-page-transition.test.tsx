// The first page of a visit (App.tsx, lib/routePreload.ts
// useFirstPageTransition) draws as soon as its code is in. Shown through the
// route boundary's fallback, it waited for React's reveal throttle: a boundary
// that leaves its fallback on a retry commits no sooner than 300 ms after the
// last fallback any boundary showed or hid (perf baseline #587 C04).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lazy, Suspense, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { useFirstPageTransition } from '../src/lib/routePreload';

// act() flushes fallbacks at once, which would hide the throttle: these
// renders run as in the browser.
const actEnvironment = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false; });
afterAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = actEnvironment; });

const until = (check: () => boolean) => new Promise<void>((resolve) => {
  const tick = () => (check() ? resolve() : setTimeout(tick, 2));
  tick();
});

/** How long the page takes to appear once its code arrives, `codeAfterMs`
 * after the first render. */
async function pageDelay(firstPageInTransition: boolean, codeAfterMs = 40): Promise<number> {
  let arrive: (page: { default: ComponentType }) => void = () => {};
  const Page = lazy(() => new Promise<{ default: ComponentType }>((resolve) => { arrive = resolve; }));
  function Shell() {
    const booted = firstPageInTransition ? useFirstPageTransition() : true;
    return (
      <Suspense fallback={<p>loading</p>}>
        {booted ? <Page /> : <p>loading</p>}
      </Suspense>
    );
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  root.render(<Shell />);
  await until(() => host.textContent === 'loading');
  await new Promise((resolve) => setTimeout(resolve, codeAfterMs));
  const arrived = performance.now();
  arrive({ default: () => <p>page</p> });
  await until(() => host.textContent === 'page');
  const delay = performance.now() - arrived;
  root.unmount();
  host.remove();
  return delay;
}

describe('the first page of a visit', () => {
  it('draws as soon as its code is in, not after the reveal throttle', async () => {
    const throttled = await pageDelay(false);
    const inTransition = await pageDelay(true);
    // The boundary’s own fallback: held until 300 ms after it showed.
    expect(throttled).toBeGreaterThan(150);
    expect(inTransition).toBeLessThan(100);
  });
});

describe('the first page’s code', () => {
  // The transition starts after the shell's first commit, so the page's
  // import would start later than it did from the first render; main.tsx
  // starts it before anything renders instead.
  it('starts loading before the first render', () => {
    const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
    const preload = main.indexOf('void preloadPath(window.location.pathname);');
    expect(preload).toBeGreaterThan(-1);
    expect(preload).toBeLessThan(main.indexOf('ReactDOM.createRoot('));
  });
});

describe('the route head', () => {
  // lib/routeHead.ts brings the public pages' metadata and the topic
  // catalogue (~3 KB gzip); it loads as its own chunk, beside the shell.
  it('is not part of the shell’s first download', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).not.toMatch(/^import [^;]* from '\.\/lib\/(routeHead|publicMetadata|topicCatalog)';/m);
    expect(app).toContain("import('./lib/routeHead')");
  });
});
