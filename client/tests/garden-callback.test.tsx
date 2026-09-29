// The GitHub garden's callback page (/settings/github). GitHub lands here after
// the learner installs and authorizes the app; the page hands the one-time
// authorization code to the server with the installation and the state, and
// explains in plain words when the server refuses the connection.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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

/** Answers github-connect-finish with `answer` and records each body sent. */
function finishAnswers(answer: () => Response) {
  const bodies: unknown[] = [];
  server.use(http.post('*/api/user/*', async ({ request }) => {
    if (new URL(request.url).searchParams.get('op') !== 'github-connect-finish') return HttpResponse.json({ error: { code: 'unknown_op', message: 'Unknown user op' } }, { status: 404 });
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

  it('keeps the retry for a failure that says nothing about ownership', async () => {
    finishAnswers(refusal(500, 'internal_error', 'Could not handle the GitHub request'));
    await mount(`${CALLBACK}&code=one-time-code`);
    expect(await screen.findByRole('button', { name: en['quiz.retry'] })).toBeInTheDocument();
    expect(screen.getByText(en['error.server'])).toBeInTheDocument();
  });

  it('sends a learner who changed the installation on GitHub back to the profile', async () => {
    await mount('?installation_id=555001&setup_action=update&code=one-time-code');
    expect(await screen.findByText('/profile#github-garden')).toBeInTheDocument();
  });
});
