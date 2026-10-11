/** Conservative, bounded AST inspection; submitted code is never executed here.
 * This reports structural estimates, not a proof or a runtime benchmark. */
import ts from 'typescript';
import { complexityGuidance, type ComplexityReport } from '../../shared/coding-complexity';
import type { CodingTask } from '../../shared/coding-catalog';

const inputNames = (text: string, names: Set<string>) => /\.length\b/.test(text) || [...names].some((name) => new RegExp(`\\b${name}\\b`).test(text));

type Cost = { power: number; log: number };
const constant: Cost = { power: 0, log: 0 };
const linear: Cost = { power: 1, log: 0 };
const max = (a: Cost, b: Cost): Cost => a.power > b.power || (a.power === b.power && a.log >= b.log) ? a : b;
const multiply = (a: Cost, b: Cost): Cost => ({ power: a.power + b.power, log: a.log + b.log });
const label = (cost: Cost): string => {
  const n = cost.power === 0 ? '' : cost.power === 1 ? 'n' : `n^${cost.power}`;
  const log = cost.log === 0 ? '' : cost.log === 1 ? 'log n' : `(log n)^${cost.log}`;
  return `O(${[n, log].filter(Boolean).join(' ') || '1'})`;
};
const rank = (value: string): number | null => ({ 'O(1)': 0, 'O(log n)': 1, 'O(n)': 2, 'O(n log n)': 3, 'O(n^2)': 4, 'O(n²)': 4, 'O(n^3)': 5 }[value] ?? null);
const scanMethods = new Set(['map', 'filter', 'reduce', 'reduceRight', 'forEach', 'some', 'every', 'find', 'findIndex', 'includes', 'indexOf', 'lastIndexOf', 'slice', 'split', 'join', 'reverse', 'toReversed', 'flat', 'flatMap', 'concat', 'replace', 'replaceAll', 'toLowerCase', 'toUpperCase', 'trim', 'substring', 'substr', 'shift', 'unshift', 'splice']);
const callbackMethods = new Set(['map', 'filter', 'reduce', 'reduceRight', 'forEach', 'some', 'every', 'find', 'findIndex', 'flatMap', 'sort', 'toSorted']);
const scalarMethods = new Set(['push', 'pop', 'get', 'set', 'has', 'add', 'delete', 'charAt', 'charCodeAt', 'at', 'test', 'isArray', 'isInteger', 'isFinite', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'log2', 'sqrt']);

