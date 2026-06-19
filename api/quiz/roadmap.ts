import type { VercelRequest, VercelResponse } from '@vercel/node';
import { localizeQuestion, normalizeLang, secureShuffle } from '../../lib/quiz-data';
import { jsonError, createLogger } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import {
  roadmapStructure,
  topicLevels,
  topicCheckpoints,
  levelQuestionIds,
  checkpointQuestionIds,
  isRoadmapTopic,
  isValidLevel,
  isValidCheckpoint,
  ROADMAP_TOPICS,
  LEVEL_PASS,
  type RoadmapTopic,
} from '../../lib/roadmap';

const logEvent = createLogger('quiz/roadmap');

// Build the playable, instant-feedback question payload for a set of ids. Unlike
// the competitive quiz, the roadmap is an unscored learning mode, so each
// question is returned WITH its correct answer and explanation (the client
// grades locally). Options are shuffled per request so the answer slot varies.
async function buildQuestions(ids: string[], lang: ReturnType<typeof normalizeLang>) {
  const byId = await getEffectiveQuestionsById();
  return ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((base) => {
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const topicRaw = (req.query.topic as string) || '';
  const levelRaw = req.query.level as string | undefined;
  const checkpointRaw = req.query.checkpoint as string | undefined;

  // No topic → return the whole map so the client can render the path.
  if (!topicRaw && levelRaw === undefined && checkpointRaw === undefined) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    logEvent({ status: 200, kind: 'structure', latency_ms: Date.now() - started });
    return res.json({ topics: ROADMAP_TOPICS, structure: roadmapStructure() });
  }

  if (!isRoadmapTopic(topicRaw)) {
    return jsonError(res, 400, 'bad_request', 'Unknown topic');
  }
  const topic: RoadmapTopic = topicRaw;
  const lang = normalizeLang(req.query.lang);

  // ── Checkpoint exam (40 questions over 5 levels) ─────────────────────────
  if (checkpointRaw !== undefined) {
    const checkpoint = parseInt(checkpointRaw, 10);
    if (!isValidCheckpoint(checkpoint)) {
      return jsonError(res, 400, 'bad_request', 'Invalid checkpoint');
    }
    const meta = topicCheckpoints(topic).find((c) => c.checkpoint === checkpoint);
    if (!meta) return jsonError(res, 404, 'not_found', 'Checkpoint not found');

    const questions = await buildQuestions(checkpointQuestionIds(topic, checkpoint), lang);
    if (questions.length === 0) {
      return jsonError(res, 404, 'no_questions', 'No questions for this checkpoint');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    logEvent({ status: 200, kind: 'checkpoint', topic, checkpoint, count: questions.length, latency_ms: Date.now() - started });
    return res.json({
      kind: 'checkpoint',
      topic,
      ref: meta.checkpoint,
      title: meta.title,
      passPct: meta.passPct,
      questions,
    });
  }

  // ── Level lesson (8 questions) ───────────────────────────────────────────
  const level = parseInt(levelRaw ?? '', 10);
  if (!isValidLevel(level)) {
    return jsonError(res, 400, 'bad_request', 'Invalid level');
  }
  const meta = topicLevels(topic).find((l) => l.level === level);
  if (!meta) return jsonError(res, 404, 'not_found', 'Level not found');

  const questions = await buildQuestions(levelQuestionIds(topic, level), lang);
  if (questions.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No questions for this level');
  }

  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'level', topic, level, count: questions.length, latency_ms: Date.now() - started });
  return res.json({
    kind: 'level',
    topic,
    ref: meta.level,
    title: meta.title,
    difficulty: meta.difficulty,
    passPct: LEVEL_PASS,
    questions,
  });
}
