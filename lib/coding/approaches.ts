/** Curated approach comparisons, shown only after a verified pass.
 *
 * Two or three original solutions to the same task, written for this product,
 * each with what it costs in time and space, what it assumes, and what it
 * trades away. The point is the comparison: the fastest is rarely the clearest,
 * and a learner who has just made something work is exactly ready to see why
 * someone would write it differently.
 *
 * Server-only, like the reference solutions, and gated the same way but more
 * strictly: the API hands these over only when the learner's own recorded
 * evidence says they passed the task. Reading a solution after giving up is a
 * different thing and stays separate — it does not open the comparison, and it
 * ends the attempt exactly as it did before.
 *
 * COVERAGE. This file is the manifest: `approachCoverage()` reports which task
 * ids are covered, and the coding-content test asserts every covered id is a
 * real task and that no task advertises a comparison it does not have. A task
 * with nothing authored shows no tab, rather than an empty one. */

import type { Localized } from '../../shared/coding-catalog';

export interface CuratedApproach {
  /** What this way of solving it is called, in the learner's language. */
  name: Localized;
  /** The code, written for this product. */
  code: string;
  /** Why it reads the way it does. */
  readability: Localized;
  /** Big-O in time and space, with the assumption that makes it true. */
  time: string;
  space: string;
  /** What has to be true for this to be a fair comparison. */
  assumptions: Localized;
  /** What you give up by choosing it. */
  tradeoffs: Localized;
}

