import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { readPerfectQuizCount } from '../lib/achievements';
import { getFreezes, setOffDays, sanitizeOffDays, type FreezeState } from '../lib/streakFreezes';
import { syncBadges, mergeBadges, type BadgeView } from '../lib/badges';
import { getAdvice, advisorCategoryKey, advisorFocusKey, type Advice } from '../lib/advisor';
import { getCollection, subjectCardCount } from '../lib/cards';
import { renderQuestion } from './CodeBlock';
import { useT, useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import { SIBLING_PLATFORMS_URL, useActiveSubject, topicSetForSubject } from '../lib/subjects';
import { CURRENT_PRODUCT } from '../lib/products';
import { savePreferredLanguage } from '../lib/languagePref';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';
import { SwimmingFin } from './SharkFin';
import { FlameIcon, BoltIcon, TrophyIcon, CardsIcon, TargetIcon } from './ui/icons';
import { BrandedConfirmDialog, type ConfirmRequest } from './ui/BrandedConfirmDialog';
import { GithubGardenCard } from './coding/GithubGardenCard';
import './DeepEndScreens.css';

// Astryx Card colour variants used for the tinted stat / streak tiles.
type CardVariant = 'default' | 'muted' | 'blue' | 'cyan' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';

// Section opener in the brand's editorial voice: uppercase accent kicker with
// the waterline tick beneath (the "dive marker" that starts every section).
function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="ss-kicker">{children}</h2>;
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
    if (!authLoading && !isAuthenticated) navigate('/', { replace: true });
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
      <div role="status" style={{ textAlign: 'center', marginTop: '3rem' }}>
        <Text type="supporting" color="secondary">
          {t('profile.redirecting')}
        </Text>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="de-page" style={{ maxWidth: 1000 }}>
        <VStack gap={2}>
          <Heading level={1}>{t('nav.profile')}</Heading>
          <StreakCard stats={null} unavailable />
          <ErrorRetry message={error} onRetry={() => statsQuery.refetch()} />
        </VStack>
      </div>
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
      user={profile}
      stats={stats}
      totalQuizzes={totalQuizzes}
      totalCorrect={totalCorrect}
      totalQuestions={totalQuestions}
      averageScore={averageScore}
      isFirstTime={isFirstTime}
      navigate={navigate}
      statsWarning={error}
      onRetryStats={() => statsQuery.refetch()}
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
  statsWarning: string | null;
  onRetryStats: () => void;
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
  statsWarning,
  onRetryStats,
}: ProfileBodyProps) {
  const t = useT();
  const ringColor = useEquippedRingColor();
  const flair = useEquippedFlair();
  const { questions: bookmarkedQuestions } = useBookmarks();
  const currentStreak = currentStreakForDisplay(stats);

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
                  <span className="ss-kicker">{t('nav.profile')}</span>
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

        {statsWarning && (
          <Banner
            status="warning"
            title={t('profile.statsRefreshFailed')}
            description={statsWarning}
            endContent={<Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={onRetryStats} />}
          />
        )}

        {/* Keep the streak in the first scan path for both products, including
            a useful zero state. It must not be buried below track/stat cards. */}
        <StreakCard stats={stats} />

        <ConsistencyTip
          title={t(currentStreak > 0 ? 'profile.streakActiveTipTitle' : 'profile.streakStartTipTitle')}
          body={t(currentStreak > 0 ? 'profile.streakActiveTipBody' : 'profile.streakStartTipBody')}
          actionLabel={isFirstTime ? t('profile.streakAction') : undefined}
          onAction={isFirstTime ? () => navigate('/quiz') : undefined}
        />

        {/* Streak protection sits directly beneath the streak so the two read as
            one story: here is your streak, here is how a missed day is bridged.
            Freezes are free and never a shop item. */}
        <StreakFreezeCard />

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

        {/* On desktop the cards split into two columns so the profile lands close
            to one viewport instead of one long scroll. On mobile they stack. */}
        <Grid columns={{ minWidth: 360, max: 2 }} gap={2} align="start" width="100%">
          <VStack gap={2}>
            <CareerCard />

            <LearningTrackCard />

            <AdvisorCard />

            <SharkCardsEntry />
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

            <ConsistencyTip
              title={t('profile.reviewTipTitle')}
              body={t('profile.reviewTipBody')}
            />

            <BadgesCard bookmarkCount={bookmarkedQuestions.length} />

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

            {CURRENT_PRODUCT.id === 'devshark' && <GithubGardenCard />}

            <AccountDeletionCard />
          </VStack>
        </Grid>

        {/* The standalone developer product keeps its compact return action.
            StudyShark's profile is an overview, so it no longer ends with a
            contextless "Back to quiz" button. First-time guidance already has
            a clear quiz action beside the always-visible streak. */}
        {CURRENT_PRODUCT.id === 'devshark' && !isFirstTime && <HStack justify="center">
          <Button
            variant="ghost"
            size="sm"
            label={t('profile.backToQuiz')}
            onClick={() => navigate('/quiz')}
          />
        </HStack>}
      </VStack>
    </div>
  );
}

