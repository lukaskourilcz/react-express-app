/** The `coding-task` answer a brief and a state read make together (#587
 * C23). Its own module so the browser's task read takes it without the rest
 * of `shared/coding-api.ts`; the server's contracts join with the same code. */
import type { CodingBriefResponse, CodingTaskResponse, CodingTaskStateResponse } from './coding-api';

export function joinCodingTaskRead(brief: CodingBriefResponse, state: CodingTaskStateResponse): CodingTaskResponse {
  const { dealt, session, locked, progress, draft, draftUpdatedAt, signedIn } = state;
  return { task: { ...brief.task, ...dealt }, session, locked, progress, draft, draftUpdatedAt, signedIn };
}
