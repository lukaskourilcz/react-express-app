// The plan line on the Profile: which plan the account holds, in one line.
//
//   Free                                   + "See what Premium includes"
//   Premium, renews 12 Nov                   a subscription
//   Premium until 12 Nov (cancelled)         cancelled at period end
//   Premium. Payment failed, update your card.   inside the grace window
//   Premium, complimentary until 12 Nov      a manual grant
//   Premium from a voucher, until 12 Nov     a promo grant, which a voucher
//                                            opens (migration 045)
//
// Loading shows a skeleton rather than "Free", so a Premium account never
// reads as free for a moment. A failure says so and offers a retry. An
// account with a billing customer gets "Manage billing", which opens Stripe's
// Customer Portal (card, invoices, plan switch, cancel at period end), whichever
// grant wins the line: a complimentary grant longer than the subscription
// under it, or a subscription that has ended and left its invoices.
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Text } from '@astryxdesign/core/Text';
import { useLanguage } from '../i18n/LanguageContext';
import { useEntitlement } from '../lib/entitlement';
import { openUpgradeSheet } from '../lib/upgradeSheet';
import { openBillingPortal, useBilling } from '../lib/billing';
import { friendlyError } from '../lib/api';
import { FREE_LEARN_LEVELS, type EntitlementResponse } from '../../../shared/tiers';

function formatDay(iso: string, lang: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, {
    day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

type T = ReturnType<typeof useLanguage>['t'];

export function planText(plan: EntitlementResponse, t: T, lang: string): string {
  if (plan.tier !== 'premium') return t('profile.plan.free');
  if (plan.source === 'provider') {
    if (plan.inGrace) return t('profile.plan.grace');
    if (plan.currentPeriodEnd) {
      const date = formatDay(plan.currentPeriodEnd, lang);
      return plan.cancelAtPeriodEnd ? t('profile.plan.cancelled', { date }) : t('profile.plan.renews', { date });
    }
    return t('profile.plan.premium');
  }
  if (plan.source === 'promo') {
    return plan.validUntil
      ? t('profile.plan.voucherUntil', { date: formatDay(plan.validUntil, lang) })
      : t('profile.plan.voucher');
  }
  return plan.validUntil
    ? t('profile.plan.complimentaryUntil', { date: formatDay(plan.validUntil, lang) })
    : t('profile.plan.complimentary');
}

function ManageBilling() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await openBillingPortal();
    } catch (err) {
      setError(friendlyError(err) || t('profile.plan.manageFailed'));
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="secondary" size="sm" label={t('profile.plan.manage')} onClick={() => void open()} isLoading={busy} isDisabled={busy} />
      {error && <Text type="supporting" color="secondary"><span role="alert">{error}</span></Text>}
    </>
  );
}

export default function PlanLine() {
  const { t, lang } = useLanguage();
  const { tier, data, loading, failed, refetch, signedIn } = useEntitlement();
  const { cancellable } = useBilling();
  if (!signedIn) return null;
  const labelId = 'profile-plan-label';
  return (
    <div className="de-plan-line" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="ss-premium-label">{t('profile.plan.title')}</span>
      {loading ? (
        <span role="status" className="de-plan-line__loading">
          <Skeleton width={150} height={14} radius={2} />
          <span className="de-plan-line__sr">{t('profile.plan.loading')}</span>
        </span>
      ) : failed || !tier ? (
        <>
          <Text type="supporting" color="secondary">{t('profile.plan.failed')}</Text>
          <Button variant="ghost" size="sm" label={t('profile.plan.retry')} onClick={refetch} />
        </>
      ) : tier === 'free' ? (
        <>
          <Text type="supporting" weight="semibold">{t('profile.plan.free')}</Text>
          <Text type="supporting" color="secondary">{t('profile.plan.freeBody', { level: FREE_LEARN_LEVELS.react ?? 0 })}</Text>
          <Button variant="ghost" size="sm" label={t('profile.plan.see')} onClick={() => openUpgradeSheet()} />
          {cancellable && data?.billingAccount === true && <ManageBilling />}
        </>
      ) : (
        <>
          <Text type="supporting" weight="semibold">{planText(data!, t, lang)}</Text>
          <Text type="supporting" color="secondary">{t('profile.plan.premiumBody')}</Text>
          {cancellable && (data?.billingAccount === true || data?.source === 'provider') && <ManageBilling />}
        </>
      )}
    </div>
  );
}
