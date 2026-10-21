// The learning-path screens, shared by the FDE role specialization and the
// DSA Foundations skill path:
//
//   PathOverview   — outcomes, non-goals, the real inventory, the module
//                    outline, bridges and one concrete next action.
//   ModuleWorkspace — one module, and one activity open inside it.
//
// Both are path-neutral. `pathId` decides which manifest is fetched and which
// route the links point at; nothing else differs, which is why DSA could ship
// without waiting for the FDE hub.
//
// A guest sees the whole outline. Signing in is required to record graded
// work, and the screen says so rather than hiding the material behind a wall.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { useT } from '../../i18n/LanguageContext';
import { pathsEn as pathCopy } from '../../i18n/translations.paths';
import { ApiError, friendlyError } from '../../lib/api';
import { isBarred, useLocks } from '../../lib/locks';
import { openUpgradeSheet } from '../../lib/upgradeSheet';
import { useTrack } from '../../lib/tracks';
import { capturePathEvent } from '../../lib/analytics';
import { CodingCompletion } from '../../coding/CodingCompletion';
import { announceVerifiedQuestXp, syncXpWithServer } from '../../lib/xp';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import {
  ArtifactActivity,
  CheckActivity,
  CodeActivity,
  CriteriaList,
  Feedback,
  LessonActivity,
  StateBadge,
  type DraftStatus,
} from './ActivityViews';
import {
  activityHref,
  changeEnrollment,
  entryFor,
  forgetLocalDraft,
  isOpen,
  keepDraftLocally,
  learningPathKeys,
  localDraftOver,
  moduleHref,
  newIdempotencyKey,
  pathHref,
  savePathDraft,
  startActivity,
  submitActivity,
  useEnrollments,
  usePathCatalog,
  usePathProgress,
} from '../../lib/learningPaths';
import type {
  PathCatalogEntry,
  PathDraft,
  PathProgressResponse,
  StartActivityResponse,
  SubmitActivityResponse,
} from '../../../../shared/learning-path-api';
import type { ActivitySummary, EvidenceState, LearningPathId, ModuleShelf, ModuleSummary } from '../../../../shared/learning-paths';
import './LearningPaths.css';
import { Button } from '@astryxdesign/core/Button';

/* ── shared hooks ──────────────────────────────────────────────────────── */

// Off the loop: an optional module or one on a shelf. The server's
// isOffLoopModule decides progress; this local copy only lays the page out,
// because a value import from shared/learning-paths would add to the initial
// download (that module ships with the shell).
const offLoop = (module: ModuleSummary) => module.optional === true || module.shelf !== undefined;

// Every shelf's heading and note. A Record, so adding a shelf to
// MODULE_SHELVES fails the type check until it has copy here.
const SHELF_COPY: Record<ModuleShelf, { title: string; note: string }> = {
  'interview-prep': {
    title: pathCopy['paths.shelf.interviewPrep.title'],
    note: pathCopy['paths.shelf.interviewPrep.note'],
  },
};

function usePathState(pathId: LearningPathId) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const catalog = usePathCatalog();
  const enrollments = useEnrollments(isAuthenticated ? userId : undefined);
  const entry = entryFor(catalog.data, pathId);
  const enrollment = enrollments.data?.enrollments.find(
    (one) => one.pathId === pathId && one.curriculumVersion === entry?.manifest.version,
  );
  const progress = usePathProgress(userId, enrollment?.enrollmentId, enrollment?.curriculumVersion);
  return { userId, isAuthenticated, catalog, entry, enrollment, enrollments, progress };
}

/** activity id → recorded state, for badges and the outline. */
function statesOf(progress: PathProgressResponse | undefined): Map<string, EvidenceState> {
  const map = new Map<string, EvidenceState>();
  for (const module of progress?.modules ?? []) {
    for (const activity of module.activities) map.set(activity.activityId, activity.state);
  }
  return map;
}

function ActivityRow({
  pathId,
  moduleId,
  activity,
  state,
  interactive,
}: {
  pathId: LearningPathId;
  moduleId: string;
  activity: ActivitySummary;
  state: EvidenceState;
  interactive: boolean;
}) {
  const t = useT();
  const body = (
    <>
      <span className="lp-activity__kind">{t(`paths.kind.${activity.kind}` as never)}</span>
      <span className="lp-activity__title">{activity.title}</span>
      <span className="lp-activity__minutes">{t('paths.minutes', { minutes: activity.estimatedMinutes })}</span>
      <StateBadge state={state} />
      <p className="lp-activity__summary">{activity.summary}</p>
    </>
  );
  if (!interactive) return <li className="lp-activity">{body}</li>;
  return (
    <li>
      <Link className="lp-activity" to={activityHref(pathId, moduleId, activity.id)}>
        {body}
      </Link>
    </li>
  );
}

