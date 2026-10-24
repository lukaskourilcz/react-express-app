// The wait between pressing a Learn level, a part test or the skill check and
// its first screen (perf baseline #587 C05).
//
// It used to show the quote loader at once and hold it for at least 1.2 s
// (LoadingScreen's MIN_LOADING_MS), so a level the server answered in 120 ms
// opened after about 1.8 s. Now nothing is drawn for the first
// LOADER_DELAY_MS, as the route loader does (App.tsx RouteLoader): an answer
// in that time opens its screen at once and no loader ever shows. A slower
// answer shows the loader, which then stays at least LOADER_MIN_SHOWN_MS, so
// it reads as a beat and never as a flicker.
import { useEffect, useState, type ReactNode } from 'react';
import { QuoteLoader } from '../LoadingScreen';

/** How long an answer may take before the loader shows. */
export const LOADER_DELAY_MS = 200;
/** Once shown, the shortest time the loader stays. */
export const LOADER_MIN_SHOWN_MS = 400;

/** How long an answer that arrived now, for a wait that started at
 * `startedAt`, should stay back: not at all before the loader showed, else
 * until the loader has been up LOADER_MIN_SHOWN_MS. */
export function revealDelay(startedAt: number, now: number = Date.now()): number {
  const elapsed = now - startedAt;
  return elapsed < LOADER_DELAY_MS ? 0 : Math.max(0, LOADER_DELAY_MS + LOADER_MIN_SHOWN_MS - elapsed);
}

/** Resolves when an answer may replace the loader (see revealDelay). */
export function revealWhenReady(startedAt: number): Promise<void> {
  const wait = revealDelay(startedAt);
  return wait === 0 ? Promise.resolve() : new Promise((resolve) => window.setTimeout(resolve, wait));
}

/** `children` (a loader), drawn only once the wait that started at `since`
 * (by default, when this mounts) passes LOADER_DELAY_MS. Before that it holds
 * the loader's place (it fills its flex parent the same way), so nothing under
 * it moves when it shows. Pass the wait's start where one wait shows more than
 * one loader in a row (the level's request, then the runner's code), so the
 * second does not hide again. */
export function AfterLoaderDelay({ since, children }: { since?: number; children: ReactNode }) {
  const [start] = useState(() => since ?? Date.now());
  const [shown, setShown] = useState(() => Date.now() - start >= LOADER_DELAY_MS);
  useEffect(() => {
    if (shown) return;
    const id = window.setTimeout(() => setShown(true), Math.max(0, LOADER_DELAY_MS - (Date.now() - start)));
    return () => window.clearTimeout(id);
  }, [shown, start]);
  return shown ? children : <div data-loader="pending" style={{ flex: 1, minHeight: 0 }} />;
}

/** The quote loader of a level's wait, after LOADER_DELAY_MS (AfterLoaderDelay). */
export function DelayedQuoteLoader({ quote, label, since }: { quote: string; label: string; since?: number }) {
  return <AfterLoaderDelay since={since}><QuoteLoader quote={quote} label={label} /></AfterLoaderDelay>;
}
