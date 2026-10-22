import { DELIVERY_PHASES } from '../../shared/learning-path-phases';
/** The learning-path content validator.
 *
 * Publishing authority stays with code review; this is the mechanical half of
 * it. A path with any `error` cannot be published, so a half-authored version
 * can never be advertised as ready. Pure, so `/dev` readiness, the content
 * test and the server capability all reach the same verdict. */

import {
  MODULE_SHELVES,
  activityIdPrefix,
  isOffLoopModule,
  isPathContentId,
  type EvidenceState,
} from '../../shared/learning-paths';
import { isCodingTaskId } from '../../shared/coding-catalog';
import { isRoadmapTopic } from '../roadmap';
import type { MergedActivity, MergedPath } from './types';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  at: string;
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REVIEW_AGE_DAYS = 400;
/** A scenario carries one case across its ordered questions, so it needs
 * enough of them to be worth the preamble. */
const SCENARIO_MIN_QUESTIONS = 3;
/** Scenarios ship in every catalogue response, so a long one costs every
 * learner who opens Today, Career or Profile. */
const SCENARIO_WARN_CHARS = 2_000;

const error = (code: string, at: string, message: string): ValidationIssue => ({ level: 'error', code, at, message });
const warning = (code: string, at: string, message: string): ValidationIssue => ({ level: 'warning', code, at, message });

const hasCopy = (value: string): boolean => typeof value === 'string' && value.trim().length > 0;

/** Every learner-visible string of a path, for the empty-copy check. */
function pathCopyFields(path: MergedPath): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [
    { path: 'title', value: path.title },
    { path: 'summary', value: path.summary },
    { path: 'entryRequirement', value: path.entryRequirement },
    { path: 'completionLabel', value: path.completionLabel },
  ];
  for (const competency of path.competencies) {
    out.push({ path: `competency.${competency.id}.title`, value: competency.title });
    out.push({ path: `competency.${competency.id}.summary`, value: competency.summary });
  }
  for (const dimension of path.rubric.dimensions) {
    out.push({ path: `rubric.${dimension.id}.title`, value: dimension.title });
    for (const level of ['missing', 'partial', 'adequate', 'strong'] as const) {
      out.push({ path: `rubric.${dimension.id}.${level}`, value: dimension.levels[level] });
    }
  }
  for (const bridge of path.bridges) {
    out.push({ path: `bridge.${bridge.id}.title`, value: bridge.title });
    out.push({ path: `bridge.${bridge.id}.summary`, value: bridge.summary });
    bridge.references.forEach((reference, index) =>
      out.push({ path: `bridge.${bridge.id}.reference[${index}]`, value: reference.label }));
  }
  for (const module of path.modules) {
    out.push({ path: `${module.id}.title`, value: module.title });
    for (const lesson of module.lessons) {
      out.push({ path: `${lesson.id}.title`, value: lesson.title });
      out.push({ path: `${lesson.id}.summary`, value: lesson.summary });
      lesson.sections.forEach((section, index) => {
        const at = `${lesson.id}.section[${index}]`;
        if (section.kind === 'prose' || section.kind === 'callout') out.push({ path: at, value: section.body });
        else if (section.kind === 'code') out.push({ path: `${at}.caption`, value: section.caption });
        else if (section.kind === 'example') {
          // The note is what tells the learner a runnable snippet is
          // exploration only, so a blank one must not ship.
          out.push({ path: `${at}.caption`, value: section.caption });
          out.push({ path: `${at}.note`, value: section.note });
        } else if (section.kind === 'table') {
          out.push({ path: `${at}.caption`, value: section.caption });
        } else if (section.kind === 'trace') {
          out.push({ path: `${at}.caption`, value: section.caption });
          section.trace.frames.forEach((frame, frameIndex) =>
            out.push({ path: `${at}.frame[${frameIndex}]`, value: frame.note }));
        }
      });
    }
    for (const activity of module.activities) {
      out.push({ path: `${activity.id}.title`, value: activity.title });
      out.push({ path: `${activity.id}.summary`, value: activity.summary });
      if (activity.scenario !== undefined) out.push({ path: `${activity.id}.scenario`, value: activity.scenario });
      if (activity.fixtureNote !== undefined) out.push({ path: `${activity.id}.fixtureNote`, value: activity.fixtureNote });
      activity.questions?.forEach((question) => {
        out.push({ path: `${question.id}.prompt`, value: question.prompt });
        out.push({ path: `${question.id}.explanation`, value: question.explanation });
        question.options.forEach((option, index) => out.push({ path: `${question.id}.option[${index}]`, value: option }));
      });
      if (activity.code) {
        out.push({ path: `${activity.id}.code.prompt`, value: activity.code.prompt });
        activity.code.criteria.forEach((criterion) =>
          out.push({ path: `${activity.id}.criterion.${criterion.id}`, value: criterion.label }));
        activity.code.tests.forEach((test, index) => {
          if (test.label) out.push({ path: `${activity.id}.test[${index}].label`, value: test.label });
        });
      }
      if (activity.artifact) {
        out.push({ path: `${activity.id}.artifact.brief`, value: activity.artifact.brief });
        activity.artifact.fields.forEach((field) => {
          out.push({ path: `${activity.id}.field.${field.id}.label`, value: field.label });
          out.push({ path: `${activity.id}.field.${field.id}.help`, value: field.help });
        });
      }
    }
  }
  return out;
}

