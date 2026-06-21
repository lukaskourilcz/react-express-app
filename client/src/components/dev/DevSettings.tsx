import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Snackbar,
  Divider,
} from '@mui/material';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { useReloadKey, useCancellableEffect } from '../../lib/hooks';
import { brandButtonSx } from '../../theme/MuiTheme';
import { friendlyError } from '../../lib/api';
import { getAdminSettings, saveAdminSettings, type GameSettings } from '../../lib/devApi';

const DIFFICULTY_MODES = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const parseNum = (s: string, fallback: number): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseList = (s: string): number[] =>
  s
    .split(',')
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n));

// The form keeps numeric/list fields as raw strings for smooth typing; they are
// parsed back into a GameSettings object on save (the server re-validates too).
interface FormState {
  quizDefaultCount: string;
  quizMaxCount: string;
  quizCountOptions: string;
  quizDefaultDifficulty: string;
  quizMinImportance: string;
  dailyCount: string;
  playDefaultDurationS: string;
  playDurationOptionsS: string;
  playCountOptions: string;
  playMinQuestions: string;
  playMaxQuestions: string;
  playMaxSpeedBonus: string;
  featDaily: boolean;
  featMulti: boolean;
  featLeader: boolean;
  featFlash: boolean;
  ownerEmail: string;
}

const toForm = (s: GameSettings): FormState => ({
  quizDefaultCount: String(s.quiz.defaultCount),
  quizMaxCount: String(s.quiz.maxCount),
  quizCountOptions: s.quiz.countOptions.join(', '),
  quizDefaultDifficulty: s.quiz.defaultDifficulty,
  quizMinImportance: String(s.quiz.minImportance),
  dailyCount: String(s.daily.count),
  playDefaultDurationS: String(s.play.defaultDurationS),
  playDurationOptionsS: s.play.durationOptionsS.join(', '),
  playCountOptions: s.play.countOptions.join(', '),
  playMinQuestions: String(s.play.minQuestions),
  playMaxQuestions: String(s.play.maxQuestions),
  playMaxSpeedBonus: String(s.play.maxSpeedBonus),
  featDaily: s.features.dailyChallenge,
  featMulti: s.features.multiplayer,
  featLeader: s.features.leaderboard,
  featFlash: s.features.flashcards,
  ownerEmail: s.ownerEmail,
});

const toSettings = (f: FormState, base: GameSettings): GameSettings => ({
  quiz: {
    defaultCount: parseNum(f.quizDefaultCount, base.quiz.defaultCount),
    maxCount: parseNum(f.quizMaxCount, base.quiz.maxCount),
    countOptions: parseList(f.quizCountOptions),
    defaultDifficulty: f.quizDefaultDifficulty,
    minImportance: parseNum(f.quizMinImportance, base.quiz.minImportance),
  },
  daily: { count: parseNum(f.dailyCount, base.daily.count) },
  play: {
    defaultDurationS: parseNum(f.playDefaultDurationS, base.play.defaultDurationS),
    durationOptionsS: parseList(f.playDurationOptionsS),
    countOptions: parseList(f.playCountOptions),
    minQuestions: parseNum(f.playMinQuestions, base.play.minQuestions),
    maxQuestions: parseNum(f.playMaxQuestions, base.play.maxQuestions),
    maxSpeedBonus: parseNum(f.playMaxSpeedBonus, base.play.maxSpeedBonus),
  },
  features: {
    dailyChallenge: f.featDaily,
    multiplayer: f.featMulti,
    leaderboard: f.featLeader,
    flashcards: f.featFlash,
  },
  ownerEmail: f.ownerEmail.trim(),
});

export default function DevSettings() {
  const [base, setBase] = useState<GameSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [reloadKey, reload] = useReloadKey();

  useCancellableEffect(
    async (isCancelled) => {
      setLoading(true);
      setError(null);
      try {
        const { settings } = await getAdminSettings();
        if (isCancelled()) return;
        setBase(settings);
        setForm(toForm(settings));
      } catch (err) {
        if (!isCancelled()) setError(friendlyError(err));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [reloadKey],
  );

  if (loading) return <LoadingScreen label="Loading settings…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;
  if (!form || !base) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { settings } = await saveAdminSettings(toSettings(form, base));
      setBase(settings);
      setForm(toForm(settings)); // reflect server-side clamping
      setSnack('Settings saved');
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof FormState, label: string) => (
    <TextField
      type="number"
      size="small"
      label={label}
      value={form[key] as string}
      onChange={(e) => set(key, e.target.value)}
      sx={{ width: 160 }}
    />
  );

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Values are validated and clamped server-side. Lists are comma-separated. Changes take effect within a few
        seconds.
      </Typography>

      <Section title="Quiz">
        {num('quizDefaultCount', 'Default count')}
        {num('quizMaxCount', 'Max count')}
        <TextField
          select
          size="small"
          label="Default difficulty"
          value={form.quizDefaultDifficulty}
          onChange={(e) => set('quizDefaultDifficulty', e.target.value)}
          sx={{ width: 180 }}
        >
          {DIFFICULTY_MODES.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Min importance"
          helperText="Hide questions below this score from the quiz (1 = no floor)"
          value={form.quizMinImportance}
          onChange={(e) => set('quizMinImportance', e.target.value)}
          sx={{ width: 200 }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <MenuItem key={n} value={String(n)}>
              {n}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Count options"
          value={form.quizCountOptions}
          onChange={(e) => set('quizCountOptions', e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Section>

      <Section title="Daily challenge">{num('dailyCount', 'Question count')}</Section>

      <Section title="Multiplayer / Play">
        {num('playDefaultDurationS', 'Default time (s)')}
        {num('playMinQuestions', 'Min questions')}
        {num('playMaxQuestions', 'Max questions')}
        {num('playMaxSpeedBonus', 'Max speed bonus')}
        <TextField
          size="small"
          label="Time options (s, 0 = none)"
          value={form.playDurationOptionsS}
          onChange={(e) => set('playDurationOptionsS', e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <TextField
          size="small"
          label="Question-count options"
          value={form.playCountOptions}
          onChange={(e) => set('playCountOptions', e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Section>

      <Section title="Features">
        <FormControlLabel
          control={<Switch checked={form.featDaily} onChange={(e) => set('featDaily', e.target.checked)} />}
          label="Daily challenge"
        />
        <FormControlLabel
          control={<Switch checked={form.featMulti} onChange={(e) => set('featMulti', e.target.checked)} />}
          label="Multiplayer / Play"
        />
        <FormControlLabel
          control={<Switch checked={form.featLeader} onChange={(e) => set('featLeader', e.target.checked)} />}
          label="Leaderboard"
        />
        <FormControlLabel
          control={<Switch checked={form.featFlash} onChange={(e) => set('featFlash', e.target.checked)} />}
          label="Flashcards"
        />
      </Section>

      <Section title="Owner">
        <TextField
          size="small"
          label="Owner email (sees private categories)"
          value={form.ownerEmail}
          onChange={(e) => set('ownerEmail', e.target.value)}
          sx={{ flex: 1, minWidth: 260 }}
        />
      </Section>

      <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={brandButtonSx}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
        <Button variant="outlined" onClick={reload} disabled={saving}>
          Revert
        </Button>
      </Box>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1.5 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>{children}</Box>
    </Paper>
  );
}
