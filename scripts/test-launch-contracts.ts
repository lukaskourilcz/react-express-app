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
import challengeHandler from '../api/quiz/challenge';
import {
  comboProgressPct,
  nextComboStep,
  replaySprint,
  SPRINT_COMBO_STEPS,
  SPRINT_DURATION_MS,
  SPRINT_MAX_SCORE,
  SPRINT_SUBJECTS,
  SPRINT_WRONG_PENALTY_S,
  type SprintEvent,
} from '../shared/sprint';
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
import {
  generateMoves,
  moveFromUci,
  parseFen,
  perft,
  positionIsPlayable,
  squareName,
  toFen,
  toSan,
  STARTING_FEN,
} from '../shared/chess-position';
import {
  headerMatches,
  parseLichessRow,
  puzzleQuestion,
  puzzleTranslation,
  selectPuzzles,
  tierForRating,
  withoutCheckSuffix,
  PUZZLE_TIERS,
  PUZZLE_TOPICS,
  PUZZLE_TOPIC_THEMES,
} from '../shared/chess-puzzles';
import { renderBank } from './import-lichess-puzzles';
import { buildChessPuzzleBank, chessPuzzleQuestions, chessPuzzleTranslationsCs } from '../lib/chess-puzzle-questions';
import { CHESS_PUZZLE_IMPORT, IMPORTED_CHESS_PUZZLES } from '../lib/chess-puzzle-bank';
import { applyEligibility, getEffectiveQuestions, getQuestionsForHistoryById } from '../lib/questions-store';
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
  PACKAGE_SKUS,
  merchAvailability,
  merchLandedCostMinor,
  merchMarginMinor,
  packageClaimOutcome,
  packageCosting,
  packageMonthlyCeilingMinor,
  packageProgramState,
  packagesRemainingThisMonth,
  tokensForVerifiedXp,
  validateAddress,
  type MerchPricing,
  type MerchSettings,
} from '../shared/rewards';
import { normalizeSettings } from '../lib/settings-store';
import { taskResources, CODING_DOC_LINKS } from '../shared/coding-docs';
import { STREAK_PROTECTION_CAP } from '../shared/rewards';
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
import {
  classifySiteverify,
  isTurnstileConfigured,
  readTurnstileToken,
  refusesRequest,
  requireAttestation,
  turnstileMode,
} from '../lib/turnstile';
import {
  INTEGRITY_SIGNALS,
  INTEGRITY_STATUSES,
  INTEGRITY_SURFACES,
  VELOCITY_RULES,
  evaluateVelocity,
} from '../lib/integrity';

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
  assert.equal(eligibilityFrom(null, 'h1', 'c1', false).active, true, 'outside the audited scope an unreviewed item is served as before');
  assert.equal(eligibilityFrom(null, 'h1', 'c1', false).reason, 'not-in-scope');
  // A recorded decision holds wherever the item lives; the scope only decides
  // what happens to content with no applicable record.
  assert.equal(eligibilityFrom(entry({ decision: 'retire' }), 'h1', 'c1', false).reason, 'retired', 'a retirement recorded for a category still in progress withholds the item now');
  assert.equal(eligibilityFrom(entry({ relevance: 3, markers: markers(3) }), 'h1', 'c1', false).reason, 'failed-gate', 'a failing row withholds outside the scope too');
  assert.equal(eligibilityFrom(entry(), 'h1', 'c1', false).reason, 'reviewed', 'a passing row serves, and claims, outside the scope');
  assert.equal(eligibilityFrom(entry(), 'h1', 'c2', false).csApproved, false, 'a reviewed item outside the scope still drops an unreviewed translation');
  assert.deepEqual(eligibilityFrom(entry(), 'h2', 'c1', false), { active: true, reason: 'not-in-scope', entry: null, csApproved: true }, 'a superseded row outside the scope neither withholds nor claims');
  assert.equal(eligibilityFrom(entry({ relevance: 9 }), 'h1', 'c1', false).active, true, 'a broken row outside the scope is no record, so the item is served as before');
  assert.equal(registryEntryConsistent(entry({ quality: 5 })), false, 'the quality score must be the floor of its dimensions');

  // The registry is the ledger, exactly.
  const ledger = readLedger();
  assert.equal(
    readFileSync(join(process.cwd(), REGISTRY_PATH), 'utf8'),
    renderCurationRegistry(registryFromLedger(ledger), ledger),
    'lib/curation-registry.ts is stale: run npm run build:curation-registry',
  );
  for (const row of REVIEW_REGISTRY) assert.ok(registryEntryConsistent(row), `registry row ${row.id} is inconsistent`);
  // Content this audit rewrote is served only after a second reader checked
  // the rewrite: revision 2 without an accepted verdict is a process failure,
  // not a wording preference.
  for (const item of ledger.items as unknown as { id: string; revision: number; decision: string; verification?: { verdict?: string } }[]) {
    if (item.revision > 1 && (item.decision === 'retain' || item.decision === 'rewrite')) {
      const verdict = item.verification?.verdict;
      assert.ok(verdict === 'accept' || verdict === 'amend', `${item.id} was rewritten and is served without an accepted second reading`);
    }
  }
  for (const category of AUDITED_CATEGORIES) assert.ok(isAuditedCategory(category), `${category} must resolve to devShark`);

  // Reconciliation: every served item of an audited category has a decision
  // for its exact current content, and every registry row names a real item.
  // The served set is read with the gate applied, so a withheld item is
  // proven absent rather than assumed.
  const served = await getEffectiveQuestions('webdev', true);
  const history = await getQuestionsForHistoryById('webdev', true);
  const byId = new Map(REVIEW_REGISTRY.map((row) => [row.id, row]));
  for (const q of served) {
    const row = byId.get(q.id);
    if (!row) {
      assert.ok(!AUDITED_CATEGORIES.has(q.category), `${q.id} is served from audited category ${q.category} without a review record`);
      continue;
    }
    // A served item with a row is served on that row's terms wherever it lives:
    // current content, live decision, both gates, the reviewed translation.
    if (row.hash !== contentHash(q)) {
      assert.ok(!AUDITED_CATEGORIES.has(q.category), `${q.id} is served on content its record was not made about`);
      continue;
    }
    assert.ok(row.decision === 'retain' || row.decision === 'rewrite', `${q.id} is served with decision ${row.decision}`);
    assert.ok(passesBothGates(row.relevance, row.quality), `${q.id} is served while failing a gate`);
    if (q.csTranslation) assert.equal(translationHash(q.csTranslation), row.cs, `${q.id} serves a Czech translation that was not reviewed`);
  }
  const withheldByDecision = REVIEW_REGISTRY.filter((row) => row.decision === 'retire' || row.decision === 'quarantine' || !passesBothGates(row.relevance, row.quality));
  const servedIds = new Set(served.map((q) => q.id));
  for (const row of withheldByDecision) assert.ok(!servedIds.has(row.id), `${row.id} was retired or quarantined and is still served`);
  for (const row of REVIEW_REGISTRY) {
    if (row.kind !== 'question') continue;
    const item = history.get(row.id);
    assert.ok(item, `registry row ${row.id} names no devShark question`);
    if (row.hash === contentHash(item!) && (row.decision === 'retain' || row.decision === 'rewrite') && passesBothGates(row.relevance, row.quality)) {
      assert.ok(servedIds.has(row.id), `${row.id} has a current passing record and is not served`);
    }
  }

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
  // In a category the wave has reached only in part, the recorded decisions
  // hold and everything else is served as before.
  const partial = served.find((q) => !AUDITED_CATEGORIES.has(q.category) && byId.has(q.id));
  if (partial) {
    const edited = { ...partial, explanation: `${partial.explanation} (edited in /dev)` };
    const gated = applyEligibility([partial, edited, { ...partial, id: 'rm-js-never-reviewed' }]);
    assert.deepEqual(gated.list.map((q) => q.id), [partial.id, partial.id, 'rm-js-never-reviewed'], 'outside the completed scope an edit or a missing record serves the item as before');
    assert.equal(questionEligibility(edited).reason, 'not-in-scope');
    assert.equal(questionEligibility(partial).reason, 'reviewed', 'the recorded review still applies to the unedited wording');
    const foreignCs = { ...partial, csTranslation: { question: 'Jiná otázka' } };
    assert.equal(applyEligibility([foreignCs]).list[0]?.csTranslation, null, 'a reviewed item outside the scope still serves only its reviewed translation');
  }
  const retiredRow = REVIEW_REGISTRY.find((row) => row.kind === 'question' && row.decision === 'retire' && !AUDITED_CATEGORIES.has(history.get(row.id)?.category ?? ''));
  if (retiredRow) {
    const item = history.get(retiredRow.id)!;
    assert.equal(questionEligibility(item).reason, retiredRow.hash === contentHash(item) ? 'retired' : 'not-in-scope');
    assert.ok(!servedIds.has(retiredRow.id) || retiredRow.hash !== contentHash(item), `${retiredRow.id} was retired in a category still in progress and is still served`);
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

/* ── the puzzle sprint (#195) ─────────────────────────────────────────────
 *
 * The sprint's whole score is its clock, so every rule here is one that stops
 * the clock from being something the browser can influence: the curve is exact,
 * an answer that lands after time is out is not counted, a run minted in one
 * mode cannot be finished as the other, and the mode earns XP at the same rate
 * as the run it sits beside. */
async function sprintContracts() {
  const start = 1_000_000;
  const correctAt = (id: string, at: number): SprintEvent => ({ questionId: id, isCorrect: true, at });

  // The curve fires at 5, 12, 20 and 30 — and nowhere else. Thirty answers one
  // second apart all land inside the widening window.
  {
    const events = Array.from({ length: 30 }, (_, i) => correctAt(`q${i}`, start + (i + 1) * 1000));
    const replay = replaySprint(start, events);
    assert.equal(replay.score, 30);
    assert.equal(replay.wrong, 0);
    assert.equal(replay.longestCombo, 30);
    assert.equal(replay.bonusMs, (3 + 5 + 7 + 10) * 1000, 'the combo curve adds exactly +3, +5, +7 and +10 seconds');
    assert.equal(replay.deadlineAt, start + SPRINT_DURATION_MS + replay.bonusMs);
    // One fewer answer stops short of the last step, so the last step is not
    // granted early or granted twice.
    const shortOfThirty = replaySprint(start, events.slice(0, 29));
    assert.equal(shortOfThirty.bonusMs, (3 + 5 + 7) * 1000, 'the 30-answer step is granted at 30 and not before');
  }

  // A wrong answer costs ten seconds and empties the combo. It does not touch
  // the score already earned, and the curve can be earned again from zero.
  {
    const events: SprintEvent[] = [
      ...Array.from({ length: 5 }, (_, i) => correctAt(`a${i}`, start + (i + 1) * 1000)),
      { questionId: 'miss', isCorrect: false, at: start + 6000 },
      ...Array.from({ length: 5 }, (_, i) => correctAt(`b${i}`, start + 7000 + i * 1000)),
    ];
    const replay = replaySprint(start, events);
    assert.equal(replay.score, 10, 'a wrong answer does not remove a point already scored');
    assert.equal(replay.wrong, 1);
    assert.equal(replay.longestCombo, 5, 'the combo restarts from zero after a miss');
    assert.equal(replay.penaltyMs, SPRINT_WRONG_PENALTY_S * 1000);
    assert.equal(replay.bonusMs, 3000 + 3000, 'the five-in-a-row step is earned twice, once per combo');
    assert.equal(replay.deadlineAt, start + SPRINT_DURATION_MS + 6000 - SPRINT_WRONG_PENALTY_S * 1000);
  }

  // An answer graded after the clock ran out is dropped, not counted. This is
  // what makes withholding an answer useless as a way to buy time.
  {
    const replay = replaySprint(start, [
      correctAt('inside', start + 1000),
      correctAt('outside', start + SPRINT_DURATION_MS + 1),
    ]);
    assert.equal(replay.score, 1, 'a late answer scores nothing');
    assert.equal(replay.rejected, 1);
  }

  // Penalties move the deadline for everything after them, so ten seconds of
  // clock really is ten seconds of clock.
  {
    const replay = replaySprint(start, [
      { questionId: 'miss', isCorrect: false, at: start + 1000 },
      correctAt('after', start + SPRINT_DURATION_MS - 5000),
    ]);
    assert.equal(replay.score, 0, 'the run was already over when the last answer landed');
    assert.equal(replay.rejected, 1);
  }

  // A replayed request repeats a proof. The same question is one answer.
  {
    const replay = replaySprint(start, [correctAt('same', start + 1000), correctAt('same', start + 2000)]);
    assert.equal(replay.score, 1, 'one question is one answer however many times its proof is sent');
  }

  // The ceiling holds even against a proof set no clock could produce.
  {
    const flood = Array.from({ length: 400 }, (_, i) => correctAt(`f${i}`, start));
    assert.equal(replaySprint(start, flood).score, SPRINT_MAX_SCORE, 'the replayed score is clamped');
  }

  // The combo bar's own arithmetic: it fills between steps and reads full once
  // the curve is finished.
  assert.equal(nextComboStep(0)?.at, 5);
  assert.equal(nextComboStep(5)?.at, 12);
  assert.equal(nextComboStep(30), null);
  assert.equal(comboProgressPct(0), 0);
  assert.equal(comboProgressPct(5), 0, 'reaching a step empties the bar toward the next one');
  assert.equal(comboProgressPct(30), 100);
  assert.deepEqual(SPRINT_COMBO_STEPS.map((step) => step.at), [5, 12, 20, 30]);

  // Only the subjects whose items can be answered in seconds run a sprint, and
  // every one of them is a real subject.
  assert.deepEqual([...SPRINT_SUBJECTS], ['chess', 'math']);
  for (const subject of SPRINT_SUBJECTS) assert.ok(SUBJECT_SCOPE_CATALOG[subject], `${subject} must be a real subject`);

  // The run token carries the mode, and a token minted before the sprint
  // existed still reads as the classic run it was.
  {
    const sprintRun = createChallengeRun(true, 'chess', 'sprint');
    const decoded = decodeChallengeRun(sprintRun.runToken);
    assert.equal(decoded?.mode, 'sprint');
    assert.ok(decoded && Math.abs(decoded.startedAt - sprintRun.startedAt) === 0, 'the run start is the token\'s own timestamp');
    assert.equal(decodeChallengeRun(createChallengeRun(true, 'chess').runToken)?.mode, 'classic');
  }

  // The two modes refuse each other's runs. A sprint has no terminal strikes,
  // and the classic run has no clock, so finishing one as the other would score
  // a run under rules it never played by.
  {
    const sprintRun = createChallengeRun(true, 'chess', 'sprint');
    const classicRun = createChallengeRun(true, 'chess');

    const scoreRes = mockResponse();
    await challengeHandler(
      { method: 'POST', headers: {}, query: {}, body: { name: 'Contract', runToken: sprintRun.runToken, proofs: [] }, socket: {} } as never,
      scoreRes as never,
    );
    assert.equal(scoreRes.statusCode, 400, JSON.stringify(scoreRes.body));
    assert.equal((scoreRes.body as { error?: { code?: string } })?.error?.code, 'wrong_mode');

    const completeRes = mockResponse();
    await challengeHandler(
      { method: 'POST', headers: {}, query: { resource: 'complete' }, body: { runToken: sprintRun.runToken, proofs: [] }, socket: {} } as never,
      completeRes as never,
    );
    assert.equal(completeRes.statusCode, 400, JSON.stringify(completeRes.body));
    assert.equal((completeRes.body as { error?: { code?: string } })?.error?.code, 'wrong_mode');

    const sprintRes = mockResponse();
    await challengeHandler(
      { method: 'POST', headers: {}, query: { resource: 'sprint-complete' }, body: { runToken: classicRun.runToken, proofs: [] }, socket: {} } as never,
      sprintRes as never,
    );
    assert.equal(sprintRes.statusCode, 400, JSON.stringify(sprintRes.body));
    assert.equal((sprintRes.body as { error?: { code?: string } })?.error?.code, 'wrong_mode');
  }

  // A subject that does not run the sprint gets neither its questions nor its
  // board, and says so rather than silently serving the classic ones.
  {
    const geographyCategories = SUBJECT_SCOPE_CATALOG.geography.categories.join(',');
    const batchRes = mockResponse();
    await challengeHandler(
      { method: 'GET', headers: {}, query: { resource: 'sprint', categories: geographyCategories }, socket: {} } as never,
      batchRes as never,
    );
    assert.equal(batchRes.statusCode, 400, JSON.stringify(batchRes.body));
    assert.equal((batchRes.body as { error?: { code?: string } })?.error?.code, 'sprint_unavailable');

    const boardRes = mockResponse();
    await challengeHandler(
      { method: 'GET', headers: {}, query: { resource: 'sprint-board', categories: geographyCategories }, socket: {} } as never,
      boardRes as never,
    );
    assert.equal(boardRes.statusCode, 400, JSON.stringify(boardRes.body));
    assert.equal((boardRes.body as { error?: { code?: string } })?.error?.code, 'sprint_unavailable');
  }

  // The per-answer bucket exists and is wide enough for a three-minute run, and
  // the submit handler picks it from the sealed session rather than from
  // anything the request says.
  assert.ok('challengeAnswer' in RATE_LIMITS, 'rate limit challengeAnswer must exist');
  assert.ok('sprintComplete' in RATE_LIMITS, 'rate limit sprintComplete must exist');
  assert.ok(
    RATE_LIMITS.challengeAnswer.capacity >= 60,
    'a sprint grades one answer per request; a 12-a-minute bucket would 429 a fast run mid-clock',
  );
  {
    const submitSource = readFileSync(join(process.cwd(), 'api/quiz/submit.ts'), 'utf8');
    const decodeAt = submitSource.indexOf('decodeSessionEnvelope(body.sessionId)');
    const limitAt = submitSource.indexOf('RATE_LIMITS.challengeAnswer');
    assert.ok(decodeAt > 0 && limitAt > decodeAt, 'the session must be opened before the bucket is chosen');
    assert.match(submitSource, /session\?\.scope === 'challenge' \? RATE_LIMITS\.challengeAnswer : RATE_LIMITS\.quizSubmit/);
  }

  // The sprint is not a faster way to earn: it pays the same five XP per
  // server-proven correct answer the classic run pays, and nothing for showing up.
  {
    const challengeSource = readFileSync(join(process.cwd(), 'api/quiz/challenge.ts'), 'utf8');
    assert.match(challengeSource, /const xp = Math\.min\(10_000, replay\.score \* 5\)/, 'the sprint pays the classic rate');
    assert.match(challengeSource, /p_award_id: `sprint:\$\{run\.runId\}`/, 'the sprint XP award is keyed to the run, so a replay credits nothing');
    // The score written to the board is the replay's, never the body's.
    const completeBlock = challengeSource.slice(challengeSource.indexOf('async function handleSprintComplete'));
    assert.match(completeBlock, /score: replay\.score/);
    assert.doesNotMatch(completeBlock.split('const name =')[0] ?? '', /body\.score/, 'nothing the browser sent may become a sprint score');
  }

  // The sprint keeps `scope: 'challenge'`: a fifth session scope would have to
  // re-earn every rule quiz/submit.ts already applies to a streamed run.
  {
    const sprintSource = readFileSync(join(process.cwd(), 'client/src/components/Sprint.tsx'), 'utf8');
    // The screen's clock is a rendering of the server's: the deadline is built
    // from the batch's own start, and "now" is corrected by the offset measured
    // against it. A bare local start would drift from the run being scored.
    assert.match(sprintSource, /deadlineRef\.current = batch\.startedAt \+ batch\.durationMs/);
    assert.match(sprintSource, /clockOffsetRef\.current = Date\.now\(\) - batch\.startedAt/);
    assert.match(sprintSource, /const serverNow = useCallback\(\(\) => Date\.now\(\) - clockOffsetRef\.current/);
    // The run is finished through the sprint resource, carrying the tokens the
    // server issued and no score of its own.
    assert.doesNotMatch(sprintSource, /score:\s*score\s*\}/, 'the browser must not report a score to the server');
  }

  console.log('PASS puzzle sprint: the combo curve, the clock, mode isolation, the per-answer bucket and the XP rate');
}

/* ── leaderboard integrity: attestation and progression velocity (#202) ───
 *
 * Two independent guards with one shared property: neither of them may ever
 * change what a learner earned. Attestation can refuse a write before it
 * happens; the velocity check can only write a note for the owner. Nothing in
 * either path deletes a score, edits XP, moves a rank or hides a board row, and
 * the assertions below are what keeps that true. */
async function integrityContracts() {
  const secretWas = process.env.TURNSTILE_SECRET_KEY;
  const enforceWas = process.env.TURNSTILE_ENFORCE;
  const request = (body: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
    ({ body, headers, socket: {} }) as unknown as Parameters<typeof readTurnstileToken>[0];

  try {
    // Switched off is the shipped state: no secret, nothing refused, and the
    // handlers behave exactly as they did before attestation existed.
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_ENFORCE;
    assert.equal(turnstileMode(), 'off', 'no secret means the feature is off');
    assert.equal(isTurnstileConfigured(), false);
    const offRes = mockResponse();
    const allowed = await requireAttestation(request(), offRes as unknown as Parameters<typeof requireAttestation>[1], 'quiz-submit');
    assert.ok(allowed, 'an unconfigured deployment refuses nothing');
    assert.equal(allowed?.outcome, 'not-configured');
    assert.equal(offRes.statusCode, 200, 'and writes no error response');

    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    assert.equal(turnstileMode(), 'observe', 'a secret alone observes; enforcing is a second, separate switch');
    process.env.TURNSTILE_ENFORCE = 'true';
    assert.equal(turnstileMode(), 'enforce');
    process.env.TURNSTILE_ENFORCE = 'yes';
    assert.equal(turnstileMode(), 'observe', 'only the exact string "true" enforces');

    // A missing token never reaches the network, so this is safe to call.
    process.env.TURNSTILE_ENFORCE = 'true';
    const refusedRes = mockResponse();
    const refused = await requireAttestation(request(), refusedRes as unknown as Parameters<typeof requireAttestation>[1], 'quiz-submit');
    assert.equal(refused, null, 'enforcing refuses a submission with no token');
    assert.equal(refusedRes.statusCode, 403);
    assert.equal((refusedRes.body as { error: { code: string } }).error.code, 'attestation_required');

    process.env.TURNSTILE_ENFORCE = 'false';
    const observedRes = mockResponse();
    const observed = await requireAttestation(request(), observedRes as unknown as Parameters<typeof requireAttestation>[1], 'quiz-submit');
    assert.equal(observed?.outcome, 'missing', 'observing still classifies the attempt');
    assert.equal(observedRes.statusCode, 200, 'but never refuses it');
  } finally {
    if (secretWas === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = secretWas;
    if (enforceWas === undefined) delete process.env.TURNSTILE_ENFORCE;
    else process.env.TURNSTILE_ENFORCE = enforceWas;
  }

  // Only the caller's own failures may cost the caller their submission. Our
  // own misconfiguration and Cloudflare's bad day both resolve to 'unavailable',
  // which refuses nothing in either mode — one wrong environment variable must
  // not take every submission in the product down with it.
  assert.equal(classifySiteverify({ success: true }).outcome, 'passed');
  assert.equal(classifySiteverify({ success: false, 'error-codes': ['invalid-input-response'] }).outcome, 'failed');
  assert.equal(classifySiteverify({ success: false, 'error-codes': ['timeout-or-duplicate'] }).outcome, 'failed', 'a replayed token is the caller replaying it');
  assert.equal(classifySiteverify({ success: false, 'error-codes': ['invalid-input-secret'] }).outcome, 'unavailable', 'our own bad secret must never lock out a learner');
  assert.equal(classifySiteverify({ success: false, 'error-codes': ['internal-error'] }).outcome, 'unavailable');
  assert.equal(classifySiteverify({ success: false, 'error-codes': ['invalid-input-response', 'internal-error'] }).outcome, 'unavailable', 'a mixed verdict is not the caller\'s fault alone');
  assert.equal(classifySiteverify({ success: false }).outcome, 'unavailable', 'a refusal with no reason is not evidence');
  assert.equal(classifySiteverify('nonsense').outcome, 'unavailable');
  assert.equal(classifySiteverify(null).outcome, 'unavailable');

  for (const outcome of ['not-configured', 'passed', 'unavailable'] as const) {
    assert.equal(refusesRequest({ mode: 'enforce', outcome, errorCodes: [] }), false, `${outcome} must never refuse a request`);
  }
  for (const outcome of ['missing', 'failed'] as const) {
    assert.equal(refusesRequest({ mode: 'enforce', outcome, errorCodes: [] }), true);
    assert.equal(refusesRequest({ mode: 'observe', outcome, errorCodes: [] }), false, 'observing never refuses');
    assert.equal(refusesRequest({ mode: 'off', outcome, errorCodes: [] }), false);
  }

  // The token is validated for shape before it is ever forwarded upstream.
  const token = 'abc.DEF-123_xyz~+/=';
  assert.equal(readTurnstileToken(request({ turnstileToken: token })), token);
  assert.equal(readTurnstileToken(request({}, { 'cf-turnstile-response': token })), token, 'the header form is accepted too');
  assert.equal(readTurnstileToken(request({ turnstileToken: '  ' })), null);
  assert.equal(readTurnstileToken(request({ turnstileToken: 'a b<script>' })), null, 'a token with unexpected characters is not forwarded');
  assert.equal(readTurnstileToken(request({ turnstileToken: 'a'.repeat(2049) })), null, 'an oversized token is refused, not proxied');
  assert.equal(readTurnstileToken(request({ turnstileToken: 42 })), null);
  assert.equal(readTurnstileToken(request()), null);

  // ── velocity ──
  const rules = VELOCITY_RULES;
  const perAnswer = (answered: number, msEach: number) => answered * msEach;

  // A short set is never evidence, however fast it was.
  assert.equal(
    evaluateVelocity({ answered: rules.minSample - 1, correct: rules.minSample - 1, elapsedMs: 10 }).flagged,
    false,
    'below the minimum sample nothing is flagged',
  );
  // An ordinary good run: eight answers, five seconds each, all correct.
  assert.equal(evaluateVelocity({ answered: 8, correct: 8, elapsedMs: perAnswer(8, 5000) }).flagged, false);
  // A very fast, very good human still sits above the floor.
  assert.equal(evaluateVelocity({ answered: 20, correct: 20, elapsedMs: perAnswer(20, rules.readingFloorMs + 1) }).flagged, false);
  // Speed without accuracy is somebody clicking through a quiz they gave up on.
  // That is not an integrity problem and must not be reported as one.
  assert.equal(
    evaluateVelocity({ answered: 20, correct: 4, elapsedMs: perAnswer(20, 400) }).flagged,
    false,
    'fast and wrong is a bored learner, not a bot',
  );
  const fast = evaluateVelocity({ answered: 20, correct: 20, elapsedMs: perAnswer(20, 400) });
  assert.deepEqual(fast.signals, ['pace-below-reading-floor']);
  assert.equal(fast.severity, 'review');
  assert.equal(fast.accuracyPct, 100);
  assert.equal(fast.msPerAnswer, 400);
  // Under the reaction floor the accuracy stops mattering: that is not hand input.
  const inhuman = evaluateVelocity({ answered: 20, correct: 3, elapsedMs: perAnswer(20, 20) });
  assert.deepEqual(inhuman.signals, ['pace-below-reaction-floor']);
  const both = evaluateVelocity({ answered: 20, correct: 20, elapsedMs: perAnswer(20, 20) });
  assert.equal(both.signals.length, 2);
  assert.equal(both.severity, 'urgent', 'two floors crossed at once is the only shape a replay has');
  // Clock skew across serverless instances must not invent a verdict shape the
  // rest of the code cannot read.
  const skewed = evaluateVelocity({ answered: 20, correct: 1, elapsedMs: -5000 });
  assert.equal(skewed.msPerAnswer, 0);
  assert.ok(skewed.flagged);
  assert.equal(evaluateVelocity({ answered: 20, correct: 20, elapsedMs: Number.NaN }).msPerAnswer, 0);
  // Pure: the same sample always gives the same verdict, with no clock involved.
  const sample = { answered: 12, correct: 12, elapsedMs: 3000 };
  assert.deepEqual(evaluateVelocity(sample), evaluateVelocity(sample));
  // The signal and status vocabularies are closed sets, so a flag can never
  // name something the database will reject.
  assert.ok(evaluateVelocity(sample).signals.every((signal) => (INTEGRITY_SIGNALS as readonly string[]).includes(signal)));
  assert.deepEqual([...INTEGRITY_STATUSES], ['open', 'reviewed', 'cleared', 'confirmed']);
  assert.deepEqual([...INTEGRITY_SURFACES], ['quiz', 'challenge', 'signup']);

  // The fairness contract, read off the source: nothing in the integrity path
  // may reach a score, an XP total, a rank or a leaderboard.
  // Comments are stripped first: this is an assertion about what the module
  // does, and a comment explaining what it must never do would otherwise fail it.
  const integritySource = readFileSync(join(process.cwd(), 'lib', 'integrity.ts'), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');
  for (const forbidden of ['challenge_scores', 'user_stats', 'user_xp', 'quest_xp', 'leaderboard', 'user_category_stats']) {
    assert.ok(!integritySource.includes(forbidden), `lib/integrity.ts must not touch ${forbidden}: a flag is a note, not a penalty`);
  }

  const migration = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-041.sql'), 'utf8');
  // The two vocabularies have to be the same on both sides of the wire, or a
  // flag the server decides to write is a flag the database refuses to store.
  for (const signal of INTEGRITY_SIGNALS) {
    assert.ok(migration.includes(`'${signal}'`), `migration 041 does not accept the signal ${signal}`);
  }
  for (const surface of INTEGRITY_SURFACES) {
    assert.ok(migration.includes(`'${surface}'`), `migration 041 does not accept the surface ${surface}`);
  }
  assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'), 'the review list is not readable by anon or authenticated');
  assert.ok(migration.includes('REVOKE ALL ON public.integrity_flags FROM anon, authenticated;'));
  for (const routine of ['record_integrity_flag', 'integrity_review_list', 'resolve_integrity_flag', 'delete_integrity_data']) {
    assert.ok(migration.includes(`GRANT EXECUTE ON FUNCTION public.${routine}`), `${routine} must be granted to the service role only`);
    assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${routine}`), `${routine} must be revoked from PUBLIC`);
  }
  assert.equal(
    (migration.match(/SECURITY DEFINER/g) ?? []).length,
    4,
    'every routine in the migration is SECURITY DEFINER',
  );
  assert.equal(
    (migration.match(/SET search_path = ''/g) ?? []).length,
    4,
    "every routine pins an empty search_path",
  );
  for (const forbidden of ['DELETE FROM public.challenge_scores', 'UPDATE public.user_stats', 'DELETE FROM public.user_xp', 'UPDATE public.user_category_stats']) {
    assert.ok(!migration.includes(forbidden), `migration 041 must not ${forbidden}: the review list decides nothing`);
  }
  // Account erasure has to reach the new table, and it does so through its own
  // function rather than by restating delete_user_data.
  assert.ok(migration.includes('CREATE OR REPLACE FUNCTION public.delete_integrity_data'));
  const userOps = readFileSync(join(process.cwd(), 'api', 'user', '[op].ts'), 'utf8');
  assert.ok(userOps.includes('purgeIntegrityData'), 'deleting an account must erase its flags');

  console.log('PASS integrity: attestation states, failure attribution, token shape, velocity floors, and a review list that decides nothing');
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
  const exactValues = await runInSandbox({ code: '', calls: ['undefined', 'null', '({a:undefined,b:[undefined,NaN,Infinity,-0]})', 'null'], expectations: [undefined, null, {a:undefined,b:[undefined,NaN,Infinity,-0]}, undefined] });
  assert.deepEqual(exactValues.results.map(result => result.pass), [true,true,true,false], 'server expectations preserve undefined and special numbers without confusing null');
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

  /* ── weekly micro-leagues (migration 038) ───────────────────────────────
   * A league is a deadline on a ranking that already exists. The four things
   * asserted here are the four ways it could stop being that: a tier that is
   * worth something, a room that is not bounded, a board that ranks by streak,
   * or a table account erasure forgets.
   */
  {
    const league = readFileSync(join(process.cwd(), 'supabase', 'supabase-schema-038.sql'), 'utf8');
    for (const table of ['league_scores', 'league_cohorts', 'league_members', 'league_preferences']) {
      assert.match(league, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`), `migration 038 must create ${table}`);
      assert.match(league, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`), `${table} needs RLS`);
      assert.match(league, new RegExp(`REVOKE ALL ON public\\.${table}\\s+FROM anon, authenticated`), `${table} must be unreachable with a browser key`);
    }
    // Erasure removes every row keyed to the account, and gives the seats back
    // before the memberships go — a room that stays one short for the rest of
    // the week ranks the people left in it against somebody who is not there.
    for (const table of ['league_members', 'league_scores', 'league_preferences']) {
      assert.match(league, new RegExp(`DELETE FROM public\\.${table} WHERE user_id = p_user_id`), `account erasure must reach ${table}`);
    }
    assert.ok(
      league.indexOf('UPDATE public.league_cohorts c\n     SET member_count = GREATEST(c.member_count - seats.taken, 0)') <
        league.indexOf('DELETE FROM public.league_members WHERE user_id = p_user_id'),
      'account erasure must free the cohort seats before deleting the memberships that identify them',
    );
    for (const fn of ['league_record', 'league_assign', 'league_board', 'set_league_optout', 'league_optout', 'daily_return_rate', 'delete_user_data']) {
      assert.match(league, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(`), `migration 038 must define ${fn}`);
      assert.match(league, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(`), `${fn} must be service-role only`);
      assert.match(league, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\(`), `${fn} is reached through a handler, so service_role needs it`);
    }

    // The room is bounded. Thirty is the seat ceiling and it is enforced in the
    // table as well as in the query that takes a seat, so no write path can
    // grow a cohort past it.
    assert.match(league, /member_count >= 0 AND member_count <= 30/, 'the cohort ceiling belongs on the column');
    assert.match(league, /AND o\.member_count < 30/, 'a seat may only be taken in a room below the ceiling');
    assert.match(league, /tier BETWEEN 1 AND 5/, 'the ladder is five deep');

    // Promotion and demotion move a label and nothing else. If any of these
    // words ever appears between league_record and league_board, a tier has
    // started to be worth something and the league has stopped being free.
    const leagueRoutines = league.slice(
      league.indexOf('FUNCTION public.league_record'),
      league.indexOf('FUNCTION public.delete_user_data'),
    );
    assert.ok(leagueRoutines.length > 2000, 'expected the league routines before delete_user_data');
    for (const forbidden of ['user_xp', 'quest_xp', 'user_badges', 'user_cards', 'token_balances', 'token_ledger', 'cosmetic_entitlements', 'roadmap_progress', 'coding_progress']) {
      assert.ok(
        !leagueRoutines.includes(forbidden),
        `a league tier must grant nothing: ${forbidden} has no business in the league routines`,
      );
    }
    // And no board in this product ranks by streak, this one included.
    assert.ok(
      !leagueRoutines.includes('current_streak') && !leagueRoutines.includes('longest_streak'),
      'the league ranks weekly correct answers, never a streak',
    );

    // The retention number is the one the feature is judged by, and it is an
    // operator fact: admin-gated on the server, and absent from reader copy.
    const adminHandler = readFileSync(join(process.cwd(), 'api', 'admin', '[op].ts'), 'utf8');
    assert.match(adminHandler, /case 'retention':/, 'the return rate is served from the admin handler');
    assert.match(adminHandler, /daily_return_rate/);
    const en = readFileSync(join(process.cwd(), 'client/src/i18n/translations.ts'), 'utf8');
    assert.doesNotMatch(en, /'league\.[a-zA-Z]+': '[^']*retention/i, 'a retention rate is not reader copy');

    // Scoring is server-owned and written once. The league score is recorded on
    // the same condition as the verified XP credit — the verified write said
    // this attempt id was applied for the first time — so a replay scores
    // nothing, and no client value reaches it.
    const userHandler = readFileSync(join(process.cwd(), 'api', 'user', '[op].ts'), 'utf8');
    assert.match(userHandler, /recordLeagueResult\(supabase!, \{/, 'the league score is recorded by the verified path');
    const recordCall = userHandler.slice(
      userHandler.indexOf('recordLeagueResult(supabase!, {'),
      userHandler.indexOf('recordLeagueResult(supabase!, {') + 400,
    );
    assert.match(recordCall, /correct: receipt\.correct/, 'the score comes from the verified receipt');
    assert.match(recordCall, /answered: receipt\.total/);
    assert.doesNotMatch(recordCall, /body\./, 'nothing the browser sent may become a league score');
  }

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

  // Streak protection is the one thing the shop sells that touches learning at
  // all, and the exception is only defensible while it stays bounded. Each of
  // these is one of the four bounds, asserted rather than promised.
  {
    const rewardsSource = readFileSync(join(process.cwd(), 'shared/rewards.ts'), 'utf8');
    // 1. Capped, and the cap is two.
    assert.equal(STREAK_PROTECTION_CAP, 2, 'the protection cap is what stops a purchase buying a deeper reserve');
    // 2. Priced in tokens, which are earned. There is no money price for it.
    assert.match(rewardsSource, /streakProtectionTokenPrice: number/);
    assert.doesNotMatch(
      rewardsSource,
      /streakProtection(Price|Cash|Minor)/,
      'streak protection must have no cash price — the currency is earned tokens',
    );
    // 3. The database restores toward the cap and never past it.
    const migration = readFileSync(join(process.cwd(), 'supabase/supabase-schema-035.sql'), 'utf8');
    assert.match(
      migration,
      /LEAST\(COALESCE\(v_row\.remaining, 0\) \+ 1, 2\)/,
      'buying a protection must never raise the budget above the cap',
    );
    // 4. It buys a protection and nothing else. If any of these words ever
    //    appear in the purchase routine, the exception has stopped being bounded.
    const routine = migration.slice(
      migration.indexOf('FUNCTION public.purchase_streak_protection'),
      migration.indexOf('GRANT EXECUTE ON FUNCTION public.purchase_streak_protection'),
    );
    for (const forbidden of ['user_xp', 'user_stats', 'quest_xp', 'badge', 'leaderboard', 'roadmap_progress']) {
      assert.ok(
        !routine.toLowerCase().includes(forbidden),
        `buying a protection must not touch ${forbidden}`,
      );
    }

    // 5. Two of them may be armed at once (migration 039), and two is still
    //    the whole of it: the column is constrained to the cap, the arm
    //    routine refuses a third, and arming still buys days and nothing else.
    const slots = readFileSync(join(process.cwd(), 'supabase/supabase-schema-039.sql'), 'utf8');
    assert.match(
      slots,
      /CHECK \(shield_slots >= 0 AND shield_slots <= 2\)/,
      'the armed-protection count must be capped in the schema, not only in the routine',
    );
    const armRoutine = slots.slice(
      slots.indexOf('FUNCTION public.activate_streak_shield'),
      slots.indexOf('GRANT EXECUTE ON FUNCTION public.activate_streak_shield'),
    );
    assert.ok(armRoutine.length > 0, 'migration 039 must define the arm routine it replaces');
    assert.match(armRoutine, /IF v_slots >= 2 THEN/, 'arming a third protection must be refused');
    for (const forbidden of ['user_xp', 'user_stats', 'quest_xp', 'badge', 'leaderboard', 'roadmap_progress']) {
      assert.ok(
        !armRoutine.toLowerCase().includes(forbidden),
        `arming a protection must not touch ${forbidden}`,
      );
    }

    // 6. The moment that celebrates a streak awards nothing. It rides the XP
    //    toast queue because that is where the queue is, and that proximity is
    //    exactly why this is asserted rather than assumed.
    const announce = xpSource.slice(
      xpSource.indexOf('export function announceStreak'),
      xpSource.indexOf('export function announceVerifiedQuestXp'),
    );
    assert.ok(announce.length > 0, 'announceStreak must exist for the streak moment to be inert');
    for (const forbidden of ['awardTokens', 'awardQuestXp', 'writeQuest', 'reconcileRank']) {
      assert.ok(
        !announce.includes(forbidden),
        `announcing a streak must not call ${forbidden} — a streak is a day count, not a reward`,
      );
    }

    // 7. The moment reads the streak running now; the badge of the same name
    //    keeps reading the longest one ever reached. Two different questions,
    //    and collapsing them would make a badge re-earnable.
    const moment = readFileSync(join(process.cwd(), 'client/src/lib/streakMoment.ts'), 'utf8');
    assert.doesNotMatch(moment, /longest_streak/, 'the streak moment must not read the badge’s number');
    const badges = readFileSync(join(process.cwd(), 'shared/badges.ts'), 'utf8');
    assert.match(
      badges,
      /id: 'streak-7'[^}]*longestStreak >= 7/,
      'the seven-day badge stays earned on the longest streak',
    );
  }

  const profileSource = readFileSync(join(process.cwd(), 'client/src/components/Profile.tsx'), 'utf8');
  const profileStreakIndex = profileSource.indexOf('<StreakCard stats={stats}');
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
  // The tip is one line inside the streak card now, not a card of its own. The
  // rule that matters is that it never repeats what it said last time: a plain
  // random draw from ten repeats about one visit in ten, which is what "always
  // different" is not.
  assert.match(
    profileSource,
    /const pool = CONSISTENCY_TIPS\.filter\(\(key\) => key !== previous\)/,
    'the consistency tip must exclude the one shown last time',
  );
  assert.ok(
    (profileSource.match(/'profile\.tip\.[a-zA-Z]+'/g) ?? []).length >= 8,
    'the tip pool must be large enough that a learner does not recognise it',
  );
  // And the last-quiz date is gone: it is a fact nobody acts on, and the tip
  // took its place.
  assert.doesNotMatch(profileSource, /profile\.lastQuiz/, 'the last-quiz date should not come back');
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

  // TypeScript is a late topic, deliberately. It used to sit one stage after a
  // learner's first JavaScript, which put a type system in front of people who
  // had not written enough code for one to help yet. It now comes after the
  // work it pays off against, and this fails if it drifts back to the front.
  {
    for (const [track, stages] of Object.entries(WEBDEV_PLAN_STAGES)) {
      const indexOf = (topic: string) => stages.findIndex((stage) => stage.includes(topic));
      const ts = indexOf('typescript');
      assert.ok(ts >= 0, `${track} must still plan typescript`);
      assert.ok(
        ts >= Math.ceil(stages.length / 2),
        `typescript is stage ${ts + 1} of ${stages.length} on ${track}; it belongs in the second half`,
      );
      // And after the thing it is types *for*: components on the browser tracks,
      // handlers on the server one.
      const after = track === 'backend' ? 'nodejs' : 'react';
      assert.ok(
        indexOf(after) >= 0 && indexOf(after) < ts,
        `typescript must come after ${after} on ${track}`,
      );
    }
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

  // ── the path-completion package (#203) ───────────────────────────
  // The package is the one thing in this product that costs real money every
  // time somebody succeeds, so both halves of that cost are asserted: what one
  // costs is never invented, and how many leave in a month is a number the
  // owner chose rather than however many learners happen to finish.
  {
    const quote = (over: Partial<MerchPricing>): MerchPricing => ({
      unitCostMinor: 1192, printCostMinor: 0, shippingCostMinor: 495, packagingCostMinor: 60,
      priceMinor: 0, currency: 'EUR', taxIncluded: true, regions: ['CZ'],
      vendor: 'example', effectiveFrom: '2026-09-16',
      ...over,
    });
    const withPricing = (pricing: MerchSettings['pricing'], cap: number | null, fee = 0): MerchSettings => ({
      ...DEFAULT_MERCH_SETTINGS, pricing, packagesPerMonth: cap, packagePlatformFeeMinor: fee,
    });

    // The box and the migration that fills it must name the same three items.
    const rewardMigration = readFileSync(join(process.cwd(), 'supabase/supabase-schema-040.sql'), 'utf8');
    const claimRoutine = rewardMigration.slice(
      rewardMigration.indexOf('CREATE OR REPLACE FUNCTION public.claim_path_reward'),
      rewardMigration.indexOf('REVOKE ALL ON FUNCTION public.claim_path_reward'),
    );
    assert.ok(claimRoutine.length > 500, 'migration 040 must restate the claim routine in full');
    const inserted = Array.from(
      claimRoutine.matchAll(/VALUES \(v_order, '([a-z-]+)'|\n\s+\(v_order, '([a-z-]+)'/g),
      (match) => match[1] ?? match[2],
    );
    assert.deepEqual(
      [...PACKAGE_SKUS].sort(),
      Array.from(new Set(inserted)).sort(),
      'PACKAGE_SKUS must be exactly what the claim routine puts in the box',
    );

    // An unquoted package reports what is missing instead of a number.
    const bare = packageCosting(DEFAULT_MERCH_SETTINGS);
    assert.equal(bare.status, 'unquoted');
    assert.deepEqual(
      bare.status === 'unquoted' ? [...bare.missing].sort() : [],
      [...PACKAGE_SKUS].sort(),
      'every item in the box must be named as missing while none is quoted',
    );
    // Two quotes out of three is still not a package cost.
    assert.equal(
      packageCosting(withPricing({ 't-shirt': quote({}), mug: quote({}) }, 10)).status,
      'unquoted',
    );
    // Quotes in different currencies cannot be added up, and the clash is
    // reported rather than resolved by picking one and understating the cost.
    assert.equal(
      packageCosting(withPricing({
        't-shirt': quote({}), mug: quote({ currency: 'CZK' }), 'sticker-set': quote({}),
      }, 10)).status,
      'mixed_currency',
    );

    const full = withPricing({
      't-shirt': quote({}),
      mug: quote({ unitCostMinor: 300, shippingCostMinor: 400 }),
      'sticker-set': quote({ unitCostMinor: 90, shippingCostMinor: 0, packagingCostMinor: 0 }),
    }, null);
    const costed = packageCosting(full);
    assert.equal(costed.status, 'costed');
    const expectedUnit = PACKAGE_SKUS.reduce(
      (total, sku) => total + merchLandedCostMinor(full.pricing[sku] as MerchPricing),
      0,
    );
    assert.equal(costed.status === 'costed' && costed.unitCostMinor, expectedUnit);
    assert.equal(costed.status === 'costed' && costed.currency, 'EUR');

    // A costed package with no cap has no worst case, and one is not invented.
    assert.equal(packageMonthlyCeilingMinor(full), null, 'an uncapped month has no ceiling to report');
    assert.equal(packageProgramState(full), 'cap_not_set');
    assert.equal(packageProgramState(DEFAULT_MERCH_SETTINGS), 'unquoted');

    const capped = { ...full, packagesPerMonth: 12, packagePlatformFeeMinor: 2499 };
    assert.equal(packageMonthlyCeilingMinor(capped), expectedUnit * 12 + 2499);
    assert.equal(packageProgramState(capped), 'ready');
    // The monthly fee is charged whether or not anybody claims, so a cap of
    // zero still costs it — and zero is honoured as a decision, not read as
    // "unset".
    assert.equal(packageMonthlyCeilingMinor({ ...capped, packagesPerMonth: 0 }), 2499);
    assert.equal(packageProgramState({ ...capped, packagesPerMonth: 0 }), 'ready');

    // The cap itself.
    assert.equal(packagesRemainingThisMonth(capped, 0), 12);
    assert.equal(packagesRemainingThisMonth(capped, 12), 0);
    assert.equal(packagesRemainingThisMonth(capped, 99), 0, 'a cap lowered under the count never reads as negative');
    assert.equal(packagesRemainingThisMonth(full, 99), null, 'no cap means undecided, not a number');
    assert.equal(packageClaimOutcome(capped, 11), 'claimable');
    assert.equal(packageClaimOutcome(capped, 12), 'capped');
    assert.equal(packageClaimOutcome({ ...capped, packagesPerMonth: 0 }, 0), 'capped');
    assert.equal(packageClaimOutcome(full, 10_000), 'claimable', 'an unset cap must behave exactly as before it existed');

    // Settings: an unset or unusable cap reads as undecided, and zero survives.
    assert.equal(normalizeSettings({}).merch.packagesPerMonth, null);
    assert.equal(normalizeSettings({ merch: { packagesPerMonth: 'lots' } }).merch.packagesPerMonth, null);
    assert.equal(normalizeSettings({ merch: { packagesPerMonth: -3 } }).merch.packagesPerMonth, null);
    assert.equal(normalizeSettings({ merch: { packagesPerMonth: 0 } }).merch.packagesPerMonth, 0);
    assert.equal(normalizeSettings({ merch: { packagesPerMonth: 25 } }).merch.packagesPerMonth, 25);

    // The database is where the cap is actually kept, and these are the three
    // properties that make it a guarantee rather than an intention.
    assert.match(
      claimRoutine,
      /public\.path_is_complete\(p_user_id, p_path_id, p_modules\)/,
      'the package must stay conditional on a completed path and nothing else',
    );
    assert.match(
      claimRoutine,
      /pg_advisory_xact_lock\(/,
      'claimants in one month must serialize, or two can take the last slot',
    );
    assert.ok(
      claimRoutine.indexOf("RAISE EXCEPTION 'package_cap_reached'") > 0
      && claimRoutine.indexOf("RAISE EXCEPTION 'package_cap_reached'")
         < claimRoutine.indexOf('INSERT INTO public.merch_orders'),
      'a full month must be refused before any order, claim row or address is written',
    );
    // The package changes nothing a learner earned. If any of these words ever
    // appears in the claiming routine, that has stopped being true.
    for (const word of ['xp', 'score', 'rank', 'badge', 'leaderboard', 'streak']) {
      assert.doesNotMatch(
        claimRoutine,
        new RegExp(`\\b${word}\\b`, 'i'),
        `claiming a package must not touch ${word}`,
      );
    }
    // And the shop's cheap cosmetic tier stays cheap and stays cosmetic: it is
    // what a supporter gets, and it must never become the expensive thing.
    assert.ok(
      DEFAULT_MERCH_SETTINGS.crownTokenPrice > 0,
      'the token-priced cosmetic is the supporter-facing reward and must stay priced',
    );
  }

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
    // A synthetic id, never in the registry: this block tests what the product
    // says about an item nobody has reviewed, so it must not borrow the id of
    // a real one. Borrowing `rm-js-1` made the fixture read as `superseded`
    // once the audit recorded a decision for that id, which is the right
    // answer to a different question.
    const sampleQuestion = {
      id: 'rm-js-contract-fixture',
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

    // EN and CS must carry the same keys. The type system only catches one
  // direction: TranslationKey is derived from the English file, so a missing
  // Czech key is a compile error — but a key removed from English and left in
  // Czech is invisible, and a Czech string nobody can reach is worse than no
  // string, because it reads as translated work that is live and is not.
  {
    const keysOf = (file: string) => {
      const source = readFileSync(join(process.cwd(), 'client/src/i18n', file), 'utf8');
      return new Set((source.match(/^ {2}'[^']+':/gm) ?? []).map((line) => line.trim().slice(1, -2)));
    };
    const en = keysOf('translations.ts');
    const cs = keysOf('translations.cs.ts');
    assert.ok(en.size > 1500, `the English dictionary looks truncated: ${en.size} keys`);
    assert.deepEqual(
      [...en].filter((key) => !cs.has(key)),
      [],
      'every English key needs a Czech one',
    );
    assert.deepEqual(
      [...cs].filter((key) => !en.has(key)),
      [],
      'a Czech key with no English counterpart is unreachable and should be deleted',
    );
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

  // ── chessShark: the Lichess puzzle import (#196) ──────────────────────
  //
  // Three separate promises are checked here, because each of them is a way
  // the import could go wrong quietly:
  //
  //   1. The move generator is right. Everything downstream — which position
  //      the learner sees, whether the recorded solution is even legal, what
  //      the wrong options are — rests on it, and a move generator that is
  //      95% right looks exactly like one that is right. Perft node counts at
  //      fixed depths for the five standard test positions are the settled
  //      way to tell them apart.
  //   2. The filters reject for a reason. Every rejection path is exercised
  //      against the fixture, so a future change that silently starts
  //      importing illegal or low-confidence rows fails here.
  //   3. The solution never reaches the client, and the notation does not
  //      announce it either. An option list where only one move ends in "#"
  //      is not a puzzle.
  {
    const perftCases: [string, string, number, number][] = [
      ['start', STARTING_FEN, 3, 8902],
      ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
      ['endgame with en passant', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
      ['promotion and pins', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467],
      ['castling rights', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
    ];
    for (const [name, fen, depth, nodes] of perftCases) {
      const position = parseFen(fen);
      assert.ok(position, `${name}: FEN did not parse`);
      assert.equal(toFen(position!), fen, `${name}: FEN does not round-trip`);
      assert.equal(perft(position!, depth), nodes, `${name}: perft(${depth}) disagrees with the published count`);
    }

    // A FEN that cannot occur is refused rather than turned into a position.
    assert.equal(parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq'), null, 'a four-field FEN needs its clocks');
    assert.equal(parseFen('9/8/8/8/8/8/8/8 w - - 0 1'), null, 'a rank of nine squares is not a position');
    assert.equal(parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w KQkq - 0 1'), null, 'an unknown piece letter is refused');
    const noKing = parseFen('8/8/8/8/8/8/4P3/8 w - - 0 1');
    assert.ok(noKing && !positionIsPlayable(noKing), 'a position without kings is not playable');
    const pawnOnLastRank = parseFen('P6k/8/8/8/8/8/8/K7 w - - 0 1');
    assert.ok(pawnOnLastRank && !positionIsPlayable(pawnOnLastRank), 'a pawn on the eighth rank is not playable');
    const theyAreInCheck = parseFen('7k/8/8/8/8/8/8/K6R w - - 0 1');
    assert.ok(theyAreInCheck && !positionIsPlayable(theyAreInCheck), 'the side that just moved may not be left in check');

    // Notation: the suffix, the pawn capture, and the disambiguation that a
    // wrong option would otherwise collide with.
    const foolsMate = parseFen('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2')!;
    assert.equal(toSan(foolsMate, moveFromUci(foolsMate, 'd8h4')!), 'Qh4#', 'mate carries "#"');
    const enPassant = parseFen('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3')!;
    assert.ok(
      generateMoves(enPassant).map((move) => toSan(enPassant, move)).includes('exf6'),
      'an en-passant capture is generated and named',
    );
    const twoKnights = parseFen('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1')!;
    const toD5 = generateMoves(twoKnights).filter((move) => squareName(move.to) === 'd5').map((move) => toSan(twoKnights, move));
    assert.deepEqual(toD5.sort(), ['Ncd5', 'Ned5'], 'two knights reaching one square are disambiguated by file');

    // The file contract.
    const fixturePath = join(process.cwd(), 'scripts', 'fixtures', 'lichess-puzzles.sample.csv');
    const fixtureLines = readFileSync(fixturePath, 'utf8').split('\n').filter((line) => line.trim());
    assert.ok(headerMatches(fixtureLines[0]!), 'the fixture carries the published header');
    assert.equal(headerMatches('PuzzleId,FEN,Rating,Moves'), false, 'a reordered header is refused');

    const parsed = fixtureLines.slice(1).map(parseLichessRow);
    assert.equal(parsed.filter((row) => row === null).length, 1, 'exactly the truncated line fails to parse');
    const rows = parsed.filter((row): row is NonNullable<typeof row> => row !== null);

    // Every rejection path, one fixture row each.
    const selection = selectPuzzles(rows, { perTier: 3 });
    assert.deepEqual(
      Object.fromEntries(Object.entries(selection.rejected).sort()),
      {
        below_quality_floor: 1,
        duplicate_id: 1,
        no_mapped_theme: 1,
        rating_out_of_band: 1,
        unplayable_or_too_few_options: 1,
      },
      'each filter rejects exactly the row written for it',
    );
    assert.equal(selection.puzzles.length, 3, 'the three importable fixture rows survive');
    assert.deepEqual(
      selection.puzzles.map((puzzle) => [puzzle.puzzleId, puzzle.topic, puzzle.tier]),
      [['FIXTFORK1', 'tactics', 3], ['FIXTBACKR', 'combinations', 1], ['FIXTSKEW1', 'endgames', 4]],
      'a motif theme wins over the phase theme, and the rating picks the tier',
    );

    // Determinism. Re-importing the same rows must not rewrite the bank.
    const again = selectPuzzles(rows, { perTier: 3 });
    assert.equal(
      renderBank(selection.puzzles, { generatedAt: '2026-01-01', source: 'fixture.csv', perTier: 3 }),
      renderBank(again.puzzles, { generatedAt: '2026-01-01', source: 'fixture.csv', perTier: 3 }),
      'the generated bank is byte-identical for the same input',
    );

    for (const puzzle of selection.puzzles) {
      const position = parseFen(puzzle.fen);
      assert.ok(position, `${puzzle.id}: the stored position does not parse`);
      // The position is the one after the opponent's move, and the recorded
      // solution is legal in it. A row failing this was dropped, not guessed.
      assert.ok(moveFromUci(position!, puzzle.solutionUci), `${puzzle.id}: the solution is not legal in the stored position`);
      assert.equal(puzzle.sideToMove, position!.turn);

      // The notation must not announce the answer.
      for (const option of puzzle.optionsSan) {
        assert.doesNotMatch(option, /[+#]/, `${puzzle.id}: an option carries a check or mate suffix`);
      }
      assert.equal(new Set(puzzle.optionsSan).size, puzzle.optionsSan.length, `${puzzle.id}: a repeated option`);
      assert.equal(puzzle.optionsSan.length, 4, `${puzzle.id}: four options`);
      assert.equal(
        puzzle.optionsSan[puzzle.correctAnswer],
        withoutCheckSuffix(puzzle.solutionSan),
        `${puzzle.id}: the correct index does not point at the solution`,
      );
      // Every wrong option is a real move in the real position.
      const legal = new Set(generateMoves(position!).map((move) => withoutCheckSuffix(toSan(position!, move))));
      for (const option of puzzle.optionsSan) {
        assert.ok(legal.has(option), `${puzzle.id}: "${option}" is not a legal move in the position`);
      }

      // The public projection has the fields of a Question and nothing else,
      // so no solution can ride along into the response body.
      const question = puzzleQuestion(puzzle);
      assert.deepEqual(
        Object.keys(question).sort(),
        ['category', 'correctAnswer', 'difficulty', 'explanation', 'id', 'introduction', 'options', 'question', 'tags'],
        `${puzzle.id}: the projection grew a field`,
      );
      // The API sends id, tags, introduction, question, options, category and
      // difficulty — never the explanation, and never the correct index, which
      // goes into the signed session token. Nothing in what it does send may
      // name the solution.
      const sent = JSON.stringify({
        id: question.id,
        tags: question.tags,
        introduction: question.introduction,
        question: question.question,
        options: question.options,
        category: question.category,
        difficulty: question.difficulty,
      });
      assert.ok(!sent.includes(puzzle.solutionUci), `${puzzle.id}: the solution UCI is in the served question`);
      for (const field of [question.question, question.introduction]) {
        assert.ok(!field.includes(puzzle.solutionSan), `${puzzle.id}: the solution is named in the stem or the hint`);
        assert.ok(
          !field.includes(withoutCheckSuffix(puzzle.solutionSan)),
          `${puzzle.id}: the solution is named in the stem or the hint`,
        );
      }
      assert.ok(question.question.includes(puzzle.fen), `${puzzle.id}: the stem does not carry the position`);
      // The source reference the issue asks for: the puzzle id and the game.
      assert.ok(question.explanation.includes(puzzle.puzzleId), `${puzzle.id}: no puzzle id in the source reference`);
      assert.ok(question.explanation.includes(puzzle.gameUrl), `${puzzle.id}: no game URL in the source reference`);
      assert.ok(question.explanation.includes('CC0'), `${puzzle.id}: the licence is not stated`);
      // Tags reach the client, so they may not name the motif.
      for (const theme of puzzle.themes) {
        assert.ok(!question.tags.includes(theme), `${puzzle.id}: a Lichess theme leaked into the tags`);
      }

      // EN/CS parity: a parallel options array keeps the stored index valid.
      const translation = puzzleTranslation(puzzle);
      assert.equal(translation.options.length, question.options.length, `${puzzle.id}: the Czech options are not parallel`);
      assert.deepEqual(
        translation.options.map((option) => option.replace(/^[KDVSJ]/, '')),
        question.options.map((option) => option.replace(/^[KQRBN]/, '')),
        `${puzzle.id}: Czech notation changed more than the piece letter`,
      );
      for (const value of [translation.introduction, translation.question, translation.explanation]) {
        assert.ok(value.trim().length > 0, `${puzzle.id}: an empty Czech string`);
      }
      assert.notEqual(translation.question, question.question, `${puzzle.id}: the Czech stem is the English one`);

      // A puzzle topic is a chess category, so an imported puzzle can never
      // escape its subject scope or reach a devShark deployment.
      assert.equal(subjectForCategory(puzzle.topic), 'chess', `${puzzle.id}: ${puzzle.topic} is not a chess category`);
      assert.ok(
        (SUBJECT_SCOPE_CATALOG.chess.topics as readonly string[]).includes(puzzle.topic),
        `${puzzle.id}: ${puzzle.topic} is not a chessShark topic`,
      );
    }

    // Every topic the mapping can produce is a real chess category, checked
    // without needing an import to have happened.
    for (const topic of PUZZLE_TOPICS) {
      assert.equal(subjectForCategory(topic), 'chess', `${topic} is not owned by chessShark`);
    }
    assert.equal(new Set(PUZZLE_TOPICS).size, PUZZLE_TOPICS.length, 'a topic is claimed twice');
    // No Lichess theme feeds two topics, or a puzzle's topic would depend on
    // the order its themes happen to be listed in.
    const claimedThemes = PUZZLE_TOPIC_THEMES.flatMap((entry) => entry.themes);
    assert.equal(new Set(claimedThemes).size, claimedThemes.length, 'a theme is claimed by two topics');
    // The tiers cover their range without a gap or an overlap.
    PUZZLE_TIERS.forEach((band, index) => {
      assert.ok(band.minRating <= band.maxRating, `tier ${band.tier} is inverted`);
      const previous = PUZZLE_TIERS[index - 1];
      if (previous) assert.equal(band.minRating, previous.maxRating + 1, `tier ${band.tier} does not follow tier ${previous.tier}`);
      assert.equal(tierForRating(band.minRating)?.tier, band.tier);
      assert.equal(tierForRating(band.maxRating)?.tier, band.tier);
    });
    assert.equal(tierForRating(PUZZLE_TIERS[0]!.minRating - 1), null, 'a rating below the first band is not imported');
    assert.equal(tierForRating(PUZZLE_TIERS[PUZZLE_TIERS.length - 1]!.maxRating + 1), null, 'a rating above the last band is not imported');

    // The filled path, run over the fixture puzzles, because the committed
    // bank is empty and a projection that only ever sees an empty array is
    // not a projection anybody has tested.
    const filled = buildChessPuzzleBank(selection.puzzles);
    assert.equal(filled.questions.length, 3);
    assert.deepEqual(Object.keys(filled.translations).sort(), filled.questions.map((one) => one.id).sort());
    for (const question of filled.questions) {
      assert.equal(subjectForCategory(question.category), 'chess');
      assert.ok(question.difficulty >= 1 && question.difficulty <= 5);
      const translation = filled.translations[question.id]!;
      assert.equal(translation.options?.length, question.options.length, `${question.id}: Czech options are not parallel`);
      // The stored index must still name the same move after localization, or
      // grading would mark the right answer wrong for Czech readers.
      assert.equal(
        translation.options?.[question.correctAnswer]?.replace(/^[KDVSJ]/, ''),
        question.options[question.correctAnswer]?.replace(/^[KQRBN]/, ''),
        `${question.id}: the correct index points at a different move in Czech`,
      );
    }
    // A generated bank naming a category chessShark does not own is dropped,
    // not served: the category decides subject scope.
    const smuggled = buildChessPuzzleBank([{ ...selection.puzzles[0]!, topic: 'javascript' }]);
    assert.equal(smuggled.questions.length, 0, 'a puzzle filed under a non-chess category is dropped');

    // The committed bank. It is empty until somebody runs the import, and an
    // empty bank must leave chessShark exactly as it was.
    assert.equal(
      chessPuzzleQuestions.length,
      IMPORTED_CHESS_PUZZLES.length,
      'every imported puzzle became a question, or one was dropped for an unknown category',
    );
    assert.equal(
      Object.keys(chessPuzzleTranslationsCs).length,
      chessPuzzleQuestions.length,
      'every puzzle question has a Czech translation',
    );
    if (IMPORTED_CHESS_PUZZLES.length === 0) {
      assert.equal(CHESS_PUZZLE_IMPORT.generatedAt, null, 'an empty bank must not claim an import date');
    } else {
      assert.ok(CHESS_PUZZLE_IMPORT.generatedAt, 'a filled bank records when it was generated');
      const ids = new Set<string>();
      for (const question of chessPuzzleQuestions) {
        assert.ok(!ids.has(question.id), `${question.id} appears twice in the bank`);
        ids.add(question.id);
        assert.ok(question.correctAnswer >= 0 && question.correctAnswer < question.options.length);
        assert.equal(subjectForCategory(question.category), 'chess');
      }
    }
    console.log('PASS chess puzzles: move generation, filters, notation, the server boundary and EN/CS parity');
  }

  await sprintContracts();

  await integrityContracts();

  await auditGateContracts();

  console.log('Launch contracts passed: product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, 12-function budget, the progression graph, failure hints, retired sections, curation claims, the content-audit gate, spaced practice, interleaving, lesson figures, the chess puzzle import, and an unconfigured shop.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
