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
  subjectForCategory,
  subjectForTopic,
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
import { selectPersonalizedReview, selectDueItems, DUE_SHARE } from '../lib/review-selection';
import { aiDailyGenerationLimit, isAiExplanationConfigured } from '../lib/ai-provider';
import { aiFeaturesAllowed, defaultDeploymentCategories, validateCategoryScope } from '../lib/product-scope';
import { playable as playableCodingTask, CODING_TASKS } from '../lib/coding/catalog';
import { codingTaskById, levelCodingTasks } from '../lib/coding/active';
import { solutionFor } from '../lib/coding/solutions';
import { gradeDesign, prepareDesign, codeOutcome, giveUpAfter, ladderLength } from '../lib/coding/grade';
import { runInSandbox } from '../lib/coding/sandbox';
import { runReactSuite } from '../lib/coding/react-runner';
import { decodeCodingSession, encodeCodingSession, decodeGithubConnectState, encodeGithubConnectState } from '../lib/quiz-tokens';
import { decodeLearningPathSession, encodeLearningPathSession } from '../lib/quiz-tokens';
import { LEARNING_PATHS, publicManifest, pathEnabledInEnv, availabilityFor } from '../lib/learning-paths/catalog';
import { contentVersion, contentHash, translationHash, itemReview, codingTaskReview, questionEligibility, isAuditedCategory } from '../lib/curation';
import { AUDITED_CATEGORIES, REVIEW_REGISTRY } from '../lib/curation-registry';
import { readLedger, registryFromLedger, renderCurationRegistry, REGISTRY_PATH } from './build-curation-registry';
import { applyEligibility, getEffectiveQuestions } from '../lib/questions-store';
import { buildLiveTopic, liveAvailability, MIN_LEVEL_QUESTIONS, unavailablePartsOf, partRanges as roadmapPartRanges } from '../lib/roadmap';
import { isSegmentCleared, firstUnfinishedLevel, isCheckpointUnlocked, partRanges } from '../shared/progression';
import { eligibilityFrom, registryEntryConsistent, type RegistryEntry } from '../shared/curation';
import submitHandler from '../api/quiz/submit';
import { encodePlacementRun } from '../lib/quiz-tokens';
import {
  itemClaim,
  publicItemReview,
  reviewStatusFor,
  summarizeCoverage,
  coverageClaim,
  passesBothGates,
  RELEVANCE_MARKERS,
  RELEVANCE_MAX,
  RELEVANCE_MIN,
  QUALITY_MAX,
  QUALITY_MIN,
  MARKER_MAX,
  type ReviewRecord,
} from '../shared/curation';
import { createHash } from 'node:crypto';
import {
  CONCEPT_IDS,
  areContrastable,
  conceptById,
  conceptOf,
  validateConcepts,
} from '../shared/concepts';
import {
  DEFAULT_INTERVAL_HOURS,
  RELEARN_HOURS,
  RETRIEVAL_KINDS,
  dueConcepts,
  nextReviewState,
  sessionSize,
} from '../shared/spaced-practice';
import { arrangePractice, arrangementProblems } from '../shared/interleave';
import { questions } from '../lib/quiz-data';
import { LESSON_FIGURES, figuresFor, visibleFigures, validateFigures } from '../shared/lesson-figures';
import { FAILURE_CATEGORIES, classifyFailure, failureHint } from '../shared/coding-failure';
import { RETIRED_TOPIC_IDS, retirementOf } from '../shared/retired-content';
import { GLOSSARY, termsIn } from '../shared/glossary';
import {
  DEFAULT_MERCH_SETTINGS,
  MERCH_SKUS,
  merchAvailability,
  merchMarginMinor,
  tokensForVerifiedXp,
  validateAddress,
} from '../shared/rewards';
import { normalizeSettings } from '../lib/settings-store';
import { taskResources, CODING_DOC_LINKS } from '../shared/coding-docs';
import {
  everyPlanHasAFirstStep,
  stepAlreadyPassed,
  WEBDEV_PLAN_STAGES,
  isLevelUnlocked,
  isTopicInPlan,
  planTopics,
  validateProgressionGraph,
  WEBDEV_PLAN_STAGES,
} from '../shared/progression';
import {
  isLearnerProfileComplete,
  missingProfileFields,
  parseLearnerProfile,
  profileFromPreference,
  type BaseTrack,
} from '../shared/learning-paths';
import { gradeCheck } from '../lib/learning-paths/grade';
import {
  LEARNING_PATH_IDS,
  ROLE_SPECIALIZATION_IDS,
  isRoleSpecializationId,
  parseLearningPreference,
  pathGuidedComplete,
  pathInventory,
} from '../shared/learning-paths';
import { gardenPathFor, tierUnlocked, eligibleCodingBadges, CODING_TASK_XP, CODING_BADGE_IDS, formatOf, isCodingSectionTrack } from '../shared/coding-catalog';
import { CODING_BADGES } from '../shared/badges';
import { CODING_INDEX } from '../shared/coding-index';
import { inspectQuestionQuality } from '../lib/question-quality';
import { assessmentUnlocks, roadmapEndedOnHearts, ROADMAP_MAX_HEARTS } from '../shared/assessment';
import { grantedTopicsFor, withGrantedTopics } from '../lib/topic-grants';
import { ROADMAP_TOPICS, isRoadmapTopic, topicLevelCount, ROADMAP_LEVELS } from '../lib/roadmap';
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

/** Corrupt a sealed token in a way that always changes its authentication tag,
 * so a "must fail closed" assertion cannot pass or fail by luck. */
function tamperToken(token: string): string {
  const tail = token.slice(-4);
  return token.slice(0, -4) + (tail === 'AAAA' ? 'BBBB' : 'AAAA');
}

/* ── the content-audit gate (#176) ────────────────────────────────────────
 *
 * Every rule here is one the audit's retirement policy depends on: the two
 * gates never stand in for each other, a record applies only to the exact
 * content it was made about, a withheld item is absent from every selector
 * at once, a retired item leaves a level thin or unavailable rather than
 * sliding its neighbours across titles, the unlock rules step over what
 * cannot be opened, and an answer to a retired item is void. */
