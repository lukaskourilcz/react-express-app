// Probe and fixture code for the DSA Foundations checks (#493).
//
// The DSA path graded its exercises through a harness appended after the
// learner's code (`protectedPathHarness`, lib/learning-paths/grade.ts). The
// coding grader has no such slot: every check is one call expression,
// compiled as a closure in the same scope as the learner's code. So each
// counter here is a builder that returns a self-contained expression, and the
// helpers live inside that expression, where learner code cannot reach them.
//
// The integrity rule: what counts, measures or decides a verdict (reads,
// writes, buffer operations, calls, comparisons, visits, identity and
// unchanged-input checks) uses only `__probe` (the built-ins both runners
// capture before learner code runs, shared/coding-evaluate.ts), literals,
// closure locals and indexed loops. A learner who replaces a global then
// cannot turn a failing check into a passing one. Input builders may use
// ordinary built-ins: tampering with them can only make the learner's own
// checks fail.
//
// Task-side and answer-free: the task bodies and the hidden checks under
// `../solutions` both import it. Each count is a bounded contract about these
// inputs, never a proof about arbitrary code.

/** `{ result, reads }`: what `run(view)` returned, and how many indexed reads
 * it made on `values` through the proxy `view`. */
const COUNT_READS = `((values, run) => { let reads = 0; const view = new __probe.Proxy(values, { get(target, key) { if (__probe.isIndex(key)) reads += 1; return target[key]; } }); const result = run(view); return { result, reads }; })`;
export const countReads = (values: string, run: string): string =>
  `${COUNT_READS}(${values}, ${run})`;

/** `{ result, writes, same, values }`: what `run(view)` returned, how many
 * indexed assignments, definitions and deletions it made on `values`, whether
 * it returned `view` itself, and the array's entries afterwards. */
const COUNT_WRITES = `((values, run) => { let writes = 0; const counted = key => { if (__probe.isIndex(key)) writes += 1; }; const view = new __probe.Proxy(values, { set(target, key, value) { counted(key); target[key] = value; return true; }, defineProperty(target, key, descriptor) { counted(key); __probe.defineProperty(target, key, descriptor); return true; }, deleteProperty(target, key) { counted(key); return __probe.deleteProperty(target, key); } }); const result = run(view); const after = []; for (let i = 0; i < values.length; i += 1) after[i] = values[i]; return { result, writes, same: result === view, values: after }; })`;
export const countWrites = (values: string, run: string): string =>
  `${COUNT_WRITES}(${values}, ${run})`;

/** `{ out, size, ops, buffers }`: `createQueue(newBuffer)` filled with 0 to
 * n - 1 and drained. `newBuffer` hands out a counted buffer: a proxy over an
 * array with `push`, `length` and index access only. Indexed reads,
 * assignments, definitions and deletions count one each, and so does a push;
 * `shift` and `splice` are absent, so a slide shows in the count. */
const MEASURE_QUEUE = `((n) => { let ops = 0; let buffers = 0; const counted = key => { if (__probe.isIndex(key)) ops += 1; }; const newBuffer = () => { buffers += 1; return new __probe.Proxy([], { get(target, key) { if (__probe.isIndex(key)) { ops += 1; return target[key]; } if (key === 'length') return target.length; if (key === 'push') return value => { ops += 1; target[target.length] = value; return target.length; }; return undefined; }, set(target, key, value) { counted(key); target[key] = value; return true; }, defineProperty(target, key, descriptor) { counted(key); __probe.defineProperty(target, key, descriptor); return true; }, deleteProperty(target, key) { counted(key); return __probe.deleteProperty(target, key); } }); }; const queue = createQueue(newBuffer); for (let i = 0; i < n; i += 1) queue.enqueue(i); const out = []; for (let i = 0; i < n; i += 1) out[i] = queue.dequeue(); return { out, size: queue.size(), ops, buffers }; })`;
export const measureQueue = (n: number): string =>
  `${MEASURE_QUEUE}(${n})`;

/** Linked lists of `{ value, next }` nodes: `list(1, 2, 3)` builds one, and
 * `valuesOf(head)` and `nodesOf(head)` read one back. Both walks stop after
 * 256 nodes, so a list with a cycle fails a check instead of the deadline. */
