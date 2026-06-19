// TypeScript roadmap questions (100): "what is the type / does this compile /
// what does it return". 25 levels × 4 questions, easiest → hardest. See
// lib/roadmap.ts for the per-level titles. Ids are rm-ts-1 … rm-ts-100.

import { buildRoadmap, type Seed } from './roadmap-build';

const seeds: Seed[] = [
  // ── Level 1 — Basic Types ──────────────────────────────────────────────
  { q: 'What is the type of x?\n\n```ts\nlet x: number = 5;\n```', opts: ['number', 'string', 'any', '5'], a: 0, e: 'The annotation : number declares x as the number type.', tags: ['Types'] },
  { q: 'What type is name.length?\n\n```ts\nconst name: string = "Ada";\nname.length;\n```', opts: ['string', 'number', 'any', '3'], a: 1, e: 'String length is always a number, even though its value here is 3.', tags: ['Types', 'Strings'] },
  { q: 'What happens?\n\n```ts\nlet flag: boolean = true;\nflag = "yes";\n```', opts: ['Compiles fine', 'Type error', 'Runtime error', 'flag becomes "yes"'], a: 1, e: 'A string is not assignable to a boolean variable, so the compiler reports a type error.', tags: ['Types', 'Errors'] },
  { q: 'What happens?\n\n```ts\nlet value: any = 5;\nvalue = "now a string";\n```', opts: ['Type error', 'Compiles fine', 'Runtime error', 'any is invalid'], a: 1, e: 'The any type opts out of checking, so reassigning to any type compiles.', tags: ['any'] },

  // ── Level 2 — Type Inference ───────────────────────────────────────────
  { q: 'What type is inferred for count?\n\n```ts\nlet count = 10;\n```', opts: ['number', 'any', '10', 'never'], a: 0, e: 'A let with an initializer infers the widened type, here number.', tags: ['Inference'] },
  { q: 'What type is inferred for count?\n\n```ts\nconst count = 10;\n```', opts: ['number', '10', 'const', 'any'], a: 1, e: 'A const cannot change, so TypeScript infers the literal type 10.', tags: ['Inference', 'Literals'] },
  { q: 'What type is inferred for arr?\n\n```ts\nlet arr = [1, 2, 3];\n```', opts: ['number[]', 'any[]', '[1, 2, 3]', 'Array'], a: 0, e: 'An array of numbers infers number[].', tags: ['Inference', 'Arrays'] },
  { q: 'What is the inferred return type?\n\n```ts\nconst greet = () => "hello";\n```', opts: ['void', 'string', '"hello"', 'any'], a: 1, e: 'The function returns a string, so the inferred return type is string.', tags: ['Inference', 'Functions'] },

  // ── Level 3 — Function Types ───────────────────────────────────────────
  { q: 'What is the return type of add?\n\n```ts\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```', opts: ['number', 'void', 'any', 'string'], a: 0, e: 'The annotation : number after the parameters declares the return type.', tags: ['Functions', 'Types'] },
  { q: 'What is the return type of log?\n\n```ts\nfunction log(msg: string): void {\n  console.log(msg);\n}\n```', opts: ['void', 'undefined', 'string', 'never'], a: 0, e: 'void marks a function that returns no useful value.', tags: ['Functions', 'void'] },
  { q: 'What does multiply(2, 3) return?\n\n```ts\nconst multiply: (a: number, b: number) => number = (a, b) => a * b;\nmultiply(2, 3);\n```', opts: ['6', 'number', '"6"', 'Error'], a: 0, e: 'The typed function multiplies its arguments: 2 * 3 = 6.', tags: ['Functions'] },
  { q: 'What does greet() return?\n\n```ts\nfunction greet(name?: string) {\n  return name ?? "Guest";\n}\ngreet();\n```', opts: ['undefined', '"Guest"', 'Error', 'null'], a: 1, e: 'The optional name is undefined, so ?? falls back to "Guest".', tags: ['Functions', 'Optional'] },

  // ── Level 4 — Arrays & Tuples ──────────────────────────────────────────
  { q: 'What type is pair[1]?\n\n```ts\nconst pair: [string, number] = ["age", 30];\npair[1];\n```', opts: ['string', 'number', '30', 'any'], a: 1, e: 'A tuple types each position; index 1 is declared as number.', tags: ['Tuples'] },
  { q: 'What happens?\n\n```ts\nconst nums: number[] = [1, 2, 3];\nnums.push("4");\n```', opts: ['Compiles', 'Type error', 'Runtime error', 'Pushes "4"'], a: 1, e: 'You cannot push a string into a number[]; the compiler reports a type error.', tags: ['Arrays', 'Errors'] },
  { q: 'Array<string> is the same as which type?\n\n```ts\nconst list: Array<string> = ["a", "b"];\n```', opts: ['string[]', 'string', 'any[]', '[string]'], a: 0, e: 'Array<string> and string[] are two spellings of the same type.', tags: ['Arrays', 'Generics'] },
  { q: 'What happens?\n\n```ts\nconst point: readonly [number, number] = [1, 2];\npoint[0] = 5;\n```', opts: ['Compiles', 'Type error', 'Sets to 5', 'Runtime error'], a: 1, e: 'A readonly tuple cannot be reassigned element-by-element, so this is a type error.', tags: ['Tuples', 'readonly'] },

  // ── Level 5 — Object Types ─────────────────────────────────────────────
  { q: 'What type is user.age?\n\n```ts\nconst user: { name: string; age: number } = { name: "Sam", age: 5 };\nuser.age;\n```', opts: ['string', 'number', 'any', '{ age: number }'], a: 1, e: 'age is declared as number in the object type.', tags: ['Objects'] },
  { q: 'What happens?\n\n```ts\ntype Point = { x: number; y: number };\nconst p: Point = { x: 1 };\n```', opts: ['Compiles', 'Type error', 'y is undefined', 'Runtime error'], a: 1, e: 'Point requires both x and y; omitting y is a type error.', tags: ['Objects', 'Errors'] },
  { q: 'What happens?\n\n```ts\ntype Config = { debug?: boolean };\nconst c: Config = {};\n```', opts: ['Type error', 'Compiles', 'debug is required', 'Runtime error'], a: 1, e: 'debug is optional (?), so an empty object satisfies Config.', tags: ['Objects', 'Optional'] },
  { q: 'What happens?\n\n```ts\ntype T = { a: number };\nconst x: T = { a: 1, b: 2 };\n```', opts: ['Compiles', 'Type error', 'b is ignored', 'Runtime error'], a: 1, e: 'Object literals get excess-property checks; the unknown b triggers a type error.', tags: ['Objects', 'Excess properties'] },

  // ── Level 6 — Interfaces ───────────────────────────────────────────────
  { q: 'What type is dog.name?\n\n```ts\ninterface Animal {\n  name: string;\n}\nconst dog: Animal = { name: "Rex" };\ndog.name;\n```', opts: ['string', 'number', 'Animal', 'any'], a: 0, e: 'The interface declares name as string.', tags: ['Interfaces'] },
  { q: 'What happens?\n\n```ts\ninterface A {\n  x: number;\n}\ninterface B extends A {\n  y: number;\n}\nconst b: B = { x: 1, y: 2 };\n```', opts: ['Type error', 'Compiles', 'y missing', 'x missing'], a: 1, e: 'B extends A, so it needs both x and y, which are present.', tags: ['Interfaces', 'extends'] },
  { q: 'What does g.greet() return?\n\n```ts\ninterface Greeter {\n  greet(): string;\n}\nconst g: Greeter = { greet: () => "hi" };\ng.greet();\n```', opts: ['"hi"', 'string', 'void', 'Error'], a: 0, e: 'greet returns the string "hi".', tags: ['Interfaces', 'Methods'] },
  { q: 'What happens?\n\n```ts\ninterface Box {\n  value: number;\n}\nconst b: Box = {};\n```', opts: ['Compiles', 'Type error', 'value is 0', 'undefined'], a: 1, e: 'Box requires value, so the empty object is a type error.', tags: ['Interfaces', 'Errors'] },

  // ── Level 7 — Union Types ──────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nlet id: string | number;\nid = 5;\nid = "abc";\n```', opts: ['Type error on id = 5', 'Type error on id = "abc"', 'Compiles', 'Runtime error'], a: 2, e: 'A string | number union accepts both kinds of value, so both assignments compile.', tags: ['Unions'] },
  { q: 'What happens?\n\n```ts\nfunction f(x: string | number) {\n  return x.toUpperCase();\n}\n```', opts: ['Compiles', 'Type error', 'Runtime error', 'Returns string'], a: 1, e: 'toUpperCase does not exist on number, so calling it on the union is a type error.', tags: ['Unions', 'Errors'] },
  { q: 'What happens?\n\n```ts\ntype Status = "on" | "off";\nlet s: Status = "maybe";\n```', opts: ['Compiles', 'Type error', 's is "maybe"', 'Runtime error'], a: 1, e: '"maybe" is not part of the union, so this is a type error.', tags: ['Unions', 'Literals'] },
  { q: 'What is the return type?\n\n```ts\nfunction size(x: string | any[]) {\n  return x.length;\n}\n```', opts: ['number', 'Type error', 'string', 'any'], a: 0, e: 'Both string and array have a numeric length, so the common member is allowed and returns number.', tags: ['Unions'] },

  // ── Level 8 — Literal Types ────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype Dir = "left" | "right";\nconst d: Dir = "left";\n```', opts: ['Type error', 'Compiles', 'd is string', 'Runtime error'], a: 1, e: '"left" is a member of the literal union Dir, so it compiles.', tags: ['Literals'] },
  { q: 'What type is x?\n\n```ts\nconst x = 5 as const;\n```', opts: ['number', '5', 'const', 'any'], a: 1, e: 'as const narrows to the literal type 5.', tags: ['Literals', 'as const'] },
  { q: 'What happens?\n\n```ts\nlet n: 1 | 2 | 3 = 4;\n```', opts: ['Compiles', 'Type error', 'n is 4', 'Runtime error'], a: 1, e: '4 is not one of the allowed literals 1, 2, or 3, so it is a type error.', tags: ['Literals', 'Errors'] },
  { q: 'What happens?\n\n```ts\ntype Bit = 0 | 1;\nconst b: Bit = 1;\n```', opts: ['Type error', 'Compiles', 'b is number', 'b is boolean'], a: 1, e: '1 is a valid member of the literal union Bit.', tags: ['Literals'] },

  // ── Level 9 — Optional & Readonly ──────────────────────────────────────
  { q: 'What type is u.email?\n\n```ts\ninterface User {\n  name: string;\n  email?: string;\n}\nconst u: User = { name: "A" };\nu.email;\n```', opts: ['string', 'string | undefined', 'undefined', 'Error'], a: 1, e: 'An optional property has type string | undefined.', tags: ['Optional'] },
  { q: 'What happens?\n\n```ts\ninterface P {\n  readonly id: number;\n}\nconst p: P = { id: 1 };\np.id = 2;\n```', opts: ['Compiles', 'Type error', 'id is 2', 'Runtime error'], a: 1, e: 'A readonly property cannot be reassigned, so this is a type error.', tags: ['readonly'] },
  { q: 'What does f(5) return?\n\n```ts\nfunction f(a: number, b?: number): number {\n  return a + (b ?? 0);\n}\nf(5);\n```', opts: ['5', 'NaN', 'Error', 'undefined'], a: 0, e: 'b is undefined, so ?? gives 0 and the result is 5 + 0 = 5.', tags: ['Optional'] },
  { q: 'What happens?\n\n```ts\ntype T = { a: number; b?: string };\nconst obj: T = { a: 1, b: undefined };\n```', opts: ['Type error', 'Compiles', 'b is required', 'Runtime error'], a: 1, e: 'An optional b accepts undefined, so this compiles.', tags: ['Optional'] },

  // ── Level 10 — Type Aliases ────────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype ID = string;\nconst x: ID = "abc";\n```', opts: ['Type error', 'Compiles', 'x is ID', 'Runtime error'], a: 1, e: 'ID is just an alias for string, so a string compiles.', tags: ['Type aliases'] },
  { q: 'What happens?\n\n```ts\ntype Pair = [number, number];\nconst p: Pair = [1, 2, 3];\n```', opts: ['Compiles', 'Type error', 'Ignores 3', 'Runtime error'], a: 1, e: 'A 2-tuple cannot hold three elements, so this is a type error.', tags: ['Type aliases', 'Tuples'] },
  { q: 'What type is n?\n\n```ts\ntype Callback = (n: number) => void;\nconst cb: Callback = (n) => console.log(n);\n```', opts: ['number', 'any', 'string', 'void'], a: 0, e: 'The alias declares the parameter n as number, so it is inferred there.', tags: ['Type aliases', 'Functions'] },
  { q: 'What happens?\n\n```ts\ntype Nullable<T> = T | null;\nconst x: Nullable<string> = null;\n```', opts: ['Type error', 'Compiles', 'x is string', 'Runtime error'], a: 1, e: 'Nullable<string> is string | null, so null is allowed.', tags: ['Type aliases', 'Generics'] },

  // ── Level 11 — Type Narrowing ──────────────────────────────────────────
  { q: 'What happens?\n\n```ts\nfunction f(x: string | number) {\n  if (typeof x === "string") {\n    return x.toUpperCase();\n  }\n  return x.toFixed(2);\n}\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'Returns any'], a: 1, e: 'The typeof check narrows x to string in the if and number after it, so each method call is valid.', tags: ['Narrowing'] },
  { q: 'What is the return type?\n\n```ts\nfunction f(x: string | null) {\n  if (x) {\n    return x.length;\n  }\n  return 0;\n}\n```', opts: ['number', 'number | null', 'Type error', 'string'], a: 0, e: 'Inside the truthy check x is string so length is number, and the other branch returns 0 — both number.', tags: ['Narrowing'] },
  { q: 'What happens?\n\n```ts\nfunction f(x: unknown) {\n  return x.toFixed(2);\n}\n```', opts: ['Compiles', 'Type error', 'number', 'Runtime error'], a: 1, e: 'unknown must be narrowed before use; accessing a method on it directly is a type error.', tags: ['unknown', 'Narrowing'] },
  { q: 'What does f(undefined) return?\n\n```ts\nfunction f(x: number | undefined) {\n  return x ?? -1;\n}\nf(undefined);\n```', opts: ['-1', 'undefined', '0', 'Error'], a: 0, e: 'x is undefined, so ?? returns the fallback -1.', tags: ['Narrowing', 'Nullish'] },

  // ── Level 12 — Type Guards ─────────────────────────────────────────────
  { q: 'What is this an example of?\n\n```ts\nfunction isString(x: unknown): x is string {\n  return typeof x === "string";\n}\n```', opts: ['A user-defined type guard', 'A class', 'A generic', 'An error'], a: 0, e: 'The x is string return type makes this a custom type guard the compiler trusts.', tags: ['Type guards'] },
  { q: 'What does f("hi") return?\n\n```ts\nfunction f(x: string | number) {\n  if (Array.isArray(x)) {\n    return "array";\n  }\n  return "not array";\n}\nf("hi");\n```', opts: ['"array"', '"not array"', 'Error', 'undefined'], a: 1, e: 'A string is not an array, so it returns "not array".', tags: ['Type guards'] },
  { q: 'What happens?\n\n```ts\nclass Dog {\n  bark() {}\n}\nfunction f(x: unknown) {\n  if (x instanceof Dog) {\n    x.bark();\n    return true;\n  }\n  return false;\n}\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'Always true'], a: 1, e: 'instanceof narrows x to Dog inside the branch, so calling bark() is valid.', tags: ['Type guards', 'instanceof'] },
  { q: 'What happens?\n\n```ts\ntype A = { a: number };\ntype B = { b: number };\nfunction f(x: A | B) {\n  return "a" in x ? "has a" : "has b";\n}\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'Always "has a"'], a: 1, e: 'The in operator is a valid narrowing check on union members, so this compiles.', tags: ['Type guards', 'in'] },

  // ── Level 13 — Enums ───────────────────────────────────────────────────
  { q: 'What is Color.Green?\n\n```ts\nenum Color {\n  Red,\n  Green,\n  Blue,\n}\nColor.Green;\n```', opts: ['0', '1', '2', '"Green"'], a: 1, e: 'Numeric enums auto-number from 0, so Green is 1.', tags: ['Enums'] },
  { q: 'What is Dir.Down?\n\n```ts\nenum Dir {\n  Up = 1,\n  Down,\n}\nDir.Down;\n```', opts: ['0', '1', '2', '"Down"'], a: 2, e: 'Auto-numbering continues from Up = 1, so Down is 2.', tags: ['Enums'] },
  { q: 'What is Status.Active?\n\n```ts\nenum Status {\n  Active = "ACTIVE",\n  Inactive = "INACTIVE",\n}\nStatus.Active;\n```', opts: ['0', '"Active"', '"ACTIVE"', '1'], a: 2, e: 'A string enum member holds its assigned string, "ACTIVE".', tags: ['Enums'] },
  { q: 'What is E[0]?\n\n```ts\nenum E {\n  A,\n  B,\n  C,\n}\nE[0];\n```', opts: ['0', '"A"', '"B"', 'undefined'], a: 1, e: 'Numeric enums get a reverse mapping, so E[0] is the name "A".', tags: ['Enums'] },

  // ── Level 14 — Generics: Basics ────────────────────────────────────────
  { q: 'What does identity<number>(5) return?\n\n```ts\nfunction identity<T>(x: T): T {\n  return x;\n}\nidentity<number>(5);\n```', opts: ['5', 'T', 'number', 'any'], a: 0, e: 'identity returns its argument unchanged, so the value is 5.', tags: ['Generics'] },
  { q: 'What is the return type of first(["a", "b"])?\n\n```ts\nfunction first<T>(arr: T[]): T {\n  return arr[0];\n}\nfirst(["a", "b"]);\n```', opts: ['string', 'T', 'string[]', 'any'], a: 0, e: 'T is inferred as string from the argument, so the return type is string.', tags: ['Generics', 'Inference'] },
  { q: 'What does wrap(5) return?\n\n```ts\nfunction wrap<T>(x: T): T[] {\n  return [x];\n}\nwrap(5);\n```', opts: ['5', '[5]', 'number', 'T[]'], a: 1, e: 'wrap puts its argument into an array, so wrap(5) is [5].', tags: ['Generics'] },
  { q: 'What type is box("hi").value?\n\n```ts\nconst box = <T,>(v: T) => ({ value: v });\nbox("hi").value;\n```', opts: ['string', 'T', '{ value: string }', 'any'], a: 0, e: 'T is inferred as string, so value has type string.', tags: ['Generics', 'Inference'] },

  // ── Level 15 — Generic Constraints ─────────────────────────────────────
  { q: 'What does len("hello") return?\n\n```ts\nfunction len<T extends { length: number }>(x: T): number {\n  return x.length;\n}\nlen("hello");\n```', opts: ['5', 'number', '"hello"', 'Error'], a: 0, e: 'A string satisfies the length constraint, and its length is 5.', tags: ['Generics', 'Constraints'] },
  { q: 'What happens?\n\n```ts\nfunction len<T extends { length: number }>(x: T) {\n  return x.length;\n}\nlen(42);\n```', opts: ['Compiles', 'Type error', '0', 'Runtime error'], a: 1, e: 'A number has no length property, so it violates the constraint — a type error.', tags: ['Generics', 'Constraints'] },
  { q: 'What does getProp({ a: 1 }, "a") return?\n\n```ts\nfunction getProp<T, K extends keyof T>(obj: T, key: K) {\n  return obj[key];\n}\ngetProp({ a: 1 }, "a");\n```', opts: ['1', 'number', '"a"', 'Error'], a: 0, e: 'It reads obj["a"], which is 1.', tags: ['Generics', 'keyof'] },
  { q: 'What happens?\n\n```ts\nfunction getProp<T, K extends keyof T>(obj: T, key: K) {\n  return obj[key];\n}\ngetProp({ a: 1 }, "b");\n```', opts: ['Compiles', 'Type error', 'undefined', '1'], a: 1, e: '"b" is not a key of { a: number }, so it violates K extends keyof T.', tags: ['Generics', 'keyof'] },

  // ── Level 16 — keyof & typeof ──────────────────────────────────────────
  { q: 'What is K?\n\n```ts\ntype Point = { x: number; y: number };\ntype K = keyof Point;\n```', opts: ['"x" | "y"', 'string', 'number', 'Point'], a: 0, e: 'keyof produces the union of the object’s keys: "x" | "y".', tags: ['keyof'] },
  { q: 'What is T?\n\n```ts\nconst obj = { a: 1, b: 2 };\ntype T = typeof obj;\n```', opts: ['{ a: number; b: number }', '{ a: 1; b: 2 }', 'number', 'keyof obj'], a: 0, e: 'typeof on a let/var object gives the widened shape { a: number; b: number }.', tags: ['typeof'] },
  { q: 'What is Color?\n\n```ts\nconst colors = ["red", "green"] as const;\ntype Color = typeof colors[number];\n```', opts: ['string', '"red" | "green"', 'string[]', 'number'], a: 1, e: 'With as const, indexing the tuple by number yields the union "red" | "green".', tags: ['typeof', 'Indexed access'] },
  { q: 'What is Keys?\n\n```ts\ntype Keys = keyof { a: 1; b: 2; c: 3 };\n```', opts: ['"a" | "b" | "c"', '1 | 2 | 3', 'string', '3'], a: 0, e: 'keyof gives the union of property names: "a" | "b" | "c".', tags: ['keyof'] },

  // ── Level 17 — Indexed Access Types ────────────────────────────────────
  { q: 'What is Name?\n\n```ts\ntype User = { name: string; age: number };\ntype Name = User["name"];\n```', opts: ['string', 'number', '"name"', 'User'], a: 0, e: 'Indexing the type by the key "name" yields its type, string.', tags: ['Indexed access'] },
  { q: 'What is V?\n\n```ts\ntype T = { a: number; b: string };\ntype V = T["a" | "b"];\n```', opts: ['string | number', 'number', 'string', 'never'], a: 0, e: 'Indexing by a union of keys yields the union of their value types.', tags: ['Indexed access'] },
  { q: 'What is Item?\n\n```ts\ntype Arr = string[];\ntype Item = Arr[number];\n```', opts: ['string', 'number', 'string[]', 'Arr'], a: 0, e: 'Indexing an array type by number gives its element type, string.', tags: ['Indexed access'] },
  { q: 'What is Tags?\n\n```ts\nconst data = { id: 1, tags: ["a", "b"] };\ntype Tags = typeof data["tags"];\n```', opts: ['string[]', 'string', '["a", "b"]', 'number'], a: 0, e: 'The tags property is inferred as string[], so the indexed access is string[].', tags: ['Indexed access', 'typeof'] },

  // ── Level 18 — Utility: Partial & Required ─────────────────────────────
  { q: 'What does Partial do here?\n\n```ts\ntype User = { name: string; age: number };\ntype T = Partial<User>;\n```', opts: ['Makes all properties optional', 'Makes all required', 'Removes properties', 'Makes them readonly'], a: 0, e: 'Partial<T> turns every property optional.', tags: ['Utility', 'Partial'] },
  { q: 'What happens?\n\n```ts\ntype T = Partial<{ a: number }>;\nconst x: T = {};\n```', opts: ['Type error', 'Compiles', 'a is required', 'Runtime error'], a: 1, e: 'Partial makes a optional, so an empty object is valid.', tags: ['Utility', 'Partial'] },
  { q: 'What happens?\n\n```ts\ntype T = Required<{ a?: number; b?: string }>;\nconst x: T = { a: 1 };\n```', opts: ['Compiles', 'Type error', 'b is optional', 'Runtime error'], a: 1, e: 'Required makes b mandatory, so omitting it is a type error.', tags: ['Utility', 'Required'] },
  { q: 'What happens?\n\n```ts\ntype T = Readonly<{ a: number }>;\nconst x: T = { a: 1 };\nx.a = 2;\n```', opts: ['Compiles', 'Type error', 'Sets to 2', 'Runtime error'], a: 1, e: 'Readonly makes a immutable, so reassigning it is a type error.', tags: ['Utility', 'Readonly'] },

  // ── Level 19 — Utility: Pick & Omit ────────────────────────────────────
  { q: 'What is T?\n\n```ts\ntype User = { id: number; name: string; age: number };\ntype T = Pick<User, "id" | "name">;\n```', opts: ['{ id: number; name: string }', '{ age: number }', '{ id; name; age }', 'never'], a: 0, e: 'Pick keeps only the listed keys: id and name.', tags: ['Utility', 'Pick'] },
  { q: 'What is T?\n\n```ts\ntype User = { id: number; name: string; age: number };\ntype T = Omit<User, "age">;\n```', opts: ['{ id: number; name: string }', '{ age: number }', '{ id; name; age }', 'never'], a: 0, e: 'Omit removes the listed key, leaving id and name.', tags: ['Utility', 'Omit'] },
  { q: 'What happens?\n\n```ts\ntype T = Pick<{ a: 1; b: 2 }, "a">;\nconst x: T = { a: 1, b: 2 };\n```', opts: ['Compiles', 'Type error', 'b is ignored', 'Runtime error'], a: 1, e: 'Pick keeps only a, so the extra b is an excess-property type error.', tags: ['Utility', 'Pick'] },
  { q: 'What happens?\n\n```ts\ntype T = Omit<{ a: number; b: number }, "a">;\nconst x: T = { b: 5 };\n```', opts: ['Type error', 'Compiles', 'a is required', 'Runtime error'], a: 1, e: 'Omit drops a, leaving { b: number }, which { b: 5 } satisfies.', tags: ['Utility', 'Omit'] },

  // ── Level 20 — Utility: Record ─────────────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype T = Record<string, number>;\nconst x: T = { a: 1, b: 2 };\n```', opts: ['Type error', 'Compiles', 'keys must be numbers', 'Runtime error'], a: 1, e: 'Record<string, number> allows any string key with number values.', tags: ['Utility', 'Record'] },
  { q: 'What happens?\n\n```ts\ntype T = Record<"a" | "b", number>;\nconst x: T = { a: 1 };\n```', opts: ['Compiles', 'Type error', 'b is optional', 'Runtime error'], a: 1, e: 'Record<"a" | "b", number> requires both keys, so missing b is a type error.', tags: ['Utility', 'Record'] },
  { q: 'How many properties does Roles have?\n\n```ts\ntype Roles = Record<"admin" | "user", boolean>;\n```', opts: ['1', '2', '0', 'infinite'], a: 1, e: 'Record creates one property per key in the union: admin and user.', tags: ['Utility', 'Record'] },
  { q: 'What happens?\n\n```ts\ntype T = Record<string, string>;\nconst x: T = { name: 5 };\n```', opts: ['Compiles', 'Type error', '5 becomes "5"', 'Runtime error'], a: 1, e: 'The value type is string, so a number value is a type error.', tags: ['Utility', 'Record'] },

  // ── Level 21 — Mapped Types ────────────────────────────────────────────
  { q: 'What is T?\n\n```ts\ntype T = { [K in "a" | "b"]: number };\n```', opts: ['{ a: number; b: number }', '{ a: "a"; b: "b" }', 'number', 'never'], a: 0, e: 'The mapped type creates a number-valued property for each key in the union.', tags: ['Mapped types'] },
  { q: 'What is R?\n\n```ts\ntype Optional<T> = { [K in keyof T]?: T[K] };\ntype R = Optional<{ a: number }>;\n```', opts: ['{ a: number }', '{ a?: number }', '{ a: undefined }', 'never'], a: 1, e: 'The ? in the mapped type makes each property optional, like Partial.', tags: ['Mapped types'] },
  { q: 'What is R?\n\n```ts\ntype Stringify<T> = { [K in keyof T]: string };\ntype R = Stringify<{ a: number; b: boolean }>;\n```', opts: ['{ a: number; b: boolean }', '{ a: string; b: string }', 'string', 'never'], a: 1, e: 'The mapped type sets every property’s value type to string.', tags: ['Mapped types'] },
  { q: 'What does this make the properties?\n\n```ts\ntype ReadonlyAll<T> = { readonly [K in keyof T]: T[K] };\n```', opts: ['optional', 'readonly', 'required', 'strings'], a: 1, e: 'The readonly modifier in the mapped type makes every property readonly.', tags: ['Mapped types', 'readonly'] },

  // ── Level 22 — Conditional Types ───────────────────────────────────────
  { q: 'What is R?\n\n```ts\ntype IsString<T> = T extends string ? "yes" : "no";\ntype R = IsString<string>;\n```', opts: ['"yes"', '"no"', 'boolean', 'never'], a: 0, e: 'string extends string is true, so R is the "yes" branch.', tags: ['Conditional types'] },
  { q: 'What is R?\n\n```ts\ntype IsString<T> = T extends string ? "yes" : "no";\ntype R = IsString<number>;\n```', opts: ['"yes"', '"no"', 'boolean', 'never'], a: 1, e: 'number does not extend string, so R is the "no" branch.', tags: ['Conditional types'] },
  { q: 'What is R?\n\n```ts\ntype NonNull<T> = T extends null | undefined ? never : T;\ntype R = NonNull<string | null>;\n```', opts: ['string', 'never', 'null', 'string | null'], a: 0, e: 'The conditional distributes over the union, dropping null and leaving string.', tags: ['Conditional types', 'Distributive'] },
  { q: 'What is R?\n\n```ts\ntype Flatten<T> = T extends Array<infer U> ? U : T;\ntype R = Flatten<number[]>;\n```', opts: ['number[]', 'number', 'Array', 'never'], a: 1, e: 'infer U captures the element type of number[], so R is number.', tags: ['Conditional types', 'infer'] },

  // ── Level 23 — infer ───────────────────────────────────────────────────
  { q: 'What is R?\n\n```ts\ntype ElementType<T> = T extends (infer U)[] ? U : never;\ntype R = ElementType<string[]>;\n```', opts: ['string[]', 'string', 'never', 'U'], a: 1, e: 'infer U binds to the array’s element type, string.', tags: ['infer'] },
  { q: 'What is R?\n\n```ts\ntype ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;\ntype R = ReturnTypeOf<() => number>;\n```', opts: ['number', 'void', 'never', '() => number'], a: 0, e: 'infer R captures the function’s return type, number.', tags: ['infer'] },
  { q: 'What is R?\n\n```ts\ntype Unwrap<T> = T extends Promise<infer U> ? U : T;\ntype R = Unwrap<Promise<string>>;\n```', opts: ['Promise<string>', 'string', 'never', 'U'], a: 1, e: 'infer U extracts the value inside the Promise, string.', tags: ['infer'] },
  { q: 'What is R?\n\n```ts\ntype First<T> = T extends [infer F, ...any[]] ? F : never;\ntype R = First<[1, 2, 3]>;\n```', opts: ['1', '[1, 2, 3]', 'number', 'never'], a: 0, e: 'infer F captures the first tuple element, the literal 1.', tags: ['infer', 'Tuples'] },

  // ── Level 24 — Template Literal Types ──────────────────────────────────
  { q: 'What happens?\n\n```ts\ntype Greeting = `Hello, ${string}`;\nconst g: Greeting = "Hello, World";\n```', opts: ['Type error', 'Compiles', 'Runtime error', 'g is string'], a: 1, e: '"Hello, World" matches the template pattern `Hello, ${string}`.', tags: ['Template literals'] },
  { q: 'What is T?\n\n```ts\ntype T = `on${"Click" | "Hover"}`;\n```', opts: ['"onClick" | "onHover"', '"onClickHover"', 'string', '"on"'], a: 0, e: 'The template distributes over the union, producing "onClick" | "onHover".', tags: ['Template literals'] },
  { q: 'What happens?\n\n```ts\ntype Greeting = `Hi ${string}`;\nconst g: Greeting = "Bye there";\n```', opts: ['Compiles', 'Type error', 'Runtime error', 'g is "Bye there"'], a: 1, e: '"Bye there" does not start with "Hi ", so it fails the template type.', tags: ['Template literals'] },
  { q: 'What is Class?\n\n```ts\ntype Size = "sm" | "lg";\ntype Class = `btn-${Size}`;\n```', opts: ['"btn-sm" | "btn-lg"', '"btn-Size"', 'string', '"btn-"'], a: 0, e: 'The template substitutes each union member, giving "btn-sm" | "btn-lg".', tags: ['Template literals'] },

  // ── Level 25 — Mixed Mastery ───────────────────────────────────────────
  { q: 'What does pluck return?\n\n```ts\nfunction pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {\n  return items.map(i => i[key]);\n}\npluck([{ id: 1 }, { id: 2 }], "id");\n```', opts: ['[1, 2]', 'number', '[{ id: 1 }, { id: 2 }]', 'Error'], a: 0, e: 'It maps each object to its id, returning [1, 2].', tags: ['Generics', 'Mastery'] },
  { q: 'What happens?\n\n```ts\ntype T = Partial<Record<"a" | "b", number>>;\nconst x: T = { a: 1 };\n```', opts: ['Type error', 'Compiles', 'b is required', 'Runtime error'], a: 1, e: 'Record requires a and b, but Partial makes both optional, so { a: 1 } compiles.', tags: ['Utility', 'Mastery'] },
  { q: 'What is T?\n\n```ts\ntype T = ReturnType<() => { a: number }>;\n```', opts: ['{ a: number }', 'number', 'void', 'never'], a: 0, e: 'ReturnType extracts the function’s return type, { a: number }.', tags: ['Utility', 'Mastery'] },
  { q: 'What is T?\n\n```ts\nconst tuple = [1, "two", true] as const;\ntype T = typeof tuple;\n```', opts: ['(number | string | boolean)[]', 'readonly [1, "two", true]', 'any[]', '[1, "two", true]'], a: 1, e: 'as const infers a readonly tuple of the exact literal types.', tags: ['as const', 'Mastery'] },
];

export const roadmapTsQuestions = buildRoadmap('rm-ts', 'typescript', seeds);