/** Every learner-visible list of a path, for the empty-copy check. */
function pathCopyLists(path: MergedPath): { path: string; value: string[] }[] {
  const out: { path: string; value: string[] }[] = [
    { path: 'outcomes', value: path.outcomes },
    { path: 'nonGoals', value: path.nonGoals },
  ];
  for (const module of path.modules) {
    out.push({ path: `${module.id}.outcomes`, value: module.outcomes });
    for (const activity of module.activities) {
      if (!activity.code) continue;
      out.push({ path: `${activity.id}.hints`, value: activity.code.hints });
      if (activity.code.approach) out.push({ path: `${activity.id}.approach`, value: activity.code.approach });
      if (activity.code.contract) out.push({ path: `${activity.id}.contract`, value: activity.code.contract });
    }
    for (const lesson of module.lessons) {
      lesson.sections.forEach((section, index) => {
        if (section.kind !== 'table') return;
        out.push({ path: `${lesson.id}.section[${index}].headers`, value: section.headers });
        section.rows.forEach((row, rowIndex) =>
          out.push({ path: `${lesson.id}.section[${index}].row[${rowIndex}]`, value: row }));
      });
    }
  }
  return out;
}

/** Depth-first cycle detection over the module dependency graph. */
function findCycle(nodes: { id: string; dependsOn: string[] }[]): string[] | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const state = new Map<string, 'open' | 'closed'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 'closed') return null;
    if (state.get(id) === 'open') return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 'open');
    stack.push(id);
    for (const next of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(next)) continue;
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 'closed');
    return null;
  };
  for (const node of nodes) {
    const cycle = visit(node.id);
    if (cycle) return cycle;
  }
  return null;
}

