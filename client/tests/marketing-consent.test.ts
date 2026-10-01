// Marketing readiness (lib/marketing.ts) and the error monitor's place under
// "necessary" (lib/sentry.ts).
import { beforeEach, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn((options?: unknown) => ({ name: 'BrowserTracing', options })),
  replayIntegration: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('@sentry/react', () => sentry);

async function load() {
  vi.resetModules();
  const consent = await import('../src/lib/consent');
  const marketing = await import('../src/lib/marketing');
  return { consent, marketing };
}

/** The dataLayer entries as plain arrays (gtag pushes `arguments`). */
const layer = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
const lastEntry = () => layer()[layer().length - 1];

beforeEach(() => {
  delete window.dataLayer;
  localStorage.clear();
  document.cookie = 'devshark_consent=; Path=/; Max-Age=0';
});

it('does nothing while no marketing tag is connected', async () => {
  const { consent, marketing } = await load();
  marketing.installMarketing();
  consent.acceptAllConsent();
  expect(window.dataLayer).toBeUndefined();
});

it('starts a connected tag only after a yes to marketing, with Consent Mode denied until then', async () => {
  const { consent, marketing } = await load();
  const tag = { id: 'ga4' as const, load: vi.fn(), unload: vi.fn() };
  const stop = marketing.installMarketing([tag]);
  // The first command any Google tag would read: everything denied.
  expect(layer()).toEqual([[
    'consent', 'default',
    { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 },
  ]]);
  expect(tag.load).not.toHaveBeenCalled();

  // Analytics alone is not marketing.
  consent.saveConsent({ analytics: true, marketing: false });
  expect(tag.load).not.toHaveBeenCalled();
  expect(lastEntry()).toEqual(['consent', 'update', marketing.CONSENT_MODE_DEFAULTS]);

  consent.saveConsent({ analytics: false, marketing: true });
  expect(tag.load).toHaveBeenCalledTimes(1);
  expect(lastEntry()).toEqual(['consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }]);

  consent.rejectAllConsent();
  expect(tag.unload).toHaveBeenCalledTimes(1);
  expect(lastEntry()).toEqual(['consent', 'update', marketing.CONSENT_MODE_DEFAULTS]);
  stop();
});

it('starts a connected tag at once for a visitor who said yes on an earlier visit', async () => {
  const first = await load();
  first.consent.acceptAllConsent();
  const { marketing } = await load();
  const tag = { id: 'meta-pixel' as const, load: vi.fn(), unload: vi.fn() };
  marketing.installMarketing([tag]);
  expect(tag.load).toHaveBeenCalledTimes(1);
  expect(layer()[0][1]).toBe('default');
  expect(lastEntry()?.[1]).toBe('update');
});

it('runs error monitoring without cookies, storage, replay or personal data', async () => {
  vi.stubEnv('VITE_SENTRY_DSN', 'https://public@o1.ingest.de.sentry.io/1');
  vi.resetModules();
  const { initSentry } = await import('../src/lib/sentry');
  initSentry();
  await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));
  const options = sentry.init.mock.calls[0][0] as Record<string, unknown>;
  expect(options.sendDefaultPii).toBe(false);
  expect(sentry.replayIntegration).not.toHaveBeenCalled();
  // The previous trace stays in memory, not in sessionStorage.
  expect(sentry.browserTracingIntegration).toHaveBeenCalledWith({ linkPreviousTrace: 'in-memory' });
  expect(options).not.toHaveProperty('initialScope');
  vi.unstubAllEnvs();
});
