// The two pages an email link opens (lib/emailAuth.ts):
//
//   /auth/confirmed   where a confirmation link lands. supabase-js reads the
//                     session from the address and the learner is signed in;
//                     the page says so and offers the way back to the page
//                     that asked (`?next=`). A link that expired or was used
//                     says that, and offers a new one or a sign-in.
//   /reset-password   where a reset link lands, as a recovery session. It sets
//                     a new password with a confirmation field, then signs the
//                     account out on other devices. Signed in otherwise, it
//                     changes the password; signed out, it asks for a link.
//
// Both also take the scanner-safe link (`?token_hash=…&type=…`): the session
// opens when the learner presses the button, not when a mail filter fetches
// the link. Neither page is a new API handler: both talk to Supabase Auth.
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { AUTH_LANDING_PATHS, isSafeReturnPath } from '../../lib/authReturn';
import {
  PASSWORD_MIN_LENGTH,
  emailProblem,
  linkErrorIn,
  markEmailSent,
  newPasswordProblem,
  resendConfirmation,
  sendPasswordReset,
  tokenLinkIn,
  updatePassword,
  useCooldown,
  verifyEmailLink,
  type AuthFailure,
} from '../../lib/emailAuth';
import { openSignIn } from '../../lib/signInDialog';
import LoadingScreen from '../LoadingScreen';
import { Page } from '../PublicInfoPages';
import { EmailField, FailureBanner, PasswordField, useFieldMessage, withEmail } from './AuthFields';

/** Where Continue goes: the page that asked for the account, when it is a
 * page of this site and not one of these two. */
function continuePath(next: string | null): string {
  if (!next || !isSafeReturnPath(next) || AUTH_LANDING_PATHS.some((path) => next.startsWith(path))) return '/';
  return next;
}

/**
 * Asks for an email to be sent again: a confirmation link, or a reset link.
 * Supabase answers the same whether or not the address has an account, so
 * the sentence after sending says "if".
 */
function EmailLinkRequest({ purpose, returnTo }: { purpose: 'confirm' | 'reset'; returnTo?: string }) {
  const t = useT();
  const fieldMessage = useFieldMessage();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const wait = useCooldown(purpose, email, version);
  const problem = emailProblem(email);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || wait > 0) return;
    setSubmitted(true);
    setFailure(null);
    if (problem) return;
    setBusy(true);
    const outcome = purpose === 'confirm' ? await resendConfirmation(email, returnTo) : await sendPasswordReset(email);
    setBusy(false);
    if (outcome.ok || outcome.failure === 'emailRateLimited') {
      markEmailSent(purpose, email);
      setVersion((now) => now + 1);
    }
    if (outcome.ok) setSentTo(email.trim());
    else setFailure(outcome.failure);
  };

  const label = wait > 0
    ? t('auth.sent.resendIn', { seconds: wait })
    : t(purpose === 'confirm' ? 'authPage.resendSubmit' : 'auth.dialog.sendReset');
  return (
    <section className="ss-info-card ss-auth-page" aria-labelledby={`auth-request-${purpose}`}>
      <h2 id={`auth-request-${purpose}`}>{t(purpose === 'confirm' ? 'authPage.resendTitle' : 'authPage.resetRequestTitle')}</h2>
      <form className="ss-auth ss-auth__form" method="post" noValidate onSubmit={(event) => void submit(event)}>
        <EmailField
          label={t('auth.email.label')}
          value={email}
          onChange={(value) => { setEmail(value); setFailure(null); }}
          error={submitted ? fieldMessage(problem) : null}
        />
        {failure && <FailureBanner failure={failure} />}
        {sentTo && (
          <p className="ss-auth__status" role="status">
            {withEmail(t(purpose === 'confirm' ? 'authPage.resendSent' : 'auth.sent.resetBody'), sentTo)}
          </p>
        )}
        <div className="ss-info-actions" style={{ marginTop: 0 }}>
          <Button type="submit" variant="primary" label={label} isLoading={busy} isDisabled={busy || wait > 0} />
        </div>
      </form>
    </section>
  );
}

