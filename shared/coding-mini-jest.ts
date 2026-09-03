/** A small jest-shaped test runner for React suites. Used by the node content
 * test (jsdom) and by the browser harness page (a real DOM), so a suite passes
 * or fails the same way in both. Matchers cover what the suites use; an
 * unknown matcher throws, so a gap shows up as a failing case, never as a
 * silent pass. */

export interface MiniJestCase {
  name: string;
  status: 'pass' | 'fail';
  error: string | null;
  durationMs: number;
}

export interface MiniJestRun {
  cases: MiniJestCase[];
  passed: number;
  failed: number;
  total: number;
}

type Body = () => unknown | Promise<unknown>;

const show = (value: unknown): string => {
  if (value && typeof value === 'object' && 'nodeType' in (value as object)) {
    const node = value as { tagName?: string; textContent?: string | null };
    return `<${(node.tagName ?? 'node').toLowerCase()}>${(node.textContent ?? '').slice(0, 60)}`;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

const isNode = (value: unknown): value is { textContent: string | null; ownerDocument?: { contains(n: unknown): boolean }; getAttribute?: (n: string) => string | null } =>
  Boolean(value && typeof value === 'object' && 'nodeType' in (value as object));

function buildExpect(actual: unknown, negated: boolean): Record<string, unknown> {
  const check = (condition: boolean, message: string) => {
    if (negated === condition) throw new Error(negated ? `not: ${message}` : message);
  };
  const matchers: Record<string, (...args: unknown[]) => void> = {
    toBe: (expected) => check(Object.is(actual, expected), `expected ${show(actual)} to be ${show(expected)}`),
    toEqual: (expected) => check(show(actual) === show(expected), `expected ${show(actual)} to equal ${show(expected)}`),
    toStrictEqual: (expected) => check(show(actual) === show(expected), `expected ${show(actual)} to equal ${show(expected)}`),
    toBeTruthy: () => check(Boolean(actual), `expected ${show(actual)} to be truthy`),
    toBeFalsy: () => check(!actual, `expected ${show(actual)} to be falsy`),
    toBeNull: () => check(actual === null, `expected ${show(actual)} to be null`),
    toBeUndefined: () => check(actual === undefined, `expected ${show(actual)} to be undefined`),
    toBeDefined: () => check(actual !== undefined, `expected a defined value`),
    toContain: (expected) => check(
      Boolean(actual && typeof (actual as { includes?: unknown }).includes === 'function' && (actual as { includes: (v: unknown) => boolean }).includes(expected)),
      `expected ${show(actual)} to contain ${show(expected)}`,
    ),
    toHaveLength: (expected) => check((actual as { length?: number })?.length === expected, `expected length ${(actual as { length?: number })?.length} to be ${show(expected)}`),
    toHaveTextContent: (expected) => {
      const text = isNode(actual) ? actual.textContent ?? '' : String(actual ?? '');
      const ok = expected instanceof RegExp ? expected.test(text) : text.includes(String(expected));
      check(ok, `expected ${show(text)} to contain ${show(expected)}`);
    },
    toBeGreaterThan: (expected) => check(Number(actual) > Number(expected), `expected ${show(actual)} > ${show(expected)}`),
    toBeGreaterThanOrEqual: (expected) => check(Number(actual) >= Number(expected), `expected ${show(actual)} >= ${show(expected)}`),
    toBeLessThan: (expected) => check(Number(actual) < Number(expected), `expected ${show(actual)} < ${show(expected)}`),
    toBeLessThanOrEqual: (expected) => check(Number(actual) <= Number(expected), `expected ${show(actual)} <= ${show(expected)}`),
    toMatch: (expected) => {
      const text = String(actual);
      check(expected instanceof RegExp ? expected.test(text) : text.includes(String(expected)), `expected ${show(text)} to match ${show(expected)}`);
    },
    toBeInTheDocument: () => check(
      isNode(actual) && Boolean(actual.ownerDocument?.contains(actual)),
      `expected ${show(actual)} to be in the document`,
    ),
    toHaveAttribute: (name, value) => {
      const attr = isNode(actual) && actual.getAttribute ? actual.getAttribute(String(name)) : null;
      check(value === undefined ? attr !== null : attr === String(value), `expected attribute ${show(name)} to be ${show(value ?? 'present')}, was ${show(attr)}`);
    },
    toHaveValue: (expected) => check((actual as { value?: unknown })?.value === expected, `expected value ${show((actual as { value?: unknown })?.value)} to be ${show(expected)}`),
    toBeDisabled: () => check(Boolean((actual as { disabled?: boolean })?.disabled), `expected ${show(actual)} to be disabled`),
    toBeEnabled: () => check(!(actual as { disabled?: boolean })?.disabled, `expected ${show(actual)} to be enabled`),
    toBeChecked: () => check(Boolean((actual as { checked?: boolean })?.checked), `expected ${show(actual)} to be checked`),
    toHaveBeenCalled: () => check(((actual as { calls?: unknown[] })?.calls?.length ?? 0) > 0, 'expected the function to have been called'),
  };
  return new Proxy(matchers, {
    get(target, prop) {
      if (prop === 'not') return buildExpect(actual, !negated);
      if (prop in target) return target[prop as string];
      return () => { throw new Error(`Unsupported matcher: ${String(prop)}`); };
    },
  });
}

export function createMiniJest() {
  const cases: { name: string; body: Body }[] = [];
  const before: Body[] = [];
  const after: Body[] = [];
  let prefix = '';

  const test = (name: string, body: Body) => { cases.push({ name: prefix ? `${prefix} ${name}` : name, body }); };
  const describe = (name: string, body: () => void) => {
    const previous = prefix;
    prefix = prefix ? `${prefix} ${name}` : name;
    try { body(); } finally { prefix = previous; }
  };
  const expect = (actual: unknown) => buildExpect(actual, false);

  const run = async (options: { afterEach?: () => void | Promise<void>; timeoutMs?: number } = {}): Promise<MiniJestRun> => {
    const timeoutMs = options.timeoutMs ?? 5_000;
    const results: MiniJestCase[] = [];
    for (const one of cases) {
      const started = Date.now();
      let error: string | null = null;
      try {
        for (const hook of before) await hook();
        await Promise.race([
          Promise.resolve().then(one.body),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs)),
        ]);
        for (const hook of after) await hook();
      } catch (caught) {
        error = String((caught as { message?: unknown })?.message ?? caught).split('\n')[0];
      }
      try { await options.afterEach?.(); } catch { /* cleanup never fails a case */ }
      results.push({ name: one.name, status: error ? 'fail' : 'pass', error, durationMs: Date.now() - started });
    }
    const passed = results.filter((r) => r.status === 'pass').length;
    return { cases: results, passed, failed: results.length - passed, total: results.length };
  };

  return {
    globals: {
      test, it: test, describe, expect,
      beforeEach: (body: Body) => { before.push(body); },
      afterEach: (body: Body) => { after.push(body); },
    },
    run,
    caseCount: () => cases.length,
  };
}
