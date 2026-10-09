// System design is hidden (owner decision, 9 Oct 2026): its track page and its
// old task addresses are the Coding not-found page, kept out of search, and
// the task is never asked for. The index the browser ships holds none of it.
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingHome, CodingTaskScreen, CodingTrackScreen } from '../src/components/coding/CodingSection';
import { CODING_INDEX } from '../../shared/coding-index';

const asked = vi.hoisted(() => ({ ids: [] as (string | undefined)[] }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: false, isLoading: false }) }));
vi.mock('../src/lib/entitlement', () => ({
  useEntitlement: () => ({ tier: 'free', signedIn: false, loading: false, failed: false, data: null, refetch: () => {} }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: vi.fn(),
  useCodingProgress: () => ({ data: undefined, isLoading: false, isError: false, refetch: () => {} }),
  useCodingTask: (id: string | undefined) => { asked.ids.push(id); return { data: undefined, isLoading: false, isError: false }; },
}));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] }, isPending: false, isError: false }),
  useSaveChallenge: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/components/coding/ChallengeRunPlanner', () => ({ ChallengeRunPlanner: () => null, taskHref: (id: string) => `/coding/javascript/${id}` }));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => null }));

function mount(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes>
            <Route path="/coding" element={<CodingHome />} />
            <Route path="/coding/:track" element={<CodingTrackScreen />} />
            <Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  asked.ids = [];
  document.head.innerHTML = '';
});

it.each(['/coding/system-design', '/coding/system-design/sd-url-shortener', '/coding/system-design/dd-requests-per-second'])('%s is a track that does not exist, kept out of search', (path) => {
  mount(path);
  expect(screen.getByRole('heading', { level: 1, name: 'That track does not exist.' })).toBeInTheDocument();
  expect(document.head.querySelector('meta[name="robots"][content="noindex"]')).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Back to Coding' })).toHaveAttribute('href', '/coding');
  expect(screen.queryByText(/system design/i)).toBeNull();
  expect(asked.ids.every((id) => id === undefined), 'the task is never asked for').toBe(true);
});

it('lists no system design on the Coding home, and ships none in the index', () => {
  mount('/coding');
  expect(screen.queryByText(/system design/i)).toBeNull();
  expect(document.querySelector('a[href^="/coding/system-design"]')).toBeNull();
  expect(CODING_INDEX.filter((task) => task.track === 'system-design')).toEqual([]);
});
