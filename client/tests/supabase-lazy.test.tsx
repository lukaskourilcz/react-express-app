// The Supabase client loads on demand (lib/supabaseClient.ts): a visitor who is
// not signed in never imports @supabase/supabase-js, while a stored session, an
// OAuth return, a sign-in and a sign-in in another tab do. Each test evaluates
// the modules afresh against the page state it arranges, as a page load would.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

const PROJECT_URL = 'https://testprojectref.supabase.co';
const ANON_KEY = 'test-anon-key';

// A stand-in for supabase-js 2.110, reduced to what the app calls. Like the
// real client it starts initializing inside createClient: it reads an OAuth
// return from the URL, saves it and announces SIGNED_IN in a later task, or it
// announces a stored session as SIGNED_IN a microtask later; every subscriber
// then gets INITIAL_SESSION.
const sb = vi.hoisted(() => {
  type Listener = (event: string, session: unknown) => void;
  const KEY = 'sb-testprojectref-auth-token';
  const readStored = () => {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { access_token: string; user: { id: string } }) : null;
  };
  const sessionFor = (accessToken: string, userId: string) => ({
    access_token: accessToken,
    refresh_token: `${accessToken}-refresh`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, email: `${userId}@example.test`, user_metadata: {} },
  });
  const makeClient = (url: string, key: string) => {
    const listeners = new Set<Listener>();
    const emit = (event: string, session: unknown) => [...listeners].forEach((listener) => listener(event, session));
    const client = {
      url,
      key,
      /** Subscribers that heard the SIGNED_IN announcing a restored session. */
      heardRestore: 0,
      auth: {
        getSession: vi.fn(async () => {
          await initialized;
          return { data: { session: readStored() }, error: null };
        }),
        onAuthStateChange: vi.fn((listener: Listener) => {
          listeners.add(listener);
          void initialized.then(() => listener('INITIAL_SESSION', readStored()));
          return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
        }),
        signInWithOAuth: vi.fn(async () => ({ data: { provider: 'google', url: `${url}/auth/v1/authorize` }, error: null })),
        signOut: vi.fn(async () => {
          localStorage.removeItem(KEY);
          emit('SIGNED_OUT', null);
          return { error: null };
        }),
        refreshSession: vi.fn(async () => ({ data: { session: readStored() }, error: null })),
        updateUser: vi.fn(async () => ({ data: { user: readStored()?.user ?? null }, error: null })),
      },
    };
    const saveAndAnnounce = (session: ReturnType<typeof sessionFor>) => {
      localStorage.setItem(KEY, JSON.stringify(session));
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(() => emit('SIGNED_IN', session), 0);
    };
    const initialized = (async () => {
      await Promise.resolve();
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const code = new URLSearchParams(window.location.search).get('code');
      if (fragment.get('access_token')) return saveAndAnnounce(sessionFor(fragment.get('access_token')!, 'user-oauth'));
      if (code && localStorage.getItem(`${KEY}-code-verifier`)) return saveAndAnnounce(sessionFor(`pkce-${code}`, 'user-pkce'));
      const stored = readStored();
      if (stored) {
        client.heardRestore = listeners.size;
        emit('SIGNED_IN', stored);
      }
    })();
    return client;
  };
  const state = {
    KEY,
    sessionFor,
    /** How many times this test's modules imported @supabase/supabase-js. */
    imports: 0,
    /** Holds a download until the test releases it. */
    held: null as null | { promise: Promise<void>; release: () => void },
    clients: [] as ReturnType<typeof makeClient>[],
    createClient: vi.fn((url: string, key: string) => {
      const created = makeClient(url, key);
      state.clients.push(created);
      return created;
    }),
  };
  return state;
});

const KEY = sb.KEY;
const STORED = sb.sessionFor('stored-access-token', 'user-stored');

/** The page load: fresh modules, and a supabase-js whose imports are counted.
 * `held` keeps the download pending until releaseDownload(), as a slow network
 * would; `fails` makes it fail. */
