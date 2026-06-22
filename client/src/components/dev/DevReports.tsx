import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { friendlyError } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { listReports, dismissReport, type AdminReport } from '../../lib/devApi';

const REPORTS_KEY = ['admin', 'reports'] as const;

// Friendly label + chip color per report reason. 'needs-review' is the learner
// red-flag from the learning path; the rest come from the full report dialog.
const REASON_META: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  'needs-review': { label: '🚩 Flagged', color: 'error' },
  'incorrect-answer': { label: 'Wrong answer', color: 'error' },
  unclear: { label: 'Unclear', color: 'warning' },
  typo: { label: 'Typo', color: 'info' },
  outdated: { label: 'Outdated', color: 'warning' },
  duplicate: { label: 'Duplicate', color: 'default' },
  other: { label: 'Other', color: 'default' },
};

const reasonMeta = (reason: string) => REASON_META[reason] ?? { label: reason, color: 'default' as const };

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
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
          aria-label="Report filter"
        >
          <ToggleButton value="all">All reports</ToggleButton>
          <ToggleButton value="flags">🚩 Red flags only</ToggleButton>
        </ToggleButtonGroup>
        <Chip label={`${reports.length} total`} size="small" />
        <Chip label={`${flagCount} flagged for review`} size="small" color="error" variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={reload}>
          Refresh
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Learners flag questions that look wrong or misleading. Find the question in the Questions tab
        (search its id) to fix or hide it, then dismiss the report here.
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reason</TableCell>
              <TableCell sx={{ minWidth: 240 }}>Question</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>When</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((r) => {
              const meta = reasonMeta(r.reason);
              return (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Chip label={meta.label} size="small" color={meta.color} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 380 }}>
                    {r.questionSummary ? (
                      <Typography variant="body2" sx={{ fontWeight: 500 }} title={r.questionSummary}>
                        {r.questionSummary}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        (question no longer in the bank)
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {r.questionId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" color="text.secondary">
                      {r.detail || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {formatWhen(r.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => handleDismiss(r)} disabled={busy === r.id}>
                      Dismiss
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    {filter === 'flags' ? 'No red flags 🎉' : 'No reports yet.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
