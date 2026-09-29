// The pages whose first render now waits for what used to arrive after it:
// the Challenge's board line, Today's signed-in sections and the roadmap's
// optional paths. Each check reads the document at the moment the page's
// heading first appeared (./firstDraw.ts), which an awaited act cannot.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Challenge from '../src/components/Challenge';
import Today from '../src/components/Today';
import CareerRoadmap from '../src/components/CareerRoadmap';
import { server } from './mocks/server';
import { firstDraw, headings } from './firstDraw';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
const signIn = () => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; };
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

// The sections' own code, fetched once up front as the browser would have it
// cached: a first import in the test runner compiles the module, and an act
// stops waiting for a held render long before that finishes.
beforeAll(() => Promise.all([
  import('../src/components/ConceptDueSection'),
  import('../src/components/coding/ChallengeRunSection'),
  import('../src/components/coding/CodingDueSection'),
  import('../src/components/paths/PathResumeSection'),
  import('../src/components/paths/PathDiscovery'),
]));

// A page that holds its first render has to start inside an awaited act. Each
// mount is a visit of its own, with a key that stays put while the held render
// is retried (lib/routeData.ts keys its wait by the visit). The page's heading
// is then awaited, so a hold that outlasts the act still ends inside the test.
let visits = 0;
async function mountAt(path: string, page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, key: `visit-${++visits}` }]}>
        <LanguageProvider>{page}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  await screen.findByRole('heading', { level: 1 });
}

// Invented fixtures in the real response shapes.
const BOARD = {
  top: [{ id: 'run-1', name: 'Harbour reader', score: 42, createdAt: '2026-09-25T10:00:00Z' }],
  champion: { id: 'run-1', name: 'Harbour reader', score: 42, createdAt: '2026-09-25T10:00:00Z' },
};
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
// Premium opens the learning paths, so Today offers a path's next step only to
// an account that holds it.
const PREMIUM = { ...FREE, tier: 'premium' };
const MANIFEST = {
  id: 'dsa-foundations', kind: 'skill_path', version: 1,
  title: { en: 'DSA Foundations', cs: '' },
  summary: { en: 'Data structures and algorithms from the ground up.', cs: '' },
  entryRequirement: { en: 'No base track needed.', cs: '' },
  estimatedHours: { min: 20, max: 30 },
  modules: [{ id: 'dsa-v1-entry', title: { en: 'Entry', cs: '' }, activities: [{ id: 'dsa-v1-entry-check', title: { en: 'Where you start', cs: '' } }] }],
};
const CATALOG = {
  versions: { 'dsa-foundations': 1 },
  paths: [{ manifest: MANIFEST, availability: 'available', inventory: { modules: 1, lessons: 0, moduleChecks: 1, moduleCodeExercises: 0, finalCodeExercises: 0 } }],
};
const ENROLLMENT = { enrollmentId: 'enr-1', pathId: 'dsa-foundations', curriculumVersion: 1, status: 'active', baseTrackAtEnrollment: null, startedAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-25T10:00:00Z' };
const RUN = { session: { sessionId: 'run-1', minutes: 20, topic: 'javascript', queue: ['js-digit-sum'], position: 0, status: 'active', estimatedMinutes: 20, order: 'sequential', count: 1, scheduledFor: null } };

/** Every read the three pages make; returns the account reads it answered. */
function answer(plan: typeof FREE = FREE) {
  const accountReads: string[] = [];
  server.use(
    http.get('*/api/quiz/challenge', () => HttpResponse.json(BOARD)),
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'learning-path-catalog') return HttpResponse.json(CATALOG);
      if (resource === 'progress') return HttpResponse.json({ error: { code: 'missing_token', message: 'Missing Bearer token' } }, { status: 401 });
      return HttpResponse.json({ topics: [], structure: {} });
    }),
    http.get('*/api/quiz/questions', () => {
      accountReads.push('concept-due');
      return HttpResponse.json({ due: [{ conceptId: 'js-promises', overdueHours: 30, stage: 2 }], estimatedMinutes: 4 });
    }),
    http.get('*/api/user/*', ({ request }) => {
      const op = new URL(request.url).searchParams.get('op') ?? '';
      accountReads.push(op);
      if (op === 'entitlement') return HttpResponse.json(plan);
      if (op === 'practice-session') return HttpResponse.json(RUN);
      if (op === 'coding-progress') return HttpResponse.json({ tasks: {}, due: [], javascriptLevelsCleared: 0, passedByTrack: {} });
      if (op === 'learning-path-enrollment') return HttpResponse.json({ enrollments: [ENROLLMENT] });
      if (op === 'learning-path-progress') {
        return HttpResponse.json({ enrollment: ENROLLMENT, modules: [], competencies: [], recommendedBridges: [], nextActivityId: 'dsa-v1-entry-check', guidedComplete: false, artifacts: { submitted: 0, total: 1 }, dueActivityIds: [] });
      }
      return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
    }),
  );
  return accountReads;
}

describe('/challenge', () => {
  it('draws its board line with the page', async () => {
    answer();
    const drawn = firstDraw('h1', () => ({ board: screen.queryByText('Harbour reader') !== null, waiting: screen.queryByText('…') !== null }));
    await mountAt('/challenge', <Challenge />);
    expect(drawn()).toEqual({ board: true, waiting: false });
  });

  it('draws the page and its notice when the board cannot load', async () => {
    answer();
    server.use(http.get('*/api/quiz/challenge', () => HttpResponse.json({ error: { code: 'db_error', message: 'Down' } }, { status: 500 })));
    await mountAt('/challenge', <Challenge />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('The top scores could not be loaded. You can still play.')).toBeInTheDocument();
  });
});

describe('/today', () => {
  it('draws a signed-in learner’s review, run and path sections with the plan', async () => {
    signIn();
    answer(PREMIUM);
    const drawn = firstDraw('h1', headings);
    await mountAt('/today', <Today />);
    expect(drawn()).toEqual(expect.arrayContaining(['Today', 'Due for review', 'Challenge run', 'Learning paths']));
    expect(screen.getByText('Where you start')).toBeInTheDocument();
  });

  it('asks nothing of a visitor’s account and draws no signed-in section', async () => {
    const accountReads = answer();
    await mountAt('/today', <Today />);
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Due for review|Challenge run|Learning paths/ })).toBeNull();
    expect(accountReads).toEqual([]);
  });
});

describe('/roadmap', () => {
  it('draws the optional paths with the page', async () => {
    answer();
    const drawn = firstDraw('h1', () => document.querySelector('section[aria-label="Modules"]')?.textContent ?? null);
    await mountAt('/roadmap', <CareerRoadmap />);
    expect(drawn()).toContain('DSA Foundations');
  });

  it('draws a signed-in learner’s enrolled path as one to continue', async () => {
    signIn();
    const accountReads = answer();
    const drawn = firstDraw('h1', () => document.querySelector('section[aria-label="Modules"]')?.textContent ?? null);
    await mountAt('/roadmap', <CareerRoadmap />);
    expect(drawn()).toContain('Continue');
    expect(accountReads).toContain('learning-path-enrollment');
  });
});
