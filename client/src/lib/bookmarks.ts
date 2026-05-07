import { useEffect, useState } from 'react';

const KEY = 'devquiz:bookmarks';
const QUESTIONS_KEY = 'devquiz:bookmarked-questions';

export interface BookmarkedQuestion {
  id: string;
  question: string;
  category: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  bookmarkedAt: string;
}

const readIds = (): Record<string, true> => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const readQuestions = (): BookmarkedQuestion[] => {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistIds = (b: Record<string, true>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    // ignore
  }
};

const persistQuestions = (qs: BookmarkedQuestion[]) => {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(qs));
  } catch {
    // ignore
  }
};

const listeners = new Set<() => void>();

export const getBookmarks = () => readIds();
export const getBookmarkedQuestions = () => readQuestions();

export const toggleBookmark = (q: Omit<BookmarkedQuestion, 'bookmarkedAt'>) => {
  const ids = readIds();
  const stored = readQuestions();
  let added: boolean;
  if (ids[q.id]) {
    delete ids[q.id];
    persistIds(ids);
    persistQuestions(stored.filter((s) => s.id !== q.id));
    added = false;
  } else {
    ids[q.id] = true;
    persistIds(ids);
    persistQuestions([{ ...q, bookmarkedAt: new Date().toISOString() }, ...stored.filter((s) => s.id !== q.id)].slice(0, 200));
    added = true;
  }
  listeners.forEach((fn) => fn());
  return added;
};

export const removeBookmark = (id: string) => {
  const ids = readIds();
  delete ids[id];
  persistIds(ids);
  persistQuestions(readQuestions().filter((q) => q.id !== id));
  listeners.forEach((fn) => fn());
};

export function useBookmarks() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);
  return {
    ids: getBookmarks(),
    questions: getBookmarkedQuestions(),
    _v: version,
  };
}
