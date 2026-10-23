import { Button } from '@astryxdesign/core/Button';
import { useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { openSignIn } from '../lib/signInDialog';
import { getSupabaseSession } from '../lib/supabaseClient';
import { flashcardsQuery } from '../lib/queries';
import { readOnce, useFirstData } from '../lib/routeData';
import { useSubject } from '../lib/subjects';
import { bookmarksQuery, useBookmarks, useSaveChallenge } from '../coding/practice';
import { CODING_INDEX } from '../../../shared/coding-index';
import { difficultyOf } from '../../../shared/coding-catalog';
import { DifficultyBadge } from '../coding/DifficultyBadge';
import LoadingScreen from './LoadingScreen';
// Static, not lazy: the Shark Cards tab is what /collection opens on, and a
// lazy deck drew the page first, then a loader in its body, then the cards.
import Flashcards from './Flashcards';
import { PageHeader } from './ui/PageHeader';
import { StatePanel } from './ui/StatePanel';
import '../coding/Coding.css';

function SavedChallenges() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const query = useBookmarks(isAuthenticated, { held: true });
  const save = useSaveChallenge();
  // While the session is restored the learner is not known to be signed out:
  // a sign-in prompt here flashed before the saved list, as the deck's did not.
  if (authLoading && !isAuthenticated) return <LoadingScreen label={t('common.loading')} />;
  // The same gate as the Shark Cards tab: the shared StatePanel under the
  // page header, with one primary (social-account-16).
  if (!isAuthenticated) return <StatePanel level={2} title={t('collection.signInTitle')} body={t('collection.signInBody')}>
    <Button variant="primary" label={t('collection.signIn')} aria-haspopup="dialog" onClick={() => openSignIn()} />
  </StatePanel>;
  if (query.isPending) return <LoadingScreen label={t('common.loading')} />;
  if (query.isError) return <div role="alert"><p>{t('coding.saved.loadFailed')}</p><Button variant="secondary" label={t('coding.retry')} onClick={() => void query.refetch()} /></div>;
  return <section aria-label={t('collection.challenges')}>
    {save.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.collections.failed')}</p>}
    {!query.data.saved.length && <p className="cd-note">{t('collection.empty')}</p>}
    <ul className="cd-rows">{query.data.saved.map(id => {
      const task = CODING_INDEX.find(task => task.id === id);
      return <li key={id} className="cd-row-item">
        {task
          ? <Link className="cd-row" to={`/coding/${task.track}/${task.id}`}>
            <span className="cd-row__title">{task.title}</span>
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
  // Shark Cards first (owner decision 12): the page is named after the open
  // tab, and the nav calls it Shark Cards.
  const cards = selected === 'questions';
  return <div className="cd-page ss-pop">
    {/* The shared operational header (social-account-11). No kicker: the
        tabs under it already say which shelf is open (social-account-10). */}
    <PageHeader title={t(cards ? 'sharkCards.title' : 'collection.challengesTitle')} lead={t(cards ? 'sharkCards.lead' : 'collection.subtitle')} />
    {/* The open shelf is secondary with aria-current and the other ghost:
        a filled tab would be a second primary beside the shelf's own action,
        the gate's Sign in or the empty shelf's Take a quiz (one primary per
        screen). */}
    <nav className="cd-actions" aria-label={t('collection.heading')}>{tabs.map(tab => <Button key={tab} variant={selected === tab ? 'secondary' : 'ghost'} aria-current={selected === tab ? 'page' : undefined} onClick={() => setParams({ tab })} label={t(`collection.${tab}`)} />)}</nav>
    {selected === 'questions' ? <Flashcards embedded /> : <SavedChallenges />}
  </div>;
}
