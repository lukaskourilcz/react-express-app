// The Coding section: home, one track, one task, and the review queue.
// devShark-only routes; the App gates them like /roadmap and /typing.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { readString, removeStored, writeString } from '../../lib/storage';
import { Kicker } from '../landing/LandingKit';
import { WaterlineProgress } from '../SharkFin';
import LoadingScreen from '../LoadingScreen';
import { CodingWorkbench } from '../../coding/CodingWorkbench';
import { DesignRunner } from '../../coding/DesignRunner';
import { codingKeys, saveCodingDraft, useCodingProgress, useCodingTask } from '../../coding/api';
import { useAdvanceSession, useBookmarks, usePracticeSession, useSaveChallenge } from '../../coding/practice';
import { ChallengeRunPlanner, taskHref } from './ChallengeRunPlanner';
import { CODING_INDEX } from '../../../../shared/coding-index';
import { evolvingResume, evolvingStage, evolvingTaskTrack, evolvingPassed, evolvingUnlocked, listedChallenges, type EvolvingCategory } from '../../../../shared/evolving';
import { prepareEvolvingDraft } from '../../../../shared/coding-fullstack-support';
import { SwimCta } from '../landing/LandingKit';
import {
  CODING_DIFFICULTIES,
  CODING_SECTION_TRACKS,
  CODING_TECHNIQUE_GROUPS,
  CODING_TIERS,
  TIER_DIFFICULTY,
  formatOf,
  hasLearnLevel,
  isCodingSectionTrack,
  isCodingTier,
  isCodingTrack,
  isDifficulty,
  isRetiredSectionTrack,
  stageDifficulty,
  tierLockReason,
  tierUnlocked,
  type CodingTaskSummary,
  type CodingTechniqueGroup,
  type CodingTier,
  type CodingTrack,
  type Difficulty,
} from '../../../../shared/coding-catalog';
import type { CodingProgressResponse, CodingTaskProgress, CodingVerdictResponse } from '../../../../shared/coding-api';
import { Badge } from '@astryxdesign/core/Badge';
import { isPremiumRequired } from '../../lib/api';
import { useLocks, type LockState } from '../../lib/locks';
import { openUpgradeSheet } from '../../lib/upgradeSheet';
import { codingContent, gatedRef } from '../../../../shared/tiers';
import '../../coding/Coding.css';

type Status = 'open' | 'in_progress' | 'passed' | 'revealed' | 'due' | 'locked' | 'premium';

/** Premium opens this task and the account holds the free plan: open the upgrade sheet. */
const askForPremium = (taskId: string) => {
  const content = codingContent(taskId);
  openUpgradeSheet({ kind: content.kind, ref: gatedRef(content) });
};

const draftKey = (id: string) => `devshark:coding:draft:${id}`;
const GROUPS = Object.keys(CODING_TECHNIQUE_GROUPS) as CodingTechniqueGroup[];

// Everything the section offers. System design tasks stay in CODING_INDEX so a
// passed one keeps its record and the FDE specialization can still assign it;
// they simply never appear in discovery, counts, filters or the review queue.
const SECTION_INDEX = CODING_INDEX.filter((task) => isCodingSectionTrack(task.track) && !evolvingStage(task.id));
const INDEX_BY_ID = new Map(CODING_INDEX.map((task) => [task.id, task]));
const TIERS: readonly CodingTier[] = [1, 2, 3, 4, 5];

/** The difficulty a track list is filtered to. `?difficulty=` is the filter;
 * an older `?tier=` link still lands on the label its tier projects to. */
