/** The lessons Learn serves, keyed by lesson id (#492).
 *
 * A Learn level names its lesson in `./levels.ts`; `GET /api/quiz/roadmap?
 * resource=lesson&id=` (`./serve.ts`) answers with the public projection
 * below. The DSA lessons are the path module's own objects, not copies, so
 * the text a learner reads in Learn is the text the path shows. When the
 * DSA Foundations path goes (plan section 12.4), its lesson bodies move here
 * and this registry keeps the same ids. */

import { createHash } from 'node:crypto';
import type { LessonBody } from '../../shared/learning-path-api';
import { DSA_D01 } from '../learning-paths/content/dsa/d01';
import { mergeLessonSection, type LessonSource } from './types';

export type { LessonSource } from './types';

const LESSONS: readonly LessonSource[] = [...DSA_D01.lessons];

export const LEARN_LESSONS: ReadonlyMap<string, LessonSource> = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

/** What a learner may read of one lesson. Lessons carry no answers; the
 * fields are still named one by one, so a field added to the authored shape
 * later stays on the server until someone adds it here. */
export function lessonProjection(lesson: LessonSource): LessonBody {
  return {
    id: lesson.id,
    title: lesson.title,
    sections: lesson.sections.map(mergeLessonSection),
    sources: lesson.sources.map((source) => ({ label: source.label, url: source.url, reviewedOn: source.reviewedOn })),
  };
}

export interface PublicLesson {
  lesson: LessonBody;
  /** sha256 of the projection, hex. Changes only when the lesson's text does. */
  hash: string;
}

const projected = new Map<string, PublicLesson>();

/** The projection and its content hash, computed once per instance. */
export function publicLesson(id: string): PublicLesson | null {
  const cached = projected.get(id);
  if (cached) return cached;
  const lesson = LEARN_LESSONS.get(id);
  if (!lesson) return null;
  const body = lessonProjection(lesson);
  const entry = { lesson: body, hash: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
  projected.set(id, entry);
  return entry;
}
