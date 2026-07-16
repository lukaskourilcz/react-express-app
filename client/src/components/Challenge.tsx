import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { TextInput } from '@astryxdesign/core/TextInput';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import type { CardVariant } from '@astryxdesign/core/Card';
import { AppToast } from './ui/AppToast';
import { apiFetch, friendlyError } from '../lib/api';
import {
  fetchChallengeBatch,
  submitChallengeScore,
  type ChallengeLeaderboard,
} from '../lib/challengeApi';
import { useChallengeLeaderboard } from '../lib/queries';
import type { Question, QuizResult, CategoryType } from '../types/quiz';
import {
  getCategoryHexColor,
  getCategoryLabel,
  onCategoryColorText,
} from '../lib/categories';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject } from '../lib/subjects';
import { useIsMobile } from '../lib/useMediaQuery';
import { visuallyHidden } from '../theme/MuiTheme';
import { MotionPop } from '../lib/motion';
import { SharkFin } from './SharkFin';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { awardQuestXp } from '../lib/xp';
import { challengeRunXp } from '../lib/leveling';

// Biggest Shark Challenge: answer as many questions as you can until you
// collect three strikes. Each question carries its own 90-second clock —
// letting it run out costs a fin, just like a wrong answer. Score = correct
// answers. Mix of all categories and difficulties. The page keeps its own
// state machine separate from the regular Quiz component.

type Phase = 'intro' | 'loading' | 'playing' | 'gameover' | 'error';

const MAX_LIVES = 3;
const LOW_BATCH_THRESHOLD = 4; // top up the buffer when this few remain
const TIME_LIMIT_S = 90; // each question is capped at 90 seconds
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
  /** True when the strike came from the per-question clock hitting zero. */
  timedOut?: boolean;
}

interface BufferState {
  sessionId: string;
  queue: Question[];
}

