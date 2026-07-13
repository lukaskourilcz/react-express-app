// A tiny external store (mirrors client/src/lib/store.ts) so the ported web
// gamification libs work unchanged. Each store caches a snapshot and recomputes
// it from `read()` on every emit, which keeps useSyncExternalStore's snapshot
// referentially stable between changes.
import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get: () => T;
  emit: () => void;
  subscribe: (listener: () => void) => () => void;
}

// Every store registers here so a one-time storage hydration (AsyncStorage is
// async, unlike the web's synchronous localStorage) can refresh them all once
// the persisted values are actually in memory.
const allStores = new Set<Pick<Store<unknown>, 'emit'>>();

export function createStore<T>(read: () => T): Store<T> {
  let snapshot = read();
  const listeners = new Set<() => void>();
  const store: Store<T> = {
    get: () => snapshot,
    emit: () => {
      snapshot = read();
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  allStores.add(store as Pick<Store<unknown>, 'emit'>);
  return store;
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}

/** Re-read every store from storage — call once after async hydration. */
export function refreshAllStores(): void {
  allStores.forEach((s) => s.emit());
}
