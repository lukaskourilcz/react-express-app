import { test, expect, type Page } from '@playwright/test';

// A page whose code does not load used to replace the whole app with the root
// error screen: on devshark.app a dropped request for one chunk took the
// header, the nav and the footer with it. The route error boundary keeps the
// shell, and Try again gets the page back. Chromium before 156 remembers a
// failed module fetch for the life of the document, so there the retry
// reloads the address; a browser that forgets it draws the page in place.
// Each test says which of the two happened.

const CODING_PAGE = /\/assets\/CodingSection-[\w-]+\.js$/;
// A chunk the Coding page imports and the landing page does not load.
const CODING_DEPENDENCY = /\/assets\/coding-catalog-[\w-]+\.js$/;
const CODING_LINK = 'nav.ss-nav-center a[href="/coding"]';

async function prepare(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.addInitScript(() => {
    try { localStorage.setItem('devquiz:color-mode', 'light'); } catch { /* private mode */ }
  });
  // The API answers at once and says little, as in navigation.spec.ts.
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/quiz/roadmap' && !url.search) return route.fulfill({ json: { topics: [], structure: {} } });
    return route.fulfill({ status: 503, json: { error: { code: 'offline', message: 'offline' } } });
  });
  // Every document the tab loads: a second one is a reload.
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) documents.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return { documents };
}

/** Drop every request for the matching chunk while `failing` is set. */
async function dropChunk(page: Page, pattern: RegExp) {
  const chunk = { failing: true, dropped: 0, served: 0 };
  await page.route(pattern, (route) => {
    if (chunk.failing) {
      chunk.dropped += 1;
      return route.abort('failed');
    }
    chunk.served += 1;
    return route.continue();
  });
  return chunk;
}

// Pages have alert regions of their own (the quiz's form message), so the
// panel is the alert that says what happened.
const panelOf = (page: Page) => page.locator('#main-content').getByRole('alert').filter({ hasText: 'Something went wrong' });
const codingHeading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Coding challenges' });

async function expectShell(page: Page) {
  await expect(page.locator('header.ss-header')).toBeVisible();
  await expect(page.locator('nav.ss-nav-center')).toBeVisible();
  await expect(page.locator('footer.ss-brand-footer')).toBeVisible();
}

for (const { name, pattern } of [
  { name: 'the Coding page chunk', pattern: CODING_PAGE },
  { name: 'a chunk the Coding page imports', pattern: CODING_DEPENDENCY },
]) {
  test(`${name} fails to load: the shell stays, the nav still works, Try again brings the page back`, async ({ page }) => {
    const { documents } = await prepare(page);
    const chunk = await dropChunk(page, pattern);

    await page.locator(CODING_LINK).click();
    const panel = panelOf(page);
    await expect(panel).toContainText('Something went wrong');
    await expect(panel).toContainText('Network error. Check your connection and try again.');
    expect(chunk.dropped).toBeGreaterThan(0);
    await expectShell(page);
    await expect(page).toHaveURL(/\/coding$/);
    await expect(page.locator(CODING_LINK)).toHaveAttribute('aria-current', 'page');
    await expect(panel.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(documents).toHaveLength(1);

    // Another page opens without a retry: each path gets a fresh boundary.
    await page.locator('nav.ss-nav-center a[href="/quiz"]').click();
    await expect(page).toHaveURL(/\/quiz$/);
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Back on Coding with the chunk still failing, then the connection returns.
    await page.locator(CODING_LINK).click();
    await expect(panel).toContainText('Something went wrong');
    chunk.failing = false;
    await panel.getByRole('button', { name: 'Try again' }).click();
    await expect(codingHeading(page)).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expectShell(page);
    // The retry asked the network again for the chunk.
    expect(chunk.served).toBeGreaterThan(0);
    test.info().annotations.push({ type: 'recovery', description: documents.length > 1 ? 'reloaded the address' : 'drew the page in place' });
  });
}

test('a preload that fails on hover neither reloads nor shows an error', async ({ page }) => {
  const { documents } = await prepare(page);
  const chunk = await dropChunk(page, CODING_PAGE);
  await page.evaluate(() => {
    const counter = window as unknown as { __preloadErrors: number };
    counter.__preloadErrors = 0;
    window.addEventListener('vite:preloadError', () => { counter.__preloadErrors += 1; });
  });

  // A resting pointer starts the page's import (lib/routePreload.ts).
  await page.locator(CODING_LINK).hover();
  await expect.poll(() => chunk.dropped).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __preloadErrors: number }).__preloadErrors)).toBeGreaterThan(0);
  // Vite announced the failure; nothing may act on it. Give a reload time to start.
  await page.waitForTimeout(600);
  expect(documents).toHaveLength(1);
  await expect(page).toHaveURL(/\/$/);
  await expect(panelOf(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a supabase-js download that fails on a sign-in click neither reloads nor reaches the route boundary', async ({ page }) => {
  // supabase-js is its own chunk, loaded on the click (lib/supabaseClient.ts);
  // two chunks start with "supabase-", and the library carries GoTrueClient.
  // The build needs a Supabase project configured, as CI's has.
  const { documents } = await prepare(page);
  let failing = true;
  let dropped = 0;
  await page.route(/\/assets\/supabase-[\w-]+\.js$/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (failing && body.includes('GoTrueClient')) {
      dropped += 1;
      return route.abort('failed');
    }
    return route.fulfill({ response, body });
  });
  // Anything that would leave for the sign-in provider stays local.
  await page.route('**/auth/v1/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Authorize</title>' }));

  const logIn = page.getByRole('button', { name: 'Log in', exact: true }).first();
  await logIn.click();
  // The click reports the failure itself, and nothing else happens.
  await expect(page.getByText('Sign-in failed. Please try again.')).toBeVisible();
  expect(dropped).toBe(1);
  await page.waitForTimeout(600);
  expect(documents).toHaveLength(1);
  await expect(page).toHaveURL(/\/$/);
  await expect(panelOf(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // The next click asks again (loadSupabase forgets the failure). Whether the
  // browser fetches the chunk again depends on its module map; either way the
  // page stays.
  failing = false;
  await logIn.click();
  await page.waitForTimeout(600);
  const left = new URL(page.url()).pathname === '/auth/v1/authorize';
  test.info().annotations.push({ type: 'second sign-in click', description: left ? 'reached the provider' : 'failed again from the module map' });
  expect(documents.length).toBeLessThanOrEqual(left ? 2 : 1);
});

