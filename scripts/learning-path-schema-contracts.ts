// Contracts for the content shapes B1 (#497) added, run by `npm run test:paths`.
// Pure: the validator, the merge, the public projection and the shared
// completion arithmetic, over scripts/learning-path-schema-fixture.ts and the
// published paths.
//
//   * the validator accepts the fixture and refuses each broken variant with
//     its own code: a shelf module that is not optional or carries
//     requirements, a scenario check with fewer than three questions, an
//     empty scenario or note, a scenario off a check, a note off a code
//     activity, a loop module that depends on a shelf module
//   * the public projection carries the three new fields and no other new key
//   * a scenario never quotes a question id, a correct option or an
//     explanation (named per question, for the authors of B3 and B10)
//   * an off-loop module never supplies the next action, never counts toward
//     guided completion or the inventory's module total, and sends the
//     database no requirements, even if its optional flag slipped
//   * a shelf module's checks, code and artifacts stay out of every count
//     the path header shows

import { LEARNING_PATHS, activitySummary, moduleSummary, publicManifest } from '../lib/learning-paths/catalog';
import { moduleRequirements } from '../lib/learning-paths/handlers';
import { mergePath, type MergedActivity, type ModuleSource, type PathSource } from '../lib/learning-paths/types';
import { validatePath } from '../lib/learning-paths/validate';
import { artifactTally, isOffLoopModule, nextActivityId, pathGuidedComplete, pathInventory, type EvidenceState, type LearningPathManifest } from '../shared/learning-paths';
import { SCHEMA_FIXTURE_NOTE, SCHEMA_FIXTURE_SCENARIO, schemaFixture, schemaFixtureSource } from './learning-path-schema-fixture';

type Fail = (message: string) => void;

const LEAK_MATCH_MIN = 30;

const ACTIVITY_SUMMARY_KEYS = new Set([
  'id', 'kind', 'purpose', 'verification', 'title', 'summary', 'competencies', 'estimatedMinutes', 'questionCount',
  'passThreshold', 'domains', 'language', 'reuseTaskId', 'rubricDimensions', 'scenario', 'fixtureNote',
]);
const MODULE_SUMMARY_KEYS = new Set([
  'id', 'title', 'outcomes', 'competencies', 'dependsOn', 'lessons', 'activities', 'requires', 'requiresAtLeast',
  'estimatedMinutes', 'optional', 'shelf', 'deliveryPhase',
]);
const MANIFEST_KEYS = [
  'id', 'kind', 'version', 'title', 'summary', 'outcomes', 'nonGoals', 'entryRequirement', 'competencies', 'modules',
  'bridges', 'rubric', 'diagnosticActivityId', 'estimatedHours', 'sources', 'reviewedOn', 'completionLabel',
];

/** Questions whose id, correct option or explanation a check's scenario
 * quotes. The scenario ships in the public catalogue before any attempt. */
export function scenarioLeaks(activity: MergedActivity): string[] {
  const scenario = activity.scenario;
  if (scenario === undefined) return [];
  return (activity.questions ?? []).filter((question) => {
    const correct = question.options[question.correct] ?? '';
    return scenario.includes(question.id)
      || (correct.length >= LEAK_MATCH_MIN && scenario.includes(correct))
      || (question.explanation.length >= LEAK_MATCH_MIN && scenario.includes(question.explanation));
  }).map((question) => question.id);
}

const LOOP = 'fde-v1-x01';
const SHELF = 'fde-v1-ip01';

function moduleOf(source: PathSource, id: string): ModuleSource {
  return source.modules.find((module) => module.id === id)!;
}

function activityOf(source: PathSource, id: string) {
  return source.modules.flatMap((module) => module.activities).find((activity) => activity.id === id)!;
}

/** The fixture after `edit`, merged and validated: its error codes, and its
 * warning codes separately. */
function variant(edit: (source: PathSource) => void): { errors: string[]; warnings: string[]; at: string[] } {
  const source = structuredClone(schemaFixtureSource());
  edit(source);
  const issues = validatePath(mergePath(source));
  return {
    errors: issues.filter((issue) => issue.level === 'error').map((issue) => issue.code),
    warnings: issues.filter((issue) => issue.level === 'warning').map((issue) => issue.code),
    at: issues.map((issue) => `${issue.code}@${issue.at}`),
  };
}

