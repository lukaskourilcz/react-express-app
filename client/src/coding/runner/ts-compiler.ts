// The TypeScript compiler, loaded inside the worker only when a TypeScript
// task runs, so a JavaScript or React learner never downloads it. The lib
// files are the language's own declarations; the DOM lib is left out on
// purpose (see shared/coding-ts-check.ts for the few globals declared instead).
import ts from 'typescript';
import { createTypeScript, typesPassed, type TypeCheckResult, type TypeTestInput } from '../../../../shared/coding-ts-check';

export { typesPassed };

const bundledLibs = {
  ...import.meta.glob('/node_modules/typescript/lib/lib.es*.d.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('/node_modules/typescript/lib/lib.decorators*.d.ts', { eager: true, query: '?raw', import: 'default' }),
} as Record<string, string>;

const libs = Object.fromEntries(Object.entries(bundledLibs).map(([path, text]) => [path.replace(/^.*\//, ''), text]));

const checker = createTypeScript({ ts, libs });
// Parse and bind the lib files now, while the caller's clock still counts the
// download: the check budget that follows is for the learner's types only.
checker.check('', []);

/** What the workbench needs from one pass: the type verdict and the JavaScript
 * to run. Type errors do not block running: seeing what a half-typed attempt
 * returns is how a learner finds out why.
 *
 * The compiler throws instead of answering when it runs out of stack, on a
 * type that keeps recursing or code nested thousands deep. The two steps
 * answer separately, as on the server (lib/coding/ts-check-pool.ts): a check
 * that threw is `check: null`, the types stopped the checker; code that could
 * not be turned into JavaScript is `js: null`, with the check kept. */
export function compileTypeScript(code: string, typeTests: TypeTestInput[] = []): { check: TypeCheckResult | null; js: string | null; transpileError: string | null } {
  let check: TypeCheckResult;
  try {
    check = checker.check(code, typeTests);
  } catch {
    return { check: null, js: null, transpileError: null };
  }
  try {
    return { check, js: checker.toJavaScript(code), transpileError: null };
  } catch (error) {
    return { check, js: null, transpileError: String((error as Error)?.message ?? error) };
  }
}
