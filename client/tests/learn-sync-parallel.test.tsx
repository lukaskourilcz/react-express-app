// A signed-in Learn map reads the account's progress and XP together (perf
// baseline #587 C08). XP used to wait for progress, one round trip after it,
// so that the rank marker counted the merged learning XP; the map now sets
// the marker again, silently, once both are in.
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Roadmap from '../src/components/Roadmap';
import { getTotalXp } from '../src/lib/xp';
import { clearAccountData } from '../src/lib/accountData';
import { computeLearningXp, levelForXp } from '../src/lib/leveling';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: { id: 'user-sync', user_metadata: {} }, isAuthenticated: true, isLoading: false, signInWithGoogle: async () => {} }),
}));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 720, bottom: 600, width: 720, height: 600, toJSON: () => ({}) } as DOMRect);
});

const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const STRUCTURE = { topics: ['javascript'], structure: { javascript: { levels: Array.from({ length: 12 }, (_, i) => level(i + 1)), checkpoints: [] } } };
// Twelve levels passed on another device: enough learning XP for a rank.
const PROGRESS = { javascript: { levels: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), { passed: true, bestPct: 100 }])), checkpoints: {} } };
// Quest XP just short of a rank that the merged learning XP then reaches: a
// marker set from XP alone would stay a rank short.
const LEARNING_XP = computeLearningXp(PROGRESS as never);
let QUEST_XP = 0;
while (levelForXp(QUEST_XP + LEARNING_XP).level === levelForXp(QUEST_XP).level) QUEST_XP += 5;
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };

it('asks for XP while the progress read is still out, and leaves the rank marker on the merged XP', async () => {
  const events: string[] = [];
  let xpAsked: () => void = () => {};
  const xpSeen = new Promise<void>((resolve) => { xpAsked = resolve; });
  server.use(
    http.get('*/api/quiz/roadmap', async ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      if (resource === 'progress') {
        events.push('progress asked');
        // Answers once XP is asked, or after a second when nothing asks.
        await Promise.race([xpSeen, new Promise((resolve) => setTimeout(resolve, 1000))]);
        events.push('progress answered');
        return HttpResponse.json({ data: PROGRESS, extra: { unlocked: [] } });
      }
      return HttpResponse.json(STRUCTURE as never);
    }),
    http.get('*/api/user/*', ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('op') === 'entitlement') return HttpResponse.json(FREE);
      if (url.pathname.endsWith('/xp') || url.searchParams.get('op') === 'xp') {
        events.push('xp asked');
        xpAsked();
        return HttpResponse.json({ data: { quest_xp: QUEST_XP, by_subject: { webdev: QUEST_XP } } });
      }
      return HttpResponse.json({ enrollments: [] });
    }),
  );
  await act(async () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter initialEntries={['/learn']}>
        <LanguageProvider><Roadmap /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  await screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
  await waitFor(() => expect(events).toContain('progress answered'));
  expect(events.indexOf('xp asked')).toBeGreaterThan(-1);
  expect(events.indexOf('xp asked')).toBeLessThan(events.indexOf('progress answered'));
  // The marker counts the twelve merged levels, as the chained reads left it.
  const expected = levelForXp(getTotalXp()).level;
  expect(expected).toBe(levelForXp(QUEST_XP + LEARNING_XP).level);
  expect(expected).toBeGreaterThan(levelForXp(QUEST_XP).level);
  await waitFor(() => expect(JSON.parse(localStorage.getItem('devquiz:xp:rank-seen:v2') ?? '{}').webdev).toBe(expected));
});

// A client-side return to a map within the minute reads neither again (perf
// baseline #587 C22): the progress sync and the map's XP sync each let a read
// from the last minute answer, while nothing has changed since.
it('reads progress and XP once for a map and a return to it within the minute', async () => {
  clearAccountData();
  const reads = { progress: 0, xp: 0 };
  server.use(
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      if (resource === 'progress') {
        reads.progress += 1;
        return HttpResponse.json({ data: PROGRESS, extra: { unlocked: [] } });
      }
      return HttpResponse.json(STRUCTURE as never);
    }),
    http.get('*/api/user/*', ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('op') === 'entitlement') return HttpResponse.json(FREE);
      if (url.pathname.endsWith('/xp') || url.searchParams.get('op') === 'xp') {
        reads.xp += 1;
        return HttpResponse.json({ data: { quest_xp: QUEST_XP, by_subject: { webdev: QUEST_XP } } });
      }
      return HttpResponse.json({ enrollments: [] });
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const map = () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn']}>
        <LanguageProvider><Roadmap /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const first = await act(async () => map());
  await screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
  await waitFor(() => expect(reads).toEqual({ progress: 1, xp: 1 }));
  // Let both answers be written before leaving.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  first.unmount();

  await act(async () => map());
  await screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
  expect(reads).toEqual({ progress: 1, xp: 1 });
});