export function assessComplexity(task: Pick<CodingTask, 'track' | 'prompt' | 'tests'>, code: string): ComplexityReport {
  const guidance = complexityGuidance(task);
  const assumptions = 'Static estimate, not a proof. Assumes input-sized collections, bounded callbacks, constant-time indexing and average constant-time Map/Set operations. Sort is modelled as n log n; actual engine behaviour can differ. Timing and extra space are not measured.';
  const unknown = (explanation: string): ComplexityReport => ({ time: null, assessment: 'unknown', explanation, assumptions, guidance });
  if (task.track === 'react' || task.track === 'system-design' || !task.tests?.length) return unknown(guidance.note);
  if (code.length > 20_000) return unknown('This submission is too large for the structural estimate.');
  const file = ts.createSourceFile('solution.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if ((file as ts.SourceFile & { parseDiagnostics: unknown[] }).parseDiagnostics.length) return unknown('Fix the syntax before assessing complexity.');
  const functions = new Map<string, ts.FunctionLikeDeclaration>();
  // Name top-level helpers. Unresolved or recursive calls fail closed below.
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) functions.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) functions.set(declaration.name.text, declaration.initializer);
    }
  }
  const entries = new Set<string>();
  for (const test of task.tests) {
    const expression = ts.createSourceFile('test.ts', test.call, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && functions.has(node.expression.text)) entries.add(node.expression.text);
      ts.forEachChild(node, visit);
    };
    visit(expression);
  }
  if (!entries.size) return unknown('The tested entry point cannot be resolved statically. Review this implementation manually.');
  let uncertainty: string | null = null;
  const evidence = new Set<string>();
  let visited = 0;
  const inspectFunction = (fn: ts.FunctionLikeDeclaration, stack: Set<string>): Cost => {
    const parameters = new Set(fn.parameters.flatMap((parameter) => ts.isIdentifier(parameter.name) ? [parameter.name.text] : []));
    const bounds = new Set(parameters);
    const collect = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && /\.length\b/.test(node.initializer.getText(file))) bounds.add(node.name.text);
      ts.forEachChild(node, collect);
    };
    if (fn.body) collect(fn.body);
    // A loop index can bound a nested scan (for j < i).
    if (fn.body) {
      const indices = (node: ts.Node) => {
        if (ts.isForStatement(node) && node.condition && inputNames(node.condition.getText(file), bounds) && node.initializer && ts.isVariableDeclarationList(node.initializer)) {
          for (const declaration of node.initializer.declarations) if (ts.isIdentifier(declaration.name)) bounds.add(declaration.name.text);
        }
        ts.forEachChild(node, indices);
      };
      indices(fn.body);
    }
    const inputBound = (node: ts.Node): boolean => inputNames(node.getText(file), bounds);
    const walk = (node: ts.Node): Cost => {
      visited += 1;
      if (visited > 12_000) { uncertainty = 'The analysis limit was reached. Review the code manually.'; return constant; }
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return constant;
      if (ts.isForInStatement(node)) { uncertainty = 'Object enumeration needs a manual review of the input model.'; return constant; }
      if (ts.isForOfStatement(node)) {
        evidence.add('Input traversal');
        return multiply(linear, walk(node.statement));
      }
      if (ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
        const condition = ts.isForStatement(node) ? node.condition : node.expression;
        if (!condition) { uncertainty = 'An unbounded loop cannot be assessed statically.'; return constant; }
        const increment = ts.isForStatement(node) ? node.incrementor?.getText(file) ?? '' : node.statement.getText(file);
        if (!/\+\+|--|\+=\s*\d+|-=\s*\d+|\/=\s*2|\*=\s*2|>>=\s*1/.test(increment)) {
          uncertainty = 'A loop has no recognised monotonic step. Its iteration count needs manual review.';
        }
        let loop: Cost = constant;
        if (inputBound(condition)) {
          loop = /\/=\s*2|\*=\s*2|>>=\s*1/.test(increment) ? { power: 0, log: 1 } : linear;
          evidence.add(loop.log ? 'Halving or doubling loop' : 'Input-bounded loop');
        } else if (!/^[\w\s<>=!+\-\d.]+$/.test(condition.getText(file)) || !/\b\d+\b/.test(condition.getText(file))) {
          uncertainty = 'A loop bound cannot be related to the input size.';
        }
        return multiply(loop, walk(node.statement));
      }
      if (ts.isNewExpression(node)) {
        if (!ts.isIdentifier(node.expression) || !['Map', 'Set', 'Array', 'Date'].includes(node.expression.text)) uncertainty = 'An external constructor needs manual review.';
        return node.arguments?.length && node.expression.getText(file) !== 'Date' ? linear : constant;
      }
      if (ts.isSpreadElement(node) || ts.isSpreadAssignment(node)) { evidence.add('Copying input data'); return linear; }
      if (ts.isCallExpression(node)) {
        let call: Cost = constant;
        if (ts.isIdentifier(node.expression)) {
          const name = node.expression.text;
          const helper = functions.get(name);
          if (helper) {
            if (stack.has(name)) { uncertainty = 'Recursion needs a recurrence and input-size review; it is not inferred automatically.'; return constant; }
            call = inspectFunction(helper, new Set([...stack, name]));
          } else if (!['Number', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'].includes(name)) uncertainty = 'An indirect or external function call needs manual review.';
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          const method = node.expression.name.text;
          const receiver = node.expression.expression.getText(file);
          if (receiver === 'console') return constant; // Scratch-pad logging is not the solution's algorithm.
          if (method === 'sort' || method === 'toSorted') { call = { power: 1, log: 1 }; evidence.add('Sorting input data'); }
          else if (['toLowerCase', 'toUpperCase', 'trim'].includes(method) && ts.isElementAccessExpression(node.expression.expression)) { call = constant; }
          else if (scanMethods.has(method) || (receiver === 'Object' && ['keys', 'values', 'entries'].includes(method)) || method === 'from') { call = linear; evidence.add('Collection/string scan'); }
          else if (!scalarMethods.has(method)) uncertainty = 'A method with unknown cost needs manual review.';
          // Receiver chains run sequentially. Callback work is repeated per item.
          let callback = constant;
          for (const argument of node.arguments) if ((ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) && argument.body) callback = max(callback, inspectFunction(argument, stack));
          if (callbackMethods.has(method) && node.arguments[0] && !ts.isArrowFunction(node.arguments[0]) && !ts.isFunctionExpression(node.arguments[0])) {
            uncertainty = 'A named or indirect callback needs manual review of its repeated work.';
          }
          call = multiply(call, callback);
          call = max(call, walk(node.expression.expression));
        } else uncertainty = 'A dynamic call needs manual review.';
        for (const argument of node.arguments) if (!ts.isArrowFunction(argument) && !ts.isFunctionExpression(argument)) call = max(call, walk(argument));
        return call;
      }
      let cost = constant;
      ts.forEachChild(node, (child) => { cost = max(cost, walk(child)); });
      return cost;
    };
    return fn.body ? walk(fn.body) : constant;
  };
  let cost = constant;
  for (const name of entries) cost = max(cost, inspectFunction(functions.get(name)!, new Set([name])));
  if (uncertainty) return unknown(uncertainty);
  const time = label(cost);
  const actual = rank(time);
  const target = guidance.targetTime ? rank(guidance.targetTime) : null;
  const assessment = actual !== null && target !== null ? actual <= target ? 'within-target' : 'above-target' : 'estimated';
  return { time, assessment, explanation: [...evidence].join(' · ') || 'No input-growing traversal recognised in the tested function.', assumptions, guidance };
}
