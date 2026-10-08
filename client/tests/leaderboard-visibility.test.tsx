import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LeaderboardVisibilityCard } from '../src/components/Profile';
import LeaderboardVisibilitySwitch from '../src/components/LeaderboardVisibilitySwitch';
import { leaderboardQuery } from '../src/lib/queries';
import { server } from './mocks/server';
import { boardFor, visibilityHandler } from './mocks/handlers';

// The Profile's switch for "Show my name and photo on leaderboards"
// (op=leaderboard-visibility, migration 049). The Leaderboard shows the same
// component; tests/leaderboard.test.tsx covers it there.
const auth = vi.hoisted(() => ({ value: { user: { id: 'user-1' } as { id: string } | null, isAuthenticated: true, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; });

const SWITCH = 'Show my name and photo on leaderboards';

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

/** Answers PUTs with `respond` and records each body. */
function recordPuts(respond: (visible: boolean) => Response | Promise<Response> = (visible) => HttpResponse.json({ visible })) {
  const puts: unknown[] = [];
  server.use(http.put('*/api/user/leaderboard-visibility', async ({ request }) => {
    const body = (await request.json()) as { visible: boolean };
    puts.push(body);
    return respond(body.visible);
  }));
  return puts;
}

describe('the Profile’s leaderboard switch', () => {
  it('shows the stored choice: off for a learner who never switched it on', async () => {
    server.use(visibilityHandler(false));
    renderWith(<LeaderboardVisibilityCard />);
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();
    // The name a board shows follows "Friends see" (migration 055).
    expect(screen.getByText('Leaderboards are public. When on, they show your sharkname (or your name, if friends see your name) and your photo; without a sharkname, your name. When off, you appear as “Learner” with no photo. A change reaches the public boards within about a minute.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('shows the stored choice: on', async () => {
    server.use(visibilityHandler(true));
    renderWith(<LeaderboardVisibilityCard />);
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('cannot be switched before the stored choice arrives', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.get('*/api/user/leaderboard-visibility', async () => { await held; return HttpResponse.json({ visible: true }); }));
    const puts = recordPuts();
    renderWith(<LeaderboardVisibilityCard />);
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    release();
    await waitFor(() => expect(toggle).toBeChecked());
    expect(puts).toEqual([]);
  });

  it('saves a switch with PUT { visible } and keeps it', async () => {
    server.use(visibilityHandler(false));
    const puts = recordPuts();
    renderWith(<LeaderboardVisibilityCard />);
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(puts).toEqual([{ visible: true }]));
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => expect(puts).toEqual([{ visible: true }, { visible: false }]));
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();
  });

  it('turns back and says so when the save fails', async () => {
    server.use(visibilityHandler(true));
    const puts = recordPuts(() => HttpResponse.json({ error: { code: 'db_error', message: 'Could not load or save leaderboard visibility' } }, { status: 500 }));
    renderWith(<LeaderboardVisibilityCard />);
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your leaderboard setting wasn’t saved. Try again.');
    expect(puts).toEqual([{ visible: false }]);
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('offers a retry when the stored choice cannot be loaded', async () => {
    let fail = true;
    server.use(http.get('*/api/user/leaderboard-visibility', () => (fail
      ? HttpResponse.json({ error: { code: 'db_error', message: 'Could not load or save leaderboard visibility' } }, { status: 500 })
      : HttpResponse.json({ visible: true }))));
    renderWith(<LeaderboardVisibilityCard />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your leaderboard setting couldn’t be loaded.');
    expect(screen.queryByRole('switch')).toBeNull();
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: /retry/i }));
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('refetches every board the tab has loaded after a save, not only the 30-day one', async () => {
    server.use(visibilityHandler(false));
    recordPuts();
    const asked: string[] = [];
    server.use(http.get('*/api/leaderboard', ({ request }) => {
      asked.push(new URL(request.url).searchParams.get('period') ?? '');
      return HttpResponse.json(boardFor(request));
    }));
    function Boards() {
      useQuery(leaderboardQuery({ period: 'global', categories: ['javascript'] }));
      useQuery(leaderboardQuery({ period: '30d', category: null, viewer: 'user-1' }));
      return null;
    }
    renderWith(<><Boards /><LeaderboardVisibilitySwitch /></>);
    await waitFor(() => expect([...asked].sort()).toEqual(['30d', 'global']));
    const toggle = await screen.findByRole('switch', { name: SWITCH });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect([...asked].sort()).toEqual(['30d', '30d', 'global', 'global']));
  });

  it('stays in step with the Leaderboard’s switch: one read, one state', async () => {
    let reads = 0;
    server.use(http.get('*/api/user/leaderboard-visibility', () => { reads += 1; return HttpResponse.json({ visible: false }); }));
    const puts = recordPuts();
    renderWith(<><LeaderboardVisibilityCard /><LeaderboardVisibilitySwitch /></>);
    const [profile, board] = await screen.findAllByRole('switch', { name: SWITCH });
    await waitFor(() => expect(profile).toBeEnabled());
    expect(board).not.toBeChecked();
    fireEvent.click(profile);
    await waitFor(() => expect(puts).toEqual([{ visible: true }]));
    await waitFor(() => expect(board).toBeChecked());
    expect(profile).toBeChecked();
    expect(reads).toBe(1);
  });
});
