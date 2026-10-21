// Who may start a learning path, and what the path's screens offer when they
// may not: Premium opens the paths, a switched-off path offers nothing to
// resume, and the Profile picker never pauses a path the learner started on
// its own page. The picker's Sections step (#490) saves Software Engineer with
// the profile and keeps the FDE Premium refusal.
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
  summary: '', outcomes: [], nonGoals: [], entryRequirement: id === 'fde' ? 'You ship code in one track and have integrated HTTP, a database or an API.' : '', competencies: id === 'fde' ? [{ id: 'integration', title: 'Integration and data' }, { id: 'handoff', title: 'Adoption and handoff' }, { id: 'python-reading', title: 'Python comprehension' }] : [], bridges: [],
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
  catalogFailed: false,
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
    usePathCatalog: () => (state.catalogFailed ? { isLoading: false, isError: true, refetch: () => {}, data: undefined } : {
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
  state.catalogFailed = false;
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
  const signedInWith = (saved: Record<string, unknown>) => {
    state.metadata = {
      devquiz_learning_preference_v1: { schemaVersion: 1, baseTrack: saved.baseTrack, specialization: saved.specialization },
      devquiz_learner_profile_v2: saved,
    };
  };
  const card = () => mount('/profile', '/profile', async () => {
    const { default: LearningPathsCard } = await import('../src/components/paths/LearningPathsCard');
    return <LearningPathsCard />;
  });
  const press = async (name: string) => {
    await act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
  };
  const openPicker = () => press('Choose your path');
  /** Track, then Sections, then the profile answers, which are already saved. */
  const walkToSave = async () => {
    await openPicker();
    for (let step = 0; step < 2; step += 1) await press('Continue');
  };
  const savedAnswers = () => state.saves[0] as [unknown, { specialization: unknown }, Record<string, unknown>];

  it('keeps the paths a learner started on their own pages when the picker is saved', async () => {
    // The account said "no specialization" and no skill path, then the learner
    // started both from the path pages.
    signedInWith(profile);
    state.enrollments = [enrolled('fde'), enrolled('dsa-foundations')];
    await card();
    await walkToSave();
    await press('Save');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    // The picker asks nothing about DSA Foundations, so it neither pauses the
    // enrollment nor sends skill paths, which the server then keeps.
    expect(state.changes).toEqual([]);
    const [, preference, answers] = savedAnswers();
    expect(preference.specialization).toBe('fde');
    expect(answers).not.toHaveProperty('skillPaths');
  });

  it('offers Software Engineer and the FDE card on the Sections step, and no DSA toggle', async () => {
    state.tier = 'free';
    signedInWith(profile);
    await card();
    await openPicker();
    await press('Continue');
    expect(screen.getByRole('heading', { name: 'Add a section?' })).toBeInTheDocument();
    const se = screen.getByRole('checkbox', { name: 'Software Engineer' });
    expect(se).not.toBeChecked();
    expect(se).toHaveAccessibleDescription(/Free to join\./);
    expect(screen.queryByRole('checkbox', { name: /DSA/ })).toBeNull();
    const group = screen.getByRole('radiogroup', { name: 'Specialization' });
    expect(within(group).getByRole('radio', { name: 'Continue without a specialization' })).toHaveAttribute('aria-checked', 'true');
    const fde = within(group).getByRole('radio', { name: 'Forward Deployed Engineer' });
    expect(within(fde).getByText('Premium')).toBeInTheDocument();
    expect(within(fde).getByText(/^devShark’s flagship section/)).toBeInTheDocument();
    // The requirement is the manifest's, word for word.
    expect(within(fde).getByText('Before you start: You ship code in one track and have integrated HTTP, a database or an API.')).toBeInTheDocument();
    // The name is the label alone, so the Premium mark, the flagship line and
    // the requirement reach a screen reader as the description.
    expect(fde).toHaveAccessibleDescription(/^Premium devShark’s flagship section.*Before you start: You ship code/);
    expect(within(group).getByRole('radio', { name: 'Continue without a specialization' }))
      .toHaveAccessibleDescription(/^Current Stay with the foundations/);
  });

  it('while the catalog is unavailable, a free account still cannot save FDE and is asked for Premium once', async () => {
    state.tier = 'free';
    state.catalogFailed = true;
    signedInWith(profile);
    await card();
    await openPicker();
    await press('Continue');
    const fde = screen.getByRole('radio', { name: 'Forward Deployed Engineer' });
    expect(fde).toHaveAccessibleDescription(/^Premium /);
    // No catalog, no requirement: the card shows nothing rather than a copy.
    expect(within(fde).queryByText(/^Before you start:/)).toBeNull();
    await act(async () => { fireEvent.click(fde); });
    await press('Continue');
    await press('Save');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.changes).toEqual([]);
    expect(savedAnswers()[1].specialization).toBeNull();
    expect(state.sheet).toHaveBeenCalledTimes(1);
    expect(state.sheet).toHaveBeenCalledWith({ kind: 'learning-path', ref: 'fde' });
    expect(screen.getByText('Sections: Web Developer')).toBeInTheDocument();
  });

  it('a picker key with no words reads as the key, as t() does, and never throws', async () => {
    const { pickerCopy } = await import('../src/i18n/translations.picker');
    type Key = Parameters<typeof pickerCopy>[0];
    expect(pickerCopy('profile.goal.something-new' as Key)).toBe('profile.goal.something-new');
    expect(pickerCopy('profile.goal.something-new' as Key, { max: 3 })).toBe('profile.goal.something-new');
    expect(pickerCopy('profile.picker.goalsHint', { max: 3 })).toBe('Pick up to 3.');
  });

  it('saving the picker writes the Software Engineer section with the profile', async () => {
    signedInWith(profile);
    await card();
    expect(screen.getByText('Sections: Web Developer')).toBeInTheDocument();
    await openPicker();
    await press('Continue');
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Software Engineer' })); });
    await press('Continue');
    await press('Save');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    const [, preference, answers] = savedAnswers();
    expect(preference.specialization).toBeNull();
    expect(answers).toEqual({ goals: ['level-up'], experience: 'some', studyTime: '30-60', sections: ['software-engineer'] });
    // Joining is free: nothing enrols and nothing asks for Premium.
    expect(state.changes).toEqual([]);
    expect(state.sheet).not.toHaveBeenCalled();
    expect(screen.getByText(/^Saved: \w+ \+ Software Engineer$/)).toBeInTheDocument();
  });

  it('removing Software Engineer saves an empty list, so its topics leave the plan and nothing else changes', async () => {
    const joined = { ...profile, sections: ['software-engineer'] };
    signedInWith(joined);
    await card();
    expect(screen.getByText('Sections: Web Developer · Software Engineer')).toBeInTheDocument();
    await openPicker();
    await press('Continue');
    const se = screen.getByRole('checkbox', { name: 'Software Engineer' });
    expect(se).toBeChecked();
    await act(async () => { fireEvent.click(se); });
    await press('Continue');
    await press('Save');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    const [, , answers] = savedAnswers();
    // Sent, not left out: a missing field would keep the saved list.
    expect(answers.sections).toEqual([]);
    // The plan is the only thing that changes. The save is the one write: no
    // enrollment moves and nothing asks the server to drop progress, so every
    // passed level stays where it is.
    expect(state.changes).toEqual([]);
    const { planTopics } = await import('../../shared/progression');
    const before = planTopics(joined as Parameters<typeof planTopics>[0]);
    const after = planTopics({ ...joined, sections: answers.sections } as Parameters<typeof planTopics>[0]);
    // The Frontend plan already holds DSA, Git and General; these four come
    // only with the section.
    for (const topic of ['algorithms', 'system-design', 'devops', 'security']) {
      expect(before).toContain(topic);
      expect(after).not.toContain(topic);
    }
    expect(after).toEqual(planTopics(profile as Parameters<typeof planTopics>[0]));
  });

  it('arrow keys browse without advancing, Continue advances and Back keeps every choice', async () => {
    signedInWith(profile);
    await card();
    await openPicker();
    const tracks = screen.getAllByRole('radio');
    const chosen = tracks.find((one) => one.getAttribute('aria-checked') === 'true')!;
    const next = tracks[(tracks.indexOf(chosen) + 1) % tracks.length];
    await act(async () => { fireEvent.keyDown(chosen, { key: 'ArrowDown' }); });
    expect(next).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: 'Choose your learning path' })).toBeInTheDocument();
    await press('Continue');
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Software Engineer' })); });
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('radio', { name: 'Continue without a specialization' }), { key: 'ArrowDown' });
    });
    expect(screen.getByRole('radio', { name: 'Forward Deployed Engineer' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: 'Add a section?' })).toBeInTheDocument();
    await press('Back');
    expect(screen.getByRole('radio', { name: next.getAttribute('aria-label')! })).toHaveAttribute('aria-checked', 'true');
    await press('Continue');
    expect(screen.getByRole('checkbox', { name: 'Software Engineer' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Forward Deployed Engineer' })).toHaveAttribute('aria-checked', 'true');
  });

  it('on the free plan, choosing FDE shows the Premium mark, enrols nothing, saves no role and asks for Premium once', async () => {
    state.tier = 'free';
    signedInWith(profile);
    await card();
    await openPicker();
    await press('Continue');
    const fde = screen.getByRole('radio', { name: 'Forward Deployed Engineer' });
    expect(within(fde).getByText('Premium')).toBeInTheDocument();
    await act(async () => { fireEvent.click(fde); });
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Software Engineer' })); });
    await press('Continue');
    await press('Save');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.changes).toEqual([]);
    const [, preference, answers] = savedAnswers();
    expect(preference.specialization).toBeNull();
    // The free section still saves; only the specialization is held back.
    expect(answers.sections).toEqual(['software-engineer']);
    expect(state.sheet).toHaveBeenCalledTimes(1);
    expect(state.sheet).toHaveBeenCalledWith({ kind: 'learning-path', ref: 'fde' });
    expect(screen.getByText(/^Saved: \w+ \+ Software Engineer\. Forward Deployed Engineer needs Premium, so it is not on your plan yet\.$/)).toBeInTheDocument();
    expect(screen.getByText('Sections: Web Developer')).toBeInTheDocument();
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
