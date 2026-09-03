// TypeScript roadmap questions — set B (100). A second question per level theme,
// distinct from set A. Combined with set A this gives 8 questions per level so
// each 5-level checkpoint has a full 40-question test. 25 levels × 4.

import type { Seed } from './roadmap-build';

export const tsSeedsB: Seed[] = [
  // ── Level 1 — Basic Types ──────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nlet x: string;\nx = 42;\n```', opts: ['Compiles', 'Type error', 'x is 42', 'Runtime error'], a: 1, e: 'A number is not assignable to a string variable.', tags: ['Types', 'Errors'] },
  { q: 'Which declaration compiles with TypeScript’s built-in numeric type?\n\n```ts\n// Choose one\n```', opts: ['const n: number = 3.14;', 'const n: float = 3.14;', 'const n: integer = 3;', 'const n: decimal = 3.14;'], a: 0, e: 'TypeScript uses number for ordinary floating-point and integer values; float, integer, and decimal are not built-in types.', tags: ['Types'] },
  { q: 'What happens?\n\n```ts\nlet u: undefined = undefined;\n```', opts: ['Type error', 'Compiles', 'u is null', 'Runtime error'], a: 1, e: 'undefined is a valid value for the undefined type.', tags: ['Types'] },
  { q: 'What happens?\n\n```ts\nlet x: null = 0;\n```', opts: ['Compiles', 'Type error', 'x is 0', 'null'], a: 1, e: '0 is not assignable to the null type.', tags: ['Types', 'Errors'] },

  // ── Level 2 — Type Inference ───────────────────────────────────────────
  { q: 'What type is inferred for arr?\n\n```ts\nconst arr = [1, "a"];\n```', opts: ['number[]', '(string | number)[]', 'any[]', '[1, "a"]'], a: 1, e: 'A mixed array infers a union element type: (string | number)[].', tags: ['Inference', 'Arrays'] },
  { q: 'What type is inferred for x?\n\n```ts\nconst x = "hi";\n```', opts: ['string', '"hi"', 'any', 'const'], a: 1, e: 'A const string infers the literal type "hi".', tags: ['Inference', 'Literals'] },
  { q: 'What is the inferred return type?\n\n```ts\nfunction f() {\n  return 5;\n}\n```', opts: ['void', 'number', '5', 'any'], a: 1, e: 'Returning a number value infers a number return type.', tags: ['Inference', 'Functions'] },
  { q: 'What type is inferred for obj?\n\n```ts\nconst obj = { a: 1, b: "x" };\n```', opts: ['{ a: number; b: string }', '{ a: 1; b: "x" }', 'any', 'object'], a: 0, e: 'Object property types widen to number and string.', tags: ['Inference', 'Objects'] },

  // ── Level 3 — Function Types ───────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nconst f: () => void = () => 5;\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'f returns 5'], a: 1, e: 'A function returning a value is assignable to a () => void type; the result is just ignored.', tags: ['Functions', 'void'] },
  { q: 'Which callback satisfies run’s parameter type?\n\n```ts\nfunction run(cb: (n: number) => number) {}\n```', opts: ['n => console.log(n)', 'n => n * 2', 'n => String(n)', '(n: string) => n.length'], a: 1, e: 'run requires a callback that accepts a number and returns a number. n => n * 2 matches both parts.', tags: ['Functions'] },
  { q: 'What is the inferred return type?\n\n```ts\nconst g = (a: number, b: number) => a > b;\n```', opts: ['number', 'boolean', 'void', 'any'], a: 1, e: 'A comparison returns a boolean.', tags: ['Functions', 'Inference'] },
  { q: 'What does f(1, 2, 3) return?\n\n```ts\nfunction f(...nums: number[]): number {\n  return nums.length;\n}\nf(1, 2, 3);\n```', opts: ['3', 'a number', '[1, 2, 3]', 'Error'], a: 0, e: 'The rest parameter collects 3 arguments, so length is 3.', tags: ['Functions', 'Rest'] },

  // ── Level 4 — Arrays & Tuples ──────────────────────────────────────────
  { q: 'What type is t[0]?\n\n```ts\nconst t: [number, string] = [1, "a"];\nt[0];\n```', opts: ['number', 'string', '1', 'any'], a: 0, e: 'The tuple types position 0 as number.', tags: ['Tuples'] },
  { q: 'What happens?\n\n```ts\nconst a: number[] = [];\na.push(1);\n```', opts: ['Type error', 'Compiles', 'a is [1]', 'Runtime error'], a: 1, e: 'Pushing a number into a number[] is allowed.', tags: ['Arrays'] },
  { q: 'What happens?\n\n```ts\nconst t: [number, ...string[]] = [1, "a", "b"];\n```', opts: ['Type error', 'Compiles', 'too many elements', 'Runtime error'], a: 1, e: 'A rest element in the tuple allows any number of trailing strings.', tags: ['Tuples'] },
  { q: 'What is T?\n\n```ts\ntype T = [string, number]["length"];\n```', opts: ['number', '2', 'string', 'any'], a: 1, e: 'A tuple’s length is a literal type, here 2.', tags: ['Tuples', 'Indexed access'] },

  // ── Level 5 — Object Types ─────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nconst o: { a: number } = { a: 1 };\no.b;\n```', opts: ['Compiles', 'Type error', 'undefined', 'Runtime error'], a: 1, e: 'The type has no b property, so accessing o.b is a type error.', tags: ['Objects'] },
  { q: 'What happens?\n\n```ts\ntype T = { [key: string]: number };\nconst x: T = { a: 1, b: 2 };\n```', opts: ['Type error', 'Compiles', 'keys must be numeric', 'Runtime error'], a: 1, e: 'An index signature allows any string key with number values.', tags: ['Objects', 'Index signatures'] },
  { q: 'What happens?\n\n```ts\nconst o: { readonly a: number } = { a: 1 };\no.a = 5;\n```', opts: ['Compiles', 'Type error', 'a is 5', 'Runtime error'], a: 1, e: 'readonly forbids reassigning a.', tags: ['Objects', 'readonly'] },
  { q: 'What happens?\n\n```ts\nfunction f(p: { x: number; y: number }) {}\nf({ x: 1, y: 2, z: 3 });\n```', opts: ['Compiles', 'Type error', 'z is ignored', 'Runtime error'], a: 1, e: 'Object literals get excess-property checks; z is not allowed.', tags: ['Objects', 'Excess properties'] },

  // ── Level 6 — Interfaces ───────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ninterface A {\n  f(): void;\n}\nconst a: A = { f() {} };\n```', opts: ['Type error', 'Compiles', 'f is missing', 'Runtime error'], a: 1, e: 'The object provides the required method f, so it satisfies A.', tags: ['Interfaces'] },
  { q: 'What happens?\n\n```ts\ninterface A {\n  x: number;\n}\ninterface A {\n  y: number;\n}\nconst a: A = { x: 1, y: 2 };\n```', opts: ['Type error', 'Compiles (interfaces merge)', 'duplicate error', 'Runtime error'], a: 1, e: 'Interfaces with the same name merge, so A needs both x and y.', tags: ['Interfaces', 'Merging'] },
  { q: 'What does f(3) return?\n\n```ts\ninterface Fn {\n  (n: number): number;\n}\nconst f: Fn = n => n * 2;\nf(3);\n```', opts: ['6', '9', 'A type error occurs', 'undefined'], a: 0, e: 'The interface\'s call signature types f as a function taking and returning a number; f(3) returns 3 * 2 = 6.', tags: ['Interfaces', 'Call signatures'] },
  { q: 'A readonly interface property can be:\n\n```ts\ninterface A {\n  readonly id: number;\n}\n```', opts: ['reassigned freely', 'set at creation only', 'optional', 'a string'], a: 1, e: 'readonly means it is set when the object is created and never reassigned.', tags: ['Interfaces', 'readonly'] },

  // ── Level 7 — Union Types ──────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nfunction f(x: "a" | "b") {}\nf("c");\n```', opts: ['Compiles', 'Type error', '"c" is allowed', 'Runtime error'], a: 1, e: '"c" is not part of the literal union, so it is a type error.', tags: ['Unions', 'Literals'] },
  { q: 'What happens?\n\n```ts\nlet x: number | string = 5;\nx.toFixed(2);\n```', opts: ['Compiles', 'Type error', '"5.00"', 'Runtime error'], a: 1, e: 'toFixed exists on number but not string, so calling it on the union is an error.', tags: ['Unions'] },
  { q: 'What happens?\n\n```ts\ntype T = (number | string)[];\nconst a: T = [1, "a", 2];\n```', opts: ['Type error', 'Compiles', 'mixing not allowed', 'Runtime error'], a: 1, e: 'An array of a union type accepts both numbers and strings.', tags: ['Unions', 'Arrays'] },
  { q: 'What happens?\n\n```ts\ntype R = string | number;\nconst r: R = true;\n```', opts: ['Compiles', 'Type error', 'r is true', 'Runtime error'], a: 1, e: 'boolean is not a member of the union string | number.', tags: ['Unions', 'Errors'] },

  // ── Level 8 — Literal Types ────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype Yes = true;\nconst y: Yes = false;\n```', opts: ['Compiles', 'Type error', 'y is false', 'Runtime error'], a: 1, e: 'The literal type true only accepts true, not false.', tags: ['Literals'] },
  { q: 'What type is obj.dir?\n\n```ts\nconst obj = { dir: "left" } as const;\nobj.dir;\n```', opts: ['string', '"left"', 'any', 'readonly'], a: 1, e: 'as const narrows dir to the literal type "left".', tags: ['Literals', 'as const'] },
  { q: 'What happens?\n\n```ts\nfunction move(d: "up" | "down") {}\nmove("up");\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: '"up" is a valid member of the literal union.', tags: ['Literals'] },
  { q: 'What happens?\n\n```ts\nlet x: "a" = "a";\nx = "b";\n```', opts: ['Compiles', 'Type error', 'x is "b"', 'Runtime error'], a: 1, e: 'The literal type "a" only accepts "a", so assigning "b" is an error.', tags: ['Literals'] },

  // ── Level 9 — Optional & Readonly ──────────────────────────────────────
  { q: 'What happens?\n\n```ts\ninterface T {\n  a?: number;\n}\nconst x: T = { a: undefined };\n```', opts: ['Type error', 'Compiles', 'a is required', 'Runtime error'], a: 1, e: 'An optional property accepts undefined.', tags: ['Optional'] },
  { q: 'What does f() return?\n\n```ts\nfunction f(a?: number) {\n  return a;\n}\nf();\n```', opts: ['0', 'undefined', 'Error', 'null'], a: 1, e: 'A missing optional argument is undefined, which is returned.', tags: ['Optional'] },
  { q: 'What happens?\n\n```ts\nconst arr: readonly number[] = [1, 2];\narr.push(3);\n```', opts: ['Compiles', 'Type error', 'arr is [1, 2, 3]', 'Runtime error'], a: 1, e: 'readonly arrays have no push method, so this is a type error.', tags: ['readonly', 'Arrays'] },
  { q: 'What happens?\n\n```ts\ninterface P {\n  readonly name: string;\n}\nlet p: P = { name: "a" };\np = { name: "b" };\n```', opts: ['Type error', 'Compiles', 'name is locked', 'Runtime error'], a: 1, e: 'readonly applies to the property, not the variable, so replacing the whole object is fine.', tags: ['readonly'] },

  // ── Level 10 — Type Aliases ────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype Age = number;\ntype User = { age: Age; name: string };\nconst u: User = { age: 1, name: "a" };\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: 'Age is an alias for number, so the object satisfies User.', tags: ['Type aliases'] },
  { q: 'What does f(4) return?\n\n```ts\ntype Fn = (x: number) => number;\nconst f: Fn = x => x + 1;\nf(4);\n```', opts: ['5', 'a number', 'Error', 'undefined'], a: 0, e: 'f adds 1 to its argument: 4 + 1 = 5.', tags: ['Type aliases', 'Functions'] },
  { q: 'What is U?\n\n```ts\ntype T = string | number;\ntype U = T | boolean;\n```', opts: ['string | number | boolean', 'string', 'boolean', 'never'], a: 0, e: 'U expands to the full union string | number | boolean.', tags: ['Type aliases', 'Unions'] },
  { q: 'What happens?\n\n```ts\ntype Tree = { value: number; children: Tree[] };\n```', opts: ['Type error', 'Valid (recursive alias)', 'infinite loop', 'Runtime error'], a: 1, e: 'Type aliases may reference themselves, enabling recursive structures.', tags: ['Type aliases', 'Recursive'] },

  // ── Level 11 — Type Narrowing ──────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nfunction f(x: string | string[]) {\n  return typeof x === "string" ? x : x.join(",");\n}\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: 'typeof narrows x to string or string[], so each branch is valid.', tags: ['Narrowing'] },
  { q: 'What is the return type?\n\n```ts\nfunction f(x?: number) {\n  if (x !== undefined) return x.toFixed();\n  return "0";\n}\n```', opts: ['number', 'string', 'number | string', 'Error'], a: 1, e: 'Both branches return strings (toFixed gives a string, and "0").', tags: ['Narrowing'] },
  { q: 'What happens?\n\n```ts\nfunction f(x: number | null) {\n  return x!.toFixed();\n}\n```', opts: ['Type error', 'Compiles (non-null assertion)', 'always safe at runtime', 'Runtime error'], a: 1, e: 'The ! non-null assertion tells the compiler x is not null, so it compiles.', tags: ['Narrowing', 'Non-null'] },
  { q: 'In the else branch, what is the type of x?\n\n```ts\nfunction f(x: "a" | "b") {\n  if (x === "a") {\n  } else {\n    // here\n  }\n}\n```', opts: ['"a"', '"b"', '"a" | "b"', 'never'], a: 1, e: 'After ruling out "a", x narrows to "b" in the else branch.', tags: ['Narrowing'] },

  // ── Level 12 — Type Guards ─────────────────────────────────────────────
  { q: 'After this check, what type is x?\n\n```ts\nif (typeof x === "number") {\n  // x here\n}\n```', opts: ['string', 'number', 'any', 'never'], a: 1, e: 'typeof "number" narrows x to number inside the block.', tags: ['Type guards'] },
  { q: 'Is this a valid type guard?\n\n```ts\nfunction isArr(x: unknown): x is unknown[] {\n  return Array.isArray(x);\n}\n```', opts: ['Type error', 'Yes, a valid type guard', 'runtime only', 'Runtime error'], a: 1, e: 'The x is unknown[] predicate makes it a custom type guard.', tags: ['Type guards'] },
  { q: 'What happens?\n\n```ts\nfunction f(x: Date | string) {\n  return x instanceof Date ? x.getFullYear() : x;\n}\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: 'instanceof narrows x to Date in the first branch, so getFullYear is valid.', tags: ['Type guards', 'instanceof'] },
  { q: 'What happens?\n\n```ts\nfunction f(x: { a: number } | { b: number }) {\n  return "a" in x ? x.a : x.b;\n}\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: 'The in operator narrows the union, so x.a and x.b are each valid.', tags: ['Type guards', 'in'] },

  // ── Level 13 — Enums ───────────────────────────────────────────────────
  { q: 'What is E.A + E.B?\n\n```ts\nenum E {\n  A = 1,\n  B = 2,\n}\nE.A + E.B;\n```', opts: ['3', '"AB"', '12', 'Error'], a: 0, e: 'Numeric enum members add like numbers: 1 + 2 = 3.', tags: ['Enums'] },
  { q: 'What is C.Y?\n\n```ts\nconst enum C {\n  X,\n  Y,\n}\nC.Y;\n```', opts: ['0', '1', '"Y"', 'Error'], a: 1, e: 'const enum members auto-number from 0, so Y is 1 (inlined at compile time).', tags: ['Enums'] },
  { q: 'What does E.A.toUpperCase() return?\n\n```ts\nenum E {\n  A = "a",\n}\nE.A.toUpperCase();\n```', opts: ['"a"', '"A"', '0', 'Error'], a: 1, e: 'E.A is the string "a", so toUpperCase gives "A".', tags: ['Enums', 'Strings'] },
  { q: 'What is E.C?\n\n```ts\nenum E {\n  A,\n  B,\n  C,\n}\nE.C;\n```', opts: ['0', '1', '2', '"C"'], a: 2, e: 'Auto-numbering: A=0, B=1, C=2.', tags: ['Enums'] },

  // ── Level 14 — Generics: Basics ────────────────────────────────────────
  { q: 'What type is pair(1, "x")?\n\n```ts\nfunction pair<T, U>(a: T, b: U): [T, U] {\n  return [a, b];\n}\npair(1, "x");\n```', opts: ['[number, string]', '[T, U]', '[1, "x"]', 'any[]'], a: 0, e: 'T and U infer to number and string, giving [number, string].', tags: ['Generics'] },
  { q: 'What is the return type of id("hi")?\n\n```ts\nfunction id<T>(x: T) {\n  return x;\n}\nid("hi");\n```', opts: ['string', '"hi"', 'T', 'any'], a: 0, e: 'T infers to string, so id returns string.', tags: ['Generics', 'Inference'] },
  { q: 'What does arr(true) return?\n\n```ts\nfunction arr<T>(x: T): T[] {\n  return [x, x];\n}\narr(true);\n```', opts: ['[true, true]', 'a boolean', '[T]', 'Error'], a: 0, e: 'It returns a two-element array of the argument: [true, true].', tags: ['Generics'] },
  { q: 'What does first([10, 20]) return?\n\n```ts\nconst first = <T>(a: T[]): T => a[0];\nfirst([10, 20]);\n```', opts: ['10', 'a number', 'T', 'undefined'], a: 0, e: 'It returns the first element, 10.', tags: ['Generics'] },

  // ── Level 15 — Generic Constraints ─────────────────────────────────────
  { q: 'What does f("hi") return?\n\n```ts\nfunction f<T extends string>(x: T) {\n  return x.length;\n}\nf("hi");\n```', opts: ['2', 'a number', '"hi"', 'Error'], a: 0, e: 'A string is allowed by the constraint; its length is 2.', tags: ['Generics', 'Constraints'] },
  { q: 'What does f([1, 2, 3]) return?\n\n```ts\nfunction f<T extends any[]>(x: T) {\n  return x.length;\n}\nf([1, 2, 3]);\n```', opts: ['3', 'a number', '[1, 2, 3]', 'Error'], a: 0, e: 'The array satisfies the constraint; its length is 3.', tags: ['Generics', 'Constraints'] },
  { q: 'What does merge({ a: 1 }, { b: 2 }) produce?\n\n```ts\nfunction merge<T extends object, U extends object>(a: T, b: U) {\n  return { ...a, ...b };\n}\nmerge({ a: 1 }, { b: 2 });\n```', opts: ['T & U (a and b combined)', 'only a', 'only b', 'any'], a: 0, e: 'Spreading both gives the intersection T & U: { a: number; b: number }.', tags: ['Generics', 'Constraints'] },
  { q: 'What does f({ id: 5, name: "a" }) return?\n\n```ts\nfunction f<T extends { id: number }>(x: T) {\n  return x.id;\n}\nf({ id: 5, name: "a" });\n```', opts: ['5', 'a number', '{ id: 5 }', 'Error'], a: 0, e: 'The constraint guarantees an id property, which is 5.', tags: ['Generics', 'Constraints'] },

  // ── Level 16 — keyof & typeof ──────────────────────────────────────────
  { q: 'What is K?\n\n```ts\nconst p = { x: 1, y: 2 };\ntype K = keyof typeof p;\n```', opts: ['"x" | "y"', 'number', '{ x; y }', 'string'], a: 0, e: 'typeof p is { x: number; y: number }; keyof gives "x" | "y".', tags: ['keyof', 'typeof'] },
  { q: 'What is T?\n\n```ts\nconst s = "hi";\ntype T = typeof s;\n```', opts: ['string', '"hi"', 'any', 'typeof'], a: 1, e: 'const s infers the literal "hi", so typeof s is "hi".', tags: ['typeof', 'Literals'] },
  { q: 'What is T?\n\n```ts\nconst arr = [1, 2, 3] as const;\ntype T = typeof arr[0];\n```', opts: ['number', '1', 'readonly', '1 | 2 | 3'], a: 1, e: 'With as const, arr[0] has the literal type 1.', tags: ['typeof', 'as const'] },
  { q: 'What is K?\n\n```ts\ntype K = keyof { 0: "a"; 1: "b" };\n```', opts: ['0 | 1', '"a" | "b"', 'number', 'string'], a: 0, e: 'keyof returns the numeric-literal keys 0 | 1.', tags: ['keyof'] },

  // ── Level 17 — Indexed Access Types ────────────────────────────────────
  { q: 'What is B?\n\n```ts\ntype T = { a: { b: number } };\ntype B = T["a"]["b"];\n```', opts: ['number', '{ b: number }', '"b"', 'T'], a: 0, e: 'Chained indexed access reaches the nested b, which is number.', tags: ['Indexed access'] },
  { q: 'What is Values?\n\n```ts\ntype Person = { name: string; age: number };\ntype Values = Person[keyof Person];\n```', opts: ['string | number', 'string', 'number', 'keyof Person'], a: 0, e: 'Indexing by all keys yields the union of value types: string | number.', tags: ['Indexed access', 'keyof'] },
  { q: 'What is Item?\n\n```ts\nconst obj = { list: [1, 2, 3] };\ntype Item = typeof obj["list"][number];\n```', opts: ['number', 'number[]', '1 | 2 | 3', 'any'], a: 0, e: 'list is inferred as number[]; indexing by number gives number.', tags: ['Indexed access', 'typeof'] },
  { q: 'What is R?\n\n```ts\ntype Fn = { greet: () => string };\ntype R = ReturnType<Fn["greet"]>;\n```', opts: ['string', 'void', 'Fn', 'never'], a: 0, e: 'Fn["greet"] is () => string; ReturnType extracts string.', tags: ['Indexed access', 'Utility'] },

  // ── Level 18 — Partial & Required ──────────────────────────────────────
  { q: 'What is T?\n\n```ts\ntype T = Required<Partial<{ a: number }>>;\n```', opts: ['{ a?: number }', '{ a: number }', '{}', 'never'], a: 1, e: 'Partial makes a optional, then Required makes it required again: { a: number }.', tags: ['Utility', 'Partial', 'Required'] },
  { q: 'What can you pass to update?\n\n```ts\nfunction update(u: Partial<User>) {}\n```', opts: ['all properties required', 'any subset of User’s properties', 'no properties allowed', 'only id'], a: 1, e: 'Partial<User> makes every property optional, so any subset is valid.', tags: ['Utility', 'Partial'] },
  { q: 'What happens?\n\n```ts\ntype T = Partial<{ a: number; b: string }>;\nconst x: T = { b: "hi" };\n```', opts: ['Type error', 'Compiles', 'a is required', 'Runtime error'], a: 1, e: 'Both properties are optional, so providing only b is fine.', tags: ['Utility', 'Partial'] },
  { q: 'What happens?\n\n```ts\ntype T = Required<{ a?: number }>;\nconst x: T = {};\n```', opts: ['Compiles', 'Type error', 'a is optional', 'Runtime error'], a: 1, e: 'Required makes a mandatory, so the empty object is a type error.', tags: ['Utility', 'Required'] },

  // ── Level 19 — Pick & Omit ─────────────────────────────────────────────
  { q: 'Which keys does T have?\n\n```ts\ntype T = Pick<{ a: 1; b: 2; c: 3 }, "a" | "c">;\n```', opts: ['a and c', 'b', 'all three', 'none'], a: 0, e: 'Pick keeps only the listed keys: a and c.', tags: ['Utility', 'Pick'] },
  { q: 'What is T?\n\n```ts\ntype T = Omit<{ a: 1; b: 2 }, "a" | "b">;\n```', opts: ['{ a; b }', '{} (empty)', '{ a }', 'never'], a: 1, e: 'Omitting both keys leaves an empty object type.', tags: ['Utility', 'Omit'] },
  { q: 'Which keys does Safe have?\n\n```ts\ntype User = { id: number; pw: string };\ntype Safe = Omit<User, "pw">;\n```', opts: ['id and pw', 'id only', 'pw only', 'none'], a: 1, e: 'Omit removes pw, leaving id only.', tags: ['Utility', 'Omit'] },
  { q: 'What happens?\n\n```ts\ntype T = Pick<{ a: number }, "b">;\n```', opts: ['T is {}', 'Type error', 'T is { b }', 'any'], a: 1, e: '"b" is not a key of the object, so Pick reports a type error.', tags: ['Utility', 'Pick'] },

  // ── Level 20 — Record ──────────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype Scores = Record<"math" | "art", number>;\nconst s: Scores = { math: 90, art: 80 };\n```', opts: ['Type error', 'Compiles', 'art is missing', 'Runtime error'], a: 1, e: 'Both required keys are present with number values.', tags: ['Utility', 'Record'] },
  { q: 'What happens?\n\n```ts\ntype T = Record<number, string>;\nconst x: T = { 0: "a", 1: "b" };\n```', opts: ['Type error', 'Compiles', 'string keys only', 'Runtime error'], a: 1, e: 'Record<number, string> allows numeric keys with string values.', tags: ['Utility', 'Record'] },
  { q: 'What happens?\n\n```ts\ntype Flags = Record<string, boolean>;\nconst f: Flags = { on: true, off: false };\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: 'Any string key maps to a boolean, so this is valid.', tags: ['Utility', 'Record'] },
  { q: 'Record<K, V> is equivalent to:', opts: ['{ [P in K]: V }', 'K | V', '[K, V]', 'K & V'], a: 0, e: 'Record is a mapped type creating a V-valued property for each key in K.', tags: ['Utility', 'Record'] },

  // ── Level 21 — Mapped Types ────────────────────────────────────────────
  { q: 'What does this do to each property?\n\n```ts\ntype Nullable<T> = { [K in keyof T]: T[K] | null };\n```', opts: ['makes them readonly', 'makes them optional', 'lets each also accept null', 'removes them'], a: 2, e: 'It rewrites each value type to T[K] | null.', tags: ['Mapped types'] },
  { q: 'What does each property become?\n\n```ts\ntype Getters<T> = { [K in keyof T]: () => T[K] };\n```', opts: ['its value', 'a function returning its value', 'optional', 'readonly'], a: 1, e: 'Each property becomes a function that returns the original value type.', tags: ['Mapped types'] },
  { q: 'What does -readonly do here?\n\n```ts\ntype Mutable = { -readonly [K in keyof { readonly a: number }]: number };\n```', opts: ['keeps a readonly', 'makes a mutable', 'makes a optional', 'never'], a: 1, e: 'The -readonly modifier strips readonly, making a writable.', tags: ['Mapped types', 'readonly'] },
  { q: 'What is the result for { a: 1 }?\n\n```ts\ntype Keys<T> = { [K in keyof T]: K };\ntype R = Keys<{ a: 1 }>;\n```', opts: ['{ a: 1 }', '{ a: "a" }', '{ a: number }', 'never'], a: 1, e: 'Each value becomes the key’s name, so a maps to "a".', tags: ['Mapped types'] },

  // ── Level 22 — Conditional Types ───────────────────────────────────────
  { q: 'What is T?\n\n```ts\ntype T = 1 extends number ? true : false;\n```', opts: ['true', 'false', 'boolean', 'never'], a: 0, e: 'The literal 1 extends number, so T is true.', tags: ['Conditional types'] },
  { q: 'What is T?\n\n```ts\ntype T = string extends number ? "a" : "b";\n```', opts: ['"a"', '"b"', 'never', 'boolean'], a: 1, e: 'string does not extend number, so T is the "b" branch.', tags: ['Conditional types'] },
  { q: 'What is R?\n\n```ts\ntype Without<T, U> = T extends U ? never : T;\ntype R = Without<"a" | "b", "a">;\n```', opts: ['"a"', '"b"', 'never', '"a" | "b"'], a: 1, e: 'Distributing over the union removes "a", leaving "b".', tags: ['Conditional types', 'Distributive'] },
  { q: 'What is T?\n\n```ts\ntype T = [] extends { length: number } ? 1 : 0;\n```', opts: ['0', '1', 'never', 'boolean'], a: 1, e: 'Arrays have a numeric length, so [] extends { length: number } is true → 1.', tags: ['Conditional types'] },

  // ── Level 23 — infer ───────────────────────────────────────────────────
  { q: 'What is R?\n\n```ts\ntype Last<T> = T extends [...any[], infer L] ? L : never;\ntype R = Last<[1, 2, 3]>;\n```', opts: ['1', '3', 'number', 'never'], a: 1, e: 'infer L captures the last tuple element, 3.', tags: ['infer', 'Tuples'] },
  { q: 'What is R?\n\n```ts\ntype Arg<T> = T extends (a: infer A) => any ? A : never;\ntype R = Arg<(x: string) => void>;\n```', opts: ['string', 'void', 'never', 'x'], a: 0, e: 'infer A captures the parameter type, string.', tags: ['infer'] },
  { q: 'What is R?\n\n```ts\ntype Unwrap<T> = T extends Promise<infer U> ? U : T;\ntype R = Unwrap<number>;\n```', opts: ['number', 'never', 'Promise<number>', 'U'], a: 0, e: 'number is not a Promise, so the conditional falls through to T, which is number.', tags: ['infer', 'Conditional types'] },
  { q: 'What is R?\n\n```ts\ntype Inner<T> = T extends Array<Array<infer U>> ? U : never;\ntype R = Inner<number[][]>;\n```', opts: ['number[][]', 'number[]', 'number', 'never'], a: 2, e: 'number[][] is Array<Array<number>>, so infer U captures number.', tags: ['infer'] },

  // ── Level 24 — Template Literal Types ──────────────────────────────────
  { q: 'What is T?\n\n```ts\ntype T = Uppercase<"hello">;\n```', opts: ['"hello"', '"HELLO"', '"Hello"', 'string'], a: 1, e: 'The Uppercase intrinsic produces "HELLO".', tags: ['Template literals'] },
  { q: 'What is T?\n\n```ts\ntype T = `${1}-${2}`;\n```', opts: ['"1-2"', '"12"', '"3"', 'number'], a: 0, e: 'Number literals interpolate into the string "1-2".', tags: ['Template literals'] },
  { q: 'What happens?\n\n```ts\ntype Event = `${string}Changed`;\nconst e: Event = "valueChanged";\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'any'], a: 1, e: '"valueChanged" matches the pattern `${string}Changed`.', tags: ['Template literals'] },
  { q: 'What is T?\n\n```ts\ntype T = Capitalize<"name">;\n```', opts: ['"name"', '"Name"', '"NAME"', 'string'], a: 1, e: 'Capitalize uppercases only the first letter: "Name".', tags: ['Template literals'] },

  // ── Level 25 — Mixed Mastery ───────────────────────────────────────────
  { q: 'What is T?\n\n```ts\ntype T = Partial<Pick<{ a: number; b: string }, "a">>;\n```', opts: ['{ a?: number }', '{ a: number }', '{ b?: string }', 'never'], a: 0, e: 'Pick keeps a, then Partial makes it optional: { a?: number }.', tags: ['Utility', 'Mastery'] },
  { q: 'What type is prop({ a: "x" }, "a")?\n\n```ts\nfunction prop<T, K extends keyof T>(o: T, k: K): T[K] {\n  return o[k];\n}\nprop({ a: "x" }, "a");\n```', opts: ['string', '"x"', 'T[K]', 'any'], a: 0, e: 'T[K] resolves to the type of property a, which is string.', tags: ['Generics', 'Mastery'] },
  { q: 'What is R?\n\n```ts\ntype R = ReturnType<() => Promise<number>>;\n```', opts: ['number', 'Promise<number>', 'void', 'never'], a: 1, e: 'ReturnType extracts the declared return type, Promise<number>.', tags: ['Utility', 'Mastery'] },
  { q: 'What is T?\n\n```ts\ntype T = Record<"a", number> & Record<"b", string>;\n```', opts: ['{ a: number; b: string }', '{ a: number } | { b: string }', 'never', 'any'], a: 0, e: 'The intersection combines both records into { a: number; b: string }.', tags: ['Utility', 'Mastery'] },
];
