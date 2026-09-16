import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Whole-page axe over the signed-out app routes. The other two browser specs
// scope axe to one container — `article.ss-topic-article`, `.cd-workbench` —
// which is precise, and also why two serious violations on /profile survived
// every gate until a manual scan found them: an accent chip below 4.5:1, and a
// levels strip that scrolled sideways with no way to reach it from a keyboard.
// Nothing is scoped here, and the tag set is the full WCAG 2.2 AA one that
// manual scan used, so the next regression of that kind fails a gate instead
// of waiting for the next audit.
//
// Locale comes from localStorage, not a path prefix: only /topics/:slug has a
// /cs route, so scanning /cs/profile scans the 404 page and reports nothing.
//
// Dark mode is covered for /profile only, and that is deliberate rather than
// an oversight. Dark mode on /today and /leaderboard has two serious
// colour-contrast violations of its own — a hard-coded white on the bright
// accent, and the segmented control's inactive label on its vendored track
// grey. Both predate the accent-on-tint work, neither is an accent-on-tint
// bug, and both are recorded in NEEDED.md. Widen this list in the change that
// fixes them, not before.

const ROUTES = ['/profile', '/today', '/leaderboard', '/sprint', '/challenge'];
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const DARK_ROUTES = ['/profile'];

/**
 * axe reads the colours a pixel actually has, so scanning during an entry
 * fade measures a half-transparent foreground and reports contrast failures
 * that do not exist a frame later. Wait for every finite animation and
 * transition to finish; ambient loops are excluded because they never do.
 */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.getAnimations().every((animation) => {
    if (animation.playState !== 'running') return true;
    return animation.effect?.getTiming().iterations === Infinity;
  }), undefined, { timeout: 15_000 });
}

for (const locale of ['en', 'cs']) for (const theme of ['light', 'dark']) {
  const routes = theme === 'dark' ? DARK_ROUTES : ROUTES;
  test(`${locale} ${theme}: signed-out routes pass WCAG 2.2 AA`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme as 'light' | 'dark' });
    await page.addInitScript(({ locale, theme }) => {
      try { localStorage.setItem('devquiz.lang', locale); localStorage.setItem('devquiz:color-mode', theme); } catch {}
    }, { locale, theme });

    for (const route of routes) for (const viewport of WIDTHS) {
      await page.setViewportSize(viewport);
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await settled(page);
      const findings = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        findings.violations.map((v) => `${v.id} [${v.impact}] ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
        `${route} at ${viewport.width}px, ${locale}/${theme}`,
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: info.outputPath('profile.png'), fullPage: true });
  });
}

// The two violations asserted as behaviour as well, so a failure says which
// contract broke rather than only that axe is unhappy. The full seven-subject
// × two-mode contrast matrix is arithmetic and lives in the unit suite
// (client/tests/contrast.test.ts); this only proves the token reaches the DOM.
test('the accent chip takes its colour from the derived on-tint token', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('devquiz:color-mode', 'light'); } catch {}
  });
  await page.goto('/profile');
  await settled(page);
  const chip = page.locator('.ss-panel span').first();
  await expect(chip).toBeVisible();
  const painted = await chip.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      color: style.color,
      onSoft: style.getPropertyValue('--brand-accent-on-soft').trim(),
      accent: style.getPropertyValue('--brand-accent').trim(),
    };
  });
  const asRgb = (hex: string) =>
    `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
  // The picker sets the token per card, so it arrives as light-dark(a, b);
  // ColorModeContext sets a single hex. Take whichever branches it carries.
  const branches = (painted.onSoft.match(/#[0-9a-f]{6}/gi) ?? []).map(asRgb);
  expect(branches.length).toBeGreaterThan(0);
  expect(branches).toContain(painted.color);
  // A real override, not an alias of the brand accent: the subject this build
  // lands on signed-out misses 4.5:1 with the plain accent.
  expect(painted.color).not.toBe(asRgb(painted.accent));
});

test('the levels strip is a keyboard-reachable scroll region', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile');
  await settled(page);
  const strip = page.locator('.ss-scroll-strip');
  await expect(strip).toHaveCount(1);
  await expect(strip).toHaveAttribute('tabindex', '0');
  await expect(strip).toHaveAttribute('role', 'region');
  await expect(strip).toHaveAccessibleName(/\S/);

  // It has to actually scroll once focused, or the tab stop is decoration.
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await strip.focus();
  await expect(strip).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});
