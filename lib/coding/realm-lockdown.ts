/** Freezes the JavaScript built-ins of the realm this runs in.
 *
 * The React grader runs a learner's component in a page realm of its own
 * (lib/coding/react-runner.ts), but the component still reaches objects that
 * belong to the grader's realm: React's exports, jsdom's document, the timers.
 * One step up their prototype chain is the grader's own `Object.prototype`,
 * `Array.prototype` and the rest, which the test runner, the matchers and the
 * code that prints the verdict all use. A component that set
 * `Object.prototype.toJSON` there rewrote the printed verdict; one that set
 * `Object.is` could have made every `toBe` pass.
 *
 * `lockDownRealm` freezes every standard built-in reachable from the global
 * object (constructors, their prototypes, namespaces such as `JSON`, `Math`,
 * `Reflect` and `Intl`, and the iterator, generator and typed-array
 * prototypes that have no global name), and pins the global names to them.
 * The React guest (scripts/react-sandbox-entry.ts) calls it once, in a
 * process that exists to grade one submission, after jsdom, React and Testing
 * Library are loaded and before any learner code runs.
 *
 * Freezing a prototype stops ordinary code from giving one object its own
 * `toString`, `constructor`, `name` or `message` by assignment: an inherited
 * read-only property makes the assignment fail. For those names the frozen
 * prototype carries an accessor instead, as Node's `--frozen-intrinsics`
 * does: reading gives the built-in, and assigning on any other object gives
 * that object its own property. Assigning on the prototype itself fails.
 *
 * Two properties of `Error` stay usable, because React sets them while it
 * reads a component stack: `stackTraceLimit` stays a writable number, and
 * `prepareStackTrace` accepts only `undefined` or Node's own formatter, so
 * nothing can install a formatter of its own. */

const GLOBAL_BUILT_INS = [
  'Object', 'Function', 'Array', 'Number', 'Boolean', 'String', 'Symbol', 'BigInt', 'Date', 'RegExp',
  'Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
  'Promise', 'Proxy', 'Reflect', 'JSON', 'Math', 'Intl', 'Atomics',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'FinalizationRegistry', 'Iterator',
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
  'Float16Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
  'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
  'escape', 'unescape',
] as const;

/** Names ordinary code assigns on objects that inherit them. */
const OBJECT_OVERRIDABLE = ['constructor', 'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'];
const FUNCTION_OVERRIDABLE = ['constructor', 'toString'];
const ARRAY_OVERRIDABLE = ['toString', 'toLocaleString'];
const ERROR_OVERRIDABLE = ['constructor', 'name', 'message', 'toString'];

let locked = false;

