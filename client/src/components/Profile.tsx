import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Banner } from '@astryxdesign/core/Banner';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { AppToast } from './ui/AppToast';
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
import { useTrack, trackStarterTopics, rankLabelKeyFor, trackLabelKey, TRACK_ORDER, type Track } from '../lib/tracks';
import { getCategoryHexColor, categoryLabelKey, onCategoryColorText } from '../lib/categories';
import { useQuestXp, syncXpWithServer } from '../lib/xp';
import { computeLearningXp, levelForXp, MAX_RANK } from '../lib/leveling';
import { useAuth, getUserProfile } from '../lib/auth';
import { apiFetch, friendlyError } from '../lib/api';
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
import { SwimmingFin } from './SharkFin';
import { FlameIcon, BoltIcon, TrophyIcon } from './ui/icons';
import { BrandedConfirmDialog, type ConfirmRequest } from './ui/BrandedConfirmDialog';
import './DeepEndScreens.css';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

// Astryx Card colour variants used for the tinted stat / streak tiles.
type CardVariant = 'default' | 'muted' | 'blue' | 'cyan' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';

// Section opener in the brand's editorial voice: uppercase accent kicker with
// the waterline tick beneath (the "dive marker" that starts every section).
function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="ss-kicker">{children}</span>;
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
        padding: '3px 10px',
        fontFamily: 'var(--font-family-body)',
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
        color,
        background: 'color-mix(in srgb, currentColor 14%, transparent)',
      }}
    >
      {children}
    </span>
  );
}

