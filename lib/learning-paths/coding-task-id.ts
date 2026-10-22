/** A reused task keeps its identity; authored FDE code keeps its stable
 * path-derived identity. Retired DSA exercises now exist only in Coding. */
import { createHash } from 'node:crypto';
export function canonicalCodingTaskId(pathId: string, activity: { id: string; reuseTaskId?: string }): string {
  return activity.reuseTaskId ?? `path-code-${createHash('sha256').update(`${pathId}:${activity.id}`).digest('hex').slice(0, 32)}`;
}
