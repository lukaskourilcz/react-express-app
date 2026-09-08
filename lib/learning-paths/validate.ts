/** The learning-path content validator.
 *
 * Publishing authority stays with code review; this is the mechanical half of
 * it. A path with any `error` cannot be published, so a half-authored version
 * can never be advertised as ready. Pure, so `/dev` readiness, the content
 * test and the server capability all reach the same verdict. */

import {
  activityIdPrefix,
  isPathContentId,
  type EvidenceState,
  type Localized,
  type LocalizedList,
} from '../../shared/learning-paths';
import { isCodingTaskId } from '../../shared/coding-catalog';
import { isRoadmapTopic } from '../roadmap';
import { localizedPathFields, localizedPathLists, type MergedActivity, type MergedPath } from './types';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  at: string;
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REVIEW_AGE_DAYS = 400;

const error = (code: string, at: string, message: string): ValidationIssue => ({ level: 'error', code, at, message });
const warning = (code: string, at: string, message: string): ValidationIssue => ({ level: 'warning', code, at, message });

const bothLocales = (value: Localized): boolean =>
  typeof value.en === 'string' && value.en.trim().length > 0 &&
  typeof value.cs === 'string' && value.cs.trim().length > 0;

const listParity = (value: LocalizedList): boolean =>
  value.en.length === value.cs.length &&
  value.en.every((entry) => entry.trim().length > 0) &&
  value.cs.every((entry) => entry.trim().length > 0);

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
      if (activity.verification !== 'machine_verified') {
        issues.push(error('check_verification', at, 'objective checks are machine-verified'));
      }
      const threshold = activity.passThreshold;
      if (threshold === undefined || threshold <= 0 || threshold > 1) {
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
        if (question.correct < 0 || question.correct >= question.options.length) {
          issues.push(error('bad_answer', qAt, 'correct must index an option'));
        }
        const texts = question.options.map((option) => option.en.trim().toLowerCase());
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
      if (code.hints.en.length === 0) issues.push(error('missing_hints', at, 'a code activity needs at least one hint'));
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
        if (criterion.weight <= 0) issues.push(error('bad_weight', `${at}/${criterion.id}`, 'criterion weight must be positive'));
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
        if (field.maxLength <= 0 || field.maxLength > 8_000) {
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
  if (path.outcomes.en.length === 0) issues.push(error('no_outcomes', at, 'a path must state what the learner can do afterwards'));
  if (path.nonGoals.en.length === 0) {
    issues.push(error('no_non_goals', at, 'a path must state what it deliberately excludes'));
  }
  if (path.kind === 'role_specialization' && path.id !== 'fde') {
    issues.push(error('unexpected_role', at, 'FDE is the only role specialization'));
  }
  if (path.id === 'dsa-foundations' && path.kind !== 'skill_path') {
    issues.push(error('wrong_kind', at, 'DSA Foundations is a skill path, not a role'));
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
    if (module.outcomes.en.length === 0) issues.push(error('no_outcomes', mAt, 'a module must state its outcomes'));

    const lessonIds = new Set<string>();
    for (const lesson of module.lessons) {
      const lAt = `${mAt}/${lesson.id}`;
      if (seenLessons.has(lesson.id)) issues.push(error('duplicate_id', lAt, 'duplicate lesson id'));
      seenLessons.add(lesson.id);
      lessonIds.add(lesson.id);
      if (lesson.sections.length === 0) issues.push(error('empty_lesson', lAt, 'a lesson needs a body'));
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

    if (module.requires.length === 0 && !module.optional) {
      issues.push(error('no_requirements', mAt, 'a module needs at least one completion requirement'));
    }
    if (module.optional && module.requires.length > 0) {
      issues.push(error('optional_requirements', mAt, 'an optional module is skippable, so it cannot carry requirements'));
    }
    const ownIds = new Set(module.activities.map((activity) => activity.id));
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
  const cycle = findCycle(path.modules.map((module) => ({ id: module.id, dependsOn: module.dependsOn })));
  if (cycle) issues.push(error('dependency_cycle', path.id, `module dependency cycle: ${cycle.join(' → ')}`));

  if (path.diagnosticActivityId) {
    const diagnostic = allActivities.get(path.diagnosticActivityId);
    if (!diagnostic) {
      issues.push(error('unknown_diagnostic', at, 'diagnosticActivityId does not name an activity'));
    } else if (diagnostic.purpose !== 'diagnostic') {
      issues.push(error('wrong_purpose', at, 'the diagnostic activity must carry purpose diagnostic'));
    }
  }
  for (const [id, activity] of allActivities) {
    if (activity.purpose !== 'diagnostic') continue;
    const requiredBy = path.modules.filter((module) => module.requires.some((one) => one.activityId === id));
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
  const reachable = path.modules.every((module) =>
    module.requires.every((requirement) => {
      const activity = allActivities.get(requirement.activityId);
      if (!activity) return false;
      if (requirement.state === 'verified_pass') return activity.verification === 'machine_verified';
      return true;
    }));
  if (!reachable) issues.push(error('unreachable_completion', at, 'the path has no valid route to completion'));

  for (const field of localizedPathFields(path)) {
    if (!bothLocales(field.value)) {
      issues.push(error('missing_translation', `${at}/${field.path}`, 'both English and Czech copy are required'));
    }
  }
  for (const list of localizedPathLists(path)) {
    if (!listParity(list.value)) {
      issues.push(error('translation_parity', `${at}/${list.path}`, 'English and Czech lists must align entry for entry'));
    }
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
