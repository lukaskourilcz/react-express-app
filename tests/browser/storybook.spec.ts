import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.skip(!process.env.STORYBOOK_URL, 'Run with STORYBOOK_URL after starting the workshop');
for (const story of ['populated', 'empty', 'server-error', 'offline']) {
  test(`workshop leaderboard ${story}`, async ({ page }) => {
    await page.goto(`${process.env.STORYBOOK_URL}/iframe.html?id=screens-leaderboard--${story}&viewMode=story`);
    await expect(page.getByRole('heading', { name: 'Leaderboard', exact: true })).toBeVisible();
    if (story === 'populated') await expect(page.getByText('Workshop learner', { exact: true })).toBeVisible();
    if (story === 'server-error' || story === 'offline') await expect(page.getByRole('alert')).toBeVisible();
    const result = await new AxeBuilder({ page }).include('#storybook-root').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  });
}
test('confirmation restores focus after Escape', async ({ page }) => {
  await page.goto(`${process.env.STORYBOOK_URL}/iframe.html?id=astryx-feedback--confirmation&viewMode=story`);
  const trigger = page.getByRole('button', { name: 'Delete account', exact: true });
  await trigger.click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
