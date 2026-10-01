// Today's two closing panels: the target reached, and nothing queued. Both
// talk about the next day, so both say when it starts on the learner's clock
// (the server's day changes at 00:00 UTC). Reaching the target hands out
// nothing, so the panel promises nothing.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Today from '../src/components/Today';
import { localDayChangeTime } from '../src/lib/utcDay';
import { masteryDayKey } from '../../shared/mastery';
import { partRanges } from '../../shared/progression';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({
  value: { user: null as null | Record<string, unknown>, isAuthenticated: false, isLoading: false, signInWithGoogle: async () => {} },
}));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
afterEach(() => { auth.value = { ...auth.value, user: null, isAuthenticated: false }; });
beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });

const TODAY = masteryDayKey();
const DAYS_AGO = (n: number) => masteryDayKey(new Date(Date.now() - n * 86_400_000));
const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1, questionCount: 8 });
const levels = (count: number) => Array.from({ length: count }, (_, i) => level(i + 1));
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PASSED_TODAY = { passed: true, bestPct: 100, passDays: [TODAY], mastered: false, lastPassDay: TODAY };
const MASTERED = { passed: true, bestPct: 100, passDays: [DAYS_AGO(20), DAYS_AGO(15), DAYS_AGO(10)], mastered: true, masteredAt: DAYS_AGO(10), lastPassDay: DAYS_AGO(10) };
const dayChange = `Days change at ${localDayChangeTime()} your time.`;

function answer(structure: unknown, progress: unknown) {
  server.use(
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'progress') return HttpResponse.json({ data: progress, extra: { unlocked: [] } });
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      return HttpResponse.json(structure as never);
    }),
    http.put('*/api/quiz/roadmap', () => HttpResponse.json({ ok: true, data: progress, extra: { unlocked: [] } })),
    http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
      ? HttpResponse.json(FREE)
      : HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
    // The signed-in extras under the plan (concepts due, runs, paths): not part of the test.
    http.all('*/api/*', () => HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
  );
  localStorage.setItem('devquiz:roadmap:v2', JSON.stringify(progress));
}

async function mountToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/today']}>
        <LanguageProvider><Today /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

describe('Today, target reached', () => {
  it('says the plan is complete and when the next day starts, and offers no card pack', async () => {
    answer(
      { topics: ['javascript', 'html', 'css'], structure: { javascript: { levels: levels(25), checkpoints: [] }, html: { levels: levels(6), checkpoints: [] }, css: { levels: levels(6), checkpoints: [] } } },
      { javascript: { levels: { 1: PASSED_TODAY, 2: PASSED_TODAY, 3: PASSED_TODAY }, checkpoints: {} } },
    );
    await mountToday();
    expect(await screen.findByText('Today’s plan is complete')).toBeInTheDocument();
    expect(screen.getByText('Target reached')).toBeInTheDocument();
    expect(screen.getByText(dayChange)).toBeInTheDocument();
    // The Shark Cards client is gone; nothing in the app opens a pack.
    expect(screen.queryByText('Card pack ready')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open your pack' })).toBeNull();
    expect(document.querySelector('a[href="/collection"]')).toBeNull();
  });
});

describe('Today, nothing queued', () => {
  it('says a new plan comes tomorrow and when tomorrow starts', async () => {
    // A backend learner who passed the first part of JavaScript and not its
    // test: no review is due, the next level waits for the test, and no other
    // backend topic is open yet.
    auth.value = {
      ...auth.value,
      user: { id: 'user-1', user_metadata: { devquiz_learning_preference_v1: { schemaVersion: 1, baseTrack: 'backend', specialization: null } } },
      isAuthenticated: true,
    };
    const [part1] = partRanges(6);
    const passed = Object.fromEntries(Array.from({ length: part1.size }, (_, i) => [String(part1.startLevel + i), MASTERED]));
    answer({ topics: ['javascript'], structure: { javascript: { levels: levels(6), checkpoints: [] } } }, { javascript: { levels: passed, checkpoints: {} } });
    await mountToday();
    expect(await screen.findByText('Nothing is due today. A new plan is ready tomorrow.')).toBeInTheDocument();
    expect(screen.getByText(dayChange)).toBeInTheDocument();
  });
});
