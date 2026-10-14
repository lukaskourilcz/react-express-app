/** D04 — Stacks and queues.
 *
 * Two access disciplines and the price of the representation underneath them.
 * The first lesson traces a stack and a queue frame by frame; the second costs
 * the array operations they are usually built on, including the honest part
 * nobody mentions: a head-index queue does not reclaim the slots it leaves
 * behind until you compact it.
 *
 * The queue exercise measures a finite trace of buffer operations. The learner stores values in a
 * buffer the harness hands them — a proxied array with `push`, `length` and
 * index access and nothing else — and the grade counts element reads and
 * writes. That is a bounded contract about this routine on these inputs, not
 * a proof about arbitrary code. */

import type { ModuleSource } from '../../types';

/** Hands the learner a counted buffer and measures one full round trip
 * through their queue. The buffer is a Proxy over a plain array: index reads
 * and writes are counted, `push` is counted once per call, and the
 * element-moving methods are simply absent, so `shift` cannot be reached and
 * a hand-written slide shows up in the counter. Installed in a private scope before the learner's
 * code, with immutable exports and initialization after declarations, and it counts with the built-ins taken
 * before that code ran (`__probe`, shared/coding-evaluate.ts), so replacing
 * `Proxy` changes nothing. */
const QUEUE_PROBE = `
var __bufferOps = 0;
var __buffersMade = 0;
var newQueueBuffer = function () {
  var data = [];
  __buffersMade += 1;
  return new __probe.Proxy(data, {
    get: function (target, prop) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) {
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
      if (typeof prop === 'string' && __probe.isIndex(prop)) __bufferOps += 1;
      target[prop] = value;
      return true;
    },
    defineProperty: function (target, prop, descriptor) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) __bufferOps += 1;
      __probe.defineProperty(target, prop, descriptor);
      return true;
    },
    deleteProperty: function (target, prop) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) __bufferOps += 1;
      return __probe.deleteProperty(target, prop);
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
    'Cost a queue by its representation: why front removal is costly in the stated dense-array model and a head index avoids those moves.',
    'State the underflow contract and the memory tradeoff of the structure you built, instead of leaving either to chance.',
  ],
  competencies: ['stacks-queues', 'complexity'],
  dependsOn: ['dsa-v1-d02'],
  estimatedMinutes: 120,
  lessons: [
    {
      id: 'dsa-v1-d04-l1',
      title: 'LIFO and FIFO as access disciplines',
      summary: 'Two access orders, traced step by step, with a stated empty-case rule.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-10-14' },
        {
          label: 'MDN — Array.prototype.push',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push',
          reviewedOn: '2026-10-14',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A stack and a queue are abstract data types with different access orders. Both hold a sequence. Both let you add one value and take one back. They differ in exactly one place: which value they are willing to give you.',
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
          kind: 'example',
          language: 'javascript',
          code: `const createStack = () => {
  const items = [];
  return {
    push: value => { items.push(value); },
    pop: () => (items.length === 0 ? null : items.pop()),
    peek: () => (items.length === 0 ? null : items[items.length - 1]),
    size: () => items.length,
  };
};

