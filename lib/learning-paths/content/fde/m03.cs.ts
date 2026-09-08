/** Czech copy for FDE M03. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Identifiers, field names, status codes and the settled English terms a
 * Czech developer keeps — tenant, session, grant, scope, prompt, trace,
 * rollback, row-level security — stay in English and are glossed once. */

import type { ModuleCs } from '../../types';

export const FDE_M03_CS: ModuleCs = {
  title: 'Podnikové hranice',
  outcomes: [
    'Oddělit, kdo volající je, od toho, za koho jedná, a brát tenanta z ověřené session, ne z čehokoli, co napsal volající nebo model.',
    'Omezit dotaz místo filtrování výsledku a umět říct, co filtr po načtení stihl vystavit dřív, než se vůbec spustil.',
    'Rozhodovat o oprávnění v okamžiku použití, aby vypršelý nebo odvolaný grant zastavil další akci, ne až další job.',
    'Napsat auditní záznam, který někdo za půl roku zrekonstruuje, a retenční slib, který jmenuje každou kopii, kterou jsi vyrobil.',
  ],
  lessons: {
    'fde-v1-m03-l1': {
      title: 'Identita a přístup k tenantovi',
      summary:
        'Tři identity v jednom požadavku, proč musí tenant přijít z ověřené session a proč filtr použitý až po načtení není hranice.',
      sections: [
        {
          body:
            'Marlbrookův asistent teď běží uvnitř zákaznických účtů a každý požadavek s sebou nese dvě otázky, ne jednu. Kdo volá a čích dat se to týká? První má odpověď v okamžiku, kdy se někdo přihlásí. Ta druhá je ta, která uniká.',
        },
        {
          body:
            'Autentizace odpovídá na první otázku: server ověřil přihlašovací údaj a ví, že mluví s uživatelem USR-31. Autorizace odpovídá na užší otázku: smí tenhle volající provést tuhle akci nad tímhle záznamem, právě teď? Systém, který má první část v pořádku a druhou bere jako formalitu, je ten systém, který ukáže firmě Dunfold Freight objednávku patřící firmě Kestrel Foods.',
        },
        {
          caption: 'Čtyři věci, které jedno volání nástroje nese a které všechny vypadají jako identita — a jen jedna z nich rozhoduje o tenantovi.',
          headers: ['Co to je', 'Odkud to přichází', 'O čem to smí rozhodovat'],
          rows: [
            [
              'Principal, tedy ověřený uživatel',
              'Session, kterou server ověřil při přihlášení operátora',
              'Které granty platí a čí jméno půjde do auditního záznamu',
            ],
            [
              'Tenant, tedy oddělený zákaznický prostor',
              'Údaj na téže ověřené session, pevně daný při přihlášení',
              'Nad čími řádky smí dotaz vůbec sáhnout',
            ],
            [
              'Identita služby',
              'Databázový přístup, který drží samotný proces',
              'O tomhle požadavku nic; obvykle přečte každého tenanta, a proto to nikdy není odpověď',
            ],
            [
              'Argumenty nástroje',
              'Model, z textu, který si před chvílí přečetl',
              'Filtry uvnitř tenanta, kterého už session určila, a nic širšího',
            ],
          ],
        },
        {
          body:
            'Třetí řádek je past, která má vlastní jméno. Tvůj proces drží přístup, kterým přečte každého tenanta, protože je obsluhuje všechny. Když kód nechá volajícího vybrat, na který tenant se ten přístup namíří, volající si vypůjčil pravomoc, kterou nikdy neměl. Specifikace Model Context Protocolu říká výslovně, že argumenty volání nástroje vybírá model a že za to, co s nimi nástroj smí udělat, odpovídá host, ne model.',
        },
        { caption: 'Jeden argument posunutý o kus vedle. První verze je fungující funkce a zároveň čtení přes hranici tenanta.' },
        {
          body:
            'Argumenty nástrojů, načtené dokumenty i výstup modelu jsou nedůvěryhodný obsah. Žádný z nich nesmí vybrat tenanta, autorizovat akci ani rozšířit oprávnění, a žádná instrukce přidaná do promptu na tom nic nezmění. Formulace není kontrola. Kontrolou musí být kód, který se provede bez ohledu na to, oč model požádal, a to na cestě, kterou požadavek opravdu jde.',
        },
        {
          body:
            'Druhý zvyk, který neprojde revizí, je filtrování až po načtení. Načti všechny objednávky v úložišti, nech si ty, jejichž `tenantId` sedí, a vrať je. Výstup je správně. Hranice tam ale není.',
        },
        { caption: 'Filtr je krok ve tvém kódu. Dotaz omezený na tenanta je slib, který za tebe drží úložiště.' },
        {
          body:
            'Mezi načtením a filtrem jsou Kestrelovy řádky ve tvém procesu. Výjimka vyhozená mezi těmi dvěma řádky je pošle do reportéru chyb i s payloadem. Logovací řádek zapsaný před filtrem oznámí počet přes oba tenanty. Součet, velikost stránky nebo klíč do cache spočítaný nad celou množinou odnesou tutéž informaci v menším tvaru. A ten filtr sám je jeden predikát, jeden inženýr a jedno code review od toho, aby byl na jedno odpoledne špatně.',
        },
        {
          caption: 'Jedno volání nástroje, jehož argumenty žádají špatného tenanta, krok po kroku obalem. Přečti si poznámky dřív, než se podíváš na opravu ve cvičení.',
          notes: [
            'Asistent navrhuje jedno volání: orders.read s argumenty { status: "open", tenantId: "TEN-7788" }. Zatím není rozhodnuto nic.',
            'Session byla ověřena při přihlášení: uživatel USR-31, tenant TEN-4021, Dunfold Freight. Ten údaj vznikl vlastní kontrolou tokenu na serveru, ne z těla požadavku.',
            'Obal si přečte argumenty. `status` je filtr, který model vybrat smí. `tenantId` se tady zahodí a už se na něj nikdy nesáhne.',
            'Tenant je TEN-4021, převzatý ze session. Argument žádající TEN-7788 nezměnil nic a volání, které ho neslo, vrátí přesně totéž co totéž volání bez něj.',
            'Grant orders.read pro TEN-4021 vyprší v 17:00 a požadavek přišel v 09:00, takže platí. Grant se stejným scope vydaný pro TEN-7788 by na tuhle session nesedl vůbec.',
            'Úložiště dostane dotaz na otevřené objednávky tenanta TEN-4021. Kestrelovy řádky se nikdy nenačtou, takže je nemusí odstraňovat žádný filtr a nemůže je spočítat žádný log.',
            'Vrátí se dvě objednávky. Obal vrací id, tenanta, stav a částku a zahodí jméno zákazníka, na které se nikdo neptal.',
          ],
        },
        {
          body:
            'Udělej obojí, a mysli to vážně. Omez dotaz v aplikaci a nech úložiště pod tebou vynucovat totéž pravidlo přes row-level security nebo přes přístup vydaný pro jediný tenant. Dvě nezávislé kontroly udělají z chyby v obalu chybu místo úniku dat, a bezpečnostní revizor zákazníka se tě zeptá, kterou z těch dvou máš.',
        },
        {
          body:
            'RFC 9110 odděluje 401 Unauthorized, které říká, že požadavek neměl platné přihlašovací údaje pro daný zdroj, od 403 Forbidden, kde server rozumí a odmítá. Zároveň serveru dovoluje odpovědět 404 místo přiznání, že zdroj existuje. Využij to: záznam v jiném tenantovi a záznam, který nikdy nevznikl, mají vypadat stejně, jinak se z chybové hlášky stane způsob, jak si vypsat tvoje zákazníky.',
        },
        {
          body:
            'Napiš to pravidlo tam, kde na něj další inženýr narazí. Jedna věta nahoře v obalu, že tenant přichází ze session a argumenty smí jen zúžit uvnitř něj, stojí míň než schůzka nad prvním čtením přes hranici tenanta. A je to přesně ta věta, kterou tě cvičení na konci tohoto modulu žádá převést do kódu.',
        },
      ],
    },
    'fde-v1-m03-l2': {
      title: 'Životní cyklus dat a audit',
      summary:
        'Každá kopie, kterou jsi vyrobil, mazání, které opravdu maže, auditní záznam, ze kterého se dá po půl roce něco zrekonstruovat, a rozdíl mezi vypršelým a odvolaným oprávněním.',
      sections: [
        {
          body:
            'První otázka bezpečnostní revizorky z Dunfoldu není, jak asistent funguje. Ptá se, co si nechává, jak dlouho a co se stane v den, kdy jejich právní oddělení pošle žádost o výmaz. Když je odpovědí pokrčení rameny, projekt skončí u jejího stolu, a udělá dobře.',
        },
        {
          body:
            'K odpovědi potřebuješ seznam kopií, které jsi vyrobil, a ten je vždycky delší než návrhový dokument. Jeden ticket, který asistent jednou přečetl, skončí v primárním řádku, v cache odpovědí, v odvozeném indexu, ve třech řádcích logu, v reportu chyby z odpoledne, kdy to spadlo, ve včerejší záloze a v CSV, které si operátor vyexportoval, aby si něco ověřil. Retenční politika, která jmenuje jen tu první kopii, popisuje jednu ze sedmi. Rámec NIST AI Risk Management Framework tohle řadí pod funkci Govern: rozhodnutí o retenci má svého vlastníka a je sepsané dřív, než systém běží, ne až odpoledne, kdy dorazí žádost o výmaz.',
        },
        {
          caption: 'Kde skončí jeden ticket, kdo každou kopii vyrobil a co s ní musí udělat mazání.',
          headers: ['Kopie', 'Kdo ji vyrobil', 'Co s ní musí udělat mazání'],
          rows: [
            ['Primární řádek', 'Tvoje synchronizace při prvním načtení', 'Odstranit ho, a říct, jestli odstranění znamená pryč, nebo jen skrytý'],
            ['Cache odpovědí', 'Tvoje vlastní čtecí cesta, kvůli rychlosti', 'Zneplatnit klíč, jinak smazaný ticket odpovídá dál po celou dobu TTL'],
            ['Odvozený index', 'Job, který po načtení spočítal embeddingy nebo fulltext', 'Smazat i odvozené řádky; je to tentýž ticket v jiném tvaru'],
            ['Logy aplikace', 'Každý handler, který zalogoval payload místo id', 'Nic, pokud jsi logoval id. Přepis, který neuděláš, pokud jsi logoval těla'],
            ['Report chyby', 'Pád, který k sobě přibalil payload požadavku', 'Vyčistit ho a přestat payloady přikládat dřív, než přijde další'],
            ['Včerejší záloha', 'Plánovaný snapshot', 'Dneska nic. Místo toho uveď retenční okno a datum, kdy ta kopie vyprší'],
            ['Export operátora', 'Člověk, v tabulce', 'Nic, co máš pod kontrolou. Řekni to nahlas, místo abys naznačoval, že tam dosáhneš'],
          ],
        },
        {
          body:
            'Pak se rozhodni, co mazání znamená, a použij to slovo, které jsi myslel. Nastavit `deletedAt` skryje řádek před tvými dotazy. Je to legitimní návrh s legitimními důvody, ať už jde o okno na vrácení, o cizí klíč, na kterém někdo závisí, nebo o fakturu, kterou musíš držet kvůli zákonu. Je to ale změna viditelnosti, a říct zákazníkovi, že jsou jeho data smazaná, když je `SELECT` bez toho filtru pořád vrátí, je tvrzení, které budeš muset odvolat.',
        },
        { caption: 'Druhá verze maže i odvozené kopie a nechává po sobě záznam o tom, že se to stalo, ne ta data.' },
        {
          body:
            'Zálohy jsou slib, který se nejčastěji přehání. Upravit jeden řádek uvnitř nočního snapshotu je drahé a často nemožné, takže většina systémů ze záloh na požádání mazat neumí. Napiš do smlouvy poctivou verzi: záznam je od dneška pryč z provozních systémů a poslední záloha, která ho obsahuje, vyprší k uvedenému datu. S tím se zákazník naplánovat umí. Se slibem, který se potichu nedodrží, ne.',
        },
        {
          body:
            'Audit je druhá polovina životního cyklu a má jednu zkoušku. Za půl roku si někdo, kdo u toho nebyl, přečte jeden záznam a musí z něj umět říct, kdo co udělal, s čími daty, na základě jakého oprávnění a jak se systém rozhodl. Když kvůli tomu musí otevřít kód, ten záznam neprošel.',
        },
        { caption: 'Jeden záznam, který zkouškou rekonstrukce projde. Jmenuje id, nikdy ne samotné řádky objednávek.' },
        {
          caption: 'Každé pole toho záznamu a otázka, na kterou revizor bez něj neodpoví.',
          headers: ['Pole', 'Na co odpovídá', 'Co stojí jeho absence'],
          rows: [
            ['`actor`', 'Který člověk nebo která služba jednala', 'Každý záznam říká „udělal to asistent“ a nikdo za to neodpovídá'],
            ['`onBehalfOfTenant`', 'Čích dat se to týkalo', 'Nerozeznáš běžné čtení od čtení přes hranici tenanta'],
            ['`action` a `targetIds`', 'Co se stalo a nad kterými záznamy', 'Víš, že se něco stalo, a ne co'],
            ['`decision` a `reason`', 'Povoleno, nebo odmítnuto, a na jakém základě', 'Odmítnutí zmizí a útok vypadá jako ticho'],
            ['`grantId`, `policyVersion`', 'Které oprávnění a která verze pravidel platily', 'Po změně pravidel to rozhodnutí už nezopakuješ'],
            ['`at` v UTC, `requestId`', 'Kdy, a ke kterému požadavku to patří', 'Nespojíš záznam s trace ani s logy vedle něj'],
          ],
        },
        {
          body:
            'Zapisuj odmítnutí stejně hlasitě jako povolení. Log, ve kterém jsou jen povolení, ti neukáže odpoledne, kdy někdo zkusil čtyřicet volání nástrojů proti cizímu tenantovi a pokaždé narazil. A zapisuj id, ne těla: auditní záznam, který si do sebe zkopíruje řádky objednávek, se právě stal sedmou kopií dat, s vlastní retencí a vlastním seznamem přístupů.',
        },
        {
          body:
            'Poslední rozdíl je ten, který lidé pod tlakem pletou. Vypršení je časové razítko, které už všichni drží, takže nemusí nikam doputovat žádná zpráva a nikdo nemusí být dostupný. Odvolání je událost: někdo se o ní musí dozvědět. Mezi zápisem do úložiště oprávnění a zneplatněním nacachované kopie na tvé straně odvolaný grant pořád funguje, a přesně tohle okno útočník využije.',
        },
        {
          caption: 'Čtyři stavy, ve kterých oprávnění může být, co udělá obal a co si zapíše audit.',
          headers: ['Stav', 'Co udělá obal', 'Co si zapíše záznam'],
          rows: [
            ['Platný grant', 'Provede akci uvnitř tenanta, na který grant zní', '`allow`, s id grantu a verzí pravidel'],
            ['Vypršel', 'Odmítne další akci; hodiny mu to řekly samy, bez jediné zprávy', '`deny`, důvod `grant_expired`, s časem vypršení'],
            ['Odvolaný', 'Odmítne, jakmile o odvolání ví; jak brzy to bude, rozhodne délka cache', '`deny`, důvod `grant_revoked`, s tím, kdo ho odvolal a kdy'],
            ['Nikdy nevydaný', 'Odmítne stejnou odpovědí, jakou dá na záznam v cizím tenantovi', '`deny`, důvod `no_grant`, se scope, o který volající žádal'],
          ],
        },
        {
          caption: 'Export 60 objednávek, který přeteče přes vlastní grant. Projdi si to: rozhoduje kontrola před další dávkou, ne ta na začátku.',
          notes: [
            'Operátorka spouští v 16:50 export 60 objednávek Dunfoldu. Její grant pro TEN-4021 vyprší v 17:00, čehož si nikdo nevšiml.',
            'Obal kontroluje grant před první dávkou. Zbývá deset minut, takže export začíná.',
            'První dávka v 16:53. Grant se kontroluje znovu, platí, a zapíše se 20 řádků.',
            'Druhá dávka v 16:58. Pořád platí, dalších 20 řádků. Job, který kontroluje jen na začátku, by teď byl dvě minuty od zápisu řádků, na které nemá oprávnění.',
            'Třetí dávka v 17:01. Grant vypršel v 17:00, takže kontrola odmítá a nezapíše se ani řádek. Job se tady zastaví, místo aby dodělal, co začal.',
            'Audit si zapíše jedno deny: aktér USR-31, tenant TEN-4021, akce orders.export, grant GRT-77, důvod grant_expired, 40 ze 60 řádků už zapsáno. Operátorka si vyžádá nový grant a pokračuje od řádku 41 místo hádání.',
          ],
          counterLabels: ['Zapsané řádky', 'Zapsané řádky', 'Zapsané řádky', 'Zapsané řádky', 'Zapsané řádky', 'Zapsané řádky'],
        },
        {
          body:
            'Kontroluj tedy v okamžiku použití. Jedna kontrola na začátku jobu autorizuje práci neomezené délky a čím delší job, tím širší mezera mezi tím, co platilo tehdy, a tím, co platí teď. Kontrola před každou akcí stojí jedno vyhledání, které jsi stejně chtěl cachovat, a udělá z „grant vypršel uprostřed exportu“ odmítnutí s počtem řádků vedle sebe, ne incident.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m03-l1-read': {
      title: 'Čtení: identita a přístup k tenantovi',
      summary: 'Principal, tenant a identita služby; argumenty, které smí zúžit, ale ne posunout; a co filtr po načtení stihl vystavit.',
    },
    'fde-v1-m03-l2-read': {
      title: 'Čtení: životní cyklus dat a audit',
      summary: 'Každá vyrobená kopie, mazání proti skrývání, pole, která auditní záznam potřebuje k rekonstrukci, a vypršení proti odvolání.',
    },
    'fde-v1-m03-checks': {
      title: 'Kontrola hranic',
      summary: 'Čtyři otázky: odkud přichází tenant, co filtr po načtení stihl vystavit, co udělá vypršení grantu s rozpracovaným jobem a který auditní záznam se dá zrekonstruovat.',
      questions: {
        'fde-v1-m03-q1': {
          prompt:
            'Marlbrookův asistent čte objednávky jménem přihlášeného operátora. Volání nástroje dorazí s argumenty, které napsal model. Odkud musí obal vzít id tenanta, se kterým se dotazuje?',
          options: [
            'Ze session, kterou server ověřil při přihlášení a která tenanta určila dřív, než se z tohoto požadavku cokoli přečetlo.',
            'Z argumentu `tenantId` u volání nástroje, po ověření, že jmenuje tenanta, kterého úložiště zná.',
            'Z hlavičky `X-Tenant-Id`, kterou posílá klient, po ověření, že operátor do toho tenanta patří.',
            'Z pole `tenantId` na samotných záznamech, jakmile je dotaz vrátí.',
          ],
          explanation:
            'Tenant je údaj, který server ustavil při ověření přihlašovacích údajů, a nic pozdějšího v požadavku ho nesmí změnit. Argument nástroje píše model z textu, který si právě přečetl, takže ověření, že jmenuje existujícího tenanta, dokazuje jen to, že útočník vybral existujícího. Hlavičku píše klient; kontrola členství ji zlepší a pořád nechá operátora, který patří do dvou tenantů, vystupovat jako kterýkoli z nich v požadavku, kde tenanta určila session. Číst tenanta z vrácených řádků je ten filtr po načtení, a v tu chvíli už jsou řádky v tvém procesu.',
        },
        'fde-v1-m03-q2': {
          prompt:
            'Kolega načte všechny objednávky v úložišti a v handleru je vyfiltruje podle `tenantId`, než je vrátí. Ten filtr sám o sobě chybu nemá a v odpovědi jsou jen objednávky volajícího. Proč to pořád není hranice tenanta?',
          options: [
            'Porovnání dvou id tenantů v JavaScriptu se může lišit od porovnání v databázi, takže filtr může nechat projít řádek, který by úložiště vyloučilo.',
            'Řádky obou tenantů jsou v procesu dřív, než filtr proběhne, takže je odnese logovací řádek, report chyby nebo součet spočítaný nad celou množinou, a ty dva zákazníky dělí jediný predikát.',
            'Řádky navíc udělají požadavek dost pomalý na to, aby pod zátěží vypršel, a požadavek, kterému vypršel čas, vrátí nevyfiltrovanou množinu.',
            'Filtr nevidí řádky zapsané po spuštění dotazu, takže volajícímu chybí jeho nejnovější objednávky.',
          ],
          explanation:
            'K vystavení dojde před filtrem, ne v něm: načtení už vtáhlo cizího tenanta do paměti, do čehokoli, co zalogovalo počet, a do každého reportu z pádu mezi těmi dvěma řádky. Porovnávání a collation je skutečné riziko v jiné diskusi a vedlo by ke špatnému výsledku, ne k tomuhle. Argument o latenci je obrácený: rychlý únik je pořád únik a požadavek, kterému vypršel čas, vrátí chybu, ne surová data. Poslední možnost popisuje zastaralost dat, která se dotazu omezeného na tenanta týká úplně stejně.',
        },
        'fde-v1-m03-q3': {
          prompt:
            'Exportní job zapisuje 60 objednávek ve třech dávkách. Grant operátorky platí, když job začíná, a vyprší mezi druhou a třetí dávkou. Co musí obal udělat?',
          options: [
            'Doběhnout: grant byl při startu jobu zkontrolovaný a platný a opakovaná kontrola uprostřed dělá z dlouhých exportů nespolehlivou věc.',
            'Doběhnout, ale označit zbývající řádky k revizi, protože vypršení ukončuje budoucí autorizace, zatímco odvolání ukončuje ty právě probíhající.',
            'Odmítnout třetí dávku, zastavit job a zapsat odmítnutí spolu se 40 řádky, které už jsou zapsané.',
            'Prodloužit grant na zbývající dávky, protože operátorka byla při začátku práce autorizovaná a nikdo jí oprávnění neodebral.',
          ],
          explanation:
            'Autorizace se rozhoduje v okamžiku použití, takže rozhoduje kontrola před třetí dávkou, a audit potřebuje počet řádků, jinak nikdo později nezjistí, kde se export zastavil. Kontrola jen na začátku autorizuje práci neomezené délky, a přesně tak zaplatí desetiminutový grant čtyřhodinový job. Vypršení a odvolání se neliší v tom, kdy nabydou účinku; liší se v tom, jak se ta zpráva dostane k tobě. Prodloužení grantu je obal, který si sám uděluje oprávnění, a vypršení je jediná páka, kterou správce zákazníka opravdu drží.',
        },
        'fde-v1-m03-q4': {
          prompt:
            'Níže jsou čtyři kandidátské auditní záznamy o tomtéž čtení. Za půl roku musí někdo, kdo u toho nebyl, říct, kdo co udělal, s čími daty, na základě jakého oprávnění a jak se systém rozhodl. Který záznam to unese?',
          options: [
            'C, protože jmenuje člověka, tenanta, za kterého jednal, dotčená id, rozhodnutí, grant a verzi pravidel za ním, a request id, kterým se to spojí s trace.',
            'B, protože ukládá samotné řádky, takže revizor vidí přesně, která data ze systému odešla, aniž by musel čemukoli věřit.',
            'A, protože revizor stejně čte prostou větu a časové razítko v UTC stačí k dohledání odpovídajícího požadavku v logu.',
            'D, protože je to nejmenší záznam, který pořád nese aktéra, akci a rozhodnutí, a krátké záznamy jsou ty, které tým opravdu píše dál.',
          ],
          explanation:
            'C odpovídá na všechny čtyři otázky a ukazuje na trace i na verzi pravidel, takže se rozhodnutí dá zopakovat i po změně pravidel. B si kopíruje řádky objednávek do logu, čímž vzniká další kopie dat s vlastní retencí, a pořád neříká, o kterého tenanta ani o který grant šlo. A nemá aktéra, tenanta ani id, takže je to věta, ne záznam. D zapisuje jako aktéra software a místní čas bez data a bez zóny, což je přesně ten záznam, který za půl roku nespojíš s ničím.',
        },
      },
    },
    'fde-v1-m03-tenant-tool-wrapper': {
      title: 'Obal nástroje omezený na tenanta',
      summary:
        'Oprav obal, který věří argumentu s tenantem od volajícího, kontroluje oprávnění jen tehdy, když nějaké je, a filtruje až po načtení. Hodnotí se chování, izolace tenantů a čerstvost oprávnění.',
      code: {
        prompt:
          'Oprav `callTool(session, request, store)`, obal, kterým v Marlbrooku prochází každé volání nástroje. Vrací `{ ok: true, records }`, když je volání povolené, a `{ ok: false, reason }`, když je odmítnuté.\n\n`session` je to, co server ověřil při přihlášení: `userId`, `tenantId`, `at` (ISO čas, kdy tenhle požadavek dorazil) a `grants`, vždycky pole objektů `{ scope, tenantId, expiresAt, revokedAt }`. `request` je to, co navrhl asistent: `tool` a obvykle `arguments`. `store` je zákaznická databáze.\n\nVerze, kterou jsi dostal, skoro funguje, a scratch pad ukazuje, co to „skoro“ stojí: tenanta bere z `request.arguments`, vypršení kontroluje jen tehdy, když nějaký grant náhodou našel, a načte řádky všech tenantů a filtruje je až potom. Oprav všechny tři věci.\n\nCo musí dělat, v tomhle pořadí:\n\n1. **Neznámý nástroj odmítne jako první.** Tenhle obal obsluhuje `orders.read` a nic jiného. Jakýkoli jiný `tool` vrátí `{ ok: false, reason: \'unknown_tool\' }` dřív, než se prohlédne cokoli dalšího.\n2. **Tenant přichází ze session.** Dotazuj se na `session.tenantId`. `request.arguments.tenantId` napsal model, takže ho nečti nikdy: volání, které ho nese, musí vrátit přesně totéž co totéž volání bez něj. `arguments` můžou úplně chybět.\n3. **Grant musí sedět na scope i na tenanta.** Použij grant, jehož `scope` se rovná nástroji a jehož `tenantId` se rovná `session.tenantId`. Když žádný takový není, vrať `{ ok: false, reason: \'no_grant\' }`, a to i tehdy, když session nese grant se stejným scope vydaný jinému tenantovi.\n4. **Neaktuální grant odmítne.** Grant je odvolaný, když je `revokedAt` nastavené a padne na `session.at` nebo dřív; to dá `{ ok: false, reason: \'grant_revoked\' }`. Grant je vypršelý, když `expiresAt` padne na `session.at` nebo dřív; to dá `{ ok: false, reason: \'grant_expired\' }`, protože přesně v okamžiku vypršení už je vypršelý. Když platí obojí, hlas `grant_revoked`. `revokedAt` pozdější než `session.at` ještě nenabylo účinku.\n5. **Odmítni dřív, než čteš.** Každé odmítnutí proběhne dřív, než se sáhne na úložiště, takže odmítnuté volání neudělá ani jedno čtení.\n6. **Dotazuj se uvnitř tenanta.** `store.queryOrders(tenantId, { status })` vrátí jen řádky toho tenanta. `store.scanAll()` vrátí řádky všech tenantů a je tu proto, aby hodnocení vidělo, jestli jsi ho použil. `arguments.status` je filtr, který volající vybrat smí: předej ho dál, a když chybí, nepředávej nic.\n\nVrácený záznam je přesně `{ id, tenantId, status, total }`, v pořadí, v jakém je vrátilo úložiště. Pole `customer` na řádku do odpovědi nepatří.\n\nÚložiště, session i granty jsou fixtures napsané pro tohle cvičení. Není tu žádná živá databáze, žádný model ani žádná síť: „argumenty od modelu“ jsou objektový literál v testu a silnější instrukce v promptu by na ničem z toho nic nezměnila.',
        contract: [
          '`store.queryOrders(tenantId, filter)` je jediné čtení, které tenhle obal smí udělat. `store.scanAll()` je tu proto, aby hodnocení vidělo filtrování až po načtení, a jeho použití shodí kritérium tenanta i tehdy, když jsou vrácené záznamy správné.',
          'Tenant přichází z `session.tenantId`. `request.arguments` smí výsledek zúžit přes `status` a nikdy nesmí rozhodovat, který tenant se čte.',
          'Rozhodni o oprávnění dřív, než se čte úložiště: odmítnuté volání neudělá ani jedno čtení.',
          '`session.grants` je vždycky pole a nese nejvýš jeden grant na kombinaci scope a tenanta. `request.arguments` můžou chybět.',
          'Úložiště i session přicházejí z harness úlohy. Nedefinuj si vlastní `__store` ani `__session` a nesahej po síti, hodinách ani skutečné databázi.',
        ],
        hints: [
          '`session.tenantId` je jediný tenant, o kterém tahle funkce ví. Z `request.arguments` čti `status` a nic jiného; smazat řádek, který čte `arguments.tenantId`, je většina první opravy.',
          'Grant sedí, jen když sedí obě půlky: `session.grants.find(one => one.scope === request.tool && one.tenantId === session.tenantId)`. Grant se stejným scope vydaný jinému tenantovi musí minout.',
          'Okamžiky porovnávej přes `Date.parse`. Grant, jehož `expiresAt` se rovná `session.at`, už vypršel; `revokedAt` pozdější než `session.at` ještě nenabylo účinku. Obě kontroly patří nad volání `store.queryOrders`, aby odmítnutí nic nepřečetlo.',
        ],
        approach: [
          'Nejdřív odmítni neznámý nástroj: cokoli jiného než `orders.read` vrátí `{ ok: false, reason: \'unknown_tool\' }`.',
          'Vezmi tenanta z `session.tenantId` a z `request.arguments` čti jen `status`, s prázdným objektem jako výchozí hodnotou, když argumenty chybí.',
          'Najdi grant, který sedí na nástroj i na tenanta ze session, a když žádný není, odmítni s `no_grant`.',
          'Rozparsuj `session.at` jednou, pak odmítni s `grant_revoked`, když je `revokedAt` nastavené a padne na ten čas nebo dřív, a s `grant_expired`, když na něj nebo dřív padne `expiresAt`.',
          'Teprve teď zavolej `store.queryOrders(session.tenantId, { status })` a namapuj každý řádek na `{ id, tenantId, status, total }`.',
        ],
        testLabels: [
          'operátor vidí tři objednávky svého vlastního tenanta',
          'záznam nese id, tenanta, stav a částku a zahazuje jméno zákazníka',
          'argument status zúží výsledek uvnitř tenanta',
          'neznámý nástroj odmítne a k úložišti se vůbec nedostane',
          'argument žádající jiného tenanta nezmění nic',
          'úložiště se dotáže jednou, uvnitř tenanta ze session',
          'session bez grantu je odmítnutá',
          'grant, který vypršel před hodinou, je odmítnutý',
          'grant odvolaný včera je odmítnutý, i když nevypršel',
        ],
        criteria: [
          {
            label: 'Správné výsledky, odmítnutí a tvar záznamu',
            detail:
              'Chování je někde mimo hraniční kontroly špatně. Ověř, že neznámý nástroj odmítne s `unknown_tool` dřív, než se provede cokoli dalšího, že chybějící objekt `arguments` nevyhodí výjimku, že `status` výsledek zúží, že záznam je přesně `{ id, tenantId, status, total }` bez `customer` a že si záznamy drží pořadí, ve kterém je vrátilo úložiště.',
          },
          {
            label: 'Záznam z jiného tenanta se nikdy nevrátí, ať jsou argumenty jakékoli',
            detail:
              'Hranice tenanta nedržela. Buď se k volajícímu dostal záznam z jiného tenanta, nebo `request.arguments.tenantId` změnil, které řádky se čtou, nebo tuhle session autorizoval grant patřící jinému tenantovi, nebo se úložiště přečetlo přes `scanAll` a filtrovalo se až potom. Filtr použitý po načtení není hranice: řádky cizího tenanta už byly v procesu, když se spustil.',
          },
          {
            label: 'Vypršelý nebo odvolaný grant odmítne',
            detail:
              'Kontrola oprávnění proběhla pozdě, volně, nebo vůbec. Session bez odpovídajícího grantu musí dát `no_grant`, grant, jehož `expiresAt` padne na `session.at` nebo dřív, musí dát `grant_expired`, grant odvolaný v `session.at` nebo dřív musí dát `grant_revoked` i tehdy, když zároveň vypršel, odvolání datované po požadavku odmítnout nesmí, a každé z těch odmítnutí musí proběhnout dřív, než se čte úložiště.',
          },
        ],
      },
    },
  },
};
