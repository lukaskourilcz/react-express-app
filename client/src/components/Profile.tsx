import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Button,
  Divider,
  Alert,
  LinearProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { getUserStats, createOrUpdateUserStats, type UserStats } from '../lib/supabase';
import { useRoadmapProgress, syncProgressWithServer } from '../lib/roadmap';
import { useQuestXp, syncXpWithServer } from '../lib/xp';
import { computeLearningXp, levelForXp, specializationFor, displayTitle, MAX_RANK } from '../lib/leveling';
import { useAuth, getUserProfile } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
import { useBookmarks, removeBookmark } from '../lib/bookmarks';
import { computeAchievements, readPerfectQuizCount } from '../lib/achievements';
import { renderQuestion } from './CodeBlock';
import { useT, useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import { savePreferredLanguage } from '../lib/languagePref';
import { useReloadKey, useCancellableEffect } from '../lib/hooks';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function Profile() {
  const t = useT();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const profile = getUserProfile(user);
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, reload] = useReloadKey();

  useCancellableEffect(
    async (isCancelled) => {
      if (!authLoading && !isAuthenticated) {
        navigate('/');
        return;
      }
      if (!isAuthenticated || !user?.id) return;

      setLoading(true);
      setError(null);
      try {
        let loaded = await getUserStats(user.id);
        if (!loaded) {
          loaded = await createOrUpdateUserStats(user.id, {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          });
        }
        if (!isCancelled()) setStats(loaded);
      } catch (err) {
        if (!isCancelled()) setError(friendlyError(err));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [user, isAuthenticated, authLoading, navigate, reloadKey],
  );

  if (authLoading || loading) {
    return <LoadingScreen label={t('profile.loading')} />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
        {t('profile.redirecting')}
      </Typography>
    );
  }

  if (error) {
    return <ErrorRetry message={error} onRetry={reload} />;
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
      user={profile}
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
  const ringColor = useEquippedRingColor();
  const flair = useEquippedFlair();
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
        sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${BRAND.green}`, borderRadius: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user.picture}
            alt=""
            sx={{
              width: { xs: 52, sm: 64 },
              height: { xs: 52, sm: 64 },
              flexShrink: 0,
              ...(ringColor ? { border: `3px solid ${ringColor}`, boxShadow: `0 0 0 2px ${ringColor}33` } : null),
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {flair ? `${flair} ` : ''}{user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <CareerCard />

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

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
          {t('profile.streaks')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.dark', lineHeight: 1, fontSize: { xs: '2.25rem', sm: '3rem' } }}>
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
            <Typography variant="h3" sx={{ fontWeight: 700, color: BRAND.green, lineHeight: 1, fontSize: { xs: '2.25rem', sm: '3rem' } }}>
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

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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
                width: { xs: 80, sm: 88 },
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
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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

      <PreferencesCard />

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
          ...brandButtonSx,
        }}
      >
        {isFirstTime ? t('profile.startQuiz') : t('profile.backToQuiz')}
      </Button>
    </Box>
  );
}

// Career level card: the learner's rank (derived from total XP = learning XP +
// quest XP), with a progress bar toward the next rank. Pulls account XP on mount
// so it stays in sync even if the user hasn't visited the learning path.
function CareerCard() {
  const t = useT();
  const progress = useRoadmapProgress();
  const questXp = useQuestXp();

  // Sync progress then XP so the card is accurate even if Profile is the first
  // screen opened on a fresh device (learning XP derives from synced progress).
  useEffect(() => {
    syncProgressWithServer().then(() => syncXpWithServer()).catch(() => {});
  }, []);

  const learningXp = computeLearningXp(progress);
  const totalXp = learningXp + questXp;
  const info = levelForXp(totalXp);
  const spec = specializationFor(progress);
  const title = displayTitle(info.rank.title, spec);
  // The specialization reads inline for "…Developer" ranks; for senior ranks
  // (Engineer/Architect) surface it as a chip instead.
  const showSpecChip = spec && !info.rank.title.includes('Developer');
  const nextTitle = info.next ? displayTitle(info.next.title, spec) : null;
  const nf = (n: number) => n.toLocaleString();

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
        {t('profile.career')}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ fontSize: { xs: 36, sm: 44 }, lineHeight: 1, flexShrink: 0 }} aria-hidden>
          {info.rank.emoji}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {showSpecChip && (
              <Chip label={spec} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, backgroundColor: `${BRAND.green}22`, color: 'text.primary' }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('profile.careerLevelOf', { level: info.level, max: MAX_RANK })}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.green, lineHeight: 1 }}>
            {nf(totalXp)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('profile.xpUnit')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <LinearProgress
          variant="determinate"
          value={info.progressPct}
          aria-label={info.isMax ? t('profile.maxRank') : t('profile.xpToNext', { xp: info.xpToNext, title: nextTitle ?? '' })}
          sx={{ height: 10, borderRadius: 5, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5, backgroundColor: BRAND.green, transition: 'transform 0.5s ease' } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 0.75, gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t('profile.xpBreakdown', { learn: nf(learningXp), quest: nf(questXp) })}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            {info.isMax ? t('profile.maxRank') : t('profile.xpToNext', { xp: nf(info.xpToNext), title: nextTitle ?? '' })}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// Account preferences. The language choice is applied live and persisted to the
// account (Supabase user_metadata) so it loads automatically on the next sign-in.
function PreferencesCard() {
  const { t, lang, setLang } = useLanguage();

  const handleLang = (_: React.MouseEvent<HTMLElement>, next: Lang | null) => {
    if (!next || next === lang) return;
    setLang(next);
    void savePreferredLanguage(next);
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 2 }}>
        {t('profile.preferences')}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('profile.language')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('profile.languageHelp')}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={lang}
          exclusive
          size="small"
          onChange={handleLang}
          aria-label={t('profile.language')}
          sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.4, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none' } }}
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="cs">CS</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Paper>
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
