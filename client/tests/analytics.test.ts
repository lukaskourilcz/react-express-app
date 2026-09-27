import { expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: client }));
it('captures activation without allowing raw learner data into its properties', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { initAnalytics, captureActivation } = await import('../src/lib/analytics');
  initAnalytics();
  await vi.waitFor(() => expect(client.init).toHaveBeenCalled());
  const properties = { product: 'devshark', locale: 'en' as const, source: 'home' as const, category: 'react', code: 'PRIVATE', answer: 'PRIVATE', access_token: 'PRIVATE' };
  captureActivation('landing_sample_completed', properties);
  await vi.waitFor(() => expect(client.capture).toHaveBeenCalledWith('landing_sample_completed', { product: 'devshark', locale: 'en', source: 'home', category: 'react' }));
  expect(client.init.mock.calls[0][1]).toMatchObject({ autocapture: false, disable_session_recording: true, respect_dnt: true });
  vi.unstubAllEnvs();
});

it('keeps the campaign labels on the first pageview only and drops every other parameter', async () => {
  vi.resetModules();
  client.init.mockClear();
  client.capture.mockClear();
  const identify = vi.fn();
  (client as unknown as { identify: typeof identify }).identify = identify;
  localStorage.clear();
  window.history.replaceState(null, '', '/?utm_source=Threads&utm_medium=post&utm_campaign=qotd&ref=abc123&voucher=SECRETCODE&email=a%40b.cz');
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
  const { initAnalytics, capturePageview, identifyUser } = await import('../src/lib/analytics');
  initAnalytics();
  await vi.waitFor(() => expect(client.init).toHaveBeenCalled());
  capturePageview('/');
  capturePageview('/learn');
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
    properties: { $current_url: `${origin}/premium?voucher=SECRETCODE&utm_source=threads#voucher` },
    $set_once: { $initial_current_url: `${origin}/?ref=abc123&utm_campaign=you%40mail.cz`, $initial_person_info: { u: `${origin}/?session_id=cs_1`, r: '$direct' } },
  });
  expect(scrubbed.properties.$current_url).toBe(`${origin}/premium?utm_source=threads`);
  expect(scrubbed.$set_once.$initial_current_url).toBe(`${origin}/`);
  expect(scrubbed.$set_once.$initial_person_info).toEqual({ u: `${origin}/`, r: '$direct' });

  // The first campaign becomes the person's initial one when they sign in.
  identifyUser('user-1');
  await vi.waitFor(() => expect(identify).toHaveBeenCalledWith('user-1', undefined, { utm_source: 'threads', utm_medium: 'post', utm_campaign: 'qotd' }));
  vi.unstubAllEnvs();
});

it('keeps the first campaign a browser arrived with for 30 days', async () => {
  vi.resetModules();
  localStorage.clear();
  const { captureCampaignFromUrl, firstTouchCampaign } = await import('../src/lib/analytics');
  const day = 24 * 60 * 60 * 1000;
  captureCampaignFromUrl('?utm_source=instagram&utm_medium=story', 0);
  captureCampaignFromUrl('?utm_source=threads&utm_campaign=launch-2026-11', day);
  expect(firstTouchCampaign(2 * day)).toEqual({ utm_source: 'instagram', utm_medium: 'story' });
  expect(firstTouchCampaign(31 * day)).toEqual({});
  captureCampaignFromUrl('?utm_source=threads&utm_campaign=launch-2026-11', 31 * day);
  expect(firstTouchCampaign(32 * day)).toEqual({ utm_source: 'threads', utm_campaign: 'launch-2026-11' });
});
