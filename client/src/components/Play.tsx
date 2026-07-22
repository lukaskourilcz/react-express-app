import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMediaQuery } from '../lib/useMediaQuery';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { useAuth, getUserProfile, displayNameFromProfile } from '../lib/auth';
import {
  createMatch,
  joinMatch,
  fetchMatchState,
  controlMatch,
  submitMatchAnswer,
  fetchDistribution,
  sendHeartbeat,
  type Match,
  type Participant,
  type ScoreboardEntry,
  type DistributionBucket,
} from '../lib/play';
import { joinMatchChannel, type RealtimeChannel } from '../lib/realtime';
import { visibleCategoryOptionsFor } from '../lib/categories';
import { useActiveSubject } from '../lib/subjects';
import type { CategoryType } from '../types/quiz';
import { friendlyError, ApiError } from '../lib/api';
import { categoryLabelKey } from '../lib/categories';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader } from './LoadingScreen';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { RadioCardGroup, RadioCard } from './ui/RadioCards';
import { useGameConfig } from '../lib/gameConfig';
import './DeepEndScreens.css';
import { BookIcon, TargetIcon } from './ui/icons';
import { capture } from '../lib/analytics';
import { visuallyHidden } from '../theme/MuiTheme';

const POLL_FALLBACK_MS = 4000;
const REALTIME_HEALING_POLL_MS = 30_000;
const DEFAULT_DURATION_S = 60;

// Human-readable label for a per-question time limit (0 = no limit).
function formatDuration(n: number, t: ReturnType<typeof useT>): string {
  if (n <= 0) return t('play.timeLimitNone');
  if (n < 60) return t('play.timeLimitSeconds', { n });
  return t('play.timeLimitMinutes', { n: n / 60 });
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  }
}

