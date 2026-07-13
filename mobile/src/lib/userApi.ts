// User stats + saved flashcards, reusing the same endpoints as the web app.
import { apiFetch } from './api';

export interface UserStats {
  name: string | null;
  email: string | null;
  total_quizzes: number;
  total_correct: number;
  total_questions: number;
  current_streak: number;
  longest_streak: number;
}

export function fetchUserStats() {
  return apiFetch<{ data: UserStats | null }>('/api/user/stats');
}

/** Record a finished quiz to the account (updates totals + streak server-side). */
export function recordQuizResult(userId: string, correct: number, total: number) {
  return apiFetch<{ data: UserStats | null }>('/api/user/stats', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, quiz_result: { correct, total } }),
  });
}

export interface Flashcard {
  question_id: string;
  question: string;
  category: string | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

export function listFlashcards() {
  return apiFetch<{ cards: Flashcard[] }>('/api/flashcards');
}

export function removeFlashcard(questionId: string) {
  return apiFetch(`/api/flashcards?question_id=${encodeURIComponent(questionId)}`, { method: 'DELETE' });
}
