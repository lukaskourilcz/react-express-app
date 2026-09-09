// The Coding section: home, one track, one task, and the review queue.
// devShark-only routes; the App gates them like /roadmap and /typing.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { readString, removeStored, writeString } from '../../lib/storage';
import { Kicker } from '../landing/LandingKit';
import { WaterlineProgress } from '../SharkFin';
import { CodingWorkbench } from '../../coding/CodingWorkbench';
import { DesignRunner } from '../../coding/DesignRunner';
import { codingKeys, saveCodingDraft, useCodingProgress, useCodingTask } from '../../coding/api';
import { useBookmarks, useSaveChallenge, usePracticeSession, useStartSession, useAdvanceSession } from '../../coding/practice';
import { PRACTICE_SESSION_MINUTES } from '../../../../shared/coding-api';
import { CODING_INDEX } from '../../../../shared/coding-index';
import {
  CODING_SECTION_TRACKS,
  CODING_TECHNIQUE_GROUPS,
  CODING_TIERS,
  formatOf,
  isCodingSectionTrack,
  isCodingTrack,
  isRetiredSectionTrack,
  tierLockReason,
  tierUnlocked,
  type CodingTaskSummary,
  type CodingTechniqueGroup,
  type CodingTier,
  type CodingTrack,
} from '../../../../shared/coding-catalog';
import type { CodingProgressResponse, CodingTaskProgress, CodingVerdictResponse } from '../../../../shared/coding-api';
import '../../coding/Coding.css';

type Status = 'open' | 'in_progress' | 'passed' | 'revealed' | 'due' | 'locked';

const draftKey = (id: string) => `devshark:coding:draft:${id}`;
const GROUPS = Object.keys(CODING_TECHNIQUE_GROUPS) as CodingTechniqueGroup[];

// Everything the section offers. System design tasks stay in CODING_INDEX so a
// passed one keeps its record and the FDE specialization can still assign it;
// they simply never appear in discovery, counts, filters or the review queue.
const SECTION_INDEX = CODING_INDEX.filter((task) => isCodingSectionTrack(task.track));

/** Shown instead of a retired track's list or task. It explains where the
 * material went and links there — it never opens the exercise. */
function RetiredTrackNotice({ track }: { track: CodingTrack }) {
  const { t } = useLanguage();
  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t(`coding.track.${track}` as never)}</h1>
      </header>
      <p className="cd-note" role="status">{t('coding.retired.body')}</p>
      <div className="cd-actions">
        <Link className="cd-btn cd-btn--primary" to="/learn?topic=system-design">{t('coding.retired.toLearn')}</Link>
        <Link className="cd-btn" to="/roadmap/specializations/fde">{t('coding.retired.toFde')}</Link>
        <Link className="cd-btn" to="/coding">{t('coding.retired.toCoding')}</Link>
      </div>
    </div>
  );
}

function useStatuses(progress: CodingProgressResponse | undefined) {
  const passed = useMemo(() => new Set(Object.entries(progress?.tasks ?? {}).filter(([, p]) => p.status === 'passed').map(([id]) => id)), [progress]);
  const due = useMemo(() => new Set(progress?.due ?? []), [progress]);
  const cleared = progress?.javascriptLevelsCleared ?? 0;
  const unlocked = useCallback((task: CodingTaskSummary) => tierUnlocked({ track: task.track, tier: task.tier, progress: { passed }, tasks: CODING_INDEX, javascriptLevelsCleared: cleared }), [passed, cleared]);
  const lockReason = useCallback((track: CodingTrack, tier: CodingTier) => tierLockReason({ track, tier, progress: { passed }, tasks: CODING_INDEX, javascriptLevelsCleared: cleared }), [passed, cleared]);
  const statusOf = useCallback((task: CodingTaskSummary): Status => {
    if (!unlocked(task)) return 'locked';
    if (due.has(task.id)) return 'due';
    const row: CodingTaskProgress | undefined = progress?.tasks[task.id];
    if (!row) return 'open';
    return row.status;
  }, [unlocked, due, progress]);
  return { passed, due, statusOf, unlocked, lockReason };
}