export function PlayLanding() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const config = useGameConfig();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const accent = useActiveSubject().accent;
  const { user, isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const profile = getUserProfile(user);
  const [mode, setMode] = useState<'ffa' | 'classroom'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'classroom'
      ? 'classroom'
      : 'ffa',
  );
  const [count, setCount] = useState(() => config.play.countOptions[0] ?? 10);
  const [durationS, setDurationS] = useState(() => config.play.defaultDurationS);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [joinCode, setJoinCode] = useState('');

  const categoryOptions = visibleCategoryOptionsFor(profile.email, { includePlayOnly: true });
  const toggleCategory = (c: CategoryType) =>
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

  if (authLoading) {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <Card padding={6} width="100%">
          <VStack gap={2} align="center">
            <Heading level={2} justify="center">
              {t('play.signInTitle')}
            </Heading>
            <Text color="secondary" justify="center">
              {t('play.signInBody')}
            </Text>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="primary"
                size="lg"
                label={t('auth.logIn')}
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    setError(friendlyError(err));
                  }
                }}
              />
            </div>
            {error && <Banner status="error" title={error} />}
          </VStack>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!user?.id) return;
    setError(null);
    setLoading('create');
    try {
      const m = await createMatch({
        host_id: user.id,
        host_name: displayNameFromProfile(profile, t('play.hostFallback')),
        mode: mode === 'classroom' ? 'classroom' : 'multiplayer',
        count,
        // "No selection" means every topic of the ACTIVE subject — sending the
        // explicit list keeps other subjects' questions out of the match.
        categories: selectedCategories.length
          ? selectedCategories
          : categoryOptions.map((c) => c.value),
        duration_s: durationS,
        lang,
      });
      capture(mode === 'classroom' ? 'classroom_created' : 'multiplayer_created', { question_count: count });
      navigate(`/play/${m.code}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(null);
    }
  };

  const handleJoin = async () => {
    if (!user?.id) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError(t('play.enterCode'));
      return;
    }
    setError(null);
    setLoading('join');
    try {
      await joinMatch({
        code,
        user_id: user.id,
        display_name: displayNameFromProfile(profile, t('play.playerFallback')),
      });
      capture('classroom_or_match_joined');
      navigate(`/play/${code}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="de-page">
      <VStack gap={3}>
        {/* Page opener in the house voice: kicker + display heading, same as
            Shop and the Career Roadmap. */}
        <div className="ss-pop" style={{ width: '100%' }}>
          <VStack gap={1}>
            <span className="ss-kicker">{t('play.kicker')}</span>
            <Heading level={1} type="display-3">
              {t('play.title')}
            </Heading>
            <Text type="large" color="secondary">
              {t('play.subtitle')}
            </Text>
          </VStack>
        </div>

        {error && (
          <Banner
            status="error"
            title={error}
            isDismissable
            onDismiss={() => setError(null)}
          />
        )}

        {/* Host + Join sit side by side on desktop (2:1) so the short "join" card
            no longer stacks below the tall host card. They stack on mobile. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? '2fr 1fr' : '1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', width: '100%' }}>
          <Card padding={4} width="100%">
            <VStack gap={3}>
              <VStack gap={2}>
                <span className="ss-kicker">{t('play.hostGame')}</span>
                <RadioCardGroup className="de-mode-list" value={mode} onChange={(value) => setMode(value as 'ffa' | 'classroom')} label={t('play.gameMode')}>
                  {([
                    ['ffa', <TargetIcon key="ffa" size={20} />, t('play.multiplayerFfa'), t('play.modeFfaBlurb')],
                    ['classroom', <BookIcon key="classroom" size={20} />, t('play.classroom'), t('play.modeClassroomBlurb')],
                  ] as const).map(([id, icon, name, blurb]) => (
                    <RadioCard key={id} value={id} index={id === 'ffa' ? 0 : 1} className="de-mode-card" padding={4}>
                      <span className="de-mode-card__icon" aria-hidden>{icon}</span>
                      <span className="de-mode-card__copy"><strong>{name}</strong><span>{blurb}</span></span>
                      <span className="de-mode-card__check" aria-hidden style={{ opacity: mode === id ? 1 : 0 }}>✓</span>
                    </RadioCard>
                  ))}
                </RadioCardGroup>
              </VStack>

              <VStack gap={1}>
                <HStack justify="between" align="center">
                  <Text type="label" weight="bold" color="secondary">
                    {t('play.categories')}
                  </Text>
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      label={t('play.clear')}
                      onClick={() => setSelectedCategories([])}
                    />
                  )}
                </HStack>
                <div
                  role="group"
                  aria-label={t('play.categories')}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                >
                  {categoryOptions.map((cat) => {
                    const selected = selectedCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() => toggleCategory(cat.value)}
                        style={{
                          cursor: 'pointer',
                          padding: '7px 12px',
                          fontSize: '0.8rem',
                          fontWeight: selected ? 600 : 500,
                          // The colour lives in the border/left-accent; text stays
                          // neutral so light brand hues never fail contrast.
                          color: selected
                            ? 'var(--color-text-primary, inherit)'
                            : 'var(--astryx-color-text-secondary, inherit)',
                          background: selected ? `${cat.color}18` : 'transparent',
                          border: `1px solid ${selected ? cat.color : 'var(--astryx-color-border, rgba(128,128,128,0.35))'}`,
                          borderLeft: `4px solid ${cat.color}`,
                          borderRadius: 8,
                          lineHeight: 1.4,
                        }}
                      >
                        {t(categoryLabelKey(cat.value))}
                      </button>
                    );
                  })}
                </div>
                <Text type="supporting" size="xsm" color="secondary">
                  {selectedCategories.length === 0
                    ? t('play.allCategoriesHint')
                    : t('play.categoriesSelected', { count: selectedCategories.length })}
                </Text>
              </VStack>

              <VStack gap={1}>
                <HStack gap={1} align="center" wrap="wrap">
                  <ToggleButtonGroup
                    label={t('play.questions')}
                    type="single"
                    size="sm"
                    value={String(count)}
                    onChange={(v) => v && setCount(Number(v))}
                  >
                    {config.play.countOptions.map((n) => (
                      <ToggleButton key={n} value={String(n)} label={String(n)} />
                    ))}
                  </ToggleButtonGroup>
                  <Text type="supporting" size="xsm" color="secondary">
                    {t('play.questions')}
                  </Text>
                </HStack>
              </VStack>

              <VStack gap={1}>
                <Text type="label" weight="bold" color="secondary">
                  {t('play.timeLimit')}
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  <ToggleButtonGroup
                    label={t('play.timeLimit')}
                    type="single"
                    size="sm"
                    value={String(durationS)}
                    onChange={(v) => v && setDurationS(Number(v))}
                  >
                    {config.play.durationOptionsS.map((n) => (
                      <ToggleButton key={n} value={String(n)} label={formatDuration(n, t)} />
                    ))}
                  </ToggleButtonGroup>
                </div>
              </VStack>

              <VStack gap={1} align="stretch">
                <div style={{ display: 'grid' }}>
                  <Button
                    variant="primary"
                    size="lg"
                    label={
                      loading === 'create'
                        ? t('play.creating')
                        : mode !== 'classroom'
                          ? t('play.createMultiplayer')
                          : t('play.createClassroom')
                    }
                    isLoading={loading === 'create'}
                    isDisabled={loading !== null}
                    onClick={handleCreate}
                  />
                </div>
                <Text type="supporting" size="xsm" color="secondary">
                  {mode !== 'classroom' ? t('play.multiplayerHint') : t('play.classroomHint')}
                </Text>
              </VStack>
            </VStack>
          </Card>
          </div>

          <div>
            {!isDesktop && (
              <div style={{ margin: '8px 0 16px' }}>
                <Divider label={t('play.or')} />
              </div>
            )}
            <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
            <Card padding={4} width="100%">
              <VStack gap={2}>
                <span className="ss-kicker">{t('play.joinWithCode')}</span>
                {/* Room code is the star of the join card: big, monospaced,
                    accent-ringed input so it reads like a ticket stub. */}
                <div
                  style={{
                    borderRadius: 'var(--radius-element)',
                    padding: 12,
                    background: `${accent}0f`,
                    border: `1.5px dashed ${accent}55`,
                  }}
                >
                  <div style={{ fontFamily: 'monospace', letterSpacing: '0.32em', fontWeight: 800, fontSize: '1.2rem' }}>
                    <TextInput
                      label={t('play.matchCode')}
                      value={joinCode}
                      placeholder="ABC123"
                      onChange={(v) => setJoinCode(v.toUpperCase())}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid' }}>
                  <Button
                    variant="primary"
                    size="lg"
                    label={loading === 'join' ? '…' : `${t('play.join')} →`}
                    isLoading={loading === 'join'}
                    isDisabled={loading !== null}
                    onClick={handleJoin}
                  />
                </div>
                <div className="de-scoring-note"><strong>{t('play.scoringTitle')}</strong>{t('play.scoringBody')}</div>
              </VStack>
            </Card>
            </div>
          </div>
        </div>
      </VStack>
    </div>
  );
}

