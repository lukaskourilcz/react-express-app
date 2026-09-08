/** Czech copy for D07. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * `dsa-v1-d07-binary-search` reuses the ordinary coding task
 * `js-binary-search`, whose own copy is already localized, so only its title
 * and summary belong here. */

import type { ModuleCs } from '../../types';

export const DSA_D07_CS: ModuleCs = {
  title: 'Lineární a binární vyhledávání',
  outcomes: [
    'Vybrat mezi lineárním průchodem a binárním vyhledáváním podle uspořádání dat a počtu hledání, která čekáš.',
    'Uvést předpoklad, na kterém binární vyhledávání stojí, invariant, který drží jeho cyklus, a co porušený předpoklad způsobí.',
    'Naprogramovat variantu dolní meze, která vrátí začátek série stejných hodnot, a určit její cenu.',
  ],
  lessons: {
    'dsa-v1-d07-l1': {
      title: 'Lineární vyhledávání a kdy je správnou odpovědí',
      summary: 'Hledání, které po datech nic nechce: co stojí, kde se zastaví a případy, na které nic levnějšího nefunguje.',
      sections: [
        {
          body:
            'Lineární vyhledávání projde kolekci od jednoho konce a zastaví se u prvního prvku, který sedí. Po datech nechce nic: žádné uspořádání, žádné indexy, žádnou přípravu. V tom je celé jeho kouzlo a proto se každé další hledání v této cestě poměřuje právě s ním.',
        },
        { caption: 'Celý algoritmus: přečti, porovnej, při shodě vrať index a -1, když průchod dojde na konec.' },
        {
          body:
            '`return` uvnitř cyklu odvádí skutečnou práci. Bez něj přečte průchod při každém volání všechny prvky, takže se ze šťastného zásahu na indexu 0 stane n čtení. S ním závisí cena na tom, kde cíl leží: jedno čtení, když je první, a n čtení, když je poslední nebo tam vůbec není.',
        },
        {
          body:
            'To jsou tři různé nákladové funkce téže funkce. Nejlepší případ je 1 čtení, nejhorší n čtení a cíl, který je přítomný na rovnoměrně náhodné pozici, vyjde v průměru zhruba na n/2. Všechny tři jsou jako horní odhad O(n); teprve nejhorší případ dělá z O(n) to nejtěsnější, co se dá říct.',
        },
        {
          caption: 'Průchod šesti neseřazenými hodnotami při hledání 7, s počítadlem přečtených prvků.',
          notes: [
            'Průchod začíná na indexu 0. Zatím nebyl přečtený žádný prvek.',
            'Index 0 drží 12, což není 7, takže průchod jde dál. Jedno čtení.',
            'Index 1 drží 5, což není 7. Dvě čtení.',
            'Index 2 drží 9, což není 7. Tři čtení.',
            'Index 3 drží 5, což taky není 7. Čtyři čtení.',
            'Index 4 drží 7, takže průchod vrátí 4 a index 5 už vůbec nepřečte. Pět čtení na šestiprvkové pole.',
          ],
          counterLabels: ['Čtení', 'Čtení', 'Čtení', 'Čtení', 'Čtení', 'Čtení'],
        },
        {
          body:
            'Nic v tom průchodu nezáviselo na tom, že hodnoty rostou. Přesuň sedmičku kamkoli a funkce ji pořád najde, za cenu, která se sice mění, ale nikdy se nerozbije. Binární vyhledávání by na stejném poli odpovědělo špatně, a přesně tenhle obchod rozebírá další lekce.',
        },
        {
          body:
            'Lineární průchod je správná odpověď častěji, než jeho pověst napovídá. Neseřazená data a jedno hledání před sebou: seřadit je stojí víc než ten průchod, kterému ses chtěl vyhnout. Hrstka prvků: rozhodují konstantní násobky a průchod vyhraje na plné čáře. Predikát místo testu na rovnost: „první objednávka nad 500 Kč“ nemá žádný seřazený klíč, na kterém by se dalo půlit, pokud sis ho sám nepostavil.',
        },
        { caption: 'Tentýž průchod s predikátem. Binární vyhledávání sem nemá jak vstoupit: pole není seřazené podle toho, co se testuje.' },
        {
          body:
            'Roli hraje i struktura. Jednosměrně zřetězený seznam nemá index, na kterém by se dalo půlit, takže i dostat se k prostřednímu uzlu už stojí průchod poloviny seznamu. Hledat v něm je lineární, ať uděláš cokoli, a proto D05 páruje levné vkládání na známé místo s drahým hledáním.',
        },
        {
          body:
            'Rekurzivní verze ve stylu „prohledej zbytek“ v sobě často skrývají kopii. `search(values.slice(1), target)` v každém kroku přečte a alokuje celý zbytek pole, takže se z lineární funkce stane kvadratická v čase a lineární v pomocné paměti. Místo krájení si předávej index.',
        },
        {
          caption: 'Tři způsoby, jak odpovědět na totéž hledání, a příprava, kterou každý z nich potřebuje předem.',
          headers: ['Přístup', 'Příprava', 'Cena jednoho hledání', 'Kde vyhraje'],
          rows: [
            ['Lineární průchod', 'Žádná', 'O(n) v nejhorším případě', 'Neseřazená data, málo hledání, malá pole, testy predikátem'],
            [
              'Jednou seřadit, pak hledat binárně',
              'Řazení za O(n log n)',
              'O(log n)',
              'Hodně hledání nad stabilními daty a dotazy na rozsah nebo nejbližší hodnotu',
            ],
            [
              'Postavit Set a testovat členství',
              'O(n) vložení',
              'Očekávaně O(1), ne záruka pro nejhorší případ',
              'Hodně hledání na rovnost, kde na pořadí nezáleží',
            ],
          ],
        },
        {
          body:
            '`indexOf` a `findIndex` jsou tenhle průchod, jen napsaný za tebe. Pořád přečtou až n prvků, takže sáhnout po nich nezmění třídu růstu okolního kódu. Cvičení níž chce, abys ten cyklus napsal, protože ho další lekce rozebírá na součástky.',
        },
      ],
    },
    'dsa-v1-d07-l2': {
      title: 'Binární vyhledávání: předpoklad, invariant, interval',
      summary: 'Co koupí seřazený vstup, jaké tvrzení cyklus udržuje, proč tě duplicity nechají uprostřed série a kdy se předchozí řazení zaplatí.',
      sections: [
        {
          body:
            'Binární vyhledávání mění požadavek za rychlost. Dej mu pole seřazené vzestupně podle klíče, který porovnáváš, a jedno porovnání vyřadí polovinu toho, co zbývá. Šestnáct prvků potřebuje nejvýš pět porovnání, milion nejvýš dvacet, a zdvojnásobení pole přidá jedno.',
        },
        {
          body:
            'Předpoklad se nekontroluje a kontrolovat ani nejde. Ověřit, že je pole seřazené, stojí celý průchod, což je přesně to lineární hledání, kterému ses vyhýbal. Podstrč binárnímu vyhledávání neseřazená data a vrátí špatnou odpověď potichu: žádná výjimka, žádné varování, jen -1 pro hodnotu, která v poli klidně leží.',
        },
        { caption: 'Uzavřená varianta: `low` a `high` ohraničují uzavřený interval a cyklus běží, dokud v něm je aspoň jeden prvek.' },
        {
          body:
            'Celou funkci dělá správnou jediná věta: pokud cíl v poli vůbec je, jeho index leží mezi `low` a `high` včetně. To tvrzení platí před první iterací, protože intervalem je celé pole. A každá větev ho udrží. `sorted[middle] < target` znamená, že všechno na `middle` a níž je moc malé, takže posun `low` na `middle + 1` zahodí indexy, na kterých cíl být nemůže. Zrcadlový případ posune `high` na `middle - 1`.',
        },
        {
          caption: 'Hledání 47 mezi šestnácti seřazenými hodnotami: čtyři čtení a každý vyřazený index zešedlý.',
          notes: [
            'low je 0 a high je 15, takže intervalem je celé pole. Pokud tam 47 je, leží její index uvnitř. Prostřední index je 7.',
            'Index 7 drží 31, což je pod 47, takže indexy 0 až 7 ji držet nemůžou. low se změní na 8 a novým prostředkem je index 11. Jedno čtení.',
            'Index 11 drží 53, což je nad 47, takže indexy 11 až 15 vypadávají. high se změní na 10 a novým prostředkem je index 9. Dvě čtení.',
            'Index 9 drží 42, což je pod 47, takže vypadává i index 9. low se změní na 10, high zůstává 10 a zbývá jediný prvek. Tři čtení.',
            'Index 10 drží 47, takže hledání vrátí 10 po čtyřech čteních. Průchod zleva by přečetl jedenáct prvků.',
          ],
          counterLabels: ['Čtení', 'Čtení', 'Čtení', 'Čtení', 'Čtení'],
        },
        {
          body:
            'Cyklus končí, když `low` přeskočí `high`, což znamená prázdný interval. Spoj to s invariantem a závěr vyjde sám: cíl v poli nikdy nebyl, takže funkce vrátí -1. Ukončení dostaneš zadarmo, protože každá iterace odebere prostřední prvek a jednu z polovin, takže se interval ostře zmenšuje.',
        },
        {
          body:
            'Klasická chyba s přetečením v `(low + high) / 2` patří jazykům s celými čísly pevné šířky, kde se velký součet přetočí. Čísla v JavaScriptu jsou doubly a zůstávají přesná hluboko za jakoukoli délkou pole, kterou engine dovolí, takže `Math.floor((low + high) / 2)` je tady bezpečné. V C nebo v Javě bys napsal `low + (high - low) / 2`.',
        },
        {
          body:
            'Počítání porovnání: každá iterace v nejhorším případě odebere polovinu zbylého intervalu, takže pole o n prvcích potřebuje nejvýš ⌊log₂ n⌋ + 1 porovnání. To je 5 pro šestnáct prvků a 20 pro milion, a třída je O(log n) v čase s O(1) pomocné paměti. Rekurzivní verze vrátí totéž a za to potěšení si půjčí O(log n) rámců zásobníku.',
        },
        {
          caption: 'Nejhorší počty čtení v jednotkovém nákladovém modelu z D01. Jsou to spočítané operace, nikdy naměřené milisekundy.',
          headers: ['Prvků', 'Lineární průchod, nejhorší případ', 'Binární vyhledávání, nejhorší případ'],
          rows: [
            ['16', '16', '5'],
            ['100', '100', '7'],
            ['1 000', '1 000', '10'],
            ['1 000 000', '1 000 000', '20'],
            ['1 000 000 000', '1 000 000 000', '30'],
          ],
        },
        {
          body:
            'Duplicity hledání nerozbijí, ale otupí jeho odpověď. Nad `[2, 4, 4, 4, 4, 7]` a cílem 4 se funkce podívá na index 2, najde shodu a vrátí ji. Série čtyřek přitom začíná na indexu 1 a index 2 je prostě místo, kam půlení náhodou dopadlo. Zeptej se jiného pole stejného tvaru a dostaneš jiný index uvnitř série.',
        },
        {
          body:
            'Oprava spočívá v tom, že se při shodě přestaneš vracet. Hledání dolní meze nikdy neskončí předčasně: když je prostřední prvek aspoň roven cíli, stáhne `high` na prostředek a pokračuje, takže se interval sesype na nejlevější index, jehož prvek není pod cílem. Jediná kontrola na konci ti řekne, jestli ten index drží cíl, nebo jestli pole takovou hodnotu prostě nemá. Ta varianta je třetí cvičení níž.',
        },
        {
          body:
            'Řazení musí použít stejné uspořádání, jaké hledání předpokládá. `[10, 9, 100].sort()` vrátí `[10, 100, 9]`, protože výchozí komparátor porovnává prvky jako řetězce. Čísla potřebují `sort((a, b) => a - b)` a objekty komparátor nad klíčem, podle kterého budeš později hledat.',
        },
        {
          body:
            'O tom, které hledání máš vlastně psát, rozhoduje předzpracování. Jedno hledání nad neseřazenými daty: řazení stojí O(n log n) a průchod, který jsi nahradil, stál O(n), takže jsi prodělal. k hledání: O(n log n + k log n) proti O(kn), a řazení se zaplatí, jakmile k přeroste zhruba log n. Data, která se mezi hledáními mění, vrátí řazení zpátky do cyklu, čímž ta úvaha většinou končí.',
        },
        {
          body:
            'Pro hledání na prostou rovnost bývá lepší Set nebo Map, s očekávaně konstantním časem na jedno hledání místo záruky pro nejhorší případ. Binární vyhledávání se vyplatí tam, kde je otázkou samo uspořádání: první záznam od daného data dál, nejbližší cena pod nabídkou, všechno mezi dvěma klíči. Na nic z toho hashovací tabulka neodpoví.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d07-l1-read': {
      title: 'Čtení: lineární vyhledávání a kdy je správnou odpovědí',
      summary: 'Nejlepší, průměrný a nejhorší počet čtení, předčasný návrat, hledání predikátem a kopie, která z průchodu udělá kvadratickou funkci.',
    },
    'dsa-v1-d07-l2-read': {
      title: 'Čtení: binární vyhledávání, předpoklad, invariant, interval',
      summary: 'Požadavek na seřazený vstup, invariant intervalu, duplicity uprostřed série a bod, kdy se předchozí řazení zaplatí.',
    },
    'dsa-v1-d07-checks': {
      title: 'Kontrola hledání',
      summary: 'Čtyři otázky: neseřazený vstup, invariant intervalu, kam tě dostanou duplicity a kdy se předchozí řazení zaplatí.',
      questions: {
        'dsa-v1-d07-q1': {
          prompt: 'Pole předané tomuhle hledání není seřazené. Co volání vrátí a proč?',
          options: [
            '-1, protože každé porovnání zahodí polovinu za předpokladu, že hodnoty rostou, a tady ten předpoklad vyhodí právě index, na kterém leží 3.',
            '1, protože cyklus zužuje interval, dokud nedojde k jedinému zbylému indexu, a na tom trojka sedí.',
            '-1, protože binární vyhledávání odmítne neseřazené pole dřív, než cokoli porovná.',
            'Chybu rozsahu, protože `low` přeteče za poslední index pole.',
          ],
          explanation:
            'Hledání přečte index 2 (hodnotu 5), usoudí, že 3 musí ležet vlevo, a nastaví `high` na 1. Pak přečte index 0 (hodnotu 8), usoudí, že 3 leží ještě dál vlevo, a nastaví `high` na -1. Cyklus skončí a odpověď je -1, přestože 3 leží na indexu 1. Vstup nic neodmítá: kontrola, že je pole seřazené, stojí celý průchod, takže ji žádná implementace nedělá. A `low` s `high` se pohybují jen dovnitř, takže indexace zůstává v rozsahu a žádná chyba nevznikne.',
        },
        'dsa-v1-d07-q2': {
          prompt: 'Iterativní binární vyhledávání si drží index `low` a `high`. Které tvrzení je ten invariant cyklu, který dělá funkci správnou?',
          options: [
            'Pokud je cíl v poli vůbec obsažen, jeho index leží mezi `low` a `high` včetně.',
            '`sorted[low]` je vždycky nejvýš cíl a `sorted[high]` je vždycky aspoň cíl.',
            'Počet prvků mezi `low` a `high` se v každé iteraci přesně půlí.',
            '`low` nikdy neklesá a `high` nikdy neroste, což samo o sobě zaručuje, že se cíl najde.',
          ],
          explanation:
            'Tvrzení o intervalu je to, co každá větev udržuje a co dává prázdnému intervalu význam „není tam“. Ohraničení přes `sorted[low]` a `sorted[high]` padne, jakmile cíl v poli chybí, a k ničemu potřeba není. Interval se nepůlí přesně: zaokrouhlení nechá jednu stranu o prvek větší a navíc se zahazuje i prostřední prvek, takže se zmenší aspoň zhruba na polovinu. Monotónní pohyb konců sice platí, ale o správnosti neříká nic, protože by ho splňovala i funkce, která posouvá konce na špatnou stranu.',
        },
        'dsa-v1-d07-q3': {
          prompt: 'Obyčejné binární vyhledávání běží nad vzestupným polem `[2, 4, 4, 4, 4, 7]` a hledá 4, přičemž vrátí prostřední index hned, jak sedí. Co vrátí?',
          options: [
            '2, a nad jiným polem stejného tvaru by mohlo vrátit kterýkoli index uvnitř série čtyřek.',
            '1, protože se hledání usadí na nejlevějším prvku série stejných hodnot.',
            '4, protože se hledání usadí na nejpravějším prvku série stejných hodnot.',
            '-1, protože binární vyhledávání potřebuje k dělení pole navzájem různé hodnoty.',
          ],
          explanation:
            'První prostřední index je ⌊(0 + 5) / 2⌋ = 2, ten prvek je čtyřka a funkce se rovnou vrátí. Algoritmus nedává přednost levému ani pravému konci série: index, na kterém přistane, závisí na délce pole a na tom, kde v něm série leží. Duplicity ani předpoklad neporušují, protože pole je pořád vzestupné. Spolehlivě dostat index 1 umí až varianta dolní meze, která se odmítá vracet předčasně a dál stahuje `high` na prostředek.',
        },
        'dsa-v1-d07-q4': {
          prompt: 'V seznamu 100 000 neseřazených záznamů se vyhledává podle klíče. Kdy se v jednotkovém nákladovém modelu vyplatí jednou seřadit za O(n log n) a pak hledat binárně místo lineárního průchodu pokaždé?',
          options: [
            'Jakmile se nasčítá dost hledání na to, aby ušetřené lineární průchody převážily jednorázové řazení; jedno jediné hledání ho nezaplatí nikdy.',
            'Vždycky, protože O(log n) na jedno hledání je menší třída než O(n) na jedno hledání.',
            'Nikdy, protože O(n log n) roste rychleji než O(n) průchod, který má řazení nahradit.',
            'Jen když záznamy přicházejí už skoro seřazené, protože jinak řazení převáží libovolný počet hledání.',
          ],
          explanation:
            'k hledání stojí po seřazení O(n log n + k log n) proti O(kn) bez něj, takže je řazení investice, kterou musí k splatit. Pro k = 1 stojí samotné řazení víc než jediný průchod, který ušetří. Třída na jedno hledání to nerozhodne, protože řazení se platí jednou a stojí mimo to porovnání. A „nikdy“ zaměňuje jednorázový náklad za náklad na jedno hledání: pevná platba O(n log n) se rozpustí do všech pozdějších hledání, ať byl vstup zpřeházený jakkoli.',
        },
      },
    },
    'dsa-v1-d07-linear-search': {
      title: 'Lineární vyhledávání',
      summary: 'První index shody v poli v libovolném pořadí, v rozpočtu jednoho čtení na prvek.',
      code: {
        prompt:
          'Napiš funkci `linearSearch(values, target)`, která vrátí index prvního prvku striktně rovného `target`, nebo -1, když nesedí nic. Pole může být v libovolném pořadí. `linearSearch([4, 9, 1, 9], 9)` dá 1 a prázdné pole dá -1.\n\nHodnocení počítá, kolikrát přečteš prvek podle indexu. Celý rozpočet je jeden průchod zleva: nejvýš jedno čtení na prvek, a shoda na indexu 0 smí stát jediné čtení, takže průchod, který pokračuje i po nalezení, rozpočet překročí.',
        contract: [
          'Přečti každý prvek nejvýš jednou — hodnocený rozpočet je jedno čtení na prvek.',
          'Vrať index, jakmile prvek sedí; průchod až na konec překročí rozpočet u brzké shody.',
          'Porovnávej striktně, takže `0` a `false` jsou různé hodnoty.',
          'Nech vstup tak, jak jsi ho dostal: žádné řazení, kopírování ani krájení.',
        ],
        hints: [
          'Obyčejný cyklus `for` přes indexy ti dá prvek i index, který máš vrátit. `for…of` ti podá jen hodnotu, takže bys pozici musel sledovat sám.',
          'Vrať se z cyklu ve chvíli, kdy prvek sedí. `return -1` patří až za cyklus, kde znamená, že průchod skončil bez nálezu.',
        ],
        approach: [
          'Projdi indexy od 0 po ten poslední.',
          'Přečti prvek na aktuálním indexu a porovnej ho s cílem striktní rovností.',
          'Při shodě ten index rovnou vrať.',
          'Za cyklem vrať -1, což je zároveň odpověď pro prázdné pole, protože do cyklu vůbec nevstoupí.',
        ],
        criteria: [
          {
            label: 'Správný první index včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, chybějící cíl, duplicity, kde se chce první index, a shodu na posledním indexu.',
          },
          {
            label: 'Jedno čtení na prvek a zastavení u první shody',
            detail: 'Počítadlo čtení překročilo rozpočet. Projeví se tu kopie vstupu, druhý průchod i hledání, které po shodě pokračuje dál.',
          },
        ],
        testLabels: [
          'duplicity dají první index',
          'v prázdném poli není co najít',
          'hodnota, která tam není',
          'řetězce se porovnávají stejně',
          'jediný prvek',
          'chybějící cíl přečte šest prvků nejvýš po jednom',
          'shoda na indexu 0 skončí po jednom čtení',
        ],
      },
    },
    'dsa-v1-d07-binary-search': {
      title: 'Binární vyhledávání: existující cvičení',
      summary:
        'Úloha `js-binary-search` z JavaScriptu v devSharku, otevřená tady zápisem do cesty místo obvyklé brány na 3. stupeň. Splnění zapíše doklad jen pro tento modul: žádné XP za programování a žádné odemčení stupňů.',
    },
    'dsa-v1-d07-first-occurrence': {
      title: 'První výskyt v sérii',
      summary: 'Varianta dolní meze: kde začíná série stejných hodnot, v rozpočtu čtení, na který lineární průchod nedosáhne.',
      code: {
        prompt:
          'Napiš funkci `firstOccurrence(sorted, target)`, která ve vzestupném poli s možnými duplicitami vrátí index prvního prvku rovného `target`, nebo -1, když tam cíl není. `firstOccurrence([1, 2, 2, 2, 3], 2)` dá 1, protože na indexu 1 začíná série dvojek. Prázdné pole dá -1.\n\nJe to varianta binárního vyhledávání zvaná dolní mez a hodnocení tě u té metody drží: na seřazeném poli o 64 prvcích smí funkce přečíst nejvýš 20 prvků. Lineární průchod přečte až 64. Najít libovolnou shodu a pak se vracet doleva po sérii přečte až o 32 víc než samotné hledání. Ani jedno se nevejde.',
        contract: [
          'Vstup je vzestupný a může obsahovat duplicity; na to pořadí se smíš spolehnout.',
          'Přečti nejvýš 20 prvků z pole o 64 prvcích — hodnocený rozpočet vylučuje lineární průchod i vracení se po sérii stejných hodnot.',
          'Vrať index, na kterém série stejných hodnot začíná, ne libovolný index uvnitř ní.',
          'Nech vstup tak, jak jsi ho dostal: žádné řazení, kopírování ani krájení.',
        ],
        hints: [
          'Použij polootevřený interval: `low` na 0, `high` na `sorted.length` a cyklus, dokud je `low` menší než `high`. Až cyklus skončí, je odpovědí k ověření `low`.',
          'Při shodě se z cyklu nevracej. Shoda znamená, že odpověď leží na prostředku nebo někde vlevo od něj, takže stáhni `high` na prostředek a půl dál.',
          'Po cyklu je `low` první index, jehož prvek není pod cílem. Než ho vrátíš, ověř, že je uvnitř pole a že se ten prvek cíli opravdu rovná.',
        ],
        approach: [
          'Nastav `low` na 0 a `high` na délku pole, takže živý interval jde od `low` až po `high`, ale bez něj.',
          'Dokud je `low` menší než `high`, vezmi prostřední index se zaokrouhlením dolů.',
          'Když je prostřední prvek pod cílem, posuň `low` na `middle + 1`; jinak stáhni `high` na `middle`, čímž shodný prostředek zůstane uvnitř intervalu.',
          'Zastav se, až bude interval prázdný. `low` teď ukazuje na první prvek, který není pod cílem.',
          'Vrať `low`, když je uvnitř pole a drží cíl, jinak vrať -1.',
        ],
        criteria: [
          {
            label: 'Správný první index včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, chybějící cíl, sérii začínající na indexu 0, sérii končící na posledním indexu a záporné hodnoty.',
          },
          {
            label: 'Nejvýš dvacet čtení na šedesáti čtyřech prvcích',
            detail:
              'Počítadlo čtení překročilo 20 na poli o 64 prvcích. Lineární průchod přečte až 64 a nalezení libovolné shody s následným vracením po sérii až o 32 víc; obojí spadá sem, i když je vrácený index správný.',
          },
        ],
        testLabels: [
          'série dvojek začíná na indexu 1',
          'hodnota, která tam není',
          'v prázdném poli není co najít',
          'sedí každý prvek, takže série začíná na 0',
          'shoda na posledním indexu',
          'šedesát čtyři prvků v osmi sériích: třicítky začínají na indexu 24',
          'šedesát čtyři prvků se přečte nejvýš dvacetkrát',
        ],
      },
    },
  },
};