const APPROACHES: Record<string, CuratedApproach[]> = {
  'js-double-numbers': [
    {
      name: { en: 'map', cs: 'map' },
      code: 'const double = numbers => numbers.map(number => number * 2);',
      readability: {
        en: 'Says what it produces rather than how it walks: one new array, one result per element.',
        cs: 'Říká, co vzniká, ne jak se prochází: jedno nové pole, jeden výsledek na prvek.',
      },
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Every element is a number, and a new array is wanted rather than a change in place.',
        cs: 'Každý prvek je číslo a chceme nové pole, ne změnu na místě.',
      },
      tradeoffs: {
        en: 'Allocates a second array. On a very large list that memory is real, though it is rarely the thing that matters.',
        cs: 'Alokuje druhé pole. U hodně velkého seznamu je ta paměť skutečná, i když málokdy rozhoduje.',
      },
    },
    {
      name: { en: 'An indexed loop', cs: 'Cyklus přes indexy' },
      code: 'function double(numbers) {\n  const out = new Array(numbers.length);\n  for (let i = 0; i < numbers.length; i++) out[i] = numbers[i] * 2;\n  return out;\n}',
      readability: {
        en: 'More lines, and the mechanics are visible. Useful when the loop body grows beyond one expression.',
        cs: 'Víc řádků a mechanika je vidět. Hodí se, když tělo cyklu přeroste jeden výraz.',
      },
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'The same as above. Sizing the array up front avoids repeated growth, which is a small, real win.',
        cs: 'Totéž co výše. Předem daná velikost pole se vyhne opakovanému růstu, což je malý, ale skutečný zisk.',
      },
      tradeoffs: {
        en: 'The index is one more thing to get wrong, and the intent is no longer stated in the first word.',
        cs: 'Index je další místo, kde udělat chybu, a záměr už není vidět hned v prvním slově.',
      },
    },
  ],
  'js-sum-array': [
    {
      name: { en: 'reduce', cs: 'reduce' },
      code: 'const sum = numbers => numbers.reduce((total, number) => total + number, 0);',
      readability: {
        en: 'One expression, and the initial value is written down — which is what makes the empty list answer 0 rather than throw.',
        cs: 'Jeden výraz a počáteční hodnota je napsaná — právě díky ní prázdný seznam vrátí 0 a ne chybu.',
      },
      time: 'O(n)',
      space: 'O(1)',
      assumptions: {
        en: 'Every element is a number. Without the initial value the empty case throws, so it is not optional here.',
        cs: 'Každý prvek je číslo. Bez počáteční hodnoty prázdný případ selže, takže tady není volitelná.',
      },
      tradeoffs: {
        en: 'Readers who meet reduce rarely have to stop and work out what the accumulator is.',
        cs: 'Kdo reduce potkává zřídka, musí se zastavit a rozmyslet, co je akumulátor.',
      },
    },
    {
      name: { en: 'A running total', cs: 'Průběžný součet' },
      code: 'function sum(numbers) {\n  let total = 0;\n  for (const number of numbers) total += number;\n  return total;\n}',
      readability: {
        en: 'Plain, and hard to misread. The empty case answers 0 for the same reason: the total starts there.',
        cs: 'Prosté a těžko se to přečte špatně. Prázdný případ vrátí 0 ze stejného důvodu: součet tam začíná.',
      },
      time: 'O(n)',
      space: 'O(1)',
      assumptions: {
        en: 'The same as above.',
        cs: 'Totéž co výše.',
      },
      tradeoffs: {
        en: 'Three lines instead of one, and a mutable variable in scope.',
        cs: 'Tři řádky místo jednoho a proměnná, která se mění.',
      },
    },
  ],
  'js-reverse-string': [
    {
      name: { en: 'Spread, reverse, join', cs: 'Spread, reverse, join' },
      code: 'const reverse = text => [...text].reverse().join("");',
      readability: {
        en: 'Reads as the three steps it is. The spread splits by code point, so characters outside the basic plane survive.',
        cs: 'Čte se jako tři kroky, kterými je. Spread dělí po code pointech, takže znaky mimo základní rovinu přežijí.',
      },
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Reversing by code point is what is wanted. Combined emoji and combining marks still come apart — no single-line reverse handles those.',
        cs: 'Chceme obracet po code pointech. Složené emoji a kombinující znaky se i tak rozpadnou — to nezvládne žádné jednořádkové obrácení.',
      },
      tradeoffs: {
        en: 'Builds two intermediate structures. Fine at any size a browser will hold.',
        cs: 'Staví dvě mezistruktury. V jakékoli velikosti, kterou prohlížeč udrží, to nevadí.',
      },
    },
    {
      name: { en: 'Building from the end', cs: 'Skládání od konce' },
      code: 'function reverse(text) {\n  let out = "";\n  for (let i = text.length - 1; i >= 0; i--) out += text[i];\n  return out;\n}',
      readability: {
        en: 'The mechanics are explicit, which helps when you are learning why the index starts at length - 1.',
        cs: 'Mechanika je vidět, což pomáhá, když se učíš, proč index začíná na length - 1.',
      },
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Indexing walks UTF-16 units, not code points, so it splits characters the spread version keeps whole.',
        cs: 'Indexování prochází jednotky UTF-16, ne code pointy, takže rozdělí znaky, které spread zachová celé.',
      },
      tradeoffs: {
        en: 'Correct for plain text and wrong for the rest — the shorter version is also the more correct one here.',
        cs: 'Pro prostý text správné, pro zbytek ne — kratší verze je tady zároveň správnější.',
      },
    },
  ],
  'js-palindrome': [
    {
      name: { en: 'Compare with the reverse', cs: 'Porovnání s obrácením' },
      code: 'const isPalindrome = text => {\n  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");\n  return clean === [...clean].reverse().join("");\n};',
      readability: {
        en: 'States the definition directly: the same forwards as backwards, once the noise is gone.',
        cs: 'Vyslovuje definici přímo: stejné dopředu i dozadu, jakmile zmizí šum.',
      },
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Letters and digits count and everything else does not — that rule is a decision, and the code writes it down.',
        cs: 'Počítají se písmena a číslice, nic jiného — to pravidlo je rozhodnutí a kód ho zapisuje.',
      },
      tradeoffs: {
        en: 'Copies the string twice. Never stops early, even when the first and last characters already disagree.',
        cs: 'Kopíruje řetězec dvakrát. Nikdy nekončí dřív, ani když se první a poslední znak už neshodují.',
      },
    },
    {
      name: { en: 'Two pointers', cs: 'Dva ukazatele' },
      code: 'function isPalindrome(text) {\n  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");\n  let left = 0;\n  let right = clean.length - 1;\n  while (left < right) {\n    if (clean[left] !== clean[right]) return false;\n    left++;\n    right--;\n  }\n  return true;\n}',
      readability: {
        en: 'Longer, but it says why it stops: the first disagreement is the answer.',
        cs: 'Delší, ale říká, proč končí: první neshoda je odpověď.',
      },
      time: 'O(n)',
      space: 'O(n) for the cleaned copy, O(1) beyond it',
      assumptions: {
        en: 'The same cleaning rule. The walk itself needs no extra memory.',
        cs: 'Stejné pravidlo čištění. Samotné procházení nepotřebuje paměť navíc.',
      },
      tradeoffs: {
        en: 'More code for a saving that only shows on long strings that fail early.',
        cs: 'Víc kódu za úsporu, která se projeví jen u dlouhých řetězců selhávajících brzy.',
      },
    },
  ],
  'js-word-count': [
    {
      name: { en: 'A frequency map', cs: 'Mapa četností' },
      code: 'function wordCount(text) {\n  const counts = new Map();\n  for (const word of text.toLowerCase().split(/\\s+/).filter(Boolean)) {\n    counts.set(word, (counts.get(word) ?? 0) + 1);\n  }\n  return counts;\n}',
      readability: {
        en: 'One pass, one structure. The ?? 0 is where the "first time I have seen this" case is handled.',
        cs: 'Jeden průchod, jedna struktura. V ?? 0 je ošetřený případ „tohle vidím poprvé“.',
      },
      time: 'O(n) expected',
      space: 'O(k) for k distinct words',
      assumptions: {
        en: 'Whitespace separates words and case does not matter. Expected O(1) lookup assumes no pathological key collisions.',
        cs: 'Slova dělí mezery a na velikosti písmen nezáleží. Očekávané O(1) vyhledání předpokládá, že klíče nekolidují patologicky.',
      },
      tradeoffs: {
        en: 'A Map keeps insertion order and any key type; a plain object would be shorter and would inherit prototype keys.',
        cs: 'Map drží pořadí vkládání a libovolný typ klíče; prostý objekt by byl kratší a zdědil by klíče z prototypu.',
      },
    },
    {
      name: { en: 'Sort, then count runs', cs: 'Seřadit a počítat úseky' },
      code: 'function wordCount(text) {\n  const words = text.toLowerCase().split(/\\s+/).filter(Boolean).sort();\n  const counts = new Map();\n  for (let i = 0; i < words.length; i++) {\n    let run = 1;\n    while (words[i + 1] === words[i]) { run++; i++; }\n    counts.set(words[i], run);\n  }\n  return counts;\n}',
      readability: {
        en: 'Harder to follow, and the reason to reach for it is not readability.',
        cs: 'Hůř se to sleduje a důvod, proč po tom sáhnout, není čitelnost.',
      },
      time: 'O(n log n)',
      space: 'O(n)',
      assumptions: {
        en: 'The same word rules. Sorting is what makes equal words adjacent, which is the whole idea.',
        cs: 'Stejná pravidla pro slova. Řazení dělá stejná slova sousedními, a o to celé jde.',
      },
      tradeoffs: {
        en: 'Slower than the map for this job. It is here as a contrast: sorting is the right tool when you also need the order.',
        cs: 'Na tuhle práci pomalejší než mapa. Je tu pro kontrast: řazení je správný nástroj, když potřebuješ i pořadí.',
      },
    },
  ],
};

/** The approaches authored for a task, or an empty list. */
export const approachesFor = (taskId: string): CuratedApproach[] => APPROACHES[taskId] ?? [];

/** Task ids with an authored comparison. The content test reads this. */
export const approachCoverage = (): string[] => Object.keys(APPROACHES);
