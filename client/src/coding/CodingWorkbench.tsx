// The coding workbench: read the task, edit, run, submit, climb the hint
// ladder. Used by the Coding section (`mode="section"`) and inside a Learn
// level (`mode="lesson"`). It never fetches on its own: the parent hands it a
// playable task, its sealed session and the saved draft.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { SwimCta, FinButton } from '../components/landing/LandingKit';
import { Button } from '@astryxdesign/core/Button';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { readJSON, writeJSON } from '../lib/storage';
import { ApiError, friendlyError, isPremiumRequired } from '../lib/api';
import { Editor } from './Editor';
import { formatCode } from './runner/format';
import { runCodeTests, runPassed, warmRunner, type RunOutcome, type RunPhase } from './runner/run-tests';
import { TYPE_CHECK_STOPPED_MESSAGE } from '../../../shared/coding-evaluate';
import { HARNESS_URL, useReactHarness, type HarnessRun } from './useReactHarness';
import { attemptStarted, canGiveUp, giveUpAfter, ladderRungs, MIN_ATTEMPT_MS, type LadderRung } from './hint-ladder';
import { taskResources } from '../../../shared/coding-docs';
import { evolvingStage } from '../../../shared/evolving';
import { skipTask } from './practice';
import { TermsBar } from '../components/ui/Terms';
import { ReportDialog } from '../components/ReportDialog';
import { FlagIcon } from '../components/ui/icons';
import { reportQuestion } from '../lib/supabase';
import { glossaryDomainFor } from '../lib/glossaryDomain';
import { CodePuzzle } from './CodePuzzle';
import { useIsNarrowForEditor } from '../lib/useMediaQuery';
import { CODING_CODE_LIMIT_BYTES, SKIP_REASONS, type SkipReason } from '../../../shared/coding-api';
import { classifyFailure, failureHint } from '../../../shared/coding-failure';
import { revealCoding, submitCoding, useCodingApproaches } from './api';
import { CODING_TIERS, difficultyOf, formatOf, hasLearnLevel, type Localized, type PlayableCodingTask } from '../../../shared/coding-catalog';
import { DifficultyBadge } from './DifficultyBadge';
import type { CodingLockReason, CodingSolutionPair, CodingTaskProgress, CodingVerdictResponse } from '../../../shared/coding-api';
import './Coding.css';

/** Moves focus to a confirmation's safe choice when it appears. Module-level,
 * so its identity is stable and it runs once per mount. */
const focusOnMount = (node: HTMLButtonElement | null) => { node?.focus(); };

/** A React suite that moves focus inside the preview frame takes the page's
 * focus with it. Call before a run; the function it returns gives focus back
 * to whatever held it, unless that was the frame. */
const keepFocus = () => {
  const before = document.activeElement;
  return () => {
    const now = document.activeElement;
    if (now instanceof HTMLIFrameElement && now !== before && before instanceof HTMLElement && before.isConnected) before.focus();
  };
};

/** A reference solution written on one long line reads as a run-on sentence,
 * so it is laid out for reading. Solutions already on several lines are shown
 * as their author wrote them. */
const displaySolution = (source: string, track: PlayableCodingTask['track']): Promise<string> => (
  source.trim().includes('\n') || source.length <= 80
    ? Promise.resolve(source)
    : formatCode(source, track).then((formatted) => formatted.trimEnd(), () => source)
);

export interface CodingWorkbenchProps {
  task: PlayableCodingTask;
  session: string | null;
  locked: CodingLockReason | null;
  signedIn: boolean;
  /** The learner's recorded progress on this task, when the parent has it. A
   * recorded pass opens the Solution tab on a return visit. */
  progress?: CodingTaskProgress | null;
  initialCode: string | null;
  mode: 'section' | 'lesson';
  /** The parent's save-for-later control, rendered beside the report flag. */
  saveAction?: ReactNode;
  /** Called with the current code when the learner presses Run or Submit —
   * the two moments they have said the code is worth keeping. Nothing is
   * saved while they type, and nothing when they leave. 'tooLarge': the code
   * was kept on this device only, too large for the account. */
  onDraft?: (code: string) => 'tooLarge' | null | void;
  onVerdict?: (verdict: CodingVerdictResponse, submittedCode?: string) => void;
  onRevealed?: () => void;
  nextHref?: string | null;
  backHref?: string;
  onContinue?: () => void;
}

type Tab = 'results' | 'types' | 'console' | 'preview' | 'resources' | 'solution' | 'approaches';
type Phase = 'idle' | 'running' | 'submitting';

// Layout is a preference of the person, not of the task, and it is not their
// work: it lives on the device beside the drafts but under its own key, so
// clearing one never touches the other.
const LAYOUT_KEY = 'devshark:coding:layout:v1';
const SPLIT_MIN = 35;
const SPLIT_MAX = 75;
const SPLIT_DEFAULT = 58;
const SPLIT_STEP = 5;
interface WorkbenchLayout { split: number }
const readLayout = (): WorkbenchLayout => {
  const stored = readJSON<Partial<WorkbenchLayout>>(LAYOUT_KEY, {});
  const split = typeof stored.split === 'number' && Number.isFinite(stored.split)
    ? Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(stored.split)))
    : SPLIT_DEFAULT;
  return { split };
};

// A narrow screen waits for a bigger one by default, but the learner may take
// the editor here instead (docs/interactive-content-manifest.md). The choice is
// theirs for the rest of the browser session, on every task, and nothing else
// reads it: the server grades the same code from any screen.
const NARROW_EDITOR_KEY = 'devshark:coding:narrow-editor:v1';
const readNarrowEditor = (): boolean => {
  try { return sessionStorage.getItem(NARROW_EDITOR_KEY) === '1'; } catch { return false; }
};

/** The names a React suite gives its cases, in order, so Results can list them
 * before the first run. The suite is read, never executed, here. */
const suiteCaseNames = (suite: string | undefined): string[] =>
  Array.from((suite ?? '').matchAll(/\btest\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g), (match) => match[2]);

function Prompt({ text, className }: { text: string; className?: string }) {
  const parts = text.split('`');
  return (
    <p className={className}>
      {parts.map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : <span key={index}>{part}</span>))}
    </p>
  );
}

function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

