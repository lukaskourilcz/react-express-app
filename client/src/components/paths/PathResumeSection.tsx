// Learning paths on Today: one resume item per active enrollment.
//
// One item per path, never a list of everything outstanding — the server
// already computed the single next activity, and Today's whole point is that
// it fits in a sitting. A paused path contributes nothing; its evidence is
// still there, it is just not in the queue.
//
// Deduplication against the Learn plan and the coding review queue is
// structural rather than a filter: a path activity is its own thing with its
// own id, and passing one records path evidence only — no coding progress, no
// XP, no tier unlock — so the same work can never appear twice as two
// different rewards.

import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { isBarred, useLocks } from '../../lib/locks';
import { activityHref, entryFor, isOpen, pathProgressQuery, useEnrollments, usePathCatalog } from '../../lib/learningPaths';
import type { LearningPathId } from '../../../../shared/learning-paths';
import type { PathEnrollment } from '../../../../shared/learning-path-api';

const ArrowGlyph = ({ size = 16 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface ResumeRow {
  enrollment: PathEnrollment;
  pathTitle: string;
  moduleId: string;
  activityId: string;
  activityTitle: string;
}

function PathRow({ row }: { row: ResumeRow }) {
  const { t } = useLanguage();
  return (
    <li className="today-item">
      <Link className="today-item__link" to={activityHref(row.enrollment.pathId as LearningPathId, row.moduleId, row.activityId)}>
        <span className="today-item__body">
          <span className="today-item__title">{row.activityTitle}</span>
          <span className="today-item__reason">
            {row.pathTitle} · {t('today.pathReason')}
          </span>
        </span>
        <span className="today-item__action">
          {t('today.pathResume', { path: row.pathTitle })}
          <ArrowGlyph />
        </span>
      </Link>
    </li>
  );
}

/**
 * Renders nothing while progress loads, when the learner is signed out, when
 * no path is active, or when every active path is finished — so the Learn plan
 * above keeps its shape. A path that is switched off, or that the plan no
 * longer opens, offers no row either: starting its activity would be refused.
 */
export function PathResumeSection() {
  const { t, lang } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const catalog = usePathCatalog();
  const { lockOf } = useLocks();
  const enrollments = useEnrollments(userId);
  const active = (enrollments.data?.enrollments ?? []).filter((one) => one.status === 'active');
  const progress = useQueries({
    queries: active.map((enrollment) => ({
      ...pathProgressQuery(userId, enrollment.enrollmentId, enrollment.curriculumVersion),
      enabled: Boolean(userId),
    })),
  });

  const localized = (text: { en: string; cs: string }) => (lang === 'cs' ? text.cs || text.en : text.en);
  const rows: ResumeRow[] = active.flatMap((enrollment, index) => {
    const entry = entryFor(catalog.data, enrollment.pathId);
    if (!entry || !isOpen(entry.availability)) return [];
    if (isBarred(lockOf({ kind: 'learning-path', pathId: enrollment.pathId }))) return [];
    const next = progress[index]?.data?.nextActivityId;
    if (!next) return [];
    const module = entry.manifest.modules.find((one) => one.activities.some((activity) => activity.id === next));
    const activity = module?.activities.find((one) => one.id === next);
    if (!module || !activity) return [];
    return [{
      enrollment,
      pathTitle: localized(entry.manifest.title),
      moduleId: module.id,
      activityId: next,
      activityTitle: localized(activity.title),
    }];
  });
  if (rows.length === 0) return null;

  // FDE is a role and DSA Foundations a skill path, so the heading names
  // neither.
  return (
    <section className="today-section" aria-label={t('today.pathSection')}>
      <h2 className="today-section__title">{t('today.pathSection')}</h2>
      <ul className="today-list">
        {rows.map((row) => (
          <PathRow key={row.enrollment.enrollmentId} row={row} />
        ))}
      </ul>
    </section>
  );
}
