// JavaScript roadmap questions — set A (100): "predict the output / what does
// this do". 25 levels × 4. Combined with set B (lib/roadmap-questions.ts) this
// gives 8 questions per level. See lib/roadmap.ts for the per-level titles.

import type { Seed } from './roadmap-build';

export const jsSeedsA: Seed[] = [
  // ── Level 1 — Values & Math ────────────────────────────────────────────
  { q: 'What is the result after exponentiation runs before addition?\n\n```js\n2 ** 3 + 1;\n```', opts: ['16', '9', '7', '6'], a: 1, e: '** raises 2 to the third power first, giving 8, and then + 1 gives 9.', tags: ['Numbers', 'Operators'] },
  { q: 'A grid has 17 items and 5 columns. Which value is the number of items in the final incomplete row?\n\n```js\n17 % 5;\n```', opts: ['3', '2', '5', '3.4'], a: 1, e: '% returns the remainder after division. 17 leaves a remainder of 2 when divided by 5.', tags: ['Numbers', 'Operators'] },
  { q: 'What does this evaluate to?\n\n```js\ntypeof 42;\n```', opts: ['"number"', '"integer"', '"42"', '"NaN"'], a: 0, e: 'typeof returns a string naming the type. All JS numbers are of type "number".', tags: ['typeof', 'Numbers'] },
  { q: 'What is returned when spread passes the array items as separate arguments?\n\n```js\nMath.max(...[1, 5, 3]);\n```', opts: ['1', '3', '5', 'NaN'], a: 2, e: 'Spread turns the array into three arguments, so Math.max compares 1, 5, and 3 and returns 5.', tags: ['Math', 'Numbers'] },

  // ── Level 2 — Strings ──────────────────────────────────────────────────
  { q: 'What is the value after removing the first character?\n\n```js\n"hello".slice(1).length;\n```', opts: ['3', '4', '5', '6'], a: 1, e: 'slice(1) returns "ello", whose length is 4.', tags: ['Strings'] },
  { q: 'What does the method chain return?\n\n```js\n"Abc".toUpperCase().slice(1);\n```', opts: ['"bc"', '"BC"', '"ABC"', '"Bc"'], a: 1, e: 'toUpperCase creates "ABC"; slice(1) then returns "BC".', tags: ['Strings', 'Methods'] },
  { q: 'What is the result?\n\n```js\n"hello".slice(1, 3);\n```', opts: ['"he"', '"ell"', '"el"', '"llo"'], a: 2, e: 'slice(1, 3) takes characters from index 1 up to (not including) index 3: "el".', tags: ['Strings', 'Methods'] },
  { q: 'How does split represent the missing value between two commas?\n\n```js\n"a,,c".split(",");\n```', opts: ['["a", "", "c"]', '["a", "c"]', '["a,,c"]', '["a", null, "c"]'], a: 0, e: 'Each comma is a separator, so the text between the adjacent commas becomes an empty string.', tags: ['Strings', 'Arrays'] },

  // ── Level 3 — Booleans & Comparison ────────────────────────────────────
  { q: 'What does this return?\n\n```js\n1 === "1";\n```', opts: ['true', 'false', 'undefined', 'Error'], a: 1, e: '=== is strict equality and does not convert types. A number and a string are never strictly equal.', tags: ['Comparison', 'Equality'] },
  { q: 'What does this return?\n\n```js\n1 == "1";\n```', opts: ['true', 'false', 'undefined', 'Error'], a: 0, e: '== performs type coercion, converting "1" to the number 1 before comparing, so it is true.', tags: ['Comparison', 'Coercion'] },
  { q: 'What does this evaluate to?\n\n```js\n3 > 2 > 1;\n```', opts: ['true', 'false', '1', 'Error'], a: 1, e: 'It evaluates left to right: (3 > 2) is true, then true > 1 becomes 1 > 1, which is false.', tags: ['Comparison', 'Gotchas'] },
  { q: 'What is returned after the failed number conversion?\n\n```js\nBoolean(Number("not a number"));\n```', opts: ['true', 'false', 'NaN', 'undefined'], a: 1, e: 'Number returns NaN for this text. NaN is falsy, so Boolean(NaN) returns false.', tags: ['Booleans', 'Coercion'] },

  // ── Level 4 — Arrays: Basics ───────────────────────────────────────────
  { q: 'What is the array length after assigning index 2?\n\n```js\nconst items = [];\nitems[2] = "x";\nitems.length;\n```', opts: ['2', '3', '1', 'undefined'], a: 1, e: 'Assigning index 2 creates a sparse array whose highest index is 2, so length is 3.', tags: ['Arrays'] },
  { q: 'What does indexOf return when the value has a different type?\n\n```js\n[1, 2, 3].indexOf("2");\n```', opts: ['1', '-1', '2', 'undefined'], a: 1, e: 'indexOf uses strict equality. The string "2" does not match the number 2, so it returns -1.', tags: ['Arrays', 'Methods'] },
  { q: 'What does includes return when the value has a different type?\n\n```js\n[1, 2, 3].includes("2");\n```', opts: ['true', 'false', '-1', 'undefined'], a: 1, e: 'includes does not coerce the searched value. The string "2" is not one of the numeric items.', tags: ['Arrays', 'Methods'] },
  { q: 'What does join place between null and its neighbors?\n\n```js\n["a", null, "b"].join("-");\n```', opts: ['"a-null-b"', '"a--b"', '"a-b"', '["a", "b"]'], a: 1, e: 'join converts null and undefined array items to empty text, so both separators remain and the result is "a--b".', tags: ['Arrays', 'Methods'] },

  // ── Level 5 — Objects: Basics ──────────────────────────────────────────
  { q: 'What does the computed property access return?\n\n```js\nconst key = "a";\nconst o = { a: 1 };\no[key];\n```', opts: ['1', 'undefined', '"a"', 'Error'], a: 0, e: 'Bracket notation evaluates key to "a" and reads the value stored at that property.', tags: ['Objects'] },
  { q: 'What does this return?\n\n```js\nObject.keys({ a: 1, b: 2 });\n```', opts: ['["a", "b"]', '[1, 2]', '["a:1", "b:2"]', '2'], a: 0, e: 'Object.keys returns an array of the object’s property names.', tags: ['Objects', 'Methods'] },
  { q: 'What is the result?\n\n```js\nconst o = {};\no.x;\n```', opts: ['null', 'undefined', 'Error', '0'], a: 1, e: 'Reading a property that does not exist returns undefined (it does not throw).', tags: ['Objects'] },
  { q: 'What does this return?\n\n```js\nObject.values({ a: 1, b: 2 });\n```', opts: ['["a", "b"]', '[1, 2]', '{ a: 1, b: 2 }', '2'], a: 1, e: 'Object.values returns an array of the property values: [1, 2].', tags: ['Objects', 'Methods'] },

  // ── Level 6 — Array Iteration (map/forEach) ────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3].map(x => x * 2);\n```', opts: ['[1, 2, 3]', '[2, 4, 6]', '6', '[1, 4, 9]'], a: 1, e: 'map builds a new array by applying the function to each element: each doubled.', tags: ['Arrays', 'map'] },
  { q: 'map passes both the value and index. What is the result?\n\n```js\n[1, 2, 3].map((value, index) => value + index);\n```', opts: ['[1, 3, 5]', '[1, 2, 3]', '[0, 1, 2]', '[2, 4, 6]'], a: 0, e: 'The callback adds indexes 0, 1, and 2 to the corresponding values, producing [1, 3, 5].', tags: ['Arrays', 'map'] },
  { q: 'What is the value of r?\n\n```js\nconst r = [1, 2].forEach(x => x);\nr;\n```', opts: ['[1, 2]', 'undefined', '2', '[undefined, undefined]'], a: 1, e: 'forEach always returns undefined; it is used for side effects, not for building a value.', tags: ['Arrays', 'forEach'] },
  { q: 'What does this return?\n\n```js\n["a", "b", "c"].map((x, i) => i);\n```', opts: ['[0, 1, 2]', '["a", "b", "c"]', '[1, 2, 3]', '3'], a: 0, e: 'The second map argument is the index, so it returns each element’s index.', tags: ['Arrays', 'map'] },

  // ── Level 7 — filter & find ────────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4].filter(x => x % 2 === 0);\n```', opts: ['[2, 4]', '[1, 3]', '[1, 2, 3, 4]', '2'], a: 0, e: 'filter keeps elements where the test is true. The even numbers are 2 and 4.', tags: ['Arrays', 'filter'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4].find(x => x > 2);\n```', opts: ['3', '[3, 4]', '4', 'undefined'], a: 0, e: 'find returns the first matching element (not an array). The first value greater than 2 is 3.', tags: ['Arrays', 'find'] },
  { q: 'What is the result?\n\n```js\n[1, 2, 3].filter(x => x > 5);\n```', opts: ['[]', 'undefined', '[1, 2, 3]', 'null'], a: 0, e: 'No element passes the test, so filter returns an empty array.', tags: ['Arrays', 'filter'] },
  { q: 'What does this return?\n\n```js\n[5, 12, 8, 130].find(x => x > 10);\n```', opts: ['12', '130', '[12, 130]', '5'], a: 0, e: 'find returns the first element greater than 10, which is 12.', tags: ['Arrays', 'find'] },

  // ── Level 8 — reduce ───────────────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4].reduce((a, b) => a + b, 0);\n```', opts: ['10', '24', '[1, 2, 3, 4]', '0'], a: 0, e: 'reduce accumulates: 0+1+2+3+4 = 10.', tags: ['Arrays', 'reduce'] },
  { q: 'What is the result?\n\n```js\n[1, 2, 3].reduce((a, b) => a * b, 1);\n```', opts: ['6', '9', '0', '5'], a: 0, e: 'Starting from 1, it multiplies: 1*1*2*3 = 6.', tags: ['Arrays', 'reduce'] },
  { q: 'What does this return?\n\n```js\n["a", "b", "c"].reduce((a, b) => a + b, "");\n```', opts: ['"abc"', '["a", "b", "c"]', '"cba"', '"abc "'], a: 0, e: 'String concatenation from an empty accumulator joins them into "abc".', tags: ['Arrays', 'reduce'] },
  { q: 'What is returned (no initial value)?\n\n```js\n[1, 2, 3].reduce((a, b) => a + b);\n```', opts: ['6', '5', '7', 'Error'], a: 0, e: 'Without an initial value the first element becomes the accumulator: 1+2+3 = 6.', tags: ['Arrays', 'reduce'] },

  // ── Level 9 — Destructuring ────────────────────────────────────────────
  { q: 'What is the value of a?\n\n```js\nconst [a, b] = [1, 2];\na;\n```', opts: ['1', '2', '[1, 2]', 'undefined'], a: 0, e: 'Array destructuring assigns by position: a gets the first element, 1.', tags: ['Destructuring', 'Arrays'] },
  { q: 'What is the value of x?\n\n```js\nconst { x } = { x: 10, y: 20 };\nx;\n```', opts: ['10', '20', '{ x: 10 }', 'undefined'], a: 0, e: 'Object destructuring pulls out the property by name: x is 10.', tags: ['Destructuring', 'Objects'] },
  { q: 'What is the value of c?\n\n```js\nconst [a, , c] = [1, 2, 3];\nc;\n```', opts: ['2', '3', 'undefined', '[1, 3]'], a: 1, e: 'The empty slot skips index 1, so c receives the third element, 3.', tags: ['Destructuring', 'Arrays'] },
  { q: 'What is the value of a?\n\n```js\nconst { a = 5 } = {};\na;\n```', opts: ['undefined', '5', '0', 'Error'], a: 1, e: 'When the property is missing, the destructuring default 5 is used.', tags: ['Destructuring', 'Defaults'] },

  // ── Level 10 — Spread & Rest ───────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[...[1, 2], ...[3, 4]];\n```', opts: ['[1, 2, 3, 4]', '[[1, 2], [3, 4]]', '[4, 6]', '[1, 2], [3, 4]'], a: 0, e: 'The spread operator expands both arrays into one flat array.', tags: ['Spread', 'Arrays'] },
  { q: 'What is the result?\n\n```js\nconst o = { ...{ a: 1 }, ...{ b: 2 } };\no;\n```', opts: ['{ a: 1, b: 2 }', '{ a: 1 }', '{ b: 2 }', '{ a: 1, a: 1 }'], a: 0, e: 'Object spread copies properties from both objects into a new object.', tags: ['Spread', 'Objects'] },
  { q: 'What does this return?\n\n```js\nfunction f(...args) {\n  return args.length;\n}\nf(1, 2, 3);\n```', opts: ['3', '1', '[1, 2, 3]', 'undefined'], a: 0, e: 'The rest parameter collects all arguments into an array; its length is 3.', tags: ['Rest', 'Functions'] },
  { q: 'What is the value of rest?\n\n```js\nconst [first, ...rest] = [1, 2, 3, 4];\nrest;\n```', opts: ['[2, 3, 4]', '[1]', '[1, 2, 3, 4]', '4'], a: 0, e: 'The rest pattern collects all remaining elements after the first: [2, 3, 4].', tags: ['Rest', 'Destructuring'] },

  // ── Level 11 — Functions & Scope ───────────────────────────────────────
  { q: 'What does this return?\n\n```js\nconst sq = x => x * x;\nsq(4);\n```', opts: ['8', '16', 'undefined', '"xx"'], a: 1, e: 'An arrow with no braces returns its expression: 4 * 4 = 16.', tags: ['Functions', 'Arrow'] },
  { q: 'What is the result?\n\n```js\nfunction g(a, b = 2) {\n  return a + b;\n}\ng(3);\n```', opts: ['3', '5', 'NaN', 'Error'], a: 1, e: 'b uses its default of 2 when no argument is passed: 3 + 2 = 5.', tags: ['Functions', 'Defaults'] },
  { q: 'What is the value of x?\n\n```js\nlet x = 1;\n{\n  let x = 2;\n}\nx;\n```', opts: ['1', '2', 'undefined', 'Error'], a: 0, e: 'The inner x is block-scoped and separate; the outer x is still 1.', tags: ['Scope', 'let'] },
  { q: 'What does h() return?\n\n```js\nfunction h() {\n  const x = 5;\n}\nh();\n```', opts: ['5', 'undefined', 'null', 'Error'], a: 1, e: 'A function with no return statement returns undefined.', tags: ['Functions'] },

  // ── Level 12 — Closures ────────────────────────────────────────────────
  { q: 'What does the final inc() return?\n\n```js\nfunction counter() {\n  let c = 0;\n  return () => ++c;\n}\nconst inc = counter();\ninc();\ninc();\ninc();\n```', opts: ['1', '2', '3', 'undefined'], a: 2, e: 'The returned function closes over c, which persists across calls: 1, 2, then 3.', tags: ['Closures'] },
  { q: 'What is returned?\n\n```js\nfunction makeAdder(x) {\n  return y => x + y;\n}\nconst add5 = makeAdder(5);\nadd5(3);\n```', opts: ['5', '3', '8', '53'], a: 2, e: 'add5 remembers x = 5 via closure, so add5(3) is 5 + 3 = 8.', tags: ['Closures'] },
  { q: 'What does outer()() return?\n\n```js\nfunction outer() {\n  let v = "a";\n  function inner() {\n    return v;\n  }\n  v = "b";\n  return inner;\n}\nouter()();\n```', opts: ['"a"', '"b"', 'undefined', 'Error'], a: 1, e: 'inner closes over the variable v, not its old value. By call time v is "b".', tags: ['Closures'] },
  { q: 'What is the result?\n\n```js\nconst fns = [];\nfor (let i = 0; i < 3; i++) {\n  fns.push(() => i);\n}\nfns[0]() + fns[1]() + fns[2]();\n```', opts: ['0', '3', '6', '9'], a: 1, e: 'With let, each loop iteration has its own i (0, 1, 2). The sum is 0 + 1 + 2 = 3.', tags: ['Closures', 'let'] },

  // ── Level 13 — Hoisting & let/const ────────────────────────────────────
  { q: 'What is logged?\n\n```js\nconsole.log(typeof x);\nvar x = 5;\n```', opts: ['"number"', '"undefined"', 'ReferenceError', '5'], a: 1, e: 'var declarations are hoisted but not their assignment, so x exists as undefined.', tags: ['Hoisting', 'var'] },
  { q: 'What happens?\n\n```js\nconsole.log(a);\nlet a = 5;\n```', opts: ['undefined', '5', 'ReferenceError', 'null'], a: 2, e: 'let is hoisted but stays in the temporal dead zone until declared, so this throws a ReferenceError.', tags: ['Hoisting', 'let'] },
  { q: 'What happens?\n\n```js\nfoo();\nfunction foo() {\n  return 1;\n}\n```', opts: ['Returns 1', 'ReferenceError', 'TypeError', 'undefined'], a: 0, e: 'Function declarations are fully hoisted, so foo can be called before its definition.', tags: ['Hoisting', 'Functions'] },
  { q: 'What happens?\n\n```js\nconst x = 1;\nx = 2;\n```', opts: ['2', '1', 'TypeError', 'undefined'], a: 2, e: 'Reassigning a const binding throws a TypeError.', tags: ['const'] },

  // ── Level 14 — this & Context ──────────────────────────────────────────
  { q: 'What does obj.get() return?\n\n```js\nconst obj = {\n  n: 5,\n  get() {\n    return this.n;\n  },\n};\nobj.get();\n```', opts: ['5', 'undefined', 'this', 'Error'], a: 0, e: 'A method called as obj.get() binds this to obj, so this.n is 5.', tags: ['this', 'Objects'] },
  { q: 'What does obj.get() return?\n\n```js\nconst obj = {\n  n: 5,\n  get: () => this.n,\n};\nobj.get();\n```', opts: ['5', 'undefined', 'Error', 'null'], a: 1, e: 'Arrow functions do not get their own this; here this is not obj, so this.n is undefined.', tags: ['this', 'Arrow'] },
  { q: 'What does this return?\n\n```js\nconst o = {\n  x: 1,\n  f() {\n    return this;\n  },\n};\no.f() === o;\n```', opts: ['true', 'false', 'undefined', 'Error'], a: 0, e: 'Calling o.f() sets this to o, so the returned this is o and the comparison is true.', tags: ['this'] },
  { q: 'What does this return?\n\n```js\nfunction greet() {\n  return this.name;\n}\ngreet.call({ name: "Sam" });\n```', opts: ['"Sam"', 'undefined', 'this.name', 'Error'], a: 0, e: 'call invokes the function with a given this, so this.name reads "Sam".', tags: ['this', 'call'] },

  // ── Level 15 — Callbacks & HOFs ────────────────────────────────────────
  { q: 'What is returned?\n\n```js\nfunction apply(fn, x) {\n  return fn(x);\n}\napply(n => n + 1, 9);\n```', opts: ['9', '10', 'undefined', '"n+1"'], a: 1, e: 'apply calls the passed function with 9, returning 9 + 1 = 10.', tags: ['Callbacks', 'HOF'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3].map(String);\n```', opts: ['[1, 2, 3]', '["1", "2", "3"]', '"123"', '[String]'], a: 1, e: 'Passing String as the callback converts each number to its string form.', tags: ['Callbacks', 'map'] },
  { q: 'What does h(3) return?\n\n```js\nconst compose = (f, g) => x => f(g(x));\nconst h = compose(a => a * 2, b => b + 1);\nh(3);\n```', opts: ['7', '8', '9', '6'], a: 1, e: 'g runs first: 3 + 1 = 4, then f doubles it: 4 * 2 = 8.', tags: ['HOF', 'Composition'] },
  { q: 'What does this return?\n\n```js\n[3, 1, 2].sort((a, b) => a - b);\n```', opts: ['[3, 1, 2]', '[1, 2, 3]', '[3, 2, 1]', '[1, 3, 2]'], a: 1, e: 'The comparator a - b sorts ascending, giving [1, 2, 3].', tags: ['Arrays', 'sort'] },

  // ── Level 16 — Ternary & Short-circuit ─────────────────────────────────
  { q: 'What does this return?\n\n```js\n5 > 3 ? "yes" : "no";\n```', opts: ['"yes"', '"no"', 'true', '5'], a: 0, e: 'The condition 5 > 3 is true, so the ternary yields the first value, "yes".', tags: ['Ternary'] },
  { q: 'What is the result?\n\n```js\n0 || "fallback";\n```', opts: ['0', '"fallback"', 'true', 'false'], a: 1, e: '|| returns the first truthy operand. 0 is falsy, so it returns "fallback".', tags: ['Operators', 'Short-circuit'] },
  { q: 'What does this return?\n\n```js\n"hi" && "bye";\n```', opts: ['"hi"', '"bye"', 'true', 'false'], a: 1, e: '&& returns the last operand when all are truthy, so it returns "bye".', tags: ['Operators', 'Short-circuit'] },
  { q: 'What is the result?\n\n```js\nnull ?? "default";\n```', opts: ['null', '"default"', 'undefined', 'false'], a: 1, e: 'The nullish operator ?? returns the right side only when the left is null or undefined.', tags: ['Operators', 'Nullish'] },

  // ── Level 17 — Type Coercion ───────────────────────────────────────────
  { q: 'What is the result?\n\n```js\n"5" + 3;\n```', opts: ['8', '"53"', '"8"', '53'], a: 1, e: 'With a string operand, + concatenates: "5" + "3" gives "53".', tags: ['Coercion', 'Strings'] },
  { q: 'What does this return?\n\n```js\n"5" - 3;\n```', opts: ['2', '"2"', '"53"', 'NaN'], a: 0, e: 'The - operator forces numeric conversion, so "5" becomes 5 and 5 - 3 = 2.', tags: ['Coercion', 'Numbers'] },
  { q: 'What is the result?\n\n```js\n1 + "2" + 3;\n```', opts: ['"123"', '6', '"15"', '"33"'], a: 0, e: 'Left to right: 1 + "2" is "12", then "12" + 3 is "123".', tags: ['Coercion'] },
  { q: 'What does this return?\n\n```js\n[] + [];\n```', opts: ['0', '"[]"', '""', '[]'], a: 2, e: 'Arrays convert to strings for +; an empty array becomes "", so the result is an empty string.', tags: ['Coercion', 'Gotchas'] },

  // ── Level 18 — Truthy / Falsy ──────────────────────────────────────────
  { q: 'What is the result?\n\n```js\nBoolean("");\n```', opts: ['true', 'false', '""', 'undefined'], a: 1, e: 'An empty string is falsy, so Boolean("") is false.', tags: ['Truthy', 'Booleans'] },
  { q: 'What does this return?\n\n```js\nBoolean("0");\n```', opts: ['true', 'false', '0', 'undefined'], a: 0, e: 'Any non-empty string is truthy, including the string "0".', tags: ['Truthy', 'Gotchas'] },
  { q: 'What is the result?\n\n```js\nBoolean([]);\n```', opts: ['true', 'false', '[]', 'undefined'], a: 0, e: 'All objects, including empty arrays, are truthy.', tags: ['Truthy', 'Arrays'] },
  { q: 'What does this return?\n\n```js\n!!null;\n```', opts: ['true', 'false', 'null', 'undefined'], a: 1, e: 'null is falsy; the double negation converts it to the boolean false.', tags: ['Truthy', 'Operators'] },

  // ── Level 19 — JSON & Objects ──────────────────────────────────────────
  { q: 'What is the result?\n\n```js\nJSON.stringify({ a: 1 });\n```', opts: ['\'{"a":1}\'', '"{a:1}"', '"[object Object]"', '{ a: 1 }'], a: 0, e: 'JSON.stringify returns a JSON string with quoted keys: {"a":1}.', tags: ['JSON', 'Objects'] },
  { q: 'What does this return?\n\n```js\nJSON.parse("[1,2,3]");\n```', opts: ['"[1,2,3]"', '[1, 2, 3]', '{ 0: 1, 1: 2, 2: 3 }', 'Error'], a: 1, e: 'JSON.parse turns the JSON text into a real array [1, 2, 3].', tags: ['JSON', 'Arrays'] },
  { q: 'What is the result?\n\n```js\nObject.assign({}, { a: 1 }, { a: 2 });\n```', opts: ['{ a: 1 }', '{ a: 2 }', '{ a: 1, a: 2 }', '{}'], a: 1, e: 'Later sources overwrite earlier ones, so a ends up as 2.', tags: ['Objects', 'Methods'] },
  { q: 'What is the value of a.x?\n\n```js\nconst a = { x: 1 };\nconst b = { ...a };\nb.x = 2;\na.x;\n```', opts: ['1', '2', 'undefined', 'Error'], a: 0, e: 'Spread makes a shallow copy, so changing b.x does not affect a.x, which stays 1.', tags: ['Spread', 'Objects'] },

  // ── Level 20 — Optional Chaining & Nullish ─────────────────────────────
  { q: 'What is the result?\n\n```js\nconst u = { profile: null };\nu.profile?.name;\n```', opts: ['null', 'undefined', 'Error', '""'], a: 1, e: 'Optional chaining short-circuits when profile is null, yielding undefined instead of throwing.', tags: ['Optional chaining'] },
  { q: 'What does this return?\n\n```js\nconst o = { a: { b: 2 } };\no.a?.b;\n```', opts: ['2', 'undefined', 'Error', 'null'], a: 0, e: 'a exists, so optional chaining proceeds and reads b, which is 2.', tags: ['Optional chaining'] },
  { q: 'What is the result?\n\n```js\nconst x = 0;\nx ?? 5;\n```', opts: ['0', '5', 'undefined', 'NaN'], a: 0, e: '?? only falls back on null or undefined. 0 is neither, so the result is 0.', tags: ['Nullish'] },
  { q: 'What does this return?\n\n```js\nconst arr = null;\narr?.length;\n```', opts: ['0', 'null', 'undefined', 'Error'], a: 2, e: 'Optional chaining on null returns undefined rather than throwing.', tags: ['Optional chaining'] },

  // ── Level 21 — Promises ────────────────────────────────────────────────
  { q: 'What value does the resulting promise resolve to?\n\n```js\nPromise.resolve(5).then(v => v * 2);\n```', opts: ['5', '10', 'Promise', 'undefined'], a: 1, e: 'then maps the resolved value 5 through v * 2, so the new promise resolves to 10.', tags: ['Promises'] },
  { q: 'What does the final promise resolve to?\n\n```js\nPromise.resolve(1).then(v => v + 1).then(v => v + 1);\n```', opts: ['1', '2', '3', 'Promise'], a: 2, e: 'Each then adds 1: 1 → 2 → 3.', tags: ['Promises', 'Chaining'] },
  { q: 'What is logged?\n\n```js\nasync function f() {\n  return 5;\n}\nconsole.log(typeof f());\n```', opts: ['"number"', '"object"', '"function"', '"promise"'], a: 1, e: 'An async function always returns a Promise, and typeof a Promise is "object".', tags: ['Promises', 'async'] },
  { q: 'What does the promise resolve to?\n\n```js\nPromise.all([Promise.resolve(1), Promise.resolve(2)]);\n```', opts: ['[1, 2]', '1', '3', 'Promise'], a: 0, e: 'Promise.all resolves to an array of every input promise’s value: [1, 2].', tags: ['Promises'] },

  // ── Level 22 — Async / Await ───────────────────────────────────────────
  { q: 'What does f() resolve to?\n\n```js\nasync function f() {\n  const x = await Promise.resolve(7);\n  return x + 1;\n}\n```', opts: ['7', '8', 'Promise(8)', 'undefined'], a: 1, e: 'await unwraps the promise to 7, then the function returns 8 (wrapped in a promise).', tags: ['async', 'await'] },
  { q: 'What does g() resolve to?\n\n```js\nasync function f() {\n  return 1;\n}\nasync function g() {\n  const v = await f();\n  return v + 1;\n}\n```', opts: ['1', '2', '3', 'Promise'], a: 1, e: 'await f() gives 1, so g resolves to 2.', tags: ['async', 'await'] },
  { q: 'In what order are values logged?\n\n```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nconsole.log("C");\n```', opts: ['A B C', 'A C B', 'C A B', 'B A C'], a: 1, e: 'setTimeout defers B to the task queue, so the synchronous A and C run first: A, C, B.', tags: ['Event loop', 'async'] },
  { q: 'What happens?\n\n```js\nasync function f() {\n  throw new Error("x");\n}\nf().catch(() => "caught");\n```', opts: ['Uncaught error', 'The rejection is caught', 'Returns undefined', 'SyntaxError'], a: 1, e: 'Throwing in an async function rejects its promise, and .catch handles that rejection.', tags: ['async', 'Errors'] },

  // ── Level 23 — Sets & Maps ─────────────────────────────────────────────
  { q: 'What is the value?\n\n```js\nnew Set([1, 1, 2, 3, 3]).size;\n```', opts: ['5', '3', '2', '4'], a: 1, e: 'A Set stores unique values, leaving {1, 2, 3}, so size is 3.', tags: ['Set'] },
  { q: 'What does this return?\n\n```js\n[...new Set([1, 2, 2, 3])];\n```', opts: ['[1, 2, 2, 3]', '[1, 2, 3]', '3', '[1, 3]'], a: 1, e: 'Building a Set drops duplicates, and spreading it back gives [1, 2, 3].', tags: ['Set', 'Spread'] },
  { q: 'What does m.get("a") return?\n\n```js\nconst m = new Map();\nm.set("a", 1);\nm.get("a");\n```', opts: ['1', '"a"', 'undefined', '{ a: 1 }'], a: 0, e: 'get returns the value stored under the key "a", which is 1.', tags: ['Map'] },
  { q: 'What does this return?\n\n```js\nconst m = new Map([["x", 1]]);\nm.has("x");\n```', opts: ['true', 'false', '1', 'undefined'], a: 0, e: 'has checks whether the key exists. "x" was set, so it returns true.', tags: ['Map'] },

  // ── Level 24 — Edge Cases & Gotchas ────────────────────────────────────
  { q: 'What does this return?\n\n```js\n0.1 + 0.2 === 0.3;\n```', opts: ['true', 'false', '0.3', 'NaN'], a: 1, e: 'Floating-point rounding makes 0.1 + 0.2 slightly more than 0.3, so the comparison is false.', tags: ['Numbers', 'Gotchas'] },
  { q: 'What is the result?\n\n```js\ntypeof null;\n```', opts: ['"null"', '"object"', '"undefined"', '"number"'], a: 1, e: 'typeof null is the historical quirk "object".', tags: ['typeof', 'Gotchas'] },
  { q: 'What does this return?\n\n```js\n[1, 2, 3] + "";\n```', opts: ['"123"', '"1,2,3"', '"[1,2,3]"', '6'], a: 1, e: 'Converting an array to a string joins elements with commas: "1,2,3".', tags: ['Coercion', 'Arrays'] },
  { q: 'What is the result?\n\n```js\nNaN === NaN;\n```', opts: ['true', 'false', 'NaN', 'undefined'], a: 1, e: 'NaN is never equal to anything, including itself, so this is false.', tags: ['Numbers', 'Gotchas'] },

  // ── Level 25 — Mixed Mastery ───────────────────────────────────────────
  { q: 'What does this return?\n\n```js\n[1, 2, 3, 4, 5].filter(x => x % 2).map(x => x * 10);\n```', opts: ['[10, 30, 50]', '[20, 40]', '[10, 20, 30, 40, 50]', '[1, 3, 5]'], a: 0, e: 'filter keeps odd numbers [1, 3, 5] (x % 2 is truthy), then map multiplies each by 10.', tags: ['Arrays', 'Chaining'] },
  { q: 'What does this return?\n\n```js\nObject.entries({ a: 1, b: 2 }).map(([k, v]) => `${k}=${v}`);\n```', opts: ['["a=1", "b=2"]', '["a", "b"]', '[1, 2]', '"a=1,b=2"'], a: 0, e: 'entries gives [key, value] pairs; mapping with a template builds ["a=1", "b=2"].', tags: ['Objects', 'map'] },
  { q: 'What does this return?\n\n```js\nconst arr = [1, 2, 3];\nconst doubled = arr.map(x => x * 2);\narr === doubled;\n```', opts: ['true', 'false', '[2, 4, 6]', 'undefined'], a: 1, e: 'map returns a brand-new array, so it is not the same reference as arr.', tags: ['Arrays', 'Immutability'] },
  { q: 'What does this return?\n\n```js\n"hello world"\n  .split(" ")\n  .map(w => w[0].toUpperCase() + w.slice(1))\n  .join(" ");\n```', opts: ['"Hello World"', '"HELLO WORLD"', '"hello world"', '"Hello world"'], a: 0, e: 'It splits into words, capitalizes each first letter, and rejoins: "Hello World".', tags: ['Strings', 'Chaining'] },
];
