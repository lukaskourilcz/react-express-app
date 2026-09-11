import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const slug = process.env.TEST_PRODUCT === 'studyshark' ? 'capitals-of-europe' : 'javascript-closures';
for (const locale of ['en', 'cs']) for (const theme of ['light', 'dark']) {
  test(`${locale} ${theme}: guide, keyboard practice and accessible content`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme as 'light' | 'dark' });
    await page.addInitScript(({ locale, theme }) => { localStorage.setItem('devquiz.lang', locale); localStorage.setItem('devquiz:color-mode', theme); }, { locale, theme });
    await page.goto(`${locale === 'cs' ? '/cs' : ''}/topics/${slug}`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const article = page.locator('article.ss-topic-article');
    await expect(article.locator('h1')).toBeVisible();
    await article.locator('summary').first().focus();
    await page.keyboard.press('Enter');
    await expect(article.locator('details').first()).toHaveAttribute('open', '');
    const findings = await new AxeBuilder({ page }).include('article.ss-topic-article').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(findings.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await article.locator('.ss-topic-cta').click();
    await expect(page).toHaveURL(/\/quiz\?category=/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('#public-schema')).toHaveCount(0);
  });
}
test('the guide remains readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:4173'}/topics/${slug}`);
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('summary').first().click();
  await expect(page.locator('details').first().locator('p')).toBeVisible();
  await context.close();
});
