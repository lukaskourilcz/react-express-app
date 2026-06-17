import { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
} from '@mui/material';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { useReloadKey, useCancellableEffect } from '../../lib/hooks';
import { getCategoryLabel } from '../../lib/categories';
import { brandButtonSx } from '../../theme/MuiTheme';
import { friendlyError } from '../../lib/api';
import {
  listQuestions,
  setQuestionDeleted,
  resetQuestion,
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

// Whether a question currently has any Czech text (override or static bank).
const hasCsTranslation = (q: AdminQuestion): boolean =>
  !!(q.cs.question || q.cs.introduction || q.cs.explanation || q.cs.options.some(Boolean));

export default function DevQuestions() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, reload] = useReloadKey();

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  useCancellableEffect(
    async (isCancelled) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listQuestions();
        if (isCancelled()) return;
        setQuestions(data.questions);
        setCategories(data.categories);
      } catch (err) {
        if (!isCancelled()) setError(friendlyError(err));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [reloadKey],
  );

  const stats = useMemo(() => {
    let edited = 0;
    let custom = 0;
    let deleted = 0;
    for (const q of questions) {
      if (q.deleted) deleted += 1;
      if (q.source === 'edited') edited += 1;
      if (q.source === 'custom') custom += 1;
    }
    return { total: questions.length, edited, custom, deleted };
  }, [questions]);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? questions.filter(
          (q) =>
            q.question.toLowerCase().includes(term) ||
            q.id.toLowerCase().includes(term) ||
            q.tags.some((t) => t.toLowerCase().includes(term)),
        )
      : questions;

    const map = new Map<string, AdminQuestion[]>();
    for (const q of filtered) {
      const arr = map.get(q.category);
      if (arr) arr.push(q);
      else map.set(q.category, [q]);
    }
    // Known categories first (in server order), then any others.
    const order = [...categories, ...[...map.keys()].filter((c) => !categories.includes(c))];
    return order.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, [questions, categories, search]);

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
    const msg =
      q.source === 'custom'
        ? 'Delete this custom question permanently?'
        : 'Hide this question from the quiz? You can restore it later.';
    if (window.confirm(msg)) runAction('Question removed', () => setQuestionDeleted(q.id, true));
  };
  const handleRestore = (q: AdminQuestion) => runAction('Question restored', () => setQuestionDeleted(q.id, false));
  const handleReset = (q: AdminQuestion) => {
    if (window.confirm('Discard edits and revert to the original question?')) {
      runAction('Reverted to original', () => resetQuestion(q.id));
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
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <Button variant="contained" onClick={openNew} sx={brandButtonSx}>
          + New question
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`${stats.total} total`} size="small" />
        <Chip label={`${stats.edited} edited`} size="small" color="warning" variant="outlined" />
        <Chip label={`${stats.custom} custom`} size="small" color="success" variant="outlined" />
        <Chip label={`${stats.deleted} hidden`} size="small" variant="outlined" />
      </Box>

      {grouped.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No questions match “{search}”.
        </Typography>
      )}

      {grouped.map(([category, items]) => (
        <Accordion key={category} disableGutters TransitionProps={{ unmountOnExit: true }}>
          <AccordionSummary expandIcon={<span aria-hidden>▾</span>}>
            <Typography sx={{ fontWeight: 600 }}>{getCategoryLabel(category)}</Typography>
            <Chip label={items.length} size="small" sx={{ ml: 1.5 }} />
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {items.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                onEdit={() => openEdit(q)}
                onDelete={() => handleDelete(q)}
                onRestore={() => handleRestore(q)}
                onReset={() => handleReset(q)}
              />
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

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

function QuestionRow({
  q,
  onEdit,
  onDelete,
  onRestore,
  onReset,
}: {
  q: AdminQuestion;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onReset: () => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        opacity: q.deleted ? 0.55 : 1,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {summarize(q.question)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75, alignItems: 'center' }}>
            <Chip label={`D${q.difficulty}`} size="small" variant="outlined" />
            {q.source !== 'base' && (
              <Chip label={q.source} size="small" color={SOURCE_COLOR[q.source]} variant="outlined" />
            )}
            {hasCsTranslation(q) && <Chip label="cs" size="small" variant="outlined" color="info" />}
            {q.deleted && <Chip label="hidden" size="small" />}
            {q.tags.map((t) => (
              <Chip key={t} label={`#${t}`} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
            ))}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              id: {q.id}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Button size="small" onClick={onEdit}>
            Edit
          </Button>
          {q.deleted ? (
            <Button size="small" color="success" onClick={onRestore}>
              Restore
            </Button>
          ) : (
            <Button size="small" color="error" onClick={onDelete}>
              {q.source === 'custom' ? 'Delete' : 'Hide'}
            </Button>
          )}
          {q.source === 'edited' && (
            <Button size="small" onClick={onReset}>
              Revert
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
