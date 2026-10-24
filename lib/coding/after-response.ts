/** Work an answer does not wait for: cleanup, or follow-up whose result
 * nothing reads (#587).
 *
 * Vercel's Node.js runtime keeps a function alive after its response for
 * every promise handed to the request context's `waitUntil`, the hook
 * `@vercel/functions` wraps; the same context is what the bundled Sandbox SDK
 * reads for its OIDC token. Read here directly, no dependency is added. Where
 * the runtime offers it, the work is handed over and the caller goes on at
 * once; anywhere else (tests, local runs, a runtime without the hook) the
 * returned promise settles with the work, so the caller waits as it did
 * before and nothing is cut off.
 *
 * The work keeps its own deadline, and its failure is the caller's to log:
 * what is handed over is settled, never a rejection. */

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context');

type RequestContext = { waitUntil?: (promise: Promise<unknown>) => void };

function requestContext(): RequestContext | undefined {
  try {
    const holder = (globalThis as unknown as Record<symbol, { get?: () => RequestContext | undefined } | undefined>)[REQUEST_CONTEXT];
    return holder?.get?.();
  } catch {
    return undefined;
  }
}

/** Resolves at once when the runtime took `work` over, or once `work`
 * settled when it could not. Never rejects. */
export function afterResponse(work: Promise<unknown>): Promise<void> {
  const settled = work.then(() => undefined, () => undefined);
  const context = requestContext();
  if (typeof context?.waitUntil === 'function') {
    try {
      context.waitUntil(settled);
      return Promise.resolve();
    } catch {
      // The hook refused it: wait here, as without one.
    }
  }
  return settled;
}
