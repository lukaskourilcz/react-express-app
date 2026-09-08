/** Concepts, and the ones worth practising against each other.
 *
 * A category is a shelf: "javascript" says where a question lives, not what it
 * teaches. Scheduling and interleaving both need the smaller unit — the thing
 * being assessed — so this file names it, and names which of them are worth
 * putting side by side.
 *
 * The pedagogical claim is narrow and it is the only one made here: when two
 * ideas are confusable, practising them apart teaches each one and practising
 * them together teaches which one applies. Learners who only ever meet `reduce`
 * in a block of `reduce` questions get very good at reaching for `reduce`.
 *
 * What this file is not: it is not a taxonomy of everything devShark teaches,
 * and it does not try to be. A question that belongs to no concept here is
 * simply scheduled and ordered as an ordinary item. Adding a group is authoring
 * work — the coverage and the gaps are written down in
 * docs/practice-scheduling.md rather than inferred from how full this file
 * looks.
 *
 * Concepts are resolved from tags the question banks already carry, so nothing
 * here duplicates authoring that exists. A tag set that does not distinguish
 * two ideas — linear search from binary search, say — does not get a group
 * pretending it does. */

/** One idea a question can be about. */
export interface Concept {
  id: string;
  /** The category its questions live in. A concept never spans categories:
   * that would let a mix pull in a topic the learner has not unlocked. */
  topic: string;
  label: { en: string; cs: string };
  /** Tags that identify a question as being about this concept. A question
   * matches when it carries any of them. */
  tags: readonly string[];
}

/** Concepts that are worth practising against each other, and why. */
export interface ConceptGroup {
  id: string;
  topic: string;
  label: { en: string; cs: string };
  /** What choosing between these actually is, in one line. Shown to the
   * learner as the reason a session is mixed. */
  contrast: { en: string; cs: string };
  concepts: readonly Concept[];
}

const g = (
  id: string,
  topic: string,
  label: { en: string; cs: string },
  contrast: { en: string; cs: string },
  concepts: readonly [string, string, string, readonly string[]][],
): ConceptGroup => ({
  id,
  topic,
  label,
  contrast,
  concepts: concepts.map(([cid, en, cs, tags]) => ({
    id: cid,
    topic,
    label: { en, cs },
    tags,
  })),
});

