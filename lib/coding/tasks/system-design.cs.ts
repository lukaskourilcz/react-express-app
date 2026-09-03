// Czech copy for lib/coding/tasks/system-design.ts, keyed by task id. Arrays align by
// index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

export const SYSTEM_DESIGN_TASKS_CS: Record<string, CodingTaskCs> = {
  "sd-url-shortener": {
    title: "Zkracovač URL",
    prompt: "Tým chce krátké odkazy do firemního newsletteru, aby se z dlouhé trackovací URL stalo něco jako ex.co/spring. Stavíš službu, která ty krátké kódy vydává a posílá lidi na skutečnou adresu. Musí umět jen dvě věci: vyrobit krátký kód pro dlouhou adresu a poslat každého, kdo ho použije, na správné místo. Skoro všechen provoz je to druhé, protože odkaz vznikne jednou a klikne se na něj tisíckrát. Těchto pět otázek jde stejnou cestou jako člověk na pohovoru — co stavíš, co ukládáš, co se stane při jednom kliknutí, co se stane, když je něco špatně, a co se rozbije první, až to poroste.",
    hints: ["Odkaz vznikne jednou a použije se tisíckrát. Navrhni to pro používání a vytváření klidně nech pomalé."],
    design: {
      scenario: "Tým chce krátké odkazy do firemního newsletteru, aby se z dlouhé trackovací URL stalo něco jako ex.co/spring. Stavíš službu, která ty krátké kódy vydává a posílá lidi na skutečnou adresu.",
      brief: "Musí umět jen dvě věci: vyrobit krátký kód pro dlouhou adresu a poslat každého, kdo ho použije, na správné místo. Skoro všechen provoz je to druhé, protože odkaz vznikne jednou a klikne se na něj tisíckrát. Těchto pět otázek jde stejnou cestou jako člověk na pohovoru — co stavíš, co ukládáš, co se stane při jednom kliknutí, co se stane, když je něco špatně, a co se rozbije první, až to poroste.",
      steps: [
        {
          title: "Co stavíme",
          prompt: "Než začneš cokoli navrhovat, co je nejužitečnější zjistit o tom, jak se služba používá?",
          options: [
            "Že se odkazy používají mnohem častěji, než se vytvářejí, takže přesměrování je ta část, na které záleží",
            "Který programovací jazyk má tým nejradši",
            "Kolik lidí ve firmě pracuje",
            "Jestli mají být krátké kódy velkými, nebo malými písmeny",
          ],
          explanation: "Skoro každé rozhodnutí v návrhu vychází z poměru čtení a zápisů. Jeden vytvořený odkaz a tisíce kliknutí znamenají, že produktem je cesta kliknutí: necháš ji jednoduchou, dáš před ni cache a s klidem přijmeš, že vytvoření odkazu je pomalejší. Kdyby to bylo naopak, navrhl bys něco úplně jiného. Jazyk ani velikost týmu tvar systému nemění a velikost písmen v kódech je detail, který vyřešíš jednou větou.",
        },
        {
          title: "Co ukládáme",
          prompt: "Co musí obsahovat jeden řádek v tabulce odkazů?",
          options: [
            "Krátký kód, celou cílovou adresu, kdo odkaz vytvořil a kdy",
            "Jen krátký kód a cíl",
            "Krátký kód, cíl a kopii cílové stránky",
            "Novou tabulku pro každý odkaz, pojmenovanou podle jeho kódu",
          ],
          explanation: "Kód a cíl jsou to, co potřebuje přesměrování. Vlastník a datum vytvoření jsou to, co potřebuje všechno ostatní — ukázat někomu jeho odkazy, smazat je nebo zjistit, co je staré. Přidat ty dva sloupce teď nestojí nic a později to ušetří migraci. Ukládat kopii cílové stránky je jiný produkt. Tabulka na každý odkaz není datový model: nemůžeš se ptát napříč odkazy a databáze nejsou stavěné na tisíce tabulek.",
        },
        {
          title: "Jak prochází request",
          prompt: "Někdo klikne na krátký odkaz. Co se stane na serveru?",
          options: [
            "Vyhledá kód a odpoví přesměrováním, které prohlížeči řekne skutečnou adresu",
            "Stáhne cílovou stránku a pošle její obsah zpátky prohlížeči",
            "Dá kliknutí do fronty a počká, až odpoví worker",
            "Vyhledá kód a odpoví stránkou s odkazem, na který se má kliknout znovu",
          ],
          explanation: "Přesměrování je HTTP odpověď, která říká „to, co chceš, je támhle“, a prohlížeč tam zajde sám. Je to jedno vyhledání podle kódu, který by měl být primárním klíčem, a jedna odpověď — nic dalšího na tuhle cestu nepatří. Když cílovou stránku stahuješ sám, stáváš se proxy pro celý internet a platíš přenos každé stránky. Fronta přidává čekání do něčeho, před čím sedí člověk. Stránka s dalším kliknutím je špatně udělané přesměrování.",
        },
        {
          title: "Když se něco pokazí",
          prompt: "Někdo použije kód, který neexistuje, protože byl překlepnutý nebo smazaný. Co se má stát?",
          options: [
            "Odpovědět 404 s krátkou stránkou, že odkaz není platný",
            "Odpovědět 500, protože vyhledání nic nenašlo",
            "Přesměrovat ho na homepage, jako by se nic nestalo",
            "Odpovědět 200 s prázdnou stránkou",
          ],
          explanation: "404 znamená „tady nic není“, což je přesně to, co se stalo, a stránka pro lidi jim řekne, co dál. 500 říká, že se ti rozbil server, a kvůli překlepu v odkazu někoho vzbudí. Tiché přesměrování na homepage mate — lidé si myslí, že odkaz fungoval, a diví se, proč vidí něco jiného. Prázdná 200 říká prohlížeči i tvému monitoringu, že je všechno v pořádku, takže rozbitá kampaň zůstane skrytá, dokud si někdo nestěžuje.",
        },
        {
          title: "Co se rozbije první",
          prompt: "Newsletter odejde a tisíce lidí kliknou během minuty na stejný odkaz. Co uděláš jako první?",
          options: [
            "Populární kódy podržíš v cache, aby většina kliknutí vůbec nedošla do databáze",
            "Rozdělíš tabulku odkazů mezi několik databází",
            "Přidáš databázi víc úložiště",
            "Přepíšeš službu do rychlejšího jazyka",
          ],
          explanation: "Tisíce lidí, kteří jdou přes stejnou hrstku odkazů, jsou ten nejsnazší případ, jaký cache může dostat: pár záznamů v paměti obslouží skoro všechen provoz a databáze si toho sotva všimne. Sáhni po tom jako první — je to malá změna s velkým účinkem. Rozdělení tabulky mezi stroje je velký a drahý krok, který řeší jiný problém, totiž že se data už nevejdou na jeden stroj. Úložiště není to, co je pod tlakem, a jazyk skoro nikdy není důvod, proč je něco pomalé.",
        },
      ],
      reference: `Co stavíme
Dvě operace: vytvořit krátký kód pro dlouhou adresu a přejít podle kódu na tu adresu. Ta druhá se děje tisíckrát častěji, takže se celý návrh ohýbá kolem toho, aby zůstala rychlá a jednoduchá. Nahlas bych řekl, že úpravy odkazů, složky a přehledy pro jednotlivé uživatele jsou v první verzi mimo rozsah.

Co ukládáme
Jedna tabulka. links(code, destination, owner_id, created_at), s code jako primárním klíčem, protože každé jedno čtení přijde s kódem a chce cíl. Vlastník a datum vytvoření nejsou potřeba pro přesměrování, ale pro všechno ostatní ano, a přidat je teď nestojí nic. Jednou vydaný kód se nikdy nepoužije znovu, jinak by starý vytištěný odkaz začal vést někam jinam.

Jak prochází request

  [prohlížeč] -> [webový server] -> [cache] -> [databáze]
                        |
                        v
                  302 redirect

Prohlížeč požádá o /spring. Server vyhledá „spring“, nejdřív v cache a teprve pak v databázi, a odpoví přesměrováním se skutečnou adresou. Prohlížeč ho následuje. To je celá hot path a nic jiného na ní není.

Když se něco pokazí
Kód, který neexistuje, dostane 404 a krátkou stránku, že odkaz není platný. Neodpovídal bych 500, protože nic není rozbité, a neposílal bych lidi potichu na homepage, protože pak rozbitá kampaň vypadá jako funkční. Pokud chceme počítat kliknutí, počet se zapíše až po odeslání přesměrování, takže na něj nikdo nečeká.

Co se rozbije první
Přesměrování ne. Newsletter přivede tisíce kliknutí na hrstku kódů a hrstka záznamů v cache to snadno pohltí. Kdyby čtení jednu databázi přece jen přerostlo, přidal bych read repliku dřív, než bych cokoli dělil, protože skoro všechen provoz je čtení. Poctivý kompromis je mezi trvalým přesměrováním, které si prohlížeče pamatují, takže většinu kliknutí přestaneme vidět, a dočasným, které se k nám vrací pokaždé a drží počty kliknutí pravdivé.`,
    },
  },
  "sd-to-do-list-api": {
    title: "API pro to-do list",
    prompt: "Malý tým chce sdílenou to-do aplikaci. Stavíš API, které za ní stojí: lidé se přihlásí, přidávají úkoly, odškrtávají je a vidí jen svůj seznam. Budou s ním mluvit webový i mobilní klient. Je to ten nejobyčejnější systém, jaký existuje, a přesně proto stojí za to projít ho pečlivě. Všechno, co chce člověk na pohovoru vidět, tu je v malém: jaké jsou endpointy, jak vypadá řádek, jak se obslouží jeden request, co se stane, když si někdo řekne o něco, co není jeho, a co začne bolet, až seznamy narostou. Když trefíš tenhle tvar, většina CRUD systémů je stejný rozhovor, jen s jinými podstatnými jmény.",
    hints: ["Každý úkol někomu patří. Než navrhneš cokoli dalšího, rozhodni, jak server pozná, kdo se ptá."],
    design: {
      scenario: "Malý tým chce sdílenou to-do aplikaci. Stavíš API, které za ní stojí: lidé se přihlásí, přidávají úkoly, odškrtávají je a vidí jen svůj seznam. Budou s ním mluvit webový i mobilní klient.",
      brief: "Je to ten nejobyčejnější systém, jaký existuje, a přesně proto stojí za to projít ho pečlivě. Všechno, co chce člověk na pohovoru vidět, tu je v malém: jaké jsou endpointy, jak vypadá řádek, jak se obslouží jeden request, co se stane, když si někdo řekne o něco, co není jeho, a co začne bolet, až seznamy narostou. Když trefíš tenhle tvar, většina CRUD systémů je stejný rozhovor, jen s jinými podstatnými jmény.",
      steps: [
        {
          title: "Co stavíme",
          prompt: "Na čem je nejdůležitější se shodnout, než začneš API navrhovat?",
          options: [
            "Že každý úkol patří jednomu člověku a nikdo nesmí vidět cizí",
            "Jestli mají být tlačítka modrá, nebo zelená",
            "Jak bude mobilní aplikace animovat odškrtnutí",
            "U kterého cloudového poskytovatele to poběží",
          ],
          explanation: "Vlastnictví je pravidlo, které musí celý návrh vymáhat, a objevuje se všude: sloupec v tabulce, podmínka v každém dotazu, kontrola na každém endpointu. Když ho stanovíš brzy, nepostavíš něco, kde změna čísla v URL ukáže cizí úkoly — jednu z nejběžnějších skutečných bezpečnostních děr. Barvy a animace patří klientovi a volba hostingu návrh nemění.",
        },
        {
          title: "Co ukládáme",
          prompt: "Jak má vypadat tabulka úkolů?",
          options: [
            "tasks(id, user_id, title, done, created_at), s indexem na user_id",
            "tasks(id, title, done) a úkoly uživatele se spojí podle shodných názvů",
            "Jeden řádek na uživatele se všemi jeho úkoly v jednom textovém poli",
            "tasks(id, title, done) a zvláštní tabulka pro každého uživatele",
          ],
          explanation: "Každý úkol je řádek a user_id je to, co ho dělá něčím. Index na user_id je důležitý, protože dotaz, který běží pořád, je „všechny úkoly tohohle uživatele“, a bez indexu databáze přečte každý řádek v tabulce, aby je našla. Shoda podle názvu není vztah — dva lidé můžou napsat „koupit mléko“. Seznam nacpaný do jednoho textového pole znamená, že nemůžeš odškrtnout jeden úkol bez přepsání všech, a tabulku na uživatele nejde prohledat napříč.",
        },
        {
          title: "Jak prochází request",
          prompt: "Aplikace si řekne o úkoly přihlášeného člověka. Co udělá server?",
          options: [
            "Ze session zjistí, kdo se ptá, a pak vybere úkoly, kde user_id odpovídá",
            "Vybere všechny úkoly a nechá aplikaci ukázat jen ty, které patří danému uživateli",
            "Vybere úkoly, kde user_id odpovídá id, které klient poslal v URL",
            "Vybere všechny úkoly a vyfiltruje je podle uživatele v kódu serveru",
          ],
          explanation: "Kdo jsi, rozhoduje server podle session, ne podle čehokoli, co pošle klient — jinak změna id v URL vydá cizí data. Filtr patří do dotazu, aby databáze vrátila jen to, co je potřeba. Poslat všechno do aplikace a filtrovat tam znamená, že data už tvůj server opustila, což je únik, ne návrh. Filtrování v kódu serveru je bezpečné, ale plýtvavé: přečteš celou tabulku, abys skoro všechno zahodil.",
        },
        {
          title: "Když se něco pokazí",
          prompt: "Někdo si řekne o id úkolu, který existuje, ale patří někomu jinému. Co má API odpovědět?",
          options: [
            "404, jako by úkol neexistoval",
            "403 s tím, že patří někomu jinému",
            "200 s úkolem, když už id znal",
            "500, protože kontrola vlastnictví selhala",
          ],
          explanation: "Odpověď 403 potvrzuje, že úkol existuje, takže si někdo může zkoušet, která id jsou platná, a dozvídat se o datech, která nevidí. Odpověď 404 mu neřekne nic, co by už nevěděl. Obojí se dá obhájit a měl bys říct, proč sis vybral to které — 403 je přívětivější uvnitř důvěryhodného systému, kde se kolega mohl opravdu jen překlepnout. Vrátit úkol je přesně ta díra, kvůli které pravidlo vlastnictví existuje, a 500 znamená „rozbili jsme se“, i když všechno zafungovalo správně.",
        },
        {
          title: "Co se rozbije první",
          prompt: "Někteří lidé mají tisíce úkolů a endpoint se seznamem zpomalil. Jaká je první oprava?",
          options: [
            "Vracet po stránkách a přidat index na sloupce, podle kterých se řadí a filtruje",
            "Přidat druhý aplikační server",
            "Cachovat každému uživateli celý seznam úkolů",
            "Přesunout tabulku úkolů do vlastní databáze",
          ],
          explanation: "Cena tady roste s tím, kolik toho má jeden člověk, ne s tím, kolik je lidí, takže další servery nepomůžou — každý z nich spustí stejný pomalý dotaz. Vracet pevnou stránku drží práci stejnou bez ohledu na historii a index zabrání tomu, aby databáze pokaždé od nuly řadila velkou množinu. Cachovat seznam, který jeho vlastník neustále mění, znamená bojovat o jeho správnost za velmi malý zisk, a samostatná databáze je velký krok pro něco, co vyřeší dvě obyčejné opravy.",
        },
      ],
      reference: `Co stavíme
Přihlásit se, přidat úkol, odškrtnout ho, smazat ho a vidět svůj seznam a nikoho jiného. Endpointy jsou POST /tasks, GET /tasks, PATCH /tasks/:id a DELETE /tasks/:id. Vlastnictví je pravidlo, které prochází vším, takže ho chci vymáhat v dotazu, a ne jen v rozhraní.

Co ukládáme
tasks(id, user_id, title, done, created_at) s indexem na user_id, protože „všechny úkoly tohohle uživatele“ je dotaz, který běží pořád, a bez indexu databáze pokaždé čte celou tabulku. Dokončení je tady boolean; kdybychom někdy chtěli vědět, kdy se něco dokončilo, stane se z něj místo toho timestamp completed_at. Uživatelé mají vlastní tabulku a úkoly na ni ukazují.

Jak prochází request

  [aplikace] -> [API server] -> vyhledání session -> [databáze]
                     |
                     v
              tasks WHERE user_id = me

Server vezme session cookie, zjistí, kdo se ptá, a vybere úkoly pro to id uživatele. Id nikdy nepřijde z URL ani z těla requestu, protože cokoli klient pošle, může klient změnit.

Když se něco pokazí
Id cizího úkolu dostane 404, ne 403, aby API nepotvrzovalo, která id existují. Špatný vstup dostane 400 se zprávou, která pojmenuje pole. Když je databáze nedostupná, vrátíme 503 a nepředstíráme, že odpověď je prázdný seznam, protože prázdný seznam pro aplikaci vypadá jako „nemáš žádné úkoly“ a mohl by někomu vymazat obrazovku.

Co se rozbije první
Ne počet uživatelů, což je intuitivní odpověď — aplikační servery se škálují přidáním dalších. Je to člověk se čtyřmi tisíci úkolů, protože cena endpointu se seznamem roste s jeho historií. Seznam je proto stránkovaný, dvacet položek najednou a způsob, jak si říct o další, a index pokrývá řazení. Dál platí, že v tomhle typu aplikace čtení výrazně převažuje nad zápisy, takže read replika je další krok dávno předtím, než cokoli exotičtějšího.`,
    },
  },
  "sd-photo-sharing": {
    title: "Sdílení fotek",
    prompt: "Zájmový klub chce, aby členové nahrávali fotky ze svých akcí a pak si je prohlíželi. Fotky jdou z telefonů po několika megabajtech a členové chtějí procházet galerii bez čekání. Celé poučení je v tom, že fotka jsou dvě různé věci: velký balík bajtů a malá sada faktů o něm — kdo ji vyfotil, kdy, na jaké akci. Ty dvě věci chtějí úplně jiné domovy a skoro každá chyba v podobném systému vzniká tím, že se dají do jednoho. Pět otázek sleduje tohle rozdělení celým návrhem, od toho, na čem se shodneš na začátku, až po to, co spadne, jakmile má klub deset tisíc fotek.",
    hints: ["Fotka jsou dvě věci: velký balík bajtů a pár malých faktů. Každá z nich chce jiný domov."],
    design: {
      scenario: "Zájmový klub chce, aby členové nahrávali fotky ze svých akcí a pak si je prohlíželi. Fotky jdou z telefonů po několika megabajtech a členové chtějí procházet galerii bez čekání.",
      brief: "Celé poučení je v tom, že fotka jsou dvě různé věci: velký balík bajtů a malá sada faktů o něm — kdo ji vyfotil, kdy, na jaké akci. Ty dvě věci chtějí úplně jiné domovy a skoro každá chyba v podobném systému vzniká tím, že se dají do jednoho. Pět otázek sleduje tohle rozdělení celým návrhem, od toho, na čem se shodneš na začátku, až po to, co spadne, jakmile má klub deset tisíc fotek.",
      steps: [
        {
          title: "Co stavíme",
          prompt: "Co bys měl o samotných fotkách zjistit jako první?",
          options: [
            "Jak velká je typická fotka, protože to rozhoduje, kde můžou bajty bydlet",
            "Jaké značky fotoaparátů členové používají",
            "Jak se má jmenovat stránka galerie",
            "Jestli mají mít fotky zaoblené rohy",
          ],
          explanation: "Velikost rozhoduje o návrhu. Pár kilobajtů na fotku a klidně je můžeš držet kdekoli; několik megabajtů na fotku a musí jít někam, co je stavěné na soubory, servírované prohlížečům přímo, a cestou ven nikdy neprocházet tvou aplikací. Zeptat se na to číslo brzy je to, co odlišuje promyšlenou odpověď od hádání. Značky fotoaparátů, názvy stránek a poloměr rohů jsou skutečné produktové otázky, ale žádná z nich nezmění jediný obdélník v diagramu.",
        },
        {
          title: "Co ukládáme",
          prompt: "Kde má být uložený soubor s obrázkem a kde fakta o něm?",
          options: [
            "Soubor v object storage a řádek v databázi s jeho umístěním, vlastníkem a datem",
            "Soubor i fakta v databázi",
            "Soubor na disku webového serveru a fakta v databázi",
            "Soubor v object storage, s vlastníkem a datem zapsanými do názvu souboru",
          ],
          explanation: "Object storage je služba stavěná na to, aby levně držela soubory a předávala je rovnou prohlížečům. Databáze drží malá fakta, podle kterých opravdu hledáš a řadíš, plus ukazatel na to, kam bajty šly. Megabajty v řádcích databáze znamenají, že je každý dotaz a každá záloha tahá s sebou. Vlastní disk webového serveru se rozbije, jakmile přibude druhý server s jiným diskem. Fakta v názvech souborů nejde dotazovat — nevypsal bys fotky z tohoto měsíce bez prohlédnutí každého souboru.",
        },
        {
          title: "Jak prochází request",
          prompt: "Člen otevře galerii. Jak se na obrazovku dostane třicet fotek?",
          options: [
            "API vrátí třicet řádků s URL obrázků a prohlížeč si každý obrázek stáhne ze storage",
            "API přečte všech třicet souborů a pošle data obrázků uvnitř své odpovědi",
            "API vrátí třicet řádků a prohlížeč si od API postupně vyžádá každý obrázek",
            "API pošle všechny fotky, které klub má, a prohlížeč ukáže třicet",
          ],
          explanation: "Tvoje API odpoví malým JSONem: třicet řádků, každý s URL. Prohlížeč si pak obrázky stáhne sám, přímo ze storage nebo z CDN — paralelně, potom je má v cache a tvých serverů se vůbec nedotknou. Číst soubory a vkládat je do odpovědi znamená, že tvé API nese každý megabajt. Vést každý obrázek přes API dělá totéž pomaleji. Poslat všechny fotky klubu je chyba, která se ukáže, až když jich je hodně.",
        },
        {
          title: "Když se něco pokazí",
          prompt: "Upload selže v půlce: soubor nikdy nedorazí, ale řádek pro něj už je uložený. Jak tomu zabráníš?",
          options: [
            "Nejdřív uložit soubor a řádek zapsat, až když storage potvrdí uložení",
            "Nejdřív zapsat řádek, aby fotka měla id ještě před nahráním",
            "Nejdřív zapsat řádek a později ho smazat, když si nikdo nestěžuje",
            "Povolit řádky bez souborů a rozbité v galerii skrývat",
          ],
          explanation: "Seřaď oba zápisy tak, aby selhání zanechalo neškodný stav. Soubor bez řádku je neviditelný a zabírá místo; periodický úklid ho smaže. Řádek bez souboru je rozbitý obrázek na stránce, který lidé vidí. Takže napřed bajty a pak řádek. Zapsat řádek jako první kvůli id je skutečný vzor, ale pak řádek potřebuje sloupec se stavem, že ještě není hotový — což je v pořádku, pokud to řekneš a nenecháš tu mezeru neošetřenou.",
        },
        {
          title: "Co se rozbije první",
          prompt: "Uploadů přibývá a galerie se teď načítá pomalu. Fotky se během requestu s uploadem zmenšují na náhledy. Co se rozbije první?",
          options: [
            "Zmenšování spotřebuje výkon procesoru serverů, takže zpomalí i každý jiný request",
            "Object storage dojde místo",
            "Databáze nestíhá ukládat řádky",
            "Prohlížeče odmítnou zobrazit tolik obrázků",
          ],
          explanation: "Zmenšení obrázku je těžká práce pro procesor, a když se dělá uvnitř requestu, soupeří se vším ostatním, co mají ty servery obsluhovat — takže zpomalí i stránky, na kterých žádné fotky nejsou, a příčina se špatně hledá. Přesuň to do workeru na pozadí: přijmi upload, ulož originál, odpověz a nech zvláštní skupinu workerů udělat náhledy a doplnit řádek, až budou hotové. Object storage roste, aniž bys to plánoval, a řádky jsou drobné.",
        },
      ],
      reference: `Co stavíme
Členové nahrávají fotky z klubových akcí a prohlížejí si je. Soubory jdou z telefonů po třech až pěti megabajtech, takže první, co chci, je tohle číslo, protože vylučuje držet bajty kdekoli poblíž databáze. Mimo rozsah první verze: alba, komentáře a úpravy.

Co ukládáme
Dva domovy pro dva druhy věcí. Soubor jde do object storage pod klíčem. Řádek je photos(id, owner_id, event_id, storage_key, width, height, uploaded_at) s indexem na event_id, protože procházení podle akce je dotaz, který běží. Náhledy mají vlastní klíče zapsané na stejném řádku, takže galerie nikdy nežádá o obrázky v plné velikosti.

Jak prochází request

  [prohlížeč] -> [API] -> [databáze]   (třicet řádků, každý s URL)
       |
       +------> [object storage / CDN]   (samotné obrázky)

API odpoví malým JSONem a prohlížeč si obrázky stáhne přímo. Tím megabajty vůbec nejdou přes naše servery, prohlížeč je může stahovat paralelně a potom cachovat a CDN je může servírovat odněkud blízko.

Když se něco pokazí
Bajty se uloží dřív, než se zapíše řádek, takže neúspěšný upload zanechá osiřelý soubor, a ne rozbitý obrázek na stránce; periodický job maže klíče bez řádku. Typ a velikost se kontrolují před uložením čehokoli, jinak jsme zaplatili za přijetí souboru, který jsme stejně chtěli odmítnout. Když storage neodpovídá, upload selže nahlas místo zapsání fotky, která tam není.

Co se rozbije první
Zmenšování, pokud se dělá uvnitř requestu. Je náročné na procesor a vyhladoví každý nesouvisející endpoint na stejném stroji, takže se příznak objeví všude kromě místa, kde je příčina. Uploady se proto přijmou, uloží a předají workeru na pozadí, který udělá náhledy a doplní řádek. Další tlak potom není na úložiště, ale na přenos, což je argument pro CDN: stejné bajty odcházejí ze stroje blízko uživatele místo od nás.`,
    },
  },
  "sd-accounts-and-login": {
    title: "Účty a přihlášení",
    prompt: "Web zatím nemá účty a potřebuje je: registrace e-mailem a heslem, přihlášení, zůstat přihlášený a odhlášení. Běží na dvou webových serverech za load balancerem. Tohle potřebuje skoro každý systém a skoro každý juniorní pohovor se ptá na nějaký jeho kout. Myšlenky jsou malé a konkrétní: hesla se nikdy neukládají, přihlášení je fakt, který drží server, a ne něco, co může prohlížeč tvrdit, a dva servery znamenají, že cokoli v paměti jednoho stroje je pro druhý neviditelné. Těchto pět otázek pokrývá části, které máš umět bez zaváhání.",
    hints: ["Heslo se nikdy neukládá. Všechno ostatní v tomhle návrhu vyplývá z toho, že to bereš vážně."],
    design: {
      scenario: "Web zatím nemá účty a potřebuje je: registrace e-mailem a heslem, přihlášení, zůstat přihlášený a odhlášení. Běží na dvou webových serverech za load balancerem.",
      brief: "Tohle potřebuje skoro každý systém a skoro každý juniorní pohovor se ptá na nějaký jeho kout. Myšlenky jsou malé a konkrétní: hesla se nikdy neukládají, přihlášení je fakt, který drží server, a ne něco, co může prohlížeč tvrdit, a dva servery znamenají, že cokoli v paměti jednoho stroje je pro druhý neviditelné. Těchto pět otázek pokrývá části, které máš umět bez zaváhání.",
      steps: [
        {
          title: "Co stavíme",
          prompt: "Na jakém jediném pravidle se shodnout dřív než na čemkoli jiném?",
          options: [
            "Heslo se nikdy neukládá ani neloguje v podobě, kterou by někdo mohl přečíst",
            "Lidé by si měli volit zapamatovatelné heslo",
            "Přihlašovací formulář má mít vlastní stránku",
            "Přihlášení má fungovat na mobilu i na desktopu",
          ],
          explanation: "Je to pravidlo, které tvaruje tabulku, kód i logování. Ukládáš hash — jednosměrnou transformaci, proti které umíš ověřit, ale kterou nikdy neobrátíš — takže uniklá záloha nikoho neodhalí, a hlídáš, aby se surové heslo cestou nedostalo do logu. Zbylé tři věci jsou skutečné otázky, ale žádná z nich nemění, co stavíš, a žádná není to, co člověk na pohovoru zkoumá, když se ptá, jak zacházíš s hesly.",
        },
        {
          title: "Co ukládáme",
          prompt: "Co patří do tabulky uživatelů?",
          options: [
            "Id, e-mail s unique constraintem a hash hesla vytvořený bcryptem",
            "Id, e-mail a heslo zašifrované tak, aby šlo obnovit",
            "Id, e-mail a heslo tak, jak bylo napsané",
            "Id, e-mail a rychlý hash hesla, například MD5",
          ],
          explanation: "Hash ti umožní heslo ověřit, aniž bys ho kdy mohl přečíst, a bcrypt je záměrně pomalý, aby zkoušení milionů kandidátů nebylo praktické. Unique constraint na e-mailu je to, co opravdu zabrání dvěma účtům na jednu adresu, protože dva lidé se můžou zaregistrovat ve stejný okamžik a kontrola v tvém kódu to nechytí. Šifrování je vratné, takže kdo drží klíč, drží každé heslo. Ukládat hesla tak, jak byla napsaná, nebo je hashovat rychle, končí stejně, jakmile databáze unikne.",
        },
        {
          title: "Jak prochází request",
          prompt: "Někdo se úspěšně přihlásí. Jak další request pozná, kdo to je?",
          options: [
            "Id session v cookie, vyhledané v úložišti, ze kterého čtou oba servery",
            "Id uživatele v cookie, přečtené při každém requestu rovnou z cookie",
            "Session držená v paměti serveru, který přihlášení obsloužil",
            "E-mail a heslo poslané znovu s každým requestem",
          ],
          explanation: "Cookie nese bezvýznamný identifikátor; server si ho vyhledá, aby zjistil, kdo to je. Protože oba servery čtou ze stejného úložiště, nezáleží na tom, který z nich load balancer vybere. Id uživatele v cookie znamená, že si ho kdokoli přepíše a stane se někým jiným. Session v paměti jednoho serveru začne lidi náhodně odhlašovat, jakmile jsou servery dva. Posílat heslo s každým requestem znamená, že neustále putuje a musí se neustále ověřovat.",
        },
        {
          title: "Když se něco pokazí",
          prompt: "Někdo se zkusí přihlásit e-mailem, ke kterému žádný účet není. Co má odpověď říct?",
          options: [
            "Totéž „nesprávný e-mail nebo heslo“, co se používá pro špatné heslo",
            "„K tomuto e-mailu žádný účet není“ — je to užitečnější",
            "Vždycky „špatné heslo“, aby to bylo jednoduché",
            "Nic, formulář potichu neudělá nic",
          ],
          explanation: "Různé zprávy dovolí komukoli s formulářem zjistit, které adresy tady mají účet, což má cenu samo o sobě a ještě větší na webu, o kterém lidé nechtějí, aby se vědělo, že ho používají. Jedna zpráva pro oba případy to nevyzradí. Přívětivější formulace má skutečnou cenu a měl bys to říct, protože lidé opravdu zapomínají, kterou adresu použili — obvyklá odpověď je dobrý postup pro reset hesla, ne sdílnější chyba. Mlčení prostě vypadá jako rozbitý formulář.",
        },
        {
          title: "Co se rozbije první",
          prompt: "Někdo začne zkoušet tisíce hesel proti jednomu účtu. Co s tím uděláš jako první?",
          options: [
            "Zpomalíš a pak zablokuješ opakované neúspěšné pokusy pro ten účet a tu adresu",
            "Donutíš všechny zvolit si delší heslo",
            "Přidáš webové servery, aby se provoz rozložil",
            "Přejdeš na rychlejší hashovací algoritmus, aby ověření stálo méně",
          ],
          explanation: "Rate limiting je to, co promění útok trvající hodiny v útok trvající roky, a patří jak na účet, tak na zdrojovou adresu, protože útočník stejně ochotně zkusí jedno heslo proti mnoha účtům jako mnoho hesel proti jednomu. Delší hesla pomáhají, ale zpětně je lidem nevnutíš. Víc serverů dá útočníkovi víc kapacity. Rychlejší hash je přesně naopak: pomalost bcryptu je ta vlastnost, a když ho zrychlíš, pomůžeš útočníkovi mnohem víc než sobě.",
        },
      ],
      reference: `Co stavíme
Registrace, přihlášení, zůstat přihlášený napříč requesty, odhlášení. Dva webové servery za load balancerem, takže nic důležitého nemůže bydlet v paměti jednoho stroje. Jako první bych řekl pravidlo, že heslo nikdy neukládáme v čitelné podobě a nikdy ho nelogujeme.

Co ukládáme
users(id, email UNIQUE, password_hash, created_at). Hash vzniká bcryptem, který je schválně pomalý, aby hádání ve velkém nebylo praktické. Unique constraint na e-mailu je skutečná ochrana před duplicitními účty, protože kontrola v aplikačním kódu prohraje závod, když dvě registrace dorazí zároveň. Session mají vlastní úložiště: id session, uživatele, kterému patří, a expiraci.

Jak prochází request

  [prohlížeč] -> [load balancer] -> [kterýkoli webový server] -> [úložiště session]
                                               |                         |
                                               v                         v
                                          [databáze]                kdo to je?

Přihlášení ověří zadané heslo proti uloženému hashi a vytvoří session; prohlížeč dostane id session v cookie označené HttpOnly a Secure, takže ji skripty nepřečtou a nikdy necestuje nešifrovaně. Každý další request si to id vyhledá.

Když se něco pokazí
Špatné heslo a neznámý e-mail dostanou stejnou zprávu, takže formulářem nejde zjistit, kdo tu má účet. Odhlášení smaže záznam session, a právě proto stojí serverová session za to: dá se skutečně zneplatnit, na rozdíl od tokenu, který nese všechno v sobě a platí, dokud nevyprší. Reset hesla vydá jednorázový token s krátkou platností, uloží jen jeho hash a po dokončení odhlásí existující session.

Co se rozbije první
Ne kapacita — na jeden request je to málo práce. Je to někdo, kdo hádá hesla, což nás nic nestojí dovolit a všechno stojí ignorovat. Opakované neúspěchy se proto zpomalují a pak blokují, počítané proti účtu i proti zdrojové adrese. Poctivý kompromis je cena bcryptu: je záměrně pomalý, což chrání hashe a zároveň znamená, že nával skutečných přihlášení je dražší, než vypadá.`,
    },
  },
  "sd-small-online-shop": {
    title: "Malý e-shop",
    prompt: "Pekárna prodává pár desítek produktů online. Zákazníci si prohlížejí zboží, dávají ho do košíku a platí kartou přes externí platební bránu. Zásoby jsou omezené a nesmí se prodat to, co není. E-shop spojuje skoro všechno, co pokrývají ostatní průchody — neustálé čtení katalogu, vzácný zápis objednávky, volání cizí služby a jedno číslo, které nesmí selhat. Zároveň je to místo, kde je jasně vidět rozdíl mezi „čtením, které může být trochu zastaralé“, a „zápisy, které nesmí být špatně“. Pět otázek: co to dělá, co ukládá, co se stane, když někdo platí, co se stane, když platební brána zlobí, a co se rozbije první během rušného rána.",
    hints: ["Skoro všechno je prohlížení, a to je shovívavé. Jedno číslo shovívavé není, a to je stav skladu."],
    design: {
      scenario: "Pekárna prodává pár desítek produktů online. Zákazníci si prohlížejí zboží, dávají ho do košíku a platí kartou přes externí platební bránu. Zásoby jsou omezené a nesmí se prodat to, co není.",
      brief: "E-shop spojuje skoro všechno, co pokrývají ostatní průchody — neustálé čtení katalogu, vzácný zápis objednávky, volání cizí služby a jedno číslo, které nesmí selhat. Zároveň je to místo, kde je jasně vidět rozdíl mezi „čtením, které může být trochu zastaralé“, a „zápisy, které nesmí být špatně“. Pět otázek: co to dělá, co ukládá, co se stane, když někdo platí, co se stane, když platební brána zlobí, a co se rozbije první během rušného rána.",
      steps: [
        {
          title: "Co stavíme",
          prompt: "Která část e-shopu si v návrhu zaslouží nejvíc péče?",
          options: [
            "Stav skladu, protože když něco prodáš dvakrát, software to zpětně nespraví",
            "Fotky produktů, protože zabírají nejvíc místa",
            "Košík, protože ho lidé mění nejčastěji",
            "Menu kategorií, protože je na každé stránce",
          ],
          explanation: "Většina e-shopu je shovívavá. Trochu zastaralý popis produktu nebo košík, který ztratí položku, je otravné a opravitelné. Prodat poslední bochník dvěma lidem je telefonát a vrácení peněz a žádné opakování to potom nespraví — takže to je číslo, které musí návrh chránit, a když to řekneš brzy, ukážeš, že rozeznáš rizikovou část od té rušné. Fotky jsou jen úložiště a menu je nejsnáz cachovatelná věc v celém systému.",
        },
        {
          title: "Co ukládáme",
          prompt: "Jak má objednávka zaznamenat cenu toho, co se koupilo?",
          options: [
            "Zkopírovat cenu na každou položku objednávky v okamžiku nákupu",
            "Uložit jen id produktu a při zobrazení objednávky přečíst aktuální cenu",
            "Uložit na objednávce celkovou částku a u položek nic",
            "Uložit odkaz na stránku produktu, jak vypadala ten den",
          ],
          explanation: "Tohle je jedno z mála míst, kde je kopírování dat správně. Objednávka je záznam toho, co se stalo, a k tomu patřila cena. Když později čteš aktuální cenu, loňské účtenky se potichu změní pokaždé, když pekárna zdraží — což je špatně a ve většině zemí nelegální. Uložit jen celkovou částku ztratí, co se vlastně koupilo. Produkty a ceny zůstávají ve vlastních tabulkách pro prohlížení; objednávka má svou kopii, protože je to historie, ne pohled na přítomnost.",
        },
        {
          title: "Jak prochází request",
          prompt: "Zákazník klikne na zaplatit. V jakém pořadí se věci stanou?",
          options: [
            "Ověřit, že zboží je pořád skladem, strhnout platbu, pak uložit objednávku a snížit sklad",
            "Uložit objednávku, snížit sklad, pak strhnout platbu",
            "Strhnout platbu a pak ověřit, jestli je zboží ještě skladem",
            "Snížit sklad, pak strhnout platbu, pak uložit objednávku",
          ],
          explanation: "Zkontroluj věc, kterou nejde vrátit, dřív, než uděláš věc, kterou nejde vrátit. Když napřed potvrdíš sklad, málokdy vezmeš peníze za něco, co není; když platbu strhneš před zápisem objednávky, nikdy nezaznamenáš prodej, který nebyl zaplacený. Databáze by měla navíc vymáhat, že sklad nejde pod nulu, protože dva zákazníci můžou projít kontrolou ve stejný okamžik. Vzít peníze první a kontrolovat potom zaručuje vracení peněz a snížení skladu před platbou ztrácí zboží kvůli opuštěným košíkům.",
        },
        {
          title: "Když se něco pokazí",
          prompt: "Platební brána je pomalá, zákazníkovi vyprší request v prohlížeči a klikne na zaplatit znovu. Jak zabráníš dvojí platbě?",
          options: [
            "Poslat s platbou unikátní klíč, aby brána brala opakování jako stejnou platbu",
            "Zkontrolovat, jestli za poslední minutu nevznikla objednávka se stejnou částkou",
            "Po prvním kliknutí tlačítko zakázat",
            "Duplicitní platby vrátit, když si zákazník stěžuje",
          ],
          explanation: "Klíč vygenerovaný pro ten jeden checkout dovolí bráně poznat druhý request jako opakování prvního a vrátit původní výsledek místo další platby. Říká se tomu idempotence a je to standardní odpověď, kdykoli se request může opakovat. Porovnání částky a času odmítne zákazníka, který si legitimně koupí totéž dvakrát. Zakázané tlačítko pomůže proti dvojkliku, ale nic nezmůže proti obnovení stránky nebo nespolehlivému připojení. Vracet peníze na stížnost znamená, že je dostanou zpátky jen zákazníci, kteří si toho všimnou.",
        },
        {
          title: "Co se rozbije první",
          prompt: "V rušné sobotní ráno web zpomalí. Většina provozu je prohlížení. Co uděláš jako první?",
          options: [
            "Cachuješ stránky produktů a menu, protože se čtou pořád a mění se málokdy",
            "Cachuješ i stavy skladu, protože se čtou na stejných stránkách",
            "Rozdělíš tabulku objednávek mezi několik databází",
            "Požádáš zákazníky, aby nakupovali v klidnějších časech",
          ],
          explanation: "Prohlížení je skoro všechen provoz a skoro žádné riziko, takže je to přesně to, co se má servírovat z cache — katalog se mění, když ho pekárna upraví, ne když se na něj někdo dívá. Stav skladu je jediná věc na těch stránkách, kterou bys neměl cachovat dlouho, protože zastaralé číslo je cesta k přeprodání; ukazovat ho čerstvý, nebo s velmi krátkou expirací, je ten kompromis. Rozdělit tabulku objednávek je velký krok pro e-shop s pár desítkami produktů.",
        },
      ],
      reference: `Co stavíme
Prohlížet pár desítek produktů, dávat je do košíku, platit přes externí bránu a nikdy neprodat zboží, které nemáme. Prohlížení je skoro všechen provoz; objednávání je vzácné a je to část, která nesmí selhat. To rozdělení je celý návrh.

Co ukládáme
products(id, name, price, stock) pro katalog. orders(id, customer_id, total, status, placed_at) a order_lines(id, order_id, product_id, quantity, unit_price). Jednotková cena se kopíruje na položku v okamžiku nákupu, protože objednávka je záznam toho, co se stalo, a pozdější zdražení nesmí přepsat staré účtenky. Sklad má constraint, který ho drží na nule nebo výš, takže databáze odmítne přeprodat, i když dva checkouty dorazí zároveň.

Jak prochází request

  [prohlížeč] -> [webový server] -> [cache]          (prohlížení)
                        |
                        +--------> [databáze]        (checkout, v jedné transakci)
                        |
                        +--------> [platební brána]

Prohlížení čte z cache. Checkout potvrdí sklad, strhne platbu z karty a pak v jedné transakci zapíše objednávku a sníží sklad, takže nikdy nemáme napůl hotový prodej.

Když se něco pokazí
Volání platby nese klíč unikátní pro ten checkout, takže zákazník, který po timeoutu obnoví stránku, neplatí dvakrát — brána pozná opakování a vrátí první výsledek. Když je brána nedostupná, checkout selže, místo abychom zapsali nezaplacenou objednávku. Když platba projde a náš zápis potom selže, to je případ, který stojí za to pojmenovat nahlas: zaznamenáme ho pro člověka, protože peníze se pohnuly a zákazník nemá nic.

Co se rozbije první
Databáze, pod čtením, dávno před čímkoli kolem objednávek — pár desítek produktů čtených tisíckrát je problém pro cache a nic víc. Katalog a menu se proto cachují a stav skladu ne, nebo nanejvýš na sekundy. Poctivý kompromis je přímo tady: cachuj sklad a stránky zrychlí a přeprodávání se zhorší.`,
    },
  },
  "dd-requests-per-second": {
    title: "Requesty za sekundu",
    prompt: "Aplikaci používá za den zhruba 1 milion lidí a každý z nich během používání udělá asi 10 requestů. Kolik requestů za sekundu server obslouží, když se rozloží rovnoměrně přes celý den? (Den má 86,400 sekund.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Aplikaci používá za den zhruba 1 milion lidí a každý z nich během používání udělá asi 10 requestů.",
      prompt: "Kolik requestů za sekundu server obslouží, když se rozloží rovnoměrně přes celý den? (Den má 86,400 sekund.)",
      explanation: "Milion lidí krát deset requestů je deset milionů requestů za den a deset milionů děleno 86,400 sekundami je zhruba 116 za sekundu. To je malé číslo a vědět, že je malé, je celá pointa: jeden obyčejný server to zvládne, aniž by se zapotil. Umět si to spočítat z hlavy je to, co tě zastaví před navrhováním pro škálu, kterou nemáš. Skutečný provoz rovnoměrný není, takže nejrušnější hodina bývá dvakrát až třikrát nad průměrem — dimenzuj na ni, ne na průměr.",
      unit: "requestů za sekundu",
    },
  },
  "dd-a-year-of-photos": {
    title: "Rok fotek",
    prompt: "Malá aplikace na fotky přijme asi 1,000 uploadů denně. Uložená fotka má zhruba 2 megabajty. Kolik gigabajtů zabere rok uploadů? (Tisíc megabajtů je gigabajt a rok má asi 365 dní.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Malá aplikace na fotky přijme asi 1,000 uploadů denně. Uložená fotka má zhruba 2 megabajty.",
      prompt: "Kolik gigabajtů zabere rok uploadů? (Tisíc megabajtů je gigabajt a rok má asi 365 dní.)",
      explanation: "Tisíc fotek po dvou megabajtech je dva tisíce megabajtů, tedy dva gigabajty denně, takže rok je zhruba 730 gigabajtů. Stojí za to si všimnout, že je to pod terabajt za rok, protože to znamená, že to zvládne obyčejné cloudové úložiště a není tu co chytrého navrhovat. Tenhle výpočet je taky první, co člověk na pohovoru chce slyšet, když řekneš „obrázky budeme ukládat“ — odpověď rozhodne, jestli je úložiště poznámka pod čarou, nebo celý problém.",
      unit: "gigabajtů",
    },
  },
  "dd-how-much-cache": {
    title: "Kolik cache",
    prompt: "Web drží v paměti svých 100,000 nejnavštěvovanějších stránek, aby je nemusel pokaždé skládat z databáze. Jedna stránka zabere asi 1 kilobajt. Kolik megabajtů paměti je na to potřeba? (Tisíc kilobajtů je megabajt.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Web drží v paměti svých 100,000 nejnavštěvovanějších stránek, aby je nemusel pokaždé skládat z databáze. Jedna stránka zabere asi 1 kilobajt.",
      prompt: "Kolik megabajtů paměti je na to potřeba? (Tisíc kilobajtů je megabajt.)",
      explanation: "Sto tisíc záznamů po kilobajtu je sto tisíc kilobajtů, tedy zhruba 100 megabajtů. To se vejde do paměti na jakémkoli stroji, a to je užitečný závěr: cachovat populární stránky je levné. Když si to spočítáš, rozhovor se nezasekne na tom, jestli si cache můžeš dovolit, a skoro vždycky to vyjde takhle — populární výsek čehokoli je dost malý na to, aby se dal držet, a přesně proto cachování vůbec funguje.",
      unit: "megabajtů",
    },
  },
  "dd-rows-in-two-years": {
    title: "Řádky za dva roky",
    prompt: "E-shop přijme asi 500 objednávek denně a každá objednávka je jeden řádek v tabulce. Tým chce vědět, jak velká ta tabulka bude, než se o ni začne bát. Kolik řádků má tabulka objednávek zhruba po dvou letech? (Rok má asi 365 dní.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "E-shop přijme asi 500 objednávek denně a každá objednávka je jeden řádek v tabulce. Tým chce vědět, jak velká ta tabulka bude, než se o ni začne bát.",
      prompt: "Kolik řádků má tabulka objednávek zhruba po dvou letech? (Rok má asi 365 dní.)",
      explanation: "Pět set denně krát 365 je asi 180,000 za rok, takže dva roky jsou zhruba 365,000 řádků. To je malá tabulka. Jedna databáze v pohodě zvládne miliony řádků, pokud dotazy používají index, takže poctivá odpověď na „jak to budeš škálovat“ tady zní, že to zatím nepotřebuješ. Vědět, kde jsou skutečné hranice, je to, co tě zastaví před navrhováním shardingu pro e-shop s pěti sty objednávkami denně.",
      unit: "řádků",
    },
  },
  "dd-people-online-at-once": {
    title: "Lidé online zároveň",
    prompt: "Službu používá během dne 100,000 lidí. Podle měření ji má v kterýkoli okamžik otevřenou asi 5 procent z nich. Kolik lidí ji používá ve stejnou chvíli?",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Službu používá během dne 100,000 lidí. Podle měření ji má v kterýkoli okamžik otevřenou asi 5 procent z nich.",
      prompt: "Kolik lidí ji používá ve stejnou chvíli?",
      explanation: "Pět procent ze sta tisíc je pět tisíc najednou. Rozdíl mezi „uživateli“ a „uživateli právě teď“ je jedna z nejčastějších záměn v rozhovoru o návrhu: sto tisíc zní jako hodně a pět tisíc souběžných je to, co tvé servery opravdu musí unést. Vždycky se zeptej, které číslo má dotyčný na mysli. Poměr se liší — chatovací aplikace, kterou lidé nechávají otevřenou, běží mnohem výš než web, na který přijdou jednou týdně.",
      unit: "lidí najednou",
    },
  },
  "dd-a-day-of-messages": {
    title: "Den zpráv",
    prompt: "Funkce zpráv přenese asi 1 milion zpráv denně. Uložená zpráva je krátká — zhruba 200 bajtů včetně odesílatele a časové značky. Kolik megabajtů nových zpráv to je za den? (Milion bajtů je megabajt.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Funkce zpráv přenese asi 1 milion zpráv denně. Uložená zpráva je krátká — zhruba 200 bajtů včetně odesílatele a časové značky.",
      prompt: "Kolik megabajtů nových zpráv to je za den? (Milion bajtů je megabajt.)",
      explanation: "Milion zpráv po 200 bajtech je 200 milionů bajtů, tedy asi 200 megabajtů denně. Text je drobný — to je to poučení. Rok textu je hluboko pod sto gigabajtů, což žádné databázi nevadí. Cokoli s obrázky nebo videem je úplně jiný problém a oddělit si v hlavě brzy „text“ od „souborů“ je to, co drží návrh poctivý v tom, kde je skutečná váha.",
      unit: "megabajtů",
    },
  },
  "dd-a-month-of-backups": {
    title: "Měsíc záloh",
    prompt: "Databáze má asi 50 gigabajtů. Každou noc se dělá plná kopie a posledních 30 nocí se uchovává. Kolik gigabajtů zabírají zálohy dohromady?",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Databáze má asi 50 gigabajtů. Každou noc se dělá plná kopie a posledních 30 nocí se uchovává.",
      prompt: "Kolik gigabajtů zabírají zálohy dohromady?",
      explanation: "Padesát gigabajtů krát třicet kopií je 1,500 gigabajtů, takže zálohy jsou třicetkrát větší než databáze. To lidi překvapuje a je to důvod, proč zálohy obvykle drží méně plných kopií a víc inkrementálních, které ukládají jen to, co se od minulé změnilo. Stojí za to si odnést, že zálohovací politika je rozhodnutí o úložišti a „nechat si všechno navždy“ je účet, ne plán.",
      unit: "gigabajtů",
    },
  },
  "dd-sizing-for-the-peak": {
    title: "Dimenzování na špičku",
    prompt: "Web má přes celý den průměrně 100 requestů za sekundu. Provoz kopíruje bdělé hodiny a nejrušnější hodina běží asi na trojnásobku průměru. Kolik requestů za sekundu by servery měly zvládnout?",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Web má přes celý den průměrně 100 requestů za sekundu. Provoz kopíruje bdělé hodiny a nejrušnější hodina běží asi na trojnásobku průměru.",
      prompt: "Kolik requestů za sekundu by servery měly zvládnout?",
      explanation: "Třikrát sto je tři sta za sekundu ve špičce a špička je to, co musíš přežít — průměr, který nikdo nikdy nezažije, je pro dimenzování k ničemu. To je rozdíl mezi systémem, který polední špičku ustojí, a systémem, který spadne. Většina týmů k tomu přidává rezervu, protože stroj na 100 procentech kapacity nemá nic navíc pro špičku ani pro deploy.",
      unit: "requestů za sekundu",
    },
  },
  "dd-the-size-of-an-index": {
    title: "Velikost indexu",
    prompt: "Tabulka má 1 milion řádků. Index je zvláštní seřazená struktura, kterou si databáze drží, aby našla řádky podle sloupce, aniž by je četla všechny; jeden záznam tu má asi 20 bajtů. Kolik megabajtů ten index zabere? (Milion bajtů je megabajt.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Tabulka má 1 milion řádků. Index je zvláštní seřazená struktura, kterou si databáze drží, aby našla řádky podle sloupce, aniž by je četla všechny; jeden záznam tu má asi 20 bajtů.",
      prompt: "Kolik megabajtů ten index zabere? (Milion bajtů je megabajt.)",
      explanation: "Milion záznamů po dvaceti bajtech je zhruba dvacet megabajtů. Drobnost, a proto se přidat index k pomalému dotazu při téhle velikosti skoro vždycky vyplatí. Indexy ale nejsou zadarmo: databáze musí každý z nich aktualizovat při každém zápisu a každý zabírá místo v paměti i v každé záloze. To je skutečná cena — rychlé čtení, o něco pomalejší zápisy — a stojí za to ji říct nahlas, místo abys přidával indexy na všechno.",
      unit: "megabajtů",
    },
  },
  "dd-data-leaving-per-day": {
    title: "Data odcházející za den",
    prompt: "Web obslouží 10,000 zobrazení stránek denně. Každá stránka stáhne asi 1 megabajt obrázků, skriptů a stylů. Kolik gigabajtů odejde ze serverů každý den? (Tisíc megabajtů je gigabajt.)",
    hints: ["Stačí hrubý odhad — nemusíš být přesný."],
    drill: {
      scenario: "Web obslouží 10,000 zobrazení stránek denně. Každá stránka stáhne asi 1 megabajt obrázků, skriptů a stylů.",
      prompt: "Kolik gigabajtů odejde ze serverů každý den? (Tisíc megabajtů je gigabajt.)",
      explanation: "Deset tisíc zobrazení po megabajtu je 10,000 megabajtů, tedy asi 10 gigabajtů denně. Cloudoví poskytovatelé účtují data, která opouštějí jejich síť, takže tohle je číslo, ze kterého se stane faktura, a roste s návštěvníky, ne s velikostí tvé databáze. Je to taky argument pro CDN: ty servery drží kopie blízko uživatelů, takže většina těch bajtů odchází z CDN místo od tebe.",
      unit: "gigabajtů",
    },
  },
  "dd-which-kind-of-database": {
    title: "Jaký typ databáze",
    prompt: "Rezervační aplikace ukládá zákazníky, rezervace a platby. Každá rezervace patří zákazníkovi, každá platba patří rezervaci a pole jsou pro všechny stejná. Jaký typ databáze mají použít?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Rezervační aplikace ukládá zákazníky, rezervace a platby. Každá rezervace patří zákazníkovi, každá platba patří rezervaci a pole jsou pro všechny stejná.",
      prompt: "Jaký typ databáze mají použít?",
      explanation: "Relační databáze existují přesně pro tohle: pevná pole a záznamy, které na sebe ukazují. Dostaneš jedno místo pro každý fakt, vazby, které vymáhá sama databáze, a možnost ptát se napříč tabulkami. Dokumentová databáze je lepší, když se tvar záznamů divoce liší nebo se vždycky čtou celé. Key-value store je lepší, když vždycky jen čteš podle id a nikdy nefiltruješ. Obyčejné soubory ti nedají žádné dotazování, žádnou ochranu, když dorazí dva zápisy najednou, a žádný způsob, jak se zeptat na cokoli napříč rezervacemi.",
      options: [
        "Relační (SQL) databázi, s tabulkou pro každý typ a vazbami mezi nimi",
        "Dokumentovou databázi, kde je každý zákazník jeden velký vnořený dokument",
        "Key-value store, kde je jediná cesta dovnitř podle id",
        "Obyčejné soubory na serveru, jeden na rezervaci",
      ],
    },
  },
  "dd-where-uploaded-files-go": {
    title: "Kam s nahranými soubory",
    prompt: "Uživatelé nahrávají profilové fotky o dvou až třech megabajtech. Aplikace taky potřebuje vědět, komu fotka patří a kdy byla nahraná. Kde má bydlet samotná fotka a kde údaje o ní?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Uživatelé nahrávají profilové fotky o dvou až třech megabajtech. Aplikace taky potřebuje vědět, komu fotka patří a kdy byla nahraná.",
      prompt: "Kde má bydlet samotná fotka a kde údaje o ní?",
      explanation: "Object storage je cloudová služba stavěná na to, aby levně držela soubory a servírovala je rovnou prohlížečům, takže fotka nikdy neputuje přes tvou aplikaci. Databáze drží malá fakta, podle kterých potřebuješ hledat. Bajty v databázi znamenají, že každý dotaz a záloha tahá megabajty s sebou. Vlastní disk serveru se rozbije v okamžiku, kdy přibude druhý server, protože ten má jiný disk. Fakta zakódovaná v názvech souborů znamenají, že se nemůžeš zeptat „všechno nahrané tento týden“ bez vypsání každého souboru.",
      options: [
        "Fotka v object storage, vlastník a datum v řádku databáze, který na ni ukazuje",
        "Fotka i údaje o ní v databázi",
        "Fotka na vlastním disku serveru, údaje o ní v databázi",
        "Fotka v object storage, s vlastníkem a datem zabudovanými do názvu souboru",
      ],
    },
  },
  "dd-where-a-login-lives": {
    title: "Kde bydlí přihlášení",
    prompt: "Web si pamatuje, kdo je přihlášený, tak, že drží session v paměti serveru, který přihlášení obsloužil. Tým se chystá přidat druhý server. Kde mají session bydlet, jakmile je serverů víc než jeden?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Web si pamatuje, kdo je přihlášený, tak, že drží session v paměti serveru, který přihlášení obsloužil. Tým se chystá přidat druhý server.",
      prompt: "Kde mají session bydlet, jakmile je serverů víc než jeden?",
      explanation: "Každý server zná jen to, co má ve vlastní paměti, takže request, který přistane na tom druhém, vypadá, jako by nikdo nebyl přihlášený. Přesun session někam, odkud čtou oba, to opraví a dovolí ti přidat třetí server, kdykoli chceš. Držet je v paměti je přesně to, co se rozbije. Obyčejná cookie s id uživatele je horší než rozbitá — kdokoli si ji upraví a stane se někým jiným. Soubor má stejný problém jako paměť, protože ho druhý server taky nevidí.",
      options: [
        "Ve sdíleném úložišti, ze kterého čtou oba servery, třeba v Redisu nebo v databázové tabulce",
        "V paměti každého serveru zvlášť, jako teď",
        "V prohlížeči, s id uživatele v obyčejné cookie",
        "V souboru na tom serveru, který session vytvořil",
      ],
    },
  },
  "dd-storing-passwords": {
    title: "Ukládání hesel",
    prompt: "Nový registrační formulář bere e-mail a heslo. Tým musí rozhodnout, co se při registraci opravdu zapíše do tabulky uživatelů. Co má být uložené ve sloupci s heslem?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Nový registrační formulář bere e-mail a heslo. Tým musí rozhodnout, co se při registraci opravdu zapíše do tabulky uživatelů.",
      prompt: "Co má být uložené ve sloupci s heslem?",
      explanation: "Hash je jednosměrný: heslo ověříš tak, že zahashuješ, co bylo napsáno, a porovnáš, ale uloženou hodnotu nikdy nepřevedeš zpátky na heslo. Záměrně pomalé algoritmy jako bcrypt dělají zkoušení milionů kandidátů nepraktickým. Šifrování je špatný nástroj, protože je vratné — kdo drží klíč, drží každé heslo. Ukládat hesla tak, jak byla napsaná, znamená, že jedna uniklá záloha odhalí každý účet, na tvém webu i na každém dalším, kde někdo heslo použil znovu. Rychlé hashe jako MD5 se hádají obrovskou rychlostí.",
      options: [
        "Hash hesla vytvořený pomalým algoritmem stavěným na hesla, například bcryptem",
        "Zašifrované heslo, aby se dalo v případě potřeby dešifrovat",
        "Heslo tak, jak bylo napsané, databáze je stejně soukromá",
        "Rychlý hash hesla, například MD5 nebo SHA-1",
      ],
    },
  },
  "dd-where-to-check-input": {
    title: "Kde kontrolovat vstup",
    prompt: "Formulář už odmítá odeslání, když e-mail vypadá špatně nebo je věk záporný. Tým řeší, jestli musí totéž kontrolovat i server. Kde se kontrola musí dít, aby byla bezpečná?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Formulář už odmítá odeslání, když e-mail vypadá špatně nebo je věk záporný. Tým řeší, jestli musí totéž kontrolovat i server.",
      prompt: "Kde se kontrola musí dít, aby byla bezpečná?",
      explanation: "Kdokoli může poslat request rovnou na tvé API, aniž by kdy načetl tvou stránku, takže kontrola v prohlížeči zastaví poctivé omyly a nic jiného. Server je jediné místo, které může špatná data opravdu odmítnout. Kontrola v prohlížeči tím ale není zbytečná — říct někomu o překlepu okamžitě je mnohem lepší než čekat na odpověď serveru — jen je tam pro uživatele, ne pro bezpečnost. Když ji zrušíš, zhoršíš formulář pro všechny a nezabráníš ničemu.",
      options: [
        "Na serveru, vždycky — kontrola v prohlížeči je pohodlí navíc",
        "Jen v prohlížeči, protože chytí chyby dřív, než se odešlou",
        "Jen na serveru, a kontrolu v prohlížeči zrušit",
        "Podle toho, co je pro dané pole jednodušší",
      ],
    },
  },
  "dd-the-slow-email": {
    title: "Pomalý e-mail",
    prompt: "Registrace posílá uvítací e-mail. Poskytovateli e-mailu to občas trvá několik sekund a člověk mezitím zírá na spinner. Co má registrační request s tím e-mailem udělat?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Registrace posílá uvítací e-mail. Poskytovateli e-mailu to občas trvá několik sekund a člověk mezitím zírá na spinner.",
      prompt: "Co má registrační request s tím e-mailem udělat?",
      explanation: "Účet existuje bez ohledu na to, jestli e-mail odešel, takže čekání na něj nechává uživatele platit za práci, která ho nezajímá. Když ho předáš workeru na pozadí — zvláštnímu procesu, který bere joby ze seznamu — je odpověď okamžitá a worker může opakovat pokusy během výpadku, aniž by na to někdo čekal. Dělat to v requestu je správně jen tehdy, když výsledek mění odpověď, jako u platby kartou. Opakování uvnitř requestu prodlužuje nejhorší případ. Přes noc je v pořádku pro souhrn, ne pro zprávu, kterou lidé čekají hned.",
      options: [
        "Uložit účet, předat e-mail workeru na pozadí a hned odpovědět",
        "Poslat e-mail během requestu jako teď, ale s kratším timeoutem",
        "Poslat e-mail během requestu a při selhání to zkusit znovu",
        "Přeskočit ho a poslat uvítací e-maily za celý den přes noc",
      ],
    },
  },
  "dd-a-query-that-got-slow": {
    title: "Dotaz, který zpomalil",
    prompt: "Stránka se seznamem objednávek zákazníka zpomalila. Tabulka objednávek narostla na několik set tisíc řádků a dotaz filtruje podle id zákazníka. Co udělat jako první, aby byla stránka zase rychlá?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Stránka se seznamem objednávek zákazníka zpomalila. Tabulka objednávek narostla na několik set tisíc řádků a dotaz filtruje podle id zákazníka.",
      prompt: "Co udělat jako první, aby byla stránka zase rychlá?",
      explanation: "Bez indexu databáze čte každý řádek, aby našla ty odpovídající, a s růstem tabulky je to pomalejší. Index je seřazená struktura, díky které skočí rovnou na odpovídající řádky — obvykle to promění sekundy v milisekundy za pár řádků migrace. Vždycky nejdřív hledej chybějící index. Cache problém schová a přidá zastarávání. Rozdělit tabulku nebo koupit větší stroj jsou velké a drahé kroky pro něco, co spraví jeden index.",
      options: [
        "Přidat index na sloupec s id zákazníka",
        "Dát před dotaz cache",
        "Přesunout tabulku objednávek do vlastní databáze",
        "Koupit větší databázový stroj",
      ],
    },
  },
  "dd-answering-for-a-missing-thing": {
    title: "Odpověď na něco, co neexistuje",
    prompt: "Endpoint API vrací produkt podle id. Někdy id neexistuje, protože byl produkt smazaný nebo je odkaz starý. Co má API odpovědět?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Endpoint API vrací produkt podle id. Někdy id neexistuje, protože byl produkt smazaný nebo je odkaz starý.",
      prompt: "Co má API odpovědět?",
      explanation: "Stavový kód je způsob, jak stroj pochopí odpověď bez čtení těla, takže musí říkat pravdu. 404 znamená „tady nic není“, což je přesně to, co se stalo. Vrátit 200 říká, že je všechno v pořádku, a nutí každého volajícího parsovat tělo, aby zjistil opak — a cache i monitoring té 200 uvěří. 500 znamená, že se ti rozbil server, což někoho ve tři ráno vzbudí kvůli odkazu, který byl prostě starý. Prázdná 200 je stejná lež s méně informacemi.",
      options: [
        "Stav 404 s krátkou zprávou, že produkt nebyl nalezen",
        "Stav 200 s tělem, které říká, že produkt nebyl nalezen",
        "Stav 500, protože vyhledání žádný produkt nevrátilo",
        "Stav 200 s prázdným tělem a ať si to volající domyslí",
      ],
    },
  },
  "dd-plain-http-or-https": {
    title: "Obyčejné HTTP, nebo HTTPS",
    prompt: "Interní administrační nástroj je dostupný jen z kancelářské sítě. Někdo navrhuje vynechat certifikáty, protože není na veřejném internetu. Má běžet přes HTTPS?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Interní administrační nástroj je dostupný jen z kancelářské sítě. Někdo navrhuje vynechat certifikáty, protože není na veřejném internetu.",
      prompt: "Má běžet přes HTTPS?",
      explanation: "HTTPS šifruje provoz, takže kdokoli, kdo umí sledovat síť, nepřečte hesla, session cookie ani osobní údaje, když jdou kolem. Kancelářské sítě nejsou magicky bezpečné: wifi pro hosty, napadený notebook nebo špatně nastavený switch, to všechno někoho postaví do cesty. Chránit jen přihlašovací stránku je klasická chyba, protože session cookie posílaná s každým dalším requestem je stejně dobrá jako heslo. Certifikáty jsou dnes zdarma a automatizované, takže to vlastně ani není kompromis.",
      options: [
        "Ano — cokoli, co nese přihlášení nebo osobní údaje, jede přes HTTPS, interní nebo ne",
        "Ne, na interní síti nejde nic odposlechnout",
        "Jen pro přihlašovací stránku a po přihlášení obyčejné HTTP",
        "Jen pokud se později otevře do veřejného internetu",
      ],
    },
  },
  "dd-a-list-that-keeps-growing": {
    title: "Seznam, který pořád roste",
    prompt: "Endpoint vrací každou notifikaci, kterou uživatel kdy dostal. Při spuštění to bylo v pořádku; některé účty jich teď mají desítky tisíc. Co má endpoint vracet místo toho?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Endpoint vrací každou notifikaci, kterou uživatel kdy dostal. Při spuštění to bylo v pořádku; některé účty jich teď mají desítky tisíc.",
      prompt: "Co má endpoint vracet místo toho?",
      explanation: "Vracet všechno stojí databázi, tvůj přenos i paměť prohlížeče a roste to s nejtěžším uživatelem, ne s typickým. Poslat pevnou stránku a způsob, jak si říct o další, drží cenu stejnou bez ohledu na množství historie. Filtrování v prohlížeči znamená, že všechna ta práce už proběhla. Komprese zmenší bajty, ale ne dotaz. Mazat data, aby ses vyhnul stránkování, je zahodit produkt, aby ses vyhnul opravě.",
      options: [
        "Vracet po stránkách — pevný počet a způsob, jak si říct o další",
        "Vracet všechno a nechat prohlížeč ukázat jen prvních dvacet",
        "Vracet všechno, ale odpověď komprimovat",
        "Mazat notifikace starší než týden, aby seznam zůstal krátký",
      ],
    },
  },
  "dd-what-is-worth-caching": {
    title: "Co stojí za cachování",
    prompt: "Stránka e-shopu ukazuje celkový seznam kategorií, který se mění párkrát do roka, a stav skladu produktu, který se mění neustále. Která z těch dvou věcí se má cachovat?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Stránka e-shopu ukazuje celkový seznam kategorií, který se mění párkrát do roka, a stav skladu produktu, který se mění neustále.",
      prompt: "Která z těch dvou věcí se má cachovat?",
      explanation: "Cachování se vyplatí, když se něco čte mnohem častěji, než se mění, a prodělává, když zastaralá odpověď vadí. Kategorie se čtou na každé stránce a mění se dvakrát do roka — skoro zadarmo, skoro nikdy špatně. Stav skladu, který je minutu starý, prodá něco, co nemáš. Obecné pravidlo stojí za to si odnést: cachuj, co je stabilní a populární, proměnlivé a důležité věci čti čerstvé a jedna stránka klidně dělá obojí.",
      options: [
        "Seznam kategorií, protože se čte pořád a skoro nikdy se nemění",
        "Stav skladu, protože je to nejdražší dotaz",
        "Obojí, se stejnou krátkou expirací",
        "Ani jedno, protože stránka obě věci míchá",
      ],
    },
  },
  "dd-one-big-server-or-several": {
    title: "Jeden velký server, nebo několik",
    prompt: "Jeden webový server běží v rušných časech blízko svého limitu. Tým může přejít na mnohem větší stroj, nebo dát load balancer před několik obyčejných. Co má tým zvolit?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Jeden webový server běží v rušných časech blízko svého limitu. Tým může přejít na mnohem větší stroj, nebo dát load balancer před několik obyčejných.",
      prompt: "Co má tým zvolit?",
      explanation: "Větší stroj je opravdu jednodušší a často je to správný první krok, ale narazí dvakrát: existuje největší stroj, jaký se dá koupit, a zatímco restartuje, jsi mimo provoz. Několik obyčejných serverů za load balancerem běží dál, když jeden umře, a dají se podle potřeby přidávat. Cena je, že tvá aplikace musí přestat držet cokoli důležitého ve vlastní paměti — session a uploady se musí přesunout někam do sdíleného úložiště. To je skutečný kompromis a důvod, proč tu změnu udělat dřív, než budeš zoufalý.",
      options: [
        "Několik serverů za load balancerem, protože je můžeš dál přidávat a výpadek jednoho se dá přežít",
        "Jeden mnohem větší stroj, protože je to jednodušší a nevyžaduje změny",
        "Několik serverů, protože každý je levnější než velký stroj",
        "Jeden větší stroj, protože load balancer je single point of failure",
      ],
    },
  },
  "dd-images-loading-slowly": {
    title: "Pomalu se načítající obrázky",
    prompt: "Web servíruje obrázky a skripty ze stejných serverů, na kterých běží aplikace. Uživatelé daleko od datacentra si stěžují, že se stránky načítají pomalu. Jaká je nejlepší oprava pomalých obrázků?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Web servíruje obrázky a skripty ze stejných serverů, na kterých běží aplikace. Uživatelé daleko od datacentra si stěžují, že se stránky načítají pomalu.",
      prompt: "Jaká je nejlepší oprava pomalých obrázků?",
      explanation: "Zpoždění je vzdálenost: každý soubor cestuje přes půl světa a zpátky. CDN drží kopie na místech blízko uživatelů, takže bajty cestují kousek a tvé servery vůbec nezatěžují. Rychlejší aplikační server nemění, jak daleko data cestují. Komprese trochu pomůže a stojí za to ji udělat tak jako tak, ale vzdálenost nespraví. Přesun celé aplikace blíž k těm uživatelům jim pomůže a všem ostatním uškodí a přinese všechny potíže s během na dvou místech.",
      options: [
        "CDN — síť serverů po celém světě, které drží kopie tvých souborů blízko uživatelů",
        "Rychlejší aplikační server",
        "Víc komprimovat obrázky a nic jiného neměnit",
        "Přesunout celou aplikaci blíž k těm uživatelům",
      ],
    },
  },
  "dd-when-a-call-fails": {
    title: "Když volání selže",
    prompt: "Worker na pozadí volá jinou službu, která začala vracet chyby, protože je přetížená. Jak má worker opakovat pokusy?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Worker na pozadí volá jinou službu, která začala vracet chyby, protože je přetížená.",
      prompt: "Jak má worker opakovat pokusy?",
      explanation: "Okamžité opakování hrne další requesty na službu, která už teď nestíhá, a může ji držet u země dlouho po tom, co by se jinak vzpamatovala. Čekat pokaždé o něco déle — sekundu, pak dvě, pak čtyři — jí dá prostor vydechnout a limit zabrání tomu, aby jeden rozbitý job zkoušel štěstí donekonečna. Tři okamžité pokusy jsou stejný nával, jen menší. Neopakovat vůbec zahazuje snadnou výhru, protože většina takových selhání je dočasná a další pokus projde.",
      options: [
        "Před každým pokusem počkat o něco déle a po několika pokusech to vzdát",
        "Opakovat okamžitě a pořád dokola, dokud to neprojde",
        "Opakovat okamžitě, ale jen třikrát",
        "Neopakovat vůbec — nahlásit selhání a jít dál",
      ],
    },
  },
  "dd-store-the-total-or-add-it-up": {
    title: "Uložit součet, nebo ho počítat",
    prompt: "Objednávka má hrstku položek. Stránka ukazuje celkovou částku objednávky, což je jen součet těch položek. Má být součet uložený na objednávce, nebo spočítaný při zobrazení?",
    hints: ["Vyber možnost, která téhle situaci sedí nejlíp."],
    drill: {
      scenario: "Objednávka má hrstku položek. Stránka ukazuje celkovou částku objednávky, což je jen součet těch položek.",
      prompt: "Má být součet uložený na objednávce, nebo spočítaný při zobrazení?",
      explanation: "Sečíst pět čísel nestojí nic a jeden zdroj pravdy znamená, že součet nikdy nemůže nesouhlasit s položkami, ze kterých vznikl. Uložení vytvoří druhou kopii, kterou musíš aktualizovat všude, kde se změní položka, a chyba, kdy se rozejdou, je tichá a ošklivá. Ukládat spočítanou hodnotu je skutečná technika, ale vyplatí se, když je výpočet opravdu drahý — miliony řádků, ne pět — a pak s sebou nese povinnost držet ji správnou. Noční oprava je přiznání, že se to rozjíždí.",
      options: [
        "Spočítaný při zobrazení, protože položek je jen pár a jedna kopie pravdy nemůže nesouhlasit",
        "Uložený na objednávce, protože sčítat čísla při každém načtení stránky je plýtvání",
        "Uložený a nočním jobem přepočítaný pro případ, že se rozjede",
        "Obojí — uložit ho a při každém čtení kontrolovat proti součtu",
      ],
    },
  },
  "dd-a-table-with-no-index": {
    title: "Tabulka bez indexu",
    prompt: "Nástroj pro podporu vyhledává tickety podle referenčního čísla. Na tom sloupci není index a tabulka narostla z několika tisíc řádků na několik milionů. Co se rozbije první, jak tabulka roste?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Nástroj pro podporu vyhledává tickety podle referenčního čísla. Na tom sloupci není index a tabulka narostla z několika tisíc řádků na několik milionů.",
      prompt: "Co se rozbije první, jak tabulka roste?",
      explanation: "Bez indexu databáze nemá jak najít referenční číslo jinak než prohlédnout každý řádek, takže práce roste přesně s tabulkou — v pohodě při několika tisících, bolestivě při několika milionech. Úložiště není problém; tickety jsou malé. Paměť taky ne, protože se vrací jediný řádek. Oprava je jeden index na sloupci, podle kterého se hledá, a důvod, proč to poznat rychle, je, že je to zdaleka nejčastější příčina dotazu, který „najednou“ zpomalil.",
      options: [
        "Každé vyhledání čte celou tabulku, takže hledání zpomaluje úměrně její velikosti",
        "Databázi dojde úložiště",
        "Nástroji dojde paměť při držení jednoho ticketu",
        "Síti mezi aplikací a databází dojde kapacita",
      ],
    },
  },
  "dd-sessions-and-a-second-server": {
    title: "Session a druhý server",
    prompt: "Přihlášení se drží v paměti toho serveru, který je obsloužil. Za load balancer, který posílá každý request na ten server, co je zrovna volný, přibyl druhý server. Co se rozbije první, jakmile jsou servery dva?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Přihlášení se drží v paměti toho serveru, který je obsloužil. Za load balancer, který posílá každý request na ten server, co je zrovna volný, přibyl druhý server.",
      prompt: "Co se rozbije první, jakmile jsou servery dva?",
      explanation: "Jen server, který session vytvořil, ví, že existuje, takže zhruba polovina requestů dorazí někam, kde o tobě nikdy neslyšeli, a vypadají odhlášeně. Není to pomalé, je to špatně, a ukáže se to hned, jak druhý server přibude, ne až při nějaké konkrétní zátěži. Paměť je od limitu daleko. Oprava je držet session někde, odkud čtou oba servery, což je zároveň to, co ti dovolí přidat třetí.",
      options: [
        "Lidé jsou náhodně odhlašováni, kdykoli request přistane na druhém serveru",
        "Oběma serverům začne docházet paměť",
        "Load balancer nestíhá provoz",
        "Přihlašovací stránka zpomalí",
      ],
    },
  },
  "dd-emailing-inside-a-request": {
    title: "E-maily uvnitř requestu",
    prompt: "Administrační stránka posílá e-mail každému členovi skupiny tak, že projde všechny v cyklu a pro každého jednou zavolá poskytovatele e-mailu. Skupiny narostly z deseti lidí na dva tisíce. Co se rozbije první u velké skupiny?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Administrační stránka posílá e-mail každému členovi skupiny tak, že projde všechny v cyklu a pro každého jednou zavolá poskytovatele e-mailu. Skupiny narostly z deseti lidí na dva tisíce.",
      prompt: "Co se rozbije první u velké skupiny?",
      explanation: "Dva tisíce volání za sebou trvají mnohem déle, než smí běžet webový request, a protože jediný záznam o postupu je samotný cyklus, timeout nechá práci v půlce bez bezpečného způsobu, jak navázat — spusť ji znovu a první polovina dostane e-mail podruhé. Oprava je předat práci workeru na pozadí, zaznamenávat, co se stalo u každého člověka, a udělat každý krok bezpečně opakovatelný. Dva tisíce jmen v paměti nejsou nic.",
      options: [
        "Request v půlce narazí na svůj časový limit a nikde není záznam, komu už e-mail odešel",
        "Poskytovatel e-mailu odmítne zprávy jako spam",
        "Databázi dojdou spojení",
        "Seznam skupiny se přestane vejít do paměti",
      ],
    },
  },
  "dd-serving-images-yourself": {
    title: "Servírování obrázků vlastními servery",
    prompt: "Nahrané obrázky čtou z disku a odesílají ty samé aplikační servery, které obsluhují všechny ostatní requesty. Kampaň má přivést desetinásobný provoz. Co se rozbije první, až provoz dorazí?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Nahrané obrázky čtou z disku a odesílají ty samé aplikační servery, které obsluhují všechny ostatní requesty. Kampaň má přivést desetinásobný provoz.",
      prompt: "Co se rozbije první, až provoz dorazí?",
      explanation: "Obrázek je tisíckrát větší než typická odpověď API, takže jejich odesílání spotřebovává spojení, přenos a pozornost serverů, které mají odpovídat na všechno ostatní. Příznak je matoucí, protože zpomalí i stránky bez obrázků. Oprava je nechat soubory servírovat přímo object storage nebo CDN a serverům nechat tu část, kterou umí jen ony. Disk se nakonec zaplní, ale mnohem pomaleji, než dojde kapacita.",
      options: [
        "Odesílání bajtů obrázků spotřebuje kapacitu serverů, takže zpomalí i obyčejné requesty",
        "Obrázky se přestanou vejít na disk",
        "Databáze nestíhá vyhledávání obrázků",
        "Prohlížeče odmítnou načíst tolik obrázků",
      ],
    },
  },
  "dd-everything-on-one-database": {
    title: "Všechno na jedné databázi",
    prompt: "Čtyři aplikační servery stojí za load balancerem a všechny čtyři mluví s jedinou databází. Provoz stabilně roste a většina z něj je čtení. Co se rozbije první, jak provoz dál roste?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Čtyři aplikační servery stojí za load balancerem a všechny čtyři mluví s jedinou databází. Provoz stabilně roste a většina z něj je čtení.",
      prompt: "Co se rozbije první, jak provoz dál roste?",
      explanation: "Aplikační servery se snadno přidávají, protože nic vlastního nedrží — ale každý, který přidáš, míří na tu samou databázi, takže škálování snadné poloviny jen víc tlačí na polovinu, kterou jsi neškáloval. Protože většina provozu je čtení, obvyklý další krok je read replika: synchronizovaná kopie, která obsluhuje čtení, zatímco zápisy jdou pořád do originálu. Poznat, která část diagramu je ta sdílená, je většina toho, co „kde se to rozbije“ znamená.",
      options: [
        "Databáze, protože přidávání aplikačních serverů jí jen posílá víc práce",
        "Load balancer, který musí směrovat víc requestů",
        "Aplikační servery, z nichž každý zvládá čtvrtinu provozu",
        "Síť mezi load balancerem a servery",
      ],
    },
  },
  "dd-filtering-in-the-app": {
    title: "Filtrování v aplikaci",
    prompt: "Stránka potřebuje objednávky za minulý měsíc. Kód načte z databáze každou objednávku a pak filtruje podle data v aplikaci. Co se rozbije první, jak tabulka objednávek roste?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Stránka potřebuje objednávky za minulý měsíc. Kód načte z databáze každou objednávku a pak filtruje podle data v aplikaci.",
      prompt: "Co se rozbije první, jak tabulka objednávek roste?",
      explanation: "Databáze umí filtrovat velmi dobře a sedí přímo u dat. Dělat to v aplikaci znamená, že se každý řádek přečte, serializuje, pošle přes síť a drží v paměti, než se skoro všechny zahodí — práce, která roste s celou tabulkou, a ne s odpovědí. Přesunout podmínku do dotazu, s indexem na datu, znamená, že databáze vrátí jen to, o co jsi požádal. Porovnat dvě data je triviální; bolí ten objem.",
      options: [
        "Aplikace tahá celou tabulku přes síť a do paměti jen proto, aby většinu zahodila",
        "Porovnání dat začne být příliš pomalé na výpočet",
        "Databázi dojdou spojení",
        "Prohlížeč nedokáže výsledky vykreslit",
      ],
    },
  },
  "dd-querying-in-a-loop": {
    title: "Dotazování v cyklu",
    prompt: "Stránka vypisuje padesát blogových příspěvků. Kód načte příspěvky jedním dotazem, pak je projde v cyklu a pro každý načte autora dalším. Co se rozbije první, jak stránka ukazuje víc příspěvků?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Stránka vypisuje padesát blogových příspěvků. Kód načte příspěvky jedním dotazem, pak je projde v cyklu a pro každý načte autora dalším.",
      prompt: "Co se rozbije první, jak stránka ukazuje víc příspěvků?",
      explanation: "Tohle je problém N+1: jeden dotaz na seznam a pak jeden další na každou položku v něm. Každá cesta tam a zpět je malá, ale sčítají se a jejich počet roste s velikostí stránky, takže degraduje přesně ve chvíli, kdy začne být stránka užitečná. Oprava je říct si o všechny autory najednou — jeden dotaz s padesáti id, nebo join — a proměnit padesát jedna cest ve dvě. Znát ten název se vyplatí, protože je to jedna z prvních věcí, po kterých reviewer kouká.",
      options: [
        "Z jedné stránky se stane padesát jedna samostatných dotazů, každý s vlastní cestou tam a zpět",
        "Příspěvky se přestanou vejít do paměti",
        "Tabulka autorů potřebuje index",
        "Vykreslení šablony trvá příliš dlouho",
      ],
    },
  },
  "dd-a-call-with-no-timeout": {
    title: "Volání bez timeoutu",
    prompt: "Stránka volá externí službu s počasím a čeká na odpověď. Timeout není nastavený. Služba s počasím začala místo odpovědi viset. Co se rozbije první, jakmile druhá služba visí?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Stránka volá externí službu s počasím a čeká na odpověď. Timeout není nastavený. Služba s počasím začala místo odpovědi viset.",
      prompt: "Co se rozbije první, jakmile druhá služba visí?",
      explanation: "Request, který nikdy neskončí, dál drží to, co ho obsluhuje, takže každý nový návštěvník zabere další slot a žádný se nikdy neuvolní. Zanedlouho leží celý web kvůli jedné pomalé závislosti — a stránky, které službu s počasím nikdy nevolají, lehnou s ním. Na volání něčeho, co neovládáš, vždycky nastav timeout, rozhodni, co ukázat, když vyprší, a zvaž, že po překročení prahu selhání volání na chvíli úplně zastavíš.",
      options: [
        "Requesty se hromadí v čekání a spotřebují kapacitu serveru, až neobslouží vůbec nic",
        "Služba s počasím začne volání odmítat",
        "Jako první se vyčerpá pool databázových spojení",
        "Uživatelé okamžitě vidí chybovou stránku",
      ],
    },
  },
  "dd-resizing-during-upload": {
    title: "Zmenšování během uploadu",
    prompt: "Když se nahraje fotka, ten samý server, který obsluhuje všechny ostatní requesty, ji před odpovědí zmenší do čtyř velikostí. Uploady se mají zdesetinásobit. Co se rozbije první, až uploady narostou?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Když se nahraje fotka, ten samý server, který obsluhuje všechny ostatní requesty, ji před odpovědí zmenší do čtyř velikostí. Uploady se mají zdesetinásobit.",
      prompt: "Co se rozbije první, až uploady narostou?",
      explanation: "Zmenšování je těžká práce pro procesor a děje se v procesu, který odpovídá na obyčejné requesty, takže nával uploadů vyhladoví endpointy, které s fotkami nemají nic společného. Příznak se objeví všude kromě místa, kde je ta práce, a špatně se diagnostikuje. Oprava je upload přijmout, uložit originál, odpovědět a zmenšování nechat zvláštní skupině workerů — škálované samostatně a schopné opakovat pokus, aniž by někdo čekal.",
      options: [
        "Zmenšování spotřebuje procesor, takže na tom serveru zpomalí každý nesouvisející request",
        "Object storage dojde kapacita",
        "Formulář pro upload přestane správně validovat",
        "Databáze nestíhá uploady zapisovat",
      ],
    },
  },
  "dd-returning-everything": {
    title: "Vracení všeho",
    prompt: "Mobilní aplikace si při každém spuštění řekne API o celou historii zpráv uživatele. Dlouholetí uživatelé mají už desítky tisíc zpráv. Co se rozbije první pro tyhle uživatele?",
    hints: ["Pojmenuj první věc, která se rozbije."],
    drill: {
      scenario: "Mobilní aplikace si při každém spuštění řekne API o celou historii zpráv uživatele. Dlouholetí uživatelé mají už desítky tisíc zpráv.",
      prompt: "Co se rozbije první pro tyhle uživatele?",
      explanation: "Cena je svázaná s tím, kolik historie někdo má, ne s tím, co potřebuje vidět, takže aplikace zpomaluje tím víc, čím déle ji někdo používá — a trestá tvé nejlepší uživatele. Trpí celý řetězec najednou: velký dotaz, velký přenos a telefon, který to všechno parsuje, aby ukázal posledních dvacet. Oprava je posílat po stránkách se způsobem, jak si říct o další, což drží cenu spuštění stejnou pro všechny.",
      options: [
        "Odpověď roste bez omezení, takže dotaz, přenos i telefon se trápí najednou",
        "API dojdou endpointy",
        "Databázový index na zprávách se přestane používat",
        "Telefonu dojde úložiště",
      ],
    },
  },
  "dd-typing-a-web-address": {
    title: "Zadání webové adresy",
    prompt: "Někdo napíše do prohlížeče adresu a stiskne enter. Než se cokoli objeví na obrazovce, stane se několik věcí. Seřaď tyhle kroky v pořadí, v jakém se dějí.",
    hints: ["Seřaď kroky v pořadí, v jakém se dějí."],
    drill: {
      scenario: "Někdo napíše do prohlížeče adresu a stiskne enter. Než se cokoli objeví na obrazovce, stane se několik věcí.",
      prompt: "Seřaď tyhle kroky v pořadí, v jakém se dějí.",
      explanation: "Tohle je otázka, která stojí za velkým množstvím otázek na pohovoru, a každý krok je místo, kde se něco může pokazit nebo zrychlit. Vyhledání jména je důvod, proč problémy s DNS vypadají jako spadlý web. Navázání spojení je důvod, proč vzdálený server působí pomalu dřív, než udělá jakoukoli práci. Stavový kód je způsob, jak prohlížeč pozná, co dostal. A to, že stránka dorazí první a obrázky se stahují až potom, je důvod, proč se stránka může objevit okamžitě a pak se doplňovat.",
      steps: [
        "Prohlížeč vyhledá doménové jméno, aby zjistil IP adresu serveru",
        "Prohlížeč otevře spojení na tu adresu a pro HTTPS dohodne šifrování",
        "Prohlížeč pošle HTTP request s žádostí o stránku",
        "Server sestaví odpověď a pošle ji zpátky se stavovým kódem",
        "Prohlížeč vykreslí stránku a pak stáhne obrázky a skripty, na které odkazuje",
      ],
    },
  },
  "dd-one-request-through-the-system": {
    title: "Jeden request skrz systém",
    prompt: "Request dorazí na web, který běží na několika aplikačních serverech za load balancerem s jednou databází za nimi. Seřaď cestu jednoho requestu v pořadí, v jakém se děje.",
    hints: ["Seřaď kroky v pořadí, v jakém se dějí."],
    drill: {
      scenario: "Request dorazí na web, který běží na několika aplikačních serverech za load balancerem s jednou databází za nimi.",
      prompt: "Seřaď cestu jednoho requestu v pořadí, v jakém se děje.",
      explanation: "Umět tuhle cestu projít nahlas je většina toho, co pohovor na system design chce. Každý obdélník dělá jednu věc: load balancer rozhoduje kam, aplikační server rozhoduje co, databáze drží pravdu. Zároveň ukazuje, proč aplikační servery nesmí držet nic důležitého ve vlastní paměti — další request od stejného člověka klidně obslouží jiný.",
      steps: [
        "Request dorazí na load balancer",
        "Load balancer vybere jeden z aplikačních serverů a předá mu ho",
        "Ten server ověří, kdo se ptá a co smí",
        "Server se zeptá databáze na data, která potřebuje",
        "Server sestaví odpověď a pošle ji zpátky prohlížeči",
      ],
    },
  },
  "dd-signing-somebody-up": {
    title: "Registrace nového uživatele",
    prompt: "Nový uživatel odešle registrační formulář s e-mailovou adresou a heslem. Seřaď kroky registrace v pořadí, v jakém se dějí.",
    hints: ["Seřaď kroky v pořadí, v jakém se dějí."],
    drill: {
      scenario: "Nový uživatel odešle registrační formulář s e-mailovou adresou a heslem.",
      prompt: "Seřaď kroky registrace v pořadí, v jakém se dějí.",
      explanation: "Pořadí nese uvažování. Levné kontroly jdou první, aby se špatný vstup nikdy nedostal do databáze. Kontrola duplicity přijde před zápisem, i když sloupec s e-mailem má být unikátní i v databázi, protože dva lidé můžou odeslat ve stejný okamžik. Heslo se hashuje před uložením, nikdy potom. A uvítací e-mail je poslední a stranou, protože účet existuje bez ohledu na to, jestli kdy odejde.",
      steps: [
        "Server zkontroluje, že e-mail vypadá platně a heslo je dost dlouhé",
        "Server zkontroluje, že s tím e-mailem ještě žádný účet neexistuje",
        "Server zahashuje heslo a uloží nový účet",
        "Server vytvoří session, aby byl člověk rovnou přihlášený",
        "Server odpoví a worker na pozadí pošle uvítací e-mail",
      ],
    },
  },
  "dd-reading-through-a-cache": {
    title: "Čtení přes cache",
    prompt: "Stránka čte záznam, o který se žádá neustále, přes cache před databází. Seřaď kroky jednoho cachovaného čtení.",
    hints: ["Seřaď kroky v pořadí, v jakém se dějí."],
    drill: {
      scenario: "Stránka čte záznam, o který se žádá neustále, přes cache před databází.",
      prompt: "Seřaď kroky jednoho cachovaného čtení.",
      explanation: "Cache se ptáš první a nikdy není zdrojem pravdy, takže když zmizí, jsi pomalejší, ne špatně. Expirace je záchranná síť pro invalidaci, na kterou jsi zapomněl — omezuje, jak dlouho může zastaralá hodnota přežít. Odstranit záznam, když se změní, je bezpečnější než ho aktualizovat, protože dva zápisy najednou můžou jinak nechat v cache starší hodnotu na neurčito.",
      steps: [
        "Aplikace požádá cache o záznam",
        "Cache ho nemá, takže aplikace čte z databáze",
        "Aplikace uloží záznam do cache s časem expirace",
        "Aplikace vrátí záznam",
        "Později, když se ten záznam změní, ho aplikace z cache odstraní",
      ],
    },
  },
  "dd-uploading-a-file": {
    title: "Nahrání souboru",
    prompt: "Někdo připojí k formuláři dokument a odešle ho. Soubor jde do object storage, ne na server. Seřaď kroky nahrání v pořadí, v jakém se dějí.",
    hints: ["Seřaď kroky v pořadí, v jakém se dějí."],
    drill: {
      scenario: "Někdo připojí k formuláři dokument a odešle ho. Soubor jde do object storage, ne na server.",
      prompt: "Seřaď kroky nahrání v pořadí, v jakém se dějí.",
      explanation: "Drž se těch dvou polovin: bajty jdou do úložiště stavěného na bajty a malý řádek v databázi zaznamená, kam šly a komu patří. Kontrola typu a velikosti přijde před uložením čehokoli, jinak jsi už zaplatil za soubor, který jsi chtěl odmítnout. Zapsat umístění až potom znamená, že soubor bez řádku je jen zabrané místo, zatímco řádek bez souboru je rozbitý odkaz — proto se řádek zapisuje poslední.",
      steps: [
        "Prohlížeč pošle soubor na server",
        "Server zkontroluje, že typ a velikost souboru jsou povolené",
        "Server uloží soubor do object storage a dostane zpátky jeho umístění",
        "Server uloží do databáze řádek s umístěním, vlastníkem a časem nahrání",
        "Server odpoví odkazem, kterým může prohlížeč soubor zobrazit",
      ],
    },
  },
};
