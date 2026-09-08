/** D04 — Stacks and queues.
 *
 * Two access disciplines and the price of the representation underneath them.
 * The first lesson traces a stack and a queue frame by frame; the second costs
 * the array operations they are usually built on, including the honest part
 * nobody mentions: a head-index queue does not reclaim the slots it leaves
 * behind until you compact it.
 *
 * The queue exercise is graded on method. The learner stores values in a
 * buffer the harness hands them — a proxied array with `push`, `length` and
 * index access and nothing else — and the grade counts element reads and
 * writes. That is a bounded contract about this routine on these inputs, not
 * a proof about arbitrary code. */

import type { ModuleSource } from '../../types';

/** Hands the learner a counted buffer and measures one full round trip
 * through their queue. The buffer is a Proxy over a plain array: index reads
 * and writes are counted, `push` is counted once per call, and the
 * element-moving methods are simply absent, so `shift` cannot be reached and
 * a hand-written slide shows up in the counter. Appended after the learner's
 * code, so it cannot be shadowed. */
const QUEUE_PROBE = `
var __bufferOps = 0;
var __buffersMade = 0;
var newQueueBuffer = function () {
  var data = [];
  __buffersMade += 1;
  return new Proxy(data, {
    get: function (target, prop) {
      if (typeof prop === 'string' && /^[0-9]+$/.test(prop)) {
        __bufferOps += 1;
        return target[prop];
      }
      if (prop === 'length') return target.length;
      if (prop === 'push') {
        return function (value) {
          __bufferOps += 1;
          target[target.length] = value;
          return target.length;
        };
      }
      return undefined;
    },
    set: function (target, prop, value) {
      if (typeof prop === 'string' && /^[0-9]+$/.test(prop)) __bufferOps += 1;
      target[prop] = value;
      return true;
    },
  });
};
var __measureQueue = function (n) {
  __bufferOps = 0;
  __buffersMade = 0;
  var queue = createQueue();
  for (var i = 0; i < n; i += 1) queue.enqueue(i);
  var out = [];
  for (var j = 0; j < n; j += 1) out.push(queue.dequeue());
  return { out: out, size: queue.size(), ops: __bufferOps, buffers: __buffersMade };
};
`.trim();

