import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { useAuth } from '../../lib/auth';
import { ApiError, friendlyError } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { codingKeys, finishGithubConnect, startGithubConnect } from '../../coding/api';
import { SwimmingFin } from '../SharkFin';

/** What an error offers next: sending the same code again, starting a new
 * connection on GitHub, or neither. */
type NextStep = 'retry' | 'connect' | null;
type Phase = { kind: 'working' } | { kind: 'signin' } | { kind: 'error'; message: string; next: NextStep } | { kind: 'requested' };

/** Refusals that asking again cannot fix: GitHub's code works once, and who
 * owns or holds an installation does not change on a retry. */
const REFUSAL_KEYS: Partial<Record<string, TranslationKey>> = {
  authorization_missing: 'github.callbackAuthorize',
  authorization_failed: 'github.callbackAuthorize',
  installation_not_yours: 'github.callbackNotYours',
  installation_taken: 'github.callbackTaken',
};

/** Failures that never reached the check, so the same one-time code can
 * still be sent: no connection, a rate limit, or the service briefly down.
 * After any other failure the server may have spent the code, and only a new
 * connection on GitHub brings a fresh one. */
const sameCodeMayWork = (error: unknown): boolean =>
  !(error instanceof ApiError) || error.status === 0 || error.status === 429 || error.status === 503;

/**
 * `/settings/github` is the GitHub App's callback URL. The app requests user
 * authorization during installation, so GitHub lands here after the learner
 * installs and authorizes it, carrying `installation_id`, `setup_action`, the
 * one-time `code` and the sealed `state` we issued. The page finishes the
 * connection on the server, which checks through the code that the
 * installation is the learner's own, and returns to the profile, where the
 * garden card shows the result.
 */
export function GithubSettingsPage() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: 'working' });
  const [opening, setOpening] = useState(false);
  const inFlight = useRef(false);

  const installationId = params.get('installation_id');
  const state = params.get('state');
  const setupAction = params.get('setup_action');
  const code = params.get('code');

  const finish = useCallback(() => {
    if (!installationId || !state || !code || inFlight.current) return;
    inFlight.current = true;
    setPhase({ kind: 'working' });
    finishGithubConnect(installationId, state, code)
      .then((connection) => {
        queryClient.setQueryData(codingKeys.github(), connection);
        navigate('/profile#github-garden', { replace: true });
      })
      .catch((error: unknown) => {
        const refusal = error instanceof ApiError && error.code ? REFUSAL_KEYS[error.code] : undefined;
        setPhase(refusal
          ? { kind: 'error', message: t(refusal), next: null }
          : { kind: 'error', message: friendlyError(error), next: sameCodeMayWork(error) ? 'retry' : 'connect' });
      })
      .finally(() => { inFlight.current = false; });
  }, [installationId, state, code, navigate, queryClient, t]);

  // A new connection: GitHub installs or re-authorizes and returns here with
  // a fresh code.
  const connectAgain = useCallback(() => {
    setOpening(true);
    startGithubConnect()
      .then(({ url }) => window.location.assign(url))
      .catch((error: unknown) => {
        setOpening(false);
        setPhase({ kind: 'error', message: friendlyError(error), next: 'connect' });
      });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // GitHub also sends a learner here after they change the installation's
    // repositories on GitHub. That visit carries no state and has nothing to
    // finish; the profile reads the connection as it now stands.
    if (setupAction === 'update' && !state) {
      navigate('/profile#github-garden', { replace: true });
      return;
    }
    if (!isAuthenticated) return setPhase({ kind: 'signin' });
    if (setupAction === 'request') return setPhase({ kind: 'requested' });
    if (!installationId || !state) return setPhase({ kind: 'error', message: t('github.callbackMissing'), next: null });
    if (!code) return setPhase({ kind: 'error', message: t('github.callbackAuthorize'), next: null });
    finish();
  }, [finish, installationId, state, code, setupAction, isAuthenticated, isLoading, navigate, t]);

  const heading = phase.kind === 'error' ? t('github.callbackFailed')
    : phase.kind === 'signin' ? t('github.callbackSignIn')
      : phase.kind === 'requested' ? t('github.callbackRequested')
        : t('github.callbackWorking');
  const body = phase.kind === 'error' ? phase.message
    : phase.kind === 'signin' ? t('github.callbackSignInBody')
      : phase.kind === 'requested' ? t('github.callbackRequestedBody')
        : t('github.callbackWorkingBody');

  return (
    <article className="ss-info-page">
      <header className="ss-info-page__header">
        <SwimmingFin size={26} />
        <span className="ss-info-page__kicker">{t('github.title')}</span>
        <h1>{heading}</h1>
        <p role="status" aria-live="polite">{body}</p>
      </header>
      <div className="ss-info-actions">
        {phase.kind === 'signin' && <Button variant="primary" label={t('github.signIn')} onClick={() => void signInWithGoogle()} />}
        {phase.kind === 'error' && phase.next === 'retry' && <Button variant="primary" label={t('quiz.retry')} onClick={finish} />}
        {phase.kind === 'error' && phase.next === 'connect' && (
          <Button variant="primary" label={opening ? t('github.connecting') : t('github.connectAgain')} isDisabled={opening} onClick={connectAgain} />
        )}
        {phase.kind !== 'working' && <Button variant="secondary" label={t('github.backToProfile')} onClick={() => navigate('/profile', { replace: true })} />}
      </div>
    </article>
  );
}

export default GithubSettingsPage;
