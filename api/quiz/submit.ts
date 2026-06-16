import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decodeSession, questions, localizeQuestion, normalizeLang } from '../../lib/quiz-data';
import { jsonError, logEvent } from '../../lib/http';

const MAX_ANSWERS = 50;

// Build an in-memory lookup once at cold-start. With 800+ questions, the
// previous .find() inside the per-answer loop was O(n*m) per submission.
const questionsById = new Map(questions.map((q) => [q.id, q]));

export default function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

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
    logEvent('quiz/submit', { status: 400, reason: 'invalid_session', latency_ms: Date.now() - started });
    return jsonError(res, 400, 'invalid_session', 'Quiz session expired or invalid');
  }

  const sessionById = new Map(sessionData.map((q) => [q.questionId, q]));

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

  logEvent('quiz/submit', { status: 200, total, correct, percentage, latency_ms: Date.now() - started });

  res.json({
    totalQuestions: total,
    correctAnswers: correct,
    percentage,
    results,
  });
}
