// The plan read (lib/entitlement.ts): when it is asked, and how often it is
// asked again. Perf baseline #587 C14 and C29.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

const PROJECT_URL = 'https://testprojectref.supabase.co';
const KEY = 'sb-testprojectref-auth-token';
const session = (expiresInS: number) => ({
  access_token: 'stored-access-token',
  refresh_token: 'stored-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + expiresInS,
  user: { id: 'user-stored', user_metadata: {} },
});

/** Every plan read, with its bearer token. */
function recordPlanReads(tier: 'free' | 'premium' = 'free') {
  const reads: (string | null)[] = [];
  server.use(http.get('*/api/user/*', ({ request }) => {
    if (new URL(request.url).searchParams.get('op') !== 'entitlement') return undefined;
    reads.push(request.headers.get('authorization'));
    return HttpResponse.json({ tier, source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null });
  }));
  return reads;
}

/** A page load: fresh modules, and a supabase-js that never finishes loading
 * its session, so nothing here can come from it. */
async function pageLoad() {
  vi.resetModules();
  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getSession: () => new Promise(() => undefined),
      },
    }),
  }));
  const entitlement = await import('../src/lib/entitlement');
  const { queryClient } = await import('../src/lib/queryClient');
  return { ...entitlement, queryClient };
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', PROJECT_URL);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@supabase/supabase-js');
  window.history.replaceState(null, '', '/');
});

describe('the plan read at start-up (C14)', () => {
  it('asks for the stored account’s plan at once, under the key its own query uses', async () => {
    localStorage.setItem(KEY, JSON.stringify(session(3600)));
    const reads = recordPlanReads('premium');
    const { prefetchStoredAccountPlan, entitlementKeys, queryClient } = await pageLoad();
    prefetchStoredAccountPlan();
    await vi.waitFor(() => expect(queryClient.getQueryData(entitlementKeys.user('user-stored'))).toMatchObject({ tier: 'premium' }));
    expect(reads).toEqual(['Bearer stored-access-token']);
  });

  it('asks nothing for a guest, a token supabase-js must refresh first, or an OAuth return', async () => {
    const reads = recordPlanReads();
    let loaded = await pageLoad();
    loaded.prefetchStoredAccountPlan();

    localStorage.setItem(KEY, JSON.stringify(session(30)));
    loaded = await pageLoad();
    loaded.prefetchStoredAccountPlan();

    localStorage.setItem(KEY, JSON.stringify(session(3600)));
    window.history.replaceState(null, '', '/#access_token=new-token&refresh_token=r&expires_in=3600&token_type=bearer');
    loaded = await pageLoad();
    loaded.prefetchStoredAccountPlan();

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(reads).toEqual([]);
    expect(loaded.queryClient.getQueryCache().getAll()).toEqual([]);
  });
});
