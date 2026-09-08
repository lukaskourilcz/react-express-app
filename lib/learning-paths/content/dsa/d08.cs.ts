/** Czech copy for D08. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. Algorithm names, JavaScript identifiers and
 * growth classes stay in their original form. */

import type { ModuleCs } from '../../types';

export const DSA_D08_CS: ModuleCs = {
  title: 'Základní řadicí algoritmy',
  outcomes: [
    'Napsat selection sort, insertion sort a merge sort proti komparátoru dodanému volajícím a říct, kolik porovnání každý z nich stojí.',
    'Vysvětlit, proč selection sort udělá n(n-1)/2 porovnání na každém vstupu, zatímco insertion sort udělá na už seřazeném poli jen n-1.',
    'Rozlišit stabilní řazení od nestabilního a řazení na místě od řazení s pomocným polem a určit pomocnou paměť všech tří algoritmů.',
  ],
  lessons: {
    'dsa-v1-d08-l1': {
      title: 'Dva kvadratické algoritmy a co znamená stabilita',
      summary: 'Selection sort proti insertion sortu: stejná třída růstu, velmi odlišný počet porovnání a stabilní je jen jeden z nich.',
      sections: [
        {
          body:
            'Řazení přeskládá kolekci tak, aby s výsledným pořadím souhlasila porovnávací funkce. Všechny algoritmy v tomto modulu ji berou jako argument: `compare(a, b)` vrací záporné číslo, když `a` patří před `b`, nulu, když jsou obě hodnoty zaměnitelné, a kladné číslo, když `a` patří za `b`. Je to stejná dohoda, jakou používá `Array.prototype.sort`, a právě díky tomu, že přes ni jdou všechna porovnání, umí jediná funkce řadit čísla, řetězce i záznamy.',
        },
        {
          body:
            'Selection sort funguje tak, jak většina lidí řadí karty, které si nemůžou rozložit do vějíře: projdi všechno, co zbývá, najdi nejmenší prvek, dej ho dopředu a opakuj to se zbytkem. Po k průchodech drží prvních k pozic k nejmenších prvků a ty už se nikdy nepohnou.',
        },
        { caption: 'Selection sort: jeden průchod na každou pozici, s indexem zatím nejmenšího prvku.' },
        {
          caption: 'Selection sort na čtyřech prvcích: šest porovnání, což je 4 × 3 / 2.',
          notes: [
            'Pole před prvním průchodem. Zatím není usazená žádná pozice.',
            'První průchod plní pozici 0. Porovná všechny tři prvky napravo od ní se zatím nejmenším nalezeným a skončí u jedničky. Tři porovnání.',
            'Jednička se prohodí na pozici 0 a čtyřka zaujme místo, odkud jednička přišla. Pozice 0 je usazená a už se nezmění.',
            'Druhý průchod plní pozici 1. Porovná se dvojkou nejdřív sedmičku a pak čtyřku a dvojku si nechá. Dvě porovnání a žádné prohození není potřeba.',
            'Třetí průchod plní pozici 2. Porovná čtyřku se sedmičkou a zjistí, že čtyřka je menší. Jedno porovnání.',
            'Čtyřka a sedmička se prohodí, takže poslední pozice vyjde správně bez vlastního průchodu. Šest porovnání na čtyři prvky: 3 + 2 + 1.',
          ],
          counterLabels: ['Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání'],
        },
        {
          body:
            'Sečti ty průchody pro obecné n a dostaneš (n-1) + (n-2) + … + 1, tedy n(n-1)/2. Pro osm prvků je to 28. To číslo se nikdy nezmění, protože ani jedna mez cyklu nezávisí na výsledku porovnání: vnitřní cyklus vždycky doběhne na konec pole a žádné porovnání nemůže průchod zkrátit. Selection sort utratí 28 porovnání na už seřazeném poli o osmi prvcích, na obráceném i na osmi kopiích téže hodnoty. Přesuny jsou samostatný náklad a selection sort je mezi nimi nevyvážený: n(n-1)/2 porovnání, ale nejvýš n-1 prohození, jedno na průchod. Když je přesun prvku drahý a porovnání dvou prvků levné, právě tenhle poměr je důvod po něm sáhnout.',
        },
        {
          body:
            'Insertion sort místo toho zvětšuje seřazenou předponu. Pozice 0 až i-1 jsou už v pořádku; vezmi prvek na pozici i, projdi doleva přes všechno, co je větší než on, a vlož ho do vzniklé mezery. Prvky, přes které jsi prošel, se přitom posunou o místo doprava.',
        },
        { caption: 'Insertion sort: podmínka `j >= 0` je první, takže se komparátor nikdy neptá na prvek, který neexistuje.' },
        {
          body:
            'Tady už výsledek porovnání cyklus řídí. Na už seřazeném poli selže hned první porovnání každého průchodu, posouvací cyklus se vůbec nespustí a celé řazení stojí n-1 porovnání — pro osm prvků 7. Na obráceném poli projde každý průchod celou předponu, což dá 1 + 2 + … + (n-1) = n(n-1)/2, zase 28. V nejhorším případě stejná třída růstu jako selection sort, v nejlepším lineární.',
        },
        {
          caption: 'Porovnání na osmi prvcích, spočítaná ručně, ne změřená stopkami.',
          headers: ['Vstup', 'Selection sort', 'Insertion sort', 'Bubble sort s předčasným koncem'],
          rows: [
            ['Už seřazený', '28', '7', '7'],
            ['Obrácený', '28', '28', '28'],
            ['Náhodné pořadí', '28', 'Mezi 7 a 28', 'Mezi 7 a 28'],
          ],
        },
        {
          body:
            'Řazení je stabilní, když prvky, které komparátor označí za rovnocenné, vyjdou ven ve stejném pořadí, v jakém do něj vstoupily. Seřaď seznam objednávek podle zákazníka a výsledek pak podle data: stabilní druhé řazení nechá v každém datu objednávky seskupené po zákaznících. Nestabilní to seskupení rozhází a musíš řadit podle složeného klíče.',
        },
        { caption: 'Stabilita je vidět jedině tehdy, když komparátor ohlásí shodu.' },
        {
          body:
            'Insertion sort je ve výše uvedené podobě stabilní, protože `compare(values[j], current) > 0` se zastaví u prvního prvku, který není ostře větší, takže přes rovnocenný prvek nikdy neprojde. Změň to `> 0` na `>= 0` a řazení pořád vrátí správné hodnoty ve správném pořadí, ale stabilní už nebude. Selection sort je nestabilní z jiného důvodu: jeho prohození hodí do mezery vzdálený prvek, přes hlavu všech rovnocenných prvků mezi nimi.',
        },
        {
          caption: 'Bubble sort na stejných čtyřech prvcích: jen sousedi a na konci každého průchodu se usadí největší prvek.',
          notes: [
            'Pole před prvním průchodem. Bubble sort porovnává vždycky jen sousední prvky.',
            'Porovnej sousedy na pozicích 0 a 1. Čtyřka je větší než dvojka, takže se dvojice prohodí.',
            'Po prohození porovnej čtyřku a sedmičku. Ty už jsou v pořádku, takže se nic nehne.',
            'Porovnej sedmičku a jedničku. Sedmička je větší, takže se prohodí a sedmička doputuje na poslední pozici.',
            'První průchod skončil po třech porovnáních. Největší prvek dorazil na konec, takže další průchod může skončit o místo dřív.',
            'Druhý průchod porovná dvojku se čtyřkou a nechá je být, pak porovná čtyřku s jedničkou a prohodí je. Další dvě porovnání a čtyřka se usadí vedle sedmičky.',
            'Třetí průchod porovná dvojku s jedničkou a prohodí je. Celkem šest porovnání, tedy stejných 4 × 3 / 2, které na tomhle poli utratil selection sort.',
          ],
          counterLabels: ['Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání'],
        },
        {
          body:
            'Bubble sort je tu ke čtení, ne k psaní. Je stabilní a řadí na místě, ale s daty hýbe víc než insertion sort: oba udělají jednu operaci na každou převrácenou dvojici, jenže u bubble sortu je to prohození a u insertion sortu jediný posun. Nikde v této cestě ho psát nebudeš. Psát budeš selection sort a insertion sort, oba v nejhorším případě O(n²) a oba s O(1) pomocné paměti.',
        },
      ],
    },
    'dsa-v1-d08-l2': {
      title: 'Merge sort: rozděl, slij a zaplať za pomocné pole',
      summary: 'Proč rozdělení až na jednotlivé prvky a zpětné slévání stojí O(n log n) a co si za lineární pomocné pole kupuješ.',
      sections: [
        {
          body:
            'Merge sort stojí na jediném pozorování: dvě pole, z nichž je každé už seřazené, se dají spojit do jednoho seřazeného jediným průchodem, aniž by ses kdy podíval zpátky. Rozděl tedy vstup na půlky, každou půlku seřaď stejným způsobem a oba výsledky slij. Pole o jednom prvku je seřazené samo od sebe, což rekurzi ukončí.',
        },
        { caption: 'Dělicí polovina algoritmu. `slice` kopíruje, a odtud se bere paměť navíc.' },
        {
          body:
            'Práci odvádí slévání. Drž si index do každého ze seřazených úseků. Porovnej oba přední prvky, přesuň ten menší do výstupu, posuň jeho index a opakuj. Jakmile se jeden úsek vyprázdní, je všechno zbývající v tom druhém už v pořadí a připojí se bez jediného dalšího porovnání.',
        },
        { caption: 'Jedno porovnání na každý prvek, který opustí spornou oblast, a po vyprázdnění úseku žádné.' },
        {
          caption: 'Slévání dvou seřazených úseků po třech prvcích: pět porovnání a poslední prvek přejde zadarmo.',
          notes: [
            'Dva úseky, z nichž je každý už seřazený: pozice 0 až 2 drží 2, 5, 8 a pozice 3 až 5 drží 1, 4, 9. Výstup je zatím prázdný a oba přední prvky jsou připravené.',
            'Porovnej přední prvky 2 a 1. Pravý je menší, takže jednička jde do výstupu a pravý úsek se posune. Výstup zatím: 1.',
            'Porovnej 2 a 4. Levý je menší, takže dvojka jde ven a posune se levý úsek. Výstup zatím: 1, 2.',
            'Porovnej 5 a 4. Tentokrát vyhraje pravý. Výstup zatím: 1, 2, 4.',
            'Porovnej 5 a 9. Vyhraje levý. Výstup zatím: 1, 2, 4, 5.',
            'Porovnej 8 a 9. Vyhraje levý a levý úsek je tím prázdný. Výstup zatím: 1, 2, 4, 5, 8.',
            'S prázdným levým úsekem se devítka připojí bez dalšího porovnání. Šest prvků slitých pěti porovnáními, což je nejvíc, kolik může slévání dvou tříprvkových úseků stát.',
          ],
          counterLabels: ['Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání'],
        },
        {
          body:
            'Slití dvou úseků, které mezi sebou drží n prvků, stojí nejvýš n-1 porovnání, protože každé porovnání pošle do výstupu právě jeden prvek a ten poslední dorazí zadarmo. Právě na tomhle odhadu stojí argument přes úrovně.',
        },
        {
          body:
            'Rozlož rekurzi po úrovních, ne po voláních. První úroveň slévá dvojice jednotlivých prvků, druhá dvojice dvouprvkových úseků a třetí obě poloviny. Každá úroveň se dotkne všech osmi prvků právě jednou, takže každá stojí O(n). Zbývá jediná otázka: kolik je těch úrovní.',
        },
        {
          caption: 'Merge sort na osmi prvcích, spočítaný úroveň po úrovni.',
          headers: ['Úroveň', 'Provedená slití', 'Dotčené prvky', 'Porovnání nejvýš'],
          rows: [
            ['1', 'Čtyři slití 1 + 1', '8', '4'],
            ['2', 'Dvě slití 2 + 2', '8', '6'],
            ['3', 'Jedno slití 4 + 4', '8', '7'],
            ['Celkem', 'Tři úrovně', '24', '17'],
          ],
        },
        {
          body:
            'Osm se půlí na čtyři, čtyři na dvě, dvě na jednu: tři půlení, tedy tři úrovně slévání. To je log₂ 8. Každá úroveň stojí nejvýš n porovnání a úrovní je log₂ n, což dává O(n log n). Zdvojnásobení vstupu na šestnáct přidá jednu úroveň, ne druhou kopii celé práce, a proto merge sort funguje dál na vstupech, na kterých kvadratické řazení přestane dobíhat.',
        },
        {
          body:
            'Těch 17 v tabulce je horní odhad, ne pevný počet. Na už seřazeném poli o osmi prvcích utratí týž merge sort jen 12 porovnání, protože každé slévání vyčerpá jeden úsek dřív a zbytek připojí zadarmo. Selection sort nic takového nemá: jeho 28 je stejné číslo na každém vstupu.',
        },
        {
          body:
            'Účet přijde za pomocné pole. Každé slévání zapisuje do nového pole, takže merge sort drží nad rámec vstupu O(n) prvků pomocné paměti — verze výše si ji bere přes `slice` a `push`. Rekurze si k tomu půjčí O(log n) rámců zásobníku, které se v lineárním poli ztratí. Selection sort a insertion sort potřebují O(1) pomocné paměti, a přesně tohle je ten obchod, který uzavíráš.',
        },
        {
          body:
            'Stabilita se schovává v jednom znaku. `compare(left[i], right[j]) <= 0` bere při shodě z levého úseku, což udrží rovnocenné prvky v původním pořadí, protože všechno z levého úseku bylo dřív. Napiš místo toho `< 0` a shody vyhrává pravý prvek, takže rovnocenné prvky vyjdou přehozené.',
        },
        {
          body:
            'Quicksort dosáhne v průměru téhož O(n log n) a řadí přitom na místě, ale místo slévání rozděluje kolem pivotu, při špatné volbě pivotu klesne na O(n²) a ve své obvyklé podobě není stabilní; tato cesta ukazuje a implementuje jen merge sort.',
        },
        {
          body:
            'Po čem tedy sáhnout. Insertion sort vyhrává na krátkých polích a na polích, která jsou už skoro seřazená, a proto produkční řadicí funkce na krátkých úsecích přepínají právě na něj. Merge sort vyhrává, když n roste a pole navíc si můžeš dovolit. Selection sort je tu hlavně k pochopení: jeho jedinou skutečnou výhodou je malý počet zápisů.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d08-l1-read': {
      title: 'Čtení: dva kvadratické algoritmy a co znamená stabilita',
      summary: 'Selection sort, insertion sort a ukázka bubble sortu: počty porovnání, počty prohození a stabilita.',
    },
    'dsa-v1-d08-l2-read': {
      title: 'Čtení: merge sort, rozděl, slij a zaplať za pomocné pole',
      summary: 'Slévání, argument přes úrovně pro O(n log n), lineární pomocné pole a odkud se bere stabilita.',
    },
    'dsa-v1-d08-checks': {
      title: 'Kontrola řazení',
      summary: 'Čtyři otázky na stabilitu, pomocnou paměť, proč selection sort svůj vstup ignoruje, a na argument přes úrovně u merge sortu.',
      questions: {
        'dsa-v1-d08-q1': {
          prompt:
            'Sestava je seřazená podle jména zákazníka a pak znovu podle data objednávky. Řádky se stejným datem musí zůstat seskupené po zákaznících. Které z algoritmů v tomto modulu zvládnou to druhé řazení samy a seskupení zachovají?',
          options: [
            'Insertion sort a merge sort, pokud slévání bere při shodě z levého úseku',
            'Selection sort a merge sort, protože oba porovnají každou dvojici prvků právě jednou',
            'Jen selection sort, protože ze všech tří udělá nejmíň prohození',
            'Žádný z nich, protože komparátor vracející nulu nechává výsledné pořadí nedefinované',
          ],
          explanation:
            'Insertion sort se přestane posouvat u prvního prvku, který není ostře větší, takže přes rovnocenný prvek nikdy neprojde, a merge sort udrží shody v pořadí, dokud `<= 0` posílá napřed levý úsek. Nestabilní je selection sort, což vylučuje druhou i třetí možnost: jeho prohození hodí do mezery vzdálený prvek a přeskočí všechny rovnocenné prvky mezi nimi. Druhá možnost navíc popisuje práci špatně, protože selection sort porovnává každý zbývající prvek s průběžným minimem, ne každý prvek s každým jiným. Počet prohození o stabilitě neříká nic a komparátor vracející nulu je právě ten případ, který stabilní řazení definuje, místo aby ho nechalo otevřený.',
        },
        'dsa-v1-d08-q2': {
          prompt: 'Kolik pomocné paměti — paměti použité nad rámec samotného vstupního pole — potřebují pro vstup o n prvcích selection sort, insertion sort a merge sort z této lekce?',
          options: [
            'Selection O(1), insertion O(1), merge O(n)',
            'Selection O(1), insertion O(n), merge O(n)',
            'Všechny tři O(1), protože porovnávací řazení jen přesouvá prvky',
            'Selection O(n), insertion O(n), merge O(n log n)',
          ],
          explanation:
            'Selection sort i insertion sort přeskládají pole na místě a drží si pevný počet indexů a jeden odložený prvek, takže jejich pomocná paměť je konstantní. Insertion sort posouvá prvky uvnitř téhož pole, místo aby stavěl druhé, což vylučuje druhou možnost. Merge sort zapisuje každé slití do nového pole, takže nad rámec vstupu drží O(n) prvků; to převáží O(log n) rámců rekurze, které si taky půjčuje, a proto je odpověď O(n), a ne O(n log n).',
        },
        'dsa-v1-d08-q3': {
          prompt: 'Proč zavolá `selectionSort` funkci `compare` úplně stejněkrát na seřazeném poli, na obráceném poli i na poli samých stejných hodnot?',
          options: [
            'Obě meze cyklů vycházejí z délky pole a žádný výsledek porovnání nemůže průchod ukončit dřív',
            'Porovná každou dvojici prvků jednou a počet dvojic závisí jen na délce',
            'Každé prohození spustí právě jedno porovnání a počet prohození je pevně n-1',
            'Nesetříděný zbytek je po každém průchodu už částečně uspořádaný, takže zbývající práce je konstantní',
          ],
          explanation:
            'Vnitřní cyklus běží od `start + 1` na konec bez ohledu na to, co komparátor říká; jeho výsledek jen aktualizuje `smallest`. Počet je proto (n-1) + (n-2) + … + 1 = n(n-1)/2 na každém vstupu. Druhá možnost dojde ke stejnému číslu mechanismem, který selection sort nepoužívá: porovnává každý zbývající prvek s průběžným minimem, nikdy jeden prvek s každým jiným, takže samotné to číslo není důvod, proč na vstupu nezáleží — jsou to pevné meze cyklů. Prohození se přeskakuje, když `smallest === start`, takže nejsou pevně n-1 a žádné porovnání nespouštějí. A zbytek částečně uspořádaný není; selection sort se o něm mezi průchody nic nedozví.',
        },
        'dsa-v1-d08-q4': {
          prompt: 'Merge sort běží na 8 prvcích. Který popis jeho nákladů je správný a proč?',
          options: [
            'Tři úrovně slévání, každá s O(n) práce napříč svými slitími, celkem tedy O(n log n)',
            'Osm úrovní slévání, jedna na prvek, každá s konstantní prací, celkem tedy O(n)',
            'Tři úrovně slévání, každá s O(log n) práce, celkem tedy O(log² n)',
            'Tři úrovně slévání, ale poslední slití převáží zbytek, celkem tedy O(n)',
          ],
          explanation:
            'Půlení osmičky na jedničku trvá tři půlení, takže jsou tři úrovně slévání a každá úroveň se napříč svými slitími dotkne všech 8 prvků jednou — 4 slití 1 + 1, pak 2 slití 2 + 2, pak 1 slití 4 + 4. Tři úrovně po n práce je 3n a pro obecné n je to n log n. Počet úrovní je log₂ n, ne n, což vylučuje možnost s osmi úrovněmi. Jedna úroveň stojí O(n), ne O(log n), protože každá úroveň přesune každý prvek. A úrovně se sčítají, místo aby je převážila ta poslední: závěrečné slití je O(n), ale stejně tak i obě pod ním.',
        },
      },
    },
    'dsa-v1-d08-selection-sort': {
      title: 'Selection sort, spočítaný',
      summary: 'Seřaď na místě opakovaným výběrem nejmenšího zbývajícího prvku a tref 28 porovnání, která osm prvků vyžaduje.',
      code: {
        prompt:
          'Napiš funkci `selectionSort(values, compare)`. Volající dodá `compare(a, b)`, která vrací záporné číslo, když `a` patří před `b`, nulu, když jsou obě hodnoty zaměnitelné, a kladné číslo, když `a` patří za `b`. Seřaď `values` na místě v pořadí, které `compare` popisuje, a vrať tentýž objekt pole, který jsi dostal.\n\nKaždé porovnání dvou prvků musí jít přes `compare` a hodnocení ta volání počítá. Selection sort udělá na osmi prvcích přesně 28 porovnání — 8 × 7 / 2 — ať prvky dorazily v jakémkoli pořadí, protože žádný výsledek porovnání nemůže průchod zkrátit. Vestavěné řazení, insertion sort nebo průchod, který skončí předčasně, dají jiné číslo a metodické kritérium neprojdou, i když hodnoty vyjdou ve správném pořadí.\n\nPrázdné pole a pole s jedním prvkem se vrátí beze změny a stojí nula porovnání. Duplicity a záporná čísla jsou běžný vstup.',
        contract: [
          'Dva prvky porovnávej jedině voláním `compare(a, b)`; hodnocení počítá každé volání.',
          'Řaď na místě a vrať tentýž objekt pole, ne seřazenou kopii.',
          'Na osmi prvcích musí být počet přesně 28, takže žádný průchod nesmí skončit dřív a práci nesmí udělat vestavěné řazení.',
          'Prázdné pole a pole s jedním prvkem se vrací beze změny s nulou porovnání.',
        ],
        hints: [
          'Dva cykly. Vnější prochází pozici, kterou zrovna plníš; vnitřní projde všechno napravo od ní a hledá prvek, který na ni patří.',
          'Drž si index nejmenšího prvku, který jsi viděl, ne jeho hodnotu. `compare(values[index], values[smallest]) < 0` znamená, že jsi našel nové minimum.',
          'Prohoď zápisem `[values[start], values[smallest]] = [values[smallest], values[start]]`. Přeskočení prohození, když se oba indexy rovnají, ušetří zápis, ne porovnání, takže počet zůstane na 28 tak jako tak.',
        ],
        approach: [
          'Veď pozici `start` od 0 až po předposlední index; poslední pozice je správně, jakmile je správně všechno před ní.',
          'Předpokládej, že prvek, který na pozici `start` už sedí, je ze zbytku nejmenší.',
          'Projdi všechny další indexy a volej `compare` proti aktuálnímu minimu; nový index si zapamatuj vždy, když komparátor vrátí záporné číslo.',
          'Prohoď nejmenší prvek na pozici `start`.',
          'Vrať tentýž objekt pole, který jsi dostal, teď už seřazený.',
        ],
        criteria: [
          {
            label: 'Správné pořadí, na místě, včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, jeden prvek, duplicity, záporné hodnoty a komparátor, který není `a - b`.',
          },
          {
            label: 'Přesně 28 porovnání na osmi prvcích',
            detail:
              'Selection sort projde v každém průchodu celý nesetříděný zbytek, což je na jakémkoli osmiprvkovém vstupu 8 × 7 / 2 = 28 volání `compare`. Jiné číslo znamená, že odpověď vyrobilo něco jiného: vestavěné řazení, insertion sort, nebo průchod, který skončil předčasně.',
          },
        ],
        testLabels: [
          '',
          'prázdné pole se seřadí samo na sebe',
          'jeden prvek nepotřebuje žádné porovnání',
          'záporné hodnoty a nula',
          'duplicity',
          'pole, které jsi dostal, je pole, které vracíš',
          'osm prvků stojí přesně dvacet osm porovnání',
        ],
      },
    },
    'dsa-v1-d08-insertion-sort': {
      title: 'Insertion sort, spočítaný',
      summary: 'Zvětšuj seřazenou předponu na místě a nech průchod ukončit komparátor: sedm porovnání na seřazeném vstupu, dvacet osm na obráceném.',
      code: {
        prompt:
          'Napiš funkci `insertionSort(values, compare)`. Volající dodá `compare(a, b)`, která vrací záporné číslo, když `a` patří před `b`, nulu, když jsou obě hodnoty zaměnitelné, a kladné číslo, když `a` patří za `b`. Seřaď `values` na místě v pořadí, které `compare` popisuje, a vrať tentýž objekt pole, který jsi dostal.\n\nKaždé porovnání dvou prvků musí jít přes `compare` a hodnocení ta volání počítá. Insertion sort dohromady určují dvě čísla: na už seřazeném poli o osmi prvcích musí udělat přesně 7 porovnání — n-1, jedno neúspěšné na průchod — a na obráceném poli o osmi prvcích přesně 28. Sedm v obou případech znamená předčasný konec, který nikdy nic neseřadil; 28 v obou znamená, že průchod porovnával dál i poté, co prvek dosedl.\n\nRovnocenné prvky musí zůstat v pořadí, ve kterém přišly. Prázdné pole a pole s jedním prvkem se vrátí beze změny a stojí nula porovnání. Duplicity a záporná čísla jsou běžný vstup.',
        contract: [
          'Dva prvky porovnávej jedině voláním `compare(a, b)`; hodnocení počítá každé volání.',
          'Řaď na místě a vrať tentýž objekt pole, ne seřazenou kopii.',
          'Zastav vnitřní posouvání u prvního prvku, který komparátor neoznačí za větší, a před porovnáním ověř, že je index pořád v rozsahu — už seřazené pole o osmi prvcích musí stát přesně 7 porovnání a obrácené přesně 28.',
          'Nech rovnocenné prvky v pořadí, ve kterém přišly: řazení musí být stabilní.',
          'Prázdné pole a pole s jedním prvkem se vrací beze změny s nulou porovnání.',
        ],
        hints: [
          'Když začíná průchod i, jsou pozice 0 až i-1 už seřazené. Vyzvedni `values[i]` nejdřív do proměnné, aby mělo posouvání kam zapisovat.',
          'Pořadí obou půlek podmínky ve while je důležité: `j >= 0 && compare(values[j], current) > 0`. Test indexu jako první zabrání tomu, aby se komparátor kdy ptal na `values[-1]`, což by přidalo porovnání, které se do počtu nevejde.',
          'Stabilní je řazení díky ostrému `> 0`. Zastaví se u prvního prvku, který není větší než `current`, takže přes prvek, který komparátor označí za rovnocenný, nikdy neprojde.',
        ],
        approach: [
          'Veď `i` od 1 na konec; všechno před `i` je už seřazené.',
          'Ulož `values[i]` do `current`, protože posouvání tu pozici za chvíli přepíše.',
          'Dokud je `j` pořád platný index a `compare(values[j], current)` je kladné, zkopíruj `values[j]` o místo doprava a posuň `j` doleva.',
          'Zapiš `current` do `values[j + 1]`, tedy do mezery, kterou posouvání nechalo.',
          'Vrať tentýž objekt pole, který jsi dostal, teď už seřazený.',
        ],
        criteria: [
          {
            label: 'Správné pořadí, na místě a stabilně, včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, jeden prvek, duplicity, záporné hodnoty, komparátor, který není `a - b`, a že si rovnocenné prvky drží původní pořadí.',
          },
          {
            label: 'Sedm porovnání na seřazeném vstupu, dvacet osm na obráceném',
            detail:
              'Insertion sort přestane posouvat u prvního prvku, který už je na svém místě, takže osm seřazených prvků stojí 7 porovnání a osm obrácených 28. Jakákoli jiná dvojice čísel znamená, že běžel jiný algoritmus, že vnitřní cyklus porovnával dál i po dosednutí prvku, nebo že kontrola indexu přišla až po porovnání.',
          },
        ],
        testLabels: [
          '',
          'prázdné pole se seřadí samo na sebe',
          'jeden prvek nepotřebuje žádné porovnání',
          'záporné hodnoty a nula',
          'duplicity',
          'osm seřazených prvků stojí sedm porovnání',
          'osm obrácených prvků stojí dvacet osm',
        ],
      },
    },
    'dsa-v1-d08-merge-sort': {
      title: 'Merge sort, stabilní a spočítaný',
      summary: 'Rozděl až na jednotlivé prvky, slij je zpátky do nového pole a nech rovnocenné prvky v pořadí, ve kterém přišly.',
      code: {
        prompt:
          'Napiš funkci `mergeSort(values, compare)`. Volající dodá `compare(a, b)`, která vrací záporné číslo, když `a` patří před `b`, nulu, když jsou obě hodnoty zaměnitelné, a kladné číslo, když `a` patří za `b`. Vrať **nové** pole s týmiž prvky v pořadí, které `compare` popisuje. Pole, které jsi dostal, musí ve chvíli návratu pořád držet své původní prvky v původním pořadí.\n\nKaždé porovnání dvou prvků musí jít přes `compare` a hodnocení ta volání počítá. Rozdělit osm prvků až na jednotlivé a slít je zpátky stojí mezi 12 a 24 porovnáními — nikdy víc než 8 × log₂ 8 = 24 — a na už seřazeném poli přesně 12, protože tam každé slévání vyčerpá levý úsek a zbytek pravého připojí bez porovnávání. Vestavěné řazení zavolané na kopii se do těch čísel nevejde.\n\nŘazení musí být stabilní: když komparátor ohlásí shodu, musí prvek, který byl ve vstupu dřív, být dřív i ve výstupu. Hodnocení to ověřuje seřazením záznamů s opakujícími se klíči a přečtením jejich značek.\n\nPrázdné pole a pole s jedním prvkem se vrací jako nová pole se stejným obsahem. Duplicity a záporná čísla jsou běžný vstup.',
        contract: [
          'Dva prvky porovnávej jedině voláním `compare(a, b)`; hodnocení počítá každé volání.',
          'Vrať nové pole. Vstupní pole musí být ve chvíli návratu nezměněné — stejná délka, stejné prvky, stejné pořadí.',
          'Rozděl na půlky, každou půlku seřaď rekurzí a slij. Na osmi prvcích to stojí mezi 12 a 24 porovnáními a na už seřazeném poli o osmi prvcích přesně 12.',
          'Jakmile se jeden úsek vyprázdní, připoj zbytek toho druhého bez porovnávání; ty prvky už jsou mezi sebou v pořadí.',
          'Ber při shodě z levého úseku, aby si rovnocenné prvky udržely pořadí, ve kterém přišly.',
          'Prázdné pole a pole s jedním prvkem se vrací jako nová pole se stejným obsahem.',
        ],
        hints: [
          'Pole o 0 nebo 1 prvku je už seřazené, takže vrať `values.slice()` a skonči. Všechno delší se dvěma dalšími voláními `slice` rozdělí uprostřed.',
          'Slévání prochází dvě seřazená pole, každé s vlastním indexem. V každém kroku zavolej `compare(left[i], right[j])` jednou a vlož vítěze; výsledek 0 nebo menší znamená, že jde první levý prvek, což drží řazení stabilní.',
          'Když jeden úsek dojde, připoj zbytek toho druhého bez porovnávání — ty prvky jsou mezi sebou už v pořadí, a právě ta volná připojení jsou důvod, proč seřazený vstup stojí jen 12 porovnání.',
        ],
        approach: [
          'Když má pole méně než dva prvky, vrať kopii; vrátit sám vstup by neprošlo požadavkem na nové pole.',
          'Rozděl pole uprostřed na levou a pravou půlku.',
          'Zavolej `mergeSort` na každou půlku, což ti vrátí dvě seřazená pole.',
          'Slij je: dokud mají obě prvky, porovnej jednou oba přední a přesuň ten menší, přičemž při shodě dáváš přednost levému.',
          'Připoj, co zbylo v úseku, který se nevyprázdnil, a vrať slité pole.',
        ],
        criteria: [
          {
            label: 'Správné pořadí v novém poli a nedotčený vstup',
            detail: 'Zkontroluj prázdné pole, jeden prvek, lichou délku, duplicity, záporné hodnoty, komparátor, který není `a - b`, a že vstupní pole vypadá pořád stejně.',
          },
          {
            label: 'Dvanáct až dvacet čtyři porovnání na osmi prvcích, dvanáct na seřazeném, a stabilně',
            detail:
              'Rozdělit osm prvků na jednotlivé a slít je zpátky stojí mezi 12 a 24 voláními `compare` a na už seřazeném poli přesně 12, kde každé slévání vyčerpá levý úsek a zbytek připojí zadarmo. Slévání musí navíc při shodě brát z levého úseku. Počet mimo tato čísla, nebo rovnocenné prvky vrácené v jiném pořadí, znamená, že odpověď vyrobilo něco jiného než merge sort.',
          },
        ],
        testLabels: [
          '',
          'prázdné pole se seřadí do nového prázdného pole',
          'jeden prvek nepotřebuje žádné porovnání',
          'záporné hodnoty, duplicity a lichá délka',
          'vrátí se nové pole a vstup zůstal, jak byl',
          'dvanáct až dvacet čtyři porovnání na osmi prvcích a přesně dvanáct, když dorazí seřazené',
          'záznamy se stejnými klíči si drží pořadí, ve kterém přišly',
        ],
      },
    },
  },
};