async function auditGateContracts() {
  const markers = (n: number) => ({ presentDay: Math.min(2, n), practicalUtility: Math.min(2, Math.max(0, n - 2)), transferable: Math.min(2, Math.max(0, n - 4)), audienceFit: Math.min(2, Math.max(0, n - 6)), riskOutcome: Math.min(2, Math.max(0, n - 8)) });
  const dims = (floor: number) => ({ topicRelevance: 5, learningValue: 5, technicalCorrectness: 5, wording: 5, answerOptions: 5, hint: floor, explanation: 5 });
  const entry = (over: Partial<RegistryEntry> = {}): RegistryEntry => ({
    id: 'rm-js-1', kind: 'question', hash: 'h1', cs: 'c1',
    relevance: 8, quality: 4, markers: markers(8), dimensions: dims(4),
    decision: 'retain', reviewedAt: '2026-09-09', revision: 1, ...over,
  });

  // The boundaries the audit names, one by one.
  assert.equal(eligibilityFrom(entry(), 'h1', 'c1', true).active, true, 'a current passing record is served');
  assert.equal(eligibilityFrom(entry({ relevance: 3, markers: markers(3) }), 'h1', 'c1', true).reason, 'failed-gate', 'relevance 3 retires');
  assert.equal(eligibilityFrom(entry({ relevance: 4, markers: markers(4) }), 'h1', 'c1', true).active, true, 'relevance 4 alone does not retire');
  assert.equal(eligibilityFrom(entry({ relevance: 4, markers: markers(4), quality: 2, dimensions: dims(2) }), 'h1', 'c1', true).reason, 'failed-gate', 'relevance 4 with quality 2 still retires');
  assert.equal(eligibilityFrom(entry({ relevance: 10, markers: markers(10), quality: 2, dimensions: dims(2) }), 'h1', 'c1', true).reason, 'failed-gate', 'relevance 10 with a wrong key (quality capped at 2) still retires');
  assert.equal(eligibilityFrom(entry({ decision: 'retire' }), 'h1', 'c1', true).reason, 'retired', 'a retire decision withholds whatever the scores say');
  assert.equal(eligibilityFrom(entry({ decision: 'quarantine' }), 'h1', 'c1', true).reason, 'quarantined', 'unverified correctness is held, not passed');
  assert.equal(eligibilityFrom(null, 'h1', 'c1', true).reason, 'unreviewed', 'no record means not served');
  assert.equal(eligibilityFrom(entry(), 'h2', 'c1', true).reason, 'superseded', 'a record for other content does not apply — an edit invalidates approval');
  assert.equal(eligibilityFrom(entry({ hash: 'h2', revision: 2 }), 'h2', 'c1', true).active, true, 'a re-reviewed rewrite returns on its new hash');
  assert.equal(eligibilityFrom(entry(), 'h1', 'c2', true).csApproved, false, 'an edited translation is not the reviewed one');
  assert.equal(eligibilityFrom(entry({ cs: null }), 'h1', null, true).csApproved, true, 'no translation to approve');
  assert.equal(eligibilityFrom(entry({ relevance: 9 }), 'h1', 'c1', true).reason, 'invalid-record', 'a row whose totals disagree with its markers is no record at all');
  assert.equal(eligibilityFrom(null, 'h1', 'c1', false).active, true, 'outside the audited scope the gate does not apply');
  assert.equal(registryEntryConsistent(entry({ quality: 5 })), false, 'the quality score must be the floor of its dimensions');

  // The registry is the ledger, exactly.
  const ledger = readLedger();
  assert.equal(
    readFileSync(join(process.cwd(), REGISTRY_PATH), 'utf8'),
    renderCurationRegistry(registryFromLedger(ledger), ledger),
    'lib/curation-registry.ts is stale: run npm run build:curation-registry',
  );
  for (const row of REVIEW_REGISTRY) assert.ok(registryEntryConsistent(row), `registry row ${row.id} is inconsistent`);
  for (const category of AUDITED_CATEGORIES) assert.ok(isAuditedCategory(category), `${category} must resolve to devShark`);

  // Reconciliation: every served item of an audited category has a decision
  // for its exact current content, and every registry row names a real item.
  // The served set is read with the gate applied, so a withheld item is
  // proven absent rather than assumed.
  const served = await getEffectiveQuestions('webdev', true);
  const byId = new Map(REVIEW_REGISTRY.map((row) => [row.id, row]));
  for (const q of served) {
    if (!AUDITED_CATEGORIES.has(q.category)) continue;
    const row = byId.get(q.id);
    assert.ok(row, `${q.id} is served from audited category ${q.category} without a review record`);
    assert.equal(row!.hash, contentHash(q), `${q.id} is served on content its record was not made about`);
    assert.ok(row!.decision === 'retain' || row!.decision === 'rewrite', `${q.id} is served with decision ${row!.decision}`);
    assert.ok(passesBothGates(row!.relevance, row!.quality), `${q.id} is served while failing a gate`);
    if (q.csTranslation) assert.equal(translationHash(q.csTranslation), row!.cs, `${q.id} serves a Czech translation that was not reviewed`);
  }
  const withheldByDecision = REVIEW_REGISTRY.filter((row) => row.decision === 'retire' || row.decision === 'quarantine' || !passesBothGates(row.relevance, row.quality));
  const servedIds = new Set(served.map((q) => q.id));
  for (const row of withheldByDecision) assert.ok(!servedIds.has(row.id), `${row.id} was retired or quarantined and is still served`);

  // The store applies the rule once, to the merged set, so an edit in the
  // override layer supersedes a review with no code path able to forget it.
  const audited = served.find((q) => AUDITED_CATEGORIES.has(q.category));
  if (audited) {
    const edited = { ...audited, explanation: `${audited.explanation} (edited in /dev)` };
    const gated = applyEligibility([audited, edited, { ...audited, id: 'rm-js-never-reviewed' }]);
    assert.deepEqual(gated.list.map((q) => q.id), [audited.id], 'the edited copy and the unreviewed id are withheld');
    assert.equal(gated.withheld.get(audited.id), 'superseded');
    assert.equal(gated.withheld.get('rm-js-never-reviewed'), 'unreviewed');
    const foreignCs = { ...audited, csTranslation: { question: 'Jiná otázka' } };
    assert.equal(applyEligibility([foreignCs]).list[0]?.csTranslation, null, 'an unreviewed translation is dropped, and English served instead');
    assert.equal(questionEligibility(audited).active, true);
  }
  const geography = (await getEffectiveQuestions('geography', false))[0];
  assert.ok(geography, 'StudyShark subjects are unaffected');
  assert.equal(questionEligibility(geography).reason, 'not-in-scope', 'StudyShark subjects are outside the audit and served as before');

  // Levels keep their authored membership. A retired question thins its own
  // level; it never slides a neighbour under another title. Below the floor a
  // level is unavailable, and its part follows when every level in it is.
  const all = new Set(Array.from({ length: 200 }, (_, i) => `rm-js-${i + 1}`));
  const intact = buildLiveTopic('javascript', (id) => all.has(id));
  assert.equal(intact.levels.length, 25);
  assert.ok(intact.levels.every((level) => level.questionCount === 8 && !level.unavailable));
  const thinned = new Set(all);
  for (const n of [9, 10]) thinned.delete(`rm-js-${n}`); // two from level 2
  for (let n = 17; n <= 22; n++) thinned.delete(`rm-js-${n}`); // six from level 3 → two left
  const live = buildLiveTopic('javascript', (id) => thinned.has(id));
  assert.equal(live.levels[1].questionCount, 6, 'level 2 is served with its six survivors');
  assert.deepEqual(live.levelIds[1], ['rm-js-11', 'rm-js-12', 'rm-js-13', 'rm-js-14', 'rm-js-15', 'rm-js-16'], 'the survivors are level 2 questions, not level 3 ones pulled forward');
  assert.equal(live.levels[2].unavailable, true, `fewer than ${MIN_LEVEL_QUESTIONS} survivors makes a level unavailable`);
  assert.deepEqual(live.levelIds[2], [], 'an unavailable level contributes nothing to a test');
  assert.equal(live.levels[3].questionCount, 8, 'level 4 is untouched');
  assert.equal(live.levels.length, 25, 'the topic keeps its length');
  assert.deepEqual([...live.unavailableLevels], [3]);
  assert.deepEqual([...live.unavailableParts], [], 'a part with any available level is available');
  assert.deepEqual(unavailablePartsOf(live.levels), []);
  const emptyPart = buildLiveTopic('javascript', (id) => { const n = Number(id.slice(6)); return n > 72; }); // levels 1–9 gone: part 1 empty
  assert.deepEqual([...emptyPart.unavailableParts], [1], 'a part with no available level is unavailable');
  assert.deepEqual(roadmapPartRanges(25).map((r) => r.size), [9, 8, 8]);

  // The unlock rules follow the parts the learner actually meets, and step
  // over what cannot be opened. Level 6 of a 25-level topic needs level 5,
  // not a checkpoint that is recorded only after level 9.
  const availability = liveAvailability(live);
  const passed = (...levels: number[]) => ({ javascript: { levels: Object.fromEntries(levels.map((l) => [String(l), { passed: true }])) } });
  assert.equal(isLevelUnlocked(passed(1, 2, 3, 4, 5), 'javascript', 6, { levelCount: 25 }), true, 'level 6 needs level 5 on a 25-level topic');
  assert.equal(isLevelUnlocked(passed(1, 2, 3, 4, 5, 6, 7, 8, 9), 'javascript', 10, { levelCount: 25 }), false, 'level 10 opens part 2 and needs the part-1 test');
  assert.equal(isLevelUnlocked({ javascript: { levels: passed(1, 2, 3, 4, 5, 6, 7, 8, 9).javascript.levels, checkpoints: { '1': { passed: true } } } }, 'javascript', 10, { levelCount: 25 }), true);
  assert.equal(isLevelUnlocked(passed(1, 2), 'javascript', 3, availability), false, 'an unavailable level cannot be opened');
  assert.equal(isLevelUnlocked(passed(1, 2), 'javascript', 4, availability), true, 'the level after an unavailable one opens on the nearest available level');
  assert.equal(firstUnfinishedLevel(passed(1, 2), 'javascript', availability), 4, 'the next step skips an unavailable level');
  assert.equal(isCheckpointUnlocked(passed(1, 2, 4, 5, 6, 7, 8), 'javascript', 1, availability), false, 'a part test needs its last available level');
  assert.equal(isCheckpointUnlocked(passed(1, 2, 4, 5, 6, 7, 8, 9), 'javascript', 1, availability), true);
  const emptyAvailability = liveAvailability(emptyPart);
  assert.equal(isSegmentCleared({}, 'javascript', 1, emptyAvailability), true, 'an empty part is cleared, not a dead end');
  assert.equal(isLevelUnlocked({}, 'javascript', 10, emptyAvailability), true, 'the next part opens past an empty one');
  assert.equal(partRanges(6).map((r) => r.size).join(','), '2,2,2');

  // An answer to a question that is no longer served is void: neither for nor
  // against, no proof minted, and reported so the result screen can say why.
  const sample = geography;
  const session = encodeSession(
    [{ questionId: sample.id, correctAnswer: 1 }, { questionId: 'retired-while-open', correctAnswer: 2 }],
    { subject: 'geography' },
  );
  const submitRes = mockResponse();
  await submitHandler({ method: 'POST', headers: {}, query: {}, body: { sessionId: session, answers: { [sample.id]: 1, 'retired-while-open': 2 } } } as never, submitRes as never);
  assert.equal(submitRes.statusCode, 200, JSON.stringify(submitRes.body));
  const graded = submitRes.body as { totalQuestions: number; correctAnswers: number; voided?: string[]; results: { questionId: string }[] };
  assert.deepEqual(graded.voided, ['retired-while-open']);
  assert.equal(graded.totalQuestions, 1, 'the void item is left out of the total');
  assert.equal(graded.correctAnswers, 1, 'the served item still counts');
  assert.ok(graded.results.every((r) => r.questionId !== 'retired-while-open'), 'no proof is minted for a void item');

  // A placement round voids a retired item and tops the run up instead of
  // ending it short of the budget.
  const pool = (await getEffectiveQuestions('geography', false)).slice(0, 3);
  const placementToken = encodePlacementRun({
    subject: 'geography', attemptId: 'placement-void-contract-1234', round: 1, difficulty: 3, history: [],
    items: [
      { questionId: pool[0].id, correctAnswer: 0, category: pool[0].category },
      { questionId: 'retired-while-open', correctAnswer: 0, category: pool[0].category },
    ],
  });
  const roundRes = mockResponse();
  await roadmapHandler({ method: 'POST', headers: {}, query: { resource: 'placement' }, body: { placementToken, answers: { [pool[0].id]: 0, 'retired-while-open': 0 } } } as never, roundRes as never);
  assert.equal(roundRes.statusCode, 200, JSON.stringify(roundRes.body));
  const round = roundRes.body as { done: boolean; voided?: number; lastRoundSize?: number; lastRoundCorrect?: number; asked?: number };
  assert.equal(round.done, false);
  assert.equal(round.voided, 1, 'the retired item is reported as void');
  assert.equal(round.lastRoundSize, 1, 'the void item does not count in the round');
  assert.equal(round.lastRoundCorrect, 1);
  assert.equal(round.asked, 1, 'the run continues from what was actually graded');
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
  // Tamper the last FOUR characters, not the last one. A 16-byte GCM tag is
  // 128 bits, which is not a multiple of 6, so the final base64url character
  // carries only 2 significant bits and 4 ignored ones — its value is always
  // A, Q, g or w. Flipping just that character changes nothing about a quarter
  // of the time, and the assertion then fails for no security reason.
  assert.equal(decodeCodingSession(tamperToken(codingSession)), null, 'tampered coding session must fail closed');
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

  // A repair task is a format a learner chooses, never a gate they must pass.
  // It carries a `level` so it sorts into the Coding ladder, and the level quota
  // takes the first N in catalogue order — so without this, adding a repair task
  // silently REPLACES the implementation task its level was asking for. That is
  // exactly what happened when they were added: javascript level 3 (quota 1)
  // swapped js-fizz-values for js-debug-average, and level 10 dropped
  // js-activate-user.
  for (const codeTopic of ['javascript', 'typescript', 'react'] as const) {
    for (let level = 1; level <= ROADMAP_LEVELS; level++) {
      for (const task of levelCodingTasks(codeTopic, level)) {
        assert.notEqual(
          formatOf(task),
          'debug',
          `${codeTopic} level ${level} must not gate on the repair task ${task.id}`,
        );
      }
    }
  }
  // And the fix must not be to delete them: they still exist and stay reachable
  // through the Coding section, which is what made debugging discoverable.
  const repairTasks = CODING_TASKS.filter((task) => formatOf(task) === 'debug');
  assert.ok(repairTasks.length >= 4, 'the authored repair tasks are still in the catalogue');
  assert.ok(
    repairTasks.every((task) => isCodingSectionTrack(task.track)),
    'every repair task stays reachable in the Coding section',
  );
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

  /* ── learning paths ─────────────────────────────────────────────────── */
  // FDE is the only role specialization; DSA Foundations is a skill path and
  // must never become a fourth base track or a second role.
  assert.deepEqual([...ROLE_SPECIALIZATION_IDS], ['fde'], 'FDE must remain the only role specialization');
  assert.deepEqual([...LEARNING_PATH_IDS], ['fde', 'dsa-foundations']);
  assert.ok(!isRoleSpecializationId('dsa-foundations'), 'DSA Foundations is not a role');
  const dsaPath = LEARNING_PATHS.find((path) => path.id === 'dsa-foundations');
  const fdePath = LEARNING_PATHS.find((path) => path.id === 'fde');
  assert.ok(dsaPath && fdePath, 'both learning paths must be published');
  assert.equal(dsaPath!.kind, 'skill_path');
  assert.equal(fdePath!.kind, 'role_specialization');

  // A path opens only when the deployment switch is on, the content validates
  // and the storage is installed. Each is checked separately so an operator
  // can tell a half-written curriculum from a closed one.
  assert.equal(pathEnabledInEnv('fde', {}), false, 'a path is off unless the deployment says otherwise');
  assert.equal(pathEnabledInEnv('fde', { LEARNING_PATH_FDE_ENABLED: 'true' }), true);
  assert.equal(pathEnabledInEnv('dsa-foundations', { LEARNING_PATH_FDE_ENABLED: 'true' }), false,
    'the two paths have independent switches, so either can launch alone');
  assert.equal(availabilityFor({ path: dsaPath!, enabled: false, storageInstalled: true }), 'disabled');
  assert.equal(availabilityFor({ path: dsaPath!, enabled: true, storageInstalled: false }), 'storage_missing');

  // The published manifest is answer-free. Every option a learner might be
  // shown arrives shuffled with the key sealed in the attempt session, so the
  // manifest must not contain the correct option text or its explanation.
  for (const path of LEARNING_PATHS) {
    const manifestJson = JSON.stringify(publicManifest(path));
    assert.doesNotMatch(manifestJson, /"correct"\s*:/, `${path.id}: the manifest carries a correct index`);
    assert.doesNotMatch(manifestJson, /"harness"\s*:/, `${path.id}: the manifest carries a grading harness`);
    for (const module of path.modules) {
      for (const activity of module.activities) {
        for (const question of activity.questions ?? []) {
          assert.ok(!manifestJson.includes(question.explanation.en), `${question.id}: explanation leaked into the manifest`);
        }
      }
    }
    // No path awards XP in v1, so no manifest may name one.
    assert.doesNotMatch(manifestJson, /"xp"/i, `${path.id}: a learning path awards no XP in v1`);
  }

  // An objective check cannot be passed without the sealed key, which is what
  // stops a forged or replayed session from minting a verified pass.
  const checkActivity = LEARNING_PATHS
    .flatMap((path) => path.modules.flatMap((module) => module.activities))
    .find((activity) => activity.kind === 'check' && (activity.questions?.length ?? 0) > 0);
  assert.ok(checkActivity, 'at least one objective check must exist');
  const checkKey = checkActivity!.questions!.map((question) => question.correct);
  assert.equal(gradeCheck(checkActivity!, checkKey, checkKey).state, 'verified_pass');
  assert.notEqual(gradeCheck(checkActivity!, undefined, checkKey).state, 'verified_pass',
    'a check graded without a sealed key must never pass');

  // A path with unmet requirements is not complete, and an optional
  // placement module never counts toward completion.
  assert.equal(pathGuidedComplete(publicManifest(dsaPath!), new Map()), false);
  const dsaInventory = pathInventory(publicManifest(dsaPath!));
  assert.ok(dsaInventory.modules > 0, 'DSA Foundations must publish required modules');

  // The account preference is validated on read: a malformed record degrades
  // to null rather than blocking a learner or granting a role.
  assert.equal(parseLearningPreference({ schemaVersion: 1, baseTrack: 'frontend', specialization: null })?.baseTrack, 'frontend');
  assert.equal(parseLearningPreference({ schemaVersion: 1, baseTrack: 'wizard', specialization: null }), null,
    'an unrecognised base track makes the preference unusable');
  assert.equal(parseLearningPreference({ schemaVersion: 2, baseTrack: 'frontend' }), null,
    'a future schema version is not guessed at');
  // A bad specialization costs the specialization, not the track: the learner
  // keeps the career choice they made instead of being sent back to the picker.
  const salvaged = parseLearningPreference({ schemaVersion: 1, baseTrack: 'frontend', specialization: 'dsa-foundations' });
  assert.equal(salvaged?.baseTrack, 'frontend', 'a valid base track survives a bad specialization');
  assert.equal(salvaged?.specialization, null, 'DSA Foundations can never be stored as a role specialization');

  // The attempt session binds owner, enrollment, activity, purpose and both
  // versions, so a submit handler never has to trust any of them from the body.
  const pathSession = encodeLearningPathSession({
    attemptId: 'attempt-0123456789abcd',
    enrollmentId: 'enroll-0123456789abcd',
    userId: 'user-0001-abcdef',
    pathId: 'dsa-foundations',
    activityId: 'dsa-v1-d01-checks',
    activityKind: 'check',
    purpose: 'exercise',
    curriculumVersion: 1,
    rubricVersion: 1,
    answerKey: [2, 0, 1, 3],
  });
  const decodedPath = decodeLearningPathSession(pathSession.token);
  assert.equal(decodedPath?.userId, 'user-0001-abcdef');
  assert.deepEqual(decodedPath?.answerKey, [2, 0, 1, 3]);
  assert.equal(decodeLearningPathSession('v2.not.a.token'), null);
  assert.equal(decodeLearningPathSession(tamperToken(pathSession.token)), null,
    'a tampered attempt session must not decode');

  const paths026 = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-026.sql'), 'utf8');
  for (const table of ['learning_path_enrollments', 'learning_path_attempts', 'learning_path_evidence', 'learning_path_progress', 'learning_path_drafts']) {
    assert.match(paths026, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`), `migration 026 must create ${table}`);
    assert.match(paths026, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`), `${table} needs RLS`);
  }
  for (const fn of ['upsert_learning_path_enrollment', 'open_learning_path_attempt', 'accept_learning_path_result', 'save_learning_path_draft', 'delete_learning_path_data', 'delete_user_data', 'purge_expired_learning_data']) {
    assert.match(paths026, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(`), `migration 026 must define ${fn}`);
    assert.match(paths026, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(`), `${fn} must be service-role only`);
  }
  // learning_path_attempts holds grading material. Owning the row is not a
  // reason to read it, so it must have RLS on and no SELECT policy or grant.
  assert.doesNotMatch(paths026, /CREATE POLICY "learning_path_attempts_select_own"/,
    'learning_path_attempts must not expose grading material to its owner');
  assert.doesNotMatch(paths026, /GRANT SELECT ON public\.learning_path_attempts/,
    'learning_path_attempts must not be granted to a browser role');
  for (const table of ['learning_path_enrollments', 'learning_path_evidence', 'learning_path_progress', 'learning_path_drafts']) {
    assert.match(paths026, new RegExp(`GRANT SELECT ON public\\.${table} TO authenticated`), `${table} owner reads need the grant as well as the policy`);
  }
  assert.match(paths026, /user_id = \(SELECT auth\.uid\(\)\)::text/, 'owner policies must compare against the verified caller');
  for (const table of ['learning_path_drafts', 'learning_path_progress', 'learning_path_evidence', 'learning_path_attempts', 'learning_path_enrollments']) {
    assert.match(paths026, new RegExp(`DELETE FROM public\\.${table} WHERE user_id = p_user_id`), `account deletion must reach ${table}`);
  }
  // A learning path awards no XP in v1: none of its write paths may touch the
  // XP ledger or coding progress, so a task reused from the coding catalogue is
  // never paid twice. Scoped to the learning-path functions — account erasure
  // further down the file deletes XP and coding rows, and must keep doing so.
  const pathWritePaths = paths026.slice(0, paths026.indexOf('CREATE OR REPLACE FUNCTION public.delete_user_data'));
  assert.ok(pathWritePaths.length > 1000, 'expected the learning-path functions before delete_user_data');
  assert.doesNotMatch(pathWritePaths, /record_verified_activity_xp/, 'no learning path awards XP in v1');
  assert.doesNotMatch(pathWritePaths, /public\.user_xp/, 'no learning path writes the XP table');
  assert.doesNotMatch(pathWritePaths, /public\.coding_progress/, 'a path pass must not write ordinary coding progress');
  // Account erasure still reaches the older tables it always did.
  assert.match(paths026, /DELETE FROM public\.user_xp WHERE user_id = p_user_id/);
  assert.match(paths026, /DELETE FROM public\.coding_progress WHERE user_id = p_user_id/);

  // Reference solutions and hidden tests never ship: nothing under client/
  // may import lib/coding, and the catalogue keeps solutions in their own module.
  const clientFiles = readdirSync(join(process.cwd(), 'client', 'src'), { recursive: true }) as string[];
  for (const file of clientFiles) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = readFileSync(join(process.cwd(), 'client', 'src', file), 'utf8');
    assert.doesNotMatch(text, /lib\/coding/, `client/src/${file} must not import lib/coding`);
    assert.doesNotMatch(text, /lib\/learning-paths/, `client/src/${file} must not import lib/learning-paths`);
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
      assert.doesNotMatch(readFileSync(join(sandboxDir, file), 'utf8'), /lib\/coding/, `client/sandbox/${file} must not import lib/coding`);
    }
  }
  const catalogSource = readFileSync(join(process.cwd(), 'lib/coding/catalog.ts'), 'utf8');
  assert.doesNotMatch(catalogSource, /from '\.\/solutions/, 'the catalogue loader must not import the solutions');
  const pathCatalogSource = readFileSync(join(process.cwd(), 'lib/learning-paths/catalog.ts'), 'utf8');
  assert.doesNotMatch(pathCatalogSource, /from '\.\/solutions/, 'the learning-path catalogue must not import the solutions');
  for (const key of ['codingRun', 'codingDraft', 'codingReveal', 'githubConnect', 'githubSync',
                     'learningPathStart', 'learningPathSubmit', 'learningPathDraft', 'learningPathEnroll']) {
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

  // ── progression graph (#152) ────────────────────────────────────────────
  // A curriculum edit that strands a learner — a cycle, a prerequisite on a
  // topic that no longer exists, a plan whose first stage nothing can open —
  // fails here rather than in front of the learner.
  const graphProblems = validateProgressionGraph(ROADMAP_TOPICS);
  assert.deepEqual(
    graphProblems,
    [],
    `progression graph must be complete, acyclic and reachable: ${JSON.stringify(graphProblems)}`,
  );
  assert.deepEqual(everyPlanHasAFirstStep(), [], 'every plan needs a first step a new learner can take');

  // Every deployable devShark topic must be in at least one base track's plan.
  // A topic that is in none is authored content no learner can reach: `ai` was
  // exactly that — twenty levels and a hundred and sixty questions, present only
  // in the FDE bridge, so every learner who did not take the specialisation was
  // refused it as "not in your plan".
  {
    const withTrack = (baseTrack: string) => ({
      schemaVersion: 2, baseTrack, specialization: null, skillPaths: [],
      goals: ['job'], experience: 'some', studyTime: 15,
    } as unknown as Parameters<typeof isTopicInPlan>[0]);
    const tracks = Object.keys(WEBDEV_PLAN_STAGES);
    const stranded = [...SUBJECT_SCOPE_CATALOG.webdev.topics].filter(
      (topic) => !tracks.some((track) => isTopicInPlan(withTrack(track), 'webdev', topic)),
    );
    assert.deepEqual(stranded, [], `every deployable topic needs a base track that plans it: ${stranded.join(', ')}`);
  }

  // Editing a plan narrows what is offered next; it never withdraws what was
  // earned. A learner who passed Next.js levels on the frontend track and then
  // moved to backend — where Next.js is not in the plan — must still be able to
  // open the levels they already passed.
  {
    const backend = {
      schemaVersion: 2, baseTrack: 'backend', specialization: null, skillPaths: [],
      goals: ['job'], experience: 'some', studyTime: 15,
    } as unknown as Parameters<typeof isTopicInPlan>[0];
    assert.equal(isTopicInPlan(backend, 'webdev', 'nextjs'), false, 'the premise: backend does not plan nextjs');
    const passedNext = { nextjs: { levels: { '1': { passed: true }, '2': { passed: true } } } };
    // The carve-out stepRefusal applies before the plan check.
    assert.equal(stepAlreadyPassed(passedNext, 'nextjs', { kind: 'level', level: 2 }), true,
      'a level already passed is served whatever the plan now says');
    assert.equal(stepAlreadyPassed(passedNext, 'nextjs', { kind: 'level', level: 3 }), false,
      'a level never passed is still gated by the plan and its prerequisites');
    const passedCheckpoint = { nextjs: { checkpoints: { '1': { passed: true } } } };
    assert.equal(stepAlreadyPassed(passedCheckpoint, 'nextjs', { kind: 'checkpoint', checkpoint: 1 }), true);
    assert.equal(stepAlreadyPassed(passedCheckpoint, 'nextjs', { kind: 'checkpoint', checkpoint: 2 }), false);
    // A part test is gated by the levels it spans, not by a record of sitting
    // it, so it never takes the carve-out.
    assert.equal(stepAlreadyPassed(passedNext, 'nextjs', { kind: 'test', from: 1, to: 2 }), false,
      'a part test is never "already passed"');
  }

  // No plan may be empty, and every plan topic must belong to devShark.
  for (const track of Object.keys(WEBDEV_PLAN_STAGES) as BaseTrack[]) {
    const profile = {
      schemaVersion: 2 as const,
      baseTrack: track,
      specialization: null,
      skillPaths: [],
      goals: ['level-up' as const],
      experience: 'some' as const,
      studyTime: '15-30' as const,
      updatedAt: null,
    };
    assert.ok(planTopics(profile).length > 0, `${track} plan must contain topics`);
    assert.equal(isLearnerProfileComplete(profile), true, 'a fully answered profile is complete');
    // A plan excludes what the learner did not choose, and StudyShark, which
    // has no plans, keeps everything its subjects own.
    assert.equal(isTopicInPlan(profile, 'webdev', 'chess-history'), false);
    assert.equal(isTopicInPlan(profile, 'geography', 'continents'), true);
  }

  // Experience is advisory: the most experienced answer opens nothing.
  const senior = {
    schemaVersion: 2 as const,
    baseTrack: 'fullstack' as const,
    specialization: null,
    skillPaths: [],
    goals: ['interview-prep' as const],
    experience: 'professional' as const,
    studyTime: '60-plus' as const,
    updatedAt: null,
  };
  assert.equal(isLevelUnlocked({}, 'javascript', 2), false, 'level 2 needs level 1, whatever the learner reports');
  assert.equal(isLevelUnlocked({}, 'javascript', 1), true);
  assert.equal(isLevelUnlocked({ javascript: { levels: { '1': { passed: true } } } }, 'javascript', 2), true);
  assert.equal(isLevelUnlocked({ javascript: { levels: { '5': { passed: true } } } }, 'javascript', 6), false,
    'a new segment needs its checkpoint, not just the level before it');
  assert.ok(planTopics(senior).includes('javascript'));

  // A profile that fails to parse asks for what is missing instead of
  // inventing answers, and never reads as complete.
  const partial = parseLearnerProfile({ schemaVersion: 2, baseTrack: 'frontend', goals: ['nope'] });
  assert.ok(partial);
  assert.equal(isLearnerProfileComplete(partial), false);
  assert.deepEqual(missingProfileFields(partial).sort(), ['experience', 'goals', 'studyTime']);
  assert.equal(parseLearnerProfile({ schemaVersion: 2, baseTrack: 'nope' }), null);
  const fromV1 = profileFromPreference({ schemaVersion: 1, baseTrack: 'backend', specialization: 'fde' });
  assert.equal(fromV1?.baseTrack, 'backend');
  assert.equal(fromV1?.specialization, 'fde');
  assert.equal(isLearnerProfileComplete(fromV1), false, 'a v1 preference still owes the newer answers');

  // ── retired sections and the glossary (#177, #178, #179) ───────────────
  // A retired section leaves the topic list and stays in the category list:
  // nothing serves it, and every historical row still resolves to devShark.
  for (const topic of RETIRED_TOPIC_IDS) {
    assert.ok(!ROADMAP_TOPICS.includes(topic as never), `${topic} must not be a served roadmap topic`);
    assert.equal(subjectForTopic(topic), undefined, `${topic} must not resolve as a topic`);
    assert.equal(subjectForCategory(topic), 'webdev', `${topic} must still resolve as a category for history`);
    assert.ok(retirementOf(topic), `${topic} needs a recorded destination`);
    // Discovery no longer offers it, and an explicit request cannot rebuild
    // the pool either. (This suite runs in the StudyShark scope, where these
    // devShark categories are out of deployment anyway; the retirement check is
    // the one that holds on devShark too.)
    assert.ok(!defaultDeploymentCategories().includes(topic), `${topic} must not be drawn by default`);
    assert.equal(
      validateCategoryScope([topic], { forDelivery: true }).ok,
      false,
      `${topic} must not be requestable for delivery`,
    );
  }
  // The skill-check cannot grant a retired topic, however well the learner did.
  for (const correct of [10, 14, 18, 20]) {
    for (const granted of assessmentUnlocks('webdev', correct)) {
      assert.ok(!RETIRED_TOPIC_IDS.includes(granted), `the skill check must not unlock ${granted}`);
    }
  }

  // The glossary matches on word boundaries and exact case, and never invents
  // an expansion for a name that is not an acronym.
  assert.deepEqual(termsIn('rapid apiary').map((one) => one.term), [], 'lowercase fragments are not terms');
  assert.deepEqual(termsIn('The API returns JSON.').map((one) => one.term), ['API', 'JSON']);
  assert.deepEqual(termsIn('Two APIs disagree.').map((one) => one.term), ['API'], 'a plural still matches');
  const npmEntry = GLOSSARY.find((one) => one.term === 'npm');
  assert.ok(npmEntry && npmEntry.expansion === undefined, 'npm is a name, not initials');
  for (const entry of GLOSSARY) {
    assert.ok(entry.meaning.en.length > 20 && entry.meaning.cs.length > 20, `${entry.term} needs both meanings`);
    assert.ok(entry.domains.length > 0, `${entry.term} must say where it means this`);
    assert.match(entry.reviewed, /^\d{4}-\d{2}-\d{2}$/);
  }

  // ── rewards (#167-#173) ────────────────────────────────────────────────
  // The shop ships unconfigured and cannot be talked into selling anything.
  // Nothing about a reward may reach a learning table, and the separation is
  // asserted here rather than described in a comment.
  const bareMerch = { ...DEFAULT_MERCH_SETTINGS, pricing: {} };
  for (const sku of MERCH_SKUS) {
    assert.equal(
      merchAvailability({ sku, settings: bareMerch }),
      'unconfigured',
      `${sku} must be unconfigured until a real quote is entered`,
    );
  }
  // Enabling the shop does not price anything: an item with no quote stays
  // unconfigured however many switches are flipped.
  assert.equal(
    merchAvailability({ sku: 'mug', settings: { ...bareMerch, enabled: true, testMode: false } }),
    'unconfigured',
  );
  const quoted = {
    ...bareMerch,
    enabled: true,
    pricing: {
      mug: {
        unitCostMinor: 300, printCostMinor: 150, shippingCostMinor: 400, packagingCostMinor: 60,
        priceMinor: 1400, currency: 'CZK', taxIncluded: true, regions: ['CZ'],
        vendor: 'example', effectiveFrom: '2026-09-08',
      },
    },
  };
  assert.equal(merchAvailability({ sku: 'mug', settings: quoted, region: 'CZ', stock: 3 }), 'available');
  assert.equal(merchAvailability({ sku: 'mug', settings: quoted, region: 'DE', stock: 3 }), 'out_of_region');
  assert.equal(merchAvailability({ sku: 'mug', settings: quoted, region: 'CZ', stock: 0 }), 'out_of_stock');
  assert.equal(merchMarginMinor(quoted.pricing.mug), 1400 - 300 - 150 - 400 - 60);

  // A settings blob missing any commercial field is dropped rather than
  // half-applied: half a quote is not a quote.
  const halfQuote = normalizeSettings({
    merch: { enabled: true, pricing: { mug: { priceMinor: 1400, currency: 'CZK' } } },
  });
  assert.equal(halfQuote.merch.pricing.mug, undefined, 'an incomplete quote must not price an item');
  assert.equal(halfQuote.merch.testMode, true, 'test mode stays on unless explicitly turned off');

  // Addresses: bounded, and refused when the obviously required parts are
  // missing, before anything is charged.
  assert.equal(validateAddress({}).ok, false);
  assert.equal(validateAddress({ name: 'A', line1: 'B', city: 'C', postalCode: 'D', country: 'zz' }).ok, true);
  assert.equal(validateAddress({ name: 'A', line1: 'B', city: 'C', postalCode: 'D', country: 'ZZZ' }).ok, false);
  assert.equal(validateAddress({ name: 'x'.repeat(200), line1: 'B', city: 'C', postalCode: 'D', country: 'CZ' }).ok, false);

  // Tokens follow verified XP only, and the rate is the documented one.
  assert.equal(tokensForVerifiedXp(100), 10);
  assert.equal(tokensForVerifiedXp(0), 0);
  assert.equal(tokensForVerifiedXp(-5), 0);

  // ── task resources (#155) ───────────────────────────────────────────────
  // Every documented technique is a real reference page with a title, both
  // blurbs and a review date, and a task lists all of its techniques, not one.
  for (const link of CODING_DOC_LINKS) {
    assert.ok(link.url.startsWith('https://'), `${link.tag} must link over https`);
    assert.ok(link.title.length > 0, `${link.tag} needs the page's title`);
    assert.ok(link.blurb.en.length > 10 && link.blurb.cs.length > 10, `${link.tag} needs both blurbs`);
    assert.match(link.reviewed, /^\d{4}-\d{2}-\d{2}$/, `${link.tag} needs a review date`);
  }
  assert.equal(taskResources(['map', 'filter', 'reduce']).length, 3, 'a task lists every technique it declares');
  assert.deepEqual(taskResources(['not-a-technique']), [], 'an undocumented technique yields an empty panel, not a filler link');

  // ── failure hints (#156) ────────────────────────────────────────────────
  // The classifier sees only the learner's own output and facts about the
  // task's shape, and returns a category name plus authored text. Nothing it
  // returns may contain an input, an expected value or a raw error.
  assert.equal(classifyFailure({ timedOut: true }), 'timeout');
  assert.equal(classifyFailure({ typeErrors: true }), 'types');
  assert.equal(classifyFailure({ threw: true }), 'runtime');
  assert.equal(
    classifyFailure({ results: [{ pass: false, actual: 'undefined' }, { pass: false, actual: 'undefined' }] }),
    'missing-return',
  );
  assert.equal(
    classifyFailure({
      results: [{ pass: false, actual: '"abc"' }],
      expectedKinds: ['array'],
    }),
    'output-shape',
  );
  assert.equal(
    classifyFailure({
      results: [{ pass: true, actual: '2' }, { pass: false, actual: '0' }],
      edge: [false, true],
      expectedKinds: ['number', 'number'],
    }),
    'boundary',
  );
  assert.equal(classifyFailure({ results: [{ pass: false, actual: '3' }], expectedKinds: ['number'] }), 'tests');
  // A declared pitfall is used only when nothing more specific was proven.
  assert.equal(classifyFailure({ results: [{ pass: false, actual: '3' }], pitfall: 'mutation' }), 'mutation');
  assert.equal(classifyFailure({ timedOut: true, pitfall: 'mutation' }), 'timeout');
  // Every category the classifier can return either has curated text or falls
  // through to the ladder; none of that text mentions a value or a test.
  for (const category of FAILURE_CATEGORIES) {
    const hint = failureHint(category, undefined);
    if (!hint) {
      assert.equal(category, 'tests', 'only the generic category may fall through to the hint ladder');
      continue;
    }
    for (const body of [hint.body.en, hint.body.cs]) {
      assert.ok(body.length > 20, `${category} hint must say something`);
      assert.ok(!/expected|hidden test|očekáv|skryt/i.test(body), `${category} hint must not mention expectations or hidden tests`);
    }
  }

  // ── curation claims never outrun their evidence (#181) ─────────────────
  //
  // Every one of these is a sentence the product would otherwise be able to
  // show a learner without anything behind it.
  {
    const sampleQuestion = {
      id: 'rm-js-1',
      tags: ['Roadmap'],
      introduction: '',
      question: 'What does this return?',
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 2,
      category: 'javascript' as const,
      explanation: 'Because.',
      difficulty: 1 as const,
    };

    // The version covers the answer, so editing it invalidates the approval —
    // and the version is keyed, so holding the options does not let anyone
    // recover which one is right by hashing the four candidates.
    const base = contentVersion(sampleQuestion);
    assert.notEqual(base, contentVersion({ ...sampleQuestion, correctAnswer: 0 }));
    assert.notEqual(base, contentVersion({ ...sampleQuestion, explanation: 'Different.' }));
    assert.notEqual(base, contentVersion({ ...sampleQuestion, question: 'What now?' }));
    assert.equal(base, contentVersion({ ...sampleQuestion }), 'the same content must give the same version');
    assert.ok(
      !createHash('sha256')
        .update(JSON.stringify(sampleQuestion))
        .digest('base64url')
        .startsWith(base),
      'the version must not be a plain digest of the content',
    );

    // Nothing is reviewed until a record exists for the exact version.
    assert.equal(itemReview(sampleQuestion).status, 'unreviewed');
    assert.equal(itemClaim(itemReview(sampleQuestion)), 'not-yet-reviewed');
    assert.equal(reviewStatusFor(undefined, base), 'unavailable', 'a metadata failure is not a review');
    assert.equal(itemClaim({ version: base, status: 'unavailable' }), 'none', 'unavailable metadata says nothing');

    const record = (over: Partial<ReviewRecord> = {}): ReviewRecord => ({
      itemId: sampleQuestion.id,
      version: base,
      relevance: 8,
      quality: 5,
      events: [{ kind: 'human', at: '2026-01-02' }],
      ...over,
    });
    assert.equal(reviewStatusFor(record(), base), 'reviewed');
    assert.equal(reviewStatusFor(record(), 'a-different-version'), 'superseded', 'an edit invalidates approval');
    assert.equal(reviewStatusFor(record({ quality: 2 }), base), 'superseded', 'a failed gate is not reviewed');
    assert.equal(reviewStatusFor(record({ relevance: 3 }), base), 'superseded', 'a failed gate is not reviewed');
    assert.equal(itemClaim(publicItemReview(record(), 'a-different-version')), 'not-yet-reviewed');

    // "Reviewed more than once" needs more than one recorded human review, and
    // automated or execution evidence never counts toward it.
    assert.equal(itemClaim(publicItemReview(record(), base)), 'reviewed-once');
    assert.equal(
      itemClaim(publicItemReview(record({ events: [
        { kind: 'human', at: '2026-01-02' },
        { kind: 'automated', at: '2026-02-02' },
        { kind: 'execution', at: '2026-02-02' },
      ] }), base)),
      'reviewed-once',
      'a script running is not a second human review',
    );
    assert.equal(
      itemClaim(publicItemReview(record({ events: [
        { kind: 'human', at: '2026-01-02' },
        { kind: 'human', at: '2026-03-02' },
      ] }), base)),
      'reviewed-repeatedly',
    );

    // Machine evidence stands on its own and is never called a review.
    const codingReview = codingTaskReview(CODING_TASKS[0]);
    assert.equal(codingReview.status, 'unreviewed');
    assert.equal((codingReview.executionChecks ?? 0) > 0, true, 'a proven solution is recorded evidence');
    assert.equal(itemClaim(codingReview), 'checked-automatically');
    assert.ok(codingReview.version.length >= 8, 'a coding task carries a version to report against');

    // The public shape carries no scores unless a current record exists, and
    // never a reviewer, a report or anything resembling an answer.
    const unreviewedShape = Object.keys(itemReview(sampleQuestion));
    for (const key of ['relevance', 'quality', 'reviewedAt', 'humanReviews']) {
      assert.ok(!unreviewedShape.includes(key), `an unreviewed item must not carry ${key}`);
    }
    const reviewedShape = JSON.stringify(publicItemReview(record(), base));
    assert.ok(!/reviewer|report|answer|correct/i.test(reviewedShape), 'review metadata must not name a reviewer or an answer');

    // A bank-wide claim needs every source counted, and no claim at all is the
    // answer to both "nothing reviewed" and "a source we cannot count".
    assert.equal(coverageClaim(summarizeCoverage([{ id: 'bank', items: 100, reviewed: 0 }])), 'none');
    assert.equal(coverageClaim(summarizeCoverage([{ id: 'bank', items: 100, reviewed: 40 }])), 'partial');
    assert.equal(coverageClaim(summarizeCoverage([{ id: 'bank', items: 100, reviewed: 100 }])), 'complete');
    assert.equal(
      coverageClaim(summarizeCoverage([
        { id: 'bank', items: 100, reviewed: 100 },
        { id: 'overrides', items: null, reviewed: null },
      ])),
      'none',
      'one uncountable source means no bank-wide claim',
    );

    // The gates are separate: passing one never stands in for the other.
    assert.equal(passesBothGates(RELEVANCE_MAX, QUALITY_MIN - 1), false);
    assert.equal(passesBothGates(RELEVANCE_MIN - 1, QUALITY_MAX), false);
    assert.equal(passesBothGates(RELEVANCE_MIN, QUALITY_MIN), true);
    assert.equal(RELEVANCE_MARKERS.length * MARKER_MAX, RELEVANCE_MAX, 'five markers of two points make ten');
  }

  // ── concepts, spacing and interleaving (#182, #184) ─────────────────────
  {
    assert.deepEqual(validateConcepts(), [], 'the concept groups must be structurally sound');

    // Every authored concept must actually match questions in the live bank,
    // or it is a group that can never be practised.
    const bankByConcept = new Map<string, number>();
    for (const question of questions) {
      const concept = conceptOf(question);
      if (concept) bankByConcept.set(concept, (bankByConcept.get(concept) ?? 0) + 1);
    }
    for (const id of CONCEPT_IDS) {
      assert.ok((bankByConcept.get(id) ?? 0) > 0, `concept ${id} matches no question in the bank`);
    }
    // And a concept only ever resolves inside its own topic, so a mix can never
    // reach across a product or into a topic the learner has not unlocked.
    for (const question of questions) {
      const concept = conceptOf(question);
      if (!concept) continue;
      assert.equal(conceptById(concept)?.topic, question.category, `${question.id} resolved outside its topic`);
    }

    // Spacing: only independent retrieval lengthens an interval.
    const t0 = Date.UTC(2026, 0, 1);
    const start = { conceptId: 'js-map', stage: 1, dueAt: null, streak: 1, lastItemId: null };
    const hours = (state: { dueAt: string | null }) =>
      state.dueAt ? Math.round((Date.parse(state.dueAt) - t0) / 3600_000) : null;

    const independent = nextReviewState(start, { conceptId: 'js-map', correct: true, kind: 'independent', itemId: 'a' }, t0);
    assert.equal(independent.stage, 2);
    assert.equal(hours(independent), DEFAULT_INTERVAL_HOURS[2]);
    for (const kind of ['hinted', 'revealed', 'assisted'] as const) {
      const held = nextReviewState(start, { conceptId: 'js-map', correct: true, kind, itemId: 'a' }, t0);
      assert.equal(held.stage, 1, `a ${kind} answer must not climb the ladder`);
      assert.equal(held.streak, 1, `a ${kind} answer must not extend the streak`);
    }
    // Wrong is wrong whatever the kind, and comes back soon rather than never.
    for (const kind of RETRIEVAL_KINDS) {
      const failed = nextReviewState({ ...start, stage: 4 }, { conceptId: 'js-map', correct: false, kind, itemId: 'a' }, t0);
      assert.equal(failed.stage, 0);
      assert.equal(failed.streak, 0);
      assert.equal(hours(failed), RELEARN_HOURS);
    }
    // The ladder is bounded at the top: nothing is pushed past its last rung.
    let climbed = { ...start, stage: 0 };
    for (let i = 0; i < 20; i++) {
      climbed = nextReviewState(climbed, { conceptId: 'js-map', correct: true, kind: 'independent', itemId: `q${i}` }, t0);
    }
    assert.equal(climbed.stage, DEFAULT_INTERVAL_HOURS.length - 1);
    assert.ok(DEFAULT_INTERVAL_HOURS.every((h, i) => i === 0 || h > DEFAULT_INTERVAL_HOURS[i - 1]), 'intervals must lengthen');

    // Due selection: overdue first, capped, and never outside eligibility.
    const states = [
      { conceptId: 'js-map', stage: 1, dueAt: new Date(t0 - 50 * 3600_000).toISOString(), streak: 1, lastItemId: 'x' },
      { conceptId: 'js-filter', stage: 2, dueAt: new Date(t0 - 2 * 3600_000).toISOString(), streak: 2, lastItemId: null },
      { conceptId: 'js-reduce', stage: 0, dueAt: new Date(t0 + 5 * 3600_000).toISOString(), streak: 0, lastItemId: null },
      { conceptId: 'css-grid', stage: 0, dueAt: new Date(t0 - 99 * 3600_000).toISOString(), streak: 0, lastItemId: null },
    ];
    const eligible = (id: string) => conceptById(id)?.topic === 'javascript';
    const due = dueConcepts(states, eligible, t0);
    assert.deepEqual(due.map((one) => one.conceptId), ['js-map', 'js-filter'], 'most overdue first, ineligible excluded');
    assert.equal(dueConcepts(states, eligible, t0, 1).length, 1, 'the cap bounds the queue');
    assert.equal(dueConcepts(states, () => true, t0, 0).length, 0);
    // Nothing due, nothing owed — a fresh learner gets ordinary practice.
    assert.deepEqual(dueConcepts([], () => true, t0), []);

    // A due concept must reach the session, not merely be preferred in a list
    // the ranking is free to re-sort. It was: the handler built a due-first
    // pool and handed it to selectPersonalizedReview, which sorts by its own
    // total order, so the ordering was discarded and a learner told two
    // concepts were due got a session containing neither. The two assertions
    // below are the regression and the fix, side by side.
    {
      const q = (id: string, category: string, tags: string[], importance = 5) =>
        ({
          id, category, tags, difficulty: 2, importance, introduction: '', question: id,
          options: ['a', 'b'], correctAnswer: 0, explanation: '',
        }) as unknown as Question;
      // Two questions per due concept, plus filler the ranking scores higher
      // (weak category, high importance) so preference alone loses.
      const duePool = [
        q('map-1', 'javascript', ['map']), q('map-2', 'javascript', ['map']),
        q('filter-1', 'javascript', ['filter']), q('filter-2', 'javascript', ['filter']),
      ];
      const filler = Array.from({ length: 12 }, (_, i) => q(`filler-${i}`, 'weak', ['Terminology'], 10));
      const dueOrder = ['js-map', 'js-filter'];
      const concept = (question: Question) =>
        question.tags.includes('map') ? 'js-map' : question.tags.includes('filter') ? 'js-filter' : null;
      const dueIdSet = new Set(duePool.map((one) => one.id));

      // The regression: ordering the input does nothing.
      const ordered = selectPersonalizedReview(
        [...duePool, ...filler],
        [{ category: 'weak', total_correct: 0, total_questions: 20 }],
        [],
        10,
        t0,
      );
      assert.equal(
        ordered.questions.filter((one) => dueIdSet.has(one.id)).length,
        0,
        'the ranking discards input order, which is why reserved slots are the only thing that works',
      );

      // The fix: slots are taken out of the count before the ranking runs.
      const count = 10;
      const limit = Math.min(duePool.length, Math.max(0, Math.min(count - 1, Math.round(count * DUE_SHARE))));
      const taken = selectDueItems(duePool, dueOrder, concept, new Set(['map-1']), limit);
      assert.equal(taken.length, 4, 'four due items fill four of the six reserved slots');
      assert.equal(taken[0].id, 'map-2', 'the item just used for a concept goes last within it');
      assert.deepEqual(
        taken.slice(0, 2).map(concept),
        ['js-map', 'js-filter'],
        'round-robin, so several due concepts are covered before any is asked twice',
      );
      assert.equal(new Set(taken.map((one) => one.id)).size, taken.length, 'no item twice');

      const rest = selectPersonalizedReview(
        filler,
        [{ category: 'weak', total_correct: 0, total_questions: 20 }],
        [],
        count - taken.length,
        t0,
      );
      const session = [...taken, ...rest.questions].slice(0, count);
      assert.equal(session.length, count, 'the session is still the size the learner asked for');
      assert.equal(
        session.filter((one) => dueIdSet.has(one.id)).length,
        4,
        'every due item reaches the session',
      );
      assert.ok(session.some((one) => !dueIdSet.has(one.id)), 'a review is never only a drill');

      // One due concept must not take the whole session.
      const oneConcept = selectDueItems(
        [q('map-1', 'javascript', ['map']), q('map-2', 'javascript', ['map'])],
        ['js-map'], concept, new Set(), 6,
      );
      assert.equal(oneConcept.length, 2, 'a concept contributes only the items it has');
      assert.deepEqual(selectDueItems(duePool, dueOrder, concept, new Set(), 0), [], 'no slots, no items');
      assert.deepEqual(selectDueItems([], dueOrder, concept, new Set(), 6), [], 'nothing due, nothing reserved');
    }

    // Hashed asset filenames are what make a long cache safe: a new build is a
    // new URL, so an old URL can be cached forever. Production was serving them
    // `max-age=0, must-revalidate` instead — a round trip per chunk on every
    // visit, for files that cannot change. The entry documents are the opposite
    // case and must stay revalidated, or a deploy would never reach anyone.
    {
      const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
        headers?: { source: string; headers: { key: string; value: string }[] }[];
      };
      const cacheFor = (source: string) =>
        vercel.headers
          ?.find((rule) => rule.source === source)
          ?.headers.find((one) => one.key.toLowerCase() === 'cache-control')?.value ?? null;

      for (const source of ['/assets/(.*)', '/sandbox/assets/(.*)']) {
        const value = cacheFor(source);
        assert.ok(value, `${source} needs a Cache-Control header; hashed files should not be revalidated`);
        assert.match(value!, /immutable/, `${source} serves content-hashed files and should be immutable`);
        assert.match(value!, /max-age=\d{6,}/, `${source} should be cached for a long time, not seconds`);
      }
      // Nothing that serves a document may be immutable.
      for (const rule of vercel.headers ?? []) {
        const value = rule.headers.find((one) => one.key.toLowerCase() === 'cache-control')?.value;
        if (!value || !/immutable/.test(value)) continue;
        assert.ok(
          rule.source.includes('assets/'),
          `${rule.source} is cached immutably but does not look like a hashed-asset path`,
        );
      }
    }

    // The pre-paint bootstrap has to run before anything that can block it.
    // A pending stylesheet suspends every script after it, so a webfont link
    // above this one leaves the page in the default theme until a third-party
    // host answers — verified in a browser: with fonts.googleapis.com
    // unreachable and the link first, the theme was never applied at all.
    {
      const html = readFileSync(join(process.cwd(), 'client', 'index.html'), 'utf8');
      const bootstrap = html.indexOf("devquiz:color-mode");
      assert.ok(bootstrap > 0, 'index.html must set the colour mode before first paint');
      assert.ok(
        html.indexOf('devquiz.lang') > 0,
        'index.html must set the document language before first paint, so a screen reader reads Czech in a Czech voice',
      );
      const firstBlocking = html.search(/<link[^>]+rel="stylesheet"/);
      if (firstBlocking >= 0) {
        assert.ok(
          bootstrap < firstBlocking,
          'the pre-paint bootstrap must come before any stylesheet link; a pending stylesheet blocks every script after it',
        );
      }
    }

    // Interleaving: bounded runs, no duplicates, focused block for new material.
    const item = (id: string, tags: string[], format?: string) =>
      ({ id, category: 'javascript', tags, format });
    const mixable = [
      item('m1', ['map']), item('m2', ['map']), item('m3', ['map']), item('m4', ['map']),
      item('f1', ['filter']), item('f2', ['filter']), item('f3', ['filter']), item('f4', ['filter']),
      item('r1', ['reduce']), item('r2', ['reduce']), item('r3', ['reduce']), item('r4', ['reduce']),
    ];
    const practised = { 'js-map': 9, 'js-filter': 9, 'js-reduce': 9 };
    const arranged = arrangePractice({ items: mixable, practised });
    assert.equal(arranged.items.length, mixable.length, 'every item is placed exactly once');
    assert.deepEqual(arrangementProblems(arranged.items), [], 'no duplicates and no long runs');
    assert.equal(arranged.mixed, true);
    assert.deepEqual(arranged.contrasted, ['js-filter', 'js-map', 'js-reduce']);
    // Deterministic: the same input and seed always give the same order.
    assert.deepEqual(
      arrangePractice({ items: mixable, practised }).items.map((one) => one.id),
      arranged.items.map((one) => one.id),
    );
    // Not so mechanical that the sequence itself is a hint: an A-B-A-B-A-B
    // arrangement of three concepts would never repeat a concept at all.
    const conceptSequence = arranged.items.map((one) => conceptOf(one));
    assert.ok(
      conceptSequence.some((concept, i) => i > 0 && concept === conceptSequence[i - 1]),
      'runs of two are used, so the order is not a strict rotation',
    );

    // A concept the learner has barely met is taught in a block before it is
    // mixed with anything.
    const fresh = arrangePractice({ items: mixable, practised: { 'js-map': 9, 'js-filter': 9, 'js-reduce': 0 } });
    const reduceRun = fresh.items.slice(0, 4).map((one) => conceptOf(one));
    assert.deepEqual(reduceRun, ['js-reduce', 'js-reduce', 'js-reduce', 'js-reduce'], 'new material comes as a block');

    // One eligible concept is ordinary focused practice, not a fake mix.
    const single = arrangePractice({ items: mixable.slice(0, 4), practised });
    assert.equal(single.mixed, false);
    assert.deepEqual(single.contrasted, []);

    // Items with no concept never block a mix and are never dropped.
    const withLoose = arrangePractice({ items: [...mixable, item('x1', ['Hoisting'])], practised });
    assert.equal(withLoose.items.length, mixable.length + 1);
    assert.equal(withLoose.mixed, true);

    // Contrast is only ever within a group: nothing pairs Flexbox with reduce.
    assert.equal(areContrastable('css-flexbox', 'css-grid'), true);
    assert.equal(areContrastable('css-flexbox', 'js-reduce'), false);
    assert.equal(areContrastable('js-map', 'js-map'), false);

    // Session sizing stays inside something a person will finish.
    assert.equal(sessionSize(null), 8);
    assert.ok(sessionSize(5) >= 4 && sessionSize(300) <= 20);
  }

  // ── lesson figures (#183) ───────────────────────────────────────────────
  {
    assert.deepEqual(
      validateFigures((topic) => (isRoadmapTopic(topic) ? topicLevelCount(topic) : 0)),
      [],
      'every figure must name a real level and carry its content in words',
    );
    assert.ok(LESSON_FIGURES.length >= 15, 'the authored coverage should not silently shrink');

    // A figure only reaches a level it was authored for.
    for (const figure of LESSON_FIGURES) {
      assert.ok(
        figuresFor(figure.topic, figure.level, 'after').some((one) => one.id === figure.id),
        `${figure.id} is not returned for its own level`,
      );
      assert.deepEqual(figuresFor(figure.topic, figure.level + 100), [], 'no figure leaks to another level');
    }

    // A figure held until after the assessment is not shown before it. None of
    // the authored figures is marked today, so the rule is exercised against a
    // synthetic one: the mechanism has to work the first time an author uses it.
    const held = { ...LESSON_FIGURES[0], id: 'synthetic-held', afterSubmission: true };
    const pair = [LESSON_FIGURES[0], held];
    assert.deepEqual(
      visibleFigures(pair, 'before').map((one) => one.id),
      [LESSON_FIGURES[0].id],
      'a held figure is not shown before submission',
    );
    assert.deepEqual(visibleFigures(pair, 'after').map((one) => one.id), pair.map((one) => one.id));

    // Figures cover the areas the curriculum actually needs them for, rather
    // than clustering in whichever topic was easiest to author.
    const topics = new Set(LESSON_FIGURES.map((one) => one.topic));
    for (const topic of ['html', 'css', 'javascript', 'react', 'dsa', 'databases', 'general']) {
      assert.ok(topics.has(topic), `no figure covers ${topic}`);
    }
  }

  await auditGateContracts();

  console.log('Launch contracts passed: product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, 12-function budget, the progression graph, failure hints, retired sections, curation claims, the content-audit gate, spaced practice, interleaving, lesson figures, and an unconfigured shop.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
