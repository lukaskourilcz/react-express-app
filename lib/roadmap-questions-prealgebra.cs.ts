import type { QuestionTranslation } from './quiz-data';

export const preAlgebraTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Celá čísla ──
  'rm-prealg-1': { introduction: 'Přičtení kladného čísla k zápornému se posouvá k nule.', question: 'Kolik je -7 + 3?', options: ['-4', '-10', '4', '10'], explanation: 'Přičtení kladného čísla k zápornému se posouvá k nule: -7 + 3 = -4.' },
  'rm-prealg-2': { introduction: 'Odečítání kladného čísla jde dál do záporu.', question: 'Kolik je -5 - 8?', options: ['3', '-3', '-13', '13'], explanation: 'Odečtení 8 od -5 jde ještě více do záporu: -5 - 8 = -13.' },
  'rm-prealg-3': { introduction: 'Záporné krát záporné dává kladné.', question: 'Kolik je -6 × -4?', options: ['-24', '24', '-10', '10'], explanation: 'Záporné číslo krát záporné číslo je kladné: -6 × -4 = 24.' },
  'rm-prealg-4': { introduction: 'Znaménka urči podle pravidla pro dělení.', question: 'Kolik je -20 ÷ 5?', options: ['4', '-4', '-15', '15'], explanation: 'Záporné číslo dělené kladným je záporné: -20 ÷ 5 = -4.' },
  'rm-prealg-5': { introduction: 'Přičtení záporného čísla je totéž jako odečtení.', question: 'Kolik je 8 + (-15)?', options: ['23', '-23', '7', '-7'], explanation: 'Přičtení -15 k 8 dává 8 - 15 = -7.' },
  'rm-prealg-6': { introduction: 'Absolutní hodnota je vzdálenost od nuly.', question: 'Kolik je absolutní hodnota |-9|?', options: ['-9', '9', '0', '18'], explanation: 'Absolutní hodnota je vzdálenost od nuly, vždy nezáporná: |-9| = 9.' },
  'rm-prealg-7': { introduction: 'Záporné krát kladné dává záporné.', question: 'Kolik je -3 × 7?', options: ['-21', '21', '-10', '4'], explanation: 'Záporné číslo krát kladné číslo je záporné: -3 × 7 = -21.' },
  'rm-prealg-8': { introduction: 'Největší je číslo nejblíže nule na číselné ose.', question: 'Které číslo je největší: -5, -1, -8, -3?', options: ['-5', '-1', '-8', '-3'], explanation: 'Na číselné ose je -1 nejblíže nule, takže je největší.' },

  // ── Úroveň 2 — Mocniny ──
  'rm-prealg-9': { introduction: 'Mocnina znamená opakované násobení základu.', question: 'Kolik je 2^3?', options: ['6', '8', '9', '5'], explanation: '2^3 znamená 2 × 2 × 2 = 8.' },
  'rm-prealg-10': { introduction: 'Druhá mocnina je číslo krát ono samo.', question: 'Kolik je 5^2?', options: ['10', '25', '7', '20'], explanation: '5^2 znamená 5 × 5 = 25.' },
  'rm-prealg-11': { introduction: 'Druhá mocnina záporného čísla násobí dvě záporná čísla.', question: 'Kolik je (-3)^2?', options: ['-9', '9', '6', '-6'], explanation: 'Umocnění -3 na druhou násobí dvě záporná čísla: (-3) × (-3) = 9.' },
  'rm-prealg-12': { introduction: 'Cokoli nenulového na nultou je 1.', question: 'Kolik je 10^0?', options: ['0', '1', '10', '100'], explanation: 'Jakékoli nenulové číslo umocněné na nultou je rovno 1.' },
  'rm-prealg-13': { introduction: 'Základ vynásob sám sebou třikrát.', question: 'Kolik je 3^3?', options: ['9', '27', '6', '12'], explanation: '3^3 znamená 3 × 3 × 3 = 27.' },
  'rm-prealg-14': { introduction: 'Vynásob dvojku pětkrát sama sebou.', question: 'Kolik je 2^5?', options: ['10', '25', '32', '16'], explanation: '2^5 znamená 2 × 2 × 2 × 2 × 2 = 32.' },
  'rm-prealg-15': { introduction: 'Lichá mocnina záporného čísla zůstává záporná.', question: 'Kolik je (-2)^3?', options: ['8', '-8', '6', '-6'], explanation: 'Lichá mocnina záporného čísla zůstává záporná: (-2) × (-2) × (-2) = -8.' },
  'rm-prealg-16': { introduction: 'Druhá mocnina je číslo krát ono samo.', question: 'Kolik je 6^2?', options: ['12', '36', '18', '30'], explanation: '6^2 znamená 6 × 6 = 36.' },

  // ── Úroveň 3 — Druhé odmocniny ──
  'rm-prealg-17': { introduction: 'Odmocnina hledá číslo, jehož druhá mocnina dá zadané číslo.', question: 'Kolik je √16?', options: ['4', '8', '2', '16'], explanation: '√16 se ptá, které číslo na druhou dá 16, a 4 × 4 = 16.' },
  'rm-prealg-18': { introduction: 'Hledej číslo, jehož druhá mocnina je 49.', question: 'Kolik je √49?', options: ['6', '7', '8', '24.5'], explanation: '7 × 7 = 49, takže √49 = 7.' },
  'rm-prealg-19': { introduction: 'Hledej číslo, jehož druhá mocnina je 81.', question: 'Kolik je √81?', options: ['9', '8', '18', '40.5'], explanation: '9 × 9 = 81, takže √81 = 9.' },
  'rm-prealg-20': { introduction: 'Hledej číslo, jehož druhá mocnina je 100.', question: 'Kolik je √100?', options: ['50', '10', '20', '5'], explanation: '10 × 10 = 100, takže √100 = 10.' },
  'rm-prealg-21': { introduction: 'Hledej číslo, jehož druhá mocnina je 64.', question: 'Kolik je √64?', options: ['6', '32', '8', '16'], explanation: '8 × 8 = 64, takže √64 = 8.' },
  'rm-prealg-22': { introduction: 'Hledej číslo, jehož druhá mocnina je 144.', question: 'Kolik je √144?', options: ['12', '14', '72', '11'], explanation: '12 × 12 = 144, takže √144 = 12.' },
  'rm-prealg-23': { introduction: 'Vypočítej každou odmocninu zvlášť a pak je sečti.', question: 'Kolik je √25 + √9?', options: ['8', '34', '16', '4'], explanation: '√25 = 5 a √9 = 3, takže 5 + 3 = 8.' },
  'rm-prealg-24': { introduction: 'Hledej číslo, jehož druhá mocnina je 121.', question: 'Kolik je √121?', options: ['10', '12', '11', '60.5'], explanation: '11 × 11 = 121, takže √121 = 11.' },

  // ── Úroveň 4 — Pořadí operací ──
  'rm-prealg-25': { introduction: 'Násobení má přednost před sčítáním.', question: 'Kolik je 2 + 3 × 4?', options: ['20', '14', '24', '11'], explanation: 'Nejprve násob, potom sčítej: 3 × 4 = 12, pak 2 + 12 = 14.' },
  'rm-prealg-26': { introduction: 'Nejprve spočítej závorku.', question: 'Kolik je (2 + 3) × 4?', options: ['14', '20', '24', '9'], explanation: 'Nejprve spočítej závorku: (5) × 4 = 20.' },
  'rm-prealg-27': { introduction: 'Násobení má přednost před odčítáním.', question: 'Kolik je 10 - 2 × 3?', options: ['24', '4', '8', '6'], explanation: 'Nejprve násob: 2 × 3 = 6, pak 10 - 6 = 4.' },
  'rm-prealg-28': { introduction: 'Dělení má přednost před sčítáním.', question: 'Kolik je 6 + 4 ÷ 2?', options: ['5', '8', '7', '10'], explanation: 'Nejprve děl: 4 ÷ 2 = 2, pak 6 + 2 = 8.' },
  'rm-prealg-29': { introduction: 'Mocniny se počítají jako první.', question: 'Kolik je 2^3 + 1?', options: ['9', '7', '12', '24'], explanation: 'Mocniny mají přednost: 2^3 = 8, pak 8 + 1 = 9.' },
  'rm-prealg-30': { introduction: 'Nejprve spočítej závorku, pak děl.', question: 'Kolik je 12 ÷ (2 + 4)?', options: ['10', '2', '4', '8'], explanation: 'Nejprve závorka: 2 + 4 = 6, pak 12 ÷ 6 = 2.' },
  'rm-prealg-31': { introduction: 'Nejprve závorka, pak mocnina, pak násobení.', question: 'Kolik je 3 × (4 + 2)^2?', options: ['108', '324', '48', '40'], explanation: 'Nejprve závorka, pak mocnina: (6)^2 = 36, pak 3 × 36 = 108.' },
  'rm-prealg-32': { introduction: 'Násobení má přednost, pak sčítej a odčítej zleva doprava.', question: 'Kolik je 20 - 3 × 2 + 5?', options: ['39', '19', '29', '9'], explanation: 'Nejprve násob: 3 × 2 = 6, pak 20 - 6 + 5 = 19.' },

  // ── Úroveň 5 — Proměnné a výrazy ──
  'rm-prealg-33': { introduction: 'Dosaď hodnotu za x a vypočítej.', question: 'Vypočítej 3x pro x = 4.', options: ['7', '12', '34', '1'], explanation: 'Dosaď: 3 × 4 = 12.' },
  'rm-prealg-34': { introduction: 'Dosaď hodnotu za x a vypočítej.', question: 'Vypočítej x + 5 pro x = -2.', options: ['3', '7', '-3', '-7'], explanation: 'Dosaď: -2 + 5 = 3.' },
  'rm-prealg-35': { introduction: 'Dosaď za x a dodrž pořadí operací.', question: 'Vypočítej 2x + 1 pro x = 3.', options: ['7', '8', '6', '9'], explanation: 'Dosaď: 2 × 3 + 1 = 6 + 1 = 7.' },
  'rm-prealg-36': { introduction: 'Dosaď za x a umocni na druhou.', question: 'Vypočítej x^2 pro x = 5.', options: ['10', '25', '7', '55'], explanation: 'Dosaď: 5^2 = 5 × 5 = 25.' },
  'rm-prealg-37': { introduction: 'Dosaď za x a dodrž pořadí operací.', question: 'Vypočítej 4x - 3 pro x = 2.', options: ['5', '11', '-5', '8'], explanation: 'Dosaď: 4 × 2 - 3 = 8 - 3 = 5.' },
  'rm-prealg-38': { introduction: 'Dosaď hodnotu za x a vypočítej.', question: 'Vypočítej 5 - x pro x = 8.', options: ['3', '-3', '13', '-13'], explanation: 'Dosaď: 5 - 8 = -3.' },
  'rm-prealg-39': { introduction: 'Nejprve spočítej výraz v závorce.', question: 'Vypočítej 2(x + 3) pro x = 4.', options: ['11', '14', '10', '24'], explanation: 'Nejprve dosaď a spočítej závorku: 2(4 + 3) = 2 × 7 = 14.' },
  'rm-prealg-40': { introduction: 'Dosaď za x a dodrž pořadí operací.', question: 'Vypočítej x/2 + 1 pro x = 10.', options: ['6', '5', '11', '5.5'], explanation: 'Dosaď: 10/2 + 1 = 5 + 1 = 6.' },

  // ── Úroveň 6 — Úprava výrazů ──
  'rm-prealg-41': { introduction: 'Sečti stejné členy.', question: 'Zjednoduš 3x + 5x.', options: ['8x', '15x', '8', '2x'], explanation: 'Sečti stejné členy: 3x + 5x = 8x.' },
  'rm-prealg-42': { introduction: 'Odečti stejné členy.', question: 'Zjednoduš 7x - 2x.', options: ['5x', '9x', '5', '14x'], explanation: 'Sečti stejné členy: 7x - 2x = 5x.' },
  'rm-prealg-43': { introduction: 'Sečti členy s x, konstantu ponech.', question: 'Zjednoduš 2x + 3 + 4x.', options: ['9x', '6x + 3', '5x + 4', '6x + 7'], explanation: 'Sečti členy s x: 2x + 4x = 6x, výsledek je 6x + 3.' },
  'rm-prealg-44': { introduction: 'Slučuj jen stejné členy (a s a, b s b).', question: 'Zjednoduš 4a + 2b - a.', options: ['5a + 2b', '3a + 2b', '6ab', '3ab'], explanation: 'Slouči členy s a: 4a - a = 3a, výsledek je 3a + 2b.' },
  'rm-prealg-45': { introduction: 'Roznásob číslo před závorkou.', question: 'Zjednoduš 3(x + 2).', options: ['3x + 2', '3x + 6', 'x + 6', '5x'], explanation: 'Roznásob trojkou: 3 × x + 3 × 2 = 3x + 6.' },
  'rm-prealg-46': { introduction: 'Nejprve roznásob závorku, pak slouči.', question: 'Zjednoduš 2(x - 4) + 5.', options: ['2x - 3', '2x + 1', '2x - 8', '2x - 9'], explanation: 'Roznásob a pak slouči: 2x - 8 + 5 = 2x - 3.' },
  'rm-prealg-47': { introduction: 'Slouči členy s x a konstanty zvlášť.', question: 'Zjednoduš 5x + 3 - 2x - 1.', options: ['3x + 2', '7x + 2', '3x + 4', '3x - 2'], explanation: 'Slouči stejné členy: (5x - 2x) + (3 - 1) = 3x + 2.' },
  'rm-prealg-48': { introduction: 'Znaménko mínus změní znaménko obou členů.', question: 'Zjednoduš -(x - 3).', options: ['-x - 3', '-x + 3', 'x - 3', 'x + 3'], explanation: 'Roznásob znaménko mínus u obou členů: -x + 3.' },

  // ── Úroveň 7 — Rovnice o jednom kroku ──
  'rm-prealg-49': { introduction: 'Osamostatni x úpravou obou stran.', question: 'Vyřeš x + 5 = 12.', options: ['7', '17', '60', '5'], explanation: 'Odečti 5 od obou stran: x = 12 - 5 = 7.' },
  'rm-prealg-50': { introduction: 'Osamostatni x úpravou obou stran.', question: 'Vyřeš x - 4 = 9.', options: ['5', '13', '36', '-5'], explanation: 'Přičti 4 k oběma stranám: x = 9 + 4 = 13.' },
  'rm-prealg-51': { introduction: 'Zbav se násobku dělením.', question: 'Vyřeš 3x = 18.', options: ['15', '21', '6', '54'], explanation: 'Vyděl obě strany 3: x = 18 ÷ 3 = 6.' },
  'rm-prealg-52': { introduction: 'Zbav se dělení násobením.', question: 'Vyřeš x/4 = 5.', options: ['20', '9', '1.25', '1'], explanation: 'Vynásob obě strany 4: x = 5 × 4 = 20.' },
  'rm-prealg-53': { introduction: 'Osamostatni x úpravou obou stran.', question: 'Vyřeš x + 7 = 3.', options: ['4', '10', '-4', '-10'], explanation: 'Odečti 7 od obou stran: x = 3 - 7 = -4.' },
  'rm-prealg-54': { introduction: 'Zbav se násobku dělením.', question: 'Vyřeš 6x = -30.', options: ['5', '-5', '-24', '-36'], explanation: 'Vyděl obě strany 6: x = -30 ÷ 6 = -5.' },
  'rm-prealg-55': { introduction: 'Osamostatni x úpravou obou stran.', question: 'Vyřeš x - 10 = -2.', options: ['-12', '8', '12', '-8'], explanation: 'Přičti 10 k oběma stranám: x = -2 + 10 = 8.' },
  'rm-prealg-56': { introduction: 'Zbav se dělení násobením.', question: 'Vyřeš x/3 = -6.', options: ['-2', '-18', '18', '-9'], explanation: 'Vynásob obě strany 3: x = -6 × 3 = -18.' },

  // ── Úroveň 8 — Rovnice o dvou krocích ──
  'rm-prealg-57': { introduction: 'Nejprve se zbav konstanty, pak násobku.', question: 'Vyřeš 2x + 3 = 11.', options: ['4', '7', '5', '3'], explanation: 'Odečti 3 a pak vyděl 2: 2x = 8, takže x = 4.' },
  'rm-prealg-58': { introduction: 'Nejprve se zbav konstanty, pak násobku.', question: 'Vyřeš 3x - 5 = 10.', options: ['15', '5', '3', '45'], explanation: 'Přičti 5 a pak vyděl 3: 3x = 15, takže x = 5.' },
  'rm-prealg-59': { introduction: 'Nejprve se zbav konstanty, pak násobku.', question: 'Vyřeš 5x + 2 = 17.', options: ['15', '3', '7', '3.8'], explanation: 'Odečti 2 a pak vyděl 5: 5x = 15, takže x = 3.' },
  'rm-prealg-60': { introduction: 'Nejprve se zbav konstanty, pak dělení.', question: 'Vyřeš x/2 + 4 = 10.', options: ['28', '7', '12', '3'], explanation: 'Odečti 4 a pak vynásob 2: x/2 = 6, takže x = 12.' },
  'rm-prealg-61': { introduction: 'Nejprve se zbav konstanty, pak násobku.', question: 'Vyřeš 4x - 7 = 9.', options: ['0.5', '16', '4', '2'], explanation: 'Přičti 7 a pak vyděl 4: 4x = 16, takže x = 4.' },
  'rm-prealg-62': { introduction: 'Nejprve se zbav konstanty, pak násobku.', question: 'Vyřeš 2x - 6 = -2.', options: ['-4', '2', '4', '-2'], explanation: 'Přičti 6 a pak vyděl 2: 2x = 4, takže x = 2.' },
  'rm-prealg-63': { introduction: 'Můžeš nejprve vydělit celou rovnici a pak upravit.', question: 'Vyřeš 3(x + 1) = 12.', options: ['4', '5', '3', '11'], explanation: 'Vyděl 3 a pak odečti 1: x + 1 = 4, takže x = 3.' },
  'rm-prealg-64': { introduction: 'Nejprve se zbav konstanty, pak záporného násobku.', question: 'Vyřeš 7 - 2x = 1.', options: ['-3', '4', '3', '-4'], explanation: 'Odečti 7 a pak vyděl -2: -2x = -6, takže x = 3.' },

  // ── Úroveň 9 — Nerovnice ──
  'rm-prealg-65': { introduction: 'Uprav obě strany stejně jako u rovnice.', question: 'Vyřeš x + 3 > 7.', options: ['x > 4', 'x > 10', 'x < 4', 'x > 21'], explanation: 'Odečti 3 od obou stran: x > 4.' },
  'rm-prealg-66': { introduction: 'Vyděl kladným číslem, znaménko se nemění.', question: 'Vyřeš 2x < 10.', options: ['x < 5', 'x < 20', 'x > 5', 'x < 8'], explanation: 'Vyděl obě strany 2: x < 5.' },
  'rm-prealg-67': { introduction: 'Uprav obě strany stejně jako u rovnice.', question: 'Vyřeš x - 5 ≥ 0.', options: ['x ≥ 5', 'x ≤ 5', 'x ≥ -5', 'x ≥ 0'], explanation: 'Přičti 5 k oběma stranám: x ≥ 5.' },
  'rm-prealg-68': { introduction: 'Při násobení záporným číslem se znaménko nerovnosti otočí.', question: 'Vyřeš -x > 3.', options: ['x > 3', 'x < -3', 'x > -3', 'x < 3'], explanation: 'Vynásob -1 a otoč znaménko: x < -3.' },
  'rm-prealg-69': { introduction: 'Dělení kladným číslem znaménko nemění.', question: 'Vyřeš 3x ≤ -9.', options: ['x ≤ 3', 'x ≥ -3', 'x ≤ -3', 'x ≥ 3'], explanation: 'Vyděl obě strany 3: x ≤ -3.' },
  'rm-prealg-70': { introduction: 'Hledej hodnotu, která je ostře větší než 5.', question: 'Která hodnota vyhovuje x > 5?', options: ['4', '5', '6', '3'], explanation: 'Pouze 6 je ostře větší než 5.' },
  'rm-prealg-71': { introduction: 'Při dělení záporným číslem se znaménko nerovnosti otočí.', question: 'Vyřeš -2x < 8.', options: ['x < -4', 'x > -4', 'x < 4', 'x > 4'], explanation: 'Vyděl -2 a otoč znaménko: x > -4.' },
  'rm-prealg-72': { introduction: 'Nejprve se zbav konstanty, pak vyděl kladným násobkem.', question: 'Vyřeš 2x + 1 ≥ 7.', options: ['x ≥ 3', 'x ≥ 4', 'x ≤ 3', 'x ≥ 8'], explanation: 'Odečti 1 a pak vyděl 2: 2x ≥ 6, takže x ≥ 3.' },

  // ── Úroveň 10 — Souřadnicová rovina ──
  'rm-prealg-73': { introduction: 'Znaménka souřadnic určují kvadrant.', question: 'Ve kterém kvadrantu leží bod (3, -2)?', options: ['I', 'II', 'III', 'IV'], explanation: 'Kladné x a záporné y umístí bod do kvadrantu IV.' },
  'rm-prealg-74': { introduction: 'Znaménka souřadnic určují kvadrant.', question: 'Ve kterém kvadrantu leží bod (-4, 5)?', options: ['I', 'II', 'III', 'IV'], explanation: 'Záporné x a kladné y umístí bod do kvadrantu II.' },
  'rm-prealg-75': { introduction: 'Počátek je průsečík os.', question: 'Jaké jsou souřadnice počátku?', options: ['(0, 0)', '(1, 1)', '(0, 1)', '(1, 0)'], explanation: 'Počátek je bod, kde se protínají osy, tedy (0, 0).' },
  'rm-prealg-76': { introduction: 'Znaménka souřadnic určují kvadrant.', question: 'Ve kterém kvadrantu leží bod (-3, -6)?', options: ['I', 'II', 'III', 'IV'], explanation: 'Obě záporné souřadnice umístí bod do kvadrantu III.' },
  'rm-prealg-77': { introduction: 'Nulová souřadnice určuje, na které ose bod leží.', question: 'Na které ose leží bod (5, 0)?', options: ['osa x', 'osa y', 'počátek', 'kvadrant I'], explanation: 'Protože y-ová souřadnice je 0, leží bod na ose x.' },
  'rm-prealg-78': { introduction: 'Druhé číslo v uspořádané dvojici je y-ová souřadnice.', question: 'Jaká je y-ová souřadnice bodu (3, -2)?', options: ['3', '-2', '2', '-3'], explanation: 'Y-ová souřadnice je druhé číslo ve dvojici: -2.' },
  'rm-prealg-79': { introduction: 'Nulová souřadnice určuje, na které ose bod leží.', question: 'Na které ose leží bod (0, -4)?', options: ['osa x', 'osa y', 'počátek', 'kvadrant IV'], explanation: 'Protože x-ová souřadnice je 0, leží bod na ose y.' },
  'rm-prealg-80': { introduction: 'První souřadnice udává pohyb vodorovně, druhá svisle.', question: 'Jak se z počátku dostaneš do bodu (-2, 3)?', options: ['vlevo 2 a nahoru 3', 'vpravo 2 a nahoru 3', 'vlevo 3 a nahoru 2', 'vpravo 2 a dolů 3'], explanation: 'Záporné x znamená posun vlevo o 2, kladné y znamená posun nahoru o 3.' },
};
