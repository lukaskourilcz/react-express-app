import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Kicker } from './landing/LandingKit';
import { useNavigate } from 'react-router-dom';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
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
import LearningPathsCard from './paths/LearningPathsCard';
import { getCategoryHexColor, categoryLabelKey, onCategoryColorText } from '../lib/categories';
import { useQuestXp, syncXpWithServer } from '../lib/xp';
import { computeLearningXp, levelForXp, MAX_RANK } from '../lib/leveling';
import { useAuth, getUserProfile } from '../lib/auth';
import { apiFetch, friendlyError } from '../lib/api';
import { useBookmarks, removeBookmark } from '../lib/bookmarks';
import { getStreakProtection, activateShield, shieldRemaining, type StreakProtection } from '../lib/streakFreezes';
import { getAdvice, advisorCategoryKey, type Advice } from '../lib/advisor';
import { renderQuestion } from './CodeBlock';
import { useT, useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import { SIBLING_PLATFORMS_URL, useActiveSubject, topicSetForSubject } from '../lib/subjects';
import { CURRENT_PRODUCT } from '../lib/products';
import { savePreferredLanguage } from '../lib/languagePref';
import { useColorMode } from '../theme/ColorModeContext';
import { useSettings } from '../lib/settings';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';
import { SwimmingFin } from './SharkFin';
import { FlameIcon, BoltIcon, TrophyIcon, TargetIcon, SunIcon, MoonIcon, SoundOnIcon, SoundOffIcon } from './ui/icons';
import { BrandedConfirmDialog, type ConfirmRequest } from './ui/BrandedConfirmDialog';
import { GithubGardenCard } from './coding/GithubGardenCard';
import './DeepEndScreens.css';

// Astryx Card colour variants used for the tinted stat / streak tiles.
type CardVariant = 'default' | 'muted' | 'blue' | 'cyan' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';

// Section opener in the brand's editorial voice: uppercase accent kicker with
// the waterline tick beneath (the "dive marker" that starts every section).
function SectionLabel({ children }: { children: ReactNode }) {
  return <Kicker as="h2">{children}</Kicker>;
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

// Language, appearance and sound ride along in the identity banner. They are
// the only account-wide switches on this screen and the banner had the room, so
// they need no card, headings or help text of their own: each button states the
// action it performs as its accessible name and its tooltip, and shows the state
// it switches to (CS while reading English, the moon while in light mode).
function IdentitySettings() {
  const { t, lang, setLang } = useLanguage();
  const { mode, toggle } = useColorMode();
  const [settings, updateSettings] = useSettings();

  const nextLang: Lang = lang === 'en' ? 'cs' : 'en';
  const langLabel = t(lang === 'en' ? 'lang.switchToCzech' : 'lang.switchToEnglish');
  const modeLabel = t(mode === 'light' ? 'common.darkMode' : 'common.lightMode');
  const soundLabel = t(settings.soundEffects ? 'common.soundOff' : 'common.soundOn');

  return (
    <div className="de-identity-settings" role="group" aria-label={t('profile.preferences')}>
      <button
        type="button"
        className="de-identity-settings__button"
        onClick={() => { setLang(nextLang); void savePreferredLanguage(nextLang); }}
        aria-label={langLabel}
        title={langLabel}
      >
        <span aria-hidden="true">{nextLang.toUpperCase()}</span>
      </button>
      <button
        type="button"
        className="de-identity-settings__button"
        onClick={toggle}
        aria-label={modeLabel}
        title={modeLabel}
      >
        {mode === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
      </button>
      <button
        type="button"
        className="de-identity-settings__button"
        onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
        aria-label={soundLabel}
        title={soundLabel}
      >
        {settings.soundEffects ? <SoundOffIcon size={18} /> : <SoundOnIcon size={18} />}
      </button>
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
  return (
    <ProfileBody
      user={profile}
      stats={stats}
      totalQuizzes={totalQuizzes}
      totalCorrect={totalCorrect}
      totalQuestions={totalQuestions}
      averageScore={averageScore}
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
  statsWarning,
  onRetryStats,
}: ProfileBodyProps) {
  const t = useT();
  const ringColor = useEquippedRingColor();
  const flair = useEquippedFlair();
  const { questions: bookmarkedQuestions } = useBookmarks();
  // Drawn once per mount so a stats refetch or a language switch cannot swap
  // the tip out from under someone mid-sentence.
  const [tipKey] = useState(nextConsistencyTip);

  return (
    <div className="de-page" style={{ maxWidth: 1000 }}>
      <VStack gap={2}>
        {/* Identity header — subject-accented top edge, avatar and name on the
            left, the three account switches on the right. */}
        <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
          <div className="de-profile-identity" style={{ borderTop: '4px solid var(--brand-accent)', borderRadius: 'var(--radius-container)', width: '100%', position: 'relative', overflow: 'hidden' }}>
            <Card variant="default" padding={4} width="100%">
              <div className="de-profile-identity__row">
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
                    <Kicker>{t('nav.profile')}</Kicker>
                    <Heading level={1} maxLines={1}>
                      {flair ? `${flair} ` : ''}{user.name}
                    </Heading>
                    <Text type="supporting" color="secondary" maxLines={1}>
                      {user.email}
                    </Text>
                  </VStack>
                </HStack>
                <IdentitySettings />
              </div>
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
        <StreakCard stats={stats} tipKey={tipKey} />

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
            {CURRENT_PRODUCT.id === 'devshark' && <LearningPathsCard />}

            <AdvisorCard />
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

            {CURRENT_PRODUCT.id === 'devshark' && <GithubGardenCard />}

            <AccountDeletionCard />
          </VStack>
        </Grid>
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

function StreakCard({
  stats,
  tipKey,
  unavailable = false,
}: {
  stats: UserStats | null;
  tipKey?: TranslationKey;
  unavailable?: boolean;
}) {
  const { t, lang } = useLanguage();
  const currentLabelId = useId();
  const longestLabelId = useId();
  const currentStreak = currentStreakForDisplay(stats);
  const longestStreak = stats?.longest_streak ?? 0;
  const currentStreakDisplay = unavailable ? '—' : currentStreak;
  const longestStreakDisplay = unavailable ? '—' : longestStreak;
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
                  {/* Protection lives inside the streak it protects. It used to
                      be a card of its own below, which read as a separate
                      feature rather than as part of this number. */}
                  {!unavailable && <StreakShield />}
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

          {/* One line, in the space the "last quiz" date used to take. The date
              was a fact nobody acts on; this is the same height and says
              something a learner can do next. */}
          {tipKey && !unavailable && (
            <Text type="supporting" size="xsm" color="secondary" justify="center">
              {t(tipKey)}
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

/**
 * The shield: spend one of the month's two protections and the streak survives
 * the next 48 hours.
 *
 * Three states and nothing else. A shield is running (a countdown, in whole
 * hours and minutes, read once on load — a live clock on a two-day window is
 * decoration). A protection is available (the button). The month's two are
 * spent (a line saying when the next arrive). Everything is server-owned: the
 * budget, the spend and the expiry, so a client cannot grant itself either.
 *
 * It renders nothing at all until the read lands, and nothing if the server
 * cannot offer it yet, so the streak card never shows a control that would
 * fail.
 */
function StreakShield() {
  const t = useT();
  const [state, setState] = useState<StreakProtection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read once, on mount. The window is 48 hours long; re-reading it while the
  // page sits open would tell the learner nothing they cannot get by reloading.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    getStreakProtection().then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, []);

  if (!state || !state.shieldSupported) return null;

  const left = shieldRemaining(state.shieldUntil, now);
  if (left) {
    return (
      <span className="de-shield de-shield--on">
        <ShieldIcon size={16} />
        {t('profile.shieldActive', { h: left.hours, m: left.minutes })}
      </span>
    );
  }

  if (state.remaining <= 0) {
    return (
      <span className="de-shield de-shield--spent">
        <ShieldIcon size={16} />
        {t('profile.shieldNone')}
      </span>
    );
  }

  const spend = async () => {
    setPending(true);
    setError(null);
    try {
      setState(await activateShield());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <VStack gap={0.5} align="center">
      <button type="button" className="de-shield de-shield--action" onClick={spend} disabled={pending}>
        <ShieldIcon size={16} />
        {pending ? t('profile.shieldSpending') : t('profile.shieldAction')}
      </button>
      <span className="de-shield__meta">{t('profile.shieldLeft', { n: state.remaining })}</span>
      {error && <span className="de-shield__meta de-shield__meta--error" role="alert">{error}</span>}
    </VStack>
  );
}

// Ten one-line tips. They sit inside the streak card now rather than in a card
// of their own, so there is room for exactly one line and no more.
const CONSISTENCY_TIPS: readonly TranslationKey[] = [
  'profile.tip.short',
  'profile.tip.unfinished',
  'profile.tip.wrong',
  'profile.tip.finish',
  'profile.tip.tomorrow',
  'profile.tip.recall',
  'profile.tip.mix',
  'profile.tip.tooEasy',
  'profile.tip.showUp',
  'profile.tip.readAnyway',
];

const LAST_TIP_KEY = 'devquiz:profile-tip';

/**
 * A tip the learner did not see last time.
 *
 * "Always different" is the whole request, and a random draw is not that — a
 * pool of ten repeats about one visit in ten. The last one shown is remembered
 * and excluded, so the next is always new. Storage failing (private mode, a
 * fresh browser) degrades to a plain random draw rather than to nothing.
 */
function nextConsistencyTip(): TranslationKey {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(LAST_TIP_KEY);
  } catch {
    /* no storage — a repeat is possible and harmless */
  }
  const pool = CONSISTENCY_TIPS.filter((key) => key !== previous);
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? CONSISTENCY_TIPS[0];
  try {
    localStorage.setItem(LAST_TIP_KEY, chosen);
  } catch {
    /* ignore */
  }
  return chosen;
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

function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function AdvisorCard() {
  const t = useT();
  const subject = useActiveSubject();
  const [advice, setAdvice] = useState<Advice | null>(null);

  useEffect(() => {
    let active = true;
    setAdvice(null);
    getAdvice(subject.id).then((a) => { if (active) setAdvice(a); });
    return () => { active = false; };
  }, [subject.id]);

  const hasData = !!advice && advice.weakAreas.length > 0;

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
            <VStack gap={1}>
              <Text weight="semibold">{t('advisor.weakest')}</Text>
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
