// Loop and array-method tasks for the JavaScript track (authored for devShark).
// Task bodies only: prompts, starters, visible tests, hints. No solutions.
// English is the source of truth; Czech copy lives in javascript-loops.cs.ts.

import type { CodingTaskSource } from '../types';

export const JAVASCRIPT_LOOP_TASKS: CodingTaskSource[] = [
  {
    id: "js-digit-sum",
    track: "javascript",
    topic: "javascript",
    level: 1,
    tier: 1,
    focus: ["while"],
    title: "Digit sum",
    prompt: "Write `digitSum(n)`, returning the sum of the decimal digits of a whole number that is zero or more, using a `while` loop and arithmetic rather than a string. `digitSum(493)` gives 16. A single digit is its own sum, and `digitSum(0)` gives 0.",
    starter: `const digitSum = n => {

};

// Scratch pad — change this and press Run.
console.log(digitSum(493));
`,
    skeleton: `const digitSum = n => {
  let total = /* starting total */;

  while (/* digits remain */) {
    // add the last digit to total, then drop it from n
  }

  return total;
};`,
    hints: ["The remainder after dividing by ten is the last digit and rounding the quotient down drops it, so keep peeling digits off until nothing is left."],
    approach: [
      "Start a running total at zero.",
      "While the number is still above zero, add its last digit — the remainder after dividing by ten — to the total.",
      "Drop that digit by dividing by ten and rounding down, then let the loop check the number again.",
      "Return the total; zero never enters the loop and gives zero.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "digitSum(493)", expected: 16 },
      { call: "digitSum(1234)", expected: 10 },
      { call: "digitSum(0)", expected: 0, label: "zero has a digit sum of zero", edge: true },
      { call: "digitSum(7)", expected: 7, label: "a single digit is its own sum", edge: true },
      { call: "digitSum(1000)", expected: 1, label: "zeros inside the number add nothing", edge: true },
    ],
  },
  {
    id: "js-count-multiples",
    track: "javascript",
    topic: "javascript",
    level: 1,
    tier: 1,
    focus: ["for"],
    title: "Count multiples",
    prompt: "Write `countMultiples(n, from, to)`, returning how many whole numbers from `from` through `to`, both included, divide by `n` with no remainder — use a `for` loop that visits each one. `countMultiples(3, 1, 10)` gives 3, for 3, 6 and 9. Zero is a multiple of every `n`, and a `from` past `to` gives 0.",
    starter: `const countMultiples = (n, from, to) => {

};

// Scratch pad — change this and press Run.
console.log(countMultiples(3, 1, 10));
`,
    skeleton: `const countMultiples = (n, from, to) => {
  let count = /* none yet */;

  for (/* every value from from through to */) {
    // count the value when it divides by n
  }

  return count;
};`,
    hints: ["Walk every whole number from the start through the end, and let the remainder after dividing by n decide whether it counts."],
    approach: [
      "Keep a counter that starts at zero.",
      "Write a for loop that starts at the first value and runs while the value is still at most the last one, so both ends are visited.",
      "Inside, add one to the counter when the remainder after dividing by n is zero.",
      "Return the counter; when the start is already past the end, the body never runs and the answer is zero.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "countMultiples(3, 1, 10)", expected: 3 },
      { call: "countMultiples(5, 1, 20)", expected: 4 },
      { call: "countMultiples(7, 1, 6)", expected: 0, label: "no multiples in the range", edge: true },
      { call: "countMultiples(4, 8, 8)", expected: 1, label: "a range of one number that is a multiple", edge: true },
      { call: "countMultiples(5, 0, 5)", expected: 2, label: "zero counts as a multiple", edge: true },
      { call: "countMultiples(2, 10, 1)", expected: 0, label: "a start past the end gives 0", edge: true },
    ],
  },
  {
    id: "js-words-of-length",
    track: "javascript",
    topic: "javascript",
    level: 2,
    tier: 1,
    focus: ["for-of", "split"],
    title: "Words of a length",
    prompt: "Write `countWordsOfLength(sentence, length)`, returning how many words in the sentence have exactly that many characters. Words are separated by single spaces; split the sentence and walk the words with `for…of`. `countWordsOfLength(\"the cat sat on a mat\", 3)` gives 4, and an empty sentence gives 0.",
    starter: `const countWordsOfLength = (sentence, length) => {

};

// Scratch pad — change this and press Run.
console.log(countWordsOfLength("the cat sat on a mat", 3));
`,
    skeleton: `const countWordsOfLength = (sentence, length) => {
  const words = /* the sentence split on spaces */;
  let count = /* none yet */;

  for (/* each word */) {
    // count the word when its length matches
  }

  return count;
};`,
    hints: ["Split the sentence on spaces first, then walk the words and compare each length with the one you were given."],
    approach: [
      "Split the sentence on single spaces to get an array of words.",
      "Walk that array with a for-of loop and a counter that starts at zero.",
      "Add one whenever a word has exactly the wanted length, then return the counter.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "countWordsOfLength(\"the cat sat on a mat\", 3)", expected: 4 },
      { call: "countWordsOfLength(\"hello big world\", 5)", expected: 2 },
      { call: "countWordsOfLength(\"\", 3)", expected: 0, label: "an empty sentence has no words", edge: true },
      { call: "countWordsOfLength(\"one two three\", 4)", expected: 0, label: "no word has that length", edge: true },
      { call: "countWordsOfLength(\"a b c\", 1)", expected: 3, label: "every word matches", edge: true },
    ],
  },
  {
    id: "js-queue-with-shift",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["push", "shift"],
    title: "Serve the queue",
    prompt: "Write `serveNext(queue, newcomer)`. The newcomer joins the back of the queue with `push`, then the person at the front is served: remove them with `shift` and return their name. The queue is changed in place. With `queue = [\"Ana\", \"Bo\"]`, `serveNext(queue, \"Cy\")` returns `\"Ana\"` and leaves `queue` as `[\"Bo\", \"Cy\"]`; an empty queue serves the newcomer at once.",
    starter: `const serveNext = (queue, newcomer) => {

};

// Scratch pad — change this and press Run.
const line = ["Ana", "Bo"];
console.log(serveNext(line, "Cy"), line);
`,
    skeleton: `const serveNext = (queue, newcomer) => {
  // add the newcomer at the back
  // remove the front item and hand it back
};`,
    hints: ["One method adds at the back and another removes from the front; both change the array you were given, and the removing one hands you what it removed."],
    approach: [
      "Add the newcomer to the end of the queue with push, which changes the array in place.",
      "Remove the first element with shift and return what it gives you, since that is the person served.",
      "Check the empty case: after the push there is exactly one person, and shift returns them and leaves the queue empty.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "(() => { const queue = [\"Ana\",\"Bo\"]; const served = serveNext(queue, \"Cy\"); return [served, queue]; })()", expected: ["Ana", ["Bo", "Cy"]] },
      { call: "(() => { const queue = [\"Ana\"]; return [serveNext(queue, \"Bo\"), queue]; })()", expected: ["Ana", ["Bo"]] },
      { call: "(() => { const queue = []; return [serveNext(queue, \"Solo\"), queue]; })()", expected: ["Solo", []], label: "an empty queue serves the newcomer at once", edge: true },
      { call: "(() => { const queue = [\"Ana\",\"Bo\"]; serveNext(queue, \"Cy\"); serveNext(queue, \"Di\"); return queue; })()", expected: ["Cy", "Di"], label: "two turns in a row", edge: true },
      { call: "(() => { const queue = [1, 2]; return [serveNext(queue, 3), queue]; })()", expected: [1, [2, 3]], label: "numbers queue the same way", edge: true },
    ],
  },
  {
    id: "js-swap-stack-top",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["push", "pop"],
    title: "Swap the top",
    prompt: "Write `swapTop(stack, item)`, replacing the top of a stack in place: remove the last element with `pop`, put `item` in its place with `push`, and return the removed element. With `stack = [1, 2, 3]`, `swapTop(stack, 9)` returns 3 and leaves `stack` as `[1, 2, 9]`. On an empty stack there is nothing to remove, so the item is pushed and `undefined` comes back.",
    starter: `const swapTop = (stack, item) => {

};

// Scratch pad — change this and press Run.
const stack = [1, 2, 3];
console.log(swapTop(stack, 9), stack);
`,
    skeleton: `const swapTop = (stack, item) => {
  // take the top off and keep it
  // put the new item on
  // hand back what was removed
};`,
    hints: ["pop takes the last element off and gives it to you, push puts one on, and the order of the two calls decides whether the new item sits under or on top."],
    approach: [
      "Remove the current top with pop and keep what it returns.",
      "Push the new item so it becomes the top.",
      "Return the removed value; on an empty stack pop returns undefined, which is exactly the answer wanted.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "(() => { const stack = [1,2,3]; const top = swapTop(stack, 9); return [top, stack]; })()", expected: [3, [1, 2, 9]] },
      { call: "(() => { const stack = [\"a\",\"b\"]; return [swapTop(stack, \"z\"), stack]; })()", expected: ["b", ["a", "z"]] },
      { call: "(() => { const stack = []; const top = swapTop(stack, \"first\"); return [top === undefined, stack]; })()", expected: [true, ["first"]], label: "an empty stack only gains the item", edge: true },
      { call: "(() => { const stack = [5]; return [swapTop(stack, 6), stack]; })()", expected: [5, [6]], label: "a single-item stack", edge: true },
      { call: "(() => { const stack = [1,2]; swapTop(stack, 3); swapTop(stack, 4); return stack; })()", expected: [1, 4], label: "two swaps in a row", edge: true },
    ],
  },
  {
    id: "js-add-to-front",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["unshift"],
    title: "Add to the front",
    prompt: "Write `addToFront(list, item)`, adding the item at the front of the list in place with `unshift` and returning the new length, which is what `unshift` itself returns. With `list = [2, 3]`, `addToFront(list, 1)` returns 3 and leaves `list` as `[1, 2, 3]`. An empty list gains its first item and returns 1.",
    starter: `const addToFront = (list, item) => {

};

// Scratch pad — change this and press Run.
const list = [2, 3];
console.log(addToFront(list, 1), list);
`,
    skeleton: `const addToFront = (list, item) => {
  // put the item at index zero and report the new length
};`,
    hints: ["The mirror image of push exists: it puts the item at index zero, moves the rest along, and reports the new length."],
    approach: [
      "Call unshift on the list with the item — it changes the list in place, so there is nothing to copy.",
      "Return what unshift gives back, which is the new length rather than the list.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "(() => { const list = [2,3]; const length = addToFront(list, 1); return [length, list]; })()", expected: [3, [1, 2, 3]] },
      { call: "(() => { const list = [\"b\"]; return [addToFront(list, \"a\"), list]; })()", expected: [2, ["a", "b"]] },
      { call: "(() => { const list = []; return [addToFront(list, \"only\"), list]; })()", expected: [1, ["only"]], label: "an empty list gains its first item", edge: true },
      { call: "(() => { const list = [1]; addToFront(list, 2); addToFront(list, 3); return list; })()", expected: [3, 2, 1], label: "later additions land further to the front", edge: true },
      { call: "(() => { const list = [1, 2]; return [addToFront(list, [0]), list]; })()", expected: [3, [[0], 1, 2]], label: "an array item is added as one element", edge: true },
    ],
  },
  {
    id: "js-remove-a-range",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["splice"],
    title: "Remove a range",
    prompt: "Write `removeRange(list, start, count)`, removing `count` items in place beginning at index `start` with `splice` and returning the removed items as an array. With `list = [1, 2, 3, 4, 5]`, `removeRange(list, 1, 2)` returns `[2, 3]` and leaves `list` as `[1, 4, 5]`. A count of zero removes nothing, and a count past the end stops at the end.",
    starter: `const removeRange = (list, start, count) => {

};

// Scratch pad — change this and press Run.
const list = [1, 2, 3, 4, 5];
console.log(removeRange(list, 1, 2), list);
`,
    skeleton: `const removeRange = (list, start, count) => {
  // remove count items from start and hand back what came out
};`,
    hints: ["One array method both removes a run of elements in place and hands the removed run back, and its first two arguments are exactly where to start and how many."],
    approach: [
      "Call splice on the list with the start index and the count — it removes those elements in place.",
      "Return the array splice gives back, which holds the removed elements in their original order.",
      "Trust its edge behaviour: a count of zero removes nothing and a count past the end simply stops at the end.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "(() => { const list = [1,2,3,4,5]; const removed = removeRange(list, 1, 2); return [removed, list]; })()", expected: [[2, 3], [1, 4, 5]] },
      { call: "(() => { const list = [\"a\",\"b\",\"c\"]; return [removeRange(list, 0, 1), list]; })()", expected: [["a"], ["b", "c"]] },
      { call: "(() => { const list = [1,2,3]; return [removeRange(list, 1, 0), list]; })()", expected: [[], [1, 2, 3]], label: "a count of zero removes nothing", edge: true },
      { call: "(() => { const list = [1,2,3]; return [removeRange(list, 1, 10), list]; })()", expected: [[2, 3], [1]], label: "a count past the end stops at the end", edge: true },
      { call: "(() => { const list = [1,2,3]; return [removeRange(list, 0, 3), list]; })()", expected: [[1, 2, 3], []], label: "removing everything", edge: true },
    ],
  },
  {
    id: "js-copy-a-range",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["slice"],
    title: "Copy a range",
    prompt: "Write `copyRange(list, start, end)`, returning a new array with the items from index `start` up to but not including `end`, taken with `slice` so the original list is never changed. `copyRange([1, 2, 3, 4], 1, 3)` gives `[2, 3]`. An end past the length stops at the end, and equal indexes give an empty array.",
    starter: `const copyRange = (list, start, end) => {

};

// Scratch pad — change this and press Run.
console.log(copyRange([1, 2, 3, 4], 1, 3));
`,
    skeleton: `const copyRange = (list, start, end) => {
  // copy the stretch from start up to end without touching list
};`,
    hints: ["The method you want reads from the array without touching it, takes a start and an end, and leaves the end index itself out."],
    approach: [
      "Use slice with the start and end indexes — it copies that stretch into a new array and never changes the original.",
      "Return the copy, remembering that the end index is excluded and an end past the length is clipped to the array.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "copyRange([1,2,3,4], 1, 3)", expected: [2, 3] },
      { call: "copyRange([\"a\",\"b\",\"c\"], 0, 2)", expected: ["a", "b"] },
      { call: "(() => { const list = [1,2,3]; copyRange(list, 0, 2); return list; })()", expected: [1, 2, 3], label: "keeps the original array unchanged", edge: true },
      { call: "copyRange([1,2,3], 1, 10)", expected: [2, 3], label: "an end past the length stops at the end", edge: true },
      { call: "copyRange([1,2,3], 2, 2)", expected: [], label: "equal indexes give an empty array", edge: true },
    ],
  },
  {
    id: "js-insert-at-index",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["splice"],
    title: "Insert at an index",
    prompt: "Write `insertAt(list, index, item)`, inserting the item at that position in place with `splice` without removing anything, and returning the list. `insertAt([1, 3], 1, 2)` gives `[1, 2, 3]`. Index 0 puts the item first, and an index equal to the length appends it.",
    starter: `const insertAt = (list, index, item) => {

};

// Scratch pad — change this and press Run.
console.log(insertAt([1, 3], 1, 2));
`,
    skeleton: `const insertAt = (list, index, item) => {
  // splice the item in at index, deleting nothing
  return list;
};`,
    hints: ["splice can add as well as remove: a delete count of zero followed by the new item drops it in at the index without losing anything."],
    approach: [
      "Call splice on the list at the index with a delete count of zero, then the item — that inserts without removing.",
      "Return the list itself, since splice changed it in place and returns only what it removed, which is nothing here.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "insertAt([1,3], 1, 2)", expected: [1, 2, 3] },
      { call: "insertAt([\"b\",\"c\"], 0, \"a\")", expected: ["a", "b", "c"] },
      { call: "insertAt([1,2], 2, 3)", expected: [1, 2, 3], label: "an index equal to the length appends", edge: true },
      { call: "insertAt([], 0, \"x\")", expected: ["x"], label: "inserting into an empty array", edge: true },
      { call: "(() => { const list = [1,2]; insertAt(list, 1, 9); return list; })()", expected: [1, 9, 2], label: "changes the array in place", edge: true },
    ],
  },
  {
    id: "js-rotate-once",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["shift", "push"],
    title: "Rotate once",
    prompt: "Write `rotateOnce(list)`, moving the first element to the end in place with `shift` and `push`, and returning the list. `rotateOnce([1, 2, 3])` gives `[2, 3, 1]`. An empty list stays empty — watch what `shift` returns there — and a single item stays where it is.",
    starter: `const rotateOnce = list => {

};

// Scratch pad — change this and press Run.
console.log(rotateOnce([1, 2, 3]));
`,
    skeleton: `const rotateOnce = list => {
  if (/* there is something to rotate */) {
    // take the first element off and put it on the end
  }
  return list;
};`,
    hints: ["Take the first element off with one method and put it on the end with another — and check what the removing method returns when there is nothing to remove."],
    approach: [
      "Guard the empty list first: shift returns undefined there, and pushing that would add a bogus element.",
      "Otherwise remove the first element with shift, which hands it to you.",
      "Push that element onto the end of the same array and return the list, which was changed in place.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "rotateOnce([1,2,3])", expected: [2, 3, 1] },
      { call: "rotateOnce([\"a\",\"b\"])", expected: ["b", "a"] },
      { call: "rotateOnce([])", expected: [], label: "an empty list stays empty", edge: true },
      { call: "rotateOnce([7])", expected: [7], label: "a single item stays put", edge: true },
      { call: "(() => { const list = [1,2,3]; rotateOnce(list); return list; })()", expected: [2, 3, 1], label: "rotates in place", edge: true },
    ],
  },
  {
    id: "js-last-item-safely",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["slice"],
    title: "Last item safely",
    prompt: "Write `lastItem(list, fallback)`, returning the last element of the list without changing it, or `fallback` when the list is empty. `lastItem([1, 2, 3], 0)` gives 3 and `lastItem([], \"none\")` gives `\"none\"`. A last element that happens to be falsy, such as 0, is still returned rather than the fallback.",
    starter: `const lastItem = (list, fallback) => {

};

// Scratch pad — change this and press Run.
console.log(lastItem([1, 2, 3], 0));
`,
    skeleton: `const lastItem = (list, fallback) => {
  if (/* the list is empty */) return fallback;
  return /* the element at the last index */;
};`,
    hints: ["The last index is one less than the length, and only an empty list has no such index — deciding that first keeps the method that removes the item out of the picture."],
    approach: [
      "Check the length first: an empty list has no last item, so return the fallback straight away.",
      "Otherwise read the element at length minus one — or take a one-element slice from the end — so the list is only read, never changed.",
      "Return that element as it is, even when it is zero or an empty string; the fallback is only for an empty list.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "lastItem([1,2,3], 0)", expected: 3 },
      { call: "lastItem([\"a\"], \"none\")", expected: "a" },
      { call: "lastItem([], \"none\")", expected: "none", label: "an empty list gives the fallback", edge: true },
      { call: "(() => { const list = [1,2,3]; lastItem(list, 0); return list; })()", expected: [1, 2, 3], label: "keeps the list unchanged", edge: true },
      { call: "lastItem([5, 0], 9)", expected: 0, label: "a falsy last item is still the last item", edge: true },
    ],
  },
  {
    id: "js-sum-with-for",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 1,
    focus: ["for"],
    title: "Sum with for",
    prompt: "Write `addUp(numbers)`, returning the total of every number using a `for` loop with an index rather than `reduce`. `addUp([1, 2, 3])` gives 6. An empty array totals 0, and negatives and decimals add up like anything else.",
    starter: `const addUp = numbers => {

};

// Scratch pad — change this and press Run.
console.log(addUp([1, 2, 3]));
`,
    skeleton: `const addUp = numbers => {
  let total = /* starting total */;

  for (/* index from 0 while below the length */) {
    // add the element at this index
  }

  return total;
};`,
    hints: ["Keep a running total outside the loop, and let an index walk from zero up to, but not including, the length."],
    approach: [
      "Declare a total of zero before the loop.",
      "Write a for loop with an index that starts at zero and runs while it is below the length.",
      "Add the element at the current index to the total on each pass, then return the total after the loop.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "addUp([1,2,3])", expected: 6 },
      { call: "addUp([10,20])", expected: 30 },
      { call: "addUp([])", expected: 0, label: "empty input returns 0", edge: true },
      { call: "addUp([-4,4])", expected: 0, label: "negatives cancel out", edge: true },
      { call: "addUp([0.5,0.25])", expected: 0.75, label: "decimals", edge: true },
    ],
  },
  {
    id: "js-count-matches",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 1,
    focus: ["for"],
    title: "Count matches",
    prompt: "Write `countMatches(items, target)`, returning how many elements are strictly equal to `target`, counted with a `for` loop over the indexes. `countMatches([\"a\", \"b\", \"a\"], \"a\")` gives 2. No matches, or an empty array, gives 0, and a string `\"1\"` never matches the number 1.",
    starter: `const countMatches = (items, target) => {

};

// Scratch pad — change this and press Run.
console.log(countMatches(["a", "b", "a"], "a"));
`,
    skeleton: `const countMatches = (items, target) => {
  let count = /* none yet */;

  for (/* index from 0 while below the length */) {
    // count the element when it is strictly equal to target
  }

  return count;
};`,
    hints: ["Same loop shape as summing, except the counter only moves when the element at the index is strictly equal to the target."],
    approach: [
      "Start a counter at zero.",
      "Loop with an index over every position and compare the element there with the target using strict equality.",
      "Add one for each match and return the counter at the end.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "countMatches([\"a\",\"b\",\"a\"], \"a\")", expected: 2 },
      { call: "countMatches([1,2,3,2,2], 2)", expected: 3 },
      { call: "countMatches([], \"a\")", expected: 0, label: "empty input", edge: true },
      { call: "countMatches([\"x\",\"y\"], \"z\")", expected: 0, label: "nothing matches", edge: true },
      { call: "countMatches([1,\"1\"], 1)", expected: 1, label: "strict comparison: a string 1 is not the number 1", edge: true },
    ],
  },
  {
    id: "js-reverse-in-place",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 2,
    focus: ["two-pointer", "while"],
    title: "Reverse in place",
    prompt: "Write `reverseInPlace(list)`, reversing the array itself with two indexes that start at the ends and swap their way towards the middle, without `reverse()` or a copy, and returning the same array. `reverseInPlace([1, 2, 3, 4])` gives `[4, 3, 2, 1]`. Odd lengths, a single item and an empty array all work.",
    starter: `const reverseInPlace = list => {

};

// Scratch pad — change this and press Run.
console.log(reverseInPlace([1, 2, 3, 4]));
`,
    skeleton: `const reverseInPlace = list => {
  let left = /* first index */;
  let right = /* last index */;

  while (/* the two indexes have not met */) {
    // swap the elements at left and right
    // move both indexes inwards
  }

  return list;
};`,
    hints: ["Keep one index at each end, swap the two elements they point at, and move both indexes towards the middle until they meet or cross."],
    approach: [
      "Set one index to the first position and another to the last.",
      "While the left index is still below the right one, swap the two elements through a temporary variable.",
      "Move the left index up and the right index down after each swap.",
      "Return the array itself — a single item or an empty array never enters the loop.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "reverseInPlace([1,2,3,4])", expected: [4, 3, 2, 1] },
      { call: "reverseInPlace([1,2,3])", expected: [3, 2, 1] },
      { call: "(() => { const list = [\"a\",\"b\",\"c\"]; reverseInPlace(list); return list; })()", expected: ["c", "b", "a"], label: "changes the array itself", edge: true },
      { call: "reverseInPlace([])", expected: [], label: "empty input", edge: true },
      { call: "reverseInPlace([7])", expected: [7], label: "single item", edge: true },
    ],
  },
  {
    id: "js-countdown-by-step",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 1,
    focus: ["while", "push"],
    title: "Countdown by step",
    prompt: "Write `countdownBy(start, step)`, returning the values from `start` downwards in steps of `step` while they are still above zero, collected with a `while` loop. `countdownBy(10, 3)` gives `[10, 7, 4, 1]`. Zero is never included, so a start of zero or below gives an empty array; assume `step` is at least 1.",
    starter: `const countdownBy = (start, step) => {

};

// Scratch pad — change this and press Run.
console.log(countdownBy(10, 3));
`,
    skeleton: `const countdownBy = (start, step) => {
  const result = [];
  let value = /* where the countdown begins */;

  while (/* the value is still above zero */) {
    // collect the value, then step down
  }

  return result;
};`,
    hints: ["A while loop suits a countdown because you do not know in advance how many values there are — keep going only while the current value is still above zero."],
    approach: [
      "Start with an empty result and a value equal to the start.",
      "While the value is above zero, push it and subtract the step.",
      "Return the result; a start of zero or below never enters the loop.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "countdownBy(10, 3)", expected: [10, 7, 4, 1] },
      { call: "countdownBy(5, 1)", expected: [5, 4, 3, 2, 1] },
      { call: "countdownBy(6, 2)", expected: [6, 4, 2], label: "stops before reaching zero", edge: true },
      { call: "countdownBy(0, 1)", expected: [], label: "a start of zero gives nothing", edge: true },
      { call: "countdownBy(2, 5)", expected: [2], label: "a step larger than the start", edge: true },
      { call: "countdownBy(-3, 1)", expected: [], label: "a negative start gives nothing", edge: true },
    ],
  },
  {
    id: "js-first-divisible",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 1,
    focus: ["while"],
    title: "First divisible",
    prompt: "Write `firstDivisible(numbers, divisor)`, returning the first number in the array that divides by `divisor` with no remainder, or `null` when there is none. Walk the array with a `while` loop and use `break` the moment you find it. `firstDivisible([7, 9, 12, 20], 4)` gives 12, and zero is divisible by everything.",
    starter: `const firstDivisible = (numbers, divisor) => {

};

// Scratch pad — change this and press Run.
console.log(firstDivisible([7, 9, 12, 20], 4));
`,
    skeleton: `const firstDivisible = (numbers, divisor) => {
  let found = /* nothing yet */;
  let index = /* first position */;

  while (/* index is inside the array */) {
    // when the element divides evenly, remember it and break
    // otherwise move the index on
  }

  return found;
};`,
    hints: ["Walk with an index while it is inside the array, and the moment the remainder is zero remember the value and break out — the loop condition alone would carry on to the end."],
    approach: [
      "Keep a result that starts as null and an index that starts at zero.",
      "Loop while the index is below the length, testing the remainder of the element at that index.",
      "On the first zero remainder, store the element and break out of the loop; otherwise move the index on.",
      "Return the stored result, which is still null when nothing matched.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "firstDivisible([7,9,12,20], 4)", expected: 12 },
      { call: "firstDivisible([5,10,15], 5)", expected: 5 },
      { call: "firstDivisible([1,2,3], 7)", expected: null, label: "nothing divisible gives null", edge: true },
      { call: "firstDivisible([], 2)", expected: null, label: "empty input", edge: true },
      { call: "firstDivisible([3,0,6], 4)", expected: 0, label: "zero is divisible by everything", edge: true },
    ],
  },
  {
    id: "js-attempt-until",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 2,
    focus: ["do-while", "callbacks"],
    title: "Attempt until success",
    prompt: "Write `attemptUntil(attempt, limit)`. The function `attempt` returns `true` when it succeeds; call it at least once with a `do…while` loop, and keep calling it until it succeeds or `limit` calls have been made. Return how many calls it took, or -1 when none succeeded — with an `attempt` that succeeds on its third call, `attemptUntil(attempt, 5)` gives 3.",
    starter: `const attemptUntil = (attempt, limit) => {

};

// Scratch pad — change this and press Run.
let tries = 0;
console.log(attemptUntil(() => ++tries === 3, 5));
`,
    skeleton: `const attemptUntil = (attempt, limit) => {
  let calls = /* none yet */;
  let succeeded;

  do {
    // count this call and run the attempt
  } while (/* still failing and under the limit */);

  return /* the count, or -1 */;
};`,
    hints: ["A do…while runs its body before it ever looks at the condition, which is exactly right when the first attempt must always happen; the condition then needs both not yet succeeded and calls still under the limit."],
    approach: [
      "Keep a call counter and a flag for the latest result.",
      "Use do…while so the body runs at least once: count the call, run the attempt and store what it returned.",
      "Continue only while the attempt failed and the counter is still below the limit.",
      "After the loop, return the counter when the flag says success and -1 otherwise.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "attemptUntil((() => { let calls = 0; return () => ++calls === 3; })(), 5)", expected: 3 },
      { call: "attemptUntil(() => true, 5)", expected: 1 },
      { call: "attemptUntil(() => false, 4)", expected: -1, label: "gives up after the limit", edge: true },
      { call: "attemptUntil((() => { let calls = 0; return () => ++calls === 4; })(), 4)", expected: 4, label: "success on the last allowed call still counts", edge: true },
      { call: "attemptUntil((() => { let calls = 0; return () => ++calls === 2; })(), 1)", expected: -1, label: "a limit of one allows exactly one call", edge: true },
    ],
  },
  {
    id: "js-join-with-for-of",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 1,
    focus: ["for-of", "strings"],
    title: "Join with for-of",
    prompt: "Write `joinWords(words, separator)`, building one string with the separator between neighbouring words using a `for…of` loop rather than `join`. `joinWords([\"a\", \"b\", \"c\"], \"-\")` gives `\"a-b-c\"`. A single word gets no separator, and an empty array gives an empty string.",
    starter: `const joinWords = (words, separator) => {

};

// Scratch pad — change this and press Run.
console.log(joinWords(["a", "b", "c"], "-"));
`,
    skeleton: `const joinWords = (words, separator) => {
  let result = "";
  let first = true;

  for (/* each word */) {
    // add the separator before every word except the first, then the word
  }

  return result;
};`,
    hints: ["Add a separator before every word except the first, and a flag or counter tells you which one is first."],
    approach: [
      "Start with an empty result string and a flag that says no word has been added yet.",
      "Walk the words with for-of: add the separator only when a word has already been added, then add the word and clear the flag.",
      "Return the result; with no words the loop never runs and the empty string comes back.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "joinWords([\"a\",\"b\",\"c\"], \"-\")", expected: "a-b-c" },
      { call: "joinWords([\"hello\",\"world\"], \" \")", expected: "hello world" },
      { call: "joinWords([], \",\")", expected: "", label: "empty input gives an empty string", edge: true },
      { call: "joinWords([\"solo\"], \", \")", expected: "solo", label: "a single word gets no separator", edge: true },
      { call: "joinWords([\"a\",\"b\"], \"\")", expected: "ab", label: "an empty separator", edge: true },
    ],
  },
  {
    id: "js-number-items",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 1,
    focus: ["for-of", "destructuring"],
    title: "Number the items",
    prompt: "Write `numberItems(items)`, returning a new array where each item becomes a string of its one-based position, a dot, a space and the item, using `for…of` over `items.entries()` so the loop hands you the index and the value together. `numberItems([\"milk\", \"eggs\"])` gives `[\"1. milk\", \"2. eggs\"]`, and an empty array gives an empty array.",
    starter: `const numberItems = items => {

};

// Scratch pad — change this and press Run.
console.log(numberItems(["milk", "eggs"]));
`,
    skeleton: `const numberItems = items => {
  const result = [];

  for (/* [index, item] of the entries */) {
    // push the one-based number, a dot, a space and the item
  }

  return result;
};`,
    hints: ["for-of alone gives you the value; ask the array for its entries and each turn hands you the index and the value together."],
    approach: [
      "Create an empty result array.",
      "Loop with for-of over the array's entries, taking the index and the value from each pair.",
      "Push the one-based number, a dot, a space and the value as one string, then return the result.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "numberItems([\"milk\",\"eggs\"])", expected: ["1. milk", "2. eggs"] },
      { call: "numberItems([\"a\",\"b\",\"c\"])", expected: ["1. a", "2. b", "3. c"] },
      { call: "numberItems([])", expected: [], label: "empty input", edge: true },
      { call: "numberItems([\"only\"])", expected: ["1. only"], label: "a single item is number one", edge: true },
      { call: "numberItems([5, 6])", expected: ["1. 5", "2. 6"], label: "numbers are written into the string", edge: true },
    ],
  },
  {
    id: "js-times-table",
    track: "javascript",
    topic: "javascript",
    level: 6,
    tier: 2,
    focus: ["nested-loops", "for"],
    title: "Times table",
    prompt: "Write `timesTable(size)`, returning a square table as an array of rows, where the cell in row r and column c (both counted from 1) holds r times c, built with one `for` loop nested inside another. `timesTable(3)` gives `[[1, 2, 3], [2, 4, 6], [3, 6, 9]]`. `timesTable(0)` gives an empty array.",
    starter: `const timesTable = size => {

};

// Scratch pad — change this and press Run.
console.log(timesTable(3));
`,
    skeleton: `const timesTable = size => {
  const table = [];

  for (/* each row from 1 to size */) {
    const cells = [];
    for (/* each column from 1 to size */) {
      // push the product for this cell
    }
    // add the finished row
  }

  return table;
};`,
    hints: ["One loop makes the rows and, inside it, a second loop fills each row cell by cell — build a fresh row array on every pass of the outer loop."],
    approach: [
      "Create an empty table.",
      "Loop the row number from one up to the size; inside, create a fresh empty row.",
      "In an inner loop, walk the column number from one to the size and push row times column into the row.",
      "Push the completed row into the table after the inner loop, and return the table at the end.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "timesTable(3)", expected: [[1, 2, 3], [2, 4, 6], [3, 6, 9]] },
      { call: "timesTable(2)", expected: [[1, 2], [2, 4]] },
      { call: "timesTable(0)", expected: [], label: "a size of zero gives an empty table", edge: true },
      { call: "timesTable(1)", expected: [[1]], label: "a single cell", edge: true },
      { call: "timesTable(4)[3]", expected: [4, 8, 12, 16], label: "the last row", edge: true },
    ],
  },
  {
    id: "js-some-and-every",
    track: "javascript",
    topic: "javascript",
    level: 7,
    tier: 1,
    focus: ["some", "every"],
    title: "Any and all",
    prompt: "Write `passReport(scores, passMark)`, returning `{ anyPassed, allPassed }`: whether at least one score reaches the pass mark, answered with `some`, and whether every score does, answered with `every`. `passReport([40, 70], 50)` gives `{ anyPassed: true, allPassed: false }`. The pass mark itself passes, and for an empty list `some` says false while `every` says true.",
    starter: `const passReport = (scores, passMark) => {

};

// Scratch pad — change this and press Run.
console.log(passReport([40, 70], 50));
`,
    skeleton: `const passReport = (scores, passMark) => ({
  anyPassed: /* does some score reach the mark */,
  allPassed: /* does every score reach the mark */,
});`,
    hints: ["Two questions about the same condition — does at least one score reach the mark, and do they all — and each has an array method that answers with a boolean."],
    approach: [
      "Write the condition once: a score counts when it is at least the pass mark.",
      "Ask some whether any score meets it and every whether all of them do.",
      "Return both answers in an object; on an empty list some says false and every says true, which is what the task expects.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "passReport([40,70], 50)", expected: { anyPassed: true, allPassed: false } },
      { call: "passReport([60,70], 50)", expected: { anyPassed: true, allPassed: true } },
      { call: "passReport([10,20], 50)", expected: { anyPassed: false, allPassed: false } },
      { call: "passReport([], 50)", expected: { anyPassed: false, allPassed: true }, label: "an empty list: nothing passed, and nothing failed either", edge: true },
      { call: "passReport([50], 50)", expected: { anyPassed: true, allPassed: true }, label: "the pass mark itself passes", edge: true },
    ],
  },
  {
    id: "js-locate-item",
    track: "javascript",
    topic: "javascript",
    level: 7,
    tier: 1,
    focus: ["includes", "indexOf"],
    title: "Locate an item",
    prompt: "Write `locate(list, item)`, returning `{ present, index }`: whether the item is in the list, answered with `includes`, and the position of its first appearance, answered with `indexOf`, which is -1 when it is missing. `locate([\"a\", \"b\", \"c\"], \"b\")` gives `{ present: true, index: 1 }`. Both methods compare strictly, so the string `\"1\"` never matches the number 1.",
    starter: `const locate = (list, item) => {

};

// Scratch pad — change this and press Run.
console.log(locate(["a", "b", "c"], "b"));
`,
    skeleton: `const locate = (list, item) => ({
  present: /* is the item in the list */,
  index: /* where it first appears, or -1 */,
});`,
    hints: ["One method answers whether the item is there at all, the other tells you where it first appears and uses -1 for nowhere."],
    approach: [
      "Use includes for the boolean, since it says plainly whether the item is in the list.",
      "Use indexOf for the position; it gives the first match and -1 when there is none.",
      "Return both in an object with the keys the task names.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "locate([\"a\",\"b\",\"c\"], \"b\")", expected: { present: true, index: 1 } },
      { call: "locate([1,2,3], 3)", expected: { present: true, index: 2 } },
      { call: "locate([\"a\"], \"z\")", expected: { present: false, index: -1 }, label: "a missing item", edge: true },
      { call: "locate([], 1)", expected: { present: false, index: -1 }, label: "empty list", edge: true },
      { call: "locate([5,6,5], 5)", expected: { present: true, index: 0 }, label: "the first position wins", edge: true },
      { call: "locate([1,2], \"1\")", expected: { present: false, index: -1 }, label: "strict comparison", edge: true },
    ],
  },
  {
    id: "js-remove-by-id",
    track: "javascript",
    topic: "javascript",
    level: 7,
    tier: 2,
    focus: ["findIndex", "splice"],
    title: "Remove by id",
    prompt: "Write `removeById(items, id)`, removing the first object whose `id` equals the given id from the array in place and returning the removed object, or `null` when no object matches — in which case the array is left untouched. Find the position with `findIndex`, then take the object out with `splice`. With `items = [{ id: 1 }, { id: 2 }]`, `removeById(items, 2)` returns `{ id: 2 }` and leaves `items` as `[{ id: 1 }]`.",
    starter: `const removeById = (items, id) => {

};

// Scratch pad — change this and press Run.
const items = [{ id: 1 }, { id: 2 }];
console.log(removeById(items, 2), items);
`,
    skeleton: `const removeById = (items, id) => {
  const index = /* position of the first matching id */;
  if (/* nothing matched */) return null;
  return /* the single object splice removed */;
};`,
    hints: ["Find the position first, and treat -1 as not found before you splice — splicing at -1 would quietly remove the last element."],
    approach: [
      "Use findIndex with a callback that compares each object's id with the wanted one.",
      "When it returns -1, nothing matched: return null and leave the array alone.",
      "Otherwise splice one element at that index and return the single object from the array splice gives back.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "(() => { const items = [{id:1,name:\"a\"},{id:2,name:\"b\"}]; const removed = removeById(items, 2); return [removed, items]; })()", expected: [{ id: 2, name: "b" }, [{ id: 1, name: "a" }]] },
      { call: "(() => { const items = [{id:5},{id:6},{id:7}]; removeById(items, 6); return items; })()", expected: [{ id: 5 }, { id: 7 }] },
      { call: "(() => { const items = [{id:1},{id:2}]; const removed = removeById(items, 9); return [removed, items]; })()", expected: [null, [{ id: 1 }, { id: 2 }]], label: "a missing id removes nothing", edge: true },
      { call: "(() => { const items = []; return removeById(items, 1); })()", expected: null, label: "empty list", edge: true },
      { call: "(() => { const items = [{id:3},{id:3}]; removeById(items, 3); return items; })()", expected: [{ id: 3 }], label: "only the first match is removed", edge: true },
    ],
  },
  {
    id: "js-highest-with-reduce",
    track: "javascript",
    topic: "javascript",
    level: 8,
    tier: 1,
    focus: ["reduce"],
    title: "Highest with reduce",
    prompt: "Write `highest(numbers)`, returning the largest value using `reduce`, with the accumulator holding the best value seen so far. `highest([3, 9, 2])` gives 9. It must work when every value is negative, and an empty array gives `null` — `reduce` with no initial value throws on one, so decide that case first.",
    starter: `const highest = numbers => {

};

// Scratch pad — change this and press Run.
console.log(highest([3, 9, 2]));
`,
    skeleton: `const highest = numbers => {
  if (/* nothing to compare */) return null;
  return numbers.reduce((best, number) => {
    return /* the larger of best and number */;
  });
};`,
    hints: ["Let the accumulator be the best value so far; without an initial value reduce starts from the first element, which sidesteps the trap of starting from zero when everything is negative."],
    approach: [
      "Return null straight away for an empty array, because reduce with no initial value throws on one.",
      "Reduce with an accumulator that holds the best value so far, starting from the first element.",
      "At each step keep whichever of the accumulator and the current number is larger.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "highest([3,9,2])", expected: 9 },
      { call: "highest([1,2,3])", expected: 3 },
      { call: "highest([-5,-2,-9])", expected: -2, label: "all negative", edge: true },
      { call: "highest([])", expected: null, label: "empty input gives null", edge: true },
      { call: "highest([4])", expected: 4, label: "single value", edge: true },
    ],
  },
  {
    id: "js-count-by-key",
    track: "javascript",
    topic: "javascript",
    level: 8,
    tier: 2,
    focus: ["reduce", "objects"],
    title: "Count by key",
    prompt: "Write `countBy(items, keyFn)`, returning an object that maps each key `keyFn` returns to how many items produced it, built with `reduce` starting from an empty object. `countBy([\"apple\", \"avocado\", \"banana\"], word => word[0])` gives `{ a: 2, b: 1 }`. An empty array gives an empty object, and a numeric key becomes a string key as object keys always do.",
    starter: `const countBy = (items, keyFn) => {

};

// Scratch pad — change this and press Run.
console.log(countBy(["apple", "avocado", "banana"], word => word[0]));
`,
    skeleton: `const countBy = (items, keyFn) =>
  items.reduce((counts, item) => {
    // read the key, then store its previous count plus one
    return counts;
  }, /* initial value */);`,
    hints: ["Reduce into an object that starts empty, and for each item read the current count for its key — treating a missing key as zero — before storing one more."],
    approach: [
      "Reduce with an empty object as the initial value.",
      "For each item ask the key function which key it belongs to.",
      "Store the previous count for that key plus one, falling back to zero when the key is new, and return the object so the next step gets it.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "countBy([\"apple\",\"avocado\",\"banana\"], word => word[0])", expected: { a: 2, b: 1 } },
      { call: "countBy([1,2,3,4,5], n => n % 2 === 0 ? \"even\" : \"odd\")", expected: { odd: 3, even: 2 } },
      { call: "countBy([], item => item)", expected: {}, label: "empty input gives an empty object", edge: true },
      { call: "countBy([3,3,3], n => n)", expected: { "3": 3 }, label: "keys become strings", edge: true },
      { call: "countBy([\"x\"], () => \"all\")", expected: { all: 1 }, label: "a single item", edge: true },
    ],
  },
  {
    id: "js-running-totals",
    track: "javascript",
    topic: "javascript",
    level: 8,
    tier: 2,
    focus: ["reduce"],
    title: "Running totals",
    prompt: "Write `runningTotals(numbers)`, returning a new array where each position holds the sum of every number up to and including that position, built with `reduce` whose accumulator is the output array. `runningTotals([1, 2, 3, 4])` gives `[1, 3, 6, 10]`. An empty array gives an empty array, and the input is not changed.",
    starter: `const runningTotals = numbers => {

};

// Scratch pad — change this and press Run.
console.log(runningTotals([1, 2, 3, 4]));
`,
    skeleton: `const runningTotals = numbers =>
  numbers.reduce((totals, number) => {
    // read the last total, or zero when there is none, then push the next one
    return totals;
  }, /* initial value */);`,
    hints: ["The accumulator can be the output array itself: the next total is the last one already in it, or zero when it is still empty, plus the current number."],
    approach: [
      "Reduce with an empty array as the accumulator.",
      "At each step read the last total already in the accumulator, or zero when there is none.",
      "Push that total plus the current number and return the accumulator.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "runningTotals([1,2,3,4])", expected: [1, 3, 6, 10] },
      { call: "runningTotals([5,5,5])", expected: [5, 10, 15] },
      { call: "runningTotals([])", expected: [], label: "empty input", edge: true },
      { call: "runningTotals([3,-3,3])", expected: [3, 0, 3], label: "negatives bring the total back down", edge: true },
      { call: "runningTotals([7])", expected: [7], label: "a single value is its own total", edge: true },
    ],
  },
  {
    id: "js-apply-all",
    track: "javascript",
    topic: "javascript",
    level: 8,
    tier: 2,
    focus: ["reduce", "higher-order"],
    title: "Reduce as a pipeline",
    prompt: "Write `applyAll(value, steps)`, running the value through each function in `steps` from left to right and returning the final result, with `reduce` over the functions and the value as the initial accumulator. `applyAll(3, [n => n + 1, n => n * 2])` gives 8. An empty `steps` array returns the value unchanged, and a step may return a different type from the one it received.",
    starter: `const applyAll = (value, steps) => {

};

// Scratch pad — change this and press Run.
console.log(applyAll(3, [n => n + 1, n => n * 2]));
`,
    skeleton: `const applyAll = (value, steps) =>
  steps.reduce((current, step) => {
    return /* the step applied to current */;
  }, /* initial value */);`,
    hints: ["The accumulator is the value as it stands after the steps so far; each reduce step hands it to the next function and takes whatever comes back."],
    approach: [
      "Reduce over the array of functions, not over data, with the starting value as the initial accumulator.",
      "At each step call the current function with the accumulator and return its result.",
      "With no functions reduce returns the initial value untouched, which is the answer wanted.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "applyAll(3, [n => n + 1, n => n * 2])", expected: 8 },
      { call: "applyAll(\"shark\", [text => text.toUpperCase(), text => text + \"!\"])", expected: "SHARK!" },
      { call: "applyAll(5, [])", expected: 5, label: "no steps returns the input", edge: true },
      { call: "applyAll(2, [n => n * 2, n => n + 1])", expected: 5, label: "order matters, left to right", edge: true },
      { call: "applyAll([1,2,3], [list => list.filter(n => n > 1), list => list.length])", expected: 2, label: "the type can change between steps", edge: true },
    ],
  },
  {
    id: "js-swap-pairs",
    track: "javascript",
    topic: "javascript",
    level: 9,
    tier: 2,
    focus: ["destructuring", "for"],
    title: "Swap pairs",
    prompt: "Write `swapPairs(list)`, returning a new array in which every two neighbours have traded places, swapped with array destructuring inside a `for` loop that steps by two over a copy of the list. `swapPairs([1, 2, 3, 4])` gives `[2, 1, 4, 3]`. With an odd length the last item stays where it is, an empty array gives an empty array, and the input is never changed.",
    starter: `const swapPairs = list => {

};

// Scratch pad — change this and press Run.
console.log(swapPairs([1, 2, 3, 4]));
`,
    skeleton: `const swapPairs = list => {
  const result = /* a copy of list */;

  for (/* index from 0 in steps of 2, while a partner exists */) {
    // swap result[index] and result[index + 1] with destructuring
  }

  return result;
};`,
    hints: ["Copy the array first, then step through it two at a time and swap each neighbour pair with a one-line array destructuring assignment — no temporary variable needed."],
    approach: [
      "Make a copy with slice so the original is never changed.",
      "Loop with an index that starts at zero and grows by two, stopping while a partner at the next index still exists.",
      "Swap the two positions with array destructuring on the left and an array of the two values on the right.",
      "Return the copy.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "swapPairs([1,2,3,4])", expected: [2, 1, 4, 3] },
      { call: "swapPairs([\"a\",\"b\",\"c\",\"d\",\"e\",\"f\"])", expected: ["b", "a", "d", "c", "f", "e"] },
      { call: "swapPairs([1,2,3])", expected: [2, 1, 3], label: "an odd last item stays where it is", edge: true },
      { call: "swapPairs([])", expected: [], label: "empty input", edge: true },
      { call: "(() => { const list = [1,2]; swapPairs(list); return list; })()", expected: [1, 2], label: "keeps the original array unchanged", edge: true },
      { call: "swapPairs([9])", expected: [9], label: "single item", edge: true },
    ],
  },
  {
    id: "js-sum-labelled-pairs",
    track: "javascript",
    topic: "javascript",
    level: 9,
    tier: 1,
    focus: ["for-of", "destructuring"],
    title: "Sum labelled pairs",
    prompt: "Write `totalOf(pairs, label)`, where `pairs` is an array of `[label, value]` pairs, returning the total of the values whose label matches, destructured straight in the head of a `for…of` loop. `totalOf([[\"food\", 12], [\"rent\", 500], [\"food\", 8]], \"food\")` gives 20. No matching label, or an empty array, gives 0.",
    starter: `const totalOf = (pairs, label) => {

};

// Scratch pad — change this and press Run.
console.log(totalOf([["food", 12], ["rent", 500], ["food", 8]], "food"));
`,
    skeleton: `const totalOf = (pairs, label) => {
  let total = 0;

  for (/* const [name, value] of pairs */) {
    // add the value when the name matches the label
  }

  return total;
};`,
    hints: ["Each element is a two-item array, and for-of can take it apart into a name and a value right in the loop head, so the body only compares and adds."],
    approach: [
      "Start a total at zero.",
      "Loop with for-of over the pairs, destructuring each one into its label and value in the loop head.",
      "Add the value to the total when the label matches, and return the total.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "totalOf([[\"food\",12],[\"rent\",500],[\"food\",8]], \"food\")", expected: 20 },
      { call: "totalOf([[\"a\",1],[\"b\",2]], \"b\")", expected: 2 },
      { call: "totalOf([], \"a\")", expected: 0, label: "empty input", edge: true },
      { call: "totalOf([[\"a\",1]], \"z\")", expected: 0, label: "no matching label", edge: true },
      { call: "totalOf([[\"x\",-5],[\"x\",5]], \"x\")", expected: 0, label: "negatives cancel out", edge: true },
    ],
  },
  {
    id: "js-immutable-list-edits",
    track: "javascript",
    topic: "javascript",
    level: 10,
    tier: 2,
    focus: ["spread", "slice"],
    title: "Immutable list edits",
    prompt: "Write `withInserted(list, index, item)`, `withoutIndex(list, index)` and `withReplaced(list, index, item)`. Each returns a new array built from two `slice` copies spread into a fresh array literal, and never changes the array it was given. `withInserted([1, 3], 1, 2)` gives `[1, 2, 3]`, `withoutIndex([1, 2, 3], 0)` gives `[2, 3]`, and `withReplaced([1, 2, 3], 2, 9)` gives `[1, 2, 9]`.",
    starter: `const withInserted = (list, index, item) => {

};

const withoutIndex = (list, index) => {

};

const withReplaced = (list, index, item) => {

};

// Scratch pad — change this and press Run.
console.log(withInserted([1, 3], 1, 2), withoutIndex([1, 2, 3], 0), withReplaced([1, 2, 3], 2, 9));
`,
    skeleton: `const withInserted = (list, index, item) => [
  /* ...everything before index */, item, /* ...everything from index on */
];

const withoutIndex = (list, index) => [
  /* ...everything before index */, /* ...everything after index */
];

const withReplaced = (list, index, item) => [
  /* ...everything before index */, item, /* ...everything after index */
];`,
    hints: ["slice gives you the part before the index and the part from or after it, and spreading those two pieces into a new array literal — with or without the item between them — is the whole trick."],
    approach: [
      "For each function, slice the part of the list before the index; slice never touches the original.",
      "Slice the tail too: from the index itself when inserting, or from one past it when removing or replacing.",
      "Spread the head and tail into a new array literal, putting the item between them for insert and replace.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "withInserted([1,3], 1, 2)", expected: [1, 2, 3] },
      { call: "withoutIndex([1,2,3], 0)", expected: [2, 3] },
      { call: "withReplaced([1,2,3], 2, 9)", expected: [1, 2, 9] },
      { call: "(() => { const list = [1,2,3]; withInserted(list, 0, 0); withoutIndex(list, 1); withReplaced(list, 1, 5); return list; })()", expected: [1, 2, 3], label: "keeps the original array unchanged", edge: true },
      { call: "withInserted([1,2], 2, 3)", expected: [1, 2, 3], label: "inserting at the end appends", edge: true },
      { call: "withoutIndex([1], 0)", expected: [], label: "removing the only item", edge: true },
    ],
  },
  {
    id: "js-variadic-sum",
    track: "javascript",
    topic: "javascript",
    level: 10,
    tier: 1,
    focus: ["spread", "for-of"],
    title: "Variadic sum",
    prompt: "Write `sumAll(...numbers)`, taking any number of arguments through a rest parameter and returning their total from a `for…of` loop over that array. `sumAll(1, 2, 3)` gives 6. With no arguments the total is 0, and an array can be spread into the call: `sumAll(...[4, 5])` gives 9.",
    starter: `const sumAll = () => {

};

// Scratch pad — change this and press Run.
console.log(sumAll(1, 2, 3));
`,
    skeleton: `const sumAll = (/* ...numbers */) => {
  let total = 0;

  for (/* each number */) {
    // add it to the total
  }

  return total;
};`,
    hints: ["A rest parameter gathers however many arguments arrive into one real array, and from there it is an ordinary for-of total."],
    approach: [
      "Declare the parameter with three dots so every argument is collected into an array.",
      "Start a total at zero and walk the array with for-of, adding each number.",
      "Return the total; with no arguments the array is empty and the total stays zero.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "sumAll(1, 2, 3)", expected: 6 },
      { call: "sumAll(10, 20)", expected: 30 },
      { call: "sumAll()", expected: 0, label: "no arguments at all", edge: true },
      { call: "sumAll(...[4, 5])", expected: 9, label: "an array spread into the call", edge: true },
      { call: "sumAll(-1, 1, 0.5)", expected: 0.5, label: "negatives and decimals", edge: true },
    ],
  },
  {
    id: "js-make-tally",
    track: "javascript",
    topic: "javascript",
    level: 11,
    tier: 2,
    focus: ["functions", "closures", "for-of"],
    title: "Tally factory",
    prompt: "Write `makeTally(start)`, returning a function that keeps a running total in the factory’s scope: each call takes any number of values, loops over them adding each to the total, and returns the new total. With `tally = makeTally(10)`, `tally(1, 2)` gives 13 and a later `tally(5)` gives 18. A call with no values returns the total as it is, and two tallies never share a total.",
    starter: `const makeTally = start => {

};

// Scratch pad — uncomment once your function returns something.
// const tally = makeTally(10);
// console.log(tally(1, 2));
`,
    skeleton: `const makeTally = start => {
  let total = /* the starting value, kept in this scope */;

  return (/* ...values */) => {
    // loop over the values adding each to total
    return total;
  };
};`,
    hints: ["The total lives in the factory’s scope, the returned function is the only thing that can reach it, and inside that function a loop over the rest parameter does the adding."],
    approach: [
      "Inside the factory declare a variable holding the start value.",
      "Return an arrow function that gathers its arguments with a rest parameter.",
      "Inside it, loop over the values adding each to the outer variable, then return the variable — it survives between calls because the returned function still refers to it.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "(() => { const tally = makeTally(10); return tally(1, 2); })()", expected: 13 },
      { call: "(() => { const tally = makeTally(0); tally(5); return tally(5); })()", expected: 10 },
      { call: "(() => { const tally = makeTally(3); return tally(); })()", expected: 3, label: "no values leaves the total as it is", edge: true },
      { call: "(() => { const a = makeTally(0); const b = makeTally(100); a(1); return [a(1), b(1)]; })()", expected: [2, 101], label: "each tally keeps its own total", edge: true },
      { call: "(() => { const tally = makeTally(0); tally(1, 2, 3, 4); return tally(-10); })()", expected: 0, label: "negatives count too", edge: true },
    ],
  },
  {
    id: "js-handlers-keep-index",
    track: "javascript",
    topic: "javascript",
    level: 13,
    tier: 2,
    focus: ["for", "closures"],
    title: "Handlers keep their index",
    prompt: "Write `makeHandlers(count)`, returning an array of `count` functions built in a `for` loop whose counter is declared with `let`, so that the function at position i returns i when called — the way click handlers made in a loop each remember their own index. `makeHandlers(3).map(handler => handler())` gives `[0, 1, 2]`. A count of zero gives an empty array.",
    starter: `const makeHandlers = count => {

};

// Scratch pad — change this and press Run.
console.log(makeHandlers(3).map(handler => handler()));
`,
    skeleton: `const makeHandlers = count => {
  const handlers = [];

  for (/* let index from 0 while below count */) {
    // push a function that returns this pass's index
  }

  return handlers;
};`,
    hints: ["Declare the loop variable with let: each pass of the loop then gets its own binding, so a function created inside remembers that pass’s index instead of the final value."],
    approach: [
      "Create an empty array for the handlers.",
      "Write a for loop whose counter is declared with let, running from zero while below the count.",
      "On each pass push an arrow function that returns the counter — thanks to let, every function keeps the value from its own pass.",
      "Return the array.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "makeHandlers(3).map(handler => handler())", expected: [0, 1, 2] },
      { call: "makeHandlers(1)[0]()", expected: 0 },
      { call: "makeHandlers(0)", expected: [], label: "zero handlers", edge: true },
      { call: "(() => { const handlers = makeHandlers(4); return handlers[3](); })()", expected: 3, label: "the last handler remembers the last index", edge: true },
      { call: "(() => { const handlers = makeHandlers(2); return [handlers[0](), handlers[0](), handlers[1]()]; })()", expected: [0, 0, 1], label: "calling again gives the same index", edge: true },
    ],
  },
  {
    id: "js-my-map-filter",
    track: "javascript",
    topic: "javascript",
    level: 15,
    tier: 3,
    focus: ["higher-order", "for", "callbacks"],
    title: "Write myMap and myFilter",
    prompt: "Write `myMap(list, fn)` and `myFilter(list, fn)` with plain `for` loops instead of the built-in `map` and `filter`. `myMap` returns a new array of `fn(item, index)` results, and `myFilter` returns a new array of the items for which `fn(item, index)` is truthy; neither changes the list. `myMap([1, 2, 3], n => n * 2)` gives `[2, 4, 6]` and `myFilter([1, 2, 3, 4], n => n % 2 === 0)` gives `[2, 4]`.",
    starter: `const myMap = (list, fn) => {

};

const myFilter = (list, fn) => {

};

// Scratch pad — change this and press Run.
console.log(myMap([1, 2, 3], n => n * 2), myFilter([1, 2, 3, 4], n => n % 2 === 0));
`,
    skeleton: `const myMap = (list, fn) => {
  const result = [];
  for (/* each index */) {
    // push what fn returns for the item and its index
  }
  return result;
};

const myFilter = (list, fn) => {
  const result = [];
  for (/* each index */) {
    // push the item itself when fn says yes
  }
  return result;
};`,
    hints: ["Both are a loop that calls the callback with the item and its index; map pushes whatever comes back, filter pushes the item only when what comes back is truthy."],
    approach: [
      "Start each function with an empty result array.",
      "Loop with an index over the list and call the callback with the item and the index.",
      "In myMap push the callback’s return value; in myFilter push the original item only when the return value is truthy.",
      "Return the result — the input list is only read.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "myMap([1,2,3], n => n * 2)", expected: [2, 4, 6] },
      { call: "myFilter([1,2,3,4], n => n % 2 === 0)", expected: [2, 4] },
      { call: "myMap([], n => n)", expected: [], label: "empty input to myMap", edge: true },
      { call: "myFilter([1,2], () => false)", expected: [], label: "nothing kept", edge: true },
      { call: "myMap([\"a\",\"b\"], (item, index) => item + index)", expected: ["a0", "b1"], label: "the callback receives the index too", edge: true },
      { call: "(() => { const list = [1,2,3]; myMap(list, n => n); myFilter(list, n => n > 1); return list; })()", expected: [1, 2, 3], label: "keeps the original array unchanged", edge: true },
    ],
  },
  {
    id: "js-my-reduce",
    track: "javascript",
    topic: "javascript",
    level: 15,
    tier: 3,
    focus: ["higher-order", "for", "callbacks"],
    title: "Write myReduce",
    prompt: "Write `myReduce(list, fn, initial)` with a plain `for` loop instead of the built-in `reduce`: call `fn(accumulator, item, index)` for each item, starting the accumulator at `initial`, and return the final accumulator. When `initial` is `undefined`, the first item becomes the starting accumulator and the loop begins at the second. `myReduce([1, 2, 3], (total, n) => total + n, 0)` gives 6, and an empty list with an initial value returns that value.",
    starter: `const myReduce = (list, fn, initial) => {

};

// Scratch pad — change this and press Run.
console.log(myReduce([1, 2, 3], (total, n) => total + n, 0));
`,
    skeleton: `const myReduce = (list, fn, initial) => {
  let accumulator = initial;
  let start = 0;
  if (/* no initial value and the list has items */) {
    // take the first item as the accumulator and start at 1
  }

  for (/* index from start */) {
    // replace the accumulator with what fn returns
  }

  return accumulator;
};`,
    hints: ["Keep the accumulator in a variable, decide where the loop starts by whether an initial value was given, and let each pass replace the accumulator with the callback’s result."],
    approach: [
      "Put the initial value into an accumulator variable and plan to start the loop at index zero.",
      "When no initial value was given, take the first item as the accumulator and start the loop at index one instead.",
      "Loop over the remaining items, replacing the accumulator with what the callback returns for the accumulator, the item and the index.",
      "Return the accumulator after the loop.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "myReduce([1,2,3], (total, n) => total + n, 0)", expected: 6 },
      { call: "myReduce([\"a\",\"b\",\"c\"], (text, letter) => text + letter, \"\")", expected: "abc" },
      { call: "myReduce([], (total, n) => total + n, 10)", expected: 10, label: "an empty list returns the initial value", edge: true },
      { call: "myReduce([5,6,7], (best, n) => n > best ? n : best)", expected: 7, label: "without an initial value the first item starts the accumulator", edge: true },
      { call: "myReduce([2,3], (total, n, index) => total + n * index, 0)", expected: 3, label: "the callback receives the index", edge: true },
    ],
  },
  {
    id: "js-label-numbers",
    track: "javascript",
    topic: "javascript",
    level: 16,
    tier: 1,
    focus: ["map"],
    title: "Label numbers",
    prompt: "Write `labelNumbers(numbers)`, returning a new array with the string `\"positive\"`, `\"negative\"` or `\"zero\"` for each number, decided by a ternary inside the `map` callback. `labelNumbers([3, -1, 0])` gives `[\"positive\", \"negative\", \"zero\"]`. An empty array gives an empty array.",
    starter: `const labelNumbers = numbers => {

};

// Scratch pad — change this and press Run.
console.log(labelNumbers([3, -1, 0]));
`,
    skeleton: `const labelNumbers = numbers =>
  numbers.map(number =>
    /* above zero */ ? "positive" : /* below zero */ ? "negative" : "zero"
  );`,
    hints: ["A ternary is an expression, so it can be the whole body of the map callback, and a second ternary in its else branch decides the third label."],
    approach: [
      "Map over the numbers, returning one string per number.",
      "In the callback use a ternary: above zero gives positive, otherwise a second ternary decides between negative and zero.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "labelNumbers([3,-1,0])", expected: ["positive", "negative", "zero"] },
      { call: "labelNumbers([10,20])", expected: ["positive", "positive"] },
      { call: "labelNumbers([])", expected: [], label: "empty input", edge: true },
      { call: "labelNumbers([0])", expected: ["zero"], label: "zero is neither positive nor negative", edge: true },
      { call: "labelNumbers([-0.5])", expected: ["negative"], label: "a small negative decimal", edge: true },
    ],
  },
  {
    id: "js-sum-mixed-values",
    track: "javascript",
    topic: "javascript",
    level: 17,
    tier: 1,
    focus: ["for-of"],
    title: "Sum mixed values",
    prompt: "Write `sumMixed(values)`, returning the numeric total of an array that mixes numbers with numeric strings such as `\"4\"` or `\"2.5\"`, converting each value with `Number` inside a `for…of` loop before adding it. `sumMixed([1, \"2\", 3])` gives 6, a number, not `\"123\"`. An empty array gives 0.",
    starter: `const sumMixed = values => {

};

// Scratch pad — change this and press Run.
console.log(sumMixed([1, "2", 3]));
`,
    skeleton: `const sumMixed = values => {
  let total = 0;

  for (/* each value */) {
    // convert the value to a number before adding it
  }

  return total;
};`,
    hints: ["Plus with a string on one side glues text together, so convert each value to a number before adding it."],
    approach: [
      "Start a total at zero, which also fixes the type of the result as a number.",
      "Loop with for-of and convert each value with Number before adding it to the total.",
      "Return the total.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "sumMixed([1,\"2\",3])", expected: 6 },
      { call: "sumMixed([\"10\",\"20\"])", expected: 30 },
      { call: "sumMixed([])", expected: 0, label: "empty input returns 0", edge: true },
      { call: "sumMixed([\"1.5\", 1.5])", expected: 3, label: "decimal strings", edge: true },
      { call: "sumMixed([\"-4\", 4])", expected: 0, label: "a negative in a string", edge: true },
    ],
  },
  {
    id: "js-compact-values",
    track: "javascript",
    topic: "javascript",
    level: 18,
    tier: 1,
    focus: ["for-of", "filter"],
    title: "Compact an array",
    prompt: "Write `compactLoop(values)` and `compactFilter(values)`, both returning a new array with every falsy value removed — `false`, `0`, `\"\"`, `null`, `undefined` and `NaN` — and leaving the input unchanged. The first uses a `for…of` loop with an `if` on the value itself; the second passes `Boolean` straight to `filter`. `compactLoop([0, 1, \"\", \"a\", null])` gives `[1, \"a\"]`.",
    starter: `const compactLoop = values => {

};

const compactFilter = values => {

};

// Scratch pad — change this and press Run.
console.log(compactLoop([0, 1, "", "a", null]), compactFilter([0, 1, "", "a", null]));
`,
    skeleton: `const compactLoop = values => {
  const result = [];
  for (/* each value */) {
    // keep the value when it is truthy
  }
  return result;
};

const compactFilter = values => values.filter(/* the function that answers truthy or falsy */);`,
    hints: ["Any value can be asked directly whether it is truthy in an if, and the Boolean function asks the same question as a callback, so filter can take it as it is."],
    approach: [
      "In the loop version, push a value into a fresh array only when the value itself passes the if test.",
      "In the filter version, pass the Boolean function straight to filter; it returns true for truthy values and false for falsy ones.",
      "Neither version changes the input.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "compactLoop([0,1,\"\",\"a\",null])", expected: [1, "a"] },
      { call: "compactFilter([0,1,\"\",\"a\",null])", expected: [1, "a"] },
      { call: "compactLoop([])", expected: [], label: "empty input", edge: true },
      { call: "compactFilter([false, undefined, NaN])", expected: [], label: "everything falsy", edge: true },
      { call: "compactLoop([\"0\", [], {}, \" \"])", expected: ["0", [], {}, " "], label: "a string zero, an empty array, an empty object and a space are all truthy", edge: true },
      { call: "(() => { const values = [0, 1]; compactLoop(values); compactFilter(values); return values; })()", expected: [0, 1], label: "keeps the original array unchanged", edge: true },
    ],
  },
  {
    id: "js-count-nested-keys",
    track: "javascript",
    topic: "javascript",
    level: 19,
    tier: 3,
    focus: ["for-in", "objects", "recursion"],
    title: "Count nested keys",
    prompt: "Write `countKeys(object)`, returning how many keys the object holds at every depth, visited with `for…in`: each key counts one, and when its value is a plain object its keys are counted the same way. `countKeys({ a: 1, b: { c: 2, d: { e: 3 } } })` gives 5. `null` and arrays count as plain values, and an empty object gives 0.",
    starter: `const countKeys = object => {

};

// Scratch pad — change this and press Run.
console.log(countKeys({ a: 1, b: { c: 2, d: { e: 3 } } }));
`,
    skeleton: `const countKeys = object => {
  let count = 0;

  for (/* each key in object */) {
    // count the key
    // when the value is a plain object, add its own key count
  }

  return count;
};`,
    hints: ["for-in visits each key, so count one per visit, and when the value under a key is itself a plain object, count its keys the same way by calling your function on it."],
    approach: [
      "Start a count at zero and loop with for-in over the object’s keys.",
      "Add one for every key visited.",
      "Look at the value under the key: when it is a plain object — not null and not an array — add the result of counting its keys with the same function.",
      "Return the count.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "countKeys({a:1,b:{c:2,d:{e:3}}})", expected: 5 },
      { call: "countKeys({name:\"Ana\",age:3})", expected: 2 },
      { call: "countKeys({})", expected: 0, label: "an empty object has no keys", edge: true },
      { call: "countKeys({a:{}})", expected: 1, label: "an empty nested object adds nothing", edge: true },
      { call: "countKeys({a:null,b:[1,2,3]})", expected: 2, label: "null and arrays count as plain values", edge: true },
      { call: "countKeys({a:{b:{c:{d:1}}}})", expected: 4, label: "deep nesting", edge: true },
    ],
  },
  {
    id: "js-order-total",
    track: "javascript",
    topic: "javascript",
    level: 20,
    tier: 1,
    focus: ["for-of", "objects"],
    title: "Total with defaults",
    prompt: "Write `orderTotal(items)`, returning the total of `price` times `quantity` over every item, where a missing or `null` quantity means 1 — supplied with `??` inside a `for…of` loop. `orderTotal([{ price: 5 }, { price: 2, quantity: 3 }])` gives 11. A quantity of 0 is a real quantity and contributes nothing, and an empty order totals 0.",
    starter: `const orderTotal = items => {

};

// Scratch pad — change this and press Run.
console.log(orderTotal([{ price: 5 }, { price: 2, quantity: 3 }]));
`,
    skeleton: `const orderTotal = items => {
  let total = 0;

  for (/* each item */) {
    // read the quantity with a nullish default of 1, then add price times quantity
  }

  return total;
};`,
    hints: ["The nullish operator supplies a default only for null and undefined, which is exactly why a quantity of zero survives it where the or operator would replace it."],
    approach: [
      "Start a total at zero and loop over the items with for-of.",
      "Read the quantity with a nullish fallback of one, so only a missing or null quantity gets the default.",
      "Add price times quantity to the total and return it.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "orderTotal([{price:5},{price:2,quantity:3}])", expected: 11 },
      { call: "orderTotal([{price:10,quantity:2}])", expected: 20 },
      { call: "orderTotal([])", expected: 0, label: "an empty order", edge: true },
      { call: "orderTotal([{price:4,quantity:0}])", expected: 0, label: "a quantity of zero is zero, not the default", edge: true },
      { call: "orderTotal([{price:3,quantity:null}])", expected: 3, label: "a null quantity falls back to one", edge: true },
    ],
  },
  {
    id: "js-frequency-map",
    track: "javascript",
    topic: "javascript",
    level: 23,
    tier: 2,
    focus: ["map-set", "for-of"],
    title: "Frequency Map",
    prompt: "Write `frequencies(values)`, returning a `Map` from each distinct value to how many times it appears, filled with `for…of` in first-seen order. `frequencies([\"a\", \"b\", \"a\"])` gives a Map with `\"a\"` → 2 and `\"b\"` → 1. Keys keep their type, so the number 1 and the string `\"1\"` are separate entries, and an empty array gives an empty Map.",
    starter: `const frequencies = values => {

};

// Scratch pad — change this and press Run.
console.log(frequencies(["a", "b", "a"]));
`,
    skeleton: `const frequencies = values => {
  const counts = new Map();

  for (/* each value */) {
    // set the count to the current count, or zero, plus one
  }

  return counts;
};`,
    hints: ["Read the current count with get, treat a missing one as zero, and write it back with set — a Map keeps the keys’ real types and their first-seen order."],
    approach: [
      "Create an empty Map.",
      "Loop with for-of over the values; for each, get its current count, fall back to zero, and set the count plus one.",
      "Return the Map itself.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "[...frequencies([\"a\",\"b\",\"a\"])]", expected: [["a", 2], ["b", 1]] },
      { call: "[...frequencies([3,3,3,1])]", expected: [[3, 3], [1, 1]] },
      { call: "frequencies([]).size", expected: 0, label: "empty input gives an empty Map", edge: true },
      { call: "frequencies([1,\"1\"]).size", expected: 2, label: "a number and a string stay separate keys", edge: true },
      { call: "frequencies([\"x\"]).get(\"x\")", expected: 1, label: "a single value", edge: true },
      { call: "frequencies([1,2]) instanceof Map", expected: true, label: "returns a Map, not an object", edge: true },
    ],
  },
  {
    id: "js-map-entries-at-least",
    track: "javascript",
    topic: "javascript",
    level: 23,
    tier: 2,
    focus: ["map-set", "for-of", "destructuring"],
    title: "Map entries to pairs",
    prompt: "Write `entriesAtLeast(map, min)`, returning an array of `[key, value]` pairs for every entry of the `Map` whose value is at least `min`, in insertion order, gathered with `for…of` over the Map and destructuring in the loop head. With `new Map([[\"a\", 1], [\"b\", 5], [\"c\", 3]])` and a `min` of 3 it gives `[[\"b\", 5], [\"c\", 3]]`. Nothing qualifying, or an empty Map, gives an empty array, and the Map is not changed.",
    starter: `const entriesAtLeast = (map, min) => {

};

// Scratch pad — change this and press Run.
console.log(entriesAtLeast(new Map([["a", 1], ["b", 5], ["c", 3]]), 3));
`,
    skeleton: `const entriesAtLeast = (map, min) => {
  const pairs = [];

  for (/* const [key, value] of map */) {
    // push a fresh [key, value] pair when the value qualifies
  }

  return pairs;
};`,
    hints: ["A Map is iterable and each turn of for-of gives an entry you can destructure into key and value; push a fresh two-item array for the ones that pass."],
    approach: [
      "Create an empty array for the pairs.",
      "Loop with for-of over the Map, destructuring each entry into its key and value.",
      "Push a new key-value pair when the value is at least the threshold, and return the array.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "entriesAtLeast(new Map([[\"a\",1],[\"b\",5],[\"c\",3]]), 3)", expected: [["b", 5], ["c", 3]] },
      { call: "entriesAtLeast(new Map([[\"x\",10]]), 1)", expected: [["x", 10]] },
      { call: "entriesAtLeast(new Map(), 0)", expected: [], label: "an empty Map", edge: true },
      { call: "entriesAtLeast(new Map([[\"a\",2]]), 2)", expected: [["a", 2]], label: "the threshold itself qualifies", edge: true },
      { call: "entriesAtLeast(new Map([[\"a\",1],[\"b\",2]]), 9)", expected: [], label: "nothing qualifies", edge: true },
      { call: "(() => { const map = new Map([[\"a\",5]]); entriesAtLeast(map, 1); return map.size; })()", expected: 1, label: "keeps the Map unchanged", edge: true },
    ],
  },
  {
    id: "js-chunk-with-loop",
    track: "javascript",
    topic: "javascript",
    level: 24,
    tier: 3,
    focus: ["for", "push"],
    title: "Chunk with a loop",
    prompt: "Write `chunkBy(items, size)`, splitting the array into groups of `size` with a `for` loop that pushes each item into the current group and starts a fresh group whenever that one is full — without `slice`. `chunkBy([1, 2, 3, 4, 5], 2)` gives `[[1, 2], [3, 4], [5]]`. A size larger than the array gives one group, an empty array gives an empty array, and the input is not changed.",
    starter: `const chunkBy = (items, size) => {

};

// Scratch pad — change this and press Run.
console.log(chunkBy([1, 2, 3, 4, 5], 2));
`,
    skeleton: `const chunkBy = (items, size) => {
  const groups = [];
  let current = [];

  for (/* each index */) {
    // push the item into current; when current is full, move it into groups and start a new one
  }

  // add the unfinished group, when there is one
  return groups;
};`,
    hints: ["Keep a current group that you push items into; when it reaches the size, move it into the result and start a fresh one, and remember the unfinished group after the loop."],
    approach: [
      "Create an empty result and an empty current group.",
      "Loop with an index over the items, pushing each into the current group.",
      "Whenever the current group reaches the size, push it into the result and replace it with a new empty array.",
      "After the loop, add the current group when it still holds anything, then return the result.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "chunkBy([1,2,3,4,5], 2)", expected: [[1, 2], [3, 4], [5]] },
      { call: "chunkBy([\"a\",\"b\",\"c\",\"d\"], 2)", expected: [["a", "b"], ["c", "d"]] },
      { call: "chunkBy([], 3)", expected: [], label: "empty input", edge: true },
      { call: "chunkBy([1,2], 5)", expected: [[1, 2]], label: "a size larger than the array gives one group", edge: true },
      { call: "chunkBy([1,2,3], 1)", expected: [[1], [2], [3]], label: "a size of one", edge: true },
      { call: "(() => { const items = [1,2,3]; chunkBy(items, 2); return items; })()", expected: [1, 2, 3], label: "keeps the original array unchanged", edge: true },
    ],
  },
  {
    id: "js-zip-lists",
    track: "javascript",
    topic: "javascript",
    level: 24,
    tier: 2,
    focus: ["for"],
    title: "Zip two lists",
    prompt: "Write `zip(left, right)`, returning an array of `[left[i], right[i]]` pairs built with one `for` loop whose index reads both arrays at once, stopping at the shorter length. `zip([1, 2, 3], [\"a\", \"b\", \"c\"])` gives `[[1, \"a\"], [2, \"b\"], [3, \"c\"]]`. When one side is empty the result is empty, and neither input is changed.",
    starter: `const zip = (left, right) => {

};

// Scratch pad — change this and press Run.
console.log(zip([1, 2, 3], ["a", "b", "c"]));
`,
    skeleton: `const zip = (left, right) => {
  const pairs = [];
  const length = /* the shorter of the two lengths */;

  for (/* index from 0 while below length */) {
    // push a two-item array from both lists at this index
  }

  return pairs;
};`,
    hints: ["Decide the number of pairs before looping — the smaller of the two lengths — then one index reads both arrays at once."],
    approach: [
      "Work out the shorter length by taking the smaller of the two lengths.",
      "Loop an index from zero up to that length.",
      "Push a two-item array holding the element from each list at that index, and return the pairs.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "zip([1,2,3], [\"a\",\"b\",\"c\"])", expected: [[1, "a"], [2, "b"], [3, "c"]] },
      { call: "zip([\"x\",\"y\"], [true,false])", expected: [["x", true], ["y", false]] },
      { call: "zip([1,2,3], [\"a\"])", expected: [[1, "a"]], label: "the shorter list decides the length", edge: true },
      { call: "zip([], [1,2])", expected: [], label: "an empty side gives nothing", edge: true },
      { call: "zip([1], [null])", expected: [[1, null]], label: "null is still a value", edge: true },
    ],
  },
  {
    id: "js-rotate-by-n",
    track: "javascript",
    topic: "javascript",
    level: 24,
    tier: 3,
    focus: ["for", "push"],
    title: "Rotate by n",
    prompt: "Write `rotateBy(list, n)`, returning a new array with every element moved `n` places to the right and the ones pushed past the end wrapping round to the front, built with a `for` loop and remainder arithmetic rather than `slice`. `rotateBy([1, 2, 3, 4, 5], 2)` gives `[4, 5, 1, 2, 3]`. A negative `n` rotates left, an `n` beyond the length wraps around, an empty array gives an empty array, and the input is not changed.",
    starter: `const rotateBy = (list, n) => {

};

// Scratch pad — change this and press Run.
console.log(rotateBy([1, 2, 3, 4, 5], 2));
`,
    skeleton: `const rotateBy = (list, n) => {
  const length = list.length;
  if (/* nothing to rotate */) return [];
  const shift = /* n brought into the range 0 to length - 1 */;
  const result = [];

  for (/* index from 0 while below length */) {
    // push the element that sits shift places earlier, wrapping around
  }

  return result;
};`,
    hints: ["Bring the shift into the range zero to length minus one first — the remainder operator plus one extra addition handles negatives — then one loop reads each element from its shifted position."],
    approach: [
      "Return an empty array straight away for an empty list, since a remainder by zero is not a number.",
      "Normalise the shift: take the remainder by the length, add the length, and take the remainder again so negatives land in range.",
      "Loop an index over every position and push the element that sits shift places earlier, wrapping with the remainder.",
      "Return the new array without touching the input.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "rotateBy([1,2,3,4,5], 2)", expected: [4, 5, 1, 2, 3] },
      { call: "rotateBy([\"a\",\"b\",\"c\"], 1)", expected: ["c", "a", "b"] },
      { call: "rotateBy([1,2,3], 0)", expected: [1, 2, 3], label: "zero leaves the order", edge: true },
      { call: "rotateBy([1,2,3], 5)", expected: [2, 3, 1], label: "a shift larger than the length wraps around", edge: true },
      { call: "rotateBy([1,2,3], -1)", expected: [2, 3, 1], label: "a negative shift rotates left", edge: true },
      { call: "rotateBy([], 3)", expected: [], label: "empty input", edge: true },
    ],
  },
  {
    id: "js-run-length-encode",
    track: "javascript",
    topic: "javascript",
    level: 25,
    tier: 3,
    focus: ["for", "strings"],
    title: "Run-length encode",
    prompt: "Write `runLength(text)`, returning the string with each run of the same character replaced by the run’s length followed by the character, found with one `for` loop that counts while the next character matches. `runLength(\"aaabccdddd\")` gives `\"3a1b2c4d\"`. Runs are case-sensitive, a single character gives `\"1\"` plus that character, and an empty string gives an empty string.",
    starter: `const runLength = text => {

};

// Scratch pad — change this and press Run.
console.log(runLength("aaabccdddd"));
`,
    skeleton: `const runLength = text => {
  let result = "";
  let count = 0;

  for (/* each index */) {
    // count this character; when the next one differs, append count and character, then reset
  }

  return result;
};`,
    hints: ["Count while the next character is the same as the current one, and write the count and the character out the moment the next one differs — the end of the string counts as differing."],
    approach: [
      "Keep a result string and a counter for the current run.",
      "Loop an index over the characters, adding one to the counter at each step.",
      "When the next character is different — or missing, at the end — append the count and the character, then reset the counter.",
      "Return the result.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "runLength(\"aaabccdddd\")", expected: "3a1b2c4d" },
      { call: "runLength(\"abc\")", expected: "1a1b1c" },
      { call: "runLength(\"\")", expected: "", label: "empty string", edge: true },
      { call: "runLength(\"z\")", expected: "1z", label: "a single character", edge: true },
      { call: "runLength(\"aAaa\")", expected: "1a1A2a", label: "case matters", edge: true },
      { call: "runLength(\"!!!!!!!!!!!!\")", expected: "12!", label: "a run longer than nine", edge: true },
    ],
  },
  {
    id: "js-pair-with-sum",
    track: "javascript",
    topic: "javascript",
    level: 25,
    tier: 3,
    focus: ["two-pointer", "while"],
    title: "Pair with a sum",
    prompt: "Write `pairWithSum(sorted, target)`, taking an array sorted in ascending order and returning the two values that add up to `target` as `[smaller, larger]`, found with one index moving in from each end in a `while` loop, or `null` when no such pair exists. `pairWithSum([1, 2, 4, 7, 11], 9)` gives `[2, 7]`. When several pairs qualify, return the one with the smallest first value; a single value cannot pair with itself.",
    starter: `const pairWithSum = (sorted, target) => {

};

// Scratch pad — change this and press Run.
console.log(pairWithSum([1, 2, 4, 7, 11], 9));
`,
    skeleton: `const pairWithSum = (sorted, target) => {
  let left = /* first index */;
  let right = /* last index */;

  while (/* the indexes have not crossed */) {
    // compare the sum of both ends with target:
    // equal — return the pair; too small — move left up; too big — move right down
  }

  return null;
};`,
    hints: ["With one index at each end of a sorted array, a sum that is too small means the left index must move up and one that is too big means the right index must move down — the pair is found when they meet the target, and missing when the indexes cross."],
    approach: [
      "Start one index at the first element and another at the last.",
      "While the left index is below the right one, add the two elements.",
      "Return the pair when the sum matches; move the left index up when the sum is too small, and the right index down when it is too big.",
      "Return null when the indexes cross without a match.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "pairWithSum([1,2,4,7,11], 9)", expected: [2, 7] },
      { call: "pairWithSum([1,3,4,5,6], 9)", expected: [3, 6] },
      { call: "pairWithSum([1,2,3], 10)", expected: null, label: "no pair adds up", edge: true },
      { call: "pairWithSum([5], 10)", expected: null, label: "a single value cannot pair with itself", edge: true },
      { call: "pairWithSum([-3,0,3,8], 0)", expected: [-3, 3], label: "negatives", edge: true },
      { call: "pairWithSum([], 1)", expected: null, label: "empty input", edge: true },
    ],
  },
  {
    id: "js-binary-search",
    track: "javascript",
    topic: "javascript",
    level: 25,
    tier: 3,
    focus: ["while", "two-pointer"],
    title: "Binary search",
    prompt: "Write `binarySearch(sorted, target)`, returning the index of `target` in an ascending array, or -1 when it is absent, by keeping a low and a high index in a `while` loop and looking at the middle element each turn so the search range halves every step. `binarySearch([1, 3, 5, 7, 9], 7)` gives 3. An empty array gives -1, and the array holds distinct values.",
    starter: `const binarySearch = (sorted, target) => {

};

// Scratch pad — change this and press Run.
console.log(binarySearch([1, 3, 5, 7, 9], 7));
`,
    skeleton: `const binarySearch = (sorted, target) => {
  let low = /* first index */;
  let high = /* last index */;

  while (/* the range is not empty */) {
    const middle = /* halfway between low and high, rounded down */;
    // found — return middle; too small — move low past it; too big — move high before it
  }

  return -1;
};`,
    hints: ["Keep a low and a high index, look at the element in the middle, and throw away the half that cannot hold the target; stop when low passes high."],
    approach: [
      "Start low at the first index and high at the last.",
      "While low is at most high, compute the middle index and compare that element with the target.",
      "Return the middle when it matches; otherwise move low above the middle when the element is too small, or high below it when the element is too big.",
      "Return -1 when the range is empty.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "binarySearch([1,3,5,7,9], 7)", expected: 3 },
      { call: "binarySearch([2,4,6,8], 2)", expected: 0 },
      { call: "binarySearch([1,3,5], 4)", expected: -1, label: "a value that is not there", edge: true },
      { call: "binarySearch([], 1)", expected: -1, label: "empty input", edge: true },
      { call: "binarySearch([5], 5)", expected: 0, label: "a single element", edge: true },
      { call: "binarySearch([1,2,3,4,5,6], 6)", expected: 5, label: "the last element", edge: true },
    ],
  },
  {
    id: "js-sliding-window-max",
    track: "javascript",
    topic: "javascript",
    level: 25,
    tier: 3,
    focus: ["nested-loops", "for"],
    title: "Sliding window max",
    prompt: "Write `windowMax(numbers, size)`, returning an array with the largest value of every window of `size` consecutive numbers, from left to right, using an outer `for` loop over the window starts and an inner one that scans each window. `windowMax([1, 3, 2, 5, 4], 3)` gives `[3, 5, 5]`. A window wider than the array gives an empty array, and a window as wide as the array gives a single value.",
    starter: `const windowMax = (numbers, size) => {

};

// Scratch pad — change this and press Run.
console.log(windowMax([1, 3, 2, 5, 4], 3));
`,
    skeleton: `const windowMax = (numbers, size) => {
  const result = [];

  for (/* each start while a full window still fits */) {
    let best = /* the first value of this window */;
    for (/* the rest of the window */) {
      // keep the larger value
    }
    // record best
  }

  return result;
};`,
    hints: ["The outer loop picks where a window starts, and stops when a full window no longer fits; the inner loop walks that window keeping the largest value seen."],
    approach: [
      "Loop a start index from zero while a whole window still fits inside the array.",
      "For each start, take the first element of the window as the best so far and walk the rest of the window with an inner loop, replacing the best when a larger value appears.",
      "Push the best value after the inner loop, and return the collected maxima.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "windowMax([1,3,2,5,4], 3)", expected: [3, 5, 5] },
      { call: "windowMax([4,1,1,4], 2)", expected: [4, 1, 4] },
      { call: "windowMax([1,2,3], 3)", expected: [3], label: "a window as wide as the array", edge: true },
      { call: "windowMax([1,2], 3)", expected: [], label: "a window wider than the array", edge: true },
      { call: "windowMax([-1,-5,-2], 2)", expected: [-1, -2], label: "all negative", edge: true },
      { call: "windowMax([7], 1)", expected: [7], label: "a window of one", edge: true },
    ],
  },
  {
    id: "js-matrix-transpose",
    track: "javascript",
    topic: "javascript",
    level: 25,
    tier: 3,
    focus: ["nested-loops", "for"],
    title: "Matrix transpose",
    prompt: "Write `transpose(matrix)`, returning a new matrix whose rows are the columns of the input, built with a `for` loop over the columns and an inner `for` loop over the rows; assume every row has the same length. `transpose([[1, 2, 3], [4, 5, 6]])` gives `[[1, 4], [2, 5], [3, 6]]`. An empty matrix gives an empty array, and the input is not changed.",
    starter: `const transpose = matrix => {

};

// Scratch pad — change this and press Run.
console.log(transpose([[1, 2, 3], [4, 5, 6]]));
`,
    skeleton: `const transpose = matrix => {
  const result = [];
  if (/* no rows */) return result;

  for (/* each column of the first row */) {
    const row = [];
    for (/* each row of the matrix */) {
      // push the value at this row and column
    }
    // add the new row
  }

  return result;
};`,
    hints: ["Each column of the input becomes a row of the output, so let the outer loop walk the columns and the inner loop collect that column’s value from every row."],
    approach: [
      "Return an empty array for an empty matrix, since there is no first row to measure.",
      "Loop the column index across the width of the first row; for each, start a new row.",
      "In an inner loop over the original rows, push the element at that column into the new row.",
      "Push the new row into the result and return it at the end.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "transpose([[1,2,3],[4,5,6]])", expected: [[1, 4], [2, 5], [3, 6]] },
      { call: "transpose([[1,2],[3,4]])", expected: [[1, 3], [2, 4]] },
      { call: "transpose([])", expected: [], label: "an empty matrix", edge: true },
      { call: "transpose([[1,2,3]])", expected: [[1], [2], [3]], label: "a single row becomes a column", edge: true },
      { call: "transpose([[1],[2]])", expected: [[1, 2]], label: "a single column becomes a row", edge: true },
      { call: "(() => { const matrix = [[1,2],[3,4]]; transpose(matrix); return matrix; })()", expected: [[1, 2], [3, 4]], label: "keeps the original unchanged", edge: true },
    ],
  },
];
