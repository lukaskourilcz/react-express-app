// PostHog product analytics - funnels, session replay, and event capture.
//
// Mirrors the Sentry wiring (lib/sentry.ts): everything here is a no-op until
// VITE_PUBLIC_POSTHOG_KEY is set, so local/preview builds and forks with no key
// pay nothing. Unlike Sentry, the SDK is pulled in with a *dynamic* import so
// posthog-js lands in its own lazy chunk and never touches the initial bundle;
// it's fetched in the background after first paint.
//
// Privacy / GDPR: we point at PostHog EU Cloud and reverse-proxy every request
// through our own /ingest path (see vercel.json). That keeps the CSP tight to
// 'self' (no third-party host) and stops ad-blockers from dropping events.
// `person_profiles: 'identified_only'` means anonymous visitors don't create
// person profiles, and `respect_dnt` honours the browser's Do-Not-Track signal.

import type { PostHog } from 'posthog-js';

let loading: Promise<PostHog | null> | null = null;

/** Load + init PostHog once (no-op without a key, or if already loading). */
export function initAnalytics(): void {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
  if (!key || loading) return;
  // Default to the same-origin reverse proxy; override only if you must.
  const apiHost = (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) || '/ingest';

  loading = import('posthog-js')
    .then(({ default: ph }) => {
      ph.init(key, {
        api_host: apiHost,
        // Where the SDK sends users for the toolbar / links (EU Cloud UI).
        ui_host: 'https://eu.posthog.com',
        person_profiles: 'identified_only',
        // We drive SPA pageviews manually from the router (capturePageview),
        // but let PostHog measure how long each view was open.
        capture_pageview: false,
        capture_pageleave: true,
        respect_dnt: true,
      });
      return ph;
    })
    .catch(() => null);
}

/** Resolve the live client once loaded, or null if analytics is disabled. */
function ready(): Promise<PostHog | null> {
  return loading ?? Promise.resolve(null);
}

/** Capture a product event (no-op until initAnalytics runs with a key). */
export function capture(event: string, properties?: Record<string, unknown>): void {
  void ready().then((ph) => ph?.capture(event, properties));
}

/** Record a SPA pageview on route change. */
export function capturePageview(path: string): void {
  void ready().then((ph) =>
    ph?.capture('$pageview', { $current_url: window.location.origin + path }),
  );
}

/** Tie subsequent events to a signed-in user (call on auth). */
export function identifyUser(id: string, properties?: Record<string, unknown>): void {
  void ready().then((ph) => ph?.identify(id, properties));
}

/** Clear the identity + start a fresh anonymous session (call on sign-out). */
export function resetAnalytics(): void {
  void ready().then((ph) => ph?.reset());
}
