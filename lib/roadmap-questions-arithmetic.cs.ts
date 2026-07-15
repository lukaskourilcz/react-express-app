import type { QuestionTranslation } from './quiz-data';

export const arithmeticTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Číselné řády a počítání ──
  'rm-arith-1': { introduction: 'Zjisti, na kterém místě číslice stojí.', question: 'Jakou hodnotu má číslice 7 v čísle 372?', options: ['7', '70', '700', '7000'], explanation: 'Číslice 7 stojí na místě desítek, takže její hodnota je 7 × 10 = 70.' },
  'rm-arith-2': { introduction: 'Přičti k číslu jedničku.', question: 'Které číslo následuje hned po 49?', options: ['40', '48', '50', '59'], explanation: 'Když od 49 postoupíme o jedna nahoru, dostaneme 50.' },
  'rm-arith-3': { introduction: 'Kolik desítek se do čísla vejde?', question: 'Kolik desítek je v čísle 60?', options: ['6', '16', '60', '600'], explanation: '60 se skládá ze 6 skupin po deseti, protože 6 × 10 = 60.' },
  'rm-arith-4': { introduction: 'Urči místo číslice v čísle.', question: 'Jaká je hodnota číslice 4 v čísle 5 842?', options: ['4', '40', '400', '4000'], explanation: 'Číslice 4 stojí na místě desítek, takže její hodnota je 40.' },
  'rm-arith-5': { introduction: 'Porovnej čísla podle řádů.', question: 'Které číslo je největší?', options: ['312', '321', '132', '231'], explanation: '321 má největší kombinaci stovek a desítek, a je tedy největší.' },
  'rm-arith-6': { introduction: 'Slož číslo z jednotlivých řádů.', question: 'Které číslo se skládá ze 3 stovek, 0 desítek a 5 jednotek?', options: ['305', '350', '35', '3005'], explanation: '3 stovky (300) plus 0 desítek plus 5 jednotek se rovná 305.' },
  'rm-arith-7': { introduction: 'Počítej po desítkách.', question: 'Počítej po desítkách: 10, 20, 30, __, 50. Které číslo chybí?', options: ['35', '40', '45', '60'], explanation: 'Když k 30 přičteme deset, dostaneme 40, což zapadá mezi 30 a 50.' },
  'rm-arith-8': { introduction: 'Najdi číslici na místě tisíců.', question: 'Která číslice stojí v čísle 8 214 na místě tisíců?', options: ['8', '2', '1', '4'], explanation: 'Číslice 8 nejvíce vlevo stojí na místě tisíců.' },

  // ── Úroveň 2 — Sčítání ──
  'rm-arith-9': { introduction: 'Sečti obě čísla.', question: '7 + 6 = ?', options: ['12', '13', '14', '15'], explanation: '7 plus 6 se rovná 13.' },
  'rm-arith-10': { introduction: 'Sečti obě čísla.', question: '8 + 5 = ?', options: ['11', '12', '13', '14'], explanation: '8 plus 5 se rovná 13.' },
  'rm-arith-11': { introduction: 'Sečti dvojciferná čísla.', question: '24 + 18 = ?', options: ['32', '42', '43', '52'], explanation: '24 plus 18 se rovná 42.' },
  'rm-arith-12': { introduction: 'Nezapomeň na přenos.', question: '45 + 37 = ?', options: ['72', '81', '82', '92'], explanation: '45 plus 37 se rovná 82.' },
  'rm-arith-13': { introduction: 'Sečti trojciferné a dvojciferné číslo.', question: '156 + 27 = ?', options: ['173', '183', '193', '283'], explanation: '156 plus 27 se rovná 183.' },
  'rm-arith-14': { introduction: 'Sčítej postupně.', question: '9 + 8 + 7 = ?', options: ['22', '23', '24', '25'], explanation: '9 + 8 = 17 a 17 + 7 = 24.' },
  'rm-arith-15': { introduction: 'Sečti trojciferná čísla.', question: '238 + 145 = ?', options: ['383', '373', '393', '483'], explanation: '238 plus 145 se rovná 383.' },
  'rm-arith-16': { introduction: 'Nezapomeň na přenos.', question: '67 + 89 = ?', options: ['146', '156', '157', '166'], explanation: '67 plus 89 se rovná 156.' },

  // ── Úroveň 3 — Odčítání ──
  'rm-arith-17': { introduction: 'Odečti menší číslo od většího.', question: '15 - 7 = ?', options: ['6', '7', '8', '9'], explanation: '15 minus 7 se rovná 8.' },
  'rm-arith-18': { introduction: 'Odečti obě čísla.', question: '20 - 8 = ?', options: ['11', '12', '13', '14'], explanation: '20 minus 8 se rovná 12.' },
  'rm-arith-19': { introduction: 'Nezapomeň na výpůjčku.', question: '52 - 27 = ?', options: ['25', '35', '29', '24'], explanation: '52 minus 27 se rovná 25.' },
  'rm-arith-20': { introduction: 'Nezapomeň na výpůjčku.', question: '83 - 46 = ?', options: ['37', '36', '47', '43'], explanation: '83 minus 46 se rovná 37.' },
  'rm-arith-21': { introduction: 'Odečti od kulatého čísla.', question: '200 - 75 = ?', options: ['115', '125', '135', '225'], explanation: '200 minus 75 se rovná 125.' },
  'rm-arith-22': { introduction: 'Nezapomeň na výpůjčku.', question: '145 - 68 = ?', options: ['77', '87', '83', '67'], explanation: '145 minus 68 se rovná 77.' },
  'rm-arith-23': { introduction: 'Odečti od kulatého čísla.', question: '500 - 234 = ?', options: ['256', '266', '276', '366'], explanation: '500 minus 234 se rovná 266.' },
  'rm-arith-24': { introduction: 'Odečti od tisíce.', question: '1000 - 456 = ?', options: ['544', '554', '644', '546'], explanation: '1000 minus 456 se rovná 544.' },

  // ── Úroveň 4 — Násobení ──
  'rm-arith-25': { introduction: 'Použij malou násobilku.', question: '6 × 7 = ?', options: ['36', '42', '48', '49'], explanation: '6 krát 7 se rovná 42.' },
  'rm-arith-26': { introduction: 'Použij malou násobilku.', question: '8 × 9 = ?', options: ['63', '72', '81', '64'], explanation: '8 krát 9 se rovná 72.' },
  'rm-arith-27': { introduction: 'Násob po pěti.', question: '12 × 5 = ?', options: ['50', '55', '60', '65'], explanation: '12 krát 5 se rovná 60.' },
  'rm-arith-28': { introduction: 'Použij malou násobilku.', question: '7 × 8 = ?', options: ['54', '56', '64', '48'], explanation: '7 krát 8 se rovná 56.' },
  'rm-arith-29': { introduction: 'Násob po čtyřech.', question: '25 × 4 = ?', options: ['90', '100', '110', '125'], explanation: '25 krát 4 se rovná 100.' },
  'rm-arith-30': { introduction: 'Rozlož si násobení na části.', question: '13 × 6 = ?', options: ['76', '78', '84', '72'], explanation: '13 krát 6 se rovná 78.' },
  'rm-arith-31': { introduction: 'Rozlož si násobení na části.', question: '15 × 12 = ?', options: ['150', '170', '180', '190'], explanation: '15 krát 12 se rovná 180.' },
  'rm-arith-32': { introduction: 'Rozlož si násobení na části.', question: '24 × 9 = ?', options: ['196', '206', '216', '226'], explanation: '24 krát 9 se rovná 216.' },

  // ── Úroveň 5 — Dělení ──
  'rm-arith-33': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '56 ÷ 8 = ?', options: ['6', '7', '8', '9'], explanation: '56 děleno 8 se rovná 7, protože 8 × 7 = 56.' },
  'rm-arith-34': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '72 ÷ 9 = ?', options: ['6', '7', '8', '9'], explanation: '72 děleno 9 se rovná 8, protože 9 × 8 = 72.' },
  'rm-arith-35': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '81 ÷ 9 = ?', options: ['6', '7', '8', '9'], explanation: '81 děleno 9 se rovná 9, protože 9 × 9 = 81.' },
  'rm-arith-36': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '144 ÷ 12 = ?', options: ['11', '12', '13', '14'], explanation: '144 děleno 12 se rovná 12, protože 12 × 12 = 144.' },
  'rm-arith-37': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '96 ÷ 4 = ?', options: ['22', '24', '26', '28'], explanation: '96 děleno 4 se rovná 24, protože 4 × 24 = 96.' },
  'rm-arith-38': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '63 ÷ 7 = ?', options: ['6', '7', '8', '9'], explanation: '63 děleno 7 se rovná 9, protože 7 × 9 = 63.' },
  'rm-arith-39': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '128 ÷ 8 = ?', options: ['14', '16', '18', '12'], explanation: '128 děleno 8 se rovná 16, protože 8 × 16 = 128.' },
  'rm-arith-40': { introduction: 'Ptej se, kolikrát se dělitel vejde.', question: '91 ÷ 7 = ?', options: ['11', '12', '13', '14'], explanation: '91 děleno 7 se rovná 13, protože 7 × 13 = 91.' },

  // ── Úroveň 6 — Pořadí operací ──
  'rm-arith-41': { introduction: 'Násobení má přednost před sčítáním.', question: '2 + 3 × 4 = ?', options: ['20', '14', '24', '11'], explanation: 'Nejdřív násob: 3 × 4 = 12, potom 2 + 12 = 14.' },
  'rm-arith-42': { introduction: 'Nejdřív spočítej závorku.', question: '(5 + 3) × 2 = ?', options: ['16', '13', '11', '10'], explanation: 'Nejdřív spočítej závorku: 5 + 3 = 8, potom 8 × 2 = 16.' },
  'rm-arith-43': { introduction: 'Dělení má přednost před odčítáním.', question: '10 - 6 ÷ 2 = ?', options: ['2', '7', '8', '4'], explanation: 'Nejdřív děl: 6 ÷ 2 = 3, potom 10 - 3 = 7.' },
  'rm-arith-44': { introduction: 'Nejdřív obě násobení, pak sečti.', question: '4 × 3 + 5 × 2 = ?', options: ['22', '34', '26', '20'], explanation: 'Nejdřív násob: 12 a 10, potom je sečti a dostaneš 22.' },
  'rm-arith-45': { introduction: 'Nejdřív vyhodnoť mocninu.', question: '2^3 + 1 = ?', options: ['7', '9', '8', '6'], explanation: 'Nejdřív vyhodnoť mocninu: 2^3 = 8, potom 8 + 1 = 9.' },
  'rm-arith-46': { introduction: 'Nejdřív spočítej závorku.', question: '12 ÷ (2 + 4) = ?', options: ['2', '4', '6', '8'], explanation: 'Nejdřív závorka: 2 + 4 = 6, potom 12 ÷ 6 = 2.' },
  'rm-arith-47': { introduction: 'Nejdřív mocnina, pak násobení, pak odčítání.', question: '20 - 2 × 3^2 = ?', options: ['2', '162', '18', '6'], explanation: 'Nejdřív mocnina (3^2 = 9), potom 2 × 9 = 18 a nakonec 20 - 18 = 2.' },
  'rm-arith-48': { introduction: 'Nejdřív spočítej obě závorky.', question: '(6 + 2) × (5 - 3) = ?', options: ['14', '16', '20', '10'], explanation: 'Nejdřív každou závorku: 8 a 2, potom 8 × 2 = 16.' },

  // ── Úroveň 7 — Dělitelé a násobky ──
  'rm-arith-49': { introduction: 'Dělitel dělí číslo beze zbytku.', question: 'Které číslo je dělitelem čísla 12?', options: ['5', '7', '4', '8'], explanation: '4 dělí 12 beze zbytku (12 ÷ 4 = 3), takže je jeho dělitelem.' },
  'rm-arith-50': { introduction: 'Hledej největší společný dělitel.', question: 'Jaký je největší společný dělitel čísel 8 a 12?', options: ['2', '4', '6', '8'], explanation: 'Největší číslo, které dělí 8 i 12, je 4.' },
  'rm-arith-51': { introduction: 'Násobek dostaneš vynásobením daného čísla.', question: 'Které číslo je násobkem čísla 7?', options: ['21', '25', '30', '15'], explanation: '21 = 7 × 3, takže je násobkem čísla 7.' },
  'rm-arith-52': { introduction: 'Hledej nejmenší společný násobek.', question: 'Jaký je nejmenší společný násobek čísel 4 a 6?', options: ['10', '12', '24', '8'], explanation: '12 je nejmenší číslo, které dělí 4 i 6 beze zbytku.' },
  'rm-arith-53': { introduction: 'Vyjmenuj všechny dělitele.', question: 'Kolik dělitelů má číslo 6?', options: ['2', '3', '4', '6'], explanation: 'Dělitelé čísla 6 jsou 1, 2, 3 a 6 — celkem 4.' },
  'rm-arith-54': { introduction: 'Prvočíslo má jen dva dělitele.', question: 'Které z těchto čísel je prvočíslo?', options: ['9', '15', '17', '21'], explanation: '17 nemá žádné dělitele kromě 1 a sebe sama, takže je prvočíslo.' },
  'rm-arith-55': { introduction: 'Hledej největší společný dělitel.', question: 'Jaký je největší společný dělitel čísel 18 a 24?', options: ['3', '6', '9', '12'], explanation: 'Největší číslo, které dělí 18 i 24, je 6.' },
  'rm-arith-56': { introduction: 'Hledej nejmenší společný násobek.', question: 'Jaký je nejmenší společný násobek čísel 3 a 5?', options: ['8', '15', '30', '5'], explanation: '15 je nejmenší číslo dělitelné 3 i 5.' },

  // ── Úroveň 8 — Zaokrouhlování a odhad ──
  'rm-arith-57': { introduction: 'Podívej se na číslici jednotek.', question: 'Zaokrouhli 47 na nejbližší desítku.', options: ['40', '45', '50', '47'], explanation: 'Číslice jednotek je 7 (5 nebo více), takže zaokrouhlíme nahoru na 50.' },
  'rm-arith-58': { introduction: 'Podívej se na číslici desítek.', question: 'Zaokrouhli 152 na nejbližší stovku.', options: ['100', '150', '200', '160'], explanation: 'Číslice desítek je 5, takže zaokrouhlíme nahoru na 200.' },
  'rm-arith-59': { introduction: 'Podívej se na číslici stovek.', question: 'Zaokrouhli 3 847 na nejbližší tisícovku.', options: ['3000', '3800', '4000', '3900'], explanation: 'Číslice stovek je 8 (5 nebo více), takže zaokrouhlíme nahoru na 4000.' },
  'rm-arith-60': { introduction: 'Nejdřív zaokrouhli, potom sečti.', question: 'Odhadni 48 + 53 zaokrouhlením každého čísla na nejbližší desítku.', options: ['90', '100', '110', '80'], explanation: '48 se zaokrouhlí na 50 a 53 se zaokrouhlí na 50, takže odhad je 100.' },
  'rm-arith-61': { introduction: 'Podívej se na číslici desítek.', question: 'Zaokrouhli 2 459 na nejbližší stovku.', options: ['2400', '2500', '2000', '2460'], explanation: 'Číslice desítek je 5, takže se místo stovek zaokrouhlí nahoru na 2500.' },
  'rm-arith-62': { introduction: 'Nejdřív zaokrouhli, potom odečti.', question: 'Odhadni 312 - 198 zaokrouhlením každého čísla na nejbližší stovku.', options: ['100', '200', '114', '150'], explanation: '312 se zaokrouhlí na 300 a 198 se zaokrouhlí na 200, takže 300 - 200 = 100.' },
  'rm-arith-63': { introduction: 'Podívej se na desetinnou část.', question: 'Zaokrouhli 6,7 na nejbližší celé číslo.', options: ['6', '7', '6.5', '8'], explanation: 'Desetinná část ,7 je 5 nebo více, takže zaokrouhlíme nahoru na 7.' },
  'rm-arith-64': { introduction: 'Nejdřív zaokrouhli, potom násob.', question: 'Odhadni 19 × 21 zaokrouhlením každého čísla na nejbližší desítku.', options: ['400', '380', '420', '399'], explanation: '19 se zaokrouhlí na 20 a 21 se zaokrouhlí na 20, takže 20 × 20 = 400.' },

  // ── Úroveň 9 — Záporná čísla ──
  'rm-arith-65': { introduction: 'Představ si posun na číselné ose.', question: '-5 + 8 = ?', options: ['-3', '3', '13', '-13'], explanation: 'Přičtení 8 k -5 posune o 8 doprava po číselné ose až k 3.' },
  'rm-arith-66': { introduction: 'Můžeš klesnout pod nulu.', question: '3 - 7 = ?', options: ['4', '-4', '-10', '10'], explanation: 'Odečtení 7 od 3 klesne pod nulu na -4.' },
  'rm-arith-67': { introduction: 'Dvě záporná čísla se sčítají do většího záporu.', question: '-6 + (-4) = ?', options: ['-10', '10', '-2', '2'], explanation: 'Dvě záporná čísla se sčítají ve velikosti a zůstávají záporná: -6 - 4 = -10.' },
  'rm-arith-68': { introduction: 'Posun se dál do záporu.', question: '-8 - 5 = ?', options: ['-3', '-13', '13', '3'], explanation: 'Odečtení 5 od -8 posune dál do záporu na -13.' },
  'rm-arith-69': { introduction: 'Záporné krát kladné je záporné.', question: '-4 × 3 = ?', options: ['12', '-12', '-7', '7'], explanation: 'Záporné číslo krát kladné je záporné: -4 × 3 = -12.' },
  'rm-arith-70': { introduction: 'Záporné děleno kladným je záporné.', question: '-15 ÷ 3 = ?', options: ['5', '-5', '-45', '45'], explanation: 'Záporné číslo děleno kladným je záporné: -15 ÷ 3 = -5.' },
  'rm-arith-71': { introduction: 'Záporné krát záporné je kladné.', question: '-7 × -2 = ?', options: ['-14', '14', '-9', '9'], explanation: 'Záporné číslo krát záporné je kladné: -7 × -2 = 14.' },
  'rm-arith-72': { introduction: 'Odečtení záporného čísla znamená přičtení.', question: 'Jaká je hodnota výrazu 5 - (-3)?', options: ['2', '8', '-8', '-2'], explanation: 'Odečtení záporného čísla přičítá: 5 - (-3) = 5 + 3 = 8.' },

  // ── Úroveň 10 — Slovní úlohy ──
  'rm-arith-73': { introduction: 'Nejdřív spočítej cenu, potom odečti od bankovky.', question: 'Obchod prodává sešity za $4 za kus. Lena koupí 5 kusů a platí bankovkou $50. Kolik dostane nazpět?', options: ['$20', '$25', '$30', '$35'], explanation: '5 sešitů stojí 5 × $4 = $20 a $50 - $20 = $30 nazpět.' },
  'rm-arith-74': { introduction: 'Spočítej celkový počet míst a odečti obsazená.', question: 'Autobus má 8 řad po 4 sedadlech v každé řadě. Pokud je obsazeno 26 sedadel, kolik je volných?', options: ['6', '8', '5', '7'], explanation: 'Celkem je 8 × 4 = 32 sedadel a 32 - 26 = 6 volných.' },
  'rm-arith-75': { introduction: 'Násob týdenní úsporu počtem týdnů.', question: 'Tom si každý týden ušetří $7. Kolik bude mít našetřeno po 6 týdnech?', options: ['$36', '$42', '$48', '$49'], explanation: 'Šetření $7 po 6 týdnů dává 7 × 6 = $42.' },
  'rm-arith-76': { introduction: 'Vyděl celkovou částku počtem lidí.', question: 'Tři přátelé si rovným dílem rozdělí účet v restauraci ve výši $60. Kolik zaplatí každý?', options: ['$15', '$20', '$25', '$30'], explanation: 'Rozdělení $60 mezi 3 lidi dává 60 ÷ 3 = $20 na osobu.' },
  'rm-arith-77': { introduction: 'Spočítej potřebné vejce a odečti ta, která máš.', question: 'Recept potřebuje 3 vejce na jeden dort. Pokud upečeš 5 dortů a už máš 4 vejce, kolik dalších vajec potřebuješ?', options: ['11', '15', '19', '7'], explanation: 'Potřebuješ 5 × 3 = 15 vajec a 15 - 4 = 11 dalších.' },
  'rm-arith-78': { introduction: 'Vzdálenost je rychlost krát čas.', question: 'Auto jede rychlostí 60 mil za hodinu po dobu 2,5 hodiny. Jak daleko dojede?', options: ['120 miles', '150 miles', '180 miles', '125 miles'], explanation: 'Vzdálenost je rychlost × čas: 60 × 2,5 = 150 mil.' },
  'rm-arith-79': { introduction: 'Spočítej obě částky zvlášť a sečti je.', question: 'Maria koupí 4 sešity za $3 za kus a 2 pera za $2 za kus. Jaká je její celková útrata?', options: ['$14', '$16', '$18', '$20'], explanation: 'Sešity stojí 4 × $3 = $12 a pera 2 × $2 = $4, celkem $16.' },
  'rm-arith-80': { introduction: 'Nejdřív spočítej počet krabic, potom odečti prodané.', question: 'Pekař upeče 120 sušenek a zabalí je do krabic po 12 kusech. Pokud prodá 6 krabic, kolik krabic zbyde?', options: ['4', '5', '6', '10'], explanation: '120 ÷ 12 = 10 krabic a 10 - 6 = 4 krabice zbydou.' },
};
