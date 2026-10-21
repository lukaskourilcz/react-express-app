/** Keep authored instrumentation state in its own lexical scope. Parse only
 * trusted catalogue material; submitted code is neither inspected nor filtered.
 * Calls can use immutable exported helpers, while learners cannot replace them
 * or reach the counters and original function references they close over. */
import ts from 'typescript';

interface PathHarness { before: string; after: string }
const INITIALIZE = '__devsharkInitializePathHarness';
const cached = new Map<string, PathHarness>();

export function protectedPathHarness(harness: string, calls: readonly string[], starter = ''): PathHarness {
  const cacheKey = JSON.stringify([harness, calls, starter]);
  const previous = cached.get(cacheKey);
  if (previous) return previous;
  const file = ts.createSourceFile('authored-harness.js', harness, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declarations = new Set<string>();
  const before: string[] = [];
  const after: string[] = [];
  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) {
      before.push(statement.getText(file));
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) throw new Error('Authored harness exports must be named bindings');
        declarations.add(declaration.name.text);
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      before.push(statement.getText(file));
      declarations.add(statement.name.text);
    } else after.push(statement.getText(file));
  }
  const referenced = new Set<string>();
  for (const call of [...calls, starter]) {
    const callFile = ts.createSourceFile('authored-call.js', call, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) referenced.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(callFile);
  }
  // Non-reserved bindings are APIs the brief intentionally gives the learner,
  // such as newQueueBuffer. Export only the reserved helpers trusted calls use.
  const names = [...declarations].filter(name => !name.startsWith('__') || referenced.has(name)).sort();
  if (declarations.has(INITIALIZE)) throw new Error('Reserved authored harness initialization binding');
  const result = { before: `const { ${[...names, INITIALIZE].join(', ')} } = (() => {
${before.join('\n')}
let __initialized = false;
const ${INITIALIZE} = () => {
  if (__initialized) return;
  __initialized = true;
  ${after.join('\n')}
};
const __exported = { ${[...names, INITIALIZE].join(', ')} };
const __seen = __probe.setPrototypeOf([], null);
const __seal = value => {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  for (let i = 0; i < __seen.length; i++) if (__seen[i] === value) return value;
  __seen[__seen.length] = value;
  if (typeof value === 'object') {
    const keys = __probe.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const descriptor = __probe.ownDescriptor(value, keys[i]);
      if (descriptor && 'value' in descriptor) __seal(descriptor.value);
    }
  }
  return __probe.freeze(value);
};
return __seal(__exported);
})();`, after: `${INITIALIZE}();` };
  cached.set(cacheKey, result);
  return result;
}
