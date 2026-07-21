import { apiFetch } from './api';
import { getSubject } from './subjects';

export interface Flashcard {
  question_id: string;
  question: string;
  category: string | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

export interface FlashcardInput {
  question_id: string;
  question: string;
  category?: string | null;
  correct_answer: string;
  explanation?: string | null;
}

// All calls require a signed-in user; apiFetch attaches the Supabase token and
// the server rejects unauthenticated requests with 401.
export async function listFlashcards(): Promise<Flashcard[]> {
  const { cards } = await apiFetch<{ cards: Flashcard[] }>(`/api/flashcards?subject=${encodeURIComponent(getSubject())}`);
  return cards;
}

export async function addFlashcard(input: FlashcardInput): Promise<void> {
  await apiFetch('/api/flashcards', { method: 'POST', body: JSON.stringify({ ...input, subject: getSubject() }) });
}

export async function removeFlashcard(questionId: string): Promise<void> {
  await apiFetch(`/api/flashcards?question_id=${encodeURIComponent(questionId)}&subject=${encodeURIComponent(getSubject())}`, { method: 'DELETE' });
}
