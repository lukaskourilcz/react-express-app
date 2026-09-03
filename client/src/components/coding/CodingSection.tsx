// The Coding section: home, one track, one task, and the review queue.
// devShark-only routes; the App gates them like /roadmap and /typing.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { readString, removeStored, writeString } from '../../lib/storage';
import { Kicker } from '../landing/LandingKit';
import { WaterlineProgress } from '../SharkFin';
import { CodingWorkbench } from '../../coding/CodingWorkbench';
import { DesignRunner } from '../../coding/DesignRunner';
import { codingKeys, saveCodingDraft, useCodingProgress, useCodingTask } from '../../coding/api';
import { CODING_INDEX } from '../../../../shared/coding-index';
import {
  CODING_TECHNIQUE_GROUPS,
  CODING_TIERS,
  CODING_TRACKS,
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

function TaskRow({ task, status }: { task: CodingTaskSummary; status: Status }) {
  const { t, lang } = useLanguage();
  const locked = status === 'locked';
  const inner = (
    <>
      <span className="cd-row__title">{task.title[lang] || task.title.en}</span>
      <span className="cd-row__meta">
        {task.level > 0 && <span>{t('coding.level', { n: task.level })}</span>}
        <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
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
  const next = useMemo(() => nextOpenTask(CODING_INDEX, statusOf), [statusOf]);
  const dueCount = progress.data?.due.length ?? 0;

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
      <section aria-label={t('coding.title')} className="cd-tracks">
        {CODING_TRACKS.map((track) => {
          const tasks = CODING_INDEX.filter((task) => task.track === track);
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
            for (const task of CODING_INDEX) if (task.focus.some((tag) => tags.includes(tag))) counts.set(task.track, (counts.get(task.track) ?? 0) + 1);
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
  const { passed, statusOf, lockReason } = useStatuses(progress.data);
  const track = isCodingTrack(trackParam) ? trackParam : null;
  const group = params.get('group');
  const statusFilter = params.get('status') ?? 'all';
  const tasks = useMemo(() => CODING_INDEX.filter((task) => task.track === track), [track]);
  const filtered = useMemo(() => tasks.filter((task) => {
    if (group && group in CODING_TECHNIQUE_GROUPS) {
      const tags = CODING_TECHNIQUE_GROUPS[group as CodingTechniqueGroup] as readonly string[];
      if (!task.focus.some((tag) => tags.includes(tag))) return false;
    }
    if (statusFilter === 'all') return true;
    const status = statusOf(task);
    if (statusFilter === 'passed') return status === 'passed';
    if (statusFilter === 'due') return status === 'due';
    return status === 'open' || status === 'in_progress' || status === 'revealed';
  }), [tasks, group, statusFilter, statusOf]);
  const groupsHere = useMemo(() => GROUPS.filter((g) => tasks.some((task) => task.focus.some((tag) => (CODING_TECHNIQUE_GROUPS[g] as readonly string[]).includes(tag)))), [tasks]);
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
        </div>
      )}
      {filtered.length === 0 && <p className="cd-note">{t('coding.empty')}</p>}
      {tiers.map((tier) => {
        const reason = lockReason(track, tier);
        return (
          <section key={tier} className="cd-tier" aria-labelledby={`cd-tier-${tier}`}>
            <div className="cd-tier__head">
              <h2 id={`cd-tier-${tier}`}>{t(`coding.tier.${CODING_TIERS[tier]}` as never)}</h2>
              {reason && <p className="cd-tier__lock">{t(`coding.lock.${reason}` as never)}</p>}
            </div>
            <ul className="cd-rows">
              {filtered.filter((task) => task.tier === tier).map((task) => <TaskRow key={task.id} task={task} status={statusOf(task)} />)}
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
  const task = useCodingTask(taskId);
  const [attempt, setAttempt] = useState(0);
  const track = isCodingTrack(trackParam) ? trackParam : null;

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
  const trackTasks = CODING_INDEX.filter((one) => one.track === data.task.track);
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
  const due = (progress.data?.due ?? []).map((id) => CODING_INDEX.find((task) => task.id === id)).filter((task): task is CodingTaskSummary => Boolean(task));
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
