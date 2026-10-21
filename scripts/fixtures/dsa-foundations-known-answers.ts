// Known answers for the DSA Foundations tasks (#493), graded by
// `npm run test:coding` through scripts/coding-known-answers.ts.
//
// DSA_FOUNDATIONS_WRONG holds the flawed variants each task's checks must
// fail: the mistakes the DSA path's criteria name, the shortcuts its hidden
// assertions were written for, and the attacks scripts/test-path-authority.ts
// proves against the path harness (a replaced Proxy, a replaced RegExp test,
// a shadow counter, repeated property definitions). `criterion` names the
// critical criterion of the source path activity the variant breaks, so the
// content contract can prove that every critical criterion has a wrong
// answer it rejects, and that the answer fails a check tagged with that
// criterion (`criterion` on the checks of lib/coding/tasks and
// lib/coding/solutions; an untagged check holds `core`).
// DSA_FOUNDATIONS_RIGHT holds correct answers written another way, which
// must keep passing.
//
// The issue placed flawed variants under lib/coding/solutions/; they live
// here instead, beside the established KNOWN_WRONG_CODE list, so no wrong
// answer ships in the server bundle.

import type { KnownAnswer } from '../coding-known-answers';

export type DsaKnownAnswer = KnownAnswer & { criterion?: string };

/** The DSA path activity each task was converted from. */
export const DSA_SOURCE_ACTIVITY: Readonly<Record<string, string>> = {
  'alg-dsa-sum-of-evens': 'dsa-v1-d01-linear-accumulator',
  'alg-dsa-halving-steps': 'dsa-v1-d01-halving-counter',
  'alg-dsa-max-gap': 'dsa-v1-d01-pair-versus-pass',
  'alg-dsa-reverse-in-place': 'dsa-v1-d02-reverse-in-place',
  'alg-dsa-dedupe-sorted': 'dsa-v1-d02-dedupe-sorted',
  'alg-dsa-palindrome': 'dsa-v1-d02-palindrome-two-pointer',
  'alg-dsa-frequency-map': 'dsa-v1-d03-frequency-map',
  'alg-dsa-first-unique': 'dsa-v1-d03-first-unique',
  'alg-dsa-set-intersection': 'dsa-v1-d03-set-intersection',
  'alg-dsa-stack': 'dsa-v1-d04-stack-api',
  'alg-dsa-balanced-brackets': 'dsa-v1-d04-balanced-brackets',
  'alg-dsa-queue': 'dsa-v1-d04-head-index-queue',
  'alg-dsa-prepend-and-find': 'dsa-v1-d05-prepend-and-find',
  'alg-dsa-delete-first-match': 'dsa-v1-d05-delete-first-match',
  'alg-dsa-reverse-list': 'dsa-v1-d05-reverse-list',
  'alg-dsa-recursive-list-sum': 'dsa-v1-d06-recursive-list-sum',
  'alg-dsa-factorial': 'dsa-v1-d06-bounded-factorial',
  'alg-dsa-iterative-countdown': 'dsa-v1-d06-iterative-countdown',
  'alg-dsa-linear-search': 'dsa-v1-d07-linear-search',
  'alg-dsa-first-occurrence': 'dsa-v1-d07-first-occurrence',
  'alg-dsa-selection-sort': 'dsa-v1-d08-selection-sort',
  'alg-dsa-insertion-sort': 'dsa-v1-d08-insertion-sort',
  'alg-dsa-merge-sort': 'dsa-v1-d08-merge-sort',
  'alg-dsa-tree-size-height': 'dsa-v1-d09-height-and-size',
  'alg-dsa-tree-traversals': 'dsa-v1-d09-traversals',
  'alg-dsa-bst-search-insert': 'dsa-v1-d09-bst-search-insert',
  'alg-dsa-record-index': 'dsa-v1-d10-record-index',
  'alg-dsa-repair-level-order': 'dsa-v1-d10-repair-traversal',
  'alg-dsa-frequency-index': 'dsa-v1-d10-frequency-index',
};