const nextOpenTask = (tasks: readonly CodingTaskSummary[], statusOf: (t: CodingTaskSummary) => Status, after?: string): CodingTaskSummary | null => {
  const start = after ? tasks.findIndex((t) => t.id === after) + 1 : 0;
  const ordered = [...tasks.slice(start), ...tasks.slice(0, start)];
  return ordered.find((t) => { const s = statusOf(t); return s === 'open' || s === 'in_progress' || s === 'due'; }) ?? null;
};

function StatusText({ status }: { status: Status }) {
  const { t } = useLanguage();
  const glyph = status === 'passed' ? '✓' : status === 'due' ? '↻' : status === 'locked' ? '●' : status === 'revealed' ? '◐' : status === 'in_progress' ? '◔' : '○';
  return <span className={`cd-row__status cd-status--${status}`}><span aria-hidden>{glyph}</span>{t(`coding.status.${status}` as never)}</span>;
}

/** A star that saves a challenge for later. Saving records interest, never
 * access: a locked item stays in the list with its explanation and still
 * refuses to open. */
function SaveButton({ taskId, saved, onToggle, busy }: { taskId: string; saved: boolean; onToggle: (next: boolean) => void; busy: boolean }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className={`cd-save${saved ? ' cd-save--on' : ''}`}
      aria-pressed={saved}
      disabled={busy}
      title={t(saved ? 'coding.saved.remove' : 'coding.saved.add')}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); onToggle(!saved); }}
    >
      <span aria-hidden>{saved ? '★' : '☆'}</span>
      <span className="cd-visually-hidden">{t(saved ? 'coding.saved.remove' : 'coding.saved.add', { id: taskId })}</span>
    </button>
  );
}

function TaskRow({ task, status, saved, onSave, saving }: {
  task: CodingTaskSummary;
  status: Status;
  saved?: boolean;
  onSave?: (taskId: string, next: boolean) => void;
  saving?: boolean;
}) {
  const { t, lang } = useLanguage();
  const locked = status === 'locked';
  const inner = (
    <>
      <span className="cd-row__title">{task.title[lang] || task.title.en}</span>
      <span className="cd-row__meta">
        {task.level > 0 && <span>{t('coding.level', { n: task.level })}</span>}
        <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
        {formatOf(task) === 'debug' && <span className="cd-tag cd-tag--format">{t('coding.format.debug')}</span>}
        {task.focus.slice(0, 3).map((tag) => <span key={tag} className="cd-tag">{tag}</span>)}
      </span>
      <StatusText status={status} />
    </>
  );
  const save = onSave
    ? <SaveButton taskId={task.id} saved={saved === true} busy={saving === true} onToggle={(next) => onSave(task.id, next)} />
    : null;
  return (
    <li className="cd-row-item">
      {locked
        ? <div className="cd-row" aria-disabled="true">{inner}</div>
        : <Link className="cd-row" to={`/coding/${task.track}/${task.id}`}>{inner}</Link>}
      {save}
    </li>
  );
}


/** A short session: pick how long you have, get a queue of work you can already
 * open. The scheduler is the existing one — review that is due comes first,
 * then new work — so this reorders practice rather than widening it. Times are
 * estimates and the panel says so. */
function PracticeSessionPanel({ signedIn }: { signedIn: boolean }) {
  const { t, lang } = useLanguage();
  const session = usePracticeSession(signedIn);
  const start = useStartSession();
  const advance = useAdvanceSession();
  const active = session.data?.session ?? null;
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) return null;

  const current = active && active.position < active.queue.length ? active.queue[active.position] : null;
  const currentTask = current ? CODING_INDEX.find((task) => task.id === current) : null;

  const begin = (minutes: (typeof PRACTICE_SESSION_MINUTES)[number]) => {
    setError(null);
    start.mutate({ minutes }, {
      onError: (cause) => setError(cause instanceof ApiError && cause.code === 'nothing_eligible'
        ? t('coding.session.nothing')
        : t('coding.session.failed')),
    });
  };

  return (
    <section className="cd-session" aria-label={t('coding.session.title')}>
      <Kicker as="h2">{t('coding.session.title')}</Kicker>
      {active && currentTask ? (
        <div className="cd-session__active">
          <p>
            {t('coding.session.progress', { done: active.position, total: active.queue.length })}
            {' · '}
            {t('coding.session.estimate', { n: active.estimatedMinutes })}
          </p>
          <div className="cd-actions">
            <Link className="cd-btn cd-btn--primary" to={`/coding/${currentTask.track}/${currentTask.id}`}>
              {t('coding.session.continue', { title: currentTask.title[lang] || currentTask.title.en })}
            </Link>
            <button
              type="button"
              className="cd-btn cd-btn--quiet"
              disabled={advance.isPending}
              onClick={() => advance.mutate({ sessionId: active.sessionId, status: 'abandoned' })}
            >
              {t('coding.session.end')}
            </button>
          </div>
        </div>
      ) : (
        <div className="cd-actions">
          {PRACTICE_SESSION_MINUTES.map((minutes) => (
            <button key={minutes} type="button" className="cd-btn" disabled={start.isPending} onClick={() => begin(minutes)}>
              {t('coding.session.start', { n: minutes })}
            </button>
          ))}
        </div>
      )}
      <p className="cd-shortcuts">{t('coding.session.note')}</p>
      {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}
    </section>
  );
}