export function PlayMatch() {
  const { code: codeParam } = useParams<{ code: string }>();
  const code = (codeParam || '').toUpperCase();
  const navigate = useNavigate();
  const t = useT();
  const { user, isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const profile = getUserProfile(user);

  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [controlPending, setControlPending] = useState(false);
  const [questionShownAt, setQuestionShownAt] = useState<number>(Date.now());
  const [connectionState, setConnectionState] = useState<'live' | 'polling' | 'stale'>('polling');
  const refreshFailures = useRef(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isHost = !!(user?.id && match?.host_id === user.id);
  // Records when the local client first observed the current question_started_at,
  // so a slow broadcast doesn't unfairly penalise the speed bonus.
  const clientReceivedAtRef = useRef<string | null>(null);
  // Synchronous submit lock: two clicks can land in the same render tick,
  // before the async `submitted` state re-renders — the ref closes that gap
  // so the first click is the one that counts.
  const submitLockRef = useRef(false);

  // Initial join + state load.
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !code) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await joinMatch({
          code,
          user_id: user.id,
          display_name: displayNameFromProfile(profile, t('play.playerFallback')),
        });
        if (cancelled) return;
        setMatch(m);
        const state = await fetchMatchState(code, user.id);
        if (cancelled) return;
        setParticipants(state.participants);
        setScoreboard(state.scoreboard);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        if (!cancelled) setJoining(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, isAuthenticated, user]);

  // Pull the latest match state. Shared by the realtime/poll loop and by
  // submitAnswer so an auto-advance is reflected immediately for the answerer.
  const refresh = useCallback(async () => {
    if (!code || !user?.id) return;
    try {
      const state = await fetchMatchState(code, user.id);
      setMatch(state.match);
      setParticipants(state.participants);
      setScoreboard(state.scoreboard);
      refreshFailures.current = 0;
    } catch {
      refreshFailures.current += 1;
      setConnectionState(refreshFailures.current >= 3 ? 'stale' : 'polling');
    }
  }, [code, user?.id]);

  // Realtime broadcast wiring.
  useEffect(() => {
    if (!code || !user?.id) return;
    const channel = joinMatchChannel(code);
    channelRef.current = channel;
    let realtimeReady = false;

    channel.subscribe('participant_joined', refresh);
    channel.subscribe('match_updated', refresh);
    const stopStatus = channel.onStatus((status) => {
      realtimeReady = status === 'SUBSCRIBED';
      setConnectionState(realtimeReady ? 'live' : 'polling');
      if (realtimeReady) {
        refreshFailures.current = 0;
        void channel.send('participant_joined', { sub: user.id });
      }
    });

    // Fast polling only while Realtime is unavailable. A slow healing poll is
    // retained while connected in case a broadcast is dropped.
    const healing = window.setInterval(() => void refresh(), REALTIME_HEALING_POLL_MS);
    const fallback = window.setInterval(() => {
      if (!realtimeReady) void refresh();
    }, POLL_FALLBACK_MS);

    return () => {
      window.clearInterval(healing);
      window.clearInterval(fallback);
      stopStatus();
      channel.unsubscribe();
    };
  }, [code, user?.id, refresh]);

  // Reset per-question UI when the index changes.
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    submitLockRef.current = false;
    setQuestionShownAt(Date.now());
    clientReceivedAtRef.current = new Date().toISOString();
  }, [match?.current_index, match?.status]);

  // Host heartbeat — keeps the match from being auto-finished by the
  // server's stale-match cleanup (5 min). Pinged every 30 s while the
  // host is actively viewing the page.
  useEffect(() => {
    if (!isHost || !user?.id || !code) return;
    if (match?.status !== 'lobby' && match?.status !== 'running') return;
    let cancelled = false;
    const tick = () => {
      sendHeartbeat(code, user.id!).catch(() => {
        /* ignore — UI keeps working, server will auto-finish if truly gone */
      });
    };
    tick();
    const id = window.setInterval(() => {
      if (!cancelled) tick();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isHost, user?.id, code, match?.status]);

  const broadcastUpdate = () => {
    channelRef.current?.send('match_updated', { at: Date.now() });
  };

  const runHostControl = async (action: 'start' | 'advance' | 'finish') => {
    if (!user?.id || !match || controlPending) return;
    setControlPending(true);
    try {
      await controlMatch({ code, host_id: user.id, action });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setControlPending(false);
    }
  };

  const startMatch = () => void runHostControl('start');
  const advance = () => void runHostControl('advance');
  const finish = () => void runHostControl('finish');

  // Selection is only mutable until the first submit locks it in.
  const selectOption = (i: number) => {
    if (submitLockRef.current) return;
    setSelected(i);
  };

  // One tap locks the answer — no confirm step. The card is marked selected
  // and disabled optimistically, then the answer is recorded; a misclick is
  // the player's own (by design).
  const submitAnswer = async (selectedIdx: number) => {
    if (!match || !user?.id || submitLockRef.current) return;
    submitLockRef.current = true;
    setSelected(selectedIdx);
    setSubmitted(true);
    try {
      const result = await submitMatchAnswer({
        code,
        user_id: user.id,
        question_idx: match.current_index,
        selected_idx: selectedIdx,
        duration_ms: Date.now() - questionShownAt,
        client_received_at: clientReceivedAtRef.current ?? new Date().toISOString(),
      });
      broadcastUpdate();
      // In multiplayer the server advances as soon as the last player locks
      // in. Pull fresh state right away so this client jumps to the next
      // question (or the results screen) without waiting for the poll.
      if (result.advanced) await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'wrong_question') {
        // The match moved past this question (timer expiry beat the submit).
        // Tell the player their answer didn't count, then resync.
        setError(t('play.tooLate'));
        await refresh();
        return;
      }
      if (err instanceof ApiError && err.code === 'bad_state') {
        // Match ended while the submit was in flight — just resync.
        await refresh();
        return;
      }
      // Genuine failure (network, server): unlock so the player can retry.
      submitLockRef.current = false;
      setSubmitted(false);
      setError(friendlyError(err));
    }
  };

  if (authLoading) {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <Card padding={6} width="100%">
          <VStack gap={2} align="center">
            <Heading level={2} justify="center">{t('play.signInTitle')}</Heading>
            <Text color="secondary" justify="center">{t('play.signInBody')}</Text>
            <Button
              variant="primary"
              size="lg"
              label={t('auth.logIn')}
              onClick={() => void signInWithGoogle().catch((err) => setError(friendlyError(err)))}
            />
            {error && <Text type="supporting" color="secondary" justify="center">{error}</Text>}
          </VStack>
        </Card>
      </div>
    );
  }

  if (joining) {
    // Same loading look as the other study modes, but no artificial minimum
    // hold: a live match runs on a shared clock, so joining must be instant.
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('play.joining')} />;
  }

  if (error && !match) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <VStack gap={2}>
          <Banner status="error" title={error} />
          <HStack gap={1} wrap="wrap">
            <Button variant="primary" label={t('error.tryAgain')} onClick={() => void refresh()} />
            <Button variant="secondary" label={t('common.back')} onClick={() => navigate('/play')} />
          </HStack>
        </VStack>
      </div>
    );
  }
  if (!match) return null;

  const totalQuestions = match.questions.length;
  const currentQuestion = match.questions[match.current_index];

  return (
    // Same question-column width as Quiz / Learn / Challenge.
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
      <VStack gap={2}>
        <HStack justify="between" align="center" gap={2}>
          <VStack gap={0}>
            <Heading level={1} type="display-3">
              {match.mode === 'classroom' ? t('play.classroom') : t('play.multiplayer')}
            </Heading>
            <Text type="supporting" size="xsm" color="secondary">
              {t('play.hostedBy', { name: match.host_name })}
            </Text>
          </VStack>
          <CodeBadge code={code} />
        </HStack>

        {error && (
          <Banner
            status="warning"
            title={error}
            isDismissable
            onDismiss={() => setError(null)}
          />
        )}

        {connectionState !== 'live' && (
          <Banner
            status={connectionState === 'stale' ? 'warning' : 'info'}
            title={connectionState === 'stale' ? t('play.connectionStale') : t('play.connectionPolling')}
          />
        )}

        {match.status === 'lobby' && (
          <Lobby
            match={match}
            participants={participants}
            isHost={isHost}
            onStart={startMatch}
            startPending={controlPending}
          />
        )}

        {match.status === 'running' && currentQuestion && (
          <RunningQuestion
            match={match}
            questionIdx={match.current_index}
            total={totalQuestions}
            q={currentQuestion}
            isHost={isHost}
            mode={match.mode}
            selected={selected}
            submitted={submitted}
            onSelect={selectOption}
            onAnswer={submitAnswer}
            onAdvance={advance}
            onFinish={finish}
            controlPending={controlPending}
            scoreboard={scoreboard}
            participants={participants}
            hostSub={user?.id}
            code={code}
          />
        )}

        {match.status === 'finished' && (
          <Finished match={match} scoreboard={scoreboard} onLeave={() => navigate('/play')} />
        )}
      </VStack>
    </div>
  );
}