const PAIRS_GAP = 'function maxGap(values){let best=0;for(const a of values)for(const b of values)best=Math.max(best,a-b);return best;}';
const SCAN_PAST = 'const linearSearch = (values, target) => { let found = -1; for (let i = 0; i < values.length; i++) if (values[i] === target && found === -1) found = i; return found; };';
const DEFINE = (target: string, index: string) => `${target}(values,${index},{value:copy[${index === 'String(i)' ? 'i' : index}],writable:true,enumerable:true,configurable:true})`;
const INSERTION_ON = (array: string) => `for (let i = 1; i < ${array}.length; i++) { const current = ${array}[i]; let j = i - 1; while (j >= 0 && compare(${array}[j], current) > 0) { ${array}[j + 1] = ${array}[j]; j--; } ${array}[j + 1] = current; }`;
const QUEUE_TAIL = 'dequeue(){return h<a.length?a[h++]:null;},size(){return a.length-h;}};}';

export const DSA_FOUNDATIONS_WRONG: readonly DsaKnownAnswer[] = [
  // d01
  { id: 'alg-dsa-sum-of-evens', criterion: 'single-pass', label: 'reading each even slot twice', code: 'const sumOfEvens = values => { let total = 0; for (let i = 0; i < values.length; i++) { if (values[i] % 2 === 0) total += values[i]; } return total; };' },
  { id: 'alg-dsa-sum-of-evens', criterion: 'core', label: 'testing % 2 !== 1, which admits negative odd numbers', replace: [['if (value % 2 === 0) total += value;', 'if (value % 2 !== 1) total += value;']] },
  { id: 'alg-dsa-sum-of-evens', criterion: 'core', label: "sorting the caller's array first", code: 'const sumOfEvens = values => { values.sort((a, b) => a - b); let total = 0; for (const value of values) if (value % 2 === 0) total += value; return total; };' },
  { id: 'alg-dsa-halving-steps', label: 'halving with Math.ceil', replace: [['value = Math.floor(value / 2);', 'value = Math.ceil(value / 2);']] },
  { id: 'alg-dsa-halving-steps', label: 'a counter that starts at 1', replace: [['let steps = 0;', 'let steps = 1;']] },
  { id: 'alg-dsa-max-gap', criterion: 'linear-budget', label: 'comparing every pair', code: PAIRS_GAP },
  { id: 'alg-dsa-max-gap', criterion: 'core', label: 'seeding the smallest and largest with 0', replace: [['let smallest = values[0];\n  let largest = values[0];', 'let smallest = 0;\n  let largest = 0;']] },
  { id: 'alg-dsa-max-gap', criterion: 'core', label: "sorting the caller's array", code: 'const maxGap = values => { if (values.length < 2) return 0; values.sort((a, b) => a - b); return values[values.length - 1] - values[0]; };' },
  { id: 'alg-dsa-max-gap', criterion: 'linear-budget', label: 'every pair behind a declared Proxy that hands the array back', code: `var Proxy = function (values) { return values; };\n${PAIRS_GAP}` },
  { id: 'alg-dsa-max-gap', criterion: 'linear-budget', label: 'every pair behind a replaced global Proxy', code: `globalThis.Proxy = function (values) { return values; };\n${PAIRS_GAP}` },
  { id: 'alg-dsa-max-gap', criterion: 'linear-budget', label: 'every pair behind a replaced RegExp test', code: `RegExp.prototype.test = () => false;\n${PAIRS_GAP}` },
  // d02
  { id: 'alg-dsa-reverse-in-place', criterion: 'in-place', label: 'returning a reversed copy only', code: 'const reverseInPlace = values => [...values].reverse();' },
  { id: 'alg-dsa-reverse-in-place', criterion: 'core', label: 'returning the array unchanged', code: 'const reverseInPlace = values => values;' },
  { id: 'alg-dsa-reverse-in-place', criterion: 'in-place', label: 'deleting each index before writing it', code: 'function reverseInPlace(values){const copy=values.slice().reverse();for(let i=0;i<copy.length;i++){delete values[i];values[i]=copy[i];}return values;}' },
  { id: 'alg-dsa-reverse-in-place', criterion: 'in-place', label: 'defining every index three times', code: `function reverseInPlace(values){const copy=values.slice().reverse();for(let round=0;round<3;round++)for(let i=0;i<copy.length;i++)${DEFINE('Object.defineProperty', 'String(i)')};return values;}` },
  { id: 'alg-dsa-reverse-in-place', criterion: 'in-place', label: 'defining every index three times through Reflect', code: `function reverseInPlace(values){const copy=values.slice().reverse();for(let round=0;round<3;round++)for(let i=0;i<copy.length;i++)${DEFINE('Reflect.defineProperty', 'String(i)')};return values;}` },
  { id: 'alg-dsa-dedupe-sorted', criterion: 'in-place', label: 'counting the distinct values without writing them', code: 'const removeDuplicatesSorted = sorted => { let count = 0; for (let i = 0; i < sorted.length; i++) if (i === 0 || sorted[i] !== sorted[i - 1]) count++; return count; };' },
  { id: 'alg-dsa-dedupe-sorted', criterion: 'core', label: 'returning the length', code: 'const removeDuplicatesSorted = sorted => sorted.length;' },
  { id: 'alg-dsa-dedupe-sorted', criterion: 'in-place', label: 'writing the distinct values in reverse', code: 'const removeDuplicatesSorted = sorted => { const kept = []; for (const value of sorted) if (kept.length === 0 || kept[kept.length - 1] !== value) kept.push(value); for (let i = 0; i < kept.length; i++) sorted[i] = kept[kept.length - 1 - i]; return kept.length; };' },
  { id: 'alg-dsa-palindrome', label: 'calling the empty string not a palindrome', code: 'const isPalindrome = text => { if (text.length === 0) return false; for (let i = 0, j = text.length - 1; i < j; i++, j--) if (text[i] !== text[j]) return false; return true; };' },
  { id: 'alg-dsa-palindrome', label: 'folding case', code: 'const isPalindrome = text => { const lower = text.toLowerCase(); for (let i = 0, j = lower.length - 1; i < j; i++, j--) if (lower[i] !== lower[j]) return false; return true; };' },
  { id: 'alg-dsa-palindrome', label: 'comparing the outer pair only', code: 'const isPalindrome = text => text.length < 2 || text[0] === text[text.length - 1];' },
  // d03
  { id: 'alg-dsa-frequency-map', criterion: 'core', label: 'counting every value once', code: 'const countFrequencies = values => { const counts = new Map(); for (const value of values) counts.set(value, 1); return counts; };' },
  { id: 'alg-dsa-frequency-map', criterion: 'first-appearance-order', label: 'counting into a plain object, which merges 1 and "1" and sorts integer keys', code: 'const countFrequencies = values => { const counts = {}; for (const value of values) counts[value] = (counts[value] || 0) + 1; return new Map(Object.entries(counts)); };' },
  { id: 'alg-dsa-frequency-map', criterion: 'core', label: "emptying the caller's array with shift", code: 'const countFrequencies = values => { const counts = new Map(); while (values.length) { const value = values.shift(); counts.set(value, (counts.get(value) || 0) + 1); } return counts; };' },
  { id: 'alg-dsa-first-unique', label: 'returning the first value', code: 'const firstUnique = values => (values.length ? values[0] : null);' },
  { id: 'alg-dsa-first-unique', label: 'comparing indexOf with lastIndexOf, which never finds NaN', code: 'const firstUnique = values => { for (const value of values) if (values.indexOf(value) === values.lastIndexOf(value)) return value; return null; };' },
  { id: 'alg-dsa-first-unique', label: "draining the caller's array with shift", code: 'const firstUnique = values => { const counts = new Map(); for (const value of values) counts.set(value, (counts.get(value) || 0) + 1); while (values.length) { const value = values.shift(); if (counts.get(value) === 1) return value; } return null; };' },
  { id: 'alg-dsa-set-intersection', criterion: 'duplicate-free', label: 'keeping the duplicates of left', code: 'const intersection = (left, right) => { const pool = new Set(right); return left.filter(value => pool.has(value)); };' },
  { id: 'alg-dsa-set-intersection', criterion: 'duplicate-free', label: 'following the order of right', code: 'const intersection = (left, right) => { const pool = new Set(left); return [...new Set(right)].filter(value => pool.has(value)); };' },
  { id: 'alg-dsa-set-intersection', criterion: 'core', label: 'testing membership with indexOf, which never finds NaN', code: 'const intersection = (left, right) => { const out = []; for (const value of left) if (right.indexOf(value) !== -1 && out.indexOf(value) === -1) out.push(value); return out; };' },
  { id: 'alg-dsa-set-intersection', criterion: 'core', label: 'handing every empty input the same array', code: 'const EMPTY = []; const intersection = (left, right) => { if (left.length === 0 || right.length === 0) return EMPTY; const pool = new Set(right); return [...new Set(left)].filter(value => pool.has(value)); };' },
  // d04
  { id: 'alg-dsa-stack', criterion: 'underflow', label: 'popping an empty array, which gives undefined', replace: [['return items.length === 0 ? null : items.pop();', 'return items.pop();']] },
  { id: 'alg-dsa-stack', criterion: 'core', label: 'a peek that removes the top', replace: [['return items.length === 0 ? null : items[items.length - 1];', 'return items.length === 0 ? null : items.pop();']] },
  { id: 'alg-dsa-stack', criterion: 'underflow', label: 'a size counter that goes below 0', code: 'const createStack = () => { const items = []; let count = 0; return { push(value) { items.push(value); count++; }, pop() { count--; return items.length === 0 ? null : items.pop(); }, peek() { return items.length === 0 ? null : items[items.length - 1]; }, size() { return count; } }; };' },
  { id: 'alg-dsa-stack', criterion: 'core', label: 'one array shared by every stack', code: 'const items = []; const createStack = () => ({ push(value) { items.push(value); }, pop() { return items.length === 0 ? null : items.pop(); }, peek() { return items.length === 0 ? null : items[items.length - 1]; }, size() { return items.length; } });' },
  { id: 'alg-dsa-balanced-brackets', criterion: 'nesting-order', label: 'counting each kind instead of matching order', code: "const isBalanced = text => { const count = { '(': 0, '[': 0, '{': 0 }; const opener = { ')': '(', ']': '[', '}': '{' }; for (const character of text) { if (character in count) count[character]++; else { if (count[opener[character]] === 0) return false; count[opener[character]]--; } } return count['('] === 0 && count['['] === 0 && count['{'] === 0; };" },
  { id: 'alg-dsa-balanced-brackets', criterion: 'core', label: 'ignoring openers still waiting at the end', replace: [['return open.length === 0;', 'return true;']] },
  { id: 'alg-dsa-balanced-brackets', criterion: 'nesting-order', label: 'accepting a closer of any kind', replace: [['if (open.pop() !== partners[character]) return false;', 'if (open.pop() === undefined) return false;']] },
  { id: 'alg-dsa-queue', criterion: 'constant-dequeue', label: 'dequeuing with shift', code: 'const createQueue = newBuffer => { const items = newBuffer(); return { enqueue(value) { items.push(value); }, dequeue() { return items.length === 0 ? null : items.shift(); }, size() { return items.length; } }; };' },
  { id: 'alg-dsa-queue', criterion: 'constant-dequeue', label: 'sliding the waiting values down on every dequeue', code: 'function createQueue(newBuffer){const items=newBuffer();let length=0;return {enqueue(value){items[length]=value;length++;},dequeue(){if(!length)return null;const value=items[0];for(let i=1;i<length;i++)items[i-1]=items[i];length--;return value;},size(){return length;}};}' },
  { id: 'alg-dsa-queue', criterion: 'constant-dequeue', label: 'ignoring newBuffer and keeping a private array', replace: [['const items = newBuffer();', 'const items = [];']] },
  { id: 'alg-dsa-queue', criterion: 'core', label: 'one buffer shared by every queue', code: 'let shared = null; const createQueue = newBuffer => { if (shared === null) shared = newBuffer(); const items = shared; let head = 0; return { enqueue(value) { items.push(value); }, dequeue() { if (head >= items.length) return null; const value = items[head]; items[head] = null; head += 1; return value; }, size() { return items.length - head; } }; };' },
  { id: 'alg-dsa-queue', criterion: 'core', label: 'undefined instead of null from an empty queue', replace: [['if (head >= items.length) return null;', 'if (head >= items.length) return undefined;']] },
  { id: 'alg-dsa-queue', criterion: 'constant-dequeue', label: 'defining the new slot ten times', code: `function createQueue(newBuffer){const a=newBuffer();let h=0;return {enqueue(value){a.push(value);for(let i=0;i<10;i++)Object.defineProperty(a,String(a.length-1),{value,writable:true,enumerable:true,configurable:true});},${QUEUE_TAIL}` },
  { id: 'alg-dsa-queue', criterion: 'constant-dequeue', label: 'defining the new slot ten times through Reflect', code: `function createQueue(newBuffer){const a=newBuffer();let h=0;return {enqueue(value){a.push(value);for(let i=0;i<10;i++)Reflect.defineProperty(a,String(a.length-1),{value,writable:true,enumerable:true,configurable:true});},${QUEUE_TAIL}` },
  { id: 'alg-dsa-queue', criterion: 'constant-dequeue', label: 'deleting and redefining the new slot ten times', code: `function createQueue(newBuffer){const a=newBuffer();let h=0;return {enqueue(value){a.push(value);const index=String(a.length-1);for(let i=0;i<10;i++){delete a[index];Object.defineProperty(a,index,{value,writable:true,enumerable:true,configurable:true});}},${QUEUE_TAIL}` },
  // d05
  { id: 'alg-dsa-prepend-and-find', label: 'find comparing with ==', replace: [['if (node.value === value) return node;', 'if (node.value == value) return node;']] },
  { id: 'alg-dsa-prepend-and-find', label: 'prepend rewriting the old head in place', replace: [['const prepend = (head, value) => ({ value, next: head });', 'const prepend = (head, value) => { if (head === null) return { value, next: null }; const moved = { value: head.value, next: head.next }; head.value = value; head.next = moved; return head; };']] },
  { id: 'alg-dsa-prepend-and-find', label: 'prepend appending at the tail', replace: [['const prepend = (head, value) => ({ value, next: head });', 'const prepend = (head, value) => { const node = { value, next: null }; if (head === null) return node; let tail = head; while (tail.next !== null) tail = tail.next; tail.next = node; return head; };']] },
  { id: 'alg-dsa-delete-first-match', label: 'deleting every match', code: 'const deleteFirst = (head, value) => { while (head !== null && head.value === value) head = head.next; let previous = head; while (previous !== null && previous.next !== null) { if (previous.next.value === value) previous.next = previous.next.next; else previous = previous.next; } return head; };' },
  { id: 'alg-dsa-delete-first-match', label: 'returning the old head when the head matches', replace: [['if (head.value === value) return head.next;', 'if (head.value === value) return head;']] },
  { id: 'alg-dsa-delete-first-match', label: 'rebuilding the list from its values', code: 'const deleteFirst = (head, value) => { const values = []; let removed = false; for (let node = head; node !== null; node = node.next) { if (!removed && node.value === value) { removed = true; continue; } values.push(node.value); } let out = null; for (let i = values.length - 1; i >= 0; i--) out = { value: values[i], next: out }; return out; };' },
  { id: 'alg-dsa-reverse-list', criterion: 'in-place-links', label: 'building new nodes', code: 'const reverseList = head => { let out = null; for (let node = head; node !== null; node = node.next) out = { value: node.value, next: out }; return out; };' },
  { id: 'alg-dsa-reverse-list', criterion: 'core', label: 'returning the old head', replace: [['  return previous;\n};', '  return head;\n};']] },
  // d06
  { id: 'alg-dsa-recursive-list-sum', criterion: 'core', label: 'zeroing each node as it adds it', code: 'function sumList(head) { if (head === null) return 0; const value = head.value; head.value = 0; return value + sumList(head.next); }' },
  { id: 'alg-dsa-recursive-list-sum', criterion: 'recursive', label: 'a loop', code: 'function sumList(head) { let total = 0; for (let node = head; node !== null; node = node.next) total += node.value; return total; }' },
  { id: 'alg-dsa-recursive-list-sum', criterion: 'recursive', label: 'a second base case at the last node', code: 'function sumList(head) { if (head === null) return 0; if (head.next === null) return head.value; return head.value + sumList(head.next); }' },
  { id: 'alg-dsa-recursive-list-sum', criterion: 'recursive', label: 'a loop that sets the old harness counter', code: 'var __sumCalls=0;\nfunction sumList(head){let total=0,count=0;for(let node=head;node;node=node.next){total+=node.value;count++;}__sumCalls=count+1;return total;}' },
  { id: 'alg-dsa-recursive-list-sum', criterion: 'recursive', label: 'a const binding the counter cannot swap', code: 'const sumList = head => (head === null ? 0 : head.value + sumList(head.next));' },
  { id: 'alg-dsa-factorial', label: 'factorial(0) as 0', code: 'function factorial(n) { if (n === 0) return 0; let product = 1; for (let i = 2; i <= n; i++) product *= i; return product; }' },
  { id: 'alg-dsa-factorial', label: 'a product that stops at n - 1', replace: [['for (let i = 2; i <= n; i += 1) product *= i;', 'for (let i = 2; i < n; i += 1) product *= i;']] },
  { id: 'alg-dsa-iterative-countdown', criterion: 'no-recursion', label: 'recursion through countdownSteps', code: 'function countdownSteps(n) { return n < 0 ? [] : [n, ...countdownSteps(n - 1)]; }' },
  { id: 'alg-dsa-iterative-countdown', criterion: 'core', label: 'stopping before 0', replace: [['while (counter >= 0) {', 'while (counter > 0) {']] },
  { id: 'alg-dsa-iterative-countdown', criterion: 'core', label: 'one array shared by every call', code: 'const out = [];\nfunction countdownSteps(n) { out.length = 0; for (let i = n; i >= 0; i--) out.push(i); return out; }' },
  // d07
  { id: 'alg-dsa-linear-search', criterion: 'one-pass', label: 'scanning past the first match', code: SCAN_PAST },
  { id: 'alg-dsa-linear-search', criterion: 'core', label: 'comparing with ==', replace: [['if (values[index] === target) return index;', 'if (values[index] == target) return index;']] },
  { id: 'alg-dsa-linear-search', criterion: 'one-pass', label: 'scanning past the match behind a declared Proxy', code: `var Proxy = function (values) { return values; };\n${SCAN_PAST}` },
  { id: 'alg-dsa-linear-search', criterion: 'one-pass', label: 'scanning past the match behind a replaced RegExp test', code: `RegExp.prototype.test = () => false;\n${SCAN_PAST}` },
  { id: 'alg-dsa-first-occurrence', criterion: 'logarithmic', label: 'a linear scan', code: 'const firstOccurrence = (sorted, target) => { for (let i = 0; i < sorted.length; i++) if (sorted[i] === target) return i; return -1; };' },
  { id: 'alg-dsa-first-occurrence', criterion: 'logarithmic', label: 'finding any match, then walking left', code: 'const firstOccurrence = (sorted, target) => { let low = 0, high = sorted.length - 1; while (low <= high) { const middle = Math.floor((low + high) / 2); if (sorted[middle] === target) { let i = middle; while (i > 0 && sorted[i - 1] === target) i--; return i; } if (sorted[middle] < target) low = middle + 1; else high = middle - 1; } return -1; };' },
  { id: 'alg-dsa-first-occurrence', criterion: 'core', label: 'returning any match in the run', code: 'const firstOccurrence = (sorted, target) => { let low = 0, high = sorted.length - 1; while (low <= high) { const middle = Math.floor((low + high) / 2); if (sorted[middle] === target) return middle; if (sorted[middle] < target) low = middle + 1; else high = middle - 1; } return -1; };' },
  { id: 'alg-dsa-first-occurrence', criterion: 'core', label: '0 for an empty array', replace: [['return low < sorted.length && sorted[low] === target ? low : -1;', 'return sorted.length === 0 ? 0 : low < sorted.length && sorted[low] === target ? low : -1;']] },
  // d08
  { id: 'alg-dsa-selection-sort', criterion: 'selection-method', label: 'insertion sort', code: `const selectionSort = (values, compare) => { ${INSERTION_ON('values')} return values; };` },
  { id: 'alg-dsa-selection-sort', criterion: 'selection-method', label: 'the built-in sort', code: 'const selectionSort = (values, compare) => values.sort(compare);' },
  { id: 'alg-dsa-selection-sort', criterion: 'core', label: 'sorting a copy and returning it', code: 'const selectionSort = (values, compare) => { const copy = [...values]; for (let start = 0; start < copy.length - 1; start++) { let smallest = start; for (let i = start + 1; i < copy.length; i++) if (compare(copy[i], copy[smallest]) < 0) smallest = i; const held = copy[start]; copy[start] = copy[smallest]; copy[smallest] = held; } return copy; };' },
  { id: 'alg-dsa-insertion-sort', criterion: 'insertion-method', label: 'selection sort', code: 'const insertionSort = (values, compare) => { for (let start = 0; start < values.length - 1; start++) { let smallest = start; for (let i = start + 1; i < values.length; i++) if (compare(values[i], values[smallest]) < 0) smallest = i; const held = values[start]; values[start] = values[smallest]; values[smallest] = held; } return values; };' },
  { id: 'alg-dsa-insertion-sort', criterion: 'core', label: 'walking past equal elements', replace: [['while (j >= 0 && compare(values[j], current) > 0) {', 'while (j >= 0 && compare(values[j], current) >= 0) {']] },
  { id: 'alg-dsa-insertion-sort', criterion: 'insertion-method', label: 'the built-in sort', code: 'const insertionSort = (values, compare) => values.sort(compare);' },
  { id: 'alg-dsa-merge-sort', criterion: 'merge-method', label: 'taking the right element on a tie', replace: [['if (compare(left[i], right[j]) <= 0) {', 'if (compare(left[i], right[j]) < 0) {']] },
  { id: 'alg-dsa-merge-sort', criterion: 'core', label: "sorting the caller's array in place", code: `const mergeSort = (values, compare) => { ${INSERTION_ON('values')} return values; };` },
  { id: 'alg-dsa-merge-sort', criterion: 'merge-method', label: 'insertion sort on a copy', code: `const mergeSort = (values, compare) => { const out = [...values]; ${INSERTION_ON('out')} return out; };` },
  // d09
  { id: 'alg-dsa-tree-size-height', label: 'an empty tree of height 0', replace: [['if (root === null) return -1;', 'if (root === null) return 0;']] },
  { id: 'alg-dsa-tree-size-height', label: 'an empty tree of height null', replace: [['if (root === null) return -1;', 'if (root === null) return null;']] },
  { id: 'alg-dsa-tree-size-height', label: 'a size that follows the left spine only', replace: [['return 1 + treeSize(root.left) + treeSize(root.right);', 'return 1 + treeSize(root.left);']] },
  { id: 'alg-dsa-tree-traversals', label: 'preorder and inorder swapped', replace: [['const inorder = root => walkInorder(root, []);\nconst preorder = root => walkPreorder(root, []);', 'const inorder = root => walkPreorder(root, []);\nconst preorder = root => walkInorder(root, []);']] },
  { id: 'alg-dsa-tree-traversals', label: 'level order taken with pop', replace: [['while (head < queue.length) {\n    const node = queue[head];\n    head += 1;', 'while (queue.length > 0) {\n    const node = queue.pop();']] },
  { id: 'alg-dsa-tree-traversals', label: 'one output array shared by every call', replace: [['const inorder = root => walkInorder(root, []);', 'const SHARED = [];\nconst inorder = root => walkInorder(root, (SHARED.length = 0, SHARED));']] },
  { id: 'alg-dsa-bst-search-insert', criterion: 'follows-bst-path', label: 'searching the whole tree', replace: [['const bstSearch = (root, value) => {\n  let node = root;\n\n  while (node !== null) {\n    if (value === node.value) return node;\n    node = value < node.value ? node.left : node.right;\n  }\n\n  return null;\n};', 'const bstSearch = (root, value) => {\n  if (root === null) return null;\n  if (root.value === value) return root;\n  return bstSearch(root.left, value) || bstSearch(root.right, value);\n};']] },
  { id: 'alg-dsa-bst-search-insert', criterion: 'core', label: 'equal values sent left', replace: [['if (value < node.value) {', 'if (value <= node.value) {']] },
  { id: 'alg-dsa-bst-search-insert', criterion: 'core', label: 'an insert that makes the new value the root', code: 'const bstInsert = (root, value) => (root === null || value < root.value ? { value, left: null, right: root } : { value, left: root, right: null });\nconst bstSearch = (root, value) => { let node = root; while (node !== null) { if (value === node.value) return node; node = value < node.value ? node.left : node.right; } return null; };' },
  // d10
  { id: 'alg-dsa-record-index', criterion: 'logarithmic-lookup', label: 'a linear lookup', code: 'const buildIndex = records => ({ lookup(id) { for (let i = 0; i < records.length; i++) if (records[i].id === id) return records[i]; return null; } });' },
  { id: 'alg-dsa-record-index', criterion: 'logarithmic-lookup', label: 'a Map built from every record up front', code: 'const buildIndex = records => { const byId = new Map(); for (const record of records) byId.set(record.id, record); return { lookup: id => byId.get(id) ?? null }; };' },
  { id: 'alg-dsa-record-index', criterion: 'core', label: 'returning the name instead of the record', replace: [['if (record.id === id) return record;', 'if (record.id === id) return record.name;']] },
  { id: 'alg-dsa-repair-level-order', label: 'the queue and the null guard fixed, the empty tree not', code: 'const levelOrder = root => { const out = []; const queue = [root]; let head = 0; while (head < queue.length) { const node = queue[head]; head += 1; out.push(node.value); if (node.left !== null) queue.push(node.left); if (node.right !== null) queue.push(node.right); } return out; };' },
  { id: 'alg-dsa-repair-level-order', label: 'the queue and the empty tree fixed, null children still pushed', code: 'const levelOrder = root => { if (root === null) return []; const out = []; const queue = [root]; let head = 0; while (head < queue.length) { const node = queue[head]; head += 1; out.push(node.value); queue.push(node.left); queue.push(node.right); } return out; };' },
  { id: 'alg-dsa-repair-level-order', label: 'the null guard and the empty tree fixed, still read with pop', code: 'const levelOrder = root => { if (root === null) return []; const out = []; const pending = [root]; while (pending.length > 0) { const node = pending.pop(); out.push(node.value); if (node.left !== null) pending.push(node.left); if (node.right !== null) pending.push(node.right); } return out; };' },
  { id: 'alg-dsa-frequency-index', criterion: 'preprocessed', label: 'scanning values once per query', code: 'const mostFrequent = (values, queries) => queries.map(query => { let count = 0; for (const value of values) if (value === query) count++; return count; });' },
  { id: 'alg-dsa-frequency-index', criterion: 'core', label: 'counting into a plain object, which merges 1 and "1"', code: 'const mostFrequent = (values, queries) => { const counts = {}; for (const value of values) counts[value] = (counts[value] || 0) + 1; return queries.map(query => counts[query] || 0); };' },
  { id: 'alg-dsa-frequency-index', criterion: 'core', label: 'undefined for a value that never appears', replace: [['return count === undefined ? 0 : count;', 'return count;']] },
];

