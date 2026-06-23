import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Chip,
} from '@mui/material';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { brandButtonSx } from '../../theme/MuiTheme';
import { friendlyError } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { getAdminSettings, saveAdminSettings, type GameSettings } from '../../lib/devApi';

const SETTINGS_KEY = ['admin', 'settings'] as const;
import { RANK_TITLES, setRankThresholds } from '../../lib/leveling';
import { CATEGORY_OPTIONS, onCategoryColorText } from '../../lib/categories';

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
  /** Category ids the quiz home shows by default (rest hidden behind "Show all"). */
  quizDefaultCategoryIds: string[];
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
  /** XP threshold per career rank, kept as raw strings while editing. */
  levelThresholds: string[];
  /** Token price per shop product id, kept as raw strings while editing. */
  shopPrices: Record<string, string>;
  /** Token price to unlock any one learning path. */
  shopPathUnlock: string;
  /** One-liner loading-screen dev tips, one per line while editing. */
  devTips: string;
  ownerEmail: string;
}

// Friendly labels for the configurable shop products (ids match the catalogue).
const SHOP_PRICE_LABELS: Record<string, string> = {
  'double-xp': 'Double-XP booster',
  'ring-emerald': 'Ring · Emerald',
  'ring-gold': 'Ring · Gold',
  'ring-violet': 'Ring · Violet',
  'flair-rocket': 'Flair · Rocket',
  'flair-flame': 'Flair · Flame',
  'flair-crown': 'Flair · Crown',
};

const toForm = (s: GameSettings): FormState => ({
  quizDefaultCount: String(s.quiz.defaultCount),
  quizMaxCount: String(s.quiz.maxCount),
  quizCountOptions: s.quiz.countOptions.join(', '),
  quizDefaultDifficulty: s.quiz.defaultDifficulty,
  quizMinImportance: String(s.quiz.minImportance),
  quizDefaultCategoryIds: [...s.quiz.defaultCategoryIds],
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
  levelThresholds: s.leveling.rankThresholds.map(String),
  shopPrices: Object.fromEntries(Object.entries(s.shop.prices).map(([k, v]) => [k, String(v)])),
  shopPathUnlock: String(s.shop.pathUnlockPrice),
  devTips: s.devTips.join('\n'),
  ownerEmail: s.ownerEmail,
});