function freshPageLoad(download: 'instant' | 'held' | 'fails' = 'instant') {
  vi.resetModules();
  let release = () => {};
  sb.held = download === 'held' ? { promise: new Promise<void>((resolve) => { release = resolve; }), release: () => release() } : null;
  vi.doMock('@supabase/supabase-js', async () => {
    sb.imports += 1;
    await sb.held?.promise;
    if (download === 'fails') throw new Error('Failed to fetch dynamically imported module');
    return { createClient: sb.createClient };
  });
}
const releaseDownload = () => act(async () => sb.held?.release());

/** Let pending promises, timers and React updates run. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

/** What the auth context said on each render, and its latest value. */
async function mountAuth() {
  const auth = await import('../src/lib/auth');
  const renders: string[] = [];
  let latest: ReturnType<typeof auth.useAuth> | undefined;
  function Probe() {
    latest = auth.useAuth();
    const shown = latest.isLoading ? 'loading' : latest.user ? `user:${latest.user.id}` : 'signed-out';
    renders.push(shown);
    return <p data-testid="auth">{shown}</p>;
  }
  render(<auth.AuthProvider><Probe /></auth.AuthProvider>);
  return { renders, current: () => latest! };
}

/** Records every sign-in report, with its bearer token. */
function recordSignInReports() {
  const reports: (string | null)[] = [];
  server.use(http.post('*/api/user/authevent', ({ request }) => {
    reports.push(request.headers.get('authorization'));
    return HttpResponse.json({ ok: true, kind: 'login' });
  }));
  return reports;
}

/** Records the Authorization header of each GET /api/test. */
function recordAuthorization() {
  const seen: (string | null)[] = [];
  server.use(http.get('*/api/test', ({ request }) => {
    seen.push(request.headers.get('authorization'));
    return HttpResponse.json({ ok: true });
  }));
  return seen;
}

beforeEach(() => {
  sb.imports = 0;
  sb.clients.length = 0;
  sb.createClient.mockClear();
  vi.stubEnv('VITE_SUPABASE_URL', PROJECT_URL);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', ANON_KEY);
  window.history.replaceState(null, '', '/');
  freshPageLoad();
});

afterEach(async () => {
  sb.held?.release();
  await settle();
  vi.unstubAllEnvs();
  vi.doUnmock('@supabase/supabase-js');
  window.history.replaceState(null, '', '/');
  sessionStorage.clear();
});

describe('a visitor who is not signed in', () => {
  it('is signed out from the first render and never imports supabase-js', async () => {
    const reports = recordSignInReports();
    const { renders } = await mountAuth();
    expect(renders[0]).toBe('signed-out');
    await settle();
    expect(screen.getByTestId('auth')).toHaveTextContent('signed-out');
    expect(renders).not.toContain('loading');
    expect(sb.imports).toBe(0);
    expect(sb.createClient).not.toHaveBeenCalled();
    expect(reports).toEqual([]);
  });

  it('sends API requests without a token and without importing supabase-js', async () => {
    const authorization = recordAuthorization();
    const { apiFetch } = await import('../src/lib/api');
    await expect(apiFetch('/api/test')).resolves.toEqual({ ok: true });
    expect(authorization).toEqual([null]);
    expect(sb.imports).toBe(0);
  });

  it('writes no account preference and opens no live channel without importing supabase-js', async () => {
    const { savePreferredLanguage } = await import('../src/lib/languagePref');
    const { saveLearningPreference } = await import('../src/lib/trackPref');
    const { joinMatchChannel } = await import('../src/lib/realtime');
    await savePreferredLanguage('en');
    await expect(saveLearningPreference(null, { schemaVersion: 1, baseTrack: 'frontend', specialization: null }))
      .resolves.toMatchObject({ ok: false, reason: 'not_signed_in' });
    await settle();
    expect(sb.imports).toBe(0);
    const statuses: string[] = [];
    joinMatchChannel('ABC123').onStatus((status) => statuses.push(status));
    expect(statuses).toEqual(['DISCONNECTED']);
    await settle();
    expect(sb.imports).toBe(0);
  });

  it('treats a ?code= without a stored code verifier as no sign-in', async () => {
    window.history.replaceState(null, '', '/settings/github?code=from-another-provider&state=x');
    const { renders } = await mountAuth();
    await settle();
    expect(renders[0]).toBe('signed-out');
    expect(sb.imports).toBe(0);
  });
});