const LIST = 'const list = (...values) => { let head = null; for (let i = values.length - 1; i >= 0; i -= 1) head = { value: values[i], next: head }; return head; }; const valuesOf = head => { const out = []; for (let node = head; node && out.length < 256; node = node.next) out[out.length] = node.value; return out; };';

/** Snapshots of a list's nodes, values and links, and whether they are as
 * they were: same value (NaN and the sign of zero included), two own keys,
 * and with `linksToo` the same `next`. `reusesNodes(values, run)` says
 * whether `run(head)` returned the very nodes it was given, in reverse. */
const LIST_CHECKS = 'const nodesOf = head => { const out = []; for (let node = head; node && out.length < 256; node = node.next) out[out.length] = node; return out; }; const sameStored = (left, right) => (left === right ? left !== 0 || 1 / left === 1 / right : left !== left && right !== right); const snapshot = head => { const nodes = nodesOf(head); const values = []; const links = []; for (let i = 0; i < nodes.length; i += 1) { values[i] = nodes[i].value; links[i] = nodes[i].next; } return { nodes, values, links }; }; const unchanged = (snap, linksToo) => { for (let i = 0; i < snap.nodes.length; i += 1) { const node = snap.nodes[i]; if (!sameStored(node.value, snap.values[i]) || __probe.keys(node).length !== 2) return false; if (linksToo && node.next !== snap.links[i]) return false; } return true; }; const reusesNodes = (values, run) => { const head = list(...values); const before = nodesOf(head); const after = nodesOf(run(head)); if (after.length !== before.length) return false; if (after.length > 0 && after[after.length - 1].next !== null) return false; for (let i = 0; i < after.length; i += 1) if (after[i] !== before[before.length - 1 - i]) return false; return true; };';

/** A call that builds and reads linked lists. `body` ends in a `return`. */
export const withLinkedList = (body: string): string => `(() => { ${LIST} ${body} })()`;
/** The same, with the snapshot and node-identity checks as well. */
export const withListChecks = (body: string): string => `(() => { ${LIST} ${LIST_CHECKS} ${body} })()`;

/** How many calls `run` made through the learner's `name` binding: the
 * binding is swapped for a counting wrapper while `run` runs, then restored.
 * -1 when the binding cannot be replaced, which is what a `const` gives.
 * `fixtures` are declared first, for `run` to use. */
export const countCalls = (name: string, run: string, fixtures = ''): string =>
  `(() => { ${fixtures} const original = ${name}; let calls = 0; try { ${name} = function (input) { calls += 1; return original(input); }; } catch (error) { return -1; } try { ${run}; } finally { ${name} = original; } return calls; })()`;

/** A call with the linked-list builders, for the recursion checks. */
export const LIST_FIXTURES = LIST;

/** `{ result, compares }`: what `run(values, counted)` returned, and how many
 * times it called `counted`, which compares with `compare`. */
const COUNT_COMPARES = `((values, run, compare) => { let compares = 0; const counted = (a, b) => { compares += 1; return compare(a, b); }; const result = run(values, counted); return { result, compares }; })`;
export const countCompares = (values: string, run: string, compare = '(a, b) => a - b'): string =>
  `${COUNT_COMPARES}(${values}, ${run}, ${compare})`;

/** `[1, 2, …, n]` and `[n, …, 2, 1]` as literals. */
export const ascending = (n: number): string => `[${Array.from({ length: n }, (_, i) => i + 1).join(', ')}]`;
export const descending = (n: number): string => `[${Array.from({ length: n }, (_, i) => n - i).join(', ')}]`;

/** Records with repeated keys, the comparator on their key, and the tags read
 * back in order: sorting them shows whether equal keys kept their order. */
const TAGGED = "const byKey = (a, b) => a.key - b.key; const tagged = () => [{ key: 2, tag: 'a' }, { key: 1, tag: 'b' }, { key: 2, tag: 'c' }, { key: 1, tag: 'd' }, { key: 2, tag: 'e' }, { key: 1, tag: 'f' }]; const tagsOf = items => { let out = ''; for (let i = 0; i < items.length; i += 1) out += items[i].tag; return out; };";
export const withTagged = (body: string): string => `(() => { ${TAGGED} ${body} })()`;

/** Binary trees of `{ value, left, right }` nodes. `tree(levels)` builds one
 * from a level-order array in which every slot counts (children of i at 2i + 1
 * and 2i + 2, `null` for a missing node), `chain(values, side)` builds a
 * one-sided chain, and `leaf(value)` one node. */
