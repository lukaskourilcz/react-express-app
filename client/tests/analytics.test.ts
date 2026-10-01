import { beforeEach, expect, it, vi } from 'vitest';

// posthog-js is a singleton client. `loads` counts how often the app imported
// it: before consent it must never have.
const client = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));
const loads = vi.hoisted(() => ({ count: 0 }));
vi.mock('posthog-js', () => {
  loads.count += 1;
  return { default: client };
});

/** A fresh page load: new analytics and consent modules, an empty browser. */
async function load() {
  vi.resetModules();
  const consent = await import('../src/lib/consent');
  const analytics = await import('../src/lib/analytics');
  return { consent, analytics };
}

const clearCookies = () => {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
};

/** Everything PostHog and the campaign attribution can leave in a browser. */
const storedNames = () => [
  ...Object.keys(localStorage),
  ...Object.keys(sessionStorage),
  ...document.cookie.split(';').map((part) => part.split('=')[0].trim()).filter(Boolean),
];

beforeEach(() => {
  for (const fn of Object.values(client)) fn.mockReset();
  loads.count = 0;
  localStorage.clear();
  sessionStorage.clear();
  clearCookies();
  window.history.replaceState(null, '', '/');
  vi.unstubAllEnvs();
});

it('loads, stores and sends nothing before the visitor decides', async () => {
  window.history.replaceState(null, '', '/?utm_source=instagram&utm_medium=post&utm_campaign=launch-55');
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { analytics } = await load();
  analytics.initAnalytics();
  analytics.capturePageview('/');
  analytics.identifyUser('user-1');
  analytics.capture('quiz_started', { mode: 'quick' });
  analytics.captureActivation('learning_cta_clicked', { product: 'devshark', locale: 'en', source: 'home' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(loads.count).toBe(0);
  expect(client.init).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
  expect(storedNames()).toEqual([]);
});

it('starts after a yes on the same page, with the pageview and the identity that waited', async () => {
  window.history.replaceState(null, '', '/?utm_source=Threads&utm_medium=post&utm_campaign=qotd&ref=abc123');
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { consent, analytics } = await load();
  analytics.initAnalytics();
  analytics.capturePageview('/');
  analytics.identifyUser('user-1');
  consent.saveConsent({ analytics: true, marketing: false });
  await vi.waitFor(() => expect(client.capture).toHaveBeenCalledTimes(1));
  expect(loads.count).toBe(1);
  // Out and storing nothing by default, then opted in once, before any event.
  expect(client.init.mock.calls[0][1]).toMatchObject({
    api_host: '/ingest',
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    autocapture: false,
    disable_session_recording: true,
    respect_dnt: true,
  });
  expect(client.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  expect(client.opt_in_capturing.mock.invocationCallOrder[0]).toBeLessThan(client.capture.mock.invocationCallOrder[0]);
  const origin = window.location.origin;
  expect(client.capture).toHaveBeenCalledWith('$pageview', {
    $current_url: `${origin}/?utm_source=threads&utm_medium=post&utm_campaign=qotd`,
    utm_source: 'threads', utm_medium: 'post', utm_campaign: 'qotd',
  });
  await vi.waitFor(() => expect(client.identify).toHaveBeenCalledWith('user-1', undefined, { utm_source: 'threads', utm_medium: 'post', utm_campaign: 'qotd' }));
  // Only now is the first campaign kept.
  expect(JSON.parse(localStorage.getItem('devshark:campaign') ?? 'null')).toMatchObject({ campaign: { utm_source: 'threads' } });
});

it('stops PostHog and removes everything it stored when the visitor withdraws', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { consent, analytics } = await load();
  consent.acceptAllConsent();
  analytics.initAnalytics();
  analytics.capturePageview('/learn');
  await vi.waitFor(() => expect(client.capture).toHaveBeenCalledTimes(1));
  // What posthog-js and the campaign attribution keep while they run.
  localStorage.setItem('ph_test-key_posthog', '{"distinct_id":"anon-1"}');
  localStorage.setItem('__ph_opt_in_out_test-key', '1');
  localStorage.setItem('devshark:campaign', '{"campaign":{"utm_source":"threads"},"savedAt":1}');
  sessionStorage.setItem('ph_test-key_window_id', '"w1"');
  sessionStorage.setItem('ph_test-key_primary_window_exists', 'true');
  document.cookie = 'ph_test-key_posthog=%7B%7D; Path=/';
  localStorage.setItem('devquiz:settings', '{"soundEffects":true}');

  consent.rejectAllConsent();

  // reset() clears PostHog's own consent flag, so it runs before the opt-out.
  expect(client.reset).toHaveBeenCalledTimes(1);
  expect(client.opt_out_capturing).toHaveBeenCalledTimes(1);
  expect(client.reset.mock.invocationCallOrder[0]).toBeLessThan(client.opt_out_capturing.mock.invocationCallOrder[0]);
  // Necessary storage stays; the consent record is the choice itself.
  expect(storedNames().sort()).toEqual(['devquiz:settings', 'devshark:consent', 'devshark_consent'].sort());

  analytics.capture('quiz_started');
  analytics.capturePageview('/today');
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(client.capture).toHaveBeenCalledTimes(1);

  // A yes later on the same page opts the same client back in.
  consent.saveConsent({ analytics: true, marketing: false });
  await vi.waitFor(() => expect(client.capture).toHaveBeenCalledTimes(2));
  expect(client.init).toHaveBeenCalledTimes(1);
  expect(client.opt_in_capturing).toHaveBeenCalledTimes(2);
  expect(client.capture.mock.calls[1]).toEqual(['$pageview', { $current_url: `${window.location.origin}/today` }]);
});

it('never initialises PostHog when the yes is withdrawn while it loads', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { consent, analytics } = await load();
  analytics.initAnalytics();
  consent.acceptAllConsent();
  consent.rejectAllConsent();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(client.init).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
});

it('removes what an older build stored when the visitor has not said yes', async () => {
  // PostHog ran for every visitor before the banner existed.
  localStorage.setItem('ph_phc_old_posthog', '{"distinct_id":"anon-0"}');
  localStorage.setItem('devshark:campaign', '{"campaign":{"utm_source":"threads"},"savedAt":1}');
  document.cookie = 'ph_phc_old_posthog=%7B%7D; Path=/';
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { analytics } = await load();
  analytics.initAnalytics();
  expect(storedNames()).toEqual([]);
  expect(loads.count).toBe(0);
});

it('signs out without leaving PostHog opted out', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { consent, analytics } = await load();
  consent.acceptAllConsent();
  analytics.initAnalytics();
  analytics.identifyUser('user-1');
  await vi.waitFor(() => expect(client.identify).toHaveBeenCalled());
  analytics.resetAnalytics();
  await vi.waitFor(() => expect(client.reset).toHaveBeenCalledTimes(1));
  // reset() drops PostHog's consent flag; the visitor's yes still stands.
  const optIns = client.opt_in_capturing.mock.invocationCallOrder;
  expect(optIns[optIns.length - 1]).toBeGreaterThan(client.reset.mock.invocationCallOrder[0]);
});

