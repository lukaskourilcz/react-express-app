// The leaderboard, Deep End v2.
//
// Three boards share one ranked-rows shape. The 30-day board is the default
// because it is the one a new learner can climb; the all-time board is one tab
// away and keeps its own sources; Today is the daily challenge. Every board
// ranks by correct answers, then accuracy (Today: correct answers, then time).
// Nothing here ranks by XP or by streak, and nothing here computes a rank: the
// server does, and this screen only draws what it was sent.
//
// A rank is always the number as text. The top three get a heavier ink disc,
// never a medal colour, so the order reads the same without colour. Nothing
// animates, so reduced motion has nothing to switch off.

import { useEffect, useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '@astryxdesign/core/Heading';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Kicker, SwimCta } from './landing/LandingKit';
import ErrorRetry from './ErrorRetry';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { useIsMobile, useMediaQuery } from '../lib/useMediaQuery';
import { getUserProfile, useAuth } from '../lib/auth';
import { ApiError, friendlyError } from '../lib/api';
import { useLeaderboard, type LeaderboardRequest } from '../lib/queries';
import type {
  CategoryLeaderboardEntry,
  LeaderboardDailyEntry,
  LeaderboardMe,
  LeaderboardResponse,
  WindowLeaderboardEntry,
} from '../lib/play';
import { visibleCategoryOptionsFor, categoryLabelKey } from '../lib/categories';
import { useActiveSubject, categoriesForSubject } from '../lib/subjects';
import './Leaderboard.css';

type Tab = '30d' | 'all' | 'today';

/** One drawn row, whichever board it came from. */
interface Row {
  key: string;
  rank: number;
  name: string;
  picture: string | null;
  /** The first numeric column: correct answers, or today's score. */
  first: string;
  /** The second numeric column: accuracy, or today's time. */
  second: string;
  /** The line under the name on a phone, where the second column has no room. */
  detail: string;
  isViewer: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

// The last board that loaded, per board, so opening this screen offline still
// shows something true with its age beside it. A per-viewer convenience: it
// may be missing or unreadable, and the screen works without it. The learner's
// own line is left out of it.
const CACHE_PREFIX = 'devshark:leaderboard:v1:';

interface CachedBoard {
  savedAt: number;
  data: LeaderboardResponse;
}

function readCachedBoard(key: string): CachedBoard | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedBoard>;
    if (typeof parsed?.savedAt !== 'number' || !Array.isArray(parsed.data?.entries)) return null;
    return parsed as CachedBoard;
  } catch {
    return null;
  }
}

function writeCachedBoard(key: string, data: LeaderboardResponse): void {
  try {
    const { me: _me, ...board } = data;
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data: board }));
  } catch {
    // Storage full, blocked or absent: the live board is unaffected.
  }
}

