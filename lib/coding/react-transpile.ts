import ts from 'typescript';
import { asRunnableModule } from '../../shared/coding-react-support';

/** TypeScript's ES2015 object-spread lowering uses Object.assign, whose Set
 * semantics cannot shadow frozen inherited properties such as constructor.
 * Replace only synthesized calls, never an authored Object.assign call. Keep
 * async lowering at ES2015 so every continuation uses the controlled Promise. */
const preserveSpreadData: ts.TransformerFactory<ts.SourceFile> = context => source => {
  const names = new Set<string>();
  const collect = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, collect);
  };
  collect(source);
  let name = '__sharkSpreadData';
  while (names.has(name)) name += '_';
  let used = false;
  const visit: ts.Visitor = node => {
    if (ts.isCallExpression(node) && node.pos < 0 &&
        ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'assign' &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Object') {
      used = true;
      return context.factory.updateCallExpression(node, context.factory.createIdentifier(name), undefined,
        node.arguments.map(argument => ts.visitNode(argument, visit) as ts.Expression));
    }
    return ts.visitEachChild(node, visit, context);
  };
  const result = ts.visitEachChild(source, visit, context);
  if (used) ts.addEmitHelper(result, {
    name: 'devshark:spread-data', scoped: false,
    text: `var ${name} = function (target) {
      for (var index = 1; index < arguments.length; index++) {
        if (arguments[index] == null) continue;
        var object = Object(arguments[index]);
        for (var key of Reflect.ownKeys(object)) {
          var descriptor = Object.getOwnPropertyDescriptor(object, key);
          if (descriptor && descriptor.enumerable) Object.defineProperty(target, key, {
            value: object[key], writable: true, enumerable: true, configurable: true
          });
        }
      }
      return target;
    };`,
  });
  return result;
};

/** Syntax conversion only: this process never evaluates the learner module.
 * Downlevel async functions use the engine's controlled Promise constructor. */
export function compileReactLearner(source: string, app = true): string {
  return ts.transpileModule(app ? asRunnableModule(source) : source, {
    fileName: 'App.tsx',
    compilerOptions: {
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      moduleDetection: ts.ModuleDetectionKind.Force,
    },
    transformers: { after: [preserveSpreadData] },
  }).outputText;
}