function difficultyParam(params: URLSearchParams): Difficulty | 'all' {
  const value = params.get('difficulty');
  if (isDifficulty(value)) return value;
  const tier = Number(params.get('tier'));
  return isCodingTier(tier) ? TIER_DIFFICULTY[tier] : 'all';
}

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
  const { lockOf, loading: planLoading } = useLocks();
  /** The Premium state of a task. A task already passed stays open on any plan. */
  const premiumOf = useCallback((taskId: string): LockState => (evolvingPassed(taskId, passed) ? 'open' : lockOf(codingContent(taskId))), [lockOf, passed]);
  const unlocked = useCallback((task: CodingTaskSummary) => tierUnlocked({ track: task.track, tier: task.tier, progress: { passed }, tasks: CODING_INDEX, javascriptLevelsCleared: cleared }), [passed, cleared]);
  const lockReason = useCallback((track: CodingTrack, tier: CodingTier) => tierLockReason({ track, tier, progress: { passed }, tasks: CODING_INDEX, javascriptLevelsCleared: cleared }), [passed, cleared]);
  const statusOf = useCallback((task: CodingTaskSummary): Status => {
    if (premiumOf(task.id) === 'locked') return 'premium';
    if (!unlocked(task)) return 'locked';
    if (due.has(task.id)) return 'due';
    const row: CodingTaskProgress | undefined = progress?.tasks[task.id];
    if (!row) return 'open';
    return row.status;
  }, [unlocked, due, progress, premiumOf]);
  return { passed, due, statusOf, unlocked, lockReason, premiumOf, planLoading };
}

const nextOpenTask = (tasks: readonly CodingTaskSummary[], statusOf: (t: CodingTaskSummary) => Status, after?: string): CodingTaskSummary | null => {
  const start = after ? tasks.findIndex((t) => t.id === after) + 1 : 0;
  const ordered = [...tasks.slice(start), ...tasks.slice(0, start)];
  return ordered.find((t) => { const s = statusOf(t); return s === 'open' || s === 'in_progress' || s === 'due'; }) ?? null;
};

function StatusText({ status }: { status: Status }) {
  const { t } = useLanguage();
  const glyph = status === 'passed' ? '✓' : status === 'due' ? '↻' : status === 'locked' || status === 'premium' ? '●' : status === 'revealed' ? '◐' : status === 'in_progress' ? '◔' : '○';
  return <span className={`cd-row__status cd-status--${status}`}><span aria-hidden>{glyph}</span>{t(`coding.status.${status}` as never)}</span>;
}

/** A star that saves a challenge for later. Saving records interest, never
 * access: a locked item stays in the list with its explanation and still
 * refuses to open. */
