// Perf baseline #587 C15: a signed-in coding list held its first draw on the
// plan, the coding progress and the open run (home) or the saved stars (a
// track), and those reads left only once the screen rendered. On the first
// page of a visit the section's chunk now asks for them as it evaluates, for
// the stored session's account and only with a token supabase-js would hand
// out unchanged, under the keys the hold reads, so the hold finds them in
// flight and asks for nothing twice. The plan already leaves as the app
// starts (entitlement-reads.test.ts).
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

const stored = vi.hoisted(() => ({ userId: 'user-stored' as string | null, token: 'stored-token' as string | null }));
vi.mock('../src/lib/supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/supabaseClient')>()),
  storedSessionUserId: () => stored.userId,
  freshStoredAccessToken: () => stored.token,
}));

const asked: string[] = [];
beforeEach(() => {
  vi.resetModules();
  asked.length = 0;
  stored.userId = 'user-stored';
  stored.token = 'stored-token';
  server.use(
    http.get('*/api/user/*', ({ request }) => {
      const op = new URL(request.url).searchParams.get('op') ?? '';
      asked.push(op);
      if (op === 'coding-progress') return HttpResponse.json({ tasks: {}, javascriptLevelsCleared: 0 });
      if (op === 'coding-bookmarks') return HttpResponse.json({ saved: [], collections: [] });
      return HttpResponse.json({ session: null });
    }),
    http.get('*/api/quiz/roadmap', ({ request }) => {
      asked.push(new URL(request.url).searchParams.get('resource') ?? '');
      return HttpResponse.json({});
    }),
  );
});
afterEach(() => { window.history.replaceState(null, '', '/'); });

async function firstPage(path: string) {
  window.history.replaceState(null, '', path);
  await import('../src/components/coding/CodingSection');
  const { queryClient } = await import('../src/lib/queryClient');
  return queryClient;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

it('asks a track list’s progress and saved stars as the section loads, and the hold asks again for neither', async () => {
  const queryClient = await firstPage('/coding/javascript');
  // Nothing has rendered, and both reads are already out.
  await vi.waitFor(() => expect([...asked].sort()).toEqual(['coding-bookmarks', 'coding-progress']));
  const { codingKeys, codingProgressQuery } = await import('../src/coding/api');
  const { bookmarksQuery, practiceKeys } = await import('../src/coding/practice');
  const { readOnce } = await import('../src/lib/routeData');
  // The hold's own reads (CodingSection useCodingFirstData) find them.
  await Promise.all([readOnce(queryClient, codingProgressQuery), readOnce(queryClient, bookmarksQuery)]);
  await settle();
  expect([...asked].sort()).toEqual(['coding-bookmarks', 'coding-progress']);
  expect(queryClient.getQueryData(codingKeys.progress())).toEqual({ tasks: {}, javascriptLevelsCleared: 0 });
  expect(queryClient.getQueryData(practiceKeys.bookmarks())).toEqual({ saved: [], collections: [] });
});

it('asks the home list’s progress and open run, and the full-stack list’s progress only', async () => {
  await firstPage('/coding');
  await vi.waitFor(() => expect([...asked].sort()).toEqual(['coding-progress', 'practice-session']));

  vi.resetModules();
  asked.length = 0;
  await firstPage('/coding/fullstack');
  await vi.waitFor(() => expect(asked).toEqual(['coding-progress']));
  await settle();
  expect(asked).toEqual(['coding-progress']);
});

it('asks for nothing on a hidden track, the retired review address, or without a fresh stored token', async () => {
  for (const path of ['/coding/system-design', '/coding/review', '/coding/javascript/extra/deeper']) {
    vi.resetModules();
    await firstPage(path);
  }
  await settle();
  expect(asked).toEqual([]);

  // A stored session whose token supabase-js would refresh first: the hold
  // asks as the screen renders, as before.
  stored.token = null;
  vi.resetModules();
  await firstPage('/coding/javascript');
  // Signed out: nothing to ask for.
  stored.userId = null;
  stored.token = 'stored-token';
  vi.resetModules();
  await firstPage('/coding');
  await settle();
  expect(asked).toEqual([]);
});
