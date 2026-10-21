import { randomInt } from 'node:crypto';
import type { CategoryType } from './quiz-data';

export type { CategoryType, DifficultyMode, Question } from './quiz-data';

export const PRIVATE_CATEGORIES: CategoryType[] = [];

export function secureShuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = randomInt(0, index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function weightedSample<T>(items: T[], count: number, weight: (item: T) => number): T[] {
  if (count >= items.length) return secureShuffle(items);
  const resolution = 1 << 30;
  const keyed = items.map((item) => {
    const resolvedWeight = Math.max(0.0001, weight(item));
    const random = (randomInt(1, resolution) + 1) / (resolution + 2);
    return { item, key: Math.log(random) / resolvedWeight };
  });
  keyed.sort((a, b) => b.key - a.key);
  return secureShuffle(keyed.slice(0, count).map(({ item }) => item));
}
