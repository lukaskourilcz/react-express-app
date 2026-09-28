import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The launch price on /premium (shared/launch-offer.ts): 4 Oct 2026 00:00 to
// 2 Nov 2026 23:59:59, Prague time. The browser's clock is fixed with
// Playwright's clock and the server's answer (/api/settings) is stubbed, the
// two inputs the page reads. Every other API call fails fast, as in
// route-errors.spec.ts, so the page draws for a signed-out visitor.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BILLING_ON = { enabled: true, cancellable: true, cancelByEmail: false, seller: 'link' };

async function prepare(page: Page, { now, launchOffer, theme = 'light' }: { now: string; launchOffer: boolean; theme?: 'light' | 'dark' }) {
  await page.clock.setFixedTime(new Date(now));
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
  await page.addInitScript((theme) => {
    try { localStorage.setItem('devquiz:color-mode', theme); } catch { /* private mode */ }
  }, theme);
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/settings') return route.fulfill({ json: { billing: { ...BILLING_ON, launchOffer } } });
    if (url.pathname === '/api/quiz/roadmap' && !url.search) return route.fulfill({ json: { topics: [], structure: {} } });
    return route.fulfill({ status: 503, json: { error: { code: 'offline', message: 'offline' } } });
  });
}

async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.getAnimations().every((animation) => {
    if (animation.playState !== 'running') return true;
    return animation.effect?.getTiming().iterations === Infinity;
  }), undefined, { timeout: 15_000 });
}

const plans = (page: Page) => page.getByRole('region', { name: 'Choose a plan' });

test('inside the window: the launch price, the regular price from 3 Nov, and no earlier-price claim', async ({ page }) => {
  await prepare(page, { now: '2026-10-10T10:00:00Z', launchOffer: true });
  await page.goto('/premium?utm_source=instagram&utm_medium=post&utm_campaign=launch-55');
  await expect(page.getByRole('heading', { level: 1, name: 'Everything in devShark at the launch price of €1.80 a month' })).toBeVisible();
  const region = plans(page);
  const monthly = region.locator('[data-plan="monthly"] .ss-offer-amount');
  await expect(monthly.locator('s')).toHaveText('€3.99');
  await expect(monthly.locator('strong')).toHaveText('€1.80');
  await expect(region.locator('[data-plan="annual"] .ss-offer-amount strong')).toHaveText('€18.00');
  // Screen readers hear one sentence per price, not two bare numbers.
  const snapshot = await region.locator('[data-plan="monthly"] .ss-premium-plan__price').ariaSnapshot();
  expect(snapshot).toContain('€1.80 launch price; the regular price from 3 Nov 2026 is €3.99');
  expect(snapshot).not.toMatch(/deletion|€3\.99 €1\.80/);
  const note = region.getByRole('group', { name: 'Launch price €1.80 a month · €18.00 a year' });
  await expect(note).toContainText('55% below the regular price of €3.99 a month · €39.99 a year, which applies from 3 Nov 2026');
  await expect(note).toContainText('Kept for the lifetime of your subscription · cancel anytime');
  await expect(note).toContainText('Offer ends 2 Nov 2026');
  await expect(page.locator('body')).not.toContainText(/lowest price|last 30 days/i);
  // The campaign label survives on the address the first pageview reads.
  expect(new URL(page.url()).searchParams.get('utm_campaign')).toBe('launch-55');
});

test('before 4 Oct 00:00 Prague and after 2 Nov 23:59:59 Prague: the page is today’s', async ({ page }) => {
  for (const now of ['2026-09-28T12:00:00Z', '2026-10-03T21:59:59Z', '2026-11-02T23:00:00Z']) {
    await prepare(page, { now, launchOffer: true });
    await page.goto('/premium');
    await expect(page.getByRole('heading', { level: 1, name: 'Everything in devShark for €3.99 a month' }), now).toBeVisible();
    await expect(plans(page).getByText('€3.99', { exact: true })).toBeVisible();
    await expect(plans(page).getByText('€39.99', { exact: true })).toBeVisible();
    await expect(page.locator('.ss-offer-amount, .ss-offer-note, s')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/launch price|1\.80|18\.00/i);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('inside the window without the coupon: the page is today’s', async ({ page }) => {
  await prepare(page, { now: '2026-10-10T10:00:00Z', launchOffer: false });
  await page.goto('/premium');
  await expect(page.getByRole('heading', { level: 1, name: 'Everything in devShark for €3.99 a month' })).toBeVisible();
  await expect(page.locator('.ss-offer-amount, .ss-offer-note')).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: /premium with the launch price passes WCAG 2.2 AA at 390 and 1280 px`, async ({ page }) => {
    test.setTimeout(90_000);
    await prepare(page, { now: '2026-10-10T10:00:00Z', launchOffer: true, theme });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/premium');
      await expect(page.locator('.ss-offer-note')).toBeVisible();
      await settled(page);
      const findings = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        findings.violations.map((v) => `${v.id} [${v.impact}] ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
        `/premium at ${viewport.width}px, ${theme}`,
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}
