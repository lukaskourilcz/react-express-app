// Executed only inside a fresh, network-denied microVM. Never import this
// entry point into an API handler: it evaluates learner code.
//
// The input file (its path is the first argument) carries the hidden cases and
// the nonce that marks the real result. It is read and deleted before any
// learner code runs. The result goes back on stdout as the one line that
// starts with the nonce, written with functions captured here, before the
// component exists. react-isolated.ts reads only that line (react-guest.ts);
// it never reads a file from the VM. Node starts with GUEST_NODE_FLAGS, and
// learner code runs in a page realm without `process` or `require`
// (lib/coding/react-runner.ts).
import { readFileSync, unlinkSync } from 'node:fs';
import { guestResultLine, type GuestInput } from '../lib/coding/react-guest';
import { runReactSuite } from '../lib/coding/react-runner';

const inputPath = process.argv[2];
const stdout = process.stdout;
const write = stdout.write.bind(stdout);
const exit = process.exit.bind(process);
const stringify = JSON.stringify;

async function main() {
  const { suite, appSource, nonce } = JSON.parse(readFileSync(inputPath, 'utf8')) as GuestInput;
  unlinkSync(inputPath);
  const result = await runReactSuite({ suite, appSource });
  write(guestResultLine(nonce, stringify(result)), () => exit(0));
}
main().catch(() => exit(1));
