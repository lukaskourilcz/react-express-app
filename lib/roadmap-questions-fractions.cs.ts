import type { QuestionTranslation } from './quiz-data';

export const fractionsTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Porozumění zlomkům ──
  'rm-frac-1': { introduction: 'Numerátor (čitatel) je horní číslo zlomku.', question: 'Co je čitatel ve zlomku 3/4?', options: ['4', '7', '3', '1'], explanation: 'Čitatel je horní číslo zlomku, tedy 3.' },
  'rm-frac-2': { introduction: 'Jmenovatel je dolní číslo zlomku.', question: 'Co je jmenovatel ve zlomku 5/8?', options: ['5', '8', '13', '3'], explanation: 'Jmenovatel je dolní číslo zlomku, tedy 8.' },
  'rm-frac-3': { introduction: 'Počet vybarvených dílů děl počtem všech stejných dílů.', question: 'Obrazec je rozdělen na 4 stejné části a 1 část je vybarvena. Jaký zlomek je vybarven?', options: ['1/4', '4/1', '3/4', '1/3'], explanation: 'Jedna vybarvená část ze čtyř stejných částí se zapíše jako 1/4.' },
  'rm-frac-4': { introduction: 'Polovina znamená jednu ze dvou stejných částí.', question: 'Který zlomek představuje jednu polovinu?', options: ['1/3', '2/1', '1/2', '1/4'], explanation: 'Jedna polovina znamená jednu ze dvou stejných částí, zapisuje se 1/2.' },
  'rm-frac-5': { introduction: 'Počet snědených dílů děl celkovým počtem dílů.', question: 'Pizza je rozkrojena na 6 stejných dílů a ty sníš 1 díl. Jaký zlomek jsi snědl?', options: ['1/6', '6/1', '5/6', '1/5'], explanation: 'Jeden díl ze šesti stejných dílů je 1/6.' },
  'rm-frac-6': { introduction: 'U pravého zlomku je čitatel menší než jmenovatel.', question: 'Který z těchto zlomků je pravý zlomek?', options: ['5/3', '7/7', '2/9', '9/4'], explanation: 'Pravý zlomek má čitatel menší než jmenovatel, takže 2/9 vyhovuje.' },
  'rm-frac-7': { introduction: 'Přemýšlej, co udává dolní číslo zlomku.', question: 'Co ti říká jmenovatel zlomku?', options: ['Kolik částí je vybarveno', 'Celkový počet stejných částí v celku', 'Větší číslo', 'Kolik je celků'], explanation: 'Jmenovatel udává, na kolik stejných částí je celek rozdělen.' },
  'rm-frac-8': { introduction: 'Při stejném čitateli rozhoduje jmenovatel.', question: 'Který zlomek je větší, 1/2, nebo 1/4?', options: ['1/4', 'Jsou stejné', '1/2', 'Nelze určit'], explanation: 'Při stejném čitateli znamená menší jmenovatel větší zlomek, takže 1/2 je větší.' },

  // ── Úroveň 2 — Rovnocenné zlomky ──
  'rm-frac-9': { introduction: 'Zkus čitatel i jmenovatel vynásobit stejným číslem.', question: 'Který zlomek je rovnocenný s 1/2?', options: ['2/3', '3/6', '1/3', '2/5'], explanation: 'Vynásobením 1/2 hodnotou 3/3 získáš 3/6, takže 3/6 = 1/2.' },
  'rm-frac-10': { introduction: 'Vyděl čitatel i jmenovatel jejich společným dělitelem.', question: 'Zjednoduš 4/8 na základní tvar.', options: ['1/2', '2/4', '4/8', '1/4'], explanation: 'Vydělením čitatele i jmenovatele čtyřmi získáš 1/2.' },
  'rm-frac-11': { introduction: 'Zjisti, čím byl vynásoben jmenovatel.', question: 'Doplň chybějící číslo: 2/3 = ?/9', options: ['4', '5', '6', '3'], explanation: 'Vynásobením 2/3 hodnotou 3/3 získáš 6/9, takže chybějící číslo je 6.' },
  'rm-frac-12': { introduction: 'Vyděl čitatel i jmenovatel jejich společným dělitelem.', question: 'Zjednoduš 6/9 na základní tvar.', options: ['3/4', '2/3', '1/3', '6/9'], explanation: 'Vydělením čitatele i jmenovatele třemi získáš 2/3.' },
  'rm-frac-13': { introduction: 'Zkus čitatel i jmenovatel vynásobit stejným číslem.', question: 'Který zlomek je rovnocenný s 3/4?', options: ['6/8', '4/5', '9/16', '2/3'], explanation: 'Vynásobením 3/4 hodnotou 2/2 získáš 6/8, takže 6/8 = 3/4.' },
  'rm-frac-14': { introduction: 'Vyděl čitatel i jmenovatel jejich společným dělitelem.', question: 'Zjednoduš 10/15 na základní tvar.', options: ['5/3', '2/3', '3/5', '10/15'], explanation: 'Vydělením čitatele i jmenovatele pěti získáš 2/3.' },
  'rm-frac-15': { introduction: 'Zjisti, čím byl vynásoben čitatel.', question: 'Doplň chybějící číslo: 5/6 = 10/?', options: ['11', '12', '16', '15'], explanation: 'Vynásobením 5/6 hodnotou 2/2 získáš 10/12, takže chybějící číslo je 12.' },
  'rm-frac-16': { introduction: 'Porovnej hodnoty jednotlivých zlomků.', question: 'Který zlomek NENÍ rovnocenný s 1/3?', options: ['2/6', '3/9', '4/12', '2/5'], explanation: '2/5 se rovná 0,4, zatímco 1/3 se rovná přibližně 0,33, takže 2/5 není rovnocenný.' },

  // ── Úroveň 3 — Sčítání a odčítání zlomků ──
  'rm-frac-17': { introduction: 'Při stejném jmenovateli sečti čitatele.', question: 'Kolik je 1/4 + 1/4?', options: ['2/8', '1/2', '1/8', '3/4'], explanation: 'Sečtením čitatelů získáš 2/4, což se zjednoduší na 1/2.' },
  'rm-frac-18': { introduction: 'Najdi společný jmenovatel.', question: 'Kolik je 1/2 + 1/3?', options: ['2/5', '5/6', '2/6', '1/6'], explanation: 'Při společném jmenovateli 6 platí 3/6 + 2/6 = 5/6.' },
  'rm-frac-19': { introduction: 'Při stejném jmenovateli odečti čitatele.', question: 'Kolik je 3/5 - 1/5?', options: ['2/5', '2/0', '4/5', '2/10'], explanation: 'Při stejném jmenovateli odečti čitatele: 3 - 1 = 2, což dává 2/5.' },
  'rm-frac-20': { introduction: 'Převeď na společný jmenovatel.', question: 'Kolik je 2/3 - 1/6?', options: ['1/3', '1/2', '1/6', '5/6'], explanation: 'Přepsáním 2/3 na 4/6 platí 4/6 - 1/6 = 3/6 = 1/2.' },
  'rm-frac-21': { introduction: 'Převeď na společný jmenovatel.', question: 'Kolik je 1/2 + 1/4?', options: ['2/6', '3/4', '1/6', '2/4'], explanation: 'Přepsáním 1/2 na 2/4 platí 2/4 + 1/4 = 3/4.' },
  'rm-frac-22': { introduction: 'Převeď na společný jmenovatel.', question: 'Kolik je 5/6 - 1/3?', options: ['1/2', '4/3', '1/3', '2/3'], explanation: 'Přepsáním 1/3 na 2/6 platí 5/6 - 2/6 = 3/6 = 1/2.' },
  'rm-frac-23': { introduction: 'Převeď na společný jmenovatel.', question: 'Kolik je 3/8 + 1/4?', options: ['4/12', '5/8', '1/2', '4/8'], explanation: 'Přepsáním 1/4 na 2/8 platí 3/8 + 2/8 = 5/8.' },
  'rm-frac-24': { introduction: 'Převeď na společný jmenovatel.', question: 'Kolik je 7/10 - 2/5?', options: ['5/5', '3/10', '1/2', '5/10'], explanation: 'Přepsáním 2/5 na 4/10 platí 7/10 - 4/10 = 3/10.' },

  // ── Úroveň 4 — Násobení a dělení zlomků ──
  'rm-frac-25': { introduction: 'Vynásob čitatele mezi sebou a jmenovatele mezi sebou.', question: 'Kolik je 1/2 × 1/3?', options: ['1/6', '2/3', '1/5', '3/2'], explanation: 'Vynásob čitatele a jmenovatele: (1×1)/(2×3) = 1/6.' },
  'rm-frac-26': { introduction: 'Vynásob a pak zjednoduš.', question: 'Kolik je 3/4 × 2/3?', options: ['5/7', '6/7', '1/2', '5/12'], explanation: 'Vynásobením získáš 6/12, což se zjednoduší na 1/2.' },
  'rm-frac-27': { introduction: 'Vynásob a pak zjednoduš.', question: 'Kolik je 2/5 × 3/4?', options: ['5/9', '3/10', '6/9', '1/2'], explanation: 'Vynásobením získáš 6/20, což se zjednoduší na 3/10.' },
  'rm-frac-28': { introduction: 'Dělit znamená násobit převrácenou hodnotou.', question: 'Kolik je 1/2 ÷ 1/4?', options: ['1/8', '2', '1/2', '8'], explanation: 'Dělení znamená násobení převrácenou hodnotou: 1/2 × 4/1 = 4/2 = 2.' },
  'rm-frac-29': { introduction: 'Násob převrácenou hodnotou.', question: 'Kolik je 2/3 ÷ 1/6?', options: ['4', '1/9', '2/18', '1/4'], explanation: 'Násob převrácenou hodnotou: 2/3 × 6/1 = 12/3 = 4.' },
  'rm-frac-30': { introduction: 'Násob převrácenou hodnotou.', question: 'Kolik je 3/4 ÷ 1/2?', options: ['3/8', '3/2', '1/2', '2/3'], explanation: 'Násob převrácenou hodnotou: 3/4 × 2/1 = 6/4 = 3/2.' },
  'rm-frac-31': { introduction: 'Vynásob a pak zjednoduš.', question: 'Kolik je 5/6 × 3/10?', options: ['1/4', '8/16', '1/2', '15/16'], explanation: 'Vynásobením získáš 15/60, což se zjednoduší na 1/4.' },
  'rm-frac-32': { introduction: 'Násob převrácenou hodnotou.', question: 'Kolik je 4/9 ÷ 2/3?', options: ['8/27', '2/3', '6/9', '1/3'], explanation: 'Násob převrácenou hodnotou: 4/9 × 3/2 = 12/18 = 2/3.' },

  // ── Úroveň 5 — Smíšená čísla ──
  'rm-frac-33': { introduction: 'Vynásob celé číslo jmenovatelem a přičti čitatel.', question: 'Převeď 2 1/2 na nepravý zlomek.', options: ['5/2', '4/2', '3/2', '2/2'], explanation: 'Vynásob 2 dvěma a přičti 1, čímž získáš 5 lomeno 2, tedy 5/2.' },
  'rm-frac-34': { introduction: 'Vyděl čitatel jmenovatelem se zbytkem.', question: 'Převeď 7/2 na smíšené číslo.', options: ['2 1/2', '3 1/2', '3 1/3', '7 1/2'], explanation: '7 děleno 2 jsou 3 se zbytkem 1, což dává 3 1/2.' },
  'rm-frac-35': { introduction: 'Nejprve převeď smíšené číslo na nepravý zlomek.', question: 'Kolik je 1 1/4 + 1/4?', options: ['1 1/2', '2 1/2', '1', '2'], explanation: '1 1/4 je 5/4 a 5/4 + 1/4 = 6/4 = 1 1/2.' },
  'rm-frac-36': { introduction: 'Vynásob celé číslo jmenovatelem a přičti čitatel.', question: 'Převeď 3 2/3 na nepravý zlomek.', options: ['9/3', '11/3', '8/3', '5/3'], explanation: 'Vynásob 3 třemi a přičti 2, čímž získáš 11 lomeno 3, tedy 11/3.' },
  'rm-frac-37': { introduction: 'Sečti zvlášť celá čísla a zvlášť zlomky.', question: 'Kolik je 2 1/3 + 1 1/3?', options: ['3 1/3', '3 2/3', '4', '3 2/6'], explanation: 'Sečti celá čísla (3) a zlomky (2/3), čímž získáš 3 2/3.' },
  'rm-frac-38': { introduction: 'Převeď na nepravé zlomky a odečti.', question: 'Kolik je 3 1/2 - 1 1/4?', options: ['2 1/4', '2 1/2', '1 1/4', '2 3/4'], explanation: 'Pomocí nepravých zlomků: 14/4 - 5/4 = 9/4 = 2 1/4.' },
  'rm-frac-39': { introduction: 'Vyděl čitatel jmenovatelem se zbytkem.', question: 'Převeď 11/4 na smíšené číslo.', options: ['2 1/4', '3 3/4', '2 3/4', '2 2/4'], explanation: '11 děleno 4 jsou 2 se zbytkem 3, což dává 2 3/4.' },
  'rm-frac-40': { introduction: 'Nejprve převeď smíšené číslo na nepravý zlomek.', question: 'Kolik je 2 × 1 1/2?', options: ['2 1/2', '3', '2 1/4', '3 1/2'], explanation: '1 1/2 je 3/2 a 2 × 3/2 = 6/2 = 3.' },

  // ── Úroveň 6 — Základy desetinných čísel ──
  'rm-frac-41': { introduction: 'První číslice za desetinnou čárkou jsou desetiny.', question: 'Jaká je hodnota místa číslice 7 v čísle 0,7?', options: ['Desetiny', 'Setiny', 'Jednotky', 'Tisíciny'], explanation: 'První číslice za desetinnou čárkou je na místě desetin.' },
  'rm-frac-42': { introduction: 'Zaměř se na místo číslice za čárkou.', question: 'Jak přečteš 0,5 slovy?', options: ['Pět desetin', 'Pět setin', 'Pět', 'Padesát'], explanation: '0,5 má číslici 5 na místě desetin, takže je to pět desetin.' },
  'rm-frac-43': { introduction: 'Doplň nuly, aby měla čísla stejný počet míst.', question: 'Které desetinné číslo je větší, 0,3, nebo 0,25?', options: ['0,25', 'Jsou stejná', '0,3', 'Nelze určit'], explanation: '0,3 je totéž co 0,30, což je více než 0,25.' },
  'rm-frac-44': { introduction: 'Druhá číslice za čárkou jsou setiny.', question: 'Jaká je hodnota místa číslice 4 v čísle 0,04?', options: ['Desetiny', 'Setiny', 'Tisíciny', 'Jednotky'], explanation: 'Druhá číslice za desetinnou čárkou je na místě setin.' },
  'rm-frac-45': { introduction: 'Doplň nuly a porovnej.', question: 'Které číslo je nejmenší: 0,1, 0,01, nebo 0,11?', options: ['0,1', '0,11', '0,01', 'Všechna stejná'], explanation: '0,01 je jedna setina, což je méně než 0,1 i 0,11.' },
  'rm-frac-46': { introduction: 'Podívej se na číslici setin.', question: 'Zaokrouhli 0,47 na nejbližší desetinu.', options: ['0,4', '0,5', '0,47', '1,0'], explanation: 'Číslice setin je 7, takže desetiny zaokrouhli nahoru ze 4 na 5, čímž získáš 0,5.' },
  'rm-frac-47': { introduction: 'Tři desetiny se zapíší za desetinnou čárku.', question: 'Zapiš 3/10 jako desetinné číslo.', options: ['0,03', '0,3', '3,0', '0,13'], explanation: 'Tři desetiny se zapíší jako 0,3.' },
  'rm-frac-48': { introduction: 'Doplň nuly a seřaď od nejmenšího.', question: 'Seřaď 0,6, 0,06 a 0,66 od nejmenšího po největší.', options: ['0,66, 0,6, 0,06', '0,06, 0,6, 0,66', '0,6, 0,06, 0,66', '0,06, 0,66, 0,6'], explanation: '0,06 je nejmenší, pak 0,6 a nakonec 0,66.' },

  // ── Úroveň 7 — Operace s desetinnými čísly ──
  'rm-frac-49': { introduction: 'Sečti desetiny.', question: 'Kolik je 0,2 + 0,3?', options: ['0,5', '0,05', '0,6', '0,23'], explanation: 'Dvě desetiny plus tři desetiny jsou pět desetin, tedy 0,5.' },
  'rm-frac-50': { introduction: 'Odečti desetiny.', question: 'Kolik je 0,7 - 0,4?', options: ['0,11', '0,3', '0,03', '1,1'], explanation: 'Sedm desetin mínus čtyři desetiny jsou tři desetiny, tedy 0,3.' },
  'rm-frac-51': { introduction: 'Vynásob a hlídej počet desetinných míst.', question: 'Kolik je 0,5 × 0,2?', options: ['1,0', '0,7', '0,1', '0,25'], explanation: 'Vynásobením získáš 0,10, což je 0,1.' },
  'rm-frac-52': { introduction: 'Kolikrát se 0,2 vejde do 0,6?', question: 'Kolik je 0,6 ÷ 0,2?', options: ['0,3', '3', '0,12', '30'], explanation: 'Kolikrát se 0,2 vejde do 0,6? Přesně 3krát.' },
  'rm-frac-53': { introduction: 'Sečti obě desetinná čísla.', question: 'Kolik je 1,25 + 0,75?', options: ['1,100', '2', '1,9', '2,1'], explanation: 'Sečtením obou desetinných čísel získáš 2,00, což je 2.' },
  'rm-frac-54': { introduction: 'Čtyři čtvrtiny tvoří jeden celek.', question: 'Kolik je 0,25 × 4?', options: ['1', '0,1', '100', '0,29'], explanation: 'Čtyři čtvrtiny se rovnají jednomu celku, takže 0,25 × 4 = 1.' },
  'rm-frac-55': { introduction: 'Vyděl číslo třemi.', question: 'Kolik je 3,6 ÷ 3?', options: ['1,2', '0,12', '12', '1,02'], explanation: 'Vydělením 3,6 třemi získáš 1,2.' },
  'rm-frac-56': { introduction: 'Doplň nulu a odečti.', question: 'Kolik je 0,9 - 0,35?', options: ['0,65', '0,55', '0,45', '0,575'], explanation: 'Zapiš 0,9 jako 0,90, pak 0,90 - 0,35 = 0,55.' },

  // ── Úroveň 8 — Zlomky a desetinná čísla ──
  'rm-frac-57': { introduction: 'Vyděl čitatel jmenovatelem.', question: 'Zapiš 1/4 jako desetinné číslo.', options: ['0,14', '0,25', '0,4', '0,5'], explanation: 'Jedna čtvrtina se rovná 0,25.' },
  'rm-frac-58': { introduction: 'Zapiš jako zlomek se stem a zjednoduš.', question: 'Zapiš 0,75 jako zlomek v základním tvaru.', options: ['75/100', '7/5', '3/4', '3/5'], explanation: '0,75 je 75/100, což se zjednoduší na 3/4.' },
  'rm-frac-59': { introduction: 'Vyděl čitatel jmenovatelem.', question: 'Zapiš 3/5 jako desetinné číslo.', options: ['0,35', '0,6', '0,53', '0,3'], explanation: '3 děleno 5 se rovná 0,6.' },
  'rm-frac-60': { introduction: 'Zapiš jako zlomek s deseti a zjednoduš.', question: 'Zapiš 0,2 jako zlomek v základním tvaru.', options: ['2/10', '1/2', '1/5', '1/20'], explanation: '0,2 je 2/10, což se zjednoduší na 1/5.' },
  'rm-frac-61': { introduction: 'Vyděl čitatel jmenovatelem.', question: 'Zapiš 1/8 jako desetinné číslo.', options: ['0,18', '0,125', '0,8', '0,15'], explanation: '1 děleno 8 se rovná 0,125.' },
  'rm-frac-62': { introduction: 'Zapiš jako zlomek s deseti a zjednoduš.', question: 'Zapiš 0,5 jako zlomek v základním tvaru.', options: ['5/10', '1/2', '1/5', '2/5'], explanation: '0,5 je 5/10, což se zjednoduší na 1/2.' },
  'rm-frac-63': { introduction: 'Převeď zlomek na desetinné číslo a porovnej.', question: 'Které číslo je větší, 0,7, nebo 3/5?', options: ['3/5', 'Jsou stejná', '0,7', 'Nelze určit'], explanation: '3/5 se rovná 0,6, což je méně než 0,7.' },
  'rm-frac-64': { introduction: 'Sedm desetin se zapíše za desetinnou čárku.', question: 'Zapiš 7/10 jako desetinné číslo.', options: ['0,07', '0,7', '7,0', '0,17'], explanation: 'Sedm desetin se zapíše jako 0,7.' },

  // ── Úroveň 9 — Procenta ──
  'rm-frac-65': { introduction: 'Procenta znamenají počet ze sta.', question: 'Jak se zapíše 50 % jako zlomek v základním tvaru?', options: ['1/2', '1/5', '5/1', '1/50'], explanation: '50 % znamená 50 ze 100, což se zjednoduší na 1/2.' },
  'rm-frac-66': { introduction: '25 % je jedna čtvrtina.', question: 'Kolik je 25 % z 80?', options: ['25', '40', '20', '16'], explanation: '25 % je jedna čtvrtina a 80 ÷ 4 = 20.' },
  'rm-frac-67': { introduction: 'Vynásob stem.', question: 'Zapiš 0,3 jako procenta.', options: ['3 %', '30 %', '0,3 %', '300 %'], explanation: 'Vynásob stem: 0,3 × 100 = 30 %.' },
  'rm-frac-68': { introduction: '10 % je jedna desetina.', question: 'Kolik je 10 % z 250?', options: ['25', '2,5', '250', '10'], explanation: '10 % je jedna desetina a 250 ÷ 10 = 25.' },
  'rm-frac-69': { introduction: 'Převeď zlomek na desetinné číslo a pak na procenta.', question: 'Jak se zapíše 3/4 jako procenta?', options: ['34 %', '75 %', '43 %', '30 %'], explanation: '3/4 se rovná 0,75, což je 75 %.' },
  'rm-frac-70': { introduction: '20 % je jedna pětina.', question: 'Kolik je 20 % z 50?', options: ['20', '10', '30', '25'], explanation: '20 % je jedna pětina a 50 ÷ 5 = 10.' },
  'rm-frac-71': { introduction: 'Vypočítej procenta z celkové ceny.', question: 'Košile stojí $40 a je zlevněná o 25 %. Jaká je výše slevy?', options: ['$25', '$15', '$10', '$30'], explanation: '25 % z $40 je $10, takže sleva je $10.' },
  'rm-frac-72': { introduction: '100 % znamená celé množství.', question: 'Kolik je 100 % ze 45?', options: ['0', '45', '100', '90'], explanation: '100 % znamená celé množství, tedy 45.' },

  // ── Úroveň 10 — Poměry a úměry ──
  'rm-frac-73': { introduction: 'Vyděl obě části jejich společným dělitelem.', question: 'Zjednoduš poměr 4:8.', options: ['1:2', '2:1', '4:8', '1:4'], explanation: 'Vydělením obou částí čtyřmi získáš 1:2.' },
  'rm-frac-74': { introduction: 'Zjisti, čím byla vynásobena první část.', question: 'Jestliže 2:3 = 4:?, jaké je chybějící číslo?', options: ['5', '6', '8', '9'], explanation: 'Obě části se zdvojnásobí, takže z 3 se stane 6.' },
  'rm-frac-75': { introduction: 'Vyděl obě části jejich společným dělitelem.', question: 'Zjednoduš poměr 10:15.', options: ['5:3', '2:3', '3:2', '10:15'], explanation: 'Vydělením obou částí pěti získáš 2:3.' },
  'rm-frac-76': { introduction: 'Zjisti, kolikrát se množství zvětšilo.', question: 'Recept používá 2 hrnky mouky na 1 hrnek cukru. Kolik cukru je potřeba na 6 hrnků mouky?', options: ['2 hrnky', '3 hrnky', '6 hrnků', '4 hrnky'], explanation: 'Mouka se ztrojnásobila z 2 na 6, takže cukr se ztrojnásobí z 1 na 3 hrnky.' },
  'rm-frac-77': { introduction: 'Rozděl na díly a vypočítej větší podíl.', question: 'Rozděl $20 v poměru 1:3. Jaký je větší podíl?', options: ['$5', '$10', '$15', '$12'], explanation: 'Jsou to 4 díly po $5 a větší podíl je 3 × $5 = $15.' },
  'rm-frac-78': { introduction: 'Zjisti, čím byla vynásobena druhá část.', question: 'Jestliže 3:5 = ?:20, jaké je chybějící číslo?', options: ['12', '15', '8', '6'], explanation: '5 bylo vynásobeno čtyřmi, aby vzniklo 20, takže 3 × 4 = 12.' },
  'rm-frac-79': { introduction: 'Zjisti, kolik skupin tvoří první část poměru.', question: 'Poměr chlapců k dívkám je 3:2. Pokud je 15 chlapců, kolik je dívek?', options: ['10', '5', '12', '9'], explanation: '15 chlapců je 5 skupin po 3, takže je 5 skupin po 2 dívkách, což dává 10.' },
  'rm-frac-80': { introduction: 'Vyděl obě části jejich společným dělitelem.', question: 'Zjednoduš poměr 12:18.', options: ['3:2', '2:3', '6:9', '4:6'], explanation: 'Vydělením obou částí šesti získáš 2:3.' },
};
