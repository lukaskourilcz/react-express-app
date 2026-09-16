import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import LeaguePanel from '../src/components/LeaguePanel';
import Leaderboard from '../src/components/Leaderboard';
import { server } from './mocks/server';
import { leaderboardHandlers, leagueHandlers } from './mocks/handlers';

function mount(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageProvider>{ui}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it('renders the cohort in the order the server returned it, and says which row is yours', async () => {
  server.use(leagueHandlers.populated);
  mount(<LeaguePanel />);

  const list = await screen.findByRole('list', { name: /league/i });
  const rows = within(list).getAllByRole('listitem');
  expect(rows).toHaveLength(3);
  // The panel ranks nothing: row order is response order.
  expect(rows[0]).toHaveTextContent('Workshop learner');
  expect(rows[1]).toHaveTextContent('Fixture reader');
  expect(rows[2]).toHaveTextContent('Third seat');

  // The reader's own row is marked in words as well as in colour, so the cue
  // survives greyscale and colour blindness.
  expect(within(rows[1]).getByText('You')).toBeVisible();
  expect(rows[1]).toHaveAttribute('aria-current', 'true');
  expect(rows[0]).not.toHaveAttribute('aria-current');

  // The score shown is the server's, not a recount.
  expect(rows[1]).toHaveTextContent('31');
  expect(rows[1]).toHaveTextContent('78% of 40');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('shows the tier and the deadline the server set, and never promises a reward for either', async () => {
  server.use(leagueHandlers.populated);
  mount(<LeaguePanel />);

  expect(await screen.findByRole('heading', { name: 'Tier 2 of 5' })).toBeVisible();
  // 2026-09-14 is a Monday, so the week ends on Sunday the 20th.
  expect(screen.getByText(/20 September/)).toBeVisible();
  expect(
    screen.getByText(/Every question, explanation and path is free at every tier\./),
  ).toBeVisible();
});

it('offers a real practice action when nobody in the cohort has answered yet', async () => {
  server.use(leagueHandlers.empty);
  mount(<LeaguePanel />);

  expect(await screen.findByRole('button', { name: /start a quiz/i })).toBeVisible();
  expect(screen.queryByRole('list', { name: /league/i })).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('answers a signed-out reader honestly instead of raising an error', async () => {
  server.use(leagueHandlers.signedOut);
  mount(<LeaguePanel />);

  expect(await screen.findByText(/sign in to join a league/i)).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('says the league is not switched on yet when the migration is missing', async () => {
  server.use(leagueHandlers.migrationRequired);
  mount(<LeaguePanel />);

  expect(await screen.findByText(/not switched on yet/i)).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('recovers the cohort from a server failure through Retry', async () => {
  server.use(leagueHandlers.error);
  mount(<LeaguePanel />);

  expect(await screen.findByRole('alert')).toBeVisible();
  server.use(leagueHandlers.populated);
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));

  expect(await screen.findByText('Workshop learner')).toBeVisible();
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

it('leaves the league through the server and then shows the way back in', async () => {
  const saved = vi.fn();
  server.use(
    leagueHandlers.populated,
    leagueHandlers.setOptout,
  );
  mount(<LeaguePanel />);
  await screen.findByText('Workshop learner');

  server.events.on('request:start', ({ request }) => {
    if (request.method === 'PUT' && request.url.includes('league-optout')) saved();
  });
  // From here the board reports the learner as out, which is what the refetch
  // after the save must pick up.
  server.use(leagueHandlers.optedOut, leagueHandlers.setOptout);
  fireEvent.click(screen.getByRole('button', { name: /leave the league/i }));

  expect(await screen.findByRole('button', { name: /rejoin the league/i })).toBeVisible();
  expect(screen.getByText(/your answers, XP and streak all still count/i)).toBeVisible();
  await waitFor(() => expect(saved).toHaveBeenCalled());
  server.events.removeAllListeners();
});

it('reaches the league from the leaderboard as a fourth view, leaving the other three alone', async () => {
  server.use(leaderboardHandlers.populated, leagueHandlers.populated);
  mount(<Leaderboard />);

  expect(await screen.findByText('Workshop learner')).toBeVisible();
  fireEvent.click(screen.getByRole('radio', { name: 'This week' }));

  expect(await screen.findByRole('list', { name: /league/i })).toBeVisible();
  // The ranked board's own footer is gone while the league owns the screen.
  expect(screen.queryByText(/updated every 60s/i)).toBeNull();
});
