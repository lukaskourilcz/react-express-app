/** Czech copy for M01. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Terms a Czech developer keeps in English stay in English: support, ticket,
 * knowledge base, discovery, fixture, non-goal, service level objective. Each
 * is glossed once where it first carries weight. */

import type { ModuleCs } from '../../types';

export const FDE_M01_CS: ModuleCs = {
  title: 'Zjišťování u zákazníka',
  outcomes: [
    'Najít operátora, který tu práci dělá rukama, projít s ním jednu skutečnou položku od začátku do konce a pojmenovat všechny, kdo můžou projekt zamítnout.',
    'Oddělit mechanismus, o který zákazník požádal, od práce, kterou se snaží odvést, a poznat, které „požadavky“ jsou už hotová řešení.',
    'Napsat výchozí měření jako číslo s populací, obdobím a postupem, který zopakuje i někdo jiný, a vedle něj podmínku úspěchu s datem.',
    'Sepsat hranice zadání jako non-goals, protože vyloučení, které nikdo nenapsal, žádné vyloučení není.',
  ],
  lessons: {
    'fde-v1-m01-l1': {
      title: 'Pracovní postup a lidé v něm',
      summary:
        'Najdi operátora, sleduj práci tak, jak dnes probíhá, odděl vyslovený požadavek od práce, kterou má člověk odvést, a pojmenuj ty, kdo můžou výsledek zamítnout.',
      sections: [
        {
          body:
            'Požadavek obvykle přijde už jako řešení. „Přidejte do supportu AI“ pojmenuje technologii a oddělení a neřekne nic o tom, co dneska nikdo nezvládá. První týden strávíš tím, že tu větu převedeš zpátky na problém, ze kterého vznikla.',
        },
        {
          body:
            'Začni tím, že najdeš operátora: člověka, který tu práci dělá rukama každý den. Málokdy je to ten, kdo ti napsal e-mail. Sponzor projekt platí a může ho zrušit; operátor rozhoduje, jestli se výsledek bude používat — tím, že ho používat bude, nebo tiše nebude. Framework NIST pro řízení rizik AI to řadí pod funkci Map: kontext a zasažené lidi urči dřív, než začneš stavět, ne potom.',
        },
        {
          caption: 'Čtyři pozice kolem jednoho projektu a co tě stojí, když některou z nich v discovery vynecháš.',
          headers: ['Role', 'Co má v ruce', 'Co tě stojí její nepřítomnost'],
          rows: [
            ['Sponzor', 'Rozpočet a to, jestli projekt vůbec pokračuje', 'Postavíš něco, čemu nikdo neodkýval provozní náklady'],
            ['Operátor', 'Jestli se výsledek bude denně používat', 'Zrychlíš krok, který nikdy nebyl ten drahý'],
            ['Kdo dává souhlas', 'Povolení sáhnout na data, peníze nebo zákazníky', 'Zamítnutí přijde až po dokončení, kdy je změna nejdražší'],
            ['Příjemce', 'Nic. Dostane výsledek a žije s ním', 'Změna, která pomůže lince a zákazníkovi zhorší den'],
          ],
        },
        {
          body:
            'Pak si tu práci prohlédni. Rozhovor ti dá práci, jakou by si dotyčný přál mít; sledování ti dá tu, kterou má. Poproš, ať si můžeš sednout k jednomu agentovi, když bude řešit tři skutečné položky, nech běžet stopky a zapisuj si každý systém, který otevře. Do konce se na nic neptej.',
        },
        {
          caption: 'Jeden ticket u Marlbrook Systems od začátku do konce, se stopkami. Projdi si ho dřív, než si přečteš, co ukázal.',
          notes: [
            'Ticket přijde v 9:12. Je to těch sedm kroků níž v tomhle pořadí a zatím se nikdo ničeho nedotkl.',
            'Agentka si ticket přečte. Stojí v něm, že nefunguje export. Bez čísla účtu, bez chybové hlášky, bez času.',
            'Agentka hledá v CRM podle domény odesílatele. Sdílejí ji tři účty. Vybere ten s otevřenou smlouvou a doufá.',
            'Nárok na funkce je ve druhém systému s vlastním přihlášením. Otevře ho a ověří, že tarif účtu plánované exporty obsahuje.',
            'Export si zreprodukuje na testovacím tenantu a vidí stejné selhání, takže zákazník nedělá nic špatně.',
            'Hledání „plánovaný export“ v knowledge base vrátí odpověď jako druhý výsledek. Ten článek už jednou viděla.',
            'Odpověď sepíše podle článku. Jeden odstavec, většina vložená, dvě věty vlastní.',
            'Odpověď odchází v 9:31. Devatenáct minut, z toho deset padlo na zjišťování, který zákazník to je a co má zaplaceno.',
          ],
          counterLabels: [
            'Uplynulé minuty',
            'Uplynulé minuty',
            'Uplynulé minuty',
            'Uplynulé minuty',
            'Uplynulé minuty',
            'Uplynulé minuty',
            'Uplynulé minuty',
            'Uplynulé minuty',
          ],
        },
        {
          body:
            'Sponzor si myslel, že agenti pořád dokola přepisují stejné odpovědi. Psaní odpovědi trvalo dvě minuty. Deset z devatenácti padlo na identitu: který účet a co má v tarifu. Hledání v knowledge base, které chtěl sponzor nahradit, trvalo minutu a fungovalo.\n\nTím se mění, co navrhneš. Propojení CRM s evidencí nároků odsud sundá většinu nákladů, nepotřebuje žádný model a dá se změřit stejnými stopkami. Deterministický kód je legitimní odpověď na otázku, která přišla se slovem AI — a tady je to ta nejlevnější věc na stole.',
        },
        {
          body:
            'Stopky výše jsou fixture: vymyšlená data napsaná pro tento modul, ne záznam skutečné linky podpory. Skutečné sledování ti dá tři tickety, které si odporují, a jednoho agenta, který je rychlejší než všichni ostatní. Zapiš tu neuklizenou verzi včetně toho, kolik položek jsi vlastně viděl — počet pozorování je součástí tvrzení.',
        },
        {
          body:
            'Druhá věc, kterou discovery odděluje, je mechanismus od práce. Vyslovený požadavek pojmenuje věc, která se má postavit. Práce je to, čeho se člověk snaží dosáhnout, za podmínek, které možná nezmínil. Z prvního na druhé se dostaneš otázkou, co bude potom umět, co dneska neumí, a tím, že odmítneš přijmout přeformulovaný mechanismus jako odpověď.',
        },
        {
          caption: 'Vymyšlený přepis. Sponzor popisuje mechanismus; agentka o úroveň níž popisuje samotnou práci.',
        },
        {
          body:
            'Část toho, co dorazí označené jako „požadavek“, je řešení, které už někdo vybral. Test je, jestli dokážeš říct, proč je to potřeba, aniž bys pojmenoval věc, která to dělá. „Asistent musí shrnout vlákno“ tím testem neprojde: shrnování je mechanismus. Zeptej se, co by to shrnutí agentce umožnilo, a dostaneš „vidět historii účtu bez otevírání tří záložek“ — což shrnutí umí a odkaz přímo v ticketu taky, a levněji.',
        },
        {
          caption: 'Tři vyslovené požadavky z discovery týdne u Marlbrooku, otázka, která každý z nich otevřela, a co z toho vylezlo.',
          headers: ['O co požádali', 'Otázka, která to rozbalí', 'Co bylo potřeba doopravdy'],
          rows: [
            ['„Shrň vlákno ticketu“', '„Co budeš umět, co teď neumíš?“', 'Vidět historii účtu bez otevírání tří záložek'],
            [
              '„Mělo by se to učit z našich starých odpovědí“',
              '„Kterou starou odpověď jsi chtěla minulé úterý?“',
              'Hledat v knowledge base podle příznaku, ne podle názvu produktu',
            ],
            ['„Ať je to rychlé“', '„Dost rychlé na co a měřeno odkud kam?“', 'Návrh na obrazovce dřív, než agentka dočte ticket'],
          ],
        },
        {
          body:
            'Poslední úkol discovery je najít lidi, kteří můžou říct ne. U Marlbrooku je ten seznam: vedoucí supportu, jehož tým to má přijmout za své; bezpečnostní reviewer, který musí schválit systém čtoucí obsah zákaznických ticketů; vlastník dat v CRM; a finanční controller, pokud by cokoli, co asistent navrhne, někdy hýbalo penězi. Nikdo z nich nebyl na kickoffu. Polož v prvním týdnu jednu otázku: kdo musí říct ano, než se tohle dotkne zákazníka, a zapiš si jména.',
        },
        {
          body:
            'Nepojmenovaný člověk s právem veta je to nejdražší, co může discovery minout, protože zamítnutí přijde až po dokončení. Bezpečnostní reviewer se zeptá, co se stane, když článek v knowledge base nebo zpráva od zákazníka obsahuje instrukci mířenou na asistenta. Přečti si před tou schůzkou seznam OWASP pro aplikace s LLM, ať tam přijdeš s odpovědí, a ne se slibem, že se na to podíváš.',
        },
        {
          body:
            'Z discovery týdne odcházejí tři věci: pracovní postup tak, jak jsi ho viděl, seznam lidí v něm i s tím, co má každý v ruce, a otázky, na které jsi odpověď nedostal. Ten třetí seznam není selhání. Napsaný je to program další schůzky; vynechaný se z něj stane předpoklad, o kterém si nikdo nepamatuje, že ho udělal.',
        },
      ],
    },
    'fde-v1-m01-l2': {
      title: 'Výchozí měření a vymezení zadání',
      summary:
        'Změř, co ta práce stojí dneska, dřív než cokoli navrhneš, napiš podmínku úspěchu jako číslo s datem a sepiš non-goals.',
      sections: [
        {
          body:
            'Zlepšení nemůžeš tvrdit bez čísla z doby předtím. Ví to každý a skoro nikdo to nedělá, protože měření je nevděčná práce, která spadne do týdne, kdy zákazník chce vidět prototyp. Změř to stejně. Je to jediná věc, díky které se o výsledku dá později přít, aniž by obě strany hádaly.',
        },
        {
          body:
            'Použitelné výchozí měření (anglicky baseline) nese čtyři části: veličinu, populaci, kterou pokrývá, období, za které vzniklo, a postup, který zopakuje i někdo jiný. Vynech populaci a nepoznáš, jestli se pohnulo číslo, nebo skladba ticketů. Vynech postup a člověk, který po nasazení měří znovu, změří něco jiného a ohlásí úspěch.\n\nKapitola o service level objectives z knihy Google SRE dělá u běžících systémů stejný rozdíl: indikátor je to, co měříš, objective je hodnota, na kterou míříš, a jsou to dvě různé věty. Výchozí měření v discovery je ten indikátor, sejmutý jednou, dřív než se čehokoli někdo dotkl.',
        },
        {
          caption: 'Čtyři věci, které lidé nabízejí jako výchozí měření. Jenom jedna z nich jím je.',
          headers: ['Nabídnuté výchozí měření', 'Zopakuje to někdo jiný?', 'Co napsat místo toho'],
          rows: [
            [
              'Support je pomalý',
              'Ne. Žádná veličina, žádná populace, žádné období.',
              'Medián minut od založení ticketu do první odpovědi agenta, tickety úrovně 1 s exportem, srpen, z exportu ticketového systému',
            ],
            [
              'Agenti tráví většinu dne opakovanými dotazy',
              'Ne. „Většina“ je pocit a nikdo se neshodl, co je opakovaný dotaz.',
              'Podíl srpnových ticketů, jejichž vyřešení cituje článek z knowledge base, spočítaný ze stejného exportu',
            ],
            [
              'Zvládneme asi 400 ticketů měsíčně',
              'Ano, a neříká to nic o bolesti, kterou máš odstranit.',
              'Nech to jako kontext a změř cenu konkrétního kroku, se kterým chceš hnout',
            ],
            [
              'Doba zpracování klesne o 40 procent',
              'To je cíl. Zatím není z čeho těch 40 procent brát.',
              'Napiš nejdřív výchozí číslo a vedle něj cíl s datem',
            ],
          ],
        },
        {
          caption: 'Výchozí měření Marlbrooku zapsané jako záznam. Čísla jsou fixture; tvar je to, co skutečné měření potřebuje.',
        },
        {
          body:
            'Postup zapiš ve chvíli, kdy měříš, ne potom. Za čtyři měsíce ho bude opakovat někdo jiný, možná vedoucí supportu, kterému projekt předáš, a „stejně jako minule“ není postup. Funkce Measure z frameworku NIST žádá od systémů s AI totéž: měření musí být zdokumentované tak, aby jiný člověk došel ke stejnému číslu.',
        },
        {
          body:
            'Podmínka úspěchu je partnerkou výchozího měření: číslo, změřené stejně, s datem. „Rychlejší třídění“ je nálada. „Medián času do první odpovědi u ticketů úrovně 1 s exportem klesne z 19 minut na 12, měřeno ze stejného exportu, do 31. března“ je věta, ve které se dá mýlit, a právě proto stojí za napsání. Dohodni ji se sponzorem a operátorem najednou, jinak bude každý měřit něco jiného.',
        },
        {
          body:
            'Napiš, jakého výseku se to číslo týká a co budeš hlásit vedle něj. Jeden medián se může zlepšit, zatímco celý typ ticketů se zhorší, a průměr přes všechny tickety to zakryje tak dlouho, dokud drží poměry objemů. Kvalitu je taky potřeba hlásit odděleně od ceny a od toho, jak dlouho to trvá: změna, která zkrátí dobu zpracování na polovinu a zdvojnásobí počet odpovědí, které musí agent opravovat, neuspěla, a jedno smíchané číslo ti neřekne, co z toho nastalo.',
        },
        {
          body:
            'Zadání na jednu stránku na konci tohoto modulu se zaznamenává jako vlastní revize. Server ověří, že je každé povinné pole vyplněné a vejde se do svého limitu, a víc počítání znaků prokázat neumí. Neřekne, jestli se tvoje výchozí měření dá zopakovat, jestli by tvých pět otázek něco změnilo, ani jestli jsi vyloučil to správné. To posoudíš sám, proti rubrice.',
        },
        {
          body:
            'Non-goals, tedy věci, které projekt v této fázi dělat nebude, jsou v zadání to nejlevnější a zároveň to, co lidé vynechávají. Vyloučení, které nikdo nenapsal, žádné vyloučení není: je to věc, kterou zákazník pořád čeká, a zjistíš to v šestém týdnu, až se zeptá, kde je. Napsat to stojí řádek a koupí ti to větu, na kterou můžeš ukázat.',
        },
        {
          caption: 'Šest kandidátů z discovery týdne u Marlbrooku, roztříděných po jednom do zadání a do non-goals.',
          notes: [
            'Z discovery týdne vyšlo šest věcí. Žádná není rozhodnutá a všech šest je sponzorovi v hlavě jako „ten projekt“.',
            'Dohledání účtu podle adresy odesílatele jde do zadání. Stopky říkají, že stojí deset minut na ticket, a dotaz do CRM a evidence nároků to zvládne bez modelu.',
            'Směrování na správnou úroveň jde do zadání. Pravidla jsou už napsaná na tabuli vedoucího supportu, takže je to deterministický kód s testem na každé pravidlo.',
            'Návrh odpovědi podle článku z knowledge base jde do zadání, s tím, že odeslání zmáčkne agent. Tady si model své místo zaslouží a je to nejmenší ze tří položek.',
            'Odesílání bez agenta je pro tuhle fázi non-goal. Vedoucí supportu to nepřijme a nikdo se neshodl, kdo odpovídá za špatnou odpověď.',
            'Přepsání knowledge base je non-goal. Je to skutečná práce s vlastním vlastníkem a vlastním harmonogramem a přibalit ji sem by posunulo termín, aniž by to někdo rozhodl.',
            'Refundace jsou non-goal. Hýbou penězi, finanční controller nebyl ani na jedné schůzce a schvalovací cesta neexistuje. Tři položky v zadání, tři sepsané mimo.',
          ],
          counterLabels: [
            'Zatím nerozhodnuto',
            'Zatím nerozhodnuto',
            'Zatím nerozhodnuto',
            'Zatím nerozhodnuto',
            'Zatím nerozhodnuto',
            'Zatím nerozhodnuto',
            'Zatím nerozhodnuto',
          ],
        },
        {
          body:
            'Non-goal, který říká jenom „mimo zadání“, si příští měsíc vyžádá tutéž debatu znovu. Dej každému důvod a, kde to jde, podmínku, která by ho vrátila zpátky. Tím se ze zamítnutí stane harmonogram a sponzor uvidí, že jsi tu věc vyloučil z důvodu, ne kvůli klidnějšímu kvartálu.',
        },
        {
          caption: 'Tři non-goals Marlbrooku, u každého důvod a podmínka, která by ho vrátila do hry.',
          headers: ['Non-goal pro tuto fázi', 'Proč je mimo', 'Co by ho vrátilo zpátky'],
          rows: [
            [
              'Odeslat odpověď bez schválení agentem',
              'Vedoucí supportu to nepřijme a nikdo se neshodl, kdo odpovídá za špatnou odpověď',
              'Kvartál měřené míry přijatých návrhů nad úrovní, na které se vedoucí supportu shodne, a jmenovitý vlastník špatných odpovědí',
            ],
            [
              'Přepsání knowledge base',
              'Obsahový projekt s jiným vlastníkem a jiným harmonogramem',
              'Vlastník obsahu s vyhrazeným časem, vedený jako samostatná práce',
            ],
            [
              'Cokoli, co vystaví refundaci',
              'Hýbe to penězi a schvalovací cesta neexistuje',
              'Finance písemně určí schvalovatele a limit částky',
            ],
          ],
        },
        {
          body:
            'Rizika patří na tutéž stránku, napsaná jako věci, které se můžou stát, ne jako kategorie. „Bezpečnostní riziko“ čtenáři neřekne nic. „Bezpečnostní reviewer návrh neviděl a čtení obsahu zákaznických ticketů může potřebovat souhlas, o který jsme nepožádali; jasno budeme mít 20. září“ mu řekne kdo, co a kdy. Přidej rizika z discovery, která si neseš z první lekce: nepojmenovaného člověka s právem veta a výchozí měření, které neumíš zopakovat.',
        },
        {
          body:
            'Výsledkem toho všeho je jedna stránka. Pracovní postup tak, jak jsi ho viděl, pět otázek, na které pořád potřebuješ odpověď, jedno výchozí měření, co je uvnitř, co venku, rizika a podmínka přijetí. Vejde se na stránku, protože zadání, které potřebuje deset stránek, ještě není rozhodnuté, a protože vedoucí supportu jednu stránku přečte.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m01-l1-read': {
      title: 'Čtení: pracovní postup a lidé v něm',
      summary: 'Operátor, stopky u sledování práce, mechanismus proti samotné práci a lidé, kteří můžou výsledek zamítnout.',
    },
    'fde-v1-m01-l2-read': {
      title: 'Čtení: výchozí měření a vymezení zadání',
      summary: 'Co musí výchozí měření nést, podmínka úspěchu jako číslo s datem a non-goals i s důvodem.',
    },
    'fde-v1-m01-checks': {
      title: 'Rozhodnutí v discovery',
      summary:
        'Čtyři ohraničená rozhodnutí: jakou otázku položit první, které výchozí měření je měřitelné, který požadavek je ve skutečnosti řešení a čí nepřítomnost projekt zastaví.',
      questions: {
        'fde-v1-m01-q1': {
          prompt:
            'VP Customer Operations u Marlbrooku říká: „Asistent by měl zvládat rutinní tickety.“ Nikdo nedefinoval, co je rutinní. S týmem supportu máš tenhle týden jednu hodinu. Jakou otázku položíš první?',
          options: [
            '„Ukažte mi posledních dvacet ticketů, které byste označili za rutinní, a nechte mě u tří z nich sedět, když je budete řešit.“',
            '„Kolik procent ticketů má asistent vyřídit bez agenta?“',
            '„Jaký model byste na to chtěli použít?“',
            '„Můžete sepsat, jakou formulaci má asistent u běžných případů používat?“',
          ],
          explanation:
            'Slovo rutinní v té větě odvádí veškerou práci a nikdo ho nenavázal na nic pozorovatelného. Žádost o tickety z něj udělá množinu, kterou jde spočítat, a sledování tří z nich ti dá časy jednotlivých kroků, které budeš potřebovat pro výchozí měření. Otázka na procenta nutí sponzora vymyslet cíl dřív, než kdokoli změřil výchozí stav: dostaneš číslo, za kterým nic není, a později spor o to, jestli ses do něj vešel. Otázka na model vybírá mechanismus dřív, než existuje problém, a z požadavku vůbec neplyne, že je model potřeba. Žádost o formulace předpokládá, že drahá část je psaní textu, a přesně ten předpoklad má sledování práce ověřit.',
        },
        'fde-v1-m01-q2': {
          prompt: 'Které z těchhle tvrzení může posloužit jako výchozí měření pro projekt supportu u Marlbrooku?',
          options: [
            'Medián minut od založení ticketu do první odpovědi agenta, tickety úrovně 1 s exportem, srpen, 412 ticketů, vzato z exportu ticketového systému.',
            'Agenti říkají, že zhruba polovina jejich dne padne na odpovídání na stále stejné dotazy.',
            'Support stojí na čtyřčlenný tým příliš mnoho.',
            'Doba zpracování klesne o 40 procent, jakmile asistent poběží.',
          ],
          explanation:
            'První možnost nese všechny čtyři části, které výchozí měření potřebuje: veličinu, populaci, období a postup, který příští kvartál zopakuje jiný člověk. Odhad agentů nemá definovanou populaci ani postup a „stále stejné dotazy“ nikdo nedefinoval, takže po nasazení by se měřilo něco jiného. „Stojí příliš mnoho“ nemá veličinu vůbec. Poslední je cíl, ne výchozí stav; je to věta, která se vedle výchozího měření postaví, až bude existovat, a sama o sobě nemá těch 40 procent z čeho brát.',
        },
        'fde-v1-m01-q3': {
          prompt: 'Na seznam požadavků u Marlbrooku dorazily čtyři řádky. Který z nich je ve skutečnosti řešení, které už někdo vybral, a ne požadavek?',
          options: [
            'Asistent musí shrnout celé vlákno ticketu dřív, než si ho agent přečte.',
            'Žádná zpráva se nedostane k zákazníkovi, aniž by ji člověk schválil.',
            'Agent musí mít možnost ověřit, odkud navržená odpověď pochází.',
            'Medián času do první odpovědi u ticketů úrovně 1 s exportem klesne do 31. března na 12 minut.',
          ],
          explanation:
            'Shrnování je mechanismus. Řekni to bez pojmenování věci, která tu práci dělá, a vyjde z toho „agent potřebuje historii účtu bez otevírání tří záložek“, což shrnutí umí a co odkaz na časovou osu účtu přímo v ticketu umí taky, za zlomek ceny. Řádek o schválení je podmínka na výsledek a neříká nic o tom, jak se schvalování postaví. Ověřit původ odpovědi je schopnost, kterou agent potřebuje a kterou splní citace, odkaz i postranní panel. Poslední řádek je podmínka úspěchu: číslo, populace a datum, s implementací nechanou otevřenou.',
        },
        'fde-v1-m01-q4': {
          prompt:
            'Discovery u Marlbrooku zatím mluvilo s VP Customer Operations, dvěma agenty supportu a platform inženýrem, který vlastní ticketové API. Čí další nepřítomnost nejspíš zastaví projekt až potom, co bude postavený?',
          options: [
            'Reviewera, který musí schválit systém čtoucí obsah zákaznických ticketů. Nikdo neověřil, jestli takové schvalování vůbec existuje.',
            'Třetího agenta supportu, aby sledování práce pokrylo víc než dva lidi.',
            'Frontend inženýra, který postaví schvalovací obrazovku.',
            'Sales inženýra od poskytovatele modelu, o kterém uvažujete.',
          ],
          explanation:
            'Ten reviewer drží veto a může ho použít na konci, kdy je stavba hotová a měnit tok dat je nejdražší. Zbylé tři tě stojí čas nebo přesnost, ne projekt. Třetí agent by zlepšil vzorek, na kterém stojí výchozí měření, a stojí za to ho přidat, jenže tenký vzorek je měření, které jde rozšířit, ne zamítnutí. Frontend inženýr je otázka plánování a může přijít až ve fázi stavby. Sales inženýr poskytovatele nedrží nic: žádná část tohoto zadání nevyžaduje konkrétního dodavatele a nejlevnější položka v něm, dohledání účtu, se obejde bez modelu úplně.',
        },
      },
    },
    'fde-v1-m01-scope-brief': {
      title: 'Zadání na jednu stránku: „přidejte do supportu AI“',
      summary:
        'Proměň jednořádkový požadavek v zadání s pracovním postupem, pěti otázkami, výchozím měřením, non-goals, riziky a podmínkou přijetí. Zaznamenává se jako vlastní revize.',
      artifact: {
        brief:
          'Marlbrook Systems prodává software pro sklady středně velkým distributorům. Jeho VP Customer Operations poslal jednu větu: „Přidejte do supportu AI.“ Čtyři agenti zvládnou zhruba 400 ticketů měsíčně. Sledování práce z první lekce je jediné měření, které kdo udělal, a pokrylo jediný ticket.\n\nNapiš tu jednu stránku, která vyjde z discovery týdne. Sedm polí, všechna povinná: pracovní postup tak, jak dneska běží, pět otázek, které bys položil dřív, než napíšeš řádek kódu, výchozí měření, co je v zadání pro tuhle fázi, co ne, rizika a podmínka, po jejímž splnění se všichni shodnou, že to vyšlo.\n\nFirma, objemy, stopky i přepis jsou fixture napsané pro tento modul. Není tu žádný živý systém, kterého by ses zeptal, ani zákazník, se kterým bys mluvil, takže tam, kde by ses musel někoho zeptat, napiš tu otázku místo vymyšlené odpovědi.\n\nTohle odevzdání se zaznamenává jako vlastní revize. Automatická kontrola ověří, že je každé povinné pole vyplněné a vejde se do svého limitu, a víc neprokáže — neposoudí, jestli je tvoje výchozí měření měřitelné, jestli by tvoje otázky něco změnily, ani jestli jsi vyloučil to správné. Přečti si vlastní odpověď proti řádkům rubriky Vymezení problému a Komunikace a pak ji zreviduj, než půjdeš dál.',
        fields: [
          {
            label: 'Pracovní postup dneska',
            help:
              'Popiš, jak dneska běží cesta ticketu, krok po kroku, s rolí člověka u každého kroku a s časem tam, kde ti ho první lekce dala. Napiš, které kroky jsi viděl a které ti někdo popsal. Kontrola délky počítá znaky; jestli je tohle postup, který linka opravdu jede, neposoudí.',
          },
          {
            label: 'Pět otázek k položení',
            help:
              'Pět otázek, každá na samostatném řádku, které bys položil dřív, než napíšeš řádek kódu. U každé má existovat konkrétní člověk, který na ni umí odpovědět, a odpověď má měnit, co postavíš. Aspoň jedna má najít někoho, kdo může projekt zamítnout. Jestli je otázka dobrá, žádná automatika neposoudí; tohle se ukládá pro tvou vlastní revizi.',
          },
          {
            label: 'Výchozí měření',
            help:
              'Jedno měření toho, co ta práce stojí dneska: veličina, populace, kterou pokrývá, období, za které vzniklo, a jak by ho zopakoval někdo jiný. Cíl není výchozí měření. Kontrola jenom ověří, že pole není prázdné a vejde se do 400 znaků — jestli se to číslo dá změřit znovu, posuď sám.',
          },
          {
            label: 'V zadání pro tuhle fázi',
            help:
              'Jedna položka na řádek, každá dost malá na to, abys ji uměl předvést. Kde to pokryje deterministický kód, napiš to; kde si model své místo zaslouží, napiš proč. Automaticky se kontroluje přítomnost, ne volby.',
          },
          {
            label: 'Non-goals',
            help:
              'Jedna položka na řádek toho, co projekt v téhle fázi dělat nebude, u každé důvod a tam, kde ho umíš dát, podmínka, která by ji vrátila zpátky. Vyloučení, které jsi nenapsal, žádné vyloučení není. Kontrola spočítá řádky a neposoudí, jestli jsi vyloučil to správné.',
          },
          {
            label: 'Rizika',
            help:
              'Co se může pokazit, kdo si toho všimne a co uděláš. Pokryj aspoň tři rizika z discovery: nepojmenovaného člověka s právem veta, výchozí měření, které neumíš zopakovat, a zdroj dat, který může bezpečnostní revize zamítnout. Zaznamenává se jako vlastní revize; žádná automatická kontrola tohle pole na pokrytí nečte.',
          },
          {
            label: 'Podmínka přijetí',
            help:
              'Podmínka, po jejímž splnění se sponzor, vedoucí supportu i ty shodnete, že to vyšlo: číslo, změřené stejně jako výchozí měření, s datem. Napiš, jakého výseku se týká a co budeš hlásit vedle něj, protože jeden medián se může zlepšit, zatímco se typ ticketů zhorší. Kontrola ověří, že je pole vyplněné; zbytek je tvoje vlastní revize proti rubrice.',
          },
        ],
      },
    },
  },
};
