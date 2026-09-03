// One-time port of the interview-prepper challenge catalogue into lib/coding.
//
//   INTERVIEW_PREPPER_DIR=../interview-prepper node scripts/port-interview-prepper.mjs
//
// Reads the built challenge objects from that checkout, assigns every task a
// stable id, a Learn level, a tier and technique tags, and writes the English
// task sources plus the server-only solutions. Czech overlays (`*.cs.ts`) are
// authored by hand afterwards. Re-running overwrites the generated files.
import path from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SOURCE = path.resolve(process.env.INTERVIEW_PREPPER_DIR ?? '../interview-prepper');
const OUT_TASKS = path.resolve('lib/coding/tasks');
const OUT_SOLUTIONS = path.resolve('lib/coding/solutions');
mkdirSync(OUT_TASKS, { recursive: true });
mkdirSync(OUT_SOLUTIONS, { recursive: true });

const catalogue = await import(pathToFileURL(path.join(SOURCE, 'src/challenges/index.js')).href);
const { CODING_TECHNIQUES } = await import(pathToFileURL(path.resolve('scripts/.coding-techniques.mjs')).href).catch(() => ({ CODING_TECHNIQUES: null }));

// legacy id → [level, tier, focus tags]
const JS = {
  j1: [6, 1, ['map']], j2: [7, 1, ['filter']], j3: [8, 1, ['reduce']], j4: [6, 1, ['for', 'strings']],
  j5: [6, 1, ['for-of', 'strings']], j6: [2, 1, ['for', 'strings']], j7: [7, 1, ['filter']], j8: [6, 1, ['map']],
  j9: [6, 1, ['for']], j10: [3, 1, ['for']], j11: [6, 1, ['while']], j12: [2, 1, ['map', 'strings']],
  j13: [7, 1, ['some']], j14: [7, 1, ['every']], j15: [8, 1, ['reduce', 'objects']], j16: [2, 1, ['strings']],
  j17: [23, 2, ['map-set']], j18: [2, 1, ['split', 'strings']], j19: [7, 1, ['find', 'objects']], j20: [8, 2, ['filter', 'reduce']],
  j21: [2, 2, ['for', 'strings']], j22: [6, 2, ['for', 'push']], j23: [8, 2, ['reduce']], j24: [7, 2, ['filter', 'strings']],
  j25: [5, 2, ['objects']], j26: [5, 2, ['objects']], j27: [10, 2, ['spread', 'objects']], j28: [2, 2, ['strings']],
  j29: [5, 2, ['for-of', 'objects']], j30: [8, 3, ['reduce', 'flat']], j31: [12, 3, ['closures']], j32: [12, 3, ['closures']],
  j33: [15, 4, ['timers', 'closures']], j34: [15, 4, ['timers', 'closures']], j35: [21, 3, ['promises', 'timers']],
  j36: [22, 4, ['async-await', 'promises']], j37: [21, 4, ['promises']], j38: [22, 4, ['async-await', 'promises']],
  j39: [24, 3, ['slice', 'for']], j40: [8, 3, ['reduce', 'objects']], j41: [12, 4, ['closures', 'map-set']],
  j42: [14, 4, ['closures', 'objects', 'callbacks']], j43: [23, 4, ['map-set', 'for-of']],
};
const TS = {
  t1: [1, 1, ['annotations', 'strings']], t2: [4, 1, ['annotations', 'sort', 'slice']], t3: [3, 1, ['annotations', 'optional']],
  t4: [6, 1, ['interfaces']], t5: [9, 1, ['optional', 'interfaces']], t6: [11, 2, ['narrowing', 'unions']],
  t7: [8, 1, ['literal-types']], t8: [4, 2, ['tuples', 'split']], t9: [20, 2, ['record', 'for-of']], t10: [9, 2, ['readonly', 'slice']],
  t11: [12, 2, ['narrowing', 'unions']], t12: [14, 2, ['generics']], t13: [7, 2, ['unions', 'generics']], t14: [3, 2, ['generics', 'map']],
  t15: [15, 3, ['constraints', 'sort']], t16: [16, 3, ['keyof', 'map']], t17: [18, 3, ['utility-types', 'spread']],
  t18: [19, 3, ['utility-types', 'destructuring']], t19: [12, 3, ['unions', 'narrowing']], t20: [12, 3, ['type-guards', 'filter']],
};
const REACT = {
  r1: [6, 1, ['useState', 'forms']], r2: [6, 1, ['useState', 'events']], r3: [8, 1, ['useState', 'events']], r4: [15, 1, ['useState', 'forms']],
  r5: [4, 1, ['lists-keys', 'map']], r6: [5, 1, ['conditional', 'useState']], r7: [9, 1, ['useState', 'spread', 'forms']],
  r8: [9, 1, ['filter', 'useState']], r9: [10, 1, ['derived-state', 'filter']], r10: [15, 1, ['forms', 'events']],
  r11: [11, 1, ['useEffect']], r12: [12, 1, ['useEffect', 'useState']], r13: [13, 1, ['effect-cleanup', 'timers']],
  r14: [11, 2, ['fetch', 'useEffect']], r15: [11, 2, ['fetch', 'lists-keys']], r16: [11, 2, ['fetch', 'conditional']],
  r17: [24, 2, ['fetch', 'conditional']], r18: [16, 2, ['fetch', 'useState']], r19: [10, 2, ['derived-state', 'filter', 'fetch']],
  r20: [12, 2, ['fetch', 'useEffect', 'events']], r21: [15, 3, ['fetch', 'forms']], r22: [9, 3, ['fetch', 'spread']],
  r23: [12, 3, ['useEffect', 'fetch']], r24: [13, 3, ['effect-cleanup', 'timers']], r25: [13, 3, ['abort', 'effect-cleanup']],
  r26: [23, 3, ['pagination', 'slice']], r27: [12, 3, ['useEffect', 'fetch']], r28: [24, 4, ['useState', 'fetch']],
  r29: [21, 3, ['custom-hook', 'fetch']], r30: [25, 4, ['fetch', 'map', 'filter']], r31: [14, 3, ['useRef', 'timers']],
  r32: [21, 3, ['custom-hook', 'useState']], r33: [7, 3, ['accessibility', 'useState', 'events']], r34: [10, 3, ['derived-state', 'useState']],
  r35: [8, 3, ['useState', 'events']], r36: [13, 4, ['events', 'effect-cleanup']], r37: [20, 3, ['useContext']],
  r38: [21, 3, ['custom-hook', 'timers', 'effect-cleanup']], r39: [25, 4, ['fetch', 'reduce', 'useState']], r40: [25, 4, ['fetch', 'filter', 'reduce']],
};
const CAPSTONE = [25, 5, ['fetch', 'useState', 'useEffect']];
const DRILL_FOCUS = {
  estimation: 'estimation', caching: 'caching', queues: 'queues', auth: 'auth', scale: 'scale', scaling: 'scale', networking: 'networking',
  database: 'data-model', databases: 'data-model', 'data model': 'data-model', indexing: 'data-model', storage: 'data-model',
  failure: 'failure', reliability: 'failure', 'request flow': 'request-flow', api: 'request-flow', scope: 'scoping',
  requirements: 'scoping', sessions: 'auth', security: 'auth', 'system design': 'scoping', bottleneck: 'bottleneck',
};

