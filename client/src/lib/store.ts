import { useEffect, useRef, useState } from 'react';

// A tiny observable store for state that lives outside React (in localStorage)
// but must re-render components when it changes — e.g. settings and bookmarks,
// which can be mutated from anywhere and are read by several components.

export interface Store<T> {
  /** Current value, read fresh from the backing source. */
  get: () => T;
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Notify all subscribers that the value changed. */
  emit: () => void;
}

// Every store, so a change made to storage behind their backs (a sign-out
// clearing the account's data) can reach the components that show them.
const stores = new Set<Store<unknown>>();
// How many times each store has emitted, so a component can tell that it
// missed one before it subscribed.
const emits = new WeakMap<Store<unknown>, number>();
const emitsOf = (store: Store<unknown>): number => emits.get(store) ?? 0;

export function createStore<T>(read: () => T): Store<T> {
  const listeners = new Set<() => void>();
  const store: Store<T> = {
    get: read,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      emits.set(store, emitsOf(store) + 1);
      listeners.forEach((listener) => listener());
    },
  };
  stores.add(store);
  return store;
}

/** Re-read every store from storage and re-render what shows it. */
export function emitAllStores(): void {
  stores.forEach((store) => store.emit());
}

/** Subscribe a component to a store and re-render it whenever the value changes. */
export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState(store.get);
  // The emit count the first render read at. A child's effect runs before
  // its parent's, so a child that writes on mount emitted before this
  // component subscribed, and the parent kept showing the old value.
  const readAt = useRef<number | null>(null);
  readAt.current ??= emitsOf(store);
  useEffect(() => {
    const unsubscribe = store.subscribe(() => setValue(store.get()));
    if (emitsOf(store) !== readAt.current) setValue(store.get());
    return unsubscribe;
  }, [store]);
  return value;
}
