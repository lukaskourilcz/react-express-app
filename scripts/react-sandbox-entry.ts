// Runs only in a fresh, network-denied microVM. The trusted suite/renderer and
// QuickJS learner engine are separate. Input (including hidden tests and nonce)
// is deleted before learner execution. Captured stdout/exit and the descriptor
// serializer publish one nonce-bound result; learner capabilities expose none
// of them. See docs/react-grading-operations.md. No API imports this entry point.
import { readFileSync, unlinkSync } from 'node:fs';
import { guestResultLine, guestStartedLine, serializeGuestResult, type GuestInput } from '../lib/coding/react-guest';
import { prepareReactRuntime, runReactSuite } from '../lib/coding/react-runner';
import { lockDownRealm } from '../lib/coding/realm-lockdown';

const inputPath = process.argv[2];
const stdout = process.stdout;
const write = stdout.write.bind(stdout);
const exit = process.exit.bind(process);
const parse = JSON.parse;

async function main() {
  const { suite, appSource, nonce, compiledApp, compiledFixtures } = parse(readFileSync(inputPath, 'utf8')) as GuestInput;
  unlinkSync(inputPath);
  await prepareReactRuntime();
  lockDownRealm();
  // Written out before any learner code runs, so a crash cannot lose it.
  await new Promise((resolve) => write(guestStartedLine(nonce), resolve));
  const result = await runReactSuite({ suite, appSource, compiledApp, compiledFixtures });
  write(guestResultLine(nonce, serializeGuestResult(result)), () => exit(0));
}
main().catch(() => exit(1));