const slug = (text) => text.toLowerCase().replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const minutes = (target) => {
  const m = String(target ?? '').match(/(\d+)(?:[–-](\d+))?\s*minutes?/);
  if (!m) return 10;
  return Number(m[2] ?? m[1]);
};

const ids = new Set();
const uniqueId = (prefix, title) => {
  let id = `${prefix}-${slug(title)}`;
  let n = 2;
  while (ids.has(id)) id = `${prefix}-${slug(title)}-${n++}`;
  ids.add(id);
  return id;
};

const unknownTags = new Set();
const checkTags = (tags) => {
  if (!CODING_TECHNIQUES) return tags;
  for (const tag of tags) if (!CODING_TECHNIQUES.includes(tag)) unknownTags.add(tag);
  return tags;
};

const codeTask = (c, prefix, track, mapping) => {
  const [level, tier, focus] = mapping[c.id] ?? CAPSTONE;
  const source = {
    id: uniqueId(prefix, c.title),
    legacyId: c.id,
    track,
    topic: track,
    level,
    tier,
    focus: checkTags(focus),
    title: c.title,
    prompt: c.prompt,
    starter: c.starter,
    ...(c.skeleton ? { skeleton: c.skeleton } : {}),
    hints: [c.hint].filter(Boolean),
    ...(Array.isArray(c.approach) && c.approach.length ? { approach: c.approach } : {}),
    verify: c.verify ?? 'tests',
    estimatedMinutes: minutes(c.target),
  };
  if (Array.isArray(c.tests)) {
    source.tests = c.tests.map((t) => ({
      call: t.call, expected: t.expected,
      ...(t.label ? { label: t.label } : {}), ...(t.edge ? { edge: true } : {}), ...(t.async ? { async: true } : {}),
    }));
  }
  if (Array.isArray(c.typeTests)) {
    source.typeTests = c.typeTests.map((t) => ({ code: t.code, ...(t.label ? { label: t.label } : {}), ...(t.rejects ? { rejects: true } : {}) }));
  }
  if (typeof c.tests === 'string') source.suite = c.tests;
  if (Array.isArray(c.checklist)) source.checklist = c.checklist;
  if (c.api) source.api = { method: c.api.method, url: c.api.url, note: c.api.note };
  return { source, solution: { solution: c.solution } };
};

