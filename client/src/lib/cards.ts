import { useEffect, useState } from 'react';

const KEY = 'devquiz:cards';
const CORRECT_STREAK_TO_GRADUATE = 2;

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
  lastReviewedAt?: string;
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
    // ignore quota / private mode
  }
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export const getCards = (): FlashCard[] => read();
export const cardCount = (): number => read().length;

/**
 * Add a card if it isn't already present. If it is present, refresh the
 * stored question text (in case the question bank changed) and bump
 * `wrongCount`.
 */
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
    };
  } else {
    all.unshift({
      id: input.id,
      question: input.question,
      options: input.options,
      correctIndex: input.correctIndex,
      explanation: input.explanation,
      category: input.category,
      addedAt: new Date().toISOString(),
      rightStreak: 0,
      wrongCount: 1,
    });
  }
  persist(all.slice(0, 500));
  notify();
}

/**
 * Mark a card as correctly recalled. Returns the new streak. When the streak
 * reaches the graduation threshold, the card is removed from the deck.
 */
export function markCardCorrect(id: string): { streak: number; graduated: boolean } {
  const all = read();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return { streak: 0, graduated: false };
  const next = {
    ...all[idx],
    rightStreak: all[idx].rightStreak + 1,
    lastReviewedAt: new Date().toISOString(),
  };
  if (next.rightStreak >= CORRECT_STREAK_TO_GRADUATE) {
    persist(all.filter((_, i) => i !== idx));
    notify();
    return { streak: next.rightStreak, graduated: true };
  }
  all[idx] = next;
  persist(all);
  notify();
  return { streak: next.rightStreak, graduated: false };
}

export function markCardWrong(id: string): void {
  const all = read();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    rightStreak: 0,
    wrongCount: all[idx].wrongCount + 1,
    lastReviewedAt: new Date().toISOString(),
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
