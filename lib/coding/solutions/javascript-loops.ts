// Server-only reference solutions and hidden tests for lib/coding/tasks/javascript-loops.ts.
// Never import from client code. Hidden tests target the obvious shortcut: a
// hard-coded return, mutating an input the prompt protects, a built-in the task
// asks the learner to write by hand, or a value the visible tests never used.

import type { CodingSolution } from '../types';

export const JAVASCRIPT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "js-digit-sum": {
    solution: "const digitSum = n => { let total = 0; while (n > 0) { total += n % 10; n = Math.floor(n / 10); } return total; };",
    hiddenTests: [
      { call: "digitSum(99999)", expected: 45 },
      { call: "digitSum(305)", expected: 8 },
      { call: "digitSum(10)", expected: 1 },
    ],
  },
  "js-count-multiples": {
    solution: "const countMultiples = (n, from, to) => { let count = 0; for (let value = from; value <= to; value += 1) { if (value % n === 0) count += 1; } return count; };",
    hiddenTests: [
      { call: "countMultiples(6, 1, 100)", expected: 16 },
      { call: "countMultiples(1, 3, 9)", expected: 7 },
      { call: "countMultiples(10, 15, 25)", expected: 1 },
    ],
  },
  "js-words-of-length": {
    solution: "const countWordsOfLength = (sentence, length) => { let count = 0; for (const word of sentence.split(\" \")) { if (word.length === length) count += 1; } return count; };",
    hiddenTests: [
      { call: "countWordsOfLength(\"red green blue\", 4)", expected: 1 },
      { call: "countWordsOfLength(\"ab ab ab ab\", 2)", expected: 4 },
      { call: "countWordsOfLength(\"xyz\", 3)", expected: 1 },
    ],
  },
  "js-queue-with-shift": {
    solution: "const serveNext = (queue, newcomer) => { queue.push(newcomer); return queue.shift(); };",
    hiddenTests: [
      { call: "(() => { const queue = [\"x\",\"y\",\"z\"]; const served = serveNext(queue, \"w\"); return [served, queue.length, queue[queue.length - 1]]; })()", expected: ["x", 3, "w"] },
      { call: "(() => { const queue = [\"a\"]; serveNext(queue, \"b\"); serveNext(queue, \"c\"); return queue; })()", expected: ["c"] },
      { call: "(() => { const queue = []; serveNext(queue, \"p\"); return queue.length; })()", expected: 0 },
    ],
  },
  "js-swap-stack-top": {
    solution: "const swapTop = (stack, item) => { const top = stack.pop(); stack.push(item); return top; };",
    hiddenTests: [
      { call: "(() => { const stack = [7,8,9,10]; const top = swapTop(stack, 0); return [top, stack.length, stack[3]]; })()", expected: [10, 4, 0] },
      { call: "(() => { const stack = []; swapTop(stack, 1); swapTop(stack, 2); return stack; })()", expected: [2] },
      { call: "(() => { const stack = [\"x\"]; return swapTop(stack, \"y\") === \"x\" && stack[0] === \"y\"; })()", expected: true },
    ],
  },
  "js-add-to-front": {
    solution: "const addToFront = (list, item) => list.unshift(item);",
    hiddenTests: [
      { call: "(() => { const list = [5,6,7,8]; const length = addToFront(list, 4); return [length, list[0], list.length]; })()", expected: [5, 4, 5] },
      { call: "(() => { const list = []; addToFront(list, null); return list; })()", expected: [null] },
      { call: "(() => { const list = [\"x\"]; return addToFront(list, \"y\") === 2 && list[0] === \"y\" && list[1] === \"x\"; })()", expected: true },
    ],
  },
  "js-remove-a-range": {
    solution: "const removeRange = (list, start, count) => list.splice(start, count);",
    hiddenTests: [
      { call: "(() => { const list = [10,20,30,40,50,60]; const removed = removeRange(list, 2, 3); return [removed, list]; })()", expected: [[30, 40, 50], [10, 20, 60]] },
      { call: "(() => { const list = [\"p\",\"q\",\"r\",\"s\"]; removeRange(list, 3, 1); return list; })()", expected: ["p", "q", "r"] },
      { call: "(() => { const list = [1,2]; return [removeRange(list, 2, 1), list]; })()", expected: [[], [1, 2]] },
    ],
  },
  "js-copy-a-range": {
    solution: "const copyRange = (list, start, end) => list.slice(start, end);",
    hiddenTests: [
      { call: "copyRange([5,6,7,8,9], 2, 5)", expected: [7, 8, 9] },
      { call: "(() => { const list = [\"x\",\"y\",\"z\"]; const copy = copyRange(list, 0, 3); copy.push(\"w\"); return [list, copy.length]; })()", expected: [["x", "y", "z"], 4] },
      { call: "copyRange([], 0, 1)", expected: [] },
    ],
  },
  "js-insert-at-index": {
    solution: "const insertAt = (list, index, item) => { list.splice(index, 0, item); return list; };",
    hiddenTests: [
      { call: "insertAt([10,20,30,40], 3, 35)", expected: [10, 20, 30, 35, 40] },
      { call: "(() => { const list = [\"a\",\"b\",\"c\"]; return insertAt(list, 1, \"z\") === list; })()", expected: true },
      { call: "insertAt([1,2,3], 1, [0])", expected: [1, [0], 2, 3] },
    ],
  },
  "js-rotate-once": {
    solution: "const rotateOnce = list => { if (list.length > 0) list.push(list.shift()); return list; };",
    hiddenTests: [
      { call: "rotateOnce([1,2,3,4,5])", expected: [2, 3, 4, 5, 1] },
      { call: "(() => { const list = [1,2,3]; rotateOnce(list); rotateOnce(list); return list; })()", expected: [3, 1, 2] },
      { call: "rotateOnce([]).length", expected: 0 },
    ],
  },
  "js-last-item-safely": {
    solution: "const lastItem = (list, fallback) => list.length > 0 ? list[list.length - 1] : fallback;",
    hiddenTests: [
      { call: "lastItem([10,20,30,40], -1)", expected: 40 },
      { call: "(() => { const list = [\"x\",\"y\"]; return [lastItem(list, \"?\"), list.length]; })()", expected: ["y", 2] },
      { call: "lastItem([], null)", expected: null },
    ],
  },
  "js-sum-with-for": {
    solution: "const addUp = numbers => { let total = 0; for (let index = 0; index < numbers.length; index += 1) total += numbers[index]; return total; };",
    hiddenTests: [
      { call: "addUp([100,200,300,400])", expected: 1000 },
      { call: "addUp([7])", expected: 7 },
      { call: "addUp([1,1,1,1,1,1,1,1,1,1])", expected: 10 },
    ],
  },
  "js-count-matches": {
    solution: "const countMatches = (items, target) => { let count = 0; for (let index = 0; index < items.length; index += 1) { if (items[index] === target) count += 1; } return count; };",
    hiddenTests: [
      { call: "countMatches([true,false,true,true], true)", expected: 3 },
      { call: "countMatches([0,0,0,0,0], 0)", expected: 5 },
      { call: "countMatches([null, undefined, null], null)", expected: 2 },
    ],
  },
  "js-reverse-in-place": {
    solution: "const reverseInPlace = list => { let left = 0; let right = list.length - 1; while (left < right) { const temp = list[left]; list[left] = list[right]; list[right] = temp; left += 1; right -= 1; } return list; };",
    hiddenTests: [
      { call: "(() => { const list = [1,2,3,4,5]; list.reverse = () => { throw new Error(\"reverse() is not allowed here\"); }; return reverseInPlace(list); })()", expected: [5, 4, 3, 2, 1] },
      { call: "(() => { const list = [1,2]; return reverseInPlace(list) === list; })()", expected: true },
      { call: "(() => { const list = [\"x\",\"y\",\"z\",\"w\"]; reverseInPlace(list); return list.join(\"\"); })()", expected: "wzyx" },
    ],
  },
  "js-countdown-by-step": {
    solution: "const countdownBy = (start, step) => { const result = []; let value = start; while (value > 0) { result.push(value); value -= step; } return result; };",
    hiddenTests: [
      { call: "countdownBy(20, 7)", expected: [20, 13, 6] },
      { call: "countdownBy(1, 1)", expected: [1] },
      { call: "countdownBy(9, 3)", expected: [9, 6, 3] },
    ],
  },
  "js-first-divisible": {
    solution: "const firstDivisible = (numbers, divisor) => { let found = null; let index = 0; while (index < numbers.length) { if (numbers[index] % divisor === 0) { found = numbers[index]; break; } index += 1; } return found; };",
    hiddenTests: [
      { call: "firstDivisible([13,17,19,21,22], 11)", expected: 22 },
      { call: "firstDivisible([8,16,24], 8)", expected: 8 },
      { call: "firstDivisible([-6,9], 3)", expected: -6 },
    ],
  },
  "js-attempt-until": {
    solution: "const attemptUntil = (attempt, limit) => { let calls = 0; let succeeded; do { calls += 1; succeeded = attempt(); } while (!succeeded && calls < limit); return succeeded ? calls : -1; };",
    hiddenTests: [
      { call: "(() => { let calls = 0; const result = attemptUntil(() => { calls += 1; return calls === 6; }, 10); return [result, calls]; })()", expected: [6, 6] },
      { call: "(() => { let calls = 0; attemptUntil(() => { calls += 1; return true; }, 10); return calls; })()", expected: 1 },
      { call: "(() => { let calls = 0; attemptUntil(() => { calls += 1; return false; }, 3); return calls; })()", expected: 3 },
    ],
  },
  "js-join-with-for-of": {
    solution: "const joinWords = (words, separator) => { let result = \"\"; let first = true; for (const word of words) { if (!first) result += separator; result += word; first = false; } return result; };",
    hiddenTests: [
      { call: "joinWords([\"one\",\"two\",\"three\",\"four\"], \" | \")", expected: "one | two | three | four" },
      { call: "(() => { const words = [\"x\",\"y\"]; words.join = () => { throw new Error(\"join() is not allowed here\"); }; return joinWords(words, \"+\"); })()", expected: "x+y" },
      { call: "joinWords([\"\",\"\"], \"-\")", expected: "-" },
    ],
  },
  "js-number-items": {
    solution: "const numberItems = items => { const result = []; for (const [index, item] of items.entries()) result.push((index + 1) + \". \" + item); return result; };",
    hiddenTests: [
      { call: "numberItems([\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\",\"h\",\"i\",\"j\",\"k\"])[10]", expected: "11. k" },
      { call: "numberItems([\"\", \"x\"])", expected: ["1. ", "2. x"] },
      { call: "(() => { const items = [\"a\"]; numberItems(items); return items; })()", expected: ["a"] },
    ],
  },
  "js-times-table": {
    solution: "const timesTable = size => { const table = []; for (let row = 1; row <= size; row += 1) { const cells = []; for (let column = 1; column <= size; column += 1) cells.push(row * column); table.push(cells); } return table; };",
    hiddenTests: [
      { call: "timesTable(5)[4][4]", expected: 25 },
      { call: "timesTable(6).length", expected: 6 },
      { call: "timesTable(7)[2]", expected: [3, 6, 9, 12, 15, 18, 21] },
    ],
  },
  "js-some-and-every": {
    solution: "const passReport = (scores, passMark) => ({ anyPassed: scores.some(score => score >= passMark), allPassed: scores.every(score => score >= passMark) });",
    hiddenTests: [
      { call: "passReport([49,50,51], 50)", expected: { anyPassed: true, allPassed: false } },
      { call: "passReport([100,99,98,97], 97)", expected: { anyPassed: true, allPassed: true } },
      { call: "passReport([0], 1)", expected: { anyPassed: false, allPassed: false } },
    ],
  },
  "js-locate-item": {
    solution: "const locate = (list, item) => ({ present: list.includes(item), index: list.indexOf(item) });",
    hiddenTests: [
      { call: "locate([\"x\",\"y\",\"z\",\"w\"], \"w\")", expected: { present: true, index: 3 } },
      { call: "locate([0, false, \"\"], false)", expected: { present: true, index: 1 } },
      { call: "locate([null], undefined)", expected: { present: false, index: -1 } },
    ],
  },
  "js-remove-by-id": {
    solution: "const removeById = (items, id) => { const index = items.findIndex(item => item.id === id); if (index === -1) return null; return items.splice(index, 1)[0]; };",
    hiddenTests: [
      { call: "(() => { const items = [{id:\"a\"},{id:\"b\"},{id:\"c\"},{id:\"d\"}]; const removed = removeById(items, \"d\"); return [removed.id, items.length]; })()", expected: ["d", 3] },
      { call: "(() => { const items = [{id:1},{id:2},{id:3}]; removeById(items, 42); return items.length; })()", expected: 3 },
      { call: "(() => { const items = [{id:1}]; return removeById(items, 1) !== null && items.length === 0; })()", expected: true },
    ],
  },
  "js-highest-with-reduce": {
    solution: "const highest = numbers => numbers.length === 0 ? null : numbers.reduce((best, number) => number > best ? number : best);",
    hiddenTests: [
      { call: "highest([10,100,1000,999])", expected: 1000 },
      { call: "highest([0,-1])", expected: 0 },
      { call: "highest([2.5,2.75,2.6])", expected: 2.75 },
    ],
  },
  "js-count-by-key": {
    solution: "const countBy = (items, keyFn) => items.reduce((counts, item) => { const key = keyFn(item); counts[key] = (counts[key] ?? 0) + 1; return counts; }, {});",
    hiddenTests: [
      { call: "countBy([{team:\"red\"},{team:\"blue\"},{team:\"red\"},{team:\"red\"}], person => person.team)", expected: { red: 3, blue: 1 } },
      { call: "countBy([\"aa\",\"b\",\"cc\",\"ddd\"], word => word.length)", expected: { "1": 1, "2": 2, "3": 1 } },
      { call: "countBy([true,false,true], value => String(value))", expected: { true: 2, false: 1 } },
    ],
  },
  "js-running-totals": {
    solution: "const runningTotals = numbers => numbers.reduce((totals, number) => { const previous = totals.length > 0 ? totals[totals.length - 1] : 0; totals.push(previous + number); return totals; }, []);",
    hiddenTests: [
      { call: "runningTotals([10,20,30,40,50])", expected: [10, 30, 60, 100, 150] },
      { call: "(() => { const numbers = [1,2,3]; runningTotals(numbers); return numbers; })()", expected: [1, 2, 3] },
      { call: "runningTotals([0.5,0.5,0.5])", expected: [0.5, 1, 1.5] },
    ],
  },
  "js-apply-all": {
    solution: "const applyAll = (value, steps) => steps.reduce((current, step) => step(current), value);",
    hiddenTests: [
      { call: "applyAll(1, [n => n + 1, n => n + 1, n => n + 1, n => n + 1])", expected: 5 },
      { call: "applyAll(0, [n => n - 1])", expected: -1 },
      { call: "applyAll(\"a\", [text => text + \"b\", text => text + \"c\", text => text.length])", expected: 3 },
    ],
  },
  "js-swap-pairs": {
    solution: "const swapPairs = list => { const result = list.slice(); for (let index = 0; index + 1 < result.length; index += 2) { [result[index], result[index + 1]] = [result[index + 1], result[index]]; } return result; };",
    hiddenTests: [
      { call: "swapPairs([1,2,3,4,5,6,7,8])", expected: [2, 1, 4, 3, 6, 5, 8, 7] },
      { call: "swapPairs([true,false])", expected: [false, true] },
      { call: "(() => { const list = [\"x\",\"y\",\"z\"]; const out = swapPairs(list); return out !== list && out.join(\"\") === \"yxz\"; })()", expected: true },
    ],
  },
  "js-sum-labelled-pairs": {
    solution: "const totalOf = (pairs, label) => { let total = 0; for (const [name, value] of pairs) { if (name === label) total += value; } return total; };",
    hiddenTests: [
      { call: "totalOf([[\"tea\",3],[\"coffee\",4],[\"tea\",3],[\"tea\",3]], \"tea\")", expected: 9 },
      { call: "totalOf([[\"k\",0.5],[\"k\",0.25]], \"k\")", expected: 0.75 },
      { call: "totalOf([[\"n\",1],[\"N\",100]], \"n\")", expected: 1 },
    ],
  },
  "js-immutable-list-edits": {
    solution: "const withInserted = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index)];\nconst withoutIndex = (list, index) => [...list.slice(0, index), ...list.slice(index + 1)];\nconst withReplaced = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index + 1)];",
    hiddenTests: [
      { call: "withReplaced([\"a\",\"b\",\"c\",\"d\"], 0, \"z\")", expected: ["z", "b", "c", "d"] },
      { call: "(() => { const list = [\"a\",\"b\"]; const out = withInserted(list, 1, \"x\"); return out !== list && out.length === 3 && list.length === 2; })()", expected: true },
      { call: "withoutIndex([5,6,7,8], 3)", expected: [5, 6, 7] },
    ],
  },
  "js-variadic-sum": {
    solution: "const sumAll = (...numbers) => { let total = 0; for (const number of numbers) total += number; return total; };",
    hiddenTests: [
      { call: "sumAll(1,2,3,4,5,6,7,8,9,10)", expected: 55 },
      { call: "sumAll(7)", expected: 7 },
      { call: "(() => { const values = [2, 4, 8]; return sumAll(...values, 16); })()", expected: 30 },
    ],
  },
  "js-make-tally": {
    solution: "const makeTally = start => { let total = start; return (...values) => { for (const value of values) total += value; return total; }; };",
    hiddenTests: [
      { call: "(() => { const tally = makeTally(1); tally(1); tally(1); tally(1); return tally(1); })()", expected: 5 },
      { call: "(() => { const tally = makeTally(0); return [tally(2), tally(2), tally(2)]; })()", expected: [2, 4, 6] },
      { call: "(() => { const tally = makeTally(5); tally(...[1, 2, 3]); return tally(); })()", expected: 11 },
    ],
  },
  "js-handlers-keep-index": {
    solution: "const makeHandlers = count => { const handlers = []; for (let index = 0; index < count; index += 1) handlers.push(() => index); return handlers; };",
    hiddenTests: [
      { call: "makeHandlers(6).map(handler => handler())", expected: [0, 1, 2, 3, 4, 5] },
      { call: "makeHandlers(5)[2]()", expected: 2 },
      { call: "(() => { const handlers = makeHandlers(2); return handlers[0] !== handlers[1]; })()", expected: true },
    ],
  },
  "js-my-map-filter": {
    solution: "const myMap = (list, fn) => { const result = []; for (let index = 0; index < list.length; index += 1) result.push(fn(list[index], index)); return result; };\nconst myFilter = (list, fn) => { const result = []; for (let index = 0; index < list.length; index += 1) { if (fn(list[index], index)) result.push(list[index]); } return result; };",
    hiddenTests: [
      { call: "(() => { const list = [3,4,5]; list.map = null; list.filter = null; return [myMap(list, n => n + 1), myFilter(list, n => n > 3)]; })()", expected: [[4, 5, 6], [4, 5]] },
      { call: "myFilter([0, 1, \"\", \"a\", null], item => item)", expected: [1, "a"] },
      { call: "myMap([1,2,3,4,5,6], (n, index) => n * index)", expected: [0, 2, 6, 12, 20, 30] },
    ],
  },
  "js-my-reduce": {
    solution: "const myReduce = (list, fn, initial) => { let accumulator = initial; let start = 0; if (initial === undefined && list.length > 0) { accumulator = list[0]; start = 1; } for (let index = start; index < list.length; index += 1) accumulator = fn(accumulator, list[index], index); return accumulator; };",
    hiddenTests: [
      { call: "(() => { const list = [1,2,3,4]; list.reduce = null; return myReduce(list, (a, b) => a * b, 1); })()", expected: 24 },
      { call: "myReduce([[1],[2],[3]], (flat, part) => flat.concat(part), [])", expected: [1, 2, 3] },
      { call: "myReduce([\"x\"], (a, b) => a + b)", expected: "x" },
    ],
  },
  "js-label-numbers": {
    solution: "const labelNumbers = numbers => numbers.map(number => number > 0 ? \"positive\" : number < 0 ? \"negative\" : \"zero\");",
    hiddenTests: [
      { call: "labelNumbers([1,-2,3,-4,0,5])", expected: ["positive", "negative", "positive", "negative", "zero", "positive"] },
      { call: "labelNumbers([-100])", expected: ["negative"] },
      { call: "(() => { const numbers = [1, -1]; labelNumbers(numbers); return numbers; })()", expected: [1, -1] },
    ],
  },
  "js-sum-mixed-values": {
    solution: "const sumMixed = values => { let total = 0; for (const value of values) total += Number(value); return total; };",
    hiddenTests: [
      { call: "sumMixed([\"7\",\"8\",\"9\"])", expected: 24 },
      { call: "sumMixed([100,\"100\",100,\"100\"])", expected: 400 },
      { call: "sumMixed([\"0\", 0, \"0\"])", expected: 0 },
    ],
  },
  "js-compact-values": {
    solution: "const compactLoop = values => { const result = []; for (const value of values) { if (value) result.push(value); } return result; };\nconst compactFilter = values => values.filter(Boolean);",
    hiddenTests: [
      { call: "compactFilter([1, 0, 2, 0, 3, 0, 4, \"\"])", expected: [1, 2, 3, 4] },
      { call: "compactLoop([-1, \"false\", true])", expected: [-1, "false", true] },
      { call: "compactFilter([null, \"x\", undefined, \"y\"])", expected: ["x", "y"] },
    ],
  },
  "js-count-nested-keys": {
    solution: "const countKeys = object => { let count = 0; for (const key in object) { count += 1; const value = object[key]; if (value !== null && typeof value === \"object\" && !Array.isArray(value)) count += countKeys(value); } return count; };",
    hiddenTests: [
      { call: "countKeys({a:1,b:2,c:3,d:{e:4,f:5,g:{h:6}}})", expected: 8 },
      { call: "countKeys({x:{y:{}},z:{}})", expected: 3 },
      { call: "countKeys(JSON.parse('{\"a\":{\"b\":1},\"c\":[{\"d\":1}]}'))", expected: 3 },
    ],
  },
  "js-order-total": {
    solution: "const orderTotal = items => { let total = 0; for (const item of items) total += item.price * (item.quantity ?? 1); return total; };",
    hiddenTests: [
      { call: "orderTotal([{price:1.5,quantity:2},{price:2.5},{price:0,quantity:9}])", expected: 5.5 },
      { call: "orderTotal([{price:7,quantity:undefined}])", expected: 7 },
      { call: "orderTotal([{price:2,quantity:0},{price:2}])", expected: 2 },
    ],
  },
  "js-frequency-map": {
    solution: "const frequencies = values => { const counts = new Map(); for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1); return counts; };",
    hiddenTests: [
      { call: "[...frequencies([\"r\",\"g\",\"b\",\"g\",\"r\",\"r\"])]", expected: [["r", 3], ["g", 2], ["b", 1]] },
      { call: "frequencies([true,true,false]).get(true)", expected: 2 },
      { call: "frequencies([null, null]).get(null)", expected: 2 },
    ],
  },
  "js-map-entries-at-least": {
    solution: "const entriesAtLeast = (map, min) => { const pairs = []; for (const [key, value] of map) { if (value >= min) pairs.push([key, value]); } return pairs; };",
    hiddenTests: [
      { call: "entriesAtLeast(new Map([[\"p\",7],[\"q\",8],[\"r\",1],[\"s\",9]]), 8)", expected: [["q", 8], ["s", 9]] },
      { call: "entriesAtLeast(new Map([[1, 1],[2, 2]]), 2)", expected: [[2, 2]] },
      { call: "entriesAtLeast(new Map([[\"neg\",-1]]), -5)", expected: [["neg", -1]] },
    ],
  },
  "js-chunk-with-loop": {
    solution: "const chunkBy = (items, size) => { const groups = []; let current = []; for (let index = 0; index < items.length; index += 1) { current.push(items[index]); if (current.length === size) { groups.push(current); current = []; } } if (current.length > 0) groups.push(current); return groups; };",
    hiddenTests: [
      { call: "(() => { const items = [1,2,3,4,5,6,7]; items.slice = null; return chunkBy(items, 3); })()", expected: [[1, 2, 3], [4, 5, 6], [7]] },
      { call: "chunkBy([1,2,3,4,5,6], 3)", expected: [[1, 2, 3], [4, 5, 6]] },
      { call: "chunkBy([9], 4)", expected: [[9]] },
    ],
  },
  "js-zip-lists": {
    solution: "const zip = (left, right) => { const pairs = []; const length = Math.min(left.length, right.length); for (let index = 0; index < length; index += 1) pairs.push([left[index], right[index]]); return pairs; };",
    hiddenTests: [
      { call: "zip([1,2,3,4,5], [5,4,3,2,1])", expected: [[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]] },
      { call: "zip([\"a\"], [1,2,3,4])", expected: [["a", 1]] },
      { call: "(() => { const left = [1,2]; const right = [3,4]; zip(left, right); return [left, right]; })()", expected: [[1, 2], [3, 4]] },
    ],
  },
  "js-rotate-by-n": {
    solution: "const rotateBy = (list, n) => { const length = list.length; if (length === 0) return []; const shift = ((n % length) + length) % length; const result = []; for (let index = 0; index < length; index += 1) result.push(list[(index - shift + length) % length]); return result; };",
    hiddenTests: [
      { call: "rotateBy([1,2,3,4], 4)", expected: [1, 2, 3, 4] },
      { call: "rotateBy([1,2,3,4,5,6], -8)", expected: [3, 4, 5, 6, 1, 2] },
      { call: "(() => { const list = [1,2,3]; rotateBy(list, 1); return list; })()", expected: [1, 2, 3] },
    ],
  },
  "js-run-length-encode": {
    solution: "const runLength = text => { let result = \"\"; let count = 0; for (let index = 0; index < text.length; index += 1) { count += 1; if (text[index] !== text[index + 1]) { result += count + text[index]; count = 0; } } return result; };",
    hiddenTests: [
      { call: "runLength(\"xxxxyyyxxz\")", expected: "4x3y2x1z" },
      { call: "runLength(\"ab\")", expected: "1a1b" },
      { call: "runLength(\"       \")", expected: "7 " },
    ],
  },
  "js-pair-with-sum": {
    solution: "const pairWithSum = (sorted, target) => { let left = 0; let right = sorted.length - 1; while (left < right) { const sum = sorted[left] + sorted[right]; if (sum === target) return [sorted[left], sorted[right]]; if (sum < target) left += 1; else right -= 1; } return null; };",
    hiddenTests: [
      { call: "pairWithSum([2,3,5,8,13,21], 26)", expected: [5, 21] },
      { call: "pairWithSum([1,1,2,2], 2)", expected: [1, 1] },
      { call: "pairWithSum([10,20,30,40,50], 90)", expected: [40, 50] },
    ],
  },
  "js-binary-search": {
    solution: "const binarySearch = (sorted, target) => { let low = 0; let high = sorted.length - 1; while (low <= high) { const middle = Math.floor((low + high) / 2); if (sorted[middle] === target) return middle; if (sorted[middle] < target) low = middle + 1; else high = middle - 1; } return -1; };",
    hiddenTests: [
      { call: "(() => { let reads = 0; const big = Array.from({ length: 1000 }, (_, index) => index * 2); const watched = new Proxy(big, { get: (list, key) => { if (typeof key === \"string\" && /^\\d+$/.test(key)) reads += 1; return list[key]; } }); const index = binarySearch(watched, 1998); return [index, reads < 30]; })()", expected: [999, true] },
      { call: "binarySearch([-9,-4,0,3,8,12,20], -4)", expected: 1 },
      { call: "binarySearch([10,20,30], 25)", expected: -1 },
    ],
  },
  "js-sliding-window-max": {
    solution: "const windowMax = (numbers, size) => { const result = []; for (let start = 0; start + size <= numbers.length; start += 1) { let best = numbers[start]; for (let index = start + 1; index < start + size; index += 1) { if (numbers[index] > best) best = numbers[index]; } result.push(best); } return result; };",
    hiddenTests: [
      { call: "windowMax([9,8,7,6,5,4,3,2,1], 4)", expected: [9, 8, 7, 6, 5, 4] },
      { call: "windowMax([1,2,3,4,5,6], 1)", expected: [1, 2, 3, 4, 5, 6] },
      { call: "windowMax([2,2,2,2], 3)", expected: [2, 2] },
    ],
  },
  "js-matrix-transpose": {
    solution: "const transpose = matrix => { const result = []; if (matrix.length === 0) return result; for (let column = 0; column < matrix[0].length; column += 1) { const row = []; for (let line = 0; line < matrix.length; line += 1) row.push(matrix[line][column]); result.push(row); } return result; };",
    hiddenTests: [
      { call: "transpose([[1,2,3,4],[5,6,7,8],[9,10,11,12]])", expected: [[1, 5, 9], [2, 6, 10], [3, 7, 11], [4, 8, 12]] },
      { call: "transpose([[\"a\",\"b\"],[\"c\",\"d\"],[\"e\",\"f\"]])", expected: [["a", "c", "e"], ["b", "d", "f"]] },
      { call: "(() => { const out = transpose([[1,2],[3,4]]); return out[0] !== out[1]; })()", expected: true },
    ],
  },
};
