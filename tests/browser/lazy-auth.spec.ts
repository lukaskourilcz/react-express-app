import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// devShark downloads @supabase/supabase-js only for a visitor who is signed in
// or signing in (client/src/lib/supabaseClient.ts). The preview under test must
// be built with a Supabase project configured, as production is; CI builds with
// the placeholder project the bundle budget measures with, and nothing here
// ever reaches it.
const budget = JSON.parse(readFileSync('docs/quality/bundle-budget.json', 'utf8'));
const projectUrl = new URL(budget.measuredBuild.env.VITE_SUPABASE_URL);
// supabase-js's default session key (sessionKeyFor in lib/supabaseClient.ts).
const sessionKey = `sb-${projectUrl.hostname.split('.')[0]}-auth-token`;

// Two chunks start with "supabase-": the library, named by manualChunks in
// client/vite.config.ts, and the app's own lib/supabase.ts API helpers, which
// some routes load. The library is the one that carries the auth client.
const SUPABASE_CHUNK = /^\/assets\/supabase-[\w-]+\.js$/;
const LIBRARY_MARKER = 'GoTrueClient';

interface Watch {
  chunks: string[];
  project: string[];
}

function watch(page: Page): Watch {
  const seen: Watch = { chunks: [], project: [] };
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (SUPABASE_CHUNK.test(url.pathname)) seen.chunks.push(url.href);
    if (url.hostname === projectUrl.hostname) seen.project.push(`${request.method()} ${url.pathname}`);
  });
  return seen;
}

async function libraryRequests(page: Page, chunks: string[]): Promise<string[]> {
  const library: string[] = [];
  for (const url of new Set(chunks)) {
    const body = await (await page.request.get(url)).text();
    if (body.includes(LIBRARY_MARKER)) library.push(url);
  }
  return library;
}

/** The app's own API answers 503, as offline; auth reads recorded. */
async function offlineApi(page: Page) {
  const signInReports: (string | null)[] = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/user/authevent') signInReports.push(route.request().headers().authorization ?? null);
    return route.fulfill({ status: 503, json: { error: { code: 'offline', message: 'offline' } } });
  });
  return signInReports;
}

const fakeUser = {
  id: '00000000-0000-4000-8000-00000000c0de',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'lazy-auth@example.test',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Test Learner' },
  created_at: '2026-09-01T00:00:00Z',
};

/** A well-formed session that no server ever issued. */
function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = [
    part({ alg: 'HS256', typ: 'JWT' }),
    part({ sub: fakeUser.id, aud: 'authenticated', role: 'authenticated', email: fakeUser.email, iat: now, exp: now + 3600 }),
    Buffer.from('not-a-real-signature').toString('base64url'),
  ].join('.');
  return { access_token: accessToken, refresh_token: 'fake-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: fakeUser };
}

/** Supabase Auth, answered locally: nothing leaves the machine. */
async function localAuth(page: Page) {
  await page.route('**/auth/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/v1/user')) return route.fulfill({ json: fakeUser });
    if (url.pathname.endsWith('/auth/v1/authorize')) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Authorize</title><p>Google sign-in would start here.</p>' });
    return route.fulfill({ status: 401, json: { error: 'invalid_grant', error_description: 'local test' } });
  });
}

async function desktop(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

for (const route of ['/', '/learn']) {
  test(`a signed-out first visit to ${route} never downloads supabase-js`, async ({ page }) => {
    await desktop(page);
    await offlineApi(page);
    await localAuth(page);
    // The account button must never pass through its loading skeleton.
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector('[aria-label="Loading account"]')) (window as unknown as { sawAuthLoading: boolean }).sawAuthLoading = true;
      }).observe(document, { childList: true, subtree: true });
    });
    const seen = watch(page);
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Log in', exact: true }).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await libraryRequests(page, seen.chunks)).toEqual([]);
    expect(seen.project).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { sawAuthLoading?: boolean }).sawAuthLoading ?? false)).toBe(false);
  });
}

test('a stored session downloads supabase-js and restores the account', async ({ page }) => {
  await desktop(page);
  const signInReports = await offlineApi(page);
  await localAuth(page);
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: sessionKey, session: fakeSession() });
  const seen = watch(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Account menu for Test' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await libraryRequests(page, seen.chunks)).toHaveLength(1);
  // A valid stored session needs no call to Supabase, and restoring it is not a sign-in.
  expect(seen.project).toEqual([]);
  expect(signInReports).toEqual([]);
});

test('signing in downloads supabase-js on the click, then leaves for the provider', async ({ page }) => {
  await desktop(page);
  await offlineApi(page);
  await localAuth(page);
  const seen = watch(page);
  await page.goto('/');
  const logIn = page.getByRole('button', { name: 'Log in', exact: true }).first();
  await expect(logIn).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await libraryRequests(page, seen.chunks)).toEqual([]);
  await logIn.click();
  await page.waitForURL((url) => url.hostname === projectUrl.hostname);
  const authorize = new URL(page.url());
  expect(authorize.pathname).toBe('/auth/v1/authorize');
  expect(authorize.searchParams.get('provider')).toBe('google');
  expect(await libraryRequests(page, seen.chunks)).toHaveLength(1);
});

test('an OAuth return is read by supabase-js and reported as a sign-in', async ({ page }) => {
  await desktop(page);
  const signInReports = await offlineApi(page);
  await localAuth(page);
  const session = fakeSession();
  const seen = watch(page);
  await page.goto(`/#access_token=${session.access_token}&expires_in=3600&expires_at=${session.expires_at}&refresh_token=fake-refresh-token&token_type=bearer&provider_token=fake`);
  await expect(page.getByRole('button', { name: 'Account menu for Test' })).toBeVisible();
  expect(await libraryRequests(page, seen.chunks)).toHaveLength(1);
  // supabase-js verified the token with Auth (answered locally), stored the
  // session under its default key and cleared the fragment.
  expect(seen.project).toContain('GET /auth/v1/user');
  expect(new URL(page.url()).hash).toBe('');
  expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key) ?? 'null', sessionKey))).toMatchObject({ access_token: session.access_token });
  await expect.poll(() => signInReports).toEqual([`Bearer ${session.access_token}`]);
});
