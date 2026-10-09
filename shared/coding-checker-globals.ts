/** The globals the grader's QuickJS realm has, and what Run hides to match
 * (owner decision, 9 October 2026).
 *
 * Run evaluates learner code in a browser worker, which has some two hundred
 * globals the grader does not: `Intl`, `crypto`, `fetch`, `Temporal`,
 * `WebAssembly` and the rest. Code that used one passed on Run and failed on
 * Submit. The worker now removes every global, and every member of a
 * built-in, that the grader's realm does not have (`hideMissingGlobals`,
 * called by shared/coding-run-realm.ts just before learner code runs). Using
 * one then throws a ReferenceError, which shared/coding-evaluate.ts words as
 * "`Intl` isn't available in the checker. Submit runs without it."
 *
 * The lists below are the grader's realm, read from QuickJS with every
 * prelude installed (lib/coding/sandbox.ts). test:grading-integrity reads
 * them again from a live VM and fails when they drift, so a change to the
 * grader's globals has to update this file too. */

export const CHECKER_GLOBALS: readonly string[] = (
  'AggregateError Array ArrayBuffer BigInt BigInt64Array BigUint64Array Boolean DataView Date Error ' +
  'EvalError FinalizationRegistry Float16Array Float32Array Float64Array Function Infinity Int16Array ' +
  'Int32Array Int8Array InternalError Iterator JSON Map Math NaN Number Object Promise Proxy RangeError ' +
  'ReferenceError Reflect RegExp Set SharedArrayBuffer String Symbol SyntaxError TextDecoder ' +
  'TextEncoder TypeError URIError URL URLSearchParams Uint16Array Uint32Array Uint8Array ' +
  'Uint8ClampedArray WeakMap WeakRef WeakSet atob btoa clearInterval clearTimeout console decodeURI ' +
  'decodeURIComponent encodeURI encodeURIComponent escape eval globalThis isFinite isNaN parseFloat ' +
  'parseInt performance queueMicrotask setInterval setTimeout structuredClone undefined unescape'
).split(' ');