export function CodingWorkbench(props: CodingWorkbenchProps) {
  const { task, session, locked, signedIn, progress, initialCode, mode, onDraft, onVerdict, onRevealed, nextHref, backHref, onContinue, saveAction } = props;
  const evolution = evolvingStage(task.id);
  const { t, lang } = useLanguage();
  const [reportOpen, setReportOpen] = useState(false);
  const L = useCallback((value: Localized | undefined): string => (value ? value[lang] || value.en : ''), [lang]);
  const online = useOnline();
  const baseId = useId();
  const isReact = task.track === 'react';
  const isTypeScript = task.track === 'typescript';
  const codeTrack = task.track === 'typescript' ? 'typescript' : 'javascript';
  const checklist = task.verify === 'checklist';

  const [code, setCode] = useState<string>(initialCode ?? task.starter);
  const [formattedCode, setFormattedCode] = useState<string>(task.starter);
  const [formatSource, setFormatSource] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [runPhase, setRunPhase] = useState<RunPhase | null>(null);
  const [run, setRun] = useState<RunOutcome | null>(null);
  const [serverChecked, setServerChecked] = useState(false);
  const [stale, setStale] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [failedRun, setFailedRun] = useState(false);
  const [verdict, setVerdict] = useState<CodingVerdictResponse | null>(null);
  // The code changed after the verdict: it still says what the server saw,
  // but no longer about the code on screen.
  const [verdictStale, setVerdictStale] = useState(false);
  // A pass recorded during this visit outlives the card that announced it: a
  // later Submit clears the card, not the pass.
  const [recordedPass, setRecordedPass] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The last Run or Submit kept the code on this device only.
  const [draftTooLarge, setDraftTooLarge] = useState(false);
  const [tab, setTab] = useState<Tab>(isReact ? 'preview' : 'results');
  const [hintsTaken, setHintsTaken] = useState(0);
  const [confirming, setConfirming] = useState<'reset' | 'reveal' | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => (task.checklist?.en ?? []).map(() => false));
  const [formatError, setFormatError] = useState<string | null>(null);
  const [layout, setLayout] = useState<WorkbenchLayout>(readLayout);
  const [skipping, setSkipping] = useState(false);
  const [skipSubmitting, setSkipSubmitting] = useState(false);
  const [skipReason, setSkipReason] = useState<SkipReason>('later');
  const [skipNote, setSkipNote] = useState('');
  const [skipResult, setSkipResult] = useState<{ required: boolean; next: string | null } | null>(null);
  const [skipError, setSkipError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const verdictRef = useRef<HTMLElement | null>(null);
  const resetRef = useRef<HTMLButtonElement | null>(null);
  const revealRef = useRef<HTMLButtonElement | null>(null);
  const solutionRef = useRef<HTMLDivElement | null>(null);
  // The browser's own run during a Submit, which the server's answer replaces.
  const localRun = useRef<AbortController | null>(null);
  const harness = useReactHarness();
  // What a narrow screen gets instead of an editor: the task's puzzle when it
  // has one, and an honest pending state when it does not. Neither is a pass.
  // Both offer the editor anyway, so neither is a dead end: a puzzle never
  // completes its task, and without the editor a phone could not pass it.
  const narrow = useIsNarrowForEditor();
  const [editorHere, setEditorHere] = useState(readNarrowEditor);
  const editorPaneRef = useRef<HTMLElement | null>(null);
  const focusEditorPane = useRef(false);
  const puzzleMode = narrow && Boolean(task.puzzle) && mode === 'section' && !editorHere;
  const pendingOnDesktop = narrow && !task.puzzle && !editorHere;
  const chooseEditorHere = useCallback(() => {
    try { sessionStorage.setItem(NARROW_EDITOR_KEY, '1'); } catch { /* the choice then lasts for this page only */ }
    focusEditorPane.current = true;
    setEditorHere(true);
  }, []);
  // The button that made the choice is gone, so focus goes to the pane that
  // replaced it rather than back to the top of the page.
  useEffect(() => {
    if (pendingOnDesktop || puzzleMode || !focusEditorPane.current) return;
    focusEditorPane.current = false;
    editorPaneRef.current?.focus();
  }, [pendingOnDesktop, puzzleMode]);

  const rungs = useMemo(() => ladderRungs(task, lang), [task, lang]);
  const taken = Math.min(hintsTaken, rungs.length);

  // Format the code for display once the learner pauses.
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!code.trim()) { setFormattedCode(code); setFormatSource(code); return; }
      void formatCode(code, task.track).then(formatted => {
        if (active) { setFormattedCode(formatted); setFormatSource(code); }
      }).catch(() => {
        if (active) { setFormattedCode(code); setFormatSource(code); }
      });
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [code, task.track]);

  useEffect(() => { writeJSON(LAYOUT_KEY, layout); }, [layout]);
  // The runner, and TypeScript's compiler, load while the brief is read: the
  // first Run does not wait for them, and Run still works if the connection
  // drops afterwards. Not while a puzzle or the wait for a bigger screen
  // stands in for the editor: a phone would download and start a compiler it
  // has no Run for. Choosing the editor starts it.
  const editorShown = !puzzleMode && !pendingOnDesktop;
  useEffect(() => (isReact || !editorShown ? undefined : warmRunner(codeTrack)), [isReact, editorShown, codeTrack]);
  // A Submit's browser preview has nowhere to report once the task is left.
  useEffect(() => () => localRun.current?.abort(), []);
  useEffect(() => { if (verdict) verdictRef.current?.focus(); }, [verdict]);

  const setSplit = useCallback((next: number) => {
    setLayout((current) => ({ ...current, split: Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(next))) }));
  }, []);

  // The separator is a real one: it takes focus, arrows move it in steps, Home
  // and End go to the limits, and Enter restores the default. Dragging is an
  // addition to that, never the only way.
  const onSeparatorKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -SPLIT_STEP : event.key === 'ArrowRight' ? SPLIT_STEP : 0;
    if (step !== 0) { event.preventDefault(); setSplit(layout.split + step); return; }
    if (event.key === 'Home') { event.preventDefault(); setSplit(SPLIT_MIN); return; }
    if (event.key === 'End') { event.preventDefault(); setSplit(SPLIT_MAX); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSplit(SPLIT_DEFAULT); }
  }, [layout.split, setSplit]);

  const onSeparatorPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const grid = event.currentTarget.parentElement;
    if (!grid) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const box = grid.getBoundingClientRect();
      if (box.width <= 0) return;
      setSplit(((moveEvent.clientX - box.left) / box.width) * 100);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [setSplit]);

  const onCodeChange = useCallback((next: string) => {
    setCode(next);
    if (run || harness.run) setStale(true);
    if (verdict) setVerdictStale(true);
    setServerChecked(false);
  }, [run, harness.run, verdict]);

  const files = useCallback(() => ({ '/App.js': code, '/App.test.js': task.suite ?? '' }), [code, task.suite]);

  const runLocal = useCallback(async () => {
    if (phase !== 'idle') return;
    setDraftTooLarge(onDraft?.(code) === 'tooLarge');
    localRun.current?.abort();
    setPhase('running');
    setServerChecked(false);
    setFormatError(null);
    try {
      if (isReact) {
        const restoreFocus = keepFocus();
        const outcome = await harness.start(files(), { tests: Boolean(task.suite), preview: true });
        restoreFocus();
        if (outcome.status !== 'done' || outcome.failed > 0) setFailedRun(true);
        setTab(task.suite ? 'results' : 'preview');
      } else {
        setRunPhase('starting');
        const outcome = await runCodeTests({
          track: codeTrack, code, tests: task.tests ?? [], typeTests: task.typeTests, grade: true, onPhase: setRunPhase,
        });
        setRun(outcome);
        setServerChecked(false);
        // A runner that never loaded is not an attempt, so it opens no hint.
        if (!outcome.runnerUnavailable && !runPassed(outcome)) setFailedRun(true);
        const typesBroken = outcome.check && (outcome.check.codeErrors.length > 0 || outcome.check.typeTests.some((one) => !one.pass));
        setTab(outcome.codeError ? 'results' : typesBroken ? 'types' : 'results');
      }
      setStale(false);
      setRunCount((n) => n + 1);
    } finally {
      setRunPhase(null);
      setPhase('idle');
    }
  }, [phase, isReact, harness, files, task.suite, task.tests, task.typeTests, codeTrack, code, onDraft]);

  /** What a failed request says: the server's reason in the learner's words.
   * Only a request that never arrived is a connection problem. */
  const submitFailure = useCallback((error: unknown): string => (
    error instanceof ApiError && error.code === 'too_large' ? t('coding.verdict.tooLarge') : friendlyError(error)
  ), [t]);

  const submit = useCallback(async () => {
    if (phase !== 'idle' || !session) return;
    setDraftTooLarge(onDraft?.(code) === 'tooLarge');
    // The server takes 20 kB of code; say so before sending more.
    if (new TextEncoder().encode(code).length > CODING_CODE_LIMIT_BYTES) {
      setSubmitError(t('coding.verdict.tooLarge'));
      return;
    }
    setPhase('submitting');
    setSubmitError(null);
    setFormatError(null);
    // A new Submit replaces the last verdict. Left standing, the old one sat
    // beside a rate-limit or network error as if it were this Submit's answer.
    setVerdict(null);
    setVerdictStale(false);
    const durationMs = Date.now() - startedAt.current;
    try {
      let result: CodingVerdictResponse;
      if (isReact) {
        if (checklist) {
          if (!checked.every(Boolean)) {
            setSubmitError(t('coding.checklist.note'));
            return;
          }
          result = await submitCoding({ session, code, runCount, hintsUsed: taken, durationMs });
        } else {
          // The frame runs the suite so the learner sees named cases and a
          // fresh preview straight away; the verdict itself comes from the
          // server, which runs the same suite where it cannot be edited.
          const restoreFocus = keepFocus();
          const outcome = await harness.start(files(), { tests: true, preview: true });
          restoreFocus();
          if (!(outcome.status === 'done' && outcome.total > 0 && outcome.failed === 0)) setFailedRun(true);
          setStale(false);
          setRunCount((n) => n + 1);
          setTab('results');
          result = await submitCoding({ session, code, runCount: runCount + 1, hintsUsed: taken, durationMs });
          setServerChecked(true);
        }
      } else {
        // The code goes to the server at once. The browser's own run is only a
        // preview while the server grades: a first compile, or a type that
        // keeps the checker busy, held Submit back for up to 45 s. Whichever
        // comes first, the server's run replaces it.
        const preview = new AbortController();
        localRun.current = preview;
        void runCodeTests({ track: codeTrack, code, tests: task.tests ?? [], typeTests: task.typeTests, grade: true, signal: preview.signal }).then((local) => {
          if (preview.signal.aborted) return;
          setRun(local);
          setServerChecked(false);
          setStale(false);
          if (!local.runnerUnavailable && !runPassed(local)) setFailedRun(true);
        });
        setRunCount((n) => n + 1);
        result = await submitCoding({ session, code, runCount: runCount + 1, hintsUsed: taken, durationMs });
        preview.abort();
        // The server's run is the verdict of record; show what it saw.
        setRun({ results: result.results, logs: result.logs, codeError: result.codeError, check: result.check, timedOut: result.verdict === 'timeout' });
        setServerChecked(true);
        const typesBroken = result.check && (result.check.codeErrors.length > 0 || result.check.typeTests.some((one) => !one.pass));
        setTab(result.codeError ? 'results' : typesBroken ? 'types' : 'results');
      }
      // The grader itself could not run. Nothing was recorded and nothing
      // was said about the code, so it reads as a problem to retry, not as a
      // build error or a failed attempt.
      if (result.graderUnavailable) {
        setServerChecked(false);
        setSubmitError(t('coding.verdict.graderUnavailable'));
        return;
      }
      if (result.verdict !== 'passed') setFailedRun(true);
      if (result.progress?.status === 'passed') setRecordedPass(true);
      setVerdict(result);
      onVerdict?.(result, code);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_session') setSubmitError(t('coding.verdict.sessionExpired'));
      // The upgrade sheet is already open; the line beside the button says why.
      else if (isPremiumRequired(error)) setSubmitError(t('error.premiumRequired'));
      else setSubmitError(submitFailure(error));
    } finally {
      setRunPhase(null);
      setPhase('idle');
    }
  }, [phase, session, isReact, checklist, checked, code, runCount, taken, harness, files, codeTrack, task.tests, task.typeTests, onVerdict, onDraft, t, submitFailure]);

  const format = useCallback(async () => {
    try {
      const formatted = await formatCode(code, task.track);
      setCode(current => current === code ? formatted : current);
      setFormattedCode(formatted);
      setFormatError(null);
    } catch (error) {
      setFormatError(String((error as Error)?.message ?? error).split('\n')[0]);
    }
  }, [code, task.track]);

  /** Send an arrangement. It goes through the same submit route as code, and
   * the server grades it the same from any device — the viewport decided what
   * to show, and nothing else. */
  const submitOrder = useCallback(async (order: string[]) => {
    if (!session || phase !== 'idle') return;
    setPhase('submitting');
    setSubmitError(null);
    setVerdict(null);
    setVerdictStale(false);
    try {
      const result = await submitCoding({
        session, order, runCount, hintsUsed: taken, durationMs: Date.now() - startedAt.current,
      });
      setVerdict(result);
      onVerdict?.(result);
    } catch (error) {
      setSubmitError(isPremiumRequired(error) ? t('error.premiumRequired') : submitFailure(error));
    } finally {
      setPhase('idle');
    }
  }, [session, phase, runCount, taken, onVerdict, t, submitFailure]);

  const reset = useCallback(() => {
    setCode(task.starter);
    setFormattedCode(task.starter);
    setRun(null);
    setStale(false);
    setVerdictStale(true);
    setHintsTaken(0);
    setConfirming(null);
    // Reset is off now (there is nothing left to reset), so focus goes to the
    // code that was just replaced rather than to the page.
    editorPaneRef.current?.querySelector<HTMLElement>('.cm-content')?.focus();
  }, [task.starter]);

  const confirmSkip = useCallback(async () => {
    if (skipSubmitting) return;
    setSkipSubmitting(true);
    setSkipError(null);
    try {
      const answer = await skipTask({ taskId: task.id, reason: skipReason, note: skipNote.trim() || undefined });
      setSkipResult({ required: answer.required, next: answer.next });
      setSkipping(false);
    } catch {
      setSkipError(t('coding.skip.failed'));
    } finally {
      setSkipSubmitting(false);
    }
  }, [skipNote, skipReason, skipSubmitting, task.id, t]);

  const reveal = useCallback(async () => {
    if (!session) return;
    setConfirming(null);
    setSubmitError(null);
    try {
      const response = await revealCoding({ session, hintsUsed: taken });
      setSolution(await displaySolution(response.solution, task.track));
      onRevealed?.();
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.code === 'reveal_locked'
        ? t('coding.giveUpLocked', { n: giveUpAfter(rungs.length) })
        : isPremiumRequired(error) ? t('error.premiumRequired') : submitFailure(error));
      revealRef.current?.focus();
    }
  }, [session, taken, onRevealed, rungs.length, t, submitFailure, task.track]);
  // The button that asked for the solution is gone once it shows, so focus
  // goes to the solution itself.
  useEffect(() => { if (solution) solutionRef.current?.focus(); }, [solution]);

  const attemptReady = attemptStarted({ code, starter: task.starter, elapsedMs: Date.now() - startedAt.current, failedRun });
  // The minute is counted at render time, so a learner who edits and then
  // stops typing needs a render when it is up; without one the Hint button
  // waited for the next keystroke.
  const edited = code.trim() !== task.starter.trim();
  const [, setAttemptClock] = useState(0);
  useEffect(() => {
    if (!edited || failedRun) return;
    const left = MIN_ATTEMPT_MS - (Date.now() - startedAt.current);
    if (left <= 0) return;
    const timer = window.setTimeout(() => setAttemptClock((n) => n + 1), left);
    return () => window.clearTimeout(timer);
  }, [edited, failedRun]);
  const nextRung: LadderRung | null = rungs[taken] ?? null;
  // Why a control is unavailable is said beside it, not hidden in a disabled
  // button: the buttons stay focusable and hoverable and carry the reason as a
  // tooltip, and a click on one does nothing.
  const hintUnavailable = solution ? t('coding.hintTip.solutionShown') : !nextRung ? t('coding.hintExhausted') : !attemptReady ? t('coding.hintTip.locked') : '';
  const giveUpUnavailable = !canGiveUp(taken, rungs.length) ? t('coding.giveUpLocked', { n: giveUpAfter(rungs.length) }) : '';
  const takeHint = () => { if (!hintUnavailable && nextRung) setHintsTaken(taken + 1); };
  // Revealing the solution before a pass costs this task its XP and coins: the
  // server records the reveal against the account, and a later first pass then
  // pays nothing. After a recorded pass it costs nothing, so a section task
  // shows the solution at once; inside a Learn level showing it still ends the
  // level attempt, so that is asked first, without the XP line.
  const passedAlready = recordedPass || verdict?.progress?.status === 'passed' || progress?.status === 'passed';
  const revealCostsXp = signedIn && !passedAlready;
  const revealNote = mode === 'lesson'
    ? t(revealCostsXp ? 'coding.lesson.giveUpConfirm' : 'coding.lesson.giveUpEnds')
    : t(revealCostsXp ? 'coding.giveUpConfirmXp' : 'coding.giveUpConfirm');
  const askToReveal = () => {
    if (giveUpUnavailable) return;
    if (passedAlready && mode === 'section') void reveal();
    else setConfirming('reveal');
  };
  // Keeping the code, by the button or by Escape, hands focus back to the
  // button that asked; otherwise it fell to the page.
  const cancelConfirm = () => {
    const trigger = confirming === 'reset' ? resetRef.current : revealRef.current;
    setConfirming(null);
    trigger?.focus();
  };
  const onConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    cancelConfirm();
  };
  // A pass after a reveal says why it paid nothing, instead of reading like
  // any other pass. An accepted order is not a pass at all: the server says
  // "passed" about the arrangement, and the task stays open for the code.
  const puzzleAccepted = verdict?.puzzle?.accepted === true;
  const verdictLabel = verdict
    ? puzzleAccepted ? t('coding.puzzle.accepted')
      : verdict.verdict === 'passed' && verdict.xpForfeited === true ? t('coding.verdict.passedNoXp') : t(`coding.verdict.${verdict.verdict}` as never)
    : '';

  const busy = phase !== 'idle';
  const submitDisabled = busy || !session || !online || Boolean(solution);

  // The shortcut does what the button would: nothing, while Submit is off.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) { if (!submitDisabled) void submit(); }
      else void runLocal();
    }
  };
  const formatDisabled = busy || !code.trim() || formatSource !== code || code === formattedCode;
  const resetDisabled = busy || (code === task.starter && taken === 0);
  const tierLabel = t(`coding.tier.${CODING_TIERS[task.tier]}` as never);
  const trackLabel = t(`coding.track.${task.track}` as never);

  /* ── panels ─────────────────────────────────────────────────────────── */
  const localPassed = run ? runPassed(run) : null;
  // Server results replace the local run after Submit; otherwise a runner
  // startup error looked like a stale failed browser test with no explanation.
  const reactRun: HarnessRun | null = serverChecked && verdict && isReact && !checklist
    ? {
      token: harness.run?.token ?? 'server', status: verdict.codeError ? 'compile-error' : verdict.verdict === 'timeout' ? 'timeout' : 'done',
      compileError: verdict.codeError, previewError: harness.run?.previewError ?? null,
      cases: verdict.results.map((result, index) => ({name: harness.run?.cases[index]?.name ?? `${index + 1}`, status: result.pass ? 'pass' : 'fail', error: result.error ?? null, durationMs: 0})),
      logs: harness.run?.logs ?? [], passed: verdict.results.filter(result => result.pass).length,
      failed: verdict.results.filter(result => !result.pass).length, total: verdict.results.length, ran: true,
    } : harness.run;
  const resultsBadge = isReact
    ? reactRun && reactRun.status === 'done' && reactRun.total > 0 ? `${reactRun.passed}/${reactRun.total}` : null
    : run && !run.codeError && run.results.length > 0 ? `${run.results.filter((r) => r.pass === true).length}/${run.results.length}` : null;
  const typesBadge = run?.check ? (run.check.codeErrors.length === 0 && run.check.typeTests.every((one) => one.pass) ? 'ok' : String(run.check.codeErrors.length + run.check.typeTests.filter((one) => !one.pass).length)) : null;
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const resources = useMemo(() => taskResources(task.focus).filter(entry => !task.references?.some(ref => ref.url === entry.url)), [task.focus, task.references]);
  const resourceCount = resources.length + (task.references?.length ?? 0);

  // Approach comparisons open on a recorded pass, and the server decides that.
  // Giving up and reading the reference solution is a different thing: it does
  // not open this, which is why the flag below is the verdict and not `solution`.
  const passedNow = verdict?.verdict === 'passed' && !verdict.puzzle;
  const approaches = useCodingApproaches(task.id, signedIn && (passedNow || recordedPass || progress?.status === 'passed'));
  const approachList = approaches.data?.approaches ?? [];
  // The junior and senior solutions arrive with a verified pass — this one, or
  // a recorded earlier one — and from nowhere else.
  const solutions: CodingSolutionPair | null = verdict?.solutions ?? approaches.data?.solutions ?? null;
  const suiteCases = useMemo(() => suiteCaseNames(task.suite), [task.suite]);

  // What went wrong, said once, in the learner's language.
  //
  // The server's verdict wins when there is one: it classifies with the hidden
  // tests and the expected kinds, which the browser deliberately never sees.
  // Between submissions the Run button still gets a hint, from the narrower
  // signals the browser does hold — same vocabulary, same authored text, so a
  // learner is never told two different stories about one failure.
  const currentVerdict = verdictStale ? null : verdict;
  const localHint = useMemo(() => {
    if (currentVerdict || !run || runPassed(run)) return null;
    // Nothing ran, or the types stopped the checker: the note in Results
    // already names the cause, and no hint about the code would be true.
    if (run.runnerUnavailable || run.codeError === TYPE_CHECK_STOPPED_MESSAGE) return null;
    const typesBroken = Boolean(run.check && (run.check.codeErrors.length > 0 || run.check.typeTests.some((one) => !one.pass)));
    return failureHint(
      classifyFailure({
        timedOut: run.timedOut,
        threw: Boolean(run.codeError),
        typeErrors: typesBroken,
        results: run.results.map((one) => ({ pass: one.pass, actual: one.actual })),
        pitfall: task.pitfall,
      }),
      task.failureHints,
    );
  }, [currentVerdict, run, task.pitfall, task.failureHints]);
  const shownHint = currentVerdict?.failureHint ?? localHint;
  /** Why a run produced no results: the runner never loaded, the checker
   * stopped on the types, or the code ran out of time. */
  const runNote = (outcome: RunOutcome): string => outcome.runnerUnavailable ? t('coding.results.runnerUnavailable')
    : outcome.codeError === TYPE_CHECK_STOPPED_MESSAGE ? t('coding.results.typeCheckStopped') : t('coding.results.timeout');
  const tabs: { key: Tab; label: string; badge: string | null; good: boolean | null }[] = [
    { key: 'results', label: t('coding.tab.results'), badge: resultsBadge, good: isReact ? (reactRun ? reactRun.failed === 0 && reactRun.total > 0 : null) : localPassed },
    ...(isTypeScript ? [{ key: 'types' as Tab, label: t('coding.tab.types'), badge: typesBadge, good: typesBadge === 'ok' ? true : typesBadge ? false : null }] : []),
    { key: 'console', label: t('coding.tab.console'), badge: null, good: null },
    ...(isReact ? [{ key: 'preview' as Tab, label: t('coding.tab.preview'), badge: null, good: null }] : []),
    // Reading the documentation is not asking for help: this tab is open from
    // the moment the task loads, costs no hint rung, and needs no failed run.
    { key: 'resources', label: t('coding.tab.resources'), badge: resourceCount > 0 ? String(resourceCount) : null, good: null },
    // Opens with a verified pass: two more ways to write what was just solved.
    ...(solutions ? [{ key: 'solution' as Tab, label: t('coding.tab.solution'), badge: '2', good: null }] : []),
    // Only when there is something to compare. A tab that opens on nothing is
    // worse than no tab.
    ...(approachList.length > 0
      ? [{ key: 'approaches' as Tab, label: t('coding.tab.approaches'), badge: String(approachList.length), good: null }]
      : []),
  ];

  // Arrow/Home/End across the tab strip, per the ARIA tabs pattern.
  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    const index = tabs.findIndex((one) => one.key === tab);
    let next = -1;
    if (event.key in keys) next = (index + keys[event.key] + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const key = tabs[next].key;
    setTab(key);
    tabRefs.current[key]?.focus();
  };

  /** Reference pages for every technique this task declares. No solutions, no
   * hidden tests: these are the same public pages a working engineer opens. */
  const renderResources = (): ReactNode => {
    if (resourceCount === 0) {
      return <p className="cd-note">{t('coding.resources.empty')}</p>;
    }
    return (
      <div className="cd-resources">
        <p className="cd-shortcuts">{t('coding.resources.intro')}</p>
        <ul>
          {task.references?.map(ref => <li key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{L(ref.title)}</a></li>)}
          {resources.map((entry) => (
            <li key={entry.url}>
              <a href={entry.url} target="_blank" rel="noreferrer">
                {entry.title}
              </a>
              <span className="cd-resources__source">{entry.source}</span>
              <span className="cd-resources__blurb">{entry.blurb[lang] || entry.blurb.en}</span>
            </li>
          ))}
        </ul>
        {resources.length > 0 && !task.references?.length && <p className="cd-shortcuts">{t('coding.resources.reviewed', { date: resources[0].reviewed })}</p>}
      </div>
    );
  };

  /** Two or three ways to solve the same task, once the learner has solved it
   * themselves. The point is the comparison, so each one carries its cost, its
   * assumptions and what it gives up. */
  const renderApproaches = (): ReactNode => (
    <div className="cd-approaches">
      <p className="cd-shortcuts">{t('coding.approaches.intro')}</p>
      {approachList.map((approach, index) => (
        <article key={index} className="cd-approach">
          <h4>{approach.name[lang] || approach.name.en}</h4>
          <pre>{approach.code}</pre>
          <dl>
            <dt>{t('coding.approaches.cost')}</dt>
            <dd>{t('coding.approaches.costValue', { time: approach.time, space: approach.space })}</dd>
            <dt>{t('coding.approaches.readability')}</dt>
            <dd>{approach.readability[lang] || approach.readability.en}</dd>
            <dt>{t('coding.approaches.assumptions')}</dt>
            <dd>{approach.assumptions[lang] || approach.assumptions.en}</dd>
            <dt>{t('coding.approaches.tradeoffs')}</dt>
            <dd>{approach.tradeoffs[lang] || approach.tradeoffs.en}</dd>
          </dl>
        </article>
      ))}
    </div>
  );

  /** The junior and senior ways to write what the learner just solved. Both
   * pass every check the learner's own code did, and the point is the
   * distance between them. */
  const renderSolution = (): ReactNode => solutions && (
    <div className="cd-solutions">
      <p className="cd-shortcuts">{t('coding.solution.intro')}</p>
      {([['junior', solutions.junior], ['senior', solutions.senior]] as const).map(([level, code]) => (
        <article key={level} className="cd-hint cd-solution">
          <h4 className="cd-solution__title">{t(`coding.solution.${level}`)}</h4>
          <p className="cd-solution__note">{t(`coding.solution.${level}Note`)}</p>
          <pre>{code}</pre>
        </article>
      ))}
    </div>
  );

  /** One row of the Results list. Before a run the row still says what goes
   * in and what should come out; only the verdict column waits. */
  const codeRow = (test: NonNullable<PlayableCodingTask['tests']>[number], result: RunOutcome['results'][number] | undefined, index: number): ReactNode => {
    const status = result?.pass === true ? 'pass' : result?.pass === false ? 'fail' : 'idle';
    return (
      <li key={index} className={`cd-result cd-result--${status}`}>
        <span className="cd-result__status">{status === 'pass' ? t('coding.results.pass') : status === 'fail' ? t('coding.results.fail') : <><span aria-hidden="true">—</span><span className="cd-visually-hidden">{t('coding.results.pending')}</span></>}</span>
        <span className="cd-result__call">{test.call}{test.edge && <span className="cd-result__label"> · {t('coding.results.edge')}</span>}</span>
        {test.label && <span className="cd-result__label">{L(test.label)}</span>}
        <span className="cd-result__detail">
          {result?.error
            ? <><b>{t('coding.results.error')}:</b> {result.error}</>
            : <><b>{t('coding.results.expected')}:</b> {JSON.stringify(test.expected)}{result && <> · <b>{t('coding.results.actual')}:</b> {result.actual}</>}</>}
        </span>
      </li>
    );
  };

  const renderResults = (): ReactNode => {
    if (isReact) {
      if (checklist) {
        return (
          <>
            <p className="cd-note">{t('coding.checklist.note')}</p>
            <ul className="cd-checklist">
              {(task.checklist?.[lang].length ? task.checklist[lang] : task.checklist?.en ?? []).map((item, index) => (
                <li key={index}>
                  <label>
                    <input type="checkbox" checked={checked[index] ?? false} onChange={(e) => setChecked((prev) => prev.map((v, i) => (i === index ? e.target.checked : v)))} />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        );
      }
      if (!reactRun) {
        // Nothing has run, so the cases are listed by name with no verdict:
        // the learner sees what the suite will ask before writing a line.
        return (
          <>
            <p className="cd-console__empty">{t('coding.results.idle')}</p>
            {suiteCases.length > 0 && (
              <ul className="cd-results">
                {suiteCases.map((name, index) => (
                  <li key={index} className="cd-result cd-result--idle">
                    <span className="cd-result__status"><span aria-hidden="true">—</span><span className="cd-visually-hidden">{t('coding.results.pending')}</span></span>
                    <span className="cd-result__call">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      }
      if (reactRun.status === 'compile-error') return <p className="cd-note cd-note--error">{t('coding.preview.compileError', { message: reactRun.compileError ?? '' })}</p>;
      if (reactRun.status === 'timeout') return <p className="cd-note cd-note--warn">{t('coding.preview.timeout')}</p>;
      return (
        <>
          {reactRun.status === 'done' && <p className="cd-summary">{t('coding.results.passing', { passed: reactRun.passed, total: reactRun.total })}{verdict?.hidden && serverChecked && <small>{t('coding.results.hidden', { passed: verdict.hidden.passed, total: verdict.hidden.total })}</small>}{serverChecked && <small>{t('coding.results.serverNote')}</small>}{stale && <small>{t('coding.results.stale')}</small>}</p>}
          <ul className="cd-results">
            {reactRun.cases.map((one, index) => (
              <li key={index} className={`cd-result cd-result--${one.status}`}>
                <span className="cd-result__status">{one.status === 'pass' ? t('coding.results.pass') : t('coding.results.fail')}</span>
                <span className="cd-result__call">{one.name}</span>
                {one.error && <span className="cd-result__detail"><b>{t('coding.results.error')}:</b> {one.error}</span>}
              </li>
            ))}
          </ul>
        </>
      );
    }
    const tests = task.tests ?? [];
    if (!run) {
      // Before the first run every test is already on the board — the call
      // that goes in and the value that should come out — with no verdict.
      return (
        <>
          <p className="cd-console__empty">{t('coding.results.idle')}</p>
          {tests.length > 0 && (
            <ul className="cd-results">
              {tests.map((test, index) => codeRow(test, undefined, index))}
            </ul>
          )}
        </>
      );
    }
    if (run.runnerUnavailable || run.timedOut) return <p className="cd-note cd-note--warn">{runNote(run)}</p>;
    if (run.codeError) return <p className="cd-note cd-note--error">{t('coding.results.codeError')} <code className="cd-inline-code">{run.codeError}</code></p>;
    const passedCount = run.results.filter((r) => r.pass === true).length;
    return (
      <>
        <p className="cd-summary">
          {t('coding.results.passing', { passed: passedCount, total: run.results.length })}
          {verdict?.hidden && serverChecked && <small>{t('coding.results.hidden', { passed: verdict.hidden.passed, total: verdict.hidden.total })}</small>}
          {serverChecked && <small>{t('coding.results.serverNote')}</small>}
          {stale && <small>{t('coding.results.stale')}</small>}
        </p>
        <ul className="cd-results">
          {run.results.map((result, index) => codeRow(tests[index] ?? { call: '', expected: undefined }, result, index))}
        </ul>
      </>
    );
  };

  const renderTypes = (): ReactNode => {
    const check = run?.check;
    if (!check) {
      const typeTests = task.typeTests ?? [];
      return (
        <>
          <p className="cd-console__empty">{t('coding.results.idle')}</p>
          {typeTests.length > 0 && (
            <ul className="cd-results">
              {typeTests.map((typeTest, index) => (
                <li key={index} className="cd-result cd-result--idle">
                  <span className="cd-result__status"><span aria-hidden="true">—</span><span className="cd-visually-hidden">{t('coding.results.pending')}</span></span>
                  <span className="cd-result__call">{typeTest.code}{typeTest.rejects && <span className="cd-result__label"> · {t('coding.types.rejects')}</span>}</span>
                  {typeTest.label && <span className="cd-result__label">{L(typeTest.label)}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      );
    }
    const failing = check.typeTests.filter((one) => !one.pass).length;
    return (
      <>
        <p className="cd-summary">{check.codeErrors.length === 0 && failing === 0 ? t('coding.types.clean') : t('coding.types.errors', { n: check.codeErrors.length + failing })}</p>
        {check.codeErrors.length > 0 && (
          <ul className="cd-results">
            {check.codeErrors.map((error, index) => (
              <li key={index} className="cd-result cd-result--fail">
                <span className="cd-result__status">{t('coding.types.line', { n: error.line })}</span>
                <span className="cd-result__detail">{error.message}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="cd-editor-label">{t('coding.types.tests')}</p>
        <ul className="cd-results">
          {check.typeTests.map((one, index) => {
            const typeTest = task.typeTests?.[index];
            return (
              <li key={index} className={`cd-result cd-result--${one.pass ? 'pass' : 'fail'}`}>
                <span className="cd-result__status">{one.pass ? t('coding.results.pass') : t('coding.results.fail')}</span>
                <span className="cd-result__call">{typeTest?.code ?? ''}{typeTest?.rejects && <span className="cd-result__label"> · {t('coding.types.rejects')}</span>}</span>
                {typeTest?.label && <span className="cd-result__label">{L(typeTest.label)}</span>}
                {one.error && <span className="cd-result__detail">{one.error}</span>}
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  const logs = isReact ? (reactRun?.logs.map((entry) => `${entry.level === 'log' ? '' : `[${entry.level}] `}${entry.text}`) ?? []) : (run?.logs ?? []);
  const renderConsole = (): ReactNode => (logs.length === 0 ? <p className="cd-console__empty">{t('coding.console.empty')}</p> : <pre className="cd-console">{logs.join('\n')}</pre>);

  const renderPreview = (): ReactNode => (
    <>
      {reactRun?.previewError && <p className="cd-note cd-note--error">{t('coding.preview.error', { message: reactRun.previewError })}</p>}
      {reactRun?.status === 'timeout' && <p className="cd-note cd-note--warn">{t('coding.preview.timeout')} <Button variant="ghost" size="sm" onClick={harness.reload} label={t('coding.preview.reload')} /></p>}
      {!harness.ready && <p className="cd-console__empty">{t('coding.preview.starting')}</p>}
      <iframe key={harness.frameKey} ref={harness.iframeRef} src={HARNESS_URL} sandbox="allow-scripts allow-forms" title={t('coding.preview.title')} className="cd-frame" tabIndex={tab === 'preview' ? undefined : -1} />
    </>
  );

  // "Passing the visible examples is not enough" is only true when they all
  // passed; with a visible failure on screen it told the learner otherwise.
  const visiblePassed = Boolean(verdict && verdict.results.length > 0 && verdict.results.every((one) => one.pass === true)
    && !(verdict.check && (verdict.check.codeErrors.length > 0 || verdict.check.typeTests.some((one) => !one.pass))));
  // Grading finishes somewhere the learner is not looking, so focus follows the
  // result. The card is not a dialog and does not trap anything: it takes focus
  // once, and Tab carries on from there.
  const verdictCard = verdict && (
    <section className={`cd-verdict cd-verdict--${puzzleAccepted ? 'puzzle' : verdict.verdict}`} ref={verdictRef} tabIndex={-1}>
      <h3 className="cd-verdict__title">
        <span>{verdictLabel}</span>
        {verdict.xpAwarded > 0 && <span className="cd-verdict__xp">{t('coding.verdict.xp', { xp: verdict.xpAwarded })}</span>}
      </h3>
      {verdictStale && <p className="cd-verdict__row">{t('coding.verdict.stale')}</p>}
      {verdict.verdict === 'failed' && verdict.hidden && verdict.hidden.passed < verdict.hidden.total && visiblePassed && <p className="cd-verdict__row">{t('coding.verdict.hiddenFailed')}</p>}
      {verdict.puzzle ? (
        <>
          {/* The title already says whether the order works. */}
          {!verdict.puzzle.accepted && <p className="cd-verdict__row">{t('coding.puzzle.rejected')}</p>}
          {verdict.puzzle.accepted && (
            <p className="cd-verdict__row">{verdict.puzzle.claim[lang] || verdict.puzzle.claim.en}</p>
          )}
        </>
      ) : (
        verdict.verdict === 'passed' && verdict.progress && <p className="cd-verdict__row">{verdict.firstPass ? t('coding.verdict.firstPass') : t('coding.verdict.again')}</p>
      )}
      {verdict.verdict === 'passed' && !verdict.progress && !verdict.puzzle && <p className="cd-verdict__row">{signedIn ? t('coding.verdict.notRecorded') : t('coding.verdict.signIn')}</p>}
      {verdict.github && verdict.github.status !== 'not_connected' && (
        <p className="cd-verdict__row">
          {verdict.github.status === 'committed' && verdict.github.url ? <a className="cd-link" href={verdict.github.url} target="_blank" rel="noreferrer">{t('coding.github.committed', { repo: verdict.github.url.replace(/^https:\/\/github\.com\//, '').split('/').slice(0, 2).join('/') })}</a>
            : verdict.github.status === 'queued' ? t('coding.github.queued')
            : verdict.github.status === 'skipped' ? t('coding.github.skipped')
            : t('coding.github.failed')}
        </p>
      )}
      {verdict.verdict === 'passed' && !verdict.puzzle && (
        <div className="cd-verdict__actions">
          {mode === 'lesson' && onContinue && <SwimCta size="sm" dir={1} onClick={onContinue} label={t('coding.lesson.continue')} />}
          {mode === 'section' && nextHref && <Button variant="primary" as={Link} href={nextHref} label={t('coding.verdict.next')} />}
          {mode === 'section' && backHref && <Button variant="secondary" as={Link} href={backHref} label={t('coding.verdict.back')} />}
        </div>
      )}
    </section>
  );

  // Announce what a run or a submission concluded. A live region has to be in
  // the document BEFORE its text changes, so it lives here rather than on the
  // verdict card, which mounts along with its own message.
  // It says what the panel says: a build error, a timeout or type errors are
  // never read out as "N of M passing".
  const runAnnouncement = (): string => {
    if (isReact) {
      if (reactRun?.status === 'compile-error') return t('coding.preview.compileError', { message: reactRun.compileError ?? '' });
      if (reactRun?.status === 'timeout') return t('coding.preview.timeout');
      return reactRun?.status === 'done' ? t('coding.results.passing', { passed: reactRun.passed, total: reactRun.total }) : '';
    }
    if (!run) return '';
    if (run.runnerUnavailable || run.timedOut) return runNote(run);
    if (run.codeError) return t('coding.results.codeError');
    const passing = t('coding.results.passing', { passed: run.results.filter((one) => one.pass === true).length, total: run.results.length });
    const typeErrors = run.check ? run.check.codeErrors.length + run.check.typeTests.filter((one) => !one.pass).length : 0;
    return typeErrors > 0 ? `${passing}. ${t('coding.types.errors', { n: typeErrors })}` : passing;
  };
  const announcement = phase === 'running' || phase === 'submitting'
    ? t('coding.status.working')
    : currentVerdict
      ? verdictLabel
      : runAnnouncement();

  const titleId = `${baseId}-title`;
  const Title = mode === 'section' ? 'h1' : 'h2';
  const briefMeta = evolution
    ? t(evolution.challenge.short ? 'coding.evolving.level' : 'coding.evolving.stage', { n: evolution.index + 1, total: evolution.challenge.stages.length })
    : `${trackLabel} · ${tierLabel}${hasLearnLevel(task) ? ` · ${t('coding.level', { n: task.level })}` : ''}`;

  // The brief opens the pane the learner works in, whichever pane that is: one
  // green line with where the task sits and what it is called, then what it asks.
  const brief = (
    <div className="cd-brief">
      <div className="cd-brief__line">
        <span className="cd-brief__meta">{briefMeta}</span>
        <Title id={titleId} className="cd-brief__title">{L(task.title)}</Title>
        <DifficultyBadge difficulty={difficultyOf(task)} />
        {formatOf(task) === 'debug' && <span className="cd-tag cd-tag--format">{t('coding.format.debug')}</span>}
      </div>
      <Prompt className="cd-prompt" text={L(task.prompt)} />
      {/* Earlier briefs still apply, but they are context now, not the
          task: smaller, lighter, and numbered by the stage that set them. */}
      {Boolean(task.previousRequirements?.length) && <details className="cd-previous">
        <summary>{t('coding.evolving.previous')}</summary>
        <ol className="cd-previous__list">
          {task.previousRequirements!.map((requirement, index) => (
            <li key={index}>
              <span className="cd-previous__stage">{t(evolution?.challenge.short ? 'coding.evolving.levelShort' : 'coding.evolving.stageShort', { n: index + 1 })}</span>
              <Prompt className="cd-prompt cd-prompt--previous" text={L(requirement)} />
            </li>
          ))}
        </ol>
      </details>}
      {/* Beside the brief, so nothing is injected into code the learner
          is reading or about to run. */}
      <TermsBar texts={[L(task.prompt), L(task.title)]} domain={glossaryDomainFor(task.track)} />
      {formatOf(task) === 'debug' && <p className="cd-note">{t('coding.format.debugHint')}</p>}
      {task.api && <p className="cd-api"><code>{task.api.method} {task.api.url}</code><br />{L(task.api.note)}</p>}
      {locked && <p className="cd-note cd-note--warn">{t('coding.lockedTask')} {t(`coding.lock.${locked}` as never)}</p>}
      {!signedIn && mode === 'section' && <p className="cd-note">{t('coding.signInHint')}</p>}
    </div>
  );

  // Run, Submit and the rest close the same pane, under the code.
  const actionBar = (
    <div className="cd-editor-actions">
      <div className="cd-actions cd-actions--commands">
        {!puzzleMode && !pendingOnDesktop && <>
        {/* Busy, not disabled: the button that was pressed keeps the focus
            (a disabled one hands it to the page), and a press does nothing. */}
        <Button variant="secondary" onClick={() => void runLocal()} isDisabled={busy} tooltip={busy ? t('coding.status.working') : undefined} label={phase === 'running' ? (runPhase === 'compiling' ? t('coding.compiling') : t('coding.running')) : t('coding.run')} />
        <SwimCta size="sm" dir={1} onClick={() => { if (!submitDisabled) void submit(); }} unavailable={submitDisabled} label={phase === 'submitting' ? t('coding.submitting') : t('coding.submit')} />
        <Button variant="ghost" onClick={() => void format()} isDisabled={formatDisabled} label={t('coding.format')} />
        <Button variant="ghost" ref={resetRef} onClick={() => setConfirming('reset')} isDisabled={resetDisabled} label={t('coding.reset')} />
        </>}

        {/* Unavailable for a reason: focusable, with the reason as its tooltip. */}
        <Button
          variant="secondary"
          onClick={takeHint}
          isDisabled={hintUnavailable !== ''}
          tooltip={hintUnavailable || undefined}
          label={taken === 0 ? t('coding.hint') : t('coding.hintNext')}
        />
        {session && !solution && !solutions && (
          <Button
            variant="ghost"
            ref={revealRef}
            onClick={askToReveal}
            isDisabled={giveUpUnavailable !== '' || busy}
            tooltip={giveUpUnavailable || undefined}
            label={t('coding.giveUp')}
          />
        )}
        {signedIn && mode === 'section' && !skipResult && (
          <Button variant="ghost" onClick={() => setSkipping((open) => !open)} aria-expanded={skipping} label={t('coding.skip.action')} />
        )}
        <div className="cd-actions cd-actions--utility">
          {saveAction}
          <Button
            variant="ghost"
            isIconOnly
            icon={<FlagIcon size={16} />}
            label={t('coding.reportTask')}
            tooltip={t('coding.reportTask')}
            onClick={() => setReportOpen(true)}
          />
        </div>
      </div>
    </div>
  );

  // What the actions open: hints, the skip form, confirmations and errors. It
  // follows the pane in reading order and exists only while it holds something.
  const hintsOpen = taken > 0 || skipping || skipResult !== null || confirming === 'reveal' || solution !== null;
  const notesOpen = hintsOpen || confirming === 'reset' || !online || draftTooLarge || formatError !== null || (submitError !== null && !puzzleMode);

  return (
    <div
      className={`cd-workbench cd-workbench--${mode}`}
      onKeyDown={onKeyDown}
    >
      <span className="cd-visually-hidden" role="status" aria-live="polite">{announcement}</span>
      <div className="cd-workbench__grid" style={{ ['--cd-split' as string]: `${layout.split}%` }}>
          {puzzleMode && task.puzzle && (
            <section className="cd-pane cd-pane--editor" aria-labelledby={titleId}>
              {brief}
              {/* Keyed by the session: a re-issued task comes with a fresh
                  shuffle and a fresh translation, so the arrangement starts
                  over rather than being graded under the new one. */}
              <CodePuzzle key={session ?? task.id} puzzle={task.puzzle} busy={busy} onSubmit={(order) => void submitOrder(order)} />
              {submitError && <p className="cd-note cd-note--error" role="alert">{submitError}</p>}
              <div className="cd-actions">
                <Button variant="secondary" onClick={chooseEditorHere} label={t('coding.pendingDesktopUseEditor')} />
              </div>
              {actionBar}
            </section>
          )}

          {pendingOnDesktop && (
            <section className="cd-pane cd-pane--editor" aria-labelledby={titleId}>
              {brief}
              {/* No editor, no puzzle, and no pass: the task waits. The draft is
                  kept exactly as it is, and nothing about this marks it done.
                  Waiting is the default, never the only way: the editor works
                  here too, just with less room. */}
              <p className="cd-note cd-note--warn" role="status">{t('coding.pendingDesktop')}</p>
              <p className="cd-shortcuts">{t('coding.pendingDesktopNote')}</p>
              <div className="cd-actions">
                <Button variant="secondary" onClick={chooseEditorHere} label={t('coding.pendingDesktopUseEditor')} />
              </div>
              {actionBar}
            </section>
          )}

          {/* Stays mounted while a puzzle or the pending note stands in for it,
              so the code survives a resize. The brief and the actions go with
              whichever pane is showing. */}
          <section className="cd-pane cd-pane--editor" ref={editorPaneRef} tabIndex={-1} hidden={puzzleMode || pendingOnDesktop} aria-labelledby={puzzleMode || pendingOnDesktop ? undefined : titleId}>
            {!puzzleMode && !pendingOnDesktop && brief}
            <div className="cd-editor-slot">
              {/* Shorter on a narrow screen, so Run and Submit are not a screen
                  away from the code; it still grows with the code. */}
              <Editor minHeight={narrow ? 280 : 480} value={code} onChange={onCodeChange} track={task.track} ariaLabel={t('coding.editorLabel')} describedBy={`${baseId}-keys`} readOnly={Boolean(solution) && mode === 'lesson'} />
              {/* The shortcuts are not printed on the page; a screen reader
                  hears them with the editor, Escape then Tab included. */}
              <span id={`${baseId}-keys`} className="cd-visually-hidden">{t('coding.shortcuts')}</span>
            </div>
            {!puzzleMode && !pendingOnDesktop && actionBar}
          </section>

          {notesOpen && (
            <div className="cd-pane cd-pane--controls">
              {hintsOpen && <div className="cd-hints" role="group" aria-label={t('coding.hint')}>
                <ol className="cd-hint-list">
                  {rungs.slice(0, taken).map((rung, index) => (
                    <li key={index} className="cd-hint">
                      <span className="cd-hint__label">
                        {rung.kind === 'hint' ? t('coding.hint.hint', { n: rung.index + 1 }) : rung.kind === 'approach' ? t('coding.hint.approach', { n: rung.index + 1 }) : rung.kind === 'skeleton' ? t('coding.hint.skeleton') : t('coding.hint.docs')}
                      </span>
                      {rung.kind === 'skeleton' ? <pre>{rung.body}</pre>
                        : rung.kind === 'docs' ? <><span>{t('coding.hint.docsBody', { tag: rung.title })}</span><br /><a href={rung.url} target="_blank" rel="noreferrer">{t('coding.hint.docsLink', { tag: rung.title })}</a></>
                        : <Prompt text={rung.body} />}
                    </li>
                  ))}
                </ol>
                {/* Skipping records why, and nothing else. It is not a pass: a
                    task the learner's level requires stays required and says so,
                    and nothing here unlocks anything. */}
                {skipping && !skipResult && (
                  <form className="cd-skip-card" onSubmit={(event) => { event.preventDefault(); void confirmSkip(); }}>
                    <h3>{t('coding.skip.title')}</h3>
                    <fieldset className="cd-skip-reasons" disabled={skipSubmitting}>
                      <legend>{t('coding.skip.reasonLabel')}</legend>
                      {SKIP_REASONS.map((reason) => (
                        <label key={reason} className="cd-skip-reason">
                          <input
                            type="radio"
                            name={`${baseId}-skip-reason`}
                            value={reason}
                            checked={skipReason === reason}
                            onChange={() => setSkipReason(reason)}
                          />
                          <span>{t(`coding.skip.${reason}` as never)}</span>
                        </label>
                      ))}
                    </fieldset>
                    <div className="cd-skip-field">
                      <label htmlFor={`${baseId}-skip-note`}>{t('coding.skip.noteLabel')}</label>
                      <textarea
                        id={`${baseId}-skip-note`}
                        className="cd-skip-note"
                        maxLength={280}
                        rows={3}
                        value={skipNote}
                        disabled={skipSubmitting}
                        onChange={(event) => setSkipNote(event.target.value)}
                      />
                    </div>
                    {skipError && <p className="cd-note cd-note--error" role="alert">{skipError}</p>}
                    <div className="cd-actions cd-actions--end">
                      <Button variant="ghost" isDisabled={skipSubmitting} onClick={() => setSkipping(false)} label={t('coding.skip.cancel')} />
                      <Button type="submit" variant="primary" isDisabled={skipSubmitting} label={t('coding.skip.confirm')} />
                    </div>
                  </form>
                )}
                {skipResult && (
                  <div className="cd-note" role="status">
                    <p style={{ margin: '0 0 8px' }}>{t(skipResult.required ? 'coding.skip.required' : 'coding.skip.optional')}</p>
                    {skipResult.next && (
                      <Button variant="secondary" as={Link} href={`/coding/${task.track}/${skipResult.next}`} label={t('coding.skip.next')} />
                    )}
                  </div>
                )}

                {confirming === 'reveal' && (
                  <div className="cd-note cd-note--warn" role="alertdialog" aria-label={t('coding.giveUp')} onKeyDown={onConfirmKeyDown}>
                    <p style={{ margin: '0 0 8px' }}>{revealNote}</p>
                    <div className="cd-actions">
                      <Button variant="primary" onClick={() => void reveal()} label={t('coding.giveUp')} />
                      <Button variant="secondary" onClick={cancelConfirm} ref={focusOnMount} label={t('coding.giveUpCancel')} />
                    </div>
                  </div>
                )}
                {solution && (
                  <div className="cd-hint cd-solution" ref={solutionRef} tabIndex={-1}>
                    <span className="cd-hint__label">{t('coding.solutionTitle')}</span>
                    <pre>{solution}</pre>
                    <p className="cd-shortcuts">{t('coding.solutionNote')}</p>
                  </div>
                )}
              </div>}
              {confirming === 'reset' && (
                <div className="cd-note cd-note--warn" role="alertdialog" aria-label={t('coding.reset')} onKeyDown={onConfirmKeyDown}>
                  <p style={{ margin: '0 0 8px' }}>{t('coding.resetConfirm')}</p>
                  <div className="cd-actions">
                    <Button variant="primary" onClick={reset} label={t('coding.reset')} />
                    <Button variant="secondary" onClick={cancelConfirm} ref={focusOnMount} label={t('coding.resetCancel')} />
                  </div>
                </div>
              )}
              {!online && <p className="cd-note cd-note--warn" role="status">{t('coding.offline')}</p>}
              {draftTooLarge && <p className="cd-note cd-note--warn" role="status">{t('coding.draft.tooLarge')}</p>}
              {formatError && <p className="cd-note cd-note--error" role="status">{formatError}</p>}
              {submitError && !puzzleMode && <p className="cd-note cd-note--error" role="alert">{submitError}</p>}
            </div>
          )}

        {/* A real separator: it takes focus, arrows move it, Home and End go to
            the limits and Enter restores the default. It is hidden below the
            two-column breakpoint, where there is nothing to split. */}
        <div
          className="cd-splitter"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={t('coding.layout.splitter')}
          aria-valuenow={layout.split}
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          onKeyDown={onSeparatorKeyDown}
          onPointerDown={onSeparatorPointerDown}
        />

        <section className="cd-pane cd-pane--output" aria-label={t('coding.tab.results')}>
          <div className="cd-tabs" role="tablist" onKeyDown={onTabKeyDown}>
            {tabs.map((one) => (
              <FinButton
                key={one.key}
                type="button"
                role="tab"
                id={`${baseId}-tab-${one.key}`}
                aria-selected={tab === one.key}
                aria-controls={`${baseId}-panel-${one.key}`}
                // Roving tab stop: Tab reaches the strip once, arrows move
                // within it, which is what `role="tab"` promises a reader.
                tabIndex={tab === one.key ? 0 : -1}
                ref={(node) => { tabRefs.current[one.key] = node; }}
                className="cd-tab"
                onClick={() => setTab(one.key)}
              >
                {one.label}
                {one.badge && <span className={`cd-tab__badge${one.good === true ? ' cd-tab__badge--good' : one.good === false ? ' cd-tab__badge--bad' : ''}`}>{one.badge}</span>}
              </FinButton>
            ))}
          </div>
          {/* Everything under the tab strip scrolls as one: the panel, the
              verdict and the failure hint. On the two-column layout the pane is
              exactly as tall as the editor beside it (see Coding.css), so this
              is where a long list of checks goes instead of below Run. */}
          <div className="cd-output-scroll">
          {tabs.map((one) => {
            // A suite that moves focus needs the preview's document laid out,
            // and a hidden panel has none: every focus check failed once Run
            // had switched to Results. While a suite runs, the preview panel
            // is parked off-screen instead, out of reading and tab order.
            const parked = one.key === 'preview' && tab !== 'preview' && busy;
            return (
            // The panel takes focus itself: its content is often plain text,
            // so without this a keyboard user tabs straight past the results.
            <div key={one.key} role="tabpanel" tabIndex={tab === one.key ? 0 : -1} id={`${baseId}-panel-${one.key}`} aria-labelledby={`${baseId}-tab-${one.key}`} className={`cd-panel${parked ? ' cd-panel--parked' : ''}`} hidden={tab !== one.key && !parked} aria-hidden={parked || undefined}>
              {one.key === 'results' && renderResults()}
              {one.key === 'types' && renderTypes()}
              {one.key === 'console' && renderConsole()}
              {one.key === 'preview' && renderPreview()}
              {one.key === 'resources' && renderResources()}
              {one.key === 'solution' && renderSolution()}
              {one.key === 'approaches' && renderApproaches()}
            </div>
            );
          })}
          {verdictCard}
          {tab === 'results' && shownHint && (
            <div className="cd-hint cd-hint--failure" role="status">
              <strong className="cd-hint__label">{t(`coding.failure.${shownHint.category}` as never)}</strong>
              <Prompt text={shownHint.body[lang] || shownHint.body.en} />
            </div>
          )}
          </div>
        </section>
      </div>
      {/* The same dialog the quiz uses, carrying the task id and the version of
          the brief that was on screen. Reporting needs no account. */}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason, detail) => {
          await reportQuestion({
            questionId: task.id,
            reason,
            detail,
            contentVersion: task.review?.version,
          });
          setReportOpen(false);
        }}
      />
    </div>
  );
}
