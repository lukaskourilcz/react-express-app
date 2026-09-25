import { TOPIC_LANDINGS } from './topicCatalog';
import { PREMIUM_PRICE } from '../../../shared/tiers';
export const PUBLIC_ORIGIN = 'https://devshark.app';
export function topicFromPath(pathname: string) {
  const match = /^(\/cs)?\/topics\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!match) return null;
  const topic = TOPIC_LANDINGS.find(topic => topic.slug === match[2]);
  return topic ? { topic, locale: match[1] ? 'cs' as const : 'en' as const } : null;
}
export function topicSchema(title: string, description: string, url: string, locale: 'en' | 'cs') {
  return { '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description, url, inLanguage: locale, learningResourceType: 'Quick guide', isAccessibleForFree: true };
}

/** App routes with their own static HTML, canonical URL and sitemap entry
 * (#222). The build prerenders them (vite.config.ts), the app shell sets the
 * same canonical and description at runtime, and check:public reads them back
 * from the sitemap. Descriptions are translation keys, resolved by the caller. */
export const PUBLIC_PAGES = [
  { path: '/premium', titleKey: 'title.premium', descriptionKey: 'premium.page.lead', schema: 'premium' },
  { path: '/premium/cancel', titleKey: 'title.premiumCancel', descriptionKey: 'billing.cancel.lead', schema: null },
] as const;
export type PublicPage = (typeof PUBLIC_PAGES)[number];
export const publicPage = (pathname: string): PublicPage | null =>
  PUBLIC_PAGES.find((page) => page.path === pathname.replace(/(.)\/$/, '$1')) ?? null;

/** App routes that must stay out of search results: a Stripe return carries a
 * checkout id and means nothing to anyone else. */
export const NOINDEX_PATHS: readonly string[] = ['/premium/success'];

/** Structured data for /premium. The guides above stay free to read
 * (`isAccessibleForFree: true`); Premium is the paid subscription, so it says
 * `false` and lists both prices with VAT included. */
export function premiumSchema(title: string, description: string, url: string) {
  const offer = (period: 'monthly' | 'annual') => ({
    '@type': 'Offer',
    name: period === 'annual' ? 'devShark Premium, yearly' : 'devShark Premium, monthly',
    price: PREMIUM_PRICE[period],
    priceCurrency: PREMIUM_PRICE.currency,
    url,
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: PREMIUM_PRICE[period],
      priceCurrency: PREMIUM_PRICE.currency,
      valueAddedTaxIncluded: true,
      billingDuration: period === 'annual' ? 'P1Y' : 'P1M',
    },
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: title,
    description,
    url,
    inLanguage: 'en',
    learningResourceType: 'Subscription',
    isAccessibleForFree: false,
    offers: [offer('monthly'), offer('annual')],
  };
}
