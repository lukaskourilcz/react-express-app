// A Learn level or part test once it is open: its questions with instant
// feedback, the coding tasks a level ends with, and the result. Roadmap.tsx
// loads it when a level opens, with the level intros and worked-example
// figures it shows, so the Learn map paints without them.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button as AxButton } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Kicker } from '../landing/LandingKit';
import { AppToast } from '../ui/AppToast';
import { RadioCard, RadioCardGroup } from '../ui/RadioCards';
import { useIsMobile } from '../../lib/useMediaQuery';
import type { RoadmapPlayable, RoadmapQuestion, RoadmapAnswerResult } from '../../types/quiz';
import type { LearnRepeatXp } from '../../../../shared/repeat-xp';
import type { PlayableCodingTask } from '../../../../shared/coding-catalog';
import { submitRoadmapAnswer, completeRoadmapAttempt, checkRoadmapAttempt } from '../../lib/roadmap';
import ReferralMoment from '../ReferralMoment';
import ResultShareActions from '../ResultShareActions';
import { ROADMAP_MAX_HEARTS } from '../../../../shared/assessment';
import { levelIntro } from '../../lib/levelIntros';
import { categoryLabelKey, hoverFilterOn, textOnColor } from '../../lib/categories';
import { BRAND } from '../../theme/MuiTheme';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { useAuth } from '../../lib/auth';
import { ApiError, friendlyError } from '../../lib/api';
import { reportQuestion } from '../../lib/supabase';
import { shuffleDifferentFrom } from '../../lib/shuffle';
import { autosaveDraft, codingDraftQuery, flushAutosave, forgetDeviceDraft, openingDraft, saveDraft } from '../../coding/drafts';
import { fetchCodingTask } from '../../coding/api';
import { DraftNote, useDraftChoice } from '../../coding/DraftNote';
import { renderQuestion } from '../CodeBlock';
import { TermsBar } from '../ui/Terms';
import { LessonFigures } from '../ui/LessonFigure';
import { figuresFor } from '../../../../shared/lesson-figures';
import { glossaryDomainFor } from '../../lib/glossaryDomain';
import { RedFlagDialog } from '../RedFlagDialog';
import { IconTile, CloseIcon, FlagIcon, TrophyIcon } from '../ui/icons';
import { lazyShellPart } from '../../lib/routeRecovery';
import { ShellPartBoundary } from '../ShellPartBoundary';
import ErrorRetry from '../ErrorRetry';
import { SaveSharkCard } from '../SaveSharkCard';
import { CheckIcon } from './SectionRail';

// The coding workbench pulls the editor and the runner in; keep it out of the
// Learn chunk until a devShark level actually reaches its coding phase. A
// `lazyShellPart` inside its own boundary: when its code does not load, the
// level stays on screen with "Could not load this task." and a Try again that
// asks again, or reloads when the same failure comes straight back.
const CodingWorkbench = lazyShellPart(() => import('../../coding/CodingWorkbench').then((m) => ({ default: m.CodingWorkbench })));

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const CHECKPOINT_GOLD = BRAND.gold;
// Lives for a level lesson: one heart that drains a third per wrong answer.
// The API grades the same rule, so the number is shared.
const MAX_HEARTS = ROADMAP_MAX_HEARTS;
const HEART_COLOR = BRAND.coral;

// The server already shuffles answer options and seals their accepted indices.
// We may vary question order locally without changing those protected indices.
function presentQuestions(questions: RoadmapQuestion[], prev?: RoadmapQuestion[]): RoadmapQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const reference = (prev ?? questions).map((q) => byId.get(q.id)).filter((q): q is RoadmapQuestion => !!q);
  return reference.length === questions.length
    ? shuffleDifferentFrom(questions, reference)
    : shuffleDifferentFrom(questions, questions);
}

/* ──── lesson runner (instant feedback) ─────────────────────────────────── */

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const HeartShape = ({ color, style }: { color: string; style?: CSSProperties }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" style={style} aria-hidden>
    <path fill={color} d={HEART_PATH} />
  </svg>
);

