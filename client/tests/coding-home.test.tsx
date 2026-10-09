import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingHome, CodingTrackScreen } from '../src/components/coding/CodingSection';
import type { CodingProgressResponse } from '../../shared/coding-api';
import { CODING_INDEX } from '../../shared/coding-index';
import type { Tier } from '../../shared/tiers';

// The Coding home's next-challenge card, in each state a reload goes through.
// Auth, the plan and progress are what the card waits on, so they are the mocks here.
const state = vi.hoisted(() => ({
  auth: { isAuthenticated: true, isLoading: false },
  plan: { tier: 'premium' as Tier | null, loading: false },
  progress: { data: undefined as CodingProgressResponse | undefined, isLoading: true, isError: false, refetch: () => {} },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => state.auth }));
vi.mock('../src/lib/entitlement', () => ({
  useEntitlement: () => ({
    tier: state.auth.isLoading ? null : state.auth.isAuthenticated ? state.plan.tier : 'free',
    signedIn: state.auth.isAuthenticated,
    loading: state.auth.isLoading || (state.auth.isAuthenticated && state.plan.loading),
    failed: false,
    data: null,
    refetch: () => {},
  }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: vi.fn(),
  useCodingProgress: () => state.progress,
  useCodingTask: () => ({ data: undefined }),
}));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] } }),
  useSaveChallenge: () => ({ mutate: vi.fn() }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/components/coding/ChallengeRunPlanner', () => ({ ChallengeRunPlanner: () => null, taskHref: (id: string) => `/coding/javascript/${id}` }));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => null }));

const client = new QueryClient();
const tree = () => <QueryClientProvider client={client}><MemoryRouter><LanguageProvider><CodingHome /></LanguageProvider></MemoryRouter></QueryClientProvider>;
const mount = () => render(tree());
const card = () => screen.getByRole('region', { name: 'Your next challenge' });
const passedDigitSum = { tasks: { 'js-digit-sum': { status: 'passed' } }, due: [], javascriptLevelsCleared: 0 } as unknown as CodingProgressResponse;

beforeEach(() => {
  // jsdom has no ResizeObserver; the project lists further down the page size themselves with one.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  state.auth = { isAuthenticated: true, isLoading: false };
  state.plan = { tier: 'premium', loading: false };
  state.progress = { data: undefined, isLoading: true, isError: false, refetch: () => {} };
});

it('names no challenge while a signed-in learner’s progress loads, then names theirs', () => {
  const view = mount();
  expect(card()).toHaveAttribute('aria-busy', 'true');
  // The first challenge of the catalogue is not the learner's next one: it must never flash up.
  expect(within(card()).queryByText('Digit sum')).toBeNull();
  expect(screen.getByText('Loading progress…')).toHaveClass('cd-visually-hidden');
  expect(within(card()).getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(screen.queryByText(/Sign in to keep your progress/)).toBeNull();

  state.progress = { data: passedDigitSum, isLoading: false, isError: false, refetch: () => {} };
  view.rerender(tree());
  expect(card()).not.toHaveAttribute('aria-busy');
  expect(within(card()).queryByText('Digit sum')).toBeNull();
  expect(within(card()).getByText('Count multiples')).toBeInTheDocument();
  expect(within(card()).getByRole('button', { name: 'Continue' })).toBeEnabled();
});

it('waits for the account before choosing, and offers the first challenge to a visitor', () => {
  state.auth = { isAuthenticated: false, isLoading: true };
  state.progress = { data: undefined, isLoading: false, isError: false, refetch: () => {} };
  const view = mount();
  expect(within(card()).queryByText('Digit sum')).toBeNull();
  expect(screen.queryByText(/Sign in to keep your progress/)).toBeNull();

  state.auth = { isAuthenticated: false, isLoading: false };
  view.rerender(tree());
  expect(within(card()).getByText('Digit sum')).toBeInTheDocument();
  expect(within(card()).getByRole('button', { name: 'Continue' })).toBeEnabled();
  expect(screen.getByText(/Sign in to keep your progress/)).toBeInTheDocument();
});

it('says when progress did not load and retries on request, instead of guessing', () => {
  const refetch = vi.fn();
  state.progress = { data: undefined, isLoading: false, isError: true, refetch };
  mount();
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load your progress.');
  expect(within(card()).queryByText('Digit sum')).toBeNull();
  expect(within(card()).queryByRole('button', { name: 'Continue' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it('keeps the card to the next challenge and Continue, beside the heading', () => {
  state.progress = { data: passedDigitSum, isLoading: false, isError: false, refetch: () => {} };
  mount();
  const next = card();
  expect(next.closest('.cd-home-head')?.querySelector('h1')).toHaveTextContent('Coding challenges');
  expect(next.querySelectorAll('button')).toHaveLength(1);
  expect(next.querySelector('a')).toBeNull();
  // The track line and the review count are gone from the card.
  expect(next).not.toHaveTextContent('JavaScript');
});

it('waits for a free account’s plan, then names a challenge the free plan opens', () => {
  state.plan = { tier: null, loading: true };
  state.progress = { data: passedDigitSum, isLoading: false, isError: false, refetch: () => {} };
  const view = mount();
  // Until the plan is known the card cannot tell a Premium challenge from a free one.
  expect(card()).toHaveAttribute('aria-busy', 'true');
  expect(within(card()).getByRole('button', { name: 'Continue' })).toBeDisabled();

  state.plan = { tier: 'free', loading: false };
  view.rerender(tree());
  expect(card()).not.toHaveAttribute('aria-busy');
  const title = card().querySelector('.cd-next__title')?.textContent ?? '';
  const named = CODING_INDEX.find((task) => task.title.en === title);
  expect(named?.free).toBe(true);
  expect(within(card()).getByRole('button', { name: 'Continue' })).toBeEnabled();
});

// C3-10: a technique row counted the technique in every track and opened one
// track's list, so "Loops · 148 challenges" opened a list of 80. The count is
// now the list's own, and says which track it is.
it('counts each technique the way the list it opens does', () => {
  state.progress = { data: passedDigitSum, isLoading: false, isError: false, refetch: () => {} };
  const home = mount();
  const rows = within(screen.getByRole('region', { name: 'Techniques' })).getAllByRole('link').map((link) => ({
    href: link.getAttribute('href') ?? '',
    count: link.querySelector('.cd-technique__count')?.textContent ?? '',
  }));
  home.unmount();
  expect(rows.length).toBeGreaterThan(5);
  for (const { href, count } of rows) {
    const list = render(
      <QueryClientProvider client={client}><MemoryRouter initialEntries={[href]}><LanguageProvider>
        <Routes><Route path="/coding/:track" element={<CodingTrackScreen />} /></Routes>
      </LanguageProvider></MemoryRouter></QueryClientProvider>,
    );
    const shown = /^Showing (\d+) of \d+$/.exec(screen.getByText(/^Showing \d+ of \d+$/).textContent ?? '')?.[1];
    const heading = screen.getByRole('heading', { level: 1 }).textContent;
    expect(heading, href).toMatch(/^(JavaScript|TypeScript|React|Algorithms)$/);
    expect(count, href).toBe(`${shown} challenges in ${heading}`);
    list.unmount();
  }
});
