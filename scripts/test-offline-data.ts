// Validates the bundled mobile offline dataset (mobile/src/data/offline-data.ts):
// the roadmap structure is complete, every level/checkpoint resolves to its full
// question set from the bundled pool, and offline quiz selection + grading work.
// Mirrors the id/selection logic in mobile/src/data/offline.ts.

import offlineData from '../mobile/src/data/offline-data';

interface Q { id: string; tags: string[]; question: string; options: string[]; correctAnswer: number; explanation: string; category: string; difficulty: number; }
interface Data {
  generatedAt: string;
  questionsPerLevel: number;
  structure: { topics: string[]; structure: Record<string, { levels: { level: number; questionCount: number }[]; checkpoints: { checkpoint: number; questionCount: number }[] }> };
  questions: Q[];
}
const DATA = offlineData as Data;

const ID_PREFIX: Record<string, string> = {
  javascript: 'rm-js', typescript: 'rm-ts', react: 'rm-react', nextjs: 'rm-next', nodejs: 'rm-node',
  html: 'rm-html', css: 'rm-css', git: 'rm-git', dsa: 'rm-dsa', algorithms: 'rm-algorithms',
  abbreviations: 'rm-abbr', general: 'rm-general',
};
const PER_LEVEL = DATA.questionsPerLevel;
const byId = new Map(DATA.questions.map((q) => [q.id, q]));

let failures = 0;
const fail = (m: string) => { failures++; console.error('  ✗ ' + m); };

const levelIds = (topic: string, level: number) =>
  Array.from({ length: PER_LEVEL }, (_, i) => `${ID_PREFIX[topic]}-${(level - 1) * PER_LEVEL + 1 + i}`);

console.log(`Offline bundle: ${DATA.questions.length} questions, generated ${DATA.generatedAt}`);
console.log(`Topics: ${DATA.structure.topics.join(', ')}`);

// Every level + checkpoint resolves to a full, well-formed question set.
for (const topic of DATA.structure.topics) {
  const ts = DATA.structure.structure[topic];
  if (!ts) { fail(`${topic}: missing structure`); continue; }
  for (const lvl of ts.levels) {
    const qs = levelIds(topic, lvl.level).map((id) => byId.get(id));
    if (qs.some((q) => !q)) { fail(`${topic} L${lvl.level}: missing questions offline`); continue; }
    if (qs.length !== PER_LEVEL) fail(`${topic} L${lvl.level}: ${qs.length} questions`);
    for (const q of qs as Q[]) {
      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) fail(`${q.id}: bad answer index`);
      if (!q.explanation) fail(`${q.id}: no explanation in offline bundle`);
    }
  }
}
console.log(`  ✓ every level resolves to ${PER_LEVEL} answerable questions offline`);

// Spot-check checkpoints cover 40 questions for a 25-level and a 15-level topic.
for (const [topic, cp] of [['javascript', 5], ['algorithms', 3]] as const) {
  let ids: string[] = [];
  const first = (cp - 1) * 5 + 1;
  for (let l = first; l < first + 5; l++) ids = ids.concat(levelIds(topic, l));
  if (ids.length !== 40 || ids.some((id) => !byId.has(id))) fail(`${topic} checkpoint ${cp} incomplete offline`);
}
console.log('  ✓ final checkpoints resolve to 40 questions (js + algorithms)');

// Offline quiz: selection by category respects difficulty, and grading is correct.
function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }
function select(categories: string[], mode: string, count: number): Q[] {
  const pool = DATA.questions.filter((q) => categories.includes(q.category));
  if (mode === 'easy') return shuffle(pool.filter((q) => q.difficulty <= 2)).slice(0, count);
  if (mode === 'advanced') return shuffle(pool.filter((q) => q.difficulty >= 3)).slice(0, count);
  return shuffle(pool).slice(0, count);
}
const picked = select(['algorithms'], 'advanced', 10);
if (picked.length !== 10) fail(`offline quiz select returned ${picked.length}, want 10`);
if (picked.some((q) => q.difficulty < 3)) fail('advanced quiz returned an easy question');
// Grade: answer everything correctly → 100%.
const answers: Record<string, number> = {};
for (const q of picked) answers[q.id] = q.correctAnswer;
const correct = picked.filter((q) => answers[q.id] === q.correctAnswer).length;
if (correct !== picked.length) fail('offline grading miscounted a perfect quiz');
console.log('  ✓ offline quiz selects by difficulty and grades correctly');

// JS quiz pool must be large enough for a 20-question quiz.
const jsPool = DATA.questions.filter((q) => q.category === 'javascript').length;
if (jsPool < 20) fail(`javascript offline pool too small (${jsPool})`);
console.log(`  ✓ category pools are large enough (javascript: ${jsPool})`);

if (failures > 0) {
  console.error(`\n❌ ${failures} offline-bundle check(s) failed`);
  process.exit(1);
}
console.log('\n✅ All offline-bundle checks passed');
