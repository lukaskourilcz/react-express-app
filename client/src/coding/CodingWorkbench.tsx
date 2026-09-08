// The coding workbench: read the task, edit, run, submit, climb the hint
// ladder. Used by the Coding section (`mode="section"`) and inside a Learn
// level (`mode="lesson"`). It never fetches on its own: the parent hands it a
// playable task, its sealed session and the saved draft.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Kicker } from '../components/landing/LandingKit';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { readJSON, writeJSON } from '../lib/storage';
import { ApiError } from '../lib/api';
import { Editor } from './Editor';
import { formatCode } from './runner/format';
import { runCodeTests, runPassed, type RunOutcome, type RunPhase } from './runner/run-tests';
import { HARNESS_URL, useReactHarness, type HarnessRun } from './useReactHarness';
import { attemptStarted, canGiveUp, giveUpAfter, ladderRungs, type LadderRung } from './hint-ladder';
import { taskResources } from '../../../shared/coding-docs';
import { skipTask } from './practice';
import { CodePuzzle } from './CodePuzzle';
import { useIsNarrowForEditor } from '../lib/useMediaQuery';
import { SKIP_REASONS, type SkipReason } from '../../../shared/coding-api';
import { classifyFailure, failureHint } from '../../../shared/coding-failure';
import { revealCoding, submitCoding, useCodingApproaches } from './api';
import { CODING_TIERS, formatOf, type Localized, type PlayableCodingTask } from '../../../shared/coding-catalog';
import type { CodingLockReason, CodingVerdictResponse } from '../../../shared/coding-api';
import './Coding.css';

