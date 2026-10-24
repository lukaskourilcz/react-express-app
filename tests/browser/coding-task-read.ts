// The reads a coding task page makes, answered from the one combined answer a
// spec writes. A free task reads its brief (`coding-brief`) and the caller's
// part (`coding-state`) apart; a Premium task and a Learn link read the
// combined `coding-task` (#587 C23, client/src/coding/api.ts useCodingTask).
// The brief's version follows its content, so a changed brief is a new
// version, as on the server, and the page reads it again.
import { createHash } from 'node:crypto';
import type { Route } from '@playwright/test';
import type { CodingBriefResponse, CodingTaskResponse, CodingTaskStateResponse } from '../../shared/coding-api';

const TASK_READS: ReadonlySet<string> = new Set(['coding-task', 'coding-brief', 'coding-state']);

/** Whether a roadmap request is one of a task page's reads. */
export const isTaskRead = (resource: string | null): boolean => resource !== null && TASK_READS.has(resource);

/** What each of the three reads answers, given the combined answer. */
export function taskReadBody(resource: string | null, body: CodingTaskResponse): CodingTaskResponse | CodingBriefResponse | CodingTaskStateResponse {
  const { puzzle, design, drill, ...task } = body.task;
  const version = createHash('sha256').update(JSON.stringify(task)).digest('hex').slice(0, 12);
  if (resource === 'coding-brief') return { task, version };
  if (resource === 'coding-state') {
    const { session, locked, progress, draft, draftUpdatedAt, signedIn } = body;
    return { session, locked, progress, draft, draftUpdatedAt, signedIn, dealt: { ...(puzzle ? { puzzle } : {}), ...(design ? { design } : {}), ...(drill ? { drill } : {}) }, briefVersion: version };
  }
  return body;
}

/** Answer a task page's read from the combined answer. */
export function fulfilTaskRead(route: Route, body: CodingTaskResponse) {
  const resource = new URL(route.request().url()).searchParams.get('resource');
  return route.fulfill({ json: taskReadBody(resource, body) });
}
