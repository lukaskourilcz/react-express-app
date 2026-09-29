import { useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Kicker } from './landing/LandingKit';
import { Link } from 'react-router-dom';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button as AxButton } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useSubject, topicsForSubject, type SubjectId } from '../lib/subjects';
import { useRoadmapProgress, useExtraUnlocks, type RoadmapProgress,
  availabilityOf,
  syncProgressWithServer,
  type StepAvailability,
} from '../lib/roadmap';
import { conceptDueQuery, roadmapStructureQuery } from '../lib/queries';
import { entitlementQuery } from '../lib/entitlement';
import { enrollmentsQuery, pathCatalogQuery, pathProgressQuery } from '../lib/learningPaths';
import { HELD_READ, lazyPart, readOnce, settled, useFirstData } from '../lib/routeData';
import { ApiError } from '../lib/api';
import { buildToday, type TodayItem, type TodayKind } from '../lib/today';
import { masteryDayKey, type LevelMasteryEntry } from '../../../shared/mastery';
import { getCategoryHexColor } from '../lib/categories';
import { CategoryGlyph } from './ui/techIcons';
import { SharkFin } from './SharkFin';
import { useAuth } from '../lib/auth';
import { isBarred, useLocks } from '../lib/locks';
import { useInPlan } from '../lib/eligibility';
import { openUpgradeSheet } from '../lib/upgradeSheet';
import { gatedRef } from '../../../shared/tiers';
import type { RoadmapTopic, RoadmapStructure } from '../types/quiz';
import './Today.css';
import './DeepEndScreens.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// The four sections only a signed-in learner sees, each in a chunk of its own
// so a visitor never loads them: concepts due for review, the open challenge
// run (planned or under way), coding tasks due for a second pass, and the next
// activity of each active learning path. Signed in, their code and their data
// load inside the page's first-data hold, so they draw with the plan instead
// of under it a beat later.
const ConceptDue = lazyPart(() => import('./ConceptDueSection').then((m) => m.ConceptDueSection));
const ChallengeRun = lazyPart(() => import('./coding/ChallengeRunSection').then((m) => m.ChallengeRunSection));
const CodingDue = lazyPart(() => import('./coding/CodingDueSection').then((m) => m.CodingDueSection));
const PathResume = lazyPart(() => import('./paths/PathResumeSection').then((m) => m.PathResumeSection));
const SIGNED_IN_PARTS = [ConceptDue, ChallengeRun, CodingDue, PathResume];

// The plan is priority-ordered; render it grouped under these headings.
const SECTION_ORDER: TodayKind[] = ['unfinished', 'review', 'new'];
const SECTION_TITLE: Record<TodayKind, TranslationKey> = {
  unfinished: 'today.sectionUnfinished',
  review: 'today.sectionReview',
  new: 'today.sectionNew',
};
const ACTION_LABEL: Record<TodayKind, TranslationKey> = {
  unfinished: 'today.continue',
  review: 'today.review',
  new: 'today.start',
};

