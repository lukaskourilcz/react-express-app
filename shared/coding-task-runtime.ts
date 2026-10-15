/** Restrictions on the original built-ins for a particular authored task.
 * The server derives this from the canonical task, never the submitted code.
 * Run mirrors it in its disposable worker. */
export interface TaskRuntimePolicy {
  forbidNativePromiseAll?: true;
}

export const runtimePolicyForTask = (id: string): TaskRuntimePolicy | undefined =>
  id === 'js-clone-promise-all' ? { forbidNativePromiseAll: true } : undefined;

/** Self-contained so QuickJS and the Run realm install exactly the same rule,
 * before learner initialization can capture the original native function.
 * This removes access to that implementation, rather than banning syntax or
 * a learner's own aggregation algorithm. Each realm serves only one run. */
export const TASK_RUNTIME_POLICY_SOURCE = `(realm, policy) => {
  if (!policy || policy.forbidNativePromiseAll !== true) return;
  const NativeError = realm.Error;
  realm.Object.defineProperty(realm.Promise, 'all', {
    value: function () { throw new NativeError('Promise.all is unavailable in this exercise. Build the aggregation yourself.'); },
    writable: false, configurable: false
  });
}`;

export function installTaskRuntimePolicy(realm: typeof globalThis, policy?: TaskRuntimePolicy): void {
  if (!policy) return;
  (new Function(`return ${TASK_RUNTIME_POLICY_SOURCE};`)() as
    (target: typeof globalThis, rule: TaskRuntimePolicy) => void)(realm, policy);
}
