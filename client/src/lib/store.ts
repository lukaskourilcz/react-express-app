import { useEffect, useState } from 'react';

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

export function createStore<T>(read: () => T): Store<T> {
  const listeners = new Set<() => void>();
  return {
    get: read,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      listeners.forEach((listener) => listener());
    },
  };
}

/** Subscribe a component to a store and re-render it whenever the value changes. */
export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState(store.get);
  useEffect(() => store.subscribe(() => setValue(store.get())), [store]);
  return value;
}