/** Saved challenges and the learner's own named lists.
 *
 * A saved item that is not open yet stays here with an explanation rather than
 * disappearing — the history is theirs — and the row still refuses to launch,
 * because launching goes through the same eligibility check as everything
 * else. */
function SavedPanel({ signedIn, statusOf }: { signedIn: boolean; statusOf: (task: CodingTaskSummary) => Status }) {
  const { t } = useLanguage();
  const bookmarks = useBookmarks(signedIn);
  const save = useSaveChallenge();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) return null;
  if (bookmarks.isLoading) return <p className="cd-note" role="status">{t('common.loading')}</p>;
  if (bookmarks.isError) return <p className="cd-note cd-note--error" role="alert">{t('coding.loadError')}</p>;

  const saved = (bookmarks.data?.saved ?? [])
    .map((id) => SECTION_INDEX.find((task) => task.id === id))
    .filter((task): task is CodingTaskSummary => Boolean(task));
  const collections = bookmarks.data?.collections ?? [];

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    save.mutate({ op: 'collection-upsert', name: trimmed }, {
      onSuccess: () => setName(''),
      onError: (cause) => setError(cause instanceof ApiError && cause.code === 'name_taken'
        ? t('coding.collections.nameTaken')
        : t('coding.collections.failed')),
    });
  };

  return (
    <section className="cd-saved" aria-labelledby="cd-saved-title">
      <Kicker as="h2" id="cd-saved-title">{t('coding.saved.title')}</Kicker>
      {saved.length === 0 ? (
        <p className="cd-note">{t('coding.saved.empty')}</p>
      ) : (
        <ul className="cd-rows">
          {saved.map((task) => {
            const status = statusOf(task);
            return (
              <li key={task.id} className="cd-saved__row">
                <TaskRow
                  task={task}
                  status={status}
                  saved
                  saving={save.isPending}
                  onSave={(taskId, next) => save.mutate({ op: 'save', taskId, saved: next })}
                />
                {status === 'locked' && <p className="cd-shortcuts">{t('coding.saved.lockedNote')}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="cd-saved__heading">{t('coding.collections.title')}</h3>
      <ul className="cd-collections">
        {collections.map((collection) => (
          <li key={collection.collectionId}>
            <span className="cd-collections__name">{collection.name}</span>
            <span className="cd-collections__count">{t('coding.collections.count', { n: collection.taskIds.length })}</span>
            <button
              type="button"
              className="cd-btn cd-btn--quiet"
              disabled={save.isPending}
              onClick={() => save.mutate({ op: 'collection-delete', collectionId: collection.collectionId })}
            >
              {t('coding.collections.delete')}
            </button>
          </li>
        ))}
      </ul>
      <div className="cd-actions">
        <label className="cd-visually-hidden" htmlFor="cd-collection-name">{t('coding.collections.newLabel')}</label>
        <input
          id="cd-collection-name"
          type="text"
          maxLength={60}
          value={name}
          placeholder={t('coding.collections.newLabel')}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); create(); } }}
        />
        <button type="button" className="cd-btn" disabled={save.isPending || name.trim() === ''} onClick={create}>
          {t('coding.collections.create')}
        </button>
      </div>
      {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}
    </section>
  );
}

/* ── /coding ──────────────────────────────────────────────────────────── */
export function CodingHome() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { passed, statusOf } = useStatuses(progress.data);
  const next = useMemo(() => nextOpenTask(SECTION_INDEX, statusOf), [statusOf]);
  const dueCount = useMemo(() => (progress.data?.due ?? []).filter((id) => SECTION_INDEX.some((task) => task.id === id)).length, [progress.data]);

  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker>{t('coding.kicker')}</Kicker>
        <h1>{t('coding.title')}</h1>
        <p className="cd-lead">{t('coding.subtitle')}</p>
      </header>
      {!isAuthenticated && <p className="cd-note">{t('coding.signInHint')}</p>}
      <div className="cd-continue">
        <div>
          <p style={{ margin: 0, fontWeight: 650 }}>{next ? t('coding.continueWith', { title: next.title[lang] || next.title.en }) : t('coding.allDone')}</p>
          {dueCount > 0 && <p style={{ margin: '4px 0 0' }}><Link className="cd-link" to="/coding/review">{t('coding.review.count', { n: dueCount })}</Link></p>}
        </div>
        {next && <Link className="cd-btn cd-btn--primary" to={`/coding/${next.track}/${next.id}`}>{t('coding.continue')}</Link>}
      </div>
      <PracticeSessionPanel signedIn={isAuthenticated} />
      <SavedPanel signedIn={isAuthenticated} statusOf={statusOf} />
      <section aria-label={t('coding.title')} className="cd-tracks">
        {CODING_SECTION_TRACKS.map((track) => {
          const tasks = SECTION_INDEX.filter((task) => task.track === track);
          const done = tasks.filter((task) => passed.has(task.id)).length;
          return (
            <Link key={track} className="cd-track ss-lift" to={`/coding/${track}`}>
              <div className="cd-track__title">
                <h2>{t(`coding.track.${track}` as never)}</h2>
                <span className="cd-track__count">{t('coding.progress', { passed: done, total: tasks.length })}</span>
              </div>
              <WaterlineProgress value={tasks.length ? (100 * done) / tasks.length : 0} label={t('coding.progress', { passed: done, total: tasks.length })} />
              <p className="cd-track__blurb">{t(`coding.trackBlurb.${track}` as never)}</p>
            </Link>
          );
        })}
      </section>
      {/* Ten technique groups, each one a row that says what it is rather than
          a pill that says only its name and a number. The tag count is the
          honest measure of breadth; the sentence is what makes the name mean
          something to a learner who has not met it yet. */}
      <section aria-labelledby="cd-techniques">
        <Kicker as="h2" id="cd-techniques">{t('coding.techniques')}</Kicker>
        <p className="cd-lead">{t('coding.techniquesLead')}</p>
        <div className="cd-techniques">
          {GROUPS.map((group) => {
            const tags = CODING_TECHNIQUE_GROUPS[group] as readonly string[];
            const counts = new Map<CodingTrack, number>();
            for (const task of SECTION_INDEX) if (task.focus.some((tag) => tags.includes(tag))) counts.set(task.track, (counts.get(task.track) ?? 0) + 1);
            const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
            if (!best) return null;
            const total = [...counts.values()].reduce((a, b) => a + b, 0);
            return (
              <Link key={group} className="cd-technique" to={`/coding/${best[0]}?group=${group}`}>
                <span className="cd-technique__head">
                  <span className="cd-technique__name">{t(`coding.group.${group}` as never)}</span>
                  <span className="cd-technique__count">{t('coding.techniqueCount', { n: total })}</span>
                </span>
                <span className="cd-technique__blurb">{t(`coding.groupBlurb.${group}` as never)}</span>
                <span className="cd-technique__tags">{t('coding.techniqueTags', { n: tags.length })}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ── /coding/:track ──────────────────────────────────────────────────── */
export function CodingTrackScreen() {
  const { t, lang } = useLanguage();
  const { track: trackParam } = useParams();
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { passed, statusOf, lockReason } = useStatuses(progress.data);
  const track = isCodingTrack(trackParam) ? trackParam : null;
  const group = params.get('group');
  const statusFilter = params.get('status') ?? 'all';
  // Every filter lives in the URL, so a filtered list is a link a learner can
  // keep, share with themselves on another device, or reload without losing.
  const query = params.get('q') ?? '';
  const difficulty = params.get('tier') ?? 'all';
  const duration = params.get('time') ?? 'all';
  const format = params.get('format') ?? 'all';
  const savedOnly = params.get('saved') === '1';
  const bookmarks = useBookmarks(isAuthenticated);
  const savedIds = useMemo(() => new Set(bookmarks.data?.saved ?? []), [bookmarks.data]);
  const save = useSaveChallenge();
  const onSave = useCallback((taskId: string, next: boolean) => {
    save.mutate({ op: 'save', taskId, saved: next });
  }, [save]);

  const tasks = useMemo(() => SECTION_INDEX.filter((task) => task.track === track), [track]);
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => tasks.filter((task) => {
    if (group && group in CODING_TECHNIQUE_GROUPS) {
      const tags = CODING_TECHNIQUE_GROUPS[group as CodingTechniqueGroup] as readonly string[];
      if (!task.focus.some((tag) => tags.includes(tag))) return false;
    }
    if (needle) {
      // Title in either language, plus the technique tags: the words a learner
      // actually remembers about a challenge.
      const haystack = `${task.title.en} ${task.title.cs} ${task.focus.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (difficulty !== 'all' && String(task.tier) !== difficulty) return false;
    if (duration === 'short' && task.estimatedMinutes > 10) return false;
    if (duration === 'medium' && (task.estimatedMinutes <= 10 || task.estimatedMinutes > 25)) return false;
    if (duration === 'long' && task.estimatedMinutes <= 25) return false;
    // Format is what the learner does (write it, or fix it); verify is how it
    // is graded. The filter offers both, because they answer different questions.
    if (format === 'debug' && formatOf(task) !== 'debug') return false;
    if (format !== 'all' && format !== 'debug' && task.verify !== format) return false;
    if (savedOnly && !savedIds.has(task.id)) return false;
    if (statusFilter === 'all') return true;
    const status = statusOf(task);
    if (statusFilter === 'passed') return status === 'passed';
    if (statusFilter === 'due') return status === 'due';
    return status === 'open' || status === 'in_progress' || status === 'revealed';
  }), [tasks, group, needle, difficulty, duration, format, savedOnly, savedIds, statusFilter, statusOf]);
  const filtersOn = Boolean(group) || needle !== '' || difficulty !== 'all' || duration !== 'all'
    || format !== 'all' || savedOnly || statusFilter !== 'all';
  const groupsHere = useMemo(() => GROUPS.filter((g) => tasks.some((task) => task.focus.some((tag) => (CODING_TECHNIQUE_GROUPS[g] as readonly string[]).includes(tag)))), [tasks]);
  if (track && isRetiredSectionTrack(track)) return <RetiredTrackNotice track={track} />;
  if (!track) return <div className="cd-page"><p className="cd-note cd-note--error">{t('error.notFound')}</p><Link className="cd-btn" to="/coding">{t('coding.verdict.back')}</Link></div>;
  const done = tasks.filter((task) => passed.has(task.id)).length;
  const tiers = [1, 2, 3, 4, 5].filter((tier) => filtered.some((task) => task.tier === tier)) as CodingTier[];
  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker>{t('coding.kicker')} · <Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t(`coding.track.${track}` as never)}</h1>
        <p className="cd-lead">{t(`coding.trackBlurb.${track}` as never)}</p>
        <div style={{ marginTop: 12, maxWidth: 420 }}>
          <WaterlineProgress value={tasks.length ? (100 * done) / tasks.length : 0} label={t('coding.progress', { passed: done, total: tasks.length })} />
          <p className="cd-track__count" style={{ margin: '6px 0 0' }}>{t('coding.progress', { passed: done, total: tasks.length })}</p>
        </div>
      </header>
      <div className="cd-chips" role="group" aria-label={t('coding.techniques')}>
        <button type="button" className="cd-chip" aria-pressed={!group} onClick={() => setFilter('group', null)}>{t('coding.techniques.all')}</button>
        {groupsHere.map((g) => <button key={g} type="button" className="cd-chip" aria-pressed={group === g} onClick={() => setFilter('group', g)}>{t(`coding.group.${g}` as never)}</button>)}
      </div>
      {isAuthenticated && (
        <div className="cd-chips" role="group" aria-label={t('coding.filter.status')}>
          {(['all', 'open', 'passed', 'due'] as const).map((value) => (
            <button key={value} type="button" className="cd-chip" aria-pressed={statusFilter === value} onClick={() => setFilter('status', value === 'all' ? null : value)}>
              {value === 'all' ? t('coding.filter.all') : value === 'open' ? t('coding.status.open') : value === 'passed' ? t('coding.status.passed') : t('coding.status.due')}
            </button>
          ))}
          <button type="button" className="cd-chip" aria-pressed={savedOnly} onClick={() => setFilter('saved', savedOnly ? null : '1')}>
            {t('coding.filter.saved')}
          </button>
        </div>
      )}

      <div className="cd-search">
        <label className="cd-visually-hidden" htmlFor={`${track}-search`}>{t('coding.filter.searchLabel')}</label>
        <input
          id={`${track}-search`}
          type="search"
          value={query}
          placeholder={t('coding.filter.searchPlaceholder')}
          onChange={(event) => setFilter('q', event.target.value || null)}
        />
        <label className="cd-visually-hidden" htmlFor={`${track}-tier`}>{t('coding.filter.difficulty')}</label>
        <select id={`${track}-tier`} value={difficulty} onChange={(event) => setFilter('tier', event.target.value === 'all' ? null : event.target.value)}>
          <option value="all">{t('coding.filter.difficulty')}</option>
          {([1, 2, 3, 4, 5] as CodingTier[]).map((tier) => (
            <option key={tier} value={String(tier)}>{t(`coding.tier.${CODING_TIERS[tier]}` as never)}</option>
          ))}
        </select>
        <label className="cd-visually-hidden" htmlFor={`${track}-time`}>{t('coding.filter.duration')}</label>
        <select id={`${track}-time`} value={duration} onChange={(event) => setFilter('time', event.target.value === 'all' ? null : event.target.value)}>
          <option value="all">{t('coding.filter.duration')}</option>
          <option value="short">{t('coding.filter.durationShort')}</option>
          <option value="medium">{t('coding.filter.durationMedium')}</option>
          <option value="long">{t('coding.filter.durationLong')}</option>
        </select>
        <label className="cd-visually-hidden" htmlFor={`${track}-format`}>{t('coding.filter.format')}</label>
        <select id={`${track}-format`} value={format} onChange={(event) => setFilter('format', event.target.value === 'all' ? null : event.target.value)}>
          <option value="all">{t('coding.filter.format')}</option>
          <option value="tests">{t('coding.filter.formatTests')}</option>
          <option value="checklist">{t('coding.filter.formatChecklist')}</option>
          <option value="debug">{t('coding.filter.formatDebug')}</option>
        </select>
        {filtersOn && (
          <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            {t('coding.filter.reset')}
          </button>
        )}
      </div>
      <p className="cd-shortcuts" role="status">{t('coding.filter.count', { shown: filtered.length, total: tasks.length })}</p>

      {filtered.length === 0 && <p className="cd-note">{filtersOn ? t('coding.filter.empty') : t('coding.empty')}</p>}
      {tiers.map((tier) => {
        const reason = lockReason(track, tier);
        return (
          <section key={tier} className="cd-tier" aria-labelledby={`cd-tier-${tier}`}>
            <div className="cd-tier__head">
              <h2 id={`cd-tier-${tier}`}>{t(`coding.tier.${CODING_TIERS[tier]}` as never)}</h2>
              {reason && <p className="cd-tier__lock">{t(`coding.lock.${reason}` as never)}</p>}
            </div>
            <ul className="cd-rows">
              {filtered.filter((task) => task.tier === tier).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  status={statusOf(task)}
                  saved={savedIds.has(task.id)}
                  onSave={isAuthenticated ? onSave : undefined}
                  saving={save.isPending}
                />
              ))}
            </ul>
          </section>
        );
      })}
      <p className="cd-shortcuts">{lang === 'cs' ? '' : ''}</p>
    </div>
  );
}

/* ── /coding/:track/:taskId ──────────────────────────────────────────── */
export function CodingTaskScreen() {
  const { t } = useLanguage();
  const { track: trackParam, taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { statusOf } = useStatuses(progress.data);
  const track = isCodingTrack(trackParam) ? trackParam : null;
  // A retired track's deep link explains where the material went. The task is
  // never fetched, so no session is issued and nothing is started.
  const retired = track !== null && isRetiredSectionTrack(track);
  const task = useCodingTask(retired ? undefined : taskId);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (task.data && track && task.data.task.track !== track) navigate(`/coding/${task.data.task.track}/${task.data.task.id}`, { replace: true });
  }, [task.data, track, navigate]);

  const onDraft = useCallback((code: string) => {
    if (!taskId) return;
    if (isAuthenticated) saveCodingDraft(taskId, code).catch(() => writeString(draftKey(taskId), code));
    else writeString(draftKey(taskId), code);
  }, [taskId, isAuthenticated]);

  const onVerdict = useCallback((verdict: CodingVerdictResponse) => {
    if (verdict.progress) void queryClient.invalidateQueries({ queryKey: codingKeys.progress() });
    if (verdict.verdict === 'passed' && taskId) removeStored(draftKey(taskId));
  }, [queryClient, taskId]);

  const onRetry = useCallback(() => {
    void task.refetch();
    setAttempt((n) => n + 1);
  }, [task]);

  if (retired && track) return <RetiredTrackNotice track={track} />;
  if (!track || !taskId) return <div className="cd-page"><p className="cd-note cd-note--error">{t('error.notFound')}</p></div>;
  if (task.isLoading) return <div className="cd-page"><p className="cd-note" role="status">{t('coding.loading')}</p></div>;
  if (task.isError || !task.data) {
    return (
      <div className="cd-page">
        <p className="cd-note cd-note--error" role="alert">{t('coding.loadError')}</p>
        <div className="cd-actions">
          <button type="button" className="cd-btn cd-btn--primary" onClick={() => void task.refetch()}>{t('coding.retry')}</button>
          <Link className="cd-btn" to={`/coding/${track}`}>{t('coding.verdict.back')}</Link>
        </div>
      </div>
    );
  }
  const data = task.data;
  if (isRetiredSectionTrack(data.task.track)) return <RetiredTrackNotice track={data.task.track} />;
  const trackTasks = SECTION_INDEX.filter((one) => one.track === data.task.track);
  const next = nextOpenTask(trackTasks, statusOf, data.task.id);
  const nextHref = next && next.id !== data.task.id ? `/coding/${next.track}/${next.id}` : null;
  const backHref = `/coding/${data.task.track}`;
  const localDraft = readString(draftKey(data.task.id));
  const initialCode = data.draft ?? localDraft ?? null;

  return (
    <div className="cd-page ss-pop">
      <nav aria-label={t('coding.title')}>
        <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link> · <Link className="cd-link" to={backHref}>{t(`coding.track.${data.task.track}` as never)}</Link></Kicker>
      </nav>
      {data.task.track === 'system-design'
        ? <DesignRunner key={`${data.task.id}-${attempt}`} task={data.task} session={data.session} locked={data.locked} signedIn={data.signedIn} mode="section" onVerdict={onVerdict} onRetry={onRetry} nextHref={nextHref} backHref={backHref} />
        : <CodingWorkbench key={`${data.task.id}-${attempt}`} task={data.task} session={data.session} locked={data.locked} signedIn={data.signedIn} initialCode={initialCode} mode="section" onDraft={onDraft} onVerdict={onVerdict} nextHref={nextHref} backHref={backHref} />}
    </div>
  );
}

/* ── /coding/review ──────────────────────────────────────────────────── */
export function CodingReviewScreen() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { statusOf } = useStatuses(progress.data);
  const due = (progress.data?.due ?? []).map((id) => SECTION_INDEX.find((task) => task.id === id)).filter((task): task is CodingTaskSummary => Boolean(task));
  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t('coding.review.title')}</h1>
        <p className="cd-lead">{t('coding.review.subtitle')}</p>
      </header>
      {!isAuthenticated && <p className="cd-note">{t('coding.signInHint')}</p>}
      {isAuthenticated && progress.isLoading && <p className="cd-note" role="status">{t('common.loading')}</p>}
      {isAuthenticated && progress.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.loadError')}</p>}
      {isAuthenticated && progress.data && due.length === 0 && <p className="cd-note">{t('coding.review.empty')}</p>}
      {due.length > 0 && <ul className="cd-rows">{due.map((task) => <TaskRow key={task.id} task={task} status={statusOf(task)} />)}</ul>}
    </div>
  );
}