const stack = createStack();
stack.push("a");
stack.push("b");
console.log("peek", stack.peek(), "size", stack.size());
console.log("pop", stack.pop());
console.log("pop", stack.pop());
console.log("pop on empty", stack.pop());`,
          caption: 'The stack from above, driven far enough to reach the empty case.',
          note: 'Change what pop returns when the stack is empty and decide which answer you would rather debug at three in the morning.',
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
            'Underflow is reading or removing from an empty stack. Throwing or returning a sentinel can both be sound if the API states its behavior. This module returns `null`, which is ambiguous when `null` is itself a stored value — `size()` is what tells the two apart. Pick one rule and write it down.',
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
            'Empty-case behavior must be stated. This module returns null on underflow and provides size to distinguish an empty structure from one storing null. A different API can throw or return undefined if that behavior is documented.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The restriction is the feature. Once you index into the middle of a stack, you have an array with extra steps, and the reasoning the discipline bought you is gone. That reasoning is what a stack is for: bracket matching is correct because the only opener you can reach is the most recent one, together with the requirement that every closer matches and no opener remains at the end.',
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
      summary: 'Amortized constant appends, the linear price of removing from the front, and the memory a head-index queue holds on to.',
      estimatedMinutes: 20,
      sources: [
        {
          label: 'MDN — Array.prototype.shift',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift',
          reviewedOn: '2026-10-14',
        },
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-10-14' },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'For these costs, assume a dense growable-array model with constant-time indexing, bounded-size values and a capacity that doubles when full. Removing from the end takes constant work; adding there can trigger a linear resize. These are model costs, not universal JavaScript engine timing guarantees.',
        },
        {
          kind: 'prose',
          body:
            'The one wrinkle is growth. In this model, a growable array holds a block with spare capacity, and when the spare runs out it allocates a larger block and copies everything across. That copy is linear in the current length, so an individual `push` is not constant. Doubling the capacity keeps the copies rare enough that a run of n pushes costs O(n) in total, which is what "amortized constant" claims.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Amortized is a statement about a sequence, not about a single call. It says n pushes cost O(n) between them, so the average is constant. It does not say every push is cheap, and in a system where one slow call matters more than the total — a frame budget, an audio callback — the amortized bound alone does not guarantee that deadline.',
        },
        {
          kind: 'prose',
          body:
            'The front of an array is a different story. In the dense-array model, front removal returns index 0 and moves the survivors down one slot. JavaScript specifies the resulting indexed properties, but an engine can optimize the implementation. Count survivor moves here rather than claiming a universal elapsed-time cost.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Correct FIFO behavior, and quadratic to drain.\nconst createShiftQueue = () => {\n  const items = [];\n  return {\n    enqueue: value => { items.push(value); },\n    dequeue: () => (items.length === 0 ? null : items.shift()),\n    size: () => items.length,\n  };\n};',
          caption: 'The obvious queue. `enqueue` is amortized constant; `dequeue` moves every remaining element.',
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
                note: 'The array drops its last slot and the removal is done. Removing one value from a queue of four cost three moves, so this dense-model removal from k values moves k − 1 survivors.',
                counter: { label: 'Element moves', value: 3 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Starting with n values and no later enqueues, the dense model moves n − 1 survivors on the first removal, then n − 2, down to 0. The total is n(n − 1)/2, plus n removals, giving O(n²) drain work. For n = 10,000, that is exactly 49,995,000 survivor moves.',
        },
        {
          kind: 'prose',
          body:
            'The fix is to stop moving elements. Keep the values where they are and remember where the front is instead: a head index that starts at 0 and only ever goes up. `dequeue` reads the slot the head points at, then adds one to the head. No waiting value moves; the consumed slot can be cleared to release its reference.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const createQueue = () => {\n  const items = [];\n  let head = 0;\n\n  return {\n    enqueue: value => { items.push(value); },\n    dequeue: () => {\n      if (head >= items.length) return null;\n      const value = items[head];\n      items[head] = null; // release the reference, not the slot\n      head += 1;\n      return value;\n    },\n    size: () => items.length - head,\n  };\n};',
          caption: 'A head-index queue: read and clear one slot, then advance the head without moving waiting values.',
        },
        {
          kind: 'prose',
          body:
            'In the stated model, dequeue and size are constant-time; enqueue is amortized constant-time. `size()` is `items.length - head`, one subtraction. The queue is empty when the head has caught up with the end, which is the condition `dequeue` checks before it reads anything.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The memory is the honest part. Those slots before the head stay in the array. A queue that has handled a million messages holds a million-slot array even when two values are waiting, because nothing ever removed the first 999,998 slots. Writing `null` into a slot you have read releases the value it pointed at, so it can be collected when no other reference keeps it alive — but the slot itself stays.',
        },
        {
          kind: 'prose',
          body:
            'Compaction is what actually reclaims it: when the head passes some threshold, copy the live tail into a fresh array and reset the head to 0. One compaction costs O(live + 1), including a new empty container when no values remain. Triggering it when the head reaches half the array length keeps the total copying linear in the number of dequeues, so the amortized cost per dequeue stays constant. A fixed-capacity ring buffer solves the same problem differently, by wrapping the indices around instead of growing.',
        },
        {
          kind: 'table',
          caption: 'Costs in the stated dense-array model; n is the number of live values.',
          headers: ['Operation', 'Array end', 'Array front', 'Head-index queue'],
          rows: [
            ['Add one value', 'Amortized O(1) with `push`', 'O(n) with `unshift`: every element moves up', 'Amortized O(1) at the back'],
            ['Remove one value', 'O(1) with `pop`', 'O(n) with `shift`: every survivor moves down', 'O(1): read a slot, bump the head'],
            ['Report the size', 'O(1)', 'O(1)', 'O(1): length minus head'],
            ['Memory held', 'Live values plus spare capacity', 'Live values plus spare capacity', 'Used slots and spare capacity until compaction'],
          ],
        },
        {
          kind: 'prose',
          body:
            'So there is no free representation, only a choice about which cost you can afford. A short-lived queue can be simple; whether front removal is fast enough needs measurement in the actual workload. A long-lived queue also needs a policy for retained slots, and the head index plus compaction answers each of them separately.',
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
      summary: 'Amortized appends, the linear cost of `shift`, and the memory a head-index queue keeps until you compact.',
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
      summary: 'Four questions: what each discipline hands back, why a shift-based queue drains quadratically, what amortized claims, and what a head index holds on to.',
      competencies: ['stacks-queues', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d04-q1',
          prompt: "Using an initially empty LIFO stack and FIFO queue, what do fromStack and fromQueue hold after this code?",
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
          prompt: "A dense-array model moves each survivor down one slot on front removal, at constant cost per move. All n queued values are removed with no new enqueues. What is the total drain work and why?",
          options: [
            "O(n²): the n removals also move n − 1, n − 2, …, 0 survivors.",
            "O(n): count the n removed values and ignore the survivor moves.",
            "O(n log n): each removal halves the number of survivors still waiting.",
            "O(n²): each removal copies the array into a larger storage block.",
          ],
          correct: 0,
          explanation:
            "The stated model moves k − 1 survivors when removing from k values. Summing from n − 1 to 0 gives n(n − 1)/2 moves, plus n removals, so the drain is O(n²). Counting only removals misses those moves; there is no halving or growth during the drain. This is a model result, not a universal engine timing guarantee.",
          competencies: ['stacks-queues', 'complexity'],
        },
        {
          id: 'dsa-v1-d04-q3',
          prompt: "A growable-array model starts with capacity 1 and doubles it when full, copying stored values. Index writes and copying one value have constant cost. For n ≥ 1 appends, what does amortized O(1) append mean?",
          options: [
            "A run of n appends costs O(n) total, though one resize append can cost O(n).",
            "Every append costs O(1) individually, because resizing never copies stored values.",
            "The average across different programs is O(1), with no bound on one sequence.",
            "The average measured execution time is O(1), regardless of the counted work.",
          ],
          correct: 0,
          explanation:
            "Across n appends, the copied capacities form a geometric sum smaller than 2n, so copying plus the n writes is O(n). One append can still copy all stored values and take linear work. Amortized cost is a bound over one operation sequence, not an average across programs or a benchmark result.",
          competencies: ['stacks-queues', 'complexity'],
        },
        {
          id: 'dsa-v1-d04-q4',
          prompt: "A queue appends to an array, reads a stored head index on dequeue, and never truncates or compacts the array. Assume constant-cost indexing and bounded-size values. Which storage statement is correct?",
          options: [
            "Used array slots track total enqueues, even when few values are waiting.",
            "Used array slots track only waiting values, because advancing the head shrinks the array.",
            "Dequeue must scan from index zero, because the stored head cannot locate a value.",
            "Size must scan every waiting value, because length minus head cannot count them.",
          ],
          correct: 0,
          explanation:
            "Advancing the head changes no array length, so used slots track total enqueues until truncation or compaction. Clearing consumed slots removes those references, but other references may still keep values alive. In the stated model, dequeue uses a stored index and size is length minus head; neither needs a scan.",
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
      summary: "Build four stack methods with independent storage and an explicit empty-case rule.",
      competencies: ['stacks-queues'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "Write `createStack()`, returning an object with four methods:\n\n- `push(value)` puts a value on top. Its return value is never read.\n- `pop()` removes the top value and returns it.\n- `peek()` returns the top value and leaves the stack unchanged.\n- `size()` returns how many values the stack holds.\n\nThe underflow contract: `pop()` and `peek()` on an empty stack return `null` and leave it empty, and `size()` never goes below 0. Two stacks made by two calls to `createStack()` hold their own values and never share.\n\nReturn values unchanged, including object identity, undefined, false, 0 and the empty string. `null` is a legal value to push, so a `null` from `pop()` cannot on its own mean the stack was empty — `size()` is what separates the two cases.",
        contract: [
          'Every call to `createStack()` returns a fresh stack with its own storage.',
          '`pop()` and `peek()` return `null` on an empty stack rather than throwing or returning `undefined`.',
          '`peek()` and `size()` leave the stack exactly as they found it.',
        ],
        starter: `const createStack = () => {

};

