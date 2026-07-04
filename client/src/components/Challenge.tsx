import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { apiFetch, friendlyError } from '../lib/api';
import {
  fetchChallengeBatch,
  submitChallengeScore,
  type ChallengeLeaderboard,
} from '../lib/challengeApi';
import { useChallengeLeaderboard } from '../lib/queries';
import type { Question, QuizResult } from '../types/quiz';
import {
  getCategoryHexColor,
  getCategoryLabel,
  onCategoryColorText,
} from '../lib/categories';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth, getUserProfile } from '../lib/auth';
import { BRAND, brandButtonSx, visuallyHidden } from '../theme/MuiTheme';
import { SharkFin } from './SharkFin';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { awardQuestXp } from '../lib/xp';
import { challengeRunXp } from '../lib/leveling';

// Biggest Shark Challenge: answer as many questions as you can within a fixed
// time limit, or until you collect three strikes — whichever comes first.
// Score = correct answers. Mix of all categories and difficulties. The page
// keeps its own state machine separate from the regular Quiz component.

type Phase = 'intro' | 'loading' | 'playing' | 'gameover' | 'error';

const MAX_LIVES = 3;
const LOW_BATCH_THRESHOLD = 4; // top up the buffer when this few remain
const TIME_LIMIT_S = 90; // a run lasts at most 90 seconds
const LOW_TIME_S = 15; // highlight + pulse the clock under this many seconds

