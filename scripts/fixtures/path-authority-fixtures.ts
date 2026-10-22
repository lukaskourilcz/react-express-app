/** Private grading-authority fixtures (#496).
 *
 * Five code activities copied verbatim (code, reference and hidden assertions)
 * from the retired DSA Foundations learning path at main d3dc3a33, when E5
 * removed that path. No path registers them and nothing serves them: they
 * exist so scripts/test-path-authority.ts and scripts/test-learning-paths.ts
 * keep proving that the protected path harness refuses forged counters,
 * replaced globals and mutated fixtures, whatever the published FDE path
 * happens to contain. `source` names the retired activity for the record. */
import type { MergedCode, PathCodeSolution } from '../../lib/learning-paths/types';

export interface PathAuthorityFixture {
  source: string;
  code: MergedCode;
  solution: PathCodeSolution;
}

export type PathAuthorityFixtureId = "max-gap" | "reverse" | "counted-queue" | "recursive-sum" | "linear-search";

export const PATH_AUTHORITY_FIXTURES: Record<PathAuthorityFixtureId, PathAuthorityFixture> = {
  "max-gap": {
    "source": "dsa-v1-d01-pair-versus-pass",
    "code": {
      "language": "javascript",
      "prompt": "Write `maxGap(values)` for an array of finite numbers, without changing it. Return the largest minus the smallest value; `[3, 9, 1]` gives 8. Empty or single-element input gives 0. Target: O(n) time, where n is the input length.\n\nThe grade permits at most 2n indexed reads of the original input in total on its checked inputs. A scan of every input pair exceeds that budget. Work performed on a copy is not counted by this probe.",
      "starter": "const maxGap = values => {\n\n};\n\n// Scratch pad — change this before submitting.\nconsole.log(maxGap([3, 9, 1]));\n",
      "skeleton": "const maxGap = values => {\n  if (/* fewer than two elements */) return 0;\n\n  let smallest = /* the first element */;\n  let largest = /* the first element */;\n\n  for (/* each element, once */) {\n    // widen smallest or largest when this element falls outside them\n  }\n\n  return largest - smallest;\n};",
      "hints": [
        "Think about which two values determine the widest gap. You need not store a result for each possible pair.",
        "Try an array containing only negative numbers before choosing initial comparison values."
      ],
      "approach": [
        "Return 0 immediately when the array holds fewer than two elements.",
        "Seed a smallest and a largest with the first element.",
        "Walk the array once, lowering the smallest or raising the largest when an element falls outside the pair.",
        "Return the largest minus the smallest."
      ],
      "contract": [
        "Use at most 2n indexed reads of the original input in total.",
        "Do not change the input array.",
        "An empty array and a single-element array both give 0."
      ],
      "tests": [
        {
          "call": "maxGap([3, 9, 1])",
          "expected": 8,
          "criterion": "core"
        },
        {
          "call": "maxGap([])",
          "expected": 0,
          "label": "an empty array has no gap",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "maxGap([5])",
          "expected": 0,
          "label": "one element has no gap",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "maxGap([-4, -1, -9])",
          "expected": 8,
          "label": "negative values",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "maxGap([7, 7, 7])",
          "expected": 0,
          "label": "all equal",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "__countReads([4, 8, 15, 16, 23, 42], function (view) { return maxGap(view); }).reads <= 12",
          "expected": true,
          "label": "six elements are read at most twelve times",
          "criterion": "linear-budget"
        }
      ],
      "typeTests": [],
      "harness": "var __countReads = function (values, run) {\n  var reads = 0;\n  var proxy = new __probe.Proxy(values, {\n    get: function (target, prop) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) reads += 1;\n      return target[prop];\n    },\n  });\n  var result = run(proxy);\n  return { result: result, reads: reads };\n};",
      "criteria": [
        {
          "id": "core",
          "label": "Correct gap, including the edge cases",
          "critical": true,
          "weight": 3,
          "detail": "Check empty, single-element, all-equal and negative-value arrays."
        },
        {
          "id": "linear-budget",
          "label": "At most 2n input reads in total",
          "critical": true,
          "weight": 2,
          "detail": "The total input-read counter exceeded 2n. Comparing every input pair repeatedly accesses the original array; a result can be correct while exceeding this budget."
        }
      ]
    },
    "solution": {
      "solution": "const maxGap = values => {\n  if (values.length < 2) return 0;\n  let smallest = values[0];\n  let largest = values[0];\n  for (const value of values) {\n    if (value < smallest) smallest = value;\n    if (value > largest) largest = value;\n  }\n  return largest - smallest;\n};",
      "hiddenTests": [
        {
          "call": "maxGap([1, 2])",
          "expected": 1
        },
        {
          "call": "maxGap([-5, 5])",
          "expected": 10
        },
        {
          "call": "maxGap([10, 2, 8, 2, 10])",
          "expected": 8
        },
        {
          "call": "maxGap([0, 0, 0, 1])",
          "expected": 1
        },
        {
          "call": "(() => { const values = [3, 9, 1]; const gap = maxGap(values); return [gap, values]; })()",
          "expected": [
            8,
            [
              3,
              9,
              1
            ]
          ]
        },
        {
          "call": "__countReads([9, 1, 8, 2, 7, 3, 6, 4, 5], function (view) { return maxGap(view); }).result",
          "expected": 8
        },
        {
          "call": "__countReads([9, 1, 8, 2, 7, 3, 6, 4, 5], function (view) { return maxGap(view); }).reads <= 18",
          "expected": true,
          "criterion": "linear-budget"
        },
        {
          "call": "__countReads([5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6], function (view) { return maxGap(view); }).reads <= 24",
          "expected": true,
          "criterion": "linear-budget"
        }
      ]
    }
  },
  "reverse": {
    "source": "dsa-v1-d02-reverse-in-place",
    "code": {
      "language": "javascript",
      "prompt": "Write `reverseInPlace(values)` for a dense ordinary array. Reverse its entries in place and return the same array object. Empty and one-element arrays remain unchanged.\n\nOn measured cases, the original array must contain the reversed order, the returned object must be identical to it, and at most n indexed mutations are allowed. Assignments, property definitions and deletions are counted; length updates are not. A returned reversed copy alone fails, but temporary copying or using a built-in is not detected as forbidden. Practice writing an ends-inward swap loop.\n\nTarget: O(n) time and O(1) extra space, where n is the input length. These finite assertions do not measure total runtime growth or temporary allocations.",
      "starter": "const reverseInPlace = values => {\n\n};\n\n// Scratch pad — change this before submitting.\nconsole.log(reverseInPlace([1, 2, 3, 4]));\n",
      "skeleton": "const reverseInPlace = values => {\n  let left = /* the first index */;\n  let right = /* the last index */;\n\n  while (/* the pointers have not met or crossed */) {\n    // hold one value, overwrite it with the other, put the held one back\n    // then move left inward and right inward\n  }\n\n  return /* the array you were given */;\n};",
      "hints": [
        "Identify the two positions whose values must trade places. Which positions no longer need attention after that swap?",
        "What protects the first value from being lost when you overwrite its slot?",
        "Check whether an empty or one-element input needs any writes, and which array object the caller expects back."
      ],
      "approach": [
        "Start `left` at 0 and `right` at `values.length - 1`.",
        "While `left` is below `right`, swap `values[left]` with `values[right]` using one temporary variable.",
        "Move `left` up by one and `right` down by one after each swap.",
        "Return `values` itself, so the caller gets back the array it passed in."
      ],
      "contract": [
        "Reverse the dense array you were given. Temporary allocation is not measured by these assertions.",
        "Return that same array, so `reverseInPlace(values) === values` holds.",
        "On measured cases, allow at most n indexed mutations: assignments, property definitions and deletions. Length updates are not counted.",
        "An empty array and a one-element array are returned unchanged, and still as the same object."
      ],
      "tests": [
        {
          "call": "reverseInPlace([1, 2, 3, 4])",
          "expected": [
            4,
            3,
            2,
            1
          ],
          "criterion": "core"
        },
        {
          "call": "reverseInPlace([1, 2, 3])",
          "expected": [
            3,
            2,
            1
          ],
          "label": "an odd length leaves the middle element where it is",
          "criterion": "core"
        },
        {
          "call": "reverseInPlace([])",
          "expected": [],
          "label": "an empty array comes back empty",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "reverseInPlace([7])",
          "expected": [
            7
          ],
          "label": "a single element is its own reverse",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "(() => { const values = [1, 2, 3]; reverseInPlace(values); return values; })()",
          "expected": [
            3,
            2,
            1
          ],
          "label": "the array the caller passed in is the one that changed",
          "criterion": "in-place"
        },
        {
          "call": "(() => { const values = [1, 2, 3]; return reverseInPlace(values) === values; })()",
          "expected": true,
          "label": "the returned value is the same array, not a copy",
          "criterion": "in-place"
        },
        {
          "call": "__countWrites([1, 2, 3, 4, 5, 6], function (view) { return reverseInPlace(view); }).writes <= 6",
          "expected": true,
          "label": "six elements take at most six index writes",
          "criterion": "in-place"
        }
      ],
      "typeTests": [],
      "harness": "var __countWrites = function (values, run) {\n  var writes = 0;\n  var proxy = new __probe.Proxy(values, {\n    set: function (target, prop, value) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) writes += 1;\n      target[prop] = value;\n      return true;\n    },\n    defineProperty: function (target, prop, descriptor) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) writes += 1;\n      __probe.defineProperty(target, prop, descriptor);\n      return true;\n    },\n    deleteProperty: function (target, prop) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) writes += 1;\n      return __probe.deleteProperty(target, prop);\n    },\n  });\n  var result = run(proxy);\n  return { writes: writes, same: result === proxy, values: values.slice(), result: result };\n};",
      "criteria": [
        {
          "id": "core",
          "label": "Correct reversed order, including the edge cases",
          "critical": true,
          "weight": 3,
          "detail": "Check the empty array, a single element, an even length and an odd length, where the middle element stays put."
        },
        {
          "id": "in-place",
          "label": "Reversed in place, and the same array returned",
          "critical": true,
          "weight": 2,
          "detail": "The caller’s array must hold the reversed order, the returned object must be that same array, and counted indexed mutations must stay within n. Returning only a separate copy fails; copying temporarily and writing back can pass. These assertions do not measure auxiliary allocations."
        }
      ]
    },
    "solution": {
      "solution": "const reverseInPlace = values => {\n  let left = 0;\n  let right = values.length - 1;\n  while (left < right) {\n    const held = values[left];\n    values[left] = values[right];\n    values[right] = held;\n    left += 1;\n    right -= 1;\n  }\n  return values;\n};",
      "hiddenTests": [
        {
          "call": "reverseInPlace([1, 2])",
          "expected": [
            2,
            1
          ]
        },
        {
          "call": "reverseInPlace(['a', 'b', 'c'])",
          "expected": [
            "c",
            "b",
            "a"
          ]
        },
        {
          "call": "(() => { const values = [1, 2, 3, 4, 5, 6, 7]; reverseInPlace(values); return values; })()",
          "expected": [
            7,
            6,
            5,
            4,
            3,
            2,
            1
          ],
          "criterion": "in-place"
        },
        {
          "call": "(() => { const values = []; return reverseInPlace(values) === values; })()",
          "expected": true,
          "criterion": "in-place"
        },
        {
          "call": "(() => { const values = [9]; return reverseInPlace(values) === values; })()",
          "expected": true,
          "criterion": "in-place"
        },
        {
          "call": "__countWrites([1, 2, 3, 4, 5, 6, 7, 8], function (view) { return reverseInPlace(view); }).values",
          "expected": [
            8,
            7,
            6,
            5,
            4,
            3,
            2,
            1
          ]
        },
        {
          "call": "__countWrites([1, 2, 3, 4, 5, 6, 7, 8], function (view) { return reverseInPlace(view); }).same",
          "expected": true,
          "criterion": "in-place"
        },
        {
          "call": "__countWrites([1, 2, 3, 4, 5, 6, 7], function (view) { return reverseInPlace(view); }).writes <= 7",
          "expected": true,
          "criterion": "in-place"
        }
      ]
    }
  },
  "counted-queue": {
    "source": "dsa-v1-d04-head-index-queue",
    "code": {
      "language": "javascript",
      "prompt": "Write `createQueue()`, returning an object with three methods:\n\n- `enqueue(value)` adds a value at the back. Its return value is never read.\n- `dequeue()` removes the value at the front and returns it, or `null` when the queue is empty.\n- `size()` returns how many values are waiting.\n\nUse a head index to avoid sliding waiting values down in the buffer. The fixed-input budget measures buffer operations, not work in other storage. With a head index: read the slot the head points at, then add one to the head.\n\nStore the values in a buffer the grader hands you — call `newQueueBuffer()` where you would otherwise write `[]`. It supports `push(value)`, `length` and index access and nothing else, and it counts indexed reads, assignments, property definitions and deletions; one push counts as one write.\n\nThe budget: enqueueing 32 values and then dequeuing all 32 must stay within 192 buffer operations, six per value. A head index costs three per value. A dense slide costs over a thousand on that sequence. Return values unchanged, including object identity and undefined/falsey values; separate queues keep independent state. Passing fixed cases does not prove asymptotic complexity.",
      "starter": "const createQueue = () => {\n  const items = newQueueBuffer();\n\n};\n\n// Scratch pad — change this before submitting.\nconst queue = createQueue();\nqueue.enqueue('a');\nqueue.enqueue('b');\nconsole.log(queue.dequeue(), queue.size());\n",
      "skeleton": "const createQueue = () => {\n  const items = newQueueBuffer();\n  let head = /* the index of the value at the front */;\n\n  return {\n    enqueue(value) {\n      // append at the back\n    },\n    dequeue() {\n      // null when the head has caught up with the end\n      // otherwise read the slot, release it, and move the head on\n    },\n    size() {\n      /* ... */\n    },\n  };\n};",
      "hints": [
        "Keep separate positions for the stored end and the next value to return. Work out when they describe an empty queue.",
        "Read the front value before advancing the head. You can clear the consumed slot without moving any waiting value.",
        "Write `null` into the slot you just read before advancing the head. The slot stays in the buffer, but the value it referenced can be collected."
      ],
      "approach": [
        "Create the buffer with `newQueueBuffer()` and start a `head` index at 0.",
        "Append in `enqueue` with `items.push(value)`.",
        "In `dequeue`, return `null` when `head` is not below `items.length`.",
        "Otherwise read `items[head]`, clear that slot, add one to `head`, and return the value you read.",
        "Report `items.length - head` from `size()`."
      ],
      "contract": [
        "Use a buffer from newQueueBuffer for the exercise; work in other storage is not counted.",
        "The buffer offers `push`, `length` and index access only — reaching for `shift` or `splice` throws.",
        "A measured 32-value fill and drain costs at most 192 buffer operations. The hidden 64-value run has the same six-per-value limit; these traces do not prove arbitrary complexity.",
        "`dequeue()` returns `null` on an empty queue, and `size()` never goes below 0."
      ],
      "tests": [
        {
          "call": "(() => { const q = createQueue(); q.enqueue('a'); q.enqueue('b'); return [q.dequeue(), q.dequeue()]; })()",
          "expected": [
            "a",
            "b"
          ],
          "label": "the value that waited longest comes back first",
          "criterion": "core"
        },
        {
          "call": "(() => { const q = createQueue(); return [q.size(), q.dequeue()]; })()",
          "expected": [
            0,
            null
          ],
          "label": "an empty queue reports zero and dequeues null",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "(() => { const q = createQueue(); q.enqueue(1); q.enqueue(2); q.dequeue(); q.enqueue(3); return [q.size(), q.dequeue(), q.dequeue(), q.size()]; })()",
          "expected": [
            2,
            2,
            3,
            0
          ],
          "label": "enqueues and dequeues interleave",
          "criterion": "core"
        },
        {
          "call": "(() => { const q = createQueue(); q.enqueue(1); q.dequeue(); q.dequeue(); q.enqueue(2); return [q.size(), q.dequeue()]; })()",
          "expected": [
            1,
            2
          ],
          "label": "a queue drained to empty still accepts new values",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "__measureQueue(6).out",
          "expected": [
            0,
            1,
            2,
            3,
            4,
            5
          ],
          "label": "six values come back in the order they arrived",
          "criterion": "core"
        },
        {
          "call": "__measureQueue(32).ops <= 192",
          "expected": true,
          "label": "32 values cost at most 192 buffer operations",
          "criterion": "constant-dequeue"
        },
        {
          "call": "__measureQueue(32).ops >= 32",
          "expected": true,
          "label": "at least 32 counted buffer operations are observed",
          "criterion": "constant-dequeue"
        }
      ],
      "typeTests": [],
      "harness": "var __bufferOps = 0;\nvar __buffersMade = 0;\nvar newQueueBuffer = function () {\n  var data = [];\n  __buffersMade += 1;\n  return new __probe.Proxy(data, {\n    get: function (target, prop) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) {\n        __bufferOps += 1;\n        return target[prop];\n      }\n      if (prop === 'length') return target.length;\n      if (prop === 'push') {\n        return function (value) {\n          __bufferOps += 1;\n          target[target.length] = value;\n          return target.length;\n        };\n      }\n      return undefined;\n    },\n    set: function (target, prop, value) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) __bufferOps += 1;\n      target[prop] = value;\n      return true;\n    },\n    defineProperty: function (target, prop, descriptor) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) __bufferOps += 1;\n      __probe.defineProperty(target, prop, descriptor);\n      return true;\n    },\n    deleteProperty: function (target, prop) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) __bufferOps += 1;\n      return __probe.deleteProperty(target, prop);\n    },\n  });\n};\nvar __measureQueue = function (n) {\n  __bufferOps = 0;\n  __buffersMade = 0;\n  var queue = createQueue();\n  for (var i = 0; i < n; i += 1) queue.enqueue(i);\n  var out = [];\n  for (var j = 0; j < n; j += 1) out.push(queue.dequeue());\n  return { out: out, size: queue.size(), ops: __bufferOps, buffers: __buffersMade };\n};",
      "criteria": [
        {
          "id": "core",
          "label": "First in, first out, with null on an empty queue",
          "critical": true,
          "weight": 3,
          "detail": "Check arrival order, an empty queue, a queue drained and then refilled, and two queues that must not share storage."
        },
        {
          "id": "constant-dequeue",
          "label": "The measured buffer trace stays within its budget",
          "critical": true,
          "weight": 2,
          "detail": "The counter exceeds six buffer operations per value on a measured 32- or 64-value round trip, or too few buffer operations were observed. A dense slide fails these traces; other storage and untested inputs are outside the measurement."
        }
      ]
    },
    "solution": {
      "solution": "const createQueue = () => {\n  const items = newQueueBuffer();\n  let head = 0;\n\n  return {\n    enqueue(value) {\n      items.push(value);\n    },\n    dequeue() {\n      if (head >= items.length) return null;\n      const value = items[head];\n      items[head] = null;\n      head += 1;\n      return value;\n    },\n    size() {\n      return items.length - head;\n    },\n  };\n};",
      "hiddenTests": [
        {
          "call": "(() => { const q=createQueue(), value={id:3}; q.enqueue(value); return [q.dequeue()===value,q.size()]; })()",
          "expected": [
            true,
            0
          ]
        },
        {
          "call": "(() => { const q=createQueue(), values=[undefined,false,0,\"\",NaN]; for(const value of values)q.enqueue(value); const first=q.dequeue(); const second=q.dequeue(); const third=q.dequeue(); const fourth=q.dequeue(); const last=q.dequeue(); return [first===undefined,second,third,fourth,last!==last,q.size(),q.dequeue()]; })()",
          "expected": [
            true,
            false,
            0,
            "",
            true,
            0,
            null
          ]
        },
        {
          "call": "(() => { const q=createQueue(), value=Symbol(\"entry\"); q.enqueue(value); return q.dequeue()===value; })()",
          "expected": true
        },
        {
          "call": "__measureQueue(32).size",
          "expected": 0
        },
        {
          "call": "__measureQueue(48).out.length",
          "expected": 48
        },
        {
          "call": "(() => { const q = createQueue(); q.enqueue(null); return [q.size(), q.dequeue(), q.size()]; })()",
          "expected": [
            1,
            null,
            0
          ]
        },
        {
          "call": "(() => { const a = createQueue(); const b = createQueue(); a.enqueue(1); a.enqueue(2); b.enqueue(9); return [a.dequeue(), b.dequeue(), a.size(), b.size()]; })()",
          "expected": [
            1,
            9,
            1,
            0
          ]
        },
        {
          "call": "(() => { const q = createQueue(); q.enqueue({ id: 3 }); return q.dequeue(); })()",
          "expected": {
            "id": 3
          }
        },
        {
          "call": "(() => { const q = createQueue(); [1, 2, 3].forEach(v => q.enqueue(v)); q.dequeue(); return [q.size(), q.dequeue(), q.dequeue(), q.dequeue()]; })()",
          "expected": [
            2,
            2,
            3,
            null
          ]
        },
        {
          "call": "__measureQueue(64).ops <= 384",
          "expected": true,
          "criterion": "constant-dequeue"
        },
        {
          "call": "__measureQueue(64).buffers >= 1",
          "expected": true,
          "criterion": "constant-dequeue"
        }
      ]
    }
  },
  "recursive-sum": {
    "source": "dsa-v1-d06-recursive-list-sum",
    "code": {
      "language": "javascript",
      "prompt": "A node is a plain object `{ value, next }`. `next` holds the node after it, the last node's `next` is `null`, and a list is its head node or `null` when empty.\n\nWrite `sumList(head)`, returning the sum of every value in the list. `sumList(null)` is 0, a one-node list gives that node's value, and negative values and zeros count like any other number. Leave the list as you found it: no node changes and no node is added or removed. Lists are finite, acyclic and null-terminated, with at most 100 nodes. Values are finite Numbers with absolute value at most 1000000. Add in the recursive order `head.value + sumList(head.next)`, without rounding; fractional Number additions follow that order.\n\nDo it recursively, with the empty list as the only base case. The grade replaces the `sumList` binding with a wrapper that counts every call, including the calls the function makes on itself, and expects one call per node plus one final call that receives `null`: four nodes means five calls. A loop makes one call and fails that check; a second base case for the last node makes one call too few and fails it as well.\n\nTarget: O(n) time and O(n) extra space from waiting recursive frames, where n is the number of list nodes under constant-cost field reads and Number addition. Empty input is constant work; the finite call counter does not measure memory.",
      "starter": "function sumList(head) {\n\n}\n\n// Scratch pad — change this before submitting.\nconsole.log(sumList({ value: 1, next: { value: 2, next: null } }));\n",
      "skeleton": "function sumList(head) {\n  if (/* the list is empty */) return /* the sum of no values at all */;\n\n  return /* the value in this node */ + /* the sum of the rest, from this same function */;\n}",
      "hints": [
        "The empty list is the base case and its sum is 0. Every other list is one value plus a shorter list, and `head.next` is exactly that shorter list.",
        "Assume the recursive call already returns the correct sum of everything after `head`. Then the only decision left is what to add to it.",
        "Resist a second base case for the last node. `head.next` on the last node is `null`, which the empty-list branch already answers, and the extra branch costs you a call the grade is counting."
      ],
      "approach": [
        "Return 0 when `head` is `null`: an empty list has nothing to add.",
        "Otherwise read `head.value` from the node in hand.",
        "Call `sumList` on `head.next`, which is the same list without its first node.",
        "Return `head.value` plus whatever that call gave back.",
        "Check the count: n nodes produce n calls holding a node and one final call holding `null`."
      ],
      "contract": [
        "Recurse on `sumList` itself. A nested helper function that does the walking is not counted, because the wrapper only sees calls to `sumList`.",
        "Use exactly one base case: `head === null` returns 0. The graded count is the number of nodes plus one.",
        "Declare `sumList` with the `function` keyword, as the starter does. The grader replaces that binding before the assertions run, and a `const` binding cannot be replaced, so the recursion check would report no calls at all.",
        "Do not modify the list, and do not collect the values into an array first."
      ],
      "tests": [
        {
          "call": "sumList(__build([1, 2, 3]))",
          "expected": 6,
          "criterion": "core"
        },
        {
          "call": "sumList(null)",
          "expected": 0,
          "label": "an empty list sums to zero",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "sumList(__build([7]))",
          "expected": 7,
          "label": "a single node is its own sum",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "sumList(__build([-4, 4, -2]))",
          "expected": -2,
          "label": "negative values count",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "sumList(__build([0, 0, 0]))",
          "expected": 0,
          "label": "three zeros are not an empty list",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "__callsToSum([1, 2, 3, 4])",
          "expected": 5,
          "label": "four nodes take five calls",
          "criterion": "recursive"
        },
        {
          "call": "__callsToSum([])",
          "expected": 1,
          "label": "an empty list is one call and no deeper",
          "edge": true,
          "criterion": "recursive"
        }
      ],
      "typeTests": [],
      "harness": "var __LIST_LIMIT = 4096;\nvar __build = function (values) {\n  var head = null;\n  for (var i = values.length - 1; i >= 0; i -= 1) head = { value: values[i], next: head };\n  return head;\n};\nvar __toArray = function (head) {\n  var out = [];\n  var node = head;\n  while (node && out.length < __LIST_LIMIT) {\n    out.push(node.value);\n    node = node.next;\n  }\n  return out;\n};\nvar __sumCalls = 0;\nvar __sumWrapped = false;\nvar __sumOriginal = null;\ntry {\n  __sumOriginal = sumList;\n  if (typeof __sumOriginal === 'function') {\n    sumList = function (head) {\n      __sumCalls += 1;\n      return __sumOriginal(head);\n    };\n    __sumWrapped = true;\n  }\n} catch (error) {\n  __sumWrapped = false;\n}\nvar __callsToSum = function (values) {\n  if (!__sumWrapped) return -1;\n  __sumCalls = 0;\n  sumList(__build(values));\n  return __sumCalls;\n};",
      "criteria": [
        {
          "id": "core",
          "label": "Correct sum, including the edge cases",
          "critical": true,
          "weight": 3,
          "detail": "Check the empty list, a single node, negative values, zeros, and that the list is unchanged afterwards."
        },
        {
          "id": "recursive",
          "label": "One call per node, plus one for the empty tail",
          "critical": true,
          "weight": 2,
          "detail": "The grader wrapped `sumList` and counted every call. A loop produces one call. A second base case for the last node produces one too few. A `const` binding cannot be wrapped and reports none at all, which is why the contract asks for the `function` form."
        }
      ]
    },
    "solution": {
      "solution": "function sumList(head) {\n  if (head === null) return 0;\n  return head.value + sumList(head.next);\n}",
      "hiddenTests": [
        {
          "call": "sumList(__build([10, 20, 30, 40, 50]))",
          "expected": 150
        },
        {
          "call": "sumList(__build([1.5, 2.5]))",
          "expected": 4
        },
        {
          "call": "sumList(__build([-1, -2, -3]))",
          "expected": -6
        },
        {
          "call": "(() => { const head = __build([1, 2, 3]); sumList(head); return __toArray(head); })()",
          "expected": [
            1,
            2,
            3
          ]
        },
        {
          "call": "(() => { const head = __build([5, 6]); sumList(head); return head.next.next; })()",
          "expected": null
        },
        {
          "call": "(() => { const tail = { value: 2, next: null }; const head = { value: 1, next: tail }; const nodes = [head, tail]; const before = nodes.map(node => Reflect.ownKeys(node).map(key => [key, Object.getOwnPropertyDescriptor(node, key)])); sumList(head); return nodes.every((node, i) => { const keys = Reflect.ownKeys(node); return keys.length === before[i].length && before[i].every(([key, old], k) => { const now = Object.getOwnPropertyDescriptor(node, key); return keys[k] === key && now && now.value === old.value && now.writable === old.writable && now.enumerable === old.enumerable && now.configurable === old.configurable; }); }); })()",
          "expected": true
        },
        {
          "call": "(() => { const tail = Object.freeze({ value: 2, next: null }); return sumList(Object.freeze({ value: 1, next: tail })); })()",
          "expected": 3
        },
        {
          "call": "sumList(__build([0.1, 0.2, 0.3]))",
          "expected": 0.6
        },
        {
          "call": "sumList(__build(Array.from({ length: 100 }, (_, i) => i - 50)))",
          "expected": -50
        },
        {
          "call": "__callsToSum([9])",
          "expected": 2,
          "criterion": "recursive"
        },
        {
          "call": "__callsToSum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])",
          "expected": 11,
          "criterion": "recursive"
        }
      ]
    }
  },
  "linear-search": {
    "source": "dsa-v1-d07-linear-search",
    "code": {
      "language": "javascript",
      "prompt": "Write `linearSearch(values, target)`, returning the index of the first element strictly equal to `target`, or -1 when nothing matches. The input is an ordinary dense array of at most 10000 JavaScript values, in any order. Match objects by reference, do not coerce values, and do not change the array or its elements. An actual undefined entry is allowed; sparse holes are outside this exercise. `linearSearch([4, 9, 1, 9], 9)` gives 1, and an empty array gives -1.\n\nThe grade counts how many times you read an element by index. Use one left-to-right walk and stop at the first match. The bounded fixtures allow at most n indexed reads for n elements, one read for a match at index 0, and a matching-prefix budget in other early-hit cases. The counter totals reads; it does not prove that arbitrary code visits every position only once.\n\nTarget: O(n) time in the worst case and O(1) extra space, where n is the input length and indexed reads/strict equality count as unit operations. An early match may finish sooner; empty input is constant work.",
      "starter": "const linearSearch = (values, target) => {\n\n};\n\n// Scratch pad — change this before submitting.\nconsole.log(linearSearch([4, 9, 1, 9], 9));\n",
      "skeleton": "const linearSearch = (values, target) => {\n  for (/* every index, starting at the first */) {\n    // return this index when the element strictly equals the target\n  }\n\n  return /* the walk finished without a match */;\n};",
      "hints": [
        "A plain `for` loop over the indices gives you the element and the index you have to return. `for…of` hands you the value alone, so you would have to track the position yourself.",
        "Return from inside the loop the moment an element matches. The `return -1` belongs after the loop, where it means the walk finished with nothing found."
      ],
      "approach": [
        "Walk the indices from 0 up to the last one.",
        "Read the element at the current index and compare it with the target using strict equality.",
        "Return that index straight away on a match.",
        "Return -1 after the loop, which is also what an empty array gives because the loop never runs."
      ],
      "contract": [
        "Use at most one indexed read per visited element; the fixtures enforce aggregate and early-hit budgets, not a proof over every possible input.",
        "Return as soon as an element matches; running to the end anyway breaks the budget on an early match.",
        "Compare with strict equality: 0 differs from false, NaN never matches itself, both signs of zero match, and objects match only the same reference.",
        "Leave the input as you found it: no sorting, no copying, no slicing."
      ],
      "tests": [
        {
          "call": "linearSearch([4, 9, 1, 9], 9)",
          "expected": 1,
          "label": "duplicates give the first index",
          "criterion": "core"
        },
        {
          "call": "linearSearch([], 3)",
          "expected": -1,
          "label": "an empty array has nothing to find",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "linearSearch([2, 4, 6], 5)",
          "expected": -1,
          "label": "a value that is not there",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "linearSearch(['fin', 'reef', 'kelp'], 'kelp')",
          "expected": 2,
          "label": "strings compare the same way",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "linearSearch([7], 7)",
          "expected": 0,
          "label": "a single element",
          "edge": true,
          "criterion": "core"
        },
        {
          "call": "__countReads([5, 3, 8, 1, 9, 2], function (view) { return linearSearch(view, 4); }).reads <= 6",
          "expected": true,
          "label": "a missing target reads six elements at most once each",
          "criterion": "one-pass"
        },
        {
          "call": "__countReads([5, 3, 8, 1, 9, 2], function (view) { return linearSearch(view, 5); }).reads <= 1",
          "expected": true,
          "label": "a match at index 0 stops after one read",
          "criterion": "one-pass"
        }
      ],
      "typeTests": [],
      "harness": "var __countReads = function (values, run) {\n  var reads = 0;\n  var proxy = new __probe.Proxy(values, {\n    get: function (target, prop) {\n      if (typeof prop === 'string' && __probe.isIndex(prop)) reads += 1;\n      return target[prop];\n    },\n  });\n  var result = run(proxy);\n  return { result: result, reads: reads };\n};",
      "criteria": [
        {
          "id": "core",
          "label": "Correct first index, including the edge cases",
          "critical": true,
          "weight": 3,
          "detail": "Check an empty array, an absent target, duplicates where the first index is wanted, and a match at the last index."
        },
        {
          "id": "one-pass",
          "label": "One read per element, and a stop at the first match",
          "critical": true,
          "weight": 2,
          "detail": "The fixture exceeded its indexed-read budget. Copying, a second walk or continuing after a match can exceed it. These sampled aggregate counts are not a universal per-position or complexity proof."
        }
      ]
    },
    "solution": {
      "solution": "const linearSearch = (values, target) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (values[index] === target) return index;\n  }\n  return -1;\n};",
      "hiddenTests": [
        {
          "call": "linearSearch([1, 2, 3, 2, 1], 2)",
          "expected": 1
        },
        {
          "call": "linearSearch([0, -3, -3, 5], -3)",
          "expected": 1
        },
        {
          "call": "linearSearch([false, 0, 1], 0)",
          "expected": 1
        },
        {
          "call": "linearSearch([9, 9, 9, 9], 9)",
          "expected": 0
        },
        {
          "call": "linearSearch([1, 2, 3], 3)",
          "expected": 2
        },
        {
          "call": "(() => { const values = [3, 1, 2]; const keys = Reflect.ownKeys(values); const proto = Object.getPrototypeOf(values); const before = keys.map(key => Object.getOwnPropertyDescriptor(values, key)); linearSearch(values, 1); const after = Reflect.ownKeys(values); return Object.getPrototypeOf(values) === proto && keys.length === after.length && keys.every((key, i) => { const now = Object.getOwnPropertyDescriptor(values, key), old = before[i]; return after[i] === key && now && now.value === old.value && now.writable === old.writable && now.enumerable === old.enumerable && now.configurable === old.configurable; }); })()",
          "expected": true
        },
        {
          "call": "linearSearch([NaN, 0], NaN)",
          "expected": -1
        },
        {
          "call": "linearSearch([-0, 1], 0)",
          "expected": 0
        },
        {
          "call": "linearSearch([null, undefined, false], undefined)",
          "expected": 1
        },
        {
          "call": "(() => { const shared = { name: \"reef\" }; const other = { name: \"reef\" }; const values = Object.freeze([other, shared, shared]); const found = linearSearch(values, shared); return [found, shared.name, other.name]; })()",
          "expected": [
            1,
            "reef",
            "reef"
          ]
        },
        {
          "call": "linearSearch(Object.freeze([3, 1, 2]), 1)",
          "expected": 1
        },
        {
          "call": "linearSearch(Array.from({ length: 10000 }, (_, i) => i), 9999)",
          "expected": 9999
        },
        {
          "call": "(() => { const values = [3, 1, 2]; linearSearch(values, 1); return values; })()",
          "expected": [
            3,
            1,
            2
          ]
        },
        {
          "call": "__countReads([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function (view) { return linearSearch(view, 10); }).reads <= 10",
          "expected": true,
          "criterion": "one-pass"
        },
        {
          "call": "__countReads([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function (view) { return linearSearch(view, 2); }).reads <= 2",
          "expected": true,
          "criterion": "one-pass"
        }
      ]
    }
  }
};