// Scratch pad — change this before submitting.
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
          "Compare the end each operation uses. Keep storage inside the factory so a second stack cannot change the first.",
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
      title: "A queue under a measured buffer budget",
      summary: "Use a head index and check its buffer work on the measured fill-and-drain sequences.",
      competencies: ['stacks-queues', 'complexity'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          "Write `createQueue()`, returning an object with three methods:\n\n- `enqueue(value)` adds a value at the back. Its return value is never read.\n- `dequeue()` removes the value at the front and returns it, or `null` when the queue is empty.\n- `size()` returns how many values are waiting.\n\nUse a head index to avoid sliding waiting values down in the buffer. The fixed-input budget measures buffer operations, not work in other storage. With a head index: read the slot the head points at, then add one to the head.\n\nStore the values in a buffer the grader hands you — call `newQueueBuffer()` where you would otherwise write `[]`. It supports `push(value)`, `length` and index access and nothing else, and it counts indexed reads, assignments, property definitions and deletions; one push counts as one write.\n\nThe budget: enqueueing 32 values and then dequeuing all 32 must stay within 192 buffer operations, six per value. A head index costs three per value. A dense slide costs over a thousand on that sequence. Return values unchanged, including object identity and undefined/falsey values; separate queues keep independent state. Passing fixed cases does not prove asymptotic complexity.",
        contract: [
          "Use a buffer from newQueueBuffer for the exercise; work in other storage is not counted.",
          'The buffer offers `push`, `length` and index access only — reaching for `shift` or `splice` throws.',
          "A measured 32-value fill and drain costs at most 192 buffer operations. The hidden 64-value run has the same six-per-value limit; these traces do not prove arbitrary complexity.",
          '`dequeue()` returns `null` on an empty queue, and `size()` never goes below 0.',
        ],
        starter: `const createQueue = () => {
  const items = newQueueBuffer();

};

// Scratch pad — change this before submitting.
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
          "Keep separate positions for the stored end and the next value to return. Work out when they describe an empty queue.",
          'Read the front value before advancing the head. You can clear the consumed slot without moving any waiting value.',
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
            label: "The measured buffer trace stays within its budget",
            critical: true,
            weight: 2,
            detail: "The counter exceeds six buffer operations per value on a measured 32- or 64-value round trip, or too few buffer operations were observed. A dense slide fails these traces; other storage and untested inputs are outside the measurement.",
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
            label: "at least 32 counted buffer operations are observed",
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
          'Write `isBalanced(text)`, returning `true` when every bracket in `text` is closed by the matching kind in the right order, and `false` otherwise.\n\n`text` contains only these six characters: `(`, `)`, `[`, `]`, `{`, `}`. No other character ever appears, so there is nothing to skip and nothing to reject. The empty string is balanced.\n\nTarget: O(n) time and O(n) extra space, where n is text.length; all six allowed characters are single ASCII code units. A stack is the recommended approach; fixed tests check the result, not a proof of the target.\n\n`([]{})` is balanced. `(]` is not, because a closer has to match the opener it meets. `([)]` is not, because the pairs overlap instead of nesting. `)(` is not, because a closer arrives with nothing open. `(` is not, because an opener is still waiting when the string ends.',
        contract: [
          'The input holds only `()[]{}`, so no other character has to be handled.',
          'The empty string returns `true`.',
          'Counting is not enough: `)(` has one of each character and is unbalanced.',
        ],
        starter: `const isBalanced = text => {

};

// Scratch pad — change this before submitting.
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
          "When a closer arrives, identify which unmatched opener it belongs to. Try the overlapping example before choosing what to remember.",
          "Separate two failure cases: no opener is waiting, or the waiting opener has the wrong kind.",
          "What still needs checking after the final character? Compare an empty input with one that ends before every opener has closed.",
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
