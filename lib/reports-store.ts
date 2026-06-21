// Read/triage access to the `question_reports` table for the /dev console.
//
// Reports are written anonymously by learners (the full report dialog in the
// solo quiz, and the lightweight 🚩 red-flag in the learning path, which uses
// reason 'needs-review'). Only the service role can read them (RLS denies anon),
// so this module — used exclusively by the password-gated /api/admin endpoint —
// lists them with a short question summary and lets the owner dismiss handled
// ones.

import { createServiceClient, withTimeout } from './http';
import { getEffectiveQuestionsById } from './questions-store';
import { questions as baseQuestions } from './quiz-data';

const supabase = createServiceClient();
const TABLE = 'question_reports';

// Base bank covers every built-in question (including ones soft-hidden via an
// override, which stay in the base array), so a flag still shows its text after
// the owner hides it. Custom (dev-*) questions are resolved from the live set.
const baseById = new Map(baseQuestions.map((q) => [q.id, q]));

const summarize = (text: string): string => {
  const beforeCode = text.split('```')[0].replace(/\s+/g, ' ').trim();
  return (beforeCode || text.replace(/\s+/g, ' ').trim()).slice(0, 200);
};

export interface AdminReport {
  id: string;
  questionId: string;
  reason: string;
  detail: string | null;
  reporterSub: string | null;
  createdAt: string | null;
  /** Short question text, or null if the question no longer exists at all. */
  questionSummary: string | null;
}

interface ReportRow {
  id: string;
  question_id: string;
  reason: string;
  detail: string | null;
  reporter_sub: string | null;
  created_at: string | null;
}

/** Recent reports, newest first, each with a short summary of its question. */
export async function listReports(limit = 300): Promise<AdminReport[]> {
  if (!supabase) throw new Error('not_configured');
  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .select('id, question_id, reason, detail, reporter_sub, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    5000,
  );
  if (error) throw new Error(error.message);

  const effective = await getEffectiveQuestionsById();
  const summaryFor = (id: string): string | null => {
    const q = baseById.get(id) ?? effective.get(id);
    return q ? summarize(q.question) : null;
  };

  return ((data ?? []) as ReportRow[]).map((r) => ({
    id: r.id,
    questionId: r.question_id,
    reason: r.reason,
    detail: r.detail ?? null,
    reporterSub: r.reporter_sub ?? null,
    createdAt: r.created_at ?? null,
    questionSummary: summaryFor(r.question_id),
  }));
}

/** Permanently remove a handled report row (the owner has dealt with it). */
export async function dismissReport(id: string): Promise<void> {
  if (!supabase) throw new Error('not_configured');
  const { error } = await withTimeout(supabase.from(TABLE).delete().eq('id', id), 5000);
  if (error) throw new Error(error.message);
}
