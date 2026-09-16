import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Kicker, SwimCta } from './landing/LandingKit';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AppToast } from './ui/AppToast';
import { apiFetch, friendlyError, ApiError } from '../lib/api';
import { fetchSprintBatch, completeSprintRun, type ChallengeLeaderboard, type SprintResult } from '../lib/challengeApi';
import { useSprintLeaderboard } from '../lib/queries';
import type { Question, QuizResult } from '../types/quiz';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject } from '../lib/subjects';
import { useIsMobile } from '../lib/useMediaQuery';
import { visuallyHidden } from '../theme/MuiTheme';
import { MotionPop } from '../lib/motion';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { awardQuestXp, syncXpWithServer } from '../lib/xp';
import { challengeRunXp } from '../lib/leveling';
import { readJSON, writeJSON, removeStored } from '../lib/storage';
import {
  comboProgressPct,
  nextComboStep,
  SPRINT_COMBO_STEPS,
  SPRINT_DURATION_MS,
  SPRINT_WRONG_PENALTY_S,
} from '../../../shared/sprint';
import './DeepEndScreens.css';

// Puzzle sprint: one three-minute clock, one point per correct answer, a combo
// that buys seconds and a wrong answer that costs ten of them.
//
// The clock here is a *rendering* of the server's. The run's start time arrives
// with the first batch and never changes; the bonuses and penalties this screen
// adds are the same ones `shared/sprint.ts` applies when the server replays the
// run from its own sealed timestamps. So the number on screen and the score
// that lands are the same computation, and nothing this screen reports is
// trusted: the finished run is scored from the proofs alone.

type Phase = 'intro' | 'loading' | 'playing' | 'gameover' | 'error';

const LOW_BATCH_THRESHOLD = 4;
const LOW_TIME_S = 15;
const PENDING_SPRINT_KEY = 'studyshark:pending-sprint-reward:v1';

interface PendingSprintReward {
  userId: string;
  runToken: string;
  proofs: string[];
}

interface MissedQuestion {
  question: Question;
  selectedIndex: number;
  correctAnswer: number;
  explanation: string;
}

interface BufferState {
  sessionId: string;
  queue: Question[];
}

