/** Czech copy for M02. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Identifiers, HTTP header names, status codes and the terms a Czech
 * developer keeps in English (cursor, jitter, payload, fixture, tenant) stay
 * as they are, glossed once where they first appear. */

import type { ModuleCs } from '../../types';

export const FDE_M02_CS: ModuleCs = {
  title: 'Integrace a data',
  outcomes: [
    'Přečíst payload proti jeho dokumentaci, říct, která pole jsou opravdu zaručená, a ověřit je na hranici místo důvěry ve schéma.',
    'Říct, co tvůj kód udělá se záznamem, který nejde použít, a takové záznamy počítat místo tichého zahazování.',
    'Rozhodnout, které chyby smí klient opakovat sám a které potřebují idempotenční klíč nebo člověka.',
    'Počkat tu dobu, o kterou přiškrcený server požádal, a když neřekl nic, couvat exponenciálně s jitterem.',
    'Napsat synchronizaci, která přežije opakované doručení i stránkované čtení a při druhém spuštění vrátí totéž.',
  ],
  lessons: {
    'fde-v1-m02-l1': {
      title: 'Kontrakty a data, která opravdu dostaneš',
      summary:
        'Dokumentovaný tvar proti tvaru na drátě, pole, která jsou v praxi prázdná a v dokumentaci povinná, překvapení s kódováním a kam patří validace.',
      sections: [
        {
          body:
            'Zákazník ti podá dokumentaci k API a klíč. Dokumentace popisuje systém, který někdo chtěl postavit. Drát ti ukáže ten, který provozují. První úkol na každé integraci je najít vzdálenost mezi obojím, dřív než napíšeš kód, který spoléhá na to první.',
        },
        {
          body:
            'Rozdíl bývá málokdy dramatický. Marlbrook má `customerId` v dokumentaci jako povinný string. Stáhni tisíc ticketů a jedenáct z nich nese prázdný řetězec, protože tickety založené z veřejného webového formuláře nemají účet, dokud ho agent nepřipojí. Nikdo nelhal. To pole bylo povinné, když endpoint v roce 2021 vznikl, formulář vyšel v roce 2024 a dokumentace nikdy nebyla to, co se vynucuje.',
        },
        {
          caption: 'Čtyři rozdíly z jednoho týdne čtení Marlbrookova feedu ticketů a co tě každý z nich stojí, když ho najdeš až v produkci.',
          headers: ['Dokumentace říká', 'Co přijde', 'Co tě to bude stát později'],
          rows: [
            [
              '`customerId`: string, povinný',
              'Prázdný řetězec u ticketů z veřejného formuláře',
              'Join proti tabulce zákazníků nic nevrátí a synchronizace zapíše řádky bez vlastníka',
            ],
            [
              '`priority`: jedno z low, normal, high',
              '`urgent`, z workflow pravidla přidaného minulý kvartál',
              'Switch bez větve default tiše zařadí nejhlasitější tickety mezi normální',
            ],
            [
              '`openedAt`: časové razítko ISO 8601',
              '`2026-03-02 02:14:00`, bez `T`, bez offsetu, v místním čase podpory',
              'Každý ticket se dvakrát ročně posune o hodinu a report nikdo nezreprodukuje',
            ],
            [
              '`tags`: pole řetězců',
              '`null` u ticketů migrovaných ze starého systému',
              '`tags.map` vyhodí výjimku uvnitř cyklu a synchronizace umře na záznamu 4 113 z 9 000',
            ],
          ],
        },
        { caption: 'Jeden ticket v reálném tvaru. Každé pole je přítomné a otypované a čtyři z nich jsou nepoužitelná.' },
        {
          body:
            'Všimni si, co ten payload nedělá: nic nevynechává. Kontrola schématu, která se ptá jen „je `customerId` string“, ho pustí dál. Přítomnost a použitelnost jsou dvě různé otázky a tvůj kód závisí na té druhé. Prázdný řetězec, null uvnitř objektu, který existuje, datum, které se naparsuje do špatné hodiny — to všechno projde kontrolou tvaru a rozbije se o krok dál.',
        },
        {
          body:
            'Dej tu kontrolu na hranici. Jedna funkce udělá z toho, co přišlo, buď záznam, na který se dá spolehnout, nebo uvedený důvod, proč to nejde, a nic za ní už nic nekontroluje znovu. Ta druhá varianta rozseje `if (ticket.customerId)` do šesti míst, z nichž pět se shoduje a jedno ne.',
        },
        { caption: 'Hranice, která vrátí záznam, nebo důvod. `text` sloučí chybějící hodnotu, null i samé mezery do jednoho případu.' },
        {
          body:
            'Záznam, který nejde použít, je rozhodnutí, ne pád. Spočítej ho, ulož důvod a vypiš počet vedle úspěchů. „Zesynchronizováno 412 ticketů“ zamlčí těch jedenáct zahozených; „412 zesynchronizováno, 11 přeskočeno: chybí customerId“ je věta, se kterou vedoucí podpory něco udělá, a je to ta věta, ze které poznáš, kdy se z jedenácti stane devadesát.',
        },
        {
          body:
            'Kódování je druhá rodina překvapení a bolí nejvíc, když pole používáš jako klíč. Dva řetězce, které na obrazovce vypadají stejně, se můžou lišit bajt po bajtu. Koncová mezera z CSV exportu, nezlomitelná mezera vložená z tabulky, nebo `é` zapsané v jednom systému jako jeden kódový bod a ve druhém jako `e` plus kombinující čárka: všechny tři se porovnají jako nerovné, takže vyhledání mine a synchronizace založí druhého zákazníka.',
        },
        { caption: 'Normalizuj, než porovnáváš, a rozhodni vědomě, co ještě počítáš za bílý znak.' },
        {
          body:
            'Čísla v JSONu jsou past, kterou nikdo nečeká. `JSON.parse` vyrobí double, takže devatenáctimístné číslo účtu přijde zaokrouhlené a poslední dvě číslice sedí špatně. Selže to tiše: hodnota je číslo, kontrola schématu projde a identifikátor už neodpovídá ničemu. Když má identifikátor víc než zhruba patnáct číslic, trvej na tom, aby po drátě jel jako řetězec.',
        },
        {
          body:
            'Zapiš si kontrakt, který jsi opravdu dostal, vedle toho, který ti dali. Dva sloupce, jeden řádek na pole: co tvrdí dokumentace a co ukázal tisíc záznamů. Ten dokument předáš zákazníkovi, když ho budeš žádat o opravu zdroje, a je to on, co dalšího inženýra ušetří objevování prázdného `customerId` až v produkci.',
        },
      ],
    },
    'fde-v1-m02-l2': {
      title: 'Opakování, duplicity a idempotence',
      summary:
        'Proč je doručení aspoň jednou normální stav, co ti koupí idempotenční klíč, které chyby smí klient opakovat sám a jak ctít Retry-After místo hádání.',
      sections: [
        {
          body:
            'Doručení právě jednou ti síť nedá. Odesílatel pošle požadavek, příjemce ho zpracuje a potvrzení se ztratí cestou zpátky. Odesílatel to nerozezná od požadavku, který nikdy nedorazil, takže ho pošle znovu. Každá fronta, každý webhook a každá smyčka s opakováním, kterou potkáš, doručuje aspoň jednou. Duplicity jsou tedy normální stav a tvůj handler je to, co je musí přežít.',
        },
        {
          body:
            'Idempotenční klíč (idempotency key) je způsob, jak je přežije příjemce. Odesílatel zvolí pro operaci stabilní identifikátor a pošle ho s každým pokusem. Příjemce si klíč uloží spolu s výsledkem prvního pokusu. Druhý požadavek se stejným klíčem vrátí uložený výsledek místo toho, aby práci udělal znovu. Klíč musí být stabilní napříč pokusy, což čerstvé UUID pro každý pokus přesně není.',
        },
        { caption: 'Celý mechanismus: najdi klíč, udělej práci jednou, pamatuj si, co jsi odpověděl.' },
        {
          body:
            'Správný klíč pro detekci duplicit závisí na tom, co řádek znamená. Synchronizace, která čte aktuální stav každého ticketu, ukládá jeden řádek na ticket, takže ho identifikuje samotné id a druhé doručení téhož id je duplicita. Feed změn ticketů ukládá jeden řádek na verzi, takže klíč je id spolu s verzí a samotné id by zahodilo každou skutečnou aktualizaci po té první.',
        },
        {
          body:
            'Opakování je odesílatelova půlka téhož problému a otázka zní vždycky stejně: co by druhý pokus udělal se serverem? RFC 9110 odděluje bezpečné (safe) metody, které stav serveru nemění, od idempotentních, u kterých dvojí odeslání nechá stejný stav jako jedno. GET je obojí. DELETE je idempotentní, ale ne bezpečný: druhý nenajde co smazat a koncový stav sedí. POST není ani jedno, a proto POST potřebuje idempotenční klíč, než ho smíš opakovat automaticky.',
        },
        {
          caption: 'Co smí klient zopakovat sám a co ne.',
          headers: ['Selhání', 'Opakovat bez ptaní?', 'Proč'],
          rows: [
            ['GET vrátil 429 nebo 503', 'Ano', 'Další čtení u zdroje nic nemění; nejdřív ale počkej uvedenou dobu'],
            ['GET vypršel bez odpovědi', 'Ano', 'Čtení buď proběhlo, nebo ne, a ani jeden výsledek nenechal stopu'],
            [
              'POST vypršel bez odpovědi, bez idempotenčního klíče',
              'Ne',
              'Nerozeznáš ztracený požadavek od ztraceného potvrzení, takže opakování může práci udělat dvakrát',
            ],
            ['POST vrátil 500, s idempotenčním klíčem', 'Ano', 'Klíč zařídí, že druhý pokus vrátí první výsledek místo opakování práce'],
            ['Libovolný požadavek vrátil 400 nebo 422', 'Ne', 'Payload je špatně a stejný payload bude špatně pokaždé'],
            ['Libovolný požadavek vrátil 401 nebo 403', 'Ne', 'Opakování chyby přihlášení spálí tvůj rate limit a zamkne účet'],
          ],
        },
        {
          body:
            'Když tě server přiškrtí, řekne to. RFC 6585 definuje přesně na tohle stav 429 Too Many Requests a RFC 9110 definuje hlavičku `Retry-After`, kterou odpověď nese buď jako počet sekund, nebo jako HTTP datum. 429 znamená, že požadavek byl odmítnut: nic se nepřečetlo, nic se nezměnilo a práce se pořád musí udělat. Zahodit stránku je jediná reakce, která zaručeně způsobí chybějící data.',
        },
        {
          caption: 'Jedna synchronizace přes tři stránky, druhá stránka přiškrcená. Projdi si to krok po kroku: opakování se vrací na stejný cursor, ne na začátek.',
          notes: [
            'Synchronizace startuje bez cursoru, bez záznamů a bez odeslaných požadavků. Před ní je pět kroků.',
            'První požadavek vrátí 200 se třemi tickety a nextCursor p2. Dva tickety si necháme, jeden má prázdné customerId a počítá se jako přeskočený.',
            'Cursor p2 se vrátí jako 429 Too Many Requests s Retry-After: 2. Nic se nepřečetlo, takže nepřibývá žádný záznam a cursor se nehne.',
            'Klient počká ty dvě sekundy, o které server požádal. Dřívější opakování by další požadavek utratilo za další 429 a přiškrcení by trvalo déle.',
            'Stejný cursor se vyžádá znovu a vrátí 200. Jeden nový ticket si necháme; druhý je opakované doručení TCK-1004, které množina uložených id už obsahuje, takže se počítá jako duplicita.',
            'Poslední stránka vrátí nextCursor null a průchod končí: čtyři záznamy, dva přeskočené, jedna duplicita, ze čtyř požadavků na tři stránky.',
          ],
          counterLabels: [
            'Odeslaných požadavků',
            'Odeslaných požadavků',
            'Odeslaných požadavků',
            'Odeslaných požadavků',
            'Odeslaných požadavků',
            'Odeslaných požadavků',
          ],
        },
        {
          body:
            'Když ti server žádnou dobu nedá, musíš si ji vymyslet, a funguje exponenciální tvar: 1 sekunda, pak 2, pak 4, pak 8. Konstantní opakování buší do systému, který už tak selhává. Co samotné exponenciální couvání neřeší, je sladění klientů. Když jich stejné přetížení přiškrtilo padesát, všech padesát se probudí ve stejný okamžik a další vlna vypadá jako ta, co problém způsobila. Jitter to rozbije tím, že každému klientovi rozprostře čekání náhodně po jeho okně.',
        },
        { caption: 'Když hlavička existuje, cti ji. Jinak zdvojnásob strop a vyber pod ním náhodný bod.' },
        {
          body:
            'Dej každé smyčce s opakováním rozpočet. Klient, který opakuje donekonečna, udělá z pětiminutového výpadku závislosti výpadek vlastní výroby, a přitom hlásí, že je všechno v pořádku. Tři nebo čtyři pokusy, pak konec, nahlas chybu i s cursorem, na kterém jsi stál, a nech další naplánovaný běh pokračovat odtud.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m02-l1-read': {
      title: 'Čtení: kontrakty a data, která opravdu dostaneš',
      summary: 'Dokumentovaný tvar proti drátu, pole použitelná místo jen přítomných, pasti kódování a jedna hranice, která rozhoduje.',
    },
    'fde-v1-m02-l2-read': {
      title: 'Čtení: opakování, duplicity a idempotence',
      summary: 'Doručení aspoň jednou, idempotenční klíče, co smí klient opakovat sám, Retry-After a couvání s jitterem.',
    },
    'fde-v1-m02-checks': {
      title: 'Rozhodnutí o integraci',
      summary:
        'Čtyři ohraničená rozhodnutí: které opakování se dá zautomatizovat, co znamená 429 s Retry-After, proč je při souběžných zápisech lepší cursor než offset a který klíč odhalí opakované doručení.',
      questions: {
        'fde-v1-m02-q1': {
          prompt: 'Marlbrookova synchronizace dělá tato čtyři volání. Jedno z nich smí tvůj klient zopakovat sám, bez člověka a bez další techniky. Které?',
          options: [
            '`GET /v1/tickets?cursor=p2`, které vrátilo 429 s `Retry-After: 2`.',
            '`POST /v1/tickets/TCK-1002/replies`, kterému vypršel čas bez odpovědi a bez idempotenčního klíče.',
            '`POST /v1/refunds` s částkou a bez idempotenčního klíče, které vrátilo 500.',
            '`PATCH /v1/customers/CUS-12` s částečným tělem, které vrátilo 503, zatímco stejný záznam upravovala noční úloha.',
          ],
          explanation:
            'GET u zdroje nic nemění, takže druhý stejný požadavek vrátí reprezentaci a Marlbrook nechá přesně tak, jak byl. RFC 9110 tomu říká bezpečná (safe) metoda a bezpečné metody jsou právě ty, které smí klient zopakovat sám, jakmile počkal dobu, o kterou 429 požádalo. Vypršený POST je ten těžký případ: žádná odpověď znamená, že nevíš, jestli se odpověď zákazníkovi zapsala, takže opakování riskuje druhou zprávu, a bez idempotenčního klíče je na serveru nic nespojí dohromady. Refund je tatáž nejistota s penězi navrch a 500 ti říká, že server někde selhal, ne že selhal před zápisem do účetnictví. PATCH se dá opakovat jen tehdy, když víš, že mezitím na záznam nikdo nesáhl, a souběžný editor je přesně ten případ, kdy opakování přepíše cizí změnu a ohlásí úspěch.',
        },
        'fde-v1-m02-q2': {
          prompt: 'API ticketů odpoví `HTTP/1.1 429 Too Many Requests` s `Retry-After: 2`. Co ti server řekl?',
          options: [
            'Požadavek byl odmítnut a nezpracován a server chce, abys počkal aspoň dvě sekundy, než ho pošleš znovu.',
            'Požadavek byl zpracován, ale odpověď byla useknutá, takže když stránku za dvě sekundy načteš znovu, dostaneš zbytek.',
            'Celý tvůj účet je na dvě sekundy omezený, takže během toho okna selžou i všechny ostatní rozpracované požadavky.',
            'Server požadavek zařadil do fronty a odpoví na něj do dvou sekund, takže poslat ho znovu by vyrobilo druhou kopii práce.',
          ],
          explanation:
            '429 je stav z rodiny chyb klienta: server požadavek odmítl, nic se nepřečetlo a nic se nezměnilo, takže stránku je pořád potřeba stáhnout. `Retry-After` nese dobu, kterou si server přeje, v sekundách nebo jako HTTP datum, a kratší čekání ti obvykle vyslouží další 429 a delší okno. Odpověď o useknutí popisuje částečnou odpověď, od které jsou rozsahové požadavky a stav 206; v 429 není žádná stránka. Odpověď o celém účtu si vymýšlí rozsah, který hlavička nikdy neuvádí, protože limit může být na klíč, na endpoint nebo na tenanta a odpověď neříká na který, takže předpoklad toho nejširšího zastaví i práci, která by prošla. Odpověď o frontě popisuje server, který požadavek přijal; 429 říká pravý opak, a brát ho jako přijetí znamená, že se stránka nikdy nepřečte a synchronizace tiše ztratí záznamy.',
        },
        'fde-v1-m02-q3': {
          prompt:
            'Marlbrookovo API ticketů stránkuje obojím způsobem: `?offset=300&limit=100`, nebo `?cursor=...&limit=100`. Synchronizuješ zhruba 900 otevřených ticketů, zatímco agenti dál tickety zakládají a zavírají. Proč je tady cursor bezpečnější volba?',
          options: [
            'Offset počítá do výsledku, který se mezi tvými požadavky přepisuje, takže ticket, který přejde přes hranici stránky, přečteš dvakrát nebo ho mineš úplně. Cursor pojmenuje pozici v uspořádání, takže další stránka pokračuje od poslední položky, kterou jsi opravdu viděl.',
            'Cursor umožní serveru použít index, kdežto offset vždycky vynutí úplný sken, takže do okna synchronizace se vejde jenom cursor.',
            'Cursor zaručí, že každý ticket uvidíš právě jednou, včetně těch, které vznikly až po startu synchronizace.',
            'Offset se po pádu nedá obnovit, protože klient nemá jak zjistit, kam se dostal.',
          ],
          explanation:
            'Přeskočit 300 řádků znamená přeskočit 300 řádků toho, co výsledek obsahuje v ten okamžik. Zavři ticket, který patřil na první stránku, a všechno za ním se posune o jedna, takže první řádek čtvrté stránky se přesune na konec třetí a synchronizace ho nikdy neuvidí. Cursor zakóduje, kde jsi v uspořádání skončil, takže ti posun řádek za záda nepodstrčí. Odpověď o indexu bývá pravdivá a je to argument o výkonu, ne o správnosti; rychlý sken přes offset ten řádek ztratí stejně. Odpověď o „právě jednou“ slibuje víc, než cursor umí: chrání řádky za tebou, ale ticket založený až za tvou aktuální pozicí v uspořádání ještě načteš, kdežto ten, který se zařadí před ni, už ne, a proto se synchronizace píšou tak, aby snesly obojí. Odpověď o obnově je prostě špatně, offset je číslo, které klient už má a může si ho uložit.',
        },
        'fde-v1-m02-q4': {
          prompt:
            'Marlbrookův webhook doručuje změny ticketů aspoň jednou a pro každý pokus razí nové `deliveryId`. Ukládáš jeden řádek na verzi ticketu. Který klíč ti řekne, že doručení, které už máš uložené, dorazilo znovu?',
          options: [
            '`ticket.id` spolu s `ticket.version`.',
            '`deliveryId`, protože je pro každé doručení jedinečné.',
            'Otisk SHA-256 celého payloadu.',
            'Samotné `ticket.id`.',
          ],
          explanation:
            'Řádek znamená jednu verzi jednoho ticketu, takže klíč musí pojmenovat přesně tohle: id říká který ticket, verze říká který jeho stav. Opakované doručení verze 3 sedne na řádek, který už máš, a skutečná úprava přijde jako verze 4 a nesedne. `deliveryId` je jedinečné na pokus, ne na změnu, což je přesně naopak, než potřebuješ: každé opakované doručení vypadá jako nové a verzi 3 uložíš tolikrát, kolikrát to webhook zkusí. Otisk celého payloadu selže ze stejného důvodu o patro níž, protože `deliveryId` a `deliveredAt` se mezi pokusy liší, takže se liší i otisk; otisk samotného objektu `ticket` by fungoval, což je dobré vědět u feedu, který žádné pole s verzí nedává. Samotné id sloučí všechny verze ticketu do jednoho řádku, takže druhou skutečnou úpravu zahodíš jako duplicitu a ticket zamrzne ve stavu, který dorazil první.',
        },
      },
    },
    'fde-v1-m02-connector-adapter': {
      title: 'Adaptér konektoru: stránky, duplicity a přiškrcené čtení',
      summary:
        'Zesynchronizuj tři stránky ticketů za cursorem ze syntetického klienta, který jednou vynechá customerId, jeden ticket doručí dvakrát a jednu stránku přiškrtí. Hodnotí se správnost, opakované spuštění a dodržení čekání.',
      code: {
        prompt:
          'Napiš funkci `syncTickets(client)`, která vrátí promise s `{ records, skipped, duplicates }`.\n\n`client.listTickets(cursor)` je jediná cesta dovnitř. Pro první stránku ji zavolej s `null`. Vrátí `{ tickets, nextCursor }`; volej ji dál s tím `nextCursor`, který ti podá, dokud není `null`. Každý ticket nese `id`, `customerId`, `subject` a pole, která nepotřebuješ.\n\nCestou se pokazí čtyři věci a hodnotí se všechny čtyři:\n\n1. **Ticket, který nejde použít.** Ořízni `id` i `customerId`. Když některé chybí, je null nebo jsou v něm jen bílé znaky, ticket si nenechávej: přičti jedničku k `skipped` a jdi dál. Přeskočený ticket se nikdy nestane záznamem, takže jeho druhé doručení se zase přeskočí, místo aby se počítalo jako duplicita.\n2. **Tentýž ticket dvakrát.** Jedno id dorazí na dvou různých stránkách. Nech si první kopii přesně tak, jak byla, přičti jedničku k `duplicates` a nic nepřepisuj.\n3. **Tři stránky za cursorem.** Prázdné pole `tickets` neznamená, že je průchod u konce. To znamená jedině `nextCursor` rovné `null`.\n4. **Přiškrcená stránka.** Jedno volání skončí odmítnutím `{ status: 429, retryAfterMs }`. Nic se nepřečetlo, takže stránku je pořád potřeba stáhnout: `await sleep(retryAfterMs)` a pak si vyžádej stejný cursor znovu. Dej stránce nejvýš tři opakování; když je pak pořád přiškrcená, nech odmítnutí projít volajícímu. Odmítnutí s jiným stavem než 429 se nikdy neopakuje a vždycky propadne dál.\n\nUložený záznam je přesně `{ id, customerId, subject }` s oříznutým id i customerId a se `subject` opsaným beze změny. Seřaď `records` vzestupně podle `id` textovým porovnáním, takže `TCK-10` je před `TCK-9`.\n\nSpusť `syncTickets` nad stejným klientem dvakrát a musí obojí vrátit totéž, se stejnými počty. Všechna pole, množiny i počítadla drž uvnitř funkce.\n\nKlient je fixture napsaná pro toto cvičení, ne živé API. `sleep` běží na virtuálních hodinách sandboxu, takže čekání 500 ms skončí okamžitě a přesto se zapíše jako mezera 500 ms. Nic tady neotevírá síťové spojení a v žádné stránce nejsou reálná zákaznická data.',
        contract: [
          '`client.listTickets(cursor)` je jediný zdroj ticketů. Začni na `null` a jdi po `nextCursor`, dokud není `null`.',
          'Každou stránku si vyžádej jednou plus její opakování. Po selhání nezačínej průchod znovu od první stránky.',
          'Opakuj jen odmítnutí se stavem 429, nejvýš třikrát na stránku, a před každým opakováním počkej `await sleep(retryAfterMs)`. Každé jiné odmítnutí nech propadnout dál.',
          'Záznamy, počítadla i množinu viděných id drž uvnitř `syncTickets`, aby druhé volání nad stejným klientem začínalo od nuly.',
          '`sleep(ms)` dodává harness úlohy. Nedefinuj si vlastní a nepoužívej reálné časovače.',
        ],
        hints: [
          'Dej opakování do vlastní pomocné funkce, která stáhne jednu stránku. Průchod pak zůstane obyčejný cyklus přes cursory a logika opakování bude na jednom jediném místě.',
          '`client.listTickets` odmítá obyčejným objektem, ne instancí Error. Odchyť ho, zkontroluj `error.status === 429`, dej `await sleep(error.retryAfterMs)` a zavolej `client.listTickets` znovu se stejným cursorem. Všechno ostatní vyhoď dál.',
          '`Set` uložených id odpoví na obě otázky: `seen.has(id)` znamená duplicitu a přidání až po vložení záznamu zachová první kopii. Deklaruj ho uvnitř `syncTickets`, aby druhý běh začínal prázdný.',
        ],
        approach: [
          'Napiš `fetchPage(cursor)`: zavolej `client.listTickets(cursor)` a při odmítnutí se `status === 429` počkej `await sleep(error.retryAfterMs)` a zkus stejný cursor znovu, nejvýš třikrát. Všechno ostatní i překročený rozpočet vyhoď dál.',
          'Deklaruj `records`, `Set` uložených id a obě počítadla uvnitř `syncTickets`.',
          'Jdi od `cursor = null`, stáhni stránku a pak pokračuj po `page.nextCursor`, dokud není `null`. I prázdná stránka má cursor, po kterém se jde dál.',
          'U každého ticketu ořízni id a customerId: když je některé prázdné, přičti přeskočení; když je id už v množině, přičti duplicitu; jinak id přidej a vlož `{ id, customerId, subject }`.',
          'Seřaď `records` podle id textovým porovnáním a vrať `{ records, skipped, duplicates }`.',
        ],
        criteria: [
          {
            label: 'Správné záznamy, přeskočení a duplicity',
            detail:
              'Průchod, kontrola na hranici nebo tvar záznamu nesedí. Ověř, že jdeš po `nextCursor` přes všechny tři stránky, že záznam je přesně `{ id, customerId, subject }` s oběma id oříznutými, že customerId ze samých bílých znaků se počítá jako přeskočení, že opakování už uloženého id se počítá jako duplicita a nepřepíše první kopii, a že `records` jsou seřazené podle id jako text.',
          },
          {
            label: 'Stejný výsledek při opakovaném spuštění',
            detail:
              'Druhé `syncTickets(client)` nad stejným klientem vrátilo něco jiného než první. Obvyklá příčina je stav, který přežije jedno volání: pole, `Set` nebo počítadlo deklarované mimo funkci, takže opakované spuštění přidává k prvnímu běhu místo čistého startu. Přesuň je všechny dovnitř `syncTickets`.',
          },
          {
            label: 'Přiškrcená stránka se zopakuje a čekání se dodrží',
            detail:
              'S 429 se zachází špatně. Buď se stránka místo opakování zahodila, nebo opakování odešlo dřív než po `retryAfterMs`, nebo se celý průchod restartoval od první stránky místo znovuvyžádání stejného cursoru. Odchyť odmítnutí, dej `await sleep(error.retryAfterMs)` a zavolej `client.listTickets` znovu s tím cursorem, na kterém jsi už stál.',
          },
        ],
        testLabels: [
          'čtyři použitelné tickety přes tři stránky, seřazené podle id',
          'záznam nese id, customerId a subject a nic víc',
          'dva tickety nemají použitelné customerId, jeden ticket dorazí dvakrát',
          'id se ořezávají a customerId ze samých mezer je přeskočení',
          'ticket za přiškrcenou stránkou se neztratí',
          'opakování počká tu dobu retryAfterMs, kterou odmítnutí neslo',
          'tři stránky a jedno opakování: čtyři požadavky a opakování jde na stejný cursor',
          'opakované spuštění nad stejným klientem vrátí stejný výsledek',
          'opakované spuštění nezapočítá záznamy, přeskočení ani duplicity dvakrát',
        ],
      },
    },
  },
};
