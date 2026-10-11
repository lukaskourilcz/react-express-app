import { test, expect, type Page } from '@playwright/test';
import { CODING_TASKS, playable } from '../../lib/coding/catalog';
import { solutionFor } from '../../lib/coding/solutions';
import { hiddenGlobalMessage, TYPE_CHECK_STOPPED_MESSAGE } from '../../shared/coding-evaluate';
import { runInQuickJS } from '../../lib/coding/sandbox';
import { UTC_REACT_APP, UTC_REACT_SUITE } from '../../scripts/fixtures/utc-react';
import { localAuth, storeFakeSession } from './fake-session';

// The coding workbench in the built app with a real editor, a real runner
// worker and the real React sandbox frame. The API is answered here, so
// nothing leaves the machine; the server's grading is covered by
// test:coding and test:grading-integrity. Each test names the finding of the
// coding audit of 8 October 2026 it guards.

interface Seen { submits: number[]; practiceStarts: unknown[]; documents: string[] }

async function prepare(page: Page, { signedIn = false, verdict = {} as Record<string, unknown> } = {}): Promise<Seen> {
  const seen: Seen = { submits: [], practiceStarts: [], documents: [] };
  page.on('pageerror', (error) => console.error(error.message));
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) seen.documents.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('devquiz:color-mode', 'light');
      localStorage.setItem('devshark:consent', JSON.stringify({ version: 1, analytics: false, marketing: false, decidedAt: Date.now() }));
    } catch { /* private mode */ }
  });
  if (signedIn) {
    await storeFakeSession(page);
    await localAuth(page);
  }
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const resource = url.searchParams.get('resource');
    const op = url.searchParams.get('op');
    const method = route.request().method();
    if (resource === 'coding-task') {
      const task = CODING_TASKS.find((one) => one.id === url.searchParams.get('id'))!;
      return route.fulfill({ json: { task: playable(task), session: task.id, locked: null, progress: null, draft: null, signedIn } });
    }
    if (resource === 'coding-submit') {
      seen.submits.push(Date.now());
      const body = route.request().postDataJSON() as { code?: string };
      if (body.code?.includes('type B<')) {
        return route.fulfill({ json: { verdict: 'timeout', results: [], hidden: null, check: null, logs: [], codeError: TYPE_CHECK_STOPPED_MESSAGE, design: null, designReference: null, failureHint: null, puzzle: null, progress: null, firstPass: false, xpAwarded: 0, xpForfeited: false, applied: false, github: null, solutions: null } });
      }
      return route.fulfill({ json: { verdict: 'passed', results: [{ pass: true, actual: null, error: null }], hidden: null, check: null, logs: [], codeError: null, design: null, designReference: null, failureHint: null, puzzle: null, progress: null, firstPass: false, xpAwarded: 0, xpForfeited: false, applied: false, github: null, solutions: null, ...verdict } });
    }
    if (op === 'entitlement') return route.fulfill({ json: { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null, billingAccount: false, subscriptionLive: false } });
    if (op === 'coding-progress') return route.fulfill({ json: { tasks: {}, due: [], javascriptLevelsCleared: 0 } });
    if (op === 'coding-bookmarks') return route.fulfill({ json: { saved: [], collections: [] } });
    if (op === 'coding-draft') return route.fulfill({ json: { ok: true } });
    if (op === 'coding-skip') return route.fulfill({ json: { recorded: true, next: 'js-digit-sum', required: false } });
    if (op === 'practice-session' && method === 'GET') return route.fulfill({ json: { session: null } });
    if (op === 'practice-session' && method === 'POST') {
      seen.practiceStarts.push(route.request().postDataJSON());
      return route.fulfill({ json: { session: { sessionId: 'run-1', minutes: 10, topic: 'javascript', queue: ['js-sum-array', 'js-digit-sum', 'js-count-multiples'], position: 0, order: 'sequential', status: 'active', scheduledFor: null, estimatedMinutes: 15 } } });
    }
    return route.fulfill({ status: 503, json: { error: { code: 'offline', message: 'offline' } } });
  });
  return seen;
}

/** Opens a task and waits for App.tsx's focus move to <main>, which would
 * otherwise take the focus from the editor in the middle of a fill. */
