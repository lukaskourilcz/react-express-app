/** Recorded evidence for the FDE hub. Diagnostic scores remain in their own
 * section; reading, self-review and verified passes never become one score.
 *
 * Two parts, placed apart on the path page (UX audit learn-11): `FdeLoop`
 * (the delivery loop, and the completion card once the server says so) sits
 * above the modules, and `FdeEvidence` (competency evidence, collapsed to one
 * disclosure) sits below them, so the modules start on the second screen
 * instead of the sixth. */
import { Link } from 'react-router-dom';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { DELIVERY_PHASES } from '../../../../shared/learning-path-phases';
import type { EvidenceState, LearningPathManifest } from '../../../../shared/learning-paths';
import type { PathProgressResponse } from '../../../../shared/learning-path-api';
import { pathsEn as copy } from '../../i18n/translations.paths';
import { useT } from '../../i18n/LanguageContext';
import { openUpgradeSheet } from '../../lib/upgradeSheet';
import { activityHref } from '../../lib/learningPaths';
import ResultShareActions from '../ResultShareActions';
import ErrorRetry from '../ErrorRetry';
import { StateBadge } from './ActivityViews';

const STATES: readonly EvidenceState[] = ['not_started', 'in_progress', 'verified_pass', 'self_reviewed', 'needs_revision'];

interface HubProps {
  manifest: LearningPathManifest;
  progress?: PathProgressResponse;
  pending: boolean;
  error: boolean;
}

function hubData(manifest: LearningPathManifest, progress: PathProgressResponse | undefined) {
  const modules = manifest.modules.filter(module => !module.optional && !module.shelf);
  const recorded = new Map(progress?.modules.flatMap(module => module.activities.map(activity => [activity.activityId, activity.state] as const)) ?? []);
  const completed = new Set(progress?.modules.filter(module => module.completed && modules.some(required => required.id === module.moduleId)).map(module => module.moduleId));
  const nextModule = progress?.nextActivityId ? modules.find(module => module.activities.some(activity => activity.id === progress.nextActivityId)) : undefined;
  const evidence = manifest.competencies.map(competency => {
    const activities = modules.flatMap(module => module.activities.filter(activity => activity.competencies.includes(competency.id)).map(activity => ({ module, activity })));
    return { competency, activities, counts: Object.fromEntries(STATES.map(state => [state, activities.filter(({ activity }) => (recorded.get(activity.id) ?? 'not_started') === state).length])) as Record<EvidenceState, number> };
  });
  return { modules, recorded, completed, nextModule, evidence };
}

/** The delivery loop above the modules. It also carries the hub's loading and
 * error states, so a failed read never draws a fresh board below. */
export function FdeLoop({ manifest, progress, pending, error, retry }: HubProps & { retry: () => void }) {
  const { modules, completed, nextModule, evidence } = hubData(manifest, progress);
  if (pending) return <section className="lp-section" aria-busy="true"><h2>{copy['paths.hub.loop']}</h2><p role="status">{copy['paths.hub.loading']}</p></section>;
  if (error) return <section className="lp-section"><h2>{copy['paths.hub.loop']}</h2><ErrorRetry message={copy['paths.hub.error']} onRetry={retry} /></section>;
  return <>
    <section className="lp-section" aria-labelledby="fde-loop-title">
      <h2 id="fde-loop-title">{copy['paths.hub.loop']}</h2>
      <ProgressBar label={copy['paths.hub.moduleProgress']} value={modules.length ? completed.size / modules.length * 100 : 0} />
      <ol className="lp-loop">
        {DELIVERY_PHASES.map(phase => {
          const members = modules.filter(module => module.deliveryPhase === phase);
          const current = nextModule?.deliveryPhase === phase;
          const done = members.filter(module => completed.has(module.id)).length;
          // The bar's label says 'completed' once; each phase shows its count
          // as '0 / 3' on one line, and the full sentence stays for a screen
          // reader (UX audit learn-23).
          return <li key={phase} aria-current={current ? 'step' : undefined}>
            <h3>{copy[`paths.phase.${phase}`]}</h3>
            <span className="lp-loop__count">
              <span aria-hidden="true">{done} / {members.length}</span>
              <span className="ss-sr-only">{copy['paths.hub.moduleCount'].replace('{done}', String(done)).replace('{total}', String(members.length))}</span>
            </span>
            {current && <Badge variant="cyan" label={copy['paths.hub.current']} />}
          </li>;
        })}
      </ol>
      {nextModule && <p className="lp-note">{copy['paths.hub.nextModule']} <strong>{nextModule.title}</strong></p>}
    </section>
    {progress?.guidedComplete && <section className="lp-section">
      <h2>{copy['paths.hub.completed']}</h2>
      <ResultShareActions kind="learning_path_result" label="" headline={copy['paths.hub.completed']} detail="" text={copy['paths.hub.completed']} path="/learn/forward-deployed-engineer"
        evidenceLegend={copy['paths.hub.shareLegend']} evidence={evidence.map(({ competency, activities, counts }) => ({ label: competency.title, verified: counts.verified_pass, selfReviewed: counts.self_reviewed, total: activities.length }))} />
    </section>}
  </>;
}

