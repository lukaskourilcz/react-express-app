// The GitHub garden card on the profile. The garden stays hidden until the
// deployment has the GitHub App configured: github-connection answers
// `available: false` until then, and the card renders nothing rather than a
// "not enabled on this deployment" notice on every learner's profile.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { en } from '../src/i18n/translations';
import { GithubGardenCard } from '../src/components/coding/GithubGardenCard';
import { codingKeys } from '../src/coding/api';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({ value: { user: { id: 'user-1' } as { id: string } | null, isAuthenticated: true, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; });

// What api/user/[op].ts answers for github-connection (lib/github-handlers.ts).
const UNAVAILABLE = { available: false, status: 'not_connected', accountLogin: null, repoFullName: null, defaultBranch: null, lastCommitAt: null, queued: 0, lastError: null };
const NOT_CONNECTED = { ...UNAVAILABLE, available: true };

function answer(body: () => Promise<Response> | Response) {
  server.use(http.get('*/api/user/*', ({ request }) => {
    if (new URL(request.url).searchParams.get('op') !== 'github-connection') return HttpResponse.json({ error: { code: 'unknown_op', message: 'Unknown user op' } }, { status: 404 });
    return body();
  }));
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageProvider><GithubGardenCard /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe('GitHub garden card', () => {
  it('renders nothing on a deployment without the GitHub App', async () => {
    answer(() => HttpResponse.json(UNAVAILABLE));
    const { client, container } = mount();
    await waitFor(() => expect(client.getQueryState(codingKeys.github())?.status).toBe('success'));
    expect(screen.queryByRole('heading', { name: en['github.title'] })).not.toBeInTheDocument();
    expect(screen.queryByText(en['github.unavailable'])).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing while it does not know yet, so the card never flashes and vanishes', async () => {
    answer(async () => { await delay('infinite'); return HttpResponse.json(NOT_CONNECTED); });
    const { client, container } = mount();
    await waitFor(() => expect(client.getQueryState(codingKeys.github())?.fetchStatus).toBe('fetching'));
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to connect on a deployment that has the GitHub App', async () => {
    answer(() => HttpResponse.json(NOT_CONNECTED));
    mount();
    expect(await screen.findByRole('button', { name: en['github.connect'] })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en['github.title'] })).toBeInTheDocument();
  });

  it('still says when the connection could not be read', async () => {
    answer(() => HttpResponse.json({ error: { code: 'internal_error', message: 'Could not handle the GitHub request' } }, { status: 500 }));
    mount();
    expect(await screen.findByText(en['github.loadFailed'])).toBeInTheDocument();
  });
});
