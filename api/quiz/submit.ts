import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decodeSession, localizeQuestion, normalizeLang } from '../../lib/quiz-data';
import { AuthError, tryAuth } from '../../lib/auth';
import { createAnonClient, jsonError, createLogger, withTimeout } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';

const MAX_ANSWERS = 50;

const logEvent = createLogger('quiz/submit');
const reportLogger = createLogger('quiz/report');
const supabase = createAnonClient();

// Question-report reasons. 'needs-review' is the lightweight red-flag from the
// learning path; the rest come from the full report dialog in the solo quiz.
const REPORT_REASONS = [
  'incorrect-answer', 'unclear', 'typo', 'outdated', 'duplicate', 'other', 'needs-review',
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  // Question-report sub-resource shares this function so we stay within the
  // 12-function Hobby limit: POST /api/quiz/submit?resource=report
  if (req.method === 'POST' && req.query.resource === 'report') {
    return handleReport(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const body = req.body as { sessionId?: unknown; answers?: unknown; lang?: unknown };
  const lang = normalizeLang((body as { lang?: unknown })?.lang);
  if (!body || typeof body !== 'object') {
    return jsonError(res, 400, 'bad_request', 'Body must be JSON');
  }
  if (typeof body.sessionId !== 'string' || body.sessionId.length === 0 || body.sessionId.length > 4096) {
    return jsonError(res, 400, 'bad_request', 'sessionId is required');
  }
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return jsonError(res, 400, 'bad_request', 'answers must be an object');
  }

  const answersEntries = Object.entries(body.answers as Record<string, unknown>);
  if (answersEntries.length === 0) {
    return jsonError(res, 400, 'no_answers', 'No answers were submitted');
  }
  if (answersEntries.length > MAX_ANSWERS) {
    return jsonError(res, 413, 'too_many_answers', `At most ${MAX_ANSWERS} answers allowed`);
  }

  const validated: { questionId: string; selectedIndex: number }[] = [];
  for (const [qid, idx] of answersEntries) {
    if (typeof qid !== 'string' || qid.length === 0 || qid.length > 64) {
      return jsonError(res, 400, 'bad_request', 'Invalid question id');
    }
    if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx > 25) {
      return jsonError(res, 400, 'bad_request', 'Invalid answer index');
    }
    validated.push({ questionId: qid, selectedIndex: idx });
  }

  const sessionData = decodeSession(body.sessionId);
  if (!sessionData) {
    logEvent({ status: 400, reason: 'invalid_session', latency_ms: Date.now() - started });
    return jsonError(res, 400, 'invalid_session', 'Quiz session expired or invalid');
  }

  const sessionById = new Map(sessionData.map((q) => [q.questionId, q]));
  // Effective question set (base + /dev overrides) for localized explanations.
  const questionsById = await getEffectiveQuestionsById();

  let correct = 0;
  const results = validated.map(({ questionId, selectedIndex }) => {
    const sessionQ = sessionById.get(questionId);
    const q = questionsById.get(questionId);
    const isCorrect = sessionQ?.correctAnswer === selectedIndex;
    if (isCorrect) correct++;
    return {
      questionId,
      selectedIndex,
      correctAnswer: sessionQ?.correctAnswer ?? -1,
      isCorrect,
      explanation: q ? localizeQuestion(q, lang).explanation : '',
    };
  });

  const total = validated.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  logEvent({ status: 200, total, correct, percentage, latency_ms: Date.now() - started });

  res.json({
    totalQuestions: total,
    correctAnswers: correct,
    percentage,
    results,
  });
}

// POST /api/quiz/submit?resource=report — log a learner's question report.
// Anonymous posts are allowed; when a token is present the verified sub is
// recorded so reporter_sub can't be forged.
async function handleReport(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return jsonError(res, 503, 'not_configured', 'Reporting backend is not configured');
  }

  let reporter_sub: string | null = null;
  try {
    const auth = await tryAuth(req);
    if (auth) reporter_sub = auth.sub;
  } catch (e) {
    if (e instanceof AuthError) return jsonError(res, e.status, e.code, e.message);
  }

  const body = req.body as { question_id?: unknown; reason?: unknown; detail?: unknown };
  if (!body || typeof body !== 'object') {
    return jsonError(res, 400, 'bad_request', 'Body must be JSON');
  }
  if (
    typeof body.question_id !== 'string' ||
    body.question_id.length === 0 ||
    body.question_id.length > 64
  ) {
    return jsonError(res, 400, 'bad_request', 'question_id required');
  }
  if (typeof body.reason !== 'string' || !REPORT_REASONS.includes(body.reason as ReportReason)) {
    return jsonError(res, 400, 'bad_request', `reason must be one of: ${REPORT_REASONS.join(', ')}`);
  }
  const detail =
    typeof body.detail === 'string' && body.detail.length <= 1000 ? body.detail : null;

  try {
    const { error } = await withTimeout(
      supabase.from('question_reports').insert({
        question_id: body.question_id,
        reason: body.reason,
        detail,
        reporter_sub,
      }),
    );
    if (error) {
      reportLogger({ status: 500, reason: 'insert_failed', error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not save report');
    }
    reportLogger({ status: 200, question_id: body.question_id, reason: body.reason });
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    reportLogger({ status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}
