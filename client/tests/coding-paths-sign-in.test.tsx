import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingTrackScreen } from '../src/components/coding/CodingSection';

// Audit C5-7: the Paths block of every track page told signed-in learners to
// "Sign in to save progress." Only a visitor who is signed out is told, once.
const state = vi.hoisted(() => ({ auth: { isAuthenticated: true, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => state.auth }));
vi.mock('../src/lib/entitlement', () => ({
  useEntitlement: () => ({ tier: 'premium', signedIn: state.auth.isAuthenticated, loading: false, failed: false, data: null, refetch: () => {} }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: vi.fn(),
  useCodingProgress: () => ({ data: { tasks: {}, due: [], javascriptLevelsCleared: 0 }, isLoading: false, isError: false, refetch: () => {} }),
  useCodingTask: () => ({ data: undefined }),
}));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] } }),
  useSaveChallenge: () => ({ mutate: vi.fn() }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => null }));

const mount = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/coding/javascript']}>
      <LanguageProvider>
        <Routes><Route path="/coding/:track" element={<CodingTrackScreen />} /></Routes>
      </LanguageProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

it('does not ask a signed-in learner to sign in to save path progress', async () => {
  state.auth = { isAuthenticated: true, isLoading: false };
  mount();
  const paths = await screen.findByRole('region', { name: 'Paths' });
  expect(paths).toHaveTextContent('earlier checks run again.');
  expect(screen.queryByText(/Sign in/)).toBeNull();
});

// UX audit coding-10: the visitor is told once per screen, under the page
// lead, and the Paths intro no longer repeats it.
it('tells a signed-out visitor once, under the page lead, and not again in Paths', async () => {
  state.auth = { isAuthenticated: false, isLoading: false };
  mount();
  const paths = await screen.findByRole('region', { name: 'Paths' });
  expect(paths).not.toHaveTextContent(/Sign in/);
  const hints = screen.getAllByText(/Sign in to keep your progress/);
  expect(hints).toHaveLength(1);
  expect(hints[0].closest('header')).toContainElement(screen.getByRole('heading', { level: 1 }));
});
