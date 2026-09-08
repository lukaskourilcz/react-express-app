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
  STUDYSHARK_SCOPE_SUBJECTS,
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
  stableAttemptId,
} from '../lib/quiz-tokens';
import { checkRateLimit, isDistributedRateLimitEnabled, RATE_LIMITS } from '../lib/rate-limit';
import healthHandler from '../api/health';
import roadmapHandler from '../api/quiz/roadmap';
import { selectPersonalizedReview } from '../lib/review-selection';
import { aiDailyGenerationLimit, isAiExplanationConfigured } from '../lib/ai-provider';
import { aiFeaturesAllowed } from '../lib/product-scope';
import { codingTaskById, levelCodingTasks, playable as playableCodingTask, CODING_TASKS } from '../lib/coding/catalog';
import { solutionFor } from '../lib/coding/solutions';
import { gradeDesign, prepareDesign, codeOutcome, giveUpAfter, ladderLength } from '../lib/coding/grade';
import { runInSandbox } from '../lib/coding/sandbox';
import { runReactSuite } from '../lib/coding/react-runner';
import { decodeCodingSession, encodeCodingSession, decodeGithubConnectState, encodeGithubConnectState } from '../lib/quiz-tokens';
import { gardenPathFor, tierUnlocked, eligibleCodingBadges, CODING_TASK_XP, CODING_BADGE_IDS } from '../shared/coding-catalog';
import { CODING_BADGES } from '../shared/badges';
import { CODING_INDEX } from '../shared/coding-index';
import { inspectQuestionQuality } from '../lib/question-quality';
import { assessmentUnlocks, roadmapEndedOnHearts, ROADMAP_MAX_HEARTS } from '../shared/assessment';
import { grantedTopicsFor, withGrantedTopics } from '../lib/topic-grants';
import { ROADMAP_TOPICS } from '../lib/roadmap';
import {
  disableSupportPrompt,
  dismissSupportPrompt,
  recordSupportMilestone,
  SUPPORT_PROMPT_DISMISS_MS,
} from '../client/src/lib/supportPrompt';
import type { Question } from '../lib/quiz-runtime';
import {
  BASE_TRACKS,
  LEARNER_PROFILE_VERSION,
  MAX_LEARNER_GOALS,
  completeProfile,
  learnerProfileState,
  planChanged,
  validateLearnerProfile,
  type BaseTrack,
  type LearnerProfile,
} from '../shared/learner-profile';
import {
  BASE_PATH_STAGES,
  buildEligibility,
  completionsFromBlob,
  decideStep,
  fdePathFor,
  graphGoverns,
  graphProblems,
  nextStep,
  pathsForProfile,
  LEVELS_PER_CHECKPOINT,
  UNPLACED_TOPICS,
  type VerifiedCompletions,
} from '../shared/progression';
import { topicLevelCounts } from '../lib/progression';
import {
  CODING_SECTION_TRACKS,
  codingSectionTasks,
  isCodingSectionTrack,
} from '../shared/coding-catalog';
import { readFileSync as readSource } from 'node:fs';
import { cs } from '../client/src/i18n/translations.cs';
import {
  SESSION_MINUTES,
  buildPracticeSession,
  isSessionMinutes,
  type PracticeCandidate,
} from '../shared/practice-session';
import { SKIP_REASONS, isSkipReason, MAX_SKIP_NOTE } from '../shared/coding-skip';
import {
  MERCH_CATALOG,
  MERCH_SKUS,
  availabilityFor,
  merchBySku,
} from '../shared/merchandise';
import {
  REGISTRATION_GRANT,
  TOKENS_PER_XP,
  canTransition,
  validateAddress,
  type OrderStatus,
} from '../shared/rewards';
import { merchPricing, isLiveCharging, isPaymentConfigured, paymentConfig, resetMerchPricingCache } from '../lib/rewards/config';
import { parsePaymentEvent, verifyWebhookSignature } from '../lib/rewards/payments';
import { configuredSupplier, operationsOwner } from '../lib/rewards/fulfillment';
import { createHmac } from 'node:crypto';
import {
  EXAMPLE_MAX_OUTPUT_CHARS,
  EXAMPLE_MAX_OUTPUT_LINES,
  LESSON_EXAMPLES,
  lessonExampleCoverage,
  lessonExamplesFor,
} from '../shared/lesson-examples';

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
  assert.equal(resolveCatalogProductId({ lockSubject: 'webdev' }), 'devshark');
  assert.equal(resolveCatalogProductId({ lockSubject: 'geography' }), 'studyshark');
  assert.equal(resolveCatalogProductId({ product: 'geoshark' }), 'studyshark');
  assert.equal(resolveCatalogProductId({}), 'studyshark');
  assert.equal(SHARK_BRAND_ORDER.length, 7);
  assert.equal(new Set(SHARK_BRAND_ORDER).size, SHARK_BRAND_ORDER.length);
  assert.ok(SHARK_BRAND_ORDER.every((id) => PRODUCT_CATALOG[id]));
  assert.deepEqual(allowedDeploymentSubjects({ VITE_PRODUCT: 'devshark' }), ['webdev']);
  assert.deepEqual(allowedDeploymentSubjects({ VITE_LOCK_SUBJECT: 'webdev' }), ['webdev']);
  assert.deepEqual(allowedDeploymentSubjects({ VITE_LOCK_SUBJECT: 'geography' }), [
    'geography', 'math', 'history', 'chess', 'biology', 'poker',
  ]);
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

  const dailyAttempt = stableAttemptId('daily', 'user-0001', 'geography', '2026-07-21');
  assert.match(dailyAttempt, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(
    stableAttemptId('daily', 'user-0001', 'geography', '2026-07-21'),
    dailyAttempt,
    'the same server-defined daily attempt must receive the same claim id',
  );
  assert.notEqual(stableAttemptId('daily', 'user-0002', 'geography', '2026-07-21'), dailyAttempt);
  assert.notEqual(stableAttemptId('daily', 'user-0001', 'geography', '2026-07-22'), dailyAttempt);
  assert.notEqual(stableAttemptId('daily', 'user-0001', 'math', '2026-07-21'), dailyAttempt);

  const run = createChallengeRun();
  assert.equal(decodeChallengeRun(run.runToken)?.runId, run.runId);
  const proof = encodeAnswerProof('q-1', 'geography', true);
  assert.deepEqual(decodeAnswerProof(proof), { questionId: 'q-1', subject: 'geography', isCorrect: true });
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
  assert.ok(assessmentUnlocks('webdev', 18).every((topic) => ROADMAP_TOPICS.includes(topic as never)));

  // Retired paths must be gone from every catalog, so no skill-check tier,
  // level map, or picker can offer a path with no questions behind it.
  for (const retired of ['internet', 'rhf-zod']) {
    assert.ok(!ROADMAP_TOPICS.includes(retired as never), `${retired} must not be a roadmap topic`);
    assert.ok(!SUBJECT_SCOPE_CATALOG.webdev.topics.includes(retired as never));
    assert.ok(!SUBJECT_SCOPE_CATALOG.webdev.categories.includes(retired as never));
    assert.ok(!assessmentUnlocks('webdev', 20).includes(retired));
  }

  // Named-account path grants: the owner's address gets them, nobody else does.
  const owner = 'owner@example.com';
  assert.deepEqual(grantedTopicsFor('learner@example.com', owner), []);
  assert.deepEqual(grantedTopicsFor(null, owner), []);
  assert.deepEqual(grantedTopicsFor('', owner), []);
  assert.ok(grantedTopicsFor('OWNER@Example.com', owner).includes('system-design'), 'grants are case-insensitive');
  assert.ok(grantedTopicsFor(owner, owner).every((topic) => ROADMAP_TOPICS.includes(topic)));
  assert.deepEqual(withGrantedTopics(['git'], 'learner@example.com', owner), ['git']);
  assert.deepEqual(withGrantedTopics(['git'], owner, owner), ['git', 'system-design']);
  assert.deepEqual(
    withGrantedTopics(['system-design'], owner, owner),
    ['system-design'],
    'an already-unlocked grant must not be duplicated',
  );

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

  assert.equal(aiFeaturesAllowed({ PRODUCT_ID: 'devshark' }), false, 'devShark ships no AI feature');
  assert.equal(aiFeaturesAllowed({ VITE_LOCK_SUBJECT: 'webdev' }), false);
  assert.equal(aiFeaturesAllowed({ VITE_PRODUCT: 'studyshark' }), true);

  // Coding challenges: sealed sessions, answer-free payloads, server grading.
  const codingSession = encodeCodingSession({ taskId: 'js-double-numbers', track: 'javascript', userId: 'user-0001', roadmapAttemptId: 'attempt-0123456789abcd' });
  assert.match(codingSession, /^v2\./);
  assert.ok(!codingSession.includes('js-double-numbers'), 'coding session must not expose the task id in clear');
  const decodedCoding = decodeCodingSession(codingSession);
  assert.equal(decodedCoding?.taskId, 'js-double-numbers');
  assert.equal(decodedCoding?.roadmapAttemptId, 'attempt-0123456789abcd');
  assert.match(decodedCoding?.attemptId ?? '', /^[A-Za-z0-9_-]{16,64}$/);
  // Flip the first payload character, not the last: base64url's final character
  // can carry padding bits only, so changing it sometimes decodes to the very
  // same bytes and the assertion passes or fails at random.
  const tamperedCoding = codingSession.replace(/^(v2\.)(.)/, (_m, prefix: string, c: string) => `${prefix}${c === 'A' ? 'B' : 'A'}`);
  assert.notEqual(tamperedCoding, codingSession, 'the tamper must actually change the token');
  assert.equal(decodeCodingSession(tamperedCoding), null, 'tampered coding session must fail closed');
  assert.equal(decodeSession(codingSession), null, 'a coding session is never a quiz session');
  const connectState = encodeGithubConnectState('user-0001');
  assert.equal(decodeGithubConnectState(connectState)?.userId, 'user-0001');
  assert.equal(decodeCodingSession(connectState), null);

  const doubleTask = codingTaskById('js-double-numbers');
  assert.ok(doubleTask && doubleTask.tests && doubleTask.tests.length >= 4);
  const doubleSolution = solutionFor('js-double-numbers');
  assert.ok(doubleSolution?.solution.includes('double'));
  const playableDouble = JSON.stringify(playableCodingTask(doubleTask!));
  assert.ok(!playableDouble.includes(doubleSolution!.solution.trim().slice(0, 30)), 'playable task must not carry the solution');
  const graded = await runInSandbox({ code: doubleSolution!.solution, calls: doubleTask!.tests!.map((t) => t.call), expectations: doubleTask!.tests!.map((t) => t.expected) });
  assert.equal(codeOutcome({ visible: graded, hidden: null, check: null }), 'passed', 'the reference solution passes in the sandbox');
  const wrong = await runInSandbox({ code: 'const double = ns => ns;', calls: doubleTask!.tests!.map((t) => t.call), expectations: doubleTask!.tests!.map((t) => t.expected) });
  assert.equal(codeOutcome({ visible: wrong, hidden: null, check: null }), 'failed');
  const hung = await runInSandbox({ code: 'const double = () => { while (true) {} };', calls: ['double([1])'], expectations: [[2]], deadlineMs: 300 });
  assert.equal(hung.timedOut, true, 'an infinite loop is cut off by the deadline');
  const escaped = await runInSandbox({ code: 'const peek = () => typeof process + typeof require + typeof fetch + typeof globalThis.Deno;', calls: ['peek()'], expectations: ['undefinedundefinedundefinedundefined'] });
  assert.equal(escaped.results[0]?.pass, true, 'the sandbox exposes no host globals');

  const designTask = CODING_TASKS.find((task) => task.verify === 'guided');
  assert.ok(designTask?.design, 'a guided design task exists');
  const prepared = prepareDesign(designTask!, (list) => [...list].reverse());
  assert.ok(prepared.key.steps?.length === 5);
  const shuffledPlayable = JSON.stringify({ ...playableCodingTask(designTask!), design: { steps: prepared.design!.steps.map((step) => ({ options: step.options })) } });
  assert.ok(!shuffledPlayable.includes('"correct"'), 'the shuffled design payload carries no answer');
  const allRight = gradeDesign(designTask!, prepared.key, prepared.key.steps!);
  assert.equal(allRight.outcome, 'passed');
  assert.equal(gradeDesign(designTask!, prepared.key, prepared.key.steps!.map((i) => (i + 1) % 3)).outcome, 'failed');
  const drillTask = CODING_TASKS.find((task) => task.drill?.format === 'sequence');
  const preparedDrill = prepareDesign(drillTask!, (list) => [...list].reverse());
  assert.equal(gradeDesign(drillTask!, preparedDrill.key, [preparedDrill.key.order!]).outcome, 'passed', 'a sequence drill grades the shuffled order');
  assert.equal(gradeDesign(drillTask!, preparedDrill.key, [[...preparedDrill.key.order!].reverse()]).outcome, 'failed');
  assert.equal(giveUpAfter(ladderLength(doubleTask!)), Math.min(Math.max(2, Math.ceil(ladderLength(doubleTask!) / 2)), ladderLength(doubleTask!)));

  assert.ok(levelCodingTasks('javascript', 6).length >= 1, 'javascript level 6 carries a coding task');
  assert.ok(levelCodingTasks('javascript', 6).length <= 2);
  assert.equal(gardenPathFor({ id: 'js-double-numbers', track: 'javascript', level: 6 }), 'javascript/06-double-numbers.js');
  assert.equal(gardenPathFor({ id: 'dd-requests-per-second', track: 'system-design', level: 0 }), 'system-design/00-requests-per-second.md');
  assert.ok(CODING_INDEX.length > 0, 'the browser index exists (freshness is enforced by npm run test:coding)');
  assert.ok(CODING_INDEX.every((row) => !('tests' in row) && !('prompt' in row)), 'the browser index carries no task bodies');
  const ladderBase = { track: 'javascript' as const, progress: { passed: new Set<string>() }, tasks: CODING_INDEX, javascriptLevelsCleared: 0 };
  assert.equal(tierUnlocked({ ...ladderBase, tier: 1 }), true);
  assert.equal(tierUnlocked({ ...ladderBase, tier: 3 }), false);
  assert.equal(tierUnlocked({ ...ladderBase, tier: 3, javascriptLevelsCleared: 10 }), true, 'the Learn foundations open tier 3');
  assert.equal(tierUnlocked({ ...ladderBase, track: 'system-design', tier: 5 }), true, 'system design has no ladder');
  assert.deepEqual(eligibleCodingBadges(new Set(), CODING_INDEX), []);
  assert.deepEqual(CODING_BADGES.map((badge) => badge.id), [...CODING_BADGE_IDS], 'every coding badge has display metadata');
  assert.ok(CODING_TASK_XP[1] < CODING_TASK_XP[5]);

  // React tasks are graded on the server like every other track: the reference
  // solution passes, a component that renders nothing fails, and a case that
  // never settles is a timeout rather than a hang. This runs with the same
  // module the API loads, under whatever NODE_ENV the check runs in.
  const reactTask = CODING_TASKS.find((one) => one.track === 'react' && one.verify === 'tests' && one.suite);
  assert.ok(reactTask, 'the catalogue has a React task with a suite');
  const reactSolution = solutionFor(reactTask!.id)?.solution;
  assert.ok(reactSolution, 'that React task has a reference solution');
  const reactPass = await runReactSuite({ suite: reactTask!.suite!, appSource: reactSolution! });
  assert.equal(reactPass.failed, 0, 'the reference React solution passes on the server');
  assert.ok(reactPass.total > 0, 'the React suite registered cases');
  assert.equal(reactPass.compileError, null);
  const reactFail = await runReactSuite({ suite: reactTask!.suite!, appSource: 'function App() { return null; }' });
  assert.ok(reactFail.failed > 0, 'a component that renders nothing fails the suite');
  const reactStuck = await runReactSuite({
    suite: "test('never settles', async () => { await new Promise(() => {}); });",
    appSource: 'function App() { return null; }',
  });
  assert.equal(reactStuck.timedOut, true, 'a case that never settles is reported as a timeout');

  // Coding resources are devShark-only: the StudyShark scope this test runs in refuses them.
  const codingRes = mockResponse();
  await roadmapHandler({ method: 'GET', headers: {}, query: { resource: 'coding-task', id: 'js-double-numbers' } } as never, codingRes as never);
  assert.equal(codingRes.statusCode, 404, 'coding tasks are not served outside devShark');

  const qualityIssues = inspectQuestionQuality([{
    ...reviewQuestions[0],
    source: 'base', deleted: false,
    options: ['Always correct', 'Always correct'],
    cs: { question: '', options: [], introduction: '', explanation: '' },
  }]);
  assert.ok(qualityIssues.some((issue) => issue.kind === 'weak_distractor'));
  assert.ok(qualityIssues.some((issue) => issue.kind === 'missing_translation'));

  const migration = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-022.sql'), 'utf8');
  assert.match(migration, /record_verified_quiz_result_v2/);
  assert.match(migration, /complete_verified_roadmap_attempt/);
  assert.match(migration, /apply_verified_skill_check/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_verified_activity_xp/);
  assert.match(migration, /claim_ai_generation_budget/);
  assert.match(migration, /'math'.*'chess'.*'poker'/);
  assert.doesNotMatch(migration, /'mathematics'|'physics'|'chemistry'/);

  const hardening = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-023.sql'), 'utf8');
  assert.match(hardening, /CREATE TABLE IF NOT EXISTS public\.quiz_submissions/);
  assert.match(hardening, /claim_quiz_submission/);
  assert.match(hardening, /record_roadmap_answer/);
  assert.match(hardening, /incomplete_roadmap_attempt/);
  assert.match(hardening, /ADD COLUMN IF NOT EXISTS subject TEXT/);
  assert.match(hardening, /REVOKE ALL ON FUNCTION public\.match_question_distribution/);
  assert.match(hardening, /purge_expired_learning_data/);
  assert.ok(
    hardening.indexOf('CREATE OR REPLACE FUNCTION public.subject_leaderboard') <
      hardening.indexOf('REVOKE ALL ON FUNCTION public.subject_leaderboard'),
    'Migration 023 must create subject_leaderboard before revoking its privileges',
  );
  assert.match(hardening, /REVOKE ALL ON FUNCTION public\.global_leaderboard\(INTEGER\)/);
  assert.match(hardening, /REVOKE ALL ON FUNCTION public\.daily_leaderboard\(DATE, INTEGER\)/);
  const multiplayerMigration = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-005.sql'), 'utf8');
  assert.match(multiplayerMigration, /DROP FUNCTION IF EXISTS public\.match_scoreboard\(UUID\)/);

  const coding = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-025.sql'), 'utf8');
  for (const table of ['coding_progress', 'coding_attempts', 'coding_drafts', 'roadmap_attempt_coding', 'github_connections', 'github_commits']) {
    assert.match(coding, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`), `migration 025 must create ${table}`);
    assert.match(coding, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`), `${table} needs RLS`);
  }
  for (const fn of ['record_coding_verdict', 'record_coding_reveal', 'save_coding_draft', 'complete_verified_roadmap_attempt', 'delete_user_data', 'purge_expired_learning_data']) {
    assert.match(coding, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(`), `migration 025 must define ${fn}`);
    assert.match(coding, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(`), `${fn} must be service-role only`);
  }
  assert.match(coding, /p_coding_task_ids JSONB DEFAULT NULL/, 'level completion must accept the sealed coding task ids');
  assert.match(coding, /DROP FUNCTION IF EXISTS public\.complete_verified_roadmap_attempt\(TEXT, TEXT\)/);
  assert.match(coding, /'coding:' \|\| p_task_id/, 'coding XP must go through the verified-activity ledger once per task');
  assert.match(coding, /DELETE FROM public\.coding_progress WHERE user_id = p_user_id/);
  assert.match(coding, /DELETE FROM public\.github_connections WHERE user_id = p_user_id/);
  assert.doesNotMatch(coding, /access_token|refresh_token|provider_token/, 'the garden must never store a user token');

  // Reference solutions, hidden tests, authored puzzles and the curated
  // approaches never ship: nothing under client/ may import the server's
  // lib/coding directory, and the catalogue keeps solutions in their own module.
  // The pattern matches the directory, not the prefix, so a client module whose
  // own name begins with "coding" (client/src/lib/codingLibrary.ts) is not a
  // false positive.
  const SERVER_CODING_IMPORT = /lib\/coding(\/|['"`])/;
  const clientFiles = readdirSync(join(process.cwd(), 'client', 'src'), { recursive: true }) as string[];
  for (const file of clientFiles) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = readFileSync(join(process.cwd(), 'client', 'src', file), 'utf8');
    assert.doesNotMatch(text, SERVER_CODING_IMPORT, `client/src/${file} must not import lib/coding`);
  }
  // The sandbox frame has an opaque origin, so its module script is a CORS
  // load: without Access-Control-Allow-Origin on its assets the harness never
  // starts, and no React task can run. Keep the header rule in vercel.json.
  const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const allowsOrigin = (source: string) =>
    vercelConfig.headers.some((rule) =>
      rule.source === source && rule.headers.some((header) => header.key === 'Access-Control-Allow-Origin'));
  assert.ok(allowsOrigin('/sandbox/(.*)'), 'the sandbox frame needs Access-Control-Allow-Origin on /sandbox/');
  const sandboxCsp = vercelConfig.headers
    .find((rule) => rule.source === '/sandbox/(.*)')?.headers
    .find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(sandboxCsp, /script-src [^;]*'unsafe-eval'/, 'the sandbox compiles and runs code with new Function');
  assert.match(sandboxCsp, /default-src 'none'/, 'the sandbox frame stays network-less');

  const sandboxDir = join(process.cwd(), 'client', 'sandbox');
  if (statSync(sandboxDir, { throwIfNoEntry: false })?.isDirectory()) {
    for (const file of readdirSync(sandboxDir, { recursive: true }) as string[]) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      assert.doesNotMatch(readFileSync(join(sandboxDir, file), 'utf8'), SERVER_CODING_IMPORT, `client/sandbox/${file} must not import lib/coding`);
    }
  }
  const catalogSource = readFileSync(join(process.cwd(), 'lib/coding/catalog.ts'), 'utf8');
  assert.doesNotMatch(catalogSource, /from '\.\/solutions/, 'the catalogue loader must not import the solutions');
  for (const key of ['codingRun', 'codingDraft', 'codingReveal', 'githubConnect', 'githubSync']) {
    assert.ok(key in RATE_LIMITS, `rate limit ${key} must exist`);
  }

  const shopSource = readFileSync(join(process.cwd(), 'client/src/lib/shop.ts'), 'utf8');
  const catalogueSource = shopSource.match(/const STATIC_CATALOGUE:[^=]+= \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(catalogueSource, 'shop catalogue must remain statically inspectable');
  assert.match(shopSource, /type ProductKind = 'ring' \| 'flair'/);
  assert.doesNotMatch(catalogueSource, /kind:\s*['"](?:path|booster|boost|xp)['"]/, 'shop catalogue must remain cosmetic-only');
  assert.doesNotMatch(shopSource, /\bconsumeDoubleXpCharge\b/, 'shop must never influence XP awards');
  const xpSource = readFileSync(join(process.cwd(), 'client/src/lib/xp.ts'), 'utf8');
  assert.doesNotMatch(xpSource, /\bconsumeDoubleXpCharge\b/, 'XP awards must remain independent of shop inventory');

  const profileSource = readFileSync(join(process.cwd(), 'client/src/components/Profile.tsx'), 'utf8');
  const profileStreakIndex = profileSource.indexOf('<StreakCard stats={stats} />');
  const profileSectionsIndex = profileSource.indexOf('<Grid columns={{ minWidth: 360, max: 2 }}');
  assert.ok(
    profileStreakIndex >= 0 && profileSectionsIndex >= 0 && profileStreakIndex < profileSectionsIndex,
    'Profile must keep the streak ahead of the secondary progress sections',
  );
  assert.doesNotMatch(
    profileSource,
    /profile\.backToQuiz/,
    'Profile is an overview and must not end with a contextless Back to quiz action',
  );
  assert.equal(
    profileSource.match(/<ConsistencyTip/g)?.length,
    1,
    'Profile should keep exactly one consistency tip, drawn from the rotating pool',
  );
  assert.match(
    profileSource,
    /<IdentitySettings \/>/,
    'Language, appearance and sound must stay reachable from the identity banner',
  );

  // A Learn level ends on the third wrong answer, which normally leaves later
  // questions unanswered. That attempt must still complete — as a fail — because
  // the learner cannot answer questions the lesson stopped showing them.
  assert.equal(roadmapEndedOnHearts('level', 5, ROADMAP_MAX_HEARTS, 8), true);
  assert.equal(
    roadmapEndedOnHearts('level', 8, ROADMAP_MAX_HEARTS, 8),
    false,
    'a full answer set still goes through the verified completion RPC',
  );
  assert.equal(
    roadmapEndedOnHearts('level', 5, ROADMAP_MAX_HEARTS - 1, 8),
    false,
    'stopping short with hearts left is a real incomplete attempt',
  );
  assert.equal(
    roadmapEndedOnHearts('test', 5, ROADMAP_MAX_HEARTS, 8),
    false,
    'checkpoints and part tests have no hearts',
  );

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

  // Learn must be browsable for every StudyShark subject without a database
  // write. This exercises the same structure and first-level GETs used by the
  // client, and catches accidental subject locks or question-bank failures.
  const structureRes = mockResponse();
  await roadmapHandler({ method: 'GET', headers: {}, query: {} } as never, structureRes as never);
  assert.equal(structureRes.statusCode, 200);
  const structure = structureRes.body as { topics?: string[] };
  assert.ok(Array.isArray(structure.topics));
  assert.ok(STUDYSHARK_SCOPE_SUBJECTS.every((subject) =>
    SUBJECT_SCOPE_CATALOG[subject].topics.every((topic) => structure.topics?.includes(topic)),
  ));
  for (const subject of STUDYSHARK_SCOPE_SUBJECTS) {
    const topic = SUBJECT_SCOPE_CATALOG[subject].topics[0];
    const lessonRes = mockResponse();
    await roadmapHandler({
      method: 'GET', headers: {}, query: { topic, level: '1', lang: 'cs' },
    } as never, lessonRes as never);
    assert.equal(lessonRes.statusCode, 200, `${subject} Learn level must load`);
    const lesson = lessonRes.body as { sessionId?: string; questions?: Array<Record<string, unknown>> };
    assert.match(lesson.sessionId ?? '', /^v2\./);
    assert.ok((lesson.questions?.length ?? 0) > 0);
    assert.ok(lesson.questions?.every((question) => !('correctAnswer' in question)));
  }

  /* ── the learner profile and the progression graph (#151, #152) ────────── */
  const levelCounts = topicLevelCounts();

  // Every selectable plan is a well-formed graph with a reachable first step.
  assert.deepEqual(graphProblems(levelCounts), [], 'the progression graph must be acyclic and startable');
  for (const track of BASE_TRACKS) {
    assert.ok(BASE_PATH_STAGES[track].length > 0, `${track} must have stages`);
    assert.ok(BASE_PATH_STAGES[track][0].topics.length > 0, `${track} must start somewhere`);
    // The FDE bridge only asks for what the base track does not already cover.
    const covered = new Set(BASE_PATH_STAGES[track].flatMap((stage) => [...stage.topics]));
    const bridge = fdePathFor(track).stages.find((stage) => stage.key === 'fde-bridge');
    for (const topic of bridge?.topics ?? []) {
      assert.ok(!covered.has(topic), `${track}+FDE must not re-ask for ${topic}`);
    }
  }
  // Frontend + FDE carries the explicit data/backend bridge; fullstack does not.
  assert.ok((fdePathFor('frontend').stages.find((s) => s.key === 'fde-bridge')?.topics.length ?? 0) > 0);
  assert.equal(fdePathFor('fullstack').stages.find((s) => s.key === 'fde-bridge'), undefined);

  // Validation: only known answers survive, and a half profile stays a draft.
  assert.equal(validateLearnerProfile({ baseTrack: 'wizard' }).errors[0]?.field, 'baseTrack');
  assert.equal(validateLearnerProfile({ goals: [] }).errors[0]?.code, 'empty');
  assert.equal(
    validateLearnerProfile({ goals: ['first-job', 'interview', 'level-up', 'curiosity'] }).errors[0]?.code,
    'too_many',
    `no more than ${MAX_LEARNER_GOALS} goals`,
  );
  assert.equal(validateLearnerProfile({ studyMinutes: 7 }).errors[0]?.field, 'studyMinutes');
  assert.equal(validateLearnerProfile({ baseTrack: 'frontend' }).complete, false);
  assert.deepEqual(validateLearnerProfile({ nonsense: true, baseTrack: 'frontend' }).draft, { baseTrack: 'frontend' });

  const answers = { baseTrack: 'frontend' as BaseTrack, goals: ['first-job' as const], experience: 'new' as const, studyMinutes: 10 as const, fde: false, dsa: true };
  const profile = completeProfile(answers, '2026-01-01T00:00:00.000Z');
  assert.ok(profile, 'a complete answer set becomes a profile');
  assert.equal(profile!.version, LEARNER_PROFILE_VERSION);
  assert.equal(completeProfile({ baseTrack: 'frontend' }, '2026-01-01T00:00:00.000Z'), null);
  // Changing a goal is not a plan change; changing an enrolment is.
  assert.equal(planChanged(profile, { ...profile!, goals: ['interview'] }), false);
  assert.equal(planChanged(profile, { ...profile!, dsa: false }), true);
  // A profile stored under an older contract is re-asked, and its answers kept.
  const stale = learnerProfileState({ ...profile!, version: LEARNER_PROFILE_VERSION - 1 } as LearnerProfile);
  assert.equal(stale.complete, false);
  assert.equal(stale.draft.baseTrack, 'frontend');

  const noCompletions: VerifiedCompletions = { levels: {}, checkpoints: {}, visibleTopics: [] };
  const input = { profile: profile!, completions: noCompletions, levelCounts };

  // DSA is selected here, so it is part of the plan; FDE is not.
  assert.deepEqual(pathsForProfile(profile!).map((path) => path.id), ['frontend', 'dsa']);

  // A fresh learner can start level 1 of a stage-1 topic and nothing beyond it.
  assert.equal(decideStep(input, { topic: 'html', kind: 'level', ref: 1 }).allowed, true);
  assert.equal(decideStep(input, { topic: 'html', kind: 'level', ref: 2 }).reason, 'level_locked');
  assert.equal(decideStep(input, { topic: 'html', kind: 'level', ref: 9 }).reason, 'level_locked');
  // A topic in a later stage is closed until the earlier stage has a pass.
  assert.equal(decideStep(input, { topic: 'react', kind: 'level', ref: 1 }).reason, 'stage_locked');
  // A topic outside the learner's plan is refused outright.
  assert.equal(decideStep(input, { topic: 'databases', kind: 'level', ref: 1 }).reason, 'not_selected');
  // A forged step number cannot walk off the ladder.
  assert.equal(decideStep(input, { topic: 'html', kind: 'level', ref: 999 }).reason, 'out_of_range');
  assert.equal(decideStep(input, { topic: 'html', kind: 'level', ref: 0 }).reason, 'out_of_range');
  assert.equal(decideStep(input, { topic: 'html', kind: 'checkpoint', ref: 1 }).reason, 'level_locked');

  // Level 6 needs checkpoint 1, not just level 5 — no skipping the exam.
  const throughFive = completionsFromBlob({
    html: { levels: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [String(n), { passed: true }])), checkpoints: {} },
  });
  const afterFive = { profile: profile!, completions: throughFive, levelCounts };
  assert.equal(decideStep(afterFive, { topic: 'html', kind: 'level', ref: 6 }).reason, 'checkpoint_locked');
  assert.equal(decideStep(afterFive, { topic: 'html', kind: 'checkpoint', ref: 1 }).allowed, true);
  // Replaying a level already passed is allowed and changes nothing.
  assert.equal(decideStep(afterFive, { topic: 'html', kind: 'level', ref: 3 }).allowed, true);

  // One pass in every stage-1 topic opens stage 2 — and only stage 2.
  const stageOne = completionsFromBlob(Object.fromEntries(
    ['html', 'css', 'javascript'].map((topic) => [topic, { levels: { '1': { passed: true } }, checkpoints: {} }]),
  ));
  const afterStageOne = { profile: profile!, completions: stageOne, levelCounts };
  assert.equal(decideStep(afterStageOne, { topic: 'typescript', kind: 'level', ref: 1 }).allowed, true);
  assert.equal(decideStep(afterStageOne, { topic: 'react', kind: 'level', ref: 1 }).reason, 'stage_locked');

  // A diagnostic that made a topic visible still cannot open a higher level.
  const diagnosed = completionsFromBlob({}, ['react']);
  const afterDiagnostic = { profile: profile!, completions: diagnosed, levelCounts };
  assert.equal(decideStep(afterDiagnostic, { topic: 'react', kind: 'level', ref: 1 }).allowed, true);
  assert.equal(decideStep(afterDiagnostic, { topic: 'react', kind: 'level', ref: 4 }).reason, 'level_locked');

  // Without a profile there is no plan to enforce; the generic roadmap applies.
  const anonymous = { profile: null, completions: noCompletions, levelCounts };
  assert.equal(decideStep(anonymous, { topic: 'html', kind: 'level', ref: 1 }).reason, 'no_profile');
  assert.equal(buildEligibility(anonymous).personalized, false);
  assert.equal(nextStep(anonymous), null);

  // Every valid selection has a first step and hides nothing it has opened.
  for (const track of BASE_TRACKS) {
    for (const fde of [false, true]) {
      for (const dsa of [false, true]) {
        const candidate = completeProfile({ ...answers, baseTrack: track, fde, dsa }, '2026-01-01T00:00:00.000Z')!;
        const view = buildEligibility({ profile: candidate, completions: noCompletions, levelCounts });
        assert.ok(view.next, `${track} fde=${fde} dsa=${dsa} must have a reachable first step`);
        assert.equal(decideStep({ profile: candidate, completions: noCompletions, levelCounts }, { topic: view.next!.topic, kind: view.next!.kind, ref: view.next!.ref }).allowed, true);
        const openStages = view.paths.flatMap((path) => path.stages.filter((stage) => stage.open));
        assert.ok(openStages.length > 0);
        const openTopics = new Set(openStages.flatMap((stage) => stage.topics.map((one) => one.topic)));
        for (const topic of openTopics) assert.ok(view.unlockedTopics.includes(topic));
        // A closed stage never leaks a topic no open stage already offers.
        for (const path of view.paths) {
          for (const stage of path.stages.filter((one) => !one.open)) {
            for (const entry of stage.topics) {
              if (openTopics.has(entry.topic)) continue;
              assert.ok(!view.unlockedTopics.includes(entry.topic), `${entry.topic} must stay hidden until its stage opens`);
            }
          }
        }
        assert.equal(view.paths.some((path) => path.id === 'dsa'), dsa, 'DSA appears only when enrolled');
        assert.equal(view.paths.some((path) => path.id === 'fde'), fde, 'FDE appears only when enrolled');
      }
    }
  }

  // Topics the graph never places have no plan to be missing from: the two
  // devShark Learn topics outside every track, and every other StudyShark
  // subject the same roadmap endpoints serve. Plan membership cannot refuse
  // them — only their own level chain can.
  assert.deepEqual([...UNPLACED_TOPICS], ['abbreviations', 'ai'], 'devShark Learn is wider than the plan');
  for (const outside of [...UNPLACED_TOPICS, 'capitals']) {
    assert.equal(graphGoverns(outside), false, `${outside} sits outside every path`);
    assert.equal(decideStep(input, { topic: outside, kind: 'level', ref: 1 }).allowed, true, `${outside} level 1 must stay open`);
    assert.equal(decideStep(input, { topic: outside, kind: 'level', ref: 3 }).reason, 'level_locked', `${outside} still climbs one level at a time`);
  }
  const unplacedView = buildEligibility(input);
  for (const outside of UNPLACED_TOPICS) {
    assert.ok(unplacedView.unlockedTopics.includes(outside), `${outside} must not be hidden by the plan filter`);
  }

  // Editing a plan never takes back a level the learner already passed.
  const switched = completeProfile({ ...answers, baseTrack: 'backend', dsa: false }, '2026-01-01T00:00:00.000Z')!;
  const htmlPassed = completionsFromBlob({ html: { levels: { '1': { passed: true }, '2': { passed: true } }, checkpoints: {} } });
  const afterSwitch = { profile: switched, completions: htmlPassed, levelCounts };
  assert.equal(decideStep(afterSwitch, { topic: 'html', kind: 'level', ref: 2 }).allowed, true, 'a passed level survives a plan change');
  assert.equal(decideStep(afterSwitch, { topic: 'html', kind: 'level', ref: 3 }).reason, 'not_selected', 'but the plan still bounds new levels');

  // Clearing every level of a topic is not the end of it: the final exam sits
  // after the last level, so it has to be both offered and accepted.
  const gitCount = levelCounts.git;
  const gitExams = Math.floor(gitCount / LEVELS_PER_CHECKPOINT);
  const gitBlob = (exams: number) => completionsFromBlob({
    git: {
      levels: Object.fromEntries(Array.from({ length: gitCount }, (_, i) => [String(i + 1), { passed: true }])),
      checkpoints: Object.fromEntries(Array.from({ length: exams }, (_, i) => [String(i + 1), { passed: true }])),
    },
  });
  const beforeFinal = { profile: switched, completions: gitBlob(gitExams - 1), levelCounts };
  const gitEntry = buildEligibility(beforeFinal).paths[0].stages[0].topics.find((one) => one.topic === 'git');
  assert.deepEqual(gitEntry?.nextStep, { pathId: 'backend', topic: 'git', kind: 'checkpoint', ref: gitExams }, 'the final exam is a topic\'s last step');
  assert.equal(decideStep(beforeFinal, { topic: 'git', kind: 'checkpoint', ref: gitExams }).allowed, true);
  const afterFinal = { profile: switched, completions: gitBlob(gitExams), levelCounts };
  const finishedEntry = buildEligibility(afterFinal).paths[0].stages[0].topics.find((one) => one.topic === 'git');
  assert.equal(finishedEntry?.nextStep, null, 'and once it is passed the topic is done');

  // `dsa` sits in the Fullstack track and in DSA Foundations. A learner in both
  // sees one ladder drawn where its gate lives, so the plan total counts it once.
  const bothDsa = completeProfile({ ...answers, baseTrack: 'fullstack', fde: false, dsa: true }, '2026-01-01T00:00:00.000Z')!;
  const bothView = buildEligibility({ profile: bothDsa, completions: noCompletions, levelCounts });
  const drawn = bothView.paths.flatMap((path) => path.stages.flatMap((stage) => stage.topics));
  assert.equal(drawn.filter((one) => one.topic === 'dsa').length, 1, 'a shared topic is drawn once');
  assert.equal(drawn.find((one) => one.topic === 'dsa')?.pathId, 'fullstack', 'and drawn where its gate lives');
  assert.equal(new Set(drawn.map((one) => one.topic)).size, drawn.length, 'no topic is listed twice across paths');

  /* ── Coding no longer offers system design (#165) ──────────────────────── */
  assert.deepEqual([...CODING_SECTION_TRACKS], ['javascript', 'typescript', 'react']);
  assert.equal(isCodingSectionTrack('system-design'), false);
  assert.equal(codingSectionTasks(CODING_INDEX).some((task) => task.track === 'system-design'), false);
  assert.ok(CODING_INDEX.some((task) => task.track === 'system-design'), 'design tasks stay in the catalogue');

  /* ── devShark shows no sibling-brand promotion (#166) ──────────────────── */
  const footerSource = readSource(join(process.cwd(), 'client/src/components/BrandFooter.tsx'), 'utf8');
  assert.match(footerSource, /showFamily = CURRENT_PRODUCT\.id !== 'devshark'/);
  assert.match(footerSource, /\{showFamily && \(\s*<div className="ss-brand-footer__heading">/);
  assert.match(footerSource, /\{showFamily && \(\s*<ul className="ss-brand-footer__brands">/);
  // The legal row and the site settings stay for both products.
  assert.match(footerSource, /footer\.support/);
  assert.match(footerSource, /ss-footer-settings/);

  /* ── short practice sessions (issue #159) ───────────────────────────── */
  const candidate = (taskId: string, minutes: number, extra: Partial<PracticeCandidate> = {}): PracticeCandidate => ({
    taskId, track: 'javascript', estimatedMinutes: minutes, tier: 1, eligible: true, hasPuzzle: false, ...extra,
  });
  const pool: PracticeCandidate[] = [
    candidate('a', 5), candidate('b', 5), candidate('c', 10),
    candidate('d', 5, { eligible: false }), candidate('e', 5, { hasPuzzle: true }),
  ];
  const base = { candidates: pool, due: [], saved: [], passed: [] } as const;

  // Deterministic: the same inputs give exactly the same queue, every time.
  const first = buildPracticeSession({ ...base, minutes: 10 });
  const again = buildPracticeSession({ ...base, minutes: 10 });
  assert.deepEqual(first, again, 'the practice queue must be deterministic');
  assert.ok(first.estimatedMinutes <= 10, 'the queue must fit the chosen budget');
  assert.ok(first.items.every((item) => item.taskId !== 'd'), 'an ineligible task is never queued');

  // A session never repeats work already passed, and never re-serves a skip.
  const skippingA = buildPracticeSession({ ...base, minutes: 20, passed: ['b'], skipped: ['a'] });
  assert.ok(skippingA.items.every((item) => item.taskId !== 'a' && item.taskId !== 'b'));

  // Review comes first and takes at most half the budget, so new work still moves.
  const withReview = buildPracticeSession({
    candidates: pool, minutes: 20, due: ['a', 'b', 'c'], saved: [], passed: ['a', 'b', 'c'],
  });
  assert.equal(withReview.items[0]?.kind, 'review', 'due review leads the queue');
  const reviewMinutes = withReview.items.filter((one) => one.kind === 'review').reduce((sum, one) => sum + one.estimatedMinutes, 0);
  assert.ok(reviewMinutes <= 10, 'review takes at most half of a 20 minute session');

  // Nothing eligible is an honest empty queue, not a padded one.
  const nothing = buildPracticeSession({ minutes: 20, candidates: [candidate('x', 5, { eligible: false })], due: [], saved: [], passed: [] });
  assert.equal(nothing.items.length, 0);
  assert.equal(nothing.short, true);

  // A five minute session with only a ten minute task still offers it rather
  // than showing nothing at all; the estimate is reported honestly.
  const single = buildPracticeSession({ minutes: 5, candidates: [candidate('long', 10)], due: [], saved: [], passed: [] });
  assert.equal(single.items.length, 1);
  assert.equal(single.estimatedMinutes, 10);

  // On a touch screen the queue prefers tasks that have an arrangement puzzle.
  const touch = buildPracticeSession({ ...base, minutes: 5, preferPuzzles: true });
  assert.equal(touch.items[0]?.taskId, 'e', 'a touch session leads with a task that has a puzzle');

  for (const minutes of SESSION_MINUTES) assert.ok(isSessionMinutes(minutes));
  assert.equal(isSessionMinutes(7), false, 'an unoffered length is refused');

  /* ── skipping awards nothing (issue #160) ───────────────────────────── */
  assert.deepEqual([...SKIP_REASONS], ['too-easy', 'too-hard', 'missing-prerequisite', 'unclear', 'later']);
  assert.equal(isSkipReason('bored'), false);
  assert.ok(MAX_SKIP_NOTE > 0 && MAX_SKIP_NOTE <= 500, 'a skip note stays a signal, not an essay');
  const skipSource = readSource(join(process.cwd(), 'lib/coding/practice-handlers.ts'), 'utf8');
  const skipHandler = skipSource.slice(skipSource.indexOf('export async function handleCodingSkip'));
  for (const forbidden of ['record_coding_verdict', 'record_verified_activity_xp', 'roadmap_attempt_coding', 'coding_progress']) {
    assert.doesNotMatch(skipHandler, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `a skip must not touch ${forbidden}`);
  }

  /* ── lesson examples are exploration (issue #162) ───────────────────── */
  const exampleCoverage = lessonExampleCoverage();
  assert.ok(exampleCoverage.length > 0, 'the lesson examples need a coverage manifest');
  for (const topic of ['javascript', 'typescript', 'react', 'dsa']) {
    assert.ok(exampleCoverage.some((entry) => entry.topic === topic), `no example covers ${topic}`);
  }
  const exampleIds = new Set<string>();
  for (const example of LESSON_EXAMPLES) {
    assert.ok(!exampleIds.has(example.id), `duplicate example id ${example.id}`);
    exampleIds.add(example.id);
    assert.ok(example.title.en.trim() && example.title.cs.trim(), `${example.id} needs both languages`);
    assert.ok(example.blurb.en.trim() && example.blurb.cs.trim(), `${example.id} needs both blurbs`);
    // An example that cannot run must still be readable, and one that can must
    // have something to print.
    assert.ok(example.trace.length > 0, `${example.id} needs an authored trace`);
    if (example.runnable) assert.ok(example.calls.length > 0, `${example.id} is runnable but prints nothing`);
    else assert.equal(example.calls.length, 0, `${example.id} is trace-only and must ask for no evaluation`);
    // No-typing interaction is authored, not improvised.
    if (example.runnable) assert.ok(example.variants.length > 0, `${example.id} needs parameter choices for a narrow screen`);
    assert.ok(lessonExamplesFor(example.topic, example.level).some((one) => one.id === example.id));
  }
  assert.ok(EXAMPLE_MAX_OUTPUT_LINES > 0 && EXAMPLE_MAX_OUTPUT_CHARS > 0, 'example output must be bounded');
  // Nothing in the example path may record a verdict, XP or evidence.
  const exampleSource = readSource(join(process.cwd(), 'client/src/coding/LessonExample.tsx'), 'utf8');
  for (const forbidden of ['submitCoding', 'coding-submit', 'awardTokens', 'awardXp', 'apiFetch']) {
    assert.doesNotMatch(exampleSource, new RegExp(forbidden), `a lesson example must not call ${forbidden}`);
  }
  assert.match(exampleSource, /runCodeTests/, 'examples must reuse the existing isolated runner');
  assert.match(exampleSource, /grade: false/, 'examples must not ask the runner to grade');

  /* ── the workspace remembers layout, not code (issue #164) ──────────── */
  const workbenchSource = readSource(join(process.cwd(), 'client/src/coding/CodingWorkbench.tsx'), 'utf8');
  assert.match(workbenchSource, /devshark:coding:layout:v1/, 'layout preferences need their own key');
  assert.doesNotMatch(workbenchSource, /LAYOUT_KEY[^\n]*code/, 'layout preferences must not hold code');
  assert.match(workbenchSource, /role="separator"/, 'the splitter must be a real separator');
  assert.match(workbenchSource, /aria-valuenow=\{layout\.split\}/, 'the splitter must report its position');
  assert.match(workbenchSource, /event\.key === 'ArrowLeft'/, 'the splitter must be keyboard operable');
  // A col-resize cursor promises a drag; the separator has to answer one.
  assert.match(workbenchSource, /onPointerDown=/, 'the splitter must be draggable');
  assert.match(workbenchSource, /setPointerCapture/, 'a drag must survive the pointer running ahead of the separator');
  const codingCss = readSource(join(process.cwd(), 'client/src/coding/Coding.css'), 'utf8');
  assert.match(codingCss, /\.cd-pane\[hidden\] \{ display: none; \}/, 'focus mode must actually hide the brief');
  assert.match(codingCss, /\.cd-splitter \{[^}]*width: 24px/, 'the splitter needs a pointer target, not a hairline');
  assert.match(codingCss, /\.cd-panel--preview \{ max-height: none/, 'the live preview must not be trapped in a scroll box');
  assert.doesNotMatch(codingCss, /data-focus/, 'focus mode must not move a split the separator still reports');
  const mediaSource = readSource(join(process.cwd(), 'client/src/lib/useMediaQuery.ts'), 'utf8');
  assert.match(mediaSource, /any-pointer: fine/, 'zooming a desktop page must not withhold the editor');

  /* ── Czech speaks to the learner as "ty", everywhere ─────────────────── */
  // The dictionary has always addressed the learner informally, which is what
  // Czech developer products do. Formal "vy" in a handful of screens reads as
  // two different products talking. Four strings predate this rule; they are
  // named here rather than rewritten in a branch that did not write them.
  const FORMAL_CZECH = /(va[šs]e|va[šs]eho|va[šs]em|va[šs]i|va[šs]ich|v[áa]m |v[áa]s |v[áa]mi|\bjste\b|Zkuste|P[řr]e[čc]t[ěe]te|Ov[ěe][řr]te|Porovnejte|Vyberte|Dokon[čc]ete|P[řr]ihlaste|Zkontrolujte)/i;
  const FORMAL_CZECH_LEGACY = new Set([
    'auth.signInFailed', 'auth.signOutFailed', 'common.offline', 'play.connectionStale',
  ]);
  for (const [key, value] of Object.entries(cs)) {
    if (FORMAL_CZECH_LEGACY.has(key)) continue;
    assert.doesNotMatch(value, FORMAL_CZECH, `${key} addresses the learner formally; the Czech dictionary uses "ty"`);
  }
  assert.match(workbenchSource, /panelRefs\.current\[tab\]\?\.focus\(\)/, 'focus must land on the result after grading');

  /* ── the shop ships closed until it is configured (#167, #169, #171) ── */
  assert.deepEqual([...MERCH_SKUS], ['sticker-set', 'mug', 'tshirt', 'cap', 'crown']);
  assert.equal(MERCH_CATALOG.filter((product) => product.kind === 'physical').length, 4);
  assert.equal(MERCH_CATALOG.filter((product) => product.kind === 'cosmetic').length, 1);
  for (const product of MERCH_CATALOG) {
    assert.ok(product.name.en.trim() && product.name.cs.trim(), `${product.sku} needs both names`);
    assert.ok(product.blurb.en.trim() && product.blurb.cs.trim(), `${product.sku} needs both blurbs`);
    assert.ok(product.imageAlt.en.trim() && product.imageAlt.cs.trim(), `${product.sku} needs alt text`);
    // A physical item has a print brief; the cosmetic ships nothing.
    if (product.kind === 'physical') {
      assert.ok(product.print, `${product.sku} needs a print specification`);
      assert.ok(product.print!.artwork.startsWith('client/'), `${product.sku} must name its artwork source`);
    } else {
      assert.equal(product.print, null, `${product.sku} must not carry a print specification`);
    }
  }
  assert.equal(merchBySku('tshirt')?.variants.length, 5, 'the T-shirt is sold in five sizes');

  // With nothing configured, nothing can be bought and the reason is stated.
  resetMerchPricingCache();
  const pricing = merchPricing();
  for (const product of MERCH_CATALOG) {
    const closed = availabilityFor(product, pricing[product.sku], { paymentConfigured: false });
    assert.equal(closed.cash, false, `${product.sku} must not be buyable without configuration`);
    assert.equal(closed.tokens, false, `${product.sku} must not be redeemable without a token price`);
    assert.ok(closed.blockers.length > 0, `${product.sku} must say what is missing`);
    assert.ok(closed.blockers.includes('no_token_price'));
  }
  // A cosmetic needs only a token price; a physical item needs the whole set.
  const crown = merchBySku('crown')!;
  const crownPriced = availabilityFor(crown, { ...pricing.crown, tokens: 500 }, { paymentConfigured: false });
  assert.equal(crownPriced.tokens, true, 'a priced cosmetic is redeemable without a supplier');
  assert.equal(crownPriced.cash, false, 'a cosmetic is never a cash purchase');
  const mug = merchBySku('mug')!;
  const mugPartly = availabilityFor(mug, { ...pricing.mug, tokens: 900 }, { paymentConfigured: false });
  assert.equal(mugPartly.tokens, false, 'a physical item still needs stock, a region and a supplier');
  const mugReady = availabilityFor(mug, {
    sku: 'mug', currency: 'CZK', cashMinor: 39000, tokens: 900,
    regions: ['CZ'], stock: 10, supplier: 'example', effectiveFrom: '2026-10-01',
  }, { paymentConfigured: true, region: 'CZ' });
  assert.equal(mugReady.cash, true);
  assert.equal(mugReady.tokens, true);
  const mugElsewhere = availabilityFor(mug, {
    sku: 'mug', currency: 'CZK', cashMinor: 39000, tokens: 900,
    regions: ['CZ'], stock: 10, supplier: 'example', effectiveFrom: '2026-10-01',
  }, { paymentConfigured: true, region: 'DE' });
  assert.equal(mugElsewhere.tokens, false, 'tokens cannot buy their way past a region');
  assert.ok(mugElsewhere.blockers.includes('not_in_region'));

  // Payments are off, and live charging needs a deliberate switch.
  assert.equal(isPaymentConfigured(paymentConfig()), false, 'no payment provider ships configured');
  assert.equal(isLiveCharging(paymentConfig()), false, 'live charging is never on by default');
  assert.equal(configuredSupplier(), null, 'no supplier ships configured');
  assert.equal(operationsOwner(), null, 'no operations owner ships configured');

  /* ── the wallet is a ledger, and the webhook is the payment authority ── */
  assert.equal(TOKENS_PER_XP, 0.1);
  assert.equal(REGISTRATION_GRANT, 200);
  const walletSource = readSource(join(process.cwd(), 'lib/rewards/handlers.ts'), 'utf8');
  assert.match(walletSource, /sync_reward_wallet/, 'the balance must come from the ledger');
  assert.match(walletSource, /converted: false/, 'a local balance is never converted');
  // A total is never taken from the request.
  assert.doesNotMatch(walletSource, /body\.total/, 'the server must compute every total');
  assert.doesNotMatch(walletSource, /body\.price/, 'the server must compute every price');

  const secret = 'whsec_test_only';
  const payload = JSON.stringify({ id: 'evt_000001', type: 'payment_succeeded', data: { orderId: 'abcdefgh', amountMinor: 39000, currency: 'CZK' } });
  const webhookNow = Date.now();
  const stamp = Math.floor(webhookNow / 1000);
  const signed = createHmac('sha256', secret).update(`${stamp}.${payload}`, 'utf8').digest('hex');
  assert.equal(verifyWebhookSignature({ body: payload, header: `t=${stamp},v1=${signed}`, secret, now: webhookNow }).ok, true);
  // A forged amount changes the body, so the signature no longer verifies.
  const forged = payload.replace('39000', '1');
  assert.equal(verifyWebhookSignature({ body: forged, header: `t=${stamp},v1=${signed}`, secret, now: webhookNow }).ok, false);
  assert.equal(verifyWebhookSignature({ body: payload, header: `t=${stamp},v1=${'0'.repeat(64)}`, secret, now: webhookNow }).reason, 'bad_signature');
  assert.equal(verifyWebhookSignature({ body: payload, header: undefined, secret, now: webhookNow }).reason, 'malformed');
  assert.equal(verifyWebhookSignature({ body: payload, header: `t=${stamp},v1=${signed}`, secret: null, now: webhookNow }).reason, 'no_secret');
  // A captured request cannot be replayed later.
  assert.equal(verifyWebhookSignature({ body: payload, header: `t=${stamp - 3600},v1=${signed}`, secret, now: webhookNow }).reason, 'stale');
  assert.equal(parsePaymentEvent(JSON.parse(payload))?.orderId, 'abcdefgh');
  assert.equal(parsePaymentEvent({ type: 'nonsense' }), null);
  assert.equal(parsePaymentEvent({ id: 'evt_000002', type: 'payment_succeeded', data: { orderId: 'bad id' } }), null);

  /* ── orders move one step at a time (#170, #172) ─────────────────────── */
  assert.equal(canTransition('pending', 'paid'), true);
  assert.equal(canTransition('pending', 'shipped'), false, 'an unpaid order cannot ship');
  assert.equal(canTransition('shipped', 'cancelled'), false, 'a shipped order cannot be cancelled');
  assert.equal(canTransition('shipped', 'refunded'), true);
  for (const terminal of ['cancelled', 'refunded'] as OrderStatus[]) {
    for (const target of ['paid', 'shipped', 'delivered'] as OrderStatus[]) {
      assert.equal(canTransition(terminal, target), false, `${terminal} is final`);
    }
  }
  assert.ok('errors' in validateAddress({ name: 'A' }), 'an incomplete address is refused');
  assert.ok('errors' in validateAddress({ name: 'A', line1: 'B', city: 'C', postcode: 'D', country: 'CZE' }), 'a country must be two letters');
  const goodAddress = validateAddress({ name: 'A', line1: 'B', city: 'C', postcode: 'D', country: 'cz' });
  assert.ok('address' in goodAddress && goodAddress.address.country === 'CZ');

  /* ── the crown is a cosmetic, and rings are retired (#169, #173) ─────── */
  // devShark's shop is server-owned, so the device-local purchase refuses there.
  // StudyShark's shop is outside issue #169 and keeps the behaviour it had, so
  // the refusal is scoped to the product rather than deleted.
  const retiredShop = readSource(join(process.cwd(), 'client/src/lib/shop.ts'), 'utf8');
  assert.match(
    retiredShop,
    /if \(CURRENT_PRODUCT\.id === 'devshark'\) return 'retired';/,
    "devShark's local ring and flair purchases must be refused",
  );
  const shopEntry = readSource(join(process.cwd(), 'client/src/components/Shop.tsx'), 'utf8');
  assert.match(
    shopEntry,
    /CURRENT_PRODUCT\.id !== 'devshark'\) return <CosmeticShop \/>;/,
    'StudyShark must keep its own shop',
  );
  const avatarSource = readSource(join(process.cwd(), 'client/src/components/ui/LearnerAvatar.tsx'), 'utf8');
  assert.match(avatarSource, /aria-hidden/, 'the crown mark itself is decorative');
  assert.match(avatarSource, /shop\.crown\.wearing/, 'the crown must be named in the accessible label');
  const fulfilmentSource = readSource(join(process.cwd(), 'lib/rewards/fulfillment.ts'), 'utf8');
  // Addresses reach the operator who asked for them, never a log line.
  assert.doesNotMatch(fulfilmentSource, /logEvent\([^)]*address/, 'addresses must never be logged');

  console.log('Launch contracts passed: product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, learner profile, progression graph, Coding tracks, devShark footer, practice sessions, skip feedback, lesson examples, workspace layout, Czech register, merchandise configuration, wallet ledger, payment webhooks, order transitions, and 12-function budget.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
