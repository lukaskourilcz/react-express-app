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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { useT } from '../../i18n/LanguageContext';
import { ApiError, friendlyError } from '../../lib/api';
import { capturePathEvent } from '../../lib/analytics';
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
  useLoc,
  useLocList,
  type DraftStatus,
} from './ActivityViews';
import {
  activityHref,
  changeEnrollment,
  entryFor,
  isOpen,
  learningPathKeys,
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
import type { ActivitySummary, EvidenceState, LearningPathId, ModuleSummary } from '../../../../shared/learning-paths';
import './LearningPaths.css';

/* ── shared hooks ──────────────────────────────────────────────────────── */

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
  const loc = useLoc();
  const body = (
    <>
      <span className="lp-activity__kind">{t(`paths.kind.${activity.kind}` as never)}</span>
      <span className="lp-activity__title">{loc(activity.title)}</span>
      <span className="lp-activity__minutes">{t('paths.minutes', { minutes: activity.estimatedMinutes })}</span>
      <StateBadge state={state} />
      <p className="lp-activity__summary">{loc(activity.summary)}</p>
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
  const loc = useLoc();
  const locList = useLocList();
  const className = [
    'lp-module',
    completed ? 'lp-module--done' : '',
    module.optional ? 'lp-module--optional' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section className={className}>
      <div className="lp-module__head">
        <h2 className="lp-module__title">
          <span className="lp-module__index">
            {module.optional ? t('paths.module.optional') : t('paths.module.index', { index })}
          </span>
          {interactive ? <Link to={moduleHref(pathId, module.id)}>{loc(module.title)}</Link> : loc(module.title)}
        </h2>
        <span className="lp-module__meta">
          {t('paths.minutes', { minutes: module.estimatedMinutes })}
          {completed ? ` · ${t('paths.module.complete')}` : ''}
        </span>
      </div>
      <ul className="lp-module__outcomes">
        {locList(module.outcomes).map((outcome, position) => (
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
  const loc = useLoc();
  const locList = useLocList();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId, isAuthenticated, catalog, entry, enrollment, progress } = usePathState(pathId);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

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
        await changeEnrollment({ pathId, curriculumVersion: entry.manifest.version, action });
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
    [entry, pathId, queryClient, userId],
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
  const requiredModules = manifest.modules.filter((one) => !one.optional);
  const optionalModules = manifest.modules.filter((one) => one.optional);

  return (
    <div className="lp-page">
      <header className="lp-head">
        <div className="lp-head__text">
          <p className="lp-kicker">
            {manifest.kind === 'role_specialization' ? t('paths.kicker.role') : t('paths.kicker.skill')}
          </p>
          <h1>{loc(manifest.title)}</h1>
          <p className="lp-lead">{loc(manifest.summary)}</p>
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
        </div>
        <div className="lp-head__actions">
          {!isAuthenticated && <span className="lp-actions__status">{t('paths.guestPreview')}</span>}
          {isAuthenticated && !enrollment && open && (
            <button type="button" className="lp-btn lp-btn--primary" onClick={() => enrol('enroll')} disabled={enrolling}>
              {enrolling ? t('paths.action.starting') : t('paths.action.start')}
            </button>
          )}
          {isAuthenticated && enrollment?.status === 'paused' && (
            <button type="button" className="lp-btn lp-btn--primary" onClick={() => enrol('resume')} disabled={enrolling}>
              {t('paths.action.resume')}
            </button>
          )}
          {enrollment?.status === 'active' && next && nextModule && (
            <button
              type="button"
              className="lp-btn lp-btn--primary"
              onClick={() => navigate(activityHref(pathId, nextModule.id, next))}
            >
              {t('paths.action.continue')}
            </button>
          )}
          {enrollment?.status === 'active' && (
            <button type="button" className="lp-btn lp-btn--quiet" onClick={() => enrol('pause')} disabled={enrolling}>
              {t('paths.action.pause')}
            </button>
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
          {locList(manifest.outcomes).map((outcome, index) => (
            <li key={index}>{outcome}</li>
          ))}
        </ul>
        <h2>{t('paths.nonGoals')}</h2>
        <ul className="lp-list">
          {locList(manifest.nonGoals).map((entryText, index) => (
            <li key={index}>{entryText}</li>
          ))}
        </ul>
        <h2>{t('paths.entryRequirement')}</h2>
        <p className="lp-lead">{loc(manifest.entryRequirement)}</p>
      </section>

      {progress.data && (
        <section className="lp-card lp-completion">
          <h2>{t('paths.progressTitle')}</h2>
          <div className="lp-completion__line">
            <span className="lp-completion__label">{loc(manifest.completionLabel)}</span>
            <StateBadge state={progress.data.guidedComplete ? 'verified_pass' : 'in_progress'} />
          </div>
          {inventory.artifacts > 0 && (
            <div className="lp-completion__line">
              <span className="lp-completion__label">{t('paths.portfolioSelfReviewed')}</span>
              <span className="lp-module__meta">
                {t('paths.portfolioCount', {
                  submitted: progress.data.artifacts.submitted,
                  total: progress.data.artifacts.total,
                })}
              </span>
            </div>
          )}
          <p className="lp-completion__note">{t('paths.completionNote')}</p>
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
                <h3>{loc(bridge.title)}</h3>
                <p className="lp-lead">{loc(bridge.summary)}</p>
                <ul className="lp-list">
                  {bridge.references.map((reference, index) => (
                    <li key={index}>
                      {reference.kind === 'doc' ? (
                        <a href={reference.ref} target="_blank" rel="noreferrer noopener">
                          {loc(reference.label)}
                        </a>
                      ) : reference.kind === 'roadmap-topic' ? (
                        <Link to={`/learn?topic=${encodeURIComponent(reference.ref)}`}>{loc(reference.label)}</Link>
                      ) : reference.kind === 'coding-task' ? (
                        <Link to={`/coding/javascript/${encodeURIComponent(reference.ref)}`}>{loc(reference.label)}</Link>
                      ) : (
                        loc(reference.label)
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
              interactive={Boolean(enrollment)}
            />
          ))}
        </div>
      </section>

      {optionalModules.length > 0 && (
        <section className="lp-section">
          <h2>{t('paths.optionalTitle')}</h2>
          <p className="lp-lead">{t('paths.optionalNote')}</p>
          <div className="lp-modules">
            {optionalModules.map((module) => (
              <ModuleCard
                key={module.id}
                pathId={pathId}
                module={module}
                index={0}
                states={states}
                completed={false}
                interactive={Boolean(enrollment)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── workspace ─────────────────────────────────────────────────────────── */

export function ModuleWorkspace({ pathId }: { pathId: LearningPathId }) {
  const t = useT();
  const loc = useLoc();
  const locList = useLocList();
  const { moduleId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const queryClient = useQueryClient();
  const { userId, isAuthenticated, catalog, entry, enrollment, progress } = usePathState(pathId);

  const activityId = search.get('activity');
  const [open, setOpen] = useState<StartActivityResponse | null>(null);
  const [result, setResult] = useState<SubmitActivityResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [draft, setDraft] = useState<PathDraft | null>(null);
  // One key per intended submission: a retry after a network failure reuses it
  // so the server replays its stored result instead of grading twice.
  const [submitKey, setSubmitKey] = useState(() => newIdempotencyKey());

  const module = entry?.manifest.modules.find((one) => one.id === moduleId);
  const activity = module?.activities.find((one) => one.id === activityId);

  useEffect(() => {
    let cancelled = false;
    if (!activityId || !enrollment) {
      setOpen(null);
      setResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    startActivity({ enrollmentId: enrollment.enrollmentId, activityId })
      .then((started) => {
        if (cancelled) return;
        setOpen(started);
        setDraft(started.draft);
        setDraftStatus(started.draft ? 'saved' : 'idle');
        setSubmitKey(newIdempotencyKey());
        capturePathEvent(
          started.previous && started.previous.attempts > 0
            ? 'learning_path_returned'
            : 'learning_path_activity_started',
          {
            pathId,
            curriculumVersion: enrollment.curriculumVersion,
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
  }, [activityId, enrollment]);

  const saveDraft = useCallback(
    async (content: PathDraft['content']) => {
      if (!enrollment || !activityId) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        // Offline keeps the local copy and says so. Nothing authoritative
        // happens offline, and reconnecting never overwrites a newer server
        // revision — the save below would conflict first.
        setDraftStatus('offline');
        return;
      }
      setDraftStatus('saving');
      try {
        const saved = await savePathDraft({
          enrollmentId: enrollment.enrollmentId,
          activityId,
          expectedRevision: draft?.revision ?? 0,
          content,
        });
        setDraft(saved.draft);
        setDraftStatus('saved');
      } catch (caught) {
        setDraftStatus(caught instanceof ApiError && caught.code === 'draft_conflict' ? 'conflict' : 'error');
      }
    },
    [enrollment, activityId, draft],
  );

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!open || !enrollment) return;
      setBusy(true);
      setError(null);
      try {
        const graded = await submitActivity({
          session: open.session,
          idempotencyKey: submitKey,
          ...payload,
        });
        setResult(graded);
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
        setError(friendlyError(caught));
      } finally {
        setBusy(false);
      }
    },
    [open, enrollment, submitKey, queryClient, userId],
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
  const rubric = entry.manifest.rubric.dimensions
    .filter((dimension) => open?.activity.rubricDimensions?.includes(dimension.id))
    .map((dimension) => ({ id: dimension.id, title: dimension.title, levels: dimension.levels as unknown as Record<string, import('../../../../shared/learning-paths').Localized> }));

  return (
    <div className="lp-page">
      <header className="lp-head">
        <div className="lp-head__text">
          <p className="lp-kicker">
            <Link to={pathHref(pathId)}>{loc(entry.manifest.title)}</Link>
          </p>
          <h1>{loc(module.title)}</h1>
          <ul className="lp-module__outcomes">
            {locList(module.outcomes).map((outcome, index) => (
              <li key={index}>{outcome}</li>
            ))}
          </ul>
        </div>
        <div className="lp-head__actions">
          <span className="lp-module__meta">
            {moduleProgress?.completed ? t('paths.module.complete') : t('paths.module.inProgress')}
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
              interactive={Boolean(enrollment)}
            />
          ))}
        </ul>
      </section>

      {activityId && !enrollment && null}

      {activityId && enrollment && (
        <section className="lp-workspace" aria-live="polite">
          <div className="lp-head">
            <div className="lp-head__text">
              <h2>{activity ? loc(activity.title) : ''}</h2>
              {activity && <p className="lp-lead">{loc(activity.summary)}</p>}
            </div>
            <div className="lp-head__actions">
              <button
                type="button"
                className="lp-btn lp-btn--quiet"
                onClick={() => {
                  const next = new URLSearchParams(search);
                  next.delete('activity');
                  setSearch(next, { replace: true });
                }}
              >
                {t('paths.action.close')}
              </button>
            </div>
          </div>

          {error && (
            <div className="lp-notice lp-notice--error" role="alert">
              <span className="lp-notice__glyph" aria-hidden="true">
                !
              </span>
              <span>{error}</span>
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
              passThreshold={open.check.passThreshold}
              domains={open.activity.domains}
              result={result}
              busy={busy}
              onSubmit={(answers) => submit({ answers })}
            />
          )}

          {open?.code && (
            <CodeActivity
              code={open.code}
              draft={draft}
              result={result}
              busy={busy}
              expired={Date.parse(open.expiresAt) < Date.now()}
              draftStatus={draftStatus}
              onDraft={(source) => void saveDraft({ code: source })}
              onSubmit={(source) => submit({ code: source })}
            />
          )}

          {open?.artifact && (
            <ArtifactActivity
              artifact={open.artifact}
              rubric={rubric}
              draft={draft}
              result={result}
              busy={busy}
              draftStatus={draftStatus}
              onDraft={(values) => void saveDraft({ artifact: values })}
              onSubmit={(values) => submit({ artifact: values })}
            />
          )}

          {result && (
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
              {result.nextActivityId && (
                <div className="lp-actions lp-actions--end">
                  <button
                    type="button"
                    className="lp-btn lp-btn--primary"
                    onClick={() => {
                      const nextModule = entry.manifest.modules.find((one) =>
                        one.activities.some((a) => a.id === result.nextActivityId),
                      );
                      if (!nextModule) return;
                      window.location.assign(activityHref(pathId, nextModule.id, result.nextActivityId!));
                    }}
                  >
                    {t('paths.action.next')}
                  </button>
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
