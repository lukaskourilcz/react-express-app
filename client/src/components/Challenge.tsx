import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Snackbar, TextField } from '@mui/material';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
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
import { SharkFin } from './SharkFin';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { awardQuestXp } from '../lib/xp';
import { challengeRunXp } from '../lib/leveling';

// Biggest Shark Challenge: answer as many questions as you can within a fixed
// time limit, or until you collect three strikes — whichever comes first.
// Score = correct answers. Mix of all categories and difficulties. The page
// keeps its own state machine separate from the regular Quiz component.
//
// Redesigned on the Astryx design system: SelectableCard answer options, a
// ProgressBar countdown, Astryx Cards/Buttons/Badges and typography. Only the
// presentation changed — the timers, scoring, buffering and payout are intact.

type Phase = 'intro' | 'loading' | 'playing' | 'gameover' | 'error';

const MAX_LIVES = 3;
const LOW_BATCH_THRESHOLD = 4; // top up the buffer when this few remain
const TIME_LIMIT_S = 90; // a run lasts at most 90 seconds
const LOW_TIME_S = 15; // highlight the clock under this many seconds

// Screen-reader-only visually-hidden style for the live low-time announcement.
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

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
  const gameOverHeadingRef = useRef<HTMLDivElement | null>(null);
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
      <div
        style={{ display: 'flex', gap: 4, alignItems: 'center' }}
        aria-label={t('challenge.livesAria', { left: livesLeft })}
      >
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <div key={i} style={{ opacity: i < livesLeft ? 1 : 0.2, display: 'flex' }}>
            <SharkFin size={20} color={i < livesLeft ? 'var(--brand-accent)' : '#888'} />
          </div>
        ))}
      </div>
    ),
    [livesLeft, t],
  );

  if (phase === 'intro') {
    return (
      <div style={pageWrapStyle}>
        <VStack gap={3} width="100%">
          {/* High-energy shark hero: a glowing tinted panel with a floating
              fin, the big title and the 🦈 mascot. */}
          <div
            className="ss-pop"
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 24,
              padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
              textAlign: 'center',
              background:
                'radial-gradient(120% 120% at 50% -10%, color-mix(in srgb, var(--brand-accent) 22%, transparent), transparent 70%)',
              border: '1px solid color-mix(in srgb, var(--brand-accent) 30%, transparent)',
              boxShadow: '0 16px 40px color-mix(in srgb, var(--brand-accent) 18%, transparent)',
            }}
          >
            <span aria-hidden className="ss-float" style={{ position: 'absolute', top: 14, left: 20, fontSize: '1.5rem', opacity: 0.7 }}>🌊</span>
            <span aria-hidden className="ss-float" style={{ position: 'absolute', top: 20, right: 22, fontSize: '1.3rem', opacity: 0.6, animationDelay: '1.4s' }}>🫧</span>
            <VStack gap={1.5} align="center">
              <span className="ss-float" style={{ display: 'inline-flex', fontSize: '2.6rem', lineHeight: 1 }} aria-hidden>
                🦈
              </span>
              <HStack gap={1.5} align="center" justify="center">
                <SharkFin size={30} />
                <Heading level={1} type="display-3" justify="center">
                  <span className="ss-gradient-text">{t('challenge.title')}</span>
                </Heading>
              </HStack>
            </VStack>
          </div>

          {/* The rules list is the single explanation — no duplicate prose above. */}
          <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
          <Card variant="muted" padding={4} width="100%">
            <VStack gap={1.5}>
              <HStack gap={1} align="center">
                <span aria-hidden style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚡</span>
                <Text type="label" color="secondary">
                  {t('challenge.howItWorks')}
                </Text>
              </HStack>
              <VStack gap={1}>
                <RuleRow text={t('challenge.rule1')} />
                <RuleRow text={t('challenge.rule2')} />
                <RuleRow text={t('challenge.rule3')} />
                <RuleRow text={t('challenge.rule4')} />
              </VStack>
            </VStack>
          </Card>
          </div>

          <ChampionBadge champion={champion} loading={boardLoading} />

          <HStack justify="center" width="100%">
            <Button
              variant="primary"
              size="lg"
              label={`🦈 ${t('challenge.startButton')}`}
              onClick={() => void startRun()}
            />
          </HStack>

          {board && board.top.length > 0 && (
            <VStack gap={1} width="100%">
              <HStack gap={1} align="center">
                <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>🏆</span>
                <Text type="label" color="secondary">
                  {t('challenge.hallOfFame')}
                </Text>
              </HStack>
              <LeaderboardList board={board} />
            </VStack>
          )}
        </VStack>
      </div>
    );
  }

  if (phase === 'loading') {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
  }

  if (phase === 'error') {
    return (
      <div style={pageWrapStyle}>
        <VStack gap={2} width="100%">
          <Banner status="error" title={error || t('error.somethingWrong')} />
          <HStack>
            <Button variant="secondary" label={t('quiz.retry')} onClick={() => void startRun()} />
          </HStack>
        </VStack>
      </div>
    );
  }

  if (phase === 'gameover') {
    return (
      <div style={pageWrapStyle}>
        <VStack gap={3} width="100%" align="center">
          <span aria-hidden className="ss-float" style={{ fontSize: '3rem', lineHeight: 1 }}>
            {score > 0 ? '🎉' : '🦈'}
          </span>
          <div ref={gameOverHeadingRef} tabIndex={-1} style={{ outline: 'none' }}>
            <Heading level={1} type="display-3" justify="center">
              <span className="ss-gradient-text">{t('challenge.gameOver')}</span>
            </Heading>
          </div>
          <div role="status">
            <Text type="body" color="secondary" justify="center">
              {timeLeft <= 0 ? t('challenge.endedByTime') : t('challenge.endedByStrikes')}
            </Text>
          </div>
          {/* The big number IS the score — no repeated caption underneath. */}
          <div
            className="ss-pop"
            style={{
              fontSize: 'clamp(3.25rem, 13vw, 5rem)',
              fontWeight: 800,
              lineHeight: 1,
              color: 'var(--brand-accent)',
              textShadow: '0 8px 30px color-mix(in srgb, var(--brand-accent) 35%, transparent)',
            }}
          >
            {score}
          </div>

          <div style={{ width: '100%' }}>
            <ChampionBadge
              champion={champion}
              loading={boardLoading}
              dim={!!champion && score > champion.score}
            />
          </div>

          {!submittedScore ? (
            <Card variant="default" padding={4} width="100%">
              <VStack gap={1.5}>
                <Text type="body">{t('challenge.submitPrompt')}</Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    sx={{ flex: '1 1 200px' }}
                    label={t('challenge.nameLabel')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    inputProps={{ maxLength: 40 }}
                  />
                  <Button
                    variant="primary"
                    label={t('challenge.submitScore')}
                    isLoading={scoreSubmitting}
                    isDisabled={scoreSubmitting}
                    onClick={() => void onSubmitScore()}
                  />
                </div>
              </VStack>
            </Card>
          ) : (
            <div style={{ width: '100%' }}>
              <Banner status="success" title={t('challenge.scoreSubmitted')} />
            </div>
          )}

          {board && board.top.length > 0 && (
            <VStack gap={1} width="100%">
              <HStack gap={1} align="center">
                <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>🏆</span>
                <Text type="label" color="secondary">
                  {t('challenge.hallOfFame')}
                </Text>
              </HStack>
              <LeaderboardList board={board} />
            </VStack>
          )}

          <HStack gap={1.5} justify="center" wrap="wrap">
            <Button variant="primary" label={t('challenge.playAgain')} onClick={() => void startRun()} />
            <Button variant="secondary" label={t('challenge.backToIntro')} onClick={() => setPhase('intro')} />
          </HStack>
        </VStack>

        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
          message={snack ?? ''}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </div>
    );
  }

  // ── playing ──
  if (!current) return null;

  const timeLow = timeLeft <= LOW_TIME_S;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
      {/* One-shot low-time announcement for screen readers (the visual cue is
          colour, which AT users can't perceive). */}
      <span style={srOnly} aria-live="polite">
        {timeLeft === LOW_TIME_S ? t('challenge.lowTime') : ''}
      </span>

      <VStack gap={3} width="100%">
        {/* Status: score + lives, then the countdown bar. */}
        <VStack gap={1.5} width="100%">
          <HStack justify="between" align="center" gap={2} width="100%">
            <HStack gap={1} align="center">
              <Text type="label" color="secondary">
                {t('challenge.score')}
              </Text>
              <Heading level={3}>
                <span style={{ color: 'var(--brand-accent)' }}>{score}</span>
              </Heading>
            </HStack>
            {livesIndicator}
          </HStack>

          <HStack gap={1.5} align="center" width="100%">
            <div
              role="timer"
              aria-label={t('challenge.timeAria', { seconds: Math.max(0, timeLeft) })}
              className={timeLow ? 'ss-float' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: '1.05rem',
                fontVariantNumeric: 'tabular-nums',
                color: timeLow ? 'var(--color-error-text, #dc2626)' : 'var(--brand-accent)',
                background: timeLow
                  ? 'color-mix(in srgb, var(--color-error-text, #dc2626) 14%, transparent)'
                  : 'color-mix(in srgb, var(--brand-accent) 12%, transparent)',
                minWidth: 68,
                justifyContent: 'center',
              }}
            >
              <ClockIcon />
              <span>{fmtClock(timeLeft)}</span>
            </div>
            <div style={{ flex: 1 }}>
              <ProgressBar
                label={t('challenge.timeAria', { seconds: Math.max(0, timeLeft) })}
                isLabelHidden
                value={Math.max(0, timeLeft)}
                max={TIME_LIMIT_S}
                variant={timeLow ? 'error' : 'accent'}
              />
            </div>
          </HStack>
        </VStack>

        {/* Question card. A tinted top rule carries the subject accent. */}
        <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
        <Card variant="default" padding={5} width="100%">
          <div
            aria-hidden
            style={{ height: 4, borderRadius: 999, background: 'var(--brand-accent)', margin: '-4px 0 20px' }}
          />
          <VStack gap={2} width="100%">
            <HStack gap={1} wrap="wrap" align="center">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: getCategoryHexColor(current.category),
                  color: onCategoryColorText(current.category),
                }}
              >
                {getCategoryLabel(current.category)}
              </span>
              <Badge
                variant="neutral"
                label={t('challenge.difficultyLevel', { level: current.difficulty })}
              />
            </HStack>

            <div id="challenge-question">{renderQuestion(current.question)}</div>

            <div role="group" aria-labelledby="challenge-question">
              <VStack gap={1} width="100%">
                {current.options.map((opt, idx) => {
                  let variant: 'default' | 'green' | 'red' = 'default';
                  if (lastResult) {
                    if (idx === lastResult.correctAnswer) variant = 'green';
                    else if (idx === lastResult.selectedIndex && !lastResult.isCorrect) variant = 'red';
                  }
                  const isSel = lastResult
                    ? idx === lastResult.selectedIndex || idx === lastResult.correctAnswer
                    : selected === idx;
                  return (
                    <SelectableCard
                      key={idx}
                      label={opt}
                      isSelected={isSel}
                      isDisabled={!!lastResult}
                      onChange={() => {
                        if (!lastResult) setSelected(idx);
                      }}
                      variant={variant}
                      padding={2}
                      width="100%"
                    >
                      <HStack gap={1.5} align="center">
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            flexShrink: 0,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)',
                            color: 'var(--brand-accent)',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <Text type="body">{opt}</Text>
                      </HStack>
                    </SelectableCard>
                  );
                })}
              </VStack>
            </div>
          </VStack>
        </Card>
        </div>

        {/* Grade feedback + explanation. */}
        {lastResult && (
          <div aria-live="assertive" style={{ width: '100%' }}>
            <Banner
              status={lastResult.isCorrect ? 'success' : 'error'}
              title={lastResult.isCorrect ? t('challenge.correct') : t('challenge.wrong')}
              description={lastResult.explanation || undefined}
            />
          </div>
        )}

        <HStack justify="end" width="100%">
          {!lastResult ? (
            <Button
              variant="primary"
              label={t('challenge.lockIn')}
              isLoading={submitting}
              isDisabled={selected == null || submitting}
              onClick={() => void submitAnswer()}
            />
          ) : (
            <Button
              variant="primary"
              label={livesLost >= MAX_LIVES ? t('challenge.seeResult') : t('challenge.nextQuestion')}
              onClick={onContinue}
            />
          )}
        </HStack>
      </VStack>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </div>
  );
}