function currentStreakForDisplay(stats: UserStats | null, now = new Date()): number {
  if (!stats?.last_quiz_date || stats.current_streak <= 0) return 0;
  const lastQuiz = new Date(stats.last_quiz_date);
  if (Number.isNaN(lastQuiz.getTime())) return 0;

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const lastQuizUtc = Date.UTC(
    lastQuiz.getUTCFullYear(),
    lastQuiz.getUTCMonth(),
    lastQuiz.getUTCDate(),
  );
  const daysSinceQuiz = Math.floor((todayUtc - lastQuizUtc) / 86_400_000);
  return daysSinceQuiz === 0 || daysSinceQuiz === 1 ? stats.current_streak : 0;
}

function StreakCard({ stats, unavailable = false }: { stats: UserStats | null; unavailable?: boolean }) {
  const { t, lang } = useLanguage();
  const currentLabelId = useId();
  const longestLabelId = useId();
  const currentStreak = currentStreakForDisplay(stats);
  const longestStreak = stats?.longest_streak ?? 0;
  const currentStreakDisplay = unavailable ? '—' : currentStreak;
  const longestStreakDisplay = unavailable ? '—' : longestStreak;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en', { dateStyle: 'medium', timeZone: 'UTC' }),
    [lang],
  );
  const dayUnit = (value: number) => {
    if (lang === 'en') return t(value === 1 ? 'profile.day' : 'profile.days');
    if (value === 1) return t('profile.day');
    if (value >= 2 && value <= 4) return t('profile.daysFew');
    return t('profile.days');
  };

  return (
    <Lift>
      <Card variant="default" padding={3} width="100%">
        <VStack gap={2}>
          <SectionLabel>{t('profile.streaks')}</SectionLabel>

          <Grid columns={{ minWidth: 150, max: 2 }} gap={2}>
            <div role="group" aria-labelledby={currentLabelId} style={{ display: 'flex', width: '100%' }}>
              <Card variant="orange" padding={3} width="100%">
                <VStack gap={0.5} align="center">
                  <span aria-hidden style={{ color: 'var(--ss-warning)', display: 'inline-flex' }}><FlameIcon size={24} /></span>
                  <Text
                    size="4xl"
                    weight="bold"
                    aria-label={unavailable ? t('profile.streakValueUnavailable') : undefined}
                  >
                    {currentStreakDisplay}
                  </Text>
                  <Text id={currentLabelId} type="supporting" color="primary" weight="semibold" justify="center">
                    {t('profile.currentStreak')}
                  </Text>
                  {!unavailable && <MetaPill color="var(--ss-warning)">{dayUnit(currentStreak)}</MetaPill>}
                </VStack>
              </Card>
            </div>

            <div role="group" aria-labelledby={longestLabelId} style={{ display: 'flex', width: '100%' }}>
              <Card variant="cyan" padding={3} width="100%">
                <VStack gap={0.5} align="center">
                  <span aria-hidden style={{ color: 'var(--ss-info)', display: 'inline-flex' }}><BoltIcon size={24} /></span>
                  <Text
                    size="4xl"
                    weight="bold"
                    color="accent"
                    aria-label={unavailable ? t('profile.streakValueUnavailable') : undefined}
                  >
                    {longestStreakDisplay}
                  </Text>
                  <Text id={longestLabelId} type="supporting" color="primary" weight="semibold" justify="center">
                    {t('profile.longestStreak')}
                  </Text>
                  {!unavailable && <MetaPill color="var(--ss-info)">{dayUnit(longestStreak)}</MetaPill>}
                </VStack>
              </Card>
            </div>
          </Grid>

          {stats?.last_quiz_date && (
            <Text type="supporting" size="xsm" color="secondary" justify="center">
              {t('profile.lastQuiz', { date: dateFormatter.format(new Date(stats.last_quiz_date)) })}
            </Text>
          )}
          {unavailable && (
            <Text type="supporting" size="xsm" color="secondary" justify="center">
              {t('profile.streakUnavailable')}
            </Text>
          )}
        </VStack>
      </Card>
    </Lift>
  );
}

