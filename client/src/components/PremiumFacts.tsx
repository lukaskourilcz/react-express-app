// What /premium states before anyone pays: the prices with VAT, the renewal,
// the waiver sentence and the refund, plus the list of what Premium opens.
//
// Pure on purpose. The live page renders these with the app's translator and
// router links; the build (vite.config.ts) renders the same components with the
// English dictionary into the static HTML of /premium and /premium/cancel, so a
// crawler or a visitor without JavaScript reads the same terms. Nothing here
// may reach for a hook, the router or the network.
import type { ReactNode } from 'react';
import type { TranslationKey } from '../i18n/translations';
import { FREE_LEARN_LEVELS, PREMIUM_PRICE } from '../../../shared/tiers';
import { SUBJECT_SCOPE_CATALOG } from '../../../shared/subject-catalog';

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;
/** Renders one link: a router link in the app, a plain anchor in static HTML. */
export type RenderLink = (to: string, label: string) => ReactNode;

/** Every placeholder the Premium copy uses, from the registries. */
export function premiumVars() {
  const reactFree = FREE_LEARN_LEVELS.react ?? 0;
  return {
    topics: SUBJECT_SCOPE_CATALOG.webdev.topics.length,
    level: reactFree + 1,
    freeLevel: reactFree,
    symbol: PREMIUM_PRICE.symbol,
    monthly: PREMIUM_PRICE.monthly,
    annual: PREMIUM_PRICE.annual,
  };
}

/** The upgrade sheet's list, reused so the two can never describe different plans. */
export const PREMIUM_INCLUDES = [
  'premium.sheet.include1',
  'premium.sheet.include2',
  'premium.sheet.include3',
  'premium.sheet.include4',
  'premium.sheet.include5',
  'premium.sheet.include6',
] as const satisfies readonly TranslationKey[];

export function PremiumIncludes({ t, headingId }: { t: Translate; headingId: string }) {
  const vars = premiumVars();
  return (
    <section className="ss-premium-includes" aria-labelledby={headingId}>
      <h2 id={headingId} className="ss-premium-section-title">{t('premium.sheet.includesTitle')}</h2>
      <ul className="ss-premium-list">
        {PREMIUM_INCLUDES.map((key) => <li key={key}>{t(key, vars)}</li>)}
      </ul>
    </section>
  );
}

/** Auto-renewal, VAT, the waiver and the refund, next to the plan buttons. */
export function PremiumSmallPrint({ t, link, headingId }: { t: Translate; link: RenderLink; headingId: string }) {
  return (
    <div className="ss-premium-smallprint" role="group" aria-labelledby={headingId}>
      <h3 id={headingId}>{t('premium.page.smallPrintTitle')}</h3>
      <ul>
        <li>{t('premium.page.smallPrint.price')}</li>
        <li>{t('premium.page.smallPrint.renewal')}</li>
        <li>
          {t('premium.page.smallPrint.waiver')} <q>{t('premium.page.waiver')}</q>{' '}
          {t('premium.page.smallPrint.refund')}
        </li>
      </ul>
      <p className="ss-text-links">
        {link('/terms', t('premium.page.termsLink'))}
        {link('/premium/cancel', t('premium.page.cancelLink'))}
      </p>
    </div>
  );
}

const anchor: RenderLink = (to, label) => <a key={to} href={to}>{label}</a>;

/** The static /premium: what the build writes into premium/index.html. */
export function PremiumStaticArticle({ t }: { t: Translate }) {
  const vars = premiumVars();
  return (
    <article className="ss-info-page ss-premium-page">
      <header className="ss-info-page__header">
        <span className="ss-info-page__kicker">{t('billing.kicker')}</span>
        <h1>{t('premium.page.title', vars)}</h1>
        <p>{t('premium.page.lead')}</p>
      </header>
      <section className="ss-premium-plans" aria-labelledby="premium-plans">
        <h2 id="premium-plans" className="ss-premium-section-title">{t('premium.page.plansTitle')}</h2>
        <ul className="ss-premium-list">
          <li>{t('premium.page.monthlyName')}: {vars.symbol}{vars.monthly} {t('premium.page.perMonth')}. {t('premium.page.monthlyRenews')}</li>
          <li>{t('premium.page.annualName')}: {vars.symbol}{vars.annual} {t('premium.page.perYear')}. {t('premium.page.annualSaving')}. {t('premium.page.annualRenews')}</li>
        </ul>
        <PremiumSmallPrint t={t} link={anchor} headingId="premium-small-print" />
      </section>
      <PremiumIncludes t={t} headingId="premium-includes" />
    </article>
  );
}

/** The static /premium/cancel: the heading and the two options, so the page
 * says what it does before the form loads. */
export function PremiumCancelStaticArticle({ t }: { t: Translate }) {
  return (
    <article className="ss-info-page">
      <header className="ss-info-page__header">
        <span className="ss-info-page__kicker">{t('billing.kicker')}</span>
        <h1>{t('billing.cancel.title')}</h1>
        <p>{t('billing.cancel.lead')}</p>
      </header>
      <ul className="ss-premium-list">
        <li>{t('billing.cancel.optionCancel')}: {t('billing.cancel.optionCancelBody')}</li>
        <li>{t('billing.cancel.optionWithdraw')}: {t('billing.cancel.optionWithdrawBody')}</li>
      </ul>
    </article>
  );
}
