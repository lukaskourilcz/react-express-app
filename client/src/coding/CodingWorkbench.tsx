// The coding workbench: read the task, edit, run, submit, climb the hint
// ladder. Used by the Coding section (`mode="section"`) and inside a Learn
// level (`mode="lesson"`). It never fetches on its own: the parent hands it a
// playable task, its sealed session and the saved draft.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { readJSON, writeJSON } from '../lib/storage';
import { ApiError } from '../lib/api';
import { Editor } from './Editor';
import { formatCode } from './runner/format';
import { runCodeTests, runPassed, type RunOutcome, type RunPhase } from './runner/run-tests';
import { HARNESS_URL, useReactHarness, type HarnessRun } from './useReactHarness';
import { attemptStarted, canGiveUp, giveUpAfter, ladderRungs, type LadderRung } from './hint-ladder';
import { revealCoding, submitCoding, useCodingApproaches } from './api';
import { CodePuzzle } from './CodePuzzle';
import { useCodingLibrary, useCodingLibraryAction } from '../lib/codingLibrary';
import { SkipPanel } from './SkipDialog';
import { useIsCompactPractice } from '../lib/useMediaQuery';
import type { CodingPuzzleVerdict, PlayableCodingPuzzle } from '../../../shared/coding-puzzle';
import { CODING_TIERS, type Localized, type PlayableCodingTask } from '../../../shared/coding-catalog';
import { resourcesFor } from '../../../shared/coding-docs';
import type { CodingLockReason, CodingVerdictResponse } from '../../../shared/coding-api';
import './Coding.css';

export interface CodingWorkbenchProps {
  task: PlayableCodingTask;
  session: string | null;
  /** The authored code-ordering puzzle for this task, when one exists (#154). */
  puzzle?: PlayableCodingPuzzle | null;
  /** The verdict already recorded for this learner, from the task response.
   * Only `passed` or `revealed` opens the solution comparison (#158). */
  progressStatus?: 'in_progress' | 'passed' | 'revealed' | null;
  onPuzzleVerdict?: (verdict: CodingPuzzleVerdict) => void;
  locked: CodingLockReason | null;
  signedIn: boolean;
  initialCode: string | null;
  mode: 'section' | 'lesson';
  onDraft?: (code: string) => void;
  onVerdict?: (verdict: CodingVerdictResponse) => void;
  onRevealed?: () => void;
  nextHref?: string | null;
  backHref?: string;
  onContinue?: () => void;
}

type Tab = 'results' | 'types' | 'console' | 'preview' | 'resources' | 'approaches';
type Phase = 'idle' | 'running' | 'submitting';

const DRAFT_DEBOUNCE_MS = 900;
const hintsKey = (id: string) => `devshark:coding:hints:${id}`;
/** Layout preferences are per learner, not per task, and are kept well away
 * from the code drafts so clearing one never clears the other (issue #164). */
const LAYOUT_KEY = 'devshark:coding:layout:v1';
const DEFAULT_SPLIT = 58;
const MIN_SPLIT = 30;
const MAX_SPLIT = 75;
const SPLIT_STEP = 2;

interface WorkbenchLayout {
  /** Percentage of the row the working column takes on a wide screen. */
  split: number;
  /** Focus mode hides the brief and the hints, leaving editor and results. */
  focus: boolean;
}

const clampSplit = (value: number): number =>
  Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, Math.round(Number.isFinite(value) ? value : DEFAULT_SPLIT)));

function readLayout(): WorkbenchLayout {
  const raw = readJSON<Partial<WorkbenchLayout>>(LAYOUT_KEY, {});
  return { split: clampSplit(Number(raw?.split ?? DEFAULT_SPLIT)), focus: raw?.focus === true };
}

/** Prompt text with `code` spans rendered as code. */
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

