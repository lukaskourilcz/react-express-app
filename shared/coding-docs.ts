/** Reference documentation for the techniques a coding task practises.
 *
 * Two jobs, deliberately separated:
 *
 *   - `taskResources` backs the Resources panel, which is open from the moment
 *     a task loads. Looking something up is not asking for help, so it costs no
 *     hint rung and needs no failed attempt first. It lists every technique the
 *     task declares, not just the first.
 *   - `docsFor` still backs the hint ladder's last rung before the solution.
 *
 * Nothing here contains a solution or a hidden test. Each entry names a
 * published reference page, the page's own title, which reference it comes
 * from, one authored line on what the learner will find there, and the date the
 * link was last checked. Every blurb is written for this product; none of it is
 * copied from the page it points at. */

import type { Localized } from './coding-catalog';

const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference';
const MDN_DOCS = 'https://developer.mozilla.org/en-US/docs';
const REACT = 'https://react.dev/reference/react';
const REACT_LEARN = 'https://react.dev/learn';
const TS = 'https://www.typescriptlang.org/docs/handbook';

export type DocSource = 'MDN' | 'React' | 'TypeScript';

export interface CodingDocLink {
  /** The technique tag this page documents. */
  tag: string;
  url: string;
  /** The page's own title. Not translated — it is the name of the page. */
  title: string;
  source: DocSource;
  /** One authored line on what is there, in both languages. */
  blurb: Localized;
  /** ISO date the link and title were last checked. */
  reviewed: string;
}

const REVIEWED = '2026-09-08';

type Row = [tag: string, url: string, title: string, source: DocSource, en: string, cs: string];

