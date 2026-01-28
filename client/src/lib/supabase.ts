import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. User stats will not be persisted.');
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

export async function getUserStats(auth0Id: string): Promise<UserStats | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('auth0_id', auth0Id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user stats:', error);
    return null;
  }

  return data;
}

export async function createOrUpdateUserStats(
  auth0Id: string,
  userInfo: { email?: string; name?: string; picture?: string }
): Promise<UserStats | null> {
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from('user_stats')
    .select('*')
    .eq('auth0_id', auth0Id)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('user_stats')
      .update({
        email: userInfo.email || existing.email,
        name: userInfo.name || existing.name,
        picture: userInfo.picture || existing.picture,
        updated_at: new Date().toISOString(),
      })
      .eq('auth0_id', auth0Id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user stats:', error);
      return null;
    }
    return data;
  }

  const { data, error } = await supabase
    .from('user_stats')
    .insert({
      auth0_id: auth0Id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user stats:', error);
    return null;
  }

  return data;
}

export async function updateQuizResult(
  auth0Id: string,
  correctAnswers: number,
  totalQuestions: number
): Promise<UserStats | null> {
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from('user_stats')
    .select('*')
    .eq('auth0_id', auth0Id)
    .single();

  if (!existing) {
    console.error('User stats not found');
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const lastQuizDate = existing.last_quiz_date;

  let newStreak = existing.current_streak;

  if (lastQuizDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastQuizDate === yesterdayStr) {
      newStreak += 1;
    } else if (lastQuizDate !== today) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, existing.longest_streak);

  const { data, error } = await supabase
    .from('user_stats')
    .update({
      total_quizzes: existing.total_quizzes + 1,
      total_correct: existing.total_correct + correctAnswers,
      total_questions: existing.total_questions + totalQuestions,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_quiz_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('auth0_id', auth0Id)
    .select()
    .single();

  if (error) {
    console.error('Error updating quiz result:', error);
    return null;
  }

  return data;
}
