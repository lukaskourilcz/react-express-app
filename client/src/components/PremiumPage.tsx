// /premium (#222): what Premium costs, what it opens, and how to buy, cancel
// or withdraw. Section 4.2 of the second handoff.
//
//   signed out           the plan buttons sign in with Google and come back here
//   signed in, free      the plan buttons open Stripe Checkout
//   paying subscriber    "Your plan" with the plan line and Manage billing; no
//                        second checkout
//   complimentary grant  "Your plan" says so; buying stays possible
//   billing switched off one "Premium opens soon" line instead of buttons
//
// No urgency copy, no countdowns and no scarcity. The price always carries
// "VAT included", and the renewal, the waiver sentence and the refund sit next
// to the buttons, before anyone pays. The server decides every plan; this page
// only reads it.
import { useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { useBilling, type BillingPlan } from '../lib/billing';
import { useEntitlement } from '../lib/entitlement';
import { capture } from '../lib/analytics';
import { CURRENT_PRODUCT } from '../lib/products';
import { Page } from './PublicInfoPages';
import PlanLine from './PlanLine';
import PremiumCheckoutButton from './PremiumCheckoutButton';
import ComparisonTable from './landing/ComparisonTable';
import { PremiumIncludes, PremiumSmallPrint, premiumVars, type RenderLink } from './PremiumFacts';
import './DeepEndScreens.css';
import './PremiumPage.css';

const FAQ: readonly { q: TranslationKey; a: TranslationKey; link?: { to: string; label: TranslationKey } }[] = [
  { q: 'premium.page.faq.cancelQ', a: 'premium.page.faq.cancelA', link: { to: '/premium/cancel', label: 'legal.link.cancel' } },
  { q: 'premium.page.faq.progressQ', a: 'premium.page.faq.progressA' },
  { q: 'premium.page.faq.invoiceQ', a: 'premium.page.faq.invoiceA' },
  { q: 'premium.page.faq.refundQ', a: 'premium.page.faq.refundA', link: { to: '/premium/cancel?action=withdraw', label: 'legal.link.cancel' } },
  { q: 'premium.page.faq.switchQ', a: 'premium.page.faq.switchA' },
  { q: 'premium.page.faq.dataQ', a: 'premium.page.faq.dataA', link: { to: '/privacy', label: 'legal.link.privacy' } },
];

const routerLink: RenderLink = (to, label) => <Link key={to} to={to}>{label}</Link>;

function PlanCard({ plan, showAction }: { plan: BillingPlan; showAction: boolean }) {
  const { t } = useLanguage();
  const id = useId();
  const vars = premiumVars();
  const annual = plan === 'annual';
  return (
    <article className="ss-info-card ss-premium-plan" aria-labelledby={id} data-plan={plan}>
      <h3 id={id}>{t(annual ? 'premium.page.annualName' : 'premium.page.monthlyName')}</h3>
      <p className="ss-premium-plan__price">
        <strong>{vars.symbol}{annual ? vars.annual : vars.monthly}</strong>{' '}
        <span>{t(annual ? 'premium.page.perYear' : 'premium.page.perMonth')}</span>
      </p>
      {annual && <p className="ss-premium-plan__saving">{t('premium.page.annualSaving')}</p>}
      <p className="ss-premium-plan__terms">{t(annual ? 'premium.page.annualRenews' : 'premium.page.monthlyRenews')}</p>
      {showAction && (
        <div className="ss-premium-plan__action">
          <PremiumCheckoutButton plan={plan} />
        </div>
      )}
    </article>
  );
}

export default function PremiumPage() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const billing = useBilling();
  const plan = useEntitlement();
  const vars = premiumVars();
  const ids = { plans: useId(), smallPrint: useId(), includes: useId(), faq: useId(), current: useId() };

  useEffect(() => capture('premium_page_viewed', { product: CURRENT_PRODUCT.id }), []);

  const premium = plan.signedIn && plan.tier === 'premium' && !!plan.data;
  // A paying subscriber manages the plan they have; a second checkout would
  // charge twice, and the server refuses it anyway.
  const paying = premium && plan.data?.source === 'provider';
  const closed = billing.known && !billing.enabled;

  return (
    <Page kicker={t('billing.kicker')} title={t('premium.page.title', vars)} lead={t('premium.page.lead')}>
      <div className="ss-premium-page">
        {premium && (
          <section className="ss-info-card ss-premium-current" aria-labelledby={ids.current}>
            <h2 id={ids.current} className="ss-premium-section-title">{t('premium.page.yourPlan')}</h2>
            <PlanLine />
          </section>
        )}

        <section className="ss-premium-plans" aria-labelledby={ids.plans}>
          <h2 id={ids.plans} className="ss-premium-section-title">{t('premium.page.plansTitle')}</h2>
          <div className="ss-premium-plan-grid">
            <PlanCard plan="monthly" showAction={!paying && !closed} />
            <PlanCard plan="annual" showAction={!paying && !closed} />
          </div>
          {closed && <p className="ss-info-note" role="status">{t('billing.checkout.soon')}</p>}
          {!closed && !authLoading && !isAuthenticated && <p className="ss-premium-note">{t('premium.page.signedOut')}</p>}
          <PremiumSmallPrint t={t} link={routerLink} headingId={ids.smallPrint} />
        </section>

        <PremiumIncludes t={t} headingId={ids.includes} />

        <ComparisonTable showCta={false} />

        <section className="ss-premium-faq" aria-labelledby={ids.faq}>
          <h2 id={ids.faq} className="ss-premium-section-title">{t('premium.page.faqTitle')}</h2>
          <div className="ss-premium-faq__list">
            {FAQ.map((item) => (
              <details key={item.q} className="ss-premium-faq__item">
                <summary>{t(item.q)}</summary>
                <p>{t(item.a)}</p>
                {item.link && <p className="ss-text-links">{routerLink(item.link.to, t(item.link.label))}</p>}
              </details>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
