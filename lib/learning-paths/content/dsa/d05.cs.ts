/** Czech copy for D05. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D05_CS: ModuleCs = {
  title: 'Jednosměrné spojové seznamy',
  outcomes: [
    'Postavit a projít řetěz uzlů `{ value, next }` a každý průchod ukončit na `null` v posledním uzlu.',
    'Přepojit seznam na místě: vložit uzel na začátek, odpojit první shodu a otočit odkazy bez alokace druhého seznamu.',
    'Rozdělit cenu operace se seznamem na průchod, který najde místo, a přepojení, které ho změní.',
  ],
  lessons: {
    'dsa-v1-d05-l1': {
      title: 'Uzly, reference a chybějící index',
      summary: 'Co uzel drží, proč je seznam jenom svůj první uzel a co stojí vyhledání, když se nedá skákat.',
      sections: [
        {
          body:
            'Jednosměrný spojový seznam je řetěz malých objektů. Každý z nich — uzel — drží hodnotu a odkaz na uzel za sebou, a nic víc. Žádný obalující kontejner tu není: seznam *je* svůj první uzel, kterému se říká hlava, nebo `null`, když je řetěz prázdný.',
        },
        { caption: 'Tři uzly stavěné odzadu dopředu, protože uzel potřebuje, aby ten za ním už existoval.' },
        {
          body:
            '`next` drží odkaz, ne kopii. `middle.next` a `tail` pojmenovávají jeden objekt, takže `tail.value = 30` změní i to, co přečte `middle.next.value`. Tím se vyjasní i to, co znamená `===` mezi dvěma proměnnými s uzly: ptá se, jestli pojmenovávají tentýž uzel, což je obvykle přesně ta otázka, kterou potřebuješ.',
        },
        {
          body:
            '`next` posledního uzlu je `null` a tenhle `null` je jediná značka konce. Když u uzlu `next` vynecháš, přečte se `undefined`; průchod, který pokračuje, dokud je odkaz `!== null`, pak udělá o krok víc a spadne na `undefined.next`. Když stavíš poslední uzel, napiš `next: null`.',
        },
        {
          body:
            'Průchod je jediný primitiv, který ti tenhle tvar dává. Nastav proměnnou na hlavu a dokud není `null`, použij `node.value` a pak přiřaď `node = node.next`. Každé procházení v tomhle modulu je tenhle cyklus s jiným tělem.',
        },
        { caption: 'Počítání uzlů: každý navštívíš jednou a tentýž cyklus zvládne i prázdný seznam bez zvláštní větve.' },
        {
          body:
            'Nic tu není indexované. `values[900]` v poli je jedno čtení; dostat se na tutéž pozici v seznamu je 900 skoků, protože jediná cesta k uzlu vede přes ten před ním. Řetěz navíc nezná svou délku a nemá tušení, kde je jeho střed.',
        },
        {
          caption: 'Hledání sedmičky ve čtyřprvkovém seznamu: průchod začíná u hlavy a končí, jakmile najde shodu.',
          notes: [
            'Průchod začíná u hlavy, která drží 4. To není 7, takže se pokračuje po odkazu na další uzel.',
            'Druhý uzel drží 1, pořád ne 7. Navštívené jsou dva uzly a k prvnímu se už vrátit nedá: odkazy vedou jen dopředu.',
            'Třetí uzel drží 7. Hledání vrátí tenhle uzel po třech návštěvách a čtvrtého se vůbec nedotkne.',
          ],
          counterLabels: ['Navštívené uzly', 'Navštívené uzly', 'Navštívené uzly'],
        },
        {
          body:
            'Tři návštěvy našly 7. Hodnota, která v seznamu není, stojí čtyři návštěvy a pak `null`, a to je nejhorší případ pro seznam o čtyřech uzlech: vyhledání je O(n) v počtu uzlů. Seřadit hodnoty předem by to nezachránilo — binární vyhledávání potřebuje skočit doprostřed a řetěz odkazů dopředu žádný skok nenabízí.',
        },
        {
          caption: 'V čem se liší pole a jednosměrný spojový seznam o n prvcích v nákladovém modelu téhle cesty.',
          headers: ['Operace', 'Pole', 'Jednosměrný spojový seznam'],
          rows: [
            ['Přečtení prvku na známém indexu', 'O(1)', 'O(n): musíš tam dojít'],
            ['Vložení na začátek', 'O(n): `unshift` posune každý další prvek o místo výš', 'O(1): jeden nový uzel před hlavou'],
            ['Vložení za pozici, kterou už držíš', 'O(n): další prvky se posunou', 'O(1): dvě přiřazení'],
            ['Nalezení hodnoty', 'O(n)', 'O(n)'],
            ['Zjištění délky', 'O(1): `length` je uložená', 'O(n), pokud si počet nedržíš sám'],
          ],
        },
        {
          body:
            'Stejné třídy růstu neznamenají stejnou rychlost. Pole drží prvky v jednom objektu, který engine může rozložit kompaktně, kdežto seznam o n uzlech je n samostatných objektů a ke každému se dostaneš po odkazu. Průchod polem i průchod seznamem jsou O(n) a na hodinkách obvykle vyhraje pole.',
        },
        {
          body:
            'Tenhle tvar se tedy vyplatí, když pořád přidáváš a odebíráš na začátku a skoro nikdy se neptáš na pozici: začátek fronty, řetěz kroků zpět, přihrádky hashovací tabulky. Nevyplatí se, když převážně indexuješ — tam zůstává levnější odpovědí fronta s indexem hlavy z předchozího modulu.',
        },
      ],
    },
    'dsa-v1-d05-l2': {
      title: 'Přepojování: vložení na začátek, odpojení, otočení',
      summary: 'Změnit seznam znamená přiřadit do něčího `next`. Přiřazení je konstantní; průchod, který k němu dojde, není.',
      sections: [
        {
          body:
            'Každá změna jednosměrného spojového seznamu je přiřazení do něčího `next`. Žádné hodnoty se nepřesouvají, nic se nekopíruje a uzly zůstávají přesně tam, kde byly. Mezi operacemi se liší jen to, jak daleko jsi před tím přiřazením došel.',
        },
        { caption: 'Vložení na začátek: jeden nový uzel ukazující na starou hlavu, vrácený jako nová hlava.' },
        {
          body:
            'To je O(1) a zůstane O(1) pro deset uzlů i pro deset milionů. `unshift` na poli odpoví na totéž v O(n), protože každý existující prvek se posune o místo výš, než se uvolní index 0. Seznam tuhle cenu neplatí, ať je jakkoli dlouhý.',
        },
        { caption: 'Vložení za uzel, který už držíš: postav, napoj dopředu a pak přesměruj uzel před ním.' },
        {
          body:
            'Prohoď ty dva řádky a zbytek seznamu je pryč. Když přiřadíš `node.next = inserted` jako první, starou hodnotu `node.next` už nic nedrží, takže každý uzel za místem vložení z řetězu vypadne. Nejdřív nasměruj nový uzel na zbytek, teprve pak přesměruj uzel před ním.',
        },
        {
          body:
            'Vložení za uzel, který držíš, je O(1). „Vlož na pozici k“ ne: nejdřív musíš k uzlů projít, takže poctivá třída celé operace je O(n). Konstantní čas patří tomu přepojení, a jen ve chvíli, kdy ti někdo ten uzel podal.',
        },
        {
          body:
            'Mazání se dělí stejně, jen s jednou nesymetrií navíc. Abys uzel odpojil, potřebuješ ten *před* ním, protože `next` ukazuje dopředu a zpátky cesta nevede. Mazání podle hodnoty proto prochází seznam s předchozím uzlem v ruce a dívá se o krok před sebe.',
        },
        { caption: 'Dva tvary odebrání: jedno přiřazení uprostřed seznamu a nová hlava na jeho začátku.' },
        {
          body:
            'Přepiš svou jedinou referenci na hlavu a seznam je pryč. Po `list = list.next.next` na první dva uzly nic neukazuje: žádný průchod se k nim už nedostane a engine je může uklidit, kdy se mu zlíbí. Nezmizely v tu chvíli — úklid probíhá podle rozvrhu enginu — ale tvůj program ten rozdíl nepozná.',
        },
        {
          body:
            'Otočení je totéž přiřazení opakované po celé délce seznamu. Projdi seznam jednou a každý uzel nasměruj na ten, ze kterého jsi právě přišel; přitom si drž tři reference: už otočenou část, uzel v ruce a zbytek, kterého ses ještě nedotkl. Na tu třetí se zapomíná — přečti si odkaz dopředu do proměnné, než ho přepíšeš, jinak je zbytek seznamu v okamžiku přiřazení nedosažitelný.',
        },
        {
          caption: 'Otočení 1 → 2 → 3 na místě. Každý snímek ukazuje otočenou část, uzel v ruce a nedotčený zbytek.',
          legend: ['Zatím otočeno', 'Uzel v ruce', 'Zbytek seznamu'],
          notes: [
            'Start. Nic není otočené, uzel v ruce je hlava s hodnotou 1 a 2 → 3 je pořád propojené po staru.',
            'Uzel 1 teď ukazuje na null, takže se z něj stal poslední uzel. Uzel v ruce se posouvá na 2 a zbytek je 3.',
            'Uzel 2 teď ukazuje zpátky na uzel 1. Uzel v ruce se posouvá na 3 a za ním už nic není.',
            'Uzel 3 ukazuje zpátky na uzel 2 a uzel v ruce je null, takže průchod končí. Uzel 3 je nová hlava a stejné tři objekty drží stejné tři hodnoty v opačném pořadí.',
          ],
          counterLabels: ['Otočené odkazy', 'Otočené odkazy', 'Otočené odkazy', 'Otočené odkazy'],
        },
        {
          body:
            'Tři otočené odkazy na tři uzly: O(n) času a ty tři reference jsou všechna potřebná paměť, tedy O(1) pomocné paměti. Zkopírovat hodnoty do pole a postavit z něj odzadu nový seznam odpoví na totéž taky v O(n) času, jenže to alokuje pole o n hodnotách a k tomu n nových uzlů. Cokoli, co pořád drží starou hlavu, pak ukazuje na seznam, který jsi neaktualizoval.',
        },
        {
          caption: 'Co stojí jednotlivé operace tohohle modulu na seznamu o n uzlech.',
          headers: ['Operace', 'Čas', 'Pomocná paměť', 'Proč'],
          rows: [
            ['Vložení hodnoty na začátek', 'O(1)', 'O(1)', 'Jeden nový uzel, jeden odkaz, žádné procházení'],
            ['Vložení za uzel, který držíš', 'O(1)', 'O(1)', 'Dvě přiřazení'],
            ['Vložení na pozici k', 'O(n)', 'O(1)', 'k skoků k tomu místu a pak ta dvě přiřazení'],
            ['Nalezení hodnoty', 'O(n)', 'O(1)', 'Žádný index, a chybějící hodnota navštíví každý uzel'],
            ['Smazání první shody', 'O(n)', 'O(1)', 'Rozhoduje hledání; samotné odpojení je jedno přiřazení'],
            ['Otočení na místě', 'O(n)', 'O(1)', 'Jeden průchod, tři reference bez ohledu na délku'],
            ['Otočení přes pole', 'O(n)', 'O(n)', 'Pole o n hodnotách a k tomu n nových uzlů'],
          ],
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d05-l1-read': {
      title: 'Čtení: uzly, reference a chybějící index',
      summary: 'Tvar uzlu, hlava jako celý seznam, `null` na konci a cena vyhledání bez indexu.',
    },
    'dsa-v1-d05-l2-read': {
      title: 'Čtení: přepojování, vložení na začátek, odpojení, otočení',
      summary: 'Konstantní přepojení proti lineárnímu průchodu, který k němu dojde, a otočení na místě krok po kroku.',
    },
    'dsa-v1-d05-checks': {
      title: 'Kontrola spojových seznamů',
      summary: 'Čtyři otázky na hledání proti vložení na známé místo, nedosažitelné uzly, `null` na konci a paměťový účet dvou otočení.',
      questions: {
        'dsa-v1-d05-q1': {
          prompt:
            'Jednosměrný spojový seznam má n uzlů. Na jeden z nich už držíš referenci a chceš za něj vložit nový uzel. Nezávisle na tom chceš od hlavy najít první uzel s danou hodnotou. Jaké jsou nejtěsnější třídy růstu těch dvou operací?',
          options: [
            'O(1) pro vložení, protože ten uzel držíš; O(n) pro hledání, protože navštěvuje uzly jeden po druhém.',
            'O(1) pro obojí, protože spojový seznam nikdy nic neposouvá.',
            'O(n) pro obojí, protože každá operace se seznamem musí začít u hlavy.',
            'O(1) pro hledání a O(n) pro vložení, protože vložení musí přepojit každý uzel za ním.',
          ],
          explanation:
            'Vložení za uzel, který držíš, jsou dvě přiřazení: nový uzel nasměruješ na `node.next` a `node` na nový uzel. Nic za ním se nehýbe, takže je to O(1). Hledání nemá žádný index, který by využilo, a nemá kam skočit, takže chybějící hodnota navštíví všech n uzlů. Tvrzení O(1) pro obojí zaměňuje „nic se neposouvá“ za „nic se nenavštěvuje“. Tvrzení O(n) pro obojí zapomíná, že vložení svůj uzel dostalo a nikam nechodí. Poslední možnost obě role prohazuje: přepojení se dotkne přesně jednoho uzlu a zkrátit se nedá právě to hledání.',
        },
        'dsa-v1-d05-q2': {
          prompt:
            'Program drží svou jedinou referenci na seznam v proměnné `head`. Aby zahodil první dvě položky, spustí `head = head.next.next` a žádnou další referenci na ně si nenechá. Co teď o těch dvou uzlech platí?',
          options: [
            'Nic v programu se k nim nedostane, takže engine může jejich paměť uklidit; zbytek seznamu zůstal nedotčený.',
            'Pořád jsou dosažitelné přes třetí uzel, protože odkazy `next` se dají číst oběma směry.',
            'Uvolní se v okamžiku přiřazení té proměnné, ještě před dalším příkazem.',
            'Nedosažitelný se stane celý seznam, protože hlava je to, co ostatní uzly drží pohromadě.',
          ],
          explanation:
            'Přiřazení do proměnné se nedotkne ani jednoho `next`, takže uzly od třetího dál jsou přesně takové, jaké byly — třetí uzel je teď prostě hlava. Ty dva zahozené uzly pořád ukazují dopředu do seznamu, ale nic neukazuje na *ně*, a právě to je dělá nedosažitelnými. `next` je jedna reference jedním směrem, takže od třetího uzlu se dozadu jít nedá. A nedosažitelný neznamená uvolněný: engine uklízí paměť podle svého rozvrhu, ne v okamžiku přiřazení.',
        },
        'dsa-v1-d05-q3': {
          prompt: 'Který vstup způsobí, že `lastValue` spadne, a jaká je nejmenší oprava?',
          options: [
            'Prázdný seznam: `head` je `null`, takže první `node.next` čte vlastnost z `null`. Ošetři `head === null` před cyklem.',
            'Seznam s jedním uzlem: tělo cyklu se nikdy neprovede, takže `node` nikdy nedostane hodnotu.',
            'Seznam se dvěma uzly: cyklus udělá o krok víc za poslední uzel a přečte `null.value`.',
            'Nespadne na ničem: test `node.next !== null` prázdný seznam už pokrývá.',
          ],
          explanation:
            'Při `head === null` je `node` rovno `null` a vyhodnocení `node.next` spadne dřív, než se tělo cyklu vůbec provede. Seznam s jedním uzlem je v pořádku: `node` dostal hodnotu z `head`, podmínka je hned nepravdivá a vrátí se hodnota hlavy. Seznam se dvěma uzly je v pořádku taky, protože cyklus skončí s `node` na posledním uzlu, ne za ním. Podmínka hlídá *následující* odkaz, ne uzel v ruce, a přesně proto jí prázdný seznam proklouzne.',
        },
        'dsa-v1-d05-q4': {
          prompt:
            'Dva způsoby, jak otočit seznam o n uzlech. A posbírá všechny hodnoty do pole a pak z něj odzadu postaví nový seznam. B projde seznam jednou a každý uzel nasměruje na ten, ze kterého právě přišel. Jaké je nejtěsnější srovnání?',
          options: [
            'Oba jsou O(n) v čase. A potřebuje O(n) pomocné paměti, B jen O(1).',
            'Oba jsou O(n) v čase a oba potřebují O(n) pomocné paměti, protože oba se dotknou každého uzlu.',
            'A je O(n²) v čase, protože plnění pole je kvadratické; B je O(n).',
            'Oba potřebují O(1) pomocné paměti, protože pole v A drží hodnoty, které seznam držel už předtím.',
          ],
          explanation:
            'Oba udělají jeden průchod na uzel, takže oba jsou v čase lineární. A alokuje pole o n hodnotách a n nových uzlů, což je O(n) nad rámec vstupu; B si drží tři reference bez ohledu na délku, což je O(1). Dotknout se každého uzlu není totéž jako pro každý uzel alokovat, takže druhá možnost zaměňuje čas za paměť. Naplnit pole n přidáními je lineární, ne kvadratické. A pomocná paměť počítá právě to, co si funkce alokuje nad rámec vstupu, takže držet tytéž hodnoty podruhé je přesně ten měřený náklad.',
        },
      },
    },
    'dsa-v1-d05-prepend-and-find': {
      title: 'Vložení na začátek a hledání',
      summary: 'Přidej uzel na začátek v konstantním čase a projdi řetěz, abys vrátil první uzel s danou hodnotou.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, next }`. `next` drží uzel za ním a `next` posledního uzlu je `null`. Seznam je svá hlava, nebo `null`, když je prázdný.\n\nNapiš dvě funkce.\n\n`prepend(head, value)` postaví jeden nový uzel s hodnotou `value`, nasměruje ho na hlavu, kterou dostal, a vrátí ho jako novou hlavu. `prepend(null, 5)` dá seznam o jednom uzlu. Uzly, které v seznamu už byly, si zachovají identitu: `prepend(head, 1).next` je tentýž objekt jako `head`, ne jeho kopie.\n\n`find(head, value)` jde od hlavy a vrátí první uzel, jehož `value` se striktně rovná (`===`) hledané hodnotě, nebo `null`, když ji žádný uzel nedrží. `find(null, 7)` je `null`. Když hodnotu drží víc uzlů, vrať ten první.',
        contract: [
          '`find` vrací samotný objekt uzlu, nebo `null` — nikdy hodnotu a nikdy index.',
          '`prepend` napojí jeden nový uzel před hlavu, kterou dostal; zbytek nikdy nekopíruje ani nestaví znovu.',
          "Porovnávej pomocí `===`, takže `0` a `false` jsou různé hodnoty, stejně jako `2` a `'2'`.",
          'Obě funkce přijímají `null` jako hlavu.',
        ],
        hints: [
          'Objektový literál je už celý `prepend`: `{ value, next: head }` ukazuje na to, čím seznam začínal, a ten objekt je nová hlava.',
          'Procházej proměnnou, ne počítadlem. Nastav ji na `head`; dokud není `null`, porovnej `node.value`, jinak přiřaď `node = node.next`.',
          'Prázdný seznam obě funkce přežijí samy od sebe. `prepend` napojí nový uzel na `null` a `find` do cyklu vůbec nevstoupí, takže propadne na `return null`.',
        ],
        approach: [
          'U `prepend` postav jeden uzel, jehož `next` je hlava, kterou jsi dostal.',
          'Vrať ten uzel: je to nová hlava a stará hlava je teď druhý uzel.',
          'U `find` nastav procházecí proměnnou na hlavu.',
          'Dokud není `null`, vrať ji, když se její hodnota shoduje přes `===`, jinak ji posuň na `node.next`.',
          'Vrať `null`, jakmile průchod vypadne z konce řetězu.',
        ],
        testLabels: [
          'vložení do prázdného seznamu dá seznam o jednom uzlu',
          '',
          'stará hlava se napojí, nezkopíruje',
          'find vrací samotný uzel',
          'hodnotu drží dva uzly a vrátí se první z nich',
          'chybějící hodnota dá null',
          'hledání v prázdném seznamu dá null',
        ],
      },
    },
    'dsa-v1-d05-delete-first-match': {
      title: 'Smazání první shody',
      summary: 'Odpoj první uzel s danou hodnotou a ber hlavu jako případ, před kterým nic není.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, next }`. `next` drží uzel za ním a `next` posledního uzlu je `null`. Seznam je svá hlava, nebo `null`, když je prázdný.\n\nNapiš funkci `deleteFirst(head, value)`, která odebere první uzel, jehož `value` se striktně rovná (`===`) zadané hodnotě, a vrátí hlavu výsledného seznamu.\n\nFungovat musí čtyři případy. Odebrání hlavy vrátí druhý uzel, protože hlava, kterou volající držel, je pryč. Odebrání uzlu uprostřed nebo na konci vrátí původní hlavu. Hodnota, kterou nedrží žádný uzel, vrátí seznam beze změny. `deleteFirst(null, 1)` vrátí `null`.\n\nOdejde jen první shoda: `deleteFirst` nad 4 → 4 → 4 nechá 4 → 4. Uzel odeber přepojením `next` toho uzlu před ním; nestav nové uzly a nepřesouvej hodnoty mezi těmi, které máš.',
        contract: [
          'Vrať hlavu seznamu po odebrání; od té, kterou jsi dostal, se liší jen tehdy, když jsi odebral právě ji.',
          'Odeber přesně jeden uzel: další uzly s toutéž hodnotou zůstávají, kde byly.',
          'Přepoj `next` uzlu před shodou. Nealokuj nové uzly a nekopíruj hodnotu z jednoho uzlu do druhého.',
          'Chybějící hodnota i prázdný seznam nechají volajícího s tím, co měl.',
        ],
        hints: [
          'Hlava je jediný uzel, před kterým nic není, takže ji vyřeš první: když se `head.value` shoduje, nová hlava je `head.next` a víc není co dělat.',
          'U každého dalšího uzlu potřebuješ ten *před* shodou, protože odkazy vedou jen dopředu. Procházej proměnnou `previous` a dívej se na `previous.next`.',
          'Odpojení je jediné přiřazení: `previous.next = previous.next.next`. Odebraný uzel pořád ukazuje do seznamu, a to nevadí — nic už neukazuje na něj.',
        ],
        approach: [
          'Když je hlava `null`, vrať rovnou `null`.',
          'Když hodnotu drží sama hlava, vrať jako novou hlavu `head.next`.',
          'Jinak procházej proměnnou `previous`, dokud `previous.next` existuje.',
          'Když hodnotu drží `previous.next`, nastav `previous.next = previous.next.next` a vrať původní hlavu.',
          'Když průchod dojde na konec bez shody, vrať původní hlavu beze změny.',
        ],
        testLabels: [
          'odebrání hlavy',
          'odebrání uzlu uprostřed',
          'odebrání posledního uzlu',
          'hodnota, kterou nedrží žádný uzel, nechá seznam být',
          'prázdný seznam zůstane prázdný',
          'ze tří stejných hodnot odejde jen první',
          'odebrání jediného uzlu nechá prázdný seznam',
        ],
      },
    },
    'dsa-v1-d05-reverse-list': {
      title: 'Otočení odkazů',
      summary: 'Otoč seznam přeřazením `next` na uzlech, které jsi dostal, v konstantní pomocné paměti.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, next }`. `next` drží uzel za ním a `next` posledního uzlu je `null`. Seznam je svá hlava, nebo `null`, když je prázdný.\n\nNapiš funkci `reverseList(head)`, která otočí odkazy a vrátí novou hlavu — uzel, který byl dosud poslední. `reverseList(null)` vrátí `null` a seznam o jednom uzlu se vrátí jako tentýž uzel s `next` pořád na `null`. Po otočení 1 → 2 → 3 drží stará hlava hodnotu 1 a její `next` je `null`.\n\nZvládni to v O(1) pomocné paměti: pevný počet referencí bez ohledu na délku. Žádné nové uzly a žádné pole hodnot předem. Hodnocení projde seznam, který vrátíš, a porovná každý uzel s objekty, které ti podalo, takže nově postavený seznam z týchž hodnot neprojde, i když jsou hodnoty ve správném pořadí.',
        contract: [
          'Otáčej přeřazením `next` na uzlech, které jsi dostal; seznam, který vrátíš, musí být z týchž objektů uzlů.',
          'Nestav nové uzly a cestou neposbírej hodnoty do pole.',
          'Použij pevný počet referencí bez ohledu na délku seznamu: O(1) pomocné paměti.',
          'Prázdný seznam vrátí `null`; seznam o jednom uzlu vrátí ten uzel s `next` pořád na `null`.',
        ],
        hints: [
          'Tři reference stačí: už otočená část, uzel v ruce a zbytek seznamu. Nic dalšího s délkou neroste.',
          'Přečti `current.next` do proměnné *dřív*, než do něj přiřadíš. Když ho přepíšeš první, na zbytek seznamu nic neukazuje.',
          'Cyklus končí, když je uzel v ruce `null`. V tu chvíli je otočená část celý seznam a její první uzel je to, co vracíš.',
        ],
        approach: [
          'Začni s otočenou částí na `null` a s uzlem v ruce na hlavě.',
          'Dokud uzel v ruce není `null`, ulož jeho odkaz dopředu do lokální proměnné.',
          'Nasměruj uzel v ruce zpátky na otočenou část.',
          'Posuň otočenou část na uzel v ruce a uzel v ruce na uložený odkaz.',
          'Po skončení průchodu vrať otočenou část: začíná uzlem, který byl dosud poslední.',
        ],
        criteria: [
          {
            label: 'Správné pořadí včetně krajních případů',
            detail: 'Zkontroluj prázdný seznam, seznam o jednom uzlu, seznam o dvou uzlech a to, že uzel, který byl hlavou, teď seznam ukončuje s `next === null`.',
          },
          {
            label: 'Otočený seznam používá původní uzly',
            detail:
              'Sonda prošla seznam, který jsi vrátil, a porovnala každý uzel s objekty, které ti podala. Postavení nového seznamu i kopírování hodnot do nových uzlů se projeví právě tady, i když hodnoty vyjdou ve správném pořadí.',
          },
        ],
        testLabels: [
          '',
          'prázdný seznam se otočí na prázdný seznam',
          'jeden uzel je sám sobě otočením',
          'nejmenší skutečné otočení',
          'nový konec končí na null',
          'otočený seznam je ze čtyř uzlů, které dostal',
          'seznam o jednom uzlu vrátí uzel, který dostal',
        ],
      },
    },
  },
};