export const DSA_FOUNDATIONS_RIGHT: readonly DsaKnownAnswer[] = [
  { id: 'alg-dsa-sum-of-evens', label: 'copying the input, then summing the copy', code: 'const sumOfEvens = values => { const copy = [...values]; let total = 0; for (let i = 0; i < copy.length; i++) if (copy[i] % 2 === 0) total += copy[i]; return total; };' },
  { id: 'alg-dsa-halving-steps', label: 'the floor of the base-2 logarithm', code: 'const halvingSteps = n => Math.floor(Math.log2(n));' },
  { id: 'alg-dsa-max-gap', label: 'an independent min and max loop', code: 'function maxGap(values){if(values.length<2)return 0;\nlet low=values[0],high=low;for(let i=1;i<values.length;i++){const v=values[i];low=Math.min(low,v);high=Math.max(high,v);}return high-low;}' },
  { id: 'alg-dsa-reverse-in-place', label: 'one property definition per index', code: `function reverseInPlace(values){const copy=values.slice().reverse();for(let i=0;i<copy.length;i++)${DEFINE('Object.defineProperty', 'String(i)')};return values;}` },
  { id: 'alg-dsa-reverse-in-place', label: 'Reflect definitions after Object.defineProperty was replaced', code: `Object.defineProperty=()=>{throw new Error("replaced");};function reverseInPlace(values){const copy=values.slice().reverse();for(let i=0;i<copy.length;i++)${DEFINE('Reflect.defineProperty', 'String(i)')};return values;}` },
  { id: 'alg-dsa-queue', label: 'appending by defining the next index', code: `function createQueue(newBuffer){const a=newBuffer();let h=0;return {enqueue(value){Object.defineProperty(a,String(a.length),{value,writable:true,enumerable:true,configurable:true});},${QUEUE_TAIL}` },
  { id: 'alg-dsa-queue', label: 'Reflect definitions after Object.defineProperty was replaced', code: `Object.defineProperty=()=>{throw new Error("replaced");};function createQueue(newBuffer){const a=newBuffer();let h=0;return {enqueue(value){Reflect.defineProperty(a,String(a.length),{value,writable:true,enumerable:true,configurable:true});},${QUEUE_TAIL}` },
  { id: 'alg-dsa-recursive-list-sum', label: 'a one-line recursive declaration', code: 'function sumList(head){return head===null?0:head.value+sumList(head.next);}' },
  { id: 'alg-dsa-linear-search', label: 'indexOf', code: 'const linearSearch = (values, target) => values.indexOf(target);' },
];
