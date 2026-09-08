// Server-only reference solutions for the JavaScript repair exercises.
// Never import from client code.

import type { CodingSolution } from '../types';

export const JAVASCRIPT_DEBUG_SOLUTIONS: Record<string, CodingSolution> = {
  "js-fix-average": {
    solution: "const average = numbers => numbers.length === 0 ? 0 : numbers.reduce((total, number) => total + number, 0) / numbers.length;",
    hiddenTests: [
      { call: "average([-2,2])", expected: 0 },
      { call: "average([1.5,2.5])", expected: 2 },
    ],
  },
  "js-fix-last-index": {
    solution: "const lastIndex = (values, target) => { for (let index = values.length - 1; index >= 0; index--) { if (values[index] === target) return index; } return -1; };",
    hiddenTests: [
      { call: "lastIndex([1,1,1], 1)", expected: 2 },
      { call: "lastIndex([\"a\"], \"a\")", expected: 0 },
    ],
  },
  "js-fix-drop-blank": {
    solution: "const dropBlank = values => values.filter(value => value.trim() !== \"\");",
    hiddenTests: [
      { call: "dropBlank([\" a \", \"   \", \"b\"])", expected: [" a ", "b"] },
    ],
  },
  "js-fix-sorted-copy": {
    solution: "const sortedCopy = numbers => [...numbers].sort((a, b) => a - b);",
    hiddenTests: [
      { call: "sortedCopy([-1,-10,5])", expected: [-10, -1, 5] },
      { call: "(() => { const input = [2,1]; sortedCopy(input); return input; })()", expected: [2, 1] },
    ],
  },
};
