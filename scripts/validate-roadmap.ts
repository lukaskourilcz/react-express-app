// Data-integrity check for the roadmap question banks, with extra focus on the
// newly added Next.js (15 levels) and Node.js (25 levels) topics. Bundled with
// esbuild and run on Node so it exercises the real data + structure helpers.

import { questions } from '../lib/quiz-data';
import {
  ROADMAP_TOPICS,
  topicLevelCount,
  topicCheckpointCount,
  levelQuestionIds,
  checkpointQuestionIds,
  isValidLevel,
  isValidCheckpoint,
  QUESTIONS_PER_LEVEL,
} from '../lib/roadmap';

const byId = new Map(questions.map((q) => [q.id, q]));
let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error('  ✗ ' + msg);
};

// Expected level counts per topic.
const EXPECTED_LEVELS: Record<string, number> = {
  javascript: 25, typescript: 25, react: 25, nodejs: 25,
  nextjs: 15, git: 15, html: 15, css: 15, dsa: 15, algorithms: 15,
  abbreviations: 15, general: 15,
};

for (const topic of ROADMAP_TOPICS) {
  const levels = topicLevelCount(topic);
  const checkpoints = topicCheckpointCount(topic);
  console.log(`\n${topic}: ${levels} levels, ${checkpoints} checkpoints`);

  if (EXPECTED_LEVELS[topic] !== levels) {
    fail(`${topic}: expected ${EXPECTED_LEVELS[topic]} levels, got ${levels}`);
  }
  if (checkpoints !== Math.floor(levels / 5)) {
    fail(`${topic}: checkpoint count ${checkpoints} != floor(${levels}/5)`);
  }

  // Every level must resolve to 8 real, well-formed questions.
  for (let lvl = 1; lvl <= levels; lvl++) {
    if (!isValidLevel(topic, lvl)) fail(`${topic} level ${lvl} reported invalid`);
    const ids = levelQuestionIds(topic, lvl);
    if (ids.length !== QUESTIONS_PER_LEVEL) fail(`${topic} level ${lvl} has ${ids.length} ids`);
    for (const id of ids) {
      const q = byId.get(id);
      if (!q) { fail(`${topic} level ${lvl}: missing question ${id}`); continue; }
      if (q.category !== topic) fail(`${id}: category ${q.category} != ${topic}`);
      if (!Array.isArray(q.options) || q.options.length < 2) fail(`${id}: bad options`);
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        fail(`${id}: correctAnswer ${q.correctAnswer} out of range (0..${q.options.length - 1})`);
      }
      if (!q.question?.trim()) fail(`${id}: empty question`);
      if (!q.explanation?.trim()) fail(`${id}: empty explanation`);
      if (new Set(q.options).size !== q.options.length) fail(`${id}: duplicate options`);
    }
  }

  // Every checkpoint must cover exactly its 40 questions.
  for (let cp = 1; cp <= checkpoints; cp++) {
    if (!isValidCheckpoint(topic, cp)) fail(`${topic} checkpoint ${cp} reported invalid`);
    const ids = checkpointQuestionIds(topic, cp);
    if (ids.length !== QUESTIONS_PER_LEVEL * 5) fail(`${topic} cp ${cp} has ${ids.length} ids (want 40)`);
    if (ids.some((id) => !byId.has(id))) fail(`${topic} cp ${cp} references missing questions`);
  }

  // Out-of-range levels/checkpoints must be rejected.
  if (isValidLevel(topic, levels + 1)) fail(`${topic}: level ${levels + 1} should be invalid`);
  if (isValidLevel(topic, 0)) fail(`${topic}: level 0 should be invalid`);
}

// Global: all roadmap ids unique across the whole bank.
const ids = questions.map((q) => q.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) fail(`duplicate question ids: ${[...new Set(dupes)].slice(0, 10).join(', ')}…`);

// Count only the roadmap-built questions (rm-<prefix>-N); the core bank may also
// carry topic-category questions, which aren't part of the path.
const nextCount = questions.filter((q) => q.id.startsWith('rm-next-')).length;
const nodeCount = questions.filter((q) => q.id.startsWith('rm-node-')).length;
const dsaCount = questions.filter((q) => q.id.startsWith('rm-dsa-')).length;
const algoCount = questions.filter((q) => q.id.startsWith('rm-algorithms-')).length;
const abbrCount = questions.filter((q) => q.id.startsWith('rm-abbr-')).length;
const generalCount = questions.filter((q) => q.id.startsWith('rm-general-')).length;
console.log(`\nNext.js roadmap questions: ${nextCount} (want 120)`);
console.log(`Node.js roadmap questions: ${nodeCount} (want 200)`);
console.log(`DSA roadmap questions: ${dsaCount} (want 120)`);
console.log(`Algorithms roadmap questions: ${algoCount} (want 120)`);
console.log(`Abbreviations roadmap questions: ${abbrCount} (want 120)`);
console.log(`General roadmap questions: ${generalCount} (want 120)`);
if (nextCount !== 120) fail(`Next.js roadmap has ${nextCount} questions, want 120`);
if (nodeCount !== 200) fail(`Node.js roadmap has ${nodeCount} questions, want 200`);
if (dsaCount !== 120) fail(`DSA roadmap has ${dsaCount} questions, want 120`);
if (algoCount !== 120) fail(`Algorithms roadmap has ${algoCount} questions, want 120`);
if (abbrCount !== 120) fail(`Abbreviations roadmap has ${abbrCount} questions, want 120`);
if (generalCount !== 120) fail(`General roadmap has ${generalCount} questions, want 120`);

console.log(`\nTotal questions in bank: ${questions.length}`);
if (failures > 0) {
  console.error(`\n❌ ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\n✅ All roadmap integrity checks passed');
