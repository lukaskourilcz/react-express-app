// The devShark content inventory: every question and coding task a learner
// can be served, every one that is present but no longer served, and the
// content hash each review decision is recorded against.
//
//   npm run audit:devshark-inventory -- --out <dir>
//
// Writes one JSON file per review batch (the reviewer's input: the English
// item, its level and objective) plus `inventory.json`,
// the reconciled list every ledger row must map back to. Read-only: it never
// edits content and never touches the database — the override layer is a
// source the inventory can only *name*, which is why it appears with a null
// count rather than a number.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { questions, type Question } from '../lib/quiz-data';
import { fixTheTestQuestions } from '../lib/roadmap-questions-fix-the-test';
import { roadmapCoolStuffQuestions } from '../lib/roadmap-questions';
import { buildRoadmap } from '../lib/roadmap-build';
import { htmlSeeds } from '../lib/roadmap-questions-html';
import { cssSeeds } from '../lib/roadmap-questions-css';
import { topicLevels, type RoadmapTopic } from '../lib/roadmap';
import { contentHash, taskHash, questionEligibility } from '../lib/curation';
import { CODING_TASKS } from '../lib/coding/catalog';
import { ACTIVE_CODING_TASKS } from '../lib/coding/active';
import { solutionFor } from '../lib/coding/solutions';
import { restoredLevels, restoredQuestionIds } from '../lib/roadmap-questions-restored';
import { isRetiredTopic } from '../shared/retired-content';
import { WEBDEV_PLAN_STAGES } from '../shared/progression';
import { LEARNING_PATHS } from '../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../lib/learning-paths/audit';

type Delivery =
  /** In the served pool and offered by discovery. */
  | 'active'
  /** In the served pool but its section is retired: refused by every
   * category-scoped request, reachable only where a pool is built from the
   * subject's full category list. */
  | 'retired-section'
  /** In the repository, referenced by no delivery path. */
  | 'unreferenced';

interface InventoryItem {
  id: string;
  kind: 'question';
  source: string;
  delivery: Delivery;
  category: string;
  topic: string | null;
  level: number | null;
  levelTitle: string | null;
  difficulty: number;
  tags: string[];
  contentHash: string;
  eligible: boolean;
}

const ID_PREFIX_TOPIC: Record<string, RoadmapTopic> = {
  'rm-js': 'javascript', 'rm-ts': 'typescript', 'rm-react': 'react', 'rm-next': 'nextjs', 'rm-node': 'nodejs',
  'rm-html': 'html', 'rm-css': 'css', 'rm-git': 'git', 'rm-dsa': 'dsa', 'rm-algorithms': 'algorithms',
  'rm-abbr': 'abbreviations', 'rm-general': 'general', 'rm-ai': 'ai', 'rm-cool': 'cool-stuff', 'rm-db': 'databases',
  'rm-sysdesign': 'system-design', 'rm-testing': 'testing', 'rm-devops': 'devops', 'rm-security': 'security',
};

const restored = new Map(restoredLevels.flatMap(entry =>
  restoredQuestionIds(entry.topic, entry.level).map(id => [id, entry] as const)));

// Retired sections keep their level titles (lib/roadmap.ts still names them)
// while no longer being roadmap topics, so the lookup goes by prefix alone.
function topicOf(id: string): RoadmapTopic | null {
  const fresh = restored.get(id);
  if (fresh) return fresh.topic as RoadmapTopic;
  const m = /^(rm-[a-z]+)-\d+$/.exec(id);
  return (m && ID_PREFIX_TOPIC[m[1]]) ?? null;
}

function levelOf(id: string): number | null {
  const fresh = restored.get(id);
  if (fresh) return fresh.level;
  const m = /-(\d+)$/.exec(id);
  return m && id.startsWith('rm-') ? Math.floor((Number(m[1]) - 1) / 8) + 1 : null;
}

