import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Skeleton,
  Alert,
  Chip,
} from '@mui/material';
import {
  fetchLeaderboard,
  type LeaderboardGlobalEntry,
  type LeaderboardDailyEntry,
  type CategoryLeaderboardEntry,
} from '../lib/play';
import { friendlyError } from '../lib/api';
import { BRAND } from '../theme/MuiTheme';

type Tab = 'global' | 'daily' | 'category';

const today = () => new Date().toISOString().slice(0, 10);

const CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6' },
  { value: 'react', label: 'React', color: '#61dafb' },
  { value: 'html', label: 'HTML', color: '#e34c26' },
  { value: 'css', label: 'CSS', color: '#264de4' },
  { value: 'nodejs', label: 'Node.js', color: '#339933' },
  { value: 'git', label: 'Git', color: '#f05032' },
  { value: 'dev-world', label: 'Dev World', color: '#8b5cf6' },
  { value: 'code-snippets', label: 'Code Snippets', color: '#ec4899' },
];

type Entry = LeaderboardGlobalEntry | LeaderboardDailyEntry | CategoryLeaderboardEntry;

function Leaderboard() {
  const [tab, setTab] = useState<Tab>('global');
  const [category, setCategory] = useState<string>('javascript');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date] = useState<string>(today());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLeaderboard(tab, { date, category })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries as Entry[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(friendlyError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, date, category]);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
        Leaderboard
      </Typography>

      <ToggleButtonGroup
        value={tab}
        exclusive
        size="small"
        onChange={(_, v) => v && setTab(v)}
        aria-label="Leaderboard period"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="global">All-time</ToggleButton>
        <ToggleButton value="daily">Today</ToggleButton>
        <ToggleButton value="category">By category</ToggleButton>
      </ToggleButtonGroup>

      {tab === 'category' && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              clickable
              onClick={() => setCategory(c.value)}
              role="radio"
              aria-checked={category === c.value}
              sx={{
                borderLeft: `4px solid ${c.color}`,
                fontWeight: category === c.value ? 600 : 500,
                border: category === c.value ? `2px solid ${c.color}` : '1px solid',
                borderColor: category === c.value ? c.color : 'divider',
                backgroundColor: 'background.paper',
                color: category === c.value ? c.color : 'text.secondary',
              }}
            />
          ))}
        </Box>
      )}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        {loading && (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <Skeleton variant="text" width={24} />
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="text" sx={{ flex: 1 }} />
                <Skeleton variant="text" width={64} />
              </Box>
            ))}
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && entries.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              {tab === 'category'
                ? `No ${CATEGORIES.find((c) => c.value === category)?.label} attempts yet.`
                : 'No entries yet — be the first.'}
            </Typography>
          </Box>
        )}

        {!loading &&
          !error &&
          entries.map((entry, i) => (
            <Row key={i} rank={i + 1} entry={entry} tab={tab} />
          ))}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {tab === 'category'
          ? 'Minimum 5 questions in this category to qualify. Updated every 60s.'
          : 'Updated every 60s. Take a quiz to appear here.'}
      </Typography>
    </Box>
  );
}

function Row({ rank, entry, tab }: { rank: number; entry: Entry; tab: Tab }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  let primary = 0;
  let primaryLabel = '';
  let secondary = '';

  if (tab === 'global') {
    const e = entry as LeaderboardGlobalEntry;
    primary = e.total_correct;
    primaryLabel = 'correct';
    secondary = `${e.total_quizzes} quizzes · 🔥 ${e.longest_streak}d longest`;
  } else if (tab === 'daily') {
    const e = entry as LeaderboardDailyEntry;
    primary = e.correct;
    primaryLabel = 'today';
    secondary = formatMs(e.duration_ms);
  } else {
    const e = entry as CategoryLeaderboardEntry;
    primary = e.total_correct;
    primaryLabel = 'correct';
    secondary = `${e.total_questions} attempts · ${e.accuracy_pct}% accuracy`;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: rank <= 3 ? 'rgba(45,122,45,0.04)' : 'transparent',
      }}
    >
      <Box sx={{ width: 28, fontWeight: 700, color: rank <= 3 ? BRAND.green : 'text.secondary' }}>
        {medal ?? rank}
      </Box>
      <Avatar src={entry.picture ?? undefined} alt="" sx={{ width: 32, height: 32 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {entry.display_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {secondary}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>
          {tab === 'daily'
            ? `${(entry as LeaderboardDailyEntry).correct}/${(entry as LeaderboardDailyEntry).total}`
            : primary}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {primaryLabel}
        </Typography>
      </Box>
    </Box>
  );
}

function formatMs(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export default Leaderboard;
