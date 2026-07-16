import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMediaQuery } from '../lib/useMediaQuery';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
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
import { friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader } from './LoadingScreen';
import { useT } from '../i18n/LanguageContext';
import { useGameConfig } from '../lib/gameConfig';

const POLL_FALLBACK_MS = 4000;
const DEFAULT_DURATION_S = 60;

// Human-readable label for a per-question time limit (0 = no limit).
function formatDuration(n: number, t: ReturnType<typeof useT>): string {
  if (n <= 0) return t('play.timeLimitNone');
  if (n < 60) return t('play.timeLimitSeconds', { n });
  return t('play.timeLimitMinutes', { n: n / 60 });
}

export function PlayLanding() {
  const navigate = useNavigate();
  const t = useT();
  const config = useGameConfig();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const accent = useActiveSubject().accent;
  const { user, isAuthenticated, signInWithGoogle } = useAuth();
  const profile = getUserProfile(user);
  const [mode, setMode] = useState<'multiplayer' | 'classroom'>('multiplayer');
  const [count, setCount] = useState(10);
  const [durationS, setDurationS] = useState(60);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [joinCode, setJoinCode] = useState('');

  const categoryOptions = visibleCategoryOptionsFor(profile.email, { includePlayOnly: true });
  const toggleCategory = (c: CategoryType) =>
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

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
                    setError(err instanceof Error ? err.message : friendlyError(err));
                  }
                }}
              />
            </div>
            {error && (
              <Text type="supporting" color="secondary" justify="center">
                {error}
              </Text>
            )}
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
        host_name: displayNameFromProfile(profile, 'Host'),
        mode,
        count,
        categories: selectedCategories,
        duration_s: durationS,
      });
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
        display_name: displayNameFromProfile(profile, 'Player'),
      });
      navigate(`/play/${code}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: isDesktop ? 980 : 560, margin: '0 auto', width: '100%' }}>
      <VStack gap={3}>
        <div
          className="ss-pop"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--radius-container)',
            padding: 'clamp(1.5rem, 3.5vw, 2rem) clamp(1.25rem, 3.5vw, 1.75rem)',
            background: `radial-gradient(120% 130% at 0% -20%, ${accent}1a, transparent 65%)`,
            border: `1px solid ${accent}2e`,
          }}
        >
          <VStack gap={0.5}>
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
          <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
          <Card padding={4} width="100%">
            <VStack gap={3}>
              <VStack gap={2}>
                <Text type="label" weight="bold" color="secondary">
                  {t('play.hostGame')}
                </Text>
                <ToggleButtonGroup
                  label={t('play.gameMode')}
                  type="single"
                  size="sm"
                  value={mode}
                  onChange={(v) => v && setMode(v as 'multiplayer' | 'classroom')}
                >
                  <ToggleButton value="multiplayer" label={t('play.multiplayerFfa')} />
                  <ToggleButton value="classroom" label={t('play.classroom')} />
                </ToggleButtonGroup>
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
                        {cat.label}
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
                        : mode === 'multiplayer'
                          ? t('play.createMultiplayer')
                          : t('play.createClassroom')
                    }
                    isLoading={loading === 'create'}
                    isDisabled={loading !== null}
                    onClick={handleCreate}
                  />
                </div>
                <Text type="supporting" size="xsm" color="secondary">
                  {mode === 'multiplayer' ? t('play.multiplayerHint') : t('play.classroomHint')}
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
                <Text type="label" weight="bold" color="secondary">
                  {t('play.joinWithCode')}
                </Text>
                {/* Room code is the star of the join card: big, monospaced,
                    accent-ringed input so it reads like a ticket stub. */}
                <div
                  style={{
                    borderRadius: 14,
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
  const { user, isAuthenticated } = useAuth();
  const profile = getUserProfile(user);

  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [questionShownAt, setQuestionShownAt] = useState<number>(Date.now());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isHost = !!(user?.id && match?.host_id === user.id);
  // Records when the local client first observed the current question_started_at,
  // so a slow broadcast doesn't unfairly penalise the speed bonus.
  const clientReceivedAtRef = useRef<string | null>(null);

  // Initial join + state load.
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !code) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await joinMatch({
          code,
          user_id: user.id,
          display_name: displayNameFromProfile(profile, 'Player'),
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
    } catch {
      /* ignore — UI keeps last known state */
    }
  }, [code, user?.id]);

  // Realtime broadcast wiring.
  useEffect(() => {
    if (!code || !user?.id) return;
    const channel = joinMatchChannel(code);
    channelRef.current = channel;

    channel.subscribe('participant_joined', refresh);
    channel.subscribe('match_updated', refresh);

    // Send our own presence event after we've registered.
    channel.send('participant_joined', { sub: user.id });

    // Polling fallback for environments without Supabase Realtime enabled.
    const interval = window.setInterval(refresh, POLL_FALLBACK_MS);

    return () => {
      window.clearInterval(interval);
      channel.unsubscribe();
    };
  }, [code, user?.id, refresh]);

  // Reset per-question UI when the index changes.
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
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

  const startMatch = async () => {
    if (!user?.id || !match) return;
    try {
      await controlMatch({ code, host_id: user.id, action: 'start' });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const advance = async () => {
    if (!user?.id) return;
    try {
      await controlMatch({ code, host_id: user.id, action: 'advance' });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const finish = async () => {
    if (!user?.id) return;
    try {
      await controlMatch({ code, host_id: user.id, action: 'finish' });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const submitAnswer = async () => {
    if (selected === null || !match || !user?.id) return;
    try {
      const result = await submitMatchAnswer({
        code,
        user_id: user.id,
        question_idx: match.current_index,
        selected_idx: selected,
        duration_ms: Date.now() - questionShownAt,
        client_received_at: clientReceivedAtRef.current ?? new Date().toISOString(),
      });
      setSubmitted(true);
      broadcastUpdate();
      // In a head-to-head match the server advances as soon as we lock in.
      // Pull fresh state right away so this client jumps to the next question
      // (or the results screen) without waiting for the polling fallback.
      if (result.advanced) await refresh();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

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
          <div>
            <Button variant="secondary" label={t('common.back')} onClick={() => navigate('/play')} />
          </div>
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

        {match.status === 'lobby' && (
          <Lobby
            match={match}
            participants={participants}
            isHost={isHost}
            onStart={startMatch}
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
            onSelect={setSelected}
            onSubmit={submitAnswer}
            onAdvance={advance}
            onFinish={finish}
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
  return (
    <Button
      variant="secondary"
      size="sm"
      label={`${code} — ${copied ? t('play.copied') : t('play.copy')}`}
      onClick={() => {
        navigator.clipboard.writeText(code).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => {},
        );
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'monospace', letterSpacing: '0.2em', fontWeight: 700 }}>{code}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{copied ? t('play.copied') : t('play.copy')}</span>
      </span>
    </Button>
  );
};

function Lobby({
  match,
  participants,
  isHost,
  onStart,
}: {
  match: Match;
  participants: Participant[];
  isHost: boolean;
  onStart: () => void;
}) {
  const t = useT();
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play/${match.code}` : '';
  return (
    <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
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
          <Button
            variant="secondary"
            label={t('play.copyLink')}
            onClick={() => navigator.clipboard.writeText(shareUrl)}
          />
          {isHost && (
            <Button
              variant="primary"
              size="lg"
              label={t('play.startWithCount', { count: match.questions.length })}
              isDisabled={participants.length < 1}
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
  onSubmit,
  onAdvance,
  onFinish,
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
  onSubmit: () => void;
  onAdvance: () => void;
  onFinish: () => void;
  scoreboard: ScoreboardEntry[];
  participants: Participant[];
  hostSub?: string;
  code: string;
}) {
  const t = useT();
  const lastQuestion = questionIdx >= total - 1;
  const answeredCount = useMemo(
    () => scoreboard.filter((s) => participants.some((p) => p.user_id === s.user_id)).length,
    [scoreboard, participants],
  );

  // Countdown derived from question_started_at + question_duration_s.
  // A duration of 0 (or missing) means the host chose "no time limit".
  const durationS = match.question_duration_s ?? DEFAULT_DURATION_S;
  const noLimit = durationS <= 0;
  const startedMs = match.question_started_at ? new Date(match.question_started_at).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (noLimit) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [noLimit]);
  const remainingMs = noLimit
    ? Infinity
    : startedMs
      ? Math.max(0, startedMs + durationS * 1000 - now)
      : durationS * 1000;
  const remainingS = Math.ceil(remainingMs / 1000);
  const pctLeft = noLimit ? 100 : startedMs ? (remainingMs / (durationS * 1000)) * 100 : 100;

  // Time-up auto-lock for non-host (skipped when there is no time limit).
  useEffect(() => {
    if (!noLimit && !isHost && !submitted && remainingMs === 0 && selected !== null) {
      onSubmit();
    }
  }, [remainingMs, noLimit, isHost, submitted, selected, onSubmit]);

  const timerColor = noLimit
    ? 'var(--astryx-color-text-secondary, currentColor)'
    : remainingS <= 5
      ? 'var(--ss-error)'
      : remainingS <= 10
        ? '#c47f00'
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
              category: q.category,
              difficulty: q.difficulty,
            })}
          </Text>
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
            aria-live="polite"
            aria-atomic="true"
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

        <div>{renderQuestion(q.question)}</div>

        <VStack gap={1}>
          {q.options.map((opt, i) => {
            const isCorrect = isHost && q.correct_index === i;
            return (
              <SelectableCard
                key={i}
                label={opt}
                isSelected={isCorrect || selected === i}
                isDisabled={submitted}
                variant={isCorrect ? 'green' : 'default'}
                padding={2}
                onChange={() => onSelect(i)}
              >
                <Text>{opt}</Text>
              </SelectableCard>
            );
          })}
        </VStack>

        {!isHost && !submitted && (
          <div style={{ display: 'grid' }}>
            <Button
              variant="primary"
              label={t('play.lockIn')}
              isDisabled={selected === null}
              onClick={onSubmit}
            />
          </div>
        )}
        {!isHost && submitted && (
          <Banner
            status="success"
            title={t('play.answerLocked', {
              who: mode === 'classroom' ? t('play.theInstructor') : t('play.theHost'),
            })}
          />
        )}

        {isHost && (
          <VStack gap={1.5}>
            <Text type="supporting" size="xsm" color="secondary">
              {t('play.liveAnswers', { count: answeredCount, total: participants.length })}
            </Text>

            {mode === 'classroom' && hostSub && (
              <DistributionChart
                code={code}
                questionIdx={questionIdx}
                hostSub={hostSub}
                options={q.options}
                correctIndex={q.correct_index}
              />
            )}

            <HStack gap={1} justify="between">
              <Button variant="secondary" label={t('play.endMatch')} onClick={onFinish} />
              <Button
                variant="primary"
                label={lastQuestion ? t('play.showResults') : t('play.nextQuestion')}
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
      <VStack gap={0.5}>
        {scoreboard.map((s, i) => (
          <div
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
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text weight="medium">{s.display_name}</Text>
            </div>
            <span style={{ fontWeight: 700 }}>{s.score ?? s.correct}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.65, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {s.score != null ? `· ${s.correct}✓` : ''} · {(s.total_ms / 1000).toFixed(1)}s
            </span>
          </div>
        ))}
      </VStack>
    </VStack>
  );
}

function DistributionChart({
  code,
  questionIdx,
  hostSub,
  options,
  correctIndex,
}: {
  code: string;
  questionIdx: number;
  hostSub: string;
  options: string[];
  correctIndex?: number;
}) {
  const t = useT();
  const [buckets, setBuckets] = useState<DistributionBucket[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchDistribution(code, questionIdx, hostSub)
        .then((r) => {
          if (!cancelled) setBuckets(r.buckets);
        })
        .catch(() => {
          /* ignore — UI keeps last known state */
        });
    };
    load();
    const id = window.setInterval(load, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [code, questionIdx, hostSub]);

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