function checkProjectionKeys(fail: Fail, where: string, manifest: LearningPathManifest) {
  const keys = Object.keys(manifest);
  if (JSON.stringify(keys) !== JSON.stringify(MANIFEST_KEYS)) fail(`${where}: the manifest keys changed to ${keys.join(', ')}`);
  for (const module of manifest.modules) {
    for (const key of Object.keys(module)) {
      if (!MODULE_SUMMARY_KEYS.has(key)) fail(`${where}/${module.id}: the module summary carries a new key ${key}`);
    }
    for (const activity of module.activities) {
      for (const key of Object.keys(activity)) {
        if (!ACTIVITY_SUMMARY_KEYS.has(key)) fail(`${where}/${activity.id}: the activity summary carries a new key ${key}`);
      }
    }
  }
}

export function schemaContracts(fail: Fail): void {
  // A newly authored teaching module must not be omitted from the capstone.
  const fdeManifest = publicManifest(LEARNING_PATHS.find(path => path.id === 'fde')!);
  const capstone = fdeManifest.modules.find(module => module.id === 'fde-v1-c01')!;
  const teaching = fdeManifest.modules.filter(module => !isOffLoopModule(module) && module.id !== capstone.id);
  if (JSON.stringify(capstone.dependsOn) !== JSON.stringify(teaching.map(module => module.id))) fail('capstone dependencies omit or reorder a required teaching module');
  // The final curriculum is exactly M01–M14; shelf modules never gate completion.
  const finalTeaching = Array.from({ length: 14 }, (_, index) => `fde-v1-m${String(index + 1).padStart(2, '0')}`);
  if (JSON.stringify(capstone.dependsOn) !== JSON.stringify(finalTeaching)) fail(`capstone dependsOn must be exactly M01–M14, got ${capstone.dependsOn.join(', ')}`);
  for (const id of capstone.dependsOn) {
    const module = fdeManifest.modules.find(candidate => candidate.id === id);
    if (!module || isOffLoopModule(module)) fail(`capstone depends on ${id}, which is not a required teaching module`);
  }
  for (const id of ['fde-v1-c01-executive-update', 'fde-v1-c01-walkthrough-script']) {
    if (!capstone.requires.some(requirement => requirement.activityId === id && requirement.state === 'self_reviewed')) fail(`capstone does not require ${id}`);
    const states = new Map<string, EvidenceState>();
    for (const module of fdeManifest.modules) for (const activity of module.activities) states.set(activity.id, activity.verification === 'self_reviewed' ? 'self_reviewed' : 'verified_pass');
    if (!pathGuidedComplete(fdeManifest, states)) fail('all required capstone work should complete the authored path');
    states.delete(id);
    if (pathGuidedComplete(fdeManifest, states)) fail(`guided completion skipped the required ${id}`);
  }

  /* ── 1. the base fixture validates ──────────────────────────────────── */
  const base = variant(() => {});
  if (base.errors.length || base.warnings.length) fail(`schema fixture: expected no issues, got ${base.at.join(', ')}`);

  /* ── 2. each broken variant fails with its own code ────────────────── */
  const expectErrors = (label: string, edit: (source: PathSource) => void, want: string[], absent: string[] = []) => {
    const { errors, at } = variant(edit);
    for (const code of want) if (!errors.includes(code)) fail(`schema ${label}: expected ${code}, got ${at.join(', ') || 'no issues'}`);
    for (const code of absent) if (errors.includes(code)) fail(`schema ${label}: did not expect ${code}`);
  };
  expectErrors('shelf without optional', (s) => { delete moduleOf(s, SHELF).optional; }, ['shelf_not_optional'], ['no_requirements']);
  expectErrors('optional shelf with requirements', (s) => {
    moduleOf(s, SHELF).requires = [{ activityId: 'fde-v1-ip01-check', state: 'verified_pass' }];
  }, ['optional_requirements'], ['shelf_not_optional']);
  expectErrors('shelf without optional, with requirements', (s) => {
    const shelf = moduleOf(s, SHELF);
    delete shelf.optional;
    shelf.requires = [{ activityId: 'fde-v1-ip01-check', state: 'verified_pass' }];
  }, ['shelf_not_optional', 'optional_requirements']);
  expectErrors('unknown delivery phase', (s) => { (moduleOf(s, LOOP) as { deliveryPhase?: string }).deliveryPhase = 'other'; }, ['unknown_delivery_phase']);
  expectErrors('missing delivery phase', (s) => { delete moduleOf(s, LOOP).deliveryPhase; }, ['missing_delivery_phase']);
  expectErrors('unknown shelf', (s) => { (moduleOf(s, SHELF) as { shelf?: string }).shelf = 'other'; }, ['unknown_shelf']);
  expectErrors('two-question scenario', (s) => { activityOf(s, 'fde-v1-x01-case').questions!.pop(); }, ['scenario_too_few_questions']);
  expectErrors('three-question scenario', () => {}, [], ['scenario_too_few_questions']);
  {
    const { at } = variant((s) => { activityOf(s, 'fde-v1-x01-case').scenario = '  '; });
    if (!at.includes('missing_copy@fde/fde-v1-x01-case.scenario')) fail(`schema blank scenario: expected missing_copy at the scenario, got ${at.join(', ')}`);
  }
  {
    const { at } = variant((s) => { activityOf(s, 'fde-v1-x01-drill').fixtureNote = ''; });
    if (!at.includes('missing_copy@fde/fde-v1-x01-drill.fixtureNote')) fail(`schema empty fixture note: expected missing_copy, got ${at.join(', ')}`);
  }
  {
    const { at } = variant((s) => {
      moduleOf(s, LOOP).lessons[0].sections.push({ kind: 'example', language: 'javascript', code: 'console.log(1);', caption: 'Run it.', note: ' ' });
    });
    if (!at.includes('missing_copy@fde/fde-v1-x01-l1.section[1].note')) fail(`schema blank example note: expected missing_copy, got ${at.join(', ')}`);
  }
  expectErrors('scenario on a code activity', (s) => { activityOf(s, 'fde-v1-x01-drill').scenario = 'A case.'; }, ['misplaced_scenario']);
  expectErrors('fixture note on a check', (s) => { activityOf(s, 'fde-v1-x01-case').fixtureNote = 'A note.'; }, ['misplaced_fixture_note']);
  expectErrors('fixture note on a reused task', (s) => {
    const drill = activityOf(s, 'fde-v1-x01-drill');
    delete drill.code;
    drill.reuseTaskId = 'js-binary-search';
  }, [], ['misplaced_fixture_note', 'bad_reuse', 'missing_copy']);
  expectErrors('fractional answer index', (s) => { activityOf(s, 'fde-v1-x01-case').questions![0].correct = 0.5; }, ['bad_answer']);
  expectErrors('non-finite criterion weight', (s) => {
    activityOf(s, 'fde-v1-x01-drill').code!.criteria = [{ id: 'core', label: 'Required behaviour', critical: true, weight: Number.NaN }];
  }, ['bad_weight']);
  expectErrors('non-finite pass threshold', (s) => { activityOf(s, 'fde-v1-x01-case').passThreshold = Number.NaN; }, ['bad_threshold']);
  expectErrors('non-integer artifact field cap', (s) => {
    moduleOf(s, SHELF).activities.push({
      id: 'fde-v1-ip01-star', kind: 'artifact', purpose: 'exercise', verification: 'self_reviewed',
      title: 'STAR story', summary: 'Write one STAR story.', competencies: ['integration'], estimatedMinutes: 10,
      artifact: {
        brief: 'Write one STAR story.',
        fields: [{ id: 'story', label: 'Story', help: 'Tell it.', kind: 'long-text', required: true, maxLength: Number.NaN }],
        rubricDimensions: ['clarity'],
      },
    });
  }, ['bad_max_length']);
  expectErrors('diagnostic that is not a check', (s) => {
    activityOf(s, 'fde-v1-ip01-read').purpose = 'diagnostic';
    s.diagnosticActivityId = 'fde-v1-ip01-read';
  }, ['diagnostic_not_check'], ['wrong_purpose', 'diagnostic_required']);
  expectErrors('loop module depends on a shelf module', (s) => { moduleOf(s, LOOP).dependsOn = [SHELF]; }, ['loop_depends_on_shelf']);
  expectErrors('shelf module depends on a loop module', (s) => { moduleOf(s, SHELF).dependsOn = [LOOP]; }, [], ['loop_depends_on_shelf']);
  {
    const { errors, warnings } = variant((s) => { s.modules.reverse(); });
    if (!warnings.includes('shelf_before_loop') || errors.length) fail(`schema shelf ahead of the loop: expected one shelf_before_loop warning, got ${[...errors, ...warnings].join(', ')}`);
  }
  {
    const { errors, warnings } = variant((s) => { activityOf(s, 'fde-v1-x01-case').scenario = 'x'.repeat(2_001); });
    if (!warnings.includes('long_scenario') || errors.length) fail(`schema long scenario: expected a long_scenario warning only, got ${[...errors, ...warnings].join(', ')}`);
    const short = variant((s) => { activityOf(s, 'fde-v1-x01-case').scenario = 'x'.repeat(2_000); });
    if (short.warnings.includes('long_scenario')) fail('schema scenario of 2,000 characters: warned as long');
  }

  /* ── 3. the projection carries the new fields where authored ───────── */
  const fixture = schemaFixture();
  const loop = fixture.modules.find((module) => module.id === LOOP)!;
  const shelf = fixture.modules.find((module) => module.id === SHELF)!;
  const check = loop.activities.find((activity) => activity.id === 'fde-v1-x01-case')!;
  const drill = loop.activities.find((activity) => activity.id === 'fde-v1-x01-drill')!;
  if (activitySummary(check).scenario !== SCHEMA_FIXTURE_SCENARIO) fail('schema projection: the check summary lost its scenario');
  if (activitySummary(drill).fixtureNote !== SCHEMA_FIXTURE_NOTE) fail('schema projection: the code summary lost its fixture note');
  for (const activity of fixture.modules.flatMap((module) => module.activities)) {
    const summary = activitySummary(activity);
    if (activity !== check && 'scenario' in summary) fail(`schema projection: ${activity.id} carries a scenario it never had`);
    if (activity !== drill && 'fixtureNote' in summary) fail(`schema projection: ${activity.id} carries a fixture note it never had`);
  }
  const shelfSummary = moduleSummary(shelf);
  if (shelfSummary.shelf !== 'interview-prep' || shelfSummary.optional !== true) fail('schema projection: the shelf module lost its shelf or optional flag');
  if ('shelf' in moduleSummary(loop)) fail('schema projection: a loop module carries a shelf key');

  /* ── 4. nothing else new in the public shapes ──────────────────────── */
  checkProjectionKeys(fail, 'schema fixture', publicManifest(fixture));
  for (const path of LEARNING_PATHS) {
    checkProjectionKeys(fail, path.id, publicManifest(path));
    for (const activity of path.modules.flatMap((module) => module.activities)) {
      if (activity.scenario !== undefined && activity.kind !== 'check') fail(`${path.id}/${activity.id}: a scenario off a check`);
    }
  }

  /* ── 5. a scenario never quotes an answer ──────────────────────────── */
  for (const path of [fixture, ...LEARNING_PATHS]) {
    for (const activity of path.modules.flatMap((module) => module.activities)) {
      const leaks = scenarioLeaks(activity);
      if (leaks.length) fail(`${path.id}/${activity.id}: the scenario quotes the answer material of ${leaks.join(', ')}`);
    }
  }
  {
    const leaking = { ...check, scenario: `${check.scenario}\n\n${check.questions![1].explanation}` };
    if (JSON.stringify(scenarioLeaks(leaking)) !== JSON.stringify(['fde-v1-x01-case-q2'])) {
      fail('schema leak guard: a scenario quoting an explanation was not named by its question');
    }
    const quotingCorrect = { ...check, scenario: `${check.scenario} ${check.questions![0].options[0]}` };
    if (!scenarioLeaks(quotingCorrect).includes('fde-v1-x01-case-q1')) fail('schema leak guard: a scenario quoting the correct option was not named');
  }

  /* ── 6. the shelf never leads, never completes the path ────────────── */
  const manifest = publicManifest(fixture);
  const loopDone = new Map<string, EvidenceState>([
    ['fde-v1-x01-read', 'self_reviewed'],
    ['fde-v1-x01-case', 'verified_pass'],
    ['fde-v1-x01-drill', 'verified_pass'],
  ]);
  const shelfDone = new Map<string, EvidenceState>([
    ['fde-v1-ip01-read', 'self_reviewed'],
    ['fde-v1-ip01-check', 'verified_pass'],
  ]);
  if (nextActivityId(manifest, new Map()) !== 'fde-v1-x01-read') fail('schema progress: a new learner is not sent to the loop lesson');
  if (nextActivityId(manifest, loopDone) !== null) fail('schema progress: with the loop done, the next action points at the shelf');
  if (!pathGuidedComplete(manifest, loopDone)) fail('schema progress: the loop alone does not complete the path');
  if (pathGuidedComplete(manifest, shelfDone)) fail('schema progress: the shelf alone completed the path');
  if (nextActivityId(manifest, shelfDone) !== 'fde-v1-x01-read') fail('schema progress: shelf work moved the next action off the loop');
  const inventory = pathInventory(manifest);
  if (inventory.modules !== 1 || inventory.lessons !== 1) fail(`schema inventory: expected 1 module and 1 lesson, got ${inventory.modules} and ${inventory.lessons}`);
  {
    // The header shows these counts side by side, so the shelf's check,
    // drill and artifact stay out of every one of them, as its lesson and
    // minutes do. Give the shelf a drill and an artifact of its own first.
    const stocked = structuredClone(manifest);
    const shelf = stocked.modules.find((module) => module.id === SHELF)!;
    const drill = stocked.modules.flatMap((module) => module.activities).find((activity) => activity.kind === 'code')!;
    shelf.activities.push(
      { ...drill, id: 'fde-v1-ip01-drill' },
      { ...drill, id: 'fde-v1-ip01-star', kind: 'artifact', verification: 'self_reviewed', language: undefined, rubricDimensions: ['clarity'] },
    );
    const counted = pathInventory(stocked);
    const expected = { checks: 3, moduleChecks: 3, codeExercises: 1, moduleCodeExercises: 1, artifacts: 0, modules: 1, lessons: 1 };
    for (const [key, value] of Object.entries(expected)) {
      const got = counted[key as keyof typeof expected];
      if (got !== value) fail(`schema inventory: ${key} is ${got}, expected ${value} with the shelf left out`);
    }
    if (counted.estimatedMinutes !== inventory.estimatedMinutes) fail('schema inventory: shelf minutes reached the path estimate');
    // The progress screen says all of the tally's total are required, so a
    // shelf write-up must stay out of it, submitted or not.
    const tally = artifactTally(stocked, new Map([['fde-v1-ip01-star', 'self_reviewed']]));
    if (tally.total !== 0 || tally.submitted !== 0) fail(`schema tally: a shelf artifact reached the required artifact count (${tally.submitted}/${tally.total})`);
  }

  /* ── 7. the shelf stays off the loop even without its optional flag ── */
  // The validator refuses this source; the arithmetic must not rely on it.
  const slipped = structuredClone(schemaFixtureSource());
  const slippedShelf = moduleOf(slipped, SHELF);
  delete slippedShelf.optional;
  slippedShelf.requires = [{ activityId: 'fde-v1-ip01-check', state: 'verified_pass' }];
  const slippedPath = mergePath(slipped);
  const slippedManifest = publicManifest(slippedPath);
  const shelfIds = new Set(slippedShelf.activities.map((activity) => activity.id));
  for (const states of [new Map<string, EvidenceState>(), loopDone, shelfDone]) {
    const next = nextActivityId(slippedManifest, states);
    if (next !== null && shelfIds.has(next)) fail(`schema defence: the next action ${next} is a shelf activity`);
  }
  if (nextActivityId(slippedManifest, loopDone) !== null) fail('schema defence: a shelf module without optional supplies the next action');
  if (!pathGuidedComplete(slippedManifest, loopDone)) fail('schema defence: a shelf module without optional gates completion');
  if (pathInventory(slippedManifest).modules !== 1) fail('schema defence: a shelf module without optional counts toward the reward\'s module total');
  const slippedMerged = slippedPath.modules.find((module) => module.id === SHELF)!;
  if (JSON.stringify(moduleRequirements(slippedMerged)) !== '[]') fail('schema defence: a shelf module sends the database completion requirements');

  // B10: published foreign-code fixtures stay complete enough to trace, fit
  // the actual submission cap and remain outside guided completion.
  const fde = LEARNING_PATHS.find(path => path.id === 'fde')!;
  const interview = fde.modules.filter(module => module.shelf === 'interview-prep');
  if (interview.length !== 4) fail('interview shelf: expected four authored practice modules');
  for (const module of interview) {
    if (!module.optional || module.requires.length || module.lessons.length !== 2) fail(`${module.id}: shelf practice needs two readings and no guided requirements`);
    for (const activity of module.activities.filter(one => one.kind === 'code')) {
      const starter = activity.code!.starter.trim();
      const lines = starter.split(/\r?\n/).length;
      if (lines < 300 || lines > 500) fail(`${activity.id}: foreign-code fixture must have 300–500 substantive lines`);
      if (new TextEncoder().encode(starter).length > 20 * 1024) fail(`${activity.id}: foreign-code starter exceeds the code submission limit`);
    }
  }
  const withoutShelf = { ...publicManifest(fde), modules: publicManifest(fde).modules.filter(module => module.shelf !== 'interview-prep') };
  if (JSON.stringify(pathInventory(withoutShelf)) !== JSON.stringify(pathInventory(publicManifest(fde)))) fail('interview shelf: published practice changed guided inventory');

}
