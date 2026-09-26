// The two billing pages that ship with checkout (#221):
//
//   /premium/success  where Stripe sends a buyer back. It reads the plan, and
//                     when the webhook has not arrived yet it asks the server
//                     to apply the session itself, so nobody waits on it.
//   /premium/cancel   the public cancellation and withdrawal page (§ 312k BGB,
//                     the EU withdrawal button): no sign-in, the email of the
//                     subscription, then one confirmation button. The server
//                     acts once the address is proven: at once for a signed-in
//                     owner of it, otherwise when the link it emails there is
//                     opened, which lands back here with #confirm=<token>.
//
// Neither page changes a plan by itself. The server does, from the signed
// webhook, its own lookup of the session, or a proven cancellation request.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { entitlementKeys, useEntitlement } from '../lib/entitlement';
import {
  cancelLinkToken,
  confirmCancelLink,
  isCancelReceipt,
  lookupCheckout,
  looksLikeEmail,
  requestCancellation,
  reviewCancelLink,
  useBilling,
  type CancelAction,
  type CancelLink,
  type CancelPending,
  type CancelReceipt,
} from '../lib/billing';
import { PREMIUM_PRICE, type EntitlementResponse } from '../../../shared/tiers';
import { Page } from './PublicInfoPages';
import PremiumCheckoutButton from './PremiumCheckoutButton';
import { planText } from './PlanLine';
import './PremiumBillingPages.css';

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{8,240}$/;
/** How often, and how many times, the page asks again while a payment is
 * still processing. */
const RECHECK_MS = 4000;
const RECHECKS = 5;

