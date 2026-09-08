/** Documentation links for the hint ladder's last rung before the solution.
 * devShark ships no AI coach: a stuck learner is pointed at the reference
 * documentation for the technique the task practises. */

const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference';
const REACT = 'https://react.dev/reference/react';
const TS = 'https://www.typescriptlang.org/docs/handbook';

export const CODING_DOCS: Record<string, string> = {
  for: `${MDN}/Statements/for`,
  while: `${MDN}/Statements/while`,
  'do-while': `${MDN}/Statements/do...while`,
  'for-of': `${MDN}/Statements/for...of`,
  'for-in': `${MDN}/Statements/for...in`,
  'nested-loops': `${MDN}/Statements/for`,
  'two-pointer': `${MDN}/Global_Objects/Array`,
  map: `${MDN}/Global_Objects/Array/map`,
  filter: `${MDN}/Global_Objects/Array/filter`,
  reduce: `${MDN}/Global_Objects/Array/reduce`,
  find: `${MDN}/Global_Objects/Array/find`,
  findIndex: `${MDN}/Global_Objects/Array/findIndex`,
  some: `${MDN}/Global_Objects/Array/some`,
  every: `${MDN}/Global_Objects/Array/every`,
  includes: `${MDN}/Global_Objects/Array/includes`,
  indexOf: `${MDN}/Global_Objects/Array/indexOf`,
  push: `${MDN}/Global_Objects/Array/push`,
  pop: `${MDN}/Global_Objects/Array/pop`,
  shift: `${MDN}/Global_Objects/Array/shift`,
  unshift: `${MDN}/Global_Objects/Array/unshift`,
  splice: `${MDN}/Global_Objects/Array/splice`,
  slice: `${MDN}/Global_Objects/Array/slice`,
  sort: `${MDN}/Global_Objects/Array/sort`,
  flat: `${MDN}/Global_Objects/Array/flat`,
  forEach: `${MDN}/Global_Objects/Array/forEach`,
  concat: `${MDN}/Global_Objects/Array/concat`,
  join: `${MDN}/Global_Objects/Array/join`,
  strings: `${MDN}/Global_Objects/String`,
  split: `${MDN}/Global_Objects/String/split`,
  regex: `${MDN}/Global_Objects/RegExp`,
  objects: `${MDN}/Global_Objects/Object`,
  destructuring: `${MDN}/Operators/Destructuring`,
  spread: `${MDN}/Operators/Spread_syntax`,
  'map-set': `${MDN}/Global_Objects/Map`,
  json: `${MDN}/Global_Objects/JSON`,
  functions: `${MDN}/Functions`,
  closures: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures',
  'higher-order': `${MDN}/Functions/Arrow_functions`,
  recursion: 'https://developer.mozilla.org/en-US/docs/Glossary/Recursion',
  callbacks: 'https://developer.mozilla.org/en-US/docs/Glossary/Callback_function',
  promises: `${MDN}/Global_Objects/Promise`,
  'async-await': `${MDN}/Statements/async_function`,
  timers: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout',
  fetch: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
  abort: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
  annotations: `${TS}/2/everyday-types.html`,
  interfaces: `${TS}/2/objects.html`,
  unions: `${TS}/2/everyday-types.html#union-types`,
  'literal-types': `${TS}/2/everyday-types.html#literal-types`,
  tuples: `${TS}/2/objects.html#tuple-types`,
  optional: `${TS}/2/objects.html#optional-properties`,
  readonly: `${TS}/2/objects.html#readonly-properties`,
  narrowing: `${TS}/2/narrowing.html`,
  'type-guards': `${TS}/2/narrowing.html#using-type-predicates`,
  generics: `${TS}/2/generics.html`,
  constraints: `${TS}/2/generics.html#generic-constraints`,
  keyof: `${TS}/2/keyof-types.html`,
  'utility-types': `${TS}/utility-types.html`,
  record: `${TS}/utility-types.html#recordkeys-type`,
  useState: `${REACT}/useState`,
  useEffect: `${REACT}/useEffect`,
  useRef: `${REACT}/useRef`,
  useReducer: `${REACT}/useReducer`,
  useContext: `${REACT}/useContext`,
  useMemo: `${REACT}/useMemo`,
  'custom-hook': 'https://react.dev/learn/reusing-logic-with-custom-hooks',
  'effect-cleanup': 'https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development',
  jsx: 'https://react.dev/learn/writing-markup-with-jsx',
  'lists-keys': 'https://react.dev/learn/rendering-lists',
  conditional: 'https://react.dev/learn/conditional-rendering',
  forms: 'https://react.dev/reference/react-dom/components/input',
  events: 'https://react.dev/learn/responding-to-events',
  'derived-state': 'https://react.dev/learn/choosing-the-state-structure',
  accessibility: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA',
  pagination: `${MDN}/Global_Objects/Array/slice`,
  estimation: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview',
  caching: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching',
  auth: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication',
  networking: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview',
  'request-flow': 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview',
  'data-model': 'https://developer.mozilla.org/en-US/docs/Glossary/Database',
};

/** Which reviewed publication a link points at. The label is localised in the
 * UI (`coding.resources.source.<id>`); the mapping itself is content. */
export type CodingDocSource = 'mdn' | 'react' | 'typescript';

export interface CodingResource {
  /** The technique the link documents — also the task's `focus` tag. */
  tag: string;
  url: string;
  source: CodingDocSource;
}

export function docSourceOf(url: string): CodingDocSource {
  if (url.startsWith('https://react.dev/')) return 'react';
  if (url.startsWith('https://www.typescriptlang.org/')) return 'typescript';
  return 'mdn';
}

/** How many links the Resources panel shows before it stops (issue #155). */
export const MAX_CODING_RESOURCES = 6;

/**
 * Every documented technique a task practises, in the task's own order
 * (issue #155). This is reading material, available from the first second and
 * costing no hint rung: it explains the tools, never the answer.
 *
 * A task whose techniques are all undocumented returns an empty list, and the
 * panel says so rather than padding itself with something unrelated.
 */
export function resourcesFor(focus: readonly string[], limit = MAX_CODING_RESOURCES): CodingResource[] {
  const out: CodingResource[] = [];
  const seen = new Set<string>();
  for (const tag of focus) {
    const url = CODING_DOCS[tag];
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ tag, url, source: docSourceOf(url) });
    if (out.length >= limit) break;
  }
  return out;
}

/** The first documented technique of a task, or the JavaScript reference.
 * Still the hint ladder's last rung before the reference solution. */
export function docsFor(focus: readonly string[]): { tag: string; url: string } {
  for (const tag of focus) {
    const url = CODING_DOCS[tag];
    if (url) return { tag, url };
  }
  return { tag: 'javascript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' };
}

/** Nothing in the registry may point at a solution or a playground. */
export function docRegistryProblems(): string[] {
  const problems: string[] = [];
  for (const [tag, url] of Object.entries(CODING_DOCS)) {
    if (!/^https:\/\//.test(url)) problems.push(`${tag}: not an https link`);
    const host = url.split('/')[2] ?? '';
    if (!['developer.mozilla.org', 'react.dev', 'www.typescriptlang.org'].includes(host)) {
      problems.push(`${tag}: ${host} is not a reviewed documentation source`);
    }
    if (/play|repl|sandbox|solution|answer/i.test(url)) problems.push(`${tag}: link looks like a playground or a solution`);
  }
  return problems;
}
