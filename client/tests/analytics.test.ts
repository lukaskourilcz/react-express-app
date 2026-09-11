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
