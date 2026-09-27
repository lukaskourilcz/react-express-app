import { Suspense, useEffect, useId, useState, type ReactNode } from 'react';
import { Kicker } from './landing/LandingKit';
import { Link, useNavigate } from 'react-router-dom';
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
import { AppToast } from './ui/AppToast';
import type { UserStats } from '../lib/supabase';
import { useProfileStats } from '../lib/queries';
import { useRoadmapProgress, syncProgressWithServer } from '../lib/roadmap';
import { useTrack, rankLabelKeyFor } from '../lib/tracks';
import LearningPathsCard from './paths/LearningPathsCard';
import { useQuestXp, syncXpWithServer } from '../lib/xp';
import { computeLearningXp, levelForXp, MAX_RANK } from '../lib/leveling';
import { useAuth, getUserProfile } from '../lib/auth';
import { apiFetch, friendlyError } from '../lib/api';
import { useBookmarks, removeBookmark } from '../lib/bookmarks';
import { getStreakProtection, activateShield, shieldRemaining, type StreakProtection } from '../lib/streakFreezes';
import { getAdvice, advisorCategoryKey, type Advice } from '../lib/advisor';
import { renderQuestion } from './CodeBlock';
import { MULTILINGUAL, useT, useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import { useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import { useActiveSubject, topicSetForSubject } from '../lib/subjects';
import { savePreferredLanguage } from '../lib/languagePref';
import { useColorMode } from '../theme/ColorModeContext';
import { useSettings } from '../lib/settings';
// The friends tab keeps its code out of the profile until it opens, with a
// boundary of its own: when that code does not load, the tab says so with a
// Retry and the rest of the profile stays.
const FriendsPanel = lazyShellPart(() => import('./FriendsPanel'));
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';
import { ShellPartBoundary } from './ShellPartBoundary';
import { lazyShellPart } from '../lib/routeRecovery';
import { ShieldIcon, TrophyIcon, TargetIcon, SunIcon, MoonIcon, SoundOnIcon, SoundOffIcon } from './ui/icons';
import { BrandedConfirmDialog, type ConfirmRequest } from './ui/BrandedConfirmDialog';
import { GithubGardenCard } from './coding/GithubGardenCard';
import PlanLine from './PlanLine';
import { useEntitlement } from '../lib/entitlement';
import './DeepEndScreens.css';

// Section opener in the brand's editorial voice: uppercase accent kicker with
// the waterline tick beneath (the "dive marker" that starts every section).
function SectionLabel({ children }: { children: ReactNode }) {
  return <Kicker as="h2">{children}</Kicker>;
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
      {MULTILINGUAL && (
        <button
          type="button"
          className="de-identity-settings__button"
          onClick={() => { setLang(nextLang); void savePreferredLanguage(nextLang); }}
          aria-label={langLabel}
          title={langLabel}
        >
          <span aria-hidden="true">{nextLang.toUpperCase()}</span>
        </button>
      )}
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
  const [tab, setTab] = useState<'overview' | 'friends'>('overview');

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
              <PlanLine />
            </Card>
          </div>
        </div>

        {/* Two tabs. The overview is everything the profile has always been;
            Friends is the only thing on this page about anybody else, so it
            gets its own space rather than becoming a ninth card. */}
        <div className="de-tabs" role="tablist" aria-label={t('nav.profile')}>
          <button
            type="button"
            role="tab"
            id="profile-tab-overview"
            aria-selected={tab === 'overview'}
            aria-controls="profile-panel-overview"
            className="de-tab"
            onClick={() => setTab('overview')}
          >
            {t('friends.tabOverview')}
          </button>
          <button
            type="button"
            role="tab"
            id="profile-tab-friends"
            aria-selected={tab === 'friends'}
            aria-controls="profile-panel-friends"
            className="de-tab"
            onClick={() => setTab('friends')}
          >
            {t('friends.tabFriends')}
          </button>
        </div>

        {tab === 'friends' && (
          <div role="tabpanel" id="profile-panel-friends" aria-labelledby="profile-tab-friends">
            <Suspense fallback={null}>
              <ShellPartBoundary fallback={(retry, busy) => <ErrorRetry message={t('friends.loadFailed')} onRetry={retry} busy={busy} />}>
                <FriendsPanel />
              </ShellPartBoundary>
            </Suspense>
          </div>
        )}

        {tab === 'overview' && (<div role="tabpanel" id="profile-panel-overview" aria-labelledby="profile-tab-overview"><VStack gap={2}>

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

        {/* On desktop the cards split into two columns so the profile lands close
            to one viewport instead of one long scroll. On mobile they stack. */}
        <Grid columns={{ minWidth: 360, max: 2 }} gap={2} align="start" width="100%">
          <VStack gap={2}>
            <CareerCard
              totals={{ quizzes: totalQuizzes, questions: totalQuestions, correct: totalCorrect, average: averageScore }}
            />

            {/* One card owns the track: the paths card, which carries the
                specialization and the picker as well. */}
            <LearningPathsCard />

            <AdvisorCard />
          </VStack>

          <VStack gap={2}>
            {bookmarkedQuestions.length > 0 && (
              <div className="ss-panel" style={{ padding: 24, width: '100%' }}>
                <VStack gap={2}>
                  <SectionLabel>{t('profile.bookmarks', { count: bookmarkedQuestions.length })}</SectionLabel>
                  <VStack gap={1.5}>
                    {bookmarkedQuestions.slice(0, 20).map((q) => (
                      <Card key={q.id} variant="muted" padding={2}>
                        <VStack gap={1}>
                          <div style={{ fontSize: 'var(--ss-type-compact)' }}>{renderQuestion(q.question)}</div>
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
              </div>
            )}

            <GithubGardenCard />

            <AccountDeletionCard />
          </VStack>
        </Grid>
        </VStack></div>)}
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
  unavailable = false,
}: {
  stats: UserStats | null;
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
    <div className="ss-panel" style={{ padding: 24, width: '100%' }}>
        <VStack gap={2}>
          <SectionLabel>{t('profile.streaks')}</SectionLabel>

          <Grid columns={{ minWidth: 150, max: 2 }} gap={2}>
            <div role="group" aria-labelledby={currentLabelId} style={{ display: 'flex', width: '100%' }}>
              <Card variant="muted" padding={3} width="100%">
                <VStack gap={0.5} align="center">
                  {/* "4 days": the number and its unit on one line. */}
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                    <Text
                      size="4xl"
                      weight="bold"
                      aria-label={unavailable ? t('profile.streakValueUnavailable') : undefined}
                    >
                      {currentStreakDisplay}
                    </Text>
                    {!unavailable && <Text type="supporting" color="secondary">{dayUnit(currentStreak)}</Text>}
                  </span>
                  <Text id={currentLabelId} type="supporting" color="primary" weight="semibold" justify="center">
                    {t('profile.currentStreak')}
                  </Text>
                  {/* Protection lives inside the streak it protects. It used to
                      be a card of its own below, which read as a separate
                      feature rather than as part of this number. */}
                  {!unavailable && <StreakShield />}
                </VStack>
              </Card>
            </div>

            <div role="group" aria-labelledby={longestLabelId} style={{ display: 'flex', width: '100%' }}>
              <Card variant="muted" padding={3} width="100%">
                <VStack gap={0.5} align="center">
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                    <Text
                      size="4xl"
                      weight="bold"
                      aria-label={unavailable ? t('profile.streakValueUnavailable') : undefined}
                    >
                      {longestStreakDisplay}
                    </Text>
                    {!unavailable && <Text type="supporting" color="secondary">{dayUnit(longestStreak)}</Text>}
                  </span>
                  <Text id={longestLabelId} type="supporting" color="primary" weight="semibold" justify="center">
                    {t('profile.longestStreak')}
                  </Text>
                </VStack>
              </Card>
            </div>
          </Grid>

          {unavailable && (
            <Text type="supporting" size="xsm" color="secondary" justify="center">
              {t('profile.streakUnavailable')}
            </Text>
          )}
        </VStack>
      </div>
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

// Career level card: the learner's rank (derived from total XP = learning XP +
// quest XP), with a progress bar toward the next rank, and the four quiz
// figures in one neutral row (design audit P1.5). Pulls account XP on mount
// so it stays in sync even if the user hasn't visited the learning path.
function CareerCard({ totals }: { totals: { quizzes: number; questions: number; correct: number; average: number } }) {
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
    <div className="ss-panel" style={{ padding: 24, width: '100%' }}>
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
            <TrophyIcon size={24} />
          </div>
          <VStack gap={0} width="100%">
            <Heading level={3} maxLines={1}>{title}</Heading>
            <Text type="supporting" size="xsm" color="secondary">
              {t('profile.careerLevelOf', { level: info.level, max: MAX_RANK })}
            </Text>
          </VStack>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            <Text size="3xl" weight="bold" color="accent">{nf(totalXp)}</Text>
            <Text type="supporting" color="secondary">{t('profile.xpUnit')}</Text>
          </span>
        </HStack>

        <VStack gap={1}>
          <ProgressBar
            label={nextLabel}
            value={info.progressPct}
            isLabelHidden
          />
          <Text type="supporting" size="xsm" color="secondary" weight="semibold">
            {nextLabel}
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 110, max: 4 }} gap={1.5}>
          <StatTile label={t('profile.quizzesCompleted')} value={nf(totals.quizzes)} />
          <StatTile label={t('profile.questionsAnswered')} value={nf(totals.questions)} />
          <StatTile label={t('profile.correctAnswers')} value={nf(totals.correct)} />
          <StatTile label={t('profile.averageScore')} value={`${totals.average}%`} />
        </Grid>
      </VStack>
    </div>
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
    <div className="ss-panel" style={{ padding: 24, width: '100%' }}>
        <VStack gap={2}>
          <HStack gap={1.5} align="center">
            <div aria-hidden className="ss-tile" style={{ width: 40, height: 40, color: 'var(--brand-accent-on-soft)', background: 'var(--brand-accent-soft)' }}>
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
      </div>
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

export function AccountDeletionCard() {
  const t = useT();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const plan = useEntitlement();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Deleting the account ends a paid subscription at once and refunds nothing,
  // so the card and the dialog say so, with the way to a refund while it
  // still exists (review finding product-4).
  const paying = plan.data?.subscriptionLive === true || (plan.tier === 'premium' && plan.data?.source === 'provider');

  const requestDeletion = () => {
    setConfirm({
      title: t('profile.deleteTitle'),
      description: paying ? `${t('profile.deleteConfirm')} ${t('profile.deletePremium')}` : t('profile.deleteConfirm'),
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
      <div className="ss-panel" style={{ padding: 24, width: '100%', background: 'var(--color-background-muted)' }}>
          <VStack gap={1.5}>
            <SectionLabel>{t('profile.account')}</SectionLabel>
            <Text weight="semibold">{t('profile.deleteTitle')}</Text>
            <Text type="supporting" size="xsm" color="secondary">{t('profile.deleteDescription')}</Text>
            {paying && (
              <Text type="supporting" size="xsm">
                {t('profile.deletePremium')}{' '}
                <Link to="/premium/cancel?action=withdraw">{t('legal.link.cancel')}</Link>
              </Text>
            )}
            <HStack justify="end">
              <Button variant="destructive" size="sm" label={t('profile.deleteAction')} onClick={requestDeletion} />
            </HStack>
          </VStack>
        </div>
      <BrandedConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      <AppToast open={!!message} message={message} onClose={() => setMessage(null)} severity="error" autoHideDuration={null} />
    </>
  );
}

// One neutral figure: every tile the same muted surface, whatever the value.
const StatTile = ({ label, value }: { label: string; value: number | string }) => (
  <div style={{ display: 'flex', width: '100%' }}>
    <Card variant="muted" padding={2} width="100%">
      <VStack gap={0.5}>
        <Text size="2xl" weight="bold">{value}</Text>
        <Text type="supporting" size="xsm" color="primary" weight="semibold">{label}</Text>
      </VStack>
    </Card>
  </div>
);

export default Profile;
