// Executed only inside a fresh, network-denied microVM. Never import this
// entry point into an API handler: it evaluates learner code.
//
// The input file (its path is the first argument) carries the hidden cases and
// the nonce that marks the real result. It is read and deleted before any
// learner code runs. jsdom, React and Testing Library are loaded next, and
// then this realm's JavaScript built-ins are frozen (lib/coding/realm-lockdown.ts),
// because the component reaches them through React and jsdom. The result goes
// back on stdout as the one line that starts with the nonce, serialized by
// hand from its own data properties with functions captured here, before the
// component exists (serializeGuestResult in lib/coding/react-guest.ts).
// react-isolated.ts reads only that line (react-guest.ts); it never reads a
// file from the VM. Node starts with GUEST_NODE_FLAGS, and learner code runs
// in a page realm without `process` or `require` (lib/coding/react-runner.ts).
import { readFileSync, unlinkSync } from 'node:fs';
import { guestResultLine, serializeGuestResult, type GuestInput } from '../lib/coding/react-guest';
import { prepareReactRuntime, runReactSuite } from '../lib/coding/react-runner';
import { lockDownRealm } from '../lib/coding/realm-lockdown';

const inputPath = process.argv[2];
const stdout = process.stdout;
const write = stdout.write.bind(stdout);
const exit = process.exit.bind(process);
const parse = JSON.parse;

async function main() {
  const { suite, appSource, nonce } = parse(readFileSync(inputPath, 'utf8')) as GuestInput;
  unlinkSync(inputPath);
  await prepareReactRuntime();
  lockDownRealm();
  const result = await runReactSuite({ suite, appSource });
  write(guestResultLine(nonce, serializeGuestResult(result)), () => exit(0));
}
main().catch(() => exit(1));
