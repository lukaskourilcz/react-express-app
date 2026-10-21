import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
type Node = { value: number; next: Node | null };
const tail: Node = { value: 3, next: null };
const middle: Node = { value: 2, next: tail };
const head: Node = { value: 1, next: middle };
const inserted: Node = { value: 9, next: middle.next };
middle.next = inserted;
assert.equal(inserted.next, tail);
assert.equal(middle.next, inserted);
let shortened: Node | null = head;
shortened = shortened.next!.next;
assert.equal(shortened, inserted);
// This establishes surviving links, not garbage-collection timing.
const lastValue = (start: Node | null): number => {
  let node = start;
  while (node!.next !== null) node = node!.next;
  return node!.value;
};
assert.throws(() => lastValue(null), TypeError);
assert.equal(lastValue(tail), 3);
assert.equal(lastValue({ value: 2, next: tail }), 3);
// Evaluate the lesson's literal-line-swap warning independently of any learner.
assert.throws(() => Function('node', 'node.next = inserted; const inserted = {value:9,next:node.next};')(head), ReferenceError);
const counts = [0, 1, 2, 8, 32].map(n => {
  let list: Node | null = null;
  for (let i = n - 1; i >= 0; i--) list = { value: i, next: list };
  let visits = 0;
  for (let node = list; node !== null; node = node.next) visits++;
  assert.equal(visits, n);
  let flips = 0, previous: Node | null = null, current = list;
  while (current !== null) {
    const next = current.next;
    current.next = previous;
    previous = current;
    current = next;
    flips++;
  }
  assert.equal(flips, n);
  return { n, absentSearchVisits: visits, reverseLinkWrites: flips };
});
writeFileSync(process.argv[2], JSON.stringify({ counts, lastValue: 'null throws; one/two nodes return tail', lineSwap: 'ReferenceError' }, null, 2), { mode: 0o600 });
console.log('PASS D05 insertion/drop links, null context, exact walk/rewire counts and literal line-swap behavior');
