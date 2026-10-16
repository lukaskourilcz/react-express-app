/** Restrictions on the original built-ins for a particular authored task.
 * The server derives this from the canonical task, never the submitted code.
 * Run mirrors it in its disposable worker. */
export interface TaskRuntimePolicy {
  forbidNativePromiseAll?: true;
  forbidNativeArrayFlatten?: true;
  forbidNativeCloneHelpers?: true;
  forbidNativeDynamicCompilation?: true;
}

export const runtimePolicyForTask = (id: string): TaskRuntimePolicy | undefined =>
  id === 'js-clone-promise-all' ? { forbidNativePromiseAll: true }
    : id === 'alg-deep-flatten' ? { forbidNativeArrayFlatten: true }
    : id === 'alg-deep-clone' ? { forbidNativeCloneHelpers: true }
    : /^js-evolving-calculator-(?:[3-5]|[45]-start)$/.test(id) ? { forbidNativeDynamicCompilation: true } : undefined;

/** Self-contained so QuickJS and the Run realm install exactly the same rule,
 * before learner initialization can capture the original native function.
 * This removes access to that implementation, rather than banning syntax or
 * a learner's own aggregation algorithm. Each realm serves only one run. */
export const TASK_RUNTIME_POLICY_SOURCE = `(realm, policy) => {
  if (!policy) return;
  const NativeError = realm.Error;
  if (policy.forbidNativePromiseAll === true) {
    realm.Object.defineProperty(realm.Promise, 'all', {
      value: function () { throw new NativeError('Promise.all is unavailable in this exercise. Build the aggregation yourself.'); },
      writable: false, configurable: false
    });
  }
  if (policy.forbidNativeArrayFlatten === true) {
    for (const name of ['flat', 'flatMap']) {
      realm.Object.defineProperty(realm.Array.prototype, name, {
        value: function () { throw new NativeError('Array.prototype.' + name + ' is unavailable in this exercise. Walk the nested arrays yourself.'); },
        writable: false, configurable: false
      });
    }
  }
  if (policy.forbidNativeCloneHelpers === true) {
    for (const [target, name, label] of [[realm.JSON, 'parse', 'JSON.parse'], [realm, 'structuredClone', 'structuredClone']]) {
      realm.Object.defineProperty(target, name, {
        value: function () { throw new NativeError(label + ' is unavailable in this exercise. Copy the containers yourself.'); },
        writable: false, configurable: false
      });
    }
  }
  if (policy.forbidNativeDynamicCompilation === true) {
    // Resolve every constructor in the target realm before replacing access.
    // The policy installer can itself be called from a different realm.
    const constructors = realm.Function('return [Function, Object.getPrototypeOf(async function(){}).constructor, Object.getPrototypeOf(function*(){}).constructor, Object.getPrototypeOf(async function*(){}).constructor];')();
    // Build wrappers inside the target realm as well: a host-realm function
    // would otherwise expose that host's Function through its prototype.
    const makeBlocked = realm.Function('NativeError', 'return function(){throw new NativeError("Native eval and Function compilation are unavailable in this exercise. Parse the expression yourself.");};');
    const constantGetter = realm.Function('value', 'return function(){return value;};');
    const blocked = constructors.map(ctor => {
      const replacement = makeBlocked(NativeError);
      realm.Object.defineProperty(replacement, 'prototype', { value: ctor.prototype, writable: false });
      realm.Object.defineProperty(replacement, 'name', { value: ctor.name });
      realm.Object.defineProperty(replacement, 'length', { value: ctor.length });
      return replacement;
    });
    for (let i = 0; i < constructors.length; i++) {
      realm.Object.defineProperty(constructors[i].prototype, 'constructor', {
        value: blocked[i], writable: false, configurable: false
      });
    }
    // Accessors also prevent the QuickJS global-binding path from replacing
    // a nonwritable data value through a value-only defineProperty call.
    realm.Object.defineProperty(realm, 'Function', {
      get: constantGetter(blocked[0]), configurable: false
    });
    realm.Object.defineProperty(realm, 'eval', {
      get: constantGetter(makeBlocked(NativeError)), configurable: false
    });
  }

}`;

export function installTaskRuntimePolicy(realm: typeof globalThis, policy?: TaskRuntimePolicy): void {
  if (!policy) return;
  (new Function(`return ${TASK_RUNTIME_POLICY_SOURCE};`)() as
    (target: typeof globalThis, rule: TaskRuntimePolicy) => void)(realm, policy);
}
