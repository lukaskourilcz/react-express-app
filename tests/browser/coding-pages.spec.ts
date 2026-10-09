import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CODING_TASKS, playable } from '../../lib/coding/catalog';
import { localAuth, storeFakeSession } from './fake-session';

// The Coding pages against the built app, with the API answered here in its
// real shapes: a missing track or task (C3-17, V3-2), a track whose progress
// does not load (C5-5), and a task whose account draft was saved elsewhere
// since the copy on this device (C5-4, V3-1). Nothing leaves the machine.

const TASK = 'js-digit-sum';
const COPY = `devshark:coding:draft:${TASK}`;
const TIME = `devshark:coding:draft-time:${TASK}`;
const PREMIUM = { tier: 'premium', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PROGRESS = { tasks: { [TASK]: { status: 'passed', passes: 1, reviewStage: 0, nextReviewAt: null, revealCount: 0, bestPassedAt: null } }, due: [], javascriptLevelsCleared: 0, passedByTrack: {} };
const notFound = (route: Route) => route.fulfill({ status: 404, json: { error: { code: 'not_found', message: 'Not found' } } });
// What the coding-task resource answers for an id the catalogue does not hold,
// whatever its shape (scripts/test-coding-authorization.ts pins it). It used to
// answer 400 for an id outside the task-id pattern, which this page offered to
// retry forever (V3-2).
const unknownTask = (route: Route) => route.fulfill({ status: 404, json: { error: { code: 'not_found', message: 'Unknown task' } } });

interface Api {
  progress?: (route: Route) => Promise<void>;
  task?: (route: Route) => Promise<void>;
}
/** The API this page talks to; anything else answers 404. */
async function answer(page: Page, api: Api = {}) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const op = url.searchParams.get('op');
    if (url.pathname === '/api/quiz/roadmap') {
      if (url.searchParams.get('resource') === 'coding-task') return api.task ? api.task(route) : notFound(route);
      if (!url.search) return route.fulfill({ json: { topics: [], structure: {} } });
      return notFound(route);
    }
    if (op === 'entitlement') return route.fulfill({ json: PREMIUM });
    if (op === 'coding-progress') return api.progress ? api.progress(route) : route.fulfill({ json: PROGRESS });
    if (op === 'coding-bookmarks') return route.fulfill({ json: { saved: [], collections: [] } });
    if (op === 'practice-session') return route.fulfill({ json: { session: null } });
    return notFound(route);
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
});

test('a track that does not exist has a heading, a way back and no index', async ({ page }) => {
  await answer(page);
  await page.goto('/coding/nope');
  await expect(page.getByRole('heading', { level: 1, name: 'That track does not exist.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1);
  await page.getByRole('link', { name: 'Back to Coding' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Coding challenges' })).toBeVisible();
});

for (const id of ['no-such-task', 'js_digit_sum']) {
  test(`a task that does not exist (${id}), loaded directly, says so and leads back to its track`, async ({ page }) => {
    const asked: string[] = [];
    await answer(page, { task: (route) => { asked.push(new URL(route.request().url()).searchParams.get('id') ?? ''); return unknownTask(route); } });
    await page.goto(`/coding/javascript/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: 'That challenge does not exist.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    expect(asked).toEqual([id]);
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeVisible();
  });
}

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await localAuth(page);
    await storeFakeSession(page);
  });

  test('a track whose progress does not load says so, and draws the list on Try again', async ({ page }) => {
    let failing = true;
    await answer(page, {
      progress: (route) => failing
        ? route.fulfill({ status: 500, json: { error: { code: 'db_error', message: 'Could not load coding progress' } } })
        : route.fulfill({ json: PROGRESS }),
    });
    await page.goto('/coding/javascript');
    await expect(page.getByRole('alert')).toContainText('Could not load your progress.');
    await expect(page.getByText(/\d+ of \d+ passed/)).toHaveCount(0);
    failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('link', { name: /Digit sum/ })).toContainText('Passed');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('an account draft saved elsewhere opens, and the copy on this device is kept and opens on request', async ({ page }) => {
    const task = CODING_TASKS.find((one) => one.id === TASK);
    if (!task) throw new Error(`no coding task ${TASK}`);
    const saved = new Date(Date.now() - 60_000).toISOString();
    await page.addInitScript(({ copy, time }) => {
      if (localStorage.getItem(copy) !== null) return;
      localStorage.setItem(copy, '// the copy on this device\n');
      localStorage.setItem(time, JSON.stringify({ base: null }));
    }, { copy: COPY, time: TIME });
    await answer(page, {
      task: (route) => route.fulfill({ json: { task: playable(task), session: 'session-1', locked: null, progress: null, draft: '// the account draft\n', draftUpdatedAt: saved, signedIn: true } }),
    });
    await page.goto(`/coding/javascript/${TASK}`);
    await expect(page.locator('.cm-content')).toContainText('// the account draft');
    await expect(page.locator('p.cd-note[role="status"]')).toContainText('saved from somewhere else after this device last saw it');
    expect(await page.evaluate((key) => localStorage.getItem(key), COPY)).toBe('// the copy on this device\n');
    const a11y = await new AxeBuilder({ page }).include('.cd-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(a11y.violations.map((violation) => violation.id)).toEqual([]);

    await page.getByRole('button', { name: 'Open the code from this device' }).click();
    await expect(page.locator('.cm-content')).toContainText('// the copy on this device');
    await expect(page.locator('p.cd-note[role="status"]')).toBeFocused();
    await expect(page.locator('p.cd-note[role="status"]')).toContainText('The code from this device is open.');
    await page.reload();
    await expect(page.locator('.cm-content')).toContainText('// the copy on this device');
  });
});
