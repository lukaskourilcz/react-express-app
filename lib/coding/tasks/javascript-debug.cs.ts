// Czech copy for lib/coding/tasks/javascript-debug.ts, keyed by task id. Arrays
// align by index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

export const JAVASCRIPT_DEBUG_TASKS_CS: Record<string, CodingTaskCs> = {
  'js-debug-average': {
    title: 'Průměr, který dělí ničím',
    prompt: 'Funkce `average(numbers)` má vrátit průměr seznamu čísel a `0` pro prázdný seznam. Pro běžné seznamy odpovídá správně, pro prázdný vrací něco divného. Najdi chybu a oprav ji co nejmenším zásahem.',
    hints: [
      'Zavolej ji na prázdný seznam a přečti si odpověď nahlas. Jakou délku má prázdné pole a co dostaneš, když jím dělíš?',
    ],
    approach: [
      'Nejdřív si to reprodukuj: zavolej funkci s prázdným polem a podívej se, co se vrátí.',
      'Zeptej se, co poslední řádek spočítá u prázdného seznamu — nula dělená nulou není nula.',
      'Prázdný seznam ošetři před dělením, ne opravou výsledku po něm.',
    ],
    testLabels: ['', '', 'prázdný seznam má průměr nula', '', 'hodnoty, které se vyruší, mají průměr taky nula'],
  },
  'js-debug-tally': {
    title: 'Sčítání, které nic nespočítá dvakrát',
    prompt: 'Funkce `tally(words)` má vrátit Map se slovem a počtem jeho výskytů. Všechny počty se vracejí jako 1, ať se slovo objeví kolikrát chce. Najdi chybu a oprav ji.',
    hints: [
      'Cyklus zapisuje pokaždé stejné číslo. Co by měl zapsat místo toho — a odkud by si vzal předchozí hodnotu?',
    ],
    approach: [
      'Přečti tělo cyklu a řekni, co dělá se slovem, které už jednou viděl.',
      'Nový počet je ten starý plus jedna, takže starý se musí z mapy přečíst zpátky.',
      'Rozhodni, co použít u nového slova, a pamatuj, že chybějící klíč se čte jako undefined, ne jako nula.',
    ],
    testLabels: ['', 'žádná slova, žádné počty', '', ''],
  },
  'js-debug-remove-item': {
    title: 'Odebrání, které změní seznam volajícího',
    prompt: 'Funkce `without(items, unwanted)` má vrátit nový seznam bez všech výskytů `unwanted` a seznam, který dostala, nechat být. Vrácený seznam je správný, ale volajícímu se změní jeho vlastní seznam. Oprav to.',
    hints: [
      'Podívej se, co funkce dělá se samotným `items`, a pak co vrací. Na které z těch dvou se volající potom dívá?',
    ],
    approach: [
      'Reprodukuj si to: nech si odkaz na seznam, který jsi předal, a po volání ho vypiš.',
      'Všimni si, že splice upravuje pole na místě a že funkce vrací totéž pole.',
      'Postav nový seznam z prvků, které chceš zachovat, místo abys odebíral z toho, co jsi dostal.',
    ],
    testLabels: ['', 'když není co odebrat, seznam zůstane, jak byl', 'prázdný seznam zůstane prázdný', 'seznam, který přišel dovnitř, se nezmění'],
  },
  'js-debug-first-match': {
    title: 'Hledání, které první nikdy nenajde',
    prompt: 'Funkce `firstLongerThan(words, length)` má vrátit první slovo delší než `length`, nebo `null`, když žádné takové není. Vrací poslední odpovídající slovo místo prvního. Oprav to.',
    hints: [
      'Cyklus pokračuje i poté, co odpověď má. Co by se mělo stát ve chvíli, kdy se najde první shoda?',
    ],
    approach: [
      'Projdi cyklus na seznamu se dvěma shodami a sleduj, co `found` drží po každém kroku.',
      'První shoda je odpověď, takže jakmile ji máš, není se na co dál dívat.',
      'Vrať ji hned a případ bez shody nech na konci funkce.',
    ],
    testLabels: ['', 'bez shody se vrátí null', 'prázdný seznam vrátí null', ''],
  },
};
