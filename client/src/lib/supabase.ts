import { createClient } from '@supabase/supabase-js';
import { apiFetch } from './api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn('Supabase credentials not configured. User stats will not be persisted.');
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface UserStats {
  id: string;
  auth0_id: string;
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

export async function getUserStats(auth0Id: string): Promise<UserStats | null> {
  const { data } = await apiFetch<{ data: UserStats | null }>(
    `/api/user/stats?auth0_id=${encodeURIComponent(auth0Id)}`,
  );
  return data;
}

export async function createOrUpdateUserStats(
  auth0Id: string,
  userInfo: { email?: string; name?: string; picture?: string },
): Promise<UserStats | null> {
  const { data } = await apiFetch<{ data: UserStats | null }>('/api/user/stats', {
    method: 'POST',
    body: JSON.stringify({ auth0_id: auth0Id, ...userInfo }),
  });
  return data;
}

export async function recordQuizResult(
  auth0Id: string,
  correct: number,
  total: number,
): Promise<UserStats | null> {
  const { data } = await apiFetch<{ data: UserStats | null }>('/api/user/stats', {
    method: 'POST',
    body: JSON.stringify({
      auth0_id: auth0Id,
      quiz_result: { correct, total },
    }),
  });
  return data;
}
