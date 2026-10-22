/** Recorded evidence for the FDE hub. Diagnostic scores remain in their own
 * section; reading, self-review and verified passes never become one score. */
import { Link } from 'react-router-dom';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { DELIVERY_PHASES } from '../../../../shared/learning-path-phases';
import type { EvidenceState, LearningPathManifest } from '../../../../shared/learning-paths';
import type { PathProgressResponse } from '../../../../shared/learning-path-api';
import { pathsEn as copy } from '../../i18n/translations.paths';
import { activityHref } from '../../lib/learningPaths';
import ResultShareActions from '../ResultShareActions';
import ErrorRetry from '../ErrorRetry';
import { StateBadge } from './ActivityViews';

const STATES: readonly EvidenceState[] = ['not_started', 'in_progress', 'verified_pass', 'self_reviewed', 'needs_revision'];

export function FdeHub({ manifest, progress, pending, error, retry, reachable }: {
  manifest: LearningPathManifest;
  progress?: PathProgressResponse;
  pending: boolean;
  error: boolean;
  retry: () => void;
  reachable: boolean;
}) {
  const modules = manifest.modules.filter(module => !module.optional && !module.shelf);
  const recorded = new Map(progress?.modules.flatMap(module => module.activities.map(activity => [activity.activityId, activity.state] as const)) ?? []);
  const completed = new Set(progress?.modules.filter(module => module.completed).map(module => module.moduleId));
  const nextModule = progress?.nextActivityId ? modules.find(module => module.activities.some(activity => activity.id === progress.nextActivityId)) : undefined;
  const evidence = manifest.competencies.map(competency => {
    const activities = modules.flatMap(module => module.activities.filter(activity => activity.competencies.includes(competency.id)).map(activity => ({ module, activity })));
    return { competency, activities, counts: Object.fromEntries(STATES.map(state => [state, activities.filter(({ activity }) => (recorded.get(activity.id) ?? 'not_started') === state).length])) as Record<EvidenceState, number> };
  });
  if (pending) return <section className="lp-section" aria-busy="true"><h2>{copy['paths.hub.title']}</h2><p role="status">{copy['paths.hub.loading']}</p></section>;
  if (error) return <section className="lp-section"><h2>{copy['paths.hub.title']}</h2><ErrorRetry message={copy['paths.hub.error']} onRetry={retry} /></section>;
  return <>
    <section className="lp-section" aria-labelledby="fde-loop-title">
      <h2 id="fde-loop-title">{copy['paths.hub.loop']}</h2>
      <ProgressBar label={copy['paths.hub.moduleProgress']} value={modules.length ? completed.size / modules.length * 100 : 0} />
      <ol className="lp-loop">
        {DELIVERY_PHASES.map(phase => {
          const members = modules.filter(module => module.deliveryPhase === phase);
          const current = nextModule?.deliveryPhase === phase;
          return <li key={phase} aria-current={current ? 'step' : undefined}>
            <h3>{copy[`paths.phase.${phase}`]}</h3>
            <span>{copy['paths.hub.moduleCount'].replace('{done}', String(members.filter(module => completed.has(module.id)).length)).replace('{total}', String(members.length))}</span>
            {current && <Badge variant="cyan" label={copy['paths.hub.current']} />}
          </li>;
        })}
      </ol>
      {nextModule && <p className="lp-note">{copy['paths.hub.nextModule']} <strong>{nextModule.title}</strong></p>}
    </section>
    <section className="lp-section" aria-labelledby="fde-evidence-title">
      <h2 id="fde-evidence-title">{copy['paths.hub.title']}</h2>
      <p className="lp-lead">{progress ? copy['paths.hub.note'] : copy['paths.hub.preview']}</p>
      <ul className="lp-evidence">
        {evidence.map(({ competency, activities, counts }) => <li key={competency.id}>
          <h3>{competency.title}</h3>
          <p>{competency.summary}</p>
          <ul className="lp-evidence__states" aria-label={copy['paths.hub.recorded']}>
            {STATES.filter(state => counts[state] > 0 || (state === 'not_started' && activities.length === 0)).map(state => <li key={state}><StateBadge state={state} /><span>{counts[state]}</span></li>)}
          </ul>
          <details>
            <summary>{copy['paths.hub.activities'].replace('{count}', String(activities.length))}</summary>
            <ul className="lp-list">
              {activities.map(({ module, activity }) => <li key={activity.id}>
                {reachable ? <Link to={activityHref('fde', module.id, activity.id)}>{activity.title}</Link> : <span>{activity.title}</span>}
                {' · '}<StateBadge state={recorded.get(activity.id) ?? 'not_started'} />
              </li>)}
            </ul>
          </details>
        </li>)}
      </ul>
    </section>
    {progress?.guidedComplete && <section className="lp-section">
      <h2>{copy['paths.hub.completed']}</h2>
      <ResultShareActions kind="learning_path_result" label="" headline={copy['paths.hub.completed']} detail="" text={copy['paths.hub.completed']} path="/learn/forward-deployed-engineer"
        evidenceLegend={copy['paths.hub.shareLegend']} evidence={evidence.map(({ competency, activities, counts }) => ({ label: competency.title, verified: counts.verified_pass, selfReviewed: counts.self_reviewed, total: activities.length }))} />
    </section>}
  </>;
}
