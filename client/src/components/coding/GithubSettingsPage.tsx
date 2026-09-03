import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { useAuth } from '../../lib/auth';
import { friendlyError } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { codingKeys, finishGithubConnect } from '../../coding/api';
import { SwimmingFin } from '../SharkFin';

type Phase = { kind: 'working' } | { kind: 'signin' } | { kind: 'error'; message: string } | { kind: 'requested' };

/**
 * `/settings/github` is the GitHub App setup URL. GitHub lands here after the
 * learner installs the app, carrying `installation_id`, `setup_action` and
 * the sealed `state` we issued. The page finishes the connection on the
 * server and returns to the profile, where the garden card shows the result.
 */
export function GithubSettingsPage() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: 'working' });
  const inFlight = useRef(false);

  const installationId = params.get('installation_id');
  const state = params.get('state');
  const setupAction = params.get('setup_action');

  const finish = useCallback(() => {
    if (!installationId || !state || inFlight.current) return;
    inFlight.current = true;
    setPhase({ kind: 'working' });
    finishGithubConnect(installationId, state)
      .then((connection) => {
        queryClient.setQueryData(codingKeys.github(), connection);
        navigate('/profile#github-garden', { replace: true });
      })
      .catch((error: unknown) => setPhase({ kind: 'error', message: friendlyError(error) }))
      .finally(() => { inFlight.current = false; });
  }, [installationId, state, navigate, queryClient]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return setPhase({ kind: 'signin' });
    if (setupAction === 'request') return setPhase({ kind: 'requested' });
    if (!installationId || !state) return setPhase({ kind: 'error', message: t('github.callbackMissing') });
    finish();
  }, [finish, installationId, state, setupAction, isAuthenticated, isLoading, t]);

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
        {phase.kind === 'error' && installationId && state && <Button variant="primary" label={t('quiz.retry')} onClick={finish} />}
        {phase.kind !== 'working' && <Button variant="secondary" label={t('github.backToProfile')} onClick={() => navigate('/profile', { replace: true })} />}
      </div>
    </article>
  );
}

export default GithubSettingsPage;
