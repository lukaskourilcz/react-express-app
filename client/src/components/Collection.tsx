import { Button } from '@astryxdesign/core/Button';
import { useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { getSupabaseSession } from '../lib/supabaseClient';
import { flashcardsQuery } from '../lib/queries';
import { readOnce, useFirstData } from '../lib/routeData';
import { useSubject } from '../lib/subjects';
import { bookmarksQuery, useBookmarks, useSaveChallenge } from '../coding/practice';
import { CODING_INDEX } from '../../../shared/coding-index';
import { difficultyOf } from '../../../shared/coding-catalog';
import { DifficultyBadge } from '../coding/DifficultyBadge';
import LoadingScreen from './LoadingScreen';
// Static, not lazy: the questions tab is what /collection opens on, and a lazy
// Flashcards drew the page first, then a loader in its body, then the cards.
// Its own chunk is 2KB gzipped.
import Flashcards from './Flashcards';
import { Kicker } from './landing/LandingKit';
import '../coding/Coding.css';

function SavedChallenges() {
  const { t, lang } = useLanguage();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const query = useBookmarks(isAuthenticated, { held: true });
  const save = useSaveChallenge();
  const [authError, setAuthError] = useState(false);
  if (!isAuthenticated) return <div className="cd-note"><p>{t('coding.signInHint')}</p><Button variant="secondary" label={t('auth.logIn')} onClick={() => { void signInWithGoogle().catch(() => setAuthError(true)); }} />{authError && <p role="alert">{t('auth.signInFailed')}</p>}</div>;
  if (query.isPending) return <LoadingScreen label={t('common.loading')} />;
  if (query.isError) return <div role="alert"><p>{t('coding.loadError')}</p><Button variant="secondary" label={t('coding.retry')} onClick={() => void query.refetch()} /></div>;
  return <section aria-label={t('collection.challenges')}>
    {save.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.collections.failed')}</p>}
    {!query.data.saved.length && <p className="cd-note">{t('collection.empty')}</p>}
    <ul className="cd-rows">{query.data.saved.map(id => {
      const task = CODING_INDEX.find(task => task.id === id);
      return <li key={id} className="cd-row-item">
        {task
          ? <Link className="cd-row" to={`/coding/${task.track}/${task.id}`}>
            <span className="cd-row__title">{task.title[lang] || task.title.en}</span>
            <span className="cd-row__meta"><DifficultyBadge difficulty={difficultyOf(task)} /><span>{t(`coding.track.${task.track}` as never)}</span></span>
          </Link>
          : <span className="cd-row">{t('collection.unavailable')} ({id})</span>}
        <Button variant="secondary" label={t('coding.saved.remove')} isDisabled={save.isPending} onClick={() => save.mutate({ op: 'save', taskId: id, saved: false })} />
      </li>;
    })}</ul>
  </section>;
}

type Tab = 'questions' | 'challenges';

/** The open tab's saved items, in the cache before the first render, so a
 * signed-in learner's page draws with its cards instead of a loader that the
 * cards replace. A visitor waits for nothing. On a direct load the session is
 * still being restored when the page mounts (lib/auth.tsx), so the hold waits
 * for it too and reads the cards only if there is one. The other tab loads
 * when it is picked, as before. */
function useCollectionFirstData(tab: Tab) {
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [subject] = useSubject();
  const read = (): Promise<unknown> => tab === 'questions' ? readOnce(queryClient, flashcardsQuery(subject)) : readOnce(queryClient, bookmarksQuery);
  const account = user?.id ?? (isLoading ? 'restoring' : null);
  useFirstData(account && `collection ${tab} ${account}`, () => user ? read() : getSupabaseSession().then((session) => session ? read() : null));
}

export default function Collection() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tabs = ['questions', 'challenges'] as const;
  const selected: Tab = tabs.find(tab => tab === params.get('tab')) ?? 'questions';
  useCollectionFirstData(selected);
  return <div className="cd-page ss-pop">
    <header><Kicker>{t('collection.heading')}</Kicker><h1>{t('collection.heading')}</h1><p className="cd-lead">{t('collection.subtitle')}</p></header>
    <nav className="cd-actions" aria-label={t('collection.heading')}>{tabs.map(tab => <Button key={tab} variant={selected === tab ? 'primary' : 'secondary'} aria-current={selected === tab ? 'page' : undefined} onClick={() => setParams({ tab })} label={t(`collection.${tab}`)} />)}</nav>
    {selected === 'questions' ? <Flashcards embedded /> : <SavedChallenges />}
  </div>;
}
