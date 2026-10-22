// E4: the new topic is a complete, gated Learn curriculum rather than a label
// on otherwise unreachable tasks. Called by test:launch.
import assert from 'node:assert/strict';
import { buildLiveTopic, levelQuestionIds, topicLevels } from '../lib/roadmap';
import { getEffectiveQuestionsById } from '../lib/questions-store';
import { DSA_ADVANCED_TASKS } from '../lib/coding/tasks/dsa-advanced';
import { codingTaskById, levelCodingTasks, tasksForLevel } from '../lib/coding/active';
import { publicLesson } from '../lib/learn-lessons';
import { LEARN_SECTIONS, sectionsForTopic } from '../shared/learn-sections';
import { SUBJECT_SCOPE_CATALOG } from '../shared/subject-catalog';
import { topicPrereqsMet, validateProgressionGraph, type VerifiedProgress } from '../shared/progression';
import { contentTier, isBigOIntroduction } from '../shared/tiers';

export async function dsaAdvancedContracts() {
  assert.deepEqual(validateProgressionGraph(SUBJECT_SCOPE_CATALOG.webdev.topics, LEARN_SECTIONS), []);
  assert.deepEqual(sectionsForTopic('dsa-advanced'), ['software-engineer']);
  const progress = (count: number): VerifiedProgress => ({ dsa: { levels: Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i + 1), { passed: true }])) } });
  assert.equal(topicPrereqsMet(progress(4), 'dsa-advanced'), false, 'four Foundations levels do not meet the existing prerequisite milestone');
  assert.equal(topicPrereqsMet(progress(5), 'dsa-advanced'), true, 'five Foundations levels meet it');
  const index = { levelCounts: { 'dsa-advanced': 15, dsa: 15 }, coding: [], evolving: [] };
  const questions = await getEffectiveQuestionsById();
  const live = buildLiveTopic('dsa-advanced', id => questions.has(id));
  assert.equal(live.levels.length, 15, 'all Advanced levels survive the individual review gate');
  const readings = new Set<string>();
  for (let level = 1; level <= 15; level++) {
    const ids = levelQuestionIds('dsa-advanced', level);
    assert.equal(ids.length, 8);
    for (const id of ids) assert.equal(questions.get(id)?.category, 'dsa-advanced', `${id} is served under its new topic`);
    const lessonId = topicLevels('dsa-advanced')[level - 1].lessonId;
    assert.ok(lessonId && publicLesson(lessonId), `Advanced level ${level} has a public reading`);
    readings.add(lessonId);
    assert.equal(contentTier({ kind: 'learn-level', topic: 'dsa-advanced', level }, index), 'premium');
    assert.equal(isBigOIntroduction('dsa-advanced', level), false, 'the public Big O exception stays Foundations-only');
    const chosen = levelCodingTasks('dsa-advanced', level);
    assert.ok(chosen.length > 0, `Advanced level ${level} seals aligned coding`);
    assert.ok(chosen.every(task => task.topic === 'dsa-advanced' && task.level === level));
  }
  assert.equal(readings.size, 8, 'eight authored readings cover fifteen levels');
  for (let part = 1; part <= 3; part++) assert.equal(contentTier({ kind: 'learn-part-test', topic: 'dsa-advanced', part }, index), 'premium');
  assert.equal(DSA_ADVANCED_TASKS.length, 15);
  for (const source of DSA_ADVANCED_TASKS) {
    const task = codingTaskById(source.id);
    assert.ok(task, `${source.id} is currently issued, not only authored`);
    assert.equal(contentTier({ kind: 'coding-task', taskId: source.id }, index), 'premium');
  }
  for (const [id, level] of [['alg-mh-three-sum', 10], ['alg-mh-meeting-rooms', 9], ['alg-mh-balanced-brackets', 7], ['alg-mh-fewest-coins', 11], ['alg-mh-fastest-route', 4], ['alg-mh-longest-rising', 11], ['alg-mh-smallest-window', 10], ['alg-mh-merge-contacts', 5], ['alg-mh-split-words', 11]] as const) {
    assert.ok(tasksForLevel('dsa-advanced', level).some(task => task.id === id), `${id} retains its identity and participates in its Advanced level`);
  }
}
