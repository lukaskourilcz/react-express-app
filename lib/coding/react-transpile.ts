import ts from 'typescript';
import { asRunnableModule } from '../../shared/coding-react-support';

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
  }).outputText;
}
