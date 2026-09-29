import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
// Vercel's CommonJS function runtime may disable require(ESM). Bundle the SDK
// and its ESM dependencies at build time instead of relying on that Node flag.
const { Sandbox } = createRequire(join(process.cwd(), 'package.json'))(
  './lib/coding/generated/vercel-sandbox.cjs',
) as typeof import('@vercel/sandbox');
import type { ReactSuiteOutcome } from './react-runner';
import { GUEST_NODE_FLAGS, readGuestResult, type GuestInput } from './react-guest';

// Keep operational diagnostics useful without logging learner code, SDK request
// bodies, credentials, or arbitrary error messages.
function runnerFailure(phase: string, cause?: unknown): Error {
  const error = new Error('React grading infrastructure is unavailable', { cause });
  const code = (cause as { code?: unknown } | undefined)?.code;
  const status = (cause as { response?: { status?: unknown } } | undefined)?.response?.status;
  const detail = code === 'ENOENT' ? 'MissingFile' :
    typeof status === 'number' && status >= 400 && status <= 599 ? `Http${status}` : '';
  error.name = `ReactRunner${phase}${detail}`;
  return error;
}

const deadline = (): ReactSuiteOutcome => ({
  cases: [],
  passed: 0,
  failed: 1,
  total: 1,
  compileError: null,
  timedOut: true,
});

/** No code, environment secrets, or writable state are shared between runs.
 * Authentication stays in this API process; only source + fixtures enter the
 * VM. No in-process fallback is allowed when infrastructure is unavailable.
 * A fresh nonce per run goes in with the input; the guest deletes the input
 * before learner code runs and marks its result with the nonce.
 */
export async function runIsolatedReactSuite(input: {
  suite: string;
  appSource: string;
}): Promise<ReactSuiteOutcome> {
  const snapshotId = process.env.REACT_RUNNER_SNAPSHOT_ID;
  if (!snapshotId) throw runnerFailure('Configuration');
  const runner = await readFile(
    join(process.cwd(), 'lib/coding/generated/react-sandbox.cjs'),
  ).catch((error) => { throw runnerFailure('Artifact', error); });
  const signal = AbortSignal.timeout(22_000);
  const nonce = randomBytes(24).toString('hex');
  const credentials =
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_TEAM_ID &&
    process.env.VERCEL_PROJECT_ID
      ? {
          token: process.env.VERCEL_TOKEN,
          teamId: process.env.VERCEL_TEAM_ID,
          projectId: process.env.VERCEL_PROJECT_ID,
        }
      : {};
  const sandbox = await Sandbox.create({
    ...credentials,
    source: { type: 'snapshot', snapshotId },
    persistent: false,
    networkPolicy: 'deny-all',
    timeout: 25_000,
    resources: { vcpus: 1 },
    signal,
  }).catch((error) => { throw runnerFailure('Startup', error); });
  try {
    await sandbox.writeFiles(
      [
        { path: '/vercel/sandbox/runner.cjs', content: runner },
        {
          path: '/vercel/sandbox/input.json',
          content: Buffer.from(JSON.stringify({ ...input, nonce } satisfies GuestInput)),
        },
      ],
      { signal },
    );
    const command = await sandbox.runCommand({
      cmd: 'node',
      args: [...GUEST_NODE_FLAGS, '/vercel/sandbox/runner.cjs', '/vercel/sandbox/input.json'],
      env: { NODE_ENV: 'development' },
      timeoutMs: 10_000,
      signal,
    });
    if (command.exitCode === 137 || command.exitCode === 124) return deadline();
    if (command.exitCode !== 0)
      throw new Error('Isolated React runner exited unsuccessfully');
    // The verdict is the stdout line marked with this run's nonce
    // (react-guest.ts). Nothing is read from the VM's filesystem.
    return readGuestResult(await command.stdout({ signal }), nonce, input.suite);
  } catch (error) {
    if (signal.aborted) return deadline();
    throw runnerFailure('Execution', error);
  } finally {
    // A bounded cleanup call plus the VM's expiry covers lost connections too.
    await sandbox
      .stop({ signal: AbortSignal.timeout(2_000) })
      .catch(() => undefined);
  }
}
