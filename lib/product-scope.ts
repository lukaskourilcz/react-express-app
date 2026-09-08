import {
  SUBJECT_SCOPE_CATALOG,
  allowedDeploymentCategories,
  allowedDeploymentSubjects,
  subjectForCategory,
  subjectForTopic,
  type ScopeSubjectId,
} from '../shared/subject-catalog';
import { isRetiredTopic } from '../shared/retired-content';

const deploymentSubjects = allowedDeploymentSubjects(process.env);
const deploymentCategories = allowedDeploymentCategories(process.env);

export function isDeploymentCategory(category: string): boolean {
  return deploymentCategories.has(category);
}

export function isDeploymentTopic(topic: string): boolean {
  const owner = subjectForTopic(topic);
  return !!owner && deploymentSubjects.includes(owner);
}

/**
 * The categories a quiz may be built from when the request names none.
 *
 * Retired sections are excluded here rather than removed from the catalogue:
 * their questions still resolve to devShark, so history and scope checks keep
 * working, and they simply stop being drawn. That is the difference between
 * retiring a section and deleting one.
 */
export function defaultDeploymentCategories(): string[] {
  const subject = deploymentSubjects[0];
  return SUBJECT_SCOPE_CATALOG[subject].categories.filter((category) => !isRetiredTopic(category));
}

/**
 * Validate a requested category scope.
 *
 * `forDelivery` refuses a retired section outright: an explicit request must
 * not be able to rebuild a pool that discovery no longer offers. Reads over
 * historical data — a leaderboard filtered by a category somebody once played
 * — leave it off, because that history is real and still theirs.
 */
export function validateCategoryScope(categories: string[], opts: { forDelivery?: boolean } = {}):
  | { ok: true; categories: string[]; subject: ScopeSubjectId }
  | { ok: false; reason: 'outside_deployment' | 'mixed_subjects' | 'empty' | 'retired' } {
  const clean = Array.from(new Set(categories.filter(Boolean)));
  if (clean.length === 0) return { ok: false, reason: 'empty' };
  if (opts.forDelivery && clean.some((category) => isRetiredTopic(category))) {
    return { ok: false, reason: 'retired' };
  }
  if (clean.some((category) => !isDeploymentCategory(category))) {
    return { ok: false, reason: 'outside_deployment' };
  }
  const owners = new Set(clean.map(subjectForCategory).filter((value): value is ScopeSubjectId => !!value));
  if (owners.size !== 1) return { ok: false, reason: 'mixed_subjects' };
  return { ok: true, categories: clean, subject: [...owners][0] };
}

export function deploymentSubjectIds(): ScopeSubjectId[] {
  return [...deploymentSubjects];
}

/** AI-backed features (deeper explanations, Sharkira hints) are a StudyShark
 * concern. The devShark product ships none of them: authored coding hints end
 * in documentation links instead. Pure so the contract tests can cover it. */
export function aiFeaturesAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return !allowedDeploymentSubjects(env).includes('webdev');
}