export interface CodingWorkbenchProps {
  task: PlayableCodingTask;
  session: string | null;
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
// Layout is a preference of the person, not of the task, and it is not their
// work: it lives on the device beside the drafts but under its own key, so
// clearing one never touches the other.
const LAYOUT_KEY = 'devshark:coding:layout:v1';
const SPLIT_MIN = 35;
const SPLIT_MAX = 75;
const SPLIT_DEFAULT = 58;
const SPLIT_STEP = 5;
interface WorkbenchLayout { split: number; focus: boolean }
const readLayout = (): WorkbenchLayout => {
  const stored = readJSON<Partial<WorkbenchLayout>>(LAYOUT_KEY, {});
  const split = typeof stored.split === 'number' && Number.isFinite(stored.split)
    ? Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(stored.split)))
    : SPLIT_DEFAULT;
  return { split, focus: stored.focus === true };
};

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
  const { task, session, locked, signedIn, initialCode, mode, onDraft, onVerdict, onRevealed, nextHref, backHref, onContinue } = props;
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
  const [layout, setLayout] = useState<WorkbenchLayout>(readLayout);
  const [skipping, setSkipping] = useState(false);
  const [skipReason, setSkipReason] = useState<SkipReason>('later');
  const [skipNote, setSkipNote] = useState('');
  const [skipResult, setSkipResult] = useState<{ required: boolean; next: string | null } | null>(null);
  const [skipError, setSkipError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const verdictRef = useRef<HTMLElement | null>(null);
  const harness = useReactHarness();
  // What a narrow screen gets instead of an editor: the task's puzzle when it
  // has one, and an honest pending state when it does not. Neither is a pass.
  const narrow = useIsNarrowForEditor();
  const puzzleMode = narrow && Boolean(task.puzzle) && mode === 'section';
  const pendingOnDesktop = narrow && !task.puzzle;

  const rungs = useMemo(() => ladderRungs(task, lang), [task, lang]);
  const taken = Math.min(hintsTaken, rungs.length);

  // Draft: hand the code to the parent after the learner stops typing.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const timer = window.setTimeout(() => onDraft?.(code), DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [code, onDraft]);

  useEffect(() => { writeJSON(hintsKey(task.id), hintsTaken); }, [hintsTaken, task.id]);
  useEffect(() => { writeJSON(LAYOUT_KEY, layout); }, [layout]);
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

  /** Send an arrangement. It goes through the same submit route as code, and
   * the server grades it the same from any device — the viewport decided what
   * to show, and nothing else. */
  const submitOrder = useCallback(async (order: string[]) => {
    if (!session || phase !== 'idle') return;
    setPhase('submitting');
    setSubmitError(null);
    try {
      const result = await submitCoding({
        session, order, runCount, hintsUsed: taken, durationMs: Date.now() - startedAt.current,
      });
      setVerdict(result);
      onVerdict?.(result);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : t('coding.verdict.submitError'));
    } finally {
      setPhase('idle');
    }
  }, [session, phase, runCount, taken, onVerdict, t]);

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
  const resources = useMemo(() => taskResources(task.focus), [task.focus]);

  // Approach comparisons open on a recorded pass, and the server decides that.
  // Giving up and reading the reference solution is a different thing: it does
  // not open this, which is why the flag below is the verdict and not `solution`.
  const passedNow = verdict?.verdict === 'passed';
  const approaches = useCodingApproaches(task.id, passedNow);
  const approachList = approaches.data?.approaches ?? [];

  // What went wrong, said once, in the learner's language.
  //
  // The server's verdict wins when there is one: it classifies with the hidden
  // tests and the expected kinds, which the browser deliberately never sees.
  // Between submissions the Run button still gets a hint, from the narrower
  // signals the browser does hold — same vocabulary, same authored text, so a
  // learner is never told two different stories about one failure.
  const localHint = useMemo(() => {
    if (verdict || !run || runPassed(run)) return null;
    const typesBroken = Boolean(run.check && (run.check.codeErrors.length > 0 || run.check.typeTests.some((one) => !one.pass)));
    return failureHint(
      classifyFailure({
        threw: Boolean(run.codeError),
        typeErrors: typesBroken,
        results: run.results.map((one) => ({ pass: one.pass, actual: one.actual })),
        pitfall: task.pitfall,
      }),
      task.failureHints,
    );
  }, [verdict, run, task.pitfall, task.failureHints]);
  const shownHint = verdict?.failureHint ?? localHint;
  const tabs: { key: Tab; label: string; badge: string | null; good: boolean | null }[] = [
    { key: 'results', label: t('coding.tab.results'), badge: resultsBadge, good: isReact ? (reactRun ? reactRun.failed === 0 && reactRun.total > 0 : null) : localPassed },
    ...(isTypeScript ? [{ key: 'types' as Tab, label: t('coding.tab.types'), badge: typesBadge, good: typesBadge === 'ok' ? true : typesBadge ? false : null }] : []),
    { key: 'console', label: t('coding.tab.console'), badge: null, good: null },
    ...(isReact ? [{ key: 'preview' as Tab, label: t('coding.tab.preview'), badge: null, good: null }] : []),
    // Reading the documentation is not asking for help: this tab is open from
    // the moment the task loads, costs no hint rung, and needs no failed run.
    { key: 'resources', label: t('coding.tab.resources'), badge: resources.length > 0 ? String(resources.length) : null, good: null },
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
    if (resources.length === 0) {
      return <p className="cd-note">{t('coding.resources.empty')}</p>;
    }
    return (
      <div className="cd-resources">
        <p className="cd-shortcuts">{t('coding.resources.intro')}</p>
        <ul>
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
        <p className="cd-shortcuts">{t('coding.resources.reviewed', { date: resources[0].reviewed })}</p>
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

  const renderPreview = (): ReactNode => (
    <>
      {reactRun?.previewError && <p className="cd-note cd-note--error">{t('coding.preview.error', { message: reactRun.previewError })}</p>}
      {reactRun?.status === 'timeout' && <p className="cd-note cd-note--warn">{t('coding.preview.timeout')} <button type="button" className="cd-btn cd-btn--quiet" onClick={harness.reload}>{t('coding.preview.reload')}</button></p>}
      {!harness.ready && <p className="cd-console__empty">{t('coding.preview.starting')}</p>}
      <iframe key={harness.frameKey} ref={harness.iframeRef} src={HARNESS_URL} sandbox="allow-scripts" title={t('coding.preview.title')} className="cd-frame" />
    </>
  );

  // Grading finishes somewhere the learner is not looking, so focus follows the
  // result. The card is not a dialog and does not trap anything: it takes focus
  // once, and Tab carries on from there.
  const verdictCard = verdict && (
    <section className={`cd-verdict cd-verdict--${verdict.verdict}`} ref={verdictRef} tabIndex={-1}>
      <h3 className="cd-verdict__title">
        <span>{t(`coding.verdict.${verdict.verdict}` as never)}</span>
        {verdict.xpAwarded > 0 && <span className="cd-verdict__xp">{t('coding.verdict.xp', { xp: verdict.xpAwarded })}</span>}
      </h3>
      {verdict.puzzle ? (
        <>
          <p className="cd-verdict__row">{t(verdict.puzzle.accepted ? 'coding.puzzle.accepted' : 'coding.puzzle.rejected')}</p>
          {verdict.puzzle.accepted && (
            <p className="cd-verdict__row">{verdict.puzzle.claim[lang] || verdict.puzzle.claim.en}</p>
          )}
        </>
      ) : (
        verdict.verdict === 'passed' && verdict.progress && <p className="cd-verdict__row">{verdict.firstPass ? t('coding.verdict.firstPass') : t('coding.verdict.again')}</p>
      )}
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
    <div
      className={`cd-workbench cd-workbench--${mode}${layout.focus ? ' cd-workbench--focus' : ''}`}
      onKeyDown={onKeyDown}
    >
      <span className="cd-visually-hidden" role="status" aria-live="polite">{announcement}</span>
      <div className="cd-workbench__bar">
        <button
          type="button"
          className="cd-btn cd-btn--quiet"
          aria-pressed={layout.focus}
          onClick={() => setLayout((current) => ({ ...current, focus: !current.focus }))}
        >
          {t(layout.focus ? 'coding.layout.focusOff' : 'coding.layout.focusOn')}
        </button>
        <button
          type="button"
          className="cd-btn cd-btn--quiet"
          onClick={() => setLayout({ split: SPLIT_DEFAULT, focus: false })}
        >
          {t('coding.layout.reset')}
        </button>
      </div>
      <div
        className="cd-workbench__grid"
        style={{ ['--cd-split' as string]: `${layout.split}%` }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="cd-pane cd-pane--task" aria-labelledby={`${baseId}-title`}>
            <div className="cd-pane__head">
              <Kicker>{trackLabel} · {tierLabel}{task.level > 0 ? ` · ${t('coding.level', { n: task.level })}` : ''}</Kicker>
              <h2 id={`${baseId}-title`}>{L(task.title)}</h2>
              <div className="cd-pane__meta">
                <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
                {formatOf(task) === 'debug' && <span className="cd-tag cd-tag--format">{t('coding.format.debug')}</span>}
                {task.focus.map((tag) => <span key={tag} className="cd-tag">{tag}</span>)}
              </div>
            </div>
            <Prompt className="cd-prompt" text={L(task.prompt)} />
            {formatOf(task) === 'debug' && <p className="cd-note">{t('coding.format.debugHint')}</p>}
            {task.api && <p className="cd-api"><code>{task.api.method} {task.api.url}</code><br />{L(task.api.note)}</p>}
            {locked && <p className="cd-note cd-note--warn">{t('coding.lockedTask')} {t(`coding.lock.${locked}` as never)}</p>}
            {!signedIn && mode === 'section' && <p className="cd-note">{t('coding.signInHint')}</p>}

            <div className="cd-hints" aria-label={t('coding.hint')}>
              {shownHint && (
                <div className="cd-hint cd-hint--failure" role="status">
                  <span className="cd-hint__label">
                    {t(`coding.failure.${shownHint.category}` as never)}
                  </span>
                  <Prompt text={shownHint.body[lang] || shownHint.body.en} />
                </div>
              )}
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
                {signedIn && mode === 'section' && !skipResult && (
                  <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setSkipping((open) => !open)} aria-expanded={skipping}>
                    {t('coding.skip.action')}
                  </button>
                )}
              </div>

              {/* Skipping records why, and nothing else. It is not a pass: a
                  task the learner's level requires stays required and says so,
                  and nothing here unlocks anything. */}
              {skipping && !skipResult && (
                <div className="cd-note" role="group" aria-label={t('coding.skip.title')}>
                  <p style={{ margin: '0 0 8px', fontWeight: 650 }}>{t('coding.skip.title')}</p>
                  <div className="cd-chips">
                    {SKIP_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        className="cd-chip"
                        aria-pressed={skipReason === reason}
                        onClick={() => setSkipReason(reason)}
                      >
                        {t(`coding.skip.${reason}` as never)}
                      </button>
                    ))}
                  </div>
                  <label className="cd-editor-label" htmlFor={`${baseId}-skip-note`}>{t('coding.skip.noteLabel')}</label>
                  <textarea
                    id={`${baseId}-skip-note`}
                    className="cd-skip-note"
                    maxLength={280}
                    rows={2}
                    value={skipNote}
                    onChange={(event) => setSkipNote(event.target.value)}
                  />
                  <div className="cd-actions">
                    <button
                      type="button"
                      className="cd-btn cd-btn--primary"
                      onClick={() => {
                        setSkipError(null);
                        void skipTask({ taskId: task.id, reason: skipReason, note: skipNote.trim() || undefined })
                          .then((answer) => { setSkipResult({ required: answer.required, next: answer.next }); setSkipping(false); })
                          .catch(() => setSkipError(t('coding.skip.failed')));
                      }}
                    >
                      {t('coding.skip.confirm')}
                    </button>
                    <button type="button" className="cd-btn" onClick={() => setSkipping(false)}>{t('coding.skip.cancel')}</button>
                  </div>
                  {skipError && <p className="cd-note cd-note--error" role="alert">{skipError}</p>}
                </div>
              )}
              {skipResult && (
                <div className="cd-note" role="status">
                  <p style={{ margin: '0 0 8px' }}>{t(skipResult.required ? 'coding.skip.required' : 'coding.skip.optional')}</p>
                  {skipResult.next && (
                    <a className="cd-btn" href={`/coding/${task.track}/${skipResult.next}`}>{t('coding.skip.next')}</a>
                  )}
                </div>
              )}
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

          {puzzleMode && task.puzzle && (
            <section className="cd-pane cd-pane--editor">
              <CodePuzzle puzzle={task.puzzle} busy={busy} onSubmit={(order) => void submitOrder(order)} />
              {submitError && <p className="cd-note cd-note--error" role="alert">{submitError}</p>}
            </section>
          )}

          {pendingOnDesktop && (
            <section className="cd-pane cd-pane--editor">
              {/* No editor, no puzzle, and no pass: the task waits. The draft is
                  kept exactly as it is, and nothing about this marks it done. */}
              <p className="cd-note cd-note--warn" role="status">{t('coding.pendingDesktop')}</p>
              <p className="cd-shortcuts">{t('coding.pendingDesktopNote')}</p>
            </section>
          )}

          <section className="cd-pane cd-pane--editor" hidden={puzzleMode || pendingOnDesktop}>
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
          </section>
        </div>

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
            <div key={one.key} role="tabpanel" tabIndex={tab === one.key ? 0 : -1} id={`${baseId}-panel-${one.key}`} aria-labelledby={`${baseId}-tab-${one.key}`} className="cd-panel" hidden={tab !== one.key}>
              {one.key === 'results' && renderResults()}
              {one.key === 'types' && renderTypes()}
              {one.key === 'console' && renderConsole()}
              {one.key === 'preview' && renderPreview()}
              {one.key === 'resources' && renderResources()}
              {one.key === 'approaches' && renderApproaches()}
            </div>
          ))}
          {verdictCard}
        </section>
      </div>
    </div>
  );
}