// Raised wrapper: resting depth for flat Astryx cards. These profile cards are
// read-only, so no hover-lift — motion is reserved for clickable surfaces.
function Lift({ children }: { children: ReactNode }) {
  return (
    <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
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
    <div className="de-page" style={{ maxWidth: 1000 }}>
      <VStack gap={2}>
        {/* Identity header — subject-accented top edge, avatar + name. */}
        <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
          <div className="de-profile-identity" style={{ borderTop: '4px solid var(--brand-accent)', borderRadius: 'var(--radius-container)', width: '100%', position: 'relative', overflow: 'hidden' }}>
            <Card variant="default" padding={4} width="100%">
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
                  <Heading level={1} maxLines={1}>
                    {flair ? `${flair} ` : ''}{user.name}
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
                  <SwimmingFin size={24} />
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
          <Banner
            status="info"
            title={t('profile.noQuizzes')}
            endContent={
              <Button variant="ghost" size="sm" label={t('profile.firstQuizCta')} onClick={() => navigate('/quiz')} />
            }
          />
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
                <SectionLabel>{t('profile.streaks')}</SectionLabel>

                <Grid columns={2} gap={2}>
                  <div style={{ display: 'flex', width: '100%' }}>
                    <Card variant="orange" padding={3} width="100%">
                      <VStack gap={0.5} align="center">
                        <span aria-hidden style={{ color: '#f97316', display: 'inline-flex' }}><FlameIcon size={24} /></span>
                        <Text size="4xl" weight="bold">{stats?.current_streak || 0}</Text>
                        <Text type="supporting" color="secondary" justify="center">
                          {t('profile.currentStreak')}
                        </Text>
                        <MetaPill color="#f97316">{t('profile.days')}</MetaPill>
                      </VStack>
                    </Card>
                  </div>

                  <div style={{ display: 'flex', width: '100%' }}>
                    <Card variant="cyan" padding={3} width="100%">
                      <VStack gap={0.5} align="center">
                        <span aria-hidden style={{ color: '#0ea5e9', display: 'inline-flex' }}><BoltIcon size={24} /></span>
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
                <SectionLabel>{t('profile.statistics')}</SectionLabel>

                <Grid columns={{ minWidth: 130, max: 2 }} gap={1.5}>
                  <StatTile label={t('profile.quizzesCompleted')} value={totalQuizzes} variant="blue" />
                  <StatTile label={t('profile.questionsAnswered')} value={totalQuestions} variant="purple" />
                  <StatTile label={t('profile.correctAnswers')} value={totalCorrect} variant="green" />
                  <StatTile
                    label={t('profile.averageScore')}
                    value={`${averageScore}%`}
                    variant={averageScore >= 70 ? 'green' : 'gray'}
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
                  <SectionLabel>{t('profile.bookmarks', { count: bookmarkedQuestions.length })}</SectionLabel>
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

            <AccountDeletionCard />
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
  const [syncWarning, setSyncWarning] = useState(false);

  // These independent subject-scoped reads can run together. Keep the current
  // local snapshot useful if either service is temporarily unavailable.
  useEffect(() => {
    let active = true;
    Promise.all([syncProgressWithServer(), syncXpWithServer()])
      .then(() => { if (active) setSyncWarning(false); })
      .catch(() => { if (active) setSyncWarning(true); });
    return () => { active = false; };
  }, []);

  const [track] = useTrack();
  // XP and rank are per subject: only the active subject's roadmap progress
  // and quest accumulator count here.
  const subject = useActiveSubject();
  const learningXp = computeLearningXp(progress, topicSetForSubject(subject.id));
  const totalXp = learningXp + questXp;
  const info = levelForXp(totalXp);
  // Subject-aware rank label ("Junior Full-Stack Developer" for Web Dev,
  // "Junior Explorer" for Geography, "Club Player" for Chess, …), localized.
  const rankKeys = rankLabelKeyFor(info.rank, track);
  const title = t(rankKeys.key, rankKeys.vars);
  const nextKeys = info.next ? rankLabelKeyFor(info.next, track) : null;
  const nextTitle = nextKeys ? t(nextKeys.key, nextKeys.vars) : null;
  const nf = (n: number) => n.toLocaleString();
  const nextLabel = info.isMax
    ? t('profile.maxRank')
    : t('profile.xpToNext', { xp: nf(info.xpToNext), title: nextTitle ?? '' });

  return (
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <SectionLabel>{t('profile.career')}</SectionLabel>
        {syncWarning && <Banner status="warning" title={t('profile.syncUnavailable')} />}

        <HStack gap={2} align="center">
          {/* The learner's earned rank icon (data, not chrome) in a quiet tile. */}
          <div
            aria-hidden
            className="ss-tile"
            style={{
              width: 52,
              height: 52,
              fontSize: '1.75rem',
              background: 'var(--brand-accent-soft, rgba(0,0,0,0.05))',
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand-accent) 35%, transparent)',
            }}
          >
            <TrophyIcon size={25} />
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
  const subject = useActiveSubject();
  const [track, setTrack] = useTrack();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const extraSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);
  const [snack, setSnack] = useState<string | null>(null);

  const sections = trackStarterTopics(track);

  const applyTrack = (next: string | null) => {
    // Clicking the already-selected track re-applies (re-unlocks) it rather than
    // deselecting, so the starting sections are always ensured.
    const target = (next as Track) || track;
    if (target !== track) setTrack(target);
    unlockExtraTopics(trackStarterTopics(target));
    // Best-effort: persist the new unlocks to the account.
    pushProgressToServer().catch(() => {});
    setSnack(t('profile.trackSet', { label: t(trackLabelKey(subject.id, target)) }));
  };

  return (
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <VStack gap={0.5}>
          <SectionLabel>{t('profile.trackTitle')}</SectionLabel>
          <Text type="supporting" color="secondary">{t('profile.trackHelp')}</Text>
        </VStack>

        <ToggleButtonGroup
          label={t('profile.trackTitle')}
          type="single"
          value={track}
          onChange={applyTrack}
        >
          {TRACK_ORDER.map((tk) => (
            <ToggleButton key={tk} value={tk} label={t(trackLabelKey(subject.id, tk))} />
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
                <button
                  key={topic}
                  type="button"
                  onClick={() => navigate(`/learn?topic=${topic}`)}
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    lineHeight: 1.4,
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: `1px solid ${color}`,
                    backgroundColor: unlocked ? color : 'transparent',
                    color: unlocked ? onCategoryColorText(topic) : 'var(--color-text-secondary)',
                  }}
                >
                  {t(categoryLabelKey(topic))}
                </button>
              );
            })}
          </div>
        </VStack>

        <HStack>
          <Button variant="secondary" size="sm" label={t('profile.trackGoLearn')} onClick={() => navigate('/learn')} />
        </HStack>
      </VStack>

      <AppToast
        open={!!snack}
        onClose={() => setSnack(null)}
        severity="info"
        message={snack ?? ''}
        autoHideDuration={3000}
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
        opacity: earned ? 1 : 0.55,
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
          <SectionLabel>{t('profile.achievements', { earned: earnedCount, total: achievements.length })}</SectionLabel>
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

  const handleLang = (next: string | null) => {
    if (!next || next === lang) return;
    setLang(next as Lang);
    void savePreferredLanguage(next as Lang);
  };

  return (
    <Lift>
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <SectionLabel>{t('profile.preferences')}</SectionLabel>
        <HStack justify="between" align="center" gap={2} wrap="wrap">
          <VStack gap={0}>
            <Text weight="semibold">{t('profile.language')}</Text>
            <Text type="supporting" size="xsm" color="secondary">{t('profile.languageHelp')}</Text>
          </VStack>
          <ToggleButtonGroup
            label={t('profile.language')}
            type="single"
            size="sm"
            value={lang}
            onChange={handleLang}
          >
            <ToggleButton value="en" label="EN" />
            <ToggleButton value="cs" label="CS" />
          </ToggleButtonGroup>
        </HStack>
      </VStack>
    </Card>
    </Lift>
  );
}