const CodeBadge = ({ code }: { code: string }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const status = copyFailed ? t('play.copyFailed') : copied ? t('play.copied') : t('play.copy');
  return (
    <Button
      variant="secondary"
      size="sm"
      label={`${code} — ${status}`}
      onClick={() => {
        void copyText(code).then((ok) => {
          setCopied(ok);
          setCopyFailed(!ok);
          setTimeout(() => {
            setCopied(false);
            setCopyFailed(false);
          }, 1600);
        });
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'monospace', letterSpacing: '0.2em', fontWeight: 700 }}>{code}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{status}</span>
      </span>
    </Button>
  );
};

function Lobby({
  match,
  participants,
  isHost,
  onStart,
  startPending,
}: {
  match: Match;
  participants: Participant[];
  isHost: boolean;
  onStart: () => void;
  startPending: boolean;
}) {
  const t = useT();
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play/${match.code}` : '';
  const [qrUrl, setQrUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    let active = true;
    void import('qrcode')
      .then(({ toDataURL }) => toDataURL(shareUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#17272eff', light: '#ffffffff' },
        errorCorrectionLevel: 'M',
      }))
      .then((url) => { if (active) setQrUrl(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [shareUrl]);
  return (
    <div className="ss-raised ss-pop play-invite" style={{ display: 'flex', width: '100%' }}>
    <Card padding={4} width="100%">
      <VStack gap={3}>
        <VStack gap={1}>
          <HStack gap={1.5} align="center">
            <Heading level={2}>{t('play.lobby')}</Heading>
            {participants.length > 0 && (
              <div
                style={{
                  marginLeft: 'auto',
                  borderRadius: 999,
                  padding: '3px 11px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  color: 'var(--brand-accent)',
                  background: 'color-mix(in srgb, var(--brand-accent) 14%, transparent)',
                }}
              >
                {participants.length}
              </div>
            )}
          </HStack>
          <Text color="secondary">
            {t('play.shareInstructions', {
              code: match.code,
              action: isHost ? t('play.actionHostStart') : t('play.actionGuestWait'),
            })}
          </Text>
        </VStack>

        {qrUrl && (
          <div className="play-invite__qr">
            <img src={qrUrl} alt={t('play.qrAlt', { code: match.code })} width={164} height={164} />
            <VStack gap={0.5}>
              <Text weight="bold">{t('play.scanToJoin')}</Text>
              <Text type="supporting" size="xsm" color="secondary">{shareUrl}</Text>
            </VStack>
          </div>
        )}

        <VStack gap={1}>
          {participants.map((p, i) => (
            <div
              key={p.user_id}
              className="ss-raised ss-pop"
              style={{ display: 'flex', width: '100%', animationDelay: `${i * 55}ms` }}
            >
              <Card variant="muted" padding={1.5} width="100%">
                <HStack gap={1.5} align="center">
                  <Avatar name={p.display_name} size="small" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="medium">{p.display_name}</Text>
                  </div>
                  {p.user_id === match.host_id && <Badge variant="yellow" label={t('play.host')} />}
                </HStack>
              </Card>
            </div>
          ))}
          {participants.length === 0 && (
            <VStack gap={1} align="center" padding={3}>
              <Text type="supporting" size="xsm" color="secondary" justify="center">
                {t('play.noPlayers')}
              </Text>
            </VStack>
          )}
        </VStack>

        <HStack gap={1.5} wrap="wrap" justify="between">
          <HStack gap={1} wrap="wrap">
            <Button
              variant="secondary"
              label={copyStatus === 'copied' ? t('play.copied') : copyStatus === 'failed' ? t('play.copyFailed') : t('play.copyLink')}
              onClick={() => {
                void copyText(shareUrl).then((ok) => {
                  setCopyStatus(ok ? 'copied' : 'failed');
                  setTimeout(() => setCopyStatus('idle'), 1600);
                });
              }}
            />
            <Button variant="ghost" label={t('play.printInvite')} onClick={() => window.print()} />
          </HStack>
          {isHost && (
            <Button
              variant="primary"
              size="lg"
              label={t('play.startWithCount', { count: match.questions.length })}
              isDisabled={participants.length < 1 || startPending}
              onClick={onStart}
            />
          )}
        </HStack>
      </VStack>
    </Card>
    </div>
  );
}

function RunningQuestion({
  match,
  questionIdx,
  total,
  q,
  isHost,
  mode,
  selected,
  submitted,
  onSelect,
  onAnswer,
  onAdvance,
  onFinish,
  controlPending,
  scoreboard,
  participants,
  hostSub,
  code,
}: {
  match: Match;
  questionIdx: number;
  total: number;
  q: NonNullable<Match['questions'][number]>;
  isHost: boolean;
  mode: Match['mode'];
  selected: number | null;
  submitted: boolean;
  onSelect: (i: number) => void;
  onAnswer: (i: number) => void;
  onAdvance: () => void;
  onFinish: () => void;
  controlPending: boolean;
  scoreboard: ScoreboardEntry[];
  participants: Participant[];
  hostSub?: string;
  code: string;
}) {
  const t = useT();
  const lastQuestion = questionIdx >= total - 1;
  // Multiplayer is a fair race: the host answers like everyone else and never
  // sees the answer key. Only a classroom host presents instead of playing.
  const isPlayer = mode === 'multiplayer' || !isHost;
  const isPresenter = isHost && mode === 'classroom';
  const questionLabelId = `play-question-${q.id}`;

  // Presenter view polls the per-question answer distribution; the same
  // buckets drive both the histogram and the "answers received" count (the
  // cumulative scoreboard can't say who answered the CURRENT question).
  const [buckets, setBuckets] = useState<DistributionBucket[]>([]);
  const [distributionStale, setDistributionStale] = useState(false);
  useEffect(() => {
    if (!isPresenter || !hostSub) return;
    let cancelled = false;
    setBuckets([]);
    const load = () => {
      fetchDistribution(code, questionIdx, hostSub)
        .then((r) => {
          if (!cancelled) {
            setBuckets(r.buckets);
            setDistributionStale(false);
          }
        })
        .catch(() => {
          if (!cancelled) setDistributionStale(true);
        });
    };
    load();
    const id = window.setInterval(load, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isPresenter, hostSub, code, questionIdx]);
  const answeredCount = useMemo(() => buckets.reduce((sum, b) => sum + b.count, 0), [buckets]);
  // The presenter is a participant row too but never answers — exclude them
  // from the denominator.
  const playerCount = useMemo(
    () => participants.filter((p) => p.user_id !== match.host_id).length,
    [participants, match.host_id],
  );

  // Countdown derived from question_started_at + question_duration_s.
  // A duration of 0 (or missing) means the host chose "no time limit".
  const durationS = match.question_duration_s ?? DEFAULT_DURATION_S;
  const noLimit = durationS <= 0;
  const startedMs = match.question_started_at ? new Date(match.question_started_at).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (noLimit) return;
    // The visible timer changes once per second; a 250 ms full subtree render
    // added churn without conveying more useful information.
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [noLimit]);
  const remainingMs = noLimit
    ? Infinity
    : startedMs
      ? Math.max(0, startedMs + durationS * 1000 - now)
      : durationS * 1000;
  const remainingS = Math.ceil(remainingMs / 1000);
  const pctLeft = noLimit ? 100 : startedMs ? (remainingMs / (durationS * 1000)) * 100 : 100;

  // Time-up auto-lock: clicking locks instantly, so this only catches a
  // keyboard user who arrow-browsed to an option but never pressed Enter.
  useEffect(() => {
    if (!noLimit && isPlayer && !submitted && remainingMs === 0 && selected !== null) {
      onAnswer(selected);
    }
  }, [remainingMs, noLimit, isPlayer, submitted, selected, onAnswer]);

  const timerColor = noLimit
    ? 'var(--astryx-color-text-secondary, currentColor)'
    : remainingS <= 5
      ? 'var(--ss-error)'
      : remainingS <= 10
        ? 'var(--ss-warning)'
        : 'var(--astryx-color-text-secondary, currentColor)';

  return (
    <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
    <Card padding={4} width="100%">
      <VStack gap={2}>
        <HStack justify="between" align="center" gap={1}>
          <Text type="supporting" size="xsm" color="secondary">
            {t('play.questionMeta', {
              idx: questionIdx + 1,
              total,
              category: t(categoryLabelKey(q.category)),
              difficulty: q.difficulty,
            })}
          </Text>
          <span style={visuallyHidden} aria-live="polite">
            {!noLimit && remainingS === 10 ? t('play.timeWarning') : ''}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '4px 11px',
              borderRadius: 999,
              color: timerColor,
              background:
                !noLimit && remainingS <= 5
                  ? 'color-mix(in srgb, var(--ss-error) 15%, transparent)'
                  : 'color-mix(in srgb, var(--brand-accent) 12%, transparent)',
            }}
            role="timer"
            aria-label={noLimit ? t('play.timeLimitNone') : t('play.timeRemaining', { n: remainingS })}
          >
            {noLimit ? '∞' : `${remainingS}s`}
          </span>
        </HStack>

        <ProgressBar
          label={t('play.timeLimit')}
          isLabelHidden
          value={pctLeft}
          variant={!noLimit && remainingS <= 5 ? 'error' : 'accent'}
        />

        <div id={questionLabelId}>{renderQuestion(q.question)}</div>

        <RadioCardGroup
          value={selected}
          onChange={(v) => onSelect(v as number)}
          // One click locks the answer in — no confirm button. Arrow keys
          // still browse without committing; Enter/Space commits.
          onActivate={(v) => {
            if (isPlayer && !submitted) onAnswer(v as number);
          }}
          labelledBy={questionLabelId}
        >
          <VStack gap={1}>
            {q.options.map((opt, i) => {
              // Only the classroom presenter gets the answer key (the server
              // withholds correct_index from everyone else while running).
              const isCorrect = isPresenter && q.correct_index === i;
              return (
                <RadioCard
                  key={i}
                  value={i}
                  index={i}
                  label={opt}
                  padding={2}
                  disabled={submitted}
                  tone={isCorrect ? 'success' : 'default'}
                >
                  <Text>{opt}</Text>
                </RadioCard>
              );
            })}
          </VStack>
        </RadioCardGroup>

        {isPlayer && !submitted && (
          <Text type="supporting" size="xsm" color="secondary">
            {t('play.tapToLock')}
          </Text>
        )}
        {isPlayer && submitted && (
          <Banner
            status="success"
            title={
              mode === 'multiplayer'
                ? t('play.answerLockedVs')
                : t('play.answerLocked', { who: t('play.theInstructor') })
            }
          />
        )}

        {/* A multiplayer host is just another player, but keeps quiet escape
            hatches: skip a question nobody is answering (e.g. a player left a
            no-limit match mid-question) or end the match early. */}
        {isHost && mode === 'multiplayer' && (
          <HStack gap={1} justify="between">
            <Button variant="ghost" size="sm" label={t('play.endMatch')} isDisabled={controlPending} onClick={onFinish} />
            <Button
              variant="ghost"
              size="sm"
              label={lastQuestion ? t('play.showResults') : t('play.skipQuestion')}
              isDisabled={controlPending}
              onClick={onAdvance}
            />
          </HStack>
        )}

        {isPresenter && (
          <VStack gap={1.5}>
            <Text type="supporting" size="xsm" color="secondary">
              {t('play.liveAnswers', { count: answeredCount, total: playerCount })}
            </Text>

            <DistributionChart options={q.options} buckets={buckets} correctIndex={q.correct_index} />

            {distributionStale && <Banner status="warning" title={t('play.distributionUnavailable')} />}

            <HStack gap={1} justify="between">
              <Button variant="secondary" label={t('play.endMatch')} isDisabled={controlPending} onClick={onFinish} />
              <Button
                variant="primary"
                label={lastQuestion ? t('play.showResults') : t('play.nextQuestion')}
                isDisabled={controlPending}
                onClick={onAdvance}
              />
            </HStack>
          </VStack>
        )}

        <Divider />
        <ScoreboardList scoreboard={scoreboard} />
      </VStack>
    </Card>
    </div>
  );
}

function ScoreboardList({ scoreboard }: { scoreboard: ScoreboardEntry[] }) {
  const t = useT();
  if (scoreboard.length === 0) return null;
  return (
    <VStack gap={1}>
      <Text type="label" weight="bold" color="secondary">
        {t('play.liveScoreboard')}
      </Text>
      <ol
        aria-label={t('play.liveScoreboard')}
        style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, padding: 0, listStyle: 'none' }}
      >
        {scoreboard.map((s, i) => (
          <li
            key={s.user_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 8,
              background: i === 0 ? 'color-mix(in srgb, var(--brand-accent) 10%, transparent)' : 'transparent',
            }}
          >
            <span
              style={{
                width: 24,
                textAlign: 'center',
                fontWeight: 700,
                fontSize: i < 3 ? '1rem' : '0.8rem',
                color: i === 0 ? 'var(--brand-accent)' : 'inherit',
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text weight="medium">{s.display_name}</Text>
            </div>
            <span style={{ fontWeight: 700 }}>{s.score ?? s.correct}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.65, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {s.score != null ? `${s.correct} ${t('play.correctShort')} · ` : ''}{(s.total_ms / 1000).toFixed(1)} s
            </span>
          </li>
        ))}
      </ol>
    </VStack>
  );
}

// Presentational histogram of the current question's answers; the buckets are
// polled by RunningQuestion, which shares them with the live answered-count.
function DistributionChart({
  options,
  buckets,
  correctIndex,
}: {
  options: string[];
  buckets: DistributionBucket[];
  correctIndex?: number;
}) {
  const t = useT();
  const total = buckets.reduce((sum, b) => sum + b.count, 0) || 1;

  return (
    <VStack gap={1}>
      <Text type="label" weight="bold" color="secondary">
        {t('play.classAnswers')}
      </Text>
      <VStack gap={1}>
        {options.map((opt, i) => {
          const b = buckets.find((x) => x.selected_idx === i);
          const count = b?.count ?? 0;
          const pct = (count / total) * 100;
          const isCorrect = correctIndex === i;
          return (
            <HStack key={i} gap={1} align="center">
              <span
                style={{
                  width: 18,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: isCorrect ? 'var(--brand-accent)' : 'inherit',
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <VStack gap={0.5}>
                  <Text type="supporting" size="xsm">
                    {opt}
                  </Text>
                  <ProgressBar
                    label={opt}
                    isLabelHidden
                    value={pct}
                    variant={isCorrect ? 'accent' : 'neutral'}
                  />
                </VStack>
              </div>
              <span style={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem' }}>
                {count}
              </span>
            </HStack>
          );
        })}
      </VStack>
    </VStack>
  );
}

function Finished({
  match,
  scoreboard,
  onLeave,
}: {
  match: Match;
  scoreboard: ScoreboardEntry[];
  onLeave: () => void;
}) {
  const t = useT();
  // Move focus to the heading when the match ends so AT announces the result
  // (same pattern as the Quiz/Challenge completion screens).
  const headingRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
    <Card padding={5} width="100%">
      <VStack gap={3} align="center">
        <VStack gap={1.5} align="center">
          <div ref={headingRef} tabIndex={-1}>
            <Heading level={1} type="display-3" justify="center">
              {t('play.matchComplete')}
            </Heading>
          </div>
          {scoreboard.length > 0 && (
            <div
              style={{
                borderRadius: 999,
                padding: '6px 16px',
                fontWeight: 700,
                color: 'var(--brand-accent)',
                background: 'color-mix(in srgb, var(--brand-accent) 14%, transparent)',
                textAlign: 'center',
              }}
            >
              {t('play.winner', {
                name: scoreboard[0].display_name,
                correct: scoreboard[0].correct,
                total: match.questions.length,
              })}
            </div>
          )}
        </VStack>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <ScoreboardList scoreboard={scoreboard} />
        </div>
        <Button variant="primary" size="lg" label={t('common.back')} onClick={onLeave} />
      </VStack>
    </Card>
    </div>
  );
}

export default PlayLanding;