export function lockDownRealm(): void {
  if (locked) return;
  const global = globalThis as Record<string, unknown>;
  const { defineProperty, getOwnPropertyDescriptor, getPrototypeOf, freeze, isFrozen, preventExtensions } = Object;
  const { ownKeys } = Reflect;
  const isObject = (value: unknown): value is object =>
    (typeof value === 'object' && value !== null) || typeof value === 'function';

  const roots: unknown[] = GLOBAL_BUILT_INS.map((name) => global[name]);
  // Built-ins with no global name, reached the way the language reaches them.
  const generator = function* () { /* nothing */ };
  const asyncFunction = async function () { /* nothing */ };
  const asyncGenerator = async function* () { /* nothing */ };
  roots.push(
    getPrototypeOf(Int8Array),
    getPrototypeOf([][Symbol.iterator]()),
    getPrototypeOf(''[Symbol.iterator]()),
    getPrototypeOf(new Map()[Symbol.iterator]()),
    getPrototypeOf(new Set()[Symbol.iterator]()),
    getPrototypeOf(/x/[Symbol.matchAll]('')),
    getPrototypeOf(generator),
    getPrototypeOf(generator.prototype),
    getPrototypeOf(asyncFunction),
    getPrototypeOf(asyncGenerator),
    getPrototypeOf(asyncGenerator.prototype),
    getOwnPropertyDescriptor(Function.prototype, 'caller')?.get,
  );
  const iteratorFrom = (global.Iterator as { from?: (value: unknown) => { map?: (fn: (value: unknown) => unknown) => unknown } } | undefined)?.from;
  if (typeof iteratorFrom === 'function') {
    const wrapped = iteratorFrom({ next: () => ({ done: true, value: undefined }) });
    roots.push(getPrototypeOf(wrapped));
    if (typeof wrapped.map === 'function') roots.push(getPrototypeOf(wrapped.map((value) => value)));
  }

  // Everything reachable from those roots through prototypes and own
  // properties (values, getters and setters), read by descriptor so that no
  // getter runs.
  const found = new Set<object>();
  const pending = roots.filter(isObject);
  while (pending.length > 0) {
    const next = pending.pop()!;
    if (found.has(next)) continue;
    found.add(next);
    const prototype = getPrototypeOf(next);
    if (prototype) pending.push(prototype);
    for (const key of ownKeys(next)) {
      const descriptor = getOwnPropertyDescriptor(next, key);
      if (!descriptor) continue;
      for (const part of [descriptor.value, descriptor.get, descriptor.set]) if (isObject(part)) pending.push(part);
    }
  }

  const allowOverride = (target: object, key: string) => {
    const descriptor = getOwnPropertyDescriptor(target, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.writable || !descriptor.configurable) return;
    const value: unknown = descriptor.value;
    const get = function () { return value; };
    const set = function (this: unknown, replacement: unknown) {
      if (this === target) throw new TypeError(`Cannot assign to read only property '${key}' of a built-in`);
      if (!isObject(this)) throw new TypeError(`Cannot create property '${key}' on a primitive`);
      defineProperty(this, key, { value: replacement, writable: true, enumerable: true, configurable: true });
    };
    defineProperty(target, key, { enumerable: descriptor.enumerable, configurable: false, get: freeze(get), set: freeze(set) });
  };
  for (const key of OBJECT_OVERRIDABLE) allowOverride(Object.prototype, key);
  for (const key of FUNCTION_OVERRIDABLE) allowOverride(Function.prototype, key);
  for (const key of ARRAY_OVERRIDABLE) allowOverride(Array.prototype, key);
  for (const ErrorType of [Error, AggregateError, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError]) {
    for (const key of ERROR_OVERRIDABLE) allowOverride(ErrorType.prototype, key);
  }

  // React keeps Node's stack formatter, sets it to undefined while it reads a
  // component stack, then puts it back; nothing else may take its place.
  const nodeFormatter = (Error as { prepareStackTrace?: unknown }).prepareStackTrace;
  let formatter: unknown = nodeFormatter;
  defineProperty(Error, 'prepareStackTrace', {
    enumerable: false,
    configurable: false,
    get: freeze(function () { return formatter; }),
    set: freeze(function (value: unknown) { if (value === undefined || value === nodeFormatter) formatter = value; }),
  });

  for (const one of found) {
    if (one === Error) {
      // Every property but stackTraceLimit, which V8 reads as plain data.
      for (const key of ownKeys(Error)) {
        const descriptor = getOwnPropertyDescriptor(Error, key)!;
        if (key === 'stackTraceLimit') defineProperty(Error, key, { ...descriptor, configurable: false });
        else defineProperty(Error, key, 'value' in descriptor ? { ...descriptor, writable: false, configurable: false } : { ...descriptor, configurable: false });
      }
      preventExtensions(Error);
      continue;
    }
    if (!isFrozen(one)) freeze(one);
  }

  // The global names keep pointing at the frozen built-ins.
  for (const name of GLOBAL_BUILT_INS) {
    const descriptor = getOwnPropertyDescriptor(globalThis, name);
    if (descriptor && 'value' in descriptor && descriptor.configurable) {
      defineProperty(globalThis, name, { value: descriptor.value, writable: false, enumerable: descriptor.enumerable, configurable: false });
    }
  }
  locked = true;
}
