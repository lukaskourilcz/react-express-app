import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  MERCH_SHOP,
  PRODUCT_CATALOG,
  SOCIAL_PROFILES,
  TRADER,
  resolveCatalogProductId,
} from '../client/product-catalog';
import {
  SUBJECT_SCOPE_CATALOG,
  allowedDeploymentSubjects,
  deliveryCategories,
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
import { buildQueue, parseScheduledFor } from '../lib/coding/practice-handlers';
import { webhookDecision } from '../lib/rewards/handlers';
import healthHandler from '../api/health';
import roadmapHandler from '../api/quiz/roadmap';
import { selectPersonalizedReview, selectDueItems, DUE_SHARE } from '../lib/review-selection';
import { defaultDeploymentCategories, validateCategoryScope } from '../lib/product-scope';
import { playable as playableCodingTask, CODING_TASKS } from '../lib/coding/catalog';
import { codingTaskById, levelCodingTasks } from '../lib/coding/active';
import { solutionFor } from '../lib/coding/solutions';
import { gradeDesign, prepareDesign, codeOutcome, giveUpAfter, ladderLength } from '../lib/coding/grade';
import { runInSandbox } from '../lib/coding/sandbox';
import { runReactSuite } from '../lib/coding/react-runner';
import { splitHiddenCases, withHiddenCases } from '../lib/coding/react-hidden';
import { decodeCodingSession, encodeCodingSession, decodeGithubConnectState, encodeGithubConnectState } from '../lib/quiz-tokens';
import { decodeLearningPathSession, encodeLearningPathSession } from '../lib/quiz-tokens';
import { LEARNING_PATHS, publicManifest, pathEnabledInEnv, availabilityFor } from '../lib/learning-paths/catalog';
import { contentVersion, contentHash, translationHash, itemReview, codingTaskReview, questionEligibility, isAuditedCategory } from '../lib/curation';
import { AUDITED_CATEGORIES, REVIEW_REGISTRY } from '../lib/curation-registry';
import { readLedger, registryFromLedger, renderCurationRegistry, REGISTRY_PATH } from './build-curation-registry';
import { webdevBankContracts } from './webdev-bank-contract';
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
  merchAvailability,
  merchMarginMinor,
  tokensForVerifiedXp,
  validateAddress,
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
import { gardenPathFor, tierUnlocked, eligibleCodingBadges, CODING_TASK_XP, CODING_BADGE_IDS, CODING_TRACKS, formatOf, isCodingSectionTrack, isDifficulty } from '../shared/coding-catalog';
import { CODING_BADGES } from '../shared/badges';
import { CODING_INDEX } from '../shared/coding-index';
import { inspectQuestionQuality } from '../lib/question-quality';
import { assessmentUnlocks, roadmapEndedOnHearts, ROADMAP_MAX_HEARTS } from '../shared/assessment';
import { grantedTopicsFor, withGrantedTopics } from '../lib/topic-grants';
import { ROADMAP_TOPICS, isRoadmapTopic, topicLevelCount, ROADMAP_LEVELS } from '../lib/roadmap';
import type { Question } from '../lib/quiz-runtime';
import {
  FREE_CODING_SHARE,
  FREE_CODING_TASK_IDS,
  FREE_EVOLVING_STAGES,
  FREE_LEARN_LEVELS,
  FREE_LEARN_TOPICS,
  PREMIUM_REQUIRED,
  codingContent,
  contentTier,
  isFreeCodingTask,
  isOpenTo,
} from '../shared/tiers';
import { EVOLVING_CHALLENGES } from '../shared/evolving';
import { techniqueGroup } from '../shared/coding-catalog';
import { CODING_SUMMARIES } from '../lib/coding/active';
import { serverContentIndex } from '../lib/access';
import { isRpcMissing, jsonPremiumRequired, PremiumRequiredError } from '../lib/http';
import { handleAdminEntitlements, handleEntitlement, parseValidUntil, toEntitlementResponse } from '../lib/entitlements';
import { DEFAULT_PUBLIC_ORIGIN, publicBillingSettings } from '../lib/billing/config';
import { WAIVER_TEXT } from '../lib/billing/sync';
import { en as ENGLISH } from '../client/src/i18n/translations';
import { NOINDEX_PATHS, PUBLIC_PAGES, premiumSchema } from '../client/src/lib/publicMetadata';
import {
  DEFAULT_COIN_SETTINGS,
  SOCIAL_PLATFORMS,
  coinsForVerifiedXp,
  coinsUnderDailyCap,
} from '../shared/rewards';
import { learnCheckpointXp, learnLevelXp } from '../shared/progression';
import { accountKey, codingAwardId, learnAwardId, milestoneConfig, previousMonth } from '../lib/rewards/coins';
import { REFERRAL_SIGNUP_WINDOW_HOURS, isReferralCode } from '../shared/rewards';
import { accountCreatedAt, handleReferral } from '../lib/rewards/referral';
import { getMerchPromo, parseSpreadshopPromotion, resetMerchPromoCache, spreadshopConfig } from '../lib/rewards/spreadshop';
import { MERCH_CATALOGUE, SHIRT_SIZES } from '../shared/rewards';
import { generateVoucherCode, handleAdminVouchers, handleVoucherRedeem, parseVoucherForm, toAdminVoucher, voucherHash } from '../lib/vouchers';
import { VOUCHER_ALPHABET, formatVoucherCode, normalizeVoucherCode, voucherHint, voucherState } from '../shared/vouchers';
import adminHandler from '../api/admin/[op]';

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
  // The landing's question count is what a learner can be served from the
  // static bank: the gated set without the retired sections, whose categories
  // stay in the catalogue only so old rows resolve (#230).
  const deliverable = served.filter((q) => deliveryCategories('webdev').includes(q.category)).length;
  assert.equal(SUBJECT_SCOPE_CATALOG.webdev.questionCount, deliverable, `questionCount must be the ${deliverable} questions the bank can serve`);
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
  const firstServed = (await getEffectiveQuestions('webdev', false))[0];
  assert.ok(firstServed, 'the webdev bank serves questions');

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
  const sample = firstServed;
  const session = encodeSession(
    [{ questionId: sample.id, correctAnswer: 1 }, { questionId: 'retired-while-open', correctAnswer: 2 }],
    { subject: 'webdev' },
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
  const pool = (await getEffectiveQuestions('webdev', false)).slice(0, 3);
  const placementToken = encodePlacementRun({
    subject: 'webdev', attemptId: 'placement-void-contract-1234', round: 1, difficulty: 3, history: [],
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

/* ── the free tier and Premium (#220) ─────────────────────────────────────
 *
 * shared/tiers.ts is the one contract for what each tier opens, the server
 * refuses locked content with 402, and Premium changes which content a
 * learner may start and nothing else. Each assertion below is one of the
 * handoff's section 2.5 rules. */
async function tierContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

  // 1. The contract is pure: the browser and the server import the same file.
  const tiersSource = read('shared/tiers.ts');
  const tiersImports = [...tiersSource.matchAll(/^import[^;]*?from\s+'([^']+)'/gms)].map((match) => match[1]);
  assert.ok(tiersImports.length > 0);
  for (const specifier of tiersImports) {
    assert.ok(specifier.startsWith('./'), `shared/tiers.ts may import only from shared/, not ${specifier}`);
  }

  // 2. The free coding share stays inside its bounds, and 3. every free task exists.
  const index = serverContentIndex();
  const indexIds = new Set(CODING_INDEX.map((task) => task.id));
  for (const id of FREE_CODING_TASK_IDS) assert.ok(indexIds.has(id), `free task ${id} is not in the coding index`);
  assert.equal(new Set(FREE_CODING_TASK_IDS).size, FREE_CODING_TASK_IDS.length, 'the free pick lists each task once');
  const freeCount = CODING_INDEX.filter((task) => task.free === true).length;
  const share = freeCount / CODING_INDEX.length;
  assert.ok(
    share >= FREE_CODING_SHARE.min && share <= FREE_CODING_SHARE.max,
    `the free coding share is ${(share * 100).toFixed(1)} %, outside ${FREE_CODING_SHARE.min * 100}-${FREE_CODING_SHARE.max * 100} %`,
  );
  // The browser's flags are the server's flags: both are the projection of one list.
  for (const task of CODING_INDEX) {
    assert.equal(task.free === true, isFreeCodingTask(task.id), `${task.id}: the index flag disagrees with shared/tiers.ts`);
  }
  assert.deepEqual(
    CODING_SUMMARIES.filter((task) => task.free).map((task) => task.id),
    CODING_INDEX.filter((task) => task.free).map((task) => task.id),
    'the server summaries and the browser index open the same tasks',
  );
  // Stage one of every evolving project and short path is open; stage two never is.
  for (const challenge of EVOLVING_CHALLENGES) {
    assert.equal(contentTier({ kind: 'coding-task', taskId: challenge.stages[0] }, index), 'free', `${challenge.id} stage one`);
    if (challenge.stages[FREE_EVOLVING_STAGES]) {
      assert.equal(contentTier({ kind: 'coding-task', taskId: challenge.stages[FREE_EVOLVING_STAGES] }, index), 'premium', `${challenge.id} stage two`);
    }
  }
  // Each tier-1 technique group of every section track has its first task open.
  for (const track of ['javascript', 'typescript', 'react', 'algorithms'] as const) {
    const seen = new Set<string>();
    for (const task of CODING_INDEX.filter((one) => one.track === track && one.tier === 1 && !codingContent(one.id).kind.startsWith('evolving'))) {
      for (const tag of task.focus) {
        const group = techniqueGroup(tag);
        if (!group || seen.has(group)) continue;
        seen.add(group);
        assert.equal(task.free, true, `${task.id} is the first ${track} tier-1 task in ${group} and must be free`);
      }
    }
  }

  // What the free tier opens, and what it does not.
  for (const topic of FREE_LEARN_TOPICS) {
    for (let level = 1; level <= topicLevelCount(topic); level++) {
      assert.equal(contentTier({ kind: 'learn-level', topic, level }, index), 'free', `${topic} ${level}`);
    }
    for (let part = 1; part <= 3; part++) assert.equal(contentTier({ kind: 'learn-part-test', topic, part }, index), 'free');
  }
  assert.equal(FREE_LEARN_LEVELS.react, 12);
  assert.equal(contentTier({ kind: 'learn-level', topic: 'react', level: 12 }, index), 'free');
  assert.equal(contentTier({ kind: 'learn-level', topic: 'react', level: 13 }, index), 'premium');
  assert.equal(contentTier({ kind: 'learn-part-test', topic: 'react', part: 1 }, index), 'free', "React's first part is open");
  assert.equal(contentTier({ kind: 'learn-part-test', topic: 'react', part: 2 }, index), 'premium', "React's second part ends above level 12");
  assert.equal(contentTier({ kind: 'learn-level', topic: 'typescript', level: 1 }, index), 'premium');
  assert.equal(contentTier({ kind: 'learning-path', pathId: 'fde' }, index), 'premium');
  assert.equal(contentTier({ kind: 'coding-task', taskId: 'js-no-such-task' }, index), 'premium', 'unknown content can only lock');
  assert.equal(isOpenTo('premium', { kind: 'learning-path', pathId: 'dsa-foundations' }, index), true);
  assert.equal(isOpenTo('free', { kind: 'learn-level', topic: 'html', level: 3 }, index), true);

  // 4. The entitlement routines read no learning, score or streak table, and
  //    5. a grant writes none. Comments are stripped so the header may name them.
  const migration = read('supabase/supabase-schema-039.sql').replace(/--[^\n]*/g, '').toLowerCase();
  for (const table of ['user_xp', 'user_stats', 'user_category_stats', 'user_streak', 'roadmap_progress', 'coding_progress', 'token_ledger', 'token_balances']) {
    assert.ok(!migration.includes(table), `migration 039 must not touch ${table}`);
  }
  for (const routine of [
    'is_premium', 'entitlement_summary', 'upsert_provider_entitlement', 'grant_manual_entitlement', 'revoke_manual_entitlement',
    'record_billing_event', 'finish_billing_event', 'link_billing_customer', 'delete_entitlement_data',
    // Billing (step D2, #221).
    'release_billing_event', 'billing_account', 'billing_customer_owner', 'record_checkout_consent',
    // The review's billing rules (step FIX).
    'claim_voluntary_refund', 'create_billing_cancel_request', 'review_billing_cancel_request',
    'consume_billing_cancel_request', 'release_billing_cancel_request',
  ]) {
    const start = migration.indexOf(`function public.${routine}(`);
    assert.ok(start >= 0, `migration 039 defines ${routine}`);
    const body = migration.slice(start, migration.indexOf('grant execute', start));
    assert.match(body, /security definer/, `${routine} is SECURITY DEFINER`);
    assert.match(body, /set search_path = ''/, `${routine} pins an empty search_path`);
    assert.match(migration, new RegExp(`grant execute on function public\\.${routine}\\([^)]*\\) to service_role;`), `${routine} is executable by service_role`);
    assert.match(migration, new RegExp(`revoke all on function public\\.${routine}\\([^)]*\\) from public, anon, authenticated;`), `${routine} is revoked from browsers`);
  }
  assert.doesNotMatch(migration, /create or replace function public\.delete_user_data/, 'migration 039 redefines no earlier routine');
  for (const table of ['billing_customers', 'entitlement_grants', 'billing_events', 'billing_checkout_consents', 'billing_cancel_requests']) {
    assert.match(migration, new RegExp(`alter table public\\.${table}\\s+enable row level security`), `${table} has RLS`);
    assert.match(migration, new RegExp(`revoke all on public\\.${table}\\s+from public, anon, authenticated`), `${table} revokes browser privileges`);
  }
  assert.doesNotMatch(migration, /grant select on public\.billing_events/, 'billing_events is service-role only');
  assert.doesNotMatch(migration, /grant [a-z, ]+ on public\.billing_cancel_requests/, 'the cancellation links are service-role only');
  // The grace of a failed renewal runs from the failure, never from a period
  // end the provider has already moved on (review finding product-3).
  assert.match(migration, /p_past_due_since is not null\s+and p_past_due_since \+ interval '7 days' > now\(\)/);
  assert.doesNotMatch(migration, /p_current_period_end \+ interval '7 days'/, 'no grace is counted from the period end');
  assert.doesNotMatch(migration, /to anon/, 'anon holds nothing');

  // Premium changes which content a learner may start and nothing else:
  // grading, XP, scores, streaks, ranks and matchmaking never read a tier.
  const tierReaders = new Set([
    'lib/access.ts', 'lib/http.ts', 'lib/entitlements.ts', 'lib/coding/catalog.ts', 'lib/coding/handlers.ts',
    'lib/learning-paths/handlers.ts', 'api/quiz/roadmap.ts',
    // Redeeming coins for shipped merchandise is Premium only (#227).
    'lib/rewards/handlers.ts',
  ]);
  const serverFiles = [...apiFiles(join(process.cwd(), 'api')), ...apiFiles(join(process.cwd(), 'lib'))]
    .map((path) => path.slice(process.cwd().length + 1));
  for (const file of serverFiles) {
    const source = read(file);
    if (/from '[^']*shared\/tiers'|from '[^']*lib\/access'|from '\.\.?\/access'|refuseLocked|resolveTier/.test(source)) {
      assert.ok(tierReaders.has(file), `${file} reads the tier; only the content gates may`);
    }
  }
  for (const file of ['lib/coding/grade.ts', 'api/leaderboard.ts', 'api/quiz/submit.ts', 'api/play/[action].ts', 'api/quiz/daily.ts', 'api/quiz/challenge.ts']) {
    assert.doesNotMatch(read(file), /shared\/tiers|\/access'|is_premium|resolveTier|premium_required/, `${file} grades or ranks and must not read a tier`);
  }

  // 7. The 402 body: the standard envelope, the code, what was refused.
  {
    const res = mockResponse();
    jsonPremiumRequired(res as never, new PremiumRequiredError({ kind: 'learn-level', topic: 'react', level: 13 }));
    assert.equal(res.statusCode, 402);
    assert.deepEqual(
      res.body,
      { error: { code: PREMIUM_REQUIRED, message: 'Premium opens this', kind: 'learn-level', ref: 'react:13' } },
    );
    assert.equal(PREMIUM_REQUIRED, 'premium_required');
  }
  assert.deepEqual(toEntitlementResponse(null), {
    tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null,
    billingAccount: false, subscriptionLive: false,
  });
  // A lapsed subscriber and a complimentary grant over a subscription keep
  // Manage billing (review finding product-10).
  assert.equal(toEntitlementResponse({ premium: false, billingAccount: true }).billingAccount, true);
  assert.deepEqual(
    (({ tier, source, billingAccount, subscriptionLive }) => ({ tier, source, billingAccount, subscriptionLive }))(
      toEntitlementResponse({ premium: true, source: 'manual', validUntil: null, billingAccount: true, subscriptionLive: true })),
    { tier: 'premium', source: 'manual', billingAccount: true, subscriptionLive: true },
  );
  assert.equal(toEntitlementResponse({ premium: true, source: 'manual', validUntil: null }).tier, 'premium');
  assert.equal(toEntitlementResponse({ premium: 'yes' }).tier, 'free', 'only a literal true opens Premium');
  const now = Date.parse('2026-09-25T12:00:00Z');
  assert.deepEqual(parseValidUntil(undefined, now), { ok: true, value: null }, 'no end date means open-ended');
  assert.equal(parseValidUntil('2026-09-24', now).ok, false, 'a grant cannot end in the past');
  assert.equal(parseValidUntil('2040-01-01', now).ok, false, 'a grant is at most five years long');
  assert.deepEqual(parseValidUntil('2026-10-25T12:00:00Z', now), { ok: true, value: '2026-10-25T12:00:00.000Z' });

  // A routine that is not installed reads as missing whichever layer says so
  // (review finding data-1). PostgREST 12, which every .rpc() goes through,
  // answers PGRST202; Postgres answers 42883 when an installed routine calls a
  // missing one. The first object is PostgREST 12.2.12's body, verbatim.
  const pgrst202 = {
    code: 'PGRST202',
    details: 'Searched for the function public.is_premium with parameter p_user or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.',
    hint: null,
    message: 'Could not find the function public.is_premium(p_user) in the schema cache',
  };
  assert.equal(isRpcMissing(pgrst202), true, 'PostgREST reports a missing routine as PGRST202');
  assert.equal(isRpcMissing({ message: pgrst202.message }), true, 'the message alone is enough');
  assert.equal(isRpcMissing({ code: '42883', message: 'function public.is_premium(text) does not exist' }), true);
  assert.equal(isRpcMissing({ message: 'function public.window_leaderboard(integer) does not exist' }), true);
  for (const other of [
    { code: '42501', message: 'permission denied for function is_premium' },
    { code: 'PGRST203', message: 'Could not choose the best candidate function between: public.x(a => text), public.x(a => integer)' },
    { code: '42P01', message: 'relation "public.entitlement_grants" does not exist' },
    { code: 'PGRST205', message: "Could not find the table 'public.entitlement_grants' in the schema cache" },
    // Same code as a missing function, but a bug inside an installed routine.
    { code: '42883', message: 'operator does not exist: text = uuid' },
    null,
  ]) {
    assert.equal(isRpcMissing(other), false, `${other?.code ?? 'no error'} is not a missing routine`);
  }

  // The handlers themselves, where they can run without a database: a signed-in
  // account with no grant is free, and a guest holds the free tier.
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    const signedIn = (query: Record<string, string>) => ({
      method: 'GET', headers: { authorization: 'Bearer contract' }, query: { ...query, user_id: 'contract-free-account' },
    });
    const lockedTask = CODING_INDEX.find((task) => task.track === 'javascript' && !task.free && !codingContent(task.id).kind.startsWith('evolving'))!;
    const freeTask = CODING_INDEX.find((task) => task.free && task.track === 'javascript')!;
    const locked = mockResponse();
    await roadmapHandler(signedIn({ resource: 'coding-task', id: lockedTask.id }) as never, locked as never);
    assert.equal(locked.statusCode, 402, 'a free account is refused a Premium task');
    assert.deepEqual(
      { code: (locked.body as { error: { code: string } }).error.code, kind: (locked.body as { error: { kind: string } }).error.kind, ref: (locked.body as { error: { ref: string } }).error.ref },
      { code: PREMIUM_REQUIRED, kind: 'coding-task', ref: lockedTask.id },
    );
    const lockedStage = mockResponse();
    await roadmapHandler(signedIn({ resource: 'coding-task', id: EVOLVING_CHALLENGES[0].stages[1] }) as never, lockedStage as never);
    assert.equal(lockedStage.statusCode, 402, 'a free account is refused stage two');
    assert.equal((lockedStage.body as { error: { kind: string } }).error.kind, 'evolving-stage');
    const open = mockResponse();
    await roadmapHandler(signedIn({ resource: 'coding-task', id: freeTask.id }) as never, open as never);
    assert.equal(open.statusCode, 200, 'a free account opens a free task');
    // A guest holds the free tier and nothing more (review finding
    // integrity-4): signing out, or leaving the token off a request, must not
    // open Premium content.
    const guest = (query: Record<string, string>) => ({ method: 'GET', headers: {}, query });
    const guestTask = mockResponse();
    await roadmapHandler(guest({ resource: 'coding-task', id: lockedTask.id }) as never, guestTask as never);
    assert.equal(guestTask.statusCode, 402, 'a guest is refused a Premium task');
    assert.equal((guestTask.body as { error: { kind: string } }).error.kind, 'coding-task');
    const guestStage = mockResponse();
    await roadmapHandler(guest({ resource: 'coding-task', id: EVOLVING_CHALLENGES[0].stages[1] }) as never, guestStage as never);
    assert.equal(guestStage.statusCode, 402, 'a guest is refused stage two');
    const guestStageOne = mockResponse();
    await roadmapHandler(guest({ resource: 'coding-task', id: EVOLVING_CHALLENGES[0].stages[0] }) as never, guestStageOne as never);
    assert.equal(guestStageOne.statusCode, 200, 'stage one of a project stays open to a guest');
    const guestFree = mockResponse();
    await roadmapHandler(guest({ resource: 'coding-task', id: freeTask.id }) as never, guestFree as never);
    assert.equal(guestFree.statusCode, 200, 'a free task stays open to a guest');
    const guestLevel = mockResponse();
    await roadmapHandler(guest({ topic: 'react', level: '13', lang: 'en' }) as never, guestLevel as never);
    assert.equal(guestLevel.statusCode, 402, 'a guest is refused a Premium Learn level');
    const guestTest = mockResponse();
    await roadmapHandler(guest({ topic: 'react', test: '2', lang: 'en' }) as never, guestTest as never);
    assert.equal(guestTest.statusCode, 402, 'a guest is refused a Premium part test');
    const guestTs = mockResponse();
    await roadmapHandler(guest({ topic: 'typescript', level: '1', lang: 'en' }) as never, guestTs as never);
    assert.equal(guestTs.statusCode, 402, 'a guest is refused a Premium topic');
    const guestFreeLevel = mockResponse();
    await roadmapHandler(guest({ topic: 'react', level: '12', lang: 'en' }) as never, guestFreeLevel as never);
    assert.notEqual(guestFreeLevel.statusCode, 402, 'a free Learn level stays open to a guest');
    // Grading and the solution follow the same rule. A guest's session for a
    // Premium task, or for a coding task inside a Premium Learn level, is
    // refused before anything is graded or revealed.
    const post = (resource: string, body: Record<string, unknown>) => ({ method: 'POST', headers: {}, query: { resource }, body });
    const levelTask = CODING_TASKS.find((task) => task.topic === 'typescript' && task.level > 0)!;
    assert.ok(levelTask, 'a coding task inside a TypeScript Learn level exists');
    for (const [label, session] of [
      ['a Premium task', encodeCodingSession({ taskId: lockedTask.id, track: lockedTask.track, userId: null })],
      ['a Premium Learn level', encodeCodingSession({ taskId: levelTask.id, track: levelTask.track, userId: null, roadmapAttemptId: 'guest-attempt-0123456789' })],
    ] as const) {
      const submitted = mockResponse();
      await roadmapHandler(post('coding-submit', { session, code: 'function solve() { return 1; }', lang: 'en' }) as never, submitted as never);
      assert.equal(submitted.statusCode, 402, `a guest submit for ${label} is refused`);
      const revealed = mockResponse();
      await roadmapHandler(post('coding-reveal', { session, hintsUsed: 20 }) as never, revealed as never);
      assert.equal(revealed.statusCode, 402, `a guest reveal for ${label} is refused`);
      assert.equal(JSON.stringify(revealed.body ?? {}).includes('solution'), false, 'nothing of the solution comes back');
    }

    // A deploy that lands before migration 039, against a PostgREST that has
    // none of its routines: the plan reads free instead of failing, and the
    // admin grant names the missing migration instead of answering 500.
    const before039 = {
      rpc: async (fn: string) => ({ data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` } }),
      auth: { admin: { getUserById: async (id: string) => ({ data: { user: { id } }, error: null }) } },
    };
    const plan = mockResponse();
    await handleEntitlement({ method: 'GET', headers: { authorization: 'Bearer contract' }, query: { user_id: 'contract-free-account' } } as never, plan as never, before039 as never);
    assert.equal(plan.statusCode, 200, 'op=entitlement answers before 039');
    assert.equal((plan.body as { tier: string }).tier, 'free');
    const grant = mockResponse();
    await handleAdminEntitlements(
      { method: 'POST', headers: {}, query: {}, body: { action: 'grant', userId: 'contract-owner-account', validUntil: null, note: 'contract' } } as never,
      grant as never,
      before039 as never,
    );
    assert.equal(grant.statusCode, 503);
    assert.equal((grant.body as { error: { code: string } }).error.code, 'migration_required', 'the admin grant names the missing migration');
  }
}

/** Billing (#221, handoff section 3). The behaviour itself is proven by
 * `npm run test:billing`; these are the structural rules around it. */
function billingContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const listFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
  // Checkout is off unless the deployment says otherwise, and only the server
  // holds a Stripe key.
  assert.deepEqual(publicBillingSettings({}), { enabled: false, cancellable: false, cancelByEmail: false, seller: null }, 'billing defaults to off');
  assert.equal(publicBillingSettings({ BILLING_ENABLED: 'true' }).enabled, false, 'BILLING_ENABLED alone sells nothing');
  assert.equal(
    DEFAULT_PUBLIC_ORIGIN,
    read('client/src/lib/publicMetadata.ts').match(/PUBLIC_ORIGIN = '([^']+)'/)?.[1],
    'Stripe returns buyers to the canonical origin',
  );
  const userOps = read('api/user/[op].ts');
  for (const op of ['billing-checkout', 'billing-portal', 'billing-webhook', 'billing-cancel']) {
    assert.match(userOps, new RegExp(`op === '${op}'`), `${op} is a branch of api/user/[op].ts, not a new handler`);
  }
  assert.match(userOps, /op !== 'billing-webhook' &&\s*!\(await enforceRateLimit/, 'the signed webhook skips the per-address limiter');
  // Hosted Checkout and Portal only: no Stripe.js, no iframe, the CSP untouched.
  const clientPackage = read('client/package.json');
  assert.doesNotMatch(clientPackage, /stripe/i, 'the browser bundle carries no Stripe library');
  for (const file of listFiles(join(process.cwd(), 'client/src')).filter((path) => /\.(tsx?|css|html)$/.test(path))) {
    assert.doesNotMatch(read(file.slice(process.cwd().length + 1)), /js\.stripe\.com|@stripe\//, `${file} loads no Stripe script`);
  }
  const csp = read('vercel.json');
  assert.doesNotMatch(csp, /stripe/i, 'the CSP names no Stripe host');
  // Billing changes entitlements and nothing else.
  for (const file of listFiles(join(process.cwd(), 'lib/billing'))) {
    const source = read(file.slice(process.cwd().length + 1));
    assert.doesNotMatch(source, /user_xp|user_stats|user_category_stats|user_streak|roadmap_progress|coding_progress|token_ledger|token_balances|creditVerifiedXp|coding\/grade/, `${file} touches no learning, score or wallet data`);
  }
  for (const file of ['lib/coding/grade.ts', 'api/leaderboard.ts', 'api/quiz/submit.ts', 'api/play/[action].ts']) {
    assert.doesNotMatch(read(file), /lib\/billing/, `${file} grades or ranks and never reads billing`);
  }
}

/** Public copy, /premium and the legal pages (#222, handoff section 4). */
function publicCopyContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  // devShark is freemium: no shipped English string may still promise that
  // everything is free (the Czech dictionary is retained and unshipped).
  for (const [key, value] of Object.entries(ENGLISH)) {
    assert.doesNotMatch(value, /free forever|\bis free\b|free, forever|\$0\b|charges for none/i, `${key} still says devShark is free`);
  }
  // The sentence the buyer ticks in Checkout is the one /premium and the
  // Terms quote, word for word.
  assert.equal(ENGLISH['premium.page.waiver'], WAIVER_TEXT, 'the waiver on /premium and in the Terms matches Checkout');
  // Every price the pages print says VAT included next to it.
  for (const key of ['home.pledge', 'landing.compare.premiumCaption', 'premium.page.monthlyRenews', 'premium.page.annualRenews', 'premium.sheet.price'] as const) {
    assert.match(ENGLISH[key], /VAT included/, `${key} states the price with VAT`);
  }
  // Redemption ships closed (DEFAULT_MERCH_SETTINGS.enabled is false), so
  // every place that sells Premium with merchandise says it depends on
  // redemption opening, and the Terms name the coin and merchandise benefit
  // (review finding product-6).
  assert.equal(DEFAULT_MERCH_SETTINGS.enabled, false);
  for (const key of ['premium.sheet.include6', 'landing.compare.premiumCoins'] as const) {
    assert.match(ENGLISH[key], /once redemption opens/, `${key} qualifies the merchandise claim`);
  }
  assert.match(read('client/src/components/landing/ComparisonTable.tsx'), /labelKey: 'landing\.compare\.rowCoins', free: NO, premium: \{ mark: 'yes', key: 'landing\.compare\.premiumCoins' \}/);
  assert.match(ENGLISH['legal.terms.plans.premium'], /redeem coins for devShark merchandise once redemption opens/);
  // Coding hints are authored text that nobody has reviewed yet; the privacy
  // policy must not say people wrote them by hand (review finding product-8).
  assert.doesNotMatch(ENGLISH['legal.privacy.ai.body'], /by hand|people write/i);
  assert.match(ENGLISH['legal.privacy.ai.body'], /no AI feature/);
  // The cancellation page stores the address typed there with its request,
  // and the privacy policy says how long (review finding integrity-1): the
  // next request purges every row a day past its expiry.
  assert.match(ENGLISH['legal.privacy.email.body'], /single-use link that confirms a request, to the address typed on the page/);
  assert.match(ENGLISH['legal.privacy.email.body'], /deletes both with the first request made on the page once the link has been expired for a day/);
  assert.match(read('supabase/supabase-schema-039.sql'), /DELETE FROM public\.billing_cancel_requests WHERE expires_at < NOW\(\) - INTERVAL '1 day';/, 'the purge the privacy policy promises');
  // No urgency, countdowns or fake scarcity on the pages that sell.
  for (const [key, value] of Object.entries(ENGLISH)) {
    if (!/^(premium\.|landing\.compare\.|landing\.founder\.|home\.pledge|billing\.checkout\.)/.test(key)) continue;
    assert.doesNotMatch(value, /\b(hurry|only \d+ left|limited time|ends soon|last chance|act now|today only)\b/i, `${key} uses urgency copy`);
  }
  // The routes exist, the public ones have static HTML on Vercel, and the
  // Stripe return page stays out of search.
  const app = read('client/src/App.tsx');
  for (const path of ['/premium', '/premium/success', '/premium/cancel']) {
    assert.match(app, new RegExp(`<Route path="${path}" element=`), `${path} is a route`);
  }
  assert.match(app, /<Route path="\/support" element={<Navigate to="\/premium" replace \/>} \/>/, '/support redirects to /premium');
  // The voluntary-support page is retired (#222), and the quiz prompt that
  // sent learners to it went too (#230): no screen links to /support.
  const clientSources = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? clientSources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
  for (const file of clientSources(join(process.cwd(), 'client/src'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /navigate\(\s*['"]\/support['"]|\bto[=:]\s*\{?\s*['"]\/support['"]|href=["']\/support["']/, `${file} links to the retired /support page`);
  }
  assert.match(app, /to: '\/premium', key: 'nav\.premium'/, 'Premium sits in the navigation');
  const rewrites = (JSON.parse(read('vercel.json')) as { rewrites: { source: string; destination: string }[] }).rewrites;
  for (const page of PUBLIC_PAGES) {
    assert.ok(rewrites.some((rule) => rule.source === page.path && rule.destination === `${page.path}/index.html`), `${page.path} serves its static HTML`);
  }
  assert.deepEqual([...NOINDEX_PATHS], ['/premium/success']);
  const schema = premiumSchema('Premium', 'Premium', 'https://devshark.app/premium');
  assert.equal(schema.isAccessibleForFree, false, 'Premium is not free to access');
  assert.ok(schema.offers.every((offer) => offer.priceSpecification.valueAddedTaxIncluded), 'the offers include VAT');
  // The trader is either unset or set, never a placeholder the page would print.
  for (const [field, value] of Object.entries(TRADER)) {
    assert.ok(value === null || (typeof value === 'string' && value.trim().length > 2 && !/todo|tbd|xxx|example|\[/i.test(value)), `TRADER.${field} is null or a real value`);
  }
  // The EU ODR platform closed on 20 July 2025; linking to it now misleads.
  assert.doesNotMatch(read('client/src/components/LegalPages.tsx'), /ec\.europa\.eu\/consumers\/odr/, 'no link to the closed ODR platform');
}

/** Coins (#227, handoff section 7). Replays credit nothing, only
 * service-role routines credit, Premium doubles at credit time, and the
 * four streak-protection bounds still hold. The behaviour against a real
 * database is proven by the migration 041 proof (docs/release-acceptance.md). */
function coinsContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const listFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

  // 1. The rates are the handoff's, and the social grant pays nothing.
  assert.deepEqual(DEFAULT_COIN_SETTINGS, {
    xpRate: 0.1,
    premiumMultiplier: 2,
    dailyXpCap: 400,
    welcomeGrant: 200,
    streakMilestones: [{ days: 7, coins: 25 }, { days: 30, coins: 100 }, { days: 100, coins: 300 }],
    topicComplete: 100,
    projectComplete: 150,
    shortPathComplete: 50,
    monthTop: [300, 200, 100],
    socialVisitGrant: 0,
    referralGrant: 100,
    referralCap: 20,
  });
  assert.equal(coinsForVerifiedXp(100, false), 10, 'every account earns 10 % of verified XP');
  assert.equal(coinsForVerifiedXp(100, true), 20, 'Premium doubles it');
  assert.equal(coinsUnderDailyCap(200, 300), 100, 'the daily cap applies after the doubling');
  assert.equal(coinsUnderDailyCap(50, 400), 0);
  // The game settings mirror the rates; a missing or bad social grant is 0.
  assert.deepEqual(normalizeSettings({}).coins, DEFAULT_COIN_SETTINGS);
  assert.equal(normalizeSettings({ coins: { socialVisitGrant: 'lots' } }).coins.socialVisitGrant, 0);
  assert.equal(normalizeSettings({ coins: { socialVisitGrant: 5, xpRate: 7, premiumMultiplier: 50 } }).coins.socialVisitGrant, 5);
  assert.equal(normalizeSettings({ coins: { xpRate: 7 } }).coins.xpRate, 0.1, 'a rate above 100 % is refused');
  assert.equal(normalizeSettings({ coins: { premiumMultiplier: 50 } }).coins.premiumMultiplier, 5, 'the multiplier is clamped');
  assert.deepEqual(
    normalizeSettings({ coins: { streakMilestones: [{ days: 7 }] } }).coins.streakMilestones,
    DEFAULT_COIN_SETTINGS.streakMilestones,
    'a malformed milestone list falls back as a whole',
  );

  // 2. Replaying any award, milestone or grant credits nothing: every event id
  // is derived from what the server verified, never drawn at random.
  const user = '00000000-0000-0000-0000-0000000000aa';
  assert.equal(learnAwardId(user, 'html', 'level', 3), learnAwardId(user, 'html', 'level', 3));
  assert.equal(learnAwardId(user, 'html', 'level', 3), `learn:${user}:html:L3`);
  assert.notEqual(learnAwardId(user, 'html', 'level', 3), learnAwardId(user, 'html', 'checkpoint', 3));
  assert.equal(codingAwardId(user, 'js-digit-sum'), `coding:${user}:js-digit-sum`);
  assert.match(accountKey('x'.repeat(100)), /^[0-9a-f]{32}$/, 'a long account id is hashed, as token_account_key does');
  assert.equal(learnLevelXp(1), 50);
  assert.equal(learnLevelXp(25), 250);
  assert.equal(learnCheckpointXp(3), 900);
  assert.equal(previousMonth(new Date('2026-01-03T00:00:00Z')), '2025-12');
  assert.equal(previousMonth(new Date('2026-09-25T12:00:00Z')), '2026-08');
  const migration = read('supabase/supabase-schema-041.sql');
  const routine = (name: string) => {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.ok(start >= 0, `migration 041 defines ${name}`);
    return migration.slice(start, migration.indexOf('$$;', start));
  };
  const credit = routine('credit_verified_xp_tokens');
  assert.match(credit, /FROM public\.token_xp_credits WHERE event_id = v_event;\s*IF FOUND THEN RETURN 0;/, 'a replayed award returns 0');
  assert.match(credit, /FROM public\.token_ledger WHERE event_id = v_event;\s*IF FOUND THEN RETURN 0;/, 'an award credited before 041 is not credited again');
  assert.match(credit, /v_event := 'xp:' \|\| p_award_id;/, 'the ledger event is the award id, as before');
  assert.match(credit, /pg_advisory_xact_lock/, 'one account credits one at a time, so the cap cannot be raced');
  // Premium doubles at credit time, inside the routine and nowhere else.
  assert.match(credit, /IF public\.is_premium\(p_user_id\) THEN v_mult := p_premium_multiplier;/);
  assert.match(credit, /LEAST\(v_base \* v_mult, p_daily_cap - v_used\)/, 'the cap applies after the doubling');
  const milestones = routine('settle_coin_milestones');
  for (const key of ["'streak:' || v_days || ':' || v_key", "'topic:' || v_topic || ':' || v_key", "'project:' || v_id || ':' || v_key"]) {
    assert.ok(milestones.includes(key), `milestone event ${key} is one per account`);
  }
  assert.match(milestones, /v_premium := public\.is_premium\(p_user_id\);/, 'milestones read the plan in the database');
  const month = routine('settle_month_top3');
  assert.match(month, /ON CONFLICT \(month\) DO NOTHING;[\s\S]*IF v_inserted = 0 THEN/, 'a month settles once');
  assert.ok(month.includes("'month-top:' || p_month || ':' || v_row.rnk"), 'one event per month and rank');
  assert.match(month, /ORDER BY SUM\(a\.correct\) DESC, SUM\(a\.answered\) ASC/, 'the month board ranks like every other board');
  assert.doesNotMatch(month, /streak|quest_xp|user_xp/i, 'the month board never ranks by streak or XP');
  assert.match(routine('credit_social_visit'), /IF p_amount = 0 THEN RETURN FALSE;/, 'a zero grant credits nothing');
  assert.match(routine('record_coding_verdict'), /'coding:' \|\| public\.token_account_key\(p_user_id\) \|\| ':' \|\| p_task_id/,
    'coding XP is awarded once per account and task, not once per task');
  // Every credit goes through the ledger routine whose event id is its key.
  const ledger = read('supabase/supabase-schema-028.sql');
  assert.match(ledger, /ON CONFLICT \(event_id\) DO NOTHING;\s*GET DIAGNOSTICS v_applied = ROW_COUNT;\s*IF v_applied = 0 THEN RETURN FALSE;/);

  // 3. Only service-role routines credit, and they write no learning table.
  for (const name of ['credit_verified_xp_tokens', 'settle_coin_milestones', 'settle_month_top3', 'credit_social_visit', 'delete_coin_data', 'record_coding_verdict', 'revoke_premium_benefits']) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]*\\)\\s*FROM PUBLIC, anon, authenticated;`), `${name} is revoked from browsers`);
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]*\\)\\s*TO service_role;`), `${name} is service-role only`);
    assert.match(routine(name), /SECURITY DEFINER\s*SET search_path = ''/, `${name} pins its search_path`);
  }
  for (const name of ['credit_verified_xp_tokens', 'settle_coin_milestones', 'settle_month_top3', 'credit_social_visit', 'revoke_premium_benefits']) {
    assert.doesNotMatch(routine(name), /(INSERT INTO|UPDATE|DELETE FROM) public\.(user_xp|user_stats|user_streak|roadmap_progress|coding_progress|user_category_stats|user_activity_days)/,
      `${name} reads progress and never writes it`);
  }
  // A revoked subscription takes back only what Premium paid while it was live
  // (review finding integrity-3): redemptions still waiting, through the
  // routine that returns their coins, and one debit with a fixed event id.
  const takeBack = routine('revoke_premium_benefits');
  assert.match(takeBack, /IF NOT FOUND OR v_grant\.status <> 'revoked' THEN/, 'only a revoked grant takes anything back');
  assert.match(takeBack, /IF public\.is_premium\(v_grant\.user_id\) THEN/, 'nothing while another grant keeps the account Premium');
  assert.match(takeBack, /o\.created_at >= v_grant\.created_at/, 'only orders placed while the grant existed');
  assert.match(takeBack, /public\.cancel_merch_order\(v_order, v_grant\.user_id, p_subject\)/);
  assert.match(takeBack, /NOT EXISTS \(SELECT 1 FROM public\.path_reward_claims c WHERE c\.order_id = o\.order_id\)/, 'a path package stays');
  assert.match(takeBack, /o\.payment_kind = 'tokens'/, 'an order paid with money stays');
  assert.match(takeBack, /v_debit := LEAST\(v_owed, COALESCE\(v_balance, 0\)\)/, 'the debit never drives a balance below zero');
  assert.ok(takeBack.includes("v_event := 'revoke:' || replace(v_grant.id::TEXT, '-', '');"), 'one debit per revoked grant');
  assert.match(read('lib/billing/sync.ts'), /await takeBackPremiumBenefits\(deps, result\.subscriptionId\);/, 'every revocation takes the benefits back');
  assert.match(migration, /ALTER TABLE public\.token_xp_credits\s+ENABLE ROW LEVEL SECURITY;/);
  assert.match(migration, /REVOKE ALL ON public\.token_xp_credits\s+FROM PUBLIC, anon, authenticated;/);
  // The browser cannot post a credit: no client file names a credit routine,
  // and the wallet's POST takes a platform, never an amount.
  for (const file of listFiles(join(process.cwd(), 'client/src')).filter((path) => /\.tsx?$/.test(path))) {
    assert.doesNotMatch(read(file.slice(process.cwd().length + 1)),
      /credit_tokens|credit_verified_xp_tokens|settle_coin_milestones|settle_month_top3|credit_social_visit|grant_signup_tokens/,
      `${file} calls no credit routine`);
  }
  const rewardsHandlers = read('lib/rewards/handlers.ts');
  const walletPost = rewardsHandlers.slice(rewardsHandlers.indexOf("if (req.method === 'POST') {", rewardsHandlers.indexOf('export async function handleWallet')));
  assert.doesNotMatch(walletPost.slice(0, walletPost.indexOf('res.setHeader(\'Allow\'')), /body\.(amount|coins|tokens|xp)/, 'the wallet POST never reads an amount');
  assert.match(read('client/src/lib/rewards.ts'), /JSON\.stringify\(\{ claim: 'social', platform \}\)/);

  // 4. Merchandise is Premium only, and the refusal comes before the address.
  const orders = rewardsHandlers.slice(rewardsHandlers.indexOf('export async function handleOrders'));
  const gate = orders.indexOf("refuseLocked(res, userId, { kind: 'merch-redemption'");
  assert.ok(gate > 0 && gate < orders.indexOf('validateAddress(body.address)'), 'a free account gets 402 before it is asked for an address');
  assert.equal(contentTier({ kind: 'merch-redemption', sku: 'mug' }, serverContentIndex()), 'premium');
  // The crown and streak protection stay open to every account.
  for (const handler of ['handleCosmetic', 'handleStreakProtection']) {
    const body = rewardsHandlers.slice(rewardsHandlers.indexOf(`export async function ${handler}`));
    assert.doesNotMatch(body.slice(0, body.indexOf('\n}\n')), /refuseLocked|resolveTier/, `${handler} is not Premium only`);
  }

  // 5. The browser wallet is retired, and the welcome coins are the server's.
  const tokens = read('client/src/lib/tokens.ts');
  assert.doesNotMatch(tokens, /export function (awardTokens|spendTokens|grantRegistrationBonusIfNew|useTokens|getTokens)/);
  assert.doesNotMatch(read('client/src/lib/xp.ts'), /awardTokens|tokensFromXp/, 'XP gains award no browser tokens');
  assert.doesNotMatch(read('client/src/App.tsx'), /grantRegistrationBonusIfNew/);
  assert.match(rewardsHandlers, /supabase\.rpc\('grant_signup_tokens'/, 'the wallet read pays the welcome coins');

  // 6. The UI says coins and Rewards; the code keeps `token`.
  assert.equal(ENGLISH['nav.shop'], 'Rewards');
  assert.equal(ENGLISH['shop.tokensUnit'], 'coins');
  for (const [key, value] of Object.entries(ENGLISH)) {
    if (!/^(shop\.|rewards\.|register\.|auth\.signupBonus)/.test(key) || /^shop\.item\./.test(key)) continue;
    assert.doesNotMatch(value.replace(/\{\w+\}/g, ''), /\btokens?\b/i, `${key} says tokens; the product says coins`);
  }
  assert.match(read('docs/product-architecture.md'), /the UI calls it \*\*Coins\*\*/, 'the naming rule is written down');

  // 7. The social links reward nothing by default and never ask for a follow.
  assert.deepEqual(Object.keys(SOCIAL_PROFILES).sort(), [...SOCIAL_PLATFORMS].sort(), 'one URL per platform, in the catalogue');
  for (const [key, value] of Object.entries(ENGLISH)) {
    assert.doesNotMatch(value, /follow (us )?to earn|follow .* (for|to get) (coins|a reward)/i, `${key} pays for a follow`);
  }

  // 8. Milestones cover every evolving project and short path, priced by kind.
  const config = milestoneConfig(DEFAULT_COIN_SETTINGS) as { projects: { id: string; coins: number }[] };
  assert.equal(config.projects.length, EVOLVING_CHALLENGES.length);
  for (const challenge of EVOLVING_CHALLENGES) {
    const entry = config.projects.find((one) => one.id === challenge.id);
    assert.equal(entry?.coins, challenge.short ? 50 : 150, `${challenge.id} pays ${challenge.short ? 'a short path' : 'a project'}`);
  }

  // 9. Streak protection keeps its four bounds with coins in place of tokens:
  // the cap is two, there is no cash price, a protection changes the day count
  // only, and no board ranks by streak. (The bounds themselves are asserted
  // above; this checks the coin work did not reopen them.)
  assert.equal(STREAK_PROTECTION_CAP, 2);
  assert.doesNotMatch(read('shared/rewards.ts'), /streakProtection(Price|Cash|Minor)/);
  assert.match(read('shared/rewards.ts'), /No money buys a\s+\*\s+protection/);
}

/** Invitations (#228, handoff section 7.2). 100 coins to each side, once,
 * after the friend's first Learn level; self-referral and a second completion
 * credit nothing; the cap holds; the grant routine writes only ledger tables;
 * the inviter never learns who a friend is. The behaviour against a real
 * database is proven by the migration 042 proof (docs/release-acceptance.md). */
async function referralContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const listFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

  // 1. The rules: 100 to each side, 20 friends per inviter, a 48-hour sign-up
  // window, and the settings mirror clamps them.
  assert.equal(DEFAULT_COIN_SETTINGS.referralGrant, 100);
  assert.equal(DEFAULT_COIN_SETTINGS.referralCap, 20);
  assert.equal(REFERRAL_SIGNUP_WINDOW_HOURS, 48);
  assert.equal(normalizeSettings({ coins: { referralGrant: 'lots' } }).coins.referralGrant, 100, 'a malformed grant falls back');
  assert.equal(normalizeSettings({ coins: { referralGrant: -5 } }).coins.referralGrant, 0, 'a negative grant clamps to off');
  assert.equal(normalizeSettings({ coins: { referralCap: 5000 } }).coins.referralCap, 1000, 'the cap is clamped');
  assert.equal(normalizeSettings({ coins: { referralGrant: 0 } }).coins.referralGrant, 0, '0 turns invitations off');
  assert.ok(isReferralCode('ge04xtw4'));
  for (const bad of ['GE04XTW4', 'ge04xtw', 'ge04xtwil', 'ge04xtwl', 'ge04-tw4', '', null]) {
    assert.equal(isReferralCode(bad), false, `${String(bad)} is not a code`);
  }

  // 2. The migration: service-role routines, RLS on, no browser read of who
  // invited whom, and the ledger reasons of 041 kept.
  const migration = read('supabase/supabase-schema-042.sql');
  const routine = (name: string) => {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.ok(start >= 0, `migration 042 defines ${name}`);
    return migration.slice(start, migration.indexOf('$$;', start));
  };
  // The reason check is rebuilt from what it already allows plus 042's list,
  // so no order of re-running 041 and 042 narrows it (review finding data-3).
  for (const [file, reasons] of [
    ['supabase/supabase-schema-041.sql', "'signup', 'verified-xp', 'purchase', 'refund', 'adjustment', 'milestone', 'social'"],
    ['supabase/supabase-schema-042.sql', "'signup', 'verified-xp', 'purchase', 'refund', 'adjustment', 'milestone', 'social', 'referral'"],
  ] as const) {
    const source = read(file);
    assert.ok(source.includes(`v_reasons TEXT[] := ARRAY[${reasons}];`), `${file} names its reasons`);
    assert.match(source, /SELECT pg_get_constraintdef\(c\.oid\) INTO v_current[\s\S]*?regexp_matches\(COALESCE\(v_current, ''\)/, `${file} keeps the reasons the check already allows`);
    assert.doesNotMatch(source, /ADD CONSTRAINT token_ledger_reason_check\s+CHECK \(reason IN \('/, `${file} never restates the check from a fixed list alone`);
  }
  for (const name of ['referral_summary', 'record_referral', 'credit_referral', 'delete_referral_data']) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]*\\) FROM PUBLIC, anon, authenticated;`), `${name} is revoked from browsers`);
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]*\\) TO service_role;`), `${name} is service-role only`);
    assert.match(routine(name), /SECURITY DEFINER\s*SET search_path = ''/, `${name} pins its search_path`);
  }
  assert.match(migration, /ALTER TABLE public\.referrals\s+ENABLE ROW LEVEL SECURITY;/);
  assert.match(migration, /ALTER TABLE public\.referral_codes ENABLE ROW LEVEL SECURITY;/);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]*ON public\.referrals\b/, 'no browser policy reads who invited whom');
  assert.doesNotMatch(migration, /GRANT [A-Z, ]+ ON public\.referrals TO/, 'no browser grant on referrals');
  assert.match(migration, /CHECK \(invitee_user_id <> referrer_user_id\)/, 'a row can never refer an account to itself');

  // 3. The grant routine writes only ledger tables: the referral row, and the
  // wallet through credit_tokens, which writes token_ledger and token_balances.
  const credit = routine('credit_referral');
  const writes = (body: string) => [...new Set([...body.matchAll(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+public\.([a-z_]+)/g)].map((m) => m[1]))].sort();
  assert.deepEqual(writes(credit), ['referrals'], 'credit_referral writes only the referral row directly');
  assert.deepEqual([...new Set([...credit.slice(credit.indexOf('AS $$')).matchAll(/public\.([a-z_]+)\(/g)].map((m) => m[1]))].sort(), ['credit_tokens', 'token_account_key'],
    'credit_referral calls only the ledger routine');
  const ledger = read('supabase/supabase-schema-028.sql');
  const creditTokens = ledger.slice(ledger.indexOf('CREATE OR REPLACE FUNCTION public.credit_tokens('), ledger.indexOf('$$;', ledger.indexOf('CREATE OR REPLACE FUNCTION public.credit_tokens(')));
  assert.deepEqual(writes(creditTokens), ['token_balances', 'token_ledger'], 'credit_tokens writes the wallet and nothing else');
  assert.deepEqual(writes(routine('record_referral')), ['referrals']);
  assert.deepEqual(writes(routine('referral_summary')), ['referral_codes']);
  // Once per friend, both sides; nothing before a passed Learn level.
  assert.match(credit, /FROM public\.referrals WHERE invitee_user_id = p_invitee FOR UPDATE;/, 'the friend\'s row is locked while it settles');
  assert.match(credit, /IF v_row\.credited_at IS NOT NULL THEN RETURN 'already';/, 'a second completion credits nothing');
  assert.match(credit, /jsonb_path_exists\(v_data, '\$\.\*\.levels\.\*\.passed \? \(@ == true\)'\)/, 'the grant waits for a passed Learn level');
  assert.ok(credit.includes("'referral:' || public.token_account_key(p_invitee)"), 'the friend\'s event is referral:<invitee>');
  assert.ok(credit.includes("'referral:friend:' || v_row.credit_key"), 'the inviter\'s event carries a random key, never the friend\'s id');
  // The cap counts the inviter's own ledger, one friend at a time.
  assert.match(credit, /pg_advisory_xact_lock\(hashtextextended\('referral:' \|\| v_row\.referrer_user_id, 0\)\)/);
  assert.match(credit, /IF v_paid < p_cap THEN/, 'the inviter is paid only under the cap');
  // Self-referral and a sign-up window are decided when the code is bound.
  const record = routine('record_referral');
  assert.match(record, /IF v_referrer = p_invitee THEN RETURN 'self';/, 'the account\'s own code binds nothing');
  // Two accounts offering each other's code at once run one after the other
  // (review finding integrity-6): the unordered pair is locked before the
  // reverse-pair check.
  const pairLock = record.indexOf("'referral-pair:' || LEAST(p_invitee, v_referrer) || ':' || GREATEST(p_invitee, v_referrer)");
  assert.ok(pairLock > 0, 'record_referral locks the unordered pair');
  assert.ok(pairLock < record.indexOf('WHERE invitee_user_id = v_referrer AND referrer_user_id = p_invitee'), 'the lock comes before the reverse-pair check');
  assert.match(record, /p_account_created_at < NOW\(\) - make_interval\(hours => p_window_hours\)/, 'only a new account binds a code');

  // 4. The server: credits ride on verified work, and the code's creation time
  // comes from the verified token.
  assert.match(read('api/user/[op].ts'), /if \(op === 'referral'\) return handleReferral\(req, res, supabase\);/);
  assert.match(read('supabase/supabase-schema-044.sql'), /DELETE FROM public\.referral_codes WHERE user_id = p_user_id;/, 'account deletion removes the referral data');
  assert.match(read('api/quiz/roadmap.ts'), /await creditReferral\(supabase, userId, session\.subject!\);/, 'a first Learn pass settles an invitation');
  assert.match(read('lib/rewards/handlers.ts'), /creditReferral\(supabase, userId, subject\)/, 'the wallet read settles an invitation');
  assert.equal(accountCreatedAt({ created_at: '2026-09-25T10:00:00Z' }), '2026-09-25T10:00:00.000Z');
  assert.equal(accountCreatedAt({}), null);
  assert.equal(accountCreatedAt({ created_at: 'yesterday' }), null);
  for (const file of listFiles(join(process.cwd(), 'client/src')).filter((path) => /\.tsx?$/.test(path))) {
    assert.doesNotMatch(read(file.slice(process.cwd().length + 1)), /credit_referral|record_referral|referral_summary/, `${file} calls no referral routine`);
  }
  assert.match(read('client/src/lib/referral.ts'), /body: JSON\.stringify\(\{ code \}\)/, 'the browser sends the code and nothing else');

  // 5. The handler, against a stand-in database: the GET sends counts and no
  // account id, the POST takes the creation time from the token and never from
  // the body, and it asks for no amount.
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const fake = {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        if (fn === 'referral_summary') {
          return { data: { code: 'abcd2345', credited: 3, pending: 1, invited: null, invitee_user_id: 'leak', friends: ['someone'] }, error: null };
        }
        if (fn === 'record_referral') return { data: 'recorded', error: null };
        if (fn === 'credit_referral') return { data: 'waiting', error: null };
        return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` } };
      },
    };
    const request = (method: string, body?: Record<string, unknown>) => ({
      method, headers: {}, query: { op: 'referral', user_id: 'contract-referral-account' },
      body: body ? { ...body, user_id: 'contract-referral-account' } : undefined,
    });
    const get = mockResponse();
    await handleReferral(request('GET') as never, get as never, fake as never);
    assert.equal(get.statusCode, 200);
    assert.deepEqual(get.body, { enabled: true, code: 'abcd2345', coins: 100, cap: 20, credited: 3, pending: 1, invited: null },
      'the invite summary carries counts and no account id');
    calls.length = 0;
    const post = mockResponse();
    await handleReferral(request('POST', { code: ' ABCD2345 ', created_at: new Date().toISOString(), amount: 5000 }) as never, post as never, fake as never);
    assert.equal(post.statusCode, 200);
    assert.deepEqual(post.body, { status: 'recorded', coins: 100 });
    const recorded = calls.find((call) => call.fn === 'record_referral');
    assert.equal(recorded?.args.p_code, 'abcd2345');
    assert.equal(recorded?.args.p_account_created_at, null, 'a creation time in the body is ignored');
    assert.equal(recorded?.args.p_window_hours, 48);
    const settled = calls.find((call) => call.fn === 'credit_referral');
    assert.deepEqual(settled?.args, { p_invitee: 'contract-referral-account', p_subject: 'webdev', p_amount: 100, p_cap: 20 },
      'the amount comes from settings, never from the request');
    calls.length = 0;
    const bad = mockResponse();
    await handleReferral(request('POST', { code: 'nope' }) as never, bad as never, fake as never);
    assert.equal(bad.statusCode, 400);
    assert.equal(calls.length, 0, 'a malformed code reaches no routine');
  }

  // 6. Copy: the ledger line the issue names, and the unit is coins.
  assert.equal(ENGLISH['rewards.ledger.referralFriend'], 'Referral: a friend finished their first level');
  assert.equal(ENGLISH['shop.reason.referral'], 'Referral');
  assert.match(read('client/src/components/Shop.tsx'), /reference === 'referral:friend' \? t\('rewards\.ledger\.referralFriend'\)/);
}

