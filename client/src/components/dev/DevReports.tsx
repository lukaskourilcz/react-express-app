import { useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import type { BadgeVariant } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '@astryxdesign/core/Table';
import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { AppToast } from '../ui/AppToast';
import { friendlyError } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { listReports, dismissReport, type AdminReport } from '../../lib/devApi';

const REPORTS_KEY = ['admin', 'reports'] as const;

// Friendly label + badge variant per report reason. 'needs-review' is the learner
// red-flag from the learning path; the rest come from the full report dialog.
const REASON_META: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  'needs-review': { label: 'Flagged', color: 'error' },
  'incorrect-answer': { label: 'Wrong answer', color: 'error' },
  unclear: { label: 'Unclear', color: 'warning' },
  typo: { label: 'Typo', color: 'info' },
  outdated: { label: 'Outdated', color: 'warning' },
  duplicate: { label: 'Duplicate', color: 'default' },
  other: { label: 'Other', color: 'default' },
};

const reasonMeta = (reason: string) => REASON_META[reason] ?? { label: reason, color: 'default' as const };

// Map the reason meta colour onto an Astryx Badge variant.
const badgeVariant = (color: 'error' | 'warning' | 'info' | 'default'): BadgeVariant =>
  color === 'default' ? 'neutral' : color;

const formatWhen = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function DevReports() {
  const { data, isPending: loading, error: queryError, refetch } = useQuery({
    queryKey: REPORTS_KEY,
    queryFn: listReports,
  });
  const reports = data?.reports ?? [];
  const error = queryError ? friendlyError(queryError) : null;
  const reload = () => void refetch();
  const [filter, setFilter] = useState<'all' | 'flags'>('all');
  const [snack, setSnack] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const flagCount = useMemo(() => reports.filter((r) => r.reason === 'needs-review').length, [reports]);
  const shown = useMemo(
    () => (filter === 'flags' ? reports.filter((r) => r.reason === 'needs-review') : reports),
    [reports, filter],
  );

  const handleDismiss = async (r: AdminReport) => {
    setBusy(r.id);
    try {
      await dismissReport(r.id);
      queryClient.setQueryData<{ reports: AdminReport[] }>(REPORTS_KEY, (old) =>
        old ? { ...old, reports: old.reports.filter((x) => x.id !== r.id) } : old,
      );
      setSnack('Report dismissed');
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <LoadingScreen label="Loading reports…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <SegmentedControl value={filter} onChange={(v) => setFilter(v as 'all' | 'flags')} label="Report filter">
          <SegmentedControlItem value="all" label="All reports" />
          <SegmentedControlItem value="flags" label="Flagged only" />
        </SegmentedControl>
        <Badge variant="neutral" label={`${reports.length} total`} />
        <Badge variant="error" label={`${flagCount} flagged for review`} />
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" label="Refresh" onClick={reload} />
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Learners flag questions that look wrong or misleading. Find the question in the Questions tab
        (search its id) to fix or hide it, then dismiss the report here.
      </p>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflowX: 'auto' }}>
        <Table density="compact" dividers="rows" hasHover>
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell style={{ minWidth: 240 }}>Question</TableHeaderCell>
              <TableHeaderCell>Note</TableHeaderCell>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell style={{ textAlign: 'right' }}>Action</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => {
              const meta = reasonMeta(r.reason);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant={badgeVariant(meta.color)} label={meta.label} />
                  </TableCell>
                  <TableCell style={{ maxWidth: 380 }}>
                    {r.questionSummary ? (
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }} title={r.questionSummary}>
                        {r.questionSummary}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                        (question no longer in the bank)
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {r.questionId}
                    </div>
                  </TableCell>
                  <TableCell style={{ maxWidth: 280 }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      {r.detail || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatWhen(r.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="ghost" label="Dismiss" onClick={() => handleDismiss(r)} isDisabled={busy === r.id} />
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>
                    {filter === 'flags' ? 'No flagged reports.' : 'No reports yet.'}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AppToast
        open={!!snack}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        severity="info"
        autoHideDuration={2500}
      />
    </div>
  );
}