const CheckGlyph = ({ size = 22 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowGlyph = ({ size = 16 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/** Real per-topic level counts, so a fully-completed topic never proposes a
 *  phantom next level. Omitted (undefined) until the structure has loaded. */
function levelCountsFor(
  structure: RoadmapStructure | null,
  subject: SubjectId,
): Partial<Record<RoadmapTopic, number>> | undefined {
  if (!structure) return undefined;
  const counts: Partial<Record<RoadmapTopic, number>> = {};
  for (const topic of topicsForSubject(subject)) {
    const n = structure.structure[topic]?.levels.length;
    if (typeof n === 'number') counts[topic] = n;
  }
  return counts;
}

/** Per-topic availability from the fetched map, so Today steps over levels the
 *  server will not open and uses the real part boundaries. */
function availabilityFor(
  structure: RoadmapStructure | null,
  subject: SubjectId,
): Partial<Record<RoadmapTopic, StepAvailability>> | undefined {
  if (!structure) return undefined;
  const out: Partial<Record<RoadmapTopic, StepAvailability>> = {};
  for (const topic of topicsForSubject(subject)) {
    const entry = structure.structure[topic];
    if (entry) out[topic] = availabilityOf(entry);
  }
  return out;
}

/** Distinct levels passed today (mirrors buildToday's completedToday signal),
 *  capped at the target — drives the "N / target done" line. Needs lastPassDay,
 *  which is written by the server on a verified pass, so guests may read 0. */
function doneToday(progress: RoadmapProgress, subject: SubjectId, target: number): number {
  const todayKey = masteryDayKey();
  const seen = new Set<string>();
  for (const topic of topicsForSubject(subject)) {
    const levels = progress[topic]?.levels ?? {};
    for (const [key, entry] of Object.entries(levels)) {
      if ((entry as LevelMasteryEntry).lastPassDay === todayKey) seen.add(`${topic}:${key}`);
    }
  }
  return Math.min(seen.size, target);
}

/** The structure and, signed in, the plan, the four sections' code and what
 * they read, in the cache before the first render. The sections used to
 * arrive under the plan after it, one by one. A path's next activity needs its
 * enrollment first, so that read waits for the list. The run's and the coding
 * progress's query options load beside the sections' code, so a visitor, who
 * reads neither, never downloads them. */
function useTodayFirstData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useFirstData(`today ${user?.id ?? ''}`, () => settled([
    readOnce(queryClient, roadmapStructureQuery),
    ...(user
      ? [
          // The plan is built from the browser's copy of the progress. On a
          // new device that copy is empty, and Today would plan JavaScript 1
          // for a learner with dozens of passed levels.
          syncProgressWithServer(),
          readOnce(queryClient, entitlementQuery(user.id)),
          ...SIGNED_IN_PARTS.map((part) => part.load()),
          readOnce(queryClient, conceptDueQuery),
          import('../coding/practice').then(({ practiceSessionQuery }) => readOnce(queryClient, practiceSessionQuery)),
          import('../coding/api').then(({ codingProgressQuery }) => readOnce(queryClient, codingProgressQuery)),
          readOnce(queryClient, enrollmentsQuery(user.id)).then(({ enrollments }) => {
            const active = enrollments.filter((one) => one.status === 'active');
            return settled(active.length
              ? [
                  readOnce(queryClient, pathCatalogQuery),
                  ...active.map((one) => readOnce(queryClient, pathProgressQuery(user.id, one.enrollmentId, one.curriculumVersion))),
                ]
              : []);
          }),
        ]
      : []),
  ]));
}

export default function Today() {
  useTodayFirstData();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [subject] = useSubject();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  // Both reads are the hold's: one that failed there draws its notice with
  // the page, instead of the skeleton first.
  const structureQuery = useQuery({ ...roadmapStructureQuery, ...HELD_READ });
  const structure: RoadmapStructure | null = structureQuery.data ?? null;
  // The plan leaves out levels Premium opens on a free account.
  const { lockOf, loading: planLoading } = useLocks(undefined, { held: true });
  const canStart = useCallback(
    (topic: RoadmapTopic, level: number) => !isBarred(lockOf({ kind: 'learn-level', topic, level })),
    [lockOf],
  );
  // The server serves nothing new outside the learner's chosen track.
  const inPlan = useInPlan();

  // buildToday is pure and offline: it reads local roadmap progress + the shared
  // spaced-mastery rules, so the plan renders even when the structure fetch
  // fails. The structure only refines the per-topic level bounds.
  const plan = useMemo(
    () =>
      buildToday(progress, subject, {
        today: masteryDayKey(),
        levelCounts: levelCountsFor(structure, subject),
        availability: availabilityFor(structure, subject),
        extraUnlocks,
        canStart,
        inPlan,
      }),
    [progress, subject, extraUnlocks, structure, canStart, inPlan],
  );
  const done = useMemo(() => doneToday(progress, subject, plan.target), [progress, subject, plan.target]);

  // Wait for the structure before showing a plan, so a fully-completed topic
  // can't flash a phantom "new" level. A warm cache resolves instantly.
  if (structureQuery.isPending || planLoading) {
    return (
      <TodayShell t={t}>
        <div className="today-loading" role="status" aria-live="polite">
          <Skeleton height={96} radius={3} index={0} />
          <Skeleton height={78} radius={3} index={1} />
          <Skeleton height={78} radius={3} index={2} />
          <span className="today-loading__label">{t('today.loading')}</span>
        </div>
      </TodayShell>
    );
  }

  // The structure only refines the plan's level bounds — buildToday still runs
  // from local progress if it fails — so a fetch error degrades to a non-blocking
  // notice, not a dead end. A connectivity failure (status 0) reads as offline;
  // anything else as a plain "couldn't refresh" error. Retry is always offered.
  const fetchError = structureQuery.error;
  const isOffline = fetchError instanceof ApiError && fetchError.status === 0;
  const { items, startHereId, unfinishedCount, reviewCount, newCount, target, completedToday } = plan;
  const hasPlan = items.length > 0;

  return (
    <TodayShell t={t}>
      {fetchError && (
        <div style={{ marginBottom: 16 }}>
          <Banner
            status="warning"
            title={isOffline ? t('today.offline') : t('today.error')}
            endContent={
              <AxButton variant="ghost" size="sm" label={t('today.retry')} onClick={() => structureQuery.refetch()} />
            }
          />
        </div>
      )}

      {completedToday ? (
        <DonePanel t={t} />
      ) : hasPlan ? (
        <ProgressPanel done={done} target={target} t={t} />
      ) : null}

      {hasPlan ? (
        <>
          {SECTION_ORDER.map((kind) => {
            const group = items.filter((item) => item.kind === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind} className="today-section" aria-label={t(SECTION_TITLE[kind])}>
                <h2 className="today-section__title">{t(SECTION_TITLE[kind])}</h2>
                <ul className="today-list">
                  {group.map((item) => (
                    <li key={item.id}>
                      <TodayCard item={item} isStartHere={item.id === startHereId} t={t} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="today-summary">
            {t('today.summary', { unfinished: unfinishedCount, review: reviewCount, new: newCount })}
          </p>
        </>
      ) : !completedToday ? (
        plan.premiumNext ? <PremiumEmptyState item={plan.premiumNext} t={t} /> : <EmptyState t={t} />
      ) : null}

      {isAuthenticated && (
        <>
          <ConceptDue.Part />
          <ChallengeRun.Part />
          <CodingDue.Part />
          <PathResume.Part />
        </>
      )}
    </TodayShell>
  );
}

/* ── shell: editorial header + page frame ─────────────────────────────────── */

function TodayShell({ t, children }: { t: TFn; children: ReactNode }) {
  return (
    <div className="de-page today-page" style={{ maxWidth: 760 }}>
      <header className="today-heading">
        <Kicker>{t('today.kicker')}</Kicker>
        <Heading level={1}>{t('today.title')}</Heading>
      </header>
      {children}
    </div>
  );
}

/* ── progress toward the daily target ─────────────────────────────────────── */

function ProgressPanel({ done, target, t }: { done: number; target: number; t: TFn }) {
  const pct = target > 0 ? Math.round((done / target) * 100) : 0;
  const label = t('today.progress', { done, target });
  return (
    <section className="today-progress ss-panel">
      <div className="today-progress__head">
        <Kicker>{t('today.targetLabel')}</Kicker>
        <span className="today-progress__count">{label}</span>
      </div>
      <div
        className="today-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="today-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

/* ── target-reached celebration + the day's card pack ─────────────────────── */

function DonePanel({ t }: { t: TFn }) {
  return (
    <section className="today-done ss-panel">
      <div className="today-done__intro">
        <span className="today-done__mark" aria-hidden="true"><CheckGlyph /></span>
        <div>
          <Kicker>{t('today.targetMet')}</Kicker>
          <Heading level={2}>{t('today.done')}</Heading>
        </div>
      </div>
      <div className="today-pack">
        <span className="today-pack__label">
          <SharkFin size={18} />
          {t('today.packReady')}
        </span>
        <Link to="/collection" className="today-pack__cta">{t('today.openPack')}</Link>
      </div>
    </section>
  );
}

/* ── one plan item, deep-linking into its Learn level ─────────────────────── */

function TodayCard({ item, isStartHere, t }: { item: TodayItem; isStartHere: boolean; t: TFn }) {
  const topicLabel = t(item.topicLabelKey);
  const meta = t('today.itemMeta', { topic: topicLabel, level: item.level });
  const color = getCategoryHexColor(item.topic);
  const actionLabel = t(ACTION_LABEL[item.kind]);
  // The whole card is one link; give it a full accessible name so the glyph and
  // decorative action affordance don't need their own.
  const ariaLabel = isStartHere ? t('today.startHereAria', { label: meta }) : `${actionLabel}: ${meta}`;
  return (
    <Link
      to={`/learn?topic=${encodeURIComponent(item.topic)}&level=${item.level}`}
      className="today-card ss-panel ss-lift"
      aria-label={ariaLabel}
      data-start-here={isStartHere || undefined}
    >
      <span className="today-card__glyph" aria-hidden="true">
        <CategoryGlyph category={item.topic} color={color} size={22} />
      </span>
      <span className="today-card__body">
        {isStartHere && <span className="today-card__chip">{t('today.startHere')}</span>}
        <span className="today-card__meta">{meta}</span>
        <span className="today-card__reason">{t(item.reason)}</span>
      </span>
      <span className="today-card__action" aria-hidden="true">
        <span className="today-card__action-label">{actionLabel}</span>
        <ArrowGlyph />
      </span>
    </Link>
  );
}

/* ── nothing queued ───────────────────────────────────────────────────────── */

/** Everything the free plan opens is done and the next level is Premium's:
 * "a new plan is ready tomorrow" would not be true, so say what opens it. */
function PremiumEmptyState({ item, t }: { item: TodayItem; t: TFn }) {
  const content = { kind: 'learn-level', topic: item.topic, level: item.level } as const;
  return (
    <section className="today-empty ss-panel">
      <span className="today-empty__fin" aria-hidden="true"><SharkFin size={30} /></span>
      <Heading level={2}>{t('today.premiumTitle')}</Heading>
      <div style={{ marginTop: 4, marginBottom: 18 }}>
        <Text type="supporting" color="secondary">
          {t('today.premiumBody', { label: t('today.itemMeta', { topic: t(item.topicLabelKey), level: item.level }) })}
        </Text>
      </div>
      <AxButton variant="primary" label={t('rewards.seePremium')} onClick={() => openUpgradeSheet({ kind: content.kind, ref: gatedRef(content) })} />
    </section>
  );
}

function EmptyState({ t }: { t: TFn }) {
  return (
    <section className="today-empty ss-panel">
      <span className="today-empty__fin" aria-hidden="true"><SharkFin size={30} /></span>
      <Heading level={2}>{t('today.emptyTitle')}</Heading>
      <div style={{ marginTop: 4, marginBottom: 18 }}>
        <Text type="supporting" color="secondary">{t('today.emptyBody')}</Text>
      </div>
      <Link to="/learn" className="today-empty__cta">{t('nav.learn')}</Link>
    </section>
  );
}
