/** D06 — Recursion foundations.
 *
 * A recursive function is two claims at once: the base case answers a smallest
 * input directly, and the recursive case reduces every other input toward it.
 * This module grades both halves — the answer, and the shape that produced it.
 *
 * Two of the three exercises are graded on method. Their harness replaces the
 * binding the learner declared with a wrapper that counts every call, so
 * "this recursed" and "this did not" are read from the call count rather than
 * from the source text. That is a bounded contract about these inputs and
 * these bindings, never a proof about arbitrary code, and the prompt and the
 * contract both say so before the learner writes a line. */

import type { ModuleSource } from '../../types';

/** Builds `{ value, next }` lists for the assertions, and wraps the learner's
 * `sumList` so every call — including the ones it makes on itself — passes
 * through a counter. Appended after the learner's code, so it cannot be
 * shadowed. The wrap is guarded: a binding that refuses to be replaced leaves
 * `__sumWrapped` false and the recursion probe reports -1 instead of throwing
 * and taking the correctness assertions down with it. */
const SUM_PROBE = `
var __LIST_LIMIT = 4096;
var __build = function (values) {
  var head = null;
  for (var i = values.length - 1; i >= 0; i -= 1) head = { value: values[i], next: head };
  return head;
};
var __toArray = function (head) {
  var out = [];
  var node = head;
  while (node && out.length < __LIST_LIMIT) {
    out.push(node.value);
    node = node.next;
  }
  return out;
};
var __sumCalls = 0;
var __sumWrapped = false;
var __sumOriginal = null;
try {
  __sumOriginal = sumList;
  if (typeof __sumOriginal === 'function') {
    sumList = function (head) {
      __sumCalls += 1;
      return __sumOriginal(head);
    };
    __sumWrapped = true;
  }
} catch (error) {
  __sumWrapped = false;
}
var __callsToSum = function (values) {
  if (!__sumWrapped) return -1;
  __sumCalls = 0;
  sumList(__build(values));
  return __sumCalls;
};
`.trim();

/** Wraps `countdownSteps` the same way, for the opposite verdict: exactly one
 * observed call is what a loop produces. Calls through a separately named
 * recursive helper are outside this counter; the prompt states that limit. */
const COUNTDOWN_PROBE = `
var __countdownCalls = 0;
var __countdownWrapped = false;
var __countdownOriginal = null;
try {
  __countdownOriginal = countdownSteps;
  if (typeof __countdownOriginal === 'function') {
    countdownSteps = function (n) {
      __countdownCalls += 1;
      return __countdownOriginal(n);
    };
    __countdownWrapped = true;
  }
} catch (error) {
  __countdownWrapped = false;
}
var __callsToCountdown = function (n) {
  if (!__countdownWrapped) return -1;
  __countdownCalls = 0;
  countdownSteps(n);
  return __countdownCalls;
};
var __stepsDownByOne = function (values) {
  if (!Array.isArray(values) || values.length === 0) return false;
  for (var i = 1; i < values.length; i += 1) {
    if (values[i] !== values[i - 1] - 1) return false;
  }
  return true;
};
`.trim();

