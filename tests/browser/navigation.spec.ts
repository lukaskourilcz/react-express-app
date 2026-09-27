import { test, expect, type Page } from '@playwright/test';

// A navigation keeps the current page on screen until the next one can draw
// whole. Before, every first visit to a section blanked the content area,
// pulled the footer up into view, flashed the loader for at least React's
// 300ms reveal throttle and only then drew the page ("a glitch, and then it
// rerenders"). Here each section's code is held back on purpose, so anything
// that would flash has time to show, and every animation frame after the click
// is recorded.

const HOLD_MS = 600;
// The signed-out centre row (design audit P0.6); Today, Collection and Career
// are not in it for a visitor without a session.
const SECTIONS = ['/coding', '/quiz', '/learn', '/challenge', '/play', '/premium'];

/** One animation frame of the content area. */
type Frame = { t: number; route: boolean; kids: number; busy: string | null; opacity: number; h1: string | null; root: number; active: string | null; scrollTop: number };
type Recorder = { __nav: { frames: Frame[]; done: boolean }; __navArm: (ms: number) => void };

async function prepare(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 760 ? 844 : 800 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.addInitScript(() => {
    try { localStorage.setItem('devquiz:color-mode', 'light'); } catch { /* private mode */ }
    const ids = new WeakMap<Element, number>();
    let next = 1;
    const idOf = (element: Element | null) => {
      if (!element) return 0;
      if (!ids.has(element)) ids.set(element, next++);
      return ids.get(element)!;
    };
    const state = { frames: [] as Frame[], done: true };
    Object.assign(window, { __nav: state });
    Object.assign(window, {
      __navArm: (ms: number) => {
        state.frames = [];
        state.done = false;
        document.addEventListener('click', (event) => {
          const start = event.timeStamp;
          const sample = () => {
            const box = document.querySelector('#main-content > div > div:first-child');
            const main = document.getElementById('main-content');
            state.frames.push({
              t: performance.now() - start,
              route: Boolean(box?.classList.contains('ss-route')),
              kids: box?.childElementCount ?? 0,
              busy: box?.getAttribute('aria-busy') ?? null,
              opacity: box ? Number(getComputedStyle(box).opacity) : 0,
              h1: box?.querySelector('h1')?.textContent ?? null,
              root: idOf(box?.firstElementChild ?? null),
              active: document.querySelector('.ss-navlink[data-active="true"], .ss-drawer-link[data-active="true"]')?.getAttribute('href') ?? null,
              scrollTop: main?.scrollTop ?? 0,
            });
            if (performance.now() - start < ms) requestAnimationFrame(sample);
            else state.done = true;
          };
          sample();
        }, { capture: true, once: true });
      },
    });
  });
  // The API answers at once and says little: this checks the frame, not the pages.
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/quiz/roadmap' && !url.search) return route.fulfill({ json: { topics: [], structure: {} } });
    return route.fulfill({ status: 503, json: { error: { code: 'offline', message: 'offline' } } });
  });
  let hold = false;
  await page.route('**/assets/**/*.js', async (route) => {
    if (hold) await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    await route.continue();
  });
  return { holdChunks: () => { hold = true; } };
}

/** Every frame from the click until the held code has long arrived. */
async function measure(page: Page, click: () => Promise<void>): Promise<Frame[]> {
  await page.evaluate((ms) => (window as unknown as Recorder).__navArm(ms), HOLD_MS + 1500);
  await click();
  await page.waitForFunction(() => (window as unknown as Recorder).__nav.done);
  return page.evaluate(() => (window as unknown as Recorder).__nav.frames);
}

test('desktop: every section opens without a blank, a loader or a footer jump', async ({ page }) => {
  test.setTimeout(120_000);
  const { holdChunks } = await prepare(page, 1280);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  holdChunks();
  for (const section of SECTIONS) {
    // Start scrolled down: the next page must still open at its top.
    await page.evaluate(() => { const main = document.getElementById('main-content'); if (main) main.scrollTop = 400; });
    const frames = await measure(page, () => page.locator(`nav.ss-nav-center a[href="${section}"]`).click());
    expect(frames.length, section).toBeGreaterThan(20);
    // Never an empty content area, never the route loader in its place.
    expect(frames.filter((f) => !f.route || f.kids === 0), section).toEqual([]);
    const previous = frames[0].root;
    const arrived = frames.findIndex((f) => f.root !== previous);
    expect(arrived, `${section} drew its page`).toBeGreaterThan(0);
    // Until then the previous page stayed, marked busy, faded back once the
    // wait outlasted the delay, while the nav already showed the destination.
    const waiting = frames.slice(0, arrived);
    expect(waiting.slice(1).every((f) => f.busy === 'true' && f.active === section), section).toBe(true);
    expect(waiting.filter((f) => f.t > 350).every((f) => f.opacity < 0.7), section).toBe(true);
    // The page arrives at its top and not busy; Coding, whose code was the
    // heaviest and whose page flashed longest, draws with one root element.
    const after = frames.slice(arrived);
    expect(after.every((f) => f.busy === null && f.scrollTop === 0), section).toBe(true);
    if (section === '/coding') expect(new Set(after.map((f) => f.root)).size, section).toBe(1);
  }
});

test('phone: the drawer opens Coding without a blank or a loader', async ({ page }) => {
  const { holdChunks } = await prepare(page, 390);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  holdChunks();
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const frames = await measure(page, () => page.locator('.ss-drawer-panel a[href="/coding"]').click());
  expect(frames.filter((f) => !f.route || f.kids === 0)).toEqual([]);
  const arrived = frames.findIndex((f) => f.h1 === 'Coding challenges');
  expect(arrived).toBeGreaterThan(0);
  expect(frames.slice(0, arrived).every((f) => f.root === frames[0].root && f.h1 === frames[0].h1)).toBe(true);
  expect(new Set(frames.slice(arrived).map((f) => f.root)).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
