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

/* ── learning-path pilot funnel ────────────────────────────────────────── */

/**
 * The four events the FDE and DSA pilot needs, with an explicit allow-list of
 * properties.
 *
 * Nothing a learner wrote ever leaves the app: no code, no free text, no
 * artifact fields, no session token, no answer. Only ids that already appear
 * in the public manifest, plus a coarse outcome. `capture` is a no-op when
 * analytics is disabled, so the app works identically with it switched off.
 */
export type PathFunnelEvent =
  | 'learning_path_enrolled'
  | 'learning_path_activity_started'
  | 'learning_path_activity_verified'
  | 'learning_path_returned';

export interface PathFunnelProperties {
  /** 'fde' | 'dsa-foundations' — a published id, not a learner's. */
  pathId: string;
  curriculumVersion: number;
  /** Manifest activity id. Public in the catalogue. */
  activityId?: string;
  /** 'lesson' | 'check' | 'code' | 'artifact'. */
  activityKind?: string;
  /** 'verified_pass' | 'self_reviewed' | 'needs_revision'. */
  state?: string;
}

const FUNNEL_KEYS: (keyof PathFunnelProperties)[] = [
  'pathId',
  'curriculumVersion',
  'activityId',
  'activityKind',
  'state',
];

export function capturePathEvent(event: PathFunnelEvent, properties: PathFunnelProperties): void {
  // Rebuilt from the allow-list rather than filtered, so a caller cannot pass
  // an extra field through by accident.
  const safe: Record<string, unknown> = {};
  for (const key of FUNNEL_KEYS) {
    const value = properties[key];
    if (value !== undefined) safe[key] = value;
  }
  capture(event, safe);
}
