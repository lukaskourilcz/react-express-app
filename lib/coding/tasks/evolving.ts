import type { CodingFormat, CodingTask, CallTest, Difficulty, TypeTest } from '../../../shared/coding-catalog';
import type { FailureCategory } from '../../../shared/coding-failure';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import { stageReferences } from './evolving-references';

const test = (call: string, expected: unknown): CallTest => ({ call, expected, edge: true });

interface Spec {
  starter: string;
  focus: string[];
  focuses?: string[][];
  prompts: string[];
  hints: string[];
  /** Method steps per stage, offered on the hint ladder after the hint. */
  approaches?: string[][];
  /** What the learner does at every stage. Absent means `implement`. */
  format?: CodingFormat;
  /** The misconception each stage is built around, for the failure hints. */
  pitfalls?: FailureCategory[];
  /** An authored label per stage, where the position band is wrong for the
   * path. Every stage is tier 2, so an entry may say Easy or Medium only; a
   * stage left out keeps its position label, which is how a fifth level of a
   * Medium path still reads Hard. `npm run test:coding` enforces the bound. */
  difficulties?: readonly Difficulty[];
  tests?: CallTest[][];
  typeTests?: TypeTest[][];
  suites?: string[];
  references?: { title: string; url: string }[][];
}

const SPECS: Record<string, Spec> = {
  'js-evolving-calculator': {
    starter: 'function calculate(expression) {\n  // Return a number.\n}\n', focus: ['split', 'reduce'],
    focuses: [['split', 'reduce'], ['strings', 'recursion', 'while'], ['strings', 'recursion', 'while']],
    prompts: [
      "Implement calculate(expression) for sums of one or more non-negative decimal integer literals. Leading zeros and JavaScript whitespace around literals/operators are valid; whitespace inside a literal is not. A single number returns itself. Inputs are primitive strings of at most 20000 UTF-16 units and are valid at this stage. Every operand and running sum is an exact safe Number integer. Split on + and add the converted values in order; preserve all earlier single-number behavior. Target: O(n) time and O(n) extra space, where n is expression.length.",
      "Keep addition/subtraction and add multiplication/division. * and / bind before + and -; operators at the same precedence apply left to right. For example, 1 + 2 / 9 * 4 gives 1.8888888888888888. Use the earlier ASCII decimal literal grammar with leading zeros, JavaScript whitespace between tokens and ordinary Number rounding. Inputs are valid primitive strings up to 20000 UTF-16 units, all operands/final results are finite and no division has a zero right operand. Unary signs and parentheses come later. Read numbers by index or a sticky regular expression rather than copying the remaining suffix for every token. Target: O(n) time and O(n) extra space, where n is expression.length.",
      "Extend the engine with parentheses and unary +/-. A literal is one or more ASCII digits, optionally followed by a dot and one or more digits; leading zeros are valid. JavaScript whitespace may occur between tokens, never inside a number. Use ordinary Number conversion/arithmetic and the earlier precedence/left associativity. Return null for malformed or empty input, trailing tokens, any division by a zero right operand, or a non-finite final result. A malformed nested division still fails even when another arithmetic step could hide it. Signs may repeat. Inputs are primitive strings of at most 20000 UTF-16 units, with at most 64 parenthesis levels and at most 64 consecutive unary signs. Other types are outside this task. Do not use native eval or any Function-family code compiler; these capabilities are unavailable in this exercise. Write a parser and consume the complete input. -(2+3)*4 gives -20; 1 + gives null. Match each number from the current index without copying the remaining suffix. Target: O(n) time and O(n) extra space, where n is expression.length.",
    ],
    hints: ["Split on + and convert each whole literal with Number. The valid-input contract keeps every running sum safe.", "Separate sum and product parsing. Read a number once from its current span; sticky RegExp lastIndex or start/end indices avoid repeated suffix copies.", "Handle unary signs and parentheses as operands, reject zero divisors, require complete token consumption and check that the final Number is finite."],
    approaches: [
      ["Split at plus signs; convert each complete literal to Number.", "Accumulate left to right, preserving safe integer arithmetic under the input bounds."],
      ["Scan each number/operator once. Parse products before sums, with a loop at each precedence.", "Use an index or sticky numeric match; keep number spans instead of growing a copied prefix."],
      ["Tokenize without discarding unknown characters, or parse directly at an index.", "Read unary signs/parenthesized expressions as operands; apply products before sums and reject zero divisors.", "Require the entire input to be consumed and the final Number to be finite; otherwise return null."],
    ],
    tests: [
      [test("calculate(\"9007199254740991+0\")",9007199254740991), test('calculate("1 + 2")', 3), test('calculate("0")', 0), test('calculate(" 12 + 30 + 5 ")', 47), test('calculate("999 + 1")', 1000),
        {...test('calculate("2+3+4")', 9), label: 'Whitespace is optional: no spaces'},
        {...test('calculate("7 +8+ 9")', 24), label: 'Whitespace is optional: mixed spacing'}],
      [test("calculate(\"1\\uFEFF+2*3\")",7), test('calculate("1 + 2 / 9 * 4")', 1.8888888888888888), test('calculate("8 / 2 * 3")', 12), test('calculate("10 - 3 - 2")', 5), test('calculate("1.5 * 2 + 4")', 7)],
      [test("calculate(\"0/(1/0)\")",null), test('calculate("-(2+3)*4")', -20), test('calculate("2*(3+(4/2))")', 10), test('calculate("1 +")', null), test('calculate("2 / (3-3)")', null), test('calculate("2x3")', null), test('calculate("")', null), test('calculate("1 2")', null), test('calculate("--2")', 2)],
    ],
  },
  'js-evolving-query': {
    starter: 'function query(rows, options = {}) {\n  // Return a new array.\n}\n', focus: ['filter', 'sort', 'map'],
    focuses: [['filter','objects'],['filter','sort','slice'],['filter','sort','map','map-set']],
    prompts: [
      "Implement query(rows, options={}). Keep records satisfying every where condition; no where means keep all. rows is a dense array of at most 20000 non-null records; preserve duplicate references. Inputs/options may be frozen. Read referenced data properties without changing inputs; accessors at referenced fields and proxies are outside this task. Record fields not used by the requested operations stay opaque. options is omitted or a record. where is omitted/undefined or a record with at most 64 own enumerable string-keyed conditions; ignore its inherited, non-enumerable and symbol fields. Match every condition with === using ordinary row property lookup: a missing field reads undefined, NaN never matches, zero signs compare equal and objects match by reference. Field names may be empty or prototype-like and have at most 64 UTF-16 units. String values compared by where have at most 128 UTF-16 units; object values are compared by identity without traversing their contents. Without projection, return the original record references in a fresh mutable array. Let n = rows.length + 1 and m = 1 + the condition count; use the usual constant-time property lookup model. Target: O(n*m) time and O(n+m) extra space. Cache condition keys/entries once rather than rebuilding them for each row.",
      "Keep the earlier filter and stable sort, then paginate. offset defaults to 0 and limit defaults to all remaining rows. Supplied bounds are non-negative safe integers; limit 0 returns []. Bounds beyond the rows simply clip to the array, including values above 2^32. Keep the earlier input, identity and immutability rules and the n/m definitions. Apply operations in that order; field names, comparison rules and stable ties stay unchanged. Target: O(n*m + n*log(n)) time and O(n+m) extra space.",
      "Keep filtering, stable sorting, pagination and projection in that order; add optional deduplication. distinct is a boolean, default false. When true, deduplicate after pagination/projection, keeping the first result record. Compare own enumerable string-keyed field/value sets independently of insertion order; ignore prototypes, symbols and non-enumerable metadata. In this mode compared records have at most 64 fields with JSON primitive values: null, booleans, finite Numbers or strings up to 128 UTF-16 units. Zero signs compare equal; distinct strings remain distinct and missing fields differ from present ones. Use an unambiguous field/value identity with a Set or Map instead of rescanning all earlier records. Keep the earlier input, identity and immutability rules and the n/m definitions. Projection still preserves selected own non-enumerable and undefined values when distinct is false. Target: O(n*m + n*log(n)) time and O(n+m) extra space. The field count and serialized key/value width in distinct mode are bounded as stated.",
    ],
    hints: ["Cache the own enumerable conditions once, then keep records that match every value with ===. Preserve record references and input order.", "Filter first; sort a new array using literal < and > comparisons with stable ties. Check orderBy against undefined so an empty field name still works. Paginate only after sorting.", "Project own fields without losing __proto__ or undefined values. For distinct JSON-primitive records, sort key/value pairs into an unambiguous identity and track seen identities with a Set or Map."],
    approaches: [["Collect own enumerable where keys or entries once.", "Keep each original record only when all requested ordinary property values strictly equal their conditions.", "Return a new mutable array; do not clone or inspect unrelated record fields."], ["Run the filter first, then stably sort the resulting array when orderBy is defined.", "Compare literal field values and keep ties in input order; descending reverses comparisons, not tied records.", "Apply offset/limit last without narrowing safe integers."], ["Apply filter, stable sort and pagination in the earlier order.", "When select is supplied, copy only existing own fields into safe fresh data records, preserving selected value references.", "For distinct, compare bounded JSON-primitive field sets independently of key order and keep the first record using a Set or Map."]],
    tests: [
      [test("[query([{v:NaN}],{where:{v:NaN}}).length,query([{v:-0}],{where:{v:0}}).length]",[0, 1]), test('query([{x:1},{x:2}],{where:{x:2}})', [{x:2}]), test('query([])', []), test('query([{x:1}],{where:{x:"1"}})', []), test('query([{x:1,y:2},{x:1,y:3}],{where:{x:1,y:2}})', [{x:1,y:2}])],
      [test("[query([{x:1}],{offset:4294967296}).length,query([{x:1},{x:2}],{limit:4294967296}).length]",[0, 2]), test('query([{x:3},{x:1},{x:2}],{orderBy:"x",offset:1,limit:1})', [{x:2}]), test('query([{x:1}],{limit:0})', []), test('query([{x:"a"},{x:"b"}],{orderBy:"x",desc:true})', [{x:'b'},{x:'a'}]), test('query([{x:1,id:2},{x:1,id:1}],{orderBy:"x"})', [{x:1,id:2},{x:1,id:1}])],
      [test("Object.hasOwn(query([{x:undefined}],{select:['x']})[0],'x')",true), test('query([{x:1,y:2},{x:1,y:3}],{select:["x"],distinct:true})', [{x:1}]), test('query([{x:1}],{select:["missing"]})', [{}]), test('query([{x:1,y:2},{y:2,x:1}],{distinct:true})', [{x:1,y:2}]), test('query([{x:1},{x:1},{x:2}],{limit:2,distinct:true})', [{x:1}])],
    ],
  },
  'js-evolving-events': {
    starter: 'function createBus() {\n  return { on(event, listener) {}, emit(event, value) {} };\n}\n', focus: ['closures', 'map-set'],
    prompts: [
      "Extend createBus() to support multiple listeners per event. Deliver every registration in registration order; registering the same function twice creates two subscriptions. Unknown events do nothing. At this stage listeners do not throw, change subscriptions or reenter emit; later stages add those behaviors. The return from on is unused at this step. Retain the earlier case-sensitive bounded string/symbol event keys, exact opaque payload forwarding, synchronous calls and independent bus state. Call each listener with one payload argument, including undefined, and ignore its return; the callback's this value is outside this exercise. Each bus has at most 20000 total registrations. Native Map/Set lookup and growth use the usual amortized model. Target: O(n) time and O(n) extra space per emit, where n is 1 plus that event's subscription count at call start, excluding callback work and persistent bus state. Each nested emit accounts for its own call. Creating a bus and on/once/unsubscribe take O(1) amortized time when offered; persistent state is O(k) for k total registrations.",
      "Keep idempotent on/unsubscribe and add once(event, listener), also returning unsubscribe. Every once registration invokes at most once across nested/outer emits. Remove it before invocation and retain a fired guard for older traversals. Nested emits may reach depth 32, with at most 20000 callback invocations per top-level emit. Callbacks do not throw or explicitly change subscriptions during emit yet; snapshot mutation rules come later. Keep the earlier bounded event/payload rules, independent state, one-argument delivery, ignored listener returns and n/k definitions. Target: O(n) time and O(n) extra space per emit, excluding callback work/persistent state. Creating a bus and registering/unsubscribing target O(1) amortized time; state remains O(k).",
      "Snapshot subscriptions at the start of every emit, including nested emits. New registrations wait for a later emit; unsubscribe does not cancel an already captured entry. Skip a once entry already fired by a nested emit. Catch each direct exception, continue and return a fresh mutable array of exact thrown values in invocation order; unknown/successful emits return fresh []. Nested errors stay in their own array unless a listener explicitly throws that array; never auto-flatten, deduplicate or coerce. Keep prior once/unsubscribe and bounded nesting. Keep the earlier bounded event/payload rules, independent state, one-argument delivery, ignored listener returns and n/k definitions. Target: O(n) time and O(n) extra space per emit, excluding callback work/persistent state. Creating a bus and registering/unsubscribing target O(1) amortized time; state remains O(k).",
    ],
    hints: ["Keep an ordered collection of distinct subscription records per event, even when callback functions repeat. Match string/symbol event keys exactly.", "Remove a once entry before calling it and retain a fired flag for reentrant traversals. A Set of subscription records supports constant-time removal without rescanning/rebuilding an array.", "Capture a fresh ordered snapshot for each emit, retain once-fired guards and catch each callback separately. Keep exact error identities in a fresh mutable array."],
    approaches: [["Create one ordered subscription collection per exact event key.", "Store a fresh entry for each registration, including repeated callback functions.", "Invoke registrations synchronously with the original payload; no copying or name normalization."], ["Return an unsubscribe closure tied to a unique subscription entry.", "Use constant-time entry removal; before a once invocation, mark it fired and remove it.", "Skip fired once entries reached by an older traversal after nested emission."], ["Copy the current ordered entries at the start of each emit.", "Retain once-fired guards; queued normal entries still run after unsubscribe and new entries wait for a later snapshot.", "Catch each direct exception and append its original value to a fresh mutable errors array."]],
    tests: [
      [test("(()=>{const bus=createBus(),seen=[];bus.on('é',()=>seen.push(1));bus.on('e\\u0301',()=>seen.push(2));bus.emit('é');return seen;})()",[1]), test('(()=>{const b=createBus(),a=[];b.on("x",v=>a.push(v));b.emit("x",2);return a})()', [2]), test('(()=>{const b=createBus(),a=[];b.on("x",()=>a.push(1));b.on("x",()=>a.push(2));b.emit("x");return a})()', [1,2]), test('(()=>{const b=createBus(),a=[];b.on("x",()=>a.push(1));b.emit("y");return a})()', []), test('(()=>{const a=createBus(),b=createBus(),r=[];a.on("x",()=>r.push(1));b.emit("x");return r})()', [])],
      [test("(()=>{const payload=[],bus=createBus();let same=false;bus.on('x',value=>same=value===payload);bus.emit('x',payload);return same;})()",true), test('(()=>{const b=createBus(),a=[];const off=b.on("x",()=>a.push(1));off();off();b.emit("x");return a})()', []), test('(()=>{const b=createBus();let n=0;b.once("x",()=>{n++;b.emit("x")});b.emit("x");return n})()', 1), test('(()=>{const b=createBus(),a=[];b.once("x",v=>a.push(v));b.emit("x",1);b.emit("x",2);return a})()', [1]), test('(()=>{const b=createBus();let n=0;const f=()=>n++;b.on("x",f);b.on("x",f)();b.emit("x");return n})()', 1)],
      [test("(()=>{const errors=createBus().emit('none');errors.push('ok');return errors;})()",["ok"]), test('(()=>{const b=createBus();b.on("x",()=>{throw "a"});b.on("x",()=>{throw "b"});return b.emit("x")})()', ['a','b']), test('createBus().emit("none")', []), test('(()=>{const b=createBus(),a=[];b.on("x",()=>{a.push(1);b.on("x",()=>a.push(3))});b.on("x",()=>a.push(2));b.emit("x");return a})()', [1,2]), test('(()=>{const b=createBus(),a=[];let off;b.on("x",()=>off());off=b.on("x",()=>a.push(2));b.emit("x");b.emit("x");return a})()', [2])],
    ],
  },
  'js-evolving-graph': {
    starter: 'function plan(graph) {\n  // graph maps each task ID to its dependency IDs.\n}\n', focus: ['recursion', 'map-set'],
    prompts: [
      "Implement plan(graph), returning each task once in dependency-first depth-first postorder. Visit every root in Object.keys order; finish each dependency left to right before appending its task, and skip tasks already finished. This stage uses acyclic graphs with every dependency declared. Keep the preceding own-enumerable task-ID rules, exact names, Object.keys root order, opaque ignored metadata, frozen inputs and fresh mutable output. A declared task means an own enumerable string key, never an inherited, hidden or symbol property. Its dependencies are now a dense readonly array of at most 512 exact string IDs, read left to right; duplicate edges are allowed. There are at most 20000 own graph properties and 20000 dependency positions in total. Any active dependency walk reaches at most 64 distinct nodes before termination or a repeated/missing ID. Dependency-array elements and task fields are ordinary data properties; proxies/accessors there are outside scope. Do not mutate graph or dependency arrays. Let n=1+all own graph properties and m=1+all dependency positions, using bounded-name lookup. Target: O(n+m) time and O(n+m) extra space. A different valid topological order is not the requested deterministic result.",
      "Keep deterministic DFS postorder and the prior bounded graph/ownership/n/m rules. Return null for any undeclared dependency or cycle, including a self-edge, a return to a node on the current active path or an invalid disconnected component. A repeated edge or a dependency shared by already completed branches is valid. Check every component before returning a result; do not return a partial order. Declared IDs still mean own enumerable task keys; ignored metadata cannot satisfy dependencies. Target: O(n+m) time and O(n+m) extra space.",
      "Extend layered mode to reject invalid graphs too: undeclared dependencies or cycles anywhere return null, never a partial layer list. Preserve validated default DFS mode, previous boolean options.layers, bounded graph/ownership/n/m rules and fresh independent mutable layers. Every layer contains all and only tasks whose dependencies completed in earlier layers, in Object.keys order; shared/duplicate dependencies do not duplicate tasks. Empty graph returns fresh []. Target: O(n*(n+m)) time and O(n+m) extra space in layered mode, allowing repeated ready scans or a faster depth/index solution; default mode retains O(n+m) time.",
    ],
    hints: ["Visit dependencies left to right, append only after they finish and skip completed tasks. Preserve root/key order; a queue-based topological order may differ.", "Use an active-path set as well as completed state, and validate propertyIsEnumerable rather than treating hidden metadata as a task.", "Validate first. Collect every ready node for a layer before marking any complete; keep layers in root-key order. A depth computed in DFS postorder is an alternative."],
    approaches: [["Walk root keys in JavaScript enumeration order.", "Recursively visit each ordered dependency before appending the task.", "Track completed IDs so shared or repeated dependencies appear once."], ["Reject any dependency outside the declared own enumerable task set.", "Distinguish the current active path from completed nodes; only revisiting the active path is a cycle.", "Validate all components and return null for any error, otherwise the ordered postorder list."], ["Validate every component with the earlier DFS rules.", "Collect a full ready layer using only previously completed layers, or compute depths in validated postorder.", "Build fresh independent layer arrays in Object.keys order, leaving graph and dependency arrays unchanged."]],
    tests: [
      [test("plan({root:[\"b\",\"a\"],a:[],b:[]})",["b", "a", "root"]), test('plan({build:["test"],test:["install"],install:[]})', ['install','test','build']), test('plan({})', []), test('plan({a:[],b:[]})', ['a','b']), test('plan({a:["c"],b:["c"],c:[]})', ['c','a','b'])],
      [test("plan({'\u00e9':[],'e\\u0301':['\u00e9']})",["\u00e9", "e\u0301"]), test('plan({a:["a"]})', null), test('plan({a:["b"],b:["a"]})', null), test('plan({a:["missing"]})', null), test('plan({ok:[],x:["y"],y:["x"]})', null)],
      [test("(()=>{const graph={a:[],b:['a']};const first=plan(graph,{layers:true});first[0].push('changed');return plan(graph,{layers:true});})()",[["a"], ["b"]]), test('plan({build:["test"],test:["install"],install:[]},{layers:true})', [['install'],['test'],['build']]), test('plan({a:[],b:[],c:["a","b"]},{layers:true})', [['a','b'],['c']]), test('plan({},{layers:true})', []), test('plan({a:["a"]},{layers:true})', null)],
    ],
  },
};

