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
import {
  aiDailyGenerationLimit,
  generateExplanation,
  generateHint,
  isAiExplanationConfigured,
  isAiHintConfigured,
  type ExplanationContent,
  type HintContent,
} from '../../lib/ai-provider';
import { subjectForCategory } from '../../shared/subject-catalog';
import { deploymentSubjectIds } from '../../lib/product-scope';

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
  if (req.method === 'POST' && req.query.resource === 'explanation') {
    return handleExplanation(req, res);
  }
  if (req.method === 'POST' && req.query.resource === 'hint') {
    return handleHint(req, res);
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
  // Effective question set (base + /dev overrides) for localized explanations.
  const questionsById = await getEffectiveQuestionsById(subject, lang === 'cs');

  let correct = 0;
  const results = validated.map(({ questionId, selectedIndex }) => {
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

  const total = validated.length;
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
  const resultReceipt = auth && session.scope !== 'challenge'
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

  logEvent({ status: 200, total, correct, percentage, latency_ms: Date.now() - started });

  res.json({
    totalQuestions: total,
    correctAnswers: correct,
    percentage,
    questXp,
    results,
    ...(resultReceipt ? { resultReceipt } : {}),
  });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}

function explanationHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function cleanCachedContent(value: unknown): ExplanationContent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const read = (key: string) => typeof record[key] === 'string' ? record[key].trim() : '';
  const result = {
    whyCorrect: read('whyCorrect'),
    whySelected: read('whySelected'),
    misconception: read('misconception'),
    relatedConcept: read('relatedConcept'),
  };
  return result.whyCorrect && result.relatedConcept ? result : null;
}

async function handleExplanation(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.aiExplanation))) return;
  const body = (req.body || {}) as { answerProof?: unknown; selectedAnswer?: unknown; lang?: unknown };
  if (typeof body.answerProof !== 'string' || typeof body.selectedAnswer !== 'string') {
    return jsonError(res, 400, 'bad_request', 'Answer proof and selected answer are required');
  }
  if (body.answerProof.length > 4096 || body.selectedAnswer.length > 5000) {
    return jsonError(res, 400, 'bad_request', 'Explanation request is too large');
  }
  const proof = decodeAnswerProof(body.answerProof);
  if (!proof) return jsonError(res, 400, 'invalid_proof', 'Answer proof expired or invalid');
  if (!deploymentSubjectIds().includes(proof.subject)) {
    return jsonError(res, 400, 'invalid_proof', 'Answer proof belongs to another product deployment');
  }

  const lang = normalizeLang(body.lang);
  const questions = await getEffectiveQuestionsById(proof.subject, lang === 'cs');
  const base = questions.get(proof.questionId);
  if (!base) return jsonError(res, 404, 'not_found', 'Question not found');
  const q = localizeQuestion(base, lang);
  const selectedAnswer = body.selectedAnswer.trim();
  if (!q.options.includes(selectedAnswer)) {
    return jsonError(res, 400, 'bad_request', 'Selected answer does not match this question');
  }

  const acceptedAnswer = q.options[base.correctAnswer] ?? '';
  const questionHash = explanationHash({
    question: q.question,
    options: q.options,
    acceptedAnswer,
    explanation: q.explanation,
  });
  const selectedHash = explanationHash(selectedAnswer);

  if (serviceSupabase) {
    try {
      const cached = await withTimeout(
        serviceSupabase
          .from('question_explanations')
          .select('content, model, prompt_version')
          .eq('question_id', q.id)
          .eq('question_hash', questionHash)
          .eq('locale', lang)
          .eq('selected_answer_hash', selectedHash)
          .in('status', ['generated', 'reviewed'])
          .maybeSingle(),
        1200,
      );
      const content = cleanCachedContent(cached.data?.content);
      if (!cached.error && content) {
        return res.json({ available: true, cached: true, content });
      }
    } catch {
      // Cache is optional; generation still has a bounded timeout below.
    }
  }

  if (!isAiExplanationConfigured() || !serviceSupabase) {
    return res.json({ available: false, fallback: q.explanation });
  }

  try {
    const budget = await withTimeout(
      serviceSupabase.rpc('claim_ai_generation_budget', {
        p_date: new Date().toISOString().slice(0, 10),
        p_limit: aiDailyGenerationLimit(),
      }),
      1200,
    );
    if (budget.error || budget.data !== true) {
      logEvent({
        status: 200,
        kind: 'ai_explanation',
        available: false,
        reason: budget.error ? 'budget_unavailable' : 'daily_budget_reached',
      });
      return res.json({ available: false, fallback: q.explanation });
    }
    const generated = await generateExplanation({
      locale: lang,
      question: q.question,
      options: q.options,
      acceptedAnswer,
      selectedAnswer,
      curatedExplanation: q.explanation,
    });
    if (serviceSupabase) {
      void serviceSupabase.from('question_explanations').upsert(
        {
          question_id: q.id,
          question_hash: questionHash,
          locale: lang,
          selected_answer_hash: selectedHash,
          model: generated.model,
          prompt_version: generated.promptVersion,
          content: generated.content,
          status: 'generated',
        },
        { onConflict: 'question_id,question_hash,locale,selected_answer_hash' },
      ).then(({ error }) => {
        if (error) logEvent({ status: 200, kind: 'ai_cache_write_failed', category: 'cache' });
      });
    }
    logEvent({ status: 200, kind: 'ai_explanation', cached: false, locale: lang });
    return res.json({ available: true, cached: false, content: generated.content });
  } catch (error) {
    logEvent({
      status: 200,
      kind: 'ai_fallback',
      category: error instanceof Error ? error.message.slice(0, 80) : 'unknown',
    });
    return res.json({ available: false, fallback: q.explanation });
  }
}