type SuccessState =
  | { kind: 'checking' }
  | { kind: 'done'; plan: EntitlementResponse }
  | { kind: 'pending' }
  | { kind: 'expired' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

export function PremiumSuccessPage() {
  const { t, lang } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id') ?? '';
  const validSession = SESSION_ID.test(sessionId);
  const { isAuthenticated, isLoading: authLoading, signInWithGoogle, user } = useAuth();
  const plan = useEntitlement();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SuccessState>({ kind: 'checking' });
  const [signInError, setSignInError] = useState<string | null>(null);
  const rechecks = useRef(0);
  const started = useRef(false);

  const check = useCallback(async () => {
    setState({ kind: 'checking' });
    try {
      const result = await lookupCheckout(sessionId);
      if (result.entitlement.tier === 'premium') {
        if (user) queryClient.setQueryData(entitlementKeys.user(user.id), result.entitlement);
        void queryClient.invalidateQueries({ queryKey: entitlementKeys.all });
        setState({ kind: 'done', plan: result.entitlement });
        return;
      }
      setState(result.status === 'expired' ? { kind: 'expired' } : { kind: 'pending' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setState({ kind: 'missing' });
      else setState({ kind: 'error', message: friendlyError(error) });
    }
  }, [sessionId, queryClient, user]);

  // Once the account and its plan are known: a plan that is already Premium
  // (the webhook came first) needs no lookup; otherwise ask the server.
  useEffect(() => {
    if (started.current || !validSession || authLoading || !isAuthenticated || plan.loading) return;
    started.current = true;
    if (plan.tier === 'premium' && plan.data) setState({ kind: 'done', plan: plan.data });
    else void check();
  }, [validSession, authLoading, isAuthenticated, plan.loading, plan.tier, plan.data, check]);

  // A payment still processing is asked about again a few times.
  useEffect(() => {
    if (state.kind !== 'pending' || rechecks.current >= RECHECKS) return;
    const timer = window.setTimeout(() => {
      rechecks.current += 1;
      void check();
    }, RECHECK_MS);
    return () => window.clearTimeout(timer);
  }, [state, check]);

  const view: SuccessState | { kind: 'signin' } =
    !validSession ? { kind: 'missing' } : !authLoading && !isAuthenticated ? { kind: 'signin' } : state;

  const copy = {
    checking: { title: t('billing.success.checkingTitle'), lead: t('billing.success.checkingBody') },
    done: { title: t('billing.success.doneTitle'), lead: t('billing.success.doneBody') },
    pending: { title: t('billing.success.pendingTitle'), lead: t('billing.success.pendingBody') },
    expired: { title: t('billing.success.expiredTitle'), lead: t('billing.success.expiredBody') },
    missing: { title: t('billing.success.missingTitle'), lead: t('billing.success.missingBody') },
    error: { title: t('billing.success.errorTitle'), lead: t('billing.success.errorBody') },
    signin: { title: t('billing.success.signInTitle'), lead: t('billing.success.signInBody') },
  }[view.kind];

  return (
    <Page kicker={t('billing.kicker')} title={copy.title} lead={copy.lead}>
      <section className="ss-info-card ss-billing-card" aria-labelledby="billing-status-label">
        <h2 id="billing-status-label" className="ss-billing-card__label">{t('billing.success.statusLabel')}</h2>
        <div role="status" aria-live="polite" className="ss-billing-status">
          {view.kind === 'checking' && (
            <>
              <Skeleton width={220} height={14} radius={2} />
              <span>{t('billing.success.checkingStatus')}</span>
            </>
          )}
          {view.kind === 'done' && <strong>{t('billing.success.doneStatus', { plan: planText(view.plan, t, lang) })}</strong>}
          {view.kind === 'pending' && (
            // After the last automatic check nothing checks again until the
            // button is pressed, so the line stops promising that it will.
            <span>{t(rechecks.current >= RECHECKS ? 'billing.success.pendingStopped' : 'billing.success.pendingStatus')}</span>
          )}
          {view.kind === 'expired' && (
            <span>{t('billing.success.expiredStatus')} {t('premium.sheet.price', { symbol: PREMIUM_PRICE.symbol, monthly: PREMIUM_PRICE.monthly, annual: PREMIUM_PRICE.annual })}</span>
          )}
          {view.kind === 'missing' && <span>{t('billing.success.missingStatus')}</span>}
          {view.kind === 'signin' && <span>{t('billing.success.signInStatus')}</span>}
        </div>
        {view.kind === 'error' && <Banner status="error" title={view.message} />}
        {signInError && <Banner status="error" title={signInError} />}
        <div className="ss-info-actions">
          {view.kind === 'done' && (
            <>
              <Button variant="primary" label={t('billing.success.openMap')} onClick={() => navigate('/learn')} />
              <Button variant="secondary" label={t('billing.success.seePlan')} onClick={() => navigate('/profile')} />
            </>
          )}
          {(view.kind === 'pending' || view.kind === 'error') && (
            <>
              <Button variant="primary" label={t('billing.success.checkAgain')} onClick={() => { rechecks.current = 0; void check(); }} />
              <Button variant="secondary" label={t('billing.success.goProfile')} onClick={() => navigate('/profile')} />
            </>
          )}
          {view.kind === 'expired' && (
            <>
              <PremiumCheckoutButton plan="monthly" />
              <PremiumCheckoutButton plan="annual" />
            </>
          )}
          {view.kind === 'missing' && <Button variant="primary" label={t('billing.success.goProfile')} onClick={() => navigate('/profile')} />}
          {view.kind === 'signin' && (
            <Button
              variant="primary"
              label={t('auth.logIn')}
              onClick={() => {
                setSignInError(null);
                // Come back to this checkout after the Google round trip.
                void signInWithGoogle(`/premium/success?session_id=${encodeURIComponent(sessionId)}`)
                  .catch((error) => setSignInError(friendlyError(error)));
              }}
            />
          )}
        </div>
      </section>
    </Page>
  );
}

/* ── /premium/cancel ─────────────────────────────────────────────────────── */

type CancelStep =
  | { kind: 'form' }
  | { kind: 'confirm' }
  | { kind: 'sent'; answer: Extract<CancelPending, { confirmBy: 'email' }> }
  | { kind: 'signin' }
  | { kind: 'link-loading' }
  | { kind: 'link'; link: CancelLink }
  | { kind: 'link-expired' }
  | { kind: 'link-error'; message: string }
  | { kind: 'done'; receipt: CancelReceipt };

export function PremiumCancelPage() {
  const { t, lang } = useLanguage();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signInWithGoogle } = useAuth();
  // Until the settings arrive the form stays usable and the server decides;
  // it is closed only when the server says billing is not set up.
  const billing = useBilling();
  const unavailable = billing.known && !billing.cancellable;
  const [action, setAction] = useState<CancelAction>(params.get('action') === 'withdraw' ? 'withdraw' : 'cancel');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The emailed link lands here with #confirm=<token>. It is read once.
  const [token] = useState(() => cancelLinkToken(location.hash));
  const [step, setStep] = useState<CancelStep>(token ? { kind: 'link-loading' } : { kind: 'form' });
  const stepRef = useRef<HTMLElement>(null);
  const firstStep = useRef(true);

  // Each step replaces the last, so move focus to its heading. Back on the
  // form, focus goes to the email field, not to the top of the document. The
  // page's first view keeps the focus the router gave it.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      if (step.kind === 'form') return;
    }
    const target = step.kind === 'form'
      ? stepRef.current?.querySelector<HTMLElement>('input[type="email"]')
      : stepRef.current?.querySelector<HTMLElement>('h2');
    target?.focus();
  }, [step.kind]);

  // Take the token out of the address bar at once, so it stays out of the
  // history, a screenshot and every analytics event, then ask what it is for.
  useEffect(() => {
    if (!token) return;
    navigate({ pathname: location.pathname, search: location.search }, { replace: true });
    let live = true;
    reviewCancelLink(token)
      .then((link) => {
        if (!live) return;
        setAction(link.action);
        setEmail(link.email);
        setStep({ kind: 'link', link });
      })
      .catch((err) => {
        if (!live) return;
        setStep(err instanceof ApiError && (err.status === 410 || err.status === 400)
          ? { kind: 'link-expired' }
          : { kind: 'link-error', message: friendlyError(err) });
      });
    return () => { live = false; };
    // Once per token: the navigation above changes the location, not the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const withdraw = action === 'withdraw';
  const owner = isAuthenticated && typeof user?.email === 'string' && user.email.toLowerCase() === email.trim().toLowerCase();

  const submitForm = async () => {
    setError(null);
    if (!looksLikeEmail(email)) {
      setEmailError(t('error.badEmail'));
      return;
    }
    setEmailError(null);
    setBusy(true);
    try {
      await requestCancellation(email.trim(), action, 'request');
      setStep({ kind: 'confirm' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'bad_email') setEmailError(t('error.badEmail'));
      else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setBusy(true);
    try {
      const answer = await requestCancellation(email.trim(), action, 'confirm');
      if (isCancelReceipt(answer)) setStep({ kind: 'done', receipt: answer });
      else if (answer.confirmBy === 'email') setStep({ kind: 'sent', answer });
      else setStep({ kind: 'signin' });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmLink = async () => {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      setStep({ kind: 'done', receipt: await confirmCancelLink(token) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) setStep({ kind: 'link-expired' });
      else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const startAgain = () => { setError(null); setStep({ kind: 'form' }); };
  const dateTime = (iso: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));
  const date = (iso: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'long' }).format(new Date(iso));
  const effect = withdraw
    ? t('billing.cancel.confirmWithdrawBody', { email: email.trim() })
    : t('billing.cancel.confirmBody', { email: email.trim() });

  return (
    <Page kicker={t('billing.kicker')} title={t('billing.cancel.title')} lead={t('billing.cancel.lead')}>
      <section className="ss-info-card ss-billing-card" ref={stepRef}>
        {unavailable && <p className="ss-info-note">{t('billing.cancel.unavailable')}</p>}

        {step.kind === 'form' && (
          <form
            className="ss-billing-form"
            noValidate
            onSubmit={(event) => { event.preventDefault(); void submitForm(); }}
          >
            <RadioList
              label={t('billing.cancel.choiceLabel')}
              value={action}
              onChange={(value) => setAction(value === 'withdraw' ? 'withdraw' : 'cancel')}
            >
              <RadioListItem value="cancel" label={t('billing.cancel.optionCancel')} description={t('billing.cancel.optionCancelBody')} />
              <RadioListItem value="withdraw" label={t('billing.cancel.optionWithdraw')} description={t('billing.cancel.optionWithdrawBody')} />
            </RadioList>
            <TextInput
              type="email"
              htmlName="email"
              label={t('billing.cancel.emailLabel')}
              description={t('billing.cancel.emailHint')}
              value={email}
              onChange={(value) => { setEmail(value.slice(0, 254)); if (emailError) setEmailError(null); }}
              status={emailError ? { type: 'error', message: emailError } : undefined}
              isRequired
              isDisabled={unavailable}
            />
            {error && <Banner status="error" title={error} />}
            <div className="ss-info-actions">
              <Button type="submit" variant="primary" label={t('billing.cancel.continue')} isLoading={busy} isDisabled={busy || unavailable} />
            </div>
          </form>
        )}

        {step.kind === 'confirm' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{withdraw ? t('billing.cancel.confirmWithdrawTitle') : t('billing.cancel.confirmTitle')}</h2>
            <p>{effect}</p>
            <p className="ss-info-note">
              {owner
                ? t('billing.cancel.confirmOwner')
                : billing.known && !billing.cancelByEmail
                  ? t('billing.cancel.confirmSignIn')
                  : t('billing.cancel.confirmByEmail', { email: email.trim() })}
            </p>
            {error && <Banner status="error" title={error} />}
            <div className="ss-info-actions">
              <Button
                variant="destructive"
                label={withdraw ? t('billing.cancel.confirmWithdraw') : t('billing.cancel.confirmCancel')}
                onClick={() => void confirm()}
                isLoading={busy}
                isDisabled={busy}
              />
              <Button variant="secondary" label={t('billing.cancel.back')} onClick={startAgain} isDisabled={busy} />
            </div>
          </div>
        )}

        {step.kind === 'sent' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{t('billing.cancel.sentTitle')}</h2>
            <p role="status">{t('billing.cancel.sentBody', { email: step.answer.email, minutes: step.answer.expiresInMinutes })}</p>
            <p>{t('billing.cancel.receivedAt', { date: dateTime(step.answer.receivedAt), email: step.answer.email })}</p>
            <p className="ss-info-note">{t('billing.cancel.sentNote')}</p>
            <p className="ss-info-note">{t('billing.cancel.keep')}</p>
            <div className="ss-info-actions">
              <Button variant="secondary" label={t('billing.cancel.back')} onClick={startAgain} />
            </div>
          </div>
        )}

        {step.kind === 'signin' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{t('billing.cancel.signInTitle')}</h2>
            <p>{t('billing.cancel.signInBody', { email: email.trim() })}</p>
            {error && <Banner status="error" title={error} />}
            <div className="ss-info-actions">
              <Button
                variant="primary"
                label={t('auth.logIn')}
                onClick={() => {
                  setError(null);
                  void signInWithGoogle(`/premium/cancel?action=${action}`).catch((err) => setError(friendlyError(err)));
                }}
              />
              <Button variant="secondary" label={t('billing.cancel.back')} onClick={startAgain} />
            </div>
          </div>
        )}

        {step.kind === 'link-loading' && (
          <div className="ss-billing-confirm" role="status" aria-live="polite">
            <h2 tabIndex={-1}>{t('billing.cancel.linkLoading')}</h2>
            <Skeleton width={220} height={14} radius={2} />
          </div>
        )}

        {step.kind === 'link' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{withdraw ? t('billing.cancel.confirmWithdrawTitle') : t('billing.cancel.confirmTitle')}</h2>
            <p>{t('billing.cancel.linkRequested', { date: dateTime(step.link.requestedAt), email: step.link.email })}</p>
            <p>{effect}</p>
            {error && <Banner status="error" title={error} />}
            <div className="ss-info-actions">
              <Button
                variant="destructive"
                label={withdraw ? t('billing.cancel.confirmWithdraw') : t('billing.cancel.confirmCancel')}
                onClick={() => void confirmLink()}
                isLoading={busy}
                isDisabled={busy}
              />
              <Button variant="secondary" label={t('billing.cancel.keepSubscription')} onClick={() => navigate('/')} isDisabled={busy} />
            </div>
          </div>
        )}

        {step.kind === 'link-expired' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{t('billing.cancel.linkExpiredTitle')}</h2>
            <p>{t('billing.cancel.linkExpiredBody')}</p>
            <div className="ss-info-actions">
              <Button variant="primary" label={t('billing.cancel.startAgain')} onClick={startAgain} />
            </div>
          </div>
        )}

        {step.kind === 'link-error' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{t('billing.cancel.linkErrorTitle')}</h2>
            <Banner status="error" title={step.message} />
            <div className="ss-info-actions">
              <Button variant="primary" label={t('billing.cancel.tryAgain')} onClick={() => window.location.reload()} />
              <Button variant="secondary" label={t('billing.cancel.startAgain')} onClick={startAgain} />
            </div>
          </div>
        )}

        {step.kind === 'done' && (
          <div className="ss-billing-confirm">
            <h2 tabIndex={-1}>{withdraw ? t('billing.cancel.doneWithdrawTitle') : t('billing.cancel.doneTitle')}</h2>
            <p>{t('billing.cancel.receivedAt', { date: dateTime(step.receipt.receivedAt), email: step.receipt.email })}</p>
            <CancelOutcome receipt={step.receipt} date={date} />
            <p className="ss-info-note">{t('billing.cancel.keep')}</p>
            <div className="ss-info-actions">
              <Button variant="secondary" label={t('billing.cancel.home')} onClick={() => navigate('/')} />
            </div>
          </div>
        )}
      </section>
    </Page>
  );
}

/** What changed, once the address was proven. */
function CancelOutcome({ receipt, date }: { receipt: CancelReceipt; date: (iso: string) => string }) {
  const { t } = useLanguage();
  if (receipt.details.length === 0) return <p>{t('billing.cancel.doneNone')}</p>;
  // Two subscriptions that end the same way read as one line.
  const lines = [...new Set(receipt.details.map((detail) => (detail.withdrawn
    ? t(detail.refunded ? 'billing.cancel.doneWithdrawn' : 'billing.cancel.doneWithdrawnUnpaid')
    : detail.endsAt
      ? t('billing.cancel.doneEndsAt', { date: date(detail.endsAt) })
      : t('billing.cancel.doneGeneric'))))];
  return (
    <>
      {lines.length === 1
        ? <p>{lines[0]}</p>
        : <ul className="ss-billing-outcomes">{lines.map((line) => <li key={line}>{line}</li>)}</ul>}
      {receipt.emailed && <p>{t('billing.cancel.doneEmailed')}</p>}
    </>
  );
}
