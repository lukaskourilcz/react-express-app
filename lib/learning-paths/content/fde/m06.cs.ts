/** Czech copy for M06. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Terms a Czech developer keeps in English stay in English — scope, schema,
 * handler, dispatcher, session, tenant, idempotency key, registry, timeout —
 * and each is glossed once where it first carries weight. */

import type { ModuleCs } from '../../types';

export const FDE_M06_CS: ModuleCs = {
  title: 'Nástroje a hranice',
  outcomes: [
    'Říct, co schéma nástroje vynucuje uvnitř tvého procesu a co jen doporučuje modelu, a zařadit každou kontrolu argumentu na správnou stranu té čáry.',
    'Dát každému nástroji jeden scope (rozsah oprávnění) a rozdělit nástroj, který umí dvě věci, kdykoli bys jednu půlku udělil a druhou zadržel.',
    'Zvládnout verzi protokolu, kterou tvůj klient neimplementuje, aniž bys hádal, co payload znamená.',
    'Omezit selhávající nástroj rozpočtem pokusů drženým na jednom místě a zařídit, aby opakované volání vrátilo první výsledek místo zopakování efektu.',
    'Říct, co musí operátor vidět, aby jeho schválení něco znamenalo, a co musí dispatcher překontrolovat, než spustí volání schválené před pěti minutami.',
  ],
  lessons: {
    'fde-v1-m06-l1': {
      title: 'Schémata nástrojů a k čemu jsou',
      summary:
        'Definice nástroje je místo, kde se zapisuje hranice. Co musí schéma vynutit ve tvém vlastním procesu, proč má být nástroj, který umí dvě věci, dvěma nástroji, a co klient udělá s verzí protokolu, kterou nikdy neviděl.',
      sections: [
        {
          body:
            'Marlbrook Systems provozuje support desk. Jeho asistent už umí přečíst ticket a vedoucí supportu teď chce, aby uměl vystavit refundaci, když zákazníkovi strhli platbu dvakrát. Z toho požadavku vznikne definice nástroje a ta definice je jediné místo, kde je zapsáno, co smí asistent dělat s penězi zákazníka.',
        },
        {
          body:
            'Definice nástroje dělá dvě věci, které na papíře vypadají stejně. Poslané modelu je schéma nápověda: tady jsou argumenty, tady je, co znamenají, doplň je. Držené v tvém dispatcheru je totéž schéma brána: tyhle argumenty a žádné jiné, tenhle typ, tenhle seznam hodnot. Model může nápovědu ignorovat. Tvoje brána je ta část, která ho zastaví.',
        },
        {
          body:
            'Schéma, které jen pošleš modelu, nevynucuje nic. Model produkuje text, dekodér ten text může omezit, framework ho může naparsovat a žádný z těch kroků není tvůj proces. Když kontrola, která hlídá refundaci, žije v promptu, špatně tvarovaný argument projde rovnou kolem ní. Spusť tu kontrolu znovu ve vlastním kódu, nad argumenty, které se chystáš předat handleru.',
        },
        {
          caption:
            'Jeden záznam v registry nese čtyři samostatná rozhodnutí: jaké oprávnění potřebuje, jestli to podepisuje člověk, jaké argumenty přijímá a kód, který jedná.',
        },
        {
          body:
            'Tři kontroly, které schéma zvládne samo: povinné pole je přítomné, hodnota má deklarovaný typ, hodnota je jedna z vyjmenovaných. Žádná z nich nepotřebuje nic než argumenty, které má před sebou. V JavaScriptu je testem typu `typeof` a má jednu past, kterou je dobré si pamatovat — `typeof null` je `"object"`, takže `null` tam, kde se čekal řetězec, propadne na kontrole typu, ne na kontrole přítomnosti.',
        },
        {
          caption: 'Dvě brány, jedna refundace. Které kontroly si vystačí se samotnými argumenty a které potřebují něco, co argumenty nenesou.',
          headers: ['Kontrola', 'Kde běží', 'Proč tam patří'],
          rows: [
            ['`currency` je jedna z USD, EUR, GBP', 'Schéma', 'Seznam je pevně daný při registraci nástroje a argument nese všechno, co kontrola potřebuje.'],
            ['`amountCents` je číslo, ne řetězec „24050“', 'Schéma', 'Jeden test `typeof` nad jednou hodnotou, bez jakéhokoli dohledávání.'],
            ['`orderId` je vůbec přítomné', 'Schéma', 'Přítomnost je strukturální. Jestli to id pojmenovává skutečnou objednávku, už ne.'],
            ['Částka se vejde do zbývajícího refundovatelného zůstatku objednávky', 'Handler', 'Potřebuje objednávku, kterou argument jen pojmenovává.'],
            ['Session operátora drží `refunds.write`', 'Handler', 'Potřebuje session. Žádný argument ji nedodá a žádný ji nesmí přebít.'],
            ['Na téhle objednávce není za poslední hodinu zapsaná refundace', 'Handler', 'Potřebuje úložiště a hodiny, a obojí se mezi voláními mění.'],
          ],
        },
        {
          caption: 'Jedno volání refundace krok po kroku branami. Argumenty vypadají rozumně a dva ze tří jsou v pořádku.',
          notes: [
            'Asistent navrhuje refunds.create s { orderId: "ORD-4471", amountCents: "24050", currency: "CZK" }. Zatím neběželo nic.',
            'refunds.create je v registry, takže dispatcher teď má scope, schéma i handler, se kterými může pracovat. Nezaregistrované jméno končí tady.',
            'Session drží refunds.write, takže tenhle operátor smí nástroj použít. Autorizace se odpovídá dřív, než se čtou argumenty, takže volající, který nástroj použít nesmí, se o jeho tvaru nedozví nic.',
            'Schéma běží v pořadí deklarace. orderId je přítomný řetězec a projde. amountCents přišlo jako řetězec "24050" tam, kde je deklarované číslo, takže kontrola padne na tomhle poli.',
            'Dispatcher vrátí invalid_arguments pro amountCents a handler vůbec neběží. Na currency se nedošlo, protože první selhavší pole kontrolu ukončí — a CZK by propadlo taky.',
          ],
        },
        {
          body:
            'To pořadí je celý smysl. Každé odmítnutí výš proběhlo dřív, než se zavolal `ledger.refund`. Jakmile handler jednou běží, už nevaliduješ, ale kompenzuješ, a refundace je jeden z těch efektů, které se kompenzují mizerně.',
        },
        {
          body:
            'Dej každému nástroji jedno jméno oprávnění a kontroluj ho proti session. Scopes v session pocházejí z toho, co operátora autentizovalo; argument jménem `scope` nebo `tenantId` je hodnota, kterou zvolil model, a hodnota zvolená modelem nikdy nesmí rozšířit, co operátor smí. Je to totéž pravidlo, které M03 uplatnil na tenanta, jen tady na sloveso.',
        },
        {
          body:
            'Marlbrookův první návrh měl jeden nástroj, `orders.manage`, s argumentem `mode` buď `read`, nebo `refund`. Udělit ho znamenalo udělit obojí, takže každý operátor, který se mohl podívat na objednávku, ji taky mohl refundovat. Rozdělení na `orders.read` pod scope `orders.read` a `refunds.create` pod `refunds.write` vrátilo rozhodnutí tam, kam patří: rozhoduje udělení a argument je už jen filtr.',
        },
        {
          body:
            'Rozdělení nástroje je rozhodnutí o oprávněních, ne o pořádku v kódu. Otázka nikdy nezní, jestli obě větve sdílejí kód. Zní, jestli bys někdy chtěl udělit jednu a druhou zadržet. Když ano, jsou to dva nástroje, ať si jsou handlery jakkoli podobné.',
        },
        {
          body:
            'Přes hranici procesu je Model Context Protocol konvence, na které tohle dneska hodně běží: server inzeruje své nástroje se jménem, popisem a vstupním schématem a klient je objeví a volá. Specifikace je verzovaná a klient se serverem se na verzi protokolu domluví při připojení. Hodinu čtení si zaslouží, protože pojmenovává tvary, které bys jinak vymyslel znovu a hůř.',
        },
        {
          body:
            'Verze se posouvají, takže tvůj klient dřív nebo později narazí na verzi, kterou neimplementuje. Nesmí hádat. Buď spojení odmítne a nahlásí, které verze umí, nebo navrhne verzi, kterou implementuje, a souhlas protistrany bere jako odpověď. Číst payload podle pravidel špatné verze je horší než ho nečíst vůbec: pole, kterému se změnil význam, se pořád naparsuje čistě a chyba vyplave až později jako volání nástroje, které udělalo špatnou věc se skutečným záznamem.',
        },
        {
          body:
            'Zvládnout neznámou verzi není totéž co přeskočit neznámé pole. Pole, které jsi nikdy neviděl, se často dá bezpečně ignorovat. Verze protokolu, kterou jsi nikdy neviděl, ti říká, že pravidla pro čtení všech polí se mohla posunout — včetně těch, která poznáváš.',
        },
      ],
    },
    'fde-v1-m06-l2': {
      title: 'Ohraničené spuštění a schválení',
      summary:
        'Rozpočty pokusů počítané na jednom místě, idempotency key, který přežije duplicitní doručení, a co musí operátor vidět, aby jeho schválení něco znamenalo ještě ve chvíli, kdy volání skutečně proběhne.',
      sections: [
        {
          body:
            'Nástroj na refundace teď existuje a odmítá všechno, co odmítat má. Otevřené zůstávají tři otázky a žádná z nich není o schématu: kolikrát se tohle volání smí pokusit, co se stane, když dorazí dvakrát, a kdo řekne ano, než se pohnou peníze.',
        },
        {
          body:
            'Rozpočet pokusů je počet pokusů pro celé volání, držený na jednom místě. Marlbrookova první verze zkoušela znovu v HTTP klientovi, pak znovu v handleru nástroje a ještě jednou ve smyčce agenta. Tři opakování v každé vrstvě je dvacet sedm pokusů proti službě, které už tak nebylo dobře. Počítej pokusy tam, kde se volání odesílá, ne tam, kde si někdo selhání náhodou všimne.',
        },
        {
          caption: 'Rozpočet je celkový, ne příděl na každé selhání, a počet se vrací s výsledkem, aby volající viděl, co ho ta odpověď stála.',
        },
        {
          body:
            'Rozpočet pokusů omezuje, kolikrát to zkusíš. O tom, co každý pokus udělal, neříká nic. Opakování `refunds.create` po timeoutu může objednávku refundovat dvakrát, protože timeout ti říká, že odpověď nedorazila, ne že se efekt nestal.',
        },
        {
          body:
            'Tuhle mezeru zavírá idempotency key. Volající vyrobí jeden klíč na jeden zamýšlený efekt, ještě před prvním pokusem, a posílá ho s každým pokusem toho efektu. Příjemce si výsledek pod klíčem zapíše a druhý příchod se stejným klíčem vrátí zapsaný výsledek, aniž by handler spustil znovu. HTTP už některým metodám tuhle vlastnost dává z definice — zopakovat PUT nebo DELETE má stejný zamýšlený efekt jako poslat je jednou — a refundace mezi ně nepatří, takže klíč dodává to, co metoda nedodá.',
        },
        {
          caption: 'Co musí klíč splnit a čtyři způsoby, jak týmy přijdou o vlastnost, o které si myslely, že ji mají.',
          headers: ['Pravidlo', 'Co znamená', 'Co se rozbije bez něj'],
          rows: [
            [
              'Jeden klíč na jeden zamýšlený efekt',
              'Volající ho vyrobí jednou, před prvním pokusem, a použije ho pro každé opakování toho efektu.',
              'Klíč generovaný na každý pokus dělá z každého opakování nové volání, což je přesně ten duplikát, kterému jsi chtěl zabránit.',
            ],
            [
              'Zapiš výsledek, ne jen klíč',
              'Uložený záznam drží to, co první volání vrátilo.',
              'Příjemce, který si pamatuje jen „viděno“, umí opakování odmítnout, ale ne zodpovědět, takže volající zkouší dál.',
            ],
            [
              'Zapisuj jen to, co něco dokončilo',
              'Volání, které se nedobralo verdiktu, po sobě nenechá záznam.',
              'Klíč spálený odmítnutím zablokuje opravené volání, které přijde o dvě vteřiny později.',
            ],
            [
              'Klíče patří jednomu tenantovi a jednomu operátorovi',
              'Vyhledání probíhá uvnitř hranice, nikdy v globální tabulce.',
              'Klíč, který jiný tenant náhodou použije taky, mu vydá uložený výsledek, který nikdy neměl vidět.',
            ],
          ],
        },
        {
          body:
            'Dispatcher, který teď napíšeš, bere to nejjednodušší pravidlo: opakovaný klíč je totéž volání a uložený výsledek se vrátí, ať s ním dorazí jakékoli argumenty. Několik platebních API jde dál a použitý klíč se změněnými argumenty odmítne s tím, že volající má chybu, o které by měl vědět. Obě pravidla se dají obhájit. Spustit druhé volání ne.',
        },
        {
          body:
            'Schválení je poslední hranice a zároveň ta, která se nejčastěji předstírá. Schválení znamená, že člověk souhlasil s konkrétním efektem, což je pravda jen tehdy, když ten efekt viděl: jméno nástroje, zvalidované argumenty, které dispatcher skutečně předá, záznam, na který to dopadne, a částku. „Schválit tuhle refundaci?“ bez čísla na obrazovce je tlačítko, ne schválení.',
        },
        {
          body:
            'Ukaž zvalidované argumenty, ne asistentův popis. Výstup modelu je nedůvěryhodný obsah: může popisovat „drobnou vstřícnou refundaci“ nad argumenty, kde stojí 240500 centů, a může operátora žádat o schválení z důvodů, které v záznamu nejsou. Operátor schvaluje to, co dispatcher spustí, takže mu vykresli ten objekt.',
        },
        {
          caption: 'Schválení udělené v 9:12 a provedené v 9:17, přičemž mezitím pracuje na téže objednávce kolega.',
          notes: [
            '9:12. Dispatcher drží refunds.create pro ORD-4471, 24050 centů, USD, a ukazuje operátorovi přesně tyhle argumenty. Nic neběželo a nic není refundované.',
            '9:12. Operátor schvaluje. Dispatcher si zapíše, že člověk s tímhle efektem souhlasil, a drží volání ve stavu pending.',
            '9:15. Kolega refunduje tutéž objednávku ručně v účtovacím nástroji. ORD-4471 teď nese 24050 centů refundace a čekající schválení o tom neví nic.',
            '9:17, bez překontrolování. Dispatcher schválené volání spustí, protože ho člověk schválil, a zákazník dostane za jednu platbu refundaci dvakrát.',
            '9:17, s překontrolováním na místě. Dispatcher si nejdřív objednávku načte znovu, najde refundaci, kterou nedělal, a odmítne. Operátor dostane volání zpět s důvodem a novým zůstatkem místo druhé refundace.',
          ],
          counterLabels: [
            'Refundováno na ORD-4471, centů',
            'Refundováno na ORD-4471, centů',
            'Refundováno na ORD-4471, centů',
            'Refundováno na ORD-4471, centů',
            'Refundováno na ORD-4471, centů',
          ],
        },
        {
          body:
            'Takže překontroluj při spuštění. Schválení je záznam rozhodnutí, ne fakt o světě. Naváž ho na to, na čem rozhodnutí stálo — číslo verze objednávky, ETag, hash polí, která jsi dal na obrazovku — a porovnej to znovu, než handler poběží. Když se to pohnulo, odmítni a zeptej se operátora znovu s novými čísly.',
        },
        {
          body:
            'Dej schválením i expiraci, dost krátkou na to, aby si operátor volání ještě pamatoval, až proběhne. Expirace je levné omezení toho, jak zastaralé rozhodnutí může být, a nenahrazuje překontrolování: data se pohnou za třicet vteřin stejně snadno jako za pět minut.',
        },
        {
          body:
            'Schválení není udělení oprávnění. Schválit jednu refundaci nepřidá `refunds.write` session, která ho neměla, a neautorizuje to další refundaci. Scope se kontroluje při každém volání, schváleném i neschváleném.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m06-l1-read': {
      title: 'Čtení: schémata nástrojů a k čemu jsou',
      summary: 'Schéma jako brána, ne jako popis, jedno oprávnění na nástroj a verze protokolu, kterou klient nikdy neviděl.',
    },
    'fde-v1-m06-l2-read': {
      title: 'Čtení: ohraničené spuštění a schválení',
      summary: 'Rozpočty pokusů na jednom místě, idempotency key při duplicitním doručení a schválení, které zestárlo dřív, než proběhlo.',
    },
    'fde-v1-m06-checks': {
      title: 'Kontrola hranic nástrojů',
      summary: 'Čtyři otázky: kam patří kontrola argumentu, co stojí neznámá verze protokolu, které volání potřebuje schválení a proč se schválené volání překontrolovává.',
      questions: {
        'fde-v1-m06-q1': {
          prompt:
            'Marlbrookův nástroj `refunds.create` bere `{ orderId, amountCents, currency }`. Než handler pohne penězi, musí proběhnout čtyři kontroly. Která z nich patří do schématu argumentů, a ne do handleru?',
          options: [
            '`currency` musí být jedna z „USD“, „EUR“ nebo „GBP“.',
            '`amountCents` nesmí překročit zbývající refundovatelný zůstatek objednávky.',
            'Session operátora musí držet scope `refunds.write`.',
            'Na objednávce nesmí být za poslední hodinu zapsaná žádná refundace.',
          ],
          explanation:
            'Kontrola ve schématu se dá rozhodnout ze samotných argumentů: povolené měny jsou pevně dané při registraci nástroje, takže hodnota, kterou máš před sebou, věc uzavírá. Zbylé tři potřebují něco, co argumenty nenesou. Zůstatek potřebuje objednávku, kterou id jen pojmenovává, scope potřebuje session, která operátora autentizovala, a kontrola nedávné refundace potřebuje úložiště a hodiny. Dát kteroukoli z nich do schématu by znamenalo buď protlačit stav do validátoru, nebo věřit argumentu, že ho popíše, a argument zvolený modelem nikdy nemůže založit oprávnění. Všechny čtyři přesto běží dřív než handler; rozdělení je o tom, co která kontrola vidí, ne o tom, která je důležitější.',
        },
        'fde-v1-m06-q2': {
          prompt:
            'Tvůj klient se připojí k serveru s nástroji, který ohlásí verzi protokolu, kterou klient neimplementuje. Co má klient udělat se seznamem nástrojů, který následuje?',
          options: [
            'Považovat seznam nástrojů za nepoužitelný: buď spojení odmítnout a nahlásit, které verze umí, nebo navrhnout verzi, kterou implementuje, a jednat teprve tehdy, když s ní server souhlasí.',
            'Seznam nástrojů přečíst a ignorovat každé pole, které nepozná, protože změny protokolu bývají podle konvence jen přírůstkové.',
            'Přečíst seznam nástrojů podle nejnovější verze, kterou klient implementuje, a zalogovat varování, protože server odmítne cokoli, co neumí zpracovat.',
            'Automaticky spadnout na nejstarší verzi, kterou klient ještě podporuje, aby fungovalo co nejvíc serverů.',
          ],
          explanation:
            'Neznámá verze ti říká, že se pravidla pro čtení payloadu mohla posunout, takže bezpečné jsou jen dva tahy: odmítnout, nebo se domluvit na verzi, kterou implementují obě strany. Ignorovat nepoznaná pole předpokládá, že změna byla přírůstková, což je přesně to, co z verze, kterou jsi nikdy neviděl, vědět nemůžeš — poli, které poznáváš, se mohl změnit význam a naparsuje se dál. Spolehnout se na to, že server špatné požadavky odmítne, dává tvoji bezpečnost do rukou protistrany a míjí selhání, která jsou tichá místo odmítnutá. Spadnout na nejstarší podporovanou verzi je pořád hádání: server ji nemusí implementovat taky, a vybrat bez potvrzení znamená, že obě strany čtou stejné bajty podle jiných pravidel.',
        },
        'fde-v1-m06-q3': {
          prompt: 'Marlbrookův asistent má čtyři nástroje a u všech se kontroluje scope proti session operátora. Který z nich potřebuje před spuštěním schválení člověkem?',
          options: [
            '`refunds.create`, který posílá peníze z Marlbrookova účtu pryč a nedá se vzít zpět opětovným spuštěním asistenta.',
            '`orders.read`, který vrací objednávky, jež si operátor umí otevřít i v administraci.',
            '`tickets.search`, který hledá v tenantovi samotného operátora a vrací shrnutí ticketů.',
            '`draft.compose`, který napíše odpověď do editoru operátora a nikdo ji neodešle, dokud operátor nezmáčkne odeslat.',
          ],
          explanation:
            'Schválení ti kupuje člověka mezi modelem a efektem, který se špatně vrací zpět, a refundace je přesně to. Oba nástroje pro čtení nic nemění, takže schvalovací krok by k nim jen přidal kliknutí; chrání je kontrola scope a schválení ji nikdy nenahrazuje. `draft.compose` je zajímavý distraktor: opravdu něco zapisuje, ale operátor už tak musí zmáčknout odeslat, takže druhé potvrzení jen pěstuje návyk proklikávat dialogy bez čtení. Každé schválení navíc stojí pozornost, kterou by měla dostat ta schválení, na kterých záleží.',
        },
        'fde-v1-m06-q4': {
          prompt:
            'Operátor v 9:12 schválil `refunds.create` na ORD-4471 na 24050 centů. Dispatcher se k volání dostane v 9:17 a v 9:15 kolega tutéž objednávku refundoval ručně. Proč musí dispatcher před spuštěním své kontroly zopakovat?',
          options: [
            'Schválení zaznamenává, že člověk souhlasil s efektem popsaným v 9:12, ne že podmínky pořád platí, takže si je dispatcher musí načíst znovu a odmítnout, když se pohnuly.',
            'Schválení je zastaralé a každé schválení musí mít časový limit kratší než pět minut.',
            'Dispatcher se nemůže spolehnout na úsudek operátora, takže rozhodnutí před jednáním sám přehodnocuje.',
            'Při schválení se resetuje rozpočet pokusů, takže se volání musí znovu zvalidovat, aby nevznikl duplicitní pokus.',
          ],
          explanation:
            'Schválení je záznam souhlasu s popsaným efektem v jednom okamžiku. O zůstatku neříká nic, a zůstatek je právě to, co se změnilo. Časový limit je užitečná druhá pojistka, ale pět minut je libovolné číslo a schválení staré třicet vteřin má stejnou vadu, takže expirace potřebu překontrolovat neruší. Dispatcher taky operátora nepřehodnocuje: člověk rozhodl správně podle faktů, které mu ukázali, a ta fakta se pohnula. Rozpočet pokusů omezuje, kolik pokusů dostane jedno volání, a k tomu, jestli se mezi schválením a spuštěním změnil svět, neříká nic.',
        },
      },
    },
    'fde-v1-m06-tool-dispatcher': {
      title: 'Dispatcher nástrojů',
      summary:
        'Jeden dispatcher, který odmítne neznámý nástroj, nedržený scope i neplatný argument, omezí opakování, přehraje idempotency key a podrží refundaci, dokud ji člověk neschválí.',
      code: {
        prompt:
          'Napiš `createDispatcher(registry, session)`, který vrátí `{ call, approve }`. Je to jediné místo, kde se z navrženého volání nástroje stane efekt, takže se v něm potkají všechny hranice z tohoto modulu.\n\n`registry` mapuje jméno nástroje na `{ scope, schema, handler, approval?, maxAttempts? }`. `schema` mapuje jméno argumentu na `{ type, required, enum? }`, kde se `type` porovnává pomocí `typeof`. `session` je `{ operatorId, scopes }` a `scopes` je jediné místo, odkud smí oprávnění přijít.\n\n`call(name, args, options)` prochází brány v tomhle pořadí a zastaví se na prvním odmítnutí.\n\n1. **Přehrání podle idempotency key.** Když je `options.idempotencyKey` klíč, který si tenhle dispatcher už zapsal, vrať zapsaný výsledek okamžitě a nedělej nic dalšího, ať s ním dorazí jakékoli jméno a argumenty.\n2. **Neznámý nástroj.** Jméno, které v `registry` není, dá `{ ok: false, reason: \'unknown_tool\', tool: name }`.\n3. **Scope.** Když `session.scopes` neobsahuje `scope` nástroje přesně, dej `{ ok: false, reason: \'scope_denied\', scope: <scope nástroje> }`. Porovnávej celý řetězec: session, která drží `refunds`, nedrží `refunds.write`.\n4. **Argumenty.** Projdi pole schématu v pořadí deklarace. Chybějící povinné pole dá `problem: \'missing\'`; přítomná hodnota, jejíž `typeof` nesouhlasí s deklarovaným `type`, dá `\'type\'`; přítomná hodnota mimo deklarovaný `enum` dá `\'enum\'`. Potom projdi dodané argumenty: každý klíč, který schéma nedeklaruje, dá `\'unknown\'`. První selhání vrátí `{ ok: false, reason: \'invalid_arguments\', field, problem }` a handler vůbec neběží. Chybějící nepovinné pole je v pořádku a `null` tam, kde je deklarovaný řetězec, je selhání typu, ne chybějící pole.\n5. **Schválení.** Nástroj s `approval: true` neběží. Zapiš ho a vrať `{ ok: false, reason: \'pending_approval\', callId }`, kde `callId` je `\'CALL-1\'` pro první čekající volání, které tenhle dispatcher vytvoří, `\'CALL-2\'` pro druhé a tak dál.\n6. **Spuštění.** Zavolej `handler(args)` a opakuj, dokud vyhazuje výjimku, až do celkem `maxAttempts` pokusů. Chybějící `maxAttempts` znamená jeden pokus. Úspěch dá `{ ok: true, value, attempts }`; vyčerpaný rozpočet dá `{ ok: false, reason: \'tool_failed\', attempts, error }`, kde `error` je `message` poslední vyhozené chyby.\n\n`approve(callId)` spustí čekající volání podle stejných pravidel pro opakování a vrací stejné tvary. `callId`, který je neznámý nebo už jednou schválený, dá `{ ok: false, reason: \'unknown_call\' }` a nespustí nic.\n\nIdempotency key zapisuje volání, které přineslo výsledek: spuštění s `ok: true`, nebo čekající schválení — aby přehraný klíč vrátil tentýž `callId` místo zařazení druhé refundace. Odmítnutí a `tool_failed` se nezapisují, takže volající může volání opravit a použít stejný klíč znovu, a schválení, které selhalo, svůj klíč uvolní.\n\nKaždý nástroj je tady syntetická fixture. Handlery zapisují do pole a vracejí autorské hodnoty; nic nevolá poskytovatele, neotvírá socket ani nečeká na časovač, takže selhávající handler je vyhozený `Error`, ne skutečné chování sítě.',
        contract: [
          'Oprávnění čti jen ze `session.scopes` a porovnávej celé řetězce scope. Žádný argument nesmí rozšířit to, co session drží.',
          'Žádný handler neběží dřív, než je nástroj známý, scope držený a argumenty zvalidované.',
          'Pokusy počítej jednou, v dispatcheru. Nepřidávej druhou smyčku opakování do kontroly argumentů ani kolem `approve`.',
          'Neměň `registry` ani `session` a zapsané klíče i čekající volání drž uvnitř dispatcheru, který vracíš.',
          'Všechno je v paměti: žádná síť, žádné časovače, žádné importy.',
        ],
        hints: [
          'Vyhledání podle idempotency key dělej první, ještě než se vůbec podíváš na nástroj. Test, který chceš, je `Object.prototype.hasOwnProperty.call(completed, key)`, protože klíč jako `"constructor"` je na obyčejném objektu pravdivý, aniž by tam kdy něco bylo uložené.',
          'Validace jsou dva průchody nad jedním objektem. První projde `Object.keys(schema)` a kontroluje přítomnost, pak `typeof` a pak `enum`. Druhý projde `Object.keys(args)` a odmítne každé jméno, které schéma nedeklaruje. Vrať první selhání, které najdeš, a nech volajícího, ať z něj udělá výsledek.',
          'Smyčku opakování napiš jednou, jako pomocnou funkci, která bere nástroj a argumenty, aby ji `call` i `approve` sdílely. Pokus započítej dřív, než ho zkusíš, `{ ok: true, value, attempts }` vracej zevnitř `try` a z vypadnutí ze smyčky udělej výsledek `tool_failed`.',
        ],
        approach: [
          'Zachyť `session.scopes` a připrav tři kusy stavu dispatcheru: zapsané výsledky podle idempotency key, čekající volání podle callId a další pořadové číslo callId.',
          'Napiš `validate(schema, args)` tak, aby vracela `{ field, problem }` pro první selhání nebo `null`, a to pro chybějící pole, typ, enum a nedeklarované klíče v tomhle pořadí.',
          'Napiš `run(tool, args)` tak, aby zkusila handler až `maxAttempts` krát a vracela hodnotu s počtem pokusů při úspěchu a `tool_failed` s poslední zprávou, když rozpočet dojde.',
          'Napiš `call` jako šest bran v pořadí a pod idempotency key zapisuj výsledek s `ok: true` nebo čekající schválení, nic jiného.',
          'Napiš `approve` tak, aby čekající volání nejdřív odebrala a teprve pak spustila, a pak uzavři tentýž idempotency key, pod kterým čekající volání vzniklo.',
        ],
        testLabels: [
          'volání v rámci scope s platnými argumenty proběhne jednou a vrátí svou hodnotu',
          'nezaregistrované jméno nástroje se odmítne a nedojde k žádnému handleru',
          'chybějící pole, špatný typ i hodnota mimo enum se odmítnou dřív než handler',
          'argument, který schéma nedeklaruje, se odmítne, místo aby prošel dál',
          'session bez refunds.write nemůže refundovat, ať jsou argumenty jakkoli dobré',
          'dvě selhání a pak úspěch: tři pokusy, vykázané jako tři',
          'nástroj, který vyhazuje pořád, se zastaví na svém rozpočtu tří pokusů',
          'stejný klíč dvakrát: stejný výsledek a handler běžel jednou',
          'refundace čeká jako CALL-1 a proběhne, teprve když ji člověk schválí',
        ],
        criteria: [
          {
            label: 'Dispatcher vrací správné tvary a stavový automat schvalování drží',
            detail:
              'Něco mimo bezpečnostní brány je špatně. Zkontroluj, že platné volání v rámci scope vrací `{ ok: true, value, attempts }`, že neznámé jméno vrací `unknown_tool` s připojeným jménem a nesáhne na žádný handler, že čekající volání vrací `CALL-1` před `CALL-2` a počítá se zvlášť pro každý dispatcher, že `approve` spustí volání právě jednou a že schválení téhož callId podruhé dá `unknown_call`.',
          },
          {
            label: 'Nástroj mimo scopes session se nikdy nespustí',
            detail:
              'Brána oprávnění neudržela. Buď se nástroj spustil pro session, která jeho scope nedržela, nebo porovnání sedlo na něco, na co sednout nemělo: kontrola scope přes prefix, podřetězec nebo slepený řetězec nechá `refunds` zastoupit `refunds.write`. Odmítnutí kvůli scope musí navíc přijít dřív než kontroly argumentů, aby volající, který nástroj použít nesmí, dostal `scope_denied` i tehdy, když argumenty chybí nebo jsou vadné.',
          },
          {
            label: 'Neplatné argumenty se nikdy nedostanou k handleru',
            detail:
              'Kontrola argumentu běžela pozdě nebo moc volně. Ověř, že chybějící povinné pole, špatný `typeof`, hodnota mimo `enum` i nedeklarovaný klíč odmítnou se správným `field` a `problem`, že přitom log handlerů zůstane prázdný, že chybějící nepovinné pole projde, že `amountCents: 0` projde a že `null` tam, kde je deklarovaný řetězec, je selhání `type`, ne `missing`.',
          },
          {
            label: 'Selhávající nástroj se zkusí nejvýš maxAttempts krát',
            detail:
              'Počet pokusů nesedí. Zkontroluj, že se nástroj s deklarovanými třemi pokusy zavolá třikrát a ne víc, když vyhazuje pořád, že se zastaví hned, jak jeden pokus uspěje, že vrácené `attempts` odpovídá tomu, kolikrát handler skutečně běžel, a že nástroj bez `maxAttempts` dostane přesně jeden pokus.',
          },
          {
            label: 'Opakovaný idempotency key vrátí první výsledek bez dalšího spuštění',
            detail:
              'Cesta pro přehrání nevrací uložené volání. Zkontroluj, že druhé volání s už viděným klíčem vrátí totožný výsledek a nechá log handlerů beze změny, že to udělá i tehdy, když se jméno nástroje a argumenty liší, a že přehrání klíče čekajícího schválení vydá tentýž `callId` místo vytvoření druhé čekající refundace.',
          },
        ],
      },
    },
  },
};
