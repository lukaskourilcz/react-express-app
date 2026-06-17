import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Radio,
  MenuItem,
  Alert,
  Tooltip,
} from '@mui/material';
import { brandButtonSx } from '../../theme/MuiTheme';
import { getCategoryLabel } from '../../lib/categories';
import { friendlyError } from '../../lib/api';
import { saveQuestion, type AdminQuestion, type QuestionPayload } from '../../lib/devApi';

const MAX_OPTIONS = 8;
const MIN_OPTIONS = 2;
const DIFFICULTIES = [1, 2, 3, 4, 5];

interface Props {
  open: boolean;
  /** The question being edited, or null to create a new one. */
  initial: AdminQuestion | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

const blankForm = (categories: string[]) => ({
  question: '',
  options: ['', ''],
  correctIndex: 0,
  explanation: '',
  introduction: '',
  category: categories[0] ?? 'javascript',
  difficulty: 1,
  tags: '',
});

export default function QuestionEditor({ open, initial, categories, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => blankForm(categories));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever the dialog opens for a different question.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setForm({
        question: initial.question,
        options: initial.options.length ? [...initial.options] : ['', ''],
        correctIndex: initial.correctAnswer,
        explanation: initial.explanation,
        introduction: initial.introduction,
        category: initial.category,
        difficulty: initial.difficulty,
        tags: initial.tags.join(', '),
      });
    } else {
      setForm(blankForm(categories));
    }
  }, [open, initial, categories]);

  const setOption = (index: number, value: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }));

  const addOption = () =>
    setForm((f) => (f.options.length >= MAX_OPTIONS ? f : { ...f, options: [...f.options, ''] }));

  const removeOption = (index: number) =>
    setForm((f) => {
      if (f.options.length <= MIN_OPTIONS) return f;
      const options = f.options.filter((_, i) => i !== index);
      // Keep the correct answer pointing at the same option (or clamp).
      let correctIndex = f.correctIndex;
      if (index === f.correctIndex) correctIndex = 0;
      else if (index < f.correctIndex) correctIndex -= 1;
      return { ...f, options, correctIndex };
    });

  const validate = (): string | null => {
    if (!form.question.trim()) return 'Question text is required.';
    const filled = form.options.map((o) => o.trim());
    if (filled.some((o) => !o)) return 'All options must have text (remove empty ones).';
    if (filled.length < MIN_OPTIONS) return `At least ${MIN_OPTIONS} options are required.`;
    if (form.correctIndex < 0 || form.correctIndex >= filled.length) return 'Pick the correct answer.';
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    const payload: QuestionPayload = {
      id: initial?.id,
      question: form.question.trim(),
      options: form.options.map((o) => o.trim()),
      correctIndex: form.correctIndex,
      explanation: form.explanation.trim(),
      introduction: form.introduction.trim(),
      category: form.category,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      difficulty: form.difficulty,
    };
    try {
      await saveQuestion(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Edit question' : 'New question'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Question"
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          fullWidth
          multiline
          minRows={2}
          helperText="Markdown code fences (``` ```) are rendered as code blocks."
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Options — select the correct answer
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
          {form.options.map((opt, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Radio
                checked={form.correctIndex === i}
                onChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
                inputProps={{ 'aria-label': `Mark option ${i + 1} correct` }}
              />
              <TextField
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                fullWidth
                size="small"
              />
              <Tooltip title={form.options.length <= MIN_OPTIONS ? `Keep at least ${MIN_OPTIONS}` : 'Remove option'}>
                <span>
                  <IconButton
                    aria-label="Remove option"
                    onClick={() => removeOption(i)}
                    disabled={form.options.length <= MIN_OPTIONS}
                    size="small"
                  >
                    ✕
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Box>
        <Button onClick={addOption} disabled={form.options.length >= MAX_OPTIONS} size="small" sx={{ mb: 2 }}>
          + Add option
        </Button>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            select
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            sx={{ minWidth: 180, flex: 1 }}
          >
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {getCategoryLabel(c)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Difficulty"
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: Number(e.target.value) }))}
            sx={{ minWidth: 140 }}
          >
            {DIFFICULTIES.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <TextField
          label="Tags (comma-separated)"
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          fullWidth
          placeholder="useState, Hooks"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Introduction (shown as a hint)"
          value={form.introduction}
          onChange={(e) => setForm((f) => ({ ...f, introduction: e.target.value }))}
          fullWidth
          multiline
          minRows={2}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Explanation (shown after answering)"
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          fullWidth
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving} sx={brandButtonSx}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