export const CONCEPT_GROUPS: readonly ConceptGroup[] = [
  g('js-array-transform', 'javascript',
    { en: 'Transforming an array', cs: 'Práce s polem' },
    { en: 'Each of these walks the array once. What differs is what you get back.',
      cs: 'Každá z nich projde pole jednou. Liší se tím, co vrátí.' },
    [
      ['js-map', 'map', 'map', ['map']],
      ['js-filter', 'filter', 'filter', ['filter']],
      ['js-reduce', 'reduce', 'reduce', ['reduce']],
    ]),
  g('js-async', 'javascript',
    { en: 'Sequencing asynchronous work', cs: 'Řazení asynchronní práce' },
    { en: 'Three ways to say "later". They differ in how failure travels.',
      cs: 'Tři způsoby, jak říct „později“. Liší se tím, kudy putuje chyba.' },
    [
      ['js-callbacks', 'Callbacks', 'Callbacky', ['Callbacks']],
      ['js-promises', 'Promises', 'Promises', ['Promises']],
      ['js-async-await', 'async / await', 'async / await', ['async']],
    ]),
  g('js-equality', 'javascript',
    { en: 'Equality and truthiness', cs: 'Rovnost a pravdivost' },
    { en: 'Whether two values are equal, and whether one is "true enough", are different questions.',
      cs: 'Jestli se dvě hodnoty rovnají a jestli je jedna „dost pravdivá“, jsou dvě různé otázky.' },
    [
      ['js-comparison', 'Comparison', 'Porovnávání', ['Comparison']],
      ['js-coercion', 'Coercion', 'Převody typů', ['Coercion']],
      ['js-truthy', 'Truthiness', 'Pravdivost', ['Truthy', 'Nullish']],
    ]),
  g('ts-shape', 'typescript',
    { en: 'Describing a shape', cs: 'Popis tvaru' },
    { en: 'Three ways to name a type. Which one you reach for changes what you can do next.',
      cs: 'Tři způsoby, jak pojmenovat typ. Volba mění, co s ním jde dělat dál.' },
    [
      ['ts-interfaces', 'Interfaces', 'Rozhraní', ['Interfaces']],
      ['ts-aliases', 'Type aliases', 'Aliasy typů', ['Type aliases']],
      ['ts-unions', 'Unions', 'Sjednocení', ['Unions']],
    ]),
  g('ts-narrowing', 'typescript',
    { en: 'Proving a type at runtime', cs: 'Zúžení typu za běhu' },
    { en: 'The compiler believes what it can check. These are the two ways of showing it.',
      cs: 'Kompilátor věří tomu, co si ověří. Tohle jsou dva způsoby, jak mu to ukázat.' },
    [
      ['ts-narrowing', 'Narrowing', 'Zužování', ['Narrowing']],
      ['ts-guards', 'Type guards', 'Typové stráže', ['Type guards']],
    ]),
  g('react-state', 'react',
    { en: 'Holding state', cs: 'Držení stavu' },
    { en: 'One value or a set of transitions — the choice is about how the updates relate.',
      cs: 'Jedna hodnota, nebo sada přechodů — jde o to, jak spolu změny souvisí.' },
    [
      ['react-usestate', 'useState', 'useState', ['useState']],
      ['react-usereducer', 'useReducer', 'useReducer', ['useReducer']],
      ['react-derived', 'Derived state', 'Odvozený stav', ['Derived state']],
    ]),
  g('react-memo', 'react',
    { en: 'Memoising', cs: 'Memoizace' },
    { en: 'One caches a value, one caches a function. Mixing them up is the classic mistake.',
      cs: 'Jedno ukládá hodnotu, druhé funkci. Zaměnit je je klasická chyba.' },
    [
      ['react-usememo', 'useMemo', 'useMemo', ['useMemo']],
      ['react-usecallback', 'useCallback', 'useCallback', ['useCallback']],
    ]),
  g('react-effects', 'react',
    { en: 'When an effect is the wrong tool', cs: 'Kdy efekt není správný nástroj' },
    { en: 'Most of what people put in an effect belongs in an event handler instead.',
      cs: 'Většina toho, co lidé dávají do efektu, patří spíš do obsluhy události.' },
    [
      // `Cleanup` is deliberately not a concept of its own: every question
      // carrying it also carries `useEffect`, which resolves first, so a
      // separate concept would match nothing and be practised never.
      ['react-useeffect', 'useEffect', 'useEffect', ['useEffect', 'Cleanup']],
      ['react-events', 'Events', 'Události', ['Events']],
    ]),
  g('css-layout', 'css',
    { en: 'Laying out a page', cs: 'Rozvržení stránky' },
    { en: 'One arranges along a line, one arranges on a plane. Most layouts want both.',
      cs: 'Jedno řadí po přímce, druhé po ploše. Většina rozvržení chce obojí.' },
    [
      ['css-flexbox', 'Flexbox', 'Flexbox', ['Flexbox']],
      ['css-grid', 'Grid', 'Grid', ['Grid']],
    ]),
  g('css-stacking', 'css',
    { en: 'Taking an element out of flow', cs: 'Vyjmutí prvku z toku' },
    { en: 'Where it sits and what it sits on top of are decided by different rules.',
      cs: 'Kde prvek je a přes co leží, rozhodují různá pravidla.' },
    [
      ['css-positioning', 'Positioning', 'Pozicování', ['Positioning']],
      ['css-stacking', 'Stacking', 'Vrstvení', ['Stacking']],
    ]),
  g('dsa-linear', 'dsa',
    { en: 'Which end you take from', cs: 'Z kterého konce bereš' },
    { en: 'Same storage, opposite discipline — and the discipline is the whole point.',
      cs: 'Stejné úložiště, opačná disciplína — a právě o tu disciplínu jde.' },
    [
      ['dsa-stacks', 'Stacks', 'Zásobníky', ['Stacks']],
      ['dsa-queues', 'Queues', 'Fronty', ['Queues']],
    ]),
  g('dsa-lookup', 'dsa',
    { en: 'Finding something again', cs: 'Najít něco znovu' },
    { en: 'Index, key or scan — the cost of the lookup is what separates them.',
      cs: 'Index, klíč, nebo průchod — liší se cenou vyhledání.' },
    [
      ['dsa-arrays', 'Arrays', 'Pole', ['Arrays']],
      ['dsa-hash', 'Hash tables', 'Hašovací tabulky', ['Hash Tables']],
      ['dsa-searching', 'Searching', 'Vyhledávání', ['Searching']],
    ]),
  g('dsa-order', 'dsa',
    { en: 'Order and what it buys', cs: 'Uspořádání a co přináší' },
    { en: 'Sorting costs once; the searches it makes possible are cheap forever after.',
      cs: 'Seřazení stojí jednou; vyhledávání, která umožní, jsou pak už levná.' },
    [
      ['dsa-sorting', 'Sorting', 'Řazení', ['Sorting']],
      ['dsa-complexity', 'Complexity', 'Složitost', ['Complexity', 'Big-O']],
    ]),
  g('dsa-linked', 'dsa',
    { en: 'Structures with links in them', cs: 'Struktury s odkazy' },
    { en: 'One parent, many parents, or none — the shape decides how you walk it.',
      cs: 'Jeden rodič, mnoho rodičů, nebo žádný — tvar rozhoduje, jak jím projdeš.' },
    [
      ['dsa-lists', 'Linked lists', 'Spojové seznamy', ['Linked Lists']],
      ['dsa-trees', 'Trees', 'Stromy', ['Trees', 'BST']],
      ['dsa-graphs', 'Graphs', 'Grafy', ['Graphs']],
    ]),
  g('sec-identity', 'security',
    { en: 'Who you are and what you may do', cs: 'Kdo jsi a co smíš' },
    { en: 'Proving identity and granting permission are separate, and confusing them is a vulnerability.',
      cs: 'Prokázat identitu a udělit oprávnění jsou dvě věci; jejich záměna je zranitelnost.' },
    [
      ['sec-authn', 'Authentication', 'Autentizace', ['AuthN']],
      ['sec-authz', 'Authorization', 'Autorizace', ['AuthZ']],
    ]),
  g('sec-injection', 'security',
    { en: 'Content that came from somewhere else', cs: 'Obsah odjinud' },
    { en: 'Three attacks with three different fixes, and they are regularly mistaken for one.',
      cs: 'Tři útoky se třemi různými opravami, které se pravidelně pletou dohromady.' },
    [
      ['sec-injection', 'Injection', 'Injekce', ['Injection']],
      ['sec-xss', 'XSS', 'XSS', ['XSS']],
      ['sec-csrf', 'CSRF', 'CSRF', ['CSRF']],
    ]),
  g('db-model', 'databases',
    { en: 'How the data is shaped', cs: 'Jak jsou data tvarovaná' },
    { en: 'The model decides which queries are cheap, which is a design decision and not a preference.',
      cs: 'Model rozhoduje, které dotazy jsou levné — to je návrhové rozhodnutí, ne otázka vkusu.' },
    [
      ['db-sql', 'SQL', 'SQL', ['SQL']],
      ['db-nosql', 'NoSQL', 'NoSQL', ['NoSQL']],
    ]),
  g('db-cost', 'databases',
    { en: 'Why a query is slow', cs: 'Proč je dotaz pomalý' },
    { en: 'A missing index and a query in a loop feel identical from the outside.',
      cs: 'Chybějící index a dotaz ve smyčce vypadají zvenku stejně.' },
    [
      ['db-indexing', 'Indexing', 'Indexy', ['Indexing']],
      ['db-nplus1', 'N+1', 'N+1', ['N+1']],
    ]),
  g('node-io', 'nodejs',
    { en: 'Moving bytes', cs: 'Přesun bajtů' },
    { en: 'One holds bytes, one delivers them over time. The choice is about how much memory you need at once.',
      cs: 'Jedno drží bajty, druhé je doručuje v čase. Jde o to, kolik paměti potřebuješ naráz.' },
    [
      ['node-buffers', 'Buffers', 'Buffery', ['Buffers']],
      ['node-streams', 'Streams', 'Streamy', ['Streams']],
    ]),
  g('sd-copies', 'system-design',
    { en: 'More than one copy', cs: 'Víc než jedna kopie' },
    { en: 'Copying the same data and splitting different data solve different problems.',
      cs: 'Kopírovat stejná data a rozdělit různá data řeší různé problémy.' },
    [
      ['sd-replication', 'Replication', 'Replikace', ['Replication']],
      ['sd-sharding', 'Sharding', 'Sharding', ['Sharding']],
      ['sd-caching', 'Caching', 'Cachování', ['Caching', 'CDN']],
    ]),
];

