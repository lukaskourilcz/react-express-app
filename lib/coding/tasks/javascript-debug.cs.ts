// Czech copy for lib/coding/tasks/javascript-debug.ts, keyed by task id. Arrays
// align by index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

export const JAVASCRIPT_DEBUG_TASKS_CS: Record<string, CodingTaskCs> = {
  "js-fix-average": {
    title: "Oprav průměr",
    prompt: "`average(numbers)` má vrátit průměr čísel a pro prázdné pole `0`. Na běžném seznamu funguje, na prázdném se rozpadne. Najdi příčinu a oprav ji.",
    hints: ["Spusť prázdný případ a přečti si, jakou hodnotu vrátí — pak dohledej operaci, která ji vyrobila."],
    approach: [
      "Dělení délkou je v pořádku, dokud délka není nula.",
      "Nejdřív se rozhodni, co má prázdný případ vrátit, a teprve pak ho ošetři.",
    ],
    testLabels: ["", "", "", "prázdné pole"],
  },
  "js-fix-last-index": {
    title: "Oprav poslední index",
    prompt: "`lastIndex(values, target)` má vrátit index POSLEDNÍHO výskytu `target`, nebo `-1`, když tam není. Teď odpovídá prvním. Oprav hledání.",
    hints: ["Cyklus se vrací hned při první shodě, takže směr procházení rozhoduje, která shoda vyhraje."],
    approach: [
      "Projdi pole od konce k začátku — první shoda, na kterou narazíš, je ta poslední v pořadí.",
      "Když cyklus doběhne bez shody, dál vracej -1.",
    ],
    testLabels: ["", "", "shoda je už poslední", "žádná shoda", "prázdné pole"],
  },
  "js-fix-drop-blank": {
    title: "Oprav filtr prázdných",
    prompt: "`dropBlank(values)` má vyhodit každý řetězec, který je prázdný nebo obsahuje jen mezery, a zbytek nechat v pořadí. Teď zachytí jen ty úplně prázdné. Oprav podmínku.",
    hints: ["Řetězec z mezer není prázdný řetězec, i když na obrazovce vypadá stejně."],
    approach: [
      "Před porovnáním hodnotu ořízni, aby mezery přestaly plátit za obsah.",
      "Ořízni jen kvůli rozhodnutí — hodnoty, které necháváš, se mají vrátit beze změny.",
    ],
    testLabels: ["", "mezery na krajích se u hodnoty zachovají", "tabulátory a nové řádky jsou taky prázdné", "prázdné pole"],
  },
  "js-fix-sorted-copy": {
    title: "Oprav seřazenou kopii",
    prompt: "`sortedCopy(numbers)` má vrátit NOVÉ pole seřazené od nejmenšího po největší a argument nechat beze změny. Nesplňuje ani jedno. Oprav obojí.",
    hints: ["Špatně jsou tu dvě věci: které pole se řadí a jak se porovnávají dvě čísla."],
    approach: [
      "sort přepíše pole, na kterém ho zavoláš, takže si nejdřív udělej kopii a řaď tu.",
      "Bez komparátoru sort porovnává hodnoty jako text, takže 10 skočí před 2. Předej komparátor, který odečítá.",
    ],
    testLabels: ["čísla, ne text", "", "argument zůstává nedotčený", "prázdné pole"],
  },
};
