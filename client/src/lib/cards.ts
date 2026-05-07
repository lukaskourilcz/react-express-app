import { useEffect, useState } from 'react';

const KEY = 'devquiz:cards';

/**
 * Spaced-repetition schedule. The index into this array is the card's
 * `rightStreak`. When the user gets a card right, the streak advances by 1
 * and `due_at` is set to `now + INTERVALS_DAYS[streak]`. When they miss it,
 * the streak resets to 0 (due immediately on next session).
 *
 * Cards reaching `INTERVALS_DAYS.length` correct recalls graduate (leave
 * the deck). With the table below that's 6 in a row.
 */
const INTERVALS_DAYS = [
  10 / (60 * 24), // ~10 min
  1,
  3,
  7,
  14,
  30,
];
const GRADUATE_AT = INTERVALS_DAYS.length;

export interface FlashCard {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
  addedAt: string;
  rightStreak: number;
  wrongCount: number;
  dueAt: string;
  lastReviewedAt?: string;
  updatedAt: string;
}

const read = (): FlashCard[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FlashCard[]) : [];
  } catch {
    return [];
  }
};

const persist = (cards: FlashCard[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {
    /* quota / private mode — ignore */
  }
};

const listeners = new Set<() => void>();
const syncListeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
  syncListeners.forEach((fn) => fn());
};

/** Subscribe to deck changes that should trigger a server sync (separate
 *  from UI updates so we can debounce there only). */
export function onCardsMutated(fn: () => void): () => void {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

export const getCards = (): FlashCard[] => read();
export const cardCount = (): number => read().length;

/** Cards whose `dueAt` is now or in the past. Sorted by due-then-added. */
export function getDueCards(): FlashCard[] {
  const now = Date.now();
  return read()
    .filter((c) => new Date(c.dueAt).getTime() <= now)
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
}

export const dueCount = (): number => getDueCards().length;

/** Add (or refresh + bump wrongCount) a card after a wrong answer. */
export function addFailedCard(input: {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}): void {
  const all = read();
  const idx = all.findIndex((c) => c.id === input.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      question: input.question,
      options: input.options,
      correctIndex: input.correctIndex,
      explanation: input.explanation,
      category: input.category,
      wrongCount: all[idx].wrongCount + 1,
      rightStreak: 0,
      dueAt: now,
      updatedAt: now,
    };
  } else {
    all.unshift({
      id: input.id,
      question: input.question,
      options: input.options,
      correctIndex: input.correctIndex,
      explanation: input.explanation,
      category: input.category,
      addedAt: now,
      rightStreak: 0,
      wrongCount: 1,
      dueAt: now,
      updatedAt: now,
    });
  }
  persist(all.slice(0, 500));
  notify();
}

/** Compute the next dueAt timestamp from a streak. */
function nextDue(streak: number): string {
  const idx = Math.min(streak, INTERVALS_DAYS.length - 1);
  const days = INTERVALS_DAYS[idx];
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Mark a card correct. Returns the new state plus a `graduated` flag. */
export function markCardCorrect(id: string): { streak: number; graduated: boolean } {
  const all = read();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return { streak: 0, graduated: false };
  const newStreak = all[idx].rightStreak + 1;
  const now = new Date().toISOString();
  if (newStreak >= GRADUATE_AT) {
    persist(all.filter((_, i) => i !== idx));
    notify();
    return { streak: newStreak, graduated: true };
  }
  all[idx] = {
    ...all[idx],
    rightStreak: newStreak,
    dueAt: nextDue(newStreak),
    lastReviewedAt: now,
    updatedAt: now,
  };
  persist(all);
  notify();
  return { streak: newStreak, graduated: false };
}

/** Mark a card incorrect — streak resets, due immediately. */
export function markCardWrong(id: string): void {
  const all = read();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    rightStreak: 0,
    wrongCount: all[idx].wrongCount + 1,
    dueAt: now,
    lastReviewedAt: now,
    updatedAt: now,
  };
  persist(all);
  notify();
}

export function removeCard(id: string): void {
  persist(read().filter((c) => c.id !== id));
  notify();
}

export function clearAllCards(): void {
  persist([]);
  notify();
}

/**
 * Replace the local deck with a merged view. Used by the sync layer when
 * pulling from the server: prefers the entry with the most recent
 * `updatedAt` per id.
 */
export function mergeFromServer(serverCards: FlashCard[]): void {
  const merged = new Map<string, FlashCard>();
  for (const c of serverCards) merged.set(c.id, c);
  for (const c of read()) {
    const ours = c;
    const theirs = merged.get(c.id);
    if (!theirs) {
      merged.set(c.id, ours);
    } else {
      const oursTs = +new Date(ours.updatedAt);
      const theirsTs = +new Date(theirs.updatedAt);
      if (oursTs > theirsTs) merged.set(c.id, ours);
    }
  }
  persist(Array.from(merged.values()));
  notify();
}

export function useCards() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return getCards();
}

/** Hook that returns just the count of cards currently due. */
export function useDueCount(): number {
  const [n, setN] = useState(() => dueCount());
  useEffect(() => {
    const fn = () => setN(dueCount());
    listeners.add(fn);
    // Re-evaluate every minute even with no mutations (cards become due as
    // time passes).
    const id = window.setInterval(fn, 60_000);
    return () => {
      listeners.delete(fn);
      window.clearInterval(id);
    };
  }, []);
  return n;
}
