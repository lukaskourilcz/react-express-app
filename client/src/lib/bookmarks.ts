import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';

const KEY = 'devquiz:bookmarks';
const QUESTIONS_KEY = 'devquiz:bookmarked-questions';
const MAX_STORED = 200;

export interface BookmarkedQuestion {
  id: string;
  question: string;
  category: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  bookmarkedAt: string;
}

const readIds = (): Record<string, true> => readJSON<Record<string, true>>(KEY, {});
const readQuestions = (): BookmarkedQuestion[] => readJSON<BookmarkedQuestion[]>(QUESTIONS_KEY, []);

const store = createStore(() => ({ ids: readIds(), questions: readQuestions() }));

export const toggleBookmark = (q: Omit<BookmarkedQuestion, 'bookmarkedAt'>): boolean => {
  const ids = readIds();
  const stored = readQuestions().filter((s) => s.id !== q.id);
  const added = !ids[q.id];

  if (added) {
    ids[q.id] = true;
    writeJSON(QUESTIONS_KEY, [{ ...q, bookmarkedAt: new Date().toISOString() }, ...stored].slice(0, MAX_STORED));
  } else {
    delete ids[q.id];
    writeJSON(QUESTIONS_KEY, stored);
  }
  writeJSON(KEY, ids);
  store.emit();
  return added;
};

export const removeBookmark = (id: string) => {
  const ids = readIds();
  delete ids[id];
  writeJSON(KEY, ids);
  writeJSON(QUESTIONS_KEY, readQuestions().filter((q) => q.id !== id));
  store.emit();
};

/** Live view of bookmarks: `ids` for quick membership checks, `questions` for the full list. */
export function useBookmarks() {
  return useStore(store);
}
