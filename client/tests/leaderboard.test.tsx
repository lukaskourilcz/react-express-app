import { expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Leaderboard from '../src/components/Leaderboard';
import { server } from './mocks/server';
import { leaderboardHandlers } from './mocks/handlers';
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Leaderboard /></LanguageProvider></MemoryRouter></QueryClientProvider>);
}
it('shows an empty board with a real practice action', async () => {
  server.use(leaderboardHandlers.empty); mount();
  expect(await screen.findByRole('button', { name: /quiz|practice/i })).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});
it('recovers the actual leaderboard from a server failure through Retry', async () => {
  server.use(leaderboardHandlers.error); mount();
  expect(await screen.findByRole('alert')).toBeVisible();
  server.use(leaderboardHandlers.populated);
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByText('Workshop learner')).toBeVisible();
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