function relativeTime(iso: string, lang: string): string {
  const diffMs = Date.parse(iso) - Date.now();
  const hours = Math.round(diffMs / 3_600_000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (Math.abs(hours) < 48) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

export function CodingWorkbench(props: CodingWorkbenchProps) {
  const { task, session, locked, signedIn, initialCode, mode, onDraft, onVerdict, onRevealed, nextHref, backHref, onContinue, puzzle = null, onPuzzleVerdict, progressStatus = null } = props;
  const { t, lang } = useLanguage();
  const L = useCallback((value: Localized | undefined): string => (value ? value[lang] || value.en : ''), [lang]);
  const online = useOnline();
  const baseId = useId();
  const isReact = task.track === 'react';
  const isTypeScript = task.track === 'typescript';
  const codeTrack = task.track === 'typescript' ? 'typescript' : 'javascript';
  const checklist = task.verify === 'checklist';

  const [code, setCode] = useState<string>(initialCode ?? task.starter);
  const [phase, setPhase] = useState<Phase>('idle');
  const [runPhase, setRunPhase] = useState<RunPhase | null>(null);
  const [run, setRun] = useState<RunOutcome | null>(null);
  const [serverChecked, setServerChecked] = useState(false);
  const [stale, setStale] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [failedRun, setFailedRun] = useState(false);
  const [verdict, setVerdict] = useState<CodingVerdictResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(isReact ? 'preview' : 'results');
  const [hintsTaken, setHintsTaken] = useState<number>(() => readJSON<number>(hintsKey(task.id), 0));
  const [confirming, setConfirming] = useState<'reset' | 'reveal' | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => (task.checklist?.en ?? []).map(() => false));
  const [formatError, setFormatError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  // Presentation policy (issue #154): at phone and tablet widths a code editor
  // between quizzes is the wrong tool, so it is not mounted at all. Where an
  // authored arrangement puzzle exists it takes its place; where none exists the
  // task waits for a wider screen and says so, with the draft kept.
  const compact = useIsCompactPractice();
  const [layout, setLayout] = useState<WorkbenchLayout>(readLayout);
  useEffect(() => { writeJSON(LAYOUT_KEY, layout); }, [layout]);
  // Saving is a reading-list action (issue #157): it keeps the challenge in the
  // learner's library and changes nothing about what they may start.
  const library = useCodingLibrary(signedIn);
  const libraryAction = useCodingLibraryAction();
  const saved = library.data?.bookmarks.includes(task.id) ?? false;
  const collections = library.data?.collections ?? [];
  const [preferEditor, setPreferEditor] = useState(false);
  const puzzleMode = compact && Boolean(puzzle) && !(mode === 'section' && preferEditor);
  const editorWithheld = compact && !puzzleMode && mode === 'lesson';
  const harness = useReactHarness();

  // The comparison opens on recorded evidence, never on a local flag: the fetch
  // is enabled only once the server has a passed (or revealed) verdict for this
  // learner, and the server checks the same thing again (issue #158).
  const comparisonUnlocked = signedIn && (
    progressStatus === 'passed' || progressStatus === 'revealed' ||
    verdict?.verdict === 'passed' || Boolean(solution)
  );
  const approaches = useCodingApproaches(task.id, comparisonUnlocked);

  const rungs = useMemo(() => ladderRungs(task, lang), [task, lang]);
  // Reading material for the techniques this task practises (issue #155). It is
  // there from the first second, costs no hint rung, and never shows a solution.
  const resources = useMemo(() => resourcesFor(task.focus), [task.focus]);

  const taken = Math.min(hintsTaken, rungs.length);

  // Draft: hand the code to the parent after the learner stops typing.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const timer = window.setTimeout(() => onDraft?.(code), DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [code, onDraft]);

  useEffect(() => { writeJSON(hintsKey(task.id), hintsTaken); }, [hintsTaken, task.id]);

  const onCodeChange = useCallback((next: string) => {
    setCode(next);
    if (run || harness.run) setStale(true);
    setServerChecked(false);
  }, [run, harness.run]);

  const files = useCallback(() => ({ '/App.js': code, '/App.test.js': task.suite ?? '' }), [code, task.suite]);

  const runLocal = useCallback(async () => {
    if (phase !== 'idle') return;
    setPhase('running');
    setFormatError(null);
    try {
      if (isReact) {
        const outcome = await harness.start(files(), { tests: Boolean(task.suite), preview: true });
        if (outcome.status !== 'done' || outcome.failed > 0) setFailedRun(true);
        setTab(task.suite ? 'results' : 'preview');
      } else {
        setRunPhase('starting');
        const outcome = await runCodeTests({
          track: codeTrack, code, tests: task.tests ?? [], typeTests: task.typeTests, grade: true, onPhase: setRunPhase,
        });
        setRun(outcome);
        setServerChecked(false);
        if (!runPassed(outcome)) setFailedRun(true);
        const typesBroken = outcome.check && (outcome.check.codeErrors.length > 0 || outcome.check.typeTests.some((one) => !one.pass));
        setTab(outcome.codeError ? 'results' : typesBroken ? 'types' : 'results');
      }
      setStale(false);
      setRunCount((n) => n + 1);
    } finally {
      setRunPhase(null);
      setPhase('idle');
    }
  }, [phase, isReact, harness, files, task.suite, task.tests, task.typeTests, codeTrack, code]);

  const submit = useCallback(async () => {
    if (phase !== 'idle' || !session) return;
    setPhase('submitting');
    setSubmitError(null);
    setFormatError(null);
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
          const outcome = await harness.start(files(), { tests: true, preview: true });
          if (!(outcome.status === 'done' && outcome.total > 0 && outcome.failed === 0)) setFailedRun(true);
          setStale(false);
          setRunCount((n) => n + 1);
          setTab('results');
          result = await submitCoding({ session, code, runCount: runCount + 1, hintsUsed: taken, durationMs });
          setServerChecked(true);
        }
      } else {
        setRunPhase('starting');
        const local = await runCodeTests({ track: codeTrack, code, tests: task.tests ?? [], typeTests: task.typeTests, grade: true, onPhase: setRunPhase });
        setRunPhase(null);
        setRun(local);
        setStale(false);
        setRunCount((n) => n + 1);
        if (!runPassed(local)) setFailedRun(true);
        result = await submitCoding({ session, code, runCount: runCount + 1, hintsUsed: taken, durationMs });
        // The server's run is the verdict of record; show what it saw.
        setRun({ results: result.results, logs: result.logs, codeError: result.codeError, check: result.check, timedOut: result.verdict === 'timeout' });
        setServerChecked(true);
        const typesBroken = result.check && (result.check.codeErrors.length > 0 || result.check.typeTests.some((one) => !one.pass));
        setTab(result.codeError ? 'results' : typesBroken ? 'types' : 'results');
      }
      if (result.verdict !== 'passed') setFailedRun(true);
      setVerdict(result);
      onVerdict?.(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_session') setSubmitError(t('coding.verdict.sessionExpired'));
      else setSubmitError(t('coding.verdict.submitError'));
    } finally {
      setRunPhase(null);
      setPhase('idle');
    }
  }, [phase, session, isReact, checklist, checked, code, runCount, taken, harness, files, codeTrack, task.tests, task.typeTests, onVerdict, t]);

  const format = useCallback(async () => {
    try {
      setCode(await formatCode(code, task.track === 'system-design' ? 'javascript' : task.track));
      setFormatError(null);
    } catch (error) {
      setFormatError(String((error as Error)?.message ?? error).split('\n')[0]);
    }
  }, [code, task.track]);

  const reset = useCallback(() => {
    setCode(task.starter);
    setRun(null);
    setStale(false);
    setConfirming(null);
  }, [task.starter]);

  const reveal = useCallback(async () => {
    if (!session) return;
    setConfirming(null);
    setSubmitError(null);
    try {
      const response = await revealCoding({ session, hintsUsed: taken });
      setSolution(response.solution);
      onRevealed?.();
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.code === 'reveal_locked' ? t('coding.giveUpLocked', { n: giveUpAfter(rungs.length) }) : t('coding.verdict.submitError'));
    }
  }, [session, taken, onRevealed, rungs.length, t]);

  const attemptReady = attemptStarted({ code, starter: task.starter, elapsedMs: Date.now() - startedAt.current, failedRun });
  const nextRung: LadderRung | null = rungs[taken] ?? null;
  const takeHint = () => { if (nextRung && attemptReady) setHintsTaken(taken + 1); };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) void submit();
      else void runLocal();
    }
  };

  const busy = phase !== 'idle';
  const submitDisabled = busy || !session || !online || Boolean(solution);
  const tierLabel = t(`coding.tier.${CODING_TIERS[task.tier]}` as never);
  const trackLabel = t(`coding.track.${task.track}` as never);

  /* ── panels ─────────────────────────────────────────────────────────── */
  const localPassed = run ? runPassed(run) : null;
  const reactRun: HarnessRun | null = harness.run;
  const resultsBadge = isReact
    ? reactRun && reactRun.status === 'done' && reactRun.total > 0 ? `${reactRun.passed}/${reactRun.total}` : null
    : run && !run.codeError && run.results.length > 0 ? `${run.results.filter((r) => r.pass === true).length}/${run.results.length}` : null;
  const typesBadge = run?.check ? (run.check.codeErrors.length === 0 && run.check.typeTests.every((one) => one.pass) ? 'ok' : String(run.check.codeErrors.length + run.check.typeTests.filter((one) => !one.pass).length)) : null;
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  // After a verdict the learner's attention belongs on the result, so the panel
  // takes focus rather than leaving it on a button that is now disabled.
  const panelRefs = useRef<Partial<Record<Tab, HTMLDivElement | null>>>({});
  useEffect(() => {
    if (!verdict) return;
    panelRefs.current[tab]?.focus();
    // Only when a new verdict lands, not on every tab change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict]);
  const tabs: { key: Tab; label: string; badge: string | null; good: boolean | null }[] = [
    { key: 'results', label: t('coding.tab.results'), badge: resultsBadge, good: isReact ? (reactRun ? reactRun.failed === 0 && reactRun.total > 0 : null) : localPassed },
    ...(isTypeScript ? [{ key: 'types' as Tab, label: t('coding.tab.types'), badge: typesBadge, good: typesBadge === 'ok' ? true : typesBadge ? false : null }] : []),
    { key: 'console', label: t('coding.tab.console'), badge: null, good: null },
    { key: 'resources' as Tab, label: t('coding.tab.resources'), badge: resources.length > 0 ? String(resources.length) : null, good: null },
    // No empty comparison tab: it appears only when the server actually sent one.
    ...((approaches.data?.approaches.length ?? 0) > 0
      ? [{ key: 'approaches' as Tab, label: t('coding.tab.approaches'), badge: String(approaches.data!.approaches.length), good: null }]
      : []),
    ...(isReact ? [{ key: 'preview' as Tab, label: t('coding.tab.preview'), badge: null, good: null }] : []),
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
      if (!reactRun) return <p className="cd-console__empty">{t('coding.results.idle')}</p>;
      if (reactRun.status === 'compile-error') return <p className="cd-note cd-note--error">{t('coding.preview.compileError', { message: reactRun.compileError ?? '' })}</p>;
      if (reactRun.status === 'timeout') return <p className="cd-note cd-note--warn">{t('coding.preview.timeout')}</p>;
      return (
        <>
          {reactRun.status === 'done' && <p className="cd-summary">{t('coding.results.passing', { passed: reactRun.passed, total: reactRun.total })}{stale && <small>{t('coding.results.stale')}</small>}</p>}
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
    if (!run) return <p className="cd-console__empty">{t('coding.results.idle')}</p>;
    if (run.timedOut) return <p className="cd-note cd-note--warn">{t('coding.results.timeout')}</p>;
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
          {run.results.map((result, index) => {
            const test = task.tests?.[index];
            const status = result.pass === true ? 'pass' : result.pass === false ? 'fail' : 'idle';
            return (
              <li key={index} className={`cd-result cd-result--${status}`}>
                <span className="cd-result__status">{status === 'pass' ? t('coding.results.pass') : status === 'fail' ? t('coding.results.fail') : '·'}</span>
                <span className="cd-result__call">{test?.call ?? ''}{test?.edge && <span className="cd-result__label"> · {t('coding.results.edge')}</span>}</span>
                {test?.label && <span className="cd-result__label">{L(test.label)}</span>}
                <span className="cd-result__detail">
                  {result.error
                    ? <><b>{t('coding.results.error')}:</b> {result.error}</>
                    : <><b>{t('coding.results.expected')}:</b> {JSON.stringify(test?.expected)} · <b>{t('coding.results.actual')}:</b> {result.actual}</>}
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  const renderTypes = (): ReactNode => {
    const check = run?.check;
    if (!check) return <p className="cd-console__empty">{t('coding.results.idle')}</p>;
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

  const renderResources = (): ReactNode => {
    if (resources.length === 0) {
      return <p className="cd-console__empty">{t('coding.resources.empty')}</p>;
    }
    return (
      <>
        <p className="cd-note">{t('coding.resources.intro')}</p>
        <ul className="cd-resources">
          {resources.map((resource) => (
            <li key={resource.url}>
              <a href={resource.url} target="_blank" rel="noreferrer">
                <code>{resource.tag}</code>
                <span className="cd-resources__source">{t(`coding.resources.source.${resource.source}` as never)}</span>
              </a>
            </li>
          ))}
        </ul>
      </>
    );
  };

  const renderApproaches = (): ReactNode => {
    const data = approaches.data;
    if (approaches.isLoading) return <p className="cd-console__empty" role="status">{t('common.loading')}</p>;
    if (!data || data.approaches.length === 0) return <p className="cd-console__empty">{t('coding.approaches.locked')}</p>;
    return (
      <>
        <p className="cd-note">{t(data.unlockedBy === 'passed' ? 'coding.approaches.introPassed' : 'coding.approaches.introRevealed')}</p>
        <ul className="cd-approaches">
          {data.approaches.map((approach) => (
            <li key={approach.key} className="cd-approach">
              <h4>{approach.title[lang] || approach.title.en}</h4>
              <p className="cd-approach__meta">
                <span className="cd-tag">{t(`coding.approaches.style.${approach.style}` as never)}</span>
                <span className="cd-tag">{t('coding.approaches.time', { value: approach.time })}</span>
                <span className="cd-tag">{t('coding.approaches.space', { value: approach.space })}</span>
              </p>
              <pre>{approach.code}</pre>
              <p className="cd-approach__row"><b>{t('coding.approaches.assumptions')}:</b> {approach.assumptions[lang] || approach.assumptions.en}</p>
              <p className="cd-approach__row"><b>{t('coding.approaches.tradeoffs')}:</b> {approach.tradeoffs[lang] || approach.tradeoffs.en}</p>
            </li>
          ))}
        </ul>
      </>
    );
  };

  const renderPreview = (): ReactNode => (
    <>
      {reactRun?.previewError && <p className="cd-note cd-note--error">{t('coding.preview.error', { message: reactRun.previewError })}</p>}
      {reactRun?.status === 'timeout' && <p className="cd-note cd-note--warn">{t('coding.preview.timeout')} <button type="button" className="cd-btn cd-btn--quiet" onClick={harness.reload}>{t('coding.preview.reload')}</button></p>}
      {!harness.ready && <p className="cd-console__empty">{t('coding.preview.starting')}</p>}
      <iframe key={harness.frameKey} ref={harness.iframeRef} src={HARNESS_URL} sandbox="allow-scripts" title={t('coding.preview.title')} className="cd-frame" />
    </>
  );

  const verdictCard = verdict && (
    <section className={`cd-verdict cd-verdict--${verdict.verdict}`}>
      <h3 className="cd-verdict__title">
        <span>{t(`coding.verdict.${verdict.verdict}` as never)}</span>
        {verdict.xpAwarded > 0 && <span className="cd-verdict__xp">{t('coding.verdict.xp', { xp: verdict.xpAwarded })}</span>}
      </h3>
      {verdict.failureAdvice && (
        <div className="cd-hint cd-hint--advice">
          <span className="cd-hint__label">
            {t(`coding.failure.${verdict.failureAdvice.category}` as never)} · {t(`coding.failure.stage.${verdict.failureAdvice.stage}` as never)}
          </span>
          <Prompt text={verdict.failureAdvice.body[lang] || verdict.failureAdvice.body.en} />
        </div>
      )}
      {verdict.verdict === 'passed' && verdict.progress && <p className="cd-verdict__row">{verdict.firstPass ? t('coding.verdict.firstPass') : t('coding.verdict.again')}</p>}
      {verdict.verdict === 'passed' && verdict.progress?.nextReviewAt && <p className="cd-verdict__row">{t('coding.verdict.review', { when: relativeTime(verdict.progress.nextReviewAt, lang) })}</p>}
      {verdict.verdict === 'passed' && !verdict.progress && <p className="cd-verdict__row">{signedIn ? t('coding.verdict.notRecorded') : t('coding.verdict.signIn')}</p>}
      {verdict.github && verdict.github.status !== 'not_connected' && (
        <p className="cd-verdict__row">
          {verdict.github.status === 'committed' && verdict.github.url ? <a className="cd-link" href={verdict.github.url} target="_blank" rel="noreferrer">{t('coding.github.committed', { repo: verdict.github.url.replace(/^https:\/\/github\.com\//, '').split('/').slice(0, 2).join('/') })}</a>
            : verdict.github.status === 'queued' ? t('coding.github.queued')
            : verdict.github.status === 'skipped' ? t('coding.github.skipped')
            : t('coding.github.failed')}
        </p>
      )}
      {verdict.verdict === 'passed' && (
        <div className="cd-verdict__actions">
          {mode === 'lesson' && onContinue && <button type="button" className="cd-btn cd-btn--primary" onClick={onContinue}>{t('coding.lesson.continue')}</button>}
          {mode === 'section' && nextHref && <Link className="cd-btn cd-btn--primary" to={nextHref}>{t('coding.verdict.next')}</Link>}
          {mode === 'section' && backHref && <Link className="cd-btn" to={backHref}>{t('coding.verdict.back')}</Link>}
        </div>
      )}
    </section>
  );

  // Announce what a run or a submission concluded. A live region has to be in
  // the document BEFORE its text changes, so it lives here rather than on the
  // verdict card, which mounts along with its own message.
  const announcement = phase === 'running' || phase === 'submitting'
    ? t('coding.status.working')
    : verdict
      ? t(`coding.verdict.${verdict.verdict}` as never)
      : isReact
        ? reactRun?.status === 'done' ? t('coding.results.passing', { passed: reactRun.passed, total: reactRun.total }) : ''
        : run ? t('coding.results.passing', { passed: run.results.filter((one) => one.pass === true).length, total: run.results.length }) : '';

  return (
    <div className={`cd-workbench cd-workbench--${mode}`} onKeyDown={onKeyDown}>
      <span className="cd-visually-hidden" role="status" aria-live="polite">{announcement}</span>
      <div className="cd-workbench__toolbar">
        <button
          type="button"
          className="cd-btn cd-btn--quiet"
          aria-pressed={layout.focus}
          onClick={() => setLayout((prev) => ({ ...prev, focus: !prev.focus }))}
        >
          {layout.focus ? t('coding.layout.focusOff') : t('coding.layout.focusOn')}
        </button>
        <button
          type="button"
          className="cd-btn cd-btn--quiet"
          onClick={() => setLayout({ split: DEFAULT_SPLIT, focus: false })}
          disabled={layout.split === DEFAULT_SPLIT && !layout.focus}
        >
          {t('coding.layout.reset')}
        </button>
      </div>
      <div
        className="cd-workbench__grid"
        data-focus={layout.focus ? 'on' : undefined}
        style={{ ['--cd-split' as string]: `${layout.split}%` }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="cd-pane cd-pane--task" aria-labelledby={`${baseId}-title`} hidden={layout.focus}>
            <div className="cd-pane__head">
              <span className="ss-kicker">{trackLabel} · {tierLabel}{task.level > 0 ? ` · ${t('coding.level', { n: task.level })}` : ''}</span>
              <h2 id={`${baseId}-title`}>{L(task.title)}</h2>
              <div className="cd-pane__meta">
                <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
                {task.focus.map((tag) => <span key={tag} className="cd-tag">{tag}</span>)}
              </div>
            </div>
            <Prompt className="cd-prompt" text={L(task.prompt)} />
            {task.api && <p className="cd-api"><code>{task.api.method} {task.api.url}</code><br />{L(task.api.note)}</p>}
            {signedIn && (
              <div className="cd-actions cd-actions--library">
                <button
                  type="button"
                  className="cd-btn cd-btn--quiet"
                  aria-pressed={saved}
                  disabled={libraryAction.isPending}
                  onClick={() => libraryAction.mutate(saved ? { action: 'unbookmark', taskId: task.id } : { action: 'bookmark', taskId: task.id })}
                >
                  {saved ? t('coding.library.unsave') : t('coding.library.save')}
                </button>
                {collections.map((collection) => {
                  const inside = collection.taskIds.includes(task.id);
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      className="cd-btn cd-btn--quiet"
                      aria-pressed={inside}
                      disabled={libraryAction.isPending}
                      onClick={() => libraryAction.mutate(inside
                        ? { action: 'remove-from-collection', id: collection.id, taskId: task.id }
                        : { action: 'add-to-collection', id: collection.id, taskId: task.id })}
                    >
                      {inside
                        ? t('coding.library.removeFrom', { name: collection.name })
                        : t('coding.library.addTo', { name: collection.name })}
                    </button>
                  );
                })}
                <Link className="cd-link" to="/coding/library">{t('coding.library.manage')}</Link>
              </div>
            )}
            {libraryAction.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.library.error')}</p>}
            {signedIn && mode === 'section' && <SkipPanel taskId={task.id} />}
            {locked && <p className="cd-note cd-note--warn">{t('coding.lockedTask')} {t(`coding.lock.${locked}` as never)}</p>}
            {!signedIn && mode === 'section' && <p className="cd-note">{t('coding.signInHint')}</p>}

            <div className="cd-hints" aria-label={t('coding.hint')}>
              {rungs.slice(0, taken).map((rung, index) => (
                <div key={index} className="cd-hint">
                  <span className="cd-hint__label">
                    {rung.kind === 'hint' ? t('coding.hint.hint', { n: rung.index + 1 }) : rung.kind === 'approach' ? t('coding.hint.approach', { n: rung.index + 1 }) : rung.kind === 'skeleton' ? t('coding.hint.skeleton') : t('coding.hint.docs')}
                  </span>
                  {rung.kind === 'skeleton' ? <pre>{rung.body}</pre>
                    : rung.kind === 'docs' ? <><span>{t('coding.hint.docsBody', { tag: rung.tag })}</span><br /><a href={rung.url} target="_blank" rel="noreferrer">{t('coding.hint.docsLink', { tag: rung.tag })}</a></>
                    : <Prompt text={rung.body} />}
                </div>
              ))}
              <div className="cd-actions">
                <button type="button" className="cd-btn" onClick={takeHint} disabled={!nextRung || !attemptReady || Boolean(solution)} aria-describedby={`${baseId}-hint-note`}>
                  {nextRung ? t('coding.hintNext', { taken: taken + 1, total: rungs.length }) : t('coding.hintExhausted')}
                </button>
                {session && !solution && (
                  <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setConfirming('reveal')} disabled={!canGiveUp(taken, rungs.length) || busy}>
                    {t('coding.giveUp')}
                  </button>
                )}
              </div>
              <p id={`${baseId}-hint-note`} className="cd-shortcuts">
                {!attemptReady && nextRung ? t('coding.hintLocked') : !canGiveUp(taken, rungs.length) && !solution ? t('coding.giveUpLocked', { n: giveUpAfter(rungs.length) }) : ''}
              </p>
              {confirming === 'reveal' && (
                <div className="cd-note cd-note--warn" role="alertdialog" aria-label={t('coding.giveUp')}>
                  <p style={{ margin: '0 0 8px' }}>{mode === 'lesson' ? t('coding.lesson.giveUpNote') : t('coding.giveUpConfirm')}</p>
                  <div className="cd-actions">
                    <button type="button" className="cd-btn cd-btn--primary" onClick={() => void reveal()}>{t('coding.giveUp')}</button>
                    <button type="button" className="cd-btn" onClick={() => setConfirming(null)} autoFocus>{t('coding.retry')}</button>
                  </div>
                </div>
              )}
              {solution && (
                <div className="cd-hint cd-solution">
                  <span className="cd-hint__label">{t('coding.solutionTitle')}</span>
                  <pre>{solution}</pre>
                  <p className="cd-shortcuts">{t('coding.solutionNote')}</p>
                </div>
              )}
            </div>
          </section>

          {puzzleMode && puzzle && (
            <CodePuzzle
              puzzle={puzzle}
              session={session}
              signedIn={signedIn}
              onVerdict={onPuzzleVerdict}
              onContinue={mode === 'lesson' ? onContinue : undefined}
            />
          )}
          {puzzleMode && mode === 'section' && (
            <div className="cd-actions">
              <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setPreferEditor(true)}>
                {t('coding.puzzle.switchToEditor')}
              </button>
            </div>
          )}
          {editorWithheld && (
            <section className="cd-pane cd-pane--editor" aria-labelledby={`${baseId}-pending`}>
              <h3 id={`${baseId}-pending`} className="cd-editor-label">{t('coding.puzzle.pendingTitle')}</h3>
              <p className="cd-note cd-note--warn" role="status">{t('coding.puzzle.pendingBody')}</p>
              {mode === 'lesson' && onContinue && (
                <div className="cd-actions">
                  <button type="button" className="cd-btn" onClick={onContinue}>{t('coding.lesson.continue')}</button>
                </div>
              )}
            </section>
          )}
          {!puzzleMode && !editorWithheld && (
          <section className="cd-pane cd-pane--editor">
            <label className="cd-editor-label" htmlFor={`${baseId}-editor`}>{t('coding.editorLabel')}</label>
            <div id={`${baseId}-editor`}>
              <Editor value={code} onChange={onCodeChange} track={task.track} ariaLabel={t('coding.editorLabel')} readOnly={Boolean(solution) && mode === 'lesson'} />
            </div>
            <div className="cd-actions">
              <button type="button" className="cd-btn" onClick={() => void runLocal()} disabled={busy}>
                {phase === 'running' ? (runPhase === 'compiling' ? t('coding.compiling') : t('coding.running')) : t('coding.run')}
              </button>
              <button type="button" className="cd-btn cd-btn--primary" onClick={() => void submit()} disabled={submitDisabled}>
                {phase === 'submitting' ? t('coding.submitting') : t('coding.submit')}
              </button>
              {!isReact && <button type="button" className="cd-btn cd-btn--quiet" onClick={() => void format()} disabled={busy}>{t('coding.format')}</button>}
              {isReact && <button type="button" className="cd-btn cd-btn--quiet" onClick={() => void format()} disabled={busy}>{t('coding.format')}</button>}
              <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setConfirming('reset')} disabled={busy}>{t('coding.reset')}</button>
            </div>
            {confirming === 'reset' && (
              <div className="cd-note cd-note--warn" role="alertdialog" aria-label={t('coding.reset')}>
                <p style={{ margin: '0 0 8px' }}>{t('coding.resetConfirm')}</p>
                <div className="cd-actions">
                  <button type="button" className="cd-btn cd-btn--primary" onClick={reset}>{t('coding.reset')}</button>
                  <button type="button" className="cd-btn" onClick={() => setConfirming(null)} autoFocus>{t('coding.retry')}</button>
                </div>
              </div>
            )}
            <p className="cd-shortcuts">{t('coding.shortcuts')}</p>
            {!online && <p className="cd-note cd-note--warn" role="status">{t('coding.offline')}</p>}
            {formatError && <p className="cd-note cd-note--error" role="status">{formatError}</p>}
            {submitError && <p className="cd-note cd-note--error" role="alert">{submitError}</p>}
            {compact && puzzle && mode === 'section' && preferEditor && (
              <div className="cd-actions">
                <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setPreferEditor(false)}>
                  {t('coding.puzzle.switchToPuzzle')}
                </button>
              </div>
            )}
          </section>
          )}
        </div>

        {/* Keyboard-first splitter: arrows move it, Home and End go to the
            limits, and the toolbar's reset restores the default (issue #164). */}
        <div
          className="cd-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('coding.layout.splitter')}
          aria-valuenow={layout.split}
          aria-valuemin={MIN_SPLIT}
          aria-valuemax={MAX_SPLIT}
          tabIndex={0}
          onKeyDown={(event) => {
            const step = event.key === 'ArrowLeft' ? -SPLIT_STEP : event.key === 'ArrowRight' ? SPLIT_STEP : 0;
            if (step !== 0) {
              event.preventDefault();
              setLayout((prev) => ({ ...prev, split: clampSplit(prev.split + step) }));
            } else if (event.key === 'Home') {
              event.preventDefault();
              setLayout((prev) => ({ ...prev, split: MIN_SPLIT }));
            } else if (event.key === 'End') {
              event.preventDefault();
              setLayout((prev) => ({ ...prev, split: MAX_SPLIT }));
            }
          }}
        />
        <section className="cd-pane cd-pane--output" aria-label={t('coding.tab.results')}>
          <div className="cd-tabs" role="tablist" onKeyDown={onTabKeyDown}>
            {tabs.map((one) => (
              <button
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
              </button>
            ))}
          </div>
          {tabs.map((one) => (
            // The panel takes focus itself: its content is often plain text,
            // so without this a keyboard user tabs straight past the results.
            <div
              key={one.key}
              role="tabpanel"
              tabIndex={tab === one.key ? 0 : -1}
              ref={(node) => { panelRefs.current[one.key] = node; }}
              id={`${baseId}-panel-${one.key}`}
              aria-labelledby={`${baseId}-tab-${one.key}`}
              className="cd-panel"
              hidden={tab !== one.key}
            >
              {one.key === 'results' && renderResults()}
              {one.key === 'types' && renderTypes()}
              {one.key === 'console' && renderConsole()}
              {one.key === 'resources' && renderResources()}
              {one.key === 'approaches' && renderApproaches()}
              {one.key === 'preview' && renderPreview()}
            </div>
          ))}
          {verdictCard}
        </section>
      </div>
    </div>
  );
}