function isOffline(error: unknown): boolean {
  if (error instanceof ApiError && error.code === 'network') return true;
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function Leaderboard() {
  const t = useT();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Three equal segments leave "Last 30 days" too little room below 400px.
  const narrow = useMediaQuery('(max-width: 399.95px)');
  const subject = useActiveSubject();
  const { user } = useAuth();
  const profile = getUserProfile(user);
  const topics = visibleCategoryOptionsFor();
  const selectId = useId();

  const [tab, setTab] = useState<Tab>('30d');
  // '' is "All topics". The filter applies to the 30-day and all-time boards.
  const [category, setCategory] = useState('');
  const [windowUnavailable, setWindowUnavailable] = useState(false);
  const [date] = useState(today);

  const subjectCategories = categoriesForSubject(subject.id);
  const request: LeaderboardRequest =
    tab === '30d'
      ? { period: '30d', category: category || null, viewer: user?.id ?? null }
      : tab === 'today'
      ? { period: 'daily', date, categories: subjectCategories }
      : category
      ? { period: 'category', category }
      : { period: 'global', categories: subjectCategories };
  const cacheKey = `${request.period}:${request.period === '30d' || request.period === 'category' ? request.category ?? '' : ''}`;

  const { data, error, isLoading, fetchStatus, dataUpdatedAt, refetch } = useLeaderboard(request);
  const reload = () => void refetch();

  useEffect(() => {
    if (data && !error) writeCachedBoard(cacheKey, data);
  }, [data, error, cacheKey]);

  // Until migration 040 is applied the 30-day board does not exist. Say so and
  // show the all-time board rather than an error on the default tab.
  const missingWindow = tab === '30d' && error instanceof ApiError && error.code === 'rpc_missing';
  useEffect(() => {
    if (!missingWindow) return;
    setWindowUnavailable(true);
    setTab('all');
  }, [missingWindow]);

  // Offline shows up two ways: a request that failed on the network, or one
  // React Query holds back because the browser already reports no connection.
  const offline = fetchStatus === 'paused' || (!!error && isOffline(error));
  const stale: CachedBoard | null = offline
    ? data
      ? { savedAt: dataUpdatedAt, data }
      : readCachedBoard(cacheKey)
    : null;
  const board: LeaderboardResponse | null = offline ? stale?.data ?? null : error ? null : data ?? null;
  const me: LeaderboardMe | null = !error && !offline && tab === '30d' ? data?.me ?? null : null;

  const rows = board ? toRows(tab, board, t) : [];
  const viewerListed = rows.some((row) => row.isViewer);
  const pinned: Row | null =
    me && me.rank !== null && !viewerListed
      ? {
          key: 'you',
          rank: me.rank,
          name: profile.name?.trim() || t('leaderboard.you'),
          picture: profile.picture ?? null,
          first: String(me.correct),
          second: `${me.accuracy_pct}%`,
          detail: t('leaderboard.answersDetail', { answered: me.answered, accuracy: me.accuracy_pct }),
          isViewer: true,
        }
      : null;
  const showNoActivity = !!me && me.rank === null && rows.length > 0;

  const periodLabel =
    tab === '30d' ? t('leaderboard.last30') : tab === 'all' ? t('leaderboard.allTime') : t('leaderboard.today');
  const topicLabel = category ? t(categoryLabelKey(category)) : t('leaderboard.allTopics');
  const caption = tab === 'today' ? periodLabel : t('leaderboard.caption', { period: periodLabel, topic: topicLabel });
  const headers =
    tab === 'today'
      ? [t('leaderboard.scoreHeader'), t('leaderboard.timeHeader')]
      : [t('leaderboard.correctHeader'), t('leaderboard.accuracyHeader')];
  const scope =
    tab === '30d' ? t('leaderboard.scope30d') : tab === 'all' ? t('leaderboard.scopeAllTime') : t('leaderboard.scopeToday');

  const emptyText =
    tab === '30d'
      ? category
        ? t('leaderboard.empty30dTopic', { label: topicLabel })
        : t('leaderboard.empty30d')
      : tab === 'all'
      ? category
        ? t('leaderboard.noCategoryAttempts', { label: topicLabel })
        : t('leaderboard.emptyAllTime')
      : t('leaderboard.emptyToday');

  let body: ReactNode;
  if (missingWindow || (isLoading && !board)) {
    body = <BoardSkeleton label={t('leaderboard.loading')} />;
  } else if ((error || offline) && !board) {
    body = <ErrorRetry message={offline ? t('leaderboard.offline') : friendlyError(error)} onRetry={reload} />;
  } else if (rows.length === 0) {
    body = (
      <div className="lb-board ss-panel lb-empty">
        <p className="lb-empty__text">{emptyText}</p>
        <SwimCta label={t('leaderboard.emptyCta')} onClick={() => navigate('/quiz')} />
      </div>
    );
  } else {
    body = (
      <div className="lb-board ss-panel">
        {isMobile ? (
          <MobileBoard rows={rows} pinned={pinned} caption={caption} firstLabel={headers[0]} />
        ) : (
          <TableBoard rows={rows} pinned={pinned} caption={caption} headers={headers} />
        )}
        {showNoActivity && <p className="lb-note">{t('leaderboard.noActivity')}</p>}
      </div>
    );
  }

  return (
    <div className="de-page lb">
      <header className="lb-head">
        <Kicker>{t('leaderboard.title')}</Kicker>
        <Heading level={1} type="display-3">
          {t('leaderboard.heading')}
        </Heading>
        <p className="lb-lede">{t('leaderboard.rule')}</p>
      </header>

      <div className="lb-controls">
        <SegmentedControl value={tab} onChange={(value) => setTab(value as Tab)} label={t('leaderboard.period')} layout="fill">
          <SegmentedControlItem value="30d" label={narrow ? t('leaderboard.last30Short') : t('leaderboard.last30')} />
          <SegmentedControlItem value="all" label={t('leaderboard.allTime')} />
          <SegmentedControlItem value="today" label={t('leaderboard.today')} />
        </SegmentedControl>
        {tab !== 'today' && (
          <div className="lb-filter">
            <label className="lb-filter__label" htmlFor={selectId}>
              {t('leaderboard.topic')}
            </label>
            <select id={selectId} className="lb-select" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t('leaderboard.allTopics')}</option>
              {topics.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {t(categoryLabelKey(topic.value))}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="lb-scope">{scope}</p>
        {windowUnavailable && tab === 'all' && (
          <p className="lb-scope" role="status">
            {t('leaderboard.windowUnavailable')}
          </p>
        )}
      </div>

      {stale && board && (
        <div className="lb-stale" role="alert">
          <span>
            {t('leaderboard.offlineStale', {
              time: new Date(stale.savedAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
            })}
          </span>
          <Button size="md" variant="ghost" label={t('quiz.retry')} onClick={reload} />
        </div>
      )}

      {body}
    </div>
  );
}

function toRows(tab: Tab, board: LeaderboardResponse, t: ReturnType<typeof useT>): Row[] {
  if (tab === '30d') {
    return (board.entries as WindowLeaderboardEntry[]).map((entry, index) => ({
      key: `${entry.rank}-${index}`,
      rank: typeof entry.rank === 'number' ? entry.rank : index + 1,
      name: entry.display_name,
      picture: entry.picture ?? null,
      first: String(entry.correct),
      second: `${entry.accuracy_pct}%`,
      detail: t('leaderboard.answersDetail', { answered: entry.answered, accuracy: entry.accuracy_pct }),
      isViewer: entry.is_viewer === true,
    }));
  }
  if (tab === 'today') {
    return (board.entries as LeaderboardDailyEntry[]).map((entry, index) => ({
      key: String(index),
      rank: index + 1,
      name: entry.display_name,
      picture: entry.picture ?? null,
      first: `${entry.correct}/${entry.total}`,
      second: formatMs(entry.duration_ms),
      detail: formatMs(entry.duration_ms),
      isViewer: false,
    }));
  }
  // The subject's all-time board and a single category's board share a shape.
  return (board.entries as CategoryLeaderboardEntry[]).map((entry, index) => ({
    key: String(index),
    rank: index + 1,
    name: entry.display_name,
    picture: entry.picture ?? null,
    first: String(entry.total_correct),
    second: `${entry.accuracy_pct}%`,
    detail: t('leaderboard.answersDetail', { answered: entry.total_questions, accuracy: entry.accuracy_pct }),
    isViewer: false,
  }));
}

function RankDisc({ rank, label }: { rank: number; label?: string }) {
  return (
    <span className={`lb-rank${rank <= 3 ? ' lb-rank--top' : ''}`}>
      {label && <span className="lb-vh">{label} </span>}
      {rank}
    </span>
  );
}

function Who({ row }: { row: Row }) {
  return (
    <span className="lb-who">
      <Avatar src={row.picture ?? undefined} name={row.name} size="small" />
      <Name row={row} />
    </span>
  );
}

/** The name, and "You" beside it on the learner's own row — unless the name
 *  already is "You", which is what a pinned row without a profile name shows. */
function Name({ row }: { row: Row }) {
  const t = useT();
  const you = t('leaderboard.you');
  return (
    <>
      <span className="lb-name">{row.name}</span>
      {row.isViewer && row.name !== you && <span className="lb-you">{you}</span>}
    </>
  );
}

function TableBoard({ rows, pinned, caption, headers }: { rows: Row[]; pinned: Row | null; caption: string; headers: string[] }) {
  const t = useT();
  const line = (row: Row) => (
    <tr key={row.key} className={row.isViewer ? 'is-viewer' : undefined} aria-current={row.isViewer ? 'true' : undefined}>
      <td className="lb-col-rank">
        <RankDisc rank={row.rank} />
      </td>
      <td>
        <Who row={row} />
      </td>
      <td className="lb-num lb-score">{row.first}</td>
      <td className="lb-num">{row.second}</td>
    </tr>
  );
  return (
    <table className="lb-table">
      <caption className="lb-vh">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="lb-col-rank">{t('leaderboard.rank')}</th>
          <th scope="col">{t('leaderboard.learner')}</th>
          <th scope="col" className="lb-num lb-col-num">{headers[0]}</th>
          <th scope="col" className="lb-num lb-col-num">{headers[1]}</th>
        </tr>
      </thead>
      <tbody>{rows.map(line)}</tbody>
      {pinned && <tfoot>{line(pinned)}</tfoot>}
    </table>
  );
}

function MobileBoard({ rows, pinned, caption, firstLabel }: { rows: Row[]; pinned: Row | null; caption: string; firstLabel: string }) {
  const t = useT();
  const card = (row: Row) => (
    <li key={row.key} className={`lb-card${row.isViewer ? ' is-viewer' : ''}`} aria-current={row.isViewer ? 'true' : undefined}>
      <RankDisc rank={row.rank} label={t('leaderboard.rank')} />
      <span className="lb-card__avatar">
        <Avatar src={row.picture ?? undefined} name={row.name} size="small" />
      </span>
      <span className="lb-card__main">
        <span className="lb-card__name">
          <Name row={row} />
        </span>
        <span className="lb-card__detail">{row.detail}</span>
      </span>
      <span className="lb-card__score">
        <span className="lb-score">{row.first}</span>
        <span className="lb-card__label">{firstLabel}</span>
      </span>
    </li>
  );
  return (
    <>
      <ol className="lb-cards" aria-label={caption}>
        {rows.map(card)}
      </ol>
      {pinned && (
        <div className="lb-pinned">
          <p className="lb-pinned__label">{t('leaderboard.yourPlace')}</p>
          <ul className="lb-cards">{card(pinned)}</ul>
        </div>
      )}
    </>
  );
}

function BoardSkeleton({ label }: { label: string }) {
  return (
    <div className="lb-board ss-panel" aria-busy="true">
      <span className="lb-vh" role="status">
        {label}
      </span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="lb-skeleton" aria-hidden="true">
          <Skeleton width={32} height={32} radius="rounded" />
          <Skeleton width={32} height={32} radius="rounded" />
          <div className="lb-skeleton__name">
            <Skeleton width="60%" height={16} />
          </div>
          <Skeleton width={48} height={20} />
        </div>
      ))}
    </div>
  );
}

function formatMs(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export default Leaderboard;
