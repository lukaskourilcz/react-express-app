import type { QuestionTranslation } from './quiz-data';

export const notationTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Pojmenování polí ──
  'rm-notat-1': { introduction: 'Nejdřív sloupec, potom řada.', question: 'Jak se pole pojmenovává v algebraické notaci?', options: ['Číslo řady, potom písmeno sloupce', 'Písmeno sloupce, potom číslo řady', 'Pouze písmeno sloupce', 'Pouze číslo řady'], explanation: 'Pole se pojmenovává písmenem sloupce (a–h) následovaným číslem řady (1–8), např. e4.' },
  'rm-notat-2': { introduction: 'Písmeno vs. číslo.', question: 'Na co odkazuje „e“ v názvu pole „e4“?', options: ['Na sloupec (columnu)', 'Na řadu (řádek)', 'Na figuru', 'Na hráče'], explanation: 'Písmeno je sloupec (columna); číslo je řada (řádek).' },
  'rm-notat-3': { introduction: 'Šachovnice je čtvercová.', question: 'Kolik sloupců (columnů) má šachovnice?', options: ['6', '7', '8', '16'], explanation: 'Sloupců je osm, značených a až h.' },
  'rm-notat-4': { introduction: 'Písmena zleva doprava.', question: 'Kterými písmeny se značí sloupce šachovnice?', options: ['a až h', 'a až g', 'p až w', '1 až 8'], explanation: 'Sloupce jdou a, b, c, d, e, f, g, h zleva doprava z pohledu bílého.' },
  'rm-notat-5': { introduction: 'Pohled ze strany bílého.', question: 'Které pole leží z pohledu bílého v levém dolním rohu?', options: ['h1', 'h8', 'a8', 'a1'], explanation: 'a1 je levé dolní pole ze strany bílého a je to tmavé pole.' },
  'rm-notat-6': { introduction: 'Řady se počítají.', question: 'Jak se značí řady (řádky) šachovnice?', options: ['Písmeny a–h', 'Čísly 1–8', 'Čísly 0–7', 'Římskými číslicemi'], explanation: 'Řady se číslují 1 až 8, přičemž řada 1 je nejblíže bílému.' },
  'rm-notat-7': { introduction: 'Vzpomeň si na h1.', question: 'Jakou barvu má pole a1?', options: ['Tmavou', 'Světlou', 'Záleží na soupravě', 'Ani jednu'], explanation: 'a1 je tmavé pole; známá pomůcka je, že h1 (vpravo dole pro bílého) je světlé.' },
  'rm-notat-8': { introduction: 'Pořadí zápisu.', question: 'Při čtení názvu pole, která část je první?', options: ['Číslo řady', 'Barva', 'Písmeno sloupce', 'Písmeno figury'], explanation: 'Písmeno sloupce je vždy první, pak číslo řady — sloupec, pak řada.' },

  // ── Úroveň 2 — Písmena figur ──
  'rm-notat-9': { introduction: 'King v angličtině.', question: 'Které písmeno zastupuje krále?', options: ['G', 'K', 'Kg', 'Ki'], explanation: 'K = král (king) v anglické algebraické notaci.' },
  'rm-notat-10': { introduction: 'Queen v angličtině.', question: 'Které písmeno zastupuje dámu?', options: ['Q', 'R', 'K', 'Qn'], explanation: 'Q = dáma (queen).' },
  'rm-notat-11': { introduction: 'K je obsazené.', question: 'Které písmeno zastupuje jezdce?', options: ['K', 'H', 'N', 'Kn'], explanation: 'Jezdec se píše N (knight), protože K už zabírá král.' },
  'rm-notat-12': { introduction: 'Rook v angličtině.', question: 'Které písmeno zastupuje věž?', options: ['C', 'Ro', 'Ck', 'R'], explanation: 'R = věž (rook).' },
  'rm-notat-13': { introduction: 'Bishop v angličtině.', question: 'Které písmeno zastupuje střelce?', options: ['B', 'Bi', 'S', 'P'], explanation: 'B = střelec (bishop).' },
  'rm-notat-14': { introduction: 'Kolize s králem.', question: 'Proč se jezdec píše „N“ a ne „K“?', options: ['Jezdci se pohybují do tvaru N', 'Protože K už zastupuje krále', 'Pochází to z francouzštiny', 'Bylo to zvoleno náhodně'], explanation: 'K je vyhrazeno pro krále, takže jezdec používá N.' },
  'rm-notat-15': { introduction: 'Jedna figura je bez písmene.', question: 'Která figura NEMÁ v algebraické notaci vlastní písmeno?', options: ['Pěšec', 'Král', 'Dáma', 'Střelec'], explanation: 'Pěšci nemají písmeno figury; tah pěšce se píše jen jako cílové pole.' },
  'rm-notat-16': { introduction: 'Bez písmene, jen cíl.', question: 'Pěšec táhnoucí na e4 se zapíše jako:', options: ['Pe4', 'P-e4', 'e4', 'pawn-e4'], explanation: 'Protože pěšci nemají písmeno, tah je prostě cílové pole, e4.' },

  // ── Úroveň 3 — Zápis tahu ──
  'rm-notat-17': { introduction: 'Písmeno figury + cíl.', question: 'Jezdec táhnoucí na f3 se zapíše jako:', options: ['Kf3', 'KNf3', 'Nf3', 'nf3'], explanation: 'Písmeno figury + cíl: jezdec na f3 je Nf3.' },
  'rm-notat-18': { introduction: 'Písmeno figury + cíl.', question: 'Střelec táhnoucí na e5 se zapíše jako:', options: ['Be5', 'Bie5', 'e5B', 'eB5'], explanation: 'Písmeno figury, pak pole dává Be5.' },
  'rm-notat-19': { introduction: 'Co obsahuje běžný tah.', question: 'Běžný (neberoucí) tah figurou se skládá z:', options: ['Pouze cílového pole', 'Pouze výchozího pole', 'Písmene figury + cílového pole', 'Písmene figury + výchozího pole'], explanation: 'Tah figurou pojmenuje figuru a pole, kam dojde, např. Nf3 nebo Be5.' },
  'rm-notat-20': { introduction: 'Q + pole.', question: 'Dáma táhnoucí na d2 se zapíše jako:', options: ['Q2d', 'Qd2', 'Kd2', 'Dd2'], explanation: 'Q pro dámu plus pole d2 dává Qd2.' },
  'rm-notat-21': { introduction: 'Pěšec = jen cíl.', question: 'Bílý postrčí pěšce na d4. Jak se to zapíše?', options: ['Pd4', 'P-d4', 'Dd4', 'd4'], explanation: 'Tah pěšce je jen cílové pole: d4.' },
  'rm-notat-22': { introduction: 'R + pole.', question: 'Věž táhnoucí na e1 se zapíše jako:', options: ['1Re', 'Ke1', 'Re1', 're1'], explanation: 'R plus pole e1 dává Re1.' },
  'rm-notat-23': { introduction: 'Ne rošáda, běžný tah krále.', question: 'Král táhnoucí na g1 (ne rošáda) se zapíše jako:', options: ['Gg1', 'Kig1', 'g1K', 'Kg1'], explanation: 'K plus pole g1 dává Kg1.' },
  'rm-notat-24': { introduction: 'Kdo a kam.', question: 'Co zaznamenává základní (neberoucí) tah?', options: ['Pouze barvu', 'Která figura táhla a kam došla', 'Pouze která figura táhla', 'Jak dlouho tah trval'], explanation: 'Zaznamenává táhnoucí figuru (písmeno, nebo nic u pěšce) a její cílové pole.' },

  // ── Úroveň 4 — Braní v notaci ──
  'rm-notat-25': { introduction: 'Symbol pro braní.', question: 'Který symbol značí braní?', options: ['-', '/', '!', 'x'], explanation: 'Písmeno x označuje braní, např. Nxe5.' },
  'rm-notat-26': { introduction: 'Figura, x, pole.', question: 'Jezdec beroucí na e5 se zapíše jako:', options: ['Nxe5', 'Nex5', 'xNe5', 'Ne5'], explanation: 'Písmeno figury, x, pak pole: Nxe5.' },
  'rm-notat-27': { introduction: 'U pěšce nejdřív jeho sloupec.', question: 'Pěšec na sloupci e bere na d5. Zapíše se jako:', options: ['xd5', 'exd5', 'ed5', 'Pxd5'], explanation: 'Braní pěšcem uvádí nejprve výchozí sloupec pěšce: exd5.' },
  'rm-notat-28': { introduction: 'Co znamená úvodní písmeno.', question: 'Co ti v „exd5“ říká úvodní „e“?', options: ['Že jde o šach', 'Že táhla dáma', 'Že beroucí pěšec přišel ze sloupce e', 'Číslo řady'], explanation: 'U braní pěšcem nahrazuje výchozí sloupec písmeno figury, takže „e“ značí pěšce ze sloupce e.' },
  'rm-notat-29': { introduction: 'Figura, x, cíl.', question: 'Střelec beroucí na f7 se zapíše jako:', options: ['Bf7x', 'xBf7', 'B:f7', 'Bxf7'], explanation: 'Figura, x, cíl dává Bxf7.' },
  'rm-notat-30': { introduction: 'Pěšec nemá písmeno.', question: 'Jak se v notaci liší braní pěšcem od braní figurou?', options: ['Braní pěšcem začíná písmenem sloupce beroucího pěšce', 'Pěšci nemohou brát', 'Braní pěšcem používá písmeno P', 'Není žádný rozdíl'], explanation: 'Pěšec nemá písmeno, takže jeho braní začíná výchozím sloupcem, např. exd5.' },
  'rm-notat-31': { introduction: 'R, x, pole.', question: 'Věž beroucí na a8 se zapíše jako:', options: ['Rax8', 'Rxa8', 'xRa8', 'Ra8'], explanation: 'R, x, pak a8 dává Rxa8.' },
  'rm-notat-32': { introduction: 'Starší zápis braní.', question: 'Kromě „x“, který symbol se někdy ve starší notaci používá pro braní?', options: ['+', '=', 'dvojtečka „:“', '#'], explanation: 'Dvojtečka (např. Ne5: nebo e:d5) se historicky používala k označení braní.' },

  // ── Úroveň 5 — Rošáda a speciální notace ──
  'rm-notat-33': { introduction: 'Malá rošáda.', question: 'Které z těchto je malá rošáda (na královské straně)?', options: ['0-0-0', 'K-O', 'O-O', 'castle-K'], explanation: 'Malá rošáda se zapisuje O-O (dvě O).' },
  'rm-notat-34': { introduction: 'Velká rošáda.', question: 'Které z těchto je velká rošáda (na dámské straně)?', options: ['O-O', 'C-Q', '0-0', 'O-O-O'], explanation: 'Velká rošáda se zapisuje O-O-O (tři O).' },
  'rm-notat-35': { introduction: 'Proměna používá „=“.', question: 'Pěšec proměňující se v dámu na e8 se zapíše jako:', options: ['e8Q', 'e8=Q', 'Qe8', 'e8(Q)'], explanation: 'Proměna používá „=“: e8=Q znamená, že pěšec dojde na e8 a stane se dámou.' },
  'rm-notat-36': { introduction: 'Význam „=“.', question: 'Co znamená „=“ v „e8=Q“?', options: ['Pěšec se promění (zde v dámu)', 'Šach', 'Braní', 'Rošáda'], explanation: 'Znak „=“ značí proměnu a písmeno za ním je nová figura.' },
  'rm-notat-37': { introduction: 'Braní mimochodem.', question: 'Braní mimochodem (en passant) se někdy značí:', options: ['ep.', 'pp', 'e.p.', 'x.p.'], explanation: 'Zkratka „e.p.“ se někdy připojuje k braní mimochodem.' },
  'rm-notat-38': { introduction: 'Z jakého znaku.', question: 'Z kterého znaku se skládá notace rošády?', options: ['Z písmene C', 'Z písmene K', 'Z lomítka', 'Z písmene O (nebo číslice 0)'], explanation: 'Rošáda používá písmeno O — O-O a O-O-O — i když se někdy objeví číslice 0.' },
  'rm-notat-39': { introduction: 'Král jde dál.', question: 'Malá rošáda používá dvě O; kolik jich používá velká rošáda?', options: ['Tři', 'Jedno', 'Dvě', 'Čtyři'], explanation: 'Velká rošáda je O-O-O — tři O — protože král cestuje dál.' },
  'rm-notat-40': { introduction: 'Pole, =, figura.', question: 'Pěšec proměňující se v jezdce na b1 se zapíše jako:', options: ['b1=K', 'b1=N', 'Nb1', 'b1N'], explanation: 'Pole, pak „=“, pak písmeno nové figury: b1=N.' },

  // ── Úroveň 6 — Symboly šachu a matu ──
  'rm-notat-41': { introduction: 'Symbol pro šach.', question: 'Který symbol znamená šach?', options: ['#', '+', '!', '='], explanation: 'Znak „+“ za tahem znamená, že dává šach.' },
  'rm-notat-42': { introduction: 'Symbol pro mat.', question: 'Který symbol znamená mat?', options: ['+', '!', 'x', '#'], explanation: 'Mat se zapisuje „#“ (nebo někdy „++“).' },
  'rm-notat-43': { introduction: 'Rozeber „Qh5+“.', question: 'Co znamená „Qh5+“?', options: ['Dáma táhne na h5 a dává šach', 'Mat', 'Braní na h5', 'Hrubka'], explanation: 'Znak „+“ ukazuje, že tah dámou na h5 dává šach.' },
  'rm-notat-44': { introduction: 'Rozeber „Rd8#“.', question: 'Co znamená „Rd8#“?', options: ['Pouze šach', 'Remíza', 'Mat daný na d8', 'Rošáda'], explanation: 'Znak „#“ značí mat — věž na d8 ukončí hru.' },
  'rm-notat-45': { introduction: 'Alternativa k „#“.', question: 'Kromě „#“ se mat někdy zapisuje jako:', options: ['**', '++', '--', '//'], explanation: '„++“ je alternativní symbol pro mat.' },
  'rm-notat-46': { introduction: 'Kam symbol patří.', question: 'Mění symbol šachu část tahu s figurou/cílem?', options: ['Ano, nahrazuje cíl', 'Ano, mění sloupec', 'Jen u pěšců', 'Ne, prostě se připojí za tah'], explanation: 'Znak „+“ (nebo „#“) se přidá na konec; samotný tah se zapisuje jako obvykle.' },
  'rm-notat-47': { introduction: 'Rozeber „e8=Q+“.', question: 'Co znamená „e8=Q+“?', options: ['Pěšec se promění v dámu a dá šach', 'Obyčejný tah dámou', 'Braní mimochodem', 'Mat'], explanation: 'Pěšec dojde na e8, promění se v dámu (=Q) a nová dáma dává šach (+).' },
  'rm-notat-48': { introduction: 'Umístění „+“.', question: 'Kam v rámci tahu patří „+“?', options: ['Úplně na začátek', 'Mezi figuru a pole', 'Na konec tahu', 'Nahrazuje „x“'], explanation: 'Symboly šachu a matu jsou poslední, za figurou, braním a cílem.' },

  // ── Úroveň 7 — Rozlišení ──
  'rm-notat-49': { introduction: 'Když můžou dvě stejné figury.', question: 'Když dvě stejné figury mohou dojít na stejné pole, notace přidává:', options: ['nic', 'barvu', 'výchozí sloupec nebo řadu', 'znak plus'], explanation: 'Přidáš výchozí sloupec nebo řadu (nebo celé pole), aby bylo jasné, která figura táhla.' },
  'rm-notat-50': { introduction: 'Rozeber „Rad1“.', question: 'Co znamená „Rad1“?', options: ['Věž ze sloupce a táhne na d1', 'Věž táhne na pole zvané a-d1', 'Kterákoli věž táhne na d1', 'Věž bere na d1'], explanation: 'Přidané „a“ rozlišuje: je to věž ze sloupce a, která jde na d1.' },
  'rm-notat-51': { introduction: 'Rozlišení řadou.', question: 'V „R1d1“ rozlišuje „1“ podle:', options: ['sloupce', 'řady (věž na 1. řadě)', 'barvy', 'hodin'], explanation: 'Když je sloupec nerozliší, použije se řada: R1d1 je věž na řadě 1.' },
  'rm-notat-52': { introduction: 'Když ani jedno nestačí.', question: 'Pokud nestačí ani sloupec, ani řada samotná, zapíšeš:', options: ['jen písmeno figury', 'dvě písmena figury', 'pomlčku', 'celé výchozí pole, např. Qh4e1'], explanation: 'Když je to potřeba, uvede se úplné výchozí pole, např. Qh4e1.' },
  'rm-notat-53': { introduction: 'Jezdec z c3.', question: 'Jezdci stojí na c3 a g3; oba mohou dojít na e4. Jezdec z c3 táhnoucí tam je:', options: ['Nce4', 'Nge4', 'Ne4', 'N3e4'], explanation: 'Přidání výchozího sloupce „c“ dává Nce4 pro jezdce z c3.' },
  'rm-notat-54': { introduction: 'Proč rozlišovat.', question: 'Proč je rozlišení potřeba?', options: ['Aby to vypadalo úhledně', 'Aby byl tah jednoznačný, když dvě stejné figury mohou dojít na pole', 'K označení šachu', 'K vyjádření rošády'], explanation: 'Zajišťuje, že čtenář ví přesně, která ze dvou stejných figur táhla.' },
  'rm-notat-55': { introduction: 'Pořadí rozlišení.', question: 'Jaké je preferované pořadí pro rozlišení?', options: ['Nejdřív řada, pak sloupec', 'Nejdřív barva', 'Vždy celé pole', 'Nejdřív sloupec, pak řada jen pokud sloupec nestačí'], explanation: 'Použiješ nejdřív sloupec; pokud to stále nerozliší, použiješ řadu; pak celé pole.' },
  'rm-notat-56': { introduction: 'Rozeber „Qh4e1“.', question: 'Co „Qh4e1“ určuje?', options: ['Pouze sloupec', 'Pouze řadu', 'Celé výchozí pole h4', 'Nic navíc'], explanation: 'Uvedeny jsou sloupec i řada, pojmenovávající přesné výchozí pole h4.' },

  // ── Úroveň 8 — Čtení zápisu partie ──
  'rm-notat-57': { introduction: 'Číslované dvojice tahů.', question: 'Zápis partie se píše jako:', options: ['jediné číslo', 'číslované dvojice tahů, tah bílého pak tah černého', 'jen tahy bílého', 'tahy v náhodném pořadí'], explanation: 'Zápisy používají číslované dvojice: „1. e4 e5 2. Nf3 Nc6“, bílý pak černý.' },
  'rm-notat-58': { introduction: 'Druhý tah je černého.', question: 'Který je v „1. e4 e5“ tah černého?', options: ['1', 'Nf3', 'e4', 'e5'], explanation: 'V rámci dvojice je druhý tah tahem černého: zde e5.' },
  'rm-notat-59': { introduction: 'První tah je bílého.', question: 'Čí tah je v „2. Nf3 Nc6“ tah „Nf3“?', options: ['Bílého', 'Černého', 'Obou', 'Ničí'], explanation: 'První tah každé číslované dvojice je tahem bílého.' },
  'rm-notat-60': { introduction: 'Výsledek 1-0.', question: 'Výsledek „1-0“ znamená:', options: ['Vyhrává černý', 'Remíza', 'Vyhrává bílý', 'Hra pokračuje'], explanation: '1-0 zaznamenává výhru bílého.' },
  'rm-notat-61': { introduction: 'Výsledek 0-1.', question: 'Výsledek „0-1“ znamená:', options: ['Vyhrává bílý', 'Vyhrává černý', 'Remíza', 'Pat'], explanation: '0-1 zaznamenává výhru černého.' },
  'rm-notat-62': { introduction: 'Půl bodu každému.', question: 'Remízovaná hra se zaznamenává jako:', options: ['1-0', '0-1', '½-½', '1-1'], explanation: 'Remíza se zapisuje ½-½ (půl bodu každému).' },
  'rm-notat-63': { introduction: 'Dvojice = dva tahy.', question: 'Kolik tahů je zobrazeno v „3. Bb5 a6“?', options: ['Jeden', 'Tři', 'Čtyři', 'Dva — Bb5 bílého a a6 černého'], explanation: 'Dvojice obsahuje tah bílého (Bb5) a odpověď černého (a6).' },
  'rm-notat-64': { introduction: 'Číslo před tečkou.', question: 'Co znamená v „4. O-O“ číslo před tečkou?', options: ['Číslo tahu', 'Řadu', 'Figuru', 'Skóre'], explanation: 'Číslo je číslo tahu; tečka ho odděluje od tahů.' },

  // ── Úroveň 9 — FEN a notace pozice ──
  'rm-notat-65': { introduction: 'Jeden okamžik, ne partie.', question: 'Co popisuje řetězec FEN?', options: ['Jeden tah', 'Celou partii', 'Kompletní pozici na šachovnici v jednom okamžiku', 'Název zahájení'], explanation: 'FEN (Forsythova–Edwardsova notace) zaznamenává jednu přesnou pozici, ne sled tahů.' },
  'rm-notat-66': { introduction: 'Velká písmena.', question: 'Ve FEN velká písmena představují:', options: ['Bílé figury', 'Černé figury', 'Prázdná pole', 'Řady'], explanation: 'Velká písmena jsou figury bílého (např. R, N, B, Q, K, P).' },
  'rm-notat-67': { introduction: 'Malá písmena.', question: 'Ve FEN malá písmena představují:', options: ['Bílé figury', 'Právo na rošádu', 'Počítadlo poloviny tahů', 'Černé figury'], explanation: 'Malá písmena jsou figury černého (např. r, n, b, q, k, p).' },
  'rm-notat-68': { introduction: 'Číslice = prázdná pole.', question: 'Ve FEN číslice jako „8“ uvnitř řady znamená:', options: ['Osm figur v řadě', 'Osm prázdných polí v řadě', 'Řadu číslo 8', 'Osm odehraných tahů'], explanation: 'Číslice počítají po sobě jdoucí prázdná pole, takže „8“ je zcela prázdná řada.' },
  'rm-notat-69': { introduction: 'w nebo b.', question: 'Pole FEN, které je „w“ nebo „b“, značí:', options: ['Kdo vyhrál', 'Šířku šachovnice', 'Kdo je na tahu', 'Pozici střelce'], explanation: 'To pole je strana na tahu: w = na tahu bílý, b = na tahu černý.' },
  'rm-notat-70': { introduction: 'Práva na rošádu.', question: 'Co zaznamenává „KQkq“ v řetězci FEN?', options: ['Pozice králů', 'Sebrané figury', 'Varování před šachem', 'Stále dostupná práva na rošádu'], explanation: 'KQkq vyjmenovává práva na rošádu: velká písmena pro bílého, malá pro černého, K malá rošáda a Q velká rošáda.' },
  'rm-notat-71': { introduction: 'Výchozí pozice.', question: 'FEN standardní výchozí pozice začíná:', options: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '8/8/8/8/8/8/8/8 w - - 0 1', 'pppppppp/rnbqkbnr/8/8/8/8/RNBQKBNR/PPPPPPPP w', 'RNBQKBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbqkbnr b'], explanation: 'Výchozí pozice je rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1.' },
  'rm-notat-72': { introduction: 'Oddělovač řad.', question: 'V části FEN s rozmístěním figur jsou řady odděleny:', options: ['Mezerami', 'Čárkami', 'Znakem „/“', 'Pomlčkami'], explanation: 'Lomítko „/“ odděluje každou z osmi řad.' },

  // ── Úroveň 10 — Mistrovství notace ──
  'rm-notat-73': { introduction: 'Rozeber „O-O-O+“.', question: 'Co znamená „O-O-O+“?', options: ['Malá rošáda', 'Mat', 'Hrubka', 'Velká rošáda, která dává šach'], explanation: 'O-O-O je velká rošáda a znak „+“ ukazuje, že dává šach.' },
  'rm-notat-74': { introduction: 'Rozeber „exd8=Q#“.', question: 'Co znamená „exd8=Q#“?', options: ['Pěšec ze sloupce e bere na d8, promění se v dámu a je to mat', 'Tichý postup pěšce na d8', 'Velká rošáda', 'Braní mimochodem bez proměny'], explanation: 'exd8 je braní pěšcem na d8, =Q ho promění v dámu a # značí mat.' },
  'rm-notat-75': { introduction: 'Dvě vykřičníky.', question: 'Značka „!!“ znamená:', options: ['Hrubku', 'Chybu', 'Skvělý tah', 'Rutinní tah'], explanation: '„!!“ značí skvělý tah; „!“ je dobrý tah.' },
  'rm-notat-76': { introduction: 'Dva otazníky.', question: 'Značka „??“ znamená:', options: ['Dobrý tah', 'Hrubku', 'Skvělý tah', 'Šach'], explanation: '„??“ značí hrubku; „?“ je menší chyba.' },
  'rm-notat-77': { introduction: 'Poslední pole FEN.', question: 'V zakončení FEN „... w KQkq - 0 1“, co je poslední „1“?', options: ['Počítadlo poloviny tahů', 'Pole braní mimochodem', 'Číslo celého tahu', 'Práva na rošádu'], explanation: 'Poslední pole je číslo celého tahu; „0“ před ním je počítadlo poloviny tahů.' },
  'rm-notat-78': { introduction: 'Rozeber „Nbd7“.', question: 'Co ti říká „Nbd7“?', options: ['Jezdec ze sloupce b táhne na d7', 'Jezdec táhne na pole zvané b-d7', 'Dva jezdci táhnou naráz', 'Jezdec bere na d7'], explanation: '„b“ rozlišuje: jezdec ze sloupce b táhne na d7.' },
  'rm-notat-79': { introduction: 'Tři tečky.', question: 'Co značí „1... c5“ (se třemi tečkami)?', options: ['První tah bílého', 'Tah číslo 111', 'Braní', 'První tah černého, uvedený samostatně'], explanation: 'Tři tečky ukazují tah černého zapsaný bez předchozího tahu bílého.' },
  'rm-notat-80': { introduction: 'Rozeber „Rxe8+“.', question: 'Které prvky spojuje „Rxe8+“?', options: ['Pouze braní', 'Věž bere na e8 se šachem — figura, braní, cíl a šach', 'Rošádu a šach', 'Proměnu'], explanation: 'R je věž, x je braní, e8 je cíl a + ukazuje, že dává šach.' },
};
