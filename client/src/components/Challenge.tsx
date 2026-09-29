import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Kicker } from './landing/LandingKit';
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
import { AppToast } from './ui/AppToast';
import { ApiError, apiFetch, friendlyError } from '../lib/api';
import {
  fetchChallengeBatch,
  completeChallengeRun,
  submitChallengeScore,
  type ChallengeLeaderboard,
} from '../lib/challengeApi';
import { challengeLeaderboardQuery, useChallengeLeaderboard } from '../lib/queries';
import { readOnce, settled, useFirstData } from '../lib/routeData';
import type { Question, QuizResult } from '../types/quiz';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject, useSubject } from '../lib/subjects';
import { useIsMobile } from '../lib/useMediaQuery';
import { visuallyHidden } from '../theme/MuiTheme';
import { MotionPop } from '../lib/motion';
import { SharkFin } from './SharkFin';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { announceVerifiedQuestXp, awardQuestXp, syncXpWithServer } from '../lib/xp';
import { challengeRunXp } from '../../../shared/progression';
import { SwimCta } from './landing/LandingKit';
import { readJSON, writeJSON, removeStored } from '../lib/storage';
import './DeepEndScreens.css';
import { RadioCard, RadioCardGroup } from './ui/RadioCards';
import { CategoryTag } from './ui/CategoryTag';
import ResultShareActions from './ResultShareActions';
import ReferralMoment from './ReferralMoment';

// Biggest Shark Challenge: answer as many questions as you can until you
// collect three strikes. Each question carries its own 90-second clock —
// letting it run out costs a fin, just like a wrong answer. Score = correct
// answers. Mix of all categories and difficulties. The page keeps its own
// state machine separate from the regular Quiz component.

type Phase = 'intro' | 'loading' | 'playing' | 'gameover' | 'error';

const MAX_LIVES = 3;
const LOW_BATCH_THRESHOLD = 4; // top up the buffer when this few remain
const TIME_LIMIT_S = 90; // each question is capped at 90 seconds
const RELAXED_TIME_LIMIT_S = 180; // accessibility practice pace; never ranked
const LOW_TIME_S = 15; // highlight + pulse the clock under this many seconds
// A batch's session is sealed for an hour (lib/quiz-tokens.ts). No question is
// shown from a batch older than this, so its answer, even at the relaxed pace,
// reaches the server while that session still grades it.
const STALE_BATCH_MS = 50 * 60 * 1000;
// A timeout strike the network or the rate limit refused is sent again after
// a pause that doubles each time, up to the cap.
const STRIKE_RETRY_MS = 2_000;
const STRIKE_RETRY_MAX_MS = 30_000;
// Finished runs whose reward has not reached the server yet. The first
// version held one run; a list is kept now, and both shapes parse.
const PENDING_CHALLENGE_KEY = 'studyshark:pending-challenge-reward:v1';
const MAX_PENDING_REWARDS = 20;
// Completion refusals that no retry can change: an expired or foreign run, or
// proofs that do not make a finished run. Such a run leaves the list.
const PERMANENT_REWARD_ERRORS = new Set(['invalid_run', 'incomplete_run', 'invalid_proof', 'bad_request']);

interface PendingChallengeReward {
  userId: string;
  runToken: string;
  proofs: string[];
}

function readPendingRewards(): PendingChallengeReward[] {
  const raw = readJSON<unknown>(PENDING_CHALLENGE_KEY, null);
  const list: unknown[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.filter((one): one is PendingChallengeReward => {
    const run = one as Partial<PendingChallengeReward> | null;
    return !!run && typeof run.userId === 'string' && typeof run.runToken === 'string' && Array.isArray(run.proofs);
  });
}

function writePendingRewards(list: PendingChallengeReward[]): void {
  if (list.length === 0) removeStored(PENDING_CHALLENGE_KEY);
  else writeJSON(PENDING_CHALLENGE_KEY, list.slice(-MAX_PENDING_REWARDS));
}

const dropPendingReward = (runToken: string) =>
  writePendingRewards(readPendingRewards().filter((run) => run.runToken !== runToken));

/** Send each saved run of this learner to the completion step. A run that
 * lands, or that can never land, leaves the list; one the network or the rate
 * limit turned away stays for the next try. */
async function sendPendingRewards(userId: string): Promise<{ kept: number; xp: number }> {
  let kept = 0;
  let xp = 0;
  for (const run of readPendingRewards().filter((one) => one.userId === userId)) {
    try {
      const res = await completeChallengeRun({ runToken: run.runToken, proofs: run.proofs });
      if (res.awarded) xp += res.xp ?? 0;
      dropPendingReward(run.runToken);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && PERMANENT_REWARD_ERRORS.has(err.code ?? '')) {
        dropPendingReward(run.runToken);
        continue;
      }
      kept += 1;
      // Offline or rate limited: the rest would be turned away the same way.
      if (err instanceof ApiError && (err.status === 0 || err.status === 429)) break;
    }
  }
  return { kept, xp };
}

