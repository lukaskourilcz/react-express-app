// The launch price on the pages that sell Premium (shared/launch-offer.ts):
// /premium, the plan table, the upgrade sheet and the expired-checkout line.
// Rendered only while useLaunchOffer() returns the offer; otherwise every
// caller draws exactly what it drew before.
//
// Framing: an introductory launch price, not a reduction from an earlier
// price. The regular price is struck through only next to the line that says
// it is the regular price from 3 November 2026, and no "lowest price in the
// last 30 days" line appears, because Premium was never sold before.
//
// No countdown and no scarcity: the end date is stated once, as a date.
import { useId, type ReactNode } from 'react';
import { useLaunchAnnouncement } from '../lib/launchOffer';
import { useT } from '../i18n/LanguageContext';
import type { LaunchOfferDisplay } from '../../../shared/launch-offer';
import { premiumVars } from './PremiumFacts';

/** One amount: the launch price, with the regular price struck through.
 * Screen readers hear one sentence ("€1.80 launch price; the regular price
 * from 3 Nov 2026 is €3.99") instead of two bare numbers, so the visual pair
 * is hidden from them. */
export function OfferAmount({ offer, plan }: { offer: LaunchOfferDisplay; plan: 'monthly' | 'annual' }) {
  const t = useT();
  const now = `${offer.symbol}${plan === 'annual' ? offer.offerAnnual : offer.offerMonthly}`;
  const was = `${offer.symbol}${plan === 'annual' ? offer.annual : offer.monthly}`;
  return (
    <span className="ss-offer-amount" data-plan={plan}>
      <span className="ss-sr-only">{t('premium.offer.srPrice', { now, was, regularFrom: offer.regularFrom })}</span>
      <span aria-hidden="true">
        <s className="ss-offer-amount__regular">{was}</s>{' '}
        <strong>{now}</strong>
      </span>
    </span>
  );
}

/** Replace `{monthlyPrice}` and `{annualPrice}` in a translated sentence with
 * the struck amounts. */
function withAmounts(sentence: string, offer: LaunchOfferDisplay): ReactNode[] {
  return sentence.split(/(\{monthlyPrice\}|\{annualPrice\})/).map((part, index) => {
    if (part === '{monthlyPrice}') return <OfferAmount key={index} offer={offer} plan="monthly" />;
    if (part === '{annualPrice}') return <OfferAmount key={index} offer={offer} plan="annual" />;
    return part;
  });
}

/** The monthly caption of the plan table: "€3.99 a month, VAT included", or
 * the launch price with the regular one struck through. */
export function PremiumMonthlyCaption({ offer }: { offer: LaunchOfferDisplay | null }) {
  const t = useT();
  if (!offer) return <>{t('landing.compare.premiumCaption', premiumVars())}</>;
  return <>{withAmounts(t('landing.compare.premiumCaptionOffer'), offer)}</>;
}

/** "€3.99 a month or €39.99 a year, VAT included. Cancel any time.", or the
 * same sentence with the launch prices. */
export function PremiumPriceSentence({ offer }: { offer: LaunchOfferDisplay | null }) {
  const t = useT();
  if (!offer) return <>{t('premium.sheet.price', premiumVars())}</>;
  return <>{withAmounts(t('premium.offer.price'), offer)}</>;
}

/** What the launch price is and what it is not: the price, the regular price
 * and the day it applies from, the lifetime of the subscription and the end
 * of the offer. Every place that shows the launch price shows this too. */
export function LaunchOfferNote({ offer, compact = false }: { offer: LaunchOfferDisplay; compact?: boolean }) {
  const t = useT();
  const id = useId();
  return (
    <div className={`ss-offer-note${compact ? ' ss-offer-note--compact' : ''}`} role="group" aria-labelledby={id} data-offer="launch-55">
      <p id={id} className="ss-offer-note__title">{t('premium.offer.title', offer)}</p>
      <ul>
        <li>{t('premium.offer.regular', offer)}</li>
        <li>{t('premium.offer.lifetime')}</li>
        <li>{t('premium.offer.ends', offer)}</li>
      </ul>
    </div>
  );
}

/** Announce the October launch; advertise a current offer only when the
 * server confirms that Checkout applies it. Never hide the homepage behind it. */
export function LaunchOfferBanner() {
  const t = useT();
  const announcement = useLaunchAnnouncement();
  const id = useId();
  if (!announcement) return null;
  const { offer } = announcement;
  return (
    <aside className="ss-launch-banner" aria-labelledby={id}>
      <div className="ss-launch-banner__copy">
        <h2 id={id}>{t('home.offer.title', offer)}</h2>
        <p>{t('home.offer.price', offer)}</p>
        <p className="ss-launch-banner__terms">{t('home.offer.terms', offer)}</p>
      </div>
    </aside>
  );
}
