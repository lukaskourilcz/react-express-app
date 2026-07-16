import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Chip,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Avatar } from '@astryxdesign/core/Avatar';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
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
import { useTrack, trackStarterTopics, rankLabelFor, tracksForActiveSubject, TRACK_ORDER, type Track } from '../lib/tracks';
import { getCategoryHexColor, getCategoryLabel, onCategoryColorText } from '../lib/categories';
import { useQuestXp, syncXpWithServer } from '../lib/xp';
import { computeLearningXp, levelForXp, MAX_RANK } from '../lib/leveling';
import { useAuth, getUserProfile } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { useBookmarks, removeBookmark } from '../lib/bookmarks';
import { computeAchievements, readPerfectQuizCount, type Achievement } from '../lib/achievements';
import { renderQuestion } from './CodeBlock';
import { useT, useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import { SIBLING_PLATFORMS_URL, useActiveSubject, topicSetForSubject } from '../lib/subjects';
import { savePreferredLanguage } from '../lib/languagePref';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

// Astryx Card colour variants used for the tinted stat / streak tiles.
type CardVariant = 'default' | 'muted' | 'blue' | 'cyan' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';

// Small uppercase section label, the Astryx stand-in for MUI's "overline". An
// optional emoji gives each section a little personality.
function SectionLabel({ emoji, children }: { emoji?: string; children: ReactNode }) {
  return (
    <HStack gap={1} align="center">
      {emoji && <span aria-hidden style={{ fontSize: '1.05rem', lineHeight: 1 }}>{emoji}</span>}
      <Text type="label" color="secondary" weight="bold">
        {children}
      </Text>
    </HStack>
  );
}

// Accent-tinted rounded meta pill. `color` sets both the text and (via
// currentColor) the soft translucent background — a playful stand-in for a
// muted caption.
function MetaPill({ color = 'var(--brand-accent)', children }: { color?: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: 999,
        padding: '2px 9px',
        fontFamily: 'var(--font-family-body)',
        fontWeight: 700,
        fontSize: '0.68rem',
        letterSpacing: '0.02em',
        color,
        background: 'color-mix(in srgb, currentColor 14%, transparent)',
      }}
    >
      {children}
    </span>
  );
}

