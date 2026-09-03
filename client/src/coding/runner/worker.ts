// The coding runner worker. Learner code runs here, off the main thread, so a
// hung loop is terminated by the caller instead of freezing the page. The
// worker is served from its own path with a policy that allows `new Function`
// (see vercel.json); the page itself keeps its strict policy.
import { evaluateCalls } from '../../../../shared/coding-evaluate';
import type { TypeTestInput } from '../../../../shared/coding-ts-check';

export interface RunnerRequest {
  track: 'javascript' | 'typescript';
  code: string;
  calls: string[];
  expectations: unknown[] | null;
  typeTests?: TypeTestInput[];
}

self.onmessage = async (event: MessageEvent<RunnerRequest>) => {
  const request = event.data;
  try {
    if (request.track === 'typescript') {
      self.postMessage({ phase: 'compiling' });
      const { compileTypeScript } = await import('./ts-compiler');
      const compiled = compileTypeScript(request.code, request.typeTests ?? []);
      self.postMessage({ phase: 'running' });
      const run = await evaluateCalls({ code: compiled.js, calls: request.calls, expectations: request.expectations });
      self.postMessage({ phase: 'done', ...run, check: compiled.check });
      return;
    }
    self.postMessage({ phase: 'running' });
    const run = await evaluateCalls({ code: request.code, calls: request.calls, expectations: request.expectations });
    self.postMessage({ phase: 'done', ...run, check: null });
  } catch (error) {
    self.postMessage({ phase: 'done', results: [], logs: [], codeError: String((error as Error)?.message ?? error), check: null });
  }
};
