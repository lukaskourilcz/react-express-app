import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  PRODUCT_CATALOG,
  SHARK_BRAND_ORDER,
  resolveCatalogProductId,
} from '../client/product-catalog';
import {
  SUBJECT_SCOPE_CATALOG,
  allowedDeploymentSubjects,
} from '../shared/subject-catalog';
import {
  decodeAnswerProof,
  decodeChallengeRun,
  decodeQuizResultReceipt,
  decodeSession,
  encodeAnswerProof,
  encodeQuizResultReceipt,
  encodeSession,
  createChallengeRun,
} from '../lib/quiz-tokens';
import { checkRateLimit, isDistributedRateLimitEnabled } from '../lib/rate-limit';
import healthHandler from '../api/health';
import { selectPersonalizedReview } from '../lib/review-selection';
import { aiDailyGenerationLimit, isAiExplanationConfigured } from '../lib/ai-provider';
import { inspectQuestionQuality } from '../lib/question-quality';
import { assessmentUnlocks } from '../shared/assessment';
import {
  disableSupportPrompt,
  dismissSupportPrompt,
  recordSupportMilestone,
  SUPPORT_PROMPT_DISMISS_MS,
} from '../client/src/lib/supportPrompt';
import type { Question } from '../lib/quiz-runtime';

function apiFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? apiFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), String(value)); },
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    end() { return this; },
    headers,
  };
}