function validateActivity(
  path: MergedPath,
  moduleId: string,
  activity: MergedActivity,
  seen: Set<string>,
  competencyIds: Set<string>,
  rubricIds: Set<string>,
  lessonIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = `${path.id}/${moduleId}/${activity.id}`;
  const prefix = activityIdPrefix(path.id, path.version);

  if (!isPathContentId(activity.id)) issues.push(error('bad_id', at, 'activity id must be a lowercase dashed slug'));
  if (!activity.id.startsWith(prefix)) {
    issues.push(error('id_prefix', at, `activity id must start with ${prefix} so a stale client cannot submit against another version`));
  }
  if (seen.has(activity.id)) issues.push(error('duplicate_id', at, 'duplicate activity id'));
  seen.add(activity.id);

  for (const competency of activity.competencies) {
    if (!competencyIds.has(competency)) issues.push(error('unknown_competency', at, `unknown competency ${competency}`));
  }
  if (activity.estimatedMinutes <= 0 || activity.estimatedMinutes > 480) {
    issues.push(error('bad_estimate', at, 'estimatedMinutes must be between 1 and 480'));
  }
  // Before the switch: the code case breaks early for a reused task.
  if (activity.scenario !== undefined && activity.kind !== 'check') {
    issues.push(error('misplaced_scenario', at, 'only a check carries a scenario'));
  }
  if (activity.fixtureNote !== undefined && activity.kind !== 'code') {
    issues.push(error('misplaced_fixture_note', at, 'only a code activity carries a fixture note'));
  }

  switch (activity.kind) {
    case 'lesson': {
      if (!activity.lessonId || !lessonIds.has(activity.lessonId)) {
        issues.push(error('unknown_lesson', at, 'a lesson activity must reference a lesson in its module'));
      }
      if (activity.verification !== 'self_reviewed') {
        issues.push(error('lesson_verification', at, 'reading a lesson is self-reviewed, never machine-verified'));
      }
      break;
    }
    case 'check': {
      const questions = activity.questions ?? [];
      if (questions.length === 0) issues.push(error('empty_check', at, 'a check needs at least one question'));
      if (activity.scenario !== undefined && questions.length < SCENARIO_MIN_QUESTIONS) {
        issues.push(error('scenario_too_few_questions', at, 'a scenario check needs at least three questions'));
      }
      if (activity.scenario !== undefined && activity.scenario.length > SCENARIO_WARN_CHARS) {
        issues.push(warning('long_scenario', at,
          `the scenario has ${activity.scenario.length} characters; every catalogue response carries it, so keep it under ${SCENARIO_WARN_CHARS}`));
      }
      if (activity.verification !== 'machine_verified') {
        issues.push(error('check_verification', at, 'objective checks are machine-verified'));
      }
      const threshold = activity.passThreshold;
      // NaN passes both comparisons, and then `score >= NaN` fails every
      // learner on every attempt.
      if (threshold === undefined || !Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
        issues.push(error('bad_threshold', at, 'passThreshold must be between 0 (exclusive) and 1'));
      }
      const questionIds = new Set<string>();
      for (const question of questions) {
        const qAt = `${at}/${question.id}`;
        if (questionIds.has(question.id)) issues.push(error('duplicate_id', qAt, 'duplicate question id'));
        questionIds.add(question.id);
        if (question.options.length < 3) {
          issues.push(error('too_few_options', qAt, 'a question needs at least three options so a guess is not a coin flip'));
        }
        // A fractional index can never equal a chosen option, so the question
        // would be marked wrong for every learner.
        if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
          issues.push(error('bad_answer', qAt, 'correct must index an option'));
        }
        const texts = question.options.map((option) => option.trim().toLowerCase());
        if (new Set(texts).size !== texts.length) issues.push(error('duplicate_option', qAt, 'options must be distinct'));
        for (const competency of question.competencies) {
          if (!competencyIds.has(competency)) issues.push(error('unknown_competency', qAt, `unknown competency ${competency}`));
        }
        if (activity.domains && (!question.domain || !activity.domains.includes(question.domain))) {
          issues.push(error('unknown_domain', qAt, 'every question of a domain-gated check must name one of its domains'));
        }
      }
      if (activity.domains) {
        for (const domain of activity.domains) {
          if (!questions.some((question) => question.domain === domain)) {
            issues.push(error('empty_domain', at, `domain ${domain} has no questions, so its gate can never be met`));
          }
        }
      }
      break;
    }
    case 'code': {
      if (activity.verification !== 'machine_verified') {
        issues.push(error('code_verification', at, 'code activities are machine-verified'));
      }
      if (activity.reuseTaskId) {
        if (!isCodingTaskId(activity.reuseTaskId)) {
          issues.push(error('bad_reuse', at, 'reuseTaskId must be a coding task id'));
        }
        if (activity.code) issues.push(error('reuse_and_body', at, 'a reused task must not also carry its own body'));
        break;
      }
      const code = activity.code;
      if (!code) {
        issues.push(error('missing_code', at, 'a code activity needs a body or a reuseTaskId'));
        break;
      }
      if (code.starter.trim().length === 0) issues.push(error('missing_starter', at, 'a code activity needs a starter'));
      if (code.hints.length === 0) issues.push(error('missing_hints', at, 'a code activity needs at least one hint'));
      if (code.language === 'react') {
        if (!code.suite) issues.push(error('missing_suite', at, 'a React activity needs a Testing Library suite'));
      } else if (code.tests.length === 0) {
        issues.push(error('missing_tests', at, 'a code activity needs visible assertions'));
      }
      const criterionIds = new Set(code.criteria.map((criterion) => criterion.id));
      if (criterionIds.size !== code.criteria.length) issues.push(error('duplicate_criterion', at, 'criterion ids must be unique'));
      if (!code.criteria.some((criterion) => criterion.critical)) {
        issues.push(error('no_critical_criterion', at, 'at least one criterion must be critical, or a pass could be averaged out'));
      }
      for (const criterion of code.criteria) {
        // NaN or Infinity passes a `<= 0` test and then poisons the weighted
        // score and the pass share for every submission.
        if (!Number.isFinite(criterion.weight) || criterion.weight <= 0) {
          issues.push(error('bad_weight', `${at}/${criterion.id}`, 'criterion weight must be a positive finite number'));
        }
      }
      for (const test of code.tests) {
        if (!criterionIds.has(test.criterion)) {
          issues.push(error('unknown_criterion', at, `visible assertion references unknown criterion ${test.criterion}`));
        }
      }
      if (code.harness && !code.contract) {
        issues.push(warning('harness_without_contract', at, 'a probe-graded task should state its allowed operations to the learner'));
      }
      break;
    }
    case 'artifact': {
      if (activity.verification !== 'self_reviewed') {
        issues.push(error('artifact_verification', at, 'written artifacts are recorded as self-reviewed, never machine-verified'));
      }
      const artifact = activity.artifact;
      if (!artifact) {
        issues.push(error('missing_artifact', at, 'an artifact activity needs a brief and fields'));
        break;
      }
      if (artifact.fields.length === 0) issues.push(error('empty_artifact', at, 'an artifact needs at least one field'));
      const fieldIds = new Set<string>();
      for (const field of artifact.fields) {
        if (fieldIds.has(field.id)) issues.push(error('duplicate_id', `${at}/${field.id}`, 'duplicate field id'));
        fieldIds.add(field.id);
        // A NaN or fractional cap passes the range test; NaN then makes every
        // value "over the limit", so the artifact could never be submitted.
        if (!Number.isInteger(field.maxLength) || field.maxLength <= 0 || field.maxLength > 8_000) {
          issues.push(error('bad_max_length', `${at}/${field.id}`, 'field maxLength must be between 1 and 8000'));
        }
      }
      for (const dimension of artifact.rubricDimensions) {
        if (!rubricIds.has(dimension)) issues.push(error('unknown_rubric', at, `unknown rubric dimension ${dimension}`));
      }
      break;
    }
  }
  return issues;
}

