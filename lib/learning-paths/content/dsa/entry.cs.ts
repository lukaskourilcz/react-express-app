/** Czech copy for the DSA entry check. */

import type { ModuleCs } from '../../types';

export const DSA_ENTRY_CS: ModuleCs = {
  title: 'Než začneš',
  outcomes: [
    'Zjistit, jestli je JavaScript, který tahle cesta předpokládá — cykly, pole, funkce, objekty — dost pohodlný na to, aby se na něm dalo stavět.',
  ],
  lessons: {},
  activities: {
    'dsa-v1-entry-check': {
      title: 'Vstupní kontrola',
      summary: 'Šest otázek na JavaScript, který moduly předpokládají. Klidně ji přeskoč — doporučuje čtení, nikdy nic neblokuje.',
      questions: {
        'dsa-v1-entry-q1': {
          prompt: 'Co se vypíše?',
          options: ['8', '3', '[3, 1, 4]', 'undefined'],
          explanation:
            'Cyklus `for…of` naváže postupně každý prvek, takže `total` nasčítá 3, pak 4 a pak 8. Pokud ti tělo cyklu nebo akumulátor přišly neznámé, most k základům JavaScriptu pokrývá obojí.',
        },
        'dsa-v1-entry-q2': {
          prompt: 'Co je v `values` po doběhnutí?',
          options: ['[2, 3, 4]', '[1, 2, 3, 4]', '[1, 2, 3]', '[4, 1, 2, 3]'],
          explanation:
            '`push` přidá 4 na konec a `shift` odebere první prvek, takže zbude `[2, 3, 4]`. Obojí mění pole na místě, místo aby vracelo nové — rozdíl, o který se opírají moduly o polích a frontách.',
        },
        'dsa-v1-entry-q3': {
          prompt: 'Který výraz přečte poslední prvek neprázdného pole `values`?',
          options: ['values[values.length - 1]', 'values[values.length]', 'values.last', 'values[-1]'],
          explanation:
            'Indexy jdou od 0 do `length - 1`, takže poslední prvek leží o jedna níž než délka. `values[values.length]` je za koncem a dá `undefined`; pole v JavaScriptu nemá vlastnost `last` ani záporné indexování.',
        },
        'dsa-v1-entry-q4': {
          prompt: 'Co vrátí `describe(4)`?',
          options: ['"done"', 'undefined', '4', 'Nevrátí nic — volání se nezastaví.'],
          explanation:
            'Každé volání předá menší `n`, dokud podmínka `n <= 0` nevrátí `"done"`, a ta hodnota putuje zpátky řetězem volání. Ta podmínka je základní případ; modul o rekurzi věnuje celou lekci tomu, co se stane bez něj.',
        },
        'dsa-v1-entry-q5': {
          prompt: 'Co dá `counts.get("a")` po doběhnutí?',
          options: ['2', '1', '[1, 2]', 'undefined'],
          explanation:
            '`set` nad existujícím klíčem hodnotu nahradí, takže druhé volání uloží 1 + 1. Mapy jsou tématem celého třetího modulu; tohle jen ověřuje, že `get` a `set` znáš.',
        },
        'dsa-v1-entry-q6': {
          prompt: 'Co je tady `node.next.value`?',
          options: ['2', '1', 'null', 'Chyba — `next` není pole.'],
          explanation:
            '`node.next` je druhý objekt a `.value` přečte jeho položku. Objekty držící odkaz na další objekt jsou přesně to, jak modul o spojových seznamech seznam staví.',
        },
      },
    },
  },
};
