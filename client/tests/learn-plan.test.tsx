// Learn and Today follow what the server enforces: the learner's plan, the
// account's verified record and unlocks, and the life of a level's session.
// Each screen is rendered with invented fixtures in the real response shapes.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Today from '../src/components/Today';
import Roadmap from '../src/components/Roadmap';
import RoadmapTree from '../src/components/RoadmapTree';
import CareerRoadmap from '../src/components/CareerRoadmap';
import {
  completeRoadmapAttempt,
  getExtraUnlocks,
  getRoadmapProgress,
  recordLevelResult,
  syncProgressWithServer,
  unlockExtraTopics,
} from '../src/lib/roadmap';
import { closeUpgradeSheet, useUpgradeRequest } from '../src/lib/upgradeSheet';
import { setTrackValue } from '../src/lib/tracks';
import { masteryDayKey } from '../../shared/mastery';
import type { RoadmapStructure } from '../src/types/quiz';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({
  value: { user: null as null | Record<string, unknown>, isAuthenticated: false, isLoading: false, signInWithGoogle: async () => {} },
}));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));

// The /roadmap track switch saves the plan through this one writer.
const saves = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/lib/trackPref', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/trackPref')>()),
  saveLearningPreference: async (...args: unknown[]) => {
    saves.calls.push(args);
    return { ok: true, preference: args[1] };
  },
}));

// The editor is not what these tests are about: a stand-in that finishes the
// task the way the real workbench's Continue does.
vi.mock('../src/coding/CodingWorkbench', async () => {
  const { createElement } = await import('react');
  return {
    CodingWorkbench: ({ onContinue }: { onContinue: () => void }) =>
      createElement('button', { type: 'button', onClick: onContinue }, 'Finish the coding task'),
  };
});

const BACKEND = { schemaVersion: 1, baseTrack: 'backend', specialization: null };
const signInAs = (preference: unknown = null) => {
  auth.value = {
    ...auth.value,
    user: { id: 'user-1', user_metadata: preference ? { devquiz_learning_preference_v1: preference } : {} },
    isAuthenticated: true,
  };
};
afterEach(() => {
  auth.value = { ...auth.value, user: null, isAuthenticated: false };
  saves.calls.length = 0;
  closeUpgradeSheet();
  setTrackValue('fullstack');
});

beforeAll(() => {
  // The Learn map measures its canvas; jsdom has no layout to measure.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const TODAY = masteryDayKey();
const DAYS_AGO = (n: number) => masteryDayKey(new Date(Date.now() - n * 86_400_000));
const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const levels = (count: number) => Array.from({ length: count }, (_, i) => level(i + 1));
const STRUCTURE = {
  topics: ['javascript', 'html', 'css', 'git'],
  structure: {
    javascript: { levels: levels(25), checkpoints: [] },
    html: { levels: levels(6), checkpoints: [] },
    css: { levels: levels(6), checkpoints: [] },
    git: { levels: levels(15), checkpoints: [] },
  },
} as unknown as RoadmapStructure;
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
/** A mastered level passed on three earlier days: nothing due, nothing done today. */
const MASTERED = { passed: true, bestPct: 100, passDays: [DAYS_AGO(20), DAYS_AGO(15), DAYS_AGO(10)], mastered: true, masteredAt: DAYS_AGO(10), lastPassDay: DAYS_AGO(10) };
const QUESTION = { id: 'q-1', tags: [], introduction: '', question: 'Which option is first?', options: ['Option A', 'Option B'], category: 'javascript', difficulty: 1 };
const PLAYABLE = { kind: 'level', topic: 'javascript', ref: 1, title: 'Level 1 title', passPct: 75, sessionId: 'session-1', questions: [QUESTION] };

interface Answers {
  progress?: unknown;
  unlocked?: string[];
  playable?: unknown;
  answer?: () => Response;
  complete?: () => Response;
  placement?: unknown;
  skillCheck?: () => Response;
}
/** Every read and write the Learn screens make; counts the level fetches. */
function answer(options: Answers = {}) {
  const seen = { levelFetches: 0, skillChecks: 0 };
  server.use(
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const params = new URL(request.url).searchParams;
      const resource = params.get('resource');
      if (resource === 'progress') return HttpResponse.json({ data: options.progress ?? {}, extra: { unlocked: options.unlocked ?? [] } });
      if (resource === 'placement') return HttpResponse.json(options.placement as never);
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      if (params.get('level')) {
        seen.levelFetches += 1;
        return HttpResponse.json((options.playable ?? PLAYABLE) as never);
      }
      return HttpResponse.json(STRUCTURE as never);
    }),
    http.put('*/api/quiz/roadmap', () => HttpResponse.json({ ok: true, data: options.progress ?? {}, extra: { unlocked: options.unlocked ?? [] } })),
    http.post('*/api/quiz/roadmap', ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'answer') return options.answer?.() ?? HttpResponse.json({ selectedIndex: 0, correctAnswer: 0, isCorrect: true, explanation: 'Because it is first.' });
      if (resource === 'complete') return options.complete?.() ?? HttpResponse.json({ correctAnswers: 1, totalQuestions: 1, percentage: 100, passed: true, applied: true, codingPending: [] });
      if (resource === 'skill-check') {
        seen.skillChecks += 1;
        return options.skillCheck?.() ?? HttpResponse.json({ applied: true, unlocked: [] });
      }
      return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
    }),
    http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
      ? HttpResponse.json(FREE)
      : HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
    // Anything else these screens touch (XP, the wallet): not part of the test.
    http.all('*/api/*', () => HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
  );
  return seen;
}