// Split the multiline tips editor into a clean list: trim each line, drop blanks.
const parseTips = (s: string): string[] =>
  s
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const toSettings = (f: FormState, base: GameSettings): GameSettings => ({
  quiz: {
    defaultCount: parseNum(f.quizDefaultCount, base.quiz.defaultCount),
    maxCount: parseNum(f.quizMaxCount, base.quiz.maxCount),
    countOptions: parseList(f.quizCountOptions),
    defaultDifficulty: f.quizDefaultDifficulty,
    minImportance: parseNum(f.quizMinImportance, base.quiz.minImportance),
    defaultCategoryIds: f.quizDefaultCategoryIds,
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
  leveling: {
    rankThresholds: f.levelThresholds.map((v, i) => parseNum(v, base.leveling.rankThresholds[i] ?? 0)),
  },
  shop: {
    prices: Object.fromEntries(
      Object.keys(base.shop.prices).map((k) => [k, parseNum(f.shopPrices[k] ?? '', base.shop.prices[k])]),
    ),
    pathUnlockPrice: parseNum(f.shopPathUnlock, base.shop.pathUnlockPrice),
  },
  devTips: parseTips(f.devTips),
  ownerEmail: f.ownerEmail.trim(),
});

export default function DevSettings() {
  const settingsQuery = useQuery({ queryKey: SETTINGS_KEY, queryFn: getAdminSettings });
  const base = settingsQuery.data?.settings ?? null;
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  // Hydrate (and re-hydrate after a save/refetch) the editable form from the
  // server settings. Edits live in `form`; `base` stays the server truth.
  useEffect(() => {
    if (settingsQuery.data) setForm(toForm(settingsQuery.data.settings));
  }, [settingsQuery.data]);

  if (settingsQuery.isPending) return <LoadingScreen label="Loading settings…" />;
  if (settingsQuery.error) {
    return <ErrorRetry message={friendlyError(settingsQuery.error)} onRetry={() => settingsQuery.refetch()} />;
  }
  if (!form || !base) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setThreshold = (i: number, value: string) =>
    setForm((f) => {
      if (!f) return f;
      const next = [...f.levelThresholds];
      next[i] = value;
      return { ...f, levelThresholds: next };
    });

  const setShopPrice = (id: string, value: string) =>
    setForm((f) => (f ? { ...f, shopPrices: { ...f.shopPrices, [id]: value } } : f));

  const toggleDefaultCategory = (id: string) =>
    setForm((f) => {
      if (!f) return f;
      const next = f.quizDefaultCategoryIds.includes(id)
        ? f.quizDefaultCategoryIds.filter((c) => c !== id)
        : [...f.quizDefaultCategoryIds, id];
      return { ...f, quizDefaultCategoryIds: next };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { settings } = await saveAdminSettings(toSettings(form, base));
      // Update the cache (the hydrate effect re-fills the form, reflecting any
      // server-side clamping).
      queryClient.setQueryData(SETTINGS_KEY, { settings });
      // Apply the (validated) thresholds to the live leveling module so ranks
      // update across the app without a reload.
      setRankThresholds(settings.leveling.rankThresholds);
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

      <Section title="Quiz — default visible categories">
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          Shown on the quiz home by default; the rest appear when the learner clicks "Show all".
          Select none to show every category by default.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, width: '100%' }}>
          {CATEGORY_OPTIONS.map((cat) => {
            const selected = form.quizDefaultCategoryIds.includes(cat.value);
            return (
              <Chip
                key={cat.value}
                label={cat.label}
                size="small"
                onClick={() => toggleDefaultCategory(cat.value)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selected ? cat.color : 'background.paper',
                  color: selected ? onCategoryColorText(cat.value) : 'text.secondary',
                  border: '1px solid',
                  borderColor: selected ? cat.color : 'divider',
                  borderLeft: `3px solid ${cat.color}`,
                  fontWeight: selected ? 600 : 500,
                }}
              />
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mt: 0.5 }}>
          {form.quizDefaultCategoryIds.length === 0
            ? 'All categories visible by default'
            : `${form.quizDefaultCategoryIds.length} category(ies) visible by default`}
        </Typography>
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

      <Section title="Career levels — total XP to reach each rank">
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          Must be strictly increasing and start at 0; invalid values revert to the defaults on save.
        </Typography>
        {RANK_TITLES.map((title, i) => (
          <TextField
            key={title}
            type="number"
            size="small"
            label={`${i + 1}. ${title}`}
            value={form.levelThresholds[i] ?? ''}
            onChange={(e) => setThreshold(i, e.target.value)}
            disabled={i === 0}
            helperText={i === 0 ? 'Always 0' : undefined}
            sx={{ width: 190 }}
          />
        ))}
      </Section>

      <Section title="Shop — token prices">
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          Token cost of each shop item. The path-unlock price applies to every learning-path unlock. 0 makes an item free.
        </Typography>
        {Object.keys(base.shop.prices).map((id) => (
          <TextField
            key={id}
            type="number"
            size="small"
            label={SHOP_PRICE_LABELS[id] ?? id}
            value={form.shopPrices[id] ?? ''}
            onChange={(e) => setShopPrice(id, e.target.value)}
            sx={{ width: 190 }}
          />
        ))}
        <TextField
          type="number"
          size="small"
          label="Path unlock (each)"
          value={form.shopPathUnlock}
          onChange={(e) => set('shopPathUnlock', e.target.value)}
          sx={{ width: 190 }}
        />
      </Section>

      <Section title="Loading-screen dev tips">
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          One tip per line. A random tip fades in under the shark after ~2.5s on longer, full-page loads. Keep them short
          one-liners so they're readable at a glance. Leave empty to show no tip.
        </Typography>
        <TextField
          multiline
          minRows={4}
          maxRows={14}
          size="small"
          label="Dev tips (one per line)"
          value={form.devTips}
          onChange={(e) => set('devTips', e.target.value)}
          sx={{ width: '100%' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mt: 0.5 }}>
          {parseTips(form.devTips).length} tip(s)
        </Typography>
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
        <Button variant="outlined" onClick={() => setForm(toForm(base))} disabled={saving}>
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