async function openTask(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#main-content')).toBeFocused();
}

async function fillEditor(page: Page, source: string) {
  const editor = page.locator('.cm-content');
  await editor.focus();
  await expect(page.locator('.cm-editor')).toHaveClass(/\bcm-focused\b/);
  await editor.fill(source);
}

/** Opens a task and returns the URL of the Run worker it starts. */
async function runnerUrl(page: Page): Promise<string> {
  const started = page.waitForEvent('worker');
  await openTask(page, '/coding/javascript/js-count-multiples');
  return (await started).url();
}

type WorkerRun = { results: { pass: boolean | null; actual: string | null; error: string | null }[] };

/** Runs calls in a fresh copy of the real Run worker, as the Run button does. */
function runInWorker(page: Page, url: string, calls: string[], expectations: unknown[] | null): Promise<WorkerRun> {
  return page.evaluate(({ url, calls, expectations }) => new Promise<WorkerRun>((resolve) => {
    const worker = new Worker(url, { type: 'module' });
    worker.onmessage = (event) => { if (event.data.phase === 'done') { worker.terminate(); resolve(event.data); } };
    worker.postMessage({ track: 'javascript', code: '', calls, expectations });
  }), { url, calls, expectations });
}

const announced = (page: Page) => page.locator('.cd-workbench > [role="status"]');

test('React: a focus check passes on every Run, not just the first, and a build error is shown (C4-1, C3-2, C3-6)', async ({ page }) => {
  test.setTimeout(120_000);
  await prepare(page);
  const id = 'react-easy2-focus-the-search';
  await openTask(page, `/coding/react/${id}`);
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const results = page.getByRole('tab', { name: /^Results/ });
  const changed = page.getByText('The code changed since this run.');
  for (const attempt of [1, 2, 3]) {
    // A changed line each time, so the note that Results are from earlier
    // code shows until this Run has finished.
    await fillEditor(page, `${solutionFor(id)!.solution}\n// run ${attempt}\n`);
    if (attempt > 1) await expect(changed).toBeVisible();
    await run.click();
    await expect(announced(page)).toHaveText(/^\d+ of \d+ passing$/, { timeout: 30_000 });
    await expect(changed).toHaveCount(0);
    // From the second Run on, Results is the open tab and the preview is
    // not: its frame used to be display:none, and every focus check failed.
    await expect(results, `Run ${attempt}`).toHaveAttribute('aria-selected', 'true');
    await expect(results, `Run ${attempt}`).toContainText('3/3');
    // The suite moves focus inside the frame; the button that ran it keeps it.
    await expect(run).toBeFocused();
  }
  await fillEditor(page, 'export default function App() {\n  return <main><h1>Deep End</main>;\n}\n');
  await run.click();
  await expect(page.getByRole('tabpanel').getByText(/^Build error:/)).toBeVisible({ timeout: 30_000 });
  await expect(announced(page)).toContainText('Build error:');
  await expect(page.getByText(/0 of 0 passing/)).toHaveCount(0);
});

