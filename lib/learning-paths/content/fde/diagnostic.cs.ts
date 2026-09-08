/** Czech copy for the FDE diagnostic. Arrays align by index with the English
 * source; the content test enforces parity, so a missing entry fails rather
 * than falling back silently to English.
 *
 * Established English terms stay English where a Czech developer would keep
 * them — tenant, cursor, rollback, backoff, idempotency key, hold-out — and
 * each is glossed once where it first appears. */

import type { ModuleCs } from '../../types';

export const FDE_DIAGNOSTIC_CS: ModuleCs = {
  title: 'Kde už teď jsi',
  outcomes: [
    'Uvidíš, které FDE kompetence umíš doložit už teď a na které se tahle diagnostika vůbec nepodívala.',
    'Dostaneš doporučené mosty mířené na mezery, přičemž ti výsledek nic nezamkne ani neodemkne.',
    'Můžeš ji celou přeskočit: je volitelná, neuděluje žádnou výjimku a sama o sobě nic nedokončuje.',
    'Kompetenci, které se tady žádná otázka nedotkla, čteš jako neposuzovanou, ne jako nulu.',
  ],
  lessons: {},
  activities: {
    'fde-v1-diagnostic-check': {
      title: 'Dvanáct situací',
      summary:
        'Po třech otázkách na API a data, bezpečnost a provoz, obrazovku operátora a vyhodnocení výsledku od modelu. Volitelné a opakovatelné. Doporučí mosty, z ničeho tě neomluví, sama o sobě nic nedokončí a kompetenci, kterou nezměřila, hlásí jako neposuzovanou, ne jako nulu.',
      questions: {
        'fde-v1-diagnostic-q1': {
          prompt:
            'Noční úloha stahuje kontakty z API dodavatele. Dodavatel dokumentuje dvě věci: stránka může přijít kratší než `page_size`, když se z ní po sestavení odfiltrují záznamy, a `next_cursor` je `null` jenom na poslední stránce. Úloha doběhne bez chyby a uloží zhruba 4 000 z 11 000 kontaktů. Který řádek to vysvětluje?',
          options: [
            '`if (page.items.length < 500) break;` — kratší stránka tady není konec kolekce, konec říká jedině `next_cursor === null`.',
            '`contacts.push(...page.items)` — rozbalení 500 položek do seznamu argumentů ho přeteče a konec se zahodí.',
            '`let cursor = null;` — nulový cursor začíná čtení z nedefinované pozice, takže první požadavek přeskočí dopředu.',
            '`page_size: 500` je nad maximem dodavatele, takže se každá odpověď zkrátí na jeho výchozí velikost.',
          ],
          explanation:
            'Dodavatel říká, že kratší stránka je normální, a konec značí přes `next_cursor: null`. Ukončení na kratší stránce se zastaví u první odfiltrované stránky a nahlásí úspěch, což je přesně ten příznak: žádná chyba, většina záznamů chybí. Rozbalení 500 argumentů je hluboko pod limitem enginu a jeho překročení vyhodí výjimku, položky potichu nezahodí. Nulový cursor je to, čím čtení přes cursor začíná, a první stránka opravdu dorazila. Příliš velký `page_size` by pořád vrátil `next_cursor`, takže by cyklus pokračoval, ne skončil.',
        },
        'fde-v1-diagnostic-q2': {
          prompt:
            'Konektor posílá POSTem jednu fakturu na každou schválenou objednávku. Když fakturační služba odpoví 504, konektor tentýž POST zopakuje až třikrát. Finanční oddělení hlásí, že zhruba jedna objednávka ze dvou set vyrobila dvě faktury. Která změna ty duplicity zastaví?',
          options: [
            'Opakovat nejvýš jednou, takže v nejhorším případě vznikne jeden duplikát.',
            'Přidat mezi pokusy exponenciální backoff s jitterem.',
            'Posílat idempotency key, který konektor vygeneruje jednou na objednávku, a nechat fakturační službu u opakovaného klíče vrátit uložený výsledek místo dalšího zápisu.',
            'Na 504 přestat opakovat a timeout ukázat operátorovi.',
          ],
          explanation:
            '504 říká, že brána přestala čekat, ne že zápis selhal, takže faktura už může existovat. Jedině klíč, který si server pamatuje, promění druhý pokus ve čtení prvního výsledku. Jediné opakování duplicity zhruba na polovinu sníží a dál je vyrábí. Backoff mění, kdy pokus dorazí, nikdy ne to, co po dorazení udělá. Neopakovat sice druhý zápis nevytvoří, ale výsledek zůstane neznámý a operátor dostane objednávku, kterou pošle ručně znovu, takže duplikát vznikne stejně.',
        },
        'fde-v1-diagnostic-q3': {
          prompt:
            'Noční CSV export nechává `vat_id` prázdné u zákazníků, kteří DIČ nemají, a čtečka CSV předává prázdné hodnoty jako `""`. Stejné pole přichází z JSON API dodavatele jako `null`. Co se tady stane s prázdným řádkem?',
          options: [
            'Prázdný řetězec je falsy, takže podmínka uloží `null` a oba zdroje se nakonec shodnou.',
            'Prázdný řetězec není `null`, takže se uloží jako DIČ, a `findByVat(customers, "")` pak vrátí všechny zákazníky bez DIČ jako jednu shodu.',
            'Čtečka CSV převede prázdný sloupec na `null` dřív, než se k němu mapper dostane, takže oba zdroje se shodují už teď.',
            'Insert selže, protože nullable sloupec prázdný řetězec odmítne.',
          ],
          explanation:
            '`row.vat_id !== null` je kontrola na null a `""` jí projde, takže se z prázdna stane uložená hodnota, která se rovná každému jinému prázdnu. Nikde nevznikne chyba; jenom vyhledání podle DIČ začne najednou trefovat celou třídu zákazníků. Prázdný řetězec falsy je, jenže kód testuje `!== null`, ne pravdivost, takže argument přes falsy popisuje kód, který na obrazovce není. Čtečka předává sloupec tak, jak přišel, a právě proto se oba zdroje rozcházejí. A nullable sloupec `""` bez řečí přijme: prázdný řetězec je hodnota, ne její nepřítomnost.',
        },
        'fde-v1-diagnostic-q4': {
          prompt:
            'Každý, kdo tenhle endpoint volá, je přihlášený, a klient v prohlížeči vždycky posílá tenant, který má zrovna zobrazený. Co může udělat přihlášený uživatel tenanta A?',
          options: [
            'Přečíst si libovolný case tenanta B tak, že do těla požadavku dá jeho ID: filtr prosazuje hodnotu, kterou si vybral volající, ne tu, kterou dokládá session.',
            'Nic. Dotaz je pořád filtrovaný na tenanta, takže uživatel tenanta A žádné řádky tenanta B nedostane.',
            'Nic, pokud se tělo validuje schématem, které u `tenantId` vyžaduje korektní UUID.',
            'Nic při čtení. Tenhle vzor vadí jen u zápisů, kde chybné ID tenanta poškodí data jiného tenanta.',
          ],
          explanation:
            'Dotaz filtruje podle hodnoty, kterou dodá volající, takže prosazuje jeho tvrzení místo toho, co dokládá session. Odvoď `tenantId` ze session a pole v těle ignoruj; druhá vrstva je politika na úrovni řádků svázaná s tenantem ze session, tedy v databázi, ne v handleru. Tvrzení, že řádek chrání filtr, předpokládá, že útočník filtr nezmění, a změnit ho je celý útok. Kontrola schématem doloží, že hodnota je korektní UUID, nikdy že patří tomuhle uživateli. A čtení není ten mírnější případ: obsah case je ta data, takže přečíst case tenanta B je únik.',
        },
        'fde-v1-diagnostic-q5': {
          prompt:
            'Dashboard pro operátory volá API dodavatele přímo z prohlížeče s klíčem načteným z `import.meta.env.VITE_VENDOR_KEY`. Hodnota je uložená v šifrovaném nastavení proměnných u hostingu a nikdy se necommitovala. Kdo si ten klíč může přečíst?',
          options: [
            'Nikdo mimo build. Hodnota existuje jen v šifrovaném nastavení a vkládá se v době buildu.',
            'Jen ten, kdo se dostane k hostingovému dashboardu, protože minifikace proměnnou ve výstupu přejmenuje.',
            'Kdokoli, kdo si dashboard otevře. Proměnná z buildu se vloží přímo do JavaScriptu, který si prohlížeč stáhne, takže klíč jede v bundlu.',
            'Kdokoli ve stejné síti, pokud se požadavek neposílá přes TLS.',
          ],
          explanation:
            'Vloží se v době buildu znamená vloží se do výsledného artefaktu. Ten literál je v bundlu, v cache prohlížeče i v každé proxy, která odpověď viděla. Oprava je strukturální: přesuň volání za serverovou routu, která klíč drží, a klíč, který už jednou odjel, rotuj. Šifrované nastavení chrání hodnotu v klidu u hostingu, ne poté, co ji build zkopíroval do výstupu. Minifikace přejmenovává identifikátory a řetězcové literály nechává být, takže vyhledat v bundlu tvar klíče je otázka pár sekund. TLS chrání požadavek na cestě a s tajemstvím, které klient už drží, neudělá nic.',
        },
        'fde-v1-diagnostic-q6': {
          prompt:
            'Release 42 přináší migraci, která zkopíruje `legacy_owner` do nového sloupce `owner_id` a `legacy_owner` pak zahodí. Za dvě hodiny nový kód padá na části záznamů. Tým nasadí zpátky release 41. Co tím získal?',
          options: [
            'Funkční systém: nasazení release 41 vrátí zpět i migrace, které pustil release 42.',
            'Release 41 běžící nad schématem bez `legacy_owner`, takže padá na stejných záznamech. Kód se vrátil, schéma ne.',
            'Funkční systém, protože si release 41 při startu podle vlastní historie migrací chybějící sloupec zase vytvoří.',
            'Funkční systém, pokud se nejdřív z aplikačního logu pozpátku přehraje backfill.',
          ],
          explanation:
            'Rollback nasazení vrátí kód. Nevrátí schéma a data ze zahozeného sloupce zpátky nedostane. Release 41 čte `legacy_owner`, který tam už není, takže rollback obnoví předchozí selhání, ne předchozí chování. Migrační nástroje nepouštějí down-migrace jenom proto, že nastartoval starší build; down-migrace je vědomý, zvlášť otestovaný krok a zahození sloupce často vratné vůbec není. Přehrání z aplikačního logu předpokládá, že log obsahuje každou hodnotu a je úplný, což je plán obnovy, ne rollback. Cesta ven je sem se nedostat: přidej `owner_id`, zapisuj do obou sloupců, přesuň čtenáře a `legacy_owner` zahoď až v pozdějším release, kdy už ho žádný cíl rollbacku nepotřebuje.',
        },
        'fde-v1-diagnostic-q7': {
          prompt:
            'Fronta triáže ukazuje spinner, dokud se cases načítají, a pak seznam. Když služba odpoví 503, komponenta si nechá příznak `loading` nastavený a spinner zůstane na obrazovce. Jaká je minimální oprava?',
          options: [
            'Nechat spinner a přidat do hlavičky řádek, že se výsledky můžou opozdit.',
            'Ukázat hlášku o prázdné frontě, protože operátor bez cases i operátor s nepovedeným načtením stejně nemají co dělat.',
            'Dát selhání vlastní stav, který pojmenuje, co se nepovedlo, a nabídne opakování, aby se ukončené načítání nikdy nevykreslovalo jako běžící.',
            'Zalogovat chybu a opakovat pokus každých pět sekund, dokud neprojde.',
          ],
          explanation:
            'Operátor musí poznat „ještě to běží“ od „tohle se nepovedlo“ a opakování musí zmáčknout on. Hláška o zpoždění nechá oba stavy vypadat stejně, což je právě ta vada. Hláška o prázdné frontě je horší než ticho: operátor, který si přečte „žádné cases“, přestane hledat, a fronta může být plná. Tiché opakování schová selhání před jediným člověkem, který by ho eskaloval, a přitom dál buší do služby, která už padá. Opakovat můžeš, s backoffem, a stav i tak ukaž.',
        },
        'fde-v1-diagnostic-q8': {
          prompt:
            'Stisk tlačítka Schválit hned ukáže zelený toast „Case schválen“ a teprve pak odešle POST. Zhruba jeden POST z padesáti selže a na obrazovce se přitom nic nezmění. Co je na tom špatně?',
          options: [
            'Obrazovka řekla operátorovi něco, co není pravda, a jeden case z padesáti je teď schválený v jeho hlavě, ne v systému. Buď počkej na potvrzení zápisu, nebo si optimistickou aktualizaci nech a při selhání ji viditelně vrať zpátky.',
            'Nic. Optimistické aktualizace jsou běžný vzor a dvě procenta selhání jsou u zápisu na pozadí v normální toleranci.',
            'Nic, pokud se neúspěšný požadavek na pozadí opakuje, dokud neprojde.',
            'Toast by měl zůstat na obrazovce déle, aby se operátor ještě díval, až dorazí chyba.',
          ],
          explanation:
            'Hláška o úspěchu je tvrzení o systému a tahle obrazovka ho vysloví dřív, než ho cokoli potvrdí. Optimistická aktualizace je v pořádku, když je návrat skutečný: řádek se vrátí, operátor se to dozví a práce se vrátí do fronty. Míra selhání je důvod navrhnout chybovou cestu, ne rozpočet na nepravdivá tvrzení. Opakování na pozadí může selhat taky, a to už je operátor jinde, takže oprava se k němu pořád musí dostat. Délka toastu řeší zprávu, která dorazí; tady žádná nedorazí.',
        },
        'fde-v1-diagnostic-q9': {
          prompt:
            'Položka Smazat case je v menu řádku hned pod položkou Duplikovat case a maže okamžitě a natrvalo. Operátoři se zhruba jednou týdně trefí do špatného řádku. Která změna to řeší?',
          options: [
            'Přidat potvrzovací dialog. Druhé vědomé kliknutí je to, co odděluje nehodu od úmyslu.',
            'Nechat operátora smazání potvrdit opsáním čísla case.',
            'Povolit mazání jen supervizorům a operátory nechat o smazání žádat.',
            'Udělat smazání vratné, tedy case označit jako smazaný, nechat ho být a po stanovenou dobu nabízet viditelné vrácení zpět, a v menu ho odsunout dál od položky Duplikovat.',
          ],
          explanation:
            'Jednou týdně znamená, že se ta chyba bude dít dál, takže návrh ji musí přežít: vratnost plus odstup od sousední položky, na kterou lidé ve skutečnosti míří. Potvrzovací dialog trochu pomůže proti ujetí myší a vůbec nepomůže operátorovi, který potvrdí špatný řádek, a u týdenní akce se z dialogu do čtrnácti dnů stane reflex. Opisování čísla case zdraží každé oprávněné smazání a pořád nenechá co vracet. Posunutí oprávnění výš posune chybu na někoho jiného a zablokuje běžnou práci; to sedí na vzácnou akci s velkým dosahem, ne na týdenní.',
        },
        'fde-v1-diagnostic-q10': {
          prompt:
            'Model pro směrování cases má přesnost 0,94 na 1 000 oddělených případech (hold-out) proti hranici 0,90. Fakturační případy tvoří 6 % objemu a samy o sobě mají 0,41. Co s tím tým udělá?',
          options: [
            'Nasadí to. Číslo je nad hranicí a fakturace je 6 % provozu.',
            'Vypíše řezy vedle průměru a rozhodne se podle nich. Šedesát fakturačních případů s 0,41 pohne průměrem z 1 000 případů zhruba o tři body, takže žádná hranice na průměru tohle chytit nemohla.',
            'Nasbírá víc fakturačních případů, dokud se ten řez nedostane nad hranici.',
            'Převáží průměr tak, aby malé řezy vážily víc, a vážené číslo drží na stejné hranici.',
          ],
          explanation:
            'Argumentem je ta aritmetika: zbylých 940 případů běží zhruba na 0,974 a přimíchání šedesáti případů s 0,41 stojí asi tři body. Průměr z tisíce případů nedokáže ukázat, že tak malý řez padá, ať je hranice kdekoli. Nasazení podle průměru pošle fakturační případ do špatné fronty šestkrát z deseti, a fakturace je místo, kam chodí otázky o penězích. Sbírání dalších fakturačních případů řez změří přesněji a nezmění ho. Převážení vyrobí jiné jediné číslo, které je pořád jediné číslo: ostatní řezy ho můžou vytáhnout zpátky nad hranici a nikdy neřekne, který řez je rozbitý.',
        },
        'fde-v1-diagnostic-q11': {
          prompt:
            'Tým napsal 120 označkovaných případů a pak dva týdny upravoval prompty, směrovací pravidla a prahy, dokud skóre na těch 120 nestouplo z 0,71 na 0,93. Report uvádí 0,93 jako očekávanou kvalitu v produkci. Co je na tom tvrzení špatně?',
          options: [
            'Těch 120 případů řídilo každé rozhodnutí, takže 0,93 měří, jak dobře na ně návrh sedí. Tvrzení o neviděných případech potřebuje sadu, která se držela stranou a při úpravách návrhu se na ní neskórovalo.',
            'Nic, pokud těch 120 případů vzniklo náhodným výběrem z produkčního provozu.',
            'Nic, pokud se do promptů nezkopíroval text žádného případu.',
            'Nic, co by nespravilo rozdělení: doskóruj hotový návrh na 24 z těch 120 a uveď tohle číslo.',
          ],
          explanation:
            'Sadu prozradí ladění proti skóre, ať je v promptu cokoli. Každý práh, kterým se hnulo, se hnul kvůli těmhle případům, takže výsledné číslo popisuje, jak návrh sedí, ne budoucnost. Náhodný výběr udělá sadu reprezentativní a s prozrazením neudělá nic: reprezentativní sada, proti které jsi optimalizoval, je pořád sada, proti které jsi optimalizoval. Zkopírovaný text případu je jeden způsob, jak sadu prozradit, a ne ten, který se stal tady. A rozdělení udělané až potom dělí případy, které návrh už všechny formovaly; hold-out se musí odložit stranou před laděním a skórovat co nejméně často.',
        },
        'fde-v1-diagnostic-q12': {
          prompt:
            'Dvanáctiminutové živé demo zpracuje tři případy, které si inženýr vybral, a všechny tři správně. Sponzor se ptá, jestli je to připravené na denní frontu 400 případů. Co to demo dokládá?',
          options: [
            'Že je workflow pokryté od začátku do konce a zbylé případy jsou varianty téže cesty.',
            'Ano, s poznámkou, že na reálném provozu bude kvalita kolísat.',
            'Že ta cesta běží a dá správnou odpověď na třech případech, které si inženýr vybral. O úspěšnosti na případech, které nikdo nevybíral, neříká nic, a poctivá odpověď pojmenuje, co se změřilo a co by rozhodnutí o spuštění ještě potřebovalo.',
            'Zatím nic. Pusť to na týden na živou frontu a spočítej stížnosti.',
          ],
          explanation:
            'Tři vlastnoručně vybrané případy jsou důkaz existence: ta cesta umí fungovat. Připravenost je úspěšnost na případech, které sis nevybral, a tu tady nikdo neměří. Označit zbytek za varianty předpokládá přesně to, co by ti řekl označkovaný vzorek. Poznámka není měření; udělá z nepodloženého ano opatrné nepodložené ano. Puštění na živou frontu reálná data přinese, ale bez značek, bez baseline a bez oddělené sady měří trpělivost zákazníků: stížnosti chodí pozdě, z předpojatého řezu a neoddělí chybu ve směrování od zaneprázdněného pondělí.',
        },
      },
    },
    'fde-v1-diagnostic-debug-js': {
      title: 'Stránka, která nikdy nedorazí',
      summary: 'Dvě vady ve sběrači stránek: poslední stránka se nikdy nenačte a do pole volajícího se zapisuje.',
      code: {
        prompt:
          'Startovní kód je rozbitý. Přečti si ho, než ho začneš měnit.\n\n`collectAll(fetchPage, known)` přečte všechny stránky stránkovaného zdroje a vrátí `known` a za ním všechny položky v pořadí stránek. `fetchPage(pageNumber)` bere číslo stránky od 1 a resolvuje na `{ items, pageCount }`, kde `pageCount` je celkový počet stránek a je na každé stránce stejný. `known` je pole ID, které volající už měl.\n\nVady jsou dvě a obě jsou z těch tichých:\n\n- Poslední stránka se nikdy nenačte. Kolekce se vrátí kratší a nikde se neobjeví chyba.\n- Do `known` se místo kopie zapisuje, takže se pole volajícího mění pod rukama.\n\nOprav obě. `fetchPage` je syntetická fixture v paměti, kterou staví hodnoticí kód, se simulovaným zpožděním, jež virtuální hodiny sandboxu vyřídí okamžitě. Žádná síť tu není a žádné API dodavatele taky ne.',
        contract: [
          'Každou stránku načti přes `fetchPage`, které dostaneš; jinudy se ke stránce nedostaneš.',
          'Přečti `pageCount` z první stránky a pak čti stránky 1 až `pageCount` popořadě, každou jednou.',
          'Vrať nové pole. Pole `known`, které volající předal, se musí vrátit přesně takové, jaké přišlo.',
        ],
        hints: [
          'Pusť startovní kód beze změny a za výsledkem vypiš `seen`. Na výstupu jsou špatně dvě věci: chybí `e` a `seen` už není `["seed"]`.',
          'Při `pageCount` rovném 3 musí cyklus, který začíná na stránce 2, proběhnout pro 2 i pro 3. Rozmysli si, které porovnání to udělá.',
          '`const out = known` naváže druhé jméno na totéž pole, takže každý `push` píše do pole volajícího. Zkopírovat položky do nového pole je celá oprava.',
        ],
        approach: [
          'Zkopíruj `known` do nového pole a od té chvíle pushuj do kopie.',
          'Načti stránku 1 a přečti si z ní `pageCount`.',
          'Jeď cyklem od stránky 2, dokud je číslo stránky nejvýš `pageCount`, každý fetch awaituj a jeho položky připoj.',
          'Vrať kopii. Pole, které volající předal, zůstalo nedotčené.',
        ],
        criteria: [
          {
            label: 'Všechny stránky posbírané, v pořadí',
            detail: 'Kontroluj hlavně poslední stránku. A pak zdroj s jedinou stránkou a stránky, které přijdou prázdné.',
          },
          {
            label: 'Pole volajícího zůstalo na pokoji',
            detail: 'Pole `known` se během volání změnilo, nebo je vrácené pole tentýž objekt, jaký volající předal. Zkopíruj ho, než začneš pushovat.',
          },
        ],
        testLabels: [
          'všechny tři stránky včetně poslední',
          'jediná stránka pořád funguje',
          'čtyři stránky, žádná vynechaná',
          'prázdné stránky před tou, na které položka je',
          'to, co volající už měl, jde první',
          'pole volajícího je potom stejné',
          'výsledek je nové pole, ne to předané',
        ],
      },
    },
    'fde-v1-diagnostic-debug-ts': {
      title: 'Větev, která spolkne selhání',
      summary: 'Sjednocení tří výsledků synchronizace zúžené špatným testem, takže se odmítnutý záznam hlásí jako aplikovaný.',
      code: {
        prompt:
          'Startovní kód je rozbitý. Přeloží se, testy padají a důvodem je zúžení (narrowing).\n\n`SyncOutcome` má tři členy: aplikovaný záznam, zařazený záznam se zpožděním `retryAfterMs` a odmítnutý záznam s `error`. `describeOutcome` z něj udělá řádek textu:\n\n- applied → `applied r-1`\n- queued → `queued r-2 in 500ms`\n- rejected → `rejected r-3: MISSING_VAT`\n\nStartovní kód testuje `outcome.state !== \'queued\'`, což platí pro `applied` i pro `rejected`, takže se každý odmítnutý záznam popíše jako aplikovaný. Ta vada je selhání nahlášené jako úspěch: nic nevyhodí výjimku a log synchronizace vypadá čistě.\n\nOprav zúžení tak, aby se každý stav rozhodoval podle svého jména. Hodnotí se i překladač, takže typy musí zůstat čisté.',
        contract: [
          'Každou větev rozhodni podle `outcome.state`, ne podle toho, které vlastnosti zrovna existují.',
          'Nech `SyncOutcome` i signaturu `(outcome: SyncOutcome) => string` tak, jak jsou. Rozšířit kteroukoli na `any` není oprava.',
          'Vracej přesně ten text, který ukazují příklady, včetně přípony `ms` a `: ` před chybou.',
        ],
        hints: [
          'Pusť startovní kód na odmítnutém záznamu. Vypíše řádek s `applied`, protože `state !== \'queued\'` pokrývá `applied` a `rejected` dohromady.',
          'Tři stavy potřebují tři odpovědi. Zeptej se na `\'applied\'` jménem, pak na `\'queued\'` jménem, a poslední `return` ať vyřídí `\'rejected\'`.',
          'Zúžení dělá porovnání `outcome.state` s literálem: uvnitř větve pro rejected je `outcome.error` typu `string` bez přetypování a bez vykřičníku.',
        ],
        approach: [
          'Nejdřív si přečti sjednocení: tři stavy, každý s vlastním polem navíc.',
          'Porovnej `outcome.state` s `\'applied\'` a vrať ten popis.',
          'Porovnej s `\'queued\'` a vrať ten druhý, přičemž `retryAfterMs` čti uvnitř větve, kde existuje.',
          'Popis pro rejected vrať jako poslední, tam už překladač sjednocení zúžil na jediného zbylého člena.',
        ],
        criteria: [
          {
            label: 'Každý stav popsaný, s čistými typy',
            detail: 'Zkontroluj aplikovaný, zařazený i odmítnutý záznam a ujisti se, že překladač na tvém kódu nic nehlásí.',
          },
          {
            label: 'Větev se vybírá podle `state`',
            detail: 'Nějaký výsledek se popsal jako jiný stav. Porovnávej `outcome.state` s každým literálem místo testu, které vlastnosti existují.',
          },
        ],
        testLabels: [
          'aplikovaný záznam',
          'zařazený záznam nese své zpoždění',
          'odmítnutý záznam se nehlásí jako aplikovaný',
          'chyba cestuje s popisem',
          'nulové zpoždění je pořád zpoždění',
          'smíšená dávka drží každý výsledek zvlášť',
          'stejné ID záznamu ve dvou stavech nikdy nepopíše totéž',
        ],
        typeTestLabels: [
          'sjednocení i signatura jsou pořád na místě',
          'aplikovaný výsledek se popíše textem',
          'popis je text, ne číslo',
          'zařazený výsledek bez zpoždění není SyncOutcome',
          'odmítnutý výsledek bez chyby není SyncOutcome',
          'neznámý stav není SyncOutcome',
        ],
      },
    },
  },
};
