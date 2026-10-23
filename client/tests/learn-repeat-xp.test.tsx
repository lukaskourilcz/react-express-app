// A signed-in replay of a Learn level pays the level's XP again an hour after
// it last paid (migration 060, owner decision of 9 Oct 2026). The toaster says
// what the replay paid, or, inside the hour, when the XP opens again, in the
// learner's own clock time. The completion's real response shape is
// api/quiz/roadmap.ts, resource=complete.
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Roadmap from '../src/components/Roadmap';
import XpToaster from '../src/components/XpToaster';
import type { RoadmapStructure } from '../src/types/quiz';
import type { LearnRepeatXp } from '../../shared/repeat-xp';
import { masteryDayKey } from '../../shared/mastery';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: { id: 'user-repeat', user_metadata: {} }, isAuthenticated: true, isLoading: false, signInWithGoogle: async () => {} }),
}));

beforeAll(() => {
  // The Learn map measures its canvas; jsdom has no layout to measure.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
beforeEach(() => {
  // A canvas wide enough to draw the map's level nodes.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 720, bottom: 600, width: 720, height: 600, toJSON: () => ({}) } as DOMRect);
});

const DAYS_AGO = (n: number) => masteryDayKey(new Date(Date.now() - n * 86_400_000));
const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const STRUCTURE = {
  topics: ['javascript'],
  structure: { javascript: { levels: Array.from({ length: 6 }, (_, i) => level(i + 1)), checkpoints: [] } },
} as unknown as RoadmapStructure;
// Level 1 passed yesterday: opening it again is a replay.
const PROGRESS = { javascript: { levels: { '1': { passed: true, bestPct: 100, passDays: [DAYS_AGO(1)], mastered: false, lastPassDay: DAYS_AGO(1) } }, checkpoints: {} } };
const QUESTION = { id: 'q-1', tags: [], introduction: '', question: 'Which option is first?', options: ['Option A', 'Option B'], category: 'javascript', difficulty: 1 };
const PLAYABLE = { kind: 'level', topic: 'javascript', ref: 1, title: 'Level 1 title', passPct: 75, sessionId: 'session-1', questions: [QUESTION] };
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
// 14:32 on the learner's own clock, as the toast prints it.
const AT = new Date(2026, 9, 9, 14, 32).toISOString();
const SHOWN = new Date(AT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function answer(repeatXp: LearnRepeatXp | undefined, accountXp = 0) {
  server.use(
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (params.get('resource') === 'progress') return HttpResponse.json({ data: PROGRESS, extra: { unlocked: [] } });
      if (params.get('resource') === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      if (params.get('level')) return HttpResponse.json(PLAYABLE as never);
      return HttpResponse.json(STRUCTURE as never);
    }),
    http.post('*/api/quiz/roadmap', ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'answer') return HttpResponse.json({ selectedIndex: 0, correctAnswer: 0, isCorrect: true, explanation: 'Because it is first.' });
      if (resource === 'complete') {
        return HttpResponse.json({ correctAnswers: 1, totalQuestions: 1, percentage: 100, passed: true, applied: true, codingPending: [], ...(repeatXp ? { repeatXp } : {}) });
      }
      return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
    }),
    http.get('*/api/user/*', ({ request }) => {
      const op = new URL(request.url).searchParams.get('op');
      if (op === 'entitlement') return HttpResponse.json(FREE);
      if (op === 'xp' || request.url.includes('/api/user/xp')) return HttpResponse.json({ data: { quest_xp: accountXp, by_subject: { webdev: accountXp } } });
      return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
    }),
    http.all('*/api/*', () => HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
  );
}

async function replayLevelOne() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn']}>
        <LanguageProvider><Roadmap /><XpToaster /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  fireEvent.click(await screen.findByRole('button', { name: /^Level 1: Level 1 title,/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Start the level' }, { timeout: 3000 }));
  fireEvent.click(screen.getByRole('radio', { name: /Option A/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Finish' }));
  expect(await screen.findByRole('heading', { name: 'Level complete' })).toBeInTheDocument();
}

it('toasts the XP a replayed level paid again', async () => {
  answer({ xp: 50, availableAt: AT, withheld: null }, 50);
  await replayLevelOne();
  expect(await screen.findByText('+50 XP again')).toBeInTheDocument();
  expect(screen.queryByText(/No XP this time/)).toBeNull();
});

it('toasts when the hour held a replayed level’s XP back, in the learner’s clock time', async () => {
  answer({ xp: 0, availableAt: AT, withheld: 'cooldown' });
  await replayLevelOne();
  expect(await screen.findByText(`No XP this time: you can earn it again from ${SHOWN}, an hour after you last earned it.`)).toBeInTheDocument();
  expect(screen.queryByText(/XP again|XP earned/)).toBeNull();
});

it('says nothing about repeat XP when the server sent none', async () => {
  answer(undefined);
  await replayLevelOne();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  expect(screen.queryByText(/No XP this time|XP again/)).toBeNull();
});
