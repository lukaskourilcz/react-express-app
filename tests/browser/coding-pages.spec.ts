import { test, expect, type Page, type Route } from '@playwright/test';
import { CODING_TASKS, playable } from '../../lib/coding/catalog';
import { localAuth, storeFakeSession } from './fake-session';

// The Coding pages against the built app, with the API answered here in its
// real shapes: a missing track or task (C3-17), a track whose progress does
// not load (C5-5), and a task whose account draft is newer than the copy on
// this device (C5-4). Nothing leaves the machine.

const TASK = 'js-digit-sum';
const COPY = `devshark:coding:draft:${TASK}`;
const TIME = `devshark:coding:draft-time:${TASK}`;
const PREMIUM = { tier: 'premium', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PROGRESS = { tasks: { [TASK]: { status: 'passed', passes: 1, reviewStage: 0, nextReviewAt: null, revealCount: 0, bestPassedAt: null } }, due: [], javascriptLevelsCleared: 0, passedByTrack: {} };
const notFound = (route: Route) => route.fulfill({ status: 404, json: { error: { code: 'not_found', message: 'Not found' } } });

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

test('a task that does not exist, loaded directly, says so and leads back to its track', async ({ page }) => {
  const asked: string[] = [];
  await answer(page, { task: (route) => { asked.push(new URL(route.request().url()).searchParams.get('id') ?? ''); return notFound(route); } });
  await page.goto('/coding/javascript/no-such-task');
  await expect(page.getByRole('heading', { level: 1, name: 'That challenge does not exist.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  expect(asked).toEqual(['no-such-task']);
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeVisible();
});

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

  test('a newer account draft opens over an older copy on this device, and the page says so', async ({ page }) => {
    const task = CODING_TASKS.find((one) => one.id === TASK);
    if (!task) throw new Error(`no coding task ${TASK}`);
    const saved = new Date(Date.now() - 60_000).toISOString();
    await page.addInitScript(({ copy, time, at }) => {
      localStorage.setItem(copy, '// an older copy on this device\n');
      localStorage.setItem(time, JSON.stringify({ at, base: null }));
    }, { copy: COPY, time: TIME, at: Date.now() - 5 * 60_000 });
    await answer(page, {
      task: (route) => route.fulfill({ json: { task: playable(task), session: 'session-1', locked: null, progress: null, draft: '// the newer account draft\n', draftUpdatedAt: saved, signedIn: true } }),
    });
    await page.goto(`/coding/javascript/${TASK}`);
    await expect(page.locator('.cm-content')).toContainText('// the newer account draft');
    await expect(page.getByRole('status').filter({ hasText: 'A newer draft from your account is open.' })).toBeVisible();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), COPY)).toBeNull();
  });
});