describe('a returning visitor with a stored session', () => {
  it('starts importing supabase-js while the modules evaluate, before anything renders', async () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    await import('../src/lib/auth');
    await waitFor(() => expect(sb.createClient).toHaveBeenCalledTimes(1));
    expect(sb.imports).toBe(1);
    // The default storage key: an explicit storageKey would sign users out.
    expect(sb.createClient).toHaveBeenCalledWith(PROJECT_URL, ANON_KEY);
  });

  it('restores the user while the download is slow, without reporting a sign-in', async () => {
    freshPageLoad('held');
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const reports = recordSignInReports();
    const { renders } = await mountAuth();
    await settle();
    expect(renders).toEqual(['loading']);
    expect(sb.createClient).not.toHaveBeenCalled();
    await releaseDownload();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-stored'));
    await settle();
    // The provider subscribed before the client existed and was attached as it
    // was created, so it heard the SIGNED_IN that announces the restore...
    expect(sb.clients[0].heardRestore).toBe(1);
    // ...and a restore is not a sign-in.
    expect(reports).toEqual([]);
    expect(sb.imports).toBe(1);
  });

  it('restores the user when the client loaded before the provider mounted', async () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const reports = recordSignInReports();
    await import('../src/lib/supabaseClient');
    await waitFor(() => expect(sb.createClient).toHaveBeenCalledTimes(1));
    await settle();
    const { renders } = await mountAuth();
    expect(renders[0]).toBe('loading');
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-stored'));
    await settle();
    expect(reports).toEqual([]);
    expect(sb.imports).toBe(1);
  });

  it('sends the stored access token with API requests', async () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const authorization = recordAuthorization();
    const { apiFetch } = await import('../src/lib/api');
    await expect(apiFetch('/api/test')).resolves.toEqual({ ok: true });
    expect(authorization).toEqual(['Bearer stored-access-token']);
    expect(sb.imports).toBe(1);
  });

  it('waits for a download still in flight, within the four-second limit, and sends the token', async () => {
    freshPageLoad('held');
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const authorization = recordAuthorization();
    const { apiFetch } = await import('../src/lib/api');
    const request = apiFetch('/api/test');
    await settle();
    expect(authorization).toEqual([]);
    await releaseDownload();
    await expect(request).resolves.toEqual({ ok: true });
    expect(authorization).toEqual(['Bearer stored-access-token']);
  });

  it('signs out through the loaded client', async () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const { current } = await mountAuth();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-stored'));
    await act(() => current().signOut());
    expect(sb.clients[0].auth.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('auth')).toHaveTextContent('signed-out');
    expect(sb.imports).toBe(1);
  });

  it('saves a preference with the token, then refreshes the session through the loaded client', async () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const writes: (string | null)[] = [];
    server.use(http.put(/\/api\/user\/\[op\]/, ({ request }) => {
      writes.push(request.headers.get('authorization'));
      return HttpResponse.json({ ok: true });
    }));
    const { saveLearningPreference } = await import('../src/lib/trackPref');
    await expect(saveLearningPreference('user-stored', { schemaVersion: 1, baseTrack: 'backend', specialization: null }))
      .resolves.toMatchObject({ ok: true });
    expect(writes).toEqual(['Bearer stored-access-token']);
    expect(sb.clients[0].auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(sb.imports).toBe(1);
  });

  it('opens a live match channel on the loaded client', async () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    await mountAuth();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-stored'));
    const channel = { subscribe: vi.fn(), send: vi.fn(), on: vi.fn() };
    const client = sb.clients[0] as unknown as { channel: (name: string) => typeof channel };
    client.channel = vi.fn(() => channel);
    const { joinMatchChannel } = await import('../src/lib/realtime');
    joinMatchChannel('ABC123');
    expect(client.channel).toHaveBeenCalledWith('match:ABC123', { config: { broadcast: { self: true } } });
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });
});

