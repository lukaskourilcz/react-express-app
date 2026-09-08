/** Authored code-ordering puzzles and the orders their authors accept.
 *
 * Server-only, like the reference solutions: the lines reach the browser
 * shuffled, and the accepted orders never leave this process. Every puzzle
 * declares what arranging it demonstrates, which is narrower than writing the
 * code — see `shared/coding-puzzle.ts` for why that distinction is enforced
 * rather than described.
 *
 * COVERAGE. `puzzleCoverage()` is the manifest. The coding-content test proves
 * every covered id is a real task, that each accepted order is a permutation of
 * that puzzle's own lines, and that no puzzle is small enough to be guessable. */

import type { Localized } from '../../shared/coding-catalog';
import type { PuzzleCompetency, PuzzleLine } from '../../shared/coding-puzzle';

export interface AuthoredPuzzle {
  lines: PuzzleLine[];
  /** Every order the author accepts. More than one is normal: independent
   * lines can swap without changing what the code does. */
  accepted: string[][];
  competencies: PuzzleCompetency[];
  claim: Localized;
}

const ORDERING_CLAIM: Localized = {
  en: 'Arranged correctly. This shows you know the shape of the solution — writing it from nothing is the next step, on a bigger screen.',
  cs: 'Správně seřazeno. Ukazuje to, že znáš tvar řešení — napsat ho od nuly je další krok, na větší obrazovce.',
};

const PUZZLES: Record<string, AuthoredPuzzle> = {
  'js-sum-array': {
    lines: [
      { id: 'a', code: 'function sum(numbers) {' },
      { id: 'b', code: '  let total = 0;' },
      { id: 'c', code: '  for (const number of numbers) {' },
      { id: 'd', code: '    total += number;' },
      { id: 'e', code: '  }' },
      { id: 'f', code: '  return total;' },
      { id: 'g', code: '}' },
    ],
    accepted: [['a', 'b', 'c', 'd', 'e', 'f', 'g']],
    competencies: ['sequence', 'control-flow'],
    claim: ORDERING_CLAIM,
  },
  'js-count-vowels': {
    lines: [
      { id: 'a', code: 'function countVowels(text) {' },
      { id: 'b', code: '  const vowels = "aeiou";' },
      { id: 'c', code: '  let count = 0;' },
      { id: 'd', code: '  for (const letter of text.toLowerCase()) {' },
      { id: 'e', code: '    if (vowels.includes(letter)) count++;' },
      { id: 'f', code: '  }' },
      { id: 'g', code: '  return count;' },
      { id: 'h', code: '}' },
    ],
    // The two declarations are independent, so either order is right and both
    // are accepted. Insisting on one would teach a rule that does not exist.
    accepted: [
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      ['a', 'c', 'b', 'd', 'e', 'f', 'g', 'h'],
    ],
    competencies: ['sequence', 'control-flow', 'api-usage'],
    claim: ORDERING_CLAIM,
  },
  'js-palindrome': {
    lines: [
      { id: 'a', code: 'function isPalindrome(text) {' },
      { id: 'b', code: '  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");' },
      { id: 'c', code: '  let left = 0;' },
      { id: 'd', code: '  let right = clean.length - 1;' },
      { id: 'e', code: '  while (left < right) {' },
      { id: 'f', code: '    if (clean[left] !== clean[right]) return false;' },
      { id: 'g', code: '    left++;' },
      { id: 'h', code: '    right--;' },
      { id: 'i', code: '  }' },
      { id: 'j', code: '  return true;' },
      { id: 'k', code: '}' },
    ],
    accepted: [
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
      ['a', 'b', 'd', 'c', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
      ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'g', 'i', 'j', 'k'],
      ['a', 'b', 'd', 'c', 'e', 'f', 'h', 'g', 'i', 'j', 'k'],
    ],
    competencies: ['sequence', 'control-flow', 'edge-handling'],
    claim: ORDERING_CLAIM,
  },
  'js-word-count': {
    lines: [
      { id: 'a', code: 'function wordCount(text) {' },
      { id: 'b', code: '  const counts = new Map();' },
      { id: 'c', code: '  const words = text.toLowerCase().split(/\\s+/).filter(Boolean);' },
      { id: 'd', code: '  for (const word of words) {' },
      { id: 'e', code: '    counts.set(word, (counts.get(word) ?? 0) + 1);' },
      { id: 'f', code: '  }' },
      { id: 'g', code: '  return counts;' },
      { id: 'h', code: '}' },
    ],
    accepted: [
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      ['a', 'c', 'b', 'd', 'e', 'f', 'g', 'h'],
    ],
    competencies: ['sequence', 'api-usage'],
    claim: ORDERING_CLAIM,
  },
  'js-reverse-string': {
    lines: [
      { id: 'a', code: 'function reverse(text) {' },
      { id: 'b', code: '  const letters = [...text];' },
      { id: 'c', code: '  letters.reverse();' },
      { id: 'd', code: '  return letters.join("");' },
      { id: 'e', code: '}' },
    ],
    accepted: [['a', 'b', 'c', 'd', 'e']],
    competencies: ['sequence', 'api-usage'],
    claim: ORDERING_CLAIM,
  },
  'js-largest-number': {
    lines: [
      { id: 'a', code: 'function largest(numbers) {' },
      { id: 'b', code: '  if (numbers.length === 0) return undefined;' },
      { id: 'c', code: '  let best = numbers[0];' },
      { id: 'd', code: '  for (const number of numbers) {' },
      { id: 'e', code: '    if (number > best) best = number;' },
      { id: 'f', code: '  }' },
      { id: 'g', code: '  return best;' },
      { id: 'h', code: '}' },
    ],
    accepted: [['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']],
    competencies: ['sequence', 'control-flow', 'edge-handling'],
    claim: ORDERING_CLAIM,
  },
};

export const puzzleFor = (taskId: string): AuthoredPuzzle | undefined => PUZZLES[taskId];
export const puzzleCoverage = (): string[] => Object.keys(PUZZLES);
