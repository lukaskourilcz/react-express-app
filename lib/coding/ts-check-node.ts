/** The TypeScript checker for the server and node tests: the compiler and its
 * lib files come off the disk. vercel.json includes the lib files in the
 * function bundle, since nothing imports them statically. */

import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { createTypeScript, isCheckerLibFile, type TypeScriptChecker } from '../../shared/coding-ts-check';

let checker: TypeScriptChecker | null = null;

export function nodeTypeScriptChecker(): TypeScriptChecker {
  if (checker) return checker;
  const libDir = path.join(path.dirname(require.resolve('typescript/package.json')), 'lib');
  const libs = Object.fromEntries(
    readdirSync(libDir).filter(isCheckerLibFile).map((name) => [name, readFileSync(path.join(libDir, name), 'utf8')]),
  );
  checker = createTypeScript({ ts, libs });
  return checker;
}