/** The batch session that issued the question can no longer grade it: it
 * expired, or the answer reached a session the question is not in. */
const isSessionRefusal = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 400 &&
  (err.code === 'invalid_session' || /outside this session/i.test(err.message));

/** A refusal worth sending again later: offline, rate limited, or a server fault. */
const isRetryable = (err: unknown): boolean =>
  !(err instanceof ApiError) || err.status === 0 || err.status === 429 || err.status >= 500;

function gradeChallengeAnswer(sessionId: string, questionId: string, selectedIndex: number, lang: string) {
  return apiFetch<QuizResult>('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answers: { [questionId]: selectedIndex }, lang }),
  });
}

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
  /** Set when the answer does not count either way: the question was
   * retired mid-run, or its batch session expired before it was graded. No
   * strike, no point, no proof. */
  notCounted?: 'retired' | 'expired';
}

interface BufferedQuestion {
  question: Question;
  /** The batch session that issued the question, and so the one that grades it. */
  sessionId: string;
  receivedAt: number;
}

interface BufferState {
  queue: BufferedQuestion[];
}

/** Ids still queued, so a refill does not repeat them. */
const queuedIds = (buffer: BufferState | null): string[] => buffer?.queue.map((entry) => entry.question.id) ?? [];

/** The board line beside the intro, in the cache before the first render: it
 * used to fill in after the page. It is best-effort, so the wait is the usual
 * capped one and a failed read draws the page with its own notice. */
function useBoardFirstData() {
  const queryClient = useQueryClient();
  const [subject] = useSubject();
  useFirstData(`challenge ${subject}`, () => settled([readOnce(queryClient, challengeLeaderboardQuery(subject))]));
}