test('offline: no reload, and the page comes back with the connection, without a press', async ({ page, context }) => {
  const { documents } = await prepare(page);
  await context.setOffline(true);
  await page.locator(CODING_LINK).click();
  const panel = panelOf(page);
  await expect(panel).toContainText('Network error');
  await expectShell(page);
  // A reload offline would swap the app for the browser's offline page.
  await page.waitForTimeout(600);
  expect(documents).toHaveLength(1);

  await context.setOffline(false);
  await expect(codingHeading(page)).toBeVisible();
  await expect(panel).toHaveCount(0);
  test.info().annotations.push({ type: 'recovery', description: documents.length > 1 ? 'reloaded the address' : 'drew the page in place' });
});

test('a newer build on the server reloads once; the loop guard then keeps the panel until Try again', async ({ page }) => {
  const { documents } = await prepare(page);
  const index = await (await page.request.get('/')).text();
  const entry = index.match(/\/assets\/main-[\w-]+\.js/)?.[0];
  expect(entry, 'the entry script in index.html').toBeTruthy();

  // A deploy replaced the build. The old Coding chunk is gone, and the server
  // answers its address with index.html, as devshark.app does; a fresh
  // index.html names another entry script.
  let deployed = true;
  await page.route(CODING_PAGE, (route) => (deployed
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: index })
    : route.continue()));
  await page.route((url) => url.pathname === '/', (route) => (deployed && route.request().resourceType() === 'fetch'
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: index.replace(entry!, '/assets/main-NEWBUILD.js') })
    : route.continue()));

  await page.locator(CODING_LINK).click();
  // The first failure reloads at once. The reloaded page finds the chunk
  // still missing, and a second automatic reload within the minute is refused.
  const panel = panelOf(page);
  await expect(panel).toContainText('Something went wrong');
  expect(documents).toHaveLength(2);
  await expect(page).toHaveURL(/\/coding$/);
  await expectShell(page);
  await page.waitForTimeout(600);
  expect(documents).toHaveLength(2);

  // The learner's press reloads whatever the guard says.
  deployed = false;
  await panel.getByRole('button', { name: 'Try again' }).click();
  await expect(codingHeading(page)).toBeVisible();
  expect(documents.length).toBeGreaterThanOrEqual(2);
});
