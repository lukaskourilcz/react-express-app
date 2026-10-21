// Who may start a learning path, and what the path's screens offer when they
// may not: Premium opens the paths, a switched-off path offers nothing to
// resume, and the Profile picker never pauses a path the learner started on
// its own page.
import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

const lesson = (id: string, title: string) => ({
  id, kind: 'lesson', purpose: 'exercise', verification: 'self_reviewed', title: title, summary: title, competencies: [], estimatedMinutes: 5,
});
const pathManifest = (id: 'fde' | 'dsa-foundations') => ({
  id, kind: id === 'fde' ? 'role_specialization' : 'skill_path', version: 1, title: id === 'fde' ? 'Forward Deployed Engineer' : 'DSA Foundations',
  summary: '', outcomes: [], nonGoals: [], entryRequirement: '', competencies: id === 'fde' ? [{ id: 'integration', title: 'Integration and data' }, { id: 'handoff', title: 'Adoption and handoff' }, { id: 'python-reading', title: 'Python comprehension' }] : [], bridges: [],
  rubric: { version: 1, dimensions: [] }, diagnosticActivityId: id === 'fde' && state.diagnosticResults.length ? 'fde-diagnostic-check' : null, estimatedHours: { min: 1, max: 2 }, sources: [], reviewedOn: '2026-01-01',
  completionLabel: 'done',
  modules: [...(id === 'fde' && state.diagnosticResults.length ? [{
    id: 'fde-diagnostic', title: 'Optional diagnostic', optional: true, outcomes: [], competencies: [], dependsOn: [], lessons: [],
    activities: [{ ...lesson('fde-diagnostic-check', 'Diagnostic check'), kind: 'check', purpose: 'diagnostic' }], requires: [], estimatedMinutes: 10,
  }] : []), {
    id: `${id}-m01`, title: 'Module one', outcomes: [], competencies: [], dependsOn: [], lessons: [],
    activities: [lesson(`${id}-m01-l1-read`, `${id} first lesson`)], requires: [], estimatedMinutes: 10,
  }, ...(id === 'fde' && state.shelf ? [{
    id: 'fde-ip01', title: 'Learning round', optional: true, shelf: 'interview-prep', outcomes: [], competencies: [], dependsOn: [], lessons: [],
    activities: [lesson('fde-ip01-l1', 'Interview lesson')], requires: [], estimatedMinutes: 10,
  }] : [])],
});
const inventory = { modules: 1, lessons: 1, checks: 0, codeExercises: 0, artifacts: 0, estimatedMinutes: 10, moduleChecks: 0, moduleCodeExercises: 0, finalChecks: 0, finalCodeExercises: 0, diagnosticChecks: 0, diagnosticCodeExercises: 0 };

const state = vi.hoisted(() => ({
  tier: 'premium' as 'premium' | 'free',
  availability: 'available',
  enrollments: [] as { enrollmentId: string; pathId: string; curriculumVersion: number; status: string }[],
  progressLoaded: true,
  shelf: false,
  diagnosticResults: [] as { competencyId: string; state: 'demonstrated' | 'gap' | 'not_assessed'; score: number | null; assessedItems: number }[],
  metadata: {} as Record<string, unknown>,
  changes: [] as Record<string, unknown>[],
  saves: [] as unknown[][],
  sheet: vi.fn(),
}));

vi.mock('../src/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', user_metadata: state.metadata }, isAuthenticated: true, isLoading: false }),
}));
vi.mock('../src/lib/entitlement', () => ({
  useEntitlement: () => ({ tier: state.tier, signedIn: true, loading: false, failed: false, data: null, refetch: () => {} }),
}));
vi.mock('../src/lib/upgradeSheet', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/upgradeSheet')>(),
  openUpgradeSheet: state.sheet,
}));
vi.mock('../src/lib/trackPref', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/trackPref')>(),
  saveLearningPreference: vi.fn(async (...args: unknown[]) => {
    state.saves.push(args);
    return { ok: true, preference: args[1] };
  }),
}));
vi.mock('../src/lib/learningPaths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/learningPaths')>();
  const progressFor = (pathId: string) => ({
    enrollment: null, modules: [], competencies: pathId === 'fde' ? state.diagnosticResults : [], recommendedBridges: [], guidedComplete: false,
    // FDE's modules require three written pieces; DSA has none.
    artifacts: pathId === 'fde' ? { submitted: 1, total: 3 } : { submitted: 0, total: 0 },
    dueActivityIds: [], nextActivityId: `${pathId}-m01-l1-read`,
  });
  return {
    ...actual,
    usePathCatalog: () => ({
      isLoading: false, isError: false, refetch: () => {},
      data: {
        paths: (['fde', 'dsa-foundations'] as const).map((id) => ({
          manifest: pathManifest(id), availability: state.availability, inventory: { ...inventory, artifacts: id === 'fde' ? 3 : 0 },
        })),
        versions: {},
      },
    }),
    useEnrollments: () => ({ data: { enrollments: state.enrollments.map((one) => ({ baseTrackAtEnrollment: null, startedAt: '', updatedAt: '', ...one })) } }),
    usePathProgress: (_user: string | undefined, enrollmentId: string | undefined) => {
      const enrollment = state.enrollments.find((one) => one.enrollmentId === enrollmentId);
      return { data: enrollment && state.progressLoaded ? progressFor(enrollment.pathId) : undefined };
    },
    pathProgressQuery: (_user: string | undefined, enrollmentId: string | undefined) => ({
      queryKey: ['learning-path', 'progress', 'test', enrollmentId ?? ''],
      queryFn: () => (state.progressLoaded
        ? Promise.resolve(progressFor(state.enrollments.find((one) => one.enrollmentId === enrollmentId)!.pathId))
        : new Promise(() => {})),
      staleTime: Infinity,
    }),
    changeEnrollment: vi.fn(async (input: Record<string, unknown>) => {
      state.changes.push(input);
      return { enrollments: [] };
    }),
  };
});

