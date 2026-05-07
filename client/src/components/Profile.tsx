import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  CircularProgress,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { getUserStats, createOrUpdateUserStats, type UserStats } from '../lib/supabase';
import { friendlyError } from '../lib/api';
import { BRAND } from '../theme/MuiTheme';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
      return;
    }
    if (!isAuthenticated || !user) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadStats() {
      if (!user?.sub) return;
      setLoading(true);
      setError(null);
      try {
        let s = await getUserStats(user.sub);
        if (!s) {
          s = await createOrUpdateUserStats(user.sub, {
            email: user.email,
            name: user.name,
            picture: user.picture,
          });
        }
        if (!cancelled) setStats(s);
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user, isAuthenticated, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }} role="status" aria-live="polite">
        <CircularProgress sx={{ color: BRAND.green }} />
        <span style={{ position: 'absolute', left: -9999 }}>Loading your profile…</span>
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
        Redirecting…
      </Typography>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const totalQuizzes = stats?.total_quizzes ?? 0;
  const totalCorrect = stats?.total_correct ?? 0;
  const totalQuestions = stats?.total_questions ?? 0;
  const averageScore =
    stats && stats.total_questions > 0
      ? Math.round((stats.total_correct / stats.total_questions) * 100)
      : 0;
  const isFirstTime = totalQuizzes === 0;

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${BRAND.green}`, borderRadius: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user.picture} alt="" sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {isFirstTime && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/')}>
              Take your first quiz
            </Button>
          }
        >
          No quizzes yet — start your streak today.
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
          Streaks
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.dark', lineHeight: 1 }}>
              {stats?.current_streak || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Current streak
            </Typography>
            <Typography variant="caption" color="text.secondary">
              days
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: BRAND.green, lineHeight: 1 }}>
              {stats?.longest_streak || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Longest streak
            </Typography>
            <Typography variant="caption" color="text.secondary">
              days
            </Typography>
          </Box>
        </Box>

        {stats?.last_quiz_date && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Last quiz: {dateFormatter.format(new Date(stats.last_quiz_date))}
          </Typography>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
          Statistics
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StatRow label="Quizzes completed" value={totalQuizzes} />
          <StatRow label="Questions answered" value={totalQuestions} />
          <StatRow label="Correct answers" value={totalCorrect} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              backgroundColor: averageScore >= 70 ? 'rgba(22,163,74,0.1)' : 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Average score
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: averageScore >= 70 ? 'success.dark' : 'text.primary' }}>
              {averageScore}%
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Button
        variant="contained"
        fullWidth
        onClick={() => navigate('/')}
        sx={{
          py: 1.5,
          fontSize: '0.95rem',
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: 1,
          backgroundColor: BRAND.green,
          '&:hover': { backgroundColor: BRAND.greenHover },
        }}
      >
        {isFirstTime ? 'Start a quiz' : 'Back to quiz'}
      </Button>
    </Box>
  );
}

const StatRow = ({ label, value }: { label: string; value: number }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);

export default Profile;