export default function Challenge() {
  useBoardFirstData();
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const profile = getUserProfile(user);
  const accent = useActiveSubject().accent;
  const isMobile = useIsMobile();

  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [relaxedPace, setRelaxedPace] = useState(false);
  const timeLimitS = relaxedPace ? RELAXED_TIME_LIMIT_S : TIME_LIMIT_S;

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
  const [timeLeft, setTimeLeft] = useState(timeLimitS);

  // Buffered question batches: we always keep one round of questions ready so
  // the next question appears instantly after each grade.
  const buffer = useRef<BufferState | null>(null);
  // The batch session of the question on screen: a refill brings a new
  // session, and the question already shown still belongs to the old one.
  const currentSessionRef = useRef('');
  const runTokenRef = useRef('');
  const scoreProofsRef = useRef<string[]>([]);
  const topupInFlight = useRef<Promise<void> | null>(null);
  // Guards the once-per-run XP/token payout on game over.
  const awardedRef = useRef(false);
  // The timeout strike goes out once per question. A refusal worth retrying
  // is sent again after a growing pause, never on every render.
  const strikeSentFor = useRef<string | null>(null);
  const strikeRetry = useRef<{ timer: number | null; attempt: number }>({ timer: null, attempt: 0 });
  const [strikeWake, setStrikeWake] = useState(0);
  const [strikeWaiting, setStrikeWaiting] = useState(false);

  const clearStrikeRetry = useCallback(() => {
    if (strikeRetry.current.timer !== null) window.clearTimeout(strikeRetry.current.timer);
    strikeRetry.current = { timer: null, attempt: 0 };
    strikeSentFor.current = null;
    setStrikeWaiting(false);
  }, []);
  useEffect(() => clearStrikeRetry, [clearStrikeRetry]);

  // Saved rewards go out one after another, so a sync started at game over
  // never races the one started on arrival.
  const rewardSync = useRef<Promise<void>>(Promise.resolve());
  const syncRewards = useCallback((userId: string) => {
    rewardSync.current = rewardSync.current.then(async () => {
      const { kept, xp } = await sendPendingRewards(userId);
      if (xp > 0) {
        await syncXpWithServer();
        announceVerifiedQuestXp(xp);
      }
      if (kept > 0) setSnack(t('challenge.rewardPending'));
    });
    return rewardSync.current;
  }, [t]);

  useEffect(() => {
    if (user?.id) void syncRewards(user.id);
  }, [syncRewards, user?.id]);
  // Focus target when the run ends, so AT users hear the transition.
  const gameOverHeadingRef = useRef<HTMLDivElement | null>(null);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  const livesLeft = MAX_LIVES - livesLost;

  /* ─── leaderboard ───────────────────────────────────────────── */

  // Refetch the subject-scoped board after a score is submitted.
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
          const batch = await fetchChallengeBatch({
            exclude: excluded,
            lang,
            runToken: runTokenRef.current || undefined,
            ranked: !relaxedPace,
          });
          runTokenRef.current = batch.runToken;
          // Append to what is still queued. Each question keeps the session
          // that issued it, and is graded against that session.
          const receivedAt = Date.now();
          const queued = buffer.current?.queue ?? [];
          const known = new Set(queued.map((entry) => entry.question.id));
          buffer.current = {
            queue: [
              ...queued,
              ...batch.questions
                .filter((question) => !known.has(question.id))
                .map((question) => ({ question, sessionId: batch.sessionId, receivedAt })),
            ],
          };
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
    [lang, relaxedPace],
  );

  const popNext = useCallback((): BufferedQuestion | null => {
    const buf = buffer.current;
    if (!buf) return null;
    // A question from a batch near the end of its session's hour is skipped:
    // its answer could no longer be graded.
    while (buf.queue.length > 0 && Date.now() - buf.queue[0].receivedAt > STALE_BATCH_MS) buf.queue.shift();
    return buf.queue.shift() ?? null;
  }, []);

  const showQuestion = useCallback((next: BufferedQuestion) => {
    clearStrikeRetry();
    currentSessionRef.current = next.sessionId;
    setCurrent(next.question);
  }, [clearStrikeRetry]);

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
    setTimeLeft(timeLimitS);
    awardedRef.current = false;
    runTokenRef.current = '';
    scoreProofsRef.current = [];
    buffer.current = null;
    const startedAt = Date.now();
    await ensureBufferTopUp([]);
    await holdLoadingScreen(startedAt);
    if (!buffer.current) return; // ensureBufferTopUp already set the error phase
    const next = popNext();
    if (!next) {
      setPhase('error');
      setError(t('challenge.noQuestions'));
      return;
    }
    showQuestion(next);
    setSeenIds([next.question.id]);
    setPhase('playing');
  }, [ensureBufferTopUp, popNext, showQuestion, t, timeLimitS]);

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
        void ensureBufferTopUp([...seenIds, ...queuedIds(buffer.current)]);
      }
      let next = popNext();
      if (!next) {
        // Buffer ran dry while topping up — await it.
        await ensureBufferTopUp([...seenIds, ...queuedIds(buffer.current)]);
        next = popNext();
      }
      if (!next) {
        setPhase('error');
        setError(t('challenge.noQuestions'));
        return;
      }
      showQuestion(next);
      // Cap the seen-ids list so a long run doesn't grow the `exclude`
      // query string without bound. The server caps at 500 already; we keep
      // the most recent 300 client-side to keep `advance` and the request
      // payload light.
      setSeenIds((prev) => [...prev, next!.question.id].slice(-300));
      setSelected(null);
      setLastResult(null);
      // Fresh question, fresh clock.
      setTimeLeft(timeLimitS);
    },
    [ensureBufferTopUp, popNext, seenIds, showQuestion, t, timeLimitS],
  );

  // Record the server's grade for the question on screen. A question retired
  // after its batch was issued comes back void: it neither scores nor strikes,
  // and it carries no proof.
  const applyGrade = useCallback((question: Question, selectedIndex: number, result: QuizResult, timedOut: boolean) => {
    const graded = result.results.find((one) => one.questionId === question.id);
    if (!graded || result.voided?.includes(question.id)) {
      setLastResult({ questionId: question.id, selectedIndex, correctAnswer: -1, isCorrect: false, explanation: '', question, notCounted: 'retired' });
      return;
    }
    setLastResult({
      questionId: question.id,
      selectedIndex,
      correctAnswer: graded.correctAnswer,
      isCorrect: graded.isCorrect,
      explanation: graded.explanation,
      question,
      ...(timedOut ? { timedOut: true } : {}),
    });
    if (graded.isCorrect) setScore((s) => s + 1);
    else setLivesLost((l) => l + 1);
    if (graded.scoreProof) scoreProofsRef.current.push(graded.scoreProof);
  }, []);

  // The session that issued this question cannot grade it any more, so the
  // question does not count. Its batch leaves the queue, and moving on asks
  // for a fresh batch under the same run.
  const expireQuestion = useCallback((question: Question, selectedIndex: number, sessionId: string) => {
    if (buffer.current) {
      buffer.current = { queue: buffer.current.queue.filter((entry) => entry.sessionId !== sessionId) };
    }
    setLastResult({ questionId: question.id, selectedIndex, correctAnswer: -1, isCorrect: false, explanation: '', question, notCounted: 'expired' });
  }, []);

  const submitAnswer = useCallback(async () => {
    if (selected == null || !current || submitting || timeLeft <= 0) return;
    const question = current;
    const sessionId = currentSessionRef.current;
    setSubmitting(true);
    try {
      applyGrade(question, selected, await gradeChallengeAnswer(sessionId, question.id, selected, lang), false);
    } catch (err) {
      if (isSessionRefusal(err)) expireQuestion(question, selected, sessionId);
      else setSnack(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }, [selected, current, lang, submitting, timeLeft, applyGrade, expireQuestion]);

  const onContinue = useCallback(() => {
    const willGameOver = lastResult ? !lastResult.notCounted && !lastResult.isCorrect && livesLost >= MAX_LIVES : false;
    void advance(willGameOver);
  }, [advance, lastResult, livesLost]);

  // The per-question clock ran out before an answer was locked in. That costs a
  // fin, exactly like a wrong answer; the graded feedback card then lets the
  // learner continue (or ends the run if it was the third strike).
  const handleTimeout = useCallback(async () => {
    if (!current || lastResult || submitting || strikeSentFor.current === current.id) return;
    strikeSentFor.current = current.id;
    const question = current;
    const sessionId = currentSessionRef.current;
    setSubmitting(true);
    try {
      // A timeout is graded as an explicit server-proven strike. This prevents
      // ranked clients from omitting timeouts from the final proof set.
      applyGrade(question, -1, await gradeChallengeAnswer(sessionId, question.id, -1, lang), true);
      setStrikeWaiting(false);
    } catch (err) {
      if (isSessionRefusal(err)) {
        setStrikeWaiting(false);
        expireQuestion(question, -1, sessionId);
      } else if (isRetryable(err)) {
        // Offline, rate limited or a server fault: send it again after a
        // pause. Re-sending at once spent the shared rate bucket in a loop.
        const attempt = strikeRetry.current.attempt;
        strikeRetry.current.attempt = attempt + 1;
        strikeRetry.current.timer = window.setTimeout(() => {
          strikeRetry.current.timer = null;
          strikeSentFor.current = null;
          setStrikeWake((n) => n + 1);
        }, Math.min(STRIKE_RETRY_MAX_MS, STRIKE_RETRY_MS * 2 ** attempt));
        setStrikeWaiting(true);
      } else {
        // Refused for good: no proof comes back, but the clock did run out,
        // so the fin is lost here and the run goes on.
        setStrikeWaiting(false);
        setLivesLost((l) => l + 1);
        setLastResult({ questionId: question.id, selectedIndex: -1, correctAnswer: -1, isCorrect: false, explanation: '', question, timedOut: true });
      }
    } finally {
      setSubmitting(false);
    }
  }, [current, lastResult, submitting, lang, applyGrade, expireQuestion]);

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
      if (!runTokenRef.current) throw new Error('Challenge run expired');
      await submitChallengeScore({
        name: cleaned,
        runToken: runTokenRef.current,
        proofs: scoreProofsRef.current,
      });
      setSubmittedScore(true);
      setSnack(t('challenge.scoreSubmitted'));
      void refreshLeaderboard();
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setScoreSubmitting(false);
    }
  }, [name, refreshLeaderboard, t, scoreSubmitting]);

  /* ─── countdown clock ───────────────────────────────────────── */

  // Each question is capped at TIME_LIMIT_S. Tick once per second while the
  // learner is still working on the current question; pause once it's graded
  // (the feedback card is up) so reading the explanation doesn't burn the next
  // question's time. When the clock hits zero unanswered, it's a timeout strike;
  // handleTimeout sends it once, and `strikeWake` brings a delayed retry here.
  useEffect(() => {
    if (phase !== 'playing' || lastResult) return;
    if (timeLeft <= 0) {
      void handleTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, lastResult, handleTimeout, strikeWake]);

  /* ─── reward on game over ───────────────────────────────────── */

  // A finished run pays five XP per server-proven correct answer (and tokens,
  // which follow from XP). Signed in, the run joins the saved list and the
  // server credits it; every saved run is sent again now, so one that failed
  // earlier is not left behind by the next. Signed out, the same amount is
  // kept in this browser. Guarded so it pays exactly once per run.
  useEffect(() => {
    if (phase === 'gameover' && !awardedRef.current) {
      awardedRef.current = true;
      if (user) {
        if (runTokenRef.current) {
          writePendingRewards([
            ...readPendingRewards(),
            { userId: user.id, runToken: runTokenRef.current, proofs: [...scoreProofsRef.current] },
          ]);
          void syncRewards(user.id);
        }
      } else {
        awardQuestXp(challengeRunXp(score), 'quiz');
      }
    }
    // Announce the run's end to AT by moving focus to the game-over heading.
    if (phase === 'gameover') {
      requestAnimationFrame(() => gameOverHeadingRef.current?.focus());
    }
  }, [phase, score, user, syncRewards]);

  /* ─── keyboard during play ──────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing' || !current) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"], [role="radio"], [role="checkbox"]')) return;
      if (lastResult) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onContinue();
        }
        return;
      }
      if (timeLeft <= 0) return;
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
  }, [phase, current, selected, lastResult, submitAnswer, onContinue, timeLeft]);

  /* ─── render ────────────────────────────────────────────────── */

  const livesIndicator = useMemo(
    () => (
      <div
        style={{ display: 'flex', gap: 4, alignItems: 'center' }}
        aria-label={t('challenge.livesAria', { left: livesLeft })}
      >
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <span key={i} style={{ display: 'inline-flex', opacity: i < livesLeft ? 1 : 0.2 }}>
            <SharkFin size={20} color={i < livesLeft ? 'var(--brand-accent)' : 'var(--color-text-disabled)'} />
          </span>
        ))}
      </div>
    ),
    [livesLeft, t],
  );

  if (phase === 'intro') {
    return (
      <div className="de-page de-challenge-grid ss-pop">
        <section className="de-hero-panel">
          <VStack gap={3}>
            <VStack gap={1}>
              <Kicker>{t('challenge.kicker')}</Kicker>
              <Heading level={1} type="display-3">{t('challenge.title')}</Heading>
              <Text type="large" color="secondary">{t('challenge.description')}</Text>
            </VStack>
            <div className="de-stat-row">
              <div className="de-stat"><strong>{MAX_LIVES}</strong><span>{t('challenge.finsStat')}</span></div>
              <div className="de-stat"><strong>{timeLimitS} s</strong><span>{t('challenge.perQuestion')}</span></div>
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={relaxedPace}
              className={`de-track-card${relaxedPace ? ' is-selected' : ''}`}
              onClick={() => setRelaxedPace((value) => !value)}
              // The track-card flex basis is sized for a row of cards; in this
              // column it became a 220px height with empty space below the text.
              style={{ textAlign: 'left', flex: 'none' }}
            >
              <strong>{t('challenge.relaxedPace')}</strong>
              <span>{t('challenge.relaxedHint')}</span>
            </button>
            <HStack gap={2} align="center" wrap="wrap">
              <SwimCta label={t('challenge.startButton')} dir={-1} onClick={() => void startRun()} />
            </HStack>
          </VStack>
        </section>
        <aside className="ss-panel" style={{ padding: 20 }}>
          <VStack gap={1.5}>
            <Heading level={3}>{t('challenge.topScores')}</Heading>
            {boardLoading ? (
              <Text color="secondary">…</Text>
            ) : boardQuery.isError ? (
              <VStack gap={1}>
                <Banner status="warning" title={t('challenge.boardUnavailable')} />
                <Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void boardQuery.refetch()} />
              </VStack>
            ) : board && board.top.length > 0 ? (
              <LeaderboardList board={{ ...board, top: board.top.slice(0, 5) }} />
            ) : (
              <Text type="supporting" color="secondary">{t('challenge.noChampion')}</Text>
            )}
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

            <ResultShareActions
              kind="challenge_result"
              label={t('challenge.shareLabel')}
              headline={t('challenge.shareHeadline', { n: score })}
              detail={t(relaxedPace ? 'challenge.shareDetailPractice' : 'challenge.shareDetail')}
              text={t('challenge.shareText', { n: score })}
              path="/challenge"
              centered
            />

            {relaxedPace ? (
              <Banner status="info" title={t('challenge.practiceScore')} />
            ) : !submittedScore ? (
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
                  {t('challenge.topScores')}
                </Text>
                <LeaderboardList board={board} />
              </VStack>
            )}

            <HStack gap={1.5} justify="center" wrap="wrap">
              <Button variant="primary" label={t('challenge.playAgain')} onClick={() => void startRun()} />
              <Button variant="secondary" label={t('challenge.backToIntro')} onClick={() => setPhase('intro')} />
            </HStack>

            {/* The invite link at the end of a run (#239); nothing while
                signed out or while invitations are off. */}
            <ReferralMoment signedIn={!!user} source="challenge" />
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
  const timePct = (Math.max(0, timeLeft) / timeLimitS) * 100;
  // Once the clock is out, no answer can be picked or sent: the question is a
  // timeout strike, whatever the connection is doing.
  const timeUp = timeLeft <= 0;

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
              borderRadius: 'var(--radius-element)',
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
          background: 'var(--color-background-surface)',
          border: '1px solid var(--color-border)',
          borderTop: `4px solid ${accent}`,
          borderRadius: 'var(--radius-container)',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
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

          {/* Single-choice answers use the shared roving-tabindex radio pattern. Raise them ~50px
              off the wave on phones. */}
          <RadioCardGroup
            value={selected}
            onChange={(value) => { if (!lastResult && !timeUp) setSelected(Number(value)); }}
            labelledBy="challenge-question"
            style={{ flexShrink: 0, marginTop: 'auto', marginBottom: isMobile ? 50 : 0 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {current.options.map((opt, idx) => {
                const isSel = selected === idx;
                const graded = !!lastResult;
                const isCorrectOpt = graded && idx === lastResult!.correctAnswer;
                const isWrongPick =
                  graded && idx === lastResult!.selectedIndex && !lastResult!.isCorrect && !lastResult!.notCounted;
                return (
                  <RadioCard
                    key={idx}
                    value={idx}
                    index={idx}
                    label={opt}
                    disabled={graded || timeUp}
                    tone={isCorrectOpt ? 'success' : 'default'}
                    padding={2}
                    style={{
                      ...(isWrongPick ? {
                        borderColor: 'var(--ss-error)',
                        background: 'var(--ss-error-soft)',
                        color: 'var(--ss-error)',
                      } : {}),
                    }}
                  >
                    <HStack gap={2} align="center">
                      <span
                        aria-hidden
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius-inner)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          fontSize: 'var(--ss-type-meta)',
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
                  </RadioCard>
                );
              })}
            </div>
          </RadioCardGroup>
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
            borderRadius: 'var(--radius-container)',
            boxShadow: 'var(--shadow-high)',
          }}
        >
          <Banner
            status={lastResult.notCounted ? 'info' : lastResult.isCorrect ? 'success' : 'error'}
            title={
              lastResult.notCounted === 'retired'
                ? t('challenge.questionRetired')
                : lastResult.notCounted === 'expired'
                  ? t('challenge.questionExpired')
                  : lastResult.isCorrect
                    ? t('challenge.correct')
                    : lastResult.timedOut
                      ? t('challenge.questionTimeout')
                      : t('challenge.wrong')
            }
            description={lastResult.explanation || undefined}
          />
        </div>
      )}

      {!lastResult && strikeWaiting && (
        <div style={{ marginTop: 12, flexShrink: 0 }}>
          <Banner status="warning" title={t('challenge.strikeRetrying')} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8, flexShrink: 0 }}>
        {!lastResult ? (
          <Button
            variant="primary"
            label={t('challenge.lockIn')}
            isDisabled={selected == null || submitting || timeUp}
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

function LeaderboardList({ board }: { board: ChallengeLeaderboard }) {
  // role="list" restores list semantics that Safari/VoiceOver drop when
  // list-style is none.
  return (
    <ol role="list" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
      {board.top.map((row, i) => (
        <li
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
        </li>
      ))}
    </ol>
  );
}