export function EmailConfirmedPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, isLoading } = useAuth();
  // Read as the page opens: supabase-js takes a session out of the address
  // bar once it has read it, and an error stays there.
  const [linkError] = useState(() => linkErrorIn(location));
  const [tokenLink] = useState(() => tokenLinkIn(location.search, 'confirm'));
  const [verifying, setVerifying] = useState(false);
  const [verifyFailure, setVerifyFailure] = useState<AuthFailure | null>(null);
  const next = continuePath(params.get('next'));

  if (isLoading) return <LoadingScreen label={t('authPage.confirming')} />;

  if (user) {
    const email = user.email ?? '';
    return (
      <Page
        kicker={t('authPage.kicker')}
        title={t(linkError ? 'authPage.usedTitle' : 'authPage.confirmedTitle')}
        lead={t(linkError ? 'authPage.usedLead' : 'authPage.signedInAs', { email })}
      >
        <div className="ss-info-actions">
          <Button variant="primary" label={t('authPage.continue')} onClick={() => navigate(next, { replace: true })} />
        </div>
      </Page>
    );
  }

  const confirm = async () => {
    if (!tokenLink || verifying) return;
    setVerifying(true);
    setVerifyFailure(null);
    const outcome = await verifyEmailLink(tokenLink);
    // Confirmed: supabase-js announces SIGNED_IN and the page above takes over.
    if (!outcome.ok) {
      setVerifying(false);
      setVerifyFailure(outcome.failure);
    }
  };

  if (tokenLink && (!verifyFailure || verifyFailure === 'network' || verifyFailure === 'serviceError')) {
    return (
      <Page kicker={t('authPage.kicker')} title={t('authPage.confirmTitle')} lead={t('authPage.confirmTokenLead')}>
        <section className="ss-info-card ss-auth-page">
          <div className="ss-auth">
            {verifyFailure && <FailureBanner failure={verifyFailure} />}
            <div className="ss-info-actions" style={{ marginTop: 0 }}>
              <Button
                variant="primary"
                label={t(verifying ? 'authPage.confirmingButton' : 'authPage.confirmButton')}
                isLoading={verifying}
                onClick={() => void confirm()}
              />
            </div>
          </div>
        </section>
      </Page>
    );
  }

  const expired = Boolean(linkError || verifyFailure);
  return (
    <Page
      kicker={t('authPage.kicker')}
      title={t(expired ? 'authPage.expiredTitle' : 'authPage.confirmTitle')}
      lead={t(expired ? 'authPage.expiredLead' : 'authPage.confirmVisitLead')}
    >
      <div className="ss-info-actions" style={{ marginTop: 0 }}>
        <Button variant="secondary" label={t('authPage.signIn')} onClick={() => openSignIn({ view: 'signIn' })} />
      </div>
      <EmailLinkRequest purpose="confirm" returnTo={next !== '/' ? next : undefined} />
    </Page>
  );
}

