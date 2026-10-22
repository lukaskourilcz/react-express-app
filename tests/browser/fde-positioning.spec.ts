import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { pathCatalog } from '../../scripts/responsive-fixtures';
import { pathInventory } from '../../shared/learning-paths';

const settings = JSON.parse(readFileSync('tests/fixtures/api-settings.json', 'utf8'));
const catalog = pathCatalog({ enabled: false });
const inventory = pathInventory(catalog.paths.find(entry => entry.manifest.id === 'fde')!.manifest);
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: FDE preview derives its inventory and opens the canonical outline`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.addInitScript(theme => {
      localStorage.setItem('devquiz:color-mode', theme);
      localStorage.setItem('devshark:consent', JSON.stringify({ version: 1, analytics: false, marketing: false, decidedAt: Date.now() }));
    }, theme);
    const errors: string[] = []; const writes: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const request = route.request(); const url = new URL(request.url());
      if (request.method() !== 'GET') writes.push(request.method() + ' ' + url.pathname);
      if (url.pathname === '/api/settings') return route.fulfill({ json: settings });
      if (url.searchParams.get('resource') === 'learning-path-catalog') return route.fulfill({ json: catalog });
      return route.fulfill({ status: 503, json: { error: { code: 'fixture', message: 'Local test fixture' } } });
    });
    await page.goto('/');
    const feature = page.getByRole('region', { name: 'Forward Deployed Engineer', exact: true });
    await expect(feature).toContainText(`${inventory.modules} required modules`);
    await expect(feature).toContainText(`${inventory.lessons} lessons`);
    await expect(feature).toContainText(`${inventory.moduleChecks + inventory.finalChecks} module and capstone questions`);
    await expect(feature).toContainText('Recording work is unavailable right now.');
    for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `reflow ${width}`).toBe(true);
      expect((await feature.getByRole('button').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect((await new AxeBuilder({ page }).include('.ss-fde-feature').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 }); await feature.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`fde-feature-${theme}.png`) });
    await feature.getByRole('button', { name: 'Explore the FDE path' }).click();
    await expect(page).toHaveURL(/\/learn\/forward-deployed-engineer\/path$/);
    await expect(page.locator('.lp-page h1')).toHaveText('Forward Deployed Engineer');
    await page.goto('/premium');
    await expect(page.locator('.ss-premium-list')).toContainText(['Our flagship Forward Deployed Engineer path: diagnostic and first module free']);
    expect(errors).toEqual([]); expect(writes).toEqual([]);
  });
}