const TREE = "const leaf = value => ({ value, left: null, right: null }); const tree = levels => { const nodes = []; for (let i = 0; i < levels.length; i += 1) nodes[i] = levels[i] === null ? null : leaf(levels[i]); for (let i = 0; i < nodes.length; i += 1) { if (!nodes[i]) continue; nodes[i].left = nodes[2 * i + 1] || null; nodes[i].right = nodes[2 * i + 2] || null; } return nodes.length === 0 ? null : nodes[0]; }; const chain = (values, side) => { let head = null; for (let i = values.length - 1; i >= 0; i -= 1) { const node = leaf(values[i]); node[side] = head; head = node; } return head; };";

/** Reference walks of a tree, and a snapshot of every node's own enumerable
 * fields with their descriptors, to prove a call left the tree as it was.
 * The walks stop after 512 nodes. */
const TREE_CHECKS = "const preorderOf = root => { const out = []; const walk = node => { if (!node || out.length > 512) return; out[out.length] = node.value; walk(node.left); walk(node.right); }; walk(root); return out; }; const inorderOf = root => { const out = []; const walk = node => { if (!node || out.length > 512) return; walk(node.left); out[out.length] = node.value; walk(node.right); }; walk(root); return out; }; const nodesOfTree = root => { const out = []; const stack = root ? [root] : []; while (stack.length > 0 && out.length < 512) { const node = stack[stack.length - 1]; stack.length -= 1; out[out.length] = node; if (node.left) stack[stack.length] = node.left; if (node.right) stack[stack.length] = node.right; } return out; }; const fieldsOf = nodes => { const out = []; for (let i = 0; i < nodes.length; i += 1) { const keys = __probe.keys(nodes[i]); const fields = []; for (let k = 0; k < keys.length; k += 1) fields[k] = { key: keys[k], descriptor: __probe.ownDescriptor(nodes[i], keys[k]) }; out[i] = fields; } return out; }; const sameField = (a, b) => (a === b ? a !== 0 || 1 / a === 1 / b : a !== a && b !== b); const unchangedSince = (nodes, before) => { for (let i = 0; i < nodes.length; i += 1) { const keys = __probe.keys(nodes[i]); if (keys.length !== before[i].length) return false; for (let k = 0; k < keys.length; k += 1) { const old = before[i][k]; const now = __probe.ownDescriptor(nodes[i], old.key); if (keys[k] !== old.key || !now || !sameField(now.value, old.descriptor.value) || now.get !== old.descriptor.get || now.set !== old.descriptor.set || now.writable !== old.descriptor.writable || now.enumerable !== old.descriptor.enumerable || now.configurable !== old.descriptor.configurable) return false; } } return true; }; const freezeTree = node => { if (!node) return node; freezeTree(node.left); freezeTree(node.right); return __probe.freeze(node); };";

/** A call that builds trees. `body` ends in a `return`. */
export const withTree = (body: string): string => `(() => { ${TREE} ${body} })()`;
/** The same, with the reference walks and the unchanged-tree snapshot. */
export const withTreeChecks = (body: string): string => `(() => { ${TREE} ${TREE_CHECKS} ${body} })()`;

/** `{ value, visits }`: `run(root, target)` over a copy of the tree made of
 * counted nodes. A node counts once, the first time its `value`, `left` or
 * `right` is read, and counting stops before the returned node is read. */
const SEARCH_VISITS = `((levels, target, run) => { ${TREE} let visits = 0; let counting = true; const wrap = node => { if (!node) return null; let seen = false; const inner = { value: node.value, left: null, right: null }; const counted = new __probe.Proxy(inner, { get(holder, key) { if (counting && !seen && (key === 'value' || key === 'left' || key === 'right')) { seen = true; visits += 1; } return holder[key]; } }); inner.left = wrap(node.left); inner.right = wrap(node.right); return counted; }; const found = run(wrap(tree(levels)), target); counting = false; return { value: found ? found.value : null, visits }; })`;
export const searchVisits = (levels: string, target: string, run: string): string =>
  `${SEARCH_VISITS}(${levels}, ${target}, ${run})`;

/** Sixty-four `{ id, name }` records with ids 100, 104, … 352 and names
 * `rec-00` to `rec-63`. */
