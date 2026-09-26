// "Have a voucher?" on /premium (migration 045). While Stripe is switched off
// this is how Premium opens, so the page leads with it; with billing on it
// sits after the plans.
//
//   auth loading   a skeleton line, never a sign-in prompt that flashes away
//   signed out     sign in first, then come back here
//   signed in      one field and one button
//   refused        under the field: an unknown, expired, used-up or revoked
//                  code (one answer), or a voucher this account redeemed
//                  already; in a banner: too many attempts, offline, vouchers
//                  unavailable, or any other failure
//   redeemed       the end date or "no end date", and the plan refreshes in
//                  place: the page, the locks and the Profile read Premium
//                  without a reload
//
// The server decides everything; a code that cannot exist is refused here
// with the server's own answer so it costs no attempt.
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { entitlementKeys } from '../lib/entitlement';
import { redeemVoucher, voucherLooksValid, voucherRefusal, VOUCHER_PATH, VOUCHER_SECTION_ID, type VoucherRefusal } from '../lib/voucher';

type Step =
  | { kind: 'form'; refusal?: VoucherRefusal }
  | { kind: 'done'; validUntil: string | null };

/** Refusals shown under the field, because the code itself is the problem. */
const FIELD_REFUSALS: Partial<Record<VoucherRefusal, TranslationKey>> = {
  empty: 'premium.voucher.empty',
  invalid: 'premium.voucher.invalid',
  already: 'premium.voucher.already',
};
/** Refusals shown in a banner, because trying the same code later may work. */
const BANNER_REFUSALS: Partial<Record<VoucherRefusal, TranslationKey>> = {
  'rate-limited': 'premium.voucher.rateLimited',
  offline: 'premium.voucher.offline',
  unavailable: 'premium.voucher.unavailable',
  failed: 'premium.voucher.failed',
  'signed-out': 'error.signIn',
};

export default function PremiumVoucher({ billingClosed }: { billingClosed: boolean }) {
  const { t, lang } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const headingId = useId();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [busy, setBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);

  // A code is not a word: no spellcheck, no autofill, capitals on a phone.
  const inputRef = useCallback((element: HTMLInputElement | null) => {
    input.current = element;
    if (!element) return;
    element.autocomplete = 'off';
    element.spellcheck = false;
    element.setAttribute('autocapitalize', 'characters');
  }, []);

  // Arriving from the upgrade sheet (/premium#voucher), or back from sign-in:
  // bring the section into view and put the caret in the field.
  const wantsFocus = location.hash === `#${VOUCHER_SECTION_ID}`;
  useEffect(() => {
    if (!wantsFocus || authLoading) return;
    section.current?.scrollIntoView?.({ block: 'start' });
    if (isAuthenticated) input.current?.focus();
  }, [wantsFocus, authLoading, isAuthenticated]);

  useEffect(() => {
    if (step.kind === 'done') doneHeading.current?.focus();
  }, [step.kind]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (code.trim() === '' || !voucherLooksValid(code)) {
      setStep({ kind: 'form', refusal: code.trim() === '' ? 'empty' : 'invalid' });
      input.current?.focus();
      return;
    }
    setBusy(true);
    setStep({ kind: 'form' });
    try {
      const result = await redeemVoucher(code);
      setCode('');
      setStep({ kind: 'done', validUntil: result.validUntil });
      // The plan changed on the server: every screen that reads it (this
      // page's "Your plan", the locks, the Profile) refetches now.
      void queryClient.invalidateQueries({ queryKey: user ? entitlementKeys.user(user.id) : entitlementKeys.all });
    } catch (error) {
      const refused = voucherRefusal(error);
      setStep({ kind: 'form', refusal: refused });
      // The code itself was the problem: back to the field to correct it.
      if (FIELD_REFUSALS[refused]) input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const signIn = () => {
    setSignInError(null);
    void signInWithGoogle(VOUCHER_PATH).catch((error) => setSignInError(friendlyError(error)));
  };

  const refusal = step.kind === 'form' ? step.refusal : undefined;
  const fieldMessage = refusal && FIELD_REFUSALS[refusal] ? t(FIELD_REFUSALS[refusal]!) : null;
  const bannerMessage = refusal && BANNER_REFUSALS[refusal] ? t(BANNER_REFUSALS[refusal]!) : null;
  const longDate = (iso: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'long' }).format(new Date(iso));

  return (
    <section
      id={VOUCHER_SECTION_ID}
      ref={section}
      className="ss-info-card ss-premium-voucher"
      aria-labelledby={headingId}
      aria-busy={authLoading || busy || undefined}
    >
      <h2 id={headingId} className="ss-premium-section-title">{t('premium.voucher.title')}</h2>

      {step.kind === 'done' ? (
        <div className="ss-premium-voucher__done" role="status">
          <h3 ref={doneHeading} tabIndex={-1}>{t('premium.voucher.doneTitle')}</h3>
          <p className="ss-premium-voucher__end">
            {step.validUntil ? t('premium.voucher.doneUntil', { date: longDate(step.validUntil) }) : t('premium.voucher.doneNoEnd')}
          </p>
          <p>{t('billing.success.doneBody')}</p>
          <div className="ss-info-actions">
            <Button variant="primary" label={t('billing.success.openMap')} onClick={() => navigate('/learn')} />
            <Button variant="secondary" label={t('billing.success.seePlan')} onClick={() => navigate('/profile')} />
          </div>
        </div>
      ) : (
        <>
          <p>{t(billingClosed ? 'premium.voucher.leadClosed' : 'premium.voucher.lead')}</p>
          {authLoading ? (
            <span role="status" className="ss-premium-voucher__loading">
              <Skeleton width={220} height={14} radius={2} />
              <span className="ss-premium-voucher__sr">{t('premium.voucher.loading')}</span>
            </span>
          ) : !isAuthenticated ? (
            <>
              <p className="ss-premium-note">{t('premium.voucher.signedOut')}</p>
              <div className="ss-info-actions">
                <Button variant="primary" label={t('premium.voucher.signIn')} onClick={signIn} />
              </div>
              {signInError && <Banner status="error" title={signInError} />}
            </>
          ) : (
            <form className="ss-premium-voucher__form" noValidate onSubmit={(event) => void submit(event)}>
              <TextInput
                ref={inputRef}
                label={t('premium.voucher.label')}
                description={t('premium.voucher.hint')}
                value={code}
                onChange={(value) => {
                  setCode(value.slice(0, 64));
                  if (refusal) setStep({ kind: 'form' });
                }}
                status={fieldMessage ? { type: 'error', message: fieldMessage } : undefined}
                htmlName="voucher"
                isRequired
              />
              {bannerMessage && <Banner status="error" title={bannerMessage} />}
              <div className="ss-info-actions">
                <Button type="submit" variant="primary" label={t('premium.voucher.submit')} isLoading={busy} isDisabled={busy} />
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