test('JavaScript: Ctrl+Enter runs without adding a line, Run keeps focus, Escape closes Reset (C3-3, C3-6)', async ({ page }) => {
  await prepare(page);
  await openTask(page, '/coding/javascript/js-count-multiples');
  await fillEditor(page, 'const countMultiples = (n, from, to) => {\n  return 0;\n};');
  const lines = page.locator('.cm-line');
  await expect(lines).toHaveCount(3);
  await page.locator('.cm-content').press('ControlOrMeta+Enter');
  await expect(announced(page)).toHaveText(/passing$/, { timeout: 30_000 });
  await page.locator('.cm-content').press('ControlOrMeta+Enter');
  await expect(announced(page)).toHaveText(/passing$/, { timeout: 30_000 });
  await expect(lines).toHaveCount(3);

  const run = page.getByRole('button', { name: 'Run', exact: true });
  await run.click();
  await expect(announced(page)).toHaveText(/passing$/, { timeout: 30_000 });
  await expect(run).toBeFocused();

  const reset = page.getByRole('button', { name: 'Reset', exact: true });
  await reset.click();
  const dialog = page.getByRole('alertdialog', { name: 'Reset' });
  await expect(dialog.getByRole('button', { name: 'Keep my code' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(reset).toBeFocused();
  await expect(lines).toHaveCount(3);
});

test('a runner that never loaded says so instead of blaming the code (C3-7)', async ({ page }) => {
  await prepare(page);
  await page.route(/\/assets\/coding-worker\/worker-[\w-]+\.js$/, (route) => route.abort('internetdisconnected'));
  await openTask(page, '/coding/javascript/js-count-multiples');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  const note = 'The runner did not load, so your code did not run. Check your connection and run again.';
  await expect(page.getByRole('tabpanel').getByText(note)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/could not run|The runner crashed|Your code threw/)).toHaveCount(0);
});

test('TypeScript: Submit leaves at once, and a runaway type is named as one (C5-2)', async ({ page }) => {
  test.setTimeout(120_000);
  const seen = await prepare(page);
  await openTask(page, '/coding/typescript/ts-typed-slug');
  const recursive = "type B<N extends number, E, A extends unknown[] = []> = A['length'] extends N ? A : B<N, E, [...A, E]>;\n"
    + Array.from({ length: 30 }, (_, index) => `const q${index}: B<999, 'k${index}'>['length'] = 999;\n`).join('');
  await fillEditor(page, recursive + solutionFor('ts-typed-slug')!.solution);
  const pressed = Date.now();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.poll(() => seen.submits.length).toBe(1);
  // The browser's own check of this code runs for half a minute; the
  // request no longer waits for it.
  expect(seen.submits[0] - pressed).toBeLessThan(5_000);
  const stopped = page.getByRole('tabpanel').getByText(/^Type checking stopped before it finished/);
  await expect(stopped).toBeVisible();
  await expect(page.getByText(/infinite loop|loop whose condition/)).toHaveCount(0);

  // Run checks the same types in the browser and stops within seconds of
  // the compiler loading, with the same words.
  await page.locator('.cm-content').press('End');
  await page.locator('.cm-content').press('Space');
  const started = Date.now();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(announced(page)).toHaveText('Running your code…');
  await expect(announced(page)).toHaveText(/^Type checking stopped before it finished/, { timeout: 60_000 });
  console.log(`runaway type stopped by Run after ${Date.now() - started} ms`);
  await expect(page.getByText(/infinite loop|loop whose condition/)).toHaveCount(0);
});

test('a phone waiting for a bigger screen loads no TypeScript compiler until the editor is chosen (V3-4)', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const runner: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/assets/coding-worker/')) runner.push(request.url()); });
  await page.goto('/coding/typescript/ts-typed-slug');
  await expect(page.getByText('This challenge needs an editor, so it is waiting for a bigger screen.')).toBeVisible();
  await page.waitForTimeout(2_000);
  expect(runner).toEqual([]);
  await page.getByRole('button', { name: 'Use the editor on this screen' }).click();
  await expect.poll(() => runner.some((url) => /\/ts-compiler-[\w-]+\.js$/.test(url)), { timeout: 30_000 }).toBe(true);
});

test('signed in: Skip opens the next challenge without reloading the app (C3-18)', async ({ page }) => {
  const seen = await prepare(page, { signedIn: true });
  await openTask(page, '/coding/javascript/js-count-multiples');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Skip and continue' }).click();
  await page.getByRole('link', { name: 'Next challenge' }).click();
  await expect(page).toHaveURL(/\/coding\/javascript\/js-digit-sum$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Digit sum' })).toBeVisible();
  expect(seen.documents).toHaveLength(1);
});

// Owner decision of 9 October 2026 (afternoon): a pass that earns no XP
// because its task paid XP less than an hour ago says so in a toast, with
// the time on the learner's own clock, as a replayed Learn level does.
test('signed in: a pass inside the hour says in a toast when the XP opens again', async ({ page }) => {
  const opens = new Date(Date.now() + 40 * 60_000).toISOString();
  await prepare(page, { signedIn: true, verdict: { applied: true, repeatXp: { availableAt: opens, needsReset: true, withheld: 'cooldown' } } });
  await openTask(page, '/coding/javascript/js-count-multiples');
  await fillEditor(page, solutionFor('js-count-multiples')!.solution);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const time = await page.evaluate((iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), opens);
  await expect(page.getByRole('status').filter({ hasText: `No XP this time: reset the task and pass it from ${time} to earn it again.` })).toBeVisible();
});

test('signed in: Start the run starts a challenge run and opens its first task (C3-1)', async ({ page }) => {
  const seen = await prepare(page, { signedIn: true });
  await page.goto('/coding');
  await page.getByRole('button', { name: /Challenge run/ }).click();
  await page.getByRole('button', { name: 'Start the run' }).click();
  await expect.poll(() => seen.practiceStarts.length).toBe(1);
  expect(seen.practiceStarts[0]).toMatchObject({ order: 'sequential' });
  await expect(page).toHaveURL(/\/coding\/javascript\/js-sum-array$/);
  await expect(page.getByRole('link', { name: 'Challenge run · 1 of 3' })).toBeVisible();
});

// Owner decisions of 9 October 2026: the grader has the browser's URL,
// URLSearchParams, encoders and base64, and Run has nothing else the grader
// lacks. Run here is the real worker in a browser told it is in Los Angeles;
// Submit is the grader's QuickJS, in this process.
test.describe('Run and Submit share built-ins (C1-3)', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  const AGREE = [
    'Object.fromEntries(new URLSearchParams("?a=1&b=x+y&c=%E2%9C%93"))',
    '(() => { const u = new URL("../b?q=1#h", "https://example.com/a/c"); u.searchParams.append("r", "é"); return [u.href, u.origin, u.pathname]; })()',
    '[...new TextEncoder().encode("é✓🐟")].concat(new TextDecoder().decode(new Uint8Array([0xF0, 0x9F, 0x90, 0x9F])))',
    '[btoa("hi there"), atob("aGkgdGhlcmU=")]',
    '[(1234567.891).toLocaleString(), (1234.5).toLocaleString("en-US", { style: "currency", currency: "EUR" }), ["b", "A", "a", "B"].sort((x, y) => x.localeCompare(y))]',
    '[typeof Intl, typeof crypto, typeof fetch, typeof structuredClone, typeof URL]',
  ];
  const LACKING = ['Intl.NumberFormat', 'crypto.randomUUID()', 'fetch("/x")'];

  test('the real worker agrees with the grader', async ({ page }) => {
    test.setTimeout(120_000);
    await prepare(page);
    const workerUrl = await runnerUrl(page);
    const browser = await runInWorker(page, workerUrl, AGREE, null);
    const grader = await runInQuickJS({ code: '', calls: AGREE, expectations: null });
    expect(browser.results.map((one) => one.error)).toEqual(AGREE.map(() => null));
    expect(browser.results.map((one) => one.actual)).toEqual(grader.results.map((one) => one.actual));
    const lacking = await runInWorker(page, workerUrl, LACKING, null);
    expect(lacking.results.map((one) => one.error)).toEqual([hiddenGlobalMessage('Intl'), hiddenGlobalMessage('crypto'), hiddenGlobalMessage('fetch')]);
    const graderLacking = await runInQuickJS({ code: '', calls: LACKING, expectations: null });
    expect(graderLacking.results.every((one) => one.error !== null)).toBe(true);
  });

  test('Run passes a query read with URLSearchParams and names what the checker lacks', async ({ page }) => {
    await prepare(page);
    await openTask(page, '/coding/javascript/js-easy3-read-query');
    const run = page.getByRole('button', { name: 'Run', exact: true });
    await fillEditor(page, 'const parseQuery = query => Object.fromEntries(new URLSearchParams(query));');
    await run.click();
    const total = CODING_TASKS.find((one) => one.id === 'js-easy3-read-query')!.tests!.length;
    await expect(announced(page)).toHaveText(`${total} of ${total} passing`, { timeout: 30_000 });
    await fillEditor(page, 'const parseQuery = query => new Intl.Locale(query) && {};');
    await run.click();
    await expect(announced(page)).toHaveText(/passing$/, { timeout: 30_000 });
    await expect(page.getByRole('tabpanel').getByText(hiddenGlobalMessage('Intl')).first()).toBeVisible();
  });
});

// The owner's afternoon decision of 9 October 2026 (C1-2): learner code reads
// UTC, with no summer time, in Run as in Submit and in the React frame,
// replacing the morning's Europe/Prague. Each browser below is told it is
// somewhere else, with summer time or without, and a half-hour change in
// Lord Howe.
const UTC_TIME: [string, unknown][] = [
  ['[new Date(2026, 0, 15).getTimezoneOffset(), new Date(2026, 6, 15).getTimezoneOffset()]', [0, 0]],
  ['[new Date(2026, 2, 29, 2, 30).toISOString(), new Date(2026, 9, 25, 2, 30).toISOString(), new Date(2026, 3, 5, 1, 45).toISOString()]', ['2026-03-29T02:30:00.000Z', '2026-10-25T02:30:00.000Z', '2026-04-05T01:45:00.000Z']],
  ['[1774745999999, 1774746000000, 1775314800000, 1791041400000].map((t) => { const d = new Date(t); return [d.getDate(), d.getHours(), d.getMinutes(), d.getTimezoneOffset()]; })', [[29, 0, 59, 0], [29, 1, 0, 0], [4, 15, 0, 0], [3, 15, 30, 0]]],
  ['(() => { const d = new Date(2026, 2, 28, 12); d.setDate(d.getDate() + 1); return [d.toISOString(), d.toString(), Date.parse("2026-10-25T02:30")]; })()', ['2026-03-29T12:00:00.000Z', 'Sun Mar 29 2026 12:00:00 GMT+0000 (Coordinated Universal Time)', 1792895400000]],
  ['[new Date(Date.UTC(2026, 9, 25, 1, 30)).toLocaleString(), new Date(Date.UTC(2026, 9, 25, 1, 30)).toLocaleString("en-US", { timeZone: "Europe/Prague", timeZoneName: "short" })]', ['10/25/2026, 1:30:00 AM', '10/25/2026, 2:30:00 AM GMT+1']],
];

for (const [zone, offsets] of [['America/Los_Angeles', [480, 420]], ['Asia/Tokyo', [-540, -540]], ['Australia/Lord_Howe', [-660, -630]]] as const) {
  test.describe(`Run, Submit and the React frame read UTC in a browser in ${zone} (C1-2)`, () => {
    test.use({ timezoneId: zone });

    test('the real worker reads UTC, as the grader does', async ({ page }) => {
      test.setTimeout(120_000);
      await prepare(page);
      const workerUrl = await runnerUrl(page);
      // The page itself keeps the browser's zone; only learner code reads UTC.
      expect(await page.evaluate(() => [new Date(2026, 0, 15).getTimezoneOffset(), new Date(2026, 6, 15).getTimezoneOffset()])).toEqual(offsets);
      const calls = UTC_TIME.map(([call]) => call);
      const expectations = UTC_TIME.map(([, value]) => value);
      const browser = await runInWorker(page, workerUrl, calls, expectations);
      const grader = await runInQuickJS({ code: '', calls, expectations });
      expect(browser.results.map((one) => one.error ?? one.pass)).toEqual(calls.map(() => true));
      expect(grader.results.map((one) => one.error ?? one.pass)).toEqual(calls.map(() => true));
      expect(browser.results.map((one) => one.actual)).toEqual(grader.results.map((one) => one.actual));
    });

    test('the React frame reads UTC too', async ({ page }) => {
      await page.goto('/sandbox/index.html');
      const outcome = await page.evaluate(({ app, suite }) => new Promise<{ passed: number; failed: number; errors: (string | null)[] }>((resolve) => {
        const errors: (string | null)[] = [];
        window.addEventListener('message', (event) => {
          const data = event.data as { type?: string; error?: string | null; passed?: number; failed?: number };
          if (data.type === 'test') errors.push(data.error ?? null);
          if (data.type === 'done') resolve({ passed: data.passed!, failed: data.failed!, errors });
        });
        window.postMessage({ type: 'run', token: 'utc', files: { '/App.js': app, '/App.test.js': suite }, preview: false, tests: true }, '*');
      }), { app: UTC_REACT_APP, suite: UTC_REACT_SUITE });
      expect(outcome).toEqual({ passed: 2, failed: 0, errors: [null, null] });
    });
  });
}
