// Czech copy for lib/coding/tasks/javascript-debug.ts, keyed by task id. Arrays
// align by index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

export const JAVASCRIPT_DEBUG_TASKS_CS: Record<string, CodingTaskCs> = {
  "js-fix-average": {
    title: "Oprav pr\u016fm\u011br",
    prompt: "`average(numbers)` m\u00e1 vr\u00e1tit pr\u016fm\u011br \u010d\u00edsel a pro pr\u00e1zdn\u00e9 pole `0`. Na b\u011b\u017en\u00e9m seznamu funguje, na pr\u00e1zdn\u00e9m se rozpadne. Najdi p\u0159\u00ed\u010dinu a oprav ji.",
    hints: ["Spus\u0165 pr\u00e1zdn\u00fd p\u0159\u00edpad a p\u0159e\u010dti si, jakou hodnotu vr\u00e1t\u00ed \u2014 pak dohledej operaci, kter\u00e1 ji vyrobila."],
    approach: [
      "D\u011blen\u00ed d\u00e9lkou je v po\u0159\u00e1dku, dokud d\u00e9lka nen\u00ed nula.",
      "Nejd\u0159\u00edv se rozhodni, co m\u00e1 pr\u00e1zdn\u00fd p\u0159\u00edpad vr\u00e1tit, a teprve pak ho o\u0161et\u0159i.",
    ],
    testLabels: ["", "", "", "pr\u00e1zdn\u00e9 pole"],
  },
  "js-fix-last-index": {
    title: "Oprav posledn\u00ed index",
    prompt: "`lastIndex(values, target)` m\u00e1 vr\u00e1tit index POSLEDN\u00cdHO v\u00fdskytu `target`, nebo `-1`, kdy\u017e tam nen\u00ed. Te\u010f odpov\u00edd\u00e1 prvn\u00edm. Oprav hled\u00e1n\u00ed.",
    hints: ["Cyklus se vrac\u00ed hned p\u0159i prvn\u00ed shod\u011b, tak\u017ee sm\u011br proch\u00e1zen\u00ed rozhoduje, kter\u00e1 shoda vyhraje."],
    approach: [
      "Projd\u011bte pole od konce k za\u010d\u00e1tku \u2014 prvn\u00ed shoda, na kterou naraz\u00edte, je ta posledn\u00ed v po\u0159ad\u00ed.",
      "Kdy\u017e cyklus dob\u011bhne bez shody, d\u00e1l vracejte -1.",
    ],
    testLabels: ["", "", "shoda je u\u017e posledn\u00ed", "\u017e\u00e1dn\u00e1 shoda", "pr\u00e1zdn\u00e9 pole"],
  },
  "js-fix-drop-blank": {
    title: "Oprav filtr pr\u00e1zdn\u00fdch",
    prompt: "`dropBlank(values)` m\u00e1 vyhodit ka\u017ed\u00fd \u0159et\u011bzec, kter\u00fd je pr\u00e1zdn\u00fd nebo obsahuje jen mezery, a zbytek nechat v po\u0159ad\u00ed. Te\u010f zachyt\u00ed jen ty \u00faplně pr\u00e1zdn\u00e9. Oprav podm\u00ednku.",
    hints: ["\u0158et\u011bzec z mezer nen\u00ed pr\u00e1zdn\u00fd \u0159et\u011bzec, i kdy\u017e na obrazovce vypad\u00e1 stejn\u011b."],
    approach: [
      "P\u0159ed porovn\u00e1n\u00edm hodnotu o\u0159\u00edzn\u011bte, aby mezery p\u0159estaly pl\u00e1tit za obsah.",
      "O\u0159\u00edzn\u011bte jen kv\u016fli rozhodnut\u00ed \u2014 hodnoty, kter\u00e9 nech\u00e1v\u00e1te, se maj\u00ed vr\u00e1tit beze zm\u011bny.",
    ],
    testLabels: ["", "mezery na kraj\u00edch se u hodnoty zachovaj\u00ed", "tabul\u00e1tory a nov\u00e9 \u0159\u00e1dky jsou taky pr\u00e1zdn\u00e9", "pr\u00e1zdn\u00e9 pole"],
  },
  "js-fix-sorted-copy": {
    title: "Oprav se\u0159azenou kopii",
    prompt: "`sortedCopy(numbers)` m\u00e1 vr\u00e1tit NOV\u00c9 pole se\u0159azen\u00e9 od nejmen\u0161\u00edho po nejv\u011bt\u0161\u00ed a argument nechat beze zm\u011bny. Nesplňuje ani jedno. Oprav oboj\u00ed.",
    hints: ["\u0160patn\u011b jsou tu dv\u011b v\u011bci: kter\u00e9 pole se \u0159ad\u00ed a jak se porovn\u00e1vaj\u00ed dv\u011b \u010d\u00edsla."],
    approach: [
      "sort p\u0159ep\u00ed\u0161e pole, na kter\u00e9m ho zavol\u00e1te, tak\u017ee si nejd\u0159\u00edv ud\u011blejte kopii a \u0159a\u010fte tu.",
      "Bez komparátoru sort porovn\u00e1v\u00e1 hodnoty jako text, tak\u017ee 10 sko\u010d\u00ed p\u0159ed 2. P\u0159edejte komparátor, kter\u00fd ode\u010d\u00edt\u00e1.",
    ],
    testLabels: ["\u010d\u00edsla, ne text", "", "argument z\u016fst\u00e1v\u00e1 nedot\u010den\u00fd", "pr\u00e1zdn\u00e9 pole"],
  },
};
