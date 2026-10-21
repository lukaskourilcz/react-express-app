// A snapshot of the devShark content model, computed from the registries.
//   npm run content:snapshot            plain text
//   npm run content:snapshot -- --json  the same numbers as JSON
//
// Every number below is read or derived from the module that owns it; nothing
// is typed here. Read-only: it never writes a file and never reads the
// database. The question bank is the static bank with the curation gate the
// server applies (`applyEligibility`), so the counts are the repository's
// answer; the /dev override layer (`question_edits`) is not read.
//
// The Learn section matrix (`shared/learn-sections.ts`) is not printed yet:
// that registry arrives with A1 (#487), and this script gains the matrix
// after A1 merges.

import { ROADMAP_TOPICS, liveRoadmapStructure, topicLevelCount, type RoadmapTopic } from '../lib/roadmap';
import { loadSubjectQuestionBank } from '../lib/question-bank-loader';
import { applyEligibility } from '../lib/questions-store';
import { serverContentIndex } from '../lib/access';
import { CODING_TASKS } from '../lib/coding/catalog';
import { ACTIVE_CODING_TASKS, WITHHELD_CODING_TASKS } from '../lib/coding/active';
import { LEARNING_PATHS, availabilityFor, pathEnabledInEnv, publicManifest, readinessFor } from '../lib/learning-paths/catalog';
import { CODING_INDEX } from '../shared/coding-index';
import { CODING_SECTION_TRACKS, CODING_TRACKS } from '../shared/coding-catalog';
import { evolvingStage } from '../shared/evolving';
import { pathInventory, BASE_TRACKS } from '../shared/learning-paths';
import { SKILL_PATH_BRIDGE_TOPICS, SPECIALIZATION_BRIDGE_TOPICS, WEBDEV_PLAN_STAGES, partRanges } from '../shared/progression';
import { SUBJECT_SCOPE_CATALOG, deliveryCategories } from '../shared/subject-catalog';
import {
  FREE_CODING_SHARE,
  FREE_LEARN_LEVELS,
  FREE_LEARN_TOPICS,
  codingContent,
  contentTier,
  freeCodingCounts,
} from '../shared/tiers';

const SUBJECT = 'webdev' as const;

/** "1–12", "1–25 (all)", "none": the free levels of a topic as a range. */
function levelRange(free: number[], total: number): string {
  if (free.length === 0) return 'none';
  const contiguous = free.every((level, index) => level === index + 1);
  const span = contiguous ? `1–${free.length}` : free.join(',');
  return free.length === total ? `${span} (all)` : span;
}

const pad = (value: string | number, width: number): string => String(value).padEnd(width);
const padLeft = (value: string | number, width: number): string => String(value).padStart(width);
const percent = (part: number, whole: number): string => (whole === 0 ? 'n/a' : `${((part / whole) * 100).toFixed(1)} %`);