export { SPECS, test };
export type { Spec };

/** Cumulative prompts and tests make regressions fail when a task evolves. */
export function buildEvolvingTasks(specs: Record<string, Spec>): CodingTask[] {
  return EVOLVING_CHALLENGES.flatMap(challenge => {
    const spec = specs[challenge.id];
    if (!spec) return [];
    return challenge.stages.filter(id => !id.endsWith('-start')).map((id, index): CodingTask => ({
      id, track: challenge.track, topic: challenge.track, level: 25, tier: 2,
      title: `${challenge.title} · ${index + 1}`,
      prompt: spec.prompts[index],
      previousRequirements: spec.prompts.slice(0,index),
      references: spec.references?.[index] ?? stageReferences(challenge.id,index),
      starter: spec.starter, focus: spec.focuses?.[index] ?? spec.focus,
      hints: [spec.hints[index]],
      ...(spec.approaches?.[index] ? { approach: [...spec.approaches[index]] } : {}),
      ...(spec.format ? { format: spec.format } : {}),
      ...(spec.pitfalls?.[index] ? { pitfall: spec.pitfalls[index] } : {}),
      ...(spec.difficulties?.[index] ? { difficulty: spec.difficulties[index] } : {}),
      verify: 'tests', estimatedMinutes: 15 + index * 15,
      ...(spec.tests ? { tests: spec.tests.slice(0, index + 1).flat() } : {}),
      ...(spec.typeTests ? { typeTests: spec.typeTests.slice(0, index + 1).flat().map(test => ({...test, code: `{ ${test.code} }`})) } : {}),
      ...(spec.suites ? { suite: "import React from 'react';\nimport { render, screen, fireEvent, cleanup } from '@testing-library/react';\nimport App from './App';\nafterEach(cleanup);\n" + spec.suites.slice(0, index + 1).join('\n') } : {}),
    }));
  });
}