function SaveButton({ taskId, saved, onToggle, busy, toolbar = false }: { taskId: string; saved: boolean; onToggle: (next: boolean) => void; busy: boolean; toolbar?: boolean }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className={`cd-save${saved ? ' cd-save--on' : ''}${toolbar ? ' cd-save--toolbar' : ''}`}
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

function TaskRow({ task, status, premium = 'open', saved, onSave, saving }: {
  task: CodingTaskSummary;
  status: Status;
  /** Anything but 'open' shows the "Premium" badge; 'locked' also refuses. */
  premium?: LockState;
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
        {hasLearnLevel(task) && <span>{t('coding.level', { n: task.level })}</span>}
        {formatOf(task) === 'debug' && <span className="cd-tag cd-tag--format">{t('coding.format.debug')}</span>}
        {premium !== 'open' && status !== 'premium' && <Badge variant="neutral" label={t('premium.badge')} />}
      </span>
      <StatusText status={status} />
    </>
  );
  const save = onSave
    ? <SaveButton taskId={task.id} saved={saved === true} busy={saving === true} onToggle={(next) => onSave(task.id, next)} />
    : null;
  return (
    <li className="cd-row-item">
      {status === 'premium'
        // Focusable and announced as unavailable; activating it explains why.
        ? <button type="button" className="cd-row cd-row--premium" aria-disabled="true" onClick={() => askForPremium(task.id)}>{inner}</button>
        : locked
          ? <div className="cd-row" aria-disabled="true">{inner}</div>
          : <Link className="cd-row" to={`/coding/${task.track}/${task.id}`}>{inner}</Link>}
      {save}
    </li>
  );
}

/* ── /coding ──────────────────────────────────────────────────────────── */
/** The evolving projects of one category (the plain ones, the FullStack
 * builds or the debugging paths), or with `track`, the short paths of one
 * section, listed on that section's page. Each list has its own copy. The
 * FullStack list holds its short path and its long apps together; the
 * debugging list holds its three short paths; the plain list on the Coding
 * home holds the long projects only. `listedChallenges` decides. */
function EvolvingGallery({ passed, premiumOf, category, track }: { passed: ReadonlySet<string>; premiumOf: (taskId: string) => LockState; category?: EvolvingCategory; track?: CodingTrack }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const fullstack = category === 'fullstack';
  const challenges = useMemo(() => listedChallenges({ category, track }), [category, track]);
  const scrollable = challenges.length > 5;
  const titleId = `${track ? `${track}-paths` : category ?? 'evolving'}-title`;
  const titleKey = track ? 'coding.evolving.paths' : category === 'fullstack' ? 'coding.evolving.fullstack' : category === 'debugging' ? 'coding.evolving.debugging' : 'coding.evolving.title';
  const bodyKey = track ? 'coding.evolving.pathsBody' : category === 'fullstack' ? 'coding.evolving.fullstackBody' : category === 'debugging' ? 'coding.evolving.debuggingBody' : 'coding.evolving.body';
  useEffect(() => {
    const list = listRef.current;
    if (!list || !scrollable) return;
    const rows = Array.from(list.children).slice(0, 5);
    // Measure actual rows so Czech text, zoom and narrow layouts still show five.
    const sizeList = () => list.style.setProperty('--cd-project-list-height', `${rows.reduce((height, row) => height + row.getBoundingClientRect().height, 0) + 1}px`);
    sizeList();
    const observer = new ResizeObserver(sizeList);
    rows.forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [scrollable, category, track]);
  if (challenges.length === 0) return null;
  return <section className="cd-projects" aria-labelledby={titleId}>
    <div className="cd-projects__intro">
    <Kicker as="h2" id={titleId}>{t(titleKey)}</Kicker>
    <p className="cd-lead">{t(bodyKey)}</p>
    </div>
    <div ref={listRef} className={`cd-project-list${scrollable ? ' cd-project-list--scroll' : ''}`} tabIndex={scrollable ? 0 : undefined} role={scrollable ? 'region' : undefined} aria-label={scrollable ? t(titleKey) : undefined}>{challenges.map((challenge, index) => {
      const completed = challenge.stages.filter(id => evolvingPassed(id, passed)).length;
      const resumeId = evolvingResume(challenge, passed);
      // Stage one comes with the free plan; on a free account the later stages read "Premium".
      const laterLocked = challenge.stages.length > 1 && premiumOf(challenge.stages[1]) === 'locked';
      return <article key={challenge.id} className="cd-project">
        <span className="cd-project__number" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
        <div className="cd-project__name">
        {/* On a section's own page every path is that section's, so the line would only repeat the heading. */}
        {!track && <p className="cd-project__track">{fullstack ? 'JavaScript · TypeScript · React · API' : category === 'debugging' ? `${t(`coding.track.${challenge.track}` as never)} · ${t('coding.format.debug')}` : t(`coding.track.${challenge.track}` as never)}</p>}
        <h3>{challenge.title[lang]}</h3>
        </div>
        <div className="cd-project__progress">
          <div className="cd-stage-meter" aria-hidden>{challenge.stages.map(id => <span key={id} data-complete={evolvingPassed(id, passed)} />)}</div>
          <p>{t(challenge.short ? 'coding.evolving.levelsProgress' : 'coding.evolving.progress', { n: completed, total: challenge.stages.length })}</p>
          {laterLocked && <p className="ss-premium-note"><span className="ss-premium-label">{t('premium.badge')}</span> {t(challenge.short ? 'premium.levelsNote' : 'premium.stagesNote')}</p>}
        </div>
        <SwimCta label={completed === challenge.stages.length ? t(challenge.short ? 'coding.evolving.levelsComplete' : 'coding.evolving.complete') : t('coding.continue')} onClick={() => { if (premiumOf(resumeId) === 'locked') askForPremium(resumeId); else navigate(`/coding/${evolvingTaskTrack(resumeId)}/${resumeId}`); }} />
      </article>;
    })}</div>
  </section>;
}

/** Which challenge is next, and a way into it, beside the page heading. For a
 * signed-in learner it waits for their progress: worked out from nothing, it
 * would name the first challenge and then swap it for the real one. */
function NextChallenge({ next, state, onRetry }: { next: CodingTaskSummary | null; state: 'loading' | 'error' | 'ready'; onRetry: () => void }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  return (
    <section className="cd-next" aria-labelledby="cd-next-label" aria-busy={state === 'loading' || undefined}>
      <div className="cd-next__text">
        <h2 id="cd-next-label" className="cd-next__label">{t('coding.discovery.next')}</h2>
        {state === 'loading' && (
          <p className="cd-next__title">
            <span className="cd-next__placeholder" aria-hidden="true" />
            <span className="cd-visually-hidden">{t('coding.discovery.loading')}</span>
          </p>
        )}
        {state === 'error' && <p className="cd-next__title cd-next__title--error" role="alert">{t('coding.discovery.failed')}</p>}
        {state === 'ready' && <p className="cd-next__title">{next ? next.title[lang] || next.title.en : t('coding.allDone')}</p>}
      </div>
      {state === 'error' && <button type="button" className="cd-btn" onClick={onRetry}>{t('coding.retry')}</button>}
      {/* Held disabled while loading, so the card keeps its size when the title arrives. */}
      {state !== 'error' && (state === 'loading' || next) && (
        <SwimCta label={t('coding.continue')} disabled={state === 'loading'} onClick={() => { if (next) navigate(`/coding/${next.track}/${next.id}`); }} />
      )}
    </section>
  );
}

export function CodingHome() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { passed, statusOf, premiumOf, planLoading } = useStatuses(progress.data);
  const next = useMemo(() => nextOpenTask(SECTION_INDEX, statusOf), [statusOf]);
  // The plan decides which tasks are Premium, so the card also waits for it:
  // otherwise a free account would see a Premium task named first.
  const nextState = authLoading || planLoading || (isAuthenticated && progress.isLoading)
    ? 'loading'
    : isAuthenticated && progress.isError && !progress.data ? 'error' : 'ready';

  return (
    <div className="cd-page cd-discovery ss-pop">
      <div className="cd-home-head">
        <header>
          <Kicker>{t('coding.kicker')}</Kicker>
          <h1>{t('coding.title')}</h1>
          <p className="cd-lead">{t('coding.subtitle')}</p>
        </header>
        <NextChallenge next={next} state={nextState} onRetry={() => void progress.refetch()} />
      </div>
      {!authLoading && !isAuthenticated && <p className="cd-note">{t('coding.signInHint')}</p>}
      <ChallengeRunPlanner signedIn={isAuthenticated} />
      <section aria-label={t('coding.title')} className="cd-track-directory">
        {CODING_SECTION_TRACKS.map((track) => {
          const tasks = SECTION_INDEX.filter((task) => task.track === track);
          const done = tasks.filter((task) => passed.has(task.id)).length;
          return (
            <Link key={track} className="cd-track-entry" to={`/coding/${track}`}>
              <span className="cd-track-entry__symbol" aria-hidden>{track === 'javascript' ? 'JS' : track === 'typescript' ? 'TS' : track === 'algorithms' ? 'Σ' : '⚛'}</span>
              <div className="cd-track-entry__body">
              <div className="cd-track__title">
                <h2>{t(`coding.track.${track}` as never)}</h2>
                <span className="cd-track__count">{t('coding.progress', { passed: done, total: tasks.length })}</span>
              </div>
              <WaterlineProgress decorativeFins value={tasks.length ? (100 * done) / tasks.length : 0} label={t('coding.progress', { passed: done, total: tasks.length })} />
              <p className="cd-track__blurb">{t(`coding.trackBlurb.${track}` as never)}</p>
              </div>
              <span className="cd-track-entry__arrow" aria-hidden>↗</span>
            </Link>
          );
        })}
      </section>
      <EvolvingGallery passed={passed} premiumOf={premiumOf} category="debugging" />
      <EvolvingGallery passed={passed} premiumOf={premiumOf} />
      <Link className="cd-fullstack-feature" to="/coding/fullstack">
        <div><Kicker>{t('coding.discovery.build')}</Kicker><h2>{t('coding.evolving.fullstack')}</h2><p>{t('coding.discovery.fullstack')}</p><span className="cd-link">{t('coding.discovery.explore')} <span aria-hidden>↗</span></span></div>
        <div className="cd-stack-path" aria-hidden><span>JS</span><i>→</i><span>TS</span><i>→</i><span>API</span><i>→</i><span>React</span></div>
      </Link>
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

export function FullStackScreen() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { passed, premiumOf, planLoading } = useStatuses(progress.data);
  if ((isAuthenticated && progress.isLoading) || planLoading) return <LoadingScreen label={t('coding.loading')} />;
  return <div className="cd-page ss-pop">
    <Link className="cd-link" to="/coding">{t('coding.title')}</Link>
    <h1>{t('coding.evolving.title')}</h1>
    {isAuthenticated && progress.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.collections.failed')} <button className="cd-btn" onClick={()=>void progress.refetch()}>{t('coding.retry')}</button></p>}
    <EvolvingGallery passed={passed} premiumOf={premiumOf} category="fullstack" />
  </div>;
}

/* ── /coding/:track ──────────────────────────────────────────────────── */
export function CodingTrackScreen() {
  const { t, lang } = useLanguage();
  const { track: trackParam } = useParams();
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { passed, statusOf, lockReason, premiumOf } = useStatuses(progress.data);
  const track = isCodingTrack(trackParam) ? trackParam : null;
  const group = params.get('group');
  const statusFilter = params.get('status') ?? 'all';
  // Every filter lives in the URL, so a filtered list is a link a learner can
  // keep, share with themselves on another device, or reload without losing.
  const query = params.get('q') ?? '';
  const difficulty = difficultyParam(params);
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
    if (difficulty !== 'all' && task.difficulty !== difficulty) return false;
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
  // Easy, then Medium, then Hard; inside each, the tiers that fall in it, so
  // a tier's lock line stays beside the challenges it locks.
  const bands = CODING_DIFFICULTIES
    .map((level) => ({ level, tiers: TIERS.filter((tier) => filtered.some((task) => task.difficulty === level && task.tier === tier)) }))
    .filter((band) => band.tiers.length > 0);
  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    // The label filter replaces the old tier one; never leave both in a link.
    if (key === 'difficulty') next.delete('tier');
    setParams(next, { replace: true });
  };

  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker>{t('coding.kicker')} · <Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t(`coding.track.${track}` as never)}</h1>
        <p className="cd-lead">{t(`coding.trackBlurb.${track}` as never)}</p>
        <div style={{ marginTop: 12, maxWidth: 420 }}>
          <WaterlineProgress decorativeFins value={tasks.length ? (100 * done) / tasks.length : 0} label={t('coding.progress', { passed: done, total: tasks.length })} />
          <p className="cd-track__count" style={{ margin: '6px 0 0' }}>{t('coding.progress', { passed: done, total: tasks.length })}</p>
        </div>
      </header>
      <EvolvingGallery passed={passed} premiumOf={premiumOf} track={track} />
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
        <label className="cd-visually-hidden" htmlFor={`${track}-difficulty`}>{t('coding.filter.difficulty')}</label>
        <select id={`${track}-difficulty`} value={difficulty} onChange={(event) => setFilter('difficulty', event.target.value === 'all' ? null : event.target.value)}>
          <option value="all">{t('coding.filter.difficulty')}</option>
          {CODING_DIFFICULTIES.map((level) => (
            <option key={level} value={level}>{t(`coding.difficulty.${level}`)}</option>
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
      {bands.map(({ level, tiers }) => (
        <section key={level} className="cd-band" aria-labelledby={`cd-band-${level}`}>
          <h2 id={`cd-band-${level}`} className="cd-band__title">{t(`coding.difficulty.${level}`)}</h2>
          {tiers.map((tier) => {
            const reason = lockReason(track, tier);
            return (
              <section key={tier} className="cd-tier" aria-labelledby={`cd-tier-${level}-${tier}`}>
                <div className="cd-tier__head">
                  <h3 id={`cd-tier-${level}-${tier}`}>{t(`coding.tier.${CODING_TIERS[tier]}` as never)}</h3>
                  {reason && <p className="cd-tier__lock">{t(`coding.lock.${reason}` as never)}</p>}
                </div>
                <ul className="cd-rows">
                  {filtered.filter((task) => task.difficulty === level && task.tier === tier).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      status={statusOf(task)}
                      premium={premiumOf(task.id)}
                      saved={savedIds.has(task.id)}
                      onSave={isAuthenticated ? onSave : undefined}
                      saving={save.isPending}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </section>
      ))}
      <p className="cd-shortcuts">{lang === 'cs' ? '' : ''}</p>
    </div>
  );
}

/* ── /coding/:track/:taskId ──────────────────────────────────────────── */
/** The stages of the path the open task belongs to, numbered, under their
 * difficulty. Consecutive stages with one label share a labelled group, so the
 * order stays the path's order even when an authored label breaks a band. */
function StageNav({ stages, short, currentId, passed, premiumOf }: { stages: readonly string[]; short: boolean; currentId: string; passed: ReadonlySet<string>; premiumOf: (taskId: string) => LockState }) {
  const { t } = useLanguage();
  const navRef = useRef<HTMLElement>(null);
  // On a phone the list scrolls sideways; bring the open stage into view
  // without moving the page.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    const navBox = nav.getBoundingClientRect();
    const box = current.getBoundingClientRect();
    nav.scrollLeft += box.left - navBox.left - (navBox.width - box.width) / 2;
  }, [currentId]);
  const groups: { level: Difficulty; entries: { id: string; index: number }[] }[] = [];
  stages.forEach((id, index) => {
    const level = INDEX_BY_ID.get(id)?.difficulty ?? stageDifficulty(index, stages.length);
    const last = groups[groups.length - 1];
    if (last && last.level === level) last.entries.push({ id, index });
    else groups.push({ level, entries: [{ id, index }] });
  });
  return (
    <nav ref={navRef} className="cd-actions cd-stage-nav" aria-label={t(short ? 'coding.evolving.levels' : 'coding.evolving.title')}>
      {groups.map(({ level, entries }) => {
        const labelId = `cd-stage-group-${entries[0].index}`;
        return (
          <div key={labelId} className="cd-stage-group" role="group" aria-labelledby={labelId}>
            <span id={labelId} className="cd-stage-group__label">{t(`coding.difficulty.${level}`)}</span>
            {entries.map(({ id, index }) => {
              const label = t(short ? 'coding.evolving.level' : 'coding.evolving.stage', { n: index + 1, total: stages.length });
              const current = id === currentId;
              // A Premium stage stays focusable and opens the upgrade sheet.
              if (!current && premiumOf(id) === 'locked') {
                const premiumLabel = t('premium.stageLabel', { label });
                return <button key={id} type="button" className="cd-btn" aria-disabled="true" aria-label={premiumLabel} title={premiumLabel} onClick={() => askForPremium(id)}>{index + 1}</button>;
              }
              return evolvingUnlocked(id, passed) || current
                ? <Link key={id} className={`cd-btn${current ? ' cd-btn--primary' : ''}`} aria-label={label} title={label} aria-current={current ? 'step' : undefined} to={`/coding/${evolvingTaskTrack(id)}/${id}`}>{evolvingPassed(id, passed) ? '✓ ' : ''}{index + 1}</Link>
                : <button key={id} type="button" className="cd-btn" aria-label={label} title={label} disabled>{index + 1}</button>;
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function CodingTaskScreen() {
  const { t, lang } = useLanguage();
  const { track: trackParam, taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const progress = useCodingProgress(isAuthenticated);
  const { statusOf, premiumOf, passed: passedIds } = useStatuses(progress.data);
  const track = isCodingTrack(trackParam) ? trackParam : null;
  // A retired track's deep link explains where the material went. The task is
  // never fetched, so no session is issued and nothing is started.
  const retired = track !== null && isRetiredSectionTrack(track);
  const task = useCodingTask(retired ? undefined : taskId);
  const [attempt, setAttempt] = useState(0);
  const bookmarks = useBookmarks(isAuthenticated);
  const save = useSaveChallenge();
  // An active challenge run carries the learner from one queued task to the
  // next: a pass moves the run's position, and Next points at the queue.
  const run = usePracticeSession(isAuthenticated);
  const advanceRun = useAdvanceSession();
  const activeRun = run.data?.session?.status === 'active' ? run.data.session : null;
  const runIndex = activeRun && taskId ? activeRun.queue.indexOf(taskId) : -1;

  useEffect(() => {
    if (task.data && track && task.data.task.track !== track) navigate(`/coding/${task.data.task.track}/${task.data.task.id}`, { replace: true });
  }, [task.data, track, navigate]);

  // Runs on Run and Submit, silently. The device copy is written first so a
  // failed account save still leaves the code recoverable here; a successful
  // one lets the device copy go, since the account now holds it.
  const onDraft = useCallback((code: string) => {
    if (!taskId) return;
    writeString(draftKey(taskId), code);
    if (!isAuthenticated) return;
    saveCodingDraft(taskId, code).then(() => {
      // Evolving code is also the offline starting point of the next stage.
      if (!evolvingStage(taskId) && readString(draftKey(taskId)) === code) removeStored(draftKey(taskId));
    }).catch(() => { /* the device copy above stands */ });
  }, [taskId, isAuthenticated]);

  const onVerdict = useCallback((verdict: CodingVerdictResponse, submittedCode?: string) => {
    if (verdict.progress) void queryClient.invalidateQueries({ queryKey: codingKeys.progress() });
    if (verdict.verdict === 'passed' && activeRun && runIndex >= 0 && runIndex >= activeRun.position) {
      const position = runIndex + 1;
      advanceRun.mutate({ sessionId: activeRun.sessionId, position, ...(position >= activeRun.queue.length ? { status: 'finished' as const } : {}) });
    }
    if (verdict.verdict === 'passed' && taskId) {
      const stage = evolvingStage(taskId);
      if (stage) {
        // Capture the submitted snapshot synchronously, before Next can navigate
        // and before the account save started by Submit settles. Never seed
        // over a next-stage draft.
        if (submittedCode !== undefined) writeString(draftKey(taskId), submittedCode);
        if (stage.next) queryClient.removeQueries({queryKey:codingKeys.task(stage.next), exact:true, type:'inactive'});
      } else removeStored(draftKey(taskId));
    }
  }, [queryClient, taskId, activeRun, runIndex, advanceRun]);

  const onRetry = useCallback(() => {
    void task.refetch();
    setAttempt((n) => n + 1);
  }, [task]);

  if (retired && track) return <RetiredTrackNotice track={track} />;
  if (!track || !taskId) return <div className="cd-page"><p className="cd-note cd-note--error">{t('error.notFound')}</p></div>;
  if (task.isLoading) return <LoadingScreen label={t('coding.loading')} />;
  // Premium opens this task and the account holds the free plan. The API
  // client already opened the upgrade sheet; the page says the same thing in
  // words, and keeps a way back that does not depend on the sheet.
  if (task.isError && isPremiumRequired(task.error)) {
    return (
      <div className="cd-page">
        <header>
          <Kicker><Link className="cd-link" to={`/coding/${track}`}>{t(`coding.track.${track}` as never)}</Link></Kicker>
          <h1>{t('premium.taskTitle')}</h1>
        </header>
        <p className="cd-lead">{t('premium.taskBody')}</p>
        <div className="cd-actions">
          <button type="button" className="cd-btn cd-btn--primary" onClick={() => askForPremium(taskId)}>{t('profile.plan.see')}</button>
          <Link className="cd-btn" to={`/coding/${track}`}>{t('coding.verdict.back')}</Link>
        </div>
      </div>
    );
  }
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
  const stage = evolvingStage(data.task.id);
  if (isRetiredSectionTrack(data.task.track)) return <RetiredTrackNotice track={data.task.track} />;
  const trackTasks = SECTION_INDEX.filter((one) => one.track === data.task.track);
  const next = nextOpenTask(trackTasks, statusOf, data.task.id);
  const runNext = runIndex >= 0 && activeRun ? activeRun.queue[runIndex + 1] ?? null : null;
  const nextHref = runIndex >= 0
    ? runNext ? taskHref(runNext) : '/coding'
    : stage
      ? stage.next ? `/coding/${evolvingTaskTrack(stage.next)}/${stage.next}` : null
      : next && next.id !== data.task.id ? `/coding/${next.track}/${next.id}` : null;
  const backHref = stage?.challenge.category === 'fullstack' ? '/coding/fullstack' : stage?.challenge.category === 'debugging' ? '/coding' : `/coding/${data.task.track}`;
  const localDraft = readString(draftKey(data.task.id));
  const previousLocal = stage?.previous ? readString(draftKey(stage.previous)) : null;
  const initialCode = localDraft ?? data.draft ?? (stage && previousLocal !== null
    ? prepareEvolvingDraft(previousLocal, stage.challenge, stage.index)
    : null);

  return (
    <div className="cd-page ss-pop">
      {/* Rendered only when it has something to say: an empty row would still
          take a gap in the page's column and push the brief down for nothing. */}
      {(stage || (runIndex >= 0 && activeRun)) && <div className="cd-actions">
        {stage && <span>{stage.challenge.title[lang]} — {t(stage.challenge.short ? 'coding.evolving.level' : 'coding.evolving.stage', { n: stage.index + 1, total: stage.challenge.stages.length })}</span>}
        {runIndex >= 0 && activeRun && <Link className="cd-link" to="/coding">{t('coding.run.stage', { n: runIndex + 1, total: activeRun.queue.length })}</Link>}
      </div>}
      {(bookmarks.isError || save.isError) && <p role="alert" className="cd-note cd-note--error">{t('coding.collections.failed')} <button className="cd-btn" onClick={() => void bookmarks.refetch()}>{t('coding.retry')}</button></p>}
      {stage && stage.challenge.stages.length > 1 && premiumOf(stage.challenge.stages[1]) === 'locked' && (
        <p className="ss-premium-note"><span className="ss-premium-label">{t('premium.badge')}</span> {t(stage.challenge.short ? 'premium.levelsNote' : 'premium.stagesNote')}</p>
      )}
      {stage && <StageNav stages={stage.challenge.stages} short={stage.challenge.short === true} currentId={data.task.id} passed={passedIds} premiumOf={premiumOf} />}
      {data.task.track === 'system-design'
        ? <DesignRunner key={`${data.task.id}-${attempt}`} task={data.task} session={data.session} locked={data.locked} signedIn={data.signedIn} mode="section" onVerdict={onVerdict} onRetry={onRetry} nextHref={nextHref} backHref={backHref} />
        : <CodingWorkbench
            key={`${data.task.id}-${attempt}`}
            task={data.task}
            session={data.session}
            locked={data.locked}
            signedIn={data.signedIn}
            progress={data.progress}
            initialCode={initialCode}
            mode="section"
            onDraft={onDraft}
            onVerdict={onVerdict}
            nextHref={nextHref}
            backHref={backHref}
            // The star sits with the workbench's own utilities, beside the
            // report flag, rather than floating above the brief.
            saveAction={isAuthenticated && (
              <SaveButton
                toolbar
                taskId={data.task.id}
                saved={bookmarks.data?.saved.includes(data.task.id) ?? false}
                busy={bookmarks.isPending || bookmarks.isError || save.isPending}
                onToggle={(saved) => save.mutate({ op: 'save', taskId: data.task.id, saved })}
              />
            )}
          />}
    </div>
  );
}

/* ── /coding/review ──────────────────────────────────────────────────── */
export function CodingReviewScreen() {
  return <Navigate to="/coding" replace />;
}