async function main() {
  const json = process.argv.includes('--json');
  const index = serverContentIndex();
  const offeredTopics = new Set<string>(SUBJECT_SCOPE_CATALOG[SUBJECT].topics);

  /* ── the served bank ─────────────────────────────────────────────────── */
  const bank = await loadSubjectQuestionBank(SUBJECT);
  const { list: served } = applyEligibility(bank.questions);
  const servedIds = new Set(served.map((question) => question.id));
  const delivery = new Set(deliveryCategories(SUBJECT));
  const deliverable = served.filter((question) => delivery.has(question.category));
  const bankByCategory = new Map<string, number>();
  for (const question of deliverable) bankByCategory.set(question.category, (bankByCategory.get(question.category) ?? 0) + 1);

  /* ── Learn topics ────────────────────────────────────────────────────── */
  const live = liveRoadmapStructure((id) => servedIds.has(id));
  const topics = ROADMAP_TOPICS.map((topic: RoadmapTopic) => {
    const levels = topicLevelCount(topic);
    const liveLevels = live[topic].levels;
    const freeLevels = Array.from({ length: levels }, (_, i) => i + 1).filter(
      (level) => contentTier({ kind: 'learn-level', topic, level }, index) === 'free',
    );
    const parts = partRanges(levels);
    const freeParts = parts.filter((range) => contentTier({ kind: 'learn-part-test', topic, part: range.part }, index) === 'free');
    return {
      topic,
      offered: offeredTopics.has(topic),
      levels,
      availableLevels: liveLevels.filter((level) => !level.unavailable).length,
      learnQuestionsServed: liveLevels.reduce((sum, level) => sum + level.questionCount, 0),
      bankQuestionsServed: bankByCategory.get(topic) ?? 0,
      freeLevels: freeLevels.length,
      freeLevelRange: levelRange(freeLevels, levels),
      freePartTests: freeParts.length,
      partTests: parts.length,
    };
  });

  /* ── plan stages ─────────────────────────────────────────────────────── */
  const plans = BASE_TRACKS.map((track) => {
    const stages = WEBDEV_PLAN_STAGES[track];
    return { track, stages: stages.map((stage) => [...stage]), topics: stages.flat().length };
  });

  /* ── coding ──────────────────────────────────────────────────────────── */
  const issuedIds = new Set(ACTIVE_CODING_TASKS.map((task) => task.id));
  const coding = CODING_TRACKS.map((track) => {
    const authored = CODING_TASKS.filter((task) => task.track === track);
    const issued = ACTIVE_CODING_TASKS.filter((task) => task.track === track);
    return {
      track,
      inCodingSection: (CODING_SECTION_TRACKS as readonly string[]).includes(track),
      authored: authored.length,
      issued: issued.length,
      withheld: authored.filter((task) => WITHHELD_CODING_TASKS.has(task.id)).length,
      evolvingStages: issued.filter((task) => evolvingStage(task.id)).length,
      free: issued.filter((task) => contentTier(codingContent(task.id), index) === 'free').length,
    };
  });
  const codingFree = freeCodingCounts(CODING_INDEX.map((task) => task.id));
  const indexInSync =
    CODING_INDEX.length === issuedIds.size && CODING_INDEX.every((task) => issuedIds.has(task.id));

  /* ── learning paths ──────────────────────────────────────────────────── */
  const paths = LEARNING_PATHS.map((path) => {
    const inventory = pathInventory(publicManifest(path));
    const readiness = readinessFor(path);
    const enabled = pathEnabledInEnv(path.id);
    return {
      id: path.id,
      kind: path.kind,
      version: path.version,
      // The line `npm run test:paths` prints, built the same way.
      testPathsLine:
        `${path.id} v${path.version}: ${inventory.modules} modules, ${inventory.lessons} lessons, ` +
        `${inventory.moduleChecks}+${inventory.finalChecks} checks, ${inventory.codeExercises} exercises, ` +
        `${inventory.artifacts} artifacts`,
      inventory,
      tier: contentTier({ kind: 'learning-path', pathId: path.id }, index),
      competencies: path.competencies.length,
      bridges: path.bridges.length,
      estimatedHours: path.estimatedHours,
      readiness: {
        contentReady: readiness.contentReady,
        errors: readiness.issues.filter((issue) => issue.level === 'error').length,
        warnings: readiness.issues.filter((issue) => issue.level !== 'error').length,
        switchOn: enabled,
        storage: 'not checked: needs the database (migration 026)',
        availabilityIfStorageInstalled: availabilityFor({ path, enabled, storageInstalled: true }),
      },
    };
  });

  const snapshot = {
    source: 'static bank with the curation gate applied; the /dev override layer is not read',
    subject: SUBJECT,
    learn: {
      topics,
      totals: {
        offeredTopics: topics.filter((row) => row.offered).length,
        levels: topics.filter((row) => row.offered).reduce((sum, row) => sum + row.levels, 0),
        deliverableQuestions: deliverable.length,
        catalogueQuestionCount: SUBJECT_SCOPE_CATALOG[SUBJECT].questionCount,
      },
    },
    plans,
    bridges: { specialization: SPECIALIZATION_BRIDGE_TOPICS, skillPath: SKILL_PATH_BRIDGE_TOPICS },
    tiers: {
      freeLearnTopics: [...FREE_LEARN_TOPICS],
      freeLearnLevels: FREE_LEARN_LEVELS,
      coding: { ...codingFree, share: codingFree.total === 0 ? 0 : codingFree.free / codingFree.total, bounds: FREE_CODING_SHARE },
    },
    coding: {
      tracks: coding,
      issued: ACTIVE_CODING_TASKS.length,
      catalogueChallengeCount: SUBJECT_SCOPE_CATALOG[SUBJECT].codingChallengeCount,
      indexTasks: CODING_INDEX.length,
      indexInSync,
    },
    paths,
    sectionMatrix: null as null,
  };

  if (json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  const out: string[] = [];
  out.push('devShark content snapshot');
  out.push(`Computed from the registries. Questions: ${snapshot.source}.`);
  out.push('');

  out.push('Learn topics (lib/roadmap.ts LEVEL_TITLES via topicLevelCount; served = buildLiveTopic over the gated bank)');
  out.push(`${pad('topic', 15)}${padLeft('levels', 7)}${padLeft('open', 6)}${padLeft('learn Qs', 10)}${padLeft('bank Qs', 9)}  ${pad('free levels', 13)}${padLeft('free parts', 11)}  offered`);
  for (const row of topics) {
    out.push(
      `${pad(row.topic, 15)}${padLeft(row.levels, 7)}${padLeft(row.availableLevels, 6)}${padLeft(row.learnQuestionsServed, 10)}` +
        `${padLeft(row.bankQuestionsServed, 9)}  ${pad(row.freeLevelRange, 13)}${padLeft(`${row.freePartTests}/${row.partTests}`, 11)}  ` +
        `${row.offered ? 'yes' : 'no (not in SUBJECT_SCOPE_CATALOG.webdev.topics)'}`,
    );
  }
  const totals = snapshot.learn.totals;
  out.push(`Offered topics: ${totals.offeredTopics}, ${totals.levels} levels.`);
  out.push(
    `Deliverable questions: ${totals.deliverableQuestions} (SUBJECT_SCOPE_CATALOG.webdev.questionCount says ${totals.catalogueQuestionCount}` +
      `${totals.deliverableQuestions === totals.catalogueQuestionCount ? ', in agreement' : ', MISMATCH: npm run test:launch will fail'}).`,
  );
  out.push('');

  out.push('Plan stages per base track (shared/progression.ts WEBDEV_PLAN_STAGES)');
  for (const plan of plans) {
    out.push(`${pad(plan.track, 10)} ${plan.stages.map((stage) => stage.join(' ')).join(' → ')}  (${plan.stages.length} stages, ${plan.topics} topics)`);
  }
  for (const [id, list] of Object.entries(SPECIALIZATION_BRIDGE_TOPICS)) out.push(`bridge     ${id} (SPECIALIZATION_BRIDGE_TOPICS): ${list.join(' ')}`);
  for (const [id, list] of Object.entries(SKILL_PATH_BRIDGE_TOPICS)) out.push(`bridge     ${id} (SKILL_PATH_BRIDGE_TOPICS): ${list.join(' ')}`);
  out.push('');

  out.push('Tiers (shared/tiers.ts contentTier over lib/access.ts serverContentIndex)');
  out.push(`Free Learn topics in full (FREE_LEARN_TOPICS): ${FREE_LEARN_TOPICS.join(', ')}`);
  out.push(
    `Free Learn levels (FREE_LEARN_LEVELS): ${Object.entries(FREE_LEARN_LEVELS)
      .map(([topic, upTo]) => `${topic} 1–${upTo}`)
      .join(', ')}`,
  );
  const share = snapshot.tiers.coding.share;
  const inBounds = share >= FREE_CODING_SHARE.min && share <= FREE_CODING_SHARE.max;
  out.push(
    `Free coding tasks (freeCodingCounts over shared/coding-index.ts): ${codingFree.free} of ${codingFree.total} (${percent(codingFree.free, codingFree.total)}); ` +
      `FREE_CODING_SHARE ${FREE_CODING_SHARE.min * 100}–${FREE_CODING_SHARE.max * 100} %, target ${FREE_CODING_SHARE.target * 100} %: ${inBounds ? 'within' : 'OUTSIDE'}`,
  );
  out.push('');

  out.push('Coding tasks per track (lib/coding/catalog.ts CODING_TASKS, lib/coding/active.ts ACTIVE_CODING_TASKS)');
  out.push(`${pad('track', 15)}${padLeft('authored', 9)}${padLeft('issued', 8)}${padLeft('withheld', 9)}${padLeft('stages', 8)}${padLeft('free', 6)}  section`);
  for (const row of coding) {
    out.push(
      `${pad(row.track, 15)}${padLeft(row.authored, 9)}${padLeft(row.issued, 8)}${padLeft(row.withheld, 9)}${padLeft(row.evolvingStages, 8)}` +
        `${padLeft(row.free, 6)}  ${row.inCodingSection ? 'yes' : 'hidden (not in CODING_SECTION_TRACKS)'}`,
    );
  }
  out.push(
    `Issued: ${snapshot.coding.issued} (SUBJECT_SCOPE_CATALOG.webdev.codingChallengeCount says ${snapshot.coding.catalogueChallengeCount}` +
      `${snapshot.coding.issued === snapshot.coding.catalogueChallengeCount ? ', in agreement' : ', MISMATCH'}). ` +
      `shared/coding-index.ts lists ${CODING_INDEX.length}: ${indexInSync ? 'in sync' : 'STALE, run npm run build:coding-index'}.`,
  );
  out.push('');

  out.push('Learning paths (pathInventory(publicManifest(path)), the line npm run test:paths prints)');
  for (const path of paths) {
    const inv = path.inventory;
    out.push(`  ${path.testPathsLine}`);
    out.push(
      `    ${path.kind}, ${path.tier} (contentTier 'learning-path'); module checks ${inv.moduleChecks}, final checks ${inv.finalChecks}, diagnostic checks ${inv.diagnosticChecks}; ` +
        `module code ${inv.moduleCodeExercises}, final code ${inv.finalCodeExercises}, diagnostic code ${inv.diagnosticCodeExercises}`,
    );
    out.push(
      `    ${path.competencies} competencies, ${path.bridges} bridges, ${inv.estimatedMinutes} authored minutes, ` +
        `estimated ${path.estimatedHours.min}–${path.estimatedHours.max} hours`,
    );
  }
  out.push('');

  out.push('Readiness (lib/learning-paths/catalog.ts readinessFor, pathEnabledInEnv, availabilityFor)');
  for (const path of paths) {
    const r = path.readiness;
    out.push(
      `  ${pad(path.id, 16)} content ${r.contentReady ? 'ready' : 'INCOMPLETE'} (${r.errors} errors, ${r.warnings} warnings); ` +
        `switch ${r.switchOn ? 'on' : 'off'} in this environment; storage ${r.storage}; ` +
        `availability once migration 026 is installed: ${r.availabilityIfStorageInstalled}`,
    );
  }
  out.push('');

  out.push('Learn section matrix: not printed. shared/learn-sections.ts arrives with A1 (#487); the matrix is added here after A1 merges.');
  console.log(out.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