const enrolled = (pathId: 'fde' | 'dsa-foundations', status = 'active') => ({ enrollmentId: `ENROLL-${pathId}-0000000000`, pathId, curriculumVersion: 1, status });

beforeAll(async () => {
  const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
  proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  // The screens' code, compiled once up front rather than inside the first
  // test's time budget. Imported here, after the fixtures the mocks read.
  await Promise.all([
    import('../src/i18n/LanguageContext'),
    import('../src/components/paths/LearningPathScreens'),
    import('../src/components/paths/PathDiscovery'),
    import('../src/components/paths/PathResumeSection'),
    import('../src/components/paths/LearningPathsCard'),
    import('../src/components/paths/PathRewardClaim'),
  ]);
}, 60_000);
beforeEach(() => {
  state.tier = 'premium';
  state.availability = 'available';
  state.enrollments = [];
  state.progressLoaded = true;
  state.shelf = false;
  state.diagnosticResults = [];
  state.metadata = {};
  state.changes.length = 0;
  state.saves.length = 0;
  state.sheet.mockReset();
  server.use(http.get('*/api/user/learning-path-reward', () => HttpResponse.json({ eligible: false, claimed: false, orderId: null })));
});

async function mount(path: string, route: string, element: () => Promise<ReactElement>) {
  const { LanguageProvider } = await import('../src/i18n/LanguageContext');
  const view = await element();
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <LanguageProvider>
            <Routes><Route path={route} element={view} /></Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}
const overview = (pathId: 'fde' | 'dsa-foundations') => mount('/p', '/p', async () => {
  const { PathOverview } = await import('../src/components/paths/LearningPathScreens');
  return <PathOverview pathId={pathId} />;
});

