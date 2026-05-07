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
} from '@mui/material';
import { fetchLeaderboard, type LeaderboardGlobalEntry, type LeaderboardDailyEntry } from '../lib/play';
import { friendlyError } from '../lib/api';
import { BRAND } from '../theme/MuiTheme';

type Tab = 'global' | 'daily';

const today = () => new Date().toISOString().slice(0, 10);

function Leaderboard() {
  const [tab, setTab] = useState<Tab>('global');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<(LeaderboardGlobalEntry | LeaderboardDailyEntry)[]>([]);
  const [date] = useState<string>(today());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLeaderboard(tab, date)
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
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
  }, [tab, date]);

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
      </ToggleButtonGroup>

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
            <Typography variant="body2">No entries yet — be the first.</Typography>
          </Box>
        )}

        {!loading &&
          !error &&
          entries.map((entry, i) => (
            <Row key={i} rank={i + 1} entry={entry} tab={tab} />
          ))}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Updated every 60s. Take a quiz to appear here.
      </Typography>
    </Box>
  );
}

function Row({
  rank,
  entry,
  tab,
}: {
  rank: number;
  entry: LeaderboardGlobalEntry | LeaderboardDailyEntry;
  tab: Tab;
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

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
        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.display_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tab === 'global'
            ? `${(entry as LeaderboardGlobalEntry).total_quizzes} quizzes · 🔥 ${
                (entry as LeaderboardGlobalEntry).longest_streak
              }d longest`
            : `${formatMs((entry as LeaderboardDailyEntry).duration_ms)}`}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>
          {tab === 'global'
            ? (entry as LeaderboardGlobalEntry).total_correct
            : `${(entry as LeaderboardDailyEntry).correct}/${(entry as LeaderboardDailyEntry).total}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tab === 'global' ? 'correct' : 'today'}
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
