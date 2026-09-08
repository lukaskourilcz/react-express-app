/** Czech copy for D06. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D06_CS: ModuleCs = {
  title: 'Základy rekurze',
  outcomes: [
    'Napsat rekurzivní funkci jako dvě poloviny: základní případ, který odpoví rovnou, a rekurzivní případ, který každý přijímaný vstup posune blíž k němu.',
    'Říct, co za běhu udělá chybějící nebo nedosažitelný základní případ a proč je to selhání zásobníku, ne zaseknutí.',
    'Uvést zvlášť čas a zvlášť paměť zásobníku rekurze a přepsat ji na cyklus, který zásobník nepotřebuje.',
  ],
  lessons: {
    'dsa-v1-d06-l1': {
      title: 'Základní případ, rekurzivní případ a ukončení',
      summary: 'Dvě poloviny rekurzivní definice, co dělá základní případ dosažitelným a co udělá engine, když dosažitelný není.',
      sections: [
        {
          body:
            'Rekurzivní funkce odpoví na úlohu tím, že se zavolá na menší verzi téže úlohy. Fungují na tom dvě části. Základní případ odpoví na vstup rovnou, bez dalšího dotazu. Rekurzivní případ vstup zmenší a předá ho dál. Když jedna z nich chybí, funkce selže způsobem, který u cyklu nastat nemůže.',
        },
        { caption: 'Dvě poloviny každé rekurzivní funkce, vyznačené.' },
        {
          body:
            'Základní případ je nejmenší vstup, na který umíš odpovědět na místě. Při odpočítávání k nule je to 0. Při průchodu spojovým seznamem prázdný seznam. Při sčítání stromu prázdný podstrom. Vyber ho první, protože rekurzivní případ ho má jen dosáhnout, ne nahradit.',
        },
        { caption: 'Dva způsoby, jak přijít o ukončení: žádné místo k zastavení a místo k zastavení, které krok přeskočí.' },
        {
          body:
            '`sumToB(10)` projde v pořádku: 10, 8, 6, 4, 2, 0 a základní případ ho zachytí. `sumToB(7)` jde 7, 5, 3, 1, -1, -3 a nule se nikdy nerovná. Napsat základní případ není totéž jako dosáhnout ho, a ukončení je tvrzení o každém vstupu, který funkce přijímá, ne o tom jednom, který jsi vyzkoušel.',
        },
        {
          body:
            'Ani jedna z rozbitých verzí se tiše nezasekne. Každé rozpracované volání zabere rámec na zásobníku volání, rámce se hromadí a engine to vzdá: V8 vyhodí RangeError s textem „Maximum call stack size exceeded“, SpiderMonkey hlásí „too much recursion“. V jaké hloubce se to stane, je detail enginu, ne záruka jazyka, takže je to příznak k rozpoznání, ne mez, na kterou se dá programovat.',
        },
        {
          caption: 'Čtyři rekurzivní tvary a jak každý z nich skončí.',
          headers: ['Tvar', 'Co kód dělá', 'Jak to skončí'],
          rows: [
            ['Žádný základní případ', 'Každé volání udělá další volání', 'Rámce se hromadí, dokud engine nevyhodí RangeError'],
            [
              'Základní případ, který krok přeskočí',
              'Odečítání 2 od lichého n nikdy nepadne na 0',
              'Tentýž RangeError, a jen pro ty vstupy, které minou',
            ],
            [
              'Rekurzivní případ, který nezmenšuje',
              'Volání předá dál vstup, který dostalo, beze změny',
              'První volání se nikdy nevrátí; na argumentu se nic nemění',
            ],
            [
              'Dosažitelný základní případ',
              'Odečítání 1 od libovolného celého n od 0 výš dojde na 0',
              'Nejhlubší volání se vrátí první a odpověď putuje nahoru',
            ],
          ],
        },
        {
          body:
            'Abys doložil, že se rekurze ukončí, pojmenuj veličinu, která při každém volání klesne a klesat donekonečna nemůže. U `sumTo` je to samotné n, které padá po jedné a zachytí se na 0. U seznamu je to počet zbývajících uzlů. Když tu veličinu pojmenovat neumíš, důkaz ukončení zatím nemáš.',
        },
        { caption: 'Tytéž dvě poloviny nad spojovým seznamem: prázdný seznam odpoví rovnou a `head.next` je vždy o uzel kratší.' },
        {
          body:
            '`head.next` je seznam bez prvního uzlu, takže počet uzlů klesá při každém volání přesně o jedna a nemůže se zaseknout. Seznam o n uzlech tedy udělá n volání, která drží uzel, plus jedno poslední volání, které dostane `null` a vrátí 0: celkem n + 1 volání, a právě ten počet oceňuje další lekce.',
        },
        {
          body:
            'Jeden základní případ stačí. Zastavit se dřív pomocí `if (head.next === null) return head.value;` dá taky správný součet, ale píše sčítání dvakrát, přidává druhé místo, kde se dá prázdný seznam splést, a končí o volání dřív, než říká definice. Nech prázdný seznam jediným místem zastavení.',
        },
        {
          body:
            'Když píšeš rekurzivní případ, předpokládej, že volání na menším vstupu už vrací správnou odpověď, a rozhoduj jen o tom, jak ji spojit s tím, co držíš v ruce. Právě ten předpoklad dělá rekurzivní kód krátký. Základní případ je to, co ho dělá pravdivým.',
        },
      ],
    },
    'dsa-v1-d06-l2': {
      title: 'Co rekurze stojí',
      summary: 'Čas z počtu volání, paměť z nejhlubšího místa zásobníku a cyklus, který dělá totéž bez něj.',
      sections: [
        {
          body:
            'Rekurze má dvě ceny a každá se čte z jiného počtu. Čas vychází z počtu volání vynásobeného prací uvnitř jednoho volání. Paměť vychází z toho, kolik volání je otevřených v nejhlubším místě. Cyklus obvykle srazí to druhé číslo na konstantu a to první nechá být, což je celý důvod, proč se ten přepis vyplatí umět.',
        },
        { caption: 'Jeden uzel na volání a pevné množství práce uvnitř každého: n + 1 volání pro n uzlů.' },
        {
          body:
            'Nejdřív čas. Volání, které drží uzel, porovná `head` s `null`, přečte `head.value` a udělá jedno sčítání a jedno volání; poslední volání jen porovná a skončí. V jednotkovém nákladovém modelu, který tato cesta používá, je to pevný počet kroků bez ohledu na to, co seznam drží. Vynásob to n + 1 voláními a doba běhu je O(n), tedy tatáž třída jako u cyklu přes tytéž uzly.',
        },
        {
          body:
            'Liší se ta druhá polovina. Volání, které čeká na jiné volání, se nedá zahodit: jeho rámec pořád drží parametr, lokální proměnné a místo, kde se má pokračovat. Rámce se cestou dolů hromadí a cestou zpátky odpadají, takže účet za paměť určuje nejhlubší místo. U této funkce je to n + 1 rámců, tedy O(n) pomocné paměti, přestože tělo funkce nealokuje nic viditelného.',
        },
        {
          caption: 'Součet 3 → 1 → 4. Buňky jdou zdola nahoru, takže nejpravější buňka je právě běžící volání.',
          notes: [
            'První volání dostane celý seznam. Jeho hlava drží 3, takže se nemůže vrátit, dokud nezná součet všeho, co je za ní.',
            'Zavolá samo sebe na `head.next`. První rámec zůstává otevřený s nedokončeným sčítáním a druhý rámec začíná na kratším seznamu.',
            'Třetí volání si bere poslední uzel. Otevřené jsou teď tři rámce a ani jeden z nich zatím nevyrobil číslo.',
            'Čtvrté volání dostane `null`. To je základní případ: vrátí rovnou 0 a další volání už neudělá, takže hlouběji zásobník nesahá.',
            'Rámec základního případu je pryč. `sumList(4)` čekal na tu nulu, přičte vlastní 4 a vrátí 4.',
            '`sumList(1→4)` měl nedokončenou čtyřku. Přičte vlastní 1 a vrátí 5 rámci pod sebou.',
            'První rámec přičte svou 3 k pětce, kterou dostal, a vrátí 8, tedy odpověď, na kterou se volající ptal.',
            'Zásobník je zase prázdný. Tři uzly stály čtyři volání a v nejhlubším místě byly otevřené čtyři rámce najednou: lineární čas a lineární paměť zásobníku.',
          ],
          counterLabels: [
            'Otevřených rámců',
            'Otevřených rámců',
            'Otevřených rámců',
            'Otevřených rámců',
            'Otevřených rámců',
            'Otevřených rámců',
            'Otevřených rámců',
            'Otevřených rámců',
          ],
        },
        {
          body:
            'První polovina té ukázky je sestup, druhá je návrat. Nic se nevrací dřív. Každý rámec dokončí své odložené sčítání teprve poté, co mu rámec nad ním vrátí číslo, a proto se odpověď skládá v opačném pořadí, než se volání dělala.',
        },
        { caption: 'Tentýž průchod v jediném rámci: součet a jedna putující reference, ať je seznam jakkoli dlouhý.' },
        {
          caption: 'Tentýž součet, napsaný dvěma způsoby.',
          headers: ['Otázka', 'Rekurzivně', 'Cyklem'],
          rows: [
            ['Čas', 'O(n): n + 1 volání, v každém konstantní práce', 'O(n): jeden průchod, konstantní práce na uzel'],
            ['Pomocná paměť', 'O(n): jeden otevřený rámec na každý čekající uzel', 'O(1): součet a jedna reference'],
            ['Kde je stav', 'V rámcích, které za tebe drží engine', 'Ve dvou proměnných, které jsi deklaroval'],
            ['Co omezuje vstup', 'Zásobník enginu, dřív než dojdou data', 'Data, a nic jiného'],
          ],
        },
        {
          body:
            'Mez zásobníku je reálná a není to číslo, na které se dá programovat. Závisí na enginu, na velikosti jednoho rámce a na tom, co už na zásobníku leželo, když se funkce rozběhla, takže tatáž rekurze může na jednom běhovém prostředí projít a na druhém spadnout. Riziko začíná u hloubek v řádu tisíců. Správná koncová volání jsou ve specifikaci jazyka, ale většina enginů je nikdy nedodala, takže napsat volání do koncové pozice rámec spolehlivě neušetří.',
        },
        {
          body:
            'Faktoriál je typický případ, kde se ty dvě ceny pletou. Cyklus proběhne pro n od 2 výš n - 1 krát a rekurze udělá n + 1 volání, takže v jednotkovém nákladovém modelu je doba běhu tak jako tak lineární v n. Hodnota, kterou funkce vrací, roste faktoriálově. Jak rychle roste odpověď a jak rychle roste práce jsou dvě různé otázky a tady jsou ty odpovědi na hony daleko od sebe.',
        },
        { caption: 'Devatenáct násobení vyrobí 20!, což je 2432902008176640000. Počet kroků je lineární; faktoriálově roste jen výsledek.' },
        {
          body:
            'V tom tvrzení nese váhu jednotkový nákladový model. Každé násobení se počítá jako jeden krok, protože `Number` je double s pevnou šířkou. 18! je 6402373705728000, poslední faktoriál pod `Number.MAX_SAFE_INTEGER` (9007199254740991); 19! a 20! jsou za touhle hranicí a pořád vycházejí přesně, kdežto 23! se vrátí špatně. Počítej místo toho s celými čísly s libovolnou přesností a samotná násobení začnou růst s počtem číslic, takže lineární počet kroků přestane být celý příběh.',
        },
        {
          body:
            'Vybírej podle hloubky, ne podle chuti. Rekurze sedí na data, která jsou sama rekurzivní a vůči své velikosti mělká: vyvážený strom o milionu uzlů má hloubku kolem dvaceti rámců, což žádnému zásobníku nevadí. Cyklus sedí na práci, jejíž hloubka by kopírovala délku vstupu, což je každý průchod seznamem v této cestě. Převést rekurzi nad seznamem na cyklus stojí dvě proměnné a vrátí ti celý zásobník.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d06-l1-read': {
      title: 'Čtení: základní případ, rekurzivní případ a ukončení',
      summary: 'Dvě poloviny rekurzivní definice, nedosažitelné základní případy a RangeError, který je ukončí.',
    },
    'dsa-v1-d06-l2-read': {
      title: 'Čtení: co rekurze stojí',
      summary: 'Volání proti rámcům, ukázka sestupu a návratu zásobníku a cyklus, který nepotřebuje ani jedno.',
    },
    'dsa-v1-d06-checks': {
      title: 'Kontrola rekurze',
      summary: 'Čtyři otázky: nedosažitelný základní případ, hloubka půlící rekurze, čas proti paměti zásobníku a růst faktoriálu proti jeho ceně.',
      questions: {
        'dsa-v1-d06-q1': {
          prompt: '`countDown(10)` vrátí řetězec `\'done\'`. Co udělá `countDown(7)` a proč?',
          options: [
            'Základního případu nikdy nedosáhne: z lichého n jdou hodnoty 7, 5, 3, 1, -1, -3 a nulu úplně minou, takže se volání dělají dál, dokud engine nevyhodí RangeError.',
            'Vrátí `\'done\'`. Rekurze se zastaví na první hodnotě, která už není kladná, a ta se vezme jako základní případ.',
            'Vrátí `undefined`. Jakmile n klesne pod 0, nezbývá žádná větev, takže nejvnitřnější volání propadne koncem funkce a vrátí `undefined`.',
            'Skončí se špatnou hodnotou: základní případ je nedosažitelný, takže poslední volání vrátí aktuální n místo řetězce.',
          ],
          explanation:
            'Odečítání 2 zachovává paritu n, takže z lichého začátku hodnoty projdou jedničkou, pak -1, a nule se nikdy nerovnají. Základní případ existuje a přesto je z poloviny přijímaných vstupů nedosažitelný. Druhá možnost si vymýšlí pravidlo zastavení, které v kódu není: vrací se jen při `n === 0` a -1 nula není. Třetí popisuje, co by se stalo, kdyby rekurze skončila, jenže ji nic neukončuje, takže žádné volání koncem funkce nepropadne. Čtvrtá předpokládá, že se nejhlubší volání vrátí; žádné nejhlubší volání ale není, jen rámce, které se hromadí, dokud engine další odmítne.',
        },
        'dsa-v1-d06-q2': {
          prompt: 'Zavoláš `halvings(1000)`. Kolik nejvíc rámců funkce `halvings` je otevřených naráz a jaká je nejtěsnější třída růstu té hloubky s rostoucím n?',
          options: [
            '10 rámců v nejhlubším místě a hloubka roste jako O(log n).',
            '1000 rámců v nejhlubším místě a hloubka roste jako O(n), protože se rámec otevře pro každou hodnotu mezi 1000 a 1.',
            '1 rámec, protože každé volání skončí a vrátí se dřív, než se udělá další, takže zásobník nikdy nedrží víc než jeden.',
            '10 rámců v nejhlubším místě, ale hloubka roste jako O(n), protože počet rámců na n pořád závisí.',
          ],
          explanation:
            'Argumenty jdou 1000, 500, 250, 125, 62, 31, 15, 7, 3, 1, což je deset volání, a to desáté narazí na základní případ, zatímco zbylých devět pořád čeká. Hloubka kopíruje počet půlení, takže je O(log n): tisíckrát větší vstup přidá zhruba deset rámců. Druhá možnost počítá všechna celá čísla v rozsahu místo hodnot, které se opravdu předávají. Třetí popisuje cyklus: volání se dělá uvnitř vraceného výrazu, takže volající je pořád otevřený, když volaný začíná. Čtvrtá plete „závisí na n“ s „roste jako n“, a přesně kvůli tomu rozdílu třídy růstu existují.',
        },
        'dsa-v1-d06-q3': {
          prompt: 'Obě funkce sečtou spojový seznam o n uzlech a vrátí totéž číslo. Jaké je nejtěsnější srovnání jejich času a jejich pomocné paměti?',
          options: [
            'Obě běží v O(n). A potřebuje O(n) paměti zásobníku, protože v nejhlubším místě je otevřených n + 1 rámců; B potřebuje O(1).',
            'Obě běží v O(n) a obě potřebují O(1) pomocné paměti, protože ani jedna nestaví pole ani nekopíruje seznam.',
            'A běží v O(n²), protože každé volání znovu projde zbytek seznamu; B běží v O(n).',
            'Obě běží v O(n) a obě potřebují O(n) pomocné paměti, protože i cyklus si musí držet každý navštívený uzel.',
          ],
          explanation:
            'Každá funkce sáhne na každý uzel jednou a udělá u něj pevné množství práce, takže obě jsou lineární v čase. A drží otevřený rámec za každé volání, které čeká na to, jež samo udělalo, a v nejhlubším místě je jich n + 1, takže její pomocná paměť je lineární. B si drží součet a jednu referenci. Druhá možnost je obvyklá past: zásobník je paměť, kterou funkce spotřebuje, i když tělo nealokuje nic. Třetí špatně čte rekurzivní volání, které postoupí o uzel, místo aby zbytek prohledávalo znovu. Čtvrtá si vymýšlí úložiště, které cyklus nemá: `node` se přepisuje a uzel, ze kterého se posunul, si cyklus nedrží.',
        },
        'dsa-v1-d06-q4': {
          prompt: 'V jednotkovém nákladovém modelu této cesty, kde se jedno násobení počítá jako jeden krok, jaká je nejtěsnější třída růstu doby běhu `factorial(n)` pro celé n od 0 do 20?',
          options: [
            'O(n): cyklus udělá n - 1 násobení. Vracená hodnota roste faktoriálově, což popisuje odpověď, ne počet kroků.',
            'O(n!): doba běhu kopíruje hodnotu, která se počítá, takže práce a výsledek rostou spolu.',
            'O(1): tělo cyklu je jediné násobení a jedna operace je konstantní práce.',
            'O(2ⁿ): součin se od i = 2 dál v každém kroku aspoň zdvojnásobí, takže se s ním zdvojnásobí i práce.',
          ],
          explanation:
            'Cyklus proběhne jednou pro každou hodnotu od 2 do n, což je pro n od 2 výš n - 1 násobení a pro 0 a 1 žádné, každé jeden krok v uvedeném modelu. To je lineární. Velikost výsledku neříká nic o tom, kolik kroků ho vyrobilo, což vylučuje druhou možnost: 20! je devatenáctimístné číslo, ke kterému se dojde devatenácti násobeními. Třetí možnost oceňuje tělo cyklu místo cyklu. Čtvrtá plete růst součinu s růstem práce: součin se zvětšuje víc než dvakrát a počet kroků se přesto zvedne přesně o jedna.',
        },
      },
    },
    'dsa-v1-d06-recursive-list-sum': {
      title: 'Rekurzivní součet seznamu',
      summary: 'Sečti spojový seznam s prázdným seznamem jako jediným základním případem a dolož ten tvar spočítaným rozpočtem volání.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, next }`. `next` drží uzel za ním, `next` posledního uzlu je `null` a seznam je jeho hlavní uzel, nebo `null`, když je prázdný.\n\nNapiš funkci `sumList(head)`, která vrátí součet všech hodnot v seznamu. `sumList(null)` je 0, seznam s jedním uzlem dá hodnotu toho uzlu a záporná čísla i nuly se počítají jako každé jiné číslo. Seznam nech tak, jak jsi ho našel: žádný uzel se nemění a žádný nepřibývá ani nemizí.\n\nUdělej to rekurzivně a s prázdným seznamem jako jediným základním případem. Hodnocení nahradí vazbu `sumList` obalem, který počítá každé volání včetně těch, která funkce udělá sama na sebe, a čeká jedno volání na uzel plus jedno poslední volání, které dostane `null`: čtyři uzly znamenají pět volání. Cyklus udělá jedno volání a tuhle kontrolu neprojde; druhý základní případ pro poslední uzel udělá o jedno volání míň a neprojde ji taky.',
        contract: [
          'Rekurzi veď přes samotnou `sumList`. Vnořená pomocná funkce, která seznam prochází, se nepočítá, protože obal vidí jen volání `sumList`.',
          'Použij přesně jeden základní případ: `head === null` vrátí 0. Hodnocený počet je počet uzlů plus jedna.',
          'Deklaruj `sumList` klíčovým slovem `function`, jak to dělá kostra. Hodnocení tu vazbu před spuštěním testů nahradí a vazbu `const` nahradit nelze, takže by kontrola rekurze nenapočítala žádné volání.',
          'Seznam neupravuj a hodnoty si nejdřív nesbírej do pole.',
        ],
        hints: [
          'Prázdný seznam je základní případ a jeho součet je 0. Každý jiný seznam je jedna hodnota plus kratší seznam, a `head.next` je přesně ten kratší seznam.',
          'Předpokládej, že rekurzivní volání už vrací správný součet všeho za `head`. Pak zbývá rozhodnout jen to, co k němu přičíst.',
          'Odolej druhému základnímu případu pro poslední uzel. `head.next` posledního uzlu je `null`, což větev pro prázdný seznam už řeší, a ta větev navíc tě stojí volání, které hodnocení počítá.',
        ],
        approach: [
          'Vrať 0, když je `head` rovno `null`: prázdný seznam nemá co sčítat.',
          'Jinak přečti `head.value` z uzlu, který držíš.',
          'Zavolej `sumList` na `head.next`, což je tentýž seznam bez prvního uzlu.',
          'Vrať `head.value` plus to, co ti volání vrátilo.',
          'Zkontroluj počet: n uzlů dá n volání, která drží uzel, a jedno poslední volání, které drží `null`.',
        ],
        criteria: [
          {
            label: 'Správný součet včetně krajních případů',
            detail: 'Zkontroluj prázdný seznam, jeden uzel, záporné hodnoty, nuly a to, že seznam po výpočtu zůstal beze změny.',
          },
          {
            label: 'Jedno volání na uzel plus jedno za prázdný konec',
            detail:
              'Hodnocení obalilo `sumList` a spočítalo každé volání. Cyklus udělá jedno volání. Druhý základní případ pro poslední uzel jich udělá o jedno míň. Vazbu `const` obalit nelze a nenapočítá se žádné, a proto smlouva žádá tvar s `function`.',
          },
        ],
        testLabels: [
          '',
          'prázdný seznam dá nulu',
          'jeden uzel je sám sobě součtem',
          'záporné hodnoty se počítají',
          'tři nuly nejsou prázdný seznam',
          'čtyři uzly stojí pět volání',
          'prázdný seznam je jedno volání a nic hlubšího',
        ],
      },
    },
    'dsa-v1-d06-bounded-factorial': {
      title: 'Faktoriál v bezpečném rozsahu',
      summary: 'Funkce s lineárním časem, jejíž výsledek roste faktoriálově, omezená na 20, aby každá odpověď byla přesná.',
      code: {
        prompt:
          'Napiš funkci `factorial(n)`, která vrátí součin všech celých čísel od 1 do n. `factorial(5)` je 120, `factorial(1)` je 1 a `factorial(0)` je 1, protože součin žádných čísel je 1.\n\nVolající zaručuje celé číslo od 0 do 20 včetně, takže ho nemusíš ověřovat. Ta mez se týká výsledku, ne postupu: 18! je 6402373705728000, poslední faktoriál pod `Number.MAX_SAFE_INTEGER` (9007199254740991). 19! a 20! jsou za touhle hranicí a pořád vycházejí přesně, kdežto 23! se vrátí špatně, takže rozsah končí tam, kde je každá očekávaná odpověď ještě přesné celé číslo.\n\nRekurze nebo cyklus, jak chceš. Tak či tak funkce udělá pro n od 2 výš n - 1 násobení, takže její doba běhu je v jednotkovém nákladovém modelu lineární v n. Faktoriálově roste jen číslo, které vrací, a záměna těch dvou věcí je chyba, kvůli které tohle cvičení existuje.',
        contract: [
          'Vstup je celé číslo od 0 do 20 včetně; ověřovat ho není potřeba.',
          '`factorial(0)` i `factorial(1)` jsou 1, protože prázdný součin je 1, ne 0.',
          'Vrať `Number`, ne řetězec a ne BigInt.',
          'Rekurzivní i cyklické řešení se přijímá; hodnotí se vrácená hodnota.',
        ],
        hints: [
          'Začni s průběžným součinem na 1 a násob ho dvojkou, trojkou a tak dál až po n. Pro n rovné 0 nebo 1 cyklus vůbec neproběhne, takže obě odpovědi vypadnou z počáteční hodnoty.',
          'Rekurzivně je to `n * factorial(n - 1)` se základním případem `n === 0`. To udělá n + 1 volání a otevře n + 1 rámců, což při n = 20 nevadí a je to důvod, proč je další cvičení napsané cyklem.',
          'Než uvedeš třídu růstu, spočítej násobení. Pro n od 2 výš je jich n - 1, ať je číslo, které vyrábějí, jakkoli velké.',
        ],
        approach: [
          'Začni se součinem 1, což je rovnou odpověď pro 0 i pro 1.',
          'Projdi celá čísla od 2 až po n včetně.',
          'Průběžný součin každým z nich vynásob.',
          'Po skončení průchodu součin vrať.',
        ],
        testLabels: [
          'nula faktoriál je jedna',
          'jednička je nejmenší běžný případ',
          '',
          '',
          'poslední faktoriál pod Number.MAX_SAFE_INTEGER',
          'horní konec uvedeného rozsahu, v devatenácti násobeních',
        ],
      },
    },
    'dsa-v1-d06-iterative-countdown': {
      title: 'Odpočet bez zásobníku',
      summary: 'Sestav odpočet od n k nule jediným voláním, při velikosti vstupu, kde by rekurzi došel zásobník.',
      code: {
        prompt:
          'Napiš funkci `countdownSteps(n)`, která vrátí pole `[n, n - 1, ..., 1, 0]`. `countdownSteps(3)` dá `[3, 2, 1, 0]` a `countdownSteps(0)` dá `[0]`, takže pole vždy drží n + 1 čísel. Při každém volání vrať nové pole.\n\nSestav ho cyklem, v konstantním počtu rámců na zásobníku. n jde od 0 do 10000 a právě o tu mez tu jde: rekurzivní verze otevře rámec na každý krok a pár tisíc rámců je místo, kde enginy začínají vyhazovat RangeError. Přesná hloubka, ve které to selže, závisí na enginu a na tom, co už na zásobníku leželo, takže to není mez, na kterou se dá programovat.\n\nHodnocení nahradí vazbu `countdownSteps` obalem, který počítá každé volání, a čeká přesně jedno volání na jedno spuštění. Cyklus dá jedno. Jakákoli rekurze dá víc.',
        contract: [
          'Celou práci udělá jedno volání: žádná rekurze a žádný pomocník, který `countdownSteps` zavolá znovu.',
          'Pole jde od n dolů k 0 včetně, takže má délku n + 1 a poslední položka je 0.',
          'n je celé číslo od 0 do 10000 včetně; ověřovat ho není potřeba.',
          'Deklaruj `countdownSteps` klíčovým slovem `function`, jak to dělá kostra. Hodnocení tu vazbu před spuštěním testů nahradí a vazbu `const` nahradit nelze, takže by kontrola zásobníku nenapočítala žádné volání.',
        ],
        hints: [
          'Počítej dolů přímo v cyklu: začni na n, skonči, jakmile počítadlo klesne pod 0, a pokaždé odečti jedna. Když přidáváš v tomhle pořadí, žádné otáčení pole už není potřeba.',
          'Podmínka zastavení je `>= 0`, ne `> 0`. Zastavit se na jedničce vynechá poslední nulu a udělá délku n místo n + 1.',
          'Nic tady nepotřebuje druhý rámec. Jedno pole, jedno počítadlo, a s n roste jen to pole.',
        ],
        approach: [
          'Vytvoř prázdné pole, do kterého budeš čísla sbírat.',
          'Nastav počítadlo na n.',
          'Dokud je počítadlo 0 nebo víc, přidej ho a odečti jedna.',
          'Vrať pole, které teď drží n + 1 čísel končících nulou.',
          'Ověř tvar: `countdownSteps(0)` vrací `[0]`, ne prázdné pole.',
        ],
        criteria: [
          {
            label: 'Správný odpočet včetně krajních případů',
            detail: 'Zkontroluj n = 0, n = 1, délku n + 1, poslední nulu a nové pole při každém volání.',
          },
          {
            label: 'Jedno volání, jeden rámec',
            detail:
              'Hodnocení obalilo `countdownSteps` a spočítalo každé volání. Jedno spuštění musí dát přesně jedno volání, což cyklus zvládne a rekurze ne. Vazbu `const` obalit nelze a nenapočítá se žádné, a proto smlouva žádá tvar s `function`.',
          },
        ],
        testLabels: [
          '',
          'nula pořád dá jednu položku',
          'nejmenší skutečný odpočet',
          'deset tisíc kroků, ověřených na obou koncích i uprostřed',
          'každá položka je o jedna menší než ta před ní',
          'celé pole vzejde z jediného volání',
          'n = 0 je taky jedno volání',
        ],
      },
    },
  },
};
