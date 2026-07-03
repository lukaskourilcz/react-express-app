import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { useTrack, trackStarterTopics, specializationForTrack, TRACKS, TRACK_ORDER, type Track } from '../lib/tracks';
import { getCategoryHexColor, getCategoryLabel, onCategoryColorText } from '../lib/categories';
import { useQuestXp, syncXpWithServer } from '../lib/xp';
import { computeLearningXp, levelForXp, displayTitle, MAX_RANK } from '../lib/leveling';
import { useAuth, getUserProfile } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
import { useBookmarks, removeBookmark } from '../lib/bookmarks';
import { computeAchievements, readPerfectQuizCount, type Achievement } from '../lib/achievements';
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

  return (
    <Box sx={{ maxWidth: { xs: 500, md: 1160 }, mx: 'auto' }}>
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

      {isFirstTime && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/quiz')}>
              {t('profile.firstQuizCta')}
            </Button>
          }
        >
          {t('profile.noQuizzes')}
        </Alert>
      )}

      {/* On desktop the cards split into two columns so the profile lands close
          to one viewport instead of one long scroll. On mobile they stack. */}
      <Box sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: '1fr 1fr' }, columnGap: { md: 2.5 }, alignItems: 'start' }}>
        <Box>
          <CareerCard />

          <LearningTrackCard />

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
        </Box>

        <Box>
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

          <AchievementsCard achievements={achievements} />

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
                      {t('profile.answerLabel', { answer: q.options[q.correctIndex] ?? '-' })}
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
        </Box>
      </Box>

      <Button
        variant="contained"
        fullWidth
        onClick={() => navigate('/quiz')}
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

  const [track] = useTrack();
  const learningXp = computeLearningXp(progress);
  const totalXp = learningXp + questXp;
  const info = levelForXp(totalXp);
  const spec = specializationForTrack(track);
  const title = displayTitle(info.rank.title, spec);
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
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {title}
          </Typography>
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

// Per-achievement accent colour for the earned medallion. Locked badges are
// neutral grey regardless.
const ACHIEVEMENT_ACCENT: Record<string, string> = {
  'first-quiz': '#2d7a2d',
  'ten-quizzes': '#0ea5e9',
  'fifty-quizzes': '#f59e0b',
  'streak-3': '#f97316',
  'streak-7': '#ef4444',
  'streak-30': '#8b5cf6',
  'avg-70': '#3b82f6',
  'avg-90': '#6366f1',
  perfect: '#eab308',
  bookmarker: '#14b8a6',
};

// Dev-flavoured line icons (terminal, trending-up, flame, bolt, gem, target,
// open book, star, bookmark, award) keyed by achievement id — far crisper than
// the old emoji tiles and consistent with the app's inline-SVG style.
const ACHIEVEMENT_ICON: Record<string, ReactNode> = {
  'first-quiz': (
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>
  ),
  'ten-quizzes': (
    <>
      <polyline points="23 6 13.5 16.5 8.5 11.5 1 19" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  'fifty-quizzes': (
    <>
      <circle cx="12" cy="8" r="6" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </>
  ),
  'streak-3': (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  'streak-7': <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  'streak-30': (
    <>
      <path d="M6 3h12l4 6-10 13L2 9z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </>
  ),
  'avg-70': (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  'avg-90': (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  perfect: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  bookmarker: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
};

function AchievementIcon({ id }: { id: string }) {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      sx={{ width: 22, height: 22, display: 'block' }}
    >
      {ACHIEVEMENT_ICON[id] ?? ACHIEVEMENT_ICON['first-quiz']}
    </Box>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const t = useT();
  const { id, earned } = achievement;
  const label = t(`achievement.${id}.label` as TranslationKey);
  const description = t(`achievement.${id}.description` as TranslationKey);
  const accent = ACHIEVEMENT_ACCENT[id] ?? BRAND.green;

  return (
    <Box
      aria-label={t('profile.achievementAria', {
        label,
        state: earned ? t('profile.earned') : t('profile.locked'),
        description,
      })}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: 1.25,
        border: '1px solid',
        borderColor: earned ? `${accent}66` : 'divider',
        borderRadius: 2,
        backgroundColor: earned ? `${accent}14` : 'transparent',
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: earned ? accent : 'action.hover',
            color: earned ? '#fff' : 'text.disabled',
            boxShadow: earned ? `0 2px 8px ${accent}59` : 'none',
          }}
        >
          <AchievementIcon id={id} />
        </Box>
        {earned && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 17,
              height: 17,
              borderRadius: '50%',
              backgroundColor: BRAND.green,
              border: '2px solid',
              borderColor: 'background.paper',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Box component="svg" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" sx={{ width: 9, height: 9, display: 'block' }}>
              <path d="M20 6 9 17l-5-5" />
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: earned ? 'text.primary' : 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

// The trophy case: dev-themed achievement badges with an earned/locked state and
// an overall-progress bar, so the section reads as a goal list, not emoji tiles.
function AchievementsCard({ achievements }: { achievements: Achievement[] }) {
  const t = useT();
  const earnedCount = achievements.filter((a) => a.earned).length;
  const pct = achievements.length > 0 ? Math.round((earnedCount / achievements.length) * 100) : 0;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.secondary" component="h2">
          {t('profile.achievements', { earned: earnedCount, total: achievements.length })}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 800, color: BRAND.green }}>
          {pct}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ height: 6, borderRadius: 3, mb: 2, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundColor: BRAND.green } }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
        {achievements.map((a) => (
          <AchievementBadge key={a.id} achievement={a} />
        ))}
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
