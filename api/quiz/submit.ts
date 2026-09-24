import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { createHash } from 'node:crypto';
import {
  decodeAnswerProof,
  decodeSessionEnvelope,
  encodeScoreProof,
  encodeQuizResultReceipt,
  encodeAnswerProof,
} from '../../lib/quiz-tokens';
import { localizeQuestion, normalizeLang } from '../../lib/quiz-runtime';
import { AuthError, tryAuth } from '../../lib/auth';
import { createServiceClient, jsonError, createLogger, withTimeout, withRequestContext, isRpcMissing } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { subjectForCategory } from '../../shared/subject-catalog';
import { deploymentSubjectIds } from '../../lib/product-scope';
import { loadReviewStates, recordConceptReviews } from '../../lib/concept-review';
import { contentVersion } from '../../lib/curation';

const MAX_ANSWERS = 50;

const logEvent = createLogger('quiz/submit');
const reportLogger = createLogger('quiz/report');
const serviceSupabase = createServiceClient();
const localSubmissionClaims = new Map<string, { answerHash: string; subject: string; userId: string | null }>();

async function claimSubmission(input: {
  gradeKey: string;
  attemptId: string;
  answerHash: string;
  subject: string;
  userId: string | null;
}): Promise<'claimed' | 'replay' | 'conflict' | 'unavailable'> {
  if (!serviceSupabase) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) return 'unavailable';
    const previous = localSubmissionClaims.get(input.gradeKey);
    if (!previous) {
      localSubmissionClaims.set(input.gradeKey, {
        answerHash: input.answerHash,
        subject: input.subject,
        userId: input.userId,
      });
      return 'claimed';
    }
    return previous.answerHash === input.answerHash &&
      previous.subject === input.subject &&
      previous.userId === input.userId
      ? 'replay'
      : 'conflict';
  }
  const result = await withTimeout(
    serviceSupabase.rpc('claim_quiz_submission', {
      p_grade_key: input.gradeKey,
      p_attempt_id: input.attemptId,
      p_user_id: input.userId,
      p_subject: input.subject,
      p_answer_hash: input.answerHash,
    }),
  );
  if (result.error) {
    if (isRpcMissing(result.error)) return 'unavailable';
    throw new Error('quiz_submission_claim_failed');
  }
  return result.data === 'claimed' || result.data === 'replay' || result.data === 'conflict'
    ? result.data
    : 'unavailable';
}