const ROWS: Row[] = [
  // ── loops and traversal ────────────────────────────────────────────────
  ['for', `${MDN}/Statements/for`, 'for', 'MDN', 'The three-part loop, and what each part runs when.', 'Tříčlenný cyklus a co se kdy vyhodnotí.'],
  ['while', `${MDN}/Statements/while`, 'while', 'MDN', 'Looping while a condition holds, and how to avoid never ending.', 'Cyklus, dokud platí podmínka, a jak se vyhnout nekonečnu.'],
  ['do-while', `${MDN}/Statements/do...while`, 'do...while', 'MDN', 'The loop that always runs its body at least once.', 'Cyklus, který tělo provede vždy aspoň jednou.'],
  ['for-of', `${MDN}/Statements/for...of`, 'for...of', 'MDN', 'Iterating values of arrays, strings, Maps and Sets.', 'Procházení hodnot polí, řetězců, Map a Setů.'],
  ['for-in', `${MDN}/Statements/for...in`, 'for...in', 'MDN', 'Iterating object keys, including the inherited ones.', 'Procházení klíčů objektu včetně zděděných.'],
  ['nested-loops', `${MDN}/Statements/for`, 'for', 'MDN', 'The same loop statement, applied one inside another.', 'Tentýž cyklus, jen jeden uvnitř druhého.'],
  ['two-pointer', `${MDN}/Global_Objects/Array`, 'Array', 'MDN', 'Indexing and length — what a two-pointer walk is built on.', 'Indexy a length — základ procházení dvěma ukazateli.'],
  // ── arrays ─────────────────────────────────────────────────────────────
  ['map', `${MDN}/Global_Objects/Array/map`, 'Array.prototype.map()', 'MDN', 'A new array of the same length, one result per element.', 'Nové pole stejné délky, jeden výsledek na prvek.'],
  ['filter', `${MDN}/Global_Objects/Array/filter`, 'Array.prototype.filter()', 'MDN', 'Keeping the elements a test accepts.', 'Ponechá prvky, které projdou testem.'],
  ['reduce', `${MDN}/Global_Objects/Array/reduce`, 'Array.prototype.reduce()', 'MDN', 'Folding an array to one value, and why the initial value matters.', 'Složení pole do jedné hodnoty a proč záleží na počáteční hodnotě.'],
  ['find', `${MDN}/Global_Objects/Array/find`, 'Array.prototype.find()', 'MDN', 'The first matching element, or undefined.', 'První odpovídající prvek, nebo undefined.'],
  ['findIndex', `${MDN}/Global_Objects/Array/findIndex`, 'Array.prototype.findIndex()', 'MDN', 'The first matching index, or -1.', 'Index prvního odpovídajícího prvku, nebo -1.'],
  ['some', `${MDN}/Global_Objects/Array/some`, 'Array.prototype.some()', 'MDN', 'Whether at least one element passes, stopping early.', 'Zda projde aspoň jeden prvek; končí co nejdřív.'],
  ['every', `${MDN}/Global_Objects/Array/every`, 'Array.prototype.every()', 'MDN', 'Whether all elements pass, including the empty-array answer.', 'Zda projdou všechny prvky, včetně odpovědi pro prázdné pole.'],
  ['includes', `${MDN}/Global_Objects/Array/includes`, 'Array.prototype.includes()', 'MDN', 'Membership by value, and how it treats NaN.', 'Hledání podle hodnoty a jak zachází s NaN.'],
  ['indexOf', `${MDN}/Global_Objects/Array/indexOf`, 'Array.prototype.indexOf()', 'MDN', 'Position by strict equality, or -1.', 'Pozice podle striktní rovnosti, nebo -1.'],
  ['push', `${MDN}/Global_Objects/Array/push`, 'Array.prototype.push()', 'MDN', 'Appending in place, and what it returns.', 'Přidání na konec na místě a co vrací.'],
  ['pop', `${MDN}/Global_Objects/Array/pop`, 'Array.prototype.pop()', 'MDN', 'Removing the last element in place.', 'Odebrání posledního prvku na místě.'],
  ['shift', `${MDN}/Global_Objects/Array/shift`, 'Array.prototype.shift()', 'MDN', 'Removing the first element — and why everything after it moves.', 'Odebrání prvního prvku — a proč se všechno za ním posune.'],
  ['unshift', `${MDN}/Global_Objects/Array/unshift`, 'Array.prototype.unshift()', 'MDN', 'Inserting at the front, with the same shifting cost.', 'Vložení na začátek se stejnou cenou posunu.'],
  ['splice', `${MDN}/Global_Objects/Array/splice`, 'Array.prototype.splice()', 'MDN', 'Removing and inserting in place; it mutates.', 'Odebírá a vkládá na místě; mění původní pole.'],
  ['slice', `${MDN}/Global_Objects/Array/slice`, 'Array.prototype.slice()', 'MDN', 'A copied range; the original is untouched.', 'Zkopírovaný úsek; původní pole zůstává.'],
  ['sort', `${MDN}/Global_Objects/Array/sort`, 'Array.prototype.sort()', 'MDN', 'Sorting in place, the default string order, and comparators.', 'Řazení na místě, výchozí řetězcové pořadí a komparátory.'],
  ['flat', `${MDN}/Global_Objects/Array/flat`, 'Array.prototype.flat()', 'MDN', 'Flattening nested arrays to a chosen depth.', 'Zploštění vnořených polí do zvolené hloubky.'],
  ['forEach', `${MDN}/Global_Objects/Array/forEach`, 'Array.prototype.forEach()', 'MDN', 'Running a function per element, returning nothing.', 'Spustí funkci na každý prvek a nic nevrací.'],
  ['concat', `${MDN}/Global_Objects/Array/concat`, 'Array.prototype.concat()', 'MDN', 'Joining arrays into a new one.', 'Spojení polí do nového pole.'],
  ['join', `${MDN}/Global_Objects/Array/join`, 'Array.prototype.join()', 'MDN', 'Array to string, and what happens to null and undefined.', 'Pole na řetězec a co se stane s null a undefined.'],
  ['pagination', `${MDN}/Global_Objects/Array/slice`, 'Array.prototype.slice()', 'MDN', 'Ranges by index — the arithmetic behind a page of results.', 'Úseky podle indexu — počty za jednou stránkou výsledků.'],
  // ── strings, objects, structures ───────────────────────────────────────
  ['strings', `${MDN}/Global_Objects/String`, 'String', 'MDN', 'String methods, and the fact that none of them mutate.', 'Metody řetězců a to, že žádná nemění původní hodnotu.'],
  ['split', `${MDN}/Global_Objects/String/split`, 'String.prototype.split()', 'MDN', 'Splitting on a separator, including the empty-string case.', 'Rozdělení podle oddělovače, včetně prázdného řetězce.'],
  ['regex', `${MDN}/Global_Objects/RegExp`, 'RegExp', 'MDN', 'Patterns, flags and the stateful g flag.', 'Vzory, příznaky a stavový příznak g.'],
  ['objects', `${MDN}/Global_Objects/Object`, 'Object', 'MDN', 'Keys, values, entries and copying.', 'Klíče, hodnoty, dvojice a kopírování.'],
  ['destructuring', `${MDN}/Operators/Destructuring`, 'Destructuring', 'MDN', 'Pulling values out of arrays and objects, with defaults.', 'Vytažení hodnot z polí a objektů, i s výchozími hodnotami.'],
  ['spread', `${MDN}/Operators/Spread_syntax`, 'Spread syntax (...)', 'MDN', 'Copying and combining — and that the copy is shallow.', 'Kopírování a slučování — a že kopie je mělká.'],
  ['map-set', `${MDN}/Global_Objects/Map`, 'Map', 'MDN', 'Keyed lookup with any key type, and insertion order.', 'Vyhledávání podle klíče libovolného typu a pořadí vkládání.'],
  ['json', `${MDN}/Global_Objects/JSON`, 'JSON', 'MDN', 'Parsing and stringifying, and what does not survive the trip.', 'Parsování a serializace a co cestu nepřežije.'],
  // ── functions and asynchrony ───────────────────────────────────────────
  ['functions', `${MDN}/Functions`, 'Functions', 'MDN', 'Parameters, defaults, rest and return values.', 'Parametry, výchozí hodnoty, rest a návratové hodnoty.'],
  ['closures', `${MDN_DOCS}/Web/JavaScript/Guide/Closures`, 'Closures', 'MDN', 'What a function keeps hold of after it is created.', 'Co si funkce po vytvoření drží.'],
  ['higher-order', `${MDN}/Functions/Arrow_functions`, 'Arrow functions', 'MDN', 'Functions passed as values, and how arrows bind this.', 'Funkce jako hodnoty a jak šipkové funkce váží this.'],
  ['recursion', `${MDN_DOCS}/Glossary/Recursion`, 'Recursion', 'MDN', 'Base case and recursive case, and why both are needed.', 'Základní a rekurzivní případ a proč jsou potřeba oba.'],
  ['callbacks', `${MDN_DOCS}/Glossary/Callback_function`, 'Callback function', 'MDN', 'Functions called back later, synchronously or not.', 'Funkce volané později, synchronně i asynchronně.'],
  ['promises', `${MDN}/Global_Objects/Promise`, 'Promise', 'MDN', 'States, chaining, and handling rejection.', 'Stavy, řetězení a zpracování odmítnutí.'],
  ['async-await', `${MDN}/Statements/async_function`, 'async function', 'MDN', 'Awaiting values, and what an async function really returns.', 'Čekání na hodnoty a co async funkce vlastně vrací.'],
  ['timers', `${MDN_DOCS}/Web/API/Window/setTimeout`, 'setTimeout()', 'MDN', 'Scheduling later work, and clearing it again.', 'Naplánování pozdější práce a její zrušení.'],
  ['fetch', `${MDN_DOCS}/Web/API/Fetch_API/Using_Fetch`, 'Using the Fetch API', 'MDN', 'Requests, responses, and why a 404 does not reject.', 'Požadavky, odpovědi a proč 404 neznamená odmítnutí.'],
  ['abort', `${MDN_DOCS}/Web/API/AbortController`, 'AbortController', 'MDN', 'Cancelling in-flight work when it is no longer wanted.', 'Zrušení běžící práce, když už není potřeba.'],
  // ── TypeScript ─────────────────────────────────────────────────────────
  ['annotations', `${TS}/2/everyday-types.html`, 'Everyday Types', 'TypeScript', 'The types you annotate with most of the time.', 'Typy, kterými se anotuje nejčastěji.'],
  ['interfaces', `${TS}/2/objects.html`, 'Object Types', 'TypeScript', 'Describing the shape of an object.', 'Popis tvaru objektu.'],
  ['unions', `${TS}/2/everyday-types.html#union-types`, 'Union Types', 'TypeScript', 'A value that may be one of several types.', 'Hodnota, která může být jedním z několika typů.'],
  ['literal-types', `${TS}/2/everyday-types.html#literal-types`, 'Literal Types', 'TypeScript', 'Exact values as types, and where widening happens.', 'Konkrétní hodnoty jako typy a kde dochází k rozšíření.'],
  ['tuples', `${TS}/2/objects.html#tuple-types`, 'Tuple Types', 'TypeScript', 'Fixed-length arrays with a type per position.', 'Pole pevné délky s typem pro každou pozici.'],
  ['optional', `${TS}/2/objects.html#optional-properties`, 'Optional Properties', 'TypeScript', 'Properties that may be absent, and undefined.', 'Vlastnosti, které mohou chybět, a undefined.'],
  ['readonly', `${TS}/2/objects.html#readonly-properties`, 'readonly Properties', 'TypeScript', 'What readonly does check, and what it does not.', 'Co readonly kontroluje a co ne.'],
  ['narrowing', `${TS}/2/narrowing.html`, 'Narrowing', 'TypeScript', 'How checks in code narrow a union.', 'Jak kontroly v kódu zužují sjednocení typů.'],
  ['type-guards', `${TS}/2/narrowing.html#using-type-predicates`, 'Type Predicates', 'TypeScript', 'Writing a function the compiler trusts to narrow.', 'Funkce, které kompilátor věří při zúžení typu.'],
  ['generics', `${TS}/2/generics.html`, 'Generics', 'TypeScript', 'Types that carry a type through.', 'Typy, které propouštějí typ dál.'],
  ['constraints', `${TS}/2/generics.html#generic-constraints`, 'Generic Constraints', 'TypeScript', 'Requiring something of a type parameter.', 'Požadavky kladené na typový parametr.'],
  ['keyof', `${TS}/2/keyof-types.html`, 'keyof Type Operator', 'TypeScript', 'The union of an object type’s keys.', 'Sjednocení klíčů objektového typu.'],
  ['utility-types', `${TS}/utility-types.html`, 'Utility Types', 'TypeScript', 'Partial, Pick, Omit and the rest.', 'Partial, Pick, Omit a další.'],
  ['record', `${TS}/utility-types.html#recordkeys-type`, 'Record<Keys, Type>', 'TypeScript', 'A map type keyed by a known set of keys.', 'Typ mapy s předem známou sadou klíčů.'],
  // ── React ──────────────────────────────────────────────────────────────
  ['useState', `${REACT}/useState`, 'useState', 'React', 'State updates, batching, and the updater function.', 'Aktualizace stavu, dávkování a updater funkce.'],
  ['useEffect', `${REACT}/useEffect`, 'useEffect', 'React', 'When effects run, and what the dependency array means.', 'Kdy efekty běží a co znamená pole závislostí.'],
  ['useRef', `${REACT}/useRef`, 'useRef', 'React', 'A value that survives renders without causing one.', 'Hodnota, která přežije render a sama ho nevyvolá.'],
  ['useReducer', `${REACT}/useReducer`, 'useReducer', 'React', 'State transitions as one function.', 'Přechody stavu jako jedna funkce.'],
  ['useContext', `${REACT}/useContext`, 'useContext', 'React', 'Reading context, and what makes consumers re-render.', 'Čtení kontextu a co způsobí překreslení konzumentů.'],
  ['useMemo', `${REACT}/useMemo`, 'useMemo', 'React', 'Caching a computed value between renders.', 'Uložení vypočítané hodnoty mezi rendery.'],
  ['custom-hook', `${REACT_LEARN}/reusing-logic-with-custom-hooks`, 'Reusing Logic with Custom Hooks', 'React', 'Extracting stateful logic without sharing state.', 'Vytažení stavové logiky bez sdílení stavu.'],
  ['effect-cleanup', `${REACT_LEARN}/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development`, 'Synchronizing with Effects', 'React', 'Why cleanup exists and why effects run twice in development.', 'Proč existuje úklid a proč efekty ve vývoji běží dvakrát.'],
  ['jsx', `${REACT_LEARN}/writing-markup-with-jsx`, 'Writing Markup with JSX', 'React', 'The rules JSX adds on top of HTML.', 'Pravidla, která JSX přidává nad HTML.'],
  ['lists-keys', `${REACT_LEARN}/rendering-lists`, 'Rendering Lists', 'React', 'Why keys exist and what makes a stable one.', 'Proč existují klíče a co dělá klíč stabilním.'],
  ['conditional', `${REACT_LEARN}/conditional-rendering`, 'Conditional Rendering', 'React', 'Rendering branches, and the zero that renders.', 'Větvení při renderu a nula, která se vykreslí.'],
  ['forms', 'https://react.dev/reference/react-dom/components/input', '<input>', 'React', 'Controlled inputs, value and onChange.', 'Řízené vstupy, value a onChange.'],
  ['events', `${REACT_LEARN}/responding-to-events`, 'Responding to Events', 'React', 'Handlers, arguments and propagation.', 'Obsluhy, argumenty a probublávání.'],
  ['derived-state', `${REACT_LEARN}/choosing-the-state-structure`, 'Choosing the State Structure', 'React', 'What to store, and what to compute during render.', 'Co ukládat a co počítat při renderu.'],
  // ── the web around the code ────────────────────────────────────────────
  ['accessibility', `${MDN_DOCS}/Web/Accessibility/ARIA`, 'ARIA', 'MDN', 'Roles, states and properties — and using native elements first.', 'Role, stavy a vlastnosti — a proč nejdřív nativní prvky.'],
  ['estimation', `${MDN_DOCS}/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview`, 'Client-Server overview', 'MDN', 'What a request costs and where the work happens.', 'Co stojí požadavek a kde se práce odehrává.'],
  ['caching', `${MDN_DOCS}/Web/HTTP/Guides/Caching`, 'HTTP caching', 'MDN', 'Freshness, validation and what may be stored.', 'Aktuálnost, validace a co se smí ukládat.'],
  ['auth', `${MDN_DOCS}/Web/HTTP/Guides/Authentication`, 'HTTP authentication', 'MDN', 'Proving who is asking, before deciding what they may do.', 'Doložení, kdo se ptá, ještě před rozhodnutím, co smí.'],
  ['networking', `${MDN_DOCS}/Web/HTTP/Guides/Overview`, 'An overview of HTTP', 'MDN', 'Methods, status codes and headers.', 'Metody, stavové kódy a hlavičky.'],
  ['request-flow', `${MDN_DOCS}/Web/HTTP/Guides/Overview`, 'An overview of HTTP', 'MDN', 'The path a request takes and where it can fail.', 'Cesta požadavku a kde může selhat.'],
  ['data-model', `${MDN_DOCS}/Glossary/Database`, 'Database', 'MDN', 'What a store is for, before choosing which one.', 'K čemu je úložiště, ještě než se vybere které.'],
];

