// Helpers only the lazy learning-path screens use: the device copy of an
// unsaved draft and the enrollment-list merge after a change. They live apart
// from lib/learningPaths.ts because that module is in the main chunk (Today,
// Roadmap and the landing page read the catalog), and nothing here needs to
// load before a learner opens a path.

import { readJSON, removeStored, writeJSON } from './storage';
import type { EnrollmentListResponse, PathDraft } from '../../../shared/learning-path-api';

/** The cached enrollment list with the rows a change returned put in place,
 * so a screen shows the new status at once instead of after a refetch. With
 * nothing cached yet it stays empty, and the refetch fills it. */
export function withChangedEnrollments(
  list: EnrollmentListResponse | undefined,
  changed: EnrollmentListResponse,
): EnrollmentListResponse | undefined {
  if (!list) return list;
  const ids = new Set(changed.enrollments.map((one) => one.enrollmentId));
  return { enrollments: [...list.enrollments.filter((one) => !ids.has(one.enrollmentId)), ...changed.enrollments] };
}

/* A copy of an unsaved draft on this device, so a draft the server has not
 * taken yet (offline, or a failed save) survives a reload. It records the
 * server revision it was typed on: once the server has moved past that,
 * another device saved since, and the server's copy wins, as a save would. */

const localDraftKey = (enrollmentId: string, activityId: string) => `devshark:path:draft:${enrollmentId}:${activityId}`;

export function keepDraftLocally(enrollmentId: string, activityId: string, baseRevision: number, content: PathDraft['content']): void {
  writeJSON(localDraftKey(enrollmentId, activityId), { baseRevision, content });
}

export function forgetLocalDraft(enrollmentId: string, activityId: string): void {
  removeStored(localDraftKey(enrollmentId, activityId));
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A stored copy has the shape a save sends: code as text, or artifact fields
 * as text or lists of text. Anything else (an older format, a hand-edited or
 * truncated entry) would only be refused by the server on every keystroke. */
function isDraftContent(value: unknown): value is PathDraft['content'] {
  if (!isPlainObject(value)) return false;
  const { code, artifact } = value;
  if (code === undefined && artifact === undefined) return false;
  if (code !== undefined && typeof code !== 'string') return false;
  if (artifact === undefined) return true;
  return isPlainObject(artifact) && Object.values(artifact).every((field) =>
    typeof field === 'string' || (Array.isArray(field) && field.every((one) => typeof one === 'string')));
}

/** The copy kept on this device when it is newer than the server's draft,
 * shaped as a draft at the server's revision; otherwise null. */
export function localDraftOver(enrollmentId: string, activityId: string, server: PathDraft | null): PathDraft | null {
  const kept = readJSON<{ baseRevision?: unknown; content?: unknown } | null>(localDraftKey(enrollmentId, activityId), null);
  if (!kept) return null;
  if (!isDraftContent(kept.content)) {
    forgetLocalDraft(enrollmentId, activityId);
    return null;
  }
  const revision = server?.revision ?? 0;
  if (kept.baseRevision !== revision || JSON.stringify(kept.content) === JSON.stringify(server?.content ?? null)) {
    forgetLocalDraft(enrollmentId, activityId);
    return null;
  }
  return {
    activityId,
    revision,
    content: kept.content,
    updatedAt: server?.updatedAt ?? new Date().toISOString(),
  };
}
