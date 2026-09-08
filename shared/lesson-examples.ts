/** Tiny interactive examples inside a lesson (issue #162).
 *
 * An example is a few lines the learner can change and re-run before the
 * questions start. It is exploration: nothing here is graded, nothing is
 * recorded, and no XP or evidence comes out of it. The code runs in the same
 * isolated, time-bounded runner the coding tasks use — never in the page's own
 * context and never on the server.
 *
 * Where typing is the wrong interaction (a phone, a tablet between quizzes),
 * the example offers authored parameter choices and a read-only trace instead
 * of an editor. Examples that cannot run in the JavaScript runner at all — a
 * React render, say — are authored trace-only and say so.
 */

import type { Localized } from './coding-catalog';

export type LessonExampleTrack = 'javascript' | 'typescript' | 'react';

/** One authored parameter choice, for the no-typing interaction. */
export interface LessonExampleVariant {
  label: Localized;
  /** The expression evaluated for this choice. */
  call: string;
}

export interface LessonExampleTraceStep {
  call: string;
  /** What that call produces, authored so a trace-only example can be read. */
  output: string;
}

export interface LessonExample {
  id: string;
  /** The Learn topic and level this belongs to. */
  topic: string;
  level: number;
  track: LessonExampleTrack;
  title: Localized;
  blurb: Localized;
  /** The starting code. Editable where an editor is appropriate. */
  code: string;
  /** Expressions printed after the code runs. */
  calls: string[];
  /** Parameter choices offered instead of typing. */
  variants: LessonExampleVariant[];
  /** The authored trace, shown read-only where the runner is not used. */
  trace: LessonExampleTraceStep[];
  /** False when the example is illustrated rather than executed. */
  runnable: boolean;
}

