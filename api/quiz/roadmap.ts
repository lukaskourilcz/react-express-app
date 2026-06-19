import type { VercelRequest, VercelResponse } from '@vercel/node';
import { localizeQuestion, normalizeLang, secureShuffle } from '../../lib/quiz-data';
import { jsonError, createLogger } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import {
  roadmapStructure,
  topicLevels,
  levelQuestionIds,
  isRoadmapTopic,
  isValidLevel,
  ROADMAP_TOPICS,
} from '../../lib/roadmap';

const logEvent = createLogger('quiz/roadmap');

// The roadmap ("Learn") path is an unscored, instant-feedback learning mode, so
// — unlike the competitive quiz — each level's questions are returned WITH their
// correct answer and explanation. The client grades locally and reveals the
// answer immediately (Duolingo-style). Progress lives on the client.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const topicRaw = (req.query.topic as string) || '';
  const levelRaw = req.query.level as string | undefined;

  // No topic/level → return the whole map so the client can render the path.
  if (!topicRaw && levelRaw === undefined) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    logEvent({ status: 200, kind: 'structure', latency_ms: Date.now() - started });
    return res.json({ topics: ROADMAP_TOPICS, structure: roadmapStructure() });
  }

  if (!isRoadmapTopic(topicRaw)) {
    return jsonError(res, 400, 'bad_request', 'Unknown topic');
  }
  const topic = topicRaw;

  const level = parseInt(levelRaw ?? '', 10);
  if (!isValidLevel(level)) {
    return jsonError(res, 400, 'bad_request', 'Invalid level');
  }

  const meta = topicLevels(topic).find((l) => l.level === level);
  if (!meta) {
    return jsonError(res, 404, 'not_found', 'Level not found');
  }

  const lang = normalizeLang(req.query.lang);
  const byId = await getEffectiveQuestionsById();

  const questions = levelQuestionIds(topic, level)
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((base) => {
      // Localize first (translated options stay parallel), then shuffle so the
      // correct choice is not always in the same slot.
      const q = localizeQuestion(base, lang);
      const correctText = q.options[base.correctAnswer];
      const options = secureShuffle(q.options);
      return {
        id: q.id,
        tags: q.tags,
        introduction: q.introduction,
        question: q.question,
        options,
        correctAnswer: options.indexOf(correctText),
        explanation: q.explanation,
        category: q.category,
        difficulty: q.difficulty,
      };
    });

  if (questions.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No questions for this level');
  }

  // Shuffle (and answer index) differ per request, so do not CDN-cache.
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'level', topic, level, count: questions.length, latency_ms: Date.now() - started });

  res.json({
    topic,
    level: meta.level,
    title: meta.title,
    difficulty: meta.difficulty,
    questions,
  });
}
