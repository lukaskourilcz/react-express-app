import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useAuth0 } from '@auth0/auth0-react';
import {
  createMatch,
  joinMatch,
  fetchMatchState,
  controlMatch,
  submitMatchAnswer,
  type Match,
  type Participant,
  type ScoreboardEntry,
} from '../lib/play';
import { joinMatchChannel, type RealtimeChannel } from '../lib/realtime';
import { friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { BRAND } from '../theme/MuiTheme';

const POLL_FALLBACK_MS = 4000;

export function PlayLanding() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const [mode, setMode] = useState<'multiplayer' | 'classroom'>('multiplayer');
  const [count, setCount] = useState(10);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

  if (!isAuthenticated) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Sign in to play live
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Multiplayer and classroom games need an account so we can show your name on the scoreboard.
        </Typography>
        <Button variant="contained" onClick={() => loginWithRedirect()} sx={{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}>
          Log in
        </Button>
      </Paper>
    );
  }

  const handleCreate = async () => {
    if (!user?.sub) return;
    setError(null);
    setLoading('create');
    try {
      const m = await createMatch({
        host_sub: user.sub,
        host_name: user.name || user.email?.split('@')[0] || 'Host',
        mode,
        count,
        categories: [],
      });
      navigate(`/play/${m.code}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(null);
    }
  };

  const handleJoin = async () => {
    if (!user?.sub) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Enter a match code');
      return;
    }
    setError(null);
    setLoading('join');
    try {
      await joinMatch({
        code,
        auth0_sub: user.sub,
        display_name: user.name || user.email?.split('@')[0] || 'Player',
      });
      navigate(`/play/${code}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
        Play live
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Race friends in multiplayer, or run a classroom session.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" component="h2" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Host a game
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          size="small"
          onChange={(_, v) => v && setMode(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="multiplayer">Multiplayer (free-for-all)</ToggleButton>
          <ToggleButton value="classroom">Classroom</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {[5, 10, 15, 20].map((n) => (
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
            questions
          </Typography>
        </Box>
        <Button
          fullWidth
          variant="contained"
          onClick={handleCreate}
          disabled={loading !== null}
          sx={{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
        >
          {loading === 'create' ? 'Creating…' : `Create ${mode} match`}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {mode === 'multiplayer'
            ? 'Anyone with the code can join. Score = correct + speed.'
            : 'Students join with the code. You control when each question advances.'}
        </Typography>
      </Paper>

      <Divider sx={{ my: 2 }}>or</Divider>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="overline" component="h2" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Join with a code
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="ABC123"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 8, style: { textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'monospace' } }}
            size="small"
          />
          <Button variant="contained" onClick={handleJoin} disabled={loading !== null}>
            {loading === 'join' ? '…' : 'Join'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export function PlayMatch() {
  const { code: codeParam } = useParams<{ code: string }>();
  const code = (codeParam || '').toUpperCase();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth0();

  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [questionShownAt, setQuestionShownAt] = useState<number>(Date.now());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isHost = user?.sub && match?.host_sub === user.sub;

  // Initial join + state load.
  useEffect(() => {
    if (!isAuthenticated || !user?.sub || !code) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await joinMatch({
          code,
          auth0_sub: user.sub!,
          display_name: user.name || user.email?.split('@')[0] || 'Player',
        });
        if (cancelled) return;
        setMatch(m);
        const state = await fetchMatchState(code, user.sub);
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

  // Realtime broadcast wiring.
  useEffect(() => {
    if (!code || !user?.sub) return;
    const channel = joinMatchChannel(code);
    channelRef.current = channel;

    const refresh = async () => {
      try {
        const state = await fetchMatchState(code, user.sub);
        setMatch(state.match);
        setParticipants(state.participants);
        setScoreboard(state.scoreboard);
      } catch {
        /* ignore — UI keeps last known state */
      }
    };

    channel.subscribe('participant_joined', refresh);
    channel.subscribe('match_updated', refresh);

    // Send our own presence event after we've registered.
    channel.send('participant_joined', { sub: user.sub });

    // Polling fallback for environments without Supabase Realtime enabled.
    const interval = window.setInterval(refresh, POLL_FALLBACK_MS);

    return () => {
      window.clearInterval(interval);
      channel.unsubscribe();
    };
  }, [code, user?.sub]);

  // Reset per-question UI when the index changes.
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setQuestionShownAt(Date.now());
  }, [match?.current_index, match?.status]);

  const broadcastUpdate = () => {
    channelRef.current?.send('match_updated', { at: Date.now() });
  };

  const startMatch = async () => {
    if (!user?.sub || !match) return;
    try {
      await controlMatch({ code, host_sub: user.sub, action: 'start' });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const advance = async () => {
    if (!user?.sub) return;
    try {
      await controlMatch({ code, host_sub: user.sub, action: 'advance' });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const finish = async () => {
    if (!user?.sub) return;
    try {
      await controlMatch({ code, host_sub: user.sub, action: 'finish' });
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const submitAnswer = async () => {
    if (selected === null || !match || !user?.sub) return;
    try {
      await submitMatchAnswer({
        code,
        auth0_sub: user.sub,
        question_idx: match.current_index,
        selected_idx: selected,
        duration_ms: Date.now() - questionShownAt,
      });
      setSubmitted(true);
      broadcastUpdate();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  if (joining) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress sx={{ color: BRAND.green }} />
      </Box>
    );
  }

  if (error && !match) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => navigate('/play')}>Back</Button>
      </Box>
    );
  }
  if (!match) return null;

  const totalQuestions = match.questions.length;
  const currentQuestion = match.questions[match.current_index];
  const willHostHide = match.mode === 'multiplayer' && !isHost;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            {match.mode === 'classroom' ? 'Classroom' : 'Multiplayer'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Hosted by {match.host_name}
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
          isHost={!!isHost}
          onStart={startMatch}
        />
      )}

      {match.status === 'running' && currentQuestion && (
        <RunningQuestion
          questionIdx={match.current_index}
          total={totalQuestions}
          q={currentQuestion}
          isHost={!!isHost}
          mode={match.mode}
          selected={selected}
          submitted={submitted}
          willHide={willHostHide && match.mode === 'multiplayer' && false}
          onSelect={setSelected}
          onSubmit={submitAnswer}
          onAdvance={advance}
          onFinish={finish}
          scoreboard={scoreboard}
          participants={participants}
        />
      )}

      {match.status === 'finished' && (
        <Finished match={match} scoreboard={scoreboard} onLeave={() => navigate('/play')} />
      )}
    </Box>
  );
}

const CodeBadge = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Chip
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.2em' }}>{code}</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{copied ? 'copied' : 'copy'}</span>
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
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play/${match.code}` : '';
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Lobby
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Share the code <strong>{match.code}</strong> with players, then{' '}
        {isHost ? 'press start when everyone has joined.' : 'wait for the host to start.'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 3 }}>
        {participants.map((p) => (
          <Box
            key={p.auth0_sub}
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
            {p.auth0_sub === match.host_sub && <Chip size="small" label="Host" />}
          </Box>
        ))}
        {participants.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No players yet.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={() => navigator.clipboard.writeText(shareUrl)}
        >
          Copy link
        </Button>
        {isHost && (
          <Button
            variant="contained"
            onClick={onStart}
            disabled={participants.length < 1}
            sx={{ ml: 'auto', backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
          >
            Start ({match.questions.length} questions)
          </Button>
        )}
      </Box>
    </Paper>
  );
}

function RunningQuestion({
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
}: {
  questionIdx: number;
  total: number;
  q: NonNullable<Match['questions'][number]>;
  isHost: boolean;
  mode: Match['mode'];
  selected: number | null;
  submitted: boolean;
  willHide?: boolean;
  onSelect: (i: number) => void;
  onSubmit: () => void;
  onAdvance: () => void;
  onFinish: () => void;
  scoreboard: ScoreboardEntry[];
  participants: Participant[];
}) {
  const lastQuestion = questionIdx >= total - 1;
  const answeredCount = useMemo(
    () => scoreboard.filter((s) => participants.some((p) => p.auth0_sub === s.auth0_sub)).length,
    [scoreboard, participants],
  );

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary">
        Question {questionIdx + 1} of {total} · {q.category} · difficulty {q.difficulty}
      </Typography>
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
          sx={{ mt: 2, backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
        >
          Lock in answer
        </Button>
      )}
      {!isHost && submitted && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Answer locked. Waiting for {mode === 'classroom' ? 'the instructor' : 'the host'} to advance…
        </Alert>
      )}

      {isHost && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Live answers received: {answeredCount}/{participants.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button variant="outlined" onClick={onFinish}>
              End match
            </Button>
            <Button
              variant="contained"
              onClick={onAdvance}
              sx={{ ml: 'auto', backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
            >
              {lastQuestion ? 'Show results' : 'Next question →'}
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
  if (scoreboard.length === 0) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', mb: 1 }}>
        Live scoreboard
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {scoreboard.map((s, i) => (
          <Box
            key={s.auth0_sub}
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
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
              {s.display_name}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {s.correct}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {(s.total_ms / 1000).toFixed(1)}s
            </Typography>
          </Box>
        ))}
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
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Match complete
      </Typography>
      {scoreboard.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          🏆 Winner: <strong>{scoreboard[0].display_name}</strong> — {scoreboard[0].correct}/
          {match.questions.length}
        </Typography>
      )}
      <Box sx={{ textAlign: 'left' }}>
        <ScoreboardList scoreboard={scoreboard} />
      </Box>
      <Button onClick={onLeave} sx={{ mt: 3 }} variant="contained">
        Back
      </Button>
    </Paper>
  );
}

export default PlayLanding;
