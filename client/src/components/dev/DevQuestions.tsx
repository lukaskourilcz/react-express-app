import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  Chip,
  Snackbar,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Tooltip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { getCategoryLabel } from '../../lib/categories';
import { brandButtonSx } from '../../theme/MuiTheme';
import { friendlyError } from '../../lib/api';
import { importanceBand, IMPORTANCE_BAND_LABEL, type ImportanceBand } from '../../lib/importance';
import {
  listQuestions,
  setQuestionDeleted,
  resetQuestion,
  bulkHideByImportance,
  type AdminQuestion,
} from '../../lib/devApi';
import QuestionEditor from './QuestionEditor';

// First line of a question, with any code block stripped, for the list summary.
const summarize = (text: string): string => {
  const beforeCode = text.split('```')[0].replace(/\s+/g, ' ').trim();
  return beforeCode || text.replace(/\s+/g, ' ').trim();
};

const SOURCE_COLOR: Record<AdminQuestion['source'], 'default' | 'warning' | 'success'> = {
  base: 'default',
  edited: 'warning',
  custom: 'success',
};

// Color for the importance score chip, by band.
const SCORE_COLOR: Record<ImportanceBand, string> = {
  filler: '#c62828',
  low: '#ef6c00',
  medium: '#f9a825',
  high: '#2e7d32',
  essential: '#1b5e20',
};