// Question-report reasons. 'needs-review' is the lightweight red-flag from the
// learning path; the rest come from the full report dialog in the solo quiz.
const REPORT_REASONS = [
  'incorrect-answer', 'unclear', 'typo', 'outdated', 'duplicate', 'other', 'needs-review',
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

async function routeHandler(req: VercelRequest, res: VercelResponse) {
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
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSubmit))) return;

  const body = req.body as { sessionId?: unknown; answers?: unknown; lang?: unknown };
  const lang = normalizeLang((body as { lang?: unknown })?.lang);
  if (!body || typeof body !== 'object') {
    return jsonError(res, 400, 'bad_request', 'Body must be JSON');
  }
  if (typeof body.sessionId !== 'string' || body.sessionId.length === 0 || body.sessionId.length > 16_384) {
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
    if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < -1 || idx > 25) {
      return jsonError(res, 400, 'bad_request', 'Invalid answer index');
    }
    validated.push({ questionId: qid, selectedIndex: idx });
  }

  // Which questions had a hint open. Client-reported, and safe to take as
  // given because it can only make the outcome weaker: a hinted answer never
  // lengthens an interval. Ids outside the session are ignored rather than
  // rejected — a stale hint id is not worth failing a submit over.
  const hintedIds = new Set(
    Array.isArray((req.body as { hinted?: unknown }).hinted)
      ? ((req.body as { hinted: unknown[] }).hinted.filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64,
        ) as string[])
      : [],
  );

  const session = decodeSessionEnvelope(body.sessionId);
  if (!session || !session.attemptId) {
    logEvent({ status: 400, reason: 'invalid_session', latency_ms: Date.now() - started });
    return jsonError(res, 400, 'invalid_session', 'Quiz session expired or invalid');
  }

  const sessionById = new Map(session.questions.map((q) => [q.questionId, q]));
  if (validated.some(({ questionId }) => !sessionById.has(questionId))) {
    return jsonError(res, 400, 'bad_request', 'Answers contain a question outside this session');
  }
  if (session.scope !== 'challenge' && validated.length !== session.questions.length) {
    return jsonError(res, 400, 'incomplete_answers', 'Answer every question before submitting');
  }
  if (session.scope === 'challenge' && validated.length !== 1) {
    return jsonError(res, 400, 'bad_request', 'Challenge answers must be submitted one at a time');
  }
  if (session.scope !== 'challenge' && validated.some(({ selectedIndex }) => selectedIndex < 0)) {
    return jsonError(res, 400, 'bad_request', 'Invalid answer index');
  }
  const subject = session.subject;
  if (!subject || !deploymentSubjectIds().includes(subject)) {
    return jsonError(res, 400, 'invalid_session', 'Quiz session belongs to another product deployment');
  }

  let auth;
  try {
    auth = await tryAuth(req);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(res, error.status, error.code, error.message);
    throw error;
  }
  const canonicalAnswers = [...validated].sort((a, b) => a.questionId.localeCompare(b.questionId));
  const answerHash = createHash('sha256').update(JSON.stringify(canonicalAnswers)).digest('hex');
  const gradeKey = session.scope === 'challenge'
    ? `${session.attemptId}:${validated[0].questionId}`
    : session.attemptId;
  const claim = await claimSubmission({
    gradeKey,
    attemptId: session.attemptId,
    answerHash,
    subject,
    userId: auth?.sub ?? null,
  });
  if (claim === 'unavailable') {
    return jsonError(res, 503, 'migration_required', 'One-time quiz grading is not configured');
  }
  if (claim === 'conflict') {
    return jsonError(res, 409, 'attempt_already_graded', 'This answer has already been graded and cannot be changed');
  }
  // Effective question set (base + /dev overrides, eligibility applied) for
  // localized explanations — and for the one grading decision the sealed key
  // cannot make on its own. A question that was retired between the session
  // being issued and the answers arriving is void: it is neither counted for
  // nor against the learner, it earns no proof, and it is reported back so
  // the result screen can say why the total is short. The key stays sealed
  // either way; nothing here reveals it.
  const questionsById = await getEffectiveQuestionsById(subject, lang === 'cs');
  const voided = validated.filter(({ questionId }) => !questionsById.has(questionId)).map(({ questionId }) => questionId);
  const gradable = validated.filter(({ questionId }) => questionsById.has(questionId));

  let correct = 0;
  const results = gradable.map(({ questionId, selectedIndex }) => {
    const sessionQ = sessionById.get(questionId);
    const q = questionsById.get(questionId);
    const isCorrect = sessionQ?.correctAnswer === selectedIndex;
    if (isCorrect) correct++;
    const result = {
      questionId,
      selectedIndex,
      correctAnswer: sessionQ?.correctAnswer ?? -1,
      isCorrect,
      explanation: q ? localizeQuestion(q, lang).explanation : '',
      answerProof: sessionQ ? encodeAnswerProof(questionId, subject, isCorrect) : undefined,
    };
    return session.scope === 'challenge' && session.runId && sessionQ
      ? { ...result, scoreProof: encodeScoreProof(session.runId, questionId, subject, isCorrect) }
      : result;
  });

  const total = gradable.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const breakdown: Record<string, { correct: number; total: number }> = {};
  let questXp = 0;
  for (const result of results) {
    const question = questionsById.get(result.questionId);
    const category = question?.category;
    if (!category) continue;
    if (subjectForCategory(category) !== subject) {
      return jsonError(res, 400, 'invalid_session', 'Quiz session contains mixed product scope');
    }
    const bucket = breakdown[category] ?? { correct: 0, total: 0 };
    bucket.total++;
    if (result.isCorrect) bucket.correct++;
    breakdown[category] = bucket;
    if (result.isCorrect && question) questXp += 2 + 2 * question.difficulty;
  }
  if (session.scope === 'daily') questXp = Math.max(20, questXp);
  // A receipt needs something graded behind it. An attempt whose every
  // question was retired mid-flight is reported, not recorded.
  const resultReceipt = auth && session.scope !== 'challenge' && total > 0
      ? encodeQuizResultReceipt({
        attemptId: session.attemptId,
        userId: auth.sub,
        correct,
        total,
        breakdown,
        outcomes: results.flatMap((result) => {
          const category = questionsById.get(result.questionId)?.category;
          return category ? [{ questionId: result.questionId, category, isCorrect: result.isCorrect }] : [];
        }),
        subject,
        questXp,
        purpose: session.scope === 'assessment'
          ? 'assessment'
          : session.scope === 'daily'
            ? 'daily'
            : 'quiz',
        ...(session.scope === 'daily' && session.date
          ? { daily: { date: session.date, durationMs: Math.max(0, Date.now() - session.issuedAt) } }
          : {}),
      })
    : undefined;

  // Concept-level review state, from the server's own grading. One row per
  // concept, idempotent on the attempt id, and never a source of XP: review
  // reuses the existing reward rules and grants nothing of its own.
  if (auth && session.scope !== 'challenge') {
    const states = await loadReviewStates(serviceSupabase, auth.sub, subject);
    await recordConceptReviews(
      serviceSupabase,
      {
        userId: auth.sub,
        subject,
        eventId: session.attemptId,
        items: results.flatMap((result) => {
          const question = questionsById.get(result.questionId);
          if (!question) return [];
          return [{
            itemId: result.questionId,
            itemVersion: contentVersion(question),
            category: question.category,
            tags: question.tags,
            correct: result.isCorrect,
            kind: hintedIds.has(result.questionId) ? ('hinted' as const) : ('independent' as const),
          }];
        }),
      },
      states,
    );
  }

  logEvent({ status: 200, total, correct, percentage, voided: voided.length, latency_ms: Date.now() - started });

  res.json({
    totalQuestions: total,
    correctAnswers: correct,
    percentage,
    questXp,
    results,
    ...(voided.length > 0 ? { voided } : {}),
    ...(resultReceipt ? { resultReceipt } : {}),
  });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}