/** Merchandise through Spreadshop (#229, handoff section 8). */
async function merchContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const listFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

  // 1. The catalogue: a hoodie in the t-shirt sizes, the cap kept and unpriced,
  // nothing priced by default and cash checkout off.
  assert.ok(MERCH_SKUS.includes('hoodie'), 'the hoodie is a SKU');
  assert.deepEqual(MERCH_CATALOGUE.find((item) => item.sku === 'hoodie')?.variants, SHIRT_SIZES);
  assert.ok(MERCH_SKUS.includes('cap'), 'the cap stays in the catalogue');
  assert.deepEqual(normalizeSettings({}).merch.pricing, {}, 'no item ships with a price, the cap included');
  assert.equal(DEFAULT_MERCH_SETTINGS.cashCheckoutEnabled, false, 'cash is paid in the Spreadshop checkout');
  assert.equal(normalizeSettings({}).merch.cashCheckoutEnabled, false);

  // 2. Migration 043: both SKU checks name exactly the catalogue, the stock
  // routine takes the catalogue's sizes, and every routine is service-role only.
  const migration = read('supabase/supabase-schema-043.sql');
  const checks = [...migration.matchAll(/ADD CONSTRAINT (merch_stock_sku_check|merch_order_items_sku_check)\s+CHECK \(sku IN \(([^)]*)\)\)/g)];
  assert.equal(checks.length, 2, 'migration 043 restates both SKU checks');
  for (const [, name, list] of checks) {
    assert.deepEqual(list.split(',').map((one) => one.trim().replace(/'/g, '')), [...MERCH_SKUS], `${name} lists exactly MERCH_SKUS`);
  }
  assert.match(migration, /v_variant NOT IN \('S', 'M', 'L', 'XL', 'XXL'\)/);
  assert.deepEqual([...SHIRT_SIZES], ['S', 'M', 'L', 'XL', 'XXL'], 'set_merch_stock and the catalogue agree on sizes');
  for (const name of ['set_merch_stock', 'advance_merch_order', 'cancel_merch_order']) {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.ok(start >= 0, `migration 043 defines ${name}`);
    const body = migration.slice(start, migration.indexOf('$$;', start));
    assert.match(body, /SECURITY DEFINER\s+SET search_path = ''/, `${name} is a definer routine with an empty search_path`);
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`), `${name} is revoked from browsers`);
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO service_role;`), `${name} runs as the service role`);
  }
  assert.match(migration, /IF FOUND AND p_on_hand < v_reserved THEN\s+RAISE EXCEPTION 'below_reserved'/, 'a cap never drops below paid orders');
  assert.match(migration, /path_reward_claims c WHERE c\.order_id = p_order_id/, 'a package is known by its claim, not by its id');
  assert.doesNotMatch(migration, /CREATE POLICY|user_xp|roadmap_progress|coding_progress|token_ledger/, '043 adds no policy and touches no learning table or wallet row');

  // 3. The shop links live in client/product-catalog.ts alone, empty until the
  // owner sets them, https when set, and nothing embeds Spreadshop.
  assert.deepEqual(Object.keys(MERCH_SHOP.products).sort(), [...MERCH_SKUS].sort(), 'one product URL per SKU, in the catalogue');
  for (const url of [MERCH_SHOP.shopUrl, ...Object.values(MERCH_SHOP.products)]) {
    if (url !== null) assert.match(url, /^https:\/\/[^\s"'<>]+$/, `${url} must be an https URL`);
  }
  const clientFiles = [
    ...listFiles(join(process.cwd(), 'client/src')).filter((path) => /\.(tsx?|css|html)$/.test(path)),
    join(process.cwd(), 'client/index.html'),
  ];
  for (const file of clientFiles) {
    const source = read(file.slice(process.cwd().length + 1));
    assert.doesNotMatch(source, /https?:\/\/[^\s"'`]*(spreadshop|spreadshirt|sprd\.net)/i, `${file} defines no Spreadshop URL; client/product-catalog.ts does`);
    assert.doesNotMatch(source, /currentPromotion|SPREADSHOP_API_KEY/, `${file} never calls the Spreadshop API`);
  }
  assert.doesNotMatch(read('vercel.json'), /spread|sprd/i, 'the CSP names no Spreadshop host');
  assert.match(read('client/src/lib/merchImages.ts'), /: \{\};/, 'a SKU without a mockup gets no image, not a placeholder');
  let merchFiles: string[] = [];
  try { merchFiles = readdirSync(join(process.cwd(), 'client/public/merch')); } catch { merchFiles = []; }
  for (const file of merchFiles) {
    assert.match(file, new RegExp(`^(${MERCH_SKUS.join('|')})\\.(webp|avif|png|jpe?g)$`), `client/public/merch/${file} must be named <sku>.<ext>`);
  }

  // 4. Spreadshop's promotion: read on the server only, parsed defensively,
  // cached, and absent without configuration.
  const now = new Date('2026-09-25T12:00:00Z');
  assert.equal(parseSpreadshopPromotion(404, null, now), null, 'no promotion running');
  assert.deepEqual(
    parseSpreadshopPromotion(200, { description: '15% off everything', validUntil: '2026-09-30T23:59:59', code: 'SHARK15' }, now),
    { description: '15% off everything', code: 'SHARK15', validUntil: '2026-09-30T23:59:59.000Z' },
    'Spreadshop sends UTC without a zone',
  );
  assert.equal(parseSpreadshopPromotion(200, { description: 'Old', validUntil: '2026-09-01T00:00:00', code: 'X1' }, now), null, 'an expired promotion is dropped');
  assert.equal(parseSpreadshopPromotion(200, { description: '', validUntil: '2026-09-30T23:59:59' }, now), null);
  assert.equal(parseSpreadshopPromotion(200, { description: 'x'.repeat(200), validUntil: '2026-09-30T23:59:59' }, now), null);
  assert.equal(parseSpreadshopPromotion(200, { description: 'Deal', validUntil: 'soon' }, now), null);
  assert.equal(parseSpreadshopPromotion(200, { description: 'Deal', validUntil: '2026-09-30T23:59:59', code: '<b>x</b>' }, now)?.code, null);
  assert.equal(spreadshopConfig({}), null);
  assert.equal(spreadshopConfig({ SPREADSHOP_API_KEY: 'dd30b4db-8cd6-4fb8-86b3-e680984b9e18', SPREADSHOP_SHOP_ID: 'not-a-number' }), null);
  const config = spreadshopConfig({
    SPREADSHOP_API_KEY: 'dd30b4db-8cd6-4fb8-86b3-e680984b9e18', SPREADSHOP_SHOP_ID: '100488332', SPREADSHOP_CONTACT_EMAIL: 'shop@example.com',
  });
  assert.equal(config?.url, 'https://api.spreadshirt.net/api/v1/shops/100488332/currentPromotion?mediaType=json');
  assert.equal(config?.headers.Authorization, 'SprdAuth apiKey="dd30b4db-8cd6-4fb8-86b3-e680984b9e18"');
  assert.equal(config?.headers['User-Agent'], 'devShark/1.0 ( https://devshark.app ; shop@example.com )');
  let calls = 0;
  const env = { SPREADSHOP_API_KEY: 'dd30b4db-8cd6-4fb8-86b3-e680984b9e18', SPREADSHOP_SHOP_ID: '100488332' };
  const fakeFetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ description: '15% off everything', validUntil: '2026-09-30T23:59:59', code: 'SHARK15' }), { status: 200 });
  }) as typeof fetch;
  resetMerchPromoCache();
  assert.equal(await getMerchPromo({ env: {}, fetchImpl: fakeFetch }), null);
  assert.equal(calls, 0, 'nothing is fetched without a key and a shop id');
  const clock = { at: now.getTime() };
  const first = await getMerchPromo({ env, fetchImpl: fakeFetch, now: () => new Date(clock.at) });
  const second = await getMerchPromo({ env, fetchImpl: fakeFetch, now: () => new Date(clock.at) });
  assert.equal(first?.code, 'SHARK15');
  assert.deepEqual(second, first);
  assert.equal(calls, 1, 'the answer is cached');
  clock.at += 31 * 60 * 1000;
  await getMerchPromo({ env, fetchImpl: fakeFetch, now: () => new Date(clock.at) });
  assert.equal(calls, 2, 'and refreshed after 30 minutes');
  resetMerchPromoCache();
  const failing = (async () => { throw new Error('offline'); }) as typeof fetch;
  assert.equal(await getMerchPromo({ env, fetchImpl: failing }), null, 'an unreachable Spreadshop means no promotion, never an error');
  resetMerchPromoCache();
  assert.match(read('api/settings.ts'), /merchPromo,/, '/api/settings reports the promotion');

  // 5. Copy: coins redeem items, never discounts. Only Spreadshop's own offer
  // may speak of one, and its note says coins never do.
  for (const [key, value] of Object.entries(ENGLISH)) {
    if (!/^(shop|rewards)\./.test(key) || key.startsWith('shop.promo')) continue;
    assert.doesNotMatch(value, /discount|coupon|voucher|promo code|% off/i, `${key} must not promise a discount`);
  }
  assert.match(ENGLISH['shop.promoNote'], /Coins redeem a whole item, never a discount\./);
  assert.match(ENGLISH['shop.addressNote'], /sprd\.net AG/, 'the form says where the address goes');
  assert.match(ENGLISH['shop.addressNote'], /Deleting your account deletes them/, 'and that it goes with the account');
  assert.equal(ENGLISH['shop.availability.unconfigured'], 'Not on sale yet');
  for (const sku of MERCH_SKUS) {
    assert.ok(ENGLISH[`shop.merch.${sku}.name` as keyof typeof ENGLISH], `${sku} has a name`);
    assert.ok(ENGLISH[`shop.merch.${sku}.alt` as keyof typeof ENGLISH], `${sku} has alt text for its mockup`);
  }

  // 6. The handlers: the 402 still comes before the address, a size is the
  // item's own, and the fulfilment op stays admin-only.
  const handlers = read('lib/rewards/handlers.ts');
  assert.match(handlers, /if \(!item\.variants\.includes\(variant\)\) return null;/, 'a size must be one the item has');
  const fulfilment = handlers.slice(handlers.indexOf('export async function handleFulfilment('));
  assert.match(fulfilment.slice(0, 200), /if \(!\(await requireAdmin\(req, res\)\)\) return;/, 'op=fulfilment checks the admin first');
  assert.match(fulfilment, /supabase\.rpc\('set_merch_stock'/, 'the cap is written by the 043 routine');
}

