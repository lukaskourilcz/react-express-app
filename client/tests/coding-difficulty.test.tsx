import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingTaskScreen, CodingTrackScreen } from '../src/components/coding/CodingSection';
import { CodingDueSection } from '../src/components/coding/CodingDueSection';
import Collection from '../src/components/Collection';
import { DifficultyBadge } from '../src/coding/DifficultyBadge';
import { CODING_INDEX } from '../../shared/coding-index';
import { EVOLVING_CHALLENGES, evolvingStage } from '../../shared/evolving';

// Signed out unless a case says otherwise: no progress, no bookmarks, no run.
// The lists and labels come from the generated index alone, which is what
// the browser really reads.
const state = vi.hoisted(() => ({ signedIn: false, saved: [] as string[], due: [] as string[] }));
beforeEach(() => { state.signedIn = false; state.saved = []; state.due = []; });
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: state.signedIn, signInWithGoogle: vi.fn() }) }));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => (state.signedIn ? { data: { saved: state.saved }, isPending: false, isError: false } : { data: undefined }),
  useSaveChallenge: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: vi.fn(),
  useCodingProgress: () => ({ data: state.due.length ? { tasks: {}, due: state.due, javascriptLevelsCleared: 0 } : undefined }),
  useCodingTask: (id: string) => ({ data: {
    task: { id, track: 'javascript', tier: 2, starter: '// starter' },
    draft: null, signedIn: false, locked: null, session: null,
  } }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => null }));

function Search() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function mount(path: string, element: ReactNode, route: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes><Route path={route} element={<>{element}<Search /></>} /></Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const bandHeadings = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
  .filter((text) => text === 'Easy' || text === 'Medium' || text === 'Hard');

describe('difficulty labels on a track page', () => {
  it('groups Easy, Medium and Hard in that order, with the tier as a sub-label', () => {
    mount('/coding/javascript', <CodingTrackScreen />, '/coding/:track');
    expect(bandHeadings()).toEqual(['Easy', 'Medium', 'Hard']);
    const easy = screen.getByRole('region', { name: 'Easy' });
    expect(within(easy).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Foundations', 'Fluency']);
    const hard = screen.getByRole('region', { name: 'Hard' });
    expect(within(hard).getByRole('heading', { level: 3, name: 'Interview' })).toBeInTheDocument();
    // Each challenge sits in the band its index row names, once.
    const standalone = CODING_INDEX.filter((task) => task.track === 'javascript' && !evolvingStage(task.id));
    expect(within(easy).getAllByRole('listitem')).toHaveLength(standalone.filter((task) => task.difficulty === 'easy').length);
  });

  it('offers the three labels in the difficulty filter and keeps the choice in the URL', () => {
    mount('/coding/javascript', <CodingTrackScreen />, '/coding/:track');
    const select = screen.getByLabelText('Any difficulty') as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual(['Any difficulty', 'Easy', 'Medium', 'Hard']);
    fireEvent.change(select, { target: { value: 'medium' } });
    expect(screen.getByTestId('search').textContent).toBe('?difficulty=medium');
    expect(bandHeadings()).toEqual(['Medium']);
  });

  it('reads an older tier link as the label that tier projects to', () => {
    mount('/coding/javascript?tier=4', <CodingTrackScreen />, '/coding/:track');
    expect((screen.getByLabelText('Any difficulty') as HTMLSelectElement).value).toBe('hard');
    expect(bandHeadings()).toEqual(['Hard']);
    fireEvent.change(screen.getByLabelText('Any difficulty'), { target: { value: 'easy' } });
    expect(screen.getByTestId('search').textContent).toBe('?difficulty=easy');
  });
});

describe('difficulty labels on the stage list', () => {
  const project = EVOLVING_CHALLENGES.find((one) => one.stages.length === 10)!;
  const fullstack = EVOLVING_CHALLENGES.find((one) => one.stages.length === 12)!;
  const short = EVOLVING_CHALLENGES.find((one) => one.short && one.stages.length === 5)!;

  it.each([
    [project.id, project, [3, 4, 3]],
    [fullstack.id, fullstack, [4, 5, 3]],
    [short.id, short, [2, 2, 1]],
  ] as const)('labels the stages of %s by position', (_id, challenge, sizes) => {
    mount(`/coding/javascript/${challenge.stages[0]}`, <CodingTaskScreen />, '/coding/:track/:taskId');
    const nav = screen.getByRole('navigation');
    const groups = within(nav).getAllByRole('group');
    expect(groups.map((group) => within(group).getByText(/^(Easy|Medium|Hard)$/).textContent)).toEqual(['Easy', 'Medium', 'Hard']);
    expect(groups.map((group) => group.getAttribute('aria-labelledby'))).toEqual(groups.map((group) => group.querySelector('.cd-stage-group__label')!.id));
    expect(groups.map((group) => within(group).queryAllByRole('link').length + within(group).queryAllByRole('button').length)).toEqual(sizes);
  });
});

describe('the badge', () => {
  it('is text, and names itself for a screen reader', () => {
    render(<LanguageProvider><DifficultyBadge difficulty="medium" /></LanguageProvider>);
    const badge = screen.getByText('Medium').closest('.cd-difficulty')!;
    expect(badge.textContent).toBe('Difficulty Medium');
    expect(badge.getAttribute('data-difficulty')).toBe('medium');
  });
});

describe('difficulty labels where a signed-in learner lists challenges', () => {
  it('shows the label on every saved challenge in Collection', () => {
    state.signedIn = true;
    state.saved = ['js-double-numbers', 'js-evolving-calculator-4'];
    mount('/collection?tab=challenges', <Collection />, '/collection');
    const rows = screen.getAllByRole('link', { name: /Difficulty/ });
    expect(rows.map((row) => row.textContent)).toEqual([
      'Double numbersDifficulty EasyJavaScript',
      'Expression engine · 8Difficulty HardJavaScript',
    ]);
  });

  it('names the label on a Today review card', () => {
    state.due = ['js-double-numbers'];
    mount('/', <CodingDueSection />, '/');
    const card = screen.getByRole('link', { name: 'Review: JavaScript · Double numbers, Easy' });
    expect(within(card).getByText('Easy')).toBeInTheDocument();
  });
});
