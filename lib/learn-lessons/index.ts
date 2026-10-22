/** The lessons Learn serves, keyed by lesson id (#492).
 *
 * A Learn level names its lesson in `./levels.ts`; `GET /api/quiz/roadmap?
 * resource=lesson&id=` (`./serve.ts`) answers with the public projection
 * below. The DSA readings under `./dsa` began as the DSA Foundations path's
 * lessons; E5 (#496) retired the path and Learn keeps them under their
 * original `dsa-v1-*` ids. */

import { createHash } from 'node:crypto';
import type { LessonBody } from '../../shared/learning-path-api';
import { DSA_LESSONS } from './dsa';
import { mergeLessonSection, type LessonSource } from './types';

export type { LessonSource } from './types';

const LESSONS: readonly LessonSource[] = DSA_LESSONS;

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