describe('an OAuth return', () => {
  it('imports supabase-js at once, and the sign-in is reported with its token', async () => {
    freshPageLoad('held');
    window.history.replaceState(null, '', '/#access_token=oauth-access-token&refresh_token=r&expires_in=3600&token_type=bearer');
    const reports = recordSignInReports();
    const { renders } = await mountAuth();
    expect(renders[0]).toBe('loading');
    await settle();
    expect(sb.imports).toBe(1);
    await releaseDownload();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-oauth'));
    await waitFor(() => expect(reports).toEqual(['Bearer oauth-access-token']));
    expect(window.location.hash).toBe('');
  });

  it('imports supabase-js for an error return too, which supabase-js reads', async () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_description=The+user+denied+the+request');
    const { renders } = await mountAuth();
    expect(renders[0]).toBe('loading');
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('signed-out'));
    expect(sb.imports).toBe(1);
  });

  it('imports supabase-js for a PKCE ?code= whose verifier this browser stored', async () => {
    localStorage.setItem(`${KEY}-code-verifier`, '"verifier"');
    window.history.replaceState(null, '', '/?code=pkce-code');
    await mountAuth();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-pkce'));
    expect(sb.imports).toBe(1);
  });
});

describe('signing in', () => {
  it('imports supabase-js on the click and starts the Google redirect', async () => {
    const { current } = await mountAuth();
    await settle();
    expect(sb.imports).toBe(0);
    await act(() => current().signInWithGoogle('/premium'));
    expect(sb.imports).toBe(1);
    expect(sb.clients[0].auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    expect(sessionStorage.getItem('devshark:auth-return')).toContain('"/premium"');
  });

  it('fails the sign-in and forgets the return when the download fails', async () => {
    freshPageLoad('fails');
    const { current } = await mountAuth();
    await expect(current().signInWithGoogle('/premium')).rejects.toThrow();
    expect(sessionStorage.getItem('devshark:auth-return')).toBeNull();
    expect(screen.getByTestId('auth')).toHaveTextContent('signed-out');
  });

  it('in another tab loads supabase-js here and restores the user', async () => {
    const reports = recordSignInReports();
    const { renders } = await mountAuth();
    await settle();
    expect(sb.imports).toBe(0);
    // The other tab's supabase-js writes the session; this tab hears the storage event.
    localStorage.setItem(KEY, JSON.stringify(STORED));
    act(() => {
      window.dispatchEvent(new window.StorageEvent('storage', { key: KEY, newValue: JSON.stringify(STORED) }));
    });
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('user:user-stored'));
    expect(sb.imports).toBe(1);
    expect(renders).not.toContain('loading');
    // The tab that signed in reports the sign-in; this one restored it.
    expect(reports).toEqual([]);
  });
});

describe('the storage key', () => {
  it('is only derived from a URL supabase-js accepts', async () => {
    const { sessionKeyFor } = await import('../src/lib/supabaseClient');
    expect(sessionKeyFor(PROJECT_URL)).toBe(KEY);
    expect(sessionKeyFor(`  ${PROJECT_URL}/  `)).toBe(KEY);
    expect(sessionKeyFor('testprojectref.supabase.co')).toBeNull();
    expect(sessionKeyFor('')).toBeNull();
    expect(sessionKeyFor(undefined)).toBeNull();
  });
});