/** Competency evidence below the modules: one 56px disclosure, closed by
 * default, holding one 56px row per competency that has activities. Each row
 * says its count once ('0 of 24 verified', plus self-reviewed work when there
 * is any) and keeps its activity list behind its own disclosure. */
export function FdeEvidence({ manifest, progress, pending, error, reachable, activityLock = () => false }: HubProps & {
  reachable: boolean;
  activityLock?: (activityId: string, state: EvidenceState) => boolean;
}) {
  const t = useT();
  if (pending || error) return null;
  const { recorded, evidence } = hubData(manifest, progress);
  const areas = evidence.filter(({ activities }) => activities.length > 0);
  if (areas.length === 0) return null;
  return (
    <section className="lp-section" aria-labelledby="fde-evidence-title">
      <details className="lp-disclosure">
        <summary className="lp-disclosure__summary">
          <span className="lp-disclosure__chevron" aria-hidden="true" />
          <h2 id="fde-evidence-title">{copy['paths.hub.title']}</h2>
          <span className="lp-disclosure__meta">{copy['paths.hub.areas'].replace('{count}', String(areas.length))}</span>
        </summary>
        <p className="lp-note">{progress ? copy['paths.hub.note'] : copy['paths.hub.preview']}</p>
        <ul className="lp-evidence">
          {areas.map(({ competency, activities, counts }) => <li key={competency.id}>
            <details>
              <summary className="lp-evidence__row">
                <span className="lp-disclosure__chevron" aria-hidden="true" />
                <h3>{competency.title}</h3>
                <span className="lp-evidence__summary">{competency.summary}</span>
                <span className="lp-evidence__count">
                  {copy['paths.hub.verifiedCount'].replace('{verified}', String(counts.verified_pass)).replace('{total}', String(activities.length))}
                  {counts.self_reviewed > 0 && <> · {copy['paths.hub.selfReviewedCount'].replace('{count}', String(counts.self_reviewed))}</>}
                </span>
              </summary>
              <ul className="lp-list lp-evidence__activities" aria-label={copy['paths.hub.activities'].replace('{count}', String(activities.length))}>
                {activities.map(({ module, activity }) => {
                  const state = recorded.get(activity.id) ?? 'not_started';
                  const locked = activityLock(activity.id, state);
                  return <li key={activity.id}>
                    {reachable ? <Link to={activityHref('fde', module.id, activity.id)} onClick={event => {
                      if (!locked) return;
                      event.preventDefault();
                      openUpgradeSheet({ kind: 'learning-path-activity', ref: `fde:${activity.id}` });
                    }}>{activity.title}</Link> : <span>{activity.title}</span>}
                    {locked && <> <span className="ss-premium-label">{t('premium.badge')}</span></>}
                    {/* 'Not started' is every activity's default and goes
                        unsaid, as on the module rows (UX audit learn-11, -12):
                        the row's count above already says none is verified. */}
                    {state !== 'not_started' && <>{' · '}<StateBadge state={state} /></>}
                  </li>;
                })}
              </ul>
            </details>
          </li>)}
        </ul>
      </details>
    </section>
  );
}
