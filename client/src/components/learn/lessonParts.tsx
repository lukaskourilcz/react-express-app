// The parts a Learn map and the Big O introduction open on top of themselves,
// each loaded only when a level or a reading needs it: the level runner
// (LessonRunner.tsx) and the lesson reader (LearnLesson.tsx, with LessonBody's
// prose, traces and code runner, the terms bar and LearningPaths.css).
//
// The runner was about two thirds of the Learn chunk (#475); the reader is
// about 13 KB gzip that only the DSA levels' readings show (perf baseline
// #587 C19). Each part is drawn at once when its code is already here: a lazy
// component suspends on its first render even then, and React holds a
// boundary that showed its fallback for 300 ms before it draws what arrived
// (#587 C05). Decided once per mount, so a part never swaps one tree for the
// other.
import { Suspense, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Button as AxButton } from '@astryxdesign/core/Button';
import { lazyShellPart } from '../../lib/routeRecovery';
import { useT } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { learnText } from '../../i18n/translations.learn';
import { ShellPartBoundary } from '../ShellPartBoundary';
import LoadingScreen from '../LoadingScreen';
import { AfterLoaderDelay, DelayedQuoteLoader } from './LevelLoader';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/* ── the level runner ──────────────────────────────────────────────────── */

type RunnerModule = typeof import('./LessonRunner');
let runnerModule: RunnerModule | null = null;
export const loadLessonRunner = (): Promise<RunnerModule> => import('./LessonRunner').then((m) => (runnerModule = m));
export const preloadLessonRunner = (): void => { loadLessonRunner().catch(() => {}); };
const LazyLessonRunner = lazyShellPart(() => loadLessonRunner().then((m) => ({ default: m.LessonRunner })));

/** The level runner. Wrap it in LessonStage, which holds the loader while its
 * code loads and offers Try again when it does not. */
export function LessonRunner(props: ComponentProps<RunnerModule['LessonRunner']>) {
  const [Loaded] = useState(() => runnerModule?.LessonRunner ?? null);
  return Loaded ? <Loaded {...props} /> : <LazyLessonRunner {...props} />;
}

/** The lazily loaded runner in a boundary of its own: code that did not load
 * leaves the learner a Try again and the way back to the map, not the page's
 * error screen. `since` is when the level's wait began (LevelLoader.tsx). */
export function LessonStage({ since, onExit, t, children }: { since?: number; onExit: () => void; t: TFn; children: ReactNode }) {
  return (
    <Suspense fallback={<DelayedQuoteLoader since={since} quote={t('quiz.loadingQuote')} label={t('common.loading')} />}>
      <ShellPartBoundary fallback={(retry) => <LessonError message={t('roadmap.error')} onRetry={retry} onExit={onExit} t={t} />}>
        {children}
      </ShellPartBoundary>
    </Suspense>
  );
}

export function LessonError({ message, onRetry, onExit, t, exitLabel }: { message: string; onRetry: () => void; onExit: () => void; t: TFn; exitLabel?: string }) {
  return (
    <div style={{ maxWidth: 'var(--ss-width-task)', margin: '0 auto', textAlign: 'center', marginTop: 32 }}>
      <div style={{ color: 'var(--ss-error)', marginBottom: 16 }} role="alert">{message}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <AxButton variant="primary" label={t('roadmap.retry')} onClick={onRetry} />
        <AxButton variant="secondary" label={exitLabel ?? t('roadmap.backToPath')} onClick={onExit} />
      </div>
    </div>
  );
}

/* ── the lesson reader ─────────────────────────────────────────────────── */

type ReaderModule = typeof import('./LearnLesson');
let readerModule: ReaderModule | null = null;
// One import in flight at a time (the press, the reader and an earlier
// intent all ask for it); a failed one is let go, so the next ask tries again.
let readerLoad: Promise<ReaderModule> | null = null;
export const loadLessonReader = (): Promise<ReaderModule> => (readerLoad ??= import('./LearnLesson').then(
  (m) => (readerModule = m),
  (error: unknown) => { readerLoad = null; throw error; },
));
export const preloadLessonReader = (): void => { loadLessonReader().catch(() => {}); };
const LazyLearnLesson = lazyShellPart(() => loadLessonReader().then((m) => ({ default: m.LearnLesson })));
type ReaderProps = ComponentProps<ReaderModule['LearnLesson']>;

/** The optional reading before a level's questions. While its code loads the
 * page holds a loader, after LOADER_DELAY_MS; code that does not load says
 * the lesson could not load and still offers the questions, as a failed
 * lesson read does.
 *
 * The code is awaited in state, not by suspending: a boundary that showed its
 * fallback is held by React 300 ms before it draws what arrived, which made a
 * reading open about 300 ms after its code was in (#587 C19 follow-up). Only a
 * load that failed goes through the lazy boundary, which offers Try again
 * (and, when the same chunk fails again, the reload) as before. */
export function LessonReader(props: ReaderProps) {
  const t = useT();
  const [part, setPart] = useState<{ Loaded: ReaderModule['LearnLesson'] | null; failed: boolean }>(
    () => ({ Loaded: readerModule?.LearnLesson ?? null, failed: false }),
  );
  useEffect(() => {
    if (part.Loaded || part.failed) return;
    let live = true;
    loadLessonReader().then(
      (m) => { if (live) setPart({ Loaded: m.LearnLesson, failed: false }); },
      () => { if (live) setPart({ Loaded: null, failed: true }); },
    );
    return () => { live = false; };
  }, [part]);
  const { Loaded } = part;
  if (Loaded) return <Loaded {...props} />;
  if (!part.failed) return <AfterLoaderDelay><LoadingScreen label={t('common.loading')} /></AfterLoaderDelay>;
  return (
    <Suspense fallback={<AfterLoaderDelay><LoadingScreen label={t('common.loading')} /></AfterLoaderDelay>}>
      <ShellPartBoundary fallback={(retry) => (
        <LessonError message={learnText('learn.lesson.error')} onRetry={retry} onExit={props.onStart} exitLabel={learnText('learn.lesson.startQuestions')} t={t} />
      )}>
        <LazyLearnLesson {...props} />
      </ShellPartBoundary>
    </Suspense>
  );
}
