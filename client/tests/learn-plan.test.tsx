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
// task the way the real workbench's Continue does, or shows the solution the
// way its reveal does.
vi.mock('../src/coding/CodingWorkbench', async () => {
  const { createElement, useState } = await import('react');
  return {
    CodingWorkbench: ({ onContinue, onRevealed }: { onContinue: () => void; onRevealed?: () => void }) => {
      const [solution, setSolution] = useState<string | null>(null);
      return createElement('div', null,
        createElement('button', { type: 'button', onClick: onContinue }, 'Finish the coding task'),
        createElement('button', { type: 'button', onClick: () => { setSolution('const digitSum = (n) => 42; // the reference'); onRevealed?.(); } }, 'Show the solution'),
        solution && createElement('pre', null, solution));
    },
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

describe('the plan', () => {
  it('keeps Today to the topics of a signed-in learner’s track', async () => {
    signInAs(BACKEND);
    answer();
    await mountAt('/today', <Today />);
    expect(await screen.findByText('JavaScript · Level 1')).toBeInTheDocument();
    expect(screen.queryByText('HTML · Level 1')).toBeNull();
    expect(screen.queryByText('CSS · Level 1')).toBeNull();
  });

  it('leaves a visitor’s Today as it was', async () => {
    answer();
    await mountAt('/today', <Today />);
    expect(await screen.findByText('HTML · Level 1')).toBeInTheDocument();
  });

  it('keeps a review of a level passed outside the track', async () => {
    signInAs(BACKEND);
    answer({ progress: { html: { levels: { '1': { passed: true, bestPct: 90, passDays: [DAYS_AGO(2)], mastered: false, lastPassDay: DAYS_AGO(2) } }, checkpoints: {} } } });
    await mountAt('/today', <Today />);
    expect(await screen.findByText('HTML · Level 1')).toBeInTheDocument();
    expect(screen.getByText('Due for review')).toBeInTheDocument();
    expect(screen.queryByText('HTML · Level 2')).toBeNull();
  });

  it('lists only the track’s topics on the Learn rail, and a topic with passed levels', async () => {
    signInAs(BACKEND);
    answer();
    await mountAt('/learn', <Roadmap />);
    expect(await screen.findByRole('radio', { name: /^JavaScript/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^HTML/ })).toBeNull();
    expect(screen.queryByRole('radio', { name: /^CSS/ })).toBeNull();
  });

  it('keeps a topic with passed levels on the rail outside the track', async () => {
    signInAs(BACKEND);
    answer({ progress: { html: { levels: { '1': MASTERED }, checkpoints: {} } } });
    await mountAt('/learn', <Roadmap />);
    expect(await screen.findByRole('radio', { name: /^HTML/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^CSS/ })).toBeNull();
  });

  it('lists every topic for a visitor', async () => {
    answer();
    await mountAt('/learn', <Roadmap />);
    expect(await screen.findByRole('radio', { name: /^HTML/ })).toBeInTheDocument();
  });

  it('draws only the track’s topics in the roadmap tree', async () => {
    signInAs(BACKEND);
    answer();
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><RoadmapTree structure={STRUCTURE} track="fullstack" /></LanguageProvider></MemoryRouter></QueryClientProvider>);
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.queryByText('HTML')).toBeNull();
  });

  it('saves the /roadmap track to the account when signed in', async () => {
    signInAs(BACKEND);
    answer();
    await mountAt('/roadmap', <CareerRoadmap />);
    fireEvent.click(screen.getByRole('radio', { name: 'Frontend' }));
    await waitFor(() => expect(saves.calls).toHaveLength(1));
    expect(saves.calls[0][0]).toBe('user-1');
    expect(saves.calls[0][1]).toMatchObject({ baseTrack: 'frontend', specialization: null });
    expect(await screen.findByText('Saved: Frontend')).toBeInTheDocument();
  });

  it('only changes the view for a visitor', async () => {
    answer();
    await mountAt('/roadmap', <CareerRoadmap />);
    fireEvent.click(screen.getByRole('radio', { name: 'Backend' }));
    expect(saves.calls).toHaveLength(0);
  });
});

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

describe('Premium on Today', () => {
  it('says Premium opens the next level when nothing free is left to start', async () => {
    signInAs(BACKEND);
    const allPassed = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [String(i + 1), MASTERED]));
    answer({ progress: { javascript: { levels: allPassed, checkpoints: {} } } });
    await mountAt('/today', <Today />);
    expect(await screen.findByText('Premium opens your next level')).toBeInTheDocument();
    expect(screen.queryByText('Nothing is due today. A new plan is ready tomorrow.')).toBeNull();
    expect(screen.getByText(/Next on your path is TypeScript · Level 1, which Premium opens/)).toBeInTheDocument();
    let request: ReturnType<typeof useUpgradeRequest> = null;
    function Probe() { request = useUpgradeRequest(); return null; }
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'See what Premium includes' }));
    expect(request).toMatchObject({ kind: 'learn-level' });
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

  it('passes a visitor’s level on its questions, keeps it on this device, and says when coding counts', async () => {
    answer({
      playable: { ...PLAYABLE, coding: [{ task: { id: 'js-digit-sum', title: { en: 'Digit sum', cs: '' } }, session: 'coding-session-1' }] },
      complete: () => HttpResponse.json({ correctAnswers: 1, totalQuestions: 1, percentage: 100, passed: true, applied: true, codingPending: [], codingUnverified: true }),
    });
    await openLevelAndAnswer();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish the coding task' }));
    expect(await screen.findByRole('heading', { name: 'Level complete' })).toBeInTheDocument();
    // Signing in replaces this device's progress with the account's, so the
    // copy no longer promises the pass is "checked and saved when you sign in".
    expect(screen.getByText('Coding tasks are not checked while you’re signed out. This pass stays on this device only, and signing in starts from your account’s progress instead.')).toBeInTheDocument();
    expect(screen.queryByText(/when you sign in/)).toBeNull();
    // The coding was not checked, so the screen does not say it passed.
    expect(screen.queryByText('All coding tasks passed.')).toBeNull();
    expect(screen.queryByText(/still to pass/)).toBeNull();
    expect(getRoadmapProgress().javascript?.levels['1']?.passed).toBe(true);
  });

  it('still holds a signed-in level until its coding task passes', async () => {
    signInAs();
    answer({
      playable: { ...PLAYABLE, coding: [{ task: { id: 'js-digit-sum', title: { en: 'Digit sum', cs: '' } }, session: 'coding-session-1' }] },
      complete: () => HttpResponse.json({ correctAnswers: 1, totalQuestions: 1, percentage: 100, passed: false, applied: true, codingPending: ['js-digit-sum'] }),
    });
    await openLevelAndAnswer();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish the coding task' }));
    expect(await screen.findByRole('heading', { name: 'Not passed' })).toBeInTheDocument();
    expect(screen.getByText('1 coding tasks still to pass')).toBeInTheDocument();
    expect(screen.queryByText(/Coding tasks are not checked while you’re signed out/)).toBeNull();
  });

  // CODE-4: revealing a solution inside a level completed the attempt at once,
  // and the finish screen replaced the solution the learner had just paid for.
  it('keeps a revealed solution on screen until the learner finishes the level', async () => {
    signInAs();
    let completions = 0;
    answer({
      playable: { ...PLAYABLE, coding: [{ task: { id: 'js-digit-sum', title: { en: 'Digit sum', cs: '' } }, session: 'coding-session-1' }] },
      complete: () => {
        completions += 1;
        return HttpResponse.json({ correctAnswers: 1, totalQuestions: 1, percentage: 100, passed: false, applied: true, codingPending: ['js-digit-sum'] });
      },
    });
    await openLevelAndAnswer();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Show the solution' }));
    expect(await screen.findByText(/the reference/)).toBeInTheDocument();
    // It points at the workbench's "Reference solution" block under the hints
    // (learn-reveal-message.test.tsx); a level has no Solution tab (C3-14).
    expect(screen.getByText(/Showing it ended this level attempt/)).toHaveTextContent(/^The reference solution is open under the hints\./);
    expect(screen.queryByText(/Solution tab/)).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(completions).toBe(0);
    expect(screen.getByText(/the reference/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish the level' }));
    expect(await screen.findByRole('heading', { name: 'Not passed' })).toBeInTheDocument();
    expect(completions).toBe(1);
  });
});
