import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const slug = 'javascript-closures';
for (const locale of ['en', 'cs']) for (const theme of ['light', 'dark']) {
  test(`${locale} ${theme}: guide, keyboard practice and accessible content`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme as 'light' | 'dark' });
    await page.addInitScript(({ locale, theme }) => { localStorage.setItem('devquiz.lang', locale); localStorage.setItem('devquiz:color-mode', theme); }, { locale, theme });
    await page.goto(`${locale === 'cs' ? '/cs' : ''}/topics/${slug}`);
    const article = page.locator('article.ss-topic-article');
    // The interface ships English only, but the Czech guides stay published,
    // so the article names its own language instead of borrowing the page's.
    await expect(article).toHaveAttribute('lang', locale);
    await expect(article.locator('h1')).toBeVisible();
    await article.locator('summary').first().focus();
    await page.keyboard.press('Enter');
    await expect(article.locator('details').first()).toHaveAttribute('open', '');
    // The route box fades in even under reduced motion; axe reads colours
    // blended with the page until that finite fade ends.
    await article.evaluate(async (element) => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        await Promise.all(node.getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)));
      }
    });
    const findings = await new AxeBuilder({ page }).include('article.ss-topic-article').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(findings.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('guide.png'), fullPage: true });
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
// C4-4: a crawler or a link preview that runs no JavaScript reads the Coding
// home and a track page under their own title and canonical URL, which used to
// be the home page's.
test('the Coding home and a track page serve their own head', async ({ request }) => {
  for (const [path, title] of [['/coding', 'Coding challenges · devShark'], ['/coding/javascript', 'JavaScript coding challenges · devShark']]) {
    const html = await (await request.get(path)).text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`<link rel="canonical" href="https://devshark.app${path}" />`);
    expect(html).not.toContain('<link rel="canonical" href="https://devshark.app/" />');
  }
});
// Owner decision of 9 Oct 2026: the Coding home and its five track pages are
// in the sitemap, the task pages are not, and system design is hidden: its
// track page and every old task address under it are one not-found page,
// noindex in the HTML itself, with no canonical.
test('the sitemap lists the Coding pages, and system design is a noindex page', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const coding = [...sitemap.matchAll(/<loc>https:\/\/devshark\.app(\/coding[^<]*)<\/loc>/g)].map((match) => match[1]);
  expect(coding).toEqual(['/coding', '/coding/javascript', '/coding/typescript', '/coding/react', '/coding/algorithms', '/coding/fullstack']);
  for (const path of ['/coding/system-design', '/coding/system-design/sd-url-shortener', '/coding/system-design/dd-requests-per-second']) {
    const html = await (await request.get(path)).text();
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('That track does not exist.');
  }
});
