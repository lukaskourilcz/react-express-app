/** Czech copy for the C01 capstone. Arrays align by index with the English
 * source; the content test enforces parity, so a missing entry fails rather
 * than falling back silently to English.
 *
 * Identifiers, JSON field names, status and reason codes stay as they are.
 * Terms a Czech developer keeps in English — tenant, fixture, cursor,
 * retrieval, prompt injection, rollback, runbook, UAT, baseline, held-out,
 * abstention — stay too, glossed once where they first appear. */

import type { ModuleCs } from '../../types';

export const FDE_C01_CS: ModuleCs = {
  title: 'Závěrečný projekt: pracovní nástroj pro support',
  outcomes: [
    'Dovést jednu větu od Marlbrook Systems — zkrátit čas, který čtyři agenti stráví tříděním supportních případů — až k zadání s výchozím měřením, sepsanými non-goals a podmínkou přijetí, ve které se vedoucí supportu pozná.',
    'Spojit ticketové API stránkované cursorem s CSV exportem zákazníků do jednoho seznamu případů bez duplicit a se štítkem tenanta, a každý záznam, který nejde použít, vykázat místo zahození.',
    'Podepřít navrženou akci povolenými články ze znalostní báze, ocitovat je podle id článku, odmítnout, když nic povoleného návrh neunese, a držet text článku jako data, která nikdy nesmějí povolit akci ani rozšířit oprávnění.',
    'Změřit deterministické směrování proti dodaným výsledkům modelových kandidátů na vyčleněné (held-out) sadě, vykázat kvalitu odděleně od abstention, ceny a latence, a zablokovat kandidáta, kterému průměr zakrývá propadlý výsek.',
    'Vstřebat change request — třetí, omezený tenant a přiškrcený latenční rozpočet — a nerozbít u toho jediný dřívější akceptační případ.',
    'Nechat po sobě diagnózu incidentu přečtenou z trasy, plán rollbacku, runbook, UAT checklist, osnovu dema a jedno zlepšení produktu.',
    'Přečíst si, co dokončení říká. Čtyři hodnocená cvičení a dvě odevzdané složky zapíšou „FDE guided path completed“ a složky se zobrazují zvlášť jako „Portfolio self-reviewed“. Ani jedno není certifikace, hodnost ani doklad o produkční praxi, a volitelné lokální projekty, procvičování Pythonu i pokusy s živým modelem nedávají žádné XP, žádný přístup a na dokončení nemají vliv.',
  ],
  lessons: {},
  activities: {
    'fde-v1-c01-discovery': {
      title: 'Fáze 1 — discovery: vymez zadání pro triage workbench',
      summary:
        'Marlbrook Systems chce zkrátit čas, který čtyři agenti tráví tříděním supportních případů, a dává ti ticketové API, CSV export zákazníků a znalostní bázi se zastaralými i tenantem omezenými články. Napiš zadání: postup, otázky, výchozí měření, co dovnitř a co ven, rizika, přijetí. Jenom fixture, zaznamenává se jako vlastní revize.',
      artifact: {
        brief:
          'Marlbrook Systems prodává software pro sklady středně velkým distributorům. Jeho VP Customer Operations chce zkrátit čas, který čtyři agenti supportu tráví tříděním případů, a dal ti tři věci a čtrnáct dní: ticketové API za cursorem, noční CSV export zákazníků a znalostní bázi, jejíž články jsou směs aktuálních, nahrazených a tenantem omezených. Dneska jedou dva tenanti, Dunfold Freight a Kestrel Foods. Ať postavíš cokoli, operátor zkontroluje každou navrženou akci, než opustí workbench — to je podmínka zakázky, ne nápad na druhou fázi.\n\nCo je ve fixture, už víš, protože proti nim běží dalších pět fází: duplicitní ticket, ticket bez customer id, zákazník, u kterého se řádky exportu neshodnou na tenantovi, jedna přiškrcená stránka, nahrazené i zakázané články, poškozený výstup modelu a článek, jehož text se snaží vydávat instrukce. Zadání piš s tímhle před očima.\n\nSedm polí, všechna povinná: pracovní postup tak, jak dneska běží, pět otázek, které bys položil dřív, než napíšeš kód, výchozí měření, co tahle fáze dodá, co ne, rizika a podmínka, po jejímž splnění se sponzor, vedoucí supportu a ty shodnete, že to vyšlo.\n\nMarlbrook, jeho tenanti, objemy i data jsou vymyšlené pro tenhle závěrečný projekt. Není tu žádný živý systém, na který by ses zeptal, žádný model k zavolání a žádný zákazník k rozhovoru, takže tam, kde by ses musel někoho zeptat, napiš tu otázku místo vymyšlené odpovědi.\n\nTohle odevzdání se zaznamenává jako vlastní revize a zobrazuje jako „Portfolio self-reviewed“, odděleně od čtyř hodnocených cvičení. Automatická kontrola ověří, že je každé povinné pole vyplněné a vejde se do svého limitu. Víc neprokáže: neposoudí, jestli se tvoje výchozí měření dá zopakovat, jestli jsi vyloučil to správné ani jestli je tvoje podmínka přijetí ověřitelná. Přečti si vlastní odpověď proti řádkům rubriky Vymezení problému a Komunikace a zreviduj ji, než začneš druhou fázi.',
        fields: [
          {
            label: 'Postup třídění dneska',
            help:
              'Cesta, kterou případ v Marlbrooku dneska projde, krok po kroku od příchodu k agentovi, který na něj odpoví, s rolí u každého kroku a s časem u každého, kde ho umíš uvést. Odděl kroky, které odvozuješ z fixture, od těch, které ti někdo popsal. Kontrola délky počítá znaky; jestli je tohle postup, který linka opravdu jede, neposoudí.',
          },
          {
            label: 'Pět otázek k položení',
            help:
              'Pět otázek, každá na samostatném řádku, které bys položil dřív, než napíšeš kód. U každé pojmenuj roli, která na ni umí odpovědět, a odpověď má měnit, co postavíš. Aspoň jedna má dosáhnout na někoho, kdo umí projekt zastavit — bezpečnostní revizi, vlastníka ochrany dat, vedoucího supportu, jehož agenti to budou používat. Jestli je otázka dobrá, žádná automatika neposoudí; ukládá se to pro tvou vlastní revizi.',
          },
          {
            label: 'Výchozí měření',
            help:
              'Jedno měření toho, co třídění Marlbrook dneska stojí: veličina, populace, kterou pokrývá, období, za které vzniklo, a jak by ho příští měsíc zopakoval někdo jiný a dostal srovnatelné číslo. Cíl není výchozí měření. Kontrola jenom ověří, že pole není prázdné a vejde se do 500 znaků.',
          },
          {
            label: 'V zadání pro tuhle fázi',
            help:
              'Jedna položka na řádek toho, co tahle fáze dodá, každá dost malá na to, abys ji vedoucímu supportu předvedl na jedno posezení. U každé napiš, jestli ji pokryje deterministický kód, nebo si model své místo zaslouží, a proč. Zvolit pro většinu fronty deterministické směrování je legitimní odpověď, když to podmínky unesou, a není to odpověď slabší. Automaticky se kontroluje přítomnost, ne volby.',
          },
          {
            label: 'Non-goals',
            help:
              'Jedna položka na řádek toho, co tahle fáze dělat nebude, u každé důvod a tam, kde ho umíš dát, podmínka, která by ji vrátila zpátky na seznam. Automatické odesílání odpovědí, jednání bez operátora a jakékoli použití reálných zákaznických dat patří sem — nebo do věty, proč tu nejsou. Vyloučení, které jsi nenapsal, žádné vyloučení není.',
          },
          {
            label: 'Registr rizik',
            help:
              'Co se může pokazit, kdo to uvidí první a co s tím uděláš. Pokryj aspoň čtyři: případ oštítkovaný špatným tenantem, odpověď postavenou na nahrazeném článku, článek, jehož text se snaží systém navádět, a výchozí měření, které neumíš zopakovat. U každého napiš, kam nejhorší dopad dosáhne — na jednoho operátora, na jednoho tenanta, nebo na všechny. Žádná automatická kontrola tohle pole na pokrytí nečte.',
          },
          {
            label: 'Podmínky přijetí',
            help:
              'Co dovolí sponzorovi, vedoucímu supportu a tobě shodnout se, že tahle fáze vyšla: čísla změřená stejně jako výchozí měření, s datem. Pojmenuj výseky, které bys hlásil vedle hlavního čísla, protože medián se může zlepšit, zatímco jeden typ ticketů se zhorší, a napiš, co budeš hlásit o případech, které workbench odmítne. Kontrola ověří, že je pole vyplněné; zbytek je tvoje vlastní revize proti rubrice.',
          },
        ],
      },
    },
    'fde-v1-c01-triage-adapter': {
      title: 'Fáze 2 — načtení dat: jeden seznam případů se štítkem tenanta',
      summary:
        'Spoj ticketové API Marlbrooku stránkované cursorem s jeho nočním CSV exportem zákazníků do jednoho seznamu případů bez duplicit a se štítkem tenanta. Syntetický feed doručí jeden ticket dvakrát, u jednoho vynechá customer id, jednu stránku přiškrtí a obsahuje zákazníka, u kterého si řádky exportu odporují.',
      code: {
        prompt:
          'Napiš funkci `buildCaseList(client, csvText)`, která vrátí promise s `{ cases, skipped, duplicates }`.\n\n`client.listTickets(cursor)` je jediná cesta do ticketového feedu. Pro první stránku ji zavolej s `null`; vrátí `{ tickets, nextCursor }` a pokračuješ, dokud není `nextCursor` rovné `null`. Každý ticket nese neprázdné `id`, `customerId`, `subject` a pole, která nepotřebuješ.\n\n`csvText` je noční export zákazníků: hlavičkový řádek a pak `customer_id,tenant_id,company`. Sloupec s firmou je poslední, může být v uvozovkách a může obsahovat čárky, takže první dva sloupce jsou jediné, které máš číst. Oba ořízni. Prázdné řádky ignoruj.\n\nNejdřív postav index zákazníků, pak projdi feed.\n\n**Index.** Řádek s prázdným customer id nebo prázdným tenant id ti nic neříká, tak ho vynech. Totéž customer id se může objevit víckrát: shodné řádky nevadí, ale dva řádky se dvěma různými tenanty znamenají, že nikdo neumí říct, kterému tenantovi zákazník patří — a hádání je přesně to selhání, kvůli kterému tahle fáze existuje. Takového zákazníka označ za nepoužitelného, místo abys vzal první řádek.\n\n**Průchod.** U každého ticketu, v pořadí feedu:\n\n1. **Id ticketu, které už jsi viděl** — v kterémkoli seznamu — přičte jedničku k `duplicates` a jinak se ignoruje. Platí první zařazení daného id.\n2. **Nepoužitelné customer id** (chybí, je null, nebo jsou v něm jen bílé znaky) jde do `skipped` s důvodem `no-customer-id`.\n3. **Customer id, které v indexu není**, jde do `skipped` s důvodem `unknown-customer`.\n4. **Zákazník, kterého index označil za nepoužitelného**, jde do `skipped` s důvodem `ambiguous-customer`.\n5. Cokoli jiného se stane případem: přesně `{ id, tenantId, customerId, subject }`, s oříznutým id ticketu i customer id, s tenantem z indexu a se `subject` opsaným beze změny.\n\n**Přiškrcení.** Jedno volání skončí odmítnutím `{ status: 429, retryAfterMs }`. Nic se nepřečetlo, takže stránku je pořád potřeba stáhnout: `await sleep(retryAfterMs)` a pak si vyžádej stejný cursor znovu. Dej stránce nejvýš tři opakování; když je pak pořád přiškrcená, nech odmítnutí projít volajícímu. Odmítnutí s jiným stavem než 429 se nikdy neopakuje a vždycky propadne dál.\n\n`cases` i `skipped` seřaď vzestupně podle id textovým porovnáním. Položka v `skipped` je přesně `{ id, reason }`. Spusť `buildCaseList` nad stejným klientem a exportem dvakrát a musí obojí vrátit totéž, takže všechna pole, množiny i počítadla drž uvnitř funkce.\n\nKlient i export jsou fixture napsané pro tenhle závěrečný projekt, ne živé API. `sleep` běží na virtuálních hodinách sandboxu, takže čekání 500 ms skončí okamžitě a přesto se zapíše jako mezera 500 ms. Nic tady neotevírá síťové spojení a ani v jednom nejsou reálná zákaznická data.',
        contract: [
          '`client.listTickets(cursor)` je jediný zdroj ticketů. Začni na `null` a jdi po `nextCursor`, dokud není `null`.',
          'Z řádku exportu čti jenom první dva sloupce. Sloupec s firmou je poslední, může být v uvozovkách a může obsahovat čárky.',
          'Každou stránku si vyžádej jednou plus její opakování. Po selhání nezačínej průchod znovu od první stránky.',
          'Opakuj jen odmítnutí se stavem 429, nejvýš třikrát na stránku, a před každým opakováním počkej `await sleep(retryAfterMs)`. Každé jiné odmítnutí nech propadnout dál.',
          'Tenanta nikdy nehádej. Zákazník bez záznamu v indexu i zákazník s řádky na dva tenanty vedou na přeskočení a nikdy na případ.',
          'Index, případy, přeskočení i počítadlo drž uvnitř `buildCaseList`, aby druhé volání nad stejným klientem začínalo od nuly.',
          '`sleep(ms)` dodává harness úlohy. Nedefinuj si vlastní a nepoužívej reálné časovače.',
        ],
        hints: [
          'Index zákazníků postav dřív, než sáhneš na feed. `Map` z customer id na tenant id odpoví na každou otázku, kterou průchod položí, a uložit `null` u zákazníka, jehož řádky si odporují, ti jedním lookupem oddělí „neznám“ od „nejde rozhodnout“.',
          '`client.listTickets` odmítá obyčejným objektem, ne instancí Error. Odchyť ho, zkontroluj `error.status === 429`, dej `await sleep(error.retryAfterMs)` a zavolej `client.listTickets` znovu se stejným cursorem. Všechno ostatní vyhoď dál.',
          'Jeden `Set` id ticketů pokryje oba seznamy. Přidej id dřív, než se rozhodneš, co s ticketem uděláš, a každá pozdější kopie skončí v počtu duplicit bez ohledu na to, do kterého seznamu šla ta první.',
        ],
        approach: [
          'Rozděl `csvText` po řádcích, zahoď hlavičku a u každého neprázdného řádku přečti první dva sloupce oříznuté. Řádek s prázdnou hodnotou přeskoč. Při prvním výskytu ulož tenanta; při pozdějším řádku s jiným tenantem ulož u toho zákazníka `null`.',
          'Napiš `fetchPage(cursor)`: zavolej `client.listTickets(cursor)` a při odmítnutí se `status === 429` počkej `await sleep(error.retryAfterMs)` a zkus stejný cursor znovu, nejvýš třikrát. Všechno ostatní i překročený rozpočet vyhoď dál.',
          'Deklaruj `cases`, `skipped`, `Set` viděných id ticketů a počítadlo duplicit uvnitř `buildCaseList`.',
          'Jdi od `cursor = null` po `page.nextCursor`, dokud není `null`. I prázdné pole `tickets` má cursor, po kterém se jde dál.',
          'U každého ticketu: duplicita, pak chybějící customer id, pak neznámý zákazník, pak nejednoznačný zákazník, pak případ. Oba seznamy seřaď podle id jako text a vrať je.',
        ],
        criteria: [
          {
            label: 'Správné případy, přeskočení, duplicity a přiškrcení',
            detail:
              'Průchod, zařazení nebo tvar záznamu nesedí. Ověř, že jdeš po `nextCursor` přes všechny tři stránky, že případ je přesně `{ id, tenantId, customerId, subject }` s oběma id oříznutými, že customer id ze samých bílých znaků je přeskočení `no-customer-id`, že opakování jakéhokoli už zařazeného id je duplicita, že oba seznamy jsou seřazené podle id jako text a že se 429 opakuje na stejný cursor po `sleep(retryAfterMs)`, zatímco každé jiné odmítnutí propadne beze změny dál.',
          },
          {
            label: 'Každý případ nese tenanta, kterému jeho zákazník patří',
            detail:
              'Do seznamu se dostal případ s tenantem, který export neunese, nebo se z ticketu, který měl být přeskočen, stal případ. Tenant přichází z indexu zákazníků a odnikud jinud: zákazník chybějící v exportu je `unknown-customer`, zákazník s řádky na dva tenanty je `ambiguous-customer` a ani jeden nikdy nevyrobí případ. Vzít z rozporné dvojice první řádek je obvyklá chyba a strčí případ jednoho tenanta do fronty druhého.',
          },
          {
            label: 'Stejný výsledek při opakovaném načtení',
            detail:
              'Druhé `buildCaseList(client, csvText)` nad stejným klientem vrátilo něco jiného než první. Obvyklá příčina je stav, který přežije jedno volání: pole, `Map`, `Set` nebo počítadlo deklarované mimo funkci, takže opakované spuštění přidává k prvnímu běhu místo čistého startu. Přesuň je všechny dovnitř `buildCaseList`.',
          },
        ],
        testLabels: [
          'čtyři použitelné případy přes tři stránky, seřazené podle id',
          'případ nese id, tenantId, customerId a subject a nic víc',
          'customer id s mezerami sedne na řádek exportu s mezerami',
          'čtyři tickety se vykážou místo zahození, každý se svým důvodem',
          'jeden ticket dorazí na dvou stránkách',
          'oba případy Kestrelu nesou tenanta Kestrelu',
          'tři stránky a jedno opakování: čtyři požadavky a opakování jde na stejný cursor',
          'opakování počká tu dobu retryAfterMs, kterou odmítnutí neslo',
          'opakované spuštění nad stejným klientem vrátí stejný seznam i stejné počty',
        ],
      },
    },
    'fde-v1-c01-guarded-retrieval': {
      title: 'Fáze 3 — podepřený návrh: ocituj, nebo odmítni',
      summary:
        'Navrhni pro případ Marlbrooku jednu akci a postav ji jenom na povolených článcích znalostní báze: filtruj podle tenanta a viditelnosti dřív, než řadíš, cituj podle id článku, odmítni, když ji nic neunese, a instrukci nalezenou uvnitř článku ber jako data. Každý článek, operátor i odpověď modelu je syntetická fixture.',
      code: {
        prompt:
          'Napiš funkci `proposeAction(viewer, results, modelOutput)`, která vrátí to, co u jednoho případu uvidí operátor.\n\n`results` je to, co vrátilo vyhledávání (retrieval) ve znalostní bázi Marlbrooku, už s vyhodnocenými skóre: každý článek nese `id`, `tenantId`, `visibility`, `updatedAt`, `score`, `action` a `text`. `viewer` je operátor: `{ tenantId, clearances }`. `modelOutput` je **řetězec** — odpověď, kterou model dal po přečtení těch článků. Je to nedůvěryhodný vstup, přesně jako ty články.\n\nPostupuj v tomhle pořadí a zastav se u prvního odmítnutí.\n\n1. **Nejdřív filtruj, pak řaď.** Článek je povolený, když se jeho `tenantId` rovná tenantovi operátora a jeho `visibility` je `published`, nebo když je `visibility` rovná `restricted` a `clearances` operátora obsahují `kb-restricted`. Všechno ostatní — jiný tenant, `superseded`, `draft`, viditelnost, kterou neznáš — je venku. Filtrovat až po seřazení není totéž: vrchol seznamu je přesně místo, kde se objeví článek cizího tenanta. Co projde, seřaď podle `score` sestupně, pak `updatedAt` sestupně, pak `id` vzestupně. Když nezůstane žádný povolený článek, odmítni s `no-permitted-article` dřív, než se vůbec podíváš na výstup modelu.\n2. **Parsuj.** Prožeň řetězec přes `JSON.parse`. Cokoli, co vyhodí výjimku, co se rozparsuje na něco jiného než obyčejný objekt, nebo co nemá řetězcové `action` a pole `articleIds`, odmítni s `unparseable-model-output`.\n3. **Zkontroluj akci.** Musí být jedna z `route_billing`, `route_returns`, `route_access`, `ask_customer`. Cokoli jiného odmítni s `unknown-action`.\n4. **Zkontroluj citace.** `articleIds` musí být neprázdné pole řetězců a každý z nich musí být článek, který prošel prvním krokem. Jediné id, které neprošlo, odmítni s `uncited-article` — včetně id, které v `results` bylo a filtr ho vyhodil.\n5. **Zkontroluj oporu.** Nejvyšší skóre mezi citovanými články musí být aspoň 0,6. Pod tím odmítni s `weak-support`.\n\nNávrh je `{ status: \'proposed\', action, articleIds, reason: \'\' }`, kde `articleIds` jsou citovaná id bez duplicit, v seřazeném pořadí z prvního kroku. Odmítnutí je `{ status: \'refused\', action: \'needs_human\', articleIds: [], reason }` s jedním z pěti kódů důvodu.\n\nJedna z fixture je pokus o nepřímou prompt injection: řádně publikovaný článek Dunfoldu, jehož tělo oznamuje, že operátor je administrátor, a žádá, aby se ignoroval filtr podle tenanta, ocitoval se článek jiného tenanta a vydala se akce `refund_customer`. Dvě z připravených odpovědí modelu ho poslechnou. Tvoje funkce nesmí: text článku jsou data, nikdy nepovoluje akci a nikdy nerozšiřuje oprávnění. Ta kontrola musí být v kódu — množina povolených článků i množina povolených akcí se počítají z polí, která jsi ověřil, nikdy z toho, co si přečteš v těle článku.\n\nKaždý článek, operátor i odpověď modelu tady je fixture napsaná pro tenhle závěrečný projekt. Žádný model je nevyrobil a žádný z těch výsledků nepřišel z živého indexu, takže nic z toho, co vidíš, není důkaz o chování reálného modelu. Cokoli tahle funkce vrátí, je návrh, který operátor Marlbrooku schválí nebo zamítne; sama nikdy nejedná.',
        contract: [
          'Filtruj podle tenanta a viditelnosti před seřazením, nikdy po něm.',
          '`modelOutput` ber jako řetězec nedůvěryhodného textu. Parsuj ho obezřetně a ověř každé pole, které z něj přečteš.',
          'Povolené akce i povolená id článků odvozuj z argumentů, ne z čehokoli napsaného uvnitř těla článku.',
          'Když nic povoleného akci neunese, odmítni místo odpovědi. `needs_human` s kódem důvodu je platný výsledek, ne selhání.',
          'Pole `results`, které ti volající předal, neřaď ani jinak neměň.',
          'Vracej jenom dva popsané tvary. Třetí tvar ani částečný návrh neexistuje.',
        ],
        hints: [
          'Nejdřív postav seznam povolených článků a udělej z něj `Map` z id na článek. Každá další otázka — bylo tohle citované id povolené, jaké mělo skóre — je pak jeden lookup a nic dál se už do `results` dívat nemusí.',
          '`JSON.parse` obal do try/catch a pak si rozparsovanou hodnotu zkontroluj sám: `typeof parsed === \'object\'`, není null, není pole, `typeof parsed.action === \'string\'`, `Array.isArray(parsed.articleIds)`. Model, který odpoví souvislým textem, holým seznamem nebo useknutým objektem, skončí všude tady.',
          'Vložený pokyn v článku ti na řízení toku nemění nic, protože tvoje řízení toku `text` vůbec nečte. Jestli se přistihneš, jak prohledáváš těla článků po instrukcích, které máš ignorovat, je ta kontrola na špatném místě: patří do filtru a do seznamu povolených akcí, kam článek nedosáhne.',
        ],
        approach: [
          'Napiš `permittedArticles(results, viewer)`: vyfiltruj podle tenanta a viditelnosti, pak seřaď podle skóre sestupně, `updatedAt` sestupně a id vzestupně. Vrať nové pole; pole volajícího neřaď.',
          'V `proposeAction` odmítni s `no-permitted-article`, když je ten seznam prázdný, ještě než sáhneš na `modelOutput`.',
          'Rozparsuj řetězec uvnitř try/catch a ověř tvar: obyčejný objekt s řetězcovým `action` a polem `articleIds`, jinak odmítni s `unparseable-model-output`.',
          'Odmítni s `unknown-action`, když akce není v povoleném seznamu, pak projdi citovaná id a odmítni s `uncited-article` u prvního, které není povolené id, nebo když se necitovalo nic.',
          'Vezmi nejvyšší skóre mezi citovanými články, pod 0,6 odmítni s `weak-support` a jinak vrať návrh s citovanými id v seřazeném pořadí.',
        ],
        criteria: [
          {
            label: 'Tvar návrhu a pořadí kontrol',
            detail:
              'Vrácený tvar nebo pořadí kontrol je špatně. Oba tvary jsou přesné: návrh je `{ status, action, articleIds, reason: \'\' }` a odmítnutí je `{ status: \'refused\', action: \'needs_human\', articleIds: [], reason }`. Citace se vracejí bez duplicit a v seřazeném pořadí a kontroly běží v uvedeném sledu — povolená množina, parsování, akce, citace, opora — takže poškozená odpověď proti prázdné povolené množině pořád odmítne s `no-permitted-article`.',
          },
          {
            label: 'O tenantovi a viditelnosti se rozhoduje před řazením',
            detail:
              'Do seřazené množiny se dostal článek, který operátor číst nesmí, nebo z ní vypadl článek, který číst smí. Články jiného tenanta, `superseded`, `draft` i každá neznámá viditelnost jsou venku; `restricted` je uvnitř jenom pro operátora s oprávněním `kb-restricted`. Seřadit napřed a odfiltrovat až vítěze tady neprojde, protože nejvýš skórující článek je přesně to místo, kde se ten zakázaný objeví.',
          },
          {
            label: 'Text článku nikdy nepovoluje akci ani citaci',
            detail:
              'Něco, co model řekl, se přijalo bez porovnání s povolenou množinou a se seznamem povolených akcí. Tělo článku, které si nárokuje administrátorská práva, jmenuje článek jiného tenanta nebo si vymyslí akci, nemění nic, protože oba seznamy se staví z ověřených polí. Citované id, které není povolené id, je odmítnutí i tehdy, když model zní jistě, a neřetězcová položka v `articleIds` také.',
          },
          {
            label: 'Odmítne místo nepodepřené odpovědi',
            detail:
              'Funkce odpověděla tam, kde neměla o co se opřít. Žádný povolený článek, žádná citace nebo nejvyšší citované skóre pod 0,6 vedou na `needs_human` s odpovídajícím důvodem. Vrátit stejně nejvyšší článek nebo ocitovat článek, který model nejmenoval, podá operátorovi návrh, který znalostní báze neunese.',
          },
        ],
        testLabels: [
          'podepřená akce, ocitovaná podle id článku',
          'dvě citace se vrátí v seřazeném pořadí, ne v tom, jak je model vyjmenoval',
          'nejvýš skórující článek patří jinému tenantovi a citovat se nedá',
          'omezený článek je bez oprávnění mimo dosah',
          'tentýž článek je v pořádku pro operátora s oprávněním kb-restricted',
          'akci, kterou si vyžádalo tělo článku, workbench neprovádí',
          'článek, který tělo modelu podstrčilo k citaci, patří jinému tenantovi',
          'odpověď modelu zabalená do souvislého textu není výsledek',
          'nic povoleného neskóruje dost vysoko, aby akci uneslo',
        ],
      },
    },
    'fde-v1-c01-evaluation': {
      title: 'Fáze 4 — vyhodnocení: vítěz, kterého umíš obhájit',
      summary:
        'Změř deterministické směrování Marlbrooku proti dodaným výsledkům modelových kandidátů na 24 vyčleněných syntetických případech a vykaž přesnost, abstention, přesnost po výsecích, cenový a latenční ukazatel dřív, než vyhlásíš vítěze podle sepsaného pravidla.',
      code: {
        prompt:
          'Napiš funkci `compareCandidates(dataset, candidates, baselineId)`, která vrátí přehled, jaký si vedoucí supportu Marlbrooku přečte dřív, než se cokoli zapne.\n\n`dataset` je 36 označkovaných případů, každý `{ id, slice, expected, split }`. `slice` je typ ticketu — `billing`, `returns` nebo `access`. `split` je `tune` u případů, proti kterým se směrování stavělo, a `holdout` u těch, které nikdy nevidělo. Hodnoť vyčleněné (held-out) případy a nic jiného; ladicí případy jsou v souboru proto, aby se dala udělat chyba a spočítat všechno, a přesně o to jde.\n\nKaždý kandidát je `{ id, predictions }`, kde `predictions` mapuje id případu na `{ action, costUnits, latencyMs }`. Jeden kandidát je deterministické směrování pojmenované v `baselineId`. `costUnits` a `latencyMs` jsou ukazatele dodané s fixture, ne měření, které bys sám dělal.\n\nU každého kandidáta, jen přes vyčleněné případy:\n\n- **accuracy** — správné ÷ hodnocené. Chybějící predikce se počítá jako špatná a `abstain` také.\n- **abstention** — počet predikcí `abstain` ÷ hodnocené, hlásí se vedle přesnosti a nikdy se do ní nezaplete.\n- **bySlice** — tatáž přesnost uvnitř každého výseku, který se mezi hodnocenými případy objeví, jako `{ billing, returns, access }`.\n- **costPerCase** — součet `costUnits` ÷ hodnocené. Chybějící predikce přispěje nulou.\n- **latencyP50** — dolní medián hodnocených `latencyMs`: seřaď vzestupně a vezmi hodnotu na indexu `Math.ceil(n / 2) - 1`. Chybějící predikce přispěje nulou, což stojí za povšimnutí — kandidát, který neodpoví, vypadá rychle a levně a ukážou to jenom přesnost a abstention.\n\nPřesnost, abstention, každou hodnotu v `bySlice`, `costPerCase` i `latencyP50` zaokrouhli na tři desetinná místa a porovnávej zaokrouhlená čísla.\n\n**Pravidlo vítěze, sepsané dřív, než se podíváš na čísla.** Kandidát jiný než baseline je způsobilý, když je jeho přesnost ostře vyšší než u baseline **a** žádný jeho výsek není o víc než 0,02 pod baseline ve stejném výseku. Kandidát, který baseline překoná v průměru, ale na testu výseků selže, jde do `blocked`, seřazeno vzestupně. Mezi způsobilými je vítěz ten s nejvyšší přesností, pak s nižším `costPerCase`, pak s nižším `latencyP50`, pak s id, které je v abecedě dřív. Když není způsobilý nikdo, zůstává baseline, protože průměr, který se zlepší, zatímco se jeden typ ticketů zhorší, není zlepšení, na kterém se vedoucí supportu domluvil.\n\nVrať `{ scored, reports, blocked, winner, reason }`. `reports` drží jedno `{ id, accuracy, abstention, bySlice, costPerCase, latencyP50 }` na kandidáta, v pořadí, v jakém přišli. `reason` je `candidate-wins`, když vyhrál způsobilý kandidát, a `baseline-kept`, když ne. Když v datasetu není vyčleněný ani jeden případ, vrať `scored: 0`, každý report vynulovaný s prázdným `bySlice`, `blocked: []`, jako vítěze baseline a důvod `no-holdout-cases` — na důkazech, které nemáš, porovnávat nejde.\n\nDataset i výsledky kandidátů jsou fixture napsané pro tenhle závěrečný projekt. Tyhle predikce nevyrobil žádný model a žádný požadavek se neměřil, takže ta čísla říkají, jak se chová tohle porovnání, ne jak si vede jakýkoli model.',
        contract: [
          'Hodnoť jenom případy, jejichž `split` je `holdout`. Ladicí případy tam jsou a počítat se nesmějí.',
          'Chybějící predikce je špatná a do cenového i latenčního ukazatele přispěje nulou.',
          'Přesnost, abstention, cenu i latenci hlas jako samostatná čísla. Nikdy je neslévej do jednoho skóre.',
          'Zaokrouhluj na tři desetinná místa a při pravidle vítěze porovnávej zaokrouhlené hodnoty.',
          'Pojistku na výseky uplatni dřív, než cokoli rozhodne porovnání přesnosti: kandidát o víc než 0,02 pod baseline v kterémkoli výseku je zablokovaný bez ohledu na svůj průměr.',
          'Když není způsobilý nikdo, ponech baseline. Deterministické směrování, které nikdo nepřekonal, je legitimní vítěz.',
        ],
        hints: [
          'Vyfiltruj z datasetu vyčleněné řádky jednou, ještě než začneš cokoli hodnotit, a to pole předej každému kandidátovi. Každý jmenovatel v přehledu je pak totéž číslo a ladicí případy nemůžou proniknout do jedné metriky a chybět v druhé.',
          'Po výsecích sčítej do `Map` z názvu výseku na `{ correct, total }`. V `bySlice` pak skončí jenom výseky, které se mezi hodnocenými případy objevily, a proto je report u prázdné vyčleněné sady prázdný objekt, a ne tři nuly.',
          'Test způsobilosti dělej ve dvou krocích: nejdřív porovnání přesnosti proti baseline, pak pojistka na výseky. Kandidát, který neprojde přesností, není ani zablokovaný, ani způsobilý — prostě prohrál, a `blocked` je vyhrazené pro ty, jejichž průměr vypadal jako výhra.',
        ],
        approach: [
          'Vyfiltruj z `dataset` řádky se `split` rovným `holdout`. Když nezůstane žádný, vrať vynulovaný report s důvodem `no-holdout-cases`.',
          'U každého kandidáta projdi ty řádky jednou: najdi predikci podle id případu, započítej zásah, když se její akce rovná `expected`, započítej abstention, když je akce `abstain`, přičti cenu, ulož latenci a doplň součet výseku. Chybějící predikce je minutí s cenou 0 a latencí 0.',
          'Latence seřaď vzestupně, vezmi hodnotu na `Math.ceil(n / 2) - 1` a každé hlášené číslo zaokrouhli na tři desetinná místa.',
          'Porovnej každý report mimo baseline s baseline: nižší nebo stejná přesnost znamená konec; vyšší přesnost, ale o víc než 0,02 nižší výsek znamená zablokování; jinak je způsobilý.',
          'Způsobilé reporty seřaď podle přesnosti sestupně, pak ceny vzestupně, pak latence vzestupně, pak id, a vrať první jako vítěze s důvodem `candidate-wins`. Když není způsobilý nikdo, vrať id baseline a `baseline-kept`.',
        ],
        criteria: [
          {
            label: 'Metriky, zaokrouhlení a tvar přehledu',
            detail:
              'Jedno z těch pěti čísel nebo tvar kolem nich nesedí. Přesnost počítá chybějící predikci i `abstain` jako špatné; abstention počítá `abstain` přes týž jmenovatel; `bySlice` drží jednu zaokrouhlenou přesnost na výsek přítomný mezi hodnocenými případy; `costPerCase` je průměr a `latencyP50` dolní medián na indexu `Math.ceil(n / 2) - 1`. Všechno hlášené je zaokrouhlené na tři desetinná místa a `reports` drží pořadí, v jakém kandidáti přišli.',
          },
          {
            label: 'Hodnotí se jenom vyčleněná sada',
            detail:
              'Započítaly se ladicí případy. Každý kandidát v téhle fixture odpovídá na ladicí sadě líp než na vyčleněné, protože právě proti ní se stavěl, takže hodnocení všech 36 nafoukne každé číslo a může předat porovnání jinému kandidátovi. Vyfiltruj `split === \'holdout\'` jednou a používej to pole jako jmenovatel pro přesnost, abstention, cenu i latenci stejně.',
          },
          {
            label: 'Propad ve výseku zablokuje kandidáta, kterého by průměr vybral',
            detail:
              'Kandidát, jehož celková přesnost překonala baseline, zatímco jeden výsek zaostal o víc než 0,02, směl vyhrát — nebo se zablokoval kandidát bez propadu. Pojistka běží po výsecích proti přesnosti baseline v tomtéž výseku a `blocked` vypisuje jenom kandidáty, kteří baseline nejdřív celkově překonali a pak na ní neprošli; kandidát, který baseline nikdy nepřekonal, prohrál na přesnosti a zablokovaný není.',
          },
          {
            label: 'Cena a latence se hlásí vedle kvality, ne uvnitř ní',
            detail:
              'Cenový a latenční ukazatel chybí, jsou slité s přesností, nebo se počítají přes špatnou množinu případů. Oba se u každého kandidáta hlásí jako vlastní čísla, přes tytéž vyčleněné případy jako přesnost, a chybějící predikce přispěje do každého nulou. Vedoucí supportu potřebuje vidět, že ten přesný kandidát je zároveň ten drahý; jedno slité skóre přesně tohle zakryje.',
          },
        ],
        testLabels: [
          '24 z 36 případů je vyčleněných a hodnotí se jenom ty',
          'deterministické směrování: 18 z 24, žádná abstention, žádná cena za model',
          'candidate-a: lepší na dvou výsecích, na třetím stejný, a dvakrát se zdrží',
          'candidate-b je na dvou výsecích bezchybný a třetí půlí',
          'kandidáta s lepším průměrem zablokuje výsek access',
          'vítězem je kandidát, který se zlepšil bez propadu ve výseku',
          'když je v nabídce jenom ten propadlý, frontu si nechá deterministické směrování',
          'cena a latence stojí vedle přesnosti jako vlastní sloupce',
          'nic vyčleněného znamená nic změřeného a baseline zůstává',
        ],
      },
    },
    'fde-v1-c01-change-request': {
      title: 'Fáze 5 — change request: třetí tenant a přiškrcený rozpočet',
      summary:
        'Marlbrook přidává Ardwell Chemicals, omezený třetí tenant, a zkracuje rozpočet na směrování. Drž články Ardwellu dál od zbylých dvou tenantů, při překročení rozpočtu spadni na deterministické směrování a nech projít každý dřívější akceptační případ.',
      code: {
        prompt:
          'Po demu z třetí fáze se změnily dvě věci.\n\n**Třetí tenant.** Ardwell Chemicals (`TEN-9350`) se onboarduje a v jeho znalostní bázi jsou kódy k bráně areálu a eskalační rozpis. Ingest Marlbrooku část těch článků označil `tenantId: \'SHARED\'` — štítkem, který používá pro články čitelné každým tenantem, třeba pro vlastní fakturační pravidla — a jediné, co je odděluje, je pole `restrictedTo` se jménem tenanta, kterému patří. Brát `SHARED` jako „tohle smí číst kdokoli“ znamená podat kódy k bráně Ardwellu operátorovi Dunfoldu.\n\n**Přiškrcený rozpočet.** Směrování má teď na případ rozpočet v milisekundách a asistovaná cesta se do něj musí vejít dřív, než se spustí, ne až potom.\n\nNapiš funkci `routeCase(request)`, kde `request` je `{ ticket, viewer, results, modelOutput, budgetMs, timings }` a `timings` je `{ retrievalMs, projectedModelMs }` — co už stálo vyhledávání a co má podle odhadu přidat volání modelu.\n\n1. **Nejdřív rozpočet.** Když je `retrievalMs + projectedModelMs` větší než `budgetMs`, model vůbec nepoužij. Směruj deterministicky z `ticket.subject` převedeného na malá písmena: `invoice`, `billing` nebo `charge` dá `route_billing`; `return` nebo `refund` dá `route_returns`; `password`, `login` nebo `access` dá `route_access`; kontroluj je v tomhle pořadí. Shoda vrátí `{ status: \'proposed\', path: \'deterministic\', action, articleIds: [], reason: \'latency-budget\' }` — žádné citace, protože deterministické směrování žádný článek nečte a předstírat opak by operátorovi položilo před oči id článku, které nic nevybralo. Žádná shoda vrátí `{ status: \'refused\', path: \'deterministic\', action: \'needs_human\', articleIds: [], reason: \'no-rule-matched\' }`. Rovnost s rozpočtem je uvnitř rozpočtu.\n2. **Jinak asistovaná cesta**, přesně jak ji hodnotila třetí fáze, s `path: \'assisted\'` přidaným do obou tvarů a se vším ostatním beze změny: stejných pět kódů důvodu, stejné pořadí kontrol, stejný tvar odmítnutí.\n\nPravidlo pro povolený článek dostává jednu klauzuli navíc, kontrolovanou před ostatními: článek s `restrictedTo`, které není tenant operátora, je venku, ať říká cokoli jiného. Potom je článek povolený, když je jeho `tenantId` tenantem operátora nebo `SHARED` a jeho viditelnost je `published`, případně `restricted` u operátora s oprávněním `kb-restricted`.\n\nSoučástí hodnocení je každý dřívější akceptační případ. Citace přes tenanta, omezený článek s oprávněním i bez něj, nahrazený článek, oba pokusy o injection, odpověď souvislým textem i odmítnutí pro slabou oporu se musejí vrátit se stejným statusem, akcí, citacemi a důvodem jako ve třetí fázi — to je smysl change requestu a proto jsou ve viditelných testech, a ne ve skrytých.\n\nČlánky, odpovědi modelu i obě časové hodnoty jsou fixture. Nic tady nevolá model ani neměří skutečný požadavek, takže ta latenční čísla popisují tohle cvičení, ne žádného poskytovatele.',
        contract: [
          'Odhadovanou latenci zkontroluj dřív než cokoli jiného a model úplně přeskoč, když by se rozpočet překročil.',
          '`retrievalMs + projectedModelMs` rovné `budgetMs` je uvnitř rozpočtu.',
          'Deterministická cesta necituje nic. `articleIds` je u obou jejích tvarů prázdné.',
          'Článek, jehož `restrictedTo` jmenuje jiného tenanta, není povolený nikdy, ať jeho `tenantId` nebo oprávnění operátora říkají cokoli.',
          '`SHARED` znamená čitelné každým tenantem jenom tehdy, když to `restrictedTo` nezužuje.',
          'Chování z třetí fáze nech nedotčené: stejné kódy důvodu, stejné pořadí kontrol, stejné dva tvary plus `path`.',
        ],
        hints: [
          'Test rozpočtu dej úplně na začátek `routeCase`, ještě před stavbu povolené množiny. Vyhledávání už proběhlo; rozhoduješ o tom, jestli utratit volání modelu, takže při záporné odpovědi nemá nic za tím testem běžet.',
          'Klauzule s `restrictedTo` patří ve filtru na první místo, ne na poslední. Článek může být `SHARED`, `restricted` i čitelný pro operátora s oprávněním `kb-restricted` — a pořád patřit Ardwellu; říká to jedině `restrictedTo`.',
          'Logiku z třetí fáze drž v jedné funkci a volej ji z asistované větve. Zkopírovat ji a upravit kopii je způsob, jak dřívější akceptační případy potichu přestanou procházet.',
        ],
        approach: [
          'Napiš `routeDeterministically(ticket, reason)`: převeď subject na malá písmena, projdi tři pravidla v pořadí a vrať návrh bez citací, nebo odmítnutí `no-rule-matched`.',
          'Přidej do filtru povolených článků klauzuli s `restrictedTo`, pak klauzuli se `SHARED` a pak stávající pravidla na viditelnost a oprávnění. Řazení nech, jak bylo.',
          'V `routeCase` sečti odhadovanou latenci a porovnej ji s `budgetMs`. Překročení jde rovnou na deterministické směrování s důvodem `latency-budget`.',
          'Pod rozpočtem prožeň případ nezměněným sledem z třetí fáze — povolená množina, parsování, akce, citace, opora — a k tomu, co vrátí, přidej `path: \'assisted\'`.',
          'Před odevzdáním si znovu spusť případy z třetí fáze. Každý z nich má vrátit to, co vracel tehdy, jenom s přidaným `path`.',
        ],
        criteria: [
          {
            label: 'Obě cesty vracejí správný tvar',
            detail:
              'Vrácený tvar je špatně. Obě cesty nesou `path`, `status`, `action`, `articleIds` a `reason`. Deterministický návrh necituje nic a nese důvod `latency-budget`; jeho odmítnutí je `no-rule-matched`; asistovaná cesta si drží tvary z třetí fáze s přidaným `path: \'assisted\'`. Pravidla směrování se kontrolují v pořadí billing, returns, access, nad subjectem převedeným na malá písmena.',
          },
          {
            label: 'Omezené články Ardwellu zůstávají uvnitř Ardwellu',
            detail:
              'Článek s `restrictedTo: \'TEN-9350\'` se dostal k operátorovi jiného tenanta, nebo se skutečně sdílený článek zablokoval tenantovi, který ho číst smí. Klauzule s `restrictedTo` běží před pravidly na tenanta a viditelnost, takže štítek `SHARED` a oprávnění `kb-restricted` dohromady pořád nestačí. Operátor Dunfoldu se všemi oprávněními, která Marlbrook vydává, nesmí být schopen ocitovat `KB-950`.',
          },
          {
            label: 'O rozpočtu se rozhoduje před voláním modelu, ne po něm',
            detail:
              'Test rozpočtu chybí, je na špatném místě, nebo je obrácený. `retrievalMs + projectedModelMs` větší než `budgetMs` znamená, že asistovaná cesta vůbec neběží a odpoví deterministické směrování s důvodem `latency-budget`; rovnost s rozpočtem znamená, že běží. Rozpočet umí vyčerpat samotné vyhledávání a případ bez odpovídajícího pravidla pak odmítne s `no-rule-matched`, místo aby spadl zpátky do modelu.',
          },
          {
            label: 'Každý akceptační případ z třetí fáze pořád prochází',
            detail:
              'Případ, který ve třetí fázi procházel, už neprochází. Citace přes tenanta, omezený článek s oprávněním i bez něj, nahrazený článek, oba pokusy o injection, nerozparsovatelná odpověď i odmítnutí pro slabou oporu si drží svůj status, akci, citace a důvod, jen s přidaným `path: \'assisted\'`. Přepsat filtr od nuly místo přidání klauzule s `restrictedTo` je obvyklý způsob, jak se jeden z nich rozbije.',
          },
        ],
        testLabels: [
          'třetí fáze pořád prochází: podepřená akce, ocitovaná',
          'třetí fáze pořád prochází: článek jiného tenanta se citovat nedá',
          'třetí fáze pořád prochází: podstrčená citace se odmítne',
          'třetí fáze pořád prochází: slabá opora pořád odmítá',
          'operátor Dunfoldu se všemi oprávněními nemůže citovat kódy k bráně Ardwellu',
          'tentýž článek je pro operátora Ardwellu přesně to pravé',
          'skutečně sdílený článek je pořád čitelný pro každého tenanta',
          'nad rozpočtem: odpoví deterministické směrování a necituje nic',
          'nad rozpočtem a bez odpovídajícího pravidla: případ jde na člověka',
        ],
      },
    },
    'fde-v1-c01-handoff': {
      title: 'Fáze 6 — incident a předání',
      summary:
        'Uzavři zakázku pro Marlbrook: diagnostikuj dodanou trasu z nasazení, napiš plán rollbacku, runbook, UAT checklist, osnovu dema a jedno zlepšení produktu. Zaznamenává se jako vlastní revize a zobrazuje odděleně od hodnocených cvičení.',
      artifact: {
        brief:
          'Workbench šel v úterý v 10:02 na 25 % objemu případů Marlbrooku. V 10:15 se vedoucí supportu ptal, proč případy Kestrel Foods přestaly chodit s citacemi a proč série případů Dunfoldu přišla zpátky s odmítnutím cokoli navrhnout. Trasa v prvním poli je to, co workbench zaznamenal. Nic jiného se nezachytilo, což je samo o sobě součást odpovědi.\n\nŠest polí k napsání a jeden volitelný odkaz. Diagnóza čte trasu a říká, co selhalo, co ne a co bys potřeboval, aby sis byl jistý. Plán rollbacku říká, jak se vrátíš zpátky, co to nespraví a kdo o tom rozhoduje. Runbook je to, co příští inženýr pustí ve tři ráno. UAT checklist je to, co vedoucí supportu odškrtá, než to přijme. Osnova dema je patnáct minut před VP, který si tohle vyžádal. Zlepšení produktu je jedna věc, kterou bys poslal zpátky tomu, kdo platformu vlastní, napsaná tak, aby s ní uměl něco udělat.\n\nTrasa, časy, incident i firma jsou fixture napsané pro tenhle závěrečný projekt. Nic se nenasazovalo, nikdo neobtěžoval operátora a nikde v tom nejsou zákaznická data.\n\nTohle odevzdání se zaznamenává jako vlastní revize a zobrazuje jako „Portfolio self-reviewed“, odděleně od čtyř hodnocených cvičení výš. Automatická kontrola ověří, že je každé povinné pole vyplněné a vejde se do svého limitu — neposoudí, jestli se tvůj rollback dá bezpečně pustit, jestli by tvůj runbook pod tlakem fungoval, ani jestli je tvoje diagnóza správná. Přečti si vlastní odpověď proti řádkům rubriky Provozovatelnost, Komunikace a Bezpečnost a pak ji zreviduj.\n\nSplnění všech požadavků tohohle modulu zapíše „FDE guided path completed“. Ta věta je celý nárok: říká, co jsi ve cvičeních devSharku prošel. Není to certifikace, není to hodnost, není to doklad o produkční praxi a není to tvrzení o zaměstnání. Volitelné lokální projekty, procvičování Pythonu i pokusy s živým modelem, které si pustíš sám, nedávají žádné XP, žádný přístup a na dokončení nemají vliv.',
        fields: [
          {
            label: 'Diagnóza incidentu',
            help:
              'Přečti tuhle trasu a napiš, co se stalo. Spany jsou v pořadí; `path` je cesta směrování, kterou workbench zvolil, a `ms` je latence celého případu. Rozpočet byl 1200 ms.\n\n10:02:14 route.case tenant=TEN-4021 path=assisted ms=940 status=proposed cites=1\n10:03:48 route.case tenant=TEN-7788 path=assisted ms=1180 status=proposed cites=2\n10:06:05 kb.index.rebuild started (oba tenanti, bez oznámení o nasazení)\n10:07:02 kb.search tenant=TEN-7788 ms=1520\n10:07:03 route.case tenant=TEN-7788 path=deterministic reason=latency-budget\n10:09:40 kb.search tenant=TEN-7788 ms=2100\n10:09:42 route.case tenant=TEN-7788 path=deterministic reason=latency-budget\n10:11:15 route.case tenant=TEN-4021 path=assisted ms=980 status=refused reason=no-permitted-article\n10:12:50 route.case tenant=TEN-4021 path=assisted ms=910 status=refused reason=no-permitted-article\n10:15:00 fronta operátorů: 61 % případů TEN-7788 dorazilo bez citace; 14 případů TEN-4021 odmítnuto\n\nNapiš, které chování byl systém dělající přesně to, na co byl navržený, a které byla porucha, pojmenuj spouštěč a napiš, jaké důkazy chybějí — tahle trasa ti neřekne všechno, co bys chtěl vědět. Odděl, co umíš podepřít, od toho, co odvozuješ. Žádná automatická kontrola tohle pole na správnost nečte.',
          },
          {
            label: 'Plán rollbacku',
            help:
              'Kroky, které vrátí Marlbrook tam, kde byl, v pořadí, u každého příkaz nebo úkon a kdo o něm smí rozhodnout. Napiš, jak dlouho to trvá, co to nespraví — už nasměrované případy, index uprostřed přestavby, operátor v půlce fronty — a jak ten stav potom srovnáš. Napiš, co bys deset minut po rollbacku sledoval, abys věděl, že vyšel.',
          },
          {
            label: 'Runbook',
            help:
              'Co příští inženýr potřebuje ve tři ráno bez jakéhokoli kontextu: co workbench dělá, na čem závisí, signály, které říkají, že je zdravý, tři nejpravděpodobnější alerty a první věc ke kontrole u každého z nich, jak ho dostat do bezpečného stavu, kdo ho vlastní a jak eskalovat. Přidej kontrolu izolace tenantů, kterou má někdo spustit po každé změně retrievalu, a napiš, co by její selhání znamenalo. Psáno pro čtenáře, který tenhle systém nikdy neviděl.',
          },
          {
            label: 'UAT checklist',
            help:
              'Jedna položka na řádek toho, co vedoucí supportu ověří před přijetím, každá napsaná tak, aby bylo jednoznačné, jestli prošla, a aby ji operátor uměl provést bez tebe. Pokryj aspoň: případ nasměrovaný s citací, kterou si operátor umí otevřít, případ, který workbench odmítne, případ od každého tenanta, operátora zamítajícího návrh a chování při pomalém vyhledávání. U každé napiš, co její selhání znamená pro přijetí.',
          },
          {
            label: 'Osnova dema',
            help:
              'Patnáct minut pro VP, který si tohle vyžádal, v pořadí a s časem u každé části. Ukaž výchozí měření, workbench na reálně vypadajícím případu, jedno odmítnutí a proč je odmítnutí správný výsledek, a naměřený výsledek proti podmínkám přijetí z první fáze. Napiš, kterou část vyhodíš první, když se schůzka protáhne, a kde čekáš nejtěžší otázku. Nepředváděj nic, co fixture ve skutečnosti neumějí.',
          },
          {
            label: 'Zlepšení produktu',
            help:
              'Jedna věc, kterou bys poslal zpátky tomu, kdo platformu vlastní, napsaná tak, aby s ní uměl něco udělat: na co jsi narazil, jak často, co jsi udělal místo toho a co by muselo existovat, aby se tomu příští zakázka vyhnula. Napiš, co by je to stálo a kdo další ten problém má. Jedna dobře podepřená položka je lepší než pět tvrzení.',
          },
          {
            label: 'Odkaz na repozitář (volitelné)',
            help:
              'Volitelné. Jestli sis něco z tohohle postavil lokálně, můžeš sem uložit odkaz. Uloží se jako text a nic víc: v1 ho nestahuje, neklonuje, nespouští ani si ho neprohlíží, a jeho uložení nedává žádný ověřený odznak a nemění žádný stav dokončení. Nechat ho prázdný tě nic nestojí.',
          },
        ],
      },
    },
  },
};
