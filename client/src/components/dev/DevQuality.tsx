import { useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { AppToast } from '../ui/AppToast';
import { friendlyError } from '../../lib/api';
import { scanQuestionQuality, type QuestionQualityIssue } from '../../lib/devApi';
import { useActiveSubject } from '../../lib/subjects';

const label = (kind: QuestionQualityIssue['kind']) => kind.replace(/_/g, ' ');

export default function DevQuality() {
  const subject = useActiveSubject();
  const query = useQuery({
    queryKey: ['admin', 'quality', subject.id],
    queryFn: () => scanQuestionQuality(subject.categories),
  });
  const [filter, setFilter] = useState<'all' | QuestionQualityIssue['severity']>('all');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const issues = useMemo(
    () => (query.data?.issues ?? []).filter((issue) => filter === 'all' || issue.severity === filter),
    [query.data, filter],
  );

  const persist = async () => {
    setBusy(true);
    try {
      const result = await scanQuestionQuality(subject.categories, true);
      setToast(`Stored ${result.stored ?? 0} review suggestions. Live questions were not changed.`);
    } catch (error) {
      setToast(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  if (query.isPending) return <LoadingScreen label="Checking question quality…" />;
  if (query.error) return <ErrorRetry message={friendlyError(query.error)} onRetry={() => void query.refetch()} />;

  return (
    <div className="dev-quality">
      <div className="dev-quality-summary">
        <div>
          <h2>Deterministic quality and EN/CS parity</h2>
          <p>Flags content for human review. It never edits accepted answers or publishes generated content.</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          label={query.data?.enabled ? 'Store review suggestions' : 'Suggestion storage disabled'}
          isDisabled={!query.data?.enabled || busy}
          onClick={() => void persist()}
        />
      </div>

      <div className="dev-quality-filters" role="group" aria-label="Issue severity">
        <Badge variant="neutral" label={`${query.data?.scanned ?? 0} questions checked`} />
        <Badge variant="neutral" label={`${query.data?.issues.length ?? 0} issues`} />
        {(['all', 'high', 'medium', 'low'] as const).map((value) => (
          <button key={value} type="button" data-active={filter === value} onClick={() => setFilter(value)}>{value}</button>
        ))}
      </div>

      <div className="dev-quality-list">
        {issues.map((issue) => (
          <article key={`${issue.questionId}:${issue.kind}`} className="dev-quality-item">
            <div className="dev-quality-item-head">
              <code>{issue.questionId}</code>
              <Badge variant={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'neutral'} label={issue.severity} />
              <span>{label(issue.kind)}</span>
            </div>
            <p>{issue.message}</p>
            <small>{issue.suggestion}</small>
          </article>
        ))}
        {issues.length === 0 && <p className="dev-quality-empty">No issues match this severity.</p>}
      </div>

      <AppToast open={!!toast} onClose={() => setToast(null)} message={toast ?? ''} autoHideDuration={4000} />
    </div>
  );
}
