import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  if (req.method === 'GET') {
    const { auth0_id } = req.query;

    if (!auth0_id || typeof auth0_id !== 'string') {
      return res.status(400).json({ error: 'auth0_id is required' });
    }

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('auth0_id', auth0_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  }

  if (req.method === 'POST') {
    const { auth0_id, email, name, picture, quiz_result } = req.body;

    if (!auth0_id) {
      return res.status(400).json({ error: 'auth0_id is required' });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('user_stats')
      .select('*')
      .eq('auth0_id', auth0_id)
      .single();

    if (quiz_result) {
      // Update quiz result
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
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
          total_correct: existing.total_correct + quiz_result.correct,
          total_questions: existing.total_questions + quiz_result.total,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_quiz_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('auth0_id', auth0_id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ data });
    }

    // Create or update user profile
    if (existing) {
      const { data, error } = await supabase
        .from('user_stats')
        .update({
          email: email || existing.email,
          name: name || existing.name,
          picture: picture || existing.picture,
          updated_at: new Date().toISOString(),
        })
        .eq('auth0_id', auth0_id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ data });
    }

    // Create new user
    const { data, error } = await supabase
      .from('user_stats')
      .insert({
        auth0_id,
        email,
        name,
        picture,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
