import type { QuestionTranslation } from './quiz-data';

export const preCalculusTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Zápis funkce ──
  'rm-precalc-1': { introduction: 'Dosaď x = 3 do předpisu funkce.', question: 'Když f(x) = 2x + 1, kolik je f(3)?', options: ['7', '6', '5', '9'], explanation: 'f(3) = 2(3) + 1 = 6 + 1 = 7.' },
  'rm-precalc-2': { introduction: 'Dosaď x = 2 a umocni.', question: 'Když f(x) = x^2 - 4, kolik je f(2)?', options: ['4', '0', '8', '-4'], explanation: 'f(2) = 2^2 - 4 = 4 - 4 = 0.' },
  'rm-precalc-3': { introduction: 'Dosaď x = 0.', question: 'Když f(x) = 3x - 5, kolik je f(0)?', options: ['0', '5', '-5', '-2'], explanation: 'f(0) = 3(0) - 5 = -5.' },
  'rm-precalc-4': { introduction: 'Pozor na umocnění záporného čísla.', question: 'Když g(x) = x^2 + 1, kolik je g(-2)?', options: ['3', '-3', '-5', '5'], explanation: 'g(-2) = (-2)^2 + 1 = 4 + 1 = 5.' },
  'rm-precalc-5': { introduction: 'Dosaď x = 4.', question: 'Když f(x) = 5 - 2x, kolik je f(4)?', options: ['-3', '3', '13', '-13'], explanation: 'f(4) = 5 - 2(4) = 5 - 8 = -3.' },
  'rm-precalc-6': { introduction: 'Třetí mocnina záporného čísla je záporná.', question: 'Když h(x) = x^3, kolik je h(-2)?', options: ['8', '-6', '-8', '6'], explanation: 'h(-2) = (-2)^3 = -8.' },
  'rm-precalc-7': { introduction: 'Absolutní hodnota je vždy nezáporná.', question: 'Když f(x) = |x - 3|, kolik je f(1)?', options: ['-2', '4', '2', '1'], explanation: 'f(1) = |1 - 3| = |-2| = 2.' },
  'rm-precalc-8': { introduction: 'Nejprve umocni, pak odečti.', question: 'Když f(x) = 2x^2 - x, kolik je f(3)?', options: ['15', '12', '21', '9'], explanation: 'f(3) = 2(9) - 3 = 18 - 3 = 15.' },

  // ── Úroveň 2 — Definiční obor a obor hodnot ──
  'rm-precalc-9': { introduction: 'Jmenovatel nesmí být nulový.', question: 'Jaký je definiční obor f(x) = 1/(x - 2)?', options: ['Všechna reálná čísla kromě x = 2', 'Všechna reálná čísla kromě x = 0', 'x > 2', 'Všechna reálná čísla'], explanation: 'Jmenovatel x - 2 nesmí být roven 0, takže x = 2 je vyloučeno.' },
  'rm-precalc-10': { introduction: 'Výraz pod odmocninou musí být nezáporný.', question: 'Jaký je definiční obor f(x) = √(x - 3)?', options: ['x > 3', 'x ≤ 3', 'x ≥ 3', 'x ≥ 0'], explanation: 'Výraz pod odmocninou musí být nezáporný: x - 3 ≥ 0, takže x ≥ 3.' },
  'rm-precalc-11': { introduction: 'Přemýšlej o možných hodnotách druhé mocniny.', question: 'Jaký je obor hodnot f(x) = x^2?', options: ['y > 0', 'y ≥ 0', 'všechna reálná čísla', 'y ≤ 0'], explanation: 'Druhá mocnina není nikdy záporná, takže výstupy jsou y ≥ 0.' },
  'rm-precalc-12': { introduction: 'Výraz pod odmocninou musí být nezáporný.', question: 'Jaký je definiční obor f(x) = √x?', options: ['x > 0', 'všechna reálná čísla', 'x ≥ 0', 'x ≤ 0'], explanation: 'Výraz pod odmocninou musí být nezáporný, takže x ≥ 0.' },
  'rm-precalc-13': { introduction: 'Absolutní hodnota nikdy není záporná.', question: 'Jaký je obor hodnot f(x) = |x|?', options: ['všechna reálná čísla', 'y ≤ 0', 'y > 0', 'y ≥ 0'], explanation: 'Výstupy absolutní hodnoty nejsou nikdy záporné, takže y ≥ 0.' },
  'rm-precalc-14': { introduction: 'Najdi, kde je jmenovatel nulový.', question: 'Jaký je definiční obor f(x) = 1/(x^2 - 9)?', options: ['všechna reálná čísla', 'kromě x = 3', 'kromě x = 9', 'kromě x = ±3'], explanation: 'x^2 - 9 = 0 pro x = 3 nebo x = -3, takže obě hodnoty jsou vyloučeny.' },
  'rm-precalc-15': { introduction: 'Minimum druhé mocniny je 0.', question: 'Jaký je obor hodnot f(x) = x^2 + 2?', options: ['y ≥ 0', 'y ≥ 2', 'y > 2', 'všechna reálná čísla'], explanation: 'Minimum x^2 je 0, takže x^2 + 2 má minimum 2, což dává y ≥ 2.' },
  'rm-precalc-16': { introduction: 'Může být jmenovatel nulový?', question: 'Jaký je definiční obor f(x) = (x + 1)/(x^2 + 1)?', options: ['kromě x = -1', 'kromě x = 1', 'všechna reálná čísla', 'x ≥ 0'], explanation: 'x^2 + 1 je vždy kladné, takže není nikdy nulové a definiční obor jsou všechna reálná čísla.' },

  // ── Úroveň 3 — Transformace funkcí ──
  'rm-precalc-17': { introduction: 'Přičtení konstanty vně funkce posouvá graf svisle.', question: 'Jak se graf f(x) + 3 liší od f(x)?', options: ['posun nahoru o 3', 'posun dolů o 3', 'posun vpravo o 3', 'posun vlevo o 3'], explanation: 'Přičtení konstanty vně funkce posouvá graf nahoru o 3.' },
  'rm-precalc-18': { introduction: 'Změna uvnitř argumentu posouvá graf vodorovně (opačně).', question: 'Jak se graf f(x - 2) liší od f(x)?', options: ['posun vlevo o 2', 'posun vpravo o 2', 'posun nahoru o 2', 'posun dolů o 2'], explanation: 'Odečtení uvnitř argumentu posouvá graf vpravo o 2.' },
  'rm-precalc-19': { introduction: 'Znaménko minus před funkcí překlápí výstup.', question: 'Jakou transformaci představuje -f(x)?', options: ['osová souměrnost podle osy y', 'osová souměrnost podle osy x', 'posun nahoru', 'osová souměrnost podle přímky y = x'], explanation: 'Změna znaménka výstupu překlopí graf podle osy x.' },
  'rm-precalc-20': { introduction: 'Přičtení uvnitř argumentu posouvá graf vodorovně (opačně).', question: 'Jak se graf f(x + 4) liší od f(x)?', options: ['posun vpravo o 4', 'posun nahoru o 4', 'posun vlevo o 4', 'posun dolů o 4'], explanation: 'Přičtení uvnitř argumentu posouvá graf vlevo o 4.' },
  'rm-precalc-21': { introduction: 'Násobení výstupu mění svislé měřítko.', question: 'Jakou transformaci představuje 2f(x)?', options: ['vodorovné natažení', 'svislé stlačení', 'posun nahoru o 2', 'svislé natažení o faktor 2'], explanation: 'Násobení výstupu dvěma natáhne graf svisle o faktor 2.' },
  'rm-precalc-22': { introduction: 'Znaménko minus uvnitř argumentu překlápí vstup.', question: 'Jakou transformaci představuje f(-x)?', options: ['osová souměrnost podle osy x', 'osová souměrnost podle osy y', 'posun vlevo', 'posun dolů'], explanation: 'Změna znaménka vstupu překlopí graf podle osy y.' },
  'rm-precalc-23': { introduction: 'Odečtení konstanty vně funkce posouvá graf svisle.', question: 'Jak se graf f(x) - 5 liší od f(x)?', options: ['posun nahoru o 5', 'posun vpravo o 5', 'posun dolů o 5', 'posun vlevo o 5'], explanation: 'Odečtení konstanty vně funkce posouvá graf dolů o 5.' },
  'rm-precalc-24': { introduction: 'Použij vrcholový tvar (x - h)^2 + k.', question: 'Jaký je vrchol paraboly y = (x + 1)^2 - 3?', options: ['(1, -3)', '(-1, 3)', '(1, 3)', '(-1, -3)'], explanation: 'Vrcholový tvar (x - h)^2 + k dává h = -1 a k = -3, takže vrchol je (-1, -3).' },

  // ── Úroveň 4 — Složené a inverzní funkce ──
  'rm-precalc-25': { introduction: 'Nejprve spočítej vnitřní funkci, pak vnější.', question: 'Když f(x) = x + 2 a g(x) = 3x, kolik je f(g(2))?', options: ['12', '10', '6', '8'], explanation: 'g(2) = 6, potom f(6) = 6 + 2 = 8.' },
  'rm-precalc-26': { introduction: 'Nejprve spočítej vnitřní funkci, pak vnější.', question: 'Když f(x) = 2x a g(x) = x - 1, kolik je g(f(3))?', options: ['7', '6', '5', '4'], explanation: 'f(3) = 6, potom g(6) = 6 - 1 = 5.' },
  'rm-precalc-27': { introduction: 'Vyřeš y = x + 5 pro x.', question: 'Když f(x) = x + 5, čemu se rovná f^-1(x)?', options: ['x + 5', 'x - 5', '5 - x', '5x'], explanation: 'Řešením y = x + 5 pro x dostaneme x = y - 5, takže f^-1(x) = x - 5.' },
  'rm-precalc-28': { introduction: 'Vyřeš y = 2x pro x.', question: 'Když f(x) = 2x, čemu se rovná f^-1(x)?', options: ['2x', 'x/2', 'x - 2', '-2x'], explanation: 'Řešením y = 2x pro x dostaneme x = y/2, takže f^-1(x) = x/2.' },
  'rm-precalc-29': { introduction: 'Vyřeš y = 3x - 6 pro x.', question: 'Když f(x) = 3x - 6, čemu se rovná f^-1(x)?', options: ['(x - 6)/3', '3x + 6', '(x + 6)/3', '(x + 6)*3'], explanation: 'Řešením y = 3x - 6 dostaneme x = (y + 6)/3, takže f^-1(x) = (x + 6)/3.' },
  'rm-precalc-30': { introduction: 'Inverzí umocnění na druhou je odmocnina.', question: 'Když f(x) = x^2 pro x ≥ 0, čemu se rovná f^-1(x)?', options: ['x^2', '√x', '1/x^2', '-√x'], explanation: 'Inverzí umocnění na druhou (pro x ≥ 0) je hlavní druhá odmocnina, √x.' },
  'rm-precalc-31': { introduction: 'Nejprve spočítej vnitřní funkci, pak vnější.', question: 'Když f(x) = x^3 a g(x) = x + 1, kolik je f(g(1))?', options: ['8', '2', '7', '9'], explanation: 'g(1) = 2, potom f(2) = 2^3 = 8.' },
  'rm-precalc-32': { introduction: 'Inverzní funkce navzájem ruší svůj účinek.', question: 'Když jsou f a g inverzní funkce, čemu se rovná f(g(x))?', options: ['1', '0', 'x', 'g(x)'], explanation: 'Inverzní funkce navzájem ruší svůj účinek, takže f(g(x)) = x.' },

  // ── Úroveň 5 — Polynomiální a racionální funkce ──
  'rm-precalc-33': { introduction: 'Stupeň je nejvyšší mocnina.', question: 'Jaký je stupeň f(x) = x^3 + 2x - 1?', options: ['1', '2', '3', '4'], explanation: 'Stupeň je nejvyšší exponent, což je 3.' },
  'rm-precalc-34': { introduction: 'Rozlož trojčlen na součin.', question: 'Jaké jsou kořeny rovnice x^2 - 5x + 6 = 0?', options: ['-2 a -3', '1 a 6', '2 a -3', '2 a 3'], explanation: 'Rozkládá se na (x - 2)(x - 3) = 0, což dává x = 2 a x = 3.' },
  'rm-precalc-35': { introduction: 'Svislá asymptota je tam, kde je jmenovatel nulový.', question: 'Jaká je svislá asymptota f(x) = 1/(x - 4)?', options: ['x = -4', 'x = 4', 'y = 4', 'x = 0'], explanation: 'Jmenovatel je nulový pro x = 4, což zde dává svislou asymptotu.' },
  'rm-precalc-36': { introduction: 'Zvaž znaménko a paritu stupně vedoucího členu.', question: 'Jaké je chování v nekonečnu (koncové chování) f(x) = -x^2?', options: ['oba konce nahoru', 'oba konce dolů', 'vlevo nahoru, vpravo dolů', 'vlevo dolů, vpravo nahoru'], explanation: 'Záporný vedoucí koeficient u sudého stupně posílá oba konce do -∞ (dolů).' },
  'rm-precalc-37': { introduction: 'Polož funkci rovnou nule a vyřeš.', question: 'Jaký je průsečík s osou x u f(x) = 2x - 8?', options: ['-4', '8', '4', '2'], explanation: 'Z rovnice 2x - 8 = 0 dostaneme x = 4.' },
  'rm-precalc-38': { introduction: 'Při stejných stupních je asymptota poměrem vedoucích koeficientů.', question: 'Jaká je vodorovná asymptota f(x) = 2x/(x + 1)?', options: ['y = 2', 'y = 0', 'y = 1', 'x = 2'], explanation: 'Stejné stupně dávají vodorovnou asymptotu v poměru vedoucích koeficientů, y = 2.' },
  'rm-precalc-39': { introduction: 'Použij základní větu algebry.', question: 'Kolik kořenů (včetně násobnosti) má polynom stupně 4?', options: ['2', '3', '4', '5'], explanation: 'Podle základní věty algebry má polynom stupně 4 přesně 4 kořeny.' },
  'rm-precalc-40': { introduction: 'Rozpoznej rozdíl druhých mocnin.', question: 'Jaký je rozklad na součin výrazu x^2 - 9?', options: ['(x - 9)(x + 1)', '(x - 3)^2', '(x + 3)^2', '(x - 3)(x + 3)'], explanation: 'Jde o rozdíl druhých mocnin: x^2 - 9 = (x - 3)(x + 3).' },

  // ── Úroveň 6 — Logaritmy ──
  'rm-precalc-41': { introduction: 'Ptej se: na kolikátou umocnit 2, abych dostal 8?', question: 'Kolik je log_2(8)?', options: ['16', '9', '3', '4'], explanation: 'Protože 2^3 = 8, platí log_2(8) = 3.' },
  'rm-precalc-42': { introduction: 'Ptej se: na kolikátou umocnit 10, abych dostal 100?', question: 'Kolik je log(100) (základ 10)?', options: ['2', '1', '10', '100'], explanation: 'Protože 10^2 = 100, platí log(100) = 2.' },
  'rm-precalc-43': { introduction: 'Ptej se: na kolikátou umocnit 3, abych dostal 9?', question: 'Kolik je log_3(9)?', options: ['9', '6', '3', '2'], explanation: 'Protože 3^2 = 9, platí log_3(9) = 2.' },
  'rm-precalc-44': { introduction: 'ln má základ e.', question: 'Kolik je ln(e)?', options: ['0', '1', 'e', '-1'], explanation: 'ln má základ e a e^1 = e, takže ln(e) = 1.' },
  'rm-precalc-45': { introduction: 'Jakýkoli základ umocněný na 0 dává 1.', question: 'Kolik je log_5(1)?', options: ['5', '0', '1', '-1'], explanation: 'Jakýkoli základ umocněný na 0 je roven 1, takže log_5(1) = 0.' },
  'rm-precalc-46': { introduction: 'Zapiš 1/8 jako mocninu 2.', question: 'Kolik je log_2(1/8)?', options: ['3', '8', '-8', '-3'], explanation: 'Protože 1/8 = 2^-3, platí log_2(1/8) = -3.' },
  'rm-precalc-47': { introduction: 'Ptej se: na kolikátou umocnit 2, abych dostal 32?', question: 'Kolik je log_2(32)?', options: ['5', '6', '4', '16'], explanation: 'Protože 2^5 = 32, platí log_2(32) = 5.' },
  'rm-precalc-48': { introduction: 'Ptej se: na kolikátou umocnit 4, abych dostal 16?', question: 'Kolik je log_4(16)?', options: ['16', '4', '2', '8'], explanation: 'Protože 4^2 = 16, platí log_4(16) = 2.' },

  // ── Úroveň 7 — Exponenciální a logaritmické rovnice ──
  'rm-precalc-49': { introduction: 'Zapiš 8 jako mocninu 2.', question: 'Vyřeš pro x: 2^x = 8.', options: ['2', '3', '4', '8'], explanation: 'Protože 2^3 = 8, platí x = 3.' },
  'rm-precalc-50': { introduction: 'Jakýkoli základ na nultou dává 1.', question: 'Vyřeš pro x: e^x = 1.', options: ['1', 'e', '-1', '0'], explanation: 'Jakýkoli základ umocněný na 0 je roven 1, takže x = 0.' },
  'rm-precalc-51': { introduction: 'Přepiš logaritmus do exponenciálního tvaru.', question: 'Vyřeš pro x: log_2(x) = 4.', options: ['4', '8', '16', '2'], explanation: 'Přepisem dostaneme x = 2^4 = 16.' },
  'rm-precalc-52': { introduction: 'Zapiš 81 jako mocninu 3.', question: 'Vyřeš pro x: 3^x = 81.', options: ['4', '3', '9', '27'], explanation: 'Protože 3^4 = 81, platí x = 4.' },
  'rm-precalc-53': { introduction: 'Zapiš 1000 jako mocninu 10.', question: 'Vyřeš pro x: 10^x = 1000.', options: ['30', '10', '2', '3'], explanation: 'Protože 10^3 = 1000, platí x = 3.' },
  'rm-precalc-54': { introduction: 'Přepiš logaritmus do exponenciálního tvaru.', question: 'Vyřeš pro x: ln(x) = 1.', options: ['1', 'e', '0', '2'], explanation: 'Přepisem dostaneme x = e^1 = e.' },
  'rm-precalc-55': { introduction: 'Zapiš 25 jako mocninu 5.', question: 'Vyřeš pro x: 5^x = 25.', options: ['5', '25', '2', '1'], explanation: 'Protože 5^2 = 25, platí x = 2.' },
  'rm-precalc-56': { introduction: 'Přepiš logaritmus do exponenciálního tvaru.', question: 'Vyřeš pro x: log_3(x) = 2.', options: ['9', '6', '3', '12'], explanation: 'Přepisem dostaneme x = 3^2 = 9.' },

  // ── Úroveň 8 — Posloupnosti a řady ──
  'rm-precalc-57': { introduction: 'Odečti dva po sobě jdoucí členy.', question: 'Jaká je diference posloupnosti 2, 5, 8, 11, ...?', options: ['2', '3', '5', '1'], explanation: 'Každý člen se zvětšuje o 3, takže diference je 3.' },
  'rm-precalc-58': { introduction: 'Zjisti diferenci a přičti ji k poslednímu členu.', question: 'Jaký je další člen posloupnosti 3, 7, 11, 15, ...?', options: ['17', '18', '20', '19'], explanation: 'Diference je 4, takže 15 + 4 = 19.' },
  'rm-precalc-59': { introduction: 'Poděl dva po sobě jdoucí členy.', question: 'Jaký je kvocient posloupnosti 2, 6, 18, 54, ...?', options: ['3', '2', '6', '4'], explanation: 'Každý člen se násobí 3, takže kvocient je 3.' },
  'rm-precalc-60': { introduction: 'Použij vzorec a_n = a_1 + (n - 1)d.', question: 'Jaký je 10. člen aritmetické posloupnosti s a1 = 1 a d = 2?', options: ['20', '21', '19', '18'], explanation: 'a10 = 1 + (10 - 1)(2) = 1 + 18 = 19.' },
  'rm-precalc-61': { introduction: 'Prostě sečti všech pět členů.', question: 'Jaký je součet prvních pěti členů posloupnosti 1, 2, 3, 4, 5?', options: ['10', '15', '20', '25'], explanation: '1 + 2 + 3 + 4 + 5 = 15.' },
  'rm-precalc-62': { introduction: 'Zjisti kvocient a vynásob poslední člen.', question: 'Jaký je další člen geometrické posloupnosti 1, 2, 4, 8, ...?', options: ['10', '12', '14', '16'], explanation: 'Kvocient je 2, takže 8 × 2 = 16.' },
  'rm-precalc-63': { introduction: 'Použij vzorec n(n + 1)/2.', question: 'Jaký je součet 1 + 2 + 3 + ... + 100?', options: ['5000', '5050', '2550', '10100'], explanation: 'Podle vzorce n(n + 1)/2 = 100(101)/2 = 5050.' },
  'rm-precalc-64': { introduction: 'Členy jsou násobky 5.', question: 'Jaký je n-tý člen posloupnosti 5, 10, 15, 20, ...?', options: ['5n', 'n + 5', '5 + n', '10n'], explanation: 'Členy jsou násobky 5, takže n-tý člen je 5n.' },

  // ── Úroveň 9 — Komplexní čísla ──
  'rm-precalc-65': { introduction: 'Vyjdi z definice imaginární jednotky.', question: 'Kolik je i^2 (kde i = √-1)?', options: ['1', '-1', 'i', '-i'], explanation: 'Podle definice i = √-1, takže i^2 = -1.' },
  'rm-precalc-66': { introduction: 'Sečti zvlášť reálné a imaginární části.', question: 'Kolik je (2 + 3i) + (1 - i)?', options: ['3 + 2i', '3 + 4i', '1 + 2i', '3 - 2i'], explanation: 'Sečti reálné části 2 + 1 = 3 a imaginární části 3i - i = 2i, což dává 3 + 2i.' },
  'rm-precalc-67': { introduction: 'Odečti zvlášť reálné a imaginární části.', question: 'Kolik je (2 + 3i) - (1 - i)?', options: ['1 + 2i', '3 + 2i', '1 + 3i', '1 + 4i'], explanation: 'Odečti: (2 - 1) + (3i - (-i)) = 1 + 4i.' },
  'rm-precalc-68': { introduction: 'Využij, že i^2 = -1.', question: 'Kolik je i^4?', options: ['-1', 'i', '1', '-i'], explanation: 'i^4 = (i^2)^2 = (-1)^2 = 1.' },
  'rm-precalc-69': { introduction: 'Jde o rozdíl druhých mocnin.', question: 'Kolik je (1 + i)(1 - i)?', options: ['0', '2', '2i', '1 + i'], explanation: 'Je to 1 - i^2 = 1 - (-1) = 2.' },
  'rm-precalc-70': { introduction: 'Komplexně sdružené číslo mění znaménko imaginární části.', question: 'Jaké je komplexně sdružené číslo k 3 + 4i?', options: ['3 - 4i', '-3 + 4i', '-3 - 4i', '4 - 3i'], explanation: 'Komplexně sdružené číslo mění znaménko imaginární části, což dává 3 - 4i.' },
  'rm-precalc-71': { introduction: 'Rozlož i^3 na i^2 · i.', question: 'Kolik je i^3?', options: ['i', '-i', '1', '-1'], explanation: 'i^3 = i^2 · i = -1 · i = -i.' },
  'rm-precalc-72': { introduction: 'Vynásob a využij i^2 = -1.', question: 'Kolik je (2i)(3i)?', options: ['6', '6i', '-6i', '-6'], explanation: '(2i)(3i) = 6i^2 = 6(-1) = -6.' },

  // ── Úroveň 10 — Úvod do limit ──
  'rm-precalc-73': { introduction: 'Funkce je spojitá, takže stačí dosadit.', question: 'Kolik je lim x→2 z (x + 3)?', options: ['5', '2', '3', '6'], explanation: 'Funkce je spojitá, takže dosadíme: 2 + 3 = 5.' },
  'rm-precalc-74': { introduction: 'Dosaď přímo.', question: 'Kolik je lim x→0 z x^2?', options: ['1', '2', 'není definováno', '0'], explanation: 'Dosadíme přímo: 0^2 = 0.' },
  'rm-precalc-75': { introduction: 'Dosaď přímo.', question: 'Kolik je lim x→3 z 2x?', options: ['3', '6', '9', '2'], explanation: 'Dosadíme přímo: 2(3) = 6.' },
  'rm-precalc-76': { introduction: 'Rozlož čitatel a zkrať.', question: 'Kolik je lim x→2 z (x^2 - 4)/(x - 2)?', options: ['0', '2', '4', 'není definováno'], explanation: 'Rozložíme na (x + 2); limita je 2 + 2 = 4.' },
  'rm-precalc-77': { introduction: 'Přemýšlej, co se děje, když x roste nade všechny meze.', question: 'Kolik je lim x→∞ z 1/x?', options: ['1', '0', '∞', '-1'], explanation: 'Když x roste nade všechny meze, 1/x se blíží k 0.' },
  'rm-precalc-78': { introduction: 'Dosaď přímo.', question: 'Kolik je lim x→1 z (x^2 + 1)?', options: ['1', '3', '2', '0'], explanation: 'Dosadíme přímo: 1^2 + 1 = 2.' },
  'rm-precalc-79': { introduction: 'Pro x ≠ 5 se výraz zjednoduší.', question: 'Kolik je lim x→5 z (x - 5)/(x - 5)?', options: ['0', '1', '5', 'není definováno'], explanation: 'Pro x ≠ 5 se výraz rovná 1, takže limita je 1.' },
  'rm-precalc-80': { introduction: 'Dosaď přímo, jmenovatel není nulový.', question: 'Kolik je lim x→2 z (x^2 - 4)/(x + 2)?', options: ['0', '4', '-4', 'není definováno'], explanation: 'Dosadíme: (4 - 4)/(2 + 2) = 0/4 = 0.' },
};