const jsPort = catalogue.jsChallenges.map((c) => codeTask(c, 'js', 'javascript', JS));
const tsPort = catalogue.tsChallenges.map((c) => codeTask(c, 'ts', 'typescript', TS));
const reactPort = [...catalogue.reactChallenges, ...catalogue.capstoneChallenges].map((c) => codeTask(c, 'react', 'react', REACT));

const designTasks = catalogue.systemChallenges.map((c) => ({
  id: uniqueId('sd', c.title),
  legacyId: c.id,
  track: 'system-design',
  topic: 'system-design',
  level: 0,
  tier: 2,
  focus: checkTags(['scoping', 'data-model', 'request-flow', 'failure', 'scale']),
  title: c.title,
  prompt: c.prompt,
  starter: '',
  hints: [c.hint].filter(Boolean),
  verify: 'guided',
  estimatedMinutes: minutes(c.target),
  design: {
    scenario: c.design.scenario,
    brief: c.design.brief,
    steps: c.design.steps.map((s) => ({ key: s.key, title: s.title, prompt: s.prompt, options: s.options, correct: s.correct, explanation: s.explanation })),
    reference: c.design.reference,
    passMark: 4,
  },
}));
const drillTasks = catalogue.drillChallenges.map((c) => {
  const d = c.drill;
  const topic = DRILL_FOCUS[String(d.focus).toLowerCase()];
  if (!topic) unknownTags.add(`drill:${d.focus}`);
  return {
    id: uniqueId('dd', c.title),
    legacyId: c.id,
    track: 'system-design',
    topic: 'system-design',
    level: 0,
    tier: 1,
    focus: checkTags([...new Set([d.format === 'estimate' ? 'estimation' : d.format, ...(topic ? [topic] : [])])]),
    title: c.title,
    prompt: c.prompt,
    starter: '',
    hints: [c.hint].filter(Boolean),
    verify: 'drill',
    estimatedMinutes: minutes(c.target),
    drill: {
      format: d.format, scenario: d.scenario, prompt: d.prompt, explanation: d.explanation,
      ...(d.unit !== undefined ? { unit: d.unit } : {}), ...(d.answer !== undefined ? { answer: d.answer } : {}),
      ...(d.min !== undefined ? { min: d.min } : {}), ...(d.max !== undefined ? { max: d.max } : {}),
      ...(d.options ? { options: d.options } : {}), ...(d.correct !== undefined ? { correct: d.correct } : {}),
      ...(d.steps ? { steps: d.steps } : {}),
    },
  };
});