function levelTitle(topic: RoadmapTopic | null, level: number | null): string | null {
  if (!topic || !level) return null;
  return topicLevels(topic).find((l) => l.level === level)?.title ?? null;
}

const plansFor = (topic: string): string[] =>
  (Object.keys(WEBDEV_PLAN_STAGES) as (keyof typeof WEBDEV_PLAN_STAGES)[])
    .filter((track) => WEBDEV_PLAN_STAGES[track].some((stage) => stage.includes(topic)));

function describe(q: Question, source: string, delivery: Delivery): InventoryItem {
  const topic = topicOf(q.id);
  const level = levelOf(q.id);
  return {
    id: q.id,
    kind: 'question',
    source,
    delivery,
    category: q.category,
    topic,
    level,
    levelTitle: levelTitle(topic, level),
    difficulty: q.difficulty,
    tags: q.tags,
    contentHash: contentHash(q),
    eligible: questionEligibility(q).active,
  };
}

function reviewerRow(q: Question, item: InventoryItem) {
  return {
    id: q.id,
    delivery: item.delivery,
    category: q.category,
    topic: item.topic,
    level: item.level,
    levelTitle: item.levelTitle,
    difficulty: q.difficulty,
    tags: q.tags,
    contentHash: item.contentHash,
    hint: q.introduction,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    ...(q.snippet ? { snippet: q.snippet } : {}),
  };
}