it('captures activation without allowing raw learner data into its properties', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { consent, analytics } = await load();
  consent.acceptAllConsent();
  analytics.initAnalytics();
  await vi.waitFor(() => expect(client.init).toHaveBeenCalled());
  const properties = { product: 'devshark', locale: 'en' as const, source: 'home' as const, category: 'react', code: 'PRIVATE', answer: 'PRIVATE', access_token: 'PRIVATE' };
  analytics.captureActivation('landing_sample_completed', properties);
  await vi.waitFor(() => expect(client.capture).toHaveBeenCalledWith('landing_sample_completed', { product: 'devshark', locale: 'en', source: 'home', category: 'react' }));
  expect(client.init.mock.calls[0][1]).toMatchObject({ autocapture: false, disable_session_recording: true, respect_dnt: true });
});

it('keeps the campaign labels on the first pageview only and drops every other parameter', async () => {
  window.history.replaceState(null, '', '/?utm_source=Threads&utm_medium=post&utm_campaign=qotd&ref=abc123&voucher=SECRETCODE&email=a%40b.cz');
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { consent, analytics } = await load();
  consent.acceptAllConsent();
  analytics.initAnalytics();
  await vi.waitFor(() => expect(client.init).toHaveBeenCalled());
  analytics.capturePageview('/');
  analytics.capturePageview('/learn');
  await vi.waitFor(() => expect(client.capture).toHaveBeenCalledTimes(2));
  const origin = window.location.origin;
  expect(client.capture.mock.calls[0]).toEqual(['$pageview', {
    $current_url: `${origin}/?utm_source=threads&utm_medium=post&utm_campaign=qotd`,
    utm_source: 'threads', utm_medium: 'post', utm_campaign: 'qotd',
  }]);
  expect(client.capture.mock.calls[1]).toEqual(['$pageview', { $current_url: `${origin}/learn` }]);

  // Whatever PostHog adds on its own passes the scrubber.
  const beforeSend = client.init.mock.calls[0][1].before_send as (event: unknown) => { properties: Record<string, unknown>; $set_once: Record<string, unknown> };
  const scrubbed = beforeSend({
    event: '$pageview',
    properties: {
      $current_url: `${origin}/premium?voucher=SECRETCODE&utm_source=threads#voucher`,
      // posthog-js fills these from the full location.href of the session's first page.
      $session_entry_url: `${origin}/premium?voucher=SECRETCODE&utm_campaign=launch-55`,
      $session_entry_referrer: `${origin}/premium/cancel#confirm=TOKENTOKENTOKEN`,
      $referrer: `${origin}/premium/success?session_id=cs_live_1`,
      $session_entry_referring_domain: 'devshark.app',
    },
    $set_once: {
      $initial_current_url: `${origin}/?ref=abc123&utm_campaign=you%40mail.cz`,
      $initial_referrer: '$direct',
      $initial_session_entry_url: `${origin}/play/K7Q2AB?code=oauth-code#access_token=secret`,
      $initial_person_info: { u: `${origin}/?session_id=cs_1`, r: '$direct' },
    },
  });
  expect(scrubbed.properties.$current_url).toBe(`${origin}/premium?utm_source=threads`);
  expect(scrubbed.properties.$session_entry_url).toBe(`${origin}/premium?utm_campaign=launch-55`);
  expect(scrubbed.properties.$session_entry_referrer).toBe(`${origin}/premium/cancel`);
  expect(scrubbed.properties.$referrer).toBe(`${origin}/premium/success`);
  expect(scrubbed.properties.$session_entry_referring_domain).toBe('devshark.app');
  expect(scrubbed.$set_once.$initial_current_url).toBe(`${origin}/`);
  expect(scrubbed.$set_once.$initial_referrer).toBe('$direct');
  expect(scrubbed.$set_once.$initial_session_entry_url).toBe(`${origin}/play/K7Q2AB`);
  expect(scrubbed.$set_once.$initial_person_info).toEqual({ u: `${origin}/`, r: '$direct' });
  const withReferrer = beforeSend({
    event: '$pageview',
    properties: {},
    $set_once: { $initial_person_info: { u: `${origin}/`, r: 'https://mail.example.com/inbox?voucher=SECRETCODE#msg' } },
  });
  expect(withReferrer.$set_once.$initial_person_info).toEqual({ u: `${origin}/`, r: 'https://mail.example.com/inbox' });
  // PostHog leaves fragments out of the URLs it records itself.
  expect(client.init.mock.calls[0][1]).toMatchObject({ disable_capture_url_hashes: true });

  // The first campaign becomes the person's initial one when they sign in.
  analytics.identifyUser('user-1');
  await vi.waitFor(() => expect(client.identify).toHaveBeenCalledWith('user-1', undefined, { utm_source: 'threads', utm_medium: 'post', utm_campaign: 'qotd' }));
});

