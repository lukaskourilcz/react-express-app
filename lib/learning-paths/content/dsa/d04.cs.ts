/** Czech copy for D04. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D04_CS: ModuleCs = {
  title: 'Zásobníky a fronty',
  outcomes: [
    'Předpovědět, co zásobník a fronta vrátí pro danou posloupnost operací, a říct, kterého konce se každý z nich dotýká.',
    'Ocenit frontu podle její reprezentace: proč `shift` nad polem dělá vyprazdňování kvadratickým a index hlavy ne.',
    'Uvést pravidlo pro podtečení a paměťový kompromis struktury, kterou jsi napsal, místo aby zůstalo obojí na náhodě.',
  ],
  lessons: {
    'dsa-v1-d04-l1': {
      title: 'LIFO a FIFO jako pravidla přístupu',
      summary: 'Dvě struktury definované tím, čeho se u nich nesmíš dotknout, krok za krokem.',
      sections: [
        {
          body:
            'Zásobník a fronta nejsou ani tak kontejnery jako spíš pravidla o tom, kterého konce se smíš dotknout. Oba drží posloupnost. Oba dovolí přidat jednu hodnotu a jednu si vzít zpátky. Liší se přesně v jediném bodě: v tom, kterou hodnotu ti jsou ochotné vydat.',
        },
        {
          body:
            'Zásobník je poslední dovnitř, první ven. Přidáváš na jednom konci a odebíráš ze stejného konce, takže dostaneš zpátky vždycky tu hodnotu, kterou jsi přidal naposledy. Pojmenovávají ho tři operace: `push` přidává, `pop` odebírá a vrací, `peek` ohlásí, co by `pop` vrátil, aniž by cokoli odebral.',
        },
        { caption: 'Zásobník nad polem: `push` i `pop` pracují na konci a žádný další prvek se nehne.' },
        {
          caption: 'Tři vložení a pak dvě odebrání. Buňky jdou zdola nahoru, takže nejpravější buňka je vrchol zásobníku.',
          notes: [
            'push(\'A\') vloží A do prázdného zásobníku. Je to jediná hodnota, takže je zároveň vrcholem.',
            'push(\'B\') položí B nad A. Vrcholem je B a A se nedá přečíst, dokud B neodejde.',
            'push(\'C\') udělá z C vrchol. Drží se tři hodnoty a dosažitelná je jen jedna z nich.',
            'peek() ohlásí C a nic nezmění: zásobník pořád drží všechny tři hodnoty.',
            'pop() odebere C a vrátí ho. Vrcholem je zase B, přesně jako před příchodem C.',
            'pop() odebere B a vrátí ho. Vrcholem je A a další pop by zásobník vyprázdnil.',
          ],
        },
        {
          body:
            'Podtečení je `pop` nad prázdným zásobníkem a každá implementace se musí rozhodnout, co v ten okamžik udělá. Vyhodit výjimku i vrátit domluvenou hodnotu jsou obhajitelné volby; nechat to nedefinované není. Tento modul vrací `null`, což je nejednoznačné ve chvíli, kdy je `null` sám o sobě uloženou hodnotou — rozlišit ty dva případy umí `size()`. Vyber jedno pravidlo a napiš ho.',
        },
        {
          body:
            'Fronta je první dovnitř, první ven. Přidáváš na konec a odebíráš zepředu, takže dostaneš zpátky tu hodnotu, která čeká nejdéle. Operace se jmenují `enqueue`, `dequeue` a čtení hodnoty na začátku.',
        },
        { caption: 'Fronta obsluhuje v pořadí příchodu, ať už si hodnoty ukládá kamkoli.' },
        {
          caption: 'Tři příchody, jeden odchod a ještě jeden příchod. Buňky jdou zepředu dozadu, takže nejlevější buňka odejde jako další.',
          notes: [
            'enqueue(\'A\') zařadí A na konec prázdné fronty, čímž se A stane i jejím začátkem.',
            'enqueue(\'B\') zařadí B za A. Na začátku je pořád A, protože A přišlo první.',
            'enqueue(\'C\') zařadí C na konec. Pořadí příchodu a pořadí odchodu je tentýž seznam.',
            'dequeue() odebere A a vrátí ho. Nejdéle teď čeká B, takže B se posouvá na začátek.',
            'enqueue(\'D\') se přidá na konec, zatímco B drží své místo na začátku. Příchod nikdy nepředbíhá.',
            'dequeue() vrátí B. Jako další odejde C a po něm D, v pořadí, v jakém ti dva přišli.',
          ],
        },
        {
          caption: 'Tytéž dvě otázky položené oběma strukturám.',
          headers: ['Otázka', 'Zásobník', 'Fronta'],
          rows: [
            ['Který konec přijímá hodnotu', 'Vrchol, pomocí `push`', 'Konec, pomocí `enqueue`'],
            ['Který konec ji vydá zpátky', 'Vrchol, pomocí `pop`', 'Začátek, pomocí `dequeue`'],
            ['Která hodnota odejde první', 'Ta přidaná naposledy', 'Ta, která čeká nejdéle'],
            ['Čtení bez odebrání', '`peek` ohlásí vrchol', 'Čtení začátku ohlásí hlavu'],
            [
              'Kde je potkáš',
              'Historie kroků zpět, párování závorek, průchod do hloubky',
              'Fronty úloh, bufferování, průchod po hladinách',
            ],
          ],
        },
        {
          body:
            'Obě struktury potřebují velikost a obě ji potřebují ze stejného důvodu: je to pojistka, která brání čtení hodnoty, jež tam není. Zkontroluj velikost před odebráním, nebo ať si tu kontrolu udělá `pop` sám, ale nevynechávej ji a nečti to, co ti podkladové pole zrovna podá.',
        },
        {
          body:
            'To omezení je právě ta výhoda. Jakmile začneš indexovat doprostřed zásobníku, máš pole s pár kroky navíc a úvaha, kterou ti to pravidlo koupilo, je pryč. A přitom je zásobník právě kvůli té úvaze: párování závorek je správné proto, že jediná dosažitelná otevírací závorka je ta poslední, a k důkazu není potřeba žádný další invariant.',
        },
        {
          body:
            'Ani jedna struktura zatím neříká nic o paměti. Zásobník může ležet na poli, na spojovém seznamu nebo na bloku pevné velikosti; fronta na čemkoli z toho nebo na kruhovém bufferu. Rozhraní určuje, kterého konce se dotýkáš. Reprezentace určuje, kolik ten dotyk stojí, a o tom je další lekce.',
        },
      ],
    },
    'dsa-v1-d04-l2': {
      title: 'Kolik stojí zvolená reprezentace',
      summary: 'Amortizovaně konstantní přidávání, lineární cena odebírání zepředu a paměť, které se fronta s indexem hlavy nepustí.',
      sections: [
        {
          body:
            'Zásobník nad polem je levný, protože obě jeho operace pracují na konci. `push` zapíše do slotu hned za poslední; `pop` přečte poslední slot a zapomene ho. Žádného jiného prvku se to nedotkne, takže ani jedna cena nezávisí na tom, kolik hodnot už tam leží.',
        },
        {
          body:
            'Jediný háček je růst. Pole s proměnnou délkou drží blok s rezervou navíc, a když rezerva dojde, alokuje větší blok a všechno do něj zkopíruje. Ta kopie je lineární v aktuální délce, takže jednotlivé `push` konstantní není. Zdvojnásobování kapacity drží kopírování dost vzácné na to, aby série n vložení stála dohromady O(n) — a přesně to znamená „amortizovaně konstantní“.',
        },
        {
          body:
            'Amortizovaný je výrok o posloupnosti, ne o jednom volání. Říká, že n vložení stojí dohromady O(n), takže průměr je konstantní. Neříká, že každé vložení je levné, a tam, kde jedno pomalé volání váží víc než celkový součet — rozpočet na snímek, zvukový callback — je průměr špatné číslo.',
        },
        {
          body:
            'Se začátkem pole je to jinak. `shift` vrátí prvek na indexu 0 a pak posune každý pozdější prvek o slot níž, protože z indexu 1 se musí stát index 0, aby pole zůstalo polem. To je lineární v aktuální délce a to jednoslovné volání o tom nedá nejmenší náznak.',
        },
        { caption: 'Ta nasnadě ležící fronta. `enqueue` je amortizovaně konstantní; `dequeue` přesune každý zbývající prvek.' },
        {
          caption: 'Jedno volání `shift` nad čtyřprvkovou frontou, s počítadlem přesunutých prvků.',
          notes: [
            'Fronta drží čtyři hodnoty. dequeue() si vezme A, prvek na indexu 0, a vrátí ho.',
            'B se posune z indexu 1 dolů na index 0. To je jeden přesunutý prvek a A je tím přepsané.',
            'C se posune z indexu 2 dolů na index 1. Pro jedno odebrání se přesunuly dva prvky.',
            'D se posune z indexu 3 dolů na index 2. Přesunuly se tři prvky, po jednom za každého přeživšího.',
            'Pole zahodí poslední slot a odebrání je hotové. Odebrat jednu hodnotu ze čtyřprvkové fronty stálo tři přesuny, takže fronta o k hodnotách stojí zhruba k.',
          ],
          counterLabels: ['Přesuny prvků', 'Přesuny prvků', 'Přesuny prvků', 'Přesuny prvků', 'Přesuny prvků'],
        },
        {
          body:
            'Teď to sečti přes celé vyprázdnění. Odebrání z fronty o n hodnotách stojí zhruba n přesunů, pak n − 1, pak n − 2, až po 1. Součet je n(n − 1)/2, tedy zhruba n²/2, takže vyprázdnit frontu je O(n²), i když každé jednotlivé volání vypadá jako jedna operace. Deset tisíc zpráv je padesát milionů přesunů prvků.',
        },
        {
          body:
            'Náprava je přestat prvky přesouvat. Nech hodnoty tam, kde jsou, a místo toho si pamatuj, kde je začátek: index hlavy, který startuje na 0 a jenom roste. `dequeue` přečte slot, na který hlava ukazuje, a pak k hlavě přičte jedničku. Nic jiného se v poli nezmění.',
        },
        { caption: 'Fronta s indexem hlavy: jedno přečtení slotu, jedno zvýšení indexu, bez ohledu na délku fronty.' },
        {
          body:
            'Každá operace je tady konstantní, `enqueue` amortizovaně. `size()` je `items.length - head`, jedno odečtení. Fronta je prázdná, když hlava dohnala konec, a přesně tuhle podmínku `dequeue` kontroluje, než cokoli přečte.',
        },
        {
          body:
            'Poctivá část je ta paměť. Sloty před hlavou v poli zůstávají. Fronta, která odbavila milion zpráv, drží pole o milionu slotů, i když čekají dvě hodnoty, protože prvních 999 998 slotů nikdo neodstranil. Zapsat `null` do přečteného slotu uvolní hodnotu, na kterou ukazoval, takže se dá uklidit — ale samotný slot zůstává.',
        },
        {
          body:
            'Skutečně tu paměť získá zpátky až zhutnění: jakmile hlava překročí nějakou mez, zkopíruj živý zbytek do nového pole a nastav hlavu na 0. Jedno zhutnění stojí O(živých prvků). Spouštět ho ve chvíli, kdy hlava dosáhne poloviny délky pole, drží celkové kopírování lineární v počtu odebrání, takže amortizovaná cena jednoho `dequeue` zůstane konstantní. Kruhový buffer s pevnou kapacitou řeší tentýž problém jinak: indexy nechá přetéct dokola místo aby pole rostlo.',
        },
        {
          caption: 'Kolik která operace stojí podle toho, kterého místa v poli se dotkne.',
          headers: ['Operace', 'Konec pole', 'Začátek pole', 'Fronta s indexem hlavy'],
          rows: [
            [
              'Přidat hodnotu',
              'Amortizovaně O(1) přes `push`',
              'O(n) přes `unshift`: každý prvek se posune nahoru',
              'Amortizovaně O(1) na konci',
            ],
            [
              'Odebrat hodnotu',
              'O(1) přes `pop`',
              'O(n) přes `shift`: každý přeživší se posune dolů',
              'O(1): přečíst slot, posunout hlavu',
            ],
            ['Ohlásit velikost', 'O(1)', 'O(1)', 'O(1): délka mínus hlava'],
            ['Držená paměť', 'Odpovídá živým hodnotám', 'Odpovídá živým hodnotám', 'Odpovídá všem vloženým, dokud nezhutníš'],
          ],
        },
        {
          body:
            'Žádná reprezentace tedy není zadarmo, jde jen o to, kterou cenu si můžeš dovolit. Krátká fronta vyprázdněná uvnitř jedné funkce `shift` nepozná. Dlouho žijící fronta za workerem pozná jak kvadratické vyprazdňování, tak pole, které nikdy nezmenší, a index hlavy se zhutněním odpovídá na obojí zvlášť.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d04-l1-read': {
      title: 'Čtení: LIFO a FIFO jako pravidla přístupu',
      summary: 'Čeho se u které struktury smíš dotknout, krok za krokem, a co musí dělat podtečení.',
    },
    'dsa-v1-d04-l2-read': {
      title: 'Čtení: kolik stojí zvolená reprezentace',
      summary: 'Amortizované přidávání, lineární cena `shift` a paměť, kterou si fronta s indexem hlavy drží, dokud nezhutníš.',
    },
    'dsa-v1-d04-checks': {
      title: 'Kontrola zásobníků a front',
      summary: 'Čtyři otázky: co které pravidlo vydá, proč se fronta se `shift` vyprazdňuje kvadraticky, co tvrdí amortizace a čeho se index hlavy nepustí.',
      questions: {
        'dsa-v1-d04-q1': {
          prompt: 'Obě struktury dostanou A, pak B a pak C a následně se z každé dvakrát čte. Co drží `fromStack` a `fromQueue`?',
          options: [
            'fromStack je [\'C\', \'B\'] a fromQueue je [\'A\', \'B\']',
            'fromStack je [\'A\', \'B\'] a fromQueue je [\'C\', \'B\']',
            'fromStack je [\'C\', \'B\'] a fromQueue je [\'C\', \'B\']',
            'fromStack je [\'A\', \'B\'] a fromQueue je [\'A\', \'B\']',
          ],
          explanation:
            'Zásobník odebírá z toho konce, na který se zapisovalo, takže první se vrátí C a po něm B. Fronta odebírá z opačného konce, takže první odejde A a po něm B. Odpověď C a pak B u obou dělá z fronty zásobník; odpověď A a pak B u obou dělá ze zásobníku frontu; prohození obou dvojic obrací každou strukturu přesně naruby. Tři hodnoty jdou dovnitř v obou případech ve stejném pořadí — rozdíl je jen v tom, který konec je vydá zpátky.',
        },
        'dsa-v1-d04-q2': {
          prompt: 'Fronta stojí na obyčejném poli: `enqueue` volá `push`, `dequeue` volá `shift`. Dovnitř jde n hodnot a všech n se vrátí ven. Kolik stojí celé vyprázdnění a proč?',
          options: [
            'O(n²), protože každý `shift` posune každý zbývající prvek o slot níž a n + (n − 1) + … + 1 přesunů dá dohromady zhruba n²/2.',
            'O(n), protože `shift` odebere na jedno volání přesně jeden prvek a volání je n.',
            'O(n log n), protože `shift` musí pole přeindexovat a přeindexování stojí logaritmický průchod.',
            'O(n²), protože `push` kopíruje celé pole do většího bloku pokaždé, když fronta povyroste.',
          ],
          explanation:
            '`shift` vrátí první prvek a pak posune každý pozdější prvek o slot níž, takže fronta držící k hodnot zaplatí za jedno odebrání zhruba k přesunů. Součet k od n dolů k 1 dá n(n − 1)/2, což je kvadratická rodina. Počítat jedno odebrání na volání ignoruje přesuny, které to odebrání vynutí na všem za ním. V `shift` se nic nepůlí, takže tu není nic logaritmického. A `push` za to nemůže: pole s proměnnou délkou zdvojnásobuje kapacitu, takže se jeho kopie amortizují na konstantní práci na jedno vložení.',
        },
        'dsa-v1-d04-q3': {
          prompt: 'Přidávání na konec pole s proměnnou délkou se popisuje jako amortizovaně konstantní. Co tohle tvrdí?',
          options: [
            'Série n přidání stojí dohromady O(n), takže průměr je konstantní — zatímco to jedno přidání, které spustí zvětšení, zkopíruje každý prvek a je lineární.',
            'Každé jednotlivé přidání proběhne v pevném počtu kroků, protože se pole rovnou alokuje ve své konečné velikosti.',
            'Průměr se bere přes mnoho programů, takže jeden konkrétní program může mít lineární cenu u každého přidání.',
            'Je to průměr naměřený benchmarkem, ne tvrzení o spočítaných krocích.',
          ],
          explanation:
            'Amortizovaná analýza rozpustí cenu občasné drahé operace mezi levné operace téže posloupnosti. Zdvojnásobování kapacity drží celkové kopírování pod počtem přidání, takže n přidání stojí O(n) a každé vyjde v průměru na konstantní práci — jenže to přidání, které kopii spustí, se opravdu dotkne všech dosavadních prvků. Žádný engine nealokuje konečnou velikost dopředu, protože ji nemůže znát. Průměr je přes jednu posloupnost operací, ne přes populaci programů. A je to počet kroků, ne údaj ze stopek: měření času vypovídá o stroji, kdežto tohle tvrzení je o růstu.',
        },
        'dsa-v1-d04-q4': {
          prompt: 'Fronta ukládá hodnoty do pole a nikdy je neodstraňuje: `dequeue` přečte slot na indexu hlavy a pak hlavu posune. Kolik taková reprezentace stojí?',
          options: [
            'Pole si nechává každý slot, který kdy použilo, takže paměť odpovídá celkovému počtu vložení, ne aktuální velikosti, dokud ho nezhutníš.',
            'Nic navíc: posunutí hlavy uvolní dřívější sloty, takže se pole s odchodem hodnot zmenšuje.',
            '`dequeue` se stane lineárním, protože index hlavy je potřeba dopočítat průchodem od začátku pole.',
            '`size()` se stane lineární, protože hodnoty, které ještě čekají, se musí spočítat od hlavy až po konec.',
          ],
          explanation:
            'Posunutí indexu nezmenší vůbec nic. Sloty před hlavou v poli zůstávají, takže fronta, která odbavila milion zpráv, drží pole o milionu slotů, i když čekají dvě hodnoty. Zápis `null` do odebraného slotu uvolní hodnotu, na kterou slot ukazoval, ale samotný slot zůstane, dokud živý zbytek nezkopíruješ do nového pole a nenastavíš hlavu zpátky. Ani jedna operace se přitom nezpomaluje: `dequeue` přečte jeden slot a přičte jedničku k uloženému indexu a `size()` je `length − head`, jediné odečtení.',
        },
      },
    },
    'dsa-v1-d04-stack-api': {
      title: 'Zásobník s pravidlem pro podtečení',
      summary: 'Napiš push, pop, peek a size nad soukromým polem a rozhodni v kódu, co vrátí prázdný zásobník.',
      code: {
        prompt:
          'Napiš funkci `createStack()`, která vrátí objekt se čtyřmi metodami:\n\n- `push(value)` položí hodnotu na vrchol. Její návratová hodnota se nikde nečte.\n- `pop()` odebere hodnotu z vrcholu a vrátí ji.\n- `peek()` vrátí hodnotu na vrcholu a zásobník nechá beze změny.\n- `size()` vrátí, kolik hodnot zásobník drží.\n\nPravidlo pro podtečení: `pop()` a `peek()` nad prázdným zásobníkem vrátí `null` a nechají ho prázdný a `size()` nikdy neklesne pod 0. Dva zásobníky ze dvou volání `createStack()` drží vlastní hodnoty a nikdy nic nesdílejí.\n\n`null` je legální hodnota k vložení, takže `null` z `pop()` sám o sobě nemůže znamenat, že byl zásobník prázdný — ty dva případy rozliší `size()`.',
        contract: [
          'Každé volání `createStack()` vrátí nový zásobník s vlastním úložištěm.',
          '`pop()` a `peek()` vrátí nad prázdným zásobníkem `null`, místo aby vyhodily výjimku nebo vrátily `undefined`.',
          '`peek()` a `size()` nechají zásobník přesně v tom stavu, v jakém ho našly.',
        ],
        hints: [
          'Drž hodnoty v poli deklarovaném uvnitř `createStack`, ať každé volání dostane vlastní. Konec toho pole je vrchol: `push` přidává tam a `pop` odtamtud odebírá, přičemž se žádný jiný prvek nehne.',
          'Obě čtecí metody hlídej stejnou kontrolou prázdnosti. Prázdné pole vrátí `undefined`, kdežto smlouva žádá `null`.',
        ],
        approach: [
          'Deklaruj pole uvnitř `createStack`, aby každé volání dostalo samostatné úložiště.',
          'Vrať objekt, jehož čtyři metody nad tím polem uzavírají.',
          'V `push` přidávej na konec a v `pop` odebírej ze stejného konce.',
          'Když je pole prázdné, vrať z `pop` i `peek` hodnotu `null`.',
          'Ze `size` hlas délku pole.',
        ],
        criteria: [
          {
            label: 'Poslední dovnitř, první ven, na soukromém zásobníku',
            detail: 'Zkontroluj pořadí, ve kterém se hodnoty vracejí, že `peek` nic neodebírá a že dva samostatně vytvořené zásobníky nesdílejí úložiště.',
          },
          {
            label: '`pop` a `peek` vrátí nad prázdným zásobníkem null',
            detail: 'Prázdné pole vrací `undefined`, ne `null`, a počítadlo velikosti snížené pod nulu jde do záporu. Obě čtecí metody potřebují stejnou pojistku.',
          },
        ],
        testLabels: [
          'hodnota vložená naposledy se vrátí jako první',
          'peek ohlásí vrchol, aniž by ho odebral',
          'pop nad prázdným zásobníkem vrátí null',
          'peek nad prázdným zásobníkem vrátí null',
          'odebírání za hranici prázdna nechá velikost na nule',
          'dva zásobníky si drží vlastní hodnoty',
          'vkládání a odebírání se prokládají',
        ],
      },
    },
    'dsa-v1-d04-head-index-queue': {
      title: 'Fronta, která nepřesouvá prvky',
      summary: 'Odebírej posunutím indexu hlavy místo `shift`, a to v počítaném rozpočtu, do kterého se fronta se `shift` nevejde.',
      code: {
        prompt:
          'Napiš funkci `createQueue()`, která vrátí objekt se třemi metodami:\n\n- `enqueue(value)` přidá hodnotu na konec. Její návratová hodnota se nikde nečte.\n- `dequeue()` odebere hodnotu ze začátku a vrátí ji, nebo vrátí `null`, když je fronta prázdná.\n- `size()` vrátí, kolik hodnot čeká.\n\n`dequeue` nesmí přesouvat hodnoty za tou, kterou odebírá. `Array.prototype.shift` je mimo hru a stejně tak ručně psaný cyklus, který je posune dolů. Místo toho si drž index hlavy: přečti slot, na který hlava ukazuje, a pak k hlavě přičti jedničku.\n\nHodnoty ukládej do bufferu, který ti hodnotitel podá — zavolej `newQueueBuffer()` tam, kde bys jinak napsal `[]`. Podporuje `push(value)`, `length` a přístup přes index a nic dalšího, a počítá každé přečtení i každý zápis prvku.\n\nRozpočet: vložit 32 hodnot a pak všech 32 odebrat se musí vejít do 192 operací nad bufferem, tedy šesti na hodnotu. Index hlavy stojí tři na hodnotu. Posouvání přeživších dolů při každém `dequeue` stojí přes tisíc, a přesně o tom tohle cvičení je.',
        contract: [
          'Hodnoty ukládej do bufferu z `newQueueBuffer()`; obyčejné pole se nepočítá a rozpočet mine.',
          'Buffer nabízí jen `push`, `length` a přístup přes index — sáhnutí po `shift` nebo `splice` vyhodí výjimku.',
          'Celý okruh 32 hodnot stojí nejvýš 192 operací nad bufferem, takže `dequeue` nemůže přesouvat zbývající hodnoty.',
          '`dequeue()` vrátí nad prázdnou frontou `null` a `size()` nikdy neklesne pod 0.',
        ],
        hints: [
          'Dva kusy stavu: buffer a index `head` začínající na 0. Fronta je prázdná, když `head` dosáhl `items.length`, a tuhle kontrolu `dequeue` udělá dřív, než cokoli přečte.',
          '`dequeue` přečte `items[head]` a pak k `head` přičte jedničku. Nic dalšího se nemění, takže cena nezávisí na tom, kolik hodnot čeká.',
          'Do slotu, který jsi zrovna přečetl, zapiš před posunutím hlavy `null`. Slot v bufferu zůstane, ale hodnota, na kterou ukazoval, se dá uklidit.',
        ],
        approach: [
          'Vytvoř buffer přes `newQueueBuffer()` a začni s indexem `head` na 0.',
          'V `enqueue` přidávej na konec pomocí `items.push(value)`.',
          'V `dequeue` vrať `null`, když `head` není menší než `items.length`.',
          'Jinak přečti `items[head]`, ten slot vyčisti, přičti k `head` jedničku a vrať přečtenou hodnotu.',
          'Ze `size()` hlas `items.length - head`.',
        ],
        criteria: [
          {
            label: 'První dovnitř, první ven, s null nad prázdnou frontou',
            detail: 'Zkontroluj pořadí příchodu, prázdnou frontu, frontu vyprázdněnou a znovu naplněnou a dvě fronty, které nesmějí sdílet úložiště.',
          },
          {
            label: 'Dequeue nechá zbývající hodnoty tam, kde jsou',
            detail: 'Počítadlo bufferu překročilo šest operací na hodnotu při okruhu 32 hodnot, nebo se hodnoty do počítaného bufferu vůbec nedostaly. Posouvání přeživších dolů, ať přes `shift`, nebo ručně, spadá sem.',
          },
        ],
        testLabels: [
          'hodnota, která čekala nejdéle, se vrátí jako první',
          'prázdná fronta hlásí nulu a odebírá null',
          'vkládání a odebírání se prokládají',
          'fronta vyprázdněná až na dno pořád přijímá nové hodnoty',
          'šest hodnot se vrátí v pořadí, v jakém přišly',
          '32 hodnot stojí nejvýš 192 operací nad bufferem',
          'hodnoty se opravdu ukládají do počítaného bufferu',
        ],
      },
    },
    'dsa-v1-d04-balanced-brackets': {
      title: 'Vyvážené závorky',
      summary: 'Spáruj tři druhy závorek zásobníkem tam, kde je pouhé počítání na správnou odpověď krátké.',
      code: {
        prompt:
          'Napiš funkci `isBalanced(text)`, která vrátí `true`, když je každá závorka v textu uzavřena odpovídajícím druhem a ve správném pořadí, a jinak `false`.\n\n`text` obsahuje jen těchto šest znaků: `(`, `)`, `[`, `]`, `{`, `}`. Žádný jiný znak se nikdy neobjeví, takže není co přeskakovat ani co odmítat. Prázdný řetězec je vyvážený.\n\n`([]{})` je vyvážený. `(]` není, protože zavírací závorka musí odpovídat té otevírací, na kterou narazí. `([)]` není, protože se dvojice překrývají místo aby se vnořovaly. `)(` není, protože zavírací závorka přišla, aniž by cokoli bylo otevřené. `(` není, protože na konci řetězce pořád čeká otevírací závorka.',
        contract: [
          'Vstup obsahuje jen `()[]{}`, takže žádný jiný znak není potřeba ošetřovat.',
          'Prázdný řetězec vrací `true`.',
          'Počítání nestačí: `)(` má od každého znaku jeden a vyvážený není.',
        ],
        hints: [
          'Otevírací závorku si musíš pamatovat, dokud nepřijde její protějšek, a ten patří vždycky k té poslední otevírací, která ještě čeká. To je zásobník: otevírací vkládej a při zavírací odebírej.',
          'Přiřaď každé zavírací závorce tu otevírací, kterou očekává: `)` k `(`, `]` k `[`, `}` k `{`. Zavírací závorka je špatně, když odebraná hodnota není ta očekávaná, a taky když nebylo co odebrat.',
          'Vrátit výsledek uvnitř cyklu nestačí. `([` dojde na konec se dvěma otevíracími závorkami, které pořád čekají, takže konečná odpověď zní, jestli je zásobník prázdný.',
        ],
        approach: [
          'Začni s prázdným polem, které drží otevírací závorky čekající na protějšek.',
          'Projdi řetězec znak po znaku.',
          'Každou otevírací závorku vlož do zásobníku.',
          'Při zavírací odeber poslední otevírací a porovnej ji s tou, kterou tahle zavírací očekává; jakmile se neshodují nebo nic nečekalo, vrať `false`.',
          'Po cyklu vrať, jestli je pole prázdné.',
        ],
        criteria: [
          {
            label: 'Správný verdikt nad vyváženým i nevyváženým textem',
            detail: 'Zkontroluj prázdný řetězec, samotnou otevírací závorku, samotnou zavírací, několik dvojic vedle sebe a hluboce vnořenou řadu.',
          },
          {
            label: 'Zavírací závorka odpovídá poslední otevírací',
            detail: 'Počítání šesti znaků, i počítání každého druhu zvlášť, označí `)(` a `([)]` za vyvážené. Na pořadí záleží stejně jako na součtech.',
          },
        ],
        testLabels: [
          'vnořené dvojice všech tří druhů',
          'prázdný řetězec je vyvážený',
          'otevírací závorka na konci pořád čeká',
          'zavírací závorka přišla, aniž by cokoli bylo otevřené',
          'zavírací závorka špatného druhu',
          'překrývající se dvojice se nevnořují',
          'dvojice vedle sebe, žádná vnořená',
        ],
      },
    },
  },
};