function main() {
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex >= 0 ? process.argv[outIndex + 1] : null;
  if (!outDir) throw new Error('Pass --out <dir>');
  mkdirSync(outDir, { recursive: true });

  const items: InventoryItem[] = [];
  const rows = new Map<string, ReturnType<typeof reviewerRow>[]>();
  const push = (q: Question, source: string, delivery: Delivery, batch: string) => {
    const item = describe(q, source, delivery);
    items.push(item);
    const list = rows.get(batch) ?? [];
    list.push(reviewerRow(q, item));
    rows.set(batch, list);
  };

  // The served pool: lib/webdev-bank.ts loads `questions` plus the
  // fix-the-test set. Retired sections stay in the pool for history and are
  // classified by their category.
  // Batches of at most sixty items per topic, split evenly, so every
  // reviewer reads a run of whole levels rather than a tail of sixteen and a
  // review that is interrupted loses little.
  const perTopic = new Map<string, number>();
  for (const q of questions) perTopic.set(topicOf(q.id) ?? q.category, (perTopic.get(topicOf(q.id) ?? q.category) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const q of questions) {
    const delivery: Delivery = isRetiredTopic(q.category) ? 'retired-section' : 'active';
    const key = topicOf(q.id) ?? q.category;
    const total = perTopic.get(key) ?? 1;
    const parts = Math.ceil(total / 60);
    const size = Math.ceil(total / parts);
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    push(q, 'lib/quiz-data.ts:questions', delivery, parts > 1 ? `${key}-${Math.floor(index / size) + 1}` : key);
  }
  for (const q of fixTheTestQuestions) push(q, 'lib/roadmap-questions-fix-the-test.ts', 'retired-section', 'testing-fix');

  // Present, referenced by no delivery path.
  for (const q of roadmapCoolStuffQuestions) push(q, 'lib/roadmap-questions-cool-stuff.ts', 'unreferenced', 'cool-stuff');
  for (const q of buildRoadmap('rm-html', 'html', htmlSeeds)) push({ ...q, id: `legacy-${q.id}` }, 'lib/roadmap-questions-html.ts (pre-#180 bank)', 'unreferenced', 'html-legacy');
  for (const q of buildRoadmap('rm-css', 'css', cssSeeds)) push({ ...q, id: `legacy-${q.id}` }, 'lib/roadmap-questions-css.ts (pre-#180 bank)', 'unreferenced', 'css-legacy');

  // The original DevQuiz bank inside quiz-data.ts: only its code-snippets
  // survive into `questions`; the rest is module-private and counted from the
  // source text because nothing exports it.
  const quizData = readFileSync(path.join(process.cwd(), 'lib/quiz-data.ts'), 'utf8');
  const coreIds = quizData.slice(0, quizData.indexOf('const codeReadingQuestions')).match(/^\s{4}id: '[^']+',$/gm) ?? [];
  const legacyCore = coreIds.length - questions.filter((q) => q.category === 'code-snippets').length;

  const byDelivery = (d: Delivery) => items.filter((i) => i.delivery === d).length;
  const activeCoding = new Set(ACTIVE_CODING_TASKS.map(task => task.id));
  const materialHash = nativeContentHash;
  const pathMaterials = LEARNING_PATHS.flatMap(learningPath => learningPath.modules.flatMap(module => [
    ...module.lessons.map(lesson => ({ id: `${learningPath.id}:${lesson.id}`, path: learningPath.id, module: module.id, kind: 'lesson', contentHash: materialHash(lesson) })),
    ...module.activities.flatMap(activity => [
      { id: `${learningPath.id}:${activity.id}`, path: learningPath.id, module: module.id, kind: 'activity', contentHash: materialHash(activity), gradingHash: nativeGradingHash(activity) },
      ...(activity.questions ?? []).map(question => ({ id: `${learningPath.id}:${question.id}`, path: learningPath.id, module: module.id, kind: 'check-question', contentHash: materialHash(question) })),
    ]),
  ]));
  const inventory = {
    generatedAt: new Date().toISOString().slice(0, 10),
    subject: 'webdev',
    sources: [
      { id: 'question-bank', description: 'lib/webdev-bank.ts: quiz-data.ts questions + fix-the-test', items: questions.length + fixTheTestQuestions.length, countable: true },
      { id: 'coding-catalog', description: 'lib/coding/catalog.ts', items: CODING_TASKS.length, countable: true },
      { id: 'learning-paths', description: 'lib/learning-paths (FDE, DSA Foundations), gated by env switches', items: LEARNING_PATHS.length, countable: true },
      { id: 'question_edits', description: 'Supabase override table (admin edits, custom questions, hides). Not readable from the repository.', items: null, countable: false },
      { id: 'legacy-core', description: 'lib/quiz-data.ts coreQuestions outside code-snippets: module-private, exported nowhere', items: legacyCore, countable: true },
    ],
    plans: Object.fromEntries(Object.keys(ID_PREFIX_TOPIC).map((p) => [ID_PREFIX_TOPIC[p], plansFor(ID_PREFIX_TOPIC[p])])),
    counts: { active: byDelivery('active'), eligibleQuestions: items.filter(item => item.delivery === 'active' && item.eligible).length, retiredSection: byDelivery('retired-section'), unreferenced: byDelivery('unreferenced'), legacyCore, codingTasks: CODING_TASKS.length, activeCodingTasks: activeCoding.size, hiddenCodingTasks: CODING_TASKS.length - activeCoding.size, pathMaterials: pathMaterials.length },
    items,
    codingTasks: CODING_TASKS.map((t) => ({ id: t.id, track: t.track, topic: t.topic, level: t.level, tier: t.tier, verify: t.verify, format: t.format ?? 'implement', title: t.title, contentHash: taskHash(t, solutionFor(t.id)), active: activeCoding.has(t.id) })),
    pathMaterials,
  };
  writeFileSync(path.join(outDir, 'inventory.json'), JSON.stringify(inventory, null, 2));
  for (const [batch, list] of rows) {
    writeFileSync(path.join(outDir, `batch-${batch}.json`), JSON.stringify(list, null, 2));
  }
  for (const learningPath of LEARNING_PATHS) {
    writeFileSync(path.join(outDir, `batch-path-${learningPath.id}.json`), JSON.stringify(learningPath, null, 2));
  }
  console.log(JSON.stringify({ counts: inventory.counts, batches: [...rows.keys()].map((k) => `${k}:${rows.get(k)!.length}`) }, null, 2));
}

main();
