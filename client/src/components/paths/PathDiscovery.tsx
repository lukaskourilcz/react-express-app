// Learning-path discovery on the devShark roadmap.
//
// Two entries, described honestly and side by side:
//
//   * the Forward Deployed Engineer specialization, which sits ON TOP of the
//     track the learner already chose; and
//   * DSA Foundations, which sits BESIDE it — entered directly, with no base
//     track, no role and no XP rank required.
//
// The distinction is the point, so the copy states it rather than leaving the
// learner to infer it from the layout. Counts come from the published
// manifest, so nothing can advertise content that has not been written.

import { Link } from 'react-router-dom';
import { useT } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { entryFor, isOpen, pathHref, useEnrollments, usePathCatalog } from '../../lib/learningPaths';
import { useLoc } from './ActivityViews';
import type { LearningPathId } from '../../../../shared/learning-paths';
import './LearningPaths.css';

const PATH_ORDER: LearningPathId[] = ['fde', 'dsa-foundations'];

export default function PathDiscovery() {
  const t = useT();
  const loc = useLoc();
  const { user, isAuthenticated } = useAuth();
  const catalog = usePathCatalog();
  const enrollments = useEnrollments(isAuthenticated ? user?.id : undefined);

  // Nothing to advertise while the catalogue loads or if it fails: the roadmap
  // below is the page's real content, and a spinner here would only be noise.
  if (!catalog.data) return null;

  return (
    <section className="lp-section" aria-label={t('paths.outline')}>
      <div className="lp-modules">
        {PATH_ORDER.map((pathId) => {
          const entry = entryFor(catalog.data, pathId);
          if (!entry) return null;
          const { manifest, inventory, availability } = entry;
          const enrollment = enrollments.data?.enrollments.find((one) => one.pathId === pathId);
          const open = isOpen(availability);
          return (
            <section key={pathId} className="lp-module">
              <div className="lp-module__head">
                <h3 className="lp-module__title">
                  <span className="lp-module__index">
                    {manifest.kind === 'role_specialization' ? t('paths.kicker.role') : t('paths.kicker.skill')}
                  </span>
                  <Link to={pathHref(pathId)}>{loc(manifest.title)}</Link>
                </h3>
                <span className="lp-module__meta">
                  {enrollment
                    ? enrollment.status === 'paused'
                      ? t('paths.action.resume')
                      : t('paths.action.continue')
                    : open
                      ? t('paths.action.start')
                      : t(`paths.availability.${availability}` as never)}
                </span>
              </div>
              <p className="lp-lead" style={{ margin: 0 }}>
                {loc(manifest.summary)}
              </p>
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
                <li>
                  {t('paths.inventory.hours', {
                    min: manifest.estimatedHours.min,
                    max: manifest.estimatedHours.max,
                  })}
                </li>
              </ul>
              <p className="lp-activity__summary">{loc(manifest.entryRequirement)}</p>
            </section>
          );
        })}
      </div>
    </section>
  );
}
