// A short practice session (issue #159).
//
// The learner picks how long they have; the server composes a queue from work
// that is already due, already saved and already eligible, and remembers where
// they are so a resume lands in place. Every duration on this page is an
// estimate and is labelled as one. Choosing a session opens nothing: every item
// was already startable before the session existed.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { Kicker } from '../landing/LandingKit';
import { usePracticeSession, usePracticeSessionAction } from '../../lib/practice';
import { useIsCompactPractice } from '../../lib/useMediaQuery';
import { CODING_INDEX } from '../../../../shared/coding-index';
import { SESSION_MINUTES, type SessionMinutes } from '../../../../shared/practice-session';
import '../../coding/Coding.css';

export function PracticeSessionScreen() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const session = usePracticeSession(isAuthenticated);
  const act = usePracticeSessionAction();
  // On a touch screen the queue prefers tasks that have an arrangement puzzle,
  // so the session is doable where an editor is not (issue #154).
  const touch = useIsCompactPractice();

  const byId = useMemo(() => new Map(CODING_INDEX.map((task) => [task.id, task])), []);
  const current = session.data?.session ?? null;
  const items = current?.taskIds ?? [];
  const estimate = items.reduce((sum, id) => sum + (byId.get(id)?.estimatedMinutes ?? 0), 0);

  if (!isAuthenticated) {
    return (
      <div className="cd-page ss-pop">
        <header>
          <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
          <h1>{t('coding.session.title')}</h1>
        </header>
        <p className="cd-note">{t('coding.signInHint')}</p>
      </div>
    );
  }

  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t('coding.session.title')}</h1>
        <p className="cd-lead">{t('coding.session.subtitle')}</p>
      </header>

      {session.isLoading && <p className="cd-note" role="status">{t('common.loading')}</p>}
      {session.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.loadError')}</p>}
      {act.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.library.error')}</p>}

      <div className="cd-chips" role="group" aria-label={t('coding.session.chooseLength')}>
        {(session.data?.available ?? [...SESSION_MINUTES]).map((minutes: SessionMinutes) => (
          <button
            key={minutes}
            type="button"
            className="cd-chip"
            disabled={act.isPending}
            onClick={() => act.mutate({ action: 'start', minutes, touch })}
          >
            {t('coding.session.minutes', { n: minutes })}
          </button>
        ))}
      </div>

      {current && items.length === 0 && <p className="cd-note" role="status">{t('coding.session.empty')}</p>}

      {current && items.length > 0 && (
        <>
          <p className="cd-note" role="status">
            {t('coding.session.estimate', { n: estimate })} · {t('coding.session.position', { n: Math.min(current.position + 1, items.length), total: items.length })}
          </p>
          <ol className="cd-rows">
            {items.map((id, index) => {
              const task = byId.get(id);
              const done = index < current.position;
              return (
                <li key={id} className="cd-row">
                  <span className="cd-row__title">
                    {task
                      ? <Link className="cd-link" to={`/coding/${task.track}/${task.id}`}>{task.title[lang] || task.title.en}</Link>
                      : <code>{id}</code>}
                  </span>
                  <span className="cd-row__meta">
                    <span>{t('coding.session.itemEstimate', { n: task?.estimatedMinutes ?? 0 })}</span>
                    {done && <span>{t('coding.status.passed')}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="cd-actions">
            <button type="button" className="cd-btn" disabled={act.isPending} onClick={() => act.mutate({ action: 'advance' })}>
              {t('coding.session.advance')}
            </button>
            <button type="button" className="cd-btn cd-btn--quiet" disabled={act.isPending} onClick={() => act.mutate({ action: 'finish' })}>
              {t('coding.session.finish')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
