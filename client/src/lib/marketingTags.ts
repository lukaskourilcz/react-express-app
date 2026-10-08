// The marketing tags devShark runs: Google Analytics 4 and the Meta Pixel,
// once connected (owner decision 2). Both lists below are empty today, so no
// script, measurement ID or pixel ID ships, and main.tsx never loads
// lib/marketing.ts, which starts the tags under the visitor's marketing
// consent with Google Consent Mode v2. lib/marketing.ts says how to connect one.

/** One marketing tag. `load` runs after a yes to marketing, `unload` after a
 * withdrawal; neither runs for a visitor who never said yes. */
export interface MarketingLoader {
  id: 'ga4' | 'meta-pixel';
  load: () => void;
  unload: () => void;
}

/** The connected tags. The GA4 and Meta Pixel loaders go here. */
export const MARKETING_LOADERS: readonly MarketingLoader[] = [];
