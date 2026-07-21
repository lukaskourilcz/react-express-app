import {
  SUBJECT_SCOPE_CATALOG,
  allowedDeploymentCategories,
  allowedDeploymentSubjects,
  subjectForCategory,
  subjectForTopic,
  type ScopeSubjectId,
} from '../shared/subject-catalog';

const deploymentSubjects = allowedDeploymentSubjects(process.env);
const deploymentCategories = allowedDeploymentCategories(process.env);

export function isDeploymentCategory(category: string): boolean {
  return deploymentCategories.has(category);
}

export function isDeploymentTopic(topic: string): boolean {
  const owner = subjectForTopic(topic);
  return !!owner && deploymentSubjects.includes(owner);
}

export function defaultDeploymentCategories(): string[] {
  const subject = deploymentSubjects[0];
  return [...SUBJECT_SCOPE_CATALOG[subject].categories];
}

export function validateCategoryScope(categories: string[]):
  | { ok: true; categories: string[]; subject: ScopeSubjectId }
  | { ok: false; reason: 'outside_deployment' | 'mixed_subjects' | 'empty' } {
  const clean = Array.from(new Set(categories.filter(Boolean)));
  if (clean.length === 0) return { ok: false, reason: 'empty' };
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