let visits = 0;
async function mountAt(path: string, page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, key: `learn-visit-${++visits}` }]}>
        <LanguageProvider>{page}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  await screen.findByRole('heading', { level: 1 });
}

describe('the account’s record', () => {
  it('plans Today from the account, not from an empty browser copy', async () => {
    signInAs(BACKEND);
    answer({ progress: { javascript: { levels: { '1': MASTERED, '2': MASTERED, '3': MASTERED }, checkpoints: {} } } });
    await mountAt('/today', <Today />);
    expect(await screen.findByText('JavaScript · Level 4')).toBeInTheDocument();
    expect(screen.queryByText('JavaScript · Level 1')).toBeNull();
  });

  it('replaces this device’s unlocks with the account’s on sync', async () => {
    unlockExtraTopics(['react', 'nodejs']);
    answer({ unlocked: ['typescript'] });
    await syncProgressWithServer();
    expect(getExtraUnlocks()).toEqual(['typescript']);
  });

  it('keeps the spaced-mastery days a completion returns', async () => {
    const progress = {
      html: {
        checkpoints: {},
        levels: {
          '1': MASTERED,
          '2': { passed: true, bestPct: 100, passDays: [DAYS_AGO(3), TODAY], mastered: false, lastPassDay: TODAY },
        },
      },
    };
    answer({ complete: () => HttpResponse.json({ correctAnswers: 8, totalQuestions: 8, percentage: 100, passed: true, applied: true, codingPending: [], progress }) });
    await completeRoadmapAttempt('session-1');
    // The runner then records the result on this device too.
    recordLevelResult('html', 2, 100);
    const stored = getRoadmapProgress().html!.levels as unknown as Record<string, Record<string, unknown>>;
    expect(stored['1']).toMatchObject({ mastered: true, masteredAt: MASTERED.masteredAt });
    expect(stored['2']).toMatchObject({ passed: true, lastPassDay: TODAY, passDays: [DAYS_AGO(3), TODAY] });
  });

  it('opens nothing on this device when the placement receipt cannot be applied', async () => {
    signInAs(BACKEND);
    let fail = true;
    const seen = answer({
      placement: { done: true, correct: 20, total: 20, difficulty: 5, unlockedPreview: ['typescript', 'react'], resultReceipt: 'receipt-1' },
      skillCheck: () => (fail
        ? HttpResponse.json({ error: { code: 'db_error', message: 'Could not apply assessment unlocks' } }, { status: 500 })
        : HttpResponse.json({ applied: true, unlocked: ['typescript'] })),
    });
    await mountAt('/learn', <Roadmap />);
    fireEvent.click(await screen.findByRole('button', { name: /Skill check/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start placement' }));
    expect(await screen.findByText('Your score could not be saved to your account, so no paths opened. Try again.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(seen.skillChecks).toBe(1);
    expect(screen.queryByText('Every path is now open.')).toBeNull();
    // Try again applies the same receipt.
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(seen.skillChecks).toBe(2));
    await waitFor(() => expect(screen.queryByText(/could not be saved to your account/)).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Back to paths' }));
    expect(getExtraUnlocks()).toEqual(['typescript']);
  });

  it('does not fall back to the score’s own unlocks after a failure', async () => {
    signInAs(BACKEND);
    answer({
      placement: { done: true, correct: 20, total: 20, difficulty: 5, unlockedPreview: ['typescript', 'react'], resultReceipt: 'receipt-1' },
      skillCheck: () => HttpResponse.json({ error: { code: 'db_error', message: 'Could not apply assessment unlocks' } }, { status: 500 }),
    });
    await mountAt('/learn', <Roadmap />);
    fireEvent.click(await screen.findByRole('button', { name: /Skill check/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start placement' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back to paths' }, { timeout: 3000 }));
    expect(getExtraUnlocks()).toEqual([]);
  });
});

describe('a level whose session cannot be used', () => {
  async function openLevelAndAnswer() {
    await mountAt('/learn', <Roadmap />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue — Level 1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start the level' }, { timeout: 3000 }));
    fireEvent.click(screen.getByRole('radio', { name: /Option A/ }));
  }

  it('offers a fresh start when the session timed out', async () => {
    const seen = answer({ answer: () => HttpResponse.json({ error: { code: 'invalid_session', message: 'Learning session expired or invalid' } }, { status: 400 }) });
    await openLevelAndAnswer();
    expect(await screen.findByRole('heading', { name: 'This level timed out' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start the level again' }));
    await waitFor(() => expect(seen.levelFetches).toBe(2));
  });

  it('offers a fresh start when the sign-in changed mid-level', async () => {
    answer({ answer: () => HttpResponse.json({ error: { code: 'session_owner_mismatch', message: 'This lesson was opened under a different sign-in. Start it again.' } }, { status: 409 }) });
    await openLevelAndAnswer();
    expect(await screen.findByRole('heading', { name: 'Your sign-in changed during this level' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the level again' })).toBeInTheDocument();
  });
});
