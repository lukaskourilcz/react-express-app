import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: homepage has one working JavaScript question on desktop and mobile`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.addInitScript((theme) => localStorage.setItem('devquiz:color-mode', theme), theme);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const sample = page.getByRole('group', { name: 'What does this return?' });
    await expect(sample).toBeVisible();
    const reject = page.getByRole('button', { name: 'Reject all', exact: true });
    if (await reject.isVisible()) await reject.click();
    await expect(sample.getByRole('button')).toHaveCount(4);
    await expect(sample).toContainText('2 ** 3;');
    await expect(page.locator('.ss-feature-gallery, .ss-home-video')).toHaveCount(0);
    const headline = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(headline!.width).toBeGreaterThanOrEqual(720);
    await page.screenshot({ path: info.outputPath(`homepage-quiz-${theme}.png`) });
    const correct = sample.getByRole('button', { name: /^B 8/ });
    await correct.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.ss-home-sample').getByRole('status')).toContainText('Correct.');
    await expect(correct).toBeDisabled();
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(sample).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`homepage-quiz-mobile-${theme}.png`), fullPage: true });
  });
}
