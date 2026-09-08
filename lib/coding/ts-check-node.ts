/** The TypeScript checker for the server and node tests: the compiler and its
 * lib files come off the disk. vercel.json includes the lib files in the
 * function bundle, since nothing imports them statically. */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { createTypeScript, isCheckerLibFile, type TypeScriptChecker } from '../../shared/coding-ts-check';

let checker: TypeScriptChecker | null = null;

/**
 * Where TypeScript's `lib.*.d.ts` files live.
 *
 * `require.resolve` is the right answer in the CommonJS serverless bundle. It
 * is not available when this module is bundled into an ESM test script, where
 * esbuild replaces `require` with a shim that has no `resolve`, so fall back to
 * walking up from the working directory. Both paths land on the same files;
 * the fallback exists so the content tests can use the real checker rather than
 * building a second one that could drift from it.
 */
function typescriptLibDir(): string {
  const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require ??
    (typeof require !== 'undefined' ? (require as unknown as { resolve?: (id: string) => string }) : undefined);
  if (typeof resolver?.resolve === 'function') {
    try {
      return path.join(path.dirname(resolver.resolve('typescript/package.json')), 'lib');
    } catch {
      // Fall through to the directory walk.
    }
  }
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, 'node_modules', 'typescript', 'lib');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('typescript_lib_not_found');
}

export function nodeTypeScriptChecker(): TypeScriptChecker {
  if (checker) return checker;
  const libDir = typescriptLibDir();
  const libs = Object.fromEntries(
    readdirSync(libDir).filter(isCheckerLibFile).map((name) => [name, readFileSync(path.join(libDir, name), 'utf8')]),
  );
  checker = createTypeScript({ ts, libs });
  return checker;
}
