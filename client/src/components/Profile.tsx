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
} from '@mui/material';
import { getUserStats, createOrUpdateUserStats, UserStats } from '../lib/supabase';

function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
      return;
    }

    async function loadStats() {
      if (!user?.sub) return;

      setLoading(true);
      let userStats = await getUserStats(user.sub);

      if (!userStats) {
        userStats = await createOrUpdateUserStats(user.sub, {
          email: user.email,
          name: user.name,
          picture: user.picture,
        });
      }

      setStats(userStats);
      setLoading(false);
    }

    if (isAuthenticated && user) {
      loadStats();
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress sx={{ color: '#339933' }} />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const averageScore =
    stats && stats.total_questions > 0
      ? Math.round((stats.total_correct / stats.total_questions) * 100)
      : 0;

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      {/* User Info Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          border: '1px solid #e0e0e0',
          borderTop: '4px solid #339933',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user.picture}
            alt={user.name || 'User'}
            sx={{ width: 64, height: 64 }}
          />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
              {user.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Streak Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#888',
            fontWeight: 500,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            mb: 2,
          }}
        >
          Streaks
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#f59e0b',
                lineHeight: 1,
              }}
            >
              {stats?.current_streak || 0}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
              Current Streak
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              days
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#339933',
                lineHeight: 1,
              }}
            >
              {stats?.longest_streak || 0}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
              Longest Streak
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              days
            </Typography>
          </Box>
        </Box>

        {stats?.last_quiz_date && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: '#999',
              mt: 2,
            }}
          >
            Last quiz: {new Date(stats.last_quiz_date).toLocaleDateString()}
          </Typography>
        )}
      </Paper>

      {/* Stats Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#888',
            fontWeight: 500,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            mb: 2,
          }}
        >
          Statistics
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: '#666' }}>
              Quizzes Completed
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
              {stats?.total_quizzes || 0}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: '#666' }}>
              Questions Answered
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
              {stats?.total_questions || 0}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: '#666' }}>
              Correct Answers
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
              {stats?.total_correct || 0}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              backgroundColor: averageScore >= 70 ? '#dcfce7' : '#f8f9fa',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: '#666' }}>
              Average Score
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: averageScore >= 70 ? '#16a34a' : '#1a1a1a',
              }}
            >
              {averageScore}%
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Back to Quiz Button */}
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
          backgroundColor: '#339933',
          '&:hover': {
            backgroundColor: '#2d8a2d',
          },
        }}
      >
        Back to Quiz
      </Button>
    </Box>
  );
}

export default Profile;
