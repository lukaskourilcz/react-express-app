import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import type { GithubConnectionResponse } from '../../../../shared/coding-api';
import { useAuth } from '../../lib/auth';
import { friendlyError } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { codingKeys, chooseGithubRepo, disconnectGithub, startGithubConnect, syncGithub, useGithubConnection } from '../../coding/api';
import { RadioCard, RadioCardGroup } from '../ui/RadioCards';
import { AppToast } from '../ui/AppToast';
import { BrandedConfirmDialog, type ConfirmRequest } from '../ui/BrandedConfirmDialog';

/** Where a learner manages the app installation on GitHub itself. */
const INSTALLATIONS_URL = 'https://github.com/settings/installations';

type Toast = { message: string; severity: 'success' | 'error' } | null;

function Raised({ children }: { children: ReactNode }) {
  return (
    <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
      {children}
    </div>
  );
}

/**
 * The GitHub garden panel on the devShark profile: connect the app, pick the
 * repository that receives one file per passed task, retry queued commits,
 * disconnect. Every state reads from the server's connection record so a
 * second device shows the same truth.
 */
export function GithubGardenCard() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const query = useGithubConnection(isAuthenticated);
  const [busy, setBusy] = useState<'connect' | 'repo' | 'sync' | 'disconnect' | null>(null);
  const [repoChoice, setRepoChoice] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const anchorRef = useRef<HTMLHeadingElement>(null);

  // The setup callback returns to `/profile#github-garden`; lazy routes mount
  // after the browser's own hash jump, so bring the card into view here.
  useEffect(() => {
    if (window.location.hash === '#github-garden') anchorRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  const setConnection = (next: GithubConnectionResponse) => queryClient.setQueryData(codingKeys.github(), next);

  const connect = async () => {
    setBusy('connect');
    try {
      const { url } = await startGithubConnect();
      window.location.assign(url);
    } catch (error) {
      setToast({ message: friendlyError(error), severity: 'error' });
      setBusy(null);
    }
  };

  const chooseRepo = async () => {
    if (!repoChoice) return;
    setBusy('repo');
    try {
      setConnection(await chooseGithubRepo(repoChoice));
      setToast({ message: t('github.repoSaved', { repo: repoChoice }), severity: 'success' });
    } catch (error) {
      setToast({ message: friendlyError(error), severity: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      const result = await syncGithub();
      await queryClient.invalidateQueries({ queryKey: codingKeys.github() });
      setToast({
        message: result.committed > 0
          ? t('github.syncDone', { n: result.committed })
          : result.remaining > 0
            ? t('github.syncPending', { n: result.remaining })
            : t('github.syncNothing'),
        severity: result.failed > 0 && result.committed === 0 ? 'error' : 'success',
      });
    } catch (error) {
      setToast({ message: friendlyError(error), severity: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const requestDisconnect = () => {
    setConfirm({
      title: t('github.disconnectTitle'),
      description: t('github.disconnectConfirm'),
      actionLabel: t('github.disconnect'),
      destructive: true,
      onConfirm: async () => {
        setBusy('disconnect');
        try {
          await disconnectGithub();
          await queryClient.invalidateQueries({ queryKey: codingKeys.github() });
          setToast({ message: t('github.disconnected'), severity: 'success' });
        } catch (error) {
          setToast({ message: friendlyError(error), severity: 'error' });
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const data = query.data;
  const dateFormat = new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  let body: ReactNode;
  if (query.isLoading) {
    body = <Text type="supporting" size="sm" color="secondary" role="status">{t('common.loading')}</Text>;
  } else if (query.isError || !data) {
    body = (
      <Banner
        status="warning"
        title={t('github.loadFailed')}
        description={query.error ? friendlyError(query.error) : undefined}
        endContent={<Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void query.refetch()} />}
      />
    );
  } else if (!data.available) {
    body = <Text type="supporting" size="sm" color="secondary">{t('github.unavailable')}</Text>;
  } else if (data.status === 'not_connected') {
    body = (
      <>
        <Text type="supporting" size="sm" color="secondary">{t('github.introOne')}</Text>
        <Text type="supporting" size="sm" color="secondary">{t('github.introTwo')}</Text>
        <HStack justify="end">
          <Button
            variant="primary"
            size="sm"
            label={busy === 'connect' ? t('github.connecting') : t('github.connect')}
            isDisabled={busy !== null}
            onClick={() => void connect()}
          />
        </HStack>
      </>
    );
  } else if (data.status === 'pending_repo') {
    const repos = data.repositories ?? [];
    body = (
      <>
        <Text size="sm">{t('github.connectedAs', { login: data.accountLogin ?? '' })}</Text>
        {repos.length === 0 ? (
          <>
            <Text type="supporting" size="sm" color="secondary">{t('github.noRepos')}</Text>
            <HStack justify="between" wrap="wrap" gap={1}>
              <a className="ss-link-button ss-link-button--secondary" href={INSTALLATIONS_URL} target="_blank" rel="noopener noreferrer">{t('github.manageOnGithub')}</a>
              <Button variant="ghost" size="sm" label={t('github.refresh')} isDisabled={query.isFetching} onClick={() => void query.refetch()} />
            </HStack>
          </>
        ) : (
          <>
            <Text type="supporting" size="sm" color="secondary">{t('github.pickRepo')}</Text>
            <RadioCardGroup value={repoChoice} onChange={(value) => setRepoChoice(String(value))} label={t('github.pickRepoLabel')}>
              {repos.map((repo, index) => (
                <RadioCard key={repo.fullName} value={repo.fullName} index={index} label={repo.fullName} padding={2}>
                  <VStack gap={0}>
                    <Text weight="semibold" size="sm">{repo.fullName}</Text>
                    <Text type="supporting" size="xsm" color="secondary">
                      {repo.private ? t('github.repoPrivate') : t('github.repoPublic')} · {repo.defaultBranch}
                    </Text>
                  </VStack>
                </RadioCard>
              ))}
            </RadioCardGroup>
            <HStack justify="between" wrap="wrap" gap={1}>
              <Button variant="ghost" size="sm" label={t('github.disconnect')} isDisabled={busy !== null} onClick={requestDisconnect} />
              <Button variant="primary" size="sm" label={t('github.useRepo')} isDisabled={!repoChoice || busy !== null} onClick={() => void chooseRepo()} />
            </HStack>
          </>
        )}
      </>
    );
  } else {
    const repoUrl = data.repoFullName ? `https://github.com/${data.repoFullName}` : null;
    body = (
      <>
        {data.status === 'broken' && (
          <Banner status="error" title={t('github.brokenTitle')} description={t('github.brokenBody')} />
        )}
        <dl className="ss-cost-grid" style={{ margin: 0 }}>
          <div>
            <dt>{t('github.account')}</dt>
            <dd>{data.accountLogin}</dd>
          </div>
          <div>
            <dt>{t('github.repository')}</dt>
            <dd>{repoUrl && data.repoFullName ? <a href={repoUrl} target="_blank" rel="noopener noreferrer">{data.repoFullName}</a> : '—'}</dd>
          </div>
          <div>
            <dt>{t('github.lastCommit')}</dt>
            <dd>{data.lastCommitAt ? dateFormat.format(new Date(data.lastCommitAt)) : t('github.noCommitsYet')}</dd>
          </div>
          <div>
            <dt>{t('github.queued')}</dt>
            <dd>{data.queued}</dd>
          </div>
        </dl>
        <Text type="supporting" size="xsm" color="secondary">{t('github.layoutNote')}</Text>
        <HStack justify="between" wrap="wrap" gap={1}>
          <HStack gap={1} wrap="wrap">
            <Button variant="ghost" size="sm" label={busy === 'disconnect' ? t('github.disconnecting') : t('github.disconnect')} isDisabled={busy !== null} onClick={requestDisconnect} />
            <a className="ss-link-button ss-link-button--secondary" href={INSTALLATIONS_URL} target="_blank" rel="noopener noreferrer">{t('github.manageOnGithub')}</a>
          </HStack>
          {(data.queued > 0 || data.status === 'broken') && (
            <Button variant="secondary" size="sm" label={busy === 'sync' ? t('github.syncing') : t('github.syncNow')} isDisabled={busy !== null} onClick={() => void sync()} />
          )}
        </HStack>
      </>
    );
  }

  return (
    <>
      <Raised>
        <Card variant="default" padding={3} width="100%">
          <VStack gap={1.5}>
            <h2 className="ss-kicker" id="github-garden" ref={anchorRef} tabIndex={-1}>{t('github.title')}</h2>
            <Text weight="semibold">{t('github.tagline')}</Text>
            {body}
          </VStack>
        </Card>
      </Raised>
      <BrandedConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      <AppToast
        open={!!toast}
        message={toast?.message ?? ''}
        severity={toast?.severity ?? 'info'}
        autoHideDuration={toast?.severity === 'error' ? null : 3000}
        onClose={() => setToast(null)}
      />
    </>
  );
}

export default GithubGardenCard;
