// The pages whose first render now waits for what used to arrive after it:
// the Challenge's board line. Each check reads the document at the moment the
// page's heading first appeared (./firstDraw.ts), which an awaited act cannot.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Challenge from '../src/components/Challenge';
import { server } from './mocks/server';
import { firstDraw } from './firstDraw';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

// A page that holds its first render has to start inside an awaited act. Each
// mount is a visit of its own, with a key that stays put while the held render
// is retried (lib/routeData.ts keys its wait by the visit). The page's heading
// is then awaited, so a hold that outlasts the act still ends inside the test.
let visits = 0;
async function mountAt(path: string, page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, key: `visit-${++visits}` }]}>
        <LanguageProvider>{page}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  await screen.findByRole('heading', { level: 1 });
}

// Invented fixtures in the real response shapes.
const BOARD = {
  top: [{ id: 'run-1', name: 'Harbour reader', score: 42, createdAt: '2026-09-25T10:00:00Z' }],
  champion: { id: 'run-1', name: 'Harbour reader', score: 42, createdAt: '2026-09-25T10:00:00Z' },
};

/** Every read the page makes. */
function answer() {
  server.use(http.get('*/api/quiz/challenge', () => HttpResponse.json(BOARD)));
}

describe('/challenge', () => {
  it('draws its board line with the page', async () => {
    answer();
    const drawn = firstDraw('h1', () => ({ board: screen.queryByText('Harbour reader') !== null, waiting: screen.queryByText('…') !== null }));
    await mountAt('/challenge', <Challenge />);
    expect(drawn()).toEqual({ board: true, waiting: false });
  });

  it('draws the page and its notice when the board cannot load', async () => {
    answer();
    server.use(http.get('*/api/quiz/challenge', () => HttpResponse.json({ error: { code: 'db_error', message: 'Down' } }, { status: 500 })));
    await mountAt('/challenge', <Challenge />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Today’s board could not be loaded. Your challenge is still available.')).toBeInTheDocument();
  });
});