/* ── resolution ────────────────────────────────────────────────────────── */

const CONCEPTS: readonly Concept[] = CONCEPT_GROUPS.flatMap((group) => group.concepts);

const BY_ID = new Map(CONCEPTS.map((concept) => [concept.id, concept]));
const GROUP_OF = new Map<string, ConceptGroup>(
  CONCEPT_GROUPS.flatMap((group) => group.concepts.map((concept) => [concept.id, group] as const)),
);
// topic → [tag → concept id], so resolution is a lookup rather than a scan.
const BY_TOPIC_TAG = new Map<string, Map<string, string>>();
for (const concept of CONCEPTS) {
  const tags = BY_TOPIC_TAG.get(concept.topic) ?? new Map<string, string>();
  for (const tag of concept.tags) if (!tags.has(tag)) tags.set(tag, concept.id);
  BY_TOPIC_TAG.set(concept.topic, tags);
}

export const conceptById = (id: string): Concept | null => BY_ID.get(id) ?? null;
export const groupOfConcept = (id: string): ConceptGroup | null => GROUP_OF.get(id) ?? null;

/**
 * The concept an item is about, or null.
 *
 * Deterministic: the first tag of the item that names a concept wins, in the
 * item's own tag order, so the same item always resolves the same way. Null is
 * an ordinary answer, not a failure — most items belong to no group.
 */