/* ── Premium vouchers (migration 045) ────────────────────────────────────
 *
 * A signed-in learner redeems a code the owner created, and Premium opens as
 * a promo grant. The migration itself is proven against a real Postgres (the
 * VOUCHER section of docs/release-acceptance.md); these are the structural
 * rules, the code format and the handlers against a stand-in database. */
async function voucherContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const listFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
  const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

  // 1. Migration 045: service-role routines, both tables closed to browsers,
  // no plain code anywhere, and nothing but entitlements touched.
  const sql = read('supabase/supabase-schema-045.sql');
  const code = sql.replace(/--[^\n]*/g, '');
  const routine = (name: string) => {
    const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.ok(start >= 0, `migration 045 defines ${name}`);
    return sql.slice(start, sql.indexOf('$$;', sql.indexOf('AS $$', start)));
  };
  for (const name of ['premium_voucher_json', 'create_premium_voucher', 'list_premium_vouchers', 'revoke_premium_voucher', 'redeem_premium_voucher', 'delete_user_data']) {
    assert.match(routine(name), /SECURITY DEFINER\s+SET search_path = ''/, `${name} is a definer routine with an empty search_path`);
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]*\\) FROM PUBLIC, anon, authenticated;`), `${name} is revoked from browsers`);
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]*\\) TO service_role;`), `${name} runs as the service role`);
  }
  for (const table of ['premium_vouchers', 'premium_voucher_redemptions']) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table}\\s+ENABLE ROW LEVEL SECURITY;`), `${table} has RLS`);
    assert.match(sql, new RegExp(`REVOKE ALL ON public\\.${table}\\s+FROM PUBLIC, anon, authenticated;`), `${table} revokes browser privileges`);
  }
  assert.doesNotMatch(code, /CREATE POLICY/, 'no browser policy reads a voucher or a redemption');
  assert.doesNotMatch(code, /GRANT [A-Z, ]+ ON (TABLE )?public\.premium_/, 'no browser grant on the voucher tables');
  assert.doesNotMatch(code, /TO (anon|authenticated)\b/, 'anon and authenticated hold nothing');
  const table = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS public.premium_vouchers ('), sql.indexOf('\n);', sql.indexOf('CREATE TABLE IF NOT EXISTS public.premium_vouchers (')));
  assert.match(table, /code_hash\s+TEXT NOT NULL UNIQUE CHECK \(code_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/, 'only a SHA-256 in hex fits code_hash');
  assert.match(table, /code_hint\s+TEXT NOT NULL CHECK \(code_hint ~ '\^\[0-9A-Z\]\{4\}\$'\)/, 'the hint is four characters');
  assert.doesNotMatch(table.replace(/--[^\n]*/g, '').replace(/code_(hash|hint)/g, ''), /\bcode\b/, 'no column holds the plain code');
  // The redemption: the row is locked, "already" is told apart, and the grant
  // is a promo grant named by the hint.
  const redeem = routine('redeem_premium_voucher');
  assert.match(redeem, /WHERE code_hash = p_code_hash\s+FOR UPDATE;/, 'the voucher row is locked before its count is read');
  assert.ok(redeem.indexOf("'already'") < redeem.indexOf('v_voucher.redeemed_count >= v_voucher.max_redemptions'), 'an account that redeemed the voucher hears so first');
  assert.match(redeem, /NOT v_voucher\.active\s+OR \(v_voucher\.redeemable_until IS NOT NULL AND v_voucher\.redeemable_until <= NOW\(\)\)\s+OR v_voucher\.redeemed_count >= v_voucher\.max_redemptions THEN\s+RETURN jsonb_build_object\('status', 'invalid'\);/,
    'inactive, expired and used-up codes get the answer an unknown code gets');
  assert.match(redeem, /VALUES \(p_user_id, 'promo', 'active', v_valid_until, 'Voucher ' \|\| v_voucher\.code_hint\)/, 'a promo grant, noted by the hint');
  const writes = (body: string) => [...new Set([...body.matchAll(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+public\.([a-z_]+)/g)].map((m) => m[1]))].sort();
  assert.deepEqual(writes(redeem), ['entitlement_grants', 'premium_voucher_redemptions', 'premium_vouchers'], 'a redemption writes the grant, the count and its row, nothing else');
  assert.deepEqual(writes(routine('create_premium_voucher')), ['premium_vouchers']);
  assert.deepEqual(writes(routine('revoke_premium_voucher')), ['premium_vouchers']);
  // Premium changes which content a learner may start and nothing else: from
  // the tables to the redemption, nothing names a learning, score, streak or
  // wallet table (the guard before them only checks that tables exist, and
  // the erasure after them deletes the account's rows).
  const vouchersPart = code.slice(code.indexOf('CREATE TABLE IF NOT EXISTS public.premium_vouchers ('), code.indexOf('CREATE OR REPLACE FUNCTION public.delete_user_data('));
  for (const learning of ['user_xp', 'user_stats', 'user_category_stats', 'user_streak', 'roadmap_progress', 'coding_progress', 'token_ledger', 'token_balances', 'user_activity_days']) {
    assert.ok(!vouchersPart.includes(learning), `migration 045 must not touch ${learning}`);
  }
  // One erasure routine: 044's body word for word, then the redemptions, and
  // a voucher an erased admin created loses the person.
  const body044 = read('supabase/supabase-schema-044.sql');
  const erasure044 = body044.slice(body044.indexOf('AS $$', body044.indexOf('FUNCTION public.delete_user_data(')), body044.indexOf('$$;', body044.indexOf('FUNCTION public.delete_user_data(')));
  const erasure045 = routine('delete_user_data').slice(routine('delete_user_data').indexOf('AS $$'));
  assert.ok(erasure045.startsWith(erasure044.slice(0, erasure044.lastIndexOf('END;'))), "045 restates 044's delete_user_data unchanged before its own lines");
  assert.match(erasure045, /DELETE FROM public\.premium_voucher_redemptions WHERE user_id = p_user_id;/, 'erasure removes the redemptions');
  assert.match(erasure045, /UPDATE public\.premium_vouchers SET created_by = 'deleted-account' WHERE created_by = p_user_id;/, "and anonymises a voucher's creator");
  assert.match(sql, /grant_id\s+UUID NOT NULL UNIQUE REFERENCES public\.entitlement_grants \(id\) ON DELETE CASCADE/, "039's delete_entitlement_data can still delete a voucher's grant");

  // 2. The code: Crockford base32, twelve characters, normalised the same way
  // everywhere, and stored only as its SHA-256.
  assert.equal(VOUCHER_ALPHABET, '0123456789ABCDEFGHJKMNPQRSTVWXYZ');
  assert.equal(normalizeVoucherCode(' k7q2-abcd 1234 '), 'K7Q2ABCD1234', 'upper case, no spaces or hyphens');
  assert.equal(normalizeVoucherCode('K7Q2\u2013ABCD\u00a01234'), 'K7Q2ABCD1234', 'an en dash and a no-break space from a copy');
  assert.equal(normalizeVoucherCode('ＫＹＱ２ＡＢＣＤ１２３４'), 'KYQ2ABCD1234', 'full-width characters fold to ASCII');
  assert.equal(normalizeVoucherCode('devshark-2026'), 'DEVSHARK2026', 'a custom campaign code');
  for (const bad of ['abc12', 'x'.repeat(33), 'K7Q2!ABCD', 'K7Q2_ABCD', 'čau-2026', '', '      ', 42, null, 'a'.repeat(65)]) {
    assert.equal(normalizeVoucherCode(bad), null, `${JSON.stringify(bad)} is not a code`);
  }
  assert.equal(formatVoucherCode('K7Q2ABCD1234'), 'K7Q2-ABCD-1234');
  assert.equal(voucherHint('K7Q2ABCD1234'), 'K7Q2');
  assert.equal(voucherHash('K7Q2ABCD1234'), '60d3dfedc46956b067ee7e73187990ace1b714c43e5550a5151315ac6cb35e05', "the SHA-256 Postgres's sha256() gives (release acceptance, VOUCHER)");
  const generated = Array.from({ length: 2000 }, () => generateVoucherCode());
  assert.equal(new Set(generated).size, generated.length, 'two thousand generated codes are all different');
  const counts = new Map<string, number>();
  for (const one of generated) {
    assert.match(one, /^[0-9A-HJKMNP-TV-Z]{12}$/, `${one} is twelve Crockford characters`);
    assert.equal(normalizeVoucherCode(formatVoucherCode(one)), one, 'a formatted code normalises back to itself');
    for (const char of one) counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  assert.equal(counts.size, 32, 'every character of the alphabet occurs');
  assert.ok(Math.max(...counts.values()) / Math.min(...counts.values()) < 1.35, 'and about equally often');
  const now = Date.parse('2026-09-26T12:00:00Z');
  const base = { active: true, redeemedCount: 0, maxRedemptions: 1, redeemableUntil: null };
  assert.equal(voucherState(base, now), 'open');
  assert.equal(voucherState({ ...base, redeemedCount: 1 }, now), 'used');
  assert.equal(voucherState({ ...base, redeemableUntil: '2026-09-26T12:00:00Z' }, now), 'expired');
  assert.equal(voucherState({ ...base, active: false, redeemedCount: 1 }, now), 'revoked', 'revoked wins');
  assert.equal(toAdminVoucher({ id: 'x', hint: 'K7Q2', codeHash: 'leak', maxRedemptions: 1, redeemedCount: 0, active: true }, now)!.state, 'open');
  assert.equal('codeHash' in toAdminVoucher({ id: 'x', hint: 'K7Q2', codeHash: 'leak' }, now)!, false, 'the admin shape drops anything else');
  const form = (extra: Record<string, unknown>) => parseVoucherForm({ note: 'For Pavel', ...extra }, now);
  assert.deepEqual(form({}), { ok: true, value: { note: 'For Pavel', premiumDays: null, maxRedemptions: 1, redeemableUntil: null, code: null } }, 'no days means no end; one use by default');
  assert.equal(form({ premiumDays: 30, maxRedemptions: 25, code: 'shark-camp-2026' }).ok, true);
  for (const bad of [{ note: '' }, { note: 'x'.repeat(501) }, { premiumDays: 0 }, { premiumDays: 1831 }, { premiumDays: '30' }, { maxRedemptions: 0 }, { maxRedemptions: 10001 },
    { redeemableUntil: '2026-09-25' }, { redeemableUntil: '2040-01-01' }, { code: 'abc' }, { code: 'no_underscores' }]) {
    assert.equal(form(bad).ok, false, `${JSON.stringify(bad)} is refused`);
  }

  // 3. The routes: a branch of each existing handler, the admin one behind
  // the admin check, and the browser sends the typed code and nothing else.
  const userOps = read('api/user/[op].ts');
  assert.match(userOps, /if \(op === 'voucher'\) return handleVoucherRedeem\(req, res, supabase\);/, 'op=voucher is a branch of api/user/[op].ts');
  const adminOps = read('api/admin/[op].ts');
  assert.ok(adminOps.indexOf('await requireAdmin(req, res)') < adminOps.indexOf("case 'vouchers':"), 'op=vouchers sits behind requireAdmin');
  assert.match(adminOps, /case 'vouchers':\s+return await handleAdminVouchers\(req, res, supabase\);/);
  for (const file of listFiles(join(process.cwd(), 'client/src')).filter((path) => /\.tsx?$/.test(path))) {
    assert.doesNotMatch(read(file.slice(process.cwd().length + 1)), /redeem_premium_voucher|create_premium_voucher|list_premium_vouchers|revoke_premium_voucher/, `${file} calls no voucher routine`);
  }

  if (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) return;

  // 4. The redemption against a stand-in database. Log lines are captured to
  // prove that no code, hash or hint is ever written to them.
  const logged: string[] = [];
  const realLog = console.log;
  console.log = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };
  try {
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const answers = new Map<string, unknown>([
      [voucherHash('K7Q2ABCD1234'), { status: 'redeemed', grantId: '05443e8e-0bd9-4ee3-8674-312a1d317ca0', validUntil: '2026-10-26T13:43:28.520132+00:00', redeemedAt: '2026-09-26T13:43:28.520132+00:00' }],
      [voucherHash('OPENOPEN0001'), { status: 'redeemed', grantId: '15443e8e-0bd9-4ee3-8674-312a1d317ca0', validUntil: null, redeemedAt: '2026-09-26T13:43:28.520132+00:00' }],
      [voucherHash('AGAINAGAIN01'), { status: 'already' }],
      [voucherHash('USEDUSEDUSED'), { status: 'invalid' }],
    ]);
    const db = {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        if (fn !== 'redeem_premium_voucher') return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` } };
        return { data: answers.get(String(args.p_code_hash)) ?? { status: 'invalid' }, error: null };
      },
    };
    let account = 0;
    const redeemAs = async (codeText: unknown, options: { user?: string | null; ip?: string; method?: string; database?: unknown } = {}) => {
      const user = options.user === undefined ? `contract-voucher-${++account}` : options.user;
      const res = mockResponse();
      await handleVoucherRedeem({
        method: options.method ?? 'POST',
        headers: { 'x-forwarded-for': options.ip ?? `10.45.${account % 250}.${(account * 7) % 250}` },
        query: { op: 'voucher', ...(user ? { user_id: user } : {}) },
        body: { code: codeText, ...(user ? { user_id: user } : {}) },
      } as never, res as never, (options.database ?? db) as never);
      return res;
    };
    const envelope = (res: ReturnType<typeof mockResponse>) => ({ status: res.statusCode, body: res.body });

    const get = await redeemAs('K7Q2ABCD1234', { method: 'GET' });
    assert.equal(get.statusCode, 405, 'redeeming is POST only');
    const guest = await redeemAs('K7Q2ABCD1234', { user: null });
    assert.equal(guest.statusCode, 401, 'a guest must sign in first');

    calls.length = 0;
    const ok = await redeemAs(' k7q2-abcd 1234 ', { user: 'contract-voucher-owner' });
    assert.equal(ok.statusCode, 200);
    assert.deepEqual(ok.body, { status: 'redeemed', validUntil: '2026-10-26T13:43:28.520Z' }, 'the answer names the end and nothing else');
    assert.equal(ok.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(calls, [{ fn: 'redeem_premium_voucher', args: { p_user_id: 'contract-voucher-owner', p_code_hash: sha256('K7Q2ABCD1234') } }],
      'the routine gets the account and the hash of the normalised code, never the code');
    assert.deepEqual((await redeemAs('OPENOPEN0001')).body, { status: 'redeemed', validUntil: null }, 'a voucher with no end says so');

    const already = await redeemAs('AGAINAGAIN01');
    assert.equal(already.statusCode, 409);
    assert.equal((already.body as { error: { code: string } }).error.code, 'voucher_already_redeemed', '"already redeemed" is the one answer told apart');

    const unknown = envelope(await redeemAs('NOSUCHCODE01'));
    const usedUp = envelope(await redeemAs('USEDUSEDUSED'));
    calls.length = 0;
    const malformed = envelope(await redeemAs('K7Q2!'));
    assert.equal(calls.length, 0, 'a code that cannot exist reaches no routine');
    assert.equal(unknown.status, 400);
    assert.deepEqual(unknown.body, { error: { code: 'voucher_invalid', message: 'This code does not open Premium. Check it and try again.' } });
    assert.deepEqual(usedUp, unknown, 'a used-up code (and an expired or revoked one, which the routine answers alike) gets the answer an unknown code gets');
    assert.deepEqual(malformed, unknown, 'and so does a code that cannot exist');
    const missing = await redeemAs('K7Q2ABCD1234', { database: { rpc: async (fn: string) => ({ data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` } }) } });
    assert.equal(missing.statusCode, 503);
    assert.equal((missing.body as { error: { code: string } }).error.code, 'voucher_unavailable', 'before migration 045 a redemption says vouchers are unavailable');
    const failing = await redeemAs('K7Q2ABCD1234', { database: { rpc: async () => ({ data: null, error: { code: '23514', message: 'check violation' } }) } });
    assert.equal(failing.statusCode, 500, 'a database error is a 500, not a refusal');

    // Five attempts an hour per account, a success included, and ten per address.
    const limited = 'contract-voucher-limited';
    for (let attempt = 1; attempt <= 5; attempt++) {
      assert.equal((await redeemAs('NOSUCHCODE01', { user: limited, ip: `10.46.0.${attempt}` })).statusCode, 400, `attempt ${attempt} is answered`);
    }
    const sixth = await redeemAs('K7Q2ABCD1234', { user: limited, ip: '10.46.0.6' });
    assert.equal(sixth.statusCode, 429, 'the sixth attempt of one account in an hour is refused, even with a good code');
    assert.ok(Number(sixth.headers.get('retry-after')) > 0, 'with Retry-After');
    for (let attempt = 1; attempt <= 10; attempt++) {
      assert.equal((await redeemAs('NOSUCHCODE01', { ip: '10.46.1.1' })).statusCode, 400, `address attempt ${attempt} is answered`);
    }
    assert.equal((await redeemAs('K7Q2ABCD1234', { ip: '10.46.1.1' })).statusCode, 429, 'the eleventh attempt from one address in an hour is refused, whichever account');
    assert.equal((await redeemAs('K7Q2ABCD1234', { ip: '10.46.1.2' })).statusCode, 200, 'another address is not');

    // 5. The owner's routes: created codes are random, shown once and stored
    // as a hash; a taken custom code is refused; the list carries no hash.
    const adminCalls: { fn: string; args: Record<string, unknown> }[] = [];
    let conflicts = 0;
    const row = (hint: string, extra: Record<string, unknown> = {}) => ({
      id: '5d6a8a4e-1f59-4d6a-9f56-0f7b6c1e2a3b', hint, note: 'For Pavel', premiumDays: 30, maxRedemptions: 1, redeemedCount: 0,
      redeemableUntil: null, active: true, createdAt: '2026-09-26T12:00:00+00:00', revokedAt: null, ...extra,
    });
    const adminDb = {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        adminCalls.push({ fn, args });
        if (fn === 'create_premium_voucher') {
          if (conflicts > 0) { conflicts -= 1; return { data: null, error: null }; }
          return { data: row(String(args.p_code_hint)), error: null };
        }
        if (fn === 'list_premium_vouchers') return { data: [row('K7Q2', { codeHash: 'leak' }), row('OPEN', { active: false, revokedAt: '2026-09-26T12:30:00+00:00' })], error: null };
        if (fn === 'revoke_premium_voucher') return { data: args.p_voucher_id === '5d6a8a4e-1f59-4d6a-9f56-0f7b6c1e2a3b' ? row('K7Q2', { active: false, revokedAt: '2026-09-26T12:30:00+00:00' }) : null, error: null };
        return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` } };
      },
    };
    const admin = async (method: string, body?: Record<string, unknown>, database: unknown = adminDb) => {
      const res = mockResponse();
      await handleAdminVouchers({ method, headers: {}, query: { op: 'vouchers' }, body } as never, res as never, database as never);
      return res;
    };
    const created = await admin('POST', { action: 'create', note: 'For Pavel', premiumDays: 30, maxRedemptions: 1 });
    assert.equal(created.statusCode, 200);
    const shown = (created.body as { code: string }).code;
    assert.match(shown, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/, 'a generated code is XXXX-XXXX-XXXX in Crockford base32');
    const plain = normalizeVoucherCode(shown)!;
    const createArgs = adminCalls.find((call) => call.fn === 'create_premium_voucher')!.args;
    assert.equal(createArgs.p_code_hash, sha256(plain), 'the routine stores the SHA-256 of the code');
    assert.equal(createArgs.p_code_hint, plain.slice(0, 4));
    assert.ok(!JSON.stringify(createArgs).includes(plain), 'and never receives the code');
    assert.deepEqual({ ...createArgs, p_code_hash: 'hash', p_code_hint: 'hint' }, {
      p_code_hash: 'hash', p_code_hint: 'hint', p_note: 'For Pavel', p_premium_days: 30, p_max_redemptions: 1, p_redeemable_until: null, p_created_by: null,
    }, 'a request that passed with the legacy password records no creator');
    assert.equal(JSON.stringify(created.body).split(shown).length - 1, 1, 'the answer carries the code once');
    assert.ok(!JSON.stringify(created.body).includes(plain) && !JSON.stringify(created.body).includes(sha256(plain)), 'and neither its bare form nor its hash');
    assert.equal(created.headers.get('cache-control'), 'no-store');

    adminCalls.length = 0;
    const custom = await admin('POST', { action: 'create', note: 'Camp', premiumDays: null, maxRedemptions: 40, code: 'shark-camp-2026' });
    assert.equal((custom.body as { code: string }).code, 'SHAR-KCAM-P202-6', 'a custom code comes back normalised');
    assert.equal(adminCalls[0].args.p_code_hash, sha256('SHARKCAMP2026'));
    conflicts = 1;
    const taken = await admin('POST', { action: 'create', note: 'Camp', code: 'shark-camp-2026' });
    assert.equal(taken.statusCode, 409, 'a custom code in use is refused');
    assert.equal((taken.body as { error: { code: string } }).error.code, 'voucher_exists');
    conflicts = 2;
    adminCalls.length = 0;
    assert.equal((await admin('POST', { action: 'create', note: 'Retry' })).statusCode, 200, 'a generated code that is taken is replaced');
    assert.equal(adminCalls.length, 3);
    assert.equal(new Set(adminCalls.map((call) => call.args.p_code_hash)).size, 3, 'by a fresh one each time');
    conflicts = 3;
    assert.equal((await admin('POST', { action: 'create', note: 'Retry' })).statusCode, 500, 'three taken codes in a row stop');
    conflicts = 0;
    assert.equal((await admin('POST', { action: 'create', note: '' })).statusCode, 400);
    assert.equal((await admin('POST', { action: 'create', note: 'x', code: 'no' })).statusCode, 400);

    const list = await admin('GET');
    assert.equal(list.statusCode, 200);
    const vouchers = (list.body as { vouchers: Record<string, unknown>[] }).vouchers;
    assert.deepEqual(vouchers.map((one) => [one.hint, one.state]), [['K7Q2', 'open'], ['OPEN', 'revoked']]);
    assert.ok(vouchers.every((one) => !('codeHash' in one)), 'the list carries no hash');
    assert.equal((await admin('POST', { action: 'revoke', voucherId: 'nope' })).statusCode, 400);
    assert.equal((await admin('POST', { action: 'revoke', voucherId: '00000000-0000-4000-8000-000000000000' })).statusCode, 404);
    const revoked = await admin('POST', { action: 'revoke', voucherId: '5d6a8a4e-1f59-4d6a-9f56-0f7b6c1e2a3b' });
    assert.equal((revoked.body as { voucher: { state: string } }).voucher.state, 'revoked');
    assert.equal((await admin('POST', { action: 'burn' })).statusCode, 400);
    assert.equal((await admin('DELETE')).statusCode, 405);
    const before045 = { rpc: async (fn: string) => ({ data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` } }) };
    for (const [method, body] of [['GET', undefined], ['POST', { action: 'create', note: 'x' }], ['POST', { action: 'revoke', voucherId: '5d6a8a4e-1f59-4d6a-9f56-0f7b6c1e2a3b' }]] as const) {
      const res = await admin(method, body as Record<string, unknown> | undefined, before045);
      assert.equal(res.statusCode, 503, `${method} ${body?.action ?? 'list'} before 045`);
      assert.equal((res.body as { error: { code: string } }).error.code, 'migration_required');
    }

    // Only an admin reaches op=vouchers: a signed-in learner is refused
    // before any database call.
    for (const method of ['GET', 'POST']) {
      const res = mockResponse();
      await adminHandler({
        method, url: '/api/admin/vouchers', headers: { 'x-forwarded-for': `10.47.0.${method.length}` },
        query: { op: 'vouchers', user_id: 'contract-learner' }, body: { action: 'create', note: 'x', user_id: 'contract-learner' },
      } as never, res as never);
      assert.ok([401, 403].includes(res.statusCode), `a learner's ${method} to op=vouchers is refused (${res.statusCode})`);
    }

    // No log line carries a code, its hash or its hint.
    const secrets = [plain, shown, sha256(plain), 'K7Q2ABCD1234', sha256('K7Q2ABCD1234'), 'SHARKCAMP2026', 'SHAR-KCAM-P202-6', sha256('SHARKCAMP2026'), 'NOSUCHCODE01', 'USEDUSEDUSED', 'AGAINAGAIN01'];
    assert.ok(logged.length > 10, 'the handlers logged their outcomes');
    for (const line of logged) {
      for (const secret of secrets) assert.ok(!line.includes(secret), `a log line carries ${secret}: ${line}`);
      assert.doesNotMatch(line, /"(hint|code|codeHash)"/, `a log line names a code field: ${line}`);
    }
  } finally {
    console.log = realLog;
  }
}

/* ── one erasure routine (migration 044) ──────────────────────────────────
 *
 * delete_user_data erases every table that holds an account id, including the
 * ones later migrations added with routines of their own, and question_edits
 * carries the importance check migration 014 meant to add. */
function erasureContracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const migrations = readdirSync(join(process.cwd(), 'supabase'))
    .filter((name) => /^supabase-schema-\d{3}\.sql$/.test(name))
    .sort();
  const bodyOf = (sql: string) => {
    const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.delete_user_data(');
    return start < 0 ? '' : sql.slice(start, sql.indexOf('$$;', sql.indexOf('AS $$', start)));
  };
  const erased = (body: string) => new Set([...body.matchAll(/\bpublic\.([a-z_]+)\b/g)].map((match) => match[1]));

  // The newest restatement is the one that runs, so it is the one checked.
  const latest = [...migrations].reverse().find((name) => bodyOf(read(`supabase/${name}`)));
  assert.ok(latest && latest >= 'supabase-schema-044.sql', 'delete_user_data was last restated by 044 or later');
  const latestSql = read(`supabase/${latest}`);
  const body = bodyOf(latestSql);
  const covered = erased(body);

  // It keeps every table migration 033's body erased.
  for (const table of erased(bodyOf(read('supabase/supabase-schema-033.sql')))) {
    assert.ok(covered.has(table), `delete_user_data still erases ${table}`);
  }
  // Every table a later migration created with an account column is erased or anonymised.
  // And the restating file refuses to run until each of those tables exists:
  // plpgsql resolves a table only when the routine runs, so an early copy
  // would install cleanly and then fail every deletion (review finding data-4).
  const guard = latestSql.slice(0, latestSql.indexOf('CREATE OR REPLACE FUNCTION public.delete_user_data('));
  assert.match(guard, /IF to_regclass\('public\.' \|\| v_table\) IS NULL THEN/, 'the restating migration checks its tables first');
  assert.match(guard, new RegExp(`RAISE EXCEPTION 'migration ${latest!.slice(16, 19)} needs 035 and 039 to 042 first; missing: %'`),
    'the guard names the migration that restates delete_user_data');
  for (const name of migrations.filter((one) => one > 'supabase-schema-033.sql' && one < latest!)) {
    const sql = read(`supabase/${name}`);
    for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.([a-z_]+) \(([\s\S]*?)\n\);/g)) {
      if (!/\b(user_id|invitee_user_id|referrer_user_id)\b/.test(match[2])) continue;
      assert.ok(covered.has(match[1]), `${name} created ${match[1]} with an account column and delete_user_data does not erase it`);
      assert.ok(guard.includes(`'${match[1]}'`), `${latest} checks that ${match[1]} (${name}) exists before it restates delete_user_data`);
    }
  }
  // A settled month keeps its ranks and loses the person.
  assert.ok(covered.has('token_month_settlements'), 'a month settlement loses the deleted account');
  assert.match(body, /SECURITY DEFINER\s+SET search_path = ''/, 'delete_user_data is a definer with an empty search_path');
  assert.match(latestSql, /REVOKE ALL ON FUNCTION public\.delete_user_data\(TEXT\) FROM PUBLIC, anon, authenticated;/);
  assert.match(latestSql, /GRANT EXECUTE ON FUNCTION public\.delete_user_data\(TEXT\) TO service_role;/);
  assert.doesNotMatch(body, /\b(INSERT INTO|user_xp SET|user_stats SET)\b/, 'erasure only deletes and anonymises');

  // The importance check is added once, whatever 014 left behind.
  const migration044 = read('supabase/supabase-schema-044.sql');
  assert.match(migration044, /IF NOT EXISTS \([\s\S]*?conname = 'question_edits_importance_check'/, 'the importance check is guarded');
  assert.match(migration044, /ADD CONSTRAINT question_edits_importance_check\s+CHECK \(importance IS NULL OR importance BETWEEN 1 AND 10\)/);

  // The API: delete_user_data first, then the four routines 044 folded in,
  // each tolerated when missing, until 044 is in production.
  const userOps = read('api/user/[op].ts');
  const deletion = userOps.slice(userOps.indexOf('async function deleteAccount('));
  assert.ok(deletion.indexOf('endBillingForDeletedAccount') < deletion.indexOf("rpc('delete_user_data'"), 'billing ends before the data goes');
  assert.ok(deletion.indexOf("rpc('delete_user_data'") < deletion.indexOf('of LATER_ERASURE_ROUTINES'), 'delete_user_data runs first');
  for (const routine of ['delete_user_activity_days', 'delete_entitlement_data', 'delete_coin_data', 'delete_referral_data']) {
    assert.match(userOps, new RegExp(`LATER_ERASURE_ROUTINES = \\[[^\\]]*'${routine}'`), `${routine} still runs until 044 is applied`);
  }
  assert.match(deletion, /if \(erased\.error && !routineMissing\(erased\.error\)\)/, 'a routine that is not installed has nothing to erase');
}

async function main() {
  assert.equal(apiFiles(join(process.cwd(), 'api')).length, 12, 'Vercel function budget must remain exactly 12');

  // devShark is the only product this repository builds. An unset identity
  // resolves to it; any other product or subject lock fails the build instead
  // of shipping devShark under someone else's name.
  assert.deepEqual(Object.keys(PRODUCT_CATALOG), ['devshark']);
  assert.equal(resolveCatalogProductId({ product: 'devshark' }), 'devshark');
  assert.equal(resolveCatalogProductId({ lockSubject: 'webdev' }), 'devshark');
  assert.equal(resolveCatalogProductId({}), 'devshark');
  for (const input of [{ product: 'studyshark' }, { product: 'geoshark' }, { lockSubject: 'geography' }]) {
    assert.throws(() => resolveCatalogProductId(input), /builds devShark only/, `${JSON.stringify(input)} must fail`);
  }
  assert.deepEqual(Object.keys(SUBJECT_SCOPE_CATALOG), ['webdev']);
  assert.deepEqual(allowedDeploymentSubjects(), ['webdev']);

  const session = encodeSession([{ questionId: 'private-answer-check', correctAnswer: 3 }]);
  assert.match(session, /^v2\./);
  assert.ok(!session.includes('private-answer-check'), 'encrypted token must not expose question ids');
  assert.deepEqual(decodeSession(session), [{ questionId: 'private-answer-check', correctAnswer: 3 }]);
  const parts = session.split('.');
  const middle = Math.floor(parts[2].length / 2);
  parts[2] = `${parts[2].slice(0, middle)}${parts[2][middle] === 'A' ? 'B' : 'A'}${parts[2].slice(middle + 1)}`;
  assert.equal(decodeSession(parts.join('.')), null, 'tampered token must fail closed');

  const dailyAttempt = stableAttemptId('daily', 'user-0001', 'webdev', '2026-07-21');
  assert.match(dailyAttempt, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(
    stableAttemptId('daily', 'user-0001', 'webdev', '2026-07-21'),
    dailyAttempt,
    'the same server-defined daily attempt must receive the same claim id',
  );
  assert.notEqual(stableAttemptId('daily', 'user-0002', 'webdev', '2026-07-21'), dailyAttempt);
  assert.notEqual(stableAttemptId('daily', 'user-0001', 'webdev', '2026-07-22'), dailyAttempt);

  const run = createChallengeRun();
  assert.equal(decodeChallengeRun(run.runToken)?.runId, run.runId);
  const proof = encodeAnswerProof('q-1', 'webdev', true);
  assert.deepEqual(decodeAnswerProof(proof), { questionId: 'q-1', subject: 'webdev', isCorrect: true });
  const receipt = encodeQuizResultReceipt({
    userId: 'user-0001', correct: 1, total: 2,
    breakdown: { javascript: { correct: 1, total: 2 } },
    outcomes: [{ questionId: 'closure-1', category: 'javascript', isCorrect: true }],
    subject: 'webdev',
    questXp: 6,
    purpose: 'quiz',
  });
  assert.deepEqual(decodeQuizResultReceipt(receipt)?.breakdown, { javascript: { correct: 1, total: 2 } });
  assert.equal(decodeQuizResultReceipt(receipt)?.subject, 'webdev');

  const now = Date.UTC(2026, 6, 21);
  const reviewQuestions = [
    { id: 'weak-high', category: 'javascript', difficulty: 2, importance: 10 },
    { id: 'strong-low', category: 'css', difficulty: 2, importance: 3 },
    { id: 'weak-recent', category: 'javascript', difficulty: 3, importance: 8 },
  ].map((item) => ({
    ...item, tags: [item.category], introduction: '', question: item.id,
    options: ['a', 'b'], correctAnswer: 0, explanation: '',
  })) as Question[];
  const review = selectPersonalizedReview(
    reviewQuestions,
    [
      { category: 'javascript', total_correct: 2, total_questions: 10 },
      { category: 'css', total_correct: 9, total_questions: 10 },
    ],
    [{
      question_id: 'weak-recent', category: 'javascript', times_seen: 2, times_missed: 2,
      last_seen_at: new Date(now - 5 * 86400000).toISOString(),
      last_missed_at: new Date(now - 5 * 86400000).toISOString(),
    }],
    2,
    now,
  );
  assert.equal(review.questions.length, 2);
  assert.equal(review.weakAreas[0]?.category, 'javascript');
  assert.ok(review.questions.every((question) => question.category === 'javascript'));
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

  // devShark ships no AI feature: no provider module and no explanation or
  // hint route on the quiz submit handler.
  assert.ok(!readdirSync(join(process.cwd(), 'lib')).includes('ai-provider.ts'), 'devShark carries no AI provider');
  const submitHandlerSource = readFileSync(join(process.cwd(), 'api', 'quiz', 'submit.ts'), 'utf8');
  assert.ok(!/resource === '(explanation|hint)'/.test(submitHandlerSource), 'the quiz submit handler routes no AI resource');

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
  // Every track a task can belong to must survive the round trip. The decoder
  // once carried its own list of four, so the Algorithms track sealed its
  // sessions and then refused to open them: every submit on it read as an
  // expired session, and nothing here noticed, because this block only ever
  // tried JavaScript.
  for (const track of CODING_TRACKS) {
    const sealed = encodeCodingSession({ taskId: 'alg-two-sum', track, userId: 'user-0001' });
    assert.equal(decodeCodingSession(sealed)?.track, track, `a coding session on the ${track} track must decode`);
  }

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
  // Easy, Medium and Hard are labels projected from the tier ladder (#224).
  // Every listed challenge carries one, and nothing that opens, locks or pays
  // reads it: the ladder and the XP table stay keyed by tier.
  assert.ok(CODING_INDEX.every((row) => isDifficulty(row.difficulty)), 'every indexed challenge carries Easy, Medium or Hard');
  assert.deepEqual(CODING_TASK_XP, { 1: 25, 2: 35, 3: 50, 4: 75, 5: 120 }, 'coding XP stays keyed by tier');
  const codingCatalogSource = readFileSync(join(process.cwd(), 'shared', 'coding-catalog.ts'), 'utf8');
  const ladderSource = codingCatalogSource.slice(codingCatalogSource.indexOf('export function tierUnlocked'), codingCatalogSource.indexOf('/** Cosmetic badge ids'));
  assert.ok(ladderSource.includes('tierPassRatio') && !/difficulty/i.test(ladderSource.replace(/\/\*\*[\s\S]*?\*\//g, '')), 'the tier ladder never reads the difficulty label');

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
  // Hidden React cases (#226) decide the verdict but reach the learner only as
  // a count: Submit appends them to the visible suite and splits them out.
  const reactHidden = await runReactSuite({
    suite: withHiddenCases(reactTask!.suite!, "test('a hidden case', () => { expect(1).toBe(2); });"),
    appSource: reactSolution!,
  });
  const reactSplit = splitHiddenCases(reactHidden.cases);
  assert.equal(reactSplit.hidden.length, 1, 'the hidden case runs after the visible suite');
  assert.ok(reactSplit.visible.length === reactPass.total && reactSplit.visible.every((one) => one.status === 'pass'), 'the visible cases keep their names and verdicts');
  assert.ok(reactHidden.failed > 0, 'a failing hidden case fails the run');
  const codingHandlersSource = readFileSync(join(process.cwd(), 'lib', 'coding', 'handlers.ts'), 'utf8');
  const gradeReactSource = codingHandlersSource.slice(codingHandlersSource.indexOf('async function gradeReact'), codingHandlersSource.indexOf('function gradeDesignTask'));
  assert.match(gradeReactSource, /withHiddenCases\(task\.suite, solutionFor\(task\.id\)\?\.hiddenSuite\)/, 'Submit runs the hidden React cases');
  assert.match(gradeReactSource, /const results = visible\.map/, 'only the visible React cases go back with names and errors');
  // A rejection the component leaves unhandled only logs in the browser; the
  // server runner must reach a verdict too instead of ending the process.
  const reactRejected = await runReactSuite({
    suite: "import React from 'react';\nimport { render } from '@testing-library/react';\nimport App from './App';\ntest('renders', async () => { render(<App />); await new Promise((resolve) => setTimeout(resolve, 20)); });",
    appSource: "const App = () => { useEffect(() => { Promise.reject(new Error('left unhandled')); }, []); return null; };",
  });
  assert.equal(reactRejected.failed, 0, 'an unhandled rejection in the component does not end the React runner');
  // The preview runs a solution against the fetch stub, not a suite's fake
  // fetch. The stub answered /api/photos with its weather object, so the
  // load-more solution threw "next is not iterable" in every preview and the
  // browser harness failed. Photos now come three to a page.
  const loadMore = solutionFor('react-mh-load-more')?.solution;
  assert.ok(loadMore, 'the load-more challenge has a reference solution');
  const previewRun = await runReactSuite({
    suite: [
      "import './fetchStub';",
      "import React from 'react';",
      "import { render, screen, fireEvent, waitFor } from '@testing-library/react';",
      "import App from './App';",
      "test('the stub pages the photos', async () => {",
      '  render(<App />);',
      "  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));",
      "  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));",
      "  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(6));",
      "  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));",
      "  await waitFor(() => expect(screen.getByText('That’s everything')).toBeTruthy());",
      "  expect(screen.getAllByRole('listitem')).toHaveLength(7);",
      '});',
    ].join('\n'),
    appSource: loadMore!,
  });
  assert.equal(previewRun.failed, 0, `the load-more preview pages through the stub's photos (${previewRun.cases.map((one) => one.error).filter(Boolean).join('; ')})`);

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
  }

  // The dated boards (migration 040, #223). Every board ranks correct answers,
  // then accuracy: never XP and never a streak. Answers are dated only inside
  // the three verified answer routines, and a coding pass is not an answer.
  {
    const migration = readFileSync(join(process.cwd(), 'supabase/supabase-schema-040.sql'), 'utf8');
    const routineOf = (name: string) => {
      const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
      assert.ok(start >= 0, `migration 040 must define ${name}`);
      return migration.slice(start, migration.indexOf('$$;', migration.indexOf('AS $$', start)));
    };
    for (const name of ['window_leaderboard', 'window_leaderboard_rank']) {
      const body = routineOf(name).toLowerCase();
      assert.ok(!body.includes('streak'), `${name} must never read a streak column`);
      assert.ok(!/\bxp\b|quest_xp|user_xp/.test(body), `${name} must never read XP`);
    }
    assert.match(
      routineOf('window_leaderboard'),
      /RANK\(\) OVER \(ORDER BY t\.correct DESC, t\.answered ASC\)/,
      'the window ranks correct answers, then fewer answers for the same number correct',
    );
    const friendOrder = routineOf('friend_list').split('ORDER BY').pop() ?? '';
    assert.ok(!/streak/i.test(friendOrder), 'friend_list must never order by a streak');
    assert.match(friendOrder, /total_correct/, 'friend_list orders by correct answers first');

    assert.equal(migration.match(/INSERT INTO public\.user_activity_days/g)?.length, 1, 'one upsert writes dated activity');
    assert.equal(
      migration.match(/PERFORM public\.add_activity_day\(/g)?.length,
      3,
      'only the quiz, Learn and challenge routines date answers',
    );
    for (const name of ['record_verified_quiz_result_v2', 'record_roadmap_answer_v2', 'record_challenge_completion']) {
      assert.match(routineOf(name), /PERFORM public\.add_activity_day\(/, `${name} must date its answers`);
    }
    // A replayed Learn level is review, not new answers (review finding
    // integrity-5): a passed step adds nothing, and a question counts at most
    // once per learner and UTC day across attempts.
    const learnAnswer = routineOf('record_roadmap_answer_v2');
    const dating = learnAnswer.indexOf('PERFORM public.add_activity_day(');
    const passedCheck = learnAnswer.indexOf("CASE WHEN v_attempt.kind = 'level' THEN 'levels' ELSE 'checkpoints' END");
    const sameDay = learnAnswer.indexOf('AND a.question_id = p_question_id');
    assert.ok(passedCheck > 0 && passedCheck < dating, 'a Learn answer on a passed step is not dated');
    assert.ok(sameDay > 0 && sameDay < dating, 'a question answered in another attempt today is not dated again');
    assert.match(learnAnswer, /AND t\.attempt_id <> p_attempt_id/);
    assert.match(learnAnswer, /AND a\.answered_at >= v_day_start;/);
    assert.doesNotMatch(migration, /FUNCTION public\.record_coding/, 'a coding pass must not reach the dated boards');
    for (const file of apiFiles(join(process.cwd(), 'api'))) {
      const source = readFileSync(file, 'utf8');
      assert.doesNotMatch(source, /from\(['"]user_activity_days/, `${file} must not write dated activity directly`);
      assert.doesNotMatch(source, /rpc\(['"]add_activity_day/, `${file} must not date answers outside a verified routine`);
    }

    assert.match(migration, /ALTER TABLE public\.user_activity_days ENABLE ROW LEVEL SECURITY/);
    for (const fn of [
      'add_activity_day', 'record_verified_quiz_result_v2', 'record_roadmap_answer_v2', 'record_challenge_completion',
      'window_leaderboard', 'window_leaderboard_rank', 'friend_list', 'delete_user_activity_days',
    ]) {
      assert.match(
        migration,
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\)\\s+FROM PUBLIC, anon, authenticated`),
        `${fn} must be service-role only`,
      );
    }

    // The shared board stays cacheable; a personal one never is.
    const boardHandler = readFileSync(join(process.cwd(), 'api/leaderboard.ts'), 'utf8');
    assert.match(boardHandler, /'private, no-store'/);
    assert.match(boardHandler, /'public, s-maxage=60, stale-while-revalidate=300'/);
    assert.match(boardHandler, /RATE_LIMITS\.leaderboardPersonal/);

    // The screen: a rank is a number, never a medal colour, and the
    // multi-subject pill is gone.
    const screen = ['client/src/components/Leaderboard.tsx', 'client/src/components/Leaderboard.css']
      .map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
      .join('\n')
      .toLowerCase();
    for (const hex of ['#f5b301', '#9aa4b2', '#cd7f32']) {
      assert.ok(!screen.includes(hex), `the leaderboard must not use the medal colour ${hex}`);
    }
    assert.ok(!screen.includes('subjectnamekey'), 'the leaderboard must not show a subject pill');
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

  // Learn must be browsable without a database write. This exercises the same
  // structure and first-level GET the client uses, and catches an accidental
  // subject lock or a question-bank failure.
  const structureRes = mockResponse();
  await roadmapHandler({ method: 'GET', headers: {}, query: {} } as never, structureRes as never);
  assert.equal(structureRes.statusCode, 200);
  const structure = structureRes.body as { topics?: string[] };
  assert.ok(Array.isArray(structure.topics));
  assert.ok(SUBJECT_SCOPE_CATALOG.webdev.topics.every((topic) => structure.topics?.includes(topic)), 'the structure lists every webdev topic');
  {
    const lessonRes = mockResponse();
    await roadmapHandler({
      method: 'GET', headers: {}, query: { topic: 'javascript', level: '1', lang: 'en' },
    } as never, lessonRes as never);
    assert.equal(lessonRes.statusCode, 200, 'the first JavaScript Learn level must load');
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
    // A plan excludes what the learner did not choose, and a subject without
    // plans keeps everything it owns.
    assert.equal(isTopicInPlan(profile, 'webdev', 'cool-stuff'), false);
    assert.equal(isTopicInPlan(profile, 'legacy-subject', 'anything'), true);
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
    // the pool either.
    assert.ok(!defaultDeploymentCategories().includes(topic), `${topic} must not be drawn by default`);
    assert.equal(
      validateCategoryScope([topic], { forDelivery: true }).ok,
      false,
      `${topic} must not be requestable for delivery`,
    );
  }
  // Requests for questions are built from `deliveryCategories`, and the server
  // must accept that list whole: one retired category refuses a request, which
  // is how the challenge and the daily set failed from 2026-09-08 to 2026-09-25.
  // Reads over history still accept the full catalogue.
  assert.deepEqual(defaultDeploymentCategories(), deliveryCategories('webdev'));
  assert.equal(validateCategoryScope(deliveryCategories('webdev'), { forDelivery: true }).ok, true, 'the delivery list must be requestable');
  assert.equal(
    validateCategoryScope([...SUBJECT_SCOPE_CATALOG.webdev.categories], { forDelivery: true }).ok,
    false,
    'the full catalogue names retired sections, so it must not be sent for delivery',
  );
  assert.equal(validateCategoryScope([...SUBJECT_SCOPE_CATALOG.webdev.categories]).ok, true, 'a read may name a retired category');

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

    // The app ships English only (`ENABLED_LANGS`), so the Czech dictionary is
  // retained work rather than a live surface and a new English key is not
  // obliged to arrive with a translation — `t` falls back to English for
  // anything missing. What still has to hold is the other direction: a key
  // removed from English and left in Czech is unreachable, and a Czech string
  // nobody can render is worse than no string, because it reads as translated
  // work that is live and is not.
  {
    const keysOf = (file: string) => {
      const source = readFileSync(join(process.cwd(), 'client/src/i18n', file), 'utf8');
      return new Set((source.match(/^ {2}'[^']+':/gm) ?? []).map((line) => line.trim().slice(1, -2)));
    };
    const en = keysOf('translations.ts');
    const cs = keysOf('translations.cs.ts');
    assert.ok(en.size > 1500, `the English dictionary looks truncated: ${en.size} keys`);
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

  // ── challenge runs (migration 037) ─────────────────────────────────────
  // The queue is chosen server-side from what the learner can already open.
  // Shaping it — a count, a track, a shuffle, a moment — only reorders or
  // trims that set; it never reaches past the tier gate, and a shuffled run
  // is a permutation of the sequential one.
  {
    const base = { minutes: 20, topic: null, passed: new Set<string>(), due: new Set<string>() };
    const sequential = buildQueue({ ...base, count: 5, order: 'sequential' });
    assert.equal(sequential.length, 5, 'a run sized by count holds that many challenges');
    assert.deepEqual(buildQueue({ ...base, count: 5, order: 'sequential' }), sequential, 'sequential runs are deterministic');
    const pool = buildQueue({ ...base, count: 20, order: 'sequential' });
    const reversed = <T>(list: T[]) => [...list].reverse();
    const shuffled = buildQueue({ ...base, count: 20, order: 'random', shuffle: reversed });
    assert.deepEqual([...shuffled].sort(), [...buildQueue({ ...base, count: 20, order: 'random', shuffle: reversed })].sort());
    assert.ok(shuffled.every((id) => codingTaskById(id)), 'a shuffled run holds only issuable tasks');
    assert.notDeepEqual(shuffled, pool, 'the shuffle is applied');
    const react = buildQueue({ ...base, count: 3, topic: 'react', order: 'sequential' });
    assert.ok(react.length === 3 && react.every((id) => codingTaskById(id)?.track === 'react'), 'three from React means three React challenges');
    assert.ok(buildQueue({ ...base, count: 3, topic: 'react', order: 'random' }).every((id) => codingTaskById(id)?.track === 'react'), 'a shuffled track run stays inside the track');
    for (const id of [...sequential, ...react]) {
      const task = codingTaskById(id)!;
      assert.ok(task.tier <= 2, 'a fresh learner is only ever offered the open tiers');
    }
    assert.equal(buildQueue({ ...base, count: 200, order: 'sequential' }).length, 20, 'a count is capped');
    assert.ok(buildQueue({ ...base, order: 'sequential' }).length >= 1, 'a run sized by minutes still offers something');

    const now = Date.parse('2026-09-18T12:00:00Z');
    assert.deepEqual(parseScheduledFor(undefined, now), { at: null }, 'no moment means now');
    assert.deepEqual(parseScheduledFor('2026-09-18T11:00:00Z', now), { at: null }, 'a moment already past means now');
    assert.deepEqual(parseScheduledFor('2026-09-18T12:00:30Z', now), { at: null }, 'a moment within the next minute means now');
    const later = parseScheduledFor('2026-09-20T18:00:00Z', now);
    assert.ok('at' in later && later.at?.toISOString() === '2026-09-20T18:00:00.000Z', 'a future moment is kept');
    assert.ok('error' in parseScheduledFor('2027-01-01T00:00:00Z', now), 'a moment past the horizon is refused');
    assert.ok('error' in parseScheduledFor('not a time', now) && 'error' in parseScheduledFor(12345, now), 'a non-time is refused');
  }

  // ── the payment webhook believes the order, not the event ───────────────
  {
    const awaiting = { state: 'awaiting_payment', totalMinor: 2490, currency: 'EUR' };
    const paid = { ...awaiting, state: 'paid' };
    assert.deepEqual(webhookDecision({ type: 'payment.succeeded', amountMinor: 2490, currency: 'EUR' }, awaiting), { action: 'paid' });
    assert.equal(webhookDecision({ type: 'payment.succeeded' }, awaiting).action, 'refuse', 'an unreadable amount is refused, not waved through');
    assert.equal(webhookDecision({ type: 'payment.succeeded', amountMinor: 2490 }, awaiting).action, 'refuse', 'a missing currency is refused');
    assert.equal(webhookDecision({ type: 'payment.succeeded', amountMinor: 1, currency: 'EUR' }, awaiting).action, 'refuse', 'a forged amount is refused');
    assert.equal(webhookDecision({ type: 'payment.succeeded', amountMinor: 2490, currency: 'CZK' }, awaiting).action, 'refuse', 'another currency is refused');
    assert.equal(webhookDecision({ type: 'payment.succeeded', amountMinor: 0, currency: 'EUR' }, { ...awaiting, totalMinor: null }).action, 'refuse', 'an order with no cash total cannot be paid for');
    assert.deepEqual(webhookDecision({ type: 'payment.failed' }, awaiting), { action: 'cancel' });
    assert.deepEqual(webhookDecision({ type: 'payment.failed' }, paid), { action: 'ignore', reason: 'stale' }, 'a late failure never cancels a paid order');
    assert.deepEqual(webhookDecision({ type: 'checkout.expired' }, paid), { action: 'ignore', reason: 'stale' });
    assert.deepEqual(webhookDecision({ type: 'payment.refunded' }, paid), { action: 'cancel' }, 'a refund may cancel a paid order');
    assert.deepEqual(webhookDecision({ type: 'payment.refunded' }, { ...paid, state: 'shipped' }), { action: 'ignore', reason: 'stale' });
    assert.deepEqual(webhookDecision({ type: 'something.else' }, awaiting), { action: 'ignore', reason: 'unhandled' });
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
  await tierContracts();
  billingContracts();
  publicCopyContracts();
  coinsContracts();
  await referralContracts();
  await merchContracts();
  erasureContracts();
  await voucherContracts();
  await webdevBankContracts();

  console.log('Launch contracts passed: product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, 12-function budget, the free tier and Premium, billing, the public Premium copy, the progression graph, failure hints, retired sections, curation claims, the content-audit gate, spaced practice, interleaving, challenge runs, lesson figures, an unconfigured shop, coins, invitations, merchandise through Spreadshop, one erasure routine, Premium vouchers, and the webdev-bank contract BoardlessAI imports.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