function clearDeletedAccountState() {
  const clear = (storage: Storage) => {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
      (key): key is string => Boolean(key),
    );
    for (const key of keys) {
      if (key.startsWith('devquiz:') || key.startsWith('studyshark:') || key.startsWith('shark:')) {
        storage.removeItem(key);
      }
    }
  };
  try { clear(localStorage); } catch { /* storage may be disabled */ }
  try { clear(sessionStorage); } catch { /* storage may be disabled */ }
}

function AccountDeletionCard() {
  const t = useT();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestDeletion = () => {
    setConfirm({
      title: t('profile.deleteTitle'),
      description: t('profile.deleteConfirm'),
      actionLabel: t('profile.deleteAction'),
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch<{ ok: true }>('/api/user/delete-account', {
            method: 'DELETE',
            body: JSON.stringify({ confirmation: 'DELETE' }),
            timeoutMs: 20_000,
          });
          clearDeletedAccountState();
          await signOut().catch(() => undefined);
          navigate('/', { replace: true });
        } catch (error) {
          setMessage(friendlyError(error));
        }
      },
    });
  };

  return (
    <>
      <Lift>
        <Card variant="muted" padding={3} width="100%">
          <VStack gap={1.5}>
            <SectionLabel>{t('profile.account')}</SectionLabel>
            <Text weight="semibold">{t('profile.deleteTitle')}</Text>
            <Text type="supporting" size="xsm" color="secondary">{t('profile.deleteDescription')}</Text>
            <HStack justify="end">
              <Button variant="destructive" size="sm" label={t('profile.deleteAction')} onClick={requestDeletion} />
            </HStack>
          </VStack>
        </Card>
      </Lift>
      <BrandedConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      <AppToast open={!!message} message={message} onClose={() => setMessage(null)} severity="error" autoHideDuration={null} />
    </>
  );
}

const StatTile = ({ label, value, variant }: { label: string; value: number | string; variant: CardVariant }) => (
  <div style={{ display: 'flex', width: '100%' }}>
    <Card variant={variant} padding={3} width="100%">
      <VStack gap={0.5}>
        <Text size="4xl" weight="bold">{value}</Text>
        <Text type="supporting" size="xsm" color="secondary">{label}</Text>
      </VStack>
    </Card>
  </div>
);

export default Profile;
