/** Czech copy for M09. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * English kept where a Czech developer keeps it: log, metrika, trace, span,
 * rollout, rollback, flag, deploy, backoff, circuit, half-open, cooldown,
 * baseline, tenant, p95, health check, and every identifier in the exercise. */

import type { ModuleCs } from '../../types';

export const FDE_M09_CS: ModuleCs = {
  title: 'Nasazení do provozu',
  outcomes: [
    'Říct, na kterou otázku odpovídají logy, metriky nebo trace, a pojmenovat, co ti každý z nich říct neumí.',
    'Vyjít od selhání, které čekáš, k jedinému signálu, který ho ukáže dřív než zákazník, a vysvětlit, proč tím signálem není health check ověřující návratový kód 200.',
    'Napsat podmínku pro zrušení postupného rolloutu dřív, než se otevře první fáze, a dát fázi tolik provozu, aby vůbec mohla neprojít.',
    'Přečíst trace až ke spanu, ve kterém latence sedí, a zmírnit dopad dřív, než znáš příčinu.',
    'Pojmenovat, co po nasazení předchozí verze zůstane — zahozený sloupec, odeslaná zpráva, spotřebovaný idempotenční klíč — a vést review jako seznam úkolů s vlastníky, ne jako dokument.',
  ],
  lessons: {
    'fde-v1-m09-l1': {
      title: 'Observabilita a rollout',
      summary:
        'Na co odpovídají logy, metriky a trace, jak vybrat ten jeden signál, který zachytí právě tvoje selhání, a jak vydávat změnu po fázích s podmínkou pro zrušení sepsanou předem.',
      sections: [
        {
          body:
            'Marlbrookův router pro třídění ticketů šel ven v úterý. Odpověděl na každý požadavek, pokaždé vrátil 200 a p95 držel pod půl sekundou. Za devět dní se vedoucí provozu zmínil, že tickety z vratek přestaly padat do fronty vratek. Nikdo z týmu neuměl říct, kdy to začalo, protože nic z toho, co sbírali, by to neukázalo. K dispozici měli tři druhy signálu a každý odpovídá na jinou otázku; když si vybereš ten špatný, skončíš se čtyřmi dashboardy a bez odpovědi.',
        },
        {
          caption: 'Tři signály a otázka, na kterou je každý z nich špatný.',
          headers: ['Signál', 'Na co odpovídá', 'Co ti říct neumí'],
          rows: [
            [
              'Logy',
              'Co se stalo uvnitř tohohle jednoho požadavku, slovy, která si zvolil handler',
              'Jestli se to děje častěji než včera — dokud ty řádky někdo nespočítá',
            ],
            [
              'Metriky',
              'Jak často, jak pomalu a kolik, agregovaně přes všechno',
              'Který požadavek to byl a co v něm bylo',
            ],
            [
              'Trace',
              'Kde jeden požadavek strávil čas, span po spanu, napříč všemi službami, kterých se dotkl',
              'Proč byl ten pomalý span pomalý',
            ],
          ],
        },
        {
          body:
            'Řádek logu má cenu svých polí. Volný text, který si přečteš, je volný text, který nevyfiltruješ, takže dej každému řádku stejný tvar: id požadavku, tenant, verzi, větev flagu, která ho vyrobila, výsledek a jak dlouho to trvalo. Pak je „na kolika ticketech z vratek jsme včera abstinovali“ dotaz, a ne odpoledne. Právě větev flagu je pole, které týmy vynechají a pak litují: bez něj rollout smíchá dvě větve kódu do jedněch čísel a z „míra abstencí stoupla“ se nikdy nestane „míra abstencí stoupla na nové větvi a na staré zůstala stejná“.',
        },
        { caption: 'Co chybí, je stejně důležité jako to, co tam je: žádný text ticketu, žádný nalezený článek, žádný výstup modelu.' },
        {
          body:
            'Logy čte víc lidí a leží na víc místech než databáze, ze které pocházejí. Text ticketů, těla nalezených článků ani vygenerované odpovědi do nich nepatří. Loguj id a výsledek a nech každého, kdo obsah opravdu potřebuje, ať si pro něj dojde podle přístupových pravidel, která ho už tak jako tak chrání.',
        },
        {
          body:
            'Metriky jsou počítadla a rozdělení a platí se za ně kardinalitou. Počítadlo označkované tenantem, řezem a výsledkem je v pohodě u tří tenantů a zničující u tří tisíc, takže si vyber štítky, na které se opravdu budeš ptát, a id požadavku nech v logu, kam patří. U latence publikuj percentil, ne průměr: průměr 400 ms sedí stejně dobře na stav, kdy všichni čekají 400 ms, jako na stav, kdy jeden požadavek z dvaceti čeká devět sekund — a ten druhý je ten, který operátoři cítí. Kapitola o service level objectives v SRE Book vede stejný argument a přidává tu část, kterou týmy přeskakují: cíl si zvol dřív než při incidentu a smiř se s tím, že z něj plyne error budget, který smíš utratit.',
        },
        {
          body:
            'Trace sleduje jeden požadavek napříč službami. Každá jednotka práce je span, spany se vnořují pod ten, který je vyvolal, a celá množina sdílí trace id — model, který dokumentuje OpenTelemetry a díky kterému se můžeš ptát, kudy požadavek šel, a ne jen jak dlouho trval. Do atributů spanu přidej id, která budeš chtít později: tenant, verzi, řez. Trace je z těch tří signálů jediný, který odpoví na otázku „která z šesti věcí, kterých se tenhle požadavek dotkl, byla ta pomalá“.',
        },
        {
          body:
            'A teď to užitečné cvičení, které většina týmů přeskočí. Pojmenuj selhání, které opravdu čekáš, a zeptej se, který signál by ho ukázal. Marlbrookův router nespadl. Přestal si být jistý, na 40 % ticketů z vratek vrátil „žádná jistá fronta“ a shodil je na ruční hromádku. Odpovědí bylo 200. Latence klesla, protože abstinovat je levnější než odpovědět. Chybovost, CPU i p95 zůstaly devět dní ploché.',
        },
        {
          body:
            'Signál, který by to chytil za hodinu, je míra abstencí po řezech, porovnaná s baseline ze čtrnácti dnů před vydáním. Je to počítadlo a jedno dělení. Žádný model, žádný dodavatel, žádný nový systém — nudná deterministická odpověď je tady ta správná a cena za to, že ji tým neměl, bylo devět dní ruční práce operátorů.',
        },
        {
          body:
            'Health check, který každou minutu pošle vymyšlený ticket a ověří 200, dokazuje, že služba odpovídá. O tom, jestli jsou ty odpovědi správné, neříká nic — a tohle selhání vrátilo 200 pokaždé. Být naživu a odpovídat správně jsou dvě různá tvrzení a levné na ověření je jen jedno z nich.',
        },
        {
          body:
            'Rollout je druhá polovina. Pusť změnu na 1 % provozu, pak na 5 %, pak na 25 % a pak na všechno, a mezi fázemi čti signál. Cenné na tom není opatrnictví; cenné je, že každá fáze je bod, kde může někdo říct ne, dokud je zasažená plocha ještě malá.',
        },
        {
          body:
            'Podmínku pro zrušení sepiš dřív, než se otevře první fáze — v číslech a s baseline vedle ní. „Vrať to zpátky, když míra abstencí u vratek přeleze 12 %“ je věta, podle které se dá jednat ve dvě ráno. „Vrať to zpátky, když to bude vypadat zle“ je hádka, kterou povedeš, zatímco se plní fronta, a v místnosti bude i člověk, který tu změnu vydal.',
        },
        {
          caption: 'Čtyři fáze, jedna podmínka pro zrušení sepsaná předem a fáze, která ji překročí.',
          notes: [
            'Než cokoli vyjede, tým si zapíše čísla za posledních čtrnáct dní a vedle nich podmínku pro zrušení: vrátit zpátky, když míra abstencí u vratek přeleze 12 %. Nikdo to pak nemusí vykládat.',
            'První fáze obslouží za den 31 ticketů. Jedna abstence tou mírou pohne o tři body, takže 3 % nejsou důkaz ničeho: tahle fáze dokazuje, že se vydání rozběhlo a obsluhuje provoz, ne že je bezpečné.',
            '156 ticketů už stačí na to, aby ta míra něco znamenala. 7 % proti baseline 6 % je uvnitř šumu, na kterém se tým dohodl, takže rollout pokračuje.',
            'Na 25 % dosáhne řez vratek 14 % a překročí čáru. Chybovost je pořád plochá a latence pořád v pořádku — přesně proto byla podmínka pro zrušení napsaná na abstence.',
            'Flag se vypne dvanáct minut po otevření fáze, míry se vrátí na baseline a vyšetřování začíná se 790 tickety důkazů a bez zákazníka, který na to čeká.',
          ],
          counterLabels: [
            'Tickety na nové cestě',
            'Tickety na nové cestě',
            'Tickety na nové cestě',
            'Tickety na nové cestě',
            'Tickety na nové cestě',
          ],
        },
        {
          body:
            'Fáze potřebuje tolik provozu, aby vůbec mohla neprojít. 1 % z 200 požadavků denně jsou dva požadavky a dva požadavky s dvanáctiprocentní čárou nehnou, takže zelená první fáze tam neznamená nic než to, že proces začal. Buď fázi navrhni podle míry, kterou sleduješ, nebo rovnou řekni, že rané fáze jsou kouřová zkouška a skutečná brána je až těch 25 %.',
        },
      ],
    },
    'fde-v1-m09-l2': {
      title: 'Incidenty a rollback',
      summary:
        'Zmírnit dopad dřív, než znáš příčinu, přečíst trace až k závislosti, která drží latenci, co rollback neumí vrátit a jak vést review jako mechanismus místo dokumentu.',
      sections: [
        {
          body:
            'Dvacet minut po vydání 2026-09-08.3 vyskočí p95 na `POST /tickets/triage` ze 400 ms na 8,9 sekundy. Operátoři koukají na spinner, fronta roste a někdo se už v kanále ptá, jestli to není databází. Máš dva úkoly a jdou proti sobě: rozchodit službu a zjistit, co ji rozbilo.',
        },
        {
          body:
            'Ten první udělej první. Vypni flag nebo nasaď předchozí verzi a nech čísla vrátit se, ještě než otevřeš jediný trace. Diagnostika působí zodpovědněji a stojí zákazníka každou minutu, kterou zabere. Zmírněním o důkazy nepřijdeš: trace, logy i metriky z těch špatných dvaceti minut jsou už zapsané a můžeš si je přečíst za světla, když na to nikdo nečeká.',
        },
        {
          body:
            'Dvě zmírnění působí užitečně a situaci zhorší. Zvýšení klientského timeoutu ze 2 s na 15 s zastaví chyby tím, že spojení drží otevřená déle, takže se zaplní fronta i connection pool. Restart služby bez hypotézy zahodí stav v procesu, do kterého ses mohl podívat, a příznak se vrátí během pár minut, protože o vydání se nic nezměnilo.',
        },
        {
          body:
            'Jakmile služba běží, otevři jeden pomalý požadavek. Kořenový span nese celkový čas, každé dítě říká, kam šla jeho část. Jdi dolů, průběžně odečítej a zastav se u listu, který ten čas drží.',
        },
        {
          caption: 'Jeden požadavek na třídění, sedm spanů a aritmetika, která pojmenuje závislost.',
          notes: [
            'Jeden požadavek, trace 7f21. Kořen trval 8 940 ms a jeho děti pokrývají skoro všechno. Přečti je, nehádej mezi nimi.',
            'Ověření a načtení ticketu stojí 12 ms a 31 ms. To, že je span v požadavku první, z něj příčinu nedělá; ze 43 ms devítisekundový alert nevyrobíš.',
            'Volání modelu je 180 ms a zápis 88 ms. Obojí vylučuje aritmetika, ne intuice, a na tom záleží, protože právě k volání modelu se všichni dívají nejdřív.',
            'Zbývá kb.search s 8 610 ms, což je 96 % požadavku. Není to list, takže je to zatím místo, ne odpověď.',
            'Jeho dítě kb.vector-query drží 8 540 z těch 8 610 ms, takže kb.search stráví vlastních 70 ms. Závislostí je vektorové úložiště a obal hledání na něj jenom čeká.',
            'Počet pokusů příběh dokončí: tři volání do úložiště, které odpovídá zhruba za 2,8 s, plus čekání mezi nimi. Handler udělal z jedné pomalé závislosti trojnásobnou zátěž na ni.',
            'Trace pojmenuje, kam šel čas. Neřekne, proč se vektorové úložiště zpomalilo, a zmírnění na tu odpověď nečekalo.',
          ],
        },
        { caption: 'Zesílení opakováním: neomezené opakování udělá z jedné pomalé závislosti tři volání na požadavek a znásobí zátěž na ni.' },
        {
          body:
            'Proto cvičení níž chce vedle backoffu i circuit. Samotný backoff pošle na padající závislost pořád všechny volající, jen později. Circuit, který se po několika po sobě jdoucích selháních otevře, přestane volat úplně, dá jí prostor se zotavit a potom pustí přesně jednu sondu, aby zjistil, jestli se to povedlo.',
        },
        {
          body:
            'Jestli vůbec opakovat, je rozhodnutí o požadavku, ne o chybě. RFC 9110 vede čáru, kterou potřebuješ: 4xx říká, že se zřejmě spletl klient, takže poslat tentýž požadavek znovu dá tutéž odpověď a stojí server jenom další parsování. 429 je výjimka, na které se celá branže shodla, protože znamená „teď ne“, a ne „tohle ne“. A zopakovat neidempotentní požadavek po timeoutu může tutéž změnu provést dvakrát — proto opakování a idempotenční klíč z M02 patří k sobě.',
        },
        {
          body:
            'Rollback nasazení obnoví kód. Nic jiného neobnoví a mezera mezi těmi dvěma větami je místo, kde se incidenty po zmírnění zhoršují.',
        },
        {
          caption: 'Vydání 2026-09-08.3 a co s každou jeho částí udělá nasazení předchozí verze.',
          headers: ['Co vydání udělalo', 'Co rollback obnoví', 'Co tam zůstane'],
          rows: [
            [
              'Nasadilo nový kód handleru',
              'Předchozí větev kódu, od dalšího požadavku',
              'Nic. Přesně na tohle rollback je',
            ],
            [
              'Spustilo migraci, která zahodila `tickets.legacy_queue`',
              'Ze schématu nic',
              'Sloupec je pryč a stará verze se ptá tabulky, která ho už nemá',
            ],
            [
              'Zapsalo 6 200 řádků v novém tvaru',
              'Starý zapisovač',
              'Každý už zapsaný řádek, který starý čtenář nemusí umět přečíst',
            ],
            [
              'Odeslalo 4 100 e-mailů „váš ticket se přesunul“',
              'Nic',
              'E-maily jsou ve schránkách a opravou je druhý e-mail, který někdo musí napsat',
            ],
            [
              'Spotřebovalo idempotenční klíče u fakturačního partnera',
              'Nic',
              'Partner bere další stejný požadavek jako duplicitu a přehraje první výsledek',
            ],
          ],
        },
        {
          body:
            'Změny schématu jsou to jediné, co se dá naplánovat dopředu. Přidej nový sloupec, jedno vydání zapisuj do obou, převeď čtenáře a starý sloupec zahoď až ve chvíli, kdy z něj žádná nasazená verze nečte. Každý krok je zvlášť vratný, a přesně o to jde: v žádném okamžiku nemusí cesta zpátky táhnout data s sebou.',
        },
        {
          body:
            'A pak review. Kapitola o postmortem culture v SRE Book klade dva požadavky, které se dobře citují a špatně drží: psát ho bez obviňování konkrétního člověka a dát mu život i mimo dokument. To první není zdvořilost. Inženýr, který čeká, že bude jmenován jako příčina, popíše, co se stalo, méně přesně — a přijdeš přesně o ten detail, kvůli kterému jsi tu schůzku svolal.',
        },
        {
          body:
            'Ten druhý požadavek rozhoduje, jestli mělo celé odpoledne smysl. Review je mechanismus tehdy, když z něj vyleze krátký seznam změn, každá se jmenovaným vlastníkem a datem, vedený tam, kde tým vede všechno ostatní. Tři z nich se udělají. Dvanáctipoložkový seznam bez vlastníků si někdo přečte jednou. Nejcennější řádek na tom seznamu bývá pořád stejný: signál, který by tohle chytil za hodinu místo za devět dní, a kdo ho tenhle týden přidá.',
        },
        {
          body:
            'Kontrola i cvičení v tomhle modulu hodnotí rozhodnutí a kód proti fixtures napsaným přímo pro ně. Když ti circuit projde, znamená to, že tvoje implementace zvládá tahle nascénovaná selhání; není to tvrzení o tvojí službě a žádné cvičení na téhle cestě takové tvrzení udělat nemůže. Co ti to dá, je pomocník, jehož chování umíš přesně popsat, až se tě někdo zeptá, co se stane, když závislost zmizí.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m09-l1-read': {
      title: 'Čtení: observabilita a rollout',
      summary: 'Logy, metriky a trace, signál, který zachytí právě tvoje selhání, a postupný rollout s podmínkou pro zrušení danou předem.',
    },
    'fde-v1-m09-l2-read': {
      title: 'Čtení: incidenty a rollback',
      summary: 'Zmírni dřív, než diagnostikuješ, přečti trace až k padající závislosti a věz, co po nasazení předchozí verze zůstane.',
    },
    'fde-v1-m09-checks': {
      title: 'Kontrola incidentu a rolloutu',
      summary: 'Čtyři rozhodnutí nad jedním vydáním: pojmenuj závislost z trace, vyber první krok, řekni, co rollback nechá za sebou, a vyber signál, který by to chytil první.',
      questions: {
        'fde-v1-m09-q1': {
          prompt:
            'Tady je jeden trace z pomalého okna na Marlbrookově endpointu pro třídění. Doby jsou celkový čas každého spanu a děti jsou odsazené pod rodičem. Která závislost ten požadavek drží?',
          options: [
            '`kb.vector-query`: 8 540 z 8 940 ms sedí v tomhle jediném listovém spanu a jeho tři pokusy říkají, že handler opakoval volání, které už bylo pomalé.',
            '`router.classify`: volání modelu je jediný span, jehož doba závisí na cizím systému, který nikdo neřídí.',
            '`auth.verify`: běží první, takže každý další span čeká ve frontě za tím, co ho zdrželo.',
            '`tickets.write`: zápis je poslední, takže do sebe nasál zpoždění, které se nasčítalo přes zbytek požadavku.',
          ],
          explanation:
            'Cestou dolů odečítej. Ověření a načtení ticketu stojí dohromady 43 ms, `router.classify` 180 ms a `tickets.write` 88 ms, takže `kb.search` drží 8 610 z 8 940 ms. `kb.search` není list: jeho dítě `kb.vector-query` drží 8 540 z toho, takže obal stráví vlastních 70 ms a závislostí je vektorové úložiště. K odpovědi o volání modelu sáhne většina lidí první a 180 ms ji vylučuje — cizí systém není automaticky ten pomalý. Pořadí taky není vina: `auth.verify` skončil za 12 ms a požadavek pustil dál a `tickets.write` trval 88 ms, ať běžel kdykoli. Doba spanu je jeho vlastní čas, ne čas, který uplynul, než začal.',
        },
        'fde-v1-m09-q2': {
          prompt:
            'p95 na endpointu pro třídění je 8,9 s, dvacet minut po vydání, které před router postavilo vyhledávání ve znalostní bázi. To vyhledávání je za flagem, který umíš vypnout. Operátoři čekají a ruční fronta roste. Co uděláš první?',
          options: [
            'Nejdřív přečteš trace a najdeš příčinu, než cokoli změníš, aby ti zmírnění nezakrylo důkazy, které potřebuješ.',
            'Vypneš flag, ověříš, že se latence vrátila, a teprve pak diagnostikuješ z trace a logů, které těch špatných dvacet minut už vyrobilo.',
            'Zvedneš klientský timeout ze 2 s na 15 s, aby požadavky během vyšetřování přestaly selhávat.',
            'Restartuješ službu, aby se zahodil stav nasbíraný od vydání, a budeš sledovat, jestli se to vrátí.',
          ],
          explanation:
            'Rozchodit službu i najít příčinu jsou obojí tvoje práce a zákazník čeká jenom na jednu z nich. Flag je nejlevnější dostupný návrat a jeho vypnutí tě diagnosticky nestojí nic: trace, logy i metriky z těch dvaceti minut jsou zapsané a za hodinu se budou číst stejně. Diagnostikovat první zní disciplinovaně a utratí za to výpadek. Zvednutí timeoutu odstraní chybu, ale ne čekání, takže se za touž pomalou závislostí zaplní spojení i fronta operátorů. Restart je hádání bez hypotézy: zahodí stav v procesu, do kterého ses mohl podívat, a protože vydání zůstává nasazené, příznak se za pár minut vrátí.',
        },
        'fde-v1-m09-q3': {
          prompt:
            'Vydání 2026-09-08.3 nasadilo nový kód handleru, spustilo migraci, která zahodila `tickets.legacy_queue`, odeslalo 4 100 e-mailů „váš ticket se přesunul“ a spotřebovalo idempotenční klíče u fakturačního partnera. Nasadíš předchozí verzi. Co zůstane na místě?',
          options: [
            'Zahozený sloupec, odeslané e-maily i spotřebované idempotenční klíče. Nasazení předchozí verze mění jen to, který kód běží.',
            'Jenom zahozený sloupec. Předchozí verze pošle upozornění znovu správně a partner idempotenční klíč uvolní, jakmile se požadavek, který si ho vzal, vrátí zpátky.',
            'Jenom odeslané e-maily. Migrace se vrátí, jakmile nasadíš verzi, která je starší než ona, a idempotenční klíče vyprší během hodiny.',
            'Nic, pokud nasazovací nástroj umí rollback na jedno kliknutí. Přesně od toho to tlačítko je.',
          ],
          explanation:
            'Rollback vymění artefakt, který obslouží další požadavek. Do databáze, do cizích schránek ani do partnerových záznamů nedosáhne. Zahozený sloupec zůstane zahozený a stará verze se teď ptá tabulky, která ho už nemá, což je druhý výpadek na první. Těch 4 100 e-mailů je přečtených a jedinou opravou je další e-mail, který někdo napíše. A idempotenční klíč je spotřebovaný v okamžiku, kdy si partner požadavek zapsal, takže další stejné volání přehraje první výsledek místo toho, aby práci provedlo — v té smlouvě nic nesleduje tvoje nasazení. Obě odpovědi, které jmenují jediného přeživšího, si vymýšlejí mechanismy, které neexistují: žádné partnerské API klíč neuvolní kvůli tvému nasazení, migrace se samy nevrací, když se rozběhne starší verze, a expirace klíče je vlastnost partnerova retenčního okna, ne cesta zpátky. Odpověď o jednom kliknutí zaměňuje rozhraní za rozsah — tlačítko mění artefakt a nic jiného nikdy neměnilo.',
        },
        'fde-v1-m09-q4': {
          prompt:
            'Selhání, které vám uteklo: po vydání začal router na 40 % ticketů z vratek vracet „žádná jistá fronta“ a shazovat je na ruční hromádku. Každá odpověď byla 200, latence klesla a chybovost i CPU zůstaly ploché. Běželo to devět dní, než si stěžoval vedoucí provozu. Který signál by to chytil první?',
          options: [
            'Alert na míru 5xx u `POST /tickets/triage`, protože právě tam se projeví router, který přestal odpovídat správně.',
            'Alert na p95 latence u endpointu pro třídění, protože router v potížích potřebuje na rozhodnutí víc času.',
            'Míra abstencí po řezech, porovnávaná každý den s baseline ze čtrnácti dnů před vydáním, s alertem, když se řez pohne o několik bodů.',
            'Syntetická sonda, která každou minutu pošle vymyšlený ticket a upozorní, když endpoint nevrátí 200.',
          ],
          explanation:
            'Vyjdi od selhání. Tohle vyrobilo správně vypadající, rychlé a úspěšné odpovědi, které byly k ničemu, takže každý signál hlídající selhání byl z podstaty plochý. Míra abstencí po řezech je jediné číslo, které se hnulo, a je to počítadlo a jedno dělení — žádný model a žádný nový systém, což stojí za to říct, protože levný deterministický signál bývá ten správný. Alert na 5xx se nespustí nikdy, protože abstinovat znamená vrátit 200. Alert na latenci se spustí nanejvýš opačným směrem: abstinovat je levnější než odpovědět, takže se p95 zlepšilo. A syntetická sonda ověřuje přesně tu vlastnost, která se nikdy nerozbila — dokazuje, že služba odpovídá, ne že jsou odpovědi správné, a to jsou dvě různá tvrzení.',
        },
      },
    },
    'fde-v1-m09-retry-circuit': {
      title: 'Omezená opakování a circuit, který se otevře',
      summary:
        'Obal nascénovanou závislost do exponenciálního backoffu se stropem a do circuitu, který se po po sobě jdoucích selháních otevře, odmítá bez volání dál a po cooldownu pustí přesně jednu sondu.',
      code: {
        prompt:
          'Vektorové úložiště za Marlbrookovým endpointem pro třídění se zpomalí, handler každé volání třikrát zopakuje a úložiště teď dostává trojnásobek běžného provozu, přestože už samo bojuje. Napiš obal, který tohle zastaví.\n\n`createCircuit(options)` vrátí `{ send, state }`. `options` nese `call`, `failureThreshold`, `windowMs`, `cooldownMs`, `retries`, `baseDelayMs` a `maxDelayMs`. `call(request)` vrací promise; odmítá objektem, který může nést číselný `status`.\n\n**`send(request)`** vrátí promise, který se vždycky splní a nikdy neodmítne, v jednom ze tří tvarů:\n\n- `{ ok: true, value, attempts }` — `value` je to, čím se `call` splnil.\n- `{ ok: false, reason: \'failed\', status, attempts }` — `status` je číselný `status` posledního odmítnutí, nebo `null`, když žádný nenesl.\n- `{ ok: false, reason: \'circuit-open\', attempts: 0 }` — odmítnuto bez volání dál.\n\n`attempts` počítá volání `call`, která tohle `send` udělalo.\n\n**Opakování, dokud je circuit zavřený.** Odmítnutí se smí opakovat, když má `status` 429, když má `status` 500 a víc, nebo když číselný `status` vůbec nenese. Každé jiné 4xx je chyba samotného volajícího a opakovat se nesmí: jedno volání a konec. Po odmítnutí, které se smí opakovat, počkej `Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)` milisekund pomocí `await sleep(...)` a zkus to znovu, nejvýš `retries` krát — takže `retries: 2` znamená nejvýš tři volání s čekáním `baseDelayMs` a `2 × baseDelayMs`, obojí omezené stropem `maxDelayMs`.\n\n**Otevření.** Celé `send`, které skončí `ok: false, reason: \'failed\'`, se počítá jako jedno selhání, ať udělalo pokusů kolik chtělo. Počítej selhání jdoucí po sobě: když selhání přijde víc než `windowMs` po tom předchozím, série začíná znovu od 1 místo aby pokračovala. Úspěšné `send` počítadlo vynuluje. Dosažení `failureThreshold` circuit otevře a spustí cooldown. Odmítnuté `send` selhání není a počítadla se nikdy nedotkne.\n\n**Otevřený circuit a sonda.** Dokud je circuit otevřený, `send` vrací `circuit-open` okamžitě a `call` se vůbec nezavolá. Jakmile od otevření uplyne `cooldownMs`, je circuit half-open: další `send` je sonda a je to přesně jedno volání bez opakování. Každé jiné `send`, které dorazí, zatímco je sonda rozpracovaná, se odmítne. Sonda, která se splní, circuit zavře a vynuluje počítadlo selhání; sonda, která odmítne, ho zase otevře a od té chvíle restartuje cooldown.\n\n**`state()`** vrací `\'closed\'`, `\'open\'` nebo `\'half-open\'` — `\'half-open\'` znamená, že cooldown uplynul a další `send` bude sonda.\n\nZávislost je fixture napsaná pro tohle cvičení, ne živá služba. `sleep` běží na virtuálních hodinách sandboxu, takže cooldown 2 000 ms skončí okamžitě a zaznamenané mezery mezi voláními přesto ukážou 100, 200 a 300. Nic tady neotevírá síťové spojení a fixture, která selže na povel, ti říká něco o tomhle kódu na těchhle vstupech, ne o tom, jak se degraduje skutečné úložiště.',
        contract: [
          '`options.call` je jediná cesta k závislosti a dokud je circuit otevřený, nesmí se zavolat vůbec.',
          'Sonda v half-open je přesně jedno volání. Neopakuje se, ať odmítnutí říká cokoli.',
          'Opakuj jen odmítnutí se `status` 429, se `status` 500 a víc, nebo bez číselného `status`. Každé jiné 4xx dostane jedno volání.',
          'Čekej pomocí `await sleep(ms)` z harness úlohy. Nedefinuj si vlastní a nepoužívej reálné časovače.',
          'Všechna počítadla, časové značky i příznaky drž uvnitř `createCircuit`, aby dva circuity nad touž závislostí zůstaly nezávislé.',
          '`send` se vždycky splní. Selhání hlas ve vráceném objektu, ne odmítnutím promise.',
        ],
        hints: [
          'Drž fázi v jedné proměnné a aritmetiku cooldownu nech na `state()`: když je fáze `open` a `Date.now() - openedAt >= cooldownMs`, hlas `half-open`. `send` pak přečte `state()` jednou nahoře a na hodiny se už dívat nemusí.',
          'Místo pro sondu si zaber synchronně. Nastav `probeInFlight = true` ještě před `await`, aby druhé `send`, které začne, zatímco sonda běží, ten příznak vidělo a bylo odmítnuto. Když tvoje half-open větev začíná awaitem, projdou obě.',
          'Backoff pro pokus `n` je `Math.min(baseDelayMs * 2 ** (n - 1), maxDelayMs)`: se základem 100 a stropem 400 to dá 100, 200, 400, 400. Spočítej ho až po selhání, z pokusu, který právě selhal.',
        ],
        approach: [
          'Napiš `statusOf(error)`, které vrátí `error.status`, když je to číslo, a jinak `null`, a nad tím `retryable(error)`: true pro `null`, true pro 429, true pro 500 a výš, false pro všechno ostatní.',
          'Napiš `state()` tak, aby hlásilo `half-open`, když je fáze `open` a cooldown uplynul, a k tomu malé `open()`, které nastaví fázi, orazítkuje `openedAt` a vynuluje počítadlo selhání.',
          'Dej `send` tři větve v tomhle pořadí: odmítni, když je `state()` rovno `open`; spusť jednu sondu, když je `half-open` a žádná zrovna neběží; jinak propadni do smyčky s opakováním.',
          'Ve smyčce započítej pokus, zavolej dál a při odmítnutí skonči, když se chyba nesmí opakovat nebo když pokus vyčerpal rozpočet. Jinak dej `await sleep(...)` s omezenou prodlevou.',
          'Na odchodu vynuluj počítadlo selhání po úspěchu a po selhání zavolej `recordFailure()`, kde porovnáš `Date.now() - lastFailureAt` s `windowMs` a rozhodneš, jestli série pokračuje, nebo začíná znovu.',
        ],
        criteria: [
          {
            label: 'Správné výsledky, počty pokusů a backoff se stropem',
            detail:
              'Tvar výsledku, rozpočet opakování nebo prodleva nesedí. Ověř, že se `send` vždycky splní, že `attempts` počítá volání tohohle odeslání, že `retries: 2` znamená nejvýš tři volání, že prodleva je `Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)` a na stropě přestane růst, a že odmítnutí bez číselného statusu hlásí `status: null`.',
          },
          {
            label: 'Otevřený circuit odmítá bez volání závislosti',
            detail:
              'Zatímco byl circuit otevřený, dostalo se k závislosti volání. Smyslem otevření je sundat zátěž z něčeho, co už selhává, takže odmítnutí musí přijít dřív, než se `options.call` zavolá: zkontroluj stav nahoře v `send`, vrať `{ ok: false, reason: \'circuit-open\', attempts: 0 }` a počítadla selhání se nedotýkej.',
          },
          {
            label: 'Half-open pustí přesně jednu sondu',
            detail:
              'Po cooldownu prošlo víc než jedno volání, nebo se sonda opakovala. Half-open circuit klade jednu otázku závislosti, která právě selhala, takže je to jedno volání bez opakování: zaber si místo synchronně ještě před prvním `await`, odmítni všechno, co dorazí během běhu sondy, při splnění zavři a při odmítnutí znovu otevři s novým `openedAt`.',
          },
          {
            label: 'Neopakovatelné 4xx se volá jednou',
            detail:
              '4xx, které není 429, se zopakovalo, nebo se naopak nezopakovalo odmítnutí, které se opakovat mělo. Poslat znovu požadavek, který server už odmítl jako vadný, dá tutéž odpověď a zbytečně spotřebuje kapacitu závislosti. Opakuj jen 429, 500 a výš a odmítnutí bez číselného statusu; každému jinému 4xx dej přesně jedno volání.',
          },
        ],
        testLabels: [
          'zdravé volání projde rovnou skrz',
          '503 se povede na druhý pokus',
          'dvě opakování a dost: tři volání a pak to vzdá',
          'backoff se zdvojnásobuje a pak se zastaví na stropě',
          '422 je chyba volajícího, takže se volá jednou',
          '429 je to 4xx, které se opakuje',
          'tři neúspěšná odeslání otevřou circuit a čtvrté se k závislosti vůbec nedostane',
          'half-open pustí sondu a odmítne odeslání vedle ní',
          'neúspěšná sonda je jedno volání, znovu otevře circuit a restartuje cooldown',
        ],
      },
    },
  },
};
