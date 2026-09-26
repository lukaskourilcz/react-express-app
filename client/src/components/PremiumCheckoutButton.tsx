// The one way into Stripe Checkout (#221), for the /premium page (#222) and
// anywhere else that sells a plan. It owns every state around the button, so
// no caller can show a checkout entry point that the server would refuse:
//
//   billing off (BILLING_ENABLED unset)   "Premium opens soon", no button
//   signed out                            sign in first, then come back here
//   a paid subscription already           "Manage billing" (the portal)
//   otherwise                             continue to Stripe for this plan
//
// The button only leads to Stripe's hosted page. The order button that
// commits to paying is Stripe's, with the wording set on the server.
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { useLanguage } from '../i18n/LanguageContext';
import { friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { openBillingPortal, startCheckout, useBilling, type BillingPlan } from '../lib/billing';
import { useEntitlement } from '../lib/entitlement';

export default function PremiumCheckoutButton({ plan }: { plan: BillingPlan }) {
  const { t } = useLanguage();
  const billing = useBilling();
  const { isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const entitlement = useEntitlement();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  if (billing.known && !billing.enabled) return <p className="ss-premium-note">{t('billing.checkout.soon')}</p>;

  const waiting = !billing.known || authLoading || (isAuthenticated && entitlement.loading);
  // A live subscription, even under a longer complimentary grant: the server
  // would refuse a second checkout, so this is the portal instead.
  const paying = entitlement.data?.subscriptionLive === true
    || (entitlement.tier === 'premium' && entitlement.data?.source === 'provider');
  const label = !isAuthenticated
    ? t('billing.checkout.signIn')
    : paying
      ? t('profile.plan.manage')
      : t(plan === 'annual' ? 'billing.checkout.annual' : 'billing.checkout.monthly');
  const action = !isAuthenticated
    ? () => signInWithGoogle(location.pathname + location.search)
    : paying ? openBillingPortal : () => startCheckout(plan);

  return (
    <>
      <Button
        variant={paying ? 'secondary' : 'primary'}
        label={label}
        onClick={() => void run(action)}
        isLoading={busy || waiting}
        isDisabled={busy || waiting}
      />
      {error && <p className="ss-premium-note" role="alert">{error}</p>}
    </>
  );
}
