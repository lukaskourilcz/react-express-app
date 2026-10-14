import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LeaderboardVisibilityCard } from '../src/components/Profile';
import LeaderboardVisibilitySwitch from '../src/components/LeaderboardVisibilitySwitch';
import { server } from './mocks/server';

// The Profile's switch for "Show my name and photo on leaderboards"
// (op=leaderboard-visibility, migration 049). The Leaderboard shows the same
// component; tests/leaderboard.test.tsx covers it there.
const auth = vi.hoisted(() => ({ value: { user: { id: 'user-1' } as { id: string } | null, isAuthenticated: true, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; });


function renderWith(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageProvider>{node}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SETTING = { mode: 'nickname', nickname: 'sleepySharkie1', accountName: 'Pat Example' };
function serveSetting(mode = 'nickname') {
  server.use(http.get('*/api/user/leaderboard-name', () => HttpResponse.json({ ...SETTING, mode })));
}
function recordPuts(fail = false) {
  const puts: unknown[] = [];
  server.use(http.put('*/api/user/leaderboard-name', async ({ request }) => {
    const body = await request.json() as { mode: string };
    puts.push(body);
    return fail ? HttpResponse.json({ error: { code: 'db_error', message: 'Unavailable' } }, { status: 503 }) : HttpResponse.json({ ...SETTING, ...body });
  }));
  return puts;
}
describe('independent leaderboard names', () => {
  it('defaults to a shark nickname and has no opt-out switch', async () => {
    serveSetting(); renderWith(<LeaderboardVisibilityCard />);
    expect(await screen.findByRole('radio', { name: /Shark nickname/ })).toBeChecked();
    expect(screen.getByText('Choose how your results appear. This does not change what friends see.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Show my photo on leaderboards' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Show my name and photo on leaderboards' })).toBeNull();
  });
  it('saves account or nickname and shares the choice between Profile and Leaderboard', async () => {
    serveSetting(); const puts = recordPuts();
    renderWith(<><LeaderboardVisibilityCard /><LeaderboardVisibilitySwitch /></>);
    const names = await screen.findAllByRole('radio', { name: /Account name/ });
    await waitFor(() => expect(names[0]).toBeEnabled());
    fireEvent.click(names[0]);
    await waitFor(() => expect(puts).toEqual([{ mode: 'account' }]));
    await waitFor(() => expect(names[1]).toBeChecked());
    fireEvent.click(screen.getAllByRole('radio', { name: /Shark nickname/ })[1]);
    await waitFor(() => expect(puts).toEqual([{ mode: 'account' }, { mode: 'nickname' }]));
    expect(names[0]).not.toBeChecked();
  });
  it('keeps the stored choice and announces a failed save', async () => {
    serveSetting('account'); const puts = recordPuts(true); renderWith(<LeaderboardVisibilitySwitch />);
    const nickname = await screen.findByRole('radio', { name: /Shark nickname/ });
    await waitFor(() => expect(nickname).toBeEnabled()); fireEvent.click(nickname);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your leaderboard setting wasn’t saved. Try again.');
    expect(puts).toEqual([{ mode: 'nickname' }]);
    expect(screen.getByRole('radio', { name: /Account name/ })).toBeChecked();
  });
  it('offers a retry when loading fails and disables an unavailable account name', async () => {
    let fail = true;
    server.use(http.get('*/api/user/leaderboard-name', () => fail ? HttpResponse.json({ error: { code: 'db_error', message: 'Unavailable' } }, { status: 503 }) : HttpResponse.json({ ...SETTING, accountName: null })));
    renderWith(<LeaderboardVisibilitySwitch />);
    const alert = await screen.findByRole('alert'); fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('radio', { name: /Account name/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Shark nickname/ })).toBeChecked();
  });
});