function ModuleCard({
  pathId,
  module,
  index,
  states,
  completed,
  interactive,
}: {
  pathId: LearningPathId;
  module: ModuleSummary;
  index: number;
  states: Map<string, EvidenceState>;
  completed: boolean;
  interactive: boolean;
}) {
  const t = useT();
  const className = [
    'lp-module',
    completed ? 'lp-module--done' : '',
    offLoop(module) ? 'lp-module--optional' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section className={className}>
      <div className="lp-module__head">
        <h2 className="lp-module__title">
          <span className="lp-module__index">
            {offLoop(module) ? t('paths.module.optional') : t('paths.module.index', { index })}
          </span>
          {interactive ? <Link to={moduleHref(pathId, module.id)}>{module.title}</Link> : module.title}
        </h2>
        <span className="lp-module__meta">
          {t('paths.minutes', { minutes: module.estimatedMinutes })}
          {completed ? ` · ${t('paths.module.complete')}` : ''}
        </span>
      </div>
      <ul className="lp-module__outcomes">
        {module.outcomes.map((outcome, position) => (
          <li key={position}>{outcome}</li>
        ))}
      </ul>
      <ul className="lp-activities">
        {module.activities.map((activity) => (
          <ActivityRow
            key={activity.id}
            pathId={pathId}
            moduleId={module.id}
            activity={activity}
            state={states.get(activity.id) ?? 'not_started'}
            interactive={interactive}
          />
        ))}
      </ul>
    </section>
  );
}

/* ── overview ──────────────────────────────────────────────────────────── */