// A curated Socratic fallback that is always available, even with AI off. It
// points the learner back to the safe context (the shown introduction) or to a
// generic reasoning strategy, and NEVER echoes an option, so it cannot leak the
// accepted answer. The post-answer explanation is intentionally not used here —
// it may reveal the answer.
function curatedHint(lang: ReturnType<typeof normalizeLang>, hasIntroduction: boolean): HintContent {
  if (lang === 'cs') {
    return {
      hint: hasIntroduction
        ? 'Vrať se k úvodu nad otázkou. Který jediný údaj v něm rozhoduje mezi možnostmi?'
        : 'Rozděl otázku na menší část: na co přesně se ptá a které slovo je klíčové?',
      nudge: 'Nejdřív vyluč možnosti, které jsou zjevně mimo, a pak porovnej, co zbude.',
    };
  }
  return {
    hint: hasIntroduction
      ? 'Look back at the setup above the question. Which single detail there decides between the options?'
      : 'Break the question into a smaller piece: what exactly is it asking, and which word is the key?',
    nudge: 'First rule out the options that are clearly off, then compare what is left.',
  };
}

function cleanHint(value: unknown): HintContent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const read = (key: string) => (typeof record[key] === 'string' ? record[key].trim() : '');
  const hint = read('hint');
  const nudge = read('nudge');
  return hint && nudge ? { hint, nudge } : null;
}