/* ── serializer: readable TypeScript literals, template strings for multi-line text ── */
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const emit = (value, indent = '') => {
  const inner = indent + '  ';
  if (typeof value === 'string') {
    if (!value.includes('\n')) return JSON.stringify(value);
    return '`' + value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
  }
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const simple = value.every((v) => typeof v !== 'object' || v === null) && value.every((v) => typeof v !== 'string' || !v.includes('\n'));
    const parts = value.map((v) => emit(v, inner));
    if (simple && parts.join(', ').length + indent.length < 100) return `[${parts.join(', ')}]`;
    return `[\n${parts.map((p) => `${inner}${p}`).join(',\n')},\n${indent}]`;
  }
  // `expected: undefined` is a real expectation (the call must return undefined), so it is kept.
  const entries = Object.entries(value).filter(([k, v]) => v !== undefined || k === 'expected');
  if (entries.length === 0) return '{}';
  const parts = entries.map(([k, v]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${emit(v, inner)}`);
  const oneLine = `{ ${parts.join(', ')} }`;
  if (oneLine.length + indent.length < 100 && !oneLine.includes('\n')) return oneLine;
  return `{\n${parts.map((p) => `${inner}${p}`).join(',\n')},\n${indent}}`;
};

const header = (what) => `// Generated by scripts/port-interview-prepper.mjs from the interview-prepper catalogue.\n// ${what}\n// English is the source of truth; Czech copy lives in the sibling *.cs.ts overlay.\n\n`;

const writeTasks = (file, exportName, tasks) => {
  const body = `${header('Task bodies only: prompts, starters, visible tests, hints. No solutions.')}import type { CodingTaskSource } from '../types';\n\nexport const ${exportName}: CodingTaskSource[] = ${emit(tasks)};\n`;
  writeFileSync(path.join(OUT_TASKS, file), body);
  console.log(`${file}: ${tasks.length} tasks`);
};
const writeSolutions = (file, exportName, entries) => {
  const record = Object.fromEntries(entries.map(({ source, solution }) => [source.id, solution]));
  const body = `${header('Server-only reference solutions. Never import from client code.')}import type { CodingSolution } from '../types';\n\nexport const ${exportName}: Record<string, CodingSolution> = ${emit(record)};\n`;
  writeFileSync(path.join(OUT_SOLUTIONS, file), body);
  console.log(`solutions/${file}: ${entries.length}`);
};

writeTasks('javascript.ts', 'JAVASCRIPT_TASKS', jsPort.map((p) => p.source));
writeTasks('typescript.ts', 'TYPESCRIPT_TASKS', tsPort.map((p) => p.source));
writeTasks('react.ts', 'REACT_TASKS', reactPort.map((p) => p.source));
writeTasks('system-design.ts', 'SYSTEM_DESIGN_TASKS', [...designTasks, ...drillTasks]);
writeSolutions('javascript.ts', 'JAVASCRIPT_SOLUTIONS', jsPort);
writeSolutions('typescript.ts', 'TYPESCRIPT_SOLUTIONS', tsPort);
writeSolutions('react.ts', 'REACT_SOLUTIONS', reactPort);

if (unknownTags.size) console.log('unknown tags:', [...unknownTags].join(', '));
console.log('drill focus values:', [...new Set(catalogue.drillChallenges.map((c) => c.drill.focus))].join(', '));
