// The PostHog client and its settings. lib/analytics.ts imports this file
// only after the visitor says yes to analytics, so posthog-js, these settings
// and the URL scrubber travel in one lazy chunk and never in the shell.

import posthog, { type PostHog } from 'posthog-js';
import { scrubUrl } from './analytics';

/** A URL or referrer property as analytics may see it. PostHog's `$direct`
 * (no referrer) is a label, not an address, and stays. */
const scrubUrlValue = (value: string): string => (value === '$direct' ? value : scrubUrl(value, true));

/** Every event PostHog sends passes here: URLs lose every parameter but the
 * campaign labels, so no code, id or address reaches analytics. That covers
 * every property PostHog fills from an address on its own (`$current_url`,
 * `$session_entry_url`, `$referrer`, `$session_entry_referrer`, their
 * `$initial_` copies) and the `u`/`r` pair in `$initial_person_info`. */
function scrubEvent<T extends { properties?: Record<string, unknown>; $set?: Record<string, unknown>; $set_once?: Record<string, unknown> } | null>(event: T): T {
  if (!event) return event;
  for (const bag of [event.properties, event.$set, event.$set_once, event.properties?.$set as Record<string, unknown> | undefined, event.properties?.$set_once as Record<string, unknown> | undefined]) {
    if (!bag || typeof bag !== 'object') continue;
    for (const key of Object.keys(bag)) {
      const value = bag[key];
      if (/(_url|referrer)$/.test(key) && typeof value === 'string') bag[key] = scrubUrlValue(value);
      if (key === '$initial_person_info' && value && typeof value === 'object') {
        const info = value as { u?: unknown; r?: unknown };
        if (typeof info.u === 'string') info.u = scrubUrlValue(info.u);
        if (typeof info.r === 'string') info.r = scrubUrlValue(info.r);
      }
    }
  }
  return event;
}

/** Initialise the singleton client, opted out and storing nothing. The
 * caller opts it in. */
export function startPostHog(key: string, apiHost: string): PostHog {
  posthog.init(key, {
    api_host: apiHost,
    // Where the SDK sends users for the toolbar / links (EU Cloud UI).
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    // We drive SPA pageviews manually from the router (capturePageview),
    // but let PostHog measure how long each view was open.
    capture_pageview: false,
    capture_pageleave: true,
    respect_dnt: true,
    autocapture: false,
    disable_session_recording: true,
    capture_dead_clicks: false,
    // A fragment can carry a token (a cancel confirmation, an OAuth return);
    // PostHog leaves it out of the URLs it records itself.
    disable_capture_url_hashes: true,
    // Out, and storing nothing, until the caller opts in. PostHog reads its
    // own consent flag from storage on every check, so once a withdrawal has
    // removed that flag it must fall back to "out", never "in".
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    before_send: (event) => scrubEvent(event),
  });
  return posthog;
}