// POST /api/quiz/submit?resource=hint — Sharkira's optional Socratic pre-answer
// hint. It guides toward the correct option without ever naming it, is hidden
// during placement/daily/challenge, and always has a curated fallback.
async function handleHint(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.aiExplanation))) return;
  const body = (req.body || {}) as { sessionId?: unknown; questionId?: unknown; lang?: unknown };
  if (typeof body.sessionId !== 'string' || body.sessionId.length === 0 || body.sessionId.length > 16_384) {
    return jsonError(res, 400, 'bad_request', 'sessionId is required');
  }
  if (typeof body.questionId !== 'string' || body.questionId.length === 0 || body.questionId.length > 64) {
    return jsonError(res, 400, 'bad_request', 'questionId is required');
  }
  const lang = normalizeLang(body.lang);

  const session = decodeSessionEnvelope(body.sessionId);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Quiz session expired or invalid');
  const sessionQ = session.questions.find((q) => q.questionId === body.questionId);
  if (!sessionQ) return jsonError(res, 400, 'bad_request', 'Question is not part of this session');

  // Guardrail: no coaching during a skill-check, daily challenge, or ranked run.
  if (session.scope === 'assessment' || session.scope === 'daily' || session.scope === 'challenge') {
    return res.json({ available: false, disabled: true });
  }

  const subject = session.subject;
  if (!subject || !deploymentSubjectIds().includes(subject)) {
    return jsonError(res, 400, 'invalid_session', 'Quiz session belongs to another product deployment');
  }

  const questions = await getEffectiveQuestionsById(subject, lang === 'cs');
  const base = questions.get(body.questionId);
  if (!base) return jsonError(res, 404, 'not_found', 'Question not found');
  const q = localizeQuestion(base, lang);
  // The accepted option text is derived server-side from the canonical (unshuffled)
  // question, and is used only to steer generation and to post-check the output.
  const acceptedAnswer = (q.options[base.correctAnswer] ?? '').trim();
  const hasIntroduction = typeof q.introduction === 'string' && q.introduction.trim().length > 0;
  const curated = curatedHint(lang, hasIntroduction);

  const revealsAnswer = (content: HintContent): boolean => {
    if (acceptedAnswer.length < 3) return false;
    const needle = acceptedAnswer.toLowerCase();
    return content.hint.toLowerCase().includes(needle) || content.nudge.toLowerCase().includes(needle);
  };

  // The hint is pre-answer content, cached per question + locale (never per
  // selected answer). Order-independent so a shuffled session still hits cache.
  const questionHash = explanationHash({
    question: q.question,
    options: [...q.options].sort(),
    introduction: q.introduction,
    acceptedAnswer,
  });

  if (serviceSupabase) {
    try {
      const cached = await withTimeout(
        serviceSupabase
          .from('question_hints')
          .select('content')
          .eq('question_id', q.id)
          .eq('question_hash', questionHash)
          .eq('locale', lang)
          .in('status', ['generated', 'reviewed'])
          .maybeSingle(),
        1200,
      );
      const content = cleanHint(cached.data?.content);
      if (!cached.error && content && !revealsAnswer(content)) {
        return res.json({ available: true, source: 'ai', cached: true, hint: content.hint, nudge: content.nudge });
      }
    } catch {
      // Cache is optional; fall through to generation or the curated nudge.
    }
  }

  if (!isAiHintConfigured() || !serviceSupabase) {
    return res.json({ available: true, source: 'curated', hint: curated.hint, nudge: curated.nudge });
  }

  try {
    const budget = await withTimeout(
      serviceSupabase.rpc('claim_ai_generation_budget', {
        p_date: new Date().toISOString().slice(0, 10),
        p_limit: aiDailyGenerationLimit(),
      }),
      1200,
    );
    if (budget.error || budget.data !== true) {
      logEvent({ status: 200, kind: 'ai_hint', available: true, source: 'curated', reason: budget.error ? 'budget_unavailable' : 'daily_budget_reached' });
      return res.json({ available: true, source: 'curated', hint: curated.hint, nudge: curated.nudge });
    }
    const generated = await generateHint({
      locale: lang,
      question: q.question,
      options: q.options,
      acceptedAnswer,
      introduction: q.introduction,
      category: q.category,
    });
    // Post-check: if the model leaked the accepted option text, discard it.
    if (revealsAnswer(generated.content)) {
      logEvent({ status: 200, kind: 'ai_hint_rejected', reason: 'reveals_answer' });
      return res.json({ available: true, source: 'curated', hint: curated.hint, nudge: curated.nudge });
    }
    void serviceSupabase
      .from('question_hints')
      .upsert(
        {
          question_id: q.id,
          question_hash: questionHash,
          locale: lang,
          model: generated.model,
          prompt_version: generated.promptVersion,
          content: generated.content,
          status: 'generated',
        },
        { onConflict: 'question_id,question_hash,locale' },
      )
      .then(({ error }) => {
        if (error) logEvent({ status: 200, kind: 'ai_hint_cache_write_failed', category: 'cache' });
      });
    logEvent({ status: 200, kind: 'ai_hint', cached: false, locale: lang });
    return res.json({ available: true, source: 'ai', cached: false, hint: generated.content.hint, nudge: generated.content.nudge });
  } catch (error) {
    logEvent({ status: 200, kind: 'ai_hint_fallback', category: error instanceof Error ? error.message.slice(0, 80) : 'unknown' });
    return res.json({ available: true, source: 'curated', hint: curated.hint, nudge: curated.nudge });
  }
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
      serviceSupabase.from('question_reports').insert({
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
