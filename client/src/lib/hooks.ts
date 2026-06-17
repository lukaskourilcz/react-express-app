import { useCallback, useEffect, useState, type DependencyList } from 'react';

/**
 * A counter you bump to re-run data-loading effects — the standard "retry"
 * mechanism. Returns the current key (add it to your effect deps) and a
 * `reload` function to trigger a fresh run.
 *
 *   const [reloadKey, reload] = useReloadKey();
 *   useEffect(() => { ...load... }, [reloadKey]);
 *   <Button onClick={reload}>Retry</Button>
 */
export function useReloadKey(): [number, () => void] {
  const [key, setKey] = useState(0);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  return [key, reload];
}

/**
 * Run an async effect that can tell when it has been superseded, so a late
 * response from a stale run never updates state. The effect receives an
 * `isCancelled` getter and should check it before calling any setState.
 *
 *   useCancellableEffect(async (isCancelled) => {
 *     const data = await load();
 *     if (!isCancelled()) setData(data);
 *   }, [deps]);
 */
export function useCancellableEffect(
  effect: (isCancelled: () => boolean) => void | Promise<void>,
  deps: DependencyList,
): void {
  useEffect(() => {
    let cancelled = false;
    effect(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
