// PostHog product analytics - explicit funnels and event capture.
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
import { readJSON, writeJSON } from './storage';

let loading: Promise<PostHog | null> | null = null;

/* ── campaign attribution (#239) ───────────────────────────────────────── *
 * Social posts link to devShark with `utm_source`, `utm_medium` and
 * `utm_campaign` (instagram|threads|linkedin, post|story|bio|reply|ad, a
 * kebab-case campaign). The first pageview keeps those three and nothing else
 * of the query string, and the first campaign a browser arrived with becomes
 * the person's initial campaign when the visitor signs in. Every other query
 * parameter (`ref`, `voucher`, a Stripe `session_id`, anything a mail client
 * appended) is dropped from every URL analytics sees, and a value that is not
 * a short campaign label (an e-mail address, a token) is dropped as well. */

export const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;
export type CampaignKey = (typeof CAMPAIGN_KEYS)[number];
export type Campaign = Partial<Record<CampaignKey, string>>;

const CAMPAIGN_STORAGE_KEY = 'devshark:campaign';
/** A first touch older than this no longer explains a sign-up. */
const CAMPAIGN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CAMPAIGN_VALUE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/** The campaign labels in a query string, lower-cased; anything else is left out. */
export function campaignFrom(search: string): Campaign {
  const params = new URLSearchParams(search);
  const campaign: Campaign = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key)?.trim().toLowerCase();
    if (value && CAMPAIGN_VALUE.test(value)) campaign[key] = value;
  }
  return campaign;
}

const campaignQuery = (campaign: Campaign): string => {
  const params = new URLSearchParams();
  for (const key of CAMPAIGN_KEYS) if (campaign[key]) params.set(key, campaign[key]!);
  const query = params.toString();
  return query ? `?${query}` : '';
};

/** A URL as analytics may see it: origin and path, plus the campaign labels
 * when `keepCampaign` is set. No other parameter and no fragment. */
export function scrubUrl(href: string, keepCampaign = false): string {
  try {
    const url = new URL(href);
    return `${url.origin}${url.pathname}${keepCampaign ? campaignQuery(campaignFrom(url.search)) : ''}`;
  } catch {
    return '';
  }
}

interface StoredCampaign {
  campaign: Campaign;
  savedAt: number;
}

/** The campaign of this page load, and the browser's first one (kept 30 days). */
let arrivalCampaign: Campaign = {};

/** Read the campaign from the address the visitor arrived at. Runs once, at
 * start-up, before anything takes a parameter out of the address bar. The
 * first campaign a browser saw wins; a later one does not replace it. */
export function captureCampaignFromUrl(search: string = window.location.search, now: number = Date.now()): Campaign {
  arrivalCampaign = campaignFrom(search);
  if (Object.keys(arrivalCampaign).length > 0) {
    const kept = readJSON<StoredCampaign | null>(CAMPAIGN_STORAGE_KEY, null);
    if (!kept || typeof kept.savedAt !== 'number' || now - kept.savedAt > CAMPAIGN_MAX_AGE_MS) {
      writeJSON(CAMPAIGN_STORAGE_KEY, { campaign: arrivalCampaign, savedAt: now } satisfies StoredCampaign);
    }
  }
  return arrivalCampaign;
}

/** The browser's first campaign, if it is recent enough to explain a sign-up. */
export function firstTouchCampaign(now: number = Date.now()): Campaign {
  const kept = readJSON<StoredCampaign | null>(CAMPAIGN_STORAGE_KEY, null);
  if (!kept || typeof kept.savedAt !== 'number' || now - kept.savedAt > CAMPAIGN_MAX_AGE_MS || !kept.campaign) return {};
  // Stored by an older build or edited by hand: checked again like a URL.
  return campaignFrom(campaignQuery(kept.campaign as Campaign));
}

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

/** Load + init PostHog once (no-op without a key, or if already loading). */
export function initAnalytics(): void {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
  if (!key || loading) return;
  captureCampaignFromUrl();
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
        autocapture: false,
        disable_session_recording: true,
        capture_dead_clicks: false,
        // A fragment can carry a token (a cancel confirmation, an OAuth
        // return); PostHog leaves it out of the URLs it records itself.
        disable_capture_url_hashes: true,
        before_send: (event) => scrubEvent(event),
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

let firstPageview = true;

/** Record a SPA pageview on route change. The first one of a page load keeps
 * the campaign labels it arrived with, in the URL and as properties, so a
 * click from a social post is attributed; later ones carry the path alone. */
export function capturePageview(path: string): void {
  const campaign = firstPageview ? arrivalCampaign : {};
  firstPageview = false;
  void ready().then((ph) =>
    ph?.capture('$pageview', { $current_url: window.location.origin + path + campaignQuery(campaign), ...campaign }),
  );
}

/** Tie subsequent events to a signed-in user (call on auth). The browser's
 * first campaign becomes the person's initial one: set once, never replaced. */
export function identifyUser(id: string, properties?: Record<string, unknown>): void {
  const campaign = firstTouchCampaign();
  void ready().then((ph) => ph?.identify(id, properties, Object.keys(campaign).length > 0 ? campaign : undefined));
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

/** Activation events carry only catalogue identifiers, never code or answers. */
export type ActivationEvent = 'landing_sample_completed' | 'learning_cta_clicked';
export interface ActivationProperties {
  product: string;
  locale: 'en' | 'cs';
  source: 'home' | 'topic_guide';
  category?: string;
}
export function captureActivation(event: ActivationEvent, properties: ActivationProperties): void {
  const { product, locale, source, category } = properties;
  capture(event, { product, locale, source, ...(category ? { category } : {}) });
}