export function PathOverview({ pathId }: { pathId: LearningPathId }) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId, isAuthenticated, catalog, entry, enrollment, progress } = usePathState(pathId);
  const [track] = useTrack();
  const { lockOf } = useLocks();
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  // Premium opens the paths. Starting or resuming one the plan does not open
  // asks for Premium instead, and the button carries the Premium mark.
  const barred = isBarred(lockOf({ kind: 'learning-path', pathId }));
  const askForPremium = useCallback(() => openUpgradeSheet({ kind: 'learning-path', ref: pathId }), [pathId]);

  const states = useMemo(() => statesOf(progress.data), [progress.data]);
  const completedModules = useMemo(
    () => new Set((progress.data?.modules ?? []).filter((one) => one.completed).map((one) => one.moduleId)),
    [progress.data],
  );

  const enrol = useCallback(
    async (action: 'enroll' | 'pause' | 'resume') => {
      if (!entry) return;
      setEnrolling(true);
      setEnrollError(null);
      try {
        await changeEnrollment({
          pathId,
          curriculumVersion: entry.manifest.version,
          action,
          // A role specialization records the base track it sits above.
          ...(entry.manifest.kind === 'role_specialization' ? { baseTrack: track } : {}),
        });
        if (action === 'enroll') {
          capturePathEvent('learning_path_enrolled', { pathId, curriculumVersion: entry.manifest.version });
        }
        await queryClient.invalidateQueries({ queryKey: learningPathKeys.enrollments(userId) });
      } catch (error) {
        setEnrollError(friendlyError(error));
      } finally {
        setEnrolling(false);
      }
    },
    [entry, pathId, queryClient, userId, track],
  );

  if (catalog.isLoading) return <LoadingScreen label={t('paths.loading')} />;
  if (catalog.isError || !entry) {
    return (
      <div className="lp-page">
        <ErrorRetry message={t('paths.error.catalog')} onRetry={() => catalog.refetch()} />
      </div>
    );
  }

  const { manifest, inventory, availability } = entry;
  const open = isOpen(availability);
  const next = progress.data?.nextActivityId ?? null;
  const nextModule = next ? manifest.modules.find((one) => one.activities.some((a) => a.id === next)) : undefined;
  const requiredModules = manifest.modules.filter((one) => !offLoop(one));
  // Shelf modules list under their own heading, so the optional section's
  // note about placement and bridges never describes interview practice.
  const optionalModules = manifest.modules.filter((one) => one.optional && one.shelf === undefined);
  const shelves = (Object.keys(SHELF_COPY) as ModuleShelf[])
    .map((shelf) => ({ shelf, modules: manifest.modules.filter((one) => one.shelf === shelf) }))
    .filter((one) => one.modules.length > 0);
  // Activities link only while the path is open to this learner; a closed
  // path, or a lapsed plan, keeps its outline and evidence without dead ends.
  const reachable = Boolean(enrollment) && open && !barred;
  const premiumMark = <span className="ss-premium-label">{t('premium.badge')}</span>;
  const diagnosticModule = manifest.diagnosticActivityId
    ? manifest.modules.find(module => module.activities.some(activity => activity.id === manifest.diagnosticActivityId))
    : undefined;

  return (
    <div className="lp-page">
      <header className="lp-head">
        <div className="lp-head__text">
          <p className="lp-kicker">
            {manifest.kind === 'role_specialization' ? t('paths.kicker.role') : t('paths.kicker.skill')}
          </p>
          <h1>{manifest.title}</h1>
          <p className="lp-lead">{manifest.summary}</p>
          <ul className="lp-inventory">
            <li>
              <strong>{inventory.modules}</strong> {t('paths.inventory.modules')}
            </li>
            <li>
              <strong>{inventory.lessons}</strong> {t('paths.inventory.lessons')}
            </li>
            <li>
              <strong>{inventory.moduleChecks}</strong> {t('paths.inventory.checks')}
            </li>
            <li>
              <strong>{inventory.moduleCodeExercises + inventory.finalCodeExercises}</strong>{' '}
              {t('paths.inventory.exercises')}
            </li>
            {inventory.artifacts > 0 && (
              <li>
                <strong>{inventory.artifacts}</strong> {t('paths.inventory.artifacts')}
              </li>
            )}
            <li>
              {t('paths.inventory.hours', { min: manifest.estimatedHours.min, max: manifest.estimatedHours.max })}
            </li>
          </ul>
          {/* What the four kinds of activity are for, said once at the top of
              the path rather than repeated at each one. The last sentence is
              the one that matters: coming back to earlier material is the plan
              working, not the plan slipping. */}
          <p className="lp-note">
            {pathCopy['paths.activityKinds']}
          </p>
        </div>
        <div className="lp-head__actions">
          {!isAuthenticated && <span className="lp-actions__status">{t('paths.guestPreview')}</span>}
          {open && barred && premiumMark}
          {isAuthenticated && !enrollment && open && (
            <Button variant="primary" onClick={() => (barred ? askForPremium() : enrol('enroll'))} isDisabled={enrolling} label={enrolling ? t('paths.action.starting') : t('paths.action.start')} />
          )}
          {isAuthenticated && enrollment?.status === 'paused' && open && (
            <Button variant="primary" onClick={() => (barred ? askForPremium() : enrol('resume'))} isDisabled={enrolling} label={t('paths.action.resume')} />
          )}
          {enrollment?.status === 'active' && open && next && nextModule && (
            <Button variant="primary" onClick={() => (barred ? askForPremium() : navigate(activityHref(pathId, nextModule.id, next)))} label={t('paths.action.continue')} />
          )}
          {enrollment?.status === 'active' && (
            <Button variant="ghost" onClick={() => enrol('pause')} isDisabled={enrolling} label={t('paths.action.pause')} />
          )}
        </div>
      </header>

      {enrollError && (
        <div className="lp-notice lp-notice--error" role="alert">
          <span className="lp-notice__glyph" aria-hidden="true">
            !
          </span>
          <span>{enrollError}</span>
        </div>
      )}
      {!open && (
        <div className="lp-notice lp-notice--warning">
          <span className="lp-notice__glyph" aria-hidden="true">
            ◐
          </span>
          <span>{t(`paths.availability.${availability}` as never)}</span>
        </div>
      )}
      {enrollment?.status === 'paused' && (
        <div className="lp-notice">
          <span className="lp-notice__glyph" aria-hidden="true">
            ⏸
          </span>
          <span>{t('paths.paused')}</span>
        </div>
      )}

      <section className="lp-card lp-section">
        <h2>{t('paths.outcomes')}</h2>
        <ul className="lp-list">
          {manifest.outcomes.map((outcome, index) => (
            <li key={index}>{outcome}</li>
          ))}
        </ul>
        <h2>{t('paths.nonGoals')}</h2>
        <ul className="lp-list">
          {manifest.nonGoals.map((entryText, index) => (
            <li key={index}>{entryText}</li>
          ))}
        </ul>
        <h2>{t('paths.entryRequirement')}</h2>
        <p className="lp-lead">{manifest.entryRequirement}</p>
      </section>

      {progress.data && (
        <section className="lp-card lp-completion">
          <h2>{t('paths.progressTitle')}</h2>
          <div className="lp-completion__line">
            <span className="lp-completion__label">{manifest.completionLabel}</span>
            <StateBadge state={progress.data.guidedComplete ? 'verified_pass' : 'in_progress'} />
          </div>
          {inventory.artifacts > 0 && (
            <>
              <div className="lp-completion__line">
                <span className="lp-completion__label">{t('paths.portfolioSelfReviewed')}</span>
                <span className="lp-module__meta">
                  {t('paths.portfolioCount', {
                    submitted: progress.data.artifacts.submitted,
                    total: progress.data.artifacts.total,
                  })}
                </span>
              </div>
              {/* The modules require these pieces, so completion waits for
                  them; say so rather than implying they sit apart from it. */}
              <p className="lp-completion__note">{t('paths.portfolioRequired', { total: progress.data.artifacts.total })}</p>
            </>
          )}
          <p className="lp-completion__note">{t('paths.completionNote')}</p>
        </section>
      )}

      {progress.data && diagnosticModule && progress.data.competencies.length > 0 && (
        <section className="lp-card lp-section" aria-labelledby="path-diagnostic-title">
          <h2 id="path-diagnostic-title">{pathCopy['paths.diagnosticTitle']}</h2>
          <p className="lp-lead">{pathCopy['paths.diagnosticNote']}</p>
          <ul className="lp-list">
            {progress.data.competencies.map(result => {
              const competency = manifest.competencies.find(one => one.id === result.competencyId);
              if (!competency) return null;
              return (
                <li key={result.competencyId}>
                  <strong>{competency.title}</strong>{' — '}
                  {pathCopy[`paths.competency.${result.state}`]}
                  {result.score !== null && result.assessedItems > 0 && (
                    <> · {pathCopy['paths.diagnosticItems'].replace('{percent}', String(Math.round(result.score * 100))).replace('{count}', String(result.assessedItems))}</>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="lp-note">{pathCopy['paths.diagnosticRetakeNote']}</p>
          {reachable && manifest.diagnosticActivityId && (
            <Link to={activityHref(pathId, diagnosticModule.id, manifest.diagnosticActivityId)}>
              {pathCopy['paths.openDiagnostic']}
            </Link>
          )}
        </section>
      )}

      {progress.data && progress.data.recommendedBridges.length > 0 && (
        <section className="lp-card lp-section">
          <h2>{t('paths.bridgesTitle')}</h2>
          <p className="lp-lead">{t('paths.bridgesNote')}</p>
          {progress.data.recommendedBridges.map((bridgeId) => {
            const bridge = manifest.bridges.find((one) => one.id === bridgeId);
            if (!bridge) return null;
            return (
              <div key={bridge.id} className="lp-section">
                <h3>{bridge.title}</h3>
                <p className="lp-lead">{bridge.summary}</p>
                <ul className="lp-list">
                  {bridge.references.map((reference, index) => (
                    <li key={index}>
                      {reference.kind === 'doc' ? (
                        <a href={reference.ref} target="_blank" rel="noreferrer noopener">
                          {reference.label}
                        </a>
                      ) : reference.kind === 'roadmap-topic' ? (
                        <Link to={`/learn?topic=${encodeURIComponent(reference.ref)}`}>{reference.label}</Link>
                      ) : reference.kind === 'coding-task' ? (
                        <Link to={`/coding/javascript/${encodeURIComponent(reference.ref)}`}>{reference.label}</Link>
                      ) : (
                        reference.label
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <section className="lp-section">
        <h2>{t('paths.outline')}</h2>
        <div className="lp-modules">
          {requiredModules.map((module, index) => (
            <ModuleCard
              key={module.id}
              pathId={pathId}
              module={module}
              index={index + 1}
              states={states}
              completed={completedModules.has(module.id)}
              interactive={reachable}
            />
          ))}
        </div>
      </section>

      {/* The loop, then the shelves, then placement and bridges. */}
      {shelves.map(({ shelf, modules }) => (
        <section key={shelf} className="lp-section" aria-labelledby={`path-shelf-${shelf}`}>
          <h2 id={`path-shelf-${shelf}`}>{SHELF_COPY[shelf].title}</h2>
          <p className="lp-lead">{SHELF_COPY[shelf].note}</p>
          <div className="lp-modules">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                pathId={pathId}
                module={module}
                index={0}
                states={states}
                completed={false}
                interactive={reachable}
              />
            ))}
          </div>
        </section>
      ))}

      {optionalModules.length > 0 && (
        <section className="lp-section">
          <h2>{pathCopy['paths.optionalTitle']}</h2>
          <p className="lp-lead">{pathCopy['paths.optionalNote']}</p>
          <div className="lp-modules">
            {optionalModules.map((module) => (
              <ModuleCard
                key={module.id}
                pathId={pathId}
                module={module}
                index={0}
                states={states}
                completed={false}
                interactive={reachable}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── workspace ─────────────────────────────────────────────────────────── */

/** An opened attempt: its sealed session, when that expires, the idempotency
 * key its submission carries, and whether it has taken its one result. */
interface Attempt {
  session: string;
  expiresAt: string;
  key: string;
  usedUp: boolean;
}

/** One opened activity's autosave. Saves go one at a time; `revision` is the
 * one the server returned last, so a keystroke during a save never sends a
 * revision the server has already moved past; `queued` is the newest content
 * not sent yet. A save that lands after the learner moved on changes nothing
 * on screen, because the next activity has a channel of its own. */
interface DraftChannel {
  enrollmentId: string;
  activityId: string;
  revision: number;
  inFlight: boolean;
  queued: PathDraft['content'] | null;
}

/** Refusals that mean the attempt cannot take this submission. */
const ATTEMPT_USED_UP = new Set(['idempotency_conflict', 'session_expired', 'attempt_expired']);

export function ModuleWorkspace({ pathId }: { pathId: LearningPathId }) {
  const t = useT();
  const { moduleId = '' } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const queryClient = useQueryClient();
  const { userId, isAuthenticated, catalog, entry, enrollment, progress } = usePathState(pathId);
  const { lockOf } = useLocks();

  const activityId = search.get('activity');
  const enrollmentId = enrollment?.enrollmentId;
  const curriculumVersion = enrollment?.curriculumVersion;
  const [open, setOpen] = useState<StartActivityResponse | null>(null);
  const [result, setResult] = useState<SubmitActivityResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [draft, setDraft] = useState<PathDraft | null>(null);
  // Bumped to start the open activity again: a check's "Try again" deals its
  // questions afresh, with a new order and a new sealed key.
  const [deal, setDeal] = useState(0);
  // The attempt the next submission goes to. The server accepts one result per
  // attempt, so once it has one (or has expired, or refused the key) the next
  // submission opens a fresh attempt with a key of its own. Until then a retry
  // after a network failure reuses the key, and the server replays its stored
  // result instead of grading twice.
  const attempt = useRef<Attempt | null>(null);
  const [attemptUsedUp, setAttemptUsedUp] = useState(false);
  const [briefChanged, setBriefChanged] = useState(false);
  // The autosave for the open activity: one save in flight at a time, the
  // revision the next one expects, and the newest content waiting behind it.
  const drafts = useRef<DraftChannel | null>(null);

  const module = entry?.manifest.modules.find((one) => one.id === moduleId);
  const activity = module?.activities.find((one) => one.id === activityId);

  useEffect(() => {
    let cancelled = false;
    // The previous activity's view goes first, so nothing it holds (an
    // editor's source, a form's fields, a check's answers) carries into the
    // next activity or is autosaved as its draft.
    setOpen(null);
    setBriefChanged(false);
    setResult(null);
    setAttemptUsedUp(false);
    attempt.current = null;
    drafts.current = null;
    if (!activityId || !enrollmentId) return;
    setBusy(true);
    setError(null);
    startActivity({ enrollmentId, activityId })
      .then((started) => {
        if (cancelled) return;
        const kept = localDraftOver(enrollmentId, activityId, started.draft);
        attempt.current = { session: started.session, expiresAt: started.expiresAt, key: newIdempotencyKey(), usedUp: false };
        drafts.current = {
          enrollmentId,
          activityId,
          revision: started.draft?.revision ?? 0,
          inFlight: false,
          queued: kept?.content ?? null,
        };
        setOpen(started);
        setDraft(kept ?? started.draft);
        setDraftStatus(started.draft ? 'saved' : 'idle');
        capturePathEvent(
          started.previous && started.previous.attempts > 0
            ? 'learning_path_returned'
            : 'learning_path_activity_started',
          {
            pathId,
            curriculumVersion: curriculumVersion ?? 0,
            activityId: started.activity.id,
            activityKind: started.activity.kind,
          },
        );
      })
      .catch((caught) => {
        if (!cancelled) setError(friendlyError(caught));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId, enrollmentId, curriculumVersion, deal, pathId]);

  const pushDraft = useCallback(async () => {
    const channel = drafts.current;
    if (!channel || channel.inFlight || !channel.queued) return;
    const live = () => drafts.current === channel;
    channel.inFlight = true;
    try {
      while (channel.queued) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          // Offline keeps the copy on this device and says so; reconnecting
          // sends it. It never overwrites a newer server revision: that save
          // would conflict first.
          if (live()) setDraftStatus('offline');
          return;
        }
        const content = channel.queued;
        channel.queued = null;
        if (live()) setDraftStatus('saving');
        try {
          const saved = await savePathDraft({
            enrollmentId: channel.enrollmentId,
            activityId: channel.activityId,
            expectedRevision: channel.revision,
            content,
          });
          channel.revision = saved.draft.revision;
          if (channel.queued) keepDraftLocally(channel.enrollmentId, channel.activityId, channel.revision, channel.queued);
          else forgetLocalDraft(channel.enrollmentId, channel.activityId);
          if (live()) {
            setDraft(saved.draft);
            if (!channel.queued) setDraftStatus('saved');
          }
        } catch (caught) {
          // The newest unsaved content waits for the next keystroke or the
          // connection coming back.
          channel.queued ??= content;
          if (live()) setDraftStatus(caught instanceof ApiError && caught.code === 'draft_conflict' ? 'conflict' : 'error');
          return;
        }
      }
    } finally {
      channel.inFlight = false;
    }
  }, []);

  const saveDraft = useCallback(
    (content: PathDraft['content']) => {
      const channel = drafts.current;
      if (!channel) return;
      channel.queued = content;
      keepDraftLocally(channel.enrollmentId, channel.activityId, channel.revision, content);
      void pushDraft();
    },
    [pushDraft],
  );

  // A copy kept on this device from an earlier visit goes out as soon as the
  // activity opens, and anything waiting goes out when the connection is back.
  useEffect(() => {
    if (open) void pushDraft();
  }, [open, pushDraft]);
  useEffect(() => {
    const resend = () => void pushDraft();
    window.addEventListener('online', resend);
    return () => window.removeEventListener('online', resend);
  }, [pushDraft]);

  // Starts the open activity again. A check is dealt afresh; anything else
  // keeps what the learner wrote, and the next Submit opens a new attempt.
  const retry = useCallback(() => {
    if (open?.check) {
      setDeal((count) => count + 1);
      return;
    }
    setResult(null);
    setError(null);
  }, [open]);

  const refreshBrief = async () => {
    const current = attempt.current;
    if (!open || !enrollment || !current || busy) return;
    setBusy(true);
    try {
      const fresh = await startActivity({ enrollmentId: enrollment.enrollmentId, activityId: open.activity.id });
      if (attempt.current !== current) return;
      attempt.current = { session: fresh.session, expiresAt: fresh.expiresAt, key: newIdempotencyKey(), usedUp: false };
      setOpen(fresh);
      setBriefChanged(false);
      setError(null);
      setResult(null);
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  };

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      const current = attempt.current;
      if (!open || !enrollment || !current || briefChanged) return;
      const expired = Date.parse(current.expiresAt) <= Date.now();
      // A check's answers index its own attempt's order, so a check whose
      // attempt is used up is dealt again rather than resubmitted.
      if (open.check && (current.usedUp || expired)) {
        retry();
        return;
      }
      setBusy(true);
      setError(null);
      try {
        let target = current;
        if (current.usedUp || expired) {
          const fresh = await startActivity({ enrollmentId: enrollment.enrollmentId, activityId: open.activity.id, previousSession: current.session });
          if (attempt.current !== current) return;
          target = { session: fresh.session, expiresAt: fresh.expiresAt, key: newIdempotencyKey(), usedUp: false };
          attempt.current = target;
          if (fresh.needsBriefReview) {
            setOpen(fresh);
            setBriefChanged(true);
            setError(t('coding.verdict.taskChanged'));
            return;
          }
        }
        const graded = await submitActivity({
          session: target.session,
          idempotencyKey: target.key,
          ...payload,
        });
        target.usedUp = true;
        // The learner moved to another activity while this one was graded.
        if (attempt.current !== target) return;
        setAttemptUsedUp(false);
        setResult(graded);
        if (!graded.replayed && graded.xpAwarded > 0) {
          announceVerifiedQuestXp(graded.xpAwarded);
          void syncXpWithServer({ announceRankUp: true });
        }
        if (graded.state === 'verified_pass') {
          capturePathEvent('learning_path_activity_verified', {
            pathId,
            curriculumVersion: enrollment.curriculumVersion,
            activityId: graded.activityId,
            state: graded.state,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: learningPathKeys.progress(userId, enrollment.enrollmentId, enrollment.curriculumVersion),
        });
      } catch (caught) {
        // An attempt that expired or already holds a result cannot take this
        // submission; the next one goes to a new attempt.
        if (caught instanceof ApiError && caught.code && ATTEMPT_USED_UP.has(caught.code) && attempt.current) {
          attempt.current.usedUp = true;
          setAttemptUsedUp(true);
        }
        if (caught instanceof ApiError && caught.code === 'task_changed') setBriefChanged(true);
        setError(friendlyError(caught));
      } finally {
        setBusy(false);
      }
    },
    [open, enrollment, retry, queryClient, userId, pathId, briefChanged, t],
  );

  if (catalog.isLoading) return <LoadingScreen label={t('paths.loading')} />;
  if (catalog.isError || !entry || !module) {
    return (
      <div className="lp-page">
        <ErrorRetry message={t('paths.error.module')} onRetry={() => catalog.refetch()} />
      </div>
    );
  }

  const states = statesOf(progress.data);
  const moduleProgress = progress.data?.modules.find((one) => one.moduleId === module.id);
  // A path that is switched off, or that the plan no longer opens, lists its
  // activities without links: starting one would be refused.
  const reachable = Boolean(enrollment) && isOpen(entry.availability) && !isBarred(lockOf({ kind: 'learning-path', pathId }));
  // Only the dimensions this artifact is judged against, so the learner reads
  // the criteria that apply rather than the whole rubric.
  const rubric = entry.manifest.rubric.dimensions
    .filter((dimension) => open?.activity.rubricDimensions?.includes(dimension.id))
    .map((dimension) => ({
      id: dimension.id,
      title: dimension.title,
      levels: dimension.levels as unknown as Record<string, string>,
    }));

  return (
    <div className="lp-page">
      <header className="lp-head">
        <div className="lp-head__text">
          <p className="lp-kicker">
            <Link to={pathHref(pathId)}>{entry.manifest.title}</Link>
          </p>
          <h1>{module.title}</h1>
          <ul className="lp-module__outcomes">
            {module.outcomes.map((outcome, index) => (
              <li key={index}>{outcome}</li>
            ))}
          </ul>
        </div>
        <div className="lp-head__actions">
          <span className="lp-module__meta">
            {/* An off-loop module never completes, so "In progress" would
                read as unfinished for good. */}
            {offLoop(module)
              ? t('paths.module.optional')
              : moduleProgress?.completed ? t('paths.module.complete') : t('paths.module.inProgress')}
          </span>
        </div>
      </header>

      {!isAuthenticated && (
        <div className="lp-notice lp-notice--info">
          <span className="lp-notice__glyph" aria-hidden="true">
            ℹ
          </span>
          <span>{t('paths.signInToRecord')}</span>
        </div>
      )}
      {isAuthenticated && !enrollment && (
        <div className="lp-notice lp-notice--info">
          <span className="lp-notice__glyph" aria-hidden="true">
            ℹ
          </span>
          <span>
            {t('paths.notEnrolled')} <Link to={pathHref(pathId)}>{t('paths.action.start')}</Link>
          </span>
        </div>
      )}

      <section className="lp-section">
        <h2>{t('paths.activities')}</h2>
        <ul className="lp-activities">
          {module.activities.map((one) => (
            <ActivityRow
              key={one.id}
              pathId={pathId}
              moduleId={module.id}
              activity={one}
              state={states.get(one.id) ?? 'not_started'}
              interactive={reachable}
            />
          ))}
        </ul>
      </section>

      {activityId && enrollment && (
        <section className="lp-workspace" aria-live="polite">
          <div className="lp-head">
            <div className="lp-head__text">
              <h2>{activity ? activity.title : ''}</h2>
              {activity && <p className="lp-lead">{activity.summary}</p>}
            </div>
            <div className="lp-head__actions">
              <Button variant="ghost" onClick={() => {
                  const next = new URLSearchParams(search);
                  next.delete('activity');
                  setSearch(next, { replace: true });
                }} label={t('paths.action.close')} />
            </div>
          </div>

          {error && (
            <div className="lp-notice lp-notice--error" role="alert">
              <span className="lp-notice__glyph" aria-hidden="true">
                !
              </span>
              <span>{error}</span>
              {briefChanged && <Button className="lp-brief-refresh" variant="secondary" isDisabled={busy} onClick={() => void refreshBrief()} label={t('coding.verdict.reloadBrief')} />}
            </div>
          )}

          {busy && !open && <LoadingScreen label={t('paths.loadingActivity')} />}

          {open?.previous && open.previous.state !== 'not_started' && (
            <div className="lp-notice">
              <span className="lp-notice__glyph" aria-hidden="true">
                ↺
              </span>
              <span>
                {t('paths.previousAttempt', {
                  attempts: open.previous.attempts,
                })}{' '}
                <StateBadge state={open.previous.state} />
              </span>
            </div>
          )}

          {open?.lesson && (
            <LessonActivity
              activity={open}
              busy={busy}
              acknowledged={result?.state === 'self_reviewed'}
              onAcknowledge={() => submit({ acknowledged: true })}
            />
          )}

          {open?.check && (
            <CheckActivity
              questions={open.check.questions}
              scenario={open.activity.scenario}
              passThreshold={open.check.passThreshold}
              domains={open.activity.domains}
              domainThreshold={open.check.domainThreshold}
              result={result}
              busy={busy}
              onSubmit={(answers) => submit({ answers })}
              onRetry={retry}
              retryNeeded={attemptUsedUp}
            />
          )}

          {open?.code && result?.state === 'verified_pass' && result.code?.outcome === 'passed' && <CodingCompletion
            xp={result.xpAwarded} complexity={result.complexity} backHref={moduleHref(pathId,module.id)}
            nextHref={result.nextActivityId && result.nextActivityId !== open.activity.id ? (() => {
              const nextModule = entry.manifest.modules.find(one => one.activities.some(activity => activity.id === result.nextActivityId));
              return nextModule ? activityHref(pathId,nextModule.id,result.nextActivityId!) : undefined;
            })() : undefined} />}
          {open?.code && !(result?.state === 'verified_pass' && result.code?.outcome === 'passed') && (
            <CodeActivity
              key={open.activity.id}
              code={open.code}
              fixtureNote={open.activity.fixtureNote}
              submitBlocked={briefChanged}
              draft={draft}
              result={result}
              busy={busy}
              draftStatus={draftStatus}
              onDraft={(source) => saveDraft({ code: source })}
              onSubmit={(source) => submit({ code: source })}
            />
          )}

          {open?.artifact && (
            <ArtifactActivity
              key={open.activity.id}
              artifact={open.artifact}
              rubric={rubric}
              draft={draft}
              result={result}
              busy={busy}
              draftStatus={draftStatus}
              onDraft={(values) => saveDraft({ artifact: values })}
              onSubmit={(values) => submit({ artifact: values })}
            />
          )}

          {result && !(open?.code && result.state === 'verified_pass' && result.code?.outcome === 'passed') && (
            <section className="lp-card lp-section">
              <div className="lp-completion__line">
                <h2>{t('paths.result')}</h2>
                <StateBadge state={result.state} />
                {result.score !== null && (
                  <span className="lp-module__meta">
                    {t('paths.score', { percent: Math.round(result.score * 100) })}
                  </span>
                )}
              </div>
              {result.replayed && <p className="lp-completion__note">{t('paths.replayed')}</p>}
              {result.domainScores && (
                <ul className="lp-list lp-list--plain">
                  {Object.entries(result.domainScores).map(([domain, share]) => (
                    <li key={domain}>
                      {t(`paths.domain.${domain}` as never)}: {Math.round(share * 100)}%
                      {result.failedDomains?.includes(domain) ? ` — ${t('paths.domainBelow')}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <CriteriaList criteria={result.criteria} />
              <Feedback feedback={result.feedback} />
              {/* When the next thing worth doing is this activity again, the way
                  on is another attempt, not a link back to where the learner
                  already is. A check offers its own "Try again" above. */}
              {result.nextActivityId && result.nextActivityId !== open?.activity.id && (
                <div className="lp-actions lp-actions--end">
                  <Button variant="primary" onClick={() => {
                      const nextModule = entry.manifest.modules.find((one) =>
                        one.activities.some((a) => a.id === result.nextActivityId),
                      );
                      if (!nextModule) return;
                      navigate(activityHref(pathId, nextModule.id, result.nextActivityId!));
                    }} label={t('paths.action.next')} />
                </div>
              )}
              {result.nextActivityId && result.nextActivityId === open?.activity.id && !open.check && (
                <div className="lp-actions lp-actions--end">
                  <Button variant="primary" onClick={retry} label={t('error.tryAgain')} />
                </div>
              )}
            </section>
          )}
        </section>
      )}
    </div>
  );
}

/* ── route entry points ────────────────────────────────────────────────── */

export const FdeOverview = () => <PathOverview pathId="fde" />;
export const FdeModule = () => <ModuleWorkspace pathId="fde" />;
export const DsaOverview = () => <PathOverview pathId="dsa-foundations" />;
export const DsaModule = () => <ModuleWorkspace pathId="dsa-foundations" />;

export type { PathCatalogEntry };
