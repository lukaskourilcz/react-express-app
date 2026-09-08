// Learning-path readiness in the admin console.
//
// Read-only on purpose. Publishing authority stays with code review: this
// screen reports what the content validator found, the real inventory derived
// from the published manifest, and whether the deployment switch is on. Those
// are three separate facts, and an operator needs to tell them apart —
// "content incomplete" and "switched off" look identical to a learner and are
// fixed in completely different places.
//
// Nothing here can mark an invalid curriculum ready. There is no write.

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@astryxdesign/core/Badge';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { listLearningPathReadiness } from '../../lib/devApi';

export default function DevLearningPaths() {
  const query = useQuery({
    queryKey: ['admin', 'learning-paths'],
    queryFn: listLearningPathReadiness,
  });

  if (query.isPending) return <LoadingScreen label="Checking learning-path content…" />;
  if (query.isError) return <ErrorRetry message="Could not load learning-path readiness." onRetry={() => query.refetch()} />;

  const paths = query.data?.paths ?? [];

  return (
    <div className="dev-panel">
      <h2>Learning path readiness</h2>
      <p className="dev-muted">
        The validator runs over the code-reviewed content. A path is open to learners only when its content validates,
        its deployment switch is on and the storage migration is installed — all three, checked on the server.
      </p>

      {paths.map((path) => {
        const errors = path.issues.filter((issue) => issue.level === 'error');
        const warnings = path.issues.filter((issue) => issue.level === 'warning');
        return (
          <section key={path.pathId} className="dev-card" style={{ marginTop: 20 }}>
            <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>
                {path.pathId} <span className="dev-muted">v{path.version}</span>
              </h3>
              <Badge
                variant={path.contentReady ? 'green' : 'red'}
                label={path.contentReady ? 'Content validates' : 'Content incomplete'}
              />
              <Badge
                variant={path.enabledInEnv ? 'green' : 'neutral'}
                label={path.enabledInEnv ? 'Enabled on this deployment' : 'Switched off'}
              />
            </header>

            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
                margin: '14px 0 0',
              }}
            >
              <div>
                <dt className="dev-muted">Modules</dt>
                <dd style={{ margin: 0 }}>{path.inventory.modules}</dd>
              </div>
              <div>
                <dt className="dev-muted">Lessons</dt>
                <dd style={{ margin: 0 }}>{path.inventory.lessons}</dd>
              </div>
              <div>
                <dt className="dev-muted">Module checks</dt>
                <dd style={{ margin: 0 }}>{path.inventory.moduleChecks}</dd>
              </div>
              <div>
                <dt className="dev-muted">Final checks</dt>
                <dd style={{ margin: 0 }}>{path.inventory.finalChecks}</dd>
              </div>
              <div>
                <dt className="dev-muted">Coding exercises</dt>
                <dd style={{ margin: 0 }}>{path.inventory.codeExercises}</dd>
              </div>
              <div>
                <dt className="dev-muted">Written artifacts</dt>
                <dd style={{ margin: 0 }}>{path.inventory.artifacts}</dd>
              </div>
              <div>
                <dt className="dev-muted">Diagnostic items</dt>
                <dd style={{ margin: 0 }}>
                  {path.inventory.diagnosticChecks} + {path.inventory.diagnosticCodeExercises} code
                </dd>
              </div>
            </dl>

            {path.issues.length === 0 ? (
              <p style={{ marginTop: 14 }}>The validator found nothing to fix.</p>
            ) : (
              <>
                <p style={{ marginTop: 14 }}>
                  {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning
                  {warnings.length === 1 ? '' : 's'}.
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.6 }}>
                  {path.issues.slice(0, 60).map((issue, index) => (
                    <li key={index}>
                      <strong>{issue.level === 'error' ? '✗' : '!'}</strong> <code>{issue.at}</code> — {issue.message}{' '}
                      <span className="dev-muted">({issue.code})</span>
                    </li>
                  ))}
                </ul>
                {path.issues.length > 60 && (
                  <p className="dev-muted">…and {path.issues.length - 60} more. Run `npm run test:paths` for the full list.</p>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