/** Seconds → "m:ss" (e.g. 90 → "1:30"). Clamps negatives to 0. */
const fmtClock = (s: number): string => {
  const safe = Math.max(0, s);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

interface AnsweredQ {
  questionId: string;
  selectedIndex: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  question: Question;
}

interface BufferState {
  sessionId: string;
  queue: Question[];
}

export default function Challenge() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const profile = getUserProfile(user);

  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);

  // Leaderboard preview (intro screen + game-over) via TanStack Query.
  const boardQuery = useChallengeLeaderboard();
  const board: ChallengeLeaderboard | null = boardQuery.data ?? null;
  const boardLoading = boardQuery.isPending;

  // Active run state.
  const [score, setScore] = useState(0);
  const [livesLost, setLivesLost] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<AnsweredQ | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState<string>(profile.name ?? '');
  const [submittedScore, setSubmittedScore] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  // Seconds remaining in the current run; the countdown effect drives it down.
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_S);

  // Buffered question batches: we always keep one round of questions ready so
  // the next question appears instantly after each grade.
  const buffer = useRef<BufferState | null>(null);
  const topupInFlight = useRef<Promise<void> | null>(null);
  // Guards the once-per-run XP/token payout on game over.
  const awardedRef = useRef(false);
  // Focus target when the run ends, so AT users hear the transition.
  const gameOverHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  const livesLeft = MAX_LIVES - livesLost;

  /* ─── leaderboard ───────────────────────────────────────────── */

  // Leaderboard is best-effort (the query never surfaces errors to the UI);
  // refetch it after a score is submitted.
  const refreshLeaderboard = boardQuery.refetch;

  useEffect(() => {
    if (profile.name && !name) setName(profile.name);
  }, [profile.name, name]);

  /* ─── question buffer ───────────────────────────────────────── */

  const ensureBufferTopUp = useCallback(
    async (excluded: string[]) => {
      if (topupInFlight.current) return topupInFlight.current;
      const p = (async () => {
        try {
          const batch = await fetchChallengeBatch({ exclude: excluded, lang });
          // First batch or a refill — replace queue (the previous one was drained).
          buffer.current = { sessionId: batch.sessionId, queue: [...batch.questions] };
        } catch (err) {
          // Surface the first failure; on later refills we just keep what we have.
          if (!buffer.current) {
            setPhase('error');
            setError(friendlyError(err));
          }
        }
      })();
      topupInFlight.current = p;
      try {
        await p;
      } finally {
        topupInFlight.current = null;
      }
    },
    [lang],
  );

  const popNext = useCallback((): Question | null => {
    const buf = buffer.current;
    if (!buf || buf.queue.length === 0) return null;
    return buf.queue.shift() ?? null;
  }, []);

  /* ─── game flow ─────────────────────────────────────────────── */

  const startRun = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setScore(0);
    setLivesLost(0);
    setSeenIds([]);
    setSelected(null);
    setLastResult(null);
    setSubmittedScore(false);
    setTimeLeft(TIME_LIMIT_S);
    awardedRef.current = false;
    buffer.current = null;
    const startedAt = Date.now();
    await ensureBufferTopUp([]);
    await holdLoadingScreen(startedAt);
    if (!buffer.current) return; // ensureBufferTopUp already set the error phase
    const next = popNext();
    if (!next) {
      setPhase('error');
      setError('No questions available right now.');
      return;
    }
    setCurrent(next);
    setSeenIds([next.id]);
    setPhase('playing');
  }, [ensureBufferTopUp, popNext]);

  const advance = useCallback(
    async (becameGameOver: boolean) => {
      if (becameGameOver) {
        setPhase('gameover');
        return;
      }
      // Eagerly refill so the next question is ready before we render it.
      const remaining = buffer.current?.queue.length ?? 0;
      if (remaining <= LOW_BATCH_THRESHOLD && !topupInFlight.current) {
        // fire-and-forget; the next pop below uses whatever's available
        void ensureBufferTopUp(seenIds);
      }
      let next = popNext();
      if (!next) {
        // Buffer ran dry while topping up — await it.
        await ensureBufferTopUp(seenIds);
        next = popNext();
      }
      if (!next) {
        setPhase('error');
        setError('No more questions available right now.');
        return;
      }
      setCurrent(next);
      // Cap the seen-ids list so a long run doesn't grow the `exclude`
      // query string without bound. The server caps at 500 already; we keep
      // the most recent 300 client-side to keep `advance` and the request
      // payload light.
      setSeenIds((prev) => [...prev, next!.id].slice(-300));
      setSelected(null);
      setLastResult(null);
    },
    [ensureBufferTopUp, popNext, seenIds],
  );

  const submitAnswer = useCallback(async () => {
    if (selected == null || !current || !buffer.current || submitting) return;
    setSubmitting(true);
    try {
      const result = await apiFetch<QuizResult>('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: buffer.current.sessionId,
          answers: { [current.id]: selected },
          lang,
        }),
      });
      const r = result.results[0];
      const answered: AnsweredQ = {
        questionId: current.id,
        selectedIndex: selected,
        correctAnswer: r?.correctAnswer ?? -1,
        isCorrect: !!r?.isCorrect,
        explanation: r?.explanation ?? '',
        question: current,
      };
      setLastResult(answered);
      if (answered.isCorrect) {
        setScore((s) => s + 1);
      } else {
        setLivesLost((l) => l + 1);
      }
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }, [selected, current, lang, submitting]);

  const onContinue = useCallback(() => {
    const willGameOver = lastResult ? !lastResult.isCorrect && livesLost >= MAX_LIVES : false;
    void advance(willGameOver);
  }, [advance, lastResult, livesLost]);

  /* ─── leaderboard submit on game over ───────────────────────── */

  const onSubmitScore = useCallback(async () => {
    if (scoreSubmitting) return;
    const cleaned = name.trim();
    if (!cleaned) {
      setSnack(t('challenge.nameRequired'));
      return;
    }
    setScoreSubmitting(true);
    try {
      await submitChallengeScore({ name: cleaned, score });
      setSubmittedScore(true);
      setSnack(t('challenge.scoreSubmitted'));
      void refreshLeaderboard();
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setScoreSubmitting(false);
    }
  }, [name, score, refreshLeaderboard, t, scoreSubmitting]);

  /* ─── countdown clock ───────────────────────────────────────── */

  // A run is capped at TIME_LIMIT_S. While playing, tick once per second and
  // end the run the moment the clock hits zero (independent of the strikes
  // rule — whichever ends the run first wins).
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('gameover');
      return;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  /* ─── reward on game over ───────────────────────────────────── */

  // Every finished run pays out XP (and tokens, which follow from XP) — a base
  // for finishing plus a bonus per correct answer — so a challenge is never
  // empty-handed. Guarded so it credits exactly once per run.
  useEffect(() => {
    if (phase === 'gameover' && !awardedRef.current) {
      awardedRef.current = true;
      awardQuestXp(challengeRunXp(score), 'quiz');
    }
    // Announce the run's end to AT by moving focus to the game-over heading.
    if (phase === 'gameover') {
      requestAnimationFrame(() => gameOverHeadingRef.current?.focus());
    }
  }, [phase, score]);

  /* ─── keyboard during play ──────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing' || !current) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (lastResult) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onContinue();
        }
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < current.options.length) {
          e.preventDefault();
          setSelected(idx);
        }
      } else if (e.key === 'Enter' && selected != null) {
        e.preventDefault();
        void submitAnswer();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, current, selected, lastResult, submitAnswer, onContinue]);

  /* ─── render ────────────────────────────────────────────────── */

  const champion = board?.champion ?? null;

  const livesIndicator = useMemo(
    () => (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} aria-label={t('challenge.livesAria', { left: livesLeft })}>
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <Box key={i} sx={{ opacity: i < livesLeft ? 1 : 0.2 }}>
            <SharkFin size={20} color={i < livesLeft ? BRAND.green : '#888'} />
          </Box>
        ))}
      </Box>
    ),
    [livesLeft, t],
  );

  if (phase === 'intro') {
    return (
      <Box sx={introWrapperSx}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          {t('challenge.title')}
        </Typography>

        {/* The rules list is the single explanation — no duplicate prose above. */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: BRAND.green }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('challenge.howItWorks')}
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary', fontSize: '0.9rem' }}>
            <li>{t('challenge.rule1')}</li>
            <li>{t('challenge.rule2')}</li>
            <li>{t('challenge.rule3')}</li>
            <li>{t('challenge.rule4')}</li>
          </Box>
        </Paper>

        <ChampionBadge champion={champion} loading={boardLoading} />

        <Button
          variant="contained"
          size="large"
          onClick={() => void startRun()}
          fullWidth
          sx={{ mt: 2, py: 1.5, fontWeight: 700, textTransform: 'none', ...brandButtonSx }}
        >
          {t('challenge.startButton')}
        </Button>

        {board && board.top.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="overline" color="text.secondary">
              {t('challenge.hallOfFame')}
            </Typography>
            <LeaderboardList board={board} />
          </Box>
        )}
      </Box>
    );
  }

  if (phase === 'loading') {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
  }

  if (phase === 'error') {
    return (
      <Box sx={introWrapperSx}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || t('error.somethingWrong')}
        </Alert>
        <Button variant="outlined" onClick={() => void startRun()}>
          {t('quiz.retry')}
        </Button>
      </Box>
    );
  }

  if (phase === 'gameover') {
    return (
      <Box sx={introWrapperSx}>
        <Typography
          ref={gameOverHeadingRef}
          tabIndex={-1}
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, mb: 0.5, textAlign: 'center', outline: 'none' }}
        >
          {t('challenge.gameOver')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1.5 }} role="status">
          {timeLeft <= 0 ? t('challenge.endedByTime') : t('challenge.endedByStrikes')}
        </Typography>
        {/* The big number IS the score — no repeated caption underneath. */}
        <Typography variant="h2" sx={{ textAlign: 'center', mb: 3, color: BRAND.green, fontWeight: 800 }}>
          {score}
        </Typography>

        <ChampionBadge champion={champion} loading={boardLoading} dim={!!champion && score > champion.score} />

        {!submittedScore ? (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('challenge.submitPrompt')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                size="small"
                sx={{ flex: '1 1 auto' }}
                label={t('challenge.nameLabel')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ maxLength: 40 }}
              />
              <Button
                variant="contained"
                onClick={() => void onSubmitScore()}
                disabled={scoreSubmitting}
                sx={{ ...brandButtonSx, flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {scoreSubmitting ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : t('challenge.submitScore')}
              </Button>
            </Box>
          </Paper>
        ) : (
          <Alert severity="success" sx={{ mt: 2 }}>
            {t('challenge.scoreSubmitted')}
          </Alert>
        )}

        {board && board.top.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="overline" color="text.secondary">
              {t('challenge.hallOfFame')}
            </Typography>
            <LeaderboardList board={board} />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 3, justifyContent: 'center' }}>
          <Button variant="contained" onClick={() => void startRun()} sx={brandButtonSx}>
            {t('challenge.playAgain')}
          </Button>
          <Button variant="outlined" onClick={() => setPhase('intro')}>
            {t('challenge.backToIntro')}
          </Button>
        </Box>

        <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)} message={snack ?? ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
      </Box>
    );
  }

  // ── playing ──
  if (!current) return null;

  return (
    // One-viewport layout matching the Quiz card geometry: 560px column,
    // primary card capped at ~80% height on sm+, centred; question text
    // scrolls internally, answers + lock-in stay anchored near the bottom.
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: { xs: 680, sm: 560 }, mx: 'auto', width: '100%', p: { xs: 0.5, sm: 1 } }}>
      {/* One-shot low-time announcement for screen readers (the visual cue is
          colour + pulse, which AT users can't perceive). */}
      <Box component="span" sx={visuallyHidden} aria-live="polite">
        {timeLeft === LOW_TIME_S ? t('challenge.lowTime') : ''}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto', minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {t('challenge.score')}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: BRAND.green }}>
            {score}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Box
            role="timer"
            aria-label={t('challenge.timeAria', { seconds: Math.max(0, timeLeft) })}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              border: '1.5px solid',
              borderColor: timeLeft <= LOW_TIME_S ? 'error.main' : 'divider',
              color: timeLeft <= LOW_TIME_S ? 'error.main' : 'text.primary',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              '@keyframes chalTimePulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
              animation: timeLeft <= LOW_TIME_S ? 'chalTimePulse 1s ease-in-out infinite' : 'none',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            <ClockIcon />
            <Box component="span">{fmtClock(timeLeft)}</Box>
          </Box>
          {livesIndicator}
        </Box>
      </Box>

      <Card sx={{ borderTop: `4px solid ${BRAND.green}`, flex: '1 1 auto', minHeight: 0, maxHeight: { sm: '80%' }, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap', flexShrink: 0 }}>
            <Chip
              size="small"
              label={getCategoryLabel(current.category)}
              sx={{
                backgroundColor: getCategoryHexColor(current.category),
                color: onCategoryColorText(current.category),
                fontWeight: 600,
              }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={t('challenge.difficultyLevel', { level: current.difficulty })}
            />
          </Box>

          {/* Scrollable question region — answers below keep their position. */}
          <Box id="challenge-question" sx={{ mb: 2, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {renderQuestion(current.question)}
          </Box>

          <RadioGroup
            value={selected ?? ''}
            onChange={(e) => !lastResult && setSelected(parseInt(e.target.value, 10))}
            aria-labelledby="challenge-question"
            sx={{ flexShrink: 0, mt: 'auto' }}
          >
            {current.options.map((opt, idx) => {
              let bg: string | undefined;
              if (lastResult) {
                // Theme-derived tints so dark mode inherits the adjustment.
                if (idx === lastResult.correctAnswer) bg = 'rgba(22, 163, 74, 0.15)';
                else if (idx === lastResult.selectedIndex && !lastResult.isCorrect)
                  bg = 'rgba(220, 38, 38, 0.15)';
              }
              return (
                <FormControlLabel
                  key={idx}
                  value={idx}
                  disabled={!!lastResult}
                  control={<Radio />}
                  label={opt}
                  sx={{
                    m: 0,
                    mb: 0.5,
                    px: 1,
                    borderRadius: 1,
                    backgroundColor: bg,
                  }}
                />
              );
            })}
          </RadioGroup>

          {/* Live region: announces correct/strike + explanation to AT the
              moment the grade lands. Capped height so a long explanation
              scrolls instead of pushing the anchored answers around. */}
          <Box aria-live="assertive" sx={{ flexShrink: 0 }}>
            {lastResult && (
              <Alert severity={lastResult.isCorrect ? 'success' : 'error'} sx={{ mt: 1.5, maxHeight: '28vh', overflowY: 'auto' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {lastResult.isCorrect ? t('challenge.correct') : t('challenge.wrong')}
                </Typography>
                {lastResult.explanation && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {lastResult.explanation}
                  </Typography>
                )}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5, gap: 1, flexShrink: 0 }}>
        {!lastResult ? (
          <Button
            variant="contained"
            disabled={selected == null || submitting}
            onClick={() => void submitAnswer()}
            sx={brandButtonSx}
          >
            {submitting ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : t('challenge.lockIn')}
          </Button>
        ) : (
          <Button variant="contained" onClick={onContinue} sx={brandButtonSx}>
            {livesLost >= MAX_LIVES ? t('challenge.seeResult') : t('challenge.nextQuestion')}
          </Button>
        )}
      </Box>

      <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)} message={snack ?? ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

/** A small outline clock glyph for the countdown chip. Decorative. */
function ClockIcon() {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      sx={{ width: 15, height: 15, display: 'block' }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Box>
  );
}

const introWrapperSx = {
  maxWidth: 640,
  mx: 'auto',
  width: '100%',
  p: { xs: 2, sm: 3 },
  backgroundColor: 'background.paper',
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  borderTop: `4px solid ${BRAND.green}`,
};

function ChampionBadge({
  champion,
  loading,
  dim,
}: {
  champion: { name: string; score: number } | null;
  loading: boolean;
  dim?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        borderColor: 'divider',
        opacity: dim ? 0.6 : 1,
      }}
    >
      <SharkFin size={28} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1 }}>
          {t('challenge.currentChampion')}
        </Typography>
        {loading ? (
          <Skeleton variant="text" sx={{ fontSize: '1rem', width: 200 }} />
        ) : champion ? (
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {champion.name} — {champion.score}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('challenge.noChampion')}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

function LeaderboardList({ board }: { board: ChallengeLeaderboard }) {
  // role="list" restores list semantics that Safari/VoiceOver drop when
  // list-style is none.
  return (
    <Box component="ol" role="list" sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none' }}>
      {board.top.map((row, i) => (
        <Box
          key={row.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
            py: 0.5,
            borderBottom: i === board.top.length - 1 ? 'none' : '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
            <Typography variant="body2" sx={{ width: 24, color: 'text.secondary' }}>
              {i + 1}.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: i === 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.name}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: i === 0 ? BRAND.green : 'text.primary' }}>
            {row.score}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
