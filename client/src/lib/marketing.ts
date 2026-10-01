// Marketing tags: Google Analytics 4 and the Meta Pixel (owner decision 2).
//
// NOT CONNECTED. No script, measurement ID or pixel ID ships today, and with
// no loader registered `installMarketing()` does nothing: no `dataLayer`, no
// `gtag`, no request, no storage. This file is the one place the tags will
// go, so they start under the visitor's `marketing` consent and nothing else.
//
// To connect one (NEEDED.md lists what the owner provides):
//   1. Add its loader to MARKETING_LOADERS below. `load()` injects the tag's
//      script (gtag.js with the GA4 measurement ID, or fbevents.js with the
//      pixel ID); `unload()` stops it and removes its cookies (`_ga`,
//      `_ga_<id>`, `_fbp`, `_fbc`) the way clearAnalyticsStorage removes
//      PostHog's.
//   2. Add the tag's hosts to the CSP in vercel.json (script-src, connect-src,
//      img-src) and to the checks in scripts/check-security.mjs.
//   3. Raise CONSENT_VERSION in lib/consent.ts and update the privacy
//      policy's marketing section and cookie table, so every visitor is asked
//      again about tags that now run.
//
// Google Consent Mode v2: the first command on the dataLayer, before any
// Google tag can read it, sets all four signals to "denied". A yes to
// marketing grants all four; a no, or a withdrawal, denies them again. GA4
// sits under marketing (not analytics, which is PostHog), so
// `analytics_storage` follows the marketing choice too.

import { getConsent, subscribeConsent, type ConsentRecord } from './consent';

type ConsentSignal = 'granted' | 'denied';

export interface ConsentModeSignals {
  ad_storage: ConsentSignal;
  analytics_storage: ConsentSignal;
  ad_user_data: ConsentSignal;
  ad_personalization: ConsentSignal;
}

export const CONSENT_MODE_DEFAULTS: Readonly<ConsentModeSignals> = Object.freeze({
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});

/** The Consent Mode signals a choice gives. */
export function consentModeFor(record: ConsentRecord | null): ConsentModeSignals {
  const signal: ConsentSignal = record?.marketing === true ? 'granted' : 'denied';
  return { ad_storage: signal, analytics_storage: signal, ad_user_data: signal, ad_personalization: signal };
}

/** One marketing tag. `load` runs after a yes to marketing, `unload` after a
 * withdrawal; neither runs for a visitor who never said yes. */
export interface MarketingLoader {
  id: 'ga4' | 'meta-pixel';
  load: () => void;
  unload: () => void;
}

/** The connected tags. Empty until the owner provides the IDs: the GA4 and
 * Meta Pixel loaders go here. */
const MARKETING_LOADERS: readonly MarketingLoader[] = [];

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** gtag's own shape: it pushes the `arguments` object, which Google's tag
 * reads differently from an array. */
function gtag(..._args: unknown[]): void {
  (window.dataLayer ??= []).push(arguments);
}

/** Wire the connected marketing tags to the visitor's consent. Returns the
 * teardown. With no tag connected it does nothing at all. */
export function installMarketing(loaders: readonly MarketingLoader[] = MARKETING_LOADERS): () => void {
  if (loaders.length === 0 || typeof window === 'undefined') return () => {};
  gtag('consent', 'default', { ...CONSENT_MODE_DEFAULTS, wait_for_update: 500 });
  let loaded = false;
  const apply = (record: ConsentRecord | null) => {
    const signals = consentModeFor(record);
    gtag('consent', 'update', signals);
    if (record?.marketing === true && !loaded) {
      loaded = true;
      for (const loader of loaders) loader.load();
    } else if (record?.marketing !== true && loaded) {
      loaded = false;
      for (const loader of loaders) loader.unload();
    }
  };
  const current = getConsent();
  if (current?.marketing === true) apply(current);
  return subscribeConsent(apply);
}
