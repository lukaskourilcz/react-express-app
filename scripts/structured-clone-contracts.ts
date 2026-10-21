import assert from 'node:assert/strict';
import { runInSandbox } from '../lib/coding/sandbox';
import { evaluateInRunRealm } from './run-realm-node';

/** Own data keys must not become prototype assignments while cloning. The
 * blank clone supplies the native clone's prototype even across a VM realm. */
export async function checkStructuredCloneOwnKeys(): Promise<void> {
  const calls = [
    `(() => {
      const shared = { n: 1 }, input = Object.create(null);
      Object.defineProperty(input, '__proto__', { value: shared, enumerable: true });
      input.alias = shared;
      const out = structuredClone(input), property = Object.getOwnPropertyDescriptor(out, '__proto__');
      return [Object.hasOwn(out, '__proto__'),
        Object.getPrototypeOf(out) === Object.getPrototypeOf(structuredClone({})),
        out.n === undefined, out.__proto__ === out.alias, out.alias !== shared,
        property?.value === out.alias,
        property?.writable === true && property?.enumerable === true && property?.configurable === true];
    })()`,
    `(() => {
      const input = Object.create(null);
      Object.defineProperty(input, '__proto__', { value: input, enumerable: true });
      const out = structuredClone(input);
      return [Object.hasOwn(out, '__proto__'), out.__proto__ === out,
        Object.getPrototypeOf(out) === Object.getPrototypeOf(structuredClone({}))];
    })()`,
    `(() => {
      const input = [{ n: 1 }];
      Object.defineProperty(input, '__proto__', { value: { marker: true }, enumerable: true });
      const out = structuredClone(input), property = Object.getOwnPropertyDescriptor(out, '__proto__');
      return [Array.isArray(out), out.length === 1, out[0].n === 1, out[0] !== input[0],
        Object.hasOwn(out, '__proto__'), property?.value.marker === true,
        Object.getPrototypeOf(out) === Object.getPrototypeOf(structuredClone([]))];
    })()`,
    `(() => {
      const input = JSON.parse('{"__proto__":{"n":1}}'), kept = Object.defineProperty;
      Object.defineProperty = () => { throw new Error('learner replacement'); };
      try {
        const out = structuredClone(input);
        return [Object.hasOwn(out, '__proto__'), out.__proto__.n === 1, out.n === undefined];
      } finally { Object.defineProperty = kept; }
    })()`,
  ];
  const expectations = [Array(7).fill(true), Array(3).fill(true), Array(7).fill(true), Array(3).fill(true)];
  const [native, submit] = await Promise.all([
    evaluateInRunRealm({ code: '', calls, expectations }),
    runInSandbox({ code: '', calls, expectations }),
  ]);
  assert.deepEqual(native.results.map(result => result.pass), [true, true, true, true],
    `Native Run-realm clone semantics: ${JSON.stringify(native.results)}`);
  assert.deepEqual(submit.results.map(result => result.pass), [true, true, true, true],
    `Submit must preserve own clone keys, descriptors and aliases: ${JSON.stringify(submit.results)}`);
  console.log('PASS integrity: structuredClone preserves own prototype-like keys, descriptors and cycles in Run and Submit');
}
