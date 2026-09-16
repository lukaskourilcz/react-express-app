/**
 * The weekly league — the fourth view on the leaderboard.
 *
 * The three boards beside it have no end. This one does: twenty to thirty
 * people who have been learning at a similar rate, one week, and a line under
 * it on Sunday night. The score is the same thing every other board here ranks
 * by — correct answers — so nothing new is being measured and nothing is won.
 *
 * What the tier is not, and the copy says so on screen rather than only here: a
 * tier changes no access, no content, no explanation, no path, no XP, no token,
 * no hint and no AI. Every question in this product is free at tier 1 and free
 * at tier 5.
 *
 * Every number on this screen was computed by the server from results the
 * server graded. This component sorts nothing, scores nothing and ranks nothing;
 * the order of `entries` is the order the database returned.
 *
 * Who is signed in is the server's answer too. A signed-out read comes back 401
 * and the sign-in state is rendered from that, rather than from a second copy of
 * the session kept here that could disagree with the one the request used.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { ApiError, friendlyError } from '../lib/api';
import { useActiveSubject } from '../lib/subjects';
import { useLeague } from '../lib/queries';
import { leagueWeekEnd, setLeagueOptout, type LeagueEntry } from '../lib/league';
import ErrorRetry from './ErrorRetry';
import './League.css';

export function LeaguePanel() {
  const t = useT();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const subject = useActiveSubject();
  const { data, isLoading, error, refetch } = useLeague(subject.id);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const changeMembership = async (optedOut: boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      await setLeagueOptout(optedOut);
      await refetch();
    } catch (err) {
      setSaveError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <p className="lg-note" role="status">{t('league.loading')}</p>;
  }

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;
    // Signed out and "not migrated yet" are both honest answers rather than
    // failures, so neither of them shouts. Anything else is a real error and
    // gets the alert and the retry.
    if (status === 401 || status === 403) {
      return (
        <div className="lg-card">
          <p className="lg-note">{t('league.signedOut')}</p>
        </div>
      );
    }
    if (status === 503) {
      return (
        <div className="lg-card">
          <p className="lg-note">{t('league.unavailable')}</p>
        </div>
      );
    }
    return <ErrorRetry message={friendlyError(error)} onRetry={() => void refetch()} />;
  }

  if (!data) return null;

  if (data.optedOut) {
    return (
      <div className="lg">
        <div className="lg-card">
          <p className="lg-note">{t('league.optedOut')}</p>
          <div className="lg-optout">
            <button
              type="button"
              className="lg-button"
              disabled={saving}
              onClick={() => void changeMembership(false)}
            >
              {t('league.rejoin')}
            </button>
          </div>
          {saveError && <p className="lg-note lg-note--error" role="alert">{saveError}</p>}
        </div>
      </div>
    );
  }

  const weekEnd = leagueWeekEnd(data.weekStart);
  const deadline = weekEnd
    ? weekEnd.toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      })
    : null;

  return (
    <div className="lg">
      <div className="lg-card">
        <div className="lg-head">
          <h2 className="lg-tier">
            {data.tier ? t('league.tier', { tier: data.tier }) : t('league.title')}
          </h2>
          {deadline && <span className="lg-deadline">{t('league.deadline', { date: deadline })}</span>}
        </div>
        <p className="lg-note">{t('league.intro')}</p>

        {data.entries.length === 0 ? (
          <>
            <p className="lg-note">{t('league.empty')}</p>
            <div className="lg-optout">
              <Button variant="primary" size="sm" label={t('league.emptyCta')} onClick={() => navigate('/quiz')} />
            </div>
          </>
        ) : (
          <ol className="lg-list" aria-label={t('league.listAria')}>
            {data.entries.map((entry, index) => (
              <LeagueRow key={`${entry.displayName}-${index}`} entry={entry} rank={index + 1} />
            ))}
          </ol>
        )}
      </div>

      <div className="lg-card">
        <p className="lg-note">{t('league.fairness')}</p>
        <div className="lg-optout">
          <button
            type="button"
            className="lg-button"
            disabled={saving}
            onClick={() => void changeMembership(true)}
          >
            {t('league.leave')}
          </button>
          <span className="lg-note">{t('league.leaveHint')}</span>
        </div>
        {saveError && <p className="lg-note lg-note--error" role="alert">{saveError}</p>}
      </div>
    </div>
  );
}

function LeagueRow({ entry, rank }: { entry: LeagueEntry; rank: number }) {
  const t = useT();
  return (
    <li className="lg-row" data-self={entry.isSelf ? 'true' : 'false'} aria-current={entry.isSelf ? 'true' : undefined}>
      <span className="lg-rank">{rank}</span>
      <span className="lg-who">
        <Avatar src={entry.picture ?? undefined} name={entry.displayName} size="small" />
        <span className="lg-name">{entry.displayName}</span>
        {/* The reader's own row says so in words, so the tint beside it is a
            second cue and never the only one. */}
        {entry.isSelf && <span className="lg-you">{t('league.you')}</span>}
      </span>
      <span className="lg-score">
        <span className="lg-correct">{entry.correct}</span>
        <span className="lg-accuracy">
          {t('league.answered', { answered: entry.answered, accuracy: entry.accuracyPct })}
        </span>
      </span>
    </li>
  );
}

export default LeaguePanel;