const BY_TAG = new Map<string, CodingDocLink>(
  ROWS.map(([tag, url, title, source, en, cs]) => [tag, { tag, url, title, source, blurb: { en, cs }, reviewed: REVIEWED }]),
);

/** Every documentation entry, for the readiness report and the tests. */
export const CODING_DOC_LINKS: readonly CodingDocLink[] = [...BY_TAG.values()];

/** The URL map the older callers still read. */
export const CODING_DOCS: Record<string, string> = Object.fromEntries(
  [...BY_TAG.entries()].map(([tag, entry]) => [tag, entry.url]),
);

/** The JavaScript reference, used when a task declares nothing we document. */
export const CODING_DOCS_FALLBACK: CodingDocLink = {
  tag: 'javascript',
  url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  title: 'JavaScript',
  source: 'MDN',
  blurb: { en: 'The language reference, from the top.', cs: 'Referenční příručka jazyka od začátku.' },
  reviewed: REVIEWED,
};

/**
 * Every documented technique a task practises, in the order the task declares
 * them. Empty when nothing it declares is documented — the panel then says so
 * rather than padding the list with a link that is not about this task.
 */
export function taskResources(focus: readonly string[]): CodingDocLink[] {
  const seen = new Set<string>();
  const out: CodingDocLink[] = [];
  for (const tag of focus) {
    const entry = BY_TAG.get(tag);
    if (!entry || seen.has(entry.url)) continue;
    seen.add(entry.url);
    out.push(entry);
  }
  return out;
}

/** The first documented technique of a task, or the JavaScript reference.
 * Still the hint ladder's last rung before the solution. */
export function docsFor(focus: readonly string[]): { tag: string; url: string } {
  const [first] = taskResources(focus);
  return first ? { tag: first.tag, url: first.url } : { tag: CODING_DOCS_FALLBACK.tag, url: CODING_DOCS_FALLBACK.url };
}