export function conceptOf(item: { category?: string; tags?: readonly string[] }): string | null {
  const tags = BY_TOPIC_TAG.get(item.category ?? '');
  if (!tags) return null;
  for (const tag of item.tags ?? []) {
    const id = tags.get(tag);
    if (id) return id;
  }
  return null;
}

/** The other concepts in this one's group — the ones worth contrasting it
 * with. Empty for a concept that belongs to no group. */
export function contrastPartners(conceptId: string): string[] {
  const group = GROUP_OF.get(conceptId);
  if (!group) return [];
  return group.concepts.filter((concept) => concept.id !== conceptId).map((concept) => concept.id);
}

/** Whether two concepts are worth putting side by side. */
export const areContrastable = (a: string, b: string): boolean =>
  a !== b && GROUP_OF.get(a) !== undefined && GROUP_OF.get(a) === GROUP_OF.get(b);

/** Every concept id, for validation and coverage reporting. */
export const CONCEPT_IDS: readonly string[] = CONCEPTS.map((concept) => concept.id);

/** Structural problems an authoring mistake would introduce. Empty is correct. */
export function validateConcepts(): string[] {
  const problems: string[] = [];
  const seenConcept = new Set<string>();
  const seenGroup = new Set<string>();
  for (const group of CONCEPT_GROUPS) {
    if (seenGroup.has(group.id)) problems.push(`duplicate group ${group.id}`);
    seenGroup.add(group.id);
    if (group.concepts.length < 2) problems.push(`group ${group.id} has nothing to contrast`);
    for (const concept of group.concepts) {
      if (seenConcept.has(concept.id)) problems.push(`concept ${concept.id} is in two groups`);
      seenConcept.add(concept.id);
      if (concept.topic !== group.topic) {
        problems.push(`concept ${concept.id} is not in its group's topic`);
      }
      if (concept.tags.length === 0) problems.push(`concept ${concept.id} matches nothing`);
      if (!concept.label.cs.trim()) problems.push(`concept ${concept.id} has no Czech label`);
    }
  }
  // Two concepts in the same topic must not claim the same tag, or resolution
  // would depend on which one this file happens to list first.
  const claimed = new Map<string, string>();
  for (const concept of CONCEPTS) {
    for (const tag of concept.tags) {
      const key = `${concept.topic}:${tag}`;
      const owner = claimed.get(key);
      if (owner && owner !== concept.id) {
        problems.push(`tag ${key} is claimed by both ${owner} and ${concept.id}`);
      }
      claimed.set(key, concept.id);
    }
  }
  return problems;
}
