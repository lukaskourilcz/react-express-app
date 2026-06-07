import { apiFetch } from './api';

// Re-export the shared browser client so existing importers (e.g. realtime.ts)
// keep working. The client itself lives in supabaseClient.ts to avoid an
// import cycle with api.ts.
export { supabase } from './supabaseClient';

export interface UserStats {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  total_quizzes: number;
  total_correct: number;
  total_questions: number;
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null;
  created_at: string;
  updated_at: string;
}

// Reads/writes go through the API route which is the authorized boundary.
// Direct anon-key writes were removed; client RLS is "USING (true)" today
// and therefore not safe (see supabase-schema-002.sql for the fix).

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data } = await apiFetch<{ data: UserStats | null }>(
    `/api/user/stats?user_id=${encodeURIComponent(userId)}`,
  );
  return data;
}

export async function createOrUpdateUserStats(
  userId: string,
  userInfo: { email?: string; name?: string; picture?: string },
): Promise<UserStats | null> {
  const { data } = await apiFetch<{ data: UserStats | null }>('/api/user/stats', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...userInfo }),
  });
  return data;
}

export async function recordQuizResult(
  userId: string,
  correct: number,
  total: number,
): Promise<UserStats | null> {
  const { data } = await apiFetch<{ data: UserStats | null }>('/api/user/stats', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      quiz_result: { correct, total },
    }),
  });
  return data;
}

export interface DailyChallenge {
  date: string;
  sessionId: string;
  questions: Array<{
    id: string;
    tags: string[];
    introduction: string;
    question: string;
    options: string[];
    category: string;
    difficulty: number;
  }>;
}

export async function getDailyChallenge(): Promise<DailyChallenge> {
  return apiFetch<DailyChallenge>('/api/quiz/daily');
}

export async function reportQuestion(input: {
  questionId: string;
  reason: 'incorrect-answer' | 'unclear' | 'typo' | 'outdated' | 'duplicate' | 'other';
  detail?: string;
  reporterSub?: string;
}) {
  await apiFetch('/api/quiz/report', {
    method: 'POST',
    body: JSON.stringify({
      question_id: input.questionId,
      reason: input.reason,
      detail: input.detail,
      reporter_sub: input.reporterSub,
    }),
  });
}