it('keeps the first campaign a browser arrived with for 30 days, once analytics is allowed', async () => {
  const { consent, analytics } = await load();
  const day = 24 * 60 * 60 * 1000;
  // Without a yes the campaign stays in memory.
  analytics.captureCampaignFromUrl('?utm_source=instagram&utm_medium=story', 0);
  expect(localStorage.getItem('devshark:campaign')).toBeNull();
  expect(analytics.firstTouchCampaign(day)).toEqual({});
  consent.saveConsent({ analytics: true, marketing: false });
  analytics.captureCampaignFromUrl('?utm_source=instagram&utm_medium=story', 0);
  analytics.captureCampaignFromUrl('?utm_source=threads&utm_campaign=launch-2026-11', day);
  expect(analytics.firstTouchCampaign(2 * day)).toEqual({ utm_source: 'instagram', utm_medium: 'story' });
  expect(analytics.firstTouchCampaign(31 * day)).toEqual({});
  analytics.captureCampaignFromUrl('?utm_source=threads&utm_campaign=launch-2026-11', 31 * day);
  expect(analytics.firstTouchCampaign(32 * day)).toEqual({ utm_source: 'threads', utm_campaign: 'launch-2026-11' });
});

it('keeps the launch campaign label on a /premium link', async () => {
  const { analytics } = await load();
  const link = 'https://devshark.app/premium?utm_source=instagram&utm_medium=post&utm_campaign=launch-55&voucher=X';
  expect(analytics.campaignFrom(new URL(link).search)).toEqual({ utm_source: 'instagram', utm_medium: 'post', utm_campaign: 'launch-55' });
  expect(analytics.scrubUrl(link, true)).toBe('https://devshark.app/premium?utm_source=instagram&utm_medium=post&utm_campaign=launch-55');
});