export const CHECKER_MEMBERS: Readonly<Record<string, string>> = {
  'AggregateError': 'length name prototype',
  'AggregateError.prototype': 'constructor message name',
  'Array': 'from isArray length name of prototype',
  'Array.prototype': 'at concat constructor copyWithin entries every fill filter find findIndex findLast findLastIndex flat flatMap forEach includes indexOf join keys lastIndexOf length map pop push reduce reduceRight reverse shift slice some sort splice toLocaleString toReversed toSorted toSpliced toString unshift values with',
  'ArrayBuffer': 'isView length name prototype',
  'ArrayBuffer.prototype': 'byteLength constructor detached maxByteLength resizable resize slice transfer transferToFixedLength',
  'BigInt': 'asIntN asUintN length name prototype',
  'BigInt.prototype': 'constructor toLocaleString toString valueOf',
  'BigInt64Array': 'BYTES_PER_ELEMENT length name prototype',
  'BigInt64Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'BigUint64Array': 'BYTES_PER_ELEMENT length name prototype',
  'BigUint64Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Boolean': 'length name prototype',
  'Boolean.prototype': 'constructor toString valueOf',
  'DataView': 'length name prototype',
  'DataView.prototype': 'buffer byteLength byteOffset constructor getBigInt64 getBigUint64 getFloat16 getFloat32 getFloat64 getInt16 getInt32 getInt8 getUint16 getUint32 getUint8 setBigInt64 setBigUint64 setFloat16 setFloat32 setFloat64 setInt16 setInt32 setInt8 setUint16 setUint32 setUint8',
  'Date': 'UTC length name now parse prototype',
  'Date.prototype': 'constructor getDate getDay getFullYear getHours getMilliseconds getMinutes getMonth getSeconds getTime getTimezoneOffset getUTCDate getUTCDay getUTCFullYear getUTCHours getUTCMilliseconds getUTCMinutes getUTCMonth getUTCSeconds getYear setDate setFullYear setHours setMilliseconds setMinutes setMonth setSeconds setTime setUTCDate setUTCFullYear setUTCHours setUTCMilliseconds setUTCMinutes setUTCMonth setUTCSeconds setYear toDateString toGMTString toISOString toJSON toLocaleDateString toLocaleString toLocaleTimeString toString toTimeString toUTCString valueOf',
  'Error': 'isError length name prototype',
  'Error.prototype': 'constructor message name toString',
  'EvalError': 'length name prototype',
  'EvalError.prototype': 'constructor message name',
  'FinalizationRegistry': 'length name prototype',
  'FinalizationRegistry.prototype': 'constructor register unregister',
  'Float16Array': 'BYTES_PER_ELEMENT length name prototype',
  'Float16Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Float32Array': 'BYTES_PER_ELEMENT length name prototype',
  'Float32Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Float64Array': 'BYTES_PER_ELEMENT length name prototype',
  'Float64Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Function': 'length name prototype',
  'Int16Array': 'BYTES_PER_ELEMENT length name prototype',
  'Int16Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Int32Array': 'BYTES_PER_ELEMENT length name prototype',
  'Int32Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Int8Array': 'BYTES_PER_ELEMENT length name prototype',
  'Int8Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'InternalError': 'length name prototype',
  'InternalError.prototype': 'constructor message name',
  'Iterator': 'concat from length name prototype',
  'Iterator.prototype': 'constructor drop every filter find flatMap forEach map reduce some take toArray',
  'JSON': 'parse stringify',
  'Map': 'groupBy length name prototype',
  'Map.prototype': 'clear constructor delete entries forEach get getOrInsert getOrInsertComputed has keys set size values',
  'Math': 'E LN10 LN2 LOG10E LOG2E PI SQRT1_2 SQRT2 abs acos acosh asin asinh atan atan2 atanh cbrt ceil clz32 cos cosh exp expm1 f16round floor fround hypot imul log log10 log1p log2 max min pow random round sign sin sinh sqrt sumPrecise tan tanh trunc',
  'Number': 'EPSILON MAX_SAFE_INTEGER MAX_VALUE MIN_SAFE_INTEGER MIN_VALUE NEGATIVE_INFINITY NaN POSITIVE_INFINITY isFinite isInteger isNaN isSafeInteger length name parseFloat parseInt prototype',
  'Number.prototype': 'constructor toExponential toFixed toLocaleString toPrecision toString valueOf',
  'Object': 'assign create defineProperties defineProperty entries freeze fromEntries getOwnPropertyDescriptor getOwnPropertyDescriptors getOwnPropertyNames getOwnPropertySymbols getPrototypeOf groupBy hasOwn is isExtensible isFrozen isSealed keys length name preventExtensions prototype seal setPrototypeOf values',
  'Object.prototype': '__defineGetter__ __defineSetter__ __lookupGetter__ __lookupSetter__ __proto__ constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf',
  'Promise': 'all allSettled any length name prototype race reject resolve try withResolvers',
  'Promise.prototype': 'catch constructor finally then',
  'Proxy': 'length name revocable',
  'RangeError': 'length name prototype',
  'RangeError.prototype': 'constructor message name',
  'ReferenceError': 'length name prototype',
  'ReferenceError.prototype': 'constructor message name',
  'Reflect': 'apply construct defineProperty deleteProperty get getOwnPropertyDescriptor getPrototypeOf has isExtensible ownKeys preventExtensions set setPrototypeOf',
  'RegExp': 'escape length name prototype',
  'RegExp.prototype': 'compile constructor dotAll exec flags global hasIndices ignoreCase multiline source sticky test toString unicode unicodeSets',
  'Set': 'groupBy length name prototype',
  'Set.prototype': 'add clear constructor delete difference entries forEach has intersection isDisjointFrom isSubsetOf isSupersetOf keys size symmetricDifference union values',
  'SharedArrayBuffer': 'length name prototype',
  'SharedArrayBuffer.prototype': 'byteLength constructor grow growable maxByteLength slice',
  'String': 'fromCharCode fromCodePoint length name prototype raw',
  'String.prototype': 'anchor at big blink bold charAt charCodeAt codePointAt concat constructor endsWith fixed fontcolor fontsize includes indexOf isWellFormed italics lastIndexOf length link localeCompare match matchAll normalize padEnd padStart repeat replace replaceAll search slice small split startsWith strike sub substr substring sup toLocaleLowerCase toLocaleUpperCase toLowerCase toString toUpperCase toWellFormed trim trimEnd trimLeft trimRight trimStart valueOf',
  'Symbol': 'asyncIterator for hasInstance isConcatSpreadable iterator keyFor length match matchAll name prototype replace search species split toPrimitive toStringTag unscopables',
  'Symbol.prototype': 'constructor description toString valueOf',
  'SyntaxError': 'length name prototype',
  'SyntaxError.prototype': 'constructor message name',
  'TextDecoder': 'length name prototype',
  'TextDecoder.prototype': 'constructor decode encoding fatal ignoreBOM',
  'TextEncoder': 'length name prototype',
  'TextEncoder.prototype': 'constructor encode encodeInto encoding',
  'TypeError': 'length name prototype',
  'TypeError.prototype': 'constructor message name',
  'URIError': 'length name prototype',
  'URIError.prototype': 'constructor message name',
  'URL': 'canParse length name parse prototype',
  'URL.prototype': 'constructor hash host hostname href origin password pathname port protocol search searchParams toJSON toString username',
  'URLSearchParams': 'length name prototype',
  'URLSearchParams.prototype': 'append constructor delete entries forEach get getAll has keys set size sort toString values',
  'Uint16Array': 'BYTES_PER_ELEMENT length name prototype',
  'Uint16Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Uint32Array': 'BYTES_PER_ELEMENT length name prototype',
  'Uint32Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Uint8Array': 'BYTES_PER_ELEMENT length name prototype',
  'Uint8Array.prototype': 'BYTES_PER_ELEMENT constructor',
  'Uint8ClampedArray': 'BYTES_PER_ELEMENT length name prototype',
  'Uint8ClampedArray.prototype': 'BYTES_PER_ELEMENT constructor',
  'WeakMap': 'length name prototype',
  'WeakMap.prototype': 'constructor delete get getOrInsert getOrInsertComputed has set',
  'WeakRef': 'length name prototype',
  'WeakRef.prototype': 'constructor deref',
  'WeakSet': 'length name prototype',
  'WeakSet.prototype': 'add constructor delete has',
  'atob': 'length name prototype',
  'atob.prototype': 'constructor',
  'btoa': 'length name prototype',
  'btoa.prototype': 'constructor',
  'clearInterval': 'length name',
  'clearTimeout': 'length name',
  'decodeURI': 'length name',
  'decodeURIComponent': 'length name',
  'encodeURI': 'length name',
  'encodeURIComponent': 'length name',
  'escape': 'length name',
  'eval': 'length name',
  'isFinite': 'length name',
  'isNaN': 'length name',
  'parseFloat': 'length name',
  'parseInt': 'length name',
  'performance': 'now',
  'queueMicrotask': 'length name',
  'setInterval': 'length name',
  'setTimeout': 'length name',
  'structuredClone': 'length name',
  'unescape': 'length name',
  '%TypedArray%': 'from length name of prototype',
  '%TypedArray%.prototype': 'at buffer byteLength byteOffset constructor copyWithin entries every fill filter find findIndex findLast findLastIndex forEach includes indexOf join keys lastIndexOf length map reduce reduceRight reverse set slice some sort subarray toLocaleString toReversed toSorted toString values with',
};

