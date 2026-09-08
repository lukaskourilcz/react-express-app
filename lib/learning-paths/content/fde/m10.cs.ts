/** Czech copy for M10. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Established English terms a Czech developer keeps are kept and glossed once:
 * runbook, UAT, live region, status, handler, request, fixture, rollback,
 * idempotency key, baseline, deps. */

import type { ModuleCs } from '../../types';

export const FDE_M10_CS: ModuleCs = {
  title: 'Adopce a předání',
  outcomes: [
    'Postavit schvalovací obrazovku kolem čtyř otázek, na které operátor potřebuje odpověď dřív, než zmáčkne tlačítko: co se stane, o co se to opírá, jestli ten podklad ještě platí a jak to zastavit.',
    'Ošetřit načítání, částečné selhání, opakování, otevíratelnou citaci a zrušení, které rozpracovaný request opustí, aby pozdní odpověď nepřepsala novější stav.',
    'Oznámit každou změnu stavu tam, kde ji čtečka obrazovky přečte, a umět říct, co kontrola těch hlášek dokazuje a co zůstává na tvém vlastním posouzení.',
    'Odvést UAT, které může skončit odmítnutím, proti akceptačním podmínkám sepsaným dřív, než si kdokoli sedl, a zaznamenat přijetí, přijetí s podmínkami nebo odmítnutí i s čísly za tím.',
    'Napsat runbook, podle kterého se dá jednat ve tři ráno, a udělat z jedné opakující se zákaznické potřeby produktový vstup, který umíš popsat, aniž bys jmenoval zákazníka.',
  ],
  lessons: {
    'fde-v1-m10-l1': {
      title: 'Operátorova obrazovka',
      summary:
        'Co operátor potřebuje, aby schválení něco znamenalo, jaké stavy demo na šťastné cestě nikdy neukáže a proč je stavová hláška součástí stavby, ne pozdějšího průchodu kvůli přístupnosti.',
      sections: [
        {
          body:
            'Operátor zmáčkne Schválit a z účtu Marlbrooku odejde refund. Aby to zmáčknutí něco znamenalo, musí obrazovka před ním odpovědět na čtyři otázky: co se právě stane, z čeho to vzniklo, jestli ten podklad pořád platí a jak to zastavit. Vynech kteroukoli z nich a máš tlačítko, které přenáší odpovědnost, ale ne informace, které ta odpovědnost potřebuje.',
        },
        {
          caption: 'Čtyři otázky, co na obrazovce odpovídá na každou z nich, a zkratka, kterou místo toho obvykle sáhne demo.',
          headers: ['Otázka', 'Co na ni odpovídá', 'Zkratka v demu'],
          rows: [
            [
              'Co se stane?',
              'Akce a její parametry operátorovými slovy: refund, 42,00, faktura INV-2291, Northgate Dairy',
              'Odstavec vygenerované prózy, který akci popíše, aniž by se zavázal k číslům',
            ],
            [
              'O co se to opírá?',
              'Citace, které si otevře: id článku, jeho název a odkaz mířící na daný odstavec',
              'Seznam id dokumentů, za kterými nic není',
            ],
            [
              'Platí to pořád?',
              'Revize, ze které návrh vznikl, a viditelná značka, když se ticket mezitím pohnul',
              'Nic, protože demo trvá čtyři minuty a za čtyři minuty se nic nepohne',
            ],
            [
              'Jak to zastavím?',
              'Zrušení, které rozpracovaný request opustí, a poctivá věta o tom, co vzít zpět nedokáže',
              'Zašedlé tlačítko a kolečko',
            ],
          ],
        },
        {
          body:
            'Obrazovka má víc stavů, než demo ukáže. Idle, dokud se o nic nežádá. Loading, dokud se návrh staví. Ready, když je hotový. Approving, dokud schválení letí. Approved, rejected a error. Každý z nich je pro operátora jiná věta a jiná sada ovládacích prvků: nemůžeš schválit, co se nenačetlo, a nemůžeš zrušit, co nikdy nezačalo.',
        },
        { caption: 'Jeden objekt, a každé pole v něm je něco, na co se operátor ptal, nebo něco, co se mu musí říct.' },
        {
          body:
            'Právě u varování obrazovka nejčastěji lže. Návrh se vrátil, zákaznický záznam za ním ne a adresa na obrazovce je z cache. Nabízejí se dvě špatné odpovědi: hodit celé načtení do `error`, čímž schováš návrh, který se ještě dal použít, nebo varování zahodit a vykreslit čistý úspěch. Nech status na `ready`, varování protáhni dál a nech operátora rozhodnout se se stejnou informací, jakou máš ty.',
        },
        {
          body:
            'Částečné selhání vykreslené jako úspěch je horší než rovnou selhání. Operátor schvaluje s předpokladem, že všechno na obrazovce se přečetlo ze systému, který je zdrojem pravdy, a nic na té obrazovce mu neřekne opak. Když varování zahodíš, nezjednodušuješ rozhraní — přesouváš riziko na někoho, kdo ho nevidí.',
        },
        {
          body:
            'Zrušení je ovládací prvek, který se nejčastěji jen předstírá. `AbortController` dá signál, který předáš do `fetch`, a abort odmítne promise requestu chybou `AbortError`, takže tvůj handler přestane čekat. To je to, co zrušení koupí: obrazovku přestane odpověď zajímat. Nesáhne do ticketové služby a neodestane request, který tam už dorazil.',
        },
        {
          caption: 'Schválení zrušené v půli letu a potvrzení, které dorazí až potom.',
          legend: ['status', 'běží', 'návrh', 'opuštěno', 'oznámeno'],
          notes: [
            'Návrh je na obrazovce se svými dvěma citacemi a nic neběží. Operátor čte.',
            'Operátor zmáčkne Schválit. Request 2 odejde z prohlížeče a návrh zůstane na obrazovce, protože si má pořád umět přečíst, co právě schválil.',
            'O vteřinu později zmáčkne Zrušit. Obrazovka se vrátí do idle, vyčistí návrh a request 2 si zapíše jako opuštěný.',
            'Ticketová služba na request 2 odpoví potvrzením RCP-1. Session vidí, že request 2 je opuštěný, a nezmění nic: žádný status, žádné potvrzení, žádné oznámení.',
            'Schválení z prohlížeče přesto odešlo, takže ho ticketová služba může držet. Obrazovka netvrdí, že to ví. Srovnání proběhne na serveru pod idempotency key a operátorovi se řekne, co si má ověřit.',
          ],
        },
        {
          body:
            'Nikdy nenech zrušený request zapsat do stavu. Ta chyba vypadá takhle: operátor zruší, otevře jiný ticket a první odpověď o dvě vteřiny později přistane přes ten druhý. Drž si id requestu, jehož odpověď ještě přijmeš, a nech každý handler skončit hned, když id, které nese, není tohle. RFC 9110 má odpovídající pravidlo na straně serveru: bezpečné opakování potřebuje idempotency key, jinak se z druhého doručení stane druhý refund.',
        },
        {
          body:
            'Opakování patří operátorovi, ne smyčce. Neúspěšné načtení nechá obrazovku v `error` s hláškou, kterou dala služba, a operátor to zkusí znovu, až se rozhodne. Tichá opakovací smyčka za kolečkem udělá z jednoho pomalého načtení tři a schová výpadek, který podpora potřebuje vidět.',
        },
        {
          body:
            'A teď část, která není pozdější průchod. Každý z těch přechodů mění něco, co vidoucí operátor pozná na první pohled a uživatel čtečky obrazovky jen tehdy, když mu to řekneš. Stránka MDN o `aria-live` popisuje dvě hodnoty, které stojí za to znát: `polite` počká na pauzu v tom, co uživatel dělá, `assertive` přeruší. Stavový řádek pro načítání, ready a approved je `polite`. Chyba, na kterou musí operátor zareagovat, je případ pro `assertive` — a použít ho na cokoli běžného lidi naučí, že ho mají ignorovat.',
        },
        { caption: 'Live region (oblast, kterou čtečka sleduje) je cíl vykreslení, do kterého stavová logika zapisuje, a proto hláška patří do stavu.' },
        {
          body:
            'Automatická kontrola těch hlášek je umí spočítat a ověřit, že každá je neprázdný řetězec navázaný na přechod. Víc nedokazuje. Jestli je „Návrh připraven, 2 citace, 1 varování“ věta, podle které operátor v tempu zareaguje, je úsudek — a ten zůstává úsudkem, který uděláš a zapíšeš odděleně od procházející kontroly.',
        },
        {
          body:
            'Zbytek práce na přístupnosti má stejný tvar: při stavbě je levnější než průchodem potom. Schválit a Zrušit jsou skutečná tlačítka, takže berou fokus a spouštějí se na Enter i mezerník. Nic není signalizované jen barvou, takže varování nese ikonu i slovo. Cíl pro zrušení má aspoň 44 pixelů, protože operátor, který odbavuje frontu, je rychlý, ne opatrný. Nic z toho nestojí nic, dokud komponentu píšeš, a všechno z toho stojí hodně, jakmile je obrazovka u zákazníka.',
        },
      ],
    },
    'fde-v1-m10-l2': {
      title: 'Akceptace, komunikace a co po sobě necháš',
      summary:
        'UAT se třemi možnými konci, demo, které ukáže i způsob selhání, runbook, který někdo čte ve tři ráno, a rozdíl mezi požadavkem jednoho zákazníka a produktovým vstupem.',
      sections: [
        {
          body:
            'Uživatelské akceptační testování (UAT), které nemůže skončit odmítnutím, je demo s podpisovým archem. Poznáš to podle toho, že se akceptační podmínky sepisují v tom samém týdnu, kdy se testuje, a z chování, o kterém už víš, že ho systém má. Sepiš je dřív, se zákazníkem, proti baseline změřené v M01, a pak s tím, co říkají, žij.',
        },
        {
          body:
            'Tři konce, a ten prostřední nese většinu reálných projektů. Přijetí: všechny podmínky splněné, jde se do provozu. Odmítnutí: něco, kvůli čemu projekt existuje, nefunguje, a termín se posouvá. Přijetí s podmínkami: části, které prošly, jdou do provozu, nesplnění se zapíše číslem místo pocitem a obě strany se upíšou k tomu, co se stane, když to do daného data nezavře. Bez toho data a bez jmenovaného vlastníka je podmínka bezcenná.',
        },
        {
          caption: 'Tři výsledky UAT, co musí každý z nich zapsat a kdo vlastní další krok.',
          headers: ['Výsledek', 'Co se zapíše', 'Kdo vlastní další krok'],
          rows: [
            [
              'Přijetí',
              'Každá podmínka, naměřený výsledek proti ní a fixture nebo dataset, na kterém se to měřilo',
              'Zákazník, od data spuštění dál',
            ],
            [
              'Přijetí s podmínkami',
              'Splněné podmínky, nesplnění vyjádřené číslem proti cíli, náprava, datum a jmenovaný vlastník',
              'Ty, dokud se nesplnění nezavře nebo nepřijde to datum',
            ],
            [
              'Odmítnutí',
              'Která podmínka selhala, o kolik, co si teď myslíš, že je příčina, a co se změní před dalším sezením',
              'Ty, a posouvá se harmonogram, ne podmínka',
            ],
          ],
        },
        {
          body:
            'Dávej pozor na podmínku, která se potichu přepíše, jakmile je výsledek známý. Medián šest minut dvacet proti cíli čtyř minut není splnění jen proto, že je sponzor spokojený; je to nesplnění se spokojeným sponzorem, a zapsat to takhle je jediný způsob, jak se v říjnu dozvíš, jestli to číslo někdy kleslo.',
        },
        {
          body:
            'Demo má stejný způsob selhání jako UAT. Průchod, který ukáže jen šťastnou cestu, naučí místnost, že systém žádný způsob selhání nemá — a když ho poprvé předvede před zákazníkem, je to překvapení místo známého chování. Ukaž jedno: ticket, ke kterému retrieval nemá žádný podklad, a workbench, který radši nenavrhne nic, než aby hádal. Je to na třicet vteřin a posune to abstenci z omluvy na vlastnost.',
        },
        {
          body:
            'Řekni, které části dema jsou fixture. Když jsou odpovědi modelu v nahrávce předpřipravené, musí to místnost vědět dřív, než někdo tu přesnost odcituje na řídicím výboru. Demo ukazuje, že cesta kódem funguje na vstupech, které sis vybral; není to měření, a měření žije v evaluaci z M07.',
        },
        {
          body:
            'Pak přijde runbook (provozní postup), a jeho čtenář je konkrétní: má pohotovost, vzbudili ho ve tři ráno, tuhle službu nikdy neotevřel a drží v ruce telefon. Potřebuje najít stránku podle názvu alertu, spárovat symptom, provést jednu akci a během pár minut vědět, jestli to zabralo. Próza o architektuře mu nepomůže. Posloupnost ano.',
        },
        { caption: 'Šest nadpisů. Poslední tři se vynechávají nejčastěji a čtenář ve 3:00 je potřebuje nejvíc.' },
        {
          caption: '03:12, jeden člověk na pohotovosti prochází ten runbook.',
          legend: ['symptom', 'kontrola', 'akce', 'ověření', 'eskalace'],
          notes: [
            'Alert jmenuje stránku runbooku. Inženýr spáruje to, co hlásil operátor, se symptomem nahoře: návrhy přestaly chodit.',
            'Dva signály na jednom dashboardu. Latence je vysoká a ticketové API vrací 429 skoro na třetině volání, takže jde o throttling, ne o chybu workbenche.',
            'Runbook dává jeden příkaz: srazit TICKET_API_CONCURRENCY na 2 a nasadit. Inženýr ho spustí, aniž by musel nejdřív pochopit návrh opakování.',
            'Krok ověření jmenuje číslo i čekání: hloubka fronty, klesající, do deseti minut. Pořád roste, takže akce nezabrala a inženýr přestane hádat.',
            'Eskalace míří na rotu, ne na člověka, takže funguje i tehdy, když je ten člověk na dovolené. Dvanáct minut od alertu ke správnému týmu, a nic z toho nevyžadovalo předchozí znalost služby.',
          ],
        },
        {
          body:
            'Dvě věci runbook předstírat nesmí. Nemůže slíbit, že akce opraví příčinu — jen že je to první věc, kterou zkusit, a tady je, jak to poznáš. A nemůže vzít zpět následky, které už odešly: rollback vrátí kód, ne refundy schválené, dokud běžela špatná verze, a jejich srovnání patří do runbooku jako vlastní krok s vlastním vlastníkem.',
        },
        {
          body:
            'Poslední věc, kterou po sobě necháš, jde produktovému týmu, který tohohle zákazníka nikdy nepotkal, a je to ten kus, na který má forward deployed engineer nejlepší pozici a nejčastěji ho vynechá. Sledoval jsi ten workflow zevnitř, a takovou pozici si produktový tým nekoupí. Filtr jsou dvě otázky: umíš tu potřebu popsat, aniž bys jmenoval zákazníka, a viděl jsi stejnou berličku vymyšlenou i jinde, aniž by si to ti lidé řekli?',
        },
        {
          caption: 'Stejné nasazení, čtyři zpětné vazby, a která z nich se zobecňuje.',
          headers: ['Co přišlo zpátky', 'Jeden zákazník, nebo vzorec', 'Proč'],
          rows: [
            [
              'Přesuňte tlačítko Schválit vlevo od panelu s citacemi',
              'Jeden zákazník',
              'Kóduje to rozložení nástroje, který Marlbrook opouští, a nikdo jiný ten nástroj neopouští',
            ],
            [
              'Čtěte naše skladové schéma, ať návrhy obsahují stavy zásob',
              'Jeden zákazník',
              'Skutečný integrační požadavek na jeden systém, který nikdo jiný neprovozuje; patří do backlogu, ne do produktu',
            ],
            [
              'Operátoři na třech pobočkách před schválením znovu načítají, aby zjistili, jestli se ticket pohnul',
              'Vzorec',
              'Tři pobočky vymyslely stejnou berličku na potřebu, kterou má každý schvalovací workflow: vědět, jestli to, co schvaluješ, ještě platí',
            ],
            [
              'Dejte nám audit export v našem pořadí sloupců CSV',
              'Jeden zákazník',
              'Sedne to jejich tabulce. Nastavitelné pořadí sloupců je produktová vlastnost; tohle konkrétní pořadí ne',
            ],
          ],
        },
        {
          body:
            'Sepiš ten vzorec tak, aby s ním produktový tým mohl pracovat bez tebe v místnosti: potřeba jednou větou, kde jsi ji viděl a jak často, co operátoři dělají místo toho dnes, kolik je ta berlička stojí a co bys z produktu odebral, kdyby se ta potřeba obsloužila pořádně. Ta poslední položka se čte, protože jako jediná říká, co by tohle nahradilo.',
        },
        {
          body:
            'Dokončení této cesty zaznamenává, co jsi v těchto cvičeních prošel. Není to certifikace, není to doklad o produkční zkušenosti a není to tvrzení o zaměstnatelnosti. Tvůj runbook, tvůj záznam z UAT a tvoje produktové memo jsou tvoje vlastní práce, sebehodnocená, a pro dalšího čtenáře mají větší cenu než jakýkoli štítek o dokončení.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m10-l1-read': {
      title: 'Čtení: operátorova obrazovka',
      summary: 'Čtyři otázky, na které schválení odpovídá, sedm stavů, částečné selhání, zrušení, které request opustí, a live region.',
    },
    'fde-v1-m10-l2-read': {
      title: 'Čtení: akceptace, komunikace a co po sobě necháš',
      summary: 'UAT, které může selhat, demo ukazující i způsob selhání, runbook pro třetí hodinu ranní a zpětná vazba, která se zobecňuje.',
    },
    'fde-v1-m10-checks': {
      title: 'Akceptace, runbooky a zpětná vazba',
      summary: 'Čtyři otázky k předání: výsledek UAT, o kterém musíš rozhodnout, runbook, kterému chybí krok, co obrazovka dluží operátorovi, a která zpětná vazba se zobecňuje.',
      questions: {
        'fde-v1-m10-q1': {
          prompt:
            'UAT Marlbrooku běželo proti třem podmínkám dohodnutým o týden dřív: operátor odbaví deset případů bez pomoci, žádný návrh nedorazí k operátorovi bez citací a medián času do rozhodnutí klesne pod čtyři minuty z naměřené baseline osmi minut. Na sezení operátor odbavil všech deset, každý návrh nesl citace a medián vyšel na šest minut dvacet. Sponzor říká, že je to jasně lepší, a chce spustit v pondělí. Co zapíšeš?',
          options: [
            'Přijetí s podmínkami: zapiš dvě splněné podmínky, zapiš medián jako šest minut dvacet proti cíli čtyř minut a písemně se dohodni, co se stane, když do daného data nedosáhne čtyř minut.',
            'Přijetí: operátor odbavil každý případ, citace tam byly a šest minut dvacet je skutečné zlepšení proti baseline osmi minut, na které se zákazník shodl, že je to ten problém.',
            'Odmítnutí: předem dohodnutá podmínka nebyla splněna, takže UAT neprošlo a nasazení počká, dokud opakované sezení neukáže medián pod čtyřmi minutami.',
            'Zapiš sezení jako neprůkazné a zopakuj ho na víc případech, protože deset případů je příliš malý vzorek na to, aby se z něj dalo o mediánu cokoli tvrdit.',
          ],
          explanation:
            'Dvě podmínky prošly a jedna ne, a výsledek, který říká obojí, je přijetí s podmínkami — pokud to nesplnění nese číslo, datum a vlastníka. Přijetí bez výhrad přepisuje cíl poté, co je výsledek známý: ke čtyřem minutám se zákazník upsal a tiše je zahodit znamená, že příští nesplnění nebude mít vůči čemu být měřeno. Odmítnutí se dá obhájit, ale zahazuje dvě podmínky, které prošly, i hodnotu, kterou operátor může mít v pondělí; odmítnutí patří tam, kde věc nefunguje, nebo kde je nesplněná podmínka důvodem, proč projekt existuje. Poznámka k velikosti vzorku je pravdivá a mluví pro to uvést medián i s jeho nejistotou, ne pro odmítnutí rozhodnout. Použitá jako výchozí volba dělá z UAT proces bez možného výsledku.',
        },
        'fde-v1-m10-q2': {
          prompt: 'Tohle je celá stránka runbooku, na kterou alert odkazuje. Co chybí, než ji můžeš předat někomu, kdo tu službu nikdy neviděl?',
          options: [
            'Jak poznat, jestli akce zabrala, jak dlouho čekat, než se rozhodne, že ne, a kterou rotu v tom případě vzbudit.',
            'Diagram workbenche a ticketového API, aby člověk na pohotovosti systému rozuměl dřív, než v něm začne cokoli měnit.',
            'Analýza kořenové příčiny toho throttlingu, aby člověk na pohotovosti řešil příčinu, a ne symptom.',
            'Poznámka, že TICKET_API_CONCURRENCY se po skončení incidentu musí vrátit na původní hodnotu.',
          ],
          explanation:
            'Stránka končí akcí, takže čtenář nemá jak poznat, že je hotovo, ani co dělat dál, když fronta roste dál. Krok ověření jmenuje číslo a směr, doba čekání dělá z „nezabralo to“ rozhodnutelnou věc a rota umožní eskalaci ve tři ráno, kdy konkrétní člověk, na kterého jsi myslel, spí. Diagram stojí za přečtení za světla a je to špatná věc k otevírání uprostřed incidentu. Kořenová příčina patří do postmortemu: runbook, který čeká pochopení před akcí, zastaví přesně toho člověka, kvůli kterému existuje. Vrácení hodnoty concurrency je skutečné opomenutí a patří do sekce po incidentu, ale je to úklid — bez kroku ověření a bez eskalace se inženýr nikdy nedostane tak daleko, aby ho potřeboval.',
        },
        'fde-v1-m10-q3': {
          prompt: 'Workbench navrhne refund a operátor ho schválí. Co musí obrazovka ukázat, aby to schválení znamenalo víc než kliknutí?',
          options: [
            'Akci a její parametry operátorovými slovy, podklad jako citace, které si otevře, jestli ten podklad ještě platí, a způsob, jak zastavit request, který právě spustil.',
            'Skóre jistoty návrhu, aby operátor věděl, nakolik mu věřit, a odkaz na úvahu modelu pro případy, kdy je skóre nízké.',
            'Plný text každého dokumentu, který retrieval vrátil, aby si operátor přečetl stejný materiál, ze kterého návrh vznikl, a posoudil ho sám.',
            'Zpětné vzetí na potvrzovací obrazovce, aby se omylem odeslané schválení dalo do třiceti vteřin vzít zpět.',
          ],
          explanation:
            'Schválení je člověk přebírající odpovědnost, a k tomu jsou na obrazovce potřeba čtyři věci: co se stane, o co se to opírá, jestli to pořád platí a jak to zastavit. Skóre jistoty bez kalibrační studie za sebou je číslo, podle kterého nikdo nezařídí nic, a vygenerovaná úvaha je další výstup modelu, ne podklad — vysvětluje návrh tímtéž zdrojem, který ho vyrobil. Vysypat celou vrácenou sadu přesouvá práci zpátky na operátora a pohřbí ty dva odstavce, na kterých záleží; otevíratelné citace mu dají stejný přístup i cestu dovnitř. Zpětné vzetí stojí za to postavit a odpovídá na jinou otázku: pokrývá schválení, kterého někdo lituje, ne to, na které nikdy neměl být na základě neaktuálního podkladu vyzván, a na následek, který už odešel, nedosáhne.',
        },
        'fde-v1-m10-q4': {
          prompt: 'Z nasazení u Marlbrooku přišly zpátky čtyři věci. Která z nich je produktový vstup, a ne požadavek jednoho zákazníka?',
          options: [
            'Operátoři na třech ze čtyř poboček před schválením návrh znovu načtou, protože nepoznají, jestli se ticket během čtení pohnul, a každá pobočka si vymyslela stejnou berličku s druhou záložkou sama.',
            'Marlbrook chce tlačítko Schválit vlevo od panelu s citacemi, protože jejich operátoři jsou zvyklí na rozložení nástroje, který workbench nahrazuje.',
            'Marlbrook žádá, aby workbench četl přímo jejich interní skladové schéma, aby návrhy mohly obsahovat stavy zásob.',
            'Bezpečnostní tým Marlbrooku chce audit export v jejich vlastním pořadí sloupců CSV, aby se načetl do tabulky, kterou už provozují.',
          ],
          explanation:
            'První jmenuje potřebu, která přežije ztrátu zákazníkova jména — vědět, jestli to, co schvaluješ, ještě platí — s důkazem, že se opakuje, a s měřitelnou cenou v čase stráveném znovunačítáním. Zbylé tři jsou skutečné požadavky, které stojí za obsloužení, a každý je vázaný na jednoho zákazníka: pozice tlačítka kóduje nástroj, který Marlbrook opouští, skladové schéma je systém, který nikdo jiný neprovozuje, a pořadí sloupců sedne jedné tabulce. Kterýkoli z nich se produktovým vstupem stát může, a test je pořád stejný: popsat potřebu bez jména zákazníka a ukázat ji i jinde. Nastavitelné pořadí sloupců by tím testem prošlo; tohle konkrétní pořadí ne.',
        },
      },
    },
    'fde-v1-m10-operator-state': {
      title: 'Operátorská session',
      summary:
        'Stav za schvalovací obrazovkou: návrh se svými citacemi, schválení, které odmítne neaktuální i rozpracované případy, zrušení, které pozdní odpověď nevrátí, a stavová hláška při každém přechodu.',
      code: {
        prompt:
          'Triage workbench Marlbrooku navrhne refund a operátor ho schválí. Tohle cvičení je stavová logika za tou obrazovkou. Hodnocení ji řídí přímo, ne přes vykreslenou komponentu: v provozu se lámou právě přechody, dají se testovat samostatně a každá závislost je tady autorská fixture na virtuálních hodinách, ne živá služba.\n\nNapiš `createOperatorSession(deps)`. Vrací objekt s `getState()`, `load(ticketId)`, `approve()`, `reject()`, `cancel()` a `noteRevision(revision)`.\n\n`deps` přichází z obrazovky a nese tři věci. `deps.loadProposal(ticketId)` vrací promise na `{ proposal, citations, warnings }`, kde `proposal` nese `ticketId` a `revision`. `deps.submitApproval(request)` vrací promise na `{ receiptId }`. `deps.announce(message)` zapíše jednu větu do live region, kterou sleduje čtečka obrazovky. Kterákoli z těch promise může skončit odmítnutím s `Error`.\n\n`getState()` vrací obrazovku, jak vypadá teď: `status`, `ticketId`, `proposal`, `citations`, `warnings`, `superseded`, `receiptId`, `error`, `statusMessage` a `abandoned`. Začíná na `{ status: \'idle\', ticketId: null, proposal: null, citations: [], warnings: [], superseded: false, receiptId: null, error: null, statusMessage: \'\', abandoned: [] }`. Stav si při každém volání postav znovu, nebo vrať kopii; hodnocení čte pole, nikdy identitu objektu.\n\nPřechody:\n\n- `load(ticketId)` z jakéhokoli stavu kromě `loading` a `approving` vyčistí návrh, citace, varování, `superseded`, `receiptId` i `error`, nastaví `ticketId`, přejde do `loading` a zavolá `deps.loadProposal(ticketId)`. Dokud request běží, je load odmítnutý a `deps.loadProposal` se nezavolá vůbec.\n- Load, který se vyřeší úspěchem, přejde do `ready` s návrhem, jeho citacemi a jeho varováními. Varování jsou částečné selhání, ne selhání: status zůstává `ready`, pole se protáhne beze změny a schválit se dál dá. Zahodit varování znamená vykreslit čistý úspěch, který není pravda.\n- Load, který skončí odmítnutím, přejde do `error`, ponechá `ticketId`, vyčistí návrh i citace a uloží `message` z odmítnutí do `error`.\n- `approve()` běží jen z `ready` a jen dokud je `superseded` false. Přejde do `approving`, nechá návrh i citace na obrazovce a zavolá `deps.submitApproval({ ticketId, revision })` s načteným id ticketu a revizí načteného návrhu — a nic dalšího v tom objektu není. Úspěch přejde do `approved` s `receiptId`. Odmítnutí přejde do `error` s hláškou a návrh zůstane na obrazovce.\n- `reject()` běží jen z `ready`. Přejde do `rejected`, nechá návrh i citace a nevolá nic.\n- `cancel()` běží jen z `loading` nebo `approving`. Vrátí se do `idle`, všechno vyčistí a id běžícího requestu přidá do `abandoned`.\n- `noteRevision(revision)` je ticketová služba, která obrazovce říká, že se ticket pohnul. Z `ready`, když je to číslo větší než revize načteného návrhu, nastav `superseded` na true. Jinak nemění nic.\n\nNejdůležitější část: po zrušení, nebo poté co obrazovka přešla na jiný request, může odpověď na opuštěný request pořád dorazit. Nesmí změnit vůbec nic — žádný status, žádný návrh, žádné potvrzení, žádné oznámení. Dej každému requestu id, pamatuj si, od kterého id odpověď ještě přijmeš, a nech oba handlery skončit hned, když id, které nesou, tohle není.\n\nOznam každou změnu stavu i každou odmítnutou operátorskou akci: nastav `statusMessage` a zavolej `deps.announce(message)` se stejným řetězcem. `noteRevision`, které nic nezmění, neoznamuje nic. Hodnocení oznámení spočítá a ověří, že `statusMessage` drží to poslední; dokládá, že hláška při každém přechodu existuje, a neříká nic o tom, jestli to znění operátorovi pomůže — to zůstává na tvém vlastním posouzení.\n\nZrušení zastaví obrazovku v tom, aby podle odpovědi jednala. Neodešle zpátky request, který už odešel, a jedna z asercí tě u toho drží: schválení se k `deps.submitApproval` dostane a obrazovka jen odmítne tvrdit, že zná výsledek.',
        contract: [
          'Zachovej název `createOperatorSession`; hodnocení staví session podle jména a řídí ji přes objekt, který vrátíš.',
          'Používej jen to, co přijde v `deps`: `loadProposal`, `submitApproval` a `announce`. Žádné vlastní časovače, žádná síť, žádné globály.',
          'Odpověď patřící opuštěnému nebo překonanému requestu nechá každé pole přesně tak, jak je, včetně `statusMessage`.',
          '`approve` posílá `{ ticketId, revision }` a nic jiného, a jen z návrhu ve stavu `ready`, který nebyl překonán.',
          'Oznam každou změnu stavu i každou odmítnutou operátorskou akci. `noteRevision`, které nic nezmění, neoznamuje nic.',
        ],
        hints: [
          'Celý problém pozdních odpovědí unese jedno počítadlo a jedna proměnná. `nextRequest` rozdává id, `inFlight` drží to id, od kterého odpověď ještě přijmeš. Zrušení ho nastaví na null, dokončený request taky, a každý handler začíná porovnáním proti němu.',
          'Napiš `approve` jako dvě stráže a až pak přechod: odmítni, když status není `ready`, odmítni, když je `superseded` true, a teprve potom přejdi do `approving` a zavolej `deps.submitApproval`. Oznam i to odmítnutí — operátor, který zmáčkl tlačítko a nic neslyšel, nemá jak vědět, jestli to zabralo.',
          '`warnings` jsou rozdíl mezi načtením, které vyšlo napůl, a načtením, které vyšlo. Protáhni to pole do stavu, nech status na `ready` a nech operátora rozhodnout se s tím, co víš.',
        ],
        approach: [
          'Postav objekt stavu a ty dvě proměnné pro requesty, pak napiš `announce` tak, aby každé volání nastavilo `state.statusMessage` a předalo stejný řetězec do `deps.announce`.',
          'Napiš `load`: odmítni ho během `loading` i `approving`, jinak vyčisti předchozí návrh, vezmi další id requestu, přejdi do `loading` a zavolej `deps.loadProposal`.',
          'Obě odpovědi na load obsluž na jednom místě a každou začni brzkým návratem, když už to není běžící request; potom buď `ready` s návrhem, citacemi a varováními, nebo `error` s `message` z odmítnutí.',
          'Napiš `approve` ve stejném tvaru, se strážemi na `ready` a `superseded`, s odeslaným `{ ticketId, revision }` a s dojezdem do `approved` s potvrzením, nebo do `error` s hláškou.',
          'Napiš `cancel`, `reject` a `noteRevision` a ověř si, že cancel přidá běžící id do `abandoned` a vynuluje ho, aby pozdní odpověď neměla co spárovat.',
        ],
        testLabels: [
          'obrazovka startuje v idle a nic není načtené',
          'načtený návrh přijde i se svými citacemi',
          'schválení nechá návrh na obrazovce a zaznamená potvrzení',
          'částečné selhání je ready s varováními, ne čistý úspěch',
          'zrušení během načítání request opustí a pozdní odpověď nic nezmění',
          'zrušené schválení se nikdy nevrátí jako approved, i když request odešel',
          'schválení, když se návrh ještě načítá, je odmítnuté',
          'návrh, který ticket mezitím přerostl, schválit nejde',
          'čtyři přechody, čtyři oznámení a statusMessage drží to poslední',
        ],
        criteria: [
          {
            label: 'Sedm stavů a to, co operátor v každém z nich vidí',
            detail:
              'Zkontroluj idle, loading, ready s návrhem a jeho citacemi, ready s protaženými varováními, approving, approved s potvrzením, rejected a hlášku z neúspěšného načtení i z neúspěšného schválení.',
          },
          {
            label: 'Pozdní odpověď z opuštěného requestu nic nezmění',
            detail:
              'Odpověď, která dorazí po zrušení nebo patří requestu, od kterého obrazovka odešla, musí nechat každé pole tak, jak bylo, včetně `abandoned` a `statusMessage`.',
          },
          {
            label: 'Schválení je odmítnuté během načítání i u překonaného návrhu',
            detail:
              'K `deps.submitApproval` se nic nedostane z `idle`, z `loading`, z návrhu, který `noteRevision` označilo za neaktuální, ani při druhém zmáčknutí poté, co schválení už prošlo.',
          },
          {
            label: 'Každý přechod nastaví stavovou hlášku',
            detail:
              'Kontrola spočítá oznámení a ověří, že `statusMessage` drží to poslední. Dokládá, že hláška při každém přechodu existuje. Jestli to znění pomůže operátorovi pracujícímu v tempu, je tvoje vlastní posouzení, ne tahle kontrola.',
          },
        ],
      },
    },
  },
};
