import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingHome, CodingTaskScreen, CodingTrackScreen } from '../src/components/coding/CodingSection';
import Collection from '../src/components/Collection';
import { CODING_INDEX } from '../../shared/coding-index';
import { EVOLVING_CHALLENGES, listedChallenges } from '../../shared/evolving';

// The debugging trio (#225): three short paths on the Coding home in place of
// the café-orders project, whose ten stages still open, count and resolve.
const state = vi.hoisted(() => ({ signedIn: false, saved: [] as string[], passed: [] as string[] }));
beforeEach(() => { state.signedIn = false; state.saved = []; state.passed = []; });
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: state.signedIn, signInWithGoogle: vi.fn() }) }));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => (state.signedIn ? { data: { saved: state.saved }, isPending: false, isError: false } : { data: undefined }),
  useSaveChallenge: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
  useStartSession: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: vi.fn(),
  useCodingProgress: () => ({
    data: state.passed.length
      ? { tasks: Object.fromEntries(state.passed.map((id) => [id, { status: 'passed' }])), due: [], javascriptLevelsCleared: 0 }
      : undefined,
  }),
  useCodingTask: (id: string) => ({ data: {
    task: { id, track: 'javascript', tier: 2, starter: '// starter' },
    draft: null, signedIn: state.signedIn, locked: null, session: null,
  } }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => null }));
// jsdom has no ResizeObserver; the Coding home's longer list sizes itself with one.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

function mount(path: string, element: ReactNode, route: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes><Route path={route} element={element} /></Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const TRIO = ['Log it right', 'Trace the state', 'Edges and inputs'];

describe('the debugging paths on the Coding home', () => {
  it('lists the three paths under their own heading, in levels, and not the old project', () => {
    mount('/coding', <CodingHome />, '/coding');
    const section = screen.getByRole('region', { name: 'Debugging paths' });
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(TRIO);
    expect(within(section).getAllByText('0 of 5 levels completed')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'Debugging path' })).toBeNull();
  });

  it('counts a signed-in learner\'s passed levels', () => {
    state.signedIn = true;
    state.passed = ['js-path-tracing-1', 'js-path-tracing-2'];
    mount('/coding', <CodingHome />, '/coding');
    const section = screen.getByRole('region', { name: 'Debugging paths' });
    expect(within(section).getByText('2 of 5 levels completed')).toBeInTheDocument();
  });

  it('keeps the paths off the JavaScript page, which lists its own', () => {
    mount('/coding/javascript', <CodingTrackScreen />, '/coding/:track');
    for (const title of TRIO) expect(screen.queryByRole('heading', { name: title })).toBeNull();
  });

  it('lists the old project nowhere', () => {
    const old = EVOLVING_CHALLENGES.find((project) => project.id === 'js-evolving-debug')!;
    for (const list of [listedChallenges({}), listedChallenges({ category: 'debugging' }), listedChallenges({ category: 'fullstack' }), listedChallenges({ track: 'javascript' })]) {
      expect(list).not.toContain(old);
    }
  });
});

describe('a debugging level', () => {
  it.each([
    ['js-path-logging-1', ['Easy'], [5]],
    ['js-path-tracing-3', ['Medium'], [5]],
    ['js-path-edges-2', ['Medium', 'Hard'], [4, 1]],
  ] as const)('%s groups its levels under the labels its path promises', (id, labels, sizes) => {
    mount(`/coding/javascript/${id}`, <CodingTaskScreen />, '/coding/:track/:taskId');
    const groups = within(screen.getByRole('navigation', { name: 'Levels' })).getAllByRole('group');
    expect(groups.map((group) => group.querySelector('.cd-stage-group__label')!.textContent)).toEqual(labels);
    expect(groups.map((group) => within(group).queryAllByRole('link').length + within(group).queryAllByRole('button').length)).toEqual(sizes);
  });
});

describe('the retired café-orders project', () => {
  it('keeps all ten stages in the browser index', () => {
    const old = EVOLVING_CHALLENGES.find((project) => project.id === 'js-evolving-debug')!;
    const indexed = new Set(CODING_INDEX.map((task) => task.id));
    expect(old.stages).toHaveLength(10);
    expect(old.stages.filter((id) => indexed.has(id))).toEqual(old.stages);
  });

  it('still opens a stage from an old link, with its stage list', () => {
    state.signedIn = true;
    state.passed = ['js-evolving-debug-1-start', 'js-evolving-debug-1'];
    mount('/coding/javascript/js-evolving-debug-2-start', <CodingTaskScreen />, '/coding/:track/:taskId');
    expect(screen.getByText(/Debugging path/)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Evolving challenges' });
    expect(within(nav).getByRole('link', { name: 'Evolving · Stage 3 of 10' })).toHaveAttribute('aria-current', 'step');
    expect(within(nav).getByRole('link', { name: 'Evolving · Stage 2 of 10' }).textContent).toBe('✓ 2');
  });

  it('shows a saved stage in Collection', () => {
    state.signedIn = true;
    state.saved = ['js-evolving-debug-2'];
    mount('/collection?tab=challenges', <Collection />, '/collection');
    expect(screen.getByRole('link', { name: /Debugging path · 4/ })).toHaveAttribute('href', '/coding/javascript/js-evolving-debug-2');
    expect(screen.queryByText(/unavailable/i)).toBeNull();
  });
});