// A single heart that drains a third per mistake. The red fill is anchored to the
// bottom and clipped to the remaining fraction, so it empties from the top down.
function HeartMeter({ mistakes, max, hit, t }: { mistakes: number; max: number; hit: boolean; t: TFn }) {
  const remaining = Math.max(0, max - mistakes);
  const frac = remaining / max;
  return (
    <div
      className={`rm-heart${hit ? ' rm-shake' : ''}`}
      role="img"
      aria-label={t('roadmap.heartsLeft', { n: remaining, max })}
      style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}
    >
      <HeartShape color={`${HEART_COLOR}2e`} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${frac * 100}%`, overflow: 'hidden', transition: 'height 0.45s cubic-bezier(0.34, 1.3, 0.5, 1)' }}>
        <HeartShape color={HEART_COLOR} style={{ position: 'absolute', bottom: 0, left: 0 }} />
      </div>
    </div>
  );
}

/** Why a level's session can no longer be used. `expired`: it outlived the
 * attempt the server keeps for it (two hours), or the attempt was closed.
 * `signInChanged`: it was opened under a different sign-in than the one now
 * answering (a sign-in or sign-out mid-level). */
type SessionRestart = 'expired' | 'signInChanged';
function sessionRestartFor(error: unknown): SessionRestart | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'session_owner_mismatch') return 'signInChanged';
  if (error.code === 'invalid_session' || error.code === 'attempt_conflict') return 'expired';
  return null;
}

/** One coding task of a level. It opens on this device's copy or the
 * account draft, keeps a device copy as the learner types and saves to the
 * account on Run and Submit, as a task in the Coding section does
 * (coding/drafts.ts): a copy from this device that did not open is offered
 * back, and a save the account refused is asked about. The workbench reads
 * its code once, so it waits for the account's draft; a draft that cannot
 * load leaves this device's copy. */
function LessonCodingTask({ task, session, signedIn, onPassed, onRevealed, onContinue }: {
  task: PlayableCodingTask;
  session: string;
  signedIn: boolean;
  onPassed: () => void;
  onRevealed: () => void;
  onContinue: () => void;
}) {
  const { t } = useLanguage();
  const [currentTask, setCurrentTask] = useState({ task, session });
  const draft = useQuery({ ...codingDraftQuery(task.id), enabled: signedIn });
  const waiting = signedIn && draft.isLoading;
  const opening = useMemo(() => (waiting ? null : openingDraft(task.id, draft.data?.code ?? null, draft.data?.updatedAt)), [waiting, task.id, draft.data]);
  const choice = useDraftChoice(task.id, opening, draft.data?.updatedAt ?? null, { signedIn });
  const { base, epoch } = choice;
  // Leaving the step writes what is still waiting.
  useEffect(() => () => flushAutosave(task.id), [task.id]);
  const loading = <div className="cd-note" role="status">{t('common.loading')}</div>;
  if (!opening) return loading;
  return (
    <>
      <DraftNote choice={choice} />
      <Suspense fallback={loading}>
        <ShellPartBoundary fallback={(retry, busy) => <ErrorRetry message={t('coding.loadError')} onRetry={retry} busy={busy} />}>
          <CodingWorkbench
            key={choice.version}
            task={currentTask.task}
            session={currentTask.session}
            locked={null}
            signedIn={signedIn}
            initialCode={choice.code}
            mode="lesson"
            onDraft={(code) => saveDraft(task.id, code, { signedIn, base, epoch })}
            onEdit={(code) => autosaveDraft(task.id, code, base, epoch)}
            onVerdict={(verdict) => {
              if (verdict.verdict === 'passed') {
                forgetDeviceDraft(task.id, epoch);
                onPassed();
              }
            }}
            onRefreshTask={async (code) => {
              saveDraft(task.id, code, { signedIn, base, epoch });
              const refreshed = await fetchCodingTask(task.id, undefined, currentTask.session);
              if (!refreshed.session) throw new Error(t('coding.loadError'));
              setCurrentTask({ task: refreshed.task, session: refreshed.session });
            }}
            onRevealed={onRevealed}
            onContinue={onContinue}
          />
        </ShellPartBoundary>
      </Suspense>
    </>
  );
}

export function LessonRunner({
  playable, firstLevelPass = false, topicCompleted = false, skipIntro = false, topicColor, hasNext, nextLabel, onExit, onFinished, onNext, onReplay, t,
}: {
  playable: RoadmapPlayable;
  /** No Learn level was passed before this one opened (#239). */
  firstLevelPass?: boolean;
  topicCompleted?: boolean;
  /** Full lesson reading already preceded this attempt. */
  skipIntro?: boolean;
  topicColor: string; hasNext: boolean; nextLabel: string;
  onExit: () => void; onFinished: (pct: number, repeatXp?: LearnRepeatXp) => void; onNext: () => void;
  onReplay: () => void; t: TFn;
}) {
  const { user } = useAuth();
  // Fixed when the level opens: the pass itself updates the progress the
  // parent reads, and the offer must stay on the finish screen.
  const [firstPassMoment] = useState(() => firstLevelPass && playable.kind === 'level');
  // Read only to say whether this topic is part of the learner's own plan.
  const isMobile = useIsMobile();
  const isCheckpoint = playable.kind === 'checkpoint';
  const accent = isCheckpoint ? CHECKPOINT_GOLD : topicColor;
  // Accent-filled buttons take their text colour from the fill: topic hues run
  // from CSS blue to JavaScript yellow and checkpoints use gold, so no single
  // colour reads on all of them. The hover filter follows the text colour.
  const accentFill = {
    backgroundColor: accent,
    ['--rm-on-accent']: textOnColor(accent),
    ['--rm-accent-hover']: hoverFilterOn(accent),
  } as CSSProperties;
  // A level opens with a short info panel (what this section is about + a core
  // principle) before the first question. Checkpoints/part-tests skip it, as do
  // levels with no authored intro.
  const intro = playable.kind === 'level' ? levelIntro(playable.topic, playable.ref) : null;
  const [showIntro, setShowIntro] = useState<boolean>(() => !skipIntro && !!intro);
  // Question sequence + answer order are shuffled on every play (and re-shuffled
  // on replay, avoiding the previous layout) so positions stay unmemorisable.
  const [presented] = useState<RoadmapQuestion[]>(() => presentQuestions(playable.questions));
  const total = presented.length;
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<RoadmapAnswerResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  // Hearts apply to levels only; checkpoints keep the percent-based pass rule.
  const [mistakes, setMistakes] = useState(0);
  const [dead, setDead] = useState(false);
  const [heartHit, setHeartHit] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSnack, setFlagSnack] = useState(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  // devShark code levels end with coding tasks. The level passes only when the
  // server has a passed verdict for every one of them (the ids are sealed in
  // the level session), so the finish screen reads the server's answer.
  const codingTasks = useMemo(() => (playable.kind === 'level' ? playable.coding ?? [] : []), [playable]);
  const [codingPhase, setCodingPhase] = useState(false);
  const [codingIndex, setCodingIndex] = useState(0);
  const [codingPassed, setCodingPassed] = useState<string[]>([]);
  const [codingPending, setCodingPending] = useState<string[]>([]);
  // The learner showed the current task's solution, which ends the attempt.
  // The workbench stays, with the solution open, until they finish the level.
  const [solutionShown, setSolutionShown] = useState(false);
  // Signed out, the server passes a level on its questions and says its
  // coding tasks went unchecked; the finish screen says when they count.
  const [codingUnverified, setCodingUnverified] = useState(false);
  // The attempt was closed without a verdict because a question in it was
  // retired while it was open. Nothing was recorded, so the finish screen
  // offers the level again rather than a score.
  const [invalidated, setInvalidated] = useState(false);
  // The server can no longer use this session: it outlived its attempt, or it
  // was opened under a different sign-in. Sending it again fails the same
  // way, so the level offers a fresh start instead of Try again.
  const [restart, setRestart] = useState<SessionRestart | null>(null);
  const reportError = useCallback((error: unknown) => {
    const reason = sessionRestartFor(error);
    if (reason) setRestart(reason);
    else setAnswerError(friendlyError(error));
  }, []);

  const question = presented[qIndex];
  // Out of hearts once this answer is revealed and it pushed mistakes to the max.
  const outOfHearts = !isCheckpoint && mistakes >= MAX_HEARTS;

  // The question an answer was sent for. A ref, not only `grading`: a second
  // key press or click can land before the first one's state re-renders, and
  // each sent its own answer. Cleared when the send fails, so Try again works.
  const answeredRef = useRef<string | null>(null);
  const choose = useCallback(
    async (index: number) => {
      if (revealed || grading || answeredRef.current === question.id) return;
      answeredRef.current = question.id;
      setGrading(true);
      setAnswerError(null);
      setSelected(index);
      try {
        const result = await submitRoadmapAnswer(playable.sessionId, question.id, index);
        setSelected(result.selectedIndex);
        setGrade(result);
        setRevealed(true);
        if (result.isCorrect) {
          setCorrectCount((count) => count + 1);
        } else if (!isCheckpoint) {
          setMistakes((mistakeCount) => mistakeCount + 1);
          setHeartHit(true);
          window.setTimeout(() => setHeartHit(false), 500);
        }
      } catch (error) {
        answeredRef.current = null;
        reportError(error);
      } finally {
        setGrading(false);
      }
    },
    [revealed, grading, playable.sessionId, question.id, isCheckpoint, reportError],
  );

  // One completion at a time, and none after the attempt finished. Finish, the
  // coding step's Continue, Check completion and the focus and visibility
  // re-checks can each ask, sometimes at once (returning to the tab fires
  // both events); a second answer recorded the pass again, toasted its XP
  // twice and could replace the result with "timed out". A ref, because the
  // second ask can come before `completing` re-renders.
  const completionRef = useRef<'idle' | 'sending' | 'done'>('idle');
  const complete = useCallback(async () => {
    if (completionRef.current !== 'idle') return;
    completionRef.current = 'sending';
    setCompleting(true);
    setAnswerError(null);
    try {
      const result = await completeRoadmapAttempt(playable.sessionId);
      if (result.invalidated) {
        completionRef.current = 'done';
        setInvalidated(true);
        setCodingPhase(false);
        setFinished(true);
        return;
      }
      setCorrectCount(result.correctAnswers);
      setCodingPending(result.codingPending ?? []);
      setCodingUnverified(result.codingUnverified === true);
      if (result.waiting) {
        setCodingPhase(true);
        return;
      }
      completionRef.current = 'done';
      // A level that fails its coding gate is recorded as not passed even with
      // a full question score; report the percentage the server computed but
      // keep the local pass record honest.
      onFinished((result.codingPending?.length ?? 0) > 0 ? Math.min(result.percentage, playable.passPct - 1) : result.percentage, result.repeatXp);
      setCodingPhase(false);
      setFinished(true);
    } catch (error) {
      reportError(error);
    } finally {
      if (completionRef.current === 'sending') completionRef.current = 'idle';
      setCompleting(false);
    }
  }, [onFinished, playable.passPct, playable.sessionId, reportError]);

  const checkCoding = useCallback(async () => {
    try {
      const status = await checkRoadmapAttempt(playable.sessionId);
      const passed = status.coding.filter(item => item.passed).map(item => item.taskId);
      setCodingPassed(passed);
      if (status.coding.some(item => item.revealed)) setSolutionShown(true);
      if (codingPhase && codingTasks.every(item => passed.includes(item.task.id))) await complete();
    } catch (error) { reportError(error); }
  }, [playable.sessionId, codingPhase, codingTasks, complete, reportError]);
  useEffect(() => {
    if (!user || codingTasks.length === 0 || finished) return;
    const refresh = () => { if (document.visibilityState === 'visible') void checkCoding(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user, codingTasks.length, finished, checkCoding]);

  const advance = useCallback(async () => {
    if (outOfHearts) {
      if (completionRef.current !== 'idle') return;
      completionRef.current = 'sending';
      setCompleting(true);
      setAnswerError(null);
      try {
        const result = await completeRoadmapAttempt(playable.sessionId);
        completionRef.current = 'done';
        if (result.invalidated) {
          setInvalidated(true);
          setFinished(true);
          return;
        }
        setCorrectCount(result.correctAnswers);
        // Out of hearts is a failed level however the percentage lands, so keep
        // the local record below the pass mark and let the server decide.
        onFinished(result.passed ? result.percentage : Math.min(result.percentage, playable.passPct - 1), result.repeatXp);
        setDead(true);
        setFinished(true);
      } catch (error) {
        reportError(error);
      } finally {
        if (completionRef.current === 'sending') completionRef.current = 'idle';
        setCompleting(false);
      }
    } else if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setGrade(null);
      setAnswerError(null);
    } else if (codingTasks.length > 0) {
      // Questions done: the coding phase decides the rest of the level.
      setRevealed(false);
      setGrade(null);
      setAnswerError(null);
      setCodingPhase(true);
    } else {
      await complete();
    }
  }, [total, outOfHearts, qIndex, onFinished, playable.passPct, playable.sessionId, codingTasks.length, complete, reportError]);

  const submitFlag = async (detail?: string) => {
    await reportQuestion({
      questionId: question.id,
      reason: 'needs-review',
      detail,
      reporterSub: user?.id,
      // The wording that was on screen, so a fix can be checked against it.
      contentVersion: question.review?.version,
    });
    setFlagOpen(false);
    setFlagSnack(true);
  };

  useEffect(() => {
    if (finished || showIntro || codingPhase) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"], [role="radio"], [role="checkbox"]')) return;
      if (!revealed && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < question.options.length) {
          e.preventDefault();
          void choose(idx);
        }
      } else if (revealed && e.key === 'Enter') {
        e.preventDefault();
        void advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, showIntro, codingPhase, revealed, question, choose, advance]);

  useEffect(() => {
    if (finished || restart) resultHeadingRef.current?.focus({ preventScroll: true });
  }, [finished, restart]);

  // Focus follows the lesson. An answer disables the option that held focus
  // and the next question removes the Continue that did, and focus fell to
  // the page: a keyboard learner had to tab through the whole shell to go on.
  // A revealed answer takes focus to its Continue (or Try again); a question
  // takes it to the question, where the number keys still answer.
  const questionRef = useRef<HTMLDivElement>(null);
  const feedbackActionRef = useRef<HTMLButtonElement>(null);
  const showingQuestion = !finished && !restart && !showIntro && !codingPhase;
  useEffect(() => {
    if (showingQuestion) questionRef.current?.focus({ preventScroll: true });
  }, [showingQuestion, qIndex]);
  useEffect(() => {
    if (revealed || answerError) feedbackActionRef.current?.focus({ preventScroll: true });
  }, [revealed, answerError]);

  if (restart) {
    return (
      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', textAlign: 'center', maxWidth: 520, margin: '0 auto', position: 'relative',
          paddingLeft: 16, paddingRight: 16,
        }}
      >
        <h1 ref={resultHeadingRef} tabIndex={-1} className="rm-finish-title">
          {restart === 'expired' ? t('roadmap.expiredTitle') : t('roadmap.signInChangedTitle')}
        </h1>
        <div role="status" style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          {restart === 'expired' ? t('roadmap.expiredBody') : t('roadmap.signInChangedBody')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <button type="button" className="rm-accent-btn" onClick={onReplay} style={accentFill}>
            {t('roadmap.restartLevel')}
          </button>
          <button type="button" className="rm-text-btn" onClick={onExit}>
            {t('roadmap.backToPath')}
          </button>
        </div>
      </div>
    );
  }

  if (showIntro && intro) {
    return (
      <div style={{ width: '100%', minWidth: 0, maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <AxButton isIconOnly icon={<CloseIcon size={18} />} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
          <div style={{ flex: 1 }} />
        </div>
        <div
          className="rm-feedback"
          style={{
            marginTop: 8,
            padding: isMobile ? 20 : 24,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            borderLeft: `4px solid ${accent}`,
            backgroundColor: `${accent}0d`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'var(--color-text-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8125rem', display: 'inline-block' }}>
              {`${t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
            </span>
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}>
            {t('roadmap.introKicker')}
          </div>
          <div style={{ fontSize: '1.02rem', lineHeight: 1.6, marginTop: 4, marginBottom: 4 }}>
            {intro}
          </div>
          {/* The worked example for this level's objective, before the
              questions. Figures that would answer one of them are held back;
              `figuresFor` filters them out at this phase rather than the
              renderer hiding them afterwards. */}
          <LessonFigures figures={figuresFor(playable.topic, playable.ref, 'before')} />
          {codingTasks.length > 0 && (
            <div style={{ marginTop: 12, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              <span style={{ fontWeight: 700 }}>{t('coding.lesson.kicker')}: </span>
              {codingTasks.map(({ task, session }, index) => <span key={task.id}>
                {index > 0 && ' · '}<a className="cd-link" target="_blank" rel="noopener noreferrer" href={`/coding/${task.track}/${task.id}#learn=${encodeURIComponent(session)}`}>{task.title}</a>
              </span>)}
            </div>
          )}
        </div>
        <button
          type="button"
          className="rm-accent-btn"
          onClick={() => setShowIntro(false)}
          style={{ marginTop: 20, width: '100%', ...accentFill }}
        >
          {t('roadmap.introStart')}
        </button>
      </div>
    );
  }

  if (codingPhase && codingTasks[codingIndex]) {
    const current = codingTasks[codingIndex];
    const title = current.task.title;
    return (
      <div className="cd-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', gap: 12, paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <AxButton isIconOnly icon={<CloseIcon size={18} />} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
          <span style={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'var(--color-text-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8125rem', display: 'inline-block' }}>
            {`${t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
          </span>
          <Kicker style={{ marginLeft: 'auto' }}>{t('coding.lesson.kicker')} · {t('coding.lesson.counter', { n: codingIndex + 1, total: codingTasks.length })}</Kicker>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{t('coding.lesson.intro')} {t('coding.lesson.giveUpNote')}</p>
        <div className="cd-actions">
          <a className="cd-link" target="_blank" rel="noopener noreferrer" href={`/coding/${current.task.track}/${current.task.id}#learn=${encodeURIComponent(current.session)}`}>{t('coding.lesson.openTab')}</a>
          {user && <AxButton variant="secondary" label={t('coding.lesson.checkCompletion')} onClick={() => void checkCoding()} isDisabled={completing} />}
        </div>
        {answerError && <div role="alert" className="cd-note cd-note--error">{answerError}</div>}
        <LessonCodingTask
          key={current.task.id}
          task={current.task}
          session={current.session}
          signedIn={Boolean(user)}
          onPassed={() => setCodingPassed((prev) => (prev.includes(current.task.id) ? prev : [...prev, current.task.id]))}
          onRevealed={() => setSolutionShown(true)}
          onContinue={() => {
            if (codingIndex < codingTasks.length - 1) setCodingIndex((i) => i + 1);
            else void complete();
          }}
        />
        {/* The solution the learner asked for stays on screen: the attempt
            ends when they finish the level, not the moment it opens. */}
        {solutionShown && (
          <div className="cd-note" role="status">
            <p style={{ margin: '0 0 12px' }}>{t('coding.lesson.solutionShown')}</p>
            <button type="button" className="rm-accent-btn" onClick={() => void complete()} disabled={completing} style={accentFill}>
              {t('coding.lesson.finishLevel')}
            </button>
          </div>
        )}
        <span className="cd-visually-hidden" aria-live="polite">{t('coding.lesson.pending', { n: codingTasks.length - codingPassed.length })}: {title}</span>
      </div>
    );
  }

  if (finished && invalidated) {
    return (
      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', textAlign: 'center', maxWidth: 520, margin: '0 auto', position: 'relative',
          paddingLeft: 16, paddingRight: 16,
        }}
      >
        <h1 ref={resultHeadingRef} tabIndex={-1} className="rm-finish-title">{t('roadmap.invalidatedTitle')}</h1>
        <div role="status" style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          {t('roadmap.invalidatedBody')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <button type="button" className="rm-accent-btn" onClick={onReplay} style={accentFill}>
            {t('roadmap.retryLevel')}
          </button>
          <button type="button" className="rm-text-btn" onClick={onExit}>
            {t('roadmap.backToPath')}
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = !dead && pct >= playable.passPct && codingPending.length === 0;
    const title = dead
      ? t('roadmap.outOfHeartsTitle')
      : passed
        ? isCheckpoint ? t('roadmap.checkpointComplete') : t('roadmap.levelComplete')
        : isCheckpoint ? t('roadmap.checkpointFailed') : t('roadmap.levelFailed');
    return (
      // Center vertically in the lesson viewport (celebration deserves the
      // stage) and move focus to the outcome heading when grading completes.
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 520,
          margin: '0 auto',
          position: 'relative',
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* Confetti IS the celebration on a pass; the icon stays quiet. */}
        {passed && <Confetti color={accent} />}
        {passed && (
          <div className="rm-celebrate" style={{ marginBottom: 12 }} aria-hidden>
            <IconTile color={accent} size={56}>
              {isCheckpoint ? <TrophyIcon size={26} /> : <CheckIcon size={26} />}
            </IconTile>
          </div>
        )}
        <h1 ref={resultHeadingRef} tabIndex={-1} className="rm-finish-title">{title}</h1>
        {dead ? (
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            {t('roadmap.outOfHeartsBody', { max: MAX_HEARTS })}
          </div>
        ) : (
          <>
            <div className="rm-count" style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 800, color: passed ? accent : 'var(--color-text-secondary)', marginBottom: 4 }}>
              {pct}%
            </div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              {t('roadmap.scoreLine', { correct: correctCount, total })}
            </div>
            {codingTasks.length > 0 && !codingUnverified && (
              <div style={{ fontSize: '0.9rem', color: codingPending.length === 0 ? 'var(--ss-success-strong, var(--ss-success))' : 'var(--ss-warning)', fontWeight: 600, marginBottom: 8 }}>
                {codingPending.length === 0 ? t('coding.lesson.allPassed') : t('coding.lesson.pending', { n: codingPending.length })}
              </div>
            )}
            {/* Signed out, a coding task's pass is never stored, so the level
                passed on its questions and is kept on this device only. */}
            {codingTasks.length > 0 && codingUnverified && (
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                {t('coding.lesson.guestUnverified')}
              </div>
            )}
            {!passed && pct < playable.passPct && (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                {t('roadmap.passNeeded', { pct: playable.passPct })}
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {passed && hasNext && (
            <button type="button" className="rm-accent-btn" onClick={onNext} style={accentFill}>
              {nextLabel}
            </button>
          )}
          <button type="button" className={passed ? 'rm-outline-btn' : 'rm-accent-btn'} onClick={onReplay} style={passed ? undefined : accentFill}>
            {t('roadmap.retryLevel')}
          </button>
          <button type="button" className="rm-text-btn" onClick={onExit}>
            {t('roadmap.backToPath')}
          </button>
        </div>
        {/* The learner's first passed level is the moment to offer the invite
            link (#239): a friend who joins gets the same first win. */}
        {passed && firstPassMoment && (
          <div style={{ marginTop: 20, width: '100%' }}>
            <ReferralMoment signedIn={!!user} source="learn_level" />
          </div>
        )}
        {passed && topicCompleted && <ResultShareActions centered kind="learn_topic_result"
          label={t(categoryLabelKey(playable.topic))} headline={t('roadmap.topicCompleted')}
          detail={t('roadmap.topicShareDetail')} text={t('roadmap.topicShareText', { topic: t(categoryLabelKey(playable.topic)) })}
          path={`/learn?topic=${playable.topic}`} />}
      </div>
    );
  }

  const progressPct = ((qIndex + (revealed ? 1 : 0)) / total) * 100;
  const isRight = grade?.isCorrect === true;

  return (
    // One-viewport lesson layout matching the Quiz card geometry: 560px
    // column, content capped at ~80% height on sm+ and centred; question
    // scrolls, answer options anchored toward the bottom in a stable position.
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: isMobile ? 680 : 560, margin: '0 auto' }}>
    <div style={{ flex: '1 1 auto', minHeight: 0, maxHeight: isMobile ? undefined : '80%', display: 'flex', flexDirection: 'column' }}>
      {/* Header: exit + (hearts for a level, progress bar for a checkpoint) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <AxButton isIconOnly icon={<CloseIcon size={18} />} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
        {isCheckpoint ? (
          <>
            <div
              role="progressbar"
              aria-label={t('roadmap.question', { current: qIndex + 1, total })}
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: 'var(--color-background-muted)', overflow: 'hidden' }}
            >
              <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 6, backgroundColor: accent, transition: 'width 0.35s ease' }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              {correctCount}/{total}
            </span>
          </>
        ) : (
          <>
            <HeartMeter mistakes={mistakes} max={MAX_HEARTS} hit={heartHit} t={t} />
            <div style={{ flex: 1 }} />
          </>
        )}
        <IconButton
          label={t('flag.ariaLabel')}
          icon={<FlagIcon size={16} />}
          variant="ghost"
          size="sm"
          tooltip={t('flag.ariaLabel')}
          onClick={() => setFlagOpen(true)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'var(--color-text-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8125rem', display: 'inline-block' }}>
          {`${isCheckpoint ? t('roadmap.checkpoint') : t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
          {t('roadmap.question', { current: qIndex + 1, total })}
        </span>
      </div>

      {/* Question — the only region that scrolls when long. */}
      {/* Focused when a question opens (see above); not in the tab order, and
          no ring, as for <main>: it is a place to read, not a control. */}
      <div id="lesson-question" ref={questionRef} tabIndex={-1} style={{ fontWeight: 500, marginBottom: 16, flex: '1 1 auto', minHeight: 0, overflowY: 'auto', outline: 'none' }}>
        {renderQuestion(question.question)}
        {/* One control for the whole item: the question, every option and the
            explanation. Beside the block rather than inside an option, so it
            can never select an answer, and the same list for every option, so
            it can never single one out. */}
        <TermsBar
          texts={[question.question, ...question.options, grade?.explanation]}
          domain={glossaryDomainFor(playable.topic)}
        />
      </div>

      {/* Options — anchored toward the bottom, labelled by the question. */}
      <RadioCardGroup
        value={selected}
        onChange={(value) => setSelected(Number(value))}
        onActivate={(value) => void choose(Number(value))}
        labelledBy="lesson-question"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, marginTop: 'auto', marginBottom: isMobile ? 50 : 0 }}
      >
        {question.options.map((option, index) => {
          const isCorrect = index === grade?.correctAnswer;
          const isPicked = index === selected;
          const overrides: CSSProperties = {};
          let cls: string | undefined;
          if (revealed && isCorrect) {
            overrides.borderColor = 'var(--ss-success)'; overrides.backgroundColor = 'var(--ss-success-soft)'; overrides.color = 'var(--ss-success)'; cls = 'rm-correct-pop';
          } else if (revealed && isPicked && !isCorrect) {
            overrides.borderColor = 'var(--ss-error)'; overrides.backgroundColor = 'var(--ss-error-soft)'; overrides.color = 'var(--ss-error)'; cls = 'rm-shake';
          } else if (isPicked) {
            overrides.borderColor = accent;
          }
          return (
            <RadioCard
              key={index}
              value={index}
              index={index}
              className={`rm-option${cls ? ` ${cls}` : ''}`}
              disabled={revealed || grading}
              tone={revealed && isCorrect ? 'success' : 'default'}
              style={{ ['--rm-accent']: accent, ...overrides } as CSSProperties}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'var(--color-background-muted)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                {index + 1}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
              {revealed && isCorrect && <span style={{ color: 'var(--ss-success)', display: 'inline-flex' }}><CheckIcon size={18} /></span>}
            </RadioCard>
          );
        })}
      </RadioCardGroup>

      {!revealed && !answerError && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: isMobile ? 'none' : 'block', marginTop: 12, flexShrink: 0 }}>
          {t('roadmap.keyboardTip', { max: question.options.length })}
        </div>
      )}

      {/* Feedback OVERLAYS the answer options — a solid card floating over
          the bottom of the lesson viewport, so the anchored options don't get
          shoved around when the grade lands. Live region keeps AT informed. */}
      {(revealed || answerError) && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            left: isMobile ? 8 : 16,
            right: isMobile ? 8 : 16,
            bottom: isMobile ? 12 : 20,
            zIndex: 5,
          }}
        >
          <div
            className="rm-feedback"
            style={{
              padding: 16,
              borderRadius: 8,
              borderLeft: `4px solid ${isRight ? 'var(--ss-success)' : 'var(--ss-error)'}`,
              backgroundColor: 'var(--color-background-surface)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
              maxHeight: '48vh',
              overflowY: 'auto',
            }}
          >
            {answerError ? (
              <>
                <div role="alert" style={{ fontWeight: 700, color: 'var(--ss-error)' }}>{answerError}</div>
                <button
                  ref={feedbackActionRef}
                  type="button"
                  className="rm-accent-btn"
                  onClick={() => revealed ? void advance() : selected !== null ? void choose(selected) : undefined}
                  disabled={grading || completing || (!revealed && selected === null)}
                  style={{ marginTop: 16, width: '100%', ...accentFill }}
                >
                  {t('roadmap.retry')}
                </button>
              </>
            ) : grade ? (
              <>
                <div style={{ fontWeight: 800, color: isRight ? 'var(--ss-success)' : 'var(--ss-error)', marginBottom: 4 }}>
                  {isRight ? t('roadmap.correct') : t('roadmap.incorrect')}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  {grade.explanation}
                </div>
                {/* Shark Cards (owner decision 12): a missed question can be
                    kept with the answer and explanation graded here. */}
                {!isRight && (
                  <SaveSharkCard question={question} correctIndex={grade.correctAnswer} explanation={grade.explanation ?? ''} />
                )}
                <button
                  ref={feedbackActionRef}
                  type="button"
                  className="rm-accent-btn"
                  onClick={() => void advance()}
                  disabled={completing}
                  style={{ marginTop: 16, width: '100%', ...accentFill }}
                >
                  {outOfHearts ? t('roadmap.seeResult') : qIndex < total - 1 ? t('roadmap.continue') : t('roadmap.finish')}
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      <RedFlagDialog open={flagOpen} onClose={() => setFlagOpen(false)} onSubmit={submitFlag} />
      <AppToast
        open={flagSnack}
        onClose={() => setFlagSnack(false)}
        message={t('flag.sent')}
        autoHideDuration={3000}
      />
    </div>
    </div>
  );
}

/* ──── confetti burst ───────────────────────────────────────────────────── */

function Confetti({ color }: { color: string }) {
  const colors = [color, '#f5b301', '#2e7d32', '#3178c6', '#ec4899'];
  return (
    <div className="rm-confetti" aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => (
        <i
          key={i}
          style={{
            left: `${(i / 16) * 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 5) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
