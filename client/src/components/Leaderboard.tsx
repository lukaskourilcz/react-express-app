import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Skeleton,
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
import { CATEGORY_OPTIONS, PRIVATE_CATEGORIES } from '../lib/categories';
import RetryAlert from './RetryAlert';
import { useT } from '../i18n/LanguageContext';

type Tab = 'global' | 'daily' | 'category';

const today = () => new Date().toISOString().slice(0, 10);

// Public categories only (no owner-private ones), sourced from the shared
// category metadata so labels and brand colors stay in sync app-wide.
const CATEGORIES = CATEGORY_OPTIONS.filter((c) => !PRIVATE_CATEGORIES.includes(c.value));

type Entry = LeaderboardGlobalEntry | LeaderboardDailyEntry | CategoryLeaderboardEntry;

function Leaderboard() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('global');
  const [category, setCategory] = useState<string>('javascript');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date] = useState<string>(today());
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [tab, date, category, reloadKey]);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
        {t('leaderboard.title')}
      </Typography>

      <ToggleButtonGroup
        value={tab}
        exclusive
        size="small"
        onChange={(_, v) => v && setTab(v)}
        aria-label={t('leaderboard.period')}
        sx={{
          mb: 2,
          width: { xs: '100%', sm: 'auto' },
          '& .MuiToggleButtonGroup-grouped': { flex: { xs: 1, sm: 'initial' } },
        }}
      >
        <ToggleButton value="global">{t('leaderboard.allTime')}</ToggleButton>
        <ToggleButton value="daily">{t('leaderboard.today')}</ToggleButton>
        <ToggleButton value="category">{t('leaderboard.byCategory')}</ToggleButton>
      </ToggleButtonGroup>

      {tab === 'category' && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              clickable
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              aria-label={t('leaderboard.categoryAria', { label: c.label })}
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
          <RetryAlert message={error} onRetry={() => setReloadKey((k) => k + 1)} sx={{ borderRadius: 0 }} />
        )}

        {!loading && !error && entries.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              {tab === 'category'
                ? t('leaderboard.noCategoryAttempts', {
                    label: CATEGORIES.find((c) => c.value === category)?.label ?? '',
                  })
                : t('leaderboard.noEntries')}
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
        {tab === 'category' ? t('leaderboard.footerCategory') : t('leaderboard.footerDefault')}
      </Typography>
    </Box>
  );
}

function Row({ rank, entry, tab }: { rank: number; entry: Entry; tab: Tab }) {
  const t = useT();
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  let primary = 0;
  let primaryLabel = '';
  let secondary = '';

  if (tab === 'global') {
    const e = entry as LeaderboardGlobalEntry;
    primary = e.total_correct;
    primaryLabel = t('leaderboard.correct');
    secondary = t('leaderboard.globalSecondary', { quizzes: e.total_quizzes, streak: e.longest_streak });
  } else if (tab === 'daily') {
    const e = entry as LeaderboardDailyEntry;
    primary = e.correct;
    primaryLabel = t('leaderboard.todayLabel');
    secondary = formatMs(e.duration_ms);
  } else {
    const e = entry as CategoryLeaderboardEntry;
    primary = e.total_correct;
    primaryLabel = t('leaderboard.correct');
    secondary = t('leaderboard.categorySecondary', { attempts: e.total_questions, accuracy: e.accuracy_pct });
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
