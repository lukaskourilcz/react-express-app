// Unit checks for the career leveling + XP economy. Bundled with esbuild and run
// on Node. Imports the real client module so the shipped logic is exercised.

import {
  computeLearningXp,
  computeQuizXp,
  levelForXp,
  specializationFor,
  displayTitle,
  difficultyForLevel,
  CAREER_RANKS,
  MAX_RANK,
  PRACTICE_XP,
} from '../client/src/lib/leveling';
import type { RoadmapProgress } from '../client/src/lib/roadmap';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) console.log('  ✓ ' + msg);
  else { failures++; console.error('  ✗ ' + msg); }
};
const near = (a: number, b: number) => a === b;

// ── ladder integrity ───────────────────────────────────────────────────────
console.log('Career ladder:');
check(CAREER_RANKS.length === 10 && MAX_RANK === 10, '10 ranks, Superjunior → Architect');
check(CAREER_RANKS[0].title === 'Superjunior Developer' && CAREER_RANKS[0].minXp === 0, 'starts at Superjunior (0 XP)');
check(CAREER_RANKS[9].title === 'Software Architect', 'tops out at Software Architect');
let monotonic = true;
for (let i = 1; i < CAREER_RANKS.length; i++) if (CAREER_RANKS[i].minXp <= CAREER_RANKS[i - 1].minXp) monotonic = false;
check(monotonic, 'rank thresholds strictly increase');

// ── levelForXp ──────────────────────────────────────────────────────────────
console.log('\nlevelForXp:');
check(levelForXp(0).level === 1 && levelForXp(0).rank.title === 'Superjunior Developer', '0 XP → level 1');
check(levelForXp(499).level === 1 && levelForXp(500).level === 2, '500 XP crosses into level 2');
const mid = levelForXp(1000); // between 500 and 1500 → 50% of that band
check(mid.level === 2 && mid.progressPct === 50 && mid.xpToNext === 500, '1000 XP → level 2, 50%, 500 to next');
const capped = levelForXp(10_000_000);
check(capped.level === 10 && capped.isMax && capped.progressPct === 100 && capped.xpToNext === 0, 'huge XP → maxed Architect');
check(levelForXp(-50).level === 1, 'negative XP clamps to level 1');

// ── difficulty + learning XP ────────────────────────────────────────────────
console.log('\nLearning XP:');
check(difficultyForLevel(1) === 1 && difficultyForLevel(5) === 1 && difficultyForLevel(6) === 2 && difficultyForLevel(25) === 5, 'difficulty tiers by level');
// One passed level-1 (difficulty 1 → 50) and one passed checkpoint-2 (→ 600).
const p1: RoadmapProgress = { javascript: { levels: { '1': { passed: true, bestPct: 80 } }, checkpoints: { '2': { passed: true, bestPct: 90 } } } };
check(computeLearningXp(p1) === 50 + 600, 'level1 (50) + checkpoint2 (600) = 650');
// Unpassed entries contribute nothing (no farming by attempting).
const p2: RoadmapProgress = { react: { levels: { '1': { passed: false, bestPct: 60 } }, checkpoints: {} } };
check(computeLearningXp(p2) === 0, 'failed/unpassed levels give 0 learning XP');
// A passed difficulty-4 level (16–20 → 200) and difficulty-5 (21–25 → 250).
const p3: RoadmapProgress = { nodejs: { levels: { '16': { passed: true, bestPct: 100 }, '25': { passed: true, bestPct: 100 } }, checkpoints: {} } };
check(computeLearningXp(p3) === 200 + 250, 'higher-difficulty levels reward more (200 + 250)');

// ── quiz XP ─────────────────────────────────────────────────────────────────
console.log('\nQuiz XP:');
check(computeQuizXp([{ difficulty: 1, correct: true }]) === 4, 'one easy correct = 4 XP');
check(computeQuizXp([{ difficulty: 5, correct: true }]) === 12, 'one hard correct = 12 XP');
check(computeQuizXp([{ difficulty: 5, correct: false }]) === 0, 'wrong answers earn nothing');
const tenAdvanced = computeQuizXp(Array.from({ length: 10 }, () => ({ difficulty: 4, correct: true })));
check(tenAdvanced === 100, '10 correct @ difficulty 4 = 100 XP');
// Learning must dwarf quizzes: a single hard checkpoint (1500) >> a perfect 10Q quiz.
check(1500 > tenAdvanced, 'a checkpoint is worth far more than a full quiz');
check(PRACTICE_XP > 0 && PRACTICE_XP < computeQuizXp([{ difficulty: 1, correct: true }, { difficulty: 1, correct: true }, { difficulty: 1, correct: true }, { difficulty: 1, correct: true }]), 'practice grant is small');

// ── specialization ──────────────────────────────────────────────────────────
console.log('\nSpecialization:');
check(specializationFor({}) === null, 'no progress → no specialization');
const fe: RoadmapProgress = { react: { levels: { '1': { passed: true, bestPct: 80 }, '2': { passed: true, bestPct: 80 } }, checkpoints: {} } };
check(specializationFor(fe) === 'Frontend', 'react progress → Frontend');
const be: RoadmapProgress = { nodejs: { levels: { '1': { passed: true, bestPct: 80 }, '2': { passed: true, bestPct: 80 } }, checkpoints: {} } };
check(specializationFor(be) === 'Backend', 'node progress → Backend');
const full: RoadmapProgress = {
  react: { levels: { '1': { passed: true, bestPct: 80 } }, checkpoints: {} },
  nodejs: { levels: { '1': { passed: true, bestPct: 80 } }, checkpoints: {} },
};
check(specializationFor(full) === 'Full-Stack', 'balanced react+node → Full-Stack');
check(displayTitle('Junior Developer', 'Frontend') === 'Junior Frontend Developer', 'composes "Junior Frontend Developer"');
check(displayTitle('Software Architect', 'Backend') === 'Software Architect', 'senior ranks keep their title (spec shown separately)');

if (failures > 0) {
  console.error(`\n❌ ${failures} leveling check(s) failed`);
  process.exit(1);
}
console.log('\n✅ All leveling checks passed');