// POST /api/quiz/submit?resource=report — log a learner's question report.
// Anonymous posts are allowed; when a token is present the verified sub is
// recorded so reporter_sub can't be forged.
async function handleReport(req: VercelRequest, res: VercelResponse) {
  // Anonymous inserts allowed, so throttle per-IP against spam.
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.questionReport))) return;

  if (!serviceSupabase) {
    return jsonError(res, 503, 'not_configured', 'Reporting backend is not configured');
  }

  let reporter_sub: string | null = null;
  try {
    const auth = await tryAuth(req);
    if (auth) reporter_sub = auth.sub;
  } catch (e) {
    if (e instanceof AuthError) return jsonError(res, e.status, e.code, e.message);
  }

  const body = req.body as { question_id?: unknown; reason?: unknown; detail?: unknown; content_version?: unknown };
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
  // The version of the wording the reporter saw. Validated as the shape the
  // server issues rather than trusted: it is stored and later compared, so a
  // client-supplied value that is not one of ours would only produce a report
  // that can never be matched to anything.
  const contentVersion =
    typeof body.content_version === 'string' && /^[A-Za-z0-9_-]{8,32}$/.test(body.content_version)
      ? body.content_version
      : null;

  const row = { question_id: body.question_id, reason: body.reason, detail, reporter_sub };
  try {
    let { error } = await withTimeout(
      serviceSupabase.from('question_reports').insert({ ...row, content_version: contentVersion }),
    );
    // The version column arrives with migration 029. Until it is applied the
    // insert is rejected for an unknown column, and a learner reporting a wrong
    // answer would get an error for a feature that worked yesterday. Losing the
    // version is a much smaller loss than losing the report, so fall back to the
    // row without it. Self-healing: once the migration lands, the first attempt
    // succeeds and this never runs again.
    if (error && /content_version/i.test(error.message ?? '')) {
      reportLogger({ status: 200, reason: 'version_column_missing', migration: '029' });
      ({ error } = await withTimeout(serviceSupabase.from('question_reports').insert(row)));
    }
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