export function validatePath(path: MergedPath): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = path.id;

  if (path.version < 1) issues.push(error('bad_version', at, 'curriculum version starts at 1'));
  if (!ISO_DATE.test(path.reviewedOn)) issues.push(error('bad_review_date', at, 'reviewedOn must be an ISO date'));
  if (path.modules.length === 0) issues.push(error('empty_path', at, 'a path needs at least one module'));
  if (path.outcomes.length === 0) issues.push(error('no_outcomes', at, 'a path must state what the learner can do afterwards'));
  if (path.nonGoals.length === 0) {
    issues.push(error('no_non_goals', at, 'a path must state what it deliberately excludes'));
  }
  if (path.kind === 'role_specialization' && path.id !== 'fde') {
    issues.push(error('unexpected_role', at, 'FDE is the only role specialization'));
  }
  if (path.kind !== 'role_specialization') {
    issues.push(error('wrong_kind', at, 'FDE is a role specialization'));
  }
  if (path.estimatedHours.min <= 0 || path.estimatedHours.min > path.estimatedHours.max) {
    issues.push(error('bad_hours', at, 'estimatedHours must be a positive ascending range'));
  }

  const competencyIds = new Set(path.competencies.map((competency) => competency.id));
  if (competencyIds.size !== path.competencies.length) issues.push(error('duplicate_id', at, 'competency ids must be unique'));
  const rubricIds = new Set(path.rubric.dimensions.map((dimension) => dimension.id));
  if (rubricIds.size !== path.rubric.dimensions.length) issues.push(error('duplicate_id', at, 'rubric dimension ids must be unique'));

  const seenActivities = new Set<string>();
  const seenLessons = new Set<string>();
  const moduleIds = new Set<string>();
  const allActivities = new Map<string, MergedActivity>();

  for (const module of path.modules) {
    const mAt = `${path.id}/${module.id}`;
    if (moduleIds.has(module.id)) issues.push(error('duplicate_id', mAt, 'duplicate module id'));
    moduleIds.add(module.id);
    if (!isPathContentId(module.id)) issues.push(error('bad_id', mAt, 'module id must be a lowercase dashed slug'));
    if (module.outcomes.length === 0) issues.push(error('no_outcomes', mAt, 'a module must state its outcomes'));

    const lessonIds = new Set<string>();
    for (const lesson of module.lessons) {
      const lAt = `${mAt}/${lesson.id}`;
      if (seenLessons.has(lesson.id)) issues.push(error('duplicate_id', lAt, 'duplicate lesson id'));
      seenLessons.add(lesson.id);
      lessonIds.add(lesson.id);
      if (lesson.sections.length === 0) issues.push(error('empty_lesson', lAt, 'a lesson needs a body'));
      lesson.sections.forEach((section, index) => {
        if (section.kind === 'trace' && section.trace.frames.length === 0) {
          issues.push(error('empty_trace', `${lAt}/section[${index}]`, 'a trace needs at least one frame to step through'));
        }
      });
      if (lesson.sources.length === 0) {
        issues.push(error('no_sources', lAt, 'a lesson must cite at least one source the author checked'));
      }
      for (const source of lesson.sources) {
        if (!ISO_DATE.test(source.reviewedOn)) {
          issues.push(error('bad_review_date', lAt, `source ${source.url} needs an ISO reviewedOn date`));
        }
        if (!/^https:\/\//.test(source.url)) {
          issues.push(error('bad_source_url', lAt, `source ${source.url} must be an https URL`));
        }
      }
    }

    for (const activity of module.activities) {
      allActivities.set(activity.id, activity);
      issues.push(...validateActivity(path, module.id, activity, seenActivities, competencyIds, rubricIds, lessonIds));
    }

    if (module.deliveryPhase !== undefined && !(DELIVERY_PHASES as readonly string[]).includes(module.deliveryPhase)) {
      issues.push(error('unknown_delivery_phase', mAt, `unknown delivery phase ${module.deliveryPhase}`));
    }
    if (path.id === 'fde' && !isOffLoopModule(module) && module.id !== 'fde-v1-c01' && module.deliveryPhase === undefined) {
      issues.push(error('missing_delivery_phase', mAt, 'an FDE loop module needs its delivery phase'));
    }
    if (module.shelf !== undefined && !(MODULE_SHELVES as readonly string[]).includes(module.shelf)) {
      issues.push(error('unknown_shelf', mAt, `unknown shelf ${module.shelf}`));
    }
    if (module.shelf !== undefined && !module.optional) {
      issues.push(error('shelf_not_optional', mAt,
        'a shelf module sits outside the loop, so it must be optional and can never gate completion'));
    }
    const quota = module.requiresAtLeast;
    if (module.requires.length === 0 && !quota && !isOffLoopModule(module)) {
      issues.push(error('no_requirements', mAt, 'a module needs at least one completion requirement'));
    }
    if (isOffLoopModule(module) && (module.requires.length > 0 || quota)) {
      issues.push(error('optional_requirements', mAt, 'an optional or shelf module is skippable, so it cannot carry requirements'));
    }
    const ownIds = new Set(module.activities.map((activity) => activity.id));
    if (quota) {
      const qAt = `${mAt}/requiresAtLeast`;
      if (new Set(quota.of).size !== quota.of.length) issues.push(error('duplicate_id', qAt, 'a quota lists each activity once'));
      if (!Number.isInteger(quota.count) || quota.count < 1 || quota.count > quota.of.length) {
        issues.push(error('bad_quota', qAt, 'a quota count must be a whole number from 1 to the number of activities it lists'));
      }
      if ((['needs_revision', 'not_started'] as EvidenceState[]).includes(quota.state)) {
        issues.push(error('impossible_requirement', qAt, `requiring ${quota.state} cannot describe completion`));
      }
      for (const activityId of quota.of) {
        const activity = module.activities.find((one) => one.id === activityId);
        if (!activity) {
          issues.push(error('unknown_requirement', qAt, `quota activity ${activityId} is not an activity of this module`));
        } else if (quota.state === 'verified_pass' && activity.verification !== 'machine_verified') {
          issues.push(error('unverifiable_requirement', `${qAt}/${activityId}`,
            'a self-reviewed activity can never reach verified_pass, so counting it toward the quota would mislead'));
        }
        if (module.requires.some((requirement) => requirement.activityId === activityId)) {
          issues.push(error('quota_overlap', `${qAt}/${activityId}`, 'an activity is either required or counted toward the quota, not both'));
        }
      }
    }
    for (const requirement of module.requires) {
      if (!ownIds.has(requirement.activityId)) {
        issues.push(error('unknown_requirement', mAt, `requirement ${requirement.activityId} is not an activity of this module`));
        continue;
      }
      const activity = module.activities.find((one) => one.id === requirement.activityId)!;
      if (requirement.state === 'verified_pass' && activity.verification !== 'machine_verified') {
        issues.push(error('unverifiable_requirement', `${mAt}/${activity.id}`,
          'a self-reviewed activity can never reach verified_pass, so requiring it would make the module impossible'));
      }
      const impossible: EvidenceState[] = ['needs_revision', 'not_started'];
      if (impossible.includes(requirement.state)) {
        issues.push(error('impossible_requirement', `${mAt}/${activity.id}`, `requiring ${requirement.state} cannot describe completion`));
      }
    }
  }

  for (const module of path.modules) {
    for (const dependency of module.dependsOn) {
      if (!moduleIds.has(dependency)) {
        issues.push(error('unknown_dependency', `${path.id}/${module.id}`, `unknown module ${dependency}`));
      }
    }
  }
  // The loop must stand on its own: a learner who never opens a shelf can
  // still finish the path, and the first loop module is the taster's first
  // module, so a shelf listed ahead of the loop reads as the start.
  const shelfIds = new Set(path.modules.filter((module) => module.shelf !== undefined).map((module) => module.id));
  const lastLoopIndex = path.modules.reduce((last, module, index) => (isOffLoopModule(module) ? last : index), -1);
  path.modules.forEach((module, index) => {
    const mAt = `${path.id}/${module.id}`;
    if (!isOffLoopModule(module)) {
      for (const dependency of module.dependsOn) {
        if (shelfIds.has(dependency)) {
          issues.push(error('loop_depends_on_shelf', mAt, `a loop module cannot depend on the shelf module ${dependency}`));
        }
      }
    } else if (module.shelf !== undefined && index < lastLoopIndex) {
      issues.push(warning('shelf_before_loop', mAt, 'a shelf module should come after every loop module in manifest order'));
    }
  });
  const cycle = findCycle(path.modules.map((module) => ({ id: module.id, dependsOn: module.dependsOn })));
  if (cycle) issues.push(error('dependency_cycle', path.id, `module dependency cycle: ${cycle.join(' → ')}`));

  if (path.diagnosticActivityId) {
    const diagnostic = allActivities.get(path.diagnosticActivityId);
    if (!diagnostic) {
      issues.push(error('unknown_diagnostic', at, 'diagnosticActivityId does not name an activity'));
    } else if (diagnostic.purpose !== 'diagnostic') {
      issues.push(error('wrong_purpose', at, 'the diagnostic activity must carry purpose diagnostic'));
    }
    // The competency report is built from the diagnostic's questions; any
    // other kind would report every competency as not assessed forever.
    if (diagnostic && diagnostic.kind !== 'check') {
      issues.push(error('diagnostic_not_check', at, 'the diagnostic activity must be an objective check'));
    }
  }
  for (const [id, activity] of allActivities) {
    if (activity.purpose !== 'diagnostic') continue;
    const requiredBy = path.modules.filter((module) =>
      module.requires.some((one) => one.activityId === id) || module.requiresAtLeast?.of.includes(id));
    if (requiredBy.length > 0) {
      issues.push(error('diagnostic_required', `${at}/${id}`,
        'a diagnostic is always skippable, so it can never gate module completion'));
    }
  }

  for (const bridge of path.bridges) {
    const bAt = `${at}/${bridge.id}`;
    for (const competency of bridge.competencies) {
      if (!competencyIds.has(competency)) issues.push(error('unknown_competency', bAt, `unknown competency ${competency}`));
    }
    for (const reference of bridge.references) {
      if (reference.kind === 'roadmap-topic' && !isRoadmapTopic(reference.ref)) {
        issues.push(error('unknown_topic', bAt, `unknown roadmap topic ${reference.ref}`));
      }
      if (reference.kind === 'coding-task' && !isCodingTaskId(reference.ref)) {
        issues.push(error('bad_reference', bAt, `${reference.ref} is not a coding task id`));
      }
      if (reference.kind === 'path-activity' && !allActivities.has(reference.ref)) {
        issues.push(error('unknown_activity', bAt, `unknown activity ${reference.ref}`));
      }
      if (reference.kind === 'doc' && !/^https:\/\//.test(reference.ref)) {
        issues.push(error('bad_source_url', bAt, 'a documentation reference must be an https URL'));
      }
    }
  }

  // Every competency the path names should be reachable, or the diagnostic can
  // report a gap the curriculum never closes.
  for (const competency of competencyIds) {
    const covered = [...allActivities.values()].some((activity) => activity.competencies.includes(competency));
    if (!covered) issues.push(warning('uncovered_competency', at, `no activity teaches ${competency}`));
  }

  // At least one route to completion must exist: every module's requirements
  // must be satisfiable by activities that can actually reach the state.
  const canReach = (activityId: string, state: EvidenceState): boolean => {
    const activity = allActivities.get(activityId);
    if (!activity) return false;
    if (state === 'verified_pass') return activity.verification === 'machine_verified';
    return true;
  };
  const reachable = path.modules.every((module) =>
    module.requires.every((requirement) => canReach(requirement.activityId, requirement.state))
    && (!module.requiresAtLeast
      || module.requiresAtLeast.of.filter((id) => canReach(id, module.requiresAtLeast!.state)).length >= module.requiresAtLeast.count));
  if (!reachable) issues.push(error('unreachable_completion', at, 'the path has no valid route to completion'));

  for (const field of pathCopyFields(path)) {
    if (!hasCopy(field.value)) issues.push(error('missing_copy', `${at}/${field.path}`, 'learner-visible copy must not be empty'));
  }
  for (const list of pathCopyLists(path)) {
    if (!list.value.every(hasCopy)) issues.push(error('missing_copy', `${at}/${list.path}`, 'every entry of a learner-visible list must have copy'));
  }

  const reviewed = Date.parse(`${path.reviewedOn}T00:00:00Z`);
  if (Number.isFinite(reviewed)) {
    const ageDays = (Date.now() - reviewed) / 86_400_000;
    if (ageDays > MAX_REVIEW_AGE_DAYS) {
      issues.push(warning('stale_review', at, `content was last reviewed ${Math.round(ageDays)} days ago`));
    }
  }

  return issues;
}
