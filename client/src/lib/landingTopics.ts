// Featured-topic data for the editorial landing (Home.tsx). The landing's
// topic picker surfaces a handful of "featured" topics; the rest live behind
// the "And N more →" card that leads to /learn.
//
// Every entry carries REAL data pulled from the question bank + roadmap:
//   · `levels`   — the topic's first five level names (from the
//                  `// ── Level N — <Name> ──` markers in
//                  `lib/roadmap-questions-<topic>.ts`), shortened where the
//                  design shortens them (e.g. "Arrays: Basics" → "Arrays").
//   · `question` — the topic's real Level-1 sample question (first seed in
//                  the same file), shown in the "try one, no signup" card.
//
// The card logo is a bundled devicon. Fin choreography is assigned per card
// so no two cards surface the same school (see SCHOOLS).

import type { SubjectId } from './subjects';

/** A single fin in a card's hover "school". */
export interface FinSpec {
  /** Glyph size in px. */
  size: number;
  /** Horizontal start (CSS left, e.g. '82%'). */
  left: string;
  /** Swim direction: 1 = left→right, -1 = right→left. */
  dir: 1 | -1;
  /** Crossing duration in seconds. */
  dur: number;
  /** Stagger delay in seconds. */
  delay: number;
  /** Add a slight roll while crossing. */
  rock?: boolean;
}

export interface LandingQuestion {
  text: string;
  /** Optional fenced code snippet shown above the options. */
  code?: string;
  opts: string[];
  /** Index of the correct option. */
  a: number;
  /** One-line explanation shown after answering. */
  e: string;
}

export interface LandingTopic {
  /** Topic id (also the quiz category). */
  id: string;
  name: string;
  blurb: string;
  /** First five level names. */
  levels: string[];
  question: LandingQuestion;
  /** Per-card fin school (varies card to card). */
  fins: FinSpec[];
}

// A rotation of distinct fin schools, so successive cards never surface the
// same way.
const SCHOOLS: FinSpec[][] = [
  [{ size: 42, left: '82%', dir: -1, dur: 2.0, delay: 0 }],
  [
    { size: 13, left: '6%', dir: 1, dur: 2.2, delay: 0 },
    { size: 10, left: '-2%', dir: 1, dur: 2.2, delay: 0.18 },
  ],
  [
    { size: 36, left: '86%', dir: -1, dur: 2.1, delay: 0 },
    { size: 14, left: '96%', dir: -1, dur: 2.1, delay: 0.15 },
    { size: 8, left: '101%', dir: -1, dur: 2.1, delay: 0.3 },
  ],
  [{ size: 56, left: '0%', dir: 1, dur: 2.8, delay: 0, rock: true }],
  [
    { size: 34, left: '84%', dir: -1, dur: 2.1, delay: 0 },
    { size: 10, left: '96%', dir: -1, dur: 2.1, delay: 0.3 },
  ],
  [
    { size: 12, left: '44%', dir: 1, dur: 1.8, delay: 0 },
    { size: 12, left: '50%', dir: -1, dur: 1.8, delay: 0 },
  ],
  [
    { size: 30, left: '78%', dir: -1, dur: 2.4, delay: 0, rock: true },
    { size: 11, left: '8%', dir: 1, dur: 2.4, delay: 0.2, rock: true },
  ],
];

// ─────────────────────────── Web Dev (devShark) ───────────────────────────
// Full real data (real level names + real Level-1 questions), matching the
// devShark landing reference. Logos come from CategoryGlyph (bundled devicon).
const WEBDEV: LandingTopic[] = [
  {
    id: 'javascript', name: 'JavaScript',
    blurb: 'The language of the web: syntax, functions, closures, async and the event loop.',
    levels: ['Values & Math', 'Strings', 'Booleans & Comparison', 'Arrays', 'Objects'],
    question: { text: 'What does this return?', code: '2 ** 3;', opts: ['6', '8', '9', '5'], a: 1, e: 'The ** operator is exponentiation: 2 to the power of 3 is 8.' },
    fins: SCHOOLS[0],
  },
  {
    id: 'typescript', name: 'TypeScript',
    blurb: 'Typed JavaScript: interfaces, generics, narrowing and safer refactors.',
    levels: ['Basic Types', 'Type Inference', 'Function Types', 'Arrays & Tuples', 'Object Types'],
    question: { text: 'What is the type of x?', code: 'let x: number = 5;', opts: ['number', 'string', 'any', '5'], a: 0, e: 'The annotation : number declares x as the number type.' },
    fins: SCHOOLS[1],
  },
  {
    id: 'react', name: 'React',
    blurb: 'Components, hooks, state and rendering — the modern frontend workhorse.',
    levels: ['JSX Basics', 'Components', 'Props', 'Rendering Lists', 'Conditional Rendering'],
    question: { text: 'What is rendered?', code: '<div>{2 + 2}</div>;', opts: ['"2 + 2"', '4', '{4}', 'an error'], a: 1, e: 'The expression inside braces is evaluated, so the div shows 4.' },
    fins: SCHOOLS[2],
  },
  {
    id: 'nextjs', name: 'Next.js',
    blurb: 'The React framework: routing, server components, rendering strategies.',
    levels: ['Next.js Basics', 'Routing (App Router)', 'Pages & Layouts', 'Navigation & Links', 'Server & Client Components'],
    question: { text: 'What is Next.js?', opts: ['A CSS framework', 'A React framework for production web apps', 'A database', 'A testing library'], a: 1, e: 'Next.js is a React framework that adds routing, rendering (SSR/SSG), and tooling for production apps.' },
    fins: SCHOOLS[3],
  },
  {
    id: 'nodejs', name: 'Node.js',
    blurb: 'JavaScript on the server: the runtime, modules, streams and APIs.',
    levels: ['Node Basics', 'Modules (CommonJS)', 'ES Modules', 'Globals & process', 'The Event Loop'],
    question: { text: 'Which JavaScript engine powers Node.js?', opts: ['SpiderMonkey', 'Chakra', 'V8', 'JavaScriptCore'], a: 2, e: "Node.js embeds Google's V8 engine, the same one used by Chrome." },
    fins: SCHOOLS[4],
  },
  {
    id: 'html', name: 'HTML',
    blurb: 'The structure of every page: semantics, forms, media and accessibility.',
    levels: ['HTML Basics', 'Document Structure', 'Text Elements', 'Links & Images', 'Lists'],
    question: { text: 'What does HTML stand for?', opts: ['HyperText Markup Language', 'Hyperlink Text Mode Language', 'High-level Text Markup', 'Home Tool Markup Language'], a: 0, e: 'HTML is HyperText Markup Language — the markup that structures web pages.' },
    fins: SCHOOLS[5],
  },
  {
    id: 'css', name: 'CSS',
    blurb: 'Layout, flexbox, grid, cascade and responsive design.',
    levels: ['How CSS Works', 'Selectors & Applying Classes', 'The Box Model & Spacing', 'Layout with Flexbox', 'Layout with Grid & Responsive Design'],
    question: { text: 'What is the main job of CSS?', opts: ['Structuring content', 'Controlling how content looks and is laid out', 'Adding interactivity', 'Storing data'], a: 1, e: 'HTML is structure, JavaScript is behaviour, and CSS is presentation — colours, spacing, and layout.' },
    fins: SCHOOLS[6],
  },
];

/** Featured topics, in landing display order. */
export const LANDING_TOPICS: Record<SubjectId, LandingTopic[]> = {
  webdev: WEBDEV,
};
