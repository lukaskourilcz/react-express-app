/** One reading per Learn level. Paired lessons remain intact and are grouped
 * for levels whose topic covers both; no path answer material is imported. */
import type { LessonSource } from '../types';
import { DSA_D01_LESSONS } from './d01';
import { DSA_D02_LESSONS } from './d02';
import { DSA_D03_LESSONS } from './d03';
import { DSA_D04_LESSONS } from './d04';
import { DSA_D05_LESSONS } from './d05';
import { DSA_D06_LESSONS } from './d06';
import { DSA_D07_LESSONS } from './d07';
import { DSA_D08_LESSONS } from './d08';
import { DSA_D09_LESSONS } from './d09';
import { DSA_COMPLEXITY_PRACTICE, DSA_FOUNDATION_REVIEW } from './review';

function paired(id: string, title: string, lessons: LessonSource[]): LessonSource {
  return {
    id, title, summary: lessons.map(lesson => lesson.summary).join(' '),
    estimatedMinutes: lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0),
    sources: [...new Map(lessons.flatMap(lesson => lesson.sources).map(source => [source.url, source])).values()],
    sections: lessons.flatMap(lesson => [{ kind: 'callout' as const, tone: 'note' as const, body: lesson.title }, ...lesson.sections]),
  };
}

export const DSA_LESSONS: readonly LessonSource[] = [
  ...DSA_D01_LESSONS, ...DSA_D02_LESSONS, ...DSA_D03_LESSONS,
  ...DSA_D04_LESSONS, ...DSA_D05_LESSONS, ...DSA_D06_LESSONS,
  ...DSA_D07_LESSONS, ...DSA_D08_LESSONS, ...DSA_D09_LESSONS,
  paired('dsa-learn-d03', 'Hash maps and sets', DSA_D03_LESSONS),
  paired('dsa-learn-d05', 'Singly linked lists', DSA_D05_LESSONS),
  paired('dsa-learn-d06', 'Recursion foundations', DSA_D06_LESSONS),
  paired('dsa-learn-d07', 'Linear and binary search', DSA_D07_LESSONS),
  paired('dsa-learn-d08', 'Basic sorting', DSA_D08_LESSONS),
  DSA_COMPLEXITY_PRACTICE, DSA_FOUNDATION_REVIEW,
];
