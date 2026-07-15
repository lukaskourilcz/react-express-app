import type { QuestionTranslation } from './quiz-data';

export const calculusTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Limity ──
  'rm-calc-1': { introduction: 'Dosaď hodnotu přímo.', question: 'Kolik je lim x→2 (x + 3)?', options: ['3', '5', '6', '2'], explanation: 'Přímé dosazení dává 2 + 3 = 5.' },
  'rm-calc-2': { introduction: 'Dosaď x = 0.', question: 'Kolik je lim x→0 x^2?', options: ['0', '1', 'nedefinováno', '2'], explanation: 'Dosazení x = 0 dává 0^2 = 0.' },
  'rm-calc-3': { introduction: 'Dosaď hodnotu přímo.', question: 'Kolik je lim x→3 2x?', options: ['3', '5', '6', '9'], explanation: 'Přímé dosazení dává 2·3 = 6.' },
  'rm-calc-4': { introduction: 'Klasická speciální limita.', question: 'Kolik je lim x→0 sin(x)/x?', options: ['0', '1', '∞', 'nedefinováno'], explanation: 'Toto je klasická speciální limita rovna 1.' },
  'rm-calc-5': { introduction: 'Uvažuj chování pro velmi velká x.', question: 'Kolik je lim x→∞ 1/x?', options: ['1', '∞', '0', '-1'], explanation: 'Když x roste nade všechny meze, 1/x se blíží k 0.' },
  'rm-calc-6': { introduction: 'Nejprve rozlož čitatel na součin.', question: 'Kolik je lim x→2 (x^2 - 4)/(x - 2)?', options: ['0', '2', '4', 'nedefinováno'], explanation: 'Rozklad na (x-2)(x+2)/(x-2) = x+2, což pro x=2 dává 4.' },
  'rm-calc-7': { introduction: 'Limita konstanty.', question: 'Kolik je lim x→10 5?', options: ['0', '5', 'x', 'nedefinováno'], explanation: 'Limita konstanty je samotná konstanta, 5.' },
  'rm-calc-8': { introduction: 'Dosaď x = 1.', question: 'Kolik je lim x→1 (x^2 + 1)?', options: ['1', '2', '3', '0'], explanation: 'Dosazení x = 1 dává 1 + 1 = 2.' },

  // ── Úroveň 2 — Spojitost ──
  'rm-calc-9': { introduction: 'Vzpomeň si na definici spojitosti.', question: 'Funkce je spojitá v bodě x = a, pokud se lim x→a f(x) rovná čemu?', options: ['f(a)', '0', 'a', 'derivaci'], explanation: 'Spojitost vyžaduje, aby se limita rovnala funkční hodnotě f(a).' },
  'rm-calc-10': { introduction: 'Je funkce v bodě 0 definována?', question: 'Je f(x) = 1/x spojitá v bodě x = 0?', options: ['Ano', 'Ne, v bodě 0 není definována', 'Jen zleva', 'Ano, všude'], explanation: '1/x není definována v x = 0, takže tam nemůže být spojitá.' },
  'rm-calc-11': { introduction: 'Které funkce nemají žádné body nespojitosti?', question: 'Která funkce je spojitá pro všechna reálná čísla?', options: ['1/x', 'tan(x)', 'x^2', '1/(x-1)'], explanation: 'Polynomy jako x^2 jsou spojité všude.' },
  'rm-calc-12': { introduction: 'Jde o „díru“ v grafu.', question: 'Odstranitelná nespojitost nastává, když limita existuje, ale...', options: ['nerovná se f(a) (nebo f(a) není definována)', 'limita je nekonečná', 'funkce skáče', 'nic z toho'], explanation: 'Díra je odstranitelná: limita existuje, ale liší se od f(a) nebo ji nahrazuje.' },
  'rm-calc-13': { introduction: 'Má absolutní hodnota v nule zlom?', question: 'Je f(x) = |x| spojitá v bodě x = 0?', options: ['Ano', 'Ne', 'Jen zprava', 'Nedefinováno'], explanation: 'Absolutní hodnota nemá žádný zlom; v bodě x = 0 je spojitá.' },
  'rm-calc-14': { introduction: 'Funkce přeskočí z jedné hodnoty na druhou.', question: 'Jaký druh nespojitosti má schodová funkce?', options: ['Odstranitelnou', 'Skokovou', 'Nekonečnou', 'Žádnou'], explanation: 'Schodová funkce skáče z jedné hodnoty na druhou, jde o skokovou nespojitost.' },
  'rm-calc-15': { introduction: 'Co se děje, když se jmenovatel blíží nule?', question: 'Jakou nespojitost má 1/(x - 1) v bodě x = 1?', options: ['Odstranitelnou', 'Skokovou', 'Nekonečnou', 'Spojitá'], explanation: 'Funkce v bodě x = 1 roste do nekonečna, jde o nekonečnou nespojitost.' },
  'rm-calc-16': { introduction: 'Věta o mezihodnotě.', question: 'Pro f spojitou na [a, b] věta o mezihodnotě zaručuje, že f...', options: ['nabývá každé hodnoty mezi f(a) a f(b)', 'je diferencovatelná', 'má pouze maximum', 'je lineární'], explanation: 'Věta o mezihodnotě říká, že spojitá funkce nabývá všech mezihodnot.' },

  // ── Úroveň 3 — Derivace ──
  'rm-calc-17': { introduction: 'Přemýšlej o významu sklonu.', question: 'Co měří derivace?', options: ['Plochu pod křivkou', 'Okamžitou rychlost změny', 'Limitu v nekonečnu', 'Průsečík s osou y'], explanation: 'Derivace udává okamžitou rychlost změny (sklon).' },
  'rm-calc-18': { introduction: 'Použij mocninné pravidlo.', question: 'Kolik je d/dx[x^2]?', options: ['x', '2x', 'x^2', '2'], explanation: 'Podle mocninného pravidla je d/dx[x^2] = 2x.' },
  'rm-calc-19': { introduction: 'Derivace konstanty.', question: 'Kolik je d/dx[c] pro konstantu c?', options: ['c', '1', '0', 'x'], explanation: 'Derivace libovolné konstanty je 0.' },
  'rm-calc-20': { introduction: 'Derivace x podle x.', question: 'Kolik je d/dx[x]?', options: ['0', '1', 'x', '2x'], explanation: 'Derivace x podle x je 1.' },
  'rm-calc-21': { introduction: 'Definice derivace pomocí limity.', question: 'Derivace jako limita je f\'(x) = lim h→0 čeho?', options: ['(f(x+h) - f(x))/h', '(f(x) - f(h))/h', 'f(x+h) - f(x)', 'f(x)/h'], explanation: 'Tento diferenční podíl definuje derivaci.' },
  'rm-calc-22': { introduction: 'Derivace lineární funkce.', question: 'Kolik je d/dx[3x]?', options: ['3', 'x', '3x', '0'], explanation: 'Derivace 3x je konstantní sklon 3.' },
  'rm-calc-23': { introduction: 'Sklon které přímky v daném bodě?', question: 'V daném bodě se f\'(x) rovná sklonu které přímky?', options: ['Sečny', 'Tečny', 'Normály', 'Osy x'], explanation: 'Derivace je sklon tečny v daném bodě.' },
  'rm-calc-24': { introduction: 'Použij mocninné pravidlo.', question: 'Kolik je d/dx[x^3]?', options: ['3x^2', 'x^2', '3x', '2x^3'], explanation: 'Podle mocninného pravidla je d/dx[x^3] = 3x^2.' },

  // ── Úroveň 4 — Pravidla derivování ──
  'rm-calc-25': { introduction: 'Mocninné pravidlo.', question: 'Kolik je d/dx[x^n] podle mocninného pravidla?', options: ['n·x^(n-1)', 'x^(n-1)', 'n·x^n', '(n-1)·x^n'], explanation: 'Mocninné pravidlo dává n·x^(n-1).' },
  'rm-calc-26': { introduction: 'Derivace sinu.', question: 'Kolik je d/dx[sin(x)]?', options: ['cos(x)', '-cos(x)', '-sin(x)', 'sin(x)'], explanation: 'Derivace sin(x) je cos(x).' },
  'rm-calc-27': { introduction: 'Derivace kosinu.', question: 'Kolik je d/dx[cos(x)]?', options: ['sin(x)', '-sin(x)', 'cos(x)', '-cos(x)'], explanation: 'Derivace cos(x) je -sin(x).' },
  'rm-calc-28': { introduction: 'Speciální exponenciální funkce.', question: 'Kolik je d/dx[e^x]?', options: ['x·e^(x-1)', 'e^x', 'e^x/x', '1'], explanation: 'e^x je svou vlastní derivací.' },
  'rm-calc-29': { introduction: 'Derivace přirozeného logaritmu.', question: 'Kolik je d/dx[ln(x)]?', options: ['1/x', 'ln(x)', 'x', '-1/x^2'], explanation: 'Derivace ln(x) je 1/x.' },
  'rm-calc-30': { introduction: 'Pravidlo pro derivaci součinu.', question: 'Pravidlo pro součin říká d/dx[f·g] = ?', options: ["f'·g'", "f'·g + f·g'", "f'·g - f·g'", "f·g'"], explanation: "Pravidlo pro součin je f'·g + f·g'." },
  'rm-calc-31': { introduction: 'Pravidlo pro derivaci podílu.', question: 'Pravidlo pro podíl říká d/dx[f/g] = ?', options: ["(f'·g - f·g')/g^2", "(f·g' - f'·g)/g^2", "f'/g'", "(f'·g + f·g')/g^2"], explanation: "Pravidlo pro podíl je (f'·g - f·g')/g^2." },
  'rm-calc-32': { introduction: 'Zkombinuj konstantu a mocninné pravidlo.', question: 'Kolik je d/dx[5x^4]?', options: ['20x^3', '5x^3', '20x^4', '4x^3'], explanation: 'Sneseš 4: 5·4·x^3 = 20x^3.' },

  // ── Úroveň 5 — Pravidlo o derivaci složené funkce ──
  'rm-calc-33': { introduction: 'Derivace vnější krát derivace vnitřní.', question: 'Pravidlo o derivaci složené funkce říká d/dx[f(g(x))] = ?', options: ["f'(g(x))", "f'(g(x))·g'(x)", "f'(x)·g'(x)", "f(g'(x))"], explanation: "Vynásob derivaci vnější funkce derivací vnitřní: f'(g(x))·g'(x)." },
  'rm-calc-34': { introduction: 'Použij pravidlo o derivaci složené funkce.', question: 'Kolik je d/dx[(x^2 + 1)^3]?', options: ['3(x^2+1)^2', '2x(x^2+1)^3', '6x(x^2+1)^2', '6x(x^2+1)^3'], explanation: 'Pravidlo o složené funkci: 3(x^2+1)^2·(2x) = 6x(x^2+1)^2.' },
  'rm-calc-35': { introduction: 'Nezapomeň na derivaci vnitřní funkce.', question: 'Kolik je d/dx[sin(2x)]?', options: ['2cos(2x)', 'cos(2x)', '-2cos(2x)', '2sin(2x)'], explanation: 'Pravidlo o složené funkci: cos(2x)·2 = 2cos(2x).' },
  'rm-calc-36': { introduction: 'Nezapomeň na derivaci vnitřní funkce.', question: 'Kolik je d/dx[e^(3x)]?', options: ['e^(3x)', '3e^x', 'e^(3x)/3', '3e^(3x)'], explanation: 'Pravidlo o složené funkci: e^(3x)·3 = 3e^(3x).' },
  'rm-calc-37': { introduction: 'Nezapomeň na derivaci vnitřní funkce.', question: 'Kolik je d/dx[(3x + 1)^5]?', options: ['5(3x+1)^4', '3(3x+1)^4', '15(3x+1)^4', '5(3x+1)^5'], explanation: 'Pravidlo o složené funkci: 5(3x+1)^4·3 = 15(3x+1)^4.' },
  'rm-calc-38': { introduction: 'Nezapomeň na derivaci vnitřní funkce.', question: 'Kolik je d/dx[cos(x^2)]?', options: ['-sin(x^2)', '2x·sin(x^2)', '-sin(2x)', '-2x·sin(x^2)'], explanation: 'Pravidlo o složené funkci: -sin(x^2)·2x = -2x·sin(x^2).' },
  'rm-calc-39': { introduction: 'Nezapomeň na derivaci vnitřní funkce.', question: 'Kolik je d/dx[ln(5x)]?', options: ['1/x', '5/x', '1/(5x)', 'ln(5)'], explanation: 'Pravidlo o složené funkci: (1/(5x))·5 = 1/x.' },
  'rm-calc-40': { introduction: 'Nezapomeň na derivaci vnitřní funkce.', question: 'Kolik je d/dx[(x^3 + 2x)^4]?', options: ['4(x^3+2x)^3', '(3x^2+2)(x^3+2x)^3', '4(3x^2+2)(x^3+2x)^3', '12x^2(x^3+2x)^3'], explanation: 'Pravidlo o složené funkci: 4(x^3+2x)^3·(3x^2+2).' },

  // ── Úroveň 6 — Aplikace derivací ──
  'rm-calc-41': { introduction: 'Co znamená kladná derivace?', question: 'Pokud f\'(x) > 0 na intervalu, funkce je...', options: ['rostoucí', 'klesající', 'konstantní', 'konkávní'], explanation: 'Kladná derivace znamená, že funkce je rostoucí.' },
  'rm-calc-42': { introduction: 'Kde je derivace nulová nebo neexistuje?', question: 'Kritický bod nastává tam, kde se f\'(x) rovná...', options: ['0 (nebo není definována)', '1', '∞', 'maximu'], explanation: 'Kritické body jsou tam, kde je derivace nulová nebo není definována.' },
  'rm-calc-43': { introduction: 'Druhá derivace určuje konvexitu.', question: 'Pokud f\'\'(x) > 0, graf je...', options: ['konkávní (vypuklý dolů)', 'konvexní (vypuklý nahoru)', 'lineární', 'klesající'], explanation: 'Kladná druhá derivace znamená, že graf je konvexní (vypuklý nahoru).' },
  'rm-calc-44': { introduction: 'Jaký je sklon tečny ve vrcholu?', question: 'V hladkém lokálním maximu se f\'(x) rovná...', options: ['0', 'kladnému číslu', 'zápornému číslu', 'vždy není definována'], explanation: 'V hladkém lokálním maximu je tečna vodorovná, takže f\'(x) = 0.' },
  'rm-calc-45': { introduction: 'Kde se mění konvexita?', question: 'Inflexní bod je tam, kde...', options: ["f'(x) = 0", 'se mění konvexita', 'f má maximum', 'f není definována'], explanation: 'Inflexní bod je tam, kde konvexita mění znaménko.' },
  'rm-calc-46': { introduction: 'Rychlost je derivace polohy.', question: 'Pokud je poloha s(t), pak rychlost je...', options: ["s'(t)", 's(t)', "s''(t)", '∫s dt'], explanation: 'Rychlost je derivace polohy, s\'(t).' },
  'rm-calc-47': { introduction: 'Lagrangeova věta o střední hodnotě.', question: 'Věta o střední hodnotě zaručuje bod, kde se f\'(c) rovná...', options: ['0', 'průměrné rychlosti změny na [a, b]', 'maximu', 'f(c)'], explanation: 'Věta o střední hodnotě dává bod, kde se okamžitá rychlost rovná průměrné rychlosti.' },
  'rm-calc-48': { introduction: 'Použij test druhé derivace.', question: 'Pokud f\'(a) = 0 a f\'\'(a) < 0, pak a je...', options: ['lokální minimum', 'inflexní bod', 'lokální maximum', 'sedlový bod'], explanation: 'Záporná druhá derivace v kritickém bodě signalizuje lokální maximum.' },

  // ── Úroveň 7 — Optimalizace ──
  'rm-calc-49': { introduction: 'Kterou veličinu položíš rovnu nule?', question: 'Prvním krokem optimalizace je položit rovnu nule kterou veličinu?', options: ["f'(x)", 'f(x)', "f''(x)", 'x'], explanation: 'Položení f\'(x) = 0 najde kandidáty na optima (kritické body).' },
  'rm-calc-50': { introduction: 'Který tvar maximalizuje plochu při daném obvodu?', question: 'Obdélník s daným obvodem má maximální plochu, když je to...', options: ['čtverec', 'dlouhý úzký pruh', 'trojúhelník', 'kruh'], explanation: 'Při daném obvodu maximalizuje plochu čtverec.' },
  'rm-calc-51': { introduction: 'Polož derivaci rovnu nule.', question: 'V jakém x dosahuje f(x) = x^2 - 4x svého minima?', options: ['0', '2', '4', '-2'], explanation: 'f\'(x) = 2x - 4 = 0 dává x = 2.' },
  'rm-calc-52': { introduction: 'Dosaď minimizující x zpět do funkce.', question: 'Jaká je minimální hodnota f(x) = x^2 - 4x?', options: ['-4', '0', '4', '-2'], explanation: 'Pro x = 2 je f(2) = 4 - 8 = -4.' },
  'rm-calc-53': { introduction: 'Nezapomeň zkontrolovat krajní body.', question: 'Na uzavřeném intervalu [a, b] mohou extrémy nastat v kritických bodech a...', options: ['středech', 'krajních bodech', 'inflexních bodech', 'počátku'], explanation: 'Vždy zkontroluj také krajní body intervalu.' },
  'rm-calc-54': { introduction: 'Zderivuj funkci obsahu.', question: 'K nalezení největšího obdélníku pod křivkou...', options: ['položíš derivaci funkce obsahu rovnu nule', 'zintegruješ obsah', 'použiješ pouze druhou derivaci', 'hádáš a zkoušíš'], explanation: 'Maximalizuješ tak, že zderivuješ funkci obsahu a vyřešíš rovnici s nulou.' },
  'rm-calc-55': { introduction: 'Polož derivaci rovnu nule a vyřeš.', question: 'Pro x > 0, v jakém x je f(x) = x^2 + 16/x minimalizováno?', options: ['1', '4', '2', '8'], explanation: 'f\'(x) = 2x - 16/x^2 = 0 dává x^3 = 8, tedy x = 2.' },
  'rm-calc-56': { introduction: 'Využij podmínku daného objemu.', question: 'K minimalizaci materiálu na krabici bez víka s daným objemem...', options: ['položíš derivaci povrchu rovnu nule', 'maximalizuješ podstavu', 'uděláš ji nekonečně vysokou', 'ignoruješ podmínku objemu'], explanation: 'Vyjádříš povrch pomocí podmínky objemu a poté položíš jeho derivaci rovnu nule.' },

  // ── Úroveň 8 — Integrál ──
  'rm-calc-57': { introduction: 'Použij mocninné pravidlo pro integrály.', question: 'Kolik je ∫x dx?', options: ['x^2/2 + C', 'x^2 + C', '2x + C', '1 + C'], explanation: 'Podle mocninného pravidla pro integrály je ∫x dx = x^2/2 + C.' },
  'rm-calc-58': { introduction: 'Integrál jedničky.', question: 'Kolik je ∫dx?', options: ['x + C', '1 + C', '0', 'C'], explanation: 'Integrál 1 podle x je x + C.' },
  'rm-calc-59': { introduction: 'Zvyš mocninu o jedna a vyděl.', question: 'Kolik je ∫x^2 dx?', options: ['x^3 + C', '2x + C', 'x^3/3 + C', '3x^2 + C'], explanation: 'Zvyš mocninu o jedna a vyděl: x^3/3 + C.' },
  'rm-calc-60': { introduction: 'Primitivní funkce kosinu.', question: 'Kolik je ∫cos(x) dx?', options: ['sin(x) + C', '-sin(x) + C', 'cos(x) + C', '-cos(x) + C'], explanation: 'Primitivní funkce ke cos(x) je sin(x) + C.' },
  'rm-calc-61': { introduction: 'Primitivní funkce sinu — pozor na znaménko.', question: 'Kolik je ∫sin(x) dx?', options: ['cos(x) + C', 'sin(x) + C', '-sin(x) + C', '-cos(x) + C'], explanation: 'Primitivní funkce k sin(x) je -cos(x) + C.' },
  'rm-calc-62': { introduction: 'Speciální exponenciální funkce.', question: 'Kolik je ∫e^x dx?', options: ['e^x + C', 'x·e^x + C', 'e^x/x + C', 'e^(x+1) + C'], explanation: 'e^x je svou vlastní primitivní funkcí: e^x + C.' },
  'rm-calc-63': { introduction: 'Co geometricky představuje určitý integrál?', question: 'Určitý integrál od a do b představuje...', options: ['sklon', 'čistou plochu pod křivkou', 'derivaci', 'tečnu'], explanation: 'Určitý integrál udává čistou (znaménkovou) plochu pod křivkou.' },
  'rm-calc-64': { introduction: 'Vytkni konstantu a integruj.', question: 'Kolik je ∫3x^2 dx?', options: ['x^3 + C', '6x + C', 'x^3/3 + C', '9x^3 + C'], explanation: '∫3x^2 dx = 3·x^3/3 + C = x^3 + C.' },

  // ── Úroveň 9 — Integrační techniky ──
  'rm-calc-65': { introduction: 'Pozor na absolutní hodnotu.', question: 'Kolik je ∫(1/x) dx?', options: ['ln|x| + C', '-1/x^2 + C', '1 + C', 'x·ln(x) + C'], explanation: 'Primitivní funkce k 1/x je ln|x| + C.' },
  'rm-calc-66': { introduction: 'Které pravidlo derivování obrací?', question: 'Substituce obrací které pravidlo derivování?', options: ['pravidlo pro součin', 'pravidlo o složené funkci', 'pravidlo pro podíl', 'mocninné pravidlo'], explanation: 'Substituce ruší pravidlo o derivaci složené funkce.' },
  'rm-calc-67': { introduction: 'Zaveď substituci a integruj.', question: 'Pomocí u = x^2 + 1, kolik je ∫2x(x^2 + 1)^3 dx?', options: ['(x^2+1)^4 + C', '2(x^2+1)^4 + C', '(x^2+1)^3 + C', '(x^2+1)^4/4 + C'], explanation: 'S du = 2x dx je ∫u^3 du = u^4/4 = (x^2+1)^4/4 + C.' },
  'rm-calc-68': { introduction: 'Vzorec pro integraci per partes.', question: 'Vzorec pro integraci per partes je ∫u dv = ?', options: ['u·v - ∫v du', 'u·v + ∫v du', '∫v du - u·v', 'u·v'], explanation: 'Integrace per partes: ∫u dv = u·v - ∫v du.' },
  'rm-calc-69': { introduction: 'Vyděl koeficientem u vnitřní funkce.', question: 'Kolik je ∫e^(2x) dx?', options: ['e^(2x) + C', '2e^(2x) + C', 'e^(2x)/2 + C', 'e^x + C'], explanation: 'Vyděl vnitřním koeficientem: e^(2x)/2 + C.' },
  'rm-calc-70': { introduction: 'Vyděl koeficientem u vnitřní funkce.', question: 'Kolik je ∫cos(3x) dx?', options: ['3sin(3x) + C', 'sin(3x) + C', '-sin(3x)/3 + C', 'sin(3x)/3 + C'], explanation: 'Vyděl vnitřním koeficientem: sin(3x)/3 + C.' },
  'rm-calc-71': { introduction: 'Zvol u tak, aby se integrál zjednodušil.', question: 'Pro ∫x·e^x dx metodou per partes, jaká je nejlepší volba u?', options: ['e^x', 'x', 'x·e^x', 'dx'], explanation: 'Zvol u = x, aby du zjednodušilo integrál.' },
  'rm-calc-72': { introduction: 'Primitivní funkce k sekundě na druhou.', question: 'Kolik je ∫sec^2(x) dx?', options: ['tan(x) + C', 'sec(x) + C', '-tan(x) + C', 'sec(x)·tan(x) + C'], explanation: 'Primitivní funkce k sec^2(x) je tan(x) + C.' },

  // ── Úroveň 10 — Základní věta ──
  'rm-calc-73': { introduction: 'Co spojuje derivování s další operací?', question: 'Základní věta integrálního počtu spojuje derivování s...', options: ['limitami', 'integrováním', 'spojitostí', 'optimalizací'], explanation: 'Základní věta propojuje derivaci a integrál jako navzájem inverzní procesy.' },
  'rm-calc-74': { introduction: 'První část základní věty.', question: 'Kolik je d/dx[∫ od a do x f(t) dt]?', options: ['f(x)', 'F(x)', 'f(a)', "f'(x)"], explanation: 'První část základní věty dává f(x).' },
  'rm-calc-75': { introduction: 'Druhá část základní věty.', question: 'Pokud je F primitivní funkce k f, pak se ∫ od a do b f(x) dx rovná...', options: ['F(a) - F(b)', 'F(b) - F(a)', 'F(b) + F(a)', 'f(b) - f(a)'], explanation: 'Druhá část základní věty vyčíslí F v mezích: F(b) - F(a).' },
  'rm-calc-76': { introduction: 'Najdi primitivní funkci a dosaď meze.', question: 'Kolik je ∫ od 0 do 2 x dx?', options: ['4', '1', '2', '0'], explanation: 'Primitivní funkce x^2/2 vyčíslená od 0 do 2 dává 2 - 0 = 2.' },
  'rm-calc-77': { introduction: 'Použij primitivní funkci -cos(x).', question: 'Kolik je ∫ od 0 do π sin(x) dx?', options: ['0', '1', '2', '-2'], explanation: '[-cos(x)] od 0 do π = -cos(π) + cos(0) = 1 + 1 = 2.' },
  'rm-calc-78': { introduction: 'Najdi primitivní funkci a dosaď meze.', question: 'Kolik je ∫ od 1 do 3 2x dx?', options: ['8', '9', '6', '4'], explanation: '[x^2] od 1 do 3 = 9 - 1 = 8.' },
  'rm-calc-79': { introduction: 'Použij primitivní funkci e^x.', question: 'Kolik je ∫ od 0 do 1 e^x dx?', options: ['e', 'e - 1', '1 - e', 'e + 1'], explanation: '[e^x] od 0 do 1 = e^1 - e^0 = e - 1.' },
  'rm-calc-80': { introduction: 'Najdi primitivní funkci a dosaď meze.', question: 'Kolik je ∫ od 0 do 2 3x^2 dx?', options: ['6', '8', '12', '4'], explanation: '[x^3] od 0 do 2 = 8 - 0 = 8.' },
};
