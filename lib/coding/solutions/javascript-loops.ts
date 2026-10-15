// Server-only reference solutions and hidden tests for lib/coding/tasks/javascript-loops.ts.
// Never import from client code. Hidden tests target the obvious shortcut: a
// hard-coded return, mutating an input the prompt protects, a built-in the task
// asks the learner to write by hand, or a value the visible tests never used.

import type { CodingSolution } from '../types';

export const JAVASCRIPT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "js-digit-sum": {
    solution: "const digitSum = n => { let total = 0; while (n > 0) { total += n % 10; n = Math.floor(n / 10); } return total; };",
    junior: `const digitSum = n => {
  let remaining = n;
  let total = 0;
  while (remaining > 0) {
    const lastDigit = remaining % 10;
    total = total + lastDigit;
    remaining = Math.floor(remaining / 10);
  }
  return total;
};`,
    senior: `const digitSum = n => {
  let total = 0;
  // Stop one step early: whatever is left below 10 is the last digit itself.
  while (n >= 10) {
    total += n % 10;
    n = Math.trunc(n / 10);
  }
  return total + n;
};`,
    hiddenTests: [
      { call: "digitSum(8999999999999999)", expected: 143 },
      { call: "digitSum(1000000000000000)", expected: 1 },
      { call: "digitSum(1000000000000001)", expected: 2 },
      { call: "digitSum(101010101010101)", expected: 8 },
      { call: "digitSum(808080808080808)", expected: 64 },
      { call: "digitSum(1000007)", expected: 8 },
      { call: "digitSum(99999)", expected: 45 },
      { call: "digitSum(305)", expected: 8 },
      { call: "digitSum(10)", expected: 1 },
    ],
  },
  "js-count-multiples": {
    solution: "const countMultiples = (n, from, to) => { let count = 0; for (let value = from; value <= to; value += 1) { if (value % n === 0) count += 1; } return count; };",
    junior: `const countMultiples = (n, from, to) => {
  const multiples = [];
  for (let value = from; value <= to; value += 1) {
    if (value % n === 0) {
      multiples.push(value);
    }
  }
  return multiples.length;
};`,
    senior: `const countMultiples = (n, from, to) => {
  // Jump to the first multiple at or after "from", then step by n instead of by one.
  const first = Math.ceil(from / n) * n;
  let count = 0;
  for (let value = first; value <= to; value += n) count += 1;
  return count;
};`,
    hiddenTests: [
      { call: "countMultiples(2, -9, -1)", expected: 4 },
      { call: "countMultiples(1, -10000, 10000)", expected: 20001 },
      { call: "countMultiples(1000000, -1, 1)", expected: 1 },
      { call: "countMultiples(7, 2, 2)", expected: 0 },
      { call: "countMultiples(3, -1, -9)", expected: 0 },
      { call: "countMultiples(1, -0, 0)", expected: 1 },
      { call: "countMultiples(6, 1, 100)", expected: 16 },
      { call: "countMultiples(1, 3, 9)", expected: 7 },
      { call: "countMultiples(10, 15, 25)", expected: 1 },
    ],
  },
  "js-words-of-length": {
    solution: "const countWordsOfLength = (sentence, length) => { if (sentence === \"\") return 0; let count = 0; for (const word of sentence.split(\" \")) { if (word.length === length) count += 1; } return count; };",
    junior: `const countWordsOfLength = (sentence, length) => {
  if (sentence === "") {
    return 0;
  }
  const words = sentence.split(" ");
  let count = 0;
  for (const word of words) {
    if (word.length === length) {
      count = count + 1;
    }
  }
  return count;
};`,
    senior: `const countWordsOfLength = (sentence, length) => {
  // An empty sentence has no words; split would otherwise hand back one empty string.
  const words = sentence ? sentence.split(" ") : [];
  let count = 0;
  for (const { length: wordLength } of words) {
    if (wordLength === length) count += 1;
  }
  return count;
};`,
    hiddenTests: [
      { call: "countWordsOfLength(\"ab c\", 0)", expected: 0 },
      { call: "countWordsOfLength(\"a\\tb cd\", 3)", expected: 1 },
      { call: "countWordsOfLength(\"é é\", 2)", expected: 1 },
      { call: "countWordsOfLength(\"é é\", 1)", expected: 1 },
      { call: "countWordsOfLength(\"🦈 a\", 1)", expected: 1 },
      { call: "countWordsOfLength(\"hi! ok\", 3)", expected: 1 },
      { call: "countWordsOfLength(\"x\".repeat(10000), 10000)", expected: 1 },
      { call: "countWordsOfLength(\"red green blue\", 4)", expected: 1 },
      { call: "countWordsOfLength(\"ab ab ab ab\", 2)", expected: 4 },
      { call: "countWordsOfLength(\"xyz\", 3)", expected: 1 },
    ],
  },
  "js-queue-with-shift": {
    solution: "const serveNext = (queue, newcomer) => { queue.push(newcomer); return queue.shift(); };",
    junior: `const serveNext = (queue, newcomer) => {
  queue.push(newcomer);
  const front = queue[0];
  queue.shift();
  return front;
};`,
    senior: `const serveNext = (queue, newcomer) => {
  queue.push(newcomer);
  return queue.shift();
};`,
    hiddenTests: [
      { call: "(() => { const queue = [undefined, false]; const result = serveNext(queue, null); return result === undefined && queue.length === 2 && queue[0] === false && queue[1] === null; })()", expected: true },
      { call: "(() => { const queue = [\"\", \"\"]; return serveNext(queue, \"later\") === \"\" && queue[0] === \"\" && queue[1] === \"later\"; })()", expected: true },
      { call: "(() => { const first = Object.freeze({ name: \"reef\" }), second = Object.freeze({ name: \"reef\" }), newcomer = Object.freeze({ name: \"kelp\" }); const queue = [first, second]; const alias = queue; const served = serveNext(queue, newcomer); return served === first && alias === queue && queue.length === 2 && queue[0] === second && queue[1] === newcomer; })()", expected: true },
      { call: "(() => { const newcomer = { name: \"solo\" }, queue = []; return serveNext(queue, newcomer) === newcomer && queue.length === 0; })()", expected: true },
      { call: "(() => { const queue = Array.from({ length: 10000 }, (_, i) => i); const served = serveNext(queue, 10000); return [served, queue.length, queue[0], queue[9999]]; })()", expected: [0, 10000, 1, 10000] },
      { call: "(() => { const queue = [\"x\",\"y\",\"z\"]; const served = serveNext(queue, \"w\"); return [served, queue.length, queue[queue.length - 1]]; })()", expected: ["x", 3, "w"] },
      { call: "(() => { const queue = [\"a\"]; serveNext(queue, \"b\"); serveNext(queue, \"c\"); return queue; })()", expected: ["c"] },
      { call: "(() => { const queue = []; serveNext(queue, \"p\"); return queue.length; })()", expected: 0 },
    ],
  },
  "js-swap-stack-top": {
    solution: "const swapTop = (stack, item) => { const top = stack.pop(); stack.push(item); return top; };",
    junior: `const swapTop = (stack, item) => {
  let removed;
  if (stack.length > 0) {
    removed = stack.pop();
  }
  stack.push(item);
  return removed;
};`,
    senior: "const swapTop = (stack, item) => {\n  const removed = stack.pop();\n  stack.push(item);\n  return removed;\n};",
    hiddenTests: [
      { call: "(() => { const first=Object.freeze({n:1}),top=Object.freeze({n:2}),item=Object.freeze([3]),stack=[first,top];const removed=swapTop(stack,item);return [removed===top,stack[0]===first,stack[1]===item,stack.length]; })()", expected: [true, true, true, 2] },
      { call: "(() => { const stack=[NaN];const top=swapTop(stack,undefined);const other=[-0];const zero=swapTop(other,null);return [Number.isNaN(top),stack.length,stack[0]===undefined,Object.is(zero,-0),other[0]===null]; })()", expected: [true, 1, true, true, true] },
      { call: "(() => { const stack=Array.from({length:10000},(_,i)=>i);const top=swapTop(stack,\"last\");return [top,stack.length,stack[0],stack[9999]]; })()", expected: [9999, 10000, 0, "last"] },

      { call: "(() => { const stack = [7,8,9,10]; const top = swapTop(stack, 0); return [top, stack.length, stack[3]]; })()", expected: [10, 4, 0] },
      { call: "(() => { const stack = []; swapTop(stack, 1); swapTop(stack, 2); return stack; })()", expected: [2] },
      { call: "(() => { const stack = [\"x\"]; return swapTop(stack, \"y\") === \"x\" && stack[0] === \"y\"; })()", expected: true },
    ],
  },
  "js-add-to-front": {
    solution: "const addToFront = (list, item) => list.unshift(item);",
    junior: `const addToFront = (list, item) => {
  list.unshift(item);
  const newLength = list.length;
  return newLength;
};`,
    senior: "const addToFront = (list, item) => list.unshift(item);",
    hiddenTests: [
      { call: "(() => { const old=Object.freeze({n:1}),item=Object.freeze([2]),list=[old];const size=addToFront(list,item);return [size,list[0]===item,list[1]===old,list.length]; })()", expected: [2, true, true, 2] },
      { call: "(() => { const list=[NaN,-0];const size=addToFront(list,undefined);return [size,list[0]===undefined,Number.isNaN(list[1]),Object.is(list[2],-0)]; })()", expected: [3, true, true, true] },
      { call: "(() => { const list=Array.from({length:10000},(_,i)=>i);return [addToFront(list,null),list[0],list[10000]]; })()", expected: [10001, null, 9999] },

      { call: "(() => { const list = [5,6,7,8]; const length = addToFront(list, 4); return [length, list[0], list.length]; })()", expected: [5, 4, 5] },
      { call: "(() => { const list = []; addToFront(list, null); return list; })()", expected: [null] },
      { call: "(() => { const list = [\"x\"]; return addToFront(list, \"y\") === 2 && list[0] === \"y\" && list[1] === \"x\"; })()", expected: true },
    ],
  },
  "js-remove-a-range": {
    solution: "const removeRange = (list, start, count) => list.splice(start, count);",
    junior: "const removeRange = (list, start, count) => {\n  const removed = list.splice(start, count);\n  return removed;\n};",
    senior: `const removeRange = (list, start, count) => {
  // Nothing to take out: leave the list alone rather than asking splice for zero items.
  if (count <= 0 || start >= list.length) return [];
  return list.splice(start, count);
};`,
    hiddenTests: [
      { call: "(() => { const first={},second=Object.freeze({}),last=Object.freeze([]),list=[first,second,last];const removed=removeRange(list,-2,1);const a=removeRange(list,2,0),b=removeRange(list,2,0);return [removed[0]===second,removed!==list,list[0]===first,list[1]===last,a!==b,a.length]; })()", expected: [true, true, true, true, true, 0] },
      { call: "(() => { const a=[0,1,2,3];return [removeRange(a,-10000,2),a,removeRange(a,0,-1),a]; })()", expected: [[0, 1], [2, 3], [], [2, 3]] },
      { call: "(() => { const list=Array.from({length:10000},(_,i)=>i);const out=removeRange(list,1,9998);return [out.length,out[0],out[9997],list]; })()", expected: [9998, 1, 9998, [0, 9999]] },

      { call: "(() => { const list = [10,20,30,40,50,60]; const removed = removeRange(list, 2, 3); return [removed, list]; })()", expected: [[30, 40, 50], [10, 20, 60]] },
      { call: "(() => { const list = [\"p\",\"q\",\"r\",\"s\"]; removeRange(list, 3, 1); return list; })()", expected: ["p", "q", "r"] },
      { call: "(() => { const list = [1,2]; return [removeRange(list, 2, 1), list]; })()", expected: [[], [1, 2]] },
    ],
  },
  "js-copy-a-range": {
    solution: "const copyRange = (list, start, end) => list.slice(start, end);",
    junior: "const copyRange = (list, start, end) => {\n  const copy = list.slice(start, end);\n  return copy;\n};",
    senior: "const copyRange = (list, start, end) => list.slice(start, end);",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),input=Object.freeze([a,b,undefined,NaN,-0]);const out=copyRange(input,0,10000),empty=copyRange(input,3,2);return [out!==input,out[0]===a,out[1]===b,out[2]===undefined,Number.isNaN(out[3]),Object.is(out[4],-0),empty.length,empty!==copyRange(input,3,2)]; })()", expected: [true, true, true, true, true, true, 0, true] },
      { call: "[copyRange([0,1,2,3],1,-1),copyRange([0,1,2,3],-3,3),copyRange([0,1,2,3],-10000,10000),copyRange([0,1,2,3],-1,-3)]", expected: [[1, 2], [1, 2], [0, 1, 2, 3], []] },
      { call: "(() => { const list=Object.freeze(Array.from({length:10000},(_,i)=>i));const out=copyRange(list,1,9999);return [out.length,out[0],out[9997],list[0]]; })()", expected: [9998, 1, 9998, 0] },

      { call: "copyRange([5,6,7,8,9], 2, 5)", expected: [7, 8, 9] },
      { call: "(() => { const list = [\"x\",\"y\",\"z\"]; const copy = copyRange(list, 0, 3); copy.push(\"w\"); return [list, copy.length]; })()", expected: [["x", "y", "z"], 4] },
      { call: "copyRange([], 0, 1)", expected: [] },
    ],
  },
  "js-insert-at-index": {
    solution: "const insertAt = (list, index, item) => { list.splice(index, 0, item); return list; };",
    junior: "const insertAt = (list, index, item) => {\n  const deleteCount = 0;\n  list.splice(index, deleteCount, item);\n  return list;\n};",
    senior: "const insertAt = (list, index, item) => {\n  list.splice(index, 0, item);\n  return list;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),item=Object.freeze({value:1}),list=[a,b];const out=insertAt(list,1,item);return [out===list,list.length,list[0]===a,list[1]===item,list[2]===b]; })()", expected: [true, 3, true, true, true] },
      { call: "(() => { const list=[undefined,-0];const out=insertAt(list,1,NaN);return [out===list,list[0]===undefined,Number.isNaN(list[1]),Object.is(list[2],-0)]; })()", expected: [true, true, true, true] },
      { call: "(() => { const list=Array.from({length:10000},(_,i)=>i);const out=insertAt(list,0,null);return [out===list,list.length,list[0],list[10000]]; })()", expected: [true, 10001, null, 9999] },

      { call: "insertAt([10,20,30,40], 3, 35)", expected: [10, 20, 30, 35, 40] },
      { call: "(() => { const list = [\"a\",\"b\",\"c\"]; return insertAt(list, 1, \"z\") === list; })()", expected: true },
      { call: "insertAt([1,2,3], 1, [0])", expected: [1, [0], 2, 3] },
    ],
  },
  "js-rotate-once": {
    solution: "const rotateOnce = list => { if (list.length > 0) list.push(list.shift()); return list; };",
    junior: `const rotateOnce = list => {
  if (list.length === 0) {
    return list;
  }
  const first = list.shift();
  list.push(first);
  return list;
};`,
    senior: "const rotateOnce = list => {\n  if (!list.length) return list;\n  list.push(list.shift());\n  return list;\n};",
    hiddenTests: [
      { call: "(() => { const first=Object.freeze({}),second=Object.freeze([]),list=[first,second];const out=rotateOnce(list),empty=[],single=[first];return [out===list,list[0]===second,list[1]===first,rotateOnce(empty)===empty,empty.length,rotateOnce(single)===single,single[0]===first]; })()", expected: [true, true, true, true, 0, true, true] },
      { call: "(() => { const list=[NaN,undefined,-0];rotateOnce(list);return [list[0]===undefined,Object.is(list[1],-0),Number.isNaN(list[2])]; })()", expected: [true, true, true] },
      { call: "(() => { const list=Array.from({length:10000},(_,i)=>i);const out=rotateOnce(list);return [out===list,list.length,list[0],list[9999]]; })()", expected: [true, 10000, 1, 0] },

      { call: "rotateOnce([1,2,3,4,5])", expected: [2, 3, 4, 5, 1] },
      { call: "(() => { const list = [1,2,3]; rotateOnce(list); rotateOnce(list); return list; })()", expected: [3, 1, 2] },
      { call: "rotateOnce([]).length", expected: 0 },
    ],
  },
  "js-last-item-safely": {
    solution: "const lastItem = (list, fallback) => list.length > 0 ? list[list.length - 1] : fallback;",
    junior: `const lastItem = (list, fallback) => {
  if (list.length === 0) {
    return fallback;
  }
  const lastIndex = list.length - 1;
  return list[lastIndex];
};`,
    senior: "const lastItem = (list, fallback) => list.length ? list.slice(-1)[0] : fallback;",
    hiddenTests: [
      { call: "(() => { const fallback=Object.freeze({}),value=Object.freeze({}),list=Object.freeze([value]);return [lastItem(Object.freeze([]),fallback)===fallback,lastItem(list,fallback)===value,lastItem(Object.freeze([undefined]),fallback)===undefined,lastItem(Object.freeze([null]),fallback)===null,lastItem(Object.freeze([false]),fallback)===false]; })()", expected: [true, true, true, true, true] },
      { call: "(() => { return [Number.isNaN(lastItem(Object.freeze([NaN]),0)),Object.is(lastItem(Object.freeze([-0]),1),-0),lastItem(Object.freeze([\"\"]),\"fallback\")]; })()", expected: [true, true, ""] },
      { call: "lastItem(Object.freeze(Array.from({length:10000},(_,i)=>i)),null)", expected: 9999 },

      { call: "lastItem([10,20,30,40], -1)", expected: 40 },
      { call: "(() => { const list = [\"x\",\"y\"]; return [lastItem(list, \"?\"), list.length]; })()", expected: ["y", 2] },
      { call: "lastItem([], null)", expected: null },
    ],
  },
  "js-sum-with-for": {
    solution: "const addUp = numbers => { let total = 0; for (let index = 0; index < numbers.length; index += 1) total += numbers[index]; return total; };",
    junior: "const addUp = numbers => {\n  let total = 0;\n  for (let index = 0; index < numbers.length; index += 1) {\n    total = total + numbers[index];\n  }\n  return total;\n};",
    senior: "const addUp = numbers => {\n  let sum = 0;\n  for (let i = 0; i < numbers.length; i++) sum += numbers[i];\n  return sum;\n};",
    hiddenTests: [
      { call: "addUp(Object.freeze([1.005]))", expected: 1.005 },
      { call: "(() => { const numbers=[3,1,2];const total=addUp(numbers);return [total,numbers,addUp(Object.freeze([1000000,0.1,-1000000]))]; })()", expected: [6, [3, 1, 2], 0.09999999997671694] },
      { call: "addUp(Object.freeze(Array.from({length:10000},()=>-1000000)))", expected: -10000000000 },

      { call: "addUp([100,200,300,400])", expected: 1000 },
      { call: "addUp([7])", expected: 7 },
      { call: "addUp([1,1,1,1,1,1,1,1,1,1])", expected: 10 },
    ],
  },
  "js-count-matches": {
    solution: "const countMatches = (items, target) => { let count = 0; for (let index = 0; index < items.length; index += 1) { if (items[index] === target) count += 1; } return count; };",
    junior: `const countMatches = (items, target) => {
  let count = 0;
  for (let index = 0; index < items.length; index += 1) {
    const isMatch = items[index] === target;
    if (isMatch) {
      count += 1;
    }
  }
  return count;
};`,
    senior: "const countMatches = (items, target) => {\n  let count = 0;\n  for (let i = 0; i < items.length; i++) count += items[i] === target ? 1 : 0;\n  return count;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({x:1}),b=Object.freeze({x:1}),items=Object.freeze([a,b,a,NaN,0,-0,undefined,null]);return [countMatches(items,a),countMatches(items,NaN),countMatches(items,0),countMatches(items,-0),countMatches(items,undefined),countMatches(items,null)]; })()", expected: [2, 0, 2, 2, 1, 1] },
      { call: "countMatches(Object.freeze(Array.from({length:10000},()=>\"x\")),\"x\")", expected: 10000 },

      { call: "countMatches([true,false,true,true], true)", expected: 3 },
      { call: "countMatches([0,0,0,0,0], 0)", expected: 5 },
      { call: "countMatches([null, undefined, null], null)", expected: 2 },
    ],
  },
  "js-reverse-in-place": {
    solution: "const reverseInPlace = list => { let left = 0; let right = list.length - 1; while (left < right) { const temp = list[left]; list[left] = list[right]; list[right] = temp; left += 1; right -= 1; } return list; };",
    junior: `const reverseInPlace = list => {
  let left = 0;
  let right = list.length - 1;
  while (left < right) {
    const leftValue = list[left];
    const rightValue = list[right];
    list[left] = rightValue;
    list[right] = leftValue;
    left = left + 1;
    right = right - 1;
  }
  return list;
};`,
    senior: `const reverseInPlace = list => {
  // Both indexes live in the loop head, and a destructuring swap needs no temporary.
  for (let left = 0, right = list.length - 1; left < right; left += 1, right -= 1) {
    [list[left], list[right]] = [list[right], list[left]];
  }
  return list;
};`,
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),list=[a,NaN,undefined,-0,b];const out=reverseInPlace(list);return [out===list,list[0]===b,Object.is(list[1],-0),list[2]===undefined,Number.isNaN(list[3]),list[4]===a]; })()", expected: [true, true, true, true, true, true] },
      { call: "(() => { const list=Array.from({length:10000},(_,i)=>i);const out=reverseInPlace(list);const empty=[],one=[undefined];return [out===list,list[0],list[9999],reverseInPlace(empty)===empty,reverseInPlace(one)===one,one.length]; })()", expected: [true, 9999, 0, true, true, 1] },

      { call: "(() => { const list = [1,2,3,4,5]; list.reverse = () => { throw new Error(\"reverse() is not allowed here\"); }; return reverseInPlace(list); })()", expected: [5, 4, 3, 2, 1] },
      { call: "(() => { const list = [1,2]; return reverseInPlace(list) === list; })()", expected: true },
      { call: "(() => { const list = [\"x\",\"y\",\"z\",\"w\"]; reverseInPlace(list); return list.join(\"\"); })()", expected: "wzyx" },
    ],
  },
  "js-countdown-by-step": {
    solution: "const countdownBy = (start, step) => { const result = []; let value = start; while (value > 0) { result.push(value); value -= step; } return result; };",
    junior: `const countdownBy = (start, step) => {
  const values = [];
  if (start <= 0) {
    return values;
  }
  let current = start;
  while (current > 0) {
    values.push(current);
    current = current - step;
  }
  return values;
};`,
    senior: "const countdownBy = (start, step) => {\n  const values = [];\n  while (start > 0) {\n    values.push(start);\n    start -= step;\n  }\n  return values;\n};",
    hiddenTests: [
      { call: "(() => { const a=countdownBy(-10000,10000),b=countdownBy(0,1),c=countdownBy(1,10000);return [a.length,b.length,a!==b,c,c!==countdownBy(1,10000)]; })()", expected: [0, 0, true, [1], true] },
      { call: "(() => { const a=countdownBy(10000,1),b=countdownBy(10000,9999);return [a.length,a[0],a[9999],b]; })()", expected: [10000, 10000, 1, [10000, 1]] },

      { call: "countdownBy(20, 7)", expected: [20, 13, 6] },
      { call: "countdownBy(1, 1)", expected: [1] },
      { call: "countdownBy(9, 3)", expected: [9, 6, 3] },
    ],
  },
  "js-first-divisible": {
    solution: "const firstDivisible = (numbers, divisor) => { let found = null; let index = 0; while (index < numbers.length) { if (numbers[index] % divisor === 0) { found = numbers[index]; break; } index += 1; } return found; };",
    junior: "const firstDivisible = (numbers, divisor) => {\n  let index = 0;\n  let result = null;\n  while (index < numbers.length) {\n    const number = numbers[index];\n    if (number % divisor === 0) {\n      result = number;\n      break;\n    }\n    index += 1;\n  }\n  return result;\n};",
    senior: "const firstDivisible = (numbers, divisor) => {\n  let i = 0, found = null;\n  while (i < numbers.length) {\n    const value = numbers[i++];\n    if (value % divisor === 0) { found = value; break; }\n  }\n  return found;\n};",
    hiddenTests: [
      { call: "(() => { const values=Object.freeze([7,-12,24]);return [firstDivisible(values,-4),Object.is(firstDivisible(Object.freeze([-0,4]),2),-0)]; })()", expected: [-12, true] },
      { call: "(() => { const values=Object.freeze(Array.from({length:10000},(_,i)=>i===9999?1000000000:3));return firstDivisible(values,1000000); })()", expected: 1000000000 },
      { call: "(() => { const values=new __probe.Proxy([4,8,12],{get(target,key,receiver){if(key===\"1\"||key===\"2\")throw Error(\"read after match\");return __probe.get(target,key,receiver);}});return firstDivisible(values,2); })()", expected: 4 },

      { call: "firstDivisible([13,17,19,21,22], 11)", expected: 22 },
      { call: "firstDivisible([8,16,24], 8)", expected: 8 },
      { call: "firstDivisible([-6,9], 3)", expected: -6 },
    ],
  },
  "js-attempt-until": {
    solution: "const attemptUntil = (attempt, limit) => { let calls = 0; let succeeded; do { calls += 1; succeeded = attempt(); } while (!succeeded && calls < limit); return succeeded ? calls : -1; };",
    junior: `const attemptUntil = (attempt, limit) => {
  let calls = 0;
  let succeeded = false;
  do {
    calls = calls + 1;
    const result = attempt();
    if (result) {
      succeeded = true;
    }
  } while (!succeeded && calls < limit);
  if (succeeded) {
    return calls;
  }
  return -1;
};`,
    senior: `const attemptUntil = (attempt, limit) => {
  let calls = 0;
  do {
    calls += 1;
    if (attempt()) return calls; // success leaves the loop from inside, so no flag is needed
  } while (calls < limit);
  return -1;
};`,
    hiddenTests: [
      { call: "(() => { const calls=[];const result=attemptUntil(function(...args){calls.push(args.length);return calls.length===3;},5);return [result,calls]; })()", expected: [3, [0, 0, 0]] },
      { call: "(() => { const reason={code:\"local\"};let calls=0;try{attemptUntil(()=>{calls++;if(calls===2)throw reason;return false;},5);return [false,calls];}catch(error){return [error===reason,calls];} })()", expected: [true, 2] },
      { call: "(() => { let calls=0;const result=attemptUntil(()=>{calls++;return calls===1000;},1000);return [result,calls]; })()", expected: [1000, 1000] },

      { call: "(() => { let calls = 0; const result = attemptUntil(() => { calls += 1; return calls === 6; }, 10); return [result, calls]; })()", expected: [6, 6] },
      { call: "(() => { let calls = 0; attemptUntil(() => { calls += 1; return true; }, 10); return calls; })()", expected: 1 },
      { call: "(() => { let calls = 0; attemptUntil(() => { calls += 1; return false; }, 3); return calls; })()", expected: 3 },
    ],
  },
  "js-join-with-for-of": {
    solution: "const joinWords = (words, separator) => { let result = \"\"; let first = true; for (const word of words) { if (!first) result += separator; result += word; first = false; } return result; };",
    junior: `const joinWords = (words, separator) => {
  let result = "";
  let position = 0;
  for (const word of words) {
    if (position > 0) {
      result = result + separator;
    }
    result = result + word;
    position = position + 1;
  }
  return result;
};`,
    senior: `const joinWords = (words, separator) => {
  let result = "";
  // entries() hands over the index, so only the first word goes in without a separator in front.
  for (const [index, word] of words.entries()) {
    result += index === 0 ? word : separator + word;
  }
  return result;
};`,
    hiddenTests: [
      { call: "joinWords(Object.freeze([\" a \",\"\\n\",\"🦈\",\"\",\"b\"]),\" ---> \")", expected: " a  ---> \n ---> 🦈 --->  ---> b" },
      { call: "(() => { const word=\"x\".repeat(1000),sep=\"-\".repeat(100),words=Object.freeze([word,word,word]);const result=joinWords(words,sep);return [result.length,result===word+sep+word+sep+word]; })()", expected: [3200, true] },
      { call: "(() => { const words=Object.freeze(Array.from({length:1000},()=>\"x\"));const out=joinWords(words,\"|\");return [out.length,out.slice(0,3),out.slice(-3)]; })()", expected: [1999, "x|x", "x|x"] },

      { call: "joinWords([\"one\",\"two\",\"three\",\"four\"], \" | \")", expected: "one | two | three | four" },
      { call: "(() => { const words = [\"x\",\"y\"]; words.join = () => { throw new Error(\"join() is not allowed here\"); }; return joinWords(words, \"+\"); })()", expected: "x+y" },
      { call: "joinWords([\"\",\"\"], \"-\")", expected: "-" },
    ],
  },
  "js-number-items": {
    solution: "const numberItems = items => { const result = []; for (const [index, item] of items.entries()) result.push((index + 1) + \". \" + item); return result; };",
    junior: `const numberItems = items => {
  const result = [];
  for (const [index, item] of items.entries()) {
    const position = index + 1;
    const label = position + ". " + item;
    result.push(label);
  }
  return result;
};`,
    senior: "const numberItems = items => {\n  const labels = [];\n  for (const [i, item] of items.entries()) labels.push(String(i + 1) + \". \" + item);\n  return labels;\n};",
    hiddenTests: [
      { call: "numberItems(Object.freeze([\" a \",\"\\n🦈\",-0,1.25]))", expected: ["1.  a ", "2. \n🦈", "3. 0", "4. 1.25"] },
      { call: "(() => { const input=Object.freeze(Array.from({length:1000},()=>\"x\"));const a=numberItems(input),b=numberItems(input),empty=Object.freeze([]);return [a.length,a[999],a!==b,numberItems(empty)!==numberItems(empty)]; })()", expected: [1000, "1000. x", true, true] },
      { call: "numberItems(Object.freeze([\"x\".repeat(1000)]))[0].length", expected: 1003 },

      { call: "numberItems([\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\",\"h\",\"i\",\"j\",\"k\"])[10]", expected: "11. k" },
      { call: "numberItems([\"\", \"x\"])", expected: ["1. ", "2. x"] },
      { call: "(() => { const items = [\"a\"]; numberItems(items); return items; })()", expected: ["a"] },
    ],
  },
  "js-times-table": {
    solution: "const timesTable = size => { const table = []; for (let row = 1; row <= size; row += 1) { const cells = []; for (let column = 1; column <= size; column += 1) cells.push(row * column); table.push(cells); } return table; };",
    junior: `const timesTable = size => {
  const table = [];
  for (let row = 0; row < size; row += 1) {
    table.push([]);
    for (let column = 0; column < size; column += 1) {
      table[row][column] = (row + 1) * (column + 1);
    }
  }
  return table;
};`,
    senior: "const timesTable = size => {\n  const table = [];\n  for (let r = 1; r <= size; r++) {\n    const row = [];\n    for (let c = 1; c <= size; c++) row.push(r * c);\n    table.push(row);\n  }\n  return table;\n};",
    hiddenTests: [
      { call: "(() => { const a=timesTable(3),b=timesTable(3);a[0][0]=99;return [a!==b,a[0]!==a[1],b[0][0],a[1][0],timesTable(0)!==timesTable(0)]; })()", expected: [true, true, 1, 2, true] },
      { call: "(() => { const t=timesTable(100);return [t.length,t.every(row=>row.length===100),t[99][99],t[0][99],t[99][0],new Set(t).size]; })()", expected: [100, true, 10000, 100, 100, 100] },

      { call: "timesTable(5)[4][4]", expected: 25 },
      { call: "timesTable(6).length", expected: 6 },
      { call: "timesTable(7)[2]", expected: [3, 6, 9, 12, 15, 18, 21] },
    ],
  },
  "js-some-and-every": {
    solution: "const passReport = (scores, passMark) => ({ anyPassed: scores.some(score => score >= passMark), allPassed: scores.every(score => score >= passMark) });",
    junior: "const passReport = (scores, passMark) => {\n  const anyPassed = scores.some(score => score >= passMark);\n  const allPassed = scores.every(score => score >= passMark);\n  return { anyPassed: anyPassed, allPassed: allPassed };\n};",
    senior: `const passReport = (scores, passMark) => {
  // One predicate serves both questions; some and every already give the right answers for an empty list.
  const passes = score => score >= passMark;
  return { anyPassed: scores.some(passes), allPassed: scores.every(passes) };
};`,
    hiddenTests: [
      { call: "passReport(Object.freeze([40.5,40.25]),40.6)", expected: {"anyPassed": false, "allPassed": false} },
      { call: "(() => { const scores=[70,40],a=passReport(scores,50),b=passReport(scores,50);return [scores,a,a!==b]; })()", expected: [[70, 40], {"anyPassed": true, "allPassed": false}, true] },
      { call: "passReport(Object.freeze(Array.from({length:10000},(_,i)=>i===9999?99.5:0)),99.5)", expected: {"anyPassed": true, "allPassed": false} },

      { call: "passReport([49,50,51], 50)", expected: { anyPassed: true, allPassed: false } },
      { call: "passReport([100,99,98,97], 97)", expected: { anyPassed: true, allPassed: true } },
      { call: "passReport([0], 1)", expected: { anyPassed: false, allPassed: false } },
    ],
  },
  "js-locate-item": {
    solution: "const locate = (list, item) => ({ present: list.includes(item), index: list.indexOf(item) });",
    junior: "const locate = (list, item) => {\n  const present = list.includes(item);\n  const index = list.indexOf(item);\n  return { present: present, index: index };\n};",
    senior: "const locate = (list, item) => {\n  const index = list.indexOf(item);\n  return { present: list.includes(item), index };\n};",
    hiddenTests: [
      { call: "locate(Object.freeze([NaN,1,NaN]),NaN)", expected: {"present": true, "index": -1} },
      { call: "(() => { const a=Object.freeze({x:1}),b=Object.freeze({x:1}),list=Object.freeze([a,-0,undefined]);return [locate(list,a),locate(list,b),locate(list,0),locate(list,undefined),locate(list,a)!==locate(list,a)]; })()", expected: [{"present": true, "index": 0}, {"present": false, "index": -1}, {"present": true, "index": 1}, {"present": true, "index": 2}, true] },
      { call: "locate(Object.freeze(Array.from({length:10000},(_,i)=>i)),9999)", expected: {"present": true, "index": 9999} },

      { call: "locate([\"x\",\"y\",\"z\",\"w\"], \"w\")", expected: { present: true, index: 3 } },
      { call: "locate([0, false, \"\"], false)", expected: { present: true, index: 1 } },
      { call: "locate([null], undefined)", expected: { present: false, index: -1 } },
    ],
  },
  "js-remove-by-id": {
    solution: "const removeById = (items, id) => { const index = items.findIndex(item => item.id === id); if (index === -1) return null; return items.splice(index, 1)[0]; };",
    junior: "const removeById = (items, id) => {\n  const position = items.findIndex(item => item.id === id);\n  if (position === -1) {\n    return null;\n  }\n  const removed = items[position];\n  items.splice(position, 1);\n  return removed;\n};",
    senior: `const removeById = (items, id) => {
  const index = items.findIndex(item => item.id === id);
  // splice hands back the removed items as an array; with no match there is nothing to splice.
  const [removed = null] = index === -1 ? [] : items.splice(index, 1);
  return removed;
};`,
    hiddenTests: [
      { call: "(() => { const key={},first=Object.freeze({id:key}),other=Object.freeze({id:{}}),last=Object.freeze({id:key}),items=[first,other,last];const out=removeById(items,key);return [out===first,items.length,items[0]===other,items[1]===last]; })()", expected: [true, 2, true, true] },
      { call: "(() => { const a=Object.freeze({id:1}),b=Object.freeze({id:\"1\"}),c=Object.freeze({id:NaN}),items=[a,b,c];const out=removeById(items,\"1\");const missing=removeById(items,NaN);return [out===b,missing===null,items[0]===a,items[1]===c]; })()", expected: [true, true, true, true] },
      { call: "(() => { const items=Array.from({length:10000},(_,id)=>Object.freeze({id})),last=items[9999];const removed=removeById(items,9999);return [removed===last,items.length,items[9998].id]; })()", expected: [true, 9999, 9998] },

      { call: "(() => { const items = [{id:\"a\"},{id:\"b\"},{id:\"c\"},{id:\"d\"}]; const removed = removeById(items, \"d\"); return [removed.id, items.length]; })()", expected: ["d", 3] },
      { call: "(() => { const items = [{id:1},{id:2},{id:3}]; removeById(items, 42); return items.length; })()", expected: 3 },
      { call: "(() => { const items = [{id:1}]; return removeById(items, 1) !== null && items.length === 0; })()", expected: true },
      { call: "(() => { const items = [{id:1,n:\"a\"},{id:2,n:\"b\"},{id:1,n:\"c\"}]; const removed = removeById(items, 1); return [removed, items]; })()", expected: [{id:1,n:"a"},[{id:2,n:"b"},{id:1,n:"c"}]] },
    ],
  },
  "js-highest-with-reduce": {
    solution: "const highest = numbers => numbers.length === 0 ? null : numbers.reduce((best, number) => number > best ? number : best);",
    junior: `const highest = numbers => {
  if (numbers.length === 0) {
    return null;
  }
  const best = numbers.reduce((bestSoFar, number) => {
    if (number > bestSoFar) {
      return number;
    }
    return bestSoFar;
  }, numbers[0]);
  return best;
};`,
    senior: `const highest = numbers => {
  if (numbers.length === 0) return null; // reduce without a seed throws on an empty array
  return numbers.reduce((best, number) => Math.max(best, number));
};`,
    hiddenTests: [
      { call: "highest(Object.freeze([1.005,0.5,-1]))", expected: 1.005 },
      { call: "(() => { const numbers=[3,1,2];const result=highest(numbers);return [result,numbers,highest(Object.freeze([-0,0]))===0]; })()", expected: [3, [3, 1, 2], true] },
      { call: "highest(Object.freeze(Array.from({length:10000},(_,i)=>i===9999?-0.000001:-1000000)))", expected: -1e-06 },

      { call: "highest([10,100,1000,999])", expected: 1000 },
      { call: "highest([0,-1])", expected: 0 },
      { call: "highest([2.5,2.75,2.6])", expected: 2.75 },
    ],
  },
  "js-count-by-key": {
    solution: "const countBy = (items, keyFn) => items.reduce((counts, item) => { const key = String(keyFn(item)); counts[key] = (counts[key] ?? 0) + 1; return counts; }, Object.create(null));",
    junior: "const countBy = (items, keyFn) => {\n  const counts = Object.create(null);\n  return items.reduce((result, item) => {\n    const key = String(keyFn(item));\n    const previous = Object.hasOwn(result, key) ? result[key] : 0;\n    result[key] = previous + 1;\n    return result;\n  }, counts);\n};",
    senior: "const countBy = (items, keyFn) => {\n  const counts = items.reduce((map, item) => {\n    const key = String(keyFn(item));\n    map.set(key, (map.get(key) ?? 0) + 1);\n    return map;\n  }, new Map());\n  return Object.fromEntries(counts);\n};",
    hiddenTests: [
      { call: "(() => { const keys=[\"__proto__\",\"constructor\",\"toString\",\"\",1,\"1\",-0,\"0\"],items=Object.freeze(keys.map(key=>Object.freeze({key}))),calls=[];const out=countBy(items,(...args)=>{calls.push(args);return args[0].key;});return [out.__proto__,out.constructor,out.toString,out[\"\"],out[\"1\"],out[\"0\"],Object.hasOwn(out,\"__proto__\"),calls.length,calls.every((a,i)=>a.length===1&&a[0]===items[i]),out!==countBy(Object.freeze([]),()=>\"x\")]; })()", expected: [1, 1, 1, 1, 2, 2, true, 8, true, true] },
      { call: "(() => { const reason={},calls=[];try{countBy(Object.freeze([1,2,3]),value=>{calls.push(value);if(value===2)throw reason;return \"x\";});return [false,calls];}catch(error){return [error===reason,calls];} })()", expected: [true, [1, 2]] },
      { call: "countBy(Object.freeze(Array.from({length:10000},()=>0)),()=>\"__proto__\").__proto__", expected: 10000 },

      { call: "countBy([{team:\"red\"},{team:\"blue\"},{team:\"red\"},{team:\"red\"}], person => person.team)", expected: { red: 3, blue: 1 } },
      { call: "countBy([\"aa\",\"b\",\"cc\",\"ddd\"], word => word.length)", expected: { "1": 1, "2": 2, "3": 1 } },
      { call: "countBy([true,false,true], value => String(value))", expected: { true: 2, false: 1 } },
    ],
  },
  "js-running-totals": {
    solution: "const runningTotals = numbers => numbers.reduce((totals, number) => { const previous = totals.length > 0 ? totals[totals.length - 1] : 0; totals.push(previous + number); return totals; }, []);",
    junior: "const runningTotals = numbers => {\n  return numbers.reduce((totals, number) => {\n    const previous = totals.length === 0 ? 0 : totals[totals.length - 1];\n    const next = previous + number;\n    totals.push(next);\n    return totals;\n  }, []);\n};",
    senior: "const runningTotals = numbers => numbers.reduce((out, number) => {\n  out.push((out.length ? out[out.length - 1] : 0) + number);\n  return out;\n}, []);",
    hiddenTests: [
      { call: "(() => { const input=Object.freeze([1.005,-1.005,0.1,0.2]);const a=runningTotals(input),b=runningTotals(input);return [a,a!==input,a!==b,runningTotals(Object.freeze([]))!==runningTotals(Object.freeze([]))]; })()", expected: [[1.005, 0, 0.1, 0.30000000000000004], true, true, true] },
      { call: "(() => { const input=Object.freeze(Array.from({length:10000},()=>-1000000)),out=runningTotals(input);return [out.length,out[0],out[9999],input[9999]]; })()", expected: [10000, -1000000, -10000000000, -1000000] },

      { call: "runningTotals([10,20,30,40,50])", expected: [10, 30, 60, 100, 150] },
      { call: "(() => { const numbers = [1,2,3]; runningTotals(numbers); return numbers; })()", expected: [1, 2, 3] },
      { call: "runningTotals([0.5,0.5,0.5])", expected: [0.5, 1, 1.5] },
    ],
  },
  "js-apply-all": {
    solution: "const applyAll = (value, steps) => steps.reduce((current, step) => step(current), value);",
    junior: "const applyAll = (value, steps) => {\n  return steps.reduce((current, step) => {\n    const next = step(current);\n    return next;\n  }, value);\n};",
    senior: "const applyAll = (value, steps) => steps.reduce((result, fn) => fn(result), value);",
    hiddenTests: [
      { call: "(() => { const box=Object.freeze({}),calls=[],steps=Object.freeze([(...args)=>{calls.push(args.length,args[0]===box);return undefined;},(...args)=>{calls.push(args.length,args[0]===undefined);return false;},(...args)=>{calls.push(args.length,args[0]===false);return box;}]);return [applyAll(box,steps)===box,calls,applyAll(box,Object.freeze([]))===box]; })()", expected: [true, [1, true, 1, true, 1, true], true] },
      { call: "(() => { const reason={},calls=[];try{applyAll(0,Object.freeze([v=>{calls.push(1);return v+1;},v=>{calls.push(2);throw reason;},v=>{calls.push(3);return v;} ]));return [false,calls];}catch(error){return [error===reason,calls];} })()", expected: [true, [1, 2]] },
      { call: "applyAll(0,Object.freeze(Array.from({length:1000},()=>value=>value+1)))", expected: 1000 },

      { call: "applyAll(1, [n => n + 1, n => n + 1, n => n + 1, n => n + 1])", expected: 5 },
      { call: "applyAll(0, [n => n - 1])", expected: -1 },
      { call: "applyAll(\"a\", [text => text + \"b\", text => text + \"c\", text => text.length])", expected: 3 },
    ],
  },
  "js-swap-pairs": {
    solution: "const swapPairs = list => { const result = list.slice(); for (let index = 0; index + 1 < result.length; index += 2) { [result[index], result[index + 1]] = [result[index + 1], result[index]]; } return result; };",
    junior: "const swapPairs = list => {\n  const copy = list.slice();\n  for (let index = 0; index + 1 < copy.length; index += 2) {\n    const partner = index + 1;\n    [copy[index], copy[partner]] = [copy[partner], copy[index]];\n  }\n  return copy;\n};",
    senior: "const swapPairs = list => {\n  const out = [...list];\n  for (let i = 0; i + 1 < out.length; i += 2) [out[i], out[i + 1]] = [out[i + 1], out[i]];\n  return out;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),input=Object.freeze([a,b,undefined,NaN,-0]);const out=swapPairs(input);return [out!==input,out[0]===b,out[1]===a,Number.isNaN(out[2]),out[3]===undefined,Object.is(out[4],-0),input[0]===a,swapPairs(Object.freeze([]))!==swapPairs(Object.freeze([]))]; })()", expected: [true, true, true, true, true, true, true, true] },
      { call: "(() => { const list=Object.freeze(Array.from({length:10000},(_,i)=>i)),out=swapPairs(list);return [out.length,out[0],out[1],out[9998],out[9999],out!==list]; })()", expected: [10000, 1, 0, 9999, 9998, true] },

      { call: "swapPairs([1,2,3,4,5,6,7,8])", expected: [2, 1, 4, 3, 6, 5, 8, 7] },
      { call: "swapPairs([true,false])", expected: [false, true] },
      { call: "(() => { const list = [\"x\",\"y\",\"z\"]; const out = swapPairs(list); return out !== list && out.join(\"\") === \"yxz\"; })()", expected: true },
    ],
  },
  "js-sum-labelled-pairs": {
    solution: "const totalOf = (pairs, label) => { let total = 0; for (const [name, value] of pairs) { if (name === label) total += value; } return total; };",
    junior: "const totalOf = (pairs, label) => {\n  let total = 0;\n  for (const [name, value] of pairs) {\n    if (name === label) {\n      total = total + value;\n    }\n  }\n  return total;\n};",
    senior: "const totalOf = (pairs, label) => {\n  let sum = 0;\n  for (const [name, value] of pairs) if (name === label) sum += value;\n  return sum;\n};",
    hiddenTests: [
      { call: "totalOf(Object.freeze([Object.freeze([\" x \",1.005]),Object.freeze([\"x\",99]),Object.freeze([\" x \",0.2])]),\" x \")", expected: 1.2049999999999998 },
      { call: "(() => { const pairs=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze([i%2?\"🦈\":\"\",-1000000])));return [totalOf(pairs,\"🦈\"),totalOf(pairs,\"\")]; })()", expected: [-5000000000, -5000000000] },

      { call: "totalOf([[\"tea\",3],[\"coffee\",4],[\"tea\",3],[\"tea\",3]], \"tea\")", expected: 9 },
      { call: "totalOf([[\"k\",0.5],[\"k\",0.25]], \"k\")", expected: 0.75 },
      { call: "totalOf([[\"n\",1],[\"N\",100]], \"n\")", expected: 1 },
    ],
  },
  "js-immutable-list-edits": {
    solution: "const withInserted = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index)];\nconst withoutIndex = (list, index) => [...list.slice(0, index), ...list.slice(index + 1)];\nconst withReplaced = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index + 1)];",
    junior: "const withInserted = (list, index, item) => {\n  const head = list.slice(0, index);\n  const tail = list.slice(index);\n  return [...head, item, ...tail];\n};\nconst withoutIndex = (list, index) => {\n  const head = list.slice(0, index);\n  const tail = list.slice(index + 1);\n  return [...head, ...tail];\n};\nconst withReplaced = (list, index, item) => {\n  const head = list.slice(0, index);\n  const tail = list.slice(index + 1);\n  return [...head, item, ...tail];\n};",
    senior: `// One non-mutating splice covers all three edits: copy up to the index, add the new items, copy the rest.
const spliced = (list, index, remove, ...insert) => [...list.slice(0, index), ...insert, ...list.slice(index + remove)];
const withInserted = (list, index, item) => spliced(list, index, 0, item);
const withoutIndex = (list, index) => spliced(list, index, 1);
const withReplaced = (list, index, item) => spliced(list, index, 1, item);`,
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),item=Object.freeze([1]),list=Object.freeze([a,undefined,NaN,-0,b]);const ins=withInserted(list,1,item),rep=withReplaced(list,1,item),rem=withoutIndex(list,1),nothing=withoutIndex(list,list.length);return [ins!==list,ins[0]===a,ins[1]===item,ins[2]===undefined,rep[1]===item,Number.isNaN(rep[2]),Object.is(rep[3],-0),rem[0]===a,Number.isNaN(rem[1]),rem[3]===b,nothing!==list,nothing.length,withInserted(Object.freeze([]),0,item)[0]===item,withoutIndex(Object.freeze([]),0)!==withoutIndex(Object.freeze([]),0)]; })()", expected: [true, true, true, true, true, true, true, true, true, true, true, 5, true, true] },
      { call: "(() => { const list=Object.freeze(Array.from({length:10000},(_,i)=>i)),a=withInserted(list,10000,null),b=withoutIndex(list,9999),c=withReplaced(list,0,null);return [a.length,a[10000],b.length,b[9998],c.length,c[0],c[9999],list[0]]; })()", expected: [10001, null, 9999, 9998, 10000, null, 9999, 0] },

      { call: "withReplaced([\"a\",\"b\",\"c\",\"d\"], 0, \"z\")", expected: ["z", "b", "c", "d"] },
      { call: "(() => { const list = [\"a\",\"b\"]; const out = withInserted(list, 1, \"x\"); return out !== list && out.length === 3 && list.length === 2; })()", expected: true },
      { call: "withoutIndex([5,6,7,8], 3)", expected: [5, 6, 7] },
    ],
  },
  "js-variadic-sum": {
    solution: "const sumAll = (...numbers) => { let total = 0; for (const number of numbers) total += number; return total; };",
    junior: "const sumAll = (...numbers) => {\n  let total = 0;\n  for (const number of numbers) {\n    total = total + number;\n  }\n  return total;\n};",
    senior: "const sumAll = (...numbers) => {\n  let sum = 0;\n  for (const value of numbers) sum += value;\n  return sum;\n};",
    hiddenTests: [
      { call: "sumAll(1.005)", expected: 1.005 },
      { call: "(() => { const values=Object.freeze([1000000,-1000000,1e-9]);return [sumAll(...values)===1e-9,values[0],sumAll(...Object.freeze(Array.from({length:1000},()=>-1000000)))]; })()", expected: [true, 1000000, -1000000000] },

      { call: "sumAll(1,2,3,4,5,6,7,8,9,10)", expected: 55 },
      { call: "sumAll(7)", expected: 7 },
      { call: "(() => { const values = [2, 4, 8]; return sumAll(...values, 16); })()", expected: 30 },
    ],
  },
  "js-make-tally": {
    solution: "const makeTally = start => { let total = start; return (...values) => { for (const value of values) total += value; return total; }; };",
    junior: `const makeTally = start => {
  let total = start;
  const tally = (...values) => {
    for (let index = 0; index < values.length; index += 1) {
      total = total + values[index];
    }
    return total;
  };
  return tally;
};`,
    senior: "const makeTally = start => {\n  let total = start;\n  return (...values) => {\n    for (const value of values) total += value;\n    return total;\n  };\n};",
    hiddenTests: [
      { call: "(() => { const tally=makeTally(1000000);const value=tally(-1000000,1e-9);return [value===1e-9,tally()===value,makeTally(0)!==makeTally(0)]; })()", expected: [true, true, true] },
      { call: "(() => { const a=makeTally(0),b=makeTally(-1);const first=a(1.005);a(...Array.from({length:1000},()=>1000000));let lastB;for(let i=0;i<1000;i++)lastB=b(1);return [first,a(),lastB]; })()", expected: [1.005, 1000000001.005, 999] },

      { call: "(() => { const tally = makeTally(1); tally(1); tally(1); tally(1); return tally(1); })()", expected: 5 },
      { call: "(() => { const tally = makeTally(0); return [tally(2), tally(2), tally(2)]; })()", expected: [2, 4, 6] },
      { call: "(() => { const tally = makeTally(5); tally(...[1, 2, 3]); return tally(); })()", expected: 11 },
    ],
  },
  "js-handlers-keep-index": {
    solution: "const makeHandlers = count => { const handlers = []; for (let index = 0; index < count; index += 1) handlers.push(() => index); return handlers; };",
    junior: `const makeHandlers = count => {
  const handlers = [];
  for (let index = 0; index < count; index += 1) {
    const captured = index;
    const handler = () => {
      return captured;
    };
    handlers.push(handler);
  }
  return handlers;
};`,
    senior: "const makeHandlers = count => {\n  const handlers = [];\n  for (let i = 0; i < count; i++) handlers.push(() => i);\n  return handlers;\n};",
    hiddenTests: [
      { call: "(() => { const a=makeHandlers(3),b=makeHandlers(3),first=a[0],last=a[2];a[0]=()=>99;a.length=0;return [a!==b,first!==b[0],last(),first(),last(),b.map(f=>f()),makeHandlers(0)!==makeHandlers(0)]; })()", expected: [true, true, 2, 0, 2, [0, 1, 2], true] },
      { call: "(() => { const h=makeHandlers(10000);return [h.length,h[9999](),h[0](),h[5000]()]; })()", expected: [10000, 9999, 0, 5000] },

      { call: "makeHandlers(6).map(handler => handler())", expected: [0, 1, 2, 3, 4, 5] },
      { call: "makeHandlers(5)[2]()", expected: 2 },
      { call: "(() => { const handlers = makeHandlers(2); return handlers[0] !== handlers[1]; })()", expected: true },
    ],
  },
  "js-my-map-filter": {
    solution: "const myMap = (list, fn) => { const result = []; for (let index = 0; index < list.length; index += 1) result.push(fn(list[index], index)); return result; };\nconst myFilter = (list, fn) => { const result = []; for (let index = 0; index < list.length; index += 1) { if (fn(list[index], index)) result.push(list[index]); } return result; };",
    junior: `const myMap = (list, fn) => {
  const result = [];
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    const mapped = fn(item, index);
    result.push(mapped);
  }
  return result;
};
const myFilter = (list, fn) => {
  const result = [];
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    const keep = fn(item, index);
    if (keep) {
      result.push(item);
    }
  }
  return result;
};`,
    senior: "const myMap = (list, fn) => {\n  const result = new Array(list.length);\n  for (let index = 0; index < list.length; index += 1) result[index] = fn(list[index], index);\n  return result;\n};\nconst myFilter = (list, fn) => {\n  const result = [];\n  for (let i = 0; i < list.length; i++) if (fn(list[i], i)) result.push(list[i]);\n  return result;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),input=Object.freeze([a,b,undefined]),calls=[];const values=[b,undefined,a];const mapped=myMap(input,(...args)=>{calls.push(args);return values[args[1]];});const filtered=myFilter(input,(...args)=>{calls.push(args);return args[1]===0?{}:args[1]===1?0:\"yes\";});return [mapped!==input,mapped.every((v,i)=>Object.is(v,values[i])),filtered[0]===a,filtered[1]===undefined,filtered.length,calls.length,calls.every((args,i)=>args.length===2&&args[1]===i%3&&Object.is(args[0],input[i%3])),myMap(Object.freeze([]),()=>0)!==myMap(Object.freeze([]),()=>0),myFilter(Object.freeze([]),()=>true)!==myFilter(Object.freeze([]),()=>true)]; })()", expected: [true, true, true, true, 2, 6, true, true, true] },
      { call: "(() => { const reason={},seen=[];const run=fn=>{try{fn(Object.freeze([1,2,3]),(v,i)=>{seen.push(i);if(i===1)throw reason;return v;});return false;}catch(error){return error===reason;}};return [run(myMap),run(myFilter),seen]; })()", expected: [true, true, [0, 1, 0, 1]] },
      { call: "(() => { const list=Object.freeze(Array.from({length:10000},(_,i)=>i));const a=myMap(list,(v,i)=>v+i),b=myFilter(list,(v,i)=>i%2===0);return [a.length,a[9999],b.length,b[4999],list[9999]]; })()", expected: [10000, 19998, 5000, 9998, 9999] },

      { call: "(() => { const list = [3,4,5]; list.map = null; list.filter = null; return [myMap(list, n => n + 1), myFilter(list, n => n > 3)]; })()", expected: [[4, 5, 6], [4, 5]] },
      { call: "myFilter([0, 1, \"\", \"a\", null], item => item)", expected: [1, "a"] },
      { call: "myMap([1,2,3,4,5,6], (n, index) => n * index)", expected: [0, 2, 6, 12, 20, 30] },
      { call: "myFilter([10, 20, 30], (n, index) => index !== 1)", expected: [10, 30] },
    ],
  },
  "js-my-reduce": {
    solution: "const myReduce = (list, fn, initial) => { let accumulator = initial; let start = 0; if (initial === undefined && list.length > 0) { accumulator = list[0]; start = 1; } for (let index = start; index < list.length; index += 1) accumulator = fn(accumulator, list[index], index); return accumulator; };",
    junior: `const myReduce = (list, fn, initial) => {
  let accumulator;
  let startIndex;
  if (initial === undefined) {
    accumulator = list[0];
    startIndex = 1;
  } else {
    accumulator = initial;
    startIndex = 0;
  }
  for (let index = startIndex; index < list.length; index += 1) {
    accumulator = fn(accumulator, list[index], index);
  }
  return accumulator;
};`,
    senior: "const myReduce = (list, fn, initial) => {\n  let result = initial;\n  let i = 0;\n  if (initial === undefined && list.length) { result = list[0]; i = 1; }\n  for (; i < list.length; i++) result = fn(result, list[i], i);\n  return result;\n};",
    hiddenTests: [
      { call: "(() => { const seed=Object.freeze({}),item=Object.freeze({}),list=Object.freeze([item,undefined]),out=Object.freeze([]),calls=[];const result=myReduce(list,(...args)=>{calls.push(args.length,args[0]===seed,args[1]===item,args[2]);return seed;},seed);let emptyCalls=0;const empty=myReduce(Object.freeze([]),()=>{emptyCalls++;},undefined);let oneCalls=0;const one=myReduce(Object.freeze([item]),()=>{oneCalls++;},undefined);return [result===seed,calls,empty===undefined,emptyCalls,one===item,oneCalls,myReduce(Object.freeze([]),()=>0,out)===out]; })()", expected: [true, [3, true, true, 0, 3, true, false, 1], true, 0, true, 0, true] },
      { call: "(() => { const reason={},seen=[];try{myReduce(Object.freeze([1,2,3]),(acc,item,index)=>{seen.push(index);if(index===1)throw reason;return acc+item;},0);return [false,seen];}catch(error){return [error===reason,seen];} })()", expected: [true, [0, 1]] },
      { call: "myReduce(Object.freeze(Array.from({length:10000},()=>1)),(acc,item)=>acc+item,0)", expected: 10000 },

      { call: "(() => { const list = [1,2,3,4]; list.reduce = null; return myReduce(list, (a, b) => a * b, 1); })()", expected: 24 },
      { call: "myReduce([[1],[2],[3]], (flat, part) => flat.concat(part), [])", expected: [1, 2, 3] },
      { call: "myReduce([\"x\"], (a, b) => a + b)", expected: "x" },
      { call: "myReduce([1, 2, 3], (total, n) => total + n)", expected: 6 },
    ],
  },
  "js-label-numbers": {
    solution: "const labelNumbers = numbers => numbers.map(number => number > 0 ? \"positive\" : number < 0 ? \"negative\" : \"zero\");",
    junior: "const labelNumbers = numbers => {\n  return numbers.map(number => {\n    const label = number > 0 ? \"positive\" : number < 0 ? \"negative\" : \"zero\";\n    return label;\n  });\n};",
    senior: "const labelNumbers = numbers => numbers.map(n => n === 0 ? \"zero\" : n > 0 ? \"positive\" : \"negative\");",
    hiddenTests: [
      { call: "labelNumbers(Object.freeze([1e-9,-1e-9,0,-0,1000000,-1000000]))", expected: ["positive", "negative", "zero", "zero", "positive", "negative"] },
      { call: "(() => { const input=Object.freeze(Array.from({length:10000},(_,i)=>i%2?1:-1)),a=labelNumbers(input);return [a.length,a[0],a[9999],a!==labelNumbers(input),labelNumbers(Object.freeze([]))!==labelNumbers(Object.freeze([]))]; })()", expected: [10000, "negative", "positive", true, true] },

      { call: "labelNumbers([1,-2,3,-4,0,5])", expected: ["positive", "negative", "positive", "negative", "zero", "positive"] },
      { call: "labelNumbers([-100])", expected: ["negative"] },
      { call: "(() => { const numbers = [1, -1]; labelNumbers(numbers); return numbers; })()", expected: [1, -1] },
    ],
  },
  "js-sum-mixed-values": {
    solution: "const sumMixed = values => { let total = 0; for (const value of values) total += Number(value); return total; };",
    junior: `const sumMixed = values => {
  let total = 0;
  for (const value of values) {
    if (typeof value === "string") {
      total = total + Number(value);
    } else {
      total = total + value;
    }
  }
  return total;
};`,
    senior: "const sumMixed = values => {\n  let total = 0;\n  for (const value of values) total += Number(value);\n  return total;\n};",
    hiddenTests: [
      { call: "sumMixed(Object.freeze([\"0x10\",\"0b10\",\"1e2\",\" \",\"1.005\",-1]))", expected: 118.005 },
      { call: "(() => { const values=Object.freeze(Array.from({length:10000},()=>\"-1000000\"));return [sumMixed(values),sumMixed(Object.freeze([1000000,\"-1000000\",\"1e-9\"]))===1e-9]; })()", expected: [-10000000000, true] },

      { call: "sumMixed([\"7\",\"8\",\"9\"])", expected: 24 },
      { call: "sumMixed([100,\"100\",100,\"100\"])", expected: 400 },
      { call: "sumMixed([\"0\", 0, \"0\"])", expected: 0 },
    ],
  },
  "js-compact-values": {
    solution: "const compactLoop = values => { const result = []; for (const value of values) { if (value) result.push(value); } return result; };\nconst compactFilter = values => values.filter(Boolean);",
    junior: "const compactLoop = values => {\n  const kept = [];\n  for (const value of values) {\n    if (value) { kept.push(value); }\n  }\n  return kept;\n};\nconst compactFilter = values => {\n  const kept = values.filter(Boolean);\n  return kept;\n};",
    senior: `const compactLoop = values => {
  const kept = [];
  for (const value of values) {
    if (!value) continue; // false, 0, "", null, undefined and NaN all fail this test
    kept.push(value);
  }
  return kept;
};
const compactFilter = values => values.filter(Boolean);`,
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),fn=()=>{throw Error(\"do not execute\");},symbol=Symbol(\"x\"),input=Object.freeze([false,0,-0,0n,\"\",null,undefined,NaN,1n,\"0\",\"false\",a,b,fn,symbol]),expected=[1n,\"0\",\"false\",a,b,fn,symbol];const x=compactLoop(input),y=compactFilter(input);return [x.length,y.length,x.every((v,i)=>Object.is(v,expected[i])),y.every((v,i)=>Object.is(v,expected[i])),x!==y,compactLoop(Object.freeze([]))!==compactLoop(Object.freeze([])),compactFilter(Object.freeze([]))!==compactFilter(Object.freeze([]))]; })()", expected: [7, 7, true, true, true, true, true] },
      { call: "(() => { const values=Object.freeze(Array.from({length:10000},(_,i)=>i%2?i:0));return [compactLoop(values).length,compactFilter(values)[4999],values.length]; })()", expected: [5000, 9999, 10000] },

      { call: "compactFilter([1, 0, 2, 0, 3, 0, 4, \"\"])", expected: [1, 2, 3, 4] },
      { call: "compactLoop([-1, \"false\", true])", expected: [-1, "false", true] },
      { call: "compactFilter([null, \"x\", undefined, \"y\"])", expected: ["x", "y"] },
    ],
  },
  "js-count-nested-keys": {
    solution: "const countKeys = object => { let count = 0; for (const key in object) { if (!Object.hasOwn(object, key)) continue; count += 1; const value = object[key]; if (value !== null && typeof value === \"object\" && !Array.isArray(value)) count += countKeys(value); } return count; };",
    junior: "const countKeys = object => {\n  let count = 0;\n  for (const key in object) {\n    if (!Object.hasOwn(object, key)) continue;\n    count = count + 1;\n    const value = object[key];\n    const isObject = typeof value === \"object\";\n    const isNull = value === null;\n    const isArray = Array.isArray(value);\n    if (isObject && !isNull && !isArray) count += countKeys(value);\n  }\n  return count;\n};",
    senior: "const countKeys = object => {\n  let total = 0;\n  for (const key in object) {\n    if (!Object.hasOwn(object, key)) continue;\n    const value = object[key];\n    total += 1;\n    if (value && typeof value === \"object\" && !Array.isArray(value)) total += countKeys(value);\n  }\n  return total;\n};",
    hiddenTests: [
      { call: "(() => { const proto=Object.freeze({inherited:{ignored:1}}),child=Object.create(proto);child.x=1;Object.freeze(child);const root=Object.create(proto);root.child=child;root.array=Object.freeze([{notCounted:1}]);root.nil=null;Object.defineProperty(root,\"hidden\",{value:3,enumerable:false});root[Symbol(\"s\")]=4;Object.freeze(root);return countKeys(root); })()", expected: 4 },
      { call: "countKeys(Object.freeze(JSON.parse('{\"__proto__\":{\"x\":1},\"constructor\":2}')))", expected: 3 },
      { call: "(() => { let deep=Object.freeze({leaf:1});for(let i=0;i<100;i++)deep=Object.freeze({next:deep});const wide=Object.create(null);for(let i=0;i<10000;i++)wide[\"k\"+i]=i;Object.freeze(wide);return [countKeys(deep),countKeys(wide)]; })()", expected: [101, 10000] },

      { call: "countKeys({a:1,b:2,c:3,d:{e:4,f:5,g:{h:6}}})", expected: 8 },
      { call: "countKeys({x:{y:{}},z:{}})", expected: 3 },
      { call: "countKeys(JSON.parse('{\"a\":{\"b\":1},\"c\":[{\"d\":1}]}'))", expected: 3 },
    ],
  },
  "js-order-total": {
    solution: "const orderTotal = items => { let total = 0; for (const item of items) total += item.price * (item.quantity ?? 1); return total; };",
    junior: "const orderTotal = items => {\n  let total = 0;\n  for (const item of items) {\n    const quantity = item.quantity ?? 1;\n    const lineTotal = item.price * quantity;\n    total = total + lineTotal;\n  }\n  return total;\n};",
    senior: "const orderTotal = items => {\n  let total = 0;\n  for (const { price, quantity } of items) total += price * (quantity ?? 1);\n  return total;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({price:1.005}),b=Object.freeze({price:2,quantity:null}),c=Object.freeze({price:99,quantity:0}),list=Object.freeze([a,b,c]);return [orderTotal(list),Object.hasOwn(a,\"quantity\"),b.quantity,c.quantity]; })()", expected: [3.005, false, null, 0] },
      { call: "orderTotal(Object.freeze(Array.from({length:10000},()=>Object.freeze({price:1000000,quantity:1000}))))", expected: 10000000000000 },

      { call: "orderTotal([{price:1.5,quantity:2},{price:2.5},{price:0,quantity:9}])", expected: 5.5 },
      { call: "orderTotal([{price:7,quantity:undefined}])", expected: 7 },
      { call: "orderTotal([{price:2,quantity:0},{price:2}])", expected: 2 },
    ],
  },
  "js-frequency-map": {
    solution: "const frequencies = values => { const counts = new Map(); for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1); return counts; };",
    junior: `const frequencies = values => {
  const counts = new Map();
  for (const value of values) {
    if (counts.has(value)) {
      counts.set(value, counts.get(value) + 1);
    } else {
      counts.set(value, 1);
    }
  }
  return counts;
};`,
    senior: "const frequencies = values => {\n  const result = new Map();\n  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);\n  return result;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze({}),values=Object.freeze([a,b,a,NaN,NaN,0,-0,\"0\",undefined]);const m=frequencies(values),keys=[...m.keys()];return [m.size,m.get(a),m.get(b),m.get(NaN),m.get(0),m.get(\"0\"),m.get(undefined),keys[0]===a,keys[1]===b,Number.isNaN(keys[2]),Object.is(keys[3],0),keys[4]===\"0\",keys[5]===undefined,m!==frequencies(values),frequencies(Object.freeze([]))!==frequencies(Object.freeze([]))]; })()", expected: [6, 2, 1, 2, 2, 1, 1, true, true, true, true, true, true, true, true] },
      { call: "(() => { const key=Object.freeze({}),values=Object.freeze(Array.from({length:10000},()=>key)),m=frequencies(values);return [m.size,m.get(key),[...m.keys()][0]===key,values.length]; })()", expected: [1, 10000, true, 10000] },

      { call: "[...frequencies([\"r\",\"g\",\"b\",\"g\",\"r\",\"r\"])]", expected: [["r", 3], ["g", 2], ["b", 1]] },
      { call: "frequencies([true,true,false]).get(true)", expected: 2 },
      { call: "frequencies([null, null]).get(null)", expected: 2 },
    ],
  },
  "js-map-entries-at-least": {
    solution: "const entriesAtLeast = (map, min) => { const pairs = []; for (const [key, value] of map) { if (value >= min) pairs.push([key, value]); } return pairs; };",
    junior: "const entriesAtLeast = (map, min) => {\n  const matching = [];\n  for (const [key, value] of map) {\n    const qualifies = value >= min;\n    if (qualifies) matching.push([key, value]);\n  }\n  return matching;\n};",
    senior: "const entriesAtLeast = (map, min) => {\n  const entries = [];\n  for (const [key, value] of map) if (value >= min) entries.push([key, value]);\n  return entries;\n};",
    hiddenTests: [
      { call: "(() => { const key=Object.freeze({}),map=new Map([[key,0],[\"z\",3],[\"a\",3]]),a=entriesAtLeast(map,0),b=entriesAtLeast(map,0);return [a.length,a[0][0]===key,a[1][0],a[2][0],a!==b,a[0]!==b[0],a[0]!==a[1],map.size,map.get(key),[...map.keys()][0]===key]; })()", expected: [3, true, "z", "a", true, true, true, 3, 0, true] },
      { call: "(() => { const map=new Map([[NaN,-1],[undefined,0],[-0,0.25]]),a=entriesAtLeast(map,-1);return [a.length,Number.isNaN(a[0][0]),a[1][0]===undefined,Object.is(a[2][0],0),a.map(pair=>pair[1]),entriesAtLeast(new Map(),0)!==entriesAtLeast(new Map(),0)]; })()", expected: [3, true, true, true, [-1, 0, 0.25], true] },
      { call: "(() => { const map=new Map(Array.from({length:10000},(_,i)=>[i,i/10000])),a=entriesAtLeast(map,0);return [a.length,a[9999],map.size]; })()", expected: [10000, [9999, 0.9999], 10000] },

      { call: "entriesAtLeast(new Map([[\"p\",7],[\"q\",8],[\"r\",1],[\"s\",9]]), 8)", expected: [["q", 8], ["s", 9]] },
      { call: "entriesAtLeast(new Map([[1, 1],[2, 2]]), 2)", expected: [[2, 2]] },
      { call: "entriesAtLeast(new Map([[\"neg\",-1]]), -5)", expected: [["neg", -1]] },
    ],
  },
  "js-chunk-with-loop": {
    solution: "const chunkBy = (items, size) => { const groups = []; let current = []; for (let index = 0; index < items.length; index += 1) { current.push(items[index]); if (current.length === size) { groups.push(current); current = []; } } if (current.length > 0) groups.push(current); return groups; };",
    junior: `const chunkBy = (items, size) => {
  const groups = [];
  for (let index = 0; index < items.length; index += 1) {
    const startsNewGroup = index % size === 0;
    if (startsNewGroup) {
      groups.push([]);
    }
    const lastGroup = groups[groups.length - 1];
    lastGroup.push(items[index]);
  }
  return groups;
};`,
    senior: "const chunkBy = (items, size) => {\n  const groups = [];\n  for (let i = 0; i < items.length; i++) {\n    if (i % size === 0) groups.push([]);\n    groups[groups.length - 1].push(items[i]);\n  }\n  return groups;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),items=Object.freeze([a,b,undefined,NaN,-0]),out=chunkBy(items,2),other=chunkBy(items,2);return [out.length,out[0][0]===a,out[0][1]===b,out[1][0]===undefined,Number.isNaN(out[1][1]),Object.is(out[2][0],-0),out!==other,out[0]!==other[0],out[0]!==out[1],out[0]!==items,items[0]===a,chunkBy(Object.freeze([]),10000)!==chunkBy(Object.freeze([]),10000)]; })()", expected: [3, true, true, true, true, true, true, true, true, true, true, true] },
      { call: "(() => { const items=Object.freeze(Array.from({length:10000},(_,i)=>i)),a=chunkBy(items,1),b=chunkBy(items,10000);return [a.length,a[9999][0],a[0]!==a[1],b.length,b[0].length,b[0][9999],b[0]!==items]; })()", expected: [10000, 9999, true, 1, 10000, 9999, true] },

      { call: "(() => { const items = [1,2,3,4,5,6,7]; items.slice = null; return chunkBy(items, 3); })()", expected: [[1, 2, 3], [4, 5, 6], [7]] },
      { call: "chunkBy([1,2,3,4,5,6], 3)", expected: [[1, 2, 3], [4, 5, 6]] },
      { call: "chunkBy([9], 4)", expected: [[9]] },
    ],
  },
  "js-zip-lists": {
    solution: "const zip = (left, right) => { const pairs = []; const length = Math.min(left.length, right.length); for (let index = 0; index < length; index += 1) pairs.push([left[index], right[index]]); return pairs; };",
    junior: `const zip = (left, right) => {
  const pairs = [];
  let shorter = left.length;
  if (right.length < shorter) {
    shorter = right.length;
  }
  for (let index = 0; index < shorter; index += 1) {
    const pair = [left[index], right[index]];
    pairs.push(pair);
  }
  return pairs;
};`,
    senior: "const zip = (left, right) => {\n  const pairs = [];\n  for (let i = 0, end = Math.min(left.length, right.length); i < end; i++) pairs.push([left[i], right[i]]);\n  return pairs;\n};",
    hiddenTests: [
      { call: "(() => { const a=Object.freeze({}),b=Object.freeze([]),c=Object.freeze({}),left=Object.freeze([a,undefined,NaN,-0]),right=Object.freeze([b,false,\"x\",c]),out=zip(left,right),other=zip(left,right);return [out.length,out[0][0]===a,out[0][1]===b,out[1][0]===undefined,Number.isNaN(out[2][0]),Object.is(out[3][0],-0),out[3][1]===c,out!==other,out[0]!==out[1],out[0]!==other[0],left[0]===a,zip(Object.freeze([]),right)!==zip(Object.freeze([]),right)]; })()", expected: [4, true, true, true, true, true, true, true, true, true, true, true] },
      { call: "(() => { const left=Object.freeze(Array.from({length:10000},(_,i)=>i)),right=Object.freeze(Array.from({length:10000},(_,i)=>-i)),out=zip(left,right);return [out.length,out[0][0],out[9999][0],out[9999][1]]; })()", expected: [10000, 0, 9999, -9999] },

      { call: "zip([1,2,3,4,5], [5,4,3,2,1])", expected: [[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]] },
      { call: "zip([\"a\"], [1,2,3,4])", expected: [["a", 1]] },
      { call: "(() => { const left = [1,2]; const right = [3,4]; zip(left, right); return [left, right]; })()", expected: [[1, 2], [3, 4]] },
    ],
  },
  "js-rotate-by-n": {
    solution: "const rotateBy = (list, n) => { const length = list.length; if (length === 0) return []; const shift = ((n % length) + length) % length; const result = []; for (let index = 0; index < length; index += 1) result.push(list[(index - shift + length) % length]); return result; };",
    junior: `const rotateBy = (list, n) => {
  const length = list.length;
  const result = [];
  if (length === 0) {
    return result;
  }
  let shift = n % length;
  if (shift < 0) {
    shift = shift + length;
  }
  for (let index = 0; index < length; index += 1) {
    const destination = (index + shift) % length;
    result[destination] = list[index];
  }
  return result;
};`,
    senior: `const rotateBy = (list, n) => {
  const { length } = list;
  // Each slot reads from (index - n) mod length, made non-negative so left turns and a large n wrap alike.
  return list.map((_, index) => list[(((index - n) % length) + length) % length]);
};`,
    hiddenTests: [
      { call: "rotateBy([1,2,3,4], 4)", expected: [1, 2, 3, 4] },
      { call: "rotateBy([1,2,3,4,5,6], -8)", expected: [3, 4, 5, 6, 1, 2] },
      { call: "(() => { const list = [1,2,3]; rotateBy(list, 1); return list; })()", expected: [1, 2, 3] },
    ],
  },
  "js-run-length-encode": {
    solution: "const runLength = text => { let result = \"\"; let count = 0; for (let index = 0; index < text.length; index += 1) { count += 1; if (text[index] !== text[index + 1]) { result += count + text[index]; count = 0; } } return result; };",
    junior: `const runLength = text => {
  if (text === "") {
    return "";
  }
  let encoded = "";
  let current = text[0];
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === current) {
      count = count + 1;
    } else {
      encoded = encoded + count + current;
      current = character;
      count = 1;
    }
  }
  encoded = encoded + count + current;
  return encoded;
};`,
    senior: `const runLength = text => {
  let encoded = "";
  for (let start = 0; start < text.length; ) {
    let end = start;
    while (text[end] === text[start]) end += 1; // past the end text[end] is undefined, which closes the run
    encoded += \`\${end - start}\${text[start]}\`;
    start = end;
  }
  return encoded;
};`,
    hiddenTests: [
      { call: "runLength(\"xxxxyyyxxz\")", expected: "4x3y2x1z" },
      { call: "runLength(\"ab\")", expected: "1a1b" },
      { call: "runLength(\"       \")", expected: "7 " },
    ],
  },
  "js-pair-with-sum": {
    solution: "const pairWithSum = (sorted, target) => { let left = 0; let right = sorted.length - 1; while (left < right) { const sum = sorted[left] + sorted[right]; if (sum === target) return [sorted[left], sorted[right]]; if (sum < target) left += 1; else right -= 1; } return null; };",
    junior: `const pairWithSum = (sorted, target) => {
  for (let first = 0; first < sorted.length; first += 1) {
    for (let second = first + 1; second < sorted.length; second += 1) {
      const sum = sorted[first] + sorted[second];
      if (sum === target) {
        return [sorted[first], sorted[second]];
      }
    }
  }
  return null;
};`,
    senior: `const pairWithSum = (sorted, target) => {
  for (let left = 0, right = sorted.length - 1; left < right; ) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [sorted[left], sorted[right]];
    // Too small even with the largest value still in play, so this left value can never pair: skip it for good.
    if (sum < target) left += 1;
    else right -= 1;
  }
  return null;
};`,
    hiddenTests: [
      { call: "pairWithSum([2,3,5,8,13,21], 26)", expected: [5, 21] },
      { call: "pairWithSum([1,1,2,2], 2)", expected: [1, 1] },
      { call: "pairWithSum([10,20,30,40,50], 90)", expected: [40, 50] },
    ],
  },
  "js-binary-search": {
    solution: "const binarySearch = (sorted, target) => { let low = 0; let high = sorted.length - 1; while (low <= high) { const middle = Math.floor((low + high) / 2); if (sorted[middle] === target) return middle; if (sorted[middle] < target) low = middle + 1; else high = middle - 1; } return -1; };",
    junior: `const binarySearch = (sorted, target) => {
  let low = 0;
  let high = sorted.length - 1;
  let foundAt = -1;
  while (low <= high && foundAt === -1) {
    const middle = Math.floor((low + high) / 2);
    const value = sorted[middle];
    if (value === target) {
      foundAt = middle;
    } else if (value < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return foundAt;
};`,
    senior: `const binarySearch = (sorted, target) => {
  let low = 0;
  let high = sorted.length; // half-open: the answer, if any, sits in [low, high)
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = sorted[middle];
    if (value === target) return middle;
    if (value < target) low = middle + 1;
    else high = middle;
  }
  return -1;
};`,
    hiddenTests: [
      { call: "binarySearch([-10, -0.5, 0, 0.75, 9], 0.75)", expected: 3 },
      { call: "binarySearch([1, 3, 5], -2)", expected: -1 },
      { call: "binarySearch([1, 3, 5], 6)", expected: -1 },
      { call: "binarySearch([5], 4)", expected: -1 },
      { call: "(() => { const values = [1, 3, 5]; const keys = Reflect.ownKeys(values); const before = keys.map(key => Object.getOwnPropertyDescriptor(values, key)); const proto = Object.getPrototypeOf(values); const result = binarySearch(values, 3); const after = Reflect.ownKeys(values); return result === 1 && Object.getPrototypeOf(values) === proto && after.length === keys.length && keys.every((key, i) => { const old = before[i], now = Object.getOwnPropertyDescriptor(values, key); return after[i] === key && now && now.value === old.value && now.writable === old.writable && now.enumerable === old.enumerable && now.configurable === old.configurable; }); })()", expected: true },
      { call: "binarySearch(Object.freeze(Array.from({ length: 10000 }, (_, i) => i - 5000)), 4999)", expected: 9999 },
      { call: "(() => { let reads = 0; const big = Array.from({ length: 1000 }, (_, index) => index * 2); const watched = new __probe.Proxy(big, { get: (list, key) => { if (__probe.isIndex(key)) reads += 1; return list[key]; } }); const index = binarySearch(watched, 1998); return [index, reads < 30]; })()", expected: [999, true] },
      { call: "binarySearch([-9,-4,0,3,8,12,20], -4)", expected: 1 },
      { call: "binarySearch([10,20,30], 25)", expected: -1 },
    ],
  },
  "js-sliding-window-max": {
    solution: "const windowMax = (numbers, size) => { const result = []; for (let start = 0; start + size <= numbers.length; start += 1) { let best = numbers[start]; for (let index = start + 1; index < start + size; index += 1) { if (numbers[index] > best) best = numbers[index]; } result.push(best); } return result; };",
    junior: `const windowMax = (numbers, size) => {
  const maxes = [];
  const lastStart = numbers.length - size;
  for (let start = 0; start <= lastStart; start += 1) {
    let best = numbers[start];
    for (let offset = 1; offset < size; offset += 1) {
      const candidate = numbers[start + offset];
      if (candidate > best) {
        best = candidate;
      }
    }
    maxes.push(best);
  }
  return maxes;
};`,
    senior: `const windowMax = (numbers, size) => {
  // One entry per window start; Math.max over a slice scans the window without a hand-written inner loop.
  const windows = Math.max(0, numbers.length - size + 1);
  return Array.from({ length: windows }, (_, start) => Math.max(...numbers.slice(start, start + size)));
};`,
    hiddenTests: [
      { call: "windowMax([9,8,7,6,5,4,3,2,1], 4)", expected: [9, 8, 7, 6, 5, 4] },
      { call: "windowMax([1,2,3,4,5,6], 1)", expected: [1, 2, 3, 4, 5, 6] },
      { call: "windowMax([2,2,2,2], 3)", expected: [2, 2] },
    ],
  },
  "js-matrix-transpose": {
    solution: "const transpose = matrix => { const result = []; if (matrix.length === 0) return result; for (let column = 0; column < matrix[0].length; column += 1) { const row = []; for (let line = 0; line < matrix.length; line += 1) row.push(matrix[line][column]); result.push(row); } return result; };",
    junior: `const transpose = matrix => {
  const result = [];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix[row].length; column += 1) {
      if (result[column] === undefined) {
        result[column] = [];
      }
      result[column][row] = matrix[row][column];
    }
  }
  return result;
};`,
    senior: `const transpose = matrix => {
  if (matrix.length === 0) return []; // no first row to take the column count from
  // Walk the columns of the first row; each becomes a row made of that column from every input row.
  return matrix[0].map((_, column) => matrix.map(row => row[column]));
};`,
    hiddenTests: [
      { call: "transpose([[1,2,3,4],[5,6,7,8],[9,10,11,12]])", expected: [[1, 5, 9], [2, 6, 10], [3, 7, 11], [4, 8, 12]] },
      { call: "transpose([[\"a\",\"b\"],[\"c\",\"d\"],[\"e\",\"f\"]])", expected: [["a", "c", "e"], ["b", "d", "f"]] },
      { call: "(() => { const out = transpose([[1,2],[3,4]]); return out[0] !== out[1]; })()", expected: true },
    ],
  },
};
