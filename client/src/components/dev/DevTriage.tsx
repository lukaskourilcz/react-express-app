// /dev → Triage tab. Reviews the pre-computed question-bank triage (see
// triage/README.md): every scored question with its gate verdict + 1-5 axis
// scores, defaulting to the "cut" candidates so the owner can eyeball each one
// and click Remove (soft-delete via the same admin endpoint as the Questions
// tab). The verdicts are a static overlay (triage-verdicts.json); the live
// question text and current deleted state come from the admin API.

import { useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, Chip, Snackbar, MenuItem, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { getCategoryLabel } from '../../lib/categories';
import { friendlyError } from '../../lib/api';
import { listQuestions, setQuestionDeleted, type AdminQuestion } from '../../lib/devApi';
import { loadTriageVerdicts, GATE_LABEL, type TriageVerdict } from '../../lib/triageApi';

interface Row {
  q: AdminQuestion;
  v: TriageVerdict;
}

type DecisionFilter = 'cut' | 'keep' | 'all';
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

// Mean → colour band for the score badge.
function meanColor(mean: number): string {
  if (mean < 2.5) return '#c62828';
  if (mean < 3.0) return '#ef6c00';
  if (mean < 3.5) return '#f9a825';
  if (mean < 4.0) return '#558b2f';
  return '#1b5e20';
}

const reasonLabel = (r: string): string =>
  GATE_LABEL[r] ?? (r === 'duplicate' ? 'Duplicate' : r.startsWith('relevance') ? 'Low relevance' : r.startsWith('mean') ? 'Low mean' : r);

export default function DevTriage() {
  const questionsQuery = useQuery({ queryKey: ['admin', 'questions'], queryFn: listQuestions });
  const triageQuery = useQuery({ queryKey: ['triage', 'verdicts'], queryFn: () => loadTriageVerdicts() });

  const [decision, setDecision] = useState<DecisionFilter>('cut');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [gateFilter, setGateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [snack, setSnack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Ids removed this session — filtered out immediately so the row vanishes on
  // click (the server soft-delete also makes them gone on any later reload).
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const loading = questionsQuery.isPending || triageQuery.isPending;
  const error = questionsQuery.error
    ? friendlyError(questionsQuery.error)
    : triageQuery.error
      ? friendlyError(triageQuery.error)
      : null;
  const reload = () => void questionsQuery.refetch();

  // Join the live questions with their triage verdict (by id). Custom questions
  // added after scoring simply have no verdict and are skipped.
  const rows: Row[] = useMemo(() => {
    const verdicts = triageQuery.data?.verdicts ?? {};
    const out: Row[] = [];
    for (const q of questionsQuery.data?.questions ?? []) {
      const v = verdicts[q.id];
      if (v) out.push({ q, v });
    }
    return out;
  }, [questionsQuery.data, triageQuery.data]);

  const categories = questionsQuery.data?.categories ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter(({ q, v }) => {
        // Gone the moment it's removed (and on reload, via q.deleted).
        if (q.deleted || removed.has(q.id)) return false;
        if (decision !== 'all' && v.dec !== decision) return false;
        if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
        if (gateFilter !== 'all') {
          if (gateFilter === 'duplicate' ? !v.dup : !v.greasons.includes(gateFilter)) return false;
        }
        if (term) {
          const hit = q.question.toLowerCase().includes(term) || q.id.toLowerCase().includes(term);
          if (!hit) return false;
        }
        return true;
      })
      // worst first
      .sort((a, b) => a.v.mean - b.v.mean);
  }, [rows, decision, categoryFilter, gateFilter, search, removed]);

  const stats = useMemo(() => {
    let keep = 0, cut = 0, gone = 0;
    for (const { q, v } of rows) {
      if (v.dec === 'keep') keep++; else cut++;
      if (q.deleted || removed.has(q.id)) gone++;
    }
    return { total: rows.length, keep, cut, gone };
  }, [rows, removed]);

  const pageStart = Math.min(page * rowsPerPage, Math.max(0, (Math.ceil(filtered.length / rowsPerPage) - 1) * rowsPerPage));
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  // One click = gone. The row is filtered out instantly (optimistic) and the
  // question is deleted on the server so it's gone everywhere on reload too.
  // No confirm, no restore. On a server error the row is put back.
  const remove = (r: Row) => {
    setRemoved((prev) => new Set(prev).add(r.q.id));
    setQuestionDeleted(r.q.id, true)
      .then(() => setSnack(`Deleted ${r.q.id}`))
      .catch((err) => {
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(r.q.id);
          return next;
        });
        setSnack(friendlyError(err));
      });
  };

  // Bulk-delete every row matching the current filters (kept behind a confirm
  // since it can be hundreds at once). Each is gone permanently.
  const removeAllShown = async () => {
    if (filtered.length === 0) return;
    if (!window.confirm(`Delete all ${filtered.length} shown question(s) from the bank for good? This cannot be undone.`)) return;
    setBusy(true);
    const ids = filtered.map((r) => r.q.id);
    setRemoved((prev) => { const next = new Set(prev); ids.forEach((id) => next.add(id)); return next; });
    let n = 0;
    try {
      for (const id of ids) {
        await setQuestionDeleted(id, true);
        n++;
      }
      setSnack(`Deleted ${n} question${n === 1 ? '' : 's'}`);
    } catch (err) {
      setSnack(`${friendlyError(err)} (deleted ${n} before stopping)`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Loading triage…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Pre-computed triage of the question bank — gates (binary cut) kept separate from the 1–5 scores
        (R relevance · D discrimination · F difficulty-fit · C clarity). Default rule:{' '}
        <code>{triageQuery.data?.meta.keepRule}</code>. Delete removes a question from the bank for good — one click, no undo.
      </Typography>

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`${stats.total} scored`} size="small" />
        <Chip label={`${stats.keep} keep`} size="small" color="success" variant="outlined" />
        <Chip label={`${stats.cut} cut`} size="small" color="error" variant="outlined" />
        <Chip label={`${stats.gone} deleted`} size="small" color="error" />
        <Chip label={`${filtered.length} shown`} size="small" variant="outlined" />
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search question or id…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <TextField select size="small" label="Decision" value={decision}
          onChange={(e) => { setDecision(e.target.value as DecisionFilter); setPage(0); }} sx={{ minWidth: 130 }}>
          <MenuItem value="cut">Cut candidates</MenuItem>
          <MenuItem value="keep">Keep</MenuItem>
          <MenuItem value="all">All</MenuItem>
        </TextField>
        <TextField select size="small" label="Reason" value={gateFilter}
          onChange={(e) => { setGateFilter(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
          <MenuItem value="all">All reasons</MenuItem>
          <MenuItem value="trivial_recall">Trivial recall</MenuItem>
          <MenuItem value="ambiguous">Ambiguous</MenuItem>
          <MenuItem value="wrong_or_outdated">Wrong / outdated</MenuItem>
          <MenuItem value="duplicate">Duplicate</MenuItem>
        </TextField>
        <TextField select size="small" label="Category" value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
          <MenuItem value="all">All categories</MenuItem>
          {categories.map((c) => <MenuItem key={c} value={c}>{getCategoryLabel(c)}</MenuItem>)}
        </TextField>
      </Box>

      {/* Bulk action */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Bulk:</Typography>
        <Button size="small" color="error" variant="outlined" disabled={busy || filtered.length === 0} onClick={removeAllShown}>
          Delete all {filtered.length} shown
        </Button>
        <Typography variant="caption" color="text.secondary">
          Applies to the current filter. Permanent — confirmed once.
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '52%' }}>Question &amp; answers</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="center">Scores</TableCell>
              <TableCell>Verdict</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map(({ q, v }) => (
              <TableRow key={q.id} hover sx={{ verticalAlign: 'top' }}>
                <TableCell sx={{ py: 1.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {q.question}
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.1 }}>
                    {q.options.map((opt, i) => (
                      <Typography key={i} variant="caption" sx={{
                        color: i === q.correctAnswer ? 'success.dark' : 'text.secondary',
                        fontWeight: i === q.correctAnswer ? 700 : 400,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {i === q.correctAnswer ? '✓' : '○'} {opt}
                      </Typography>
                    ))}
                  </Box>
                  {v.note && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                      “{v.note}”
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>{q.id} · diff {v.diff}</Typography>
                </TableCell>

                <TableCell><Typography variant="caption">{getCategoryLabel(q.category)}</Typography></TableCell>

                <TableCell align="center">
                  <Tooltip title="Mean of the 4 axes">
                    <Box component="span" sx={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 34, height: 24, px: 0.5, borderRadius: 1, fontWeight: 700, fontSize: '0.8rem',
                      color: '#fff', backgroundColor: meanColor(v.mean),
                    }}>
                      {v.mean.toFixed(2)}
                    </Box>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontFamily: 'monospace' }}>
                    R{v.rel} D{v.disc} F{v.fit} C{v.clar}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, alignItems: 'flex-start' }}>
                    <Chip
                      label={v.dec === 'cut' ? 'CUT' : 'KEEP'}
                      size="small"
                      color={v.dec === 'cut' ? 'error' : 'success'}
                      variant={v.dec === 'cut' ? 'filled' : 'outlined'}
                      sx={{ height: 20, fontWeight: 800 }}
                    />
                    {v.reasons.map((r) => (
                      <Chip key={r} label={reasonLabel(r)} size="small" variant="outlined"
                        color={v.greasons.includes(r) ? 'error' : 'default'}
                        sx={{ height: 18, fontSize: '0.65rem' }} />
                    ))}
                  </Box>
                </TableCell>

                <TableCell align="right">
                  <Button size="small" color="error" variant="contained" disabled={busy} onClick={() => remove({ q, v })} sx={{ minWidth: 'auto' }}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No questions match these filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filtered.length}
        page={pageStart / rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />

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
