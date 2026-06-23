import { useEffect, useMemo, useState } from 'react';
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
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import type { UserStats } from '../lib/supabase';
import { useProfileStats } from '../lib/queries';
import {
  useRoadmapProgress,
  syncProgressWithServer,
  useExtraUnlocks,
  isTopicUnlocked,
  unlockExtraTopics,
  pushProgressToServer,
} from '../lib/roadmap';
import { useTrack, trackStarterTopics, TRACKS, TRACK_ORDER, type Track } from '../lib/tracks';
import { getCategoryHexColor, getCategoryLabel, onCategoryColorText } from '../lib/categories';
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
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function Profile() {
  const t = useT();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const profile = getUserProfile(user);
  const navigate = useNavigate();

  // Redirect signed-out visitors home once auth has resolved.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/');
  }, [authLoading, isAuthenticated, navigate]);

  const enabled = isAuthenticated && !!user?.id;
  const statsQuery = useProfileStats(
    user?.id,
    { email: profile.email, name: profile.name, picture: profile.picture },
    enabled,
  );
  const stats: UserStats | null = statsQuery.data ?? null;
  const loading = authLoading || (enabled && statsQuery.isPending);
  const error = statsQuery.error ? friendlyError(statsQuery.error) : null;

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
    return <ErrorRetry message={error} onRetry={() => statsQuery.refetch()} />;
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

      <LearningTrackCard />

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

// Learning track: the learner picks Frontend / Backend / Fullstack and we unlock
// that path's first learning sections (its first two stages) so they can dive
// straight in. The choice is shared (via useTrack) with the /roadmap page, and
// unlocks are additive — switching tracks never re-locks anything.
function LearningTrackCard() {
  const t = useT();
  const navigate = useNavigate();
  const [track, setTrack] = useTrack();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const extraSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);
  const [snack, setSnack] = useState<string | null>(null);

  const sections = trackStarterTopics(track);

  const applyTrack = (_: React.MouseEvent<HTMLElement>, next: Track | null) => {
    // Clicking the already-selected track re-applies (re-unlocks) it rather than
    // deselecting, so the starting sections are always ensured.
    const target = next ?? track;
    if (target !== track) setTrack(target);
    unlockExtraTopics(trackStarterTopics(target));
    // Best-effort: persist the new unlocks to the account.
    pushProgressToServer().catch(() => {});
    setSnack(t('profile.trackSet', { label: TRACKS[target].label }));
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1 }}>
        {t('profile.trackTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('profile.trackHelp')}
      </Typography>

      <ToggleButtonGroup
        value={track}
        exclusive
        onChange={applyTrack}
        aria-label={t('profile.trackTitle')}
        sx={{
          flexWrap: 'wrap',
          mb: 2.5,
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.6,
            fontWeight: 700,
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: BRAND.green,
              color: '#fff',
              '&:hover': { backgroundColor: BRAND.greenHover },
            },
          },
        }}
      >
        {TRACK_ORDER.map((tk) => (
          <ToggleButton key={tk} value={tk}>
            {TRACKS[tk].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('profile.trackSectionsLabel')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
        {sections.map((topic) => {
          const unlocked = isTopicUnlocked(progress, topic, extraSet);
          const color = getCategoryHexColor(topic);
          return (
            <Chip
              key={topic}
              label={getCategoryLabel(topic)}
              size="small"
              onClick={() => navigate(`/learn?topic=${topic}`)}
              sx={{
                cursor: 'pointer',
                fontWeight: 600,
                border: '1px solid',
                borderColor: color,
                backgroundColor: unlocked ? color : 'transparent',
                color: unlocked ? onCategoryColorText(topic) : 'text.secondary',
              }}
            />
          );
        })}
      </Box>

      <Button variant="outlined" size="small" onClick={() => navigate('/learn')} sx={{ textTransform: 'none' }}>
        {t('profile.trackGoLearn')}
      </Button>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
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
