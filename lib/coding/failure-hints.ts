/** Authored advice for a failed run (issue #156).
 *
 * Two layers: a hint written for one task's own failure shape wins; otherwise
 * the category's authored advice applies. Both are plain authored strings —
 * devShark has no AI tutor and this is not a place to add one. Nothing here may
 * name a hidden input, a hidden expectation or an internal error message; the
 * launch contracts assert that. */

import type { FailureAdvice, FailureCategory } from '../../shared/coding-failures';
import { stageOf } from '../../shared/coding-failures';
import type { Localized } from '../../shared/coding-catalog';

/** Bumped whenever the wording below changes, so evidence stays comparable. */
export const FAILURE_ADVICE_VERSION = 1;

const CATEGORY_ADVICE: Record<FailureCategory, Localized> = {
  boundary: {
    en: 'The ordinary cases work; an edge case does not. Read the prompt again for what it says about empty input, zero, negatives or the very first and last item, and try that case by hand.',
    cs: 'Běžné případy fungují, hraniční ne. Přečtěte si znovu zadání — co říká o prázdném vstupu, nule, záporných číslech nebo o úplně prvním a posledním prvku — a zkuste si ten případ projít rukou.',
  },
  mutation: {
    en: 'Something changed the input instead of producing a new value. Methods like push, splice, sort and reverse rewrite the array they are called on; copy first, or use a method that returns a new array.',
    cs: 'Něco změnilo vstup místo toho, aby vytvořilo novou hodnotu. Metody jako push, splice, sort nebo reverse přepisují pole, na kterém je zavoláte; nejdřív si udělejte kopii, nebo použijte metodu, která vrací nové pole.',
  },
  types: {
    en: 'TypeScript refused the code before it ran. Fix the reported type errors first — the tests cannot say anything useful until the compiler is happy.',
    cs: 'TypeScript kód odmítl ještě před spuštěním. Nejdřív opravte hlášené typové chyby — dokud překladač neprojde, testy nic užitečného neřeknou.',
  },
  'output-shape': {
    en: 'The values look close but the container does not match: an array where a string was asked for, a nested array, or one item too many. Compare the expected and the actual result side by side.',
    cs: 'Hodnoty vypadají skoro dobře, ale nesedí obal: pole místo řetězce, zanořené pole nebo o prvek navíc. Porovnejte očekávaný a skutečný výsledek vedle sebe.',
  },
  'missing-return': {
    en: 'The function produced nothing. A block body needs an explicit return, and a callback inside map or reduce needs one too.',
    cs: 'Funkce nevrátila nic. Tělo ve složených závorkách potřebuje explicitní return — a callback uvnitř map nebo reduce taky.',
  },
  threw: {
    en: 'The code threw before the tests could check anything. Read the error, then check the values it was working with just above that line.',
    cs: 'Kód spadl dřív, než testy stihly cokoli ověřit. Přečtěte si chybu a pak se podívejte na hodnoty, se kterými se pracovalo o řádek výš.',
  },
  timeout: {
    en: 'The code did not finish in time, which usually means a loop never ends. Check that whatever the loop is waiting for actually changes inside it.',
    cs: 'Kód nedoběhl včas, což skoro vždy znamená nekonečný cyklus. Ověřte, že se to, na co cyklus čeká, uvnitř opravdu mění.',
  },
  'hidden-only': {
    en: 'Every visible test passes, and a further case does not. Re-read the prompt for a rule the shown tests do not exercise, and think about the inputs it would be easy to forget.',
    cs: 'Všechny viditelné testy prošly, další případ ne. Přečtěte si zadání a hledejte pravidlo, které ukázané testy nezkouší, a zamyslete se nad vstupy, na které se snadno zapomene.',
  },
};

/** Advice written for one task's own failure shape. Keyed by task id. */
const TASK_ADVICE: Record<string, Partial<Record<FailureCategory, Localized>>> = {
  'js-double-numbers': {
    'output-shape': {
      en: 'map gives back one new array with one result per input. If the result is a single number, the values are being combined somewhere instead of collected.',
      cs: 'map vrací jedno nové pole s jedním výsledkem na každý vstup. Pokud vyjde jediné číslo, hodnoty se někde slučují místo sbírání.',
    },
    'missing-return': {
      en: 'The callback passed to map has to return the doubled value; a block body without return hands back undefined for every item.',
      cs: 'Callback předaný do map musí vrátit zdvojenou hodnotu; tělo ve složených závorkách bez return vrací u každého prvku undefined.',
    },
  },
  'js-sum-array': {
    boundary: {
      en: 'An empty array has no first value to start from. reduce takes a starting value as its second argument — that is what makes the empty case work.',
      cs: 'Prázdné pole nemá první hodnotu, od které začít. reduce bere počáteční hodnotu jako druhý argument — právě díky ní projde i prázdný případ.',
    },
  },
  'js-countdown': {
    timeout: {
      en: 'The loop condition watches n, so n has to get smaller inside the loop, not only be read.',
      cs: 'Podmínka cyklu sleduje n, takže se n musí uvnitř cyklu zmenšovat, ne se jen číst.',
    },
  },
  'js-unique-values': {
    'output-shape': {
      en: 'A Set is not an array. Spread it, or use Array.from, so the result is an array again.',
      cs: 'Set není pole. Rozbalte ho spreadem nebo použijte Array.from, aby byl výsledek zase pole.',
    },
  },
  'js-reverse-string': {
    threw: {
      en: 'Strings have no reverse method. Turn the text into an array of characters first, reverse that, and join it back.',
      cs: 'Řetězce metodu reverse nemají. Nejdřív z textu udělejte pole znaků, to obraťte a pak zase spojte.',
    },
  },
  'js-word-count': {
    boundary: {
      en: 'Splitting an empty or whitespace-only string still yields one entry. Decide what that case should return before you count.',
      cs: 'Rozdělení prázdného řetězce nebo řetězce jen z mezer stejně vrátí jednu položku. Rozhodněte se, co má takový případ vrátit, ještě než začnete počítat.',
    },
  },
};

/** The advice to show for this failure, or null when nothing is authored. */
export function adviceFor(taskId: string, category: FailureCategory): FailureAdvice | null {
  const specific = TASK_ADVICE[taskId]?.[category];
  const body = specific ?? CATEGORY_ADVICE[category];
  if (!body) return null;
  return { category, stage: stageOf(category), body, version: FAILURE_ADVICE_VERSION, taskSpecific: Boolean(specific) };
}

/** Every authored string, for the content contract. */
export function allFailureAdvice(): { taskId: string | null; category: FailureCategory; body: Localized }[] {
  const out: { taskId: string | null; category: FailureCategory; body: Localized }[] = [];
  for (const [category, body] of Object.entries(CATEGORY_ADVICE)) {
    out.push({ taskId: null, category: category as FailureCategory, body });
  }
  for (const [taskId, byCategory] of Object.entries(TASK_ADVICE)) {
    for (const [category, body] of Object.entries(byCategory)) {
      out.push({ taskId, category: category as FailureCategory, body: body! });
    }
  }
  return out;
}
