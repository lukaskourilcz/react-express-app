import { test, expect, type Page } from '@playwright/test';

// The first frame of a visit already has the shell's final geometry.
//
// Lighthouse scored the landing page's first load a CLS of 0.98 on a desktop
// and 0.96 on a phone (2026-09-26), all of it in one frame. The header stood
// 16px taller (12px on a phone) under the lazy account widget's placeholder
// and shrank when the "Log in" button replaced it, moving <main>; in the same
// frame the footer, drawn at the bottom of the empty first-load route box,
// jumped below the fold as the page arrived. A frame scores the area of
// everything that moved times the longest move, so <main>'s area times the
// footer's jump came close to 1. React reveals Suspense content in one commit
// when both chunks arrive within 300ms of the shell's first draw, so a fast
// load showed the whole shift and a slower one split it in two.
//
// Here every lazily loaded chunk is held back, so the shell stands alone for a
// fixed time before the page arrives. Each frame is recorded, and so is every
// layout-shift entry, flagged as input or not: the test sends no input, and a
// phone emulation flags shifts in its first half second as input.

const HOLD_MS = 800;

type Frame = { t: number; mainTop: number; header: number | null; route: boolean; footer: number | null };
type Shift = { t: number; value: number; input: boolean; sources: string[] };
type Recorder = { __firstLoad: { frames: Frame[]; shifts: Shift[] } };

const PROFILES = [
  // Lighthouse's desktop preset and its default phone profile.
  { name: 'desktop', use: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
  { name: 'phone', use: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true } },
] as const;

async function coldLoad(page: Page) {
  // The entry script and its preloads load at once; everything imported later
  // (the landing page, motion's features, before the fix the account widget)
  // waits HOLD_MS.
  const html = await (await page.request.get('/')).text();
  const initial = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((match) => match[1]));
  expect(initial.size, 'entry scripts named in index.html').toBeGreaterThan(0);
  let held = 0;
  await page.route('**/assets/**/*.js', async (route) => {
    if (!initial.has(new URL(route.request().url()).pathname)) {
      held += 1;
      await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    }
    await route.continue();
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, json: { error: { code: 'offline', message: 'offline' } } }));
  await page.addInitScript(() => {
    type LayoutShiftEntry = PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
      sources: { node: Node | null }[];
    };
    const state = { frames: [] as Frame[], shifts: [] as Shift[] };
    Object.assign(window, { __firstLoad: state });
    const describe = (node: Node | null) =>
      node instanceof Element ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.classList.length ? `.${[...node.classList].join('.')}` : ''}` : String(node?.nodeName);
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        state.shifts.push({
          t: Math.round(entry.startTime),
          value: entry.value,
          input: entry.hadRecentInput,
          sources: entry.sources.map((source) => describe(source.node)),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    const sample = () => {
      const main = document.getElementById('main-content');
      if (main) {
        const footer = document.querySelector('.ss-brand-footer');
        state.frames.push({
          t: Math.round(performance.now()),
          mainTop: main.getBoundingClientRect().top,
          header: document.querySelector('.ss-header')?.getBoundingClientRect().height ?? null,
          route: Boolean(document.querySelector('.ss-route')),
          footer: footer ? footer.getBoundingClientRect().top : null,
        });
      }
      if (performance.now() < 8000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Late work (fonts, the sign-in nudge, idle preloads) has time to land.
  await page.waitForTimeout(1500);
  const recorded = await page.evaluate(() => (window as unknown as Recorder).__firstLoad);
  return { ...recorded, held };
}

for (const profile of PROFILES) {
  test.describe(profile.name, () => {
    test.use(profile.use);

    test('the first load of / keeps <main> and the footer where they land', async ({ page }) => {
      const { frames, shifts, held } = await coldLoad(page);
      expect(held, 'lazy chunks held back').toBeGreaterThan(0);
      // The shell drew on its own before the page: the hold is in effect.
      expect(frames.some((f) => !f.route), 'frames of the shell before the page').toBe(true);
      expect(frames.some((f) => f.route), 'frames with the page').toBe(true);

      // Soft, so one run names every mechanism that came back.
      // The header draws at its final height, so <main> never moves.
      expect.soft([...new Set(frames.map((f) => f.header))], 'header height in each frame').toHaveLength(1);
      expect.soft([...new Set(frames.map((f) => f.mainTop))], 'top edge of <main> in each frame').toHaveLength(1);
      // The footer arrives with the page, never under the first-load loader.
      expect.soft(frames.filter((f) => !f.route && f.footer !== null).length, 'frames with a footer and no page').toBe(0);

      // Nothing on the page moved. Entries flagged as input count too.
      const moved = shifts.flatMap((shift) => shift.sources);
      expect.soft(moved.filter((node) => node === 'main#main-content' || node.startsWith('header') || node.startsWith('footer')), 'shell nodes that moved').toEqual([]);
      const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect.soft(total, `layout shift score, all entries: ${JSON.stringify(shifts)}`).toBeLessThan(0.01);
    });
  });
}