export default function Challenge() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const profile = getUserProfile(user);
  const accent = useActiveSubject().accent;
  const isMobile = useIsMobile();

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
  // Seconds remaining on the current question; reset to TIME_LIMIT_S each time
  // a new question is shown, and the countdown effect drives it down.
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
      // Fresh question, fresh clock.
      setTimeLeft(TIME_LIMIT_S);
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

  // The per-question clock ran out before an answer was locked in. That costs a
  // fin, exactly like a wrong answer; the graded feedback card then lets the
  // learner continue (or ends the run if it was the third strike).
  const handleTimeout = useCallback(() => {
    if (!current || lastResult) return; // already graded — nothing to time out
    setLivesLost((l) => l + 1);
    // No answer was locked in, so there's no selection to highlight (-1). Kept
    // free of `selected` so the once-per-second tick effect isn't reset every
    // time the learner changes their pick.
    setLastResult({
      questionId: current.id,
      selectedIndex: -1,
      correctAnswer: -1,
      isCorrect: false,
      explanation: '',
      question: current,
      timedOut: true,
    });
  }, [current, lastResult]);

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

  // Each question is capped at TIME_LIMIT_S. Tick once per second while the
  // learner is still working on the current question; pause once it's graded
  // (the feedback card is up) so reading the explanation doesn't burn the next
  // question's time. When the clock hits zero unanswered, it's a timeout strike.
  useEffect(() => {
    if (phase !== 'playing' || lastResult) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, lastResult, handleTimeout]);

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
          <span key={i} style={{ display: 'inline-flex', opacity: i < livesLeft ? 1 : 0.2 }}>
            <SharkFin size={20} color={i < livesLeft ? 'var(--brand-accent)' : '#888'} />
          </span>
        ))}
      </div>
    ),
    [livesLeft, t],
  );

  if (phase === 'intro') {
    return (
      <div className="ss-pop" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <Card padding={5} width="100%">
          <VStack gap={3}>
            <VStack gap={1.5} align="center">
              <Heading level={1} type="display-2" justify="center">
                {t('challenge.title')}
              </Heading>
            </VStack>

            {/* The rules list is the single explanation — no duplicate prose above. */}
            <div className="ss-panel" style={{ padding: 20, borderLeft: `4px solid ${accent}` }}>
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  {t('challenge.howItWorks')}
                </Text>
                <ul style={{ paddingLeft: 20, margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  <li>{t('challenge.rule1')}</li>
                  <li>{t('challenge.rule2')}</li>
                  <li>{t('challenge.rule3')}</li>
                  <li>{t('challenge.rule4')}</li>
                </ul>
              </VStack>
            </div>

            <ChampionBadge champion={champion} loading={boardLoading} />

            <div style={{ display: 'grid' }}>
              <Button
                variant="primary"
                size="lg"
                label={t('challenge.startButton')}
                onClick={() => void startRun()}
              />
            </div>

            {board && board.top.length > 0 && (
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  {t('challenge.hallOfFame')}
                </Text>
                <LeaderboardList board={board} />
              </VStack>
            )}
          </VStack>
        </Card>
      </div>
    );
  }

  if (phase === 'loading') {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
  }

  if (phase === 'error') {
    return (
      <div className="ss-pop" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <Card padding={5} width="100%">
          <VStack gap={2}>
            <Banner status="error" title={error || t('error.somethingWrong')} />
            <div>
              <Button variant="secondary" label={t('quiz.retry')} onClick={() => void startRun()} />
            </div>
          </VStack>
        </Card>
      </div>
    );
  }

  if (phase === 'gameover') {
    const beatChampion = !!champion && score > champion.score;
    return (
      <div className="ss-pop" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <Card padding={5} width="100%">
          <VStack gap={2}>
            <VStack gap={1} align="center">
              <div ref={gameOverHeadingRef} tabIndex={-1}>
                <Heading level={1} type="display-2" justify="center">
                  {t('challenge.gameOver')}
                </Heading>
              </div>
              <Text type="body" size="sm" color="secondary" justify="center">
                <span role="status">
                  {lastResult?.timedOut ? t('challenge.endedByTime') : t('challenge.endedByStrikes')}
                </span>
              </Text>
              {/* The big number IS the score — no repeated caption underneath. */}
              <MotionPop>
                <div style={{ fontSize: 'clamp(3rem, 12vw, 4.5rem)', fontWeight: 800, lineHeight: 1, color: accent }}>
                  {score}
                </div>
              </MotionPop>
            </VStack>

            <ChampionBadge champion={champion} loading={boardLoading} dim={beatChampion} />

            {!submittedScore ? (
              <div className="ss-panel" style={{ padding: 16 }}>
                <VStack gap={1.5}>
                  <Text type="body" size="sm">
                    {t('challenge.submitPrompt')}
                  </Text>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'flex-end',
                    }}
                  >
                    <div style={{ flex: '1 1 auto' }}>
                      <TextInput
                        label={t('challenge.nameLabel')}
                        value={name}
                        onChange={(v) => setName(v.slice(0, 40))}
                        onEnter={() => void onSubmitScore()}
                      />
                    </div>
                    <Button
                      variant="primary"
                      label={t('challenge.submitScore')}
                      onClick={() => void onSubmitScore()}
                      isDisabled={scoreSubmitting}
                      isLoading={scoreSubmitting}
                    />
                  </div>
                </VStack>
              </div>
            ) : (
              <Banner status="success" title={t('challenge.scoreSubmitted')} />
            )}

            {board && board.top.length > 0 && (
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  {t('challenge.hallOfFame')}
                </Text>
                <LeaderboardList board={board} />
              </VStack>
            )}

            <HStack gap={1.5} justify="center" wrap="wrap">
              <Button variant="primary" label={t('challenge.playAgain')} onClick={() => void startRun()} />
              <Button variant="secondary" label={t('challenge.backToIntro')} onClick={() => setPhase('intro')} />
            </HStack>
          </VStack>
        </Card>

        <AppToast
          open={!!snack}
          onClose={() => setSnack(null)}
          severity="info"
          message={snack ?? ''}
          autoHideDuration={2500}
        />
      </div>
    );
  }

  // ── playing ──
  if (!current) return null;

  const low = timeLeft <= LOW_TIME_S;
  const timePct = (Math.max(0, timeLeft) / TIME_LIMIT_S) * 100;

  return (
    // One-viewport layout matching the Quiz card geometry: ~560px column,
    // primary card capped at ~80% height on sm+, centred; question text
    // scrolls internally, answers + lock-in stay anchored near the bottom.
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: isMobile ? 680 : 560,
        margin: '0 auto',
        width: '100%',
        padding: isMobile ? 4 : 8,
      }}
    >
      {/* One-shot low-time announcement for screen readers (the visual cue is
          colour + pulse, which AT users can't perceive). */}
      <span style={visuallyHidden} aria-live="polite">
        {timeLeft === LOW_TIME_S ? t('challenge.lowTime') : ''}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 12,
          flexShrink: 0,
        }}
      >
        <HStack gap={1} align="center" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <Text type="label" color="secondary">
            {t('challenge.score')}
          </Text>
          <Text type="large" weight="bold" color="accent">
            {score}
          </Text>
        </HStack>
        <HStack gap={1.5} align="center" style={{ flexShrink: 0 }}>
          <span
            role="timer"
            aria-label={t('challenge.timeAria', { seconds: Math.max(0, timeLeft) })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 11px',
              borderRadius: 999,
              fontFamily: 'monospace',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              color: low ? 'var(--ss-error)' : 'var(--brand-accent)',
              background: low
                ? 'color-mix(in srgb, var(--ss-error) 15%, transparent)'
                : 'color-mix(in srgb, var(--brand-accent) 12%, transparent)',
            }}
          >
            <ClockIcon />
            <span>{fmtClock(timeLeft)}</span>
          </span>
          {livesIndicator}
        </HStack>
      </div>

      {/* Per-question countdown as a bar — accent, flipping to error under the
          low-time threshold to reinforce the pulsing clock. */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <ProgressBar
          label={t('challenge.timeAria', { seconds: Math.max(0, timeLeft) })}
          isLabelHidden
          value={timePct}
          variant={low ? 'error' : 'accent'}
        />
      </div>

      {/* Surface styled with Astryx tokens so it themes with the rest of the
          system, while plain flex/scroll keeps the one-viewport behaviour. */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          maxHeight: isMobile ? undefined : '80%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-background-card)',
          border: '1px solid var(--color-border)',
          borderTop: `4px solid ${accent}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 'clamp(1rem, 3.5vw, 1.5rem)',
          }}
        >
          <HStack gap={1} align="center" wrap="wrap" style={{ marginBottom: 12, flexShrink: 0 }}>
            <CategoryTag category={current.category} />
            <Badge variant="neutral" label={t('challenge.difficultyLevel', { level: current.difficulty })} />
          </HStack>

          {/* Scrollable question region — answers below keep their position. */}
          <div id="challenge-question" style={{ marginBottom: 16, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {renderQuestion(current.question)}
          </div>

          {/* Answer options as SelectableCards. Raise the anchored answers ~50px
              off the wave on phones. */}
          <div
            role="radiogroup"
            aria-labelledby="challenge-question"
            style={{ flexShrink: 0, marginTop: 'auto', marginBottom: isMobile ? 50 : 0 }}
          >
            <VStack gap={1}>
              {current.options.map((opt, idx) => {
                const isSel = selected === idx;
                const graded = !!lastResult;
                const isCorrectOpt = graded && idx === lastResult!.correctAnswer;
                const isWrongPick =
                  graded && idx === lastResult!.selectedIndex && !lastResult!.isCorrect;
                const variant: CardVariant = isCorrectOpt ? 'green' : isWrongPick ? 'red' : 'default';
                return (
                  <SelectableCard
                    key={idx}
                    label={opt}
                    isSelected={graded ? isCorrectOpt || isWrongPick : isSel}
                    isDisabled={graded}
                    variant={variant}
                    padding={2}
                    onChange={() => {
                      if (!lastResult) setSelected(idx);
                    }}
                  >
                    <HStack gap={2} align="center">
                      <span
                        aria-hidden
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: isSel ? 'var(--color-accent-muted)' : 'var(--color-background-muted)',
                          color: isSel ? 'var(--color-text-accent)' : 'inherit',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <Text type="body" weight={isSel ? 'semibold' : 'normal'}>
                        {opt}
                      </Text>
                    </HStack>
                  </SelectableCard>
                );
              })}
            </VStack>
          </div>
        </div>
      </div>

      {/* Feedback overlay: a floating card that sits over the answer options
          so the grade doesn't push the layout around. */}
      {lastResult && (
        <div
          aria-live="assertive"
          style={{
            position: 'absolute',
            left: isMobile ? 8 : 16,
            right: isMobile ? 8 : 16,
            bottom: isMobile ? 68 : 72,
            zIndex: 5,
            maxHeight: '48vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-element, 0.9rem)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Banner
            status={lastResult.isCorrect ? 'success' : 'error'}
            title={
              lastResult.isCorrect
                ? t('challenge.correct')
                : lastResult.timedOut
                  ? t('challenge.questionTimeout')
                  : t('challenge.wrong')
            }
            description={lastResult.explanation || undefined}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8, flexShrink: 0 }}>
        {!lastResult ? (
          <Button
            variant="primary"
            label={t('challenge.lockIn')}
            isDisabled={selected == null || submitting}
            isLoading={submitting}
            onClick={() => void submitAnswer()}
          />
        ) : (
          <Button
            variant="primary"
            label={livesLost >= MAX_LIVES ? t('challenge.seeResult') : t('challenge.nextQuestion')}
            onClick={onContinue}
          />
        )}
      </div>

      <AppToast
        open={!!snack}
        onClose={() => setSnack(null)}
        severity="info"
        message={snack ?? ''}
        autoHideDuration={2500}
      />
    </div>
  );
}

/** A small outline clock glyph for the countdown chip. Decorative. */
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

// A compact category tag that keeps each subject's brand/logo colour (Astryx
// Badge only exposes a fixed palette, so we render the exact hex tint here).
function CategoryTag({ category }: { category: CategoryType }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 26,
        padding: '0 10px',
        borderRadius: 8,
        fontSize: '0.78rem',
        fontWeight: 600,
        lineHeight: 1,
        backgroundColor: getCategoryHexColor(category),
        color: onCategoryColorText(category),
      }}
    >
      {getCategoryLabel(category)}
    </span>
  );
}

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
    <div className="ss-raised" style={{ display: 'flex', width: '100%', opacity: dim ? 0.6 : 1 }}>
      <Card variant="muted" padding={2} width="100%">
        <HStack gap={1.5} align="center">
          <SharkFin size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <VStack gap={0}>
              <Text type="label" color="secondary">
                {t('challenge.currentChampion')}
              </Text>
              {loading ? (
                <Text type="body" size="sm" color="secondary">
                  …
                </Text>
              ) : champion ? (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Text type="body" weight="bold">
                    {champion.name} — {champion.score}
                  </Text>
                </span>
              ) : (
                <Text type="body" size="sm" color="secondary">
                  {t('challenge.noChampion')}
                </Text>
              )}
            </VStack>
          </div>
        </HStack>
      </Card>
    </div>
  );
}

function LeaderboardList({ board }: { board: ChallengeLeaderboard }) {
  // role="list" restores list semantics that Safari/VoiceOver drop when
  // list-style is none.
  return (
    <ol role="list" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
      {board.top.map((row, i) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            padding: '6px 0',
            borderBottom: i === board.top.length - 1 ? 'none' : '1px dashed var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
            <span style={{ width: 24, flexShrink: 0 }}>
              <Text type="body" size="sm" color="secondary">
                {i + 1}.
              </Text>
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text type="body" size="sm" weight={i === 0 ? 'bold' : 'medium'}>
                {row.name}
              </Text>
            </span>
          </div>
          <Text type="body" size="sm" weight="bold" color={i === 0 ? 'accent' : 'primary'}>
            {row.score}
          </Text>
        </div>
      ))}
    </ol>
  );
}