/** A new password, twice. */
function SetPasswordForm({ onDone }: { onDone: (otherDevicesSignedOut: boolean) => void }) {
  const t = useT();
  const fieldMessage = useFieldMessage();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const problem = newPasswordProblem(password);
  const mismatch = again !== password ? 'passwordMismatch' as const : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setFailure(null);
    if (problem || mismatch || !again) return;
    setBusy(true);
    const outcome = await updatePassword(password);
    setBusy(false);
    if (outcome.ok) onDone(outcome.otherDevicesSignedOut);
    else setFailure(outcome.failure);
  };

  return (
    <section className="ss-info-card ss-auth-page">
      <form className="ss-auth ss-auth__form" method="post" noValidate onSubmit={(event) => void submit(event)}>
        <PasswordField
          label={t('auth.password.newLabel')}
          value={password}
          onChange={(value) => { setPassword(value); setFailure(null); }}
          error={submitted ? fieldMessage(problem) : null}
          hint={t('auth.password.rule', { min: PASSWORD_MIN_LENGTH })}
          autoComplete="new-password"
        />
        <PasswordField
          label={t('auth.password.confirmLabel')}
          value={again}
          onChange={(value) => { setAgain(value); setFailure(null); }}
          error={submitted && !problem ? fieldMessage(again ? mismatch : 'passwordRequired') : null}
          autoComplete="new-password"
        />
        {failure && <FailureBanner failure={failure} />}
        <div className="ss-info-actions" style={{ marginTop: 0 }}>
          <Button type="submit" variant="primary" label={t(busy ? 'authPage.saving' : 'authPage.setSubmit')} isLoading={busy} />
        </div>
      </form>
    </section>
  );
}

export function ResetPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, passwordRecovery } = useAuth();
  const [linkError] = useState(() => linkErrorIn(location));
  const [tokenLink] = useState(() => tokenLinkIn(location.search, 'recovery'));
  const [verifying, setVerifying] = useState(false);
  const [verifyFailure, setVerifyFailure] = useState<AuthFailure | null>(null);
  const [done, setDone] = useState<{ otherDevicesSignedOut: boolean } | null>(null);

  if (isLoading) return <LoadingScreen label={t('authPage.resetLoading')} />;

  if (user && done) {
    return (
      <Page kicker={t('authPage.kicker')} title={t('authPage.setDoneTitle')} lead={t('authPage.setDoneLead', { email: user.email ?? '' })}>
        {done.otherDevicesSignedOut && <p className="ss-auth__note">{t('authPage.setDoneOthers')}</p>}
        <div className="ss-info-actions" style={{ marginTop: 0 }}>
          <Button variant="primary" label={t('authPage.continue')} onClick={() => navigate('/', { replace: true })} />
        </div>
      </Page>
    );
  }

  if (user) {
    return (
      <Page
        kicker={t('authPage.kicker')}
        title={t(passwordRecovery ? 'authPage.setTitle' : 'authPage.changeTitle')}
        lead={t('authPage.setLead', { email: user.email ?? '' })}
      >
        <SetPasswordForm onDone={(otherDevicesSignedOut) => setDone({ otherDevicesSignedOut })} />
      </Page>
    );
  }

  const open = async () => {
    if (!tokenLink || verifying) return;
    setVerifying(true);
    setVerifyFailure(null);
    const outcome = await verifyEmailLink(tokenLink);
    // Opened: supabase-js announces PASSWORD_RECOVERY and the form above shows.
    if (!outcome.ok) {
      setVerifying(false);
      setVerifyFailure(outcome.failure);
    }
  };

  if (tokenLink && (!verifyFailure || verifyFailure === 'network' || verifyFailure === 'serviceError')) {
    return (
      <Page kicker={t('authPage.kicker')} title={t('auth.dialog.forgotTitle')} lead={t('authPage.resetTokenLead')}>
        <section className="ss-info-card ss-auth-page">
          <div className="ss-auth">
            {verifyFailure && <FailureBanner failure={verifyFailure} />}
            <div className="ss-info-actions" style={{ marginTop: 0 }}>
              <Button
                variant="primary"
                label={t(verifying ? 'authPage.opening' : 'authPage.continue')}
                isLoading={verifying}
                onClick={() => void open()}
              />
            </div>
          </div>
        </section>
      </Page>
    );
  }

  const expired = Boolean(linkError || verifyFailure);
  return (
    <Page
      kicker={t('authPage.kicker')}
      title={t(expired ? 'authPage.resetExpiredTitle' : 'auth.dialog.forgotTitle')}
      lead={t(expired ? 'authPage.resetExpiredLead' : 'auth.dialog.forgotSubtitle')}
    >
      <EmailLinkRequest purpose="reset" />
    </Page>
  );
}
