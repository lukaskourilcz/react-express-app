// Validate recorded item reviews, never manufacture scores from execution.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../lib/learning-paths/audit';

const materials = new Map<string, { kind: string; contentHash: string; gradingHash: string | null }>();
for (const path of LEARNING_PATHS) for (const module of path.modules) {
  for (const lesson of module.lessons) materials.set(`${path.id}:${lesson.id}`,
    { kind: 'native-lesson', contentHash: nativeContentHash(lesson), gradingHash: null });
  for (const activity of module.activities) {
    materials.set(`${path.id}:${activity.id}`,
      { kind: 'native-activity', contentHash: nativeContentHash(activity), gradingHash: nativeGradingHash(activity) });
    for (const question of activity.questions ?? []) materials.set(`${path.id}:${question.id}`,
      { kind: 'native-check-question', contentHash: nativeContentHash(question), gradingHash: null });
  }
}
interface Review {
  id: string; path: string; kind: string; contentHash: string; gradingHash: string | null;
  quality: Record<string, number | null>; qualityScore: number;
  relevance: Record<string, number>; relevanceScore: number;
  notApplicable?: Record<string, string>;
  reviewer: { kind: string }; verification: { verdict: string; notes: string };
}
const seen = new Set<string>();
for (const file of readdirSync('docs/audit/wip/native').filter(file => file.endsWith('.jsonl'))) {
  for (const line of readFileSync(`docs/audit/wip/native/${file}`, 'utf8').split('\n').filter(Boolean)) {
    const review = JSON.parse(line) as Review;
    const key = `${review.path}:${review.id}`;
    assert(!seen.has(key), `Duplicate native review: ${key}`);
    seen.add(key);
    const current = materials.get(key);
    assert(current, `Unknown native item: ${key}`);
    assert.equal(review.kind, current.kind, `Review kind: ${key}`);
    assert.equal(review.contentHash, current.contentHash, `Stale native content review: ${key}`);
    assert.equal(review.gradingHash, current.gradingHash, `Stale native grading review: ${key}`);
    const scores: number[] = [];
    for (const dimension of ['topicRelevance', 'learningValue', 'technicalCorrectness', 'wording', 'answerOptions', 'hint', 'explanation']) {
      const score = review.quality[dimension];
      if (score === null) assert(review.notApplicable?.[dimension]?.trim(), `Missing N/A rationale: ${key}/${dimension}`);
      else { assert(Number.isInteger(score) && score >= 1 && score <= 5, `Invalid quality: ${key}/${dimension}`); scores.push(score); }
    }
    assert.equal(review.qualityScore, Math.min(...scores), `Quality floor: ${key}`);
    const relevance = ['presentDay', 'practicalUtility', 'transferable', 'audienceFit', 'riskOutcome'].map(marker => {
      const value = review.relevance[marker];
      assert(Number.isInteger(value) && value >= 0 && value <= 2, `Invalid relevance: ${key}/${marker}`);
      return value;
    });
    assert.equal(review.relevanceScore, relevance.reduce((sum, score) => sum + score, 0), `Relevance total: ${key}`);
    assert(review.reviewer.kind === 'model' || review.reviewer.kind === 'human', `Reviewer provenance: ${key}`);
    assert(review.verification.verdict && review.verification.notes.trim(), `Missing final-reading evidence: ${key}`);
  }
}
console.log(`Native review bindings passed: ${seen.size}/${materials.size} records. ${materials.size - seen.size} still require individual review; no complete-catalogue claim.`);
// An expected value is test data, hashed exactly as authored.
const fixture = LEARNING_PATHS.flatMap(path => path.modules.flatMap(module => module.activities))
  .find(activity => activity.code?.tests.length)!;
const first = structuredClone(fixture);
const second = structuredClone(fixture);
first.code!.tests[0].expected = { value: 'first' };
second.code!.tests[0].expected = { value: 'second' };
assert.notEqual(nativeGradingHash(first), nativeGradingHash(second), 'Raw expected data must invalidate native grading review');
