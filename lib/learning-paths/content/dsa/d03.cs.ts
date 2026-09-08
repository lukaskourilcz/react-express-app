/** Czech copy for D03. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D03_CS: ModuleCs = {
  title: 'Hashovací mapy a množiny',
  outcomes: [
    'Nahradit vnořené procházení Mapou nebo Setem a určit třídu růstu obou verzí, s pojmenováním obou vstupů.',
    'Říct, co „očekávaně konstantní“ předpokládá a co s tím udělá nepřátelská série kolizí.',
    'Vybrat mezi Map, Set a polem podle přístupového vzoru, ne ze zvyku.',
  ],
  lessons: {
    'dsa-v1-d03-l1': {
      title: 'Co ti hashovací mapa koupí',
      summary: 'Hash klíče rovnou do přihrádky, paměť, která to platí, a čím se Map liší od obyčejného objektu.',
      sections: [
        {
          body:
            'Najít hodnotu v poli znamená dívat se na prvky, dokud jeden nesedí. Nic jiného k dispozici není: pozice o obsahu neříká nic, takže neúspěch stojí celý průchod. Hashovací tabulka mění otázku „kde to je?“ na „kde by to muselo být?“ — z klíče spočítá přihrádku a podívá se jen tam.',
        },
        {
          body:
            'Ten výpočet je hashovací funkce. Deterministicky převede klíč na index přihrádky: tentýž klíč skončí vždycky ve stejné přihrádce. Záznam se uloží tam a pozdější hledání klíč zahashuje znovu, jde rovnou do té přihrádky a porovná jen to, co v ní najde. Do výpočtu nikdy nevstoupil počet záznamů v tabulce, a proto s ním náklady nerostou.',
        },
        { caption: 'Ten obchod: jeden lineární průchod a paměť navíc dopředu, a pak hledání, kterému je velikost kolekce jedno.' },
        {
          body:
            'Hashovací funkce má dva úkoly. Musí být deterministická, jinak se uložený záznam stane nenajitelným. A musí klíče rozprostřít po přihrádkách, protože dva klíče ve stejné přihrádce se od sebe musí odlišit porovnáním — a porovnávání je ta část, která roste.',
        },
        {
          caption: 'Čtyři klíče zahashované do osmi přihrádek, včetně jedné kolize.',
          legend: ['0', '1', '2', '3', '4', '5', '6', '7'],
          notes: [
            'Osm prázdných přihrádek. Tabulka má místo pro víc záznamů, než kolik jich drží, a ta rezerva je záměrná.',
            'Hash klíče „ana“ je 3, takže se „ana“ zapíše do přihrádky 3. Žádné jiné přihrádky se to nedotklo.',
            'Hash klíče „bo“ je 6. Uložení stojí stejně jako uložení „ana“, i když už tabulka není prázdná.',
            '„cyril“ se zahashuje taky na 3. Přihrádka 3 teď drží dva záznamy, takže cokoli, co v ní skončí, musí porovnávat klíče.',
            'Hledání „cyril“ zahashuje jednou na přihrádku 3 a porovná v ní ty dva klíče. Přihrádka 6 ani pět prázdných přihrádek se nikdy nečetly.',
          ],
        },
        {
          body:
            'Rychlost se platí pamětí. Hashovací tabulka drží víc přihrádek než záznamů, aby kolize zůstaly vzácné, a když se záznamy přihrádkám dotáhnou, zvětší se a přehashuje. Map s n záznamy tedy zabírá víc než n míst. U pár tisíc položek si toho nevšimneš; u desítek milionů je ta rezerva to, co tě omezuje.',
        },
        {
          body:
            'JavaScript nabízí dva kontejnery s klíči a zaměnitelné nejsou. Obyčejný objekt byl úložištěm s klíči dřív, než `Map` existovala, a pro záznamy s řetězcovými klíči pořád stačí. `Map` přibyla kvůli případům, které objekt zvládá špatně.',
        },
        { caption: 'set, get, has a size — a pravidlo identity, kterým se řídí objektové klíče.' },
        {
          caption: 'V čem se Map a obyčejný objekt opravdu liší.',
          headers: ['Otázka', 'Map', 'Obyčejný objekt'],
          rows: [
            [
              'Jaké klíče jsou povolené?',
              'Jakákoli hodnota: řetězce, čísla, booleany, objekty, funkce, NaN',
              'Řetězce a symboly; každý jiný klíč se nejdřív převede na řetězec',
            ],
            [
              'V jakém pořadí záznamy vylezou?',
              'V pořadí vložení, u všech klíčů',
              'Nejdřív celočíselné klíče vzestupně, pak zbytek v pořadí vložení',
            ],
            ['Kolik je záznamů?', '`map.size`, přečte se přímo', '`Object.keys(obj).length`, což nejdřív postaví pole'],
            [
              'Může přijít klíč, který jsi nikdy nenastavil?',
              'Ne — Map drží jen to, co do ní dáš',
              '`toString` a další jména z prototypu odpoví na `in`, pokud objekt nepostavíš přes `Object.create(null)`',
            ],
            ['Jak se to prochází?', '`for…of` přes Map, nebo přes `keys`, `values`, `entries`', '`Object.entries(obj)`, což alokuje pole dvojic'],
          ],
        },
        {
          body:
            'Rovnost klíčů v Map se řídí pravidlem SameValueZero. Dva klíče se shodují, když jsou to tytéž hodnoty, se dvěma úpravami oproti `===`: `NaN` se shoduje s `NaN` a `0` se shoduje s `-0`. Takže `1` a `"1"` jsou dva různé klíče, `true` a `1` jsou dva různé klíče a Map umí spočítat výskyty `NaN` bez zvláštního ošetření.',
        },
        {
          body:
            'Obyčejný objekt převede každý klíč na řetězec, takže `obj[1]` a `obj["1"]` jsou jedno místo a `obj[{ id: 7 }]` se stane klíčem `"[object Object]"`. Map si nechá klíč, který jsi jí podal, což u objektů řeže na druhou stranu: dva strukturálně shodné objekty jsou dva různé klíče a `map.set({ id: 7 }, x).get({ id: 7 })` je `undefined`.',
        },
        {
          body:
            'Ta dohoda je úzká a stojí za jednu větu: utratíš paměť a vzdáš se přístupu podle pozice, a dostaneš `get`, `set`, `has` a `delete`, jejichž očekávané náklady nerostou s počtem záznamů. Další lekce je o tom, co slovo „očekávané“ vynechává.',
        },
      ],
    },
    'dsa-v1-d03-l2': {
      title: 'Množiny a poctivý příběh o nákladech',
      summary: 'Členství bez hodnot, proč Set porazí vnořené procházení a co udělá nepřátelská série kolizí s očekávaně konstantním časem.',
      sections: [
        {
          body:
            'Set je Map s odstraněnými hodnotami. Odpovídá na jedinou otázku — je tahle hodnota uvnitř? — a odpovídá na ni stejně, jako Map odpovídá na `has`: zahashuje hodnotu, jde do přihrádky a porovná, co tam je. Rovnost se zase řídí pravidlem SameValueZero, takže Set uloží `1` a `"1"` zvlášť a dvě `NaN` sloučí do jednoho záznamu.',
        },
        { caption: 'Celý povrch Setu: add, has, delete, size a procházení v pořadí vložení.' },
        {
          body:
            'Vzor, který Set nahrazuje, je vnořené procházení. Máš n věcí a seznam m věcí, proti kterým je kontroluješ, a přímočará verze se na ten m-prvkový seznam zeptá u každé z n věcí. To je nm porovnání a je to tiše kvadratické vždycky, když oba seznamy rostou spolu.',
        },
        { caption: 'Stejný výstup, jiný růst: jedno postavení Setu nahradí n průchodů seznamem zakázaných.' },
        {
          caption: 'Náklady na test členství a případ, který každé číslo popisuje.',
          headers: ['Operace', 'Náklady', 'O jaký případ jde'],
          rows: [
            ['`array.includes(value)`', 'O(n)', 'Neúspěch přečte každý prvek; nález blízko začátku se vrátí dřív'],
            ['`set.has(value)`', 'Očekávaně O(1)', 'Průměr přes klíče, které se rozprostřou; přihrádka plná kolizí degraduje k O(n)'],
            ['`map.get(key)`', 'Očekávaně O(1)', 'Stejný předpoklad jako u `set.has`, jen s hodnotou navíc'],
            ['`new Set(values)`', 'Očekávaně O(n)', 'n vložení, každé očekávaně konstantní'],
            ['Vnořené procházení n proti m', 'O(nm)', 'Každý prvek jednoho vstupu proti každému prvku druhého'],
            ['Postavit Set z m a projít n', 'Očekávaně O(n + m)', 'Jedno postavení m záznamů, pak n očekávaně konstantních testů'],
          ],
        },
        {
          body:
            'Slovo „očekávaně“ v těch řádcích odvádí skutečnou práci. Znamená náklady zprůměrované přes klíče za předpokladu, že je hash rozprostře po přihrádkách. Pro klíče, se kterými pracuje běžný program, ten předpoklad platí a průměr je malý pevný počet kroků. Není to tvrzení o každém jednotlivém hledání a není to záruka pro každou možnou sadu klíčů.',
        },
        {
          caption: 'Všechny klíče v jedné přihrádce: hledání jde po řetězu a počet porovnání roste se záznamy.',
          legend: ['1.', '2.', '3.', '4.', '5.'],
          notes: [
            'Pět klíčů, které se všechny zahashují do stejné přihrádky. Přihrádka je teď řetěz pěti záznamů a hash už nic nezužuje.',
            'Hledání „k5“ začne na začátku řetězu a porovná „k1“. Neshoda.',
            'Další na řadě je „k2“ a vypadává. Zatím dvě porovnání a v řetězu zbývají tři záznamy.',
            '„k3“ vypadává. Tři porovnání a přihrádka zatím nijak nepomohla.',
            '„k4“ vypadává. Čtyři porovnání na tabulku s pěti záznamy.',
            'Páté porovnání sedí. Když jsou všechny klíče v jedné přihrádce, náklady hledání rostou s počtem záznamů — a přesně tohle chování slovo „očekávaně“ vylučuje.',
          ],
          counterLabels: ['Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání', 'Porovnání'],
        },
        {
          body:
            'Specifikace ECMAScriptu žádá, aby Map byla implementovaná hashovací tabulkou nebo jiným mechanismem, který v průměru dává přístupové časy sublineární v počtu záznamů. Sublineární v průměru je volnější slib než konstantní a je to ten přesný. Nepiš do analýzy „Map.get je O(1)“, aniž bys řekl, o který případ jde.',
        },
        {
          body:
            'Ten rozdíl začne být důležitý, když klíče vybírá někdo jiný. Obsluha požadavků, která mapuje uživatelem dodané řetězce do tabulky, může dostat dávku klíčů, které kolidují, a průchod řetězem z ukázky výš je pak to, co server dělá při každém hledání. Enginy se proti tomu brání náhodným hashováním a pořád je to důvod, proč tvrdý limit na latenci chce strukturu se zárukou pro nejhorší případ, třeba vyvážený strom, a ne hashovací tabulku.',
        },
        {
          body:
            'Odstranění duplicit přes `new Set(values)` stojí jedno očekávaně konstantní vložení na hodnotu, takže je očekávaně lineární v čase a lineární v pomocné paměti: Set drží jeden záznam na každou odlišnou hodnotu plus rezervu tabulky. `[...new Set(values)]` k tomu navíc alokuje druhé pole. U tisíce hodnot je obojí levné a u deseti milionů se to vyplatí spočítat.',
        },
        {
          body:
            'Pole je pořád správná struktura častěji, než nadšení pro hashování napovídá. Nech si pole, když data čteš po pořadí a ne podle klíče, když indexuješ podle pozice, když duplicity jsou data a ne šum, když potřebuješ nejmenší nebo největší hodnotu nebo rozsah, nebo když je záznamů dvanáct a konstantní režie hashování je jediné, co bys přidal.',
        },
        {
          body:
            'Nic z toho neuzavírej stopkami. Měření na hodinkách vypovídá o tvém stroji, o optimalizátoru enginu a o všem ostatním, co zrovna běželo, a neumí odlišit velký konstantní násobek od jiné třídy růstu. Počítej operace — porovnání, čtení, vložení — a uvažuj o tom, jak ten počet roste.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d03-l1-read': {
      title: 'Čtení: co ti hashovací mapa koupí',
      summary: 'Hash klíče do přihrádky, paměť, která to platí, a kde se Map a obyčejný objekt rozcházejí.',
    },
    'dsa-v1-d03-l2-read': {
      title: 'Čtení: množiny a poctivý příběh o nákladech',
      summary: 'Členství přes Set, O(n + m) proti O(nm) a co udělá série kolizí s očekávaně konstantním časem.',
    },
    'dsa-v1-d03-checks': {
      title: 'Kontrola Map a Set',
      summary: 'Čtyři otázky: co tvrdí očekávaně konstantní čas, vnořené procházení proti Setu, jak dopadnou duplicity a kdy pořád vyhraje pole.',
      questions: {
        'dsa-v1-d03-q1': {
          prompt: '`seen` je `Map` s milionem záznamů. Který popis `seen.get(key)` je přesný?',
          options: [
            'Očekávaně konstantní: u klíčů, které se rozprostřou po přihrádkách, náklady nerostou s počtem záznamů, ale série kolizí posune jednotlivé hledání k lineárnímu.',
            'Zaručeně konstantní: specifikace vyžaduje stejný počet kroků bez ohledu na to, co Map drží.',
            'Logaritmický: Map drží klíče seřazené, takže `get` v každém kroku půlí prohledávaný rozsah.',
            'Lineární: `get` prochází záznamy v pořadí vložení, dokud klíč nesedí.',
          ],
          explanation:
            'Specifikace žádá přístupové časy, které jsou v průměru sublineární, ne konstantní v každém případě, takže záruka z druhé možnosti neexistuje. Map prochází v pořadí vložení, ale klíče nikdy neřadí, takže není co půlit. A neprochází je jeden po druhém: hash pošle hledání do jedné přihrádky, a proto je běžný případ malý pevný počet porovnání, ne průchod.',
        },
        'dsa-v1-d03-q2': {
          prompt: '`tags` má n položek a `banned` má m položek, přičemž délky spolu nesouvisí. Jaká je nejtěsnější třída růstu funkce `flagged` a co změní, když `banned` nejdřív dáš do `Set`?',
          options: [
            'O(nm) takhle napsané; jedno postavení Setu z `banned` z toho udělá očekávaně O(n + m).',
            'O(n + m) takhle napsané; Set nezmění nic, protože `includes` už teď končí u první shody.',
            'O(n²) takhle napsané; Set z toho udělá očekávaně O(n).',
            'O(nm) takhle napsané; Set z toho udělá očekávaně O(n), protože postavení Setu nic nestojí.',
          ],
          explanation:
            '`includes` prochází `banned`, takže tělo stojí až m pro každý z n tagů: nm. Předčasné ukončení při shodě třídu nemění, protože neúspěch stejně přečte všech m. Označit to za O(n²) předpokládá, že oba vstupy rostou spolu, a zakryje, který seznam zmenšit. A Set se musí postavit, což `banned` jednou přečte, takže m nikam nezmizí — jen se přesune z opakovaného násobku na jednorázový člen.',
        },
        'dsa-v1-d03-q3': {
          prompt: 'Co bude po doběhnutí tohoto kódu v `seen.size` a `counts.get("a")`?',
          options: ['4 a 3', '7 a 3', '4 a 1', '4 a 7'],
          explanation:
            'Set drží jeden záznam na každou odlišnou hodnotu, takže se sedm hodnot smrskne na čtyři odlišné: „a“, „b“, „c“, „d“. `counts.set` přepíše to, co klíč držel, ale řádek si starý počet nejdřív přečte přes `get` a teprve pak přičte jedničku, takže „a“ skončí na 3, ne na 1. Počítadlo je na klíč, ne běžný součet všeho viděného, takže 7 je délka vstupu, ne žádný záznam v Map.',
        },
        'dsa-v1-d03-q4': {
          prompt: 'Komponenta drží dvanáct položek konfigurace, při každém renderu je všechny projde v pevném pořadí a nikdy žádnou nehledá podle klíče. Která struktura sedí a proč?',
          options: [
            'Pole: přístup je průchod v pořadí, takže hashování a přihrádky navíc při dvanácti položkách nic nepřinesou.',
            'Map: očekávaně konstantní hledání udělá každý přístup levnější, než by byl index do pole.',
            'Set: zahození duplicit je to, co dělá průchod v pořadí levným.',
            'Map: jen Map má definované pořadí procházení, takže pevné pořadí ji potřebuje.',
          ],
          explanation:
            'Hledání podle klíče se nikdy nekoná, takže operace, kterou Map optimalizuje, v té zátěži vůbec není; index do pole je už teď konstantní, takže očekávaně konstantní čas nemá co porazit. Set by tiše zahodil opakující se položky, což je změna dat, ne zrychlení. A pole má definované pořadí odjakživa — záruka u Map se cituje proti obyčejnému objektu, ne proti poli.',
        },
      },
    },
    'dsa-v1-d03-frequency-map': {
      title: 'Mapa četností',
      summary: 'Spočítej, kolikrát se každá hodnota objeví, s klíčem podle samotné hodnoty a v pořadí prvního výskytu.',
      code: {
        prompt:
          'Napiš funkci `countFrequencies(values)`, která vrátí `Map` z každé hodnoty v poli na to, kolikrát se objeví. `countFrequencies([\'a\', \'b\', \'a\'])` vrátí Map, která drží `\'a\' → 2` a `\'b\' → 1`.\n\nKlíče musí vyjít v pořadí prvního výskytu, což ti Map dá zadarmo, dokud každý klíč vložíš při jeho prvním potkání. Prázdné pole vrátí prázdnou Map, ne `null` a ne prázdný objekt. Hodnoty si drží svůj typ: `1` a `\'1\'` jsou dva různé klíče a `true` a `1` taky.\n\nJeden průchod polem stačí. Testy čtou výsledek přes `[...map.entries()]`, protože Map se nedá porovnat jako JSON.',
        contract: [
          'Vrať `Map`, nikdy obyčejný objekt a nikdy pole dvojic.',
          'Klíčuj každý záznam samotnou hodnotou, aby `1` a `\'1\'` zůstaly oddělené.',
          'Klíče se procházejí v pořadí prvního výskytu; prázdné pole vrátí prázdnou Map.',
        ],
        hints: [
          'Začni s `new Map()`. U každé hodnoty vrátí `counts.get(value)` poprvé `undefined`, takže to ber jako nulu, než přičteš jedničku.',
          'Map drží klíče v pořadí vložení, takže pořadí vyjde samo — pokud první `set` pro klíč proběhne, když ho poprvé potkáš, což jediný průchod zleva doprava zaručí.',
        ],
        approach: [
          'Vytvoř prázdnou Map na počty.',
          'Projdi pole jednou a postupně navazuj každou hodnotu.',
          'Přečti aktuální počet pro tu hodnotu a chybějící záznam ber jako nulu.',
          'Ulož pod stejný klíč počet o jedna větší.',
          'Vrať Map; prázdný vstup do cyklu vůbec nevstoupí a vrátí ji prázdnou.',
        ],
        criteria: [
          {
            label: 'Správný počet u každé odlišné hodnoty',
            detail: 'Zkontroluj prázdné pole, opakující se hodnotu a hodnoty s různým typem, které vypadají stejně.',
          },
          {
            label: 'Klíče v pořadí prvního výskytu',
            detail:
              'Klíče vyšly ve špatném pořadí. Dělá to počítání do obyčejného objektu s převodem na konci: klíče objektu, které vypadají jako celá čísla, se procházejí vzestupně bez ohledu na to, v jakém pořadí jsi je zapsal.',
          },
        ],
        testLabels: [
          '',
          'prázdné pole dá prázdnou Map',
          'návratová hodnota je Map',
          'klíče jdou podle prvního výskytu, ne podle velikosti čísla',
          'číslo 1 a řetězec \'1\' jsou samostatné klíče',
          'hodnota, která se jen opakuje',
        ],
      },
    },
    'dsa-v1-d03-first-unique': {
      title: 'První unikátní hodnota',
      summary: 'Najdi první hodnotu, která se objeví právě jednou, jedním počítacím průchodem a druhým, který drží pořadí.',
      code: {
        prompt:
          'Napiš funkci `firstUnique(values)`, která vrátí první hodnotu v poli, jež se objeví právě jednou. `firstUnique([\'a\', \'b\', \'a\', \'c\'])` vrátí `\'b\'`, protože `\'a\'` je tam dvakrát a `\'b\'` je nejdřívější hodnota, která ne. Když se opakuje všechno, vrať `null`; pro prázdné pole taky `null`.\n\nDva průchody jsou očekávaný tvar a jsou naprosto v pořádku: jeden na spočítání a druhý, který projde pole v pořadí a vrátí první hodnotu s počtem 1. Celkem je to O(n) času a O(n) pomocné paměti na ty počty.\n\nHodnoty si drží svůj typ, takže `0` a `\'0\'` jsou různé hodnoty a `false` a `0` taky.',
        contract: [
          'Vrať první vyhovující hodnotu v pořadí samotného pole, ne první klíč své počítací struktury.',
          'Když se žádná hodnota neobjeví právě jednou, vrať `null` — ne `undefined` a ne `-1`.',
          'Porovnávej hodnoty podle identity, aby `0` a `\'0\'` nikdy nesdílely počet.',
        ],
        hints: [
          'První průchod postaví stejnou Map z hodnoty na počet jako cvičení s četnostmi. Druhý průchod je to, co dělá odpověď *první*: projdi původní pole znovu a vrať první hodnotu, jejíž počet je 1.',
          'Vrátit první klíč Map s počtem 1 by tady náhodou fungovalo taky, protože Map drží pořadí vložení — ale průchod polem je verze, která zůstane správná, i kdyby se počítací struktura změnila.',
          'Dojít na konec druhého průchodu znamená, že se nic neobjevilo právě jednou, takže tam vrať `null` místo propadnutí na konec funkce.',
        ],
        approach: [
          'Postav Map z každé hodnoty na počet jejích výskytů.',
          'Projdi původní pole podruhé, v pořadí.',
          'Vrať první hodnotu, jejíž uložený počet je právě 1.',
          'Pokud druhý průchod skončí bez shody, vrať `null`.',
        ],
        testLabels: [
          '',
          'prázdné pole nemá unikátní hodnotu',
          'opakuje se všechno',
          'jediná unikátní hodnota je až poslední',
          'číslo 0 a řetězec \'0\' jsou různé hodnoty',
          'jediný prvek je unikátní',
        ],
      },
    },
    'dsa-v1-d03-set-intersection': {
      title: 'Průnik pomocí množiny',
      summary: 'Hodnoty, které mají obě pole společné, každá jednou a v pořadí, v jakém je zavedlo levé pole.',
      code: {
        prompt:
          'Napiš funkci `intersection(left, right)`, která vrátí pole hodnot vyskytujících se v obou vstupech. `intersection([1, 2, 3, 4], [3, 4, 5])` vrátí `[3, 4]`.\n\nKaždá společná hodnota je ve výstupu jednou, v pořadí, v jakém se poprvé objeví v `left`. Duplicity v kterémkoli vstupu nesmí výstup zdvojit: `intersection([2, 2, 3], [3, 2])` je `[2, 3]`. Když je kterýkoli vstup prázdný nebo když spolu nesdílejí nic, vrať `[]`.\n\nAni jeden vstup se nesmí změnit. Postav Set z `right` a testuj proti němu každý prvek `left`, což stojí očekávaně O(n + m) místo O(nm), které by utratilo vnořené procházení.',
        contract: [
          'Vrať nové pole; `left` i `right` nech přesně tak, jak byly.',
          'Každá společná hodnota je ve výstupu jednou, v pořadí prvního výskytu v `left`.',
          'Prázdný vstup nebo žádné společné hodnoty dají prázdné pole.',
        ],
        hints: [
          '`new Set(right)` ti dá test členství v očekávaně konstantním čase, takže cyklus přes `left` už `right` nikdy neprochází.',
          'Samotné členství nestačí: `left` může společnou hodnotu zopakovat. Drž si druhý Set hodnot, které jsi už vložil, a cokoli, co v něm je, přeskoč.',
          'Přidávání do čerstvého pole nechá oba vstupy netknuté. Řazení, `splice` ani filtrování na místě ne.',
        ],
        approach: [
          'Postav Set z `right`.',
          'Vytvoř prázdný Set na už přidané hodnoty a prázdné výstupní pole.',
          'Projdi `left` v pořadí.',
          'Vlož hodnotu, když ji Set z `right` drží a Set přidaných ne, a poznamenej si ji jako přidanou.',
          'Vrať výstupní pole.',
        ],
        criteria: [
          {
            label: 'Správné společné hodnoty a nezměněné vstupy',
            detail: 'Zkontroluj prázdné vstupy, žádný překryv, úplný překryv a to, že se ani jeden argument nevrátí změněný.',
          },
          {
            label: 'Každá hodnota jednou, v pořadí, v jakém ji zavede `left`',
            detail:
              'Opakující se hodnota vyšla dvakrát, nebo se pořadí řídilo podle `right` místo `left`. Členství v `right` je jen půlka testu; musíš si taky pamatovat, co jsi už vložil.',
          },
        ],
        testLabels: [
          '',
          'prázdná levá strana dá prázdné pole',
          'prázdná pravá strana dá prázdné pole',
          'nic společného',
          'duplicity v left jsou ve výstupu jednou, v pořadí prvního výskytu',
          'duplicity v right výstup nezdvojí',
          'pořadí jde podle left, ne podle right',
        ],
      },
    },
  },
};
