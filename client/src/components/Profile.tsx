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
import { useBookmarks, removeBookmark } from '../lib/bookmarks';
import { computeAchievements, readPerfectQuizCount } from '../lib/achievements';
import { renderQuestion } from './CodeBlock';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function Profile() {
  const t = useT();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [user, isAuthenticated, authLoading, navigate, reloadKey]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }} role="status" aria-live="polite">
        <CircularProgress sx={{ color: BRAND.green }} />
        <span style={{ position: 'absolute', left: -9999 }}>{t('profile.loading')}</span>
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
        {t('profile.redirecting')}
      </Typography>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
            {t('quiz.retry')}
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
    <ProfileBody
      user={user}
      stats={stats}
      totalQuizzes={totalQuizzes}
      totalCorrect={totalCorrect}
      totalQuestions={totalQuestions}
      averageScore={averageScore}
      isFirstTime={isFirstTime}
      navigate={navigate}
    />
  );
}

interface ProfileBodyProps {
  user: { name?: string; email?: string; picture?: string };
  stats: UserStats | null;
  totalQuizzes: number;
  totalCorrect: number;
  totalQuestions: number;
  averageScore: number;
  isFirstTime: boolean;
  navigate: (path: string) => void;
}

function ProfileBody({
  user,
  stats,
  totalQuizzes,
  totalCorrect,
  totalQuestions,
  averageScore,
  isFirstTime,
  navigate,
}: ProfileBodyProps) {
  const t = useT();
  const { questions: bookmarkedQuestions } = useBookmarks();
  const achievements = computeAchievements({
    stats,
    bookmarkCount: bookmarkedQuestions.length,
    perfectQuizzes: readPerfectQuizCount(),
  });
  const earned = achievements.filter((a) => a.earned);

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
              {t('profile.firstQuizCta')}
            </Button>
          }
        >
          {t('profile.noQuizzes')}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
          {t('profile.streaks')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.dark', lineHeight: 1 }}>
              {stats?.current_streak || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('profile.currentStreak')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('profile.days')}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: BRAND.green, lineHeight: 1 }}>
              {stats?.longest_streak || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('profile.longestStreak')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('profile.days')}
            </Typography>
          </Box>
        </Box>

        {stats?.last_quiz_date && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            {t('profile.lastQuiz', { date: dateFormatter.format(new Date(stats.last_quiz_date)) })}
          </Typography>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
          {t('profile.statistics')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StatRow label={t('profile.quizzesCompleted')} value={totalQuizzes} />
          <StatRow label={t('profile.questionsAnswered')} value={totalQuestions} />
          <StatRow label={t('profile.correctAnswers')} value={totalCorrect} />
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
              {t('profile.averageScore')}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: averageScore >= 70 ? 'success.dark' : 'text.primary' }}>
              {averageScore}%
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
          {t('profile.achievements', { earned: earned.length, total: achievements.length })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {achievements.map((a) => {
            const label = t(`achievement.${a.id}.label` as TranslationKey);
            const description = t(`achievement.${a.id}.description` as TranslationKey);
            return (
            <Box
              key={a.id}
              title={description}
              aria-label={t('profile.achievementAria', {
                label,
                state: a.earned ? t('profile.earned') : t('profile.locked'),
                description,
              })}
              sx={{
                p: 1,
                width: 88,
                textAlign: 'center',
                border: '1px solid',
                borderColor: a.earned ? BRAND.green : 'divider',
                borderRadius: 1,
                backgroundColor: a.earned ? 'rgba(45,122,45,0.06)' : 'transparent',
                opacity: a.earned ? 1 : 0.45,
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
                {a.emoji}
              </div>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
                {label}
              </Typography>
            </Box>
            );
          })}
        </Box>
      </Paper>

      {bookmarkedQuestions.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
            {t('profile.bookmarks', { count: bookmarkedQuestions.length })}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {bookmarkedQuestions.slice(0, 20).map((q) => (
              <Box
                key={q.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Box sx={{ fontSize: '0.9rem' }}>{renderQuestion(q.question)}</Box>
                <Typography variant="caption" color="success.dark">
                  {t('profile.answerLabel', { answer: q.options[q.correctIndex] ?? '—' })}
                </Typography>
                {q.explanation && (
                  <Typography variant="caption" color="text.secondary">
                    {q.explanation}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    onClick={() => removeBookmark(q.id)}
                    sx={{ textTransform: 'none', color: 'text.secondary' }}
                  >
                    {t('common.remove')}
                  </Button>
                </Box>
              </Box>
            ))}
            {bookmarkedQuestions.length > 20 && (
              <Typography variant="caption" color="text.secondary">
                {t('profile.showingOf', { total: bookmarkedQuestions.length })}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

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
        {isFirstTime ? t('profile.startQuiz') : t('profile.backToQuiz')}
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
