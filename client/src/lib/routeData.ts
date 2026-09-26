// A page's first render, held for the data that decides what it shows.
//
// A navigation renders the next page in a transition that keeps the current
// page on screen while the next one suspends (App.tsx). Pages whose signed-in
// state arrives in a second request used to draw their defaults first (zero
// passed, no run, a loading line) and redraw a beat later: the "glitch, then it
// rerenders" of a first visit. `useFirstData` suspends the page's first render
// until those queries are in the cache, so it draws once. The wait is capped:
// a slow or failing request lets the page draw its own loading or error state,
// exactly as before. A part of the page that loads its own code (`lazyPart`)
// loads inside the same wait, so it draws with the page too.
import { createElement, lazy, Suspense, use, useState, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import { onlineManager, type EnsureQueryDataOptions, type QueryClient, type QueryKey } from '@tanstack/react-query';

/** Longest a page holds its first render for data. */
export const FIRST_DATA_WAIT_MS = 1200;

/** What the cache holds for a read, stale or not (the page refetches a stale
 * answer in the background, as before), or else one fetch of it. One attempt
 * only: a failing read should show its error on the page, not hold the page
 * through the retry delay. */
export function readOnce<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  queryClient: QueryClient,
  options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<TData> {
  return queryClient.ensureQueryData({ ...options, retry: false });
}

/** Wait for every read and keep none of their failures: a failed read is the
 * page's to show. */
export const settled = (reads: (Promise<unknown> | null)[]): Promise<unknown> =>
  Promise.all(reads.map((read) => read?.catch(() => undefined)));

const waits = new Map<string, Promise<void>>();
const settle = () => undefined;

function waitFor(id: string, load: () => Promise<unknown>): Promise<void> {
  let pending = waits.get(id);
  if (!pending) {
    pending = Promise.race([
      load().then(settle, settle),
      new Promise<void>((resolve) => window.setTimeout(resolve, FIRST_DATA_WAIT_MS)),
    ]);
    waits.set(id, pending);
    if (waits.size > 24) waits.delete(waits.keys().next().value as string);
  }
  return pending;
}

/**
 * Hold this page's first render until `load` settles, at most
 * FIRST_DATA_WAIT_MS. `key` names what is loaded (the account, say); null means
 * there is nothing to wait for, and the page renders at once, as it does
 * offline. Each navigation asks again, and a query the cache already holds
 * fresh answers at once. Only the mount waits: later renders (a sign-in, a
 * refetch) never suspend the page again. `load` should prefetch and never
 * throw: errors belong to the page's own queries, which show them.
 */
export function useFirstData(key: string | null, load: () => Promise<unknown>): void {
  const visit = useLocation().key;
  // A mount that suspends keeps no state, so the promise lives in the map by
  // visit and key: the retry finds the same one, already settled. Offline, the
  // queries pause until the connection returns, so there is nothing to wait
  // for: the browser reports no connection, or the query client has paused.
  const [wait] = useState(() => (key === null || navigator.onLine === false || !onlineManager.isOnline() ? null : waitFor(`${visit} ${key}`, load)));
  if (wait) use(wait);
}

/**
 * A part of a page kept out of the page's own chunk: a section only a
 * signed-in learner sees, or one below the fold. The page's first-data hold
 * awaits `load`, so the part draws in the same frame as the page. `Part` draws
 * a loaded part at once; one the hold did not wait for (offline, or past the
 * cap) loads on mount and draws nothing until it arrives, as a lazy component
 * inside `Suspense fallback={null}` did.
 */
export function lazyPart<P extends object>(importPart: () => Promise<ComponentType<P>>): {
  load: () => Promise<ComponentType<P>>;
  Part: ComponentType<P>;
} {
  let ready: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const load = () => {
    if (!pending) {
      pending = importPart().then((component) => {
        ready = component;
        return component;
      });
      // A failed fetch is forgotten, so the next attempt asks the network again.
      pending.catch(() => {
        pending = null;
      });
    }
    return pending;
  };
  const Lazy = lazy(() => load().then((component) => ({ default: component })));
  function Part(props: P) {
    // Decided once per mount, so a part never swaps one tree for the other.
    const [Loaded] = useState(() => ready);
    return Loaded ? createElement(Loaded, props) : createElement(Suspense, { fallback: null }, createElement(Lazy, props));
  }
  return { load, Part };
}
