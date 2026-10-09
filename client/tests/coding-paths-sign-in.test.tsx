import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingTrackScreen } from '../src/components/coding/CodingSection';

// Audit C5-7: the Paths block of every track page told signed-in learners to
// "Sign in to save progress." Only a visitor who is signed out is asked.
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
  expect(screen.queryByText(/Sign in to save progress/)).toBeNull();
});

it('asks a signed-out visitor to sign in to save path progress', async () => {
  state.auth = { isAuthenticated: false, isLoading: false };
  mount();
  expect(await screen.findByRole('region', { name: 'Paths' })).toHaveTextContent('earlier checks run again. Sign in to save progress.');
});
