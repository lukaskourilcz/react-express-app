/** Authored solution comparisons (issue #158). Server-only: these are worked
 * answers, and they leave the server only after the learner's own verdict is
 * recorded as passed or revealed.
 *
 * Every approach is written for devShark against its own task. The content test
 * runs each one through the task's real tests, so an approach that stops
 * working fails the build rather than misleading a learner.
 */

import type { CodingApproach } from '../../../shared/coding-approaches';

export const JAVASCRIPT_APPROACHES: Record<string, CodingApproach[]> = {
  'js-double-numbers': [
    {
      key: 'map',
      style: 'straightforward',
      title: { en: 'One value in, one value out', cs: 'Jedna hodnota dovnitř, jedna ven' },
      code: 'const double = numbers => numbers.map(number => number * 2);',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Every entry is a number, and a new array is wanted rather than the old one changed.',
        cs: 'Každá položka je číslo a chceme nové pole, ne přepsat to původní.',
      },
      tradeoffs: {
        en: 'Allocates a second array. That is almost always the right trade: the caller keeps their input.',
        cs: 'Alokuje druhé pole. Skoro vždycky je to správná volba: volající si nechá svůj vstup.',
      },
    },
    {
      key: 'loop',
      style: 'explicit',
      title: { en: 'The same thing, written out', cs: 'Totéž, rozepsané' },
      code: 'const double = numbers => {\n  const doubled = [];\n  for (const number of numbers) doubled.push(number * 2);\n  return doubled;\n};',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Same as above. The loop is spelled out instead of being handed to map.',
        cs: 'Stejné jako výše. Cyklus je rozepsaný, místo aby ho obstarala metoda map.',
      },
      tradeoffs: {
        en: 'More lines to read, and the array has to be built by hand. Worth it when you need to skip or emit more than one value per entry — which map cannot do.',
        cs: 'Víc řádků ke čtení a pole se staví ručně. Vyplatí se, když potřebuješ nějakou položku přeskočit nebo z ní vyrobit víc hodnot — to map neumí.',
      },
    },
  ],
  'js-sum-array': [
    {
      key: 'reduce',
      style: 'compact',
      title: { en: 'Fold the array into one number', cs: 'Složit pole do jednoho čísla' },
      code: 'const sum = numbers => numbers.reduce((total, number) => total + number, 0);',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: {
        en: 'The starting value 0 is what an empty array should produce.',
        cs: 'Počáteční hodnota 0 je to, co má vrátit prázdné pole.',
      },
      tradeoffs: {
        en: 'Reads as one expression once you know reduce, and as a puzzle before that.',
        cs: 'Kdo zná reduce, přečte to jako jeden výraz; kdo ne, luští.',
      },
    },
    {
      key: 'loop',
      style: 'explicit',
      title: { en: 'Add them up in a loop', cs: 'Sečíst je v cyklu' },
      code: 'const sum = numbers => {\n  let total = 0;\n  for (const number of numbers) total += number;\n  return total;\n};',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: {
        en: 'Nothing beyond the numbers being numbers.',
        cs: 'Nic navíc, jen že čísla jsou čísla.',
      },
      tradeoffs: {
        en: 'Three lines instead of one, and no starting-value trap. This is the version to reach for when the accumulation grows past a single addition.',
        cs: 'Tři řádky místo jednoho a žádná past s počáteční hodnotou. K téhle verzi sáhni, jakmile je akumulace složitější než jedno sčítání.',
      },
    },
  ],
  'js-unique-values': [
    {
      key: 'set',
      style: 'compact',
      title: { en: 'Let a Set do the comparing', cs: 'Ať porovnává Set' },
      code: 'const unique = values => [...new Set(values)];',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Sameness is JavaScript identity: 1 and "1" are different, and two objects with the same fields are different.',
        cs: 'Shoda se posuzuje identitou v JavaScriptu: 1 a "1" jsou různé a dva objekty se stejnými poli jsou taky různé.',
      },
      tradeoffs: {
        en: 'Nothing to tune. When you need your own idea of sameness, a Set cannot express it.',
        cs: 'Není co ladit. Jakmile potřebuješ vlastní pojetí shody, Set ho nevyjádří.',
      },
    },
    {
      key: 'filter',
      style: 'straightforward',
      title: { en: 'Keep the first of each value', cs: 'Nechat si první výskyt' },
      code: 'const unique = values => values.filter((value, index) => values.indexOf(value) === index);',
      time: 'O(n^2)',
      space: 'O(n)',
      assumptions: {
        en: 'Same idea of sameness, and a list short enough that the repeated scan does not matter.',
        cs: 'Stejné pojetí shody a seznam dost krátký na to, aby opakované procházení nevadilo.',
      },
      tradeoffs: {
        en: 'indexOf walks the array again for every entry, so this is quadratic. Readable, and the wrong choice on anything long.',
        cs: 'indexOf projde pole znovu pro každou položku, takže je to kvadratické. Čitelné, a u čehokoli delšího špatná volba.',
      },
    },
  ],
  'js-largest-number': [
    {
      key: 'spread',
      style: 'compact',
      title: { en: 'Hand them all to Math.max', cs: 'Předat je všechny do Math.max' },
      code: 'const largest = numbers => Math.max(...numbers);',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'The array is non-empty and short enough to spread into an argument list.',
        cs: 'Pole není prázdné a je dost krátké, aby šlo rozbalit do seznamu argumentů.',
      },
      tradeoffs: {
        en: 'Spreading a very long array can exceed the engine argument limit; it also allocates that argument list.',
        cs: 'Rozbalení hodně dlouhého pole může narazit na limit počtu argumentů a taky ten seznam alokuje.',
      },
    },
    {
      key: 'reduce',
      style: 'straightforward',
      title: { en: 'Carry the biggest so far', cs: 'Nést si dosud největší' },
      code: 'const largest = numbers => numbers.reduce((best, number) => (number > best ? number : best), -Infinity);',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: {
        en: '-Infinity is an acceptable answer for an empty array.',
        cs: 'Pro prázdné pole je přijatelnou odpovědí -Infinity.',
      },
      tradeoffs: {
        en: 'Works on any length and allocates nothing, at the cost of a starting value you have to justify.',
        cs: 'Funguje na libovolné délce a nic nealokuje, za cenu počáteční hodnoty, kterou musíš obhájit.',
      },
    },
  ],
  'js-countdown': [
    {
      key: 'while',
      style: 'in-place',
      title: { en: 'Count down as you push', cs: 'Odpočítávat při vkládání' },
      code: 'const countDown = n => {\n  const result = [];\n  while (n > 0) result.push(n--);\n  return result;\n};',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'n is a whole number, and n of zero or less means an empty list.',
        cs: 'n je celé číslo a n nula nebo méně znamená prázdný seznam.',
      },
      tradeoffs: {
        en: 'The post-decrement does two things on one line. Compact, and easy to misread.',
        cs: 'Postfixové snížení dělá na jednom řádku dvě věci. Kompaktní a snadno se přehlédne.',
      },
    },
    {
      key: 'from',
      style: 'compact',
      title: { en: 'Build the whole list at once', cs: 'Postavit celý seznam najednou' },
      code: 'const countDown = n => Array.from({ length: Math.max(0, n) }, (_, index) => n - index);',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: {
        en: 'Same as above; the guard is what makes a negative n produce an empty list.',
        cs: 'Stejné jako výše; díky ošetření vrátí záporné n prázdný seznam.',
      },
      tradeoffs: {
        en: 'No mutation and no loop variable, but the index arithmetic has to be read carefully.',
        cs: 'Žádná mutace ani řídicí proměnná, ale aritmetiku s indexem je potřeba číst pozorně.',
      },
    },
  ],
  'js-fix-sorted-copy': [
    {
      key: 'copy-sort',
      style: 'straightforward',
      title: { en: 'Copy first, then sort', cs: 'Nejdřív kopie, pak řazení' },
      code: 'const sortedCopy = numbers => [...numbers].sort((a, b) => a - b);',
      time: 'O(n log n)',
      space: 'O(n)',
      assumptions: {
        en: 'Every entry is a number, so subtraction is a valid comparison.',
        cs: 'Každá položka je číslo, takže odčítání je platné porovnání.',
      },
      tradeoffs: {
        en: 'One extra array, and the caller keeps theirs. That is the whole point.',
        cs: 'Jedno pole navíc a volající si nechá svoje. Přesně o to jde.',
      },
    },
    {
      key: 'to-sorted',
      style: 'compact',
      title: { en: 'Ask for a sorted copy directly', cs: 'Rovnou si říct o seřazenou kopii' },
      code: 'const sortedCopy = numbers => numbers.slice().sort((a, b) => a - b);',
      time: 'O(n log n)',
      space: 'O(n)',
      assumptions: {
        en: 'Same as above. slice() and the spread differ in style, not in effect.',
        cs: 'Stejné jako výše. slice() a spread se liší stylem, ne účinkem.',
      },
      tradeoffs: {
        en: 'Reads as one chain. Which of the two you prefer is a house-style question, not a performance one.',
        cs: 'Čte se jako jeden řetěz. Která z těch dvou je lepší, je otázka stylu, ne výkonu.',
      },
    },
  ],
};