// Springy-lift wrapper — the single biggest depth win for flat Astryx cards.
function Lift({ children }: { children: ReactNode }) {
  return (
    <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
      {children}
    </div>
  );
}

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
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <Text type="supporting" color="secondary">
          {t('profile.redirecting')}
        </Text>
      </div>
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
    <div style={{ width: '100%', maxWidth: 1160, margin: '0 auto' }}>
      <VStack gap={2}>
        {/* Identity header — subject-accented top edge, avatar + name, a
            playful floating shark and a gradient wordmark on the name. */}
        <div className="ss-lift ss-pop" style={{ display: 'flex', width: '100%' }}>
          <div style={{ borderTop: '4px solid var(--brand-accent)', borderRadius: 16, width: '100%', position: 'relative', overflow: 'hidden' }}>
            <Card variant="default" padding={3} width="100%">
              <span aria-hidden className="ss-float" style={{ position: 'absolute', top: 12, right: 18, fontSize: '1.8rem', opacity: 0.6 }}>🦈</span>
              <HStack gap={2} align="center">
                <div
                  style={{
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    ...(ringColor
                      ? { padding: 3, background: `${ringColor}33`, boxShadow: `0 0 0 2px ${ringColor}` }
                      : null),
                  }}
                >
                  <Avatar src={user.picture} name={user.name} alt="" size={64} />
                </div>
                <VStack gap={0.5}>
                  <Heading level={3} maxLines={1}>
                    {flair ? `${flair} ` : ''}<span className="ss-gradient-text">{user.name}</span>
                  </Heading>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {user.email}
                  </Text>
                </VStack>
              </HStack>
            </Card>
          </div>
        </div>

        {/* On a standalone deploy (e.g. devShark) point learners at the umbrella
            site so they can discover the other Shark platforms. Hidden when
            VITE_SIBLING_URL is unset (i.e. on StudyShark itself). */}
        {SIBLING_PLATFORMS_URL && (
          <a
            href={SIBLING_PLATFORMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <Card variant="muted" padding={2} width="100%">
              <HStack gap={1.5} align="center" justify="between">
                <HStack gap={1.5} align="center">
                  <span aria-hidden style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🦈</span>
                  <VStack gap={0}>
                    <Text weight="bold">{t('profile.otherPlatforms')}</Text>
                    <Text type="supporting" size="xsm" color="secondary">
                      {t('profile.otherPlatformsSub')}
                    </Text>
                  </VStack>
                </HStack>
                <span aria-hidden style={{ color: 'var(--brand-accent)', fontWeight: 800, fontSize: '1.25rem', flexShrink: 0 }}>→</span>
              </HStack>
            </Card>
          </a>
        )}

        {isFirstTime && (
          <Alert
            severity="info"
            action={
              <Button variant="ghost" size="sm" label={t('profile.firstQuizCta')} onClick={() => navigate('/quiz')} />
            }
          >
            {t('profile.noQuizzes')}
          </Alert>
        )}

        {/* On desktop the cards split into two columns so the profile lands close
            to one viewport instead of one long scroll. On mobile they stack. */}
        <Grid columns={{ minWidth: 360, max: 2 }} gap={2} align="start" width="100%">
          <VStack gap={2}>
            <CareerCard />

            <LearningTrackCard />

            <Lift>
            <Card variant="default" padding={3} width="100%">
              <VStack gap={2}>
                <SectionLabel emoji="🔥">{t('profile.streaks')}</SectionLabel>

                <Grid columns={2} gap={2}>
                  <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
                    <Card variant="orange" padding={2} width="100%">
                      <VStack gap={0.5} align="center">
                        <span aria-hidden style={{ fontSize: '1.6rem', lineHeight: 1 }}>🔥</span>
                        <Text size="4xl" weight="bold">{stats?.current_streak || 0}</Text>
                        <Text type="supporting" color="secondary" justify="center">
                          {t('profile.currentStreak')}
                        </Text>
                        <MetaPill color="#f97316">{t('profile.days')}</MetaPill>
                      </VStack>
                    </Card>
                  </div>

                  <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
                    <Card variant="cyan" padding={2} width="100%">
                      <VStack gap={0.5} align="center">
                        <span aria-hidden style={{ fontSize: '1.6rem', lineHeight: 1 }}>⚡</span>
                        <Text size="4xl" weight="bold" color="accent">{stats?.longest_streak || 0}</Text>
                        <Text type="supporting" color="secondary" justify="center">
                          {t('profile.longestStreak')}
                        </Text>
                        <MetaPill color="#0ea5e9">{t('profile.days')}</MetaPill>
                      </VStack>
                    </Card>
                  </div>
                </Grid>

                {stats?.last_quiz_date && (
                  <Text type="supporting" size="xsm" color="secondary" justify="center">
                    {t('profile.lastQuiz', { date: dateFormatter.format(new Date(stats.last_quiz_date)) })}
                  </Text>
                )}
              </VStack>
            </Card>
            </Lift>
          </VStack>

          <VStack gap={2}>
            <Lift>
            <Card variant="default" padding={3} width="100%">
              <VStack gap={2}>
                <SectionLabel emoji="📊">{t('profile.statistics')}</SectionLabel>

                <Grid columns={{ minWidth: 130, max: 2 }} gap={1.5}>
                  <StatTile label={t('profile.quizzesCompleted')} value={totalQuizzes} variant="blue" emoji="📝" />
                  <StatTile label={t('profile.questionsAnswered')} value={totalQuestions} variant="purple" emoji="❓" />
                  <StatTile label={t('profile.correctAnswers')} value={totalCorrect} variant="green" emoji="✅" />
                  <StatTile
                    label={t('profile.averageScore')}
                    value={`${averageScore}%`}
                    variant={averageScore >= 70 ? 'green' : 'gray'}
                    emoji="🎯"
                  />
                </Grid>
              </VStack>
            </Card>
            </Lift>

            <AchievementsCard achievements={achievements} />

            {bookmarkedQuestions.length > 0 && (
              <Lift>
              <Card variant="default" padding={3} width="100%">
                <VStack gap={2}>
                  <SectionLabel emoji="🔖">{t('profile.bookmarks', { count: bookmarkedQuestions.length })}</SectionLabel>
                  <VStack gap={1.5}>
                    {bookmarkedQuestions.slice(0, 20).map((q) => (
                      <Card key={q.id} variant="muted" padding={2}>
                        <VStack gap={1}>
                          <div style={{ fontSize: '0.9rem' }}>{renderQuestion(q.question)}</div>
                          <Text type="supporting" size="xsm" color="accent">
                            {t('profile.answerLabel', { answer: q.options[q.correctIndex] ?? '-' })}
                          </Text>
                          {q.explanation && (
                            <Text type="supporting" size="xsm" color="secondary">
                              {q.explanation}
                            </Text>
                          )}
                          <HStack justify="end">
                            <Button variant="ghost" size="sm" label={t('common.remove')} onClick={() => removeBookmark(q.id)} />
                          </HStack>
                        </VStack>
                      </Card>
                    ))}
                    {bookmarkedQuestions.length > 20 && (
                      <Text type="supporting" size="xsm" color="secondary">
                        {t('profile.showingOf', { total: bookmarkedQuestions.length })}
                      </Text>
                    )}
                  </VStack>
                </VStack>
              </Card>
              </Lift>
            )}

            <PreferencesCard />
          </VStack>
        </Grid>

        <HStack justify="center">
          <Button
            variant="ghost"
            size="sm"
            label={isFirstTime ? t('profile.startQuiz') : t('profile.backToQuiz')}
            onClick={() => navigate('/quiz')}
          />
        </HStack>
      </VStack>
    </div>
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
  // XP and rank are per subject: only the active subject's roadmap progress
  // and quest accumulator count here.
  const subject = useActiveSubject();
  const learningXp = computeLearningXp(progress, topicSetForSubject(subject.id));
  const totalXp = learningXp + questXp;
  const info = levelForXp(totalXp);
  // Subject-aware rank label ("Junior Full-Stack Developer" for Web Dev,
  // "Junior Explorer" for Geography, "Club Player" for Chess, …).
  const { title, emoji } = rankLabelFor(info.rank, track);
  const nextTitle = info.next ? rankLabelFor(info.next, track).title : null;
  const nf = (n: number) => n.toLocaleString();
  const nextLabel = info.isMax
    ? t('profile.maxRank')
    : t('profile.xpToNext', { xp: nf(info.xpToNext), title: nextTitle ?? '' });

  return (
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <SectionLabel emoji="🚀">{t('profile.career')}</SectionLabel>

        <HStack gap={2} align="center">
          <div
            aria-hidden
            className="ss-emoji-tile"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              fontSize: '2rem',
              flexShrink: 0,
              background: 'var(--brand-accent-soft, rgba(0,0,0,0.05))',
              boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-accent) 45%, transparent)',
            }}
          >
            {emoji}
          </div>
          <VStack gap={0} width="100%">
            <Heading level={4} maxLines={1}>{title}</Heading>
            <Text type="supporting" size="xsm" color="secondary">
              {t('profile.careerLevelOf', { level: info.level, max: MAX_RANK })}
            </Text>
          </VStack>
          <VStack gap={0.5} align="end">
            <Text size="3xl" weight="bold" color="accent">{nf(totalXp)}</Text>
            <MetaPill>{t('profile.xpUnit')}</MetaPill>
          </VStack>
        </HStack>

        <VStack gap={1}>
          <ProgressBar
            label={nextLabel}
            value={info.progressPct}
            isLabelHidden
          />
          <HStack justify="between" align="start" gap={1} wrap="wrap">
            <Text type="supporting" size="xsm" color="secondary">
              {t('profile.xpBreakdown', { learn: nf(learningXp), quest: nf(questXp) })}
            </Text>
            <Text type="supporting" size="xsm" color="secondary" weight="semibold">
              {nextLabel}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Card>
    </Lift>
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
    setSnack(t('profile.trackSet', { label: tracksForActiveSubject()[target].label }));
  };

  return (
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <VStack gap={0.5}>
          <SectionLabel emoji="🧭">{t('profile.trackTitle')}</SectionLabel>
          <Text type="supporting" color="secondary">{t('profile.trackHelp')}</Text>
        </VStack>

        <ToggleButtonGroup
          value={track}
          exclusive
          onChange={applyTrack}
          aria-label={t('profile.trackTitle')}
          sx={{
            flexWrap: 'wrap',
            '& .MuiToggleButton-root': {
              px: 2,
              py: 0.6,
              fontWeight: 700,
              textTransform: 'none',
              '&.Mui-selected': {
                backgroundColor: 'var(--brand-accent)',
                color: '#fff',
                '&:hover': { backgroundColor: 'var(--brand-accent-hover)' },
              },
            },
          }}
        >
          {TRACK_ORDER.map((tk) => (
            <ToggleButton key={tk} value={tk}>
              {tracksForActiveSubject()[tk].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <VStack gap={1}>
          <Text type="supporting" size="xsm" color="secondary">
            {t('profile.trackSectionsLabel')}
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
          </div>
        </VStack>

        <HStack>
          <Button variant="secondary" size="sm" label={t('profile.trackGoLearn')} onClick={() => navigate('/learn')} />
        </HStack>
      </VStack>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Card>
    </Lift>
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
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 22, height: 22, display: 'block' }}
    >
      {ACHIEVEMENT_ICON[id] ?? ACHIEVEMENT_ICON['first-quiz']}
    </svg>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const t = useT();
  const { id, earned } = achievement;
  const label = t(`achievement.${id}.label` as TranslationKey);
  const description = t(`achievement.${id}.description` as TranslationKey);
  const accent = ACHIEVEMENT_ACCENT[id] ?? 'var(--brand-accent)';

  return (
    <div
      className="ss-lift"
      aria-label={t('profile.achievementAria', {
        label,
        state: earned ? t('profile.earned') : t('profile.locked'),
        description,
      })}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        border: '1px solid',
        borderColor: earned ? `${accent}66` : 'var(--astryx-border, rgba(0,0,0,0.12))',
        borderRadius: 12,
        backgroundColor: earned ? `${accent}14` : 'transparent',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: earned ? accent : 'rgba(128,128,128,0.16)',
            color: earned ? '#fff' : 'rgba(128,128,128,0.7)',
            boxShadow: earned ? `0 2px 8px ${accent}59` : 'none',
          }}
        >
          <AchievementIcon id={id} />
        </div>
        {earned && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 17,
              height: 17,
              borderRadius: '50%',
              backgroundColor: 'var(--brand-accent)',
              border: '2px solid var(--astryx-surface, #fff)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 9, height: 9, display: 'block' }}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <Text weight="bold" color={earned ? 'primary' : 'secondary'}>
          {label}
        </Text>
        <Text type="supporting" size="xsm" color="secondary" display="block">
          {description}
        </Text>
      </div>
    </div>
  );
}

// The trophy case: dev-themed achievement badges with an earned/locked state and
// an overall-progress bar, so the section reads as a goal list, not emoji tiles.
function AchievementsCard({ achievements }: { achievements: Achievement[] }) {
  const t = useT();
  const earnedCount = achievements.filter((a) => a.earned).length;
  const pct = achievements.length > 0 ? Math.round((earnedCount / achievements.length) * 100) : 0;

  return (
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <HStack align="center" justify="between" gap={1} wrap="wrap">
          <SectionLabel emoji="🏆">{t('profile.achievements', { earned: earnedCount, total: achievements.length })}</SectionLabel>
          <Badge variant={pct === 100 ? 'success' : 'neutral'} label={`${pct}%`} />
        </HStack>
        <ProgressBar label={t('profile.achievements', { earned: earnedCount, total: achievements.length })} value={pct} isLabelHidden />
        <Grid columns={{ minWidth: 200, max: 2 }} gap={1.5}>
          {achievements.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </Grid>
      </VStack>
    </Card>
    </Lift>
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
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <SectionLabel emoji="⚙️">{t('profile.preferences')}</SectionLabel>
        <HStack justify="between" align="center" gap={2} wrap="wrap">
          <VStack gap={0}>
            <Text weight="semibold">{t('profile.language')}</Text>
            <Text type="supporting" size="xsm" color="secondary">{t('profile.languageHelp')}</Text>
          </VStack>
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
        </HStack>
      </VStack>
    </Card>
    </Lift>
  );
}

const StatTile = ({ label, value, variant, emoji }: { label: string; value: number | string; variant: CardVariant; emoji?: string }) => (
  <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
    <Card variant={variant} padding={2} width="100%">
      <VStack gap={0.5}>
        {emoji && <span aria-hidden style={{ fontSize: '1.35rem', lineHeight: 1 }}>{emoji}</span>}
        <Text size="4xl" weight="bold">{value}</Text>
        <Text type="supporting" size="xsm" color="secondary">{label}</Text>
      </VStack>
    </Card>
  </div>
);

export default Profile;