export const LESSON_EXAMPLES: readonly LessonExample[] = [
  {
    id: 'ex-js-map-shape',
    topic: 'javascript',
    level: 6,
    track: 'javascript',
    title: { en: 'What map gives back', cs: 'Co vrací map' },
    blurb: {
      en: 'map always returns an array of the same length. Change what the callback returns and watch the shape stay the same.',
      cs: 'map vždycky vrátí pole stejné délky. Změň, co vrací callback, a sleduj, že tvar zůstane stejný.',
    },
    code: 'const numbers = [1, 2, 3];\nconst result = numbers.map(number => number * 2);',
    calls: ['result', 'result.length', 'numbers'],
    variants: [
      { label: { en: 'Double each value', cs: 'Zdvojnásobit každou hodnotu' }, call: '[1,2,3].map(n => n * 2)' },
      { label: { en: 'Turn each into text', cs: 'Udělat z každé text' }, call: '[1,2,3].map(n => `#${n}`)' },
      { label: { en: 'Return nothing', cs: 'Nevracet nic' }, call: '[1,2,3].map(n => { n * 2; })' },
    ],
    trace: [
      { call: '[1,2,3].map(n => n * 2)', output: '[2, 4, 6]' },
      { call: '[1,2,3].map(n => `#${n}`)', output: '["#1", "#2", "#3"]' },
      { call: '[1,2,3].map(n => { n * 2; })', output: '[undefined, undefined, undefined]' },
    ],
    runnable: true,
  },
  {
    id: 'ex-js-filter-keeps',
    topic: 'javascript',
    level: 7,
    track: 'javascript',
    title: { en: 'filter keeps, it does not change', cs: 'filter vybírá, nemění' },
    blurb: {
      en: 'filter decides which values survive. It never rewrites one — that is what map is for.',
      cs: 'filter rozhoduje, které hodnoty projdou. Nikdy je nepřepisuje — od toho je map.',
    },
    code: 'const values = [1, 2, 3, 4];\nconst kept = values.filter(value => value % 2 === 0);',
    calls: ['kept', 'values'],
    variants: [
      { label: { en: 'Keep the even ones', cs: 'Nechat sudé' }, call: '[1,2,3,4].filter(v => v % 2 === 0)' },
      { label: { en: 'Keep everything', cs: 'Nechat všechno' }, call: '[1,2,3,4].filter(() => true)' },
      { label: { en: 'Keep nothing', cs: 'Nenechat nic' }, call: '[1,2,3,4].filter(() => false)' },
    ],
    trace: [
      { call: '[1,2,3,4].filter(v => v % 2 === 0)', output: '[2, 4]' },
      { call: '[1,2,3,4].filter(() => true)', output: '[1, 2, 3, 4]' },
      { call: '[1,2,3,4].filter(() => false)', output: '[]' },
    ],
    runnable: true,
  },
  {
    id: 'ex-js-mutation',
    topic: 'javascript',
    level: 8,
    track: 'javascript',
    title: { en: 'Which methods rewrite the array', cs: 'Které metody pole přepisují' },
    blurb: {
      en: 'sort and reverse change the array they are called on. slice and the spread give you a copy first.',
      cs: 'sort a reverse mění pole, na kterém je zavoláš. slice a spread ti nejdřív dají kopii.',
    },
    code: 'const original = [3, 1, 2];\nconst copy = [...original].sort((a, b) => a - b);',
    calls: ['copy', 'original'],
    variants: [
      { label: { en: 'Sort a copy', cs: 'Seřadit kopii' }, call: '(() => { const a = [3,1,2]; [...a].sort((x,y) => x-y); return a; })()' },
      { label: { en: 'Sort in place', cs: 'Seřadit na místě' }, call: '(() => { const a = [3,1,2]; a.sort((x,y) => x-y); return a; })()' },
    ],
    trace: [
      { call: 'a copy is sorted, a stays [3, 1, 2]', output: '[3, 1, 2]' },
      { call: 'a is sorted in place', output: '[1, 2, 3]' },
    ],
    runnable: true,
  },
  {
    id: 'ex-ts-narrowing',
    topic: 'typescript',
    level: 5,
    track: 'typescript',
    title: { en: 'Narrowing a union', cs: 'Zúžení sjednocení' },
    blurb: {
      en: 'A check in the code is a check in the types too: after typeof, TypeScript knows which half of the union you are holding.',
      cs: 'Podmínka v kódu je i podmínkou v typech: po typeof už TypeScript ví, kterou polovinu sjednocení držíš.',
    },
    code: 'const describe = (value: string | number): string =>\n  typeof value === "string" ? value.toUpperCase() : value.toFixed(1);',
    calls: ['describe("hi")', 'describe(2)'],
    variants: [
      { label: { en: 'Pass a string', cs: 'Předat řetězec' }, call: 'describe("hi")' },
      { label: { en: 'Pass a number', cs: 'Předat číslo' }, call: 'describe(2)' },
    ],
    trace: [
      { call: 'describe("hi")', output: '"HI"' },
      { call: 'describe(2)', output: '"2.0"' },
    ],
    runnable: true,
  },
  {
    id: 'ex-dsa-linear-scan',
    topic: 'dsa',
    level: 3,
    track: 'javascript',
    title: { en: 'What a linear scan costs', cs: 'Kolik stojí lineární průchod' },
    blurb: {
      en: 'Counting the comparisons makes the growth concrete: double the input, double the work.',
      cs: 'Když si porovnání spočítáš, růst přestane být abstraktní: dvojnásobný vstup, dvojnásobná práce.',
    },
    code: 'const comparisons = size => {\n  let count = 0;\n  const values = Array.from({ length: size }, (_, i) => i);\n  for (const value of values) { count++; if (value === -1) break; }\n  return count;\n};',
    calls: ['comparisons(10)', 'comparisons(20)', 'comparisons(40)'],
    variants: [
      { label: { en: '10 values', cs: '10 hodnot' }, call: 'comparisons(10)' },
      { label: { en: '20 values', cs: '20 hodnot' }, call: 'comparisons(20)' },
      { label: { en: '40 values', cs: '40 hodnot' }, call: 'comparisons(40)' },
    ],
    trace: [
      { call: 'comparisons(10)', output: '10' },
      { call: 'comparisons(20)', output: '20' },
      { call: 'comparisons(40)', output: '40' },
    ],
    runnable: true,
  },
  {
    id: 'ex-react-state-render',
    topic: 'react',
    level: 4,
    track: 'react',
    title: { en: 'State decides what renders', cs: 'Stav rozhoduje, co se vykreslí' },
    blurb: {
      en: 'Setting state schedules a render; the value you read is the one from this render, not the one you just set. This example is illustrated rather than run — a React render needs the preview frame, which the coding workbench provides.',
      cs: 'Nastavení stavu naplánuje vykreslení; hodnota, kterou čteš, patří tomuhle vykreslení, ne tomu, co jsi právě nastavil(a). Tenhle příklad je jen ukázka, nespouští se — vykreslení Reactu potřebuje náhledový rám, který má programovací plocha.',
    },
    code: 'const [count, setCount] = useState(0);\n\nconst onClick = () => {\n  setCount(count + 1);\n  console.log(count); // still the value this render started with\n};',
    calls: [],
    variants: [],
    trace: [
      { call: 'first click, before the re-render', output: '0' },
      { call: 'after the re-render', output: '1' },
      { call: 'second click, before the re-render', output: '1' },
    ],
    runnable: false,
  },
];

/** The examples authored for one Learn level, in authored order. */
export const lessonExamplesFor = (topic: string, level: number): LessonExample[] =>
  LESSON_EXAMPLES.filter((example) => example.topic === topic && example.level === level);

/** The coverage manifest: which topics have examples, and how many. */
export function lessonExampleCoverage(): { topic: string; count: number; levels: number[] }[] {
  const byTopic = new Map<string, number[]>();
  for (const example of LESSON_EXAMPLES) {
    const levels = byTopic.get(example.topic) ?? [];
    levels.push(example.level);
    byTopic.set(example.topic, levels);
  }
  return [...byTopic.entries()]
    .map(([topic, levels]) => ({ topic, count: levels.length, levels: [...levels].sort((a, b) => a - b) }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

/** How long an example may run before it is stopped, and how much it may print. */
export const EXAMPLE_MAX_OUTPUT_LINES = 20;
export const EXAMPLE_MAX_OUTPUT_CHARS = 2_000;
