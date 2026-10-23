import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Kicker } from '../landing/LandingKit';
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
import { accountEpoch } from '../../lib/accountData';
import { useClearOnPageRestore } from '../../lib/pageRestore';
import { useLanguage } from '../../i18n/LanguageContext';
import { codingKeys, chooseGithubRepo, disconnectGithub, startGithubConnect, syncGithub, useGithubConnection } from '../../coding/api';
import { RadioCard, RadioCardGroup } from '../ui/RadioCards';
import { AppToast } from '../ui/AppToast';
import { BrandedConfirmDialog, type ConfirmRequest } from '../ui/BrandedConfirmDialog';

/** Where a learner manages the app installation on GitHub itself. */
const INSTALLATIONS_URL = 'https://github.com/settings/installations';

type Toast = { message: string; severity: 'success' | 'error' } | null;
type Action = 'connect' | 'repo' | 'sync' | 'disconnect';

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
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const query = useGithubConnection(isAuthenticated);
  const [busy, setBusy] = useState<Action | null>(null);
  // `busy` reaches the handlers a render later than a second click, so the
  // ref is what refuses it: one connect, repository, sync or disconnect at a time.
  const busyRef = useRef<Action | null>(null);
  const begin = (action: Action): boolean => {
    if (busyRef.current) return false;
    busyRef.current = action;
    setBusy(action);
    return true;
  };
  const end = () => {
    busyRef.current = null;
    setBusy(null);
  };
  // Connect leaves for GitHub with the button busy; Back restores the page
  // from the browser's cache exactly so, and the round trip it waited for is over.
  useClearOnPageRestore(useCallback((stillBusy: boolean) => {
    if (stillBusy || busyRef.current !== 'connect') return;
    busyRef.current = null;
    setBusy(null);
  }, []));
  const [repoChoice, setRepoChoice] = useState<string | null>(null);
  // The choice counts only while the list still offers it: a re-read after
  // the installation changed can drop that repository, and Use would send a
  // name the server refuses as bad_repo.
  const offeredRepos = query.data?.status === 'pending_repo' ? query.data.repositories ?? [] : [];
  const repoPick = repoChoice !== null && offeredRepos.some((repo) => repo.fullName === repoChoice) ? repoChoice : null;
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const anchorRef = useRef<HTMLHeadingElement>(null);
  // The garden stays out of sight until the server says this deployment has
  // it: a deployment without the GitHub App answers `available: false`, and
  // every profile would otherwise show a card for a feature that is not there.
  const hidden = query.isLoading || query.data?.available === false;

  // The setup callback returns to `/profile#github-garden`; lazy routes mount
  // after the browser's own hash jump, so bring the card into view here.
  useEffect(() => {
    if (!hidden && window.location.hash === '#github-garden') anchorRef.current?.scrollIntoView({ block: 'start' });
  }, [hidden]);

  const setConnection = (next: GithubConnectionResponse) => queryClient.setQueryData(codingKeys.github(), next);

  // An answer that lands after the learner signed out (or in as someone
  // else) belongs to the account that left: it neither fills the new
  // account's cache nor announces anything (lib/accountData.ts).
  const connect = async () => {
    if (!begin('connect')) return;
    const epoch = accountEpoch();
    try {
      const { url } = await startGithubConnect();
      if (accountEpoch() !== epoch) return end();
      window.location.assign(url);
    } catch (error) {
      if (accountEpoch() === epoch) setToast({ message: friendlyError(error), severity: 'error' });
      end();
    }
  };

  const chooseRepo = async () => {
    if (!repoPick || !begin('repo')) return;
    const chosen = repoPick;
    const epoch = accountEpoch();
    try {
      const next = await chooseGithubRepo(chosen);
      if (accountEpoch() !== epoch) return;
      setConnection(next);
      setToast({ message: t('github.repoSaved', { repo: chosen }), severity: 'success' });
    } catch (error) {
      if (accountEpoch() === epoch) setToast({ message: friendlyError(error), severity: 'error' });
    } finally {
      end();
    }
  };

  const sync = async () => {
    if (!begin('sync')) return;
    const epoch = accountEpoch();
    try {
      const result = await syncGithub();
      if (accountEpoch() !== epoch) return;
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
      if (accountEpoch() === epoch) setToast({ message: friendlyError(error), severity: 'error' });
    } finally {
      end();
    }
  };

  const requestDisconnect = () => {
    setConfirm({
      title: t('github.disconnectTitle'),
      description: t('github.disconnectConfirm'),
      actionLabel: t('github.disconnect'),
      destructive: true,
      onConfirm: async () => {
        if (!begin('disconnect')) return;
        const epoch = accountEpoch();
        try {
          await disconnectGithub();
          if (accountEpoch() !== epoch) return;
          await queryClient.invalidateQueries({ queryKey: codingKeys.github() });
          setToast({ message: t('github.disconnected'), severity: 'success' });
        } catch (error) {
          if (accountEpoch() === epoch) setToast({ message: friendlyError(error), severity: 'error' });
        } finally {
          end();
        }
      },
    });
  };

  if (hidden) return null;

  const data = query.data;
  const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  let body: ReactNode;
  if (query.isError || !data) {
    body = (
      <Banner
        status="warning"
        title={t('github.loadFailed')}
        description={query.error ? friendlyError(query.error) : undefined}
        endContent={<Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void query.refetch()} />}
      />
    );
  } else if (data.status === 'not_connected') {
    body = (
      <>
        <Text type="supporting" size="sm" color="secondary">{t('github.introOne')}</Text>
        <Text type="supporting" size="sm" color="secondary">{t('github.introTwo')}</Text>
        <HStack justify="end">
          <Button
            variant="primary"
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
              <Button variant="secondary" href={INSTALLATIONS_URL} target="_blank" rel="noopener noreferrer" label={t('github.manageOnGithub')} />
              <Button variant="ghost" label={t('github.refresh')} isDisabled={query.isFetching} onClick={() => void query.refetch()} />
            </HStack>
          </>
        ) : (
          <>
            <Text type="supporting" size="sm" color="secondary">{t('github.pickRepo')}</Text>
            <RadioCardGroup value={repoPick} onChange={(value) => setRepoChoice(String(value))} label={t('github.pickRepoLabel')}>
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
              <Button variant="ghost" label={t('github.disconnect')} isDisabled={busy !== null} onClick={requestDisconnect} />
              <Button variant="primary" label={t('github.useRepo')} isDisabled={!repoPick || busy !== null} onClick={() => void chooseRepo()} />
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
            <dd style={{ fontSize: 'var(--ss-type-compact)' }}>{repoUrl && data.repoFullName ? <a href={repoUrl} target="_blank" rel="noopener noreferrer">{data.repoFullName}</a> : '—'}</dd>
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
            <Button variant="ghost" label={busy === 'disconnect' ? t('github.disconnecting') : t('github.disconnect')} isDisabled={busy !== null} onClick={requestDisconnect} />
            <Button variant="secondary" href={INSTALLATIONS_URL} target="_blank" rel="noopener noreferrer" label={t('github.manageOnGithub')} />
          </HStack>
          {(data.queued > 0 || data.status === 'broken') && (
            <Button variant="secondary" label={busy === 'sync' ? t('github.syncing') : t('github.syncNow')} isDisabled={busy !== null} onClick={() => void sync()} />
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
            <Kicker as="h2" id="github-garden" elementRef={anchorRef} tabIndex={-1}>{t('github.title')}</Kicker>
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