/** A rule bullet in the intro's "how it works" list. */
function RuleRow({ text }: { text: string }) {
  return (
    <HStack gap={1} align="start">
      <span aria-hidden style={{ color: 'var(--brand-accent)', fontWeight: 700, lineHeight: 1.5 }}>
        •
      </span>
      <Text type="supporting" color="secondary">
        {text}
      </Text>
    </HStack>
  );
}

/** A small outline clock glyph for the countdown. Decorative. */
function ClockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 15, height: 15, display: 'block' }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const pageWrapStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  width: '100%',
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
    <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
    <Card variant="muted" padding={3} width="100%">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: dim ? 0.55 : 1 }}>
        <span className="ss-float" style={{ display: 'inline-flex' }}>
          <SharkFin size={28} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type="label" color="secondary">
            {t('challenge.currentChampion')}
          </Text>
          {loading ? (
            <Spinner size="sm" />
          ) : champion ? (
            <Text type="large" weight="bold">
              {champion.name} — {champion.score}
            </Text>
          ) : (
            <Text type="body" color="secondary">
              {t('challenge.noChampion')}
            </Text>
          )}
        </div>
      </div>
    </Card>
    </div>
  );
}

function LeaderboardList({ board }: { board: ChallengeLeaderboard }) {
  // role="list" restores list semantics that Safari/VoiceOver drop when
  // list-style is none.
  return (
    <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
    <Card variant="default" padding={2} width="100%">
      <ol role="list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {board.top.map((row, i) => (
          <li
            key={row.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              alignItems: 'center',
              padding: '8px 8px',
              borderBottom: i === board.top.length - 1 ? 'none' : '1px dashed var(--color-border, rgba(128,128,128,0.25))',
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
              <Text type="body" color="secondary">
                {i + 1}.
              </Text>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Text type="body" weight={i === 0 ? 'bold' : 'normal'}>
                  {row.name}
                </Text>
              </span>
            </div>
            <span style={{ color: i === 0 ? 'var(--brand-accent)' : undefined, fontWeight: 700 }}>
              {row.score}
            </span>
          </li>
        ))}
      </ol>
    </Card>
    </div>
  );
}
