import type { QuestionTranslation } from './quiz-data';

export const trigonometryTranslationsCs: Record<string, QuestionTranslation> = {
  // ── Úroveň 1 — Úhly a radiány ──
  'rm-trig-1': { introduction: 'Připomeň si počet stupňů v celém otočení.', question: 'Kolik stupňů má plný kruh?', options: ['180°', '270°', '90°', '360°'], explanation: 'Plné otočení kolem kruhu měří 360°.' },
  'rm-trig-2': { introduction: 'Přímý úhel v radiánech.', question: 'Kolik radiánů se rovná 180°?', options: ['π', '2π', 'π/2', 'π/4'], explanation: 'Přímý úhel 180° se rovná π radiánům.' },
  'rm-trig-3': { introduction: 'Pravý úhel ve stupních.', question: 'Kolik stupňů má pravý úhel?', options: ['45°', '60°', '90°', '180°'], explanation: 'Pravý úhel má přesně 90°.' },
  'rm-trig-4': { introduction: 'Celý kruh v radiánech.', question: 'Kolik radiánů má plný kruh?', options: ['π', '2π', '4π', 'π/2'], explanation: 'Plný kruh je 360°, což se rovná 2π radiánům.' },
  'rm-trig-5': { introduction: 'Převeď stupně na radiány pomocí 180° = π.', question: 'Převeď 90° na radiány.', options: ['π/2', 'π', 'π/3', 'π/4'], explanation: 'Protože 180° = π, polovina z toho, 90°, se rovná π/2.' },
  'rm-trig-6': { introduction: 'Půl otočky ve stupních.', question: 'Kolik měří úplné půlotočení?', options: ['90°', '180°', '360°', '45°'], explanation: 'Půlotočení je 180°, přímý úhel.' },
  'rm-trig-7': { introduction: 'Hodnota 45° v radiánech.', question: 'Která je správná hodnota 45° v radiánech?', options: ['π/4', 'π/2', 'π/6', 'π/3'], explanation: '45° je čtvrtina z 180°, takže se rovná π/4 radiánům.' },
  'rm-trig-8': { introduction: 'Jak se nazývá úhel mezi 0° a 90°?', question: 'Jak se nazývá úhel mezi 0° a 90°?', options: ['Tupý', 'Nekonvexní', 'Ostrý', 'Přímý'], explanation: 'Ostrý úhel měří více než 0°, ale méně než 90°.' },

  // ── Úroveň 2 — Poměry v pravoúhlém trojúhelníku ──
  'rm-trig-9': { introduction: 'Rozklad zkratky SOH-CAH-TOA.', question: 'Co znamená "O" v SOH-CAH-TOA?', options: ['Origin (počátek)', 'Opposite (protilehlá)', 'Outer (vnější)', 'Obtuse (tupá)'], explanation: 'O označuje stranu protilehlou (Opposite) k úhlu.' },
  'rm-trig-10': { introduction: 'Který poměr je protilehlá ku přeponě?', question: 'Který poměr se rovná protilehlá ku přeponě?', options: ['cos', 'tan', 'sec', 'sin'], explanation: 'Podle SOH je sinus roven protilehlé dělené přeponou.' },
  'rm-trig-11': { introduction: 'Který poměr je přilehlá ku přeponě?', question: 'Který poměr se rovná přilehlá ku přeponě?', options: ['cos', 'sin', 'tan', 'cot'], explanation: 'Podle CAH je kosinus roven přilehlé dělené přeponou.' },
  'rm-trig-12': { introduction: 'Který poměr je protilehlá ku přilehlé?', question: 'Který poměr se rovná protilehlá ku přilehlé?', options: ['sin', 'cos', 'tan', 'csc'], explanation: 'Podle TOA je tangens roven protilehlé dělené přilehlou.' },
  'rm-trig-13': { introduction: 'Nejdelší strana pravoúhlého trojúhelníku.', question: 'V pravoúhlém trojúhelníku je nejdelší strana?', options: ['Přilehlá', 'Protilehlá', 'Přepona', 'Základna'], explanation: 'Přepona leží proti pravému úhlu a je nejdelší stranou.' },
  'rm-trig-14': { introduction: 'sin = protilehlá/přepona.', question: 'Pravoúhlý trojúhelník má protilehlou 3 a přeponu 5. Jaký je sinus úhlu?', options: ['3/5', '4/5', '3/4', '5/3'], explanation: 'sin = protilehlá/přepona = 3/5.' },
  'rm-trig-15': { introduction: 'cos = přilehlá/přepona.', question: 'Pravoúhlý trojúhelník má přilehlou 4 a přeponu 5. Jaký je kosinus úhlu?', options: ['3/5', '4/5', '4/3', '5/4'], explanation: 'cos = přilehlá/přepona = 4/5.' },
  'rm-trig-16': { introduction: 'tan = protilehlá/přilehlá.', question: 'Pravoúhlý trojúhelník má protilehlou 3 a přilehlou 4. Jaký je tangens úhlu?', options: ['4/3', '3/5', '3/4', '5/4'], explanation: 'tan = protilehlá/přilehlá = 3/4.' },

  // ── Úroveň 3 — Sinus, kosinus a tangens ──
  'rm-trig-17': { introduction: 'Standardní hodnota sin(30°).', question: 'Kolik je sin(30°)?', options: ['1/2', '√2/2', '√3/2', '1'], explanation: 'sin(30°) = 1/2, standardní referenční hodnota.' },
  'rm-trig-18': { introduction: 'Hodnota cos(60°).', question: 'Kolik je cos(60°)?', options: ['√3/2', '1/2', '√2/2', '0'], explanation: 'cos(60°) = 1/2, shodně se sin(30°).' },
  'rm-trig-19': { introduction: 'Tangens při 45°.', question: 'Kolik je tan(45°)?', options: ['0', '1/2', '1', '√3'], explanation: 'Při 45° je protilehlá rovna přilehlé, takže tan(45°) = 1.' },
  'rm-trig-20': { introduction: 'Hodnota cos(30°).', question: 'Kolik je cos(30°)?', options: ['1/2', '√2/2', '√3/2', '1'], explanation: 'cos(30°) = √3/2.' },
  'rm-trig-21': { introduction: 'Hodnota sin(45°).', question: 'Kolik je sin(45°)?', options: ['√2/2', '1/2', '√3/2', '1'], explanation: 'sin(45°) = √2/2.' },
  'rm-trig-22': { introduction: 'Hodnota sin(60°).', question: 'Kolik je sin(60°)?', options: ['1/2', '√2/2', '√3/2', '1'], explanation: 'sin(60°) = √3/2.' },
  'rm-trig-23': { introduction: 'Tangens při 30°.', question: 'Kolik je tan(30°)?', options: ['√3', '1', '√3/3', '1/2'], explanation: 'tan(30°) = (1/2)/(√3/2) = 1/√3 = √3/3.' },
  'rm-trig-24': { introduction: 'Hodnota cos(45°).', question: 'Kolik je cos(45°)?', options: ['1/2', '√2/2', '√3/2', '0'], explanation: 'cos(45°) = √2/2, shodně se sin(45°).' },

  // ── Úroveň 4 — Jednotková kružnice ──
  'rm-trig-25': { introduction: 'Kosinus při 0° na jednotkové kružnici.', question: 'Kolik je cos(0°) na jednotkové kružnici?', options: ['0', '1', '-1', '1/2'], explanation: 'Při 0° je bod (1, 0), takže cos(0°) = 1.' },
  'rm-trig-26': { introduction: 'Sinus při 90° na jednotkové kružnici.', question: 'Kolik je sin(90°) na jednotkové kružnici?', options: ['0', '1', '-1', '√2/2'], explanation: 'Při 90° je bod (0, 1), takže sin(90°) = 1.' },
  'rm-trig-27': { introduction: 'Kosinus při 90° na jednotkové kružnici.', question: 'Kolik je cos(90°) na jednotkové kružnici?', options: ['1', '0', '-1', '1/2'], explanation: 'Při 90° je bod (0, 1), takže cos(90°) = 0.' },
  'rm-trig-28': { introduction: 'Sinus při 180° na jednotkové kružnici.', question: 'Kolik je sin(180°) na jednotkové kružnici?', options: ['1', '0', '-1', '√3/2'], explanation: 'Při 180° je bod (-1, 0), takže sin(180°) = 0.' },
  'rm-trig-29': { introduction: 'Kosinus při 180° na jednotkové kružnici.', question: 'Kolik je cos(180°) na jednotkové kružnici?', options: ['1', '0', '-1', '1/2'], explanation: 'Při 180° je bod (-1, 0), takže cos(180°) = -1.' },
  'rm-trig-30': { introduction: 'Sinus při 0° na jednotkové kružnici.', question: 'Kolik je sin(0°) na jednotkové kružnici?', options: ['1', '0', '-1', '1/2'], explanation: 'Při 0° je bod (1, 0), takže sin(0°) = 0.' },
  'rm-trig-31': { introduction: 'Souřadnice bodu na jednotkové kružnici.', question: 'Kterými souřadnicemi je dán bod na jednotkové kružnici?', options: ['(sin θ, cos θ)', '(tan θ, cos θ)', '(cos θ, tan θ)', '(cos θ, sin θ)'], explanation: 'Bod na jednotkové kružnici je (cos θ, sin θ), nejprve x, pak y.' },
  'rm-trig-32': { introduction: 'π radiánů odpovídá 180°.', question: 'Kolik je cos(π) v radiánech na jednotkové kružnici?', options: ['1', '0', '-1', '√2/2'], explanation: 'π radiánů se rovná 180°, kde cos = -1.' },

  // ── Úroveň 5 — Goniometrie libovolného úhlu ──
  'rm-trig-33': { introduction: 'Kvadrant, kde jsou sin i cos kladné.', question: 'Ve kterém kvadrantu jsou sin i cos kladné?', options: ['I', 'II', 'III', 'IV'], explanation: 'V I. kvadrantu jsou x i y kladné, takže sin i cos jsou kladné.' },
  'rm-trig-34': { introduction: 'Znaménko sin θ ve III. kvadrantu.', question: 'Jaké je znaménko sin θ ve III. kvadrantu?', options: ['Kladné', 'Nulové', 'Nedefinované', 'Záporné'], explanation: 'Ve III. kvadrantu je y záporné, takže sin θ je záporný.' },
  'rm-trig-35': { introduction: 'Znaménko cos θ ve II. kvadrantu.', question: 'Jaké je znaménko cos θ ve II. kvadrantu?', options: ['Kladné', 'Záporné', 'Nulové', 'Nedefinované'], explanation: 'Ve II. kvadrantu je x záporné, takže cos θ je záporný.' },
  'rm-trig-36': { introduction: 'Použij referenční úhel a znaménko v kvadrantu.', question: 'Kolik je sin(150°)?', options: ['1/2', '-1/2', '√3/2', '-√3/2'], explanation: 'Referenční úhel je 30° a ve II. kvadrantu je sinus kladný, takže sin(150°) = 1/2.' },
  'rm-trig-37': { introduction: 'Použij referenční úhel a znaménko v kvadrantu.', question: 'Kolik je cos(120°)?', options: ['1/2', '-1/2', '√3/2', '-√3/2'], explanation: 'Referenční úhel 60°, kosinus je záporný ve II. kvadrantu, takže cos(120°) = -1/2.' },
  'rm-trig-38': { introduction: 'Které funkce jsou kladné ve IV. kvadrantu?', question: 'Které goniometrické funkce jsou kladné ve IV. kvadrantu?', options: ['jen sin', 'jen cos', 'jen tan', 'všechny'], explanation: 'Ve IV. kvadrantu je x kladné a y záporné, takže kladný je jen kosinus.' },
  'rm-trig-39': { introduction: 'Referenční úhel ve III. kvadrantu.', question: 'Jaký je referenční úhel pro 210°?', options: ['30°', '60°', '45°', '210°'], explanation: '210° − 180° = 30°, referenční úhel ve III. kvadrantu.' },
  'rm-trig-40': { introduction: 'Referenční úhel a znaménko tangenty.', question: 'Kolik je tan(135°)?', options: ['1', '-1', '√3', '-√3'], explanation: 'Referenční úhel 45° dává velikost 1 a tangens je záporný ve II. kvadrantu, takže tan(135°) = -1.' },

  // ── Úroveň 6 — Grafy goniometrických funkcí ──
  'rm-trig-41': { introduction: 'Perioda sinu ve stupních.', question: 'Jaká je perioda y = sin x (ve stupních)?', options: ['90°', '180°', '360°', '720°'], explanation: 'Funkce sinus se opakuje každých 360°.' },
  'rm-trig-42': { introduction: 'Amplituda je absolutní hodnota koeficientu.', question: 'Jaká je amplituda y = 3 sin x?', options: ['1', '3', '6', '1/3'], explanation: 'Amplituda se rovná absolutní hodnotě koeficientu, tedy 3.' },
  'rm-trig-43': { introduction: 'Maximum kosinu.', question: 'Jaká je maximální hodnota y = cos x?', options: ['0', '1', '2', 'π'], explanation: 'Kosinus nabývá hodnot od -1 do 1, takže jeho maximum je 1.' },
  'rm-trig-44': { introduction: 'Obor hodnot sinu.', question: 'Jaký je obor hodnot y = sin x?', options: ['[0, 1]', '[-1, 1]', '[-∞, ∞]', '[0, 2π]'], explanation: 'Sinus nabývá hodnot mezi -1 a 1 včetně.' },
  'rm-trig-45': { introduction: 'Kde má tangens svislé asymptoty?', question: 'Graf y = tan x má svislé asymptoty tam, kde se cos x rovná?', options: ['1', '0', '-1', '1/2'], explanation: 'Tangens je sin/cos, nedefinovaný tam, kde cos x = 0.' },
  'rm-trig-46': { introduction: 'Perioda tangenty ve stupních.', question: 'Jaká je perioda y = tan x (ve stupních)?', options: ['90°', '180°', '360°', '270°'], explanation: 'Funkce tangens se opakuje každých 180°.' },
  'rm-trig-47': { introduction: 'Amplituda základního kosinu.', question: 'Jaká je amplituda y = cos x?', options: ['0', '1', '2', 'π'], explanation: 'Základní kosinus má amplitudu 1.' },
  'rm-trig-48': { introduction: 'Vliv koeficientu uvnitř funkce na periodu.', question: 'Perioda y = sin(2x) je jaká část periody y = sin x?', options: ['Poloviční', 'Dvojnásobná', 'Stejná', 'Čtvrtinová'], explanation: 'Koeficient 2 uvnitř stlačuje graf a půlí periodu.' },

  // ── Úroveň 7 — Goniometrické identity ──
  'rm-trig-49': { introduction: 'Pythagorova identita.', question: 'Čemu se rovná sin²θ + cos²θ?', options: ['0', '1', '2', 'tan θ'], explanation: 'Toto je Pythagorova identita: sin²θ + cos²θ = 1.' },
  'rm-trig-50': { introduction: 'Definice tangenty.', question: 'Kterému poměru se rovná tan θ?', options: ['cos θ / sin θ', '1 / sin θ', 'sin θ · cos θ', 'sin θ / cos θ'], explanation: 'Z definice tan θ = sin θ / cos θ.' },
  'rm-trig-51': { introduction: 'Identita odvozená dělením cos²θ.', question: 'Čemu se rovná 1 + tan²θ?', options: ['sec²θ', 'csc²θ', 'cos²θ', '1'], explanation: 'Identita 1 + tan²θ = sec²θ vzniká vydělením Pythagorovy identity výrazem cos²θ.' },
  'rm-trig-52': { introduction: 'Identita pro dvojnásobný úhel sinu.', question: 'Jak zní sin(2θ) ve tvaru pro dvojnásobný úhel?', options: ['2 sin θ cos θ', 'sin²θ − cos²θ', '2 cos²θ', 'sin θ + cos θ'], explanation: 'Identita pro dvojnásobný úhel je sin(2θ) = 2 sin θ cos θ.' },
  'rm-trig-53': { introduction: 'Sinus je lichá funkce.', question: 'Co platí: sin(−θ) se rovná?', options: ['sin θ', '−sin θ', 'cos θ', '1 − sin θ'], explanation: 'Sinus je lichá funkce, takže sin(−θ) = −sin θ.' },
  'rm-trig-54': { introduction: 'Kosinus je sudá funkce.', question: 'Co platí: cos(−θ) se rovná?', options: ['−cos θ', 'cos θ', 'sin θ', '1 − cos θ'], explanation: 'Kosinus je sudá funkce, takže cos(−θ) = cos θ.' },
  'rm-trig-55': { introduction: 'Identita odvozená dělením sin²θ.', question: 'Čemu se rovná 1 + cot²θ?', options: ['sec²θ', 'csc²θ', 'tan²θ', 'sin²θ'], explanation: 'Vydělení Pythagorovy identity výrazem sin²θ dává 1 + cot²θ = csc²θ.' },
  'rm-trig-56': { introduction: 'Jeden z tvarů identity pro dvojnásobný úhel.', question: 'Identitu cos(2θ) lze zapsat jako?', options: ['2 sin θ cos θ', 'cos²θ − sin²θ', 'sin²θ − cos²θ', '2 sin²θ'], explanation: 'Jeden tvar identity pro dvojnásobný úhel je cos(2θ) = cos²θ − sin²θ.' },

  // ── Úroveň 8 — Sinová věta ──
  'rm-trig-57': { introduction: 'Vzorec sinové věty.', question: 'Sinová věta říká, že a/sin A se rovná čemu?', options: ['b/sin B', 'b·sin B', 'sin B/b', 'b/cos B'], explanation: 'Sinová věta dává a/sin A = b/sin B = c/sin C.' },
  'rm-trig-58': { introduction: 'Kdy je sinová věta nejužitečnější?', question: 'Sinová věta je nejpřímočařeji užitečná, když znáš?', options: ['Tři strany', 'Dva úhly a jednu stranu', 'Tři úhly', 'Dvě strany a úhel jimi sevřený'], explanation: 'Při dvou úhlech a jedné straně (AAS/ASA) sinová věta dopočítá zbytek.' },
  'rm-trig-59': { introduction: 'Použij b = a·sin B/sin A.', question: 'V trojúhelníku je A = 30°, a = 5, sin B = 0,6. Pomocí a/sin A = b/sin B urči b.', options: ['3', '6', '9', '10'], explanation: 'b = a·sin B/sin A = 5·0,6/0,5 = 6.' },
  'rm-trig-60': { introduction: 'Součet úhlů v trojúhelníku je 180°.', question: 'Pokud A = 40° a B = 60° v trojúhelníku, kolik je C?', options: ['70°', '80°', '100°', '60°'], explanation: 'Součet úhlů je 180°, takže C = 180° − 40° − 60° = 80°.' },
  'rm-trig-61': { introduction: 'Který zadaný případ vede k nejednoznačnosti?', question: 'Nejednoznačný případ sinové věty může nastat u které zadané informace?', options: ['ASA', 'SSS', 'SSA', 'AAS'], explanation: 'Konfigurace SSA může dát nula, jeden, nebo dva trojúhelníky.' },
  'rm-trig-62': { introduction: 'Použij c = a·sin C/sin A.', question: 'Dáno a/sin A = c/sin C s a = 8, sin A = 0,5, sin C = 0,25, urči c.', options: ['2', '4', '8', '16'], explanation: 'c = a·sin C/sin A = 8·0,25/0,5 = 4.' },
  'rm-trig-63': { introduction: 'Strana leží proti úhlu se stejným písmenem.', question: 'V sinové větě leží strana a proti kterému úhlu?', options: ['A', 'B', 'C', 'pravému úhlu'], explanation: 'Každá strana leží proti úhlu s odpovídajícím písmenem, takže a je proti A.' },
  'rm-trig-64': { introduction: 'Použij b = a·sin B/sin A.', question: 'Pokud a = 10, A = 90° a B = 30°, kolik je b pomocí sinové věty?', options: ['5', '10', '20', '15'], explanation: 'b = a·sin B/sin A = 10·0,5/1 = 5.' },

  // ── Úroveň 9 — Kosinová věta ──
  'rm-trig-65': { introduction: 'Vzorec kosinové věty.', question: 'Kosinová věta říká, že c² se rovná?', options: ['a² + b²', 'a² + b² + 2ab·cos C', 'a² − b²', 'a² + b² − 2ab·cos C'], explanation: 'Kosinová věta je c² = a² + b² − 2ab·cos C.' },
  'rm-trig-66': { introduction: 'Kdy je kosinová věta nejvhodnější?', question: 'Kosinovou větu nejlépe použiješ, když znáš?', options: ['Dva úhly a stranu', 'Tři úhly', 'Dvě strany a úhel jimi sevřený', 'Jen jednu stranu'], explanation: 'Při dvou stranách a úhlu jimi sevřeném (SAS) dopočítá třetí stranu.' },
  'rm-trig-67': { introduction: 'Dosaď do c² = a² + b² − 2ab·cos C.', question: 'Pro a = 3, b = 4, C = 90° urči c pomocí kosinové věty.', options: ['5', '7', '25', '12'], explanation: 'c² = 9 + 16 − 24·cos 90° = 25 − 0 = 25, takže c = 5.' },
  'rm-trig-68': { introduction: 'Speciální případ při C = 90°.', question: 'Když C = 90°, kosinová věta se redukuje na kterou větu?', options: ['Sinovou větu', 'Pythagorovu větu', 'Trojúhelníkovou nerovnost', 'Heronův vzorec'], explanation: 'Protože cos 90° = 0, je c² = a² + b², tedy Pythagorova věta.' },
  'rm-trig-69': { introduction: 'Dosaď cos 60° = 1/2.', question: 'Pro a = 5, b = 7, C = 60° urči c². (cos 60° = 1/2)', options: ['39', '74', '109', '35'], explanation: 'c² = 25 + 49 − 2·5·7·(1/2) = 74 − 35 = 39.' },
  'rm-trig-70': { introduction: 'K nalezení úhlů potřebuješ všechny strany.', question: 'Kosinovou větu lze použít i k nalezení úhlů, když znáš?', options: ['Dva úhly', 'Všechny tři strany', 'Jednu stranu a jeden úhel', 'Nic'], explanation: 'Při všech třech stranách (SSS) můžeš dopočítat kterýkoli úhel.' },
  'rm-trig-71': { introduction: 'Dosaď do kosinové věty s C = 90°.', question: 'Pro a = 2, b = 3, C = 90° urči c².', options: ['5', '13', '6', '25'], explanation: 'c² = 4 + 9 − 2·2·3·cos 90° = 13 − 0 = 13.' },
  'rm-trig-72': { introduction: 'Uvažuj, jak menší cos C ovlivní c.', question: 'V c² = a² + b² − 2ab·cos C způsobí větší úhel C menší cos C, což dělá c?', options: ['Větší', 'Menší', 'Beze změny', 'Nulové'], explanation: 'Menší cos C znamená, že se odečítá méně, takže c roste.' },

  // ── Úroveň 10 — Řešení goniometrických rovnic ──
  'rm-trig-73': { introduction: 'Kde je sinus nulový?', question: 'Vyřeš sin x = 0 pro x v [0°, 360°).', options: ['0° a 180°', '90° a 270°', 'jen 0°', 'jen 180°'], explanation: 'Sinus je nulový v 0° a 180° v rámci jedné periody.' },
  'rm-trig-74': { introduction: 'Kde je kosinus roven 1?', question: 'Vyřeš cos x = 1 pro x v [0°, 360°).', options: ['0°', '90°', '180°', '360°'], explanation: 'Kosinus se rovná 1 pouze v 0° v intervalu [0°, 360°).' },
  'rm-trig-75': { introduction: 'Použij základní úhel a jeho doplněk.', question: 'Vyřeš sin x = 1/2 pro x v [0°, 360°).', options: ['30° a 150°', '30° a 330°', '60° a 120°', '150° a 210°'], explanation: 'Sinus se rovná 1/2 v 30° a jeho doplňku 150°.' },
  'rm-trig-76': { introduction: 'Řešení tangenty jsou vzdálena o jednu periodu.', question: 'Vyřeš tan x = 1 pro x v [0°, 360°).', options: ['45° a 225°', '45° a 135°', '135° a 315°', 'jen 45°'], explanation: 'Tangens se rovná 1 v 45° a 225°, vzdálených o jednu periodu.' },
  'rm-trig-77': { introduction: 'Kde je kosinus nulový?', question: 'Vyřeš cos x = 0 pro x v [0°, 360°).', options: ['0° a 180°', '90° a 270°', 'jen 90°', '180° a 360°'], explanation: 'Kosinus je nulový v 90° a 270°.' },
  'rm-trig-78': { introduction: 'Nejprve vyděl dvěma.', question: 'Vyřeš 2 sin x = 1 pro x v [0°, 360°).', options: ['30° a 150°', '60° a 120°', '30° a 330°', '45° a 135°'], explanation: 'Vydělením dostaneme sin x = 1/2, takže x = 30° a 150°.' },
  'rm-trig-79': { introduction: 'Kde je kosinus roven -1?', question: 'Vyřeš cos x = -1 pro x v [0°, 360°).', options: ['0°', '90°', '180°', '270°'], explanation: 'Kosinus se rovná -1 pouze v 180°.' },
  'rm-trig-80': { introduction: 'Kde má sinus své minimum?', question: 'Vyřeš sin x = -1 pro x v [0°, 360°).', options: ['90°', '180°', '270°', '360°'], explanation: 'Sinus dosahuje svého minima -1 v 270°.' },
};