describe('the path page', () => {
  it('shows distinct diagnostic states and assessed counts, with a reachable retake link', async () => {
    state.enrollments = [enrolled('fde')];
    state.diagnosticResults = [
      { competencyId: 'integration', state: 'gap', score: 0.3333, assessedItems: 3 },
      { competencyId: 'handoff', state: 'demonstrated', score: 1, assessedItems: 3 },
      { competencyId: 'python-reading', state: 'not_assessed', score: null, assessedItems: 0 },
    ];
    await overview('fde');
    const report = screen.getByRole('region', { name: 'Diagnostic overview' });
    expect(within(report).getByText(/Worth practising/)).toHaveTextContent('33% · Items assessed: 3');
    expect(within(report).getByText(/Demonstrated in this check/)).toHaveTextContent('100% · Items assessed: 3');
    const unknown = within(report).getByText(/Not assessed/);
    expect(unknown).toHaveTextContent('Python comprehension');
    expect(unknown).not.toHaveTextContent('0%');
    expect(within(report).getByRole('link', { name: 'Open the diagnostic' })).toHaveAttribute('href', '/roadmap/specializations/fde/fde-diagnostic?activity=fde-diagnostic-check');
  });

  it('keeps old unassessed diagnostic results readable when access is paused, without an active start link', async () => {
    state.availability = 'disabled';
    state.enrollments = [enrolled('fde', 'paused')];
    state.diagnosticResults = [{ competencyId: 'integration', state: 'not_assessed', score: null, assessedItems: 0 }];
    await overview('fde');
    const report = screen.getByRole('region', { name: 'Diagnostic overview' });
    expect(within(report).getByText(/Not assessed/)).not.toHaveTextContent('0%');
    expect(within(report).getByText(/Results without per-question evidence/)).toBeInTheDocument();
    expect(within(report).queryByRole('link', { name: 'Open the diagnostic' })).toBeNull();
  });

  it('on the free plan, Start carries the Premium mark and asks for Premium instead of enrolling', async () => {
    state.tier = 'free';
    await overview('fde');
    const actions = document.querySelector('.lp-head__actions') as HTMLElement;
    expect(within(actions).getByText('Premium')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start this path' })); });
    expect(state.sheet).toHaveBeenCalledWith({ kind: 'learning-path', ref: 'fde' });
    expect(state.changes).toHaveLength(0);
  });

  it('starting the role specialization records the base track it sits above', async () => {
    const { setTrackValue } = await import('../src/lib/tracks');
    setTrackValue('backend');
    await overview('fde');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start this path' })); });
    await waitFor(() => expect(state.changes).toHaveLength(1));
    expect(state.changes[0]).toMatchObject({ pathId: 'fde', action: 'enroll', baseTrack: 'backend' });
  });

  it('a switched-off path offers no Continue and no activity links, but can still be paused', async () => {
    state.availability = 'disabled';
    state.enrollments = [enrolled('dsa-foundations')];
    await overview('dsa-foundations');
    expect(screen.queryByRole('button', { name: 'Continue where you left off' })).toBeNull();
    expect(screen.queryByRole('link', { name: /dsa-foundations first lesson/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('says the written pieces the learner reviews are required to complete the path', async () => {
    state.enrollments = [enrolled('fde')];
    await overview('fde');
    const progress = screen.getByRole('heading', { name: 'Where you are' }).closest('section') as HTMLElement;
    expect(within(progress).getByText('Written pieces you review yourself')).toBeInTheDocument();
    expect(within(progress).getByText('1 of 3 submitted')).toBeInTheDocument();
    expect(within(progress).getByText(/^All 3 are required to complete the path\./)).toBeInTheDocument();
    expect(within(progress).queryByText('Portfolio self-reviewed')).toBeNull();
  });

  it('shows no written-piece line on a path without any', async () => {
    state.enrollments = [enrolled('dsa-foundations')];
    await overview('dsa-foundations');
    await screen.findByRole('heading', { name: 'Where you are' });
    expect(screen.queryByText('Written pieces you review yourself')).toBeNull();
    expect(screen.queryByText(/are required to complete the path/)).toBeNull();
  });

  it('once Premium lapses, Continue asks for Premium and the activities are no longer links', async () => {
    state.tier = 'free';
    state.enrollments = [enrolled('dsa-foundations')];
    await overview('dsa-foundations');
    expect(screen.queryByRole('link', { name: /dsa-foundations first lesson/ })).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue where you left off' })); });
    expect(state.sheet).toHaveBeenCalledWith({ kind: 'learning-path', ref: 'dsa-foundations' });
  });
});

describe('the interview-prep shelf', () => {
  const modulesSection = () => screen.getByRole('heading', { level: 2, name: 'Modules' }).closest('section') as HTMLElement;

  it('lists a shelf module under Interview prep, apart from the loop, marked Optional', async () => {
    state.shelf = true;
    state.enrollments = [enrolled('fde')];
    await overview('fde');
    const shelf = screen.getByRole('region', { name: 'Interview prep' });
    expect(within(shelf).getByText('Learning round')).toBeInTheDocument();
    expect(within(shelf).getByText('Optional practice for interview rounds. It does not count toward completing the path.')).toBeInTheDocument();
    expect(within(shelf).getByText('Optional')).toBeInTheDocument();
    expect(within(shelf).getAllByRole('link', { name: /Interview lesson/ })[0]).toBeInTheDocument();
    expect(within(modulesSection()).queryByText('Learning round')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Optional: placement and bridges' })).toBeNull();
  });

  it('sits between the loop and the placement and bridge modules, which keep their own section', async () => {
    state.shelf = true;
    state.enrollments = [enrolled('fde')];
    state.diagnosticResults = [{ competencyId: 'integration', state: 'gap', score: 0.3333, assessedItems: 3 }];
    await overview('fde');
    const shelf = screen.getByRole('region', { name: 'Interview prep' });
    const optional = screen.getByRole('heading', { name: 'Optional: placement and bridges' }).closest('section') as HTMLElement;
    expect(within(optional).getByText('Optional diagnostic')).toBeInTheDocument();
    expect(within(optional).queryByText('Learning round')).toBeNull();
    expect(modulesSection().compareDocumentPosition(shelf) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(shelf.compareDocumentPosition(optional) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows no shelf on a path without one', async () => {
    state.enrollments = [enrolled('fde')];
    await overview('fde');
    expect(screen.queryByRole('region', { name: 'Interview prep' })).toBeNull();
  });

  it('once Premium lapses, the shelf modules are no longer links', async () => {
    state.shelf = true;
    state.tier = 'free';
    state.enrollments = [enrolled('fde')];
    await overview('fde');
    const shelf = screen.getByRole('region', { name: 'Interview prep' });
    expect(within(shelf).getByText('Learning round')).toBeInTheDocument();
    expect(within(shelf).queryByRole('link')).toBeNull();
  });
});

describe('the roadmap', () => {
  it('marks an open path Premium for a free account', async () => {
    state.tier = 'free';
    await mount('/r', '/r', async () => {
      const { default: PathDiscovery } = await import('../src/components/paths/PathDiscovery');
      return <PathDiscovery />;
    });
    expect(screen.getAllByText('Premium')).toHaveLength(2);
  });
});

describe('Today', () => {
  const today = () => mount('/t', '/t', async () => {
    const { PathResumeSection } = await import('../src/components/paths/PathResumeSection');
    return <PathResumeSection />;
  });

  it('offers the next step of each running path under a heading that fits a role and a skill path', async () => {
    state.enrollments = [enrolled('fde'), enrolled('dsa-foundations')];
    await today();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Learning paths' })).toBeInTheDocument());
    expect(screen.queryByText('Skill path')).toBeNull();
    expect(screen.getByRole('link', { name: /fde first lesson/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dsa-foundations first lesson/ })).toBeInTheDocument();
  });

  it('offers nothing once Premium lapses', async () => {
    state.tier = 'free';
    state.enrollments = [enrolled('dsa-foundations')];
    await today();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByRole('heading', { name: 'Learning paths' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('offers nothing for a switched-off path', async () => {
    state.availability = 'disabled';
    state.enrollments = [enrolled('dsa-foundations')];
    await today();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('draws no empty heading while progress loads', async () => {
    state.progressLoaded = false;
    state.enrollments = [enrolled('dsa-foundations')];
    await today();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('the Profile picker', () => {
  const profile = {
    schemaVersion: 2, baseTrack: 'frontend', specialization: null, skillPaths: [],
    goals: ['level-up'], experience: 'some', studyTime: '30-60', updatedAt: '2026-09-01T00:00:00Z',
  };
  const card = () => mount('/profile', '/profile', async () => {
    const { default: LearningPathsCard } = await import('../src/components/paths/LearningPathsCard');
    return <LearningPathsCard />;
  });
  const walkToSave = async () => {
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Choose your path' })); });
    for (let step = 0; step < 3; step += 1) {
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    }
  };

  it('keeps the paths a learner started on their own pages when the picker is saved', async () => {
    // The account said "no specialization" and no skill path, then the learner
    // started both from the path pages.
    state.metadata = {
      devquiz_learning_preference_v1: { schemaVersion: 1, baseTrack: 'frontend', specialization: null },
      devquiz_learner_profile_v2: profile,
    };
    state.enrollments = [enrolled('fde'), enrolled('dsa-foundations')];
    await card();
    await walkToSave();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })); });
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.changes.filter((one) => one.action === 'pause')).toEqual([]);
    const [, preference, answers] = state.saves[0] as [unknown, { specialization: unknown }, { skillPaths: string[] }];
    expect(preference.specialization).toBe('fde');
    expect(answers.skillPaths).toEqual(['dsa-foundations']);
  });

  it('on the free plan, choosing FDE shows the Premium mark, enrols nothing, saves no role and asks for Premium', async () => {
    state.tier = 'free';
    state.metadata = {
      devquiz_learning_preference_v1: { schemaVersion: 1, baseTrack: 'frontend', specialization: null },
      devquiz_learner_profile_v2: profile,
    };
    await card();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Choose your path' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    const fde = screen.getByRole('radio', { name: 'Forward Deployed Engineer' });
    expect(within(fde).getByText('Premium')).toBeInTheDocument();
    await act(async () => { fireEvent.click(fde); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })); });
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.changes).toEqual([]);
    expect((state.saves[0] as [unknown, { specialization: unknown }])[1].specialization).toBeNull();
    expect(state.sheet).toHaveBeenCalledWith({ kind: 'learning-path', ref: 'fde' });
  });

  // Owner decision 10: merchandise is paused until next quarter, so a finished
  // path shows no package and the card never asks the server for one.
  it('shows no package for a finished path while merchandise is paused, and never asks for one', async () => {
    let asked = 0;
    server.use(http.get('*/api/user/learning-path-reward', () => {
      asked += 1;
      return HttpResponse.json({ eligible: true, claimed: false, orderId: null });
    }));
    state.enrollments = [enrolled('dsa-foundations')];
    await card();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(screen.getByText('DSA Foundations')).toBeInTheDocument();
    expect(screen.queryByText('Your package is ready to claim')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Claim the package' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/package|t-shirt|merch/i);
    expect(asked).toBe(0);
  });
});