export const DSA_D04: ModuleSource = {
  id: 'dsa-v1-d04',
  title: 'Stacks and queues',
  outcomes: [
    'Predict what a stack and a queue hand back for a given sequence of operations, and say which end each one touches.',
    'Cost a queue by its representation: why an array `shift` makes draining quadratic and a head index does not.',
    'State the underflow contract and the memory tradeoff of the structure you built, instead of leaving either to chance.',
  ],
  competencies: ['stacks-queues', 'complexity'],
  dependsOn: ['dsa-v1-d02'],
  estimatedMinutes: 120,
  lessons: [
    {
      id: 'dsa-v1-d04-l1',
      title: 'LIFO and FIFO as access disciplines',
      summary: 'Two structures that are defined by what they refuse to let you touch, traced step by step.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Array.prototype.push',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A stack and a queue are not containers so much as rules about which end you may touch. Both hold a sequence. Both let you add one value and take one back. They differ in exactly one place: which value they are willing to give you.',
        },
        {
          kind: 'prose',
          body:
            'A stack is last in, first out. You add at one end and you remove from that same end, so the value you get back is always the one you added most recently. Three operations name it: `push` adds, `pop` removes and returns, `peek` reports what `pop` would return without removing it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const createStack = () => {\n  const items = [];\n  return {\n    push: value => { items.push(value); },\n    pop: () => (items.length === 0 ? null : items.pop()),\n    peek: () => (items.length === 0 ? null : items[items.length - 1]),\n    size: () => items.length,\n  };\n};',
          caption: 'A stack over an array: both `push` and `pop` work on the end, and no other element moves.',
        },
        {
          kind: 'trace',
          caption: 'Three pushes then two pops. Cells run bottom to top, so the rightmost cell is the top of the stack.',
          trace: {
            shape: 'stack',
            frames: [
              {
                cells: ['A'],
                marks: [{ index: 0, role: 'active' }],
                note: 'push(\'A\') puts A on an empty stack. It is the only value, so it is also the top.',
              },
              {
                cells: ['A', 'B'],
                marks: [{ index: 1, role: 'active' }],
                note: 'push(\'B\') puts B above A. B is the top, and A cannot be read again until B leaves.',
              },
              {
                cells: ['A', 'B', 'C'],
                marks: [{ index: 2, role: 'active' }],
                note: 'push(\'C\') makes C the top. Three values are held and only one of them is reachable.',
              },
              {
                cells: ['A', 'B', 'C'],
                marks: [{ index: 2, role: 'compare' }],
                note: 'peek() reports C and changes nothing: the stack still holds all three values.',
              },
              {
                cells: ['A', 'B'],
                marks: [{ index: 1, role: 'active' }],
                note: 'pop() removes C and returns it. B is the top again, exactly as it was before C arrived.',
              },
              {
                cells: ['A'],
                marks: [{ index: 0, role: 'active' }],
                note: 'pop() removes B and returns it. A is the top, and one more pop would leave the stack empty.',
              },
            ],
          },
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Underflow is popping an empty stack, and every implementation has to decide what that does. Throwing and returning a sentinel are both defensible; leaving it undefined is not. This module returns `null`, which is ambiguous when `null` is itself a stored value — `size()` is what tells the two apart. Pick one rule and write it down.',
        },
        {
          kind: 'prose',
          body:
            'A queue is first in, first out. You add at the back and remove from the front, so the value you get back is the one that has waited longest. The operations are `enqueue`, `dequeue` and a reader for the front value.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// The interface, without committing to a representation yet.\nconst queue = createQueue();\nqueue.enqueue(\'first\');\nqueue.enqueue(\'second\');\n\nqueue.dequeue(); // \'first\' — it arrived first\nqueue.size();    // 1',
          caption: 'A queue serves in arrival order, whatever it stores its values in.',
        },
        {
          kind: 'trace',
          caption: 'Three arrivals, one departure, one more arrival. Cells run front to back, so the leftmost cell leaves next.',
          trace: {
            shape: 'queue',
            frames: [
              {
                cells: ['A'],
                marks: [{ index: 0, role: 'active' }],
                note: 'enqueue(\'A\') puts A at the back of an empty queue, which makes A the front as well.',
              },
              {
                cells: ['A', 'B'],
                marks: [{ index: 0, role: 'active' }],
                note: 'enqueue(\'B\') puts B behind A. The front is still A, because A arrived first.',
              },
              {
                cells: ['A', 'B', 'C'],
                marks: [{ index: 0, role: 'active' }],
                note: 'enqueue(\'C\') puts C at the back. Arrival order and departure order are the same list.',
              },
              {
                cells: ['B', 'C'],
                marks: [{ index: 0, role: 'active' }],
                note: 'dequeue() removes A and returns it. B has waited longest now, so B becomes the front.',
              },
              {
                cells: ['B', 'C', 'D'],
                marks: [{ index: 0, role: 'active' }],
                note: 'enqueue(\'D\') joins the back while B keeps its place at the front. Arriving never overtakes.',
              },
              {
                cells: ['C', 'D'],
                marks: [{ index: 0, role: 'active' }],
                note: 'dequeue() returns B. C leaves next and D after it, in the order the two of them arrived.',
              },
            ],
          },
        },
        {
          kind: 'table',
          caption: 'The same two questions asked of both structures.',
          headers: ['Question', 'Stack', 'Queue'],
          rows: [
            ['Which end accepts a value', 'The top, with `push`', 'The back, with `enqueue`'],
            ['Which end gives one back', 'The top, with `pop`', 'The front, with `dequeue`'],
            ['Which value leaves first', 'The one added most recently', 'The one that has waited longest'],
            ['Reading without removing', '`peek` reports the top', 'A front reader reports the head'],
            [
              'Where you meet it',
              'Undo history, bracket matching, depth-first traversal',
              'Task queues, buffering, level-order traversal',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'Both structures need a size, and both need it for the same reason: it is the guard that keeps a reader from asking for a value that is not there. Check the size before you pop, or make `pop` do the check itself, but do not skip it and read whatever the underlying array hands back.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The restriction is the feature. Once you index into the middle of a stack, you have an array with extra steps, and the reasoning the discipline bought you is gone. That reasoning is what a stack is for: bracket matching is correct because the only opener you can reach is the most recent one, and no other invariant is needed to prove it.',
        },
        {
          kind: 'prose',
          body:
            'Neither structure says anything about memory yet. A stack could sit on an array, a linked list or a fixed block; a queue could sit on any of those or on a ring buffer. The interface fixes which end you touch. The representation fixes what touching it costs, and that is the next lesson.',
        },
      ],
    },
    {
      id: 'dsa-v1-d04-l2',
      title: 'What the representation costs',
      summary: 'Amortised constant appends, the linear price of removing from the front, and the memory a head-index queue holds on to.',
      estimatedMinutes: 20,
      sources: [
        {
          label: 'MDN — Array.prototype.shift',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift',
          reviewedOn: '2026-09-08',
        },
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-09-08' },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A stack on an array is cheap because both of its operations work on the end. `push` writes one slot past the last one; `pop` reads the last slot and forgets it. No other element is touched, so neither cost depends on how many values are already there.',
        },
        {
          kind: 'prose',
          body:
            'The one wrinkle is growth. A growable array holds a block with spare capacity, and when the spare runs out it allocates a larger block and copies everything across. That copy is linear in the current length, so an individual `push` is not constant. Doubling the capacity keeps the copies rare enough that a run of n pushes costs O(n) in total, which is what "amortised constant" claims.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Amortised is a statement about a sequence, not about a single call. It says n pushes cost O(n) between them, so the average is constant. It does not say every push is cheap, and in a system where one slow call matters more than the total — a frame budget, an audio callback — the average is the wrong number to quote.',
        },
        {
          kind: 'prose',
          body:
            'The front of an array is a different story. `shift` returns the element at index 0 and then moves every later element down one slot, because index 1 has to become index 0 for the array to still be an array. That is linear in the current length, and the one-word call gives no hint of it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Correct FIFO behaviour, and quadratic to drain.\nconst createShiftQueue = () => {\n  const items = [];\n  return {\n    enqueue: value => { items.push(value); },\n    dequeue: () => (items.length === 0 ? null : items.shift()),\n    size: () => items.length,\n  };\n};',
          caption: 'The obvious queue. `enqueue` is amortised constant; `dequeue` moves every remaining element.',
        },
        {
          kind: 'trace',
          caption: 'One `shift` on a four-element queue, counting the elements it moves.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['A', 'B', 'C', 'D'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The queue holds four values. dequeue() takes A, the element at index 0, and returns it.',
                counter: { label: 'Element moves', value: 0 },
              },
              {
                cells: ['B', 'B', 'C', 'D'],
                marks: [{ index: 0, role: 'active' }, { index: 1, role: 'compare' }],
                note: 'B moves from index 1 down to index 0. That is one element moved, and A is now overwritten.',
                counter: { label: 'Element moves', value: 1 },
              },
              {
                cells: ['B', 'C', 'C', 'D'],
                marks: [{ index: 1, role: 'active' }, { index: 2, role: 'compare' }],
                note: 'C moves from index 2 down to index 1. Two elements have moved for one removal.',
                counter: { label: 'Element moves', value: 2 },
              },
              {
                cells: ['B', 'C', 'D', 'D'],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'D moves from index 3 down to index 2. Three elements have moved, one for each survivor.',
                counter: { label: 'Element moves', value: 3 },
              },
              {
                cells: ['B', 'C', 'D'],
                note: 'The array drops its last slot and the removal is done. Removing one value from a queue of four cost three moves, so a queue of k costs about k.',
                counter: { label: 'Element moves', value: 3 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Add those up over a full drain. Dequeuing from a queue of n costs about n moves, then n − 1, then n − 2, down to 1. The sum is n(n − 1)/2, roughly n²/2, so emptying the queue is O(n²) even though every individual call looks like one operation. Ten thousand messages is fifty million element moves.',
        },
        {
          kind: 'prose',
          body:
            'The fix is to stop moving elements. Keep the values where they are and remember where the front is instead: a head index that starts at 0 and only ever goes up. `dequeue` reads the slot the head points at, then adds one to the head. Nothing else in the array changes.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const createQueue = () => {\n  const items = [];\n  let head = 0;\n\n  return {\n    enqueue: value => { items.push(value); },\n    dequeue: () => {\n      if (head >= items.length) return null;\n      const value = items[head];\n      items[head] = null; // release the reference, not the slot\n      head += 1;\n      return value;\n    },\n    size: () => items.length - head,\n  };\n};',
          caption: 'A head-index queue: one slot read, one index bumped, whatever the queue length.',
        },
        {
          kind: 'prose',
          body:
            'Every operation here is constant, `enqueue` amortised so. `size()` is `items.length - head`, one subtraction. The queue is empty when the head has caught up with the end, which is the condition `dequeue` checks before it reads anything.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The memory is the honest part. Those slots before the head stay in the array. A queue that has handled a million messages holds a million-slot array even when two values are waiting, because nothing ever removed the first 999,998 slots. Writing `null` into a slot you have read releases the value it pointed at, so the value can be collected — but the slot itself stays.',
        },
        {
          kind: 'prose',
          body:
            'Compaction is what actually reclaims it: when the head passes some threshold, copy the live tail into a fresh array and reset the head to 0. One compaction costs O(live). Triggering it when the head reaches half the array length keeps the total copying linear in the number of dequeues, so the amortised cost per dequeue stays constant. A fixed-capacity ring buffer solves the same problem differently, by wrapping the indices around instead of growing.',
        },
        {
          kind: 'table',
          caption: 'What each operation costs, by where it touches the array.',
          headers: ['Operation', 'Array end', 'Array front', 'Head-index queue'],
          rows: [
            ['Add one value', 'Amortised O(1) with `push`', 'O(n) with `unshift`: every element moves up', 'Amortised O(1) at the back'],
            ['Remove one value', 'O(1) with `pop`', 'O(n) with `shift`: every survivor moves down', 'O(1): read a slot, bump the head'],
            ['Report the size', 'O(1)', 'O(1)', 'O(1): length minus head'],
            ['Memory held', 'Tracks the live values', 'Tracks the live values', 'Tracks total enqueues until you compact'],
          ],
        },
        {
          kind: 'prose',
          body:
            'So there is no free representation, only a choice about which cost you can afford. A short queue drained inside one function will not notice `shift`. A long-lived queue behind a worker will notice both the quadratic drain and the array that never shrinks, and the head index plus compaction answers each of them separately.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d04-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: LIFO and FIFO as access disciplines',
      summary: 'What each structure lets you touch, traced frame by frame, and what underflow has to do.',
      competencies: ['stacks-queues'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d04-l1',
    },
    {
      id: 'dsa-v1-d04-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: what the representation costs',
      summary: 'Amortised appends, the linear cost of `shift`, and the memory a head-index queue keeps until you compact.',
      competencies: ['stacks-queues', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d04-l2',
    },
    {
      id: 'dsa-v1-d04-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Stack and queue checks',
      summary: 'Four questions: what each discipline hands back, why a shift-based queue drains quadratically, what amortised claims, and what a head index holds on to.',
      competencies: ['stacks-queues', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d04-q1',
          prompt: 'Both structures receive A, then B, then C, and are then read twice. What do `fromStack` and `fromQueue` hold?',
          context: {
            language: 'javascript',
            code: "const stack = createStack();\nconst queue = createQueue();\n\nfor (const value of ['A', 'B', 'C']) {\n  stack.push(value);\n  queue.enqueue(value);\n}\n\nconst fromStack = [stack.pop(), stack.pop()];\nconst fromQueue = [queue.dequeue(), queue.dequeue()];",
          },
          options: [
            "fromStack is ['C', 'B'] and fromQueue is ['A', 'B']",
            "fromStack is ['A', 'B'] and fromQueue is ['C', 'B']",
            "fromStack is ['C', 'B'] and fromQueue is ['C', 'B']",
            "fromStack is ['A', 'B'] and fromQueue is ['A', 'B']",
          ],
          correct: 0,
          explanation:
            'A stack removes from the end it was written to, so C comes back first and B follows it. A queue removes from the opposite end, so A leaves first and B follows. Answering C then B for both treats the queue as a stack; answering A then B for both treats the stack as a queue; swapping the two pairs gets each structure exactly backwards. The three values go in the same order either way — the difference is only which end gives them back.',
          competencies: ['stacks-queues'],
        },
        {
          id: 'dsa-v1-d04-q2',
          prompt: 'A queue is built on a plain array: `enqueue` calls `push`, `dequeue` calls `shift`. n values go in and all n come back out. What does draining it cost in total, and why?',
          options: [
            'O(n²), because each `shift` moves every remaining element down one slot, and n + (n − 1) + … + 1 moves add up to about n²/2.',
            'O(n), because `shift` removes exactly one element per call and there are n calls.',
            'O(n log n), because `shift` has to re-index the array and re-indexing costs a logarithmic pass.',
            'O(n²), because `push` copies the whole array into a larger block every time the queue grows.',
          ],
          correct: 0,
          explanation:
            '`shift` returns the first element and then moves every later element down one slot, so a queue holding k values pays about k moves for one removal. Summing k from n down to 1 gives n(n − 1)/2, which is the quadratic family. Counting one removal per call ignores the moves that removal forces on everything behind it. There is no halving anywhere in `shift`, so nothing here is logarithmic. And `push` is not the culprit: a growable array doubles its capacity, so its copies amortise to constant work per push.',
          competencies: ['stacks-queues', 'complexity'],
        },
        {
          id: 'dsa-v1-d04-q3',
          prompt: 'Appending to a growable array is described as amortised constant time. What is that claim?',
          options: [
            'A run of n appends costs O(n) in total, so the average is constant — while the individual append that triggers a resize copies every element and is linear.',
            'Every individual append runs in a fixed number of steps, because the array is allocated at its final size up front.',
            'The average is taken across many programs, so any one program can still see linear cost on every append.',
            'It is an average measured by benchmarking rather than a claim about counted steps.',
          ],
          correct: 0,
          explanation:
            'Amortised analysis spreads the cost of the occasional expensive operation over the cheap ones in the same sequence. Doubling the capacity keeps the total copying below the number of appends, so n appends cost O(n) and each averages out to constant work — but the append that triggers the copy really does touch every element already there. No engine allocates the final size up front, because it cannot know what that is. The average is over one sequence of operations, not over a population of programs. And it is a count of steps, not a stopwatch reading: timing measures the machine, and this claim is about growth.',
          competencies: ['stacks-queues', 'complexity'],
        },
        {
          id: 'dsa-v1-d04-q4',
          prompt: 'A queue stores its values in an array and never removes them: `dequeue` reads the slot at a head index, then advances the head. What does that representation cost?',
          options: [
            'The array keeps every slot it has ever used, so memory tracks the total number of enqueues rather than the current size, until you compact it.',
            'Nothing extra: advancing the head releases the earlier slots, so the array shrinks as values leave.',
            '`dequeue` becomes linear, because the head index has to be recovered by scanning from the start of the array.',
            '`size()` becomes linear, because the values still waiting have to be counted from the head to the end.',
          ],
          correct: 0,
          explanation:
            'Advancing an index shrinks nothing. The slots before the head stay in the array, so a queue that has handled a million messages holds a million-slot array even when two values are waiting. Writing `null` into a dequeued slot releases the value it referenced, but the slot itself stays until you copy the live tail into a fresh array and reset the head. Neither operation gets slower along the way: `dequeue` reads one slot and adds one to a stored index, and `size()` is `length − head`, a single subtraction.',
          competencies: ['stacks-queues'],
        },
      ],
    },
    {
      id: 'dsa-v1-d04-stack-api',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'A stack with a stated underflow rule',
      summary: 'Build push, pop, peek and size over a private array, and decide in code what an empty stack returns.',
      competencies: ['stacks-queues'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'Write `createStack()`, returning an object with four methods:\n\n- `push(value)` puts a value on top. Its return value is never read.\n- `pop()` removes the top value and returns it.\n- `peek()` returns the top value and leaves the stack unchanged.\n- `size()` returns how many values the stack holds.\n\nThe underflow contract: `pop()` and `peek()` on an empty stack return `null` and leave it empty, and `size()` never goes below 0. Two stacks made by two calls to `createStack()` hold their own values and never share.\n\n`null` is a legal value to push, so a `null` from `pop()` cannot on its own mean the stack was empty — `size()` is what separates the two cases.',
        contract: [
          'Every call to `createStack()` returns a fresh stack with its own storage.',
          '`pop()` and `peek()` return `null` on an empty stack rather than throwing or returning `undefined`.',
          '`peek()` and `size()` leave the stack exactly as they found it.',
        ],
        starter: `const createStack = () => {

};

// Scratch pad — change this and press Run.
const stack = createStack();
stack.push(1);
stack.push(2);
console.log(stack.pop(), stack.size());
`,
        skeleton: `const createStack = () => {
  const items = /* the values, bottom first */;

  return {
    push(value) {
      // put the value on the end that pop reads
    },
    pop() {
      // null when there is nothing to remove
    },
    peek() {
      // what pop would return, without removing it
    },
    size() {
      /* ... */
    },
  };
};`,
        hints: [
          'Hold the values in an array declared inside `createStack`, so each call gets its own. The end of that array is the top: `push` appends there and `pop` removes from there, and no other element moves.',
          'Guard both readers with the same emptiness check. An empty array hands back `undefined`, and the contract asks for `null`.',
        ],
        approach: [
          'Declare an array inside `createStack` so every call gets separate storage.',
          'Return an object whose four methods close over that array.',
          'Append in `push`, and remove from the same end in `pop`.',
          'Return `null` from `pop` and `peek` when the array is empty.',
          'Report the array length from `size`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Last in, first out, on a private stack',
            critical: true,
            weight: 3,
            detail: 'Check the order values come back in, that `peek` removes nothing, and that two stacks made separately do not share storage.',
          },
          {
            id: 'underflow',
            label: '`pop` and `peek` return null on an empty stack',
            critical: true,
            weight: 2,
            detail: 'An empty array gives back `undefined`, not `null`, and a size counter decremented past zero goes negative. Both readers need the same guard.',
          },
        ],
        tests: [
          {
            call: "(() => { const s = createStack(); s.push('a'); s.push('b'); return [s.pop(), s.pop()]; })()",
            expected: ['b', 'a'],
            label: 'the value pushed most recently comes back first',
          },
          {
            call: '(() => { const s = createStack(); s.push(1); s.push(2); s.push(3); return [s.peek(), s.size()]; })()',
            expected: [3, 3],
            label: 'peek reports the top without removing it',
          },
          {
            call: '(() => { const s = createStack(); return s.pop(); })()',
            expected: null,
            label: 'popping an empty stack returns null',
            edge: true,
            criterion: 'underflow',
          },
          {
            call: '(() => { const s = createStack(); return s.peek(); })()',
            expected: null,
            label: 'peeking an empty stack returns null',
            edge: true,
            criterion: 'underflow',
          },
          {
            call: '(() => { const s = createStack(); s.push(1); s.pop(); s.pop(); return s.size(); })()',
            expected: 0,
            label: 'popping past empty leaves the size at zero',
            edge: true,
            criterion: 'underflow',
          },
          {
            call: '(() => { const a = createStack(); const b = createStack(); a.push(1); a.push(2); b.push(9); return [a.size(), b.size(), b.pop()]; })()',
            expected: [2, 1, 9],
            label: 'two stacks keep their own values',
          },
          {
            call: '(() => { const s = createStack(); s.push(4); s.push(5); s.pop(); s.push(6); return [s.pop(), s.pop(), s.size()]; })()',
            expected: [6, 4, 0],
            label: 'pushes and pops interleave',
          },
        ],
      },
    },
    {
      id: 'dsa-v1-d04-head-index-queue',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'A queue that never moves its elements',
      summary: 'Dequeue by advancing a head index instead of shifting, under a counted budget a shift-based queue cannot meet.',
      competencies: ['stacks-queues', 'complexity'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'Write `createQueue()`, returning an object with three methods:\n\n- `enqueue(value)` adds a value at the back. Its return value is never read.\n- `dequeue()` removes the value at the front and returns it, or `null` when the queue is empty.\n- `size()` returns how many values are waiting.\n\n`dequeue` must not move the values behind the one it removes. `Array.prototype.shift` is out, and so is a hand-written loop that slides them down. Keep a head index instead: read the slot the head points at, then add one to the head.\n\nStore the values in a buffer the grader hands you — call `newQueueBuffer()` where you would otherwise write `[]`. It supports `push(value)`, `length` and index access and nothing else, and it counts every element read and every element write.\n\nThe budget: enqueueing 32 values and then dequeuing all 32 must stay within 192 buffer operations, six per value. A head index costs three per value. Sliding the survivors down on every dequeue costs over a thousand, which is the whole point of the exercise.',
        contract: [
          'Store the values in a buffer from `newQueueBuffer()`; a plain array is not counted and misses the budget.',
          'The buffer offers `push`, `length` and index access only — reaching for `shift` or `splice` throws.',
          'A full round trip of 32 values costs at most 192 buffer operations, so `dequeue` cannot move the remaining values.',
          '`dequeue()` returns `null` on an empty queue, and `size()` never goes below 0.',
        ],
        starter: `const createQueue = () => {
  const items = newQueueBuffer();

};

// Scratch pad — change this and press Run.
const queue = createQueue();
queue.enqueue('a');
queue.enqueue('b');
console.log(queue.dequeue(), queue.size());
`,
        skeleton: `const createQueue = () => {
  const items = newQueueBuffer();
  let head = /* the index of the value at the front */;

  return {
    enqueue(value) {
      // append at the back
    },
    dequeue() {
      // null when the head has caught up with the end
      // otherwise read the slot, release it, and move the head on
    },
    size() {
      /* ... */
    },
  };
};`,
        hints: [
          'Two pieces of state: the buffer and a `head` index starting at 0. The queue is empty when `head` has reached `items.length`, which is the check `dequeue` makes before it reads anything.',
          '`dequeue` reads `items[head]` and then adds one to `head`. Nothing else changes, so the cost does not depend on how many values are waiting.',
          'Write `null` into the slot you just read before advancing the head. The slot stays in the buffer, but the value it referenced can be collected.',
        ],
        approach: [
          'Create the buffer with `newQueueBuffer()` and start a `head` index at 0.',
          'Append in `enqueue` with `items.push(value)`.',
          'In `dequeue`, return `null` when `head` is not below `items.length`.',
          'Otherwise read `items[head]`, clear that slot, add one to `head`, and return the value you read.',
          'Report `items.length - head` from `size()`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'First in, first out, with null on an empty queue',
            critical: true,
            weight: 3,
            detail: 'Check arrival order, an empty queue, a queue drained and then refilled, and two queues that must not share storage.',
          },
          {
            id: 'constant-dequeue',
            label: 'Dequeue leaves the remaining values where they are',
            critical: true,
            weight: 2,
            detail: 'The buffer counter went over six operations per value on a 32-value round trip, or the values never reached the counted buffer. Sliding the survivors down, with `shift` or by hand, lands here.',
          },
        ],
        tests: [
          {
            call: "(() => { const q = createQueue(); q.enqueue('a'); q.enqueue('b'); return [q.dequeue(), q.dequeue()]; })()",
            expected: ['a', 'b'],
            label: 'the value that waited longest comes back first',
          },
          {
            call: '(() => { const q = createQueue(); return [q.size(), q.dequeue()]; })()',
            expected: [0, null],
            label: 'an empty queue reports zero and dequeues null',
            edge: true,
          },
          {
            call: '(() => { const q = createQueue(); q.enqueue(1); q.enqueue(2); q.dequeue(); q.enqueue(3); return [q.size(), q.dequeue(), q.dequeue(), q.size()]; })()',
            expected: [2, 2, 3, 0],
            label: 'enqueues and dequeues interleave',
          },
          {
            call: '(() => { const q = createQueue(); q.enqueue(1); q.dequeue(); q.dequeue(); q.enqueue(2); return [q.size(), q.dequeue()]; })()',
            expected: [1, 2],
            label: 'a queue drained to empty still accepts new values',
            edge: true,
          },
          {
            call: '__measureQueue(6).out',
            expected: [0, 1, 2, 3, 4, 5],
            label: 'six values come back in the order they arrived',
          },
          {
            call: '__measureQueue(32).ops <= 192',
            expected: true,
            label: '32 values cost at most 192 buffer operations',
            criterion: 'constant-dequeue',
          },
          {
            call: '__measureQueue(32).ops >= 32',
            expected: true,
            label: 'the values really are stored in the counted buffer',
            criterion: 'constant-dequeue',
          },
        ],
        harness: QUEUE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d04-balanced-brackets',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Balanced brackets',
      summary: 'Match three kinds of bracket with a stack, where counting them cannot get the answer right.',
      competencies: ['stacks-queues'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'Write `isBalanced(text)`, returning `true` when every bracket in `text` is closed by the matching kind in the right order, and `false` otherwise.\n\n`text` contains only these six characters: `(`, `)`, `[`, `]`, `{`, `}`. No other character ever appears, so there is nothing to skip and nothing to reject. The empty string is balanced.\n\n`([]{})` is balanced. `(]` is not, because a closer has to match the opener it meets. `([)]` is not, because the pairs overlap instead of nesting. `)(` is not, because a closer arrives with nothing open. `(` is not, because an opener is still waiting when the string ends.',
        contract: [
          'The input holds only `()[]{}`, so no other character has to be handled.',
          'The empty string returns `true`.',
          'Counting is not enough: `)(` has one of each character and is unbalanced.',
        ],
        starter: `const isBalanced = text => {

};

// Scratch pad — change this and press Run.
console.log(isBalanced('([]{})'));
`,
        skeleton: `const isBalanced = text => {
  const open = /* the openers still waiting, most recent last */;

  for (const character of text) {
    if (/* it opens */) {
      // remember it
    } else {
      // it closes: the most recent opener has to be its partner
    }
  }

  return /* nothing left waiting */;
};`,
        hints: [
          'An opener has to be remembered until its partner arrives, and the partner always belongs to the most recent opener still waiting. That is a stack: push openers, and pop when a closer arrives.',
          'Map each closer to the opener it expects: `)` to `(`, `]` to `[`, `}` to `{`. A closer is wrong when the value you popped is not what it expects, and also when there was nothing to pop.',
          'Returning inside the loop is not enough. `([` reaches the end with two openers still waiting, so the final answer is whether the stack is empty.',
        ],
        approach: [
          'Start with an empty array holding the openers still waiting.',
          'Walk the string one character at a time.',
          'Push every opener.',
          'On a closer, remove the most recent opener and compare it with the one this closer expects; return `false` as soon as they disagree, or when nothing was waiting.',
          'After the loop, return whether the array is empty.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The right verdict on balanced and unbalanced text',
            critical: true,
            weight: 3,
            detail: 'Check the empty string, a lone opener, a lone closer, several pairs side by side and a deeply nested run.',
          },
          {
            id: 'nesting-order',
            label: 'A closer matches the most recent opener',
            critical: true,
            weight: 2,
            detail: 'Counting the six characters, or counting each kind separately, calls `)(` and `([)]` balanced. Order matters as much as totals.',
          },
        ],
        tests: [
          { call: "isBalanced('([]{})')", expected: true, label: 'nested pairs of all three kinds' },
          { call: "isBalanced('')", expected: true, label: 'the empty string is balanced', edge: true },
          { call: "isBalanced('(')", expected: false, label: 'an opener still waiting at the end', edge: true },
          {
            call: "isBalanced(')(')",
            expected: false,
            label: 'a closer arriving with nothing open',
            edge: true,
            criterion: 'nesting-order',
          },
          { call: "isBalanced('(]')", expected: false, label: 'a closer of the wrong kind', criterion: 'nesting-order' },
          { call: "isBalanced('([)]')", expected: false, label: 'overlapping pairs do not nest', criterion: 'nesting-order' },
          { call: "isBalanced('()[]{}')", expected: true, label: 'pairs side by side, none nested' },
        ],
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d04-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d04-stack-api', state: 'verified_pass' },
    { activityId: 'dsa-v1-d04-head-index-queue', state: 'verified_pass' },
    { activityId: 'dsa-v1-d04-balanced-brackets', state: 'verified_pass' },
  ],
};
