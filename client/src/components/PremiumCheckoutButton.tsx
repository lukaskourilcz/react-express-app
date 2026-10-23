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
import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { useLanguage } from '../i18n/LanguageContext';
import { friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { openSignIn } from '../lib/signInDialog';
import { openBillingPortal, useBilling, type BillingPlan } from '../lib/billing';
import { useEntitlement } from '../lib/entitlement';
import { useClearOnPageRestore } from '../lib/pageRestore';

export default function PremiumCheckoutButton({ plan }: { plan: BillingPlan }) {
  const { t } = useLanguage();
  const billing = useBilling();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const entitlement = useEntitlement();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A second press can land before `busy` disables the button; it must not
  // open a second portal session.
  const leaving = useRef(false);
  // Back from Stripe can bring this page back from the cache busy.
  useClearOnPageRestore(useCallback((value: boolean) => { leaving.current = value; setBusy(value); }, []));

  const run = async (action: () => Promise<void>) => {
    if (leaving.current) return;
    leaving.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
      leaving.current = false;
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
  // Signed out, the press opens the sign-in dialog, which comes back to this
  // page; signed in, it leaves for Stripe and stays busy until it does.
  const press = !isAuthenticated
    ? () => openSignIn({ returnTo: location.pathname + location.search })
    : paying ? () => void run(openBillingPortal) : () => navigate(`/premium/checkout?plan=${plan}`);

  return (
    <>
      <Button
        variant={paying ? 'secondary' : 'primary'}
        label={label}
        onClick={press}
        isLoading={busy || waiting}
        isDisabled={busy || waiting}
      />
      {error && <p className="ss-premium-note" role="alert">{error}</p>}
    </>
  );
}