export const DSA_D06: ModuleSource = {
  id: 'dsa-v1-d06',
  title: 'Recursion foundations',
  outcomes: [
    'Write a recursive function as two halves: a base case that answers directly and a recursive case that reduces every accepted input toward it.',
    'Say what a missing or unreachable base case does at run time, and why that is a stack failure rather than a hang.',
    'Give the time and the stack space of a recursion separately, and rewrite it as the loop that needs no stack.',
  ],
  competencies: ['recursion', 'complexity', 'linked-lists'],
  dependsOn: ['dsa-v1-d05'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'dsa-v1-d06-l1',
      title: 'Base case, recursive case, termination',
      summary: 'The two halves of a recursive definition, what makes the base case reachable, and what an engine does when it never is.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Functions: recursion',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A recursive function answers a problem by calling itself on a smaller version of the same problem. Two parts make that work. The base case answers an input directly, without asking again. The recursive case shrinks the input and hands it on. As with a loop, every accepted input must make progress toward a stopping condition. The examples below use ordinary calls that retain their waiting frames.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const sumTo = n => {\n  if (n === 0) return 0;      // base case: answered without another call\n  return n + sumTo(n - 1);    // recursive case: a smaller n, handed on\n};',
          caption: 'The two halves, for a nonnegative integer n small enough for the engine stack and exact Number arithmetic.',
        },
        {
          kind: 'prose',
          body:
            'The base case is the smallest input you can answer on the spot. Counting down to zero, it is 0. Walking a linked list, it is the empty list. Adding up a tree, it is the empty subtree. Pick it first, because the recursive case only has to reach it, not replace it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// No base case at all: every call makes another one.\nconst sumToA = n => n + sumToA(n - 1);\n\n// A base case most inputs step straight over.\nconst sumToB = n => {\n  if (n === 0) return 0;\n  return n + sumToB(n - 2);\n};',
          caption: 'Two ways to lose termination: no stopping point, and a stopping point the step jumps past.',
        },
        {
          kind: 'prose',
          body:
            '`sumToB(10)` is fine: 10, 8, 6, 4, 2, 0, and the base case catches it. `sumToB(7)` goes 7, 5, 3, 1, -1, -3 and never equals 0. Writing a base case is not the same as reaching it, and termination is a claim about every input the function accepts, not about the one you tried.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Neither broken version hangs quietly. Each call in flight takes a frame on the call stack, the frames pile up, and the engine gives up: V8 throws a RangeError reading "Maximum call stack size exceeded", SpiderMonkey reports "too much recursion". The depth at which that happens is an engine detail, not a language guarantee, so it is a symptom to recognise rather than a limit to design against.',
        },
        {
          kind: 'table',
          caption: 'Four recursive shapes and how each one ends.',
          headers: ['Shape', 'What the code does', 'How it ends'],
          rows: [
            ['No base case', 'Every call makes another call', 'Frames pile up until the engine reports stack exhaustion'],
            [
              'A base case the step jumps over',
              'Subtracting 2 from an odd n never lands on 0',
              'The same stack-exhaustion failure for inputs that miss; large terminating inputs can also exhaust the stack',
            ],
            [
              'A recursive case that does not shrink',
              'The call passes on the input it was given, unchanged',
              'The input never approaches the base case; without tail-call elimination, frames accumulate until stack exhaustion',
            ],
            [
              'A reachable base case',
              'For the bounded nonnegative integers in this example, subtracting 1 reaches 0',
              'The deepest call returns first, and the answer travels back up',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'To argue that a recursion terminates, name a quantity that drops on every call and cannot drop forever. For `sumTo` it is n itself, which falls by one and is caught at 0. For a list it is the number of nodes still ahead. If you cannot name that quantity, you do not yet have a termination argument.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const sumList = head => {\n  if (head === null) return 0;\n  return head.value + sumList(head.next);\n};',
          caption: 'The same two halves over a linked list: the empty list answers directly, and `head.next` is always one node shorter.',
        },
        {
          kind: 'prose',
          body:
            'For a finite, acyclic list ending in null, `head.next` removes the first node from the remaining walk, so the count falls by one per call. A list of n nodes therefore makes n calls that hold a node, plus one final call that receives `null` and returns 0: n + 1 calls in total, and that count is what the next lesson prices.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'One base case is enough. Stopping early with `if (head.next === null) return head.value;` also produces the right sum, but it writes the addition twice, adds a second place to get the empty list wrong, and stops one call short of the definition. Keep the empty list as the only stopping point.',
        },
        {
          kind: 'prose',
          body:
            'When you write the recursive case, assume the call on the smaller input already returns the right answer and decide only how to combine it with the piece in your hand. That assumption is what makes recursive code short. The base case is what makes it true.',
        },
      ],
    },
    {
      id: 'dsa-v1-d06-l2',
      title: 'What recursion costs',
      summary: 'Time from the number of calls, space from the deepest point of the stack, and the loop that does the same work without one.',
      estimatedMinutes: 20,
      sources: [
        { label: 'MDN — Call stack', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Call_stack', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — RangeError: too much recursion',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion',
          reviewedOn: '2026-09-08',
        },
        { label: 'Harvard CS50x — Algorithms notes', url: 'https://cs50.harvard.edu/x/notes/3/', reviewedOn: '2026-09-08' },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A recursion has two prices and they are read off two different counts. Time adds up the work in all calls; when each does constant work, counting calls is enough. Space comes from how many calls are open at the deepest point. A loop usually collapses the second number to a constant while leaving the first alone, which is the whole reason the rewrite is worth knowing.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const sumList = head => {\n  if (head === null) return 0;\n  return head.value + sumList(head.next);\n};',
          caption: 'One node per call, a fixed amount of work inside each: n + 1 calls for n nodes.',
        },
        {
          kind: 'prose',
          body:
            'Time first. A call that holds a node compares `head` against `null`, reads `head.value`, and makes one addition and one call; the final call compares and stops. Under the unit-cost model this path uses, that is a fixed number of steps whatever the list holds. Multiply by n + 1 calls and the running time is O(n), the same class as a loop over the same nodes.',
        },
        {
          kind: 'prose',
          body:
            'Space is the half that differs. A call waiting on another call cannot be thrown away: its frame still holds the parameter, the locals and the point to resume at. The frames accumulate on the way down and come off on the way back, so the memory bill is set by the deepest point. For this function that is n + 1 frames, which is O(n) auxiliary space even though the body allocates nothing you can see.',
        },
        {
          kind: 'trace',
          caption: 'Summing 3 → 1 → 4. Cells run bottom to top, so the rightmost cell is the call currently running.',
          trace: {
            shape: 'stack',
            frames: [
              {
                cells: ['sumList(3→1→4)'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The first call receives the whole list. Its head holds 3, so it cannot return until it knows the sum of everything after it.',
                counter: { label: 'Frames open', value: 1 },
              },
              {
                cells: ['sumList(3→1→4)', 'sumList(1→4)'],
                marks: [{ index: 1, role: 'active' }],
                note: 'It calls itself on `head.next`. The first frame stays open with an addition pending, and the second frame starts on the shorter list.',
                counter: { label: 'Frames open', value: 2 },
              },
              {
                cells: ['sumList(3→1→4)', 'sumList(1→4)', 'sumList(4)'],
                marks: [{ index: 2, role: 'active' }],
                note: 'A third call takes the last node. Three frames are now open and none of them has produced a number yet.',
                counter: { label: 'Frames open', value: 3 },
              },
              {
                cells: ['sumList(3→1→4)', 'sumList(1→4)', 'sumList(4)', 'sumList(null)'],
                marks: [{ index: 3, role: 'active' }],
                note: 'The fourth call receives `null`. This is the base case: it returns 0 immediately and makes no further call, which is the deepest the stack gets.',
                counter: { label: 'Frames open', value: 4 },
              },
              {
                cells: ['sumList(3→1→4)', 'sumList(1→4)', 'sumList(4)'],
                marks: [{ index: 2, role: 'settled' }],
                note: 'The base-case frame is gone. `sumList(4)` was waiting on that 0, adds its own 4, and returns 4.',
                counter: { label: 'Frames open', value: 3 },
              },
              {
                cells: ['sumList(3→1→4)', 'sumList(1→4)'],
                marks: [{ index: 1, role: 'settled' }],
                note: '`sumList(1→4)` had 4 pending. It adds its own 1 and returns 5 to the frame below it.',
                counter: { label: 'Frames open', value: 2 },
              },
              {
                cells: ['sumList(3→1→4)'],
                marks: [{ index: 0, role: 'settled' }],
                note: 'The first frame adds its 3 to the 5 it was handed and returns 8, the answer the caller asked for.',
                counter: { label: 'Frames open', value: 1 },
              },
              {
                cells: [],
                note: 'The stack is empty again. Three nodes cost four calls, and four frames were open at once at the deepest point: linear time and linear stack space.',
                counter: { label: 'Frames open', value: 0 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Read the first half of that trace and you have the descent; read the second half and you have the unwinding. Nothing returns early. Each frame finishes the addition it had pending only after the frame above it hands back a number, which is why the answer appears in the reverse of the order the calls were made.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const sumListLoop = head => {\n  let total = 0;\n  let node = head;\n  while (node !== null) {\n    total += node.value;\n    node = node.next;\n  }\n  return total;\n};',
          caption: 'The same traversal in one frame: a total and a walking reference, whatever the length.',
        },
        {
          kind: 'table',
          caption: 'The same sum, written two ways.',
          headers: ['Question', 'Recursive', 'Iterative'],
          rows: [
            ['Time', 'O(n): n + 1 calls, constant work in each', 'O(n): one pass, constant work per node'],
            ['Auxiliary space', 'O(n): one open frame per node still waiting', 'O(1): a total and one reference'],
            ['Where the state lives', 'In the frames the engine is holding for you', 'In the two variables you declared'],
            ['Resource limits', 'Available stack depth as well as data and running time', 'Available data memory and running time; no frame per node'],
          ],
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The stack limit is real and it is not a number to code against. It depends on the engine, on how large each frame is and on what was already on the stack when your function started, so the same recursion can survive on one runtime and throw on another. There is no portable safe recursion-depth cutoff. Proper tail calls are in the language specification, but most engines never shipped them, so writing the call in tail position does not reliably save the frame.',
        },
        {
          kind: 'prose',
          body:
            'Factorial is the standard case where the two costs get confused. The loop runs n - 1 times for n of 2 or more, and the recursion makes n + 1 calls, so under the unit-cost model the running time is linear in n either way. The value it returns grows factorially. How fast the answer grows and how fast the work grows are separate questions, and here the answers are nowhere near each other.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const factorial = n => {\n  let product = 1;\n  for (let i = 2; i <= n; i += 1) product *= i;\n  return product;\n};',
          caption: 'Nineteen multiplications produce 20!, which is 2432902008176640000. The step count is linear; only the result is factorial.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'The unit-cost model is carrying weight in that claim. Each multiplication counts as one step because a `Number` is a fixed-width double. 18! is 6402373705728000, the last factorial below `Number.MAX_SAFE_INTEGER` (9007199254740991); 19! and 20! are past that mark and still come out exactly, while 23! comes back wrong. Compute with arbitrary-precision integers instead and the multiplications themselves grow with the digit count, so the linear step count stops being the whole story.',
        },
        {
          kind: 'prose',
          body:
            'Choose with the input shape and runtime in mind. A balanced binary tree with a million nodes needs only about twenty frames for a depth-first walk; a skewed tree can need a frame per node. Even shallow recursion uses stack space, so check the actual runtime rather than promising a universally safe depth. A loop fits work whose depth would follow the length of the input, which is every list traversal in this path. Converting a list recursion into a loop costs two variables and buys back the whole stack.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d06-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: base case, recursive case, termination',
      summary: 'The two halves of a recursive definition, unreachable base cases, and engine-dependent stack exhaustion.',
      competencies: ['recursion'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d06-l1',
    },
    {
      id: 'dsa-v1-d06-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: what recursion costs',
      summary: 'Call counts versus peak frames, a descent-and-unwinding trace, and a loop without a growing call stack.',
      competencies: ['recursion', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d06-l2',
    },
    {
      id: 'dsa-v1-d06-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Recursion checks',
      summary: 'Four questions: an unreachable base case, the depth of a halving recursion, time against stack space, and factorial growth against factorial cost.',
      competencies: ['recursion', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d06-q1',
          prompt: 'In an engine without tail-call elimination, such as V8, `countDown(10)` returns `\'done\'`. What happens for `countDown(7)`?',
          context: {
            language: 'javascript',
            code: 'const countDown = n => {\n  if (n === 0) return \'done\';\n  return countDown(n - 2);\n};',
          },
          options: [
            'It skips 0 and keeps making calls. Waiting frames accumulate until the engine reports stack exhaustion instead of returning a value.',
            'It returns `\'done\'` at -1. The engine treats the first negative argument as the base case even though the guard checks equality to 0.',
            'It returns `undefined` at -1. The negative input skips the recursive return statement and falls off the end of the function.',
            'It returns the number -1. When the guard first fails for a negative argument, that argument becomes the return value of the call.',
          ],
          correct: 0,
          explanation:
            'Subtracting 2 preserves the parity of n, so an odd starting value passes 1, then -1, and never equals 0. The base case is unreachable for this odd starting value. Under the stated no-tail-call-elimination model, the growing stack eventually fails; in V8 this is a RangeError. The claim that it stops at -1 invents a rule the code does not have: only `n === 0` returns, and -1 is not 0. Returning undefined would require the recursion to end, but nothing ends it, so no call falls off the end. Returning -1 also assumes a call finishes successfully; there is no successful base-case return, only frames accumulating until the engine refuses another one.',
          competencies: ['recursion'],
        },
        {
          id: 'dsa-v1-d06-q2',
          prompt: 'You call `halvings(1000)`. What is the largest number of `halvings` frames open at the same time, and what is the tightest growth class for that depth as n grows?',
          context: {
            language: 'javascript',
            code: 'const halvings = n => {\n  if (n <= 1) return 0;\n  return 1 + halvings(Math.floor(n / 2));\n};',
          },
          options: [
            '10 frames at the deepest point, and the depth grows as O(log n).',
            '1000 frames at the deepest point, and the depth grows as O(n), because a frame opens for every value between 1000 and 1.',
            '1 frame, because each call finishes and returns before the next one is made, so the stack never holds more than one.',
            '10 frames at the deepest point, but the depth grows as O(n), because the number of frames still depends on n.',
          ],
          correct: 0,
          explanation:
            'The arguments run 1000, 500, 250, 125, 62, 31, 15, 7, 3, 1, which is ten calls, and the tenth one hits the base case while the other nine are still waiting. Depth follows the number of halvings, so it is O(log n): a thousand times more input adds about ten frames. The 1000-frame claim counts every whole number in the range instead of the values actually passed. The one-frame claim describes a loop: the call is made inside the returned expression, so the caller is still open when the callee starts. The ten-frame O(n) claim confuses "depends on n" with "grows like n", which is the distinction the growth class exists to make.',
          competencies: ['recursion', 'complexity'],
        },
        {
          id: 'dsa-v1-d06-q3',
          prompt: 'Both functions sum a finite, acyclic, null-terminated list of n numeric nodes. Under the unit-cost model, assuming enough stack to finish, how do their time and auxiliary space compare?',
          context: {
            language: 'javascript',
            code: 'const totalA = head => (head === null ? 0 : head.value + totalA(head.next));\n\nconst totalB = head => {\n  let total = 0;\n  for (let node = head; node !== null; node = node.next) total += node.value;\n  return total;\n};',
          },
          options: [
            'Both run in O(n) time. A needs O(n) stack space, because n + 1 frames are open at the deepest point; B needs O(1).',
            'Both run in O(n) time and both need O(1) auxiliary space, because neither one builds an array or copies the list.',
            'A runs in O(n²) time because each call walks the rest of the list again; B runs in O(n).',
            'Both run in O(n) time and both need O(n) auxiliary space, because a loop also has to keep every node it has visited.',
          ],
          correct: 0,
          explanation:
            'Each function touches every node once and does a fixed amount of work there, so both are linear in time. A keeps a frame open for every call that is still waiting on the one it made, and the deepest point is n + 1 frames, so its auxiliary space is linear. B keeps a total and one reference. The claim that both use O(1) space is the common trap: the stack is memory the routine uses even though the body allocates nothing. The O(n²) claim misreads the recursive call, which advances one node rather than rescanning. The claim that the loop needs O(n) extra storage invents state it does not keep — `node` is reassigned, and the node it moved off is not retained by the loop.',
          competencies: ['recursion', 'complexity'],
        },
        {
          id: 'dsa-v1-d06-q4',
          prompt: 'Treat n as a variable nonnegative integer and count each multiplication as one step, ignoring Number range limits. What is the tightest growth class of the multiplication count in `factorial(n)`?',
          context: {
            language: 'javascript',
            code: 'const factorial = n => {\n  let product = 1;\n  for (let i = 2; i <= n; i += 1) product *= i;\n  return product;\n};',
          },
          options: [
            'O(n): for n at least 2, the loop performs n - 1 multiplications, even though the returned value grows factorially.',
            'O(n!): the running time follows the value being computed, so the work and the result grow together.',
            'O(1): the loop body is a single multiplication, and one operation is constant work.',
            'O(2ⁿ): the product at least doubles at every step from i = 2 onwards, so the work doubles with it.',
          ],
          correct: 0,
          explanation:
            'The loop runs once per value from 2 to n, which is n - 1 multiplications for n of 2 or more and none at all for 0 or 1, each one step under the stated model. That is linear. The size of a result says nothing about how many steps produced it, which rules out O(n!): 20! is a nineteen-digit number reached in nineteen multiplications. O(1) prices the loop body instead of the loop. O(2ⁿ) confuses the growth of the product with the growth of the work: from i = 2 the product at least doubles, but the multiplication count increases by one. This is an operation-count model, not a promise of exact Number results for arbitrary n; the coding exercise bounds n at 20.',
          competencies: ['complexity', 'recursion'],
        },
      ],
    },
    {
      id: 'dsa-v1-d06-recursive-list-sum',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Sum a list recursively',
      summary: 'Add up a linked list with the empty list as the only base case, and prove the shape through a counted call budget.',
      competencies: ['recursion', 'linked-lists'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "A node is a plain object `{ value, next }`. `next` holds the node after it, the last node's `next` is `null`, and a list is its head node or `null` when empty.\n\nWrite `sumList(head)`, returning the sum of every value in the list. `sumList(null)` is 0, a one-node list gives that node's value, and negative values and zeros count like any other number. Leave the list as you found it: no node changes and no node is added or removed. Lists are finite, acyclic and null-terminated, with at most 100 nodes. Values are finite Numbers with absolute value at most 1000000. Add in the recursive order `head.value + sumList(head.next)`, without rounding; fractional Number additions follow that order.\n\nDo it recursively, with the empty list as the only base case. The grade replaces the `sumList` binding with a wrapper that counts every call, including the calls the function makes on itself, and expects one call per node plus one final call that receives `null`: four nodes means five calls. A loop makes one call and fails that check; a second base case for the last node makes one call too few and fails it as well.\n\nTarget: O(n) time and O(n) extra space from waiting recursive frames, where n is the number of list nodes under constant-cost field reads and Number addition. Empty input is constant work; the finite call counter does not measure memory.",
        contract: [
          'Recurse on `sumList` itself. A nested helper function that does the walking is not counted, because the wrapper only sees calls to `sumList`.',
          'Use exactly one base case: `head === null` returns 0. The graded count is the number of nodes plus one.',
          'Declare `sumList` with the `function` keyword, as the starter does. The grader replaces that binding before the assertions run, and a `const` binding cannot be replaced, so the recursion check would report no calls at all.',
          'Do not modify the list, and do not collect the values into an array first.',
        ],
        starter: `function sumList(head) {

}

// Scratch pad — change this before submitting.
console.log(sumList({ value: 1, next: { value: 2, next: null } }));
`,
        skeleton: `function sumList(head) {
  if (/* the list is empty */) return /* the sum of no values at all */;

  return /* the value in this node */ + /* the sum of the rest, from this same function */;
}`,
        hints: [
          'The empty list is the base case and its sum is 0. Every other list is one value plus a shorter list, and `head.next` is exactly that shorter list.',
          'Assume the recursive call already returns the correct sum of everything after `head`. Then the only decision left is what to add to it.',
          'Resist a second base case for the last node. `head.next` on the last node is `null`, which the empty-list branch already answers, and the extra branch costs you a call the grade is counting.',
        ],
        approach: [
          'Return 0 when `head` is `null`: an empty list has nothing to add.',
          'Otherwise read `head.value` from the node in hand.',
          'Call `sumList` on `head.next`, which is the same list without its first node.',
          'Return `head.value` plus whatever that call gave back.',
          'Check the count: n nodes produce n calls holding a node and one final call holding `null`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct sum, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty list, a single node, negative values, zeros, and that the list is unchanged afterwards.',
          },
          {
            id: 'recursive',
            label: 'One call per node, plus one for the empty tail',
            critical: true,
            weight: 2,
            detail:
              'The grader wrapped `sumList` and counted every call. A loop produces one call. A second base case for the last node produces one too few. A `const` binding cannot be wrapped and reports none at all, which is why the contract asks for the `function` form.',
          },
        ],
        tests: [
          { call: 'sumList(__build([1, 2, 3]))', expected: 6 },
          { call: 'sumList(null)', expected: 0, label: 'an empty list sums to zero', edge: true },
          { call: 'sumList(__build([7]))', expected: 7, label: 'a single node is its own sum', edge: true },
          { call: 'sumList(__build([-4, 4, -2]))', expected: -2, label: 'negative values count', edge: true },
          { call: 'sumList(__build([0, 0, 0]))', expected: 0, label: 'three zeros are not an empty list', edge: true },
          {
            call: '__callsToSum([1, 2, 3, 4])',
            expected: 5,
            label: 'four nodes take five calls',
            criterion: 'recursive',
          },
          {
            call: '__callsToSum([])',
            expected: 1,
            label: 'an empty list is one call and no deeper',
            criterion: 'recursive',
            edge: true,
          },
        ],
        harness: SUM_PROBE,
      },
    },
    {
      id: 'dsa-v1-d06-bounded-factorial',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Factorial with exact results',
      summary: 'Count the work separately from result growth, with exact Number results for inputs 0 through 20.',
      competencies: ['recursion', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          "Write `factorial(n)`, returning the product of every whole number from 1 to n. `factorial(5)` is 120, `factorial(1)` is 1, and `factorial(0)` is 1 because the product of no numbers at all is 1.\n\nThe caller guarantees a whole number from 0 to 20 inclusive, so you do not have to validate it. That bound is about the result, not the method: 18! is 6402373705728000, the last factorial below `Number.MAX_SAFE_INTEGER` (9007199254740991). 19! and 20! are past that mark and still come out exactly, and 23! comes back wrong, so this exercise uses a bounded domain whose expected results are all exactly representable.\n\nRecursion or a loop, whichever you prefer. The loop from 2 through n uses n - 1 multiplications for n of 2 or more; the recursive form with a base case at 0 uses n. Both have a linear multiplication count in the usual variable-n, unit-cost model. The actual Number exercise remains bounded at 20. Only the number it returns grows factorially, and confusing the two is the mistake this exercise exists to prevent.\n\nTarget: O(n) time in the numeric input n under the variable-n, unit-cost multiplication model. The actual accepted Number inputs remain 0 through 20; a loop and the allowed recursion have different auxiliary stack costs.",
        contract: [
          'The input is a whole number from 0 to 20 inclusive; no validation is required.',
          '`factorial(0)` and `factorial(1)` are both 1, because an empty product is 1 rather than 0.',
          'Return a `Number`, not a string and not a BigInt.',
          'Recursive and iterative solutions are both accepted; the grade reads the returned value.',
        ],
        starter: `function factorial(n) {

}

// Scratch pad — change this before submitting.
console.log(factorial(5));
`,
        skeleton: `function factorial(n) {
  let product = /* the product of no numbers yet */;

  for (/* every whole number from 2 up to n */) {
    // multiply the running product by it
  }

  return product;
}`,
        hints: [
          'What value should a product have before any factor is included? It must leave the next factor unchanged, and it must already answer inputs 0 and 1.',
          'Recursively it is `n * factorial(n - 1)` with `n === 0` returning 1. That makes n + 1 calls and opens n + 1 frames, which is fine at n = 20 and is the reason the next exercise is written as a loop.',
          'Count the operations in your chosen form. A loop starting at 2 uses n - 1 multiplications for n >= 2; a recursion that multiplies down to a base case at 0 uses n. Both counts grow linearly in the model.',
        ],
        approach: [
          'Start a product at 1, which is already the answer for 0 and for 1.',
          'Walk the whole numbers from 2 up to and including n.',
          'Multiply the running product by each of them.',
          'Return the product once the walk ends.',
        ],
        tests: [
          { call: 'factorial(0)', expected: 1, label: 'zero factorial is one', edge: true },
          { call: 'factorial(1)', expected: 1, label: 'one is the smallest ordinary case', edge: true },
          { call: 'factorial(5)', expected: 120 },
          { call: 'factorial(10)', expected: 3628800 },
          {
            call: 'factorial(18)',
            expected: 6402373705728000,
            label: 'the last factorial below Number.MAX_SAFE_INTEGER',
          },
          {
            call: 'factorial(20)',
            expected: 2432902008176640000,
            label: 'the top of the stated range, in nineteen multiplications',
            edge: true,
          },
        ],
      },
    },
    {
      id: 'dsa-v1-d06-iterative-countdown',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Countdown without a stack',
      summary: 'Build a fresh countdown from n to 0 with a loop, for inputs through 10000.',
      competencies: ['recursion', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "Write `countdownSteps(n)`, returning the array `[n, n - 1, ..., 1, 0]`. `countdownSteps(3)` gives `[3, 2, 1, 0]` and `countdownSteps(0)` gives `[0]`, so the array always holds n + 1 numbers. Return a fresh array on every call.\n\nBuild it iteratively, in a constant number of stack frames. n runs from 0 to 10000. Ordinary recursion can use a frame per step and exhaust the available stack. The failure depth and error type depend on the engine and existing stack; there is no portable safe-depth cutoff.\n\nThe grade replaces the `countdownSteps` binding with a wrapper that counts every call and expects exactly one call for one invocation. A loop produces one. Recursion through `countdownSteps` produces more. This counter does not see separately named helpers, so it is bounded evidence about these calls, not a proof that arbitrary code uses constant stack. Recursive helpers do not meet the requested iterative method.\n\nTarget: O(n) time, where n is the starting numeric bound and the result holds n + 1 fixed-size Numbers. Under the usual amortized append model the output uses O(n) space while an iterative implementation needs constant auxiliary stack; zero is constant work.",
        contract: [
          'One call does the whole job: no recursion, and no helper that calls `countdownSteps` again.',
          'The array runs from n down to 0 inclusive, so its length is n + 1 and its last entry is 0.',
          'n is a whole number from 0 to 10000 inclusive; no validation is required.',
          'Declare `countdownSteps` with the `function` keyword, as the starter does. The grader replaces that binding before the assertions run, and a `const` binding cannot be replaced, so the stack check would report no calls at all.',
        ],
        starter: `function countdownSteps(n) {

}

// Scratch pad — change this before submitting.
console.log(countdownSteps(3));
`,
        skeleton: `function countdownSteps(n) {
  const out = /* an empty array to fill */;

  for (/* a counter starting at n and stopping below 0 */) {
    // append the counter to the array
  }

  return out;
}`,
        hints: [
          'Count downwards in the loop itself: start at n, stop once the counter goes below 0, and subtract one each time. Appending in that order needs no reversal afterwards.',
          'The stopping condition is `>= 0`, not `> 0`. Stopping at 1 leaves the final 0 out and makes the length n instead of n + 1.',
          'No recursive calls are needed: keep one counter and append to one result array. The result uses O(n) space even though the loop uses constant auxiliary stack space.',
        ],
        approach: [
          'Create an empty array to collect the numbers.',
          'Start a counter at n.',
          'While the counter is 0 or more, append it and subtract one.',
          'Return the array, which now holds n + 1 numbers ending in 0.',
          'Confirm the shape: `countdownSteps(0)` returns `[0]`, not an empty array.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct countdown, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check n = 0, n = 1, the length at n + 1, the final 0, and a fresh array on every call.',
          },
          {
            id: 'no-recursion',
            label: 'One observed call through countdownSteps',
            critical: true,
            weight: 2,
            detail:
              'The grader wrapped `countdownSteps` and counted every call. One invocation must produce exactly one observed call through this binding. Recursion through a different helper is not counted; the finite checks do not prove an arbitrary program uses constant stack. A `const` binding cannot be wrapped and reports none at all, which is why the contract asks for the `function` form.',
          },
        ],
        tests: [
          { call: 'countdownSteps(3)', expected: [3, 2, 1, 0] },
          { call: 'countdownSteps(0)', expected: [0], label: 'zero still produces one entry', edge: true },
          { call: 'countdownSteps(1)', expected: [1, 0], label: 'the smallest real countdown', edge: true },
          {
            call: '(() => { const out = countdownSteps(10000); return [out.length, out[0], out[5000], out[10000]]; })()',
            expected: [10001, 10000, 5000, 0],
            label: 'ten thousand steps, checked at both ends and in the middle',
          },
          {
            call: '__stepsDownByOne(countdownSteps(200))',
            expected: true,
            label: 'every entry is one less than the entry before it',
          },
          {
            call: '__callsToCountdown(5)',
            expected: 1,
            label: 'the whole array comes from a single call',
            criterion: 'no-recursion',
          },
          {
            call: '__callsToCountdown(0)',
            expected: 1,
            label: 'n = 0 is one call as well',
            criterion: 'no-recursion',
            edge: true,
          },
        ],
        harness: COUNTDOWN_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d06-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d06-recursive-list-sum', state: 'verified_pass' },
    { activityId: 'dsa-v1-d06-bounded-factorial', state: 'verified_pass' },
    { activityId: 'dsa-v1-d06-iterative-countdown', state: 'verified_pass' },
  ],
};