type SortKey = 'importance' | 'difficulty' | 'category' | 'question';
type SortDir = 'asc' | 'desc';
// 'all' | exact score | 'filler' (the ≤3 band the owner cares about most).
type ImportanceFilter = 'all' | 'filler' | number;

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export default function DevQuestions() {
  const { data, isPending: loading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'questions'],
    queryFn: listQuestions,
  });
  const questions = data?.questions ?? [];
  const categories = data?.categories ?? [];
  const reportCounts = data?.reportCounts ?? {};
  const error = queryError ? friendlyError(queryError) : null;
  const reload = () => void refetch();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('importance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [bulkThreshold, setBulkThreshold] = useState(3);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    let edited = 0;
    let custom = 0;
    let deleted = 0;
    let filler = 0;
    for (const q of questions) {
      if (q.deleted) deleted += 1;
      if (q.source === 'edited') edited += 1;
      if (q.source === 'custom') custom += 1;
      if (q.importance <= 3) filler += 1;
    }
    return { total: questions.length, edited, custom, deleted, filler };
  }, [questions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      // Deleted questions are gone for good — never list them.
      if (q.deleted) return false;
      if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
      if (importanceFilter === 'filler' && q.importance > 3) return false;
      if (typeof importanceFilter === 'number' && q.importance !== importanceFilter) return false;
      if (term) {
        const hit =
          q.question.toLowerCase().includes(term) ||
          q.id.toLowerCase().includes(term) ||
          q.tags.some((t) => t.toLowerCase().includes(term));
        if (!hit) return false;
      }
      return true;
    });
  }, [questions, search, categoryFilter, importanceFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (a: AdminQuestion, b: AdminQuestion): number => {
      switch (sortBy) {
        case 'importance':
          return (a.importance - b.importance) || (a.difficulty - b.difficulty);
        case 'difficulty':
          return (a.difficulty - b.difficulty) || (a.importance - b.importance);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'question':
          return summarize(a.question).localeCompare(summarize(b.question));
      }
    };
    return [...filtered].sort((a, b) => cmp(a, b) * dir);
  }, [filtered, sortBy, sortDir]);

  // Keep the current page in range as filters change.
  const pageStart = Math.min(page * rowsPerPage, Math.max(0, (Math.ceil(sorted.length / rowsPerPage) - 1) * rowsPerPage));
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      // Scores default to high→low; text columns to A→Z.
      setSortDir(key === 'importance' || key === 'difficulty' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (q: AdminQuestion) => {
    setEditing(q);
    setEditorOpen(true);
  };

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      setSnack(label);
      reload();
    } catch (err) {
      setSnack(friendlyError(err));
    }
  };

  const handleDelete = (q: AdminQuestion) => {
    if (window.confirm('Delete this question permanently? This cannot be undone.')) {
      runAction('Question deleted', () => setQuestionDeleted(q.id, true));
    }
  };
  const handleReset = (q: AdminQuestion) => {
    if (window.confirm('Discard edits and revert to the original question?')) {
      runAction('Reverted to original', () => resetQuestion(q.id));
    }
  };

  // How many currently-visible, non-custom questions the bulk action would hide.
  const bulkHideCount = useMemo(
    () => questions.filter((q) => !q.deleted && q.source !== 'custom' && q.importance <= bulkThreshold).length,
    [questions, bulkThreshold],
  );
  const handleBulkHide = async () => {
    if (bulkHideCount === 0) {
      setSnack(`No visible questions score ≤ ${bulkThreshold}`);
      return;
    }
    if (
      !window.confirm(
        `Delete all ${bulkHideCount} questions scoring ≤ ${bulkThreshold} permanently? This cannot be undone. The learning paths re-level automatically.`,
      )
    ) {
      return;
    }
    try {
      const r = await bulkHideByImportance(bulkThreshold);
      setSnack(`Deleted ${r.hidden} question${r.hidden === 1 ? '' : 's'}`);
      reload();
    } catch (err) {
      setSnack(friendlyError(err));
    }
  };

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Select-all targets the rows currently visible on this page.
  const pageIds = pageRows.map((q) => q.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const toggleSelectAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  // Mass-delete: hide (or, for custom questions, permanently delete) every
  // selected question. There's no bulk-by-id endpoint, so fan out one call each.
  const handleDeleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} selected question${ids.length === 1 ? '' : 's'} permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      let n = 0;
      for (const id of ids) {
        await setQuestionDeleted(id, true);
        n += 1;
      }
      setSnack(`Removed ${n} question${n === 1 ? '' : 's'}`);
      setSelected(new Set());
      reload();
    } catch (err) {
      setSnack(friendlyError(err));
    }
  };

  if (loading) return <LoadingScreen label="Loading questions…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search question, tag or id…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          label="Category"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {getCategoryLabel(c)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Score"
          value={String(importanceFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setImportanceFilter(v === 'all' || v === 'filler' ? v : Number(v));
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All scores</MenuItem>
          <MenuItem value="filler">Fillers (1–3)</MenuItem>
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
            <MenuItem key={n} value={String(n)}>
              Score = {n}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={openNew} sx={brandButtonSx}>
          + New question
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`${stats.total} total`} size="small" />
        <Chip label={`${stats.edited} edited`} size="small" color="warning" variant="outlined" />
        <Chip label={`${stats.custom} custom`} size="small" color="success" variant="outlined" />
        <Chip label={`${stats.filler} filler (≤3)`} size="small" color="error" variant="outlined" />
        <Chip label={`${filtered.length} shown`} size="small" variant="outlined" />
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
          mb: 2,
          p: 1,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Bulk cleanup:
        </Typography>
        <TextField
          select
          size="small"
          label="Hide score ≤"
          value={bulkThreshold}
          onChange={(e) => setBulkThreshold(Number(e.target.value))}
          sx={{ minWidth: 110 }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </TextField>
        <Button size="small" color="error" variant="outlined" onClick={handleBulkHide}>
          Delete {bulkHideCount} filler{bulkHideCount === 1 ? '' : 's'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Permanently removes them; learning paths re-level automatically.
        </Typography>
      </Box>

      {selected.size > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            flexWrap: 'wrap',
            mb: 2,
            p: 1,
            borderRadius: 1,
            backgroundColor: 'rgba(198,40,40,0.06)',
            border: '1px solid',
            borderColor: 'error.light',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selected.size} selected
          </Typography>
          <Button size="small" color="error" variant="contained" onClick={handleDeleteSelected}>
            Delete selected ({selected.size})
          </Button>
          <Button size="small" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ width: '100%' }}>
        <Table size="small" stickyHeader sx={{ width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allPageSelected}
                  indeterminate={!allPageSelected && somePageSelected}
                  onChange={toggleSelectAllOnPage}
                  inputProps={{ 'aria-label': 'Select all questions on this page' }}
                />
              </TableCell>
              <TableCell sx={{ width: '55%' }}>
                <TableSortLabel active={sortBy === 'question'} direction={sortBy === 'question' ? sortDir : 'asc'} onClick={() => toggleSort('question')}>
                  Question, answers &amp; info
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortBy === 'category'} direction={sortBy === 'category' ? sortDir : 'asc'} onClick={() => toggleSort('category')}>
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel active={sortBy === 'difficulty'} direction={sortBy === 'difficulty' ? sortDir : 'asc'} onClick={() => toggleSort('difficulty')}>
                  Diff
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <Tooltip title="Importance for a learner (1–10) — hand-judged per question, editable in the editor">
                  <TableSortLabel active={sortBy === 'importance'} direction={sortBy === 'importance' ? sortDir : 'desc'} onClick={() => toggleSort('importance')}>
                    Score
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="center">Flags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((q) => (
              <TableRow key={q.id} hover selected={selected.has(q.id)} sx={{ opacity: q.deleted ? 0.5 : 1, verticalAlign: 'top' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selected.has(q.id)}
                    onChange={() => toggleSelected(q.id)}
                    inputProps={{ 'aria-label': `Select question ${q.id}` }}
                  />
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {q.question}
                  </Typography>

                  <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {q.options.map((opt, i) => {
                      const correct = i === q.correctAnswer;
                      return (
                        <Typography
                          key={i}
                          variant="caption"
                          sx={{
                            color: correct ? 'success.dark' : 'text.secondary',
                            fontWeight: correct ? 700 : 400,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {correct ? '✓' : '○'} {opt}
                        </Typography>
                      );
                    })}
                  </Box>

                  {q.introduction && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <strong>Info:</strong> {q.introduction}
                    </Typography>
                  )}
                  {q.explanation && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <strong>Hint / explanation:</strong> {q.explanation}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75, alignItems: 'center' }}>
                    {q.source !== 'base' && (
                      <Chip label={q.source} size="small" color={SOURCE_COLOR[q.source]} variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                    {q.tags.slice(0, 4).map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    ))}
                    <Typography variant="caption" color="text.secondary">
                      {q.id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{getCategoryLabel(q.category)}</Typography>
                </TableCell>
                <TableCell align="center">{q.difficulty}</TableCell>
                <TableCell align="center">
                  <Tooltip title={IMPORTANCE_BAND_LABEL[importanceBand(q.importance)]}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 26,
                        height: 22,
                        px: 0.5,
                        borderRadius: 1,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: '#fff',
                        backgroundColor: SCORE_COLOR[importanceBand(q.importance)],
                      }}
                    >
                      {q.importance}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  {reportCounts[q.id] ? (
                    <Tooltip title={`${reportCounts[q.id]} report(s) — see the Flags tab`}>
                      <Chip label={`🚩 ${reportCounts[q.id]}`} size="small" color="error" variant="outlined" sx={{ height: 20 }} />
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex', gap: 0.25 }}>
                    <Button size="small" onClick={() => openEdit(q)} sx={{ minWidth: 'auto' }}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => handleDelete(q)} sx={{ minWidth: 'auto' }}>
                      Delete
                    </Button>
                    {q.source === 'edited' && (
                      <Button size="small" onClick={() => handleReset(q)} sx={{ minWidth: 'auto' }}>
                        Revert
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
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
        count={sorted.length}
        page={pageStart / rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />

      <QuestionEditor
        open={editorOpen}
        initial={editing}
        categories={categories}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setSnack(editing ? 'Question saved' : 'Question created');
          reload();
        }}
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
