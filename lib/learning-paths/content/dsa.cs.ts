/** Czech copy for the DSA Foundations path. Module overlays live beside their
 * English sources; this file carries the path-level copy and joins them. */

import type { PathCs } from '../types';
import { DSA_ENTRY_CS } from './dsa/entry.cs';
import { DSA_D01_CS } from './dsa/d01.cs';
import { DSA_D02_CS } from './dsa/d02.cs';
import { DSA_D03_CS } from './dsa/d03.cs';
import { DSA_D04_CS } from './dsa/d04.cs';
import { DSA_D05_CS } from './dsa/d05.cs';
import { DSA_D06_CS } from './dsa/d06.cs';
import { DSA_D07_CS } from './dsa/d07.cs';
import { DSA_D08_CS } from './dsa/d08.cs';
import { DSA_D09_CS } from './dsa/d09.cs';
import { DSA_D10_CS } from './dsa/d10.cs';

export const DSA_PATH_CS: PathCs = {
  title: 'Základy datových struktur a algoritmů',
  summary:
    'Devět modulů o tom, kolik algoritmy stojí, o datových strukturách, po kterých saháš každý den, a o vyhledávání, řazení a operacích nad stromy pod nimi. Každý modul chce funkční kód i úvahu za ním, protože jedno bez druhého to druhé nedokládá.',
  outcomes: [
    'Pojmenovat třídu růstu kódu, který jsi právě přečetl, a říct, co sis o stroji musel předpokládat, abys se k ní dostal.',
    'Vybrat mezi polem, mapou, množinou, zásobníkem, frontou a spojovým seznamem pro daný způsob přístupu a volbu obhájit.',
    'Napsat od začátku lineární vyhledávání, binární vyhledávání, selection sort, insertion sort, merge sort a základní operace nad binárními stromy.',
    'Oddělit čas, který funkce zabere, od paměti navíc, kterou potřebuje — včetně paměti, kterou si potichu půjčí zásobník rekurze.',
  ],
  nonGoals: [
    'Grafové algoritmy — Dijkstra, A*, nejkratší cesty, topologické řazení i union-find jsou mimo záběr.',
    'Vyvážené stromy: žádné rotace AVL ani červeno-černých stromů, žádné B-stromy a žádné pokročilé mazání v BST.',
    'Haldy, trie, pokročilé dynamické programování, důkazy hladových algoritmů a technika ze soutěžního programování.',
    'Záruka, že dokončení cesty tyhle znalosti udrží natrvalo. Udrží je až rozložené opakování potom.',
  ],
  entryRequirement:
    'Potřebuješ proměnné, funkce, podmínky, cykly a pole v JavaScriptu. Nic víc: žádné HTML ani CSS, žádný framework, žádnou zvolenou kariérní cestu, žádnou XP hodnost. Volitelná vstupní kontrola níž tě nasměruje na správnou lekci základů, pokud ti nějaké téma přijde tenké.',
  completionLabel: 'Základy DSA dokončeny',
  competencies: {
    complexity: {
      title: 'Růst a náklady',
      summary: 'Přečíst kód a pojmenovat nejtěsnější třídu růstu, kterou podporuje — pro dobu běhu i pro paměť navíc.',
    },
    'arrays-strings': {
      title: 'Pole a řetězce',
      summary: 'Procházet posloupnosti, měnit je a pracovat se dvěma ukazateli s vědomím, co stojí kopírování.',
    },
    'maps-sets': {
      title: 'Hašovací mapy a množiny',
      summary: 'Vyměnit paměť za rychlost vyhledání a odlišit očekávaný případ od toho nepřátelského.',
    },
    'stacks-queues': {
      title: 'Zásobníky a fronty',
      summary: 'Modelovat přístup LIFO a FIFO a započítat cenu zvolené reprezentace.',
    },
    'linked-lists': {
      title: 'Spojové seznamy',
      summary: 'Procházet a přepojovat odkazy mezi uzly, aniž bys seznam ztratil, a vidět, kde ukazatel poráží index.',
    },
    recursion: {
      title: 'Rekurze',
      summary: 'Napsat základní případ, který skončí, a započítat hloubku zásobníku, kterou si řetěz volání půjčí.',
    },
    searching: {
      title: 'Vyhledávání',
      summary: 'Procházet, když musíš, a půlit, když můžeš — s invariantem intervalu, který to dělá správným.',
    },
    sorting: {
      title: 'Řazení',
      summary: 'Napsat tři základní řadicí algoritmy a říct, který je stabilní, který na místě a co každý stojí.',
    },
    trees: {
      title: 'Stromy a BST',
      summary: 'Projít binární strom ve všech pořadích a využít vlastnost vyhledávacího stromu bez předpokladu, že zůstane vyvážený.',
    },
  },
  modules: {
    'dsa-v1-entry': DSA_ENTRY_CS,
    'dsa-v1-d01': DSA_D01_CS,
    'dsa-v1-d02': DSA_D02_CS,
    'dsa-v1-d03': DSA_D03_CS,
    'dsa-v1-d04': DSA_D04_CS,
    'dsa-v1-d05': DSA_D05_CS,
    'dsa-v1-d06': DSA_D06_CS,
    'dsa-v1-d07': DSA_D07_CS,
    'dsa-v1-d08': DSA_D08_CS,
    'dsa-v1-d09': DSA_D09_CS,
    'dsa-v1-d10': DSA_D10_CS,
  },
  bridges: {
    'dsa-js-foundations': {
      title: 'Osvěžení základů JavaScriptu',
      summary:
        'Cykly, metody polí, funkce a objekty z existující devSharkové cesty JavaScriptem. Stojí za odbočku, pokud vstupní kontrola ukázala mezery; moduly DSA počítají se všemi čtyřmi.',
      referenceLabels: [
        'JavaScript, úrovně Learn 1–10',
        'Ciferný součet — cyklus while nad aritmetikou',
        'Spočítej násobky — počítaný cyklus for',
        'MDN — cykly a iterace',
      ],
    },
    'dsa-array-methods': {
      title: 'Metody polí a co stojí',
      summary:
        'push, pop, shift, unshift, slice a splice a co každá z nich udělá s prvky, které posune. Lekce o výkonu v D02 a D04 se o tohle opírají.',
      referenceLabels: [
        'Fronta přes push a shift — chování FIFO',
        'Prohoď vršek zásobníku — chování LIFO',
        'MDN — reference pole',
      ],
    },
  },
  rubric: {
    correctness: {
      title: 'Správnost',
      levels: {
        missing: 'Funkce se nespustí, nebo selže na běžném vstupu.',
        partial: 'Běžný vstup projde; aspoň jeden uvedený krajní případ — prázdný vstup, jediný prvek, duplicity, chybějící cíl — neprojde.',
        adequate: 'Projdou všechny uvedené případy včetně krajních zmíněných v zadání.',
        strong: 'Projdou všechny případy a řešení zůstane uvnitř operačního kontraktu, který zadání stanovilo.',
      },
    },
    'cost-reasoning': {
      title: 'Úvaha o nákladech',
      levels: {
        missing: 'Třída růstu chybí, nebo odporuje kódu.',
        partial: 'Správná rodina pro čas, ale chybí paměť nebo předpokládaný nákladový model.',
        adequate: 'Nejtěsnější podporovaná třída pro čas i paměť navíc, s uvedeným předpokladem.',
        strong: 'Jako „dostatečné“ a navíc rozbor případů — nejlepší, průměrný, nejhorší — tam, kde tvar vstupu mění odpověď.',
      },
    },
    'structure-choice': {
      title: 'Volba struktury',
      levels: {
        missing: 'Struktura, která zadaný způsob přístupu neumí podpořit.',
        partial: 'Použitelná struktura vybraná bez důvodu, který by obstál při doptání.',
        adequate: 'Struktura odpovídající způsobu přístupu, obhájená operacemi, které zlevňuje.',
        strong: 'Jako „dostatečné“ a navíc kompromis, který za to přijímáš — paměť navíc, horší nejhorší případ, ztracené uspořádání.',
      },
    },
  },
};
