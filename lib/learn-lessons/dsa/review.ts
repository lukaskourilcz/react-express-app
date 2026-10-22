/** Original synthesis readings for the closing Foundations levels (#494).
 * Examples use explicit operation/storage models, not benchmark guarantees. */
import type { LessonSource } from '../types';

export const DSA_COMPLEXITY_PRACTICE: LessonSource = {
  id: 'dsa-learn-complexity-practice', title: 'Analyse the code you wrote',
  summary: 'State the cost model, keep independent inputs separate and count peak live storage.',
  estimatedMinutes: 15,
  sources: [
    { label: 'Princeton Algorithms: analysis and cost models', url: 'https://algs4.cs.princeton.edu/14analysis/', reviewedOn: '2026-10-22' },
    { label: 'ECMAScript: Map access requirements', url: 'https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects', reviewedOn: '2026-10-22' },
    { label: 'MDN: Array.prototype.sort behavior', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort', reviewedOn: '2026-10-22' },
  ],
  sections: [
    { kind: 'prose', body: 'Name the input sizes and the operations you count before choosing a growth class. A loop over n records followed by one over m notes costs O(n + m) under constant work per item. Nesting those traversals gives O(nm). Calling both lengths n would hide a useful distinction.' },
    { kind: 'code', language: 'javascript', caption: 'A halving loop can still do linear total work when each pass copies its remaining prefix.', code: 'function copiedSlots(values) {\n  let count = 0;\n  for (let remaining = values.length; remaining > 0; remaining = Math.floor(remaining / 2)) {\n    count += values.slice(0, remaining).length;\n  }\n  return count;\n}' },
    { kind: 'prose', body: 'Assume copying k array slots costs O(k). The passes copy n, floor(n/2), floor(n/4) and so on: their sum is below 2n, so total work is O(n). There are O(log n) passes, but a pass is not constant work. With discarded copies eligible for reclamation between passes, the peak live copy has O(n) slots; total allocation and peak live memory are different measures.' },
    { kind: 'prose', body: 'State whether output is included in your space measure. Returning one array entry per input requires O(n) output slots even if only two local variable names appear. Mutating the input does not by itself prove O(1) auxiliary space: JavaScript sort mutates and returns the same array, while its time and space complexity depend on the implementation.' },
    { kind: 'prose', body: 'Separate a model from a language guarantee. Expected O(1) hash lookup assumes a suitable hash-table model and bounded key work; JavaScript Map requires average access sublinear in its size. A benchmark can reveal a regression on measured inputs, but it cannot establish a bound for every size or input arrangement.' },
  ],
};

export const DSA_FOUNDATION_REVIEW: LessonSource = {
  id: 'dsa-learn-foundation-review', title: 'Connect the foundation choices',
  summary: 'Choose a representation, preserve its invariant and test behavior that a value-only example would miss.',
  estimatedMinutes: 15,
  sources: [
    { label: 'Princeton Algorithms: BST order, search and height', url: 'https://algs4.cs.princeton.edu/32bst/', reviewedOn: '2026-10-22' },
    { label: 'Princeton Algorithms: analysis and cost models', url: 'https://algs4.cs.princeton.edu/14analysis/', reviewedOn: '2026-10-22' },
    { label: 'MDN: Array.prototype.sort behavior', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort', reviewedOn: '2026-10-22' },
  ],
  sections: [
    { kind: 'table', caption: 'Start from the required operation', headers: ['Workload', 'Representation and boundary'], rows: [
      ['Indexed sequence, duplicates retained', 'Array; name which edits shift elements.'],
      ['Membership or value by key', 'Set or Map; state the key and cost assumptions.'],
      ['Newest pending operation first', 'Stack; only its top is removed.'],
      ['Oldest pending operation first', 'Queue; account for front-removal or head-index storage.'],
      ['Insert after an already-held node', 'Linked list; finding that node may still require a walk.'],
      ['Ordered search', 'Sorted array with binary search, or BST with a bound in its actual height.'],
    ] },
    { kind: 'prose', body: 'A representation is useful only while its invariant holds. Binary search needs the ordering its comparisons assume and bounds that examine the final candidate. A BST constrains every descendant, not only immediate children. A plain BST can become a chain, so its worst-case search is bounded by height plus one rather than by a guaranteed logarithm of its node count.' },
    { kind: 'prose', body: 'Test the contract as well as returned values. If reversing a linked list must rewire existing nodes, compare the returned node identities and links; a fresh cloned list can have the right values and still violate the contract. Include an empty list, one node and repeated values. If a sort must leave the input unchanged, check aliasing: the built-in sort returns the input array itself.' },
    { kind: 'callout', tone: 'note', body: 'The closing questions combine the taught structures and cost models. The part test checks these foundations. Heaps, graphs and later algorithm patterns are outside this Foundations review. Passing it makes no claim about those topics.' },
  ],
};
