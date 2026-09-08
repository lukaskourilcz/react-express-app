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
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { activityHref, entryFor, useEnrollments, usePathCatalog, usePathProgress } from '../../lib/learningPaths';
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

function PathRow({ enrollment, userId }: { enrollment: PathEnrollment; userId: string | undefined }) {
  const { t, lang } = useLanguage();
  const catalog = usePathCatalog();
  const progress = usePathProgress(userId, enrollment.enrollmentId, enrollment.curriculumVersion);
  const entry = entryFor(catalog.data, enrollment.pathId);
  const next = progress.data?.nextActivityId;
  if (!entry || !next) return null;

  const module = entry.manifest.modules.find((one) => one.activities.some((activity) => activity.id === next));
  const activity = module?.activities.find((one) => one.id === next);
  if (!module || !activity) return null;

  const pathTitle = lang === 'cs' ? entry.manifest.title.cs || entry.manifest.title.en : entry.manifest.title.en;
  const activityTitle = lang === 'cs' ? activity.title.cs || activity.title.en : activity.title.en;

  return (
    <li className="today-item">
      <Link className="today-item__link" to={activityHref(enrollment.pathId as LearningPathId, module.id, next)}>
        <span className="today-item__body">
          <span className="today-item__title">{activityTitle}</span>
          <span className="today-item__reason">
            {pathTitle} · {t('today.pathReason')}
          </span>
        </span>
        <span className="today-item__action">
          {t('today.pathResume', { path: pathTitle })}
          <ArrowGlyph />
        </span>
      </Link>
    </li>
  );
}

/**
 * Renders nothing while progress loads, when the learner is signed out, when
 * no path is active, or when every active path is finished — so the Learn plan
 * above keeps its shape.
 */
export function PathResumeSection() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const enrollments = useEnrollments(isAuthenticated ? user?.id : undefined);
  const active = (enrollments.data?.enrollments ?? []).filter((one) => one.status === 'active');
  if (active.length === 0) return null;

  return (
    <section className="today-section" aria-label={t('paths.outline')}>
      <h2 className="today-section__title">{t('paths.kicker.skill')}</h2>
      <ul className="today-list">
        {active.map((enrollment) => (
          <PathRow key={enrollment.enrollmentId} enrollment={enrollment} userId={user?.id} />
        ))}
      </ul>
    </section>
  );
}
