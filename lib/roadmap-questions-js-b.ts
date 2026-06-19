// JavaScript roadmap questions — set B (100). A second question per level theme,
// distinct from set A. Combined with set A (lib/roadmap-questions.ts) this gives
// 8 questions per level, so each 5-level checkpoint has a full 40-question test.
// 25 levels × 4, easiest → hardest. See lib/roadmap.ts for the level titles.

import type { Seed } from './roadmap-build';

export const jsSeedsB: Seed[] = [
  // ── Level 1 — Values & Math ────────────────────────────────────────────
  { q: 'What does this return?\n\n```js\nMath.floor(4.7);\n```', opts: ['4', '5', '4.7', '3'], a: 0, e: 'Math.floor rounds down to the nearest integer, giving 4.', tags: ['Numbers', 'Math'] },
  { q: 'What is the result?\n\n```js\n7 / 2;\n```', opts: ['3', '3.5', '4', '2'], a: 1, e: 'JavaScript division produces a floating-point result: 3.5.', tags: ['Numbers'] },
  { q: 'What does this return?\n\n```js\nMath.round(2.5);\n```', opts: ['2', '3', '2.5', '4'], a: 1, e: 'Math.round rounds half up, so 2.5 becomes 3.', tags: ['Numbers', 'Math'] },
  { q: 'What is the result?\n\n```js\ntypeof NaN;\n```', opts: ['"NaN"', '"number"', '"undefined"', '"object"'], a: 1, e: 'NaN ("not a number") is paradoxically of type "number".', tags: ['typeof', 'Gotchas'] },

  // ── Level 2 — Strings ──────────────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n"hello".charAt(0);\n```', opts: ['"h"', '"e"', '"hello"', '0'], a: 0, e: 'charAt(0) returns the first character, "h".', tags: ['Strings', 'Methods'] },
  { q: 'What is the result?\n\n```js\n"abc".indexOf("b");\n```', opts: ['0', '1', '2', '-1'], a: 1, e: '"b" is at index 1.', tags: ['Strings', 'Methods'] },
  { q: 'What does this return?\n\n```js\n"  hi  ".trim();\n```', opts: ['"  hi  "', '"hi"', '"hi  "', '"  hi"'], a: 1, e: 'trim removes whitespace from both ends, leaving "hi".', tags: ['Strings', 'Methods'] },
  { q: 'What is the result?\n\n```js\n"ab".repeat(3);\n```', opts: ['"ababab"', '"ab3"', '"ab ab ab"', '"abababab"'], a: 0, e: 'repeat(3) concatenates the string three times: "ababab".', tags: ['Strings', 'Methods'] },

  // ── Level 3 — Booleans & Comparison ────────────────────────────────────
  { q: 'What does this return?\n\n```js\n2 != "2";\n```', opts: ['true', 'false', 'undefined', 'Error'], a: 1, e: 'Loose != coerces "2" to 2, so they are equal and != is false.', tags: ['Comparison', 'Coercion'] },
  { q: 'What does this return?\n\n```js\nnull == undefined;\n```', opts: ['true', 'false', 'Error', 'undefined'], a: 0, e: 'With loose equality, null and undefined are considered equal.', tags: ['Comparison'] },
  { q: 'What does this evaluate to?\n\n```js\n"a" < "b";\n```', opts: ['true', 'false', '0', 'Error'], a: 0, e: 'Strings compare lexicographically; "a" comes before "b".', tags: ['Comparison', 'Strings'] },
  { q: 'What is the result?\n\n```js\n10 >= 10;\n```', opts: ['true', 'false', 'undefined', 'Error'], a: 0, e: '>= is true when the values are equal, so 10 >= 10 is true.', tags: ['Comparison'] },

  // ── Level 4 — Arrays: Basics ───────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3].slice(1);\n```', opts: ['[2, 3]', '[1, 2]', '[1]', '[2]'], a: 0, e: 'slice(1) returns elements from index 1 to the end: [2, 3].', tags: ['Arrays', 'Methods'] },
  { q: 'What is the result?\n\n```js\n[1, 2, 3].concat([4, 5]);\n```', opts: ['[1, 2, 3, 4, 5]', '[[1, 2, 3], [4, 5]]', '[5, 7]', '[1, 2, 3]'], a: 0, e: 'concat joins the arrays into one: [1, 2, 3, 4, 5].', tags: ['Arrays', 'Methods'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3].reverse();\n```', opts: ['[1, 2, 3]', '[3, 2, 1]', '[2, 1, 3]', '[1, 3, 2]'], a: 1, e: 'reverse flips the order in place: [3, 2, 1].', tags: ['Arrays', 'Methods'] },
  { q: 'What is the result?\n\n```js\n[1, 2, 3].at(-1);\n```', opts: ['1', '3', '-1', 'undefined'], a: 1, e: 'at(-1) reads the last element, 3.', tags: ['Arrays', 'Methods'] },

  // ── Level 5 — Objects: Basics ──────────────────────────────────────────
  { q: 'What does this return?\n\n```js\nconst o = { a: 1 };\n"a" in o;\n```', opts: ['true', 'false', '1', 'undefined'], a: 0, e: 'The in operator checks whether the key exists: "a" is a key, so true.', tags: ['Objects'] },
  { q: 'What is the result?\n\n```js\nconst o = { a: 1, b: 2 };\ndelete o.a;\nObject.keys(o);\n```', opts: ['["a", "b"]', '["b"]', '["a"]', '[]'], a: 1, e: 'delete removes the a property, leaving only ["b"].', tags: ['Objects'] },
  { q: 'What does o.b return?\n\n```js\nconst o = { a: 1 };\no.b = 2;\no.b;\n```', opts: ['undefined', '2', '1', 'Error'], a: 1, e: 'You can add new properties to an object; o.b is now 2.', tags: ['Objects'] },
  { q: 'What does this return?\n\n```js\nObject.entries({ a: 1 });\n```', opts: ['[["a", 1]]', '["a", 1]', '{ a: 1 }', '["a:1"]'], a: 0, e: 'entries returns an array of [key, value] pairs: [["a", 1]].', tags: ['Objects', 'Methods'] },

  // ── Level 6 — Array Iteration ──────────────────────────────────────────
  { q: 'What does forEach return here?\n\n```js\n[1, 2, 3].forEach(x => x * 2);\n```', opts: ['[2, 4, 6]', 'undefined', '6', '[1, 2, 3]'], a: 1, e: 'forEach always returns undefined regardless of the callback.', tags: ['Arrays', 'forEach'] },
  { q: 'What does this return?\n\n```js\n["a", "b"].map(s => s.toUpperCase());\n```', opts: ['["A", "B"]', '"AB"', '["a", "b"]', '"A B"'], a: 0, e: 'map uppercases each element into a new array ["A", "B"].', tags: ['Arrays', 'map'] },
  { q: 'What is the result?\n\n```js\n[1, 2, 3, 4].map((x, i) => x + i);\n```', opts: ['[1, 3, 5, 7]', '[1, 2, 3, 4]', '[2, 4, 6, 8]', '[0, 1, 2, 3]'], a: 0, e: 'Each element adds its index: 1+0, 2+1, 3+2, 4+3 → [1, 3, 5, 7].', tags: ['Arrays', 'map'] },
  { q: 'What does this return?\n\n```js\n[[1, 2], [3, 4]].map(p => p[0]);\n```', opts: ['[1, 3]', '[2, 4]', '[1, 2, 3, 4]', '[[1], [3]]'], a: 0, e: 'It maps each inner array to its first element: [1, 3].', tags: ['Arrays', 'map'] },

  // ── Level 7 — Filter & Find ────────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4].findIndex(x => x === 3);\n```', opts: ['1', '2', '3', '-1'], a: 1, e: 'findIndex returns the index of the first match; 3 is at index 2.', tags: ['Arrays', 'findIndex'] },
  { q: 'What does this return?\n\n```js\n["", "a", "", "b"].filter(Boolean);\n```', opts: ['["a", "b"]', '["", ""]', '["", "a", "", "b"]', '[]'], a: 0, e: 'filter(Boolean) drops falsy values (the empty strings), leaving ["a", "b"].', tags: ['Arrays', 'filter'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3].some(x => x > 2);\n```', opts: ['true', 'false', '3', '[3]'], a: 0, e: 'some returns true if at least one element passes; 3 > 2 is true.', tags: ['Arrays', 'some'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3].every(x => x > 0);\n```', opts: ['true', 'false', '3', '[1, 2, 3]'], a: 0, e: 'every returns true only if all elements pass; all are > 0.', tags: ['Arrays', 'every'] },

  // ── Level 8 — Reduce ───────────────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4].reduce((a, b) => Math.max(a, b));\n```', opts: ['1', '4', '10', '24'], a: 1, e: 'reduce keeps the running maximum, ending at 4.', tags: ['Arrays', 'reduce'] },
  { q: 'What does this return?\n\n```js\n[[1], [2], [3]].reduce((a, b) => a.concat(b), []);\n```', opts: ['[1, 2, 3]', '[[1], [2], [3]]', '[6]', '[1]'], a: 0, e: 'Concatenating each inner array flattens them into [1, 2, 3].', tags: ['Arrays', 'reduce'] },
  { q: 'What does this return?\n\n```js\n["a", "b", "a"].reduce((m, x) => {\n  m[x] = (m[x] || 0) + 1;\n  return m;\n}, {});\n```', opts: ['{ a: 2, b: 1 }', '{ a: 1, b: 1 }', '["a", "b"]', '3'], a: 0, e: 'It tallies occurrences into an object: a appears twice, b once.', tags: ['Arrays', 'reduce'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3].reduce((a, b) => a + b, 10);\n```', opts: ['6', '16', '10', '15'], a: 1, e: 'Starting the accumulator at 10: 10+1+2+3 = 16.', tags: ['Arrays', 'reduce'] },

  // ── Level 9 — Destructuring ────────────────────────────────────────────
  { q: 'What is the value of x?\n\n```js\nconst { a: x } = { a: 5 };\nx;\n```', opts: ['5', 'undefined', '"a"', '{ a: 5 }'], a: 0, e: 'The pattern { a: x } reads property a into a new variable x, which is 5.', tags: ['Destructuring', 'Objects'] },
  { q: 'What is the value of a?\n\n```js\nconst [[a]] = [[9]];\na;\n```', opts: ['9', '[9]', 'undefined', '[[9]]'], a: 0, e: 'Nested destructuring reaches into the inner array to get 9.', tags: ['Destructuring', 'Arrays'] },
  { q: 'What does f return?\n\n```js\nfunction f({ a, b }) {\n  return a + b;\n}\nf({ a: 1, b: 2 });\n```', opts: ['3', '12', 'undefined', 'NaN'], a: 0, e: 'The parameter destructures a and b from the object: 1 + 2 = 3.', tags: ['Destructuring', 'Functions'] },
  { q: 'What is rest?\n\n```js\nconst { a, ...rest } = { a: 1, b: 2, c: 3 };\nrest;\n```', opts: ['{ b: 2, c: 3 }', '{ a: 1 }', '{ a: 1, b: 2, c: 3 }', '[2, 3]'], a: 0, e: 'Rest in object destructuring collects the remaining properties: { b: 2, c: 3 }.', tags: ['Destructuring', 'Rest'] },

  // ── Level 10 — Spread & Rest ───────────────────────────────────────────
  { q: 'What does this return?\n\n```js\nMath.max(...[3, 1, 4, 1, 5]);\n```', opts: ['5', '4', '[3, 1, 4, 1, 5]', '14'], a: 0, e: 'Spread passes the array elements as separate arguments; the max is 5.', tags: ['Spread'] },
  { q: 'What does this return?\n\n```js\nconst a = [1, 2];\nconst b = [...a];\nb === a;\n```', opts: ['true', 'false', '[1, 2]', 'undefined'], a: 1, e: 'Spread creates a new array, so b is a different reference from a.', tags: ['Spread', 'Arrays'] },
  { q: 'What is c.a?\n\n```js\nconst o = { a: 1 };\nconst c = { ...o, a: 2 };\nc.a;\n```', opts: ['1', '2', 'undefined', '[1, 2]'], a: 1, e: 'The later a: 2 overrides the spread value, so c.a is 2.', tags: ['Spread', 'Objects'] },
  { q: 'What does this return?\n\n```js\n[..."abc"];\n```', opts: ['["a", "b", "c"]', '"abc"', '["abc"]', '[a, b, c]'], a: 0, e: 'Spreading a string splits it into an array of characters.', tags: ['Spread', 'Strings'] },

  // ── Level 11 — Functions & Scope ───────────────────────────────────────
  { q: 'What does this return?\n\n```js\n(function () {\n  return 42;\n})();\n```', opts: ['42', 'undefined', 'function', 'Error'], a: 0, e: 'This is an IIFE — it defines and immediately calls the function, returning 42.', tags: ['Functions', 'IIFE'] },
  { q: 'What does f() return?\n\n```js\nfunction f(a) {\n  a = 5;\n}\nlet x = 1;\nf(x);\n// what is x?\n```', opts: ['1', '5', 'undefined', 'Error'], a: 0, e: 'Primitives are passed by value, so reassigning a inside f does not change x. x stays 1.', tags: ['Functions', 'Scope'] },
  { q: 'What does add(2)(3) return?\n\n```js\nconst add = a => b => a + b;\nadd(2)(3);\n```', opts: ['5', '23', 'undefined', '6'], a: 0, e: 'Curried functions: add(2) returns b => 2 + b, then called with 3 gives 5.', tags: ['Functions', 'Currying'] },
  { q: 'What is the result?\n\n```js\nconst f = function g() {\n  return typeof g;\n};\nf();\n```', opts: ['"function"', '"undefined"', 'Error', '"g"'], a: 0, e: 'A named function expression can reference its own name internally; typeof g is "function".', tags: ['Functions', 'Scope'] },

  // ── Level 12 — Closures ────────────────────────────────────────────────
  { q: 'What does b.get() return?\n\n```js\nfunction bank() {\n  let bal = 0;\n  return { add: n => (bal += n), get: () => bal };\n}\nconst b = bank();\nb.add(5);\nb.add(3);\nb.get();\n```', opts: ['0', '5', '8', 'undefined'], a: 2, e: 'Both methods close over the same bal; after adding 5 and 3 it is 8.', tags: ['Closures'] },
  { q: 'What does fns[1]() return?\n\n```js\nconst fns = [1, 2, 3].map(n => () => n);\nfns[1]();\n```', opts: ['1', '2', '3', 'undefined'], a: 1, e: 'Each closure captures its own n; the one at index 1 returns 2.', tags: ['Closures'] },
  { q: 'What does mul(3)(4) return?\n\n```js\nfunction mul(a) {\n  return b => a * b;\n}\nmul(3)(4);\n```', opts: ['7', '12', '34', 'undefined'], a: 1, e: 'mul(3) returns a function that multiplies by 3; called with 4 gives 12.', tags: ['Closures'] },
  { q: 'What does the second inc() return?\n\n```js\nlet count = 0;\nconst inc = (() => () => ++count)();\ninc();\ninc();\n```', opts: ['1', '2', '0', 'undefined'], a: 1, e: 'The closure increments the shared count each call: 1 then 2.', tags: ['Closures'] },

  // ── Level 13 — Hoisting & let/const ────────────────────────────────────
  { q: 'What is logged?\n\n```js\nvar a = 1;\nfunction f() {\n  console.log(a);\n  var a = 2;\n}\nf();\n```', opts: ['1', '2', 'undefined', 'ReferenceError'], a: 2, e: 'The local var a is hoisted within f, shadowing the outer a, so it logs undefined.', tags: ['Hoisting', 'var'] },
  { q: 'What happens?\n\n```js\nconst obj = {};\nobj.x = 1;\nobj.x;\n```', opts: ['1', 'TypeError', 'undefined', 'Error'], a: 0, e: 'const prevents reassigning obj, but you can still mutate its properties; obj.x is 1.', tags: ['const', 'Objects'] },
  { q: 'What is the result?\n\n```js\nlet x;\ntypeof x;\n```', opts: ['"undefined"', '"number"', 'ReferenceError', '"null"'], a: 0, e: 'A declared but unassigned variable holds undefined, so typeof is "undefined".', tags: ['let', 'typeof'] },
  { q: 'What is logged?\n\n```js\nconsole.log(b);\nvar b;\n```', opts: ['undefined', 'ReferenceError', 'null', '0'], a: 0, e: 'var b is hoisted as undefined, so logging it before assignment prints undefined.', tags: ['Hoisting', 'var'] },

  // ── Level 14 — this & Context ──────────────────────────────────────────
  { q: 'What does o.get() return?\n\n```js\nconst o = {\n  v: 1,\n  get() {\n    return (() => this.v)();\n  },\n};\no.get();\n```', opts: ['1', 'undefined', 'Error', 'this'], a: 0, e: 'The arrow inherits this from get (which is o), so this.v is 1.', tags: ['this', 'Arrow'] },
  { q: 'What does g() return?\n\n```js\nfunction f() {\n  return this.x;\n}\nconst g = f.bind({ x: 7 });\ng();\n```', opts: ['7', 'undefined', 'Error', 'this.x'], a: 0, e: 'bind permanently sets this to { x: 7 }, so g() returns 7.', tags: ['this', 'bind'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3].map(function () {\n  return this.n;\n}, { n: 9 });\n```', opts: ['[9, 9, 9]', '[1, 2, 3]', '[undefined, undefined, undefined]', 'Error'], a: 0, e: 'map’s second argument sets this inside the callback, so each returns this.n = 9.', tags: ['this', 'map'] },
  { q: 'What does o.x2 return?\n\n```js\nconst o = {\n  x: 5,\n  get x2() {\n    return this.x * 2;\n  },\n};\no.x2;\n```', opts: ['10', '5', 'function', 'undefined'], a: 0, e: 'x2 is a getter; accessing it runs the function, returning this.x * 2 = 10.', tags: ['this', 'Getters'] },

  // ── Level 15 — Callbacks & HOFs ────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n["1", "2", "3"].map(Number);\n```', opts: ['["1", "2", "3"]', '[1, 2, 3]', '"123"', 'NaN'], a: 1, e: 'Passing Number as the callback converts each string to a number.', tags: ['Callbacks', 'map'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4].filter((_, i) => i % 2 === 0);\n```', opts: ['[1, 3]', '[2, 4]', '[1, 2]', '[0, 2]'], a: 0, e: 'It keeps elements at even indices (0 and 2): values 1 and 3.', tags: ['Callbacks', 'filter'] },
  { q: 'What does twice(n => n + 3)(1) return?\n\n```js\nconst twice = f => x => f(f(x));\ntwice(n => n + 3)(1);\n```', opts: ['4', '7', '5', '1'], a: 1, e: 'It applies the function twice: (1 + 3) + 3 = 7.', tags: ['HOF'] },
  { q: 'What does this return?\n\n```js\n[3, 1, 2].sort();\n```', opts: ['[1, 2, 3]', '[3, 1, 2]', '[3, 2, 1]', '[1, 3, 2]'], a: 0, e: 'Default sort compares as strings, but single digits sort the same as numbers here: [1, 2, 3].', tags: ['Arrays', 'sort'] },

  // ── Level 16 — Ternary & Short-circuit ─────────────────────────────────
  { q: 'What does this return?\n\n```js\ntrue ? (false ? 1 : 2) : 3;\n```', opts: ['1', '2', '3', 'false'], a: 1, e: 'The outer condition is true, so it evaluates false ? 1 : 2, which is 2.', tags: ['Ternary'] },
  { q: 'What is the result?\n\n```js\nundefined || null || "x";\n```', opts: ['undefined', 'null', '"x"', 'false'], a: 2, e: '|| returns the first truthy value; undefined and null are falsy, so it returns "x".', tags: ['Short-circuit'] },
  { q: 'What does this return?\n\n```js\n5 && 0 && 9;\n```', opts: ['5', '0', '9', 'false'], a: 1, e: '&& returns the first falsy value, which is 0.', tags: ['Short-circuit'] },
  { q: 'What is the result?\n\n```js\nconst x = null;\nx?.toUpperCase() ?? "none";\n```', opts: ['"none"', 'null', 'undefined', 'Error'], a: 0, e: 'Optional chaining yields undefined, then ?? falls back to "none".', tags: ['Nullish', 'Optional chaining'] },

  // ── Level 17 — Type Coercion ───────────────────────────────────────────
  { q: 'What does this return?\n\n```js\ntrue + 1;\n```', opts: ['2', '"true1"', 'true', '1'], a: 0, e: 'true coerces to the number 1, so true + 1 is 2.', tags: ['Coercion'] },
  { q: 'What is the result?\n\n```js\n"6" / "2";\n```', opts: ['3', '"3"', '"6/2"', 'NaN'], a: 0, e: 'Division coerces both strings to numbers: 6 / 2 = 3.', tags: ['Coercion'] },
  { q: 'What does this return?\n\n```js\nnull + 1;\n```', opts: ['1', 'null', 'NaN', '"null1"'], a: 0, e: 'null coerces to 0 in arithmetic, so null + 1 is 1.', tags: ['Coercion', 'Gotchas'] },
  { q: 'What is the result?\n\n```js\nundefined + 1;\n```', opts: ['NaN', '1', 'undefined', '"undefined1"'], a: 0, e: 'undefined coerces to NaN in arithmetic, so the result is NaN.', tags: ['Coercion', 'Gotchas'] },

  // ── Level 18 — Truthy / Falsy ──────────────────────────────────────────
  { q: 'What is the result?\n\n```js\nBoolean(NaN);\n```', opts: ['true', 'false', 'NaN', '0'], a: 1, e: 'NaN is a falsy value, so Boolean(NaN) is false.', tags: ['Truthy'] },
  { q: 'What does this return?\n\n```js\n!!" ";\n```', opts: ['true', 'false', '" "', 'undefined'], a: 0, e: 'A string with a space is non-empty, hence truthy; !! gives true.', tags: ['Truthy', 'Strings'] },
  { q: 'What does this return?\n\n```js\n[] == false;\n```', opts: ['true', 'false', 'Error', 'undefined'], a: 0, e: 'Both sides coerce to 0 ([] → "" → 0, false → 0), so loose equality is true.', tags: ['Truthy', 'Gotchas'] },
  { q: 'What is the result?\n\n```js\nBoolean(undefined);\n```', opts: ['true', 'false', 'undefined', 'null'], a: 1, e: 'undefined is falsy, so Boolean(undefined) is false.', tags: ['Truthy'] },

  // ── Level 19 — JSON & Objects ──────────────────────────────────────────
  { q: 'What does this return?\n\n```js\nJSON.stringify([1, "a", true]);\n```', opts: ['\'[1,"a",true]\'', '"[1,a,true]"', '[1, "a", true]', 'Error'], a: 0, e: 'Arrays serialize to a JSON string with quoted strings: [1,"a",true].', tags: ['JSON'] },
  { q: 'What does this return?\n\n```js\nJSON.stringify({ a: undefined });\n```', opts: ['\'{"a":undefined}\'', '"{}"', '\'{"a":null}\'', 'Error'], a: 1, e: 'JSON.stringify drops properties whose value is undefined, leaving "{}".', tags: ['JSON', 'Gotchas'] },
  { q: 'What does this return?\n\n```js\nJSON.parse(\'{"x":1}\').x;\n```', opts: ['1', '"1"', 'undefined', 'Error'], a: 0, e: 'Parsing produces an object, and reading x gives the number 1.', tags: ['JSON'] },
  { q: 'What is the result?\n\n```js\nObject.keys({}).length;\n```', opts: ['0', '1', 'undefined', '{}'], a: 0, e: 'An empty object has no keys, so the length is 0.', tags: ['Objects'] },

  // ── Level 20 — Optional Chaining & Nullish ─────────────────────────────
  { q: 'What is the result?\n\n```js\nconst o = { a: { b: null } };\no.a?.b ?? "d";\n```', opts: ['null', '"d"', 'undefined', 'Error'], a: 1, e: 'o.a.b is null, so ?? returns the fallback "d".', tags: ['Optional chaining', 'Nullish'] },
  { q: 'What does this return?\n\n```js\nconst f = null;\nf?.();\n```', opts: ['undefined', 'null', 'Error', 'f'], a: 0, e: 'Optional call short-circuits when f is null, returning undefined instead of throwing.', tags: ['Optional chaining'] },
  { q: 'What is the result?\n\n```js\nconst a = { b: 0 };\na.b ?? 5;\n```', opts: ['0', '5', 'undefined', 'null'], a: 0, e: '0 is not null or undefined, so ?? keeps it: 0.', tags: ['Nullish'] },
  { q: 'What does this return?\n\n```js\nconst arr = [10, 20];\narr?.[1];\n```', opts: ['10', '20', 'undefined', 'Error'], a: 1, e: 'Optional chaining with bracket access reads index 1: 20.', tags: ['Optional chaining'] },

  // ── Level 21 — Promises ────────────────────────────────────────────────
  { q: 'What does the resulting promise resolve to?\n\n```js\nPromise.reject("e").catch(err => err);\n```', opts: ['"e"', 'a rejected promise', 'undefined', 'Error'], a: 0, e: 'catch handles the rejection and returns "e", so the chain resolves to "e".', tags: ['Promises'] },
  { q: 'What does this resolve to?\n\n```js\nPromise.resolve().then(() => 1).catch(() => 2);\n```', opts: ['1', '2', 'undefined', 'Error'], a: 0, e: 'No error occurs, so catch is skipped and the value is 1.', tags: ['Promises'] },
  { q: 'What does this resolve to?\n\n```js\nPromise.race([Promise.resolve("a"), new Promise(() => {})]);\n```', opts: ['"a"', 'never resolves', 'Error', '["a"]'], a: 0, e: 'race settles with the first promise to finish; the resolved "a" wins.', tags: ['Promises'] },
  { q: 'What is the result?\n\n```js\ntypeof Promise.resolve();\n```', opts: ['"object"', '"promise"', '"function"', '"undefined"'], a: 0, e: 'A Promise is an object, so typeof returns "object".', tags: ['Promises', 'typeof'] },

  // ── Level 22 — Async / Await ───────────────────────────────────────────
  { q: 'What does f() resolve to?\n\n```js\nasync function f() {\n  return await 5;\n}\n```', opts: ['5', 'a Promise', 'undefined', 'Error'], a: 0, e: 'await on a non-promise just yields the value, so f resolves to 5.', tags: ['async', 'await'] },
  { q: 'In what order are values logged?\n\n```js\nconsole.log(1);\n(async () => {\n  console.log(2);\n  await null;\n  console.log(3);\n})();\nconsole.log(4);\n```', opts: ['1 2 3 4', '1 2 4 3', '1 4 2 3', '2 1 4 3'], a: 1, e: 'Code runs synchronously to the first await (1, 2, then 4), and 3 resumes later as a microtask.', tags: ['async', 'Event loop'] },
  { q: 'What does f() resolve to?\n\n```js\nasync function f() {\n  try {\n    await Promise.reject("x");\n  } catch (e) {\n    return e;\n  }\n}\n```', opts: ['"x"', 'a rejected promise', 'undefined', 'Error'], a: 0, e: 'await throws the rejection, caught by try/catch, and the function returns "x".', tags: ['async', 'Errors'] },
  { q: 'What does this resolve to?\n\n```js\nawait Promise.all([1, 2, 3].map(async n => n * 2));\n```', opts: ['[2, 4, 6]', '[1, 2, 3]', '6', 'a Promise'], a: 0, e: 'Each async callback resolves to n * 2, and Promise.all collects [2, 4, 6].', tags: ['async', 'Promises'] },

  // ── Level 23 — Sets & Maps ─────────────────────────────────────────────
  { q: 'What is the result?\n\n```js\nnew Set("hello").size;\n```', opts: ['5', '4', '3', '2'], a: 1, e: 'The unique characters are h, e, l, o — four of them.', tags: ['Set'] },
  { q: 'What does m.get("a") return?\n\n```js\nconst m = new Map([["a", 1], ["a", 2]]);\nm.get("a");\n```', opts: ['1', '2', 'undefined', '[1, 2]'], a: 1, e: 'A later entry with the same key overwrites the earlier one, so a maps to 2.', tags: ['Map'] },
  { q: 'What is s.size?\n\n```js\nconst s = new Set([1, 2]);\ns.add(2);\ns.size;\n```', opts: ['1', '2', '3', 'undefined'], a: 1, e: 'Adding an existing value is a no-op, so the size stays 2.', tags: ['Set'] },
  { q: 'What does this return?\n\n```js\n[...new Map([["a", 1]]).keys()];\n```', opts: ['["a"]', '[1]', '[["a", 1]]', '"a"'], a: 0, e: 'keys() iterates the map keys; spreading gives ["a"].', tags: ['Map'] },

  // ── Level 24 — Edge Cases & Gotchas ────────────────────────────────────
  { q: 'What is the result?\n\n```js\ntypeof function () {};\n```', opts: ['"function"', '"object"', '"undefined"', '"Function"'], a: 0, e: 'Functions have their own typeof result: "function".', tags: ['typeof'] },
  { q: 'What is a after this?\n\n```js\nconst a = [1, 2, 3];\na.length = 1;\na;\n```', opts: ['[1, 2, 3]', '[1]', '[1, undefined, undefined]', 'Error'], a: 1, e: 'Setting length shorter truncates the array, leaving [1].', tags: ['Arrays', 'Gotchas'] },
  { q: 'What is the result?\n\n```js\n0.1 + 0.2;\n```', opts: ['0.3', '0.30000000000000004', '0.300', 'Error'], a: 1, e: 'Floating-point math gives 0.30000000000000004, not exactly 0.3.', tags: ['Numbers', 'Gotchas'] },
  { q: 'What does this return?\n\n```js\n"5" * "2";\n```', opts: ['10', '"52"', '"10"', 'NaN'], a: 0, e: 'Multiplication coerces both strings to numbers: 5 * 2 = 10.', tags: ['Coercion'] },

  // ── Level 25 — Mixed Mastery ───────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3]\n  .map(x => x * 2)\n  .filter(x => x > 2)\n  .reduce((a, b) => a + b, 0);\n```', opts: ['10', '12', '6', '4'], a: 0, e: 'map → [2,4,6], filter → [4,6], reduce → 10.', tags: ['Chaining', 'Mastery'] },
  { q: 'What does this return?\n\n```js\nObject.keys({ a: 1, b: 2, c: 3 }).filter(k => k !== "b");\n```', opts: ['["a", "c"]', '["b"]', '["a", "b", "c"]', '[1, 3]'], a: 0, e: 'It lists the keys then removes "b", leaving ["a", "c"].', tags: ['Objects', 'Mastery'] },
  { q: 'What does this return?\n\n```js\n[..."hello"].reverse().join("");\n```', opts: ['"olleh"', '"hello"', '["o", "l", "l", "e", "h"]', 'Error'], a: 0, e: 'Spread to characters, reverse, then join back into "olleh".', tags: ['Strings', 'Mastery'] },
  { q: 'What does this return?\n\n```js\n[5, 3, 8, 1].sort((a, b) => a - b)[0];\n```', opts: ['1', '5', '8', '3'], a: 0, e: 'Sorting ascending puts 1 first, so index 0 is 1.', tags: ['Arrays', 'Mastery'] },
];