interface ConsistencyTipProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

function ConsistencyTip({ title, body, actionLabel, onAction }: ConsistencyTipProps) {
  const t = useT();
  const titleId = useId();

  return (
    <aside className="de-profile-guidance" aria-labelledby={titleId}>
      <VStack gap={0.5} width="100%">
        <span className="de-profile-guidance__label">{t('profile.consistencyTip')}</span>
        <h2 id={titleId} className="de-profile-guidance__title">{title}</h2>
        <Text type="supporting" size="xsm" color="secondary">{body}</Text>
      </VStack>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" label={actionLabel} onClick={onAction} />
      )}
    </aside>
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
            <Heading level={3} maxLines={1}>{title}</Heading>
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
                    minHeight: 44,
                    padding: '8px 12px',
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

// ─────────────────────────── Streak freezes ───────────────────────────
// Forgiving-streak controls: the monthly freeze budget that bridges a missed
// school day, plus the learner's configurable off-days. Freezes are free and
// never a shop item; off-days are the only user-writable field. Reads degrade to
// a safe empty state (streakFreezes.getFreezes never throws); saving off-days is
// an explicit action with saving / saved / error feedback.

const dayShortKey = (d: number): TranslationKey => `freezes.day.${d}` as TranslationKey;
const dayFullKey = (d: number): TranslationKey => `freezes.dayFull.${d}` as TranslationKey;
// Render the week Monday-first (Czech + most EU locales); values stay 0=Sun..6=Sat.
const OFF_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Shield-with-check: "your streak is protected". A single decorative one-off in
// the app's inline-SVG idiom (no new icon family).
function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function StreakFreezeCard() {
  const t = useT();
  const [state, setState] = useState<FreezeState | null>(null);
  const [draft, setDraft] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let active = true;
    getFreezes().then((s) => {
      if (!active) return;
      setState(s);
      setDraft(s.offDays);
    });
    return () => { active = false; };
  }, []);

  const toggleDay = (d: number) => {
    setDraft((prev) => sanitizeOffDays(prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const dirty = useMemo(() => {
    if (!state) return false;
    const a = sanitizeOffDays(draft);
    const b = sanitizeOffDays(state.offDays);
    return a.length !== b.length || a.some((v, i) => v !== b[i]);
  }, [draft, state]);

  const save = async () => {
    setSaving(true);
    try {
      const next = await setOffDays(draft);
      setState(next);
      setDraft(next.offDays);
      setToast({ message: t('freezes.saved'), severity: 'success' });
    } catch {
      // setOffDays throws on failure so the save handler can surface it; the
      // draft is kept so the learner can simply retry.
      setToast({ message: t('freezes.saveError'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Lift>
      <Card variant="default" padding={3} width="100%">
        <VStack gap={2}>
          <VStack gap={0.5}>
            <SectionLabel>{t('freezes.title')}</SectionLabel>
            <Text type="supporting" color="secondary">{t('freezes.subtitle')}</Text>
          </VStack>

          {!state ? (
            <div role="status" aria-live="polite" style={{ padding: '6px 0' }}>
              <Text type="supporting" size="xsm" color="secondary">{t('freezes.loading')}</Text>
            </div>
          ) : (
            <>
              <HStack gap={1.5} align="center">
                <div aria-hidden className="ss-tile" style={{ width: 44, height: 44, color: 'var(--brand-accent)', background: 'var(--brand-accent-soft)' }}>
                  <ShieldIcon />
                </div>
                <VStack gap={0}>
                  <Text weight="bold">
                    {state.remaining > 0 ? t('freezes.remaining', { n: state.remaining }) : t('freezes.none')}
                  </Text>
                  <Text type="supporting" size="xsm" color="secondary">
                    {state.remaining > 0 ? t('freezes.explainer') : t('freezes.noneHint')}
                  </Text>
                  {state.used.length > 0 && (
                    <Text type="supporting" size="xsm" color="secondary">{t('freezes.used', { n: state.used.length })}</Text>
                  )}
                </VStack>
              </HStack>

              {/* Protected behaviour: freezes are part of learning, never a
                  purchasable item. Say so plainly. */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-element)', background: 'var(--color-background-muted)', padding: '10px 12px' }}>
                <Text weight="semibold" size="sm">{t('freezes.notShopTitle')}</Text>
                <Text type="supporting" size="xsm" color="secondary" display="block">{t('freezes.notShopBody')}</Text>
              </div>

              <VStack gap={1}>
                <VStack gap={0.5}>
                  <Text weight="semibold">{t('freezes.offDaysTitle')}</Text>
                  <Text type="supporting" size="xsm" color="secondary">{t('freezes.offDaysHint')}</Text>
                </VStack>
                <div role="group" aria-label={t('freezes.offDaysTitle')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {OFF_DAY_ORDER.map((d) => {
                    const sel = draft.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={sel}
                        aria-label={t(dayFullKey(d))}
                        onClick={() => toggleDay(d)}
                        style={{
                          cursor: 'pointer',
                          minWidth: 46,
                          minHeight: 44,
                          padding: '0 12px',
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          border: `1px solid ${sel ? 'var(--brand-accent)' : 'var(--color-border-strong)'}`,
                          background: sel ? 'var(--brand-accent-soft)' : 'transparent',
                          color: sel ? 'var(--brand-accent)' : 'var(--color-text-secondary)',
                          display: 'inline-grid',
                          placeItems: 'center',
                        }}
                      >
                        <span aria-hidden>{t(dayShortKey(d))}</span>
                      </button>
                    );
                  })}
                </div>
                <Text type="supporting" size="xsm" color="secondary">{t('freezes.weekendHint')}</Text>
                <HStack justify="end">
                  <Button
                    variant="secondary"
                    size="sm"
                    label={saving ? t('freezes.saving') : t('freezes.saveOffDays')}
                    isDisabled={saving || !dirty}
                    onClick={save}
                  />
                </HStack>
              </VStack>
            </>
          )}
        </VStack>

        <AppToast
          open={!!toast}
          onClose={() => setToast(null)}
          severity={toast?.severity ?? 'info'}
          message={toast?.message ?? ''}
          autoHideDuration={toast?.severity === 'error' ? null : 3000}
        />
      </Card>
    </Lift>
  );
}

// ───────────────────────────── Badges ─────────────────────────────
// Server-synced achievements. The server owns eligibility (recomputed from
// verified stats + mastery) and a stable earned date; the client only decorates
// it and layers the two display-only client signals (perfect quiz, bookmarker).
// If the endpoint is unavailable, the earned set is empty and every badge simply
// renders as a locked goal (the client-only signals still evaluate locally).

// Badge-tier metals — genuinely art-directed, not a subject palette, so they
// stay local. Chosen for legible white glyph contrast on the earned medallion.
const TIER_ACCENT: Record<BadgeView['tier'], string> = {
  bronze: '#a16207',
  silver: '#64748b',
  gold: '#c77f00',
};
const tierLabelKey = (tier: BadgeView['tier']): TranslationKey =>
  tier === 'gold' ? 'badges.tierGold' : tier === 'silver' ? 'badges.tierSilver' : 'badges.tierBronze';

function BadgeMedal({ badge, dateFormatter }: { badge: BadgeView; dateFormatter: Intl.DateTimeFormat }) {
  const t = useT();
  const { earned, glyph, tier, earnedAt } = badge;
  const accent = TIER_ACCENT[tier];
  const status = earned
    ? earnedAt
      ? t('badges.earnedOn', { date: dateFormatter.format(new Date(earnedAt)) })
      : t('badges.earned')
    : t('badges.goal');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        border: '1px solid',
        borderColor: earned ? `${accent}66` : 'var(--color-border)',
        borderRadius: 12,
        background: earned ? `${accent}14` : 'transparent',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.35rem',
            lineHeight: 1,
            background: earned ? accent : 'var(--color-background-muted)',
            color: earned ? '#fff' : 'var(--color-text-disabled)',
            boxShadow: earned ? `0 2px 8px ${accent}59` : 'inset 0 0 0 1px var(--color-border)',
          }}
        >
          {glyph}
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
              background: 'var(--brand-accent)',
              border: '2px solid var(--color-background-surface)',
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
        <HStack gap={0.5} align="center" wrap="wrap">
          <Text weight="bold" color="primary">{t(badge.labelKey)}</Text>
          <MetaPill color={earned ? accent : 'var(--color-text-secondary)'}>{t(tierLabelKey(tier))}</MetaPill>
        </HStack>
        <Text type="supporting" size="xsm" color="secondary" display="block">{t(badge.descKey)}</Text>
        <Text type="supporting" size="xsm" color={earned ? 'accent' : 'secondary'} weight="semibold" display="block">{status}</Text>
      </div>
    </div>
  );
}

function BadgesCard({ bookmarkCount }: { bookmarkCount: number }) {
  const { t, lang } = useLanguage();
  const subject = useActiveSubject();
  const [badges, setBadges] = useState<BadgeView[] | null>(null);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en', { dateStyle: 'medium' }),
    [lang],
  );

  useEffect(() => {
    let active = true;
    setBadges(null);
    // syncBadges never throws; a 503/offline resolves to an empty earned set so
    // every server badge renders as a locked goal and the client-only signals
    // still evaluate.
    syncBadges(subject.id).then((res) => {
      if (!active) return;
      setBadges(mergeBadges(res.earned, { perfectQuizzes: readPerfectQuizCount(), bookmarkCount }));
    });
    return () => { active = false; };
  }, [subject.id, bookmarkCount]);

  const earnedCount = badges ? badges.filter((b) => b.earned).length : 0;
  const total = badges?.length ?? 0;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <Lift>
      <Card variant="default" padding={3} width="100%">
        <VStack gap={2}>
          <HStack align="center" justify="between" gap={1} wrap="wrap">
            <SectionLabel>{t('badges.title')}</SectionLabel>
            {badges && (
              <Badge
                variant={total > 0 && earnedCount === total ? 'success' : 'neutral'}
                label={t('badges.count', { earned: earnedCount, total })}
              />
            )}
          </HStack>

          {!badges ? (
            <div role="status" aria-live="polite" style={{ padding: '6px 0' }}>
              <Text type="supporting" size="xsm" color="secondary">{t('badges.loading')}</Text>
            </div>
          ) : (
            <>
              <ProgressBar label={t('badges.count', { earned: earnedCount, total })} value={pct} isLabelHidden />
              {earnedCount === 0 && (
                <Text type="supporting" size="xsm" color="secondary">{t('badges.empty')}</Text>
              )}
              <ul className="de-achievement-list">
                {badges.map((b) => (
                  <li key={b.id}>
                    <BadgeMedal badge={b} dateFormatter={dateFormatter} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </VStack>
      </Card>
    </Lift>
  );
}

// ───────────────────────────── Advisor ─────────────────────────────
// Read-only "where to focus" panel built from the learner's own verified
// per-category accuracy. It never diagnoses and offers no actions — just the
// weakest areas and a gentle suggested week from the server's deterministic S5.
function AdvisorCard() {
  const { t, lang } = useLanguage();
  const subject = useActiveSubject();
  const [advice, setAdvice] = useState<Advice | null>(null);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en', { dateStyle: 'medium' }),
    [lang],
  );

  useEffect(() => {
    let active = true;
    setAdvice(null);
    getAdvice(subject.id).then((a) => { if (active) setAdvice(a); });
    return () => { active = false; };
  }, [subject.id]);

  const hasData = !!advice && (advice.weakAreas.length > 0 || advice.suggestedWeek.length > 0);

  return (
    <Lift>
      <Card variant="default" padding={3} width="100%">
        <VStack gap={2}>
          <HStack gap={1.5} align="center">
            <div aria-hidden className="ss-tile" style={{ width: 40, height: 40, color: 'var(--brand-accent)', background: 'var(--brand-accent-soft)' }}>
              <TargetIcon size={20} />
            </div>
            <VStack gap={0}>
              <SectionLabel>{t('advisor.title')}</SectionLabel>
              <Text type="supporting" size="xsm" color="secondary">{t('advisor.subtitle')}</Text>
            </VStack>
          </HStack>

          {!advice ? (
            <div role="status" aria-live="polite" style={{ padding: '6px 0' }}>
              <Text type="supporting" size="xsm" color="secondary">{t('advisor.loading')}</Text>
            </div>
          ) : !hasData ? (
            <div style={{ padding: '2px 0' }}>
              <Text weight="semibold">{t('advisor.empty')}</Text>
              <Text type="supporting" size="xsm" color="secondary" display="block">{t('advisor.emptyBody')}</Text>
            </div>
          ) : (
            <>
              <VStack gap={1}>
                <Text weight="semibold">{t('advisor.weakest')}</Text>
                {advice.weakAreas.length === 0 ? (
                  <Text type="supporting" size="xsm" color="secondary">{t('advisor.allStrong')}</Text>
                ) : (
                  <VStack gap={1}>
                    {advice.weakAreas.map((w) => (
                      <div key={w.category}>
                        <HStack justify="between" align="center" gap={1} wrap="wrap">
                          <Text weight="semibold" size="sm">{t(advisorCategoryKey(w.category))}</Text>
                          <Text type="supporting" size="xsm" color="secondary">
                            {t('advisor.accuracy', { pct: w.accuracyPct })} · {t('advisor.answered', { n: w.answered })}
                          </Text>
                        </HStack>
                        <div aria-hidden style={{ marginTop: 4, height: 6, borderRadius: 999, background: 'var(--color-background-muted)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(0, Math.min(100, w.accuracyPct))}%`, height: '100%', background: 'var(--brand-accent)', borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </VStack>
                )}
              </VStack>

              {advice.suggestedWeek.length > 0 && (
                <VStack gap={1}>
                  <VStack gap={0.5}>
                    <Text weight="semibold">{t('advisor.suggestedWeek')}</Text>
                    <Text type="supporting" size="xsm" color="secondary">{t('advisor.suggestedWeekHint')}</Text>
                  </VStack>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {advice.suggestedWeek.map((d) => (
                      <li
                        key={d.day}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-element)', background: 'var(--color-background-muted)' }}
                      >
                        <MetaPill color="var(--color-text-secondary)">{t('advisor.day', { n: d.day })}</MetaPill>
                        <Text weight="semibold" size="sm">{t(advisorCategoryKey(d.category))}</Text>
                        <span style={{ marginLeft: 'auto' }}>
                          <MetaPill>{t(advisorFocusKey(d.focus))}</MetaPill>
                        </span>
                      </li>
                    ))}
                  </ol>
                </VStack>
              )}

              <Text type="supporting" size="xsm" color="secondary">{t('advisor.disclaimer')}</Text>
              {advice.generatedAt && (
                <Text type="supporting" size="xsm" color="secondary">
                  {t('advisor.generatedAt', { date: dateFormatter.format(new Date(advice.generatedAt)) })}
                </Text>
              )}
            </>
          )}
        </VStack>
      </Card>
    </Lift>
  );
}

// ─────────────────────── Shark Cards entry point ───────────────────────
// A quiet teaser into the cosmetic album (route /collection): how much of this
// subject's album is collected, with a "pack ready" flag when today's plan is
// done. Cards never affect access, XP, scores, streaks, ranks, or AI.
function SharkCardsEntry() {
  const t = useT();
  const subject = useActiveSubject();
  const [state, setState] = useState<{ owned: number; total: number; packAvailable: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    getCollection(subject.id).then((res) => {
      if (!active) return;
      setState({ owned: res.cards.length, total: res.total, packAvailable: res.packAvailable });
    });
    return () => { active = false; };
  }, [subject.id]);

  const total = state?.total ?? subjectCardCount(subject.id);
  const owned = state?.owned ?? 0;

  return (
    <Link
      to="/collection"
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%', borderRadius: 'var(--radius-container)' }}
    >
      <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
        <Card variant="default" padding={3} width="100%">
          <HStack gap={1.5} align="center" justify="between">
            <HStack gap={1.5} align="center">
              <div aria-hidden className="ss-tile" style={{ width: 44, height: 44, color: 'var(--brand-accent)', background: 'var(--brand-accent-soft)' }}>
                <CardsIcon size={22} />
              </div>
              <VStack gap={0}>
                <Text weight="bold">{t('cards.title')}</Text>
                <Text type="supporting" size="xsm" color="secondary">
                  {state ? t('cards.count', { owned, total }) : t('cards.loading')}
                </Text>
                {state?.packAvailable && (
                  <span style={{ marginTop: 4 }}>
                    <Badge variant="success" label={t('cards.packReady')} />
                  </span>
                )}
              </VStack>
            </HStack>
            <span aria-hidden style={{ color: 'var(--brand-accent)', fontWeight: 800, fontSize: '1.25rem', flexShrink: 0 }}>→</span>
          </HStack>
        </Card>
      </div>
    </Link>
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
        <Text type="supporting" size="xsm" color="primary" weight="semibold">{label}</Text>
      </VStack>
    </Card>
  </div>
);

export default Profile;
