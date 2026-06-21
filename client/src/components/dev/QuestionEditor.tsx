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
  Tabs,
  Tab,
} from '@mui/material';
import { brandButtonSx } from '../../theme/MuiTheme';
import { getCategoryLabel } from '../../lib/categories';
import { friendlyError } from '../../lib/api';
import { saveQuestion, type AdminQuestion, type QuestionPayload } from '../../lib/devApi';

const MAX_OPTIONS = 8;
const MIN_OPTIONS = 2;
const DIFFICULTIES = [1, 2, 3, 4, 5];
const IMPORTANCE_LEVELS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

interface Props {
  open: boolean;
  /** The question being edited, or null to create a new one. */
  initial: AdminQuestion | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  introduction: string;
  category: string;
  difficulty: number;
  importance: number;
  tags: string;
  csQuestion: string;
  csOptions: string[];
  csIntroduction: string;
  csExplanation: string;
}

const blankForm = (categories: string[]): FormState => ({
  question: '',
  options: ['', ''],
  correctIndex: 0,
  explanation: '',
  introduction: '',
  category: categories[0] ?? 'javascript',
  difficulty: 1,
  importance: 5,
  tags: '',
  csQuestion: '',
  csOptions: ['', ''],
  csIntroduction: '',
  csExplanation: '',
});

const seedForm = (q: AdminQuestion): FormState => {
  const options = q.options.length ? [...q.options] : ['', ''];
  return {
    question: q.question,
    options,
    correctIndex: q.correctAnswer,
    explanation: q.explanation,
    introduction: q.introduction,
    category: q.category,
    difficulty: q.difficulty,
    importance: q.importance,
    tags: q.tags.join(', '),
    csQuestion: q.cs.question,
    // Keep cs options aligned 1:1 with the English options.
    csOptions: options.map((_, i) => q.cs.options[i] ?? ''),
    csIntroduction: q.cs.introduction,
    csExplanation: q.cs.explanation,
  };
};

export default function QuestionEditor({ open, initial, categories, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => blankForm(categories));
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever the dialog opens for a different question.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTab(0);
    setForm(initial ? seedForm(initial) : blankForm(categories));
  }, [open, initial, categories]);

  const setOption = (index: number, value: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }));

  const setCsOption = (index: number, value: string) =>
    setForm((f) => ({ ...f, csOptions: f.csOptions.map((o, i) => (i === index ? value : o)) }));

  // English and Czech option arrays grow/shrink together so they stay parallel.
  const addOption = () =>
    setForm((f) =>
      f.options.length >= MAX_OPTIONS ? f : { ...f, options: [...f.options, ''], csOptions: [...f.csOptions, ''] },
    );

  const removeOption = (index: number) =>
    setForm((f) => {
      if (f.options.length <= MIN_OPTIONS) return f;
      const options = f.options.filter((_, i) => i !== index);
      const csOptions = f.csOptions.filter((_, i) => i !== index);
      let correctIndex = f.correctIndex;
      if (index === f.correctIndex) correctIndex = 0;
      else if (index < f.correctIndex) correctIndex -= 1;
      return { ...f, options, csOptions, correctIndex };
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
      setTab(0);
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
      importance: form.importance,
      cs: {
        question: form.csQuestion.trim(),
        // Server drops these unless they line up with the English options.
        options: form.csOptions.map((o) => o.trim()),
        introduction: form.csIntroduction.trim(),
        explanation: form.csExplanation.trim(),
      },
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

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label="English" />
          <Tab label="Čeština" />
        </Tabs>

        {tab === 0 ? (
          <Box>
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
                sx={{ minWidth: 120 }}
              >
                {DIFFICULTIES.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Importance"
                helperText="How essential for a learner (1–10)"
                value={form.importance}
                onChange={(e) => setForm((f) => ({ ...f, importance: Number(e.target.value) }))}
                sx={{ minWidth: 140 }}
              >
                {IMPORTANCE_LEVELS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
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
          </Box>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Optional Czech translation. Leave a field blank to fall back to English. Category, difficulty, tags and the
              correct-answer choice are shared with the English version.
            </Alert>

            <TextField
              label="Otázka (question)"
              value={form.csQuestion}
              onChange={(e) => setForm((f) => ({ ...f, csQuestion: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Možnosti (options) — same order as English
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              {form.options.map((enOpt, i) => (
                <TextField
                  key={i}
                  value={form.csOptions[i] ?? ''}
                  onChange={(e) => setCsOption(i, e.target.value)}
                  placeholder={enOpt || `Option ${i + 1}`}
                  helperText={`EN: ${enOpt || '—'}`}
                  fullWidth
                  size="small"
                />
              ))}
            </Box>

            <TextField
              label="Úvod (introduction)"
              value={form.csIntroduction}
              onChange={(e) => setForm((f) => ({ ...f, csIntroduction: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Vysvětlení (explanation)"
              value={form.csExplanation}
              onChange={(e) => setForm((f) => ({ ...f, csExplanation: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        )}
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