async function main() {
  assert.equal(apiFiles(join(process.cwd(), 'api')).length, 12, 'Vercel function budget must remain exactly 12');

  assert.equal(resolveCatalogProductId({ product: 'devshark' }), 'devshark');
  assert.equal(resolveCatalogProductId({ lockSubject: 'geography' }), 'geoshark');
  assert.equal(resolveCatalogProductId({}), 'studyshark');
  assert.equal(SHARK_BRAND_ORDER.length, 7);
  assert.equal(new Set(SHARK_BRAND_ORDER).size, SHARK_BRAND_ORDER.length);
  assert.ok(SHARK_BRAND_ORDER.every((id) => PRODUCT_CATALOG[id]));
  assert.deepEqual(allowedDeploymentSubjects({ VITE_PRODUCT: 'devshark' }), ['webdev']);
  assert.ok(!allowedDeploymentSubjects({ VITE_PRODUCT: 'studyshark' }).includes('webdev'));
  assert.ok(SUBJECT_SCOPE_CATALOG.geography.categories.includes('capitals'));

  const session = encodeSession([{ questionId: 'private-answer-check', correctAnswer: 3 }]);
  assert.match(session, /^v2\./);
  assert.ok(!session.includes('private-answer-check'), 'encrypted token must not expose question ids');
  assert.deepEqual(decodeSession(session), [{ questionId: 'private-answer-check', correctAnswer: 3 }]);
  const parts = session.split('.');
  const middle = Math.floor(parts[2].length / 2);
  parts[2] = `${parts[2].slice(0, middle)}${parts[2][middle] === 'A' ? 'B' : 'A'}${parts[2].slice(middle + 1)}`;
  assert.equal(decodeSession(parts.join('.')), null, 'tampered token must fail closed');

  const run = createChallengeRun();
  assert.equal(decodeChallengeRun(run.runToken)?.runId, run.runId);
  const proof = encodeAnswerProof('q-1', true);
  assert.deepEqual(decodeAnswerProof(proof), { questionId: 'q-1', isCorrect: true });
  const receipt = encodeQuizResultReceipt({
    userId: 'user-0001', correct: 1, total: 2,
    breakdown: { capitals: { correct: 1, total: 2 } },
    outcomes: [{ questionId: 'capital-1', category: 'capitals', isCorrect: true }],
    subject: 'geography',
    questXp: 6,
    purpose: 'quiz',
  });
  assert.deepEqual(decodeQuizResultReceipt(receipt)?.breakdown, { capitals: { correct: 1, total: 2 } });
  assert.equal(decodeQuizResultReceipt(receipt)?.subject, 'geography');

  const now = Date.UTC(2026, 6, 21);
  const ninth = recordSupportMilestone({ completions: 8 }, 100, true, now);
  assert.equal(ninth.show, false);
  const tenth = recordSupportMilestone({ completions: 9 }, 80, true, now);
  assert.equal(tenth.show, true);
  assert.equal(recordSupportMilestone({ completions: 19 }, 50, true, now).show, false, 'low scores never prompt');
  assert.equal(recordSupportMilestone({ completions: 9 }, 100, false, now).show, false, 'support is disabled by default');
  const dismissed = dismissSupportPrompt(tenth.state, now);
  assert.equal(dismissed.dismissedUntil, now + SUPPORT_PROMPT_DISMISS_MS);
  assert.equal(recordSupportMilestone({ ...dismissed, completions: 19 }, 100, true, now + 15 * 86400000).show, false);
  assert.equal(recordSupportMilestone({ ...disableSupportPrompt({ completions: 9 }) }, 100, true, now).show, false);

  const reviewQuestions = [
    { id: 'weak-high', category: 'capitals', difficulty: 2, importance: 10 },
    { id: 'strong-low', category: 'flags', difficulty: 2, importance: 3 },
    { id: 'weak-recent', category: 'capitals', difficulty: 3, importance: 8 },
  ].map((item) => ({
    ...item, tags: [item.category], introduction: '', question: item.id,
    options: ['a', 'b'], correctAnswer: 0, explanation: '',
  })) as Question[];
  const review = selectPersonalizedReview(
    reviewQuestions,
    [
      { category: 'capitals', total_correct: 2, total_questions: 10 },
      { category: 'flags', total_correct: 9, total_questions: 10 },
    ],
    [{
      question_id: 'weak-recent', category: 'capitals', times_seen: 2, times_missed: 2,
      last_seen_at: new Date(now - 5 * 86400000).toISOString(),
      last_missed_at: new Date(now - 5 * 86400000).toISOString(),
    }],
    2,
    now,
  );
  assert.equal(review.questions.length, 2);
  assert.equal(review.weakAreas[0]?.category, 'capitals');
  assert.ok(review.questions.every((question) => question.category === 'capitals'));
  assert.ok(assessmentUnlocks('geography', 18).every((topic) => SUBJECT_SCOPE_CATALOG.geography.topics.includes(topic as never)));
  assert.ok(assessmentUnlocks('math', 18).every((topic) => SUBJECT_SCOPE_CATALOG.math.topics.includes(topic as never)));
  assert.ok(!assessmentUnlocks('geography', 18).includes('typescript'));

  const savedAiEnv = {
    enabled: process.env.AI_EXPLANATIONS_ENABLED,
    key: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    budget: process.env.AI_DAILY_GENERATION_LIMIT,
  };
  process.env.AI_EXPLANATIONS_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'test-model';
  delete process.env.AI_DAILY_GENERATION_LIMIT;
  assert.equal(isAiExplanationConfigured(), false, 'AI stays disabled without a hard daily budget');
  process.env.AI_DAILY_GENERATION_LIMIT = '25';
  assert.equal(aiDailyGenerationLimit(), 25);
  assert.equal(isAiExplanationConfigured(), true);
  for (const [key, value] of Object.entries(savedAiEnv)) {
    const envKey = { enabled: 'AI_EXPLANATIONS_ENABLED', key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL', budget: 'AI_DAILY_GENERATION_LIMIT' }[key];
    if (value === undefined) delete process.env[envKey];
    else process.env[envKey] = value;
  }

  const qualityIssues = inspectQuestionQuality([{
    ...reviewQuestions[0],
    source: 'base', deleted: false,
    options: ['Always correct', 'Always correct'],
    cs: { question: '', options: [], introduction: '', explanation: '' },
  }]);
  assert.ok(qualityIssues.some((issue) => issue.kind === 'weak_distractor'));
  assert.ok(qualityIssues.some((issue) => issue.kind === 'missing_translation'));

  const migration = readFileSync(join(process.cwd(), 'supabase-schema-022.sql'), 'utf8');
  assert.match(migration, /record_verified_quiz_result_v2/);
  assert.match(migration, /complete_verified_roadmap_attempt/);
  assert.match(migration, /apply_verified_skill_check/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_verified_activity_xp/);
  assert.match(migration, /claim_ai_generation_budget/);
  assert.match(migration, /'math'.*'chess'.*'poker'/);
  assert.doesNotMatch(migration, /'mathematics'|'physics'|'chemistry'/);

  const rateReq = { headers: { 'x-forwarded-for': `contract-${Date.now()}` }, socket: {} } as never;
  const rateRes = mockResponse();
  const policy = { key: `contract-${Date.now()}`, capacity: 2, refillPerSecond: 0.0001 };
  assert.equal(checkRateLimit(rateReq, rateRes as never, policy), true);
  assert.equal(checkRateLimit(rateReq, rateRes as never, policy), true);
  assert.equal(checkRateLimit(rateReq, rateRes as never, policy), false);
  assert.equal(rateRes.statusCode, 429);
  assert.ok(rateRes.headers.has('retry-after'));
  assert.equal(isDistributedRateLimitEnabled(), false, 'test environment exercises the safe local fallback');

  const healthRes = mockResponse();
  await healthHandler({ method: 'POST', headers: {}, query: {} } as never, healthRes as never);
  assert.equal(healthRes.statusCode, 405);
  assert.equal(healthRes.headers.get('allow'), 'GET');
  assert.ok(healthRes.headers.has('x-request-id'));

  console.log('Launch contracts passed: product identity, scope, token confidentiality, rate limiting, health, and 12-function budget.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