/** Kept in Run although the grader lacks it: without it V8 stops recording
 * stack traces, which the worker's own error reporting reads. */
const RUN_KEEPS: ReadonlySet<string> = new Set(['Error.stackTraceLimit']);

type Bag = Record<string, unknown>;

const isObject = (value: unknown): value is object => (typeof value === 'object' && value !== null) || typeof value === 'function';

/** The object a CHECKER_MEMBERS key names in this realm. */
function memberOwner(global: Bag, owner: string): object | null {
  const typedArray = Object.getPrototypeOf(global.Uint8Array) as Bag;
  if (owner === '%TypedArray%') return typedArray;
  if (owner === '%TypedArray%.prototype') return isObject(typedArray.prototype) ? typedArray.prototype : null;
  const [name, part] = owner.split('.');
  const value = global[name];
  if (!isObject(value)) return null;
  if (part !== 'prototype') return value;
  const prototype = (value as Bag).prototype;
  return isObject(prototype) ? prototype : null;
}

const remove = (target: object, name: string): boolean => {
  try {
    return Reflect.deleteProperty(target, name) && !Object.prototype.hasOwnProperty.call(target, name);
  } catch {
    return false;
  }
};

/** Removes from a realm that exists only for learner code every member of a
 * built-in, and then every global, that the grader's realm lacks. Returns
 * the global names it removed. */
export function hideMissingGlobals(global: object): ReadonlySet<string> {
  const bag = global as Bag;
  for (const [owner, names] of Object.entries(CHECKER_MEMBERS)) {
    const target = memberOwner(bag, owner);
    if (!target) continue;
    const keep = new Set(names.split(' '));
    for (const name of Object.getOwnPropertyNames(target)) {
      if (!keep.has(name) && !RUN_KEEPS.has(`${owner}.${name}`)) remove(target, name);
    }
  }
  const allowed = new Set(CHECKER_GLOBALS);
  const hidden = new Set<string>();
  // The worker's globals live on its global object and up its prototype
  // chain (DedicatedWorkerGlobalScope, WorkerGlobalScope, EventTarget).
  for (let scope: object | null = global; scope && scope !== Object.prototype; scope = Object.getPrototypeOf(scope) as object | null) {
    for (const name of Object.getOwnPropertyNames(scope)) {
      if (!allowed.has(name) && remove(scope, name)) hidden.add(name);
    }
  }
  return hidden;
}
