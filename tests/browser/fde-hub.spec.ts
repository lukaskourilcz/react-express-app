import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { storeFakeSession, localAuth } from './fake-session';
import { pathById, publicManifest } from '../../lib/learning-paths/catalog';
import { pathInventory } from '../../shared/learning-paths';

const manifest = publicManifest(pathById('fde')!);
const first = manifest.modules.find(module => !module.optional && !module.shelf)!;
const enrollment = { enrollmentId: 'LOCALFDEHUB000000000', pathId: 'fde', curriculumVersion: 1, status: 'active', baseTrackAtEnrollment: 'fullstack', startedAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z' };
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: recorded FDE board, keyboard, reflow and completion artwork`, async ({ page }, info) => {
    await storeFakeSession(page); await localAuth(page);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.addInitScript(mode => {
      localStorage.setItem('devquiz:color-mode', mode);
      localStorage.setItem('devshark:consent', JSON.stringify({ version: 1, analytics: false, marketing: false, decidedAt: Date.now() }));
    }, theme);
    let complete = false;
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      const resource = url.searchParams.get('resource');
      const op = url.searchParams.get('op') ?? url.pathname.split('/').pop();
      if (resource === 'learning-path-catalog') return route.fulfill({ json: { versions: { fde: 1 }, paths: [{ manifest, availability: 'available', inventory: pathInventory(manifest) }] } });
      if (op === 'entitlement') return route.fulfill({ json: { tier: 'premium', source: 'manual', currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null } });
      if (op === 'learning-path-enrollment') return route.fulfill({ json: { enrollments: [enrollment] } });
      if (op === 'learning-path-progress') return route.fulfill({ json: {
        enrollment, modules: manifest.modules.filter(module => !module.optional && !module.shelf).map(module => ({
          moduleId: module.id, completed: complete, completedAt: complete ? '2026-10-22T00:00:00Z' : null,
          activities: complete ? module.activities.map(activity => ({ activityId: activity.id, state: activity.kind === 'artifact' || activity.kind === 'lesson' ? 'self_reviewed' : 'verified_pass', verification: activity.verification, score: null, attempts: 1, updatedAt: '2026-10-22T00:00:00Z' })) : [],
        })), competencies: [], recommendedBridges: [], nextActivityId: complete ? null : first.activities[0].id, guidedComplete: complete, artifacts: { submitted: complete ? pathInventory(manifest).artifacts : 0, total: pathInventory(manifest).artifacts }, dueActivityIds: [],
      } });
      return route.fulfill({ status: 503, json: { error: { code: 'fixture', message: 'Local test fixture' } } });
    });
    await page.goto('/roadmap/specializations/fde');
    const board = page.getByRole('region', { name: 'Competency evidence' });
    await expect(board).toBeVisible();
    await expect(board.locator('h3')).toHaveCount(manifest.competencies.length);
    await expect(board).not.toContainText('Verified pass');
    await expect(page.locator('[aria-current="step"]')).toContainText('Discover and scope');
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(1);
    const summary = board.locator('summary').first();
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(summary.locator('..')).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    await expect(board.locator('a').first()).toBeFocused();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `reflow ${width}`).toBe(true);
    }
    await page.setViewportSize({ width: 360, height: 900 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.addStyleTag({ content: 'html { font-size: 100% !important; }' });
    expect((await new AxeBuilder({ page }).include('[aria-labelledby="fde-evidence-title"]').include('[aria-labelledby="fde-loop-title"]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    complete = true; await page.reload();
    await expect(page.getByRole('heading', { name: 'FDE guided path completed', exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download card' }).click();
    const file = await download; expect(file.suggestedFilename()).toBe('devshark-fde-guided-path.png');
    await file.saveAs(`/private/tmp/codex-b2-card-${theme}.png`);
    await page.screenshot({ path: info.outputPath(`fde-hub-${theme}.png`), fullPage: false });
  });
}
