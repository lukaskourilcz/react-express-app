// The TypeScript compiler, loaded inside the worker only when a TypeScript
// task runs, so a JavaScript or React learner never downloads it. The lib
// files are the language's own declarations; the DOM lib is left out on
// purpose (see shared/coding-ts-check.ts for the few globals declared instead).
import ts from 'typescript';
import { createTypeScript, typesPassed, type TypeTestInput } from '../../../../shared/coding-ts-check';

export { typesPassed };

const bundledLibs = {
  ...import.meta.glob('/node_modules/typescript/lib/lib.es*.d.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('/node_modules/typescript/lib/lib.decorators*.d.ts', { eager: true, query: '?raw', import: 'default' }),
} as Record<string, string>;

const libs = Object.fromEntries(Object.entries(bundledLibs).map(([path, text]) => [path.replace(/^.*\//, ''), text]));

const checker = createTypeScript({ ts, libs });

/** What the workbench needs from one pass: the type verdict and the JavaScript
 * to run. Type errors do not block running: seeing what a half-typed attempt
 * returns is how a learner finds out why. */
export const compileTypeScript = (code: string, typeTests: TypeTestInput[] = []) => ({
  check: checker.check(code, typeTests),
  js: checker.toJavaScript(code),
});
