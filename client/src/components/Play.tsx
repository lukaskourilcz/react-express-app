import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
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
import type { CategoryType } from '../types/quiz';
import { friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
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
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('play.signInTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('play.signInBody')}
        </Typography>
        <Button
          variant="contained"
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (err) {
              setError(err instanceof Error ? err.message : friendlyError(err));
            }
          }}
          sx={brandButtonSx}
        >
          {t('auth.logIn')}
        </Button>
      </Paper>
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
    <Box sx={{ maxWidth: { xs: 520, md: 900 }, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('play.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('play.subtitle')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Host + Join sit side by side on desktop (2:1) so the short "join" card
          no longer stacks below the tall host card. They stack on mobile. */}
      <Box sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: '2fr 1fr' }, columnGap: { md: 2.5 }, alignItems: 'start' }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" component="h2" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {t('play.hostGame')}
        </Typography>
        <ToggleButtonGroup
          aria-label={t('play.gameMode')}
          value={mode}
          exclusive
          size="small"
          onChange={(_, v) => v && setMode(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="multiplayer" aria-label={t('play.multiplayerFfa')}>
            {t('play.multiplayerFfa')}
          </ToggleButton>
          <ToggleButton value="classroom" aria-label={t('play.classroom')}>
            {t('play.classroom')}
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline" component="h3" color="text.secondary">
            {t('play.categories')}
          </Typography>
          {selectedCategories.length > 0 && (
            <Button
              size="small"
              onClick={() => setSelectedCategories([])}
              sx={{ fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary', minWidth: 'auto', p: '2px 8px' }}
            >
              {t('play.clear')}
            </Button>
          )}
        </Box>
        <Box
          role="group"
          aria-label={t('play.categories')}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}
        >
          {categoryOptions.map((cat) => {
            const selected = selectedCategories.includes(cat.value);
            return (
              <Chip
                key={cat.value}
                label={cat.label}
                onClick={() => toggleCategory(cat.value)}
                role="checkbox"
                aria-checked={selected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCategory(cat.value);
                  }
                }}
                size="small"
                sx={{
                  cursor: 'pointer',
                  backgroundColor: 'background.paper',
                  color: selected ? cat.color : 'text.secondary',
                  border: selected ? `2px solid ${cat.color}` : '1px solid',
                  borderColor: selected ? cat.color : 'divider',
                  borderLeft: `4px solid ${cat.color}`,
                  borderRadius: 1,
                  fontWeight: selected ? 600 : 500,
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              />
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {selectedCategories.length === 0
            ? t('play.allCategoriesHint')
            : t('play.categoriesSelected', { count: selectedCategories.length })}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {config.play.countOptions.map((n) => (
            <Button
              key={n}
              variant="outlined"
              size="small"
              onClick={() => setCount(n)}
              sx={{
                minWidth: 44,
                borderColor: count === n ? BRAND.green : 'divider',
                color: count === n ? BRAND.green : 'text.secondary',
              }}
            >
              {n}
            </Button>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
            {t('play.questions')}
          </Typography>
        </Box>
        <Typography variant="overline" component="h3" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('play.timeLimit')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {config.play.durationOptionsS.map((n) => (
            <Button
              key={n}
              variant="outlined"
              size="small"
              onClick={() => setDurationS(n)}
              sx={{
                minWidth: 44,
                borderColor: durationS === n ? BRAND.green : 'divider',
                color: durationS === n ? BRAND.green : 'text.secondary',
              }}
            >
              {formatDuration(n, t)}
            </Button>
          ))}
        </Box>
        <Button
          fullWidth
          variant="contained"
          onClick={handleCreate}
          disabled={loading !== null}
          sx={brandButtonSx}
        >
          {loading === 'create'
            ? t('play.creating')
            : mode === 'multiplayer'
              ? t('play.createMultiplayer')
              : t('play.createClassroom')}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {mode === 'multiplayer' ? t('play.multiplayerHint') : t('play.classroomHint')}
        </Typography>
      </Paper>

      <Box>
        <Divider sx={{ my: 2, display: { xs: 'block', md: 'none' } }}>{t('play.or')}</Divider>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" component="h2" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {t('play.joinWithCode')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextField
            fullWidth
            label={t('play.matchCode')}
            placeholder="ABC123"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            inputProps={{
              maxLength: 8,
              style: { textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'monospace' },
              'aria-label': t('play.matchCode'),
            }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleJoin}
            disabled={loading !== null}
            sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
          >
            {loading === 'join' ? '…' : t('play.join')}
          </Button>
        </Box>
        </Paper>
      </Box>
      </Box>
    </Box>
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
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          mt: 6,
        }}
      >
        <CircularProgress sx={{ color: BRAND.green }} aria-hidden />
        <Typography variant="body2" color="text.secondary">
          {t('play.joining')}
        </Typography>
      </Box>
    );
  }

  if (error && !match) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => navigate('/play')}>{t('common.back')}</Button>
      </Box>
    );
  }
  if (!match) return null;

  const totalQuestions = match.questions.length;
  const currentQuestion = match.questions[match.current_index];

  return (
    <Box sx={{ maxWidth: { xs: 600, md: 820 }, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            {match.mode === 'classroom' ? t('play.classroom') : t('play.multiplayer')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('play.hostedBy', { name: match.host_name })}
          </Typography>
        </Box>
        <CodeBadge code={code} />
      </Box>

      {error && (
        <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
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
    </Box>
  );
}

const CodeBadge = ({ code }: { code: string }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <Chip
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.2em' }}>{code}</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{copied ? t('play.copied') : t('play.copy')}</span>
        </Box>
      }
      onClick={() => {
        navigator.clipboard.writeText(code).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => {},
        );
      }}
      sx={{ fontWeight: 700, cursor: 'pointer' }}
    />
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
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('play.lobby')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('play.shareInstructions', {
          code: match.code,
          action: isHost ? t('play.actionHostStart') : t('play.actionGuestWait'),
        })}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 3 }}>
        {participants.map((p) => (
          <Box
            key={p.user_id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: BRAND.greenSoft,
                color: BRAND.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {p.display_name.slice(0, 1).toUpperCase()}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
              {p.display_name}
            </Typography>
            {p.user_id === match.host_id && <Chip size="small" label={t('play.host')} />}
          </Box>
        ))}
        {participants.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {t('play.noPlayers')}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          variant="outlined"
          onClick={() => navigator.clipboard.writeText(shareUrl)}
        >
          {t('play.copyLink')}
        </Button>
        {isHost && (
          <Button
            variant="contained"
            onClick={onStart}
            disabled={participants.length < 1}
            sx={{ ml: 'auto', ...brandButtonSx }}
          >
            {t('play.startWithCount', { count: match.questions.length })}
          </Button>
        )}
      </Box>
    </Paper>
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

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {t('play.questionMeta', {
            idx: questionIdx + 1,
            total,
            category: q.category,
            difficulty: q.difficulty,
          })}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: noLimit
              ? 'text.secondary'
              : remainingS <= 5
                ? 'error.main'
                : remainingS <= 10
                  ? 'warning.dark'
                  : 'text.secondary',
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          ⏱ {noLimit ? '∞' : `${remainingS}s`}
        </Typography>
      </Box>
      <Box
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: 'action.hover',
          overflow: 'hidden',
          mb: 2,
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${pctLeft}%`,
            backgroundColor: remainingS <= 5 ? 'error.main' : BRAND.green,
            transition: 'width 0.25s linear',
          }}
        />
      </Box>
      <Box sx={{ my: 2 }}>{renderQuestion(q.question)}</Box>

      <RadioGroup
        value={selected ?? ''}
        onChange={(e) => onSelect(parseInt(e.target.value, 10))}
      >
        {q.options.map((opt, i) => {
          const isCorrect = isHost && q.correct_index === i;
          return (
            <FormControlLabel
              key={i}
              value={i}
              disabled={submitted}
              control={<Radio />}
              label={opt}
              sx={
                isCorrect
                  ? {
                      borderColor: BRAND.green,
                      backgroundColor: BRAND.greenSoft,
                    }
                  : undefined
              }
            />
          );
        })}
      </RadioGroup>

      {!isHost && !submitted && (
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={selected === null}
          sx={{ mt: 2, ...brandButtonSx }}
        >
          {t('play.lockIn')}
        </Button>
      )}
      {!isHost && submitted && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('play.answerLocked', {
            who: mode === 'classroom' ? t('play.theInstructor') : t('play.theHost'),
          })}
        </Alert>
      )}

      {isHost && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('play.liveAnswers', { count: answeredCount, total: participants.length })}
          </Typography>

          {mode === 'classroom' && hostSub && (
            <DistributionChart code={code} questionIdx={questionIdx} hostSub={hostSub} options={q.options} correctIndex={q.correct_index} />
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button variant="outlined" onClick={onFinish}>
              {t('play.endMatch')}
            </Button>
            <Button
              variant="contained"
              onClick={onAdvance}
              sx={{ ml: 'auto', ...brandButtonSx }}
            >
              {lastQuestion ? t('play.showResults') : t('play.nextQuestion')}
            </Button>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />
      <ScoreboardList scoreboard={scoreboard} />
    </Paper>
  );
}

function ScoreboardList({ scoreboard }: { scoreboard: ScoreboardEntry[] }) {
  const t = useT();
  if (scoreboard.length === 0) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', mb: 1 }}>
        {t('play.liveScoreboard')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {scoreboard.map((s, i) => (
          <Box
            key={s.user_id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.75,
              borderRadius: 1,
              backgroundColor: i === 0 ? 'rgba(45,122,45,0.08)' : 'transparent',
            }}
          >
            <Typography variant="caption" sx={{ width: 24, fontWeight: 700, color: i === 0 ? BRAND.green : 'text.secondary' }}>
              {i + 1}
            </Typography>
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.display_name}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {s.score ?? s.correct}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {s.score != null ? `· ${s.correct}✓` : ''} · {(s.total_ms / 1000).toFixed(1)}s
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
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
    <Box sx={{ mt: 2 }}>
      <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', mb: 1 }}>
        {t('play.classAnswers')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {options.map((opt, i) => {
          const b = buckets.find((x) => x.selected_idx === i);
          const count = b?.count ?? 0;
          const pct = (count / total) * 100;
          const isCorrect = correctIndex === i;
          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{ width: 18, fontWeight: 700, color: isCorrect ? BRAND.green : 'text.secondary' }}
              >
                {String.fromCharCode(65 + i)}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: 22,
                  borderRadius: 1,
                  backgroundColor: 'action.hover',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: isCorrect ? BRAND.green : 'rgba(0,0,0,0.25)',
                    transition: 'width 0.4s ease',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'text.primary',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 'calc(100% - 50px)',
                  }}
                >
                  {opt}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
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
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {t('play.matchComplete')}
      </Typography>
      {scoreboard.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('play.winner', {
            name: scoreboard[0].display_name,
            correct: scoreboard[0].correct,
            total: match.questions.length,
          })}
        </Typography>
      )}
      <Box sx={{ textAlign: 'left' }}>
        <ScoreboardList scoreboard={scoreboard} />
      </Box>
      <Button onClick={onLeave} sx={{ mt: 3 }} variant="contained">
        {t('common.back')}
      </Button>
    </Paper>
  );
}

export default PlayLanding;