const RECORDS = "const records64 = () => { const out = []; for (let i = 0; i < 64; i += 1) out[i] = { id: 100 + i * 4, name: 'rec-' + (i < 10 ? '0' + i : String(i)) }; return out; };";

/** How many indexed reads `buildIndex` makes on `records` while it builds. */
const BUILD_READS = `((records) => { let reads = 0; const view = new __probe.Proxy(records, { get(target, key) { if (__probe.isIndex(key)) reads += 1; return target[key]; } }); buildIndex(view); return reads; })`;
export const buildReads = (records: string): string =>
  `${BUILD_READS}(${records})`;

/** `{ names, reads, most }`: the name each `lookup(id)` found (or null), the
 * indexed reads all the lookups made, counted after the build, and the most
 * any single lookup made. */
const LOOKUP_READS = `((records, ids) => { let reads = 0; let most = 0; let counting = false; const view = new __probe.Proxy(records, { get(target, key) { if (counting && __probe.isIndex(key)) reads += 1; return target[key]; } }); const index = buildIndex(view); counting = true; const names = []; for (let i = 0; i < ids.length; i += 1) { const before = reads; const found = index.lookup(ids[i]); if (reads - before > most) most = reads - before; names[i] = found ? found.name : null; } counting = false; return { names, reads, most }; })`;
export const lookupReads = (records: string, ids: string): string =>
  `${LOOKUP_READS}(${records}, ${ids})`;

/** A call with the 64-record fixture. `body` ends in a `return`. */
export const withRecords = (body: string): string => `(() => { ${RECORDS} ${body} })()`;
export const RECORDS_64 = `(() => { ${RECORDS} return records64(); })()`;

/** Fifty values drawn from seven, and forty queries drawn from ten. */
export const POOL_50 = "(() => { const out = []; for (let i = 0; i < 50; i += 1) out[i] = 'v' + (i % 7); return out; })()";
export const QUERIES_40 = "(() => { const out = []; for (let i = 0; i < 40; i += 1) out[i] = 'v' + (i % 10); return out; })()";

/* ──── What the Results row shows ──────────────────────────────────────
 * A built check carries its fixtures and probe source inline, up to 2,600
 * characters, and the workbench prints a visible check's call in its Results
 * row. `shownCall` turns a built call back into the short expression it was
 * written as: each probe reads as its builder's name (`countReads([1, 2, 3],
 * view => sumOfEvens(view)).reads <= 3`), each fixture prelude is dropped,
 * and a wrapper whose body is a single `return` shows only the returned
 * expression. Display only: the grader and the Run button execute `call`. */
const CALL_NAMES: readonly (readonly [string, string])[] = [
  [COUNT_READS, 'countReads'],
  [COUNT_WRITES, 'countWrites'],
  [MEASURE_QUEUE, 'measureQueue'],
  [COUNT_COMPARES, 'countCompares'],
  [SEARCH_VISITS, 'searchVisits'],
  [BUILD_READS, 'buildReads'],
  [LOOKUP_READS, 'lookupReads'],
  [RECORDS_64, 'records64()'],
  [POOL_50, 'pool50()'],
  [QUERIES_40, 'queries40()'],
];
const PRELUDES: readonly string[] = [
  `${LIST} ${LIST_CHECKS} `,
  `${TREE} ${TREE_CHECKS} `,
  `${LIST} `,
  `${TREE} `,
  `${TAGGED} `,
  `${RECORDS} `,
];
const COUNTED_CALLS = /^\(\(\) => \{ (?:.*? )?const original = (\w+); let calls = 0; try \{ \1 = function \(input\) \{ calls \+= 1; return original\(input\); \}; \} catch \(error\) \{ return -1; \} try \{ (.*); \} finally \{ \1 = original; \} return calls; \}\)\(\)$/;

export function shownCall(call: string): string {
  const counted = COUNTED_CALLS.exec(call);
  if (counted) return `countCalls(${counted[1]}, () => ${counted[2]})`;
  let shown = call;
  for (const [text, name] of CALL_NAMES) shown = shown.split(text).join(name);
  for (const prelude of PRELUDES) shown = shown.split(`(() => { ${prelude}`).join('(() => { ');
  const single = /^\(\(\) => \{ return ([^;]*); \}\)\(\)$/.exec(shown);
  return single ? single[1] : shown;
}