/** Seconds → "m:ss". Clamps negatives to 0. */
const fmtClock = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export default function Sprint() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const profile = getUserProfile(user);
  const accent = useActiveSubject().accent;
  const isMobile = useIsMobile();

  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const boardQuery = useSprintLeaderboard();
  const board: ChallengeLeaderboard | null = boardQuery.data ?? null;
  const boardMigrationPending = boardQuery.error instanceof ApiError && boardQuery.error.code === 'migration_required';

  // Run state.
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [delta, setDelta] = useState<{ seconds: number; correct: boolean } | null>(null);
  const [missed, setMissed] = useState<MissedQuestion[]>([]);
  const [remainingS, setRemainingS] = useState(Math.round(SPRINT_DURATION_MS / 1000));
  const [name, setName] = useState<string>(profile.name ?? '');
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState(false);
  const [finalResult, setFinalResult] = useState<SprintResult | null>(null);

  const buffer = useRef<BufferState | null>(null);
  const runTokenRef = useRef('');
  const proofsRef = useRef<string[]>([]);
  const topupInFlight = useRef<Promise<void> | null>(null);
  const awardedRef = useRef(false);
  // The run's deadline, on the server's clock, plus the offset between that
  // clock and this browser's. Both are set when the first batch lands.
  const deadlineRef = useRef(0);
  const clockOffsetRef = useRef(0);
  const gameOverHeadingRef = useRef<HTMLDivElement | null>(null);

  const serverNow = useCallback(() => Date.now() - clockOffsetRef.current, []);

  /* ─── an interrupted run finishes itself next time ──────────────── */

  useEffect(() => {
    if (!user?.id) return;
    const pending = readJSON<PendingSprintReward | null>(PENDING_SPRINT_KEY, null);
    if (!pending || pending.userId !== user.id) return;
    void completeSprintRun({ runToken: pending.runToken, proofs: pending.proofs })
      .then(() => {
        removeStored(PENDING_SPRINT_KEY);
        return syncXpWithServer();
      })
      .catch(() => setSnack(t('sprint.rewardPending')));
  }, [t, user?.id]);

  useEffect(() => {
    if (profile.name && !name) setName(profile.name);
  }, [profile.name, name]);

  /* ─── question buffer ───────────────────────────────────────────── */

  const ensureBufferTopUp = useCallback(
    async (excluded: string[]) => {
      if (topupInFlight.current) return topupInFlight.current;
      const request = (async () => {
        try {
          const batch = await fetchSprintBatch({
            exclude: excluded,
            lang,
            runToken: runTokenRef.current || undefined,
          });
          runTokenRef.current = batch.runToken;
          if (deadlineRef.current === 0) {
            // First batch of the run: take the server's start as the origin of
            // the clock, and absorb request latency and clock skew into the
            // offset so the learner never pays for either.
            clockOffsetRef.current = Date.now() - batch.startedAt;
            deadlineRef.current = batch.startedAt + batch.durationMs;
          }
          buffer.current = { sessionId: batch.sessionId, queue: [...batch.questions] };
        } catch (err) {
          if (!buffer.current) {
            setPhase('error');
            setError(friendlyError(err));
          } else {
            setSnack(friendlyError(err));
          }
        }
      })();
      topupInFlight.current = request;
      try {
        await request;
      } finally {
        topupInFlight.current = null;
      }
    },
    [lang],
  );

  const popNext = useCallback((): Question | null => buffer.current?.queue.shift() ?? null, []);

  /* ─── run flow ──────────────────────────────────────────────────── */

  const startRun = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setScore(0);
    setWrong(0);
    setCombo(0);
    setSeenIds([]);
    setDelta(null);
    setMissed([]);
    setSubmittedScore(false);
    setFinalResult(null);
    setRemainingS(Math.round(SPRINT_DURATION_MS / 1000));
    awardedRef.current = false;
    runTokenRef.current = '';
    proofsRef.current = [];
    deadlineRef.current = 0;
    clockOffsetRef.current = 0;
    buffer.current = null;
    const openedAt = Date.now();
    await ensureBufferTopUp([]);
    await holdLoadingScreen(openedAt);
    if (!buffer.current) return; // ensureBufferTopUp already moved us to 'error'
    const next = popNext();
    if (!next) {
      setPhase('error');
      setError(t('sprint.noQuestions'));
      return;
    }
    setCurrent(next);
    setSeenIds([next.id]);
    setPhase('playing');
  }, [ensureBufferTopUp, popNext, t]);

  const advance = useCallback(async () => {
    const remaining = buffer.current?.queue.length ?? 0;
    if (remaining <= LOW_BATCH_THRESHOLD && !topupInFlight.current) {
      void ensureBufferTopUp(seenIds);
    }
    let next = popNext();
    if (!next) {
      await ensureBufferTopUp(seenIds);
      next = popNext();
    }
    if (!next) {
      // Out of questions before the clock ran out: the run ends here with the
      // score it has, which is a finished run and not an error.
      setPhase('gameover');
      return;
    }
    setCurrent(next);
    setSeenIds((prev) => [...prev, next!.id].slice(-300));
  }, [ensureBufferTopUp, popNext, seenIds]);

  const answer = useCallback(
    async (index: number) => {
      if (!current || !buffer.current || submitting || phase !== 'playing') return;
      setSubmitting(true);
      try {
        const result = await apiFetch<QuizResult>('/api/quiz/submit', {
          method: 'POST',
          body: JSON.stringify({ sessionId: buffer.current.sessionId, answers: { [current.id]: index }, lang }),
        });
        const graded = result.results[0];
        if (graded?.scoreProof) proofsRef.current.push(graded.scoreProof);
        if (graded?.isCorrect) {
          const nextCombo = combo + 1;
          const step = SPRINT_COMBO_STEPS.find((one) => one.at === nextCombo);
          setScore((value) => value + 1);
          setCombo(nextCombo);
          if (step) deadlineRef.current += step.bonusS * 1000;
          setDelta(step ? { seconds: step.bonusS, correct: true } : null);
        } else {
          setWrong((value) => value + 1);
          setCombo(0);
          deadlineRef.current -= SPRINT_WRONG_PENALTY_S * 1000;
          setDelta({ seconds: -SPRINT_WRONG_PENALTY_S, correct: false });
          setMissed((prev) => [
            ...prev.slice(-19),
            {
              question: current,
              selectedIndex: index,
              correctAnswer: graded?.correctAnswer ?? -1,
              explanation: graded?.explanation ?? '',
            },
          ]);
        }
        if (serverNow() >= deadlineRef.current) {
          setPhase('gameover');
          return;
        }
        await advance();
      } catch (err) {
        setSnack(friendlyError(err));
      } finally {
        setSubmitting(false);
      }
    },
    [advance, combo, current, lang, phase, serverNow, submitting],
  );

  /* ─── the clock ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing') return;
    const tick = () => {
      const left = Math.ceil((deadlineRef.current - serverNow()) / 1000);
      setRemainingS(Math.max(0, left));
      if (left <= 0) setPhase('gameover');
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, serverNow]);

  /* ─── the finished run ──────────────────────────────────────────── */

  const bankRun = useCallback(
    async (withName?: string) => {
      if (!runTokenRef.current) return null;
      const payload = { runToken: runTokenRef.current, proofs: [...proofsRef.current], ...(withName ? { name: withName } : {}) };
      return completeSprintRun(payload);
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'gameover') return;
    if (!awardedRef.current) {
      awardedRef.current = true;
      // Optimistic, and the same rate the classic run pays: a sprint is the
      // same learning on a different clock, never a faster way to earn.
      awardQuestXp(challengeRunXp(score), 'quiz');
      if (user && runTokenRef.current) {
        const pending: PendingSprintReward = { userId: user.id, runToken: runTokenRef.current, proofs: [...proofsRef.current] };
        writeJSON(PENDING_SPRINT_KEY, pending);
      }
      void bankRun()
        .then((result) => {
          if (result) setFinalResult(result);
          removeStored(PENDING_SPRINT_KEY);
          return syncXpWithServer();
        })
        .catch(() => {
          // Kept for the next signed-in session; the score on screen stands.
          setSnack(t('sprint.rewardPending'));
        });
    }
    requestAnimationFrame(() => gameOverHeadingRef.current?.focus());
  }, [bankRun, phase, score, t, user]);

  const onSubmitScore = useCallback(async () => {
    if (scoreSubmitting) return;
    const cleaned = name.trim();
    if (!cleaned) {
      setSnack(t('sprint.nameRequired'));
      return;
    }
    setScoreSubmitting(true);
    try {
      const result = await bankRun(cleaned);
      if (result?.boardError) {
        setSnack(result.boardError === 'migration_required' ? t('sprint.boardNotReady') : t('sprint.boardUnavailable'));
      } else {
        setSubmittedScore(true);
        setSnack(t('sprint.scoreSubmitted'));
        void boardQuery.refetch();
      }
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setScoreSubmitting(false);
    }
  }, [bankRun, boardQuery, name, scoreSubmitting, t]);

  /* ─── keyboard ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing' || !current) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]')) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const index = Number.parseInt(event.key, 10) - 1;
      if (index >= current.options.length) return;
      event.preventDefault();
      void answer(index);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answer, current, phase]);

  /* ─── render ────────────────────────────────────────────────────── */

  const comboStep = nextComboStep(combo);
  const comboPct = useMemo(() => comboProgressPct(combo), [combo]);

  if (phase === 'intro') {
    return (
      <div className="de-page de-challenge-grid ss-pop">
        <section className="de-hero-panel">
          <VStack gap={3}>
            <VStack gap={1}>
              <Kicker>{t('sprint.title')}</Kicker>
              <Heading level={1} type="display-3">{t('sprint.editorialTitle')}</Heading>
              <Text type="large" color="secondary">{t('sprint.description')}</Text>
            </VStack>
            <div className="de-stat-row">
              <div className="de-stat"><strong>3:00</strong><span>{t('sprint.oneClock')}</span></div>
              <div className="de-stat"><strong>+1</strong><span>{t('sprint.perCorrect')}</span></div>
              <div className="de-stat"><strong>−{SPRINT_WRONG_PENALTY_S} s</strong><span>{t('sprint.perWrong')}</span></div>
            </div>
            <ul className="de-sprint-rules">
              <li>{t('sprint.rule1')}</li>
              {/* The numbers come from the rules module, so the copy cannot
                  drift from the curve the server actually applies. */}
              <li>
                {t('sprint.rule2', {
                  steps: SPRINT_COMBO_STEPS.map((step) => step.at).join(' / '),
                  bonuses: SPRINT_COMBO_STEPS.map((step) => step.bonusS).join(' / '),
                })}
              </li>
              <li>{t('sprint.rule3')}</li>
            </ul>
            <HStack gap={2} align="center" wrap="wrap">
              <SwimCta label={t('sprint.startButton')} dir={-1} onClick={() => void startRun()} />
              <span className="de-gold-pill">{t('sprint.serverTimed')}</span>
            </HStack>
          </VStack>
        </section>
        <aside className="ss-panel" style={{ padding: 20 }}>
          <VStack gap={1.5}>
            <Heading level={3}>{t('sprint.board')}</Heading>
            {boardQuery.isPending ? (
              <Text color="secondary">…</Text>
            ) : boardMigrationPending ? (
              <Text type="supporting" color="secondary">{t('sprint.boardNotReady')}</Text>
            ) : boardQuery.isError ? (
              <VStack gap={1}>
                <Banner status="warning" title={t('sprint.boardUnavailable')} />
                <Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void boardQuery.refetch()} />
              </VStack>
            ) : board && board.top.length > 0 ? (
              <SprintBoard board={{ ...board, top: board.top.slice(0, 5) }} />
            ) : (
              <Text type="supporting" color="secondary">{t('sprint.noScores')}</Text>
            )}
            <Text type="supporting" size="xsm" color="secondary">{t('sprint.boardHint')}</Text>
          </VStack>
        </aside>
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
    return (
      <div className="ss-pop" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <Card padding={5} width="100%">
          <VStack gap={2}>
            <VStack gap={1} align="center">
              <div ref={gameOverHeadingRef} tabIndex={-1}>
                <Heading level={1} type="display-2" justify="center">{t('sprint.timeUp')}</Heading>
              </div>
              <MotionPop>
                <div style={{ fontSize: 'clamp(3rem, 12vw, 4.5rem)', fontWeight: 800, lineHeight: 1, color: accent }}>
                  {finalResult ? finalResult.score : score}
                </div>
              </MotionPop>
              <Text type="body" size="sm" color="secondary" justify="center">
                <span role="status">
                  {t('sprint.runSummary', { correct: finalResult ? finalResult.score : score, wrong: finalResult ? finalResult.wrong : wrong })}
                </span>
              </Text>
            </VStack>

            {!submittedScore ? (
              <div className="ss-panel" style={{ padding: 16 }}>
                <VStack gap={1.5}>
                  <Text type="body" size="sm">{t('sprint.submitPrompt')}</Text>
                  <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end' }}>
                    <div style={{ flex: '1 1 auto' }}>
                      <TextInput label={t('sprint.nameLabel')} value={name} onChange={(value) => setName(value.slice(0, 40))} onEnter={() => void onSubmitScore()} />
                    </div>
                    <Button
                      variant="primary"
                      label={t('sprint.submitScore')}
                      onClick={() => void onSubmitScore()}
                      isDisabled={scoreSubmitting}
                      isLoading={scoreSubmitting}
                    />
                  </div>
                </VStack>
              </div>
            ) : (
              <Banner status="success" title={t('sprint.scoreSubmitted')} />
            )}

            {missed.length > 0 && (
              <VStack gap={1}>
                <Text type="label" color="secondary">{t('sprint.reviewTitle')}</Text>
                <VStack gap={1}>
                  {missed.map((item, index) => (
                    <div key={`${item.question.id}-${index}`} className="ss-panel" style={{ padding: 12 }}>
                      <VStack gap={0.5}>
                        <Text type="body" size="sm" weight="semibold">{item.question.question}</Text>
                        <Text type="body" size="sm" color="accent">
                          {t('sprint.correctWas', { answer: item.question.options[item.correctAnswer] ?? '—' })}
                        </Text>
                        {item.explanation && <Text type="supporting" size="xsm" color="secondary">{item.explanation}</Text>}
                      </VStack>
                    </div>
                  ))}
                </VStack>
              </VStack>
            )}

            {board && board.top.length > 0 && (
              <VStack gap={1}>
                <Text type="label" color="secondary">{t('sprint.board')}</Text>
                <SprintBoard board={board} />
              </VStack>
            )}

            <HStack gap={1.5} justify="center" wrap="wrap">
              <Button variant="primary" label={t('sprint.playAgain')} onClick={() => void startRun()} />
              <Button variant="secondary" label={t('sprint.backToIntro')} onClick={() => setPhase('intro')} />
            </HStack>
          </VStack>
        </Card>
        <AppToast open={!!snack} onClose={() => setSnack(null)} severity="info" message={snack ?? ''} autoHideDuration={2500} />
      </div>
    );
  }

  // ── playing ──
  if (!current) return null;
  const low = remainingS <= LOW_TIME_S;

  return (
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
      <span style={visuallyHidden} aria-live="polite">
        {remainingS === LOW_TIME_S ? t('sprint.lowTime') : ''}
      </span>

      <div className="de-sprint-head" style={{ marginBottom: 6 }}>
        <HStack gap={1} align="center">
          <Text type="label" color="secondary">{t('sprint.score')}</Text>
          <span className="de-sprint-score" style={{ color: accent }}>{score}</span>
        </HStack>
        <span
          className="de-sprint-clock"
          data-low={low ? 'true' : 'false'}
          role="timer"
          aria-label={t('sprint.timeAria', { seconds: remainingS })}
        >
          {fmtClock(remainingS)}
        </span>
      </div>

      {/* Combo bar. The count is written next to it, so the bar's width is a
          second reading of the same fact rather than the only one. */}
      <div className="de-combo" data-full={comboStep ? 'false' : 'true'}>
        <div className="de-combo__row">
          <span>
            {t('sprint.combo')} <span className="de-combo__count">{combo}</span>
          </span>
          <span>
            {comboStep ? t('sprint.nextBonus', { at: comboStep.at, seconds: comboStep.bonusS }) : t('sprint.comboMax')}
          </span>
        </div>
        <div className="de-combo__track">
          <div className="de-combo__fill" style={{ width: `${comboPct}%` }} />
        </div>
        <span className="de-sprint-delta" data-tone={delta ? (delta.correct ? 'gain' : 'loss') : 'none'} aria-live="polite">
          {delta ? (delta.correct ? t('sprint.bonusGained', { seconds: delta.seconds }) : t('sprint.timeLost', { seconds: Math.abs(delta.seconds) })) : ''}
        </span>
      </div>

      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          maxHeight: isMobile ? undefined : '80%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-background-surface)',
          border: '1px solid var(--color-border)',
          borderTop: `4px solid ${accent}`,
          borderRadius: 16,
          overflow: 'auto',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 'clamp(1rem, 3.5vw, 1.5rem)' }}>
          <HStack gap={1} align="center" wrap="wrap" style={{ marginBottom: 12, flexShrink: 0 }}>
            <Badge variant="neutral" label={t('challenge.difficultyLevel', { level: current.difficulty })} />
          </HStack>

          <div id="sprint-question" style={{ marginBottom: 16, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {renderQuestion(current.question)}
          </div>

          {/* One tap answers. A sprint that needed a second "lock in" press
              would spend a third of its clock on confirmation. */}
          <div
            role="group"
            aria-labelledby="sprint-question"
            className="de-mode-list"
            style={{ flexShrink: 0, marginTop: 'auto', marginBottom: isMobile ? 50 : 0 }}
          >
            {current.options.map((option, index) => (
              <button
                key={index}
                type="button"
                className="de-mode-card"
                disabled={submitting}
                onClick={() => void answer(index)}
              >
                <span className="de-mode-card__icon" aria-hidden>{index + 1}</span>
                <span className="de-mode-card__copy"><strong>{option}</strong></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AppToast open={!!snack} onClose={() => setSnack(null)} severity="info" message={snack ?? ''} autoHideDuration={2500} />
    </div>
  );
}

function SprintBoard({ board }: { board: ChallengeLeaderboard }) {
  return (
    <ol role="list" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
      {board.top.map((row, index) => (
        <li
          key={row.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            padding: '6px 0',
            borderBottom: index === board.top.length - 1 ? 'none' : '1px dashed var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
            <span style={{ width: 24, flexShrink: 0 }}>
              <Text type="body" size="sm" color="secondary">{index + 1}.</Text>
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text type="body" size="sm" weight={index === 0 ? 'bold' : 'medium'}>{row.name}</Text>
            </span>
          </div>
          <Text type="body" size="sm" weight="bold" color={index === 0 ? 'accent' : 'primary'}>{row.score}</Text>
        </li>
      ))}
    </ol>
  );
}
