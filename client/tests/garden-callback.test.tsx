// The GitHub garden's callback page (/settings/github). GitHub lands here after
// the learner installs and authorizes the app; the page hands the one-time
// authorization code to the server with the installation and the state, and
// explains in plain words when the server refuses the connection.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { en } from '../src/i18n/translations';
import GithubSettingsPage from '../src/components/coding/GithubSettingsPage';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({ value: { user: { id: 'user-1' } as { id: string } | null, isAuthenticated: true, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ ...auth.value, signInWithGoogle: async () => undefined }) }));
afterEach(() => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; });

// The connection api/user/[op].ts answers a finished connect with.
const CONNECTED = {
  available: true, status: 'active', accountLogin: 'garden-owner', repoFullName: 'garden-owner/garden', defaultBranch: 'main',
  lastCommitAt: null, queued: 0, lastError: null,
};

// Where github-connect-start sends the learner: the app's installation page
// with a new sealed state.
const INSTALL_URL = 'https://github.com/apps/devshark-garden/installations/new?state=fresh-state';

/** Every github-connect-start the page sent in the current test. */
const starts: string[] = [];
afterEach(() => { starts.length = 0; });

/** Answers github-connect-finish with `answer` and github-connect-start with
 * the installation page, and records each finish body and each start. */
function finishAnswers(answer: () => Response) {
  const bodies: unknown[] = [];
  server.use(http.post('*/api/user/*', async ({ request }) => {
    const op = new URL(request.url).searchParams.get('op');
    if (op === 'github-connect-start') {
      starts.push(op);
      return HttpResponse.json({ url: INSTALL_URL });
    }
    if (op !== 'github-connect-finish') return HttpResponse.json({ error: { code: 'unknown_op', message: 'Unknown user op' } }, { status: 404 });
    bodies.push(await request.json());
    return answer();
  }));
  return bodies;
}
const refusal = (status: number, code: string, message: string) => () => HttpResponse.json({ error: { code, message } }, { status });

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.hash}</p>;
}

const mount = (search: string) => act(async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/settings/github${search}`]}>
        <LanguageProvider>
          <Routes>
            <Route path="/settings/github" element={<><GithubSettingsPage /><Where /></>} />
            <Route path="*" element={<Where />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
});

const CALLBACK = '?installation_id=555001&setup_action=install&state=sealed-state';

describe('GitHub garden callback', () => {
  it('sends the authorization code with the installation and state, then returns to the profile', async () => {
    const bodies = finishAnswers(() => HttpResponse.json(CONNECTED));
    await mount(`${CALLBACK}&code=one-time-code`);
    expect(await screen.findByText('/profile#github-garden')).toBeInTheDocument();
    expect(bodies).toEqual([{ installationId: '555001', state: 'sealed-state', code: 'one-time-code' }]);
  });

  it('asks to authorize again when GitHub sent no code, without calling the server', async () => {
    await mount(CALLBACK);
    expect(await screen.findByText(en['github.callbackAuthorize'])).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en['github.callbackFailed'] })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en['quiz.retry'] })).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/settings/github');
  });

  it.each([
    ['authorization_missing', 400, en['github.callbackAuthorize']],
    ['authorization_failed', 403, en['github.callbackAuthorize']],
    ['installation_not_yours', 403, en['github.callbackNotYours']],
    ['installation_taken', 409, en['github.callbackTaken']],
  ] as const)('explains a %s refusal and offers no retry, which could not succeed', async (code, status, copy) => {
    const bodies = finishAnswers(refusal(status, code, 'server wording the learner does not see'));
    await mount(`${CALLBACK}&code=one-time-code`);
    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(screen.queryByText('server wording the learner does not see')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en['quiz.retry'] })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: en['github.backToProfile'] })).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
  });

  // GitHub's code works once, and after a server error or a refusal the server
  // may already have spent it: sending it again cannot succeed, so the page
  // starts a new connection instead. (This case used to offer Retry.)
  it.each([
    ['a server error', refusal(500, 'internal_error', 'Could not handle the GitHub request'), en['error.server']],
    ['a GitHub error', refusal(502, 'github_error', 'GitHub did not accept the request. Try again in a moment.'), en['error.server']],
    ['an organisation installation', refusal(400, 'organisation_not_supported', 'Install the app on your own account, not an organisation'), 'Install the app on your own account, not an organisation'],
    ['an expired state', refusal(400, 'invalid_state', 'The connection request expired. Start again from your profile.'), 'The connection request expired. Start again from your profile.'],
  ] as const)('offers a new connection, not a retry of the spent code, after %s', async (_label, answer, copy) => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, origin: original.origin, assign } });
    try {
      const bodies = finishAnswers(answer);
      await mount(`${CALLBACK}&code=one-time-code`);
      const again = await screen.findByRole('button', { name: en['github.connectAgain'] });
      expect(screen.getByText(copy)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: en['quiz.retry'] })).not.toBeInTheDocument();
      await act(async () => { again.click(); });
      await waitFor(() => expect(assign).toHaveBeenCalledWith(INSTALL_URL));
      expect(starts).toEqual(['github-connect-start']);
      expect(bodies).toHaveLength(1);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it.each([
    ['no connection', () => HttpResponse.error(), en['error.network']],
    ['a rate limit', refusal(429, 'rate_limited', 'Too many requests. Try again shortly.'), en['error.rateLimited']],
    ['the garden briefly unavailable', refusal(503, 'not_configured', 'The GitHub garden is not configured'), en['error.serviceUnavailable']],
  ] as const)('keeps the retry after %s, which never reached the check, and sends the same code again', async (_label, answer, copy) => {
    let calls = 0;
    const bodies = finishAnswers(() => (calls++ === 0 ? answer() : HttpResponse.json(CONNECTED)));
    await mount(`${CALLBACK}&code=one-time-code`);
    const retry = await screen.findByRole('button', { name: en['quiz.retry'] });
    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en['github.connectAgain'] })).not.toBeInTheDocument();
    await act(async () => { retry.click(); });
    expect(await screen.findByText('/profile#github-garden')).toBeInTheDocument();
    expect(bodies).toEqual([
      { installationId: '555001', state: 'sealed-state', code: 'one-time-code' },
      { installationId: '555001', state: 'sealed-state', code: 'one-time-code' },
    ]);
    expect(starts).toEqual([]);
  });

  it('sends a learner who changed the installation on GitHub back to the profile', async () => {
    await mount('?installation_id=555001&setup_action=update&code=one-time-code');
    expect(await screen.findByText('/profile#github-garden')).toBeInTheDocument();
  });
});
