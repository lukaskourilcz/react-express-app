import { useSearchParams, Link } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { useBookmarks, useSaveChallenge } from '../coding/practice';
import { CODING_INDEX } from '../../../shared/coding-index';
import { difficultyOf } from '../../../shared/coding-catalog';
import { DifficultyBadge } from '../coding/DifficultyBadge';
import LoadingScreen from './LoadingScreen';
import { Kicker } from './landing/LandingKit';
import '../coding/Coding.css';
const Flashcards = lazy(() => import('./Flashcards'));

function SavedChallenges() {
  const { t, lang } = useLanguage();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const query = useBookmarks(isAuthenticated);
  const save = useSaveChallenge();
  const [authError, setAuthError] = useState(false);
  if (!isAuthenticated) return <div className="cd-note"><p>{t('coding.signInHint')}</p><button className="cd-btn" onClick={() => { void signInWithGoogle().catch(() => setAuthError(true)); }}>{t('auth.logIn')}</button>{authError && <p role="alert">{t('auth.signInFailed')}</p>}</div>;
  if (query.isPending) return <LoadingScreen label={t('common.loading')} />;
  if (query.isError) return <div role="alert"><p>{t('coding.loadError')}</p><button className="cd-btn" onClick={() => void query.refetch()}>{t('coding.retry')}</button></div>;
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
        <button className="cd-btn" disabled={save.isPending} onClick={() => save.mutate({ op: 'save', taskId: id, saved: false })}>{t('coding.saved.remove')}</button>
      </li>;
    })}</ul>
  </section>;
}

export default function Collection() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tabs = ['questions', 'challenges'] as const;
  const selected = tabs.find(tab => tab === params.get('tab')) ?? 'questions';
  return <div className="cd-page ss-pop">
    <header><Kicker>{t('collection.heading')}</Kicker><h1>{t('collection.heading')}</h1><p className="cd-lead">{t('collection.subtitle')}</p></header>
    <nav className="cd-actions" aria-label={t('collection.heading')}>{tabs.map(tab => <button key={tab} type="button" className={`cd-btn${selected === tab ? ' cd-btn--primary' : ''}`} aria-current={selected === tab ? 'page' : undefined} onClick={() => setParams({ tab })}>{t(`collection.${tab}`)}</button>)}</nav>
    <Suspense fallback={<LoadingScreen label={t('common.loading')} />}>{selected === 'questions' ? <Flashcards embedded /> : <SavedChallenges />}</Suspense>
  </div>;
}
