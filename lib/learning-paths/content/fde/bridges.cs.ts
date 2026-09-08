/** Czech copy for the FDE bridge module. Arrays align by index with the
 * English source; the content test enforces parity, so a missing entry fails
 * rather than falling back silently to English.
 *
 * Established English terms a Czech developer keeps in a code review stay in
 * English and are glossed once: discriminated result, fixture, rollback,
 * tenant, request id, reducer, coroutine. */

import type { ModuleCs } from '../../types';

export const FDE_BRIDGES_CS: ModuleCs = {
  title: 'Mosty',
  outcomes: [
    'Proměnit špinavý externí payload v ověřený interní záznam — nebo v úplný seznam důvodů, proč se jím stát nemůže.',
    'Napsat stavovou logiku za schvalovací obrazovkou operátora včetně zrušení, které pozdní odpověď nedokáže vzít zpět.',
    'Přečíst časovou osu incidentu a oddělit od sebe signál, který by ho zachytil, změnu, která ho způsobila, bezpečný první krok a škodu, kterou rollback (návrat na předchozí verzi) neodčiní.',
    'Číst typovaný a asynchronní Python natolik dobře, abys mohl pracovat s datovým týmem. Hodnotí se tady čtení: na serveru neběží žádný Python a cokoli si pustíš lokálně, je tvoje vlastní poznámka vedená jako self-reviewed.',
  ],
  lessons: {},
  activities: {
    'fde-v1-bridge-backend-mapping': {
      title: 'Namapuj špinavý payload na ověřený záznam',
      summary: 'Proměň jeden neuklizený záznam z CRM exportu v ověřený účet — nebo ve všechny důvody, proč se jím stát nemůže.',
      code: {
        prompt:
          'Brightpier Freight exportuje záznamy účtů do tvojí integrace. Export vypadá tak, jak skutečné exporty vypadají: pole chybí, datum přijde jako prázdný řetězec, id je jednou číslo a jednou řetězec číslic a objeví se název tarifu, o kterém tvůj systém nikdy neslyšel.\n\nNapiš funkci `mapAccount(raw)`. Bere jeden surový záznam a vrací rozlišený výsledek (discriminated result): `{ ok: true, record }`, když všechna pole projdou validací, a `{ ok: false, problems }`, když neprojde jedno nebo víc. Nikdy obojí a nikdy napůl vyplněný záznam vedle seznamu problémů.\n\nPřed kontrolou ořízni u každého textového pole bílé znaky. Pravidla:\n\n- `account_id` se stane `record.id`, celým číslem. Celé číslo projde tak, jak je, řetězec číslic se převede a cokoli jiného je problém `account_id must be a whole number`.\n- `company_name` se stane `record.companyName` a po oříznutí nesmí být prázdné, jinak je problém `company_name must not be empty`.\n- `owner_email` se stane `record.ownerEmail`, oříznutý a převedený na malá písmena, a musí obsahovat `@`, jinak je problém `owner_email must contain @`.\n- `signed_up_at` se stane `record.signedUpAt`. Chybějící hodnota, `null` i prázdný řetězec znamenají `null` — ten účet nikdy neprošel registračním portálem a doplnit dnešní datum by znamenalo vymyslet si fakt. Cokoli jiného musí odpovídat `YYYY-MM-DD`, jinak je problém `signed_up_at must be YYYY-MM-DD`.\n- `plan` se stane `record.plan` a musí být přesně `starter`, `growth` nebo `enterprise`. Cokoli jiného, `Growth` včetně, je problém `plan must be one of starter, growth or enterprise`.\n\nSbírej všechny problémy místo vracení prvního: ten, kdo bude export opravovat, chce celý seznam najednou. Seznam před vrácením seřaď abecedně, aby stejný vadný záznam vždycky dal stejný výstup a rozdíl mezi dvěma běhy skutečně něco znamenal.\n\nZáznamy tady jsou fixtures napsané pro tohle cvičení. Nejsou to živá data z CRM a nikam se po síti nevolá.',
        contract: [
          'Vracej `{ ok: true, record }`, nebo `{ ok: false, problems }` — nikdy záznam a seznam problémů zároveň.',
          'Posbírej všechny problémy v jednom průchodu a před vrácením seznam seřaď abecedně.',
          'Zachovej názvy typů `RawAccount`, `Account` a `MapResult` i signaturu `mapAccount`; typové kontroly je volají jménem.',
          'Žádné importy, žádná síť a žádné hodiny: chybějící datum zůstává `null` místo toho, aby se stalo dneškem.',
        ],
        hints: [
          'Drž si jedno pole `problems`, přidávej do něj, jak jednotlivá pole propadají, a teprve na konci rozhodni, kterou polovinu výsledku vrátíš. Pole, které propadne, se stejně zkontroluje, protože ten, kdo seznam čte, chce všechny problémy najednou.',
          '`typeof value === "string" && /^\\d+$/.test(value.trim())` oddělí "4821" od "48a" i od prázdného řetězce a `Number(...)` to pak převede. `Number.isInteger` pokryje id, které přišlo rovnou jako číslo.',
          'Zúžení typu, které typové kontroly hledají, plyne z literálového pole `ok`. U `{ ok: true; record: Account } | { ok: false; problems: string[] }` TypeScript vyloučí `record` v chybové větvi sám.',
        ],
        approach: [
          'Začni s prázdným polem `problems`.',
          'Kontroluj pole jedno po druhém: při chybě přidej přesný text problému, při úspěchu si nech převedenou hodnotu.',
          'Chybějící, `null` i prázdné `signed_up_at` ber jako `null`, ne jako problém.',
          'Seřaď `problems` a vrať `{ ok: false, problems }`, když pole není prázdné.',
          'Jinak poskládej pět převedených polí a vrať `{ ok: true, record }`.',
        ],
        criteria: [
          {
            label: 'Záznam i seznam problémů jsou správně',
            detail: 'Zkontroluj prázdný řetězec v datu, id jako řetězec, neznámý tarif, záznam, kterému chybí několik polí naráz, a to, že odmítnutý payload nenese žádný částečný záznam.',
          },
          {
            label: 'Problémy se vracejí seřazené, pokaždé',
            detail: 'Seznam problémů přišel v pořadí, v jakém se pole kontrolovala, místo abecedního. Dva běhy nad stejným záznamem se pak liší bez důvodu a diff výstupu přestane cokoli znamenat.',
          },
        ],
        testLabels: [
          'čistý záznam projde beze změny',
          'číselné id, které přišlo jako řetězec, se stane číslem',
          'datum jako prázdný řetězec se stane null, ne dneškem',
          'textová pole se ořežou a e-mail se převede na malá písmena',
          'neznámý tarif se odmítne jmenovitě',
          'prázdný payload hlásí čtyři problémy a chybějící datum mezi nimi není',
          'odmítnutý payload nenese žádný částečný záznam',
          'tři problémy naráz, abecedně místo v pořadí polí',
        ],
        typeTestLabels: [
          'větev ok se zúží na záznam s číselným id',
          'plan je tříhodnotové sjednocení, ne obyčejný řetězec',
          'záznam nejde přečíst dřív, než se výsledek zúží',
          'větev ok žádný seznam problémů nenese',
        ],
      },
    },
    'fde-v1-bridge-operator-state': {
      title: 'Stavový automat schvalování operátorem',
      summary: 'Reducer pro obrazovku, na které operátor schvaluje práci, včetně zrušení, které pozdní odpověď nedokáže vzít zpět.',
      code: {
        prompt:
          'Operátor v Brightpieru zkontroluje navrhované vrácení peněz dřív, než k němu dojde: obrazovka načte návrh, operátor ho schválí a schválení jde zpátky do ticketové služby. Tohle cvičení je stavová logika za tou obrazovkou. Napíšeš reducer a hodnocení ho pohání přímo seznamy akcí místo vykreslené komponenty, protože v provozu se lámou právě přechody a ty se dají testovat samostatně.\n\nVystav dvě věci. `initialOperatorState` je výchozí stav: `{ status: \'idle\', requestId: null, proposal: null, error: null, abandoned: [] }`. `operatorReducer(state, action)` vrací další stav a nikdy nemění ten, který dostal.\n\nPřechody:\n\n- `{ type: \'load\', requestId }` z jakéhokoli stavu kromě `loading` a `approving` přejde do `loading`, uloží `requestId` a vyčistí `proposal` i `error`. Dokud je požadavek v letu, druhé načtení se ignoruje.\n- `{ type: \'loaded\', requestId, proposal }` přejde do `ready` a vyčistí `requestId`, ale jen když je stav `loading` a `requestId` sedí na ten uložený.\n- `{ type: \'approve\', requestId }` z `ready` přejde do `approving`, uloží nové `requestId` a nechá návrh na obrazovce.\n- `{ type: \'approved\', requestId }` přejde do `approved` a vyčistí `requestId`, ale jen z `approving` a se sedícím id.\n- `{ type: \'failed\', requestId, message }` přejde do `error` a uloží zprávu do `error`, ale jen z `loading` nebo `approving` a se sedícím id.\n- `{ type: \'cancel\' }` z `loading` nebo `approving` se vrátí do `idle`, vyčistí `requestId`, `proposal` i `error` a připojí id opuštěného požadavku do `abandoned`.\n\nTo podstatné: po zrušení může odpověď na ten požadavek pořád dorazit. Nesmí změnit nic. Totéž platí pro odpověď, jejíž `requestId` nesedí na to v letu — tak vypadá požadavek, který mezitím nahradil jiný.\n\nJakákoli akce, kterou aktuální stav nepovoluje, neznámý typ včetně, vrací tentýž objekt stavu, jaký dostala — nezměněný a totožný. React překreslení přeskočí, když reducer vrátí stejný objekt, takže vrátit u ignorované akce novou kopii překreslí obrazovku pro nic za nic.',
        contract: [
          'Zachovej názvy `initialOperatorState` a `operatorReducer`; hodnocení je volá jménem.',
          'Nikdy neměň předaný stav. Pro skutečný přechod postav nový objekt.',
          'U akce, kterou stav nepovoluje, vrať tentýž objekt stavu, ne jeho kopii.',
          'Žádné časovače, žádná síť a žádná náhoda: reducer je čistá funkce stavu a akce.',
        ],
        hints: [
          'Piš každý case nejdřív jako strážní podmínku a až pak jako přechod: zkontroluj stav a request id, při chybě `return state` a teprve potom stav nový objekt.',
          'Vyčištění `requestId` při zrušení je to, co dělá pozdní odpověď neškodnou. Každý case s odpovědí porovnává `action.requestId` proti `state.requestId` a `null` nesedí na nic.',
          'Ignorovat akci znamená `return state` — tentýž odkaz, ne `{ ...state }`. Jedna z kontrol porovnává vrácený objekt s tím, který předala.',
        ],
        approach: [
          'Začni switchem nad `action.type`, jehož default vrací `state` beze změny.',
          'Vyřeš `load`: dokud je stav `loading` nebo `approving`, ignoruj ho, jinak přejdi do `loading` s novým request id a s vyčištěným návrhem i chybou.',
          'Vyřeš obě odpovědi, `loaded` a `approved`, každou hlídanou stavem i sedícím request id.',
          'Vyřeš `failed` z obou stavů v letu: ulož zprávu a vyčisti request id.',
          'Vyřeš `cancel` z obou stavů v letu: zpátky do `idle`, všechno vyčištěné a opuštěné id připojené do `abandoned`.',
        ],
        criteria: [
          {
            label: 'Přechody, které operátor vidí, jsou správné',
            detail: 'Zkontroluj cestu idle → loading → ready, cestu ready → approving → approved a selhání, které skončí v error i se zprávou.',
          },
          {
            label: 'Zrušený ani nahrazený požadavek nesmí změnit stav',
            detail: 'Odpověď, která dorazí po zrušení, nebo která nese jiné request id než to v letu, musí nechat stav přesně tak, jak byl — tentýž objekt, ne kopii.',
          },
        ],
        testLabels: [
          'obrazovka startuje v idle a nic není v letu',
          'load přejde do loading a uloží request id',
          'sedící odpověď připraví návrh k zobrazení',
          'approve a pak approved, s návrhem pořád na obrazovce',
          'selhání si nechá zprávu, kterou musí operátor přečíst',
          'zrušení během načítání se vrátí do idle a požadavek opustí',
          'zrušená odpověď dorazí pozdě a nic nezmění',
          'zrušené schválení se nemůže vrátit jako approved',
          'akce, kterou stav nepovoluje, vrací tentýž objekt',
        ],
      },
    },
    'fde-v1-bridge-incident-case': {
      title: 'Přečti incident z jeho časové osy',
      summary: 'Jeden incident s cache napříč tenanty, přečtený čtyřmi způsoby: signál, příčina, bezpečný první krok a to, co po rollbacku zůstane.',
      questions: {
        'fde-v1-bridge-incident-q1': {
          prompt: 'Všechny dashboardy zůstaly dvě a půl hodiny v normálním rozsahu, zatímco chyba běžela. Který signál by ji zachytil jako první?',
          options: [
            'Kontrola v cestě vyhledávání, která porovná tenant id na článku z cache proti tenantovi, jenž se ptá, počítá selhání a alertuje na ně.',
            'Alert na p95 latenci spanu s vyhledáním článku.',
            'Alert na chybovost odpovědí triage-api v pásmu 5xx.',
            'Alert na saturaci CPU na instancích, které cache obsluhují.',
          ],
          explanation:
            'Chyba vyráběla rychlou, úspěšnou a špatnou odpověď. Odlišit ji od správného zásahu v cache umí jedině kontrola, která porovná tenanta na vráceném článku s tenantem, který se ptá — proto musí alert viset právě na tom porovnání. Latence se pro detekci pohnula na opačnou stranu: opakovaná vyhledání spadla z 90 ms na 1 ms, takže p95 alert měl ještě míň důvodů se ozvat. Nevznikla žádná výjimka ani odpověď 5xx, takže alert na chybovost neměl co vidět. A CPU kleslo taky, protože cache ubrala práci.',
        },
        'fde-v1-bridge-incident-q2': {
          prompt: 'Které vysvětlení sedí na celou časovou osu?',
          options: [
            'Změna 41c7 klíčuje cache jen podle slugu článku, takže první tenant, který si o slug řekne, naplní záznam, ze kterého pak čtou všichni ostatní.',
            'Knowledge base má NORTHWIND a CALDERA ve sdíleném jmenném prostoru článků, takže vyhledání vrátilo článek, na který měli oba tenanti nárok.',
            'Canary v 09:02 pokrýval 3 z 12 instancí, což bylo málo na to, aby se chyba projevila.',
            'Záznamy v cache přežily svou dobu platnosti a servírovaly se i po skončení tenantovy relace.',
          ],
          explanation:
            'Záznam z 12:14 pojmenovává vadu: klíčem je slug bez tenant id, takže článek jednoho tenanta odpovídá na dotaz jiného. Sdílený jmenný prostor by rollback změny 41c7 ve 12:20 nespravil a časová osa se knowledge base vůbec nedotkla. Velikost canary rozhoduje o tom, jak rychle se chyba najde, ne o tom, jestli existuje — od 09:20 byla na všech 12 instancích a stejně žádný alert nespustila. Problém s dobou platnosti servíruje tenantovi jeho vlastní zastaralý článek, což je chyba čerstvosti, ne hranice mezi tenanty.',
        },
        'fde-v1-bridge-incident-q3': {
          prompt: 'Je 11:52. On-call má časovou osu po tento okamžik a čtení napříč tenanty pořád probíhají. Jaký je bezpečný okamžitý krok?',
          options: [
            'Vrátit 41c7 na předchozí verzi a pak zjistit, které odpovědi už citovaly článek cizího tenanta.',
            'Přidat tenant id do klíče cache a nasadit opravu dopředu.',
            'Vyprázdnit cache na všech 12 instancích a nechat 41c7 běžet dál.',
            'Zkrátit dobu platnosti cache na 30 sekund a sledovat, jestli hlášení přestanou chodit.',
          ],
          explanation:
            'Rollback vrátí službu do stavu, který běžel měsíce bez úniku, a zastaví vyzrazování, zatímco vyšetřování pokračuje. Oprava dopředu znamená psát, revidovat a nasadit změnu pod časovým tlakem, zatímco únik běží — a špatný klíč cache se dá snadno zkazit podruhé. Vyprázdnění cache ji sice vyprázdní, ale další požadavek ji naplní pod stejným klíčem jen ze slugu, takže se únik během pár minut obnoví. Zkrácení doby platnosti zkrátí každé jednotlivé okno, ale nezavře ho; hranice mezi tenanty není otázka časování.',
        },
        'fde-v1-bridge-incident-q4': {
          prompt: 'Rollback dojel ve 12:20 a nová čtení napříč tenanty přestala ve 12:26. Co rollback neodčinil?',
          options: [
            'Dvě už odeslané odpovědi, jednu z nich e-mailem, které tenantovi NORTHWIND citují článek CALDERY. Rollback zastaví nová čtení; nedokáže stáhnout zpět to, co už službu opustilo.',
            'Nic. Všech 12 instancí je zpátky na předchozí verzi, takže je incident uzavřený.',
            'Latenci 90 ms u opakovaného vyhledání, kterou rollback teď udělal trvalou.',
            'Samotné záznamy v cache, které rollback přežijí a dál odpovídají článkem CALDERY.',
          ],
          explanation:
            'Rollback obnoví kód, ne následky. Dvě odpovědi jsou venku, jedna z nich v zákaznické schránce, takže incident pokračuje oznámením a doděláním s tenanty bez ohledu na to, co služba dělá teď. Prohlásit ho za uzavřený tuhle práci přeskočí. Hodnota 90 ms je chování z doby před 41c7, ne nová regrese, takže ji rollback obnovil, místo aby ji udělal trvalou. A cache žila v paměti procesů na instancích, které se během rollbacku vyměnily — proto čtení ve 12:26 přestala.',
        },
      },
    },
    'fde-v1-bridge-python-reading': {
      title: 'Čtení typovaného a asynchronního Pythonu',
      summary:
        'Pět ukázek toho druhu, jaký ti podá datový tým: hint Optional, korutina, kterou je potřeba awaitovat, přeskládání dictu, proměnná prostředí s výchozí hodnotou a to, co vrací volání HTTP klienta. Hodnotí se tady čtení — na serveru neběží žádný Python a cokoli si pustíš lokálně, je tvoje vlastní poznámka vedená jako self-reviewed.',
      questions: {
        'fde-v1-bridge-python-q1': {
          prompt: 'Co tahle signatura slibuje volajícímu o návratové hodnotě?',
          options: [
            'Je to řetězec, nebo None, takže volající musí None ošetřit dřív, než s ním zachází jako s řetězcem.',
            'Je to vždycky řetězec. `Optional` označuje, že výchozí hodnotu má argument, ne návratová hodnota.',
            'Je to řetězec, pokud funkce nevyhodí výjimku; `Optional[str]` znamená „str, nebo výjimka“.',
            'None vrátí jen tehdy, když se `fallback` předá výslovně.',
          ],
          explanation:
            '`Optional[str]` je `str | None` a oba returny to ukazují: `fallback`, když klíč chybí, jinak řetězec převedený na malá písmena. Výchozí hodnota parametru je to `= None`, což je něco jiného než anotace. O výjimkách `Optional` neříká nic. A s None je to přesně naopak: funkce vrátí None, když klíč chybí a žádný fallback se nepředal, zatímco předaný fallback je právě to, co návratu None zabrání.',
        },
        'fde-v1-bridge-python-q2': {
          prompt: 'Kolega zavolá `collect(client, "northwind")` z běžného synchronního kódu. Co se vrátí?',
          options: [
            'Objekt korutiny. Uvnitř `fetch_tickets` neproběhlo nic, takže anotovaný `list[dict]` nikdy nedorazí.',
            'Seznam dictů s tickety. Python korutinu doběhne, když ji zavolá synchronní funkce.',
            'Prázdný seznam, protože awaity uvnitř se ještě nevyřešily.',
            'RuntimeError, protože asynchronní funkci nejde zavolat ze synchronní.',
          ],
          explanation:
            'Volání `async def` postaví korutinu a z jejího těla neprovede nic; práce začne u `await` nebo když ji něco jako `asyncio.run` rozjede. Anotace na `collect` říká `list[dict]` a je špatně — přesně tohle chytí typový kontrolor a interpret ne. Python korutinu sám od sebe nikdy nespustí a samotné volání nic nevyhodí: dostaneš objekt korutiny a k tomu varování „coroutine was never awaited“, až ho posbírá garbage collector.',
        },
        'fde-v1-bridge-python-q3': {
          prompt: 'Co je `record` po doběhnutí?',
          options: [
            '{"id": 4821, "name": "Brightpier Freight", "plan": "growth", "primary_email": "ops@brightpier.example"}',
            '{"id": "4821", "name": "Brightpier Freight", "plan": "growth", "primary_email": "ops@brightpier.example"}',
            '{"id": 4821, "name": "Brightpier Freight", "plan": "starter", "primary_email": "ops@brightpier.example"}',
            '{"id": 4821, "name": "Brightpier Freight", "plan": "growth", "primary_email": "billing@brightpier.example"}',
          ],
          explanation:
            '`int("4821")` id převede, takže je z něj číslo, ne původní řetězec. `.get("plan", "starter")` vrátí uloženou hodnotu a na `"starter"` sáhne jen tehdy, když klíč chybí — a tady je přítomný. Generátor uvnitř `next` přeskočí kontakt s `primary` rovným False a zastaví se na prvním s True, což je adresa ops, ne první kontakt v seznamu; `None` je výchozí hodnota, kterou `next` vrátí, teprve když nesedí nic.',
        },
        'fde-v1-bridge-python-q4': {
          prompt: 'Nasazení nastavuje `TRIAGE_API_TOKEN` a ani jednu z dalších dvou proměnných. Co se stane při importu modulu?',
          options: [
            'Naimportuje se v pořádku, `BATCH_SIZE` je celé číslo 25 a `TIMEOUT` desetinné 5.0, obojí z výchozích hodnot.',
            'Na prvním řádku vyhodí KeyError, protože čtení nenastavené proměnné je vždycky KeyError.',
            'Naimportuje se, ale `BATCH_SIZE` je řetězec "25" a `TIMEOUT` řetězec "5", protože hodnoty prostředí jsou vždycky řetězce.',
            'Naimportuje se a `BATCH_SIZE` i `TIMEOUT` jsou None, dokud jim něco nepřiřadí hodnotu.',
          ],
          explanation:
            '`os.environ.get(jméno, výchozí)` i `os.getenv(jméno, výchozí)` vrátí výchozí hodnotu, když proměnná chybí, a obalující `int(...)` a `float(...)` řetězec převedou. KeyError by vyhodil zápis přes hranaté závorky, `os.environ["TRIAGE_API_TOKEN"]`, a to je právě ta jediná proměnná, kterou nasazení nastavuje. Hodnoty prostředí opravdu přicházejí jako řetězce, proto tam ty převody jsou. A None tu vzniknout nemůže: `get` dostalo výchozí hodnotu, takže na None nikdy nespadne.',
        },
        'fde-v1-bridge-python-q5': {
          prompt: 'Co vrátí `client.get(...)` a co s tím udělá `raise_for_status()`?',
          options: [
            'Response, který nese status, hlavičky i tělo pohromadě. `raise_for_status()` vyhodí výjimku u 4xx a 5xx a jinak se tiše vrátí; naparsované tělo vznikne až voláním `response.json()`.',
            'Naparsované JSON tělo. `raise_for_status()` v něm pak hledá klíč "error" a při nálezu vyhodí výjimku.',
            'Response. `raise_for_status()` vyhodí výjimku u jakéhokoli statusu kromě přesně 200, takže i 204 nebo 301 spadne.',
            'Korutinu, kterou je potřeba awaitovat, protože httpx je asynchronní knihovna.',
          ],
          explanation:
            'Objekt Response drží stavový kód, hlavičky a surové tělo a `response.json()` je samostatný krok, který tělo naparsuje; odpověď se stavem 200 a nečitelným tělem selže až tam, ne dřív. `raise_for_status()` se dívá jen na stavový kód, na tělo nikdy. Vyhazuje u 4xx a 5xx, takže 204 i 301 jím projdou bez povšimnutí. A `httpx.Client` je synchronní klient, který Response vrací rovnou; awaituje se `httpx.AsyncClient`.',
        },
      },
    },
  },
};
