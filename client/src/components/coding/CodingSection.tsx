// The Coding section: home, one track, one task, and the review queue.
// devShark-only routes; the App gates them like /roadmap and /typing.
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { readString, removeStored, writeString } from '../../lib/storage';
import { Kicker } from '../landing/LandingKit';
import { WaterlineProgress } from '../SharkFin';
import { CodingWorkbench } from '../../coding/CodingWorkbench';
import { codingKeys, saveCodingDraft, useCodingProgress, useCodingTask } from '../../coding/api';
import { useCodingLibrary } from '../../lib/codingLibrary';
import { useEligibility } from '../../lib/learningPlan';
import {
  DURATIONS,
  EMPTY_FILTERS,
  TIERS,
  applyCodingFilters,
  hasActiveFilters,
  isBrowseOnly,
  readFilters,
  writeFilters,
  type CodingFilterState,
} from './CodingFilters';
import { CODING_INDEX } from '../../../../shared/coding-index';
import {
  CODING_SECTION_TRACKS,
  CODING_TECHNIQUE_GROUPS,
  CODING_TIERS,
  RETIRED_TRACK_LEARN_TOPIC,
  codingSectionTasks,
  isCodingSectionTrack,
  isCodingTrack,
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
/** What Coding may show. System design keeps its records but leaves discovery. */
const SECTION_INDEX = codingSectionTasks(CODING_INDEX);

/** A retired Coding track: explain where the material went, start nothing. */
function RetiredTrack({ track }: { track: CodingTrack }) {
  const { t } = useLanguage();
  const topic = RETIRED_TRACK_LEARN_TOPIC[track];
  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t(`coding.track.${track}` as never)}</h1>
      </header>
      <p className="cd-note" role="status">{t('coding.retired.note')}</p>
      <div className="cd-actions">
        {topic && <Link className="cd-btn cd-btn--primary" to={`/learn?topic=${encodeURIComponent(topic)}`}>{t('coding.retired.learn')}</Link>}
        <Link className="cd-btn" to="/coding">{t('coding.retired.back')}</Link>
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

function TaskRow({ task, status, saved = false }: { task: CodingTaskSummary; status: Status; saved?: boolean }) {
  const { t, lang } = useLanguage();
  const locked = status === 'locked';
  const inner = (
    <>
      <span className="cd-row__title">{task.title[lang] || task.title.en}</span>
      <span className="cd-row__meta">
        {task.level > 0 && <span>{t('coding.level', { n: task.level })}</span>}
        <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
        {task.debug && <span className="cd-tag">{t('coding.filter.format.debug')}</span>}
        {saved && <span className="cd-tag" title={t('coding.library.saved')}>{t('coding.library.savedShort')}</span>}
        {task.focus.slice(0, 3).map((tag) => <span key={tag} className="cd-tag">{tag}</span>)}
      </span>
      <StatusText status={status} />
    </>
  );
  return locked
    ? <li><div className="cd-row" aria-disabled="true">{inner}</div></li>
    : <li><Link className="cd-row" to={`/coding/${task.track}/${task.id}`}>{inner}</Link></li>;
}

/* ── /coding ──────────────────────────────────────────────────────────── */
export function CodingHome() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { passed, statusOf } = useStatuses(progress.data);
  const next = useMemo(() => nextOpenTask(SECTION_INDEX, statusOf), [statusOf]);
  const dueCount = useMemo(
    () => (progress.data?.due ?? []).filter((id) => SECTION_INDEX.some((task) => task.id === id)).length,
    [progress.data],
  );

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
      <div className="cd-actions">
        <Link className="cd-btn" to="/coding/session">{t('coding.session.open')}</Link>
        <Link className="cd-btn" to="/coding/library">{t('coding.library.manage')}</Link>
      </div>
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
      <section aria-labelledby="cd-techniques">
        <h2 id="cd-techniques" className="ss-kicker">{t('coding.techniques')}</h2>
        <div className="cd-chips" style={{ marginTop: 10 }}>
          {GROUPS.map((group) => {
            const tags = CODING_TECHNIQUE_GROUPS[group] as readonly string[];
            const counts = new Map<CodingTrack, number>();
            for (const task of SECTION_INDEX) if (task.focus.some((tag) => tags.includes(tag))) counts.set(task.track, (counts.get(task.track) ?? 0) + 1);
            const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
            if (!best) return null;
            return <Link key={group} className="cd-chip" to={`/coding/${best[0]}?group=${group}`}>{t(`coding.group.${group}` as never)} · {[...counts.values()].reduce((a, b) => a + b, 0)}</Link>;
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
  const library = useCodingLibrary(isAuthenticated);
  const eligibility = useEligibility(isAuthenticated);
  const { passed, statusOf, lockReason } = useStatuses(progress.data);
  const track = isCodingSectionTrack(trackParam) ? trackParam : null;
  const retired = !track && isCodingTrack(trackParam) ? trackParam : null;

  const filters = useMemo(() => readFilters(params), [params]);
  const savedIds = useMemo(() => new Set(library.data?.bookmarks ?? []), [library.data]);
  const collectionIds = useMemo(() => {
    if (!filters.collection) return null;
    const found = library.data?.collections.find((one) => one.id === filters.collection);
    return new Set(found?.taskIds ?? []);
  }, [filters.collection, library.data]);
  const debugIds = useMemo(() => new Set(SECTION_INDEX.filter((task) => task.debug).map((task) => task.id)), []);

  // The plan decides what exists here at all; the ladder decides what is open
  // within it. Search reaches neither past the plan nor past the ladder.
  const planTopics = eligibility.data?.personalized ? new Set(eligibility.data.unlockedTopics) : null;
  const inPlan = !planTopics || (track !== null && planTopics.has(track));
  const tasks = useMemo(() => SECTION_INDEX.filter((task) => task.track === track), [track]);
  const groupTags = filters.group && filters.group in CODING_TECHNIQUE_GROUPS
    ? (CODING_TECHNIQUE_GROUPS[filters.group as CodingTechniqueGroup] as readonly string[])
    : null;
  const filtered = useMemo(
    () => applyCodingFilters({ tasks, state: filters, lang, groupTags, savedIds, collectionIds, debugIds, statusOf }),
    [tasks, filters, lang, groupTags, savedIds, collectionIds, debugIds, statusOf],
  );
  const groupsHere = useMemo(
    () => GROUPS.filter((g) => tasks.some((task) => task.focus.some((tag) => (CODING_TECHNIQUE_GROUPS[g] as readonly string[]).includes(tag)))),
    [tasks],
  );

  const setFilter = useCallback((patch: Partial<CodingFilterState>) => {
    setParams(writeFilters(params, { ...readFilters(params), ...patch }), { replace: true });
  }, [params, setParams]);
  const resetFilters = useCallback(() => setParams(writeFilters(params, EMPTY_FILTERS), { replace: true }), [params, setParams]);

  if (retired) return <RetiredTrack track={retired} />;
  if (!track) return <div className="cd-page"><p className="cd-note cd-note--error">{t('error.notFound')}</p><Link className="cd-btn" to="/coding">{t('coding.verdict.back')}</Link></div>;
  const done = tasks.filter((task) => passed.has(task.id)).length;
  const active = hasActiveFilters(filters);
  // A technique chip narrows the ladder; a search flattens it into results.
  const flat = active && !isBrowseOnly(filters);
  const tiers = [1, 2, 3, 4, 5].filter((tier) => filtered.some((task) => task.tier === tier)) as CodingTier[];

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

      {!inPlan && (
        <p className="cd-note cd-note--warn" role="status">
          {t('coding.filter.notInPlan')} <Link className="cd-link" to="/profile">{t('plan.editLink')}</Link>
        </p>
      )}

      <CodingFilterBar
        filters={filters}
        groups={groupsHere}
        collections={library.data?.collections ?? []}
        signedIn={isAuthenticated}
        resultCount={filtered.length}
        onChange={setFilter}
        onReset={resetFilters}
      />

      {filtered.length === 0 && (
        <p className="cd-note" role="status">
          {active ? t('coding.filter.noResults') : t('coding.empty')}
          {active && <> <button type="button" className="cd-link cd-linkbtn" onClick={resetFilters}>{t('coding.filter.reset')}</button></>}
        </p>
      )}

      {flat
        ? filtered.length > 0 && (
          <ul className="cd-rows" aria-label={t('coding.filter.results', { n: filtered.length })}>
            {filtered.map((task) => <TaskRow key={task.id} task={task} status={statusOf(task)} saved={savedIds.has(task.id)} />)}
          </ul>
        )
        : tiers.map((tier) => {
          const reason = lockReason(track, tier);
          return (
            <section key={tier} className="cd-tier" aria-labelledby={`cd-tier-${tier}`}>
              <div className="cd-tier__head">
                <h2 id={`cd-tier-${tier}`}>{t(`coding.tier.${CODING_TIERS[tier]}` as never)}</h2>
                {reason && <p className="cd-tier__lock">{t(`coding.lock.${reason}` as never)}</p>}
              </div>
              <ul className="cd-rows">
                {filtered.filter((task) => task.tier === tier).map((task) => (
                  <TaskRow key={task.id} task={task} status={statusOf(task)} saved={savedIds.has(task.id)} />
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

/** Search plus the combined filters, as one keyboard-operable strip (#161). */
function CodingFilterBar({
  filters, groups, collections, signedIn, resultCount, onChange, onReset,
}: {
  filters: CodingFilterState;
  groups: string[];
  collections: { id: string; name: string }[];
  signedIn: boolean;
  resultCount: number;
  onChange: (patch: Partial<CodingFilterState>) => void;
  onReset: () => void;
}) {
  const { t } = useLanguage();
  const searchId = useId();
  const active = hasActiveFilters(filters);
  return (
    <div className="cd-filters">
      <div className="cd-filters__search">
        <label className="cd-editor-label" htmlFor={searchId}>{t('coding.filter.searchLabel')}</label>
        <input
          id={searchId}
          type="search"
          className="cd-input"
          value={filters.q}
          placeholder={t('coding.filter.searchPlaceholder')}
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </div>

      <div className="cd-chips" role="group" aria-label={t('coding.techniques')}>
        {/* Not a toggle: it clears the technique filter. `aria-pressed` on a
            control that cannot be un-pressed by activating it tells a screen
            reader something the control does not do. */}
        <button type="button" className="cd-chip" disabled={filters.group === null} onClick={() => onChange({ group: null })}>
          {t('coding.techniques.all')}
        </button>
        {groups.map((g) => (
          <button key={g} type="button" className="cd-chip" aria-pressed={filters.group === g} onClick={() => onChange({ group: filters.group === g ? null : g })}>
            {t(`coding.group.${g}` as never)}
          </button>
        ))}
      </div>

      <div className="cd-chips" role="group" aria-label={t('coding.filter.difficulty')}>
        {TIERS.map((tier) => (
          <button key={tier} type="button" className="cd-chip" aria-pressed={filters.tier === tier} onClick={() => onChange({ tier: filters.tier === tier ? null : tier })}>
            {t(`coding.tier.${CODING_TIERS[tier]}` as never)}
          </button>
        ))}
      </div>

      <div className="cd-chips" role="group" aria-label={t('coding.filter.duration')}>
        {DURATIONS.map((duration) => (
          <button key={duration} type="button" className="cd-chip" aria-pressed={filters.duration === duration} onClick={() => onChange({ duration: filters.duration === duration ? null : duration })}>
            {t(`coding.filter.duration.${duration}` as never)}
          </button>
        ))}
      </div>

      <div className="cd-chips" role="group" aria-label={t('coding.filter.format')}>
        {(['tests', 'checklist', 'debug'] as const).map((format) => (
          <button key={format} type="button" className="cd-chip" aria-pressed={filters.format === format} onClick={() => onChange({ format: filters.format === format ? null : format })}>
            {t(`coding.filter.format.${format}` as never)}
          </button>
        ))}
      </div>

      {signedIn && (
        <div className="cd-chips" role="group" aria-label={t('coding.filter.status')}>
          <button type="button" className="cd-chip" disabled={filters.status === 'all'} onClick={() => onChange({ status: 'all' })}>
            {t('coding.filter.all')}
          </button>
          {(['open', 'passed', 'due', 'saved'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="cd-chip"
              aria-pressed={filters.status === value}
              onClick={() => onChange({ status: filters.status === value ? 'all' : value })}
            >
              {value === 'saved' ? t('coding.library.saved') : t(`coding.status.${value}` as never)}
            </button>
          ))}
        </div>
      )}

      {signedIn && collections.length > 0 && (
        <div className="cd-chips" role="group" aria-label={t('coding.library.collections')}>
          {collections.map((collection) => (
            <button key={collection.id} type="button" className="cd-chip" aria-pressed={filters.collection === collection.id} onClick={() => onChange({ collection: filters.collection === collection.id ? null : collection.id })}>
              {collection.name}
            </button>
          ))}
        </div>
      )}

      <div className="cd-filters__foot">
        <span className="cd-shortcuts" role="status">{t('coding.filter.results', { n: resultCount })}</span>
        <button type="button" className="cd-btn cd-btn--quiet" onClick={onReset} disabled={!active}>{t('coding.filter.reset')}</button>
        <Link className="cd-link" to="/coding/library">{t('coding.library.manage')}</Link>
      </div>
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
  const retired = isCodingTrack(trackParam) && !isCodingSectionTrack(trackParam) ? trackParam : null;
  const task = useCodingTask(retired ? undefined : taskId);
  const track = isCodingSectionTrack(trackParam) ? trackParam : null;

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

  if (retired) return <RetiredTrack track={retired} />;
  if (!track || !taskId) return <div className="cd-page"><p className="cd-note cd-note--error">{t('error.notFound')}</p></div>;
  if (task.data && !isCodingSectionTrack(task.data.task.track)) return <RetiredTrack track={task.data.task.track} />;
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
      <CodingWorkbench key={data.task.id} task={data.task} session={data.session} locked={data.locked} signedIn={data.signedIn} initialCode={initialCode} mode="section" puzzle={data.puzzle} progressStatus={data.progress?.status ?? null} onDraft={onDraft} onVerdict={onVerdict} nextHref={nextHref} backHref={backHref} />
    </div>
  );
}

/* ── /coding/review ──────────────────────────────────────────────────── */
export function CodingReviewScreen() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { statusOf } = useStatuses(progress.data);
  const dueIds = progress.data?.due ?? [];
  const due = dueIds.map((id) => SECTION_INDEX.find((task) => task.id === id)).filter((task): task is CodingTaskSummary => Boolean(task));
  // Reviews the learner earned on the retired system-design track are still
  // recorded, and this screen cannot open them. Saying "nothing due" to
  // someone who has three would be a plain untruth, so it says where they went.
  const retiredDue = dueIds.filter((id) => {
    const task = CODING_INDEX.find((one) => one.id === id);
    return Boolean(task) && !isCodingSectionTrack(task!.track);
  }).length;
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
      {isAuthenticated && progress.data && due.length === 0 && retiredDue === 0 && <p className="cd-note">{t('coding.review.empty')}</p>}
      {due.length > 0 && <ul className="cd-rows">{due.map((task) => <TaskRow key={task.id} task={task} status={statusOf(task)} />)}</ul>}
      {retiredDue > 0 && (
        <p className="cd-note" role="status">
          {t('coding.review.retired', { n: retiredDue })}{' '}
          <Link className="cd-link" to={`/learn?topic=${encodeURIComponent(RETIRED_TRACK_LEARN_TOPIC['system-design'] ?? 'system-design')}`}>
            {t('coding.retired.learn')}
          </Link>
        </p>
      )}
    </div>
  );
}
