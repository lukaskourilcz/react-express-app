/** Type checking and transpiling for the TypeScript track.
 *
 * A TypeScript task is graded twice: the runtime suite says the code does the
 * right thing, and the compiler says the types say the right thing. The
 * compiler and its lib files are injected because the callers load them
 * differently: the browser worker has them inlined by the bundler, the node
 * test and the server read them off disk. Ported from interview-prepper. */

import type * as ts from 'typescript';

type TypeScriptModule = typeof ts;

const ANSWER_FILE = 'answer.ts';
const GLOBALS_FILE = 'globals.d.ts';

// The lib files describe the language, not the host. `console` and the timers
// come from the DOM lib, which is 2.5 MB of browser API for five signatures,
// so they are declared here instead.
const GLOBALS = `declare const console: {
  log(...values: unknown[]): void;
  info(...values: unknown[]): void;
  warn(...values: unknown[]): void;
  error(...values: unknown[]): void;
  debug(...values: unknown[]): void;
};
declare function setTimeout(handler: (...args: never[]) => void, ms?: number): number;
declare function clearTimeout(handle?: number): void;
declare function setInterval(handler: (...args: never[]) => void, ms?: number): number;
declare function clearInterval(handle?: number): void;
declare function queueMicrotask(callback: () => void): void;
declare function structuredClone<T>(value: T): T;
`;

/** The newest lib the checker offers, so a modern method is never a false error. */
export const LIB_FILE = 'lib.es2023.d.ts';
/** Errors past this many are noise. */
export const MAX_REPORTED_ERRORS = 8;

export interface TypeTestInput {
  code: string;
  rejects?: boolean;
}
export interface TypeCheckResult {
  codeErrors: { line: number; message: string }[];
  typeTests: { pass: boolean; error: string | null }[];
}
export interface TypeScriptChecker {
  check(code: string, typeTests?: TypeTestInput[]): TypeCheckResult;
  toJavaScript(code: string): string;
}

export function createTypeScript({ ts: compiler, libs }: { ts: TypeScriptModule; libs: Record<string, string> }): TypeScriptChecker {
  const parsed = new Map<string, ts.SourceFile | undefined>();
  const target = compiler.ScriptTarget.ES2023;

  const libSource = (fileName: string): ts.SourceFile | undefined => {
    const name = fileName.replace(/^.*\//, '');
    if (!parsed.has(name)) {
      const text = libs[name];
      parsed.set(name, text === undefined ? undefined : compiler.createSourceFile(name, text, target, true));
    }
    return parsed.get(name);
  };

  const options: ts.CompilerOptions = {
    target,
    lib: [LIB_FILE],
    module: compiler.ModuleKind.None,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    allowUnreachableCode: true,
    allowUnusedLabels: true,
  };

  const diagnose = (source: string) => {
    const answer = compiler.createSourceFile(ANSWER_FILE, source, target, true);
    const globals = compiler.createSourceFile(GLOBALS_FILE, GLOBALS, target, true);
    const host: ts.CompilerHost = {
      getSourceFile: (name: string) => (name === ANSWER_FILE ? answer : name === GLOBALS_FILE ? globals : libSource(name)),
      writeFile: () => {},
      getDefaultLibFileName: () => LIB_FILE,
      useCaseSensitiveFileNames: () => true,
      getCanonicalFileName: (name: string) => name,
      getCurrentDirectory: () => '/',
      getNewLine: () => '\n',
      fileExists: (name: string) => name === ANSWER_FILE || name === GLOBALS_FILE || Boolean(libSource(name)),
      readFile: (name: string) => host.getSourceFile(name, target)?.text,
      directoryExists: () => true,
      getDirectories: () => [],
    };
    const program = compiler.createProgram([GLOBALS_FILE, ANSWER_FILE], options, host);
    return [...program.getSyntacticDiagnostics(answer), ...program.getSemanticDiagnostics(answer)].map((diagnostic) => ({
      line: diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line
        : 0,
      message: compiler.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    }));
  };

  /** Type-checks `code` with each type test appended as one extra line, so a
   * diagnostic maps back to the assertion that provoked it by line number. */
  const check = (code: string, typeTests: TypeTestInput[] = []): TypeCheckResult => {
    const codeLines = code.split('\n');
    const source = [...codeLines, ...typeTests.map((one) => one.code)].join('\n');
    const diagnostics = diagnose(source);
    const codeErrors = diagnostics
      .filter((one) => one.line < codeLines.length)
      .map((one) => ({ ...one, line: one.line + 1 }))
      .slice(0, MAX_REPORTED_ERRORS);
    const results = typeTests.map((typeTest, index) => {
      const errors = diagnostics.filter((one) => one.line === codeLines.length + index);
      const rejected = errors.length > 0;
      return { pass: Boolean(typeTest.rejects) === rejected, error: rejected ? errors[0].message : null };
    });
    return { codeErrors, typeTests: results };
  };

  const toJavaScript = (code: string): string => compiler.transpileModule(code, {
    compilerOptions: { target, module: compiler.ModuleKind.None, removeComments: false },
    fileName: ANSWER_FILE,
  }).outputText;

  return { check, toJavaScript };
}

/** True when the types are clean: nothing wrong in the code, every assertion met. */
export const typesPassed = (result: TypeCheckResult | null | undefined): boolean =>
  Boolean(result) && result!.codeErrors.length === 0 && result!.typeTests.every((one) => one.pass);

/** The lib file names the checker needs, for callers that read them from disk. */
export const isCheckerLibFile = (name: string): boolean => /^lib\.(es.*|decorators.*)\.d\.ts$/.test(name);
